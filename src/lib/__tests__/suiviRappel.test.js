import { describe, it, expect, vi } from 'vitest';
import { suivreAvecEtat } from '../suiviRappel';

describe('rappel noté à la main : pas de faux succès', () => {
  it('« noté » seulement après une écriture réussie', async () => {
    const setFait = vi.fn();
    expect(await suivreAvecEtat(async () => true, 'r1', { rappel_canal: 'sms' }, setFait, 'sms')).toBe(true);
    expect(setFait).toHaveBeenCalledWith('sms');
  });
  it('contre-essai : écriture refusée (false), la carte garde son état', async () => {
    const setFait = vi.fn();
    expect(await suivreAvecEtat(async () => false, 'r1', { rappel_canal: 'sms' }, setFait, 'sms')).toBe(false);
    expect(setFait).not.toHaveBeenCalled();
  });
  it('l’état ne change qu’après la fin de l’écriture', async () => {
    const setFait = vi.fn();
    let finir;
    const p = suivreAvecEtat(() => new Promise((r) => { finir = r; }), 'r1', {}, setFait, 'sms');
    await Promise.resolve();
    expect(setFait).not.toHaveBeenCalled();
    finir(true);
    await p;
    expect(setFait).toHaveBeenCalledWith('sms');
  });
});
