import { describe, it, expect } from 'vitest';
import { estChampMonetaire, sansPrix } from '../auditService';

describe('champs d’audit qui portent un montant', () => {
  it('reconnaît les totaux, montants, budgets, remises et TVA, en snake_case comme en camelCase', () => {
    for (const champ of ['total_ht', 'total_ttc', 'totalHt', 'totalTtc', 'montant', 'montant_devis', 'montantDevis', 'remise_globale', 'remiseGlobale', 'budget_estime', 'budgetPrevu', 'tva_rate', 'acompte_pct', 'prix_achat']) {
      expect(estChampMonetaire(champ), champ).toBe(true);
    }
  });

  it('ne prend pas un nom, une adresse ou une description pour un montant', () => {
    for (const champ of ['statut', 'client_nom', 'objet', 'lignes', 'notes', 'conditions', 'validite', 'code_postal', 'description', 'avancement', 'date_fin', 'adresse']) {
      expect(estChampMonetaire(champ), champ).toBe(false);
    }
  });
});

describe('le journal sans le droit de voir les prix', () => {
  const entree = (extra) => ({ id: 'a', entity_type: 'devis', entity_id: 'd1', action: 'updated', created_at: '2026-10-20T10:00:00Z', changes: {}, ...extra });

  it('retire les champs monétaires d’une modification et garde les autres', () => {
    const [e] = sansPrix([entree({ changes: { objet: { old: 'A', new: 'B' }, total_ht: { old: 8000, new: 8500 }, total_ttc: { old: 9600, new: 10200 } } })]);
    expect(Object.keys(e.changes)).toEqual(['objet']);
  });

  it('une modification qui ne portait que des montants disparaît (devis, facture, chantier)', () => {
    const liste = sansPrix([
      entree({ id: '1', changes: { total_ht: { old: 8000, new: 8500 }, remise_globale: { old: 0, new: 5 } } }),
      entree({ id: '2', entity_type: 'facture', changes: { total_ttc: { old: 1, new: 2 } } }),
      entree({ id: '3', entity_type: 'chantier', changes: { montant_devis: { old: 8000, new: 8500 } } }),
    ]);
    expect(liste).toEqual([]);
  });

  it('garde les créations, envois, signatures et changements de statut', () => {
    const liste = sansPrix([
      entree({ id: 'c', action: 'created', changes: { client_nom: { old: null, new: 'Morel' }, total_ht: { old: null, new: 8000 } } }),
      entree({ id: 's', action: 'status_changed', changes: { statut: { old: 'brouillon', new: 'envoye' }, total_ht: { old: 1, new: 2 } } }),
      entree({ id: 'e', action: 'sent' }),
      entree({ id: 'g', action: 'signed' }),
    ]);
    expect(liste.map((e) => e.id)).toEqual(['c', 's', 'e', 'g']);
    expect(Object.keys(liste[0].changes)).toEqual(['client_nom']);
    expect(Object.keys(liste[1].changes)).toEqual(['statut']);
  });

  it('ne modifie pas les entrées d’origine, et rend les entrées sans montant telles quelles', () => {
    const origine = entree({ changes: { objet: { old: 'A', new: 'B' } } });
    const copie = JSON.parse(JSON.stringify(origine));
    expect(sansPrix([origine])[0]).toBe(origine);
    expect(origine).toEqual(copie);
    const avecMontant = entree({ changes: { objet: { old: 'A', new: 'B' }, total_ht: { old: 1, new: 2 } } });
    sansPrix([avecMontant]);
    expect(Object.keys(avecMontant.changes)).toEqual(['objet', 'total_ht']);
  });

  it('une liste vide ou absente : rien', () => {
    expect(sansPrix([])).toEqual([]);
    expect(sansPrix()).toEqual([]);
  });
});
