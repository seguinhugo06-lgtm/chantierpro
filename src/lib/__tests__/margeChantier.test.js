import { describe, it, expect } from 'vitest';
import { calculateChantierMargin } from '../business/margin-calculator';

// Recette du 9 oct. 2026 : un devis facturé puis payé comptait deux fois (devis « facture » + facture « payee »),
// Cuisine Dupont affichait +45,1 % de marge au lieu de -9,8 %.
describe('marge d\'un chantier : un travail facturé compte une seule fois', () => {
  const chantier = { id: 'ch1', nom: 'Cuisine Dupont' };
  const devis = [
    { id: 'd1', type: 'devis', statut: 'facture', chantier_id: 'ch1', total_ht: 3760 },
    { id: 'f1', type: 'facture', facture_type: 'totale', statut: 'payee', chantier_id: 'ch1', total_ht: 3760, devis_source_id: 'd1' },
  ];
  const depenses = [{ chantierId: 'ch1', montant: 4128 }];

  it('revenu prévu = le devis ; encaissé = la facture payée', () => {
    const b = calculateChantierMargin(chantier, { devis, depenses });
    expect(b.revenuPrevu).toBe(3760);
    expect(b.revenuEncaisse).toBe(3760);
    expect(Math.round(b.tauxMarge * 10) / 10).toBe(-9.8);
  });

  it('acompte facturé non payé : en attente, pas un second revenu', () => {
    const b = calculateChantierMargin(chantier, {
      devis: [
        { id: 'd2', type: 'devis', statut: 'acompte_facture', chantier_id: 'ch1', total_ht: 18500 },
        { id: 'a2', type: 'facture', facture_type: 'acompte', statut: 'envoye', chantier_id: 'ch1', total_ht: 5550 },
        { id: 'b2', type: 'facture', facture_type: 'acompte', statut: 'brouillon', chantier_id: 'ch1', total_ht: 999 },
      ],
      depenses: [],
    });
    expect(b.revenuPrevu).toBe(18500);
    expect(b.revenuEnAttente).toBe(5550);
    expect(b.revenuEncaisse).toBe(0);
  });
});
