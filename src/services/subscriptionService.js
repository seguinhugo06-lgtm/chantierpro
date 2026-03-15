/**
 * subscriptionService — Gestion des abonnements SaaS via Stripe
 *
 * - createCheckoutSession : Crée une session Stripe Checkout pour l'upgrade
 * - createPortalSession : Crée une session Stripe Customer Portal (gérer abonnement)
 */

import supabase, { isDemo } from '../supabaseClient';

/**
 * Crée une session Stripe Checkout pour souscrire à un plan
 * @param {string} planId - 'artisan' | 'equipe'
 * @param {'monthly'|'yearly'} interval - Fréquence de facturation
 * @returns {Promise<{ url: string }>}
 */
export const createCheckoutSession = async (planId, interval = 'monthly') => {
  if (isDemo || !supabase) {
    // En mode démo, simule un changement de plan via localStorage
    localStorage.setItem('cp_demo_plan', planId);
    return { url: null, demo: true };
  }

  const { data, error } = await supabase.functions.invoke('subscription-billing', {
    body: {
      action: 'create-checkout',
      planId,
      interval,
      successUrl: `${window.location.origin}/?upgraded=true`,
      cancelUrl: `${window.location.origin}/?upgrade_cancelled=true`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data; // { url }
};

/**
 * Crée une session Stripe Customer Portal pour gérer l'abonnement
 * @returns {Promise<{ url: string }>}
 */
export const createPortalSession = async () => {
  if (isDemo || !supabase) {
    return { url: null, demo: true };
  }

  const { data, error } = await supabase.functions.invoke('subscription-billing', {
    body: {
      action: 'create-portal',
      returnUrl: window.location.origin,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data; // { url }
};

export default {
  createCheckoutSession,
  createPortalSession,
};
