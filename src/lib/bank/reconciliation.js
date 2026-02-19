/**
 * Bank Auto-Reconciliation Engine
 *
 * Matches imported bank transactions (credits) with unpaid invoices:
 * 1. Amount match: |transaction.montant - facture.total_ttc| < threshold
 * 2. Name match: client.nom appears in transaction.libelle
 * 3. Reference match: facture.numero appears in transaction.libelle
 *
 * Scoring:
 * - Exact amount match (< 0.01€): +50 points
 * - Close amount match (< 1€): +30 points
 * - Client name in libelle: +40 points
 * - Invoice number in libelle: +50 points
 * - Date proximity (< 30 days after invoice): +10 points
 *
 * Thresholds:
 * - Score >= 80: auto-match (statut = 'rapproche')
 * - Score >= 50: suggest (statut = 'suggere')
 * - Score < 50: no match (statut = 'non_rapproche')
 */

const AMOUNT_THRESHOLD_EXACT = 0.01;
const AMOUNT_THRESHOLD_CLOSE = 1.00;
const SCORE_AUTO_MATCH = 80;
const SCORE_SUGGEST = 50;

/**
 * Run auto-reconciliation on a set of transactions against unpaid invoices
 *
 * @param {Array} transactions - Bank transactions (from CSV import)
 * @param {Array} factures - All user invoices (devis with type='facture')
 * @param {Array} clients - All user clients
 * @returns {{ matched: Array, suggested: Array, unmatched: Array, logs: Array }}
 */
export function autoReconcile(transactions, factures, clients) {
  // Only consider credit transactions (montant > 0) for reconciliation
  const credits = transactions.filter(t => t.montant > 0 && t.statut !== 'rapproche' && t.statut !== 'ignore');

  // Only consider unpaid invoices (factures with status envoye, en_attente, acompte_facture)
  const unpaidFactures = factures.filter(f =>
    f.type === 'facture' &&
    ['envoye', 'en_attente', 'acompte_facture', 'vu'].includes(f.statut) &&
    f.total_ttc > 0
  );

  // Build client name lookup
  const clientMap = {};
  clients.forEach(c => {
    clientMap[c.id] = {
      nom: (c.nom || '').toLowerCase(),
      prenom: (c.prenom || '').toLowerCase(),
      fullName: `${c.nom || ''} ${c.prenom || ''}`.trim().toLowerCase(),
      societe: (c.societe || c.entreprise || '').toLowerCase(),
    };
  });

  const matched = [];
  const suggested = [];
  const unmatched = [];
  const logs = [];

  // Track which invoices have been matched to prevent double-matching
  const matchedFactureIds = new Set();

  for (const tx of credits) {
    const libelleNorm = (tx.libelle || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let bestMatch = null;
    let bestScore = 0;
    const candidates = [];

    for (const fac of unpaidFactures) {
      if (matchedFactureIds.has(fac.id)) continue;

      let score = 0;
      const reasons = [];
      const facTotal = parseFloat(fac.total_ttc) || 0;
      const txAmount = tx.montant;

      // 1. Amount matching
      const amountDiff = Math.abs(txAmount - facTotal);
      if (amountDiff < AMOUNT_THRESHOLD_EXACT) {
        score += 50;
        reasons.push('montant_exact');
      } else if (amountDiff < AMOUNT_THRESHOLD_CLOSE) {
        score += 30;
        reasons.push('montant_proche');
      } else if (amountDiff < facTotal * 0.05) {
        // Within 5% tolerance
        score += 15;
        reasons.push('montant_approx');
      } else {
        continue; // Skip if amount is way off
      }

      // 2. Client name matching
      const client = clientMap[fac.client_id];
      if (client) {
        const nameVariants = [client.nom, client.prenom, client.fullName, client.societe].filter(Boolean);
        for (const name of nameVariants) {
          if (name.length >= 3 && libelleNorm.includes(name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
            score += 40;
            reasons.push('nom_client');
            break;
          }
        }
      }

      // 3. Invoice number matching
      const facNumNorm = (fac.numero || '').toLowerCase().replace(/[\s-]/g, '');
      if (facNumNorm && libelleNorm.replace(/[\s-]/g, '').includes(facNumNorm)) {
        score += 50;
        reasons.push('numero_facture');
      }

      // 4. Date proximity bonus
      if (tx.date && fac.date) {
        const txDate = new Date(tx.date);
        const facDate = new Date(fac.date);
        const daysDiff = (txDate - facDate) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 0 && daysDiff <= 30) {
          score += 10;
          reasons.push('date_proche');
        }
      }

      if (score > 0) {
        candidates.push({
          facture_id: fac.id,
          facture_numero: fac.numero,
          facture_total: facTotal,
          client_nom: client ? `${client.nom} ${client.prenom}`.trim() : 'Inconnu',
          score,
          reasons,
        });
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          facture_id: fac.id,
          facture_numero: fac.numero,
          score,
          reasons,
        };
      }
    }

    // Sort candidates by score descending
    candidates.sort((a, b) => b.score - a.score);

    if (bestScore >= SCORE_AUTO_MATCH) {
      // Auto-match: high confidence
      matchedFactureIds.add(bestMatch.facture_id);
      matched.push({
        ...tx,
        statut: 'rapproche',
        facture_id: bestMatch.facture_id,
        match_score: bestScore,
        match_reasons: bestMatch.reasons,
      });
      logs.push({
        transaction_hash: tx.hash,
        facture_id: bestMatch.facture_id,
        action: 'auto_match',
        details: {
          score: bestScore,
          reasons: bestMatch.reasons,
          candidates: candidates.slice(0, 3),
        },
      });
    } else if (bestScore >= SCORE_SUGGEST && candidates.length > 0) {
      // Suggestion: medium confidence
      suggested.push({
        ...tx,
        statut: 'suggere',
        candidates: candidates.slice(0, 5),
        best_score: bestScore,
      });
      logs.push({
        transaction_hash: tx.hash,
        facture_id: candidates[0].facture_id,
        action: 'suggest',
        details: {
          score: bestScore,
          reasons: candidates[0].reasons,
          candidates: candidates.slice(0, 5),
        },
      });
    } else {
      // No match found
      unmatched.push({ ...tx, statut: 'non_rapproche' });
    }
  }

  // Add debit transactions as-is (no reconciliation needed)
  const debits = transactions.filter(t => t.montant <= 0);
  debits.forEach(t => {
    if (t.statut !== 'rapproche' && t.statut !== 'ignore') {
      unmatched.push({ ...t, statut: 'non_rapproche' });
    }
  });

  return { matched, suggested, unmatched, logs };
}

/**
 * Calculate reconciliation stats for display
 */
export function getReconciliationStats(transactions) {
  const total = transactions.length;
  const rapproches = transactions.filter(t => t.statut === 'rapproche').length;
  const suggeres = transactions.filter(t => t.statut === 'suggere').length;
  const ignores = transactions.filter(t => t.statut === 'ignore').length;
  const nonRapproches = total - rapproches - suggeres - ignores;

  const credits = transactions.filter(t => t.montant > 0);
  const debits = transactions.filter(t => t.montant < 0);

  return {
    total,
    rapproches,
    suggeres,
    ignores,
    nonRapproches,
    totalCredits: credits.reduce((s, t) => s + t.montant, 0),
    totalDebits: debits.reduce((s, t) => s + t.montant, 0),
    countCredits: credits.length,
    countDebits: debits.length,
  };
}
