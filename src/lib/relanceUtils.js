/**
 * relanceUtils.js — Pure utility functions for the relance (reminder) system
 * No side effects, no React dependencies, no Supabase calls.
 * @module relanceUtils
 */

// ============ CONSTANTS ============

export const RELANCE_STATUS = {
  SENT: 'sent',
  FAILED: 'failed',
  OPENED: 'opened',
  CLICKED: 'clicked',
  CANCELLED: 'cancelled',
};

export const RELANCE_STATUS_LABELS = {
  sent: 'Envoyée',
  failed: 'Échouée',
  opened: 'Ouverte',
  clicked: 'Cliquée',
  cancelled: 'Annulée',
};

export const RELANCE_STATUS_COLORS = {
  sent: { bg: 'bg-blue-100', bgDark: 'bg-blue-900/30', text: 'text-blue-700', textDark: 'text-blue-300', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-100', bgDark: 'bg-red-900/30', text: 'text-red-700', textDark: 'text-red-300', dot: 'bg-red-500' },
  opened: { bg: 'bg-green-100', bgDark: 'bg-green-900/30', text: 'text-green-700', textDark: 'text-green-300', dot: 'bg-green-500' },
  clicked: { bg: 'bg-emerald-100', bgDark: 'bg-emerald-900/30', text: 'text-emerald-700', textDark: 'text-emerald-300', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-gray-100', bgDark: 'bg-gray-900/30', text: 'text-gray-500', textDark: 'text-gray-400', dot: 'bg-gray-400' },
};

export const getRelanceStatusColors = (status, isDark) => {
  const c = RELANCE_STATUS_COLORS[status] || RELANCE_STATUS_COLORS.cancelled;
  return { bg: isDark ? c.bgDark : c.bg, text: isDark ? c.textDark : c.text, dot: c.dot };
};

export const EXCLUSION_REASONS = {
  manual: 'Exclusion manuelle',
  paid: 'Payé',
  dispute: 'Litige en cours',
  arrangement: 'Arrangement de paiement',
  unsubscribe: 'Désinscription',
  vip: 'Client VIP',
};

export const CHANNEL_LABELS = {
  email: 'Email',
  sms: 'SMS',
  email_sms: 'Email + SMS',
  whatsapp: 'WhatsApp',
};

// Default penalty rate: 3x BCE rate (Art. L441-10 Code de commerce)
export const DEFAULT_PENALTY_RATE = 11.62;
// Fixed recovery indemnity (Art. D441-5 Code de commerce)
export const RECOVERY_INDEMNITY = 40;

// Default config structure
export const DEFAULT_RELANCE_CONFIG = {
  enabled: false,
  devisSteps: [],
  factureSteps: [],
};

// ============ ELIGIBILITY ============

/**
 * Checks if a document is eligible for automatic reminders.
 * @param {Object} doc - The devis/facture document
 * @param {Array} exclusions - Active exclusions list
 * @param {Object} config - The relanceConfig from entreprise
 * @returns {boolean}
 */
export function isDocumentEligible(doc, exclusions = [], config = {}) {
  if (!config.enabled) return false;
  if (!doc) return false;

  // Must be sent/pending, not paid/refused/cancelled/draft
  const validStatuts = ['envoye', 'en_attente', 'vu'];
  const statut = (doc.statut || '').toLowerCase();
  if (!validStatuts.includes(statut)) return false;

  // Must have a client
  if (!doc.client_id) return false;

  // Check document-level exclusion
  const hasDocExclusion = exclusions.some(
    ex => ex.scope === 'document' && ex.document_id === doc.id && isExclusionActive(ex)
  );
  if (hasDocExclusion) return false;

  // Check client-level exclusion
  const hasClientExclusion = exclusions.some(
    ex => ex.scope === 'client' && ex.client_id === doc.client_id && isExclusionActive(ex)
  );
  if (hasClientExclusion) return false;

  // Must have the correct sequence type
  const docType = doc.type === 'facture' ? 'facture' : 'devis';
  const steps = docType === 'facture' ? config.factureSteps : config.devisSteps;
  if (!steps || steps.length === 0) return false;

  // Must have at least one enabled step
  if (!steps.some(s => s.enabled)) return false;

  return true;
}

/**
 * Checks if an exclusion is currently active (not expired).
 */
function isExclusionActive(exclusion) {
  if (!exclusion.excluded_until) return true; // permanent
  return new Date(exclusion.excluded_until) > new Date();
}

// ============ STEP CALCULATION ============

/**
 * Determines the next reminder step for a document.
 * @param {Object} doc - The devis/facture document
 * @param {Array} executions - Previous relance_executions for this document
 * @param {Array} steps - The configured steps (devisSteps or factureSteps)
 * @returns {Object|null} { step, dueDate, daysOverdue, daysUntilDue } or null
 */
export function getNextStep(doc, executions = [], steps = []) {
  if (!doc || !steps.length) return null;

  const enabledSteps = steps.filter(s => s.enabled);
  if (!enabledSteps.length) return null;

  // Base date: for devis = date_envoi or date; for factures = date_echeance
  const baseDate = getBaseDate(doc);
  if (!baseDate) return null;

  const now = new Date();

  // Find executed step IDs
  const executedStepIds = new Set(
    executions
      .filter(e => e.status !== 'cancelled' && e.status !== 'failed')
      .map(e => e.step_id)
  );

  // Find the next step that hasn't been executed and is due
  for (const step of enabledSteps) {
    if (executedStepIds.has(step.id)) continue;

    const dueDate = addDays(baseDate, step.delay);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysOverdue = -daysUntilDue;

    return {
      step,
      dueDate,
      daysOverdue: Math.max(0, daysOverdue),
      daysUntilDue,
      isDue: now >= dueDate,
    };
  }

  return null; // All steps executed
}

/**
 * Gets the base date from which delays are calculated.
 * - Devis: date of send (date_envoi or date)
 * - Facture: date d'echeance (or date + 30 days)
 */
export function getBaseDate(doc) {
  if (!doc) return null;

  const docType = doc.type === 'facture' ? 'facture' : 'devis';

  if (docType === 'facture') {
    // Facture: delays calculated from due date
    if (doc.date_echeance) return new Date(doc.date_echeance);
    if (doc.dateEcheance) return new Date(doc.dateEcheance);
    // Fallback: date + 30 days
    const docDate = doc.date_envoi || doc.dateEnvoi || doc.date;
    if (docDate) return addDays(new Date(docDate), 30);
  } else {
    // Devis: delays calculated from send date
    const sendDate = doc.date_envoi || doc.dateEnvoi || doc.date;
    if (sendDate) return new Date(sendDate);
  }

  return null;
}

// ============ VARIABLE RESOLUTION ============

/**
 * Resolves template variables in a string.
 * Supports both {{variable}} (RelanceConfigTab) and {variable} (RelanceService) formats.
 * @param {string} template - Template string with variables
 * @param {Object} doc - Document data
 * @param {Object} client - Client data
 * @param {Object} entreprise - Company data
 * @returns {string} Resolved template
 */
export function resolveVariables(template, doc, client, entreprise) {
  if (!template) return '';

  const variables = buildVariableMap(doc, client, entreprise);

  let result = template;

  // Replace {{variable}} format (RelanceConfigTab)
  Object.entries(variables).forEach(([key, value]) => {
    const doublePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(doublePattern, value || '');
  });

  // Replace {variable} format (RelanceService) — only single braces not preceded/followed by another brace
  Object.entries(variables).forEach(([key, value]) => {
    const singlePattern = new RegExp(`(?<!\\{)\\{${key}\\}(?!\\})`, 'g');
    result = result.replace(singlePattern, value || '');
  });

  return result;
}

/**
 * Builds a map of all available variable values.
 */
function buildVariableMap(doc, client, entreprise) {
  const now = new Date();
  const baseDate = doc ? getBaseDate(doc) : null;
  const joursRetard = baseDate ? Math.max(0, Math.floor((now - baseDate) / (1000 * 60 * 60 * 24))) : 0;

  return {
    // Client
    client_nom: client?.nom || client?.prenom
      ? `${client.prenom || ''} ${client.nom || ''}`.trim()
      : 'Client',
    client_prenom: client?.prenom || '',
    // Document
    devis_numero: doc?.numero || '',
    facture_numero: doc?.numero || '',
    numero: doc?.numero || '',
    montant_ttc: formatMoneyValue(doc?.total_ttc || doc?.montant_ttc || 0),
    montant: formatMoneyValue(doc?.total_ttc || doc?.montant_ttc || doc?.total_ht || 0),
    montant_ht: formatMoneyValue(doc?.total_ht || 0),
    // Dates
    'date_échéance': doc?.date_echeance || doc?.dateEcheance
      ? formatDateFR(new Date(doc.date_echeance || doc.dateEcheance))
      : '',
    date_echeance: doc?.date_echeance || doc?.dateEcheance
      ? formatDateFR(new Date(doc.date_echeance || doc.dateEcheance))
      : '',
    date_envoi: doc?.date_envoi || doc?.dateEnvoi || doc?.date
      ? formatDateFR(new Date(doc.date_envoi || doc.dateEnvoi || doc.date))
      : '',
    date_facture: doc?.date ? formatDateFR(new Date(doc.date)) : '',
    // Retard
    jours_retard: String(joursRetard),
    // Entreprise
    entreprise_nom: entreprise?.nom || '',
    entreprise_telephone: entreprise?.tel || entreprise?.telephone || '',
    entreprise_tel: entreprise?.tel || entreprise?.telephone || '',
    entreprise_email: entreprise?.email || '',
    entreprise_siret: entreprise?.siret || '',
    entreprise_adresse: entreprise?.adresse || '',
    // Pénalités (computed)
    penalites: doc?.total_ttc
      ? formatMoneyValue(calculatePenalties(doc.total_ttc, joursRetard).penalites)
      : '0,00',
    total_du: doc?.total_ttc
      ? formatMoneyValue(calculatePenalties(doc.total_ttc, joursRetard).totalDu)
      : '0,00',
    // Lien paiement en ligne
    lien_paiement: doc?.payment_token
      ? `${typeof window !== 'undefined' ? window.location.origin : 'https://batigesti.vercel.app'}/pay/${doc.payment_token}`
      : '',
  };
}

// ============ PENALTY CALCULATION ============

/**
 * Calculates late payment penalties per French law.
 * Art. L441-10 Code de commerce (pénalités de retard)
 * Art. D441-5 Code de commerce (indemnité forfaitaire de recouvrement 40€)
 *
 * @param {number} montantTTC - Invoice amount in euros TTC
 * @param {number} joursRetard - Days overdue
 * @param {number} [tauxAnnuel] - Annual penalty rate (default: 11.62% = 3x BCE rate)
 * @returns {Object} { penalites, indemnite, totalDu, tauxApplique, joursRetard }
 */
export function calculatePenalties(montantTTC, joursRetard, tauxAnnuel = DEFAULT_PENALTY_RATE) {
  const amount = Number(montantTTC) || 0;
  const days = Math.max(0, Number(joursRetard) || 0);
  const rate = Number(tauxAnnuel) || DEFAULT_PENALTY_RATE;

  const penalites = amount * (rate / 100) * (days / 365);
  const indemnite = days > 0 ? RECOVERY_INDEMNITY : 0;
  const totalDu = amount + penalites + indemnite;

  return {
    penalites: Math.round(penalites * 100) / 100,
    indemnite,
    totalDu: Math.round(totalDu * 100) / 100,
    tauxApplique: rate,
    joursRetard: days,
  };
}

// ============ STATISTICS ============

/**
 * Builds summary statistics from relance executions.
 * @param {Array} executions - All relance_executions records
 * @param {Array} devis - All devis/facture documents
 * @returns {Object} Statistics object for StatsCard
 */
export function buildRelanceSummary(executions = [], devis = []) {
  if (!executions.length) {
    return {
      totalSent: 0,
      conversionRate: null,
      averagePaymentDelay: null,
      amountRecovered: 0,
      openRate: null,
      clickRate: null,
    };
  }

  const sentExecutions = executions.filter(e => e.status !== 'cancelled' && e.status !== 'failed');
  const totalSent = sentExecutions.length;

  // Documents that were relanced (unique document IDs)
  const relancedDocIds = new Set(sentExecutions.map(e => e.document_id));

  // Documents that are now paid/signed after being relanced
  const convertedDocs = devis.filter(d =>
    relancedDocIds.has(d.id) &&
    (d.statut === 'payee' || d.statut === 'accepte' || d.statut === 'signe')
  );

  const conversionRate = relancedDocIds.size > 0
    ? Math.round((convertedDocs.length / relancedDocIds.size) * 100)
    : null;

  // Amount recovered = sum TTC of converted docs
  const amountRecovered = convertedDocs.reduce((sum, d) => sum + (d.total_ttc || 0), 0);

  // Average payment delay = days between first relance and payment
  let totalDelay = 0;
  let delayCount = 0;
  for (const doc of convertedDocs) {
    const firstRelance = sentExecutions
      .filter(e => e.document_id === doc.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

    const paymentDate = doc.date_paiement || doc.datePaiement || doc.updatedAt;
    if (firstRelance && paymentDate) {
      const delay = Math.floor(
        (new Date(paymentDate) - new Date(firstRelance.created_at)) / (1000 * 60 * 60 * 24)
      );
      if (delay >= 0) {
        totalDelay += delay;
        delayCount++;
      }
    }
  }
  const averagePaymentDelay = delayCount > 0 ? Math.round(totalDelay / delayCount) : null;

  // Open and click rates
  const openedCount = sentExecutions.filter(e => e.status === 'opened' || e.status === 'clicked' || e.opened_at).length;
  const clickedCount = sentExecutions.filter(e => e.status === 'clicked' || e.clicked_at).length;

  return {
    totalSent,
    conversionRate,
    averagePaymentDelay,
    amountRecovered: Math.round(amountRecovered * 100) / 100,
    openRate: totalSent > 0 ? Math.round((openedCount / totalSent) * 100) : null,
    clickRate: totalSent > 0 ? Math.round((clickedCount / totalSent) * 100) : null,
  };
}

// ============ CLIENT SCORE ============

/**
 * Calculates a payment score for a client based on relance history.
 * @param {string} clientId - Client UUID
 * @param {Array} factures - All facture documents
 * @param {Array} executions - All relance_executions
 * @returns {Object} { score: 'bon'|'moyen'|'mauvais', avgDelay, relanceCount, totalFactures }
 */
export function calculateClientPaymentScore(clientId, factures = [], executions = []) {
  const clientFactures = factures.filter(
    d => d.client_id === clientId && d.type === 'facture'
  );

  if (clientFactures.length === 0) {
    return { score: 'inconnu', avgDelay: 0, relanceCount: 0, totalFactures: 0 };
  }

  const clientExecs = executions.filter(e => e.client_id === clientId);
  const relancedFactures = new Set(clientExecs.map(e => e.document_id));

  // Factures that needed relance vs total
  const relanceRate = relancedFactures.size / clientFactures.length;

  // Average payment delay for paid factures
  let totalDelay = 0;
  let delayCount = 0;
  for (const f of clientFactures) {
    if (f.statut === 'payee' && f.date_echeance) {
      const payDate = f.date_paiement || f.datePaiement || f.updatedAt;
      if (payDate) {
        const delay = Math.floor(
          (new Date(payDate) - new Date(f.date_echeance)) / (1000 * 60 * 60 * 24)
        );
        totalDelay += delay;
        delayCount++;
      }
    }
  }
  const avgDelay = delayCount > 0 ? Math.round(totalDelay / delayCount) : 0;

  let score = 'bon';
  if (relanceRate > 0.5 || avgDelay > 30) {
    score = 'mauvais';
  } else if (relanceRate > 0.2 || avgDelay > 15) {
    score = 'moyen';
  }

  return {
    score,
    avgDelay,
    relanceCount: clientExecs.length,
    totalFactures: clientFactures.length,
    relanceRate: Math.round(relanceRate * 100),
  };
}

export const CLIENT_SCORE_CONFIG = {
  bon: { label: 'Bon payeur', color: 'text-green-600', bg: 'bg-green-100', bgDark: 'bg-green-900/30', icon: '✅' },
  moyen: { label: 'Payeur moyen', color: 'text-amber-600', bg: 'bg-amber-100', bgDark: 'bg-amber-900/30', icon: '⚠️' },
  mauvais: { label: 'Payeur lent', color: 'text-red-600', bg: 'bg-red-100', bgDark: 'bg-red-900/30', icon: '🔴' },
  inconnu: { label: 'Pas de données', color: 'text-gray-500', bg: 'bg-gray-100', bgDark: 'bg-gray-800', icon: '—' },
};

export const getClientScoreBg = (score, isDark) => {
  const c = CLIENT_SCORE_CONFIG[score] || CLIENT_SCORE_CONFIG.inconnu;
  return isDark ? c.bgDark : c.bg;
};

// ============ EMAIL TEMPLATE BUILDER ============

/**
 * Wraps plain text body into responsive HTML email template.
 * @param {string} body - Resolved email body text
 * @param {Object} entreprise - Company data
 * @param {Object} [options] - Additional options
 * @returns {string} Complete HTML email
 */
export function buildRelanceEmailHtml(body, entreprise, options = {}) {
  const color = entreprise?.couleur || entreprise?.couleur_principale || '#f97316';
  const nom = entreprise?.nom || 'Votre entreprise';
  const adresse = entreprise?.adresse || '';
  const tel = entreprise?.tel || entreprise?.telephone || '';
  const email = entreprise?.email || '';
  const siret = entreprise?.siret || '';

  const ctaUrl = options.ctaUrl || '';
  const ctaLabel = options.ctaLabel || '';
  const trackingPixelUrl = options.trackingPixelUrl || '';
  const unsubscribeUrl = options.unsubscribeUrl || '';

  // Convert plain text body to HTML paragraphs
  const htmlBody = body
    .split('\n')
    .map(line => line.trim() ? `<p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(line)}</p>` : '<br/>')
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <!-- Header -->
  <tr><td style="background:${color};padding:24px 30px;text-align:center;">
    <span style="color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(nom)}</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:30px;color:#1e293b;font-size:14px;">
    ${htmlBody}
    ${ctaUrl && ctaLabel ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center">
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">${escapeHtml(ctaLabel)}</a>
    </td></tr>
    </table>` : ''}
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:20px 30px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-weight:bold;">${escapeHtml(nom)}</p>
    ${adresse ? `<p style="margin:0 0 2px;">${escapeHtml(adresse)}</p>` : ''}
    ${tel ? `<p style="margin:0 0 2px;">Tel : ${escapeHtml(tel)}</p>` : ''}
    ${email ? `<p style="margin:0 0 2px;">${escapeHtml(email)}</p>` : ''}
    ${siret ? `<p style="margin:0 0 2px;">SIRET : ${escapeHtml(siret)}</p>` : ''}
    ${unsubscribeUrl ? `<p style="margin:8px 0 0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;font-size:10px;">Ne plus recevoir de relances pour ce document</a></p>` : ''}
  </td></tr>
  ${trackingPixelUrl ? `<tr><td><img src="${escapeHtml(trackingPixelUrl)}" width="1" height="1" style="display:block;" alt="" /></td></tr>` : ''}
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ============ HELPERS ============

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateFR(date) {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoneyValue(amount) {
  if (amount == null || isNaN(amount)) return '0,00';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============ EXPORTS ============

export default {
  isDocumentEligible,
  getNextStep,
  getBaseDate,
  resolveVariables,
  calculatePenalties,
  buildRelanceSummary,
  calculateClientPaymentScore,
  buildRelanceEmailHtml,
  RELANCE_STATUS,
  RELANCE_STATUS_LABELS,
  RELANCE_STATUS_COLORS,
  EXCLUSION_REASONS,
  CHANNEL_LABELS,
  CLIENT_SCORE_CONFIG,
  DEFAULT_PENALTY_RATE,
  RECOVERY_INDEMNITY,
  DEFAULT_RELANCE_CONFIG,
};
