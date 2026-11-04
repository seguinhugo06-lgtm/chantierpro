/**
 * Module sans dépendance : importé par les cartes de rappel (accueil), il ne doit pas tirer les générateurs de documents
 * dans le paquet chargé au démarrage (parcours « site : fonctionnalités en action »).
 */

/**
 * Note (ou annule) un rappel fait : l'écran ne change qu'après l'écriture (relecture locale du 4 nov. 2026, point 8).
 * `ecrire` rend false en cas d'échec (le message d'erreur est déjà affiché) : l'état reste alors celui d'avant.
 * @returns {Promise<boolean>} l'état a été appliqué
 */
export async function noterRappel(ecrire, appliquer) {
  const ok = await ecrire();
  if (ok === false) return false;
  appliquer();
  return true;
}
