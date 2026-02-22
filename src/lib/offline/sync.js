/**
 * Module de synchronisation offline pour ChantierPro
 * Gere la file d'attente des mutations et la synchronisation automatique
 */

const DB_NAME = 'chantierpro-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-mutations';

/**
 * Ouvre la base IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

/**
 * Ajoute une mutation a la file d'attente
 * @param {string} action - Type d'action (create, update, delete)
 * @param {string} entity - Type d'entite (client, devis, chantier, etc.)
 * @param {Object} data - Donnees de la mutation
 * @returns {Promise<number>} ID de la mutation
 */
export const queueMutation = async (action, entity, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const mutation = {
      action,
      entity,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const request = store.add(mutation);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erreur queueMutation:', error);
    // Fallback localStorage si IndexedDB non disponible
    const pending = JSON.parse(localStorage.getItem('cp_pending_mutations') || '[]');
    const mutation = {
      id: Date.now(),
      action,
      entity,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };
    pending.push(mutation);
    localStorage.setItem('cp_pending_mutations', JSON.stringify(pending));
    return mutation.id;
  }
};

/**
 * Recupere toutes les mutations en attente
 * @returns {Promise<Array>} Liste des mutations
 */
export const getPendingMutations = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Fallback localStorage
    return JSON.parse(localStorage.getItem('cp_pending_mutations') || '[]');
  }
};

/**
 * Supprime une mutation de la file
 * @param {number} id - ID de la mutation
 */
export const removeMutation = async (id) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Fallback localStorage
    const pending = JSON.parse(localStorage.getItem('cp_pending_mutations') || '[]');
    localStorage.setItem('cp_pending_mutations', JSON.stringify(pending.filter(m => m.id !== id)));
  }
};

/**
 * Met à jour une mutation existante (ex: incrémenter retryCount)
 * @param {Object} mutation - La mutation mise à jour (doit avoir un id)
 */
const updateMutation = async (mutation) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.put(mutation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback localStorage
    const pending = JSON.parse(localStorage.getItem('cp_pending_mutations') || '[]');
    const idx = pending.findIndex(m => m.id === mutation.id);
    if (idx >= 0) pending[idx] = mutation;
    localStorage.setItem('cp_pending_mutations', JSON.stringify(pending));
  }
};

/** Maximum sync retry attempts before force-removing a mutation */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Exécute une fonction asynchrone avec retry et backoff exponentiel.
 * @param {Function} fn - Async function to execute
 * @param {number} maxAttempts - Maximum number of attempts (default 3)
 * @returns {Promise<*>} Result of fn()
 */
export const retryWithBackoff = async (fn, maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      // Don't retry permanent errors
      if (isPermanentError(e)) throw e;
      if (i < maxAttempts - 1) {
        const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e; // Final attempt failed
      }
    }
  }
};

/**
 * Détecte si une erreur est permanente (ne réussira jamais)
 * @param {Error|Object} error
 * @returns {boolean}
 */
const isPermanentError = (error) => {
  const errMsg = error?.message || String(error || '');
  const errStatus = error?.status || error?.statusCode || 0;
  const errCode = error?.code || '';

  // HTTP status codes that are permanent
  if ([400, 401, 403, 404, 406, 409, 422].includes(errStatus)) return true;

  // Postgres error codes (Supabase returns these via error.code)
  // 23xxx = integrity constraints, 42xxx = syntax/schema, 28xxx = auth
  if (/^(23|42|28)\d{3}$/.test(errCode)) return true;

  // Common permanent error messages
  if (/not found|not acceptable|bad request|forbidden|unauthorized|does not exist|violates|row-level|check constraint|unique constraint|foreign key|null value|duplicate key|permission denied|schema|invalid input/i.test(errMsg)) return true;

  return false;
};

/**
 * Synchronise toutes les mutations en attente
 * @param {Object} handlers - Handlers pour chaque type d'entite
 * @returns {Promise<Object>} Resultat de la synchronisation
 */
export const syncQueue = async (handlers) => {
  const mutations = await getPendingMutations();
  const results = { success: 0, failed: 0, cleared: 0, errors: [] };

  for (const mutation of mutations) {
    try {
      const handler = handlers[mutation.entity];
      if (!handler) {
        console.warn(`Handler non trouvé pour ${mutation.entity}, suppression`);
        await removeMutation(mutation.id);
        results.cleared++;
        continue;
      }

      // Auto-clear stale mutations older than 7 days
      if (Date.now() - (mutation.timestamp || 0) > 7 * 24 * 60 * 60 * 1000) {
        console.warn(`Mutation ${mutation.id} trop ancienne (>7j), suppression`);
        await removeMutation(mutation.id);
        results.cleared++;
        continue;
      }

      // Auto-clear mutations that have failed too many times
      const retryCount = mutation.retryCount || 0;
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn(`Mutation ${mutation.id} a échoué ${retryCount} fois, suppression définitive`);
        await removeMutation(mutation.id);
        results.cleared++;
        results.errors.push({
          mutation,
          error: `Échec après ${retryCount} tentatives`,
          permanent: true
        });
        continue;
      }

      let result;
      const execAction = async () => {
        switch (mutation.action) {
          case 'create': return await handler.create?.(mutation.data);
          case 'update': return await handler.update?.(mutation.data.id, mutation.data);
          case 'delete': return await handler.delete?.(mutation.data.id);
          default: return null;
        }
      };

      if (!['create', 'update', 'delete'].includes(mutation.action)) {
        console.warn(`Action sync inconnue: ${mutation.action}`);
        await removeMutation(mutation.id);
        results.cleared++;
        continue;
      }

      // Execute with exponential backoff (1s, 2s, 4s between retries)
      result = await retryWithBackoff(execAction, 2);

      // If handler silently refused (returned null/undefined), treat as cleared
      if (result === null || result === undefined) {
        console.warn(`Mutation ${mutation.id} rejetée par le handler (${mutation.entity}/${mutation.action}), suppression`);
        await removeMutation(mutation.id);
        results.cleared++;
        continue;
      }

      await removeMutation(mutation.id);
      results.success++;
    } catch (error) {
      console.error(`Erreur sync mutation ${mutation.id}:`, error);
      const errMsg = error?.message || '';

      if (isPermanentError(error)) {
        console.warn(`Mutation ${mutation.id} erreur permanente, suppression:`, errMsg);
        await removeMutation(mutation.id);
        results.cleared++;
        results.errors.push({ mutation, error: errMsg, permanent: true });
      } else {
        // Transient error — increment retry counter in-place
        const retryCount = (mutation.retryCount || 0) + 1;
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          // Max retries reached, remove it
          console.warn(`Mutation ${mutation.id} a atteint ${MAX_RETRY_ATTEMPTS} échecs, suppression:`, errMsg);
          await removeMutation(mutation.id);
          results.cleared++;
          results.errors.push({ mutation, error: `${errMsg} (après ${retryCount} tentatives)`, permanent: true });
        } else {
          // Update the mutation with incremented retry count
          try {
            await updateMutation({ ...mutation, retryCount, lastError: errMsg });
          } catch {
            // If we can't even update, just remove it
            await removeMutation(mutation.id);
            results.cleared++;
          }
          results.failed++;
          results.errors.push({ mutation, error: errMsg, retriesLeft: MAX_RETRY_ATTEMPTS - retryCount });
        }
      }
    }
  }

  return results;
};

/**
 * Supprime toutes les mutations en attente (purge)
 * @returns {Promise<void>}
 */
export const clearAllMutations = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    localStorage.setItem('cp_pending_mutations', '[]');
  }
};

/**
 * Compte le nombre de mutations en attente
 * @returns {Promise<number>}
 */
export const getPendingCount = async () => {
  const mutations = await getPendingMutations();
  return mutations.length;
};

/**
 * Hook de detection du statut reseau
 * @returns {Object} { isOnline, pendingCount }
 */
export const useNetworkStatus = () => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return { isOnline };
};

/**
 * Vérifie la connectivité réelle avec un fetch léger.
 * navigator.onLine est peu fiable (Chrome DevTools toggle, faux positifs).
 * @returns {Promise<boolean>}
 */
export const checkConnectivity = async () => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return navigator.onLine;
    // HEAD on /auth/v1/ is lightweight and always returns quickly
    const resp = await fetch(`${url}/auth/v1/`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(4000) });
    return resp.ok || resp.status === 401; // 401 = reachable but unauthorized = online
  } catch {
    return false;
  }
};

/**
 * Enregistre les event listeners pour le retour en ligne.
 * Utilise un ping réel pour éviter les faux offline (Chrome DevTools, etc.)
 * @param {Function} onOnline - Callback quand retour en ligne
 * @param {Function} onOffline - Callback quand passage hors ligne
 */
export const registerNetworkListeners = (onOnline, onOffline) => {
  if (typeof window === 'undefined') return () => {};

  let debounceTimer = null;

  const verifyAndNotify = async (browserSaysOnline) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const reallyOnline = await checkConnectivity();
      if (reallyOnline) {
        console.log('ChantierPro: Retour en ligne, synchronisation...');
        onOnline?.();
      } else if (!browserSaysOnline) {
        // Only declare offline if both browser AND ping agree
        console.log('ChantierPro: Passage hors ligne');
        onOffline?.();
      }
      // If browser says offline but ping succeeds → ignore (false alarm)
    }, 300); // 300ms debounce to absorb rapid online/offline toggling
  };

  const handleOnline = () => verifyAndNotify(true);
  const handleOffline = () => verifyAndNotify(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial check: if navigator.onLine is false, verify immediately
  if (!navigator.onLine) {
    verifyAndNotify(false);
  }

  return () => {
    clearTimeout(debounceTimer);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

export default {
  queueMutation,
  getPendingMutations,
  removeMutation,
  clearAllMutations,
  syncQueue,
  getPendingCount,
  useNetworkStatus,
  registerNetworkListeners,
  checkConnectivity,
  retryWithBackoff
};
