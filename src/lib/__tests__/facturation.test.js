import { describe, it, expect } from 'vitest';
import { lignesFactureAcompte, lignesFactureSolde, basesParTaux } from '../facturation';
import { calculerTotaux, totauxDocument, arrondi } from '../totauxDocument';

const fines = (s) => s.replace(/[  ]/g, ' ');
const devis = (x = {}) => ({
  numero: 'DEV-2026-00042', tvaRate: 20,
  lignes: [
    { description: 'Isolation des combles', quantite: 1, prixUnitaire: 600, tva: 10 },
    { description: 'Pose de la cuisine', quantite: 1, prixUnitaire: 400, tva: 20 },
  ],
  ...x,
});

describe('facture d\'acompte', () => {
  it('une ligne par taux, sur les bases après remise (avant : une seule ligne à un seul taux)', () => {
    const l = lignesFactureAcompte(devis({ remise: 10 }), 30);
    expect(l.map((x) => [fines(x.description), x.montant, x.tva])).toEqual([
      ['Acompte 30 % sur devis DEV-2026-00042 (travaux à 10 %)', 162, 10],
      ['Acompte 30 % sur devis DEV-2026-00042 (travaux à 20 %)', 108, 20],
    ]);
    const t = calculerTotaux(l);
    expect(t).toMatchObject({ totalHT: 270, totalTVA: 37.8, totalTTC: 307.8 });
  });

  it('un seul taux : une seule ligne, sans mention de taux', () => {
    const l = lignesFactureAcompte(devis({ lignes: [{ description: 'Pose', quantite: 1, prixUnitaire: 1000, tva: 20 }] }), 30, { libelle: 'Commande' });
    expect(l).toHaveLength(1);
    expect(fines(l[0].description)).toBe('Acompte 30 % sur devis DEV-2026-00042 — Commande');
  });
});

describe('facture de solde', () => {
  it('garde la remise en lignes visibles (avant : lignes à plein tarif, remise invisible)', () => {
    const d = devis({ remise: 10 });
    const l = lignesFactureSolde(d, []);
    expect(l.filter((x) => /Remise/.test(x.description)).map((x) => [x.montant, x.tva])).toEqual([[-60, 10], [-40, 20]]);
    const t = calculerTotaux(l);
    expect(t).toMatchObject({ totalHT: 900, totalTVA: 126, totalTTC: 1026 });
  });

  it('déduit l\'acompte par taux : acompte + solde = devis', () => {
    const d = devis({ remise: 10 });
    const acompte = lignesFactureAcompte(d, 30);
    const tA = calculerTotaux(acompte);
    const solde = lignesFactureSolde(d, [{ libelle: 'Acompte déjà facturé (FAC-1)', lignes: acompte }]);
    const tS = calculerTotaux(solde);
    expect(arrondi(tA.totalHT + tS.totalHT)).toBe(900);
    expect(arrondi(tA.totalTTC + tS.totalTTC)).toBe(1026);
    expect(tS.tvaParTaux).toEqual({ 10: { base: 378, montant: 37.8 }, 20: { base: 252, montant: 50.4 } });
  });

  it('acompte ancien à une ligne mais TVA ventilée : la ventilation fait foi', () => {
    const d = devis();
    const solde = lignesFactureSolde(d, [{ libelle: 'Acompte déjà facturé (FAC-0)', lignes: [{ description: 'Acompte', quantite: 1, prixUnitaire: 300, tva: 20 }], tvaParTaux: { 10: { base: 180 }, 20: { base: 120 } } }]);
    const tS = calculerTotaux(solde);
    expect(tS.tvaParTaux).toEqual({ 10: { base: 420, montant: 42 }, 20: { base: 280, montant: 56 } });
  });

  it('le document de solde imprime ce qui est enregistré', () => {
    const d = devis({ remise: 10 });
    const lignes = lignesFactureSolde(d, []);
    const t = calculerTotaux(lignes);
    const imprime = totauxDocument({ lignes, total_ht: t.totalHT, tva: t.totalTVA, total_ttc: t.totalTTC });
    expect(imprime).toMatchObject({ totalHT: 900, totalTVA: 126, totalTTC: 1026, remisePct: 0 });
  });
});

describe('basesParTaux', () => {
  it('bases avant et après remise', () => {
    expect(basesParTaux(devis({ remise: 10 }))).toEqual({ avant: { 10: 600, 20: 400 }, apres: { 10: 540, 20: 360 }, remisePct: 10 });
  });
});

describe('calculerTotaux', () => {
  it('HT + TVA = TTC au centime, même avec plusieurs taux et une remise', () => {
    for (let i = 0; i < 200; i++) {
      const l = [
        { description: 'a', quantite: 1 + (i % 7), prixUnitaire: 13.37 + i * 1.111, tva: 5.5 },
        { description: 'b', quantite: 2, prixUnitaire: 99.99 - i * 0.07, tva: 10 },
        { description: 'c', quantite: 3, prixUnitaire: 7.77 + i, tva: 20 },
      ];
      const t = calculerTotaux(l, { remisePct: i % 3 ? 7.5 : 0 });
      expect(arrondi(t.totalHT + t.totalTVA)).toBe(t.totalTTC);
      expect(arrondi(t.totalLignesHT - t.remiseMontant)).toBe(t.totalHT);
    }
  });
});
