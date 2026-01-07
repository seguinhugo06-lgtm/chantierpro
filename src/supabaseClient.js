import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vérifie si on doit utiliser le mode mock (LocalStorage)
const useMock = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseUrl.includes('test')

console.log('🔧 ChantierPro - Mode:', useMock ? 'LocalStorage (mock)' : 'Supabase')

let supabase = null
if (!useMock) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Supabase connecté')
  } catch (e) {
    console.warn('⚠️ Supabase init failed, using LocalStorage:', e.message)
  }
}

export const auth = {
  async signUp(email, password, metadata) {
    if (useMock || !supabase) {
      const mockUser = { 
        id: 'mock-' + Date.now(),
        email, 
        user_metadata: metadata,
        created_at: new Date().toISOString()
      }
      localStorage.setItem('cp_mock_user', JSON.stringify(mockUser))
      return { data: { user: mockUser }, error: null }
    }
    return await supabase.auth.signUp({ email, password, options: { data: metadata } })
  },
  
  async signIn(email, password) {
    if (useMock || !supabase) {
      let mockUser = localStorage.getItem('cp_mock_user')
      if (mockUser) {
        mockUser = JSON.parse(mockUser)
      } else {
        mockUser = { 
          id: 'mock-' + Date.now(),
          email, 
          user_metadata: {},
          created_at: new Date().toISOString()
        }
        localStorage.setItem('cp_mock_user', JSON.stringify(mockUser))
      }
      return { data: { user: mockUser, session: { user: mockUser } }, error: null }
    }
    return await supabase.auth.signInWithPassword({ email, password })
  },
  
  async signOut() {
    if (useMock || !supabase) {
      localStorage.removeItem('cp_mock_user')
      return { error: null }
    }
    return await supabase.auth.signOut()
  },
  
  async getCurrentUser() {
    if (useMock || !supabase) {
      const user = localStorage.getItem('cp_mock_user')
      return user ? JSON.parse(user) : null
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (err) {
      console.error('getCurrentUser error:', err)
      return null
    }
  },
  
  onAuthStateChange(callback) {
    if (useMock || !supabase) {
      // Mode mock : retourne un objet vide mais valide
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }
    
    // Mode Supabase réel : utilise la vraie fonction
    // Wrapping pour éviter les erreurs
    try {
      return supabase.auth.onAuthStateChange((event, session) => {
        // Ne pas appeler le callback pour INITIAL_SESSION pour éviter les doubles appels
        if (event !== 'INITIAL_SESSION') {
          callback(event, session)
        }
      })
    } catch (err) {
      console.error('onAuthStateChange setup error:', err)
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }
  }
}

export const clientsDB = {
  async getAll() {
    if (useMock || !supabase) {
      const data = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      return { data, error: null }
    }
    try {
      return await supabase.from('clients').select('*').order('created_at', { ascending: false })
    } catch (err) {
      console.error('clientsDB.getAll error:', err)
      return { data: [], error: err }
    }
  },
  
  async create(client) {
    if (useMock || !supabase) {
      const clients = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      const newClient = { 
        ...client, 
        id: Date.now().toString(), 
        created_at: new Date().toISOString() 
      }
      clients.push(newClient)
      localStorage.setItem('cp_clients', JSON.stringify(clients))
      return { data: newClient, error: null }
    }
    try {
      const user = await auth.getCurrentUser()
      const { data, error } = await supabase.from('clients').insert([{ ...client, user_id: user.id }]).select()
      return { data: data?.[0], error }
    } catch (err) {
      console.error('clientsDB.create error:', err)
      return { data: null, error: err }
    }
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
    try {
      const { data, error } = await supabase.from('clients').update(client).eq('id', id).select()
      return { data: data?.[0], error }
    } catch (err) {
      console.error('clientsDB.update error:', err)
      return { data: null, error: err }
    }
  },
  
  async delete(id) {
    if (useMock || !supabase) {
      const clients = JSON.parse(localStorage.getItem('cp_clients') || '[]')
      const filtered = clients.filter(c => c.id !== id && c.id !== id.toString())
      localStorage.setItem('cp_clients', JSON.stringify(filtered))
      return { error: null }
    }
    try {
      return await supabase.from('clients').delete().eq('id', id)
    } catch (err) {
      console.error('clientsDB.delete error:', err)
      return { error: err }
    }
  }
}

export const devisDB = {
  async getAll() {
    if (useMock || !supabase) {
      const data = JSON.parse(localStorage.getItem('cp_devis') || '[]')
      return { data, error: null }
    }
    try {
      return await supabase.from('devis').select('*').order('created_at', { ascending: false })
    } catch (err) {
      console.error('devisDB.getAll error:', err)
      return { data: [], error: err }
    }
  },
  
  async create(devis) {
    if (useMock || !supabase) {
      const allDevis = JSON.parse(localStorage.getItem('cp_devis') || '[]')
      const newDevis = { 
        ...devis, 
        id: Date.now().toString(), 
        created_at: new Date().toISOString() 
      }
      allDevis.push(newDevis)
      localStorage.setItem('cp_devis', JSON.stringify(allDevis))
      return { data: newDevis, error: null }
    }
    try {
      const user = await auth.getCurrentUser()
      const { data, error } = await supabase.from('devis').insert([{ ...devis, user_id: user.id }]).select()
      return { data: data?.[0], error }
    } catch (err) {
      console.error('devisDB.create error:', err)
      return { data: null, error: err }
    }
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
    try {
      const { data, error } = await supabase.from('devis').update(devis).eq('id', id).select()
      return { data: data?.[0], error }
    } catch (err) {
      console.error('devisDB.update error:', err)
      return { data: null, error: err }
    }
  }
}

export { supabase }
