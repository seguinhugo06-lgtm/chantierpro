/**
 * Subscriptions API Client
 *
 * Handles all subscription-related Supabase + Stripe operations.
 * In demo mode, returns mock data matching the free "Gratuit" plan.
 */

import { supabase, isDemo } from '../supabaseClient';
import { PLANS, PLAN_ORDER } from '../stores/subscriptionStore';

// ─── Demo defaults ─────────────────────────────────────────────────────────

const DEMO_SUBSCRIPTION = {
  id: 'demo-sub-id',
  user_id: 'demo-user-id',
  plan: 'gratuit',
  status: 'active',
  billing_interval: 'monthly',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  current_period_end: null,
  trial_end: null,
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEMO_USAGE = {
  devis: 2,
  clients: 4,
  chantiers: 1,
  photos: 12,
  storage_mb: 15.4,
  equipe: 0
};

// ─── Plans API ──────────────────────────────────────────────────────────────

/**
 * Fetch all active plans from DB. Falls back to static PLANS.
 * @returns {Promise<{ data: Object[], error: any }>}
 */
export async function fetchPlans() {
  if (isDemo || !supabase) {
    return { data: Object.values(PLANS), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.warn('fetchPlans failed, using static fallback:', error.message);
    return { data: Object.values(PLANS), error: null };
  }
}

// ─── Subscription API ───────────────────────────────────────────────────────

/**
 * Get the current user's subscription
 * @returns {Promise<{ data: Object|null, error: any }>}
 */
export async function fetchSubscription() {
  if (isDemo || !supabase) {
    // In demo, check localStorage for plan override
    const savedPlan = localStorage.getItem('cp_demo_plan');
    if (savedPlan && PLANS[savedPlan]) {
      return { data: { ...DEMO_SUBSCRIPTION, plan: savedPlan }, error: null };
    }
    return { data: DEMO_SUBSCRIPTION, error: null };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Non authentifié' } };

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No subscription found — create a free one
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({ user_id: user.id, plan: 'gratuit', status: 'active' })
        .select()
        .single();

      return { data: newSub, error: insertError };
    }

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// ─── Usage API ──────────────────────────────────────────────────────────────

/**
 * Fetch current month usage counters
 * @returns {Promise<{ data: Object, error: any }>}
 */
export async function fetchUsage() {
  if (isDemo || !supabase) {
    // In demo mode, compute usage from localStorage data
    try {
      const clients = JSON.parse(localStorage.getItem('cp_demo_clients') || '[]');
      const devis = JSON.parse(localStorage.getItem('cp_demo_devis') || '[]');
      const chantiers = JSON.parse(localStorage.getItem('cp_demo_chantiers') || '[]');
      const equipe = JSON.parse(localStorage.getItem('cp_demo_equipe') || '[]');

      return {
        data: {
          devis: devis.filter(d => d.type === 'devis').length,
          clients: clients.length,
          chantiers: chantiers.length,
          photos: DEMO_USAGE.photos,
          storage_mb: DEMO_USAGE.storage_mb,
          equipe: equipe.length
        },
        error: null
      };
    } catch {
      return { data: { ...DEMO_USAGE }, error: null };
    }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Non authentifié' } };

    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    const periodStartStr = periodStart.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', periodStartStr)
      .single();

    if (error && error.code === 'PGRST116') {
      // No record for current month — return zeros
      return {
        data: { devis: 0, clients: 0, chantiers: 0, photos: 0, storage_mb: 0, equipe: 0 },
        error: null
      };
    }

    if (error) throw error;

    return {
      data: {
        devis: data.devis_count || 0,
        clients: data.clients_count || 0,
        chantiers: data.chantiers_count || 0,
        photos: data.photos_count || 0,
        storage_mb: data.storage_used_mb || 0,
        equipe: data.equipe_count || 0
      },
      error: null
    };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Increment a usage counter (called after creating a resource)
 * @param {string} resource - devis, clients, chantiers, photos, equipe
 * @param {number} amount
 */
export async function incrementUsage(resource, amount = 1) {
  if (isDemo || !supabase) return { error: null };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'Non authentifié' } };

    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: user.id,
      p_resource: resource,
      p_amount: amount
    });

    return { error };
  } catch (error) {
    return { error };
  }
}

// ─── Stripe Checkout ────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for upgrading
 * @param {string} planId - Target plan
 * @param {'monthly'|'yearly'} interval
 * @returns {Promise<{ url: string|null, error: any }>}
 */
export async function createCheckoutSession(planId, interval = 'monthly') {
  if (isDemo || !supabase) {
    // In demo mode, simulate plan change
    localStorage.setItem('cp_demo_plan', planId);
    return {
      url: null, // No redirect needed
      directUpgrade: true, // Signal to store to update directly
      plan: planId,
      error: null
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { planId, interval }
    });

    if (error) throw error;
    return { url: data.url, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

/**
 * Create a Stripe Customer Portal session for managing billing
 * @returns {Promise<{ url: string|null, error: any }>}
 */
export async function createPortalSession() {
  if (isDemo || !supabase) {
    return { url: null, error: { message: 'Portail Stripe non disponible en démo' } };
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {}
    });

    if (error) throw error;
    return { url: data.url, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

/**
 * Cancel the current subscription (at period end)
 * @returns {Promise<{ error: any }>}
 */
export async function cancelSubscription() {
  if (isDemo || !supabase) {
    localStorage.setItem('cp_demo_plan', 'gratuit');
    return { error: null };
  }

  try {
    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: {}
    });

    return { error };
  } catch (error) {
    return { error };
  }
}

/**
 * Reactivate a canceled subscription
 * @returns {Promise<{ error: any }>}
 */
export async function reactivateSubscription() {
  if (isDemo || !supabase) return { error: null };

  try {
    const { error } = await supabase.functions.invoke('reactivate-subscription', {
      body: {}
    });

    return { error };
  } catch (error) {
    return { error };
  }
}

// ─── Live usage counter (from actual data counts) ───────────────────────────

/**
 * Compute live usage from the data context.
 * This is used client-side for real-time limit checking.
 * @param {Object} data - { clients, devis, chantiers, equipe }
 * @returns {Object} usage counts
 */
export function computeLiveUsage(data = {}) {
  const { clients = [], devis = [], chantiers = [], equipe = [] } = data;

  // Count devis created this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const devisThisMonth = devis.filter(d => {
    if (d.type !== 'devis') return false;
    const created = new Date(d.created_at || d.date);
    return created >= monthStart;
  }).length;

  return {
    devis: devisThisMonth,
    clients: clients.length,
    chantiers: chantiers.length,
    photos: 0, // Photos counted server-side
    storage_mb: 0, // Storage counted server-side
    equipe: equipe.length
  };
}

export default {
  fetchPlans,
  fetchSubscription,
  fetchUsage,
  incrementUsage,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  computeLiveUsage
};
