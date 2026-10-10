import { describe, it, expect } from 'vitest';
import { resolveVariables, isDocumentEligible, TAUX_PENALITES_PAR_SEMESTRE, semestreDe, tauxPenalitesLegal } from '../relanceUtils';

const CONFIG = { enabled: true, factureSteps: [{ id: 's1', delay: 0, enabled: true }], devisSteps: [] };
const facture = (o) => ({
  id: 'f1', type: 'facture', facture_type: 'totale', statut: 'envoye', client_id: 'c1', numero: 'FAC-2026-00010',
  total_ttc: 1000, total_ht: 833.33, date: '2026-08-01', date_echeance: '2026-08-31', ...o,
});
const montant = (texte) => texte.replace(/ | /g, ' ');

describe('relances (app) : montant, pénalités, éligibilité', () => {
  it('le montant relancé est le reste dû (paiements reçus et avoirs émis déduits)', () => {
    const t = montant(resolveVariables('{{montant}} / {{reste_du}} / {{montant_ttc}} / {{total_facture}}', facture({ montant_paye: 400, montant_credite: 300 }), { categorie: 'Particulier' }, {}));
    expect(t).toMatch(/^300,00 \/ 300,00 \/ 300,00/);
    expect(t).toMatch(/1 000,00$/); // le total de la facture reste disponible : {{total_facture}}
  });

  it('particulier : ni pénalités ni 40 € ; professionnel : sur le reste dû', () => {
    const doc = facture({ montant_paye: 400 });
    expect(montant(resolveVariables('{{penalites}}|{{total_du}}', doc, { categorie: 'Particulier' }, {}))).toMatch(/^0,00 ?€?\|600,00/);
    const pro = montant(resolveVariables('{{penalites}}|{{total_du}}', doc, { categorie: 'Professionnel' }, {}));
    const [pen, total] = pro.split('|').map((x) => parseFloat(x.replace(/[^\d,]/g, '').replace(',', '.')));
    expect(pen).toBeGreaterThan(0);
    expect(total).toBeCloseTo(600 + pen + 40, 2);
  });

  it('{{montant_ttc}} d\'une facture vaut le reste dû (les modèles enregistrés l\'utilisent)', () => {
    const t = montant(resolveVariables('{{montant_ttc}}|{{total_facture}}', facture({ montant_paye: 400 }), { categorie: 'Particulier' }, {}));
    expect(t).toMatch(/^600,00/);
    expect(t).toMatch(/\|1 000,00/);
  });

  it('{{mention_retard}} : L441-10 pour un professionnel, art. 1231-6 C. civ. pour un particulier', () => {
    expect(resolveVariables('{{mention_retard}}', facture(), { categorie: 'Professionnel' }, {})).toMatch(/L\.441-10 et D\.441-5/);
    expect(resolveVariables('{{mention_retard}}', facture(), { categorie: 'Particulier' }, {})).toMatch(/1231-6 du Code civil/);
  });

  it('le taux légal du semestre en cours est relevé (sinon : à mettre à jour, art. L441-10 II)', () => {
    expect(TAUX_PENALITES_PAR_SEMESTRE[semestreDe(new Date())], `taux du semestre ${semestreDe(new Date())} à relever (BCE + 10 points)`).toBeDefined();
    expect(tauxPenalitesLegal(new Date('2026-03-01T12:00:00'))).toBe(12.15);
    expect(tauxPenalitesLegal(new Date('2026-10-10T12:00:00'))).toBe(12.4);
  });

  it('un avoir, une facture soldée ou entièrement créditée ne sont jamais relancés', () => {
    expect(isDocumentEligible(facture(), [], CONFIG)).toBe(true);
    expect(isDocumentEligible(facture({ facture_type: 'avoir', total_ttc: -300 }), [], CONFIG)).toBe(false);
    expect(isDocumentEligible(facture({ montant_paye: 1000 }), [], CONFIG)).toBe(false);
    expect(isDocumentEligible(facture({ montant_credite: 1000 }), [], CONFIG)).toBe(false);
  });
});
