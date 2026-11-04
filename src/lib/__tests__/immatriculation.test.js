import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registreDe, mentionImmatriculation, libellesImmatriculation, estInscritRm } from '../immatriculation';
import { mentionsFacture, rcsConcerne, rcsRenseigne } from '../mentionsFacture';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';

// Retour d'Hugo (3 nov. 2026) : « Registre métier ou commerce — Type à revoir car pas commerçant ». Le bloc
// propose le RNE (métiers et artisanat) à un artisan et le RCS à une société, sans changer les données d'avant.
describe('registreDe : quel registre proposer', () => {
  it('sans rien de saisi : EI, micro-entreprise, EIRL → RM ; société ou forme inconnue → RCS', () => {
    expect(registreDe({ formeJuridique: 'EI' })).toBe('RM');
    expect(registreDe({ formeJuridique: 'Micro-entreprise' })).toBe('RM');
    expect(registreDe({ formeJuridique: 'EIRL' })).toBe('RM');
    expect(registreDe({ formeJuridique: 'SARL' })).toBe('RCS');
    expect(registreDe({ formeJuridique: 'SASU' })).toBe('RCS');
    expect(registreDe({})).toBe('RCS');
    expect(registreDe(null)).toBe('RCS');
  });

  it('le choix enregistré prime sur la forme juridique', () => {
    expect(registreDe({ formeJuridique: 'SARL', rcsType: 'RM' })).toBe('RM');
    expect(registreDe({ formeJuridique: 'EI', rcsType: 'A' })).toBe('RCS');
    expect(registreDe({ formeJuridique: 'EI', rcs_type: 'rm' })).toBe('RM');
  });

  it('données anciennes : un EI qui avait saisi ville et numéro sans type reste au RCS (même mention imprimée)', () => {
    const ancien = { formeJuridique: 'EI', rcsVille: 'Lyon', rcsNumero: '123 456 789', rcsType: '' };
    expect(registreDe(ancien)).toBe('RCS');
    expect(mentionImmatriculation(ancien)).toBe('RCS Lyon B 123 456 789');
    expect(estInscritRm(ancien)).toBe(false);
  });
});

describe('mentionImmatriculation : ce qui s’imprime', () => {
  it('RCS : « RCS ville type numéro », type B par défaut', () => {
    expect(mentionImmatriculation({ rcsVille: 'Bordeaux', rcsNumero: '123 456 789', rcsType: 'B' })).toBe('RCS Bordeaux B 123 456 789');
    expect(mentionImmatriculation({ rcs_ville: 'Paris', rcs_numero: '987654321' })).toBe('RCS Paris B 987654321');
  });

  // Relecture juriste-btp du 3 nov. 2026 : aucune mention « RM » depuis le 1er janv. 2023 ; C. conso. R111-2, 3°
  it('RNE (artisan) : le numéro d’inscription au RNE en tant qu’entreprise du secteur des métiers et de l’artisanat', () => {
    expect(mentionImmatriculation({ rcsType: 'RM', rcsNumero: '123 456 789' })).toBe('Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° 123 456 789');
  });

  it('RNE : un département saisi avant la relecture est ignoré, jamais « RM » imprimé', () => {
    const m = mentionImmatriculation({ rcsType: 'RM', rcsVille: '33', rcsNumero: '123 456 789' });
    expect(m).toBe('Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° 123 456 789');
    expect(m).not.toMatch(/\bRM\b|33/);
  });

  it('incomplet : rien (ni « RCS Paris B » sans numéro, ni RNE sans numéro)', () => {
    expect(mentionImmatriculation({ rcsVille: 'Paris' })).toBe('');
    expect(mentionImmatriculation({ rcsType: 'RM', rcsVille: '33' })).toBe('');
  });

  it('ancien champ libre `rcs` : préfixé « RCS » s’il ne l’est pas, jamais en double', () => {
    expect(mentionImmatriculation({ rcs: 'Paris B 123 456 789' })).toBe('RCS Paris B 123 456 789');
    expect(mentionImmatriculation({ rcs: 'RCS Lyon 123 456 789' })).toBe('RCS Lyon 123 456 789');
    expect(mentionImmatriculation({ rcs: '123 456 789 RM 69' })).toBe('123 456 789 RM 69');
  });

  it('libellés du formulaire selon le registre', () => {
    expect(libellesImmatriculation('RM').lieu).toBeNull();
    expect(libellesImmatriculation('RM').aide).toMatch(/attestation d’immatriculation au RNE, gratuite sur data\.inpi\.fr/);
    expect(libellesImmatriculation('RCS').lieu).toBe('Ville du greffe');
  });
});

describe('liste « Facture 2026 » : un artisan au RM n’a pas de RCS à compléter', () => {
  it('EI au RM : RCS ni concerné ni renseigné', () => {
    const ei = { formeJuridique: 'EI', rcsType: 'RM', rcsVille: '33', rcsNumero: '123456789' };
    expect(rcsConcerne(ei)).toBe(false);
    expect(mentionsFacture(ei).obligatoires.map((m) => m.id)).not.toContain('rcs');
  });

  it('société au RM seulement : le RCS reste demandé (le RM ne le remplace pas)', () => {
    const sarl = { formeJuridique: 'SARL', rcsType: 'RM', rcsVille: '33', rcsNumero: '123456789' };
    expect(rcsConcerne(sarl)).toBe(true);
    expect(rcsRenseigne(sarl)).toBe(false);
  });
});

describe('les générateurs impriment la même mention', () => {
  const client = { nom: 'Rousseau', prenom: 'Claire' };
  const doc = {
    type: 'facture', numero: 'FAC-2026-00001', date: '2026-10-07', statut: 'brouillon',
    lignes: [{ description: 'Remplacement tableau électrique', quantite: 1, unite: 'u', prixUnitaire: 1200, tva: 20 }],
    total_ht: 1200, tva: 240, total_ttc: 1440,
  };
  const artisan = { nom: 'Élec Exemple', nomEntrepreneur: 'Jean Exemple', formeJuridique: 'EI', siret: '12345678900011', adresse: '1 rue A\n33000 Bordeaux', rcsType: 'RM', rcsVille: '33', rcsNumero: '123 456 789' };
  const sarl = { ...artisan, formeJuridique: 'SARL', rcsType: 'B', rcsVille: 'Bordeaux' };

  it('devisHtmlBuilder : RNE pour l’artisan, RCS pour la société, jamais « RCS » ni « RM »', () => {
    const rm = buildDevisHtml({ doc, client, entreprise: artisan, couleur: '#12336F' });
    expect(rm).toContain('Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° 123 456 789');
    expect(rm).not.toMatch(/RCS|\bRM\b/);
    expect(buildDevisHtml({ doc, client, entreprise: sarl, couleur: '#12336F' })).toContain('RCS Bordeaux B 123 456 789');
  });

  it('devisHtmlBuilder : l’ancien champ libre ne s’imprime plus « RCS: RCS … »', () => {
    const html = buildDevisHtml({ doc, client, entreprise: { ...sarl, rcsVille: '', rcsNumero: '', rcs: 'RCS Paris B 987 654 321' }, couleur: '#12336F' });
    expect(html).toContain('RCS Paris B 987 654 321');
    expect(html).not.toMatch(/RCS:?\s*RCS/);
  });

  it('pdfHtmlBuilder : même mention', () => {
    expect(buildDocumentHTML(doc, client, null, artisan)).toContain('Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° 123 456 789');
    expect(buildDocumentHTML(doc, client, null, artisan)).not.toMatch(/\bRM\b/);
    expect(buildDocumentHTML(doc, client, null, sarl)).toContain('RCS Bordeaux B 123 456 789');
  });

  it('générateur de l’aperçu (DevisPage.jsx) : passe par le même module (rendu réel : parcours « documents »)', () => {
    const source = readFileSync(new URL('../../components/DevisPage.jsx', import.meta.url), 'utf8');
    expect(source).toMatch(/const getRCSComplet = \(\) => mentionImmatriculation\(entreprise\);/);
    expect(source).not.toMatch(/`RCS \$\{entreprise\.rcsVille\}/);
  });
});
