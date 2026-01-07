import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ SUPABASE KEYS MANQUANTES ! Configure VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const auth = {
  async signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    return { data, error }
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const clientsDB = {
  async getAll() {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    return { data, error }
  },
  async create(client) {
    const user = await auth.getCurrentUser()
    const { data, error } = await supabase.from('clients').insert([{ ...client, user_id: user.id }]).select()
    return { data: data?.[0], error }
  },
  async update(id, client) {
    const { data, error } = await supabase.from('clients').update(client).eq('id', id).select()
    return { data: data?.[0], error }
  },
  async delete(id) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    return { error }
  }
}

export const devisDB = {
  async getAll() {
    const { data, error } = await supabase.from('devis').select('*').order('created_at', { ascending: false })
    return { data, error }
  },
  async create(devis) {
    const user = await auth.getCurrentUser()
    const { data, error } = await supabase.from('devis').insert([{ ...devis, user_id: user.id }]).select()
    return { data: data?.[0], error }
  },
  async update(id, devis) {
    const { data, error } = await supabase.from('devis').update(devis).eq('id', id).select()
    return { data: data?.[0], error }
  }
}

export const entrepriseDB = {
  async get() {
    const { data, error } = await supabase.from('entreprise_info').select('*').single()
    return { data, error }
  },
  async createOrUpdate(info) {
    const user = await auth.getCurrentUser()
    const { data: existing } = await this.get()
    if (existing) {
      const { data, error } = await supabase.from('entreprise_info').update(info).eq('user_id', user.id).select()
      return { data: data?.[0], error }
    } else {
      const { data, error } = await supabase.from('entreprise_info').insert([{ ...info, user_id: user.id }]).select()
      return { data: data?.[0], error }
    }
  }
}
