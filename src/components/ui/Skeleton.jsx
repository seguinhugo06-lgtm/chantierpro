import * as React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton = React.forwardRef(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'rounded-md',
      circular: 'rounded-full',
      text: 'rounded h-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse bg-gray-200 dark:bg-slate-700',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Preset skeleton components
export const SkeletonText = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn(
          'h-4',
          i === lines - 1 && 'w-3/4'
        )}
      />
    ))}
  </div>
);

SkeletonText.displayName = 'SkeletonText';

export const SkeletonAvatar = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizes[size], className)}
    />
  );
};

SkeletonAvatar.displayName = 'SkeletonAvatar';

export const SkeletonCard = ({ className }) => (
  <div className={cn('p-4 rounded-xl border border-gray-200 dark:border-slate-700', className)}>
    <div className="flex items-center gap-4 mb-4">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonTable = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-slate-700">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

SkeletonTable.displayName = 'SkeletonTable';

export default Skeleton;
