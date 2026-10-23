import { describe, it, expect } from 'vitest';
import {
  appareilsDuClient, rappelsDus, nbDansAnnee, prochainParDefaut, horsDelaiDouzeMois, manquants, nouveauBrouillon,
  texteSms, lienSms, ligneFacture, conseilsExiges, estFoyerFermeSolide, ramonagePrecedent, jourDuRappel, tarifPour,
  descriptionAppareil,
} from '../ramonage';

// Données fictives seulement
const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', adresse: '3 chemin de l’Exemple, 24000 Imaginaire', telephone: '06 00 00 00 01', email: 'lucie@exemple.fr' };
const passage = (o) => ({
  id: o.id, client_id: 'c1', appareil_ref: o.ref || 'a1', realise_le: o.le, prochain_avant: o.prochain,
  appareil_type: 'poele_bois', combustible: 'bois', conduit: 'tube_chemise', localisation: 'Salon', prix_ht: 90,
  numero: o.numero || null, annulee_le: o.annulee || null, rappel_fait_le: o.fait || null,
});

describe('ramonage — dates', () => {
  it('propose le prochain ramonage douze mois après le passage, jour pour jour', () => {
    expect(prochainParDefaut('2026-10-19T12:00:00')).toBe('2027-10-19');
    expect(prochainParDefaut('2026-10-19T12:00:00', 6)).toBe('2027-04-19');
  });

  it('signale une date au-delà de douze mois, sans la refuser', () => {
    expect(horsDelaiDouzeMois('2026-10-19T12:00:00', '2027-10-19')).toBe(false);
    expect(horsDelaiDouzeMois('2026-10-19T12:00:00', '2027-10-20')).toBe(true);
  });

  it('rappel dû à partir de « prochain − délai »', () => {
    expect(jourDuRappel({ prochain_avant: '2027-10-19' })).toBe('2027-09-19');
    expect(jourDuRappel({ prochain_avant: '2027-10-19' }, 15)).toBe('2027-10-04');
  });
});

describe('ramonage — fiche des appareils', () => {
  const ramonages = [
    passage({ id: 'r1', le: '2025-10-10T09:00:00', prochain: '2026-10-10' }),
    passage({ id: 'r2', le: '2026-10-19T14:00:00', prochain: '2027-10-19' }),
    passage({ id: 'r3', le: '2026-10-20T14:00:00', prochain: '2027-10-20', annulee: '2026-10-20T15:00:00' }),
    passage({ id: 'r4', ref: 'a2', le: '2026-03-01T10:00:00', prochain: '2027-03-01' }),
    { ...passage({ id: 'x', ref: 'ax', le: '2026-01-01T10:00:00', prochain: '2027-01-01' }), client_id: 'autre' },
  ];

  it('liste chaque appareil avec son dernier passage non annulé et tout l’historique', () => {
    const appareils = appareilsDuClient(ramonages, 'c1');
    expect(appareils.map((a) => a.appareil_ref)).toEqual(['a1', 'a2']);
    expect(appareils[0].dernier.id).toBe('r2');
    expect(appareils[0].passages.map((p) => p.id)).toEqual(['r3', 'r2', 'r1']);
  });

  it('compte les ramonages de l’appareil dans l’année civile, annulés exclus', () => {
    expect(nbDansAnnee(ramonages, 'a1', '2026-12-01T10:00:00')).toBe(2);
    expect(nbDansAnnee(ramonages, 'a1', '2027-01-05T10:00:00')).toBe(1);
  });

  it('retrouve le dernier ramonage connu avant celui-ci', () => {
    expect(ramonagePrecedent(ramonages, ramonages[1]).id).toBe('r1');
    expect(ramonagePrecedent(ramonages, ramonages[0])).toBeNull();
  });
});

describe('ramonage — rappels dus', () => {
  const ramonages = [
    passage({ id: 'r1', le: '2025-10-10T09:00:00', prochain: '2026-10-10' }),
    passage({ id: 'r2', le: '2026-10-19T14:00:00', prochain: '2027-10-19' }),
    passage({ id: 'r4', ref: 'a2', le: '2025-11-20T10:00:00', prochain: '2026-11-20' }),
  ];

  it('seulement le dernier passage de chaque appareil, à partir de la date du rappel', () => {
    const dus = rappelsDus(ramonages, [client], { jours: 30, aujourdhui: '2026-10-25' });
    expect(dus.map((d) => d.ramonage.id)).toEqual(['r4']);
    expect(dus[0].joursRestants).toBe(26);
    expect(dus[0].enRetard).toBe(false);
    expect(rappelsDus(ramonages, [client], { jours: 30, aujourdhui: '2026-10-20' })).toEqual([]);
  });

  it('ni rappel fait, ni client qui a refusé, ni client supprimé', () => {
    expect(rappelsDus([{ ...ramonages[2], rappel_fait_le: '2026-10-21T08:00:00' }], [client], { aujourdhui: '2026-10-25' })).toEqual([]);
    expect(rappelsDus(ramonages, [{ ...client, rappels_refuses_le: '2026-01-01T00:00:00' }], { aujourdhui: '2026-10-25' })).toEqual([]);
    expect(rappelsDus(ramonages, [], { aujourdhui: '2026-10-25' })).toEqual([]);
  });

  it('un passage annulé ne cache pas le précédent', () => {
    const avecAnnule = [...ramonages, passage({ id: 'r5', ref: 'a2', le: '2026-10-22T10:00:00', prochain: '2027-10-22', annulee: '2026-10-22T11:00:00' })];
    expect(rappelsDus(avecAnnule, [client], { aujourdhui: '2026-10-25' }).map((d) => d.ramonage.id)).toEqual(['r4']);
  });

  it('en retard après la date', () => {
    const [d] = rappelsDus(ramonages, [client], { aujourdhui: '2026-11-25' });
    expect(d.enRetard).toBe(true);
    expect(d.joursRestants).toBe(-5);
  });
});

describe('ramonage — avant d’enregistrer', () => {
  const complet = {
    client_nom: 'Lucie Exemple', adresse_intervention: '3 chemin', qualite_client: 'proprietaire', appareil_type: 'poele_bois',
    combustible: 'bois', conduit: 'tube_chemise', realise_le: '2026-10-19T14:00:00', intervenant_nom: 'Jean Exemple',
    methode: 'mecanique_rotative', vacuite: 'assuree', conseils: { choix: ['usage'], texte: '' }, prochain_avant: '2027-10-19',
  };

  it('accepte une attestation complète', () => {
    expect(manquants(complet)).toEqual([]);
  });

  it('exige la vacuité, choisie par le professionnel, et sa précision si elle n’est pas assurée', () => {
    expect(manquants({ ...complet, vacuite: '' }).map((m) => m.champ)).toEqual(['vacuite']);
    expect(manquants({ ...complet, vacuite: 'conforme' }).map((m) => m.champ)).toEqual(['vacuite']);
    expect(manquants({ ...complet, vacuite: 'non_assuree' }).map((m) => m.champ)).toEqual(['vacuite_precision']);
  });

  it('exige les conseils pour un combustible solide, pas pour le gaz ni une chaudière', () => {
    expect(manquants({ ...complet, conseils: { choix: [], texte: '' } }).map((m) => m.champ)).toEqual(['conseils']);
    expect(manquants({ ...complet, conseils: { choix: [], texte: 'Bois trop humide' } })).toEqual([]);
    expect(conseilsExiges({ combustible: 'gaz', appareil_type: 'autre' })).toBe(false);
    expect(conseilsExiges({ combustible: 'bois', appareil_type: 'chaudiere' })).toBe(false);
    expect(conseilsExiges({ combustible: 'granules', appareil_type: 'poele_granules' })).toBe(true);
  });

  it('refuse un prochain ramonage qui n’est pas après le passage', () => {
    expect(manquants({ ...complet, prochain_avant: '2026-10-19' }).map((m) => m.champ)).toEqual(['prochain_avant']);
  });

  it('reconnaît un foyer fermé à combustible solide (mention « ne vaut pas attestation d’entretien »)', () => {
    expect(estFoyerFermeSolide({ combustible: 'bois', appareil_type: 'insert' })).toBe(true);
    expect(estFoyerFermeSolide({ combustible: 'bois', appareil_type: 'cheminee_ouverte' })).toBe(false);
    expect(estFoyerFermeSolide({ combustible: 'fioul', appareil_type: 'poele_bois' })).toBe(false);
  });
});

describe('ramonage — brouillon, SMS et facture', () => {
  it('reprend du dernier passage l’appareil, le lieu et le prix, jamais les constats', () => {
    const precedent = { ...passage({ id: 'r2', le: '2026-10-19T14:00:00', prochain: '2027-10-19' }), qualite_client: 'locataire',
      adresse_intervention: '3 chemin', vacuite: 'assuree', constats: { depots: 'normaux' }, observations: 'RAS', methode: 'mecanique_rotative' };
    const b = nouveauBrouillon({ client, precedent, maintenant: new Date('2027-10-01T10:00:00') });
    expect(b.appareil_ref).toBe('a1');
    expect(b.appareil_type).toBe('poele_bois');
    expect(b.prix_ht).toBe(90);
    expect(b.qualite_client).toBe('locataire');
    expect(b.vacuite).toBe('');
    expect(b.methode).toBe('');
    expect(b.constats).toEqual({});
    expect(b.observations).toBe('');
    expect(b.prochain_avant).toBe('2028-10-01');
    expect(b.client_nom).toBe('Lucie Exemple');
  });

  it('nouvel appareil : prend le tarif réglé pour son type quand il est connu', () => {
    const b = nouveauBrouillon({ client, entreprise: { ramonageTarifs: { insert: 110 } }, maintenant: new Date('2026-10-01T10:00:00') });
    expect(b.appareil_ref).toMatch(/^[0-9a-f-]{36}$/);
    expect(b.adresse_intervention).toBe(client.adresse);
    expect(b.prix_ht).toBeNull();
    expect(tarifPour({ ramonageTarifs: { insert: 110 } }, 'insert')).toBe(110);
    expect(tarifPour({ ramonageTarifs: { insert: '' } }, 'insert')).toBeNull();
  });

  it('SMS : objet, identité, date du dernier passage, opposition par STOP, sans « obligatoire »', () => {
    const t = texteSms({ entreprise: { nom: 'Ramonage Exemple', tel: '05 00 00 00 00' }, ramonage: passage({ id: 'r', le: '2026-10-19T14:00:00', prochain: '2027-10-19' }) });
    expect(t).toBe('Bonjour, votre ramonage est à prévoir avant le 19/10/2027. Ramonage Exemple, 05 00 00 00 00, qui a ramoné votre conduit le 19/10/2026. Pour ne plus recevoir de rappel, répondez STOP.');
    expect(t).not.toMatch(/obligatoire|avis/i);
    expect(lienSms('06 00 00 00 01', 'a b')).toBe('sms:0600000001?&body=a%20b');
    expect(lienSms('', 'x')).toBe('');
  });

  it('ligne de facture : l’appareil, le numéro d’attestation et le prix', () => {
    const r = { ...passage({ id: 'r', le: '2026-10-19T14:00:00', prochain: '2027-10-19', numero: 'RAM-2026-00001' }) };
    expect(descriptionAppareil(r)).toBe('Poêle à bois — bois, conduit tubé-chemisé (Salon)');
    expect(ligneFacture(r)).toEqual({ description: 'Ramonage — Poêle à bois — bois, conduit tubé-chemisé (Salon) — attestation n° RAM-2026-00001', quantite: 1, unite: 'u', prixUnitaire: 90 });
  });
});
