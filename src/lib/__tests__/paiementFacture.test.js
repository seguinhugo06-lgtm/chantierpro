import { describe, it, expect } from 'vitest';
import { compteQuiEncaisse, estCleDeTest, refusFactureFictive } from '../../../supabase/functions/create-invoice-payment/regles.ts';

// Règles de la fonction Edge create-invoice-payment (page /pay/:token) : une facture du compte de
// démonstration ne se paie qu'en mode test (D-26, D-27).
describe('paiement d’une facture : clé Stripe de test', () => {
  it('reconnaît les clés de test, secrètes ou restreintes', () => {
    expect(estCleDeTest('sk_test_51AbC')).toBe(true);
    expect(estCleDeTest('rk_test_51AbC')).toBe(true);
  });

  it('tout le reste compte comme une clé réelle', () => {
    for (const cle of ['sk_live_51AbC', 'rk_live_51AbC', 'pk_test_51AbC', ' sk_test_51AbC', 'SK_TEST_51AbC', '', null, undefined, 42, {}]) {
      expect(estCleDeTest(cle), String(cle)).toBe(false);
    }
  });
});

describe('paiement d’une facture : compte de démonstration', () => {
  it('refuse une facture fictive avec une clé réelle', () => {
    expect(refusFactureFictive({ donnees_fictives: true }, false)).toMatch(/Compte de démonstration/);
    expect(refusFactureFictive({ donnees_fictives: 'true' }, false)).toMatch(/Compte de démonstration/);
  });

  it('accepte une facture fictive en mode test', () => {
    expect(refusFactureFictive({ donnees_fictives: true }, true)).toBeNull();
  });

  it('ne change rien pour une fiche ordinaire, ni sans marqueur', () => {
    expect(refusFactureFictive({ donnees_fictives: false }, false)).toBeNull();
    expect(refusFactureFictive({}, false)).toBeNull();
    expect(refusFactureFictive(undefined, false)).toBeNull();
  });
});

// Migration 106 : la facture d'un salarié s'encaisse sur le compte Stripe du propriétaire de l'organisation
describe('paiement d’une facture : compte qui encaisse', () => {
  it('celui que la base désigne', () => {
    expect(compteQuiEncaisse({ beneficiaire_id: 'patron', user_id: 'salarie' })).toBe('patron');
  });

  it('sinon l’auteur de la facture (base pas encore à jour)', () => {
    expect(compteQuiEncaisse({ user_id: 'salarie' })).toBe('salarie');
    expect(compteQuiEncaisse({ beneficiaire_id: null, user_id: 'salarie' })).toBe('salarie');
  });

  it('aucun compte : chaîne vide (la clé ne sera pas trouvée, le paiement refusé)', () => {
    expect(compteQuiEncaisse({})).toBe('');
    expect(compteQuiEncaisse({ beneficiaire_id: 42 })).toBe('');
  });
});
