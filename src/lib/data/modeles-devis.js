/**
 * Modèles de Devis Express - Point d'entrée principal
 *
 * Réexporte tous les modèles depuis le répertoire modeles/
 * Total: ~308 modèles répartis sur 29 catégories métier
 * Prix indicatifs marché 2024-2025 France métropolitaine
 */

export {
  MODELES_DEVIS,
  getMetiersWithModeles,
  getModelesByMetier,
  getModele,
  prepareModeleLignes,
  calculateModeleTotal,
  calculateModeleMarge,
  searchModeles,
  getTotalModelesCount,
} from './modeles/index';

export { default } from './modeles/index';

/**
 * Description d'un modèle intégré telle qu'elle s'affiche, par exemple « ~7 lignes | ~1 500 – 3 000 € HT | ~55% marge ».
 * En franchise en base de TVA (art. 293 B du CGI) : sans « HT » (« € », « €/m² »), comme le reste de l'app — règle du
 * projet, avis du 24 oct. 2026 (docs/avis-juriste-2026-10-24-devis.md, Q1) ; écran interne, la description n'est pas
 * recopiée dans le devis (relecture juriste-btp du 3 nov. 2026).
 */
export function descriptionModele(modele, franchise = false) {
  const description = modele?.description || '';
  return franchise ? description.replace(/ HT(?= \|)/, '') : description;
}
