import { describe, it, expect } from 'vitest';
import { montantPaiement, paiementsDe, dejaPaye, resteAPayer, statutFacture, joursDeRetard, apresPaiement, echeance, encaisseEntre, dateEcheance } from '../paiementsFacture';

const facture = (x = {}) => ({ id: 'f1', numero: 'FAC-2026-00002', type: 'facture', statut: 'envoye', total_ttc: 6105, date: '2026-09-20', ...x });
const LE_1_OCT = new Date('2026-10-01T10:00:00');

describe('paiementsFacture', () => {
  it('lit le montant saisi (amount) comme le montant relu de la base (montant)', () => {
    expect(montantPaiement({ amount: 100 })).toBe(100);
    expect(montantPaiement({ montant: 50 })).toBe(50);
    expect(montantPaiement({})).toBe(0);
  });

  it('rattache les paiements par identifiant ou par numéro', () => {
    const p = [{ facture_id: 'f1', amount: 1 }, { document: 'FAC-2026-00002', montant: 2 }, { devisId: 'autre', montant: 9 }];
    expect(paiementsDe(facture(), p)).toHaveLength(2);
  });

  it('additionne deux acomptes saisis par « Encaisser » (panne du 9 oct. : le 2e ne soldait pas)', () => {
    const p = [{ facture_id: 'f1', amount: 3000 }, { facture_id: 'f1', amount: 3105 }];
    expect(dejaPaye(facture(), p)).toBe(6105);
    expect(statutFacture(facture(), p, LE_1_OCT)).toBe('payee');
    expect(resteAPayer(facture(), p)).toBe(0);
  });

  it('ne double pas un paiement présent à la fois dans montant_paye et dans les paiements', () => {
    const p = [{ facture_id: 'f1', montant: 3000 }];
    expect(dejaPaye(facture({ montant_paye: 3000 }), p)).toBe(3000);
  });

  it('une facture soldée mais restée « envoyée » s\'affiche « payée »', () => {
    expect(statutFacture(facture({ montant_paye: 6105 }), [], LE_1_OCT)).toBe('payee');
  });

  it('partielle avant l\'échéance, en retard après', () => {
    const p = [{ facture_id: 'f1', amount: 1000 }];
    expect(statutFacture(facture(), p, LE_1_OCT)).toBe('partielle');
    expect(statutFacture(facture(), p, new Date('2026-10-25'))).toBe('en_retard');
  });

  it('échéance : date_echeance, sinon émission + 30 jours ; le jour même n\'est pas un retard', () => {
    const e = echeance(facture());
    expect([e.getFullYear(), e.getMonth() + 1, e.getDate()]).toEqual([2026, 10, 20]);
    expect(statutFacture(facture({ date_echeance: '2026-10-01' }), [], LE_1_OCT)).toBe('envoye');
    expect(statutFacture(facture({ date_echeance: '2026-09-30' }), [], LE_1_OCT)).toBe('en_retard');
    expect(joursDeRetard(facture({ date_echeance: '2026-09-28' }), [], LE_1_OCT)).toBe(3);
  });

  it('brouillon et annulée gardent leur statut', () => {
    expect(statutFacture(facture({ statut: 'brouillon', montant_paye: 6105 }))).toBe('brouillon');
    expect(statutFacture(facture({ statut: 'annulee' }))).toBe('annulee');
  });

  it('après un paiement : montant reçu cumulé, « payée » quand c\'est soldé', () => {
    const p = [{ facture_id: 'f1', amount: 3000 }];
    expect(apresPaiement(facture(), p, 1000)).toEqual({ montant_paye: 4000, soldee: false });
    expect(apresPaiement(facture(), p, 3105)).toEqual({ montant_paye: 6105, soldee: true, statut: 'payee' });
    expect(apresPaiement(facture({ total_ttc: 100.1 }), [], 100.1)).toMatchObject({ soldee: true });
  });
});

describe('encaisseEntre', () => {
  it('compte les paiements reçus sur la période, pas les devis signés', () => {
    const docs = [
      { id: 'd1', type: 'devis', statut: 'accepte', total_ttc: 9999, date: '2026-10-02' },
      { id: 'f2', numero: 'FAC-2', type: 'facture', statut: 'payee', total_ttc: 500, montant_paye: 500, date_paiement: '2026-10-05' },
      { id: 'f3', numero: 'FAC-3', type: 'facture', statut: 'payee', total_ttc: 800, montant_paye: 800, date_paiement: '2026-10-06' },
    ];
    const paiements = [
      { facture_id: 'f1', amount: 300, date_paiement: '2026-10-03' },
      { facture_id: 'f3', montant: 800, date: '2026-10-06' },
      { facture_id: 'f1', montant: 100, date: '2026-09-28' },
    ];
    // 300 (paiement d'octobre) + 800 (f3, déjà dans les paiements) + 500 (f2 payée en ligne, sans ligne)
    expect(encaisseEntre(docs, paiements, '2026-10-01', '2026-10-31')).toBe(1600);
    // Marquée « payée » à la main, sans paiement ni montant_paye : le total, à sa date de mise à jour.
    const main = [{ id: 'f9', numero: 'FAC-9', type: 'facture', statut: 'payee', total_ttc: 250, updated_at: '2026-10-08T09:00:00Z' }];
    expect(encaisseEntre(main, [], '2026-10-01', '2026-10-31')).toBe(250);
  });
});

describe('dateEcheance', () => {
  it('suit les conditions de règlement imprimées sur la facture', () => {
    expect(dateEcheance('2026-10-09', { conditionsPaiement: 'reception' })).toBe('2026-10-09');
    expect(dateEcheance('2026-10-09', { conditionsPaiement: '60_jours' })).toBe('2026-12-08');
    expect(dateEcheance('2026-10-09', { conditionsPaiement: '30_jours_fdm' })).toBe('2026-11-30');
    expect(dateEcheance('2026-10-09', { conditionsPaiement: '45_jours_fdm' })).toBe('2026-11-30');
    expect(dateEcheance('2026-10-20', { conditionsPaiement: '45_jours_fdm' })).toBe('2026-12-31');
  });

  it('sinon le délai de l\'entreprise, ou 30 jours', () => {
    expect(dateEcheance('2026-10-09', { delaiJours: 45 })).toBe('2026-11-23');
    expect(dateEcheance('2026-10-09')).toBe('2026-11-08');
  });

  it('une facture « 60 jours » n\'est pas en retard au 31e jour', () => {
    const f = { id: 'f', type: 'facture', statut: 'envoye', total_ttc: 100, date: '2026-09-01', conditionsPaiement: '60_jours' };
    expect(statutFacture(f, [], new Date('2026-10-05'))).toBe('envoye');
  });
});
