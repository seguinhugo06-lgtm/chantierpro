import { describe, it, expect, vi } from 'vitest';
import { listerFichiers, viderDossier, messageErreurSuppression, supprimerMonCompte } from '../suppressionCompte';

// Faux Storage en mémoire : { seau: Set(chemins) }, avec option « remove silencieusement refusé ».
function fauxStorage(fichiers, { refuserRemove = false, seauxAbsents = [] } = {}) {
  const contenu = Object.fromEntries(Object.entries(fichiers).map(([s, l]) => [s, new Set(l)]));
  return {
    from(seau) {
      return {
        async list(dossier) {
          if (seauxAbsents.includes(seau)) return { data: null, error: { message: 'Bucket not found' } };
          const enfants = new Map();
          for (const c of contenu[seau] || []) {
            if (!c.startsWith(`${dossier}/`)) continue;
            const [nom, ...reste] = c.slice(dossier.length + 1).split('/');
            enfants.set(nom, reste.length ? { name: nom, id: null } : { name: nom, id: `id-${c}` });
          }
          return { data: [...enfants.values()], error: null };
        },
        async remove(chemins) {
          if (!refuserRemove) chemins.forEach((c) => contenu[seau]?.delete(c));
          return { data: [], error: null }; // comme Supabase : pas d'erreur même si la règle refuse
        },
      };
    },
    contenu,
  };
}

describe('listerFichiers', () => {
  it('descend dans les sous-dossiers', async () => {
    const s = fauxStorage({ photos: ['u1/c1/a.jpg', 'u1/c1/b.jpg', 'u1/c2/x/y.jpg', 'u2/c9/z.jpg'] });
    expect((await listerFichiers(s, 'photos', 'u1')).sort()).toEqual(['u1/c1/a.jpg', 'u1/c1/b.jpg', 'u1/c2/x/y.jpg']);
  });
});

describe('viderDossier', () => {
  it('supprime les fichiers de l’utilisateur et seulement eux', async () => {
    const s = fauxStorage({ photos: ['u1/c1/a.jpg', 'u2/c9/z.jpg'] });
    expect(await viderDossier(s, 'photos', 'u1')).toEqual([]);
    expect([...s.contenu.photos]).toEqual(['u2/c9/z.jpg']);
  });

  it('détecte un refus silencieux et renvoie ce qui reste', async () => {
    const s = fauxStorage({ photos: ['u1/c1/a.jpg'] }, { refuserRemove: true });
    expect(await viderDossier(s, 'photos', 'u1')).toEqual(['photos/u1/c1/a.jpg']);
  });

  it('ignore un seau qui n’existe pas', async () => {
    const s = fauxStorage({}, { seauxAbsents: ['chat'] });
    expect(await viderDossier(s, 'chat', 'u1')).toEqual([]);
  });
});

describe('supprimerMonCompte', () => {
  it('passe les fichiers restants à la RPC et remonte son erreur', async () => {
    const storage = fauxStorage({ 'chantier-photos': ['u1/c/a.jpg'] }, { refuserRemove: true });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'ABONNEMENT_ACTIF' } });
    await expect(supprimerMonCompte({ supabase: { storage, rpc }, userId: 'u1', orgIdProprietaire: null }))
      .rejects.toMatchObject({ message: 'ABONNEMENT_ACTIF' });
    expect(rpc).toHaveBeenCalledWith('supprimer_mon_compte', {
      p_simulation: false, p_fichiers_restants: ['chantier-photos/u1/c/a.jpg'],
    });
  });

  it('renvoie le bilan en cas de succès', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { lignes_supprimees: 42 }, error: null });
    const bilan = await supprimerMonCompte({ supabase: { storage: fauxStorage({}), rpc }, userId: 'u1', orgIdProprietaire: 'o1' });
    expect(bilan.lignes_supprimees).toBe(42);
  });
});

describe('messageErreurSuppression', () => {
  it('explique chaque refus', () => {
    expect(messageErreurSuppression({ message: 'ABONNEMENT_ACTIF' })).toMatch(/Résiliez-le/);
    expect(messageErreurSuppression({ message: 'EQUIPE_ACTIVE' })).toMatch(/équipe/);
    expect(messageErreurSuppression({ code: 'PGRST202', message: 'Could not find the function public.supprimer_mon_compte' }))
      .toMatch(/pas encore activée/);
    expect(messageErreurSuppression({ message: 'SUPPRESSION_INCOMPLETE: devis_lignes' })).toMatch(/rien n’a été effacé/);
  });
});
