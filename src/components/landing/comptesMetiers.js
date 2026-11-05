/**
 * Les comptes de métiers que le site écrit, et la phrase sur les prix de la bibliothèque (explorateur « Votre métier »,
 * FAQ, pages de fonctionnalités, bande de faits).
 *
 * D'où ils viennent (règle `.claude/rules/marketing.md`) : la bibliothèque des métiers (`src/lib/templates/trade-library.js`),
 * comptée le 5 nov. 2026 : 20 métiers, dont 17 ont des prix indicatifs ; Ramonage, Froid et climatisation et Multiservice
 * n'en ont aucun (D-41, 5 nov. 2026 : aucune source, l'artisan saisit les siens ; `src/lib/templates/prixBibliotheque.js`).
 * Le site ne dit donc plus « chiffré » ni « prix indicatifs » de tous les métiers.
 *
 * Pourquoi des constantes et pas un calcul : la bibliothèque pèse 149 Ko et le site la charge à la demande
 * (`site/bibliotheque.js`) ; l'importer ici l'ajouterait au premier écran. `__tests__/comptesMetiers.test.js` compare ces
 * valeurs à la bibliothèque : un métier ajouté, retiré ou chiffré fait échouer le test, qui impose de corriger les textes.
 */

/** Les métiers de la bibliothèque. */
export const NB_METIERS = 20;
/** Ceux dont les lots types portent des prix indicatifs. */
export const NB_METIERS_AVEC_PRIX = 17;
/** Les trois sans prix, par leur nom court (le premier segment du nom dans la bibliothèque : « Multiservice, petits travaux »). */
export const METIERS_SANS_PRIX = ['Ramonage', 'Froid et climatisation', 'Multiservice'];

const listeAvecEt = (noms) => `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;

/**
 * « 17 avec des prix indicatifs ; pour Ramonage, Froid et climatisation et Multiservice, vous saisissez vos prix »
 * (espace fine insécable avant le point-virgule : règle typographique du site).
 */
export const PHRASE_PRIX = `${NB_METIERS_AVEC_PRIX} avec des prix indicatifs\u202f; pour ${listeAvecEt(METIERS_SANS_PRIX)}, vous saisissez vos prix`;
