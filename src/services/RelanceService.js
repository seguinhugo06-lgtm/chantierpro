/**
 * RelanceService - Automatic invoice reminder system
 * Critical for cash flow management - Jean-Marc's #1 pain point
 *
 * Reminder schedule:
 * - J+7: Friendly reminder (email)
 * - J+15: Firm reminder (email + SMS option)
 * - J+30: Urgent reminder (email + phone call suggested)
 * - J+45: Final notice before legal action
 * - J+60: Pre-contentieux warning
 */

// Reminder templates in French
export const RELANCE_TEMPLATES = {
  friendly: {
    id: 'friendly',
    name: 'Rappel amical',
    delay: 7,
    subject: 'Rappel - Facture {numero} en attente',
    body: `Bonjour {client_nom},

J'espere que vous allez bien.

Je me permets de vous rappeler que la facture {numero} d'un montant de {montant} EUR TTC, emise le {date_facture}, arrive a echeance.

Pour votre commodite, vous trouverez ci-joint une copie de la facture.

Merci de proceder au reglement dans les meilleurs delais.

Bien cordialement,
{entreprise_nom}
{entreprise_telephone}`,
    sms: null,
    priority: 'low'
  },

  firm: {
    id: 'firm',
    name: 'Rappel ferme',
    delay: 15,
    subject: 'Second rappel - Facture {numero} echue',
    body: `Bonjour {client_nom},

Sauf erreur de notre part, nous n'avons pas encore recu le reglement de la facture {numero} d'un montant de {montant} EUR TTC, echue depuis le {date_echeance}.

Nous vous remercions de bien vouloir proceder au reglement sous 8 jours.

En cas de difficulte, n'hesitez pas a nous contacter pour trouver une solution ensemble.

Cordialement,
{entreprise_nom}
{entreprise_telephone}`,
    sms: 'Rappel: Facture {numero} de {montant}EUR echue. Merci de regulariser. {entreprise_nom}',
    priority: 'medium'
  },

  urgent: {
    id: 'urgent',
    name: 'Rappel urgent',
    delay: 30,
    subject: 'URGENT - Facture {numero} impayee depuis 30 jours',
    body: `Bonjour {client_nom},

Malgre nos precedents rappels, la facture {numero} d'un montant de {montant} EUR TTC reste impayee a ce jour.

Cette situation nous cause un prejudice financier important.

Nous vous demandons de proceder au reglement immediat ou de nous contacter sous 48h pour convenir d'un echeancier.

A defaut de reponse, nous serons contraints d'engager des demarches de recouvrement.

{entreprise_nom}
{entreprise_telephone}`,
    sms: 'URGENT: Facture {numero} impayee depuis 30j. Reglement immediat requis. Contactez-nous: {entreprise_telephone}',
    priority: 'high'
  },

  final: {
    id: 'final',
    name: 'Mise en demeure',
    delay: 45,
    subject: 'MISE EN DEMEURE - Facture {numero}',
    body: `{client_nom},

Par la presente, nous vous mettons en demeure de regler sous 8 jours la facture {numero} d'un montant de {montant} EUR TTC, impayee depuis {jours_retard} jours.

Passe ce delai, et sans reglement de votre part, nous transmettrons le dossier a notre service contentieux, ce qui entrainera des frais supplementaires a votre charge (interets de retard, frais de recouvrement, etc.).

Veuillez agreer, {client_nom}, l'expression de nos salutations distinguees.

{entreprise_nom}
SIRET: {entreprise_siret}`,
    sms: null,
    priority: 'critical'
  },

  precontentieux: {
    id: 'precontentieux',
    name: 'Pre-contentieux',
    delay: 60,
    subject: 'DERNIER AVIS AVANT CONTENTIEUX - Facture {numero}',
    body: `{client_nom},

Dernier avis avant transmission au contentieux.

La facture {numero} de {montant} EUR TTC reste impayee malgre nos multiples relances.

Sans reglement sous 48h, le dossier sera transmis a notre cabinet de recouvrement/avocat.

{entreprise_nom}`,
    sms: 'DERNIER AVIS: Facture {numero}. Transmission contentieux sous 48h sans reglement. {entreprise_telephone}',
    priority: 'critical'
  }
};

/**
 * Calculate which reminder should be sent for a given invoice
 * @param {Object} facture - Invoice object
 * @param {Array} relancesEnvoyees - Already sent reminders
 * @returns {Object|null} Next reminder to send or null
 */
export function getNextRelance(facture, relancesEnvoyees = []) {
  if (!facture || facture.statut === 'payee') return null;

  const now = new Date();
  const dateFacture = new Date(facture.date);
  const dateEcheance = facture.date_echeance
    ? new Date(facture.date_echeance)
    : new Date(dateFacture.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  const joursRetard = Math.floor((now - dateEcheance) / (1000 * 60 * 60 * 24));

  if (joursRetard < 0) return null; // Not yet due

  // Find the appropriate template based on days overdue
  // Sort templates by delay descending to find the highest matching one first
  const templates = Object.values(RELANCE_TEMPLATES).sort((a, b) => b.delay - a.delay);
  const sentIds = new Set(relancesEnvoyees.map(r => r.templateId));

  for (const template of templates) {
    if (joursRetard >= template.delay && !sentIds.has(template.id)) {
      return {
        template,
        joursRetard,
        dateEcheance
      };
    }
  }

  return null;
}

/**
 * Generate reminder content from template
 * @param {Object} template - Reminder template
 * @param {Object} facture - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company settings
 * @returns {Object} Generated content { subject, body, sms }
 */
export function generateRelanceContent(template, facture, client, entreprise) {
  const replacements = {
    '{numero}': facture.numero || 'N/A',
    '{montant}': (facture.total_ttc || 0).toLocaleString('fr-FR'),
    '{date_facture}': facture.date
      ? new Date(facture.date).toLocaleDateString('fr-FR')
      : 'N/A',
    '{date_echeance}': facture.date_echeance
      ? new Date(facture.date_echeance).toLocaleDateString('fr-FR')
      : 'N/A',
    '{jours_retard}': Math.floor(
      (new Date() - new Date(facture.date_echeance || facture.date)) /
        (1000 * 60 * 60 * 24)
    ),
    '{client_nom}': client?.nom || 'Client',
    '{client_email}': client?.email || '',
    '{client_telephone}': client?.telephone || '',
    '{entreprise_nom}': entreprise?.nom || 'Notre entreprise',
    '{entreprise_telephone}': entreprise?.telephone || '',
    '{entreprise_email}': entreprise?.email || '',
    '{entreprise_siret}': entreprise?.siret || '',
    '{entreprise_adresse}': entreprise?.adresse || ''
  };

  let subject = template.subject;
  let body = template.body;
  let sms = template.sms;

  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
    if (sms) sms = sms.replace(regex, value);
  });

  return { subject, body, sms };
}

/**
 * Get all pending reminders for a list of invoices
 * @param {Array} factures - List of invoices
 * @param {Array} clients - List of clients
 * @param {Object} relanceHistory - Map of factureId -> sent reminders
 * @returns {Array} List of pending reminders sorted by priority
 */
export function getPendingRelances(factures, clients, relanceHistory = {}) {
  const pending = [];

  factures.forEach(facture => {
    if (facture.type !== 'facture' || facture.statut === 'payee') return;

    const client = clients.find(c => c.id === facture.client_id);
    const sentRelances = relanceHistory[facture.id] || [];
    const nextRelance = getNextRelance(facture, sentRelances);

    if (nextRelance) {
      pending.push({
        facture,
        client,
        ...nextRelance
      });
    }
  });

  // Sort by priority (critical first)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return pending.sort(
    (a, b) =>
      priorityOrder[a.template.priority] - priorityOrder[b.template.priority]
  );
}

/**
 * Format a reminder for display
 * @param {Object} relance - Reminder object from getPendingRelances
 * @param {Object} entreprise - Company settings
 * @returns {Object} Formatted reminder for UI
 */
export function formatRelanceForDisplay(relance, entreprise) {
  const { facture, client, template, joursRetard } = relance;
  const content = generateRelanceContent(template, facture, client, entreprise);

  return {
    id: `relance-${facture.id}-${template.id}`,
    factureId: facture.id,
    factureNumero: facture.numero,
    clientNom: client?.nom || 'Client inconnu',
    clientEmail: client?.email,
    clientTelephone: client?.telephone,
    montant: facture.total_ttc,
    joursRetard,
    priority: template.priority,
    templateId: template.id,
    templateName: template.name,
    subject: content.subject,
    body: content.body,
    sms: content.sms,
    canSendEmail: !!client?.email,
    canSendSMS: !!client?.telephone && !!content.sms
  };
}

/**
 * Create a relance record to track sent reminders
 * @param {string} factureId - Invoice ID
 * @param {string} templateId - Template ID used
 * @param {string} method - 'email' | 'sms' | 'phone'
 * @returns {Object} Relance record
 */
export function createRelanceRecord(factureId, templateId, method) {
  return {
    id: `${factureId}-${templateId}-${Date.now()}`,
    factureId,
    templateId,
    method,
    date: new Date().toISOString(),
    status: 'sent'
  };
}

/**
 * Hook-compatible function to get relance stats
 * @param {Array} factures - List of invoices
 * @param {Object} relanceHistory - Sent reminders history
 * @returns {Object} Stats { total, critical, high, medium, low, totalAmount }
 */
export function getRelanceStats(factures, relanceHistory = {}) {
  const pending = getPendingRelances(factures, [], relanceHistory);

  return {
    total: pending.length,
    critical: pending.filter(r => r.template.priority === 'critical').length,
    high: pending.filter(r => r.template.priority === 'high').length,
    medium: pending.filter(r => r.template.priority === 'medium').length,
    low: pending.filter(r => r.template.priority === 'low').length,
    totalAmount: pending.reduce((sum, r) => sum + (r.facture.total_ttc || 0), 0)
  };
}

export default {
  RELANCE_TEMPLATES,
  getNextRelance,
  generateRelanceContent,
  getPendingRelances,
  formatRelanceForDisplay,
  createRelanceRecord,
  getRelanceStats
};
