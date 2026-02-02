/**
 * Index - Combine tous les articles BTP et expose les fonctions utilitaires
 */

import { ARTICLES_BTP, CATEGORIES_METIERS, getArticlesByCategorie, searchArticles } from './articles-btp';
import { ARTICLES_BTP_SUITE } from './articles-btp-suite';
import { ARTICLES_BTP_FIN } from './articles-btp-fin';

// Combine tous les articles dans un seul objet
export const ALL_ARTICLES_BTP = {
  ...ARTICLES_BTP,
  ...ARTICLES_BTP_SUITE,
  ...ARTICLES_BTP_FIN,
};

// Réexporter les catégories et fonctions utilitaires
export { CATEGORIES_METIERS, getArticlesByCategorie, searchArticles };

/**
 * Récupérer tous les articles d'une catégorie (toutes sources)
 */
export function getAllArticlesByCategorie(categorieId) {
  const categorie = ALL_ARTICLES_BTP[categorieId];
  if (!categorie) return [];

  const articles = [];
  Object.entries(categorie.sousCategories).forEach(([sousCatId, sousCat]) => {
    sousCat.articles.forEach(article => {
      articles.push({
        ...article,
        categorieId,
        sousCategorieId: sousCatId,
        sousCategorieNom: sousCat.nom,
      });
    });
  });
  return articles;
}

/**
 * Rechercher des articles dans toutes les catégories
 */
export function searchAllArticles(query, categorieId = null) {
  const results = [];
  const searchLower = query.toLowerCase();

  const categories = categorieId ? { [categorieId]: ALL_ARTICLES_BTP[categorieId] } : ALL_ARTICLES_BTP;

  Object.entries(categories).forEach(([catId, categorie]) => {
    if (!categorie) return;
    Object.entries(categorie.sousCategories).forEach(([sousCatId, sousCat]) => {
      sousCat.articles.forEach(article => {
        if (article.nom.toLowerCase().includes(searchLower)) {
          results.push({
            ...article,
            categorieId: catId,
            sousCategorieId: sousCatId,
            sousCategorieNom: sousCat.nom,
            categorieNom: categorie.nom,
          });
        }
      });
    });
  });

  return results;
}

/**
 * Obtenir les sous-catégories d'une catégorie
 */
export function getSousCategories(categorieId) {
  const categorie = ALL_ARTICLES_BTP[categorieId];
  if (!categorie) return [];

  return Object.entries(categorie.sousCategories).map(([id, sousCat]) => ({
    id,
    nom: sousCat.nom,
    articlesCount: sousCat.articles.length,
  }));
}

/**
 * Obtenir les articles d'une sous-catégorie
 */
export function getArticlesBySousCategorie(categorieId, sousCategorieId) {
  const categorie = ALL_ARTICLES_BTP[categorieId];
  if (!categorie) return [];

  const sousCat = categorie.sousCategories[sousCategorieId];
  if (!sousCat) return [];

  return sousCat.articles.map(article => ({
    ...article,
    categorieId,
    sousCategorieId,
    sousCategorieNom: sousCat.nom,
  }));
}

/**
 * Créer un article catalogue à partir d'un article BTP
 */
export function createCatalogueItem(articleBtp, customPrix = null) {
  return {
    id: crypto.randomUUID(),
    reference: `REF-${articleBtp.id.toUpperCase()}`,
    nom: articleBtp.nom,
    designation: articleBtp.nom,
    description: '',
    unite: articleBtp.unite,
    prixUnitaire: customPrix || articleBtp.prixDefaut,
    prix_unitaire_ht: customPrix || articleBtp.prixDefaut,
    prixAchat: Math.round((customPrix || articleBtp.prixDefaut) * 0.6), // 40% de marge par défaut
    tva: 10,
    categorie: articleBtp.categorieNom || articleBtp.categorieId,
    favori: false,
    actif: true,
    sourceId: articleBtp.id,
    prixMin: articleBtp.prixMin,
    prixMax: articleBtp.prixMax,
  };
}

export default {
  ALL_ARTICLES_BTP,
  CATEGORIES_METIERS,
  getAllArticlesByCategorie,
  searchAllArticles,
  getSousCategories,
  getArticlesBySousCategorie,
  createCatalogueItem,
};
