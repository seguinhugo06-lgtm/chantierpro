/**
 * snapshotService.js — Document Versioning Service
 *
 * Creates and retrieves full JSON snapshots of documents (devis, etc.)
 * for version history and restore functionality.
 */

import { scopeToOrg, withOrgScope } from './queryHelper';

const DEMO_KEY = 'batigesti_demo_snapshots';

/**
 * Get the next version number for an entity.
 *
 * @param {Object|null} supabase
 * @param {string} entityType
 * @param {string} entityId
 * @returns {Promise<number>}
 */
async function getNextVersion(supabase, entityType, entityId) {
  // Demo mode
  if (!supabase) {
    try {
      const snapshots = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const entitySnapshots = snapshots.filter(
        s => s.entity_type === entityType && s.entity_id === entityId
      );
      if (entitySnapshots.length === 0) return 1;
      return Math.max(...entitySnapshots.map(s => s.version)) + 1;
    } catch {
      return 1;
    }
  }

  const { data, error } = await supabase
    .from('document_snapshots')
    .select('version')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 1;
  return (data.version || 0) + 1;
}

/**
 * Create a snapshot of an entity's current state.
 *
 * @param {Object|null} supabase
 * @param {Object} params
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {Object} params.data - Full document data to snapshot
 * @param {string} params.trigger - 'manual', 'auto_status_change', 'auto_send', 'auto_sign'
 * @param {string} [params.label] - Optional human label
 * @param {string} params.userId
 * @param {string|null} params.orgId
 * @returns {Promise<Object|null>} Created snapshot or null
 */
export async function createSnapshot(supabase, {
  entityType,
  entityId,
  data: snapshotData,
  trigger,
  label = null,
  userId,
  orgId,
}) {
  const version = await getNextVersion(supabase, entityType, entityId);

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `snap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entity_type: entityType,
    entity_id: entityId,
    version,
    data: snapshotData,
    label: label || _autoLabel(trigger, version),
    trigger,
    created_at: new Date().toISOString(),
  };

  // Demo mode → localStorage
  if (!supabase) {
    try {
      const snapshots = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      snapshots.unshift({ ...entry, user_id: userId, organization_id: orgId });
      // Keep max 200 snapshots in demo
      if (snapshots.length > 200) snapshots.length = 200;
      localStorage.setItem(DEMO_KEY, JSON.stringify(snapshots));
    } catch (e) {
      console.warn('[snapshotService] Demo save error:', e.message);
    }
    return entry;
  }

  // Production → Supabase
  const insertData = withOrgScope({
    entity_type: entityType,
    entity_id: entityId,
    version,
    data: snapshotData,
    label: label || _autoLabel(trigger, version),
    trigger,
  }, userId, orgId);

  const { data: result, error } = await supabase
    .from('document_snapshots')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.warn('[snapshotService] createSnapshot not available:', error.message);
    return null;
  }

  return result;
}

/**
 * Get all snapshots for an entity, sorted by version DESC.
 *
 * @param {Object|null} supabase
 * @param {string} entityType
 * @param {string} entityId
 * @param {Object} [options]
 * @param {string|null} [options.userId]
 * @param {string|null} [options.orgId]
 * @returns {Promise<Array>}
 */
export async function getSnapshots(supabase, entityType, entityId, { userId = null, orgId = null } = {}) {
  // Demo mode
  if (!supabase) {
    try {
      const snapshots = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      return snapshots
        .filter(s => s.entity_type === entityType && s.entity_id === entityId)
        .sort((a, b) => b.version - a.version);
    } catch {
      return [];
    }
  }

  let query = supabase
    .from('document_snapshots')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version', { ascending: false });

  if (orgId || userId) {
    query = scopeToOrg(query, orgId, userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[snapshotService] getSnapshots not available:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Get a single snapshot by ID.
 *
 * @param {Object|null} supabase
 * @param {string} snapshotId
 * @returns {Promise<Object|null>}
 */
export async function getSnapshot(supabase, snapshotId) {
  // Demo mode
  if (!supabase) {
    try {
      const snapshots = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      return snapshots.find(s => s.id === snapshotId) || null;
    } catch {
      return null;
    }
  }

  const { data, error } = await supabase
    .from('document_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (error) {
    console.warn('[snapshotService] getSnapshot not available:', error.message);
    return null;
  }

  return data;
}

/**
 * Generate auto-label based on trigger.
 */
function _autoLabel(trigger, version) {
  switch (trigger) {
    case 'auto_status_change': return `Version ${version} — Changement de statut`;
    case 'auto_send': return `Version ${version} — Envoyé`;
    case 'auto_sign': return `Version ${version} — Signé`;
    case 'manual': return `Version ${version} — Sauvegarde manuelle`;
    default: return `Version ${version}`;
  }
}

/**
 * Trigger labels (French)
 */
export const TRIGGER_LABELS = {
  manual: 'Sauvegarde manuelle',
  auto_status_change: 'Changement de statut',
  auto_send: 'Envoi',
  auto_sign: 'Signature',
};
