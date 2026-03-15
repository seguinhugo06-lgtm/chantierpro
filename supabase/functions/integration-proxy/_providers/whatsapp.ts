/**
 * WhatsApp Business Provider Adapter
 *
 * Sends template messages via Meta WhatsApp Business API.
 * Auth: API key (Bearer token).
 *
 * Capabilities: send_templates, notifications
 * Templates: envoi devis, relance paiement, confirmation RDV
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppCredentials {
  apiKey: string;
  phoneNumberId?: string;
  businessAccountId?: string;
}

interface TemplateMessage {
  to: string; // Phone number (international format: +33612345678)
  templateName: string;
  languageCode?: string;
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time';
    text?: string;
  }>;
  documentUrl?: string;
  documentFileName?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  details: Record<string, any>;
}

// ── API Client ───────────────────────────────────────────────────────────────

const WHATSAPP_API = 'https://graph.facebook.com/v18.0';

async function whatsappRequest(
  endpoint: string,
  credentials: WhatsAppCredentials,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(`${WHATSAPP_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
    console.error(`[WHATSAPP] API error:`, errorMessage);
    if (response.status === 401) throw new Error('TOKEN_INVALIDE');
    throw new Error(`Erreur API WhatsApp: ${errorMessage}`);
  }

  return response.json();
}

// ── Template Definitions ─────────────────────────────────────────────────────

/**
 * Pre-defined message templates for BatiGesti.
 * These must be registered and approved in Meta Business Suite.
 */
export const TEMPLATES = {
  devis_envoye: {
    name: 'batigesti_devis_envoye',
    description: 'Envoi d\'un devis au client',
    parameters: ['client_name', 'devis_numero', 'montant_ttc', 'lien_devis'],
    category: 'UTILITY',
  },
  relance_paiement: {
    name: 'batigesti_relance_paiement',
    description: 'Relance de paiement pour une facture',
    parameters: ['client_name', 'facture_numero', 'montant_du', 'date_echeance'],
    category: 'UTILITY',
  },
  confirmation_rdv: {
    name: 'batigesti_confirmation_rdv',
    description: 'Confirmation de rendez-vous',
    parameters: ['client_name', 'date_rdv', 'heure_rdv', 'adresse'],
    category: 'UTILITY',
  },
  chantier_debut: {
    name: 'batigesti_chantier_debut',
    description: 'Notification de début de chantier',
    parameters: ['client_name', 'chantier_nom', 'date_debut'],
    category: 'UTILITY',
  },
  chantier_fin: {
    name: 'batigesti_chantier_fin',
    description: 'Notification de fin de chantier',
    parameters: ['client_name', 'chantier_nom'],
    category: 'UTILITY',
  },
};

// ── Message Sending ──────────────────────────────────────────────────────────

/**
 * Send a template message via WhatsApp Business API.
 */
export async function sendTemplateMessage(
  credentials: WhatsAppCredentials,
  message: TemplateMessage,
): Promise<SendResult> {
  try {
    const phoneNumberId = credentials.phoneNumberId;
    if (!phoneNumberId) {
      throw new Error('Phone Number ID non configuré');
    }

    // Format phone number (ensure international format)
    const phone = formatPhoneNumber(message.to);

    const body: any = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: message.templateName,
        language: { code: message.languageCode || 'fr' },
        components: [],
      },
    };

    // Add parameters to body component
    if (message.parameters?.length) {
      body.template.components.push({
        type: 'body',
        parameters: message.parameters.map(p => ({
          type: p.type || 'text',
          text: p.text,
        })),
      });
    }

    // Add document header if provided
    if (message.documentUrl) {
      body.template.components.push({
        type: 'header',
        parameters: [{
          type: 'document',
          document: {
            link: message.documentUrl,
            filename: message.documentFileName || 'document.pdf',
          },
        }],
      });
    }

    const result = await whatsappRequest(
      `/${phoneNumberId}/messages`,
      credentials,
      { method: 'POST', body: JSON.stringify(body) },
    );

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Send a simple text message (for testing).
 */
export async function sendTextMessage(
  credentials: WhatsAppCredentials,
  to: string,
  text: string,
): Promise<SendResult> {
  try {
    const phoneNumberId = credentials.phoneNumberId;
    if (!phoneNumberId) throw new Error('Phone Number ID non configuré');

    const result = await whatsappRequest(
      `/${phoneNumberId}/messages`,
      credentials,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formatPhoneNumber(to),
          type: 'text',
          text: { body: text },
        }),
      },
    );

    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, '');
  // Convert French local to international
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+33' + cleaned.substring(1);
  }
  // Ensure + prefix
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// ── Sync Handler ─────────────────────────────────────────────────────────────

/**
 * WhatsApp doesn't have a traditional sync.
 * This handler checks template status and message delivery stats.
 */
export async function handleWhatsAppSync(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: WhatsAppCredentials,
  direction: string,
  entityType?: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { templateStatus: 'checked' },
  };

  try {
    // Verify API access
    const phoneNumberId = credentials.phoneNumberId;
    if (!phoneNumberId) {
      throw new Error('Phone Number ID requis');
    }

    // Check phone number status
    const phoneData = await whatsappRequest(`/${phoneNumberId}`, credentials);
    result.details.phoneNumber = phoneData.display_phone_number;
    result.details.qualityRating = phoneData.quality_rating;
    result.details.verifiedName = phoneData.verified_name;

    // Get message templates
    const businessId = credentials.businessAccountId;
    if (businessId) {
      const templatesData = await whatsappRequest(
        `/${businessId}/message_templates?limit=20`,
        credentials,
      );
      result.details.templateCount = templatesData.data?.length || 0;
      result.details.templates = (templatesData.data || []).map((t: any) => ({
        name: t.name,
        status: t.status,
        language: t.language,
      }));
    }

    result.itemsSynced = 1;
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
  }

  return result;
}

export async function validateWhatsAppConnection(
  credentials: WhatsAppCredentials,
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    if (!credentials.phoneNumberId) {
      return { valid: false, error: 'Phone Number ID requis' };
    }
    const data = await whatsappRequest(`/${credentials.phoneNumberId}`, credentials);
    return {
      valid: true,
      accountName: data.verified_name || data.display_phone_number || 'WhatsApp Business',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
