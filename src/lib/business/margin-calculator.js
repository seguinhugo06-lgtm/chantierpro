/**
 * Calculateur de marge et alertes pour ChantierPro
 * Analyse la rentabilite des chantiers et detecte les risques
 *
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for margin calculations.
 * All components should use these functions instead of inline calculations.
 */

import { MARGIN_THRESHOLDS as THRESHOLDS, AJUSTEMENT_TYPE, DEVIS_STATUS } from '../constants';

/**
 * Seuils d'alerte pour les marges
 * Re-exported from constants for backwards compatibility
 */
export const MARGIN_THRESHOLDS = {
  CRITICAL: THRESHOLDS.DANGER,  // Marge < 10% = critique (rouge)
  WARNING: THRESHOLDS.WARNING,   // Marge < 20% = attention (orange)
  GOOD: THRESHOLDS.GOOD,         // Marge >= 30% = bon (vert)
  EXCELLENT: 40                  // Marge >= 40% = excellent
};

/**
 * Types d'alertes
 */
export const ALERT_TYPES = {
  LOW_MARGIN: 'low_margin',
  NEGATIVE_MARGIN: 'negative_margin',
  BUDGET_OVERRUN: 'budget_overrun',
  COST_INCREASE: 'cost_increase',
  HOURS_OVERRUN: 'hours_overrun',
  UNPAID_INVOICE: 'unpaid_invoice'
};

/**
 * Accepted devis statuses for revenue calculation
 */
const ACCEPTED_STATUSES = [
  DEVIS_STATUS.ACCEPTE,
  DEVIS_STATUS.ACOMPTE_FACTURE,
  DEVIS_STATUS.FACTURE,
  DEVIS_STATUS.PAYEE
];

/**
 * Calcule la marge d'un chantier
 * @param {Object} chantier - Donnees du chantier
 * @param {Object} data - Donnees associees (devis, depenses, pointages, equipe, ajustements)
 * @returns {Object} Bilan financier complet
 *
 * USAGE: This is the SINGLE source of truth for margin calculation.
 * Do NOT duplicate this logic in components.
 */
export const calculateChantierMargin = (chantier, { devis = [], depenses = [], pointages = [], equipe = [], ajustements = [] }) => {
  if (!chantier) return null;

  // Filter data for this chantier
  const chantierDevis = devis.filter(d => d.chantier_id === chantier.id);
  const chantierDepenses = depenses.filter(d => d.chantierId === chantier.id);
  const chantierPointages = pointages.filter(p => p.chantierId === chantier.id);
  const chantierAjustements = ajustements.filter(a => a.chantierId === chantier.id);

  // ===== REVENUS =====
  // Revenue from accepted devis (not factures - those are delivery confirmations)
  const revenuDevis = chantierDevis
    .filter(d => ACCEPTED_STATUSES.includes(d.statut))
    .reduce((sum, d) => sum + (d.total_ht || 0), 0);

  // Fallback to budget if no accepted devis
  const revenuPrevu = revenuDevis > 0 ? revenuDevis : (chantier.budget_estime || 0);

  // Revenue actually received (payee invoices)
  const revenuEncaisse = chantierDevis
    .filter(d => d.statut === DEVIS_STATUS.PAYEE)
    .reduce((sum, d) => sum + (d.total_ht || 0), 0);

  // Revenue pending (sent but not paid)
  const revenuEnAttente = chantierDevis
    .filter(d => [DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU, DEVIS_STATUS.ACCEPTE, DEVIS_STATUS.ACOMPTE_FACTURE, DEVIS_STATUS.FACTURE].includes(d.statut) && d.statut !== DEVIS_STATUS.PAYEE)
    .reduce((sum, d) => sum + (d.total_ht || 0), 0);

  // Revenue adjustments (positive additions)
  const adjRevenus = chantierAjustements
    .filter(a => a.type === AJUSTEMENT_TYPE.REVENU)
    .reduce((sum, a) => sum + (a.montant || a.montant_ht || 0), 0);

  // ===== COUTS =====
  // Material/supply expenses
  const coutMateriaux = chantierDepenses.reduce((sum, d) => sum + (d.montant || 0), 0);

  // Labor costs - use Map for O(1) employee lookup
  const employeeMap = new Map(equipe.map(e => [e.id, e]));
  const heuresTotal = chantierPointages.reduce((sum, p) => sum + (p.heures || 0), 0);
  const coutMO = chantierPointages.reduce((sum, p) => {
    const emp = employeeMap.get(p.employeId);
    // Use tauxHoraire OR coutHoraireCharge for backwards compatibility
    const tauxHoraire = emp?.tauxHoraire || emp?.coutHoraireCharge || 0;
    return sum + ((p.heures || 0) * tauxHoraire);
  }, 0);

  // Cost adjustments (additional expenses)
  const adjDepenses = chantierAjustements
    .filter(a => a.type === AJUSTEMENT_TYPE.DEPENSE)
    .reduce((sum, a) => sum + (a.montant || a.montant_ht || 0), 0);

  // ===== TOTAUX =====
  const revenuTotal = revenuPrevu + adjRevenus;
  const totalDepenses = coutMateriaux + coutMO + adjDepenses;

  // ===== MARGES =====
  // Gross margin (projected)
  const margeBrute = revenuTotal - totalDepenses;
  const tauxMarge = revenuTotal > 0 ? (margeBrute / revenuTotal) * 100 : 0;

  // Real margin (based on actual payments received)
  const margeReelle = revenuEncaisse - totalDepenses;
  const tauxMargeReelle = revenuEncaisse > 0 ? (margeReelle / revenuEncaisse) * 100 : 0;

  // Margin status for color coding
  let margeStatus = 'excellent';
  if (tauxMarge < 0) margeStatus = 'negative';
  else if (tauxMarge < MARGIN_THRESHOLDS.CRITICAL) margeStatus = 'critical';
  else if (tauxMarge < MARGIN_THRESHOLDS.WARNING) margeStatus = 'warning';
  else if (tauxMarge < MARGIN_THRESHOLDS.GOOD) margeStatus = 'good';

  return {
    chantierId: chantier.id,
    chantierNom: chantier.nom,
    // Revenus
    revenuPrevu,
    revenuDevis,
    revenuEncaisse,
    revenuEnAttente,
    revenuTotal,
    adjRevenus,
    // Couts
    coutMateriaux,
    coutMO,
    coutAutres: adjDepenses,
    totalDepenses,
    // Heures
    heuresTotal,
    // Marges (CONSISTENT NAMING - use these everywhere!)
    marge: margeBrute,           // Alias for backwards compatibility
    margeBrute,
    tauxMarge,
    margeReelle,
    tauxMargeReelle,
    margeStatus,
    // Progression
    avancement: chantier.avancement || 0,
    statut: chantier.statut,
    // Counts for display
    devisCount: chantierDevis.length,
    depensesCount: chantierDepenses.length,
    pointagesCount: chantierPointages.length
  };
};

/**
 * Genere les alertes pour un chantier
 * @param {Object} margin - Resultat de calculateChantierMargin
 * @param {Object} options - Options (seuils personnalises, etc.)
 * @returns {Array} Liste des alertes
 */
export const generateChantierAlerts = (margin, options = {}) => {
  if (!margin) return [];

  const alerts = [];
  const thresholds = { ...MARGIN_THRESHOLDS, ...options.thresholds };

  // Alerte marge negative
  if (margin.tauxMarge < 0) {
    alerts.push({
      type: ALERT_TYPES.NEGATIVE_MARGIN,
      severity: 'critical',
      title: 'Marge negative',
      message: `Le chantier "${margin.chantierNom}" est en perte de ${Math.abs(margin.margeBrute).toFixed(0)} EUR`,
      value: margin.tauxMarge,
      chantierId: margin.chantierId
    });
  }
  // Alerte marge critique
  else if (margin.tauxMarge < thresholds.CRITICAL) {
    alerts.push({
      type: ALERT_TYPES.LOW_MARGIN,
      severity: 'critical',
      title: 'Marge tres faible',
      message: `Marge de seulement ${margin.tauxMarge.toFixed(1)}% sur "${margin.chantierNom}"`,
      value: margin.tauxMarge,
      chantierId: margin.chantierId,
      suggestion: `Augmentez le devis de ${((thresholds.WARNING - margin.tauxMarge) * margin.revenuTotal / 100).toFixed(0)} EUR pour atteindre ${thresholds.WARNING}% de marge`
    });
  }
  // Alerte marge attention
  else if (margin.tauxMarge < thresholds.WARNING) {
    alerts.push({
      type: ALERT_TYPES.LOW_MARGIN,
      severity: 'warning',
      title: 'Marge a surveiller',
      message: `Marge de ${margin.tauxMarge.toFixed(1)}% sur "${margin.chantierNom}"`,
      value: margin.tauxMarge,
      chantierId: margin.chantierId
    });
  }

  // Alerte factures impayees
  if (margin.revenuEnAttente > 0) {
    alerts.push({
      type: ALERT_TYPES.UNPAID_INVOICE,
      severity: 'info',
      title: 'Factures en attente',
      message: `${margin.revenuEnAttente.toFixed(0)} EUR a encaisser sur "${margin.chantierNom}"`,
      value: margin.revenuEnAttente,
      chantierId: margin.chantierId
    });
  }

  // Alerte depassement budget (si avancement > budget consomme attendu)
  if (margin.avancement > 0 && margin.totalDepenses > 0) {
    const budgetAttendu = (margin.revenuTotal * margin.avancement / 100) * 0.7; // 70% du revenu en couts
    if (margin.totalDepenses > budgetAttendu * 1.2) {
      alerts.push({
        type: ALERT_TYPES.BUDGET_OVERRUN,
        severity: 'warning',
        title: 'Depassement de budget',
        message: `Les depenses depassent le budget prevu a ${margin.avancement}% d'avancement`,
        value: ((margin.totalDepenses / budgetAttendu - 1) * 100).toFixed(0),
        chantierId: margin.chantierId
      });
    }
  }

  return alerts;
};

/**
 * Calcule les KPIs globaux pour tous les chantiers
 * @param {Array} chantiers - Liste des chantiers
 * @param {Object} data - Donnees associees
 * @returns {Object} KPIs agrégés
 */
export const calculateGlobalKPIs = (chantiers, data) => {
  const chantiersEnCours = chantiers.filter(c => c.statut === 'en_cours');
  const chantiersTermines = chantiers.filter(c => c.statut === 'termine');

  const margins = chantiers.map(c => calculateChantierMargin(c, data)).filter(Boolean);
  const marginsEnCours = margins.filter(m => m.statut === 'en_cours');

  // Calculs agreges
  const caTotal = margins.reduce((s, m) => s + m.revenuTotal, 0);
  const caTotalEncaisse = margins.reduce((s, m) => s + m.revenuEncaisse, 0);
  const coutTotal = margins.reduce((s, m) => s + m.totalDepenses, 0);
  const margeGlobale = caTotal > 0 ? ((caTotal - coutTotal) / caTotal * 100) : 0;

  // Chantiers a risque
  const chantiersRisque = margins.filter(m => m.tauxMarge < MARGIN_THRESHOLDS.WARNING && m.statut === 'en_cours');
  const chantiersRentables = margins.filter(m => m.tauxMarge >= MARGIN_THRESHOLDS.GOOD);

  // Toutes les alertes
  const allAlerts = margins.flatMap(m => generateChantierAlerts(m));
  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = allAlerts.filter(a => a.severity === 'warning');

  // Tendance (comparaison termine vs en cours)
  const margeTermines = chantiersTermines.length > 0
    ? margins.filter(m => m.statut === 'termine').reduce((s, m) => s + m.tauxMarge, 0) / chantiersTermines.length
    : 0;
  const margeEnCours = chantiersEnCours.length > 0
    ? marginsEnCours.reduce((s, m) => s + m.tauxMarge, 0) / chantiersEnCours.length
    : 0;

  return {
    // Vue d'ensemble
    nombreChantiers: chantiers.length,
    chantiersEnCours: chantiersEnCours.length,
    chantiersTermines: chantiersTermines.length,
    // Financier
    caTotal,
    caTotalEncaisse,
    aEncaisser: caTotal - caTotalEncaisse,
    coutTotal,
    margeGlobale,
    margeGlobaleMontant: caTotal - coutTotal,
    // Performance
    chantiersRentables: chantiersRentables.length,
    chantiersRisque: chantiersRisque.length,
    tauxRentabilite: chantiers.length > 0 ? (chantiersRentables.length / chantiers.length * 100) : 0,
    // Tendance
    margeTermines,
    margeEnCours,
    tendance: margeEnCours - margeTermines, // Positif = amelioration
    // Alertes
    totalAlerts: allAlerts.length,
    criticalAlerts: criticalAlerts.length,
    warningAlerts: warningAlerts.length,
    alerts: allAlerts.slice(0, 10), // Top 10 alertes
    // Details
    margins
  };
};

/**
 * Obtient la couleur associee a un niveau de marge
 * @param {number} tauxMarge - Taux de marge en %
 * @returns {Object} { bg, text, border }
 */
export const getMarginColor = (tauxMarge, isDark = false) => {
  if (tauxMarge < 0) {
    return {
      bg: isDark ? 'bg-red-900/30' : 'bg-red-50',
      text: isDark ? 'text-red-400' : 'text-red-600',
      border: isDark ? 'border-red-800' : 'border-red-200',
      hex: '#ef4444'
    };
  }
  if (tauxMarge < MARGIN_THRESHOLDS.CRITICAL) {
    return {
      bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
      text: isDark ? 'text-red-400' : 'text-red-600',
      border: isDark ? 'border-red-800' : 'border-red-200',
      hex: '#ef4444'
    };
  }
  if (tauxMarge < MARGIN_THRESHOLDS.WARNING) {
    return {
      bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50',
      text: isDark ? 'text-amber-400' : 'text-amber-600',
      border: isDark ? 'border-amber-800' : 'border-amber-200',
      hex: '#f59e0b'
    };
  }
  if (tauxMarge < MARGIN_THRESHOLDS.GOOD) {
    return {
      bg: isDark ? 'bg-yellow-900/20' : 'bg-yellow-50',
      text: isDark ? 'text-yellow-400' : 'text-yellow-600',
      border: isDark ? 'border-yellow-800' : 'border-yellow-200',
      hex: '#eab308'
    };
  }
  return {
    bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50',
    text: isDark ? 'text-emerald-400' : 'text-emerald-600',
    border: isDark ? 'border-emerald-800' : 'border-emerald-200',
    hex: '#10b981'
  };
};

/**
 * Formate un montant en euros
 * @param {number} amount - Montant
 * @param {boolean} modeDiscret - Masquer le montant
 * @returns {string}
 */
export const formatMoney = (amount, modeDiscret = false) => {
  if (modeDiscret) return '·····';
  return (amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' EUR';
};

/**
 * Formate un pourcentage
 * @param {number} value - Valeur en %
 * @param {boolean} modeDiscret - Masquer le pourcentage
 * @returns {string}
 */
export const formatPercent = (value, modeDiscret = false) => {
  if (modeDiscret) return '··%';
  return (value || 0).toFixed(1) + '%';
};

export default {
  MARGIN_THRESHOLDS,
  ALERT_TYPES,
  calculateChantierMargin,
  generateChantierAlerts,
  calculateGlobalKPIs,
  getMarginColor,
  formatMoney,
  formatPercent
};
