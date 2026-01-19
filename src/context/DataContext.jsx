import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DEVIS_STATUS, CHANTIER_STATUS, AJUSTEMENT_TYPE } from '../lib/constants';

/**
 * DataContext - Global data state (clients, devis, chantiers, etc.)
 * Reduces prop drilling for data and CRUD operations
 */

const DataContext = createContext(null);

export function DataProvider({ children, initialData = {} }) {
  // Core data
  const [clients, setClients] = useState(initialData.clients ?? []);
  const [devis, setDevis] = useState(initialData.devis ?? []);
  const [chantiers, setChantiers] = useState(initialData.chantiers ?? []);
  const [depenses, setDepenses] = useState(initialData.depenses ?? []);
  const [pointages, setPointages] = useState(initialData.pointages ?? []);
  const [equipe, setEquipe] = useState(initialData.equipe ?? []);
  const [ajustements, setAjustements] = useState(initialData.ajustements ?? []);
  const [catalogue, setCatalogue] = useState(initialData.catalogue ?? []);
  const [paiements, setPaiements] = useState(initialData.paiements ?? []);
  const [echanges, setEchanges] = useState(initialData.echanges ?? []);

  // Loading states
  const [loading, setLoading] = useState({
    clients: false,
    devis: false,
    chantiers: false
  });

  // ============ CLIENT OPERATIONS ============
  const addClient = useCallback((data) => {
    const newClient = {
      id: `c${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback((id, data) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  const deleteClient = useCallback((id) => {
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  const getClient = useCallback((id) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  // ============ DEVIS OPERATIONS ============
  const addDevis = useCallback((data) => {
    const newDevis = {
      id: `d${Date.now()}`,
      statut: DEVIS_STATUS.BROUILLON,
      type: 'devis',
      ...data,
      createdAt: new Date().toISOString()
    };
    setDevis(prev => [...prev, newDevis]);
    return newDevis;
  }, []);

  const updateDevis = useCallback((id, data) => {
    setDevis(prev => prev.map(d =>
      d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
    ));
  }, []);

  const deleteDevis = useCallback((id) => {
    setDevis(prev => prev.filter(d => d.id !== id));
  }, []);

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
  const addChantier = useCallback((data) => {
    const newChantier = {
      id: `ch${Date.now()}`,
      statut: CHANTIER_STATUS.PROSPECT,
      avancement: 0,
      photos: [],
      taches: [],
      ...data,
      createdAt: new Date().toISOString()
    };
    setChantiers(prev => [...prev, newChantier]);
    return newChantier;
  }, []);

  const updateChantier = useCallback((id, data) => {
    setChantiers(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  const deleteChantier = useCallback((id) => {
    setChantiers(prev => prev.filter(c => c.id !== id));
  }, []);

  const getChantier = useCallback((id) => {
    return chantiers.find(c => c.id === id);
  }, [chantiers]);

  // ============ DEPENSE OPERATIONS ============
  const addDepense = useCallback((data) => {
    const newDepense = {
      id: `dep${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    setDepenses(prev => [...prev, newDepense]);
    return newDepense;
  }, []);

  const updateDepense = useCallback((id, data) => {
    setDepenses(prev => prev.map(d =>
      d.id === id ? { ...d, ...data } : d
    ));
  }, []);

  const deleteDepense = useCallback((id) => {
    setDepenses(prev => prev.filter(d => d.id !== id));
  }, []);

  const getDepensesByChantier = useCallback((chantierId) => {
    return depenses.filter(d => d.chantierId === chantierId);
  }, [depenses]);

  // ============ POINTAGE OPERATIONS ============
  const addPointage = useCallback((data) => {
    const newPointage = {
      id: `pt${Date.now()}`,
      approuve: false,
      ...data,
      createdAt: new Date().toISOString()
    };
    setPointages(prev => [...prev, newPointage]);
    return newPointage;
  }, []);

  const updatePointage = useCallback((id, data) => {
    setPointages(prev => prev.map(p =>
      p.id === id ? { ...p, ...data } : p
    ));
  }, []);

  const deletePointage = useCallback((id) => {
    setPointages(prev => prev.filter(p => p.id !== id));
  }, []);

  const getPointagesByChantier = useCallback((chantierId) => {
    return pointages.filter(p => p.chantierId === chantierId);
  }, [pointages]);

  // ============ AJUSTEMENT OPERATIONS ============
  const addAjustement = useCallback((data) => {
    const newAjustement = {
      id: `aj${Date.now()}`,
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
  const addEmployee = useCallback((data) => {
    const newEmployee = {
      id: `emp${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    setEquipe(prev => [...prev, newEmployee]);
    return newEmployee;
  }, []);

  const updateEmployee = useCallback((id, data) => {
    setEquipe(prev => prev.map(e =>
      e.id === id ? { ...e, ...data } : e
    ));
  }, []);

  const deleteEmployee = useCallback((id) => {
    setEquipe(prev => prev.filter(e => e.id !== id));
  }, []);

  // ============ CATALOGUE OPERATIONS ============
  const addCatalogueItem = useCallback((data) => {
    const newItem = {
      id: `cat${Date.now()}`,
      stock: 0,
      favori: false,
      ...data,
      createdAt: new Date().toISOString()
    };
    setCatalogue(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const updateCatalogueItem = useCallback((id, data) => {
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));
  }, []);

  const deleteCatalogueItem = useCallback((id) => {
    setCatalogue(prev => prev.filter(c => c.id !== id));
  }, []);

  const deductStock = useCallback((id, quantity) => {
    setCatalogue(prev => prev.map(c =>
      c.id === id ? { ...c, stock: Math.max(0, (c.stock || 0) - quantity) } : c
    ));
  }, []);

  // ============ PAIEMENT OPERATIONS ============
  const addPaiement = useCallback((data) => {
    const newPaiement = {
      id: `pay${Date.now()}`,
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
      id: `ech${Date.now()}`,
      ...data,
      date: new Date().toISOString()
    };
    setEchanges(prev => [...prev, newEchange]);
    return newEchange;
  }, []);

  // ============ CALCULATED VALUES ============
  const getChantierBilan = useCallback((chantierId) => {
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
      .filter(a => a.type === AJUSTEMENT_TYPE.REVENU)
      .reduce((sum, a) => sum + (a.montant || 0), 0);

    // Expense adjustments
    const ajustementsDepense = chantierAjustements
      .filter(a => a.type === AJUSTEMENT_TYPE.DEPENSE)
      .reduce((sum, a) => sum + (a.montant || 0), 0);

    // Total expenses (materials, supplies)
    const totalDepenses = chantierDepenses.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Labor costs
    const coutMainOeuvre = chantierPointages.reduce((sum, p) => {
      const employee = equipe.find(e => e.id === p.employeId);
      const tauxHoraire = employee?.tauxHoraire || 0;
      return sum + ((p.heures || 0) * tauxHoraire);
    }, []);

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
      revenuTotal,
      depensesTotal,
      marge,
      tauxMarge,
      devisCount: chantierDevis.length,
      depensesCount: chantierDepenses.length,
      pointagesCount: chantierPointages.length
    };
  }, [devis, depenses, pointages, ajustements, equipe]);

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
    catalogue, paiements, echanges, loading,
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

export default DataContext;
