/**
 * situationUtils.js — Pure functions & constants for Situations de Travaux
 *
 * Used by SituationsTravaux component and integrations.
 * All functions are pure (no side effects, no DOM, no React).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SITUATION_STATUS = {
  BROUILLON: 'brouillon',
  VALIDEE: 'validee',
  FACTUREE: 'facturee',
  PAYEE: 'payee',
};

export const SITUATION_STATUS_LABELS = {
  brouillon: 'Brouillon',
  validee: 'Validée',
  facturee: 'Facturée',
  payee: 'Payée',
};

export const SITUATION_STATUS_COLORS = {
  brouillon: { light: 'bg-gray-100 text-gray-700', dark: 'bg-slate-700 text-slate-300' },
  validee: { light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-900/40 text-blue-300' },
  facturee: { light: 'bg-green-100 text-green-700', dark: 'bg-green-900/40 text-green-300' },
  payee: { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-900/40 text-emerald-300' },
};

export const DEFAULT_RETENUE_GARANTIE_PCT = 5;
export const DEFAULT_TVA_RATE = 10;

// ---------------------------------------------------------------------------
// Pure calculation functions
// ---------------------------------------------------------------------------

/**
 * Calculate totals for a single situation from its lignes.
 *
 * @param {Array} lignes - Array of situation line items
 * @param {number} retenuePct - Retenue de garantie percentage (0-100)
 * @param {boolean} isDGD - If true, retenue is released (not deducted)
 * @returns {Object} totals
 */
export function calculateSituationTotals(lignes, retenuePct = 0, isDGD = false) {
  let montantMarcheHT = 0;
  let montantCumuleHT = 0;
  let montantPrecedentHT = 0;
  let totalTVA = 0;
  const tvaParTaux = {}; // { 10: { base: 0, montant: 0 } }

  (lignes || []).forEach((l) => {
    const marcheHT = (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0);
    const cumuleHT = marcheHT * (parseFloat(l.cumulActuel) || 0) / 100;
    const precedentHT = marcheHT * (parseFloat(l.cumulPrecedent) || 0) / 100;
    const situationHT = cumuleHT - precedentHT;
    const taux = l.tva !== undefined ? parseFloat(l.tva) : DEFAULT_TVA_RATE;

    montantMarcheHT += marcheHT;
    montantCumuleHT += cumuleHT;
    montantPrecedentHT += precedentHT;

    if (!tvaParTaux[taux]) tvaParTaux[taux] = { base: 0, montant: 0 };
    tvaParTaux[taux].base += situationHT;
    tvaParTaux[taux].montant += situationHT * (taux / 100);

    totalTVA += situationHT * (taux / 100);
  });

  const montantSituationHT = montantCumuleHT - montantPrecedentHT;
  const montantSituationTTC = montantSituationHT + totalTVA;

  // Retenue de garantie: deducted on each situation, released on DGD
  const retenueGarantie = isDGD ? 0 : montantSituationHT * (retenuePct / 100);
  const netHT = montantSituationHT - retenueGarantie;
  const netTVA = netHT > 0 ? Object.values(tvaParTaux).reduce((s, d) => {
    // Re-proportion TVA on net HT
    const ratio = montantSituationHT > 0 ? netHT / montantSituationHT : 0;
    return s + d.montant * ratio;
  }, 0) : 0;
  const netTTC = netHT + totalTVA; // TVA on full amount, retenue deducted from HT

  return {
    montantMarcheHT: round2(montantMarcheHT),
    montantCumuleHT: round2(montantCumuleHT),
    montantPrecedentHT: round2(montantPrecedentHT),
    montantSituationHT: round2(montantSituationHT),
    totalTVA: round2(totalTVA),
    montantSituationTTC: round2(montantSituationTTC),
    retenueGarantie: round2(retenueGarantie),
    netAPayer: round2(montantSituationTTC - retenueGarantie),
    tvaParTaux,
  };
}

/**
 * Calculate global weighted advancement across all situations for a chantier.
 *
 * @param {Object} situationsData - The chantier.situations_data object
 * @returns {number} Percentage 0-100
 */
export function calculateGlobalAvancement(situationsData) {
  if (!situationsData?.situations?.length) return 0;

  // Use the latest non-brouillon situation (or the latest brouillon if none validated)
  const sorted = [...situationsData.situations]
    .filter((s) => s.statut !== SITUATION_STATUS.BROUILLON)
    .sort((a, b) => b.numero - a.numero);

  const latest = sorted[0] || situationsData.situations[situationsData.situations.length - 1];
  if (!latest?.lignes?.length) return 0;

  let totalMarche = 0;
  let totalCumule = 0;

  latest.lignes.forEach((l) => {
    const marche = (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0);
    const cumule = marche * (parseFloat(l.cumulActuel) || 0) / 100;
    totalMarche += marche;
    totalCumule += cumule;
  });

  return totalMarche > 0 ? round2((totalCumule / totalMarche) * 100) : 0;
}

/**
 * Initialize situation line items from a devis (with previous situation data if any).
 *
 * @param {Array} devisLignes - Lines from the source devis
 * @param {Object|null} previousSituation - The previous validated situation (or null)
 * @param {number} defaultTva - Default TVA rate
 * @returns {Array} Initialized lines for the new situation
 */
export function initSituationLignes(devisLignes, previousSituation = null, defaultTva = DEFAULT_TVA_RATE) {
  if (!Array.isArray(devisLignes)) return [];

  return devisLignes
    .filter((l) => !l._isSection) // Skip section markers
    .map((l, index) => {
      const prev = previousSituation?.lignes?.find(
        (pl) => pl.posteIndex === index || pl.ligneId === l.id
      );
      const cumulPrecedent = prev ? parseFloat(prev.cumulActuel) || 0 : 0;

      return {
        ligneId: l.id || `ligne-${index}`,
        posteIndex: index,
        description: l.description || 'Sans description',
        quantite: parseFloat(l.quantite) || 0,
        prixUnitaire: parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0,
        unite: l.unite || '',
        tva: l.tva !== undefined ? parseFloat(l.tva) : defaultTva,
        total_ht: (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0),
        devisNumero: l._devisNumero || '',
        cumulPrecedent,
        cumulActuel: cumulPrecedent, // Start at previous level
      };
    });
}

/**
 * Validate that advancement is within allowed bounds.
 *
 * @param {number} newCumul - Proposed cumul actuel %
 * @param {number} prevCumul - Previous cumul %
 * @returns {{ valid: boolean, clamped: number, error?: string }}
 */
export function validateAvancement(newCumul, prevCumul = 0) {
  const val = parseFloat(newCumul) || 0;
  const prev = parseFloat(prevCumul) || 0;

  if (val < prev) {
    return { valid: false, clamped: prev, error: `L'avancement ne peut pas être inférieur au précédent (${prev}%)` };
  }
  if (val > 100) {
    return { valid: false, clamped: 100, error: `L'avancement ne peut pas dépasser 100%` };
  }

  return { valid: true, clamped: val };
}

/**
 * Compute cumulative amounts already invoiced across all past situations.
 *
 * @param {Array} situations - All situations in the chantier
 * @returns {{ totalFactureHT: number, totalFactureTTC: number, retenueRetenue: number }}
 */
export function getCumulativeInvoiced(situations) {
  if (!Array.isArray(situations)) return { totalFactureHT: 0, totalFactureTTC: 0, retenueRetenue: 0 };

  let totalFactureHT = 0;
  let totalFactureTTC = 0;
  let retenueRetenue = 0;

  situations
    .filter((s) => s.statut === SITUATION_STATUS.FACTUREE || s.statut === SITUATION_STATUS.PAYEE)
    .forEach((s) => {
      const totals = s.totaux || calculateSituationTotals(s.lignes, s.retenuePct || 0, s.isDGD || false);
      totalFactureHT += totals.montantSituationHT || 0;
      totalFactureTTC += totals.netAPayer || totals.montantSituationTTC || 0;
      retenueRetenue += totals.retenueGarantie || 0;
    });

  return {
    totalFactureHT: round2(totalFactureHT),
    totalFactureTTC: round2(totalFactureTTC),
    retenueRetenue: round2(retenueRetenue),
  };
}

/**
 * Build the initial situations_data structure for a chantier entering situation mode.
 *
 * @param {string} devisSourceId - UUID of the source devis
 * @param {number} retenuePct - Retenue de garantie percentage
 * @returns {Object} situations_data structure
 */
export function createSituationsData(devisSourceId, retenuePct = DEFAULT_RETENUE_GARANTIE_PCT) {
  return {
    mode: 'situation',
    devis_source_id: devisSourceId,
    retenue_garantie_pct: retenuePct,
    situations: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
