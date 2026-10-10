import { describe, it, expect } from 'vitest';
import { estEcritureDifferable, estSessionExpiree, messageEcritureRefusee } from '../erreursEcriture';

describe('estEcritureDifferable', () => {
  it('garde en file une écriture qui n\'a pas pu arriver (réseau, serveur indisponible, session expirée)', () => {
    expect(estEcritureDifferable({ status: 0, message: 'TypeError: Failed to fetch' }, true)).toBe(true);
    expect(estEcritureDifferable({ message: 'TypeError: Load failed' }, true)).toBe(true);
    expect(estEcritureDifferable({ message: 'quelque chose' }, false)).toBe(true); // sans statut, appareil hors ligne
    expect(estEcritureDifferable({ status: 503 }, true)).toBe(true);
    expect(estEcritureDifferable({ status: 524 }, true)).toBe(true); // délai dépassé derrière Cloudflare
    expect(estEcritureDifferable({ status: 401, message: 'JWT expired' }, true)).toBe(true);
  });

  it("ne met jamais en file un refus de la base : il ne passerait pas davantage plus tard", () => {
    expect(estEcritureDifferable({ status: 403, code: '42501', message: 'new row violates row-level security policy' }, true)).toBe(false);
    expect(estEcritureDifferable({ status: 406, code: 'PGRST116' }, true)).toBe(false);
    expect(estEcritureDifferable({ status: 400, code: '23514' }, true)).toBe(false);
    expect(estEcritureDifferable({ status: 409, code: '23505' }, true)).toBe(false);
    expect(estEcritureDifferable({ status: 500, code: '42P17' }, true)).toBe(false); // récursion de policy
    expect(estEcritureDifferable({ status: 500, code: 'XX000' }, true)).toBe(false);
  });

  it('une réponse reçue de la base prime sur « hors ligne » (navigator.onLine peut mentir)', () => {
    expect(estEcritureDifferable({ status: 403, code: '42501' }, false)).toBe(false);
  });

  it("traite une erreur inconnue sans statut, en ligne, comme un refus (la dire plutôt que l'enterrer)", () => {
    expect(estEcritureDifferable(new Error('quelque chose'), true)).toBe(false);
  });
});

describe('messageEcritureRefusee', () => {
  it("parle à l'artisan, sans jargon technique ni anglais", () => {
    const cas = [
      { status: 403, code: '42501', message: 'new row violates row-level security policy for table "clients"' },
      { status: 406, code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      { status: 400, code: '23514', message: 'new row for relation "devis" violates check constraint' },
      { status: 401, message: 'JWT expired' },
      { status: 400, code: 'XX000', message: 'boom' },
    ];
    for (const e of cas) {
      const m = messageEcritureRefusee(e);
      expect(m).not.toMatch(/row|violates|JSON|JWT|constraint|boom/i);
      expect(m.length).toBeGreaterThan(10);
    }
    expect(messageEcritureRefusee(cas[0])).toMatch(/droit/);
    expect(messageEcritureRefusee(cas[1])).toMatch(/n'existe plus/);
  });

  it('une session expirée (401, même avec 42501) invite à se reconnecter, pas « pas le droit »', () => {
    expect(estSessionExpiree({ status: 401, code: '42501' })).toBe(true);
    expect(messageEcritureRefusee({ status: 401, code: '42501' })).toMatch(/Reconnectez-vous/);
  });
});
