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
 * Taux que transmet un article du référentiel, ou null s'il n'en porte aucun : 0 % en franchise en base (art. 293 B du CGI),
 * sinon le taux que porte l'article (seules les chaudières gaz et fioul en portent un : 20 %, CGI 279-0 bis, 2 bis, c).
 * Aucun taux n'est inventé ici : sans taux propre, l'import laisse l'écriture en base poser son défaut (useSupabaseSync) et
 * le sélecteur (ArticlePicker) propose le sien, modifiable.
 */
export function tauxPropreArticle(article, franchiseTva = false) {
  if (franchiseTva) return 0;
  return Number.isFinite(article?.tva) ? article.tva : null;
}

/**
 * Articles à créer par l'import en masse du référentiel (Catalogue, premier usage), pour les métiers cochés. Seul un article
 * qui porte un taux le transmet (tauxPropreArticle). Les autres partent sans taux, comme avant le 4 nov. 2026 : l'écriture
 * en base leur met son défaut (useSupabaseSync). Leur imposer 10 % mettait les 9 articles « Espaces verts » du paysagisme à
 * 10 %, que la recherche donne à 20 % (docs/metiers/paysagiste.md § 5). La franchise est appliquée ensuite à la création
 * (Catalogue.creerArticle), par quelque chemin que ce soit.
 */
export function articlesAImporterDuReferentiel(metierIds, franchiseTva = false) {
  const aImporter = [];
  (metierIds || []).forEach((catId) => {
    const cat = ALL_ARTICLES_BTP[catId];
    if (!cat) return;
    const meta = CATEGORIES_METIERS.find((c) => c.id === catId);
    Object.values(cat.sousCategories).forEach((sousCat) => {
      sousCat.articles.forEach((article) => {
        const taux = tauxPropreArticle(article, franchiseTva);
        aImporter.push({
          nom: article.nom, prix: article.prixDefaut, prixAchat: null, // le référentiel ne connaît pas votre prix d'achat : inconnu, pas déduit du prix de vente
          unite: article.unite, categorie: meta?.nom || 'Autre', favori: false,
          ...(taux === null ? {} : { tva: taux }),
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
  tauxPropreArticle,
  articlesAImporterDuReferentiel,
};
