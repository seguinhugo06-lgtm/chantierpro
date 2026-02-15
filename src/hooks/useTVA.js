/**
 * useTVA - Hook for TVA calculations
 *
 * Pure computation hook that takes devis/depenses/mouvements/settings
 * and returns TVA breakdowns (monthly, quarterly, by rate).
 */

import { useMemo } from 'react';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

/**
 * @param {Object} options
 * @param {Array} options.devis - Accepted/paid devis (factures)
 * @param {Array} options.depenses - All depenses
 * @param {Array} options.mouvements - Treasury mouvements (tresorerie_mouvements)
 * @param {Object} options.settings - Treasury settings (regimeTva, etc.)
 * @param {number} [options.year] - Year to compute for (default: current year)
 */
export function useTVA({ devis = [], depenses = [], mouvements = [], settings = {}, year } = {}) {
  return useMemo(() => {
    const currentYear = year || new Date().getFullYear();
    const now = new Date();
    const regimeTva = settings.regimeTva || 'trimestriel';

    // Filter factures (accepted/paid devis)
    const acceptedStatuts = ['accepte', 'signe', 'payee', 'paye'];
    const factures = devis.filter(d => acceptedStatuts.includes(d.statut));

    // ── Monthly breakdown ──────────────────────────────────────────
    const tvaMonthly = Array.from({ length: 12 }, (_, i) => ({
      mois: MONTH_NAMES[i],
      monthIndex: i,
      collectee: 0,
      deductible: 0,
      net: 0,
    }));

    // TVA collectée from factures
    factures.forEach(f => {
      const d = new Date(f.date || f.createdAt);
      if (d.getFullYear() !== currentYear) return;
      const rate = f.tvaRate || f.tva_rate || 20;
      const ht = f.total_ht || (f.total_ttc ? f.total_ttc / (1 + rate / 100) : 0);
      const tva = (f.total_ttc || 0) - ht;
      if (tva > 0) tvaMonthly[d.getMonth()].collectee += tva;
    });

    // TVA déductible from depenses
    depenses.forEach(dep => {
      const d = new Date(dep.date || dep.createdAt);
      if (d.getFullYear() !== currentYear) return;
      const rate = dep.tvaRate || dep.tauxTva || dep.tva_rate || 20;
      const montant = dep.montant || 0;
      const tva = montant - (montant / (1 + rate / 100));
      if (tva > 0) tvaMonthly[d.getMonth()].deductible += tva;
    });

    // TVA from mouvements (if any have TVA data)
    mouvements.forEach(m => {
      const d = new Date(m.date);
      if (d.getFullYear() !== currentYear || m.statut === 'annule') return;
      if (m.montantTva && m.montantTva > 0) {
        if (m.type === 'entree') {
          tvaMonthly[d.getMonth()].collectee += m.montantTva;
        } else {
          tvaMonthly[d.getMonth()].deductible += m.montantTva;
        }
      }
    });

    // Calculate net for each month
    tvaMonthly.forEach(m => { m.net = m.collectee - m.deductible; });

    // ── Totals ──────────────────────────────────────────────────────
    const tvaTotal = tvaMonthly.reduce((acc, m) => ({
      collectee: acc.collectee + m.collectee,
      deductible: acc.deductible + m.deductible,
      net: acc.net + m.net,
    }), { collectee: 0, deductible: 0, net: 0 });

    // ── By rate breakdown ────────────────────────────────────────────
    const tvaByRate = {};

    factures.forEach(f => {
      const d = new Date(f.date || f.createdAt);
      if (d.getFullYear() !== currentYear) return;
      const rate = f.tvaRate || f.tva_rate || 20;
      if (!tvaByRate[rate]) tvaByRate[rate] = { collectee: 0, deductible: 0, base: 0, baseDeductible: 0 };
      const ht = f.total_ht || (f.total_ttc ? f.total_ttc / (1 + rate / 100) : 0);
      tvaByRate[rate].base += ht;
      tvaByRate[rate].collectee += (f.total_ttc || 0) - ht;
    });

    depenses.forEach(dep => {
      const d = new Date(dep.date || dep.createdAt);
      if (d.getFullYear() !== currentYear) return;
      const rate = dep.tvaRate || dep.tauxTva || dep.tva_rate || 20;
      if (!tvaByRate[rate]) tvaByRate[rate] = { collectee: 0, deductible: 0, base: 0, baseDeductible: 0 };
      const montant = dep.montant || 0;
      const ht = montant / (1 + rate / 100);
      tvaByRate[rate].baseDeductible += ht;
      tvaByRate[rate].deductible += montant - ht;
    });

    // ── Quarterly breakdown ──────────────────────────────────────────
    const tvaQuarterly = [
      { label: 'T1 (Jan-Mar)', months: [0, 1, 2] },
      { label: 'T2 (Avr-Jun)', months: [3, 4, 5] },
      { label: 'T3 (Jul-Sep)', months: [6, 7, 8] },
      { label: 'T4 (Oct-Dec)', months: [9, 10, 11] },
    ].map(q => {
      const collectee = q.months.reduce((s, m) => s + tvaMonthly[m].collectee, 0);
      const deductible = q.months.reduce((s, m) => s + tvaMonthly[m].deductible, 0);
      return { ...q, collectee, deductible, net: collectee - deductible };
    });

    // ── Next deadline ────────────────────────────────────────────────
    let tvaNextDeadline = null;
    if (regimeTva === 'mensuel') {
      // Réel normal: 24th of next month
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 24);
      tvaNextDeadline = {
        date: next,
        label: `24 ${MONTH_NAMES[next.getMonth()]}`,
        period: MONTH_NAMES[now.getMonth()],
      };
    } else if (regimeTva === 'trimestriel') {
      // Réel simplifié: Q1→May 24, Q2→Aug 24, Q3→Nov 24, Q4→Feb 24 next year
      const quarterDeadlines = [
        { month: 4, day: 24, quarter: 'T1' },
        { month: 7, day: 24, quarter: 'T2' },
        { month: 10, day: 24, quarter: 'T3' },
        { month: 1, day: 24, quarter: 'T4' },
      ];
      for (const qd of quarterDeadlines) {
        const deadlineYear = qd.month < 3 ? now.getFullYear() + 1 : now.getFullYear();
        const deadline = new Date(deadlineYear, qd.month, qd.day);
        if (deadline > now) {
          tvaNextDeadline = {
            date: deadline,
            label: `24 ${MONTH_NAMES[qd.month]}`,
            period: qd.quarter,
          };
          break;
        }
      }
    }

    // ── CA3 export data ──────────────────────────────────────────────
    const ca3Data = {
      ligne01: (tvaByRate[20]?.base || 0) + (tvaByRate[10]?.base || 0) + (tvaByRate[5.5]?.base || 0),
      ligne08: tvaByRate[20]?.collectee || 0,
      ligne09: tvaByRate[10]?.collectee || 0,
      ligne9B: tvaByRate[5.5]?.collectee || 0,
      ligne16: tvaTotal.collectee,
      ligne19: tvaTotal.deductible,
      ligne23: tvaTotal.deductible,
      ligne28: tvaTotal.net,
    };

    return {
      tvaMonthly,
      tvaTotal,
      tvaByRate,
      tvaQuarterly,
      tvaNextDeadline,
      regimeTva,
      ca3Data,
      isFranchise: regimeTva === 'franchise',
    };
  }, [devis, depenses, mouvements, settings, year]);
}
