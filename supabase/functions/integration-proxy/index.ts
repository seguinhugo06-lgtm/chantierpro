/**
 * integration-proxy — Generic integration Edge Function
 *
 * Action-dispatch pattern (same as bank-proxy).
 * Handles: initiate_oauth, oauth_callback, connect_api_key, disconnect, sync, get_status
 *
 * Auth: JWT Bearer token → verify user
 * DB: service-role client for Vault operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Supabase clients ────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ── Provider OAuth configs ──────────────────────────────────────────────────

const OAUTH_CONFIGS: Record<string, {
  authorizationUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
}> = {
  pennylane: {
    authorizationUrl: 'https://app.pennylane.com/oauth/authorize',
    tokenUrl: 'https://app.pennylane.com/oauth/token',
    clientIdEnv: 'PENNYLANE_CLIENT_ID',
    clientSecretEnv: 'PENNYLANE_CLIENT_SECRET',
    scopes: ['invoices:read', 'invoices:write', 'expenses:read'],
  },
  google_calendar: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  },
  google_drive: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  },
  docusign: {
    authorizationUrl: 'https://account-d.docusign.com/oauth/auth',
    tokenUrl: 'https://account-d.docusign.com/oauth/token',
    clientIdEnv: 'DOCUSIGN_CLIENT_ID',
    clientSecretEnv: 'DOCUSIGN_CLIENT_SECRET',
    scopes: ['signature'],
  },
};

// ── Action Handlers ─────────────────────────────────────────────────────────

async function handleInitiateOAuth(
  supabase: any,
  userId: string,
  provider: string,
  redirectUri: string,
) {
  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    throw new Error(`OAuth non supporté pour ${provider}`);
  }

  const clientId = Deno.env.get(config.clientIdEnv);
  if (!clientId) {
    throw new Error(`${provider} non configuré (client_id manquant)`);
  }

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in integrations table
  await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider,
      category: getCategoryForProvider(provider),
      status: 'connecting',
      oauth_state: state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return {
    url: `${config.authorizationUrl}?${params.toString()}`,
    state,
  };
}

async function handleOAuthCallback(
  supabase: any,
  userId: string,
  provider: string,
  code: string,
  state: string,
) {
  const config = OAUTH_CONFIGS[provider];
  if (!config) throw new Error(`OAuth non supporté pour ${provider}`);

  // Verify state matches
  const { data: integration } = await supabase
    .from('integrations')
    .select('oauth_state')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (!integration || integration.oauth_state !== state) {
    throw new Error('État OAuth invalide (CSRF protection)');
  }

  const clientId = Deno.env.get(config.clientIdEnv);
  const clientSecret = Deno.env.get(config.clientSecretEnv);

  if (!clientId || !clientSecret) {
    throw new Error(`${provider} non configuré sur le serveur`);
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/integration-proxy/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`[INTEGRATION-PROXY] Token exchange failed for ${provider}:`, errorText);
    throw new Error('Échec de l\'échange de tokens');
  }

  const tokens = await tokenResponse.json();

  // Store tokens via Vault RPC
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error: storeError } = await supabase.rpc('store_integration_credentials', {
    p_provider: provider,
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token || null,
    p_token_expires_at: expiresAt,
    p_scopes: config.scopes,
    p_provider_account_name: tokens.user_email || tokens.account_name || null,
  });

  if (storeError) {
    console.error('[INTEGRATION-PROXY] store_integration_credentials error:', storeError);
    throw new Error('Erreur lors du stockage des credentials');
  }

  return { success: true, provider };
}

async function handleConnectApiKey(
  supabase: any,
  userId: string,
  provider: string,
  apiKey: string,
  providerAccountName?: string,
  config?: Record<string, any>,
) {
  if (!apiKey || apiKey.length < 5) {
    throw new Error('Clé API invalide');
  }

  // Store API key via Vault RPC
  const { data, error } = await supabase.rpc('store_integration_credentials', {
    p_provider: provider,
    p_api_key: apiKey,
    p_provider_account_name: providerAccountName || null,
    p_config: config || {},
  });

  if (error) {
    console.error('[INTEGRATION-PROXY] store_integration_credentials error:', error);
    throw new Error('Erreur lors du stockage de la clé API');
  }

  if (data && !data.success) {
    throw new Error(data.error || 'Erreur de connexion');
  }

  return { success: true, provider };
}

async function handleDisconnect(
  supabase: any,
  userId: string,
  provider: string,
) {
  // The RPC handles Vault cleanup + status update + entity map cleanup
  const { data, error } = await supabase.rpc('disconnect_integration', {
    p_provider: provider,
  });

  // Note: the RPC uses auth.uid() internally, but we're using service_role here
  // so we need to call with the user's context or do it directly
  if (error) {
    // Fallback: direct update
    const { data: integration } = await supabase
      .from('integrations')
      .select('id, access_token_vault_id, refresh_token_vault_id, api_key_vault_id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (integration) {
      // Clean vault entries
      for (const vaultId of [
        integration.access_token_vault_id,
        integration.refresh_token_vault_id,
        integration.api_key_vault_id,
      ]) {
        if (vaultId) {
          await supabase.from('vault.secrets').delete().eq('id', vaultId).catch(() => {});
        }
      }

      // Update status
      await supabase
        .from('integrations')
        .update({
          status: 'disconnected',
          access_token_vault_id: null,
          refresh_token_vault_id: null,
          api_key_vault_id: null,
          oauth_state: null,
          token_expires_at: null,
          scopes: null,
          provider_account_id: null,
          provider_account_name: null,
          sync_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      // Clean entity mappings
      await supabase
        .from('integration_entity_map')
        .delete()
        .eq('integration_id', integration.id);
    }
  }

  return { success: true };
}

async function handleSync(
  supabase: any,
  userId: string,
  provider: string,
  direction: string,
  entityType?: string,
) {
  // Get integration credentials
  const { data: creds, error: credsError } = await supabase.rpc('get_integration_credentials', {
    p_user_id: userId,
    p_provider: provider,
  });

  if (credsError || !creds?.found) {
    throw new Error(`${provider} non connecté`);
  }

  if (creds.status !== 'connected') {
    throw new Error(`${provider} n'est pas connecté (status: ${creds.status})`);
  }

  // Create sync log entry
  const { data: integration } = await supabase
    .from('integrations')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (!integration) throw new Error('Integration non trouvée');

  const { data: syncLog } = await supabase
    .from('integration_sync_logs')
    .insert({
      user_id: userId,
      integration_id: integration.id,
      direction,
      entity_type: entityType || 'all',
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  try {
    // TODO: Dispatch to provider-specific sync handler
    // For Phase 1, we create the structure but the actual provider handlers
    // will be implemented incrementally
    const result = {
      success: true,
      itemsSynced: 0,
      itemsFailed: 0,
      message: `Sync ${provider} ${direction} en cours de développement`,
    };

    // Update sync log with results
    await supabase
      .from('integration_sync_logs')
      .update({
        status: 'success',
        items_synced: result.itemsSynced,
        items_failed: result.itemsFailed,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
      })
      .eq('id', syncLog.id);

    // Update integration last_sync
    await supabase
      .from('integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    return result;
  } catch (syncError: any) {
    // Log failure
    await supabase
      .from('integration_sync_logs')
      .update({
        status: 'error',
        error_message: syncError.message,
        completed_at: new Date().toISOString(),
        duration_ms: syncLog ? Date.now() - new Date(syncLog.started_at).getTime() : 0,
      })
      .eq('id', syncLog?.id);

    await supabase
      .from('integrations')
      .update({
        last_sync_status: 'error',
        last_sync_error: syncError.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    throw syncError;
  }
}

async function handleGetStatus(
  supabase: any,
  userId: string,
  provider: string,
) {
  const { data } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (!data) {
    return { status: 'disconnected', provider };
  }

  return {
    status: data.status,
    provider,
    providerAccountName: data.provider_account_name,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status,
    syncEnabled: data.sync_enabled,
    config: data.config,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryForProvider(provider: string): string {
  const map: Record<string, string> = {
    pennylane: 'accounting', indy: 'accounting', tiime: 'accounting',
    google_calendar: 'calendar', outlook_calendar: 'calendar', ical: 'calendar',
    qonto: 'banking', shine: 'banking', bridge: 'banking',
    yousign: 'signature', docusign: 'signature',
    google_drive: 'storage', dropbox: 'storage',
    webhooks: 'automation', zapier: 'automation', make: 'automation',
    whatsapp: 'communication',
  };
  return map[provider] || 'other';
}

// ── MAIN HANDLER ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // Service role client for DB/Vault operations
    const supabase = getServiceClient();

    let result: any;

    switch (action) {
      case 'initiate_oauth':
        result = await handleInitiateOAuth(supabase, userId, params.provider, params.redirectUri);
        break;

      case 'oauth_callback':
        result = await handleOAuthCallback(supabase, userId, params.provider, params.code, params.state);
        break;

      case 'connect_api_key':
        result = await handleConnectApiKey(
          supabase, userId, params.provider, params.apiKey,
          params.providerAccountName, params.config,
        );
        break;

      case 'disconnect':
        result = await handleDisconnect(supabase, userId, params.provider);
        break;

      case 'sync':
        result = await handleSync(supabase, userId, params.provider, params.direction || 'push', params.entityType);
        break;

      case 'get_status':
        result = await handleGetStatus(supabase, userId, params.provider);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (error: any) {
    console.error('[INTEGRATION-PROXY] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
