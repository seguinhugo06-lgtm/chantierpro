/**
 * Edge Function: create-checkout-session
 * Creates a Stripe Checkout Session for invoice payment
 *
 * POST /functions/v1/create-checkout-session
 * Body: { payment_token: UUID, success_url: string, cancel_url: string }
 *
 * Deploy: supabase functions deploy create-checkout-session
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/communications.ts';

// ============================================================================
// STRIPE API (direct fetch, no SDK)
// ============================================================================

async function createStripeCheckoutSession(
  secretKey: string,
  params: {
    amount: number; // in cents
    currency: string;
    customerEmail?: string;
    description: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams({
    'payment_method_types[]': 'card',
    'mode': 'payment',
    'line_items[0][price_data][currency]': params.currency,
    'line_items[0][price_data][unit_amount]': params.amount.toString(),
    'line_items[0][price_data][product_data][name]': params.description,
    'line_items[0][quantity]': '1',
    'success_url': params.successUrl,
    'cancel_url': params.cancelUrl,
    'expires_after': '1800', // 30 minutes
  });

  if (params.customerEmail) {
    body.set('customer_email', params.customerEmail);
  }

  // Add metadata
  for (const [key, value] of Object.entries(params.metadata)) {
    body.set(`metadata[${key}]`, value);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Stripe API error: ${response.status}`);
  }

  const session = await response.json();
  return { id: session.id, url: session.url };
}

// ============================================================================
// COMMISSION CALCULATION
// ============================================================================

function calculatePaymentAmount(totalTtcCents: number, commissionModel: string): number {
  switch (commissionModel) {
    case 'client':
      // Client pays +1.7% to cover Stripe fees (~1.4% + 0.25€)
      return Math.round(totalTtcCents * 1.017);
    case 'partage':
      // Split 50/50: +0.85%
      return Math.round(totalTtcCents * 1.0085);
    case 'artisan':
    default:
      // Artisan absorbs fees, client pays exact TTC
      return totalTtcCents;
  }
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
    const { payment_token, success_url, cancel_url } = await req.json();

    if (!payment_token) {
      return new Response(
        JSON.stringify({ error: 'payment_token requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Get facture data via public RPC
    const { data: factureData, error: rpcError } = await supabase.rpc('get_facture_for_payment', {
      p_token: payment_token,
    });

    if (rpcError) throw rpcError;
    if (!factureData || factureData.error) {
      return new Response(
        JSON.stringify({ error: factureData?.error || 'Facture non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const facture = factureData.facture;
    const entreprise = factureData.entreprise;
    const client = factureData.client;
    const stripeInfo = factureData.stripe;

    // 2. Check Stripe is enabled
    if (!stripeInfo?.enabled) {
      return new Response(
        JSON.stringify({ error: 'Le paiement en ligne n\'est pas activé pour cet artisan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get Stripe config with secret key (service_role only)
    const { data: stripeConfig, error: configError } = await supabase.rpc('get_stripe_config_for_user', {
      p_user_id: facture.user_id,
    });

    if (configError || !stripeConfig?.secret_key) {
      return new Response(
        JSON.stringify({ error: 'Configuration Stripe incomplète' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Calculate amount in cents
    const totalTtcCents = Math.round((facture.total_ttc || 0) * 100);
    const paymentAmountCents = calculatePaymentAmount(totalTtcCents, stripeConfig.commission_model || 'artisan');

    // 5. Build URLs
    const appUrl = Deno.env.get('APP_URL') || 'https://app.chantierpro.fr';
    const effectiveSuccessUrl = success_url || `${appUrl}/facture/payer/${payment_token}?status=success`;
    const effectiveCancelUrl = cancel_url || `${appUrl}/facture/payer/${payment_token}?status=cancel`;

    // 6. Create Stripe Checkout Session
    const session = await createStripeCheckoutSession(stripeConfig.secret_key, {
      amount: paymentAmountCents,
      currency: 'eur',
      customerEmail: client?.email || undefined,
      description: `Facture ${facture.numero} - ${entreprise?.nom || 'Artisan'}`,
      metadata: {
        facture_id: facture.id,
        facture_numero: facture.numero,
        payment_token: payment_token,
        entreprise: entreprise?.nom || '',
      },
      successUrl: effectiveSuccessUrl,
      cancelUrl: effectiveCancelUrl,
    });

    // 7. Save session ID on the facture
    await supabase
      .from('devis')
      .update({
        stripe_session_id: session.id,
        payment_amount: paymentAmountCents,
        payment_status: 'processing',
      })
      .eq('id', facture.id);

    // 8. Log event
    await supabase.from('events_log').insert([{
      event_type: 'checkout_session_created',
      entity_type: 'facture',
      entity_id: facture.id,
      success: true,
      metadata: { session_id: session.id, amount_cents: paymentAmountCents },
      triggered_at: new Date().toISOString(),
    }]);

    console.log(`[CHECKOUT] Session created for facture ${facture.numero}: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[CHECKOUT] Error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
