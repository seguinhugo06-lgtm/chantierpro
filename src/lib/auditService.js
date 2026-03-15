/**
 * auditService.js — Audit Trail Service
 *
 * Provides non-blocking audit logging for all entity actions.
 * Supports both Supabase (production) and localStorage (demo mode).
 */

import { scopeToOrg, withOrgScope } from './queryHelper';

const DEMO_KEY = 'batigesti_demo_audit_logs';

// ── Technical fields to skip when computing changes ──
const IGNORED_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'user_id', 'organization_id',
  'createdAt', 'updatedAt', 'userId', 'organizationId',
]);

/**
 * Compute changes between old and new data objects.
 * Returns { field: { old, new } } for each changed field.
 *
 * @param {Object} oldData - Previous state
 * @param {Object} newData - New state
 * @param {string[]|null} fieldsToTrack - If provided, only track these fields
 * @returns {Object} Changes map
 */
export function computeChanges(oldData, newData, fieldsToTrack = null) {
  if (!oldData || !newData) return {};

  const changes = {};
  const fields = fieldsToTrack || [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];

  for (const field of fields) {
    if (IGNORED_FIELDS.has(field)) continue;

    const oldVal = oldData[field];
    const newVal = newData[field];

    // Deep compare for objects/arrays
    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);

    if (oldStr !== newStr) {
      changes[field] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  return changes;
}

/**
 * Log an audit action (fire-and-forget pattern).
 *
 * @param {Object|null} supabase - Supabase client (null for demo mode)
 * @param {Object} params
 * @param {string} params.entityType - 'devis', 'chantier', 'client', etc.
 * @param {string} params.entityId - Entity UUID
 * @param {string} params.action - 'created', 'updated', 'deleted', 'status_changed', 'sent', 'signed', 'duplicated', 'restored'
 * @param {Object} [params.changes={}] - Changes map from computeChanges()
 * @param {Object} [params.metadata={}] - Additional context
 * @param {string|null} [params.snapshotId] - Link to document_snapshots
 * @param {string} params.userId - User UUID
 * @param {string|null} params.orgId - Organization UUID
 * @param {string} [params.userName] - Denormalized user name
 * @returns {Promise<Object|null>} Created log entry or null
 */
export async function logAction(supabase, {
  entityType,
  entityId,
  action,
  changes = {},
  metadata = {},
  snapshotId = null,
  userId,
  orgId,
  userName = '',
}) {
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes,
    metadata,
    snapshot_id: snapshotId,
    user_name: userName,
    created_at: new Date().toISOString(),
  };

  // Demo mode → localStorage
  if (!supabase) {
    try {
      const logs = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      logs.unshift({ ...entry, user_id: userId, organization_id: orgId });
      // Keep max 500 entries in demo
      if (logs.length > 500) logs.length = 500;
      localStorage.setItem(DEMO_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('[auditService] Demo save error:', e);
    }
    return entry;
  }

  // Production → Supabase
  const data = withOrgScope({
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes,
    metadata,
    snapshot_id: snapshotId,
    user_name: userName,
  }, userId, orgId);

  const { data: result, error } = await supabase
    .from('audit_logs')
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('[auditService] logAction error:', error);
    }
    return null;
  }

  return result;
}

/**
 * Get audit history for a specific entity.
 *
 * @param {Object|null} supabase - Supabase client
 * @param {string} entityType
 * @param {string} entityId
 * @param {Object} options
 * @param {number} [options.limit=50]
 * @param {string|null} [options.userId] - For demo mode scoping
 * @param {string|null} [options.orgId] - For org scoping
 * @returns {Promise<Array>} Audit log entries
 */
export async function getEntityHistory(supabase, entityType, entityId, { limit = 50, userId = null, orgId = null } = {}) {
  // Demo mode
  if (!supabase) {
    try {
      const logs = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      return logs
        .filter(l => l.entity_type === entityType && l.entity_id === entityId)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (orgId || userId) {
    query = scopeToOrg(query, orgId, userId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('[auditService] getEntityHistory error:', error);
    }
    return [];
  }

  return data || [];
}

/**
 * Get recent activity across all entities.
 *
 * @param {Object|null} supabase
 * @param {Object} options
 * @param {number} [options.limit=20]
 * @param {string[]|null} [options.entityTypes] - Filter by entity types
 * @param {string|null} [options.userId]
 * @param {string|null} [options.orgId]
 * @returns {Promise<Array>}
 */
export async function getRecentActivity(supabase, { limit = 20, entityTypes = null, userId = null, orgId = null } = {}) {
  // Demo mode
  if (!supabase) {
    try {
      const logs = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      let filtered = logs;
      if (entityTypes) {
        filtered = logs.filter(l => entityTypes.includes(l.entity_type));
      }
      return filtered.slice(0, limit);
    } catch {
      return [];
    }
  }

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityTypes && entityTypes.length > 0) {
    query = query.in('entity_type', entityTypes);
  }

  if (orgId || userId) {
    query = scopeToOrg(query, orgId, userId);
  }

  const { data, error } = await query;
  if (error) {
    // Silently ignore if the table doesn't exist yet (42P01 = undefined_table)
    if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('[auditService] getRecentActivity error:', error);
    }
    return [];
  }

  return data || [];
}

/**
 * Get audit history for multiple entities (e.g., all devis of a chantier).
 *
 * @param {Object|null} supabase
 * @param {string} entityType
 * @param {string[]} entityIds
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function getEntitiesHistory(supabase, entityType, entityIds, { limit = 100, userId = null, orgId = null } = {}) {
  if (!entityIds || entityIds.length === 0) return [];

  // Demo mode
  if (!supabase) {
    try {
      const logs = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      return logs
        .filter(l => l.entity_type === entityType && entityIds.includes(l.entity_id))
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (orgId || userId) {
    query = scopeToOrg(query, orgId, userId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('[auditService] getEntitiesHistory error:', error);
    }
    return [];
  }

  return data || [];
}

/**
 * Human-readable action labels (French)
 */
export const ACTION_LABELS = {
  created: 'Création',
  updated: 'Modification',
  deleted: 'Suppression',
  status_changed: 'Changement de statut',
  sent: 'Envoi',
  signed: 'Signature',
  duplicated: 'Duplication',
  restored: 'Restauration',
};

/**
 * Action icons for timeline display
 */
export const ACTION_ICONS = {
  created: { emoji: '🟢', color: '#22c55e' },
  updated: { emoji: '🔵', color: '#3b82f6' },
  deleted: { emoji: '🗑️', color: '#ef4444' },
  status_changed: { emoji: '🟡', color: '#eab308' },
  sent: { emoji: '📧', color: '#8b5cf6' },
  signed: { emoji: '✍️', color: '#06b6d4' },
  duplicated: { emoji: '📋', color: '#64748b' },
  restored: { emoji: '🔄', color: '#f59e0b' },
};

/**
 * Entity type labels (French)
 */
export const ENTITY_LABELS = {
  devis: 'Devis',
  chantier: 'Chantier',
  client: 'Client',
  facture: 'Facture',
  acompte: 'Acompte',
};

/**
 * Field labels for change display (French)
 */
export const FIELD_LABELS = {
  statut: 'Statut',
  client_nom: 'Client',
  client_id: 'Client',
  objet: 'Objet',
  lignes: 'Lignes',
  total_ht: 'Total HT',
  total_ttc: 'Total TTC',
  totalHt: 'Total HT',
  totalTtc: 'Total TTC',
  notes: 'Notes',
  conditions: 'Conditions',
  validite: 'Validité',
  remise_globale: 'Remise globale',
  remiseGlobale: 'Remise globale',
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'Email',
  telephone: 'Téléphone',
  adresse: 'Adresse',
  ville: 'Ville',
  code_postal: 'Code postal',
  description: 'Description',
  montant: 'Montant',
};
