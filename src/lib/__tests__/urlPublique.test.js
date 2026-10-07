import { describe, it, expect, vi, afterEach } from 'vitest';
import { urlPublique, ORIGINE_PUBLIQUE } from '../urlPublique';
import { buildPaymentUrl } from '../paymentUtils';

describe('urlPublique', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sur le site : garde l’origine courante (local, préprod)', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    expect(urlPublique('/devis/signer/abc')).toBe('http://localhost:5173/devis/signer/abc');
    expect(urlPublique('pay/x')).toBe('http://localhost:5173/pay/x');
  });

  it('hors navigateur : le site public', () => {
    expect(urlPublique('/')).toBe(`${ORIGINE_PUBLIQUE}/`);
  });

  it('les liens de paiement passent par là', () => {
    vi.stubGlobal('window', { location: { origin: 'https://mallettico.fr' } });
    expect(buildPaymentUrl('tok')).toBe('https://mallettico.fr/pay/tok');
  });
});
