/**
 * SuggestionsSection Component
 * Smart suggestions section for dashboard - Horizontal scrollable cards
 *
 * Design System:
 * - Single card container with horizontal scroll
 * - Compact suggestion items
 * - Priority-based visual hierarchy
 * - Smooth animations
 *
 * @module SuggestionsSection
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap,
  X,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  FileText,
  TrendingDown,
  Package,
  CloudRain,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Banknote,
  Calendar,
  Clock,
  Send,
  CalendarClock,
  MoreHorizontal,
  Sparkles,
  BarChart3,
  User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import {
  generateSuggestions,
  getSuggestionConfig,
  dismissSuggestion,
} from '../../lib/suggestions';

// ============ CONFIGURATION ============

const iconMap = {
  FileText,
  TrendingDown,
  Package,
  CloudRain,
  AlertCircle,
  Banknote,
};

// Priority config with colors
const priorityConfig = {
  high: {
    label: 'Urgent',
    color: '#ef4444',
    bg: 'bg-red-500',
    lightBg: 'bg-red-50 dark:bg-red-500/10',
    badgeBg: 'bg-red-100 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-500/30',
    iconBg: 'bg-red-100 dark:bg-red-500/20',
  },
  medium: {
    label: 'Recommandé',
    color: '#f59e0b',
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-500/10',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/30',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
  },
  low: {
    label: 'Suggestion',
    color: '#3b82f6',
    bg: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-500/10',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-500/30',
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
  },
};

const REFRESH_INTERVAL = 5 * 60 * 1000;

// ============ UTILITY FUNCTIONS ============

function formatRelativeTime(days) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return 'il y a 1 semaine';
  if (days < 30) return `il y a ${Math.floor(days / 7)} semaines`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

// ============ HORIZONTAL SUGGESTION ITEM ============

function SuggestionItem({
  suggestion,
  onAction,
  onDismiss,
  onPostpone,
  onAnalyze,
  isActioning,
  isDismissing,
  isPostponing,
  isDark = false,
}) {
  const config = priorityConfig[suggestion.priority] || priorityConfig.medium;
  const suggestionConfig = getSuggestionConfig(suggestion.type);
  const IconComponent = iconMap[suggestionConfig.icon] || AlertCircle;

  // Determine if this is a relance-type action (devis or facture pending)
  const isRelanceAction = suggestion.type === 'quote_pending' || suggestion.type === 'payment_late';
  const isAnalyzeAction = suggestion.type === 'low_margin';

  // Get enriched metadata for display
  const clientName = suggestion.metadata?.clientName;
  const daysSince = suggestion.metadata?.daysSince;
  const chantierName = suggestion.metadata?.chantierNom;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: -20 }}
      className={cn(
        'flex-shrink-0 w-80 p-4 rounded-xl border-2 transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-1',
        'flex flex-col',
        isDark ? 'bg-slate-800/80' : 'bg-white',
        config.border
      )}
    >
      {/* Header with icon and badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              config.iconBg
            )}
          >
            <IconComponent
              size={16}
              style={{ color: config.color }}
              className="flex-shrink-0"
            />
          </div>
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md whitespace-nowrap',
              config.badgeBg,
              config.badgeText
            )}
          >
            {config.label}
          </span>
        </div>

        {/* Action buttons: Postpone + Dismiss */}
        <div className="flex items-center gap-1">
          {/* Postpone button */}
          {onPostpone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPostpone(suggestion.id);
              }}
              disabled={isPostponing}
              title="Reporter à demain"
              className={cn(
                'p-1.5 rounded-md transition-all flex-shrink-0 group',
                isDark
                  ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/20'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50',
                isPostponing && 'animate-pulse'
              )}
            >
              <CalendarClock size={14} className={cn(
                'transition-transform',
                isPostponing && 'animate-bounce'
              )} />
            </button>
          )}

          {/* Dismiss button */}
          {suggestion.dismissible && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(suggestion.id);
              }}
              disabled={isDismissing}
              title="Ignorer"
              className={cn(
                'p-1 rounded-md transition-colors flex-shrink-0',
                isDark
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-slate-700'
                  : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100',
                isDismissing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-sm font-semibold leading-snug mb-1',
        isDark ? 'text-white' : 'text-gray-900'
      )}>
        {suggestion.title}
      </h3>

      {/* Client/Chantier context - enriched display */}
      {(clientName || chantierName) && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs mb-1.5',
          isDark ? 'text-gray-300' : 'text-gray-700'
        )}>
          <User size={12} className="flex-shrink-0" />
          <span className="font-medium truncate">{clientName || chantierName}</span>
          {daysSince !== undefined && (
            <>
              <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>•</span>
              <span className={cn(
                daysSince > 14 ? (isDark ? 'text-amber-400' : 'text-amber-600') : ''
              )}>
                {formatRelativeTime(daysSince)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Description */}
      <p className={cn(
        'text-xs leading-relaxed mb-3',
        isDark ? 'text-gray-400' : 'text-gray-600'
      )}>
        {suggestion.description}
      </p>

      {/* Value and Actions - always at bottom */}
      <div className="flex items-center justify-between mt-auto pt-2 gap-2">
        {suggestion.value && (
          <span className={cn(
            'text-lg font-bold flex-shrink-0',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {suggestion.value}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Primary Action Button - contextual */}
          <button
            type="button"
            onClick={() => {
              if (isRelanceAction && suggestion.onRelance) {
                suggestion.onRelance(suggestion);
              } else if (isAnalyzeAction && onAnalyze) {
                onAnalyze(suggestion);
              } else {
                onAction(suggestion);
              }
            }}
            disabled={isActioning}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-xs font-semibold transition-all duration-150 flex-shrink-0',
              // Different styles for different action types
              isRelanceAction
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm'
                : isAnalyzeAction
                  ? isDark
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200'
                  : isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white',
              isActioning && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isActioning ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <>
                {isRelanceAction ? (
                  <>
                    <Send size={12} />
                    Envoyer une relance
                  </>
                ) : isAnalyzeAction ? (
                  <>
                    <BarChart3 size={12} />
                    Analyser
                  </>
                ) : (
                  <>
                    {suggestion.action?.label || suggestion.ctaLabel || 'Voir'}
                    <ArrowRight size={12} className="flex-shrink-0" />
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============ SKELETON ============

function SuggestionItemSkeleton({ isDark = false }) {
  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 p-4 rounded-xl border animate-pulse',
        isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn('w-9 h-9 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        <div className={cn('w-16 h-4 rounded', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      </div>
      <div className={cn('w-full h-4 rounded mb-2', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      <div className={cn('w-3/4 h-3 rounded mb-3', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      <div className="flex justify-between">
        <div className={cn('w-16 h-6 rounded', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        <div className={cn('w-20 h-7 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      </div>
    </div>
  );
}

// ============ EMPTY STATE ============

function EmptyState({ isDark = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-4 p-6 rounded-xl',
        isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
      )}
    >
      <div className={cn(
        'w-14 h-14 rounded-xl flex items-center justify-center',
        isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
      )}>
        <span className="text-2xl">🎉</span>
      </div>
      <div>
        <p className={cn('font-bold text-lg', isDark ? 'text-emerald-100' : 'text-emerald-900')}>
          Tout est en ordre !
        </p>
        <p className={cn('text-sm', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
          Aucune action urgente • Profitez de cette pause bien méritée
        </p>
      </div>
      <Sparkles className={cn(
        'w-5 h-5 ml-auto animate-pulse',
        isDark ? 'text-emerald-400' : 'text-emerald-500'
      )} />
    </motion.div>
  );
}

// ============ MORE ACTIONS INDICATOR ============

function MoreActionsIndicator({ count, onClick, isDark = false }) {
  if (count <= 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        'flex-shrink-0 w-24 h-full min-h-[140px] rounded-xl border-2 border-dashed',
        'flex flex-col items-center justify-center gap-2',
        'transition-all duration-200 hover:scale-105',
        isDark
          ? 'border-slate-600 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/50'
          : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-50'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center',
        isDark ? 'bg-slate-700' : 'bg-gray-100'
      )}>
        <MoreHorizontal size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
      </div>
      <span className={cn(
        'text-xs font-medium text-center px-2',
        isDark ? 'text-gray-400' : 'text-gray-500'
      )}>
        +{count} autre{count > 1 ? 's' : ''}
      </span>
    </motion.button>
  );
}

// ============ MAIN COMPONENT ============

export default function SuggestionsSection({
  userId,
  suggestions: externalSuggestions,
  maxDisplay = 5,
  className,
  setPage,
  isDark = false,
  onOpenRelance,
  onOpenMarginAnalysis,
}) {
  const { showToast } = useToast();
  const data = useData();
  const scrollContainerRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  // Use external suggestions if provided, otherwise fetch internally
  const useExternalSuggestions = externalSuggestions && externalSuggestions.length > 0;

  const [internalSuggestions, setInternalSuggestions] = React.useState([]);
  const [loading, setLoading] = React.useState(!useExternalSuggestions);
  const [error, setError] = React.useState(null);
  const [actioningId, setActioningId] = React.useState(null);
  const [dismissingId, setDismissingId] = React.useState(null);
  const [postponingId, setPostponingId] = React.useState(null);

  // Check scroll state
  const checkScrollState = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  }, []);

  React.useEffect(() => {
    checkScrollState();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollState);
      window.addEventListener('resize', checkScrollState);
      return () => {
        container.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
  }, [checkScrollState, internalSuggestions, externalSuggestions]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Fetch suggestions only if not using external ones
  const fetchSuggestions = React.useCallback(async () => {
    if (useExternalSuggestions) return;

    setLoading(true);
    setError(null);

    try {
      const allSuggestions = await generateSuggestions(userId, {
        clients: data.clients || [],
        devis: data.devis || [],
        chantiers: data.chantiers || [],
        depenses: data.depenses || [],
        catalogue: data.catalogue || [],
      });

      const filtered = allSuggestions
        .filter(s => !s.dismissed)
        .slice(0, maxDisplay);

      setInternalSuggestions(filtered);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [userId, data, maxDisplay, useExternalSuggestions]);

  React.useEffect(() => {
    if (!useExternalSuggestions) {
      fetchSuggestions();
    }
  }, [fetchSuggestions, useExternalSuggestions]);

  React.useEffect(() => {
    if (useExternalSuggestions) return;
    const interval = setInterval(fetchSuggestions, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSuggestions, useExternalSuggestions]);

  // Use external suggestions if provided, otherwise use internal
  const suggestions = useExternalSuggestions ? externalSuggestions : internalSuggestions;

  const handleAction = async (suggestion) => {
    // If suggestion has a ctaAction callback (from external), use it
    if (suggestion.ctaAction && typeof suggestion.ctaAction === 'function') {
      suggestion.ctaAction();
      return;
    }

    setActioningId(suggestion.id);

    try {
      if (suggestion.action?.route) {
        const route = suggestion.action.route;
        const pageName = route.replace(/^\//, '').split('/')[0] || 'dashboard';
        setPage?.(pageName);

        if (suggestion.dismissible && !useExternalSuggestions) {
          await dismissSuggestion(suggestion.id);
          setInternalSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        }
      } else if (suggestion.action?.modalId) {
        showToast(`Action: ${suggestion.action.modalId}`, 'info');
      }
    } catch (err) {
      console.error('Error executing action:', err);
      showToast('Erreur lors de l\'exécution', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleDismiss = async (suggestionId) => {
    // Don't allow dismiss for external suggestions (parent manages state)
    if (useExternalSuggestions) return;

    setDismissingId(suggestionId);

    try {
      await dismissSuggestion(suggestionId);
      setInternalSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      showToast('Suggestion ignorée', 'info');
    } catch (err) {
      console.error('Error dismissing suggestion:', err);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDismissingId(null);
    }
  };

  const handlePostpone = async (suggestionId) => {
    setPostponingId(suggestionId);

    try {
      // Simulate postponing - in real app, save to DB with tomorrow's date
      await new Promise(resolve => setTimeout(resolve, 600));

      // Remove from current list (it will reappear tomorrow)
      if (useExternalSuggestions) {
        // For external, just show feedback
        showToast('📅 Reporté à demain', 'success');
      } else {
        setInternalSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        showToast('📅 Reporté à demain', 'success');
      }
    } catch (err) {
      console.error('Error postponing suggestion:', err);
      showToast('Erreur lors du report', 'error');
    } finally {
      setPostponingId(null);
    }
  };

  const handleAnalyze = (suggestion) => {
    // Open margin analysis modal if handler provided
    if (onOpenMarginAnalysis && suggestion.metadata?.chantierId) {
      onOpenMarginAnalysis(suggestion.metadata.chantierId, suggestion.metadata.chantierNom);
    } else {
      // Fallback to navigation
      setPage?.('chantiers');
    }
  };

  const totalCount = suggestions.length;
  const displayCount = showAll ? totalCount : Math.min(3, totalCount);
  const hiddenCount = totalCount - displayCount;

  // Don't render if no suggestions and not loading
  if (!loading && totalCount === 0 && !error) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-4 border-b',
        isDark ? 'border-slate-700' : 'border-gray-100'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isDark ? 'bg-amber-500/20' : 'bg-amber-100'
          )}>
            <Calendar size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          </div>
          <div>
            <h2 className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
              À faire aujourd'hui
            </h2>
            {totalCount > 0 && (
              <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {totalCount} action{totalCount > 1 ? 's' : ''} en attente
              </p>
            )}
          </div>
        </div>

        {/* Scroll buttons */}
        {totalCount > 2 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                'p-2 rounded-lg transition-colors',
                canScrollLeft
                  ? isDark
                    ? 'hover:bg-slate-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                  : 'opacity-30 cursor-not-allowed',
                isDark ? 'text-gray-500' : 'text-gray-500'
              )}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn(
                'p-2 rounded-lg transition-colors',
                canScrollRight
                  ? isDark
                    ? 'hover:bg-slate-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                  : 'opacity-30 cursor-not-allowed',
                isDark ? 'text-gray-500' : 'text-gray-500'
              )}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && !useExternalSuggestions ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <SuggestionItemSkeleton key={i} isDark={isDark} />
            ))}
          </div>
        ) : error && !useExternalSuggestions ? (
          <div className={cn(
            'p-5 rounded-xl text-center',
            isDark ? 'bg-red-500/10' : 'bg-red-50'
          )}>
            <p className={cn('text-sm mb-3', isDark ? 'text-red-400' : 'text-red-600')}>{error}</p>
            <button
              type="button"
              onClick={fetchSuggestions}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDark
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                  : 'bg-red-100 hover:bg-red-200 text-red-700'
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        ) : totalCount === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <AnimatePresence mode="popLayout">
              {suggestions.slice(0, displayCount).map((suggestion) => {
                // Enrich suggestion with relance handler if it's a relance type
                const enrichedSuggestion = {
                  ...suggestion,
                  onRelance: (suggestion.type === 'quote_pending' || suggestion.type === 'payment_late')
                    ? () => {
                        if (onOpenRelance) {
                          // Build relance item from suggestion metadata
                          const relanceItem = {
                            type: suggestion.type === 'payment_late' ? 'facture' : 'devis',
                            id: suggestion.metadata?.devisIds?.[0] || suggestion.metadata?.factureIds?.[0],
                            numero: suggestion.metadata?.numero,
                            client: {
                              nom: suggestion.metadata?.clientName || 'Client',
                              email: suggestion.metadata?.clientEmail,
                              telephone: suggestion.metadata?.clientPhone,
                            },
                            montant: suggestion.metadata?.totalValue || suggestion.metadata?.totalAmount || 0,
                            dateEnvoi: suggestion.metadata?.dateCreation || suggestion.metadata?.dateEcheance,
                          };
                          onOpenRelance(relanceItem);
                        } else {
                          // Fallback to default action
                          handleAction(suggestion);
                        }
                      }
                    : undefined
                };

                return (
                  <SuggestionItem
                    key={suggestion.id}
                    suggestion={enrichedSuggestion}
                    onAction={handleAction}
                    onDismiss={handleDismiss}
                    onPostpone={handlePostpone}
                    onAnalyze={handleAnalyze}
                    isActioning={actioningId === suggestion.id}
                    isDismissing={dismissingId === suggestion.id}
                    isPostponing={postponingId === suggestion.id}
                    isDark={isDark}
                  />
                );
              })}

              {/* Show "more" indicator if there are hidden suggestions */}
              {!showAll && hiddenCount > 0 && (
                <MoreActionsIndicator
                  count={hiddenCount}
                  onClick={() => setShowAll(true)}
                  isDark={isDark}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SKELETON EXPORT ============

export function SuggestionsSectionSkeleton({ isDark = false }) {
  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'
    )}>
      <div className={cn(
        'flex items-center gap-3 px-5 py-4 border-b',
        isDark ? 'border-slate-700' : 'border-gray-100'
      )}>
        <div className={cn('w-10 h-10 rounded-xl animate-pulse', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        <div className={cn('w-32 h-5 rounded animate-pulse', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      </div>
      <div className="p-4">
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <SuggestionItemSkeleton key={i} isDark={isDark} />
          ))}
        </div>
      </div>
    </div>
  );
}
