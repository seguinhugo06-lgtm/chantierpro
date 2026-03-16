import { AlertCircle } from 'lucide-react';

/**
 * FormError — Accessible inline error message for form fields.
 *
 * Usage:
 *   <input id="client-nom" aria-invalid={!!errors.nom} aria-describedby={errors.nom ? 'client-nom-error' : undefined} />
 *   <FormError id="client-nom-error" message={errors.nom} />
 *
 * @param {Object} props
 * @param {string} props.id - ID to be referenced by aria-describedby on the input
 * @param {string} [props.message] - Error message to display (null/undefined = hidden)
 * @param {boolean} [props.showIcon=true] - Show AlertCircle icon
 */
export default function FormError({ id, message, showIcon = true }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1.5 text-sm text-red-500 flex items-center gap-1"
    >
      {showIcon && <AlertCircle size={14} />}
      {message}
    </p>
  );
}
