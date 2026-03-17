import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary:
    'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 focus-visible:ring-primary-500/50 active:scale-95 transition-all duration-200',
  secondary:
    'bg-slate-700 text-white font-medium hover:bg-slate-600 border border-slate-600 active:scale-95 transition-all duration-200',
  outline:
    'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-500/50 active:scale-95 transition-all duration-200',
  ghost:
    'bg-transparent text-slate-400 font-medium hover:text-white hover:bg-slate-800 focus-visible:ring-gray-500/50 active:scale-95 transition-all duration-200',
  danger:
    'bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 border border-red-500/30 focus-visible:ring-danger-500/50 active:scale-95 transition-all duration-200',
  success:
    'bg-green-500/20 text-green-400 font-medium hover:bg-green-500/30 border border-green-500/30 focus-visible:ring-green-500/50 active:scale-95 transition-all duration-200',
};

const sizeStyles = {
  sm: 'min-h-[36px] sm:min-h-[32px] px-3 text-sm gap-1.5 rounded-md',
  md: 'min-h-[44px] sm:min-h-[40px] px-4 text-sm gap-2 rounded-lg',
  lg: 'min-h-[48px] sm:min-h-[48px] px-6 text-base gap-2.5 rounded-lg',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className={cn('animate-spin', iconSizes[size])} aria-hidden="true" />
        )}
        {!isLoading && leftIcon && (
          <span className={iconSizes[size]}>{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className={iconSizes[size]}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============ ICON BUTTON ============
const iconButtonSizes = {
  sm: 'min-h-[36px] min-w-[36px] sm:min-h-[32px] sm:min-w-[32px]',
  md: 'min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]',
  lg: 'min-h-[48px] min-w-[48px]',
};

export const IconButton = React.forwardRef(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-lg transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          variantStyles[variant],
          iconButtonSizes[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} aria-hidden="true" />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
