import { describe, it, expect } from 'vitest';
import { jourLocal, ajouterMois, dateLue, estCeMois } from '../dates';

describe('dateLue : une date « AAAA-MM-JJ » est ce jour-là, partout', () => {
  it('lue en heure locale (new Date la lit à minuit UTC : la veille outre-mer)', () => {
    const d = dateLue('2026-10-31');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 31, 0]);
  });
  it('un horodatage ou une Date : comme new Date', () => {
    expect(dateLue('2026-10-31T10:00:00Z').getTime()).toBe(new Date('2026-10-31T10:00:00Z').getTime());
    const x = new Date(2026, 0, 2);
    expect(dateLue(x).getTime()).toBe(x.getTime());
    expect(Number.isNaN(dateLue('').getTime())).toBe(true);
  });
});

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

// Relecture du 26 oct. 2026 : Équipe comptait dans « ce mois » un pointage du même mois d'une autre année.
describe('estCeMois : même année et même mois', () => {
  const oct2026 = new Date(2026, 9, 26);
  it('octobre 2026 oui, octobre 2025 non, septembre 2026 non', () => {
    expect(estCeMois('2026-10-03', oct2026)).toBe(true);
    expect(estCeMois('2025-10-03', oct2026)).toBe(false);
    expect(estCeMois('2026-09-30', oct2026)).toBe(false);
  });
  it('un « AAAA-MM-JJ » du 1er du mois reste du mois (lu en heure locale)', () => {
    expect(estCeMois('2026-10-01', oct2026)).toBe(true);
  });
});
