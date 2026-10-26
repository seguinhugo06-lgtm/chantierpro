import { describe, it, expect } from 'vitest';
import { PLANS, PLAN_ORDER } from '../subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement, economieAnnuelle, economieAnnuelleCentimes, moisOfferts, moisOffertsCommuns, periodeAbonne, prixAbonne } from '../prixAbonnement';

// Les espaces de `Intl` (insécable avant « € », fine insécable des milliers) : on compare après normalisation.
const lu = (texte) => texte.replace(/[\s  ]+/g, ' ');

describe('prix d\'un abonnement (D-19 : franchise de TVA)', () => {
  it('la mention est exactement celle de D-19', () => {
    expect(MENTION_TVA_ABONNEMENT).toBe('TVA non applicable, art. 293 B du CGI');
  });

  it('le prix mensuel des plans de PLANS est au format français, avec centimes', () => {
    expect(PLAN_ORDER.map((id) => lu(prixAbonnement(PLANS[id])))).toEqual(['0 €', '9,90 €', '19,90 €']);
    expect(lu(prixAbonnement(PLANS.artisan, 'mois'))).toBe('9,90 €');
  });

  it('le prix annuel suit priceYearly, sans centimes quand il n\'y en a pas', () => {
    expect(lu(prixAbonnement(PLANS.artisan, 'an'))).toBe('99 €');
    expect(lu(prixAbonnement(PLANS.equipe, 'an'))).toBe('199 €');
  });

  it('il suit PLANS : changer le prix change l\'affichage', () => {
    expect(lu(prixAbonnement({ priceMonthly: 12.5, priceYearly: 120 }))).toBe('12,50 €');
    expect(lu(prixAbonnement({ priceMonthly: 12.5, priceYearly: 120 }, 'an'))).toBe('120 €');
  });

  it('un prix absent vaut « 0 € », jamais « NaN » ni « undefined »', () => {
    expect(lu(prixAbonnement({}))).toBe('0 €');
    expect(lu(prixAbonnement({ priceMonthly: 5 }, 'an'))).toBe('0 €');
    expect(lu(prixAbonnement(undefined, 'an'))).toBe('0 €');
  });

  it('ne dit jamais « HT » : le prix seul, la mention est à part', () => {
    expect(prixAbonnement(PLANS.artisan)).not.toMatch(/HT/);
    expect(MENTION_TVA_ABONNEMENT).not.toMatch(/\bHT\b/);
  });
});

// Économie de l'abonnement à l'année : 12 × prix mensuel − prix annuel, calculée depuis PLANS (24 oct. 2026). Avant :
// « Économisez 20 € » (19,80 € arrondi) et « 40 € » (39,80 €), « 17 % » (16,7 %) et « 2 mois offerts » écrits en dur.
describe('économie de l\'abonnement annuel : calculée, jamais arrondie', () => {
  it('Artisan : 19,80 € ; Équipe : 39,80 € (centimes entiers, sans erreur de flottant)', () => {
    expect(economieAnnuelleCentimes(PLANS.artisan)).toBe(1980);
    expect(economieAnnuelleCentimes(PLANS.equipe)).toBe(3980);
    expect(lu(economieAnnuelle(PLANS.artisan))).toBe('19,80 €');
    expect(lu(economieAnnuelle(PLANS.equipe))).toBe('39,80 €');
  });

  it('elle suit PLANS : un autre prix annuel change l\'économie', () => {
    expect(lu(economieAnnuelle({ priceMonthly: 10, priceYearly: 100 }))).toBe('20 €');
    expect(lu(economieAnnuelle({ priceMonthly: 12.5, priceYearly: 120 }))).toBe('30 €');
    expect(lu(economieAnnuelle({ priceMonthly: 9.9, priceYearly: 99.5 }))).toBe('19,30 €');
  });

  it('pas d\'économie affichable : 0 pour le plan Gratuit, un plan sans prix annuel, ou un prix annuel plus cher', () => {
    expect(economieAnnuelleCentimes(PLANS.gratuit)).toBe(0);
    expect(economieAnnuelleCentimes({ priceMonthly: 5 })).toBe(0);
    expect(economieAnnuelleCentimes({ priceMonthly: 5, priceYearly: 70 })).toBe(0);
    expect(economieAnnuelleCentimes(undefined)).toBe(0);
  });

  it('mois offerts : 2 pour Artisan et pour Équipe, 0 sans offre annuelle ; commun aux deux plans payants', () => {
    expect(moisOfferts(PLANS.artisan)).toBe(2);
    expect(moisOfferts(PLANS.equipe)).toBe(2);
    expect(moisOfferts(PLANS.gratuit)).toBe(0);
    expect(moisOffertsCommuns(PLANS)).toBe(2);
    // Le libellé qui ne nomme pas de plan n'existe que si tous offrent autant
    expect(moisOffertsCommuns({ a: { priceMonthly: 10, priceYearly: 100 }, b: { priceMonthly: 10, priceYearly: 90 } })).toBe(0);
    expect(moisOffertsCommuns({})).toBe(0);
  });

  it('l\'économie vaut exactement les mois offerts (aucun « 2 mois offerts » qui arrondirait)', () => {
    for (const id of ['artisan', 'equipe']) {
      expect(economieAnnuelleCentimes(PLANS[id])).toBe(moisOfferts(PLANS[id]) * Math.round(PLANS[id].priceMonthly * 100));
    }
  });
});

// « Mon plan » et l'écran d'abonnement (Task 8, 26 oct. 2026) : l'équivalent mensuel de l'offre annuelle passe par
// prixAbonnement, et un abonné annuel lit son prix annuel, jamais « par mois ».
describe('équivalent mensuel et prix d\'un abonné', () => {
  it('l\'équivalent mensuel de l\'offre annuelle est le prix annuel divisé par 12, au centime', () => {
    expect(lu(prixAbonnement(PLANS.artisan, 'mois-a-l-annee'))).toBe('8,25 €');
    expect(lu(prixAbonnement(PLANS.equipe, 'mois-a-l-annee'))).toBe('16,58 €');
    expect(lu(prixAbonnement(PLANS.gratuit, 'mois-a-l-annee'))).toBe('0 €');
    expect(lu(prixAbonnement({ priceMonthly: 5 }, 'mois-a-l-annee'))).toBe('0 €');
  });

  it('un abonné annuel lit son prix annuel, un abonné mensuel son prix mensuel', () => {
    expect(periodeAbonne({ billing_interval: 'yearly' })).toBe('an');
    expect(periodeAbonne({ billing_interval: 'monthly' })).toBe('mois');
    expect(periodeAbonne(null)).toBe('mois');
    expect(lu(prixAbonne(PLANS.artisan, { billing_interval: 'yearly' }))).toBe('99 € par an');
    expect(lu(prixAbonne(PLANS.artisan, { billing_interval: 'monthly' }))).toBe('9,90 € par mois');
    expect(prixAbonne(PLANS.equipe, { billing_interval: 'yearly' })).not.toMatch(/par mois/);
  });
});
