import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DEVIS_STATUS, CHANTIER_STATUS } from '../lib/constants';
import { calculateChantierMargin } from '../lib/business/margin-calculator';
import { loadAllData, saveItem, deleteItem } from '../hooks/useSupabaseSync';
import { isDemo, auth } from '../supabaseClient';

/**
 * DataContext - Global data state (clients, devis, chantiers, etc.)
 * Now with Supabase sync for persistence
 * In demo mode, uses localStorage for persistence
 */

const DataContext = createContext(null);

// localStorage keys for demo mode persistence
const DEMO_STORAGE_KEY = 'chantierpro_demo_data';

// Cache for demo data to avoid multiple reads
let cachedDemoData = null;
let demoDataLoaded = false;

/**
 * Load demo data from localStorage (cached)
 */
function loadDemoData() {
  if (demoDataLoaded) return cachedDemoData;

  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      cachedDemoData = JSON.parse(stored);
      console.log('📥 Loaded demo data from localStorage:', {
        clients: cachedDemoData?.clients?.length || 0,
        devis: cachedDemoData?.devis?.length || 0,
        chantiers: cachedDemoData?.chantiers?.length || 0,
      });
    }
  } catch (error) {
    console.warn('Failed to load demo data from localStorage:', error);
    cachedDemoData = null;
  }

  demoDataLoaded = true;
  return cachedDemoData;
}

/**
 * Save demo data to localStorage
 */
function saveDemoData(data) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    // Update cache
    cachedDemoData = data;
  } catch (error) {
    console.warn('Failed to save demo data to localStorage:', error);
  }
}

export function DataProvider({ children, initialData = {} }) {
  // User ID from Supabase auth
  const [userId, setUserId] = useState(null);

  // Core data - use lazy initialization to load from localStorage in demo mode
  const [clients, setClients] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.clients ?? initialData.clients ?? [];
    }
    return initialData.clients ?? [];
  });
  const [devis, setDevis] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.devis ?? initialData.devis ?? [];
    }
    return initialData.devis ?? [];
  });
  const [chantiers, setChantiers] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.chantiers ?? initialData.chantiers ?? [];
    }
    return initialData.chantiers ?? [];
  });
  const [depenses, setDepenses] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.depenses ?? initialData.depenses ?? [];
    }
    return initialData.depenses ?? [];
  });
  const [pointages, setPointages] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.pointages ?? initialData.pointages ?? [];
    }
    return initialData.pointages ?? [];
  });
  const [equipe, setEquipe] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.equipe ?? initialData.equipe ?? [];
    }
    return initialData.equipe ?? [];
  });
  const [ajustements, setAjustements] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.ajustements ?? initialData.ajustements ?? [];
    }
    return initialData.ajustements ?? [];
  });
  const [catalogue, setCatalogue] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.catalogue ?? initialData.catalogue ?? [];
    }
    return initialData.catalogue ?? [];
  });
  const [paiements, setPaiements] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.paiements ?? initialData.paiements ?? [];
    }
    return initialData.paiements ?? [];
  });
  const [echanges, setEchanges] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.echanges ?? initialData.echanges ?? [];
    }
    return initialData.echanges ?? [];
  });

  // Loading state
  const [dataLoading, setDataLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(() => isDemo && !!loadDemoData()); // Already loaded if demo data exists

  // Loading states (legacy)
  const [loading, setLoading] = useState({
    clients: false,
    devis: false,
    chantiers: false
  });

  // Ref to track if initial load is done (to avoid saving empty data on first render)
  const initialLoadDone = useRef(isDemo && !!loadDemoData());

  // Save to localStorage when data changes (demo mode only)
  useEffect(() => {
    if (!isDemo) return;

    // Don't save on initial render if we loaded from localStorage
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }

    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(() => {
      saveDemoData({
        clients,
        devis,
        chantiers,
        depenses,
        pointages,
        equipe,
        ajustements,
        catalogue,
        paiements,
        echanges,
      });
      console.log('💾 Demo data saved to localStorage');
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [clients, devis, chantiers, depenses, pointages, equipe, ajustements, catalogue, paiements, echanges]);

  // Listen for auth state changes to get userId
  useEffect(() => {
    if (isDemo) return;

    // Get current user on mount
    const getCurrentUser = async () => {
      const user = await auth.getCurrentUser();
      if (user?.id) {
        console.log('📱 User authenticated:', user.id);
        setUserId(user.id);
      }
    };
    getCurrentUser();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔑 User signed in:', session.user.id);
        setUserId(session.user.id);
        setDataLoaded(false); // Reset to trigger data reload
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out');
        setUserId(null);
        // Clear data on sign out
        setClients([]);
        setChantiers([]);
        setDevis([]);
        setDepenses([]);
        setEquipe([]);
        setPointages([]);
        setCatalogue([]);
        setDataLoaded(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Load data from Supabase when userId is available
  useEffect(() => {
    if (isDemo || !userId || dataLoaded) return;

    const loadData = async () => {
      setDataLoading(true);
      try {
        console.log('📥 Loading data from Supabase...');
        const data = await loadAllData(userId);
        if (data) {
          // Deduplicate by ID to prevent duplicates from sync issues
          const dedup = (arr) => [...new Map(arr.map(item => [item.id, item])).values()];
          setClients(dedup(data.clients));
          setChantiers(dedup(data.chantiers));
          setDevis(dedup(data.devis));
          setDepenses(dedup(data.depenses));
          setEquipe(dedup(data.equipe));
          setPointages(dedup(data.pointages));
          setCatalogue(dedup(data.catalogue));
          setDataLoaded(true);
          console.log('✅ Data loaded from Supabase:', {
            clients: data.clients.length,
            chantiers: data.chantiers.length,
            devis: data.devis.length,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [userId, dataLoaded]);

  // ============ CLIENT OPERATIONS ============
  const addClient = useCallback(async (data) => {
    // Generate proper UUID for Supabase compatibility
    const newClient = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };

    // Optimistic update (prevent duplicates)
    setClients(prev => prev.some(c => c.id === newClient.id) ? prev : [...prev, newClient]);

    // Save to Supabase and wait for response
    if (!isDemo && userId) {
      try {
        const saved = await saveItem('clients', newClient, userId);
        if (saved) {
          // Update with the saved version (has correct timestamps, etc.)
          setClients(prev => prev.map(c => c.id === newClient.id ? saved : c));
          return saved;
        }
      } catch (error) {
        console.error('Error saving client to Supabase:', error);
        // Rollback optimistic update
        setClients(prev => prev.filter(c => c.id !== newClient.id));
        throw error;
      }
    }

    return newClient;
  }, [userId]);

  const updateClient = useCallback(async (id, data) => {
    const updatedClient = { id, ...data, updatedAt: new Date().toISOString() };

    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));

    if (!isDemo && userId) {
      const current = clients.find(c => c.id === id);
      if (current) {
        await saveItem('clients', { ...current, ...data }, userId);
      }
    }
  }, [userId, clients]);

  const deleteClient = useCallback(async (id) => {
    setClients(prev => prev.filter(c => c.id !== id));

    if (!isDemo && userId) {
      await deleteItem('clients', id, userId);
    }
  }, [userId]);

  const getClient = useCallback((id) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  // ============ DEVIS OPERATIONS ============
  const addDevis = useCallback(async (data) => {
    const newDevis = {
      id: crypto.randomUUID(),
      statut: DEVIS_STATUS.BROUILLON,
      type: 'devis',
      ...data,
      createdAt: new Date().toISOString()
    };

    setDevis(prev => prev.some(d => d.id === newDevis.id) ? prev : [...prev, newDevis]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('devis', newDevis, userId);
        if (saved) {
          setDevis(prev => prev.map(d => d.id === newDevis.id ? saved : d));
          return saved;
        }
      } catch (error) {
        console.error('Error saving devis to Supabase:', error);
        // Rollback optimistic update
        setDevis(prev => prev.filter(d => d.id !== newDevis.id));
        throw error;
      }
    }

    return newDevis;
  }, [userId]);

  const updateDevis = useCallback(async (id, data) => {
    setDevis(prev => prev.map(d =>
      d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
    ));

    if (!isDemo && userId) {
      const current = devis.find(d => d.id === id);
      if (current) {
        await saveItem('devis', { ...current, ...data }, userId);
      }
    }
  }, [userId, devis]);

  const deleteDevis = useCallback(async (id) => {
    setDevis(prev => prev.filter(d => d.id !== id));

    if (!isDemo && userId) {
      await deleteItem('devis', id, userId);
    }
  }, [userId]);

  const getDevis = useCallback((id) => {
    return devis.find(d => d.id === id);
  }, [devis]);

  const getDevisByClient = useCallback((clientId) => {
    return devis.filter(d => d.client_id === clientId);
  }, [devis]);

  const getDevisByChantier = useCallback((chantierId) => {
    return devis.filter(d => d.chantier_id === chantierId);
  }, [devis]);

  // ============ CHANTIER OPERATIONS ============
  const addChantier = useCallback(async (data) => {
    const newChantier = {
      id: crypto.randomUUID(),
      statut: CHANTIER_STATUS.PROSPECT,
      avancement: 0,
      photos: [],
      taches: [],
      ...data,
      createdAt: new Date().toISOString()
    };

    setChantiers(prev => prev.some(c => c.id === newChantier.id) ? prev : [...prev, newChantier]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('chantiers', newChantier, userId);
        if (saved) {
          setChantiers(prev => prev.map(c => c.id === newChantier.id ? saved : c));
          return saved;
        }
      } catch (error) {
        console.error('Error saving chantier to Supabase:', error);
        // Rollback optimistic update
        setChantiers(prev => prev.filter(c => c.id !== newChantier.id));
        throw error;
      }
    }

    return newChantier;
  }, [userId]);

  const updateChantier = useCallback(async (id, data) => {
    setChantiers(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));

    if (!isDemo && userId) {
      const current = chantiers.find(c => c.id === id);
      if (current) {
        await saveItem('chantiers', { ...current, ...data }, userId);
      }
    }
  }, [userId, chantiers]);

  const deleteChantier = useCallback(async (id) => {
    setChantiers(prev => prev.filter(c => c.id !== id));

    if (!isDemo && userId) {
      await deleteItem('chantiers', id, userId);
    }
  }, [userId]);

  const getChantier = useCallback((id) => {
    return chantiers.find(c => c.id === id);
  }, [chantiers]);

  // ============ DEPENSE OPERATIONS ============
  const addDepense = useCallback(async (data) => {
    const newDepense = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };

    setDepenses(prev => [...prev, newDepense]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('depenses', newDepense, userId);
        if (saved) {
          setDepenses(prev => prev.map(d => d.id === newDepense.id ? saved : d));
          return saved;
        }
      } catch (error) {
        console.error('Error saving depense to Supabase:', error);
        setDepenses(prev => prev.filter(d => d.id !== newDepense.id));
        throw error;
      }
    }

    return newDepense;
  }, [userId]);

  const updateDepense = useCallback(async (id, data) => {
    setDepenses(prev => prev.map(d =>
      d.id === id ? { ...d, ...data } : d
    ));

    if (!isDemo && userId) {
      const current = depenses.find(d => d.id === id);
      if (current) {
        await saveItem('depenses', { ...current, ...data }, userId);
      }
    }
  }, [userId, depenses]);

  const deleteDepense = useCallback(async (id) => {
    setDepenses(prev => prev.filter(d => d.id !== id));

    if (!isDemo && userId) {
      await deleteItem('depenses', id, userId);
    }
  }, [userId]);

  const getDepensesByChantier = useCallback((chantierId) => {
    return depenses.filter(d => d.chantierId === chantierId);
  }, [depenses]);

  // ============ POINTAGE OPERATIONS ============
  const addPointage = useCallback(async (data) => {
    const newPointage = {
      id: crypto.randomUUID(),
      approuve: false,
      ...data,
      createdAt: new Date().toISOString()
    };

    setPointages(prev => [...prev, newPointage]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('pointages', newPointage, userId);
        if (saved) {
          setPointages(prev => prev.map(p => p.id === newPointage.id ? saved : p));
          return saved;
        }
      } catch (error) {
        console.error('Error saving pointage to Supabase:', error);
        setPointages(prev => prev.filter(p => p.id !== newPointage.id));
        throw error;
      }
    }

    return newPointage;
  }, [userId]);

  const updatePointage = useCallback(async (id, data) => {
    setPointages(prev => prev.map(p =>
      p.id === id ? { ...p, ...data } : p
    ));

    if (!isDemo && userId) {
      const current = pointages.find(p => p.id === id);
      if (current) {
        await saveItem('pointages', { ...current, ...data }, userId);
      }
    }
  }, [userId, pointages]);

  const deletePointage = useCallback(async (id) => {
    setPointages(prev => prev.filter(p => p.id !== id));

    if (!isDemo && userId) {
      await deleteItem('pointages', id, userId);
    }
  }, [userId]);

  const getPointagesByChantier = useCallback((chantierId) => {
    return pointages.filter(p => p.chantierId === chantierId);
  }, [pointages]);

  // ============ AJUSTEMENT OPERATIONS ============
  const addAjustement = useCallback((data) => {
    const newAjustement = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setAjustements(prev => [...prev, newAjustement]);
    return newAjustement;
  }, []);

  const deleteAjustement = useCallback((id) => {
    setAjustements(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAjustementsByChantier = useCallback((chantierId) => {
    return ajustements.filter(a => a.chantierId === chantierId);
  }, [ajustements]);

  // ============ EQUIPE OPERATIONS ============
  const addEmployee = useCallback(async (data) => {
    const newEmployee = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };

    setEquipe(prev => [...prev, newEmployee]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('equipe', newEmployee, userId);
        if (saved) {
          setEquipe(prev => prev.map(e => e.id === newEmployee.id ? saved : e));
          return saved;
        }
      } catch (error) {
        console.error('Error saving employee to Supabase:', error);
        setEquipe(prev => prev.filter(e => e.id !== newEmployee.id));
        throw error;
      }
    }

    return newEmployee;
  }, [userId]);

  const updateEmployee = useCallback(async (id, data) => {
    setEquipe(prev => prev.map(e =>
      e.id === id ? { ...e, ...data } : e
    ));

    if (!isDemo && userId) {
      const current = equipe.find(e => e.id === id);
      if (current) {
        await saveItem('equipe', { ...current, ...data }, userId);
      }
    }
  }, [userId, equipe]);

  const deleteEmployee = useCallback(async (id) => {
    setEquipe(prev => prev.filter(e => e.id !== id));

    if (!isDemo && userId) {
      await deleteItem('equipe', id, userId);
    }
  }, [userId]);

  // ============ CATALOGUE OPERATIONS ============
  const addCatalogueItem = useCallback(async (data) => {
    const newItem = {
      id: crypto.randomUUID(),
      stock: 0,
      favori: false,
      ...data,
      createdAt: new Date().toISOString()
    };

    setCatalogue(prev => [...prev, newItem]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('catalogue', newItem, userId);
        if (saved) {
          setCatalogue(prev => prev.map(c => c.id === newItem.id ? saved : c));
          return saved;
        }
      } catch (error) {
        console.error('Error saving catalogue item to Supabase:', error);
        setCatalogue(prev => prev.filter(c => c.id !== newItem.id));
        throw error;
      }
    }

    return newItem;
  }, [userId]);

  const updateCatalogueItem = useCallback(async (id, data) => {
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));

    if (!isDemo && userId) {
      const current = catalogue.find(c => c.id === id);
      if (current) {
        await saveItem('catalogue', { ...current, ...data }, userId);
      }
    }
  }, [userId, catalogue]);

  const deleteCatalogueItem = useCallback(async (id) => {
    setCatalogue(prev => prev.filter(c => c.id !== id));

    if (!isDemo && userId) {
      await deleteItem('catalogue', id, userId);
    }
  }, [userId]);

  const deductStock = useCallback((id, quantity) => {
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, stock: Math.max(0, (c.stock || 0) - quantity) } : c
    ));
  }, []);

  // ============ PAIEMENT OPERATIONS ============
  const addPaiement = useCallback((data) => {
    const newPaiement = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setPaiements(prev => [...prev, newPaiement]);
    return newPaiement;
  }, []);

  const getPaiementsByDevis = useCallback((devisId) => {
    return paiements.filter(p => p.devisId === devisId || p.invoiceId === devisId);
  }, [paiements]);

  // ============ ECHANGE OPERATIONS ============
  const addEchange = useCallback((data) => {
    const newEchange = {
      id: crypto.randomUUID(),
      ...data,
      date: new Date().toISOString()
    };
    setEchanges(prev => [...prev, newEchange]);
    return newEchange;
  }, []);

  // ============ CALCULATED VALUES ============
  const getChantierBilan = useCallback((chantierId) => {
    const chantier = chantiers.find(c => c.id === chantierId);
    if (!chantier) return null;

    return calculateChantierMargin(chantier, {
      devis,
      depenses,
      pointages,
      equipe,
      ajustements
    });
  }, [chantiers, devis, depenses, pointages, ajustements, equipe]);

  // ============ CONTEXT VALUE ============
  const value = useMemo(() => ({
    // Data
    clients,
    devis,
    chantiers,
    depenses,
    pointages,
    equipe,
    ajustements,
    catalogue,
    paiements,
    echanges,
    loading,
    dataLoading,

    // Setters (for direct access when needed)
    setClients,
    setDevis,
    setChantiers,
    setDepenses,
    setPointages,
    setEquipe,
    setAjustements,
    setCatalogue,
    setPaiements,
    setEchanges,
    setLoading,

    // Client operations
    addClient,
    updateClient,
    deleteClient,
    getClient,

    // Devis operations
    addDevis,
    updateDevis,
    deleteDevis,
    getDevis,
    getDevisByClient,
    getDevisByChantier,

    // Chantier operations
    addChantier,
    updateChantier,
    deleteChantier,
    getChantier,

    // Depense operations
    addDepense,
    updateDepense,
    deleteDepense,
    getDepensesByChantier,

    // Pointage operations
    addPointage,
    updatePointage,
    deletePointage,
    getPointagesByChantier,

    // Ajustement operations
    addAjustement,
    deleteAjustement,
    getAjustementsByChantier,

    // Equipe operations
    addEmployee,
    updateEmployee,
    deleteEmployee,

    // Catalogue operations
    addCatalogueItem,
    updateCatalogueItem,
    deleteCatalogueItem,
    deductStock,

    // Paiement operations
    addPaiement,
    getPaiementsByDevis,

    // Echange operations
    addEchange,

    // Calculated values
    getChantierBilan
  }), [
    clients, devis, chantiers, depenses, pointages, equipe, ajustements,
    catalogue, paiements, echanges, loading, dataLoading,
    addClient, updateClient, deleteClient, getClient,
    addDevis, updateDevis, deleteDevis, getDevis, getDevisByClient, getDevisByChantier,
    addChantier, updateChantier, deleteChantier, getChantier,
    addDepense, updateDepense, deleteDepense, getDepensesByChantier,
    addPointage, updatePointage, deletePointage, getPointagesByChantier,
    addAjustement, deleteAjustement, getAjustementsByChantier,
    addEmployee, updateEmployee, deleteEmployee,
    addCatalogueItem, updateCatalogueItem, deleteCatalogueItem, deductStock,
    addPaiement, getPaiementsByDevis,
    addEchange,
    getChantierBilan
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

/**
 * useData - Hook to access data context
 */
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

/**
 * useClients - Hook for client data
 */
export function useClients() {
  const { clients, addClient, updateClient, deleteClient, getClient } = useData();
  return { clients, addClient, updateClient, deleteClient, getClient };
}

/**
 * useDevis - Hook for devis data
 */
export function useDevis() {
  const {
    devis, addDevis, updateDevis, deleteDevis,
    getDevis, getDevisByClient, getDevisByChantier
  } = useData();
  return { devis, addDevis, updateDevis, deleteDevis, getDevis, getDevisByClient, getDevisByChantier };
}

/**
 * useChantiers - Hook for chantier data
 */
export function useChantiers() {
  const {
    chantiers, addChantier, updateChantier, deleteChantier,
    getChantier, getChantierBilan
  } = useData();
  return { chantiers, addChantier, updateChantier, deleteChantier, getChantier, getChantierBilan };
}

/**
 * useEquipe - Hook for equipe (team) data
 */
export function useEquipe() {
  const { equipe, addEmployee, updateEmployee, deleteEmployee } = useData();
  return { equipe, addEmployee, updateEmployee, deleteEmployee };
}

export default DataContext;
