import { createClient } from '@supabase/supabase-js';

// Mode démo détection
const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

// En mode démo, on utilise des URLs factices pour éviter les erreurs 401
const supabaseUrl = isDemo ? 'https://demo.supabase.co' : (import.meta.env.VITE_SUPABASE_URL || '');
const supabaseAnonKey = isDemo ? 'demo-key' : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

// Client Supabase (null en mode démo)
const supabase = isDemo ? null : (supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null);

// Auth wrapper
export const auth = {
  signUp: async (email, password, metadata) => {
    if (isDemo || !supabase) return { data: null, error: { message: 'Mode démo actif' } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    return { data, error };
  },
  signIn: async (email, password) => {
    if (isDemo || !supabase) return { data: null, error: { message: 'Mode démo actif' } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  signOut: async () => {
    if (isDemo || !supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  getCurrentUser: async () => {
    if (isDemo || !supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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
