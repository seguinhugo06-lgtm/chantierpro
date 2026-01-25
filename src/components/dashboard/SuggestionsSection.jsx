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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import {
  generateSuggestions,
  getSuggestionConfig,
  dismissSuggestion,
} from '../../lib/suggestions';
import { Button } from '../ui/Button';

/**
 * @typedef {Object} SuggestionsSectionProps
 * @property {string} [userId] - User ID
 * @property {number} [maxDisplay] - Max suggestions to display (default: 3)
 * @property {string} [className] - Additional CSS classes
 */

// Icon mapping for suggestion types
const iconMap = {
  FileText,
  TrendingDown,
  Package,
  CloudRain,
  AlertCircle,
};

// Priority configurations
const priorityConfig = {
  high: {
    label: 'HAUTE PRIORITÉ',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    dotColor: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-400',
  },
  medium: {
    label: 'PRIORITÉ MOYENNE',
    borderColor: 'border-l-primary-500',
    bgColor: 'bg-primary-50 dark:bg-primary-900/20',
    dotColor: 'bg-primary-500',
    textColor: 'text-primary-700 dark:text-primary-400',
  },
  low: {
    label: 'PRIORITÉ BASSE',
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    dotColor: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
};

// Refresh interval (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * SuggestionCard - Individual suggestion card
 */
function SuggestionCard({
  suggestion,
  index,
  onAction,
  onDismiss,
  isActioning,
  isDismissing,
}) {
  const config = priorityConfig[suggestion.priority] || priorityConfig.medium;
  const suggestionConfig = getSuggestionConfig(suggestion.type);
  const IconComponent = iconMap[suggestionConfig.icon] || AlertCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, x: 0 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        exit: { duration: 0.2 },
      }}
      className={cn(
        'relative p-4 rounded-xl border-l-4 transition-all',
        config.borderColor,
        config.bgColor,
        'hover:shadow-md'
      )}
    >
      {/* Dismiss button */}
      {suggestion.dismissible && (
        <button
          type="button"
          onClick={() => onDismiss(suggestion.id)}
          disabled={isDismissing}
          className={cn(
            'absolute top-3 right-3 p-1.5 rounded-lg transition-colors',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-white/50 dark:hover:bg-black/20',
            isDismissing && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Ignorer"
        >
          {isDismissing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      )}

      <div className="flex items-start gap-3 pr-8">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${suggestionConfig.color}20` }}
        >
          <IconComponent
            className="w-5 h-5"
            style={{ color: suggestionConfig.color }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Priority label */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', config.textColor)}>
              {config.label}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {suggestion.title}
          </p>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {suggestion.description}
          </p>

          {/* Value if present */}
          {suggestion.value && (
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Valeur : {suggestion.value}
            </p>
          )}

          {/* Action button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction(suggestion)}
            disabled={isActioning}
            className="gap-1"
          >
            {isActioning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                {suggestion.action?.label || 'Voir'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * SuggestionSkeleton - Loading skeleton for suggestion card
 */
function SuggestionSkeleton({ index }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-xl border-l-4 border-l-gray-200 bg-gray-50 dark:bg-slate-800 dark:border-l-slate-700 animate-pulse"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-slate-700" />
            <div className="w-24 h-3 rounded bg-gray-200 dark:bg-slate-700" />
          </div>
          <div className="w-3/4 h-4 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="w-full h-3 rounded bg-gray-100 dark:bg-slate-800" />
          <div className="w-20 h-8 rounded bg-gray-200 dark:bg-slate-700 mt-2" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * EmptyState - No suggestions state
 */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center"
    >
      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
      </div>
      <p className="text-base font-medium text-green-900 dark:text-green-100">
        Aucune action requise
      </p>
      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
        Votre activité est bien gérée !
      </p>
    </motion.div>
  );
}

/**
 * SuggestionsSection - Dashboard section showing smart suggestions
 *
 * @param {SuggestionsSectionProps} props
 */
export default function SuggestionsSection({
  userId,
  maxDisplay = 3,
  className,
  setPage,
}) {
  const { showToast } = useToast();
  const data = useData();

  const [suggestions, setSuggestions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actioningId, setActioningId] = React.useState(null);
  const [dismissingId, setDismissingId] = React.useState(null);

  // Fetch suggestions
  const fetchSuggestions = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allSuggestions = await generateSuggestions(userId, {
        clients: data.clients || [],
        devis: data.devis || [],
        chantiers: data.chantiers || [],
        depenses: data.depenses || [],
        catalogue: data.catalogue || [],
        // weather: data.weather, // Would need to fetch from weather API
      });

      // Filter non-dismissed and limit
      const filtered = allSuggestions
        .filter(s => !s.dismissed)
        .slice(0, maxDisplay);

      setSuggestions(filtered);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [userId, data, maxDisplay]);

  // Initial fetch
  React.useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(fetchSuggestions, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  // Handle action click
  const handleAction = async (suggestion) => {
    setActioningId(suggestion.id);

    try {
      // Execute action
      if (suggestion.action?.route) {
        // Navigate to route - extract page name from route
        const route = suggestion.action.route;
        const pageName = route.replace(/^\//, '').split('/')[0] || 'dashboard';
        setPage?.(pageName);

        // Auto-dismiss after navigation if dismissible
        if (suggestion.dismissible) {
          await dismissSuggestion(suggestion.id);
          setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        }
      } else if (suggestion.action?.modalId) {
        // Would trigger modal - for now just show toast
        showToast(`Action: ${suggestion.action.modalId}`, 'info');
      }
    } catch (err) {
      console.error('Error executing action:', err);
      showToast('Erreur lors de l\'exécution', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Handle dismiss
  const handleDismiss = async (suggestionId) => {
    setDismissingId(suggestionId);

    try {
      await dismissSuggestion(suggestionId);

      // Remove from UI with animation
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      showToast('Suggestion ignorée', 'info');
    } catch (err) {
      console.error('Error dismissing suggestion:', err);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDismissingId(null);
    }
  };

  // Handle view all
  const handleViewAll = () => {
    // Suggestions are shown inline, no separate page needed
    console.log('View all suggestions');
  };

  // Total count for header
  const totalCount = suggestions.length;

  return (
    <div className={cn('mb-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Zap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {loading
              ? 'Chargement...'
              : totalCount > 0
              ? `${totalCount} action${totalCount > 1 ? 's' : ''} recommandée${totalCount > 1 ? 's' : ''}`
              : 'Suggestions'}
          </h2>
        </div>

        {!loading && !error && totalCount > 0 && (
          <button
            type="button"
            onClick={handleViewAll}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: Math.min(maxDisplay, 3) }).map((_, i) => (
            <SuggestionSkeleton key={i} index={i} />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSuggestions}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Réessayer
          </Button>
        </div>
      ) : totalCount === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                onAction={handleAction}
                onDismiss={handleDismiss}
                isActioning={actioningId === suggestion.id}
                isDismissing={dismissingId === suggestion.id}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

/**
 * SuggestionsSectionSkeleton - Full skeleton for the section
 */
export function SuggestionsSectionSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
        <div className="w-40 h-5 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <SuggestionSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
