import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => ({ supabase: null, isDemo: true }));
vi.mock('../sentry', () => ({ captureException: vi.fn() }));

const { erreurDictee, MESSAGE_INDISPONIBLE, MESSAGE_RESEAU } = await import('../voiceIntent');

/** Ce que rend supabase-js sur une réponse 4xx/5xx : un message générique, la vraie réponse dans `context`. */
const erreurHttp = (corps) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { json: async () => corps },
});

describe('erreurDictee : le vrai message de voice-intent, jamais un message technique', () => {
  it('quota atteint : message et code du serveur', async () => {
    const e = await erreurDictee(erreurHttp({ error: 'Vos 10 dictées du mois sont utilisées.', code: 'QUOTA_ATTEINT', quota: { limite: 10 } }));
    expect([e.message, e.code, e.quota]).toEqual(['Vos 10 dictées du mois sont utilisées.', 'QUOTA_ATTEINT', { limite: 10 }]);
  });

  it('API indisponible : message du serveur', async () => {
    const e = await erreurDictee(erreurHttp({ error: MESSAGE_INDISPONIBLE, code: 'IA_INDISPONIBLE' }));
    expect([e.message, e.code]).toEqual([MESSAGE_INDISPONIBLE, 'IA_INDISPONIBLE']);
  });

  it('réponse illisible ou fonction absente : « indisponible, saisissez à la main »', async () => {
    for (const err of [
      { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: { json: async () => { throw new Error('pas du JSON'); } } },
      { name: 'FunctionsRelayError', message: 'Relay Error invoking the Edge Function' },
      erreurHttp({}),
    ]) {
      const e = await erreurDictee(err);
      expect([e.message, e.code]).toEqual([MESSAGE_INDISPONIBLE, 'IA_INDISPONIBLE']);
      expect(e.message).not.toMatch(/Edge Function|non-2xx|Relay/);
    }
  });

  it('pas de réseau : le dit, et propose la saisie à la main', async () => {
    for (const err of [{ name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }, new TypeError('Failed to fetch')]) {
      const e = await erreurDictee(err);
      expect([e.message, e.code]).toEqual([MESSAGE_RESEAU, 'RESEAU']);
      expect(e.message).toMatch(/à la main/);
    }
  });
});
