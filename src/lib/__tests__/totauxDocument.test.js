import { describe, it, expect } from 'vitest';
import { totauxDocument, acompteEtSolde, totalLigne, arrondi } from '../totauxDocument';

const ligne = (description, quantite, prixUnitaire, tva) => ({ description, quantite, prixUnitaire, tva });

describe('totauxDocument', () => {
  it('remise : TVA sur la base APRÈS remise, remise sur le total des lignes (panne du 9 oct.)', () => {
    const doc = { lignes: [ligne('Pose', 1, 1000, 20)], remise: 10, total_ht: 900, tva: 180, total_ttc: 1080 };
    const t = totauxDocument(doc);
    expect(t.totalLignesHT).toBe(1000);
    expect(t.remiseMontant).toBe(100);
    expect(t.totalHT).toBe(900);
    expect(t.tva).toEqual([{ taux: 20, base: 900, montant: 180 }]);
    expect(t.totalTTC).toBe(1080);
    expect(arrondi(t.totalHT + t.totalTVA)).toBe(t.totalTTC);
  });

  it('ignore une TVA stockée calculée avant remise (incohérente avec la TVA totale)', () => {
    const doc = { lignes: [ligne('Pose', 1, 1000, 20)], remise: 10, total_ht: 900, tva: 180, total_ttc: 1080, tvaDetails: { 20: { base: 1000, montant: 200 } } };
    expect(totauxDocument(doc).tva).toEqual([{ taux: 20, base: 900, montant: 180 }]);
  });

  it('garde la TVA stockée quand elle est cohérente (acompte au prorata de deux taux)', () => {
    const doc = { lignes: [ligne('Acompte 30 % sur devis DEV-1', 1, 600, 10)], total_ht: 600, tva: 90, total_ttc: 690, tvaDetails: { 10: { base: 300, montant: 30 }, 20: { base: 300, montant: 60 } } };
    expect(totauxDocument(doc).tva).toEqual([{ taux: 10, base: 300, montant: 30 }, { taux: 20, base: 300, montant: 60 }]);
  });

  it('plusieurs taux sans remise : bases = lignes arrondies au centime', () => {
    const doc = { lignes: [ligne('A', 1, 91, 10), ligne('B', 1, 184.995, 20), ligne('C', 1, 56.985, 5.5)] };
    const t = totauxDocument(doc);
    expect(t.tva.map((x) => x.base)).toEqual([56.99, 91, 185]);
    expect(t.totalLignesHT).toBe(332.99);
  });

  it('ignore les titres de lot et prend le taux par défaut du document', () => {
    const doc = { tvaRate: 5.5, lignes: [{ _isSection: true, description: 'Lot 1' }, { description: 'Isolation', quantite: 10, prixUnitaire: 40 }] };
    expect(totauxDocument(doc).tva).toEqual([{ taux: 5.5, base: 400, montant: 22 }]);
  });
});

describe('acompteEtSolde', () => {
  it('le solde est le TTC moins l\'acompte arrondi : la somme tombe juste', () => {
    const { acompte, solde } = acompteEtSolde(1000.05, 30);
    expect(acompte).toBe(300.02);
    expect(solde).toBe(700.03);
    expect(arrondi(acompte + solde)).toBe(1000.05);
  });
});

describe('totalLigne', () => {
  it('arrondit au centime', () => {
    expect(totalLigne({ quantite: 3, prixUnitaire: 18.995 })).toBe(56.99);
    expect(totalLigne({ montant: '12.345' })).toBe(12.35);
  });
});
