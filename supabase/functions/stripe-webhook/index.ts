/**
 * stripe-webhook — Webhook Stripe de la PLATEFORME (abonnements SaaS uniquement).
 *
 * Les paiements de factures des artisans passent par LEURS comptes Stripe et
 * sont confirmés côté serveur par create-invoice-payment action 'verify' au
 * retour de Checkout — ils n'arrivent jamais ici (aucun webhook par artisan).
 *
 * Ce webhook ne traite que les événements du compte Stripe Mallettico :
 *   - checkout.session.completed (metadata.plan_id) → activation abonnement
 *   - customer.subscription.deleted → retour au plan gratuit
 *   - customer.subscription.updated → statut (past_due, active…)
 *
 * Signature vérifiée avec STRIPE_WEBHOOK_SECRET (secret du endpoint configuré
 * dans le Dashboard Stripe plateforme). Déployer avec --no-verify-jwt :
 * Stripe n'envoie pas de JWT Supabase.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ────────────────────────────────────────────────────────────────────
// Vérification de signature Stripe (HMAC-SHA256, sans SDK)
// ────────────────────────────────────────────────────────────────────

async function computeHmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  toleranceSeconds = 300
): Promise<boolean> {
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of signatureHeader.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (Number.isNaN(age) || age > toleranceSeconds) return false;

  const expected = await computeHmacSha256(STRIPE_WEBHOOK_SECRET, `${timestamp}.${payload}`);
  return signatures.some((sig) => sig === expected);
}

// ────────────────────────────────────────────────────────────────────
// Handlers abonnements SaaS
// ────────────────────────────────────────────────────────────────────

async function handleSubscriptionCheckout(session: Record<string, unknown>) {
  const metadata = (session.metadata as Record<string, string>) || {};
  const userId = metadata.user_id;
  const planId = metadata.plan_id;

  if (!userId || !planId) {
    console.error('[WEBHOOK] user_id ou plan_id manquant dans metadata');
    return { handled: false, reason: 'missing_metadata' };
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan: planId,
      status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      current_period_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[WEBHOOK] upsert subscription failed:', error.message);
    return { handled: false, reason: 'upsert_failed' };
  }

  console.log(`[WEBHOOK] Abonnement activé : user=${userId}, plan=${planId}`);

  await supabase.from('events_log').insert([{
    event_type: 'subscription_activated',
    entity_type: 'subscription',
    entity_id: userId,
    success: true,
    metadata: { plan_id: planId, stripe_customer_id: session.customer },
    triggered_at: new Date().toISOString(),
  }]).then(() => {}, () => {});

  return { handled: true, user_id: userId, plan: planId };
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const subId = subscription.id as string;

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({ plan: 'gratuit', status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subId)
    .select('user_id');

  if (error) {
    console.error('[WEBHOOK] downgrade failed:', error.message);
    return { handled: false, reason: 'update_failed' };
  }
  if (!updated || updated.length === 0) {
    return { handled: false, reason: 'subscription_not_found' };
  }

  console.log(`[WEBHOOK] Abonnement résilié → plan gratuit : user=${updated[0].user_id}`);
  return { handled: true, user_id: updated[0].user_id };
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const subId = subscription.id as string;
  const stripeStatus = subscription.status as string;

  // Mapping statut Stripe → statut interne (les impayés gardent l'accès
  // pendant les retries Stripe ; 'canceled' est géré par l'event deleted)
  const status = stripeStatus === 'active' || stripeStatus === 'trialing'
    ? 'active'
    : stripeStatus === 'past_due' || stripeStatus === 'unpaid'
      ? 'past_due'
      : null;
  if (!status) return { handled: false, reason: `status_ignored:${stripeStatus}` };

  const { error } = await supabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subId);

  if (error) {
    console.error('[WEBHOOK] status update failed:', error.message);
    return { handled: false, reason: 'update_failed' };
  }
  return { handled: true, status };
}

// ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET non configuré');
      return json({ error: 'Webhook non configuré' }, 500);
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get('stripe-signature');
    if (!signatureHeader) {
      return json({ error: 'Missing Stripe-Signature header' }, 400);
    }

    const isValid = await verifyStripeSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn('[WEBHOOK] Signature invalide');
      return json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type as string;
    const object = event.data?.object as Record<string, unknown>;

    console.log(`[WEBHOOK] ${eventType}`);

    let result: unknown;
    switch (eventType) {
      case 'checkout.session.completed':
        if (object?.metadata && (object.metadata as Record<string, string>).plan_id) {
          result = await handleSubscriptionCheckout(object);
        } else {
          // Un paiement de facture artisan n'a rien à faire ici
          result = { handled: false, reason: 'not_a_subscription_checkout' };
        }
        break;
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(object);
        break;
      case 'customer.subscription.updated':
        result = await handleSubscriptionUpdated(object);
        break;
      default:
        result = { handled: false, reason: 'unhandled_event_type' };
    }

    return json({ received: true, result });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return json({ error: (error as Error).message || 'Internal error' }, 500);
  }
});
