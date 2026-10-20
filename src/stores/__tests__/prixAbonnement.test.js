import { describe, it, expect } from 'vitest';
import { PLANS, PLAN_ORDER } from '../subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../prixAbonnement';

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
