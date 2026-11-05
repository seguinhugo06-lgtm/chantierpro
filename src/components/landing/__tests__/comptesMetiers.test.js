import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRADE_LIBRARY } from '../../../lib/templates/trade-library.js';
import { metierSansPrix } from '../../../lib/templates/prixBibliotheque.js';
import { NB_METIERS, NB_METIERS_AVEC_PRIX, METIERS_SANS_PRIX, PHRASE_PRIX } from '../comptesMetiers.js';
import { CARTES_FONCTIONNALITES, FEATURES_CONTENT, VUES_RESSOURCES } from '../featuresContent.js';
import { questionsFaq } from '../faq.js';

/**
 * Les comptes de métiers écrits sur le site viennent de la bibliothèque (avis du 5 nov. 2026, lot 4 : plus de « chiffré »
 * ni de « prix indicatifs » valables pour tous les métiers, trois n'ont aucun prix : D-41). La bibliothèque pèse 149 Ko :
 * le site n'importe que des constantes (`comptesMetiers.js`), et ce test les compare à la bibliothèque. Si un métier est
 * ajouté, retiré ou chiffré, il échoue et impose de corriger les textes.
 */
const DOSSIER_SITE = fileURLToPath(new URL('..', import.meta.url));
const lire = (nom) => fs.readFileSync(path.join(DOSSIER_SITE, nom), 'utf8');

const metiers = () => Object.values(TRADE_LIBRARY);
const sansPrix = () => metiers().filter(metierSansPrix);
const chaines = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(chaines) : []);
const sansEspacesInsecables = (t) => t.replace(/[  ]/g, ' ');

describe('comptes de métiers du site : ceux de la bibliothèque', () => {
  it('le nombre de métiers et le nombre de métiers avec des prix sont ceux de la bibliothèque', () => {
    expect(NB_METIERS).toBe(metiers().length);
    expect(NB_METIERS_AVEC_PRIX).toBe(metiers().filter((m) => !metierSansPrix(m)).length);
    expect(NB_METIERS_AVEC_PRIX + sansPrix().length).toBe(NB_METIERS);
    expect([NB_METIERS, NB_METIERS_AVEC_PRIX]).toEqual([20, 17]);
  });

  it('les métiers sans prix nommés sont exactement ceux de la bibliothèque (nom court, dans son ordre)', () => {
    expect(METIERS_SANS_PRIX).toEqual(sansPrix().map((m) => m.nom.split(',')[0]));
    expect(METIERS_SANS_PRIX).toEqual(['Ramonage', 'Froid et climatisation', 'Multiservice']);
  });

  it('la phrase sur les prix dit les trois métiers et le compte, avec l’espace fine avant le point-virgule', () => {
    expect(PHRASE_PRIX).toBe('17 avec des prix indicatifs ; pour Ramonage, Froid et climatisation et Multiservice, vous saisissez vos prix');
  });

  it('contre-essai : un métier de plus sans prix ferait échouer la comparaison', () => {
    const avecUnDePlus = [...metiers(), { id: 'x', nom: 'Nouveau', lots: [{ lignes: [{ designation: 'a', quantite: 1, unite: 'u', tva: 10 }] }], prestations: [] }];
    expect(avecUnDePlus.filter(metierSansPrix).length).not.toBe(METIERS_SANS_PRIX.length);
    expect(avecUnDePlus.length).not.toBe(NB_METIERS);
  });
});

describe('textes du site : ni « chiffré » ni « prix indicatifs » pour tous les métiers', () => {
  const textes = () => [
    ...chaines({ FEATURES_CONTENT, CARTES_FONCTIONNALITES, VUES_RESSOURCES }),
    ...questionsFaq().flatMap((q) => [q.q, q.a]),
  ].map(sansEspacesInsecables);

  it('aucun texte ne dit « lots types (déjà) chiffrés » ni « les lots types de 20 métiers, avec des prix indicatifs »', () => {
    const fautifs = textes().filter((t) => /lots types (déjà )?chiffrés/i.test(t) || /lots types de \d+ métiers,? (déjà chiffrés|avec des prix indicatifs)/i.test(t));
    expect(fautifs).toEqual([]);
  });

  it('chaque texte qui parle des prix des lots types des métiers dit le compte et les trois métiers sans prix', () => {
    const phrase = sansEspacesInsecables(PHRASE_PRIX);
    const parlant = textes().filter((t) => /lots types/i.test(t) && /prix indicatifs/i.test(t));
    expect(parlant.length).toBeGreaterThanOrEqual(5);
    for (const t of parlant) {
      const ditLeCompte = t.includes(phrase) || t.includes(`${NB_METIERS} métiers (${NB_METIERS_AVEC_PRIX} avec des prix indicatifs)`);
      expect(ditLeCompte, t).toBe(true);
    }
  });

  it('le titre et le chapeau de l’explorateur, et la case « métiers » de la bande de faits, lisent les mêmes comptes', () => {
    const explorateur = lire('MetiersSection.jsx');
    expect(explorateur).toContain('titre="Votre métier a déjà ses lots types."');
    expect(explorateur).toContain('${NB_METIERS} métiers');
    expect(explorateur).toContain('${PHRASE_PRIX}');
    expect(explorateur).not.toMatch(/est déjà chiffré\.?"/);
    const faits = lire('FaitsSection.jsx');
    expect(faits).toContain("valeur: String(NB_METIERS), libelle: 'métiers du bâtiment'");
    expect(faits).not.toContain("valeur: '17'");
  });

  it('contre-essai : l’ancienne phrase (« lots types déjà chiffrés ») est reconnue comme fautive', () => {
    const ancien = 'Non. La bibliothèque des 20 métiers propose des lots types déjà chiffrés, à insérer en un geste dans un devis.';
    expect(/lots types (déjà )?chiffrés/i.test(sansEspacesInsecables(ancien))).toBe(true);
  });
});
