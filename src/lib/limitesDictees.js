/**
 * La ligne des dictées dans les limites des tarifs (tableau et cartes, src/components/landing/comparaisonPlans.js).
 * Décision d'Hugo du 4 nov. 2026 (D-35) : le quota est appliqué par le serveur (voice-intent, migration 107), c'est
 * donc une limite et non une « fonction ». Rien tant que FONCTIONS.ia est éteint (aucune mention de l'IA sur le site).
 * Rangé ici, hors du dossier du site : le test d'honnêteté du site refuse ces mots dans ses fichiers tant qu'ils
 * pourraient s'afficher sans l'interrupteur.
 */
import { FONCTIONS } from './fonctions';

/**
 * « Sans limite » ne s'écrit jamais sans le plafond du jour (C. conso. L121-2, juriste-btp du 4 nov. 2026). Le plafond compte
 * toutes les analyses, échecs compris : « analyses », pas « dictées » (décision d'Hugo du 5 nov. 2026, D-37).
 */
export const DICTEES_SANS_LIMITE = 'Sans limite mensuelle (100 analyses par jour et par personne au plus)';

/**
 * Qui partage le quota du mois : textes de juriste-btp (avis du 4 nov. 2026, C.2), retenus par Hugo le 5 nov. (D-37). Ils
 * suivent les libellés des offres (`featureLabels` de PLANS) moins le mot « dictées », qui est le titre de la ligne ; un test
 * le vérifie. Au plan Gratuit le compteur est celui de l'entreprise ; aux plans payants, celui de l'abonnement.
 */
export const DICTEES_PARTAGE_GRATUIT = ', partagées entre les utilisateurs de l’entreprise';
export const DICTEES_PARTAGE_PAYANT = ' par abonnement, partagées entre ses utilisateurs et ses entreprises';

/** Lignes de limites à ajouter au tableau des tarifs : celle des dictées, quand l'IA est allumée. */
export const LIMITES_IA = FONCTIONS.ia ? [{ cle: 'dictees', libelle: 'Dictées', mot: /dict[ée]es?/i }] : [];

/**
 * La valeur de la ligne des dictées (« 5 par mois, partagées… », « 100 par mois par abonnement, partagées… », ou sans limite
 * mensuelle) ; null pour une autre ligne. Sans le plan, aucun partage n'est annoncé (rien que le nombre).
 * @param {string} cle
 * @param {number} valeur  `limits.dictees` du plan (-1 : sans limite mensuelle)
 * @param {string} [planId]
 */
export function valeurLimiteIa(cle, valeur, planId) {
  if (cle !== 'dictees') return null;
  if (valeur < 0) return DICTEES_SANS_LIMITE;
  const partage = !planId ? '' : planId === 'gratuit' ? DICTEES_PARTAGE_GRATUIT : DICTEES_PARTAGE_PAYANT;
  return `${valeur} par mois${partage}`;
}
