import { describe, it, expect, beforeEach } from 'vitest';
import { queueMutation, getPendingMutations, syncQueue, clearMutationsDe } from '../sync';

// Sans IndexedDB (environnement de test), la file passe par localStorage : on en fournit un.
beforeEach(() => {
  const donnees = new Map();
  globalThis.localStorage = {
    getItem: (k) => (donnees.has(k) ? donnees.get(k) : null),
    setItem: (k, v) => donnees.set(k, String(v)),
    removeItem: (k) => donnees.delete(k),
  };
});

const reseauCoupe = Object.assign(new Error('TypeError: Failed to fetch'), { status: 0 });
const refusBase = Object.assign(new Error('refus'), { status: 403, code: '42501' });

describe('file hors ligne', () => {
  it('ne rejoue que les écritures du compte connecté, dans l\'ordre', async () => {
    await queueMutation('create', 'clients', { id: 'a' }, 'A');
    await queueMutation('update', 'clients', { id: 'a', nom: 'X' }, 'A');
    await queueMutation('create', 'clients', { id: 'b' }, 'B');
    const vus = [];
    const r = await syncQueue(async (m) => { vus.push(`${m.action}:${m.data.id}`); return true; }, { proprietaire: 'A' });
    expect(vus).toEqual(['create:a', 'update:a']);
    expect(r.success).toBe(2);
    const reste = await getPendingMutations();
    expect(reste.map((m) => m.proprietaire)).toEqual(['B']); // l'écriture de B attend B
  });

  it('une coupure réseau ne supprime rien, et arrête la passe (la modification attend sa création)', async () => {
    await queueMutation('create', 'clients', { id: 'a' }, 'A');
    await queueMutation('update', 'clients', { id: 'a' }, 'A');
    const vus = [];
    for (let i = 0; i < 4; i++) {
      // eslint-disable-next-line no-await-in-loop
      await syncQueue(async (m) => { vus.push(m.action); throw reseauCoupe; }, { proprietaire: 'A' });
    }
    expect(vus.every((a) => a === 'create')).toBe(true);
    expect((await getPendingMutations()).length).toBe(2); // rien d'effacé après 4 passes en échec
  }, 20000);

  it('un refus de la base retire l\'écriture de la file et le signale', async () => {
    await queueMutation('create', 'clients', { id: 'a' }, 'A');
    const r = await syncQueue(async () => { throw refusBase; }, { proprietaire: 'A' });
    expect(r.cleared).toBe(1);
    expect(r.errors[0].permanent).toBe(true);
    expect((await getPendingMutations()).length).toBe(0);
  });

  it('une écriture sans compte propriétaire (ancienne version) n\'est jamais rejouée', async () => {
    await queueMutation('create', 'clients', { id: 'a' }, null);
    const vus = [];
    await syncQueue(async (m) => { vus.push(m); return true; }, { proprietaire: 'A' });
    expect(vus).toEqual([]);
    expect((await getPendingMutations()).length).toBe(0);
  });

  it('la purge ne touche que le compte connecté', async () => {
    await queueMutation('create', 'clients', { id: 'a' }, 'A');
    await queueMutation('create', 'clients', { id: 'b' }, 'B');
    expect(await clearMutationsDe('A')).toBe(1);
    expect((await getPendingMutations()).map((m) => m.proprietaire)).toEqual(['B']);
  });
});
