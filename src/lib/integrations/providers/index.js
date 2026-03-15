/**
 * Provider Registry — Central catalog of all third-party integrations
 *
 * Each provider has metadata, auth type, capabilities, and UI config.
 * Providers with status 'coming_soon' show a badge instead of connect button.
 */

import {
  Calculator, Calendar, Building2, PenTool, HardDrive,
  Zap, MessageCircle, Receipt, CreditCard, FileText,
  Cloud, Send, Link2, Webhook, Globe,
} from 'lucide-react';

// ── Provider Definitions ────────────────────────────────────────────────────

export const PROVIDERS = {
  // ── Comptabilité ──────────────────────────────────────────────────────────
  pennylane: {
    id: 'pennylane',
    name: 'Pennylane',
    category: 'accounting',
    authType: 'oauth2',
    color: '#6366f1',
    logo: null, // URL or null for icon fallback
    icon: Receipt,
    description: 'Comptabilité automatisée pour TPE/PME',
    shortDesc: 'Sync factures & dépenses',
    website: 'https://www.pennylane.com',
    capabilities: ['sync_factures', 'sync_depenses', 'rapprochement'],
    entityTypes: ['facture', 'depense'],
    syncDirections: ['push', 'pull'],
    status: 'available',
    oauthConfig: {
      authorizationUrl: 'https://app.pennylane.com/oauth/authorize',
      scopes: ['invoices:read', 'invoices:write', 'expenses:read'],
    },
  },

  indy: {
    id: 'indy',
    name: 'Indy',
    category: 'accounting',
    authType: 'oauth2',
    color: '#10b981',
    logo: null,
    icon: Calculator,
    description: 'Comptabilité simplifiée pour indépendants',
    shortDesc: 'Sync factures & déclarations',
    website: 'https://www.indy.fr',
    capabilities: ['sync_factures', 'declarations'],
    entityTypes: ['facture'],
    syncDirections: ['push'],
    status: 'coming_soon',
  },

  tiime: {
    id: 'tiime',
    name: 'Tiime',
    category: 'accounting',
    authType: 'oauth2',
    color: '#f59e0b',
    logo: null,
    icon: Calculator,
    description: 'Comptabilité pour micro-entreprises',
    shortDesc: 'Sync factures simplifiée',
    website: 'https://www.tiime.fr',
    capabilities: ['sync_factures'],
    entityTypes: ['facture'],
    syncDirections: ['push'],
    status: 'coming_soon',
  },

  // ── Agenda ────────────────────────────────────────────────────────────────

  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'calendar',
    authType: 'oauth2',
    color: '#4285f4',
    logo: null,
    icon: Calendar,
    description: 'Synchronisez vos chantiers et RDV',
    shortDesc: 'Sync bidirectionnelle',
    website: 'https://calendar.google.com',
    capabilities: ['sync_events', 'push_chantiers', 'pull_events'],
    entityTypes: ['event', 'chantier'],
    syncDirections: ['push', 'pull'],
    status: 'available',
    oauthConfig: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    },
  },

  outlook_calendar: {
    id: 'outlook_calendar',
    name: 'Outlook / Microsoft 365',
    category: 'calendar',
    authType: 'oauth2',
    color: '#0078d4',
    logo: null,
    icon: Calendar,
    description: 'Synchronisez avec votre agenda Outlook',
    shortDesc: 'Sync bidirectionnelle',
    website: 'https://outlook.office.com/calendar',
    capabilities: ['sync_events', 'push_chantiers'],
    entityTypes: ['event', 'chantier'],
    syncDirections: ['push', 'pull'],
    status: 'coming_soon',
  },

  ical: {
    id: 'ical',
    name: 'Export iCal',
    category: 'calendar',
    authType: 'none',
    color: '#3b82f6',
    logo: null,
    icon: Calendar,
    description: 'Abonnement calendrier universel (.ics)',
    shortDesc: 'Export lecture seule',
    website: null,
    capabilities: ['export_ics'],
    entityTypes: ['event'],
    syncDirections: ['push'],
    status: 'available',
  },

  // ── Banque ────────────────────────────────────────────────────────────────

  qonto: {
    id: 'qonto',
    name: 'Qonto',
    category: 'banking',
    authType: 'api_key',
    color: '#000000',
    logo: null,
    icon: CreditCard,
    description: 'Compte pro et gestion financière',
    shortDesc: 'Transactions & rapprochement',
    website: 'https://qonto.com',
    capabilities: ['sync_transactions', 'rapprochement'],
    entityTypes: ['transaction'],
    syncDirections: ['pull'],
    status: 'coming_soon',
    apiKeyFields: [
      { key: 'organization_slug', label: 'Organization slug', placeholder: 'mon-entreprise' },
      { key: 'secret_key', label: 'Clé secrète', placeholder: 'qonto_sk_...', secret: true },
    ],
  },

  shine: {
    id: 'shine',
    name: 'Shine',
    category: 'banking',
    authType: 'api_key',
    color: '#ff6b35',
    logo: null,
    icon: CreditCard,
    description: 'Compte pro pour indépendants',
    shortDesc: 'Transactions & rapprochement',
    website: 'https://www.shine.fr',
    capabilities: ['sync_transactions'],
    entityTypes: ['transaction'],
    syncDirections: ['pull'],
    status: 'coming_soon',
  },

  bridge: {
    id: 'bridge',
    name: 'Bridge API',
    category: 'banking',
    authType: 'oauth2',
    color: '#1a1a2e',
    logo: null,
    icon: Building2,
    description: 'Agrégateur bancaire multi-banques',
    shortDesc: 'Connectez n\'importe quelle banque',
    website: 'https://bridgeapi.io',
    capabilities: ['sync_transactions', 'rapprochement', 'multi_bank'],
    entityTypes: ['transaction'],
    syncDirections: ['pull'],
    status: 'coming_soon',
  },

  // ── Signature ─────────────────────────────────────────────────────────────

  yousign: {
    id: 'yousign',
    name: 'Yousign',
    category: 'signature',
    authType: 'api_key',
    color: '#0066ff',
    logo: null,
    icon: PenTool,
    description: 'Signature électronique conforme eIDAS',
    shortDesc: 'Envoi & suivi de signatures',
    website: 'https://yousign.com',
    capabilities: ['send_signature', 'track_status', 'download_signed'],
    entityTypes: ['devis', 'facture'],
    syncDirections: ['push'],
    status: 'available',
    apiKeyFields: [
      { key: 'api_key', label: 'Clé API Yousign', placeholder: 'ys_...', secret: true },
    ],
  },

  docusign: {
    id: 'docusign',
    name: 'DocuSign',
    category: 'signature',
    authType: 'oauth2',
    color: '#ffce00',
    logo: null,
    icon: PenTool,
    description: 'Signature électronique internationale',
    shortDesc: 'Envoi & suivi de signatures',
    website: 'https://www.docusign.com',
    capabilities: ['send_signature', 'track_status', 'download_signed'],
    entityTypes: ['devis', 'facture'],
    syncDirections: ['push'],
    status: 'coming_soon',
  },

  // ── Stockage ──────────────────────────────────────────────────────────────

  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'storage',
    authType: 'oauth2',
    color: '#4285f4',
    logo: null,
    icon: HardDrive,
    description: 'Sauvegardez vos PDF automatiquement',
    shortDesc: 'Upload auto des documents',
    website: 'https://drive.google.com',
    capabilities: ['auto_upload', 'organize_folders'],
    entityTypes: ['document'],
    syncDirections: ['push'],
    status: 'available',
    oauthConfig: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    },
  },

  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    authType: 'oauth2',
    color: '#0061ff',
    logo: null,
    icon: Cloud,
    description: 'Sauvegardez vos PDF sur Dropbox',
    shortDesc: 'Upload auto des documents',
    website: 'https://www.dropbox.com',
    capabilities: ['auto_upload', 'organize_folders'],
    entityTypes: ['document'],
    syncDirections: ['push'],
    status: 'coming_soon',
  },

  // ── Automatisation ────────────────────────────────────────────────────────

  webhooks: {
    id: 'webhooks',
    name: 'Webhooks',
    category: 'automation',
    authType: 'none',
    color: '#8b5cf6',
    logo: null,
    icon: Webhook,
    description: 'Envoyez des événements à vos outils',
    shortDesc: 'Notifications HTTP en temps réel',
    website: null,
    capabilities: ['outgoing_webhooks', 'hmac_signing'],
    entityTypes: [],
    syncDirections: ['push'],
    status: 'available',
    isConfigPage: true, // Opens a config page instead of connect modal
  },

  zapier: {
    id: 'zapier',
    name: 'Zapier',
    category: 'automation',
    authType: 'none',
    color: '#ff4a00',
    logo: null,
    icon: Zap,
    description: 'Connectez BatiGesti à 5000+ apps',
    shortDesc: 'Via webhooks sortants',
    website: 'https://zapier.com',
    capabilities: ['webhook_triggers'],
    entityTypes: [],
    syncDirections: ['push'],
    status: 'available',
    isExternalOnly: true, // Just a link to docs, uses webhooks
  },

  make: {
    id: 'make',
    name: 'Make (Integromat)',
    category: 'automation',
    authType: 'none',
    color: '#6d36c7',
    logo: null,
    icon: Zap,
    description: 'Automatisations visuelles puissantes',
    shortDesc: 'Via webhooks sortants',
    website: 'https://www.make.com',
    capabilities: ['webhook_triggers'],
    entityTypes: [],
    syncDirections: ['push'],
    status: 'coming_soon',
  },

  // ── Communication ─────────────────────────────────────────────────────────

  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'communication',
    authType: 'api_key',
    color: '#25d366',
    logo: null,
    icon: MessageCircle,
    description: 'Envoyez devis et relances via WhatsApp',
    shortDesc: 'Messages automatisés',
    website: 'https://business.whatsapp.com',
    capabilities: ['send_document', 'send_relance', 'send_rdv_confirmation'],
    entityTypes: ['devis', 'facture'],
    syncDirections: ['push'],
    status: 'coming_soon',
    apiKeyFields: [
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '123456789' },
      { key: 'access_token', label: 'Access Token', placeholder: 'EAA...', secret: true },
    ],
  },
};

// ── Category Definitions ────────────────────────────────────────────────────

export const CATEGORIES = {
  accounting: {
    id: 'accounting',
    label: 'Comptabilité',
    icon: Calculator,
    color: '#6366f1',
    description: 'Synchronisez vos factures et dépenses avec votre logiciel comptable',
  },
  calendar: {
    id: 'calendar',
    label: 'Agenda',
    icon: Calendar,
    color: '#3b82f6',
    description: 'Synchronisez vos chantiers et rendez-vous',
  },
  banking: {
    id: 'banking',
    label: 'Banque',
    icon: Building2,
    color: '#000000',
    description: 'Rapprochez vos transactions bancaires',
  },
  signature: {
    id: 'signature',
    label: 'Signature',
    icon: PenTool,
    color: '#f97316',
    description: 'Faites signer vos devis et factures électroniquement',
  },
  storage: {
    id: 'storage',
    label: 'Stockage',
    icon: HardDrive,
    color: '#22c55e',
    description: 'Sauvegardez automatiquement vos documents',
  },
  automation: {
    id: 'automation',
    label: 'Automatisation',
    icon: Zap,
    color: '#8b5cf6',
    description: 'Connectez BatiGesti à vos outils préférés',
  },
  communication: {
    id: 'communication',
    label: 'Communication',
    icon: MessageCircle,
    color: '#06b6d4',
    description: 'Envoyez vos documents par WhatsApp',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get all providers for a given category
 */
export function getProvidersByCategory(category) {
  return Object.values(PROVIDERS).filter(p => p.category === category);
}

/**
 * Get a provider by its ID
 */
export function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

/**
 * Get all categories as ordered array
 */
export function getCategoryList() {
  return Object.values(CATEGORIES);
}

/**
 * Get all available providers (non-coming-soon)
 */
export function getAvailableProviders() {
  return Object.values(PROVIDERS).filter(p => p.status === 'available');
}

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = [
  { id: 'devis.created', label: 'Devis créé', category: 'devis' },
  { id: 'devis.sent', label: 'Devis envoyé', category: 'devis' },
  { id: 'devis.signed', label: 'Devis signé', category: 'devis' },
  { id: 'devis.accepted', label: 'Devis accepté', category: 'devis' },
  { id: 'devis.refused', label: 'Devis refusé', category: 'devis' },
  { id: 'facture.created', label: 'Facture créée', category: 'facture' },
  { id: 'facture.sent', label: 'Facture envoyée', category: 'facture' },
  { id: 'facture.paid', label: 'Facture payée', category: 'facture' },
  { id: 'chantier.created', label: 'Chantier créé', category: 'chantier' },
  { id: 'chantier.started', label: 'Chantier démarré', category: 'chantier' },
  { id: 'chantier.completed', label: 'Chantier terminé', category: 'chantier' },
  { id: 'payment.received', label: 'Paiement reçu', category: 'paiement' },
  { id: 'client.created', label: 'Client créé', category: 'client' },
];

export default PROVIDERS;
