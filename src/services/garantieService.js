/**
 * garantieService.js — CRUD + dashboard stats for warranty management
 *
 * Pattern: subcontractorService.js — demo mode via localStorage, prod via Supabase.
 *
 * Warranties are auto-created by a DB trigger (or in demo mode by receptionService)
 * when a reception is inserted. This service manages reading and updating them.
 *
 * Three statutory warranty types in French construction law:
 *  - Parfait achevement (1 year)  — Art. 1792-6 Code civil
 *  - Biennale (2 years)           — Art. 1792-3 Code civil
 *  - Decennale (10 years)         — Art. 1792 Code civil
 */

import { isDemo } from '../supabaseClient';
import { scopeToOrg, withOrgScope } from '../lib/queryHelper';

const DEMO_KEY = 'batigesti_garanties';

// ── Warranty type definitions ───────────────────────────────────────────────────

/**
 * Statutory warranty types with metadata
 */
export const GARANTIE_TYPES = {
  parfait_achevement: {
    label: 'Parfait achevement',
    duration: '1 an',
    years: 1,
    description: 'Tous defauts de conformite et malfacons (Art. 1792-6)',
    color: '#f59e0b',
  },
  biennale: {
    label: 'Garantie biennale',
    duration: '2 ans',
    years: 2,
    description: 'Elements d\'equipement dissociables (Art. 1792-3)',
    color: '#3b82f6',
  },
  decennale: {
    label: 'Garantie decennale',
    duration: '10 ans',
    years: 10,
    description: 'Solidite de l\'ouvrage et impropriete (Art. 1792)',
    color: '#8b5cf6',
  },
};

// ── Field mappings ──────────────────────────────────────────────────────────────

/**
 * Map a Supabase row (snake_case) to a camelCase JS object
 * @param {Object} row - Supabase row
 * @returns {Object|null}
 */
export function fromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    chantierId: row.chantier_id,
    receptionId: row.reception_id,
    typeGarantie: row.type_garantie,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    assureur: row.assureur,
    numeroPolice: row.numero_police,
    notes: row.notes,
    statut: row.statut,
    chantierNom: row.chantier_nom || row.chantiers?.nom || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map camelCase fields to snake_case for Supabase INSERT/UPDATE
 * @param {Object} data
 * @returns {Object}
 */
function toSupabase(data) {
  const row = {};
  if (data.chantierId !== undefined) row.chantier_id = data.chantierId;
  if (data.receptionId !== undefined) row.reception_id = data.receptionId;
  if (data.typeGarantie !== undefined) row.type_garantie = data.typeGarantie;
  if (data.dateDebut !== undefined) row.date_debut = data.dateDebut;
  if (data.dateFin !== undefined) row.date_fin = data.dateFin;
  if (data.assureur !== undefined) row.assureur = data.assureur;
  if (data.numeroPolice !== undefined) row.numero_police = data.numeroPolice;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.statut !== undefined) row.statut = data.statut;
  return row;
}

/**
 * Map a Supabase intervention row to camelCase (for joins)
 * @param {Object} row
 * @returns {Object|null}
 */
function interventionFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    garantieId: row.garantie_id,
    chantierId: row.chantier_id,
    titre: row.titre,
    description: row.description,
    typeDesordre: row.type_desordre,
    dateSignalement: row.date_signalement,
    dateIntervention: row.date_intervention,
    dateCloture: row.date_cloture,
    statut: row.statut,
    priorite: row.priorite,
    intervenantNom: row.intervenant_nom,
    rapport: row.rapport,
    cout: row.cout,
    photoUrls: row.photo_urls || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Demo data ───────────────────────────────────────────────────────────────────

function buildDemoGaranties() {
  const now = new Date().toISOString();

  // Reception 1: 2025-06-15 (recent, warranties mostly active)
  // Reception 2: 2025-03-01 (older)
  return [
    // -- Reception 1 warranties (chantier Dupont) --
    {
      id: 'demo-garantie-demo-reception-1-parfait_achevement',
      organizationId: 'demo-org-id',
      userId: 'demo-user-id',
      chantierId: 'demo-chantier-1',
      receptionId: 'demo-reception-1',
      typeGarantie: 'parfait_achevement',
      dateDebut: '2025-06-15',
      dateFin: '2026-06-15',
      assureur: 'AXA Assurances',
      numeroPolice: 'PA-2025-001',
      notes: null,
      statut: 'active',
      chantierNom: 'Renovation Appartement Dupont',
      createdAt: '2025-06-15T14:00:00Z',
      updatedAt: now,
    },
    {
      id: 'demo-garantie-demo-reception-1-biennale',
      organizationId: 'demo-org-id',
      userId: 'demo-user-id',
      chantierId: 'demo-chantier-1',
      receptionId: 'demo-reception-1',
      typeGarantie: 'biennale',
      dateDebut: '2025-06-15',
      dateFin: '2027-06-15',
      assureur: 'AXA Assurances',
      numeroPolice: 'BI-2025-001',
      notes: null,
      statut: 'active',
      chantierNom: 'Renovation Appartement Dupont',
      createdAt: '2025-06-15T14:00:00Z',
      updatedAt: now,
    },
    {
      id: 'demo-garantie-demo-reception-1-decennale',
      organizationId: 'demo-org-id',
      userId: 'demo-user-id',
      chantierId: 'demo-chantier-1',
      receptionId: 'demo-reception-1',
      typeGarantie: 'decennale',
      dateDebut: '2025-06-15',
      dateFin: '2035-06-15',
      assureur: 'AXA Assurances',
      numeroPolice: 'DEC-2025-001',
      notes: 'Police couvrant l\'ensemble de la renovation',
      statut: 'active',
      chantierNom: 'Renovation Appartement Dupont',
      createdAt: '2025-06-15T14:00:00Z',
      updatedAt: now,
    },
    // -- Reception 2 warranties (chantier Leclerc) --
    {
      id: 'demo-garantie-demo-reception-2-parfait_achevement',
      organizationId: 'demo-org-id',
      userId: 'demo-user-id',
      chantierId: 'demo-chantier-2',
      receptionId: 'demo-reception-2',
      typeGarantie: 'parfait_achevement',
      dateDebut: '2025-03-01',
      dateFin: '2026-03-01',
      assureur: 'MAAF Assurances',
      numeroPolice: 'PA-2025-002',
      notes: null,
      statut: 'active',
      chantierNom: 'Extension Maison Leclerc',
      createdAt: '2025-03-01T10:00:00Z',
      updatedAt: now,
    },
    {
      id: 'demo-garantie-demo-reception-2-biennale',
      organizationId: 'demo-org-id',
      userId: 'demo-user-id',
      chantierId: 'demo-chantier-2',
      receptionId: 'demo-reception-2',
      typeGarantie: 'biennale',
      dateDebut: '2025-03-01',
      dateFin: '2027-03-01',
      assureur: 'MAAF Assurances',
      numeroPolice: 'BI-2025-002',
      notes: null,
      statut: 'active',
      chantierNom: 'Extension Maison Leclerc',
      createdAt: '2025-03-01T10:00:00Z',
      updatedAt: now,
    },
    {
      id: 'demo-garantie-demo-reception-2-decennale',
      organizationId: 'demo-org-id',
      userId: 'demo-user-id',
      chantierId: 'demo-chantier-2',
      receptionId: 'demo-reception-2',
      typeGarantie: 'decennale',
      dateDebut: '2025-03-01',
      dateFin: '2035-03-01',
      assureur: 'MAAF Assurances',
      numeroPolice: 'DEC-2025-002',
      notes: 'Couverture extension avec fondations',
      statut: 'active',
      chantierNom: 'Extension Maison Leclerc',
      createdAt: '2025-03-01T10:00:00Z',
      updatedAt: now,
    },
  ];
}

function getDemoData() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initDemoData();
}

function saveDemoData(data) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

function initDemoData() {
  const data = buildDemoGaranties();
  saveDemoData(data);
  return data;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Calculate progress and time remaining for a warranty
 *
 * @param {Object} garantie
 * @returns {{ percentElapsed: number, daysRemaining: number, totalDays: number, statusColor: string }}
 */
export function getGarantieProgress(garantie) {
  const now = new Date();
  const start = new Date(garantie.dateDebut);
  const end = new Date(garantie.dateFin);
  const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  const elapsed = Math.round((now - start) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - elapsed);
  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

  return {
    percentElapsed,
    daysRemaining,
    totalDays,
    statusColor: getGarantieStatusColor(garantie),
  };
}

/**
 * Get a status color based on warranty state
 *
 * @param {Object} garantie
 * @returns {'green' | 'orange' | 'red'}
 */
export function getGarantieStatusColor(garantie) {
  if (garantie.statut === 'expiree') return 'red';

  const now = new Date();
  const end = new Date(garantie.dateFin);
  const daysRemaining = Math.round((end - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) return 'red';
  if (daysRemaining <= 90) return 'orange';
  return 'green';
}

// ── CRUD ────────────────────────────────────────────────────────────────────────

/**
 * Get all warranties for a chantier, sorted by type order
 *
 * @param {Object} supabase - Supabase client
 * @param {string} chantierId
 * @returns {Promise<Array>}
 */
export async function getByChantier(supabase, chantierId) {
  const typeOrder = ['parfait_achevement', 'biennale', 'decennale'];

  if (isDemo) {
    const data = getDemoData();
    return data
      .filter(g => g.chantierId === chantierId)
      .sort((a, b) => typeOrder.indexOf(a.typeGarantie) - typeOrder.indexOf(b.typeGarantie));
  }

  const { data, error } = await supabase
    .from('garanties')
    .select('*')
    .eq('chantier_id', chantierId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || [])
    .map(fromSupabase)
    .sort((a, b) => typeOrder.indexOf(a.typeGarantie) - typeOrder.indexOf(b.typeGarantie));
}

/**
 * Get all warranties for an organization, with optional filters and chantier info
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.orgId
 * @param {Object} [params.filters]
 * @param {string} [params.filters.statut] - 'active' | 'expiree'
 * @param {string} [params.filters.typeGarantie] - warranty type key
 * @param {string} [params.filters.expiringBefore] - ISO date string
 * @param {string} [params.filters.search] - search in chantier name
 * @returns {Promise<Array>}
 */
export async function getAll(supabase, { userId, orgId, filters = {} }) {
  if (isDemo) {
    let data = getDemoData();

    if (filters.statut) {
      data = data.filter(g => g.statut === filters.statut);
    }
    if (filters.typeGarantie) {
      data = data.filter(g => g.typeGarantie === filters.typeGarantie);
    }
    if (filters.expiringBefore) {
      const limit = filters.expiringBefore;
      const today = new Date().toISOString().split('T')[0];
      data = data.filter(g => g.dateFin >= today && g.dateFin <= limit);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(g =>
        g.chantierNom?.toLowerCase().includes(q) ||
        g.assureur?.toLowerCase().includes(q) ||
        g.numeroPolice?.toLowerCase().includes(q)
      );
    }

    return data;
  }

  let query = supabase
    .from('garanties')
    .select('*, chantiers(nom)')
    .order('date_fin', { ascending: true });

  query = scopeToOrg(query, orgId, userId);

  if (filters.statut) query = query.eq('statut', filters.statut);
  if (filters.typeGarantie) query = query.eq('type_garantie', filters.typeGarantie);
  if (filters.expiringBefore) {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('date_fin', today).lte('date_fin', filters.expiringBefore);
  }
  if (filters.search) {
    query = query.or(`chantiers.nom.ilike.%${filters.search}%,assureur.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const g = fromSupabase(row);
    g.chantierNom = row.chantiers?.nom || null;
    return g;
  });
}

/**
 * Get a single warranty by ID, including its interventions
 *
 * @param {Object} supabase - Supabase client
 * @param {string} id - Warranty ID
 * @returns {Promise<Object|null>}
 */
export async function getById(supabase, id) {
  if (isDemo) {
    const data = getDemoData();
    const garantie = data.find(g => g.id === id);
    if (!garantie) return null;

    // Load interventions from localStorage
    let interventions = [];
    try {
      const raw = localStorage.getItem('batigesti_interventions');
      if (raw) {
        const allInterventions = JSON.parse(raw);
        interventions = allInterventions.filter(i => i.garantieId === id);
      }
    } catch { /* ignore */ }

    return { ...garantie, interventions };
  }

  const { data, error } = await supabase
    .from('garanties')
    .select('*, chantiers(nom), interventions_sav(*)')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const garantie = fromSupabase(data);
  garantie.chantierNom = data.chantiers?.nom || null;
  garantie.interventions = (data.interventions_sav || []).map(interventionFromSupabase);
  return garantie;
}

/**
 * Update a warranty (assureur, notes, statut, etc.)
 *
 * @param {Object} supabase - Supabase client
 * @param {string} id - Warranty ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated warranty
 */
export async function updateGarantie(supabase, id, data) {
  if (isDemo) {
    const garanties = getDemoData();
    const idx = garanties.findIndex(g => g.id === id);
    if (idx < 0) throw new Error('Garantie non trouvee');
    garanties[idx] = {
      ...garanties[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveDemoData(garanties);
    return garanties[idx];
  }

  const { data: updated, error } = await supabase
    .from('garanties')
    .update(toSupabase(data))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(updated);
}

/**
 * Get dashboard statistics for the warranty module
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.orgId
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats(supabase, { userId, orgId }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const in30Days = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const in90Days = new Date(today.getTime() + 90 * 86400000).toISOString().split('T')[0];

  if (isDemo) {
    const garanties = getDemoData();
    const active = garanties.filter(g => g.statut === 'active' && g.dateFin >= todayStr);

    // Load interventions
    let interventions = [];
    try {
      const raw = localStorage.getItem('batigesti_interventions');
      if (raw) interventions = JSON.parse(raw);
    } catch { /* ignore */ }

    return {
      activesTotal: active.length,
      parfaitAchevementCount: active.filter(g => g.typeGarantie === 'parfait_achevement').length,
      biennaleCount: active.filter(g => g.typeGarantie === 'biennale').length,
      decennaleCount: active.filter(g => g.typeGarantie === 'decennale').length,
      expiring30j: active.filter(g => g.dateFin >= todayStr && g.dateFin <= in30Days),
      expiring90j: active.filter(g => g.dateFin >= todayStr && g.dateFin <= in90Days),
      interventionsOuvertes: interventions.filter(i => i.statut !== 'cloture').length,
    };
  }

  // Supabase mode: fetch all active warranties for the org
  let query = supabase
    .from('garanties')
    .select('*, chantiers(nom)')
    .eq('statut', 'active')
    .gte('date_fin', todayStr);

  query = scopeToOrg(query, orgId, userId);
  const { data: garanties, error } = await query;
  if (error) throw error;

  const active = (garanties || []).map(fromSupabase);

  // Count open interventions
  let interventionQuery = supabase
    .from('interventions_sav')
    .select('id', { count: 'exact', head: true })
    .neq('statut', 'cloture');

  interventionQuery = scopeToOrg(interventionQuery, orgId, userId);
  const { count: openCount, error: intError } = await interventionQuery;
  if (intError) throw intError;

  return {
    activesTotal: active.length,
    parfaitAchevementCount: active.filter(g => g.typeGarantie === 'parfait_achevement').length,
    biennaleCount: active.filter(g => g.typeGarantie === 'biennale').length,
    decennaleCount: active.filter(g => g.typeGarantie === 'decennale').length,
    expiring30j: active.filter(g => g.dateFin >= todayStr && g.dateFin <= in30Days),
    expiring90j: active.filter(g => g.dateFin >= todayStr && g.dateFin <= in90Days),
    interventionsOuvertes: openCount || 0,
  };
}

/**
 * Mark expired warranties (dateFin < today and statut still 'active')
 * Typically run as a scheduled task or on page load.
 *
 * @param {Object} supabase - Supabase client
 * @returns {Promise<number>} Number of warranties marked as expired
 */
export async function markExpired(supabase) {
  const todayStr = new Date().toISOString().split('T')[0];

  if (isDemo) {
    const garanties = getDemoData();
    let count = 0;
    for (const g of garanties) {
      if (g.statut === 'active' && g.dateFin < todayStr) {
        g.statut = 'expiree';
        g.updatedAt = new Date().toISOString();
        count++;
      }
    }
    if (count > 0) saveDemoData(garanties);
    return count;
  }

  const { data, error } = await supabase
    .from('garanties')
    .update({ statut: 'expiree' })
    .eq('statut', 'active')
    .lt('date_fin', todayStr)
    .select('id');

  if (error) throw error;
  return (data || []).length;
}
