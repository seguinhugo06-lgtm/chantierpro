/**
 * Module de paiement Stripe pour ChantierPro
 * Gere les paiements d'acompte et de solde via Stripe Payment Links
 */

// Configuration Stripe (utiliser les variables d'environnement en production)
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_demo';

/**
 * Genere un lien de paiement Stripe pour un montant donne
 * En mode demo, retourne un lien simule
 * @param {Object} params - Parametres du paiement
 * @param {string} params.devisId - ID du devis/facture
 * @param {number} params.amount - Montant en euros
 * @param {string} params.clientEmail - Email du client
 * @param {string} params.description - Description du paiement
 * @param {string} params.type - Type: 'acompte' ou 'solde'
 * @returns {Object} - { paymentUrl, paymentId }
 */
export const createPaymentLink = async ({ devisId, amount, clientEmail, description, type = 'acompte' }) => {
  // En mode demo, generer un lien simule
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // URL de paiement Stripe Payment Link
  // En production, ceci serait genere via l'API Stripe
  const baseUrl = 'https://buy.stripe.com/test';
  const params = new URLSearchParams({
    client_reference_id: devisId,
    prefilled_email: clientEmail || '',
    // En production: amount serait configure via l'API
  });

  // Pour demo: utiliser un lien generique
  const paymentUrl = `${baseUrl}?${params.toString()}`;

  return {
    paymentId,
    paymentUrl,
    amount,
    type,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
};

/**
 * Genere les donnees pour le QR Code de paiement
 * @param {string} paymentUrl - URL du paiement Stripe
 * @returns {string} - URL a encoder dans le QR code
 */
export const generateQRCodeData = (paymentUrl) => {
  return paymentUrl;
};

/**
 * Formate le montant pour l'affichage
 * @param {number} amount - Montant en euros
 * @returns {string} - Montant formate
 */
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Calcule le montant d'acompte recommande
 * @param {number} totalTTC - Total TTC du devis
 * @param {number} percentage - Pourcentage d'acompte (defaut 30%)
 * @returns {number} - Montant de l'acompte
 */
export const calculateAcompte = (totalTTC, percentage = 30) => {
  return Math.round(totalTTC * (percentage / 100) * 100) / 100;
};

/**
 * Verifie le statut d'un paiement
 * En production, ceci interrogerait l'API Stripe
 * @param {string} paymentId - ID du paiement
 * @returns {Object} - Statut du paiement
 */
export const checkPaymentStatus = async (paymentId) => {
  // En mode demo, retourner un statut simule
  return {
    paymentId,
    status: 'pending', // 'pending', 'succeeded', 'failed'
    lastChecked: new Date().toISOString()
  };
};

/**
 * Liste des montants d'acompte pre-definis
 */
export const ACOMPTE_OPTIONS = [
  { value: 20, label: '20%', description: 'Petit chantier' },
  { value: 30, label: '30%', description: 'Standard (recommande)' },
  { value: 40, label: '40%', description: 'Chantier materiel' },
  { value: 50, label: '50%', description: 'Gros chantier' },
];

/**
 * Statuts de paiement avec labels et couleurs
 */
export const PAYMENT_STATUS = {
  pending: { label: 'En attente', color: 'amber', icon: 'Clock' },
  processing: { label: 'En cours', color: 'blue', icon: 'Loader' },
  succeeded: { label: 'Paye', color: 'green', icon: 'CheckCircle' },
  failed: { label: 'Echoue', color: 'red', icon: 'XCircle' },
  refunded: { label: 'Rembourse', color: 'purple', icon: 'RotateCcw' }
};

export default {
  createPaymentLink,
  generateQRCodeData,
  formatAmount,
  calculateAcompte,
  checkPaymentStatus,
  ACOMPTE_OPTIONS,
  PAYMENT_STATUS
};
