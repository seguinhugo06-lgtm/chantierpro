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
  // La démo présente un artisan installé : 17 devis, 14 chantiers, un catalogue
  // fourni. La mettre sur le plan Gratuit la bloquerait dès le premier clic, une
  // fois les limites appliquées. On montre donc le produit payant — et il suffit
  // de poser `cp_demo_plan = 'gratuit'` pour voir le parcours d'abonnement.
  plan: 'artisan',
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
// Codes renvoyés quand la table n'existe pas : seul cas où l'on peut cesser de la demander.
const TABLE_ABSENTE = new Set(['42P01', 'PGRST205']);
const STATUTS_ACTIFS = ['active', 'trialing', 'past_due'];
const RANG_PLAN = { gratuit: 0, free: 0, decouverte: 0, solo: 1, artisan: 1, pro: 2, entreprise: 2, equipe: 2 };

/**
 * Choisit l'abonnement qui fait foi parmi plusieurs lignes (organisation + utilisateur) :
 * un abonnement actif avant un abonnement terminé, le plan le plus élevé, puis le plus récent.
 * Avant, « le plus récent » l'emportait : la ligne gratuite d'un collaborateur pouvait masquer
 * l'abonnement payant de l'organisation.
 * @param {Array<object>} lignes
 * @returns {object|null}
 */
export function choisirAbonnement(lignes = []) {
  const valides = (lignes || []).filter(Boolean);
  if (!valides.length) return null;
  return [...valides].sort((a, b) => {
    const actifA = STATUTS_ACTIFS.includes(a.status) ? 1 : 0;
    const actifB = STATUTS_ACTIFS.includes(b.status) ? 1 : 0;
    if (actifA !== actifB) return actifB - actifA;
    const rangA = RANG_PLAN[a.plan] ?? 0;
    const rangB = RANG_PLAN[b.plan] ?? 0;
    if (rangA !== rangB) return rangB - rangA;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  })[0];
}

/**
 * Une offre sans Stripe (code testeur) dont la date de fin est passée vaut le plan gratuit,
 * même si la tâche nocturne de la base ne l'a pas encore repassée en gratuit.
 * @param {object|null} abonnement
 * @param {Date} [maintenant]
 */
export function appliquerFinOffre(abonnement, maintenant = new Date()) {
  if (!abonnement || abonnement.stripe_subscription_id || !abonnement.plan || abonnement.plan === 'gratuit') return abonnement;
  if (!abonnement.current_period_end || new Date(abonnement.current_period_end) >= maintenant) return abonnement;
  return { ...abonnement, plan: 'gratuit', status: 'canceled', cancel_at_period_end: false };
}

const MESSAGES_CODE = {
  CODE_INCONNU: 'Ce code n’existe pas. Vérifiez l’orthographe (tirets compris).',
  CODE_EXPIRE: 'Ce code a expiré.',
  CODE_EPUISE: 'Ce code a déjà été utilisé autant de fois que prévu.',
  CODE_DEJA_UTILISE: 'Vous avez déjà utilisé ce code.',
  ABONNEMENT_PAYANT_ACTIF: 'Vous avez déjà un abonnement payant actif : le code ne peut pas s’y ajouter.',
  NON_CONNECTE: 'Votre session a expiré. Reconnectez-vous.',
};

/**
 * Active un code testeur (« un an offert ») : plan payant pour N mois, sans carte bancaire.
 * @param {string} code
 * @returns {Promise<{ data: {plan: string, fin: string, duree_mois: number}|null, error: string|null }>}
 */
export async function utiliserCodeTesteur(code) {
  const propre = String(code || '').trim().toUpperCase();
  if (propre.length < 8) return { data: null, error: 'Saisissez le code complet (au moins 8 caractères).' };
  if (isDemo || !supabase) {
    // En démo : simulation locale, comme pour les changements de plan.
    localStorage.setItem('cp_demo_plan', 'artisan');
    const fin = new Date(); fin.setFullYear(fin.getFullYear() + 1);
    return { data: { plan: 'artisan', fin: fin.toISOString(), duree_mois: 12 }, error: null };
  }
  const { data, error } = await supabase.rpc('utiliser_code_testeur', { p_code: propre });
  if (error) {
    const texte = `${error.message || ''} ${error.code || ''}`;
    if (/utiliser_code_testeur/.test(texte) && /could not find|PGRST202/i.test(texte)) {
      return { data: null, error: 'Les codes testeurs ne sont pas encore activés sur le serveur. Écrivez à contact@mallettico.fr.' };
    }
    const code = Object.keys(MESSAGES_CODE).find((k) => texte.includes(k));
    return { data: null, error: code ? MESSAGES_CODE[code] : 'Le code n’a pas pu être activé. Réessayez dans un instant.' };
  }
  return { data, error: null };
}

/**
 * Abonnement en vigueur pour l'utilisateur : celui de son organisation s'il en a un, sinon le sien.
 * En cas d'erreur réseau, renvoie `error` (sans rien mettre en cache) : l'appelant garde l'état
 * courant et réessaie plus tard. Avant, une coupure était mémorisée comme « table absente » pour
 * toute la session et un abonné payant restait affiché en « Gratuit ».
 * @param {string|null} orgId
 * @returns {Promise<{ data: object|null, error: any }>}
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

  const subUnavailableKey = 'cp_sub_table_unavailable';
  const gratuit = { plan: 'gratuit', status: 'active' };
  if (sessionStorage.getItem(subUnavailableKey)) return { data: gratuit, error: null };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Non authentifié' } };

    // Lignes visibles : la sienne, et celle de l'organisation (policy des membres, migration 073).
    const lire = (avecOrganisation) => {
      const requete = supabase.from('subscriptions').select('*');
      return (avecOrganisation ? requete.or(`user_id.eq.${user.id},organization_id.eq.${orgId}`) : requete.eq('user_id', user.id))
        .order('created_at', { ascending: false })
        .limit(20);
    };
    const avecOrganisation = !!orgId && orgId !== 'demo-org-id';
    let { data: lignes, error } = await lire(avecOrganisation);
    // Colonne organization_id absente (migration 040 non appliquée) : on lit la ligne de l'utilisateur seule.
    if (error && avecOrganisation && (error.code === '42703' || error.code === 'PGRST204')) {
      ({ data: lignes, error } = await lire(false));
    }

    if (error) {
      if (TABLE_ABSENTE.has(error.code)) {
        sessionStorage.setItem(subUnavailableKey, '1');
        return { data: gratuit, error: null };
      }
      return { data: null, error };
    }

    const choisi = choisirAbonnement((lignes || []).map((l) => appliquerFinOffre(l)));
    if (choisi) return { data: choisi, error: null };

    // Aucune ligne : on crée la ligne gratuite de l'utilisateur. L'organisation est rattachée
    // côté base (déclencheur de la migration 073), jamais par l'app : un collaborateur ne doit
    // pas créer de ligne au nom de l'organisation.
    const { data: nouvelle, error: erreurInsertion } = await supabase
      .from('subscriptions')
      .insert({ user_id: user.id, plan: 'gratuit', status: 'active' })
      .select()
      .single();
    if (erreurInsertion) return { data: gratuit, error: erreurInsertion };
    return { data: nouvelle, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ─── Usage API ──────────────────────────────────────────────────────────────

/**
 * Fetch current month usage counters
 * @returns {Promise<{ data: Object, error: any }>}
 */
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

/**
 * Récupère le message d'erreur réel d'une Edge Function.
 *
 * Quand une fonction répond en 4xx/5xx, supabase-js remplace le message par
 * « Edge Function returned a non-2xx status code » et range la vraie réponse
 * dans `error.context`. Sans ce déballage, l'artisan — et nous — ne voyons
 * jamais la cause : refus de Stripe, clé absente, plan inconnu…
 */
async function messageReel(error) {
  try {
    const corps = await error?.context?.json?.();
    if (corps?.error) return new Error(corps.error);
  } catch { /* corps illisible : on garde l'erreur d'origine */ }
  return error;
}

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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mallettico.fr';
    const { data, error } = await supabase.functions.invoke('subscription-billing', {
      body: {
        action: 'create-checkout',
        planId,
        interval,
        successUrl: `${origin}/?upgraded=true`,
        cancelUrl: `${origin}/?upgrade_cancelled=true`,
      }
    });

    if (error) throw await messageReel(error);
    if (data?.error) throw new Error(data.error);
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mallettico.fr';
    const { data, error } = await supabase.functions.invoke('subscription-billing', {
      body: { action: 'create-portal', returnUrl: origin }
    });

    if (error) throw await messageReel(error);
    if (data?.error) throw new Error(data.error);
    return { url: data.url, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

// `cancelSubscription()` et `reactivateSubscription()` ont été retirées le
// 30 juil. 2026 : elles invoquaient les fonctions Edge `cancel-subscription` et
// `reactivate-subscription`, **qui n'ont jamais été écrites ni déployées**.
// L'appel mourait sur le preflight CORS et l'abonné ne pouvait pas résilier.
//
// Résiliation et réactivation se font désormais dans le portail Stripe
// (`createPortalSession` ci-dessus). Stripe gère la fin de période, le prorata
// et les emails ; le webhook répercute ensuite le changement dans la table
// `subscriptions` via `customer.subscription.updated` / `.deleted`.
// Ne pas les recréer sans écrire ET déployer les fonctions correspondantes.

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
  incrementUsage,
  createCheckoutSession,
  createPortalSession,
  computeLiveUsage
};
