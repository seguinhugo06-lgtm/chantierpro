import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CheckCircle, Trash2 } from 'lucide-react';
import { checkConnectivity } from '../../lib/offline/sync';

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
  errorDetails = null, // { message, failedCount, permanentCount }
  isDark = false,
  position = 'bottom',
  className = ''
}) {
  const [isOnline, setIsOnline] = useState(true); // Optimistic
  const [showBanner, setShowBanner] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const syncAttempts = useRef(0);
  const prevPendingRef = useRef(pendingCount);
  const [isClearing, setIsClearing] = useState(false);

  // Listen for network changes with real connectivity check
  useEffect(() => {
    let timer = null;
    let lastState = true;

    const verifyAndSet = (browserSaysOnline) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const reallyOnline = await checkConnectivity();
        if (reallyOnline && !lastState) {
          lastState = true;
          setIsOnline(true);
          setShowBanner(true);
          setShowSuccess(true);
          setTimeout(() => { setShowBanner(false); setShowSuccess(false); }, 3000);
        } else if (!reallyOnline && !browserSaysOnline && lastState) {
          lastState = false;
          setIsOnline(false);
          setShowBanner(true);
          setShowSuccess(false);
        }
      }, 500);
    };

    const handleOnline = () => verifyAndSet(true);
    const handleOffline = () => verifyAndSet(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) verifyAndSet(false);

    return () => {
      clearTimeout(timer);
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

  const handleForceClear = async () => {
    if (!onForceClear || isClearing) return;
    setIsClearing(true);
    try {
      await onForceClear();
      setSyncError(false);
      syncAttempts.current = 0;
      setShowSuccess(true);
      setShowBanner(true);
      setTimeout(() => { setShowSuccess(false); setShowBanner(false); }, 3000);
    } catch (error) {
      console.error('Force clear failed:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Sync error state from parent errorDetails prop
  useEffect(() => {
    if (errorDetails) {
      setSyncError(true);
      setShowBanner(true);
    }
  }, [errorDetails]);

  const showClearButton = onForceClear && pendingCount > 0 && (syncError || syncAttempts.current >= 2);

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
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <RefreshCw size={16} className={`flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="truncate text-xs sm:text-sm">
                {errorDetails?.message || 'Impossible de sauvegarder vos modifications. Vérifiez votre connexion.'}
              </span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs flex-shrink-0">
                  {pendingCount} en attente
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                Réessayer
              </button>
              {showClearButton && (
                <button
                  onClick={handleForceClear}
                  disabled={isClearing}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors"
                  title="Rejeter les modifications bloquées pour éviter les données corrompues"
                >
                  <Trash2 size={12} />
                  Rejeter
                </button>
              )}
            </div>
          </div>
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
            {showClearButton && !isSyncing && (
              <button
                onClick={handleForceClear}
                disabled={isClearing}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors"
                title="Supprimer les modifications bloquées"
              >
                <Trash2 size={12} />
                Effacer
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
  const [isOnline, setIsOnline] = useState(true); // Optimistic

  useEffect(() => {
    let timer = null;
    let lastState = true;

    const verify = (browserSaysOnline) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const reallyOnline = await checkConnectivity();
        if (reallyOnline && !lastState) { lastState = true; setIsOnline(true); }
        else if (!reallyOnline && !browserSaysOnline && lastState) { lastState = false; setIsOnline(false); }
      }, 500);
    };

    window.addEventListener('online', () => verify(true));
    window.addEventListener('offline', () => verify(false));
    if (!navigator.onLine) verify(false);

    return () => clearTimeout(timer);
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
  const [isOnline, setIsOnline] = useState(true); // Optimistic

  useEffect(() => {
    let timer = null;
    let lastState = true;

    const verify = (browserSaysOnline) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const reallyOnline = await checkConnectivity();
        if (reallyOnline && !lastState) { lastState = true; setIsOnline(true); }
        else if (!reallyOnline && !browserSaysOnline && lastState) { lastState = false; setIsOnline(false); }
      }, 500);
    };

    const handleOnline = () => verify(true);
    const handleOffline = () => verify(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) verify(false);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
