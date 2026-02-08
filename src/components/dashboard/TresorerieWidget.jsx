/**
 * TresorerieWidget - Widget showing unpaid invoices with attractive design
 *
 * Features:
 * - Visual donut chart for age breakdown
 * - Gradient cards with progress indicators
 * - Alert system for overdue invoices
 * - Animated interactions
 *
 * @module TresorerieWidget
 */

import * as React from 'react';
import {
  Wallet,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Send,
  Clock,
  TrendingUp,
  Euro,
  ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';
import { useDevis, useClients } from '../../context/DataContext';
import { Button } from '../ui/Button';
import Widget, {
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetEmptyState,
  WidgetMenuButton,
  WidgetLink,
} from './Widget';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import supabase, { isDemo } from '../../supabaseClient';

// Age group configurations with colors - Based on invoice age (time since issued)
const AGE_GROUPS = {
  under30: {
    key: 'under30',
    label: 'Récentes (< 30j)',
    shortLabel: 'Récentes',
    description: 'Échéance proche',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-500/10',
    textLight: 'text-emerald-700',
    textDark: 'text-emerald-400',
    min: 0,
    max: 30,
  },
  between30and60: {
    key: 'between30and60',
    label: 'En attente (30-60j)',
    shortLabel: 'En attente',
    description: 'À surveiller',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-500/10',
    textLight: 'text-amber-700',
    textDark: 'text-amber-400',
    min: 30,
    max: 60,
  },
  over60: {
    key: 'over60',
    label: 'En retard (> 60j)',
    shortLabel: 'En retard',
    description: 'Action requise',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    bgLight: 'bg-red-50',
    bgDark: 'bg-red-500/10',
    textLight: 'text-red-700',
    textDark: 'text-red-400',
    min: 60,
    max: Infinity,
  },
};

/**
 * Calculate days since invoice was due
 */
function getDaysOverdue(facture) {
  const now = new Date();
  let echeance;

  if (facture.date_echeance) {
    echeance = new Date(facture.date_echeance);
  } else if (facture.date) {
    echeance = new Date(facture.date);
    echeance.setDate(echeance.getDate() + 30);
  } else {
    return 0;
  }

  const days = Math.floor((now - echeance) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Format currency in French
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Format document number with correct prefix (FAC- for factures)
 */
function formatFactureNumber(facture) {
  const numero = facture.numero || facture.id?.slice(-6) || '---';

  // If it already has FAC- prefix, use it as-is
  if (numero.startsWith('FAC-')) {
    return numero;
  }

  // If number starts with a digit, add FAC- prefix
  if (/^\d/.test(numero)) {
    return `FAC-${numero}`;
  }

  return numero;
}

/**
 * Format compact currency
 */
function formatCompact(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M €`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k €`;
  return `${Math.round(amount)} €`;
}

/**
 * Custom tooltip for donut chart
 */
function DonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {data.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatCurrency(data.value)} ({data.count} facture{data.count > 1 ? 's' : ''})
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Stat card for each age group - Simplified and clearer
 */
function AgeGroupCard({ group, amount, count, percent, onClick, isDark }) {
  const config = AGE_GROUPS[group];

  if (amount === 0) {
    return (
      <div
        className={cn(
          'relative rounded-lg p-2.5 opacity-50',
          isDark ? 'bg-slate-800/30' : 'bg-gray-50'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className={cn(
              'text-xs font-medium',
              isDark ? 'text-gray-400' : 'text-gray-500'
            )}>
              {config.shortLabel}
            </span>
          </div>
          <span className={cn(
            'text-xs',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}>
            —
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-lg p-2.5 text-left transition-all duration-200 w-full',
        'hover:scale-[1.01] active:scale-[0.99]',
        'border-l-4',
        isDark
          ? 'bg-slate-800/50 hover:bg-slate-800/80'
          : 'bg-white hover:bg-gray-50 shadow-sm'
      )}
      style={{ borderLeftColor: config.color }}
    >
      {/* Content */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              'text-xs font-semibold',
              isDark ? config.textDark : config.textLight
            )}>
              {config.shortLabel}
            </span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'
            )}>
              {count} fact.
            </span>
          </div>
          <p className={cn(
            'text-base font-bold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {formatCompact(amount)}
          </p>
        </div>

        {/* Percentage badge */}
        <div className={cn(
          'flex flex-col items-end'
        )}>
          <span className={cn(
            'text-sm font-bold tabular-nums',
            isDark ? config.textDark : config.textLight
          )}>
            {percent}%
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Alert banner for critical overdue
 */
function CriticalAlert({ amount, count, onAction, isDark }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl p-4 mb-4',
      'border-2 animate-pulse-subtle',
      isDark
        ? 'bg-gradient-to-r from-red-900/30 to-red-800/20 border-red-500/50'
        : 'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
    )}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-shimmer" />

      <div className="relative flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg flex-shrink-0',
          isDark ? 'bg-red-500/20' : 'bg-red-100'
        )}>
          <AlertCircle className={cn(
            'w-5 h-5',
            isDark ? 'text-red-400' : 'text-red-600'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-lg font-bold',
            isDark ? 'text-red-300' : 'text-red-700'
          )}>
            {formatCurrency(amount)}
          </p>
          <p className={cn(
            'text-sm',
            isDark ? 'text-red-400' : 'text-red-600'
          )}>
            {count} facture{count > 1 ? 's' : ''} en retard critique (+60j)
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={onAction}
          className="flex-shrink-0"
        >
          Relancer
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Donut chart center content
 */
function DonutCenter({ total, isDark }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <p className={cn(
        'text-xs font-medium',
        isDark ? 'text-gray-400' : 'text-gray-500'
      )}>
        Total
      </p>
      <p className={cn(
        'text-xl font-bold',
        isDark ? 'text-white' : 'text-gray-900'
      )}>
        {formatCompact(total)}
      </p>
    </div>
  );
}

/**
 * RelanceModal - Modal to relance overdue invoices
 */
function RelanceModal({ isOpen, onClose, factures, getClient, onRelance }) {
  const [relancingIds, setRelancingIds] = React.useState(new Set());

  const handleRelance = async (facture) => {
    setRelancingIds(prev => new Set([...prev, facture.id]));
    await new Promise(resolve => setTimeout(resolve, 1500));
    onRelance?.(facture);
    setRelancingIds(prev => {
      const next = new Set(prev);
      next.delete(facture.id);
      return next;
    });
  };

  const handleRelanceAll = async () => {
    for (const facture of factures) {
      await handleRelance(facture);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Factures à relancer</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {factures.length} facture{factures.length > 1 ? 's' : ''} impayée{factures.length > 1 ? 's' : ''} depuis plus de 60 jours
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {factures.map((facture) => {
            const client = getClient(facture.client_id);
            const days = getDaysOverdue(facture);
            const isRelancing = relancingIds.has(facture.id);

            return (
              <div
                key={facture.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatFactureNumber(facture)}
                    <span className="text-gray-400 mx-1">•</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {client?.nom || 'Client inconnu'}
                    </span>
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {days} jours de retard
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(facture.total_ttc)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRelance(facture)}
                    disabled={isRelancing}
                  >
                    {isRelancing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
        <Button variant="danger" onClick={handleRelanceAll}>
          Tout relancer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * TresorerieWidget Component
 */
export default function TresorerieWidget({ userId, className, setPage, isDark = false }) {
  const { devis: allDevis } = useDevis();
  const { getClient } = useClients();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [unpaidData, setUnpaidData] = React.useState(null);
  const [showRelanceModal, setShowRelanceModal] = React.useState(false);

  // Calculate unpaid invoices breakdown
  const calculateUnpaidData = React.useCallback((factures) => {
    const groups = {
      under30: { ...AGE_GROUPS.under30, amount: 0, count: 0, factures: [] },
      between30and60: { ...AGE_GROUPS.between30and60, amount: 0, count: 0, factures: [] },
      over60: { ...AGE_GROUPS.over60, amount: 0, count: 0, factures: [] },
    };

    let totalAmount = 0;
    let totalCount = 0;

    factures.forEach((facture) => {
      if (facture.type !== 'facture' || facture.statut === 'payee') return;

      const montantRestant = (facture.total_ttc || 0) - (facture.montant_paye || 0);
      if (montantRestant <= 0) return;

      const daysOverdue = getDaysOverdue(facture);

      let group;
      if (daysOverdue >= 60) {
        group = groups.over60;
      } else if (daysOverdue >= 30) {
        group = groups.between30and60;
      } else {
        group = groups.under30;
      }

      group.amount += montantRestant;
      group.count += 1;
      group.factures.push(facture);
      totalAmount += montantRestant;
      totalCount += 1;
    });

    // Calculate percentages
    Object.keys(groups).forEach(key => {
      groups[key].percent = totalAmount > 0
        ? Math.round((groups[key].amount / totalAmount) * 100)
        : 0;
    });

    return {
      groups,
      totalAmount,
      totalCount,
      hasOver60: groups.over60.amount > 0,
    };
  }, []);

  // Fetch unpaid invoices
  const fetchUnpaidData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        const data = calculateUnpaidData(allDevis);
        setUnpaidData(data);
      } else {
        const { data: factures, error: queryError } = await supabase
          .from('devis')
          .select('*')
          .eq('type', 'facture')
          .neq('statut', 'payee');

        if (queryError) throw queryError;

        const data = calculateUnpaidData(factures || []);
        setUnpaidData(data);
      }
    } catch (err) {
      console.error('Error fetching unpaid data:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [allDevis, calculateUnpaidData]);

  React.useEffect(() => {
    fetchUnpaidData();
  }, [fetchUnpaidData]);

  // Real-time subscription
  React.useEffect(() => {
    if (isDemo || !supabase) return;

    const subscription = supabase
      .channel('factures-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devis',
          filter: 'type=eq.facture',
        },
        () => {
          fetchUnpaidData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUnpaidData]);

  const handleRelance = (facture) => {
    console.log('Relancing facture:', facture.id);
  };

  const handleManageFactures = () => {
    setPage?.('devis');
  };

  const isEmpty = !loading && unpaidData?.totalCount === 0;

  // Prepare donut chart data
  const donutData = React.useMemo(() => {
    if (!unpaidData) return [];
    return Object.keys(AGE_GROUPS)
      .map(key => ({
        name: key,
        label: AGE_GROUPS[key].label,
        value: unpaidData.groups[key].amount,
        count: unpaidData.groups[key].count,
        color: AGE_GROUPS[key].color,
      }))
      .filter(d => d.value > 0);
  }, [unpaidData]);

  return (
    <>
      <Widget
        loading={loading}
        empty={isEmpty}
        isDark={isDark}
        emptyState={
          <WidgetEmptyState
            icon={<CheckCircle />}
            title="Trésorerie saine"
            description="Aucune facture impayée"
            ctaLabel="Voir les factures"
            onCtaClick={handleManageFactures}
            isDark={isDark}
          />
        }
        className={className}
      >
        <WidgetHeader
          title="Factures impayées"
          icon={<Wallet />}
          isDark={isDark}
          actions={
            unpaidData?.totalCount > 0 && (
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                unpaidData.hasOver60
                  ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                  : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              )}>
                {formatCompact(unpaidData.totalAmount)}
              </div>
            )
          }
        />

        <WidgetContent>
          {error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchUnpaidData}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Réessayer
              </Button>
            </div>
          ) : unpaidData ? (
            <>
              {/* Critical alert */}
              {unpaidData.hasOver60 && (
                <CriticalAlert
                  amount={unpaidData.groups.over60.amount}
                  count={unpaidData.groups.over60.count}
                  onAction={() => setShowRelanceModal(true)}
                  isDark={isDark}
                />
              )}

              {/* Main content: Stats in cleaner layout */}
              <div className="space-y-3">
                {/* Total amount header */}
                <div className={cn(
                  'flex items-center justify-between p-3 rounded-xl',
                  isDark ? 'bg-slate-800/50' : 'bg-gray-50'
                )}>
                  <div>
                    <p className={cn(
                      'text-xs font-medium mb-0.5',
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      Total à encaisser
                    </p>
                    <p className={cn(
                      'text-2xl font-bold',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {formatCurrency(unpaidData.totalAmount)}
                    </p>
                  </div>
                  <div className={cn(
                    'text-right'
                  )}>
                    <p className={cn(
                      'text-xs',
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      {unpaidData.totalCount} facture{unpaidData.totalCount > 1 ? 's' : ''}
                    </p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      Âge moyen: ~{Math.round(
                        (unpaidData.groups.under30.count * 15 +
                          unpaidData.groups.between30and60.count * 45 +
                          unpaidData.groups.over60.count * 75) /
                        Math.max(unpaidData.totalCount, 1)
                      )}j
                    </p>
                  </div>
                </div>

                {/* Age breakdown label */}
                <p className={cn(
                  'text-[10px] font-medium uppercase tracking-wide',
                  isDark ? 'text-gray-400' : 'text-gray-500'
                )}>
                  Répartition par ancienneté
                </p>

                {/* Age group cards - cleaner vertical stack */}
                <div className="space-y-1.5">
                  {Object.keys(AGE_GROUPS).map(key => (
                    <AgeGroupCard
                      key={key}
                      group={key}
                      amount={unpaidData.groups[key].amount}
                      count={unpaidData.groups[key].count}
                      percent={unpaidData.groups[key].percent || 0}
                      onClick={handleManageFactures}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </WidgetContent>

        <WidgetFooter isDark={isDark}>
          <WidgetLink onClick={handleManageFactures} isDark={isDark}>
            Voir toutes les factures
          </WidgetLink>
          {unpaidData?.hasOver60 && (
            <WidgetLink
              onClick={() => setShowRelanceModal(true)}
              isDark={isDark}
              className={isDark ? 'text-red-400' : 'text-red-600'}
            >
              Relancer ({unpaidData.groups.over60.count})
            </WidgetLink>
          )}
        </WidgetFooter>
      </Widget>

      {/* Relance Modal */}
      {unpaidData?.hasOver60 && (
        <RelanceModal
          isOpen={showRelanceModal}
          onClose={() => setShowRelanceModal(false)}
          factures={unpaidData.groups.over60.factures}
          getClient={getClient}
          onRelance={handleRelance}
        />
      )}
    </>
  );
}

/**
 * TresorerieWidgetSkeleton
 */
export function TresorerieWidgetSkeleton({ isDark = false }) {
  return (
    <Widget loading isDark={isDark}>
      <WidgetHeader title="À encaisser" icon={<Wallet />} isDark={isDark} />
      <WidgetContent>
        <div className="animate-pulse">
          <div className="flex gap-4">
            <div className={cn('w-28 h-28 rounded-full', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
            <div className="flex-1 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn('h-16 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
              ))}
            </div>
          </div>
        </div>
      </WidgetContent>
    </Widget>
  );
}
