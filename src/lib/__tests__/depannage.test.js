import { describe, it, expect } from 'vitest';
import {
  normaliserGrille, ttcDe, dureeDecomptee, lignesDevisExpress, estDevisDepannage, mentionsDepannage, marquerLignesDepannage,
  mentionsDepannageHtml, grilleImprimableHtml, grilleIncomplete, choixConserverPieces, MENTION_DEVIS_GRATUIT, QUESTION_PIECES, OBLIGATIONS, AVERTISSEMENT_URGENCE,
  GRILLE_DEFAUT,
} from '../depannage';
import { calculerTotaux } from '../totauxDocument';
import { delaiSeptJours, echeanceApresSeptJours } from '../retractation';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GRILLE = {
  tauxHoraire: 60, decompte: 'quart', deplacement: 39, deplacementZone: 'Bordeaux et 20 km',
  majorationNuit: 50, horairesNuit: 'de 20 h à 8 h', majorationDimanche: 100,
  forfaits: [{ libelle: 'Ouverture de porte claquée', prix: 89 }],
};
const PARTICULIER = { nom: 'Durand', categorie: 'particulier' };
const PRO = { nom: 'SCI', entreprise: 'SCI Les Pins', categorie: 'professionnel' };

describe('grille tarifaire', () => {
  it('retire les valeurs illisibles, nulles ou négatives', () => {
    const g = normaliserGrille({ tauxHoraire: '55,5', deplacement: '-3', majorationNuit: 'abc', forfaits: [{ libelle: 'x', prix: 0 }, { libelle: 'Cylindre', prix: '45' }] });
    expect(g.tauxHoraire).toBe(55.5);
    expect(g.deplacement).toBeNull();
    expect(g.majorationNuit).toBeNull();
    expect(g.forfaits).toEqual([{ libelle: 'Cylindre', prix: 45 }]);
    expect(g.decompte).toBe('quart');
  });
  it('sans taux horaire, la grille est incomplète ; avec, elle ne l’est plus', () => {
    expect(grilleIncomplete({})).not.toBe('');
    expect(grilleIncomplete({ tauxHoraire: 50 })).toBe('');
  });
});

describe('prix TTC affiché d’un prix HT de la grille', () => {
  it.each([[60, 10, 66], [54.55, 10, 60.01], [35, 20, 42], [60, 0, 60]])('%s € HT à %s %% → %s € TTC, comme sur un devis d’une ligne', (ht, taux, attendu) => {
    expect(ttcDe(ht, taux)).toBe(attendu);
    expect(calculerTotaux([{ description: 'x', quantite: 1, prixUnitaire: ht, tva: taux }], { tauxDefaut: taux }).totalTTC).toBe(attendu);
  });
});

describe('décompte du temps', () => {
  it('arrondit vers le haut au pas de la grille (« entamé »)', () => {
    expect(dureeDecomptee(1.1, GRILLE)).toBe(1.25);
    expect(dureeDecomptee(1, GRILLE)).toBe(1);
    expect(dureeDecomptee(0.2, { ...GRILLE, decompte: 'heure' })).toBe(1);
    expect(dureeDecomptee(0.6, { ...GRILLE, decompte: 'demi' })).toBe(1);
    expect(dureeDecomptee('', GRILLE)).toBe(0);
  });
});

describe('lignes du devis express', () => {
  it('déplacement, main-d’œuvre, majoration de nuit, forfait et pièces, en deux lots', () => {
    const r = lignesDevisExpress({ grille: GRILLE, heures: 1, majoration: 'nuit', forfaits: [0], pieces: [{ libelle: 'Cylindre A2P', quantite: 1, prix: 75 }], tva: 10 });
    expect(r.erreur).toBe('');
    expect(r.sections.map((s) => s.titre)).toEqual(['Intervention', 'Pièces remplacées']);
    expect(r.lignes.map((l) => l.depannage)).toEqual(['deplacement', 'main_oeuvre', 'majoration', 'forfait', 'piece']);
    expect(r.lignes.map((l) => l.prixUnitaire)).toEqual([39, 60, 30, 89, 75]);
    // Aucun montant dans les libellés : le prix unitaire est sur la ligne (relecture du 4 nov. 2026)
    expect(r.lignes[1].description).toBe('Main-d’œuvre, au taux horaire');
    expect(r.lignes[0].description).toBe('Frais de déplacement');
    expect(r.lignes.some((l) => /€|TTC/.test(l.description))).toBe(false);
    expect(r.lignes[2].description).toContain('+ 50 % du taux horaire');
    // Le total HT est la somme des prix de la grille, au centime
    expect(calculerTotaux(r.lignes, { tauxDefaut: 10 }).totalHT).toBe(39 + 60 + 30 + 89 + 75);
  });
  it('au taux de 20 % : même libellé qu’à 10 %, seul le taux de la ligne change (changer la TVA ensuite ne fausse rien)', () => {
    const a = lignesDevisExpress({ grille: GRILLE, heures: 1, tva: 10 });
    const b = lignesDevisExpress({ grille: GRILLE, heures: 1, tva: 20 });
    expect(b.lignes.map((l) => l.description)).toEqual(a.lignes.map((l) => l.description));
    expect(b.lignes[1].tva).toBe(20);
  });
  it('en franchise : sans TVA ni suffixe TTC', () => {
    const r = lignesDevisExpress({ grille: GRILLE, heures: 1.5, pieces: [{ libelle: 'Joint', quantite: 2, prix: 3.5 }], franchise: true });
    expect(calculerTotaux(r.lignes, { franchise: true }).totalTTC).toBe(39 + 90 + 7);
    expect(r.lignes[1].description).toBe('Main-d’œuvre, au taux horaire');
    expect(r.lignes.every((l) => l.tva === 0)).toBe(true);
  });
  it('la réponse du client sur les pièces est posée sur les lignes « pièce » seulement', () => {
    const r = lignesDevisExpress({ grille: GRILLE, heures: 1, pieces: [{ libelle: 'Cylindre', quantite: 1, prix: 40 }], conserverPieces: true });
    expect(r.lignes.find((l) => l.depannage === 'piece').conservee).toBe(true);
    expect(r.lignes.find((l) => l.depannage === 'main_oeuvre').conservee).toBeUndefined();
    expect(choixConserverPieces({ lignes: r.lignes })).toBe(true);
    expect(choixConserverPieces({ lignes: lignesDevisExpress({ grille: GRILLE, pieces: [{ libelle: 'C', quantite: 1, prix: 4 }] }).lignes })).toBeNull();
  });
  it('déplacement décoché : pas de ligne de déplacement (contre-essai du premier cas)', () => {
    const r = lignesDevisExpress({ grille: GRILLE, avecDeplacement: false, heures: 1 });
    expect(r.lignes.map((l) => l.depannage)).toEqual(['main_oeuvre']);
  });
  it('une majoration absente de la grille est refusée', () => {
    const r = lignesDevisExpress({ grille: { ...GRILLE, majorationDimanche: null }, heures: 1, majoration: 'dimanche' });
    expect(r.erreur).toMatch(/pas dans votre grille/);
    expect(r.lignes).toEqual([]);
  });
  it('pièce sans prix ou sans nom : erreur dite, rien de créé', () => {
    expect(lignesDevisExpress({ grille: GRILLE, pieces: [{ libelle: 'Cylindre', quantite: 1, prix: '' }] }).erreur).toMatch(/prix de « Cylindre »/);
    expect(lignesDevisExpress({ grille: GRILLE, pieces: [{ libelle: '', quantite: 1, prix: 10 }] }).erreur).toMatch(/nom/);
  });
  it('aucune ligne : erreur', () => {
    expect(lignesDevisExpress({ grille: GRILLE, avecDeplacement: false }).erreur).toMatch(/au moins une ligne/);
  });
  it('l’urgence n’entre pas dans le calcul : aucun paramètre ne la reçoit', () => {
    const a = lignesDevisExpress({ grille: GRILLE, heures: 1 });
    const b = lignesDevisExpress({ grille: GRILLE, heures: 1, urgence: true });
    expect(b.lignes).toEqual(a.lignes);
  });
});

describe('mentions du devis de dépannage (arrêté du 24 janv. 2017, art. 2 et 4 III)', () => {
  const express = { type: 'devis', lignes: lignesDevisExpress({ grille: GRILLE, heures: 1 }).lignes };
  it('devis express d’un particulier : « Devis gratuit » et la question sur les pièces, cases vides', () => {
    const html = mentionsDepannageHtml({ doc: express, client: PARTICULIER });
    expect(html).toContain(MENTION_DEVIS_GRATUIT);
    expect(html).toContain(QUESTION_PIECES);
    expect(html).not.toContain('✕');
  });
  it('réponse « Oui » enregistrée : la case OUI est cochée, selon le modèle de l’annexe 2', () => {
    const doc = { type: 'devis', lignes: lignesDevisExpress({ grille: GRILLE, pieces: [{ libelle: 'C', quantite: 1, prix: 4 }], conserverPieces: true }).lignes };
    const html = mentionsDepannageHtml({ doc, client: PARTICULIER });
    expect(html).toMatch(/OUI<span[^>]*>✕<\/span> NON<span[^>]*><\/span>/);
  });
  it('modèle de l’annexe 2 : « OUI □ NON □ » après la question, puis la ligne « Lu et approuvé »', () => {
    const html = mentionsDepannageHtml({ doc: express, client: PARTICULIER });
    expect(html.indexOf(QUESTION_PIECES)).toBeLessThan(html.indexOf('OUI<span'));
    expect(html.indexOf('OUI<span')).toBeLessThan(html.indexOf(' NON<span'));
    expect(html).toContain('Signature du consommateur précédée de la mention manuscrite « Lu et approuvé » :');
  });
  it('lignes relues de la base (JSON) : reconnues aussi', () => {
    expect(estDevisDepannage({ type: 'devis', lignes: JSON.stringify(express.lignes) })).toBe(true);
  });
  it('devis porté « urgence demandée » : reconnu', () => {
    expect(estDevisDepannage({ type: 'devis', travaux_urgents: true, lignes: [] })).toBe(true);
  });
  it('case « dépannage » de l’éditeur : marque et démarque les lignes, garde les catégories du devis express', () => {
    const lignes = [{ description: 'Recherche de fuite', quantite: 1, prixUnitaire: 80 }, { _isSection: true, description: 'Lot' }];
    const marquees = marquerLignesDepannage(lignes, true);
    expect(estDevisDepannage({ type: 'devis', lignes: marquees })).toBe(true);
    expect(marquees[1]).toEqual(lignes[1]);
    expect(estDevisDepannage({ type: 'devis', lignes: marquerLignesDepannage(marquees, false) })).toBe(false);
    expect(marquerLignesDepannage(express.lignes, true).map((l) => l.depannage)).toEqual(express.lignes.map((l) => l.depannage));
  });
  it('contre-essais : devis ordinaire, client professionnel, facture', () => {
    expect(mentionsDepannage({ doc: { type: 'devis', lignes: [{ description: 'Peinture' }] }, client: PARTICULIER })).toBeNull();
    expect(mentionsDepannage({ doc: express, client: PRO })).toBeNull();
    expect(mentionsDepannageHtml({ doc: { ...express, type: 'facture' }, client: PARTICULIER })).toBe('');
  });
});

describe('page imprimable de la grille', () => {
  const ent = { nom: 'Serrures Dupont', formeJuridique: 'Micro-entreprise', nomEntrepreneur: 'Jean Dupont', adresse: '1 rue A', codePostal: '33000', ville: 'Bordeaux', tel: '0600000000', siret: '12345678900011' };
  it('taux horaire TTC, décompte du temps, déplacement, majorations et forfaits (art. 3)', () => {
    const html = grilleImprimableHtml({ entreprise: ent, grille: GRILLE });
    for (const attendu of ['TVA 10 %', 'TVA 20 %', '66,00\u00a0€ / h', '72,00\u00a0€ / h', 'Par quart d’heure entamé', 'Frais de déplacement', '42,90\u00a0€', '46,80\u00a0€', 'Bordeaux et 20 km', '+ 50 %', 'de 20 h à 8 h', '+ 100 %', 'Ouverture de porte claquée', 'logement achevé depuis plus de deux ans', 'Devis gratuit.', 'SIRET 12345678900011', 'EI']) {
      expect(html).toContain(attendu);
    }
  });
  it('en franchise : mention 293 B, pas de « TTC »', () => {
    const html = grilleImprimableHtml({ entreprise: ent, grille: GRILLE, franchise: true });
    expect(html).toContain('TVA non applicable, article 293 B du CGI');
    expect(html).not.toContain('TTC');
    expect(html).toContain('60,00\u00a0€ / h');
  });
  it('échappe les saisies (contre-essai d’injection)', () => {
    const html = grilleImprimableHtml({ entreprise: { nom: '<img src=x onerror=alert(1)>' }, grille: { tauxHoraire: 50, forfaits: [{ libelle: '<script>x</script>', prix: 10 }] } });
    expect(html).not.toContain('<script>x');
    expect(html).not.toContain('<img src=x');
  });
});

describe('facture immédiate d’un devis signé sur place (règles existantes, appliquées au devis express)', () => {
  const signe = (urgent) => ({ type: 'devis', signature: 'data:image/png;base64,x', signature_date: '2026-11-04T10:00:00Z', travaux_urgents: urgent, lignes: [] });
  const maintenant = new Date('2026-11-04T11:00:00Z');
  it('urgence demandée : paiement possible sur place (L221-10, 4°)', () => {
    expect(delaiSeptJours({ devis: signe(true), client: PARTICULIER, maintenant })).toBeNull();
  });
  it('contre-essai sans urgence : pas de paiement avant le 8e jour (ici reporté : le 7e jour est le 11 novembre)', () => {
    const d = delaiSeptJours({ devis: signe(false), client: PARTICULIER, maintenant });
    expect(d.possibleLe).toBe('2026-11-13');
    expect(echeanceApresSeptJours(d, '2026-11-04', 'Paiement à réception de facture').conditions).toMatch(/au plus tôt le 13\/11\/2026/);
  });
});

describe('obligations affichées : recopiées mot pour mot de docs/metier-btp.md', () => {
  // Le gras du Markdown (**…**) n'est pas du texte
  const doc = readFileSync(fileURLToPath(new URL('../../../docs/metier-btp.md', import.meta.url)), 'utf8').replace(/\*\*/g, '');
  it.each(OBLIGATIONS.map((o) => [o.texte]))('%s', (texte) => {
    expect(doc).toContain(texte);
  });
  it('les sources affichées ne nomment aucun fichier du dépôt', () => {
    for (const o of OBLIGATIONS) expect(o.source).not.toMatch(/docs\/|\.md|§/);
  });
});

describe('avertissement d’urgence : rédaction au texte (L221-10, 4° ; L221-28, 8°)', () => {
  it('« pour répondre à l’urgence », pièces de rechange, sept jours limités au contrat signé chez le client', () => {
    expect(AVERTISSEMENT_URGENCE).toContain('pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence');
    expect(AVERTISSEMENT_URGENCE).not.toContain('faire cesser');
    expect(AVERTISSEMENT_URGENCE).toContain('signé chez le client, il ne permet de recevoir aucun paiement avant l’expiration d’un délai de sept jours');
  });
  it('mot pour mot l’avis versé (docs/metiers/avis-juriste-2026-11-04-depannage.md), comme la phrase « Affichez la grille… »', () => {
    const lire = (f) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
    const avis = lire('../../../docs/metiers/avis-juriste-2026-11-04-depannage.md');
    expect(avis).toContain(AVERTISSEMENT_URGENCE);
    const phrase = 'Affichez la grille dans vos locaux, remettez-la au client avant le devis quand vous intervenez chez lui (arrêté du 24 janvier 2017, art. 3), et mettez-la sur votre site.';
    expect(avis).toContain(phrase);
    expect(lire('../../components/settings/DepannageTab.jsx')).toContain(phrase);
  });
});

describe('les générateurs de PDF impriment les mentions du dépannage', async () => {
  const { buildDevisHtml } = await import('../devisHtmlBuilder');
  const { buildDocumentHTML } = await import('../pdfHtmlBuilder');
  const entreprise = { nom: 'Plomberie Exemple', formeJuridique: 'EI', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
  const { lignes, sections } = lignesDevisExpress({ grille: GRILLE, heures: 1, pieces: [{ libelle: 'Siphon PVC', quantite: 1, prix: 12 }], conserverPieces: false });
  const doc = { type: 'devis', numero: 'DEV-2026-00001', date: '2026-11-04', statut: 'brouillon', lignes, sections, total_ht: 111, tva: 11.1, total_ttc: 122.1 };
  it.each([
    ['devisHtmlBuilder (page de signature, envoi)', () => buildDevisHtml({ doc, client: PARTICULIER, entreprise, couleur: '#12336F' })],
    ['pdfHtmlBuilder (envois rapides)', () => buildDocumentHTML(doc, PARTICULIER, null, entreprise)],
  ])('%s', (_nom, produire) => {
    const html = produire();
    expect(html).toContain(MENTION_DEVIS_GRATUIT);
    expect(html).toContain(QUESTION_PIECES);
    expect(html).toMatch(/NON<span[^>]*>✕<\/span>/);
    expect(html).toContain('Siphon PVC');
  });
  it('contre-essai : devis ordinaire, aucun générateur ne les imprime', () => {
    const ordinaire = { ...doc, lignes: [{ description: 'Peinture', quantite: 1, prixUnitaire: 100 }], sections: [] };
    expect(buildDevisHtml({ doc: ordinaire, client: PARTICULIER, entreprise, couleur: '#12336F' })).not.toContain(QUESTION_PIECES);
    expect(buildDocumentHTML(ordinaire, PARTICULIER, null, entreprise)).not.toContain(QUESTION_PIECES);
  });
});

/**
 * « Devis gratuit » seulement sur un dépannage (décision d'Hugo du 5 nov. 2026, D-40) : jamais de devis payant, et la
 * mention ne s'imprime pas sur un devis ordinaire. Un dépannage = le devis express, la case « urgence demandée », ou la
 * case facultative « Dépannage, réparation ou entretien » de l'éditeur.
 */
describe('« Devis gratuit » seulement sur un dépannage, dans les trois générateurs', async () => {
  const { buildDevisHtml } = await import('../devisHtmlBuilder');
  const { buildDocumentHTML } = await import('../pdfHtmlBuilder');
  const entreprise = { nom: 'Plomberie Exemple', formeJuridique: 'EI', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
  const base = { type: 'devis', numero: 'DEV-2026-00001', date: '2026-11-05', statut: 'brouillon', total_ht: 100, tva: 10, total_ttc: 110 };
  const ligneOrdinaire = { description: 'Remplacement d’un robinet', quantite: 1, prixUnitaire: 100, tva: 10 };
  const express = lignesDevisExpress({ grille: GRILLE, heures: 1 });
  const dossiers = {
    'devis express': { ...base, lignes: express.lignes, sections: express.sections },
    'case « urgence demandée »': { ...base, lignes: [ligneOrdinaire], travaux_urgents: true },
    'case « Dépannage, réparation ou entretien » de l’éditeur': { ...base, lignes: marquerLignesDepannage([ligneOrdinaire], true) },
  };
  const generateurs = [
    ['devisHtmlBuilder', (doc, client) => buildDevisHtml({ doc, client, entreprise, couleur: '#12336F' })],
    ['pdfHtmlBuilder', (doc, client) => buildDocumentHTML(doc, client, null, entreprise)],
  ];
  const cas = Object.entries(dossiers).flatMap(([nomDossier, doc]) => generateurs.map(([nomGenerateur, produire]) => [nomDossier, nomGenerateur, doc, produire]));
  it.each(cas)('%s, %s : un particulier lit « Devis gratuit »', (_d, _g, doc, produire) => {
    const html = produire(doc, PARTICULIER);
    expect(html).toContain(MENTION_DEVIS_GRATUIT);
    expect(html).toContain('depannage-mentions');
  });
  it.each(generateurs)('contre-essai, %s : un devis ordinaire de particulier n’imprime rien de tout cela', (_g, produire) => {
    const html = produire({ ...base, lignes: [ligneOrdinaire] }, PARTICULIER);
    // C'est bien un devis de particulier (le formulaire de rétractation y est), et il n'a rien du dépannage
    expect(html).toContain('MODÈLE DE FORMULAIRE DE RÉTRACTATION');
    expect(html).not.toContain(MENTION_DEVIS_GRATUIT);
    expect(html).not.toContain('depannage-mentions');
    expect(html).not.toContain(QUESTION_PIECES);
  });
  it.each(generateurs)('contre-essai, %s : un dépannage pour un client professionnel n’imprime rien non plus', (_g, produire) => {
    const html = produire(dossiers['devis express'], PRO);
    expect(html).not.toContain(MENTION_DEVIS_GRATUIT);
  });
  it('le générateur de la fiche (DevisPage.jsx) appelle le même bloc, avec le devis et le client', () => {
    // Pas de rendu possible hors navigateur : le parcours « dépannage » lit son aperçu, avec et sans dépannage
    for (const fichier of ['../../components/DevisPage.jsx', '../devisHtmlBuilder.js', '../pdfHtmlBuilder.js']) {
      const source = readFileSync(fileURLToPath(new URL(fichier, import.meta.url)), 'utf8');
      expect(source, fichier).toContain('${mentionsDepannageHtml({ doc, client })}');
    }
  });
  it('aucun devis payant : le seul texte de prix du devis est « Devis gratuit. »', () => {
    expect(MENTION_DEVIS_GRATUIT).toBe('Devis gratuit.');
    const source = readFileSync(fileURLToPath(new URL('../depannage.js', import.meta.url)), 'utf8');
    expect(source).not.toMatch(/MENTION_DEVIS_PAYANT|coutDevis|devisPayant|frais d.établissement du devis/i);
  });
});

/**
 * Pas de majoration d'urgence (décision d'Hugo du 5 nov. 2026, D-40) : la grille ne propose que la nuit, le dimanche et les
 * jours fériés. La case « urgence demandée par le client » sert au droit (L221-10, 4° ; L221-28, 8°), jamais au tarif.
 */
describe('aucune majoration d’urgence : seulement la nuit, le dimanche et les jours fériés', () => {
  it('la grille n’a que deux majorations', () => {
    const majorations = Object.keys(GRILLE_DEFAUT).filter((k) => /majoration/i.test(k));
    expect(majorations.sort()).toEqual(['majorationDimanche', 'majorationNuit']);
    expect(Object.keys(GRILLE_DEFAUT).some((k) => /urgen/i.test(k))).toBe(false);
  });
  it('une majoration d’urgence saisie dans les réglages est ignorée', () => {
    const g = normaliserGrille({ ...GRILLE, majorationUrgence: 100, urgence: 100 });
    expect(Object.keys(g).some((k) => /urgen/i.test(k))).toBe(false);
  });
  it('« urgence » n’est pas une majoration acceptée par le devis express', () => {
    const r = lignesDevisExpress({ grille: GRILLE, heures: 1, majoration: 'urgence' });
    expect(r.erreur).toMatch(/pas dans votre grille/);
    expect(r.lignes).toEqual([]);
  });
  it('la nuit et le dimanche, eux, sont acceptés (contre-essai du refus ci-dessus)', () => {
    expect(lignesDevisExpress({ grille: GRILLE, heures: 1, majoration: 'nuit' }).erreur).toBe('');
    expect(lignesDevisExpress({ grille: GRILLE, heures: 1, majoration: 'dimanche' }).erreur).toBe('');
  });
  it('les écrans ne proposent aucune majoration d’urgence et le disent à l’artisan', () => {
    const lire = (f) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
    const reglages = lire('../../components/settings/DepannageTab.jsx');
    const express = lire('../../components/depannage/DevisExpress.jsx');
    for (const [nom, source] of [['DepannageTab', reglages], ['DevisExpress', express]]) {
      expect(source, nom).not.toMatch(/majorationUrgence|Majoration d.urgence|majoration.*urgence/i);
    }
    expect(reglages).toContain('Une urgence demandée par le client ne majore jamais le prix');
  });
});
