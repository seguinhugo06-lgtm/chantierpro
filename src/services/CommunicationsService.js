/**
 * CommunicationsService
 * Service for sending automated SMS and Emails to clients
 *
 * Providers:
 * - SMS: Twilio
 * - Email: SendGrid
 *
 * @module CommunicationsService
 */

import { supabase } from '../supabaseClient';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  twilio: {
    accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
    authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
    phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',
  },
  sendgrid: {
    apiKey: import.meta.env.VITE_SENDGRID_API_KEY || '',
    fromEmail: import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'noreply@chantierpro.fr',
    fromName: import.meta.env.VITE_SENDGRID_FROM_NAME || 'ChantierPro',
  },
  rateLimits: {
    smsPerMinute: 10,
    emailPerMinute: 100,
  },
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
  },
  baseUrl: import.meta.env.VITE_APP_URL || 'https://app.chantierpro.fr',
};

// Rate limiting state
const rateLimitState = {
  sms: { count: 0, resetTime: Date.now() },
  email: { count: 0, resetTime: Date.now() },
};

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {Object} CommunicationLog
 * @property {string} id
 * @property {string} user_id
 * @property {string} client_id
 * @property {'sms' | 'email'} type
 * @property {string} to
 * @property {string} subject
 * @property {string} content
 * @property {'pending' | 'sent' | 'failed'} status
 * @property {string} [error_message]
 * @property {string} [provider_id]
 * @property {string} created_at
 */

/**
 * @typedef {Object} SendResult
 * @property {boolean} success
 * @property {string} [messageId]
 * @property {string} [error]
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format French phone number to international format
 * @param {string} phone - Phone number in various formats
 * @returns {string} Formatted phone number (+33...)
 */
export function formatFrenchPhoneNumber(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle different formats
  if (cleaned.startsWith('33')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+33' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '+33' + cleaned;
  }

  // Already international or unknown format
  return cleaned.startsWith('+') ? phone : '+' + cleaned;
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check rate limit and wait if necessary
 * @param {'sms' | 'email'} type - Communication type
 * @returns {Promise<boolean>} - True if can proceed
 */
async function checkRateLimit(type) {
  const now = Date.now();
  const state = rateLimitState[type];
  const limit = type === 'sms' ? CONFIG.rateLimits.smsPerMinute : CONFIG.rateLimits.emailPerMinute;

  // Reset counter if minute has passed
  if (now - state.resetTime >= 60000) {
    state.count = 0;
    state.resetTime = now;
  }

  // Check if over limit
  if (state.count >= limit) {
    const waitTime = 60000 - (now - state.resetTime);
    console.warn(`Rate limit reached for ${type}, waiting ${waitTime}ms`);
    await sleep(waitTime);
    state.count = 0;
    state.resetTime = Date.now();
  }

  state.count++;
  return true;
}

/**
 * Retry a function with exponential backoff
 * @template T
 * @param {() => Promise<T>} fn - Function to retry
 * @param {number} [maxAttempts] - Maximum attempts
 * @returns {Promise<T>}
 */
async function withRetry(fn, maxAttempts = CONFIG.retry.maxAttempts) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);

      if (attempt < maxAttempts) {
        const delay = CONFIG.retry.baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Log communication to database
 * @param {Partial<CommunicationLog>} log - Log entry
 * @returns {Promise<string|null>} - Log ID or null on error
 */
async function logCommunication(log) {
  try {
    if (!supabase) {
      return 'demo-log-id';
    }

    const { data, error } = await supabase
      .from('client_communications')
      .insert([{
        ...log,
        created_at: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Failed to log communication:', error);
    return null;
  }
}

/**
 * Update communication log status
 * @param {string} logId - Log ID
 * @param {'sent' | 'failed'} status - New status
 * @param {Object} [extra] - Extra fields to update
 */
async function updateCommunicationLog(logId, status, extra = {}) {
  try {
    if (!supabase || logId === 'demo-log-id') return;

    await supabase
      .from('client_communications')
      .update({ status, ...extra, updated_at: new Date().toISOString() })
      .eq('id', logId);
  } catch (error) {
    console.error('Failed to update communication log:', error);
  }
}

// ============================================================================
// SMS FUNCTIONS
// ============================================================================

/**
 * Send SMS via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 * @param {Object} [options] - Additional options
 * @param {string} [options.userId] - User ID for logging
 * @param {string} [options.clientId] - Client ID for logging
 * @returns {Promise<SendResult>}
 */
export async function sendSMS(to, message, options = {}) {
  const formattedNumber = formatFrenchPhoneNumber(to);

  // Validate
  if (!formattedNumber || formattedNumber.length < 10) {
    console.error('Invalid phone number:', to);
    return { success: false, error: 'Invalid phone number' };
  }

  if (!message || message.trim().length === 0) {
    return { success: false, error: 'Message is empty' };
  }

  // Check config
  if (!CONFIG.twilio.accountSid || !CONFIG.twilio.authToken) {
    console.warn('[DEMO] SMS would be sent to:', formattedNumber, 'Message:', message);
    return { success: true, messageId: 'demo-sms-id' };
  }

  // Log communication (pending)
  const logId = await logCommunication({
    user_id: options.userId,
    client_id: options.clientId,
    type: 'sms',
    to: formattedNumber,
    content: message,
    status: 'pending',
  });

  try {
    // Check rate limit
    await checkRateLimit('sms');

    // Send via Twilio REST API
    const result = await withRetry(async () => {
      const credentials = btoa(`${CONFIG.twilio.accountSid}:${CONFIG.twilio.authToken}`);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.twilio.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedNumber,
            From: CONFIG.twilio.phoneNumber,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    });

    // Update log
    if (logId) {
      await updateCommunicationLog(logId, 'sent', { provider_id: result.sid });
    }

    return { success: true, messageId: result.sid };

  } catch (error) {
    console.error('Failed to send SMS:', error);

    // Update log
    if (logId) {
      await updateCommunicationLog(logId, 'failed', { error_message: error.message });
    }

    return { success: false, error: error.message };
  }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Get responsive email wrapper template
 * @param {string} content - Email content HTML
 * @param {string} [preheader] - Preheader text
 * @returns {string} Complete HTML email
 */
/**
 * Generate a unique tracking ID for email open tracking
 * @returns {string} tracking ID
 */
function generateTrackingId() {
  return `trk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Record email send event for tracking
 * @param {string} trackingId - Tracking ID
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {Object} options - Additional tracking data
 */
function recordEmailSend(trackingId, to, subject, options = {}) {
  try {
    const tracking = JSON.parse(localStorage.getItem('cp_email_tracking') || '{}');
    tracking[trackingId] = {
      to,
      subject,
      sentAt: new Date().toISOString(),
      status: 'sent',
      clientId: options.clientId || null,
      documentId: options.documentId || null,
      documentType: options.documentType || null,
      openedAt: null,
    };
    localStorage.setItem('cp_email_tracking', JSON.stringify(tracking));
  } catch (e) {
    console.warn('Failed to record email tracking:', e);
  }
}

/**
 * Get all email tracking records
 * @param {string} [filterDocumentId] - Optional document ID filter
 * @returns {Array} Tracking records sorted by date desc
 */
export function getEmailTrackingRecords(filterDocumentId) {
  try {
    const tracking = JSON.parse(localStorage.getItem('cp_email_tracking') || '{}');
    let records = Object.entries(tracking).map(([id, data]) => ({ id, ...data }));
    if (filterDocumentId) {
      records = records.filter(r => r.documentId === filterDocumentId);
    }
    return records.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  } catch {
    return [];
  }
}

/**
 * Get tracking status for a specific document
 * @param {string} documentId - Devis/facture ID
 * @returns {{ sent: number, lastSent: string|null }} Summary
 */
export function getDocumentEmailStatus(documentId) {
  const records = getEmailTrackingRecords(documentId);
  return {
    sent: records.length,
    lastSent: records.length > 0 ? records[0].sentAt : null,
    records,
  };
}

function getEmailWrapper(content, preheader = '', trackingId = '') {
  const trackingPixel = trackingId
    ? `<img src="https://chantierpro.vercel.app/api/track/${trackingId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ChantierPro</title>
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100%; background-color: #f4f4f5; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .email-header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px; text-align: center; }
    .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .email-body { padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; }
    .email-footer { background-color: #f9fafb; padding: 24px 32px; text-align: center; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; padding: 14px 28px; background-color: #f97316; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .btn:hover { background-color: #ea580c; }
    .highlight { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .amount { font-size: 28px; font-weight: 700; color: #f97316; }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 24px 16px !important; }
      .email-header { padding: 24px 16px !important; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <center style="width: 100%; background-color: #f4f4f5; padding: 24px 0;">
    <div class="email-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div class="email-header">
        <h1>ChantierPro</h1>
      </div>
      <div class="email-body">
        ${content}
      </div>
      <div class="email-footer">
        <p>Cet email a été envoyé automatiquement par ChantierPro.</p>
        <p>&copy; ${new Date().getFullYear()} ChantierPro. Tous droits réservés.</p>
        ${trackingPixel}
      </div>
    </div>
  </center>
</body>
</html>`;
}

/**
 * Send email via SendGrid
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {Object} [options] - Additional options
 * @param {string} [options.userId] - User ID for logging
 * @param {string} [options.clientId] - Client ID for logging
 * @param {string} [options.preheader] - Email preheader text
 * @returns {Promise<SendResult>}
 */
export async function sendEmail(to, subject, html, options = {}) {
  // Validate
  if (!to || !to.includes('@')) {
    return { success: false, error: 'Invalid email address' };
  }

  if (!subject || !html) {
    return { success: false, error: 'Subject and HTML content required' };
  }

  // Generate tracking ID for email open tracking
  const trackingId = generateTrackingId();

  // Wrap in responsive template with tracking pixel
  const fullHtml = getEmailWrapper(html, options.preheader, trackingId);

  // Check config
  if (!CONFIG.sendgrid.apiKey) {
    console.warn('[DEMO] Email would be sent to:', to, 'Subject:', subject);
    recordEmailSend(trackingId, to, subject, options);
    return { success: true, messageId: 'demo-email-id', trackingId };
  }

  // Log communication (pending)
  const logId = await logCommunication({
    user_id: options.userId,
    client_id: options.clientId,
    type: 'email',
    to,
    subject,
    content: html,
    status: 'pending',
  });

  try {
    // Check rate limit
    await checkRateLimit('email');

    // Send via SendGrid REST API
    const result = await withRetry(async () => {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.sendgrid.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email: CONFIG.sendgrid.fromEmail,
            name: CONFIG.sendgrid.fromName,
          },
          subject,
          content: [
            { type: 'text/html', value: fullHtml },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.errors?.[0]?.message || `HTTP ${response.status}`);
      }

      // SendGrid returns message ID in header
      const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;
      return { messageId };
    });

    // Update log
    if (logId) {
      await updateCommunicationLog(logId, 'sent', { provider_id: result.messageId });
    }

    recordEmailSend(trackingId, to, subject, options);
    return { success: true, messageId: result.messageId, trackingId };

  } catch (error) {
    console.error('Failed to send email:', error);

    // Update log
    if (logId) {
      await updateCommunicationLog(logId, 'failed', { error_message: error.message });
    }

    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEMPLATE FUNCTIONS
// ============================================================================

/**
 * Render a template with variables
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Record<string, string | number>} variables - Variables to replace
 * @returns {string} Rendered template
 */
export function renderTemplate(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * Format currency for display
 * @param {number} amount - Amount in euros
 * @returns {string} Formatted amount
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
}

/**
 * Format date for display
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Notify client when devis is sent
 * @param {string} devisId - Devis ID
 * @returns {Promise<{ sms: SendResult, email: SendResult }>}
 */
export async function notifyDevisEnvoye(devisId) {
  try {
    // Fetch devis with client
    const { data: devis, error } = supabase
      ? await supabase
          .from('devis')
          .select('*, client:clients(*)')
          .eq('id', devisId)
          .single()
      : { data: null, error: { message: 'Demo mode' } };

    if (error || !devis) {
      console.error('Failed to fetch devis:', error);
      return { sms: { success: false, error: 'Devis not found' }, email: { success: false, error: 'Devis not found' } };
    }

    const client = devis.client;
    if (!client) {
      return { sms: { success: false, error: 'Client not found' }, email: { success: false, error: 'Client not found' } };
    }

    const variables = {
      client_name: client.nom || 'Client',
      devis_number: devis.numero,
      amount: formatCurrency(devis.total_ttc),
      link: `${CONFIG.baseUrl}/portal/devis/${devisId}`,
    };

    // SMS
    const smsMessage = renderTemplate(
      'Bonjour {{client_name}}, votre devis #{{devis_number}} est prêt. Montant: {{amount}}. Consultez-le: {{link}}',
      variables
    );

    // Email
    const emailHtml = renderTemplate(`
      <h2>Bonjour {{client_name}},</h2>
      <p>Votre devis est prêt et disponible pour consultation.</p>
      <div class="highlight">
        <p><strong>Devis #{{devis_number}}</strong></p>
        <p class="amount">{{amount}}</p>
      </div>
      <p>Cliquez sur le bouton ci-dessous pour consulter et accepter votre devis :</p>
      <center>
        <a href="{{link}}" class="btn">Voir mon devis</a>
      </center>
      <p>Ce devis est valable 30 jours. N'hésitez pas à nous contacter pour toute question.</p>
    `, variables);

    const options = { userId: devis.user_id, clientId: client.id };

    // Send both
    const [smsResult, emailResult] = await Promise.all([
      client.telephone ? sendSMS(client.telephone, smsMessage, options) : Promise.resolve({ success: false, error: 'No phone' }),
      client.email ? sendEmail(client.email, `Votre devis #${devis.numero} est prêt`, emailHtml, { ...options, preheader: `Montant: ${variables.amount}` }) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    // Update devis
    if (supabase && (smsResult.success || emailResult.success)) {
      await supabase
        .from('devis')
        .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
        .eq('id', devisId);
    }

    return { sms: smsResult, email: emailResult };

  } catch (error) {
    console.error('Error in notifyDevisEnvoye:', error);
    return { sms: { success: false, error: error.message }, email: { success: false, error: error.message } };
  }
}

/**
 * Notify client when devis is accepted
 * @param {string} devisId - Devis ID
 * @returns {Promise<{ sms: SendResult, email: SendResult }>}
 */
export async function notifyDevisAccepte(devisId) {
  try {
    const { data: devis, error } = supabase
      ? await supabase
          .from('devis')
          .select('*, client:clients(*)')
          .eq('id', devisId)
          .single()
      : { data: null, error: { message: 'Demo mode' } };

    if (error || !devis?.client) {
      return { sms: { success: false, error: 'Devis/Client not found' }, email: { success: false, error: 'Devis/Client not found' } };
    }

    const client = devis.client;
    const variables = {
      client_name: client.nom || 'Client',
      devis_number: devis.numero,
    };

    const smsMessage = renderTemplate(
      'Merci {{client_name}} ! Votre devis #{{devis_number}} est accepté. Nous vous recontactons sous 48h pour planifier les travaux.',
      variables
    );

    const emailHtml = renderTemplate(`
      <h2>Merci {{client_name}} !</h2>
      <p>Nous avons bien reçu votre acceptation pour le devis <strong>#{{devis_number}}</strong>.</p>
      <div class="highlight">
        <p><strong>Prochaines étapes :</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Nous vous recontactons sous 48h</li>
          <li>Planification des travaux ensemble</li>
          <li>Confirmation de la date de début</li>
        </ul>
      </div>
      <p>Merci pour votre confiance !</p>
    `, variables);

    const options = { userId: devis.user_id, clientId: client.id };

    const [smsResult, emailResult] = await Promise.all([
      client.telephone ? sendSMS(client.telephone, smsMessage, options) : Promise.resolve({ success: false, error: 'No phone' }),
      client.email ? sendEmail(client.email, `Merci pour votre confiance !`, emailHtml, options) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    return { sms: smsResult, email: emailResult };

  } catch (error) {
    console.error('Error in notifyDevisAccepte:', error);
    return { sms: { success: false, error: error.message }, email: { success: false, error: error.message } };
  }
}

/**
 * Notify client when chantier starts
 * @param {string} chantierId - Chantier ID
 * @returns {Promise<{ sms: SendResult, email: SendResult }>}
 */
export async function notifyChantierDemarre(chantierId) {
  try {
    const { data: chantier, error } = supabase
      ? await supabase
          .from('chantiers')
          .select('*, client:clients(*)')
          .eq('id', chantierId)
          .single()
      : { data: null, error: { message: 'Demo mode' } };

    if (error || !chantier?.client) {
      return { sms: { success: false, error: 'Chantier/Client not found' }, email: { success: false, error: 'Chantier/Client not found' } };
    }

    const client = chantier.client;
    const now = new Date();
    const variables = {
      client_name: client.nom || 'Client',
      chantier_name: chantier.nom,
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: formatDate(now),
      link: `${CONFIG.baseUrl}/portal/chantier/${chantierId}`,
    };

    const smsMessage = renderTemplate(
      'Bonjour {{client_name}}, votre chantier "{{chantier_name}}" démarre aujourd\'hui à {{time}}. Vous recevrez des photos régulièrement.',
      variables
    );

    const emailHtml = renderTemplate(`
      <h2>Bonjour {{client_name}},</h2>
      <p>Nous avons le plaisir de vous informer que les travaux ont commencé !</p>
      <div class="highlight">
        <p><strong>{{chantier_name}}</strong></p>
        <p>Démarré le {{date}} à {{time}}</p>
      </div>
      <p>Pendant toute la durée des travaux :</p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Vous recevrez des photos d'avancement</li>
        <li>Vous pouvez suivre le chantier en ligne</li>
        <li>N'hésitez pas à nous contacter pour toute question</li>
      </ul>
      <center>
        <a href="{{link}}" class="btn">Suivre mon chantier</a>
      </center>
    `, variables);

    const options = { userId: chantier.user_id, clientId: client.id };

    const [smsResult, emailResult] = await Promise.all([
      client.telephone ? sendSMS(client.telephone, smsMessage, options) : Promise.resolve({ success: false, error: 'No phone' }),
      client.email ? sendEmail(client.email, `Votre chantier "${chantier.nom}" a démarré !`, emailHtml, options) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    return { sms: smsResult, email: emailResult };

  } catch (error) {
    console.error('Error in notifyChantierDemarre:', error);
    return { sms: { success: false, error: error.message }, email: { success: false, error: error.message } };
  }
}

/**
 * Notify client when chantier is complete
 * @param {string} chantierId - Chantier ID
 * @returns {Promise<{ sms: SendResult, email: SendResult }>}
 */
export async function notifyChantierTermine(chantierId) {
  try {
    const { data: chantier, error } = supabase
      ? await supabase
          .from('chantiers')
          .select('*, client:clients(*)')
          .eq('id', chantierId)
          .single()
      : { data: null, error: { message: 'Demo mode' } };

    if (error || !chantier?.client) {
      return { sms: { success: false, error: 'Chantier/Client not found' }, email: { success: false, error: 'Chantier/Client not found' } };
    }

    const client = chantier.client;
    const variables = {
      client_name: client.nom || 'Client',
      chantier_name: chantier.nom,
      link: `${CONFIG.baseUrl}/portal/chantier/${chantierId}/photos`,
    };

    const smsMessage = renderTemplate(
      'Bonne nouvelle {{client_name}} ! Les travaux sur "{{chantier_name}}" sont terminés. Merci de vérifier. Photos: {{link}}',
      variables
    );

    const emailHtml = renderTemplate(`
      <h2>Félicitations {{client_name}} !</h2>
      <p>Les travaux sur votre chantier sont maintenant <strong>terminés</strong>.</p>
      <div class="highlight">
        <p><strong>{{chantier_name}}</strong></p>
        <p style="color: #10b981; font-weight: 600;">✓ Travaux terminés</p>
      </div>
      <p>Nous vous invitons à :</p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Vérifier les travaux réalisés</li>
        <li>Consulter les photos avant/après</li>
        <li>Nous faire part de vos observations</li>
      </ul>
      <center>
        <a href="{{link}}" class="btn">Voir les photos</a>
      </center>
      <p>Merci pour votre confiance. N'hésitez pas à nous recommander !</p>
    `, variables);

    const options = { userId: chantier.user_id, clientId: client.id };

    const [smsResult, emailResult] = await Promise.all([
      client.telephone ? sendSMS(client.telephone, smsMessage, options) : Promise.resolve({ success: false, error: 'No phone' }),
      client.email ? sendEmail(client.email, `Travaux terminés - ${chantier.nom}`, emailHtml, options) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    return { sms: smsResult, email: emailResult };

  } catch (error) {
    console.error('Error in notifyChantierTermine:', error);
    return { sms: { success: false, error: error.message }, email: { success: false, error: error.message } };
  }
}

/**
 * Notify client when facture is sent
 * @param {string} factureId - Facture ID
 * @returns {Promise<{ sms: SendResult, email: SendResult }>}
 */
export async function notifyFactureEnvoyee(factureId) {
  try {
    const { data: facture, error } = supabase
      ? await supabase
          .from('devis')
          .select('*, client:clients(*)')
          .eq('id', factureId)
          .eq('type', 'facture')
          .single()
      : { data: null, error: { message: 'Demo mode' } };

    if (error || !facture?.client) {
      return { sms: { success: false, error: 'Facture/Client not found' }, email: { success: false, error: 'Facture/Client not found' } };
    }

    const client = facture.client;
    const echeance = facture.date_validite || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const variables = {
      client_name: client.nom || 'Client',
      facture_number: facture.numero,
      amount: formatCurrency(facture.total_ttc),
      date_echeance: formatDate(echeance),
      link: `${CONFIG.baseUrl}/portal/facture/${factureId}/pay`,
    };

    const smsMessage = renderTemplate(
      'Facture #{{facture_number}} disponible. Montant: {{amount}}. Échéance: {{date_echeance}}. Payez en ligne: {{link}}',
      variables
    );

    const emailHtml = renderTemplate(`
      <h2>Bonjour {{client_name}},</h2>
      <p>Votre facture est disponible.</p>
      <div class="highlight">
        <p><strong>Facture #{{facture_number}}</strong></p>
        <p class="amount">{{amount}}</p>
        <p>Échéance : {{date_echeance}}</p>
      </div>
      <p>Vous pouvez régler cette facture en ligne de façon sécurisée :</p>
      <center>
        <a href="{{link}}" class="btn">Payer ma facture</a>
      </center>
      <p style="font-size: 14px; color: #6b7280;">
        Modes de paiement acceptés : Carte bancaire, virement, prélèvement.
      </p>
    `, variables);

    const options = { userId: facture.user_id, clientId: client.id };

    const [smsResult, emailResult] = await Promise.all([
      client.telephone ? sendSMS(client.telephone, smsMessage, options) : Promise.resolve({ success: false, error: 'No phone' }),
      client.email ? sendEmail(client.email, `Facture #${facture.numero} - ${variables.amount}`, emailHtml, { ...options, preheader: `Échéance: ${variables.date_echeance}` }) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    // Update facture
    if (supabase && (smsResult.success || emailResult.success)) {
      await supabase
        .from('devis')
        .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
        .eq('id', factureId);
    }

    return { sms: smsResult, email: emailResult };

  } catch (error) {
    console.error('Error in notifyFactureEnvoyee:', error);
    return { sms: { success: false, error: error.message }, email: { success: false, error: error.message } };
  }
}

/**
 * Notify client when payment is received
 * @param {string} factureId - Facture ID
 * @returns {Promise<{ sms: SendResult, email: SendResult }>}
 */
export async function notifyPaiementRecu(factureId) {
  try {
    const { data: facture, error } = supabase
      ? await supabase
          .from('devis')
          .select('*, client:clients(*)')
          .eq('id', factureId)
          .single()
      : { data: null, error: { message: 'Demo mode' } };

    if (error || !facture?.client) {
      return { sms: { success: false, error: 'Facture/Client not found' }, email: { success: false, error: 'Facture/Client not found' } };
    }

    const client = facture.client;
    const variables = {
      client_name: client.nom || 'Client',
      facture_number: facture.numero,
      amount: formatCurrency(facture.total_ttc),
      date: formatDate(new Date()),
    };

    const smsMessage = renderTemplate(
      'Paiement de {{amount}} bien reçu pour facture #{{facture_number}}. Merci {{client_name}} !',
      variables
    );

    const emailHtml = renderTemplate(`
      <h2>Merci {{client_name}} !</h2>
      <p>Nous avons bien reçu votre paiement.</p>
      <div class="highlight" style="background-color: #ecfdf5; border-color: #10b981;">
        <p style="color: #10b981; font-weight: 600;">✓ Paiement confirmé</p>
        <p><strong>Facture #{{facture_number}}</strong></p>
        <p class="amount" style="color: #10b981;">{{amount}}</p>
        <p>Reçu le {{date}}</p>
      </div>
      <p>Un reçu de paiement vous sera envoyé par email séparément.</p>
      <p>Merci pour votre confiance et à bientôt !</p>
    `, variables);

    const options = { userId: facture.user_id, clientId: client.id };

    const [smsResult, emailResult] = await Promise.all([
      client.telephone ? sendSMS(client.telephone, smsMessage, options) : Promise.resolve({ success: false, error: 'No phone' }),
      client.email ? sendEmail(client.email, `Paiement reçu - Facture #${facture.numero}`, emailHtml, options) : Promise.resolve({ success: false, error: 'No email' }),
    ]);

    return { sms: smsResult, email: emailResult };

  } catch (error) {
    console.error('Error in notifyPaiementRecu:', error);
    return { sms: { success: false, error: error.message }, email: { success: false, error: error.message } };
  }
}

// ============================================================================
// BULK / UTILITY FUNCTIONS
// ============================================================================

/**
 * Send notification with SMS fallback to email (or vice versa)
 * @param {Object} params - Notification parameters
 * @param {string} params.to - Recipient (phone or email)
 * @param {string} params.message - SMS message
 * @param {string} params.subject - Email subject
 * @param {string} params.html - Email HTML
 * @param {Object} [params.options] - Additional options
 * @returns {Promise<SendResult>}
 */
export async function sendNotificationWithFallback({ to, message, subject, html, options = {} }) {
  // Determine primary channel
  const isPhone = /^[+\d]/.test(to) && !to.includes('@');

  if (isPhone) {
    // Try SMS first, fallback to email if provided
    const smsResult = await sendSMS(to, message, options);
    if (smsResult.success) return smsResult;

    // Fallback to email if we have one
    if (options.fallbackEmail) {
      return sendEmail(options.fallbackEmail, subject, html, options);
    }

    return smsResult;
  } else {
    // Try email first, fallback to SMS if provided
    const emailResult = await sendEmail(to, subject, html, options);
    if (emailResult.success) return emailResult;

    // Fallback to SMS if we have a phone
    if (options.fallbackPhone) {
      return sendSMS(options.fallbackPhone, message, options);
    }

    return emailResult;
  }
}

/**
 * Get communication history for a client
 * @param {string} clientId - Client ID
 * @param {number} [limit=50] - Max records to return
 * @returns {Promise<CommunicationLog[]>}
 */
export async function getCommunicationHistory(clientId, limit = 50) {
  try {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('client_communications')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('Failed to get communication history:', error);
    return [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  sendSMS,
  sendEmail,
  sendNotificationWithFallback,
  notifyDevisEnvoye,
  notifyDevisAccepte,
  notifyChantierDemarre,
  notifyChantierTermine,
  notifyFactureEnvoyee,
  notifyPaiementRecu,
  getCommunicationHistory,
  formatFrenchPhoneNumber,
  renderTemplate,
};
