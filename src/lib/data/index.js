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
 * Taux proposé pour un article du référentiel : 0 % en franchise en base (art. 293 B du CGI), le taux imposé par l'article
 * s'il en a un (chaudière gaz ou fioul à 20 %, CGI 279-0 bis, 2 bis, c), sinon 10 %. Rendu en texte (valeur d'un <select>).
 */
export function tvaArticleReferentiel(article, franchiseTva = false) {
  if (franchiseTva) return '0';
  return String(Number.isFinite(article?.tva) ? article.tva : 10);
}

/**
 * Articles à créer par l'import en masse du référentiel (Catalogue, premier usage), pour les métiers cochés. Chaque article
 * porte son taux (tvaArticleReferentiel) : sans lui, la base mettait 20 % à tout (useSupabaseSync) et la démo le taux de
 * l'entreprise. La franchise est appliquée ensuite à la création (Catalogue.creerArticle), par quelque chemin que ce soit.
 */
export function articlesAImporterDuReferentiel(metierIds, franchiseTva = false) {
  const aImporter = [];
  (metierIds || []).forEach((catId) => {
    const cat = ALL_ARTICLES_BTP[catId];
    if (!cat) return;
    const meta = CATEGORIES_METIERS.find((c) => c.id === catId);
    Object.values(cat.sousCategories).forEach((sousCat) => {
      sousCat.articles.forEach((article) => {
        aImporter.push({
          nom: article.nom, prix: article.prixDefaut, prixAchat: null, // le référentiel ne connaît pas votre prix d'achat : inconnu, pas déduit du prix de vente
          unite: article.unite, categorie: meta?.nom || 'Autre', favori: false,
          tva: Number(tvaArticleReferentiel(article, franchiseTva)),
          reference: `REF-${article.id.toUpperCase().slice(0, 10)}`,
        });
      });
    });
  });
  return aImporter;
}

export default {
  ALL_ARTICLES_BTP,
  CATEGORIES_METIERS,
  getAllArticlesByCategorie,
  searchAllArticles,
  getSousCategories,
  getArticlesBySousCategorie,
  tvaArticleReferentiel,
  articlesAImporterDuReferentiel,
};
