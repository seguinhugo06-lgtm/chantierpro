/**
 * acompteUtils.js — Pure functions & constants for Acompte Échéanciers
 *
 * Used by AcompteEcheancierModal, AcompteSuiviCard, DevisPage.
 * All functions are pure (no side effects, no DOM, no React).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ETAPE_STATUT = {
  A_FACTURER: 'a_facturer',
  FACTURE: 'facture',
  PAYE: 'paye',
};

export const ETAPE_STATUT_LABELS = {
  a_facturer: 'À facturer',
  facture: 'Facturé',
  paye: 'Payé',
};

export const ETAPE_STATUT_COLORS = {
  a_facturer: { light: 'bg-slate-100 text-slate-600', dark: 'bg-slate-700 text-slate-300' },
  facture: { light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-900/40 text-blue-300' },
  paye: { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-900/40 text-emerald-300' },
};

/**
 * Predefined échéancier templates.
 * Each template defines the split percentages and default labels.
 */
export const ECHEANCIER_TEMPLATES = {
  '30-70': {
    label: '30% / 70%',
    description: 'Acompte classique',
    etapes: [
      { pourcentage: 30, label: 'Acompte à la commande' },
      { pourcentage: 70, label: 'Solde à la livraison' },
    ],
  },
  '50-50': {
    label: '50% / 50%',
    description: 'Moitié-moitié',
    etapes: [
      { pourcentage: 50, label: 'Acompte à la commande' },
      { pourcentage: 50, label: 'Solde à la livraison' },
    ],
  },
  '30-30-40': {
    label: '30% / 30% / 40%',
    description: 'Trois étapes',
    etapes: [
      { pourcentage: 30, label: 'Acompte à la commande' },
      { pourcentage: 30, label: 'Acompte intermédiaire' },
      { pourcentage: 40, label: 'Solde à la livraison' },
    ],
  },
  '30-40-30': {
    label: '30% / 40% / 30%',
    description: 'Par avancement',
    etapes: [
      { pourcentage: 30, label: 'Début de chantier' },
      { pourcentage: 40, label: 'Avancement 70%' },
      { pourcentage: 30, label: 'Réception des travaux' },
    ],
  },
};

export const TEMPLATE_KEYS = Object.keys(ECHEANCIER_TEMPLATES);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Pure calculation functions
// ---------------------------------------------------------------------------

/**
 * Compute HT, TVA, TTC amounts for a given percentage of a devis.
 * Handles multi-rate TVA (tvaParTaux) proportionally.
 *
 * Extracted from DevisPage.createAcompte() logic.
 *
 * @param {Object} devis - The source devis { total_ht, tva, total_ttc, tvaParTaux, tvaDetails, tvaRate }
 * @param {number} pourcentage - Percentage (0-100) for this step
 * @param {number} defaultTvaRate - Fallback TVA rate (default 20)
 * @returns {{ montant_ht: number, tva: number, montant_ttc: number, tvaParTaux: Object }}
 */
export function computeEtapeMontants(devis, pourcentage, defaultTvaRate = 20) {
  const ratio = pourcentage / 100;
  const montant_ht = round2((devis.total_ht || 0) * ratio);

  // Build proportional tvaParTaux
  const tvaParTaux = {};
  const srcTva = devis.tvaParTaux || devis.tvaDetails;
  let tva = 0;

  if (srcTva && typeof srcTva === 'object' && Object.keys(srcTva).length > 0) {
    Object.entries(srcTva).forEach(([rate, info]) => {
      const base = round2((info.base || 0) * ratio);
      const montant = round2((info.montant || 0) * ratio);
      tvaParTaux[rate] = { base, montant };
      tva += montant;
    });
    tva = round2(tva);
  } else {
    // Single rate fallback
    tva = round2(montant_ht * ((devis.tvaRate || defaultTvaRate) / 100));
  }

  const montant_ttc = round2(montant_ht + tva);

  return { montant_ht, tva, montant_ttc, tvaParTaux };
}

/**
 * Build complete étapes array from a template or custom steps.
 *
 * @param {Object} devis - Source devis
 * @param {string|null} templateKey - Template key (e.g. '30-70') or null for custom
 * @param {Array|null} customEtapes - Custom steps: [{ pourcentage, label }] (used when templateKey is null/'custom')
 * @param {number} defaultTvaRate - Fallback TVA rate
 * @returns {Array} Full étapes with computed amounts
 */
export function buildEcheancierEtapes(devis, templateKey, customEtapes = null, defaultTvaRate = 20) {
  const sourceEtapes = templateKey && templateKey !== 'custom' && ECHEANCIER_TEMPLATES[templateKey]
    ? ECHEANCIER_TEMPLATES[templateKey].etapes
    : customEtapes || [];

  return sourceEtapes.map((e, idx) => {
    const montants = computeEtapeMontants(devis, e.pourcentage, defaultTvaRate);
    return {
      numero: idx + 1,
      label: e.label || `Étape ${idx + 1}`,
      pourcentage: e.pourcentage,
      ...montants,
      facture_id: null,
      statut: ETAPE_STATUT.A_FACTURER,
      date_prevue: e.date_prevue || null,
      date_facture: null,
    };
  });
}

/**
 * Get the next étape that needs to be invoiced.
 *
 * @param {Array} etapes - Array of étapes
 * @returns {Object|null} The next étape with statut 'a_facturer', or null if all done
 */
export function getNextEtapeAFacturer(etapes) {
  if (!etapes || etapes.length === 0) return null;
  return etapes
    .filter(e => e.statut === ETAPE_STATUT.A_FACTURER)
    .sort((a, b) => a.numero - b.numero)[0] || null;
}

/**
 * Check if an étape is the last one (solde).
 *
 * @param {Object} etape - The étape to check
 * @param {Array} etapes - All étapes
 * @returns {boolean}
 */
export function isLastEtape(etape, etapes) {
  if (!etape || !etapes || etapes.length === 0) return false;
  const maxNumero = Math.max(...etapes.map(e => e.numero));
  return etape.numero === maxNumero;
}

/**
 * Compute progress summary for an échéancier.
 *
 * @param {Array} etapes - Array of étapes
 * @returns {Object} Progress summary
 */
export function getEcheancierProgress(etapes) {
  if (!etapes || etapes.length === 0) {
    return {
      totalEtapes: 0,
      etapesFacturees: 0,
      etapesPayees: 0,
      pourcentageFacture: 0,
      pourcentagePaye: 0,
      montantFacture: 0,
      montantPaye: 0,
      resteAFacturer: 0,
      totalTTC: 0,
    };
  }

  const totalEtapes = etapes.length;
  const facturees = etapes.filter(e => e.statut === ETAPE_STATUT.FACTURE || e.statut === ETAPE_STATUT.PAYE);
  const payees = etapes.filter(e => e.statut === ETAPE_STATUT.PAYE);

  const montantFacture = round2(facturees.reduce((s, e) => s + (e.montant_ttc || 0), 0));
  const montantPaye = round2(payees.reduce((s, e) => s + (e.montant_ttc || 0), 0));
  const totalTTC = round2(etapes.reduce((s, e) => s + (e.montant_ttc || 0), 0));
  const resteAFacturer = round2(totalTTC - montantFacture);

  const pourcentageFacture = round2(facturees.reduce((s, e) => s + (e.pourcentage || 0), 0));
  const pourcentagePaye = round2(payees.reduce((s, e) => s + (e.pourcentage || 0), 0));

  return {
    totalEtapes,
    etapesFacturees: facturees.length,
    etapesPayees: payees.length,
    pourcentageFacture,
    pourcentagePaye,
    montantFacture,
    montantPaye,
    resteAFacturer,
    totalTTC,
  };
}

/**
 * Validate an échéancier's étapes.
 *
 * @param {Array} etapes - Array of { pourcentage, label }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEcheancier(etapes) {
  const errors = [];

  if (!etapes || etapes.length < 2) {
    errors.push('L\'échéancier doit comporter au moins 2 étapes');
  }

  if (etapes && etapes.length > 10) {
    errors.push('L\'échéancier ne peut pas dépasser 10 étapes');
  }

  if (etapes) {
    const totalPct = etapes.reduce((s, e) => s + (e.pourcentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      errors.push(`La somme des pourcentages doit être 100% (actuellement ${totalPct}%)`);
    }

    etapes.forEach((e, idx) => {
      if (!e.pourcentage || e.pourcentage <= 0) {
        errors.push(`L'étape ${idx + 1} doit avoir un pourcentage supérieur à 0`);
      }
      if (e.pourcentage > 90) {
        errors.push(`L'étape ${idx + 1} ne peut pas dépasser 90%`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build facture lignes for a specific étape.
 *
 * - For acompte (non-last): single line "Acompte X% sur devis N°..."
 * - For solde (last étape): copies devis lines + negative lines for each previous invoiced acompte
 *
 * Extracted and generalized from DevisPage.createAcompte() and createSolde().
 *
 * @param {Object} devis - Source devis { numero, lignes, tvaRate, total_ht }
 * @param {Object} etape - Current étape to invoice
 * @param {Array} etapes - All étapes in the échéancier
 * @param {number} defaultTvaRate - Fallback TVA rate
 * @returns {Array} Facture lignes
 */
export function buildFactureLignesForEtape(devis, etape, etapes, defaultTvaRate = 20) {
  const isLast = isLastEtape(etape, etapes);

  if (!isLast) {
    // Acompte line
    return [{
      id: crypto.randomUUID(),
      description: `Acompte ${etape.pourcentage}% sur devis ${devis.numero || 'N/A'}${etape.label ? ` — ${etape.label}` : ''}`,
      quantite: 1,
      unite: 'forfait',
      prixUnitaire: etape.montant_ht,
      montant: etape.montant_ht,
      tva: devis.tvaRate || defaultTvaRate,
    }];
  }

  // Solde: copy devis lines + deduct all previously invoiced acomptes
  const lignes = (devis.lignes || []).map(l => ({
    ...l,
    tva: l.tva !== undefined ? l.tva : (devis.tvaRate || defaultTvaRate),
  }));

  // Add negative lines for each previously invoiced étape
  const facturedEtapes = etapes
    .filter(e => e.numero !== etape.numero && (e.statut === ETAPE_STATUT.FACTURE || e.statut === ETAPE_STATUT.PAYE))
    .sort((a, b) => a.numero - b.numero);

  facturedEtapes.forEach(e => {
    lignes.push({
      id: `acompte_${e.numero}`,
      description: `Acompte ${e.pourcentage}% déjà facturé${e.facture_id ? '' : ''} — ${e.label || `Étape ${e.numero}`}`,
      quantite: 1,
      unite: 'forfait',
      prixUnitaire: -e.montant_ht,
      montant: -e.montant_ht,
      tva: devis.tvaRate || defaultTvaRate,
    });
  });

  return lignes;
}

/**
 * Compute solde amounts for the last étape of an échéancier,
 * considering all previously invoiced acomptes.
 *
 * @param {Object} devis - Source devis
 * @param {Array} etapes - All étapes
 * @returns {{ montant_ht: number, tva: number, montant_ttc: number, tvaParTaux: Object }}
 */
export function computeSoldeMontants(devis, etapes) {
  const facturedEtapes = etapes.filter(
    e => e.statut === ETAPE_STATUT.FACTURE || e.statut === ETAPE_STATUT.PAYE
  );

  const totalAcompteHT = round2(facturedEtapes.reduce((s, e) => s + (e.montant_ht || 0), 0));
  const totalAcompteTVA = round2(facturedEtapes.reduce((s, e) => s + (e.tva || 0), 0));

  const montant_ht = round2((devis.total_ht || 0) - totalAcompteHT);
  const tva = round2((devis.tva || 0) - totalAcompteTVA);
  const montant_ttc = round2(montant_ht + tva);

  // Build tvaParTaux for solde
  const tvaParTaux = {};
  const srcTva = devis.tvaParTaux || devis.tvaDetails;
  if (srcTva && typeof srcTva === 'object') {
    Object.entries(srcTva).forEach(([rate, info]) => {
      const acompteBase = facturedEtapes.reduce((s, e) => s + (e.tvaParTaux?.[rate]?.base || 0), 0);
      const acompteMontant = facturedEtapes.reduce((s, e) => s + (e.tvaParTaux?.[rate]?.montant || 0), 0);
      tvaParTaux[rate] = {
        base: round2((info.base || 0) - acompteBase),
        montant: round2((info.montant || 0) - acompteMontant),
      };
    });
  }

  return { montant_ht, tva, montant_ttc, tvaParTaux };
}

/**
 * Update an étape within the etapes array (immutable).
 *
 * @param {Array} etapes - Current étapes array
 * @param {number} numero - Étape numero to update
 * @param {Object} updates - Fields to merge
 * @returns {Array} New étapes array
 */
export function updateEtape(etapes, numero, updates) {
  return etapes.map(e => e.numero === numero ? { ...e, ...updates } : e);
}

/**
 * Check if all étapes are invoiced (échéancier terminé).
 *
 * @param {Array} etapes
 * @returns {boolean}
 */
export function isEcheancierTermine(etapes) {
  if (!etapes || etapes.length === 0) return false;
  return etapes.every(e => e.statut === ETAPE_STATUT.FACTURE || e.statut === ETAPE_STATUT.PAYE);
}
