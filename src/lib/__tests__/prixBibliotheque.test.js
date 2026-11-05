import { describe, it, expect } from 'vitest';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { aUnPrix, totalDuLot, metierSansPrix, PRIX_A_SAISIR } from '../templates/prixBibliotheque';

// Décision d'Hugo du 5 nov. 2026 (D-41, D-02 : prix de référence réels uniquement) : les prix posés le 4 nov. pour
// Ramonage, Froid et climatisation, Multiservice n'avaient aucune source. Ces trois métiers n'ont plus aucun prix :
// l'artisan saisit les siens. Les prix des autres métiers, présents avant ce lot, ne bougent pas.
const SANS_PRIX = ['ramonage', 'froid', 'multiservice'];
const lignesDe = (metier) => [...(metier.lots || []).flatMap((l) => l.lignes), ...(metier.prestations || [])];

describe('bibliothèque : Ramonage, Froid et climatisation, Multiservice sans prix (D-41)', () => {
  it('les trois métiers existent et ont des lots et des prestations (le balayage n’est pas vide)', () => {
    for (const k of SANS_PRIX) {
      expect(TRADE_LIBRARY[k], k).toBeTruthy();
      expect(TRADE_LIBRARY[k].lots.length, k).toBeGreaterThan(0);
      expect(TRADE_LIBRARY[k].prestations.length, k).toBeGreaterThan(0);
      expect(lignesDe(TRADE_LIBRARY[k]).length, k).toBeGreaterThan(8);
    }
  });

  it('aucune ligne de ces trois métiers n’a de prix supérieur à 0, ni de prix du tout', () => {
    for (const k of SANS_PRIX) {
      for (const l of lignesDe(TRADE_LIBRARY[k])) {
        expect(l.prixUnitaire ?? 0, `${k} — ${l.designation}`).not.toBeGreaterThan(0);
        expect('prixUnitaire' in l, `${k} — ${l.designation}`).toBe(false);
        expect(aUnPrix(l), `${k} — ${l.designation}`).toBe(false);
      }
    }
  });

  it('chaque ligne garde de quoi se chiffrer : désignation, unité, quantité et taux de TVA proposé', () => {
    for (const k of SANS_PRIX) {
      for (const l of lignesDe(TRADE_LIBRARY[k])) {
        expect(l.designation, k).toEqual(expect.any(String));
        expect(l.unite, `${k} — ${l.designation}`).toEqual(expect.any(String));
        expect(l.quantite, `${k} — ${l.designation}`).toBeGreaterThan(0);
        expect([10, 20], `${k} — ${l.designation}`).toContain(l.tva);
      }
    }
  });

  it('aucun lot de ces métiers n’a de total ; le métier est reconnu « sans prix »', () => {
    for (const k of SANS_PRIX) {
      for (const lot of TRADE_LIBRARY[k].lots) expect(totalDuLot(lot), `${k} — ${lot.nom}`).toBeNull();
      expect(metierSansPrix(TRADE_LIBRARY[k]), k).toBe(true);
    }
  });

  it('contre-essai : les dix-sept autres métiers gardent leurs prix, ligne par ligne', () => {
    const autres = Object.keys(TRADE_LIBRARY).filter((k) => !SANS_PRIX.includes(k));
    expect(autres).toHaveLength(17);
    for (const k of autres) {
      expect(metierSansPrix(TRADE_LIBRARY[k]), k).toBe(false);
      for (const l of lignesDe(TRADE_LIBRARY[k])) expect(aUnPrix(l), `${k} — ${l.designation}`).toBe(true);
      for (const lot of TRADE_LIBRARY[k].lots) expect(totalDuLot(lot), `${k} — ${lot.nom}`).toBeGreaterThan(0);
    }
  });

  it('contre-essai : une ligne qui aurait un prix est reconnue (le balayage voit un prix posé)', () => {
    const fautif = { ...TRADE_LIBRARY.ramonage, lots: TRADE_LIBRARY.ramonage.lots.map((l, i) => (i === 0 ? { ...l, lignes: l.lignes.map((x, j) => (j === 0 ? { ...x, prixUnitaire: 35 } : x)) } : l)) };
    expect(lignesDe(fautif).some((l) => (l.prixUnitaire ?? 0) > 0)).toBe(true);
    expect(metierSansPrix(fautif)).toBe(false);
  });
});

describe('prix d’une ligne de la bibliothèque : jamais « 0 € » ni « NaN » à la place d’un prix', () => {
  it('un prix est un nombre fini supérieur à 0', () => {
    expect(aUnPrix({ prixUnitaire: 45 })).toBe(true);
    expect(aUnPrix({ prixUnitaire: 0.6 })).toBe(true);
    for (const l of [{}, { prixUnitaire: 0 }, { prixUnitaire: -3 }, { prixUnitaire: NaN }, { prixUnitaire: null }, { prixUnitaire: '12' }, null, undefined]) expect(aUnPrix(l)).toBe(false);
  });

  it('le total d’un lot est la somme quantité × prix ; une ligne sans prix donne null, pas un total partiel', () => {
    expect(totalDuLot({ lignes: [{ quantite: 2, prixUnitaire: 10 }, { quantite: 1, prixUnitaire: 5.5 }] })).toBe(25.5);
    expect(totalDuLot({ lignes: [{ quantite: 2, prixUnitaire: 10 }, { quantite: 1 }] })).toBeNull();
    expect(totalDuLot({ lignes: [] })).toBeNull();
    expect(totalDuLot({})).toBeNull();
    expect(totalDuLot(null)).toBeNull();
  });

  it('l’écran dit « Prix à saisir »', () => {
    expect(PRIX_A_SAISIR).toBe('Prix à saisir');
  });
});
