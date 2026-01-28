/**
 * useQuickActions Hook
 * Common logic for inline list actions
 *
 * @module useQuickActions
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from '../stores/toastStore';
import { useModal, useMultiModal } from './useModal';
import { useData } from '../context/DataContext';

/**
 * @typedef {'devis' | 'facture' | 'chantier' | 'client'} ItemType
 */

/**
 * @typedef {Object} UseQuickActionsConfig
 * @property {ItemType} type - Type of item
 * @property {string} [itemId] - Item ID for single-item actions
 * @property {() => void} [onSuccess] - Callback after successful action
 * @property {() => void} [onError] - Callback after failed action
 * @property {boolean} [optimistic=true] - Use optimistic updates
 */

/**
 * @typedef {Object} ConfirmationConfig
 * @property {string} title - Confirmation dialog title
 * @property {string} message - Confirmation message
 * @property {string} [confirmLabel='Confirmer'] - Confirm button label
 * @property {string} [cancelLabel='Annuler'] - Cancel button label
 * @property {boolean} [danger=false] - Use danger styling
 */

/**
 * @typedef {Object} RelanceConfig
 * @property {'email' | 'sms' | 'both'} [method='email'] - Relance method
 * @property {string} [customMessage] - Custom message
 * @property {string} [template] - Template ID
 */

// ============ ACTION LABELS ============

const ACTION_LABELS = {
  devis: {
    relancer: 'Relancer le devis',
    convertir: 'Convertir en facture',
    dupliquer: 'Dupliquer le devis',
    supprimer: 'Supprimer le devis',
    telecharger: 'Télécharger le devis',
    partager: 'Partager le devis',
  },
  facture: {
    relancer: 'Relancer la facture',
    dupliquer: 'Dupliquer la facture',
    supprimer: 'Supprimer la facture',
    telecharger: 'Télécharger la facture',
    partager: 'Partager la facture',
  },
  chantier: {
    dupliquer: 'Dupliquer le chantier',
    supprimer: 'Supprimer le chantier',
    terminer: 'Marquer comme terminé',
  },
  client: {
    supprimer: 'Supprimer le client',
  },
};

const SUCCESS_MESSAGES = {
  relancer: 'Relance envoyée !',
  convertir: 'Devis converti en facture !',
  dupliquer: 'Élément dupliqué !',
  supprimer: 'Élément supprimé !',
  telecharger: 'Téléchargement démarré !',
  partager: 'Lien copié dans le presse-papiers !',
  terminer: 'Chantier marqué comme terminé !',
  appeler: 'Appel en cours...',
  email: 'Email ouvert !',
  whatsapp: 'WhatsApp ouvert !',
};

const ERROR_MESSAGES = {
  relancer: 'Erreur lors de la relance',
  convertir: 'Erreur lors de la conversion',
  dupliquer: 'Erreur lors de la duplication',
  supprimer: 'Erreur lors de la suppression',
  telecharger: 'Erreur lors du téléchargement',
  partager: 'Erreur lors du partage',
  terminer: 'Erreur lors de la mise à jour',
  default: 'Quelque chose n\'a pas marché. Réessayez.',
};

// ============ MAIN HOOK ============

/**
 * useQuickActions - Hook for common list item actions
 *
 * @example
 * const { relancer, convertir, dupliquer, supprimer } = useQuickActions({
 *   type: 'devis',
 *   itemId: devis.id,
 * });
 *
 * // In QuickActions
 * <QuickActions
 *   actions={[
 *     { label: 'Relancer', icon: <Send />, onClick: relancer },
 *     { label: 'Convertir', icon: <FileText />, onClick: convertir },
 *   ]}
 * />
 *
 * @param {UseQuickActionsConfig} config
 */
export function useQuickActions(config) {
  const { type, itemId, onSuccess, onError, optimistic = true } = config;

  // State
  const [loading, setLoading] = useState({});
  const [pendingAction, setPendingAction] = useState(null);

  // Modals
  const confirmModal = useModal();
  const relanceModal = useModal();
  const convertModal = useModal();

  // Data context
  const dataContext = useData();

  // ============ UTILITY FUNCTIONS ============

  /**
   * Set loading state for an action
   */
  const setActionLoading = useCallback((action, isLoading) => {
    setLoading((prev) => ({ ...prev, [action]: isLoading }));
  }, []);

  /**
   * Check if an action is loading
   */
  const isActionLoading = useCallback(
    (action) => loading[action] || false,
    [loading]
  );

  /**
   * Execute action with error handling and feedback
   */
  const executeAction = useCallback(
    async (actionName, actionFn, successMsg, errorMsg) => {
      setActionLoading(actionName, true);

      try {
        await actionFn();
        toast.success(successMsg || SUCCESS_MESSAGES[actionName] || 'Action réussie !');
        onSuccess?.();
        return true;
      } catch (error) {
        console.error(`${actionName} error:`, error);
        toast.error(
          errorMsg || ERROR_MESSAGES[actionName] || ERROR_MESSAGES.default,
          error.message
        );
        onError?.();
        return false;
      } finally {
        setActionLoading(actionName, false);
      }
    },
    [setActionLoading, onSuccess, onError]
  );

  /**
   * Show confirmation dialog before action
   */
  const withConfirmation = useCallback(
    (action, confirmConfig) => {
      return () => {
        setPendingAction({ action, config: confirmConfig });
        confirmModal.open(confirmConfig);
      };
    },
    [confirmModal]
  );

  /**
   * Handle confirmation dialog confirm
   */
  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;

    confirmModal.close();
    await pendingAction.action();
    setPendingAction(null);
  }, [pendingAction, confirmModal]);

  /**
   * Handle confirmation dialog cancel
   */
  const handleCancel = useCallback(() => {
    confirmModal.close();
    setPendingAction(null);
  }, [confirmModal]);

  // ============ ACTIONS ============

  /**
   * Relancer - Send reminder email/SMS
   */
  const relancer = useCallback(
    async (id = itemId, relanceConfig = {}) => {
      const { method = 'email', customMessage, template } = relanceConfig;

      return executeAction('relancer', async () => {
        // TODO: Replace with actual API call
        // await api.relancer(type, id, { method, customMessage, template });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Log for demo
        console.log(`Relance ${method} envoyée pour ${type} #${id}`);
      });
    },
    [itemId, type, executeAction]
  );

  /**
   * Open relance modal for configuration
   */
  const openRelanceModal = useCallback(
    (id = itemId) => {
      relanceModal.open({ itemId: id, type });
    },
    [itemId, type, relanceModal]
  );

  /**
   * Convertir - Convert devis to facture
   */
  const convertir = useCallback(
    async (devisId = itemId) => {
      if (type !== 'devis') {
        console.warn('convertir is only available for devis');
        return false;
      }

      return executeAction('convertir', async () => {
        // Get devis data
        const devis = dataContext?.getDevis?.(devisId);
        if (!devis) throw new Error('Devis non trouvé');

        // Create facture from devis
        const factureData = {
          ...devis,
          type: 'facture',
          devisId: devisId,
          statut: 'brouillon',
          dateEmission: new Date().toISOString(),
        };

        // TODO: Replace with actual API call
        // await api.createFacture(factureData);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update devis status
        dataContext?.updateDevis?.(devisId, { statut: 'accepte' });

        console.log(`Devis #${devisId} converti en facture`);
      });
    },
    [itemId, type, dataContext, executeAction]
  );

  /**
   * Open convert modal for confirmation
   */
  const openConvertModal = useCallback(
    (devisId = itemId) => {
      convertModal.open({ itemId: devisId, type: 'devis' });
    },
    [itemId, convertModal]
  );

  /**
   * Dupliquer - Clone an item
   */
  const dupliquer = useCallback(
    async (id = itemId) => {
      return executeAction('dupliquer', async () => {
        let item;
        let addFn;

        // Get item and add function based on type
        switch (type) {
          case 'devis':
            item = dataContext?.getDevis?.(id);
            addFn = dataContext?.addDevis;
            break;
          case 'chantier':
            item = dataContext?.getChantier?.(id);
            addFn = dataContext?.addChantier;
            break;
          case 'client':
            item = dataContext?.getClient?.(id);
            addFn = dataContext?.addClient;
            break;
          default:
            throw new Error(`Duplication not supported for type: ${type}`);
        }

        if (!item) throw new Error('Élément non trouvé');

        // Create duplicate with new ID
        const duplicate = {
          ...item,
          id: undefined, // Will be generated
          nom: `${item.nom || item.numero || 'Item'} (copie)`,
          numero: item.numero ? `${item.numero}-COPIE` : undefined,
          createdAt: new Date().toISOString(),
        };

        // Remove system fields
        delete duplicate.id;
        delete duplicate.updatedAt;

        // Add duplicate
        addFn?.(duplicate);

        console.log(`${type} #${id} dupliqué`);
      });
    },
    [itemId, type, dataContext, executeAction]
  );

  /**
   * Supprimer - Soft delete an item
   */
  const supprimer = useCallback(
    async (id = itemId, skipConfirm = false) => {
      const doDelete = async () => {
        return executeAction('supprimer', async () => {
          let deleteFn;

          switch (type) {
            case 'devis':
              deleteFn = dataContext?.deleteDevis;
              break;
            case 'chantier':
              deleteFn = dataContext?.deleteChantier;
              break;
            case 'client':
              deleteFn = dataContext?.deleteClient;
              break;
            default:
              throw new Error(`Deletion not supported for type: ${type}`);
          }

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          deleteFn?.(id);

          console.log(`${type} #${id} supprimé`);
        });
      };

      if (skipConfirm) {
        return doDelete();
      }

      // Return a function that opens confirmation
      return withConfirmation(doDelete, {
        title: 'Confirmer la suppression',
        message: `Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        danger: true,
      })();
    },
    [itemId, type, dataContext, executeAction, withConfirmation]
  );

  /**
   * Telecharger - Download PDF
   */
  const telecharger = useCallback(
    async (id = itemId) => {
      return executeAction('telecharger', async () => {
        // TODO: Replace with actual PDF generation
        // const pdfUrl = await api.generatePdf(type, id);
        // window.open(pdfUrl, '_blank');

        // Simulate PDF download
        await new Promise((resolve) => setTimeout(resolve, 800));

        console.log(`Téléchargement PDF pour ${type} #${id}`);
      });
    },
    [itemId, type, executeAction]
  );

  /**
   * Partager - Copy share link
   */
  const partager = useCallback(
    async (id = itemId) => {
      return executeAction('partager', async () => {
        // Generate share URL
        const shareUrl = `${window.location.origin}/share/${type}/${id}`;

        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);

        console.log(`Lien partagé: ${shareUrl}`);
      });
    },
    [itemId, type, executeAction]
  );

  /**
   * Terminer - Mark chantier as complete
   */
  const terminer = useCallback(
    async (chantierId = itemId) => {
      if (type !== 'chantier') {
        console.warn('terminer is only available for chantier');
        return false;
      }

      return executeAction('terminer', async () => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        dataContext?.updateChantier?.(chantierId, {
          statut: 'termine',
          dateFin: new Date().toISOString(),
          avancement: 100,
        });

        console.log(`Chantier #${chantierId} terminé`);
      });
    },
    [itemId, type, dataContext, executeAction]
  );

  /**
   * Voir - Navigate to item detail
   */
  const voir = useCallback(
    (id = itemId, navigate) => {
      const routes = {
        devis: `/devis/${id}`,
        facture: `/factures/${id}`,
        chantier: `/chantiers/${id}`,
        client: `/clients/${id}`,
      };

      const route = routes[type];
      if (route && navigate) {
        navigate(route);
      } else {
        console.log(`Navigate to ${route}`);
      }
    },
    [itemId, type]
  );

  /**
   * Appeler - Open phone dialer
   */
  const appeler = useCallback(
    (phone) => {
      if (!phone) {
        toast.error('Numéro de téléphone non disponible');
        return;
      }

      const cleanPhone = phone.replace(/\s/g, '');
      window.open(`tel:${cleanPhone}`, '_self');
      toast.info(SUCCESS_MESSAGES.appeler);
    },
    []
  );

  /**
   * Email - Open email client
   */
  const email = useCallback(
    (emailAddress, subject = '') => {
      if (!emailAddress) {
        toast.error('Adresse email non disponible');
        return;
      }

      const mailtoUrl = subject
        ? `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`
        : `mailto:${emailAddress}`;

      window.open(mailtoUrl, '_blank');
      toast.info(SUCCESS_MESSAGES.email);
    },
    []
  );

  /**
   * WhatsApp - Open WhatsApp
   */
  const whatsapp = useCallback(
    (phone, message = '') => {
      if (!phone) {
        toast.error('Numéro de téléphone non disponible');
        return;
      }

      const cleanPhone = phone.replace(/\s/g, '').replace(/^\+/, '');
      const waUrl = message
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${cleanPhone}`;

      window.open(waUrl, '_blank');
      toast.info(SUCCESS_MESSAGES.whatsapp);
    },
    []
  );

  /**
   * GPS - Open Google Maps
   */
  const gps = useCallback(
    (address) => {
      if (!address) {
        toast.error('Adresse non disponible');
        return;
      }

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank');
    },
    []
  );

  // ============ RETURN ============

  return useMemo(
    () => ({
      // Actions
      relancer,
      openRelanceModal,
      convertir,
      openConvertModal,
      dupliquer,
      supprimer,
      telecharger,
      partager,
      terminer,
      voir,
      appeler,
      email,
      whatsapp,
      gps,

      // State
      loading,
      isActionLoading,

      // Confirmation
      confirmModal,
      handleConfirm,
      handleCancel,
      pendingAction,

      // Modals
      relanceModal,
      convertModal,

      // Labels
      labels: ACTION_LABELS[type] || {},
    }),
    [
      relancer,
      openRelanceModal,
      convertir,
      openConvertModal,
      dupliquer,
      supprimer,
      telecharger,
      partager,
      terminer,
      voir,
      appeler,
      email,
      whatsapp,
      gps,
      loading,
      isActionLoading,
      confirmModal,
      handleConfirm,
      handleCancel,
      pendingAction,
      relanceModal,
      convertModal,
      type,
    ]
  );
}

// ============ PRESET ACTIONS ============

/**
 * Preset actions for Devis list items
 */
export function useDevisActions(devisId, options = {}) {
  const actions = useQuickActions({ type: 'devis', itemId: devisId, ...options });

  return {
    ...actions,
    // Convenience methods with pre-configured handlers
    getQuickActions: (icons) => [
      {
        label: 'Relancer',
        icon: icons?.relancer,
        onClick: actions.openRelanceModal,
        loading: actions.isActionLoading('relancer'),
      },
      {
        label: 'Voir',
        icon: icons?.voir,
        onClick: () => actions.voir(devisId),
      },
      {
        label: 'Convertir',
        icon: icons?.convertir,
        onClick: actions.openConvertModal,
        loading: actions.isActionLoading('convertir'),
      },
      {
        label: 'Dupliquer',
        icon: icons?.dupliquer,
        onClick: () => actions.dupliquer(devisId),
        loading: actions.isActionLoading('dupliquer'),
      },
    ],
    getMenuActions: (icons) => [
      { label: 'Relancer', icon: icons?.relancer, onClick: actions.openRelanceModal },
      { label: 'Voir', icon: icons?.voir, onClick: () => actions.voir(devisId) },
      { label: 'Convertir en facture', icon: icons?.convertir, onClick: actions.openConvertModal },
      { type: 'separator' },
      { label: 'Dupliquer', icon: icons?.dupliquer, onClick: () => actions.dupliquer(devisId) },
      { label: 'Télécharger PDF', icon: icons?.telecharger, onClick: () => actions.telecharger(devisId) },
      { label: 'Partager', icon: icons?.partager, onClick: () => actions.partager(devisId) },
      { type: 'separator' },
      { label: 'Supprimer', icon: icons?.supprimer, onClick: () => actions.supprimer(devisId), danger: true },
    ],
  };
}

/**
 * Preset actions for Facture list items
 */
export function useFactureActions(factureId, options = {}) {
  const actions = useQuickActions({ type: 'facture', itemId: factureId, ...options });

  return {
    ...actions,
    getQuickActions: (icons) => [
      {
        label: 'Relancer',
        icon: icons?.relancer,
        onClick: actions.openRelanceModal,
        loading: actions.isActionLoading('relancer'),
      },
      {
        label: 'Voir',
        icon: icons?.voir,
        onClick: () => actions.voir(factureId),
      },
      {
        label: 'Télécharger',
        icon: icons?.telecharger,
        onClick: () => actions.telecharger(factureId),
        loading: actions.isActionLoading('telecharger'),
      },
      {
        label: 'Partager',
        icon: icons?.partager,
        onClick: () => actions.partager(factureId),
      },
    ],
  };
}

/**
 * Preset actions for Chantier list items
 */
export function useChantierActions(chantierId, chantierData = {}, options = {}) {
  const actions = useQuickActions({ type: 'chantier', itemId: chantierId, ...options });

  return {
    ...actions,
    getQuickActions: (icons) => [
      {
        label: 'Voir',
        icon: icons?.voir,
        onClick: () => actions.voir(chantierId),
      },
      {
        label: 'Documenter',
        icon: icons?.documenter,
        onClick: () => console.log('Open photo upload'),
      },
      {
        label: 'GPS',
        icon: icons?.gps,
        onClick: () => actions.gps(chantierData.adresse),
      },
      {
        label: 'Terminer',
        icon: icons?.terminer,
        onClick: () => actions.terminer(chantierId),
        loading: actions.isActionLoading('terminer'),
        disabled: chantierData.statut === 'termine',
      },
    ],
  };
}

/**
 * Preset actions for Client list items
 */
export function useClientActions(clientId, clientData = {}, options = {}) {
  const actions = useQuickActions({ type: 'client', itemId: clientId, ...options });

  return {
    ...actions,
    getQuickActions: (icons) => [
      {
        label: 'Voir',
        icon: icons?.voir,
        onClick: () => actions.voir(clientId),
      },
      {
        label: 'Appeler',
        icon: icons?.appeler,
        onClick: () => actions.appeler(clientData.telephone),
        disabled: !clientData.telephone,
      },
      {
        label: 'WhatsApp',
        icon: icons?.whatsapp,
        onClick: () => actions.whatsapp(clientData.telephone),
        disabled: !clientData.telephone,
      },
      {
        label: 'Email',
        icon: icons?.email,
        onClick: () => actions.email(clientData.email),
        disabled: !clientData.email,
      },
    ],
  };
}

export default useQuickActions;
