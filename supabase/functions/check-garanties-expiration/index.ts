/**
 * check-garanties-expiration — Daily cron for warranty expiration alerts
 *
 * Runs daily (via pg_cron or external scheduler) at 8h.
 * Checks all active warranties for:
 * - Expired (date_fin < now) → mark as 'expiree'
 * - Expiring within 30 days → send warning notification
 * - Expiring within 90 days → send info notification
 * Each alert is sent only once (flags alerte_envoyee_90j, 30j, expiration).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

const GARANTIE_TYPE_LABELS: Record<string, string> = {
  parfait_achevement: 'Parfait achèvement (1 an)',
  biennale: 'Garantie biennale (2 ans)',
  decennale: 'Garantie décennale (10 ans)',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

    // Fetch all active warranties with chantier info
    const { data: garanties, error } = await supabase
      .from('chantier_garanties')
      .select(`
        id, organization_id, chantier_id, type_garantie, date_debut, date_fin,
        statut, alerte_envoyee_90j, alerte_envoyee_30j, alerte_envoyee_expiration,
        chantiers!inner(nom, client_nom)
      `)
      .eq('statut', 'active');

    if (error) {
      console.error('[GARANTIES] Fetch error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let expiredCount = 0;
    let alert30Count = 0;
    let alert90Count = 0;

    for (const g of garanties || []) {
      const chantierName = g.chantiers?.nom || 'Chantier';
      const typeLabel = GARANTIE_TYPE_LABELS[g.type_garantie] || g.type_garantie;

      // ── Expired ──────────────────────────────────────────────────────────
      if (g.date_fin < today) {
        // Mark as expired
        await supabase
          .from('chantier_garanties')
          .update({
            statut: 'expiree',
            alerte_envoyee_expiration: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', g.id);

        expiredCount++;
        console.log(`[GARANTIES] EXPIRED: ${chantierName} — ${typeLabel}`);
        continue;
      }

      // ── Expiring within 30 days ──────────────────────────────────────────
      if (g.date_fin <= thirtyDaysFromNow && !g.alerte_envoyee_30j) {
        await supabase
          .from('chantier_garanties')
          .update({
            alerte_envoyee_30j: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', g.id);

        alert30Count++;
        console.log(`[GARANTIES] ALERT-30j: ${chantierName} — ${typeLabel} expire le ${g.date_fin}`);
      }

      // ── Expiring within 90 days ──────────────────────────────────────────
      if (g.date_fin <= ninetyDaysFromNow && !g.alerte_envoyee_90j) {
        await supabase
          .from('chantier_garanties')
          .update({
            alerte_envoyee_90j: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', g.id);

        alert90Count++;
        console.log(`[GARANTIES] ALERT-90j: ${chantierName} — ${typeLabel} expire le ${g.date_fin}`);
      }
    }

    const result = {
      checked: (garanties || []).length,
      expired: expiredCount,
      alerts_30j: alert30Count,
      alerts_90j: alert90Count,
      timestamp: new Date().toISOString(),
    };

    console.log('[GARANTIES] Run complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('[GARANTIES] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
