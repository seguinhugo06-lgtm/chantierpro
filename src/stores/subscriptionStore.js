/**
 * subscriptionStore — Zustand store for subscription plan management.
 *
 * Manages the current user's subscription plan, feature gating,
 * trial status, and upgrade modal. Supports demo mode via localStorage.
 */

import { create } from 'zustand';
import { openModal } from './modalStore';

// ── Plan definitions ─────────────────────────────────────────────

export const PLANS = {
  gratuit: {
    name: 'Gratuit',
    price: { monthly: 0, yearly: 0 },
    limits: { devis: 5, clients: 10, chantiers: 3, equipe: 0, catalogue: 50 },
    features: [
      'devis_basic',
      'clients',
      'chantiers',
      'catalogue_basic',
      'planning_basic',
    ],
  },
  artisan: {
    name: 'Artisan',
    price: { monthly: 14.90, yearly: 149 },
    limits: { devis: -1, clients: -1, chantiers: -1, equipe: 0, catalogue: -1 },
    features: [
      'devis_basic',
      'clients',
      'chantiers',
      'catalogue_basic',
      'planning_basic',
      'signatures',
      'relances',
      'catalogue_complet',
      'export_pdf',
      'devis_ia',
      'conformite_2026',
    ],
  },
  equipe: {
    name: 'Équipe',
    price: { monthly: 29.90, yearly: 299 },
    limits: { devis: -1, clients: -1, chantiers: -1, equipe: 10, catalogue: -1 },
    features: [
      'devis_basic',
      'clients',
      'chantiers',
      'catalogue_basic',
      'planning_basic',
      'signatures',
      'relances',
      'catalogue_complet',
      'export_pdf',
      'devis_ia',
      'conformite_2026',
      'tresorerie',
      'equipe',
      'planning_avance',
      'pointage',
      'conges',
      'sous_traitants',
      'portail_client',
      'audit_trail',
    ],
  },
};

export const PLAN_ORDER = ['gratuit', 'artisan', 'equipe'];

// ── Legacy plan name mapping ─────────────────────────────────────

const LEGACY_MAP = {
  free: 'gratuit',
  decouverte: 'gratuit',
  solo: 'gratuit',
  pro: 'equipe',
  entreprise: 'equipe',
};

/**
 * Normalize a plan ID from DB (which may use legacy names) to canonical IDs.
 */
export function normalizePlanId(raw) {
  if (!raw) return 'gratuit';
  const lower = raw.toLowerCase().trim();
  if (PLANS[lower]) return lower;
  return LEGACY_MAP[lower] || 'gratuit';
}

// ── Demo mode helpers ────────────────────────────────────────────

const DEMO_PLAN_KEY = 'cp_demo_plan';
const DEMO_SUBSCRIPTION = {
  id: 'demo-sub',
  plan: 'artisan',
  status: 'active',
  trialEnd: null,
  currentPeriodEnd: null,
};

function getDemoPlan() {
  try {
    return localStorage.getItem(DEMO_PLAN_KEY) || 'artisan';
  } catch {
    return 'artisan';
  }
}

// ── Store ────────────────────────────────────────────────────────

export const useSubscriptionStore = create((set, get) => ({
  // State
  planId: 'gratuit',
  subscription: null,
  loading: true,

  // ── Derived methods ────────────────────────────────────────

  /**
   * Check if current subscription is in trial period.
   */
  isTrial: () => {
    const { subscription } = get();
    if (!subscription) return false;
    if (subscription.status !== 'trialing') return false;
    const trialEnd = subscription.trialEnd || subscription.trial_end;
    if (!trialEnd) return false;
    return new Date(trialEnd) > new Date();
  },

  /**
   * Get number of trial days remaining.
   */
  trialDaysLeft: () => {
    const { subscription } = get();
    if (!subscription) return 0;
    const trialEnd = subscription.trialEnd || subscription.trial_end;
    if (!trialEnd) return 0;
    const diff = new Date(trialEnd) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  /**
   * Check if the current plan includes a given feature.
   */
  canUse: (feature) => {
    const { planId } = get();
    const plan = PLANS[planId];
    if (!plan) return false;
    return plan.features.includes(feature);
  },

  /**
   * Check if usage has reached the plan limit for a resource.
   * Returns true if at or above limit. Limit -1 = unlimited.
   */
  isAtLimit: (resource, currentCount) => {
    const { planId } = get();
    const plan = PLANS[planId];
    if (!plan) return false;
    const limit = plan.limits[resource];
    if (limit === -1) return false;
    return currentCount >= limit;
  },

  /**
   * Get the minimum plan required for a feature.
   */
  getMinPlan: (feature) => {
    for (const id of PLAN_ORDER) {
      if (PLANS[id].features.includes(feature)) return id;
    }
    return 'equipe';
  },

  /**
   * Open the upgrade modal.
   */
  openUpgradeModal: (options = {}) => {
    openModal('upgrade', {
      currentPlan: get().planId,
      ...options,
    }, { size: 'lg' });
  },

  // ── Actions ────────────────────────────────────────────────

  /**
   * Set the plan ID (with normalization).
   */
  setPlanId: (raw) => {
    set({ planId: normalizePlanId(raw) });
  },

  /**
   * Set the full subscription object.
   */
  setSubscription: (sub) => {
    const planId = normalizePlanId(sub?.plan || sub?.planId);
    set({ subscription: sub, planId, loading: false });
  },

  /**
   * Hydrate the store from Supabase or demo mode.
   */
  hydrate: async (supabase, userId, isDemo) => {
    if (isDemo || !supabase || !userId) {
      const demoPlan = getDemoPlan();
      set({
        planId: normalizePlanId(demoPlan),
        subscription: { ...DEMO_SUBSCRIPTION, plan: demoPlan },
        loading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan, status, trial_end, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // No subscription row → free plan
        set({ planId: 'gratuit', subscription: null, loading: false });
        return;
      }

      set({
        planId: normalizePlanId(data.plan),
        subscription: {
          id: data.id,
          plan: data.plan,
          status: data.status,
          trialEnd: data.trial_end,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id,
        },
        loading: false,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[subscriptionStore] Hydrate error:', err);
      set({ planId: 'gratuit', subscription: null, loading: false });
    }
  },

  /**
   * Start a Stripe Checkout session for upgrading the plan.
   * @param {string} planId - 'artisan' | 'equipe'
   * @param {'monthly'|'yearly'} interval
   */
  startCheckout: async (planId, interval = 'monthly') => {
    const { createCheckoutSession } = await import('../services/subscriptionService');
    const result = await createCheckoutSession(planId, interval);
    if (result.demo) {
      // Demo mode — plan changed locally
      set({ planId: normalizePlanId(planId) });
      return { demo: true };
    }
    if (result.url) {
      window.location.href = result.url;
    }
    return result;
  },

  /**
   * Open Stripe Customer Portal for subscription management.
   */
  openBillingPortal: async () => {
    const { createPortalSession } = await import('../services/subscriptionService');
    const result = await createPortalSession();
    if (result.demo) return { demo: true };
    if (result.url) {
      window.location.href = result.url;
    }
    return result;
  },

  /**
   * Reset the store (on logout).
   */
  reset: () => set({ planId: 'gratuit', subscription: null, loading: true }),
}));

export default useSubscriptionStore;
