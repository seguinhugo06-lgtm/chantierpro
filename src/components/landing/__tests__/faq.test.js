import { describe, it, expect } from 'vitest';
import { PLANS } from '../../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../../stores/prixAbonnement';
import { CATEGORIES_FAQ, moisOfferts, questionsFaq } from '../faq';

/**
 * La FAQ du site (`faq.js`) : toute limite, tout prix et le nombre de mois offerts à l'année viennent de `PLANS`
 * (décision D-29 : le site dit ce que fait l'application aujourd'hui). On le prouve avec des plans fictifs : si un
 * chiffre était écrit en dur, il ne suivrait pas.
 */
const PLANS_FICTIFS = {
  gratuit: { ...PLANS.gratuit, limits: { ...PLANS.gratuit.limits, devis: 7, clients: 12, chantiers: 3 } },
  artisan: { ...PLANS.artisan, priceMonthly: 10, priceYearly: 90 },
  equipe: { ...PLANS.equipe, priceMonthly: 20, priceYearly: 200, limits: { ...PLANS.equipe.limits, equipe: 6 } },
};

const reponse = (items, debutQuestion) => items.find((i) => i.q.startsWith(debutQuestion))?.a || '';
const toutLeTexte = (items) => items.map((i) => `${i.q} ${i.a}`).join('\n');

describe('FAQ du site', () => {
  const items = questionsFaq();

  it('chaque question a une catégorie connue, une question et une réponse', () => {
    const ids = CATEGORIES_FAQ.map((c) => c.id);
    expect(items.length).toBeGreaterThanOrEqual(10);
    for (const item of items) {
      expect(ids).toContain(item.categorie);
      expect(item.q.length).toBeGreaterThan(5);
      expect(item.a.length).toBeGreaterThan(20);
    }
  });

  it('les limites du plan Gratuit sont lues dans PLANS (« 2 chantiers », jamais « actifs »)', () => {
    const essai = reponse(items, 'Puis-je essayer');
    const { devis, clients, chantiers } = PLANS.gratuit.limits;
    expect(essai).toContain(`${devis} devis par mois`);
    expect(essai).toContain(`${clients} clients`);
    expect(essai).toContain(`${chantiers} chantiers`);
    expect(essai).not.toMatch(/actifs/);

    const fictif = reponse(questionsFaq(PLANS_FICTIFS), 'Puis-je essayer');
    expect(fictif).toContain('7 devis par mois');
    expect(fictif).toContain('12 clients');
    expect(fictif).toContain('3 chantiers');
  });

  it('les prix passent par prixAbonnement, avec la mention de franchise de TVA (D-19), jamais « HT »', () => {
    const essai = reponse(items, 'Puis-je essayer');
    expect(essai).toContain(`${prixAbonnement(PLANS.artisan)} par mois`);
    expect(essai).toContain(`${prixAbonnement(PLANS.equipe)} par mois`);
    expect(essai).toContain(MENTION_TVA_ABONNEMENT);
    expect(toutLeTexte(items)).not.toMatch(/\bHT\b/);

    const fictif = reponse(questionsFaq(PLANS_FICTIFS), 'Puis-je essayer');
    expect(fictif).toContain(`${prixAbonnement(PLANS_FICTIFS.artisan)} par mois`);
  });

  it('l\'offre annuelle et ses mois offerts sont calculés depuis PLANS', () => {
    expect(moisOfferts(PLANS.artisan)).toBe(2); // 12 × 9,90 − 99 = 19,80 € = 2 mois
    expect(moisOfferts(PLANS_FICTIFS.artisan)).toBe(3); // 12 × 10 − 90 = 30 € = 3 mois
    expect(moisOfferts(PLANS.gratuit)).toBe(0);

    const facturation = reponse(items, 'Comment fonctionne la facturation');
    expect(facturation).toContain(`${prixAbonnement(PLANS.artisan, 'an')} par an`);
    expect(facturation).toContain(`${moisOfferts(PLANS.artisan)} mois offerts`);
    expect(facturation).toContain(MENTION_TVA_ABONNEMENT);

    const fictive = reponse(questionsFaq(PLANS_FICTIFS), 'Comment fonctionne la facturation');
    expect(fictive).toContain('3 mois offerts');
    expect(fictive).toContain(`${prixAbonnement(PLANS_FICTIFS.artisan, 'an')} par an`);
  });

  it('le nombre de collaborateurs du plan Équipe vient de PLANS', () => {
    expect(reponse(questionsFaq(PLANS_FICTIFS), 'Puis-je essayer')).toContain('vous + 6 collaborateurs');
    expect(reponse(items, 'Puis-je essayer')).toContain(`vous + ${PLANS.equipe.limits.equipe} collaborateurs`);
  });

  it('ne promet rien qui n\'existe pas : ni support prioritaire, ni intégrations à venir, ni Factur-X', () => {
    const texte = toutLeTexte(items);
    for (const promesse of [/support\s+prioritaire/i, /AES/, /\bTLS\b/, /chiffr[ée]e?\s+(?:par|au|en)/i, /en\s+cours\s+de\s+d[ée]veloppement/i, /Factur-X/i, /pr[ée]viendrons/i,
      /Pennylane/i, /\bIndy\b/i, /\bSaaS\b/, /\bPWA\b/, /templates?/i, /\bCRM\b/, /situations?\s+de\s+travaux/i]) {
      expect(texte, String(promesse)).not.toMatch(promesse);
    }
  });
});
