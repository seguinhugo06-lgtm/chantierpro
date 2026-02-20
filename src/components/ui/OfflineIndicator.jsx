import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CheckCircle } from 'lucide-react';

/**
 * OfflineIndicator - Shows network status and pending sync count
 *
 * States:
 * - Offline: red banner with WifiOff icon
 * - Syncing (pending online): soft gray banner with spinning RefreshCw
 * - Success: brief green banner with CheckCircle "Tout est synchronisé ✓"
 * - Hidden: online with nothing pending
 *
 * Props:
 * @param {number} pendingCount - Number of pending operations to sync
 * @param {function} onSync - Callback to trigger manual sync
 * @param {boolean} isDark - Dark mode
 * @param {string} position - 'top' | 'bottom'
 */
export default function OfflineIndicator({
  pendingCount = 0,
  onSync,
  onForceClear,
  isDark = false,
  position = 'bottom',
  className = ''
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const syncAttempts = useRef(0);
  const prevPendingRef = useRef(pendingCount);

  // Listen for network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show brief "back online" message
      setShowBanner(true);
      setShowSuccess(true);
      setTimeout(() => { setShowBanner(false); setShowSuccess(false); }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setShowSuccess(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show banner initially if offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show success state when pending count drops to 0 after sync
  useEffect(() => {
    if (prevPendingRef.current > 0 && pendingCount === 0 && isOnline) {
      setShowSuccess(true);
      setShowBanner(true);
      setTimeout(() => { setShowSuccess(false); setShowBanner(false); }, 3000);
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount, isOnline]);

  const handleSync = async () => {
    if (!onSync || isSyncing) return;

    syncAttempts.current++;
    setIsSyncing(true);
    setSyncError(false);
    try {
      await onSync();
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(true);
      setShowBanner(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear error on successful sync (pending drops to 0)
  useEffect(() => {
    if (pendingCount === 0 && syncError) setSyncError(false);
  }, [pendingCount, syncError]);

  // Don't show if online and no pending items and no banner and no error
  if (isOnline && pendingCount === 0 && !showBanner && !syncError) {
    return null;
  }

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  // Softer colors: gray for pending sync, red for offline/error, green for success
  const bgColor = !isOnline
    ? 'bg-red-500'
    : syncError
      ? 'bg-red-500'
      : showSuccess
        ? 'bg-emerald-500'
        : pendingCount > 0
          ? 'bg-slate-600'
          : 'bg-emerald-500';

  return (
    <div
      className={`fixed ${positionClasses} z-40 px-4 py-2 ${bgColor} text-white text-sm transition-colors duration-300 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-3">
        {!isOnline ? (
          <>
            <WifiOff size={16} />
            <span>Mode hors ligne</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {pendingCount} en attente
              </span>
            )}
          </>
        ) : syncError ? (
          <button onClick={handleSync} className="flex items-center gap-2 cursor-pointer">
            <RefreshCw size={16} />
            <span>Erreur de sync — Appuyer pour réessayer</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {pendingCount} en attente
              </span>
            )}
          </button>
        ) : showSuccess ? (
          <>
            <CheckCircle size={16} />
            <span>Tout est synchronisé</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>Synchronisation{isSyncing ? '...' : ` — ${pendingCount} modification${pendingCount > 1 ? 's' : ''} en attente`}</span>
            {!isSyncing && (
              <button
                onClick={handleSync}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <RefreshCw size={12} />
                Synchroniser
              </button>
            )}
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span>Connexion rétablie</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * NetworkStatus - Compact network status indicator (for header/sidebar)
 */
export function NetworkStatus({ isDark = false, showLabel = true }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const textColor = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`flex items-center gap-2 text-sm ${textColor}`}
      role="status"
      aria-label={isOnline ? 'En ligne' : 'Hors ligne'}
    >
      {isOnline ? (
        <>
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          {showLabel && <span>En ligne</span>}
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {showLabel && <span className="text-red-500">Hors ligne</span>}
        </>
      )}
    </div>
  );
}

/**
 * useOnlineStatus - Hook for network status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
