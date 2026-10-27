import { describe, it, expect } from 'vitest';
import { GoTrueClient } from '@supabase/auth-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLES_PROPRES_AU_COMPTE } from '../clesCompte';

// La déconnexion hors ligne (src/supabaseClient.js) efface la session de l'appareil par la méthode privée
// `_removeSession` d'auth-js (elle efface aussi `-user` et `-code-verifier` et prévient l'app par SIGNED_OUT).
// Si une mise à jour de supabase-js la retire, le repli reste, mais sans SIGNED_OUT : ce test le signale.
describe('déconnexion hors ligne : la méthode utilisée existe toujours', () => {
  it('GoTrueClient#_removeSession', () => {
    expect(typeof GoTrueClient.prototype._removeSession).toBe('function');
  });
});

// Relecture sécurité du 26 oct. 2026 (S4) : les données d'Équipe et de post-chantier gardées sur l'appareil restaient
// après la déconnexion ; le compte suivant, sur le même téléphone, les voyait.
describe('déconnexion : les données du compte gardées sur l\'appareil sont effacées', () => {
  const lire = (f) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..', f), 'utf8');

  it('la liste contient les clés d\'avant et celles d\'Équipe et de post-chantier', () => {
    for (const cle of ['mallettico_recent_items', 'cp_entreprise', 'cp_entreprises', 'cp_pending_invitation',
      'mallettico_conges', 'mallettico_signatures', 'mallettico_chat', 'mallettico_chat_pins',
      'cp_terrain_timers', 'mallettico_equipe_timer', 'cp_post_chantier_sequence']) {
      expect(CLES_PROPRES_AU_COMPTE).toContain(cle);
    }
  });

  it('chaque clé est bien celle qu\'écrit son écran (un renommage la ferait échapper à la purge)', () => {
    const equipe = lire('src/components/Equipe.jsx');
    for (const cle of ['mallettico_conges', 'mallettico_signatures', 'mallettico_chat', 'mallettico_chat_pins', 'cp_terrain_timers', 'mallettico_equipe_timer']) {
      expect(equipe).toContain(`'${cle}'`);
    }
    expect(lire('src/components/settings/PostChantierSettings.jsx')).toContain("'cp_post_chantier_sequence'");
  });

  it('signOut efface la liste', () => {
    expect(lire('src/supabaseClient.js')).toMatch(/for \(const cle of CLES_PROPRES_AU_COMPTE\) localStorage\.removeItem\(cle\)/);
  });
});
