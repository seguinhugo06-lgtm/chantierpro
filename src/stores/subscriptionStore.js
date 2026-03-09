import { create } from 'zustand';

/**
 * Subscription & Freemium Store (Zustand)
 *
 * Manages the active user plan, subscription state, usage tracking,
 * and feature-gate checks. Works in both demo and production modes.
 *
 * Plans: gratuit (free), artisan (14,90€/mois — POPULAIRE), equipe (29,90€/mois — RECOMMANDÉ)
 */

// ─── Plan catalog (static, matches DB seed) ────────────────────────────────

export const PLANS = {
  gratuit: {
    id: 'gratuit',
    name: 'Gratuit',
    description: 'Pour découvrir BatiGesti',
    target: 'Artisans qui démarrent',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      devis: 5,
      clients: 10,
      chantiers: 2,
      catalogue: 30,
      signatures: 0,
      ia_analyses: 3,
      photos: 50,
      storage_mb: 100,
      equipe: 1
    },
    features: [
      'devis_basic', 'clients_basic', 'chantiers_basic', 'catalogue',
      'planning', 'ia_devis', 'taches'
    ],
    featureLabels: [
      { name: '5 devis par mois', included: true },
      { name: '10 clients', included: true },
      { name: '2 chantiers actifs', included: true },
      { name: '30 articles catalogue', included: true },
      { name: 'Planning basique', included: true },
      { name: '3 analyses IA / mois', included: true },
      { name: '100 Mo stockage', included: true },
      { name: 'Signatures électroniques', included: false },
      { name: 'Export comptable', included: false },
      { name: 'Analyse de marges', included: false },
      { name: 'Multi-utilisateurs', included: false },
      { name: 'Trésorerie & Bilan', included: false },
      { name: 'Support prioritaire', included: false }
    ],
    badge: null,
    color: '#6B7280',
    borderColor: '#D1D5DB',
    bgColor: '#F3F4F6',
    support: 'communautaire'
  },
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    description: 'L\'essentiel pour un artisan autonome',
    target: 'Artisans indépendants',
    priceMonthly: 14.90,
    priceYearly: 149,
    limits: {
      devis: -1,
      clients: -1,
      chantiers: -1,
      catalogue: -1,
      signatures: -1,
      ia_analyses: 20,
      photos: -1,
      storage_mb: 2048,
      equipe: 1
    },
    features: [
      'devis_basic', 'clients_basic', 'chantiers_basic', 'catalogue',
      'planning', 'ia_devis', 'taches', 'signatures', 'export_comptable',
      'rapports_pdf', 'relances', 'marges', 'pipeline', 'photos_gps',
      'carte_chantiers', 'avis_google', 'entretien'
    ],
    featureLabels: [
      { name: 'Devis & factures illimités', included: true },
      { name: 'Clients illimités', included: true },
      { name: 'Chantiers illimités', included: true },
      { name: 'Catalogue illimité', included: true },
      { name: 'Signatures électroniques', included: true },
      { name: 'Export comptable', included: true },
      { name: 'Analyse de marges', included: true },
      { name: '20 analyses IA / mois', included: true },
      { name: 'Pipeline commercial', included: true },
      { name: 'Relances automatiques', included: true },
      { name: 'Photos GPS & horodatées', included: true },
      { name: '2 Go stockage', included: true },
      { name: 'Multi-utilisateurs', included: false },
      { name: 'Trésorerie & Bilan', included: false },
      { name: 'Support prioritaire', included: false }
    ],
    badge: 'POPULAIRE',
    color: '#F97316',
    borderColor: '#FB923C',
    bgColor: '#FED7AA',
    support: 'email'
  },
  equipe: {
    id: 'equipe',
    name: 'Équipe',
    description: 'Pour les entreprises avec collaborateurs',
    target: 'PME du bâtiment',
    priceMonthly: 29.90,
    priceYearly: 299,
    limits: {
      devis: -1,
      clients: -1,
      chantiers: -1,
      catalogue: -1,
      signatures: -1,
      ia_analyses: -1,
      photos: -1,
      storage_mb: 10240,
      equipe: 10
    },
    features: [
      'devis_basic', 'clients_basic', 'chantiers_basic', 'catalogue',
      'planning', 'ia_devis', 'taches', 'signatures', 'export_comptable',
      'rapports_pdf', 'relances', 'marges', 'pipeline', 'photos_gps',
      'carte_chantiers', 'avis_google', 'entretien',
      'pointages', 'rbac', 'tresorerie', 'fec_export',
      'rapprochement_bancaire', 'sous_traitants', 'commandes',
      'portal_client', 'alertes_stock', 'analytics'
    ],
    featureLabels: [
      { name: 'Tout le plan Artisan', included: true },
      { name: 'Jusqu\'à 10 utilisateurs', included: true },
      { name: 'Pointage & heures équipe', included: true },
      { name: 'Rôles & permissions (RBAC)', included: true },
      { name: 'Trésorerie & Bilan', included: true },
      { name: 'Export FEC comptable', included: true },
      { name: 'IA illimitée', included: true },
      { name: 'Sous-traitants & conformité', included: true },
      { name: 'Commandes fournisseurs', included: true },
      { name: 'Portail client', included: true },
      { name: 'Alertes de stock', included: true },
      { name: 'Statistiques avancées', included: true },
      { name: '10 Go stockage', included: true },
      { name: 'Support prioritaire', included: true }
    ],
    badge: 'RECOMMANDÉ',
    color: '#8B5CF6',
    borderColor: '#A78BFA',
    bgColor: '#EDE9FE',
    support: 'prioritaire'
  }
};

// Yearly discount percentage
export const YEARLY_DISCOUNT = 17;

// Ordered plan tiers for comparison
export const PLAN_ORDER = ['gratuit', 'artisan', 'equipe'];

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
  entretien: 'entretien',
  pointages: 'pointages',
  analytics: 'analytics',
  pipeline: 'pipeline',
  'avis-google': 'avis_google'
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

/**
 * Get the display name of the minimum required plan for a feature.
 * @param {string} feature
 * @returns {string} plan name (e.g., "Artisan", "Équipe")
 */
export function getMinPlanNameForFeature(feature) {
  const planId = FEATURE_MIN_PLAN[feature];
  if (!planId) return 'supérieur';
  return PLANS[planId]?.name || planId;
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
    subtitle: 'Passez au plan Artisan pour créer des devis illimités',
    highlight: 'devis',
    recommendedPlan: 'artisan'
  },
  clients_limit: {
    title: 'Limite de clients atteinte',
    subtitle: 'Passez au plan Artisan pour gérer des clients illimités',
    highlight: 'clients',
    recommendedPlan: 'artisan'
  },
  chantiers_limit: {
    title: 'Limite de chantiers atteinte',
    subtitle: 'Passez au plan Artisan pour des chantiers illimités',
    highlight: 'chantiers',
    recommendedPlan: 'artisan'
  },
  signatures: {
    title: 'Signatures électroniques',
    subtitle: 'Signez directement vos devis et factures avec vos clients',
    highlight: 'signatures',
    recommendedPlan: 'artisan'
  },
  ia_devis: {
    title: 'Limite d\'analyses IA atteinte',
    subtitle: 'Passez au plan Artisan pour 20 analyses IA par mois',
    highlight: 'ia_devis',
    recommendedPlan: 'artisan'
  },
  export_comptable: {
    title: 'Export comptable',
    subtitle: 'Exportez vos données pour votre expert-comptable',
    highlight: 'export_comptable',
    recommendedPlan: 'artisan'
  },
  marges: {
    title: 'Analyse de marges',
    subtitle: 'Suivez la rentabilité de chaque chantier en temps réel',
    highlight: 'marges',
    recommendedPlan: 'artisan'
  },
  equipe: {
    title: 'Gestion d\'équipe avancée',
    subtitle: 'Invitez jusqu\'à 10 collaborateurs avec des rôles personnalisés',
    highlight: 'equipe',
    recommendedPlan: 'equipe'
  },
  pointages: {
    title: 'Pointage & heures équipe',
    subtitle: 'Suivez les heures de votre équipe par chantier',
    highlight: 'pointages',
    recommendedPlan: 'equipe'
  },
  tresorerie: {
    title: 'Trésorerie & Bilan',
    subtitle: 'Suivez votre trésorerie et vos bilans de chantiers en temps réel',
    highlight: 'tresorerie',
    recommendedPlan: 'equipe'
  },
  fec_export: {
    title: 'Export FEC',
    subtitle: 'Exportez vos données comptables au format FEC pour votre expert-comptable',
    highlight: 'fec_export',
    recommendedPlan: 'equipe'
  },
  sous_traitants: {
    title: 'Sous-traitants & conformité',
    subtitle: 'Gérez vos sous-traitants, contrats et documents de conformité',
    highlight: 'sous_traitants',
    recommendedPlan: 'equipe'
  },
  commandes: {
    title: 'Commandes fournisseurs',
    subtitle: 'Créez et suivez vos bons de commande fournisseurs',
    highlight: 'commandes',
    recommendedPlan: 'equipe'
  },
  portal_client: {
    title: 'Portail client',
    subtitle: 'Offrez un accès dédié à vos clients pour suivre leurs chantiers',
    highlight: 'portal_client',
    recommendedPlan: 'equipe'
  },
  analytics: {
    title: 'Statistiques avancées',
    subtitle: 'Analysez vos performances et prenez de meilleures décisions',
    highlight: 'analytics',
    recommendedPlan: 'equipe'
  },
  generic: {
    title: 'Débloquez plus de fonctionnalités',
    subtitle: 'Choisissez le plan adapté à votre activité',
    highlight: null,
    recommendedPlan: 'artisan'
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
    // Map legacy plan names
    let plan = subscription?.plan || 'gratuit';
    if (plan === 'pro') plan = 'artisan'; // backward compat
    if (plan === 'free') plan = 'gratuit';

    set({
      subscription,
      planId: plan,
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
