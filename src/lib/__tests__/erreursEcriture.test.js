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

  it('une garde de la base qui dit quoi faire (signature sur place figée, 091) est rendue telle quelle', () => {
    const message = 'Un devis signé sur place ne se modifie plus : pour changer les travaux ou le prix, faites signer un avenant au client';
    expect(messageEcritureRefusee({ status: 403, code: '42501', message })).toBe(message);
  });

  it('idem pour une facture émise (093) : « faites un avoir »', () => {
    const message = 'Une facture émise ne se modifie pas : faites un avoir';
    expect(messageEcritureRefusee({ status: 403, code: '42501', message })).toBe(message);
    expect(messageEcritureRefusee({ status: 403, code: '42501', message: 'permission denied for table devis' })).toMatch(/droit/);
    const numerotee = 'Une facture numérotée garde son numéro : la numérotation doit rester continue';
    expect(messageEcritureRefusee({ status: 403, code: '42501', message: numerotee })).toBe(numerotee);
  });

  it('idem pour un devis déjà facturé et un encaissement (098) ; un numéro de facture pris est expliqué', () => {
    const deja = 'Ce devis est déjà facturé : avec cette facture (840,00 €), le total facturé dépasserait le devis (1200,00 €, dont 1200,00 € déjà facturés). Rechargez la page.';
    expect(messageEcritureRefusee({ status: 403, code: '42501', message: deja })).toBe(deja);
    const encaisse = 'Un encaissement enregistré ne se modifie ni ne s\'efface : corrigez-le avec « Corriger » dans les paiements de la facture.';
    expect(messageEcritureRefusee({ status: 403, code: '42501', message: encaisse })).toBe(encaisse);
    expect(messageEcritureRefusee({ status: 409, code: '23505', message: 'duplicate key value violates unique constraint "devis_factures_numero_unique"' }))
      .toMatch(/numéro de facture vient d'être utilisé/);
    expect(messageEcritureRefusee({ status: 409, code: '23505', message: 'duplicate key value violates unique constraint "clients_pkey"' }))
      .toMatch(/existe déjà/);
  });

  it('une facture marquée « payée » sans être soldée (099) : le reste à encaisser est dit tel quel', () => {
    const pasSoldee = 'Cette facture n\'est pas soldée : il reste 150,00 € à encaisser. Enregistrez l\'encaissement reçu avec « Encaisser » ; si c\'est déjà fait, rechargez la page.';
    expect(messageEcritureRefusee({ status: 403, code: '42501', message: pasSoldee })).toBe(pasSoldee);
  });

  it('une session expirée (401, même avec 42501) invite à se reconnecter, pas « pas le droit »', () => {
    expect(estSessionExpiree({ status: 401, code: '42501' })).toBe(true);
    expect(messageEcritureRefusee({ status: 401, code: '42501' })).toMatch(/Reconnectez-vous/);
  });
});
