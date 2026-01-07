import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const useMock = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseUrl.includes('test')

let supabase = null
if (!useMock) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (e) {
    console.warn('Supabase init failed, using LocalStorage')
  }
}

export const auth = {
  async signUp(email, password, metadata) {
    if (useMock || !supabase) {
      localStorage.setItem('mock_user', JSON.stringify({ email, user_metadata: metadata }))
      return { data: { user: { email, user_metadata: metadata } }, error: null }
    }
    return await supabase.auth.signUp({ email, password, options: { data: metadata } })
  },
  
  async signIn(email, password) {
    if (useMock || !supabase) {
      const user = JSON.parse(localStorage.getItem('mock_user') || '{"email":"demo@demo.com"}')
      return { data: { user }, error: null }
    }
    return await supabase.auth.signInWithPassword({ email, password })
  },
  
  async signOut() {
    if (useMock || !supabase) {
      localStorage.removeItem('mock_user')
      return { error: null }
    }
    return await supabase.auth.signOut()
  },
  
  async getCurrentUser() {
    if (useMock || !supabase) {
      const user = localStorage.getItem('mock_user')
      return user ? JSON.parse(user) : null
    }
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  
  onAuthStateChange(callback) {
    if (useMock || !supabase) {
      // Format attendu par Supabase : retourne { data: { subscription } }
      const mockSubscription = {
        unsubscribe: () => {}
      }
      return {
        data: {
          subscription: mockSubscription
        }
      }
    }
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const clientsDB = {
  async getAll() {
    if (useMock || !supabase) {
      const data = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      return { data, error: null }
    }
    return await supabase.from('clients').select('*').order('created_at', { ascending: false })
  },
  
  async create(client) {
    if (useMock || !supabase) {
      const clients = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      const newClient = { ...client, id: Date.now().toString(), created_at: new Date().toISOString() }
      clients.push(newClient)
      localStorage.setItem('cp_clients', JSON.stringify(clients))
      return { data: newClient, error: null }
    }
    const user = await auth.getCurrentUser()
    const { data, error } = await supabase.from('clients').insert([{ ...client, user_id: user.id }]).select()
    return { data: data?.[0], error }
  },
  
  async update(id, client) {
    if (useMock || !supabase) {
      const clients = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      const index = clients.findIndex(c => c.id === id || c.id === id.toString())
      if (index !== -1) {
        clients[index] = { ...clients[index], ...client }
        localStorage.setItem('cp_clients', JSON.stringify(clients))
        return { data: clients[index], error: null }
      }
      return { data: null, error: { message: 'Client not found' } }
    }
    const { data, error } = await supabase.from('clients').update(client).eq('id', id).select()
    return { data: data?.[0], error }
  },
  
  async delete(id) {
    if (useMock || !supabase) {
      const clients = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      const filtered = clients.filter(c => c.id !== id && c.id !== id.toString())
      localStorage.setItem('cp_clients', JSON.stringify(filtered))
      return { error: null }
    }
    return await supabase.from('clients').delete().eq('id', id)
  }
}

export const devisDB = {
  async getAll() {
    if (useMock || !supabase) {
      const data = JSON.parse(localStorage.getItem('cp_devis') || '[]')
      return { data, error: null }
    }
    return await supabase.from('devis').select('*').order('created_at', { ascending: false })
  },
  
  async create(devis) {
    if (useMock || !supabase) {
      const allDevis = JSON.parse(localStorage.getItem('cp_devis') || '[]')
      const newDevis = { ...devis, id: Date.now().toString(), created_at: new Date().toISOString() }
      allDevis.push(newDevis)
      localStorage.setItem('cp_devis', JSON.stringify(allDevis))
      return { data: newDevis, error: null }
    }
    const user = await auth.getCurrentUser()
    const { data, error } = await supabase.from('devis').insert([{ ...devis, user_id: user.id }]).select()
    return { data: data?.[0], error }
  },
  
  async update(id, devis) {
    if (useMock || !supabase) {
      const allDevis = JSON.parse(localStorage.getItem('cp_devis') || '[]')
      const index = allDevis.findIndex(d => d.id === id || d.id === id.toString())
      if (index !== -1) {
        allDevis[index] = { ...allDevis[index], ...devis }
        localStorage.setItem('cp_devis', JSON.stringify(allDevis))
        return { data: allDevis[index], error: null }
      }
      return { data: null, error: { message: 'Devis not found' } }
    }
    const { data, error } = await supabase.from('devis').update(devis).eq('id', id).select()
    return { data: data?.[0], error }
  }
}

export { supabase }
