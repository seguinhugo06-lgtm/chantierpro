import { forwardRef } from 'react';

/**
 * Card - Consistent card component with variants
 */
const Card = forwardRef(({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  selected = false,
  onClick,
  isDark = false,
  couleur = '#f97316',
  className = '',
  as: Component = 'div',
  ...props
}, ref) => {
  // Padding classes
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6'
  };

  // Base classes
  const baseClasses = `
    rounded-xl sm:rounded-2xl
    border
    transition-all duration-200
  `.trim().replace(/\s+/g, ' ');

  // Theme classes
  const getThemeClasses = () => {
    if (selected) {
      return isDark
        ? 'bg-slate-700 border-2'
        : 'bg-white border-2';
    }
    switch (variant) {
      case 'elevated':
        return isDark
          ? 'bg-slate-800 border-slate-700 shadow-lg'
          : 'bg-white border-slate-200 shadow-lg';
      case 'outlined':
        return isDark
          ? 'bg-transparent border-slate-600'
          : 'bg-transparent border-slate-300';
      case 'filled':
        return isDark
          ? 'bg-slate-700 border-slate-600'
          : 'bg-slate-50 border-slate-200';
      case 'gradient':
        return isDark
          ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
          : 'bg-gradient-to-br from-white to-slate-50 border-slate-200';
      default:
        return isDark
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200';
    }
  };

  // Hover classes
  const hoverClasses = hover || onClick
    ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.99]'
    : '';

  // Selected style
  const selectedStyle = selected ? { borderColor: couleur, backgroundColor: `${couleur}10` } : {};

  const combinedClasses = `
    ${baseClasses}
    ${paddingClasses[padding]}
    ${getThemeClasses()}
    ${hoverClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <Component
      ref={ref}
      className={combinedClasses}
      style={selectedStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); } : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

export default Card;

/**
 * CardHeader - Consistent card header
 */
export function CardHeader({
  children,
  title,
  subtitle,
  action,
  isDark = false,
  className = ''
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  if (children) {
    return <div className={`mb-4 ${className}`}>{children}</div>;
  }

  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="flex-1 min-w-0">
        {title && <h3 className={`font-semibold ${textPrimary}`}>{title}</h3>}
        {subtitle && <p className={`text-sm ${textMuted}`}>{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * CardContent - Consistent card content area
 */
export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

/**
 * CardFooter - Consistent card footer
 */
export function CardFooter({
  children,
  isDark = false,
  className = ''
}) {
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const bgColor = isDark ? 'bg-slate-900/50' : 'bg-slate-50';

  return (
    <div className={`mt-4 pt-4 border-t ${borderColor} ${bgColor} -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 px-4 py-3 sm:px-5 rounded-b-xl sm:rounded-b-2xl ${className}`}>
      {children}
    </div>
  );
}

/**
 * StatCard - Card for displaying statistics
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = '#f97316',
  isDark = false,
  className = ''
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : textMuted;
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '';

  return (
    <Card isDark={isDark} className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${textMuted}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${textPrimary}`} style={{ color }}>
            {value}
          </p>
          {(trend !== undefined || trendLabel) && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trendColor}`}>
              {trendIcon && <span>{trendIcon}</span>}
              {trend !== undefined && <span>{Math.abs(trend)}%</span>}
              {trendLabel && <span className={textMuted}>{trendLabel}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={24} style={{ color }} />
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * SelectableCard - Card for selection grids
 */
export function SelectableCard({
  children,
  selected = false,
  disabled = false,
  onClick,
  isDark = false,
  couleur = '#f97316',
  className = ''
}) {
  const baseClasses = `
    p-4 rounded-xl border-2
    transition-all duration-200
    text-left
    ${disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
    }
  `.trim().replace(/\s+/g, ' ');

  const themeClasses = selected
    ? ''
    : isDark
      ? 'border-slate-700 hover:border-slate-600'
      : 'border-slate-200 hover:border-slate-300';

  const selectedStyle = selected
    ? {
        borderColor: couleur,
        backgroundColor: `${couleur}10`,
        boxShadow: `0 0 0 3px ${couleur}30`
      }
    : {};

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClasses} ${themeClasses} ${className}`}
      style={selectedStyle}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}
