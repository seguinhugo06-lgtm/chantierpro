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
// Reste dû, pénalités (professionnels seulement), documents à ne jamais relancer : règles sans import
// distant, testées sous vitest (src/lib/__tests__/reglesRelances.test.js).
import { estClientPro, creditsParFacture, paiementsParDocument, resteDu, relancable, penalites, mentionRetard } from './regles.ts';
// Rappels du prochain ramonage (migration 104, D-30) : règles et e-mail sans import distant, testés sous vitest
import { rappelsAEnvoyer, emailRappelRamonage, jourParis } from './ramonage.ts';
import { nomImprime } from '../_shared/identite.ts';
// Adresse complète sans répéter « code postal ville » (Paramètres l'enregistre en trois champs depuis le 26 oct. 2026)
import { adresseComplete } from '../_shared/adresseEntreprise.ts';

const APP_ORIGIN = 'https://mallettico.fr';
// Paiement en ligne des factures masqué en v1 (décision D-21, FONCTIONS.paiementEnLigne côté app) : aucun lien
// /pay/… dans les relances automatiques
const PAIEMENT_EN_LIGNE = false;

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

// ATTENTION : il n'existe AUCUNE colonne `date_envoi` sur la table `devis`
// (colonnes réelles : date, date_echeance, date_paiement, date_validite,
// last_reminder_sent_at, notification_sent_at, signature_date). La demander
// dans un `.select()` fait rejeter la requête ENTIÈRE par PostgREST — c'est ce
// qui rendait le cron muet : `devis` revenait null, donc « 0 relance due ».
// La date de référence est donc `date` (le document), comme côté navigateur.
function getBaseDate(doc: any): Date | null {
  if (!doc) return null;
  const docType = doc.type === 'facture' ? 'facture' : 'devis';
  if (docType === 'facture') {
    if (doc.date_echeance) return new Date(doc.date_echeance);
    if (doc.date) return addDays(new Date(doc.date), 30);
  } else {
    if (doc.date) return new Date(doc.date);
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

function buildVariableMap(doc: any, client: any, entreprise: any) {
  const now = new Date();
  const baseDate = doc ? getBaseDate(doc) : null;
  const joursRetard = baseDate ? Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  // Ce qui est réellement dû (posé par detectDue : total − paiements − avoirs) ; pénalités et 40 € pour
  // un client professionnel seulement (art. L441-10 et D441-5 C. com.), sur ce reste dû.
  const du = typeof doc?._resteDu === 'number' ? doc._resteDu : (Number(doc?.total_ttc) || 0);
  const pro = estClientPro(client);
  // Taux réglé par l'artisan (Paramètres, settings_json.reglages) sinon le taux légal du semestre
  const pen = penalites(du, joursRetard, pro, Number(entreprise?.tauxPenalites) || undefined);
  const estFacture = doc?.type === 'facture';
  return {
    client_nom: (client?.nom || client?.prenom) ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'Client',
    client_prenom: client?.prenom || '',
    devis_numero: doc?.numero || '',
    facture_numero: doc?.numero || '',
    numero: doc?.numero || '',
    // Facture : le reste dû (les modèles enregistrés écrivent « {{montant_ttc}} »)
    montant_ttc: formatMoneyValue(estFacture ? du : (doc?.total_ttc || 0)),
    total_facture: formatMoneyValue(doc?.total_ttc || 0),
    montant: formatMoneyValue(du),
    reste_du: formatMoneyValue(du),
    montant_ht: formatMoneyValue(doc?.total_ht || 0),
    'date_échéance': doc?.date_echeance ? formatDateFR(new Date(doc.date_echeance)) : '',
    date_echeance: doc?.date_echeance ? formatDateFR(new Date(doc.date_echeance)) : '',
    date_envoi: doc?.date ? formatDateFR(new Date(doc.date)) : '',
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
    mention_retard: mentionRetard(pro),
    lien_paiement: PAIEMENT_EN_LIGNE && doc?.payment_token ? `${APP_ORIGIN}/pay/${doc.payment_token}` : '',
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
  // Même règle que l'app (relanceUtils.js) : une variable vide seule sur sa ligne ne laisse pas de trou
  return result.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n');
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

function detectDue(devis: any[], clients: any[], config: any, executions: any[], exclusions: any[], paiements: any[] = [], avoirs: any[] = []) {
  if (!config?.enabled) return [];
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const credits = creditsParFacture(avoirs.length ? avoirs : devis);
  const recus = paiementsParDocument(paiements);
  const due: any[] = [];
  for (const doc of devis) {
    if (!isDocumentEligible(doc, exclusions, config)) continue;
    // Jamais un avoir, jamais une facture soldée (payée ou créditée) ; on relance le reste dû
    if (!relancable(doc, credits, recus)) continue;
    doc._resteDu = resteDu(doc, credits, recus);
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

  const debutMs = Date.now();
  let adminPourJournal: any = null;
  let dryRunPourJournal = true;

  // Journal d'exécution — une ligne par passage du cron, succès comme échec.
  // Sans elle, un cron muet (timeout pg_net, 401, erreur SQL) peut échouer des
  // semaines sans le moindre signal : c'est exactement ce qui s'est produit
  // entre le 22 et le 30 juil. 2026.
  const journaliser = async (champs: Record<string, unknown>) => {
    if (!adminPourJournal) return;
    try {
      // supabase-js NE LÈVE PAS sur une erreur PostgREST : il la renvoie dans
      // `error`. Un simple try/catch ne verrait donc jamais un échec d'écriture
      // — et ce journal, fait pour supprimer les pannes muettes, serait muet.
      const { error } = await adminPourJournal.from('relance_cron_runs').insert({
        dry_run: dryRunPourJournal,
        duration_ms: Date.now() - debutMs,
        ...champs,
      });
      if (error) console.error('[send-scheduled-relances] Journal refusé:', error.message);
    } catch (e) {
      console.error('[send-scheduled-relances] Journal impossible:', e);
    }
  };

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // sûr par défaut : dry-run sauf demande explicite
    dryRunPourJournal = dryRun;
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
    adminPourJournal = admin;

    // 1. Entreprises avec relances activées
    const { data: entreprises, error: entErr } = await admin
      .from('entreprise')
      .select('id, user_id, organization_id, nom, telephone, email, siret, adresse, couleur, relance_config, settings_json')
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
        tauxPenalites: ent.settings_json?.reglages?.tauxPenalites,
      };

      // 2. Charger les documents + clients + historique de cette entreprise
      // Limité à l'organisation de l'entreprise : les policies « Org members can insert » laissent un compte
      // écrire une ligne au user_id d'un artisan dans SA propre organisation (relecture sécurité du 10 oct.
      // 2026) — une facture, un client, un avoir ou un paiement fabriqués ne doivent ni être relancés ni compter.
      const dansOrg = (requete: any) => (ent.organization_id ? requete.eq('organization_id', ent.organization_id) : requete);
      const [resDevis, resClients, resExecs, resExcl, resPaiements, resAvoirs] = await Promise.all([
        dansOrg(admin.from('devis').select('id, type, facture_type, statut, numero, client_id, total_ttc, total_ht, montant_paye, avoir_source_id, date, date_echeance, payment_token').eq('user_id', ent.user_id).neq('statut', 'payee')),
        dansOrg(admin.from('clients').select('id, nom, prenom, email, telephone, categorie, entreprise').eq('user_id', ent.user_id)),
        admin.from('relance_executions').select('document_id, step_id, status').eq('user_id', ent.user_id),
        admin.from('relance_exclusions').select('scope, document_id, client_id, excluded_until').eq('user_id', ent.user_id),
        // Paiements de toute l'organisation (un salarié peut encaisser ou corriger), comme le montant encaissé
        // que la base tient (098) ; sans organisation, ceux du compte
        ent.organization_id
          ? admin.from('paiements').select('devis_id, montant').eq('organization_id', ent.organization_id)
          : admin.from('paiements').select('devis_id, montant').eq('user_id', ent.user_id),
        // Les avoirs quel que soit leur statut : un avoir « appliqué » est `payee`, exclu de la requête ci-dessus
        dansOrg(admin.from('devis').select('id, facture_type, statut, total_ttc, avoir_source_id').eq('user_id', ent.user_id).eq('facture_type', 'avoir')),
      ]);

      // Ces erreurs étaient ignorées : une colonne inexistante dans le select
      // fait rejeter TOUTE la requête, `data` revient null, et le rapport
      // annonçait sereinement « 0 relance due ». Un échec de lecture doit
      // être bruyant — sinon l'artisan croit que ses clients sont relancés.
      const erreurLecture = [resDevis, resClients, resExecs, resExcl, resPaiements, resAvoirs]
        .map((r) => r.error?.message).filter(Boolean).join(' | ');
      if (erreurLecture) {
        console.error(`[send-scheduled-relances] Lecture ${ent.nom}: ${erreurLecture}`);
        report.details.push({ entreprise: ent.nom, action: 'erreur-lecture', error: erreurLecture });
        report.failed++;
        continue;
      }

      const devis = resDevis.data, clients = resClients.data;
      const executions = resExecs.data, exclusions = resExcl.data;

      const due = detectDue(devis || [], clients || [], config, executions || [], exclusions || [], resPaiements.data || [], resAvoirs.data || []).slice(0, maxPerOrg);
      report.totalDue += due.length;

      // Diagnostic (dry-run) : montre l'entonnoir pour prouver la logique.
      if (dryRun) {
        report.diagnostics = report.diagnostics || [];
        const creditsDiag = creditsParFacture(resAvoirs.data || []);
        const recusDiag = paiementsParDocument(resPaiements.data || []);
        const eligible = (devis || []).filter((d) => isDocumentEligible(d, exclusions || [], config) && relancable(d, creditsDiag, recusDiag));
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
          resteDu: doc._resteDu,
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

        // 4. Journaliser l'exécution.
        //    CRITIQUE : l'email est déjà parti. Si cette écriture échoue, aucune
        //    trace n'existe — `getNextStep` croira l'étape jamais faite et la
        //    relance repartira demain, puis chaque jour. On ne peut pas annuler
        //    l'envoi, mais l'échec doit être visible plutôt que muet.
        const { error: errJournal } = await admin.from('relance_executions').insert({
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
        if (errJournal) {
          console.error(`[send-scheduled-relances] JOURNAL PERDU pour ${doc.numero} (email ${ok ? 'ENVOYÉ' : 'échoué'}) : ${errJournal.message}`);
          detail.journalPerdu = errJournal.message;
          report.journalPerdu = (report.journalPerdu || 0) + 1;
        }

        if (ok) {
          const { error: errMaj } = await admin.from('devis')
            .update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', doc.id);
          if (errMaj) console.error(`[send-scheduled-relances] maj last_reminder_sent_at ${doc.numero}: ${errMaj.message}`);
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

    // ─────────────────────────────────────────────────────────────
    // Rappels du prochain ramonage (D-30) : seulement pour une fiche entreprise dont l'artisan a activé l'envoi
    // automatique (Paramètres → Ramonage). Un rappel est « pris » en base AVANT l'envoi (rappel_fait_le posé si vide) :
    // deux passages simultanés ne l'envoient pas deux fois ; un envoi en échec le rend (repris le lendemain).
    // Les envois et les échecs comptent dans sent / failed : l'alerte quotidienne (088) les voit.
    // ─────────────────────────────────────────────────────────────
    const ramonage: any = { entreprises: 0, dus: 0, envoyes: 0, echecs: 0, details: [] as any[] };
    report.ramonage = ramonage;
    const { data: entsRamonage, error: errEntsRamonage } = await admin
      .from('entreprise')
      .select('id, user_id, organization_id, nom, forme_juridique, telephone, email, adresse, code_postal, ville, couleur, settings_json, archived_at')
      .eq('settings_json->reglages->>ramonageEnvoiAuto', 'true');
    if (errEntsRamonage) {
      console.error(`[send-scheduled-relances] Lecture entreprises (ramonage): ${errEntsRamonage.message}`);
      ramonage.erreur = errEntsRamonage.message;
      report.failed++;
    }
    const organisationsVues = new Set<string>();
    const aujourdhui = jourParis();
    for (const ent of entsRamonage || []) {
      if (ent.archived_at) continue;
      const reglages = ent.settings_json?.reglages || {};
      if (reglages.ramonageActif !== true && reglages.ramonageActif !== 'true') continue;
      // Le client doit pouvoir répondre à l'artisan (STOP, rendez-vous) : pas d'envoi sans e-mail sur la fiche entreprise
      // (relecture juriste-btp du 24 oct. 2026 ; sinon la réponse partirait vers noreply@)
      if (!String(ent.email || '').includes('@')) {
        ramonage.details.push({ entreprise: ent.nom, action: 'sans-email-entreprise' });
        continue;
      }
      const serie = ent.organization_id || ent.user_id;
      if (organisationsVues.has(serie)) continue; // une organisation à plusieurs fiches : une seule fois
      organisationsVues.add(serie);
      ramonage.entreprises++;

      const dansOrgR = (requete: any) => (ent.organization_id ? requete.eq('organization_id', ent.organization_id) : requete.eq('user_id', ent.user_id));
      // Lecture complète, page par page : PostgREST s'arrête à 1 000 lignes, et une liste tronquée ferait prendre un
      // ancien passage pour le dernier (relecture verificateur du 24 oct. 2026). Seules les échéances à venir comptent
      // (pas d'e-mail après la date) : un passage plus récent du même appareil a une échéance plus tardive, il est lu aussi.
      const toutLire = async (fabrique: (de: number, a: number) => any) => {
        const lignes: any[] = [];
        for (let de = 0; ; de += 1000) {
          const { data, error } = await fabrique(de, de + 999);
          if (error) return { data: null, error };
          lignes.push(...(data || []));
          if (!data || data.length < 1000) return { data: lignes, error: null };
        }
      };
      const [resR, resC] = await Promise.all([
        toutLire((de, a) => dansOrgR(admin.from('ramonages')
          .select('id, client_id, appareil_ref, realise_le, prochain_avant, appareil_type, localisation, annulee_le, rappel_fait_le, jeton_rappel')
          .is('annulee_le', null).gte('prochain_avant', aujourdhui)).order('id').range(de, a)),
        toutLire((de, a) => dansOrgR(admin.from('clients').select('id, nom, prenom, email, rappels_refuses_le')).order('id').range(de, a)),
      ]);
      if (resR.error || resC.error) {
        const msg = [resR.error?.message, resC.error?.message].filter(Boolean).join(' | ');
        console.error(`[send-scheduled-relances] Lecture ramonages ${ent.nom}: ${msg}`);
        ramonage.details.push({ entreprise: ent.nom, action: 'erreur-lecture', error: msg });
        ramonage.echecs++;
        report.failed++;
        continue;
      }
      const jours = Math.min(120, Math.max(1, Math.round(Number(reglages.ramonageRappelJours) || 30)));
      const dus = rappelsAEnvoyer(resR.data || [], resC.data || [], { jours, aujourdhui }).slice(0, maxPerOrg);
      ramonage.dus += dus.length;
      report.totalDue += dus.length;
      const identite = {
        nom: nomImprime({ nom: ent.nom, forme_juridique: ent.forme_juridique, nomEntrepreneur: reglages.nomEntrepreneur }),
        adresse: adresseComplete(ent).split('\n').join(', '),
        telephone: ent.telephone,
        email: ent.email,
        couleur: ent.couleur,
      };

      for (const { ramonage: r, client } of dus) {
        const detail: any = { entreprise: ent.nom, ramonage: r.id, prochain: r.prochain_avant, clientEmail: client.email };
        if (dryRun) { detail.action = 'would-send'; ramonage.details.push(detail); continue; }

        // 1. Prendre le rappel (si personne ne l'a fait entre-temps : SMS de l'artisan, autre passage)
        const pris = await admin.from('ramonages').update({ rappel_fait_le: new Date().toISOString(), rappel_canal: 'email_auto' })
          .eq('id', r.id).is('rappel_fait_le', null).select('id');
        if (pris.error || !pris.data?.length) {
          detail.action = pris.error ? 'erreur-prise' : 'deja-fait';
          if (pris.error) { detail.error = pris.error.message; ramonage.echecs++; report.failed++; }
          ramonage.details.push(detail);
          continue;
        }

        // 2. Envoyer
        const { objet, html, texte } = emailRappelRamonage({ entreprise: identite, client, ramonage: r, lien: `${APP_ORIGIN}/rappel-ramonage/${r.jeton_rappel}` });
        let ok = false; let errMsg: string | null = null; let providerId: string | null = null;
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify({ action: 'send_email', to: client.email, subject: objet, html, text: texte, from_name: identite.nom || undefined, reply_to: ent.email || undefined }),
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok || data?.error) throw new Error(data?.error || `send-email HTTP ${resp.status}`);
          ok = true; providerId = data?.id || data?.messageId || null;
        } catch (e) {
          errMsg = String((e as Error)?.message || e);
        }

        // 3. Envoi en échec : le rappel est rendu (repris au prochain passage)
        if (!ok) {
          const rendu = await admin.from('ramonages').update({ rappel_fait_le: null, rappel_canal: null }).eq('id', r.id).select('id');
          if (rendu.error || !rendu.data?.length) {
            console.error(`[send-scheduled-relances] RAPPEL RAMONAGE ${r.id} marqué fait sans envoi : ${rendu.error?.message || '0 ligne'}`);
            detail.rappelPerdu = true;
          }
        }

        // 4. Journal (même table que les relances)
        const { error: errJournal } = await admin.from('relance_executions').insert({
          user_id: ent.user_id,
          organization_id: ent.organization_id,
          document_id: r.id,
          document_type: 'ramonage',
          client_id: client.id,
          step_id: 'rappel-ramonage',
          step_name: 'Rappel du prochain ramonage',
          sequence_type: 'ramonage',
          channel: 'email',
          status: ok ? 'sent' : 'failed',
          subject: objet,
          body: texte,
          triggered_by: 'auto_cron',
          error_message: errMsg,
          metadata: { email_provider_id: providerId, prochain_avant: r.prochain_avant },
        });
        if (errJournal) console.error(`[send-scheduled-relances] Journal du rappel de ramonage ${r.id} perdu : ${errJournal.message}`);

        if (ok) { ramonage.envoyes++; report.sent++; } else { ramonage.echecs++; report.failed++; }
        detail.action = ok ? 'sent' : 'failed';
        detail.error = errMsg;
        ramonage.details.push(detail);
        await new Promise((res) => setTimeout(res, 200));
      }
    }

    await journaliser({
      entreprises_scanned: report.entreprisesScanned,
      entreprises_enabled: report.entreprisesEnabled,
      entreprises_auto_send: report.entreprisesAutoSend,
      total_due: report.totalDue,
      sent: report.sent,
      failed: report.failed,
      skipped_autosend_off: report.skippedAutoSendOff,
    });

    return json(report);
  } catch (error) {
    console.error('[send-scheduled-relances] Error:', error);
    await journaliser({ error: (error as Error).message || 'Erreur interne' });
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
