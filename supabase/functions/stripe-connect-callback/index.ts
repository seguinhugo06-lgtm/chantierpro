/**
 * stripe-connect-callback — Supabase Edge Function
 *
 * OAuth callback for Stripe Connect Standard.
 * After the artisan authorizes on Stripe, Stripe redirects here with a code.
 * We exchange the code for a stripe_user_id and store it.
 *
 * Route: GET /stripe-connect-callback?code=CODE&state=USER_ID
 *
 * Environment variables:
 *   STRIPE_CLIENT_ID — Stripe platform client ID (ca_...)
 *   STRIPE_SECRET_KEY — Platform Stripe secret key
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 *   APP_URL — Frontend URL for redirect (e.g. https://batigesti.vercel.app)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@13?target=deno';

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id passed as state
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const appUrl = Deno.env.get('APP_URL') || 'https://batigesti.vercel.app';
    const settingsUrl = `${appUrl}/#settings/finance`;

    // Handle OAuth errors
    if (error) {
      console.error('Stripe Connect OAuth error:', error, errorDescription);
      return Response.redirect(
        `${settingsUrl}?stripe_connect=error&message=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${settingsUrl}?stripe_connect=error&message=${encodeURIComponent('Paramètres manquants')}`,
        302
      );
    }

    // Exchange code for stripe_user_id
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.redirect(
        `${settingsUrl}?stripe_connect=error&message=${encodeURIComponent('Configuration Stripe manquante')}`,
        302
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const stripeAccountId = response.stripe_user_id;
    const livemode = response.livemode || false;

    if (!stripeAccountId) {
      return Response.redirect(
        `${settingsUrl}?stripe_connect=error&message=${encodeURIComponent('Compte Stripe non trouvé')}`,
        302
      );
    }

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert stripe_config with connect details
    const { error: upsertError } = await supabase
      .from('stripe_config')
      .upsert({
        user_id: state,
        stripe_enabled: true,
        stripe_account_id: stripeAccountId,
        stripe_connect_status: 'connected',
        stripe_livemode: livemode,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error saving Stripe Connect config:', upsertError);
      return Response.redirect(
        `${settingsUrl}?stripe_connect=error&message=${encodeURIComponent('Erreur de sauvegarde')}`,
        302
      );
    }

    console.log(`Stripe Connect: Account ${stripeAccountId} connected for user ${state}`);

    return Response.redirect(
      `${settingsUrl}?stripe_connect=success&account=${stripeAccountId}`,
      302
    );
  } catch (err: any) {
    console.error('stripe-connect-callback error:', err);
    const appUrl = Deno.env.get('APP_URL') || 'https://batigesti.vercel.app';
    return Response.redirect(
      `${appUrl}/#settings/finance?stripe_connect=error&message=${encodeURIComponent(err.message || 'Erreur inconnue')}`,
      302
    );
  }
});
