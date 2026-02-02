/**
 * Modèles de Devis Express - Point d'entrée principal
 *
 * Réexporte tous les modèles depuis le répertoire modeles/
 * Total: ~230 modèles répartis sur 17 catégories métier
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
