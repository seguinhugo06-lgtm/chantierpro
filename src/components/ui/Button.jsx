import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

// Jetons du thème (src/styles/theme.css) : l'accent est celui de l'entreprise, sombre et clair sont gérés par les jetons.
const variantStyles = {
  primary:
    'bg-accent text-sur-accent font-semibold hover:brightness-95 shadow-e1 focus-visible:ring-accent/50 active:scale-95 transition-all duration-200',
  secondary:
    'bg-surface-2 text-encre font-medium hover:bg-bord border border-bord focus-visible:ring-accent/50 active:scale-95 transition-all duration-200',
  outline:
    'border border-bord-fort bg-transparent text-encre-2 hover:bg-surface-2 active:bg-surface-2 focus-visible:ring-accent/50 active:scale-95 transition-all duration-200',
  ghost:
    'bg-transparent text-encre-2 font-medium hover:text-encre hover:bg-surface-2 focus-visible:ring-accent/50 active:scale-95 transition-all duration-200',
  danger:
    'bg-danger-fond text-danger-texte font-medium hover:brightness-95 border border-danger-point/40 focus-visible:ring-danger-point/50 active:scale-95 transition-all duration-200',
  success:
    'bg-succes-fond text-succes-texte font-medium hover:brightness-95 border border-succes-point/40 focus-visible:ring-succes-point/50 active:scale-95 transition-all duration-200',
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
