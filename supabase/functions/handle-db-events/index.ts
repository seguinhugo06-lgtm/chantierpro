/**
 * Edge Function: handle-db-events
 * Handles all database webhook events for automatic notifications
 *
 * Triggered by Supabase Database Webhooks on:
 * - devis (INSERT, UPDATE)
 * - chantiers (UPDATE)
 * - chantier_photos (INSERT)
 *
 * Deploy: supabase functions deploy handle-db-events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getSupabaseClient,
  notifyDevisEnvoye,
  notifyDevisAccepte,
  notifyChantierDemarre,
  notifyChantierTermine,
  notifyFactureEnvoyee,
  notifyPaiementRecu,
} from '../_shared/communications.ts';

// ============================================================================
// TYPES
// ============================================================================

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

interface EventLog {
  event_type: string;
  entity_type: string;
  entity_id: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  error_message?: string;
}

// ============================================================================
// LOGGING
// ============================================================================

async function logEvent(supabase: ReturnType<typeof getSupabaseClient>, log: EventLog) {
  try {
    await supabase.from('events_log').insert([{
      ...log,
      triggered_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

// ============================================================================
// WEBHOOK DISPATCH
// ============================================================================

async function dispatchWebhook(
  supabase: ReturnType<typeof getSupabaseClient>,
  event: string,
  payload: Record<string, unknown>,
  userId?: string,
  orgId?: string,
) {
  try {
    // Fire-and-forget to webhook-sender
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) return;

    await fetch(`${supabaseUrl}/functions/v1/webhook-sender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ event, payload, userId, orgId }),
    }).catch(err => console.warn('[WEBHOOK] Dispatch failed:', err.message));
  } catch (err) {
    console.warn('[WEBHOOK] Dispatch error:', err);
  }
}

function mapDevisEvent(type: string, statut: string, oldStatut?: string): string | null {
  if (type === 'INSERT') return 'devis.created';
  if (type === 'UPDATE' && statut !== oldStatut) {
    if (statut === 'accepte' || statut === 'signe') return 'devis.signed';
    if (statut === 'payee') return 'facture.paid';
    return 'devis.status_changed';
  }
  return null;
}

function mapChantierEvent(statut: string, oldStatut?: string): string | null {
  if (statut === 'en_cours' && oldStatut !== 'en_cours') return 'chantier.status_changed';
  if (statut === 'termine' && oldStatut !== 'termine') return 'chantier.completed';
  if (statut !== oldStatut) return 'chantier.status_changed';
  return null;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleDevisInsert(record: Record<string, unknown>, supabase: ReturnType<typeof getSupabaseClient>) {
  const devisId = record.id as string;
  const statut = record.statut as string;
  const type = record.type as string;

  console.log(`[DEVIS INSERT] id=${devisId}, statut=${statut}, type=${type}`);

  // Notify if devis is already sent
  if (statut === 'envoye') {
    const result = await notifyDevisEnvoye(devisId, supabase);
    await logEvent(supabase, {
      event_type: 'devis_created',
      entity_type: 'devis',
      entity_id: devisId,
      success: result.sms.success || result.email.success,
      metadata: { statut, notified: true },
    });
    return result;
  }

  // If it's a facture
  if (type === 'facture' && (statut === 'envoye' || statut === 'en_attente')) {
    const result = await notifyFactureEnvoyee(devisId, supabase);
    await logEvent(supabase, {
      event_type: 'facture_created',
      entity_type: 'facture',
      entity_id: devisId,
      success: result.sms.success || result.email.success,
    });
    return result;
  }

  await logEvent(supabase, {
    event_type: 'devis_created',
    entity_type: 'devis',
    entity_id: devisId,
    success: true,
    metadata: { statut, notified: false },
  });

  return { handled: true, notified: false };
}

async function handleDevisUpdate(
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | undefined,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const devisId = record.id as string;
  const newStatut = record.statut as string;
  const oldStatut = oldRecord?.statut as string | undefined;
  const type = record.type as string;

  console.log(`[DEVIS UPDATE] id=${devisId}, ${oldStatut} → ${newStatut}`);

  // Status didn't change
  if (oldStatut === newStatut) {
    return { handled: false, reason: 'no_status_change' };
  }

  // Devis sent
  if (oldStatut !== 'envoye' && newStatut === 'envoye' && type === 'devis') {
    const result = await notifyDevisEnvoye(devisId, supabase);
    await logEvent(supabase, {
      event_type: 'devis_status_changed',
      entity_type: 'devis',
      entity_id: devisId,
      success: true,
      metadata: { old_statut: oldStatut, new_statut: newStatut, action: 'notify_envoye' },
    });
    return result;
  }

  // Devis accepted
  if (oldStatut !== 'accepte' && newStatut === 'accepte') {
    const result = await notifyDevisAccepte(devisId, supabase);

    // Create suggestion to convert to invoice
    await supabase.from('ai_suggestions').insert([{
      user_id: record.user_id,
      type: 'convert_to_invoice',
      title: 'Convertir le devis en facture',
      description: `Le devis #${record.numero} a été accepté.`,
      priority: 'high',
      data: { devis_id: devisId, devis_numero: record.numero },
    }]);

    await logEvent(supabase, {
      event_type: 'devis_status_changed',
      entity_type: 'devis',
      entity_id: devisId,
      success: true,
      metadata: { old_statut: oldStatut, new_statut: newStatut, action: 'notify_accepte', suggestion_created: true },
    });

    return { ...result, suggestionCreated: true };
  }

  // Facture sent
  if (type === 'facture' && oldStatut !== 'envoye' && (newStatut === 'envoye' || newStatut === 'en_attente')) {
    const result = await notifyFactureEnvoyee(devisId, supabase);
    await logEvent(supabase, {
      event_type: 'facture_sent',
      entity_type: 'facture',
      entity_id: devisId,
      success: true,
      metadata: { action: 'notify_facture' },
    });
    return result;
  }

  // Payment received
  if (type === 'facture' && oldStatut !== 'payee' && newStatut === 'payee') {
    const result = await notifyPaiementRecu(devisId, supabase);
    await logEvent(supabase, {
      event_type: 'payment_received',
      entity_type: 'facture',
      entity_id: devisId,
      success: true,
    });
    return result;
  }

  return { handled: false, reason: 'no_matching_action' };
}

async function handleChantierUpdate(
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | undefined,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const chantierId = record.id as string;
  const newStatut = record.statut as string;
  const oldStatut = oldRecord?.statut as string | undefined;

  console.log(`[CHANTIER UPDATE] id=${chantierId}, ${oldStatut} → ${newStatut}`);

  // Status didn't change
  if (oldStatut === newStatut) {
    return { handled: false, reason: 'no_status_change' };
  }

  // Chantier started
  if (oldStatut !== 'en_cours' && newStatut === 'en_cours') {
    const result = await notifyChantierDemarre(chantierId, supabase);
    await logEvent(supabase, {
      event_type: 'chantier_started',
      entity_type: 'chantier',
      entity_id: chantierId,
      success: true,
    });
    return result;
  }

  // Chantier completed
  if (oldStatut !== 'termine' && newStatut === 'termine') {
    const result = await notifyChantierTermine(chantierId, supabase);

    // Create suggestion for final invoice
    await supabase.from('ai_suggestions').insert([{
      user_id: record.user_id,
      type: 'create_final_invoice',
      title: 'Créer la facture finale',
      description: `Le chantier "${record.nom}" est terminé.`,
      priority: 'high',
      data: { chantier_id: chantierId, chantier_nom: record.nom },
    }]);

    await logEvent(supabase, {
      event_type: 'chantier_completed',
      entity_type: 'chantier',
      entity_id: chantierId,
      success: true,
      metadata: { suggestion_created: true },
    });

    return { ...result, suggestionCreated: true };
  }

  return { handled: false, reason: 'no_matching_action' };
}

async function handlePhotoInsert(record: Record<string, unknown>, supabase: ReturnType<typeof getSupabaseClient>) {
  const photoId = record.id as string;
  const chantierId = record.chantier_id as string;

  console.log(`[PHOTO INSERT] id=${photoId}, chantier=${chantierId}`);

  // Update chantier last_photo_at
  await supabase
    .from('chantiers')
    .update({ last_photo_at: new Date().toISOString() })
    .eq('id', chantierId);

  // Check if we should send a photo recap (every 5 photos)
  const { count } = await supabase
    .from('chantier_photos')
    .select('id', { count: 'exact', head: true })
    .eq('chantier_id', chantierId);

  if (count && count % 5 === 0) {
    const { data: chantier } = await supabase
      .from('chantiers')
      .select('*, client:clients(*)')
      .eq('id', chantierId)
      .single();

    if (chantier?.client?.email) {
      const { sendEmail } = await import('../_shared/communications.ts');
      const link = `${Deno.env.get('APP_URL') || 'https://app.batigesti.fr'}/portal/chantier/${chantierId}/photos`;

      await sendEmail(
        chantier.client.email,
        `${count} photos de votre chantier`,
        `<h2>Nouvelles photos !</h2><p>${count} photos disponibles pour "${chantier.nom}".</p><center><a href="${link}" class="btn">Voir les photos</a></center>`
      );

      await logEvent(supabase, {
        event_type: 'photo_recap_sent',
        entity_type: 'chantier',
        entity_id: chantierId,
        success: true,
        metadata: { photo_count: count },
      });
    }
  }

  await logEvent(supabase, {
    event_type: 'photo_uploaded',
    entity_type: 'chantier_photo',
    entity_id: photoId,
    success: true,
    metadata: { chantier_id: chantierId, total_photos: count },
  });

  return { handled: true, photoCount: count };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { type, table, record, old_record } = payload;

    console.log(`[WEBHOOK] ${type} on ${table}`, record?.id);

    const supabase = getSupabaseClient();
    let result: unknown;

    switch (table) {
      case 'devis':
        if (type === 'INSERT') {
          result = await handleDevisInsert(record, supabase);
        } else if (type === 'UPDATE') {
          result = await handleDevisUpdate(record, old_record, supabase);
        }
        break;

      case 'chantiers':
        if (type === 'UPDATE') {
          result = await handleChantierUpdate(record, old_record, supabase);
        }
        break;

      case 'chantier_photos':
        if (type === 'INSERT') {
          result = await handlePhotoInsert(record, supabase);
        }
        break;

      default:
        console.log(`[WEBHOOK] Unhandled table: ${table}`);
        result = { handled: false, reason: 'unhandled_table' };
    }

    // ── Dispatch outbound webhooks (fire-and-forget) ──
    const userId = record?.user_id as string | undefined;
    const orgId = record?.organization_id as string | undefined;

    if (table === 'devis') {
      const devisEvent = mapDevisEvent(
        type,
        record?.statut as string,
        old_record?.statut as string | undefined,
      );
      if (devisEvent) {
        dispatchWebhook(supabase, devisEvent, {
          id: record?.id,
          numero: record?.numero,
          type: record?.type,
          statut: record?.statut,
          montant_ttc: record?.montant_ttc || record?.total_ttc,
          client_id: record?.client_id,
        }, userId, orgId);
      }
    } else if (table === 'chantiers') {
      const chantierEvent = mapChantierEvent(
        record?.statut as string,
        old_record?.statut as string | undefined,
      );
      if (chantierEvent) {
        dispatchWebhook(supabase, chantierEvent, {
          id: record?.id,
          nom: record?.nom,
          statut: record?.statut,
          client_id: record?.client_id,
        }, userId, orgId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[WEBHOOK] Error:', error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
