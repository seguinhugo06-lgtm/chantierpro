/**
 * BankModule - Bank transactions management module
 *
 * Provides:
 * - KPI cards (solde, encaissements, décaissements, balance)
 * - Transaction table with filtering
 * - Manual reconciliation dropdown
 * - Import CSV button → opens BankImportModal
 * - Status-colored rows (green/orange/gray/white)
 */

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Upload, Download, Filter, Search, ChevronDown, Link2, Unlink,
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp,
  CheckCircle, AlertTriangle, XCircle, Eye, EyeOff,
  MoreHorizontal, Trash2, RefreshCw, Building2, Landmark, X,
  Zap, Shield, Clock,
} from 'lucide-react';
import { useBankTransactions } from '../../hooks/useBankTransactions';

const BankImportModal = lazy(() => import('./BankImportModal'));

// ---------------------------------------------------------------------------
// KPI Card component
// ---------------------------------------------------------------------------

function KPICard({ label, value, icon: Icon, color, isDark, modeDiscret }) {
  const formatted = modeDiscret
    ? '•••••'
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  return (
    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatted}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  rapproche: { label: 'Rapproché', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  suggere: { label: 'Suggéré', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  ignore: { label: 'Ignoré', color: 'bg-slate-100 text-slate-500', icon: XCircle },
  non_rapproche: { label: 'Non rapproché', color: 'bg-blue-50 text-blue-600', icon: Eye },
};

function StatusBadge({ statut, isDark }) {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG.non_rapproche;
  const colorClass = config.color;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <config.icon size={12} />
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main BankModule component
// ---------------------------------------------------------------------------

export default function BankModule({ devis, depenses, clients, entreprise, paiements, isDark, couleur, modeDiscret, setPage }) {
  const userId = null; // Will be set from auth context in production
  const {
    transactions,
    loading,
    importing,
    importResult,
    stats,
    soldeActuel,
    monthlyStats,
    importCSV,
    matchTransaction,
    unmatchTransaction,
    ignoreTransaction,
    deleteTransaction,
    reload,
    clearImportResult,
  } = useBankTransactions({ devis, clients, userId });

  const [showImportModal, setShowImportModal] = useState(false);
  const [showBankConnectModal, setShowBankConnectModal] = useState(false);
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all'); // all, credit, debit
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingTxId, setMatchingTxId] = useState(null);
  const [actionMenuTxId, setActionMenuTxId] = useState(null);

  const tc = {
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-300' : 'text-slate-700',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    border: isDark ? 'border-slate-700' : 'border-slate-200',
    hover: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
  };

  // ---------------------------------------------------------------------------
  // Filtered transactions
  // ---------------------------------------------------------------------------

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Status filter
    if (filterStatut !== 'all') {
      filtered = filtered.filter(t => t.statut === filterStatut);
    }

    // Type filter
    if (filterType === 'credit') {
      filtered = filtered.filter(t => t.montant > 0);
    } else if (filterType === 'debit') {
      filtered = filtered.filter(t => t.montant < 0);
    }

    // Month filter
    if (filterMonth !== 'all') {
      filtered = filtered.filter(t => t.date && t.date.startsWith(filterMonth));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.libelle || '').toLowerCase().includes(q) ||
        (t.categorie || '').toLowerCase().includes(q)
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    return filtered;
  }, [transactions, filterStatut, filterType, filterMonth, searchQuery]);

  // Available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      if (t.date) months.add(t.date.substring(0, 7));
    });
    return [...months].sort().reverse();
  }, [transactions]);

  // Unpaid invoices for manual matching
  const unpaidFactures = useMemo(() => {
    return (devis || []).filter(d =>
      d.type === 'facture' &&
      ['envoye', 'en_attente', 'acompte_facture', 'vu'].includes(d.statut)
    );
  }, [devis]);

  // Find linked invoice name
  const getLinkedFacture = useCallback((factureId) => {
    if (!factureId) return null;
    const fac = (devis || []).find(d => d.id === factureId);
    if (!fac) return null;
    const client = (clients || []).find(c => c.id === fac.client_id);
    return {
      numero: fac.numero,
      client: client ? `${client.nom || ''} ${client.prenom || ''}`.trim() : '',
      total: fac.total_ttc,
    };
  }, [devis, clients]);

  // Format montant
  const fmtMontant = (m) => {
    if (m === null || m === undefined) return '—';
    if (modeDiscret) return '•••••';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(m);
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // ---------------------------------------------------------------------------
  // Export CSV
  // ---------------------------------------------------------------------------

  const exportCSV = useCallback(() => {
    const headers = ['Date', 'Libellé', 'Montant', 'Catégorie', 'Statut', 'Facture liée'];
    const rows = filteredTransactions.map(t => {
      const fac = getLinkedFacture(t.facture_id);
      return [
        t.date,
        `"${(t.libelle || '').replace(/"/g, '""')}"`,
        t.montant,
        t.categorie || '',
        t.statut,
        fac ? fac.numero : '',
      ].join(';');
    });

    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_bancaires_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, getLinkedFacture]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Empty state
  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        {/* Empty state card */}
        <div className={`rounded-2xl border-2 border-dashed overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
          <div className="p-10 sm:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
              <Building2 size={36} style={{ color: couleur }} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${tc.text}`}>Connexion bancaire</h3>
            <p className={`text-sm mb-8 max-w-md mx-auto ${tc.textMuted}`}>
              Centralisez vos flux financiers et gagnez du temps sur votre suivi de trésorerie.
            </p>

            {/* Benefits */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto mb-8">
              {[
                { icon: Zap, label: 'Rapprochement automatique' },
                { icon: RefreshCw, label: 'Catégorisation automatique' },
                { icon: TrendingUp, label: 'Solde en temps réel' },
              ].map((b) => (
                <div key={b.label} className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <b.icon size={16} style={{ color: couleur }} className="flex-shrink-0" />
                  <span className={`text-xs font-medium ${tc.text}`}>{b.label}</span>
                </div>
              ))}
            </div>

            {/* Connection buttons */}
            <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
              {/* DSP2 Real Connect */}
              <button
                onClick={() => setShowBankConnectModal(true)}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:brightness-110"
                style={{ background: couleur }}
              >
                <Landmark size={18} />
                Connecter ma banque
              </button>
              <p className={`text-xs ${tc.textMuted} text-center`}>
                Boursorama, BNP, Crédit Agricole, LCL, Société Générale et 200+ banques françaises via DSP2.
              </p>
              {/* CSV Import */}
              <button
                onClick={() => setShowImportModal(true)}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl border transition-all hover:shadow-md ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                <Upload size={18} />
                Importer un relevé CSV
              </button>
            </div>

            {/* Security note */}
            <div className={`flex items-center justify-center gap-2 mt-6 ${tc.textMuted}`}>
              <Shield size={14} />
              <p className="text-xs">
                Connexion sécurisée via DSP2 — nous ne stockons jamais vos identifiants
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          {showImportModal && (
            <BankImportModal
              isOpen={showImportModal}
              onClose={() => setShowImportModal(false)}
              onImport={importCSV}
              isDark={isDark}
              couleur={couleur}
            />
          )}
        </Suspense>

        {showBankConnectModal && (
          <BankConnectModal
            isOpen={showBankConnectModal}
            onClose={() => setShowBankConnectModal(false)}
            onConnected={() => { setShowBankConnectModal(false); reload(); }}
            isDark={isDark}
            couleur={couleur}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Solde actuel"
          value={soldeActuel}
          icon={Wallet}
          color={couleur}
          isDark={isDark}
          modeDiscret={modeDiscret}
        />
        <KPICard
          label="Encaissements (mois)"
          value={monthlyStats.encaissements}
          icon={ArrowUpRight}
          color="#22c55e"
          isDark={isDark}
          modeDiscret={modeDiscret}
        />
        <KPICard
          label="Décaissements (mois)"
          value={monthlyStats.decaissements}
          icon={ArrowDownRight}
          color="#ef4444"
          isDark={isDark}
          modeDiscret={modeDiscret}
        />
        <KPICard
          label="Balance (mois)"
          value={monthlyStats.encaissements - monthlyStats.decaissements}
          icon={TrendingUp}
          color={monthlyStats.encaissements - monthlyStats.decaissements >= 0 ? '#22c55e' : '#ef4444'}
          isDark={isDark}
          modeDiscret={modeDiscret}
        />
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg"
          style={{ background: couleur }}
        >
          <Upload size={16} />
          Importer relevé
        </button>

        <button
          onClick={() => setShowBankConnectModal(true)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${tc.card} ${tc.text} ${tc.hover}`}
        >
          <Landmark size={16} />
          Connecter banque
        </button>

        <button
          onClick={exportCSV}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${tc.card} ${tc.text} ${tc.hover}`}
        >
          <Download size={16} />
          Exporter
        </button>

        <button
          onClick={reload}
          className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl border transition-colors ${tc.card} ${tc.textMuted} ${tc.hover}`}
          title="Actualiser"
        >
          <RefreshCw size={16} />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats badges */}
        <div className={`hidden sm:flex items-center gap-2 text-xs ${tc.textMuted}`}>
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
            {stats.rapproches} rapprochées
          </span>
          {stats.suggeres > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              {stats.suggeres} à vérifier
            </span>
          )}
          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600">
            {stats.nonRapproches} en attente
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${tc.card}`}>
        <Filter size={16} className={tc.textMuted} />

        {/* Search */}
        <div className={`flex-1 min-w-[150px] max-w-xs flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
          <Search size={14} className={tc.textMuted} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 text-sm bg-transparent outline-none ${tc.text} placeholder:${tc.textMuted}`}
          />
        </div>

        {/* Month filter */}
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
        >
          <option value="all">Tous les mois</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
        >
          <option value="all">Tous statuts</option>
          <option value="rapproche">Rapprochés</option>
          <option value="suggere">Suggérés</option>
          <option value="non_rapproche">Non rapprochés</option>
          <option value="ignore">Ignorés</option>
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
        >
          <option value="all">Tous types</option>
          <option value="credit">Crédits (+)</option>
          <option value="debit">Débits (−)</option>
        </select>
      </div>

      {/* Transaction table */}
      <div className={`rounded-xl border overflow-hidden ${tc.card}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <Search size={32} className={`mx-auto mb-2 ${tc.textMuted}`} />
            <p className={tc.textMuted}>Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className={`text-left py-3 px-4 font-medium ${tc.textMuted}`}>Date</th>
                  <th className={`text-left py-3 px-4 font-medium ${tc.textMuted}`}>Libellé</th>
                  <th className={`text-right py-3 px-4 font-medium ${tc.textMuted}`}>Montant</th>
                  <th className={`text-center py-3 px-4 font-medium ${tc.textMuted}`}>Statut</th>
                  <th className={`text-left py-3 px-4 font-medium ${tc.textMuted}`}>Facture liée</th>
                  <th className={`text-center py-3 px-4 font-medium ${tc.textMuted} w-16`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 100).map((tx) => {
                  const linkedFac = getLinkedFacture(tx.facture_id);
                  const rowBg = tx.statut === 'rapproche'
                    ? (isDark ? 'bg-green-900/10' : 'bg-green-50/50')
                    : tx.statut === 'suggere'
                      ? (isDark ? 'bg-amber-900/10' : 'bg-amber-50/50')
                      : tx.statut === 'ignore'
                        ? (isDark ? 'bg-slate-800/50 opacity-60' : 'bg-slate-50 opacity-60')
                        : '';

                  return (
                    <tr
                      key={tx.id || tx.hash}
                      className={`border-t transition-colors ${tc.border} ${tc.hover} ${rowBg}`}
                    >
                      <td className={`py-3 px-4 whitespace-nowrap ${tc.text}`}>
                        {fmtDate(tx.date)}
                      </td>
                      <td className={`py-3 px-4 ${tc.text}`}>
                        <div className="max-w-[250px] truncate" title={tx.libelle}>
                          {tx.libelle}
                        </div>
                        {tx.categorie && (
                          <span className={`text-xs ${tc.textMuted}`}>{tx.categorie}</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right whitespace-nowrap font-medium ${
                        tx.montant > 0 ? 'text-green-500' : tx.montant < 0 ? 'text-red-500' : tc.text
                      }`}>
                        {tx.montant > 0 ? '+' : ''}{fmtMontant(tx.montant)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge statut={tx.statut} isDark={isDark} />
                      </td>
                      <td className={`py-3 px-4 ${tc.text}`}>
                        {linkedFac ? (
                          <div className="flex items-center gap-1.5">
                            <Link2 size={12} className="text-green-500 flex-shrink-0" />
                            <span className="text-xs font-medium">{linkedFac.numero}</span>
                            <span className={`text-xs ${tc.textMuted}`}>{linkedFac.client}</span>
                          </div>
                        ) : tx.montant > 0 && tx.statut === 'non_rapproche' ? (
                          <div className="relative">
                            <button
                              onClick={() => setMatchingTxId(matchingTxId === tx.id ? null : tx.id)}
                              className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                              <Link2 size={12} />
                              Rapprocher
                              <ChevronDown size={12} />
                            </button>

                            {/* Matching dropdown */}
                            {matchingTxId === tx.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMatchingTxId(null)} />
                                <div className={`absolute top-full left-0 mt-1 w-72 max-h-48 overflow-y-auto rounded-xl shadow-xl z-20 border ${tc.card}`}>
                                  {unpaidFactures.length === 0 ? (
                                    <p className={`p-3 text-xs ${tc.textMuted}`}>Aucune facture en attente</p>
                                  ) : (
                                    unpaidFactures.map(fac => {
                                      const client = clients.find(c => c.id === fac.client_id);
                                      return (
                                        <button
                                          key={fac.id}
                                          onClick={() => {
                                            matchTransaction(tx.id, fac.id);
                                            setMatchingTxId(null);
                                          }}
                                          className={`w-full text-left px-3 py-2 border-b last:border-0 ${tc.border} ${tc.hover} transition-colors`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className={`text-xs font-medium ${tc.text}`}>{fac.numero}</span>
                                            <span className="text-xs text-green-500 font-medium">
                                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(fac.total_ttc)}
                                            </span>
                                          </div>
                                          <span className={`text-xs ${tc.textMuted}`}>
                                            {client ? `${client.nom} ${client.prenom || ''}`.trim() : '—'}
                                          </span>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className={`text-xs ${tc.textMuted}`}>—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuTxId(actionMenuTxId === tx.id ? null : tx.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}
                          >
                            <MoreHorizontal size={14} className={tc.textMuted} />
                          </button>

                          {actionMenuTxId === tx.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuTxId(null)} />
                              <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl z-20 border py-1 ${tc.card}`}>
                                {tx.statut === 'rapproche' && (
                                  <button
                                    onClick={() => { unmatchTransaction(tx.id); setActionMenuTxId(null); }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${tc.hover} ${tc.text}`}
                                  >
                                    <Unlink size={12} />
                                    Dé-rapprocher
                                  </button>
                                )}
                                {tx.statut !== 'ignore' && (
                                  <button
                                    onClick={() => { ignoreTransaction(tx.id); setActionMenuTxId(null); }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${tc.hover} ${tc.text}`}
                                  >
                                    <EyeOff size={12} />
                                    Ignorer
                                  </button>
                                )}
                                <button
                                  onClick={() => { deleteTransaction(tx.id); setActionMenuTxId(null); }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-500"
                                >
                                  <Trash2 size={12} />
                                  Supprimer
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTransactions.length > 100 && (
              <div className={`py-3 text-center text-xs ${tc.textMuted}`}>
                Affichage limité aux 100 premières transactions ({filteredTransactions.length} au total)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Suspense fallback={null}>
        {showImportModal && (
          <BankImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={importCSV}
            isDark={isDark}
            couleur={couleur}
          />
        )}
      </Suspense>

      {/* Bank Connection Modal */}
      {showBankConnectModal && (
        <BankConnectModal
          isOpen={showBankConnectModal}
          onClose={() => setShowBankConnectModal(false)}
          onConnected={() => { setShowBankConnectModal(false); reload(); }}
          isDark={isDark}
          couleur={couleur}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BankConnectModal — Real Salt Edge bank connection flow
// ---------------------------------------------------------------------------

function BankConnectModal({ isOpen, onClose, onConnected, isDark, couleur }) {
  const [step, setStep] = React.useState('keys'); // keys | institutions | connecting | success | error
  const [secretId, setSecretId] = React.useState('');
  const [secretKey, setSecretKey] = React.useState('');
  const [keysLoading, setKeysLoading] = React.useState(false);
  const [keysConfigured, setKeysConfigured] = React.useState(false);
  const [institutions, setInstitutions] = React.useState([]);
  const [instLoading, setInstLoading] = React.useState(false);
  const [instSearch, setInstSearch] = React.useState('');
  const [connecting, setConnecting] = React.useState(false);
  const [selectedInst, setSelectedInst] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState('');

  if (!isOpen) return null;

  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 placeholder-slate-400';

  // Check if Salt Edge is already configured
  React.useEffect(() => {
    import('../../lib/integrations/saltedge').then(async ({ getStatus }) => {
      try {
        const status = await getStatus();
        if (status.enabled) {
          setKeysConfigured(true);
          setStep('institutions');
          loadInstitutions();
        }
      } catch {}
    });
  }, []);

  const loadInstitutions = async () => {
    setInstLoading(true);
    try {
      const { listInstitutions } = await import('../../lib/integrations/saltedge');
      const list = await listInstitutions('FR');
      setInstitutions(list || []);
    } catch (e) {
      setErrorMsg(e.message || 'Impossible de charger les banques');
      setStep('error');
    } finally {
      setInstLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!secretId.trim() || !secretKey.trim()) return;
    setKeysLoading(true);
    setErrorMsg('');
    try {
      const { storeApiKeys } = await import('../../lib/integrations/saltedge');
      await storeApiKeys(secretId.trim(), secretKey.trim());
      setKeysConfigured(true);
      setStep('institutions');
      loadInstitutions();
    } catch (e) {
      setErrorMsg(e.message || 'Erreur lors de la sauvegarde des clés');
    } finally {
      setKeysLoading(false);
    }
  };

  const handleSelectInstitution = async (inst) => {
    setSelectedInst(inst);
    setConnecting(true);
    setErrorMsg('');
    setStep('connecting');
    try {
      const { createConnection } = await import('../../lib/integrations/saltedge');
      const redirectUrl = `${window.location.origin}/bank/callback`;
      const result = await createConnection(inst, redirectUrl);
      if (result.link && result.link !== '#demo-redirect') {
        // Save requisition_id for callback
        try { localStorage.setItem('cp_bank_pending_requisition', result.requisition_id); } catch {}
        // Redirect to bank
        window.location.href = result.link;
      } else {
        // Demo mode — simulate success
        setStep('success');
        if (onConnected) onConnected();
      }
    } catch (e) {
      setErrorMsg(e.message || 'Erreur de connexion');
      setStep('error');
    } finally {
      setConnecting(false);
    }
  };

  const filteredInstitutions = institutions.filter(inst =>
    !instSearch.trim() || inst.name.toLowerCase().includes(instSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Landmark size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>Connexion bancaire</h2>
              <p className={`text-sm ${textMuted}`}>
                {step === 'keys' ? 'Configuration API' : step === 'institutions' ? 'Choisissez votre banque' : step === 'connecting' ? 'Connexion en cours...' : step === 'success' ? 'Connecté !' : 'Erreur'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}>
            <X size={20} className={textMuted} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step 1: API Keys */}
          {step === 'keys' && (
            <>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm font-medium ${textPrimary} mb-1`}>Clés API Salt Edge (Account Information)</p>
                <p className={`text-xs ${textMuted}`}>
                  Créez un compte gratuit sur{' '}
                  <a href="https://www.saltedge.com/clients/sign_up" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: couleur }}>
                    saltedge.com
                  </a>
                  {' '}puis copiez votre App-ID et Secret depuis votre Dashboard Client.
                </p>
              </div>

              <div>
                <label className={`text-sm font-medium ${textPrimary} block mb-1.5`}>App-ID</label>
                <input
                  type="text"
                  value={secretId}
                  onChange={e => setSecretId(e.target.value)}
                  placeholder="Ex: AbCdEfGhIjKlMnOp"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              <div>
                <label className={`text-sm font-medium ${textPrimary} block mb-1.5`}>Secret</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle size={14} /> {errorMsg}
                </div>
              )}

              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex items-start gap-2">
                  <Shield size={14} style={{ color: couleur }} className="mt-0.5 flex-shrink-0" />
                  <p className={`text-xs ${textMuted}`}>
                    Vos clés sont chiffrées dans Supabase Vault. BatiGesti n'a jamais accès à vos identifiants bancaires — seul Salt Edge communique avec votre banque via le protocole DSP2.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveKeys}
                disabled={!secretId.trim() || !secretKey.trim() || keysLoading}
                className="w-full px-5 py-3 text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: couleur }}
              >
                {keysLoading ? (
                  <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Vérification...</span>
                ) : (
                  'Sauvegarder et continuer'
                )}
              </button>
            </>
          )}

          {/* Step 2: Institution selection */}
          {step === 'institutions' && (
            <>
              <div className="relative">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={instSearch}
                  onChange={e => setInstSearch(e.target.value)}
                  placeholder="Rechercher votre banque..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                  autoFocus
                />
              </div>

              {instLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw size={24} className={`mx-auto mb-3 animate-spin ${textMuted}`} />
                  <p className={`text-sm ${textMuted}`}>Chargement des banques...</p>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="py-8 text-center">
                  <Building2 size={24} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={`text-sm ${textMuted}`}>Aucune banque trouvée</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredInstitutions.map(inst => (
                    <button
                      key={inst.id}
                      onClick={() => handleSelectInstitution(inst)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${isDark ? 'border-slate-700 hover:bg-slate-700 hover:border-slate-600' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                      {inst.logo ? (
                        <img src={inst.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
                          <Building2 size={16} style={{ color: couleur }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textPrimary}`}>{inst.name}</p>
                        {inst.transaction_total_days && (
                          <p className={`text-xs ${textMuted}`}>Historique: {inst.transaction_total_days}j</p>
                        )}
                      </div>
                      <ChevronDown size={14} className={`${textMuted} -rotate-90`} />
                    </button>
                  ))}
                </div>
              )}

              {keysConfigured && (
                <p className={`text-xs text-center ${textMuted}`}>
                  {institutions.length} banques disponibles via Salt Edge
                </p>
              )}
            </>
          )}

          {/* Step 3: Connecting */}
          {step === 'connecting' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                <RefreshCw size={28} className="animate-spin" style={{ color: couleur }} />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>Connexion en cours</h3>
              <p className={`text-sm ${textMuted} mb-2`}>
                Vous allez être redirigé vers {selectedInst?.name || 'votre banque'} pour autoriser l'accès en lecture seule à votre compte.
              </p>
              <p className={`text-xs ${textMuted}`}>
                Vos identifiants bancaires ne transitent jamais par BatiGesti.
              </p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-green-100">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>Compte connecté !</h3>
              <p className={`text-sm ${textMuted} mb-4`}>
                Vos transactions seront importées automatiquement.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-white text-sm font-medium rounded-xl"
                style={{ background: couleur }}
              >
                Fermer
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-100">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>Erreur de connexion</h3>
              <p className={`text-sm text-red-500 mb-4`}>{errorMsg}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => { setErrorMsg(''); setStep(keysConfigured ? 'institutions' : 'keys'); }}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border ${isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700'}`}
                >
                  Réessayer
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-white text-sm font-medium rounded-xl"
                  style={{ background: couleur }}
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
