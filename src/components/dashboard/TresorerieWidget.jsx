import * as React from 'react';

import {
  Wallet,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Send,
} from 'lucide-react';
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

/**
 * @typedef {Object} TresorerieWidgetProps
 * @property {string} [userId] - User ID for filtering
 * @property {string} [className] - Additional CSS classes
 */

/**
 * @typedef {Object} AgeGroup
 * @property {string} label - Display label
 * @property {string} dotColor - Tailwind color class for dot
 * @property {string} textColor - Tailwind color class for text
 * @property {number} amount - Total amount
 * @property {number} count - Number of invoices
 * @property {Array} factures - List of factures in this group
 */

// Age group configurations
const AGE_GROUPS = {
  under30: {
    key: 'under30',
    label: '< 30j',
    dotColor: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    min: 0,
    max: 30,
  },
  between30and60: {
    key: 'between30and60',
    label: '30-60j',
    dotColor: 'bg-primary-500',
    textColor: 'text-primary-600 dark:text-primary-400',
    min: 30,
    max: 60,
  },
  over60: {
    key: 'over60',
    label: '> 60j',
    dotColor: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
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
    // Default: 30 days payment term from invoice date
    echeance = new Date(facture.date);
    echeance.setDate(echeance.getDate() + 30);
  } else {
    return 0;
  }

  const days = Math.floor((now - echeance) / (1000 * 60 * 60 * 24));
  return Math.max(0, days); // Only positive values (overdue)
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
 * AlertBox - Critical alert for overdue invoices
 */
function AlertBox({ amount, count, onRelance }) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-red-900 dark:text-red-100">
            {formatCurrency(amount)} en retard
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
            {count} facture{count > 1 ? 's' : ''} impayée{count > 1 ? 's' : ''} +60 jours
          </p>
        </div>
      </div>
      <Button
        variant="danger"
        className="w-full mt-3"
        onClick={onRelance}
      >
        Relancer maintenant
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

/**
 * BreakdownRow - Single row in breakdown
 */
function BreakdownRow({ label, amount, dotColor, textColor, showWarning }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', dotColor)} />
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn('text-sm font-semibold', amount > 0 ? textColor : 'text-gray-400 dark:text-gray-500')}>
          {formatCurrency(amount)}
        </span>
        {showWarning && amount > 0 && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
      </div>
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

    // Simulate relance action
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
                    {facture.numero || `#${facture.id?.slice(-6)}`}
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
 * TresorerieWidget - Widget showing unpaid invoices breakdown
 *
 * @param {TresorerieWidgetProps} props
 */
export default function TresorerieWidget({ userId, className, setPage }) {
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
      // Only unpaid invoices (factures, not devis)
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
        // Demo mode: calculate from context
        const data = calculateUnpaidData(allDevis);
        setUnpaidData(data);
      } else {
        // Real Supabase query
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

  // Initial fetch
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

  // Handle relance
  const handleRelance = (facture) => {
    // In a real app, this would send email/SMS
    console.log('Relancing facture:', facture.id);
  };

  // Handle manage factures
  const handleManageFactures = () => {
    setPage?.('devis');
  };

  // Empty state
  const isEmpty = !loading && unpaidData?.totalCount === 0;

  return (
    <>
      <Widget
        loading={loading}
        empty={isEmpty}
        emptyState={
          <WidgetEmptyState
            icon={<CheckCircle />}
            title="Trésorerie saine"
            description="Aucune facture impayée"
            ctaLabel="Voir les factures"
            onCtaClick={handleManageFactures}
          />
        }
        className={className}
      >
        <WidgetHeader
          title="Trésorerie"
          icon={<Wallet />}
          actions={<WidgetMenuButton onClick={() => {}} />}
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
              {/* Alert box if > 60 days */}
              {unpaidData.hasOver60 && (
                <AlertBox
                  amount={unpaidData.groups.over60.amount}
                  count={unpaidData.groups.over60.count}
                  onRelance={() => setShowRelanceModal(true)}
                />
              )}

              {/* Breakdown */}
              <div className="space-y-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  À encaisser par échéance
                </p>

                <BreakdownRow
                  label={AGE_GROUPS.under30.label}
                  amount={unpaidData.groups.under30.amount}
                  dotColor={AGE_GROUPS.under30.dotColor}
                  textColor={AGE_GROUPS.under30.textColor}
                />
                <BreakdownRow
                  label={AGE_GROUPS.between30and60.label}
                  amount={unpaidData.groups.between30and60.amount}
                  dotColor={AGE_GROUPS.between30and60.dotColor}
                  textColor={AGE_GROUPS.between30and60.textColor}
                />
                <BreakdownRow
                  label={AGE_GROUPS.over60.label}
                  amount={unpaidData.groups.over60.amount}
                  dotColor={AGE_GROUPS.over60.dotColor}
                  textColor={AGE_GROUPS.over60.textColor}
                  showWarning
                />

                {/* Total */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200 dark:border-slate-700">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Total
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(unpaidData.totalAmount)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </WidgetContent>

        <WidgetFooter>
          <WidgetLink onClick={handleManageFactures}>
            Gérer factures
          </WidgetLink>
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
 * TresorerieWidgetSkeleton - Full skeleton for the widget
 */
export function TresorerieWidgetSkeleton() {
  return (
    <Widget loading>
      <WidgetHeader title="Trésorerie" icon={<Wallet />} />
      <WidgetContent>
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-lg bg-gray-100 dark:bg-slate-800" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-16 rounded bg-gray-100 dark:bg-slate-800" />
                <div className="h-4 w-20 rounded bg-gray-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </WidgetContent>
    </Widget>
  );
}
