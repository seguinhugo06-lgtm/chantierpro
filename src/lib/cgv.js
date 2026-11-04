/**
 * Conditions générales de vente de Mallettico : version en vigueur et texte figé de l'article 4 (plans tarifaires).
 *
 * Avant (relecture juridique du 20 oct. 2026), l'article 4 se recalculait depuis `PLANS`
 * (src/stores/subscriptionStore.js) : changer un prix, une limite ou un libellé de plan modifiait le contrat en
 * silence, sans nouvelle version ni préavis. Désormais le texte de l'article 4 est écrit ici, pour une version donnée ;
 * un test (src/lib/__tests__/cgv.test.js) le reconstruit depuis `PLANS` et échoue s'il diffère. Changer `PLANS` oblige
 * donc à décider : mettre à jour ce texte ET `CGV_VERSION`, avec le préavis de 30 jours de l'article « Modification des
 * conditions » (src/components/LegalPages.jsx), ou revenir en arrière.
 *
 * Ce module n'importe que l'interrupteur des fonctions : la page des CGV (chargée à part, y compris à l'adresse publique
 * /cgv) n'embarque pas `PLANS` pour afficher un texte figé.
 *
 * 4 nov. 2026 (allumage de la dictée, décision d'Hugo) : quand FONCTIONS.ia est allumé, chaque plan porte son quota de
 * dictées (5 / 100 / sans limite mensuelle, 100 par jour et par personne au plus) : l'article 4 et la version changent
 * d'eux-mêmes. LE JOUR DE LA LIVRAISON, remplacer « 2026-11-03 » (valeur d'attente, signalée par cgvVersion.test.jsx)
 * par la date réelle, la même que CGU_VERSION (src/lib/cgu.js).
 */
import { FONCTIONS } from './fonctions';

/** Version des CGV en vigueur (date d'effet, AAAA-MM-JJ). À changer avec tout changement du texte, article 4 compris. */
export const CGV_VERSION = FONCTIONS.ia ? '2026-11-03' : '2026-10-24';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * « Version du 24 octobre 2026 » pour une version AAAA-MM-JJ. Calculé depuis la chaîne, sans `Date` : le libellé ne
 * dépend ni de l'horloge ni du fuseau de l'appareil (avant : « Dernière mise à jour » portait la date du jour).
 * @param {string} [version]
 */
export function libelleVersionCgv(version = CGV_VERSION) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(version));
  if (!m) throw new Error(`Version de CGV illisible : ${version}`);
  const jour = Number(m[3]);
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois || jour < 1 || jour > 31) throw new Error(`Version de CGV illisible : ${version}`);
  return `Version du ${jour === 1 ? '1er' : jour} ${mois} ${m[1]}`;
}

/**
 * Article 4, version 2026-10-24 : une ligne par plan (nom, prix, description), telle qu'elle était générée depuis
 * `PLANS` ce jour-là. Les espaces avant « € » sont insécables ( ), comme dans `prixAbonnement`.
 */
const ARTICLE_4_SANS_IA = Object.freeze([
  Object.freeze({
    plan: 'Gratuit',
    prix: '0 € par mois',
    description: 'Pour découvrir Mallettico. 5 devis par mois · Factures sans limite · 10 clients · 2 chantiers · 50 photos de chantier · Vous + 1 collaborateur · Signature en ligne des devis · Relances automatiques · Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées.',
  }),
  Object.freeze({
    plan: 'Artisan',
    prix: '9,90 € par mois (ou 99 € par an) — tarif fondateur, conservé tant que l\'abonnement reste actif',
    description: 'L\'essentiel pour un artisan autonome. Tout le plan Gratuit, sans limite · Devis, clients, chantiers et photos illimités · Vous + 1 collaborateur.',
  }),
  Object.freeze({
    plan: 'Équipe',
    prix: '19,90 € par mois (ou 199 € par an) — tarif fondateur, conservé tant que l\'abonnement reste actif',
    description: 'Pour les entreprises avec collaborateurs. Tout le plan Artisan · Vous + 10 collaborateurs, chacun avec son rôle.',
  }),
]);

/** Article 4 avec la dictée (FONCTIONS.ia allumé) : les mêmes lignes, plus le quota de dictées de chaque plan. */
const ARTICLE_4_AVEC_IA = Object.freeze([
  Object.freeze({
    plan: 'Gratuit',
    prix: ARTICLE_4_SANS_IA[0].prix,
    description: 'Pour découvrir Mallettico. 5 devis par mois · Factures sans limite · 10 clients · 2 chantiers · 50 photos de chantier · 5 dictées par mois · Vous + 1 collaborateur · Signature en ligne des devis · Relances automatiques · Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées.',
  }),
  Object.freeze({
    plan: 'Artisan',
    prix: ARTICLE_4_SANS_IA[1].prix,
    description: 'L\'essentiel pour un artisan autonome. Tout le plan Gratuit · Devis, clients, chantiers et photos illimités · 100 dictées par mois · Vous + 1 collaborateur.',
  }),
  Object.freeze({
    plan: 'Équipe',
    prix: ARTICLE_4_SANS_IA[2].prix,
    description: 'Pour les entreprises avec collaborateurs. Tout le plan Artisan · Vous + 10 collaborateurs, chacun avec son rôle · Dictées sans limite mensuelle (100 par jour et par personne au plus).',
  }),
]);

/** Article 4 de la version en vigueur. */
export const CGV_ARTICLE_4_PLANS = FONCTIONS.ia ? ARTICLE_4_AVEC_IA : ARTICLE_4_SANS_IA;
/** Les deux textes, pour les tests (le build livré n'en montre qu'un). */
export const CGV_ARTICLE_4_SELON_IA = Object.freeze({ sansIa: ARTICLE_4_SANS_IA, avecIa: ARTICLE_4_AVEC_IA });

/** Phrase de l'article 4 qui suit le tableau des plans (la mention de franchise de TVA est celle de `MENTION_TVA_ABONNEMENT`). */
export const CGV_ARTICLE_4_TVA = 'Les prix sont indiqués en euros, sans TVA : TVA non applicable, art. 293 B du CGI.';
