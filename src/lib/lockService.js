/**
 * lockService.js — Entity Locking Service
 *
 * Provides optimistic locking for concurrent editing.
 * Lock auto-expires after 5 minutes; heartbeat extends it.
 */

import { scopeToOrg, withOrgScope } from './queryHelper';

const DEMO_KEY = 'batigesti_demo_locks';
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Acquire a lock on an entity.
 * Uses UPSERT — if lock already exists and expired, takes it over.
 * If lock exists and is active by another user, returns { acquired: false }.
 *
 * @param {Object|null} supabase
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.userId
 * @param {string} [params.userName]
 * @param {string|null} [params.orgId]
 * @returns {Promise<{ acquired: boolean, lock: Object|null, lockedBy: string|null }>}
 */
export async function acquireLock(supabase, { entityType, entityId, userId, userName = '', orgId = null }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION);

  // Demo mode
  if (!supabase) {
    try {
      const locks = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const existingIdx = locks.findIndex(
        l => l.entity_type === entityType && l.entity_id === entityId
      );

      if (existingIdx >= 0) {
        const existing = locks[existingIdx];
        const isExpired = new Date(existing.expires_at) < now;
        const isMine = existing.user_id === userId;

        if (!isExpired && !isMine) {
          return { acquired: false, lock: existing, lockedBy: existing.user_name };
        }

        // Take over expired lock or refresh own lock
        locks[existingIdx] = {
          ...existing,
          user_id: userId,
          user_name: userName,
          locked_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        };
      } else {
        locks.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `lock-${Date.now()}`,
          entity_type: entityType,
          entity_id: entityId,
          user_id: userId,
          organization_id: orgId,
          user_name: userName,
          locked_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });
      }

      localStorage.setItem(DEMO_KEY, JSON.stringify(locks));
      return { acquired: true, lock: null, lockedBy: null };
    } catch (e) {
      console.warn('[lockService] Demo acquireLock error:', e.message);
      return { acquired: true, lock: null, lockedBy: null };
    }
  }

  // Production: first check for active lock by another user
  const { data: existing } = await supabase
    .from('entity_locks')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (existing) {
    const isExpired = new Date(existing.expires_at) < now;
    const isMine = existing.user_id === userId;

    if (!isExpired && !isMine) {
      return { acquired: false, lock: existing, lockedBy: existing.user_name };
    }

    // Update existing lock (take over or refresh)
    const { error } = await supabase
      .from('entity_locks')
      .update({
        user_id: userId,
        user_name: userName,
        locked_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        ...(orgId && orgId !== 'demo-org-id' ? { organization_id: orgId } : {}),
      })
      .eq('id', existing.id);

    if (error) {
      console.warn('[lockService] acquireLock update not available:', error.message);
    }
    return { acquired: true, lock: null, lockedBy: null };
  }

  // No existing lock — insert
  const data = withOrgScope({
    entity_type: entityType,
    entity_id: entityId,
    user_name: userName,
    locked_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }, userId, orgId);

  const { error } = await supabase
    .from('entity_locks')
    .insert(data);

  if (error) {
    // Conflict = someone else locked it between our check and insert
    if (error.code === '23505') {
      return { acquired: false, lock: null, lockedBy: 'un autre utilisateur' };
    }
    console.warn('[lockService] acquireLock insert not available:', error.message);
  }

  return { acquired: true, lock: null, lockedBy: null };
}

/**
 * Release a lock on an entity.
 *
 * @param {Object|null} supabase
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.userId
 */
export async function releaseLock(supabase, { entityType, entityId, userId }) {
  // Demo mode
  if (!supabase) {
    try {
      const locks = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const filtered = locks.filter(
        l => !(l.entity_type === entityType && l.entity_id === entityId && l.user_id === userId)
      );
      localStorage.setItem(DEMO_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[lockService] Demo releaseLock error:', e.message);
    }
    return;
  }

  const { error } = await supabase
    .from('entity_locks')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', userId);

  if (error) {
    console.warn('[lockService] releaseLock not available:', error.message);
  }
}

/**
 * Check if an entity is locked by another user.
 *
 * @param {Object|null} supabase
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.currentUserId
 * @returns {Promise<{ isLocked: boolean, lockedBy: string|null, lockedByMe: boolean, expiresAt: string|null }>}
 */
export async function checkLock(supabase, { entityType, entityId, currentUserId }) {
  const now = new Date();

  // Demo mode
  if (!supabase) {
    try {
      const locks = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const lock = locks.find(
        l => l.entity_type === entityType && l.entity_id === entityId
      );

      if (!lock || new Date(lock.expires_at) < now) {
        return { isLocked: false, lockedBy: null, lockedByMe: false, expiresAt: null };
      }

      return {
        isLocked: true,
        lockedBy: lock.user_name || 'Utilisateur',
        lockedByMe: lock.user_id === currentUserId,
        expiresAt: lock.expires_at,
      };
    } catch {
      return { isLocked: false, lockedBy: null, lockedByMe: false, expiresAt: null };
    }
  }

  const { data: lock, error } = await supabase
    .from('entity_locks')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (error || !lock) {
    return { isLocked: false, lockedBy: null, lockedByMe: false, expiresAt: null };
  }

  if (new Date(lock.expires_at) < now) {
    // Lock expired — clean up
    await supabase
      .from('entity_locks')
      .delete()
      .eq('id', lock.id)
      .catch(() => {});
    return { isLocked: false, lockedBy: null, lockedByMe: false, expiresAt: null };
  }

  return {
    isLocked: true,
    lockedBy: lock.user_name || 'Utilisateur',
    lockedByMe: lock.user_id === currentUserId,
    expiresAt: lock.expires_at,
  };
}

/**
 * Force release a lock (admin/owner only).
 *
 * @param {Object|null} supabase
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string} params.entityId
 */
export async function forceReleaseLock(supabase, { entityType, entityId }) {
  // Demo mode
  if (!supabase) {
    try {
      const locks = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const filtered = locks.filter(
        l => !(l.entity_type === entityType && l.entity_id === entityId)
      );
      localStorage.setItem(DEMO_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[lockService] Demo forceReleaseLock error:', e.message);
    }
    return;
  }

  const { error } = await supabase
    .from('entity_locks')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.warn('[lockService] forceReleaseLock not available:', error.message);
  }
}

/**
 * Cleanup expired locks (batch cleanup).
 * Call periodically to remove stale locks from the database.
 *
 * @param {Object|null} supabase
 */
export async function cleanupExpiredLocks(supabase) {
  const now = new Date().toISOString();

  if (!supabase) {
    try {
      const locks = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const active = locks.filter(l => new Date(l.expires_at) >= new Date());
      if (active.length !== locks.length) {
        localStorage.setItem(DEMO_KEY, JSON.stringify(active));
      }
    } catch {}
    return;
  }

  await supabase
    .from('entity_locks')
    .delete()
    .lt('expires_at', now)
    .catch((err) => {
      console.warn('[lockService] cleanupExpiredLocks not available:', err.message);
    });
}

/**
 * Start a heartbeat that extends the lock every 2 minutes.
 * Returns a cleanup function to stop the heartbeat.
 *
 * @param {Object|null} supabase
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.userId
 * @returns {Function} Cleanup function
 */
export function startHeartbeat(supabase, { entityType, entityId, userId }) {
  const extend = async () => {
    const newExpiry = new Date(Date.now() + LOCK_DURATION).toISOString();

    if (!supabase) {
      // Demo mode
      try {
        const locks = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
        const lock = locks.find(
          l => l.entity_type === entityType && l.entity_id === entityId && l.user_id === userId
        );
        if (lock) {
          lock.expires_at = newExpiry;
          localStorage.setItem(DEMO_KEY, JSON.stringify(locks));
        }
      } catch {}
      return;
    }

    await supabase
      .from('entity_locks')
      .update({ expires_at: newExpiry })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', userId)
      .catch(() => {});
  };

  const intervalId = setInterval(extend, HEARTBEAT_INTERVAL);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}
