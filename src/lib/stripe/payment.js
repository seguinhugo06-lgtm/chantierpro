/**
 * Module de paiement Stripe pour BatiGesti
 * Gère les paiements via Stripe Checkout Sessions (Edge Function)
 * et conserve le mode démo pour les environnements sans Stripe
 */

import supabase, { isDemo } from '../../supabaseClient';

/**
 * Crée une session Stripe Checkout via l'Edge Function
 * @param {string} paymentToken - Token de paiement de la facture
 * @returns {Object} - { url: string, session_id: string }
 */
export const createCheckoutSession = async (paymentToken) => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      payment_token: paymentToken,
      success_url: `${window.location.origin}/facture/payer/${paymentToken}?status=success`,
      cancel_url: `${window.location.origin}/facture/payer/${paymentToken}?status=cancel`
    }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data; // { url, session_id }
};

/**
 * Génère un lien de paiement public pour une facture
 * @param {string} paymentToken - Token de paiement
 * @returns {string} - URL publique de paiement
 */
export const getPaymentPageUrl = (paymentToken) => {
  return `${window.location.origin}/facture/payer/${paymentToken}`;
};

/**
 * Génère un lien de paiement Stripe (mode démo ou via payment token)
 * @param {Object} params - Paramètres du paiement
 * @returns {Object} - { paymentUrl, paymentId }
 */
export const createPaymentLink = async ({ devisId, amount, clientEmail, description, type = 'acompte', paymentToken = null }) => {
  // If we have a payment token, use the public payment page URL
  if (paymentToken) {
    const paymentUrl = getPaymentPageUrl(paymentToken);
    return {
      paymentId: `pt_${paymentToken.substring(0, 8)}`,
      paymentUrl,
      amount,
      type,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // Fallback: demo mode link
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const baseUrl = 'https://buy.stripe.com/test';
  const params = new URLSearchParams({
    client_reference_id: devisId,
    prefilled_email: clientEmail || '',
  });

  return {
    paymentId,
    paymentUrl: `${baseUrl}?${params.toString()}`,
    amount,
    type,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
};

/**
 * Génère les données pour le QR Code de paiement
 * @param {string} paymentUrl - URL du paiement
 * @returns {string} - URL à encoder dans le QR code
 */
export const generateQRCodeData = (paymentUrl) => {
  return paymentUrl;
};

/**
 * Formate le montant pour l'affichage
 * @param {number} amount - Montant en euros
 * @returns {string} - Montant formaté
 */
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Calcule le montant d'acompte recommandé
 * @param {number} totalTTC - Total TTC du devis
 * @param {number} percentage - Pourcentage d'acompte (défaut 30%)
 * @returns {number} - Montant de l'acompte
 */
export const calculateAcompte = (totalTTC, percentage = 30) => {
  return Math.round(totalTTC * (percentage / 100) * 100) / 100;
};

/**
 * Vérifie le statut d'un paiement
 * @param {string} paymentId - ID du paiement
 * @returns {Object} - Statut du paiement
 */
export const checkPaymentStatus = async (paymentId) => {
  return {
    paymentId,
    status: 'pending',
    lastChecked: new Date().toISOString()
  };
};

/**
 * Liste des montants d'acompte pré-définis
 */
export const ACOMPTE_OPTIONS = [
  { value: 20, label: '20%', description: 'Petit chantier' },
  { value: 30, label: '30%', description: 'Standard (recommandé)' },
  { value: 40, label: '40%', description: 'Chantier matériel' },
  { value: 50, label: '50%', description: 'Gros chantier' },
];

/**
 * Statuts de paiement avec labels et couleurs
 */
export const PAYMENT_STATUS = {
  pending: { label: 'En attente', color: 'amber', icon: 'Clock' },
  processing: { label: 'En cours', color: 'blue', icon: 'Loader' },
  succeeded: { label: 'Payé', color: 'green', icon: 'CheckCircle' },
  failed: { label: 'Échoué', color: 'red', icon: 'XCircle' },
  refunded: { label: 'Remboursé', color: 'purple', icon: 'RotateCcw' }
};

export default {
  createPaymentLink,
  createCheckoutSession,
  getPaymentPageUrl,
  generateQRCodeData,
  formatAmount,
  calculateAcompte,
  checkPaymentStatus,
  ACOMPTE_OPTIONS,
  PAYMENT_STATUS
};
