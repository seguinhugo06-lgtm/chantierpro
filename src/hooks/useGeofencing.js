import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Geofencing Hook for ChantierPro
 *
 * Provides location-based features for field workers:
 * - Detect entry/exit from chantier zones
 * - Auto check-in/check-out suggestions
 * - Distance calculations to nearby chantiers
 * - Location context for voice notes & time tracking
 *
 * Usage:
 * const {
 *   currentLocation,
 *   nearbyChantiers,
 *   currentChantier,
 *   isAtChantier,
 *   distanceTo,
 *   requestPermission,
 *   permissionStatus,
 *   error
 * } = useGeofencing(chantiers, { radius: 100 });
 */

// Haversine formula for distance between two GPS points (in meters)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format distance for display
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Default geofence radius (100 meters)
const DEFAULT_RADIUS = 100;

export default function useGeofencing(chantiers = [], options = {}) {
  const {
    radius = DEFAULT_RADIUS,
    enableHighAccuracy = true,
    updateInterval = 30000, // 30 seconds
    onEnterChantier,
    onExitChantier,
    enabled = true
  } = options;

  // State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [error, setError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Refs
  const watchIdRef = useRef(null);
  const previousChantierRef = useRef(null);

  // Calculate nearby chantiers with distances
  const nearbyChantiers = currentLocation
    ? chantiers
        .filter(c => c.latitude && c.longitude)
        .map(c => ({
          ...c,
          distance: calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            c.latitude,
            c.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
    : [];

  // Find current chantier (within radius)
  const currentChantier = nearbyChantiers.find(c => c.distance <= radius) || null;
  const isAtChantier = currentChantier !== null;

  // Check for enter/exit events
  useEffect(() => {
    if (!currentChantier && previousChantierRef.current) {
      // User exited a chantier
      onExitChantier?.(previousChantierRef.current);
    } else if (currentChantier && !previousChantierRef.current) {
      // User entered a chantier
      onEnterChantier?.(currentChantier);
    } else if (currentChantier && previousChantierRef.current && currentChantier.id !== previousChantierRef.current.id) {
      // User moved from one chantier to another
      onExitChantier?.(previousChantierRef.current);
      onEnterChantier?.(currentChantier);
    }
    previousChantierRef.current = currentChantier;
  }, [currentChantier, onEnterChantier, onExitChantier]);

  // Request geolocation permission
  const requestPermission = useCallback(async () => {
    try {
      if (!navigator.geolocation) {
        setError('Geolocalisation non supportee');
        setPermissionStatus('unsupported');
        return false;
      }

      // Try to get current position (triggers permission prompt)
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            });
            setPermissionStatus('granted');
            setLastUpdate(new Date());
            setError(null);
            resolve(true);
          },
          (err) => {
            if (err.code === 1) {
              setPermissionStatus('denied');
              setError('Permission refusee');
            } else if (err.code === 2) {
              setPermissionStatus('unavailable');
              setError('Position indisponible');
            } else {
              setPermissionStatus('error');
              setError('Erreur de geolocalisation');
            }
            resolve(false);
          },
          { enableHighAccuracy, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch (err) {
      setError('Erreur lors de la demande de permission');
      return false;
    }
  }, [enableHighAccuracy]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setLastUpdate(new Date());
        setError(null);
      },
      (err) => {
        console.error('Geofencing error:', err);
        setError(err.message);
      },
      {
        enableHighAccuracy,
        timeout: 15000,
        maximumAge: updateInterval
      }
    );
    setIsWatching(true);
  }, [enableHighAccuracy, updateInterval]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsWatching(false);
    }
  }, []);

  // Calculate distance from current location to a specific point
  const distanceTo = useCallback((lat, lon) => {
    if (!currentLocation) return null;
    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      lat,
      lon
    );
  }, [currentLocation]);

  // Get nearest chantier
  const getNearestChantier = useCallback(() => {
    return nearbyChantiers[0] || null;
  }, [nearbyChantiers]);

  // Check if we're within radius of a specific chantier
  const isWithinRadius = useCallback((chantierId, customRadius = radius) => {
    const chantier = nearbyChantiers.find(c => c.id === chantierId);
    return chantier ? chantier.distance <= customRadius : false;
  }, [nearbyChantiers, radius]);

  // Auto-start watching if enabled and permission granted
  useEffect(() => {
    if (enabled && permissionStatus === 'granted' && !isWatching) {
      startWatching();
    }
    return () => stopWatching();
  }, [enabled, permissionStatus, isWatching, startWatching, stopWatching]);

  // Check permission status on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => {
          setPermissionStatus(result.state);
        };
      }).catch(() => {
        // Permissions API not supported, try geolocation directly
        if (navigator.geolocation) {
          setPermissionStatus('prompt');
        } else {
          setPermissionStatus('unsupported');
        }
      });
    }
  }, []);

  return {
    // Location state
    currentLocation,
    permissionStatus,
    error,
    isWatching,
    lastUpdate,

    // Chantier detection
    nearbyChantiers,
    currentChantier,
    isAtChantier,

    // Actions
    requestPermission,
    startWatching,
    stopWatching,

    // Utilities
    distanceTo,
    getNearestChantier,
    isWithinRadius,
    formatDistance
  };
}

/**
 * Hook for simulated geofencing (testing/demo purposes)
 * Useful when GPS is not available or for development
 */
export function useSimulatedGeofencing(chantiers = [], simulatedLocation = null) {
  const [location, setLocation] = useState(simulatedLocation);

  const nearbyChantiers = location
    ? chantiers
        .filter(c => c.latitude && c.longitude)
        .map(c => ({
          ...c,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            c.latitude,
            c.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
    : [];

  const simulateMoveTo = useCallback((lat, lon) => {
    setLocation({ latitude: lat, longitude: lon });
  }, []);

  const simulateMoveToChantier = useCallback((chantierId) => {
    const chantier = chantiers.find(c => c.id === chantierId);
    if (chantier?.latitude && chantier?.longitude) {
      setLocation({ latitude: chantier.latitude, longitude: chantier.longitude });
    }
  }, [chantiers]);

  return {
    currentLocation: location,
    nearbyChantiers,
    currentChantier: nearbyChantiers.find(c => c.distance <= 100) || null,
    isAtChantier: nearbyChantiers.some(c => c.distance <= 100),
    permissionStatus: 'simulated',
    simulateMoveTo,
    simulateMoveToChantier
  };
}
