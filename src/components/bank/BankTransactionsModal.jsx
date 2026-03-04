/**
 * BankTransactionsModal - View and manage bank transactions with reconciliation
 *
 * Features:
 * - Filter by date range, credit/debit, search text
 * - Reconciliation badges (green = reconciled, orange = suggestion, gray = unmatched)
 * - Click on suggestion to confirm/reject
 * - Manual reconciliation: search for facture/depense to link
 * - Stats header: X reconciled, Y suggestions, Z unmatched
 *
 * Uses isDark prop pattern (not Tailwind dark: prefixes)
 *
 * @module BankTransactionsModal
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertCircle,
  HelpCircle, X, ChevronDown, RefreshCw, Loader2, Link2, Unlink,
  Calendar, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';

// ============================================================================
// Utility functions
// ============================================================================

function formatMoney(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getReconciliationBadge(tx, isDark) {
  if (tx.reconciled) {
    return {
      icon: CheckCircle,
      label: 'Rapproché',
      colorClass: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50',
    };
  }
  if (tx.reconciliation_confidence && tx.reconciliation_confidence >= 0.60) {
    return {
      icon: AlertCircle,
      label: 'Suggestion',
      colorClass: isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-600 bg-amber-50',
    };
  }
  return {
    icon: HelpCircle,
    label: 'Non rapproché',
    colorClass: isDark ? 'text-slate-400 bg-slate-500/10' : 'text-gray-400 bg-gray-50',
  };
}

// ============================================================================
// Stats Header
// ============================================================================

function StatsBar({ transactions, isDark }) {
  const stats = useMemo(() => {
    const total = transactions.length;
    const reconciled = transactions.filter(t => t.reconciled).length;
    const suggestions = transactions.filter(t => !t.reconciled && t.reconciliation_confidence >= 0.60).length;
    const unmatched = total - reconciled - suggestions;
    const totalCredits = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalDebits = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { total, reconciled, suggestions, unmatched, totalCredits, totalDebits };
  }, [transactions]);

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5`}>
      {[
        { label: 'Rapprochées', value: stats.reconciled, color: isDark ? 'text-emerald-400' : 'text-emerald-600', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
        { label: 'Suggestions', value: stats.suggestions, color: isDark ? 'text-amber-400' : 'text-amber-600', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
        { label: 'Non rapprochées', value: stats.unmatched, color: isDark ? 'text-slate-400' : 'text-gray-500', bg: isDark ? 'bg-slate-500/10' : 'bg-gray-50' },
        { label: 'Total', value: stats.total, color: isDark ? 'text-blue-400' : 'text-blue-600', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
      ].map((stat, i) => (
        <div key={i} className={`rounded-xl p-3 ${stat.bg}`}>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Transaction Row
// ============================================================================

function TransactionRow({ tx, isDark, onReconcile, onUndoReconcile }) {
  const badge = getReconciliationBadge(tx, isDark);
  const BadgeIcon = badge.icon;
  const isCredit = tx.amount > 0;

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 border-b last:border-b-0
      transition-colors duration-100
      ${isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'}
    `}>
      {/* Amount indicator */}
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${isCredit
          ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
          : (isDark ? 'bg-red-500/10' : 'bg-red-50')
        }
      `}>
        {isCredit
          ? <ArrowDownRight size={18} className="text-emerald-500" />
          : <ArrowUpRight size={18} className="text-red-500" />
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {tx.creditor_name || tx.debtor_name || 'Transaction'}
        </p>
        <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {tx.remittance_info || 'Aucune information'}
        </p>
      </div>

      {/* Date */}
      <div className={`text-xs text-right flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {formatDate(tx.booking_date)}
      </div>

      {/* Amount */}
      <div className={`
        text-sm font-semibold text-right flex-shrink-0 w-24
        ${isCredit ? 'text-emerald-500' : (isDark ? 'text-red-400' : 'text-red-600')}
      `}>
        {isCredit ? '+' : ''}{formatMoney(tx.amount)}
      </div>

      {/* Reconciliation badge */}
      <button
        onClick={() => {
          if (tx.reconciled) {
            onUndoReconcile?.(tx);
          } else if (tx.reconciliation_confidence >= 0.60) {
            onReconcile?.(tx);
          }
        }}
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0
          transition-colors
          ${badge.colorClass}
          ${(tx.reconciled || tx.reconciliation_confidence >= 0.60) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        `}
        title={tx.reconciled ? 'Cliquer pour annuler le rapprochement' : tx.reconciliation_confidence >= 0.60 ? 'Cliquer pour confirmer' : ''}
      >
        <BadgeIcon size={14} />
        <span className="hidden sm:inline">{badge.label}</span>
      </button>
    </div>
  );
}

// ============================================================================
// Main Modal
// ============================================================================

export default function BankTransactionsModal({
  isOpen,
  onClose,
  transactions = [],
  connection,
  isDark = false,
  onSync,
  onReconcile,
  onUndoReconcile,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, credit, debit
  const [statusFilter, setStatusFilter] = useState('all'); // all, reconciled, suggestion, unmatched
  const [syncing, setSyncing] = useState(false);

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-gray-900';
  const selectBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-gray-900';

  const filtered = useMemo(() => {
    let txs = [...transactions];

    // Type filter
    if (typeFilter === 'credit') txs = txs.filter(t => t.amount > 0);
    if (typeFilter === 'debit') txs = txs.filter(t => t.amount < 0);

    // Status filter
    if (statusFilter === 'reconciled') txs = txs.filter(t => t.reconciled);
    if (statusFilter === 'suggestion') txs = txs.filter(t => !t.reconciled && t.reconciliation_confidence >= 0.60);
    if (statusFilter === 'unmatched') txs = txs.filter(t => !t.reconciled && (!t.reconciliation_confidence || t.reconciliation_confidence < 0.60));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter(t =>
        (t.creditor_name || '').toLowerCase().includes(q) ||
        (t.debtor_name || '').toLowerCase().includes(q) ||
        (t.remittance_info || '').toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }

    return txs.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
  }, [transactions, typeFilter, statusFilter, search]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync?.();
    } catch (e) {
      console.error('Sync error:', e);
    }
    setSyncing(false);
  };

  const totalCredits = useMemo(() => filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalDebits = useMemo(() => filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [filtered]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isDark={isDark}>
      <ModalHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {connection?.institution_logo && (
              <img src={connection.institution_logo} alt="" className="w-8 h-8 rounded-lg object-contain" />
            )}
            <div>
              <ModalTitle>Transactions bancaires</ModalTitle>
              <ModalDescription>
                {connection?.institution_name} — {connection?.iban ? `${connection.iban.substring(0, 4)} •••• ${connection.iban.slice(-4)}` : ''}
              </ModalDescription>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all
              ${isDark
                ? 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'
                : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
              }
              disabled:opacity-50
            `}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </button>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Stats */}
        <StatsBar transactions={transactions} isDark={isDark} />

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm ${inputBg} focus:ring-2 focus:ring-primary-500/30`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className={`px-3 py-2 border rounded-xl text-sm ${selectBg}`}
          >
            <option value="all">Tous types</option>
            <option value="credit">Crédits</option>
            <option value="debit">Débits</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={`px-3 py-2 border rounded-xl text-sm ${selectBg}`}
          >
            <option value="all">Tous statuts</option>
            <option value="reconciled">Rapprochées</option>
            <option value="suggestion">Suggestions</option>
            <option value="unmatched">Non rapprochées</option>
          </select>
        </div>

        {/* Totals bar */}
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg mb-3 text-xs font-medium ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>
          <span>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500">+{formatMoney(totalCredits)}</span>
            <span className={isDark ? 'text-red-400' : 'text-red-600'}>-{formatMoney(totalDebits)}</span>
          </div>
        </div>

        {/* Transaction list */}
        <div className={`
          rounded-xl border overflow-hidden max-h-[450px] overflow-y-auto
          ${isDark ? 'border-slate-700' : 'border-gray-200'}
        `}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle size={32} className={`mx-auto mb-3 ${isDark ? 'text-slate-500' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Aucune transaction trouvée
              </p>
            </div>
          ) : (
            filtered.map(tx => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                isDark={isDark}
                onReconcile={onReconcile}
                onUndoReconcile={onUndoReconcile}
              />
            ))
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Fermer
        </button>
      </ModalFooter>
    </Modal>
  );
}
