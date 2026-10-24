import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LegalPages from '../../LegalPages';
import { PLANS, PLAN_ORDER } from '../../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../../stores/prixAbonnement';
import { CGV_VERSION, CGV_ARTICLE_4_PLANS, CGV_ARTICLE_4_TVA, libelleVersionCgv } from '../../../lib/cgv';

/**
 * CGV versionnées (relecture juridique du 20 oct. 2026) : l'article 4 se recalculait depuis `PLANS`, si bien qu'un
 * changement de prix, de limite ou de libellé modifiait le contrat en silence. Il est maintenant figé pour une version
 * (src/lib/cgv.js) ; ce test le reconstruit depuis `PLANS` et échoue dès qu'ils diffèrent.
 */
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\s  ]+/g, ' ').trim();
const pageCgv = () => renderToStaticMarkup(<LegalPages page="cgv" couleur="#12336F" setPage={() => {}} />);

/** Ce que le générateur d'avant (20 oct. 2026) écrivait pour chaque plan, lu dans `plans` : la référence du figé. */
function articleQuatreDepuisPlans(plans) {
  return PLAN_ORDER.map((id) => {
    const plan = plans[id];
    const payant = plan.priceMonthly > 0;
    return {
      plan: plan.name,
      prix: payant
        ? `${prixAbonnement(plan)} par mois (ou ${prixAbonnement(plan, 'an')} par an)${plan.offreLancement ? ` — ${plan.offreLancement.toLowerCase()}, conservé tant que l'abonnement reste actif` : ''}`
        : `${prixAbonnement(plan)} par mois`,
      // Seulement ce que le plan comprend (un libellé `included: false` n'est pas une promesse)
      description: `${plan.description}. ${plan.featureLabels.filter((f) => f.included !== false).map((f) => f.name).join(' · ')}.`,
    };
  });
}

describe('CGV : l\'article 4 figé suit PLANS (garde-fou)', () => {
  it('le texte figé de l\'article 4 est celui que donnent PLANS', () => {
    expect(articleQuatreDepuisPlans(PLANS), 'PLANS a changé : mettre à jour l\'article 4 des CGV et CGV_VERSION').toEqual(CGV_ARTICLE_4_PLANS);
  });

  it('la phrase de franchise de TVA suit la mention commune des prix d\'abonnement', () => {
    expect(`Les prix sont indiqués en euros, sans TVA : ${MENTION_TVA_ABONNEMENT}.`, 'PLANS a changé : mettre à jour l\'article 4 des CGV et CGV_VERSION').toBe(CGV_ARTICLE_4_TVA);
  });

  it('cas témoin : un prix, une limite ou un libellé changé dans PLANS est détecté', () => {
    const copie = (modif) => modif({ ...PLANS, artisan: { ...PLANS.artisan, featureLabels: PLANS.artisan.featureLabels.map((f) => ({ ...f })) } });
    const prixChange = copie((p) => ({ ...p, artisan: { ...p.artisan, priceMonthly: 10.9 } }));
    expect(articleQuatreDepuisPlans(prixChange)).not.toEqual(CGV_ARTICLE_4_PLANS);
    const libelleChange = copie((p) => { p.artisan.featureLabels[0].name = 'Autre promesse'; return p; });
    expect(articleQuatreDepuisPlans(libelleChange)).not.toEqual(CGV_ARTICLE_4_PLANS);
    // Une fonction retirée d'un plan (`included: false`) n'est plus dans la liste : le texte change, donc le test échoue
    const retiree = copie((p) => { p.artisan.featureLabels[0].included = false; return p; });
    expect(articleQuatreDepuisPlans(retiree)).not.toEqual(CGV_ARTICLE_4_PLANS);
    expect(lu(articleQuatreDepuisPlans(retiree)[1].description)).not.toContain(PLANS.artisan.featureLabels[0].name);
  });
});

describe('CGV : version et page', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('la version est 2026-10-24 et s\'écrit « Version du 24 octobre 2026 »', () => {
    expect(CGV_VERSION).toBe('2026-10-24');
    expect(libelleVersionCgv()).toBe('Version du 24 octobre 2026');
    expect(libelleVersionCgv('2027-01-01')).toBe('Version du 1er janvier 2027');
    expect(libelleVersionCgv('2026-12-31')).toBe('Version du 31 décembre 2026');
    expect(() => libelleVersionCgv('24/10/2026')).toThrow(/illisible/);
    expect(() => libelleVersionCgv('2026-13-01')).toThrow(/illisible/);
  });

  it('la page affiche la version en tête, avant l\'article 1, et plus de « Dernière mise à jour »', () => {
    const texte = lu(pageCgv());
    expect(texte).toContain('Version du 24 octobre 2026');
    expect(texte.indexOf('Version du 24 octobre 2026')).toBeLessThan(texte.indexOf('Article 1 - Éditeur'));
    expect(texte).not.toMatch(/Dernière mise à jour/);
  });

  it('la page ne dépend pas de l\'horloge : même texte aujourd\'hui et dans deux ans', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T09:00:00Z'));
    const aujourdhui = pageCgv();
    vi.setSystemTime(new Date('2028-03-05T09:00:00Z'));
    expect(pageCgv()).toBe(aujourdhui);
    expect(lu(pageCgv())).not.toMatch(/mars 2028/);
  });

  it('les autres pages légales n\'affichent plus de « Dernière mise à jour » calculée à la date du jour', () => {
    for (const page of ['cgu', 'confidentialite', 'mentions-legales', 'accessibilite']) {
      const texte = lu(renderToStaticMarkup(<LegalPages page={page} couleur="#12336F" setPage={() => {}} />));
      expect(texte, page).not.toMatch(/Dernière mise à jour/);
    }
  });

  it('l\'article 4 de la page reprend le texte figé, ligne par ligne', () => {
    const texte = lu(pageCgv());
    for (const { plan, prix, description } of CGV_ARTICLE_4_PLANS) {
      expect(texte).toContain(lu(`${plan} ${prix} ${description}`));
    }
    expect(texte).toContain(CGV_ARTICLE_4_TVA);
  });
});

describe('CGV : article « Modification des conditions »', () => {
  const texte = lu(pageCgv());

  it('dit que la modification est notifiée 30 jours avant, ne touche pas la période payée, et ouvre la résiliation sans frais', () => {
    expect(texte).toContain('Modification des conditions');
    expect(texte).toContain('L\'éditeur peut modifier les présentes conditions et le contenu des offres. Toute modification est notifiée par e-mail au moins 30 jours avant son entrée en vigueur ; elle ne s\'applique pas à la période déjà payée, et l\'utilisateur qui la refuse peut résilier sans frais avant cette date.');
  });

  it('les articles se suivent de 1 à 11 sans trou ni doublon, « Droit applicable » en dernier', () => {
    const numeros = [...texte.matchAll(/Article (\d+) - /g)].map((m) => Number(m[1]));
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(texte).toMatch(/Article 10 - Modification des conditions/);
    expect(texte).toMatch(/Article 11 - Droit applicable et litiges/);
  });

  it('le renvoi interne « article 6 » (résiliation) pointe bien l\'article du droit de rétractation', () => {
    expect(texte).toMatch(/Article 6 - Droit de rétractation/);
    expect(texte).toMatch(/sous réserve du droit de rétractation de l'article 6/);
  });
});
