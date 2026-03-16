/**
 * Edge Function: bank-proxy
 * Provider-agnostic bank connection proxy (currently GoCardless)
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

const GC_BASE = 'https://bankaccountdata.gocardless.com/api/v2';

// Token cache (in-memory, per isolate)
const tokenCache: Record<string, { access: string; expires_at: number; refresh: string }> = {};

// ============================================================================
// GoCardless API helpers
// ============================================================================

async function getAccessToken(userId: string, secretId: string, secretKey: string): Promise<string> {
  const cached = tokenCache[userId];
  if (cached && cached.expires_at > Date.now() + 60000) {
    return cached.access;
  }

  // Try refresh first
  if (cached?.refresh) {
    try {
      const res = await fetch(`${GC_BASE}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: cached.refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        tokenCache[userId] = {
          access: data.access,
          expires_at: Date.now() + (data.access_expires - 60) * 1000,
          refresh: cached.refresh,
        };
        return data.access;
      }
    } catch {
      // Refresh failed, get new token
    }
  }

  // Get new token
  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || err.summary || `Token error: ${res.status}`);
  }

  const data = await res.json();
  tokenCache[userId] = {
    access: data.access,
    expires_at: Date.now() + (data.access_expires - 60) * 1000,
    refresh: data.refresh,
  };
  return data.access;
}

async function gcFetch(token: string, path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${GC_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || err.summary || `GoCardless API error: ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// Action handlers
// ============================================================================

async function handleListInstitutions(token: string, country: string = 'FR') {
  const data = await gcFetch(token, `/institutions/?country=${country}`);
  return data.map((inst: any) => ({
    id: inst.id,
    name: inst.name,
    logo: inst.logo,
    countries: inst.countries,
    transaction_total_days: inst.transaction_total_days,
  }));
}

async function handleCreateRequisition(
  token: string,
  supabase: any,
  userId: string,
  institutionId: string,
  institutionName: string,
  institutionLogo: string,
  redirectUrl: string
) {
  // Create requisition at GoCardless
  const data = await gcFetch(token, '/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: institutionId,
      redirect: redirectUrl,
      user_language: 'FR',
    }),
  });

  // Save connection in DB
  const { error } = await supabase.from('bank_connections').insert({
    user_id: userId,
    institution_id: institutionId,
    institution_name: institutionName,
    institution_logo: institutionLogo,
    requisition_id: data.id,
    requisition_status: 'pending',
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) throw error;

  return { requisition_id: data.id, link: data.link };
}

async function handleCheckRequisition(
  token: string,
  supabase: any,
  userId: string,
  requisitionId: string
) {
  const data = await gcFetch(token, `/requisitions/${requisitionId}/`);

  // Map GoCardless status to our status
  const statusMap: Record<string, string> = {
    CR: 'pending',
    GC: 'pending',
    UA: 'pending',
    GA: 'pending',
    SA: 'pending',
    LN: 'linked',
    EX: 'expired',
    RJ: 'rejected',
    SU: 'suspended',
  };

  const status = statusMap[data.status] || 'pending';
  let accountDetails = null;

  if (status === 'linked' && data.accounts?.length > 0) {
    // Fetch first account details
    const accountId = data.accounts[0];
    try {
      const details = await gcFetch(token, `/accounts/${accountId}/details/`);
      const balances = await gcFetch(token, `/accounts/${accountId}/balances/`);
      
      const balance = balances.balances?.find((b: any) => 
        b.balanceType === 'interimAvailable' || b.balanceType === 'expected'
      ) || balances.balances?.[0];

      accountDetails = {
        account_id: accountId,
        iban: details.account?.iban,
        owner_name: details.account?.ownerName,
        currency: details.account?.currency || 'EUR',
        balance: balance?.balanceAmount?.amount ? parseFloat(balance.balanceAmount.amount) : null,
      };

      // Update connection in DB
      await supabase
        .from('bank_connections')
        .update({
          requisition_status: 'linked',
          account_id: accountId,
          iban: accountDetails.iban,
          owner_name: accountDetails.owner_name,
          currency: accountDetails.currency,
          last_balance: accountDetails.balance,
          last_balance_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('requisition_id', requisitionId)
        .eq('user_id', userId);
    } catch (e) {
      console.error('Error fetching account details:', e);
    }
  } else {
    // Update status
    await supabase
      .from('bank_connections')
      .update({
        requisition_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('requisition_id', requisitionId)
      .eq('user_id', userId);
  }

  return { status, accounts: data.accounts, details: accountDetails };
}

async function handleSyncTransactions(
  token: string,
  supabase: any,
  userId: string,
  connectionId: string
) {
  // Get connection
  const { data: conn, error: connErr } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (connErr || !conn?.account_id) throw new Error('Connection non trouvée');

  // Fetch transactions
  const data = await gcFetch(token, `/accounts/${conn.account_id}/transactions/`);
  const booked = data.transactions?.booked || [];

  // Upsert transactions
  const transactions = booked.map((tx: any) => ({
    user_id: userId,
    bank_connection_id: connectionId,
    transaction_id: tx.transactionId || tx.internalTransactionId || `${tx.bookingDate}_${tx.transactionAmount?.amount}`,
    booking_date: tx.bookingDate,
    value_date: tx.valueDate || tx.bookingDate,
    amount: parseFloat(tx.transactionAmount?.amount || '0'),
    currency: tx.transactionAmount?.currency || conn.currency || 'EUR',
    creditor_name: tx.creditorName || null,
    debtor_name: tx.debtorName || null,
    remittance_info: tx.remittanceInformationUnstructured || 
                     tx.remittanceInformationUnstructuredArray?.join(' ') || 
                     tx.additionalInformation || null,
    bank_reference: tx.bankTransactionCode || null,
    transaction_type: parseFloat(tx.transactionAmount?.amount || '0') >= 0 ? 'credit' : 'debit',
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

  return { synced: transactions.length, total_booked: booked.length };
}

async function handleSyncBalances(
  token: string,
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

  const data = await gcFetch(token, `/accounts/${conn.account_id}/balances/`);
  const balance = data.balances?.find((b: any) =>
    b.balanceType === 'interimAvailable' || b.balanceType === 'expected'
  ) || data.balances?.[0];

  const amount = balance?.balanceAmount?.amount ? parseFloat(balance.balanceAmount.amount) : null;

  await supabase
    .from('bank_connections')
    .update({
      last_balance: amount,
      last_balance_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('user_id', userId);

  return { balance: amount, currency: balance?.balanceAmount?.currency || 'EUR' };
}

async function handleDisconnect(
  supabase: any,
  userId: string,
  connectionId: string
) {
  // Delete transactions first (cascade should handle it but be explicit)
  await supabase
    .from('bank_transactions')
    .delete()
    .eq('bank_connection_id', connectionId)
    .eq('user_id', userId);

  // Delete connection
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

    let result: any;

    if (action === 'disconnect') {
      result = await handleDisconnect(supabase, userId, params.connection_id);
    } else {
      // All other actions need GoCardless credentials
      const { data: config, error: configErr } = await supabase.rpc('get_gocardless_config', {
        p_user_id: userId,
      });

      if (configErr || !config?.enabled) {
        return new Response(
          JSON.stringify({ error: 'GoCardless non configuré. Ajoutez vos clés API dans les paramètres.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = await getAccessToken(userId, config.secret_id, config.secret_key);

      switch (action) {
        case 'list_institutions':
          result = await handleListInstitutions(token, params.country || 'FR');
          break;

        case 'create_requisition':
          result = await handleCreateRequisition(
            token, supabase, userId,
            params.institution_id,
            params.institution_name,
            params.institution_logo,
            params.redirect_url
          );
          break;

        case 'check_requisition':
          result = await handleCheckRequisition(token, supabase, userId, params.requisition_id);
          break;

        case 'sync_transactions':
          result = await handleSyncTransactions(token, supabase, userId, params.connection_id);
          break;

        case 'sync_balances':
          result = await handleSyncBalances(token, supabase, userId, params.connection_id);
          break;

        default:
          return new Response(
            JSON.stringify({ error: `Action inconnue: ${action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
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
