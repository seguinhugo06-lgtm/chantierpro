import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PLANS } from '../../../stores/subscriptionStore';
import { economieAnnuelle } from '../../../stores/prixAbonnement';
import PricingPage from '../PricingPage';

// Rendu côté serveur avec un état fixe (plan Gratuit) ; le reste du magasin (PLANS) est le vrai.
vi.mock('../../../stores/subscriptionStore', async (importOriginal) => {
  const reel = await importOriginal();
  const etat = { planId: 'gratuit', setSubscription() {} };
  return { ...reel, useSubscriptionStore: (selecteur) => selecteur(etat) };
});

// Toute économie annuelle affichée est calculée depuis PLANS (12 × prix mensuel − prix annuel), au centime : 19,80 € et
// 39,80 €. Avant le 24 oct. 2026 : « économisez 17% » (16,7 % en réalité), « Economisez 20 € » arrondi, « Pour toujours »
// sur le plan Gratuit (une promesse de durée que le contrat ne tient pas).
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s  ]+/g, ' ');

describe('page des tarifs : économie annuelle calculée, durée du plan Gratuit', () => {
  const texte = lu(renderToStaticMarkup(<PricingPage isDark={false} couleur="#12336F" setPage={() => {}} />));

  it('chaque plan payant dit l\'économie exacte de l\'offre annuelle, au centime', () => {
    expect(texte).toContain(lu(`économisez ${economieAnnuelle(PLANS.artisan)}`));
    expect(texte).toContain(lu(`économisez ${economieAnnuelle(PLANS.equipe)}`));
    expect(texte).toContain('économisez 19,80 €');
    expect(texte).toContain('économisez 39,80 €');
  });

  it('plus de pourcentage d\'économie écrit à la main', () => {
    expect(texte).not.toMatch(/17\s?%/);
    expect(texte).not.toMatch(/conomisez 20 €|conomisez 40 €/);
  });

  it('le plan Gratuit dit « Sans limite de durée », plus « Pour toujours »', () => {
    expect(texte).toContain('Sans limite de durée');
    expect(texte).not.toMatch(/Pour toujours/i);
  });
});
