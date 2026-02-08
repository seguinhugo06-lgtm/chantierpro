import { create } from 'zustand';

/**
 * Subscription & Freemium Store (Zustand)
 *
 * Manages the active user plan, subscription state, usage tracking,
 * and feature-gate checks. Works in both demo and production modes.
 *
 * Plans: gratuit (free), pro (14,90€/mois ou 149€/an — RECOMMANDÉ)
 */

// ─── Plan catalog (static, matches DB seed) ────────────────────────────────

export const PLANS = {
  gratuit: {
    id: 'gratuit',
    name: 'Gratuit',
    description: 'Pour démarrer avec ChantierPro',
    target: 'Artisans qui découvrent',
    priceMonthly: 0,
    priceYearly: 0,
    limits: { devis: 3, clients: 5, chantiers: 1, catalogue: 20, signatures: 0, ia_analyses: 0, photos: 50, storage_mb: 500, equipe: 0 },
    features: ['devis_basic', 'clients_basic', 'chantiers_basic', 'catalogue', 'planning'],
    featureLabels: [
      { name: '3 devis par mois', included: true },
      { name: '5 clients', included: true },
      { name: '1 chantier actif', included: true },
      { name: '20 articles catalogue', included: true },
      { name: 'Planning', included: true },
      { name: 'Signatures électroniques', included: false },
      { name: 'Export comptable', included: false },
      { name: 'Trésorerie', included: false },
      { name: 'IA Devis', included: false },
      { name: 'Statistiques avancées', included: false },
      { name: 'Support prioritaire', included: false }
    ],
    badge: null,
    color: '#6B7280',
    borderColor: '#D1D5DB',
    bgColor: '#F3F4F6',
    support: 'email'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Toute la puissance ChantierPro',
    target: 'Artisans et PME',
    priceMonthly: 14.90,
    priceYearly: 149,
    limits: { devis: -1, clients: -1, chantiers: -1, catalogue: -1, signatures: -1, ia_analyses: 5, photos: -1, storage_mb: 10240, equipe: 5 },
    features: [
      'devis_basic', 'clients_basic', 'chantiers_basic', 'catalogue',
      'planning', 'signatures', 'export_comptable', 'rapports_pdf',
      'relances', 'portal_client', 'tresorerie', 'ia_devis',
      'sous_traitants', 'commandes', 'entretien', 'analytics'
    ],
    featureLabels: [
      { name: 'Devis & factures illimités', included: true },
      { name: 'Clients illimités', included: true },
      { name: 'Chantiers illimités', included: true },
      { name: 'Catalogue illimité', included: true },
      { name: 'Planning', included: true },
      { name: 'Signatures électroniques', included: true },
      { name: 'Export comptable (FEC)', included: true },
      { name: 'Trésorerie & Bilan', included: true },
      { name: 'IA Devis (5/mois)', included: true },
      { name: 'Statistiques avancées', included: true },
      { name: 'Jusqu\'à 5 utilisateurs', included: true },
      { name: '10 Go stockage', included: true },
      { name: 'Support prioritaire', included: true }
    ],
    badge: 'RECOMMANDÉ',
    color: '#F97316',
    borderColor: '#FB923C',
    bgColor: '#FED7AA',
    support: 'prioritaire'
  }
};

// Yearly discount percentage
export const YEARLY_DISCOUNT = 17;

// Ordered plan tiers for comparison
export const PLAN_ORDER = ['gratuit', 'pro'];

// Feature → minimum plan mapping (derived from PLANS for fast lookup)
const FEATURE_MIN_PLAN = {};
for (const planId of PLAN_ORDER) {
  for (const feat of PLANS[planId].features) {
    if (!(feat in FEATURE_MIN_PLAN)) {
      FEATURE_MIN_PLAN[feat] = planId;
    }
  }
}

// Page-id → required feature mapping (for sidebar gating)
export const PAGE_FEATURE_MAP = {
  signatures: 'signatures',
  export: 'export_comptable',
  tresorerie: 'tresorerie',
  'ia-devis': 'ia_devis',
  soustraitants: 'sous_traitants',
  commandes: 'commandes',
  entretien: 'entretien'
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compare plan tiers. Returns -1, 0, or 1.
 */
export function comparePlans(a, b) {
  return PLAN_ORDER.indexOf(a) - PLAN_ORDER.indexOf(b);
}

/**
 * Get the minimum plan required for a feature.
 * @param {string} feature
 * @returns {string|null} plan ID or null if unknown
 */
export function getMinPlanForFeature(feature) {
  return FEATURE_MIN_PLAN[feature] || null;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const DEFAULT_USAGE = {
  devis: 0,
  clients: 0,
  chantiers: 0,
  catalogue: 0,
  signatures: 0,
  ia_analyses: 0,
  photos: 0,
  storage_mb: 0,
  equipe: 0
};

// ─── Contextual upgrade messages ────────────────────────────────────────────

export const UPGRADE_CONTEXTS = {
  devis_limit: {
    title: 'Limite de devis atteinte',
    subtitle: 'Passez au plan Pro pour créer des devis illimités',
    highlight: 'devis',
    recommendedPlan: 'pro'
  },
  clients_limit: {
    title: 'Limite de clients atteinte',
    subtitle: 'Passez au plan Pro pour gérer des clients illimités',
    highlight: 'clients',
    recommendedPlan: 'pro'
  },
  signatures: {
    title: 'Signatures électroniques',
    subtitle: 'Signez directement vos devis et factures avec vos clients',
    highlight: 'signatures',
    recommendedPlan: 'pro'
  },
  ia_devis: {
    title: 'Analyse IA — Débloquez en plan Pro',
    subtitle: 'Générez des devis automatiquement à partir de photos et descriptions',
    highlight: 'ia_devis',
    recommendedPlan: 'pro'
  },
  export_fec: {
    title: 'Export FEC — Plan Pro requis',
    subtitle: 'Exportez vos données comptables au format FEC pour votre expert-comptable',
    highlight: 'export_comptable',
    recommendedPlan: 'pro'
  },
  equipe: {
    title: 'Gestion d\'équipe',
    subtitle: 'Invitez vos collaborateurs et gérez les permissions',
    highlight: 'equipe',
    recommendedPlan: 'pro'
  },
  tresorerie: {
    title: 'Trésorerie & Bilan — Plan Pro requis',
    subtitle: 'Suivez votre trésorerie et vos bilans de chantiers en temps réel',
    highlight: 'tresorerie',
    recommendedPlan: 'pro'
  },
  analytics: {
    title: 'Statistiques avancées — Plan Pro requis',
    subtitle: 'Analysez vos performances et prenez de meilleures décisions',
    highlight: 'analytics',
    recommendedPlan: 'pro'
  },
  generic: {
    title: 'Passez au plan Pro',
    subtitle: 'Débloquez toutes les fonctionnalités de ChantierPro',
    highlight: null,
    recommendedPlan: 'pro'
  }
};

export const useSubscriptionStore = create((set, get) => ({
  // Current plan ID
  planId: 'gratuit',

  // Subscription record from DB
  subscription: null,

  // Current period usage
  usage: { ...DEFAULT_USAGE },

  // Loading states
  loading: true,
  error: null,

  // Whether the upgrade modal is open
  upgradeModalOpen: false,
  upgradeModalFeature: null, // which feature triggered it

  // ─── Computed helpers (called as functions) ─────────────────────────────

  /**
   * Get the full plan object for current plan
   */
  getPlan: () => PLANS[get().planId] || PLANS.gratuit,

  /**
   * Get limit value for a resource. -1 = unlimited
   */
  getLimit: (resource) => {
    const plan = PLANS[get().planId] || PLANS.gratuit;
    return plan.limits[resource] ?? 0;
  },

  /**
   * Check if user has a specific feature
   */
  hasFeature: (feature) => {
    const plan = PLANS[get().planId] || PLANS.gratuit;
    return plan.features.includes(feature);
  },

  /**
   * Check if a resource limit is reached
   * @returns {{ allowed: boolean, current: number, limit: number, percent: number }}
   */
  checkLimit: (resource) => {
    const { usage, planId } = get();
    const plan = PLANS[planId] || PLANS.gratuit;
    const limit = plan.limits[resource] ?? 0;
    const current = usage[resource] ?? 0;

    if (limit === -1) {
      return { allowed: true, current, limit: -1, percent: 0 };
    }
    return {
      allowed: current < limit,
      current,
      limit,
      percent: limit > 0 ? Math.round((current / limit) * 100) : 100
    };
  },

  /**
   * Is on free plan?
   */
  isFree: () => get().planId === 'gratuit',

  /**
   * Is trial active?
   */
  isTrial: () => get().subscription?.status === 'trialing',

  /**
   * Days remaining in trial (0 if not trialing)
   */
  trialDaysLeft: () => {
    const sub = get().subscription;
    if (!sub?.trial_end) return 0;
    const diff = new Date(sub.trial_end) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  /**
   * Is the plan at least the given tier?
   */
  isAtLeast: (planId) => comparePlans(get().planId, planId) >= 0,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Set plan + subscription data (called after API fetch)
   */
  setSubscription: (subscription) => {
    set({
      subscription,
      planId: subscription?.plan || 'gratuit',
      loading: false,
      error: null
    });
  },

  /**
   * Set usage data
   */
  setUsage: (usage) => {
    set({ usage: { ...DEFAULT_USAGE, ...usage } });
  },

  /**
   * Increment a usage counter locally (optimistic)
   */
  incrementUsage: (resource, amount = 1) => {
    set((state) => ({
      usage: {
        ...state.usage,
        [resource]: (state.usage[resource] || 0) + amount
      }
    }));
  },

  /**
   * Open the upgrade modal, optionally with the feature that triggered it
   */
  openUpgradeModal: (feature = null) => {
    set({ upgradeModalOpen: true, upgradeModalFeature: feature });
  },

  /**
   * Close the upgrade modal
   */
  closeUpgradeModal: () => {
    set({ upgradeModalOpen: false, upgradeModalFeature: null });
  },

  /**
   * Set loading state
   */
  setLoading: (loading) => set({ loading }),

  /**
   * Set error state
   */
  setError: (error) => set({ error, loading: false }),

  /**
   * Reset to free plan (e.g. on sign-out)
   */
  reset: () => {
    set({
      planId: 'gratuit',
      subscription: null,
      usage: { ...DEFAULT_USAGE },
      loading: false,
      error: null,
      upgradeModalOpen: false,
      upgradeModalFeature: null
    });
  }
}));

// ─── Convenience accessors (outside React) ──────────────────────────────────

export const subscription = {
  getPlan: () => useSubscriptionStore.getState().getPlan(),
  hasFeature: (f) => useSubscriptionStore.getState().hasFeature(f),
  checkLimit: (r) => useSubscriptionStore.getState().checkLimit(r),
  isFree: () => useSubscriptionStore.getState().isFree(),
  isAtLeast: (p) => useSubscriptionStore.getState().isAtLeast(p),
  openUpgrade: (f) => useSubscriptionStore.getState().openUpgradeModal(f)
};

export default useSubscriptionStore;
