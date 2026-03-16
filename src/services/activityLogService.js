/**
 * Activity Log Service — Tracks user actions for audit trail.
 * Supports both Supabase (production) and localStorage (demo mode).
 */

import supabase, { isDemo } from '../supabaseClient';

const DEMO_STORAGE_KEY = 'bg_activity_log';
const MAX_DEMO_ENTRIES = 200;

/**
 * Log an activity.
 *
 * @param {Object} params
 * @param {string} params.entityType - 'devis', 'client', 'chantier', 'facture'
 * @param {string} params.entityId - UUID of the entity
 * @param {string} params.action - 'create', 'update', 'delete', 'send', 'sign'
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata - Extra context
 * @param {string} params.userId - User ID
 * @param {string} params.organizationId - Org ID
 */
export async function logActivity({
  entityType,
  entityId,
  action,
  description,
  metadata = {},
  userId,
  organizationId,
}) {
  const entry = {
    id: crypto.randomUUID?.() || `act_${Date.now()}`,
    entity_type: entityType,
    entity_id: entityId,
    action,
    description,
    metadata,
    user_id: userId,
    organization_id: organizationId,
    created_at: new Date().toISOString(),
  };

  if (isDemo || !supabase) {
    // Demo mode: store in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '[]');
      stored.unshift(entry);
      localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify(stored.slice(0, MAX_DEMO_ENTRIES))
      );
    } catch {
      // Ignore storage errors
    }
    return entry;
  }

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('[activityLogService] Error logging activity:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[activityLogService] Error:', err.message);
    return null;
  }
}

/**
 * Fetch recent activity log entries.
 *
 * @param {Object} options
 * @param {number} options.limit - Max entries to return (default 50)
 * @param {string} options.entityType - Filter by entity type
 * @param {string} options.entityId - Filter by entity ID
 * @returns {Promise<Array>}
 */
export async function getActivityLog({ limit = 50, entityType, entityId } = {}) {
  if (isDemo || !supabase) {
    try {
      let entries = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '[]');
      if (entityType) entries = entries.filter(e => e.entity_type === entityType);
      if (entityId) entries = entries.filter(e => e.entity_id === entityId);
      return entries.slice(0, limit);
    } catch {
      return [];
    }
  }

  try {
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);

    const { data, error } = await query;
    if (error) {
      console.error('[activityLogService] Error fetching:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[activityLogService] Error:', err.message);
    return [];
  }
}

/**
 * Action labels for display.
 */
export const ACTION_LABELS = {
  create: { label: 'Création', color: '#22c55e', emoji: '➕' },
  update: { label: 'Modification', color: '#3b82f6', emoji: '✏️' },
  delete: { label: 'Suppression', color: '#ef4444', emoji: '🗑️' },
  send: { label: 'Envoi', color: '#8b5cf6', emoji: '📤' },
  sign: { label: 'Signature', color: '#f59e0b', emoji: '✍️' },
  convert: { label: 'Conversion', color: '#06b6d4', emoji: '🔄' },
  payment: { label: 'Paiement', color: '#22c55e', emoji: '💰' },
};

/**
 * Entity type labels.
 */
export const ENTITY_LABELS = {
  devis: 'Devis',
  facture: 'Facture',
  client: 'Client',
  chantier: 'Chantier',
  catalogue: 'Catalogue',
  equipe: 'Équipe',
  depense: 'Dépense',
};
