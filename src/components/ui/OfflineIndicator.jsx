import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';

/**
 * OfflineIndicator - Shows network status and pending sync count
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
  isDark = false,
  position = 'bottom',
  className = ''
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Listen for network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show brief "back online" message
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
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

  const handleSync = async () => {
    if (!onSync || isSyncing) return;

    setIsSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0 && !showBanner) {
    return null;
  }

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  const bgColor = !isOnline
    ? 'bg-red-500'
    : pendingCount > 0
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div
      className={`fixed ${positionClasses} z-40 px-4 py-2 ${bgColor} text-white text-sm ${className}`}
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
        ) : pendingCount > 0 ? (
          <>
            <CloudOff size={16} />
            <span>{pendingCount} modification{pendingCount > 1 ? 's' : ''} non synchronisée{pendingCount > 1 ? 's' : ''}</span>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sync...' : 'Synchroniser'}
            </button>
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
