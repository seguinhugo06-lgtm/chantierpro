// ============================================================
// send-scheduled-relances — Relances 100% automatiques (cron)
// ============================================================
// Parcourt toutes les entreprises dont relance_config.enabled === true,
// détecte les documents dont une relance est DUE aujourd'hui, et (si activé)
// envoie l'email via la fonction send-email + journalise dans relance_executions.
//
// GARDE-FOUS :
//  - `dryRun: true`  → ne fait qu'énumérer ce qui SERAIT envoyé (aucun email).
//  - Envoi réel gaté par `relance_config.autoSend === true` PAR entreprise
//    (OFF par défaut). Tant que l'artisan n'active pas l'auto-envoi, le cron
//    ne lui envoie rien même en mode live.
//  - Requiert `cronSecret` (secret partagé CRON_SECRET) pour toute exécution.
//
// La logique de détection est un portage fidèle de src/lib/relanceUtils.js.
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const APP_ORIGIN = 'https://mallettico.fr';
const DEFAULT_PENALTY_RATE = 11.62;
const RECOVERY_INDEMNITY = 40;

// ─────────────────────────────────────────────────────────────
// Logique pure (portée de relanceUtils.js)
// ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateFR(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoneyValue(amount: number): string {
  if (amount == null || isNaN(amount)) return '0,00';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isExclusionActive(exclusion: any): boolean {
  if (!exclusion.excluded_until) return true;
  return new Date(exclusion.excluded_until) > new Date();
}

function getBaseDate(doc: any): Date | null {
  if (!doc) return null;
  const docType = doc.type === 'facture' ? 'facture' : 'devis';
  if (docType === 'facture') {
    if (doc.date_echeance) return new Date(doc.date_echeance);
    const docDate = doc.date_envoi || doc.date;
    if (docDate) return addDays(new Date(docDate), 30);
  } else {
    const sendDate = doc.date_envoi || doc.date;
    if (sendDate) return new Date(sendDate);
  }
  return null;
}

function isDocumentEligible(doc: any, exclusions: any[], config: any): boolean {
  if (!config?.enabled) return false;
  if (!doc) return false;
  const validStatuts = ['envoye', 'en_attente', 'vu'];
  const statut = (doc.statut || '').toLowerCase();
  if (!validStatuts.includes(statut)) return false;
  if (!doc.client_id) return false;
  const hasDocExclusion = exclusions.some(
    (ex) => ex.scope === 'document' && ex.document_id === doc.id && isExclusionActive(ex),
  );
  if (hasDocExclusion) return false;
  const hasClientExclusion = exclusions.some(
    (ex) => ex.scope === 'client' && ex.client_id === doc.client_id && isExclusionActive(ex),
  );
  if (hasClientExclusion) return false;
  const docType = doc.type === 'facture' ? 'facture' : 'devis';
  const steps = docType === 'facture' ? config.factureSteps : config.devisSteps;
  if (!steps || steps.length === 0) return false;
  if (!steps.some((s: any) => s.enabled)) return false;
  return true;
}

function getNextStep(doc: any, executions: any[], steps: any[]) {
  if (!doc || !steps?.length) return null;
  const enabledSteps = steps.filter((s) => s.enabled);
  if (!enabledSteps.length) return null;
  const baseDate = getBaseDate(doc);
  if (!baseDate) return null;
  const now = new Date();
  const executedStepIds = new Set(
    executions.filter((e) => e.status !== 'cancelled' && e.status !== 'failed').map((e) => e.step_id),
  );
  for (const step of enabledSteps) {
    if (executedStepIds.has(step.id)) continue;
    const dueDate = addDays(baseDate, step.delay);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      step,
      dueDate,
      daysOverdue: Math.max(0, -daysUntilDue),
      daysUntilDue,
      isDue: now >= dueDate,
    };
  }
  return null;
}

function calculatePenalties(montantTTC: number, joursRetard: number, tauxAnnuel = DEFAULT_PENALTY_RATE) {
  const amount = Number(montantTTC) || 0;
  const days = Math.max(0, Number(joursRetard) || 0);
  const rate = Number(tauxAnnuel) || DEFAULT_PENALTY_RATE;
  const penalites = amount * (rate / 100) * (days / 365);
  const indemnite = days > 0 ? RECOVERY_INDEMNITY : 0;
  return { penalites: Math.round(penalites * 100) / 100, totalDu: Math.round((amount + penalites + indemnite) * 100) / 100 };
}

function buildVariableMap(doc: any, client: any, entreprise: any) {
  const now = new Date();
  const baseDate = doc ? getBaseDate(doc) : null;
  const joursRetard = baseDate ? Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const pen = doc?.total_ttc ? calculatePenalties(doc.total_ttc, joursRetard) : { penalites: 0, totalDu: 0 };
  return {
    client_nom: (client?.nom || client?.prenom) ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'Client',
    client_prenom: client?.prenom || '',
    devis_numero: doc?.numero || '',
    facture_numero: doc?.numero || '',
    numero: doc?.numero || '',
    montant_ttc: formatMoneyValue(doc?.total_ttc || 0),
    montant: formatMoneyValue(doc?.total_ttc || doc?.total_ht || 0),
    montant_ht: formatMoneyValue(doc?.total_ht || 0),
    'date_échéance': doc?.date_echeance ? formatDateFR(new Date(doc.date_echeance)) : '',
    date_echeance: doc?.date_echeance ? formatDateFR(new Date(doc.date_echeance)) : '',
    date_envoi: (doc?.date_envoi || doc?.date) ? formatDateFR(new Date(doc.date_envoi || doc.date)) : '',
    date_facture: doc?.date ? formatDateFR(new Date(doc.date)) : '',
    jours_retard: String(joursRetard),
    entreprise_nom: entreprise?.nom || '',
    entreprise_telephone: entreprise?.tel || entreprise?.telephone || '',
    entreprise_tel: entreprise?.tel || entreprise?.telephone || '',
    entreprise_email: entreprise?.email || '',
    entreprise_siret: entreprise?.siret || '',
    entreprise_adresse: entreprise?.adresse || '',
    penalites: formatMoneyValue(pen.penalites),
    total_du: formatMoneyValue(pen.totalDu),
    lien_paiement: doc?.payment_token ? `${APP_ORIGIN}/pay/${doc.payment_token}` : '',
  } as Record<string, string>;
}

function resolveVariables(template: string, doc: any, client: any, entreprise: any): string {
  if (!template) return '';
  const variables = buildVariableMap(doc, client, entreprise);
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`(?<!\\{)\\{${key}\\}(?!\\})`, 'g'), value || '');
  }
  return result;
}

function buildRelanceEmailHtml(body: string, entreprise: any, options: any = {}): string {
  const color = entreprise?.couleur || '#f97316';
  const nom = entreprise?.nom || 'Votre entreprise';
  const adresse = entreprise?.adresse || '';
  const tel = entreprise?.tel || entreprise?.telephone || '';
  const email = entreprise?.email || '';
  const siret = entreprise?.siret || '';
  const ctaUrl = options.ctaUrl || '';
  const ctaLabel = options.ctaLabel || '';
  const htmlBody = body
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(line)}</p>` : '<br/>'))
    .join('\n');
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:${color};padding:24px 30px;text-align:center;"><span style="color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(nom)}</span></td></tr>
  <tr><td style="padding:30px;color:#1e293b;font-size:14px;">${htmlBody}
    ${ctaUrl && ctaLabel ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">${escapeHtml(ctaLabel)}</a></td></tr></table>` : ''}
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 30px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-weight:bold;">${escapeHtml(nom)}</p>
    ${adresse ? `<p style="margin:0 0 2px;">${escapeHtml(adresse)}</p>` : ''}
    ${tel ? `<p style="margin:0 0 2px;">Tel : ${escapeHtml(tel)}</p>` : ''}
    ${email ? `<p style="margin:0 0 2px;">${escapeHtml(email)}</p>` : ''}
    ${siret ? `<p style="margin:0 0 2px;">SIRET : ${escapeHtml(siret)}</p>` : ''}
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ─────────────────────────────────────────────────────────────
// Détection des relances dues pour une entreprise
// ─────────────────────────────────────────────────────────────

function detectDue(devis: any[], clients: any[], config: any, executions: any[], exclusions: any[]) {
  if (!config?.enabled) return [];
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const due: any[] = [];
  for (const doc of devis) {
    if (!isDocumentEligible(doc, exclusions, config)) continue;
    const docType = doc.type === 'facture' ? 'facture' : 'devis';
    const steps = docType === 'facture' ? config.factureSteps : config.devisSteps;
    const docExecs = executions.filter((e) => e.document_id === doc.id);
    const next = getNextStep(doc, docExecs, steps);
    if (!next || !next.isDue) continue; // le cron n'agit que sur ce qui est DÛ
    const client = clientMap.get(doc.client_id);
    if (!client) continue;
    due.push({ doc, client, step: next.step, daysOverdue: next.daysOverdue, sequenceType: docType });
  }
  return due;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // sûr par défaut : dry-run sauf demande explicite
    const cronSecret = body.cronSecret || req.headers.get('x-cron-secret') || '';
    const maxPerOrg = Math.min(Number(body.maxPerOrg) || 10, 25);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';

    // Garde-fou : secret partagé requis (protège les données clients).
    if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
      return json({ error: 'Non autorisé (cronSecret invalide).' }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // 1. Entreprises avec relances activées
    const { data: entreprises, error: entErr } = await admin
      .from('entreprise')
      .select('id, user_id, organization_id, nom, telephone, email, siret, adresse, couleur, relance_config')
      .not('relance_config', 'is', null);
    if (entErr) return json({ error: `Lecture entreprises: ${entErr.message}` }, 500);

    const report: any = {
      dryRun,
      ranAt: new Date().toISOString(),
      entreprisesScanned: entreprises?.length || 0,
      entreprisesEnabled: 0,
      entreprisesAutoSend: 0,
      totalDue: 0,
      sent: 0,
      failed: 0,
      skippedAutoSendOff: 0,
      details: [] as any[],
    };

    for (const ent of entreprises || []) {
      const config = ent.relance_config || {};
      if (!config.enabled) continue;
      report.entreprisesEnabled++;
      const autoSend = config.autoSend === true;
      if (autoSend) report.entreprisesAutoSend++;

      const entreprise = {
        nom: ent.nom, tel: ent.telephone, telephone: ent.telephone, email: ent.email,
        siret: ent.siret, adresse: ent.adresse, couleur: ent.couleur,
      };

      // 2. Charger les documents + clients + historique de cette entreprise
      const [{ data: devis }, { data: clients }, { data: executions }, { data: exclusions }] = await Promise.all([
        admin.from('devis').select('id, type, statut, numero, client_id, total_ttc, total_ht, date, date_echeance, date_envoi, payment_token').eq('user_id', ent.user_id).neq('statut', 'payee'),
        admin.from('clients').select('id, nom, prenom, email, telephone').eq('user_id', ent.user_id),
        admin.from('relance_executions').select('document_id, step_id, status').eq('user_id', ent.user_id),
        admin.from('relance_exclusions').select('scope, document_id, client_id, excluded_until').eq('user_id', ent.user_id),
      ]);

      const due = detectDue(devis || [], clients || [], config, executions || [], exclusions || []).slice(0, maxPerOrg);
      report.totalDue += due.length;

      // Diagnostic (dry-run) : montre l'entonnoir pour prouver la logique.
      if (dryRun) {
        report.diagnostics = report.diagnostics || [];
        const eligible = (devis || []).filter((d) => isDocumentEligible(d, exclusions || [], config));
        // Pour chaque éligible, calcule le prochain step (dû ou pas) — visibilité.
        const nextSteps = eligible.map((d) => {
          const st = (d.type === 'facture' ? config.factureSteps : config.devisSteps) || [];
          const ns = getNextStep(d, (executions || []).filter((e) => e.document_id === d.id), st);
          return ns ? { numero: d.numero, type: d.type, step: ns.step?.name || ns.step?.id, isDue: ns.isDue, daysUntilDue: ns.daysUntilDue } : { numero: d.numero, type: d.type, step: null };
        });
        report.diagnostics.push({
          entreprise: ent.nom,
          autoSend,
          unpaidDocs: (devis || []).length,
          eligibleDocs: eligible.length,
          devisStepsEnabled: (config.devisSteps || []).filter((s: any) => s.enabled).length,
          factureStepsEnabled: (config.factureSteps || []).filter((s: any) => s.enabled).length,
          dueNow: due.length,
          nextSteps,
        });
      }

      for (const item of due) {
        const { doc, client, step } = item;
        const detail: any = {
          entreprise: ent.nom,
          userId: ent.user_id,
          document: doc.numero,
          type: item.sequenceType,
          clientEmail: client.email || null,
          step: step.name || step.id,
          daysOverdue: item.daysOverdue,
          montantTTC: doc.total_ttc || 0,
        };

        // DRY-RUN ou auto-envoi désactivé : on énumère sans envoyer.
        if (dryRun) { detail.action = 'would-send'; report.details.push(detail); continue; }
        if (!autoSend) { detail.action = 'skipped-autosend-off'; report.skippedAutoSendOff++; report.details.push(detail); continue; }
        if (!client.email) { detail.action = 'skipped-no-email'; report.details.push(detail); continue; }

        // 3. Envoi réel
        const resolvedBody = resolveVariables(step.template || '', doc, client, entreprise);
        const resolvedSubject = resolveVariables(
          step.objet_email || `Relance : ${item.sequenceType === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`,
          doc, client, entreprise,
        );
        const htmlEmail = buildRelanceEmailHtml(resolvedBody, entreprise, {
          ctaLabel: item.sequenceType === 'facture' ? 'Voir la facture' : 'Consulter le devis',
        });

        let ok = false; let errMsg: string | null = null; let providerId: string | null = null;
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify({ action: 'send_email', to: client.email, subject: resolvedSubject, html: htmlEmail, from_name: ent.nom || undefined, reply_to: ent.email || undefined }),
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok || data?.error) throw new Error(data?.error || `send-email HTTP ${resp.status}`);
          ok = true; providerId = data?.id || data?.messageId || null;
        } catch (e) {
          errMsg = String(e?.message || e);
        }

        // 4. Journaliser l'exécution
        await admin.from('relance_executions').insert({
          user_id: ent.user_id,
          organization_id: ent.organization_id,
          document_id: doc.id,
          document_type: item.sequenceType,
          document_numero: doc.numero,
          client_id: client.id,
          step_id: step.id,
          step_name: step.name,
          step_delay: step.delay,
          sequence_type: item.sequenceType,
          channel: 'email',
          status: ok ? 'sent' : 'failed',
          subject: resolvedSubject,
          body: resolvedBody,
          tracking_token: crypto.randomUUID(),
          triggered_by: 'auto_cron',
          error_message: errMsg,
          metadata: { email_provider_id: providerId },
        });
        if (ok) {
          await admin.from('devis').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', doc.id);
          report.sent++;
        } else {
          report.failed++;
        }
        detail.action = ok ? 'sent' : 'failed';
        detail.error = errMsg;
        report.details.push(detail);

        // Rate-limit léger entre 2 envois
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return json(report);
  } catch (error) {
    console.error('[send-scheduled-relances] Error:', error);
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
