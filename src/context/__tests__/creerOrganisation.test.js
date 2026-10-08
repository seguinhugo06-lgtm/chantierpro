import { describe, it, expect, vi } from 'vitest';

// Le client Supabase de l'app n'est pas utilisé : on passe un faux client à la fonction.
vi.mock('../../supabaseClient', () => ({ supabase: null, isDemo: false, auth: {} }));

const { creerOrganisationParDefaut } = await import('../OrgContext');

describe('création de l’organisation par défaut au démarrage', () => {
  it('trois résolutions simultanées (inscription) n’envoient qu’une création', async () => {
    let fin;
    const rpc = vi.fn(() => new Promise((r) => { fin = r; }));
    const client = { rpc };
    const appels = [creerOrganisationParDefaut(client, 'u1'), creerOrganisationParDefaut(client, 'u1'), creerOrganisationParDefaut(client, 'u1')];
    await Promise.resolve();
    fin({ data: { org_id: 'o1', already_exists: false }, error: null });
    const resultats = await Promise.all(appels);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('create_default_org', { p_user_id: 'u1' });
    expect(resultats.every((r) => r.data.org_id === 'o1')).toBe(true);
  });

  it('une fois la création terminée, un nouvel appel repart (pas de résultat figé)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { org_id: 'o2', already_exists: true }, error: null });
    await creerOrganisationParDefaut({ rpc }, 'u2');
    await creerOrganisationParDefaut({ rpc }, 'u2');
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('deux comptes différents ne partagent pas la même création', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { org_id: 'x' }, error: null });
    await Promise.all([creerOrganisationParDefaut({ rpc }, 'a'), creerOrganisationParDefaut({ rpc }, 'b')]);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('une erreur ne bloque pas les essais suivants', async () => {
    const rpc = vi.fn().mockRejectedValueOnce(new Error('réseau')).mockResolvedValueOnce({ data: { org_id: 'o3' }, error: null });
    await expect(creerOrganisationParDefaut({ rpc }, 'u3')).rejects.toThrow('réseau');
    const r = await creerOrganisationParDefaut({ rpc }, 'u3');
    expect(r.data.org_id).toBe('o3');
  });
});
