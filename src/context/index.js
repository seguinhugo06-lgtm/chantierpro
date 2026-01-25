/**
 * Context Index
 * Import all context providers and hooks from here
 */

// App context (theme, brand, settings)
export {
  AppProvider,
  useApp,
  useTheme,
  useToast
} from './AppContext';

// Data context (clients, devis, chantiers, etc.)
export {
  DataProvider,
  useData,
  useClients,
  useDevis,
  useChantiers
} from './DataContext';

// Modal context (global modal management)
export {
  ModalProvider,
  useModalContext,
  useModalState
} from '../contexts/ModalContext';
