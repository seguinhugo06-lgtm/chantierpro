/**
 * gocardless-connect — Supabase Edge Function
 *
 * OAuth callback for GoCardless connection.
 * After the artisan authorizes on GoCardless, redirected here with a code.
 *
 * Route: GET /gocardless-connect?code=CODE&state=USER_ID
 *
 * Environment variables:
 *   GOCARDLESS_CLIENT_ID — GoCardless app client ID
 *   GOCARDLESS_CLIENT_SECRET — GoCardless app client secret
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 *   APP_URL — Frontend URL for redirect
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id
    const error = url.searchParams.get('error');

    const appUrl = Deno.env.get('APP_URL') || 'https://batigesti.vercel.app';
    const settingsUrl = `${appUrl}/#settings/finance`;

    if (error) {
      console.error('GoCardless OAuth error:', error);
      return Response.redirect(
        `${settingsUrl}?gocardless_connect=error&message=${encodeURIComponent(error)}`,
        302
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${settingsUrl}?gocardless_connect=error&message=${encodeURIComponent('Paramètres manquants')}`,
        302
      );
    }

    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOCARDLESS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.redirect(
        `${settingsUrl}?gocardless_connect=error&message=${encodeURIComponent('Configuration GoCardless manquante')}`,
        302
      );
    }

    // Exchange code for access token
    const gcEnvironment = url.searchParams.get('environment') || 'sandbox';
    const gcBaseUrl = gcEnvironment === 'live'
      ? 'https://connect.gocardless.com'
      : 'https://connect-sandbox.gocardless.com';

    const tokenRes = await fetch(`${gcBaseUrl}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/gocardless-connect`,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('GoCardless token exchange error:', err);
      return Response.redirect(
        `${settingsUrl}?gocardless_connect=error&message=${encodeURIComponent('Échec de l\'authentification')}`,
        302
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const organisationId = tokenData.organisation_id;

    if (!accessToken) {
      return Response.redirect(
        `${settingsUrl}?gocardless_connect=error&message=${encodeURIComponent('Token non reçu')}`,
        302
      );
    }

    // Get creditor info
    const gcApiUrl = gcEnvironment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';

    let creditorId = null;
    try {
      const creditorRes = await fetch(`${gcApiUrl}/creditors`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'GoCardless-Version': '2015-07-06',
        },
      });
      if (creditorRes.ok) {
        const creditorData = await creditorRes.json();
        creditorId = creditorData.creditors?.[0]?.id;
      }
    } catch (err) {
      console.warn('Could not fetch creditor:', err);
    }

    // Store in database via RPC (stores token in vault)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store access token in vault manually (since RPC requires auth.uid())
    const vaultId = await supabase.rpc('vault.create_secret', {
      secret: accessToken,
      name: `gocardless_token_${state}`,
      description: `GoCardless access token for user ${state}`,
    }).then(r => r.data);

    // Upsert stripe_config with GoCardless fields
    const { error: upsertError } = await supabase
      .from('stripe_config')
      .upsert({
        user_id: state,
        gocardless_enabled: true,
        gocardless_access_token_vault_id: vaultId || null,
        gocardless_creditor_id: creditorId,
        gocardless_environment: gcEnvironment,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error saving GoCardless config:', upsertError);

      // Fallback: direct vault insert + config update
      const { data: vaultResult } = await supabase
        .from('vault.decrypted_secrets')
        .insert({
          secret: accessToken,
          name: `gocardless_token_${state}`,
          description: `GoCardless access token for user ${state}`,
        })
        .select('id')
        .single();

      if (vaultResult) {
        await supabase
          .from('stripe_config')
          .upsert({
            user_id: state,
            gocardless_enabled: true,
            gocardless_access_token_vault_id: vaultResult.id,
            gocardless_creditor_id: creditorId,
            gocardless_environment: gcEnvironment,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }
    }

    console.log(`GoCardless connected for user ${state}, creditor=${creditorId}`);

    return Response.redirect(
      `${settingsUrl}?gocardless_connect=success`,
      302
    );
  } catch (err: any) {
    console.error('gocardless-connect error:', err);
    const appUrl = Deno.env.get('APP_URL') || 'https://batigesti.vercel.app';
    return Response.redirect(
      `${appUrl}/#settings/finance?gocardless_connect=error&message=${encodeURIComponent(err.message || 'Erreur inconnue')}`,
      302
    );
  }
});
