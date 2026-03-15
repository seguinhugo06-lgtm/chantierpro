/**
 * receptionService.js — CRUD for chantier receptions (delivery of completed works)
 *
 * Pattern: subcontractorService.js — demo mode via localStorage, prod via Supabase.
 * When a reception is created in demo mode, the 3 statutory warranties are auto-created
 * in localStorage (simulating the DB trigger).
 */

import { isDemo } from '../supabaseClient';
import { scopeToOrg, withOrgScope } from '../lib/queryHelper';

const DEMO_KEY = 'batigesti_receptions';
const DEMO_RESERVES_KEY = 'batigesti_reserves';
const GARANTIES_DEMO_KEY = 'batigesti_garanties';

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
    dateReception: row.date_reception,
    typeReception: row.type_reception,
    pvSigne: row.pv_signe,
    pvSigneUrl: row.pv_signe_url,
    signatairClient: row.signataire_client,
    signataireEntreprise: row.signataire_entreprise,
    observations: row.observations,
    dateLeveeReserves: row.date_levee_reserves,
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
  if (data.dateReception !== undefined) row.date_reception = data.dateReception;
  if (data.typeReception !== undefined) row.type_reception = data.typeReception;
  if (data.pvSigne !== undefined) row.pv_signe = data.pvSigne;
  if (data.pvSigneUrl !== undefined) row.pv_signe_url = data.pvSigneUrl;
  if (data.signatairClient !== undefined) row.signataire_client = data.signatairClient;
  if (data.signataireEntreprise !== undefined) row.signataire_entreprise = data.signataireEntreprise;
  if (data.observations !== undefined) row.observations = data.observations;
  if (data.dateLeveeReserves !== undefined) row.date_levee_reserves = data.dateLeveeReserves;
  if (data.statut !== undefined) row.statut = data.statut;
  return row;
}

/**
 * Map a Supabase reserve row to camelCase
 * @param {Object} row
 * @returns {Object|null}
 */
export function reserveFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    receptionId: row.reception_id,
    description: row.description,
    localisation: row.localisation,
    priorite: row.priorite,
    responsable: row.responsable,
    dateLimite: row.date_limite,
    statut: row.statut,
    dateResolution: row.date_resolution,
    commentaireResolution: row.commentaire_resolution,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map camelCase reserve fields to snake_case
 * @param {Object} data
 * @returns {Object}
 */
function reserveToSupabase(data) {
  const row = {};
  if (data.receptionId !== undefined) row.reception_id = data.receptionId;
  if (data.description !== undefined) row.description = data.description;
  if (data.localisation !== undefined) row.localisation = data.localisation;
  if (data.priorite !== undefined) row.priorite = data.priorite;
  if (data.responsable !== undefined) row.responsable = data.responsable;
  if (data.dateLimite !== undefined) row.date_limite = data.dateLimite;
  if (data.statut !== undefined) row.statut = data.statut;
  if (data.dateResolution !== undefined) row.date_resolution = data.dateResolution;
  if (data.commentaireResolution !== undefined) row.commentaire_resolution = data.commentaireResolution;
  if (data.photoUrl !== undefined) row.photo_url = data.photoUrl;
  return row;
}

// ── Demo data ───────────────────────────────────────────────────────────────────

const DEMO_RECEPTIONS = [
  {
    id: 'demo-reception-1',
    organizationId: 'demo-org-id',
    userId: 'demo-user-id',
    chantierId: 'demo-chantier-1',
    dateReception: '2025-06-15',
    typeReception: 'avec_reserves',
    pvSigne: true,
    pvSigneUrl: null,
    signatairClient: 'M. Dupont',
    signataireEntreprise: 'Jean Martin',
    observations: 'Travaux conformes dans l\'ensemble. Quelques finitions restantes.',
    dateLeveeReserves: null,
    statut: 'en_cours',
    chantierNom: 'Renovation Appartement Dupont',
    createdAt: '2025-06-15T14:00:00Z',
    updatedAt: '2025-06-15T14:00:00Z',
  },
  {
    id: 'demo-reception-2',
    organizationId: 'demo-org-id',
    userId: 'demo-user-id',
    chantierId: 'demo-chantier-2',
    dateReception: '2025-03-01',
    typeReception: 'sans_reserves',
    pvSigne: true,
    pvSigneUrl: null,
    signatairClient: 'Mme Leclerc',
    signataireEntreprise: 'Jean Martin',
    observations: 'Chantier livré conforme, aucun désordre constaté.',
    dateLeveeReserves: null,
    statut: 'terminee',
    chantierNom: 'Extension Maison Leclerc',
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z',
  },
];

const DEMO_RESERVES = [
  {
    id: 'demo-reserve-1',
    receptionId: 'demo-reception-1',
    description: 'Fissure au plafond du salon, joint de placo mal fini',
    localisation: 'Salon - Plafond',
    priorite: 'haute',
    responsable: 'Dupont Plâtrerie',
    dateLimite: '2025-07-15',
    statut: 'en_cours',
    dateResolution: null,
    commentaireResolution: null,
    photoUrl: null,
    createdAt: '2025-06-15T14:10:00Z',
    updatedAt: '2025-06-15T14:10:00Z',
  },
  {
    id: 'demo-reserve-2',
    receptionId: 'demo-reception-1',
    description: 'Porte de la salle de bain mal ajustée, frottement au sol',
    localisation: 'Salle de bain - Porte',
    priorite: 'moyenne',
    responsable: 'Martin Menuiserie',
    dateLimite: '2025-07-30',
    statut: 'en_attente',
    dateResolution: null,
    commentaireResolution: null,
    photoUrl: null,
    createdAt: '2025-06-15T14:15:00Z',
    updatedAt: '2025-06-15T14:15:00Z',
  },
  {
    id: 'demo-reserve-3',
    receptionId: 'demo-reception-1',
    description: 'Prise electrique non fonctionnelle dans la cuisine',
    localisation: 'Cuisine - Mur est',
    priorite: 'haute',
    responsable: 'Dupont Electricite',
    dateLimite: '2025-07-01',
    statut: 'resolue',
    dateResolution: '2025-06-28',
    commentaireResolution: 'Raccordement effectue, prise fonctionnelle.',
    photoUrl: null,
    createdAt: '2025-06-15T14:20:00Z',
    updatedAt: '2025-06-28T09:00:00Z',
  },
];

function getDemoReceptions() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initDemoReceptions();
}

function saveDemoReceptions(data) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

function getDemoReserves() {
  try {
    const raw = localStorage.getItem(DEMO_RESERVES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initDemoReserves();
}

function saveDemoReserves(data) {
  localStorage.setItem(DEMO_RESERVES_KEY, JSON.stringify(data));
}

function initDemoReceptions() {
  const data = [...DEMO_RECEPTIONS];
  saveDemoReceptions(data);
  return data;
}

function initDemoReserves() {
  const data = [...DEMO_RESERVES];
  saveDemoReserves(data);
  return data;
}

/**
 * Auto-create the 3 statutory warranties when a reception is created in demo mode.
 * Simulates the DB trigger that fires on INSERT into receptions.
 * @param {Object} reception - The newly created reception
 */
function autoCreateDemoGaranties(reception) {
  const GARANTIE_DEFS = [
    { type: 'parfait_achevement', years: 1 },
    { type: 'biennale', years: 2 },
    { type: 'decennale', years: 10 },
  ];

  let garanties = [];
  try {
    const raw = localStorage.getItem(GARANTIES_DEMO_KEY);
    if (raw) garanties = JSON.parse(raw);
  } catch { /* ignore */ }

  const dateDebut = reception.dateReception;
  const now = new Date().toISOString();

  for (const def of GARANTIE_DEFS) {
    const dateFin = new Date(dateDebut);
    dateFin.setFullYear(dateFin.getFullYear() + def.years);

    garanties.push({
      id: `demo-garantie-${reception.id}-${def.type}`,
      organizationId: reception.organizationId || 'demo-org-id',
      userId: reception.userId || 'demo-user-id',
      chantierId: reception.chantierId,
      receptionId: reception.id,
      typeGarantie: def.type,
      dateDebut,
      dateFin: dateFin.toISOString().split('T')[0],
      assureur: null,
      numeroPolice: null,
      notes: null,
      statut: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  localStorage.setItem(GARANTIES_DEMO_KEY, JSON.stringify(garanties));
}

// ── CRUD ────────────────────────────────────────────────────────────────────────

/**
 * Create a new reception for a chantier.
 * In demo mode, also auto-creates the 3 statutory warranties.
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} params
 * @param {string} params.chantierId
 * @param {string} params.dateReception
 * @param {string} params.typeReception - 'avec_reserves' | 'sans_reserves'
 * @param {boolean} params.pvSigne
 * @param {string} params.signatairClient
 * @param {string} params.signataireEntreprise
 * @param {string} params.observations
 * @param {Array}  params.reserves - Initial reserves to create
 * @param {string} params.userId
 * @param {string} params.orgId
 * @returns {Promise<Object>} Created reception
 */
export async function createReception(supabase, {
  chantierId, dateReception, typeReception, pvSigne,
  signatairClient, signataireEntreprise, observations,
  reserves = [], userId, orgId,
}) {
  if (isDemo) {
    const receptions = getDemoReceptions();
    const now = new Date().toISOString();
    const reception = {
      id: `reception-${Date.now()}`,
      organizationId: orgId || 'demo-org-id',
      userId: userId || 'demo-user-id',
      chantierId,
      dateReception,
      typeReception,
      pvSigne: pvSigne || false,
      pvSigneUrl: null,
      signatairClient,
      signataireEntreprise,
      observations,
      dateLeveeReserves: null,
      statut: typeReception === 'sans_reserves' ? 'terminee' : 'en_cours',
      chantierNom: null,
      createdAt: now,
      updatedAt: now,
    };
    receptions.push(reception);
    saveDemoReceptions(receptions);

    // Create initial reserves
    if (reserves.length > 0) {
      const allReserves = getDemoReserves();
      for (const r of reserves) {
        allReserves.push({
          id: `reserve-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          receptionId: reception.id,
          description: r.description,
          localisation: r.localisation || null,
          priorite: r.priorite || 'moyenne',
          responsable: r.responsable || null,
          dateLimite: r.dateLimite || null,
          statut: 'en_attente',
          dateResolution: null,
          commentaireResolution: null,
          photoUrl: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      saveDemoReserves(allReserves);
    }

    // Auto-create the 3 statutory warranties (simulates DB trigger)
    autoCreateDemoGaranties(reception);

    return reception;
  }

  // ── Supabase mode ──
  const row = withOrgScope(toSupabase({
    chantierId, dateReception, typeReception, pvSigne,
    signatairClient, signataireEntreprise, observations,
    statut: typeReception === 'sans_reserves' ? 'terminee' : 'en_cours',
  }), userId, orgId);

  const { data: created, error } = await supabase
    .from('receptions')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  // Create initial reserves
  if (reserves.length > 0) {
    const reserveRows = reserves.map(r => ({
      reception_id: created.id,
      description: r.description,
      localisation: r.localisation || null,
      priorite: r.priorite || 'moyenne',
      responsable: r.responsable || null,
      date_limite: r.dateLimite || null,
      statut: 'en_attente',
    }));

    const { error: resError } = await supabase
      .from('reception_reserves')
      .insert(reserveRows);

    if (resError) throw resError;
  }

  // Note: the DB trigger auto-creates the 3 garanties on reception insert

  return fromSupabase(created);
}

/**
 * Get a reception by chantier ID, including its reserves
 *
 * @param {Object} supabase - Supabase client
 * @param {string} chantierId
 * @returns {Promise<Object|null>} Reception with reserves[]
 */
export async function getReception(supabase, chantierId) {
  if (isDemo) {
    const receptions = getDemoReceptions();
    const reception = receptions.find(r => r.chantierId === chantierId);
    if (!reception) return null;

    const allReserves = getDemoReserves();
    const reserves = allReserves.filter(r => r.receptionId === reception.id);

    return { ...reception, reserves };
  }

  const { data, error } = await supabase
    .from('receptions')
    .select('*, reception_reserves(*)')
    .eq('chantier_id', chantierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const reception = fromSupabase(data);
  reception.reserves = (data.reception_reserves || []).map(reserveFromSupabase);
  return reception;
}

/**
 * Update a reception
 *
 * @param {Object} supabase - Supabase client
 * @param {string} id - Reception ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated reception
 */
export async function updateReception(supabase, id, data) {
  if (isDemo) {
    const receptions = getDemoReceptions();
    const idx = receptions.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Reception non trouvee');
    receptions[idx] = {
      ...receptions[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveDemoReceptions(receptions);
    return receptions[idx];
  }

  const { data: updated, error } = await supabase
    .from('receptions')
    .update(toSupabase(data))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(updated);
}

/**
 * Add a reserve to an existing reception
 *
 * @param {Object} supabase - Supabase client
 * @param {string} receptionId
 * @param {Object} data - Reserve data
 * @returns {Promise<Object>} Created reserve
 */
export async function addReserve(supabase, receptionId, data) {
  if (isDemo) {
    const reserves = getDemoReserves();
    const now = new Date().toISOString();
    const reserve = {
      id: `reserve-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      receptionId,
      description: data.description,
      localisation: data.localisation || null,
      priorite: data.priorite || 'moyenne',
      responsable: data.responsable || null,
      dateLimite: data.dateLimite || null,
      statut: 'en_attente',
      dateResolution: null,
      commentaireResolution: null,
      photoUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    reserves.push(reserve);
    saveDemoReserves(reserves);
    return reserve;
  }

  const row = {
    reception_id: receptionId,
    ...reserveToSupabase(data),
    statut: 'en_attente',
  };

  const { data: created, error } = await supabase
    .from('reception_reserves')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return reserveFromSupabase(created);
}

/**
 * Update a reserve
 *
 * @param {Object} supabase - Supabase client
 * @param {string} reserveId
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated reserve
 */
export async function updateReserve(supabase, reserveId, data) {
  if (isDemo) {
    const reserves = getDemoReserves();
    const idx = reserves.findIndex(r => r.id === reserveId);
    if (idx < 0) throw new Error('Reserve non trouvee');
    reserves[idx] = {
      ...reserves[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveDemoReserves(reserves);
    return reserves[idx];
  }

  const { data: updated, error } = await supabase
    .from('reception_reserves')
    .update(reserveToSupabase(data))
    .eq('id', reserveId)
    .select()
    .single();

  if (error) throw error;
  return reserveFromSupabase(updated);
}

/**
 * Lever (resolve) all reserves for a reception and set the levee date
 *
 * @param {Object} supabase - Supabase client
 * @param {string} receptionId
 * @returns {Promise<Object>} Updated reception
 */
export async function leverToutesReserves(supabase, receptionId) {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  if (isDemo) {
    // Update all reserves
    const reserves = getDemoReserves();
    for (const r of reserves) {
      if (r.receptionId === receptionId && r.statut !== 'resolue') {
        r.statut = 'resolue';
        r.dateResolution = today;
        r.updatedAt = now;
      }
    }
    saveDemoReserves(reserves);

    // Update reception
    const receptions = getDemoReceptions();
    const idx = receptions.findIndex(r => r.id === receptionId);
    if (idx >= 0) {
      receptions[idx].dateLeveeReserves = today;
      receptions[idx].statut = 'terminee';
      receptions[idx].updatedAt = now;
      saveDemoReceptions(receptions);
      return receptions[idx];
    }
    throw new Error('Reception non trouvee');
  }

  // Update all unresolved reserves
  const { error: resError } = await supabase
    .from('reception_reserves')
    .update({ statut: 'resolue', date_resolution: today })
    .eq('reception_id', receptionId)
    .neq('statut', 'resolue');

  if (resError) throw resError;

  // Update reception
  const { data: updated, error } = await supabase
    .from('receptions')
    .update({ date_levee_reserves: today, statut: 'terminee' })
    .eq('id', receptionId)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(updated);
}

/**
 * Upload a signed PV document for a reception
 *
 * @param {Object} supabase - Supabase client
 * @param {string} receptionId
 * @param {File} file - The file to upload
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadPvSigne(supabase, receptionId, file) {
  if (isDemo) {
    // In demo mode, create a fake URL
    const fakeUrl = `demo://reception-docs/${receptionId}/${file.name}`;
    const receptions = getDemoReceptions();
    const idx = receptions.findIndex(r => r.id === receptionId);
    if (idx >= 0) {
      receptions[idx].pvSigneUrl = fakeUrl;
      receptions[idx].pvSigne = true;
      receptions[idx].updatedAt = new Date().toISOString();
      saveDemoReceptions(receptions);
    }
    return fakeUrl;
  }

  const filePath = `${receptionId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('reception-docs')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('reception-docs')
    .getPublicUrl(filePath);

  // Update reception record
  await supabase
    .from('receptions')
    .update({ pv_signe_url: publicUrl, pv_signe: true })
    .eq('id', receptionId);

  return publicUrl;
}

/**
 * Get all receptions for an organization, with chantier info
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.orgId
 * @returns {Promise<Array>} List of receptions
 */
export async function getAll(supabase, { userId, orgId }) {
  if (isDemo) {
    return getDemoReceptions();
  }

  let query = supabase
    .from('receptions')
    .select('*, chantiers(nom)')
    .order('date_reception', { ascending: false });

  query = scopeToOrg(query, orgId, userId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const reception = fromSupabase(row);
    reception.chantierNom = row.chantiers?.nom || null;
    return reception;
  });
}
