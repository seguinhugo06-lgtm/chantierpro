import { forwardRef } from 'react';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

/**
 * Format value based on type
 */
function formatValue(value, format) {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `${value}%`;
    case 'number':
    default:
      return value.toLocaleString('fr-FR');
  }
}

/**
 * Color configurations for KPI cards
 */
const colorConfigs = {
  primary: {
    light: 'bg-primary-50 text-primary-600 border-primary-100',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  success: {
    light: 'bg-success-50 text-success-600 border-success-100',
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
  },
  warning: {
    light: 'bg-warning-50 text-warning-600 border-warning-100',
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
  },
  danger: {
    light: 'bg-danger-50 text-danger-600 border-danger-100',
    iconBg: 'bg-danger-100',
    iconColor: 'text-danger-600',
  },
  amber: {
    light: 'bg-amber-50 text-amber-600 border-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
};

/**
 * KPICard - Actionable KPI card for dashboards
 *
 * @param {string} title - KPI title
 * @param {number} value - Current value
 * @param {number} previousValue - Previous period value (for evolution)
 * @param {string} subValue - Optional subtext
 * @param {string} format - Value format: 'currency' | 'number' | 'percent'
 * @param {React.ComponentType} icon - Icon component
 * @param {string} color - Color theme: 'primary' | 'success' | 'warning' | 'danger' | 'amber'
 * @param {Function} onClick - Click handler to show details
 * @param {string} badge - Optional badge text
 * @param {boolean} urgent - Show urgent indicator
 * @param {boolean} isDark - Dark mode
 */
const KPICard = forwardRef(({
  title,
  value,
  previousValue,
  subValue,
  format = 'number',
  icon: Icon,
  color = 'primary',
  onClick,
  badge,
  urgent = false,
  isDark = false,
  className = '',
  ...props
}, ref) => {
  // Calculate evolution percentage
  const evolution = previousValue && previousValue !== 0
    ? ((value - previousValue) / Math.abs(previousValue) * 100).toFixed(1)
    : null;
  const isPositive = evolution && parseFloat(evolution) > 0;
  const isNegative = evolution && parseFloat(evolution) < 0;

  const colorConfig = colorConfigs[color] || colorConfigs.primary;

  return (
    <Card
      ref={ref}
      variant="interactive"
      padding="none"
      onClick={onClick}
      isDark={isDark}
      className={cn(
        'relative overflow-hidden group',
        urgent && 'ring-2 ring-danger-200',
        className
      )}
      {...props}
    >
      {/* Urgent indicator */}
      {urgent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-danger-500" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          {/* Icon */}
          <div className={cn(
            'p-2.5 rounded-xl',
            isDark ? 'bg-slate-700' : colorConfig.iconBg
          )}>
            {Icon && (
              <Icon
                size={20}
                className={isDark ? 'text-slate-300' : colorConfig.iconColor}
              />
            )}
          </div>

          {/* Badge or Evolution */}
          {badge ? (
            <span className="px-2 py-1 bg-success-100 text-success-700 text-xs font-medium rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-success-500 rounded-full" />
              {badge}
            </span>
          ) : evolution ? (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive && 'text-success-600',
              isNegative && 'text-danger-600',
              !isPositive && !isNegative && (isDark ? 'text-slate-400' : 'text-slate-500')
            )}>
              {isPositive && <TrendingUp size={16} />}
              {isNegative && <TrendingDown size={16} />}
              <span>{isPositive ? '+' : ''}{evolution}%</span>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="space-y-1">
          <p className={cn(
            'text-sm font-medium',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}>
            {title}
          </p>
          <p className={cn(
            'text-2xl font-bold',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            {formatValue(value, format)}
          </p>
          {subValue && (
            <p className={cn(
              'text-sm',
              isDark ? 'text-slate-500' : 'text-slate-500'
            )}>
              {subValue}
            </p>
          )}
        </div>
      </div>

      {/* Click indicator */}
      {onClick && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight
            size={18}
            className={isDark ? 'text-slate-500' : 'text-slate-400'}
          />
        </div>
      )}
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;

/**
 * KPICardSkeleton - Loading skeleton for KPI cards
 */
export function KPICardSkeleton({ isDark = false }) {
  return (
    <Card isDark={isDark} padding="none" className="animate-pulse">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            'w-10 h-10 rounded-xl',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )} />
          <div className={cn(
            'w-16 h-5 rounded',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )} />
        </div>
        <div className="space-y-2">
          <div className={cn(
            'w-24 h-4 rounded',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )} />
          <div className={cn(
            'w-32 h-8 rounded',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )} />
          <div className={cn(
            'w-28 h-4 rounded',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )} />
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
  format = 'number',
  icon: Icon,
  trend,
  isDark = false,
  className = '',
}) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl',
      isDark ? 'bg-slate-800' : 'bg-slate-50',
      className
    )}>
      {Icon && (
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          isDark ? 'bg-slate-700' : 'bg-white'
        )}>
          <Icon size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs truncate',
          isDark ? 'text-slate-400' : 'text-slate-500'
        )}>
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className={cn(
            'font-semibold',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            {formatValue(value, format)}
          </p>
          {trend !== undefined && (
            <span className={cn(
              'text-xs font-medium',
              isPositive && 'text-success-500',
              isNegative && 'text-danger-500',
              !isPositive && !isNegative && 'text-slate-400'
            )}>
              {isPositive ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
