import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MENTION_TVA_ABONNEMENT, prixAbonnement, economieAnnuelle } from '../../../stores/prixAbonnement';
import { PLANS } from '../../../stores/subscriptionStore';
import PlanPage from '../PlanPage';

// Rendu côté serveur avec un état d'abonnement fixé par chaque test ; le reste du magasin (PLANS) est le vrai.
const etat = vi.hoisted(() => ({ courant: null }));
vi.mock('../../../stores/subscriptionStore', async (importOriginal) => {
  const reel = await importOriginal();
  return { ...reel, useSubscriptionStore: (selecteur) => selecteur(etat.courant) };
});
vi.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => ({ canAccessBilling: true }) }));
vi.mock('../../../context/AppContext', () => ({ useConfirm: () => ({ confirm: async () => false }) }));

const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s  ]+/g, ' ');
const rendre = (abonnement) => {
  etat.courant = { planId: 'artisan', usage: {}, subscription: abonnement, openUpgradeModal() {}, setSubscription() {} };
  return lu(renderToStaticMarkup(<PlanPage isDark={false} couleur="#12336F" setPage={() => {}} />));
};

// Les prix de « Mon plan » viennent de l'outil commun (prixAbonnement) et disent la franchise de TVA (D-19) : jamais
// « €/mois » nu ni « HT ». (Ces contrôles portaient avant sur l'écran Facturation et sur la page des tarifs, retirés
// le 28 oct. 2026 : leurs adresses redirigent vers « Mon plan ».)
describe('Mon plan : prix en franchise de TVA', () => {
  const texte = rendre(null);

  it('le plan en cours et les plans payants : prix de prixAbonnement et mention D-19', () => {
    expect(texte).toContain(lu(`${prixAbonnement(PLANS.artisan)} par mois, ${MENTION_TVA_ABONNEMENT}`));
    expect(texte).toContain(lu(`${prixAbonnement(PLANS.equipe)} par mois`));
  });

  it('ni « €/mois » nu, ni « HT »', () => {
    expect(texte).not.toMatch(/€\/mois/);
    expect(texte).not.toMatch(/\bHT\b/);
  });
});

// Abonné Artisan à l'année (`billing_interval` écrit par le webhook Stripe, migration 071).
describe('Mon plan : un abonné annuel lit son prix annuel', () => {
  const texte = rendre({ plan: 'artisan', status: 'active', billing_interval: 'yearly' });

  it('son plan : le prix annuel de PLANS, « par an », avec la mention D-19', () => {
    expect(texte).toContain(lu(`${prixAbonnement(PLANS.artisan, 'an')} par an, ${MENTION_TVA_ABONNEMENT}`));
  });

  it('jamais « par mois » sur la ligne de son plan', () => {
    expect(texte).not.toContain(lu(`${prixAbonnement(PLANS.artisan)} par mois, ${MENTION_TVA_ABONNEMENT}`));
  });
});

// Toute économie annuelle affichée est calculée depuis PLANS (12 × prix mensuel − prix annuel), au centime : 19,80 € et
// 39,80 €. Avant le 24 oct. 2026 : « économisez 17% » (16,7 % en réalité), « Economisez 20 € » arrondi.
describe('Mon plan : économie annuelle calculée', () => {
  const texte = rendre({ plan: 'artisan', status: 'active', billing_interval: 'yearly' });

  it('chaque plan payant dit l\'économie exacte de l\'offre annuelle, au centime', () => {
    expect(texte).toContain(lu(`Économisez ${economieAnnuelle(PLANS.artisan)} par an`));
    expect(texte).toContain(lu(`Économisez ${economieAnnuelle(PLANS.equipe)} par an`));
    expect(texte).toContain('Économisez 19,80 € par an');
    expect(texte).toContain('Économisez 39,80 € par an');
  });

  it('plus de pourcentage d\'économie écrit à la main', () => {
    expect(texte).not.toMatch(/17\s?%/);
    expect(texte).not.toMatch(/conomisez 20 €|conomisez 40 €/);
  });
});
