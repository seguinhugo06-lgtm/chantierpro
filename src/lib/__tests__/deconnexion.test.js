import { describe, it, expect } from 'vitest';
import { GoTrueClient } from '@supabase/auth-js';

// La déconnexion hors ligne (src/supabaseClient.js) efface la session de l'appareil par la méthode privée
// `_removeSession` d'auth-js (elle efface aussi `-user` et `-code-verifier` et prévient l'app par SIGNED_OUT).
// Si une mise à jour de supabase-js la retire, le repli reste, mais sans SIGNED_OUT : ce test le signale.
describe('déconnexion hors ligne : la méthode utilisée existe toujours', () => {
  it('GoTrueClient#_removeSession', () => {
    expect(typeof GoTrueClient.prototype._removeSession).toBe('function');
  });
});
