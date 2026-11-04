import { describe, it, expect } from 'vitest';
import { lignesQualifications, raisonRgeNonImprime, ORGANISMES_RGE } from '../qualifications';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';
import { prepareModeleLignes, getModele } from '../data/modeles';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { ALL_OUVRAGES } from '../data/bibliotheque';

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
  // Mentions exigées par l'Anah (guide de juillet 2025, p. 31) : intitulé, organisme, numéro (avis juriste du 3 nov. 2026)
  it('le RGE saisi dans Paramètres donne une ligne : intitulé, organisme, numéro et validité', () => {
    expect(lignesQualifications({ rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC chauffage et eau chaude sanitaire', rgeValidite: '2027-06-30' }, AUJ))
      .toEqual(['Entreprise RGE (Reconnu garant de l\'environnement) — Qualification : QualiPAC chauffage et eau chaude sanitaire — Qualibat — N° E-12345 — Valide jusqu\'au 30/06/2027']);
  });

  it('sans intitulé ou sans organisme, le RGE n’est pas imprimé et l’écran dit pourquoi', () => {
    const e = { rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC', rgeValidite: '2027-06-30' };
    expect(lignesQualifications({ ...e, rgeDomaine: '' }, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime({ ...e, rgeDomaine: ' ' }, AUJ)).toMatch(/intitulé/);
    expect(lignesQualifications({ ...e, rgeOrganisme: '' }, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime({ ...e, rgeOrganisme: '' }, AUJ)).toMatch(/organisme/);
  });

  it('une date de fin illisible (import) n’est ni imprimée ni prise pour valide', () => {
    const e = { rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC' };
    for (const v of ['30/06/2027', '2027-02-30', 'bientôt']) {
      expect(lignesQualifications({ ...e, rgeValidite: v }, AUJ)).toEqual([]);
      expect(raisonRgeNonImprime({ ...e, rgeValidite: v }, AUJ)).toMatch(/n’est pas reconnue/);
    }
  });

  it('sans date de fin, le RGE n’est pas imprimé et l’écran demande la date (avis juriste du 3 nov. 2026)', () => {
    expect(lignesQualifications({ rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC' }, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime({ rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC' }, AUJ)).toMatch(/date de fin/);
  });

  it('sans numéro, rien ; « Autre » est retiré de la liste et n’imprime rien (organisme exigé par l’Anah)', () => {
    expect(lignesQualifications({ rgeOrganisme: 'Qualibat' }, AUJ)).toEqual([]);
    expect(ORGANISMES_RGE).not.toContain('Autre');
    const e = { rge: 'X1', rgeOrganisme: 'Autre', rgeDomaine: 'QualiPAC', rgeValidite: '2027-01-01' };
    expect(lignesQualifications(e, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime(e, AUJ)).toMatch(/organisme/);
  });

  it('une qualification expirée n’est pas imprimée, et l’écran le dit', () => {
    const e = { rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC', rgeValidite: '2026-11-02' };
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

  it('mentionRGE à false coupe tout ; l’ancien format `labels` (sans intitulé, organisme ni date exigés) n’est plus imprimé', () => {
    expect(lignesQualifications({ rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC', rgeValidite: '2027-01-01', mentionRGE: false }, AUJ)).toEqual([]);
    expect(lignesQualifications({ labels: [{ actif: true, nom: 'QualiPAC', numero: 'QP-9' }] }, AUJ)).toEqual([]);
  });

  it('devisHtmlBuilder imprime le RGE, échappé', () => {
    const html = buildDevisHtml({ doc, client, entreprise: { ...base, rge: 'E-<b>1</b>', rgeOrganisme: 'Qualifelec', rgeDomaine: 'IRVE', rgeValidite: '2027-06-30' }, couleur: '#12336F' });
    expect(html).toContain('Qualification : IRVE — Qualifelec — N° E-&lt;b&gt;1&lt;/b&gt;');
    expect(buildDevisHtml({ doc, client, entreprise: base, couleur: '#12336F' })).not.toContain('Entreprise RGE');
  });

  it('la validité s’apprécie à la date du document, pas du jour de la réimpression', () => {
    const e = { ...base, rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC', rgeValidite: '2026-12-31' };
    expect(buildDevisHtml({ doc: { ...doc, date: '2026-11-03' }, client, entreprise: e, couleur: '#12336F' })).toContain('Entreprise RGE');
    expect(buildDevisHtml({ doc: { ...doc, date: '2027-01-05' }, client, entreprise: e, couleur: '#12336F' })).not.toContain('Entreprise RGE');
  });

  it('pdfHtmlBuilder (documents rapides) imprime le RGE', () => {
    expect(buildDocumentHTML(doc, client, null, { ...base, rge: 'E-12345', rgeOrganisme: 'Qualit\'EnR', rgeDomaine: 'QualiPAC', rgeValidite: '2027-06-30' }))
      .toContain('Qualification : QualiPAC — Qualit&#39;EnR — N° E-12345');
  });

  // Relecture du 4 nov. 2026 : la règle n'était testée que sur devisHtmlBuilder. Une facture ancienne réimprimée
  // aujourd'hui (fin de validité déjà passée) garde sa ligne RGE, puisqu'elle était valide le jour de la facture.
  it('pdfHtmlBuilder : une facture ancienne réimprimée garde son RGE, valide à sa date', () => {
    const e = { ...base, rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC', rgeValidite: '2025-12-31' };
    const facture = { ...doc, type: 'facture', numero: 'FAC-2025-0042' };
    expect(buildDocumentHTML({ ...facture, date: '2025-06-01' }, client, null, e)).toContain('Entreprise RGE');
    // contre-essai : la même facture datée après la fin de validité ne l'imprime pas
    expect(buildDocumentHTML({ ...facture, date: '2026-01-10' }, client, null, e)).not.toContain('Entreprise RGE');
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

});
