/**
 * Supabase Edge Function: Bank Sync Webhook (Stub)
 *
 * Receives transaction data from bank aggregation providers
 * (Bridge / Powens) and inserts into bank_transactions.
 *
 * This is a STUB — the actual Bridge/Powens integration
 * will be implemented when the bank connection feature goes live.
 *
 * Expected payload:
 * {
 *   provider: 'bridge' | 'powens',
 *   user_id: string,
 *   transactions: [{
 *     date: string,
 *     description: string,
 *     amount: number,
 *     balance?: number,
 *     category?: string,
 *     external_id: string,
 *   }]
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('BANK_WEBHOOK_SECRET') || ''

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify webhook secret
  const authHeader = req.headers.get('x-webhook-secret') || req.headers.get('authorization')
  if (!WEBHOOK_SECRET || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const payload = await req.json()
    const { provider, user_id, transactions } = payload

    if (!provider || !user_id || !Array.isArray(transactions)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Bank sync webhook: ${provider}, user=${user_id}, txs=${transactions.length}`)

    // Map transactions to bank_transactions format
    const rows = transactions.map((tx: any) => ({
      id: crypto.randomUUID(),
      user_id,
      date: tx.date,
      libelle: tx.description || tx.label || '',
      montant: tx.amount,
      solde: tx.balance ?? null,
      categorie: tx.category || null,
      statut: 'non_rapproche',
      source: provider, // 'bridge' or 'powens'
      hash: `${provider}_${tx.external_id || crypto.randomUUID()}`,
      notes: null,
      created_at: new Date().toISOString(),
    }))

    // Upsert with ON CONFLICT (hash) DO NOTHING to avoid duplicates
    const { data, error } = await supabaseAdmin
      .from('bank_transactions')
      .upsert(rows, { onConflict: 'hash', ignoreDuplicates: true })

    if (error) {
      console.error('Insert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update bank_connection status
    await supabaseAdmin
      .from('bank_connection')
      .upsert({
        user_id,
        provider,
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        error_message: null,
      }, { onConflict: 'user_id' })

    return new Response(JSON.stringify({
      received: true,
      inserted: rows.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
