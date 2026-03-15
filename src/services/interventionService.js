/**
 * interventionService.js — CRUD for SAV warranty interventions
 *
 * Pattern: subcontractorService.js — demo mode via localStorage, prod via Supabase.
 *
 * An intervention is a repair/fix action taken under a warranty (garantie).
 * Each intervention is linked to a garantie and must fall within its coverage period.
 */

import { isDemo } from '../supabaseClient';
import { scopeToOrg, withOrgScope } from '../lib/queryHelper';

const DEMO_KEY = 'batigesti_interventions';
const GARANTIES_DEMO_KEY = 'batigesti_garanties';

// ── Disorder types ──────────────────────────────────────────────────────────────

/**
 * Standard disorder/defect categories for SAV interventions
 */
export const DESORDRE_TYPES = [
  'Fissure',
  'Infiltration',
  'Affaissement',
  'Equipement defaillant',
  'Malfacon',
  'Defaut d\'etancheite',
  'Probleme electrique',
  'Autre',
];

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
    cout: row.cout != null ? parseFloat(row.cout) : null,
    photoUrls: row.photo_urls || [],
    chantierNom: row.chantier_nom || row.chantiers?.nom || null,
    garantieType: row.garantie_type || row.garanties?.type_garantie || null,
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
  if (data.garantieId !== undefined) row.garantie_id = data.garantieId;
  if (data.chantierId !== undefined) row.chantier_id = data.chantierId;
  if (data.titre !== undefined) row.titre = data.titre;
  if (data.description !== undefined) row.description = data.description;
  if (data.typeDesordre !== undefined) row.type_desordre = data.typeDesordre;
  if (data.dateSignalement !== undefined) row.date_signalement = data.dateSignalement;
  if (data.dateIntervention !== undefined) row.date_intervention = data.dateIntervention;
  if (data.dateCloture !== undefined) row.date_cloture = data.dateCloture;
  if (data.statut !== undefined) row.statut = data.statut;
  if (data.priorite !== undefined) row.priorite = data.priorite;
  if (data.intervenantNom !== undefined) row.intervenant_nom = data.intervenantNom;
  if (data.rapport !== undefined) row.rapport = data.rapport;
  if (data.cout !== undefined) row.cout = data.cout;
  if (data.photoUrls !== undefined) row.photo_urls = data.photoUrls;
  return row;
}

// ── Demo data ───────────────────────────────────────────────────────────────────

const DEMO_INTERVENTIONS = [
  {
    id: 'demo-intervention-1',
    organizationId: 'demo-org-id',
    userId: 'demo-user-id',
    garantieId: 'demo-garantie-demo-reception-1-parfait_achevement',
    chantierId: 'demo-chantier-1',
    titre: 'Fissure au plafond du salon',
    description: 'Fissure apparue au niveau du joint de placo au plafond du salon, environ 50cm de long. Visible depuis le coin nord-est.',
    typeDesordre: 'Fissure',
    dateSignalement: '2025-09-10',
    dateIntervention: '2025-09-25',
    dateCloture: null,
    statut: 'en_cours',
    priorite: 'haute',
    intervenantNom: 'Dupont Platrerie',
    rapport: null,
    cout: null,
    photoUrls: [],
    chantierNom: 'Renovation Appartement Dupont',
    garantieType: 'parfait_achevement',
    createdAt: '2025-09-10T08:30:00Z',
    updatedAt: '2025-09-25T14:00:00Z',
  },
  {
    id: 'demo-intervention-2',
    organizationId: 'demo-org-id',
    userId: 'demo-user-id',
    garantieId: 'demo-garantie-demo-reception-2-biennale',
    chantierId: 'demo-chantier-2',
    titre: 'Volet roulant bloque en position haute',
    description: 'Le volet roulant de la chambre principale se bloque en position haute. Le moteur fait du bruit mais le volet ne descend pas.',
    typeDesordre: 'Equipement defaillant',
    dateSignalement: '2025-11-05',
    dateIntervention: null,
    dateCloture: null,
    statut: 'signale',
    priorite: 'moyenne',
    intervenantNom: null,
    rapport: null,
    cout: null,
    photoUrls: [],
    chantierNom: 'Extension Maison Leclerc',
    garantieType: 'biennale',
    createdAt: '2025-11-05T10:00:00Z',
    updatedAt: '2025-11-05T10:00:00Z',
  },
];

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
  const data = [...DEMO_INTERVENTIONS];
  saveDemoData(data);
  return data;
}

// ── Validation helpers ──────────────────────────────────────────────────────────

/**
 * Check that the signalement date falls within the warranty coverage period.
 * Throws if the date is outside the warranty period.
 *
 * @param {Object} garantie - The warranty to check against
 * @param {string} dateSignalement - ISO date string
 */
function validateDateWithinWarranty(garantie, dateSignalement) {
  if (!garantie) throw new Error('Garantie non trouvee');
  if (!dateSignalement) return; // Skip validation if no date provided

  const signalDate = dateSignalement.split('T')[0];
  if (signalDate < garantie.dateDebut) {
    throw new Error(`La date de signalement (${signalDate}) est anterieure au debut de la garantie (${garantie.dateDebut})`);
  }
  if (signalDate > garantie.dateFin) {
    throw new Error(`La date de signalement (${signalDate}) depasse la fin de la garantie (${garantie.dateFin}). La garantie est expiree.`);
  }
}

// ── CRUD ────────────────────────────────────────────────────────────────────────

/**
 * Create a new intervention under a warranty.
 * Validates that the signalement date falls within the warranty period.
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} params
 * @param {string} params.garantieId
 * @param {string} params.chantierId
 * @param {string} params.titre
 * @param {string} params.description
 * @param {string} params.typeDesordre
 * @param {string} params.dateSignalement
 * @param {string} [params.priorite] - 'basse' | 'moyenne' | 'haute' | 'urgente'
 * @param {string} [params.intervenantNom]
 * @param {string} params.userId
 * @param {string} params.orgId
 * @returns {Promise<Object>} Created intervention
 */
export async function create(supabase, {
  garantieId, chantierId, titre, description, typeDesordre,
  dateSignalement, priorite, intervenantNom, userId, orgId,
}) {
  if (isDemo) {
    // Load garantie to validate date
    let garanties = [];
    try {
      const raw = localStorage.getItem(GARANTIES_DEMO_KEY);
      if (raw) garanties = JSON.parse(raw);
    } catch { /* ignore */ }
    const garantie = garanties.find(g => g.id === garantieId);
    validateDateWithinWarranty(garantie, dateSignalement);

    const interventions = getDemoData();
    const now = new Date().toISOString();
    const intervention = {
      id: `intervention-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: orgId || 'demo-org-id',
      userId: userId || 'demo-user-id',
      garantieId,
      chantierId,
      titre,
      description,
      typeDesordre,
      dateSignalement: dateSignalement || now.split('T')[0],
      dateIntervention: null,
      dateCloture: null,
      statut: 'signale',
      priorite: priorite || 'moyenne',
      intervenantNom: intervenantNom || null,
      rapport: null,
      cout: null,
      photoUrls: [],
      chantierNom: garantie?.chantierNom || null,
      garantieType: garantie?.typeGarantie || null,
      createdAt: now,
      updatedAt: now,
    };
    interventions.push(intervention);
    saveDemoData(interventions);
    return intervention;
  }

  // ── Supabase mode: validate warranty period ──
  const { data: garantie, error: gError } = await supabase
    .from('garanties')
    .select('id, date_debut, date_fin, type_garantie, chantier_id')
    .eq('id', garantieId)
    .single();

  if (gError) throw gError;
  validateDateWithinWarranty(
    { dateDebut: garantie.date_debut, dateFin: garantie.date_fin },
    dateSignalement
  );

  const row = withOrgScope(toSupabase({
    garantieId,
    chantierId: chantierId || garantie.chantier_id,
    titre,
    description,
    typeDesordre,
    dateSignalement: dateSignalement || new Date().toISOString().split('T')[0],
    statut: 'signale',
    priorite: priorite || 'moyenne',
    intervenantNom: intervenantNom || null,
  }), userId, orgId);

  const { data: created, error } = await supabase
    .from('interventions_sav')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(created);
}

/**
 * Update an existing intervention
 *
 * @param {Object} supabase - Supabase client
 * @param {string} id - Intervention ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated intervention
 */
export async function update(supabase, id, data) {
  if (isDemo) {
    const interventions = getDemoData();
    const idx = interventions.findIndex(i => i.id === id);
    if (idx < 0) throw new Error('Intervention non trouvee');
    interventions[idx] = {
      ...interventions[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveDemoData(interventions);
    return interventions[idx];
  }

  const { data: updated, error } = await supabase
    .from('interventions_sav')
    .update(toSupabase(data))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(updated);
}

/**
 * Get all interventions for a specific warranty
 *
 * @param {Object} supabase - Supabase client
 * @param {string} garantieId
 * @returns {Promise<Array>}
 */
export async function getByGarantie(supabase, garantieId) {
  if (isDemo) {
    const data = getDemoData();
    return data
      .filter(i => i.garantieId === garantieId)
      .sort((a, b) => new Date(b.dateSignalement) - new Date(a.dateSignalement));
  }

  const { data, error } = await supabase
    .from('interventions_sav')
    .select('*, chantiers(nom), garanties(type_garantie)')
    .eq('garantie_id', garantieId)
    .order('date_signalement', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => {
    const i = fromSupabase(row);
    i.chantierNom = row.chantiers?.nom || null;
    i.garantieType = row.garanties?.type_garantie || null;
    return i;
  });
}

/**
 * Get all interventions for a chantier (across all warranty types)
 *
 * @param {Object} supabase - Supabase client
 * @param {string} chantierId
 * @returns {Promise<Array>}
 */
export async function getByChantier(supabase, chantierId) {
  if (isDemo) {
    const data = getDemoData();
    return data
      .filter(i => i.chantierId === chantierId)
      .sort((a, b) => new Date(b.dateSignalement) - new Date(a.dateSignalement));
  }

  const { data, error } = await supabase
    .from('interventions_sav')
    .select('*, garanties(type_garantie)')
    .eq('chantier_id', chantierId)
    .order('date_signalement', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => {
    const i = fromSupabase(row);
    i.garantieType = row.garanties?.type_garantie || null;
    return i;
  });
}

/**
 * Get all open (non-closed) interventions for an organization
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.orgId
 * @returns {Promise<Array>}
 */
export async function getOpenInterventions(supabase, { userId, orgId }) {
  if (isDemo) {
    const data = getDemoData();
    return data
      .filter(i => i.statut !== 'cloture')
      .sort((a, b) => {
        // Priority sort: urgente > haute > moyenne > basse
        const priorityOrder = { urgente: 0, haute: 1, moyenne: 2, basse: 3 };
        const pa = priorityOrder[a.priorite] ?? 2;
        const pb = priorityOrder[b.priorite] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.dateSignalement) - new Date(a.dateSignalement);
      });
  }

  let query = supabase
    .from('interventions_sav')
    .select('*, chantiers(nom), garanties(type_garantie)')
    .neq('statut', 'cloture')
    .order('date_signalement', { ascending: false });

  query = scopeToOrg(query, orgId, userId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const i = fromSupabase(row);
    i.chantierNom = row.chantiers?.nom || null;
    i.garantieType = row.garanties?.type_garantie || null;
    return i;
  });
}

/**
 * Close an intervention with a final report and cost
 *
 * @param {Object} supabase - Supabase client
 * @param {string} id - Intervention ID
 * @param {string} rapport - Final report/description of work done
 * @param {number|null} cout - Cost of the intervention
 * @returns {Promise<Object>} Closed intervention
 */
export async function close(supabase, id, rapport, cout) {
  const today = new Date().toISOString().split('T')[0];

  if (isDemo) {
    const interventions = getDemoData();
    const idx = interventions.findIndex(i => i.id === id);
    if (idx < 0) throw new Error('Intervention non trouvee');
    interventions[idx] = {
      ...interventions[idx],
      statut: 'cloture',
      dateCloture: today,
      rapport: rapport || interventions[idx].rapport,
      cout: cout != null ? cout : interventions[idx].cout,
      updatedAt: new Date().toISOString(),
    };
    saveDemoData(interventions);
    return interventions[idx];
  }

  const { data: updated, error } = await supabase
    .from('interventions_sav')
    .update({
      statut: 'cloture',
      date_cloture: today,
      rapport: rapport || null,
      cout: cout != null ? cout : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(updated);
}
