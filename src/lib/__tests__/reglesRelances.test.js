import { describe, it, expect } from 'vitest';
import { estClientPro, creditsParFacture, paiementsParDocument, resteDu, relancable, penalites, mentionRetard, tauxPenalitesLegal, TAUX_PENALITES_PAR_SEMESTRE as TAUX_CRON } from '../../../supabase/functions/send-scheduled-relances/regles.ts';
import { TAUX_PENALITES_PAR_SEMESTRE as TAUX_APP } from '../relanceUtils';

const facture = (o) => ({ id: 'f1', type: 'facture', facture_type: 'totale', statut: 'envoye', total_ttc: 1000, ...o });

describe('relances automatiques (cron) : règles', () => {
  it('relance le reste dû : acomptes reçus et avoirs émis déduits', () => {
    const avoir = { id: 'a1', type: 'facture', facture_type: 'avoir', statut: 'envoye', avoir_source_id: 'f1', total_ttc: -300 };
    const credits = creditsParFacture([facture(), avoir]);
    const paiements = paiementsParDocument([{ devis_id: 'f1', montant: 400 }]);
    expect(resteDu(facture(), credits, paiements)).toBe(300);
    expect(resteDu(facture({ montant_paye: 500 }), credits, paiements)).toBe(200); // le plus grand des deux reçus
  });

  it('ne relance jamais un avoir, ni une facture soldée ou entièrement créditée', () => {
    const vide = new Map();
    expect(relancable({ id: 'a1', type: 'facture', facture_type: 'avoir', total_ttc: -300 }, vide, vide)).toBe(false);
    expect(relancable(facture({ montant_paye: 1000 }), vide, vide)).toBe(false);
    const avoirTotal = { facture_type: 'avoir', statut: 'envoye', avoir_source_id: 'f1', total_ttc: -1000 };
    expect(relancable(facture(), creditsParFacture([avoirTotal]), vide)).toBe(false);
    expect(relancable(facture(), vide, vide)).toBe(true);
  });

  it('un avoir « appliqué » (payee) crédite ; un avoir annulé (annule ou annulee) ne crédite rien', () => {
    const paye = { facture_type: 'avoir', statut: 'payee', avoir_source_id: 'f1', total_ttc: -300 };
    expect(resteDu(facture(), creditsParFacture([paye]), new Map())).toBe(700);
    for (const statut of ['annule', 'annulee']) {
      const annule = { facture_type: 'avoir', statut, avoir_source_id: 'f1', total_ttc: -300 };
      expect(resteDu(facture(), creditsParFacture([annule]), new Map())).toBe(1000);
    }
  });

  it('un paiement négatif ne fait pas remonter le reste dû', () => {
    expect(resteDu(facture(), new Map(), paiementsParDocument([{ devis_id: 'f1', montant: -500 }]))).toBe(1000);
  });

  it('un avoir en brouillon ne crédite rien', () => {
    const brouillon = { facture_type: 'avoir', statut: 'brouillon', avoir_source_id: 'f1', total_ttc: -1000 };
    expect(resteDu(facture(), creditsParFacture([brouillon]), new Map())).toBe(1000);
  });

  it('pénalités et 40 € : professionnel seulement, sur le reste dû', () => {
    expect(penalites(600, 30, false)).toEqual({ penalites: 0, indemnite: 0, totalDu: 600 });
    const pro = penalites(600, 30, true);
    expect(pro.indemnite).toBe(40);
    expect(pro.penalites).toBe(6.12); // 600 × 12,4 % × 30/365
    expect(pro.totalDu).toBe(646.12);
    expect(penalites(600, 0, true).indemnite).toBe(0);
  });

  it('mention de retard et taux légal du semestre, comme l\'app', () => {
    expect(mentionRetard(true)).toMatch(/L\.441-10 et D\.441-5/);
    expect(mentionRetard(false)).toMatch(/1231-6 du Code civil/);
    expect(tauxPenalitesLegal(new Date('2026-10-10T12:00:00'))).toBe(12.4);
    expect(TAUX_CRON).toEqual(TAUX_APP); // une seule table, recopiée : elles ne doivent jamais diverger
  });

  it('client professionnel : la catégorie l\'emporte ; sans rien, particulier', () => {
    expect(estClientPro({ categorie: 'Professionnel' })).toBe(true);
    expect(estClientPro({ categorie: 'Particulier', entreprise: 'SCI X' })).toBe(false);
    expect(estClientPro({ entreprise: 'SARL Dupuy' })).toBe(true);
    expect(estClientPro({})).toBe(false);
  });
});
