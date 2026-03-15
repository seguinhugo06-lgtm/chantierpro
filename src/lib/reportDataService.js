/**
 * Report Data Service — Pure functions for report data aggregation
 *
 * Extracts computation logic from useAnalytique.js into standalone functions
 * so they can be used both in React components and Edge Functions.
 */

import { calcConversion, CONVERTED_STATUTS } from './statsUtils';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// ============ PERIOD HELPERS ============

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function getPrevPeriodRange(startDate, endDate) {
  const duration = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { startDate: prevStart, endDate: prevEnd };
}

/**
 * Generate a human-readable label for a period
 */
export function getPeriodLabel(debut, fin) {
  const d = new Date(debut);
  const f = new Date(fin);

  // Same month
  if (d.getFullYear() === f.getFullYear() && d.getMonth() === f.getMonth()) {
    return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Quarter detection
  const diffMonths = (f.getFullYear() - d.getFullYear()) * 12 + f.getMonth() - d.getMonth();
  if (diffMonths === 2 && d.getDate() === 1) {
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    return `T${quarter} ${d.getFullYear()}`;
  }

  // Full year
  if (diffMonths === 11 && d.getMonth() === 0 && d.getDate() === 1) {
    return `${d.getFullYear()}`;
  }

  // Custom range
  const fmt = (date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(d)} — ${fmt(f)}`;
}

/**
 * Get default period for a report type
 */
export function getDefaultPeriod(type) {
  const now = new Date();
  let debut, fin;

  if (type === 'financier') {
    // Previous quarter
    const currentQ = Math.floor(now.getMonth() / 3);
    if (currentQ === 0) {
      debut = new Date(now.getFullYear() - 1, 9, 1);
      fin = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else {
      const qStart = (currentQ - 1) * 3;
      debut = new Date(now.getFullYear(), qStart, 1);
      fin = new Date(now.getFullYear(), qStart + 3, 0, 23, 59, 59);
    }
  } else {
    // Previous month (activite default)
    if (now.getMonth() === 0) {
      debut = new Date(now.getFullYear() - 1, 11, 1);
      fin = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else {
      debut = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      fin = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }
  }

  return { debut, fin };
}

/**
 * Get period presets for UI
 */
export function getPeriodPresets() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return [
    {
      key: 'this_month',
      label: 'Ce mois',
      debut: new Date(currentYear, currentMonth, 1),
      fin: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59),
    },
    {
      key: 'last_month',
      label: 'Mois dernier',
      debut: new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, 1),
      fin: new Date(currentYear, currentMonth, 0, 23, 59, 59),
    },
    {
      key: 'this_quarter',
      label: 'Ce trimestre',
      debut: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1),
      fin: new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0, 23, 59, 59),
    },
    {
      key: 'last_quarter',
      label: 'Trimestre dernier',
      debut: (() => {
        const q = Math.floor(currentMonth / 3);
        return q === 0 ? new Date(currentYear - 1, 9, 1) : new Date(currentYear, (q - 1) * 3, 1);
      })(),
      fin: (() => {
        const q = Math.floor(currentMonth / 3);
        return q === 0 ? new Date(currentYear - 1, 12, 0, 23, 59, 59) : new Date(currentYear, q * 3, 0, 23, 59, 59);
      })(),
    },
    {
      key: 'this_year',
      label: 'Cette année',
      debut: new Date(currentYear, 0, 1),
      fin: new Date(currentYear, 11, 31, 23, 59, 59),
    },
  ];
}

// ============ ACTIVITY REPORT ============

/**
 * Compute all data for an Activity Report
 */
export function computeActivityReport(devis = [], clients = [], chantiers = [], depenses = [], paiements = [], periodeDebut, periodeFin) {
  const startDate = new Date(periodeDebut);
  const endDate = new Date(periodeFin);
  const prev = getPrevPeriodRange(startDate, endDate);

  // Filter to period
  const devisInPeriod = devis.filter(d => inRange(d.date, startDate, endDate));
  const depensesInPeriod = depenses.filter(d => inRange(d.date, startDate, endDate));
  const paiementsInPeriod = paiements.filter(p => inRange(p.date || p.created_at, startDate, endDate));

  // N-1
  const devisPrev = devis.filter(d => inRange(d.date, prev.startDate, prev.endDate));

  // KPIs
  const devisAcceptes = devisInPeriod.filter(d => CONVERTED_STATUTS.includes(d.statut));
  const ca = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);
  const caHT = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ht) || (Number(d.total_ttc) || 0) / 1.2), 0);

  const conversionResult = calcConversion(devisInPeriod);
  const tauxConversion = conversionResult.taux;

  const totalDepenses = depensesInPeriod.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
  const margeBrute = ca - totalDepenses;
  const hasDepenses = totalDepenses > 0;
  const margePercent = ca > 0 && hasDepenses ? (margeBrute / ca) * 100 : 0;

  const devisEnAttente = devisInPeriod.filter(d => d.statut === 'envoye' || d.statut === 'vu').length;
  const montantEnAttente = devisInPeriod.filter(d => d.statut === 'envoye' || d.statut === 'vu')
    .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

  const pipelineValue = devisInPeriod
    .filter(d => d.statut === 'envoye' || d.statut === 'vu' || d.statut === 'brouillon')
    .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

  const avgDevisValue = devisAcceptes.length > 0
    ? devisAcceptes.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0) / devisAcceptes.length
    : 0;

  const nbFacturesEmises = devisInPeriod.filter(d => d.type === 'facture').length;

  // N-1 comparison
  const prevAcceptes = devisPrev.filter(d => CONVERTED_STATUTS.includes(d.statut));
  const prevCA = prevAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);
  const prevConversion = calcConversion(devisPrev);

  const comparisons = {
    ca: prevCA > 0 ? ((ca - prevCA) / prevCA) * 100 : null,
    tauxConversion: prevConversion.taux > 0 ? (tauxConversion - prevConversion.taux) : null,
  };

  // Monthly revenue (current year)
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({ mois: MONTHS_SHORT[i], montant: 0, depenses: 0, monthIndex: i }));
  devis.filter(d => CONVERTED_STATUTS.includes(d.statut)).forEach(d => {
    if (!d.date) return;
    const date = new Date(d.date);
    if (date.getFullYear() === currentYear) {
      monthlyRevenue[date.getMonth()].montant += Number(d.total_ttc) || 0;
    }
  });
  depenses.forEach(d => {
    if (!d.date) return;
    const date = new Date(d.date);
    if (date.getFullYear() === currentYear) {
      monthlyRevenue[date.getMonth()].depenses += Number(d.montant) || 0;
    }
  });

  // Top clients
  const clientMap = {};
  devisAcceptes.forEach(d => {
    const cid = d.client_id;
    if (!cid) return;
    if (!clientMap[cid]) clientMap[cid] = { montant: 0, nbDevis: 0 };
    clientMap[cid].montant += Number(d.total_ttc) || 0;
    clientMap[cid].nbDevis++;
  });
  const topClients = Object.entries(clientMap)
    .map(([clientId, data]) => {
      const client = clients.find(c => String(c.id) === String(clientId));
      const nom = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : `Client #${clientId}`;
      return { id: clientId, nom, montant: data.montant, nbDevis: data.nbDevis, pct: ca > 0 ? (data.montant / ca) * 100 : 0 };
    })
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 5);

  // Devis par statut
  const devisParStatut = {};
  devisInPeriod.forEach(d => {
    const s = d.statut || 'brouillon';
    devisParStatut[s] = (devisParStatut[s] || 0) + 1;
  });

  // Chantiers par statut
  const chantiersParStatut = {};
  chantiers.forEach(c => {
    const s = c.statut || 'en_attente';
    chantiersParStatut[s] = (chantiersParStatut[s] || 0) + 1;
  });

  // Devis list
  const devisList = devisInPeriod
    .filter(d => d.type === 'devis' || !d.type)
    .map(d => {
      const client = clients.find(c => String(c.id) === String(d.client_id));
      return {
        numero: d.numero || '—',
        client: client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '—',
        montant: Number(d.total_ttc) || 0,
        statut: d.statut || 'brouillon',
        date: d.date,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  // Factures list
  const facturesList = devisInPeriod
    .filter(d => d.type === 'facture')
    .map(d => {
      const client = clients.find(c => String(c.id) === String(d.client_id));
      return {
        numero: d.numero || '—',
        client: client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '—',
        montant: Number(d.total_ttc) || 0,
        statut: d.statut || 'brouillon',
        date: d.date,
        echeance: d.date_echeance || d.dateEcheance || null,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  return {
    kpis: {
      ca, caHT, margeBrute, margePercent, hasDepenses,
      tauxConversion, devisEnAttente, montantEnAttente,
      pipelineValue, avgDevisValue, totalDepenses,
      nbDevisEmis: devisInPeriod.filter(d => d.type === 'devis' || !d.type).length,
      nbDevisAcceptes: devisAcceptes.length,
      nbFacturesEmises,
      nbClientsActifs: new Set(devisInPeriod.map(d => d.client_id).filter(Boolean)).size,
      nbChantiersActifs: chantiers.filter(c => c.statut === 'en_cours').length,
    },
    comparisons,
    monthlyRevenue,
    topClients,
    devisParStatut,
    chantiersParStatut,
    devisList,
    facturesList,
    periode: { debut: startDate, fin: endDate, label: getPeriodLabel(periodeDebut, periodeFin) },
  };
}

// ============ FINANCIAL REPORT ============

/**
 * Compute all data for a Financial Report
 */
export function computeFinancialReport(devis = [], clients = [], chantiers = [], depenses = [], paiements = [], periodeDebut, periodeFin) {
  const startDate = new Date(periodeDebut);
  const endDate = new Date(periodeFin);
  const prev = getPrevPeriodRange(startDate, endDate);

  const devisInPeriod = devis.filter(d => inRange(d.date, startDate, endDate));
  const depensesInPeriod = depenses.filter(d => inRange(d.date, startDate, endDate));
  const paiementsInPeriod = paiements.filter(p => inRange(p.date || p.created_at, startDate, endDate));
  const devisPrev = devis.filter(d => inRange(d.date, prev.startDate, prev.endDate));

  const devisAcceptes = devisInPeriod.filter(d => CONVERTED_STATUTS.includes(d.statut));
  const ca = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);
  const caHT = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ht) || (Number(d.total_ttc) || 0) / 1.2), 0);
  const totalDepenses = depensesInPeriod.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
  const margeBrute = ca - totalDepenses;
  const hasDepenses = totalDepenses > 0;
  const margePercent = ca > 0 && hasDepenses ? (margeBrute / ca) * 100 : 0;

  // TVA
  const tvaCollectee = devisAcceptes.reduce((sum, d) => {
    const ttc = Number(d.total_ttc) || 0;
    const ht = Number(d.total_ht) || ttc / 1.2;
    return sum + (ttc - ht);
  }, 0);
  const tvaDeductible = depensesInPeriod.reduce((sum, d) => {
    const montant = Number(d.montant) || 0;
    const rate = Number(d.tva_rate || d.tauxTva) || 20;
    return sum + (montant - montant / (1 + rate / 100));
  }, 0);
  const tvaNet = tvaCollectee - tvaDeductible;

  // Cash flow mensuel
  const currentYear = new Date().getFullYear();
  const cashFlowMensuel = Array.from({ length: 12 }, (_, i) => ({ mois: MONTHS_SHORT[i], paiements: 0, depenses: 0, solde: 0, monthIndex: i }));
  paiements.forEach(p => {
    const date = new Date(p.date || p.created_at);
    if (date.getFullYear() === currentYear) {
      cashFlowMensuel[date.getMonth()].paiements += Number(p.amount || p.montant) || 0;
    }
  });
  depenses.forEach(d => {
    const date = new Date(d.date);
    if (date && date.getFullYear() === currentYear) {
      cashFlowMensuel[date.getMonth()].depenses += Number(d.montant) || 0;
    }
  });
  cashFlowMensuel.forEach(m => { m.solde = m.paiements - m.depenses; });

  // Dépenses par catégorie
  const depParCat = {};
  depensesInPeriod.forEach(d => {
    const cat = d.categorie || 'Divers';
    depParCat[cat] = (depParCat[cat] || 0) + (Number(d.montant) || 0);
  });
  const depensesParCategorie = Object.entries(depParCat)
    .map(([categorie, montant]) => ({ categorie, montant }))
    .sort((a, b) => b.montant - a.montant);

  // Rentabilité par chantier
  const rentabiliteChantiers = chantiers
    .filter(c => c.statut === 'en_cours' || c.statut === 'termine')
    .map(chantier => {
      const chantierDevis = devisInPeriod.filter(d => d.chantier_id === chantier.id && CONVERTED_STATUTS.includes(d.statut));
      const chantierCA = chantierDevis.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);
      const chantierDeps = depensesInPeriod.filter(d => (d.chantierId || d.chantier_id) === chantier.id);
      const chantierTotalDep = chantierDeps.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
      const marge = chantierCA - chantierTotalDep;
      const hasChantierDep = chantierTotalDep > 0;
      const client = clients.find(c => c.id === (chantier.clientId || chantier.client_id));
      return {
        nom: chantier.nom || chantier.titre || 'Chantier',
        clientNom: client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '',
        ca: chantierCA,
        depenses: chantierTotalDep,
        marge,
        margePercent: chantierCA > 0 && hasChantierDep ? (marge / chantierCA) * 100 : 0,
        hasDepenses: hasChantierDep,
      };
    })
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 10);

  // Encaissements
  const totalPaiements = paiementsInPeriod.reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0);

  // N-1
  const prevAcceptes = devisPrev.filter(d => CONVERTED_STATUTS.includes(d.statut));
  const prevCA = prevAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

  return {
    kpis: {
      ca, caHT, totalDepenses, margeBrute, margePercent, hasDepenses,
      totalPaiements,
      solde: totalPaiements - totalDepenses,
    },
    tva: { collectee: tvaCollectee, deductible: tvaDeductible, net: tvaNet },
    cashFlowMensuel,
    depensesParCategorie,
    rentabiliteChantiers,
    comparisons: {
      ca: prevCA > 0 ? ((ca - prevCA) / prevCA) * 100 : null,
    },
    periode: { debut: startDate, fin: endDate, label: getPeriodLabel(periodeDebut, periodeFin) },
  };
}

// ============ CHANTIER REPORT ============

/**
 * Compute all data for a Chantier Report
 */
export function computeChantierReport(chantierId, devis = [], clients = [], chantiers = [], depenses = [], pointages = []) {
  const chantier = chantiers.find(c => c.id === chantierId);
  if (!chantier) return null;

  const client = clients.find(c => c.id === (chantier.clientId || chantier.client_id));
  const chantierDevis = devis.filter(d => d.chantier_id === chantierId);
  const chantierDevisAcceptes = chantierDevis.filter(d => CONVERTED_STATUTS.includes(d.statut));
  const chantierDepenses = depenses.filter(d => (d.chantierId || d.chantier_id) === chantierId);
  const chantierPointages = pointages.filter(p => (p.chantierId || p.chantier_id) === chantierId);

  const totalCA = chantierDevisAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);
  const totalDepenses = chantierDepenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
  const budgetPrevu = Number(chantier.budgetPrevu || chantier.budget_estime) || 0;
  const marge = totalCA - totalDepenses;
  const hasDepenses = totalDepenses > 0;

  // Pointages résumé
  const totalHeures = chantierPointages.reduce((sum, p) => sum + (Number(p.heures || p.hours) || 0), 0);

  // Dépenses détail
  const depensesDetail = chantierDepenses
    .map(d => ({
      description: d.description || d.fournisseur || 'Dépense',
      montant: Number(d.montant) || 0,
      date: d.date,
      categorie: d.categorie || 'Divers',
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Devis liés
  const devisLies = chantierDevis
    .map(d => ({
      numero: d.numero || '—',
      type: d.type || 'devis',
      statut: d.statut || 'brouillon',
      montant: Number(d.total_ttc) || 0,
      date: d.date,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    chantier: {
      nom: chantier.nom || chantier.titre || 'Chantier',
      adresse: chantier.adresse || '',
      statut: chantier.statut || 'en_attente',
      dateDebut: chantier.dateDebut || chantier.date_debut || chantier.created_at,
      dateFin: chantier.dateFin || chantier.date_fin || null,
      avancement: chantier.avancement || 0,
    },
    client: client ? {
      nom: `${client.prenom || ''} ${client.nom || ''}`.trim(),
      email: client.email || '',
      telephone: client.telephone || client.tel || '',
    } : null,
    budgetPrevu,
    totalCA,
    totalDepenses,
    marge,
    margePercent: totalCA > 0 && hasDepenses ? (marge / totalCA) * 100 : 0,
    hasDepenses,
    totalHeures,
    depensesDetail,
    devisLies,
    nbDevis: chantierDevis.length,
    nbDepenses: chantierDepenses.length,
  };
}
