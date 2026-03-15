/**
 * Qonto Provider Adapter
 *
 * Handles bank transaction fetching and auto-reconciliation.
 * Auth: API key (organization_slug + secret_key).
 *
 * Capabilities: fetch_transactions, auto_reconciliation
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface QontoCredentials {
  apiKey: string;
  organizationSlug?: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  label: string;
  reference: string;
  side: 'credit' | 'debit';
  status: string;
  settled_at: string;
  counterparty_name?: string;
  category?: string;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  details: Record<string, any>;
}

// ── API Client ───────────────────────────────────────────────────────────────

const QONTO_API = 'https://thirdparty.qonto.com/v2';

async function qontoRequest(
  endpoint: string,
  credentials: QontoCredentials,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(`${QONTO_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `${credentials.organizationSlug}:${credentials.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[QONTO] API error ${response.status}:`, errorText);
    if (response.status === 401) throw new Error('CLÉ_API_INVALIDE');
    throw new Error(`Erreur API Qonto: ${response.status}`);
  }

  return response.json();
}

// ── Transaction Fetching ─────────────────────────────────────────────────────

async function fetchTransactions(
  credentials: QontoCredentials,
  dateFrom: string,
  dateTo: string,
  bankAccountSlug?: string,
): Promise<Transaction[]> {
  // First get the organization to find bank accounts
  const orgData = await qontoRequest('/organization', credentials);
  const org = orgData.organization;

  if (!org?.bank_accounts?.length) {
    throw new Error('Aucun compte bancaire trouvé');
  }

  // Use specified account or first one
  const account = bankAccountSlug
    ? org.bank_accounts.find((a: any) => a.slug === bankAccountSlug)
    : org.bank_accounts[0];

  if (!account) {
    throw new Error('Compte bancaire non trouvé');
  }

  const params = new URLSearchParams({
    slug: account.slug,
    settled_at_from: dateFrom,
    settled_at_to: dateTo,
    status: 'completed',
    per_page: '100',
  });

  const data = await qontoRequest(`/transactions?${params}`, credentials);
  return data.transactions || [];
}

// ── Auto-Reconciliation ──────────────────────────────────────────────────────

interface ReconciliationResult {
  matched: number;
  unmatched: number;
  matches: Array<{
    transactionId: string;
    invoiceId: string;
    invoiceNumero: string;
    amount: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

async function reconcileTransactions(
  supabase: any,
  userId: string,
  transactions: Transaction[],
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { matched: 0, unmatched: 0, matches: [] };

  // Get unpaid invoices
  const { data: invoices } = await supabase
    .from('devis')
    .select('id, numero, montant_ttc, total_ttc, client_nom, date_echeance')
    .eq('user_id', userId)
    .eq('type', 'facture')
    .eq('statut', 'envoye');

  if (!invoices?.length) {
    result.unmatched = transactions.length;
    return result;
  }

  // Credits only (incoming payments)
  const credits = transactions.filter(t => t.side === 'credit');

  for (const tx of credits) {
    const txAmount = Math.abs(tx.amount);

    // Try to match by exact amount
    let matchedInvoice = invoices.find(inv => {
      const invAmount = inv.montant_ttc || inv.total_ttc;
      return Math.abs(invAmount - txAmount) < 0.01; // Exact match
    });

    let confidence: 'high' | 'medium' | 'low' = 'high';

    if (!matchedInvoice) {
      // Try fuzzy match: reference in label
      matchedInvoice = invoices.find(inv =>
        tx.label?.toLowerCase().includes(inv.numero?.toLowerCase()) ||
        tx.reference?.toLowerCase().includes(inv.numero?.toLowerCase()),
      );
      confidence = matchedInvoice ? 'medium' : 'low';
    }

    if (!matchedInvoice) {
      // Try counterparty name vs client name
      matchedInvoice = invoices.find(inv =>
        tx.counterparty_name?.toLowerCase().includes(inv.client_nom?.toLowerCase()) ||
        inv.client_nom?.toLowerCase().includes(tx.counterparty_name?.toLowerCase()),
      );
      confidence = 'low';
    }

    if (matchedInvoice) {
      result.matched++;
      result.matches.push({
        transactionId: tx.id,
        invoiceId: matchedInvoice.id,
        invoiceNumero: matchedInvoice.numero,
        amount: txAmount,
        confidence,
      });

      // Remove matched invoice from pool
      const idx = invoices.indexOf(matchedInvoice);
      if (idx > -1) invoices.splice(idx, 1);
    } else {
      result.unmatched++;
    }
  }

  return result;
}

// ── Sync Handler ─────────────────────────────────────────────────────────────

export async function handleQontoSync(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: QontoCredentials,
  direction: string,
  entityType?: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: {},
  };

  try {
    // Fetch last 30 days of transactions
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const transactions = await fetchTransactions(credentials, dateFrom, dateTo);
    result.details.transactionCount = transactions.length;

    // Store transactions as entity mappings
    const { data: existingMappings } = await supabase
      .from('integration_entity_map')
      .select('remote_entity_id')
      .eq('integration_id', integrationId)
      .eq('local_entity_type', 'transaction');

    const existingIds = new Set(
      (existingMappings || []).map((m: any) => m.remote_entity_id),
    );

    let newTransactions = 0;
    for (const tx of transactions) {
      if (existingIds.has(tx.id)) continue;

      try {
        await supabase.from('integration_entity_map').insert({
          user_id: userId,
          integration_id: integrationId,
          local_entity_type: 'transaction',
          local_entity_id: crypto.randomUUID(), // No local entity yet
          remote_entity_id: tx.id,
          remote_entity_type: 'qonto_transaction',
          sync_hash: JSON.stringify({
            amount: tx.amount,
            label: tx.label,
            date: tx.settled_at,
          }),
          last_synced_at: new Date().toISOString(),
        });
        newTransactions++;
      } catch (err: any) {
        result.itemsFailed++;
        result.errors.push(`Transaction ${tx.id}: ${err.message}`);
      }
    }

    result.itemsSynced = newTransactions;
    result.details.newTransactions = newTransactions;

    // Auto-reconciliation
    const reconciliation = await reconcileTransactions(supabase, userId, transactions);
    result.details.reconciliation = reconciliation;

    // Auto-mark matched invoices as paid (high confidence only)
    for (const match of reconciliation.matches.filter(m => m.confidence === 'high')) {
      try {
        await supabase
          .from('devis')
          .update({
            statut: 'payee',
            date_paiement: new Date().toISOString().split('T')[0],
            mode_paiement: 'virement',
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.invoiceId);
      } catch (err: any) {
        result.errors.push(`Auto-reconciliation ${match.invoiceNumero}: ${err.message}`);
      }
    }

    if (reconciliation.matches.length > 0) {
      result.details.autoReconciled = reconciliation.matches.filter(m => m.confidence === 'high').length;
    }

    result.success = result.itemsFailed === 0;
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
  }

  return result;
}

export async function validateQontoConnection(
  credentials: QontoCredentials,
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    const data = await qontoRequest('/organization', credentials);
    return {
      valid: true,
      accountName: data.organization?.legal_name || 'Qonto',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
