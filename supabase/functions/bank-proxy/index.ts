/**
 * Edge Function: bank-proxy
 * Bank connection proxy using Salt Edge Account Information API v5
 *
 * Salt Edge API: https://docs.saltedge.com/account_information/v5/
 * Auth: App-Id + Secret headers (no OAuth token flow needed)
 *
 * POST /functions/v1/bank-proxy
 * Body: { action: string, ...params }
 *
 * Deploy: supabase functions deploy bank-proxy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/communications.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SE_BASE = 'https://www.saltedge.com/api/v5';

// ============================================================================
// Salt Edge API helper
// ============================================================================

async function seFetch(appId: string, secret: string, path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SE_BASE}${path}`, {
    ...options,
    headers: {
      'App-id': appId,
      'Secret': secret,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_message: `HTTP ${res.status}` }));
    throw new Error(err.error_message || err.error || `Salt Edge API error: ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// Action handlers
// ============================================================================

async function handleListProviders(appId: string, secret: string, country: string = 'FR') {
  const data = await seFetch(appId, secret, `/providers?country_code=${country}`);
  return (data.data || []).map((provider: any) => ({
    id: provider.code,
    name: provider.name,
    logo: provider.logo_url,
    countries: [provider.country_code],
    transaction_total_days: 90,
  }));
}

async function handleCreateConnectSession(
  appId: string,
  secret: string,
  supabase: any,
  userId: string,
  customerId: string | null,
  institutionId: string,
  institutionName: string,
  institutionLogo: string,
  redirectUrl: string
) {
  // Step 1: Ensure customer exists
  let customerIdToUse = customerId;

  if (!customerIdToUse) {
    const customerData = await seFetch(appId, secret, '/customers', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          identifier: `batigesti_${userId}_${Date.now()}`,
        },
      }),
    });

    customerIdToUse = customerData.data.id;

    // Save customer_id back via config update (store in saltedge_config)
    await supabase.rpc('set_saltedge_customer_id', {
      p_user_id: userId,
      p_customer_id: String(customerIdToUse),
    });
  }

  // Step 2: Create connect session
  const sessionData = await seFetch(appId, secret, '/connect_sessions/create', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        customer_id: String(customerIdToUse),
        consent: {
          scopes: ['account_details', 'transactions_details'],
          from_date: '2024-01-01',
        },
        attempt: {
          return_to: redirectUrl,
        },
        allowed_countries: ['FR'],
        provider_code: institutionId,
      },
    }),
  });

  const connectUrl = sessionData.data.connect_url;

  // Step 3: Generate a local reference ID for tracking
  const requisitionRef = `se_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Step 4: Save pending connection in DB
  const { error } = await supabase.from('bank_connections').insert({
    user_id: userId,
    institution_id: institutionId,
    institution_name: institutionName,
    institution_logo: institutionLogo,
    requisition_id: requisitionRef,
    requisition_status: 'pending',
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) throw error;

  return { requisition_id: requisitionRef, link: connectUrl };
}

async function handleCheckConnection(
  appId: string,
  secret: string,
  supabase: any,
  userId: string,
  customerId: string,
  requisitionId: string
) {
  // Step 1: Get all connections for this customer
  const connectionsData = await seFetch(appId, secret, `/connections?customer_id=${customerId}`);
  const connections = connectionsData.data || [];

  // Step 2: Find the latest active connection (most recently created)
  // Since we can't directly map requisitionRef to a Salt Edge connection,
  // we pick the latest connection that isn't already tracked in another DB row
  const { data: existingConns } = await supabase
    .from('bank_connections')
    .select('account_id')
    .eq('user_id', userId)
    .eq('requisition_status', 'linked')
    .not('account_id', 'is', null);

  const trackedConnectionIds = new Set(
    (existingConns || []).map((c: any) => c.account_id)
  );

  // Find the newest connection that is not already tracked
  let matchedConnection = connections
    .filter((c: any) => !trackedConnectionIds.has(String(c.id)))
    .sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    })[0];

  // If no untracked connection, fall back to latest overall
  if (!matchedConnection && connections.length > 0) {
    matchedConnection = connections.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    })[0];
  }

  if (!matchedConnection) {
    // No connection found yet — still pending
    return { status: 'pending', accounts: [], details: null };
  }

  // Step 3: Map Salt Edge status to our status
  const seStatus = matchedConnection.status;
  let status: string;
  switch (seStatus) {
    case 'active':
      status = 'linked';
      break;
    case 'inactive':
    case 'disabled':
      status = 'expired';
      break;
    default:
      status = 'pending';
  }

  let accountDetails = null;
  const accountIds: string[] = [];

  if (status === 'linked') {
    // Step 4: Fetch accounts for this connection
    try {
      const accountsData = await seFetch(appId, secret, `/accounts?connection_id=${matchedConnection.id}`);
      const accounts = accountsData.data || [];

      if (accounts.length > 0) {
        const firstAccount = accounts[0];
        accountIds.push(...accounts.map((a: any) => String(a.id)));

        accountDetails = {
          account_id: String(firstAccount.id),
          iban: firstAccount.extra?.iban || null,
          owner_name: firstAccount.extra?.holder_name || null,
          currency: firstAccount.currency_code || 'EUR',
          balance: firstAccount.balance != null ? parseFloat(firstAccount.balance) : null,
        };

        // Step 5: Update connection in DB
        await supabase
          .from('bank_connections')
          .update({
            requisition_status: 'linked',
            account_id: String(matchedConnection.id),
            iban: accountDetails.iban,
            owner_name: accountDetails.owner_name,
            currency: accountDetails.currency,
            last_balance: accountDetails.balance,
            last_balance_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('requisition_id', requisitionId)
          .eq('user_id', userId);
      }
    } catch (e) {
      console.error('Error fetching account details:', e);
    }
  } else {
    // Update status only
    await supabase
      .from('bank_connections')
      .update({
        requisition_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('requisition_id', requisitionId)
      .eq('user_id', userId);
  }

  return { status, accounts: accountIds, details: accountDetails };
}

async function handleSyncTransactions(
  appId: string,
  secret: string,
  supabase: any,
  userId: string,
  connectionId: string
) {
  // Get connection from DB
  const { data: conn, error: connErr } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (connErr || !conn?.account_id) throw new Error('Connection non trouvée');

  const seConnectionId = conn.account_id; // This stores the Salt Edge connection ID

  // Optionally refresh connection data first
  try {
    await seFetch(appId, secret, `/connections/${seConnectionId}/refresh`, {
      method: 'PUT',
      body: JSON.stringify({ data: { attempt: { fetch_scopes: ['transactions'] } } }),
    });
  } catch (e) {
    console.warn('Refresh request (non-blocking):', e.message);
  }

  // Fetch accounts to get the first account_id for transaction query
  const accountsData = await seFetch(appId, secret, `/accounts?connection_id=${seConnectionId}`);
  const accounts = accountsData.data || [];

  if (accounts.length === 0) throw new Error('Aucun compte trouvé pour cette connexion');

  const seAccountId = accounts[0].id;

  // Fetch transactions
  const txData = await seFetch(appId, secret, `/transactions?connection_id=${seConnectionId}&account_id=${seAccountId}`);
  const rawTransactions = txData.data || [];

  // Upsert transactions
  const transactions = rawTransactions.map((tx: any) => ({
    user_id: userId,
    bank_connection_id: connectionId,
    transaction_id: String(tx.id),
    booking_date: tx.made_on,
    value_date: tx.made_on,
    amount: parseFloat(tx.amount || '0'),
    currency: tx.currency_code || conn.currency || 'EUR',
    creditor_name: tx.amount >= 0 ? (tx.extra?.payee || null) : null,
    debtor_name: tx.amount < 0 ? (tx.extra?.payer || null) : null,
    remittance_info: tx.description || tx.extra?.additional || null,
    bank_reference: tx.extra?.id || null,
    transaction_type: parseFloat(tx.amount || '0') >= 0 ? 'credit' : 'debit',
    raw_data: tx,
  }));

  if (transactions.length > 0) {
    const { error: upsertErr } = await supabase
      .from('bank_transactions')
      .upsert(transactions, {
        onConflict: 'bank_connection_id,transaction_id',
        ignoreDuplicates: false,
      });

    if (upsertErr) throw upsertErr;
  }

  // Update last_sync
  await supabase
    .from('bank_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('user_id', userId);

  return { synced: transactions.length, total_booked: rawTransactions.length };
}

async function handleSyncBalances(
  appId: string,
  secret: string,
  supabase: any,
  userId: string,
  connectionId: string
) {
  const { data: conn, error: connErr } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (connErr || !conn?.account_id) throw new Error('Connection non trouvée');

  const seConnectionId = conn.account_id;

  // Fetch accounts (balance is a field on the account object in Salt Edge)
  const accountsData = await seFetch(appId, secret, `/accounts?connection_id=${seConnectionId}`);
  const accounts = accountsData.data || [];

  if (accounts.length === 0) throw new Error('Aucun compte trouvé');

  const firstAccount = accounts[0];
  const amount = firstAccount.balance != null ? parseFloat(firstAccount.balance) : null;
  const currency = firstAccount.currency_code || 'EUR';

  await supabase
    .from('bank_connections')
    .update({
      last_balance: amount,
      last_balance_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('user_id', userId);

  return { balance: amount, currency };
}

async function handleDisconnect(
  appId: string,
  secret: string,
  supabase: any,
  userId: string,
  connectionId: string
) {
  // Get connection to find Salt Edge connection ID
  const { data: conn } = await supabase
    .from('bank_connections')
    .select('account_id')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  // Attempt to delete from Salt Edge
  if (conn?.account_id) {
    try {
      await seFetch(appId, secret, `/connections/${conn.account_id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Salt Edge disconnect (non-blocking):', e.message);
    }
  }

  // Delete transactions first (cascade should handle it but be explicit)
  await supabase
    .from('bank_transactions')
    .delete()
    .eq('bank_connection_id', connectionId)
    .eq('user_id', userId);

  // Delete connection from DB
  const { error } = await supabase
    .from('bank_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);

  if (error) throw error;
  return { disconnected: true };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user-context client to verify auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Service role client for DB operations
    const supabase = getSupabaseClient();

    // Get Salt Edge config (needed for all actions including disconnect)
    const { data: config, error: configErr } = await supabase.rpc('get_saltedge_config', {
      p_user_id: userId,
    });

    if (configErr || !config?.enabled) {
      return new Response(
        JSON.stringify({ error: 'Salt Edge non configuré. Ajoutez vos clés API dans les paramètres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { app_id: appId, secret, customer_id: customerId } = config;

    let result: any;

    switch (action) {
      case 'list_institutions':
      case 'list_providers':
        result = await handleListProviders(appId, secret, params.country || 'FR');
        break;

      case 'create_requisition':
      case 'create_connect_session':
        result = await handleCreateConnectSession(
          appId, secret, supabase, userId, customerId,
          params.institution_id,
          params.institution_name,
          params.institution_logo,
          params.redirect_url
        );
        break;

      case 'check_requisition':
      case 'check_connection':
        if (!customerId) {
          return new Response(
            JSON.stringify({ error: 'Aucun customer Salt Edge trouvé. Créez une connexion d\'abord.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleCheckConnection(
          appId, secret, supabase, userId, customerId, params.requisition_id
        );
        break;

      case 'sync_transactions':
        result = await handleSyncTransactions(appId, secret, supabase, userId, params.connection_id);
        break;

      case 'sync_balances':
        result = await handleSyncBalances(appId, secret, supabase, userId, params.connection_id);
        break;

      case 'disconnect':
        result = await handleDisconnect(appId, secret, supabase, userId, params.connection_id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[BANK-PROXY] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
