import { create } from 'zustand';

/**
 * Centralized Modal Store using Zustand
 *
 * Features:
 * - Stack-based modals (multiple can be open)
 * - Typed modal components
 * - Props passing and updating
 * - Animation-friendly close handling
 */

/**
 * @typedef {Object} Modal
 * @property {string} id - Unique modal ID
 * @property {string} component - Component name from registry
 * @property {Object} props - Props to pass to the modal component
 * @property {'sm' | 'md' | 'lg' | 'xl' | 'full'} size - Modal size
 * @property {boolean} closable - Whether the modal can be closed by clicking backdrop
 */

export const useModalStore = create((set, get) => ({
  /** @type {Modal[]} */
  modals: [],

  /**
   * Open a modal
   * @param {string} component - Component name from registry
   * @param {Object} props - Props to pass to component
   * @param {Object} options - Modal options
   * @returns {string} Modal ID
   */
  openModal: (component, props = {}, options = {}) => {
    const { size = 'md', closable = true } = options;
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    set((state) => ({
      modals: [...state.modals, { id, component, props, size, closable }]
    }));

    // Prevent body scroll when modal is open
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    return id;
  },

  /**
   * Close a specific modal by ID, or the topmost modal if no ID provided
   * @param {string} [id] - Modal ID to close
   */
  closeModal: (id) => {
    set((state) => {
      const newModals = id
        ? state.modals.filter((m) => m.id !== id)
        : state.modals.slice(0, -1);

      // Restore body scroll if no modals left
      if (newModals.length === 0 && typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }

      return { modals: newModals };
    });
  },

  /**
   * Close all modals
   */
  closeAll: () => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    set({ modals: [] });
  },

  /**
   * Update props of a specific modal
   * @param {string} id - Modal ID
   * @param {Object} newProps - New props to merge
   */
  updateModalProps: (id, newProps) => {
    set((state) => ({
      modals: state.modals.map((m) =>
        m.id === id ? { ...m, props: { ...m.props, ...newProps } } : m
      )
    }));
  },

  /**
   * Get the topmost modal
   * @returns {Modal|null}
   */
  getTopModal: () => {
    const { modals } = get();
    return modals.length > 0 ? modals[modals.length - 1] : null;
  },

  /**
   * Check if a specific modal is open
   * @param {string} component - Component name
   * @returns {boolean}
   */
  isModalOpen: (component) => {
    const { modals } = get();
    return modals.some((m) => m.component === component);
  }
}));

// Convenience functions for direct access without hooks
export const openModal = (component, props, options) =>
  useModalStore.getState().openModal(component, props, options);

export const closeModal = (id) =>
  useModalStore.getState().closeModal(id);

export const closeAllModals = () =>
  useModalStore.getState().closeAll();

// Shortcut functions for common modals
export const modals = {
  // Devis
  newDevis: (props = {}) => openModal('new-devis', props, { size: 'lg' }),
  devisDetail: (devisId, props = {}) =>
    openModal('devis-detail', { devisId, ...props }, { size: 'xl' }),
  sendDevis: (devisId, props = {}) =>
    openModal('send-devis', { devisId, ...props }),

  // Factures
  newFacture: (props = {}) => openModal('new-facture', props, { size: 'lg' }),
  factureDetail: (factureId, props = {}) =>
    openModal('facture-detail', { factureId, ...props }, { size: 'xl' }),
  facturesImpayees: (props = {}) =>
    openModal('factures-impayees', props, { size: 'lg' }),
  relance: (factureId, props = {}) =>
    openModal('relance', { factureId, ...props }),

  // Clients
  newClient: (props = {}) => openModal('new-client', props),
  clientDetail: (clientId, props = {}) =>
    openModal('client-detail', { clientId, ...props }, { size: 'lg' }),

  // Chantiers
  newChantier: (props = {}) => openModal('new-chantier', props, { size: 'lg' }),
  chantierDetail: (chantierId, props = {}) =>
    openModal('chantier-detail', { chantierId, ...props }, { size: 'xl' }),

  // Dashboard
  caDetail: (props = {}) => openModal('ca-detail', props, { size: 'lg' }),
  margeDetail: (props = {}) => openModal('marge-detail', props, { size: 'lg' }),
  devisEnAttente: (props = {}) =>
    openModal('devis-en-attente', props, { size: 'lg' }),

  // Confirmations
  confirm: (props = {}) =>
    openModal('confirm', props, { size: 'sm', closable: false }),
  success: (props = {}) =>
    openModal('success', props, { size: 'sm' }),

  // Generic
  alert: (title, message, props = {}) =>
    openModal('alert', { title, message, ...props }, { size: 'sm' }),
};

export default useModalStore;
