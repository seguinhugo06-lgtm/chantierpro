import { describe, it, expect } from 'vitest';
import { METIERS, normaliserMetiers, bibliothequeDes, referentielDes, modelesDes, partagerParMetier, changementsDuChoix, lotsAlternes, peutChoisirSonMetier } from '../metiers';
import { getInvitableRoles, getAllRoles, canAccessPage, hasFullAccess } from '../permissions';
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
    // D-36 : chaque métier allume son module, jamais un autre, et rien ne s'éteint
    expect(changementsDuChoix({}, ['electricien'])).toEqual({ metiers: ['electricien'], electriciteActif: true });
    expect(changementsDuChoix({}, ['chauffagiste', 'frigoriste'])).toEqual({ metiers: ['chauffagiste', 'frigoriste'], entretienActif: true });
    expect(changementsDuChoix({}, ['serrurier'])).toEqual({ metiers: ['serrurier'], depannageActif: true });
    expect(changementsDuChoix({}, ['plombier'])).toEqual({ metiers: ['plombier'], depannageActif: true });
    expect(changementsDuChoix({ electriciteActif: true }, ['electricien'])).toEqual({ metiers: ['electricien'] });
    expect(changementsDuChoix({}, ['macon', 'peintre'])).toEqual({ metiers: ['macon', 'peintre'] });
  });
});

// Garde-fous de TVA proposée par ligne (synthèse § 3.6 ; avis juriste du 4 nov. 2026) : une suggestion, jamais un
// taux réduit là où le texte l'exclut
describe('bibliothèque : taux proposés', () => {
  const lignes = Object.values(TRADE_LIBRARY).flatMap((t) => [...t.lots.flatMap((l) => l.lignes), ...t.prestations]);
  it('chaudière gaz ou fioul : jamais à taux réduit (20 % depuis le 1er mars 2025)', () => {
    const chaudieres = lignes.filter((l) => /chaudière (gaz|fioul)/i.test(l.designation) && /fourniture|remplacement/i.test(l.designation));
    expect(chaudieres.length).toBeGreaterThan(0);
    for (const l of chaudieres) expect(l.tva, l.designation).toBe(20);
  });
  it('fourniture d’une climatisation : 20 % (CGI 279-0 bis, 1), la pose peut rester à 10 %', () => {
    const fournitures = lignes.filter((l) => /^Fourniture/i.test(l.designation) && /climatisation|multisplit|liaisons? frigorifique|unité (intérieure|extérieure)|condensats/i.test(l.designation));
    expect(fournitures.length).toBeGreaterThan(3);
    for (const l of fournitures) expect(l.tva, l.designation).toBe(20);
  });
  it('aucun 5,5 % pour du carrelage ou une douche (pas de taux « handicap » pour les travaux)', () => {
    const carrelage = [...TRADE_LIBRARY.carrelage.lots.flatMap((l) => l.lignes), ...TRADE_LIBRARY.carrelage.prestations];
    for (const l of carrelage) expect(l.tva, l.designation).not.toBe(5.5);
  });
  it('les trois nouveaux métiers ne proposent jamais 5,5 %', () => {
    for (const k of ['ramonage', 'froid', 'multiservice']) {
      for (const l of [...TRADE_LIBRARY[k].lots.flatMap((x) => x.lignes), ...TRADE_LIBRARY[k].prestations]) expect([10, 20], l.designation).toContain(l.tva);
    }
  });
  it('étagère, tringle à rideaux : éléments mobiliers au taux normal (BOI-TVA-LIQ-30-20-90-20 § 370)', () => {
    const tout = Object.values(TRADE_LIBRARY).flatMap((m) => [...(m.lots || []).flatMap((x) => x.lignes), ...(m.prestations || [])]);
    const mobiliers = tout.filter((l) => /tringle|étagère/i.test(l.designation));
    expect(mobiliers.length).toBeGreaterThan(0);
    for (const l of mobiliers) expect(l.tva, l.designation).toBe(20);
  });
});

describe('éditeur : bloc « Votre métier »', () => {
  it('Électricien + Plombier : un lot de chaque métier à tour de rôle (contre-essai : Électricien a assez de lots pour tout prendre)', () => {
    const cles = bibliothequeDes(['electricien', 'plombier']);
    expect(TRADE_LIBRARY[cles[0]].lots.length).toBeGreaterThanOrEqual(4);
    const lots = lotsAlternes(cles, TRADE_LIBRARY, 4);
    expect(lots).toHaveLength(4);
    expect(lots.map((l) => l.cle)).toEqual([cles[0], cles[1], cles[0], cles[1]]);
  });
  it('un métier sans assez de lots laisse la place aux autres ; rien sans métier', () => {
    const bib = { a: { lots: [1] }, b: { lots: [2, 3, 4, 5] } };
    expect(lotsAlternes(['a', 'b'], bib, 4).map((l) => l.lot)).toEqual([1, 2, 3, 4]);
    expect(lotsAlternes([], bib, 4)).toEqual([]);
  });
});

// Décision d'Hugo du 5 nov. 2026 (D-41) : la question « Quels travaux faites-vous ? » est posée dans la fenêtre de
// bienvenue et dans Paramètres › Mon métier, jamais aux membres invités. Précision de la session locale (5 nov.) : la
// question de la BIENVENUE reste au propriétaire seul ; Paramètres › Mon métier reste ouvert à qui ouvre Paramètres et peut
// modifier la fiche de l'entreprise (propriétaire et administrateur), selon les droits existants : ce n'est pas poser la question.
describe('question du métier : le propriétaire seulement, jamais un membre invité (D-41)', () => {
  it('aucun rôle qu’on attribue par invitation ne reçoit la question, administrateur compris', () => {
    const invitables = getInvitableRoles().map((r) => r.value);
    expect(invitables).toEqual(expect.arrayContaining(['admin', 'comptable', 'chef_chantier', 'ouvrier', 'readonly']));
    for (const role of invitables) expect(peutChoisirSonMetier(role), role).toBe(false);
  });

  it('le propriétaire la reçoit ; un rôle inconnu ou pas encore lu, non', () => {
    expect(peutChoisirSonMetier('owner')).toBe(true);
    for (const role of [null, undefined, '', 'inconnu']) expect(peutChoisirSonMetier(role), String(role)).toBe(false);
    expect(getAllRoles().filter((r) => peutChoisirSonMetier(r.value)).map((r) => r.value)).toEqual(['owner']);
  });

  it('un membre invité qui ne modifie pas la fiche n’ouvre même pas Paramètres', () => {
    for (const role of ['comptable', 'chef_chantier', 'ouvrier', 'readonly']) expect(canAccessPage(role, 'settings'), role).toBe(false);
  });

  it('contre-essai : la règle « qui peut modifier la fiche » (accès complet à Paramètres) laisserait passer l’administrateur invité', () => {
    expect(hasFullAccess('admin', 'settings')).toBe(true);
    expect(peutChoisirSonMetier('admin')).toBe(false);
  });

  it('Paramètres › Mon métier : ouvert au propriétaire et à l’administrateur, selon les droits existants de Paramètres', () => {
    const quiOuvreParametres = getAllRoles().map((r) => r.value).filter((role) => canAccessPage(role, 'settings'));
    expect(quiOuvreParametres).toEqual(['owner', 'admin']);
    for (const role of quiOuvreParametres) expect(hasFullAccess(role, 'settings'), role).toBe(true);
  });
});

