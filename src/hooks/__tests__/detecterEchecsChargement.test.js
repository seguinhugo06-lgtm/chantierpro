import { describe, it, expect } from 'vitest';
import { detecterEchecsChargement } from '../useSupabaseSync';

describe('detecterEchecsChargement', () => {
  it('signale une coupure réseau sur une table essentielle', () => {
    const erreurs = detecterEchecsChargement({
      clients: { data: null, error: { message: 'TypeError: Failed to fetch' } },
      devis: { data: [{ id: 1 }], error: null },
    });
    expect(erreurs).toEqual([{ table: 'clients', code: null, message: 'TypeError: Failed to fetch' }]);
  });

  it('signale un refus de droits ou un délai dépassé', () => {
    const erreurs = detecterEchecsChargement({
      devis: { data: null, error: { code: '42501', message: 'permission denied for table devis' } },
      chantiers: { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } },
    });
    expect(erreurs.map((e) => e.table)).toEqual(['devis', 'chantiers']);
  });

  it('reste muet sur les erreurs de schéma (table ou colonne absente en production)', () => {
    expect(detecterEchecsChargement({
      memos: { data: null, error: { code: '42P01', message: 'relation "memos" does not exist' } },
      pointages: { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } },
      equipe: { data: null, error: { code: '42703', message: 'column does not exist' } },
    })).toEqual([]);
  });

  it('accepte des résultats absents', () => {
    expect(detecterEchecsChargement({ clients: undefined, devis: null })).toEqual([]);
  });
});
