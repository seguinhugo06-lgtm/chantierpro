import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MENTION_TVA_ABONNEMENT } from '../../../stores/prixAbonnement';
import UpgradeModal from '../UpgradeModal';

// Rendu côté serveur : zustand y lit son état initial, pas celui qu'on poserait ensuite. La fenêtre est donc rendue
// avec un état fixe (plan Gratuit, fenêtre ouverte) ; le reste du magasin (PLANS, contextes) est le vrai.
vi.mock('../../../stores/subscriptionStore', async (importOriginal) => {
  const reel = await importOriginal();
  const etat = { upgradeModalOpen: true, upgradeModalFeature: null, planId: 'gratuit', closeUpgradeModal() {}, setSubscription() {} };
  return { ...reel, useSubscriptionStore: (selecteur) => selecteur(etat) };
});

// La fenêtre d'abonnement s'ouvre sur une limite ou une fonction réservée : elle dit les prix en franchise de TVA
// (D-19), jamais « HT ». (Le parcours `abonnements` couvre « Mon plan » dans le navigateur ; cette fenêtre n'a pas
// de chemin court en démo : il faudrait créer quatre clients pour atteindre la limite du plan Gratuit.)
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s  ]+/g, ' ');

describe('fenêtre d\'abonnement : prix en franchise de TVA', () => {
  const texte = lu(renderToStaticMarkup(<UpgradeModal />));

  it('dit la mention et le prix mensuel de chaque plan payant, lus dans PLANS', () => {
    expect(texte).toContain(MENTION_TVA_ABONNEMENT);
    expect(texte).toContain('9,90 € par mois');
    expect(texte).toContain('19,90 € par mois');
  });

  it('ne dit jamais « HT »', () => {
    expect(texte).not.toMatch(/\bHT\b/);
  });
});
