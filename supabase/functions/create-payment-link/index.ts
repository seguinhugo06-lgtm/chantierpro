/**
 * create-payment-link — Supabase Edge Function
 *
 * Generates a payment link for a document (facture/devis).
 * Creates a record in payment_links table and returns the link URL + token.
 *
 * Route: POST /create-payment-link
 * Auth: Required (Bearer token)
 *
 * Body: { document_id, montant_centimes?, expires_days? }
 * Returns: { token, url, link_id }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate a unique token (21 chars, URL-safe)
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(21);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth token for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for writes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { document_id, montant_centimes, expires_days = 90 } = await req.json();

    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get document
    const { data: doc, error: docError } = await supabaseAdmin
      .from('devis')
      .select('id, numero, type, total_ttc, client_id, user_id, organization_id')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if active link already exists for this document
    const { data: existingLink } = await supabaseAdmin
      .from('payment_links')
      .select('id, token')
      .eq('document_id', document_id)
      .eq('user_id', user.id)
      .eq('statut', 'actif')
      .maybeSingle();

    if (existingLink) {
      const appUrl = Deno.env.get('APP_URL') || 'https://batigesti.vercel.app';
      return new Response(JSON.stringify({
        token: existingLink.token,
        url: `${appUrl}/pay/${existingLink.token}`,
        link_id: existingLink.id,
        existing: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get payment config
    const { data: config } = await supabaseAdmin
      .from('stripe_config')
      .select('stripe_enabled, stripe_connect_status, absorb_fees, gocardless_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    const amountCentimes = montant_centimes || Math.round((doc.total_ttc || 0) * 100);
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_days);

    // Insert payment link
    const { data: link, error: insertError } = await supabaseAdmin
      .from('payment_links')
      .insert({
        user_id: user.id,
        organization_id: doc.organization_id || null,
        document_id: doc.id,
        document_type: doc.type || 'facture',
        document_numero: doc.numero,
        client_id: doc.client_id,
        token,
        montant_centimes: amountCentimes,
        montant_ttc: doc.total_ttc,
        statut: 'actif',
        stripe_enabled: config?.stripe_enabled && config?.stripe_connect_status === 'connected',
        gocardless_enabled: config?.gocardless_enabled || false,
        absorb_fees: config?.absorb_fees ?? true,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, token')
      .single();

    if (insertError) {
      console.error('Error creating payment link:', insertError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du lien' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also update the document's payment_token for backward compatibility
    await supabaseAdmin
      .from('devis')
      .update({
        payment_token: token,
        payment_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', doc.id);

    const appUrl = Deno.env.get('APP_URL') || 'https://batigesti.vercel.app';
    const paymentUrl = `${appUrl}/pay/${token}`;

    return new Response(JSON.stringify({
      token: link.token,
      url: paymentUrl,
      link_id: link.id,
      existing: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('create-payment-link error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
