/**
 * Prix d'un abonnement Mallettico, tel qu'il s'affiche partout (site, « Mon plan », fenêtre d'abonnement, page de
 * paiement réussi, règles) : un seul outil, à côté de `PLANS`.
 *
 * Les abonnements sont en franchise de TVA (décision D-19, docs/decisions.md) : on n'écrit jamais « HT » à côté
 * d'un prix d'abonnement, on écrit la mention `MENTION_TVA_ABONNEMENT`. (Les « HT » des devis et des factures
 * des artisans, eux, sont ceux de leurs documents : ils n'ont rien à voir avec cet outil.)
 * Ce module ne tire rien de lourd (le format des montants de `lib/formatters.js`, sans dépendance) : le site
 * public peut l'importer sans alourdir son premier affichage.
 */
import { formatMoney } from '../lib/formatters';

/** La mention qui accompagne le prix d'un abonnement (D-19). */
export const MENTION_TVA_ABONNEMENT = 'TVA non applicable, art. 293 B du CGI';

/**
 * Le prix d'un plan pour une période, au format français : « 9,90 € » (`'mois'`), « 99 € » (`'an'`), « 0 € » pour le
 * plan Gratuit. Les centimes ne s'affichent que s'il y en a. Un plan sans prix pour cette période vaut « 0 € ».
 * @param {{ priceMonthly?: number, priceYearly?: number }} plan  un plan de `PLANS`
 * @param {'mois' | 'an'} [periode='mois']
 */
export function prixAbonnement(plan, periode = 'mois') {
  const montant = periode === 'an' ? plan?.priceYearly : plan?.priceMonthly;
  return formatMoney(Number.isFinite(montant) ? montant : 0);
}
