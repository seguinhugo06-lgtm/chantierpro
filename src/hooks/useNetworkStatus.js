import { useState, useEffect } from 'react';
import { checkConnectivity } from '../lib/offline/sync';

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
 * Uses real connectivity ping to avoid false offline from Chrome DevTools.
 */
export default function useNetworkStatus() {
  const [status, setStatus] = useState(() => ({
    online: true, // Optimistic
    effectiveType: undefined,
    downlink: undefined,
    rtt: undefined,
    saveData: false
  }));

  useEffect(() => {
    let timer = null;
    let lastOnline = true;

    const connection = navigator?.connection ||
                      navigator?.mozConnection ||
                      navigator?.webkitConnection;

    const getConnectionInfo = () => ({
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData || false
    });

    const verifyAndUpdate = (browserSaysOnline) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const reallyOnline = await checkConnectivity();
        if (reallyOnline && !lastOnline) {
          lastOnline = true;
          setStatus({ online: true, ...getConnectionInfo() });
        } else if (!reallyOnline && !browserSaysOnline && lastOnline) {
          lastOnline = false;
          setStatus({ online: false, ...getConnectionInfo() });
        }
      }, 500);
    };

    const handleOnline = () => verifyAndUpdate(true);
    const handleOffline = () => verifyAndUpdate(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (connection) connection.addEventListener('change', () => verifyAndUpdate(navigator.onLine));
    if (!navigator.onLine) verifyAndUpdate(false);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/**
 * useOnlineStatus - Simple online/offline hook with real ping verification
 *
 * @returns {boolean} Is online
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
