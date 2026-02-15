/**
 * useAnalytique - Hook for business analytics computations
 *
 * Extracts all analytics logic from AnalyticsPage into a reusable hook.
 * Provides: KPIs, monthly breakdown, top clients, devis/chantier distributions,
 * rentabilite per chantier, cash flow, and margin analysis.
 */

import { useMemo } from 'react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCEPTED_STATUTS = ['accepte', 'signe', 'payee', 'paye'];

/**
 * @param {Object} options
 * @param {Array} options.devis
 * @param {Array} options.clients
 * @param {Array} options.chantiers
 * @param {Array} options.depenses
 * @param {Array} options.paiements
 * @param {Array} [options.equipe]
 */
export function useAnalytique({ devis = [], clients = [], chantiers = [], depenses = [], paiements = [], equipe = [] } = {}) {
  return useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // ── KPIs ────────────────────────────────────────────────────────
    const devisAcceptes = devis.filter(d => ACCEPTED_STATUTS.includes(d.statut));
    const ca = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    const devisEnAttente = devis.filter(d => d.statut === 'envoye' || d.statut === 'vu').length;
    const montantEnAttente = devis
      .filter(d => d.statut === 'envoye' || d.statut === 'vu')
      .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    const totalDevis = devis.length;
    const signedCount = devisAcceptes.length;
    const tauxConversion = totalDevis > 0 ? ((signedCount / totalDevis) * 100) : 0;

    const totalDepenses = depenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
    const margeBrute = ca - totalDepenses;
    const margePercent = ca > 0 ? (margeBrute / ca) * 100 : 0;

    // ── CA HT (if tvaRate available) ────────────────────────────────
    const caHT = devisAcceptes.reduce((sum, d) => {
      return sum + (Number(d.total_ht) || (Number(d.total_ttc) || 0) / (1 + (d.tvaRate || d.tva_rate || 20) / 100));
    }, 0);

    // ── Monthly revenue (current year) ──────────────────────────────
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({ mois: MONTHS[i], montant: 0, depenses: 0, marge: 0, monthIndex: i }));

    devis
      .filter(d => ACCEPTED_STATUTS.includes(d.statut))
      .forEach(d => {
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

    // Calculate monthly margin
    monthlyRevenue.forEach(m => { m.marge = m.montant - m.depenses; });

    // ── CA this month vs last month (trend) ─────────────────────────
    const caThisMonth = monthlyRevenue[currentMonth]?.montant || 0;
    const caLastMonth = currentMonth > 0 ? (monthlyRevenue[currentMonth - 1]?.montant || 0) : 0;
    const caTrend = caLastMonth > 0 ? ((caThisMonth - caLastMonth) / caLastMonth) * 100 : null;

    // ── Top clients by CA ────────────────────────────────────────────
    const clientMap = {};
    devisAcceptes.forEach(d => {
      const cid = d.client_id;
      if (!cid) return;
      if (!clientMap[cid]) clientMap[cid] = { montant: 0, nbDevis: 0, devisIds: [] };
      clientMap[cid].montant += Number(d.total_ttc) || 0;
      clientMap[cid].nbDevis++;
      clientMap[cid].devisIds.push(d.id);
    });

    const topClients = Object.entries(clientMap)
      .map(([clientId, data]) => {
        const client = clients.find(c => String(c.id) === String(clientId));
        const nom = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : `Client #${clientId}`;
        // Calculate client-specific depenses
        const clientChantiers = chantiers.filter(ch => String(ch.clientId || ch.client_id) === String(clientId));
        const clientDepenses = depenses.filter(dep =>
          clientChantiers.some(ch => (dep.chantierId || dep.chantier_id) === ch.id)
        ).reduce((sum, d) => sum + (Number(d.montant) || 0), 0);

        return {
          id: clientId,
          nom,
          montant: data.montant,
          nbDevis: data.nbDevis,
          depenses: clientDepenses,
          marge: data.montant - clientDepenses,
          margePercent: data.montant > 0 ? ((data.montant - clientDepenses) / data.montant) * 100 : 0,
        };
      })
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 10);

    // ── Devis by status ──────────────────────────────────────────────
    const devisParStatut = {};
    devis.forEach(d => {
      const s = d.statut || 'brouillon';
      devisParStatut[s] = (devisParStatut[s] || 0) + 1;
    });

    // ── Chantiers by status ──────────────────────────────────────────
    const chantiersParStatut = {};
    chantiers.forEach(c => {
      const s = c.statut || 'en_attente';
      chantiersParStatut[s] = (chantiersParStatut[s] || 0) + 1;
    });

    // ── Cash flow ────────────────────────────────────────────────────
    const totalPaiements = paiements.reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0);
    const cashFlow = {
      totalPaiements,
      totalDepenses: totalDepenses,
      solde: totalPaiements - totalDepenses,
    };

    // ── Rentabilite per chantier ─────────────────────────────────────
    const rentabiliteChantiers = chantiers
      .filter(c => c.statut === 'en_cours' || c.statut === 'termine')
      .map(chantier => {
        const chantierDevis = devis.filter(d => d.chantier_id === chantier.id && ACCEPTED_STATUTS.includes(d.statut));
        const chantierCA = chantierDevis.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

        const chantierDepenses = depenses.filter(d => (d.chantierId || d.chantier_id) === chantier.id);
        const chantierTotalDep = chantierDepenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);

        const marge = chantierCA - chantierTotalDep;
        const margePercent = chantierCA > 0 ? (marge / chantierCA) * 100 : 0;

        const client = clients.find(c => c.id === (chantier.clientId || chantier.client_id));
        const clientNom = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '';

        return {
          id: chantier.id,
          nom: chantier.nom || chantier.titre || `Chantier #${chantier.id?.slice?.(-6) || '?'}`,
          clientNom,
          statut: chantier.statut,
          ca: chantierCA,
          depenses: chantierTotalDep,
          marge,
          margePercent,
          avancement: chantier.avancement || 0,
          nbDevis: chantierDevis.length,
          nbDepenses: chantierDepenses.length,
          budgetPrevu: Number(chantier.budgetPrevu || chantier.budget_estime) || 0,
        };
      })
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // ── Margin distribution ──────────────────────────────────────────
    const activeChantiers = rentabiliteChantiers.filter(r => r.ca > 0);
    const avgMargin = activeChantiers.length > 0
      ? activeChantiers.reduce((s, r) => s + r.margePercent, 0) / activeChantiers.length
      : 0;
    const marginDistribution = {
      excellent: activeChantiers.filter(r => r.margePercent >= 30).length,     // vert
      bon: activeChantiers.filter(r => r.margePercent >= 15 && r.margePercent < 30).length,  // jaune
      faible: activeChantiers.filter(r => r.margePercent >= 0 && r.margePercent < 15).length, // orange
      negatif: activeChantiers.filter(r => r.margePercent < 0).length,         // rouge
    };

    // ── Devis pipeline value ─────────────────────────────────────────
    const pipelineValue = devis
      .filter(d => d.statut === 'envoye' || d.statut === 'vu' || d.statut === 'brouillon')
      .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    // ── Average devis value ──────────────────────────────────────────
    const avgDevisValue = devisAcceptes.length > 0
      ? devisAcceptes.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0) / devisAcceptes.length
      : 0;

    // ── Depenses by category ─────────────────────────────────────────
    const depensesParCategorie = {};
    depenses.forEach(d => {
      const cat = d.categorie || 'Divers';
      depensesParCategorie[cat] = (depensesParCategorie[cat] || 0) + (Number(d.montant) || 0);
    });

    return {
      // Global KPIs
      kpis: {
        ca,
        caHT,
        margeBrute,
        margePercent,
        tauxConversion,
        devisEnAttente,
        montantEnAttente,
        totalDepenses,
        pipelineValue,
        avgDevisValue,
        caThisMonth,
        caLastMonth,
        caTrend,
      },

      // Monthly breakdown
      monthlyRevenue,

      // Client analysis
      topClients,

      // Status distributions
      devisParStatut,
      chantiersParStatut,
      totalChantiers: chantiers.length,
      totalDevis: devis.length,

      // Cash flow
      cashFlow,

      // Rentabilite
      rentabiliteChantiers,
      avgMargin,
      marginDistribution,

      // Depenses breakdown
      depensesParCategorie,
    };
  }, [devis, clients, chantiers, depenses, paiements, equipe]);
}
