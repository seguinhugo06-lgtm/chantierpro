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
