import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Stripe price IDs — optionnels (à configurer dans le Dashboard Stripe pour un
// catalogue nommé). Si absents, on crée un prix récurrent dynamique (price_data)
// à partir des montants ci-dessous → le checkout marche avec la seule clé secrète.
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

// Montants en centimes (fallback price_data dynamique) — DOIVENT rester alignés
// sur `PLANS` dans src/stores/subscriptionStore.js : c'est ce montant qui est
// réellement débité tant qu'aucun STRIPE_PRICE_* n'est configuré. Un écart ici
// ferait payer autre chose que le prix affiché à l'écran.
// Tarif fondateur : 9,90 € / 99 € et 19,90 € / 199 €.
const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  artisan: { monthly: 990, yearly: 9900 },
  equipe: { monthly: 1990, yearly: 19900 },
};
const PLAN_NAMES: Record<string, string> = {
  artisan: 'Mallettico Artisan — tarif fondateur',
  equipe: 'Mallettico Équipe — tarif fondateur',
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
        const amount = PLAN_AMOUNTS[planId]?.[interval];
        if (!priceId && !amount) {
          return new Response(
            JSON.stringify({ error: `Plan/intervalle inconnu : ${planId}/${interval}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Ligne de commande : Price ID si configuré, sinon prix récurrent dynamique
        const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: 'eur',
                product_data: { name: PLAN_NAMES[planId] || `Mallettico ${planId}` },
                unit_amount: amount,
                recurring: { interval: interval === 'yearly' ? 'year' : 'month' },
              },
            };

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id, stripe_subscription_id')
          .eq('user_id', user.id)
          .single();

        // CHANGEMENT DE PLAN ≠ NOUVEL ABONNEMENT.
        //
        // Un Checkout en `mode: 'subscription'` sur un client qui a déjà un
        // abonnement actif en crée un SECOND : Stripe ne remplace pas l'ancien.
        // L'artisan se retrouverait à payer les deux plans en même temps.
        //
        // Un changement de plan passe donc par le portail Stripe, qui gère le
        // remplacement et le prorata. Le Checkout reste réservé à une première
        // souscription (ou à une reprise après résiliation).
        if (sub?.stripe_subscription_id) {
          // On ouvre le portail DIRECTEMENT sur l'écran de bascule, pas sur son
          // accueil : l'artisan vient de cliquer « Passer au plan X », lui
          // demander de re-cliquer « Modifier l'abonnement » puis de rechoisir
          // ce même plan est une étape de trop — et il ne comprend pas pourquoi
          // on lui réaffiche son plan actuel.
          const priceCible = PRICE_IDS[planId]?.[interval];
          let flowData: Record<string, unknown> = {
            type: 'subscription_update',
            subscription_update: { subscription: sub.stripe_subscription_id },
          };

          if (priceCible) {
            try {
              const abo = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
              const ligne = abo.items.data[0];
              // Si le plan visé est déjà celui en cours, l'écran de confirmation
              // n'a rien à confirmer : on laisse la sélection libre.
              if (ligne && ligne.price?.id !== priceCible) {
                flowData = {
                  type: 'subscription_update_confirm',
                  subscription_update_confirm: {
                    subscription: sub.stripe_subscription_id,
                    items: [{ id: ligne.id, price: priceCible, quantity: 1 }],
                  },
                };
              }
            } catch (e) {
              // Prix cible introuvable ou abonnement illisible : on retombe sur
              // l'écran de sélection, qui reste utilisable.
              console.error('[subscription-billing] flow_data confirm impossible:', (e as Error).message);
            }
          }

          const portail = await stripe.billingPortal.sessions.create({
            customer: sub.stripe_customer_id!,
            return_url: successUrl?.split('?')[0] || 'https://mallettico.fr',
            flow_data: flowData as never,
          });
          console.log(`[subscription-billing] Changement de plan → portail (${flowData.type}) pour ${user.id}`);
          return new Response(
            JSON.stringify({ url: portail.url, mode: 'portal' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [lineItem],
          success_url: successUrl || 'https://mallettico.fr/?upgraded=true',
          cancel_url: cancelUrl || 'https://mallettico.fr/?upgrade_cancelled=true',
          client_reference_id: user.id,
          metadata: { user_id: user.id, plan_id: planId },
          allow_promotion_codes: true,
          billing_address_collection: 'required',
          tax_id_collection: { enabled: true },
        };

        if (sub?.stripe_customer_id) {
          sessionParams.customer = sub.stripe_customer_id;
          // Obligatoire dès qu'on réutilise un client existant AVEC
          // `tax_id_collection` ou `billing_address_collection` : sans ça Stripe
          // refuse la session — « Tax ID collection requires updating business
          // name on the customer ». `auto` autorise Checkout à reporter sur la
          // fiche client le nom et l'adresse saisis pendant le paiement.
          sessionParams.customer_update = { name: 'auto', address: 'auto' };
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
          return_url: returnUrl || 'https://mallettico.fr',
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
