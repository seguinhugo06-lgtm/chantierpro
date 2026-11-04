import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ACCORD_IA_VERSION, ACCORD_IA_TITRE, ACCORD_IA_TEXTE, ACCORD_IA_ACCEPTER, ACCORD_IA_REFUSER, ACCORD_IA_EN_SAVOIR_PLUS,
  lireAccordIa, donnerAccordIa, retirerAccordIa,
} from '../accordIa';
import { ACCORD_IA_VERSION as VERSION_SERVEUR } from '../../../supabase/functions/voice-intent/regles.ts';

const UID = 'u-1';

/**
 * Faux client supabase-js, en mémoire, qui applique les filtres eq / is comme PostgREST et, comme la base (RLS), ignore
 * en silence un UPDATE refusé (`refuserUpdate`).
 */
function fauxClient({ lignes = [], erreurLecture = null, erreurInsert = null, refuserUpdate = false } = {}) {
  const table = lignes.map((l) => ({ ...l }));
  let id = 100;
  const appels = [];
  const requete = (op, valeurs) => {
    const filtres = [];
    const q = {
      select() { return q; },
      eq(c, v) { filtres.push((l) => l[c] === v); return q; },
      is(c, v) { filtres.push((l) => (l[c] ?? null) === v); return q; },
      single() { q.unique = true; return q; },
      then(ok, ko) {
        appels.push(op);
        let r;
        const choisies = () => table.filter((l) => filtres.every((f) => f(l)));
        if (op === 'select') r = erreurLecture ? { data: null, error: erreurLecture } : { data: choisies(), error: null };
        else if (op === 'insert') {
          if (erreurInsert) r = { data: null, error: erreurInsert };
          else { const l = { id: ++id, user_id: UID, fonction: 'dictee', accepte_le: '2026-11-04T10:00:00Z', revoque_le: null, ...valeurs }; table.push(l); r = { data: q.unique ? l : [l], error: null }; }
        } else if (op === 'update') {
          const c = refuserUpdate ? [] : choisies();
          c.forEach((l) => Object.assign(l, valeurs));
          r = { data: c, error: null };
        }
        return Promise.resolve(r).then(ok, ko);
      },
    };
    return q;
  };
  return {
    table, appels,
    from: () => ({
      select: () => requete('select'),
      insert: (v) => requete('insert', v),
      update: (v) => requete('update', v),
    }),
  };
}

describe('accord avant la première dictée : texte et version', () => {
  it('le texte est celui de juriste-btp, mot pour mot (3 nov. 2026)', () => {
    expect(ACCORD_IA_TITRE).toBe('Avant votre première dictée');
    expect(ACCORD_IA_TEXTE).toBe("Votre dictée est analysée par une intelligence artificielle : Claude, de la société Anthropic, qui stocke les données aux États-Unis (le calcul peut avoir lieu dans d'autres pays). Mallettico lui envoie le texte de la dictée, avec les noms de vos clients (60 au plus) et les libellés de votre catalogue (80 au plus). Mallettico ne reçoit pas le son : votre navigateur le transforme en texte (sur Chrome, par Google). Anthropic n'utilise pas ces données pour entraîner ses modèles et les efface sous 30 jours (jusqu'à 2 ans si ses contrôles de sécurité les signalent). L'IA peut se tromper : vous relisez tout, rien n'est créé sans votre validation.");
    expect([ACCORD_IA_ACCEPTER, ACCORD_IA_REFUSER, ACCORD_IA_EN_SAVOIR_PLUS])
      .toEqual(["J'accepte et je dicte", 'Non, je saisis à la main', 'En savoir plus (Politique de confidentialité, article 4)']);
  });

  it('la version attendue par le serveur est celle de l’app (une seule source)', () => {
    expect(VERSION_SERVEUR).toBe(ACCORD_IA_VERSION);
  });

  it('l’écran et la politique de confidentialité disent la même chose (60 clients, 80 libellés, 30 jours, 2 ans, États-Unis)', () => {
    const politique = fs.readFileSync(path.resolve(process.cwd(), 'src/components/LegalPages.jsx'), 'utf8');
    for (const fait of ['60 au plus', '80 au plus', 'Mallettico ne reçoit jamais le son', '30 jours', '2 ans', 'États-Unis (stockage) ; calcul possible dans d\'autres pays', 'ne servent pas à entraîner']) {
      expect(politique, fait).toContain(fait);
    }
    expect(politique).toContain('id="article-4"');
    expect(politique).toMatch(/nous enregistrons votre compte, la date et la version du texte accepté/);
  });
});

describe('accord avant la première dictée : lecture, accord, retrait', () => {
  it('sans accord : non ; avec un accord en cours à la version : oui ; à une ancienne version : non', async () => {
    expect((await lireAccordIa(fauxClient(), UID)).accord).toBe(false);
    const avec = await lireAccordIa(fauxClient({ lignes: [{ id: 1, user_id: UID, fonction: 'dictee', version: ACCORD_IA_VERSION, accepte_le: '2026-11-04', revoque_le: null }] }), UID);
    expect([avec.accord, avec.depuis]).toEqual([true, '2026-11-04']);
    expect((await lireAccordIa(fauxClient({ lignes: [{ id: 1, user_id: UID, fonction: 'dictee', version: '2026-01-01', revoque_le: null }] }), UID)).accord).toBe(false);
    expect((await lireAccordIa(fauxClient({ lignes: [{ id: 1, user_id: UID, fonction: 'dictee', version: ACCORD_IA_VERSION, revoque_le: '2026-11-04' }] }), UID)).accord).toBe(false);
  });

  it('erreur de lecture : pas d’accord, et l’erreur est rendue (jamais un faux « oui »)', async () => {
    const r = await lireAccordIa(fauxClient({ erreurLecture: { code: '42P01', message: 'absente' } }), UID);
    expect(r.accord).toBe(false);
    expect(r.error?.code).toBe('42P01');
  });

  it('donner son accord écrit la version seule (compte et date : la base) ; une erreur d’écriture n’est pas un succès', async () => {
    const c = fauxClient();
    expect((await donnerAccordIa(c, UID)).ok).toBe(true);
    expect(c.table).toHaveLength(1);
    expect(c.table[0].version).toBe(ACCORD_IA_VERSION);
    const ko = await donnerAccordIa(fauxClient({ erreurInsert: { code: '42501', message: 'refus' } }), UID);
    expect(ko.ok).toBe(false);
  });

  it('un accord à une ancienne version est retiré avant le nouveau (un seul en cours)', async () => {
    const c = fauxClient({ lignes: [{ id: 1, user_id: UID, fonction: 'dictee', version: '2026-01-01', revoque_le: null }] });
    expect((await donnerAccordIa(c, UID)).ok).toBe(true);
    expect(c.table.filter((l) => l.revoque_le == null).map((l) => l.version)).toEqual([ACCORD_IA_VERSION]);
  });

  it('retirer son accord : plus d’accord ensuite ; un retrait refusé en silence (RLS) est un échec', async () => {
    const c = fauxClient({ lignes: [{ id: 1, user_id: UID, fonction: 'dictee', version: ACCORD_IA_VERSION, revoque_le: null }] });
    expect((await retirerAccordIa(c, UID)).ok).toBe(true);
    expect((await lireAccordIa(c, UID)).accord).toBe(false);
    const refuse = fauxClient({ refuserUpdate: true, lignes: [{ id: 1, user_id: UID, fonction: 'dictee', version: ACCORD_IA_VERSION, revoque_le: null }] });
    expect((await retirerAccordIa(refuse, UID)).ok).toBe(false);
  });
});
