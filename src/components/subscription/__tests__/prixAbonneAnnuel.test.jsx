import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../../stores/prixAbonnement';
import { PLANS } from '../../../stores/subscriptionStore';
import BillingDashboard from '../BillingDashboard';

// Abonné Artisan à l'année (`billing_interval` écrit par le webhook Stripe, migration 071).
vi.mock('../../../stores/subscriptionStore', async (importOriginal) => {
  const reel = await importOriginal();
  const etat = { planId: 'artisan', usage: {}, subscription: { plan: 'artisan', status: 'active', billing_interval: 'yearly' }, openUpgradeModal() {}, setSubscription() {} };
  return { ...reel, useSubscriptionStore: (selecteur) => selecteur(etat) };
});

const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s  ]+/g, ' ');

// Task 8 (26 oct. 2026) : un abonné annuel lisait « 9,90 € par mois » sur l'écran Facturation, un prix qu'il ne paie pas.
describe('écran Facturation : un abonné annuel lit son prix annuel', () => {
  const texte = lu(renderToStaticMarkup(<BillingDashboard isDark={false} couleur="#12336F" />));

  it('son plan : le prix annuel de PLANS, « par an », avec la mention D-19', () => {
    expect(texte).toContain(lu(`${prixAbonnement(PLANS.artisan, 'an')} par an, ${MENTION_TVA_ABONNEMENT}`));
  });

  it('jamais « par mois » sur la ligne de son plan', () => {
    expect(texte).not.toContain(lu(`${prixAbonnement(PLANS.artisan)} par mois, ${MENTION_TVA_ABONNEMENT}`));
  });
});
