import { useState, useCallback, useMemo } from 'react';

/**
 * @typedef {Object} ModalState
 * @property {boolean} isOpen - Whether the modal is open
 * @property {any} props - Props passed when opening the modal
 */

/**
 * @typedef {Object} UseModalReturn
 * @property {boolean} isOpen - Whether any modal is open
 * @property {any} modalProps - Props for the current modal
 * @property {function(any=): void} open - Open the modal with optional props
 * @property {function(): void} close - Close the modal
 * @property {function(): void} toggle - Toggle modal open/close state
 */

/**
 * useModal - Hook for managing a single modal's state
 *
 * @description
 * Simple hook for controlling a single modal's visibility and passing props.
 * For managing multiple modals globally, use ModalContext instead.
 *
 * @example
 * // Basic usage
 * const modal = useModal();
 *
 * <Button onClick={() => modal.open()}>Open Modal</Button>
 * <Modal isOpen={modal.isOpen} onClose={modal.close}>
 *   Content
 * </Modal>
 *
 * @example
 * // With props
 * const modal = useModal();
 *
 * const handleEdit = (item) => {
 *   modal.open({ item, mode: 'edit' });
 * };
 *
 * <Modal isOpen={modal.isOpen} onClose={modal.close}>
 *   <EditForm item={modal.modalProps?.item} />
 * </Modal>
 *
 * @param {boolean} [initialState=false] - Initial open state
 * @returns {UseModalReturn} Modal control object
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [modalProps, setModalProps] = useState(null);

  /**
   * Open the modal with optional props
   * @param {any} [props] - Props to pass to the modal
   */
  const open = useCallback((props = null) => {
    setModalProps(props);
    setIsOpen(true);
  }, []);

  /**
   * Close the modal and clear props
   */
  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing props to allow exit animation
    setTimeout(() => setModalProps(null), 200);
  }, []);

  /**
   * Toggle the modal open/close state
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return useMemo(() => ({
    isOpen,
    modalProps,
    open,
    close,
    toggle,
  }), [isOpen, modalProps, open, close, toggle]);
}

/**
 * @typedef {Object} MultiModalState
 * @property {Map<string, ModalState>} modals - Map of modal states by ID
 */

/**
 * @typedef {Object} UseMultiModalReturn
 * @property {function(string, any=): void} open - Open a modal by ID with optional props
 * @property {function(string): void} close - Close a modal by ID
 * @property {function(): void} closeAll - Close all open modals
 * @property {function(string): boolean} isOpen - Check if a modal is open by ID
 * @property {function(string): any} getProps - Get props for a modal by ID
 * @property {string[]} openModals - Array of currently open modal IDs (for stacking)
 */

/**
 * useMultiModal - Hook for managing multiple modals
 *
 * @description
 * Manages multiple modals with unique IDs, supporting stacking and props.
 * Useful when you have several modals in a component.
 *
 * @example
 * const modals = useMultiModal();
 *
 * <Button onClick={() => modals.open('edit', { item })}>Edit</Button>
 * <Button onClick={() => modals.open('delete', { itemId })}>Delete</Button>
 *
 * <Modal isOpen={modals.isOpen('edit')} onClose={() => modals.close('edit')}>
 *   <EditForm item={modals.getProps('edit')?.item} />
 * </Modal>
 *
 * <ConfirmModal
 *   isOpen={modals.isOpen('delete')}
 *   onClose={() => modals.close('delete')}
 *   onConfirm={() => handleDelete(modals.getProps('delete')?.itemId)}
 * />
 *
 * @returns {UseMultiModalReturn} Multi-modal control object
 */
export function useMultiModal() {
  const [modals, setModals] = useState(new Map());

  /**
   * Open a modal by ID with optional props
   * @param {string} modalId - Unique modal identifier
   * @param {any} [props] - Props to pass to the modal
   */
  const open = useCallback((modalId, props = null) => {
    setModals(prev => {
      const next = new Map(prev);
      next.set(modalId, { isOpen: true, props });
      return next;
    });
  }, []);

  /**
   * Close a modal by ID
   * @param {string} modalId - Unique modal identifier
   */
  const close = useCallback((modalId) => {
    setModals(prev => {
      const next = new Map(prev);
      const modal = next.get(modalId);
      if (modal) {
        next.set(modalId, { ...modal, isOpen: false });
        // Clean up after animation
        setTimeout(() => {
          setModals(current => {
            const updated = new Map(current);
            updated.delete(modalId);
            return updated;
          });
        }, 200);
      }
      return next;
    });
  }, []);

  /**
   * Close all open modals
   */
  const closeAll = useCallback(() => {
    setModals(prev => {
      const next = new Map();
      prev.forEach((modal, id) => {
        next.set(id, { ...modal, isOpen: false });
      });
      return next;
    });
    // Clean up after animation
    setTimeout(() => setModals(new Map()), 200);
  }, []);

  /**
   * Check if a modal is open
   * @param {string} modalId - Unique modal identifier
   * @returns {boolean} Whether the modal is open
   */
  const isOpen = useCallback((modalId) => {
    return modals.get(modalId)?.isOpen ?? false;
  }, [modals]);

  /**
   * Get props for a modal
   * @param {string} modalId - Unique modal identifier
   * @returns {any} Modal props or null
   */
  const getProps = useCallback((modalId) => {
    return modals.get(modalId)?.props ?? null;
  }, [modals]);

  /**
   * Get array of currently open modal IDs (for stacking order)
   */
  const openModals = useMemo(() => {
    return Array.from(modals.entries())
      .filter(([, modal]) => modal.isOpen)
      .map(([id]) => id);
  }, [modals]);

  return useMemo(() => ({
    open,
    close,
    closeAll,
    isOpen,
    getProps,
    openModals,
  }), [open, close, closeAll, isOpen, getProps, openModals]);
}

export default useModal;
