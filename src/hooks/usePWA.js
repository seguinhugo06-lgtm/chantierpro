/**
 * usePWA Hook
 * React hook for PWA features: install prompt, update handling, offline sync
 */

import * as React from 'react';
import {
  initServiceWorker,
  isPWAInstalled,
  onInstallPrompt,
  addToSyncQueue,
  getSyncQueue,
  setupOnlineSync,
  processSyncQueue,
} from '../registerSW';

/**
 * @typedef {Object} UsePWAReturn
 * @property {boolean} isInstalled - Whether app is installed as PWA
 * @property {boolean} canInstall - Whether install prompt is available
 * @property {() => Promise<void>} install - Trigger install prompt
 * @property {boolean} needsRefresh - Whether a new version is available
 * @property {() => Promise<void>} refresh - Apply update and refresh
 * @property {boolean} isOffline - Whether user is offline
 * @property {boolean} offlineReady - Whether app is ready for offline use
 * @property {number} pendingSyncCount - Number of pending sync operations
 * @property {(type: string, data: Object) => string} queueSync - Add operation to sync queue
 */

/**
 * React hook for PWA features
 * @param {Object} syncHandlers - Handlers for processing sync queue
 * @returns {UsePWAReturn}
 */
export function usePWA(syncHandlers = {}) {
  const [isInstalled, setIsInstalled] = React.useState(isPWAInstalled());
  const [canInstall, setCanInstall] = React.useState(false);
  const [needsRefresh, setNeedsRefresh] = React.useState(false);
  const [offlineReady, setOfflineReady] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = React.useState(getSyncQueue().length);

  const updateSWRef = React.useRef(null);
  const installPromptRef = React.useRef(null);

  // Initialize service worker
  React.useEffect(() => {
    const sw = initServiceWorker({
      onNeedRefresh: (needs) => setNeedsRefresh(needs),
      onOfflineReady: () => setOfflineReady(true),
      onRegisterError: (error) => console.error('SW Error:', error),
    });

    updateSWRef.current = sw.updateSW;

    // Setup install prompt listener
    const promptHandler = onInstallPrompt(() => {
      setCanInstall(true);
    });
    installPromptRef.current = promptHandler;

    // Listen for app installed event
    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // Handle online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keep syncHandlers in a ref to avoid re-running the effect on every render
  const syncHandlersRef = React.useRef(syncHandlers);
  React.useEffect(() => {
    syncHandlersRef.current = syncHandlers;
  }, [syncHandlers]);

  // Setup online sync (runs once, uses ref for latest handlers)
  React.useEffect(() => {
    const cleanup = setupOnlineSync(syncHandlersRef.current);

    // Listen for sync complete events
    const handleSyncComplete = () => {
      setPendingSyncCount(getSyncQueue().length);
    };
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      cleanup();
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update pending sync count periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPendingSyncCount(getSyncQueue().length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Trigger install prompt
   */
  const install = React.useCallback(async () => {
    if (!installPromptRef.current?.canPrompt()) {
      console.log('Install prompt not available');
      return;
    }

    const result = await installPromptRef.current.prompt();
    console.log('Install result:', result.outcome);

    if (result.outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
    }
  }, []);

  /**
   * Apply update and refresh
   */
  const refresh = React.useCallback(async () => {
    if (updateSWRef.current) {
      await updateSWRef.current();
    }
    window.location.reload();
  }, []);

  /**
   * Add operation to sync queue
   */
  const queueSync = React.useCallback((type, data) => {
    const id = addToSyncQueue(type, data);
    setPendingSyncCount(getSyncQueue().length);
    return id;
  }, []);

  return {
    isInstalled,
    canInstall,
    install,
    needsRefresh,
    refresh,
    isOffline,
    offlineReady,
    pendingSyncCount,
    queueSync,
  };
}

export default usePWA;
