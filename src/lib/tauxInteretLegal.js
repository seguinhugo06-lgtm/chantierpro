/**
 * Taux d'intérêt légal des créanciers professionnels, par semestre, et minimum des pénalités de retard qui en découle.
 *
 * Sources (avis juriste du 26 oct. 2026) :
 * - C. com. L441-10 II : le taux des pénalités fixé par les conditions générales ou le contrat ne peut être inférieur à
 *   trois fois le taux d'intérêt légal ; sans clause, taux de la BCE majoré de 10 points ;
 * - service-public.gouv.fr F23211 (vérifiée le 7 août 2026) : minimum de 8,25 % au 2e semestre 2026 ;
 * - arrêté du 26 juin 2026 (JO du 30 juin) : taux légal des professionnels 2,62 % au 1er semestre 2026, 2,75 % au 2e.
 *
 * À mettre à jour à chaque semestre (comme `TAUX_PENALITES_PAR_SEMESTRE`, src/lib/relanceUtils.js). Au-delà du dernier
 * semestre connu, la dernière valeur connue s'applique.
 */
export const TAUX_INTERET_LEGAL_PRO_PAR_SEMESTRE = {
  '2026-1': 2.62,
  '2026-2': 2.75,
};

const SEMESTRES = Object.keys(TAUX_INTERET_LEGAL_PRO_PAR_SEMESTRE).sort();

/** « 2026-2 » pour une date du 2e semestre 2026. */
export function cleSemestre(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${d.getMonth() < 6 ? 1 : 2}`;
}

/** Le semestre connu qui s'applique à la date : le sien, sinon le dernier connu avant elle, sinon le premier connu. */
function semestreApplicable(date) {
  const cle = cleSemestre(date);
  const avant = SEMESTRES.filter((s) => s <= cle);
  return avant.length ? avant[avant.length - 1] : SEMESTRES[0];
}

/** Taux d'intérêt légal des professionnels à la date (en %). */
export function tauxInteretLegal(date = new Date()) {
  return TAUX_INTERET_LEGAL_PRO_PAR_SEMESTRE[semestreApplicable(date)];
}

/** Minimum légal des pénalités de retard à la date (en %, au centième) : trois fois le taux d'intérêt légal. */
export function minimumPenalites(date = new Date()) {
  return Math.round(tauxInteretLegal(date) * 300) / 100;
}

/** « 8,25 % au 2e semestre 2026 » : le minimum et le semestre dont il vient. */
export function libelleMinimumPenalites(date = new Date()) {
  const [annee, s] = semestreApplicable(date).split('-');
  const taux = minimumPenalites(date).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${taux} % au ${s === '1' ? '1er' : '2e'} semestre ${annee}`;
}

/**
 * Le taux de pénalités choisi est-il permis ? Vide (laissé vide : BCE + 10 points), oui ; un nombre, s'il atteint le
 * minimum légal de la date.
 */
export function tauxPenalitesValide(taux, date = new Date()) {
  if (taux === null || taux === undefined || String(taux).trim() === '') return true;
  const n = Number(String(taux).replace(',', '.'));
  if (!Number.isFinite(n)) return false;
  return n >= minimumPenalites(date);
}
