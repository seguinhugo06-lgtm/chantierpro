/**
 * Supabase Edge Function: Create Invoice Payment (Stripe Checkout)
 *
 * Public endpoint (no auth required) — called from the public payment page.
 * Creates a Stripe Checkout session in 'payment' mode for a specific facture.
 *
 * Flow:
 *   1. Receive { payment_token, amount_cents? }
 *   2. Load facture + entreprise via RPC get_facture_for_payment
 *   3. Retrieve artisan's Stripe secret key from Vault
 *   4. Create Stripe Checkout session (mode: 'payment')
 *   5. Return { url: session.url }
 *
 * Commission models:
 *   - 'artisan'  → client pays exact TTC amount, artisan absorbs Stripe fees
 *   - 'client'   → client pays TTC + 1.7% processing fee
 *   - 'partage'  → client pays TTC + 0.85% (split fees)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service role client (bypasses RLS — needed to read vault secrets)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { payment_token, amount_cents } = await req.json()

    if (!payment_token) {
      return new Response(JSON.stringify({ error: 'payment_token requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Load facture data via public RPC
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('get_facture_for_payment', { p_token: payment_token })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { facture, client, entreprise, stripe_enabled, commission_model } = result

    if (!stripe_enabled) {
      return new Response(JSON.stringify({ error: 'Paiement en ligne non activé' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (facture.payment_status === 'succeeded') {
      return new Response(JSON.stringify({ error: 'Cette facture a déjà été payée' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get artisan's Stripe secret key via RPC (reads from Vault securely)
    const { data: vaultKey, error: keyError } = await supabaseAdmin
      .rpc('get_stripe_secret_for_user', { p_user_id: facture.user_id })

    if (keyError) {
      console.error('Stripe key retrieval error:', keyError)
    }

    const stripeSecretKey = vaultKey || Deno.env.get('STRIPE_SECRET_KEY') || null

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Clé Stripe non trouvée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Initialize Stripe with artisan's key
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // 4. Calculate amount with commission
    const totalTTC = facture.total_ttc || 0
    const baseAmountCents = amount_cents || Math.round(totalTTC * 100)

    let finalAmountCents = baseAmountCents
    let feeDescription = ''

    switch (commission_model) {
      case 'client':
        // Client pays 1.7% processing fee
        finalAmountCents = Math.round(baseAmountCents * 1.017)
        feeDescription = ' (frais de paiement inclus)'
        break
      case 'partage':
        // Split: client pays 0.85%
        finalAmountCents = Math.round(baseAmountCents * 1.0085)
        feeDescription = ' (frais de paiement partagés)'
        break
      case 'artisan':
      default:
        // Artisan absorbs fees — client pays exact amount
        finalAmountCents = baseAmountCents
        break
    }

    // Ensure minimum 50 cents (Stripe minimum)
    if (finalAmountCents < 50) {
      return new Response(JSON.stringify({ error: 'Montant minimum: 0,50 €' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Build description
    const isPartialPayment = amount_cents && amount_cents < Math.round(totalTTC * 100)
    const paymentType = isPartialPayment ? 'Acompte' : 'Paiement'
    const description = `${paymentType} - Facture ${facture.numero}${feeDescription}`

    // Determine origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://chantierpro.vercel.app'

    // 6. Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Facture ${facture.numero}`,
            description: `${entreprise?.nom || 'Artisan'} — ${facture.objet || description}`,
          },
          unit_amount: finalAmountCents,
        },
        quantity: 1,
      }],
      customer_email: client?.email || undefined,
      success_url: `${origin}/facture/payer/${payment_token}?success=true`,
      cancel_url: `${origin}/facture/payer/${payment_token}?canceled=true`,
      metadata: {
        facture_id: facture.id,
        user_id: facture.user_id,
        payment_type: isPartialPayment ? 'acompte' : 'solde',
        payment_token: payment_token,
        amount_original_cents: baseAmountCents.toString(),
        commission_model: commission_model || 'artisan',
      },
    })

    // 7. Save session ID on facture
    await supabaseAdmin
      .from('devis')
      .update({
        stripe_session_id: session.id,
        payment_status: 'processing',
      })
      .eq('id', facture.id)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Create invoice payment error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
