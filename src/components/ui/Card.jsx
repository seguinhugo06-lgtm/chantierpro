/**
 * Card Component System
 * Flexible card components for consistent UI
 *
 * Design System:
 * - 16px border-radius (rounded-2xl)
 * - Consistent shadow system
 * - Clean border styling
 * - Smooth hover transitions
 *
 * @module Card
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============ CARD VARIANTS ============

const cardVariants = {
  default: 'bg-white border border-gray-100 shadow-sm dark:bg-slate-800 dark:border-slate-700/50',
  elevated: 'bg-white shadow-md dark:bg-slate-800',
  outlined: 'bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700',
  ghost: 'bg-transparent',
};

const cardPadding = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
};

// ============ CARD ROOT ============

export const Card = React.forwardRef(
  (
    {
      className,
      variant = 'default',
      padding = 'none',
      hoverable = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-200',
          cardVariants[variant],
          cardPadding[padding],
          hoverable && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// ============ CARD HEADER ============

export const CardHeader = React.forwardRef(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between p-5 sm:p-6 pb-0', className)}
        {...props}
      >
        {children || (
          <>
            <div className="space-y-1">
              {title && (
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0 ml-4">{action}</div>}
          </>
        )}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

// ============ CARD CONTENT ============

export const CardContent = React.forwardRef(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-5 sm:p-6', className)}
        {...props}
      />
    );
  }
);
CardContent.displayName = 'CardContent';

// ============ CARD FOOTER ============

export const CardFooter = React.forwardRef(
  ({ className, bordered = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center p-5 sm:p-6 pt-0',
          bordered && 'pt-5 sm:pt-6 mt-0 border-t border-gray-100 dark:border-slate-700/50',
          className
        )}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

// ============ CARD SKELETON ============

export function CardSkeleton({ className, rows = 3 }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div
                  className="h-4 rounded-md bg-gray-100 dark:bg-slate-700"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
                <div
                  className="h-3 rounded bg-gray-50 dark:bg-slate-800"
                  style={{ width: `${40 + Math.random() * 30}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ STAT CARD ============

export function StatCard({ label, value, subtext, trend, icon: Icon, className }) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    warning: 'text-amber-400',
    neutral: 'text-slate-400',
  };

  return (
    <Card className={cn('relative overflow-hidden p-6', className)}>
      {Icon && <Icon className="absolute right-4 top-4 w-8 h-8 text-slate-700" />}
      <p className="text-slate-400 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {subtext && (
        <p className={cn('text-sm mt-2', trendColors[trend] || 'text-slate-400')}>
          {subtext}
        </p>
      )}
    </Card>
  );
}

export default Card;
