import * as React from 'react';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ArrowRight, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

/**
 * @typedef {Object} Trend
 * @property {number} value - Trend percentage (e.g., 15 for +15%)
 * @property {'up' | 'down' | 'flat'} direction - Trend direction
 * @property {string} [label] - Optional label (e.g., "vs mois dernier")
 * @property {string} [period] - Optional period (e.g., "ce mois")
 */

/**
 * @typedef {Object} Comparison
 * @property {string} label - Label (e.g., "Objectif mensuel")
 * @property {number} current - Current value
 * @property {number} target - Target value
 */

/**
 * @typedef {Object} KPICardProps
 * @property {React.ReactNode} icon - Lucide icon component
 * @property {string} iconColor - Tailwind color class (e.g., 'green', 'blue', 'orange')
 * @property {string} label - KPI label (e.g., "Chiffre d'affaires")
 * @property {string | number} value - KPI value (e.g., "57 060 €")
 * @property {Trend} [trend] - Optional trend indicator
 * @property {Comparison} [comparison] - Optional comparison/progress bar
 * @property {Comparison} [progress] - Alias for comparison (backward compatibility)
 * @property {string} [tooltip] - Optional tooltip text
 * @property {() => void} [onClick] - Click handler
 * @property {string} [footerLabel] - Footer link label (e.g., "Voir détails")
 * @property {boolean} [invertTrend] - Invert trend colors (for negative metrics like late payments)
 * @property {string} [className] - Additional CSS classes
 */

// Icon color mappings for background and icon colors
const iconColorMap = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  orange: {
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: 'text-indigo-600 dark:text-indigo-400',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    icon: 'text-pink-600 dark:text-pink-400',
  },
  cyan: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: 'text-cyan-600 dark:text-cyan-400',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
  },
};

/**
 * Tooltip component - Simple accessible tooltip
 */
function Tooltip({ content, children }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children;

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          role="tooltip"
          className="absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap animate-fade-in"
        >
          {content}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
        </div>
      )}
    </div>
  );
}

/**
 * Trend badge component with support for inverted colors
 * @param {Object} props
 * @param {number} props.value - Trend value
 * @param {'up' | 'down' | 'flat'} props.direction - Trend direction
 * @param {string} [props.label] - Optional label
 * @param {string} [props.period] - Optional period
 * @param {boolean} [props.inverted] - Invert colors (up=bad, down=good)
 */
function TrendBadge({ value, direction, label, period, inverted = false }) {
  // Determine colors based on direction and inversion
  const getConfig = () => {
    if (direction === 'flat') {
      return {
        icon: Minus,
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
      };
    }

    // Normal: up = good (green), down = bad (red)
    // Inverted: up = bad (red), down = good (green)
    const isGood = inverted ? direction === 'down' : direction === 'up';

    return {
      icon: direction === 'up' ? ArrowUpRight : ArrowDownRight,
      bg: isGood
        ? 'bg-green-100 dark:bg-green-900/30'
        : 'bg-red-100 dark:bg-red-900/30',
      text: isGood
        ? 'text-green-700 dark:text-green-400'
        : 'text-red-700 dark:text-red-400',
    };
  };

  const config = getConfig();
  const Icon = config.icon;
  const sign = direction === 'up' ? '+' : direction === 'down' ? '-' : '';

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold',
          config.bg,
          config.text
        )}
        aria-label={`Tendance ${direction === 'up' ? 'en hausse' : direction === 'down' ? 'en baisse' : 'stable'} de ${Math.abs(value)} pourcent`}
      >
        <Icon className="w-3 h-3" aria-hidden="true" />
        {sign}{Math.abs(value)}%
      </span>
      {(label || period) && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {label || period}
        </span>
      )}
    </div>
  );
}

/**
 * Progress bar component for comparison display
 */
function ComparisonBar({ current, target, label }) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const actualPercentage = Math.round((current / target) * 100);

  // Determine color based on percentage
  const getProgressColor = () => {
    if (actualPercentage >= 100) {
      return 'bg-gradient-to-r from-green-500 to-green-400';
    } else if (actualPercentage >= 75) {
      return 'bg-gradient-to-r from-blue-500 to-blue-400';
    } else if (actualPercentage >= 50) {
      return 'bg-gradient-to-r from-orange-500 to-orange-400';
    }
    return 'bg-gradient-to-r from-red-500 to-red-400';
  };

  // Format number with space as thousand separator
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  return (
    <div className="space-y-2" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={target}>
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-3">
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getProgressColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {actualPercentage}%
        </span>
      </div>
      {label && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {label} : {formatNumber(target)} €
        </p>
      )}
    </div>
  );
}

/**
 * KPICard - Dashboard KPI display card with trends, tooltips, and comparisons
 *
 * @param {KPICardProps} props
 *
 * @example
 * <KPICard
 *   icon={<Euro />}
 *   iconColor="green"
 *   label="Chiffre d'affaires"
 *   value="57 060 €"
 *   trend={{
 *     value: 12,
 *     direction: 'up',
 *     label: 'vs mois dernier'
 *   }}
 *   comparison={{
 *     label: 'Objectif mensuel',
 *     current: 57060,
 *     target: 60000
 *   }}
 *   tooltip="CA facturé ce mois (hors TVA)"
 *   onClick={() => navigate('/analytics')}
 * />
 */
const KPICard = React.forwardRef(
  (
    {
      icon,
      iconColor = 'blue',
      label,
      value,
      trend,
      comparison,
      progress, // Backward compatibility alias
      tooltip,
      onClick,
      footerLabel = 'Voir détails',
      invertTrend = false,
      className,
      ...props
    },
    ref
  ) => {
    const colors = iconColorMap[iconColor] || iconColorMap.blue;
    const isClickable = !!onClick;

    // Use comparison or progress (backward compatibility)
    const comparisonData = comparison || progress;

    return (
      <Card
        ref={ref}
        hoverable={isClickable}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isClickable && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
          className
        )}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
        aria-label={isClickable ? `${label}: ${value}. Cliquer pour voir les détails.` : undefined}
        {...props}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            {/* Icon + Label + Tooltip */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg',
                  colors.bg
                )}
                aria-hidden="true"
              >
                {React.isValidElement(icon) &&
                  React.cloneElement(icon, {
                    className: cn('w-5 h-5', colors.icon),
                  })}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {label}
                </span>
                {tooltip && (
                  <Tooltip content={tooltip}>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Plus d'informations"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Trend Badge */}
            {trend && (
              <TrendBadge
                value={trend.value}
                direction={trend.direction}
                label={trend.label}
                period={trend.period}
                inverted={invertTrend}
              />
            )}
          </div>

          {/* Value */}
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>

          {/* Comparison/Progress Bar */}
          {comparisonData && (
            <div className="mt-4">
              <ComparisonBar
                current={comparisonData.current}
                target={comparisonData.target}
                label={comparisonData.label}
              />
            </div>
          )}
        </div>

        {/* Footer (optional, shown when clickable) */}
        {isClickable && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
              {footerLabel}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
        )}
      </Card>
    );
  }
);

KPICard.displayName = 'KPICard';

export default KPICard;

/**
 * KPICardSkeleton - Loading skeleton for KPI cards
 */
export function KPICardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="w-24 h-4 rounded bg-gray-200 dark:bg-slate-700" />
          </div>
          <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="mt-4">
          <div className="w-32 h-9 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700" />
          <div className="w-28 h-3 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
      </div>
    </Card>
  );
}

/**
 * MiniKPICard - Compact KPI card for tight spaces
 */
export function MiniKPICard({
  label,
  value,
  icon,
  iconColor = 'blue',
  trend,
  tooltip,
  onClick,
  className,
}) {
  const colors = iconColorMap[iconColor] || iconColorMap.blue;
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all duration-200',
        isClickable && 'cursor-pointer hover:scale-[1.02] hover:shadow-md',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {icon && (
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            colors.bg
          )}
          aria-hidden="true"
        >
          {React.isValidElement(icon) &&
            React.cloneElement(icon, {
              className: cn('w-5 h-5', colors.icon),
            })}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle className="w-3 h-3 text-gray-400" />
            </Tooltip>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
          {trend !== undefined && (
            <span
              className={cn(
                'text-xs font-medium',
                isPositive && 'text-green-600 dark:text-green-400',
                isNegative && 'text-red-600 dark:text-red-400',
                !isPositive && !isNegative && 'text-gray-500 dark:text-gray-400'
              )}
            >
              {isPositive ? '+' : ''}
              {trend}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
