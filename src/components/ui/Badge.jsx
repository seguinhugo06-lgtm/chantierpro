import * as React from 'react';
import { cn } from '../../lib/utils';

const variantStyles = {
  default: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600',
  success: 'bg-success-50 text-success-700 border-success-100 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800',
  warning: 'bg-warning-50 text-warning-700 border-warning-100 dark:bg-warning-900/30 dark:text-warning-400 dark:border-warning-800',
  danger: 'bg-danger-50 text-danger-700 border-danger-100 dark:bg-danger-900/30 dark:text-danger-400 dark:border-danger-800',
  info: 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800',
};

const dotColors = {
  default: 'bg-gray-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-primary-500',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = React.forwardRef(
  (
    {
      className,
      variant = 'default',
      size = 'sm',
      dot = false,
      pill = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium border',
          'transition-colors duration-150',
          variantStyles[variant],
          sizeStyles[size],
          pill ? 'rounded-full' : 'rounded-md',
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
