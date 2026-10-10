import { createClient } from '@supabase/supabase-js';
import { logger } from './lib/logger';
import { urlPublique } from './lib/urlPublique';

// Mode demo detection
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const urlHasDemoParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
const envDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// Check if Supabase credentials are configured
const hasSupabaseConfig = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

// Demo mode: enabled if no Supabase config OR explicitly requested via URL/env
// ?demo=true works in all environments to allow testing demo data on production builds
export const isDemo = !hasSupabaseConfig || envDemoMode || urlHasDemoParam;


// Demo user for auto-login in demo mode
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@mallettico.fr',
  user_metadata: { nom: 'Utilisateur Démo' }
};

// Log demo mode activation
if (urlHasDemoParam) {
  logger.debug('🎭 Demo mode activated via URL parameter');
}

// Liens envoyés par e-mail (réinitialisation du mot de passe, confirmation d'inscription) :
// Supabase renvoie vers l'app avec #access_token=…&type=recovery, ou #error=…&error_code=otp_expired
// si le lien a expiré. Lu AVANT createClient, qui consomme puis efface ce fragment.
const fragmentInitial = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
  : new URLSearchParams();
export const lienEmail = {
  recuperation: fragmentInitial.get('type') === 'recovery',
  erreur: fragmentInitial.get('error')
    ? { error_code: fragmentInitial.get('error_code'), error_description: fragmentInitial.get('error_description') }
    : null,
};
if (lienEmail.erreur && typeof window !== 'undefined') {
  // Sinon le fragment d'erreur reste dans la barre d'adresse et se réaffiche à chaque rechargement.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

// Adresse de retour des liens e-mail : la racine de l'app sur le domaine courant.
const urlRetour = () => urlPublique('/');

// En mode demo, on utilise des URLs factices pour éviter les erreurs 401
const supabaseUrl = isDemo ? 'https://demo.supabase.co' : (import.meta.env.VITE_SUPABASE_URL || '');
const supabaseAnonKey = isDemo ? 'demo-key' : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

// Client Supabase (null en mode démo)
export const supabase = isDemo ? null : (supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null);

// Auth wrapper
export const auth = {
  signUp: async (email, password, metadata) => {
    if (isDemo || !supabase) return { data: null, error: { message: 'Mode démo actif' } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: urlRetour() }
    });
    return { data, error };
  },
  // Envoie le lien de réinitialisation. Supabase ne dit pas si l'adresse existe (et c'est voulu).
  resetPassword: async (email) => {
    if (isDemo || !supabase) return { error: { message: 'Mode démo actif' } };
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlRetour() });
    return { error };
  },
  // Enregistre le nouveau mot de passe de l'utilisateur connecté (après le lien de réinitialisation).
  updatePassword: async (password) => {
    if (isDemo || !supabase) return { error: { message: 'Mode démo actif' } };
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  },
  signIn: async (email, password) => {
    if (isDemo || !supabase) return { data: null, error: { message: 'Mode démo actif' } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  signOut: async () => {
    if (isDemo || !supabase) return { error: null };
    // Cet appareil seulement (« global » déconnectait aussi l'ordinateur quand on se déconnectait du téléphone).
    // L'appel peut renvoyer une erreur OU lever (verrou d'auth-js abandonné sur un réseau instable) : même repli.
    let error = null;
    try {
      ({ error } = await supabase.auth.signOut({ scope: 'local' }));
    } catch (e) {
      error = e;
    }
    // Recherches récentes : propres au compte (sur un téléphone partagé, le suivant les voyait)
    try { localStorage.removeItem('mallettico_recent_items'); } catch { /* stockage indisponible */ }
    if (error) {
      // Serveur injoignable (hors ligne) : supabase-js garde alors la session, et le compte était de nouveau
      // connecté au rechargement — téléphone partagé (recette du 9 oct. 2026). On l'efface de l'appareil quand même
      // (le jeton d'accès expire en 1 h ; le jeton de rafraîchissement n'est pas révoqué côté serveur, mais il
      // n'est plus sur l'appareil) ; `_removeSession` prévient aussi l'app (SIGNED_OUT). Méthode privée d'auth-js :
      // src/lib/__tests__/deconnexion.test.js vérifie qu'elle existe toujours.
      try {
        if (typeof supabase.auth._removeSession === 'function') await supabase.auth._removeSession();
        else {
          localStorage.removeItem(supabase.auth.storageKey);
          localStorage.removeItem(`${supabase.auth.storageKey}-user`);
          localStorage.removeItem(`${supabase.auth.storageKey}-code-verifier`);
        }
      } catch { /* stockage indisponible : rien à effacer */ }
      return { error: null, horsLigne: true };
    }
    return { error: null };
  },
  getCurrentUser: async () => {
    if (isDemo) return DEMO_USER;
    if (!supabase) return null;
    // Lecture de la session depuis le stockage local (rapide, sans appel réseau bloquant).
    // Protégé par un timeout : si Supabase est indisponible (projet en pause, réseau coupé),
    // on renvoie null après 5s au lieu de laisser l'app figée sur l'écran de chargement.
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 5000)
      );
      const { data } = await Promise.race([sessionPromise, timeoutPromise]);
      return data?.session?.user ?? null;
    } catch {
      return null;
    }
  },
  onAuthStateChange: (callback) => {
    if (isDemo || !supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  }
};

// DB helpers avec fallback mode démo
const createDBHelper = (table) => ({
  getAll: async () => {
    if (isDemo || !supabase) return { data: [], error: null };
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    return { data, error };
  },
  create: async (item) => {
    if (isDemo || !supabase) return { data: item, error: null };
    const { data, error } = await supabase.from(table).insert([item]).select().single();
    return { data, error };
  },
  update: async (id, updates) => {
    if (isDemo || !supabase) return { data: { id, ...updates }, error: null };
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
    return { data, error };
  },
  delete: async (id) => {
    if (isDemo || !supabase) return { error: null };
    const { error } = await supabase.from(table).delete().eq('id', id);
    return { error };
  }
});

export const clientsDB = createDBHelper('clients');
export const devisDB = createDBHelper('devis');

export default supabase;
