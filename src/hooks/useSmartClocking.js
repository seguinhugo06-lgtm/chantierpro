import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GeofenceWatcher,
  getCurrentPosition,
  findNearbyChantiers,
  getLocationPermission,
  requestLocationPermission,
  DEFAULT_RADIUS
} from '../services/GeofencingService';
import {
  getActiveSession,
  checkIn,
  checkOut,
  pauseSession,
  resumeSession,
  startBreak,
  endBreak,
  calculateElapsedTime,
  getPendingSyncItems,
  getUnsyncedPointages,
  markPointageSynced,
  clearSyncQueueItem,
  SESSION_STATE
} from '../services/PointageService';

/**
 * useSmartClocking - Hook for intelligent GPS-based time tracking
 * Sprint 1: Pointage Intelligent
 *
 * Provides:
 * - Geofence monitoring for construction sites
 * - Active session management
 * - Automatic check-in/out suggestions
 * - Offline sync queue management
 * - Location permission handling
 */
export default function useSmartClocking({
  employeId,
  chantiers = [],
  onPointageCreated,
  onGeofenceEnter,
  onGeofenceExit,
  enabled = true
}) {
  // State
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState({ workSeconds: 0, breakSeconds: 0, totalSeconds: 0 });
  const [nearbyChantiers, setNearbyChantiers] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [isWatching, setIsWatching] = useState(false);
  const [pendingSync, setPendingSync] = useState({ items: 0, pointages: 0 });
  const [showArrivalNotification, setShowArrivalNotification] = useState(false);
  const [arrivalChantier, setArrivalChantier] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs
  const watcherRef = useRef(null);
  const timerRef = useRef(null);
  const lastNotificationRef = useRef(null);

  // Initialize geofence watcher
  useEffect(() => {
    if (!enabled) return;

    const watcher = new GeofenceWatcher({
      radius: DEFAULT_RADIUS,
      onEnter: (chantier, position) => {
        // Don't show notification if already working or recently dismissed
        if (session) return;
        if (lastNotificationRef.current === chantier.id) return;

        setArrivalChantier(chantier);
        setShowArrivalNotification(true);
        lastNotificationRef.current = chantier.id;
        onGeofenceEnter?.(chantier, position);
      },
      onExit: (chantier, position) => {
        onGeofenceExit?.(chantier, position);
      },
      onError: (error) => {
        console.error('Geofence error:', error);
      }
    });

    watcherRef.current = watcher;

    return () => {
      watcher.stop();
    };
  }, [enabled, session, onGeofenceEnter, onGeofenceExit]);

  // Update chantiers in watcher
  useEffect(() => {
    if (watcherRef.current) {
      watcherRef.current.setChantiers(
        chantiers.filter(c => c.statut === 'en_cours' && c.latitude && c.longitude)
      );
    }
  }, [chantiers]);

  // Check and request location permission
  useEffect(() => {
    const checkPermission = async () => {
      const status = await getLocationPermission();
      setLocationPermission(status);

      if (status === 'granted' && watcherRef.current && enabled) {
        watcherRef.current.start();
        setIsWatching(true);
      }
    };

    checkPermission();
  }, [enabled]);

  // Load active session on mount
  useEffect(() => {
    const loadSession = async () => {
      const active = await getActiveSession();
      if (active && active.employeId === employeId) {
        setSession(active);
      }
    };

    if (employeId) {
      loadSession();
    }
  }, [employeId]);

  // Timer tick
  useEffect(() => {
    if (!session || session.state === SESSION_STATE.IDLE) {
      setElapsed({ workSeconds: 0, breakSeconds: 0, totalSeconds: 0 });
      return;
    }

    const tick = () => {
      setElapsed(calculateElapsedTime(session));
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [session]);

  // Check for pending sync items
  useEffect(() => {
    const checkPending = async () => {
      try {
        const items = await getPendingSyncItems();
        const pointages = await getUnsyncedPointages();
        setPendingSync({
          items: items.length,
          pointages: pointages.length
        });
      } catch (error) {
        console.error('Failed to check pending sync:', error);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 30000);
    return () => clearInterval(interval);
  }, []);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming online
      syncPendingItems();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Request location permission
  const requestPermission = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      setLocationPermission('granted');
      if (watcherRef.current && enabled) {
        watcherRef.current.start();
        setIsWatching(true);
      }
    }
    return granted;
  }, [enabled]);

  // Get current position
  const updatePosition = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      setCurrentPosition(coords);

      // Find nearby chantiers
      const nearby = findNearbyChantiers(coords, chantiers);
      setNearbyChantiers(nearby);

      return coords;
    } catch (error) {
      console.error('Failed to get position:', error);
      return null;
    }
  }, [chantiers]);

  // Handle check-in
  const handleCheckIn = useCallback(async (chantier, options = {}) => {
    if (!employeId || !chantier) return null;

    try {
      const newSession = await checkIn({
        employeId,
        chantierId: chantier.id,
        chantierNom: chantier.nom,
        chantierCoords: chantier.latitude ? {
          latitude: chantier.latitude,
          longitude: chantier.longitude
        } : null,
        validateGPS: locationPermission === 'granted',
        ...options
      });

      setSession(newSession);
      setShowArrivalNotification(false);
      setArrivalChantier(null);

      return newSession;
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  }, [employeId, locationPermission]);

  // Handle check-out
  const handleCheckOut = useCallback(async (options = {}) => {
    if (!session) return null;

    try {
      const pointage = await checkOut(session.id, {
        validateGPS: locationPermission === 'granted',
        ...options
      });

      setSession(null);
      onPointageCreated?.(pointage);

      return pointage;
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  }, [session, locationPermission, onPointageCreated]);

  // Handle pause toggle
  const handlePauseToggle = useCallback(async () => {
    if (!session) return null;

    try {
      let updated;
      if (session.state === SESSION_STATE.PAUSED) {
        updated = await resumeSession(session.id);
      } else if (session.state === SESSION_STATE.WORKING) {
        updated = await pauseSession(session.id);
      } else {
        return session;
      }

      setSession(updated);
      return updated;
    } catch (error) {
      console.error('Pause toggle failed:', error);
      throw error;
    }
  }, [session]);

  // Handle break toggle
  const handleBreakToggle = useCallback(async (type = 'coffee') => {
    if (!session) return null;

    try {
      let updated;
      if (session.state === SESSION_STATE.BREAK) {
        updated = await endBreak(session.id);
      } else {
        updated = await startBreak(session.id, type);
      }

      setSession(updated);
      return updated;
    } catch (error) {
      console.error('Break toggle failed:', error);
      throw error;
    }
  }, [session]);

  // Dismiss arrival notification
  const dismissArrivalNotification = useCallback(() => {
    setShowArrivalNotification(false);
    // Don't clear arrivalChantier so user can still check in manually
  }, []);

  // Sync pending items when online
  const syncPendingItems = useCallback(async () => {
    if (!isOnline) return;

    try {
      // Sync unsynced pointages
      const pointages = await getUnsyncedPointages();
      for (const pointage of pointages) {
        // Here you would send to your backend
        // await api.syncPointage(pointage);
        await markPointageSynced(pointage.id);
      }

      // Clear sync queue items
      const items = await getPendingSyncItems();
      for (const item of items) {
        // Here you would process the sync queue item
        // await api.processSync(item);
        await clearSyncQueueItem(item.id);
      }

      setPendingSync({ items: 0, pointages: 0 });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [isOnline]);

  // Start/stop geofence watching
  const startWatching = useCallback(() => {
    if (watcherRef.current && locationPermission === 'granted') {
      watcherRef.current.start();
      setIsWatching(true);
    }
  }, [locationPermission]);

  const stopWatching = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.stop();
      setIsWatching(false);
    }
  }, []);

  return {
    // Session state
    session,
    elapsed,
    isWorking: session?.state === SESSION_STATE.WORKING,
    isPaused: session?.state === SESSION_STATE.PAUSED,
    isOnBreak: session?.state === SESSION_STATE.BREAK,

    // Location state
    currentPosition,
    nearbyChantiers,
    locationPermission,
    isWatching,

    // Notification state
    showArrivalNotification,
    arrivalChantier,

    // Sync state
    pendingSync,
    isOnline,

    // Actions
    checkIn: handleCheckIn,
    checkOut: handleCheckOut,
    pauseToggle: handlePauseToggle,
    breakToggle: handleBreakToggle,
    dismissArrivalNotification,
    requestPermission,
    updatePosition,
    startWatching,
    stopWatching,
    syncPendingItems
  };
}
