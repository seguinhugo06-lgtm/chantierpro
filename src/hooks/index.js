/**
 * Hooks Index
 * Import all custom hooks from here
 */

// Optimization hooks
export {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  usePrevious,
  useMemoizedCallback,
  useClientFilter,
  useDevisFilter,
  useChantierFilter,
  useChantierStats,
  useDashboardStats,
  useCatalogueFilter
} from './useOptimized';

// Re-export validation hook
export { useFormValidation } from '../lib/validation';

// Modal hooks
export { useModal, useMultiModal } from './useModal';

// Quick actions hook
export {
  useQuickActions,
  useDevisActions,
  useFactureActions,
  useChantierActions,
  useClientActions,
} from './useQuickActions';

// Keyboard shortcuts
export {
  default as useKeyboardShortcuts,
  useKeyboardShortcut,
  formatShortcut,
  COMMON_SHORTCUTS,
  groupShortcutsByCategory,
  CATEGORY_LABELS
} from './useKeyboardShortcuts';

// URL filter persistence
export { useFilteredURL } from './useFilteredURL';

// iOS keyboard avoiding
export { useKeyboardAvoiding } from './useKeyboardAvoiding';
