import { useState, useEffect } from 'react';

/**
 * @typedef {Object} NetworkStatus
 * @property {boolean} online - Is the device online
 * @property {string} [effectiveType] - Connection type (slow-2g, 2g, 3g, 4g)
 * @property {number} [downlink] - Estimated bandwidth in Mbps
 * @property {number} [rtt] - Estimated round-trip time in ms
 * @property {boolean} saveData - User has requested reduced data usage
 */

/**
 * useNetworkStatus - Monitor network connection status
 *
 * @returns {NetworkStatus} Current network status
 *
 * @example
 * const { online, effectiveType } = useNetworkStatus();
 *
 * if (!online) {
 *   return <OfflineBanner />;
 * }
 *
 * if (effectiveType === 'slow-2g' || effectiveType === '2g') {
 *   return <SlowConnectionWarning />;
 * }
 */
export default function useNetworkStatus() {
  const [status, setStatus] = useState(() => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: undefined,
    downlink: undefined,
    rtt: undefined,
    saveData: false
  }));

  useEffect(() => {
    const updateStatus = () => {
      const connection = navigator?.connection ||
                        navigator?.mozConnection ||
                        navigator?.webkitConnection;

      setStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData || false
      });
    };

    // Initial update
    updateStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Listen for connection changes (where supported)
    const connection = navigator?.connection ||
                      navigator?.mozConnection ||
                      navigator?.webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}

/**
 * useOnlineStatus - Simple online/offline hook
 *
 * @returns {boolean} Is online
 *
 * @example
 * const isOnline = useOnlineStatus();
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

/**
 * Check if connection is slow
 *
 * @param {NetworkStatus} status - Network status object
 * @returns {boolean} Is connection slow
 */
export function isSlowConnection(status) {
  if (!status.online) return true;
  if (status.saveData) return true;
  if (status.effectiveType === 'slow-2g' || status.effectiveType === '2g') return true;
  if (status.rtt && status.rtt > 500) return true;
  if (status.downlink && status.downlink < 0.5) return true;
  return false;
}
