/**
 * Service Worker Registration
 * Handles PWA installation, updates, and offline sync
 */

import { registerSW } from 'virtual:pwa-register';

// Check if we're in a browser environment
const isSupported = 'serviceWorker' in navigator;

/**
 * @typedef {Object} SWRegistrationOptions
 * @property {(needRefresh: boolean) => void} [onNeedRefresh] - Called when update is available
 * @property {() => void} [onOfflineReady] - Called when app is ready for offline use
 * @property {(error: Error) => void} [onRegisterError] - Called on registration error
 */

/**
 * Initialize service worker with update handling
 * @param {SWRegistrationOptions} options
 * @returns {{ updateSW: () => Promise<void>, offlineReady: boolean, needRefresh: boolean }}
 */
export function initServiceWorker(options = {}) {
  const {
    onNeedRefresh = () => {},
    onOfflineReady = () => {},
    onRegisterError = (error) => console.error('SW registration failed:', error),
  } = options;

  let updateSW = null;
  let offlineReady = false;
  let needRefresh = false;

  if (!isSupported) {
    console.log('Service Worker not supported');
    return { updateSW: () => Promise.resolve(), offlineReady: false, needRefresh: false };
  }

  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh = true;
        onNeedRefresh(true);
        console.log('[SW] New content available, refresh needed');
      },
      onOfflineReady() {
        offlineReady = true;
        onOfflineReady();
        console.log('[SW] App ready to work offline');
      },
      onRegistered(registration) {
        console.log('[SW] Registered:', registration?.scope);

        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        onRegisterError(error);
      },
    });
  } catch (error) {
    console.error('[SW] Registration error:', error);
    onRegisterError(error);
  }

  return {
    updateSW: () => updateSW?.() || Promise.resolve(),
    offlineReady,
    needRefresh,
  };
}

/**
 * Background sync queue for offline operations
 * Stores operations to be synced when back online
 */
const SYNC_QUEUE_KEY = 'chantierpro_sync_queue';

/**
 * @typedef {Object} SyncOperation
 * @property {string} id - Unique operation ID
 * @property {string} type - Operation type (e.g., 'photo_upload', 'devis_create')
 * @property {Object} data - Operation data
 * @property {number} timestamp - When the operation was queued
 * @property {number} retries - Number of retry attempts
 */

/**
 * Add operation to sync queue
 * @param {string} type - Operation type
 * @param {Object} data - Operation data
 * @returns {string} Operation ID
 */
export function addToSyncQueue(type, data) {
  const queue = getSyncQueue();
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /** @type {SyncOperation} */
  const operation = {
    id,
    type,
    data,
    timestamp: Date.now(),
    retries: 0,
  };

  queue.push(operation);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

  console.log(`[Sync] Added to queue: ${type}`, id);
  return id;
}

/**
 * Get current sync queue
 * @returns {SyncOperation[]}
 */
export function getSyncQueue() {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Remove operation from sync queue
 * @param {string} id - Operation ID to remove
 */
export function removeFromSyncQueue(id) {
  const queue = getSyncQueue().filter(op => op.id !== id);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  console.log(`[Sync] Removed from queue: ${id}`);
}

/**
 * Clear entire sync queue
 */
export function clearSyncQueue() {
  localStorage.removeItem(SYNC_QUEUE_KEY);
  console.log('[Sync] Queue cleared');
}

/**
 * Process sync queue when online
 * @param {Object} handlers - Handlers for each operation type
 * @returns {Promise<{ success: number, failed: number }>}
 */
export async function processSyncQueue(handlers = {}) {
  if (!navigator.onLine) {
    console.log('[Sync] Offline, skipping queue processing');
    return { success: 0, failed: 0 };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`[Sync] Processing ${queue.length} queued operations`);

  let success = 0;
  let failed = 0;

  for (const operation of queue) {
    const handler = handlers[operation.type];

    if (!handler) {
      console.warn(`[Sync] No handler for type: ${operation.type}`);
      continue;
    }

    try {
      await handler(operation.data);
      removeFromSyncQueue(operation.id);
      success++;
      console.log(`[Sync] Success: ${operation.type}`, operation.id);
    } catch (error) {
      console.error(`[Sync] Failed: ${operation.type}`, error);

      // Update retry count
      operation.retries++;

      // Remove if too many retries
      if (operation.retries >= 3) {
        removeFromSyncQueue(operation.id);
        failed++;
        console.log(`[Sync] Max retries reached, removing: ${operation.id}`);
      } else {
        // Update in queue with new retry count
        const updatedQueue = getSyncQueue().map(op =>
          op.id === operation.id ? operation : op
        );
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
      }
    }
  }

  return { success, failed };
}

/**
 * Listen for online status and process queue
 * @param {Object} handlers - Handlers for each operation type
 */
export function setupOnlineSync(handlers = {}) {
  const handleOnline = async () => {
    console.log('[Sync] Back online, processing queue...');
    const result = await processSyncQueue(handlers);

    if (result.success > 0 || result.failed > 0) {
      // Dispatch custom event for UI notification
      window.dispatchEvent(new CustomEvent('sync-complete', {
        detail: result
      }));
    }
  };

  window.addEventListener('online', handleOnline);

  // Also process on load if online
  if (navigator.onLine) {
    setTimeout(handleOnline, 2000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Check if app is installed as PWA
 * @returns {boolean}
 */
export function isPWAInstalled() {
  // Check if running in standalone mode (installed PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Listen for PWA install prompt
 * @param {(event: BeforeInstallPromptEvent) => void} callback
 */
export function onInstallPrompt(callback) {
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    callback(e);
  });

  return {
    /**
     * Show the install prompt
     * @returns {Promise<{ outcome: 'accepted' | 'dismissed' }>}
     */
    async prompt() {
      if (!deferredPrompt) {
        return { outcome: 'dismissed' };
      }

      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      deferredPrompt = null;

      return result;
    },

    /**
     * Check if prompt is available
     * @returns {boolean}
     */
    canPrompt() {
      return deferredPrompt !== null;
    }
  };
}
