/**
 * webhook-sender — Outbound webhook dispatcher
 *
 * Receives { event, payload } from handle-db-events or other triggers.
 * Queries the webhooks table for subscribed endpoints.
 * Signs payload with HMAC-SHA256 and delivers with retry.
 *
 * Headers:
 *   X-BatiGesti-Signature: HMAC-SHA256 hex digest
 *   X-BatiGesti-Event: event type
 *   X-BatiGesti-Delivery: unique delivery ID
 *   Content-Type: application/json
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ── HMAC Signing ─────────────────────────────────────────────────────────────

async function computeHmacSha256(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Delivery with Retry ──────────────────────────────────────────────────────

async function deliverWebhook(
  webhook: any,
  event: string,
  payload: any,
): Promise<{ statusCode: number; success: boolean; error?: string; durationMs: number }> {
  const deliveryId = crypto.randomUUID();
  const body = JSON.stringify({
    event,
    payload,
    delivery_id: deliveryId,
    timestamp: new Date().toISOString(),
  });

  const signature = await computeHmacSha256(body, webhook.hmac_secret);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-BatiGesti-Signature': `sha256=${signature}`,
    'X-BatiGesti-Event': event,
    'X-BatiGesti-Delivery': deliveryId,
    'User-Agent': 'BatiGesti-Webhooks/1.0',
  };

  const maxRetries = 3;
  const baseDelay = 1000; // 1s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const durationMs = Date.now() - startTime;

      if (response.ok || response.status < 500) {
        return {
          statusCode: response.status,
          success: response.ok,
          durationMs,
        };
      }

      // 5xx errors — retry
      console.warn(
        `[WEBHOOK-SENDER] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${webhook.url}: ${response.status}`,
      );
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      if (attempt === maxRetries) {
        return {
          statusCode: 0,
          success: false,
          error: err.message || 'Network error',
          durationMs,
        };
      }

      console.warn(
        `[WEBHOOK-SENDER] Attempt ${attempt + 1}/${maxRetries + 1} error for ${webhook.url}: ${err.message}`,
      );
    }
  }

  return { statusCode: 0, success: false, error: 'Tous les essais ont échoué', durationMs: 0 };
}

// ── MAIN HANDLER ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { event, payload, userId, orgId, test } = await req.json();

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'event requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = getServiceClient();

    // Build query for matching webhooks
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('enabled', true)
      .contains('events', [event]);

    // Scope to user or org
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data: webhooks, error } = await query;

    if (error) {
      console.error('[WEBHOOK-SENDER] Query error:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur requête webhooks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!webhooks?.length) {
      return new Response(
        JSON.stringify({ delivered: 0, message: 'Aucun webhook abonné' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const results: Array<{
      webhookId: string;
      url: string;
      statusCode: number;
      success: boolean;
      error?: string;
      durationMs: number;
    }> = [];

    // Deliver to all matching webhooks
    for (const webhook of webhooks) {
      const result = await deliverWebhook(webhook, event, payload);

      results.push({
        webhookId: webhook.id,
        url: webhook.url,
        ...result,
      });

      // Update webhook status
      const updateData: any = {
        last_triggered_at: new Date().toISOString(),
        last_status: result.statusCode,
        updated_at: new Date().toISOString(),
      };

      if (result.success) {
        updateData.failure_count = 0;
      } else {
        updateData.failure_count = (webhook.failure_count || 0) + 1;

        // Disable webhook after 10 consecutive failures
        if (updateData.failure_count >= 10) {
          updateData.enabled = false;
          console.warn(`[WEBHOOK-SENDER] Disabling webhook ${webhook.id} after ${updateData.failure_count} failures`);
        }
      }

      await supabase
        .from('webhooks')
        .update(updateData)
        .eq('id', webhook.id);

      // Log to sync_logs if integration exists
      if (webhook.user_id) {
        const { data: integration } = await supabase
          .from('integrations')
          .select('id')
          .eq('user_id', webhook.user_id)
          .eq('provider', 'webhooks')
          .single();

        if (integration) {
          await supabase.from('integration_sync_logs').insert({
            user_id: webhook.user_id,
            integration_id: integration.id,
            direction: 'push',
            entity_type: event,
            status: result.success ? 'success' : 'error',
            items_synced: result.success ? 1 : 0,
            items_failed: result.success ? 0 : 1,
            error_message: result.error || null,
            details: {
              webhook_url: webhook.url,
              status_code: result.statusCode,
              delivery_id: crypto.randomUUID(),
            },
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: result.durationMs,
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        delivered: successCount,
        total: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('[WEBHOOK-SENDER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
