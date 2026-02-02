/**
 * QuickActions Component
 * Inline action buttons for list items
 *
 * @module QuickActions
 */

import * as React from 'react';
import { forwardRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

/**
 * @typedef {'sm' | 'md' | 'lg'} QuickActionSize
 * @typedef {'ghost' | 'outline' | 'primary' | 'danger'} QuickActionVariant
 */

/**
 * @typedef {Object} QuickAction
 * @property {string} label - Action label (for tooltip/aria)
 * @property {React.ReactNode} icon - Icon component
 * @property {() => void | Promise<void>} onClick - Click handler
 * @property {QuickActionVariant} [variant='ghost'] - Button variant
 * @property {QuickActionSize} [size='sm'] - Button size
 * @property {boolean} [disabled] - Disabled state
 * @property {boolean} [loading] - Loading state
 * @property {string} [tooltip] - Custom tooltip text
 * @property {boolean} [showLabel] - Show label next to icon
 * @property {string} [className] - Additional CSS classes
 */

/**
 * @typedef {Object} QuickActionsProps
 * @property {QuickAction[]} actions - List of actions
 * @property {QuickActionSize} [size='sm'] - Default size for all actions
 * @property {'horizontal' | 'vertical'} [direction='horizontal'] - Layout direction
 * @property {number} [gap=1] - Gap between buttons (1-4)
 * @property {boolean} [showOnHover] - Only show on parent hover
 * @property {string} [className] - Additional CSS classes
 */

// Variant styles
const variantStyles = {
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200',
  outline:
    'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800',
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700',
  danger: 'bg-transparent text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
};

// Size styles for icon buttons
const sizeStyles = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-10 w-10 rounded-lg',
};

// Size styles for buttons with labels
const labelSizeStyles = {
  sm: 'h-7 px-2 gap-1 rounded-md text-xs',
  md: 'h-8 px-2.5 gap-1.5 rounded-lg text-sm',
  lg: 'h-10 px-3 gap-2 rounded-lg text-sm',
};

// Icon sizes
const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

// Gap styles
const gapStyles = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
};

/**
 * QuickActionButton - Single action button
 */
const QuickActionButton = forwardRef(
  (
    {
      action,
      defaultSize = 'sm',
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = useState(false);
    const size = action.size || defaultSize;
    const variant = action.variant || 'ghost';
    const showLabel = action.showLabel || false;

    const handleClick = useCallback(
      async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (action.disabled || isLoading || action.loading) return;

        // If onClick returns a promise, show loading state
        const result = action.onClick?.();
        if (result instanceof Promise) {
          setIsLoading(true);
          try {
            await result;
          } catch (error) {
            console.error('QuickAction error:', error);
          } finally {
            setIsLoading(false);
          }
        }
      },
      [action, isLoading]
    );

    const loading = isLoading || action.loading;
    const disabled = action.disabled || loading;

    const button = (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={action.label}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center',
          'transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
          variantStyles[variant],
          showLabel ? labelSizeStyles[size] : sizeStyles[size],
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          action.className
        )}
      >
        {loading ? (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        ) : (
          <>
            <span className={iconSizes[size]}>{action.icon}</span>
            {showLabel && <span className="font-medium">{action.label}</span>}
          </>
        )}
      </button>
    );

    // Wrap with tooltip if not showing label
    if (!showLabel && (action.tooltip || action.label)) {
      return (
        <Tooltip content={action.tooltip || action.label} side="top">
          {button}
        </Tooltip>
      );
    }

    return button;
  }
);

QuickActionButton.displayName = 'QuickActionButton';

/**
 * QuickActions - Inline action buttons container
 *
 * @example
 * <QuickActions
 *   actions={[
 *     { label: 'Relancer', icon: <Send />, onClick: handleRelance },
 *     { label: 'Voir', icon: <Eye />, onClick: handleView },
 *     { label: 'Supprimer', icon: <Trash />, onClick: handleDelete, variant: 'danger' }
 *   ]}
 * />
 *
 * @param {QuickActionsProps} props
 */
export function QuickActions({
  actions,
  size = 'sm',
  direction = 'horizontal',
  gap = 1,
  showOnHover = false,
  className,
}) {
  if (!actions || actions.length === 0) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        gapStyles[gap] || gapStyles[1],
        showOnHover && 'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
        className
      )}
      role="group"
      aria-label="Actions rapides"
    >
      {actions.map((action, index) => (
        <QuickActionButton
          key={action.label || index}
          action={action}
          defaultSize={size}
        />
      ))}
    </div>
  );
}

/**
 * QuickActionsRow - Pre-styled row layout for list items
 *
 * @example
 * <QuickActionsRow
 *   left={<span>Item name</span>}
 *   right={
 *     <QuickActions actions={[...]} />
 *   }
 * />
 */
export function QuickActionsRow({ left, right, className }) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-3',
        className
      )}
    >
      <div className="flex-1 min-w-0">{left}</div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

/**
 * ActionDivider - Vertical separator between action groups
 */
export function ActionDivider({ className }) {
  return (
    <div
      className={cn('h-4 w-px bg-gray-200 dark:bg-slate-700', className)}
      role="separator"
    />
  );
}

/**
 * useActionState - Hook for managing async action states
 *
 * @example
 * const { execute, isLoading, error } = useActionState(async () => {
 *   await api.relancer(id);
 * });
 */
export function useActionState(asyncFn) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return { execute, isLoading, error, reset };
}

export default QuickActions;
