import { describe, it, expect } from 'vitest';
import { calculerTotaux } from '../totauxDocument';

// Tâche totaux-arrondis (relecture juridique du 9 oct. 2026) : tous les chemins de création (éditeur, Devis
// Express, assistant par métier, formulaire intégré, avoirs) enregistrent les totaux de calculerTotaux.
// Propriété : HT + TVA = TTC au centime, et les taux additionnés redonnent HT et TVA (règle EN 16931 BR-CO-15),
// quel que soit le mélange de taux, de quantités décimales et de remise.
describe('calculerTotaux : propriété au centime sur des devis tirés au hasard', () => {
  // Générateur déterministe (le même tirage à chaque exécution)
  let graine = 20261016;
  const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
  const taux = [0, 5.5, 10, 20];
  const centimes = (n) => Math.round(n * 100);

  it('HT + TVA = TTC et les taux s’additionnent, sur 3 000 devis', () => {
    for (let i = 0; i < 3000; i++) {
      const lignes = Array.from({ length: 1 + Math.floor(hasard() * 8) }, (_, k) => ({
        description: `Ligne ${k}`,
        quantite: Math.round(hasard() * 1000) / 100,
        prixUnitaire: Math.round(hasard() * 50000) / 100,
        tva: taux[Math.floor(hasard() * taux.length)],
      }));
      const remisePct = hasard() < 0.3 ? Math.round(hasard() * 150) / 10 : 0;
      const t = calculerTotaux(lignes, { remisePct, tauxDefaut: 20 });
      expect(centimes(t.totalHT) + centimes(t.totalTVA)).toBe(centimes(t.totalTTC));
      const parTaux = Object.values(t.tvaParTaux);
      expect(parTaux.reduce((s, x) => s + centimes(x.base), 0)).toBe(centimes(t.totalHT));
      expect(parTaux.reduce((s, x) => s + centimes(x.montant), 0)).toBe(centimes(t.totalTVA));
    }
  });

  it('montants négatifs (avoir) : même propriété', () => {
    const t = calculerTotaux([
      { description: 'a', quantite: 3, prixUnitaire: -33.33, tva: 20 },
      { description: 'b', quantite: 1, prixUnitaire: -10.05, tva: 5.5 },
    ], { tauxDefaut: 20 });
    expect(centimes(t.totalHT) + centimes(t.totalTVA)).toBe(centimes(t.totalTTC));
    expect(t.totalTTC).toBeLessThan(0);
  });

  it('franchise : jamais de TVA, TTC = HT', () => {
    const t = calculerTotaux([
      { description: 'a', quantite: 3, prixUnitaire: 33.33, tva: 20 },
      { description: 'b', quantite: 1, prixUnitaire: 10, tva: 10 },
    ], { franchise: true });
    expect(t.totalTVA).toBe(0);
    expect(t.totalTTC).toBe(t.totalHT);
  });

  it('un taux 0 reste 0 (Devis Express lisait « l.tva || défaut »)', () => {
    const t = calculerTotaux([{ description: 'a', quantite: 1, prixUnitaire: 100, tva: 0 }], { tauxDefaut: 10 });
    expect(t.totalTVA).toBe(0);
  });
});
