import React, { useState, useMemo, useCallback } from 'react';
import {
  Mail,
  CheckCircle,
  Clock,
  FileText,
  Send,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DEVIS_STATUS_LABELS, DEVIS_STATUS_COLORS } from '../../lib/constants';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import Modal, {
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '../ui/Modal';

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function daysSince(dateString) {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

function getUrgency(days, isDark) {
  if (days >= 30) return {
    level: 'critical',
    color: 'text-red-500',
    bg: isDark ? 'bg-red-500/10' : 'bg-red-50',
  };
  if (days >= 14) return {
    level: 'warning',
    color: 'text-amber-500',
    bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
  };
  return {
    level: 'normal',
    color: 'text-blue-500',
    bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
  };
}

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Urgence' },
  { value: 'amount_desc', label: 'Montant (haut)' },
  { value: 'amount_asc', label: 'Montant (bas)' },
  { value: 'date', label: "Date d'envoi" },
];

function DevisRow({
  devis,
  client,
  selected,
  onToggle,
  onRelance,
  onQuickAction,
  relanceLoading,
  isDark,
}) {
  const days = daysSince(devis.date || devis.createdAt);
  const urgency = getUrgency(days, isDark);
  const statusColors = DEVIS_STATUS_COLORS[devis.statut] || {};
  const hasBeenRelanced = devis.reminder_count > 0;

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-150',
        'hover:shadow-md',
        selected
          ? isDark
            ? 'border-primary-500/50 bg-primary-500/5'
            : 'border-primary-500 bg-primary-50/50'
          : isDark
            ? 'border-slate-700 bg-slate-800/50'
            : 'border-gray-200 bg-white'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggle(devis.id)}
            className={cn(
              'mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-150',
              'flex items-center justify-center',
              selected
                ? 'border-primary-500 bg-primary-500'
                : isDark
                  ? 'border-slate-600 hover:border-primary-400'
                  : 'border-gray-300 hover:border-primary-400'
            )}
          >
            {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-gray-900')}>
                  {client?.nom || client?.entreprise || 'Client inconnu'}
                </p>
                <p className={cn('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {devis.numero} {devis.objet || devis.titre ? `— ${devis.objet || devis.titre}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {formatCurrency(devis.total_ttc || devis.total_ht)}
                </p>
              </div>
            </div>

            {/* Bottom row: badges + actions */}
            <div className="flex items-center justify-between gap-2 mt-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  urgency.bg, urgency.color
                )}>
                  <Clock className="w-3 h-3" />
                  {days}j
                </span>

                <Badge variant="secondary" className={cn(statusColors.bg, statusColors.text, 'text-xs')}>
                  {DEVIS_STATUS_LABELS[devis.statut]}
                </Badge>

                {hasBeenRelanced && (
                  <span className={cn('inline-flex items-center gap-1 text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    <Send className="w-3 h-3" />
                    {devis.reminder_count}x relancé
                  </span>
                )}
              </div>

              {/* Inline actions */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onRelance(devis)}
                  disabled={relanceLoading === devis.id}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors duration-150 disabled:opacity-50"
                >
                  {relanceLoading === devis.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  Relancer
                </button>
                <button
                  onClick={() => onQuickAction(devis)}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-150',
                    isDark
                      ? 'text-gray-300 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Actions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBar({ devisList, isDark }) {
  const totalMontant = devisList.reduce((s, d) => s + (d.total_ttc || d.total_ht || 0), 0);
  const urgentCount = devisList.filter(d => daysSince(d.date || d.createdAt) >= 14).length;

  const cardBg = isDark ? 'bg-slate-700/50' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className={cn(cardBg, 'rounded-xl p-3 text-center')}>
        <p className={cn('text-lg font-bold', textPrimary)}>{devisList.length}</p>
        <p className={cn('text-xs', textSecondary)}>devis en attente</p>
      </div>
      <div className={cn(cardBg, 'rounded-xl p-3 text-center')}>
        <p className={cn('text-lg font-bold', isDark ? 'text-primary-400' : 'text-primary-600')}>{formatCurrency(totalMontant)}</p>
        <p className={cn('text-xs', textSecondary)}>valeur totale</p>
      </div>
      <div className={cn(
        'rounded-xl p-3 text-center',
        urgentCount > 0
          ? isDark ? 'bg-red-500/10' : 'bg-red-50'
          : cardBg
      )}>
        <p className={cn(
          'text-lg font-bold',
          urgentCount > 0
            ? isDark ? 'text-red-400' : 'text-red-600'
            : textPrimary
        )}>{urgentCount}</p>
        <p className={cn('text-xs', textSecondary)}>{urgentCount > 0 ? 'à relancer' : 'urgent'}</p>
      </div>
    </div>
  );
}

export default function RelancerDevisModal({
  isOpen,
  onClose,
  pendingDevis = [],
  clients = [],
  isDark = false,
  onRelanceSingle,
  onOpenQuickActions,
  onViewAllDevis,
  onUpdate,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('urgency');
  const [bulkRelanceLoading, setBulkRelanceLoading] = useState(false);
  const [singleRelanceLoading, setSingleRelanceLoading] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const clientMap = useMemo(() => {
    const map = {};
    clients.forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  const sortedDevis = useMemo(() => {
    const list = [...pendingDevis];
    switch (sortBy) {
      case 'urgency':
        return list.sort((a, b) => daysSince(b.date || b.createdAt) - daysSince(a.date || a.createdAt));
      case 'amount_desc':
        return list.sort((a, b) => (b.total_ttc || b.total_ht || 0) - (a.total_ttc || a.total_ht || 0));
      case 'amount_asc':
        return list.sort((a, b) => (a.total_ttc || a.total_ht || 0) - (b.total_ttc || b.total_ht || 0));
      case 'date':
        return list.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
      default:
        return list;
    }
  }, [pendingDevis, sortBy]);

  const handleToggle = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedDevis.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedDevis.map(d => d.id)));
    }
  }, [selectedIds.size, sortedDevis]);

  const handleRelanceSingle = useCallback(async (devis) => {
    setSingleRelanceLoading(devis.id);
    try {
      await onRelanceSingle?.(devis);
    } finally {
      setSingleRelanceLoading(null);
    }
  }, [onRelanceSingle]);

  const handleBulkRelance = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkRelanceLoading(true);
    try {
      const selected = sortedDevis.filter(d => selectedIds.has(d.id));
      for (const devis of selected) {
        await onRelanceSingle?.(devis);
      }
      setSelectedIds(new Set());
      onUpdate?.();
    } finally {
      setBulkRelanceLoading(false);
    }
  }, [selectedIds, sortedDevis, onRelanceSingle, onUpdate]);

  const handleQuickAction = useCallback((devis) => {
    onClose();
    onOpenQuickActions?.(devis);
  }, [onClose, onOpenQuickActions]);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSortBy('urgency');
      setShowSortMenu(false);
    }
  }, [isOpen]);

  const allSelected = sortedDevis.length > 0 && selectedIds.size === sortedDevis.length;
  const selectedCount = selectedIds.size;
  const selectedMontant = sortedDevis
    .filter(d => selectedIds.has(d.id))
    .reduce((s, d) => s + (d.total_ttc || d.total_ht || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>
          <span className="inline-flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Devis en attente de réponse
          </span>
        </ModalTitle>
        <ModalDescription>
          {pendingDevis.length} devis envoyé{pendingDevis.length > 1 ? 's' : ''} sans réponse — relancez vos clients pour accélérer vos ventes
        </ModalDescription>
      </ModalHeader>

      <ModalBody>
        {/* Summary stats */}
        <SummaryBar devisList={pendingDevis} isDark={isDark} />

        {/* Toolbar: select all + sort */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleSelectAll}
            className={cn(
              'inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150',
              isDark
                ? 'text-gray-300 hover:bg-slate-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <span className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
              allSelected
                ? 'border-primary-500 bg-primary-500'
                : isDark ? 'border-slate-600' : 'border-gray-300'
            )}>
              {allSelected && <CheckCircle className="w-3 h-3 text-white" />}
            </span>
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150',
                isDark
                  ? 'text-gray-400 hover:bg-slate-700'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
              {showSortMenu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showSortMenu && (
              <div className={cn(
                'absolute right-0 top-full mt-1 border rounded-xl shadow-lg z-10 py-1 min-w-[150px]',
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              )}>
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      sortBy === option.value
                        ? isDark
                          ? 'text-primary-400 bg-primary-500/10 font-medium'
                          : 'text-primary-600 bg-primary-50 font-medium'
                        : isDark
                          ? 'text-gray-300 hover:bg-slate-700'
                          : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Devis list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {sortedDevis.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>Aucun devis en attente</p>
              <p className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                Tous vos devis ont reçu une réponse
              </p>
            </div>
          ) : (
            sortedDevis.map(devis => (
              <DevisRow
                key={devis.id}
                devis={devis}
                client={clientMap[devis.client_id]}
                selected={selectedIds.has(devis.id)}
                onToggle={handleToggle}
                onRelance={handleRelanceSingle}
                onQuickAction={handleQuickAction}
                relanceLoading={singleRelanceLoading}
                isDark={isDark}
              />
            ))
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full gap-3">
          <button
            onClick={() => { onClose(); onViewAllDevis?.(); }}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-150',
              isDark
                ? 'text-gray-400 hover:text-primary-400'
                : 'text-gray-500 hover:text-primary-600'
            )}
          >
            <ExternalLink className="w-4 h-4" />
            Tous les devis
          </button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="primary"
                onClick={handleBulkRelance}
                disabled={bulkRelanceLoading}
                className="gap-2"
              >
                {bulkRelanceLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Relancer {selectedCount} devis
                    <span className="text-xs opacity-75">
                      ({formatCurrency(selectedMontant)})
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
