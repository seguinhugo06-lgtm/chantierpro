import * as React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

/**
 * @typedef {Object} Trend
 * @property {number} value - Trend percentage (e.g., 15 for +15%)
 * @property {'up' | 'down' | 'flat'} direction - Trend direction
 * @property {string} [label] - Optional label (e.g., "vs mois dernier")
 */

/**
 * @typedef {Object} Progress
 * @property {number} current - Current value
 * @property {number} target - Target value
 * @property {string} [label] - Optional label (e.g., "Objectif mensuel")
 */

/**
 * @typedef {Object} KPICardProps
 * @property {React.ReactNode} icon - Lucide icon component
 * @property {string} iconColor - Tailwind color class (e.g., 'green', 'blue', 'orange')
 * @property {string} label - KPI label (e.g., "Chiffre d'affaires")
 * @property {string | number} value - KPI value (e.g., "57 060 €")
 * @property {Trend} [trend] - Optional trend indicator
 * @property {Progress} [progress] - Optional progress bar
 * @property {() => void} [onClick] - Click handler
 * @property {string} [footerLabel] - Footer link label (e.g., "Voir détails")
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

// Trend badge component
function TrendBadge({ value, direction, label }) {
  const trendConfig = {
    up: {
      icon: ArrowUpRight,
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    },
    down: {
      icon: ArrowDownRight,
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
    },
    flat: {
      icon: Minus,
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
    },
  };

  const config = trendConfig[direction];
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
      >
        <Icon className="w-3 h-3" />
        {sign}{Math.abs(value)}%
      </span>
      {label && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  );
}

// Progress bar component
function ProgressBar({ current, target, label }) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const actualPercentage = Math.round((current / target) * 100);

  // Determine color based on percentage
  const getProgressColor = () => {
    if (actualPercentage >= 100) {
      return 'bg-gradient-to-r from-green-500 to-green-400';
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
    <div className="space-y-2">
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
 * KPICard - Dashboard KPI display card
 *
 * @param {KPICardProps} props
 */
const KPICard = React.forwardRef(
  (
    {
      icon,
      iconColor = 'blue',
      label,
      value,
      trend,
      progress,
      onClick,
      footerLabel = 'Voir détails',
      className,
      ...props
    },
    ref
  ) => {
    const colors = iconColorMap[iconColor] || iconColorMap.blue;
    const isClickable = !!onClick;

    return (
      <Card
        ref={ref}
        hoverable={isClickable}
        className={cn(
          'overflow-hidden',
          isClickable && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            {/* Icon + Label */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg',
                  colors.bg
                )}
              >
                {React.isValidElement(icon) &&
                  React.cloneElement(icon, {
                    className: cn('w-5 h-5', colors.icon),
                  })}
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {label}
              </span>
            </div>

            {/* Trend Badge */}
            {trend && (
              <TrendBadge
                value={trend.value}
                direction={trend.direction}
                label={trend.label}
              />
            )}
          </div>

          {/* Value */}
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="mt-4">
              <ProgressBar
                current={progress.current}
                target={progress.target}
                label={progress.label}
              />
            </div>
          )}
        </div>

        {/* Footer (optional, shown when clickable) */}
        {isClickable && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
              {footerLabel}
              <ArrowRight className="w-4 h-4" />
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
  className,
}) {
  const colors = iconColorMap[iconColor] || iconColorMap.blue;
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            colors.bg
          )}
        >
          {React.isValidElement(icon) &&
            React.cloneElement(icon, {
              className: cn('w-5 h-5', colors.icon),
            })}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {label}
        </p>
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
