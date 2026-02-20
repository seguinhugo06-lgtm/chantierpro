/**
 * useAnalytique - Hook for business analytics computations
 *
 * Supports period filtering and N vs N-1 comparison.
 * Fixes taux conversion: excludes brouillons from denominator.
 */

import { useMemo } from 'react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCEPTED_STATUTS = ['accepte', 'signe', 'payee', 'paye'];
const SENT_STATUTS = ['envoye', 'vu', 'accepte', 'signe', 'payee', 'paye', 'refuse', 'facture'];

/**
 * Get date range for a period key
 * @param {string} periodKey - 'month' | 'quarter' | 'year' | '12m' | custom 'YYYY-MM-DD_YYYY-MM-DD'
 */
function getPeriodRange(periodKey) {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let startDate;

  switch (periodKey) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case '12m':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      if (periodKey && periodKey.includes('_')) {
        const [s, e] = periodKey.split('_');
        startDate = new Date(s);
        return { startDate, endDate: new Date(e + 'T23:59:59') };
      }
      // Default: all time
      startDate = new Date(2020, 0, 1);
      break;
  }
  return { startDate, endDate };
}

/** Get the N-1 equivalent range */
function getPrevPeriodRange(startDate, endDate) {
  const duration = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { startDate: prevStart, endDate: prevEnd };
}

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

/**
 * @param {Object} options
 * @param {Array} options.devis
 * @param {Array} options.clients
 * @param {Array} options.chantiers
 * @param {Array} options.depenses
 * @param {Array} options.paiements
 * @param {Array} [options.equipe]
 * @param {string} [options.period] - 'month' | 'quarter' | 'year' | '12m' | 'all' | custom
 */
export function useAnalytique({ devis = [], clients = [], chantiers = [], depenses = [], paiements = [], equipe = [], period = 'all' } = {}) {
  return useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // ── Period filtering ──────────────────────────────────────────
    const { startDate, endDate } = getPeriodRange(period);
    const prev = getPrevPeriodRange(startDate, endDate);

    const devisInPeriod = period === 'all' ? devis : devis.filter(d => inRange(d.date, startDate, endDate));
    const depensesInPeriod = period === 'all' ? depenses : depenses.filter(d => inRange(d.date, startDate, endDate));
    const paiementsInPeriod = period === 'all' ? paiements : paiements.filter(p => inRange(p.date || p.created_at, startDate, endDate));

    // N-1 data for comparison
    const devisPrev = period === 'all' ? [] : devis.filter(d => inRange(d.date, prev.startDate, prev.endDate));
    const depensesPrev = period === 'all' ? [] : depenses.filter(d => inRange(d.date, prev.startDate, prev.endDate));

    // ── KPIs (current period) ─────────────────────────────────────
    const devisAcceptes = devisInPeriod.filter(d => ACCEPTED_STATUTS.includes(d.statut));
    const ca = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    const devisEnAttente = devisInPeriod.filter(d => d.statut === 'envoye' || d.statut === 'vu').length;
    const montantEnAttente = devisInPeriod
      .filter(d => d.statut === 'envoye' || d.statut === 'vu')
      .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    // ── FIXED taux conversion: exclude brouillons ─────────────────
    const devisEnvoyes = devisInPeriod.filter(d => SENT_STATUTS.includes(d.statut));
    const devisSigned = devisInPeriod.filter(d => ACCEPTED_STATUTS.includes(d.statut));
    const totalDevisEnvoyes = devisEnvoyes.length;
    const signedCount = devisSigned.length;
    const tauxConversion = totalDevisEnvoyes > 0 ? ((signedCount / totalDevisEnvoyes) * 100) : 0;

    // Brouillons count (for UI)
    const brouillonsCount = devisInPeriod.filter(d => d.statut === 'brouillon').length;
    const brouillonsMontant = devisInPeriod.filter(d => d.statut === 'brouillon')
      .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    const totalDepenses = depensesInPeriod.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
    const margeBrute = ca - totalDepenses;
    const margePercent = ca > 0 ? (margeBrute / ca) * 100 : 0;

    // ── N-1 comparisons ───────────────────────────────────────────
    const prevAcceptes = devisPrev.filter(d => ACCEPTED_STATUTS.includes(d.statut));
    const prevCA = prevAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);
    const prevDepenses = depensesPrev.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
    const prevMarge = prevCA - prevDepenses;
    const prevDevisEnvoyes = devisPrev.filter(d => SENT_STATUTS.includes(d.statut));
    const prevSignedCount = devisPrev.filter(d => ACCEPTED_STATUTS.includes(d.statut)).length;
    const prevTauxConversion = prevDevisEnvoyes.length > 0 ? ((prevSignedCount / prevDevisEnvoyes.length) * 100) : 0;

    const comparisons = {
      ca: prevCA > 0 ? ((ca - prevCA) / prevCA) * 100 : null,
      depenses: prevDepenses > 0 ? ((totalDepenses - prevDepenses) / prevDepenses) * 100 : null,
      marge: prevMarge !== 0 ? ((margeBrute - prevMarge) / Math.abs(prevMarge)) * 100 : null,
      tauxConversion: prevTauxConversion > 0 ? (tauxConversion - prevTauxConversion) : null,
    };

    // ── CA HT ─────────────────────────────────────────────────────
    const caHT = devisAcceptes.reduce((sum, d) => {
      return sum + (Number(d.total_ht) || (Number(d.total_ttc) || 0) / (1 + (d.tvaRate || d.tva_rate || 20) / 100));
    }, 0);

    // ── Monthly revenue (current year) ────────────────────────────
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

    monthlyRevenue.forEach(m => { m.marge = m.montant - m.depenses; });

    // ── CA trend (this month vs last) ─────────────────────────────
    const caThisMonth = monthlyRevenue[currentMonth]?.montant || 0;
    const caLastMonth = currentMonth > 0 ? (monthlyRevenue[currentMonth - 1]?.montant || 0) : 0;
    const caTrend = caLastMonth > 0 ? ((caThisMonth - caLastMonth) / caLastMonth) * 100 : null;

    // ── Top clients by CA ─────────────────────────────────────────
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
        const clientChantiers = chantiers.filter(ch => String(ch.clientId || ch.client_id) === String(clientId));
        const clientDepenses = depensesInPeriod.filter(dep =>
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

    // ── Devis by status ───────────────────────────────────────────
    const devisParStatut = {};
    devisInPeriod.forEach(d => {
      const s = d.statut || 'brouillon';
      devisParStatut[s] = (devisParStatut[s] || 0) + 1;
    });

    // ── Chantiers by status ───────────────────────────────────────
    const chantiersParStatut = {};
    chantiers.forEach(c => {
      const s = c.statut || 'en_attente';
      chantiersParStatut[s] = (chantiersParStatut[s] || 0) + 1;
    });

    // ── Cash flow ─────────────────────────────────────────────────
    const totalPaiements = paiementsInPeriod.reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0);
    const cashFlow = {
      totalPaiements,
      totalDepenses,
      solde: totalPaiements - totalDepenses,
    };

    // ── Rentabilite per chantier ──────────────────────────────────
    const rentabiliteChantiers = chantiers
      .filter(c => c.statut === 'en_cours' || c.statut === 'termine')
      .map(chantier => {
        const chantierDevis = devisInPeriod.filter(d => d.chantier_id === chantier.id && ACCEPTED_STATUTS.includes(d.statut));
        const chantierCA = chantierDevis.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

        const chantierDeps = depensesInPeriod.filter(d => (d.chantierId || d.chantier_id) === chantier.id);
        const chantierTotalDep = chantierDeps.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);

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
          nbDepenses: chantierDeps.length,
          budgetPrevu: Number(chantier.budgetPrevu || chantier.budget_estime) || 0,
        };
      })
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // ── Margin distribution ───────────────────────────────────────
    const activeChantiers = rentabiliteChantiers.filter(r => r.ca > 0);
    const avgMargin = activeChantiers.length > 0
      ? activeChantiers.reduce((s, r) => s + r.margePercent, 0) / activeChantiers.length
      : 0;
    const marginDistribution = {
      excellent: activeChantiers.filter(r => r.margePercent >= 30).length,
      bon: activeChantiers.filter(r => r.margePercent >= 15 && r.margePercent < 30).length,
      faible: activeChantiers.filter(r => r.margePercent >= 0 && r.margePercent < 15).length,
      negatif: activeChantiers.filter(r => r.margePercent < 0).length,
    };

    // ── Pipeline ──────────────────────────────────────────────────
    const pipelineValue = devisInPeriod
      .filter(d => d.statut === 'envoye' || d.statut === 'vu' || d.statut === 'brouillon')
      .reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    const avgDevisValue = devisAcceptes.length > 0
      ? devisAcceptes.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0) / devisAcceptes.length
      : 0;

    // ── Depenses by category ──────────────────────────────────────
    const depensesParCategorie = {};
    depensesInPeriod.forEach(d => {
      const cat = d.categorie || 'Divers';
      depensesParCategorie[cat] = (depensesParCategorie[cat] || 0) + (Number(d.montant) || 0);
    });

    return {
      kpis: {
        ca, caHT, margeBrute, margePercent,
        tauxConversion,
        totalDevisEnvoyes, signedCount, brouillonsCount, brouillonsMontant,
        devisEnAttente, montantEnAttente, totalDepenses,
        pipelineValue, avgDevisValue,
        caThisMonth, caLastMonth, caTrend,
      },
      comparisons,
      monthlyRevenue,
      topClients,
      devisParStatut,
      chantiersParStatut,
      totalChantiers: chantiers.length,
      totalDevis: devisInPeriod.length,
      cashFlow,
      rentabiliteChantiers,
      avgMargin,
      marginDistribution,
      depensesParCategorie,
    };
  }, [devis, clients, chantiers, depenses, paiements, equipe, period]);
}
