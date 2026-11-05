import { describe, it, expect } from 'vitest';
import { MODELES_DEVIS, prepareModeleLignes, getModele } from '../data/modeles';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { ALL_OUVRAGES } from '../data/bibliotheque';
import { ALL_ARTICLES_BTP } from '../data';
import { tvaArticleReferentiel } from '../../components/ArticlePicker';

// Climatisation, gainable comprise (décision d'Hugo n° 2 du 4 nov., confirmée le 5 nov. : D-41) : la fourniture d'un
// système de climatisation est exclue du taux de 10 % (CGI 279-0 bis, 1 ; avis juriste-btp du 4 nov. 2026), elle sort à
// 20 % ; la pose reste au taux de l'entreprise (10 % par défaut). Même balayage que `tvaChaudiere.test.js` (lot 0) :
// modèles de devis, bibliothèque des métiers, bibliothèque d'ouvrages, référentiel du catalogue.
//
// Ouvrages et référentiel ne portent qu'UN taux par ligne « fourniture et pose » : ils ne peuvent pas séparer. Une ligne
// unique fourniture et pose de climatisation prend donc 20 % tout entière (ouvrages de climatisation du lot 08, ouvrages PAC
// air/air du lot 10, articles PAC air/air du référentiel), jamais 10 % ni 5,5 %.
//
// PAC air/air (avis juriste-btp du lot 4, 5 nov. 2026, point 10 ; BOI-TVA-LIQ-30-20-90-20 § 50, 70, 80) : hors des critères du
// 1° bis (CGI ann. IV art. 30-0 D ter, arrêté du 13 juil. 2026), la fourniture est à 20 % et la pose à 10 %. Le 5,5 % (CGI
// 278-0 bis A, I, 3°) ne vaut que si l'artisan constate les critères : l'app ne le propose jamais d'office.

const articlesBtp = () =>
  Object.values(ALL_ARTICLES_BTP).flatMap((c) => Object.values(c.sousCategories || {}).flatMap((s) => s.articles || []));
const lignesBibliotheque = () => Object.entries(TRADE_LIBRARY).flatMap(([cle, t]) => [
  ...t.lots.flatMap((l) => l.lignes.map((ligne) => ({ cle, ligne }))),
  ...t.prestations.map((ligne) => ({ cle, ligne })),
]);

// Les lignes de fourniture d'un système de climatisation (unités, liaisons, réseau de gaines, bouches, évacuation)
const MATERIEL_CLIM = /climatisation|multisplit|unité (intérieure|extérieure|gainable)|liaisons? frigorifique|condensats|réseau gaines|bouches de soufflage/i;
const estFourniture = (texte) => /^Fourniture/i.test(texte);
const estPose = (texte) => /^Pose/i.test(texte);

/**
 * La règle sur des lignes de modèle préparées (taux de l'entreprise donné) : la fourniture du système à 20 %, tout le reste
 * au taux de l'entreprise, aucune ligne « F&P » qui mélangerait les deux. Rend les lignes qui l'enfreignent.
 */
function infractions(lignesPreparees, tauxEntreprise) {
  return lignesPreparees.filter((l) => {
    if (/^F&P/i.test(l.description)) return true;
    return l.tva !== (estFourniture(l.description) ? 20 : tauxEntreprise);
  }).map((l) => `${l.description} → ${l.tva} %`);
}

const MODELES_CLIM = ['pac-mono', 'pac-multi-2-3', 'pac-multi-4-5', 'gainable'];

describe('climatisation : modèles de devis (chauffage), gainable comprise', () => {
  it('les quatre modèles existent, gainable en tête de la liste des vérifiés', () => {
    for (const id of MODELES_CLIM) expect(getModele('chauffage', id), id).toBeTruthy();
  });

  it('gainable : unité extérieure, unité gainable, réseau de gaines et bouches sont séparés ; chaque fourniture à 20 %, chaque pose à 10 %', () => {
    const lignes = prepareModeleLignes(getModele('chauffage', 'gainable'), 10);
    const description = (d) => lignes.find((l) => l.description === d);
    for (const d of ['unité extérieure', 'unité gainable (faux plafond)', 'réseau gaines', 'bouches de soufflage']) {
      expect(description(`Fourniture ${d}`)?.tva, `Fourniture ${d}`).toBe(20);
      expect(description(`Pose ${d}`)?.tva, `Pose ${d}`).toBe(10);
    }
    expect(infractions(lignes, 10)).toEqual([]);
  });

  it('les quatre modèles suivent la règle, quel que soit le taux de l’entreprise (10 % ou 5,5 %)', () => {
    for (const id of MODELES_CLIM) {
      for (const taux of [10, 5.5]) {
        const lignes = prepareModeleLignes(getModele('chauffage', id), taux);
        expect(lignes.some((l) => estFourniture(l.description)), id).toBe(true);
        expect(lignes.some((l) => estPose(l.description)), id).toBe(true);
        expect(infractions(lignes, taux), `${id} à ${taux} %`).toEqual([]);
      }
    }
  });

  it('aucune ligne de matériel de climatisation, dans aucune famille de modèles, n’est une « F&P » ni une fourniture à taux réduit', () => {
    const lignes = Object.values(MODELES_DEVIS).flatMap((f) => (f.modeles || []).flatMap((m) => m.lignes.map((l) => ({ m, l }))));
    const clim = lignes.filter(({ m, l }) => MATERIEL_CLIM.test(`${m.nom} ${l.description}`) && !/air\/eau|eau chaude|chaudière|ballon|panneau|solaire|plancher/i.test(`${m.nom} ${l.description}`));
    expect(clim.length).toBeGreaterThan(20);
    for (const { m, l } of clim) {
      expect(l.description, m.id).not.toMatch(/^F&P/i);
      if (estFourniture(l.description)) expect(l.tva, `${m.id} — ${l.description}`).toBe(20);
    }
  });

  it('les prix de main ne bougent pas : chaque modèle garde le total d’avant la séparation (fourniture + pose)', () => {
    // Totaux des lignes « F&P » de main (4da73220), quantité × prix unitaire
    const avant = { 'pac-mono': 2100, 'pac-multi-2-3': 6330, 'pac-multi-4-5': 10230, gainable: 7475 };
    for (const [id, total] of Object.entries(avant)) {
      const somme = getModele('chauffage', id).lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
      expect(somme, id).toBe(total);
    }
  });

  it('contre-essai : un modèle gainable à l’ancienne (« F&P », sans taux par ligne) enfreint la règle à 10 %', () => {
    const ancien = { lignes: [
      { description: 'F&P unité extérieure', quantite: 1, unite: 'u', prixUnitaire: 2800 },
      { description: 'F&P unité gainable (faux plafond)', quantite: 1, unite: 'u', prixUnitaire: 2500 },
      { description: 'Réseau gaines', quantite: 25, unite: 'ml', prixUnitaire: 45 },
    ] };
    expect(infractions(prepareModeleLignes(ancien, 10), 10).length).toBeGreaterThan(0);
    // et la fourniture seule, au taux de l'entreprise, est aussi relevée
    expect(infractions(prepareModeleLignes({ lignes: [{ description: 'Fourniture unité gainable', quantite: 1, unite: 'u', prixUnitaire: 2050 }] }, 10), 10)).toHaveLength(1);
  });
});

describe('climatisation : bibliothèque des métiers (éditeur de devis)', () => {
  it('toute fourniture de matériel de climatisation est à 20 %, toute pose à 10 %, dans tous les métiers', () => {
    const clim = lignesBibliotheque().filter(({ ligne }) => MATERIEL_CLIM.test(ligne.designation));
    const fournitures = clim.filter(({ ligne }) => estFourniture(ligne.designation));
    const poses = clim.filter(({ ligne }) => estPose(ligne.designation));
    expect(fournitures.length).toBeGreaterThan(6);
    expect(poses.length).toBeGreaterThan(6);
    for (const { cle, ligne } of fournitures) expect(ligne.tva, `${cle} — ${ligne.designation}`).toBe(20);
    for (const { cle, ligne } of poses) expect(ligne.tva, `${cle} — ${ligne.designation}`).toBe(10);
  });

  it('aucune ligne « Fourniture et pose » de matériel de climatisation : les deux sont séparées', () => {
    const melanges = lignesBibliotheque().filter(({ ligne }) => MATERIEL_CLIM.test(ligne.designation) && /^Fourniture et pose/i.test(ligne.designation));
    expect(melanges.map(({ ligne }) => ligne.designation)).toEqual([]);
  });

  it('le métier Froid et climatisation suit la règle (et reste sans prix : D-41)', () => {
    const froid = lignesBibliotheque().filter(({ cle }) => cle === 'froid').map(({ ligne }) => ligne);
    expect(froid.filter((l) => estFourniture(l.designation)).every((l) => l.tva === 20)).toBe(true);
    expect(froid.filter((l) => estPose(l.designation)).every((l) => l.tva === 10)).toBe(true);
    expect(froid.some((l) => (l.prixUnitaire ?? 0) > 0)).toBe(false);
  });

  it('il n’y a pas de gainable dans la bibliothèque des métiers (s’il en vient un, il suivra la règle ci-dessus)', () => {
    expect(lignesBibliotheque().filter(({ ligne }) => /gainable|bouches? de soufflage/i.test(ligne.designation))).toEqual([]);
  });
});

describe('climatisation : bibliothèque d’ouvrages, lot 08 (split, multisplit, gainable)', () => {
  const clim = () => ALL_OUVRAGES.filter((o) => ['CHAP_08_03_02', 'CHAP_08_03_03'].includes(o.chapitreId));

  it('les douze ouvrages de climatisation sont à 20 % tout entiers (fourniture et pose en une ligne), jamais à taux réduit', () => {
    expect(clim()).toHaveLength(12);
    for (const o of clim()) expect(o.tva, `${o.id} ${o.nom}`).toBe(20);
  });

  it('la climatisation gainable (7, 10, 14 kW, grille, gaines rectangulaire et souple) est dedans, à 20 %', () => {
    const gainables = ALL_OUVRAGES.filter((o) => o.chapitreId === 'CHAP_08_03_03');
    expect(gainables.map((o) => o.id)).toEqual(['PL_03_03_001', 'PL_03_03_002', 'PL_03_03_003', 'PL_03_03_004', 'PL_03_03_005', 'PL_03_03_006']);
    expect(gainables.filter((o) => /gainable/i.test(o.nom)).length).toBeGreaterThanOrEqual(4);
    for (const o of gainables) expect(o.tva, o.id).toBe(20);
  });

  it('contre-essai : une chaudière granulés ou un chauffe-eau de la même base restent hors de cette règle', () => {
    const hors = ALL_OUVRAGES.filter((o) => !['CHAP_08_03_02', 'CHAP_08_03_03'].includes(o.chapitreId));
    expect(hors.some((o) => o.tva === 10)).toBe(true);
  });
});

describe('climatisation : PAC air/air de la bibliothèque d’ouvrages, lot 10 (rénovation énergétique)', () => {
  const pacAirAir = () => ALL_OUVRAGES.filter((o) => o.chapitreId === 'CHAP_RE_03_02');

  it('les cinq PAC air/air du lot 10, « Gainable PAC air/air 7kW » comprise, sont à 20 % : jamais 5,5 % d’office', () => {
    expect(pacAirAir().map((o) => o.id)).toEqual(['RE_03_02_001', 'RE_03_02_002', 'RE_03_02_003', 'RE_03_02_004', 'RE_03_02_005']);
    expect(pacAirAir().find((o) => /Gainable/i.test(o.nom))?.id).toBe('RE_03_02_005');
    for (const o of pacAirAir()) expect(o.tva, `${o.id} ${o.nom}`).toBe(20);
  });

  it('balayage : tout ouvrage de climatisation, split, gainable ou PAC air/air de toute la base est à 20 % (ni 10 %, ni 5,5 %)', () => {
    const concernes = ALL_OUVRAGES.filter((o) => /air\/air|climatisation|split|gainable/i.test(`${o.nom} ${o.description} ${(o.tags || []).join(' ')}`) && !/air\/eau/i.test(`${o.nom} ${o.description}`));
    expect(concernes.length).toBeGreaterThanOrEqual(17);
    for (const o of concernes) expect(o.tva, `${o.id} ${o.nom}`).toBe(20);
  });

  it('contre-essai : une PAC air/eau (autre règle) et le reste du lot 10 gardent leur taux réduit', () => {
    const airEau = ALL_OUVRAGES.filter((o) => /PAC air\/eau/i.test(o.nom));
    expect(airEau.length).toBeGreaterThan(0);
    for (const o of airEau) expect([5.5, 10], o.id).toContain(o.tva);
    expect(ALL_OUVRAGES.filter((o) => o.chapitreId?.startsWith('CHAP_RE_') && o.chapitreId !== 'CHAP_RE_03_02').every((o) => o.tva === 5.5 || o.tva === 10 || o.tva === 20)).toBe(true);
    expect(ALL_OUVRAGES.filter((o) => o.chapitreId === 'CHAP_RE_01_01').every((o) => o.tva === 5.5)).toBe(true);
  });
});

describe('climatisation : référentiel du catalogue (sélecteur d’articles)', () => {
  const PAC_AIR_AIR = ['pac-mono', 'pac-multi-2', 'pac-multi-3', 'pac-multi-4', 'unite-int-supp'];

  it('le référentiel n’a aucun article gainable : rien à séparer ni à porter à 20 %', () => {
    expect(articlesBtp().filter((a) => /gainable/i.test(a.nom))).toEqual([]);
  });

  it('les PAC air/air (monosplit, multisplit) et l’unité intérieure supplémentaire sont proposées à 20 % (article unique fourniture et pose), 0 % en franchise', () => {
    const articles = articlesBtp().filter((a) => PAC_AIR_AIR.includes(a.id));
    expect(articles.map((a) => a.id).sort()).toEqual([...PAC_AIR_AIR].sort());
    for (const a of articles) {
      expect(tvaArticleReferentiel(a), a.id).toBe('20');
      expect(tvaArticleReferentiel(a, true), a.id).toBe('0');
    }
  });

  it('balayage : tout article du référentiel qui est une PAC air/air ou une climatisation est proposé à 20 %', () => {
    const clim = articlesBtp().filter((a) => /air\/air|climatisation|split/i.test(a.nom) && !/air\/eau/i.test(a.nom));
    expect(clim.length).toBeGreaterThanOrEqual(4);
    for (const a of clim) expect(tvaArticleReferentiel(a), a.id).toBe('20');
  });

  it('contre-essai : une PAC air/eau, une PAC géothermique et l’entretien d’une PAC restent proposées à 10 %', () => {
    const autres = articlesBtp().filter((a) => ['pac-air-eau', 'pac-air-eau-ecs', 'pac-geo', 'entretien-pac'].includes(a.id));
    expect(autres).toHaveLength(4);
    for (const a of autres) expect(tvaArticleReferentiel(a), a.id).toBe('10');
  });

  it('le sélecteur propose le taux de l’article quand il en a un, 10 % sinon, 0 % en franchise (contre-essai de la règle)', () => {
    expect(tvaArticleReferentiel({ nom: 'Climatisation gainable', tva: 20 })).toBe('20');
    expect(tvaArticleReferentiel({ nom: 'Article sans taux' })).toBe('10');
    expect(tvaArticleReferentiel({ nom: 'Climatisation gainable', tva: 20 }, true)).toBe('0');
  });
});
