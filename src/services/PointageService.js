/**
 * PointageService - Smart time tracking with offline support
 * Sprint 1: Pointage Intelligent
 *
 * Features:
 * - Smart check-in/out with GPS validation
 * - Offline-first with IndexedDB sync queue
 * - Auto-pause detection
 * - Real-time tracking with persistence
 * - Work session management
 */

import { generateId } from '../lib/utils';
import { getCurrentPosition, checkGeofence, DEFAULT_RADIUS } from './GeofencingService';

// IndexedDB configuration
const DB_NAME = 'chantierpro_pointage';
const DB_VERSION = 1;
const STORES = {
  SESSIONS: 'sessions',
  POINTAGES: 'pointages',
  SYNC_QUEUE: 'sync_queue'
};

// Session states
export const SESSION_STATE = {
  IDLE: 'idle',
  WORKING: 'working',
  PAUSED: 'paused',
  BREAK: 'break'
};

// Storage key for active session
const ACTIVE_SESSION_KEY = 'chantierpro_active_session';

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Sessions store - active work sessions
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionsStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        sessionsStore.createIndex('employeId', 'employeId', { unique: false });
        sessionsStore.createIndex('chantierId', 'chantierId', { unique: false });
        sessionsStore.createIndex('date', 'date', { unique: false });
        sessionsStore.createIndex('state', 'state', { unique: false });
      }

      // Pointages store - completed time entries
      if (!db.objectStoreNames.contains(STORES.POINTAGES)) {
        const pointagesStore = db.createObjectStore(STORES.POINTAGES, { keyPath: 'id' });
        pointagesStore.createIndex('employeId', 'employeId', { unique: false });
        pointagesStore.createIndex('chantierId', 'chantierId', { unique: false });
        pointagesStore.createIndex('date', 'date', { unique: false });
        pointagesStore.createIndex('synced', 'synced', { unique: false });
      }

      // Sync queue - pending uploads
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Save data to IndexedDB store
 * @param {string} storeName - Store name
 * @param {Object} data - Data to save
 * @returns {Promise}
 */
async function saveToStore(storeName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get data from IndexedDB store
 * @param {string} storeName - Store name
 * @param {string} id - Record ID
 * @returns {Promise}
 */
async function getFromStore(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records from IndexedDB store
 * @param {string} storeName - Store name
 * @returns {Promise<Array>}
 */
async function getAllFromStore(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete from IndexedDB store
 * @param {string} storeName - Store name
 * @param {string} id - Record ID
 * @returns {Promise}
 */
async function deleteFromStore(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a new work session
 * @param {Object} params - Session parameters
 * @returns {Object} New session
 */
export function createSession({
  employeId,
  chantierId,
  chantierNom,
  position = null,
  note = ''
}) {
  const now = Date.now();
  return {
    id: generateId(),
    employeId,
    chantierId,
    chantierNom,
    date: new Date().toISOString().split('T')[0],
    state: SESSION_STATE.WORKING,
    startTime: now,
    endTime: null,
    totalWorkTime: 0,
    totalBreakTime: 0,
    breaks: [],
    pauses: [],
    startPosition: position,
    endPosition: null,
    note,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Start a new check-in
 * @param {Object} params - Check-in parameters
 * @returns {Promise<Object>} Session
 */
export async function checkIn({
  employeId,
  chantierId,
  chantierNom,
  chantierCoords = null,
  validateGPS = true,
  note = ''
}) {
  let position = null;

  // Validate GPS if required and chantier has coordinates
  if (validateGPS && chantierCoords?.latitude) {
    try {
      const gpsPosition = await getCurrentPosition();
      position = {
        latitude: gpsPosition.coords.latitude,
        longitude: gpsPosition.coords.longitude,
        accuracy: gpsPosition.coords.accuracy,
        timestamp: gpsPosition.timestamp
      };

      // Check if within geofence
      const geoCheck = checkGeofence(position, {
        latitude: chantierCoords.latitude,
        longitude: chantierCoords.longitude,
        radius: DEFAULT_RADIUS
      });

      if (!geoCheck.inside) {
        console.warn(`Check-in from ${geoCheck.distance}m away from site`);
        // Still allow but flag it
        position.outsideGeofence = true;
        position.distanceFromSite = geoCheck.distance;
      }
    } catch (error) {
      console.error('GPS check failed:', error);
      // Continue without GPS validation
    }
  }

  const session = createSession({
    employeId,
    chantierId,
    chantierNom,
    position,
    note
  });

  // Save to IndexedDB
  await saveToStore(STORES.SESSIONS, session);

  // Save to localStorage for quick access
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));

  // Add to sync queue if offline
  if (!navigator.onLine) {
    await addToSyncQueue('check_in', session);
  }

  return session;
}

/**
 * Check out and create pointage
 * @param {string} sessionId - Session ID
 * @param {Object} options - Checkout options
 * @returns {Promise<Object>} Pointage record
 */
export async function checkOut(sessionId, options = {}) {
  const session = await getFromStore(STORES.SESSIONS, sessionId);
  if (!session) throw new Error('Session non trouvee');

  const now = Date.now();

  // Get final position if GPS enabled
  let endPosition = null;
  if (options.validateGPS) {
    try {
      const gpsPosition = await getCurrentPosition();
      endPosition = {
        latitude: gpsPosition.coords.latitude,
        longitude: gpsPosition.coords.longitude,
        accuracy: gpsPosition.coords.accuracy,
        timestamp: gpsPosition.timestamp
      };
    } catch (error) {
      console.error('GPS check failed:', error);
    }
  }

  // Calculate total work time (excluding breaks and pauses)
  let totalWorkTime = now - session.startTime;

  // Subtract break time
  session.breaks.forEach(brk => {
    if (brk.endTime) {
      totalWorkTime -= (brk.endTime - brk.startTime);
    }
  });

  // Subtract pause time
  session.pauses.forEach(pause => {
    if (pause.endTime) {
      totalWorkTime -= (pause.endTime - pause.startTime);
    }
  });

  // If currently paused, don't count time since pause started
  if (session.state === SESSION_STATE.PAUSED && session.pauses.length > 0) {
    const lastPause = session.pauses[session.pauses.length - 1];
    if (!lastPause.endTime) {
      totalWorkTime -= (now - lastPause.startTime);
    }
  }

  // Convert to hours
  const heures = Math.max(0, Math.round((totalWorkTime / 3600000) * 10) / 10);

  // Create pointage record
  const pointage = {
    id: generateId(),
    employeId: session.employeId,
    chantierId: session.chantierId,
    date: session.date,
    heures,
    approuve: false,
    verrouille: false,
    manuel: false,
    note: options.note || session.note || '',
    // Smart clocking metadata
    sessionId: session.id,
    startTime: session.startTime,
    endTime: now,
    startPosition: session.startPosition,
    endPosition,
    breaks: session.breaks,
    synced: navigator.onLine,
    createdAt: now
  };

  // Save pointage
  await saveToStore(STORES.POINTAGES, pointage);

  // Update and close session
  const updatedSession = {
    ...session,
    state: SESSION_STATE.IDLE,
    endTime: now,
    endPosition,
    totalWorkTime,
    updatedAt: now
  };
  await saveToStore(STORES.SESSIONS, updatedSession);

  // Clear active session
  localStorage.removeItem(ACTIVE_SESSION_KEY);

  // Add to sync queue if offline
  if (!navigator.onLine) {
    await addToSyncQueue('check_out', pointage);
  }

  return pointage;
}

/**
 * Pause current session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export async function pauseSession(sessionId) {
  const session = await getFromStore(STORES.SESSIONS, sessionId);
  if (!session || session.state !== SESSION_STATE.WORKING) return session;

  const now = Date.now();
  const updatedSession = {
    ...session,
    state: SESSION_STATE.PAUSED,
    pauses: [...session.pauses, { startTime: now, endTime: null }],
    updatedAt: now
  };

  await saveToStore(STORES.SESSIONS, updatedSession);
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession));

  return updatedSession;
}

/**
 * Resume paused session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export async function resumeSession(sessionId) {
  const session = await getFromStore(STORES.SESSIONS, sessionId);
  if (!session || session.state !== SESSION_STATE.PAUSED) return session;

  const now = Date.now();

  // Close the last pause
  const pauses = [...session.pauses];
  if (pauses.length > 0) {
    const lastPause = pauses[pauses.length - 1];
    if (!lastPause.endTime) {
      pauses[pauses.length - 1] = { ...lastPause, endTime: now };
    }
  }

  const updatedSession = {
    ...session,
    state: SESSION_STATE.WORKING,
    pauses,
    updatedAt: now
  };

  await saveToStore(STORES.SESSIONS, updatedSession);
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession));

  return updatedSession;
}

/**
 * Start break
 * @param {string} sessionId - Session ID
 * @param {string} type - Break type ('lunch', 'coffee', 'other')
 * @returns {Promise<Object>} Updated session
 */
export async function startBreak(sessionId, type = 'other') {
  const session = await getFromStore(STORES.SESSIONS, sessionId);
  if (!session || session.state === SESSION_STATE.BREAK) return session;

  const now = Date.now();
  const updatedSession = {
    ...session,
    state: SESSION_STATE.BREAK,
    breaks: [...session.breaks, { startTime: now, endTime: null, type }],
    updatedAt: now
  };

  await saveToStore(STORES.SESSIONS, updatedSession);
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession));

  return updatedSession;
}

/**
 * End break
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export async function endBreak(sessionId) {
  const session = await getFromStore(STORES.SESSIONS, sessionId);
  if (!session || session.state !== SESSION_STATE.BREAK) return session;

  const now = Date.now();

  // Close the last break
  const breaks = [...session.breaks];
  if (breaks.length > 0) {
    const lastBreak = breaks[breaks.length - 1];
    if (!lastBreak.endTime) {
      breaks[breaks.length - 1] = { ...lastBreak, endTime: now };
    }
  }

  const updatedSession = {
    ...session,
    state: SESSION_STATE.WORKING,
    breaks,
    updatedAt: now
  };

  await saveToStore(STORES.SESSIONS, updatedSession);
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession));

  return updatedSession;
}

/**
 * Get active session from localStorage/IndexedDB
 * @returns {Promise<Object|null>}
 */
export async function getActiveSession() {
  // Try localStorage first for speed
  const cached = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (cached) {
    const session = JSON.parse(cached);
    if (session.state !== SESSION_STATE.IDLE) {
      return session;
    }
  }

  // Fallback to IndexedDB
  const sessions = await getAllFromStore(STORES.SESSIONS);
  const active = sessions.find(s =>
    s.state !== SESSION_STATE.IDLE &&
    s.date === new Date().toISOString().split('T')[0]
  );

  if (active) {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(active));
  }

  return active || null;
}

/**
 * Calculate elapsed time for a session
 * @param {Object} session - Session object
 * @returns {Object} { workSeconds, breakSeconds, totalSeconds }
 */
export function calculateElapsedTime(session) {
  if (!session || !session.startTime) {
    return { workSeconds: 0, breakSeconds: 0, totalSeconds: 0 };
  }

  const now = Date.now();
  let totalSeconds = Math.floor((now - session.startTime) / 1000);
  let breakSeconds = 0;

  // Calculate break time
  session.breaks?.forEach(brk => {
    const endTime = brk.endTime || now;
    breakSeconds += Math.floor((endTime - brk.startTime) / 1000);
  });

  // Calculate pause time
  session.pauses?.forEach(pause => {
    const endTime = pause.endTime || now;
    breakSeconds += Math.floor((endTime - pause.startTime) / 1000);
  });

  const workSeconds = Math.max(0, totalSeconds - breakSeconds);

  return { workSeconds, breakSeconds, totalSeconds };
}

/**
 * Format seconds to HH:MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatElapsedTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Add item to sync queue
 * @param {string} type - Action type
 * @param {Object} data - Data to sync
 */
async function addToSyncQueue(type, data) {
  await saveToStore(STORES.SYNC_QUEUE, {
    id: generateId(),
    type,
    data,
    timestamp: Date.now(),
    retries: 0
  });
}

/**
 * Get pending sync items
 * @returns {Promise<Array>}
 */
export async function getPendingSyncItems() {
  return getAllFromStore(STORES.SYNC_QUEUE);
}

/**
 * Get unsynced pointages
 * @returns {Promise<Array>}
 */
export async function getUnsyncedPointages() {
  const pointages = await getAllFromStore(STORES.POINTAGES);
  return pointages.filter(p => !p.synced);
}

/**
 * Mark pointage as synced
 * @param {string} id - Pointage ID
 */
export async function markPointageSynced(id) {
  const pointage = await getFromStore(STORES.POINTAGES, id);
  if (pointage) {
    await saveToStore(STORES.POINTAGES, { ...pointage, synced: true });
  }
}

/**
 * Clear sync queue item
 * @param {string} id - Item ID
 */
export async function clearSyncQueueItem(id) {
  await deleteFromStore(STORES.SYNC_QUEUE, id);
}

/**
 * Get today's sessions for an employee
 * @param {string} employeId
 * @returns {Promise<Array>}
 */
export async function getTodaySessions(employeId) {
  const today = new Date().toISOString().split('T')[0];
  const sessions = await getAllFromStore(STORES.SESSIONS);
  return sessions.filter(s => s.employeId === employeId && s.date === today);
}

/**
 * Get today's pointages for an employee
 * @param {string} employeId
 * @returns {Promise<Array>}
 */
export async function getTodayPointages(employeId) {
  const today = new Date().toISOString().split('T')[0];
  const pointages = await getAllFromStore(STORES.POINTAGES);
  return pointages.filter(p => p.employeId === employeId && p.date === today);
}

export default {
  initDB,
  checkIn,
  checkOut,
  pauseSession,
  resumeSession,
  startBreak,
  endBreak,
  getActiveSession,
  calculateElapsedTime,
  formatElapsedTime,
  getPendingSyncItems,
  getUnsyncedPointages,
  markPointageSynced,
  clearSyncQueueItem,
  getTodaySessions,
  getTodayPointages,
  SESSION_STATE
};
