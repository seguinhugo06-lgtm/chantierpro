import { describe, it, expect } from 'vitest';
import { jaugeProfil } from '../jaugeProfil';
import { profilManquant } from '../profilLegal';
import { mentionsFacture } from '../mentionsFacture';

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
    expect(ids(j.selonSituation)).toEqual(['capital', 'rcs', 'tvaIntra', 'mediateur', 'decennaleAssureur']);
    expect(ids(j.recommandes)).toEqual(['codeApe', 'rcPro']);
    expect(j.obligatoires).toEqual([]);
    // Rien ne bloque l'envoi, mais capital, RCS et TVA intracom manquent : pas 100 % (7 sur 10)
    expect(j.completude).toBe(70);
  });

  it('le pourcentage est la note de l\'onglet Facture 2026 : les deux écrans disent la même chose', () => {
    for (const e of [{}, SARL, MICRO, { ...SARL, ...TOUT }, { ...SARL, capital: '10000' }, { formeJuridique: 'EI' }]) {
      expect(jaugeProfil(e).completude).toBe(mentionsFacture(e).note);
    }
    // Société sans capital : jamais 100 % (service-public F31808)
    expect(jaugeProfil({ ...SARL, ...TOUT, capital: '' }).completude).toBeLessThan(100);
  });

  it('médiateur et assureur décennal ne comptent pas dans le pourcentage (l\'app ne sait pas si l\'artisan travaille pour des particuliers)', () => {
    const j = jaugeProfil({ ...SARL, ...TOUT, mediateur: '', decennaleZone: '' });
    expect(j.completude).toBe(100);
    expect(ids(j.selonSituation)).toEqual(['mediateur', 'decennaleAssureur']);
    expect(j.selonSituation.find((m) => m.id === 'decennaleAssureur').champ).toBe('decennaleZone');
  });

  it('micro-entreprise en franchise : ni RCS, ni TVA intracom, ni capital', () => {
    const j = jaugeProfil(MICRO);
    expect(ids(j.selonSituation)).not.toContain('rcs');
    expect(ids(j.selonSituation)).not.toContain('tvaIntra');
    expect(ids(j.selonSituation)).not.toContain('capital');
    expect(ids(j.selonSituation)).toEqual(['mediateur', 'decennaleAssureur']);
    expect(j.completude).toBe(100);
  });

  it('le code APE et la RC Pro ne sont jamais présentés comme obligatoires', () => {
    for (const e of [{}, SARL, MICRO]) {
      const j = jaugeProfil(e);
      const dues = [...ids(j.obligatoires), ...ids(j.selonSituation)];
      expect(dues).not.toContain('codeApe');
      expect(dues).not.toContain('rcPro');
    }
  });

  it('les obligatoires sont exactement ce qui bloque l\'envoi (lib/profilLegal)', () => {
    const vide = { formeJuridique: 'SARL' };
    expect(ids(jaugeProfil(vide).obligatoires)).toEqual(ids(profilManquant(vide)));
    // Capital, RCS et TVA intracom n'y sont jamais : ils n'empêchent pas l'envoi (Q-capital-envoi attend Hugo)
    for (const e of [vide, SARL]) expect(ids(jaugeProfil(e).obligatoires)).not.toEqual(expect.arrayContaining(['capital']));
    // Libellé et champ de l'onglet Facture 2026 : la décennale « si vos travaux y sont soumis » (D-24)
    const dec = jaugeProfil({ ...MICRO, decennaleNumero: '' }).obligatoires.find((m) => m.id === 'no_decennale');
    expect(dec.libelle).toBe('Assurance décennale (si vos travaux y sont soumis)');
    expect(dec.champ).toBe('decennaleNumero');
  });

  it('décennale déclarée non soumise (D-24) : ni coordonnées de l\'assureur ni zone', () => {
    const j = jaugeProfil({ ...MICRO, decennaleAssureur: '', decennaleNumero: '', decennaleNonSoumis: true });
    expect(ids(j.selonSituation)).toEqual(['mediateur']);
    expect(j.obligatoires).toEqual([]);
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
    expect(jaugeProfil({ ...SARL, mediateurContact: 'www.mediateur-btp.fr' }).selonSituation.find((x) => x.id === 'mediateur').champ).toBe('mediateur');
  });

  it('entreprise relue depuis la base (clés snake_case)', () => {
    const j = jaugeProfil({ ...SARL, forme_juridique: 'SARL', formeJuridique: undefined, tva_intra: 'FR1', code_ape: '4321A' });
    expect(ids(j.selonSituation)).not.toContain('tvaIntra');
    expect(ids(j.recommandes)).not.toContain('codeApe');
  });
});
