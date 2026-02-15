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

      let result;
      switch (mutation.action) {
        case 'create':
          result = await handler.create?.(mutation.data);
          break;
        case 'update':
          result = await handler.update?.(mutation.data.id, mutation.data);
          break;
        case 'delete':
          result = await handler.delete?.(mutation.data.id);
          break;
        default:
          console.warn(`Action sync inconnue: ${mutation.action}`);
          await removeMutation(mutation.id);
          results.cleared++;
          continue;
      }

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
      const errStatus = error?.status || error?.statusCode || 0;
      // Permanent errors (table missing, RLS denied, bad schema) — remove, they'll never succeed
      const isPermanent = [400, 401, 403, 404, 406, 409, 422].includes(errStatus)
        || /not found|not acceptable|bad request|forbidden|unauthorized|does not exist|violates|row-level/i.test(errMsg);
      if (isPermanent) {
        console.warn(`Mutation ${mutation.id} erreur permanente, suppression:`, errMsg);
        await removeMutation(mutation.id);
        results.cleared++;
      } else {
        results.failed++;
        results.errors.push({ mutation, error: errMsg });
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
 * Enregistre les event listeners pour le retour en ligne
 * @param {Function} onOnline - Callback quand retour en ligne
 * @param {Function} onOffline - Callback quand passage hors ligne
 */
export const registerNetworkListeners = (onOnline, onOffline) => {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('ChantierPro: Retour en ligne, synchronisation...');
    onOnline?.();
  };

  const handleOffline = () => {
    console.log('ChantierPro: Passage hors ligne');
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
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
  registerNetworkListeners
};
