import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button - Unified button component with variants
 *
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} loading - Shows spinner and disables button
 * @param {boolean} fullWidth - Makes button full width
 * @param {string} couleur - Brand color for primary variant
 * @param {boolean} isDark - Dark mode
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  couleur = '#f97316',
  isDark = false,
  className = '',
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}, ref) => {

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]'
  };

  // Base classes for all buttons
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-xl
    transition-all duration-200
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `.trim().replace(/\s+/g, ' ');

  // Variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'text-white shadow-md hover:shadow-lg';
      case 'secondary':
        return isDark
          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
      case 'ghost':
        return isDark
          ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
      case 'danger':
        return 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg';
      case 'success':
        return 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg';
      case 'outline':
        return isDark
          ? 'border-2 border-slate-600 text-slate-300 hover:bg-slate-700'
          : 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50';
      default:
        return '';
    }
  };

  // Get inline style for primary variant
  const getStyle = () => {
    if (variant === 'primary') {
      return {
        backgroundColor: couleur,
        '--tw-ring-color': couleur
      };
    }
    if (variant === 'outline' && couleur !== '#f97316') {
      return {
        borderColor: couleur,
        color: couleur,
        '--tw-ring-color': couleur
      };
    }
    return {};
  };

  const combinedClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${getVariantClasses()}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={combinedClasses}
      style={getStyle()}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

// Icon-only button variant
export const IconButton = forwardRef(({
  children,
  size = 'md',
  variant = 'ghost',
  'aria-label': ariaLabel,
  isDark = false,
  couleur = '#f97316',
  className = '',
  ...props
}, ref) => {

  const sizeClasses = {
    sm: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    md: 'w-10 h-10 min-w-[40px] min-h-[40px]',
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px]'
  };

  if (!ariaLabel) {
    console.warn('IconButton requires aria-label for accessibility');
  }

  return (
    <Button
      ref={ref}
      variant={variant}
      isDark={isDark}
      couleur={couleur}
      className={`${sizeClasses[size]} !p-0 ${className}`}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Button>
  );
});

IconButton.displayName = 'IconButton';
