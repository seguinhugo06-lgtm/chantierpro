/**
 * useEquipes Hook
 * Custom hook for managing equipes (teams) data
 *
 * @module useEquipes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

/**
 * @typedef {Object} Membre
 * @property {string} nom
 * @property {string} role
 * @property {string} [telephone]
 * @property {string} [email]
 */

/**
 * @typedef {Object} EquipeLoad
 * @property {number} total_hours
 * @property {number} capacite
 * @property {number} percentage
 * @property {boolean} overloaded
 * @property {number} available_hours
 */

/**
 * @typedef {Object} Equipe
 * @property {string} id
 * @property {string} nom
 * @property {string} [specialite]
 * @property {string} [couleur]
 * @property {Membre[]} membres
 * @property {number} capacite_heures_semaine
 * @property {number} [taux_horaire]
 * @property {boolean} actif
 * @property {EquipeLoad} [charge]
 */

/**
 * Hook for managing equipes
 *
 * @param {string} userId - User ID
 * @param {Object} [options] - Options
 * @param {boolean} [options.includeLoad=true] - Include load calculation
 * @param {boolean} [options.activeOnly=true] - Only fetch active equipes
 * @returns {Object} Equipes state and actions
 */
export function useEquipes(userId, options = {}) {
  const { includeLoad = true, activeOnly = true } = options;

  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch equipes
  const fetchEquipes = useCallback(async () => {
    if (!userId) {
      setEquipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (includeLoad) {
        // Use RPC function with load
        const { data, error: rpcError } = await supabase.rpc('get_equipes_with_load', {
          p_user_id: userId,
          p_week_start: new Date().toISOString().split('T')[0],
        });

        if (rpcError) throw rpcError;
        setEquipes(data || []);
      } else {
        // Direct query
        let query = supabase
          .from('equipes')
          .select('*')
          .eq('user_id', userId)
          .order('nom');

        if (activeOnly) {
          query = query.eq('actif', true);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;
        setEquipes(data || []);
      }
    } catch (err) {
      console.error('useEquipes: Error fetching equipes:', err);
      setError(err.message);

      // Fallback to direct query
      const { data } = await supabase
        .from('equipes')
        .select('*')
        .eq('user_id', userId)
        .eq('actif', true)
        .order('nom');

      setEquipes(data || []);
    } finally {
      setLoading(false);
    }
  }, [userId, includeLoad, activeOnly]);

  // Initial fetch
  useEffect(() => {
    fetchEquipes();
  }, [fetchEquipes]);

  // Create equipe
  const createEquipe = useCallback(
    async (equipeData) => {
      if (!userId) throw new Error('User ID required');

      const { data, error } = await supabase
        .from('equipes')
        .insert([{ ...equipeData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchEquipes();
      return data;
    },
    [userId, fetchEquipes]
  );

  // Update equipe
  const updateEquipe = useCallback(
    async (equipeId, updates) => {
      const { data, error } = await supabase
        .from('equipes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', equipeId)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchEquipes();
      return data;
    },
    [fetchEquipes]
  );

  // Delete equipe (soft delete)
  const deleteEquipe = useCallback(
    async (equipeId) => {
      const { error } = await supabase
        .from('equipes')
        .update({ actif: false })
        .eq('id', equipeId);

      if (error) throw error;

      // Refresh list
      await fetchEquipes();
    },
    [fetchEquipes]
  );

  // Get equipe by ID
  const getEquipe = useCallback(
    (equipeId) => {
      return equipes.find((e) => e.id === equipeId) || null;
    },
    [equipes]
  );

  // Get overloaded equipes
  const overloadedEquipes = useMemo(() => {
    return equipes.filter((e) => e.charge?.overloaded);
  }, [equipes]);

  // Get available equipes (not overloaded)
  const availableEquipes = useMemo(() => {
    return equipes.filter((e) => !e.charge?.overloaded);
  }, [equipes]);

  return {
    equipes,
    loading,
    error,
    refresh: fetchEquipes,
    createEquipe,
    updateEquipe,
    deleteEquipe,
    getEquipe,
    overloadedEquipes,
    availableEquipes,
  };
}

/**
 * Hook for checking equipe conflicts
 *
 * @param {string} equipeId - Equipe ID to check
 * @returns {Object} Conflict checking utilities
 */
export function useEquipeConflicts(equipeId) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check conflicts for a date range
  const checkConflicts = useCallback(
    async (chantierId, startDate, endDate) => {
      if (!equipeId) return [];

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('check_equipe_conflicts', {
          p_equipe_id: equipeId,
          p_chantier_id: chantierId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        });

        if (error) throw error;

        setConflicts(data || []);
        return data || [];
      } catch (err) {
        console.error('useEquipeConflicts: Error checking conflicts:', err);

        // Fallback: direct query
        const { data } = await supabase
          .from('chantiers')
          .select('id, nom, date_debut, date_fin, client:clients(nom)')
          .eq('equipe_id', equipeId)
          .neq('id', chantierId || '')
          .lte('date_debut', endDate.toISOString())
          .gte('date_fin', startDate.toISOString())
          .in('statut', ['planifie', 'en_cours']);

        setConflicts(data || []);
        return data || [];
      } finally {
        setLoading(false);
      }
    },
    [equipeId]
  );

  // Clear conflicts
  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    conflicts,
    loading,
    checkConflicts,
    clearConflicts,
    hasConflicts: conflicts.length > 0,
  };
}

/**
 * Hook for equipe load calculation
 *
 * @param {string} equipeId - Equipe ID
 * @param {Date} [weekStart] - Start of the week to calculate
 * @returns {Object} Load information
 */
export function useEquipeLoad(equipeId, weekStart = new Date()) {
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch load
  const fetchLoad = useCallback(async () => {
    if (!equipeId) {
      setLoad(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_equipe_load', {
        p_equipe_id: equipeId,
        p_week_start: weekStart.toISOString().split('T')[0],
      });

      if (error) throw error;
      setLoad(data);
    } catch (err) {
      console.error('useEquipeLoad: Error fetching load:', err);
      setLoad(null);
    } finally {
      setLoading(false);
    }
  }, [equipeId, weekStart]);

  useEffect(() => {
    fetchLoad();
  }, [fetchLoad]);

  return {
    load,
    loading,
    refresh: fetchLoad,
    percentage: load?.percentage || 0,
    isOverloaded: load?.overloaded || false,
    availableHours: load?.available_hours || 0,
  };
}

/**
 * Hook for equipe chantiers
 *
 * @param {string} equipeId - Equipe ID
 * @param {Object} [options] - Options
 * @param {Date} [options.startDate] - Start date
 * @param {Date} [options.endDate] - End date
 * @returns {Object} Chantiers information
 */
export function useEquipeChantiers(equipeId, options = {}) {
  const { startDate = new Date(), endDate } = options;

  const [chantiers, setChantiers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch chantiers
  const fetchChantiers = useCallback(async () => {
    if (!equipeId) {
      setChantiers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_equipe_chantiers', {
        p_equipe_id: equipeId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      });

      if (error) throw error;
      setChantiers(data || []);
    } catch (err) {
      console.error('useEquipeChantiers: Error fetching chantiers:', err);

      // Fallback
      const calculatedEndDate = endDate || new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      const { data } = await supabase
        .from('chantiers')
        .select('*, client:clients(nom, prenom)')
        .eq('equipe_id', equipeId)
        .lte('date_debut', calculatedEndDate.toISOString())
        .gte('date_fin', startDate.toISOString())
        .in('statut', ['planifie', 'en_cours'])
        .order('date_debut');

      setChantiers(data || []);
    } finally {
      setLoading(false);
    }
  }, [equipeId, startDate, endDate]);

  useEffect(() => {
    fetchChantiers();
  }, [fetchChantiers]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    return chantiers.reduce((sum, c) => sum + (c.heures_estimees || 8), 0);
  }, [chantiers]);

  return {
    chantiers,
    loading,
    refresh: fetchChantiers,
    totalHours,
    count: chantiers.length,
  };
}

export default useEquipes;
