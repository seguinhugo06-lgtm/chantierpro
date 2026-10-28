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

// Jetons du thème : clair et sombre sont gérés par les variables (isDark reste accepté, plus nécessaire).
const cardVariants = {
  default: 'bg-surface border border-bord shadow-e1',
  elevated: 'bg-surface shadow-e2',
  outlined: 'bg-surface border border-bord',
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
      isDark: _isDark = false,
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
                <h3 className="text-base font-semibold">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-encre-3">
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
  ({ className, bordered = false, isDark: _isDark = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center p-5 sm:p-6 pt-0',
          bordered && 'pt-5 sm:pt-6 mt-0 border-t border-bord',
          className
        )}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

// ============ CARD SKELETON ============

export function CardSkeleton({ className, rows = 3, isDark: _isDark = false }) {
  const skeletonBg = 'bg-surface-2';
  const skeletonBgLight = 'bg-fond';
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl', skeletonBg)} aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <div
                  className={cn('h-4 rounded-md', skeletonBg)}
                  style={{ width: `${60 + Math.random() * 40}%` }}
                  aria-hidden="true"
                />
                <div
                  className={cn('h-3 rounded', skeletonBgLight)}
                  style={{ width: `${40 + Math.random() * 30}%` }}
                  aria-hidden="true"
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

export function StatCard({ label, value, subtext, trend, icon: Icon, className, isDark: _isDark = false }) {
  const trendColors = {
    up: 'text-succes-texte',
    down: 'text-danger-texte',
    warning: 'text-alerte-texte',
    neutral: 'text-encre-3',
  };

  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-3';
  const iconColor = 'text-bord-fort';

  return (
    <Card className={cn('relative overflow-hidden p-6', className)}>
      {Icon && <Icon className={cn('absolute right-4 top-4 w-8 h-8', iconColor)} aria-hidden="true" />}
      <p className={cn('text-sm font-medium', textSecondary)}>{label}</p>
      <p className={cn('text-3xl font-bold mt-1', textPrimary)}>{value}</p>
      {subtext && (
        <p className={cn('text-sm mt-2', trendColors[trend] || textSecondary)}>
          {subtext}
        </p>
      )}
    </Card>
  );
}

export default Card;
