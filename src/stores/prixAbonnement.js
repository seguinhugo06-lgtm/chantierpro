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
  const montant = periode === 'an' ? plan?.priceYearly
    // L'équivalent mensuel de l'offre annuelle : le prix annuel divisé par douze, arrondi au centime.
    : periode === 'mois-a-l-annee' ? (Number.isFinite(plan?.priceYearly) ? Math.round(plan.priceYearly * 100 / 12) / 100 : 0)
    : plan?.priceMonthly;
  return formatMoney(Number.isFinite(montant) ? montant : 0);
}

/**
 * La période que paie un abonné : `'an'` si son abonnement est annuel (`subscriptions.billing_interval`, écrit par le
 * webhook Stripe depuis la migration 071), sinon `'mois'`.
 * @param {{ billing_interval?: string } | null | undefined} abonnement
 */
export function periodeAbonne(abonnement) {
  return abonnement?.billing_interval === 'yearly' ? 'an' : 'mois';
}

/**
 * Ce que paie un abonné, avec sa période : « 9,90 € par mois », ou « 99 € par an » pour un abonné annuel (qui ne lit
 * jamais un prix « par mois » qu'il ne paie pas).
 */
export function prixAbonne(plan, abonnement) {
  const periode = periodeAbonne(abonnement);
  return `${prixAbonnement(plan, periode)} par ${periode}`;
}

/**
 * Économie de l'abonnement à l'année, en centimes : douze mensualités moins le prix annuel (19,80 € pour Artisan,
 * 39,80 € pour Équipe). Calculée en centimes, sans flottant ; 0 si le plan n'est pas vendu à l'année ou ne fait pas
 * économiser. Toute économie annuelle affichée vient d'ici, jamais d'un pourcentage ou d'un montant écrit à la main
 * (avant le 24 oct. 2026 : « Économisez 20 € » arrondi, « 17 % » et « 2 mois offerts » écrits en dur).
 * @param {{ priceMonthly?: number, priceYearly?: number }} plan  un plan de `PLANS`
 */
export function economieAnnuelleCentimes(plan) {
  const mois = Math.round(Number(plan?.priceMonthly) * 100);
  const an = Math.round(Number(plan?.priceYearly) * 100);
  if (!(mois > 0) || !(an > 0)) return 0;
  return Math.max(0, mois * 12 - an);
}

/** L'économie annuelle au format français, centimes compris : « 19,80 € » (plan Artisan). */
export function economieAnnuelle(plan) {
  return formatMoney(economieAnnuelleCentimes(plan) / 100);
}

/** Mois offerts par l'abonnement à l'année, par rapport à douze mois payés au mois (0 si le plan n'est pas vendu à l'année). */
export function moisOfferts(plan) {
  const mois = Math.round(Number(plan?.priceMonthly) * 100);
  if (!(mois > 0)) return 0;
  return Math.round(economieAnnuelleCentimes(plan) / mois);
}

/**
 * Nombre de mois offerts commun à tous les plans payants vendus à l'année (2 aujourd'hui), pour un libellé qui ne
 * nomme pas de plan ; 0 si les plans n'offrent pas tous le même nombre de mois.
 * @param {Record<string, { priceMonthly?: number, priceYearly?: number }>} plans  `PLANS`
 */
export function moisOffertsCommuns(plans) {
  const mois = new Set(Object.values(plans || {}).filter((p) => p?.priceMonthly > 0 && p?.priceYearly > 0).map(moisOfferts));
  return mois.size === 1 ? [...mois][0] : 0;
}
