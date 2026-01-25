/**
 * PageLoadingFallback
 * Skeleton loading UI for lazy-loaded pages
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * @typedef {Object} PageLoadingFallbackProps
 * @property {'dashboard' | 'list' | 'form' | 'minimal'} [variant] - Loading variant
 * @property {string} [className] - Additional CSS classes
 */

/**
 * Skeleton line component
 */
function SkeletonLine({ className, ...props }) {
  return (
    <div
      className={cn(
        'h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse',
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton box component
 */
function SkeletonBox({ className, ...props }) {
  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse',
        className
      )}
      {...props}
    />
  );
}

/**
 * Dashboard skeleton
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-64" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBox key={i} className="h-32" />
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

/**
 * List page skeleton
 */
function ListSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-8 w-40" />
        <SkeletonBox className="h-10 w-32" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <SkeletonBox className="h-10 w-48" />
        <SkeletonBox className="h-10 w-32" />
      </div>

      {/* List items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBox key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

/**
 * Form page skeleton
 */
function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-64" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonBox className="h-12 w-full" />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <SkeletonBox className="h-12 w-32" />
        <SkeletonBox className="h-12 w-24" />
      </div>
    </div>
  );
}

/**
 * Minimal spinner
 */
function MinimalSkeleton({ color = '#f97316' }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{
          borderColor: `${color}33`,
          borderTopColor: color,
        }}
      />
    </div>
  );
}

/**
 * PageLoadingFallback - Loading skeleton for lazy-loaded pages
 * @param {PageLoadingFallbackProps} props
 */
export default function PageLoadingFallback({
  variant = 'minimal',
  className,
  color,
}) {
  const variants = {
    dashboard: DashboardSkeleton,
    list: ListSkeleton,
    form: FormSkeleton,
    minimal: () => <MinimalSkeleton color={color} />,
  };

  const Component = variants[variant] || variants.minimal;

  return (
    <div className={cn('animate-fade-in', className)}>
      <Component />
    </div>
  );
}

// Export individual skeletons for reuse
export { SkeletonLine, SkeletonBox, DashboardSkeleton, ListSkeleton, FormSkeleton };
