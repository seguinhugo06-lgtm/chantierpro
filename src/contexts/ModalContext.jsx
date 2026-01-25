import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect } from 'react';

/**
 * @typedef {Object} ModalConfig
 * @property {React.ComponentType} component - Modal component to render
 * @property {Object} props - Props to pass to the modal
 * @property {function} [onClose] - Callback when modal closes
 * @property {number} [zIndex] - Custom z-index for stacking
 */

/**
 * @typedef {Object} ModalContextValue
 * @property {function(string, ModalConfig): void} open - Open a modal by ID
 * @property {function(string): void} close - Close a modal by ID
 * @property {function(): void} closeAll - Close all modals
 * @property {function(string): boolean} isOpen - Check if modal is open
 * @property {function(string): Object|null} getModalProps - Get modal props by ID
 * @property {string[]} stack - Current modal stack (IDs in order)
 * @property {number} openCount - Number of open modals
 */

const ModalContext = createContext(null);

/**
 * useModalContext - Access the global modal context
 *
 * @description
 * Hook to access the global modal management system.
 * Must be used within a ModalProvider.
 *
 * @example
 * const { open, close, isOpen } = useModalContext();
 *
 * // Open a modal with a component
 * open('user-edit', {
 *   component: UserEditModal,
 *   props: { userId: 123 },
 *   onClose: () => console.log('Modal closed')
 * });
 *
 * // Close by ID
 * close('user-edit');
 *
 * // Check if open
 * if (isOpen('user-edit')) { ... }
 *
 * @returns {ModalContextValue} Modal context value
 * @throws {Error} If used outside of ModalProvider
 */
export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
}

/**
 * ModalProvider - Global modal state management provider
 *
 * @description
 * Provides global modal management with support for:
 * - Multiple stacked modals
 * - Dynamic modal components
 * - Automatic scroll lock
 * - ESC key handling for top modal
 * - Focus restoration
 *
 * @example
 * // In your app root
 * <ModalProvider>
 *   <App />
 * </ModalProvider>
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - App content
 * @param {number} [props.baseZIndex=1050] - Base z-index for modals
 */
export function ModalProvider({ children, baseZIndex = 1050 }) {
  const [modals, setModals] = useState(new Map());
  const [stack, setStack] = useState([]);
  const previousActiveElement = useRef(null);

  /**
   * Open a modal by ID
   * @param {string} modalId - Unique modal identifier
   * @param {ModalConfig} config - Modal configuration
   */
  const open = useCallback((modalId, config) => {
    // Store current focus if this is the first modal
    if (stack.length === 0) {
      previousActiveElement.current = document.activeElement;
    }

    setModals(prev => {
      const next = new Map(prev);
      next.set(modalId, {
        ...config,
        isOpen: true,
        zIndex: config.zIndex ?? baseZIndex + stack.length * 10,
      });
      return next;
    });

    setStack(prev => [...prev.filter(id => id !== modalId), modalId]);
  }, [baseZIndex, stack.length]);

  /**
   * Close a modal by ID
   * @param {string} modalId - Unique modal identifier
   */
  const close = useCallback((modalId) => {
    const modal = modals.get(modalId);

    setModals(prev => {
      const next = new Map(prev);
      const existing = next.get(modalId);
      if (existing) {
        next.set(modalId, { ...existing, isOpen: false });
      }
      return next;
    });

    setStack(prev => prev.filter(id => id !== modalId));

    // Cleanup after animation
    setTimeout(() => {
      setModals(prev => {
        const next = new Map(prev);
        next.delete(modalId);
        return next;
      });

      // Call onClose callback if provided
      modal?.onClose?.();
    }, 200);
  }, [modals]);

  /**
   * Close all modals
   */
  const closeAll = useCallback(() => {
    const callbacks = Array.from(modals.values()).map(m => m.onClose).filter(Boolean);

    setModals(prev => {
      const next = new Map();
      prev.forEach((modal, id) => {
        next.set(id, { ...modal, isOpen: false });
      });
      return next;
    });

    setStack([]);

    // Cleanup after animation
    setTimeout(() => {
      setModals(new Map());
      callbacks.forEach(cb => cb?.());
    }, 200);
  }, [modals]);

  /**
   * Check if a modal is open
   * @param {string} modalId - Unique modal identifier
   * @returns {boolean}
   */
  const isOpen = useCallback((modalId) => {
    return modals.get(modalId)?.isOpen ?? false;
  }, [modals]);

  /**
   * Get modal props by ID
   * @param {string} modalId - Unique modal identifier
   * @returns {Object|null}
   */
  const getModalProps = useCallback((modalId) => {
    return modals.get(modalId)?.props ?? null;
  }, [modals]);

  // Handle ESC key for top modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && stack.length > 0) {
        const topModalId = stack[stack.length - 1];
        close(topModalId);
      }
    };

    if (stack.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [stack, close]);

  // Handle body scroll lock
  useEffect(() => {
    if (stack.length > 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Restore focus when all modals are closed
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [stack.length]);

  const contextValue = useMemo(() => ({
    open,
    close,
    closeAll,
    isOpen,
    getModalProps,
    stack,
    openCount: stack.length,
  }), [open, close, closeAll, isOpen, getModalProps, stack]);

  return (
    <ModalContext.Provider value={contextValue}>
      {children}

      {/* Render modal stack */}
      <ModalStack modals={modals} stack={stack} onClose={close} baseZIndex={baseZIndex} />
    </ModalContext.Provider>
  );
}

/**
 * ModalStack - Renders stacked modals
 * @private
 */
function ModalStack({ modals, stack, onClose, baseZIndex }) {
  if (stack.length === 0) return null;

  return (
    <>
      {/* Single backdrop for all modals */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        style={{ zIndex: baseZIndex - 1 }}
        onClick={() => onClose(stack[stack.length - 1])}
        aria-hidden="true"
      />

      {/* Render each modal in stack order */}
      {stack.map((modalId, index) => {
        const modal = modals.get(modalId);
        if (!modal) return null;

        const { component: ModalComponent, props, zIndex, isOpen: modalIsOpen } = modal;

        return (
          <div
            key={modalId}
            style={{ zIndex: zIndex ?? baseZIndex + index * 10 }}
            className={`fixed inset-0 flex items-center justify-center p-4 ${
              modalIsOpen ? 'animate-fade-in' : 'animate-fade-out pointer-events-none'
            }`}
          >
            <ModalComponent
              {...props}
              isOpen={modalIsOpen}
              onClose={() => onClose(modalId)}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-fade-out {
          animation: fade-out 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
}

/**
 * useModalState - Simplified hook for component-level modal state
 *
 * @description
 * A simpler alternative to useModalContext when you don't need global modal management.
 * Useful for self-contained modal components.
 *
 * @example
 * function MyComponent() {
 *   const editModal = useModalState();
 *
 *   return (
 *     <>
 *       <Button onClick={() => editModal.open({ item })}>Edit</Button>
 *       {editModal.isOpen && (
 *         <Modal onClose={editModal.close}>
 *           <EditForm {...editModal.props} />
 *         </Modal>
 *       )}
 *     </>
 *   );
 * }
 *
 * @returns {{ isOpen: boolean, props: any, open: function, close: function }}
 */
export function useModalState() {
  const [state, setState] = useState({ isOpen: false, props: null });

  const open = useCallback((props = null) => {
    setState({ isOpen: true, props });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, props: null });
  }, []);

  return useMemo(() => ({
    isOpen: state.isOpen,
    props: state.props,
    open,
    close,
  }), [state, open, close]);
}

export default ModalContext;
