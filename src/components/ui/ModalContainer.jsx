import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';

/**
 * Registry of modal components
 * Each modal is lazy-loaded for code splitting
 *
 * To add a new modal:
 * 1. Create the component in src/components/modals/
 * 2. Add it to this registry with a unique key
 * 3. Open it using: useModalStore().openModal('key-name', props)
 */
const MODAL_REGISTRY = {
  // Utility modals (core - always available)
  'confirm': lazy(() => import('../modals/ConfirmModal')),
  'success': lazy(() => import('../modals/SuccessModal')),
  'alert': lazy(() => import('../modals/AlertModal'))

  // Future modals to be added:
  // 'new-devis': lazy(() => import('../modals/NewDevisModal')),
  // 'devis-detail': lazy(() => import('../modals/DevisDetailModal')),
  // 'send-devis': lazy(() => import('../modals/SendDevisModal')),
  // 'new-facture': lazy(() => import('../modals/NewFactureModal')),
  // 'facture-detail': lazy(() => import('../modals/FactureDetailModal')),
  // 'factures-impayees': lazy(() => import('../modals/FacturesImpayeesModal')),
  // 'relance': lazy(() => import('../modals/RelanceModal')),
  // 'new-client': lazy(() => import('../modals/NewClientModal')),
  // 'client-detail': lazy(() => import('../modals/ClientDetailModal')),
  // 'new-chantier': lazy(() => import('../modals/NewChantierModal')),
  // 'chantier-detail': lazy(() => import('../modals/ChantierDetailModal')),
  // 'ca-detail': lazy(() => import('../modals/CADetailModal')),
  // 'marge-detail': lazy(() => import('../modals/MargeDetailModal')),
  // 'devis-en-attente': lazy(() => import('../modals/DevisEnAttenteModal')),
};

/**
 * Size classes for modals
 */
const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[90vh]'
};

/**
 * Loading skeleton for lazy-loaded modals
 */
function ModalSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    </div>
  );
}

/**
 * Fallback component when modal is not found in registry
 */
function ModalNotFound({ component, onClose }) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center">
        <X size={32} className="text-danger-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Modal non trouvee
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-4">
        Le composant "{component}" n'existe pas dans le registre.
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        Fermer
      </button>
    </div>
  );
}

/**
 * ModalContainer - Renders all modals with animations
 *
 * Place this component once at the root of your app.
 * Uses Zustand store for state management.
 *
 * Features:
 * - Stack-based modals
 * - Lazy loading with code splitting
 * - Framer Motion animations
 * - Keyboard support (Escape to close)
 * - Click outside to close
 */
export default function ModalContainer() {
  const { modals, closeModal } = useModalStore();

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modals.length > 0) {
        const topModal = modals[modals.length - 1];
        if (topModal.closable !== false) {
          closeModal(topModal.id);
        }
      }
    };

    if (modals.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [modals, closeModal]);

  return (
    <AnimatePresence mode="sync">
      {modals.map((modal, index) => {
        const Component = MODAL_REGISTRY[modal.component];

        return (
          <motion.div
            key={modal.id}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 50 + index }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (modal.closable !== false) {
                  closeModal(modal.id);
                }
              }}
            />

            {/* Modal */}
            <motion.div
              className={`
                relative w-full ${sizeClasses[modal.size]}
                bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden
                max-h-[90vh] flex flex-col
              `}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: 'spring',
                duration: 0.3,
                bounce: 0.1
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Close button (if closable) */}
              {modal.closable !== false && (
                <button
                  onClick={() => closeModal(modal.id)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              )}

              {/* Modal content */}
              <Suspense fallback={<ModalSkeleton />}>
                {Component ? (
                  <Component
                    {...modal.props}
                    modalId={modal.id}
                    onClose={() => closeModal(modal.id)}
                  />
                ) : (
                  <ModalNotFound
                    component={modal.component}
                    onClose={() => closeModal(modal.id)}
                  />
                )}
              </Suspense>
            </motion.div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
