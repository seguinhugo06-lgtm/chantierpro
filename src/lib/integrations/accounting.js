/**
 * Module d'integration comptable pour ChantierPro
 * Support: Pennylane, Indy, Qonto, export generique
 */

// Types d'integration supportees
export const INTEGRATION_TYPES = {
  PENNYLANE: {
    id: 'pennylane',
    name: 'Pennylane',
    description: 'Comptabilité automatisée pour TPE/PME',
    color: '#6366f1',
    icon: 'receipt',
    features: ['sync_factures', 'sync_depenses', 'rapprochement'],
    website: 'https://www.pennylane.com',
    apiSupported: true
  },
  INDY: {
    id: 'indy',
    name: 'Indy',
    description: 'Comptabilité simplifiée pour indépendants',
    color: '#10b981',
    icon: 'calculator',
    features: ['sync_factures', 'declarations'],
    website: 'https://www.indy.fr',
    apiSupported: true
  },
  QONTO: {
    id: 'qonto',
    name: 'Qonto',
    description: 'Compte pro et gestion financiere',
    color: '#000000',
    icon: 'credit-card',
    features: ['sync_transactions', 'virements', 'rapprochement'],
    website: 'https://qonto.com',
    apiSupported: true
  },
  EXPORT_CSV: {
    id: 'export_csv',
    name: 'Export CSV',
    description: 'Export compatible Excel et logiciels comptables',
    color: '#22c55e',
    icon: 'file-spreadsheet',
    features: ['export_factures', 'export_depenses', 'export_tva'],
    apiSupported: false
  },
  EXPORT_FEC: {
    id: 'export_fec',
    name: 'Export FEC',
    description: 'Fichier des Écritures Comptables (legal)',
    color: '#3b82f6',
    icon: 'file-text',
    features: ['export_fec', 'conformite_fiscale'],
    apiSupported: false
  }
};

/**
 * Statuts de synchronisation
 */
export const SYNC_STATUS = {
  NOT_CONNECTED: 'not_connected',
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  ERROR: 'error',
  UP_TO_DATE: 'up_to_date'
};

/**
 * Stockage local des credentials (simule - en prod utiliser un vault securise)
 */
const STORAGE_KEY = 'chantierpro_accounting_integrations';

/**
 * Recupere les integrations configurees
 */
export const getIntegrations = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error loading integrations:', e);
    return {};
  }
};

/**
 * Sauvegarde une integration
 */
export const saveIntegration = (integrationId, config) => {
  try {
    const integrations = getIntegrations();
    integrations[integrationId] = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(integrations));
    return true;
  } catch (e) {
    console.error('Error saving integration:', e);
    return false;
  }
};

/**
 * Supprime une integration
 */
export const removeIntegration = (integrationId) => {
  try {
    const integrations = getIntegrations();
    delete integrations[integrationId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(integrations));
    return true;
  } catch (e) {
    console.error('Error removing integration:', e);
    return false;
  }
};

/**
 * Formate une facture pour l'export comptable
 */
export const formatInvoiceForAccounting = (invoice, client, entreprise) => {
  const lines = invoice.lignes || [];
  const totalHT = lines.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
  const tvaAmount = totalHT * ((invoice.tauxTVA || 20) / 100);

  return {
    numero: invoice.numero,
    date: invoice.date,
    dateEcheance: invoice.dateEcheance || invoice.date,
    type: invoice.type, // 'devis' or 'facture'
    statut: invoice.statut,
    // Client info
    client: {
      nom: client?.nom || '',
      email: client?.email || '',
      adresse: client?.adresse || '',
      siret: client?.siret || ''
    },
    // Entreprise info
    entreprise: {
      nom: entreprise?.nom || '',
      siret: entreprise?.siret || '',
      tva: entreprise?.tvaIntracommunautaire || ''
    },
    // Montants
    totalHT,
    tauxTVA: invoice.tauxTVA || 20,
    montantTVA: tvaAmount,
    totalTTC: totalHT + tvaAmount,
    // Lignes
    lignes: lines.map((l, i) => ({
      numero: i + 1,
      description: l.description || '',
      quantite: l.quantite || 0,
      unite: l.unite || 'u',
      prixUnitaire: l.prixUnitaire || 0,
      totalHT: (l.quantite || 0) * (l.prixUnitaire || 0)
    }))
  };
};

/**
 * Formate une depense pour l'export comptable
 */
export const formatExpenseForAccounting = (expense, chantier) => {
  return {
    id: expense.id,
    date: expense.date,
    description: expense.description || '',
    fournisseur: expense.fournisseur || '',
    montantHT: expense.montant || 0,
    tauxTVA: expense.tauxTVA || 20,
    montantTVA: (expense.montant || 0) * ((expense.tauxTVA || 20) / 100),
    montantTTC: (expense.montant || 0) * (1 + (expense.tauxTVA || 20) / 100),
    categorie: expense.categorie || 'materiel',
    chantier: chantier?.nom || '',
    chantierId: expense.chantierId,
    justificatif: expense.justificatif || null,
    modeReglement: expense.modeReglement || 'cb'
  };
};

/**
 * Genere un export CSV des factures
 */
export const exportInvoicesToCSV = (invoices, clients, entreprise) => {
  const headers = [
    'Numero',
    'Date',
    'Date Echeance',
    'Type',
    'Statut',
    'Client',
    'Email Client',
    'Total HT',
    'Taux TVA',
    'Montant TVA',
    'Total TTC'
  ];

  const rows = invoices.map(inv => {
    const client = clients.find(c => c.id === inv.client_id);
    const formatted = formatInvoiceForAccounting(inv, client, entreprise);
    return [
      formatted.numero,
      formatted.date,
      formatted.dateEcheance,
      formatted.type === 'facture' ? 'Facture' : 'Devis',
      formatted.statut,
      formatted.client.nom,
      formatted.client.email,
      formatted.totalHT.toFixed(2),
      formatted.tauxTVA,
      formatted.montantTVA.toFixed(2),
      formatted.totalTTC.toFixed(2)
    ];
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  return csvContent;
};

/**
 * Genere un export CSV des depenses
 */
export const exportExpensesToCSV = (expenses, chantiers) => {
  const headers = [
    'Date',
    'Description',
    'Fournisseur',
    'Chantier',
    'Categorie',
    'Montant HT',
    'Taux TVA',
    'Montant TVA',
    'Montant TTC',
    'Mode Reglement'
  ];

  const rows = expenses.map(exp => {
    const chantier = chantiers.find(c => c.id === exp.chantierId);
    const formatted = formatExpenseForAccounting(exp, chantier);
    return [
      formatted.date,
      formatted.description,
      formatted.fournisseur,
      formatted.chantier,
      formatted.categorie,
      formatted.montantHT.toFixed(2),
      formatted.tauxTVA,
      formatted.montantTVA.toFixed(2),
      formatted.montantTTC.toFixed(2),
      formatted.modeReglement
    ];
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  return csvContent;
};

/**
 * Genere un fichier FEC (Fichier des Écritures Comptables)
 * Format obligatoire pour le fisc français
 */
export const generateFEC = (invoices, expenses, clients, chantiers, entreprise, dateDebut, dateFin) => {
  // Format FEC conforme a l'article A.47 A-1 du LPF
  const headers = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise'
  ];

  const ecritures = [];
  let ecritureNum = 1;

  // Ecritures de ventes (factures)
  const facturesFiltered = invoices.filter(inv => {
    const invDate = new Date(inv.date);
    return inv.type === 'facture' && invDate >= new Date(dateDebut) && invDate <= new Date(dateFin);
  });

  facturesFiltered.forEach(inv => {
    const client = clients.find(c => c.id === inv.client_id);
    const formatted = formatInvoiceForAccounting(inv, client, entreprise);
    const dateFormatted = inv.date.replace(/-/g, '');

    // Ligne client (debit)
    ecritures.push([
      'VE', 'Ventes', ecritureNum.toString().padStart(6, '0'), dateFormatted,
      '411000', 'Clients', client?.id || '', client?.nom || '',
      inv.numero, dateFormatted, `Facture ${inv.numero}`,
      formatted.totalTTC.toFixed(2), '0.00', '', '', dateFormatted, '', 'EUR'
    ]);

    // Ligne ventes (credit)
    ecritures.push([
      'VE', 'Ventes', ecritureNum.toString().padStart(6, '0'), dateFormatted,
      '706000', 'Prestations de services', '', '',
      inv.numero, dateFormatted, `Facture ${inv.numero}`,
      '0.00', formatted.totalHT.toFixed(2), '', '', dateFormatted, '', 'EUR'
    ]);

    // Ligne TVA collectee (credit)
    ecritures.push([
      'VE', 'Ventes', ecritureNum.toString().padStart(6, '0'), dateFormatted,
      '445710', 'TVA collectee', '', '',
      inv.numero, dateFormatted, `TVA Facture ${inv.numero}`,
      '0.00', formatted.montantTVA.toFixed(2), '', '', dateFormatted, '', 'EUR'
    ]);

    ecritureNum++;
  });

  // Ecritures d'achats (depenses)
  const depensesFiltered = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= new Date(dateDebut) && expDate <= new Date(dateFin);
  });

  depensesFiltered.forEach(exp => {
    const chantier = chantiers.find(c => c.id === exp.chantierId);
    const formatted = formatExpenseForAccounting(exp, chantier);
    const dateFormatted = (exp.date || '').replace(/-/g, '');

    // Ligne fournisseur (credit)
    ecritures.push([
      'AC', 'Achats', ecritureNum.toString().padStart(6, '0'), dateFormatted,
      '401000', 'Fournisseurs', exp.fournisseur || '', exp.fournisseur || '',
      exp.id, dateFormatted, exp.description || 'Achat',
      '0.00', formatted.montantTTC.toFixed(2), '', '', dateFormatted, '', 'EUR'
    ]);

    // Ligne achat (debit)
    const compteAchat = exp.categorie === 'materiel' ? '601000' : '602000';
    ecritures.push([
      'AC', 'Achats', ecritureNum.toString().padStart(6, '0'), dateFormatted,
      compteAchat, exp.categorie === 'materiel' ? 'Achats matieres' : 'Achats fournitures', '', '',
      exp.id, dateFormatted, exp.description || 'Achat',
      formatted.montantHT.toFixed(2), '0.00', '', '', dateFormatted, '', 'EUR'
    ]);

    // Ligne TVA deductible (debit)
    ecritures.push([
      'AC', 'Achats', ecritureNum.toString().padStart(6, '0'), dateFormatted,
      '445660', 'TVA deductible', '', '',
      exp.id, dateFormatted, `TVA ${exp.description || 'Achat'}`,
      formatted.montantTVA.toFixed(2), '0.00', '', '', dateFormatted, '', 'EUR'
    ]);

    ecritureNum++;
  });

  // Generer le fichier FEC (format pipe-separated values)
  const fecContent = [
    headers.join('|'),
    ...ecritures.map(row => row.join('|'))
  ].join('\n');

  return fecContent;
};

/**
 * Telecharge un fichier
 */
export const downloadFile = (content, filename, mimeType = 'text/csv') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Calcul du resume TVA pour declaration
 */
export const calculateTVASummary = (invoices, expenses, dateDebut, dateFin) => {
  const invoicesFiltered = invoices.filter(inv => {
    const invDate = new Date(inv.date);
    return inv.type === 'facture' && invDate >= new Date(dateDebut) && invDate <= new Date(dateFin);
  });

  const expensesFiltered = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= new Date(dateDebut) && expDate <= new Date(dateFin);
  });

  // TVA collectee (sur ventes)
  const tvaCollectee = invoicesFiltered.reduce((sum, inv) => {
    const totalHT = (inv.lignes || []).reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
    return sum + totalHT * ((inv.tauxTVA || 20) / 100);
  }, 0);

  // TVA deductible (sur achats)
  const tvaDeductible = expensesFiltered.reduce((sum, exp) => {
    return sum + (exp.montant || 0) * ((exp.tauxTVA || 20) / 100);
  }, 0);

  // TVA nette a payer (ou credit)
  const tvaNetteAPayer = tvaCollectee - tvaDeductible;

  // Detail par taux
  const detailParTaux = {
    '20': { base: 0, collectee: 0, deductible: 0 },
    '10': { base: 0, collectee: 0, deductible: 0 },
    '5.5': { base: 0, collectee: 0, deductible: 0 },
    '0': { base: 0, collectee: 0, deductible: 0 }
  };

  invoicesFiltered.forEach(inv => {
    const taux = (inv.tauxTVA || 20).toString();
    const totalHT = (inv.lignes || []).reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
    if (detailParTaux[taux]) {
      detailParTaux[taux].base += totalHT;
      detailParTaux[taux].collectee += totalHT * (parseFloat(taux) / 100);
    }
  });

  expensesFiltered.forEach(exp => {
    const taux = (exp.tauxTVA || 20).toString();
    if (detailParTaux[taux]) {
      detailParTaux[taux].deductible += (exp.montant || 0) * (parseFloat(taux) / 100);
    }
  });

  return {
    periode: { debut: dateDebut, fin: dateFin },
    tvaCollectee,
    tvaDeductible,
    tvaNetteAPayer,
    isCredit: tvaNetteAPayer < 0,
    detailParTaux,
    nbFactures: invoicesFiltered.length,
    nbDepenses: expensesFiltered.length
  };
};

/**
 * Simulation d'envoi vers Pennylane
 * En production, utiliser l'API officielle Pennylane
 */
export const syncToPennylane = async (invoices, expenses, apiKey) => {
  // Simulation - en prod, faire un vrai appel API
  console.log('Sync to Pennylane:', { invoices: invoices.length, expenses: expenses.length });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        synced: {
          invoices: invoices.length,
          expenses: expenses.length
        },
        timestamp: new Date().toISOString()
      });
    }, 1500);
  });
};

/**
 * Simulation d'envoi vers Indy
 */
export const syncToIndy = async (invoices, apiKey) => {
  console.log('Sync to Indy:', { invoices: invoices.length });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        synced: invoices.length,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  });
};

/**
 * Simulation de recuperation des transactions Qonto
 */
export const fetchQontoTransactions = async (apiKey, dateDebut, dateFin) => {
  console.log('Fetch Qonto transactions:', { dateDebut, dateFin });

  return new Promise((resolve) => {
    setTimeout(() => {
      // Simule des transactions
      resolve({
        success: true,
        transactions: [],
        timestamp: new Date().toISOString()
      });
    }, 1000);
  });
};

export default {
  INTEGRATION_TYPES,
  SYNC_STATUS,
  getIntegrations,
  saveIntegration,
  removeIntegration,
  formatInvoiceForAccounting,
  formatExpenseForAccounting,
  exportInvoicesToCSV,
  exportExpensesToCSV,
  generateFEC,
  downloadFile,
  calculateTVASummary,
  syncToPennylane,
  syncToIndy,
  fetchQontoTransactions
};
