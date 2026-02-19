/**
 * GoCardless Bank Account Data Integration Service
 * Handles all bank connection operations via the bank-proxy Edge Function
 *
 * In demo mode, returns realistic fake data for French banks
 *
 * @module gocardless
 */

import supabase, { isDemo } from '../../supabaseClient';
import { DEMO_BANK_CONNECTION, DEMO_BANK_TRANSACTIONS, DEMO_INSTITUTIONS } from '../demo-bank-data';

// ============================================================================
// Edge Function caller
// ============================================================================

async function callBankProxy(action, params = {}) {
  if (!supabase) throw new Error('Supabase non configuré');

  const { data, error } = await supabase.functions.invoke('bank-proxy', {
    body: { action, ...params },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * List available banking institutions for a country
 * @param {string} country - ISO country code (default: FR)
 * @returns {Promise<Array>} institutions list
 */
export async function listInstitutions(country = 'FR') {
  if (isDemo) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));
    return DEMO_INSTITUTIONS;
  }
  return callBankProxy('list_institutions', { country });
}

/**
 * Create a new bank connection (starts redirect flow)
 * @param {Object} institution - { id, name, logo }
 * @param {string} redirectUrl - URL to redirect after bank auth
 * @returns {Promise<{ requisition_id: string, link: string }>}
 */
export async function createConnection(institution, redirectUrl) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 500));
    return {
      requisition_id: 'demo-req-' + Date.now(),
      link: '#demo-redirect',
    };
  }
  return callBankProxy('create_requisition', {
    institution_id: institution.id,
    institution_name: institution.name,
    institution_logo: institution.logo,
    redirect_url: redirectUrl,
  });
}

/**
 * Check the status of a bank connection requisition
 * @param {string} requisitionId
 * @returns {Promise<{ status: string, details: Object }>}
 */
export async function checkConnection(requisitionId) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 600));
    return {
      status: 'linked',
      accounts: ['demo-account-1'],
      details: {
        account_id: 'demo-account-1',
        iban: 'FR7630006000011234567890189',
        owner_name: 'Hugo Seguin',
        currency: 'EUR',
        balance: 15432.67,
      },
    };
  }
  return callBankProxy('check_requisition', { requisition_id: requisitionId });
}

/**
 * Get all bank connections for current user
 * @returns {Promise<Array>}
 */
export async function getConnections() {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 300));
    return [DEMO_BANK_CONNECTION];
  }

  const { data, error } = await supabase
    .from('bank_connections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get transactions for a connection
 * @param {string} connectionId
 * @param {Object} filters - { startDate, endDate, type, reconciled }
 * @returns {Promise<Array>}
 */
export async function getTransactions(connectionId, filters = {}) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 400));
    let txs = [...DEMO_BANK_TRANSACTIONS];

    if (filters.type === 'credit') txs = txs.filter(t => t.transaction_type === 'credit');
    if (filters.type === 'debit') txs = txs.filter(t => t.transaction_type === 'debit');
    if (filters.reconciled === true) txs = txs.filter(t => t.reconciled);
    if (filters.reconciled === false) txs = txs.filter(t => !t.reconciled);
    if (filters.startDate) txs = txs.filter(t => t.booking_date >= filters.startDate);
    if (filters.endDate) txs = txs.filter(t => t.booking_date <= filters.endDate);

    return txs;
  }

  let query = supabase
    .from('bank_transactions')
    .select('*')
    .eq('bank_connection_id', connectionId)
    .order('booking_date', { ascending: false });

  if (filters.type) query = query.eq('transaction_type', filters.type);
  if (filters.reconciled !== undefined) query = query.eq('reconciled', filters.reconciled);
  if (filters.startDate) query = query.gte('booking_date', filters.startDate);
  if (filters.endDate) query = query.lte('booking_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Sync transactions for a connection
 * @param {string} connectionId
 * @returns {Promise<{ synced: number }>}
 */
export async function syncTransactions(connectionId) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 1500));
    return { synced: DEMO_BANK_TRANSACTIONS.length };
  }
  return callBankProxy('sync_transactions', { connection_id: connectionId });
}

/**
 * Sync balance for a connection
 * @param {string} connectionId
 * @returns {Promise<{ balance: number, currency: string }>}
 */
export async function syncBalances(connectionId) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 800));
    return { balance: DEMO_BANK_CONNECTION.last_balance, currency: 'EUR' };
  }
  return callBankProxy('sync_balances', { connection_id: connectionId });
}

/**
 * Sync all data (balance + transactions) for a connection
 * @param {string} connectionId
 * @returns {Promise<{ balance: number, synced: number }>}
 */
export async function syncAll(connectionId) {
  const [balanceResult, txResult] = await Promise.all([
    syncBalances(connectionId),
    syncTransactions(connectionId),
  ]);
  return {
    balance: balanceResult.balance,
    currency: balanceResult.currency,
    synced: txResult.synced,
  };
}

/**
 * Disconnect a bank connection
 * @param {string} connectionId
 * @returns {Promise<{ disconnected: boolean }>}
 */
export async function disconnect(connectionId) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 500));
    return { disconnected: true };
  }
  return callBankProxy('disconnect', { connection_id: connectionId });
}

/**
 * Store GoCardless API keys
 * @param {string} secretId
 * @param {string} secretKey
 * @returns {Promise<{ success: boolean }>}
 */
export async function storeApiKeys(secretId, secretKey) {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 500));
    return { success: true };
  }

  const { data, error } = await supabase.rpc('store_gocardless_keys', {
    p_secret_id: secretId,
    p_secret_key: secretKey,
  });

  if (error) throw error;
  return data;
}

/**
 * Delete GoCardless config (remove keys + connections)
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteConfig() {
  if (isDemo) {
    await new Promise(r => setTimeout(r, 500));
    return { success: true };
  }

  const { data, error } = await supabase.rpc('delete_gocardless_config');
  if (error) throw error;
  return data;
}

/**
 * Check if GoCardless is configured for current user
 * @returns {Promise<{ enabled: boolean, hasConnections: boolean }>}
 */
export async function getStatus() {
  if (isDemo) {
    return { enabled: true, hasConnections: true };
  }

  try {
    const { data } = await supabase
      .from('gocardless_config')
      .select('enabled')
      .single();

    const { data: connections } = await supabase
      .from('bank_connections')
      .select('id')
      .eq('requisition_status', 'linked');

    return {
      enabled: data?.enabled || false,
      hasConnections: (connections?.length || 0) > 0,
    };
  } catch {
    return { enabled: false, hasConnections: false };
  }
}
