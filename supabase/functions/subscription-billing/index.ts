import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Stripe price IDs — configure in Stripe Dashboard
const PRICE_IDS: Record<string, Record<string, string>> = {
  artisan: {
    monthly: Deno.env.get('STRIPE_PRICE_ARTISAN_MONTHLY') || '',
    yearly: Deno.env.get('STRIPE_PRICE_ARTISAN_YEARLY') || '',
  },
  equipe: {
    monthly: Deno.env.get('STRIPE_PRICE_EQUIPE_MONTHLY') || '',
    yearly: Deno.env.get('STRIPE_PRICE_EQUIPE_YEARLY') || '',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    // Auth — get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    switch (action) {
      case 'create-checkout': {
        const { planId, interval, successUrl, cancelUrl } = params;

        const priceId = PRICE_IDS[planId]?.[interval];
        if (!priceId) {
          return new Response(
            JSON.stringify({ error: `Prix non trouvé pour ${planId}/${interval}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already has a Stripe customer
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .single();

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl || 'https://batigesti.fr/?upgraded=true',
          cancel_url: cancelUrl || 'https://batigesti.fr/?upgrade_cancelled=true',
          client_reference_id: user.id,
          metadata: { user_id: user.id, plan_id: planId },
          allow_promotion_codes: true,
          billing_address_collection: 'required',
          tax_id_collection: { enabled: true },
        };

        if (sub?.stripe_customer_id) {
          sessionParams.customer = sub.stripe_customer_id;
        } else {
          sessionParams.customer_email = user.email;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log(`[subscription-billing] Checkout created for ${user.id}, plan=${planId}`);

        return new Response(
          JSON.stringify({ url: session.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-portal': {
        const { returnUrl } = params;

        // Get customer ID from subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .single();

        if (!sub?.stripe_customer_id) {
          return new Response(
            JSON.stringify({ error: 'Aucun abonnement Stripe trouvé. Souscrivez d\'abord à un plan.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: sub.stripe_customer_id,
          return_url: returnUrl || 'https://batigesti.fr',
        });

        console.log(`[subscription-billing] Portal session created for ${user.id}`);

        return new Response(
          JSON.stringify({ url: session.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Action inconnue' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[subscription-billing] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
