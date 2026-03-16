// src/lib/queryHelper.js
// Organization-aware query helper for Supabase
// Provides backward-compatible scoping: uses organization_id when available,
// falls back to user_id during migration period

/**
 * Scope a Supabase query to the current organization
 * Falls back to user_id if orgId is not available (migration safety)
 *
 * @param {import('@supabase/supabase-js').PostgrestQueryBuilder} query - Supabase query builder
 * @param {string|null} orgId - Organization UUID (from OrgContext)
 * @param {string} userId - User UUID (from auth)
 * @returns {import('@supabase/supabase-js').PostgrestQueryBuilder} Scoped query
 */
export function scopeToOrg(query, orgId, userId) {
  if (orgId && orgId !== 'demo-org-id') {
    return query.eq('organization_id', orgId);
  }
  // Fallback for migration period (data not yet backfilled, or demo mode)
  return query.eq('user_id', userId);
}

/**
 * Build the data object for INSERT/UPDATE with both user_id and organization_id
 * Ensures new records always have both fields set
 *
 * @param {Object} data - The data to save
 * @param {string} userId - User UUID
 * @param {string|null} orgId - Organization UUID
 * @returns {Object} Data with user_id and organization_id added
 */
export function withOrgScope(data, userId, orgId) {
  const scoped = { ...data, user_id: userId };
  if (orgId && orgId !== 'demo-org-id') {
    scoped.organization_id = orgId;
  }
  return scoped;
}
