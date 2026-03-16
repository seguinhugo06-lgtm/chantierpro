/**
 * KPICard Component
 * Key Performance Indicator cards for dashboard with attractive design
 *
 * Features:
 * - Gradient accents and modern styling
 * - Mini charts and visual indicators
 * - Animated interactions
 * - Progress rings and sparklines
 * - Dark mode support
 * - Optional period selector
 *
 * @module KPICard
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowRight,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '../../lib/utils';

// ============ PERIOD SELECTOR FOR CARD ============

const PERIOD_OPTIONS = [
  { key: 'month', label: 'Mois', icon: Calendar },
  { key: 'year', label: 'Année', icon: CalendarDays },
  { key: '5years', label: '5 ans', icon: CalendarRange },
];

function CardPeriodSelector({ value, onChange, isDark }) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg p-0.5',
        isDark ? 'bg-slate-700/50' : 'bg-gray-100'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {PERIOD_OPTIONS.map((period) => {
        const isSelected = value === period.key;
        return (
          <button
            key={period.key}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(period.key);
            }}
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-200',
              isSelected
                ? isDark
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}

// ============ COLOR SYSTEM ============

const colorConfig = {
  green: {
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    iconColor: 'text-white',
    lightBg: 'from-emerald-50 to-emerald-100/50',
    darkBg: 'from-emerald-900/20 to-emerald-800/10',
    accent: '#10b981',
    accentLight: '#d1fae5',
    accentDark: '#065f46',
  },
  blue: {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    iconColor: 'text-white',
    lightBg: 'from-blue-50 to-blue-100/50',
    darkBg: 'from-blue-900/20 to-blue-800/10',
    accent: '#3b82f6',
    accentLight: '#dbeafe',
    accentDark: '#1e40af',
  },
  orange: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    iconColor: 'text-white',
    lightBg: 'from-amber-50 to-amber-100/50',
    darkBg: 'from-amber-900/20 to-amber-800/10',
    accent: '#f59e0b',
    accentLight: '#fef3c7',
    accentDark: '#92400e',
  },
  red: {
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    iconBg: 'bg-gradient-to-br from-red-400 to-red-600',
    iconColor: 'text-white',
    lightBg: 'from-red-50 to-red-100/50',
    darkBg: 'from-red-900/20 to-red-800/10',
    accent: '#ef4444',
    accentLight: '#fee2e2',
    accentDark: '#991b1b',
  },
  purple: {
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
    iconColor: 'text-white',
    lightBg: 'from-purple-50 to-purple-100/50',
    darkBg: 'from-purple-900/20 to-purple-800/10',
    accent: '#8b5cf6',
    accentLight: '#ede9fe',
    accentDark: '#5b21b6',
  },
  cyan: {
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    iconColor: 'text-white',
    lightBg: 'from-cyan-50 to-cyan-100/50',
    darkBg: 'from-cyan-900/20 to-cyan-800/10',
    accent: '#06b6d4',
    accentLight: '#cffafe',
    accentDark: '#155e75',
  },
};

// ============ MINI SPARKLINE ============

function MiniSparkline({ data, color, isDark, size = 'small' }) {
  if (!data || data.length < 2) return null;

  // Différentes tailles selon le contexte
  const sizeClasses = {
    small: 'w-20 h-10',
    medium: 'w-32 h-12',  // Plus large pour mieux utiliser l'espace
    large: 'w-full h-16',
  };

  return (
    <div className={sizeClasses[size] || sizeClasses.small}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={size === 'large' ? 2.5 : 2}
            fill={`url(#sparkGrad-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ PROGRESS RING ============

function ProgressRing({ value, max, color, size = 56, strokeWidth = 5, isDark, showValue = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? '#334155' : '#e5e7eb'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'text-xs font-bold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ============ MINI DONUT ============

function MiniDonut({ data, size = 48, thickness = 6, tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!data || data.every(d => d.value === 0)) return null;

  const innerRadius = (size / 2) - thickness;
  const outerRadius = size / 2;

  // Calculate percentage
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const firstValue = data[0]?.value || 0;
  const percentage = total > 0 ? Math.round((firstValue / total) * 100) : 0;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center percentage */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
          {percentage}%
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div
          role="tooltip"
          className="
            absolute z-50 right-full mr-2 top-1/2 -translate-y-1/2
            px-3 py-2 text-xs font-medium
            text-white bg-gray-900 dark:bg-gray-700
            rounded-lg shadow-lg whitespace-nowrap
            animate-fade-in
          "
        >
          {tooltip}
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-700" />
        </div>
      )}
    </div>
  );
}

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

function TrendBadge({ value, label, inverted = false, isDark = false, size = 'default' }) {
  if (value === null || value === undefined || !isFinite(value) || Math.abs(value) > 999) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold',
          size === 'large' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs',
          isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'
        )}>
          <Minus className={size === 'large' ? 'w-4 h-4' : 'w-3 h-3'} />
          —
        </span>
      </div>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isFlat = value === 0;
  const isGood = inverted ? isNegative : isPositive;

  const getConfig = () => {
    if (isFlat) {
      return {
        icon: Minus,
        bg: isDark ? 'bg-gray-700/50' : 'bg-gray-100',
        text: isDark ? 'text-gray-400' : 'text-gray-600'
      };
    }
    if (isGood) {
      return {
        icon: TrendingUp,
        bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700'
      };
    }
    return {
      icon: TrendingDown,
      bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      text: isDark ? 'text-red-400' : 'text-red-700'
    };
  };

  const config = getConfig();
  const Icon = config.icon;
  const displayValue = Math.abs(Math.round(value));
  const sign = isPositive ? '+' : isNegative ? '-' : '';

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold',
          size === 'large' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs',
          config.bg,
          config.text
        )}
      >
        <Icon className={size === 'large' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {sign}{displayValue}%
      </span>
      {label && (
        <span className={cn(
          'text-[10px]',
          isDark ? 'text-gray-500' : 'text-gray-400'
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

// ============ DETAIL ITEMS ============

function DetailItem({ icon: Icon, label, value, highlight, isDark, onClick, subLabel, badge }) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full",
        onClick && [
          "py-1.5 px-2 -mx-2 rounded-lg transition-colors",
          isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-100",
          "cursor-pointer group"
        ]
      )}
    >
      {Icon && (
        <Icon size={12} className={cn(
          isDark ? 'text-gray-500' : 'text-gray-400',
          onClick && 'group-hover:text-blue-500 transition-colors'
        )} />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <span className={cn(
          'text-xs truncate',
          isDark ? 'text-gray-500' : 'text-gray-500'
        )}>
          {label}
        </span>
        {subLabel && (
          <span className={cn(
            'text-[10px] truncate',
            isDark ? 'text-gray-600' : 'text-gray-400'
          )}>
            {subLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
        {badge && (
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-semibold",
            badge.type === 'warning' && (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'),
            badge.type === 'success' && (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'),
            badge.type === 'info' && (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'),
            badge.type === 'danger' && (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'),
            badge.type === 'highlight' && 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
          )}>
            {badge.label}
          </span>
        )}
        <span className={cn(
          'text-xs font-semibold',
          highlight
            ? isDark ? 'text-amber-400' : 'text-amber-600'
            : isDark ? 'text-gray-300' : 'text-gray-700'
        )}>
          {value}
        </span>
        {onClick && (
          <ChevronRight size={12} className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )} />
        )}
      </div>
    </Wrapper>
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
      sparklineData,
      donutData,
      donutTooltip, // Tooltip text for donut chart
      progressRing,
      tooltip,
      onClick,
      footerLabel = 'Voir détails',
      invertTrend = false,
      isDark = false,
      className,
      alert,
      subValue,
      details, // Array of {icon, label, value, highlight, onClick, subLabel, badge}
      // Period selector props
      showPeriodSelector = false,
      period = 'month',
      onPeriodChange,
      ...props
    },
    ref
  ) => {
    const colors = colorConfig[color] || colorConfig.blue;
    const isClickable = !!onClick;
    const hasAlert = !!alert || (comparison && typeof comparison === 'string' && comparison.includes('⚠️'));

    // Parse trend value
    const trendValue = typeof trend === 'number' ? trend : trend?.value ?? null;

    return (
      <button
        ref={ref}
        onClick={onClick}
        type="button"
        disabled={!isClickable}
        className={cn(
          // Base styles - IMPORTANT: h-full and flex for equal heights
          'group relative w-full h-full rounded-2xl overflow-hidden text-left',
          'flex flex-col',
          'border transition-all duration-300 ease-out',
          // Background with subtle gradient
          isDark
            ? `bg-gradient-to-br ${colors.darkBg} border-slate-700/80`
            : `bg-gradient-to-br ${colors.lightBg} border-gray-200/80`,
          // Shadow
          'shadow-sm',
          // Hover states
          isClickable && [
            'cursor-pointer',
            isDark
              ? 'hover:shadow-xl hover:shadow-slate-900/30 hover:border-slate-600 hover:scale-[1.02]'
              : 'hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300 hover:scale-[1.02]',
            'active:scale-[0.99]',
          ],
          !isClickable && 'cursor-default',
          className
        )}
        {...props}
      >
        {/* Top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: colors.gradient }}
        />

        {/* Period selector with sparkline underneath - positioned in top right area */}
        {showPeriodSelector && onPeriodChange && (
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
            <CardPeriodSelector
              value={period}
              onChange={onPeriodChange}
              isDark={isDark}
            />
            {/* Sparkline under period selector */}
            {sparklineData && (
              <div className="w-36 h-12 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id={`sparkGradPeriod-${colors.accent}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.accent} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors.accent} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={colors.accent}
                      strokeWidth={2}
                      fill={`url(#sparkGradPeriod-${colors.accent})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Alert indicator pulse */}
        {hasAlert && !showPeriodSelector && (
          <div className="absolute top-3 right-3 z-10">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          </div>
        )}

        {/* Content - flex-1 to push footer to bottom */}
        <div className="p-5 pt-6 flex-1">
          {/* Header: Icon + Label */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              {/* Icon with gradient background */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-xl shadow-lg',
                  'transition-transform duration-300 group-hover:scale-110',
                  colors.iconBg
                )}
              >
                {Icon && <Icon size={22} className={colors.iconColor} />}
              </div>

              {/* Label */}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {label}
                  </span>
                  {tooltip && (
                    <Tooltip content={tooltip}>
                      <HelpCircle
                        size={13}
                        className={cn(
                          'transition-colors cursor-help',
                          isDark ? 'text-gray-600 hover:text-gray-500' : 'text-gray-300 hover:text-gray-400'
                        )}
                      />
                    </Tooltip>
                  )}
                </div>
                {subValue && (
                  <p className={cn(
                    'text-[11px] mt-0.5',
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    {subValue}
                  </p>
                )}
              </div>
            </div>

            {/* Visual element: Sparkline (only if no period selector), Donut, or Progress Ring */}
            {sparklineData && !showPeriodSelector && (
              <MiniSparkline data={sparklineData} color={colors.accent} isDark={isDark} size="small" />
            )}
            {donutData && (
              <MiniDonut data={donutData} size={48} thickness={6} tooltip={donutTooltip} />
            )}
            {progressRing && (
              <ProgressRing
                value={progressRing.value}
                max={progressRing.max}
                color={colors.accent}
                size={52}
                strokeWidth={5}
                isDark={isDark}
              />
            )}
          </div>

          {/* Value + Trend */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <p className={cn(
                'text-3xl sm:text-4xl font-bold leading-none tracking-tight',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                {value}
              </p>

              {/* Comparison text */}
              {comparison && typeof comparison === 'string' && (
                <p className={cn(
                  'text-sm mt-2 flex items-center gap-1.5',
                  hasAlert
                    ? isDark ? 'text-amber-400' : 'text-amber-600'
                    : isDark ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {hasAlert && <AlertTriangle size={14} />}
                  {comparison.replace('⚠️ ', '')}
                </p>
              )}

              {/* Progress bar (if object) */}
              {progress && typeof progress === 'object' && progress.current !== undefined && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex-1 h-2 rounded-full overflow-hidden',
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    )}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((progress.current / progress.target) * 100, 100)}%`,
                          background: colors.gradient,
                        }}
                      />
                    </div>
                    <span className={cn(
                      'text-xs font-semibold tabular-nums',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      {Math.round((progress.current / progress.target) * 100)}%
                    </span>
                  </div>
                  {progress.label && (
                    <p className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-500')}>
                      {progress.label}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Trend Badge */}
            {trendValue !== null && (
              <TrendBadge
                value={trendValue}
                label={trendLabel || trend?.label}
                inverted={invertTrend}
                isDark={isDark}
                size="large"
              />
            )}
          </div>

          {/* Additional Details */}
          {details && details.length > 0 && (
            <div className={cn(
              'mt-4 pt-4 border-t space-y-2',
              isDark ? 'border-slate-700/50' : 'border-gray-200/50'
            )}>
              {details.map((detail, idx) => (
                <DetailItem
                  key={idx}
                  icon={detail.icon}
                  label={detail.label}
                  value={detail.value}
                  highlight={detail.highlight}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - mt-auto to stick to bottom */}
        {isClickable && (
          <div className={cn(
            'mt-auto px-5 py-3.5 border-t flex items-center justify-between',
            isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-gray-100 bg-white/50'
          )}>
            <span className={cn(
              'text-sm font-medium transition-colors',
              isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
            )}>
              {footerLabel}
            </span>
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'transition-all duration-300',
                isDark
                  ? 'bg-slate-700/50 group-hover:bg-slate-600'
                  : 'bg-gray-100 group-hover:bg-gray-200'
              )}
            >
              <ArrowRight
                size={16}
                className={cn(
                  'transition-all duration-300 group-hover:translate-x-0.5',
                  isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-700'
                )}
              />
            </div>
          </div>
        )}
      </button>
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
        'rounded-2xl overflow-hidden border shadow-sm',
        isDark
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-gray-200/80'
      )}
    >
      <div className={cn('h-1.5', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      <div className="p-5 pt-6 animate-pulse">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
            <div className={cn('w-24 h-4 rounded-md', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
          </div>
          <div className={cn('w-16 h-10 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        </div>
        <div className={cn('w-40 h-10 rounded-lg mb-2', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        <div className={cn('w-32 h-4 rounded', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
      </div>
      <div className={cn(
        'px-5 py-3.5 border-t flex items-center justify-between',
        isDark ? 'border-slate-700/50' : 'border-gray-100'
      )}>
        <div className={cn('w-24 h-4 rounded', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        <div className={cn('w-8 h-8 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
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
  isDark = false,
  className,
}) {
  const colors = colorConfig[color] || colorConfig.blue;
  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'relative flex items-center gap-3 p-4 rounded-xl text-left w-full',
        'border transition-all duration-200',
        isDark
          ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
          : 'bg-white border-gray-200 hover:border-gray-300',
        'shadow-sm',
        isClickable && [
          'cursor-pointer',
          'hover:shadow-md hover:scale-[1.02] active:scale-[0.99]',
        ],
        !isClickable && 'cursor-default',
        className
      )}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ background: colors.gradient }}
      />

      {Icon && (
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0',
          colors.iconBg
        )}>
          <Icon size={20} className={colors.iconColor} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className={cn(
            'text-xs font-semibold uppercase tracking-wide truncate',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}>
            {label}
          </p>
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle size={12} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
            </Tooltip>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={cn(
            'text-xl font-bold leading-none',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {value}
          </p>
          {trend !== undefined && isFinite(trend) && Math.abs(trend) <= 9999 && (
            <span
              className={cn(
                'text-sm font-medium flex items-center gap-0.5',
                trend > 0 && (isDark ? 'text-emerald-400' : 'text-emerald-600'),
                trend < 0 && (isDark ? 'text-red-400' : 'text-red-600'),
                trend === 0 && 'text-gray-500'
              )}
            >
              {trend > 0 ? <ArrowUpRight size={14} /> : trend < 0 ? <ArrowDownRight size={14} /> : null}
              {trend > 0 ? '+' : ''}{Math.round(trend)}%
            </span>
          )}
        </div>
      </div>
      {isClickable && (
        <ChevronRight
          size={18}
          className={cn(
            'flex-shrink-0 transition-transform',
            isDark ? 'text-gray-600' : 'text-gray-300',
            'group-hover:translate-x-0.5'
          )}
        />
      )}
    </button>
  );
}
