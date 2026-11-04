/**
 * La ligne des dictées dans les limites des tarifs (tableau et cartes, src/components/landing/comparaisonPlans.js).
 * Décision d'Hugo du 4 nov. 2026 (D-32) : le quota est appliqué par le serveur (voice-intent, migration 107), c'est
 * donc une limite et non une « fonction ». Rien tant que FONCTIONS.ia est éteint (aucune mention de l'IA sur le site).
 * Rangé ici, hors du dossier du site : le test d'honnêteté du site refuse ces mots dans ses fichiers tant qu'ils
 * pourraient s'afficher sans l'interrupteur.
 */
import { FONCTIONS } from './fonctions';

/** « Sans limite » ne s'écrit jamais sans le plafond du jour (C. conso. L121-2, juriste-btp du 4 nov. 2026). */
export const DICTEES_SANS_LIMITE = 'Sans limite mensuelle (100 par jour et par personne au plus)';

/** Lignes de limites à ajouter au tableau des tarifs : celle des dictées, quand l'IA est allumée. */
export const LIMITES_IA = FONCTIONS.ia ? [{ cle: 'dictees', libelle: 'Dictées', mot: /dict[ée]es?/i }] : [];

/** La valeur de la ligne des dictées (« 5 par mois », « 100 par mois », ou sans limite mensuelle) ; null pour une autre ligne. */
export function valeurLimiteIa(cle, valeur) {
  if (cle !== 'dictees') return null;
  return valeur < 0 ? DICTEES_SANS_LIMITE : `${valeur} par mois`;
}
