import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Performance optimization hooks
 */

/**
 * useMemoizedCallback - Like useCallback but with deep comparison
 * Useful when callback depends on objects/arrays that change reference
 */
export function useMemoizedCallback(callback, deps) {
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return useCallback((...args) => ref.current(...args), deps);
}

/**
 * useDebounce - Debounce a value
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in ms
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a callback
 * @param {Function} callback - Callback to debounce
 * @param {number} delay - Delay in ms
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useThrottle - Throttle a value
 * @param {any} value - Value to throttle
 * @param {number} limit - Throttle limit in ms
 */
export function useThrottle(value, limit = 300) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

/**
 * usePrevious - Get previous value of a variable
 */
export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useClientFilter - Memoized client filtering and sorting
 */
export function useClientFilter(clients, { search = '', sortBy = 'recent' } = {}) {
  return useMemo(() => {
    let filtered = clients;

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.prenom?.toLowerCase().includes(q) ||
        c.entreprise?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telephone?.includes(q)
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      case 'recent':
      default:
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
    }
  }, [clients, search, sortBy]);
}

/**
 * useDevisFilter - Memoized devis filtering
 */
export function useDevisFilter(devis, { search = '', type = 'all', statut = 'all', clientId = null } = {}) {
  return useMemo(() => {
    let filtered = devis;

    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(d => d.type === type);
    }

    // Filter by status
    if (statut !== 'all') {
      filtered = filtered.filter(d => d.statut === statut);
    }

    // Filter by client
    if (clientId) {
      filtered = filtered.filter(d => d.client_id === clientId);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        d.numero?.toLowerCase().includes(q) ||
        d.objet?.toLowerCase().includes(q)
      );
    }

    // Sort by date descending
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [devis, search, type, statut, clientId]);
}

/**
 * useChantierFilter - Memoized chantier filtering
 */
export function useChantierFilter(chantiers, { search = '', statut = 'all', clientId = null } = {}) {
  return useMemo(() => {
    let filtered = chantiers;

    // Filter by status
    if (statut !== 'all') {
      filtered = filtered.filter(c => c.statut === statut);
    }

    // Filter by client
    if (clientId) {
      filtered = filtered.filter(c => c.client_id === clientId);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.adresse?.toLowerCase().includes(q)
      );
    }

    // Sort by date descending
    return [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [chantiers, search, statut, clientId]);
}

/**
 * useChantierStats - Memoized chantier statistics
 */
export function useChantierStats(chantierId, { devis, depenses, pointages, equipe, ajustements }) {
  return useMemo(() => {
    if (!chantierId) return null;

    const chantierDevis = devis.filter(d => d.chantier_id === chantierId);
    const chantierDepenses = depenses.filter(d => d.chantierId === chantierId);
    const chantierPointages = pointages.filter(p => p.chantierId === chantierId);
    const chantierAjustements = ajustements.filter(a => a.chantierId === chantierId);

    // Revenue from accepted/paid devis
    const revenuDevis = chantierDevis
      .filter(d => ['accepte', 'acompte_facture', 'facture', 'payee'].includes(d.statut))
      .reduce((sum, d) => sum + (d.total_ht || 0), 0);

    // Revenue adjustments
    const ajustementsRevenu = chantierAjustements
      .filter(a => a.type === 'REVENU')
      .reduce((sum, a) => sum + (a.montant || 0), 0);

    // Expense adjustments
    const ajustementsDepense = chantierAjustements
      .filter(a => a.type === 'DEPENSE')
      .reduce((sum, a) => sum + (a.montant || 0), 0);

    // Total material expenses
    const totalDepenses = chantierDepenses.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Labor costs with employee lookup map (O(1) instead of O(n))
    const employeeMap = new Map(equipe.map(e => [e.id, e]));
    const coutMainOeuvre = chantierPointages.reduce((sum, p) => {
      const employee = employeeMap.get(p.employeId);
      const tauxHoraire = employee?.tauxHoraire || 0;
      return sum + ((p.heures || 0) * tauxHoraire);
    }, 0);

    // Total hours
    const totalHeures = chantierPointages.reduce((sum, p) => sum + (p.heures || 0), 0);

    // Totals
    const revenuTotal = revenuDevis + ajustementsRevenu;
    const depensesTotal = totalDepenses + coutMainOeuvre + ajustementsDepense;
    const marge = revenuTotal - depensesTotal;
    const tauxMarge = revenuTotal > 0 ? (marge / revenuTotal) * 100 : 0;

    return {
      revenuDevis,
      ajustementsRevenu,
      ajustementsDepense,
      totalDepenses,
      coutMainOeuvre,
      totalHeures,
      revenuTotal,
      depensesTotal,
      marge,
      tauxMarge,
      devisCount: chantierDevis.length,
      depensesCount: chantierDepenses.length,
      pointagesCount: chantierPointages.length
    };
  }, [chantierId, devis, depenses, pointages, equipe, ajustements]);
}

/**
 * useDashboardStats - Memoized dashboard statistics
 */
export function useDashboardStats({ chantiers, devis, depenses, clients }) {
  return useMemo(() => {
    // Chantier stats
    const chantiersEnCours = chantiers.filter(c => c.statut === 'en_cours').length;
    const chantiersTermines = chantiers.filter(c => c.statut === 'termine').length;
    const chantiersProspect = chantiers.filter(c => c.statut === 'prospect').length;

    // Devis stats
    const devisBrouillon = devis.filter(d => d.type === 'devis' && d.statut === 'brouillon').length;
    const devisEnvoyes = devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length;
    const devisAcceptes = devis.filter(d => d.type === 'devis' && d.statut === 'accepte').length;

    // Revenue this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenuMois = devis
      .filter(d => d.statut === 'payee' && new Date(d.date) >= startOfMonth)
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0);

    // Total revenue this year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const revenuAnnee = devis
      .filter(d => d.statut === 'payee' && new Date(d.date) >= startOfYear)
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0);

    // Pending invoices
    const facturesEnAttente = devis
      .filter(d => d.type === 'facture' && ['envoye', 'vu'].includes(d.statut))
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0);

    // Recent depenses
    const depensesMois = depenses
      .filter(d => new Date(d.date) >= startOfMonth)
      .reduce((sum, d) => sum + (d.montant || 0), 0);

    return {
      chantiers: {
        enCours: chantiersEnCours,
        termines: chantiersTermines,
        prospect: chantiersProspect,
        total: chantiers.length
      },
      devis: {
        brouillon: devisBrouillon,
        envoyes: devisEnvoyes,
        acceptes: devisAcceptes,
        total: devis.filter(d => d.type === 'devis').length
      },
      revenus: {
        mois: revenuMois,
        annee: revenuAnnee,
        enAttente: facturesEnAttente
      },
      depenses: {
        mois: depensesMois
      },
      clients: {
        total: clients.length
      }
    };
  }, [chantiers, devis, depenses, clients]);
}

/**
 * useCatalogueFilter - Memoized catalogue filtering
 */
export function useCatalogueFilter(catalogue, { search = '', categorie = 'all', favoriOnly = false } = {}) {
  return useMemo(() => {
    let filtered = catalogue;

    // Filter by category
    if (categorie !== 'all') {
      filtered = filtered.filter(c => c.categorie === categorie);
    }

    // Filter favorites only
    if (favoriOnly) {
      filtered = filtered.filter(c => c.favori);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.reference?.toLowerCase().includes(q) ||
        c.categorie?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [catalogue, search, categorie, favoriOnly]);
}

export default useDebounce;
