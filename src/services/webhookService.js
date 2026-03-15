/**
 * webhookService.js — CRUD for outbound webhooks
 *
 * Manages webhook endpoints, testing, and delivery logs.
 * Demo mode uses localStorage fallback.
 */

import { supabase, isDemo } from '../supabaseClient';

const DEMO_KEY = 'batigesti_webhooks';

// ── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_WEBHOOKS = [
  {
    id: 'demo-wh-1',
    name: 'Zapier — Nouveau devis',
    url: 'https://hooks.zapier.com/hooks/catch/12345/abcdef/',
    hmacSecret: 'whsec_demo_secret_abc123',
    events: ['devis.created', 'devis.status_changed'],
    enabled: true,
    lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
    lastStatus: 200,
    failureCount: 0,
  },
  {
    id: 'demo-wh-2',
    name: 'Make — Paiement reçu',
    url: 'https://hook.eu1.make.com/demo-webhook-path',
    hmacSecret: 'whsec_demo_secret_def456',
    events: ['paiement.received'],
    enabled: true,
    lastTriggeredAt: null,
    lastStatus: null,
    failureCount: 0,
  },
];

// ── Available Events ─────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  { id: 'devis.created', label: 'Devis créé', category: 'Devis' },
  { id: 'devis.status_changed', label: 'Statut devis changé', category: 'Devis' },
  { id: 'devis.signed', label: 'Devis signé', category: 'Devis' },
  { id: 'facture.created', label: 'Facture créée', category: 'Factures' },
  { id: 'facture.paid', label: 'Facture payée', category: 'Factures' },
  { id: 'facture.overdue', label: 'Facture en retard', category: 'Factures' },
  { id: 'chantier.created', label: 'Chantier créé', category: 'Chantiers' },
  { id: 'chantier.status_changed', label: 'Statut chantier changé', category: 'Chantiers' },
  { id: 'chantier.completed', label: 'Chantier terminé', category: 'Chantiers' },
  { id: 'paiement.received', label: 'Paiement reçu', category: 'Paiements' },
  { id: 'client.created', label: 'Client créé', category: 'Clients' },
  { id: 'planning.event_created', label: 'Événement créé', category: 'Planning' },
  { id: 'relance.sent', label: 'Relance envoyée', category: 'Relances' },
];

// ── Mappers ──────────────────────────────────────────────────────────────────

function fromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    name: row.name,
    url: row.url,
    hmacSecret: row.hmac_secret,
    events: row.events || [],
    enabled: row.enabled,
    lastTriggeredAt: row.last_triggered_at,
    lastStatus: row.last_status,
    failureCount: row.failure_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabase(data) {
  const row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.url !== undefined) row.url = data.url;
  if (data.hmacSecret !== undefined) row.hmac_secret = data.hmacSecret;
  if (data.events !== undefined) row.events = data.events;
  if (data.enabled !== undefined) row.enabled = data.enabled;
  return row;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateHmacSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function loadWebhooks({ userId, orgId } = {}) {
  if (isDemo) {
    try {
      const stored = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
      return stored || DEMO_WEBHOOKS;
    } catch {
      return DEMO_WEBHOOKS;
    }
  }

  let query = supabase.from('webhooks').select('*').order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  if (orgId) query = query.eq('organization_id', orgId);

  const { data, error } = await query;
  if (error) {
    console.error('[WEBHOOKS] Load error:', error);
    return [];
  }
  return (data || []).map(fromSupabase);
}

export async function getWebhook(id) {
  if (isDemo) {
    const webhooks = await loadWebhooks();
    return webhooks.find(w => w.id === id) || null;
  }

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return fromSupabase(data);
}

export async function createWebhook({ name, url, events, userId, orgId }) {
  const hmacSecret = generateHmacSecret();

  if (isDemo) {
    const webhook = {
      id: `demo-wh-${Date.now()}`,
      name,
      url,
      hmacSecret,
      events: events || [],
      enabled: true,
      lastTriggeredAt: null,
      lastStatus: null,
      failureCount: 0,
    };
    const existing = await loadWebhooks();
    const updated = [webhook, ...existing];
    localStorage.setItem(DEMO_KEY, JSON.stringify(updated));
    return webhook;
  }

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: userId,
      organization_id: orgId,
      name,
      url,
      hmac_secret: hmacSecret,
      events: events || [],
      enabled: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromSupabase(data);
}

export async function updateWebhook(id, updates) {
  if (isDemo) {
    const existing = await loadWebhooks();
    const updated = existing.map(w =>
      w.id === id ? { ...w, ...updates } : w
    );
    localStorage.setItem(DEMO_KEY, JSON.stringify(updated));
    return updated.find(w => w.id === id);
  }

  const { data, error } = await supabase
    .from('webhooks')
    .update({ ...toSupabase(updates), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromSupabase(data);
}

export async function deleteWebhook(id) {
  if (isDemo) {
    const existing = await loadWebhooks();
    const updated = existing.filter(w => w.id !== id);
    localStorage.setItem(DEMO_KEY, JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function toggleWebhook(id, enabled) {
  return updateWebhook(id, { enabled });
}

// ── Test Webhook ─────────────────────────────────────────────────────────────

export async function testWebhook(id) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 1500));
    return {
      success: true,
      statusCode: 200,
      durationMs: 342,
      message: 'Webhook test envoyé (mode démo)',
    };
  }

  const webhook = await getWebhook(id);
  if (!webhook) throw new Error('Webhook non trouvé');

  const { data, error } = await supabase.functions.invoke('webhook-sender', {
    body: {
      event: 'test.ping',
      payload: {
        webhook_id: id,
        message: 'Test ping from BatiGesti',
        timestamp: new Date().toISOString(),
      },
      userId: webhook.userId,
      test: true,
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

// ── Delivery Logs ────────────────────────────────────────────────────────────

export async function getDeliveryLogs(webhookId, { limit = 20 } = {}) {
  if (isDemo) {
    return [
      {
        id: 'demo-log-1',
        event: 'devis.created',
        status: 'success',
        statusCode: 200,
        durationMs: 245,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'demo-log-2',
        event: 'devis.status_changed',
        status: 'success',
        statusCode: 200,
        durationMs: 312,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }

  // Query sync logs for this webhook's integration
  const { data, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('direction', 'push')
    .filter('details->>webhook_url', 'is', 'not.null')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    event: row.entity_type,
    status: row.status,
    statusCode: row.details?.status_code,
    durationMs: row.duration_ms,
    error: row.error_message,
    createdAt: row.created_at,
  }));
}

export default {
  loadWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  testWebhook,
  getDeliveryLogs,
  WEBHOOK_EVENTS,
};
