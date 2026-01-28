import { forwardRef, useId, useState, useCallback } from 'react';
import { AlertCircle, Check, Eye, EyeOff, X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * @typedef {'text'|'email'|'number'|'password'|'tel'|'url'|'search'|'date'|'time'|'datetime-local'} InputType
 */

/**
 * @typedef {Object} InputProps
 * @property {InputType} [type='text'] - Input type
 * @property {string} [label] - Label text
 * @property {string} [helperText] - Helper text below input
 * @property {string} [error] - Error message (replaces helperText)
 * @property {boolean} [success] - Success state indicator
 * @property {React.ReactNode} [icon] - Icon element
 * @property {'left'|'right'} [iconPosition='left'] - Icon position
 * @property {number} [maxLength] - Maximum character length
 * @property {boolean} [showCounter] - Show character counter
 * @property {boolean} [clearable] - Show clear button when has value
 * @property {boolean} [disabled] - Disabled state
 * @property {boolean} [required] - Required field indicator
 * @property {string} [placeholder] - Placeholder text
 * @property {string} [value] - Input value
 * @property {function} [onChange] - Change handler
 * @property {function} [onClear] - Called when clear button clicked
 * @property {string} [className] - Additional CSS classes
 * @property {string} [containerClassName] - Container CSS classes
 * @property {boolean} [isDark] - Dark mode
 */

/**
 * Input - Accessible form input with comprehensive features
 *
 * @description
 * A fully-featured input component supporting multiple types,
 * icons, validation states, character counters, and accessibility.
 *
 * @example
 * // Basic input
 * <Input label="Email" type="email" placeholder="you@example.com" />
 *
 * @example
 * // With icon and validation
 * <Input
 *   label="Search"
 *   icon={<Search />}
 *   clearable
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   onClear={() => setQuery('')}
 * />
 *
 * @example
 * // Password with toggle
 * <Input type="password" label="Password" />
 *
 * @example
 * // With character counter
 * <Input
 *   label="Bio"
 *   maxLength={160}
 *   showCounter
 *   helperText="Brief description about yourself"
 * />
 *
 * @example
 * // Error state
 * <Input label="Email" error="Please enter a valid email" />
 *
 * @param {InputProps & React.InputHTMLAttributes<HTMLInputElement>} props
 * @returns {JSX.Element}
 */
const Input = forwardRef(({
  type = 'text',
  label,
  helperText,
  error,
  success = false,
  icon,
  iconPosition = 'left',
  maxLength,
  showCounter = false,
  clearable = false,
  disabled = false,
  required = false,
  placeholder,
  value,
  onChange,
  onClear,
  className = '',
  containerClassName = '',
  isDark = false,
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  // Generate unique IDs for accessibility
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const counterId = `${id}-counter`;

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const isSearch = type === 'search';

  // Determine current value for counter and clear button
  const currentValue = value ?? props.defaultValue ?? '';
  const valueLength = typeof currentValue === 'string' ? currentValue.length : 0;
  const hasValue = valueLength > 0;

  // Determine if we have right-side elements
  const hasRightElements = error || success || isPassword || (clearable && hasValue);

  // Handle clear button click
  const handleClear = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      // Create synthetic event
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' },
      };
      onChange(syntheticEvent);
    }
  }, [onClear, onChange]);

  // Build aria-describedby
  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  else if (helperText) describedByParts.push(helperId);
  if (showCounter && maxLength) describedByParts.push(counterId);
  if (ariaDescribedBy) describedByParts.push(ariaDescribedBy);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  // Input type (handle password visibility)
  const inputType = isPassword && showPassword ? 'text' : type;

  // Style classes
  const baseClasses = cn(
    'w-full h-10 px-3',
    'border rounded-lg',
    'text-sm',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800',
    'placeholder:text-gray-400 dark:placeholder:text-slate-500'
  );

  const themeClasses = isDark
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const stateClasses = error
    ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100 dark:focus:ring-danger-900/30'
    : success
    ? 'border-success-500 focus:border-success-500 focus:ring-success-100 dark:focus:ring-success-900/30'
    : isDark
    ? 'focus:border-primary-500 focus:ring-primary-900/30'
    : 'focus:border-primary-500 focus:ring-primary-100';

  const paddingClasses = cn(
    icon && iconPosition === 'left' && 'pl-10',
    icon && iconPosition === 'right' && !hasRightElements && 'pr-10',
    hasRightElements && 'pr-10',
    hasRightElements && icon && iconPosition === 'right' && 'pr-20'
  );

  return (
    <div className={containerClassName}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium mb-1.5',
            isDark ? 'text-gray-200' : 'text-gray-700',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && (
            <span className="text-danger-500 ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        {/* Left icon */}
        {icon && iconPosition === 'left' && (
          <div
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
              error ? 'text-danger-500' : isDark ? 'text-slate-400' : 'text-gray-400'
            )}
            aria-hidden="true"
          >
            {isSearch ? <Search size={18} /> : icon}
          </div>
        )}

        {/* Input element */}
        <input
          ref={ref}
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          aria-describedby={describedBy}
          className={cn(
            baseClasses,
            themeClasses,
            stateClasses,
            paddingClasses,
            className
          )}
          {...props}
        />

        {/* Right side elements container */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Right icon (if not password/clearable/error/success) */}
          {icon && iconPosition === 'right' && !hasRightElements && (
            <span className={isDark ? 'text-slate-400' : 'text-gray-400'} aria-hidden="true">
              {icon}
            </span>
          )}

          {/* Clear button */}
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'p-0.5 rounded transition-colors',
                isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              tabIndex={-1}
              aria-label="Effacer"
            >
              <X size={16} />
            </button>
          )}

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                'p-0.5 rounded transition-colors',
                isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              tabIndex={-1}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}

          {/* Error icon */}
          {error && !isPassword && (
            <AlertCircle size={18} className="text-danger-500 flex-shrink-0" aria-hidden="true" />
          )}

          {/* Success icon */}
          {success && !error && !isPassword && (
            <Check size={18} className="text-success-500 flex-shrink-0" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Bottom row: Error/Helper text and Counter */}
      <div className="flex items-start justify-between gap-2 mt-1.5">
        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle size={14} className="flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Helper text (only if no error) */}
        {helperText && !error && (
          <p
            id={helperId}
            className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}
          >
            {helperText}
          </p>
        )}

        {/* Character counter */}
        {showCounter && maxLength && (
          <p
            id={counterId}
            className={cn(
              'text-xs ml-auto flex-shrink-0',
              valueLength > maxLength
                ? 'text-danger-500'
                : isDark ? 'text-slate-400' : 'text-gray-400'
            )}
            aria-live="polite"
          >
            {valueLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

// ============ TEXTAREA ============

/**
 * @typedef {Object} TextareaProps
 * @property {string} [label] - Label text
 * @property {string} [helperText] - Helper text
 * @property {string} [error] - Error message
 * @property {number} [rows=3] - Number of rows
 * @property {number} [maxLength] - Max characters
 * @property {boolean} [showCounter] - Show counter
 * @property {boolean} [resize] - Allow resize
 * @property {boolean} [required] - Required field
 * @property {boolean} [isDark] - Dark mode
 */

/**
 * Textarea - Multi-line text input
 *
 * @example
 * <Textarea
 *   label="Description"
 *   placeholder="Enter details..."
 *   rows={4}
 *   maxLength={500}
 *   showCounter
 * />
 *
 * @param {TextareaProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>} props
 */
export const Textarea = forwardRef(({
  label,
  helperText,
  error,
  rows = 3,
  maxLength,
  showCounter = false,
  resize = true,
  required = false,
  disabled = false,
  isDark = false,
  className = '',
  containerClassName = '',
  value,
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const counterId = `${id}-counter`;

  const currentValue = value ?? props.defaultValue ?? '';
  const valueLength = typeof currentValue === 'string' ? currentValue.length : 0;

  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  else if (helperText) describedByParts.push(helperId);
  if (showCounter && maxLength) describedByParts.push(counterId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const baseClasses = cn(
    'w-full px-3 py-2.5',
    'border rounded-lg',
    'text-sm',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800',
    'placeholder:text-gray-400 dark:placeholder:text-slate-500',
    !resize && 'resize-none'
  );

  const themeClasses = isDark
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const stateClasses = error
    ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100'
    : isDark
    ? 'focus:border-primary-500 focus:ring-primary-900/30'
    : 'focus:border-primary-500 focus:ring-primary-100';

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium mb-1.5',
            isDark ? 'text-gray-200' : 'text-gray-700',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        aria-describedby={describedBy}
        className={cn(baseClasses, themeClasses, stateClasses, className)}
        {...props}
      />

      <div className="flex items-start justify-between gap-2 mt-1.5">
        {error && (
          <p id={errorId} className="text-sm text-danger-600 flex items-center gap-1" role="alert">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
            {helperText}
          </p>
        )}

        {showCounter && maxLength && (
          <p
            id={counterId}
            className={cn(
              'text-xs ml-auto',
              valueLength > maxLength ? 'text-danger-500' : isDark ? 'text-slate-400' : 'text-gray-400'
            )}
          >
            {valueLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

// ============ SELECT ============

/**
 * @typedef {Object} SelectOption
 * @property {string} value - Option value
 * @property {string} label - Option label
 * @property {boolean} [disabled] - Option disabled
 */

/**
 * @typedef {Object} SelectProps
 * @property {string} [label] - Label text
 * @property {string} [helperText] - Helper text
 * @property {string} [error] - Error message
 * @property {SelectOption[]} [options] - Select options
 * @property {string} [placeholder] - Placeholder option
 * @property {boolean} [required] - Required field
 * @property {boolean} [isDark] - Dark mode
 */

/**
 * Select - Dropdown select component
 *
 * @example
 * <Select
 *   label="Country"
 *   options={[
 *     { value: 'fr', label: 'France' },
 *     { value: 'be', label: 'Belgium' },
 *   ]}
 *   placeholder="Select a country"
 * />
 *
 * @param {SelectProps & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
export const Select = forwardRef(({
  label,
  helperText,
  error,
  options = [],
  placeholder = 'Sélectionner...',
  required = false,
  disabled = false,
  isDark = false,
  className = '',
  containerClassName = '',
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  else if (helperText) describedByParts.push(helperId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const baseClasses = cn(
    'w-full h-10 px-3 pr-10',
    'border rounded-lg',
    'text-sm',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800',
    'appearance-none cursor-pointer'
  );

  const themeClasses = isDark
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const stateClasses = error
    ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100'
    : isDark
    ? 'focus:border-primary-500 focus:ring-primary-900/30'
    : 'focus:border-primary-500 focus:ring-primary-100';

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium mb-1.5',
            isDark ? 'text-gray-200' : 'text-gray-700',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          aria-describedby={describedBy}
          className={cn(baseClasses, themeClasses, stateClasses, className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
            isDark ? 'text-slate-400' : 'text-gray-400'
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="mt-1.5">
        {error && (
          <p id={errorId} className="text-sm text-danger-600 flex items-center gap-1" role="alert">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
            {helperText}
          </p>
        )}
      </div>
    </div>
  );
});

Select.displayName = 'Select';

// ============ SEARCH INPUT ============

/**
 * SearchInput - Specialized search input with icon and clear button
 *
 * @example
 * <SearchInput
 *   placeholder="Search clients..."
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   onClear={() => setQuery('')}
 * />
 */
export const SearchInput = forwardRef(({
  placeholder = 'Rechercher...',
  className,
  ...props
}, ref) => {
  return (
    <Input
      ref={ref}
      type="search"
      icon={<Search size={18} />}
      iconPosition="left"
      clearable
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

// ============ PASSWORD INPUT ============

/**
 * PasswordInput - Password input with visibility toggle
 *
 * @example
 * <PasswordInput
 *   label="Password"
 *   helperText="Must be at least 8 characters"
 * />
 */
export const PasswordInput = forwardRef(({
  label = 'Mot de passe',
  ...props
}, ref) => {
  return (
    <Input
      ref={ref}
      type="password"
      label={label}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

// ============ NUMBER INPUT ============

/**
 * NumberInput - Number input with increment/decrement support
 *
 * @example
 * <NumberInput
 *   label="Quantity"
 *   min={0}
 *   max={100}
 *   step={1}
 * />
 */
export const NumberInput = forwardRef(({
  min,
  max,
  step = 1,
  ...props
}, ref) => {
  return (
    <Input
      ref={ref}
      type="number"
      min={min}
      max={max}
      step={step}
      {...props}
    />
  );
});

NumberInput.displayName = 'NumberInput';
