import { describe, it, expect } from 'vitest';
import { tauxReduitsPresents, textesCertification, mentionTvaReduiteHtml } from '../mentionTvaReduite';

// Texte officiel, BOFiP BOI-LETTRE-000280 (modèle I, 10 %).
const MODELE_I = 'certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent des locaux à usage '
  + 'd’habitation achevés depuis plus de deux ans et qu’ils n’ont pas eu pour effet, sur une période de deux ans au plus, '
  + 'de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de l’article 257 du CGI, ni d’entraîner une '
  + 'augmentation de la surface de plancher des locaux existants supérieure à 10 %.';

describe('tauxReduitsPresents', () => {
  it('repère 10 % et 5,5 % quelle que soit l’écriture de la clé', () => {
    expect(tauxReduitsPresents({ 10: { base: 100 }, '5.5': { base: 50 } })).toEqual({ dix: true, cinqCinq: true });
    expect(tauxReduitsPresents({ '5,5': { base: 50 } })).toEqual({ dix: false, cinqCinq: true });
  });

  it('ignore un taux sans base et le taux normal', () => {
    expect(tauxReduitsPresents({ 20: { base: 100 }, 10: { base: 0 } })).toEqual({ dix: false, cinqCinq: false });
    expect(tauxReduitsPresents(undefined)).toEqual({ dix: false, cinqCinq: false });
  });
});

describe('textesCertification', () => {
  it('reproduit le modèle I officiel, nom du client prérempli', () => {
    const [texte] = textesCertification({ dix: true, cinqCinq: false }, 'Claire Rousseau');
    expect(texte).toBe(`Je soussigné(e) Claire Rousseau ${MODELE_I}`);
  });

  it('modèle II : ajoute la rénovation énergétique', () => {
    const [texte] = textesCertification({ dix: false, cinqCinq: true });
    expect(texte.startsWith('Je soussigné(e) ............................ (Nom, prénom) certifie')).toBe(true);
    expect(texte).toMatch(/plus de deux ans, qu’ils n’ont pas eu pour effet/);
    expect(texte.endsWith('supérieure à 10 % et qu’ils ont la nature de travaux de rénovation énergétique.')).toBe(true);
  });

  it('un document mixte reçoit les deux modèles', () => {
    expect(textesCertification({ dix: true, cinqCinq: true })).toHaveLength(2);
  });
});

describe('mentionTvaReduiteHtml', () => {
  it('rien pour un document à 20 % ou en franchise de TVA', () => {
    expect(mentionTvaReduiteHtml({ tvaDetails: { 20: { base: 500 } } })).toBe('');
    expect(mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 500 } }, isMicro: true })).toBe('');
  });

  it('échappe le nom du client', () => {
    const html = mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 500 } }, nomClient: '<b>X</b>' });
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).not.toContain('<b>X</b>');
  });

  it('sur une facture, prévoit la signature du client', () => {
    expect(mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 1 } }, isFacture: true })).toContain('Date et signature du client');
    expect(mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 1 } } })).toContain('La signature du présent devis vaut certification');
  });
});
