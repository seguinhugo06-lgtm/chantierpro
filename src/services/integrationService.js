/**
 * integrationService.js — Generic CRUD for the integrations table
 *
 * Follows the same demo-mode pattern as entrepriseService.js:
 * - isDemo → localStorage fallback
 * - Production → Supabase + Vault RPCs
 *
 * All tokens/keys are stored server-side via Vault (never sent to client).
 */

import { isDemo } from '../supabaseClient';

// ── Demo mode storage ───────────────────────────────────────────────────────

const DEMO_KEY = 'batigesti_integrations';
const DEMO_SYNC_LOGS_KEY = 'batigesti_integration_sync_logs';

function demoLoad() {
  try {
    const stored = localStorage.getItem(DEMO_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function demoSave(list) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[integrationService] localStorage save failed:', e);
  }
}

function demoLoadSyncLogs() {
  try {
    const stored = localStorage.getItem(DEMO_SYNC_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function demoSaveSyncLogs(logs) {
  try {
    localStorage.setItem(DEMO_SYNC_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('[integrationService] localStorage sync logs save failed:', e);
  }
}

// ── Demo integrations ───────────────────────────────────────────────────────

const DEMO_INTEGRATIONS = [
  {
    id: 'demo-int-1',
    userId: 'demo-user-id',
    provider: 'pennylane',
    category: 'accounting',
    status: 'connected',
    config: {},
    providerAccountId: 'pl-demo-123',
    providerAccountName: 'Pennylane Démo',
    lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: null,
    syncEnabled: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-int-2',
    userId: 'demo-user-id',
    provider: 'google_calendar',
    category: 'calendar',
    status: 'connected',
    config: { calendarId: 'primary' },
    providerAccountId: null,
    providerAccountName: 'demo@batigesti.fr',
    lastSyncAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: null,
    syncEnabled: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const DEMO_SYNC_LOGS = [
  {
    id: 'demo-log-1',
    integrationId: 'demo-int-1',
    direction: 'push',
    entityType: 'facture',
    status: 'success',
    itemsSynced: 12,
    itemsFailed: 0,
    errorMessage: null,
    details: {},
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3500).toISOString(),
    durationMs: 3500,
  },
  {
    id: 'demo-log-2',
    integrationId: 'demo-int-1',
    direction: 'push',
    entityType: 'depense',
    status: 'success',
    itemsSynced: 8,
    itemsFailed: 0,
    errorMessage: null,
    details: {},
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 4000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 6200).toISOString(),
    durationMs: 2200,
  },
  {
    id: 'demo-log-3',
    integrationId: 'demo-int-2',
    direction: 'bidirectional',
    entityType: 'event',
    status: 'success',
    itemsSynced: 5,
    itemsFailed: 0,
    errorMessage: null,
    details: { pushed: 3, pulled: 2 },
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 30 * 60 * 1000 + 1800).toISOString(),
    durationMs: 1800,
  },
];

// ── Field mappings ──────────────────────────────────────────────────────────

function fromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    provider: row.provider,
    category: row.category,
    status: row.status || 'disconnected',
    config: row.config || {},
    providerAccountId: row.provider_account_id,
    providerAccountName: row.provider_account_name,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    syncEnabled: row.sync_enabled ?? true,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncLogFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    integrationId: row.integration_id,
    direction: row.direction,
    entityType: row.entity_type,
    status: row.status,
    itemsSynced: row.items_synced || 0,
    itemsFailed: row.items_failed || 0,
    errorMessage: row.error_message,
    details: row.details || {},
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

function entityMapFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    integrationId: row.integration_id,
    localEntityType: row.local_entity_type,
    localEntityId: row.local_entity_id,
    remoteEntityId: row.remote_entity_id,
    remoteEntityType: row.remote_entity_type,
    remoteEntityUrl: row.remote_entity_url,
    lastSyncedAt: row.last_synced_at,
    syncHash: row.sync_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Load all integrations for the user, optionally filtered by category
 */
export async function loadIntegrations(supabase, { userId, orgId, category } = {}) {
  if (!supabase || isDemo) {
    let list = demoLoad();
    if (!list.length) {
      list = [...DEMO_INTEGRATIONS];
      demoSave(list);
    }
    if (category) list = list.filter(i => i.category === category);
    return list;
  }

  try {
    let query = supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: true });

    // Scope to user or org
    if (orgId) {
      query = query.or(`user_id.eq.${userId},organization_id.eq.${orgId}`);
    } else {
      query = query.eq('user_id', userId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      // Silently handle missing table (integrations not yet created via migration)
      if (error.message?.includes('schema cache') || error.code === '42P01') {
        return [];
      }
      console.warn('[integrationService] loadIntegrations:', error.message);
      return [];
    }
    return (data || []).map(fromSupabase);
  } catch (e) {
    console.warn('[integrationService] loadIntegrations:', e?.message || e);
    return [];
  }
}

/**
 * Get a single integration by provider
 */
export async function getIntegration(supabase, { userId, provider }) {
  if (!supabase || isDemo) {
    const list = demoLoad();
    return list.find(i => i.provider === provider) || null;
  }

  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error && error.code !== 'PGRST116') {
      if (!error.message?.includes('schema cache') && error.code !== '42P01') {
        console.warn('[integrationService] getIntegration:', error.message);
      }
    }
    return data ? fromSupabase(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Connect an integration via Vault RPC
 * For OAuth: called after receiving tokens from Edge Function
 * For API key: called directly from connect modal
 */
export async function connectIntegration(supabase, { provider, userId, orgId, apiKey, providerAccountName, config }) {
  if (!supabase || isDemo) {
    const list = demoLoad();
    const existing = list.findIndex(i => i.provider === provider);
    const integration = {
      id: existing >= 0 ? list[existing].id : `demo-int-${Date.now()}`,
      userId,
      provider,
      category: getCategoryForProvider(provider),
      status: 'connected',
      config: config || {},
      providerAccountId: null,
      providerAccountName: providerAccountName || `${provider} Démo`,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      syncEnabled: true,
      createdAt: existing >= 0 ? list[existing].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existing >= 0) {
      list[existing] = integration;
    } else {
      list.push(integration);
    }
    demoSave(list);
    return integration;
  }

  try {
    // Call the Vault RPC to store credentials securely
    const { data, error } = await supabase.rpc('store_integration_credentials', {
      p_provider: provider,
      p_api_key: apiKey || null,
      p_access_token: null,
      p_refresh_token: null,
      p_provider_account_name: providerAccountName || null,
      p_config: config || {},
    });

    if (error) {
      console.error('[integrationService] connectIntegration RPC error:', error.message);
      throw new Error(error.message);
    }

    if (data && !data.success) {
      throw new Error(data.error || 'Erreur de connexion');
    }

    // Return the updated integration
    return await getIntegration(supabase, { userId, provider });
  } catch (e) {
    console.error('[integrationService] connectIntegration exception:', e);
    throw e;
  }
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(supabase, { provider, userId }) {
  if (!supabase || isDemo) {
    const list = demoLoad();
    const idx = list.findIndex(i => i.provider === provider);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: 'disconnected',
        providerAccountId: null,
        providerAccountName: null,
        syncEnabled: false,
        updatedAt: new Date().toISOString(),
      };
      demoSave(list);
    }
    return;
  }

  try {
    const { data, error } = await supabase.rpc('disconnect_integration', {
      p_provider: provider,
    });

    if (error) {
      console.error('[integrationService] disconnectIntegration RPC error:', error.message);
      throw new Error(error.message);
    }

    if (data && !data.success) {
      throw new Error(data.error || 'Erreur de déconnexion');
    }
  } catch (e) {
    console.error('[integrationService] disconnectIntegration exception:', e);
    throw e;
  }
}

/**
 * Update integration config (non-sensitive data)
 */
export async function updateIntegrationConfig(supabase, { provider, config, userId }) {
  if (!supabase || isDemo) {
    const list = demoLoad();
    const idx = list.findIndex(i => i.provider === provider);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        config: { ...list[idx].config, ...config },
        updatedAt: new Date().toISOString(),
      };
      demoSave(list);
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('integrations')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) {
      if (error.message?.includes('schema cache') || error.code === '42P01') return;
      console.warn('[integrationService] updateConfig:', error.message);
      throw new Error(error.message);
    }
  } catch (e) {
    if (e?.message?.includes('schema cache')) return;
    throw e;
  }
}

/**
 * Trigger a sync operation via Edge Function
 */
export async function triggerSync(supabase, { provider, direction = 'push', entityType, userId }) {
  if (!supabase || isDemo) {
    // Simulate sync in demo mode
    await new Promise(resolve => setTimeout(resolve, 1500));
    const list = demoLoad();
    const idx = list.findIndex(i => i.provider === provider);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncError: null,
        updatedAt: new Date().toISOString(),
      };
      demoSave(list);
    }

    // Add demo sync log
    const logs = demoLoadSyncLogs();
    logs.unshift({
      id: `demo-log-${Date.now()}`,
      integrationId: list[idx]?.id,
      direction,
      entityType: entityType || 'all',
      status: 'success',
      itemsSynced: Math.floor(Math.random() * 10) + 1,
      itemsFailed: 0,
      errorMessage: null,
      details: {},
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 1500,
    });
    demoSaveSyncLogs(logs.slice(0, 50));

    return { success: true, itemsSynced: logs[0].itemsSynced };
  }

  try {
    const { data, error } = await supabase.functions.invoke('integration-proxy', {
      body: {
        action: 'sync',
        provider,
        direction,
        entityType,
      },
    });

    if (error) {
      console.error('[integrationService] triggerSync error:', error.message);
      throw new Error(error.message);
    }

    return data;
  } catch (e) {
    console.error('[integrationService] triggerSync exception:', e);
    throw e;
  }
}

/**
 * Initiate OAuth flow — returns the authorization URL
 */
export async function initiateOAuth(supabase, { provider, redirectUri }) {
  if (!supabase || isDemo) {
    // In demo mode, simulate immediate connection
    return { url: null, demoMode: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('integration-proxy', {
      body: {
        action: 'initiate_oauth',
        provider,
        redirectUri,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  } catch (e) {
    console.error('[integrationService] initiateOAuth exception:', e);
    throw e;
  }
}

/**
 * Complete OAuth callback — exchanges code for tokens
 */
export async function completeOAuth(supabase, { provider, code, state }) {
  if (!supabase || isDemo) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('integration-proxy', {
      body: {
        action: 'oauth_callback',
        provider,
        code,
        state,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  } catch (e) {
    console.error('[integrationService] completeOAuth exception:', e);
    throw e;
  }
}

// ── Sync Logs ───────────────────────────────────────────────────────────────

/**
 * Get sync logs for an integration
 */
export async function getSyncLogs(supabase, { integrationId, limit = 20 }) {
  if (!supabase || isDemo) {
    let logs = demoLoadSyncLogs();
    if (!logs.length) logs = [...DEMO_SYNC_LOGS];
    return logs
      .filter(l => !integrationId || l.integrationId === integrationId)
      .slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('integration_sync_logs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[integrationService] getSyncLogs error:', error.message);
      return [];
    }
    return (data || []).map(syncLogFromSupabase);
  } catch (e) {
    console.error('[integrationService] getSyncLogs exception:', e);
    return [];
  }
}

// ── Entity Mappings ─────────────────────────────────────────────────────────

/**
 * Get entity mappings for an integration
 */
export async function getEntityMappings(supabase, { integrationId, entityType, limit = 100 }) {
  if (!supabase || isDemo) {
    return [];
  }

  try {
    let query = supabase
      .from('integration_entity_map')
      .select('*')
      .eq('integration_id', integrationId)
      .order('last_synced_at', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('local_entity_type', entityType);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[integrationService] getEntityMappings error:', error.message);
      return [];
    }
    return (data || []).map(entityMapFromSupabase);
  } catch (e) {
    console.error('[integrationService] getEntityMappings exception:', e);
    return [];
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryForProvider(provider) {
  const categories = {
    pennylane: 'accounting', indy: 'accounting', tiime: 'accounting',
    google_calendar: 'calendar', outlook_calendar: 'calendar', ical: 'calendar',
    qonto: 'banking', shine: 'banking', bridge: 'banking',
    yousign: 'signature', docusign: 'signature',
    google_drive: 'storage', dropbox: 'storage',
    webhooks: 'automation', zapier: 'automation', make: 'automation',
    whatsapp: 'communication',
  };
  return categories[provider] || 'other';
}

export default {
  loadIntegrations,
  getIntegration,
  connectIntegration,
  disconnectIntegration,
  updateIntegrationConfig,
  triggerSync,
  initiateOAuth,
  completeOAuth,
  getSyncLogs,
  getEntityMappings,
};
