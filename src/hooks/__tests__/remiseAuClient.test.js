import { describe, it, expect } from 'vitest';
import { FIELD_MAPPINGS } from '../useSupabaseSync';
import { remiseDuDevis, preuveEnvoiParEmail } from '../../lib/remiseDevis';

/**
 * Preuve de la remise du devis au client (C. conso. L221-7, avis juriste-btp du 5 nov. 2026, point 7) : l'instant et le mode
 * sont rangés dans la colonne JSON EXISTANTE `payment_metadata` du devis (migration 067), sous la clé `remise_au_client`,
 * sans migration. Aller-retour app → base → app, et ce qui ne doit jamais être écrit.
 * Pourquoi un test : une clé que le mappage ne connaît pas n'est jamais écrite, et la couche d'écriture retire sans bruit
 * une colonne que la base ne connaît pas. Sans ce test, la preuve pouvait disparaître au rechargement sans qu'aucun
 * écran ne le dise.
 */
const base = { id: 'd1', client_id: 'c1', numero: 'DEV-2026-00001', type: 'devis', statut: 'envoye', date: '2026-11-05' };
const PREUVE = { le: '2026-11-05T09:12:34.000Z', mode: 'papier' };
const relu = (ligne) => FIELD_MAPPINGS.devis.fromSupabase({ ...ligne, lignes: '[]', sections: '[]' });

describe('devis : la preuve de la remise', () => {
  it('part dans payment_metadata, sous la clé remise_au_client, et revient telle quelle au rechargement', () => {
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...base, remise_au_client: PREUVE });
    expect(ligne.payment_metadata).toEqual({ remise_au_client: PREUVE });
    expect(relu(ligne).remise_au_client).toEqual(PREUVE);
  });
  it('la preuve d’un envoi par e-mail (mode envoyé, canal e-mail) fait le même aller-retour', () => {
    const { remise_au_client: preuve } = preuveEnvoiParEmail(base, new Date('2026-11-05T09:12:34.000Z'));
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...base, remise_au_client: preuve });
    expect(relu(ligne).remise_au_client).toEqual({ le: '2026-11-05T09:12:34.000Z', mode: 'envoye', canal: 'email' });
  });
  it('la remise enregistrée par « Devis remis au client » part avec le statut, le jour d’envoi et la preuve', () => {
    const maj = remiseDuDevis({ ...base, statut: 'brouillon' }, { mode: 'envoye', le: new Date(PREUVE.le) });
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...base, statut: 'brouillon', ...maj });
    expect(ligne.statut).toBe('envoye');
    expect(ligne.date_envoi).toBe(maj.date_envoi);
    expect(ligne.payment_metadata.remise_au_client).toEqual({ le: PREUVE.le, mode: 'envoye' });
  });
  it('sans preuve, la clé payment_metadata n’est pas écrite (une copie périmée n’efface rien)', () => {
    expect(Object.prototype.hasOwnProperty.call(FIELD_MAPPINGS.devis.toSupabase(base), 'payment_metadata')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(FIELD_MAPPINGS.devis.toSupabase({ ...base, remise_au_client: null }), 'payment_metadata')).toBe(false);
  });
  it('contre-essai : jamais écrite sur une facture, dont le serveur écrit payment_metadata (paiement en ligne)', () => {
    const facture = FIELD_MAPPINGS.devis.toSupabase({ ...base, type: 'facture', remise_au_client: PREUVE });
    expect(Object.prototype.hasOwnProperty.call(facture, 'payment_metadata')).toBe(false);
  });
  it('contre-essai : relue seulement sur un devis (les métadonnées d’une facture payée ne deviennent pas une preuve)', () => {
    const metadonnees = { session_id: 'cs_1', amount_paid_cents: 12000, remise_au_client: PREUVE };
    expect(relu({ ...base, type: 'facture', payment_metadata: metadonnees }).remise_au_client).toBeNull();
    expect(relu({ ...base, type: 'devis', payment_metadata: { session_id: 'cs_1' } }).remise_au_client).toBeNull();
    expect(relu({ ...base, type: 'devis', payment_metadata: null }).remise_au_client).toBeNull();
  });
  it('un JSON rendu sous forme de texte est lu aussi, un texte illisible ne casse pas le chargement', () => {
    expect(relu({ ...base, payment_metadata: JSON.stringify({ remise_au_client: PREUVE }) }).remise_au_client).toEqual(PREUVE);
    expect(relu({ ...base, payment_metadata: '{pas du json' }).remise_au_client).toBeNull();
  });
});
