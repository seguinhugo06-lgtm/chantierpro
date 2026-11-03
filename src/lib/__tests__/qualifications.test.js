import { describe, it, expect } from 'vitest';
import { lignesQualifications, raisonRgeNonImprime, ORGANISMES_RGE } from '../qualifications';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';
import { prepareModeleLignes, getModele } from '../data/modeles';

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
      .toEqual(['Qualification RGE N°E-12345 (Qualibat) — Valide jusqu\'au 30/06/2027']);
  });

  it('sans numéro, rien ; « Autre » n’est pas imprimé comme organisme', () => {
    expect(lignesQualifications({ rgeOrganisme: 'Qualibat' }, AUJ)).toEqual([]);
    expect(lignesQualifications({ rge: 'X1', rgeOrganisme: 'Autre' }, AUJ)).toEqual(['Qualification RGE N°X1']);
  });

  it('une qualification expirée n’est pas imprimée, et l’écran le dit', () => {
    const e = { rge: 'E-12345', rgeOrganisme: 'Qualibat', rgeValidite: '2026-11-02' };
    expect(lignesQualifications(e, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime(e, AUJ)).toMatch(/plus imprimée/);
    // valide jusqu'au jour même
    expect(lignesQualifications({ ...e, rgeValidite: AUJ }, AUJ)).toHaveLength(1);
  });

  it('Qualiopi n’est pas un organisme RGE : retiré de la liste, le numéro n’est pas imprimé', () => {
    expect(ORGANISMES_RGE).not.toContain('Qualiopi');
    const e = { rge: 'Q-1', rgeOrganisme: 'Qualiopi' };
    expect(lignesQualifications(e, AUJ)).toEqual([]);
    expect(raisonRgeNonImprime(e, AUJ)).toMatch(/Qualiopi/);
  });

  it('mentionRGE à false coupe tout ; l’ancien format `labels` exige un numéro', () => {
    expect(lignesQualifications({ rge: 'E-1', mentionRGE: false }, AUJ)).toEqual([]);
    expect(lignesQualifications({ labels: [{ actif: true, nom: 'QualiPAC' }, { actif: true, nom: 'QualiPAC', numero: 'QP-9' }] }, AUJ))
      .toEqual(['QualiPAC N°QP-9']);
  });

  it('devisHtmlBuilder imprime le RGE, échappé', () => {
    const html = buildDevisHtml({ doc, client, entreprise: { ...base, rge: 'E-<b>1</b>', rgeOrganisme: 'Qualifelec' }, couleur: '#12336F' });
    expect(html).toContain('Qualification RGE N°E-&lt;b&gt;1&lt;/b&gt; (Qualifelec)');
    expect(buildDevisHtml({ doc, client, entreprise: base, couleur: '#12336F' })).not.toContain('Qualification RGE');
  });

  it('pdfHtmlBuilder (documents rapides) imprime le RGE', () => {
    expect(buildDocumentHTML(doc, client, null, { ...base, rge: 'E-12345', rgeOrganisme: 'Qualit\'EnR' }))
      .toContain('Qualification RGE N°E-12345 (Qualit&#39;EnR)');
  });
});

describe('modèles de devis : taux imposé par le modèle', () => {
  it('le remplacement d’une chaudière gaz sort à 20 %, même si l’entreprise est à 10 % par défaut', () => {
    const lignes = prepareModeleLignes(getModele('chauffage', 'chaudiere-gaz'), 10);
    expect(lignes.length).toBeGreaterThan(0);
    expect(lignes.every((l) => l.tva === 20)).toBe(true);
  });

  it('l’entretien d’une chaudière garde le taux de l’entreprise', () => {
    expect(prepareModeleLignes(getModele('chauffage', 'entretien-chaudiere'), 10).every((l) => l.tva === 10)).toBe(true);
  });
});
