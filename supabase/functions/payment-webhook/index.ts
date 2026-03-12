/**
 * payment-webhook — Supabase Edge Function
 *
 * Unified webhook handler for Stripe (facture payments) and GoCardless events.
 * Handles payment confirmations, failures, and refunds.
 *
 * Stripe events:
 *   - checkout.session.completed → mark paid, create transaction, update facture
 *   - charge.refunded → create refund transaction
 *   - payment_intent.payment_failed → log failure
 *
 * GoCardless events:
 *   - payments.confirmed → mark paid
 *   - payments.failed → log failure
 *   - mandates.active → log mandate activation
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY — Platform Stripe secret key
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret for payments
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@13?target=deno';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Handle Stripe webhook events
 */
async function handleStripeWebhook(req: Request): Promise<Response> {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_PAYMENT_WEBHOOK_SECRET') || Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Missing Stripe configuration');
    return new Response('Missing configuration', { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Payment webhook - Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        // Only handle facture payments (not subscriptions)
        if (!metadata.payment_link_id && !metadata.payment_token && !metadata.facture_id) {
          console.log('Skipping non-facture checkout session');
          break;
        }

        const paymentLinkId = metadata.payment_link_id;
        const factureId = metadata.facture_id;
        const userId = metadata.user_id;
        const amountOriginalCents = parseInt(metadata.amount_original_cents || '0', 10);

        // Check idempotence
        const { data: existingTx } = await supabaseAdmin
          .from('payment_transactions')
          .select('id')
          .eq('provider_session_id', session.id)
          .maybeSingle();

        if (existingTx) {
          console.log(`Already processed session ${session.id}`);
          break;
        }

        // Calculate fees
        const amountReceived = session.amount_total || 0;
        const stripeFees = Math.round(amountReceived * 0.015 + 25); // Approximate

        // Create payment transaction
        const { data: tx, error: txError } = await supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: userId,
            payment_link_id: paymentLinkId || null,
            document_id: factureId,
            provider: 'stripe',
            provider_transaction_id: session.payment_intent as string,
            provider_session_id: session.id,
            montant_centimes: amountOriginalCents || amountReceived,
            montant_brut: amountReceived / 100,
            frais_centimes: stripeFees,
            montant_net: (amountReceived - stripeFees) / 100,
            statut: 'succeeded',
            payment_method: 'card',
            card_brand: null, // Would need PaymentIntent expand for this
            card_last4: null,
            metadata: {
              session_id: session.id,
              commission_model: metadata.commission_model,
              payment_type: metadata.payment_type,
            },
          })
          .select('id')
          .single();

        if (txError) {
          console.error('Error creating payment transaction:', txError);
        }

        // Update payment link status
        if (paymentLinkId) {
          await supabaseAdmin
            .from('payment_links')
            .update({
              statut: 'paye',
              paid_at: new Date().toISOString(),
              payment_transaction_id: tx?.id || null,
            })
            .eq('id', paymentLinkId);
        }

        // Update facture status
        if (factureId) {
          await supabaseAdmin
            .from('devis')
            .update({
              payment_status: 'succeeded',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent as string,
              payment_method: 'card',
              statut: 'payee',
            })
            .eq('id', factureId);

          // Create reglement for backward compatibility
          if (userId) {
            await supabaseAdmin
              .from('reglements')
              .insert({
                user_id: userId,
                devis_id: factureId,
                montant: amountReceived / 100,
                date_reglement: new Date().toISOString().split('T')[0],
                mode_paiement: 'cb',
                reference: `Stripe ${(session.payment_intent as string)?.slice(-8) || session.id.slice(-8)}`,
                type: metadata.payment_type === 'acompte' ? 'acompte' : 'paiement',
                notes: 'Paiement en ligne par carte bancaire',
              });
          }

          // Create tresorerie entries
          if (userId) {
            // Income entry
            await supabaseAdmin
              .from('tresorerie_previsions')
              .insert({
                user_id: userId,
                type: 'entree',
                description: `Paiement CB - ${metadata.facture_numero || 'Facture'}`,
                montant: (amountReceived - stripeFees) / 100,
                date_prevue: new Date().toISOString().split('T')[0],
                categorie: 'Client',
                statut: 'paye',
                devis_id: factureId,
                source: 'stripe_payment',
              });

            // Fee entry (expense)
            if (stripeFees > 0) {
              await supabaseAdmin
                .from('tresorerie_previsions')
                .insert({
                  user_id: userId,
                  type: 'sortie',
                  description: `Frais Stripe - ${metadata.facture_numero || 'Facture'}`,
                  montant: stripeFees / 100,
                  date_prevue: new Date().toISOString().split('T')[0],
                  categorie: 'Divers',
                  statut: 'paye',
                  source: 'stripe_fees',
                });
            }
          }
        }

        console.log(`Payment succeeded: session=${session.id}, facture=${factureId}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const refund = charge.refunds?.data?.[0];

        if (!refund) break;

        // Find the original transaction
        const { data: originalTx } = await supabaseAdmin
          .from('payment_transactions')
          .select('id, user_id, document_id, payment_link_id, montant_centimes')
          .eq('provider_transaction_id', charge.payment_intent as string)
          .maybeSingle();

        if (originalTx) {
          // Update original transaction
          const isFullRefund = (refund.amount || 0) >= (originalTx.montant_centimes || 0);
          await supabaseAdmin
            .from('payment_transactions')
            .update({
              statut: isFullRefund ? 'refunded' : 'partially_refunded',
              refunded_at: new Date().toISOString(),
              refund_amount_centimes: refund.amount,
            })
            .eq('id', originalTx.id);

          // Update facture if full refund
          if (isFullRefund && originalTx.document_id) {
            await supabaseAdmin
              .from('devis')
              .update({
                payment_status: 'refunded',
              })
              .eq('id', originalTx.document_id);
          }
        }

        console.log(`Refund processed: charge=${charge.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metadata = pi.metadata || {};

        if (metadata.facture_id) {
          await supabaseAdmin
            .from('devis')
            .update({ payment_status: 'failed' })
            .eq('id', metadata.facture_id);
        }

        console.log(`Payment failed: pi=${pi.id}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error: any) {
    console.error('Stripe webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle GoCardless webhook events
 */
async function handleGoCardlessWebhook(req: Request): Promise<Response> {
  const body = await req.text();
  let events: any[];

  try {
    const payload = JSON.parse(body);
    events = payload.events || [];
  } catch (err) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // TODO: Verify webhook signature with GoCardless webhook secret

  for (const event of events) {
    console.log(`GoCardless event: ${event.resource_type}.${event.action}`);

    try {
      switch (`${event.resource_type}.${event.action}`) {
        case 'payments.confirmed': {
          const paymentId = event.links?.payment;
          if (!paymentId) break;

          // Find transaction by provider_transaction_id
          const { data: tx } = await supabaseAdmin
            .from('payment_transactions')
            .select('id, user_id, document_id, payment_link_id, montant_centimes')
            .eq('provider_transaction_id', paymentId)
            .maybeSingle();

          if (tx) {
            // Update transaction status
            await supabaseAdmin
              .from('payment_transactions')
              .update({ statut: 'succeeded' })
              .eq('id', tx.id);

            // Update payment link
            if (tx.payment_link_id) {
              await supabaseAdmin
                .from('payment_links')
                .update({
                  statut: 'paye',
                  paid_at: new Date().toISOString(),
                  payment_transaction_id: tx.id,
                })
                .eq('id', tx.payment_link_id);
            }

            // Update facture
            if (tx.document_id) {
              await supabaseAdmin
                .from('devis')
                .update({
                  payment_status: 'succeeded',
                  paid_at: new Date().toISOString(),
                  payment_method: 'sepa_debit',
                  statut: 'payee',
                })
                .eq('id', tx.document_id);

              // Create reglement
              if (tx.user_id) {
                await supabaseAdmin
                  .from('reglements')
                  .insert({
                    user_id: tx.user_id,
                    devis_id: tx.document_id,
                    montant: (tx.montant_centimes || 0) / 100,
                    date_reglement: new Date().toISOString().split('T')[0],
                    mode_paiement: 'prelevement',
                    reference: `GoCardless ${paymentId.slice(-8)}`,
                    type: 'paiement',
                    notes: 'Prélèvement SEPA automatique',
                  });
              }
            }
          }
          break;
        }

        case 'payments.failed': {
          const paymentId = event.links?.payment;
          if (!paymentId) break;

          await supabaseAdmin
            .from('payment_transactions')
            .update({
              statut: 'failed',
              error_message: event.details?.description || 'Payment failed',
            })
            .eq('provider_transaction_id', paymentId);
          break;
        }

        case 'mandates.active': {
          console.log(`GoCardless mandate activated: ${event.links?.mandate}`);
          break;
        }

        default:
          console.log(`Unhandled GoCardless event: ${event.resource_type}.${event.action}`);
      }
    } catch (error: any) {
      console.error(`GoCardless event processing error:`, error);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  // Determine provider from headers
  const stripeSignature = req.headers.get('stripe-signature');
  const gcWebhookId = req.headers.get('webhook-id');

  if (stripeSignature) {
    return handleStripeWebhook(req);
  } else if (gcWebhookId) {
    return handleGoCardlessWebhook(req);
  } else {
    // Try to detect from content
    return handleStripeWebhook(req);
  }
});
