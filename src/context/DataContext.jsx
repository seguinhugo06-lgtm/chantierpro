import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DEVIS_STATUS, CHANTIER_STATUS } from '../lib/constants';
import { calculateChantierMargin } from '../lib/business/margin-calculator';
import { loadAllData, saveItem, deleteItem, getNextNumero } from '../hooks/useSupabaseSync';
import { isDemo, auth } from '../supabaseClient';
import { logger } from '../lib/logger';
import { queueMutation } from '../lib/offline/sync';
import { toast } from '../stores/toastStore';

/**
 * DataContext - Global data state (clients, devis, chantiers, etc.)
 * Now with Supabase sync for persistence
 * In demo mode, uses localStorage for persistence
 */

const DataContext = createContext(null);

/** Validate that a string looks like a UUID (v4 format) */
const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/** Filter out records with non-UUID IDs (ghost demo data that leaked into Supabase) */
const sanitizeRecords = (arr) => arr.filter(item => isValidUUID(item.id));

/** Queue a mutation for offline sync and notify user if actually offline.
 *  Skip queueing in demo mode (no Supabase to sync to). */
const queueOffline = async (action, entity, data) => {
  if (isDemo) return; // Demo mode: data is in localStorage, no sync needed
  await queueMutation(action, entity, data);
  if (!navigator.onLine) {
    toast.info('Sauvegardé hors-ligne', 'Synchronisation automatique au retour du réseau');
  }
};

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
      logger.debug('📥 Loaded demo data from localStorage:', {
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

// Demo seed catalogue — articles BTP de base pour les nouveaux utilisateurs
const DEMO_SEED_CATALOGUE = [
  { id: crypto.randomUUID(), reference: 'CAR-001', designation: 'Carrelage sol intérieur 60x60', description: 'Fourniture et pose carrelage grès cérame', unite: 'm²', categorie: 'Carrelage', prixUnitaire: 65, tva: 20 },
  { id: crypto.randomUUID(), reference: 'PEI-001', designation: 'Peinture murale acrylique', description: 'Fourniture et application 2 couches', unite: 'm²', categorie: 'Peinture', prixUnitaire: 28, tva: 20 },
  { id: crypto.randomUUID(), reference: 'PLO-001', designation: 'Installation robinet mitigeur', description: 'Fourniture et pose mitigeur cuisine/salle de bain', unite: 'u', categorie: 'Plomberie', prixUnitaire: 180, tva: 20 },
  { id: crypto.randomUUID(), reference: 'ELE-001', designation: 'Pose prise électrique', description: 'Fourniture et pose prise 16A encastrée', unite: 'u', categorie: 'Électricité', prixUnitaire: 85, tva: 20 },
  { id: crypto.randomUUID(), reference: 'MEN-001', designation: 'Pose de cloison placo BA13', description: 'Fourniture et pose cloison sur ossature métallique', unite: 'm²', categorie: 'Menuiserie / Placo', prixUnitaire: 55, tva: 20 },
  { id: crypto.randomUUID(), reference: 'MAÇ-001', designation: 'Enduit façade extérieure', description: 'Préparation et application enduit monocouche', unite: 'm²', categorie: 'Maçonnerie', prixUnitaire: 45, tva: 20 },
];

export function DataProvider({ children, initialData = {} }) {
  // User ID from Supabase auth
  const [userId, setUserId] = useState(null);

  // Queue for saves attempted before userId was available (race condition fix)
  const pendingSavesRef = useRef([]);

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
  const [planningEvents, setPlanningEvents] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.planningEvents ?? initialData.planningEvents ?? [];
    }
    return initialData.planningEvents ?? [];
  });
  const [ouvrages, setOuvrages] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.ouvrages ?? initialData.ouvrages ?? [];
    }
    return initialData.ouvrages ?? [];
  });
  const [memos, setMemos] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.memos ?? initialData.memos ?? [];
    }
    return initialData.memos ?? [];
  });

  // Loading state — for real users, start as loading until Supabase data arrives
  const [dataLoading, setDataLoading] = useState(!isDemo);
  const [dataLoaded, setDataLoaded] = useState(() => isDemo && !!loadDemoData()); // Already loaded if demo data exists

  // Loading states (legacy)
  const [loading, setLoading] = useState({
    clients: false,
    devis: false,
    chantiers: false
  });

  // Ref to track if initial load is done (to avoid saving empty data on first render)
  const initialLoadDone = useRef(isDemo && !!loadDemoData());

  // Seed demo catalogue if empty (so DevisWizard has articles to show)
  useEffect(() => {
    if (isDemo && catalogue.length === 0) {
      setCatalogue(DEMO_SEED_CATALOGUE);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        ouvrages,
        memos,
      });
      logger.debug('💾 Demo data saved to localStorage');
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [clients, devis, chantiers, depenses, pointages, equipe, ajustements, catalogue, paiements, echanges, ouvrages, memos]);

  // Listen for auth state changes to get userId
  useEffect(() => {
    if (isDemo) return;

    // Get current user on mount
    const getCurrentUser = async () => {
      const user = await auth.getCurrentUser();
      if (user?.id) {
        logger.debug('📱 User authenticated:', user.id);
        setUserId(user.id);
      }
    };
    getCurrentUser();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        logger.debug('🔑 User signed in:', session.user.id);
        setUserId(session.user.id);
        setDataLoaded(false); // Reset to trigger data reload
      } else if (event === 'SIGNED_OUT') {
        logger.debug('🚪 User signed out');
        setUserId(null);
        // Clear data on sign out
        setClients([]);
        setChantiers([]);
        setDevis([]);
        setDepenses([]);
        setEquipe([]);
        setPointages([]);
        setCatalogue([]);
        setMemos([]);
        setDataLoaded(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Flush pending saves once userId becomes available (race condition fix)
  useEffect(() => {
    if (!userId || isDemo || pendingSavesRef.current.length === 0) return;

    const pending = [...pendingSavesRef.current];
    pendingSavesRef.current = [];
    logger.debug(`🔄 Flushing ${pending.length} pending saves now that userId is available`);

    pending.forEach(async ({ table, item }) => {
      try {
        await saveItem(table, item, userId);
        logger.debug(`✅ Pending save flushed: ${table}/${item.id}`);
      } catch (error) {
        console.error(`❌ Failed to flush pending save for ${table}:`, error);
        await queueOffline('create', table, item);
      }
    });
  }, [userId]);

  // Load data from Supabase when userId is available
  useEffect(() => {
    if (isDemo) { setDataLoading(false); return; }
    if (!userId) return; // Still waiting for auth — keep dataLoading true
    if (dataLoaded) { setDataLoading(false); return; } // Already loaded

    const loadData = async () => {
      setDataLoading(true);
      try {
        logger.debug('📥 Loading data from Supabase...');
        const data = await loadAllData(userId);
        if (data) {
          // Deduplicate by ID and sanitize to remove ghost records with non-UUID IDs
          const dedup = (arr) => [...new Map(arr.map(item => [item.id, item])).values()];
          const clean = (arr) => sanitizeRecords(dedup(arr));
          setClients(clean(data.clients));
          setChantiers(clean(data.chantiers));
          setDevis(clean(data.devis));
          setDepenses(clean(data.depenses));
          setEquipe(clean(data.equipe));
          setPointages(clean(data.pointages));
          setCatalogue(clean(data.catalogue));
          if (data.planningEvents) setPlanningEvents(clean(data.planningEvents));
          if (data.paiements) setPaiements(clean(data.paiements));
          if (data.echanges) setEchanges(clean(data.echanges));
          if (data.ajustements) setAjustements(clean(data.ajustements));
          // Ouvrages loaded into state
          if (data.ouvrages) setOuvrages(clean(data.ouvrages));
          // Memos loaded into state
          if (data.memos) setMemos(clean(data.memos));
          setDataLoaded(true);
          logger.debug('✅ Data loaded from Supabase:', {
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

    // Save to Supabase
    if (!isDemo) {
      if (userId) {
        try {
          logger.debug('💾 addClient: saving to Supabase, userId=', userId, 'clientId=', newClient.id);
          const saved = await saveItem('clients', newClient, userId);
          if (saved) {
            setClients(prev => prev.map(c => c.id === newClient.id ? saved : c));
            logger.debug('✅ addClient: saved successfully');
            return saved;
          }
        } catch (error) {
          console.error('❌ addClient: Supabase save failed:', error.message);
          toast.error('Erreur de sauvegarde', error.message);
          await queueOffline('create', 'clients', newClient);
        }
      } else {
        pendingSavesRef.current.push({ table: 'clients', item: newClient });
        logger.debug('⏳ addClient: queued (userId not yet available)');
      }
    }

    return newClient;
  }, [userId]);

  const updateClient = useCallback(async (id, data) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));

    if (!isDemo) {
      if (userId) {
        try {
          const current = clients.find(c => c.id === id);
          if (current) {
            await saveItem('clients', { ...current, ...data }, userId);
          }
        } catch (error) {
          console.error('Error updating client in Supabase:', error);
          await queueOffline('update', 'clients', { id, ...data });
        }
      } else {
        const current = clients.find(c => c.id === id);
        if (current) {
          pendingSavesRef.current.push({ table: 'clients', item: { ...current, ...data } });
        }
      }
    }
  }, [userId, clients]);

  const deleteClient = useCallback(async (id) => {
    setClients(prev => prev.filter(c => c.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('clients', id, userId);
      } catch (error) {
        console.error('Error deleting client from Supabase:', error);
        await queueOffline('delete', 'clients', { id });
      }
    }
  }, [userId]);

  const getClient = useCallback((id) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  // ============ DEVIS OPERATIONS ============
  const addDevis = useCallback(async (data) => {
    // Prevent ghost devis: reject documents without required fields
    if (!data.numero || !data.client_id) {
      console.error('addDevis: rejected ghost devis (missing numero or client_id):', { numero: data.numero, client_id: data.client_id });
      return null;
    }
    // Validate client_id is a proper UUID to prevent ghost data (demo IDs like 'c1')
    if (!isDemo && data.client_id && !isValidUUID(data.client_id)) {
      console.error('addDevis: invalid client_id (non-UUID):', data.client_id);
      return null;
    }
    // Prevent duplicate numeros — check both local + Supabase
    if (devis.some(d => d.numero === data.numero)) {
      console.warn('addDevis: duplicate numero detected, regenerating:', data.numero);
      data.numero = await getNextNumero(data.type || 'devis', userId, devis);
    }

    const newDevis = {
      id: crypto.randomUUID(),
      statut: DEVIS_STATUS.BROUILLON,
      type: 'devis',
      ...data,
      createdAt: new Date().toISOString()
    };

    setDevis(prev => prev.some(d => d.id === newDevis.id) ? prev : [...prev, newDevis]);

    if (!isDemo) {
      if (userId) {
        try {
          logger.debug('💾 addDevis: saving to Supabase, userId=', userId, 'numero=', newDevis.numero);
          const saved = await saveItem('devis', newDevis, userId);
          if (saved) {
            setDevis(prev => prev.map(d => d.id === newDevis.id ? saved : d));
            logger.debug('✅ addDevis: saved successfully');
            return saved;
          }
        } catch (error) {
          console.error('❌ addDevis: Supabase save failed:', error.message);
          toast.error('Erreur sauvegarde devis', error.message);
          await queueOffline('create', 'devis', newDevis);
        }
      } else {
        pendingSavesRef.current.push({ table: 'devis', item: newDevis });
        logger.debug('⏳ addDevis: queued (userId not yet available)');
      }
    }

    return newDevis;
  }, [userId, devis]);

  const updateDevis = useCallback(async (id, data) => {
    setDevis(prev => prev.map(d =>
      d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
    ));

    if (!isDemo) {
      if (userId) {
        try {
          const current = devis.find(d => d.id === id);
          if (current) {
            logger.debug('💾 updateDevis: saving to Supabase, statut=', data.statut || current.statut);
            await saveItem('devis', { ...current, ...data }, userId);
            logger.debug('✅ updateDevis: saved successfully');
          }
        } catch (error) {
          console.error('❌ updateDevis: Supabase save failed:', error.message);
          toast.error('Erreur mise à jour', error.message);
          await queueOffline('update', 'devis', { id, ...data });
        }
      } else {
        // Queue the full merged item for pending save
        const current = devis.find(d => d.id === id);
        if (current) {
          pendingSavesRef.current.push({ table: 'devis', item: { ...current, ...data } });
          logger.debug('⏳ Devis update queued for pending save');
        }
      }
    }
  }, [userId, devis]);

  const deleteDevis = useCallback(async (id) => {
    setDevis(prev => prev.filter(d => d.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('devis', id, userId);
      } catch (error) {
        console.error('Error deleting devis from Supabase:', error);
        await queueOffline('delete', 'devis', { id });
      }
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

    if (!isDemo) {
      if (userId) {
        try {
          const saved = await saveItem('chantiers', newChantier, userId);
          if (saved) {
            setChantiers(prev => prev.map(c => c.id === newChantier.id ? saved : c));
            return saved;
          }
        } catch (error) {
          console.error('Error saving chantier to Supabase:', error);
          await queueOffline('create', 'chantiers', newChantier);
        }
      } else {
        pendingSavesRef.current.push({ table: 'chantiers', item: newChantier });
        logger.debug('⏳ Chantier queued for pending save');
      }
    }

    return newChantier;
  }, [userId]);

  const updateChantier = useCallback(async (id, data) => {
    setChantiers(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));

    if (!isDemo) {
      if (userId) {
        try {
          const current = chantiers.find(c => c.id === id);
          if (current) {
            logger.debug('💾 updateChantier: saving, taches count=', (data.taches || current.taches || []).length);
            await saveItem('chantiers', { ...current, ...data }, userId);
            logger.debug('✅ updateChantier: saved successfully');
          }
        } catch (error) {
          console.error('❌ updateChantier: Supabase save failed:', error.message);
          toast.error('Erreur sauvegarde chantier', error.message);
          await queueOffline('update', 'chantiers', { id, ...data });
        }
      } else {
        const current = chantiers.find(c => c.id === id);
        if (current) {
          pendingSavesRef.current.push({ table: 'chantiers', item: { ...current, ...data } });
        }
      }
    }
  }, [userId, chantiers]);

  const deleteChantier = useCallback(async (id) => {
    setChantiers(prev => prev.filter(c => c.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('chantiers', id, userId);
      } catch (error) {
        console.error('Error deleting chantier from Supabase:', error);
        await queueOffline('delete', 'chantiers', { id });
      }
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
        await queueOffline('create', 'depenses', newDepense);
      }
    }

    return newDepense;
  }, [userId]);

  const updateDepense = useCallback(async (id, data) => {
    setDepenses(prev => prev.map(d =>
      d.id === id ? { ...d, ...data } : d
    ));

    if (!isDemo && userId) {
      try {
        const current = depenses.find(d => d.id === id);
        if (current) {
          await saveItem('depenses', { ...current, ...data }, userId);
        }
      } catch (error) {
        console.error('Error updating depense in Supabase:', error);
        await queueOffline('update', 'depenses', { id, ...data });
      }
    }
  }, [userId, depenses]);

  const deleteDepense = useCallback(async (id) => {
    setDepenses(prev => prev.filter(d => d.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('depenses', id, userId);
      } catch (error) {
        console.error('Error deleting depense from Supabase:', error);
        await queueOffline('delete', 'depenses', { id });
      }
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
        await queueOffline('create', 'pointages', newPointage);
      }
    }

    return newPointage;
  }, [userId]);

  const updatePointage = useCallback(async (id, data) => {
    setPointages(prev => prev.map(p =>
      p.id === id ? { ...p, ...data } : p
    ));

    if (!isDemo && userId) {
      try {
        const current = pointages.find(p => p.id === id);
        if (current) {
          await saveItem('pointages', { ...current, ...data }, userId);
        }
      } catch (error) {
        console.error('Error updating pointage in Supabase:', error);
        await queueOffline('update', 'pointages', { id, ...data });
      }
    }
  }, [userId, pointages]);

  const deletePointage = useCallback(async (id) => {
    setPointages(prev => prev.filter(p => p.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('pointages', id, userId);
      } catch (error) {
        console.error('Error deleting pointage from Supabase:', error);
        await queueOffline('delete', 'pointages', { id });
      }
    }
  }, [userId]);

  const getPointagesByChantier = useCallback((chantierId) => {
    return pointages.filter(p => p.chantierId === chantierId);
  }, [pointages]);

  // ============ AJUSTEMENT OPERATIONS ============
  const addAjustement = useCallback(async (data) => {
    const newAjustement = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setAjustements(prev => [...prev, newAjustement]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('ajustements', newAjustement, userId);
        if (saved) {
          setAjustements(prev => prev.map(a => a.id === newAjustement.id ? saved : a));
          return saved;
        }
      } catch (error) {
        console.error('Error saving ajustement to Supabase:', error);
        await queueOffline('create', 'ajustements', newAjustement);
      }
    }
    return newAjustement;
  }, [userId]);

  const deleteAjustement = useCallback(async (id) => {
    setAjustements(prev => prev.filter(a => a.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('ajustements', id, userId);
      } catch (error) {
        console.error('Error deleting ajustement from Supabase:', error);
        await queueOffline('delete', 'ajustements', { id });
      }
    }
  }, [userId]);

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
        await queueOffline('create', 'equipe', newEmployee);
      }
    }

    return newEmployee;
  }, [userId]);

  const updateEmployee = useCallback(async (id, data) => {
    setEquipe(prev => prev.map(e =>
      e.id === id ? { ...e, ...data } : e
    ));

    if (!isDemo && userId) {
      try {
        const current = equipe.find(e => e.id === id);
        if (current) {
          await saveItem('equipe', { ...current, ...data }, userId);
        }
      } catch (error) {
        console.error('Error updating employee in Supabase:', error);
        await queueOffline('update', 'equipe', { id, ...data });
      }
    }
  }, [userId, equipe]);

  const deleteEmployee = useCallback(async (id) => {
    setEquipe(prev => prev.filter(e => e.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('equipe', id, userId);
      } catch (error) {
        console.error('Error deleting employee from Supabase:', error);
        await queueOffline('delete', 'equipe', { id });
      }
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
        await queueOffline('create', 'catalogue', newItem);
      }
    }

    return newItem;
  }, [userId]);

  const updateCatalogueItem = useCallback(async (id, data) => {
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));

    if (!isDemo && userId) {
      try {
        const current = catalogue.find(c => c.id === id);
        if (current) {
          await saveItem('catalogue', { ...current, ...data }, userId);
        }
      } catch (error) {
        console.error('Error updating catalogue item in Supabase:', error);
        await queueOffline('update', 'catalogue', { id, ...data });
      }
    }
  }, [userId, catalogue]);

  const deleteCatalogueItem = useCallback(async (id) => {
    setCatalogue(prev => prev.filter(c => c.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('catalogue', id, userId);
      } catch (error) {
        console.error('Error deleting catalogue item from Supabase:', error);
        await queueOffline('delete', 'catalogue', { id });
      }
    }
  }, [userId]);

  const deductStock = useCallback((id, quantity) => {
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, stock: Math.max(0, (c.stock || 0) - quantity) } : c
    ));
  }, []);

  // ============ PAIEMENT OPERATIONS ============
  const addPaiement = useCallback(async (data) => {
    const newPaiement = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setPaiements(prev => [...prev, newPaiement]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('paiements', newPaiement, userId);
        if (saved) {
          setPaiements(prev => prev.map(p => p.id === newPaiement.id ? saved : p));
          return saved;
        }
      } catch (error) {
        console.error('Error saving paiement to Supabase:', error);
        await queueOffline('create', 'paiements', newPaiement);
      }
    }
    return newPaiement;
  }, [userId]);

  const getPaiementsByDevis = useCallback((devisId) => {
    return paiements.filter(p => p.devisId === devisId || p.invoiceId === devisId);
  }, [paiements]);

  // ============ ECHANGE OPERATIONS ============
  const addEchange = useCallback(async (data) => {
    const newEchange = {
      id: crypto.randomUUID(),
      ...data,
      date: new Date().toISOString()
    };
    setEchanges(prev => [...prev, newEchange]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('echanges', newEchange, userId);
        if (saved) {
          setEchanges(prev => prev.map(e => e.id === newEchange.id ? saved : e));
          return saved;
        }
      } catch (error) {
        console.error('Error saving echange to Supabase:', error);
        await queueOffline('create', 'echanges', newEchange);
      }
    }
    return newEchange;
  }, [userId]);

  // ============ PLANNING EVENT OPERATIONS ============
  const addPlanningEvent = useCallback(async (data) => {
    const newEvent = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setPlanningEvents(prev => prev.some(e => e.id === newEvent.id) ? prev : [...prev, newEvent]);

    if (!isDemo && userId) {
      try {
        await saveItem('planning_events', newEvent, userId);
      } catch (error) {
        console.error('Error saving planning event to Supabase:', error);
        await queueOffline('create', 'planning_events', newEvent);
      }
    }
    return newEvent;
  }, [userId]);

  const updatePlanningEvent = useCallback(async (id, data) => {
    const updated = { id, ...data };
    setPlanningEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));

    if (!isDemo && userId) {
      try {
        await saveItem('planning_events', updated, userId);
      } catch (error) {
        console.error('Error updating planning event:', error);
        await queueOffline('update', 'planning_events', updated);
      }
    }
  }, [userId]);

  const deletePlanningEvent = useCallback(async (id) => {
    setPlanningEvents(prev => prev.filter(e => e.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('planning_events', id, userId);
      } catch (error) {
        console.error('Error deleting planning event:', error);
        await queueOffline('delete', 'planning_events', { id });
      }
    }
  }, [userId]);

  // ============ OUVRAGE OPERATIONS ============
  const addOuvrage = useCallback(async (data) => {
    const newOuvrage = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setOuvrages(prev => [...prev, newOuvrage]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('ouvrages', newOuvrage, userId);
        if (saved) {
          setOuvrages(prev => prev.map(o => o.id === newOuvrage.id ? saved : o));
          return saved;
        }
      } catch (error) {
        console.error('Error saving ouvrage to Supabase:', error);
        await queueOffline('create', 'ouvrages', newOuvrage);
      }
    }
    return newOuvrage;
  }, [userId]);

  const updateOuvrage = useCallback(async (id, data) => {
    setOuvrages(prev => prev.map(o =>
      o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o
    ));

    if (!isDemo && userId) {
      try {
        const current = ouvrages.find(o => o.id === id);
        if (current) {
          await saveItem('ouvrages', { ...current, ...data }, userId);
        }
      } catch (error) {
        console.error('Error updating ouvrage in Supabase:', error);
        await queueOffline('update', 'ouvrages', { id, ...data });
      }
    }
  }, [userId, ouvrages]);

  const deleteOuvrage = useCallback(async (id) => {
    setOuvrages(prev => prev.filter(o => o.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('ouvrages', id, userId);
      } catch (error) {
        console.error('Error deleting ouvrage from Supabase:', error);
        await queueOffline('delete', 'ouvrages', { id });
      }
    }
  }, [userId]);

  // ============ MEMO OPERATIONS ============
  const addMemo = useCallback(async (data) => {
    const newMemo = {
      id: crypto.randomUUID(),
      text: data.text || '',
      notes: data.notes || null,
      priority: data.priority || null,
      due_date: data.due_date || null,
      due_time: data.due_time || null,
      category: data.category || null,
      chantier_id: data.chantier_id || null,
      client_id: data.client_id || null,
      is_done: false,
      done_at: null,
      position: 0,
      subtasks: data.subtasks || [],
      recurrence: data.recurrence || null,
      sort_order: data.sort_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Bump all existing positions +1
    setMemos(prev => [newMemo, ...prev.map(m => ({ ...m, position: (m.position || 0) + 1 }))]);

    if (!isDemo && userId) {
      try {
        const saved = await saveItem('memos', newMemo, userId);
        if (saved) {
          setMemos(prev => prev.map(m => m.id === newMemo.id ? saved : m));
          return saved;
        }
      } catch (error) {
        console.error('Error saving memo to Supabase:', error);
        await queueOffline('create', 'memos', newMemo);
      }
    }
    return newMemo;
  }, [userId]);

  const updateMemo = useCallback(async (id, updates) => {
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
    ));

    if (!isDemo && userId) {
      try {
        const current = memos.find(m => m.id === id);
        if (current) {
          await saveItem('memos', { ...current, ...updates }, userId);
        }
      } catch (error) {
        console.error('Error updating memo in Supabase:', error);
        await queueOffline('update', 'memos', { id, ...updates });
      }
    }
  }, [userId, memos]);

  const deleteMemo = useCallback(async (id) => {
    setMemos(prev => prev.filter(m => m.id !== id));

    if (!isDemo && userId) {
      try {
        await deleteItem('memos', id, userId);
      } catch (error) {
        console.error('Error deleting memo from Supabase:', error);
        await queueOffline('delete', 'memos', { id });
      }
    }
  }, [userId]);

  const toggleMemo = useCallback(async (id) => {
    const memo = memos.find(m => m.id === id);
    if (!memo) return;

    const updates = {
      is_done: !memo.is_done,
      done_at: !memo.is_done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates } : m
    ));

    if (!isDemo && userId) {
      try {
        await saveItem('memos', { ...memo, ...updates }, userId);
      } catch (error) {
        console.error('Error toggling memo in Supabase:', error);
        await queueOffline('update', 'memos', { id, ...updates });
      }
    }
  }, [userId, memos]);

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

  // Helper to get next unique numero for devis/facture
  const generateNextNumero = useCallback(async (type) => {
    return getNextNumero(type, userId, devis);
  }, [userId, devis]);

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
    generateNextNumero,

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

    // Ouvrage operations
    ouvrages,
    setOuvrages,
    addOuvrage,
    updateOuvrage,
    deleteOuvrage,

    // Planning event operations
    planningEvents,
    setPlanningEvents,
    addPlanningEvent,
    updatePlanningEvent,
    deletePlanningEvent,

    // Memo operations
    memos,
    setMemos,
    addMemo,
    updateMemo,
    deleteMemo,
    toggleMemo,

    // Calculated values
    getChantierBilan
  }), [
    clients, devis, chantiers, depenses, pointages, equipe, ajustements,
    catalogue, paiements, echanges, ouvrages, planningEvents, memos, loading, dataLoading,
    addClient, updateClient, deleteClient, getClient,
    addDevis, updateDevis, deleteDevis, getDevis, getDevisByClient, getDevisByChantier, generateNextNumero,
    addChantier, updateChantier, deleteChantier, getChantier,
    addDepense, updateDepense, deleteDepense, getDepensesByChantier,
    addPointage, updatePointage, deletePointage, getPointagesByChantier,
    addAjustement, deleteAjustement, getAjustementsByChantier,
    addEmployee, updateEmployee, deleteEmployee,
    addCatalogueItem, updateCatalogueItem, deleteCatalogueItem, deductStock,
    addPaiement, getPaiementsByDevis,
    addEchange,
    addOuvrage, updateOuvrage, deleteOuvrage,
    addPlanningEvent, updatePlanningEvent, deletePlanningEvent,
    addMemo, updateMemo, deleteMemo, toggleMemo,
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
