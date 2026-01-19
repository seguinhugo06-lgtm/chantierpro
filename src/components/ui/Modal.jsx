import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

/**
 * Modal - Accessible modal with focus trap and proper ARIA
 *
 * @param {boolean} isOpen - Controls visibility
 * @param {function} onClose - Called when modal should close
 * @param {string} title - Modal title (required for accessibility)
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} showClose - Show close button
 * @param {boolean} closeOnBackdrop - Close when clicking backdrop
 * @param {boolean} closeOnEscape - Close on Escape key
 * @param {boolean} bottomSheet - Mobile bottom sheet style
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  bottomSheet = true,
  isDark = false,
  footer,
  className = ''
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Size classes
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-[95vw] sm:max-h-[95vh]'
  };

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Focus trap
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [closeOnEscape, onClose, getFocusableElements]);

  // Store previous focus and manage body scroll
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element or modal itself
      requestAnimationFrame(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current?.focus();
        }
      });
    } else {
      document.body.style.overflow = '';
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, getFocusableElements]);

  // Add keydown listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const modalId = title ? `modal-${title.toLowerCase().replace(/\s+/g, '-')}` : 'modal';
  const titleId = `${modalId}-title`;
  const descId = `${modalId}-description`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`
          relative w-full ${sizeClasses[size]}
          ${cardBg}
          ${bottomSheet ? 'rounded-t-3xl sm:rounded-2xl' : 'rounded-2xl'}
          shadow-2xl
          flex flex-col
          max-h-[90vh] sm:max-h-[85vh]
          animate-slide-up sm:animate-scale-pop
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className={`flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b ${borderColor}`}>
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className={`text-lg font-bold ${textPrimary}`}>
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className={`text-sm mt-1 ${textMuted}`}>
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <IconButton
                onClick={onClose}
                isDark={isDark}
                aria-label="Fermer"
                size="sm"
              >
                <X size={20} />
              </IconButton>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-5 py-4 border-t ${borderColor} flex justify-end gap-3`}>
            {footer}
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes scale-pop {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-pop {
          animation: scale-pop 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * ConfirmModal - Confirmation dialog with yes/no
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  loading = false,
  isDark = false
}) {
  const variantColors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-blue-500 hover:bg-blue-600'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      isDark={isDark}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${variantColors[variant]} disabled:opacity-50`}
          >
            {loading ? 'Chargement...' : confirmText}
          </button>
        </>
      }
    >
      <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
        {message}
      </p>
    </Modal>
  );
}

/**
 * AlertModal - Simple alert/info modal
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  isDark = false
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      isDark={isDark}
      footer={
        <button
          onClick={onClose}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors`}
        >
          {buttonText}
        </button>
      }
    >
      <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
        {message}
      </p>
    </Modal>
  );
}
