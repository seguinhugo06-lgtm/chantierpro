import { describe, it, expect } from 'vitest';
import { budgetChantier, resteAFacturerChantier } from '../budgetChantier';

const CH = { id: 'ch1', nom: 'Salle de bain', budget_estime: 5000 };
const devis = (extra) => ({ id: 'd1', type: 'devis', chantier_id: 'ch1', statut: 'accepte', total_ht: 1000, total_ttc: 1200, ...extra });
const facture = (extra) => ({ id: 'f1', type: 'facture', chantier_id: 'ch1', devis_source_id: 'd1', facture_type: 'acompte', statut: 'envoyee', total_ht: 300, total_ttc: 360, ...extra });

describe('budget d’un chantier : une définition pour la liste, son sous-titre et la fiche', () => {
  it('prend le revenu du bilan : les devis signés plus les ajustements', () => {
    expect(budgetChantier(CH, { revenuTotal: 7250 })).toBe(7250);
  });

  it('sans revenu au bilan, retombe sur le budget estimé, sous ses deux noms', () => {
    expect(budgetChantier(CH, { revenuTotal: 0 })).toBe(5000);
    expect(budgetChantier(CH, null)).toBe(5000);
    expect(budgetChantier({ id: 'ch2', budgetPrevu: 1800 }, undefined)).toBe(1800);
  });

  it('rien de défini : 0, jamais NaN', () => {
    expect(budgetChantier({ id: 'ch3' }, {})).toBe(0);
    expect(budgetChantier(null, null)).toBe(0);
    expect(budgetChantier({ id: 'ch3', budget_estime: 'abc' }, {})).toBe(0);
  });
});

describe('reste à facturer d’un chantier : la tuile et le bouton « Facturer le solde » se décident ici', () => {
  it('un devis signé sans facture : tout reste à facturer, et le bouton vise ce devis', () => {
    const d = devis();
    const reste = resteAFacturerChantier(CH, [d]);
    expect(reste).toMatchObject({ ht: 1000, ttc: 1200 });
    expect(reste.devis).toBe(d);
  });

  it('un acompte facturé en est déduit, HT comme TTC', () => {
    const d = devis();
    const reste = resteAFacturerChantier(CH, [d, facture()]);
    expect(reste).toMatchObject({ ht: 700, ttc: 840 });
    expect(reste.devis).toBe(d);
  });

  it('un avoir sur l’acompte rend ce qu’il a crédité', () => {
    const avoir = { id: 'a1', type: 'facture', facture_type: 'avoir', avoir_source_id: 'f1', statut: 'envoyee', chantier_id: 'ch1', total_ht: -300, total_ttc: -360 };
    const reste = resteAFacturerChantier(CH, [devis(), facture(), avoir]);
    expect(reste).toMatchObject({ ht: 1000, ttc: 1200 });
  });

  it('un devis soldé, ou une facture annulée : le bouton n’existe pas quand la tuile dit zéro', () => {
    const solde = facture({ id: 'f2', facture_type: 'solde', total_ht: 1000, total_ttc: 1200 });
    expect(resteAFacturerChantier(CH, [devis(), solde])).toMatchObject({ ht: 0, ttc: 0, devis: null });
    const annulee = facture({ statut: 'annule' });
    expect(resteAFacturerChantier(CH, [devis(), annulee])).toMatchObject({ ht: 1000, ttc: 1200 });
  });

  it('un devis non signé, refusé ou un brouillon n’est pas à facturer', () => {
    for (const statut of ['brouillon', 'envoye', 'vu', 'refuse']) {
      expect(resteAFacturerChantier(CH, [devis({ statut })])).toMatchObject({ ht: 0, ttc: 0, devis: null });
    }
  });

  it('seuls les devis de ce chantier comptent, et plusieurs devis s’additionnent', () => {
    const autre = devis({ id: 'd9', chantier_id: 'ch9', total_ht: 4000, total_ttc: 4800 });
    const second = devis({ id: 'd2', statut: 'signe', total_ht: 500, total_ttc: 600 });
    const reste = resteAFacturerChantier(CH, [autre, devis(), second]);
    expect(reste).toMatchObject({ ht: 1500, ttc: 1800 });
    expect(reste.devis.id).toBe('d1');
  });

  it('sans chantier ni document : zéro', () => {
    expect(resteAFacturerChantier(null, [devis()])).toEqual({ ht: 0, ttc: 0, devis: null });
    expect(resteAFacturerChantier(CH)).toEqual({ ht: 0, ttc: 0, devis: null });
  });
});
