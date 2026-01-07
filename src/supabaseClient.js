// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// REMPLACE CES VALEURS PAR TES VRAIES CLÉS SUPABASE
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kofsbgxkrmryfetevetn.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZnNiZ3hrcm1yeWZldGV2ZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ2ODEsImV4cCI6MjA4MzIwMDY4MX0.qHP3xdKI4ZhrcaIiCfKxoMoZqKiGAm75jXPA_ZCne_w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions pour l'authentification
export const auth = {
  // Sign up
  async signUp(email, password, nom, prenom) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          prenom
        }
      }
    })
    return { data, error }
  },

  // Sign in
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Helper functions pour les clients
export const clientsDB = {
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(client) {
    const user = await auth.getCurrentUser()
    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...client, user_id: user.id }])
      .select()
    return { data: data?.[0], error }
  },

  async update(id, client) {
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
    return { data: data?.[0], error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    return { error }
  }
}

// Helper functions pour les devis
export const devisDB = {
  async getAll() {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(devis) {
    const user = await auth.getCurrentUser()
    const { data, error } = await supabase
      .from('devis')
      .insert([{ ...devis, user_id: user.id }])
      .select()
    return { data: data?.[0], error }
  },

  async update(id, devis) {
    const { data, error } = await supabase
      .from('devis')
      .update(devis)
      .eq('id', id)
      .select()
    return { data: data?.[0], error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('devis')
      .delete()
      .eq('id', id)
    return { error }
  }
}

// Helper functions pour l'entreprise
export const entrepriseDB = {
  async get() {
    const { data, error } = await supabase
      .from('entreprise_info')
      .select('*')
      .single()
    return { data, error }
  },

  async createOrUpdate(info) {
    const user = await auth.getCurrentUser()
    const { data: existing } = await this.get()
    
    if (existing) {
      const { data, error } = await supabase
        .from('entreprise_info')
        .update(info)
        .eq('user_id', user.id)
        .select()
      return { data: data?.[0], error }
    } else {
      const { data, error } = await supabase
        .from('entreprise_info')
        .insert([{ ...info, user_id: user.id }])
        .select()
      return { data: data?.[0], error }
    }
  }
}

// Helper functions pour les subscriptions
export const subscriptionsDB = {
  async get() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .single()
    return { data, error }
  },

  async createOrUpdate(subscription) {
    const user = await auth.getCurrentUser()
    const { data: existing } = await this.get()
    
    if (existing) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscription)
        .eq('user_id', user.id)
        .select()
      return { data: data?.[0], error }
    } else {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([{ ...subscription, user_id: user.id }])
        .select()
      return { data: data?.[0], error }
    }
  }
}
