import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * AppContext - Global app settings (theme, brand, user preferences)
 * Reduces prop drilling for: isDark, couleur, modeDiscret, entreprise
 */

const AppContext = createContext(null);

export function AppProvider({ children, initialValues = {} }) {
  // Theme
  const [isDark, setIsDark] = useState(initialValues.isDark ?? false);

  // Brand color
  const [couleur, setCouleur] = useState(initialValues.couleur ?? '#f97316');

  // Discrete mode (hides sensitive financial data)
  const [modeDiscret, setModeDiscret] = useState(initialValues.modeDiscret ?? false);

  // Company info
  const [entreprise, setEntreprise] = useState(initialValues.entreprise ?? {
    nom: '',
    adresse: '',
    telephone: '',
    email: '',
    siret: '',
    tva_intra: '',
    logo: null,
    mention_devis: '',
    mention_facture: '',
    iban: '',
    bic: '',
    conditions_paiement: '30 jours'
  });

  // Toast/notification state
  const [toast, setToast] = useState(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    variant: 'danger',
    loading: false
  });

  // Show toast notification
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type, id: Date.now() });
    if (duration > 0) {
      setTimeout(() => setToast(null), duration);
    }
  }, []);

  // Hide toast
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Show confirm modal - returns a promise
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title: options.title || 'Confirmer',
        message: options.message || 'Êtes-vous sûr ?',
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        variant: options.variant || 'danger',
        loading: false,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  // Close confirm modal
  const closeConfirm = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Show alert (simple message)
  const alert = useCallback((message, title = 'Information') => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText: 'OK',
        cancelText: null,
        variant: 'info',
        loading: false,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null
      });
    });
  }, []);

  // Toggle dark mode
  const toggleDark = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  // Toggle discrete mode
  const toggleModeDiscret = useCallback(() => {
    setModeDiscret(prev => !prev);
  }, []);

  // Update company info
  const updateEntreprise = useCallback((updates) => {
    setEntreprise(prev => ({ ...prev, ...updates }));
  }, []);

  // Theme helper classes (memoized)
  const theme = useMemo(() => ({
    // Background colors
    cardBg: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    pageBg: isDark ? 'bg-slate-900' : 'bg-slate-50',

    // Input styling
    inputBg: isDark
      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',

    // Text colors
    textPrimary: isDark ? 'text-white' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-300' : 'text-slate-600',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',

    // Border colors
    borderColor: isDark ? 'border-slate-700' : 'border-slate-200',

    // Hover states
    hoverBg: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
  }), [isDark]);

  const value = useMemo(() => ({
    // State
    isDark,
    couleur,
    modeDiscret,
    entreprise,
    toast,
    theme,
    confirmModal,

    // Setters
    setIsDark,
    setCouleur,
    setModeDiscret,
    setEntreprise,

    // Actions
    toggleDark,
    toggleModeDiscret,
    updateEntreprise,
    showToast,
    hideToast,
    confirm,
    alert,
    closeConfirm
  }), [
    isDark, couleur, modeDiscret, entreprise, toast, theme, confirmModal,
    toggleDark, toggleModeDiscret, updateEntreprise, showToast, hideToast,
    confirm, alert, closeConfirm
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * useApp - Hook to access app context
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

/**
 * useTheme - Hook for theme-only access (lighter)
 */
export function useTheme() {
  const { isDark, couleur, theme } = useApp();
  return { isDark, couleur, ...theme };
}

/**
 * useToast - Hook for toast notifications
 */
export function useToast() {
  const { showToast, hideToast, toast } = useApp();
  return { showToast, hideToast, toast };
}

/**
 * useConfirm - Hook for confirmation dialogs
 * Usage:
 *   const { confirm, alert } = useConfirm();
 *   const confirmed = await confirm({ title: 'Delete?', message: 'This cannot be undone' });
 *   if (confirmed) { ... }
 */
export function useConfirm() {
  const { confirm, alert, confirmModal, closeConfirm } = useApp();
  return { confirm, alert, confirmModal, closeConfirm };
}

export default AppContext;
