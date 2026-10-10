import { describe, it, expect } from 'vitest';
import { jourLocal, ajouterMois } from '../dates';

describe('dates en heure locale', () => {
  it('jourLocal : le jour de l’appareil', () => {
    expect(jourLocal(new Date(2026, 9, 10, 0, 30))).toBe('2026-10-10'); // minuit et demi : pas la veille
  });

  it('ajouterMois : une mensualité du 31 tombe le dernier jour des mois courts, sans sauter de mois', () => {
    expect([1, 2, 3, 4].map((n) => ajouterMois('2026-10-31', n))).toEqual(['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
    expect(ajouterMois('2027-01-29', 1)).toBe('2027-02-28');
    expect(ajouterMois('2028-01-29', 1)).toBe('2028-02-29'); // année bissextile
    expect(ajouterMois('2026-11-15', 3)).toBe('2027-02-15'); // trimestriel
    expect(ajouterMois('', 1)).toBe('');
  });
});
