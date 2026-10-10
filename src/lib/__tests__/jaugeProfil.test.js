import { describe, it, expect } from 'vitest';
import { jaugeProfil } from '../jaugeProfil';
import { profilManquant } from '../profilLegal';

// SARL dont le profil ne bloque plus l'envoi, sans capital social ni médiateur
const SARL = {
  nom: 'Dupont Rénovation',
  siret: '98765432100015',
  adresse: '12 rue des Artisans, 75001 Paris',
  formeJuridique: 'SARL',
  decennaleAssureur: 'AXA',
  decennaleNumero: 'D-1',
  tel: '01 23 45 67 89',
  email: 'contact@dupont.fr',
};
// Micro-entreprise en franchise (art. 293 B), inscrite au seul RNE
const MICRO = {
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
const TOUT = {
  capital: '10000',
  rcsVille: 'Paris',
  rcsNumero: '987 654 321',
  tvaIntra: 'FR12987654321',
  mediateur: 'Médiateur du BTP',
  mediateurContact: 'www.mediateur-btp.fr',
  decennaleAssureurAdresse: '313 Terrasses de l\'Arche, Nanterre',
  decennaleZone: 'France métropolitaine',
  codeApe: '4321A',
  rcProAssureur: 'AXA',
  rcProNumero: 'RC-1',
};
const ids = (liste) => liste.map((m) => m.id);

describe('jauge « Profil complété » des Paramètres', () => {
  it('SARL sans capital ni médiateur : listés sous les mentions obligatoires selon la situation, pas sous « Recommandés »', () => {
    const j = jaugeProfil(SARL);
    expect(ids(j.selonSituation)).toEqual(['capital', 'rcs', 'tvaIntra', 'mediateur', 'decennaleAssureurAdresse', 'decennaleZone']);
    expect(ids(j.recommandes)).toEqual(['codeApe', 'rcProAssureur', 'rcProNumero']);
    // Le pourcentage ne compte que ce qui bloque l'envoi : 100 % = l'envoi n'est plus bloqué
    expect(j.obligatoires).toEqual([]);
    expect(j.completude).toBe(100);
  });

  it('micro-entreprise en franchise : ni RCS, ni TVA intracom, ni capital', () => {
    const j = jaugeProfil(MICRO);
    expect(ids(j.selonSituation)).not.toContain('rcs');
    expect(ids(j.selonSituation)).not.toContain('tvaIntra');
    expect(ids(j.selonSituation)).not.toContain('capital');
    expect(ids(j.selonSituation)).toEqual(['mediateur', 'decennaleAssureurAdresse', 'decennaleZone']);
  });

  it('le code APE et la RC Pro ne sont jamais présentés comme obligatoires', () => {
    for (const e of [{}, SARL, MICRO]) {
      const j = jaugeProfil(e);
      expect([...ids(j.obligatoires), ...ids(j.selonSituation)]).not.toEqual(expect.arrayContaining(['codeApe']));
      expect([...ids(j.obligatoires), ...ids(j.selonSituation)].some((id) => id.startsWith('rcPro'))).toBe(false);
    }
  });

  it('les obligatoires sont exactement ce qui bloque l\'envoi (lib/profilLegal)', () => {
    const vide = { formeJuridique: 'SARL' };
    expect(ids(jaugeProfil(vide).obligatoires)).toEqual(ids(profilManquant(vide)));
    expect(jaugeProfil(vide).completude).toBe(Math.round((2 / 8) * 100)); // forme juridique + nom de l'EI réputé rempli
    // Capital, RCS et TVA intracom n'entrent pas dans le pourcentage (Q-capital-envoi attend Hugo)
    expect(jaugeProfil({ ...SARL, capital: '' }).completude).toBe(100);
  });

  it('décennale déclarée non soumise (D-24) : ni coordonnées de l\'assureur ni zone', () => {
    const j = jaugeProfil({ ...MICRO, decennaleAssureur: '', decennaleNumero: '', decennaleNonSoumis: true });
    expect(ids(j.selonSituation)).toEqual(['mediateur']);
  });

  it('tout rempli : aucune mention listée', () => {
    const j = jaugeProfil({ ...SARL, ...TOUT });
    expect(j).toEqual({ obligatoires: [], selonSituation: [], recommandes: [], completude: 100 });
  });

  it('RCS : l\'ancien champ libre suffit (comme l\'onglet Facture 2026) ; ville saisie sans numéro → le numéro est ciblé', () => {
    expect(ids(jaugeProfil({ ...SARL, rcs: 'Paris B 987 654 321' }).selonSituation)).not.toContain('rcs');
    const rcs = jaugeProfil({ ...SARL, rcsVille: 'Paris' }).selonSituation.find((m) => m.id === 'rcs');
    expect(rcs.champ).toBe('rcsNumero');
    expect(jaugeProfil(SARL).selonSituation.find((m) => m.id === 'rcs').champ).toBe('rcs'); // la ville du greffe
  });

  it('médiateur : le nom sans le site reste à compléter (ses coordonnées sont dues)', () => {
    const m = jaugeProfil({ ...SARL, mediateur: 'Médiateur du BTP' }).selonSituation.find((x) => x.id === 'mediateur');
    expect(m.champ).toBe('mediateurContact');
    expect(m.precision).toBe('si vous travaillez pour des particuliers');
  });

  it('entreprise relue depuis la base (clés snake_case)', () => {
    const j = jaugeProfil({ ...SARL, forme_juridique: 'SARL', formeJuridique: undefined, tva_intra: 'FR1', code_ape: '4321A' });
    expect(ids(j.selonSituation)).not.toContain('tvaIntra');
    expect(ids(j.recommandes)).not.toContain('codeApe');
  });
});
