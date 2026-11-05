import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { rappelsDus as rappelsDusRamonage } from '../ramonage';
import { rappelsDus as rappelsDusEntretien } from '../entretien';
import { rappelsAEnvoyer as envoiRamonage } from '../../../supabase/functions/send-scheduled-relances/ramonage.ts';
import { rappelsAEnvoyerEntretien as envoiEntretien } from '../../../supabase/functions/send-scheduled-relances/entretien.ts';
import { FIELD_MAPPINGS } from '../../hooks/useSupabaseSync';
import { messageNePlusRappeler, AIDE_REFUS_RAPPELS, noteRefusRappels } from '../suiviRappel';
import RefusRappelsPage from '../../components/ramonage/RefusRappelsPage';

/**
 * D-38 (Hugo, 5 nov. 2026), décision 3 : un refus de rappel vaut pour TOUS les rappels de l'artisan, ramonage et entretien.
 * Le refus est une seule date sur la fiche du client (`clients.rappels_refuses_le`), posée par le lien de n'importe quel
 * rappel (migration 113 : `refuser_rappels_ramonage` reconnaît le jeton d'un ramonage et celui d'un entretien) ; les
 * rappels de l'app (« À faire ») et ceux du serveur (e-mails) des deux modules la lisent. Données fictives seulement.
 */
const ici = path.dirname(fileURLToPath(import.meta.url));
const lire = (relatif) => fs.readFileSync(path.resolve(ici, relatif), 'utf8');

const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', email: 'lucie@exemple.fr' };
const ramonage = { id: 'r1', client_id: 'c1', appareil_ref: 'ra1', realise_le: '2026-11-04T09:00:00Z', prochain_avant: '2027-11-04', jeton_rappel: 'jr1' };
const entretien = {
  id: 'e1', client_id: 'c1', appareil_ref: 'ea1', categorie: 'chaudiere', puissance_kw: 24, appareils: [{ marque: 'M', modele: 'X' }],
  realise_le: '2026-11-04T09:00:00Z', prochain_avant: '2027-11-04', jeton_rappel: 'je1',
};
const jour = { aujourdhui: '2027-10-20' };
const rappels = (clients, r = [ramonage], e = [entretien]) => ({
  appRamonage: rappelsDusRamonage(r, clients, jour).length,
  appEntretien: rappelsDusEntretien(e, clients, jour).length,
  serveurRamonage: envoiRamonage(r, clients, jour).length,
  serveurEntretien: envoiEntretien(e, clients, jour).length,
});

describe('un refus de rappel vaut pour tous les rappels de l’artisan (D-38, décision 3)', () => {
  it('contre-essai : sans refus, les quatre rappels sortent (app et serveur, ramonage et entretien)', () => {
    expect(rappels([client])).toEqual({ appRamonage: 1, appEntretien: 1, serveurRamonage: 1, serveurEntretien: 1 });
  });
  it('avec le refus du client, plus aucun rappel de ramonage ni d’entretien, dans l’app comme au serveur', () => {
    expect(rappels([{ ...client, rappels_refuses_le: '2027-01-05T10:00:00Z' }])).toEqual({ appRamonage: 0, appEntretien: 0, serveurRamonage: 0, serveurEntretien: 0 });
  });
  it('le refus d’un client ne touche pas les rappels des autres', () => {
    const autre = { id: 'c2', nom: 'Autre', email: 'autre@exemple.fr' };
    const r = [ramonage, { ...ramonage, id: 'r2', client_id: 'c2', appareil_ref: 'ra2' }];
    const e = [entretien, { ...entretien, id: 'e2', client_id: 'c2', appareil_ref: 'ea2' }];
    expect(rappels([{ ...client, rappels_refuses_le: '2027-01-05T10:00:00Z' }, autre], r, e)).toEqual({ appRamonage: 1, appEntretien: 1, serveurRamonage: 1, serveurEntretien: 1 });
  });
  it('un seul refus sur la fiche du client : relu tel quel, et une fiche chargée avant le refus ne l’efface pas', () => {
    const relu = FIELD_MAPPINGS.clients.fromSupabase({ id: 'c1', nom: 'Exemple', rappels_refuses_le: '2027-01-05T10:00:00Z' });
    expect(relu.rappels_refuses_le).toBe('2027-01-05T10:00:00Z');
    expect(FIELD_MAPPINGS.clients.fromSupabase({ id: 'c1', nom: 'Exemple' }).rappels_refuses_le).toBeNull();
    // Enregistrer une fiche sans refus n'envoie pas la colonne (sinon le refus posé depuis un lien serait effacé)
    expect('rappels_refuses_le' in FIELD_MAPPINGS.clients.toSupabase({ id: 'c1', nom: 'Exemple' })).toBe(false);
    expect(FIELD_MAPPINGS.clients.toSupabase({ id: 'c1', nom: 'Exemple', rappels_refuses_le: '2027-01-05T10:00:00Z' }).rappels_refuses_le).toBe('2027-01-05T10:00:00Z');
  });
  it('la page publique du lien le dit au client, que le lien vienne d’un rappel de ramonage ou d’entretien', () => {
    for (const sujet of ['ramonage', 'entretien']) {
      const page = renderToStaticMarkup(<RefusRappelsPage jeton="j" sujet={sujet} />);
      expect(page).toContain('L’arrêt vaut pour tous ses rappels (entretien et ramonage).');
    }
  });
  it('les écrans de l’artisan le disent aussi : la confirmation, la note de la fiche et la case de la saisie', () => {
    expect(messageNePlusRappeler('Lucie Exemple')).toBe('Lucie Exemple ne recevra plus aucun rappel, ni de ramonage ni d’entretien (ni SMS proposé, ni e-mail automatique). Ce refus ne s’annule pas.');
    expect(noteRefusRappels('4 novembre 2026')).toBe('Ce client a refusé les rappels le 4 novembre 2026 (ramonage et entretien).');
    expect(AIDE_REFUS_RAPPELS).toBe('Noté sur sa fiche : ni e-mail automatique, ni SMS proposé, pour aucun rappel (ramonage et entretien).');
  });
  it('les deux onglets (ramonage et entretien) et les deux saisies emploient ces mêmes textes, plus l’ancien « rappel de ramonage » seul', () => {
    const sources = {
      onglets: ['../../components/ramonage/OngletRamonage.jsx', '../../components/entretien/OngletEntretien.jsx'].map(lire),
      saisies: ['../../components/ramonage/SaisieRamonage.jsx', '../../components/entretien/SaisieEntretien.jsx'].map(lire),
    };
    for (const s of sources.onglets) {
      expect(s).toContain('messageNePlusRappeler(');
      expect(s).toContain('noteRefusRappels(');
    }
    for (const s of sources.saisies) expect(s).toContain('AIDE_REFUS_RAPPELS');
    // Contre-essai : l'ancienne phrase du ramonage ne parlait que du ramonage
    for (const s of [...sources.onglets, ...sources.saisies]) {
      expect(s).not.toContain('ne recevra plus de rappel de ramonage');
      expect(s).not.toContain('a refusé les rappels de ramonage');
    }
  });
});
