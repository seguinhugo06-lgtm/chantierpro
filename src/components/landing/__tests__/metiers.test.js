import { describe, it, expect } from 'vitest';
import { TRADE_LIBRARY } from '../../../lib/templates/trade-library.js';
import { METIER_INITIAL, apercuDuLot, lotsMontres, metiersDeLaBibliotheque, metierVoisin } from '../metiers.js';

describe('explorateur des métiers — logique', () => {
  it('liste les 17 métiers de la bibliothèque, dans son ordre', () => {
    const metiers = metiersDeLaBibliotheque(TRADE_LIBRARY);
    expect(metiers).toHaveLength(17);
    expect(metiers.map((m) => m.id)).toEqual(Object.keys(TRADE_LIBRARY));
    expect(metiers.find((m) => m.id === 'electricite')).toEqual({ id: 'electricite', nom: 'Électricité' });
  });

  it('commence par Électricité, qui existe dans la bibliothèque', () => {
    expect(METIER_INITIAL).toBe('electricite');
    expect(TRADE_LIBRARY[METIER_INITIAL]).toBeDefined();
  });

  it('résume un lot : nombre de lignes, total HT arrondi à l\'euro, trois premières lignes avec leur montant', () => {
    const lot = {
      id: 'x',
      nom: 'Peinture d\'une pièce',
      resume: 'Murs et plafond',
      lignes: [
        { designation: 'Préparation', unite: 'm²', quantite: 3, prixUnitaire: 10.5, tva: 10 },
        { designation: 'Sous-couche', unite: 'm²', quantite: 50, prixUnitaire: 4.5, tva: 10 },
        { designation: 'Deux couches', unite: 'm²', quantite: 0.1, prixUnitaire: 3, tva: 10 },
        { designation: 'Plinthes', unite: 'ml', quantite: 10, prixUnitaire: 200, tva: 10 },
      ],
    };
    // 31,5 + 225 + 0,3 + 2 000 = 2 256,8 → 2 257
    expect(apercuDuLot(lot)).toEqual({
      id: 'x',
      nom: 'Peinture d\'une pièce',
      resume: 'Murs et plafond',
      nbLignes: 4,
      totalHT: 2257,
      lignes: [
        { designation: 'Préparation', montant: 32 },
        { designation: 'Sous-couche', montant: 225 },
        { designation: 'Deux couches', montant: 0 },
      ],
    });
  });

  it('arrondit sans l\'erreur du binaire (1,005 × 1 000 = 1 005, pas 1 004)', () => {
    const lot = { id: 'y', nom: 'y', lignes: [{ designation: 'a', quantite: 1000, prixUnitaire: 1.0045, tva: 20 }] };
    expect(apercuDuLot(lot).totalHT).toBe(1005);
    expect(apercuDuLot(lot).resume).toBe('');
  });

  it('montre les trois premiers lots du métier choisi, lus dans la bibliothèque', () => {
    const lots = lotsMontres(TRADE_LIBRARY, 'plomberie');
    expect(lots.map((l) => l.nom)).toEqual(TRADE_LIBRARY.plomberie.lots.slice(0, 3).map((l) => l.nom));
    for (const l of lots) expect(l.totalHT).toBeGreaterThan(0);
    expect(lotsMontres(TRADE_LIBRARY, 'inconnu')).toEqual([]);
  });

  it('passe d\'un métier à l\'autre au clavier, en boucle', () => {
    const ids = ['a', 'b', 'c'];
    expect(metierVoisin(ids, 'a', 'ArrowRight')).toBe('b');
    expect(metierVoisin(ids, 'c', 'ArrowRight')).toBe('a');
    expect(metierVoisin(ids, 'a', 'ArrowLeft')).toBe('c');
    expect(metierVoisin(ids, 'b', 'Home')).toBe('a');
    expect(metierVoisin(ids, 'a', 'End')).toBe('c');
    expect(metierVoisin(ids, 'a', 'ArrowDown')).toBeNull();
    expect(metierVoisin(ids, 'a', 'Enter')).toBeNull();
  });
});
