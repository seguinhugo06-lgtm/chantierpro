import { describe, it, expect } from 'vitest';
import { prepareModeleLignes, getModele } from '../data/modeles';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { ALL_OUVRAGES } from '../data/bibliotheque';
import { ALL_ARTICLES_BTP, searchAllArticles, articlesAImporterDuReferentiel } from '../data';
import { tvaArticleReferentiel } from '../../components/ArticlePicker';
import { FIELD_MAPPINGS } from '../../hooks/useSupabaseSync';

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

// Import en masse du référentiel (Catalogue › premier usage, importerReferentiel). Seul un article qui porte un taux le
// transmet (chaudières gaz et fioul : 20 %). Les autres partent sans taux, comme avant cette branche : l'écriture en base leur
// met son défaut (useSupabaseSync, « ?? 20 »). Contrôle local du 4 nov. 2026 : `620b737` leur imposait 10 %, dont aux
// 9 articles « Espaces verts » du paysagisme, que la recherche donne à 20 % (docs/metiers/paysagiste.md § 5).
describe('import en masse du référentiel (Catalogue)', () => {
  const parNom = (liste, id) => {
    const article = articlesBtp().find((a) => a.id === id);
    return liste.find((l) => l.nom === article.nom);
  };
  // Le taux que la base reçoit pour un article importé (correspondance de la table catalogue)
  const tauxEnBase = (ligne) => FIELD_MAPPINGS.catalogue.toSupabase(ligne).tva_rate;
  const espacesVerts = () => ALL_ARTICLES_BTP.paysagisme.sousCategories.espaces.articles;

  it('un article d’espaces verts importé ne prend pas 10 % : il part sans taux, la base pose son défaut (20 %)', () => {
    const importes = articlesAImporterDuReferentiel(['paysagisme']);
    expect(espacesVerts()).toHaveLength(9);
    for (const article of espacesVerts()) {
      const ligne = importes.find((l) => l.nom === article.nom);
      expect(ligne, article.nom).toBeDefined();
      expect(ligne.tva, article.nom).toBeUndefined();
      expect(tauxEnBase(ligne), article.nom).toBe(20);
    }
  });

  it('une chaudière gaz ou fioul importée prend 20 %, le taux qu’elle porte', () => {
    const importes = articlesAImporterDuReferentiel(['chauffage']);
    for (const id of ['chaud-gaz-mur', 'chaud-gaz-sol', 'chaud-fioul']) {
      expect(parNom(importes, id)?.tva, id).toBe(20);
      expect(tauxEnBase(parNom(importes, id)), id).toBe(20);
    }
  });

  it('seuls les articles qui portent un taux en transmettent un (ni la dépose ni la chaudière granulés)', () => {
    const importes = articlesAImporterDuReferentiel(Object.keys(ALL_ARTICLES_BTP));
    const avecTaux = articlesBtp().filter((a) => Number.isFinite(a.tva)).map((a) => a.nom).sort();
    // Les trois chaudières gaz et fioul (D-32), plus la fourniture des PAC air/air à 20 % (D-41, avis du 5 nov. 2026)
    expect(avecTaux).toEqual([
      'Chaudière fioul condensation', 'Chaudière gaz condensation au sol', 'Chaudière gaz condensation murale',
      'PAC air/air monosplit', 'PAC air/air multisplit (2 unités int.)', 'PAC air/air multisplit (3 unités int.)',
      'PAC air/air multisplit (4+ unités int.)', 'Unité intérieure supplémentaire',
    ]);
    expect(importes.filter((l) => l.tva !== undefined).map((l) => l.nom).sort()).toEqual(avecTaux);
    expect(parNom(importes, 'depose-chaud')?.tva).toBeUndefined();
    expect(parNom(importes, 'chaud-granules')?.tva).toBeUndefined();
  });

  it('en franchise en base, tout article importé est à 0 %, espaces verts et chaudières compris', () => {
    const importes = articlesAImporterDuReferentiel(Object.keys(ALL_ARTICLES_BTP), true);
    expect(importes.length).toBeGreaterThan(0);
    expect(importes.every((l) => l.tva === 0 && tauxEnBase(l) === 0)).toBe(true);
    expect(parNom(importes, 'gazon-semis')?.tva).toBe(0);
    expect(parNom(importes, 'chaud-gaz-mur')?.tva).toBe(0);
  });

  it('un métier inconnu n’importe rien', () => {
    expect(articlesAImporterDuReferentiel(['inexistant'])).toEqual([]);
  });
});
