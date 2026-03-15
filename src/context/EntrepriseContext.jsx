/**
 * EntrepriseContext.jsx — Multi-entreprise Context
 *
 * Provides the active entreprise and list of entreprises to the app.
 * Placed between OrgProvider and DataProvider in the tree so that
 * DataContext can use entrepriseId for scoped data loading.
 *
 * On first mount (production), auto-migrates from localStorage
 * (cp_entreprise / cp_entreprises) into the Supabase `entreprises` table.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isDemo, auth } from '../supabaseClient';
import { useOrg } from './OrgContext';
import {
  loadEntreprises,
  getActiveEntreprise,
  createEntreprise,
  updateEntreprise as svcUpdateEntreprise,
  archiveEntreprise as svcArchiveEntreprise,
  setActiveEntreprise as svcSetActive,
  migrateFromLocalStorage,
  detectMigrationNeeded,
  fromSupabase,
} from '../services/entrepriseService';

const sb = isDemo ? null : supabase;

/**
 * @typedef {Object} EntrepriseContextValue
 * @property {Object[]} entreprises - All non-archived entreprises
 * @property {Object|null} activeEntreprise - The currently active entreprise
 * @property {string|null} entrepriseId - UUID of the active entreprise
 * @property {boolean} loading - True while loading
 * @property {boolean} hasMultiple - True when more than one entreprise exists
 * @property {Function} switchEntreprise - Switch to a different entreprise
 * @property {Function} refreshEntreprises - Reload the list
 * @property {Function} addEntreprise - Create a new entreprise
 * @property {Function} updateEntreprise - Update an entreprise
 * @property {Function} archiveEntreprise - Archive (soft-delete) an entreprise
 */

const EntrepriseContext = createContext(/** @type {EntrepriseContextValue} */ ({
  entreprises: [],
  activeEntreprise: null,
  entrepriseId: null,
  loading: true,
  hasMultiple: false,
  switchEntreprise: () => {},
  refreshEntreprises: () => {},
  addEntreprise: async () => null,
  updateEntreprise: async () => {},
  archiveEntreprise: async () => {},
}));

/**
 * Hook to access entreprise context
 * @returns {EntrepriseContextValue}
 */
export function useEntreprise() {
  return useContext(EntrepriseContext);
}

/**
 * EntrepriseProvider — resolves and manages multi-entreprise state.
 * Must be placed between OrgProvider and DataProvider.
 */
export function EntrepriseProvider({ children }) {
  const { orgId, loading: orgLoading } = useOrg();
  const [userId, setUserId] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [activeEntreprise, setActiveEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const migrationDoneRef = useRef(false);

  // ── Auth: track current user ──
  useEffect(() => {
    if (isDemo) {
      setUserId('demo-user-id');
      return;
    }

    const initAuth = async () => {
      const user = await auth.getCurrentUser();
      if (user?.id) setUserId(user.id);
    };
    initAuth();

    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setEntreprises([]);
        setActiveEntreprise(null);
        setLoading(false);
        migrationDoneRef.current = false;
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // ── Load entreprises once userId + orgId are ready ──
  const loadAll = useCallback(async (uid, oid) => {
    try {
      // Step 1: Auto-migrate from localStorage if needed (only once per session)
      if (!migrationDoneRef.current && detectMigrationNeeded()) {
        migrationDoneRef.current = true;
        try {
          await migrateFromLocalStorage(sb, { userId: uid, orgId: oid });
          console.log('[EntrepriseContext] Migration from localStorage completed');
        } catch (err) {
          console.warn('[EntrepriseContext] Migration skipped or failed:', err.message);
        }
      }

      // Step 2: Load entreprises
      const list = await loadEntreprises(sb, { userId: uid, orgId: oid });
      setEntreprises(list);

      // Step 3: Find active entreprise
      const active = list.find(e => e.isActive) || list[0] || null;
      setActiveEntreprise(active);

      // If there are entreprises but none is active, activate the first one
      if (list.length > 0 && !list.some(e => e.isActive)) {
        try {
          await svcSetActive(sb, { id: list[0].id, userId: uid, orgId: oid });
        } catch {}
      }

      return list;
    } catch (err) {
      console.error('[EntrepriseContext] Failed to load entreprises:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (!isDemo && orgLoading) return;
    loadAll(userId, orgId);
  }, [userId, orgId, orgLoading, loadAll]);

  // ── Actions ──

  /**
   * Switch to a different entreprise by ID
   */
  const switchEntreprise = useCallback(async (id) => {
    if (!userId || !id) return;

    try {
      await svcSetActive(sb, { id, userId, orgId });
      const target = entreprises.find(e => e.id === id);
      if (target) {
        // Update local state immediately
        setEntreprises(prev => prev.map(e => ({
          ...e,
          isActive: e.id === id,
        })));
        setActiveEntreprise({ ...target, isActive: true });
      } else {
        // Reload if not found locally
        await loadAll(userId, orgId);
      }
    } catch (err) {
      console.error('[EntrepriseContext] switchEntreprise error:', err);
    }
  }, [userId, orgId, entreprises, loadAll]);

  /**
   * Refresh the entreprises list
   */
  const refreshEntreprises = useCallback(async () => {
    if (!userId) return;
    await loadAll(userId, orgId);
  }, [userId, orgId, loadAll]);

  /**
   * Create a new entreprise
   */
  const addEntreprise = useCallback(async (data) => {
    if (!userId) return null;

    try {
      const created = await createEntreprise(sb, { data, userId, orgId });
      // Refresh the list
      await loadAll(userId, orgId);
      return created;
    } catch (err) {
      console.error('[EntrepriseContext] addEntreprise error:', err);
      throw err;
    }
  }, [userId, orgId, loadAll]);

  /**
   * Update an entreprise
   */
  const updateEntreprise = useCallback(async (id, data) => {
    if (!userId) return;

    // Update local state immediately (optimistic) so UI reacts right away
    setEntreprises(prev => prev.map(e => {
      if (e.id !== id) return e;
      return { ...e, ...data };
    }));

    // If this is the active entreprise, update it too
    setActiveEntreprise(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, ...data };
    });

    try {
      await svcUpdateEntreprise(sb, { id, data, userId });
    } catch (err) {
      // Log but don't throw — local state is already updated
      // This prevents the CGU modal (and similar flows) from staying open
      // when the DB column doesn't exist yet
      console.warn('[EntrepriseContext] updateEntreprise DB sync failed:', err.message || err);
    }
  }, [userId]);

  /**
   * Archive (soft-delete) an entreprise
   */
  const archiveEntreprise = useCallback(async (id) => {
    if (!userId) return;

    try {
      await svcArchiveEntreprise(sb, { id, userId, orgId });
      // Refresh the list (archive may have auto-activated another)
      await loadAll(userId, orgId);
    } catch (err) {
      console.error('[EntrepriseContext] archiveEntreprise error:', err);
      throw err;
    }
  }, [userId, orgId, loadAll]);

  const value = {
    entreprises,
    activeEntreprise,
    entrepriseId: activeEntreprise?.id || null,
    loading,
    hasMultiple: entreprises.length > 1,
    switchEntreprise,
    refreshEntreprises,
    addEntreprise,
    updateEntreprise,
    archiveEntreprise,
  };

  return (
    <EntrepriseContext.Provider value={value}>
      {children}
    </EntrepriseContext.Provider>
  );
}

export default EntrepriseContext;
