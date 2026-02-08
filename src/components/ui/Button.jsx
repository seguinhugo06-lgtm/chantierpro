import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary:
    'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 focus-visible:ring-primary-500/50',
  secondary:
    'bg-slate-700 text-white font-medium hover:bg-slate-600 border border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600',
  outline:
    'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-500/50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-400 font-medium hover:text-white hover:bg-slate-800 focus-visible:ring-gray-500/50 dark:text-gray-300 dark:hover:bg-slate-800',
  danger:
    'bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 border border-red-500/30 focus-visible:ring-danger-500/50',
  success:
    'bg-green-500/20 text-green-400 font-medium hover:bg-green-500/30 border border-green-500/30 focus-visible:ring-green-500/50',
};

const sizeStyles = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
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
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
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
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
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
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-lg transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
          variantStyles[variant],
          iconButtonSizes[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
