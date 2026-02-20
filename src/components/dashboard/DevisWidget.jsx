import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Send,
  Clock,
  ArrowRight,
  X,
  Mail,
  MessageSquare,
  Calendar,
  User,
  Euro,
  FileStack,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatMoney, formatDate, formatRelativeDate } from '../../lib/formatters';
import { useDevis, useClients } from '../../context/DataContext';
import { useToast } from '../../context/AppContext';
import { DEVIS_STATUS } from '../../lib/constants';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import Widget, {
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
 * @property {string} [userId] - User ID for filtering
 * @property {number} [maxDisplay] - Max number of devis to show (default: 3)
 * @property {() => void} [onRelance] - Custom relance handler
 * @property {string} [className] - Additional CSS classes
 * @property {(page: string) => void} [setPage] - Page navigation
 * @property {(devis: object) => void} [setSelectedDevis] - Devis selection
 * @property {(mode: object) => void} [setCreateMode] - Create mode setter
 * @property {(devis: object) => void} [onConvertToFacture] - Convert to invoice handler
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
 * Format document number with correct prefix (DEV- for devis, FAC- for factures)
 */
function formatDocumentNumber(devis) {
  const numero = devis.numero || devis.id?.slice(-6) || '---';

  // If it already has a proper prefix, use it as-is
  if (numero.startsWith('DEV-') || numero.startsWith('FAC-')) {
    return numero;
  }

  // Determine the type and add appropriate prefix
  const isFacture = devis.type === 'facture';
  const prefix = isFacture ? 'FAC' : 'DEV';

  // If number starts with a digit, add the prefix
  if (/^\d/.test(numero)) {
    return `${prefix}-${numero}`;
  }

  return numero;
}


/**
 * Format relative time since a date
 */
function formatRelativeTimeSince(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 14) return 'il y a 1 semaine';
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaines`;
  return `il y a ${Math.floor(diffDays / 30)} mois`;
}

/**
 * Tooltip component for preview
 */
function PreviewTooltip({ children, devis, client }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = React.useRef(null);

  const handleMouseEnter = (e) => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setIsVisible(true);
  };

  const lignesCount = devis.lignes?.length || devis.items?.length || 0;

  // Get the date when devis was sent/created
  const dateEnvoi = devis.date_envoi || devis.createdAt || devis.date;
  const hasDate = !!dateEnvoi;
  const relativeSince = formatRelativeTimeSince(dateEnvoi);

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl min-w-[220px] animate-fade-in"
          role="tooltip"
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium">{client?.nom || 'Client inconnu'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="w-3.5 h-3.5 text-gray-400" />
              <span>
                HT: {formatMoney(devis.total_ht || 0)} / TTC: {formatMoney(devis.total_ttc || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {hasDate ? (
                <span>
                  Envoyé le {formatDate(dateEnvoi, 'short')}
                  <span className="text-gray-400 ml-1">({relativeSince})</span>
                </span>
              ) : (
                <span className="text-gray-400 italic">Date non renseignée</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FileStack className="w-3.5 h-3.5 text-gray-400" />
              <span>{lignesCount} ligne{lignesCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="pt-1 border-t border-gray-700">
              <Badge
                variant={devis.statut === 'vu' ? 'info' : 'warning'}
                size="sm"
              >
                {devis.statut === 'vu' ? 'Vu par le client' : 'En attente'}
              </Badge>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>
      )}
    </div>
  );
}

/**
 * Confirmation Modal component
 */
function ConfirmModal({ isOpen, onClose, onConfirm, title, children, confirmLabel, confirmVariant = 'primary', isLoading }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Relance Modal with email/SMS template
 */
function RelanceModal({ isOpen, onClose, onConfirm, devis, client, isLoading }) {
  const [method, setMethod] = useState('email');
  const [message, setMessage] = useState('');

  // Pre-fill message template
  useEffect(() => {
    if (isOpen && client && devis) {
      const template = method === 'email'
        ? `Bonjour ${client.nom},\n\nJe me permets de vous relancer concernant le devis ${devis.numero || '#' + devis.id?.slice(-6)} pour un montant de ${formatMoney(devis.total_ttc)}.\n\nN'hésitez pas à me contacter si vous avez des questions.\n\nCordialement`
        : `Bonjour ${client.nom}, je vous relance concernant le devis ${devis.numero || '#' + devis.id?.slice(-6)} (${formatMoney(devis.total_ttc)}). Avez-vous pu y réfléchir ?`;
      setMessage(template);
    }
  }, [isOpen, client, devis, method]);

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(method, message)}
      title={`Relancer ${client?.nom || 'le client'}`}
      confirmLabel="Envoyer relance"
      confirmVariant="primary"
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Devis <span className="font-medium">{devis?.numero || '#' + devis?.id?.slice(-6)}</span> • {formatMoney(devis?.total_ttc)}
        </p>

        {/* Method selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setMethod('email')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
              method === 'email'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
            )}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setMethod('sms')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
              method === 'sms'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            SMS
          </button>
        </div>

        {/* Message textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </ConfirmModal>
  );
}

/**
 * Convert to Facture Modal
 */
function ConvertModal({ isOpen, onClose, onConfirm, devis, client, isLoading }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Convertir en facture"
      confirmLabel="Convertir"
      confirmVariant="primary"
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {devis?.numero || '#' + devis?.id?.slice(-6)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {client?.nom || 'Client inconnu'}
              </p>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">
                {formatMoney(devis?.total_ttc)}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cette action va créer une facture à partir de ce devis. Le devis sera marqué comme accepté.
        </p>

        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Toutes les lignes du devis seront copiées
          </span>
        </div>
      </div>
    </ConfirmModal>
  );
}

/**
 * DevisCard - Individual devis card in the widget
 */
function DevisCard({
  devis,
  client,
  onRelance,
  onView,
  onConvert,
  isRelancing,
  isConverting,
  isDark = false,
}) {
  const daysPending = daysSince(devis.createdAt || devis.date_envoi);
  const needsRelance = daysPending >= RELANCE_THRESHOLD_DAYS;

  return (
    <PreviewTooltip devis={devis} client={client}>
      <div
        className={cn(
          // Base styles - Level 2 Elevation
          'group p-4 rounded-lg border transition-all duration-200',
          'shadow-sm',
          // Conditional styling based on urgency
          needsRelance
            ? isDark
              ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent'
              : 'border-orange-300 bg-gradient-to-br from-orange-50 to-orange-50/30'
            : isDark
              ? 'border-slate-700 bg-slate-800/50'
              : 'border-gray-200 bg-white',
          // Hover states
          isDark
            ? 'hover:shadow-md hover:border-primary-600'
            : 'hover:shadow-md hover:border-primary-300',
          'hover:scale-[1.01]'
        )}
      >
        {/* Header: Number + Amount */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-semibold', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {formatDocumentNumber(devis)}
              </span>
              {needsRelance && (
                <span className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
                  isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-800'
                )}>
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {daysPending}j
                </span>
              )}
            </div>
            <p className={cn('text-sm font-semibold truncate leading-snug', isDark ? 'text-white' : 'text-gray-900')}>
              {client?.nom || 'Client inconnu'}
            </p>
            <p className={cn('text-xs mt-0.5 truncate', isDark ? 'text-gray-400' : 'text-gray-600')}>
              {devis.titre || devis.objet || `${devis.type === 'facture' ? 'Facture' : 'Devis'} ${devis.numero || '#' + (devis.id?.slice(-6) || '---')}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={cn('text-base font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              {formatMoney(devis.total_ttc || devis.montant)}
            </p>
            {!needsRelance && daysPending > 0 && (
              <p className={cn('text-[10px] mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
                il y a {daysPending}j
              </p>
            )}
          </div>
        </div>

        {/* Actions - show on hover on desktop, always on mobile */}
        <div className={cn('flex items-center gap-1.5 pt-3 border-t', isDark ? 'border-slate-700/50' : 'border-gray-100')}>
          <button
            type="button"
            onClick={() => onConvert(devis)}
            disabled={isConverting}
            title="Transformer ce devis en facture"
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'px-3 py-2 rounded-lg text-xs font-medium',
              'transition-all duration-150',
              'bg-orange-500 hover:bg-orange-600 text-white shadow-sm',
              isConverting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isConverting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
            Convertir
          </button>
          <button
            type="button"
            onClick={() => onRelance(devis)}
            disabled={isRelancing}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'px-3 py-2 rounded-lg text-xs font-medium',
              'transition-all duration-150',
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
              isRelancing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRelancing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Relancer
          </button>
          <button
            type="button"
            onClick={() => onView(devis)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'px-3 py-2 rounded-lg text-xs font-medium',
              'transition-all duration-150',
              isDark
                ? 'bg-slate-700/50 hover:bg-slate-700 text-gray-400'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            Voir
          </button>
        </div>
      </div>
    </PreviewTooltip>
  );
}

/**
 * DevisCardSkeleton - Loading skeleton for devis card
 */
function DevisCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animate-pulse">
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
        <div className="h-8 flex-1 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

/**
 * DevisWidget - Widget showing pending devis with inline actions
 *
 * @param {DevisWidgetProps} props
 */
function DevisWidget({
  userId,
  maxDisplay = 3,
  limit, // Backward compatibility
  onRelance: customOnRelance,
  onConvertToFacture: customOnConvert,
  className,
  setPage,
  setSelectedDevis,
  setCreateMode,
  setDevis,
  isDark = false,
}) {
  const { devis: allDevis } = useDevis();
  const { clients, getClient } = useClients();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDevis, setPendingDevis] = useState([]);

  // Modal states
  const [relanceModal, setRelanceModal] = useState({ isOpen: false, devis: null, client: null });
  const [convertModal, setConvertModal] = useState({ isOpen: false, devis: null, client: null });
  const [isRelancing, setIsRelancing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const displayLimit = maxDisplay || limit || 3;

  // Filter and fetch pending devis
  const fetchPendingDevis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        // Demo mode: filter from context — only devis (not factures)
        const filtered = allDevis
          .filter(d => d.type === 'devis' && WAITING_STATUSES.includes(d.statut))
          .sort((a, b) => new Date(b.createdAt || b.date_envoi || b.date) - new Date(a.createdAt || a.date_envoi || a.date))
          .slice(0, displayLimit);

        setPendingDevis(filtered);
      } else {
        // Real Supabase query — only devis (exclude factures)
        const { data, error: queryError } = await supabase
          .from('devis')
          .select(`
            *,
            client:clients(id, nom)
          `)
          .eq('type', 'devis')
          .in('statut', WAITING_STATUSES)
          .order('created_at', { ascending: false })
          .limit(displayLimit);

        if (queryError) throw queryError;
        setPendingDevis(data || []);
      }
    } catch (err) {
      console.error('Error fetching pending devis:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [allDevis, displayLimit]);

  // Initial fetch
  useEffect(() => {
    fetchPendingDevis();
  }, [fetchPendingDevis]);

  // Real-time subscription (when not in demo mode)
  useEffect(() => {
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

  // Get client for a devis
  const getClientForDevis = useCallback((devis) => {
    if (devis.client && typeof devis.client === 'object') {
      return devis.client;
    }
    return getClient(devis.client_id);
  }, [getClient]);

  // Handle relance action
  const handleRelanceClick = (devis) => {
    const client = getClientForDevis(devis);
    setRelanceModal({ isOpen: true, devis, client });
  };

  const handleRelanceConfirm = async (method, message) => {
    setIsRelancing(true);
    const clientName = relanceModal.client?.nom || 'le client';
    const methodLabel = method === 'email' ? 'Email' : 'SMS';

    try {
      if (customOnRelance) {
        await customOnRelance(relanceModal.devis, method, message);
      } else {
        // Simulate sending relance
        await new Promise(resolve => setTimeout(resolve, 1000));
        // In real app: send email/SMS, update devis history
      }

      setRelanceModal({ isOpen: false, devis: null, client: null });
      showToast(`✅ Relance envoyée par ${methodLabel} à ${clientName}`, 'success');
    } catch (err) {
      console.error('Error sending relance:', err);
      showToast(`❌ Erreur lors de l'envoi de la relance`, 'error');
    } finally {
      setIsRelancing(false);
    }
  };

  // Handle view action
  const handleView = (devis) => {
    setSelectedDevis?.(devis);
    setPage?.('devis');
  };

  // Handle convert action
  const handleConvertClick = (devis) => {
    const client = getClientForDevis(devis);
    setConvertModal({ isOpen: true, devis, client });
  };

  const handleConvertConfirm = async () => {
    setIsConverting(true);

    try {
      if (customOnConvert) {
        await customOnConvert(convertModal.devis);
      } else {
        // Create facture from devis
        const devis = convertModal.devis;
        const newFacture = {
          ...devis,
          id: `FAC-${Date.now()}`,
          type: 'facture',
          numero: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
          statut: 'emise',
          date: new Date().toISOString(),
          devis_origine: devis.id,
        };

        // Update devis status to accepted
        if (setDevis) {
          setDevis(prev => [
            ...prev.map(d => d.id === devis.id ? { ...d, statut: 'accepte' } : d),
            newFacture,
          ]);
        }

        // Navigate to the new facture
        setSelectedDevis?.(newFacture);
        setPage?.('devis');
      }

      setConvertModal({ isOpen: false, devis: null, client: null });
    } catch (err) {
      console.error('Error converting to facture:', err);
    } finally {
      setIsConverting(false);
    }
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

  // Total count for badge
  const totalPendingCount = useMemo(() => {
    if (isDemo || !supabase) {
      return allDevis.filter(d => d.type === 'devis' && WAITING_STATUSES.includes(d.statut)).length;
    }
    return pendingDevis.length;
  }, [allDevis, pendingDevis]);

  // Empty state
  const isEmpty = !loading && pendingDevis.length === 0;

  return (
    <>
      <Widget
        loading={loading}
        empty={isEmpty}
        isDark={isDark}
        emptyState={
          <WidgetEmptyState
            icon={<CheckCircle className="text-green-500" />}
            iconColor="green"
            title="Aucun devis en attente"
            description="Tous vos clients ont répondu"
            ctaLabel="Créer un devis"
            onCtaClick={handleCreateDevis}
            isDark={isDark}
          />
        }
        className={className}
      >
        <WidgetHeader
          title="Devis en attente"
          icon={<FileText />}
          isDark={isDark}
          actions={
            <div className="flex items-center gap-2">
              {totalPendingCount > 0 && (
                <Tooltip content={`${totalPendingCount} devis en attente de réponse`} side="bottom">
                  <Badge variant="secondary" size="sm">
                    {totalPendingCount}
                  </Badge>
                </Tooltip>
              )}
              <WidgetMenuButton onClick={handleViewAll} isDark={isDark} />
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
                  onRelance={handleRelanceClick}
                  onView={handleView}
                  onConvert={handleConvertClick}
                  isRelancing={relanceModal.devis?.id === devis.id && isRelancing}
                  isConverting={convertModal.devis?.id === devis.id && isConverting}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </WidgetContent>

        <WidgetFooter isDark={isDark}>
          <WidgetLink onClick={handleCreateDevis} isDark={isDark}>
            Créer un devis
          </WidgetLink>
          <WidgetLink onClick={handleViewAll} isDark={isDark}>
            Voir tout
          </WidgetLink>
        </WidgetFooter>
      </Widget>

      {/* Relance Modal */}
      <RelanceModal
        isOpen={relanceModal.isOpen}
        onClose={() => setRelanceModal({ isOpen: false, devis: null, client: null })}
        onConfirm={handleRelanceConfirm}
        devis={relanceModal.devis}
        client={relanceModal.client}
        isLoading={isRelancing}
      />

      {/* Convert Modal */}
      <ConvertModal
        isOpen={convertModal.isOpen}
        onClose={() => setConvertModal({ isOpen: false, devis: null, client: null })}
        onConfirm={handleConvertConfirm}
        devis={convertModal.devis}
        client={convertModal.client}
        isLoading={isConverting}
      />
    </>
  );
}

export default React.memo(DevisWidget);

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
