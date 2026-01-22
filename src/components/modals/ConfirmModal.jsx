import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * ConfirmModal - Confirmation dialog for destructive actions
 *
 * @param {Object} props
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Confirmation message
 * @param {string} props.confirmText - Confirm button text
 * @param {string} props.cancelText - Cancel button text
 * @param {'danger' | 'warning' | 'primary'} props.variant - Button variant
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.onClose - Callback to close modal
 */
export default function ConfirmModal({
  title = 'Confirmer l\'action',
  message = 'Etes-vous sur de vouloir continuer ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  onConfirm,
  onClose
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm?.();
      onClose?.();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const variantClasses = {
    danger: 'bg-danger-500 hover:bg-danger-600 focus:ring-danger-500',
    warning: 'bg-warning-500 hover:bg-warning-600 focus:ring-warning-500',
    primary: 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500'
  };

  const iconColors = {
    danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-500',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-500',
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-500'
  };

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColors[variant]}`}>
          <AlertTriangle size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={`px-4 py-2.5 rounded-xl font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantClasses[variant]}`}
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {confirmText}
        </button>
      </div>
    </div>
  );
}
