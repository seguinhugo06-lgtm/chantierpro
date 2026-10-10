import { describe, it, expect } from 'vitest';
import { resolveVariables, isDocumentEligible } from '../relanceUtils';

const CONFIG = { enabled: true, factureSteps: [{ id: 's1', delay: 0, enabled: true }], devisSteps: [] };
const facture = (o) => ({
  id: 'f1', type: 'facture', facture_type: 'totale', statut: 'envoye', client_id: 'c1', numero: 'FAC-2026-00010',
  total_ttc: 1000, total_ht: 833.33, date: '2026-08-01', date_echeance: '2026-08-31', ...o,
});
const montant = (texte) => texte.replace(/ | /g, ' ');

describe('relances (app) : montant, pénalités, éligibilité', () => {
  it('le montant relancé est le reste dû (paiements reçus et avoirs émis déduits)', () => {
    const t = montant(resolveVariables('{{montant}} / {{reste_du}} / {{montant_ttc}}', facture({ montant_paye: 400, montant_credite: 300 }), { categorie: 'Particulier' }, {}));
    expect(t).toMatch(/^300,00/);
    expect(t).toMatch(/\/ 300,00/);
    expect(t).toMatch(/1 000,00/); // le total de la facture reste disponible
  });

  it('particulier : ni pénalités ni 40 € ; professionnel : sur le reste dû', () => {
    const doc = facture({ montant_paye: 400 });
    expect(montant(resolveVariables('{{penalites}}|{{total_du}}', doc, { categorie: 'Particulier' }, {}))).toMatch(/^0,00 ?€?\|600,00/);
    const pro = montant(resolveVariables('{{penalites}}|{{total_du}}', doc, { categorie: 'Professionnel' }, {}));
    const [pen, total] = pro.split('|').map((x) => parseFloat(x.replace(/[^\d,]/g, '').replace(',', '.')));
    expect(pen).toBeGreaterThan(0);
    expect(total).toBeCloseTo(600 + pen + 40, 2);
  });

  it('un avoir, une facture soldée ou entièrement créditée ne sont jamais relancés', () => {
    expect(isDocumentEligible(facture(), [], CONFIG)).toBe(true);
    expect(isDocumentEligible(facture({ facture_type: 'avoir', total_ttc: -300 }), [], CONFIG)).toBe(false);
    expect(isDocumentEligible(facture({ montant_paye: 1000 }), [], CONFIG)).toBe(false);
    expect(isDocumentEligible(facture({ montant_credite: 1000 }), [], CONFIG)).toBe(false);
  });
});
