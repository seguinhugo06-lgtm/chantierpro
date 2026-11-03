import { describe, it, expect } from 'vitest';
import { lignesQualifications, raisonRgeNonImprime, ORGANISMES_RGE } from '../qualifications';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';
import { prepareModeleLignes, getModele } from '../data/modeles';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { ALL_OUVRAGES } from '../data/bibliotheque';
import { ALL_ARTICLES_BTP, createCatalogueItem } from '../data';

// Recherche « métiers » du 3 nov. 2026 (docs/metiers/synthese.md § 2) : le RGE saisi dans Paramètres (`rge`,
// `rgeOrganisme`) n'était imprimé par aucun générateur, qui lisaient `labels`, jamais écrit. L'aperçu de DevisPage.jsx
// appelle la même fonction (`qualificationsHtml`) : parcours « documents ».
const AUJ = '2026-11-03';
const client = { nom: 'Rousseau', prenom: 'Claire' };
const doc = {
  type: 'devis', numero: 'DEV-2026-00001', date: '2026-11-03', statut: 'brouillon',
  lignes: [{ description: 'Pompe à chaleur air/eau', quantite: 1, unite: 'u', prixUnitaire: 9000, tva: 20 }],
  total_ht: 9000, tva: 1800, total_ttc: 10800,
};
const base = { nom: 'Chauffage Exemple', siret: '12345678900011', adresse: '1 rue A\n33000 Bordeaux', formeJuridique: 'SARL' };

describe('qualifications imprimées', () => {
  it('le RGE saisi dans Paramètres donne une ligne, avec organisme et validité', () => {
    expect(lignesQualifications({ rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeValidite: '2027-06-30' }, AUJ))
      .toEqual(['Entreprise RGE (Reconnu garant de l\'environnement) — N° E-12345 (Qualibat) — Valide jusqu\'au 30/06/2027']);
    expect(lignesQualifications({ rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'Pompe à chaleur', rgeValidite: '2027-06-30' }, AUJ)[0])
      .toContain('(Qualibat) — Domaine : Pompe à chaleur — Valide');
  });

  it('sans date de fin, le RGE n’est pas imprimé et l’écran demande la date (avis juriste du 3 nov. 2026)', () => {
    expect(lignesQualifications({ rge: 'E-12345', rgeOrganisme: 'Qualibat' }, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime({ rge: 'E-12345', rgeOrganisme: 'Qualibat' }, AUJ)).toMatch(/date de fin/);
  });

  it('sans numéro, rien ; « Autre » n’est pas imprimé comme organisme', () => {
    expect(lignesQualifications({ rgeOrganisme: 'Qualibat' }, AUJ)).toEqual([]);
    expect(lignesQualifications({ rge: 'X1', rgeOrganisme: 'Autre', rgeValidite: '2027-01-01' }, AUJ))
      .toEqual(['Entreprise RGE (Reconnu garant de l\'environnement) — N° X1 — Valide jusqu\'au 01/01/2027']);
  });

  it('une qualification expirée n’est pas imprimée, et l’écran le dit', () => {
    const e = { rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeValidite: '2026-11-02' };
    expect(lignesQualifications(e, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime(e, AUJ)).toMatch(/plus imprimé/);
    // valide jusqu'au jour même
    expect(lignesQualifications({ ...e, rgeValidite: AUJ }, AUJ)).toHaveLength(1);
  });

  it('Qualiopi n’est pas un organisme RGE : retiré de la liste, le numéro n’est pas imprimé', () => {
    expect(ORGANISMES_RGE).not.toContain('Qualiopi');
    const e = { rge: 'Q-1', rgeOrganisme: 'Qualiopi', rgeValidite: '2027-01-01' };
    expect(lignesQualifications(e, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime(e, AUJ)).toMatch(/Qualiopi/);
  });

  it('mentionRGE à false coupe tout ; l’ancien format `labels` exige un numéro', () => {
    expect(lignesQualifications({ rge: 'E-1', rgeValidite: '2027-01-01', mentionRGE: false }, AUJ)).toEqual([]);
    expect(lignesQualifications({ labels: [{ actif: true, nom: 'QualiPAC' }, { actif: true, nom: 'QualiPAC', numero: 'QP-9' }] }, AUJ))
      .toEqual(['QualiPAC N°QP-9']);
  });

  it('devisHtmlBuilder imprime le RGE, échappé', () => {
    const html = buildDevisHtml({ doc, client, entreprise: { ...base, rge: 'E-<b>1</b>', rgeOrganisme: 'Qualifelec', rgeValidite: '2027-06-30' }, couleur: '#12336F' });
    expect(html).toContain('N° E-&lt;b&gt;1&lt;/b&gt; (Qualifelec)');
    expect(buildDevisHtml({ doc, client, entreprise: base, couleur: '#12336F' })).not.toContain('Entreprise RGE');
  });

  it('la validité s’apprécie à la date du document, pas du jour de la réimpression', () => {
    const e = { ...base, rge: 'E-1', rgeOrganisme: 'Qualibat', rgeValidite: '2026-12-31' };
    expect(buildDevisHtml({ doc: { ...doc, date: '2026-11-03' }, client, entreprise: e, couleur: '#12336F' })).toContain('Entreprise RGE');
    expect(buildDevisHtml({ doc: { ...doc, date: '2027-01-05' }, client, entreprise: e, couleur: '#12336F' })).not.toContain('Entreprise RGE');
  });

  it('pdfHtmlBuilder (documents rapides) imprime le RGE', () => {
    expect(buildDocumentHTML(doc, client, null, { ...base, rge: 'E-12345', rgeOrganisme: 'Qualit\'EnR', rgeValidite: '2027-06-30' }))
      .toContain('N° E-12345 (Qualit&#39;EnR)');
  });
});

describe('modèles de devis : taux imposé par le modèle', () => {
  it('le remplacement d’une chaudière gaz sort à 20 %, même si l’entreprise est à 10 % par défaut', () => {
    const lignes = prepareModeleLignes(getModele('chauffage', 'chaudiere-gaz'), 10);
    expect(lignes.length).toBeGreaterThan(0);
    expect(lignes.every((l) => l.tva === 20)).toBe(true);
  });

  // L'exclusion de 2025 ne vise pas l'entretien (BOI-TVA-LIQ-30-20-90-20 § 230) : le taux de l'entreprise (10 %) est juste
  // par défaut ; 5,5 % possible pour une chaudière THPE
  it('l’entretien d’une chaudière garde le taux de l’entreprise (10 % par défaut)', () => {
    expect(prepareModeleLignes(getModele('chauffage', 'entretien-chaudiere'), 10).every((l) => l.tva === 10)).toBe(true);
  });
});

describe('bibliothèque des métiers : chaudière gaz', () => {
  it('aucune ligne de chaudière gaz à taux réduit (20 % depuis le 1er mars 2025)', () => {
    const lignes = JSON.stringify(TRADE_LIBRARY);
    const gaz = [...lignes.matchAll(/\{[^{}]*chaudière gaz[^{}]*\}/gi)].map((m) => m[0]);
    expect(gaz.length).toBeGreaterThan(0);
    for (const l of gaz) expect(l).toMatch(/"tva":20/);
  });

  // Les trois sources d'une ligne de chaudière (bibliothèque des métiers, référentiel du catalogue, import des articles)
  // proposaient 5,5, 10 ou 20 % selon l'écran (relecture du 3 nov. 2026) : toutes à 20 % (CGI 279-0 bis, 2 bis, c)
  it('le référentiel du catalogue propose les chaudières gaz à 20 %', () => {
    const gaz = ALL_OUVRAGES.filter((o) => /chaudière gaz/i.test(o.nom));
    expect(gaz.map((o) => o.id)).toEqual(expect.arrayContaining(['PL_02_01_001', 'PL_02_01_002']));
    for (const o of gaz) expect(o.tva).toBe(20);
  });

  it('l’import des articles crée les chaudières gaz et fioul à 20 %, les autres articles à 10 %', () => {
    const articles = Object.values(ALL_ARTICLES_BTP).flatMap((c) => Object.values(c.sousCategories || {}).flatMap((s) => s.articles || []));
    const fossiles = articles.filter((a) => ['chaud-gaz-mur', 'chaud-gaz-sol', 'chaud-fioul'].includes(a.id));
    expect(fossiles).toHaveLength(3);
    for (const a of fossiles) expect(createCatalogueItem(a).tva).toBe(20);
    expect(createCatalogueItem(articles.find((a) => a.id === 'chaud-granules')).tva).toBe(10);
  });
});
