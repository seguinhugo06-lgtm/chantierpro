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
  // Always use static PLANS — the 'plans' DB table is optional and may not exist yet.
  // This prevents 404 console errors from Supabase when the table doesn't exist.
  return { data: Object.values(PLANS), error: null };
}

// ─── Subscription API ───────────────────────────────────────────────────────

/**
 * Get the current user's (or org's) subscription
 * @param {string} [orgId] - Organization ID for org-level billing
 * @returns {Promise<{ data: Object|null, error: any }>}
 */
export async function fetchSubscription(orgId) {
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

    // Try org-level subscription first (if orgId provided)
    if (orgId && orgId !== 'demo-org-id') {
      const { data: orgSub, error: orgErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!orgErr && orgSub) return { data: orgSub, error: null };
    }

    // Fallback to user-level subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No subscription found — create a free one (linked to org if available)
      const insertData = { user_id: user.id, plan: 'gratuit', status: 'active' };
      if (orgId && orgId !== 'demo-org-id') insertData.organization_id = orgId;

      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert(insertData)
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
  // Usage is computed client-side via computeLiveUsage() for now.
  // The 'usage_tracking' DB table is optional and may not exist yet.
  // This prevents 404 console errors from Supabase when the table doesn't exist.
  return {
    data: { devis: 0, clients: 0, chantiers: 0, photos: 0, storage_mb: 0, equipe: 0 },
    error: null
  };
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
