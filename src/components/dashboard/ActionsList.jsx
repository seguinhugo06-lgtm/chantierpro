import { AlertTriangle, AlertCircle, Clock, FileText, Receipt, Users, ChevronRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';

/**
 * Priority configurations
 */
const priorityConfigs = {
  critical: {
    icon: AlertTriangle,
    bgLight: 'bg-danger-50',
    bgDark: 'bg-danger-900/20',
    borderLight: 'border-danger-200',
    borderDark: 'border-danger-800',
    textLight: 'text-danger-700',
    textDark: 'text-danger-400',
    iconColor: 'text-danger-500',
    label: 'Urgent',
  },
  high: {
    icon: AlertCircle,
    bgLight: 'bg-warning-50',
    bgDark: 'bg-warning-900/20',
    borderLight: 'border-warning-200',
    borderDark: 'border-warning-800',
    textLight: 'text-warning-700',
    textDark: 'text-warning-400',
    iconColor: 'text-warning-500',
    label: 'Important',
  },
  medium: {
    icon: Clock,
    bgLight: 'bg-primary-50',
    bgDark: 'bg-primary-900/20',
    borderLight: 'border-primary-200',
    borderDark: 'border-primary-800',
    textLight: 'text-primary-700',
    textDark: 'text-primary-400',
    iconColor: 'text-primary-500',
    label: 'A faire',
  },
  low: {
    icon: Clock,
    bgLight: 'bg-slate-50',
    bgDark: 'bg-slate-800',
    borderLight: 'border-slate-200',
    borderDark: 'border-slate-700',
    textLight: 'text-slate-600',
    textDark: 'text-slate-400',
    iconColor: 'text-slate-400',
    label: 'Optionnel',
  },
};

/**
 * Type icons
 */
const typeIcons = {
  devis: FileText,
  facture: Receipt,
  client: Users,
  default: Clock,
};

/**
 * ActionItem - Single action item
 */
function ActionItem({
  action,
  onClick,
  onComplete,
  isDark = false,
  couleur = '#f97316',
}) {
  const priority = priorityConfigs[action.priority] || priorityConfigs.medium;
  const PriorityIcon = priority.icon;
  const TypeIcon = typeIcons[action.type] || typeIcons.default;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-xl border transition-all',
        isDark ? priority.bgDark : priority.bgLight,
        isDark ? priority.borderDark : priority.borderLight,
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Type icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        isDark ? 'bg-slate-800' : 'bg-white'
      )}>
        <TypeIcon size={18} className={priority.iconColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={cn(
            'font-medium text-sm',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            {action.title}
          </p>
          {action.priority === 'critical' && (
            <PriorityIcon size={14} className={priority.iconColor} />
          )}
        </div>

        {action.description && (
          <p className={cn(
            'text-sm mt-0.5',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}>
            {action.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-2">
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isDark ? priority.textDark : priority.textLight,
            isDark ? 'bg-slate-800' : 'bg-white'
          )}>
            {priority.label}
          </span>

          {action.dueDate && (
            <span className={cn(
              'text-xs flex items-center gap-1',
              isDark ? 'text-slate-500' : 'text-slate-500'
            )}>
              <Clock size={12} />
              {action.dueDate}
            </span>
          )}

          {action.amount && (
            <span className={cn(
              'text-xs font-medium',
              isDark ? 'text-slate-400' : 'text-slate-600'
            )}>
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
              }).format(action.amount)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onComplete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(action);
            }}
            className={cn(
              'p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100',
              isDark ? 'hover:bg-slate-700' : 'hover:bg-white'
            )}
            aria-label="Marquer comme fait"
          >
            <Check size={16} className="text-success-500" />
          </button>
        )}

        {onClick && (
          <ChevronRight
            size={18}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )}
          />
        )}
      </div>
    </div>
  );
}

/**
 * ActionsList - List of required actions
 *
 * @param {Array} actions - Array of action objects
 * @param {Function} onActionClick - Handler when action is clicked
 * @param {Function} onActionComplete - Handler when action is marked complete
 * @param {number} maxItems - Maximum items to show
 * @param {boolean} showViewAll - Show "view all" button
 * @param {Function} onViewAll - Handler for "view all" click
 * @param {boolean} isDark - Dark mode
 * @param {string} couleur - Brand color
 */
export default function ActionsList({
  actions = [],
  onActionClick,
  onActionComplete,
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  isDark = false,
  couleur = '#f97316',
  className = '',
}) {
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedActions = [...actions].sort((a, b) =>
    (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
  );

  const displayedActions = sortedActions.slice(0, maxItems);
  const remainingCount = actions.length - maxItems;

  if (actions.length === 0) {
    return (
      <div className={cn(
        'text-center py-8 px-4',
        className
      )}>
        <div className={cn(
          'w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center',
          isDark ? 'bg-success-900/30' : 'bg-success-100'
        )}>
          <Check size={24} className="text-success-500" />
        </div>
        <p className={cn(
          'font-medium',
          isDark ? 'text-white' : 'text-slate-900'
        )}>
          Tout est a jour !
        </p>
        <p className={cn(
          'text-sm mt-1',
          isDark ? 'text-slate-400' : 'text-slate-500'
        )}>
          Aucune action en attente
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayedActions.map((action, index) => (
        <ActionItem
          key={action.id || index}
          action={action}
          onClick={onActionClick ? () => onActionClick(action) : undefined}
          onComplete={onActionComplete}
          isDark={isDark}
          couleur={couleur}
        />
      ))}

      {showViewAll && remainingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          isDark={isDark}
          onClick={onViewAll}
          rightIcon={<ChevronRight size={16} />}
        >
          Voir {remainingCount} autre{remainingCount > 1 ? 's' : ''} action{remainingCount > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}

/**
 * ActionsListSkeleton - Loading skeleton
 */
export function ActionsListSkeleton({ count = 3, isDark = false }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'p-3 rounded-xl animate-pulse',
            isDark ? 'bg-slate-800' : 'bg-slate-100'
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg',
              isDark ? 'bg-slate-700' : 'bg-slate-200'
            )} />
            <div className="flex-1 space-y-2">
              <div className={cn(
                'h-4 rounded w-3/4',
                isDark ? 'bg-slate-700' : 'bg-slate-200'
              )} />
              <div className={cn(
                'h-3 rounded w-1/2',
                isDark ? 'bg-slate-700' : 'bg-slate-200'
              )} />
              <div className="flex gap-2">
                <div className={cn(
                  'h-5 rounded w-16',
                  isDark ? 'bg-slate-700' : 'bg-slate-200'
                )} />
                <div className={cn(
                  'h-5 rounded w-20',
                  isDark ? 'bg-slate-700' : 'bg-slate-200'
                )} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
