import * as React from 'react';
import { cn } from '../../lib/utils';

// WCAG AA compliant variant styles
const variantStyles = {
  default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600',
  secondary: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600',
  success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  warning: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  primary: 'bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800',
};

// WCAG AA compliant dot colors
const dotColors = {
  default: 'bg-gray-600',
  secondary: 'bg-gray-500',
  success: 'bg-green-600',
  warning: 'bg-orange-600',
  danger: 'bg-red-600',
  info: 'bg-blue-600',
  primary: 'bg-primary-600',
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
