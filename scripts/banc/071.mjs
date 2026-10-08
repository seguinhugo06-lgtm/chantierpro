// Vérifications de la migration 071 : colonnes de facturation de subscriptions.
export async function verifier({ q, verifier }) {
  const r = await q(`SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions'
    AND column_name IN ('cancel_at_period_end', 'current_period_end', 'current_period_start', 'billing_interval')`);
  verifier(r.rows.length === 4, '071 : les 4 colonnes de facturation existent');
}
