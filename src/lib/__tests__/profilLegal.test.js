import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFIL_EXIGE, profilManquant, enPhrase } from '../profilLegal';

const COMPLET = {
  nom: 'Hugo Séguin — Électricien',
  siret: '12345678900012',
  adresse: '1 rue du Chantier, 24200 Sarlat',
  formeJuridique: 'Micro-entreprise',
  nomEntrepreneur: 'Hugo Séguin',
  decennaleAssureur: 'SMABTP',
  decennaleNumero: 'DEC-123',
};
const ids = (manquantes) => manquantes.map((m) => m.id);

describe('profil exigé avant envoi : une seule liste', () => {
  it('profil vide : les cinq manques, dans l\'ordre du contrôle d\'envoi', () => {
    expect(ids(profilManquant({}))).toEqual(['no_siret', 'no_adresse', 'no_nom', 'no_forme_juridique', 'no_decennale']);
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
    expect(enPhrase(profilManquant({}))).toBe('SIRET, adresse, nom de l\'entreprise, forme juridique, assurance décennale');
    expect(enPhrase([])).toBe('');
  });
});

// Cliquet : avant, cinq écrans tenaient chacun leur liste et se contredisaient.
// Les écrans qui annoncent ou appliquent le blocage d'envoi lisent lib/profilLegal, rien d'autre.
describe('aucun écran ne retient sa propre liste', () => {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const ECRANS = ['src/components/DevisPage.jsx', 'src/components/DevisComposer.jsx', 'src/components/Settings.jsx'];
  const CONTROLE_EN_DUR = /!\s*\(?\s*(?:String\()?\s*entreprise\??\.(siret|adresse|nom|nomEntrepreneur|formeJuridique|forme_juridique|decennaleAssureur|decennale_assureur|decennaleNumero|decennale_numero)\b/g;

  it.each(ECRANS)('%s', (fichier) => {
    const source = fs.readFileSync(path.join(racine, fichier), 'utf8');
    expect(source).toContain('lib/profilLegal');
    expect(source.match(CONTROLE_EN_DUR) || []).toEqual([]);
  });
});
