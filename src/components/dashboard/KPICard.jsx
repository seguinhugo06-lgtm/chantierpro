/**
 * KPICard Component
 * Key Performance Indicator cards for dashboard
 *
 * Design System:
 * - Consistent 16px padding, 12px border-radius
 * - Subtle shadows with smooth hover elevation
 * - Clean typography hierarchy
 * - Accessible color contrast
 *
 * @module KPICard
 */

import * as React from 'react';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ArrowRight, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// ============ COLOR SYSTEM (WCAG AA Compliant) ============

const colorConfig = {
  green: {
    iconBg: 'bg-gradient-to-br from-green-400 to-green-600',
    iconColor: 'text-white',
    accent: 'from-green-500 to-green-600',
  },
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    iconColor: 'text-white',
    accent: 'from-blue-500 to-blue-600',
  },
  orange: {
    iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    iconColor: 'text-white',
    accent: 'from-orange-500 to-orange-600',
  },
  red: {
    iconBg: 'bg-gradient-to-br from-red-400 to-red-600',
    iconColor: 'text-white',
    accent: 'from-red-500 to-red-600',
  },
  purple: {
    iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
    iconColor: 'text-white',
    accent: 'from-purple-500 to-purple-600',
  },
  indigo: {
    iconBg: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    iconColor: 'text-white',
    accent: 'from-indigo-500 to-indigo-600',
  },
  pink: {
    iconBg: 'bg-gradient-to-br from-pink-400 to-pink-600',
    iconColor: 'text-white',
    accent: 'from-pink-500 to-pink-600',
  },
  cyan: {
    iconBg: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    iconColor: 'text-white',
    accent: 'from-cyan-500 to-cyan-600',
  },
};

// ============ TOOLTIP ============

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
          className="
            absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2
            px-3 py-2 text-xs font-medium
            text-white bg-gray-900 dark:bg-gray-700
            rounded-lg shadow-lg whitespace-nowrap
            animate-fade-in
          "
        >
          {content}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
        </div>
      )}
    </div>
  );
}

// ============ TREND BADGE ============

function TrendBadge({ value, label, inverted = false }) {
  // Handle null/undefined - show neutral "—"
  if (value === null || value === undefined || !isFinite(value) || Math.abs(value) > 999) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <Minus className="w-4 h-4" />
          —
        </span>
        {label && <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>}
      </div>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isFlat = value === 0;

  // Determine visual treatment (WCAG AA compliant colors)
  const isGood = inverted ? isNegative : isPositive;

  const config = isFlat
    ? { icon: Minus, bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' }
    : isGood
    ? { icon: ArrowUpRight, bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' }
    : { icon: ArrowDownRight, bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' };

  const Icon = config.icon;
  const displayValue = Math.abs(Math.round(value));
  const sign = isPositive ? '+' : isNegative ? '-' : '';

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-sm font-medium',
          config.bg,
          config.text
        )}
      >
        <Icon className="w-4 h-4" />
        {sign}{displayValue}%
      </span>
      {label && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  );
}

// ============ PROGRESS BAR ============

function ProgressBar({ current, target, label }) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const actualPercentage = Math.round((current / target) * 100);

  // WCAG AA compliant gradient colors
  const getColor = () => {
    if (actualPercentage >= 80) return 'from-green-500 to-green-600';
    if (actualPercentage >= 50) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', getColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 tabular-nums">
          {actualPercentage}%
        </span>
      </div>
      {label && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {label}
        </p>
      )}
    </div>
  );
}

// ============ MAIN KPI CARD ============

const KPICard = React.forwardRef(
  (
    {
      icon: Icon,
      color = 'blue',
      label,
      value,
      trend,
      trendLabel,
      comparison,
      progress,
      tooltip,
      onClick,
      footerLabel = 'Voir détails',
      invertTrend = false,
      isDark = false,
      className,
      ...props
    },
    ref
  ) => {
    const colors = colorConfig[color] || colorConfig.blue;
    const isClickable = !!onClick;
    const comparisonData = comparison || progress;

    // Parse trend value
    const trendValue = typeof trend === 'number' ? trend : trend?.value || 0;
    const trendDirection = trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'flat';

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
        className={cn(
          // Base styles - Level 2 Elevation
          'group relative rounded-xl overflow-hidden',
          'bg-white dark:bg-slate-800',
          'border border-gray-200 dark:border-slate-700',
          'shadow-sm',
          // Transitions
          'transition-all duration-200 ease-out',
          // Hover states - Interactive elevation
          isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary-200 dark:hover:border-primary-700',
          className
        )}
        {...props}
      >
        {/* Top accent line */}
        <div className={cn('h-1 bg-gradient-to-r', colors.accent)} />

        {/* Content */}
        <div className="p-5">
          {/* Header: Icon + Label + Trend */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {/* Icon with gradient background */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-xl shadow-sm',
                  colors.iconBg
                )}
              >
                {Icon && <Icon size={22} className={colors.iconColor} />}
              </div>

              {/* Label + Tooltip */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {label}
                </span>
                {tooltip && (
                  <Tooltip content={tooltip}>
                    <button
                      type="button"
                      className="text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500 transition-colors"
                    >
                      <HelpCircle size={14} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Trend Badge */}
            {trend !== undefined && trend !== null && (
              <TrendBadge
                value={trendValue}
                label={trendLabel || trend?.label}
                inverted={invertTrend}
              />
            )}
          </div>

          {/* Value */}
          <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none mt-2">
            {value}
          </p>

          {/* Comparison text (if string) */}
          {typeof comparison === 'string' && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {comparison}
            </p>
          )}

          {/* Progress bar (if object) */}
          {comparisonData && typeof comparisonData === 'object' && comparisonData.current !== undefined && (
            <div className="mt-4">
              <ProgressBar
                current={comparisonData.current}
                target={comparisonData.target}
                label={comparisonData.label}
              />
            </div>
          )}
        </div>

        {/* Footer (if clickable) */}
        {isClickable && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
              {footerLabel}
              <ArrowRight size={14} />
            </span>
          </div>
        )}
      </div>
    );
  }
);

KPICard.displayName = 'KPICard';

export default KPICard;

// ============ SKELETON ============

export function KPICardSkeleton({ isDark = false }) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border shadow-sm',
        isDark
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-gray-200'
      )}
    >
      <div className={cn('h-1', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      <div className="p-5 animate-pulse">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
            <div className={cn('w-24 h-4 rounded-md', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
          </div>
          <div className={cn('w-14 h-6 rounded-full', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
        </div>
        <div className={cn('w-32 h-8 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
        <div className="mt-4 space-y-2">
          <div className={cn('h-1.5 rounded-full', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
          <div className={cn('w-24 h-3 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
        </div>
      </div>
    </div>
  );
}

// ============ MINI KPI CARD ============

export function MiniKPICard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  tooltip,
  onClick,
  className,
}) {
  const colors = colorConfig[color] || colorConfig.blue;
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        // Base styles - Level 2 Elevation
        'flex items-center gap-3 p-3.5 rounded-lg',
        'bg-white dark:bg-slate-800',
        'border border-gray-200 dark:border-slate-700',
        'shadow-sm',
        'transition-all duration-200',
        // Hover states
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary-200 dark:hover:border-primary-700',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {Icon && (
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shadow-sm', colors.iconBg)}>
          <Icon size={20} className={colors.iconColor} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide truncate">
            {label}
          </p>
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle size={12} className="text-gray-300 dark:text-gray-600" />
            </Tooltip>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</p>
          {trend !== undefined && isFinite(trend) && Math.abs(trend) <= 9999 && (
            <span
              className={cn(
                'text-sm font-medium flex items-center gap-0.5',
                trend > 0 && 'text-green-700 dark:text-emerald-400',
                trend < 0 && 'text-red-700 dark:text-red-400',
                trend === 0 && 'text-gray-500'
              )}
            >
              {trend > 0 ? '+' : ''}{Math.round(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
