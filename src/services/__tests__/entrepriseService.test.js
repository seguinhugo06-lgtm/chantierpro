import { describe, it, expect } from 'vitest';
import { fromSupabase, toSupabase, REGLAGES_SANS_COLONNE, createEntreprise, updateEntreprise, archiveEntreprise, setActiveEntreprise } from '../entrepriseService';

// Ligne de production telle que relue : assurances anciennes, réglages déjà rangés dans settings_json
const LIGNE = {
  id: 'e1', nom: 'Élec Durand', decennale_assureur: 'AXA Ancien', decennale_numero: 'D-OLD', decennale_validite: '2026-01-01',
  rc_pro_assureur: 'MAAF Ancien', settings_json: { relanceConfig: { enabled: true }, reglages: { mediateur: 'CNPM', acompteDefaut: 40 } },
};

describe('entreprise : ce qui est saisi dans les Paramètres revient au rechargement', () => {
  it('assurances : la nouvelle valeur l\'emporte sur l\'alias relu (avant : l\'ancienne réécrasait la saisie)', () => {
    // Paramètres envoie l'objet complet ({...prev, decennaleAssureur: 'SMABTP'}), alias relus compris
    const envoye = toSupabase({ ...fromSupabase(LIGNE), decennaleAssureur: 'SMABTP', decennaleNumero: 'D-NEW', rcProAssureur: 'AXA Pro' });
    expect(envoye.decennale_assureur).toBe('SMABTP');
    expect(envoye.decennale_numero).toBe('D-NEW');
    expect(envoye.rc_pro_assureur).toBe('AXA Pro');
  });

  it('un formulaire qui n\'envoie que les alias (Multi-entreprise) écrit toujours', () => {
    expect(toSupabase({ assuranceDecennaleCompagnie: 'SMABTP' }).decennale_assureur).toBe('SMABTP');
  });

  it('réglages sans colonne : relus depuis settings_json.reglages, avec leurs valeurs par défaut', () => {
    const e = fromSupabase(LIGNE);
    expect(e.mediateur).toBe('CNPM');
    expect(e.acompteDefaut).toBe(40);
    expect(e.mentionGaranties).toBe(true); // défaut
    expect(e).not.toHaveProperty('mentionRetractation'); // plus de réglage : obligatoire pour un particulier
    expect(e.tauxPenalites).toBe(''); // défaut : le taux légal s'applique
  });

  it('réglages sans colonne : regroupés pour l\'écriture, jamais envoyés comme colonnes', () => {
    const envoye = toSupabase({ ...fromSupabase(LIGNE), rcsNumero: '123 456 789', tauxPenalites: 15, banque: 'Crédit Agricole', mentionGaranties: false });
    expect(envoye.__reglages).toMatchObject({ rcsNumero: '123 456 789', tauxPenalites: 15, banque: 'Crédit Agricole', mentionGaranties: false });
    for (const cle of Object.keys(REGLAGES_SANS_COLONNE)) expect(envoye).not.toHaveProperty(cle);
    expect(envoye).not.toHaveProperty('acompte_defaut'); // colonne inexistante en production
  });

  it('travaux non soumis à la décennale (D-24) : non par défaut, la case cochée est écrite puis relue', () => {
    expect(fromSupabase(LIGNE).decennaleNonSoumis).toBe(false);
    expect(toSupabase({ ...fromSupabase(LIGNE), decennaleNonSoumis: true }).__reglages).toMatchObject({ decennaleNonSoumis: true });
    expect(fromSupabase({ ...LIGNE, settings_json: { reglages: { decennaleNonSoumis: true } } }).decennaleNonSoumis).toBe(true);
  });

  // Fiche d'un compte neuf, « Ajouter une entreprise » : `acompteDefaut` suffisait à envoyer la colonne inexistante
  // `__reglages`, et la base refusait l'insertion (défaut de a41a1c1, trouvé le 10 oct. 2026)
  it('création : aucune colonne __reglages, les réglages vont dans settings_json.reglages', async () => {
    let insere;
    const faux = {
      from: () => ({
        select: () => ({ is: () => ({ order: () => ({ order: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }) }) }),
        insert: (ligne) => { insere = ligne; return { select: () => ({ single: () => Promise.resolve({ data: { id: 'n1', ...ligne }, error: null }) }) }; },
      }),
    };
    const cree = await createEntreprise(faux, { data: { nom: 'Élec Durand', acompteDefaut: 30, decennaleNonSoumis: true }, userId: 'u1', orgId: 'o1' });
    expect(insere).not.toHaveProperty('__reglages');
    expect(insere.settings_json).toEqual({ reglages: { acompteDefaut: 30, decennaleNonSoumis: true } });
    expect(insere.nom).toBe('Élec Durand');
    expect(cree.acompteDefaut).toBe(30);
    expect(cree.decennaleNonSoumis).toBe(true);
  });
});

// Faux client Supabase : enregistre chaque écriture (valeurs, filtres) ; une écriture suivie de `.select()` renvoie
// `lignesEcrites` (une ligne = accepté, aucune = refus RLS, qui ne lève pas d'erreur) ; une lecture renvoie `liste`
const fauxSupabase = ({ lignesEcrites = [{ id: 'e1' }], liste = [] } = {}) => {
  const ecritures = [];
  const lecture = () => {
    const b = { is: () => b, order: () => b, eq: () => b, then: (ok, ko) => Promise.resolve({ data: liste, error: null }).then(ok, ko) };
    return b;
  };
  const ecriture = (valeurs) => {
    const e = { valeurs, filtres: [] };
    ecritures.push(e);
    const b = {
      eq: (c, v) => { e.filtres.push(['eq', c, v]); return b; },
      neq: (c, v) => { e.filtres.push(['neq', c, v]); return b; },
      select: () => Promise.resolve({ data: lignesEcrites, error: null }),
      then: (ok, ko) => Promise.resolve({ data: null, error: null }).then(ok, ko),
    };
    return b;
  };
  return { ecritures, from: () => ({ select: lecture, update: ecriture }) };
};

describe('entreprise : une écriture refusée par la base ne s\'affiche pas comme faite (105, 24 oct. 2026)', () => {
  it('modification : par la fiche seule, la base décide (le patron modifie une fiche créée par un autre membre)', async () => {
    const faux = fauxSupabase();
    await updateEntreprise(faux, { id: 'e1', data: { nom: 'Élec Durand' } });
    expect(faux.ecritures[0].filtres).toEqual([['eq', 'id', 'e1']]);
  });

  it('modification refusée (0 ligne, sans erreur) : une erreur, pas « enregistré »', async () => {
    await expect(updateEntreprise(fauxSupabase({ lignesEcrites: [] }), { id: 'e1', data: { nom: 'X' } })).rejects.toThrow(/refusée/);
  });

  it('activation refusée : une erreur, et les autres fiches ne sont pas désactivées', async () => {
    const faux = fauxSupabase({ lignesEcrites: [] });
    await expect(setActiveEntreprise(faux, { id: 'e2', userId: 'u1', orgId: 'o1' })).rejects.toThrow(/Activation refusée/);
    expect(faux.ecritures.filter((e) => e.valeurs.is_active === false)).toHaveLength(0);
  });

  it('activation acceptée : la fiche choisie, puis les autres de l\'organisation désactivées', async () => {
    const faux = fauxSupabase();
    await setActiveEntreprise(faux, { id: 'e2', userId: 'u1', orgId: 'o1' });
    expect(faux.ecritures[0]).toMatchObject({ valeurs: { is_active: true }, filtres: [['eq', 'id', 'e2']] });
    expect(faux.ecritures[1]).toMatchObject({ valeurs: { is_active: false }, filtres: [['neq', 'id', 'e2'], ['eq', 'organization_id', 'o1']] });
  });

  it('archivage refusé : une erreur, pas « archivée »', async () => {
    const liste = [{ id: 'e1', nom: 'A', is_active: false }, { id: 'e2', nom: 'B', is_active: true }];
    await expect(archiveEntreprise(fauxSupabase({ lignesEcrites: [], liste }), { id: 'e1', userId: 'u1', orgId: 'o1' })).rejects.toThrow(/Archivage refusé/);
  });
});
