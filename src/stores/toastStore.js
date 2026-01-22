import { create } from 'zustand';

/**
 * Toast Notification Store using Zustand
 *
 * Features:
 * - Multiple concurrent toasts
 * - Auto-dismiss with configurable duration
 * - Different types (success, error, warning, info)
 * - Action buttons support
 * - Animation-friendly
 */

/**
 * @typedef {Object} Toast
 * @property {string} id - Unique toast ID
 * @property {'success' | 'error' | 'warning' | 'info'} type - Toast type
 * @property {string} title - Toast title
 * @property {string} [message] - Optional message
 * @property {number} [duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @property {Object} [action] - Optional action button
 * @property {string} action.label - Action button label
 * @property {Function} action.onClick - Action button click handler
 * @property {boolean} [dismissible] - Whether toast can be manually dismissed
 */

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;

export const useToastStore = create((set, get) => ({
  /** @type {Toast[]} */
  toasts: [],

  /**
   * Add a toast notification
   * @param {Omit<Toast, 'id'>} toast - Toast configuration
   * @returns {string} Toast ID
   */
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? DEFAULT_DURATION;

    set((state) => {
      // Limit max toasts, remove oldest if needed
      let newToasts = [...state.toasts];
      if (newToasts.length >= MAX_TOASTS) {
        newToasts = newToasts.slice(1);
      }

      return {
        toasts: [...newToasts, { ...toast, id, dismissible: toast.dismissible ?? true }]
      };
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  /**
   * Remove a toast by ID
   * @param {string} id - Toast ID
   */
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  /**
   * Clear all toasts
   */
  clearAll: () => {
    set({ toasts: [] });
  },

  /**
   * Update a toast
   * @param {string} id - Toast ID
   * @param {Partial<Toast>} updates - Updates to apply
   */
  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      )
    }));
  }
}));

// Convenience toast functions
export const toast = {
  /**
   * Success toast
   * @param {string} title
   * @param {string} [message]
   * @param {Object} [options]
   */
  success: (title, message, options = {}) =>
    useToastStore.getState().addToast({
      type: 'success',
      title,
      message,
      ...options
    }),

  /**
   * Error toast
   * @param {string} title
   * @param {string} [message]
   * @param {Object} [options]
   */
  error: (title, message, options = {}) =>
    useToastStore.getState().addToast({
      type: 'error',
      title,
      message,
      duration: options.duration ?? 8000, // Errors stay longer
      ...options
    }),

  /**
   * Warning toast
   * @param {string} title
   * @param {string} [message]
   * @param {Object} [options]
   */
  warning: (title, message, options = {}) =>
    useToastStore.getState().addToast({
      type: 'warning',
      title,
      message,
      ...options
    }),

  /**
   * Info toast
   * @param {string} title
   * @param {string} [message]
   * @param {Object} [options]
   */
  info: (title, message, options = {}) =>
    useToastStore.getState().addToast({
      type: 'info',
      title,
      message,
      ...options
    }),

  /**
   * Promise toast - shows loading, then success/error
   * @param {Promise} promise
   * @param {Object} messages
   * @param {string} messages.loading
   * @param {string} messages.success
   * @param {string} messages.error
   */
  promise: async (promise, messages) => {
    const id = useToastStore.getState().addToast({
      type: 'info',
      title: messages.loading,
      duration: 0, // Don't auto-dismiss
      dismissible: false
    });

    try {
      const result = await promise;
      useToastStore.getState().updateToast(id, {
        type: 'success',
        title: messages.success,
        dismissible: true
      });
      // Auto-dismiss after update
      setTimeout(() => {
        useToastStore.getState().removeToast(id);
      }, DEFAULT_DURATION);
      return result;
    } catch (error) {
      useToastStore.getState().updateToast(id, {
        type: 'error',
        title: messages.error,
        message: error.message,
        dismissible: true
      });
      // Keep errors visible longer
      setTimeout(() => {
        useToastStore.getState().removeToast(id);
      }, 8000);
      throw error;
    }
  },

  /**
   * Dismiss a specific toast
   * @param {string} id
   */
  dismiss: (id) => useToastStore.getState().removeToast(id),

  /**
   * Dismiss all toasts
   */
  dismissAll: () => useToastStore.getState().clearAll()
};

export default useToastStore;
