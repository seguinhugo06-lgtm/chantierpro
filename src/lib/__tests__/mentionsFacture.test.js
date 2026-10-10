import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mentionsFacture, rcsConcerne, tvaIntraConcernee } from '../mentionsFacture';
import { testFacturXCompliance } from '../facturx';

// Micro-entreprise en franchise, inscrite au seul RNE (pas de RCS), décennale saisie
const MICRO = {
  nom: 'Hugo Séguin — Électricien',
  siret: '12345678900012',
  adresse: '1 rue du Chantier, 24200 Sarlat',
  formeJuridique: 'Micro-entreprise',
  nomEntrepreneur: 'Hugo Séguin',
  decennaleAssureur: 'SMABTP',
  decennaleNumero: 'DEC-123',
};
const SARL = {
  nom: 'Dupont Rénovation',
  siret: '98765432100015',
  adresse: '12 rue des Artisans, 75001 Paris',
  formeJuridique: 'SARL',
  decennaleAssureur: 'AXA',
  decennaleNumero: 'D-1',
  rcsVille: 'Paris',
  rcsNumero: '987 654 321',
  tvaIntra: 'FR12987654321',
};
const ids = (liste) => liste.map((m) => m.id);

describe('Facture 2026 : informations à vérifier pour les factures', () => {
  it('micro-entreprise en franchise, sans RCS, décennale saisie : ni RCS ni TVA intracom, liste complète', () => {
    const r = mentionsFacture(MICRO);
    expect(ids(r.obligatoires)).not.toContain('rcs');
    expect(ids(r.obligatoires)).not.toContain('tvaIntra');
    expect(r.obligatoires.every((m) => m.rempli)).toBe(true);
    expect(r.complet).toBe(true);
    expect(r.note).toBe(100);
  });

  it('l\'IBAN est utile, pas obligatoire : il ne compte pas dans la note', () => {
    const r = mentionsFacture(MICRO);
    expect(ids(r.utiles)).toEqual(['iban']);
    expect(ids(r.obligatoires)).not.toContain('iban');
    expect(r.utiles[0].rempli).toBe(false);
    expect(mentionsFacture({ ...MICRO, iban: 'FR76 3000 6000 0112 3456 7890 189' }).note).toBe(100);
  });

  it('ni RC Pro ni critère Factur-X toujours vrai ; la décennale est lue comme pour l\'envoi (assureur ET police)', () => {
    const r = mentionsFacture(MICRO);
    expect(ids(r.obligatoires)).not.toContain('rcPro');
    expect(ids(r.obligatoires)).not.toContain('facturx');
    const decennale = r.obligatoires.find((m) => m.id === 'no_decennale');
    expect(decennale.libelle).toBe('Assurance décennale (si vos travaux y sont soumis)');
    const sansPolice = mentionsFacture({ ...MICRO, decennaleNumero: '' });
    expect(sansPolice.obligatoires.find((m) => m.id === 'no_decennale').rempli).toBe(false);
    expect(sansPolice.complet).toBe(false);
  });

  it('jamais « complet » ni 100 % tant qu\'une information obligatoire manque', () => {
    for (const champ of ['siret', 'adresse', 'nom', 'formeJuridique', 'nomEntrepreneur', 'decennaleAssureur']) {
      const r = mentionsFacture({ ...MICRO, [champ]: '' });
      expect(r.complet, champ).toBe(false);
      expect(r.note, champ).toBeLessThan(100);
    }
    // 5 sur 6 = 83 % : l'ancien seuil (80 %) affichait déjà « complètes »
    expect(mentionsFacture({ ...MICRO, siret: '' }).note).toBe(83);
  });

  it('société : RCS et TVA intracom demandés ; complète quand ils sont saisis', () => {
    expect(mentionsFacture(SARL).complet).toBe(true);
    const r = mentionsFacture({ ...SARL, rcsVille: '', rcsNumero: '', tvaIntra: '' });
    expect(ids(r.obligatoires.filter((m) => !m.rempli))).toEqual(['rcs', 'tvaIntra']);
    // Pas de « prénom et nom (suivis de EI) » coché d'office pour une société : la ligne n'apparaît pas
    expect(ids(r.obligatoires)).not.toContain('no_nom_entrepreneur');
  });

  it('RCS : ville et numéro, ou l\'ancien champ libre ; EI qui l\'a saisi = commerçant, compté', () => {
    expect(mentionsFacture({ ...SARL, rcsNumero: '' }).obligatoires.find((m) => m.id === 'rcs').rempli).toBe(false);
    expect(mentionsFacture({ ...SARL, rcsVille: '', rcsNumero: '', rcs: 'RCS Paris B 987 654 321' }).complet).toBe(true);
    expect(rcsConcerne({ formeJuridique: 'EI' })).toBe(false);
    expect(rcsConcerne({ formeJuridique: 'EIRL' })).toBe(false);
    expect(rcsConcerne({ formeJuridique: 'EI', rcsVille: 'Lyon', rcsNumero: '123456789' })).toBe(true);
    // Forme inconnue : on demande d'abord la forme juridique
    expect(rcsConcerne({})).toBe(false);
  });

  it('TVA intracom : masquée en franchise (micro, ancienne valeur « Auto-entrepreneur »), demandée sinon', () => {
    expect(tvaIntraConcernee({ formeJuridique: 'Micro-entreprise' })).toBe(false);
    expect(tvaIntraConcernee({ forme_juridique: 'Auto-entrepreneur' })).toBe(false);
    expect(tvaIntraConcernee({ formeJuridique: 'EI' })).toBe(true);
    expect(tvaIntraConcernee({ formeJuridique: 'SAS' })).toBe(true);
  });

  // « Compléter » ouvre l'onglet qui porte le champ ; avant, SIRET menait à « identite », champ dans « legal »
  it('chaque « Compléter » vise l\'onglet et le champ qui existent dans les Réglages', () => {
    const settings = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../../components/Settings.jsx'), 'utf8');
    // Blocs des onglets : « {tab === 'legal' && ( … » jusqu'au bloc suivant
    const blocs = {};
    const re = /\{tab === '([a-z0-9]+)' && \(/g;
    const debuts = [...settings.matchAll(re)].map((m) => ({ onglet: m[1], index: m.index }));
    debuts.forEach((d, i) => {
      blocs[d.onglet] = (blocs[d.onglet] || '') + settings.slice(d.index, debuts[i + 1]?.index ?? settings.length);
    });

    const vides = [
      {},
      { formeJuridique: 'EI' },
      { formeJuridique: 'SARL' },
      { formeJuridique: 'SARL', rcsVille: 'Paris' },
      { formeJuridique: 'Micro-entreprise', decennaleAssureur: 'SMABTP' },
    ];
    const vus = new Set();
    for (const e of vides) {
      const { obligatoires, utiles } = mentionsFacture(e);
      for (const m of [...obligatoires, ...utiles].filter((x) => !x.rempli)) {
        vus.add(`${m.onglet}/${m.champ}`);
        expect(blocs[m.onglet], `onglet ${m.onglet}`).toBeTruthy();
        expect(blocs[m.onglet], `${m.id} → ${m.onglet}/settings-field-${m.champ}`).toContain(`id="settings-field-${m.champ}"`);
      }
    }
    expect([...vus]).toEqual(expect.arrayContaining([
      'legal/siret', 'legal/rcs', 'legal/rcsNumero', 'legal/tvaIntra', 'identite/adresse',
      'assurances/decennaleAssureur', 'assurances/decennaleNumero', 'banque/iban',
    ]));
  });
});

describe('test Factur-X de l\'onglet : cohérent avec la liste', () => {
  const facture = {
    numero: 'TEST-1', date: '2026-10-10', type: 'facture', total_ht: 100, tva: 0, total_ttc: 100, tvaRate: 0,
    lignes: [{ description: 'Pose', quantite: 1, prixUnitaire: 100, montant: 100, unite: 'forfait', tva: 0 }],
  };
  const client = { nom: 'Dupont', adresse: '15 rue des Lilas, 75011 Paris' };

  it('micro-entreprise : ni TVA intracom ni RCS réclamés', () => {
    const r = testFacturXCompliance(facture, client, { ...MICRO, email: 'a@b.fr' });
    const messages = [...r.errors, ...r.warnings].join(' | ');
    expect(messages).not.toMatch(/TVA intra/i);
    expect(messages).not.toMatch(/RCS/);
    expect(r.errors).toEqual([]);
  });

  it('société sans TVA intracom ni RCS : réclamés ; RCS saisi en ville + numéro : reconnu', () => {
    const sans = testFacturXCompliance(facture, client, { ...SARL, tvaIntra: '', rcsVille: '', rcsNumero: '' });
    expect(sans.errors.join(' ')).toMatch(/TVA intra/i);
    expect(sans.warnings.join(' ')).toMatch(/RCS/);
    const avec = testFacturXCompliance(facture, client, SARL);
    expect([...avec.errors, ...avec.warnings].join(' ')).not.toMatch(/RCS|TVA intra/i);
  });
});
