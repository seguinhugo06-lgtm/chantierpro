import { describe, it, expect } from 'vitest';
import { ecrituresPaiement } from '../ecrituresBanque';

const solde = (e) => Math.round(e.reduce((s, x) => s + x.debit - x.credit, 0) * 100) / 100;
const compte = (e, c) => e.find((x) => x.compte === c);
const FACTURE = { id: 'f1', numero: 'FAC-2026-00012' };
const CLIENT = { nom: 'Dupont' };

describe('écritures de banque d\'un encaissement', () => {
  it('encaissement : 512 au débit, 411 au crédit, équilibré', () => {
    const e = ecrituresPaiement({ id: 'p1', montant: 400, date: '2026-10-05', reference: 'VIR-2026-001' }, FACTURE, CLIENT);
    expect(solde(e)).toBe(0);
    expect(compte(e, '512000')).toMatchObject({ debit: 400, credit: 0, ref: 'VIR-2026-001' });
    expect(compte(e, '411000')).toMatchObject({ debit: 0, credit: 400 });
  });

  it('correction (098) : écrite en sens inverse, avec sa propre référence et son motif (avant : écartée de l\'export)', () => {
    const e = ecrituresPaiement({ id: 'c1234567-89ab', montant: -100, date: '2026-10-18', reference: 'p1', notes: 'Correction : Virement saisi en double' }, FACTURE, CLIENT);
    expect(solde(e)).toBe(0);
    expect(compte(e, '411000')).toMatchObject({ debit: 100, credit: 0 });
    expect(compte(e, '512000')).toMatchObject({ debit: 0, credit: 100 });
    expect(e[0].ref).toBe('COR-20261018-c1234567');
    expect(e[0].libelle).toBe('Correction encaissement fact. FAC-2026-00012 - Virement saisi en double');
  });

  it('montant nul : aucune écriture', () => {
    expect(ecrituresPaiement({ id: 'p0', montant: 0, date: '2026-10-05' }, FACTURE, CLIENT)).toEqual([]);
  });
});
