/**
 * Pennylane Provider Adapter
 *
 * Handles sync between BatiGesti and Pennylane accounting API.
 * OAuth2 flow managed by parent integration-proxy.
 *
 * Capabilities: sync_factures, sync_depenses, rapprochement
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface PennylaneCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  details: Record<string, any>;
}

// ── API Client ───────────────────────────────────────────────────────────────

const PENNYLANE_API_BASE = 'https://app.pennylane.com/api/external/v1';

async function pennylaneRequest(
  endpoint: string,
  credentials: PennylaneCredentials,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(`${PENNYLANE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PENNYLANE] API error ${response.status}:`, errorText);

    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(`Erreur API Pennylane: ${response.status}`);
  }

  return response.json();
}

// ── Sync Handlers ────────────────────────────────────────────────────────────

/**
 * Push invoices from BatiGesti to Pennylane
 */
async function syncInvoicesPush(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: PennylaneCredentials,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { pushed: [] as string[] },
  };

  // Get invoices that haven't been synced yet
  const { data: invoices, error } = await supabase
    .from('devis')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'facture')
    .in('statut', ['envoye', 'paye']);

  if (error) {
    throw new Error(`Erreur lecture factures: ${error.message}`);
  }

  if (!invoices?.length) {
    return result;
  }

  // Check existing mappings
  const { data: existingMappings } = await supabase
    .from('integration_entity_map')
    .select('local_entity_id')
    .eq('integration_id', integrationId)
    .eq('local_entity_type', 'facture');

  const syncedIds = new Set((existingMappings || []).map((m: any) => m.local_entity_id));

  for (const invoice of invoices) {
    if (syncedIds.has(invoice.id)) continue;

    try {
      // Transform BatiGesti invoice to Pennylane format
      const pennylaneInvoice = {
        date: invoice.date_creation,
        deadline: invoice.date_echeance,
        label: `Facture ${invoice.numero}`,
        currency: 'EUR',
        amount: invoice.montant_ttc,
        invoice_number: invoice.numero,
        customer: {
          name: invoice.client_nom || 'Client',
          // Additional customer fields from BatiGesti client data
        },
        line_items: (invoice.lignes || []).map((l: any) => ({
          label: l.description,
          quantity: l.quantite,
          unit_price: l.prix_unitaire,
          vat_rate: (l.tva || 20) / 100,
        })),
      };

      // POST to Pennylane
      const created = await pennylaneRequest('/customer_invoices', credentials, {
        method: 'POST',
        body: JSON.stringify({ invoice: pennylaneInvoice }),
      });

      // Store entity mapping for idempotence
      await supabase.from('integration_entity_map').insert({
        user_id: userId,
        integration_id: integrationId,
        local_entity_type: 'facture',
        local_entity_id: invoice.id,
        remote_entity_id: created.invoice?.id || created.id,
        remote_entity_type: 'customer_invoice',
        sync_hash: JSON.stringify({ montant: invoice.montant_ttc, statut: invoice.statut }),
        last_synced_at: new Date().toISOString(),
      });

      result.itemsSynced++;
      (result.details.pushed as string[]).push(invoice.numero);
    } catch (err: any) {
      result.itemsFailed++;
      result.errors.push(`Facture ${invoice.numero}: ${err.message}`);
    }
  }

  result.success = result.itemsFailed === 0;
  return result;
}

/**
 * Pull expenses from Pennylane to BatiGesti
 */
async function syncExpensesPull(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: PennylaneCredentials,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { pulled: [] as string[] },
  };

  try {
    // Fetch supplier invoices from Pennylane
    const data = await pennylaneRequest('/supplier_invoices?page=1&per_page=50', credentials);
    const remoteExpenses = data.invoices || data.supplier_invoices || [];

    // Check existing mappings
    const { data: existingMappings } = await supabase
      .from('integration_entity_map')
      .select('remote_entity_id')
      .eq('integration_id', integrationId)
      .eq('local_entity_type', 'depense');

    const syncedRemoteIds = new Set(
      (existingMappings || []).map((m: any) => m.remote_entity_id),
    );

    for (const expense of remoteExpenses) {
      const remoteId = String(expense.id);
      if (syncedRemoteIds.has(remoteId)) continue;

      try {
        // Transform Pennylane expense to BatiGesti format
        const batigestiExpense = {
          user_id: userId,
          description: expense.label || expense.filename || 'Dépense Pennylane',
          montant: expense.amount || expense.total_amount || 0,
          date: expense.date || new Date().toISOString().split('T')[0],
          categorie: mapPennylaneCategory(expense.category),
          source: 'pennylane',
          reference_externe: remoteId,
        };

        const { data: created, error: insertErr } = await supabase
          .from('depenses')
          .insert(batigestiExpense)
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Store mapping
        await supabase.from('integration_entity_map').insert({
          user_id: userId,
          integration_id: integrationId,
          local_entity_type: 'depense',
          local_entity_id: created.id,
          remote_entity_id: remoteId,
          remote_entity_type: 'supplier_invoice',
          last_synced_at: new Date().toISOString(),
        });

        result.itemsSynced++;
        (result.details.pulled as string[]).push(expense.label || remoteId);
      } catch (err: any) {
        result.itemsFailed++;
        result.errors.push(`Dépense ${remoteId}: ${err.message}`);
      }
    }
  } catch (err: any) {
    if (err.message === 'TOKEN_EXPIRED') throw err;
    result.errors.push(err.message);
    result.success = false;
  }

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapPennylaneCategory(pennylaneCategory?: string): string {
  const map: Record<string, string> = {
    'supplies': 'fournitures',
    'equipment': 'equipement',
    'travel': 'deplacement',
    'services': 'services',
    'rent': 'loyer',
    'insurance': 'assurance',
    'taxes': 'taxes',
  };
  return map[pennylaneCategory || ''] || 'autre';
}

// ── Main Export ──────────────────────────────────────────────────────────────

export async function handlePennylaneSync(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: PennylaneCredentials,
  direction: string,
  entityType?: string,
): Promise<SyncResult> {
  const results: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: {},
  };

  try {
    if (direction === 'push' || direction === 'bidirectional') {
      if (!entityType || entityType === 'all' || entityType === 'facture') {
        const pushResult = await syncInvoicesPush(supabase, userId, integrationId, credentials);
        results.itemsSynced += pushResult.itemsSynced;
        results.itemsFailed += pushResult.itemsFailed;
        results.errors.push(...pushResult.errors);
        results.details.push = pushResult.details;
      }
    }

    if (direction === 'pull' || direction === 'bidirectional') {
      if (!entityType || entityType === 'all' || entityType === 'depense') {
        const pullResult = await syncExpensesPull(supabase, userId, integrationId, credentials);
        results.itemsSynced += pullResult.itemsSynced;
        results.itemsFailed += pullResult.itemsFailed;
        results.errors.push(...pullResult.errors);
        results.details.pull = pullResult.details;
      }
    }

    results.success = results.itemsFailed === 0;
  } catch (err: any) {
    results.success = false;
    results.errors.push(err.message);
  }

  return results;
}

export async function validatePennylaneConnection(
  credentials: PennylaneCredentials,
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    const data = await pennylaneRequest('/company', credentials);
    return {
      valid: true,
      accountName: data.company?.name || data.name || 'Pennylane',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
