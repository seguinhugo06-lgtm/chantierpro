import { describe, it, expect } from 'vitest';
import { lundiDe, dimancheDe, decompteHeures } from '../paie';

describe('lundiDe', () => {
  it('ramène une date au lundi de sa semaine', () => {
    expect(lundiDe('2026-10-09')).toBe('2026-10-05'); // vendredi → lundi
    expect(lundiDe('2026-10-05')).toBe('2026-10-05'); // lundi
    expect(lundiDe('2026-10-11')).toBe('2026-10-05'); // dimanche → lundi précédent
    expect(lundiDe('2026-11-01')).toBe('2026-10-26'); // à cheval sur deux mois
  });
});

describe('dimancheDe', () => {
  it('donne le dimanche de la semaine (rattachement au mois où elle finit)', () => {
    expect(dimancheDe('2026-10-09')).toBe('2026-10-11');
    expect(dimancheDe('2026-10-31')).toBe('2026-11-01'); // samedi 31 oct. : semaine du mois de novembre
    expect(dimancheDe('2026-11-01')).toBe('2026-11-01');
  });
});

describe('decompteHeures', () => {
  const jours = (lundi, heuresParJour) => heuresParJour.map((h, i) => {
    const [a, m, j] = lundi.split('-').map(Number);
    const d = new Date(a, m - 1, j + i);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, heures: h };
  });

  it('35 h dans la semaine : aucune heure supplémentaire', () => {
    expect(decompteHeures(jours('2026-10-05', [7, 7, 7, 7, 7]))).toMatchObject({ total: 35, normales: 35, sup25: 0, sup50: 0, jours: 5, semaines: 1 });
  });

  it('45 h dans la semaine : 8 h à 25 %, 2 h à 50 %', () => {
    expect(decompteHeures(jours('2026-10-05', [9, 9, 9, 9, 9]))).toMatchObject({ normales: 35, sup25: 8, sup50: 2 });
  });

  it('compte chaque semaine civile à part (pas de « semaine moyenne »)', () => {
    // 40 h une semaine, 30 h la suivante : 5 h supplémentaires, même si la moyenne est de 35 h.
    const pointages = [...jours('2026-10-05', [8, 8, 8, 8, 8]), ...jours('2026-10-12', [6, 6, 6, 6, 6])];
    expect(decompteHeures(pointages)).toMatchObject({ total: 70, normales: 65, sup25: 5, sup50: 0, semaines: 2 });
  });

  it('ignore les pointages sans date et ne casse pas sans pointage', () => {
    expect(decompteHeures([{ heures: 8 }])).toMatchObject({ total: 0, jours: 0 });
    expect(decompteHeures()).toMatchObject({ total: 0, normales: 0 });
  });
});
