import { describe, it, expect, vi } from 'vitest';
import { chargerUneFois } from '../site/chargerUneFois.js';

describe('chargerUneFois : un chargement à la demande pour toute la page', () => {
  it('lance la fabrique une seule fois et rend la même promesse aux appels suivants', async () => {
    const fabrique = vi.fn(() => Promise.resolve('module'));
    const charger = chargerUneFois(fabrique);
    const premier = charger();
    const second = charger();
    expect(second).toBe(premier);
    await expect(premier).resolves.toBe('module');
    await expect(charger()).resolves.toBe('module');
    expect(fabrique).toHaveBeenCalledTimes(1);
  });

  it('ne garde pas un échec : l’appel suivant retente, et réussit si le fichier revient', async () => {
    const fabrique = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('fichier introuvable')))
      .mockImplementationOnce(() => Promise.resolve('module'));
    const charger = chargerUneFois(fabrique);
    await expect(charger()).rejects.toThrow('fichier introuvable');
    await expect(charger()).resolves.toBe('module');
    await expect(charger()).resolves.toBe('module');
    expect(fabrique).toHaveBeenCalledTimes(2);
  });

  it('une fabrique qui lève tout de suite donne une promesse rejetée, pas une exception', async () => {
    const charger = chargerUneFois(() => { throw new Error('immédiat'); });
    await expect(charger()).rejects.toThrow('immédiat');
  });
});
