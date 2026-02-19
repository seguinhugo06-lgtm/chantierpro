/**
 * Bank Transaction Reconciliation Engine
 * Matches bank transactions with invoices (factures) and expenses (dépenses)
 *
 * Confidence levels:
 * - >= 0.85: Auto-reconciled (green badge)
 * - 0.60-0.84: Suggestion (orange badge)
 * - < 0.60: Not reconciled (gray badge)
 *
 * @module reconciliation
 */

import supabase, { isDemo } from '../../supabaseClient';

// ============================================================================
// Fuzzy matching utilities
// ============================================================================

/**
 * Normalize a string for comparison (lowercase, remove accents, trim)
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Check if two strings are similar (contains or Levenshtein-ish)
 */
function isSimilar(a, b, threshold = 0.6) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;

  // Direct containment
  if (na.includes(nb) || nb.includes(na)) return true;

  // Word overlap
  const wordsA = new Set(na.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(nb.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let matches = 0;
  for (const w of wordsA) {
    for (const wb of wordsB) {
      if (w === wb || w.includes(wb) || wb.includes(w)) {
        matches++;
        break;
      }
    }
  }

  const overlapRatio = matches / Math.min(wordsA.size, wordsB.size);
  return overlapRatio >= threshold;
}

/**
 * Check if a transaction amount matches a target amount (with tolerance)
 */
function amountsMatch(txAmount, targetAmount, tolerancePercent = 0.01) {
  const absA = Math.abs(txAmount);
  const absB = Math.abs(targetAmount);
  if (absB === 0) return absA === 0;

  const diff = Math.abs(absA - absB);
  return diff <= absB * tolerancePercent || diff < 0.02; // 1% or 2 cents
}

// ============================================================================
// Reconciliation algorithms
// ============================================================================

/**
 * Match a credit transaction against unpaid invoices
 * @returns {{ entity: Object, confidence: number, method: string } | null}
 */
function matchCredit(tx, factures, clients) {
  const txAmount = Math.abs(tx.amount);
  const txInfo = (tx.remittance_info || '') + ' ' + (tx.creditor_name || '') + ' ' + (tx.debtor_name || '');

  let bestMatch = null;
  let bestConfidence = 0;
  let bestMethod = null;

  for (const facture of factures) {
    // Skip already paid or non-invoice
    if (facture.statut === 'payee' || facture.statut === 'brouillon') continue;
    if (facture.type !== 'facture') continue;

    const factureTTC = facture.total_ttc || 0;
    const client = clients.find(c => c.id === facture.client_id);

    // Method 1: Exact amount match (confidence 0.95)
    if (amountsMatch(txAmount, factureTTC)) {
      const confidence = 0.95;
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = facture;
        bestMethod = 'auto_amount';
      }
    }

    // Method 2: Reference match in remittance info (confidence 0.90)
    if (facture.numero && normalize(txInfo).includes(normalize(facture.numero))) {
      const confidence = 0.90;
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = facture;
        bestMethod = 'auto_reference';
      }
    }

    // Method 3: Client name match (confidence 0.70)
    if (client) {
      const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
      const clientEntreprise = client.entreprise || '';

      if (
        (clientName && isSimilar(txInfo, clientName)) ||
        (clientEntreprise && isSimilar(txInfo, clientEntreprise))
      ) {
        // Boost if amount is also close
        let confidence = 0.70;
        if (amountsMatch(txAmount, factureTTC, 0.05)) {
          confidence = 0.82;
        }
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = facture;
          bestMethod = 'auto_client';
        }
      }
    }
  }

  if (bestMatch && bestConfidence >= 0.50) {
    return {
      entity: bestMatch,
      entityType: 'facture',
      confidence: bestConfidence,
      method: bestMethod,
    };
  }
  return null;
}

/**
 * Match a debit transaction against expenses
 * @returns {{ entity: Object, confidence: number, method: string } | null}
 */
function matchDebit(tx, depenses) {
  const txAmount = Math.abs(tx.amount);
  const txDate = new Date(tx.booking_date);
  const txInfo = (tx.remittance_info || '') + ' ' + (tx.creditor_name || '');

  let bestMatch = null;
  let bestConfidence = 0;
  let bestMethod = null;

  for (const depense of depenses) {
    const depenseAmount = depense.montant || 0;
    const depenseDate = new Date(depense.date);

    // Check date proximity (within 5 days)
    const daysDiff = Math.abs((txDate - depenseDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 5) continue;

    // Method: Amount match with date proximity
    if (amountsMatch(txAmount, depenseAmount, 0.02)) {
      let confidence = 0.85;

      // Boost if description matches
      if (depense.description && isSimilar(txInfo, depense.description)) {
        confidence = 0.92;
      }

      // Reduce slightly if dates are far apart
      if (daysDiff > 2) confidence -= 0.05;

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = depense;
        bestMethod = 'auto_amount';
      }
    }
  }

  if (bestMatch && bestConfidence >= 0.50) {
    return {
      entity: bestMatch,
      entityType: 'depense',
      confidence: bestConfidence,
      method: bestMethod,
    };
  }
  return null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Run reconciliation on all unreconciled transactions
 * @param {Array} transactions - Bank transactions (unreconciled)
 * @param {Array} factures - All factures
 * @param {Array} depenses - All dépenses
 * @param {Array} clients - All clients
 * @returns {{ autoReconciled: Array, suggestions: Array, unmatched: Array }}
 */
export function runReconciliation(transactions, factures, depenses, clients) {
  const autoReconciled = [];
  const suggestions = [];
  const unmatched = [];

  // Track which factures/depenses have been matched to avoid double-matching
  const matchedEntities = new Set();

  for (const tx of transactions) {
    if (tx.reconciled) continue;

    let match = null;

    if (tx.transaction_type === 'credit' || tx.amount > 0) {
      match = matchCredit(tx, factures, clients);
    } else {
      match = matchDebit(tx, depenses);
    }

    // Avoid double matching
    if (match && matchedEntities.has(`${match.entityType}_${match.entity.id}`)) {
      match = null;
    }

    if (match) {
      matchedEntities.add(`${match.entityType}_${match.entity.id}`);

      if (match.confidence >= 0.85) {
        autoReconciled.push({ transaction: tx, ...match });
      } else if (match.confidence >= 0.60) {
        suggestions.push({ transaction: tx, ...match });
      } else {
        unmatched.push(tx);
      }
    } else {
      unmatched.push(tx);
    }
  }

  return { autoReconciled, suggestions, unmatched };
}

/**
 * Apply a reconciliation (mark transaction as reconciled in DB)
 * @param {string} transactionId - bank_transactions.id
 * @param {string} entityType - 'facture' or 'depense'
 * @param {string} entityId - ID of the matched entity
 * @param {number} confidence - Reconciliation confidence (0-1)
 * @param {string} method - 'auto_amount', 'auto_reference', 'auto_client', 'manual'
 */
export async function applyReconciliation(transactionId, entityType, entityId, confidence, method) {
  if (isDemo) {
    return { success: true };
  }

  const { error } = await supabase
    .from('bank_transactions')
    .update({
      reconciled: true,
      reconciled_entity_type: entityType,
      reconciled_entity_id: entityId,
      reconciliation_confidence: confidence,
      reconciliation_method: method,
    })
    .eq('id', transactionId);

  if (error) throw error;
  return { success: true };
}

/**
 * Undo a reconciliation
 * @param {string} transactionId
 */
export async function undoReconciliation(transactionId) {
  if (isDemo) {
    return { success: true };
  }

  const { error } = await supabase
    .from('bank_transactions')
    .update({
      reconciled: false,
      reconciled_entity_type: null,
      reconciled_entity_id: null,
      reconciliation_confidence: null,
      reconciliation_method: null,
    })
    .eq('id', transactionId);

  if (error) throw error;
  return { success: true };
}

/**
 * Get reconciliation stats for transactions
 * @param {Array} transactions
 * @returns {{ total, reconciled, suggestions, unmatched, percentReconciled }}
 */
export function getReconciliationStats(transactions) {
  const total = transactions.length;
  const reconciled = transactions.filter(t => t.reconciled).length;
  const withSuggestion = transactions.filter(t =>
    !t.reconciled && t.reconciliation_confidence >= 0.60
  ).length;
  const unmatched = total - reconciled - withSuggestion;

  return {
    total,
    reconciled,
    suggestions: withSuggestion,
    unmatched,
    percentReconciled: total > 0 ? Math.round((reconciled / total) * 100) : 0,
  };
}
