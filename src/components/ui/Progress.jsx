import * as React from 'react';
import { cn } from '../../lib/utils';

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
  xl: 'h-4',
};

const variantStyles = {
  default: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

/**
 * Progress - Linear progress bar
 */
export const Progress = React.forwardRef(
  (
    {
      className,
      value = 0,
      max = 100,
      size = 'md',
      variant = 'default',
      showLabel = false,
      label,
      animated = false,
      striped = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className={cn('w-full', className)} ref={ref} {...props}>
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
            {showLabel && (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            'w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden',
            sizeStyles[size]
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantStyles[variant],
              striped && 'bg-stripes',
              animated && 'animate-progress-stripes'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

/**
 * CircularProgress - Circular progress indicator
 */
export const CircularProgress = React.forwardRef(
  (
    {
      className,
      value = 0,
      max = 100,
      size = 'md',
      variant = 'default',
      showLabel = false,
      strokeWidth,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizes = {
      sm: { size: 32, stroke: 3 },
      md: { size: 48, stroke: 4 },
      lg: { size: 64, stroke: 5 },
      xl: { size: 80, stroke: 6 },
    };
    
    const { size: svgSize, stroke } = sizes[size] || sizes.md;
    const actualStroke = strokeWidth || stroke;
    const radius = (svgSize - actualStroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colorMap = {
      default: 'text-primary-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
      danger: 'text-danger-500',
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        {...props}
      >
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            className="stroke-gray-200 dark:stroke-slate-700"
            strokeWidth={actualStroke}
          />
          {/* Progress circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            className={cn('transition-all duration-300 ease-out', colorMap[variant])}
            strokeWidth={actualStroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
        {showLabel && (
          <span className="absolute text-sm font-semibold text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

export default Progress;
