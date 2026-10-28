import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { checkLock, acquireLock, releaseLock, forceReleaseLock, startHeartbeat } from '../../lib/lockService';
import supabase, { isDemo } from '../../supabaseClient';
import { useConfirm } from '../../context/AppContext';

const CHECK_INTERVAL = 30000; // 30 seconds

/**
 * LockBanner — Shows a warning when an entity is locked by another user.
 * Automatically acquires a lock when mounted and releases on unmount.
 *
 * Props:
 *  - entityType: 'devis' | 'chantier' | 'facture'
 *  - entityId: string (UUID)
 *  - userId: string
 *  - userName: string
 *  - orgId: string|null
 *  - isDark, couleur
 */
export default function LockBanner({
  entityType,
  entityId,
  userId,
  userName = '',
  orgId = null,
  isDark: _isDark,
  couleur: _couleur,
}) {
  const [lockState, setLockState] = useState({ isLocked: false, lockedBy: null, lockedByMe: false });
  const heartbeatCleanup = useRef(null);
  const showConfirm = useConfirm();

  const sb = isDemo ? null : supabase;

  const refreshLock = useCallback(async () => {
    if (!entityId || !userId) return;
    const state = await checkLock(sb, { entityType, entityId, currentUserId: userId });
    setLockState(state);
  }, [sb, entityType, entityId, userId]);

  // Acquire lock on mount, release on unmount
  useEffect(() => {
    if (!entityId || !userId) return;

    let mounted = true;

    const init = async () => {
      const result = await acquireLock(sb, { entityType, entityId, userId, userName, orgId });
      if (!mounted) return;

      if (result.acquired) {
        // Start heartbeat
        heartbeatCleanup.current = startHeartbeat(sb, { entityType, entityId, userId });
        setLockState({ isLocked: false, lockedBy: null, lockedByMe: true });
      } else {
        setLockState({
          isLocked: true,
          lockedBy: result.lockedBy || 'un autre utilisateur',
          lockedByMe: false,
        });
      }
    };

    init().catch(console.error);

    // Periodic check
    const interval = setInterval(() => {
      if (mounted) refreshLock().catch(() => {});
    }, CHECK_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
      // Release lock
      releaseLock(sb, { entityType, entityId, userId }).catch(() => {});
      // Stop heartbeat
      if (heartbeatCleanup.current) {
        heartbeatCleanup.current();
        heartbeatCleanup.current = null;
      }
    };
  }, [sb, entityType, entityId, userId, userName, orgId]);

  const handleForceUnlock = async () => {
    const confirmed = await showConfirm(
      'Forcer le déverrouillage ?',
      `Ce document est actuellement verrouillé par ${lockState.lockedBy}. Forcer le déverrouillage pourrait entraîner des conflits si l'autre utilisateur est en train de modifier.`
    );
    if (!confirmed) return;

    await forceReleaseLock(sb, { entityType, entityId });
    // Re-acquire
    const result = await acquireLock(sb, { entityType, entityId, userId, userName, orgId });
    if (result.acquired) {
      heartbeatCleanup.current = startHeartbeat(sb, { entityType, entityId, userId });
      setLockState({ isLocked: false, lockedBy: null, lockedByMe: true });
    }
  };

  // Don't show if not locked by someone else
  if (!lockState.isLocked || lockState.lockedByMe) return null;

  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 bg-alerte-fond border-alerte-point/40 text-alerte-texte`}>
      <Lock size={18} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          Verrouillé par {lockState.lockedBy}
        </p>
        <p className={`text-xs text-alerte-texte`}>
          Ce document est en cours de modification par un autre utilisateur.
        </p>
      </div>
      <button
        onClick={handleForceUnlock}
        className="shrink-0 px-3 min-h-[44px] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors bg-surface text-alerte-texte border border-alerte-point/40 hover:brightness-95"
      >
        <Unlock size={12} />
        Déverrouiller
      </button>
    </div>
  );
}
