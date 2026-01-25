/**
 * Email Template Renderer
 * Renders HTML email templates with variable substitution
 *
 * @module emailRenderer
 */

// Import email templates as raw strings (for client-side)
// For server-side (Edge Functions), use file system

/**
 * Email template definitions with their required variables
 * @type {Object.<string, {subject: string, variables: string[]}>}
 */
export const EMAIL_TEMPLATES = {
  'devis-envoye': {
    subject: 'Votre devis #{{devis_number}} est pret',
    variables: [
      'client_name',
      'devis_number',
      'amount',
      'description',
      'validity_days',
      'action_url',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
  'devis-accepte': {
    subject: 'Merci ! Votre devis #{{devis_number}} est accepte',
    variables: [
      'client_name',
      'devis_number',
      'amount',
      'accepted_date',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
  'chantier-demarre': {
    subject: 'Votre chantier "{{chantier_name}}" demarre !',
    variables: [
      'client_name',
      'chantier_name',
      'chantier_address',
      'start_date',
      'start_time',
      'estimated_duration',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
  'chantier-termine': {
    subject: 'Travaux termines - {{chantier_name}}',
    variables: [
      'client_name',
      'chantier_name',
      'start_date',
      'end_date',
      'photo_count',
      'photos_url',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
  'facture-envoyee': {
    subject: 'Facture #{{facture_number}} - {{amount}}',
    variables: [
      'client_name',
      'facture_number',
      'amount',
      'issue_date',
      'due_date',
      'reference',
      'payment_url',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
  'paiement-recu': {
    subject: 'Paiement recu - Facture #{{facture_number}}',
    variables: [
      'client_name',
      'facture_number',
      'amount',
      'payment_date',
      'payment_method',
      'transaction_id',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
  'photos-update': {
    subject: '{{new_photo_count}} nouvelles photos - {{chantier_name}}',
    variables: [
      'client_name',
      'chantier_name',
      'new_photo_count',
      'total_photo_count',
      'upload_date',
      'photos_url',
      'portal_url',
      'artisan_name',
      'artisan_phone',
      'artisan_email',
      'year',
    ],
  },
};

/**
 * Replace template variables with actual values
 * Supports {{variable}} syntax
 *
 * @param {string} template - HTML template string
 * @param {Record<string, string|number>} variables - Key-value pairs for replacement
 * @returns {string} - Rendered HTML
 */
export function replaceVariables(template, variables) {
  let result = template;

  // Add current year if not provided
  if (!variables.year) {
    variables.year = new Date().getFullYear().toString();
  }

  // Replace all {{variable}} occurrences
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  });

  // Remove any remaining unreplaced variables
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}

/**
 * Render subject line with variables
 *
 * @param {string} templateName - Template name (e.g., 'devis-envoye')
 * @param {Record<string, string|number>} variables - Variables for replacement
 * @returns {string} - Rendered subject
 */
export function renderSubject(templateName, variables) {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown email template: ${templateName}`);
  }
  return replaceVariables(template.subject, variables);
}

/**
 * Get list of required variables for a template
 *
 * @param {string} templateName - Template name
 * @returns {string[]} - Array of required variable names
 */
export function getRequiredVariables(templateName) {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown email template: ${templateName}`);
  }
  return template.variables;
}

/**
 * Validate that all required variables are provided
 *
 * @param {string} templateName - Template name
 * @param {Record<string, string|number>} variables - Provided variables
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateVariables(templateName, variables) {
  const required = getRequiredVariables(templateName);
  const missing = required.filter(
    (key) => variables[key] === undefined || variables[key] === null
  );
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Format currency for display in emails
 *
 * @param {number} amount - Amount in euros
 * @returns {string} - Formatted amount (e.g., "14 400,00 €")
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
}

/**
 * Format date for display in emails
 *
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date (e.g., "12 janvier 2026")
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format time for display in emails
 *
 * @param {string|Date} date - Date/time to format
 * @returns {string} - Formatted time (e.g., "14h30")
 */
export function formatTime(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date)).replace(':', 'h');
}

/**
 * Generate plain text version from HTML
 * Strips HTML tags and formats for plain text email
 *
 * @param {string} html - HTML content
 * @returns {string} - Plain text version
 */
export function htmlToPlainText(html) {
  return html
    // Remove style and script tags with content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Replace common elements
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // Replace links with text and URL
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10003;/g, '✓')
    .replace(/&#128247;/g, '📷')
    .replace(/&#128179;/g, '💳')
    .replace(/&#128736;/g, '🔨')
    .replace(/&#127881;/g, '🎉')
    .replace(/&#128248;/g, '📸')
    .replace(/&#128161;/g, '💡')
    .replace(/&#128196;/g, '📄')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Prepare email data for sending
 * Returns both HTML and plain text versions
 *
 * @param {string} templateName - Template name
 * @param {string} htmlTemplate - Raw HTML template
 * @param {Record<string, string|number>} variables - Variables for replacement
 * @returns {{ subject: string, html: string, text: string }}
 */
export function prepareEmail(templateName, htmlTemplate, variables) {
  const html = replaceVariables(htmlTemplate, variables);
  const subject = renderSubject(templateName, variables);
  const text = htmlToPlainText(html);

  return {
    subject,
    html,
    text,
  };
}

// Default export for convenience
export default {
  EMAIL_TEMPLATES,
  replaceVariables,
  renderSubject,
  getRequiredVariables,
  validateVariables,
  formatCurrency,
  formatDate,
  formatTime,
  htmlToPlainText,
  prepareEmail,
};
