/**
 * create-sepa-payment — Supabase Edge Function
 *
 * Creates a SEPA Direct Debit payment via GoCardless.
 * Called from the public payment page when client enters their IBAN.
 *
 * Flow:
 *   1. Receive { payment_link_token, iban, account_holder_name }
 *   2. Load payment link + GoCardless config
 *   3. Create GoCardless customer → mandate → payment
 *   4. Create payment_transaction with status 'processing'
 *   5. Return confirmation
 *
 * Environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_link_token, iban, account_holder_name, email } = await req.json();

    if (!payment_link_token || !iban || !account_holder_name) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants (token, IBAN, nom)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate IBAN format (basic check)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return new Response(JSON.stringify({ error: 'IBAN invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load payment link data
    const { data: linkData, error: linkError } = await supabaseAdmin
      .rpc('get_payment_link_data', { p_token: payment_link_token });

    if (linkError || linkData?.error) {
      return new Response(JSON.stringify({ error: linkData?.error || 'Lien invalide' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { link, facture, config } = linkData;

    if (!config?.gocardless_enabled) {
      return new Response(JSON.stringify({ error: 'Prélèvement SEPA non disponible' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.statut === 'paye') {
      return new Response(JSON.stringify({ error: 'Ce lien a déjà été utilisé' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get GoCardless access token from vault
    const { data: gcToken } = await supabaseAdmin
      .rpc('get_gocardless_token_for_user', { p_user_id: facture.user_id });

    if (!gcToken) {
      return new Response(JSON.stringify({ error: 'Configuration GoCardless manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine GoCardless API URL
    const gcBaseUrl = config.gocardless_environment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';

    const gcHeaders = {
      'Authorization': `Bearer ${gcToken}`,
      'GoCardless-Version': '2015-07-06',
      'Content-Type': 'application/json',
    };

    // 1. Create customer
    const customerRes = await fetch(`${gcBaseUrl}/customers`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify({
        customers: {
          email: email || linkData.client?.email || '',
          given_name: account_holder_name.split(' ')[0] || account_holder_name,
          family_name: account_holder_name.split(' ').slice(1).join(' ') || '',
          metadata: {
            payment_link_id: link.id,
            document_id: facture.id,
          },
        },
      }),
    });

    if (!customerRes.ok) {
      const err = await customerRes.text();
      console.error('GoCardless customer creation error:', err);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du client SEPA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { customers: customer } = await customerRes.json();

    // 2. Create customer bank account
    const bankRes = await fetch(`${gcBaseUrl}/customer_bank_accounts`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify({
        customer_bank_accounts: {
          iban: cleanIban,
          account_holder_name,
          links: { customer: customer.id },
        },
      }),
    });

    if (!bankRes.ok) {
      const err = await bankRes.text();
      console.error('GoCardless bank account creation error:', err);
      return new Response(JSON.stringify({ error: 'IBAN invalide ou rejeté' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { customer_bank_accounts: bankAccount } = await bankRes.json();

    // 3. Create mandate
    const mandateRes = await fetch(`${gcBaseUrl}/mandates`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify({
        mandates: {
          scheme: 'sepa_core',
          links: { customer_bank_account: bankAccount.id },
          metadata: {
            payment_link_id: link.id,
          },
        },
      }),
    });

    if (!mandateRes.ok) {
      const err = await mandateRes.text();
      console.error('GoCardless mandate creation error:', err);
      return new Response(JSON.stringify({ error: 'Impossible de créer le mandat SEPA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mandates: mandate } = await mandateRes.json();

    // 4. Create payment
    const paymentRes = await fetch(`${gcBaseUrl}/payments`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify({
        payments: {
          amount: link.montant_centimes,
          currency: 'EUR',
          description: `Facture ${facture.numero}`,
          links: { mandate: mandate.id },
          metadata: {
            payment_link_id: link.id,
            document_id: facture.id,
            user_id: facture.user_id,
          },
        },
      }),
    });

    if (!paymentRes.ok) {
      const err = await paymentRes.text();
      console.error('GoCardless payment creation error:', err);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du prélèvement' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { payments: gcPayment } = await paymentRes.json();

    // 5. Create payment transaction in processing state
    const gcFees = Math.min(
      Math.round(link.montant_centimes * 0.002 + 20),
      500
    );

    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: facture.user_id,
        payment_link_id: link.id,
        document_id: facture.id,
        document_numero: facture.numero,
        client_id: linkData.client?.id || null,
        provider: 'gocardless',
        provider_transaction_id: gcPayment.id,
        montant_centimes: link.montant_centimes,
        montant_brut: link.montant_centimes / 100,
        frais_centimes: gcFees,
        montant_net: (link.montant_centimes - gcFees) / 100,
        statut: 'processing',
        payment_method: 'sepa_debit',
        metadata: {
          mandate_id: mandate.id,
          customer_id: customer.id,
          charge_date: gcPayment.charge_date,
        },
      });

    // 6. Update payment link
    await supabaseAdmin
      .from('payment_links')
      .update({ statut: 'paye' })
      .eq('id', link.id);

    // 7. Update facture
    await supabaseAdmin
      .from('devis')
      .update({
        payment_status: 'processing',
        payment_method: 'sepa_debit',
      })
      .eq('id', facture.id);

    return new Response(JSON.stringify({
      success: true,
      payment_id: gcPayment.id,
      charge_date: gcPayment.charge_date,
      message: `Prélèvement SEPA initié. Débit prévu le ${gcPayment.charge_date || 'sous 3-5 jours'}.`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('create-sepa-payment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
