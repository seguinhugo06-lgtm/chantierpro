/**
 * La bibliothèque des métiers (`src/lib/templates/trade-library.js`, 149 Ko) pour le site public.
 *
 * Chargée à la demande (`import()`, fichier à part dans le build), une seule fois pour toute la page : le devis
 * vivant du premier écran, l'explorateur des métiers et les exemples de « Les fonctionnalités en action » partagent
 * la même promesse (`chargerUneFois`). Aucun prix n'est recopié dans le site. Un échec (déploiement remplacé, réseau
 * coupé) n'est pas gardé en mémoire : l'appel suivant retente le chargement.
 */
import { chargerUneFois } from './chargerUneFois';

export const chargerBibliotheque = chargerUneFois(
  () => import('../../../lib/templates/trade-library.js').then((module) => module.TRADE_LIBRARY),
);

export default chargerBibliotheque;
