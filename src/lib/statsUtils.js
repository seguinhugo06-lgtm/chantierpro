/**
 * Shared statistics utilities — Single source of truth for KPI calculations
 */

/**
 * Statuts considérés comme "signés/acceptés" (numérateur du taux de conversion)
 * Un devis est "converti" dès qu'il est accepté, signé, facturé ou payé.
 */
export const CONVERTED_STATUTS = ['accepte', 'signe', 'acompte_facture', 'facture', 'payee', 'paye'];

/**
 * Statuts considérés comme "envoyés" (dénominateur du taux de conversion)
 * Tous les devis qui ont quitté le stade brouillon, y compris les refusés.
 * Exclut : brouillon (pas encore envoyé)
 */
export const SENT_STATUTS = ['envoye', 'vu', 'accepte', 'signe', 'refuse', 'acompte_facture', 'facture', 'payee', 'paye'];

/**
 * Calcule le taux de conversion des devis.
 *
 * Formule : devis convertis / devis envoyés × 100
 * - Convertis = accepte, signe, acompte_facture, facture, payee
 * - Envoyés = tous sauf brouillon (envoye, vu, accepte, signe, refuse, acompte_facture, facture, payee)
 * - Brouillons exclus du calcul
 *
 * @param {Array} devisList - Liste de devis (type === 'devis' uniquement)
 * @returns {{ taux: number, signes: number, envoyes: number }}
 */
export function calcConversion(devisList) {
  const devisOnly = devisList.filter(d => d.type === 'devis' || !d.type);
  const envoyes = devisOnly.filter(d => SENT_STATUTS.includes(d.statut));
  const signes = devisOnly.filter(d => CONVERTED_STATUTS.includes(d.statut));
  const taux = envoyes.length > 0 ? (signes.length / envoyes.length) * 100 : 0;
  return { taux, signes: signes.length, envoyes: envoyes.length };
}

/**
 * Formate un taux de conversion pour affichage cohérent.
 * Convention : toujours 1 décimale (ex: "54.5%"), "—" si non calculable.
 *
 * @param {number|null} taux - Le taux brut (0-100), null si non calculable
 * @returns {string} Taux formaté (ex: "54.5%") ou "—"
 */
export function formatConversion(taux) {
  if (taux == null || taux < 0) return '—';
  return `${taux.toFixed(1)}%`;
}
