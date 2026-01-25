import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Switch - Toggle switch component
 *
 * @param {boolean} checked - Whether the switch is on
 * @param {function} onCheckedChange - Callback when state changes
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 * @param {boolean} disabled - Whether the switch is disabled
 * @param {string} label - Optional label text
 * @param {string} description - Optional description text
 */

const sizeStyles = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'h-3 w-3',
    translate: 'translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'h-6 w-6',
    translate: 'translate-x-7',
  },
};

export const Switch = React.forwardRef(
  (
    {
      className,
      checked = false,
      onCheckedChange,
      size = 'md',
      disabled = false,
      label,
      description,
      id,
      ...props
    },
    ref
  ) => {
    const switchId = id || React.useId();
    const sizes = sizeStyles[size];

    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          id={switchId}
          aria-checked={checked}
          aria-disabled={disabled}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative inline-flex flex-shrink-0 cursor-pointer rounded-full',
            'transition-colors duration-200 ease-in-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            sizes.track,
            checked
              ? 'bg-primary-500'
              : 'bg-gray-200 dark:bg-slate-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block rounded-full bg-white shadow-sm',
              'ring-0 transition-transform duration-200 ease-in-out',
              sizes.thumb,
              'translate-x-0.5 my-auto',
              checked && sizes.translate
            )}
          />
        </button>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  'text-sm font-medium cursor-pointer',
                  'text-gray-900 dark:text-white',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;
