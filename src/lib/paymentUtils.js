/**
 * paymentUtils.js — Pure utility functions for online payment system
 *
 * Fee calculations, formatting, constants, and helpers for
 * Stripe Connect and GoCardless SEPA integrations.
 *
 * @module paymentUtils
 */

// ─── Fee Constants ──────────────────────────────────────────────────

/** Stripe fee: 1.5% + 0.25€ (Europe/EEA cards) */
export const STRIPE_FEE_RATE = 0.015;
export const STRIPE_FEE_FIXED_CENTIMES = 25;

/** GoCardless fee: 0.2% + 0.20€, capped at 5€ */
export const GOCARDLESS_FEE_RATE = 0.002;
export const GOCARDLESS_FEE_FIXED_CENTIMES = 20;
export const GOCARDLESS_FEE_MAX_CENTIMES = 500;

// ─── Payment Status ─────────────────────────────────────────────────

export const PAYMENT_STATUS = {
  pending: {
    key: 'pending',
    label: 'En attente',
    color: 'amber',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'Clock',
  },
  processing: {
    key: 'processing',
    label: 'En cours',
    color: 'blue',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'Loader',
  },
  succeeded: {
    key: 'succeeded',
    label: 'Payé',
    color: 'green',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'CheckCircle',
  },
  failed: {
    key: 'failed',
    label: 'Échoué',
    color: 'red',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    icon: 'XCircle',
  },
  refunded: {
    key: 'refunded',
    label: 'Remboursé',
    color: 'purple',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'RotateCcw',
  },
  partially_refunded: {
    key: 'partially_refunded',
    label: 'Remb. partiel',
    color: 'purple',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'RotateCcw',
  },
};

// ─── Payment Providers ──────────────────────────────────────────────

export const PAYMENT_PROVIDERS = {
  stripe: {
    key: 'stripe',
    label: 'Stripe',
    icon: 'CreditCard',
    color: '#635bff',
    methods: ['card'],
  },
  gocardless: {
    key: 'gocardless',
    label: 'GoCardless',
    icon: 'Building2',
    color: '#00827f',
    methods: ['sepa_debit'],
  },
  offline: {
    key: 'offline',
    label: 'Hors ligne',
    icon: 'Banknote',
    color: '#64748b',
    methods: ['virement', 'cheque', 'especes', 'cb', 'autre'],
  },
};

// ─── Payment Link Status ────────────────────────────────────────────

export const LINK_STATUS = {
  actif: { label: 'Actif', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  paye: { label: 'Payé', color: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  expire: { label: 'Expiré', color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700' },
  annule: { label: 'Annulé', color: 'red', bg: 'bg-red-100', text: 'text-red-700' },
};

// ─── Fee Calculation ────────────────────────────────────────────────

/**
 * Calculate Stripe fees in centimes
 * @param {number} montantCentimes - Amount in centimes
 * @returns {number} Fee in centimes
 */
export function calculateStripeFees(montantCentimes) {
  return Math.round(montantCentimes * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_CENTIMES);
}

/**
 * Calculate GoCardless fees in centimes (capped at 5€)
 * @param {number} montantCentimes - Amount in centimes
 * @returns {number} Fee in centimes
 */
export function calculateGoCardlessFees(montantCentimes) {
  const fee = Math.round(montantCentimes * GOCARDLESS_FEE_RATE + GOCARDLESS_FEE_FIXED_CENTIMES);
  return Math.min(fee, GOCARDLESS_FEE_MAX_CENTIMES);
}

/**
 * Calculate net amount received by artisan after fees
 * @param {number} montantCentimes - Base amount in centimes
 * @param {'stripe'|'gocardless'|'offline'} provider
 * @param {boolean} absorbFees - Whether artisan absorbs fees (default true)
 * @returns {{ net: number, fees: number, clientPays: number }}
 */
export function calculatePaymentAmounts(montantCentimes, provider, absorbFees = true) {
  let fees = 0;

  if (provider === 'stripe') {
    fees = calculateStripeFees(montantCentimes);
  } else if (provider === 'gocardless') {
    fees = calculateGoCardlessFees(montantCentimes);
  }

  if (absorbFees) {
    // Artisan absorbs: client pays exact amount, artisan receives less
    return {
      net: montantCentimes - fees,
      fees,
      clientPays: montantCentimes,
    };
  } else {
    // Client pays: client pays amount + fees, artisan receives full amount
    return {
      net: montantCentimes,
      fees,
      clientPays: montantCentimes + fees,
    };
  }
}

// ─── Currency Conversion ────────────────────────────────────────────

/**
 * Convert euros to centimes, avoiding floating point issues
 * @param {number} euros
 * @returns {number}
 */
export function eurosToCentimes(euros) {
  return Math.round((euros || 0) * 100);
}

/**
 * Convert centimes to euros
 * @param {number} centimes
 * @returns {number}
 */
export function centimesToEuros(centimes) {
  return (centimes || 0) / 100;
}

/**
 * Format centimes as currency string
 * @param {number} centimes
 * @returns {string} e.g. "574,20 €"
 */
export function formatCentimes(centimes) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(centimesToEuros(centimes));
}

// ─── Payment Token ──────────────────────────────────────────────────

/**
 * Generate a unique payment token (21 chars alphanumeric)
 * Uses crypto.getRandomValues for security
 * @returns {string}
 */
export function generatePaymentToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(21);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Check if a payment link is expired
 * @param {{ expires_at?: string, statut?: string }} link
 * @returns {boolean}
 */
export function isPaymentLinkExpired(link) {
  if (!link) return true;
  if (link.statut === 'expire' || link.statut === 'annule') return true;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return true;
  return false;
}

/**
 * Check if a payment link is already paid
 * @param {{ statut?: string }} link
 * @returns {boolean}
 */
export function isPaymentLinkPaid(link) {
  return link?.statut === 'paye';
}

/**
 * Get human-readable payment method label
 * @param {string} method - e.g. 'card', 'sepa_debit'
 * @param {string} [brand] - e.g. 'visa', 'mastercard'
 * @param {string} [last4] - e.g. '4242'
 * @returns {string}
 */
export function getPaymentMethodLabel(method, brand, last4) {
  const labels = {
    card: 'Carte bancaire',
    sepa_debit: 'Prélèvement SEPA',
    bank_transfer: 'Virement bancaire',
    virement: 'Virement bancaire',
    cheque: 'Chèque',
    especes: 'Espèces',
    cb: 'Carte bancaire',
    autre: 'Autre',
  };

  let label = labels[method] || method || 'Inconnu';

  if (brand && last4) {
    const brandLabels = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'Amex',
      discover: 'Discover',
    };
    label = `${brandLabels[brand] || brand} ****${last4}`;
  }

  return label;
}

/**
 * Get provider label
 * @param {string} provider
 * @returns {string}
 */
export function getProviderLabel(provider) {
  return PAYMENT_PROVIDERS[provider]?.label || provider || 'Inconnu';
}

/**
 * Build payment page URL from token
 * @param {string} token
 * @returns {string}
 */
export function buildPaymentUrl(token) {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://batigesti.vercel.app';
  return `${origin}/pay/${token}`;
}

/**
 * Build payment stats from transactions list
 * @param {Array} transactions
 * @param {Array} links
 * @returns {Object}
 */
export function buildPaymentStats(transactions = [], links = []) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonth = transactions.filter(
    (t) => t.statut === 'succeeded' && new Date(t.created_at) >= startOfMonth
  );

  const totalEncaisse = thisMonth.reduce((sum, t) => sum + (t.montant_centimes || 0), 0);
  const totalFrais = thisMonth.reduce((sum, t) => sum + (t.frais_centimes || 0), 0);

  const activeLinks = links.filter((l) => l.statut === 'actif');
  const enAttente = activeLinks.reduce((sum, l) => sum + (l.montant_centimes || 0), 0);

  const paidLinks = links.filter((l) => l.statut === 'paye').length;
  const totalLinks = links.length;
  const tauxConversion = totalLinks > 0 ? Math.round((paidLinks / totalLinks) * 100) : 0;

  // Average payment delay (days between link creation and payment)
  const paidWithDelay = links
    .filter((l) => l.statut === 'paye' && l.paid_at && l.created_at)
    .map((l) => (new Date(l.paid_at) - new Date(l.created_at)) / 86400000);
  const delaiMoyen = paidWithDelay.length > 0
    ? Math.round(paidWithDelay.reduce((a, b) => a + b, 0) / paidWithDelay.length)
    : null;

  return {
    totalEncaisse,
    totalFrais,
    enAttente,
    tauxConversion,
    delaiMoyen,
    countThisMonth: thisMonth.length,
    countActiveLinks: activeLinks.length,
  };
}

/**
 * Default payment link expiration (90 days)
 */
export const DEFAULT_LINK_EXPIRY_DAYS = 90;
