import { describe, it, expect, beforeEach } from 'vitest';
import {
  choisirOrganisation, memoriserInvitation, invitationEnAttente, oublierInvitation,
  organisationPreferee, memoriserOrganisation,
} from '../organisationActive';

// Pas de navigateur dans les tests : un stockage local simulé, vidé avant chaque test
beforeEach(() => {
  const donnees = new Map();
  globalThis.localStorage = {
    getItem: (k) => (donnees.has(k) ? donnees.get(k) : null),
    setItem: (k, v) => donnees.set(k, String(v)),
    removeItem: (k) => donnees.delete(k),
  };
});

// Recette du 11 oct. 2026 : une ouvrière invitée arrivait dans un espace vide créé à l'inscription
// (la plus ancienne adhésion) au lieu de l'équipe qui l'avait invitée.

const PERSO = 'aaaaaaaa-0000-4000-8000-000000000001';
const EQUIPE = 'bbbbbbbb-0000-4000-8000-000000000002';
const AUTRE = 'cccccccc-0000-4000-8000-000000000003';
const JETON = 'd0299009-1111-4222-8333-444455556666';

describe('choisirOrganisation', () => {
  const perso = { organization_id: PERSO, role: 'owner', joined_at: '2026-10-11T11:06:16Z' };
  const equipe = { organization_id: EQUIPE, role: 'ouvrier', joined_at: '2026-10-11T11:06:36Z' };

  it('un invité ouvre l’équipe rejointe, pas son espace vide', () => {
    expect(choisirOrganisation([perso, equipe], null)).toBe(EQUIPE);
  });

  it('le choix fait sur l’appareil l’emporte, s’il est toujours membre', () => {
    expect(choisirOrganisation([perso, equipe], PERSO)).toBe(PERSO);
    // Retiré de l'équipe choisie : on n'ouvre pas une organisation dont il n'est plus membre
    expect(choisirOrganisation([perso], EQUIPE)).toBe(PERSO);
  });

  it('plusieurs équipes : la plus récemment rejointe', () => {
    const autre = { organization_id: AUTRE, role: 'chef_chantier', joined_at: '2026-10-12T08:00:00Z' };
    expect(choisirOrganisation([perso, equipe, autre], null)).toBe(AUTRE);
  });

  it('un gérant de plusieurs organisations garde la plus ancienne (règle de get_user_org_id)', () => {
    const recente = { organization_id: AUTRE, role: 'owner', joined_at: '2026-10-12T08:00:00Z' };
    expect(choisirOrganisation([recente, perso], null)).toBe(PERSO);
  });

  it('aucune adhésion : rien', () => {
    expect(choisirOrganisation([], null)).toBeNull();
    expect(choisirOrganisation(null, PERSO)).toBeNull();
  });
});

describe('invitation gardée pendant l’inscription', () => {
  it('garde le jeton, le nom de l’équipe et le rôle', () => {
    memoriserInvitation({ token: JETON, organisation: 'Hugo Elec', role: 'ouvrier' });
    expect(invitationEnAttente()).toEqual({ token: JETON, organisation: 'Hugo Elec', role: 'ouvrier' });
    oublierInvitation();
    expect(invitationEnAttente()).toBeNull();
  });

  it('lit l’ancien format (le jeton seul)', () => {
    localStorage.setItem('cp_pending_invitation', JETON);
    expect(invitationEnAttente()?.token).toBe(JETON);
  });

  it('refuse un jeton qui n’en est pas un (pas de redirection vers un chemin choisi)', () => {
    memoriserInvitation({ token: '../../connexion' });
    expect(invitationEnAttente()).toBeNull();
    localStorage.setItem('cp_pending_invitation', JSON.stringify({ token: '/x', le: Date.now() }));
    expect(invitationEnAttente()).toBeNull();
    expect(localStorage.getItem('cp_pending_invitation')).toBeNull();
  });

  it('oublie une invitation gardée depuis plus de 14 jours', () => {
    memoriserInvitation({ token: JETON });
    expect(invitationEnAttente(Date.now() + 15 * 24 * 3600 * 1000)).toBeNull();
  });
});

describe('organisation choisie sur l’appareil', () => {
  it('par compte', () => {
    memoriserOrganisation('u1', EQUIPE);
    expect(organisationPreferee('u1')).toBe(EQUIPE);
    expect(organisationPreferee('u2')).toBeNull();
    memoriserOrganisation('u1', 'pas-un-uuid');
    expect(organisationPreferee('u1')).toBe(EQUIPE);
  });
});
