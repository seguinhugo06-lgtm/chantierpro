import { describe, it, expect } from 'vitest';
import { compteARebours } from '../EcheancesUi';
import { profilAdmin, tvaRegleeDansLaTresorerie } from '../../../lib/echeancesAdmin';

// Une obligation déjà entrée en vigueur (réception de la facture électronique depuis le 1er sept. 2026) n'est pas
// une échéance manquée : « En vigueur ». Une échéance ordinaire passée reste « Dépassée de N j » (relecture du 3 nov. 2026).
describe('compteARebours', () => {
  it('une obligation en vigueur depuis 63 jours affiche « En vigueur », sans alerte', () => {
    expect(compteARebours({ enVigueur: true, joursRestants: -63 })).toEqual({ texte: 'En vigueur', ton: 'neutre' });
  });

  it('contre-essai : une échéance ordinaire passée de 3 jours affiche « Dépassée de 3 j », en alerte', () => {
    expect(compteARebours({ joursRestants: -3 })).toEqual({ texte: 'Dépassée de 3 j', ton: 'danger' });
  });

  it('à venir : J-N ; sans date : rien', () => {
    expect(compteARebours({ enVigueur: true, joursRestants: 10 }).texte).toBe('J-10');
    expect(compteARebours({ joursRestants: null })).toBeNull();
  });
});

describe('tvaRegleeDansLaTresorerie (ligne « Régime de TVA : celui réglé dans la Trésorerie »)', () => {
  const EI = { formeJuridique: 'Entreprise individuelle (EI)' };
  it('franchise ou mensuel réglé dans la Trésorerie : le libellé de la Trésorerie', () => {
    expect(tvaRegleeDansLaTresorerie(profilAdmin(EI, {}, 'franchise'), 'franchise')).toBe('Franchise en base');
    expect(tvaRegleeDansLaTresorerie(profilAdmin(EI, {}, 'mensuel'), 'mensuel')).toBe('Réel normal (mensuel)');
  });

  it('contre-essai : trimestriel (valeur par défaut) ou rien, et micro-entreprise : pas de ligne', () => {
    expect(tvaRegleeDansLaTresorerie(profilAdmin(EI, {}, 'trimestriel'), 'trimestriel')).toBeNull();
    expect(tvaRegleeDansLaTresorerie(profilAdmin(EI, {}, null), null)).toBeNull();
    expect(tvaRegleeDansLaTresorerie(profilAdmin({ formeJuridique: 'Micro-entreprise' }, {}, 'franchise'), 'franchise')).toBeNull();
  });
});
