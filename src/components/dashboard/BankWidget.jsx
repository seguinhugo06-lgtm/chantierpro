/**
 * BankWidget - Dashboard widget for bank account overview
 *
 * Features:
 * - Not connected: Empty state with CTA "Connecter ma banque"
 * - Connected: Balance, bank name, masked IBAN, recent transactions
 * - Badge for pending reconciliation suggestions
 * - Sync button with last sync time
 * - Footer: "Voir toutes les transactions"
 *
 * Follows Widget/WidgetHeader/WidgetContent/WidgetFooter pattern
 *
 * @module BankWidget
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, RefreshCw, ArrowUpRight, ArrowDownRight, AlertCircle,
  Loader2, Link2, ChevronRight, Clock, ExternalLink,
} from 'lucide-react';
import Widget, {
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetEmptyState,
} from './Widget';
import { cn } from '../../lib/utils';
import { isDemo } from '../../supabaseClient';
import { getConnections, getTransactions, syncAll } from '../../lib/integrations/gocardless';

// ============================================================================
// Utility
// ============================================================================

function formatMoney(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function maskIBAN(iban) {
  if (!iban) return '';
  const clean = iban.replace(/\s/g, '');
  return `${clean.substring(0, 4)} •••• ${clean.slice(-4)}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

// ============================================================================
// Component
// ============================================================================

export default function BankWidget({
  isDark = false,
  onConnectBank,
  onViewTransactions,
}) {
  const [connection, setConnection] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const connections = await getConnections();
      const linked = connections.find(c => c.requisition_status === 'linked');

      if (linked) {
        setConnection(linked);
        const txs = await getTransactions(linked.id);
        setTransactions(txs);
      }
    } catch (e) {
      console.error('BankWidget load error:', e);
    }
    setLoading(false);
  }, []);

  const handleSync = async () => {
    if (!connection || syncing) return;
    setSyncing(true);
    try {
      const result = await syncAll(connection.id);
      // Update local state
      setConnection(prev => ({
        ...prev,
        last_balance: result.balance,
        last_sync_at: new Date().toISOString(),
      }));
      // Reload transactions
      const txs = await getTransactions(connection.id);
      setTransactions(txs);
    } catch (e) {
      console.error('Sync error:', e);
    }
    setSyncing(false);
  };

  // Reconciliation stats
  const reconciliationStats = useMemo(() => {
    const total = transactions.length;
    const reconciled = transactions.filter(t => t.reconciled).length;
    const suggestions = transactions.filter(t => !t.reconciled && t.reconciliation_confidence >= 0.60).length;
    return { total, reconciled, suggestions };
  }, [transactions]);

  // Recent transactions (5 most recent)
  const recentTx = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
      .slice(0, 5);
  }, [transactions]);

  // Loading skeleton
  if (loading) {
    return (
      <Widget isDark={isDark}>
        <WidgetHeader
          title="Banque"
          icon={<Building2 />}
          isDark={isDark}
        />
        <WidgetContent>
          <div className="animate-pulse space-y-4">
            <div className={cn('h-16 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
                  <div className="flex-1 space-y-1.5">
                    <div className={cn('h-3 w-3/4 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
                    <div className={cn('h-2.5 w-1/2 rounded', isDark ? 'bg-slate-800' : 'bg-gray-50')} />
                  </div>
                  <div className={cn('h-4 w-16 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
                </div>
              ))}
            </div>
          </div>
        </WidgetContent>
      </Widget>
    );
  }

  // Not connected state
  if (!connection) {
    return (
      <Widget isDark={isDark}>
        <WidgetHeader
          title="Banque"
          icon={<Building2 />}
          isDark={isDark}
        />
        <WidgetContent>
          <WidgetEmptyState
            icon={<Building2 />}
            title="Connectez votre banque"
            description="Synchronisez vos transactions et rapprochez-les automatiquement avec vos factures"
            ctaLabel="Connecter ma banque"
            onCtaClick={onConnectBank}
            isDark={isDark}
          />
        </WidgetContent>
      </Widget>
    );
  }

  // Connected state
  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title="Banque"
        icon={<Building2 />}
        isDark={isDark}
        badge={reconciliationStats.suggestions > 0 ? `${reconciliationStats.suggestions}` : undefined}
        actions={
          <button
            onClick={handleSync}
            disabled={syncing}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400',
              syncing && 'opacity-50'
            )}
            title="Synchroniser"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          </button>
        }
      />

      <WidgetContent>
        {/* Balance card */}
        <div className={cn(
          'rounded-xl p-4 mb-4',
          isDark ? 'bg-slate-700/50' : 'bg-gradient-to-br from-primary-50 to-blue-50'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {connection.institution_logo && (
                <img
                  src={connection.institution_logo}
                  alt=""
                  className="w-6 h-6 rounded object-contain"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <span className={cn('text-sm font-medium', isDark ? 'text-slate-300' : 'text-gray-600')}>
                {connection.institution_name}
              </span>
            </div>
            <span className={cn('text-xs font-mono', isDark ? 'text-slate-500' : 'text-gray-400')}>
              {maskIBAN(connection.iban)}
            </span>
          </div>

          <p className={cn(
            'text-2xl font-bold',
            connection.last_balance >= 0 ? 'text-emerald-500' : 'text-red-500'
          )}>
            {formatMoney(connection.last_balance || 0)}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock size={12} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
              {timeAgo(connection.last_sync_at)}
            </span>
          </div>
        </div>

        {/* Reconciliation alert */}
        {reconciliationStats.suggestions > 0 && (
          <button
            onClick={onViewTransactions}
            className={cn(
              'w-full rounded-lg px-3 py-2 mb-4 flex items-center gap-2 text-sm font-medium transition-colors',
              isDark
                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            )}
          >
            <AlertCircle size={16} />
            <span>{reconciliationStats.suggestions} transaction{reconciliationStats.suggestions > 1 ? 's' : ''} à rapprocher</span>
            <ChevronRight size={14} className="ml-auto" />
          </button>
        )}

        {/* Recent transactions */}
        <div className="space-y-1">
          {recentTx.map(tx => {
            const isCredit = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className={cn(
                  'flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  isCredit
                    ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
                    : (isDark ? 'bg-red-500/10' : 'bg-red-50')
                )}>
                  {isCredit
                    ? <ArrowDownRight size={14} className="text-emerald-500" />
                    : <ArrowUpRight size={14} className="text-red-500" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', isDark ? 'text-slate-200' : 'text-gray-800')}>
                    {tx.creditor_name || tx.debtor_name || 'Transaction'}
                  </p>
                  <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
                    {new Date(tx.booking_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                <span className={cn(
                  'text-sm font-medium flex-shrink-0',
                  isCredit ? 'text-emerald-500' : (isDark ? 'text-red-400' : 'text-red-600')
                )}>
                  {isCredit ? '+' : ''}{formatMoney(tx.amount)}
                </span>
              </div>
            );
          })}

          {recentTx.length === 0 && (
            <p className={cn('text-sm text-center py-4', isDark ? 'text-slate-500' : 'text-gray-400')}>
              Aucune transaction
            </p>
          )}
        </div>
      </WidgetContent>

      <WidgetFooter isDark={isDark}>
        <button
          onClick={onViewTransactions}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
            isDark
              ? 'text-primary-400 hover:text-primary-300'
              : 'text-primary-600 hover:text-primary-700'
          )}
        >
          Voir toutes les transactions
          <ChevronRight size={16} />
        </button>
      </WidgetFooter>
    </Widget>
  );
}

/**
 * BankWidgetSkeleton - Loading placeholder for BankWidget
 */
export function BankWidgetSkeleton({ isDark = false }) {
  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title="Banque"
        icon={<Building2 />}
        isDark={isDark}
      />
      <WidgetContent>
        <div className="animate-pulse space-y-4">
          <div className={cn('h-24 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
                <div className="flex-1">
                  <div className={cn('h-3 w-3/4 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
                </div>
                <div className={cn('h-3 w-14 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
              </div>
            ))}
          </div>
        </div>
      </WidgetContent>
    </Widget>
  );
}
