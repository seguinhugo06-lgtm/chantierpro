import { useState, useCallback, useRef } from 'react';
import { ConfirmModal } from '../components/ui/Modal';

/**
 * useConfirm — hook to replace window.confirm() with a styled ConfirmModal.
 *
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *
 *   const handleDelete = async () => {
 *     if (!await confirm('Supprimer cette ligne ?')) return;
 *     // … proceed
 *   };
 *
 *   return <>...your UI...<ConfirmDialog /></>
 */
export default function useConfirm() {
  const [state, setState] = useState({
    isOpen: false,
    title: 'Confirmer',
    message: '',
    confirmText: 'Supprimer',
    cancelText: 'Annuler',
    variant: 'danger',
  });
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        title: options.title || 'Confirmer',
        message,
        confirmText: options.confirmText || 'Supprimer',
        cancelText: options.cancelText || 'Annuler',
        variant: options.variant || 'danger',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog = useCallback(() => (
    <ConfirmModal
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
    />
  ), [state, handleClose, handleConfirm]);

  return { confirm, ConfirmDialog };
}
