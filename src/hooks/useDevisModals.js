import { useState, useCallback, useMemo } from 'react';

/**
 * Modal names for DevisPage
 * Using constants prevents typos and enables autocomplete
 */
export const DEVIS_MODALS = {
  CLIENT: 'client',
  ACOMPTE: 'acompte',
  PREVIEW: 'preview',
  CHANTIER: 'chantier',
  PDF_PREVIEW: 'pdfPreview',
  PAYMENT: 'payment',
  TEMPLATE_SELECTOR: 'templateSelector',
  SMART_WIZARD: 'smartWizard',
  SIGNATURE_PAD: 'signaturePad',
  DEVIS_WIZARD: 'devisWizard',
  CATALOG_BROWSER: 'catalogBrowser',
};

/**
 * useDevisModals - Centralized modal state management for DevisPage
 *
 * Replaces 10+ individual useState calls with a single state machine.
 * Only one modal can be open at a time (except for nested modals).
 *
 * @returns {Object} Modal state and handlers
 *
 * @example
 * const { activeModal, openModal, closeModal, isOpen } = useDevisModals();
 *
 * // Open a modal
 * openModal(DEVIS_MODALS.CLIENT);
 *
 * // Check if modal is open
 * if (isOpen(DEVIS_MODALS.CLIENT)) { ... }
 *
 * // In JSX
 * {isOpen(DEVIS_MODALS.CLIENT) && <ClientModal onClose={closeModal} />}
 */
export function useDevisModals() {
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);

  /**
   * Open a modal by name
   * @param {string} modalName - The modal to open (use DEVIS_MODALS constants)
   * @param {any} data - Optional data to pass to the modal
   */
  const openModal = useCallback((modalName, data = null) => {
    setActiveModal(modalName);
    setModalData(data);
  }, []);

  /**
   * Close the currently active modal
   */
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  /**
   * Check if a specific modal is open
   * @param {string} modalName - The modal to check
   * @returns {boolean}
   */
  const isOpen = useCallback((modalName) => {
    return activeModal === modalName;
  }, [activeModal]);

  /**
   * Toggle a modal's visibility
   * @param {string} modalName - The modal to toggle
   */
  const toggleModal = useCallback((modalName) => {
    setActiveModal(current => current === modalName ? null : modalName);
  }, []);

  /**
   * Legacy-compatible setters for gradual migration
   * These match the original useState setters: setShowClientModal(true)
   */
  const legacySetters = useMemo(() => ({
    setShowClientModal: (value) => value ? openModal(DEVIS_MODALS.CLIENT) : closeModal(),
    setShowAcompteModal: (value) => value ? openModal(DEVIS_MODALS.ACOMPTE) : closeModal(),
    setShowPreview: (value) => value ? openModal(DEVIS_MODALS.PREVIEW) : closeModal(),
    setShowChantierModal: (value) => value ? openModal(DEVIS_MODALS.CHANTIER) : closeModal(),
    setShowPdfPreview: (value) => value ? openModal(DEVIS_MODALS.PDF_PREVIEW) : closeModal(),
    setShowPaymentModal: (value) => value ? openModal(DEVIS_MODALS.PAYMENT) : closeModal(),
    setShowTemplateSelector: (value) => value ? openModal(DEVIS_MODALS.TEMPLATE_SELECTOR) : closeModal(),
    setShowSmartWizard: (value) => value ? openModal(DEVIS_MODALS.SMART_WIZARD) : closeModal(),
    setShowSignaturePad: (value) => value ? openModal(DEVIS_MODALS.SIGNATURE_PAD) : closeModal(),
    setShowDevisWizard: (value) => value ? openModal(DEVIS_MODALS.DEVIS_WIZARD) : closeModal(),
    setShowCatalogBrowser: (value) => value ? openModal(DEVIS_MODALS.CATALOG_BROWSER) : closeModal(),
  }), [openModal, closeModal]);

  /**
   * Legacy-compatible boolean states for gradual migration
   * These match the original useState values: showClientModal
   */
  const legacyStates = useMemo(() => ({
    showClientModal: activeModal === DEVIS_MODALS.CLIENT,
    showAcompteModal: activeModal === DEVIS_MODALS.ACOMPTE,
    showPreview: activeModal === DEVIS_MODALS.PREVIEW,
    showChantierModal: activeModal === DEVIS_MODALS.CHANTIER,
    showPdfPreview: activeModal === DEVIS_MODALS.PDF_PREVIEW,
    showPaymentModal: activeModal === DEVIS_MODALS.PAYMENT,
    showTemplateSelector: activeModal === DEVIS_MODALS.TEMPLATE_SELECTOR,
    showSmartWizard: activeModal === DEVIS_MODALS.SMART_WIZARD,
    showSignaturePad: activeModal === DEVIS_MODALS.SIGNATURE_PAD,
    showDevisWizard: activeModal === DEVIS_MODALS.DEVIS_WIZARD,
    showCatalogBrowser: activeModal === DEVIS_MODALS.CATALOG_BROWSER,
  }), [activeModal]);

  return {
    // New API
    activeModal,
    modalData,
    openModal,
    closeModal,
    isOpen,
    toggleModal,

    // Legacy API for gradual migration
    ...legacyStates,
    ...legacySetters,
  };
}

export default useDevisModals;
