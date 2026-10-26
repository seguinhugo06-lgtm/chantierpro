import { describe, it, expect } from 'vitest';
import { achatConnu, margeBrute, niveauMarge, CLASSES_TON_MARGE } from '../margeArticle';

describe('marge brute d’un article : une définition pour la liste, la fiche et le sélecteur', () => {
  it('calcule la marge en % du prix de vente', () => {
    expect(margeBrute(100, 60)).toBe(40);
    expect(margeBrute('150', '100')).toBeCloseTo(33.33, 1);
  });

  it('100 % seulement pour un achat réellement à 0 (main d’œuvre) ; un achat inconnu (null, vide, illisible) ne donne pas de marge', () => {
    expect(margeBrute(45, 0)).toBe(100);
    expect(margeBrute(45, '0')).toBe(100);
    expect(margeBrute(45, null)).toBeNull();
    expect(margeBrute(45, undefined)).toBeNull();
    expect(margeBrute(45, '')).toBeNull();
    expect(margeBrute(45, 'abc')).toBeNull();
  });

  it('le prix d’achat connu : un nombre ; la virgule est lue ; vide ou négatif = inconnu', () => {
    expect(achatConnu('2,5')).toBe(2.5);
    expect(achatConnu(12)).toBe(12);
    expect(achatConnu(0)).toBe(0);
    expect(achatConnu(null)).toBeNull();
    expect(achatConnu('')).toBeNull();
    expect(achatConnu(-3)).toBeNull();
    expect(achatConnu(NaN)).toBeNull();
  });

  it('sans prix de vente, pas de marge', () => {
    expect(margeBrute(0, 10)).toBeNull();
    expect(margeBrute(undefined, 10)).toBeNull();
  });

  it('une vente sous le prix d’achat donne une marge négative', () => {
    expect(margeBrute(50, 75)).toBe(-50);
  });
});

describe('niveau de marge : trois tons, jamais le rouge du retard', () => {
  it('de 40 % : succès ; de 25 % : neutre ; en dessous ou négative : alerte', () => {
    expect(niveauMarge(70)).toEqual({ libelle: 'Excellente', ton: 'succes' });
    expect(niveauMarge(40)).toEqual({ libelle: 'Bonne', ton: 'succes' });
    expect(niveauMarge(25)).toEqual({ libelle: 'Correcte', ton: 'neutre' });
    expect(niveauMarge(10)).toEqual({ libelle: 'Faible', ton: 'alerte' });
    expect(niveauMarge(0)).toEqual({ libelle: 'Faible', ton: 'alerte' });
    expect(niveauMarge(-5)).toEqual({ libelle: 'Négative', ton: 'alerte' });
  });

  it('sans marge : « Marge non calculée », ton neutre (jamais « Excellente »)', () => {
    expect(niveauMarge(null)).toEqual({ libelle: 'Marge non calculée', ton: 'neutre' });
    expect(niveauMarge(undefined)).toEqual({ libelle: 'Marge non calculée', ton: 'neutre' });
  });

  it('chaque ton a ses classes du thème, aucune couleur du rouge', () => {
    for (const ton of ['succes', 'neutre', 'alerte']) {
      expect(CLASSES_TON_MARGE[ton].texte).toBeTruthy();
      expect(CLASSES_TON_MARGE[ton].fond).not.toMatch(/danger/);
    }
  });
});
