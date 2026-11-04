import { SEUIL_PAR_DEFAUT } from './tresorerieReglages';
import { dateLocale } from './paiementsFacture';

/**
 * Prévisions de trésorerie : le statut enregistré n'a que deux valeurs, 'prevu' et 'paye'.
 *
 * Jusqu'au 9 oct. 2026, modifier une prévision depuis la liste enregistrait le libellé affiché
 * (« Prévu », « En retard », « Payé ») : la prévision sortait alors des projections (elles ne
 * comptent que 'prevu') ou redevenait « à payer ». Toute lecture et toute écriture passent ici.
 *
 * @param {string} [statut]
 * @returns {'prevu'|'paye'}
 */
export function statutPrevision(statut) {
  return statut === 'paye' || statut === 'Payé' ? 'paye' : 'prevu';
}

/** Sources des prévisions créées automatiquement à partir d'un document de l'app. */
const SOURCES_MIROIR = ['auto_facture', 'auto_devis_accepte', 'auto_depense'];

/**
 * Prévision « miroir » : copie automatique d'une facture, d'un devis signé ou d'une dépense, que la
 * trésorerie compte déjà depuis le document lui-même. La compter aussi doublait les montants.
 */
export function estPrevisionMiroir(prevision) {
  return SOURCES_MIROIR.includes(prevision?.source) && Boolean(prevision?.linkedId);
}

/** La prévision avec son statut ramené à 'prevu' ou 'paye'. */
export function normaliserPrevision(prevision) {
  const statut = statutPrevision(prevision?.statut);
  return prevision?.statut === statut ? prevision : { ...prevision, statut };
}

/**
 * Seuil d'alerte de la trésorerie réglé par l'artisan, ou `null` s'il ne l'a jamais réglé (audit UX du 20 oct. 2026, P1 :
 * « en dessous du seuil d'alerte (5 000 €) », un seuil que l'artisan n'avait jamais choisi). 5 000 € est la valeur par
 * défaut enregistrée (useTresorerie, colonne de la base) : elle compte comme « non réglé », sans migration. 0 ou vide : pas
 * de seuil.
 */
export { SEUIL_PAR_DEFAUT };
export function seuilAlerteRegle(reglages) {
  const n = Number(reglages?.seuilAlerte);
  if (!Number.isFinite(n) || n <= 0 || n === SEUIL_PAR_DEFAUT) return null;
  return n;
}

/**
 * Mois où la projection de trésorerie compte une prévision non réglée ({ month, year }), ou `null` sans date lisible.
 *
 * La projection part du solde d'aujourd'hui (prévisions réglées seulement) et commence au mois prochain. Jusqu'au
 * 3 nov. 2026, une prévision non réglée du mois en cours ou en retard n'était comptée nulle part : un règlement client
 * attendu le 26 disparaissait des projections le 3, et un « solde estimé négatif » apparaissait, alors que le même
 * règlement, attendu le 13 du mois suivant, était compté. Comme les factures ouvertes (« en retard : le mois
 * prochain »), elle est comptée au premier mois projeté.
 *
 * @param {{ date?: string }} prevision
 * @param {Date} maintenant
 */
export function moisProjetePrevision(prevision, maintenant) {
  const d = prevision?.date ? dateLocale(prevision.date) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const premier = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
  const retenu = d >= premier ? d : premier;
  return { month: retenu.getMonth(), year: retenu.getFullYear() };
}

/**
 * Première échéance d'une charge récurrente ajoutée depuis les charges types du BTP (le 5 du mois) : le 5 de ce mois
 * s'il n'est pas passé, sinon le 5 du mois prochain. Datée au 5 déjà passé, elle était une prévision « en retard » que
 * la projection compte au premier mois, en plus de l'échéance générée pour ce mois-là : la charge de ce mois, déjà
 * payée et donc dans le solde de départ, était comptée une seconde fois.
 *
 * @param {Date} maintenant
 * @param {number} [jour=5]
 * @returns {Date}
 */
export function premiereEcheanceCharge(maintenant, jour = 5) {
  const ceMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), jour);
  return maintenant.getDate() <= jour ? ceMois : new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, jour);
}
