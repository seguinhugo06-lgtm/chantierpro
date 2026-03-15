/**
 * syncService.js — Sync orchestration for integrations
 *
 * Wraps calls to integration-proxy Edge Function for triggering syncs.
 * Handles demo mode, status polling, and auto-sync triggers.
 */

import { supabase, isDemo } from '../supabaseClient';

// ── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_SYNC_LOGS = [
  {
    id: 'demo-sync-1',
    integrationId: 'demo-int-pennylane',
    direction: 'push',
    entityType: 'facture',
    status: 'success',
    itemsSynced: 12,
    itemsFailed: 0,
    errorMessage: null,
    details: { pushed: ['FAC-2026-001', 'FAC-2026-002'] },
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3595000).toISOString(),
    durationMs: 5000,
  },
  {
    id: 'demo-sync-2',
    integrationId: 'demo-int-pennylane',
    direction: 'pull',
    entityType: 'depense',
    status: 'success',
    itemsSynced: 8,
    itemsFailed: 1,
    errorMessage: null,
    details: { pulled: ['Fournitures Brico', 'Location nacelle'] },
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7190000).toISOString(),
    durationMs: 10000,
  },
  {
    id: 'demo-sync-3',
    integrationId: 'demo-int-google-cal',
    direction: 'bidirectional',
    entityType: 'event',
    status: 'success',
    itemsSynced: 5,
    itemsFailed: 0,
    errorMessage: null,
    details: { pushed: ['RDV Client Martin', 'Visite chantier'], pulled: ['Réunion architecte'] },
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86393000).toISOString(),
    durationMs: 7000,
  },
  {
    id: 'demo-sync-4',
    integrationId: 'demo-int-pennylane',
    direction: 'push',
    entityType: 'facture',
    status: 'error',
    itemsSynced: 3,
    itemsFailed: 2,
    errorMessage: 'Token expiré — reconnexion nécessaire',
    details: {},
    startedAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 172795000).toISOString(),
    durationMs: 5000,
  },
];

// ── Trigger Sync ─────────────────────────────────────────────────────────────

/**
 * Trigger a sync operation for a given provider.
 * Returns the sync result with items synced/failed.
 */
export async function triggerSync(provider, { direction = 'push', entityType, config } = {}) {
  if (isDemo) {
    // Simulate a sync in demo mode
    await new Promise(r => setTimeout(r, 1500));
    return {
      success: true,
      itemsSynced: Math.floor(Math.random() * 15) + 1,
      itemsFailed: 0,
      message: `Sync ${provider} ${direction} simulée (mode démo)`,
    };
  }

  const { data, error } = await supabase.functions.invoke('integration-proxy', {
    body: {
      action: 'sync',
      provider,
      direction,
      entityType,
      config,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de la synchronisation');
  }

  return data;
}

// ── Sync Logs ────────────────────────────────────────────────────────────────

/**
 * Get sync logs for an integration, ordered by most recent first.
 */
export async function getSyncLogs(integrationId, { limit = 20, offset = 0, status } = {}) {
  if (isDemo) {
    let logs = DEMO_SYNC_LOGS.filter(l => l.integrationId === integrationId);
    if (status) {
      logs = logs.filter(l => l.status === status);
    }
    return logs.slice(offset, offset + limit);
  }

  let query = supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('integration_id', integrationId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SYNC] getSyncLogs error:', error);
    return [];
  }

  return (data || []).map(fromSupabase);
}

/**
 * Get a specific sync log by ID with polling support.
 */
export async function getSyncStatus(syncLogId) {
  if (isDemo) {
    return DEMO_SYNC_LOGS.find(l => l.id === syncLogId) || null;
  }

  const { data, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('id', syncLogId)
    .single();

  if (error) return null;
  return fromSupabase(data);
}

// ── Entity Mappings ──────────────────────────────────────────────────────────

/**
 * Get entity mappings for an integration (local ↔ remote IDs).
 */
export async function getEntityMappings(integrationId, { entityType, limit = 50 } = {}) {
  if (isDemo) {
    return [
      {
        id: 'demo-map-1',
        integrationId,
        localEntityType: 'facture',
        localEntityId: 'demo-fac-1',
        remoteEntityId: 'pennylane-inv-001',
        remoteEntityType: 'customer_invoice',
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

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
    console.error('[SYNC] getEntityMappings error:', error);
    return [];
  }

  return (data || []).map(mapFromSupabase);
}

// ── Auto-Sync Triggers ──────────────────────────────────────────────────────

/**
 * Check if a provider supports auto-sync for a given entity type.
 */
export function shouldAutoSync(provider, entityType) {
  const autoSyncMap = {
    google_calendar: ['event'],
    pennylane: ['facture'],
    google_drive: ['document'],
  };

  return (autoSyncMap[provider] || []).includes(entityType);
}

/**
 * Trigger auto-sync after a local entity change.
 * Non-blocking — fires and forgets. Errors are logged but not thrown.
 */
export async function triggerAutoSync(provider, entityType, direction = 'push') {
  try {
    // Check if integration is connected
    const { data: integration } = await supabase
      .from('integrations')
      .select('id, status, sync_enabled')
      .eq('provider', provider)
      .single();

    if (!integration || integration.status !== 'connected' || !integration.sync_enabled) {
      return null;
    }

    // Trigger sync in background
    return triggerSync(provider, { direction, entityType });
  } catch (err) {
    console.warn(`[SYNC] Auto-sync ${provider}/${entityType} failed:`, err.message);
    return null;
  }
}

/**
 * Check if a provider is connected and sync-enabled.
 */
export async function isProviderSyncReady(provider) {
  if (isDemo) {
    const demoConnected = ['pennylane', 'google_calendar'];
    return demoConnected.includes(provider);
  }

  const { data } = await supabase
    .from('integrations')
    .select('status, sync_enabled')
    .eq('provider', provider)
    .single();

  return data?.status === 'connected' && data?.sync_enabled;
}

// ── Yousign-Specific ─────────────────────────────────────────────────────────

/**
 * Create a Yousign signature request via the integration proxy.
 */
export async function createSignatureRequest(documentData) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 2000));
    return {
      success: true,
      signatureRequestId: 'demo-sig-' + Date.now(),
      status: 'activated',
      signerLinks: documentData.signataires.map(s => ({
        name: s.name,
        url: `https://yousign.app/demo-signature/${Date.now()}`,
      })),
    };
  }

  const { data, error } = await supabase.functions.invoke('integration-proxy', {
    body: {
      action: 'yousign_create_signature',
      ...documentData,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erreur création signature');
  }

  return data;
}

/**
 * Check signature request status.
 */
export async function getSignatureRequestStatus(signatureRequestId) {
  if (isDemo) {
    return {
      status: 'activated',
      signers: [{ name: 'Client Demo', status: 'notified', signedAt: null }],
    };
  }

  const { data, error } = await supabase.functions.invoke('integration-proxy', {
    body: {
      action: 'yousign_get_status',
      signatureRequestId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erreur vérification signature');
  }

  return data;
}

// ── iCal Export ──────────────────────────────────────────────────────────────

/**
 * Generate or retrieve an iCal subscription URL.
 */
export async function getICalUrl() {
  if (isDemo) {
    return {
      url: `${window.location.origin}/api/ical/demo-token-12345`,
      token: 'demo-token-12345',
    };
  }

  const { data, error } = await supabase.functions.invoke('ical-export', {
    body: { action: 'get_url' },
  });

  if (error) {
    throw new Error(error.message || 'Erreur génération URL iCal');
  }

  return data;
}

/**
 * Regenerate the iCal token (invalidates previous URL).
 */
export async function regenerateICalToken() {
  if (isDemo) {
    return {
      url: `${window.location.origin}/api/ical/demo-token-${Date.now()}`,
      token: `demo-token-${Date.now()}`,
    };
  }

  const { data, error } = await supabase.functions.invoke('ical-export', {
    body: { action: 'regenerate_token' },
  });

  if (error) {
    throw new Error(error.message || 'Erreur régénération token iCal');
  }

  return data;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function fromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    integrationId: row.integration_id,
    direction: row.direction,
    entityType: row.entity_type,
    status: row.status,
    itemsSynced: row.items_synced,
    itemsFailed: row.items_failed,
    errorMessage: row.error_message,
    details: row.details,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
  };
}

function mapFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    integrationId: row.integration_id,
    localEntityType: row.local_entity_type,
    localEntityId: row.local_entity_id,
    remoteEntityId: row.remote_entity_id,
    remoteEntityType: row.remote_entity_type,
    remoteEntityUrl: row.remote_entity_url,
    lastSyncedAt: row.last_synced_at,
    syncHash: row.sync_hash,
  };
}

export default {
  triggerSync,
  getSyncLogs,
  getSyncStatus,
  getEntityMappings,
  shouldAutoSync,
  triggerAutoSync,
  isProviderSyncReady,
  createSignatureRequest,
  getSignatureRequestStatus,
  getICalUrl,
  regenerateICalToken,
};
