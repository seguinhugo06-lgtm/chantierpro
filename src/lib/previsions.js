import { SEUIL_PAR_DEFAUT } from './tresorerieReglages';

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
