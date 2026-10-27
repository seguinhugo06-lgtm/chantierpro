import { describe, it, expect } from 'vitest';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';
import { estSociete } from '../mentionsFacture';

// Avis juriste du 26 oct. 2026 (M4, R10) : une société imprime son capital (C. com. R123-238) ; un entrepreneur
// individuel n'en a pas, et un capital resté rempli sur sa fiche ne s'imprime pas. Le générateur de l'aperçu
// (DevisPage.jsx) suit la même règle : parcours « documents » (aperçu réel).
const client = { nom: 'Rousseau', prenom: 'Claire' };
const doc = {
  type: 'devis', numero: 'DEV-2026-00001', date: '2026-10-07', statut: 'brouillon',
  lignes: [{ description: 'Remplacement tableau électrique', quantite: 1, unite: 'u', prixUnitaire: 1200, tva: 20 }],
  total_ht: 1200, tva: 240, total_ttc: 1440,
};
const base = { nom: 'Élec Exemple', siret: '12345678900011', adresse: '1 rue A\n33000 Bordeaux', capital: '10000' };

describe('capital social sur les documents : une société seulement', () => {
  it('estSociete : SARL, SAS oui ; EI, micro-entreprise, EIRL non', () => {
    expect(estSociete({ formeJuridique: 'SARL' })).toBe(true);
    expect(estSociete({ formeJuridique: 'SAS' })).toBe(true);
    expect(estSociete({ formeJuridique: 'EI' })).toBe(false);
    expect(estSociete({ formeJuridique: 'Micro-entreprise' })).toBe(false);
    expect(estSociete({ formeJuridique: 'EIRL' })).toBe(false);
  });

  it('générateur principal (devisHtmlBuilder) : la SARL imprime son capital, l\'EI non', () => {
    expect(buildDevisHtml({ doc, client, entreprise: { ...base, formeJuridique: 'SARL' }, couleur: '#12336F' })).toMatch(/Capital: 10000 €/);
    expect(buildDevisHtml({ doc, client, entreprise: { ...base, formeJuridique: 'EI', nomEntrepreneur: 'Jean Exemple' }, couleur: '#12336F' })).not.toMatch(/Capital/);
    expect(buildDevisHtml({ doc, client, entreprise: { ...base, formeJuridique: 'Micro-entreprise' }, couleur: '#12336F' })).not.toMatch(/Capital/);
  });

  it('générateur des documents rapides (pdfHtmlBuilder) : même règle', () => {
    expect(buildDocumentHTML(doc, client, null, { ...base, formeJuridique: 'SARL' })).toMatch(/Capital: 10000 €/);
    expect(buildDocumentHTML(doc, client, null, { ...base, formeJuridique: 'EI', nomEntrepreneur: 'Jean Exemple' })).not.toMatch(/Capital/);
  });
});
