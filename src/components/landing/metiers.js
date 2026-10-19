/**
 * L'explorateur « Votre métier est déjà chiffré » du site — logique pure (sans React), testée dans
 * `__tests__/metiers.test.js`. L'affichage est dans `MetiersSection.jsx`.
 *
 * Tout vient de la bibliothèque des métiers (`src/lib/templates/trade-library.js`) : les métiers dans son ordre,
 * les trois premiers lots types de chacun, leurs totaux HT calculés ici. Aucun prix n'est recopié dans le site.
 */

/** Le métier choisi à l'arrivée (spec : « Électricité choisi d'abord »). */
export const METIER_INITIAL = 'electricite';

const NB_LOTS = 3;
const NB_LIGNES = 3;

/** Arrondi à l'euro, sans l'erreur du binaire (1,0045 × 1 000 = 1 004,4999… en flottant). */
function aLEuro(montant) {
  return Math.round(Number(montant.toPrecision(12)));
}

/** `[{ id, nom }]` des métiers, dans l'ordre de la bibliothèque. */
export function metiersDeLaBibliotheque(bibliotheque) {
  return Object.values(bibliotheque || {}).map((m) => ({ id: m.id, nom: m.nom }));
}

/**
 * Ce que montre la carte d'un lot type : nom, résumé, nombre de lignes, total HT (somme des quantité × prix
 * unitaire, arrondie à l'euro) et ses trois premières lignes avec leur montant HT arrondi à l'euro.
 */
export function apercuDuLot(lot) {
  const total = lot.lignes.reduce((somme, l) => somme + l.quantite * l.prixUnitaire, 0);
  return {
    id: lot.id,
    nom: lot.nom,
    resume: lot.resume || '',
    nbLignes: lot.lignes.length,
    totalHT: aLEuro(total),
    lignes: lot.lignes.slice(0, NB_LIGNES).map((l) => ({ designation: l.designation, montant: aLEuro(l.quantite * l.prixUnitaire) })),
  };
}

/** Les trois premiers lots types du métier `id` (vide si le métier n'existe pas). */
export function lotsMontres(bibliotheque, id) {
  const metier = bibliotheque?.[id];
  return metier?.lots ? metier.lots.slice(0, NB_LOTS).map(apercuDuLot) : [];
}

/**
 * Le métier visé par une touche depuis `actuel` : flèche droite le suivant, flèche gauche le précédent (en boucle),
 * Début le premier, Fin le dernier ; `null` pour toute autre touche (elle garde son rôle habituel).
 */
export function metierVoisin(ids, actuel, touche) {
  const i = ids.indexOf(actuel);
  if (i < 0 || !ids.length) return null;
  if (touche === 'ArrowRight') return ids[(i + 1) % ids.length];
  if (touche === 'ArrowLeft') return ids[(i - 1 + ids.length) % ids.length];
  if (touche === 'Home') return ids[0];
  if (touche === 'End') return ids[ids.length - 1];
  return null;
}
