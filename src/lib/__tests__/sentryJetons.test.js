import { describe, it, expect } from 'vitest';
import { masquerJetons, masquerEvenement } from '../sentry';

describe('rapports d\'erreur : jetons des pages publiques masqués (gardien, 10 oct. 2026)', () => {
  it('chemins de signature, paiement, portail, invitation', () => {
    expect(masquerJetons('https://mallettico.fr/devis/signer/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007')).toBe('https://mallettico.fr/devis/signer/***');
    expect(masquerJetons('https://mallettico.fr/pay/abc_123?x=1')).toBe('https://mallettico.fr/pay/***?x=1');
    expect(masquerJetons('/invitation/1234-abcd')).toBe('/invitation/***');
    expect(masquerJetons('/portal/ff00')).toBe('/portal/***');
  });

  it('paramètres apikey et token, partout', () => {
    expect(masquerJetons('https://x.supabase.co/rest/v1/devis?apikey=abc&token=def&a=1')).toBe('https://x.supabase.co/rest/v1/devis?apikey=***&token=***&a=1');
  });

  it('traces et erreurs : nom de transaction, adresse, descriptions des spans', () => {
    const e = masquerEvenement({ transaction: '/devis/signer/aaaa-bbbb', request: { url: 'https://mallettico.fr/pay/xyz' }, spans: [{ description: 'GET /devis/signer/aaaa-bbbb' }] });
    expect(e.transaction).toBe('/devis/signer/***');
    expect(e.request.url).toBe('https://mallettico.fr/pay/***');
    expect(e.spans[0].description).toBe('GET /devis/signer/***');
  });
});
