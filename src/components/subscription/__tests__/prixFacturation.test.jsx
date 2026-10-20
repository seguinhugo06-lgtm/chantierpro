import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../../stores/prixAbonnement';
import { PLANS } from '../../../stores/subscriptionStore';
import BillingDashboard from '../BillingDashboard';

// Rendu côté serveur avec un état fixe (abonné Artisan) ; le reste du magasin (PLANS) est le vrai.
vi.mock('../../../stores/subscriptionStore', async (importOriginal) => {
  const reel = await importOriginal();
  const etat = { planId: 'artisan', usage: {}, subscription: null, openUpgradeModal() {}, setSubscription() {} };
  return { ...reel, useSubscriptionStore: (selecteur) => selecteur(etat) };
});

// L'écran « Facturation » (ouvert depuis le paiement réussi) dit les prix comme « Mon plan » : par l'outil commun, avec
// la mention de franchise de TVA (D-19), jamais « €/mois » nu ni « HT ».
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s  ]+/g, ' ');

describe('écran Facturation : prix en franchise de TVA', () => {
  const texte = lu(renderToStaticMarkup(<BillingDashboard isDark={false} couleur="#12336F" />));

  it('le plan en cours et les plans payants : prix de prixAbonnement et mention D-19', () => {
    expect(texte).toContain(lu(`${prixAbonnement(PLANS.artisan)} par mois, ${MENTION_TVA_ABONNEMENT}`));
    expect(texte).toContain(lu(`${prixAbonnement(PLANS.equipe)} par mois`));
  });

  it('ni « €/mois » nu, ni « HT »', () => {
    expect(texte).not.toMatch(/€\/mois/);
    expect(texte).not.toMatch(/\bHT\b/);
  });
});
