import { describe, it, expect } from 'vitest';
import { statutClient, REGLE_CLIENT, statut } from '../statuts';

const MAINTENANT = new Date(2026, 9, 26, 10, 0).getTime();
const IL_Y_A = (jours) => new Date(MAINTENANT - jours * 86400000).toISOString();

describe('statut d’un client : une règle pour la liste, la fiche et les filtres', () => {
  it('un chantier en cours rend le client actif, même avec un devis en attente', () => {
    expect(statutClient({ chantiersEnCours: 1, devisActifs: 2 }, IL_Y_A(400), MAINTENANT)).toBe('actif');
  });

  it('un devis qui attend une réponse (sans chantier en cours) : en devis', () => {
    expect(statutClient({ devisActifs: 1, devis: 1 }, IL_Y_A(400), MAINTENANT)).toBe('en_devis');
  });

  it('créé il y a moins de 90 jours, sans devis ni chantier : prospect ; au-delà ou avec un document : plus prospect', () => {
    expect(statutClient({}, IL_Y_A(10), MAINTENANT)).toBe('prospect');
    expect(statutClient({}, IL_Y_A(89), MAINTENANT)).toBe('prospect');
    expect(statutClient({}, IL_Y_A(91), MAINTENANT)).toBe('inactif');
    expect(statutClient({ devis: 1 }, IL_Y_A(10), MAINTENANT)).toBe('inactif');
    expect(statutClient({ chantiers: 1 }, IL_Y_A(10), MAINTENANT)).toBe('inactif');
  });

  it('un chantier ni terminé ni archivé, mais pas « en cours » (un prospect de chantier), garde le client actif', () => {
    expect(statutClient({ chantiersActifs: 1, chantiers: 1 }, IL_Y_A(400), MAINTENANT)).toBe('actif');
  });

  it('ni chantier ni devis en cours : inactif — c’est le cas d’un client qui a tout payé', () => {
    expect(statutClient({ chantiers: 1, devis: 2 }, IL_Y_A(300), MAINTENANT)).toBe('inactif');
  });

  it('une date de création illisible ne fabrique pas un prospect', () => {
    expect(statutClient({}, 'pas une date', MAINTENANT)).toBe('inactif');
    expect(statutClient({}, undefined, MAINTENANT)).toBe('inactif');
  });

  it('chaque statut a son libellé, son ton et sa règle écrite', () => {
    for (const cle of ['actif', 'en_devis', 'prospect', 'inactif']) {
      expect(statut('client', cle).libelle).toBeTruthy();
      expect(REGLE_CLIENT[cle]).toMatch(/\.$/);
    }
  });
});
