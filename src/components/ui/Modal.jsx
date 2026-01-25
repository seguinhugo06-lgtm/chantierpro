import React, { useEffect, useRef, useCallback, createContext, useContext, forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Modal Context for sub-components
 * @private
 */
const ModalContext = createContext(null);

/**
 * @typedef {Object} ModalProps
 * @property {boolean} isOpen - Controls modal visibility
 * @property {function} onClose - Called when modal should close
 * @property {'sm'|'md'|'lg'|'xl'|'full'} [size='md'] - Modal size
 * @property {boolean} [closeOnBackdrop=true] - Close when clicking backdrop
 * @property {boolean} [closeOnEscape=true] - Close on ESC key
 * @property {boolean} [showBackdrop=true] - Show backdrop overlay
 * @property {boolean} [centered=true] - Center modal vertically
 * @property {string} [className] - Additional CSS classes
 * @property {React.ReactNode} children - Modal content
 */

/**
 * Size configuration for modal widths
 */
const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full h-full m-0 rounded-none sm:m-4 sm:rounded-2xl sm:h-auto sm:max-h-[95vh]',
};

/**
 * Modal - Accessible modal dialog component
 *
 * @description
 * A fully accessible modal with focus trap, keyboard navigation,
 * and scroll lock. Supports composable sub-components.
 *
 * @example
 * // Basic usage with sub-components
 * <Modal isOpen={isOpen} onClose={onClose}>
 *   <ModalHeader>
 *     <ModalTitle>Edit Profile</ModalTitle>
 *     <ModalDescription>Update your information</ModalDescription>
 *   </ModalHeader>
 *   <ModalBody>
 *     <form>...</form>
 *   </ModalBody>
 *   <ModalFooter>
 *     <Button variant="ghost" onClick={onClose}>Cancel</Button>
 *     <Button onClick={handleSave}>Save</Button>
 *   </ModalFooter>
 * </Modal>
 *
 * @example
 * // Simple usage with title prop
 * <Modal isOpen={isOpen} onClose={onClose} title="Confirm Action">
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 *
 * @param {ModalProps} props
 */
function Modal({
  isOpen,
  onClose,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showBackdrop = true,
  centered = true,
  className = '',
  children,
  // Legacy props for backwards compatibility
  title,
  description,
  footer,
  showClose = true,
  bottomSheet = true,
  isDark = false,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const isAnimatingOut = useRef(false);

  /**
   * Get all focusable elements within the modal
   */
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(modalRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    ));
  }, []);

  /**
   * Handle keyboard events (ESC and Tab for focus trap)
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    // Focus trap
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

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback((e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  /**
   * Manage focus and scroll lock
   */
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousActiveElement.current = document.activeElement;

      // Lock body scroll
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // Focus first focusable element or modal
      requestAnimationFrame(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current?.focus();
        }
      });

      // Add keydown listener
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Restore focus
      if (previousActiveElement.current && !isAnimatingOut.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, getFocusableElements, handleKeyDown]);

  if (!isOpen) return null;

  // Generate IDs for ARIA
  const modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;
  const titleId = `${modalId}-title`;
  const descId = `${modalId}-desc`;

  // Determine if using legacy mode (title/footer props) or composition mode
  const isLegacyMode = title !== undefined || footer !== undefined;

  // Theme classes for legacy mode
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';

  return (
    <div
      className={cn(
        'fixed inset-0 z-modal flex',
        centered ? 'items-center' : 'items-start pt-20',
        'justify-center p-4',
        bottomSheet && 'items-end sm:items-center'
      )}
      role="presentation"
    >
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-backdrop-enter"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Modal Panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn(
          'relative w-full',
          sizeClasses[size],
          cardBg,
          'rounded-2xl shadow-2xl',
          'flex flex-col',
          'max-h-[90vh]',
          'modal-enter',
          bottomSheet && 'rounded-t-3xl sm:rounded-2xl',
          className
        )}
      >
        <ModalContext.Provider value={{ titleId, descId, onClose, isDark, showClose }}>
          {isLegacyMode ? (
            // Legacy mode: render with title/footer props
            <>
              {(title || showClose) && (
                <div className={cn('flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b', borderColor)}>
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h2 id={titleId} className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id={descId} className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                        {description}
                      </p>
                    )}
                  </div>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                      )}
                      aria-label="Fermer"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {children}
              </div>
              {footer && (
                <div className={cn('px-6 py-4 border-t flex justify-end gap-3', borderColor)}>
                  {footer}
                </div>
              )}
            </>
          ) : (
            // Composition mode: render children directly
            children
          )}
        </ModalContext.Provider>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes modal-backdrop-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes modal-exit {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
        }
        .modal-backdrop-enter {
          animation: modal-backdrop-enter 0.2s ease-out forwards;
        }
        .modal-enter {
          animation: modal-enter 0.2s ease-out forwards;
        }
        .modal-exit {
          animation: modal-exit 0.15s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

// ============ MODAL HEADER ============

/**
 * ModalHeader - Container for modal title and close button
 *
 * @example
 * <ModalHeader>
 *   <ModalTitle>Settings</ModalTitle>
 *   <ModalDescription>Manage your preferences</ModalDescription>
 * </ModalHeader>
 *
 * @example
 * // With custom content
 * <ModalHeader className="flex items-center gap-3">
 *   <Icon />
 *   <ModalTitle>With Icon</ModalTitle>
 * </ModalHeader>
 */
export const ModalHeader = forwardRef(({
  className,
  children,
  showCloseButton = true,
  ...props
}, ref) => {
  const context = useContext(ModalContext);
  const isDark = context?.isDark ?? false;
  const onClose = context?.onClose;
  const showClose = context?.showClose ?? showCloseButton;

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-start justify-between gap-4 px-6 pt-6 pb-4',
        'border-b',
        isDark ? 'border-slate-700' : 'border-gray-200',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0 space-y-1">
        {children}
      </div>
      {showClose && onClose && (
        <button
          onClick={onClose}
          className={cn(
            'p-2 rounded-lg transition-colors flex-shrink-0',
            isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          )}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
});
ModalHeader.displayName = 'ModalHeader';

// ============ MODAL TITLE ============

/**
 * ModalTitle - Accessible modal title (h2)
 *
 * @example
 * <ModalTitle>Edit Profile</ModalTitle>
 */
export const ModalTitle = forwardRef(({
  className,
  children,
  ...props
}, ref) => {
  const context = useContext(ModalContext);
  const isDark = context?.isDark ?? false;

  return (
    <h2
      ref={ref}
      id={context?.titleId}
      className={cn(
        'text-lg font-bold',
        isDark ? 'text-white' : 'text-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
});
ModalTitle.displayName = 'ModalTitle';

// ============ MODAL DESCRIPTION ============

/**
 * ModalDescription - Modal subtitle/description text
 *
 * @example
 * <ModalDescription>Update your account settings</ModalDescription>
 */
export const ModalDescription = forwardRef(({
  className,
  children,
  ...props
}, ref) => {
  const context = useContext(ModalContext);
  const isDark = context?.isDark ?? false;

  return (
    <p
      ref={ref}
      id={context?.descId}
      className={cn(
        'text-sm',
        isDark ? 'text-gray-400' : 'text-gray-600',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});
ModalDescription.displayName = 'ModalDescription';

// ============ MODAL BODY ============

/**
 * ModalBody - Scrollable content area
 *
 * @example
 * <ModalBody>
 *   <form>
 *     <Input label="Name" />
 *     <Input label="Email" />
 *   </form>
 * </ModalBody>
 */
export const ModalBody = forwardRef(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});
ModalBody.displayName = 'ModalBody';

// ============ MODAL FOOTER ============

/**
 * ModalFooter - Action buttons container
 *
 * @example
 * <ModalFooter>
 *   <Button variant="ghost" onClick={onClose}>Cancel</Button>
 *   <Button onClick={handleSave}>Save Changes</Button>
 * </ModalFooter>
 *
 * @example
 * // With divider
 * <ModalFooter bordered>
 *   <Button>Submit</Button>
 * </ModalFooter>
 */
export const ModalFooter = forwardRef(({
  className,
  children,
  bordered = true,
  ...props
}, ref) => {
  const context = useContext(ModalContext);
  const isDark = context?.isDark ?? false;

  return (
    <div
      ref={ref}
      className={cn(
        'px-6 py-4 flex items-center justify-end gap-3',
        bordered && 'border-t',
        bordered && (isDark ? 'border-slate-700' : 'border-gray-200'),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ModalFooter.displayName = 'ModalFooter';

// ============ CONFIRM MODAL ============

/**
 * ConfirmModal - Pre-built confirmation dialog
 *
 * @example
 * <ConfirmModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure? This cannot be undone."
 *   variant="danger"
 * />
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  loading = false,
  isDark = false,
}) {
  const variantColors = {
    danger: 'bg-danger-500 hover:bg-danger-600 focus:ring-danger-500',
    warning: 'bg-warning-500 hover:bg-warning-600 focus:ring-warning-500',
    info: 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500',
    success: 'bg-success-500 hover:bg-success-600 focus:ring-success-500',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader showCloseButton={false}>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
          {message}
        </p>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={loading}
          className={cn(
            'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
            isDark
              ? 'bg-slate-700 text-gray-200 hover:bg-slate-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            'disabled:opacity-50'
          )}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            variantColors[variant],
            'disabled:opacity-50'
          )}
        >
          {loading ? 'Chargement...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ============ ALERT MODAL ============

/**
 * AlertModal - Simple alert/information dialog
 *
 * @example
 * <AlertModal
 *   isOpen={showAlert}
 *   onClose={() => setShowAlert(false)}
 *   title="Success!"
 *   message="Your changes have been saved."
 * />
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  isDark = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader showCloseButton={false}>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
          {message}
        </p>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
        >
          {buttonText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default Modal;
