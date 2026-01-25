import * as React from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Send,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDevis, useClients } from '../../context/DataContext';
import { DEVIS_STATUS } from '../../lib/constants';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Widget,
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetEmptyState,
  WidgetMenuButton,
  WidgetLink,
} from './Widget';
import supabase, { isDemo } from '../../supabaseClient';

/**
 * @typedef {Object} DevisWidgetProps
 * @property {string} [userId] - User ID for filtering (optional in demo mode)
 * @property {number} [limit] - Max number of devis to show (default: 3)
 * @property {() => void} [onRelance] - Custom relance handler
 * @property {string} [className] - Additional CSS classes
 */

// Status considered as "en attente" (waiting for client response)
const WAITING_STATUSES = [DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU];

// Days threshold for "À relancer" warning
const RELANCE_THRESHOLD_DAYS = 7;

/**
 * Calculate days since a date
 */
function daysSince(dateString) {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format currency
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
 * DevisCard - Individual devis card in the widget
 */
function DevisCard({
  devis,
  client,
  onRelance,
  onView,
  isRelancing,
}) {
  const daysPending = daysSince(devis.createdAt || devis.date_envoi);
  const needsRelance = daysPending >= RELANCE_THRESHOLD_DAYS;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-gray-100 dark:border-slate-700',
        'bg-white dark:bg-slate-800',
        'hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600',
        'transition-all duration-200'
      )}
    >
      {/* Header: Number + Client */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            #{devis.numero || devis.id?.slice(-6) || '---'}
            <span className="text-gray-400 dark:text-gray-500 mx-1">•</span>
            <span className="text-gray-600 dark:text-gray-400">
              {client?.nom || 'Client inconnu'}
            </span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {devis.titre || devis.objet || 'Sans titre'}
          </p>
        </div>
      </div>

      {/* Amount */}
      <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-2">
        {formatCurrency(devis.total_ttc || devis.montant)}
      </p>

      {/* Warning badge if needs relance */}
      {needsRelance && (
        <div className="flex items-center gap-1.5 mb-3">
          <Badge variant="warning" size="sm" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            À relancer
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Envoyé il y a {daysPending} jours
          </span>
        </div>
      )}

      {!needsRelance && daysPending > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          Envoyé il y a {daysPending} jour{daysPending > 1 ? 's' : ''}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRelance(devis)}
          disabled={isRelancing}
          className="flex-1"
        >
          {isRelancing ? (
            <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-1.5" />
          )}
          Relancer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(devis)}
          className="flex-1"
        >
          <Eye className="w-4 h-4 mr-1.5" />
          Voir
        </Button>
      </div>
    </div>
  );
}

/**
 * DevisCardSkeleton - Loading skeleton for devis card
 */
function DevisCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-gray-100 dark:border-slate-700 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-3 w-32 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="h-6 w-24 rounded bg-gray-200 dark:bg-slate-700 mb-3" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 rounded bg-gray-100 dark:bg-slate-800" />
        <div className="h-8 flex-1 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

/**
 * DevisWidget - Widget showing pending devis
 *
 * @param {DevisWidgetProps} props
 */
export default function DevisWidget({
  userId,
  limit = 3,
  onRelance: customOnRelance,
  className,
  setPage,
  setSelectedDevis,
  setCreateMode,
}) {
  const { devis: allDevis } = useDevis();
  const { clients, getClient } = useClients();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [relancingId, setRelancingId] = React.useState(null);
  const [pendingDevis, setPendingDevis] = React.useState([]);

  // Filter and fetch pending devis
  const fetchPendingDevis = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        // Demo mode: filter from context
        const filtered = allDevis
          .filter(d => WAITING_STATUSES.includes(d.statut))
          .sort((a, b) => new Date(b.createdAt || b.date_envoi) - new Date(a.createdAt || a.date_envoi))
          .slice(0, limit);

        setPendingDevis(filtered);
      } else {
        // Real Supabase query
        const { data, error: queryError } = await supabase
          .from('devis')
          .select(`
            *,
            client:clients(id, nom)
          `)
          .in('statut', WAITING_STATUSES)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (queryError) throw queryError;
        setPendingDevis(data || []);
      }
    } catch (err) {
      console.error('Error fetching pending devis:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [allDevis, limit]);

  // Initial fetch
  React.useEffect(() => {
    fetchPendingDevis();
  }, [fetchPendingDevis]);

  // Real-time subscription (when not in demo mode)
  React.useEffect(() => {
    if (isDemo || !supabase) return;

    const subscription = supabase
      .channel('devis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devis',
        },
        () => {
          fetchPendingDevis();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPendingDevis]);

  // Handle relance action
  const handleRelance = async (devis) => {
    if (customOnRelance) {
      customOnRelance(devis);
      return;
    }

    setRelancingId(devis.id);

    // Simulate relance action (would open modal in real app)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real app, this would:
    // 1. Open confirmation modal
    // 2. Send email/SMS
    // 3. Update devis status/history

    setRelancingId(null);

    // Navigate to the devis
    setSelectedDevis?.(devis);
    setPage?.('devis');
  };

  // Handle view action
  const handleView = (devis) => {
    setSelectedDevis?.(devis);
    setPage?.('devis');
  };

  // Handle create new devis
  const handleCreateDevis = () => {
    setCreateMode?.({ devis: true });
    setPage?.('devis');
  };

  // Handle view all
  const handleViewAll = () => {
    setPage?.('devis');
  };

  // Get client for a devis (from embedded data or context)
  const getClientForDevis = (devis) => {
    // If client is embedded from Supabase join
    if (devis.client && typeof devis.client === 'object') {
      return devis.client;
    }
    // Otherwise get from context
    return getClient(devis.client_id);
  };

  // Total count for badge
  const totalPendingCount = isDemo || !supabase
    ? allDevis.filter(d => WAITING_STATUSES.includes(d.statut)).length
    : pendingDevis.length;

  // Empty state
  const isEmpty = !loading && pendingDevis.length === 0;

  return (
    <Widget
      loading={loading}
      empty={isEmpty}
      emptyState={
        <WidgetEmptyState
          icon={<CheckCircle />}
          title="Aucun devis en attente"
          description="Tous vos clients ont répondu"
          ctaLabel="Créer un devis"
          onCtaClick={handleCreateDevis}
        />
      }
      className={className}
    >
      <WidgetHeader
        title="Devis en attente"
        icon={<FileText />}
        actions={
          <div className="flex items-center gap-2">
            {totalPendingCount > 0 && (
              <Badge variant="secondary" size="sm">
                {totalPendingCount}
              </Badge>
            )}
            <WidgetMenuButton onClick={() => {}} />
          </div>
        }
      />

      <WidgetContent>
        {error ? (
          <div className="text-center py-6">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingDevis}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDevis.map((devis) => (
              <DevisCard
                key={devis.id}
                devis={devis}
                client={getClientForDevis(devis)}
                onRelance={handleRelance}
                onView={handleView}
                isRelancing={relancingId === devis.id}
              />
            ))}
          </div>
        )}
      </WidgetContent>

      <WidgetFooter>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateDevis}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Créer un devis
        </Button>
        <WidgetLink onClick={handleViewAll}>
          Voir tous
        </WidgetLink>
      </WidgetFooter>
    </Widget>
  );
}

/**
 * DevisWidgetSkeleton - Full skeleton for the widget
 */
export function DevisWidgetSkeleton() {
  return (
    <Widget loading>
      <WidgetHeader title="Devis en attente" icon={<FileText />} />
      <WidgetContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <DevisCardSkeleton key={i} />
          ))}
        </div>
      </WidgetContent>
    </Widget>
  );
}
