import { describe, it, expect } from 'vitest';
import { buildDevisHtml, buildSituationFactureHtml } from '../devisHtmlBuilder';
import { buildMiseEnDemeureHtml } from '../miseEnDemeureBuilder';
import { couleurCss } from '../echapperHtml';
import { quantite } from '../formatDocument';

// Recette du 9 oct. 2026 : « Tableau <NF C 15-100> » s'imprimait « Tableau », et un <img onerror> saisi
// s'exécutait dans l'aperçu de l'artisan et sur la page de signature du client.
const PIEGE = '<img src=x onerror=alert(1)>';
const entreprise = {
  nom: `Élec & Fils ${PIEGE}`, formeJuridique: 'SARL', adresse: '1 rue A\n75001 Paris', siret: '12345678900012',
  cgv: `Paiement <b>comptant</b>\n${PIEGE}`, couleur: 'red}</style><script>alert(1)</script>',
};
const client = { nom: 'Dupont & Fils <SARL>', prenom: 'Marie', adresse: PIEGE, ville: 'Paris' };
const doc = {
  type: 'devis', numero: 'DEV-1', date: '2026-10-10', validite: 30, notes: `À noter ${PIEGE}\nDeuxième ligne`,
  lignes: [
    { description: 'Tableau <NF C 15-100> conforme', quantite: 12.5, unite: 'm²', prixUnitaire: 10, tva: 20 },
    { description: PIEGE, quantite: 1, unite: PIEGE, prixUnitaire: 5, tva: 20 },
    { description: 'Reprise', quantite: -3, unite: 'u', prixUnitaire: 10, tva: 20 },
  ],
  total_ht: 100, tva: 20, total_ttc: 120,
};

const sansBaliseInjectee = (html) => {
  expect(html).not.toContain('<img src=x');
  expect(html).not.toContain('<script>alert');
  expect(html).not.toContain('</style><script>');
};

describe('documents : tout texte saisi s\'imprime tel quel, rien ne s\'exécute', () => {
  it('devis (page de signature, envoi) : désignations, client, entreprise, CGV, notes échappés', () => {
    const html = buildDevisHtml({ doc, client, chantier: { nom: PIEGE, adresse: '2 rue B' }, entreprise, mode: 'client' });
    sansBaliseInjectee(html);
    expect(html).toContain('Tableau &lt;NF C 15-100&gt; conforme');
    expect(html).toContain('Dupont &amp; Fils &lt;SARL&gt;');
    expect(html).toContain('Élec &amp; Fils');
    expect(html).toContain('&lt;b&gt;comptant&lt;/b&gt;');
    expect(html).toContain('À noter &lt;img src=x onerror=alert(1)&gt;'); // notes imprimées (« visibles sur le PDF »)
    expect(html).toContain('12,5'); // quantité à la française
    expect(html).toContain('>-3<'); // ligne négative conservée
  });

  it('facture de situation : mêmes protections', () => {
    const html = buildSituationFactureHtml({
      situation: { numero: 2, date: '2026-10-10', lignes: [{ description: PIEGE, quantite: 1, unite: 'u', prixUnitaire: 100, cumulActuel: 50, cumulPrecedent: 0 }] },
      parentDevis: { numero: PIEGE }, client, chantier: { nom: PIEGE }, entreprise,
    });
    sansBaliseInjectee(html);
  });

  it('mise en demeure : mêmes protections', () => {
    const html = buildMiseEnDemeureHtml({
      doc: { numero: PIEGE, date: '2026-08-01', date_echeance: '2026-08-31', total_ttc: 1000, type: 'facture' },
      client, entreprise: { ...entreprise, ville: PIEGE, gerant: PIEGE }, couleur: entreprise.couleur,
    });
    sansBaliseInjectee(html);
    expect(html).toContain('Dupont &amp; Fils &lt;SARL&gt;');
  });

  it('couleur : seulement un code hexadécimal, sinon la couleur par défaut', () => {
    expect(couleurCss('#2563eb')).toBe('#2563eb');
    expect(couleurCss('#abc')).toBe('#abc');
    expect(couleurCss('red}</style><script>')).toBe('#f97316');
    expect(couleurCss(undefined, '#000000')).toBe('#000000');
  });

  it('quantités : virgule décimale, valeur vide gardée vide', () => {
    expect(quantite(12.5)).toBe('12,5');
    expect(quantite('3')).toBe('3');
    expect(quantite(0.333)).toBe('0,333');
    expect(quantite('')).toBe('');
    expect(quantite('<b>')).toBe('&lt;b&gt;');
  });
});
