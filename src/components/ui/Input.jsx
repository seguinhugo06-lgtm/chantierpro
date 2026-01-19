import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Input - Accessible form input with label and error support
 */
const Input = forwardRef(({
  label,
  error,
  hint,
  required = false,
  isDark = false,
  className = '',
  containerClassName = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  type = 'text',
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const baseInputClasses = `
    w-full px-4 py-2.5
    border rounded-xl
    text-sm
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');

  const themeClasses = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-400';

  const errorClasses = error
    ? 'border-red-500 focus:ring-red-500/20'
    : isDark
      ? 'focus:ring-slate-500/20'
      : 'focus:ring-slate-500/20';

  const inputClasses = `
    ${baseInputClasses}
    ${themeClasses}
    ${errorClasses}
    ${LeftIcon ? 'pl-10' : ''}
    ${RightIcon ? 'pr-10' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Build aria-describedby
  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  if (hint) describedByParts.push(hintId);
  if (ariaDescribedBy) describedByParts.push(ariaDescribedBy);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <LeftIcon size={18} aria-hidden="true" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-required={required}
          {...props}
        />

        {RightIcon && !error && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <RightIcon size={18} aria-hidden="true" />
          </div>
        )}

        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle size={18} aria-hidden="true" />
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-500 flex items-center gap-1" role="alert">
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

/**
 * Textarea - Accessible textarea with label and error support
 */
export const Textarea = forwardRef(({
  label,
  error,
  hint,
  required = false,
  isDark = false,
  className = '',
  containerClassName = '',
  rows = 3,
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const baseClasses = `
    w-full px-4 py-2.5
    border rounded-xl
    text-sm
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    resize-none
    disabled:opacity-50 disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');

  const themeClasses = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-400';

  const errorClasses = error
    ? 'border-red-500 focus:ring-red-500/20'
    : 'focus:ring-slate-500/20';

  const textareaClasses = `${baseClasses} ${themeClasses} ${errorClasses} ${className}`;

  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  if (hint) describedByParts.push(hintId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={textareaClasses}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        aria-required={required}
        {...props}
      />

      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {hint}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Select - Accessible select dropdown
 */
export const Select = forwardRef(({
  label,
  error,
  hint,
  required = false,
  isDark = false,
  className = '',
  containerClassName = '',
  options = [],
  placeholder = 'Sélectionner...',
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const baseClasses = `
    w-full px-4 py-2.5
    border rounded-xl
    text-sm
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    appearance-none cursor-pointer
  `.trim().replace(/\s+/g, ' ');

  const themeClasses = isDark
    ? 'bg-slate-700 border-slate-600 text-white focus:border-slate-500'
    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-400';

  const errorClasses = error
    ? 'border-red-500 focus:ring-red-500/20'
    : 'focus:ring-slate-500/20';

  const selectClasses = `${baseClasses} ${themeClasses} ${errorClasses} ${className}`;

  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  if (hint) describedByParts.push(hintId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {hint}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
