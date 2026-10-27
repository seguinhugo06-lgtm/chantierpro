import { describe, it, expect } from 'vitest';
import {
  TAUX_INTERET_LEGAL_PRO_PAR_SEMESTRE, cleSemestre, tauxInteretLegal, minimumPenalites, libelleMinimumPenalites, tauxPenalitesValide,
} from '../tauxInteretLegal';

const lu = (t) => t.replace(/ /g, ' ');

// Avis juriste du 26 oct. 2026 (P2, R13) : un taux de pénalités sous 3 fois le taux d'intérêt légal ne s'enregistre pas.
describe('taux d\'intérêt légal et minimum des pénalités de retard (C. com. L441-10 II)', () => {
  it('2026 : 2,62 % puis 2,75 % ; minimum 7,86 % puis 8,25 %', () => {
    expect(tauxInteretLegal(new Date(2026, 2, 15))).toBe(2.62);
    expect(minimumPenalites(new Date(2026, 2, 15))).toBe(7.86);
    expect(tauxInteretLegal(new Date(2026, 9, 26))).toBe(2.75);
    expect(minimumPenalites(new Date(2026, 9, 26))).toBe(8.25);
  });

  it('le semestre se lit sur la date : 30 juin au 1er, 1er juillet au 2e', () => {
    expect(cleSemestre(new Date(2026, 5, 30))).toBe('2026-1');
    expect(cleSemestre(new Date(2026, 6, 1))).toBe('2026-2');
  });

  it('au-delà du dernier semestre connu : la dernière valeur connue', () => {
    expect(minimumPenalites(new Date(2028, 0, 10))).toBe(8.25);
    expect(lu(libelleMinimumPenalites(new Date(2028, 0, 10)))).toBe('8,25 % au 2e semestre 2026');
  });

  it('le libellé vient de la table', () => {
    expect(lu(libelleMinimumPenalites(new Date(2026, 9, 26)))).toBe('8,25 % au 2e semestre 2026');
    expect(lu(libelleMinimumPenalites(new Date(2026, 1, 1)))).toBe('7,86 % au 1er semestre 2026');
  });

  it('un taux sous le minimum est refusé ; vide (BCE + 10 points) ou au-dessus, accepté', () => {
    const oct = new Date(2026, 9, 26);
    expect(tauxPenalitesValide(1, oct)).toBe(false);
    expect(tauxPenalitesValide('8,24', oct)).toBe(false);
    expect(tauxPenalitesValide('8.25', oct)).toBe(true);
    expect(tauxPenalitesValide(12.4, oct)).toBe(true);
    expect(tauxPenalitesValide('', oct)).toBe(true);
    expect(tauxPenalitesValide(null, oct)).toBe(true);
    expect(tauxPenalitesValide('abc', oct)).toBe(false);
  });

  it('le semestre en cours est dans la table (à compléter chaque semestre, comme la BCE)', () => {
    expect(Object.keys(TAUX_INTERET_LEGAL_PRO_PAR_SEMESTRE)).toContain(cleSemestre(new Date()));
  });
});
