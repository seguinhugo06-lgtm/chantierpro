import { describe, it, expect } from 'vitest';
import { pageLegaleDe } from '../pageLegale';

describe('pages légales à leur adresse (recette du 9 oct. 2026 : elles affichaient la vitrine)', () => {
  it('reconnaît les cinq adresses du sitemap et du pied de page', () => {
    expect(pageLegaleDe('/cgu')).toBe('cgu');
    expect(pageLegaleDe('/cgv/')).toBe('cgv');
    expect(pageLegaleDe('/mentions-legales')).toBe('mentions-legales');
    expect(pageLegaleDe('/confidentialite')).toBe('confidentialite');
    expect(pageLegaleDe('/accessibilite')).toBe('accessibilite');
  });

  it('rien d\'autre', () => {
    expect(pageLegaleDe('/')).toBeNull();
    expect(pageLegaleDe('/constructor')).toBeNull();
    expect(pageLegaleDe('/cgu/autre')).toBeNull();
    expect(pageLegaleDe('/fonctionnalites')).toBeNull();
  });
});
