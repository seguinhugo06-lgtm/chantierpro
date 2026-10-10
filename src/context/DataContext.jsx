import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DEVIS_STATUS, CHANTIER_STATUS } from '../lib/constants';
import { calculateChantierMargin } from '../lib/business/margin-calculator';
import { loadAllData, saveItem, updateItem, deleteItem, getNextNumero } from '../hooks/useSupabaseSync';
import { isDemo, auth, supabase } from '../supabaseClient';
import { useOrg } from './OrgContext';
import { useEntreprise } from './EntrepriseContext';
import { logAction, computeChanges } from '../lib/auditService';
import { createSnapshot } from '../lib/snapshotService';
import { logger } from '../lib/logger';
import { queueMutation } from '../lib/offline/sync';
import { toast } from '../stores/toastStore';
import { useSubscriptionStore, PLANS } from '../stores/subscriptionStore';
import { celebrateMilestone } from '../lib/celebrate';
import { captureException } from '../lib/sentry';
import { estEcritureDifferable, messageEcritureRefusee } from '../lib/erreursEcriture';

/**
 * DataContext - Global data state (clients, devis, chantiers, etc.)
 * Now with Supabase sync for persistence
 * In demo mode, uses localStorage for persistence
 */

const DataContext = createContext(null);

// ── Audit: tracked fields per entity type ──
const DEVIS_TRACKED_FIELDS = ['statut', 'client_id', 'client_nom', 'objet', 'lignes', 'total_ht', 'total_ttc', 'totalHt', 'totalTtc', 'notes', 'conditions', 'validite', 'remise_globale', 'remiseGlobale'];
const CLIENT_TRACKED_FIELDS = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'codePostal', 'type', 'siret', 'tva_intra'];
const CHANTIER_TRACKED_FIELDS = ['nom', 'statut', 'adresse', 'description', 'avancement', 'client_id', 'clientId', 'date_debut', 'dateDebut', 'date_fin', 'dateFin', 'montant_devis', 'montantDevis'];

// Fire-and-forget audit helper (never blocks the main action)
const _audit = (sb, params) => {
  logAction(sb, params).catch(err => console.error('[audit]', err));
};
const _snapshot = (sb, params) => {
  createSnapshot(sb, params).catch(err => console.error('[snapshot]', err));
};

/** Validate that a string looks like a UUID (v4 format) */
const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/** Filter out records with non-UUID IDs (ghost demo data that leaked into Supabase) */
const sanitizeRecords = (arr) => arr.filter(item => isValidUUID(item.id));

/** Queue a mutation for offline sync and notify user if actually offline.
 *  Skip queueing in demo mode (no Supabase to sync to). */
const queueOffline = async (action, entity, data, proprietaire) => {
  if (isDemo) return; // Demo mode: data is in localStorage, no sync needed
  await queueMutation(action, entity, data, proprietaire);
};

// localStorage keys for demo mode persistence
const DEMO_STORAGE_KEY = 'mallettico_demo_data';

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
  // Organization context (RBAC)
  const { orgId, loading: orgLoading } = useOrg();

  // Multi-entreprise context
  const { entrepriseId, loading: entrepriseLoading } = useEntreprise();

  // User ID and name from Supabase auth
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');

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

  // Custom templates (user-saved devis templates)
  const [customTemplates, setCustomTemplates] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      // Migrate from legacy localStorage key if needed
      if (!data?.customTemplates) {
        try {
          const legacy = JSON.parse(localStorage.getItem('chantierPro_customTemplates') || '[]');
          if (legacy.length > 0) return legacy;
        } catch (e) { /* ignore */ }
      }
      return data?.customTemplates ?? [];
    }
    return [];
  });

  // Template usage tracking
  const [templateUsages, setTemplateUsages] = useState(() => {
    if (isDemo) {
      const data = loadDemoData();
      return data?.templateUsages ?? [];
    }
    return [];
  });

  // Loading state — for real users, start as loading until Supabase data arrives
  const [dataLoading, setDataLoading] = useState(!isDemo);
  // Tables essentielles dont le chargement a échoué ({ tables, message }) ou null.
  const [loadError, setLoadError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
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
        customTemplates,
        templateUsages,
        // Oubliés jusqu'au 10 oct. 2026 : un rendez-vous de démo disparaissait au rechargement
        planningEvents,
      });
      logger.debug('💾 Demo data saved to localStorage');
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [clients, devis, chantiers, depenses, pointages, equipe, ajustements, catalogue, paiements, echanges, ouvrages, memos, customTemplates, templateUsages, planningEvents]);

  // Listen for auth state changes to get userId
  useEffect(() => {
    if (isDemo) return;

    // Get current user on mount
    const getCurrentUser = async () => {
      const user = await auth.getCurrentUser();
      if (user?.id) {
        logger.debug('📱 User authenticated:', user.id);
        setUserId(user.id);
        setUserName(user.user_metadata?.nom || user.email || '');
      }
    };
    getCurrentUser();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        logger.debug('🔑 User signed in:', session.user.id);
        setUserId(session.user.id);
        setUserName(session.user.user_metadata?.nom || session.user.email || '');
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

  // Flush pending saves once userId AND the organization are known (race condition fix) :
  // vidée plus tôt, la file partait sans organisation et ses lignes disparaissaient au rechargement.
  useEffect(() => {
    if (!userId || orgLoading || isDemo || pendingSavesRef.current.length === 0) return;

    const pending = [...pendingSavesRef.current];
    pendingSavesRef.current = [];
    logger.debug(`🔄 Flushing ${pending.length} pending saves now that userId is available`);

    pending.forEach(async ({ table, item }) => {
      try {
        await saveItem(table, item, userId, orgId);
        logger.debug(`✅ Pending save flushed: ${table}/${item.id}`);
      } catch (error) {
        console.error(`❌ Failed to flush pending save for ${table}:`, error);
        await queueOffline('create', table, item, userId);
      }
    });
  }, [userId, orgId, orgLoading]);

  // Reload data when entrepriseId changes (company switch)
  useEffect(() => {
    if (!isDemo && entrepriseId) {
      setDataLoaded(false); // trigger reload
    }
  }, [entrepriseId]);

  // Load data from Supabase when userId + orgId + entrepriseId are available
  useEffect(() => {
    if (isDemo) { setDataLoading(false); return; }
    if (!userId) return; // Still waiting for auth — keep dataLoading true
    if (orgLoading) return; // Still resolving organization
    if (entrepriseLoading) return; // Still resolving entreprise
    if (dataLoaded) { setDataLoading(false); return; } // Already loaded

    const loadData = async () => {
      setDataLoading(true);
      try {
        logger.debug('📥 Loading data from Supabase... (org:', orgId, ', entreprise:', entrepriseId, ')');
        // Deduplicate by ID and sanitize to remove ghost records with non-UUID IDs
        const dedup = (arr) => [...new Map(arr.map(item => [item.id, item])).values()];
        const clean = (arr) => sanitizeRecords(dedup(arr));
        const marquerVu = (arr) => clean(arr).map(d =>
          (d.statut === 'envoye' && d.viewed_at) ? { ...d, statut: 'vu' } : d
        );

        // Affichage anticipé : l'accueil n'a besoin que de ces trois tables.
        // On lève `dataLoading` ici plutôt qu'après les 21 requêtes — l'artisan
        // voit ses chiffres pendant que le reste finit d'arriver.
        const afficherLeCoeur = ({ clients, chantiers, devis }) => {
          setClients(clean(clients));
          setChantiers(clean(chantiers));
          setDevis(marquerVu(devis));
          setDataLoading(false);
        };

        const data = await loadAllData(userId, orgId, entrepriseId, afficherLeCoeur);
        if (!data) {
          // loadAllData a levé (réseau coupé avant même les requêtes, client indisponible…).
          setLoadError({ tables: ['clients', 'chantiers', 'devis'], message: 'chargement impossible' });
          return;
        }
        // Une table en échec garde ce qui est déjà affiché : la remplacer par [] ferait croire
        // à l'artisan que ses données ont disparu.
        const enEchec = new Set(data.erreurs.map((e) => e.table));
        const appliquer = (table, setter, valeurs) => { if (!enEchec.has(table) && valeurs) setter(valeurs); };
        appliquer('clients', setClients, clean(data.clients));
        appliquer('chantiers', setChantiers, clean(data.chantiers));
        // Compute 'vu' status from viewed_at (DB constraint doesn't allow 'vu' statut)
        appliquer('devis', setDevis, marquerVu(data.devis));
        appliquer('depenses', setDepenses, clean(data.depenses));
        appliquer('equipe', setEquipe, clean(data.equipe));
        appliquer('pointages', setPointages, clean(data.pointages));
        appliquer('catalogue', setCatalogue, clean(data.catalogue));
        appliquer('planningEvents', setPlanningEvents, data.planningEvents && clean(data.planningEvents));
        appliquer('paiements', setPaiements, data.paiements && clean(data.paiements));
        if (data.echanges) setEchanges(clean(data.echanges));
        if (data.ajustements) setAjustements(clean(data.ajustements));
        if (data.ouvrages) setOuvrages(clean(data.ouvrages));
        appliquer('memos', setMemos, data.memos && clean(data.memos));
        if (data.devisTemplates) setCustomTemplates(clean(data.devisTemplates));
        if (data.templateUsages) setTemplateUsages(clean(data.templateUsages));

        if (data.erreurs.length) {
          setLoadError({ tables: data.erreurs.map((e) => e.table), message: data.erreurs[0].message });
          captureException(new Error(`Chargement incomplet : ${data.erreurs.map((e) => `${e.table} (${e.code || e.message})`).join(', ')}`),
            { context: 'chargement des données' });
        } else {
          setLoadError(null);
          setDataLoaded(true);
        }
        logger.debug('✅ Data loaded from Supabase:', {
          clients: data.clients.length,
          chantiers: data.chantiers.length,
          devis: data.devis.length,
          erreurs: data.erreurs.length,
        });
      } catch (error) {
        captureException(error, { context: 'chargement des données' });
        setLoadError({ tables: ['clients', 'chantiers', 'devis'], message: error?.message || 'erreur inconnue' });
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [userId, orgId, orgLoading, entrepriseId, entrepriseLoading, dataLoaded, reloadToken]);

  // Relance manuelle après un échec de chargement (bandeau « Réessayer »).
  const retryLoad = useCallback(() => setReloadToken((n) => n + 1), []);

  /**
   * Garde-fou d'abonnement, posé au seul endroit par lequel TOUTES les créations
   * passent — page, modale, import, dictée vocale. Le poser sur chaque bouton
   * reviendrait à en oublier un, et un seul oubli rend la limite inopérante.
   *
   * Renvoie true si la création est autorisée. Sinon ouvre la fenêtre
   * d'abonnement, qui explique ce que débloque le passage au plan supérieur.
   */
  const autoriserCreation = useCallback((ressource) => {
    const { planId, usage, openUpgradeModal } = useSubscriptionStore.getState();
    const plan = PLANS[planId] || PLANS.gratuit;
    const limite = plan.limits?.[ressource] ?? -1;
    if (limite === -1) return true;                     // illimité
    if ((usage?.[ressource] ?? 0) < limite) return true;
    // UPGRADE_CONTEXTS indexe les limites en `<ressource>_limit` ; passer la
    // ressource nue afficherait le message générique au lieu du message ciblé.
    openUpgradeModal(`${ressource}_limit`);
    return false;
  }, []);

  // ============ ÉCRITURES EN BASE ============
  // Chaque écriture rend un résultat, pour que l'écran n'annonce un succès qu'une fois la base d'accord :
  // une création rend l'élément (enregistré, ou en attente de réseau) ou null si la base l'a refusé ;
  // une modification ou une suppression rend true (faite, ou en attente de réseau) ou false (refusée).
  // Avant (recette du 9 oct. 2026) : tout échec partait en file « hors ligne », y compris les refus
  // de la base qui ne passeraient jamais, et l'écran disait « enregistré ».
  const echecEcriture = useCallback(async (error, { action, table, data, annuler }) => {
    if (estEcritureDifferable(error)) {
      await queueOffline(action, table, data, userId);
      toast.info('Pas de connexion', 'Enregistré sur cet appareil : envoi automatique au retour du réseau.');
      return true;
    }
    annuler?.();
    const titre = action === 'delete' ? 'Suppression refusée'
      : action === 'update' ? 'Modification non enregistrée' : 'Non enregistré';
    toast.error(titre, messageEcritureRefusee(error));
    captureException(error, { context: `écriture ${table} (${action})`, code: error?.code, status: error?.status });
    return false;
  }, [userId]);

  const creerEnBase = useCallback(async (table, item, setter) => {
    if (isDemo) return item;
    if (!userId) {
      pendingSavesRef.current.push({ table, item });
      return item;
    }
    try {
      const saved = await saveItem(table, item, userId, orgId);
      setter(prev => prev.map(x => x.id === item.id ? saved : x));
      return saved;
    } catch (error) {
      const differe = await echecEcriture(error, {
        action: 'create', table, data: item,
        annuler: () => setter(prev => prev.filter(x => x.id !== item.id)),
      });
      return differe ? item : null;
    }
  }, [userId, orgId, echecEcriture]);

  // `versBase` adapte la ligne envoyée sans toucher à ce que l'écran garde (ex. statut « vu »).
  const modifierEnBase = useCallback(async (table, id, avant, data, setter, versBase = (x) => x) => {
    if (isDemo || !avant) return true;
    const fusion = versBase({ ...avant, ...data });
    if (!userId) {
      pendingSavesRef.current.push({ table, item: fusion });
      return true;
    }
    try {
      await updateItem(table, id, fusion, userId, orgId);
      return true;
    } catch (error) {
      return echecEcriture(error, {
        action: 'update', table, data: { id, ...data },
        annuler: () => setter(prev => prev.map(x => x.id === id ? avant : x)),
      });
    }
  }, [userId, orgId, echecEcriture]);

  const supprimerEnBase = useCallback(async (table, id, avant, setter) => {
    if (isDemo || !userId) return true;
    try {
      await deleteItem(table, id, userId, orgId);
      return true;
    } catch (error) {
      return echecEcriture(error, {
        action: 'delete', table, data: { id },
        annuler: () => avant && setter(prev => prev.some(x => x.id === id) ? prev : [...prev, avant]),
      });
    }
  }, [userId, orgId, echecEcriture]);

  // ============ CLIENT OPERATIONS ============
  const addClient = useCallback(async (data) => {
    if (!autoriserCreation('clients')) return null;
    // Generate proper UUID for Supabase compatibility
    const newClient = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };

    // Optimistic update (prevent duplicates)
    setClients(prev => prev.some(c => c.id === newClient.id) ? prev : [...prev, newClient]);

    // Audit: log creation
    _audit(isDemo ? null : supabase, { entityType: 'client', entityId: newClient.id, action: 'created', userId, orgId, userName });

    return creerEnBase('clients', newClient, setClients);
  }, [autoriserCreation, orgId, userId, userName, creerEnBase]);

  const updateClient = useCallback(async (id, data) => {
    const oldClient = clients.find(c => c.id === id);
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));

    // Audit: log changes
    if (oldClient) {
      const changes = computeChanges(oldClient, { ...oldClient, ...data }, CLIENT_TRACKED_FIELDS);
      if (Object.keys(changes).length > 0) {
        _audit(isDemo ? null : supabase, { entityType: 'client', entityId: id, action: 'updated', changes, userId, orgId, userName });
      }
    }

    return modifierEnBase('clients', id, oldClient, data, setClients);
  }, [userId, clients, orgId, userName, modifierEnBase]);

  const deleteClient = useCallback(async (id) => {
    const avant = clients.find(c => c.id === id);
    setClients(prev => prev.filter(c => c.id !== id));

    // Audit: log deletion
    _audit(isDemo ? null : supabase, { entityType: 'client', entityId: id, action: 'deleted', userId, orgId, userName });

    return supprimerEnBase('clients', id, avant, setClients);
  }, [userId, clients, orgId, userName, supprimerEnBase]);

  const getClient = useCallback((id) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  // ============ DEVIS OPERATIONS ============
  const addDevis = useCallback(async (data) => {
    // Seuls les devis comptent dans la limite : une facture prolonge un devis
    // déjà décompté, la bloquer empêcherait d'encaisser un travail réalisé.
    if (data.type !== 'facture' && !autoriserCreation('devis')) return null;
    // Require client_id — reject if missing (ghost devis prevention)
    if (!data.client_id) {
      console.warn('addDevis: rejected ghost devis — missing client_id. Data:', { numero: data.numero, type: data.type, statut: data.statut });
      toast.error('Non enregistré', `Choisissez d'abord un client pour ce${data.type === 'facture' ? 'tte facture' : ' devis'}.`);
      return null;
    }
    // Validate client_id is a proper UUID to prevent ghost data (demo IDs like 'c1')
    if (!isDemo && data.client_id && !isValidUUID(data.client_id)) {
      console.error('addDevis: invalid client_id (non-UUID):', data.client_id);
      return null;
    }
    // Auto-generate numero if missing (Devis Express, AI, etc.)
    if (!data.numero) {
      data.numero = await getNextNumero(data.type || 'devis', userId, devis, entrepriseId);
    }
    // Prevent duplicate numeros — check both local + Supabase
    if (devis.some(d => d.numero === data.numero)) {
      console.warn('addDevis: duplicate numero detected, regenerating:', data.numero);
      data.numero = await getNextNumero(data.type || 'devis', userId, devis, entrepriseId);
    }

    const newDevis = {
      id: crypto.randomUUID(),
      statut: DEVIS_STATUS.BROUILLON,
      type: 'devis',
      entrepriseId: data.entrepriseId || data.entreprise_id || entrepriseId || null,
      entreprise_id: data.entrepriseId || data.entreprise_id || entrepriseId || null,
      ...data,
      createdAt: new Date().toISOString()
    };

    setDevis(prev => prev.some(d => d.id === newDevis.id) ? prev : [...prev, newDevis]);

    // Audit: log creation (fire-and-forget)
    _audit(isDemo ? null : supabase, { entityType: 'devis', entityId: newDevis.id, action: 'created', userId, orgId, userName });

    return creerEnBase('devis', newDevis, setDevis);
  }, [userId, devis, entrepriseId, autoriserCreation, orgId, userName, creerEnBase]);

  const updateDevis = useCallback(async (id, data) => {
    // Prevent removing client_id (BUG-001: DB NOT NULL constraint)
    if (data.client_id === null || data.client_id === undefined) {
      delete data.client_id; // Keep existing client_id
    }
    const oldDevis = devis.find(d => d.id === id);
    setDevis(prev => prev.map(d =>
      d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
    ));

    // Audit: log changes (fire-and-forget)
    if (oldDevis) {
      const sb = isDemo ? null : supabase;
      const isStatusChange = data.statut && data.statut !== oldDevis.statut;
      const action = isStatusChange ? 'status_changed' : 'updated';
      const changes = computeChanges(oldDevis, { ...oldDevis, ...data }, DEVIS_TRACKED_FIELDS);
      if (Object.keys(changes).length > 0) {
        _audit(sb, { entityType: 'devis', entityId: id, action, changes, userId, orgId, userName });
      }
      // Auto-snapshot on status changes (envoyé, signé, facturé)
      if (isStatusChange && ['envoye', 'accepte', 'signe', 'acompte_facture', 'facture'].includes(data.statut)) {
        _snapshot(sb, { entityType: 'devis', entityId: id, data: { ...oldDevis, ...data }, trigger: 'auto_status_change', userId, orgId });
      }
    }

    // La contrainte de la base n'admet pas « vu » : on enregistre « envoyé », et « vu » se recalcule
    // au chargement depuis viewed_at.
    const ok = await modifierEnBase('devis', id, oldDevis, data, setDevis,
      (ligne) => (ligne.statut === 'vu' ? { ...ligne, statut: 'envoye' } : ligne));

    // Délice : célébrer les moments qui rapportent (devis signé / facture payée), une fois la base d'accord.
    if (ok && oldDevis && data.statut && data.statut !== oldDevis.statut) {
      const isDevisSigned = oldDevis.type !== 'facture'
        && (data.statut === 'accepte' || data.statut === 'signe')
        && !['accepte', 'signe'].includes(oldDevis.statut);
      const isFacturePaid = oldDevis.type === 'facture'
        && data.statut === 'payee'
        && oldDevis.statut !== 'payee';
      if (isDevisSigned) celebrateMilestone('devis_signe', toast);
      else if (isFacturePaid) celebrateMilestone('facture_payee', toast);
    }
    return ok;
  }, [userId, devis, orgId, userName, modifierEnBase]);

  const deleteDevis = useCallback(async (id) => {
    const avant = devis.find(d => d.id === id);
    setDevis(prev => prev.filter(d => d.id !== id));

    // Audit: log deletion
    _audit(isDemo ? null : supabase, { entityType: 'devis', entityId: id, action: 'deleted', userId, orgId, userName });

    return supprimerEnBase('devis', id, avant, setDevis);
  }, [userId, devis, orgId, userName, supprimerEnBase]);

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
    if (!autoriserCreation('chantiers')) return null;
    const newChantier = {
      id: crypto.randomUUID(),
      statut: CHANTIER_STATUS.PROSPECT,
      avancement: 0,
      photos: [],
      taches: [],
      entrepriseId: data.entrepriseId || data.entreprise_id || entrepriseId || null,
      entreprise_id: data.entrepriseId || data.entreprise_id || entrepriseId || null,
      ...data,
      createdAt: new Date().toISOString()
    };

    setChantiers(prev => prev.some(c => c.id === newChantier.id) ? prev : [...prev, newChantier]);

    // Audit: log creation
    _audit(isDemo ? null : supabase, { entityType: 'chantier', entityId: newChantier.id, action: 'created', userId, orgId, userName });

    return creerEnBase('chantiers', newChantier, setChantiers);
  }, [userId, entrepriseId, autoriserCreation, orgId, userName, creerEnBase]);

  const updateChantier = useCallback(async (id, data) => {
    const oldChantier = chantiers.find(c => c.id === id);
    setChantiers(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));

    // Audit: log changes
    if (oldChantier) {
      const changes = computeChanges(oldChantier, { ...oldChantier, ...data }, CHANTIER_TRACKED_FIELDS);
      if (Object.keys(changes).length > 0) {
        _audit(isDemo ? null : supabase, { entityType: 'chantier', entityId: id, action: 'updated', changes, userId, orgId, userName });
      }
    }

    return modifierEnBase('chantiers', id, oldChantier, data, setChantiers);
  }, [userId, chantiers, orgId, userName, modifierEnBase]);

  const deleteChantier = useCallback(async (id) => {
    const avant = chantiers.find(c => c.id === id);
    setChantiers(prev => prev.filter(c => c.id !== id));

    // Audit: log deletion
    _audit(isDemo ? null : supabase, { entityType: 'chantier', entityId: id, action: 'deleted', userId, orgId, userName });

    return supprimerEnBase('chantiers', id, avant, setChantiers);
  }, [userId, chantiers, orgId, userName, supprimerEnBase]);

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

    return creerEnBase('depenses', newDepense, setDepenses);
  }, [creerEnBase]);

  const updateDepense = useCallback(async (id, data) => {
    const avant = depenses.find(x => x.id === id);
    setDepenses(prev => prev.map(d =>
      d.id === id ? { ...d, ...data } : d
    ));

    return modifierEnBase('depenses', id, avant, data, setDepenses);
  }, [depenses, modifierEnBase]);

  const deleteDepense = useCallback(async (id) => {
    const avant = depenses.find(x => x.id === id);
    setDepenses(prev => prev.filter(d => d.id !== id));
    return supprimerEnBase('depenses', id, avant, setDepenses);
  }, [depenses, supprimerEnBase]);

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

    return creerEnBase('pointages', newPointage, setPointages);
  }, [creerEnBase]);

  const updatePointage = useCallback(async (id, data) => {
    const avant = pointages.find(x => x.id === id);
    setPointages(prev => prev.map(p =>
      p.id === id ? { ...p, ...data } : p
    ));

    return modifierEnBase('pointages', id, avant, data, setPointages);
  }, [pointages, modifierEnBase]);

  const deletePointage = useCallback(async (id) => {
    const avant = pointages.find(x => x.id === id);
    setPointages(prev => prev.filter(p => p.id !== id));
    return supprimerEnBase('pointages', id, avant, setPointages);
  }, [pointages, supprimerEnBase]);

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

    return creerEnBase('ajustements', newAjustement, setAjustements);
  }, [creerEnBase]);

  const deleteAjustement = useCallback(async (id) => {
    const avant = ajustements.find(x => x.id === id);
    setAjustements(prev => prev.filter(a => a.id !== id));
    return supprimerEnBase('ajustements', id, avant, setAjustements);
  }, [ajustements, supprimerEnBase]);

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

    return creerEnBase('equipe', newEmployee, setEquipe);
  }, [creerEnBase]);

  const updateEmployee = useCallback(async (id, data) => {
    const avant = equipe.find(x => x.id === id);
    setEquipe(prev => prev.map(e =>
      e.id === id ? { ...e, ...data } : e
    ));

    return modifierEnBase('equipe', id, avant, data, setEquipe);
  }, [equipe, modifierEnBase]);

  const deleteEmployee = useCallback(async (id) => {
    const avant = equipe.find(x => x.id === id);
    setEquipe(prev => prev.filter(e => e.id !== id));
    return supprimerEnBase('equipe', id, avant, setEquipe);
  }, [equipe, supprimerEnBase]);

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

    return creerEnBase('catalogue', newItem, setCatalogue);
  }, [creerEnBase]);

  const updateCatalogueItem = useCallback(async (id, donnees) => {
    const avant = catalogue.find(x => x.id === id);
    // Le prix d'un article vit sous trois noms (prix, prixUnitaire, prix_unitaire_ht) : les aligner,
    // sinon l'ancien prix resté dans l'un des trois repart en base et dans les devis.
    const prix = donnees.prix ?? donnees.prixUnitaire ?? donnees.prix_unitaire_ht;
    const data = prix === undefined ? donnees : { ...donnees, prix, prixUnitaire: prix, prix_unitaire_ht: prix };
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));

    return modifierEnBase('catalogue', id, avant, data, setCatalogue);
  }, [catalogue, modifierEnBase]);

  const deleteCatalogueItem = useCallback(async (id) => {
    const avant = catalogue.find(x => x.id === id);
    setCatalogue(prev => prev.filter(c => c.id !== id));
    return supprimerEnBase('catalogue', id, avant, setCatalogue);
  }, [catalogue, supprimerEnBase]);

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

    return creerEnBase('paiements', newPaiement, setPaiements);
  }, [creerEnBase]);

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

    return creerEnBase('echanges', newEchange, setEchanges);
  }, [creerEnBase]);

  // ============ PLANNING EVENT OPERATIONS ============
  const addPlanningEvent = useCallback(async (data) => {
    const newEvent = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setPlanningEvents(prev => prev.some(e => e.id === newEvent.id) ? prev : [...prev, newEvent]);

    return creerEnBase('planning_events', newEvent, setPlanningEvents);
  }, [creerEnBase]);

  const updatePlanningEvent = useCallback(async (id, data) => {
    const avant = planningEvents.find(e => e.id === id);
    setPlanningEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    return modifierEnBase('planning_events', id, avant, data, setPlanningEvents);
  }, [planningEvents, modifierEnBase]);

  const deletePlanningEvent = useCallback(async (id) => {
    const avant = planningEvents.find(x => x.id === id);
    setPlanningEvents(prev => prev.filter(e => e.id !== id));
    return supprimerEnBase('planning_events', id, avant, setPlanningEvents);
  }, [planningEvents, supprimerEnBase]);

  // ============ OUVRAGE OPERATIONS ============
  const addOuvrage = useCallback(async (data) => {
    const newOuvrage = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    setOuvrages(prev => [...prev, newOuvrage]);

    return creerEnBase('ouvrages', newOuvrage, setOuvrages);
  }, [creerEnBase]);

  const updateOuvrage = useCallback(async (id, data) => {
    const avant = ouvrages.find(x => x.id === id);
    setOuvrages(prev => prev.map(o =>
      o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o
    ));

    return modifierEnBase('ouvrages', id, avant, data, setOuvrages);
  }, [ouvrages, modifierEnBase]);

  const deleteOuvrage = useCallback(async (id) => {
    const avant = ouvrages.find(x => x.id === id);
    setOuvrages(prev => prev.filter(o => o.id !== id));
    return supprimerEnBase('ouvrages', id, avant, setOuvrages);
  }, [ouvrages, supprimerEnBase]);

  // ============ MEMO OPERATIONS ============
  const addMemo = useCallback(async (data) => {
    const status = data.status || 'a_faire';
    const isDone = data.is_done != null ? data.is_done : status === 'termine';
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
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
      status,
      position: 0,
      subtasks: data.subtasks || [],
      recurrence: data.recurrence || null,
      sort_order: data.sort_order || 0,
      assigned_to: data.assigned_to || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Bump all existing positions +1
    setMemos(prev => [newMemo, ...prev.map(m => ({ ...m, position: (m.position || 0) + 1 }))]);

    return creerEnBase('memos', newMemo, setMemos);
  }, [creerEnBase]);

  const updateMemo = useCallback(async (id, updates) => {
    const avant = memos.find(x => x.id === id);
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
    ));

    return modifierEnBase('memos', id, avant, updates, setMemos);
  }, [memos, modifierEnBase]);

  const deleteMemo = useCallback(async (id) => {
    const avant = memos.find(x => x.id === id);
    setMemos(prev => prev.filter(m => m.id !== id));
    return supprimerEnBase('memos', id, avant, setMemos);
  }, [memos, supprimerEnBase]);

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
    return modifierEnBase('memos', id, memo, updates, setMemos);
  }, [memos, modifierEnBase]);

  // ============ TEMPLATE OPERATIONS ============
  const addTemplate = useCallback(async (data) => {
    const newTemplate = {
      id: crypto.randomUUID(),
      source: 'user',
      favori: false,
      usage_count: 0,
      ...data,
      created_at: new Date().toISOString(),
    };

    setCustomTemplates(prev => prev.some(t => t.id === newTemplate.id) ? prev : [...prev, newTemplate]);

    const resultat = await creerEnBase('devis_templates', newTemplate, setCustomTemplates);

    // Cleanup legacy localStorage key if demo
    if (isDemo) {
      try { localStorage.removeItem('chantierPro_customTemplates'); } catch (e) { /* ignore */ }
    }

    return resultat;
  }, [creerEnBase]);

  const updateTemplate = useCallback(async (id, data) => {
    const avant = customTemplates.find(t => t.id === id);
    setCustomTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
    ));
    return modifierEnBase('devis_templates', id, avant, data, setCustomTemplates);
  }, [customTemplates, modifierEnBase]);

  const deleteTemplate = useCallback(async (id) => {
    const avant = customTemplates.find(x => x.id === id);
    setCustomTemplates(prev => prev.filter(t => t.id !== id));
    return supprimerEnBase('devis_templates', id, avant, setCustomTemplates);
  }, [customTemplates, supprimerEnBase]);

  const toggleTemplateFavori = useCallback(async (id) => {
    const template = customTemplates.find(t => t.id === id);
    if (!template) return;
    await updateTemplate(id, { favori: !template.favori });
  }, [customTemplates, updateTemplate]);

  // Track template usage (for recently used section)
  const trackTemplateUsage = useCallback(async (templateIdOrBuiltinId, devisId) => {
    const usage = {
      id: crypto.randomUUID(),
      template_id: null,
      template_builtin_id: null,
      devis_id: devisId || null,
      used_at: new Date().toISOString(),
    };

    // Determine if this is a DB template or builtin
    const dbTemplate = customTemplates.find(t => t.id === templateIdOrBuiltinId);
    if (dbTemplate) {
      usage.template_id = templateIdOrBuiltinId;
      // Increment usage_count on the template
      await updateTemplate(templateIdOrBuiltinId, {
        usage_count: (dbTemplate.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      });
    } else {
      usage.template_builtin_id = templateIdOrBuiltinId;
    }

    setTemplateUsages(prev => [usage, ...prev].slice(0, 50));

    if (!isDemo && userId) {
      try {
        await saveItem('template_usages', usage, userId, orgId);
      } catch (error) {
        console.error('Error tracking template usage:', error);
      }
    }
  }, [userId, orgId, customTemplates, updateTemplate]);

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

  // ============ REJEU DE LA FILE HORS LIGNE ============
  // Écrit directement en base et LÈVE en cas d'échec : c'est la file qui décide de réessayer ou d'abandonner.
  // Une modification est rejouée avec la ligne complète affichée à l'écran (qui contient déjà le
  // changement) : envoyer seulement les champs modifiés effacerait les autres colonnes.
  const etatsParTable = useMemo(() => ({
    clients, devis, chantiers, depenses, pointages, equipe, catalogue, ajustements, paiements, echanges,
    ouvrages, memos, planning_events: planningEvents, devis_templates: customTemplates,
  }), [clients, devis, chantiers, depenses, pointages, equipe, catalogue, ajustements, paiements, echanges,
    ouvrages, memos, planningEvents, customTemplates]);

  const rejouerEcriture = useCallback(async ({ action, entity, data }) => {
    if (isDemo || !userId) return false;
    if (action === 'create') return saveItem(entity, data, userId, orgId);
    if (action === 'delete') return deleteItem(entity, data.id, userId, orgId);
    if (action === 'update') {
      const local = (etatsParTable[entity] || []).find(x => x.id === data.id);
      if (!local) return false; // supprimé depuis : plus rien à modifier
      const ligne = { ...local, ...data };
      if (entity === 'devis' && ligne.statut === 'vu') ligne.statut = 'envoye';
      return updateItem(entity, data.id, ligne, userId, orgId);
    }
    return false;
  }, [userId, orgId, etatsParTable]);

  // Helper to get next unique numero for devis/facture
  const generateNextNumero = useCallback(async (type) => {
    return getNextNumero(type, userId, devis, entrepriseId);
  }, [userId, devis, entrepriseId]);

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
    loadError,
    retryLoad,

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

    // Template operations
    customTemplates,
    setCustomTemplates,
    templateUsages,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateFavori,
    trackTemplateUsage,

    // Calculated values
    getChantierBilan,

    // File hors ligne
    rejouerEcriture,
    userId,
  }), [
    clients, devis, chantiers, depenses, pointages, equipe, ajustements,
    catalogue, paiements, echanges, ouvrages, planningEvents, memos, loading, dataLoading, loadError, retryLoad,
    customTemplates, templateUsages,
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
    addTemplate, updateTemplate, deleteTemplate, toggleTemplateFavori, trackTemplateUsage,
    getChantierBilan, rejouerEcriture, userId,
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
