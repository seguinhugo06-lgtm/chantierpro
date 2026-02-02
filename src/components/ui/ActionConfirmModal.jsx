/**
 * ActionConfirmModal Component
 * Confirmation modal for destructive or important actions
 *
 * @module ActionConfirmModal
 */

import * as React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';

/**
 * @typedef {'danger' | 'warning' | 'info'} ConfirmVariant
 */

/**
 * @typedef {Object} ActionConfirmModalProps
 * @property {boolean} isOpen - Modal visibility
 * @property {() => void} onClose - Close handler
 * @property {() => void | Promise<void>} onConfirm - Confirm handler
 * @property {string} title - Modal title
 * @property {string | React.ReactNode} message - Confirmation message
 * @property {string} [confirmLabel='Confirmer'] - Confirm button label
 * @property {string} [cancelLabel='Annuler'] - Cancel button label
 * @property {ConfirmVariant} [variant='danger'] - Modal variant
 * @property {boolean} [isLoading] - Loading state
 * @property {React.ReactNode} [icon] - Custom icon
 */

// Variant configurations
const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmVariant: 'danger',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmVariant: 'primary',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmVariant: 'primary',
  },
};

/**
 * ActionConfirmModal - Confirmation dialog for actions
 *
 * @example
 * <ActionConfirmModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={handleDelete}
 *   title="Supprimer le devis ?"
 *   message="Cette action est irréversible. Le devis #2025-005 sera définitivement supprimé."
 *   confirmLabel="Supprimer"
 *   variant="danger"
 * />
 *
 * @param {ActionConfirmModalProps} props
 */
export function ActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isLoading = false,
  icon: customIcon,
}) {
  const [loading, setLoading] = React.useState(false);
  const config = variantConfig[variant] || variantConfig.danger;
  const IconComponent = customIcon || config.icon;

  const handleConfirm = React.useCallback(async () => {
    if (loading || isLoading) return;

    const result = onConfirm?.();

    // Handle async confirmation
    if (result instanceof Promise) {
      setLoading(true);
      try {
        await result;
        onClose();
      } catch (error) {
        console.error('Confirmation error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
    }
  }, [onConfirm, onClose, loading, isLoading]);

  const isProcessing = loading || isLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
    >
      <ModalBody className="pt-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
              config.iconBg
            )}
          >
            <IconComponent className={cn('w-6 h-6', config.iconColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
          fullWidth
          className="sm:w-auto"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={config.confirmVariant}
          onClick={handleConfirm}
          isLoading={isProcessing}
          fullWidth
          className="sm:w-auto"
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * DeleteConfirmModal - Pre-configured for delete actions
 *
 * @example
 * <DeleteConfirmModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={handleDelete}
 *   itemType="devis"
 *   itemName="#2025-005"
 * />
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
  isLoading,
}) {
  const typeLabels = {
    devis: 'le devis',
    facture: 'la facture',
    chantier: 'le chantier',
    client: 'le client',
    default: "l'élément",
  };

  const label = typeLabels[itemType] || typeLabels.default;

  return (
    <ActionConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Supprimer ${label} ${itemName} ?`}
      message="Cette action est irréversible. Toutes les données associées seront supprimées."
      confirmLabel="Supprimer"
      variant="danger"
      isLoading={isLoading}
    />
  );
}

/**
 * ConvertConfirmModal - Pre-configured for devis to facture conversion
 */
export function ConvertConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  devisNumber,
  devisMontant,
  isLoading,
}) {
  return (
    <ActionConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Convertir en facture ?"
      message={
        <div className="space-y-2">
          <p>
            Le devis <strong>{devisNumber}</strong> sera converti en facture.
          </p>
          {devisMontant && (
            <p className="text-gray-500 dark:text-gray-400">
              Montant : <strong>{devisMontant}</strong>
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Le devis sera marqué comme accepté.
          </p>
        </div>
      }
      confirmLabel="Convertir"
      variant="info"
      isLoading={isLoading}
      icon={Info}
    />
  );
}

export default ActionConfirmModal;
