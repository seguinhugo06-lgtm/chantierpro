/**
 * generate-report — Supabase Edge Function
 *
 * Generates PDF reports (activity, financial) server-side for automated scheduling.
 * Can be invoked via cron (pg_cron or external scheduler) or API call.
 *
 * Input (POST body):
 *   { type: 'activite' | 'financier', user_id?: string }
 *
 * When invoked by cron (with service_role_key), processes all users with
 * active auto-report config. When invoked by a user, generates for that user only.
 *
 * Environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 *   RESEND_API_KEY — for email sending (optional)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportConfig {
  id: string;
  user_id: string;
  activite_actif: boolean;
  activite_periodicite: string;
  financier_actif: boolean;
  financier_periodicite: string;
  destinataires: string[];
  inclure_logo: boolean;
  inclure_graphiques: boolean;
}

interface KPIs {
  ca: number;
  depenses: number;
  marge: number;
  margePercent: number;
  devisEnvoyes: number;
  devisAcceptes: number;
  tauxConversion: number;
  chantiersActifs: number;
  [key: string]: unknown;
}

/**
 * Get period dates based on periodicite
 */
function getPeriodDates(periodicite: string): { debut: string; fin: string; label: string } {
  const now = new Date();
  let debut: Date;
  let fin: Date;
  let label: string;

  switch (periodicite) {
    case 'mensuel': {
      // Previous month
      debut = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      fin = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      label = debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      break;
    }
    case 'trimestriel': {
      // Previous quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const prevYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      debut = new Date(prevYear, prevQuarter * 3, 1);
      fin = new Date(prevYear, prevQuarter * 3 + 3, 0, 23, 59, 59);
      label = `T${prevQuarter + 1} ${prevYear}`;
      break;
    }
    case 'annuel': {
      // Previous year
      const prevYear = now.getFullYear() - 1;
      debut = new Date(prevYear, 0, 1);
      fin = new Date(prevYear, 11, 31, 23, 59, 59);
      label = `${prevYear}`;
      break;
    }
    default:
      throw new Error(`Unknown periodicite: ${periodicite}`);
  }

  return {
    debut: debut.toISOString().split('T')[0],
    fin: fin.toISOString().split('T')[0],
    label,
  };
}

/**
 * Compute basic KPIs from raw data
 */
function computeKPIs(
  devis: any[],
  depenses: any[],
  chantiers: any[],
  paiements: any[],
  debut: string,
  fin: string,
): KPIs {
  const startDate = new Date(debut);
  const endDate = new Date(fin + 'T23:59:59');

  const inRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= startDate && d <= endDate;
  };

  const CONVERTED = ['accepte', 'signe', 'facture', 'payee'];

  const devisInPeriod = devis.filter(d => inRange(d.date));
  const depensesInPeriod = depenses.filter(d => inRange(d.date));
  const paiementsInPeriod = paiements.filter(p => inRange(p.date || p.created_at));

  // CA = sum of converted devis amounts
  const ca = devisInPeriod
    .filter(d => CONVERTED.includes(d.statut))
    .reduce((s, d) => s + (d.montant_total || d.montant_ttc || 0), 0);

  // Depenses
  const totalDepenses = depensesInPeriod.reduce((s, d) => s + (d.montant || 0), 0);

  // Devis stats
  const devisEnvoyes = devisInPeriod.filter(d => d.statut !== 'brouillon').length;
  const devisAcceptes = devisInPeriod.filter(d => CONVERTED.includes(d.statut)).length;
  const tauxConversion = devisEnvoyes > 0 ? (devisAcceptes / devisEnvoyes) * 100 : 0;

  // Chantiers actifs
  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours').length;

  // Paiements reçus
  const paiementsRecus = paiementsInPeriod
    .filter(p => p.statut === 'recu' || p.statut === 'succeeded')
    .reduce((s, p) => s + (p.montant || 0), 0);

  const marge = ca - totalDepenses;
  const margePercent = ca > 0 ? (marge / ca) * 100 : 0;

  return {
    ca,
    depenses: totalDepenses,
    marge,
    margePercent,
    devisEnvoyes,
    devisAcceptes,
    tauxConversion,
    chantiersActifs,
    paiementsRecus,
  };
}

/**
 * Generate a report record and save to database
 */
async function generateReport(
  supabaseAdmin: any,
  userId: string,
  type: string,
  periodicite: string,
  config: ReportConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { debut, fin, label } = getPeriodDates(periodicite);

    // Fetch user data
    const [devisRes, depensesRes, chantiersRes, paiementsRes] = await Promise.all([
      supabaseAdmin.from('devis').select('id, date, statut, montant_total, montant_ttc, type').eq('user_id', userId),
      supabaseAdmin.from('depenses').select('id, date, montant, categorie').eq('user_id', userId),
      supabaseAdmin.from('chantiers').select('id, nom, statut, budget').eq('user_id', userId),
      supabaseAdmin.from('paiements').select('id, date, created_at, montant, statut').eq('user_id', userId),
    ]);

    const devis = devisRes.data || [];
    const depensesData = depensesRes.data || [];
    const chantiers = chantiersRes.data || [];
    const paiements = paiementsRes.data || [];

    // Compute KPIs
    const kpis = computeKPIs(devis, depensesData, chantiers, paiements, debut, fin);

    // Create report record
    const typeLabel = type === 'activite' ? "Rapport d'activité" : 'Rapport financier';
    const titre = `${typeLabel} — ${label}`;

    const { data: report, error: insertError } = await supabaseAdmin
      .from('rapports')
      .insert({
        user_id: userId,
        type,
        titre,
        periode_debut: debut,
        periode_fin: fin,
        statut: 'genere',
        auto_genere: true,
        donnees_snapshot: { kpis },
      })
      .select()
      .single();

    if (insertError) {
      console.error(`Error inserting report for user ${userId}:`, insertError);
      return { success: false, error: insertError.message };
    }

    // Send email notification if recipients configured
    if (config.destinataires?.length > 0) {
      try {
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          for (const email of config.destinataires) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'BatiGesti <rapports@batigesti.com>',
                to: [email],
                subject: `${titre} — BatiGesti`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f97316;">${titre}</h2>
                    <p>Votre rapport automatique a été généré.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b;">Chiffre d'affaires</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(kpis.ca)}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b;">Dépenses</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(kpis.depenses)}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b;">Marge</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${kpis.marge >= 0 ? '#22c55e' : '#ef4444'};">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(kpis.marge)} (${kpis.margePercent.toFixed(1)}%)</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Taux de conversion</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${kpis.tauxConversion.toFixed(1)}%</td>
                      </tr>
                    </table>
                    <p style="color: #64748b; font-size: 14px;">
                      Connectez-vous à BatiGesti pour télécharger le rapport PDF complet avec graphiques et tableaux détaillés.
                    </p>
                  </div>
                `,
              }),
            });
          }

          // Update report status to sent
          await supabaseAdmin
            .from('rapports')
            .update({
              statut: 'envoye',
              envoye_a: config.destinataires,
              envoye_le: new Date().toISOString(),
            })
            .eq('id', report.id);
        }
      } catch (emailError) {
        console.error(`Error sending report email for user ${userId}:`, emailError);
        // Don't fail the whole report generation if email fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`Error generating report for user ${userId}:`, error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { type, user_id } = body;

    // If user_id provided, generate for that user only
    if (user_id && type) {
      // Fetch config for this user
      const { data: config } = await supabaseAdmin
        .from('rapport_config')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'No config found for user' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const periodicite = type === 'activite' ? config.activite_periodicite : config.financier_periodicite;
      const result = await generateReport(supabaseAdmin, user_id, type, periodicite, config);

      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cron mode: process all active configs
    const { data: configs, error: configError } = await supabaseAdmin
      .from('rapport_config')
      .select('*')
      .or('activite_actif.eq.true,financier_actif.eq.true');

    if (configError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configs', details: configError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active report configs found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Determine which reports need generating based on periodicity and current date
    const now = new Date();
    const results: Array<{ user_id: string; type: string; success: boolean; error?: string }> = [];

    for (const config of configs) {
      // Activity report
      if (config.activite_actif) {
        const shouldGenerate = shouldGenerateReport(now, config.activite_periodicite);
        if (shouldGenerate) {
          const result = await generateReport(
            supabaseAdmin, config.user_id, 'activite',
            config.activite_periodicite, config,
          );
          results.push({ user_id: config.user_id, type: 'activite', ...result });
          // Small delay between users
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // Financial report
      if (config.financier_actif) {
        const shouldGenerate = shouldGenerateReport(now, config.financier_periodicite);
        if (shouldGenerate) {
          const result = await generateReport(
            supabaseAdmin, config.user_id, 'financier',
            config.financier_periodicite, config,
          );
          results.push({ user_id: config.user_id, type: 'financier', ...result });
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} reports`,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('generate-report error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Determine if a report should be generated based on periodicity.
 * Reports are generated on the first day of the new period:
 * - mensuel: 1st of each month
 * - trimestriel: 1st of Jan, Apr, Jul, Oct
 * - annuel: 1st of January
 */
function shouldGenerateReport(now: Date, periodicite: string): boolean {
  const day = now.getDate();
  const month = now.getMonth();

  // Only generate on the 1st of the relevant period
  // Allow 1st-3rd to account for cron timing variations
  if (day > 3) return false;

  switch (periodicite) {
    case 'mensuel':
      return true; // Every 1st of month
    case 'trimestriel':
      return month % 3 === 0; // Jan=0, Apr=3, Jul=6, Oct=9
    case 'annuel':
      return month === 0; // January only
    default:
      return false;
  }
}
