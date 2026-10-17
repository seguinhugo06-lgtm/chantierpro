import { describe, it, expect } from 'vitest';
import { ecrituresDepense } from '../ecrituresAchat';

// Une écriture comptable est équilibrée (total des débits = total des crédits), sinon le FEC est rejeté par l'outil de
// contrôle de la DGFiP. Relecture juriste-btp du 17 oct. 2026.
const solde = (ecritures) => Math.round(ecritures.reduce((s, e) => s + e.debit - e.credit, 0) * 100) / 100;
const compte = (ecritures, c) => ecritures.filter((e) => e.compte === c);
const DEP = { id: 'dep-1', date: '2026-07-03', description: 'Câble', fournisseur: 'Rexel', categorie: 'Matériaux' };

describe('écritures d\'achat d\'une dépense', () => {
  it('TVA connue : 606 HT et 445660 au débit, 401 TTC au crédit', () => {
    const e = ecrituresDepense({ ...DEP, montant: 100, tauxTva: 20 });
    expect(solde(e)).toBe(0);
    expect(compte(e, '606000')[0].debit).toBe(100);
    expect(compte(e, '445660')[0].debit).toBe(20);
    expect(compte(e, '401000')[0].credit).toBe(120);
  });

  it('TVA non saisie : pas de 445660, libellé signalé, équilibrée', () => {
    const e = ecrituresDepense({ ...DEP, montant: 100 });
    expect(solde(e)).toBe(0);
    expect(compte(e, '445660')).toHaveLength(0);
    expect(compte(e, '606000')[0].libelle).toContain('(TVA non saisie)');
  });

  it('franchise : le montant payé est la charge, pas de TVA déductible', () => {
    const e = ecrituresDepense({ ...DEP, montant: 120, tauxTva: 20 }, { franchise: true });
    expect(solde(e)).toBe(0);
    expect(compte(e, '445660')).toHaveLength(0);
    expect(compte(e, '606000')[0].debit).toBe(120);
    expect(compte(e, '401000')[0].credit).toBe(120);
  });

  it('avoir du fournisseur (montant négatif) : chaque écriture change de sens, équilibrée', () => {
    const e = ecrituresDepense({ ...DEP, montant: -100, tauxTva: 20 });
    expect(solde(e)).toBe(0);
    expect(compte(e, '606000')[0]).toMatchObject({ debit: 0, credit: 100 });
    expect(compte(e, '445660')[0]).toMatchObject({ debit: 0, credit: 20 });
    expect(compte(e, '401000')[0]).toMatchObject({ debit: 120, credit: 0 });
    expect(e.every((x) => x.debit >= 0 && x.credit >= 0)).toBe(true);
  });
});
