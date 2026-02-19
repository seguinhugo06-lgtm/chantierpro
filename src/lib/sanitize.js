/**
 * sanitize.js — Data sanitization layer between Supabase and React state
 *
 * Ensures all data from Supabase is type-safe before entering the React tree.
 * Converts objects-where-strings-expected, coerces types, strips nulls, and
 * provides default values for required fields.
 *
 * Prevents:
 *  - React Error #310 (Objects are not valid as React child)
 *  - TypeError: x.split is not a function
 *  - undefined.map / null.forEach
 */

// ─── Primitive coercers ──────────────────────────────────────────────────────

/** Safely coerce any value to a string */
function str(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return isNaN(value.getTime()) ? fallback : value.toISOString();
  if (typeof value === 'object') {
    // Try extracting a meaningful string from common shapes
    if (value.nom) return String(value.nom);
    if (value.name) return String(value.name);
    if (value.label) return String(value.label);
    if (value.message) return String(value.message);
    try { return JSON.stringify(value); } catch { return fallback; }
  }
  return fallback;
}

/** Safely coerce to number */
function num(value, fallback = 0) {
  if (value == null) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/** Safely coerce to boolean */
function bool(value, fallback = false) {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return fallback;
}

/** Safely coerce to array */
function arr(value, fallback = []) {
  if (Array.isArray(value)) return value;
  return fallback;
}

/** Safely coerce to plain object */
function obj(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return fallback;
}

/** Safely coerce to ISO date string */
function dateStr(value, fallback = '') {
  if (!value) return fallback;
  if (typeof value === 'string') {
    // Validate it parses
    const d = new Date(value);
    return isNaN(d.getTime()) ? fallback : value;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? fallback : value.toISOString();
  }
  return fallback;
}


// ─── Schema definitions ──────────────────────────────────────────────────────
//
// Each schema maps field → coercer function.
// Fields not in schema are passed through as-is.
// This is intentionally lightweight — not a full ORM, just crash prevention.

const CLIENT_SCHEMA = {
  id: str,
  nom: str,
  prenom: str,
  email: str,
  telephone: str,
  adresse: str,
  ville: str,
  code_postal: str,
  type: str,
  categorie: str,
  notes: str,
  entreprise: str,
  siret: str,
};

const DEVIS_SCHEMA = {
  id: str,
  numero: str,
  type: str,
  statut: str,
  date: str,
  objet: str,
  titre: str,
  conditions: str,
  client_id: str,
  chantier_id: str,
  total_ht: num,
  total_ttc: num,
  tva: num,
  remise: num,
  acompte_pct: num,
  validite: num,
  tva_taux: num,
};

const CHANTIER_SCHEMA = {
  id: str,
  nom: str,
  description: str,
  adresse: str,
  ville: str,
  code_postal: str,
  statut: str,
  type: str,
  client_id: str,
  avancement: num,
  budget_prevu: num,
  budget_reel: num,
  date_debut: str,
  date_fin: str,
  photos: arr,
  taches: arr,
};

const DEPENSE_SCHEMA = {
  id: str,
  description: str,
  categorie: str,
  fournisseur: str,
  date: str,
  montant: num,
  tva: num,
  chantier_id: str,
  mode_paiement: str,
};

const EQUIPE_SCHEMA = {
  id: str,
  nom: str,
  prenom: str,
  role: str,
  email: str,
  telephone: str,
  specialite: str,
  taux_horaire: num,
  statut: str,
};

const POINTAGE_SCHEMA = {
  id: str,
  date: str,
  description: str,
  heures: num,
  membre_id: str,
  chantier_id: str,
};

const CATALOGUE_SCHEMA = {
  id: str,
  nom: str,
  description: str,
  categorie: str,
  unite: str,
  prix_ht: num,
  tva_taux: num,
  stock: num,
  fournisseur: str,
  reference: str,
};

const PAIEMENT_SCHEMA = {
  id: str,
  date: str,
  montant: num,
  mode: str,
  reference: str,
  devis_id: str,
  client_id: str,
};

const ECHANGE_SCHEMA = {
  id: str,
  date: str,
  type: str,
  contenu: str,
  client_id: str,
  devis_id: str,
};

const AJUSTEMENT_SCHEMA = {
  id: str,
  description: str,
  montant: num,
  date: str,
  chantier_id: str,
  type: str,
};


// ─── Sanitization engine ─────────────────────────────────────────────────────

/**
 * Sanitize a single record against a schema.
 * Unknown fields are preserved as-is.
 */
function sanitizeRecord(record, schema) {
  if (!record || typeof record !== 'object') return record;

  const cleaned = { ...record };
  for (const [field, coerce] of Object.entries(schema)) {
    if (field in cleaned) {
      cleaned[field] = coerce(cleaned[field]);
    }
  }
  return cleaned;
}

/**
 * Sanitize an array of records.
 * Filters out non-object items and applies schema to each record.
 */
function sanitizeArray(data, schema, name = '') {
  if (!Array.isArray(data)) {
    if (data != null) {
      console.warn(`[sanitize] ${name}: expected array, got ${typeof data}`);
    }
    return [];
  }

  return data
    .filter(item => item && typeof item === 'object')
    .map(item => sanitizeRecord(item, schema));
}


// ─── Public API ──────────────────────────────────────────────────────────────

export function sanitizeClients(data) {
  return sanitizeArray(data, CLIENT_SCHEMA, 'clients');
}

export function sanitizeDevis(data) {
  return sanitizeArray(data, DEVIS_SCHEMA, 'devis');
}

export function sanitizeChantiers(data) {
  return sanitizeArray(data, CHANTIER_SCHEMA, 'chantiers');
}

export function sanitizeDepenses(data) {
  return sanitizeArray(data, DEPENSE_SCHEMA, 'depenses');
}

export function sanitizeEquipe(data) {
  return sanitizeArray(data, EQUIPE_SCHEMA, 'equipe');
}

export function sanitizePointages(data) {
  return sanitizeArray(data, POINTAGE_SCHEMA, 'pointages');
}

export function sanitizeCatalogue(data) {
  return sanitizeArray(data, CATALOGUE_SCHEMA, 'catalogue');
}

export function sanitizePaiements(data) {
  return sanitizeArray(data, PAIEMENT_SCHEMA, 'paiements');
}

export function sanitizeEchanges(data) {
  return sanitizeArray(data, ECHANGE_SCHEMA, 'echanges');
}

export function sanitizeAjustements(data) {
  return sanitizeArray(data, AJUSTEMENT_SCHEMA, 'ajustements');
}

/**
 * Sanitize all data from a Supabase loadAllData() response.
 * Returns a fully type-safe data object.
 */
export function sanitizeAllData(data) {
  if (!data || typeof data !== 'object') return {};

  return {
    clients: sanitizeClients(data.clients),
    devis: sanitizeDevis(data.devis),
    chantiers: sanitizeChantiers(data.chantiers),
    depenses: sanitizeDepenses(data.depenses),
    equipe: sanitizeEquipe(data.equipe),
    pointages: sanitizePointages(data.pointages),
    catalogue: sanitizeCatalogue(data.catalogue),
    paiements: sanitizePaiements(data.paiements),
    echanges: sanitizeEchanges(data.echanges),
    ajustements: sanitizeAjustements(data.ajustements),
  };
}

/**
 * Sanitize a single record by entity type.
 * Useful for sanitizing items on add/update operations.
 */
const SCHEMA_MAP = {
  clients: CLIENT_SCHEMA,
  devis: DEVIS_SCHEMA,
  chantiers: CHANTIER_SCHEMA,
  depenses: DEPENSE_SCHEMA,
  equipe: EQUIPE_SCHEMA,
  pointages: POINTAGE_SCHEMA,
  catalogue: CATALOGUE_SCHEMA,
  paiements: PAIEMENT_SCHEMA,
  echanges: ECHANGE_SCHEMA,
  ajustements: AJUSTEMENT_SCHEMA,
};

export function sanitizeOne(entity, record) {
  const schema = SCHEMA_MAP[entity];
  if (!schema) return record;
  return sanitizeRecord(record, schema);
}
