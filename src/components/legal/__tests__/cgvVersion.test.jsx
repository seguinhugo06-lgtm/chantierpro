import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LegalPages from '../../LegalPages';
import { PLANS, PLAN_ORDER, LIBELLES_COMPLETS } from '../../../stores/subscriptionStore';
import { FONCTIONS } from '../../../lib/fonctions';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../../stores/prixAbonnement';
import { CGV_VERSION, CGV_ARTICLE_4_PLANS, CGV_ARTICLE_4_TVA, CGV_ARTICLE_4_SELON_IA, CGV_ARTICLE_4_DICTEES, libelleVersionCgv } from '../../../lib/cgv';

/**
 * CGV versionnées (relecture juridique du 20 oct. 2026) : l'article 4 se recalculait depuis `PLANS`, si bien qu'un
 * changement de prix, de limite ou de libellé modifiait le contrat en silence. Il est maintenant figé pour une version
 * (src/lib/cgv.js) ; ce test le reconstruit depuis `PLANS` et échoue dès qu'ils diffèrent.
 */
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\s  ]+/g, ' ').trim();
const pageCgv = () => renderToStaticMarkup(<LegalPages page="cgv" couleur="#12336F" setPage={() => {}} />);

/**
 * Ce que le générateur d'avant (20 oct. 2026) écrivait pour chaque plan, lu dans `plans` : la référence du figé.
 */
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

describe('CGV : la dictée (FONCTIONS.ia) dans l\'article 4', () => {
  // Les plans avec leurs lignes de dictée (masquées tant que l'IA est éteinte) donnent le texte « avec IA » de l'article 4.
  const plansAvecIa = Object.fromEntries(PLAN_ORDER.map((id) => [id, { ...PLANS[id], featureLabels: LIBELLES_COMPLETS[id] }]));
  it('le texte « avec IA » de l\'article 4 est celui que donnent PLANS avec les lignes de dictée', () => {
    expect(articleQuatreDepuisPlans(plansAvecIa), 'mettre à jour ARTICLE_4_AVEC_IA (src/lib/cgv.js)').toEqual(CGV_ARTICLE_4_SELON_IA.avecIa);
    // Cas témoin : un libellé de dictée changé dans PLANS est détecté
    const change = Object.fromEntries(PLAN_ORDER.map((id) => [id, { ...plansAvecIa[id], featureLabels: plansAvecIa[id].featureLabels.map((f) => ({ ...f })) }]));
    change.artisan.featureLabels.find((f) => /dict[ée]e/i.test(f.name)).name = '100 dictées par mois';
    expect(articleQuatreDepuisPlans(change)).not.toEqual(CGV_ARTICLE_4_SELON_IA.avecIa);
  });

  it('les textes de l\'offre sont exacts : 5, 100 par abonnement, partagés, et pas de « sans limite » sans son plafond (C. conso. L121-2)', () => {
    const [gratuit, artisan, equipe] = CGV_ARTICLE_4_SELON_IA.avecIa.map((l) => l.description);
    expect(gratuit).toContain('5 dictées par mois, partagées entre les utilisateurs de l’entreprise');
    expect(artisan).toContain('100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises');
    expect(equipe).toContain('Dictées sans limite mensuelle (100 analyses par jour et par personne au plus)');
    expect(CGV_ARTICLE_4_SELON_IA.sansIa.map((l) => l.description).join(' ')).not.toMatch(/dictée/i);
    // L'ancienne formule, sans « analyses » ni « partagées », ne reste nulle part
    const tout = [...CGV_ARTICLE_4_SELON_IA.avecIa.map((l) => l.description), CGV_ARTICLE_4_DICTEES].join(' ');
    expect(tout).not.toMatch(/\(100 par jour/);
    expect(tout).not.toMatch(/\b100 dictées par mois(?! par abonnement)/);
  });

  // Texte du juriste après relecture au texte officiel, 5 nov. 2026 (avis du lot 4, point 3), recopié par programme, mot pour mot.
  const PARAGRAPHE_DICTEES = "Dictées : une dictée compte dès qu’elle est analysée, y compris quand l’analyse échoue à cause de la dictée elle-même (trop longue, incompréhensible ou refusée par l’intelligence artificielle). Une panne de Mallettico ou de son prestataire ne compte pas dans les dictées du mois. Aux plans payants, les dictées du mois comprennent toutes celles faites dans l’entreprise, quelle que soit l’offre de leur auteur, et celles faites avec le même abonnement dans ses autres entreprises. Au plan Gratuit, elles comprennent toutes celles faites dans l’entreprise, vos dictées faites au plan Gratuit dans vos autres entreprises, et celles faites ce mois-ci avec votre propre abonnement payant. Le compteur repart à zéro le 1er de chaque mois, heure de Paris. La dictée est réservée au propriétaire de l’entreprise et à ses administrateurs. Chaque personne peut lancer au plus 100 analyses par jour aux plans payants, 20 au plan Gratuit, et 5 par minute, échecs compris, même dus à une panne de Mallettico ou de son prestataire ; ce plafond du jour repart à zéro à minuit, heure de Paris. La dictée peut être momentanément indisponible si la capacité journalière du service est atteinte ; une dictée refusée pour ce motif ne compte pas.";

  it('le paragraphe des dictées de l\'article 4 est celui du juriste, mot pour mot', () => {
    expect(CGV_ARTICLE_4_DICTEES).toBe(PARAGRAPHE_DICTEES);
  });

  it('il dit ce qui compte (plans payants, plan Gratuit), le rôle, les plafonds du jour et de la minute pannes comprises, et le coupe-circuit', () => {
    expect(CGV_ARTICLE_4_DICTEES).toContain('Une panne de Mallettico ou de son prestataire ne compte pas dans les dictées du mois.');
    expect(CGV_ARTICLE_4_DICTEES).toContain('Au plan Gratuit, elles comprennent toutes celles faites dans l’entreprise, vos dictées faites au plan Gratuit dans vos autres entreprises, et celles faites ce mois-ci avec votre propre abonnement payant.');
    expect(CGV_ARTICLE_4_DICTEES).toContain('La dictée est réservée au propriétaire de l’entreprise et à ses administrateurs.');
    expect(CGV_ARTICLE_4_DICTEES).toContain('100 analyses par jour aux plans payants, 20 au plan Gratuit, et 5 par minute, échecs compris, même dus à une panne de Mallettico ou de son prestataire');
    expect(CGV_ARTICLE_4_DICTEES).toContain('une dictée refusée pour ce motif ne compte pas.');
    // La phrase de D-37 qui se lisait mal à côté de « une panne ne compte pas » n'est plus dans la description d'Équipe
    expect(CGV_ARTICLE_4_SELON_IA.avecIa.map((l) => l.description).join(' ')).not.toMatch(/échecs compris/);
    expect(CGV_ARTICLE_4_SELON_IA.sansIa.map((l) => l.description).join(' ')).not.toMatch(/échecs compris|autres entreprises/);
  });

  it('IA allumée : la version des CGV change, et sa date d\'attente (3 nov.) a été remplacée par celle de la livraison', () => {
    if (!FONCTIONS.ia) { expect(CGV_VERSION).toBe('2026-10-24'); return; }
    expect(CGV_VERSION).not.toBe('2026-10-24');
    expect(CGV_VERSION, 'Relevez CGV_VERSION (src/lib/cgv.js) au jour de la livraison, comme CGU_VERSION').not.toBe('2026-11-03');
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
    // Ce qui compte comme une dictée : seulement avec la dictée (version de l'allumage), jamais avant
    if (FONCTIONS.ia) expect(texte).toContain(lu(CGV_ARTICLE_4_DICTEES));
    else expect(texte).not.toMatch(/une dictée compte|échecs compris|autres entreprises/);
  });
});

describe('CGV : article « Modification des conditions »', () => {
  const texte = lu(pageCgv());

  it('dit que la modification est notifiée 30 jours avant, ne touche pas la période payée, et ouvre la résiliation sans frais', () => {
    expect(texte).toContain('Modification des conditions');
    expect(texte).toContain('Toute modification qui augmente le prix ou réduit les droits de l\'utilisateur lui est notifiée par e-mail, à l\'adresse de son compte, au moins 30 jours avant son entrée en vigueur');
    expect(texte).toContain('Le prix hors taxes du tarif fondateur (article 4) n\'est pas modifié par cette faculté');
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
