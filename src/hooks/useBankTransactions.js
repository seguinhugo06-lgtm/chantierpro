/**
 * useBankTransactions - Hook for managing bank transactions
 *
 * Handles:
 * - Loading transactions from Supabase (or localStorage in demo mode)
 * - Importing CSV files via parseBankFile
 * - Auto-reconciliation with invoices
 * - Manual matching / unmatching
 * - Filtering and stats
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import supabase, { isDemo } from '../supabaseClient';
import { parseBankFile } from '../lib/bank/csvParser';
import { autoReconcile, getReconciliationStats } from '../lib/bank/reconciliation';

const DEMO_STORAGE_KEY = 'cp_bank_transactions';

export function useBankTransactions({ devis = [], clients = [], userId } = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // Load transactions
  // ---------------------------------------------------------------------------

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        setTransactions(stored ? JSON.parse(stored) : []);
      } else if (supabase && userId) {
        const { data, error: fetchError } = await supabase
          .from('bank_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1000);

        if (fetchError) throw fetchError;
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Failed to load bank transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ---------------------------------------------------------------------------
  // Save to storage (demo mode)
  // ---------------------------------------------------------------------------

  const persistDemo = useCallback((txs) => {
    if (isDemo) {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(txs));
      } catch (e) {
        console.warn('Failed to persist bank transactions:', e.message);
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Import CSV file
  // ---------------------------------------------------------------------------

  const importCSV = useCallback(async (file) => {
    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      // 1. Parse the CSV file
      const { transactions: parsed, banqueDetectee, erreurs } = await parseBankFile(file);

      if (parsed.length === 0) {
        setImportResult({ imported: 0, doublons: 0, rapproches: 0, erreurs });
        setImporting(false);
        return { imported: 0, doublons: 0, rapproches: 0, erreurs };
      }

      // 2. Check for duplicates by hash
      const existingHashes = new Set(transactions.map(t => t.hash));
      const newTransactions = parsed.filter(t => !existingHashes.has(t.hash));
      const doublons = parsed.length - newTransactions.length;

      if (newTransactions.length === 0) {
        const result = { imported: 0, doublons, rapproches: 0, erreurs, banqueDetectee };
        setImportResult(result);
        setImporting(false);
        return result;
      }

      // 3. Run auto-reconciliation on new credits
      const factures = devis.filter(d => d.type === 'facture');
      const { matched, suggested, unmatched } = autoReconcile(newTransactions, factures, clients);

      // 4. Prepare transactions for storage
      const allNew = [...matched, ...suggested, ...unmatched].map(tx => ({
        id: tx.id || crypto.randomUUID(),
        user_id: userId,
        date: tx.date,
        libelle: tx.libelle,
        montant: tx.montant,
        solde: tx.solde,
        categorie: tx.categorie,
        facture_id: tx.facture_id || null,
        devis_id: tx.devis_id || null,
        statut: tx.statut || 'non_rapproche',
        source: 'csv',
        hash: tx.hash,
        banque_detectee: banqueDetectee,
        notes: null,
        created_at: new Date().toISOString(),
      }));

      // 5. Save to Supabase or localStorage
      if (isDemo) {
        const updated = [...allNew, ...transactions];
        setTransactions(updated);
        persistDemo(updated);
      } else if (supabase && userId) {
        // Batch upsert with ON CONFLICT (hash) DO NOTHING
        const { error: insertError } = await supabase
          .from('bank_transactions')
          .upsert(allNew, { onConflict: 'hash', ignoreDuplicates: true });

        if (insertError) throw insertError;

        // Update matched invoices to 'payee' status
        for (const m of matched) {
          if (m.facture_id) {
            await supabase
              .from('devis')
              .update({ statut: 'payee', date_paiement: m.date, mode_paiement: 'virement' })
              .eq('id', m.facture_id)
              .eq('user_id', userId);
          }
        }

        // Log reconciliation actions
        const logs = matched.map(m => ({
          user_id: userId,
          transaction_id: m.id,
          facture_id: m.facture_id,
          action: 'auto_match',
          details: { score: m.match_score, reasons: m.match_reasons },
        }));
        if (logs.length > 0) {
          await supabase.from('bank_reconciliation_log').insert(logs).catch(() => {});
        }

        // Reload from DB
        await loadTransactions();
      }

      const result = {
        imported: newTransactions.length,
        doublons,
        rapproches: matched.length,
        suggeres: suggested.length,
        erreurs,
        banqueDetectee,
      };
      setImportResult(result);
      return result;
    } catch (err) {
      console.error('CSV import error:', err);
      setError(err.message);
      setImportResult({ imported: 0, doublons: 0, rapproches: 0, erreurs: [err.message] });
      throw err;
    } finally {
      setImporting(false);
    }
  }, [transactions, devis, clients, userId, loadTransactions, persistDemo]);

  // ---------------------------------------------------------------------------
  // Manual reconciliation
  // ---------------------------------------------------------------------------

  const matchTransaction = useCallback(async (transactionId, factureId) => {
    try {
      if (isDemo) {
        setTransactions(prev => {
          const updated = prev.map(t =>
            t.id === transactionId
              ? { ...t, statut: 'rapproche', facture_id: factureId }
              : t
          );
          persistDemo(updated);
          return updated;
        });
      } else if (supabase) {
        await supabase
          .from('bank_transactions')
          .update({ statut: 'rapproche', facture_id: factureId })
          .eq('id', transactionId);

        // Update invoice status
        await supabase
          .from('devis')
          .update({ statut: 'payee', mode_paiement: 'virement' })
          .eq('id', factureId)
          .eq('user_id', userId);

        await loadTransactions();
      }
    } catch (err) {
      console.error('Match error:', err);
      setError(err.message);
    }
  }, [userId, loadTransactions, persistDemo]);

  const unmatchTransaction = useCallback(async (transactionId) => {
    try {
      if (isDemo) {
        setTransactions(prev => {
          const updated = prev.map(t =>
            t.id === transactionId
              ? { ...t, statut: 'non_rapproche', facture_id: null }
              : t
          );
          persistDemo(updated);
          return updated;
        });
      } else if (supabase) {
        await supabase
          .from('bank_transactions')
          .update({ statut: 'non_rapproche', facture_id: null })
          .eq('id', transactionId);

        await loadTransactions();
      }
    } catch (err) {
      console.error('Unmatch error:', err);
      setError(err.message);
    }
  }, [loadTransactions, persistDemo]);

  const ignoreTransaction = useCallback(async (transactionId) => {
    try {
      if (isDemo) {
        setTransactions(prev => {
          const updated = prev.map(t =>
            t.id === transactionId ? { ...t, statut: 'ignore' } : t
          );
          persistDemo(updated);
          return updated;
        });
      } else if (supabase) {
        await supabase
          .from('bank_transactions')
          .update({ statut: 'ignore' })
          .eq('id', transactionId);

        await loadTransactions();
      }
    } catch (err) {
      console.error('Ignore error:', err);
      setError(err.message);
    }
  }, [loadTransactions, persistDemo]);

  const deleteTransaction = useCallback(async (transactionId) => {
    try {
      if (isDemo) {
        setTransactions(prev => {
          const updated = prev.filter(t => t.id !== transactionId);
          persistDemo(updated);
          return updated;
        });
      } else if (supabase) {
        await supabase
          .from('bank_transactions')
          .delete()
          .eq('id', transactionId);

        await loadTransactions();
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message);
    }
  }, [loadTransactions, persistDemo]);

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------

  const stats = useMemo(() => getReconciliationStats(transactions), [transactions]);

  const soldeActuel = useMemo(() => {
    // Get the most recent transaction with a solde value
    const withSolde = transactions.filter(t => t.solde !== null && t.solde !== undefined);
    if (withSolde.length === 0) return null;
    // Sort by date descending, take first
    const sorted = [...withSolde].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0].solde;
  }, [transactions]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxs = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
    return {
      encaissements: monthTxs.filter(t => t.montant > 0).reduce((s, t) => s + t.montant, 0),
      decaissements: Math.abs(monthTxs.filter(t => t.montant < 0).reduce((s, t) => s + t.montant, 0)),
    };
  }, [transactions]);

  return {
    transactions,
    loading,
    importing,
    importResult,
    error,
    stats,
    soldeActuel,
    monthlyStats,
    importCSV,
    matchTransaction,
    unmatchTransaction,
    ignoreTransaction,
    deleteTransaction,
    reload: loadTransactions,
    clearImportResult: () => setImportResult(null),
  };
}
