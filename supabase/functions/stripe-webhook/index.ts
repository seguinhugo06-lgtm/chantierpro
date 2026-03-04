/**
 * Edge Function: stripe-webhook
 * Handles Stripe webhook events (payment confirmations)
 *
 * POST /functions/v1/stripe-webhook
 * Called by Stripe with event data + signature header
 *
 * Deploy: supabase functions deploy stripe-webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient, notifyPaiementRecu } from '../_shared/communications.ts';

// ============================================================================
// STRIPE SIGNATURE VERIFICATION (without SDK)
// ============================================================================

async function computeHmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  return { timestamp, signatures };
}

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  // Check timestamp tolerance (5 minutes)
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (timestampAge > toleranceSeconds) {
    console.warn(`[WEBHOOK] Timestamp too old: ${timestampAge}s`);
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = await computeHmacSha256(webhookSecret, signedPayload);

  // Compare with received signatures
  return signatures.some(sig => sig === expectedSignature);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCheckoutSessionCompleted(
  session: Record<string, unknown>,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const sessionId = session.id as string;
  const paymentIntentId = session.payment_intent as string;
  const metadata = session.metadata as Record<string, string> || {};

  console.log(`[WEBHOOK] checkout.session.completed: ${sessionId}`);

  // Find the facture by stripe_session_id
  const { data: facture, error } = await supabase
    .from('devis')
    .select('id, numero, statut, type')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !facture) {
    console.error(`[WEBHOOK] Facture not found for session ${sessionId}:`, error);
    return { handled: false, reason: 'facture_not_found' };
  }

  // Skip if already paid
  if (facture.statut === 'payee') {
    console.log(`[WEBHOOK] Facture ${facture.numero} already paid, skipping`);
    return { handled: true, reason: 'already_paid' };
  }

  // Update facture status to paid
  const { error: updateError } = await supabase
    .from('devis')
    .update({
      statut: 'payee',
      payment_status: 'succeeded',
      payment_completed_at: new Date().toISOString(),
      date_paiement: new Date().toISOString(),
      mode_paiement: 'carte',
      stripe_payment_intent_id: paymentIntentId,
      payment_metadata: {
        stripe_session_id: sessionId,
        stripe_payment_intent_id: paymentIntentId,
        payment_method: 'card',
        completed_at: new Date().toISOString(),
      },
    })
    .eq('id', facture.id);

  if (updateError) {
    console.error(`[WEBHOOK] Failed to update facture ${facture.numero}:`, updateError);
    return { handled: false, reason: 'update_failed', error: updateError.message };
  }

  console.log(`[WEBHOOK] Facture ${facture.numero} marked as paid`);

  // Update stripe_config stats
  await supabase
    .from('stripe_config')
    .update({
      last_payment_at: new Date().toISOString(),
      total_payments: supabase.rpc ? undefined : undefined, // Can't increment easily, skip for now
    });

  // Send payment confirmation notification
  try {
    await notifyPaiementRecu(facture.id, supabase);
    console.log(`[WEBHOOK] Payment notification sent for ${facture.numero}`);
  } catch (notifError) {
    console.error(`[WEBHOOK] Notification failed:`, notifError);
  }

  // Log event
  await supabase.from('events_log').insert([{
    event_type: 'stripe_payment_received',
    entity_type: 'facture',
    entity_id: facture.id,
    success: true,
    metadata: {
      session_id: sessionId,
      payment_intent_id: paymentIntentId,
      facture_numero: facture.numero,
    },
    triggered_at: new Date().toISOString(),
  }]);

  return { handled: true, facture_id: facture.id, facture_numero: facture.numero };
}

async function handleCheckoutSessionExpired(
  session: Record<string, unknown>,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const sessionId = session.id as string;

  console.log(`[WEBHOOK] checkout.session.expired: ${sessionId}`);

  // Update payment status
  await supabase
    .from('devis')
    .update({ payment_status: 'failed' })
    .eq('stripe_session_id', sessionId);

  // Log event
  await supabase.from('events_log').insert([{
    event_type: 'stripe_session_expired',
    entity_type: 'facture',
    entity_id: sessionId,
    success: true,
    triggered_at: new Date().toISOString(),
  }]);

  return { handled: true };
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
    // Read raw body for signature verification
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('stripe-signature');

    if (!signatureHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Stripe-Signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Parse the event first to get metadata and find the right webhook secret
    const event = JSON.parse(rawBody);
    const eventType = event.type as string;
    const session = event.data?.object;

    console.log(`[WEBHOOK] Received event: ${eventType}`);

    // Get the facture to find the artisan's user_id
    let userId: string | null = null;

    if (session?.metadata?.facture_id) {
      const { data: facture } = await supabase
        .from('devis')
        .select('user_id')
        .eq('id', session.metadata.facture_id)
        .single();
      userId = facture?.user_id;
    } else if (session?.id) {
      const { data: facture } = await supabase
        .from('devis')
        .select('user_id')
        .eq('stripe_session_id', session.id)
        .single();
      userId = facture?.user_id;
    }

    // Verify signature if we have a webhook secret
    if (userId) {
      const { data: stripeConfig } = await supabase.rpc('get_stripe_config_for_user', {
        p_user_id: userId,
      });

      if (stripeConfig?.webhook_secret) {
        const isValid = await verifyStripeSignature(rawBody, signatureHeader, stripeConfig.webhook_secret);
        if (!isValid) {
          console.warn(`[WEBHOOK] Invalid signature for user ${userId}`);
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Handle event
    let result: unknown;

    switch (eventType) {
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(session, supabase);
        break;

      case 'checkout.session.expired':
        result = await handleCheckoutSessionExpired(session, supabase);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
        result = { handled: false, reason: 'unhandled_event_type' };
    }

    return new Response(
      JSON.stringify({ received: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[WEBHOOK] Error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
