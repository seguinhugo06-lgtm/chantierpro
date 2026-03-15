/**
 * check-subcontractor-compliance — Daily cron for insurance/URSSAF verification
 *
 * Runs daily (via pg_cron or external scheduler).
 * Checks all subcontractors for:
 * - Expired décennale → block subcontractor
 * - Expired RC Pro → block subcontractor
 * - URSSAF verification > 6 months → warning notification
 * - Expiring soon (< 30 days) → warning notification
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];

    // Fetch all active, non-archived subcontractors
    const { data: subcontractors, error } = await supabase
      .from('subcontractors')
      .select('id, organization_id, nom, entreprise, statut, expiration_decennale, expiration_rc_pro, derniere_verification_urssaf')
      .eq('is_archived', false)
      .in('statut', ['actif', 'favori', 'bloque']);

    if (error) {
      console.error('[COMPLIANCE] Fetch error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let blockedCount = 0;
    let unblockedCount = 0;
    let warningCount = 0;

    for (const st of subcontractors || []) {
      const name = st.entreprise || st.nom;
      let shouldBlock = false;
      const alerts: string[] = [];

      // ── Décennale ───────────────────────────────────────────────────────
      if (st.expiration_decennale) {
        if (st.expiration_decennale < today) {
          shouldBlock = true;
          alerts.push(`Décennale expirée (${st.expiration_decennale})`);
        } else if (st.expiration_decennale <= thirtyDaysFromNow) {
          warningCount++;
          alerts.push(`Décennale expire le ${st.expiration_decennale}`);
        }
      }

      // ── RC Pro ──────────────────────────────────────────────────────────
      if (st.expiration_rc_pro) {
        if (st.expiration_rc_pro < today) {
          shouldBlock = true;
          alerts.push(`RC Pro expirée (${st.expiration_rc_pro})`);
        } else if (st.expiration_rc_pro <= thirtyDaysFromNow) {
          warningCount++;
          alerts.push(`RC Pro expire le ${st.expiration_rc_pro}`);
        }
      }

      // ── URSSAF ──────────────────────────────────────────────────────────
      if (st.derniere_verification_urssaf && st.derniere_verification_urssaf < sixMonthsAgo) {
        warningCount++;
        alerts.push(`Vigilance URSSAF obsolète (${st.derniere_verification_urssaf})`);
      }

      // ── Block/Unblock logic ─────────────────────────────────────────────
      if (shouldBlock && st.statut !== 'bloque') {
        await supabase
          .from('subcontractors')
          .update({ statut: 'bloque', updated_at: new Date().toISOString() })
          .eq('id', st.id);
        blockedCount++;
        console.log(`[COMPLIANCE] BLOCKED: ${name} — ${alerts.join(', ')}`);
      } else if (!shouldBlock && st.statut === 'bloque') {
        // Auto-unblock if all insurances are now valid
        await supabase
          .from('subcontractors')
          .update({ statut: 'actif', updated_at: new Date().toISOString() })
          .eq('id', st.id);
        unblockedCount++;
        console.log(`[COMPLIANCE] UNBLOCKED: ${name}`);
      }

      if (alerts.length > 0) {
        console.log(`[COMPLIANCE] ${name}: ${alerts.join(', ')}`);
      }
    }

    const result = {
      checked: (subcontractors || []).length,
      blocked: blockedCount,
      unblocked: unblockedCount,
      warnings: warningCount,
      timestamp: new Date().toISOString(),
    };

    console.log('[COMPLIANCE] Run complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('[COMPLIANCE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
