/**
 * Résumé de TVA d'une période (Réglages › Comptabilité), sur les règles communes de l'app :
 * - TVA facturée : factures et avoirs émis de la période, taux par taux, avoirs déduits (src/lib/ventes.js) ;
 * - TVA déductible : celle saisie sur les dépenses (src/lib/tvaDepenses.js), le montant d'une dépense étant HT ;
 *   une dépense sans TVA saisie ne déduit rien et elle est dénombrée ;
 * - franchise en base (art. 293 B du CGI) : ni TVA facturée ni TVA déductible.
 *
 * Relecture juriste-btp du 17 oct. 2026 : ce module recalculait la TVA depuis les lignes à 20 % d'office, comptait les
 * brouillons et les devis, prenait le montant d'une dépense pour un HT à 20 % ; il produisait aussi un FEC et des CSV
 * à part (brouillons inclus, avoirs du mauvais côté) et des synchronisations Pennylane, Indy et Qonto simulées qui
 * annonçaient un succès sans rien envoyer. Les exports sont désormais ceux de Finances › Export comptable.
 */

import { tvaFacturee, facturesEmises } from '../ventes';
import { tvaDeductible } from '../tvaDepenses';

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * @param {Array} documents devis, factures et avoirs
 * @param {Array} depenses
 * @param {string} dateDebut « AAAA-MM-JJ »
 * @param {string} dateFin « AAAA-MM-JJ »
 * @param {{ franchise?: boolean }} options
 */
export const calculateTVASummary = (documents, depenses, dateDebut, dateFin, { franchise = false } = {}) => {
  const periode = { du: dateDebut, au: dateFin };
  const collectee = tvaFacturee(documents, periode, { isMicro: franchise });
  const deductible = tvaDeductible(depenses, { ...periode, franchise });

  const detailParTaux = {};
  const ligne = (taux) => {
    const cle = String(taux);
    if (!detailParTaux[cle]) detailParTaux[cle] = { base: 0, collectee: 0, baseDeductible: 0, deductible: 0 };
    return detailParTaux[cle];
  };
  collectee.parTaux.forEach(({ taux, base, montant }) => { const l = ligne(taux); l.base += base; l.collectee += montant; });
  deductible.parTaux.forEach(({ taux, base, montant }) => { const l = ligne(taux); l.baseDeductible += base; l.deductible += montant; });

  const tvaNetteAPayer = arrondi(collectee.total - deductible.total);
  return {
    periode: { debut: dateDebut, fin: dateFin },
    tvaCollectee: collectee.total,
    tvaDeductible: deductible.total,
    tvaNetteAPayer,
    isCredit: tvaNetteAPayer < 0,
    detailParTaux,
    nbFactures: facturesEmises(documents, periode).length,
    nbDepenses: deductible.nb,
    depensesSansTva: deductible.sansTva,
  };
};
