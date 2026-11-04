import { describe, it, expect } from 'vitest';
import { METIERS, normaliserMetiers, bibliothequeDes, referentielDes, modelesDes, partagerParMetier, changementsDuChoix } from '../metiers';
import { TRADE_LIBRARY } from '../templates/trade-library';
import { MODELES_DEVIS } from '../data/modeles';
import { CATEGORIES_METIERS as CATEGORIES_BTP } from '../data/articles-btp';

// Lot 1 de docs/metiers/synthese.md (§ 3.1, 3.2) : le métier choisi à l'inscription règle l'ordre du catalogue et des
// modèles et allume des modules ; rien n'est caché, et un artisan qui passe garde l'app telle qu'elle est.
describe('métiers', () => {
  it('15 métiers de la synthèse plus « Autre »', () => {
    expect(METIERS.map((m) => m.id)).toEqual(['electricien', 'plombier', 'chauffagiste', 'frigoriste', 'ramoneur', 'macon', 'couvreur',
      'charpentier', 'menuisier', 'plaquiste', 'peintre', 'carreleur', 'serrurier', 'paysagiste', 'multiservice', 'autre']);
  });

  it('même liste fermée que la migration 110 (contrainte entreprise_metiers_connus)', async () => {
    const fs = await import('node:fs');
    const sql = fs.readFileSync('supabase/migrations/110_metiers_et_qualifications.sql', 'utf8');
    for (const m of METIERS) expect(sql).toContain(`'${m.id}'`);
  });

  it('chaque correspondance existe vraiment (bibliothèque, référentiel, modèles)', () => {
    const categories = CATEGORIES_BTP.map((c) => c.id);
    for (const m of METIERS) {
      for (const b of m.bibliotheque) expect(TRADE_LIBRARY[b], `${m.id} → ${b}`).toBeTruthy();
      for (const r of m.referentiel) expect(categories, `${m.id} → ${r}`).toContain(r);
      for (const f of m.modeles) expect(MODELES_DEVIS[f], `${m.id} → ${f}`).toBeTruthy();
    }
  });

  it('les trois métiers qui manquaient ont leur bibliothèque : ramonage, froid et climatisation, multiservice', () => {
    expect(bibliothequeDes(['ramoneur'])).toEqual(['ramonage']);
    expect(bibliothequeDes(['frigoriste'])[0]).toBe('froid');
    expect(bibliothequeDes(['multiservice'])).toEqual(['multiservice']);
  });

  it('valeurs inconnues et doublons écartés, ordre de la liste', () => {
    expect(normaliserMetiers(['plombier', 'astronaute', 'electricien', 'plombier', 3])).toEqual(['electricien', 'plombier']);
    expect(normaliserMetiers(null)).toEqual([]);
  });

  it('électricien + plombier : leurs métiers en tête, les autres derrière, rien ne disparaît', () => {
    const tous = Object.keys(TRADE_LIBRARY);
    const { premiers, autres } = partagerParMetier(tous, bibliothequeDes(['plombier', 'electricien']), (x) => x);
    expect(premiers).toEqual(['electricite', 'plomberie']);
    expect([...premiers, ...autres].sort()).toEqual([...tous].sort());
    expect(referentielDes(['plombier', 'electricien'])).toEqual(['electricite', 'plomberie']);
    expect(modelesDes(['electricien'])).toContain('irve-solaire');
  });

  it('sans choix (ou « Autre » seul) : tout est en tête, dans l’ordre d’aujourd’hui', () => {
    const tous = Object.keys(TRADE_LIBRARY);
    for (const choix of [[], ['autre'], undefined]) {
      const { premiers, autres } = partagerParMetier(tous, bibliothequeDes(choix), (x) => x);
      expect(premiers).toEqual(tous);
      expect(autres).toEqual([]);
    }
  });

  it('ramoneur allume « J’effectue des ramonages » ; le retirer ne l’éteint pas', () => {
    expect(changementsDuChoix({}, ['ramoneur'])).toEqual({ metiers: ['ramoneur'], ramonageActif: true });
    expect(changementsDuChoix({ ramonageActif: true }, ['peintre'])).toEqual({ metiers: ['peintre'] });
    expect(changementsDuChoix({}, ['electricien'])).toEqual({ metiers: ['electricien'] });
  });
});
