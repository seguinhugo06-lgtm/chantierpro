import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rappelsAEnvoyerEntretien, emailRappelEntretien, phraseObligationServeur, obligationConnueServeur, fichesQuiEnvoient, ficheValable, fichesSansEmail, dansPortee,
} from '../../../supabase/functions/send-scheduled-relances/entretien.ts';
import { phraseObligation, obligationConnue } from '../entretien';

// Les formules du rappel viennent de l'avis du juriste (§ 4.5) : le test les y lit, caractères compris
const AVIS = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/metiers/avis-juriste-2026-11-04-entretien.md'), 'utf8');
const formuleDeLAvis = (debut) => {
  const m = AVIS.match(new RegExp(`^\\*\\*${debut}[^\\n]*?\\*\\* : \`([^\`]+)\``, 'm'));
  if (!m) throw new Error(`Formule « ${debut} » introuvable dans l'avis du juriste`);
  return m[1];
};

// Données fictives seulement
const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', email: 'lucie@exemple.fr' };
const entreprise = { nom: 'Chauffage Exemple EI', adresse: '1 rue Fictive, 24000 Imaginaire', telephone: '05 00 00 00 00', email: 'contact@exemple.fr' };
const e = (o = {}) => ({
  id: 'e1', client_id: 'c1', appareil_ref: 'a1', categorie: 'chaudiere', realise_le: '2026-11-04T09:00:00Z', prochain_avant: '2027-11-04',
  puissance_kw: 24, appareils: [{ marque: 'Exemplair', modele: 'Naneo' }], local: 'Cuisine', jeton_rappel: 'j1', ...o,
});

describe('rappels d’entretien côté serveur', () => {
  it('envoie dans la fenêtre « date conseillée − délai » → date conseillée, jamais après (pas d’e-mail en retard)', () => {
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-10-04' })).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-10-05' })).toHaveLength(1);
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-11-04' })).toHaveLength(1);
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-11-05' })).toHaveLength(0);
  });
  it('jamais à un client qui a refusé, sans e-mail valide, ni pour un rappel déjà fait ou une attestation annulée', () => {
    const jour = { aujourdhui: '2027-10-20' };
    expect(rappelsAEnvoyerEntretien([e()], [{ ...client, rappels_refuses_le: '2027-01-01' }], jour)).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e()], [{ ...client, email: 'pas-une-adresse' }], jour)).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e({ rappel_fait_le: '2027-10-10' })], [client], jour)).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e({ annulee_le: '2026-11-05' })], [client], jour)).toHaveLength(0);
  });
  it('même règle d’obligation et même phrase que l’app', () => {
    const cas = [e(), e({ puissance_kw: null }), e({ puissance_kw: 500 }), e({ categorie: 'pac', puissance_kw: 8 }),
      e({ categorie: 'pac', puissance_kw: 8, contrat_performance: true }), e({ categorie: 'pac', puissance_kw: 3 }), e({ categorie: 'poele', puissance_kw: null }),
      e({ categorie: 'poele', appareils: [{ energie: 'autre_biomasse' }] }), e({ categorie: 'poele', appareils: [{ energie: 'granules', hydraulique: true }] }),
      e({ categorie: 'poele', appareils: [{ energie: 'granules' }] }), e({ categorie: 'pac', puissance_kw: 8, realise_le: '2026-03-01T09:00:00Z' }),
      e({ categorie: 'pac', puissance_kw: '70', realise_le: '2028-02-29T09:00:00Z' }), e({ categorie: 'pac', puissance_kw: 4, realise_le: '2026-12-31T09:00:00Z' })];
    for (const x of cas) {
      const app = { ...x, puissance_kw: x.puissance_kw ?? '' };
      expect(obligationConnueServeur(x)).toBe(obligationConnue(app));
      expect(phraseObligationServeur(x)).toBe(phraseObligation(app));
    }
  });
  it('l’e-mail : objet avec l’entreprise et sans « obligatoire », obligation dans le corps avec son article, désinscription', () => {
    const { objet, texte, html } = emailRappelEntretien({ entreprise, client, entretien: e(), lien: 'https://mallettico.fr/rappel-entretien/j1' });
    expect(objet).toBe('Entretien de votre chaudière à prévoir avant le 04/11/2027 — Chauffage Exemple EI');
    expect(objet).not.toMatch(/obligatoire|R\. 224/i);
    expect(texte).toContain('au plus tard le 31 décembre 2027');
    expect(texte).toContain('Vous restez libre de confier cet entretien');
    expect(texte).toContain('https://mallettico.fr/rappel-entretien/j1');
    expect(texte).toContain('répondez STOP');
    expect(texte).toContain('a entretenu votre chaudière le 04/11/2026');
    expect(html).not.toMatch(/obligatoire/i);
    // Contre-essai : puissance inconnue, ni article ni phrase de libre choix
    const sans = emailRappelEntretien({ entreprise, client, entretien: e({ puissance_kw: null }), lien: 'x' }).texte;
    expect(sans).not.toContain('R. 224-41-7');
    expect(sans).not.toContain('Vous restez libre');
  });
  it('D-38 : la PAC de 4 à 70 kW connue reçoit la formule de l’avis (visite + 2 ans) et la phrase de libre choix', () => {
    const attendue = formuleDeLAvis('PAC / climatisation').replace('{date de la visite + 2 ans}', '4 novembre 2028');
    const x = e({ categorie: 'pac', puissance_kw: 8, appareils: [{ marque: 'Exemplair', modele: 'Aéro', type: 'air_eau' }] });
    expect(phraseObligationServeur(x)).toBe(attendue);
    const { objet, texte, html } = emailRappelEntretien({ entreprise, client, entretien: x, lien: 'https://mallettico.fr/rappel-entretien/j1' });
    expect(texte).toContain(attendue);
    expect(texte).toContain('Vous restez libre de confier cet entretien');
    expect(html).toContain('R. 224-44-3');
    expect(html).toContain('Vous restez libre de confier cet entretien');
    // Jamais dans l'objet, jamais « obligatoire », jamais la date conseillée présentée comme une échéance légale
    expect(objet).not.toMatch(/obligatoire|R\. 224/i);
    expect(texte).not.toMatch(/obligatoire/i);
    expect(html).not.toMatch(/obligatoire/i);
    expect(texte).toContain('est à prévoir avant le 04/11/2027');
    expect(texte).not.toContain('au plus tard le 4 novembre 2027');
  });
  it('D-38 : le poêle ou l’insert reçoit la formule de l’avis et la phrase de libre choix', () => {
    const x = e({ categorie: 'poele', puissance_kw: null, appareils: [{ energie: 'granules', type: 'poele' }] });
    const attendue = formuleDeLAvis('Poêle, insert');
    expect(phraseObligationServeur(x)).toBe(attendue);
    const { objet, texte, html } = emailRappelEntretien({ entreprise, client, entretien: x, lien: 'x' });
    expect(texte).toContain(attendue);
    expect(texte).toContain('Vous restez libre de confier cet entretien');
    expect(html).toContain('R. 1331-68');
    expect(objet).not.toMatch(/obligatoire|R\. 1331/i);
    expect(html).not.toMatch(/obligatoire/i);
  });
  it('D-38, contre-essai : PAC de puissance inconnue ou de 3 kW, système sous contrat de performance, poêle « autre biomasse » ou hydraulique : ni article ni libre choix', () => {
    const sans = [
      e({ categorie: 'pac', puissance_kw: null }), e({ categorie: 'pac', puissance_kw: 3 }), e({ categorie: 'pac', puissance_kw: 80 }),
      e({ categorie: 'pac', puissance_kw: 8, contrat_performance: true }),
      e({ categorie: 'poele', appareils: [{ energie: 'autre_biomasse' }] }), e({ categorie: 'poele', appareils: [{ energie: 'granules', hydraulique: true }] }),
    ];
    for (const x of sans) {
      expect(phraseObligationServeur(x)).toBe('');
      const { texte, html } = emailRappelEntretien({ entreprise, client, entretien: x, lien: 'x' });
      expect(texte).not.toMatch(/R\. 224-44-3|R\. 1331-68|Pour rappel/);
      expect(texte).not.toContain('Vous restez libre');
      expect(html).not.toMatch(/R\. 224-44-3|R\. 1331-68|Pour rappel/);
    }
  });
  it('la visite est lue à l’heure de Paris : une visite à 23 h 30 le 31 décembre (UTC) tombe le 1er janvier à Paris', () => {
    const x = e({ categorie: 'pac', puissance_kw: 8, realise_le: '2026-12-31T23:30:00Z' });
    expect(phraseObligationServeur(x)).toContain('au plus tard le 1er janvier 2029');
  });
  it('échappe le texte saisi dans le HTML', () => {
    const { html } = emailRappelEntretien({ entreprise, client: { ...client, prenom: '<b>x</b>' }, entretien: e({ local: '<img>' }), lien: 'x' });
    expect(html).not.toContain('<img>');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('fiche entreprise qui envoie les rappels (gardien-securite, 4 nov. 2026, M1)', () => {
  it('dans une organisation, seule la fiche du propriétaire ; sans organisation, celle de l’auteur', () => {
    const fiches = [
      { id: 'f-ouvrier', user_id: 'ouvrier', organization_id: 'org1', created_at: '2026-01-01' },
      { id: 'f-patron', user_id: 'patron', organization_id: 'org1', created_at: '2026-02-01' },
      { id: 'f-seul', user_id: 'seul', organization_id: null, created_at: '2026-01-01' },
      { id: 'f-archivee', user_id: 'patron2', organization_id: 'org2', archived_at: '2026-03-01' },
    ];
    const proprietaires = new Map([['org1', 'patron'], ['org2', 'patron2']]);
    expect(fichesQuiEnvoient(fiches, proprietaires).map((f) => f.id).sort()).toEqual(['f-patron', 'f-seul']);
    // Contre-essai : sans propriétaire connu, aucune fiche de l'organisation n'envoie
    expect(fichesQuiEnvoient(fiches, new Map()).map((f) => f.id)).toEqual(['f-seul']);
  });
  it('une fiche du propriétaire inutilisable (archivée, module éteint, sans e-mail) ne bloque pas sa fiche valable', () => {
    const actif = { reglages: { ramonageActif: true } };
    const fiches = [
      { id: 'f-sans-email', user_id: 'patron', organization_id: 'org1', created_at: '2026-01-01', email: '', settings_json: actif },
      { id: 'f-eteinte', user_id: 'patron', organization_id: 'org1', created_at: '2026-01-02', email: 'a@exemple.fr', settings_json: { reglages: {} } },
      { id: 'f-valable', user_id: 'patron', organization_id: 'org1', created_at: '2026-02-01', email: 'b@exemple.fr', settings_json: actif },
    ];
    const proprietaires = new Map([['org1', 'patron']]);
    const retenues = fichesQuiEnvoient(fiches, proprietaires, ficheValable('ramonageActif'));
    expect(retenues.map((f) => f.id)).toEqual(['f-valable']);
    expect(fichesSansEmail(fiches, proprietaires, 'ramonageActif', retenues)).toEqual([]);
    // Contre-essai : sans le filtre, la première fiche (sans e-mail) était retenue seule et la fiche valable perdue
    expect(fichesQuiEnvoient(fiches, proprietaires).map((f) => f.id)).toEqual(['f-sans-email']);
    // Seule fiche du propriétaire sans e-mail : rien n'envoie, et le rapport le dit
    const seule = [fiches[0]];
    expect(fichesQuiEnvoient(seule, proprietaires, ficheValable('ramonageActif'))).toEqual([]);
    expect(fichesSansEmail(seule, proprietaires, 'ramonageActif', []).map((f) => f.id)).toEqual(['f-sans-email']);
  });
  it('fiche sans organisation : seulement les lignes de son auteur hors de toute organisation (reste de M1)', () => {
    const espion = () => {
      const appels = [];
      const r = { eq: (c, v) => { appels.push(['eq', c, v]); return r; }, is: (c, v) => { appels.push(['is', c, v]); return r; }, appels };
      return r;
    };
    const perso = espion();
    dansPortee(perso, { user_id: 'membre', organization_id: null });
    expect(perso.appels).toEqual([['eq', 'user_id', 'membre'], ['is', 'organization_id', null]]);
    const org = espion();
    dansPortee(org, { user_id: 'patron', organization_id: 'org1' });
    // Contre-essai : une fiche d'organisation lit toute l'organisation, sans filtre sur l'auteur
    expect(org.appels).toEqual([['eq', 'organization_id', 'org1']]);
  });
  it('« climatisation » dans l’objet pour un appareil en froid seul', () => {
    const { objet } = emailRappelEntretien({ entreprise, client, entretien: e({ categorie: 'pac', appareils: [{ type: 'clim' }] }), lien: 'x' });
    expect(objet.startsWith('Entretien de votre climatisation')).toBe(true);
  });
});
