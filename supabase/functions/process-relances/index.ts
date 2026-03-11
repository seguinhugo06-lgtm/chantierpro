/**
 * process-relances — Supabase Edge Function (Cron)
 *
 * Processes automatic reminders for all organizations.
 * Runs on a schedule (e.g., every 6 hours via pg_cron or external cron).
 *
 * Logic:
 * 1. Query all entreprises with relance_config.enabled = true
 * 2. For each org: find eligible documents (unpaid invoices, unanswered devis)
 * 3. Determine next step based on config + execution history
 * 4. Send email via Resend API
 * 5. Insert into relance_executions
 *
 * Rate limiting: max 50 relances per execution, 200ms between sends.
 * Business hours: 8h-19h Europe/Paris only.
 *
 * Environment variables required:
 *   RESEND_API_KEY — Resend.com API key
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 *
 * Cron schedule: 0 *\/6 * * * (every 6 hours)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RELANCES_PER_RUN = 50;
const DELAY_BETWEEN_SENDS_MS = 200;
const BUSINESS_HOURS = { start: 8, end: 19 }; // Europe/Paris

interface RelanceConfig {
  enabled: boolean;
  devisSteps?: StepConfig[];
  factureSteps?: StepConfig[];
}

interface StepConfig {
  id: string;
  name: string;
  delay: number;
  channel: string;
  enabled: boolean;
  subject?: string;
  body?: string;
  smsBody?: string;
}

/**
 * Check if current time is within business hours (Europe/Paris)
 */
function isBusinessHours(): boolean {
  const now = new Date();
  // Get Paris time
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const hour = parisTime.getHours();
  return hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end;
}

/**
 * Calculate base date for a document (same logic as relanceUtils.js)
 */
function getBaseDate(doc: any): Date | null {
  const docType = doc.type === 'facture' ? 'facture' : 'devis';

  if (docType === 'facture') {
    if (doc.date_echeance) return new Date(doc.date_echeance);
    const docDate = doc.date_envoi || doc.date;
    if (docDate) {
      const d = new Date(docDate);
      d.setDate(d.getDate() + 30);
      return d;
    }
  } else {
    const sendDate = doc.date_envoi || doc.date;
    if (sendDate) return new Date(sendDate);
  }

  return null;
}

/**
 * Resolve template variables
 */
function resolveVariables(template: string, doc: any, client: any, entreprise: any): string {
  if (!template) return '';

  const vars: Record<string, string> = {
    client_nom: client?.nom ? `${client.prenom || ''} ${client.nom}`.trim() : 'Client',
    numero: doc?.numero || '',
    montant_ttc: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(doc?.total_ttc || 0),
    montant: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(doc?.total_ttc || 0),
    date_echeance: doc?.date_echeance ? new Date(doc.date_echeance).toLocaleDateString('fr-FR') : '',
    date_envoi: (doc?.date_envoi || doc?.date) ? new Date(doc.date_envoi || doc.date).toLocaleDateString('fr-FR') : '',
    entreprise_nom: entreprise?.nom || '',
    entreprise_telephone: entreprise?.tel || entreprise?.telephone || '',
    entreprise_email: entreprise?.email || '',
    entreprise_siret: entreprise?.siret || '',
    jours_retard: (() => {
      const base = getBaseDate(doc);
      if (!base) return '0';
      return String(Math.max(0, Math.floor((Date.now() - base.getTime()) / 86400000)));
    })(),
  };

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    result = result.replace(new RegExp(`(?<!\\{)\\{${key}\\}(?!\\})`, 'g'), value);
  }
  return result;
}

/**
 * Send email via Resend API
 */
async function sendEmailViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  trackingToken: string,
  trackBaseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Add tracking pixel
    const trackingPixel = `<img src="${trackBaseUrl}/track-relance/open/${trackingToken}" width="1" height="1" style="display:none" alt="" />`;
    const htmlWithTracking = html + trackingPixel;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: htmlWithTracking,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Resend error: ${response.status} - ${err}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Build simple HTML email wrapper
 */
function buildEmailHtml(body: string, entreprise: any, couleur = '#f97316'): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:${couleur};padding:16px 24px;">
<h1 style="margin:0;color:#ffffff;font-size:18px;">${entreprise?.nom || 'Notification'}</h1>
</td></tr>
<tr><td style="padding:24px;color:#1a1a1a;font-size:14px;line-height:1.6;">
${body.replace(/\n/g, '<br>')}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
${entreprise?.nom || ''} ${entreprise?.tel ? `· ${entreprise.tel}` : ''} ${entreprise?.email ? `· ${entreprise.email}` : ''}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check business hours
    if (!isBusinessHours()) {
      return new Response(
        JSON.stringify({ message: 'Outside business hours (8h-19h Europe/Paris)', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get all entreprises with relance enabled
    const { data: entreprises, error: entError } = await supabase
      .from('entreprise')
      .select('id, user_id, nom, email, tel, telephone, siret, adresse, relance_config')
      .not('relance_config', 'is', null);

    if (entError) {
      console.error('Error fetching entreprises:', entError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entreprises', details: entError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enabledEntreprises = (entreprises || []).filter(
      (e: any) => e.relance_config?.enabled === true
    );

    let totalProcessed = 0;
    let totalSent = 0;
    let totalErrors = 0;
    const results: any[] = [];

    for (const entreprise of enabledEntreprises) {
      if (totalProcessed >= MAX_RELANCES_PER_RUN) break;

      const config: RelanceConfig = entreprise.relance_config;
      const userId = entreprise.user_id;

      // 2. Get user's org_id (if any)
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .maybeSingle();
      const orgId = orgMember?.organization_id || null;

      // 3. Get eligible documents (sent devis + unpaid factures)
      let docsQuery = supabase
        .from('devis')
        .select('id, numero, type, statut, date, date_envoi, date_echeance, total_ttc, client_id')
        .eq('user_id', userId)
        .in('statut', ['envoye', 'vu', 'en_attente']);

      const { data: docs, error: docsError } = await docsQuery;
      if (docsError || !docs?.length) continue;

      // 4. Get existing executions for these docs
      const docIds = docs.map((d: any) => d.id);
      const { data: executions } = await supabase
        .from('relance_executions')
        .select('id, document_id, step_id, status, created_at')
        .in('document_id', docIds);

      // 5. Get exclusions
      const { data: exclusions } = await supabase
        .from('relance_exclusions')
        .select('id, scope, document_id, client_id, excluded_until')
        .eq('user_id', userId);

      // 6. Get clients for these docs
      const clientIds = [...new Set(docs.map((d: any) => d.client_id).filter(Boolean))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, nom, prenom, email, telephone, entreprise')
        .in('id', clientIds);

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));
      const execsByDoc = new Map<string, any[]>();
      for (const ex of (executions || [])) {
        if (!execsByDoc.has(ex.document_id)) execsByDoc.set(ex.document_id, []);
        execsByDoc.get(ex.document_id)!.push(ex);
      }

      // 7. Process each document
      for (const doc of docs) {
        if (totalProcessed >= MAX_RELANCES_PER_RUN) break;

        const client = clientMap.get(doc.client_id);
        if (!client?.email) continue; // Need email to send

        // Check exclusions
        const isExcluded = (exclusions || []).some((ex: any) => {
          if (ex.scope === 'document' && ex.document_id === doc.id) {
            return !ex.excluded_until || new Date(ex.excluded_until) > new Date();
          }
          if (ex.scope === 'client' && ex.client_id === doc.client_id) {
            return !ex.excluded_until || new Date(ex.excluded_until) > new Date();
          }
          return false;
        });
        if (isExcluded) continue;

        // Find next step
        const docType = doc.type === 'facture' ? 'facture' : 'devis';
        const steps = (docType === 'facture' ? config.factureSteps : config.devisSteps) || [];
        const enabledSteps = steps.filter((s: StepConfig) => s.enabled);
        if (!enabledSteps.length) continue;

        const docExecs = execsByDoc.get(doc.id) || [];
        const executedStepIds = new Set(
          docExecs
            .filter((e: any) => e.status !== 'cancelled' && e.status !== 'failed')
            .map((e: any) => e.step_id)
        );

        const baseDate = getBaseDate(doc);
        if (!baseDate) continue;

        let nextStep: StepConfig | null = null;
        for (const step of enabledSteps) {
          if (executedStepIds.has(step.id)) continue;
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + step.delay);
          if (new Date() >= dueDate) {
            nextStep = step;
            break;
          }
        }

        if (!nextStep) continue; // Not due yet or all steps done

        // 8. Send the relance
        const subject = resolveVariables(nextStep.subject || `Relance - ${doc.numero}`, doc, client, entreprise);
        const body = resolveVariables(nextStep.body || `Rappel concernant le document ${doc.numero}.`, doc, client, entreprise);
        const trackingToken = crypto.randomUUID();
        const fromEmail = entreprise.email ? `${entreprise.nom} <${entreprise.email}>` : 'noreply@batigesti.com';

        const emailHtml = buildEmailHtml(body, entreprise);

        const sendResult = await sendEmailViaResend(
          RESEND_API_KEY,
          fromEmail,
          client.email,
          subject,
          emailHtml,
          trackingToken,
          supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1'),
        );

        // 9. Record execution
        const { error: insertError } = await supabase
          .from('relance_executions')
          .insert({
            user_id: userId,
            organization_id: orgId,
            document_id: doc.id,
            document_type: docType,
            document_numero: doc.numero,
            client_id: doc.client_id,
            step_id: nextStep.id,
            step_name: nextStep.name,
            step_delay: nextStep.delay,
            sequence_type: docType,
            channel: nextStep.channel || 'email',
            status: sendResult.success ? 'sent' : 'failed',
            subject,
            body,
            tracking_token: trackingToken,
            triggered_by: 'auto',
            error_message: sendResult.error || null,
            metadata: { processedAt: new Date().toISOString() },
          });

        if (insertError) {
          console.error('Error inserting execution:', insertError);
        }

        totalProcessed++;
        if (sendResult.success) totalSent++;
        else totalErrors++;

        results.push({
          doc: doc.numero,
          client: client.nom,
          step: nextStep.name,
          success: sendResult.success,
          error: sendResult.error,
        });

        // Rate limiting
        if (totalProcessed < MAX_RELANCES_PER_RUN) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SENDS_MS));
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${totalProcessed} relances`,
        sent: totalSent,
        errors: totalErrors,
        orgs: enabledEntreprises.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('process-relances error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
