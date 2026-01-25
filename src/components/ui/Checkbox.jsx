import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check, Minus } from 'lucide-react';

/**
 * Checkbox - Accessible checkbox component
 *
 * @param {boolean} checked - Whether the checkbox is checked
 * @param {boolean} indeterminate - Indeterminate state (for "select all")
 * @param {function} onCheckedChange - Callback when state changes
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 * @param {boolean} disabled - Whether the checkbox is disabled
 * @param {string} label - Optional label text
 * @param {string} description - Optional description text
 */

const sizeStyles = {
  sm: {
    box: 'h-4 w-4',
    icon: 12,
  },
  md: {
    box: 'h-5 w-5',
    icon: 14,
  },
  lg: {
    box: 'h-6 w-6',
    icon: 16,
  },
};

export const Checkbox = React.forwardRef(
  (
    {
      className,
      checked = false,
      indeterminate = false,
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
    const checkboxId = id || React.useId();
    const sizes = sizeStyles[size];
    const inputRef = React.useRef(null);

    // Handle indeterminate state (can't be set via HTML attribute)
    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const handleChange = (e) => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center">
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'flex items-center justify-center rounded-md border-2 transition-all duration-150',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              sizes.box,
              checked || indeterminate
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
            onClick={() => {
              if (!disabled) {
                inputRef.current?.click();
              }
            }}
          >
            {indeterminate ? (
              <Minus size={sizes.icon} strokeWidth={3} />
            ) : checked ? (
              <Check size={sizes.icon} strokeWidth={3} />
            ) : null}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
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

Checkbox.displayName = 'Checkbox';

/**
 * Radio - Accessible radio button component
 */
export const Radio = React.forwardRef(
  (
    {
      className,
      checked = false,
      onCheckedChange,
      size = 'md',
      disabled = false,
      label,
      description,
      name,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const radioId = id || React.useId();
    const sizes = sizeStyles[size];

    const handleChange = (e) => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'flex items-center justify-center rounded-full border-2 transition-all duration-150',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              sizes.box,
              checked
                ? 'border-primary-500'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
            onClick={() => {
              if (!disabled) {
                const input = document.getElementById(radioId);
                input?.click();
              }
            }}
          >
            {checked && (
              <div
                className={cn(
                  'rounded-full bg-primary-500',
                  size === 'sm' && 'h-2 w-2',
                  size === 'md' && 'h-2.5 w-2.5',
                  size === 'lg' && 'h-3 w-3'
                )}
              />
            )}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={radioId}
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

Radio.displayName = 'Radio';

export default Checkbox;
