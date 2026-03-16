/**
 * useKPIs - Centralized KPI calculations for all modules
 * Single source of truth: CA encaissé, à encaisser, pipeline, conversion, etc.
 * Replaces duplicated calculations across Dashboard, DevisPage, Clients, Overview.
 *
 * @module hooks/useKPIs
 */

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calcConversion } from '../lib/statsUtils';
import { isDraftChantier } from '../lib/utils';

/**
 * @param {Object} [options]
 * @param {string} [options.period='month'] - 'month' | 'quarter' | 'year' | 'all'
 * @param {string} [options.clientId] - Filter to a single client
 * @param {string} [options.chantierId] - Filter to a single chantier
 * @returns {Object} kpis - Unified KPI object
 */
export function useKPIs({ period = 'month', clientId, chantierId } = {}) {
  const { devis = [], chantiers = [], clients = [], depenses = [], catalogue = [] } = useData();

  return useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Period filter
    const periodStart = period === 'month' ? startOfMonth
      : period === 'quarter' ? startOfQuarter
      : period === 'year' ? startOfYear
      : null; // 'all' = no filter

    // Filter devis by scope
    let scopedDevis = devis;
    if (clientId) scopedDevis = scopedDevis.filter(d => d.client_id === clientId);
    if (chantierId) scopedDevis = scopedDevis.filter(d => d.chantier_id === chantierId);

    // Split factures vs devis
    const factures = scopedDevis.filter(d => d.type === 'facture');
    const devisOnly = scopedDevis.filter(d => d.type === 'devis');

    // === REVENUE ===
    // CA ENCAISSÉ = factures payées uniquement
    const facturesPayees = factures.filter(f => f.statut === 'payee');
    const caEncaisse = facturesPayees.reduce((s, f) => s + (f.total_ttc || f.montant_ttc || 0), 0);

    // À ENCAISSER = factures envoyées non payées
    const facturesImpayees = factures.filter(f => f.statut !== 'payee');
    const caAEncaisser = facturesImpayees.reduce((s, f) => s + (f.total_ttc || f.montant_ttc || 0), 0);

    // Factures en retard (> 30 jours)
    const facturesOverdue = facturesImpayees.filter(f => {
      const age = Math.floor((now - new Date(f.date || f.created_at)) / 86400000);
      return age > 30;
    });

    // CE MOIS uniquement (factures payées ce mois)
    const payeesCeMois = facturesPayees.filter(f => {
      const d = new Date(f.date_paiement || f.updated_at || f.date);
      return d >= startOfMonth;
    });
    const caCeMois = payeesCeMois.reduce((s, f) => s + (f.total_ttc || f.montant_ttc || 0), 0);

    // MOIS DERNIER
    const payeesMoisDernier = facturesPayees.filter(f => {
      const d = new Date(f.date_paiement || f.updated_at || f.date);
      return d >= startOfPrevMonth && d < startOfMonth;
    });
    const caMoisDernier = payeesMoisDernier.reduce((s, f) => s + (f.total_ttc || f.montant_ttc || 0), 0);

    // Tendance
    const tendance = caMoisDernier > 0
      ? Math.round(((caCeMois - caMoisDernier) / caMoisDernier) * 100)
      : null;

    // === PIPELINE ===
    const devisEnvoyes = devisOnly.filter(d => ['envoye', 'vu'].includes(d.statut));
    const devisAcceptes = devisOnly.filter(d => ['accepte', 'signe', 'acompte_facture'].includes(d.statut));
    const devisRefuses = devisOnly.filter(d => d.statut === 'refuse');
    const montantPipeline = devisEnvoyes.reduce((s, d) => s + (d.total_ttc || d.total_ht || 0), 0);

    // Taux de conversion (formule unifiée via calcConversion — raw float, formatConversion() for display)
    const conversionResult = calcConversion(devisOnly);
    const tauxConversion = conversionResult.envoyes > 0 ? conversionResult.taux : null;

    // === CHANTIERS ===
    let scopedChantiers = chantiers;
    if (clientId) scopedChantiers = scopedChantiers.filter(c => c.client_id === clientId);
    const chantiersActifs = scopedChantiers.filter(c => c.statut === 'en_cours' && !isDraftChantier(c)).length;
    const chantiersProspect = scopedChantiers.filter(c => c.statut === 'prospect').length;

    // === CLIENTS ===
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const clientsActifs = new Set();
    devis.forEach(d => {
      if (d.client_id && new Date(d.date || d.created_at) >= twelveMonthsAgo) {
        clientsActifs.add(d.client_id);
      }
    });
    chantiers.forEach(c => {
      const cid = c.client_id || c.clientId;
      if (cid && (c.statut === 'en_cours' || new Date(c.date_debut || c.created_at) >= twelveMonthsAgo)) {
        clientsActifs.add(cid);
      }
    });

    // === STOCK ===
    const stockItems = catalogue.filter(c => (c.stock_actuel ?? c.stock) != null && c.prixAchat > 0);
    const stockValue = stockItems.reduce((s, c) => s + c.prixAchat * (c.stock_actuel ?? c.stock ?? 0), 0);
    const lowStockItems = catalogue.filter(c => {
      const st = c.stock_actuel ?? c.stock;
      const se = c.stock_seuil_alerte ?? c.stockMin;
      return st != null && se != null && se > 0 && st < se;
    });

    // === DOCUMENTS A TRAITER ===
    const documentsATraiter = scopedDevis.filter(d => {
      const days = Math.floor((now - new Date(d.date)) / 86400000);
      return (d.statut === 'brouillon' && days > 2) || (['envoye', 'vu'].includes(d.statut) && days > 7);
    });

    return {
      // Revenue
      caEncaisse,
      caAEncaisser,
      caTotal: caEncaisse + caAEncaisser,
      caCeMois,
      caMoisDernier,
      tendance,
      tendanceLabel: tendance != null ? 'vs mois dernier' : 'Début de mois',

      // Pipeline
      devisEnAttente: devisEnvoyes.length,
      montantPipeline,
      tauxConversion,
      conversionSignes: conversionResult.signes,
      conversionEnvoyes: conversionResult.envoyes,
      devisAcceptes: devisAcceptes.length,

      // Invoices
      facturesPayees,
      facturesImpayees,
      montantImpaye: caAEncaisser,
      facturesOverdue,

      // Chantiers
      chantiersActifs,
      chantiersProspect,

      // Clients
      clientsActifs: clientsActifs.size,
      clientsTotal: clients.length,

      // Stock
      lowStockItems,
      stockValue,

      // Documents
      documentsATraiter: documentsATraiter.length,

      // Meta
      isNewUser: devis.length === 0 && chantiers.length === 0,
      hasRealData: devis.length > 0 || chantiers.length > 0,
    };
  }, [devis, chantiers, clients, depenses, catalogue, period, clientId, chantierId]);
}

export default useKPIs;
