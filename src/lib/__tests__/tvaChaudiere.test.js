import { describe, it, expect } from 'vitest';
import { prepareModeleLignes, getModele } from '../data/modeles';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { ALL_OUVRAGES } from '../data/bibliotheque';
import { ALL_ARTICLES_BTP, searchAllArticles } from '../data';
import { tvaArticleReferentiel } from '../../components/ArticlePicker';

// Chaudière gaz ou fioul, fourniture et pose : 20 % depuis le 1er mars 2025, même dans un logement de plus de deux ans.
// CGI 279-0 bis, 2 bis, c) : « Les travaux comprenant la fourniture ou l'installation d'une chaudière susceptible
// d'utiliser des combustibles fossiles. » ; CGI 278-0 bis A, III bis ; BOI-TVA-LIQ-30-20-90-20 § 200.
// L'entretien, la réparation et la mise aux normes d'une chaudière gardent le taux réduit (même BOI, § 230).
// Tests repris de cloud/metiers (qualifications.test.js), sans le RGE, plus le sélecteur du référentiel du catalogue.

const articlesBtp = () =>
  Object.values(ALL_ARTICLES_BTP).flatMap((c) => Object.values(c.sousCategories || {}).flatMap((s) => s.articles || []));

describe('modèles de devis : taux imposé par le modèle', () => {
  it('le remplacement d’une chaudière gaz sort à 20 %, même si l’entreprise est à 10 % par défaut', () => {
    const lignes = prepareModeleLignes(getModele('chauffage', 'chaudiere-gaz'), 10);
    expect(lignes.length).toBeGreaterThan(0);
    expect(lignes.every((l) => l.tva === 20)).toBe(true);
  });

  it('contre-essai : l’entretien d’une chaudière garde le taux de l’entreprise (10 % par défaut)', () => {
    expect(prepareModeleLignes(getModele('chauffage', 'entretien-chaudiere'), 10).every((l) => l.tva === 10)).toBe(true);
  });
});

describe('bibliothèque des métiers (composeur « Nouveau devis ») : chaudière gaz', () => {
  it('aucune ligne de chaudière gaz à taux réduit', () => {
    const lignes = JSON.stringify(TRADE_LIBRARY);
    const gaz = [...lignes.matchAll(/\{[^{}]*chaudière gaz[^{}]*\}/gi)].map((m) => m[0]);
    expect(gaz.length).toBeGreaterThan(0);
    for (const l of gaz) expect(l).toMatch(/"tva":20/);
  });
});

describe('bibliothèque d’ouvrages, lot 08 : chaudière gaz', () => {
  it('PL_02_01_001 et PL_02_01_002 à 20 %', () => {
    const gaz = ALL_OUVRAGES.filter((o) => /chaudière gaz/i.test(o.nom));
    expect(gaz.map((o) => o.id)).toEqual(expect.arrayContaining(['PL_02_01_001', 'PL_02_01_002']));
    for (const o of gaz) expect(o.tva).toBe(20);
  });
});

describe('sélecteur du référentiel du catalogue (ArticlePicker)', () => {
  it('« Chaudière gaz condensation murale » est proposée à 20 %, comme les deux autres chaudières fossiles', () => {
    const [murale] = searchAllArticles('Chaudière gaz condensation murale');
    expect(murale?.id).toBe('chaud-gaz-mur');
    expect(tvaArticleReferentiel(murale)).toBe('20');
    const fossiles = articlesBtp().filter((a) => ['chaud-gaz-mur', 'chaud-gaz-sol', 'chaud-fioul'].includes(a.id));
    expect(fossiles).toHaveLength(3);
    for (const a of fossiles) expect(tvaArticleReferentiel(a)).toBe('20');
  });

  it('contre-essai : une chaudière granulés et la dépose restent à 10 % ; en franchise, 0 %', () => {
    const autres = articlesBtp().filter((a) => ['chaud-granules', 'depose-chaud'].includes(a.id));
    expect(autres).toHaveLength(2);
    for (const a of autres) expect(tvaArticleReferentiel(a)).toBe('10');
    expect(tvaArticleReferentiel(articlesBtp().find((a) => a.id === 'chaud-gaz-mur'), true)).toBe('0');
  });
});
