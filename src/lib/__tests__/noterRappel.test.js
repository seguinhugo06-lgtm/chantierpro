import { describe, it, expect, vi } from 'vitest';
import { noterRappel } from '../noterRappel';

// RappelRamonage et RappelEntretien : « Rappel noté » ne s'affiche qu'après une écriture réussie
describe('noterRappel', () => {
  it('applique l’état seulement après l’écriture réussie (true ou écriture en attente)', async () => {
    const appliquer = vi.fn();
    let finir;
    const enCours = noterRappel(() => new Promise((r) => { finir = r; }), appliquer);
    // Pendant l'écriture, rien n'est affiché
    expect(appliquer).not.toHaveBeenCalled();
    finir(true);
    expect(await enCours).toBe(true);
    expect(appliquer).toHaveBeenCalledTimes(1);
    const enAttente = vi.fn();
    expect(await noterRappel(async () => ({ enAttente: true }), enAttente)).toBe(true);
    expect(enAttente).toHaveBeenCalledTimes(1);
  });
  it('contre-essai : écriture refusée (false), l’état ne change pas', async () => {
    const appliquer = vi.fn();
    expect(await noterRappel(async () => false, appliquer)).toBe(false);
    expect(appliquer).not.toHaveBeenCalled();
  });
});
