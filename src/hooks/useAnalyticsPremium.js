/**
 * useAnalyticsPremium — Advanced analytics computations for the Premium dashboard
 *
 * Returns: funnel, delaiMoyenSignature, tauxRefus, caPrevisionnel, panierMoyen,
 * tauxConversion, clientStats, clientsDormants, clientsRecurrents, topPrestations,
 * rentabiliteChantiers, productivite, moisList, retardMoyenPaiement
 */

import { useMemo } from 'react';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

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
    default:
      startDate = new Date(2020, 0, 1);
      break;
  }
  return { startDate, endDate };
}

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export function useAnalyticsPremium({
  devis = [],
  clients = [],
  chantiers = [],
  depenses = [],
  equipe = [],
  paiements = [],
  pointages = [],
  period = 'all',
} = {}) {
  return useMemo(() => {
    const { startDate, endDate } = getPeriodRange(period);
    const now = new Date();

    // Filter devis by period
    const filteredDevis = period === 'all'
      ? devis
      : devis.filter(d => inRange(d.date || d.created_at, startDate, endDate));

    const filteredDepenses = period === 'all'
      ? depenses
      : depenses.filter(d => inRange(d.date || d.created_at, startDate, endDate));

    const filteredPaiements = period === 'all'
      ? paiements
      : paiements.filter(p => inRange(p.date || p.created_at, startDate, endDate));

    // ── Funnel ──────────────────────────────────────────────────
    const devisOnly = filteredDevis.filter(d => d.type !== 'facture');
    const brouillons = devisOnly.filter(d => d.statut === 'brouillon').length;
    const envoyes = devisOnly.filter(d => ['envoye', 'vu', 'accepte', 'signe', 'refuse'].includes(d.statut)).length;
    const signes = devisOnly.filter(d => ['accepte', 'signe'].includes(d.statut)).length;
    const factures = filteredDevis.filter(d => d.type === 'facture' || d.statut === 'facture').length;

    const totalDevisCount = brouillons + envoyes;
    const funnel = [
      { etape: 'Brouillons', count: brouillons + envoyes, pct: 100 },
      { etape: 'Envoyés', count: envoyes, pct: totalDevisCount > 0 ? Math.round((envoyes / totalDevisCount) * 100) : 0 },
      { etape: 'Signés', count: signes, pct: envoyes > 0 ? Math.round((signes / envoyes) * 100) : 0 },
      { etape: 'Facturés', count: factures, pct: signes > 0 ? Math.round((factures / signes) * 100) : 0 },
    ];

    // ── Taux de conversion ──────────────────────────────────────
    const sentDevis = devisOnly.filter(d => d.statut !== 'brouillon');
    const convertedDevis = devisOnly.filter(d => ['accepte', 'signe'].includes(d.statut));
    const tauxConversion = sentDevis.length > 0
      ? Math.round((convertedDevis.length / sentDevis.length) * 100)
      : 0;

    // ── Délai moyen de signature ────────────────────────────────
    const delais = convertedDevis
      .filter(d => d.date && d.updated_at)
      .map(d => {
        const created = new Date(d.date);
        const signed = new Date(d.updated_at);
        return Math.max(0, Math.floor((signed - created) / 86400000));
      })
      .filter(d => d > 0 && d < 365);
    const delaiMoyenSignature = delais.length > 0
      ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
      : 0;

    // ── Taux de refus ───────────────────────────────────────────
    const refuses = devisOnly.filter(d => d.statut === 'refuse').length;
    const tauxRefus = sentDevis.length > 0
      ? Math.round((refuses / sentDevis.length) * 100)
      : 0;

    // ── Panier moyen ────────────────────────────────────────────
    const devisWithTotal = convertedDevis.filter(d => (d.total_ttc || d.montant || 0) > 0);
    const panierMoyen = devisWithTotal.length > 0
      ? Math.round(devisWithTotal.reduce((sum, d) => sum + (d.total_ttc || d.montant || 0), 0) / devisWithTotal.length)
      : 0;

    // ── CA prévisionnel ─────────────────────────────────────────
    const devisEnCours = devisOnly.filter(d => ['envoye', 'vu'].includes(d.statut));
    const caPrevisionnel = Math.round(
      devisEnCours.reduce((sum, d) => sum + (d.total_ttc || d.montant || 0), 0) * (tauxConversion / 100 || 0.3)
    );

    // ── Client stats ────────────────────────────────────────────
    const clientMap = {};
    filteredDevis.forEach(d => {
      const cid = d.client_id || d.clientId;
      if (!cid) return;
      if (!clientMap[cid]) {
        const cl = clients.find(c => c.id === cid);
        clientMap[cid] = {
          id: cid,
          nom: cl ? `${cl.prenom || ''} ${cl.nom || ''}`.trim() : 'Inconnu',
          ca: 0,
          devisCount: 0,
          convertis: 0,
          lastActivity: null,
        };
      }
      clientMap[cid].ca += (d.total_ttc || d.montant || 0);
      clientMap[cid].devisCount += 1;
      if (['accepte', 'signe', 'facture', 'payee'].includes(d.statut)) {
        clientMap[cid].convertis += 1;
      }
      const dDate = d.date || d.created_at;
      if (dDate) {
        const dd = new Date(dDate);
        if (!clientMap[cid].lastActivity || dd > clientMap[cid].lastActivity) {
          clientMap[cid].lastActivity = dd;
        }
      }
    });

    const clientStats = Object.values(clientMap)
      .map(c => ({
        ...c,
        tauxConversion: c.devisCount > 0 ? Math.round((c.convertis / c.devisCount) * 100) : 0,
      }))
      .sort((a, b) => b.ca - a.ca);

    // ── Clients dormants (90+ jours sans activité) ──────────────
    const clientsDormants = clientStats
      .filter(c => {
        if (!c.lastActivity) return true;
        const daysSince = Math.floor((now - c.lastActivity) / 86400000);
        return daysSince >= 90;
      })
      .map(c => ({
        ...c,
        joursSansActivite: c.lastActivity
          ? Math.floor((now - c.lastActivity) / 86400000)
          : 999,
      }))
      .sort((a, b) => b.joursSansActivite - a.joursSansActivite)
      .slice(0, 10);

    // ── Clients récurrents (2+ devis convertis) ─────────────────
    const clientsRecurrents = clientStats.filter(c => c.convertis >= 2);

    // ── Top prestations ─────────────────────────────────────────
    const prestationMap = {};
    filteredDevis.forEach(d => {
      const lignes = d.lignes || d.items || [];
      (Array.isArray(lignes) ? lignes : []).forEach(l => {
        const desc = l.description || l.titre || l.nom || 'Autre';
        const key = desc.substring(0, 50);
        if (!prestationMap[key]) {
          prestationMap[key] = { nom: key, ca: 0, count: 0 };
        }
        prestationMap[key].ca += (l.total || l.montant || (l.quantite || 1) * (l.prixUnitaire || l.prix || 0));
        prestationMap[key].count += 1;
      });
    });
    const topPrestations = Object.values(prestationMap)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // ── Rentabilité chantiers ───────────────────────────────────
    const rentabiliteChantiers = chantiers
      .filter(ch => ch.statut !== 'brouillon')
      .map(ch => {
        const chId = ch.id;
        const caChantier = filteredDevis
          .filter(d => (d.chantier_id || d.chantierId) === chId && ['accepte', 'signe', 'facture', 'payee'].includes(d.statut))
          .reduce((sum, d) => sum + (d.total_ttc || d.montant || 0), 0);
        const depChantier = filteredDepenses
          .filter(d => (d.chantier_id || d.chantierId) === chId)
          .reduce((sum, d) => sum + (d.montant || 0), 0);
        const marge = caChantier - depChantier;
        const margePct = caChantier > 0 ? Math.round((marge / caChantier) * 100) : 0;
        return {
          id: chId,
          nom: ch.nom || ch.titre || 'Sans nom',
          statut: ch.statut || 'en_cours',
          ca: caChantier,
          depenses: depChantier,
          marge,
          margePct,
        };
      })
      .filter(ch => ch.ca > 0 || ch.depenses > 0)
      .sort((a, b) => b.margePct - a.margePct);

    // ── Productivité équipe ─────────────────────────────────────
    const productivite = (equipe || []).map(membre => {
      const membreId = membre.id;
      const heures = (pointages || [])
        .filter(p => (p.employe_id || p.employeId) === membreId)
        .reduce((sum, p) => sum + (p.heures || p.duree || 0), 0);
      const capacite = (membre.heuresHebdo || 35) * 4; // Monthly capacity estimate
      const cout = heures * (membre.tauxHoraire || membre.coutHoraire || 0);
      return {
        id: membreId,
        nom: `${membre.prenom || ''} ${membre.nom || ''}`.trim() || 'Membre',
        role: membre.role || membre.poste || '',
        heures: Math.round(heures),
        capacite,
        taux: capacite > 0 ? Math.round((heures / capacite) * 100) : 0,
        cout: Math.round(cout),
      };
    }).filter(m => m.heures > 0 || m.capacite > 0);

    // ── Mois list (12 mois) ─────────────────────────────────────
    const moisList = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_FR[d.getMonth()]} ${d.getFullYear() !== now.getFullYear() ? d.getFullYear().toString().slice(-2) : ''}`.trim();

      // CA mensuel (devis signés/facturés)
      const caMonth = devis
        .filter(dv => {
          const dvDate = dv.date || dv.created_at;
          if (!dvDate) return false;
          const dd = new Date(dvDate);
          return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth()
            && ['accepte', 'signe', 'facture', 'payee'].includes(dv.statut);
        })
        .reduce((sum, dv) => sum + (dv.total_ttc || dv.montant || 0), 0);

      // Dépenses mensuelles
      const depMonth = depenses
        .filter(dep => {
          const depDate = dep.date || dep.created_at;
          if (!depDate) return false;
          const dd = new Date(depDate);
          return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth();
        })
        .reduce((sum, dep) => sum + (dep.montant || 0), 0);

      moisList.push({
        key,
        label,
        ca: Math.round(caMonth),
        depenses: Math.round(depMonth),
        marge: Math.round(caMonth - depMonth),
      });
    }

    // ── Retard moyen de paiement ────────────────────────────────
    const retards = filteredPaiements
      .filter(p => p.date_echeance && p.date)
      .map(p => {
        const echeance = new Date(p.date_echeance);
        const paiement = new Date(p.date);
        return Math.max(0, Math.floor((paiement - echeance) / 86400000));
      })
      .filter(r => r > 0);
    const retardMoyenPaiement = retards.length > 0
      ? Math.round(retards.reduce((a, b) => a + b, 0) / retards.length)
      : 0;

    return {
      funnel,
      delaiMoyenSignature,
      tauxRefus,
      caPrevisionnel,
      panierMoyen,
      tauxConversion,
      clientStats,
      clientsDormants,
      clientsRecurrents,
      topPrestations,
      rentabiliteChantiers,
      productivite,
      moisList,
      retardMoyenPaiement,
    };
  }, [devis, clients, chantiers, depenses, equipe, paiements, pointages, period]);
}
