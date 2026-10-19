/**
 * La bibliothèque des métiers (`src/lib/templates/trade-library.js`, 149 Ko) pour le site public.
 *
 * Chargée à la demande (`import()`, fichier à part dans le build), une seule fois pour toute la page : le devis
 * vivant du premier écran et l'explorateur des métiers partagent la même promesse. Aucun prix n'est recopié
 * dans le site. Un échec (déploiement remplacé, réseau coupé) n'est pas gardé en mémoire : l'appel suivant
 * retente le chargement.
 */
let chargement = null;

export function chargerBibliotheque() {
  if (!chargement) {
    chargement = import('../../../lib/templates/trade-library.js')
      .then((module) => module.TRADE_LIBRARY)
      .catch((erreur) => {
        chargement = null;
        throw erreur;
      });
  }
  return chargement;
}

export default chargerBibliotheque;
