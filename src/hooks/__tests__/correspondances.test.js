import { describe, it, expect } from 'vitest';
import { FIELD_MAPPINGS } from '../useSupabaseSync';

// Aller-retour app → base → app : ce que l'artisan saisit doit revenir tel quel au rechargement.
const allerRetour = (table, item) => FIELD_MAPPINGS[table].fromSupabase(FIELD_MAPPINGS[table].toSupabase(item));

describe('pointages', () => {
  it('un pointage sans chantier part avec chantier_id null (et non une chaîne vide refusée par la base)', () => {
    expect(FIELD_MAPPINGS.pointages.toSupabase({ id: 'p1', employeId: 'e1', chantierId: '', heures: 7.5 }).chantier_id).toBeNull();
  });
  it('validation, verrou, saisie manuelle et signature reviennent au rechargement', () => {
    const p = allerRetour('pointages', { id: 'p1', employeId: 'e1', chantierId: 'c1', date: '2026-10-06', heures: 7.5, approuve: true, verrouille: true, manuel: true, signedAt: '2026-10-09T10:00:00Z' });
    expect(p).toMatchObject({ approuve: true, verrouille: true, manuel: true, signedAt: '2026-10-09T10:00:00Z', heures: 7.5 });
  });
});

describe('équipe', () => {
  it("un sous-traitant revient sous-traitant, avec SIRET, décennale, URSSAF et forfait", () => {
    const st = allerRetour('equipe', {
      id: 'e1', nom: 'Dupuy', type: 'sous_traitant', siret: '12345678900012',
      decennale_assureur: 'SMABTP', decennale_numero: 'D-42', decennale_expiration: '2027-01-31',
      urssaf_date: '2026-09-01', tarif_type: 'forfait', tarif_forfait: 1200,
    });
    expect(st).toMatchObject({
      type: 'sous_traitant', siret: '12345678900012', decennale_assureur: 'SMABTP', decennale_numero: 'D-42',
      decennale_expiration: '2027-01-31', urssaf_date: '2026-09-01', tarif_type: 'forfait', tarif_forfait: 1200,
    });
  });
  it('une date vide part en null (une chaîne vide est refusée par une colonne date)', () => {
    const ligne = FIELD_MAPPINGS.equipe.toSupabase({ id: 'e1', nom: 'X', decennale_expiration: '', urssaf_date: '' });
    expect(ligne.decennale_expiration).toBeNull();
    expect(ligne.urssaf_date).toBeNull();
  });
});

describe('devis', () => {
  const base = { id: 'd1', client_id: 'c1', numero: 'DEV-2026-00001', type: 'devis', statut: 'brouillon', date: '2026-10-10' };

  it('la validité choisie et les notes reviennent au rechargement ; la date de validité est recalculée', () => {
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...base, validite: 45, notes: 'Accès par la cour' });
    expect(ligne.validite_jours).toBe(45);
    expect(ligne.date_validite).toBe('2026-11-24');
    expect(ligne.notes).toBe('Accès par la cour');
    const relu = FIELD_MAPPINGS.devis.fromSupabase({ ...ligne, lignes: '[]', sections: '[]' });
    expect(relu.validite).toBe(45);
    expect(relu.notes).toBe('Accès par la cour');
  });
  it('changer la validité met à jour la date de validité déjà enregistrée', () => {
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...base, validite: 15, date_validite: '2026-11-09' });
    expect(ligne.date_validite).toBe('2026-10-25');
  });
  it("un avoir garde sa facture d'origine et son motif", () => {
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...base, type: 'facture', facture_type: 'avoir', avoir_source_id: 'f1', avoir_type: 'total', avoir_motif: 'erreur', avoir_motif_detail: 'TVA' });
    expect(ligne).toMatchObject({ avoir_source_id: 'f1', avoir_type: 'total', avoir_motif: 'erreur', avoir_motif_detail: 'TVA' });
  });
  it('un taux de TVA à 0 % reste 0 % (franchise, autoliquidation)', () => {
    expect(FIELD_MAPPINGS.devis.toSupabase({ ...base, tvaRate: 0 }).tva_rate).toBe(0);
    expect(FIELD_MAPPINGS.devis.fromSupabase({ ...base, tva_rate: 0, lignes: '[]', sections: '[]' }).tvaRate).toBe(0);
  });
});

describe('catalogue', () => {
  it('le prix modifié dans le formulaire part en base, pas l\'ancien prix', () => {
    const ancien = FIELD_MAPPINGS.catalogue.fromSupabase({ id: 'a1', designation: 'Prise', prix_unitaire_ht: 40, tva_rate: 20 });
    const ligne = FIELD_MAPPINGS.catalogue.toSupabase({ ...ancien, prix: 55 });
    expect(ligne.prix_unitaire_ht).toBe(55);
  });
  it('un taux de TVA à 0 % reste 0 %', () => {
    expect(FIELD_MAPPINGS.catalogue.toSupabase({ id: 'a1', nom: 'X', prix: 10, tva: 0 }).tva_rate).toBe(0);
    expect(FIELD_MAPPINGS.catalogue.fromSupabase({ id: 'a1', designation: 'X', tva_rate: 0 }).tva).toBe(0);
  });
});
