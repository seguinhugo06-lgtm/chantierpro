/**
 * Le prix d'une ligne de la bibliothèque des métiers (`trade-library.js`), et le total d'un lot.
 *
 * Ramonage, Froid et climatisation, Multiservice n'ont aucun prix (D-41, 5 nov. 2026) : aucune source n'est tenue pour
 * eux (D-02 : prix de référence réels uniquement), l'artisan saisit les siens. Leurs lignes n'ont pas de `prixUnitaire`.
 * Partout où la bibliothèque est lue (éditeur de devis, explorateur du site), une ligne sans prix s'affiche
 * « Prix à saisir » : jamais « 0 € » présenté comme un tarif, jamais « NaN ». Logique pure, testée dans
 * `src/lib/__tests__/prixBibliotheque.test.js`.
 */

/** Ce que l'écran écrit à la place d'un prix qui n'existe pas. */
export const PRIX_A_SAISIR = 'Prix à saisir';

/** La ligne porte un prix de vente (nombre fini, supérieur à 0) ; sinon l'artisan le saisit. */
export const aUnPrix = (ligne) => Number.isFinite(ligne?.prixUnitaire) && ligne.prixUnitaire > 0;

/**
 * Le total HT d'un lot (quantité × prix unitaire), ou `null` si une de ses lignes n'a pas de prix : un total partiel
 * serait un faux tarif.
 */
export function totalDuLot(lot) {
  const lignes = Array.isArray(lot?.lignes) ? lot.lignes : [];
  if (!lignes.length || !lignes.every(aUnPrix)) return null;
  return lignes.reduce((somme, l) => somme + l.quantite * l.prixUnitaire, 0);
}

/** Aucune ligne (lots et prestations) du métier n'a de prix : le métier est à chiffrer par l'artisan. */
export function metierSansPrix(metier) {
  const lignes = [...(metier?.lots || []).flatMap((l) => l.lignes || []), ...(metier?.prestations || [])];
  return lignes.length > 0 && lignes.every((l) => !aUnPrix(l));
}
