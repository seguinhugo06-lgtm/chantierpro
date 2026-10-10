import { describe, it, expect } from 'vitest';
import { avoirTotal, avoirPartiel, lignesCreditables, facteursRemise } from '../avoir';
import { calculerTotaux, totalLigne, arrondi } from '../totauxDocument';
import { lignesFactureSolde } from '../facturation';

const somme = (lignes) => arrondi(lignes.reduce((s, l) => s + totalLigne(l), 0));

// Facture remisée à 7 % (lignes + ligne « Remise 7 % »), comme la produit lignesFactureSolde
const DEVIS_REMISE = {
  numero: 'DEV-1', tvaRate: 20, remise: 7,
  lignes: [
    { id: 'l1', description: 'Câble', quantite: 13, prixUnitaire: 17.77, tva: 20 },
    { id: 'l2', description: 'Prise', quantite: 5, prixUnitaire: 20, tva: 20 },
  ],
};
const lignesRemisees = lignesFactureSolde(DEVIS_REMISE, []);
const tR = calculerTotaux(lignesRemisees);
const FACTURE_REMISEE = { id: 'f1', lignes: lignesRemisees, tvaRate: 20, total_ht: tR.totalHT, tva: tR.totalTVA, total_ttc: tR.totalTTC, tvaParTaux: tR.tvaParTaux };

// Facture de solde : lignes du devis moins l'acompte déjà facturé
const DEVIS_10 = { numero: 'DEV-2', tvaRate: 10, lignes: [{ id: 'a', description: 'Pose', quantite: 10, prixUnitaire: 61.03, tva: 10 }] };
const lignesSolde = lignesFactureSolde(DEVIS_10, [{ libelle: 'Acompte déjà facturé (FAC-1)', lignes: [{ description: 'Acompte', quantite: 1, prixUnitaire: 183.09, montant: 183.09, tva: 10 }] }]);
const tS = calculerTotaux(lignesSolde);
const FACTURE_SOLDE = { id: 'f2', lignes: lignesSolde, tvaRate: 10, total_ht: tS.totalHT, tva: tS.totalTVA, total_ttc: tS.totalTTC, tvaParTaux: tS.tvaParTaux };

describe('avoirTotal', () => {
  it('est l\'inverse exact d\'une facture de solde (la déduction d\'acompte n\'est pas recréditée)', () => {
    const a = avoirTotal(FACTURE_SOLDE);
    expect(somme(a.lignes)).toBe(-somme(FACTURE_SOLDE.lignes));
    expect(a.totalHT).toBe(-FACTURE_SOLDE.total_ht);
    expect(a.totalTVA).toBe(-FACTURE_SOLDE.tva);
    expect(a.totalTTC).toBe(-FACTURE_SOLDE.total_ttc);
    expect(arrondi(a.totalHT + a.totalTVA)).toBe(a.totalTTC);
  });
  it('est l\'inverse exact d\'une facture remisée (la remise reste une remise)', () => {
    const a = avoirTotal(FACTURE_REMISEE);
    expect(somme(a.lignes)).toBe(-somme(FACTURE_REMISEE.lignes));
    expect(a.totalTTC).toBe(-FACTURE_REMISEE.total_ttc);
    const remise = a.lignes.find((l) => /^Remise/.test(l.description));
    expect(totalLigne(remise)).toBeGreaterThan(0); // remise inversée : elle diminue le crédit
  });
});

describe('avoirPartiel', () => {
  it('crédite la ligne au prix payé (remise déduite), arrondi au centime', () => {
    const cable = FACTURE_REMISEE.lignes.find((l) => l.description === 'Câble');
    const a = avoirPartiel(FACTURE_REMISEE, [{ ligne: cable, quantite: 13 }]);
    // 13 × 17,77 = 231,01 HT ; remise 7 % = 16,17 ; net 214,84 HT ; TVA 20 % 42,97 ; TTC 257,81
    expect(a.totalHT).toBe(-214.84);
    expect(a.totalTVA).toBe(-42.97);
    expect(a.totalTTC).toBe(-257.81);
    expect(a.lignes.some((l) => /^Remise 7/.test(l.description))).toBe(true);
  });
  it('sans remise, crédite la quantité choisie', () => {
    const pose = FACTURE_SOLDE.lignes.find((l) => l.description === 'Pose');
    const a = avoirPartiel(FACTURE_SOLDE, [{ ligne: pose, quantite: 2 }]);
    expect(a.totalHT).toBe(-122.06);
    expect(a.totalTTC).toBe(-134.27);
  });
  it('ignore une remise ou une déduction choisie par erreur, et borne la quantité', () => {
    const remise = FACTURE_REMISEE.lignes.find((l) => /^Remise/.test(l.description));
    expect(avoirPartiel(FACTURE_REMISEE, [{ ligne: remise, quantite: 1 }]).totalTTC === 0).toBe(true);
    const prise = FACTURE_REMISEE.lignes.find((l) => l.description === 'Prise');
    expect(avoirPartiel(FACTURE_REMISEE, [{ ligne: prise, quantite: 50 }]).totalHT).toBe(avoirPartiel(FACTURE_REMISEE, [{ ligne: prise, quantite: 5 }]).totalHT);
  });
});

describe('lignes créditables et facteurs de remise', () => {
  it('seules les lignes facturées en positif se créditent une à une', () => {
    expect(lignesCreditables(FACTURE_SOLDE).every((l) => totalLigne(l) > 0)).toBe(true);
    expect(lignesCreditables(FACTURE_REMISEE).map((l) => l.description)).toEqual(['Câble', 'Prise']);
  });
  it('remise de 7 % : 0,93 payé par euro de ligne', () => {
    expect(facteursRemise(FACTURE_REMISEE)['20']).toBeCloseTo(0.93, 3);
    expect(facteursRemise(FACTURE_SOLDE)['10']).toBe(1); // une déduction d'acompte n'est pas une remise
  });
});
