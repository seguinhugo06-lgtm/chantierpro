/**
 * entrepriseService.js — Multi-entreprise CRUD + Migration
 *
 * Manages the `entreprises` table (plural) in Supabase.
 * Supports demo mode (localStorage fallback).
 */

import { scopeToOrg, withOrgScope } from '../lib/queryHelper';
import { isDemo } from '../supabaseClient';

const DEMO_KEY = 'batigesti_entreprises';
const DEMO_ACTIVE_KEY = 'batigesti_entreprise_active_id';
const MAX_ENTREPRISES = 5;

// ── Field mapping: DB snake_case ↔ JS camelCase ──────────────────────────────

/**
 * Convert a Supabase row to a camelCase JS object.
 * CRITICAL: Must produce the SAME shape as the old `entreprise` state in App.jsx
 * so all downstream components (PDF, Settings, etc.) keep working.
 */
export function fromSupabase(row) {
  if (!row) return null;
  return {
    // Core identity (same keys as old App.jsx entreprise state)
    id: row.id,
    nom: row.nom || '',
    logo: row.logo_url || '',
    couleur: row.couleur || '#f97316',
    formeJuridique: row.forme_juridique || '',
    capital: row.capital || '',
    adresse: row.adresse || '',
    codePostal: row.code_postal || '',
    ville: row.ville || '',
    tel: row.telephone || '',
    email: row.email || '',
    siteWeb: row.site_web || '',
    siret: row.siret || '',
    codeApe: row.code_ape || '',
    rcs: row.rcs || '',
    tvaIntra: row.tva_intra || '',
    iban: row.iban || '',
    bic: row.bic || '',

    // Business params (same keys as old state)
    validiteDevis: row.validite_devis ?? 30,
    tvaDefaut: row.tva_defaut != null ? parseFloat(row.tva_defaut) : 10,
    delaiPaiement: row.delai_paiement ?? 30,
    acompteDefaut: row.acompte_defaut ?? 30,
    tauxFraisStructure: row.taux_frais_structure != null ? parseFloat(row.taux_frais_structure) : 15,

    // NEW multi-entreprise fields
    nomCourt: row.nom_court || '',
    slug: row.slug || '',
    initiales: row.initiales || '',
    logoStoragePath: row.logo_storage_path || '',
    pays: row.pays || 'FRANCE',
    slogan: row.slogan || '',
    rcsVille: row.rcs_ville || '',

    // Assurances
    assuranceDecennaleNumero: row.assurance_decennale_numero || '',
    assuranceDecennaleCompagnie: row.assurance_decennale_compagnie || '',
    assuranceDecennaleValidite: row.assurance_decennale_validite || '',
    assuranceRcProNumero: row.assurance_rc_pro_numero || '',
    assuranceRcProCompagnie: row.assurance_rc_pro_compagnie || '',
    assuranceRcProValidite: row.assurance_rc_pro_validite || '',

    // Bank
    banqueNom: row.banque_nom || '',

    // CGV / mentions
    cgv: row.cgv || '',
    mentionDevis: row.mention_devis || '',
    mentionFacture: row.mention_facture || '',

    // Numbering
    prefixeDevis: row.prefixe_devis || 'DEV',
    prefixeFacture: row.prefixe_facture || 'FAC',
    prefixeAvoir: row.prefixe_avoir || 'AVC',
    compteurDevis: row.compteur_devis ?? 0,
    compteurFacture: row.compteur_facture ?? 0,
    compteurAvoir: row.compteur_avoir ?? 0,
    formatNumero: row.format_numero || '{PREFIX}-{YEAR}-{NUMBER:5}',

    // CGU acceptance (LEGAL-001)
    cguAcceptedAt: row.cgu_accepted_at || null,
    cguVersion: row.cgu_version || null,

    // Status
    isActive: row.is_active ?? false,
    isDefault: row.is_default ?? false,
    ordre: row.ordre ?? 0,
    archivedAt: row.archived_at || null,

    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Org
    organizationId: row.organization_id || null,
    userId: row.user_id || null,
  };
}

/**
 * Convert a camelCase JS object to a Supabase-ready snake_case object.
 */
export function toSupabase(data) {
  const result = {};

  // Only include fields that are present in data (partial update support)
  if (data.nom !== undefined) result.nom = data.nom;
  if (data.nomCourt !== undefined) result.nom_court = data.nomCourt;
  if (data.slug !== undefined) result.slug = data.slug;

  // Visuel
  if (data.logo !== undefined) result.logo_url = data.logo;
  if (data.logoUrl !== undefined) result.logo_url = data.logoUrl;
  if (data.logoStoragePath !== undefined) result.logo_storage_path = data.logoStoragePath;
  if (data.couleur !== undefined) result.couleur = data.couleur;
  if (data.initiales !== undefined) result.initiales = data.initiales;

  // Coordonnées
  if (data.adresse !== undefined) result.adresse = data.adresse;
  if (data.codePostal !== undefined) result.code_postal = data.codePostal;
  if (data.ville !== undefined) result.ville = data.ville;
  if (data.pays !== undefined) result.pays = data.pays;
  if (data.tel !== undefined) result.telephone = data.tel;
  if (data.telephone !== undefined) result.telephone = data.telephone;
  if (data.email !== undefined) result.email = data.email;
  if (data.siteWeb !== undefined) result.site_web = data.siteWeb;
  if (data.slogan !== undefined) result.slogan = data.slogan;

  // Légal
  if (data.formeJuridique !== undefined) result.forme_juridique = data.formeJuridique;
  if (data.capital !== undefined) result.capital = data.capital;
  if (data.siret !== undefined) result.siret = data.siret;
  if (data.codeApe !== undefined) result.code_ape = data.codeApe;
  if (data.rcs !== undefined) result.rcs = data.rcs;
  if (data.rcsVille !== undefined) result.rcs_ville = data.rcsVille;
  if (data.tvaIntra !== undefined) result.tva_intra = data.tvaIntra;

  // Assurances
  if (data.assuranceDecennaleNumero !== undefined) result.assurance_decennale_numero = data.assuranceDecennaleNumero;
  if (data.assuranceDecennaleCompagnie !== undefined) result.assurance_decennale_compagnie = data.assuranceDecennaleCompagnie;
  if (data.assuranceDecennaleValidite !== undefined) result.assurance_decennale_validite = data.assuranceDecennaleValidite || null;
  if (data.assuranceRcProNumero !== undefined) result.assurance_rc_pro_numero = data.assuranceRcProNumero;
  if (data.assuranceRcProCompagnie !== undefined) result.assurance_rc_pro_compagnie = data.assuranceRcProCompagnie;
  if (data.assuranceRcProValidite !== undefined) result.assurance_rc_pro_validite = data.assuranceRcProValidite || null;

  // Banque
  if (data.iban !== undefined) result.iban = data.iban;
  if (data.bic !== undefined) result.bic = data.bic;
  if (data.banqueNom !== undefined) result.banque_nom = data.banqueNom;

  // Paramètres métier
  if (data.tvaDefaut !== undefined) result.tva_defaut = data.tvaDefaut;
  if (data.validiteDevis !== undefined) result.validite_devis = data.validiteDevis;
  if (data.delaiPaiement !== undefined) result.delai_paiement = data.delaiPaiement;
  // NOTE: acompte_defaut column does not exist in DB — do NOT map it
  if (data.tauxFraisStructure !== undefined) result.taux_frais_structure = data.tauxFraisStructure;
  if (data.cgv !== undefined) result.cgv = data.cgv;
  if (data.mentionDevis !== undefined) result.mention_devis = data.mentionDevis;
  if (data.mentionFacture !== undefined) result.mention_facture = data.mentionFacture;

  // Numérotation
  if (data.prefixeDevis !== undefined) result.prefixe_devis = data.prefixeDevis;
  if (data.prefixeFacture !== undefined) result.prefixe_facture = data.prefixeFacture;
  if (data.prefixeAvoir !== undefined) result.prefixe_avoir = data.prefixeAvoir;
  if (data.formatNumero !== undefined) result.format_numero = data.formatNumero;

  // CGU acceptance (LEGAL-001)
  if (data.cguAcceptedAt !== undefined) result.cgu_accepted_at = data.cguAcceptedAt;
  if (data.cguVersion !== undefined) result.cgu_version = data.cguVersion;

  // Statut
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.isDefault !== undefined) result.is_default = data.isDefault;
  if (data.ordre !== undefined) result.ordre = data.ordre;

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute initiales from company name. E.g. "Martin Renovation" → "MR"
 */
export function computeInitiales(nom) {
  if (!nom) return '';
  const words = nom.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/**
 * Generate a slug from company name. E.g. "Martin Renovation" → "martin-renovation"
 */
function generateSlug(nom) {
  if (!nom) return '';
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// ── Demo mode helpers ─────────────────────────────────────────────────────────

function demoLoad() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
  } catch { return []; }
}

function demoSave(list) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(list));
}

function demoGetActiveId() {
  return localStorage.getItem(DEMO_ACTIVE_KEY) || null;
}

function demoSetActiveId(id) {
  localStorage.setItem(DEMO_ACTIVE_KEY, id || '');
}

// ── CRUD Functions ──────────────────────────────────────────────────────────

/**
 * Load all non-archived entreprises for the current user/org.
 */
export async function loadEntreprises(supabase, { userId, orgId } = {}) {
  // Demo mode
  if (!supabase) {
    const all = demoLoad().filter(e => !e.archived_at);
    return all.map(fromSupabase);
  }

  let query = supabase
    .from('entreprise')
    .select('*')
    .is('archived_at', null)
    .order('ordre', { ascending: true })
    .order('created_at', { ascending: true });

  if (orgId && orgId !== 'demo-org-id') {
    query = query.eq('organization_id', orgId);
  } else if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[entrepriseService] loadEntreprises error:', error);
    return [];
  }

  return (data || []).map(fromSupabase);
}

/**
 * Get the currently active entreprise.
 */
export async function getActiveEntreprise(supabase, { userId, orgId } = {}) {
  if (!supabase) {
    const all = demoLoad();
    const activeId = demoGetActiveId();
    const active = all.find(e => e.id === activeId) || all.find(e => e.is_default) || all[0];
    return active ? fromSupabase(active) : null;
  }

  let query = supabase
    .from('entreprise')
    .select('*')
    .eq('is_active', true)
    .is('archived_at', null);

  if (orgId && orgId !== 'demo-org-id') {
    query = query.eq('organization_id', orgId);
  } else if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[entrepriseService] getActiveEntreprise error:', error);
    return null;
  }

  return data ? fromSupabase(data) : null;
}

/**
 * Create a new entreprise.
 * @throws if limit is reached
 */
export async function createEntreprise(supabase, { data, userId, orgId } = {}) {
  const initiales = data.initiales || computeInitiales(data.nom);
  const slug = data.slug || generateSlug(data.nom);

  // Demo mode
  if (!supabase) {
    const all = demoLoad();
    if (all.filter(e => !e.archived_at).length >= MAX_ENTREPRISES) {
      throw new Error(`Limite atteinte : ${MAX_ENTREPRISES} entreprises maximum.`);
    }
    const isFirst = all.length === 0;
    const newRow = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ent-${Date.now()}`,
      user_id: userId,
      organization_id: orgId,
      ...toSupabase({ ...data, initiales, slug }),
      nom: data.nom,
      initiales,
      slug,
      is_active: isFirst || data.isActive || false,
      is_default: isFirst || data.isDefault || false,
      ordre: all.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };
    all.push(newRow);
    demoSave(all);
    if (newRow.is_active) demoSetActiveId(newRow.id);
    return fromSupabase(newRow);
  }

  // Check limit
  const existing = await loadEntreprises(supabase, { userId, orgId });
  if (existing.length >= MAX_ENTREPRISES) {
    throw new Error(`Limite atteinte : ${MAX_ENTREPRISES} entreprises maximum. Passez au plan supérieur.`);
  }

  const isFirst = existing.length === 0;
  const row = {
    ...withOrgScope({
      ...toSupabase(data),
      nom: data.nom,
      initiales,
      slug: slug + '-' + Date.now().toString(36).slice(-4),
      is_active: isFirst || data.isActive || false,
      is_default: isFirst || data.isDefault || false,
      ordre: existing.length,
    }, userId, orgId),
  };

  const { data: created, error } = await supabase
    .from('entreprise')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[entrepriseService] createEntreprise error:', error);
    throw new Error('Erreur lors de la création de l\'entreprise : ' + error.message);
  }

  return fromSupabase(created);
}

/**
 * Update an existing entreprise.
 */
export async function updateEntreprise(supabase, { id, data, userId } = {}) {
  // Recompute initiales if nom changed
  const updates = { ...data };
  if (data.nom && !data.initiales) {
    updates.initiales = computeInitiales(data.nom);
  }

  const dbUpdates = toSupabase(updates);
  if (updates.initiales) dbUpdates.initiales = updates.initiales;

  // Demo mode
  if (!supabase) {
    const all = demoLoad();
    const idx = all.findIndex(e => e.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...dbUpdates, updated_at: new Date().toISOString() };
      demoSave(all);
    }
    return;
  }

  const { error } = await supabase
    .from('entreprise')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[entrepriseService] updateEntreprise error:', error);
    throw new Error('Erreur lors de la mise à jour : ' + error.message);
  }
}

/**
 * Archive an entreprise (soft delete).
 * Cannot archive the last non-archived entreprise.
 */
export async function archiveEntreprise(supabase, { id, userId, orgId } = {}) {
  // Demo mode
  if (!supabase) {
    const all = demoLoad();
    const nonArchived = all.filter(e => !e.archived_at);
    if (nonArchived.length <= 1) {
      throw new Error('Impossible d\'archiver la dernière entreprise.');
    }
    const idx = all.findIndex(e => e.id === id);
    if (idx >= 0) {
      all[idx].archived_at = new Date().toISOString();
      all[idx].is_active = false;
      // If this was active, activate next one
      const activeId = demoGetActiveId();
      if (activeId === id) {
        const next = all.find(e => !e.archived_at && e.id !== id);
        if (next) {
          next.is_active = true;
          demoSetActiveId(next.id);
        }
      }
      demoSave(all);
    }
    return;
  }

  // Check not last
  const existing = await loadEntreprises(supabase, { userId, orgId });
  if (existing.length <= 1) {
    throw new Error('Impossible d\'archiver la dernière entreprise.');
  }

  const target = existing.find(e => e.id === id);

  const { error } = await supabase
    .from('entreprise')
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[entrepriseService] archiveEntreprise error:', error);
    throw new Error('Erreur lors de l\'archivage : ' + error.message);
  }

  // If this was the active one, activate another
  if (target?.isActive) {
    const next = existing.find(e => e.id !== id);
    if (next) {
      await setActiveEntreprise(supabase, { id: next.id, userId, orgId });
    }
  }
}

/**
 * Set an entreprise as active (deactivate all others).
 */
export async function setActiveEntreprise(supabase, { id, userId, orgId } = {}) {
  // Demo mode
  if (!supabase) {
    const all = demoLoad();
    all.forEach(e => { e.is_active = (e.id === id); });
    demoSave(all);
    demoSetActiveId(id);
    return;
  }

  // Deactivate all for this user/org
  let deactivateQuery = supabase
    .from('entreprise')
    .update({ is_active: false });

  if (orgId && orgId !== 'demo-org-id') {
    deactivateQuery = deactivateQuery.eq('organization_id', orgId);
  } else {
    deactivateQuery = deactivateQuery.eq('user_id', userId);
  }

  await deactivateQuery;

  // Activate the selected one
  const { error } = await supabase
    .from('entreprise')
    .update({ is_active: true })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[entrepriseService] setActiveEntreprise error:', error);
  }
}

// ── Document Numbering ──────────────────────────────────────────────────────

/**
 * Get the next document number for an entreprise using the atomic PL/pgSQL function.
 * Falls back to local generation in demo mode.
 */
export async function getNextDocumentNumber(supabase, entrepriseId, type) {
  if (!supabase || !entrepriseId) {
    // Demo: local counter
    const all = demoLoad();
    const ent = all.find(e => e.id === entrepriseId);
    if (!ent) return null;

    const prefixKey = type === 'facture' ? 'prefixe_facture' : type === 'avoir' ? 'prefixe_avoir' : 'prefixe_devis';
    const counterKey = type === 'facture' ? 'compteur_facture' : type === 'avoir' ? 'compteur_avoir' : 'compteur_devis';
    const prefix = ent[prefixKey] || (type === 'facture' ? 'FAC' : type === 'avoir' ? 'AVC' : 'DEV');
    const counter = (ent[counterKey] || 0) + 1;
    ent[counterKey] = counter;
    demoSave(all);

    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(counter).padStart(5, '0')}`;
  }

  const { data, error } = await supabase.rpc('fn_next_document_number', {
    p_entreprise_id: entrepriseId,
    p_type: type,
  });

  if (error) {
    console.error('[entrepriseService] getNextDocumentNumber error:', error);
    return null;
  }

  return data;
}

// ── Migration: localStorage → Supabase ────────────────────────────────────

/**
 * Migrate existing company data from localStorage to Supabase.
 * Idempotent: skips if entreprises already exist in Supabase.
 *
 * Sources:
 * - cp_entreprise: single company settings (App.jsx state)
 * - cp_entreprises: array of companies (MultiEntreprise.jsx)
 * - cp_entreprise_active: active company ID
 */
export async function migrateFromLocalStorage(supabase, { userId, orgId } = {}) {
  // Check if already migrated
  const existing = await loadEntreprises(supabase, { userId, orgId });
  if (existing.length > 0) return existing;

  // Read localStorage sources
  let localEntreprises = [];
  let mainEntreprise = null;

  try {
    const raw = localStorage.getItem('cp_entreprises');
    if (raw) localEntreprises = JSON.parse(raw) || [];
  } catch {}

  try {
    const raw = localStorage.getItem('cp_entreprise');
    if (raw) mainEntreprise = JSON.parse(raw);
  } catch {}

  // Nothing to migrate
  if (!mainEntreprise && localEntreprises.length === 0) return [];

  const results = [];

  // Migrate main entreprise (from cp_entreprise - has business settings)
  if (mainEntreprise && mainEntreprise.nom) {
    try {
      const created = await createEntreprise(supabase, {
        data: {
          nom: mainEntreprise.nom,
          logo: mainEntreprise.logo || '',
          couleur: mainEntreprise.couleur || '#f97316',
          formeJuridique: mainEntreprise.formeJuridique || '',
          capital: mainEntreprise.capital || '',
          adresse: mainEntreprise.adresse || '',
          codePostal: mainEntreprise.codePostal || '',
          ville: mainEntreprise.ville || '',
          tel: mainEntreprise.tel || '',
          email: mainEntreprise.email || '',
          siteWeb: mainEntreprise.siteWeb || '',
          siret: mainEntreprise.siret || '',
          codeApe: mainEntreprise.codeApe || '',
          rcs: mainEntreprise.rcs || '',
          tvaIntra: mainEntreprise.tvaIntra || '',
          iban: mainEntreprise.iban || '',
          bic: mainEntreprise.bic || '',
          validiteDevis: mainEntreprise.validiteDevis ?? 30,
          tvaDefaut: mainEntreprise.tvaDefaut ?? 10,
          delaiPaiement: mainEntreprise.delaiPaiement ?? 30,
          acompteDefaut: mainEntreprise.acompteDefaut ?? 30,
          tauxFraisStructure: mainEntreprise.tauxFraisStructure ?? 15,
          cgv: mainEntreprise.cgv || '',
          mentionDevis: mainEntreprise.mentionDevis || mainEntreprise.mention_devis || '',
          mentionFacture: mainEntreprise.mentionFacture || mainEntreprise.mention_facture || '',
          // Assurances from settings
          assuranceDecennaleNumero: mainEntreprise.decennaleNumero || '',
          assuranceDecennaleCompagnie: mainEntreprise.decennaleAssureur || '',
          assuranceDecennaleValidite: mainEntreprise.decennaleValidite || '',
          assuranceRcProNumero: mainEntreprise.rcProNumero || '',
          assuranceRcProCompagnie: mainEntreprise.rcProAssureur || '',
          assuranceRcProValidite: mainEntreprise.rcProValidite || '',
          isActive: true,
          isDefault: true,
        },
        userId,
        orgId,
      });
      results.push(created);
    } catch (e) {
      console.error('[entrepriseService] Migration of main entreprise failed:', e);
    }
  }

  // Migrate additional entreprises from cp_entreprises (skip if same name as main)
  const mainNom = mainEntreprise?.nom?.toLowerCase();
  for (const ent of localEntreprises) {
    if (!ent.nom) continue;
    if (ent.nom.toLowerCase() === mainNom) continue; // Skip duplicate

    try {
      const created = await createEntreprise(supabase, {
        data: {
          nom: ent.nom,
          couleur: ent.couleur || '#f97316',
          adresse: ent.adresse || '',
          codePostal: ent.codePostal || '',
          ville: ent.ville || '',
          tel: ent.telephone || '',
          email: ent.email || '',
          siret: ent.siret || '',
          tvaIntra: ent.tva_intra || '',
          codeApe: ent.code_ape || '',
          rcs: ent.rcs || '',
          isActive: false,
          isDefault: false,
        },
        userId,
        orgId,
      });
      results.push(created);
    } catch (e) {
      console.error('[entrepriseService] Migration of additional entreprise failed:', e);
    }
  }

  // Backfill: assign existing documents to the default entreprise
  if (results.length > 0 && supabase) {
    const defaultEnt = results.find(e => e.isDefault) || results[0];
    try {
      // Assign unlinked devis
      await supabase
        .from('devis')
        .update({ entreprise_id: defaultEnt.id })
        .eq('user_id', userId)
        .is('entreprise_id', null);

      // Assign unlinked chantiers
      await supabase
        .from('chantiers')
        .update({ entreprise_id: defaultEnt.id })
        .eq('user_id', userId)
        .is('entreprise_id', null);

      // Initialize counters from existing document numbers
      await _initCountersFromExisting(supabase, defaultEnt.id, userId);
    } catch (e) {
      console.error('[entrepriseService] Backfill failed:', e);
    }
  }

  // Mark migration as done
  try {
    localStorage.setItem('batigesti_entreprise_migrated', 'true');
  } catch {}

  return results;
}

/**
 * Initialize the numbering counters by scanning existing document numbers.
 */
async function _initCountersFromExisting(supabase, entrepriseId, userId) {
  try {
    const year = new Date().getFullYear();

    // Find max devis number
    const { data: devisData } = await supabase
      .from('devis')
      .select('numero')
      .eq('user_id', userId)
      .like('numero', `%-${year}-%`);

    let maxDevis = 0;
    let maxFacture = 0;
    let maxAvoir = 0;

    for (const d of (devisData || [])) {
      const match = d.numero?.match(/^(DEV|FAC|AVC?)-\d{4}-(\d+)$/);
      if (!match) continue;
      const num = parseInt(match[2], 10);
      if (match[1] === 'DEV') maxDevis = Math.max(maxDevis, num);
      else if (match[1] === 'FAC') maxFacture = Math.max(maxFacture, num);
      else maxAvoir = Math.max(maxAvoir, num);
    }

    if (maxDevis > 0 || maxFacture > 0 || maxAvoir > 0) {
      await supabase
        .from('entreprise')
        .update({
          compteur_devis: maxDevis,
          compteur_facture: maxFacture,
          compteur_avoir: maxAvoir,
        })
        .eq('id', entrepriseId);
    }
  } catch (e) {
    console.error('[entrepriseService] _initCountersFromExisting error:', e);
  }
}

/**
 * Check if migration from localStorage is needed.
 */
export function detectMigrationNeeded() {
  try {
    const migrated = localStorage.getItem('batigesti_entreprise_migrated');
    if (migrated === 'true') return false;

    const hasMain = !!localStorage.getItem('cp_entreprise');
    const hasMulti = !!localStorage.getItem('cp_entreprises');
    return hasMain || hasMulti;
  } catch {
    return false;
  }
}
