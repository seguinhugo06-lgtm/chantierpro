/**
 * useTresorerie - Standalone hook for treasury CRUD operations
 *
 * Manages previsions, settings, reglements, and mouvements.
 * - Demo mode: reads/writes localStorage (same keys as TresorerieModule used)
 * - Prod mode: reads/writes Supabase via saveItem/deleteItem from useSupabaseSync
 *
 * Does NOT live in DataContext (by design — tresorerie data stays separate).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import supabase, { isDemo, auth } from '../supabaseClient';
import { saveItem, deleteItem, FIELD_MAPPINGS } from './useSupabaseSync';
import { logger } from '../lib/logger';

// localStorage keys (same as TresorerieModule used before)
const STORAGE_KEY = 'cp_tresorerie_previsions';
const SETTINGS_KEY = 'cp_tresorerie_settings';
const SYNC_KEY = 'cp_tresorerie_synced_ids';
const REGLEMENTS_KEY = 'cp_tresorerie_reglements';
const MOUVEMENTS_KEY = 'cp_tresorerie_mouvements';

const DEFAULT_SETTINGS = {
  seuilAlerte: 5000,
  soldeInitial: 0,
  soldeDate: '2026-01-01',
  regimeTva: 'trimestriel',
  numeroTva: '',
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* silent */ }
}

export function useTresorerie() {
  const [userId, setUserId] = useState(null);
  const [previsions, setPrevisions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [reglements, setReglements] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // ── Auth: get userId on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    auth.getCurrentUser().then(user => {
      if (!cancelled && user?.id) setUserId(user.id);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (initialLoadDone.current) return;

    if (isDemo) {
      // Load and deduplicate previsions (fix for duplicated recurring instances)
      const rawPrevisions = loadFromStorage(STORAGE_KEY, []);
      const dedupSet = new Set();
      const cleanPrevisions = rawPrevisions.filter(p => {
        const d = new Date(p.date);
        const key = `${p.description}|${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}|${p.montant}|${p.type}`;
        if (dedupSet.has(key)) return false;
        dedupSet.add(key);
        return true;
      });
      // Save cleaned data back if duplicates were removed
      if (cleanPrevisions.length < rawPrevisions.length) {
        saveToStorage(STORAGE_KEY, cleanPrevisions);
      }
      setPrevisions(cleanPrevisions);
      setSettings(prev => ({ ...DEFAULT_SETTINGS, ...loadFromStorage(SETTINGS_KEY, {}) }));
      setReglements(loadFromStorage(REGLEMENTS_KEY, []));
      setMouvements(loadFromStorage(MOUVEMENTS_KEY, []));
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }

    if (!userId || !supabase) return;

    const fetchData = async () => {
      try {
        const [prevRes, settingsRes, regRes, mouvRes] = await Promise.all([
          supabase
            .from('tresorerie_previsions')
            .select('*')
            .eq('user_id', userId)
            .order('date_prevue', { ascending: false }),
          supabase
            .from('tresorerie_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('reglements')
            .select('*')
            .eq('user_id', userId)
            .order('date_reglement', { ascending: false })
            .then(r => r, () => ({ data: [] })),
          supabase
            .from('tresorerie_mouvements')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .then(r => r, () => ({ data: [] })),
        ]);

        const mappedPrev = (prevRes.data || []).map(FIELD_MAPPINGS.tresorerie_previsions.fromSupabase);
        const mappedSettings = settingsRes.data
          ? FIELD_MAPPINGS.tresorerie_settings.fromSupabase(settingsRes.data)
          : DEFAULT_SETTINGS;
        const mappedReg = (regRes.data || []).map(FIELD_MAPPINGS.reglements.fromSupabase);
        const mappedMouv = (mouvRes.data || []).map(FIELD_MAPPINGS.tresorerie_mouvements.fromSupabase);

        setPrevisions(mappedPrev);
        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...mappedSettings }));
        setReglements(mappedReg);
        setMouvements(mappedMouv);

        logger.debug('useTresorerie loaded:', {
          previsions: mappedPrev.length,
          reglements: mappedReg.length,
          mouvements: mappedMouv.length,
          hasSettings: !!settingsRes.data,
        });
      } catch (error) {
        console.error('useTresorerie: Error loading data:', error);
        // Fallback to localStorage if Supabase fails
        setPrevisions(loadFromStorage(STORAGE_KEY, []));
        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...loadFromStorage(SETTINGS_KEY, {}) }));
        setReglements(loadFromStorage(REGLEMENTS_KEY, []));
        setMouvements(loadFromStorage(MOUVEMENTS_KEY, []));
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    fetchData();
  }, [userId]);

  // ── Demo persistence ───────────────────────────────────────────────
  useEffect(() => {
    if (isDemo && initialLoadDone.current) {
      saveToStorage(STORAGE_KEY, previsions);
    }
  }, [previsions]);

  useEffect(() => {
    if (isDemo && initialLoadDone.current) {
      saveToStorage(SETTINGS_KEY, settings);
    }
  }, [settings]);

  useEffect(() => {
    if (isDemo && initialLoadDone.current) {
      saveToStorage(REGLEMENTS_KEY, reglements);
    }
  }, [reglements]);

  useEffect(() => {
    if (isDemo && initialLoadDone.current) {
      saveToStorage(MOUVEMENTS_KEY, mouvements);
    }
  }, [mouvements]);

  // ── Synced IDs (for auto-sync tracking) ────────────────────────────
  const getSyncedIds = useCallback(() => {
    return loadFromStorage(SYNC_KEY, { devis: [], depenses: [], acceptedDevis: [], paiements: [] });
  }, []);

  const saveSyncedIds = useCallback((ids) => {
    saveToStorage(SYNC_KEY, ids);
  }, []);

  // ── CRUD: Previsions ───────────────────────────────────────────────

  const addPrevision = useCallback(async (data) => {
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      statut: data.statut || 'prevu',
    };

    // Optimistic update
    setPrevisions(list => [...list, item]);

    if (!isDemo && userId) {
      try {
        await saveItem('tresorerie_previsions', item, userId);
      } catch (error) {
        console.error('useTresorerie: Error saving prevision:', error);
        // Keep optimistic update — localStorage fallback in demo
      }
    }

    return item;
  }, [userId]);

  const updatePrevision = useCallback(async (id, data) => {
    let updated = null;

    setPrevisions(list => list.map(p => {
      if (p.id === id) {
        updated = { ...p, ...data };
        return updated;
      }
      return p;
    }));

    if (!isDemo && userId && updated) {
      try {
        await saveItem('tresorerie_previsions', updated, userId);
      } catch (error) {
        console.error('useTresorerie: Error updating prevision:', error);
      }
    }

    return updated;
  }, [userId]);

  const deletePrevision = useCallback(async (id) => {
    // Also remove child recurring instances
    setPrevisions(list => list.filter(p => p.id !== id && p.recurrenceParentId !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('tresorerie_previsions', id, userId);
        // Also delete children from Supabase
        if (supabase) {
          await supabase
            .from('tresorerie_previsions')
            .delete()
            .eq('recurrence_parent_id', id)
            .eq('user_id', userId);
        }
      } catch (error) {
        console.error('useTresorerie: Error deleting prevision:', error);
      }
    }
  }, [userId]);

  const markAsPaid = useCallback(async (id) => {
    return updatePrevision(id, { statut: 'paye' });
  }, [updatePrevision]);

  // ── CRUD: Settings ─────────────────────────────────────────────────

  const updateSettings = useCallback(async (data) => {
    const newSettings = { ...settings, ...data };
    setSettings(newSettings);

    if (!isDemo && userId) {
      try {
        // Upsert: include userId for the unique constraint
        const toSave = { ...newSettings, id: newSettings.id || undefined };
        if (supabase) {
          const supabaseData = {
            ...FIELD_MAPPINGS.tresorerie_settings.toSupabase(toSave),
            user_id: userId,
          };
          const { data: result, error } = await supabase
            .from('tresorerie_settings')
            .upsert(supabaseData, { onConflict: 'user_id' })
            .select()
            .single();

          if (error) {
            console.error('useTresorerie: Error saving settings:', error);
          } else if (result) {
            const mapped = FIELD_MAPPINGS.tresorerie_settings.fromSupabase(result);
            setSettings(prev => ({ ...DEFAULT_SETTINGS, ...mapped }));
          }
        }
      } catch (error) {
        console.error('useTresorerie: Error saving settings:', error);
      }
    }
  }, [userId, settings]);

  // ── CRUD: Reglements ───────────────────────────────────────────────

  const addReglement = useCallback(async (data) => {
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
    };

    // Optimistic update
    setReglements(list => [item, ...list]);

    if (!isDemo && userId) {
      try {
        await saveItem('reglements', item, userId);
      } catch (error) {
        console.error('useTresorerie: Error saving reglement:', error);
      }
    }

    return item;
  }, [userId]);

  const deleteReglement = useCallback(async (id) => {
    setReglements(list => list.filter(r => r.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('reglements', id, userId);
      } catch (error) {
        console.error('useTresorerie: Error deleting reglement:', error);
      }
    }
  }, [userId]);

  // ── CRUD: Mouvements (tresorerie_mouvements) ───────────────────────

  const addMouvement = useCallback(async (data) => {
    // Calculate TVA fields if not provided
    const montant = parseFloat(data.montant) || 0;
    const tauxTva = data.tauxTva ?? 20;
    const montantHt = data.montantHt || (data.autoliquidation ? montant : montant / (1 + tauxTva / 100));
    const montantTva = data.montantTva || (data.autoliquidation ? 0 : montant - montantHt);

    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      montant,
      montantHt: Math.round(montantHt * 100) / 100,
      tauxTva,
      montantTva: Math.round(montantTva * 100) / 100,
      statut: data.statut || 'prevu',
      type: data.type || 'sortie',
      date: data.date || new Date().toISOString().slice(0, 10),
      createdAt: data.createdAt || new Date().toISOString(),
    };

    // Optimistic update
    setMouvements(list => [item, ...list]);

    if (!isDemo && userId) {
      try {
        await saveItem('tresorerie_mouvements', item, userId);
      } catch (error) {
        console.error('useTresorerie: Error saving mouvement:', error);
      }
    }

    return item;
  }, [userId]);

  const updateMouvement = useCallback(async (id, data) => {
    let updated = null;

    setMouvements(list => list.map(m => {
      if (m.id === id) {
        updated = { ...m, ...data };
        // Recalculate TVA if montant changed
        if (data.montant !== undefined) {
          const montant = parseFloat(data.montant) || 0;
          const tauxTva = data.tauxTva ?? updated.tauxTva ?? 20;
          const autoliq = data.autoliquidation ?? updated.autoliquidation ?? false;
          updated.montantHt = Math.round((autoliq ? montant : montant / (1 + tauxTva / 100)) * 100) / 100;
          updated.montantTva = Math.round((autoliq ? 0 : montant - updated.montantHt) * 100) / 100;
        }
        return updated;
      }
      return m;
    }));

    if (!isDemo && userId && updated) {
      try {
        await saveItem('tresorerie_mouvements', updated, userId);
      } catch (error) {
        console.error('useTresorerie: Error updating mouvement:', error);
      }
    }

    return updated;
  }, [userId]);

  const deleteMouvement = useCallback(async (id) => {
    // Also remove child recurring instances
    setMouvements(list => list.filter(m => m.id !== id && m.parentRecurringId !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('tresorerie_mouvements', id, userId);
        // Also delete children from Supabase
        if (supabase) {
          await supabase
            .from('tresorerie_mouvements')
            .delete()
            .eq('parent_recurring_id', id)
            .eq('user_id', userId);
        }
      } catch (error) {
        console.error('useTresorerie: Error deleting mouvement:', error);
      }
    }
  }, [userId]);

  const validerMouvement = useCallback(async (id) => {
    return updateMouvement(id, { statut: 'paye' });
  }, [updateMouvement]);

  // ── Mouvements KPIs ─────────────────────────────────────────────────

  const mouvementsKPIs = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalEntrees = 0;
    let totalSorties = 0;
    let entreesPrevu = 0;
    let sortiesPrevu = 0;
    let entreesThisMonth = 0;
    let sortiesThisMonth = 0;

    mouvements.forEach(m => {
      const d = new Date(m.date);
      const montant = parseFloat(m.montant) || 0;
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

      if (m.statut === 'paye') {
        if (m.type === 'entree') {
          totalEntrees += montant;
          if (isCurrentMonth) entreesThisMonth += montant;
        } else {
          totalSorties += montant;
          if (isCurrentMonth) sortiesThisMonth += montant;
        }
      } else if (m.statut === 'prevu') {
        if (m.type === 'entree') entreesPrevu += montant;
        else sortiesPrevu += montant;
      }
    });

    return {
      totalEntrees,
      totalSorties,
      entreesPrevu,
      sortiesPrevu,
      entreesThisMonth,
      sortiesThisMonth,
      soldeNet: totalEntrees - totalSorties,
    };
  }, [mouvements]);

  // ── Return ─────────────────────────────────────────────────────────

  return {
    // Previsions
    previsions,
    setPrevisions,
    loading,
    addPrevision,
    updatePrevision,
    deletePrevision,
    markAsPaid,

    // Settings
    settings,
    setSettings,
    updateSettings,

    // Reglements
    reglements,
    addReglement,
    deleteReglement,

    // Mouvements (tresorerie_mouvements)
    mouvements,
    setMouvements,
    addMouvement,
    updateMouvement,
    deleteMouvement,
    validerMouvement,
    mouvementsKPIs,

    // Sync helpers (for auto-sync in TresorerieModule)
    getSyncedIds,
    saveSyncedIds,
  };
}
