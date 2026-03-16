/**
 * GeofencingService - GPS-based proximity detection for smart clocking
 * Sprint 1: Pointage Intelligent
 *
 * Features:
 * - Detect when user is near a construction site (100m radius)
 * - Auto-suggest check-in when arriving at site
 * - Track location updates efficiently (battery-conscious)
 * - Support for multiple chantiers
 */

// Default geofence radius in meters
export const DEFAULT_RADIUS = 100;

// Minimum accuracy required for geofence checks (meters)
export const MIN_ACCURACY = 50;

// How often to check position when watching (ms)
const POSITION_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if geolocation is available
 * @returns {boolean}
 */
export function isGeolocationAvailable() {
  return 'geolocation' in navigator;
}

/**
 * Get current position with promise wrapper
 * @param {Object} options - Geolocation options
 * @returns {Promise<GeolocationPosition>}
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocation non disponible'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options
      }
    );
  });
}

/**
 * Check if a position is within a geofence
 * @param {Object} position - Current position { latitude, longitude }
 * @param {Object} geofence - Geofence { latitude, longitude, radius }
 * @returns {Object} { inside: boolean, distance: number }
 */
export function checkGeofence(position, geofence) {
  const distance = calculateDistance(
    position.latitude,
    position.longitude,
    geofence.latitude,
    geofence.longitude
  );

  return {
    inside: distance <= (geofence.radius || DEFAULT_RADIUS),
    distance: Math.round(distance)
  };
}

/**
 * Find all chantiers within range of current position
 * @param {Object} position - Current position { latitude, longitude }
 * @param {Array} chantiers - List of chantiers with GPS coordinates
 * @param {number} radius - Detection radius in meters
 * @returns {Array} Nearby chantiers with distance
 */
export function findNearbyChantiers(position, chantiers, radius = DEFAULT_RADIUS) {
  if (!position || !chantiers?.length) return [];

  return chantiers
    .filter(ch => ch.latitude && ch.longitude)
    .map(ch => {
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        ch.latitude,
        ch.longitude
      );
      return {
        ...ch,
        distance: Math.round(distance),
        isNearby: distance <= radius
      };
    })
    .filter(ch => ch.isNearby)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * GeofenceWatcher class - Monitors position for geofence events
 */
export class GeofenceWatcher {
  constructor(options = {}) {
    this.chantiers = [];
    this.radius = options.radius || DEFAULT_RADIUS;
    this.onEnter = options.onEnter || (() => {});
    this.onExit = options.onExit || (() => {});
    this.onError = options.onError || (() => {});
    this.watchId = null;
    this.currentChantier = null;
    this.lastPosition = null;
    this.isWatching = false;
  }

  /**
   * Update the list of chantiers to monitor
   * @param {Array} chantiers - Chantiers with GPS coordinates
   */
  setChantiers(chantiers) {
    this.chantiers = chantiers.filter(ch => ch.latitude && ch.longitude);
  }

  /**
   * Start watching for geofence events
   */
  start() {
    if (this.isWatching || !isGeolocationAvailable()) return false;

    this.isWatching = true;

    // Use watchPosition for continuous monitoring
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: POSITION_CHECK_INTERVAL
      }
    );

    return true;
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
    this.currentChantier = null;
  }

  /**
   * Handle position update
   * @param {GeolocationPosition} position
   */
  handlePositionUpdate(position) {
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    this.lastPosition = coords;

    // Skip if accuracy is too low
    if (coords.accuracy > MIN_ACCURACY * 2) {
      return;
    }

    // Find nearby chantiers
    const nearby = findNearbyChantiers(coords, this.chantiers, this.radius);
    const closestChantier = nearby[0] || null;

    // Check for enter/exit events
    if (closestChantier && !this.currentChantier) {
      // Entered a geofence
      this.currentChantier = closestChantier;
      this.onEnter(closestChantier, coords);
    } else if (!closestChantier && this.currentChantier) {
      // Exited all geofences
      const exitedChantier = this.currentChantier;
      this.currentChantier = null;
      this.onExit(exitedChantier, coords);
    } else if (closestChantier && this.currentChantier && closestChantier.id !== this.currentChantier.id) {
      // Changed to a different chantier
      const exitedChantier = this.currentChantier;
      this.currentChantier = closestChantier;
      this.onExit(exitedChantier, coords);
      this.onEnter(closestChantier, coords);
    }
  }

  /**
   * Handle geolocation error
   * @param {GeolocationPositionError} error
   */
  handleError(error) {
    console.error('Geolocation error:', error);
    this.onError(error);
  }

  /**
   * Get current status
   * @returns {Object}
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      currentChantier: this.currentChantier,
      lastPosition: this.lastPosition,
      chantiersMonitored: this.chantiers.length
    };
  }
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get geolocation permission status
 * @returns {Promise<string>} 'granted' | 'denied' | 'prompt'
 */
export async function getLocationPermission() {
  if (!navigator.permissions) {
    // Fallback: try to get position
    try {
      await getCurrentPosition({ timeout: 5000 });
      return 'granted';
    } catch {
      return 'prompt';
    }
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Request location permission
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestLocationPermission() {
  try {
    await getCurrentPosition({ timeout: 10000 });
    return true;
  } catch (error) {
    console.error('Location permission denied:', error);
    return false;
  }
}

export default {
  calculateDistance,
  isGeolocationAvailable,
  getCurrentPosition,
  checkGeofence,
  findNearbyChantiers,
  GeofenceWatcher,
  formatDistance,
  getLocationPermission,
  requestLocationPermission,
  DEFAULT_RADIUS,
  MIN_ACCURACY
};
