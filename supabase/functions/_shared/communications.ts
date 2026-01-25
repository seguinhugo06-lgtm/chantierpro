/**
 * Communications utilities for Edge Functions
 * Handles SMS (Twilio) and Email (SendGrid)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@chantierpro.fr';
const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'ChantierPro';

const APP_URL = Deno.env.get('APP_URL') || 'https://app.chantierpro.fr';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

export function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format French phone number to international format
 */
export function formatFrenchPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('33')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+33' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '+33' + cleaned;
  }

  return cleaned.startsWith('+') ? phone : '+' + cleaned;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Render template with variables
 */
export function renderTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

// ============================================================================
// SMS FUNCTIONS
// ============================================================================

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(to: string, message: string): Promise<SendResult> {
  const formattedNumber = formatFrenchPhoneNumber(to);

  if (!formattedNumber || formattedNumber.length < 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log('[DEMO] SMS would be sent to:', formattedNumber);
    return { success: true, messageId: 'demo-sms-id' };
  }

  try {
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedNumber,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`SMS sent to ${formattedNumber}, SID: ${result.sid}`);
    return { success: true, messageId: result.sid };

  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Get responsive email wrapper template
 */
function getEmailWrapper(content: string, preheader = ''): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChantierPro</title>
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100%; background-color: #f4f4f5; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .email-header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px; text-align: center; }
    .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .email-body { padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; }
    .email-footer { background-color: #f9fafb; padding: 24px 32px; text-align: center; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; padding: 14px 28px; background-color: #f97316; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .highlight { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .amount { font-size: 28px; font-weight: 700; color: #f97316; }
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
      </div>
    </div>
  </center>
</body>
</html>`;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!to || !to.includes('@')) {
    return { success: false, error: 'Invalid email address' };
  }

  const fullHtml = getEmailWrapper(html);

  if (!SENDGRID_API_KEY) {
    console.log('[DEMO] Email would be sent to:', to);
    return { success: true, messageId: 'demo-email-id' };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        subject,
        content: [{ type: 'text/html', value: fullHtml }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;
    console.log(`Email sent to ${to}, ID: ${messageId}`);
    return { success: true, messageId };

  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

export async function notifyDevisEnvoye(devisId: string, supabase: ReturnType<typeof createClient>) {
  const { data: devis } = await supabase
    .from('devis')
    .select('*, client:clients(*)')
    .eq('id', devisId)
    .single();

  if (!devis?.client) return { sms: { success: false }, email: { success: false } };

  const client = devis.client;
  const vars = {
    client_name: client.nom || 'Client',
    devis_number: devis.numero,
    amount: formatCurrency(devis.total_ttc),
    link: `${APP_URL}/portal/devis/${devisId}`,
  };

  const smsMessage = renderTemplate(
    'Bonjour {{client_name}}, votre devis #{{devis_number}} est prêt. Montant: {{amount}}. Consultez-le: {{link}}',
    vars
  );

  const emailHtml = renderTemplate(`
    <h2>Bonjour {{client_name}},</h2>
    <p>Votre devis est prêt.</p>
    <div class="highlight">
      <p><strong>Devis #{{devis_number}}</strong></p>
      <p class="amount">{{amount}}</p>
    </div>
    <center><a href="{{link}}" class="btn">Voir mon devis</a></center>
  `, vars);

  const [smsResult, emailResult] = await Promise.all([
    client.telephone ? sendSMS(client.telephone, smsMessage) : { success: false, error: 'No phone' },
    client.email ? sendEmail(client.email, `Votre devis #${devis.numero}`, emailHtml) : { success: false, error: 'No email' },
  ]);

  if (smsResult.success || emailResult.success) {
    await supabase.from('devis').update({ notification_sent: true }).eq('id', devisId);
  }

  return { sms: smsResult, email: emailResult };
}

export async function notifyDevisAccepte(devisId: string, supabase: ReturnType<typeof createClient>) {
  const { data: devis } = await supabase
    .from('devis')
    .select('*, client:clients(*)')
    .eq('id', devisId)
    .single();

  if (!devis?.client) return { sms: { success: false }, email: { success: false } };

  const client = devis.client;
  const smsMessage = `Merci ${client.nom || ''} ! Votre devis #${devis.numero} est accepté. Nous vous recontactons sous 48h.`;
  const emailHtml = `<h2>Merci ${client.nom || ''} !</h2><p>Devis <strong>#${devis.numero}</strong> accepté. Nous vous recontactons sous 48h.</p>`;

  return Promise.all([
    client.telephone ? sendSMS(client.telephone, smsMessage) : { success: false },
    client.email ? sendEmail(client.email, 'Merci pour votre confiance !', emailHtml) : { success: false },
  ]).then(([sms, email]) => ({ sms, email }));
}

export async function notifyChantierDemarre(chantierId: string, supabase: ReturnType<typeof createClient>) {
  const { data: chantier } = await supabase
    .from('chantiers')
    .select('*, client:clients(*)')
    .eq('id', chantierId)
    .single();

  if (!chantier?.client) return { sms: { success: false }, email: { success: false } };

  const client = chantier.client;
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const smsMessage = `Bonjour ${client.nom || ''}, votre chantier "${chantier.nom}" démarre à ${time}. Photos à suivre !`;
  const emailHtml = `<h2>Les travaux commencent !</h2><div class="highlight"><strong>${chantier.nom}</strong><br>Démarré à ${time}</div>`;

  return Promise.all([
    client.telephone ? sendSMS(client.telephone, smsMessage) : { success: false },
    client.email ? sendEmail(client.email, `Chantier "${chantier.nom}" démarré !`, emailHtml) : { success: false },
  ]).then(([sms, email]) => ({ sms, email }));
}

export async function notifyChantierTermine(chantierId: string, supabase: ReturnType<typeof createClient>) {
  const { data: chantier } = await supabase
    .from('chantiers')
    .select('*, client:clients(*)')
    .eq('id', chantierId)
    .single();

  if (!chantier?.client) return { sms: { success: false }, email: { success: false } };

  const client = chantier.client;
  const link = `${APP_URL}/portal/chantier/${chantierId}/photos`;
  const smsMessage = `Travaux terminés sur "${chantier.nom}" ! Merci de vérifier. Photos: ${link}`;
  const emailHtml = `<h2>Travaux terminés !</h2><div class="highlight" style="background:#ecfdf5;border-color:#10b981;"><strong>${chantier.nom}</strong><br>✓ Terminé</div><center><a href="${link}" class="btn">Voir les photos</a></center>`;

  return Promise.all([
    client.telephone ? sendSMS(client.telephone, smsMessage) : { success: false },
    client.email ? sendEmail(client.email, `Travaux terminés - ${chantier.nom}`, emailHtml) : { success: false },
  ]).then(([sms, email]) => ({ sms, email }));
}

export async function notifyFactureEnvoyee(factureId: string, supabase: ReturnType<typeof createClient>) {
  const { data: facture } = await supabase
    .from('devis')
    .select('*, client:clients(*)')
    .eq('id', factureId)
    .single();

  if (!facture?.client) return { sms: { success: false }, email: { success: false } };

  const client = facture.client;
  const amount = formatCurrency(facture.total_ttc);
  const link = `${APP_URL}/portal/facture/${factureId}/pay`;
  const smsMessage = `Facture #${facture.numero}: ${amount}. Payez en ligne: ${link}`;
  const emailHtml = `<h2>Votre facture</h2><div class="highlight"><strong>Facture #${facture.numero}</strong><p class="amount">${amount}</p></div><center><a href="${link}" class="btn">Payer</a></center>`;

  const [smsResult, emailResult] = await Promise.all([
    client.telephone ? sendSMS(client.telephone, smsMessage) : { success: false },
    client.email ? sendEmail(client.email, `Facture #${facture.numero} - ${amount}`, emailHtml) : { success: false },
  ]);

  if (smsResult.success || emailResult.success) {
    await supabase.from('devis').update({ notification_sent: true }).eq('id', factureId);
  }

  return { sms: smsResult, email: emailResult };
}

export async function notifyPaiementRecu(factureId: string, supabase: ReturnType<typeof createClient>) {
  const { data: facture } = await supabase
    .from('devis')
    .select('*, client:clients(*)')
    .eq('id', factureId)
    .single();

  if (!facture?.client) return { sms: { success: false }, email: { success: false } };

  const client = facture.client;
  const amount = formatCurrency(facture.total_ttc);
  const smsMessage = `Paiement de ${amount} reçu pour facture #${facture.numero}. Merci !`;
  const emailHtml = `<h2>Merci !</h2><div class="highlight" style="background:#ecfdf5;border-color:#10b981;">✓ Paiement confirmé<br><strong>#${facture.numero}</strong><br>${amount}</div>`;

  return Promise.all([
    client.telephone ? sendSMS(client.telephone, smsMessage) : { success: false },
    client.email ? sendEmail(client.email, `Paiement reçu - Facture #${facture.numero}`, emailHtml) : { success: false },
  ]).then(([sms, email]) => ({ sms, email }));
}
