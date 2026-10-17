import { describe, it, expect } from 'vitest';
import { montantsDepense, tauxSaisiDepense, depensesSansTva, depensesDeLaPeriode, tvaDeductible, decaisseDepense } from '../tvaDepenses';
import { calculateTVASummary } from '../integrations/accounting';

// Relecture juriste-btp du 17 oct. 2026 : le montant d'une dépense est HT ; seule la TVA portée sur la facture du
// fournisseur se déduit (CGI art. 271) ; sans TVA saisie, rien ne se déduit (avant : 20 % d'office, sur un montant
// pris tantôt pour un HT, tantôt pour un TTC).
describe('TVA d\'une dépense', () => {
  it('taux saisi : 0 % compris, virgule acceptée ; rien de saisi : null', () => {
    expect(tauxSaisiDepense({ tauxTva: 20 })).toBe(20);
    expect(tauxSaisiDepense({ tauxTva: 0 })).toBe(0);
    expect(tauxSaisiDepense({ tva_rate: '5,5' })).toBe(5.5);
    expect(tauxSaisiDepense({ tauxTva: '' })).toBeNull();
    expect(tauxSaisiDepense({})).toBeNull();
    expect(tauxSaisiDepense(null)).toBeNull();
  });

  it('montant HT + taux : TVA et TTC calculés', () => {
    expect(montantsDepense({ montant: 100, tauxTva: 20 })).toEqual({ ht: 100, tva: 20, ttc: 120, taux: 20, connue: true });
    expect(montantsDepense({ montant: 200, tauxTva: 5.5 })).toEqual({ ht: 200, tva: 11, ttc: 211, taux: 5.5, connue: true });
    expect(montantsDepense({ montant: 80, tauxTva: 0 })).toEqual({ ht: 80, tva: 0, ttc: 80, taux: 0, connue: true });
  });

  it('TVA saisie : elle prime sur le taux ; sans taux, rangée sous le taux qu\'elle représente', () => {
    expect(montantsDepense({ montant: 100, tauxTva: 20, montantTva: 19.5 }).tva).toBe(19.5);
    expect(montantsDepense({ montant: 100, montantTva: 10 })).toEqual({ ht: 100, tva: 10, ttc: 110, taux: 10, connue: true });
    // une facture à 0 % ne porte pas de TVA, même si un montant a été saisi
    expect(montantsDepense({ montant: 100, tauxTva: 0, montantTva: 5 })).toEqual({ ht: 100, tva: 0, ttc: 100, taux: 0, connue: true });
  });

  it('sans taux ni TVA : TVA inconnue, rien d\'inventé', () => {
    expect(montantsDepense({ montant: 150 })).toEqual({ ht: 150, tva: null, ttc: null, taux: null, connue: false });
    expect(depensesSansTva([{ montant: 1 }, { montant: 2, tauxTva: 20 }, { montant: 3, tauxTva: 0 }])).toBe(1);
  });

  it('sortie de trésorerie : le TTC payé quand la TVA est connue, sinon le HT ; en franchise, le montant saisi', () => {
    expect(decaisseDepense({ montant: 100, tauxTva: 20 })).toBe(120);
    expect(decaisseDepense({ montant: 100 })).toBe(100);
    expect(decaisseDepense({ montant: 100, tauxTva: 20 }, { franchise: true })).toBe(100);
  });

  it('franchise : aucune TVA déductible, le montant est la charge', () => {
    expect(montantsDepense({ montant: 120, tauxTva: 20 }, { franchise: true })).toEqual({ ht: 120, tva: 0, ttc: 120, taux: null, connue: true });
    expect(depensesSansTva([{ montant: 1 }], { franchise: true })).toBe(0);
  });
});

const DEPENSES = [
  { id: 'd1', date: '2026-07-03', montant: 100, tauxTva: 20 },
  { id: 'd2', date: '2026-07-10', montant: 200, tauxTva: 10 },
  { id: 'd3', date: '2026-08-01', montant: 50 }, // sans TVA saisie
  { id: 'd4', date: '2026-09-30', montant: 40, tauxTva: 20 },
  { id: 'd5', date: '2026-10-01', montant: 999, tauxTva: 20 }, // hors période
];

describe('TVA déductible d\'une période', () => {
  it('période : bornes incluses, facultatives', () => {
    expect(depensesDeLaPeriode(DEPENSES, { du: '2026-07-01', au: '2026-09-30' }).map((d) => d.id)).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(depensesDeLaPeriode(DEPENSES).length).toBe(5);
  });

  it('par taux, dépenses sans TVA dénombrées et non comptées', () => {
    const r = tvaDeductible(DEPENSES, { du: '2026-07-01', au: '2026-09-30' });
    expect(r.total).toBe(48);
    expect(r.parTaux).toEqual([{ taux: 10, base: 200, montant: 20 }, { taux: 20, base: 140, montant: 28 }]);
    expect(r.sansTva).toBe(1);
    expect(r.nb).toBe(4);
  });

  it('franchise : rien', () => {
    expect(tvaDeductible(DEPENSES, { franchise: true })).toEqual({ total: 0, parTaux: [], sansTva: 0, nb: 5 });
  });
});

describe('résumé de TVA (Réglages › Comptabilité, aide administrative)', () => {
  const ligne = (prixUnitaire, tva) => ({ description: 'Travaux', quantite: 1, prixUnitaire, tva });
  const DOCS = [
    { id: 'F1', type: 'facture', statut: 'envoye', date: '2026-07-15', total_ht: 1000, tva: 100, total_ttc: 1100, lignes: [ligne(1000, 10)] },
    { id: 'F2', type: 'facture', statut: 'brouillon', date: '2026-07-20', total_ht: 500, tva: 100, total_ttc: 600, lignes: [ligne(500, 20)] },
    { id: 'D1', type: 'devis', statut: 'accepte', date: '2026-07-21', total_ht: 900, tva: 180, total_ttc: 1080, lignes: [ligne(900, 20)] },
    { id: 'AV', type: 'facture', facture_type: 'avoir', statut: 'envoye', date: '2026-08-02', total_ht: -200, tva: -20, total_ttc: -220, lignes: [ligne(-200, 10)] },
  ];

  it('factures émises seulement, avoirs déduits, TVA des dépenses saisie seulement', () => {
    const r = calculateTVASummary(DOCS, DEPENSES, '2026-07-01', '2026-09-30');
    expect(r.tvaCollectee).toBe(80);
    expect(r.tvaDeductible).toBe(48);
    expect(r.tvaNetteAPayer).toBe(32);
    expect(r.isCredit).toBe(false);
    expect(r.nbFactures).toBe(2);
    expect(r.nbDepenses).toBe(4);
    expect(r.depensesSansTva).toBe(1);
    expect(r.detailParTaux['10']).toEqual({ base: 800, collectee: 80, baseDeductible: 200, deductible: 20 });
    expect(r.detailParTaux['20']).toEqual({ base: 0, collectee: 0, baseDeductible: 140, deductible: 28 });
  });

  it('franchise : ni TVA facturée ni TVA déductible', () => {
    const r = calculateTVASummary(DOCS, DEPENSES, '2026-07-01', '2026-09-30', { franchise: true });
    expect([r.tvaCollectee, r.tvaDeductible, r.tvaNetteAPayer, r.depensesSansTva]).toEqual([0, 0, 0, 0]);
    expect(r.detailParTaux).toEqual({});
  });
});
