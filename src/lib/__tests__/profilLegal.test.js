import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFIL_EXIGE, profilManquant, enPhrase } from '../profilLegal';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';

const COMPLET = {
  nom: 'Hugo Séguin — Électricien',
  siret: '12345678900012',
  adresse: '1 rue du Chantier, 24200 Sarlat',
  formeJuridique: 'Micro-entreprise',
  nomEntrepreneur: 'Hugo Séguin',
  decennaleAssureur: 'SMABTP',
  decennaleNumero: 'DEC-123',
  tel: '06 12 34 56 78',
  email: 'contact@exemple.fr',
};
const ids = (manquantes) => manquantes.map((m) => m.id);

describe('profil exigé avant envoi : une seule liste', () => {
  it('profil vide : tous les manques, dans l\'ordre du contrôle d\'envoi', () => {
    expect(ids(profilManquant({}))).toEqual(['no_siret', 'no_adresse', 'no_nom', 'no_forme_juridique', 'no_decennale', 'no_tel', 'no_email']);
    expect(ids(profilManquant(null))).toEqual(ids(profilManquant({})));
  });

  it('profil complet : rien ne bloque', () => {
    expect(profilManquant(COMPLET)).toEqual([]);
  });

  // Le cas qui divergeait : jauge des Réglages à 100 %, bandeaux muets, envoi bloqué
  it('décennale sans numéro de police : manquante', () => {
    expect(ids(profilManquant({ ...COMPLET, decennaleNumero: '' }))).toEqual(['no_decennale']);
    expect(ids(profilManquant({ ...COMPLET, decennaleAssureur: '' }))).toEqual(['no_decennale']);
  });

  // C. com. R526-27 : le nom de la personne, suivi de « EI », sur chaque document
  it('entrepreneur individuel ou EIRL sans son prénom et nom : manquant ; société : non exigé', () => {
    const sansNom = { ...COMPLET, nomEntrepreneur: '' };
    expect(ids(profilManquant(sansNom))).toEqual(['no_nom_entrepreneur']);
    expect(ids(profilManquant({ ...sansNom, formeJuridique: 'EIRL' }))).toEqual(['no_nom_entrepreneur']);
    expect(ids(profilManquant({ ...sansNom, formeJuridique: 'SARL' }))).toEqual([]);
  });

  // D-23 : C. conso. L111-1 4°, R111-1, et L221-3 (petit professionnel hors établissement) — exigés pour tout client
  it('téléphone et e-mail : exigés, quel que soit le client', () => {
    expect(ids(profilManquant({ ...COMPLET, tel: '', email: ' ' }))).toEqual(['no_tel', 'no_email']);
    expect(profilManquant({ ...COMPLET, tel: '', telephone: '05 53 00 00 00' })).toEqual([]);
  });

  // D-24 : C. assur. L241-1 — la décennale vise les travaux de construction, pas le dépannage ni l'entretien
  it('travaux déclarés non soumis à la décennale : elle n\'est plus exigée', () => {
    const sansDecennale = { ...COMPLET, decennaleAssureur: '', decennaleNumero: '' };
    expect(ids(profilManquant(sansDecennale))).toEqual(['no_decennale']);
    expect(profilManquant({ ...sansDecennale, decennaleNonSoumis: true })).toEqual([]);
    expect(ids(profilManquant({ ...sansDecennale, decennaleNonSoumis: 'true' }))).toEqual(['no_decennale']);
  });

  // Avec la case D-24, un profil à moitié rempli peut partir : jamais de « Assurance décennale : X N° » vide
  it('documents : la ligne décennale n\'est imprimée qu\'avec l\'assureur ET le numéro de police', () => {
    const doc = { type: 'devis', numero: 'DEV-1', date: '2026-10-10', lignes: [{ description: 'Dépannage', quantite: 1, prixUnitaire: 100, tva: 20 }], total_ht: 100, tva: 20, total_ttc: 120 };
    const client = { nom: 'Dupont' };
    const generer = (entreprise) => [buildDevisHtml({ doc, client, entreprise }), buildDocumentHTML(doc, client, null, entreprise)];
    const moitie = { ...COMPLET, decennaleNumero: '', decennaleNonSoumis: true };
    generer(moitie).forEach((html) => expect(html).not.toContain('Assurance décennale'));
    generer(COMPLET).forEach((html) => expect(html).toContain('Assurance décennale: SMABTP'));
  });

  it('un champ fait d\'espaces compte comme vide', () => {
    expect(ids(profilManquant({ ...COMPLET, siret: '   ' }))).toEqual(['no_siret']);
  });

  it('accepte une entreprise relue en snake_case depuis la base', () => {
    const { formeJuridique, decennaleAssureur, decennaleNumero, ...reste } = COMPLET;
    expect(profilManquant({ ...reste, forme_juridique: formeJuridique, decennale_assureur: decennaleAssureur, decennale_numero: decennaleNumero })).toEqual([]);
  });

  it('chaque mention dit où la compléter', () => {
    PROFIL_EXIGE.forEach((m) => {
      expect(['identite', 'legal', 'assurances']).toContain(m.onglet);
      expect(m.champ).toBeTruthy();
      expect(m.manque).toBeTruthy();
    });
  });

  it('en phrase : sigles conservés, le reste en minuscule', () => {
    expect(enPhrase(profilManquant({}))).toBe('SIRET, adresse, nom de l\'entreprise, forme juridique, assurance décennale, téléphone, e-mail');
    expect(enPhrase([])).toBe('');
  });
});

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const lire = (fichier) => fs.readFileSync(path.join(racine, fichier), 'utf8');

// Cliquet : avant, six écrans tenaient chacun leur liste et se contredisaient.
// Les écrans qui annoncent ou appliquent le blocage d'envoi lisent lib/profilLegal, rien d'autre.
describe('aucun écran ne retient sa propre liste', () => {
  const ECRANS = ['src/components/DevisPage.jsx', 'src/components/DevisComposer.jsx', 'src/components/Settings.jsx', 'src/components/Dashboard.jsx'];
  const CONTROLE_EN_DUR = /!\s*\(?\s*(?:String\()?\s*entreprise\??\.(siret|adresse|nom|nomEntrepreneur|formeJuridique|forme_juridique|decennaleAssureur|decennale_assureur|decennaleNumero|decennale_numero|decennaleNonSoumis|tel|telephone|email)\b/g;

  it.each(ECRANS)('%s', (fichier) => {
    const source = lire(fichier);
    expect(source).toContain('lib/profilLegal');
    expect(source.match(CONTROLE_EN_DUR) || []).toEqual([]);
  });
});

// « Compléter » ouvre `onglet` puis cible `settings-field-<champ>` : le champ doit vivre dans cet onglet
// (la forme juridique pointait vers « legal » alors que son menu est dans « identite »).
describe('chaque mention mène au bon onglet des Paramètres', () => {
  const source = lire('src/components/Settings.jsx');
  const blocs = [...source.matchAll(/\{tab === '([a-z0-9_]+)' &&/g)].map((m) => ({ debut: m.index, onglet: m[1] }));

  it.each(PROFIL_EXIGE.map((m) => [m.champ, m.onglet]))('%s → %s', (champ, onglet) => {
    const position = source.indexOf(`id="settings-field-${champ}"`);
    expect(position).toBeGreaterThan(-1);
    const bloc = blocs.filter((b) => b.debut < position).pop();
    expect(bloc?.onglet).toBe(onglet);
  });
});
