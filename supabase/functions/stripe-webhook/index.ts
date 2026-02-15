/**
 * Supabase Edge Function: Stripe Webhook Handler
 *
 * Processes Stripe webhook events to keep subscription data in sync.
 * Events handled:
 *   - checkout.session.completed → activate subscription
 *   - customer.subscription.updated → update plan/status
 *   - customer.subscription.deleted → cancel subscription
 *   - invoice.payment_failed → mark past_due
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`Stripe event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.subscription
          ? (await stripe.subscriptions.retrieve(session.subscription as string)).metadata.supabase_user_id
          : session.metadata?.supabase_user_id

        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          const planId = sub.metadata.plan_id || 'artisan'

          await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: sub.id,
              stripe_price_id: sub.items.data[0]?.price.id,
              plan: planId,
              status: sub.status === 'trialing' ? 'trialing' : 'active',
              billing_interval: sub.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              cancel_at_period_end: sub.cancel_at_period_end,
            }, { onConflict: 'user_id' })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata.supabase_user_id

        if (userId) {
          const planId = sub.metadata.plan_id || 'artisan'

          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan: planId,
              status: sub.status === 'trialing' ? 'trialing' : sub.status,
              stripe_price_id: sub.items.data[0]?.price.id,
              billing_interval: sub.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              cancel_at_period_end: sub.cancel_at_period_end,
            })
            .eq('user_id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata.supabase_user_id

        if (userId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan: 'decouverte',
              status: 'canceled',
              stripe_subscription_id: null,
              stripe_price_id: null,
              cancel_at_period_end: false,
            })
            .eq('user_id', userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const userId = sub.metadata.supabase_user_id

          if (userId) {
            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('user_id', userId)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
