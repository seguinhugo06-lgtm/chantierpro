import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  echeanceLegale, prochainParDefaut, apresEcheance, limiteRemise, niveauCO, PHRASES_CO, obligationConnue, phraseObligation,
  tauxPropose, manquants, nouveauBrouillon, groupesPoints, pointsCoches, ligneFacture, rappelsDus, texteSms,
  referenceEmissions, numeroEntretienDemo, appareilsDuClient, entretienPrecedent, nomAppareil, dateEnLettres, AIDE_OBLIGATION_RAPPEL,
} from '../entretien';
import { FIELD_MAPPINGS } from '../../hooks/useSupabaseSync';

// L'avis du juriste est la source des formules du rappel : les tests y lisent les phrases, caractères compris
const AVIS = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/metiers/avis-juriste-2026-11-04-entretien.md'), 'utf8');
const formuleDeLAvis = (debut) => {
  const m = AVIS.match(new RegExp(`^\\*\\*${debut}[^\\n]*?\\*\\* : \`([^\`]+)\``, 'm'));
  if (!m) throw new Error(`Formule « ${debut} » introuvable dans l'avis du juriste`);
  return m[1];
};

// Données fictives seulement
const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', adresse: '3 chemin de l’Exemple, 24000 Imaginaire', telephone: '06 00 00 00 01', email: 'lucie@exemple.fr' };

/** Une attestation de chaudière gaz complète (tout ce que l'annexe 5 exige). */
function chaudiere(o = {}) {
  const b = nouveauBrouillon({ client, categorieValeur: 'chaudiere', maintenant: new Date('2026-11-04T10:00:00') });
  return {
    ...b,
    local: 'Cuisine',
    appareils: [{ ...b.appareils[0], energie: 'gaz', marque: 'Exemplair', modele: 'Naneo', evacuation: 'ventouse', points: { 'boucle.pression': true } }],
    puissance_kw: '24',
    appareils_mesure: 'Analyseur Exemple A1',
    operations: 'Nettoyage du brûleur, contrôle de l’allumage',
    co_ppm: '3',
    rendement: { evalue: '93 %', reference: '94 %' },
    emissions: { evalue: '40 mg/kWh' },
    classe_energetique: 'A',
    conseils: { usage: 'Baisser la température la nuit', choix: [], texte: '' },
    intervenant_nom: 'Paul Exemple',
    ...o,
  };
}

describe('entretien — échéance légale (avis § 1.4, 2.4, 3.3)', () => {
  it('chaudière : 31 décembre de l’année civile qui suit la visite, et non douze mois après', () => {
    expect(echeanceLegale('chaudiere', '2026-11-04T10:00:00')).toBe('2027-12-31');
    expect(echeanceLegale('chaudiere', '2026-01-02T10:00:00')).toBe('2027-12-31');
    // Contre-essai : douze mois après serait le 4 novembre 2027
    expect(echeanceLegale('chaudiere', '2026-11-04T10:00:00')).not.toBe(prochainParDefaut('2026-11-04T10:00:00'));
  });
  it('PAC : deux ans au plus ; poêle : douze mois', () => {
    expect(echeanceLegale('pac', '2026-11-04T10:00:00')).toBe('2028-11-04');
    expect(echeanceLegale('poele', '2026-11-04T10:00:00')).toBe('2027-11-04');
    expect(echeanceLegale('poele', '2028-02-29T10:00:00')).toBe('2029-02-28');
  });
  it('date conseillée à douze mois par défaut, alerte (non bloquante) au-delà de l’échéance', () => {
    expect(prochainParDefaut('2026-11-04T10:00:00')).toBe('2027-11-04');
    expect(prochainParDefaut('2026-11-04T10:00:00', 24)).toBe('2028-11-04');
    expect(apresEcheance('2027-11-04', '2027-12-31')).toBe(false);
    expect(apresEcheance('2028-01-02', '2027-12-31')).toBe(true);
  });
  it('remise de l’attestation : 15 jours (chaudière), 15 jours ouvrés (poêle)', () => {
    expect(limiteRemise('chaudiere', '2026-11-04T10:00:00')).toBe('2026-11-19');
    // Mercredi 4 nov. 2026 + 15 jours ouvrés (lundi-vendredi) = mercredi 25 nov.
    expect(limiteRemise('poele', '2026-11-04T10:00:00')).toBe('2026-11-25');
  });
});

describe('entretien — monoxyde de carbone (annexe 5)', () => {
  it('choisit la phrase a, b ou c selon la mesure, bornes comprises', () => {
    expect(niveauCO('9.9')).toBe('a');
    expect(niveauCO('10')).toBe('b');
    expect(niveauCO('49,9')).toBe('b');
    expect(niveauCO(50)).toBe('c');
    expect(niveauCO('')).toBe(null);
    expect(niveauCO('abc')).toBe(null);
  });
  it('phrases imprimées mot pour mot', () => {
    expect(PHRASES_CO.a).toBe('La situation est normale');
    expect(PHRASES_CO.c).toContain('danger grave et imminent');
  });
});

describe('entretien — obligation énoncée seulement si ses conditions sont connues (avis § 4)', () => {
  it('chaudière de 4 à 400 kW', () => {
    expect(obligationConnue({ categorie: 'chaudiere', puissance_kw: '24' })).toBe(true);
    expect(obligationConnue({ categorie: 'chaudiere', puissance_kw: '' })).toBe(false);
    expect(obligationConnue({ categorie: 'chaudiere', puissance_kw: '450' })).toBe(false);
    expect(obligationConnue({ categorie: 'chaudiere', puissance_kw: '3,5' })).toBe(false);
  });
  it('PAC de 4 à 70 kW, sans contrat de performance énergétique', () => {
    expect(obligationConnue({ categorie: 'pac', puissance_kw: '8' })).toBe(true);
    expect(obligationConnue({ categorie: 'pac', puissance_kw: '2.5' })).toBe(false);
    expect(obligationConnue({ categorie: 'pac', puissance_kw: '80' })).toBe(false);
    expect(obligationConnue({ categorie: 'pac', puissance_kw: '8', contrat_performance: true })).toBe(false);
  });
  it('la phrase de la chaudière donne la fin de l’année civile suivante, jamais la date conseillée', () => {
    const p = phraseObligation({ categorie: 'chaudiere', puissance_kw: 24, realise_le: '2026-11-04T10:00:00', prochain_avant: '2027-11-04' });
    expect(p).toContain('une fois par année civile (article R. 224-41-7 du code de l’environnement)');
    expect(p).toContain('au plus tard le 31 décembre 2027');
    expect(p).not.toContain('04/11/2027');
    expect(phraseObligation({ categorie: 'chaudiere', puissance_kw: '', realise_le: '2026-11-04T10:00:00' })).toBe('');
  });
  it('le SMS d’une chaudière ne cite l’article que si la puissance est connue', () => {
    const e = { categorie: 'chaudiere', puissance_kw: 24, realise_le: '2026-11-04T10:00:00', prochain_avant: '2027-11-04' };
    const ent = { nom: 'Chauffage Exemple', formeJuridique: 'EI', tel: '05 00 00 00 00' };
    expect(texteSms({ entreprise: ent, entretien: e, aujourdhui: '2027-10-10' })).toContain('art. R. 224-41-7');
    expect(texteSms({ entreprise: ent, entretien: { ...e, puissance_kw: '' }, aujourdhui: '2027-10-10' })).not.toContain('R. 224-41-7');
    expect(texteSms({ entreprise: ent, entretien: e, aujourdhui: '2027-10-10' })).toContain('répondez STOP');
    expect(texteSms({ entreprise: ent, entretien: e, aujourdhui: '2027-10-10' })).not.toMatch(/obligatoire/i);
  });
});

// D-38 (Hugo, 5 nov. 2026), décision 1 : l'obligation et son article dans le rappel de la PAC et du poêle aussi
describe('entretien — D-38 : l’obligation dans le rappel d’une PAC ou d’un poêle, formules du § 4.5 de l’avis (mot pour mot)', () => {
  const visite = '2026-11-04T10:00:00';
  const pac = (o = {}) => ({ categorie: 'pac', puissance_kw: 8, realise_le: visite, prochain_avant: '2027-11-04', ...o });
  const poele = (o = {}) => ({ categorie: 'poele', appareils: [{ energie: 'granules' }], realise_le: visite, prochain_avant: '2027-11-04', ...o });

  it('PAC ou climatisation de 4 à 70 kW connue : la formule de l’avis, avec la visite + 2 ans', () => {
    const attendue = formuleDeLAvis('PAC / climatisation').replace('{date de la visite + 2 ans}', '4 novembre 2028');
    expect(phraseObligation(pac())).toBe(attendue);
    expect(phraseObligation(pac())).toContain('article R. 224-44-3 du code de l\'environnement');
    expect(phraseObligation(pac({ puissance_kw: 4 }))).toBe(attendue);
    expect(phraseObligation(pac({ puissance_kw: '70' }))).toBe(attendue);
  });
  it('PAC : aucune phrase si la puissance est inconnue, de 3 kW, de plus de 70 kW, ou si un contrat de performance couvre le système', () => {
    expect(phraseObligation(pac({ puissance_kw: '' }))).toBe('');
    expect(phraseObligation(pac({ puissance_kw: null }))).toBe('');
    expect(phraseObligation(pac({ puissance_kw: 3 }))).toBe('');
    expect(phraseObligation(pac({ puissance_kw: 80 }))).toBe('');
    expect(phraseObligation(pac({ contrat_performance: true }))).toBe('');
  });
  it('poêle ou insert : la formule de l’avis, sans date (« lorsqu’il est utilisé »)', () => {
    expect(phraseObligation(poele())).toBe(formuleDeLAvis('Poêle, insert'));
    expect(phraseObligation(poele())).toContain('article R. 1331-68 du code de la santé publique');
    // Pas de puissance à connaître pour un poêle
    expect(phraseObligation(poele({ puissance_kw: '' }))).toBe(formuleDeLAvis('Poêle, insert'));
  });
  it('poêle : aucune phrase pour « autre biomasse » ou un appareil raccordé à un circuit hydraulique (statut non tranché)', () => {
    expect(phraseObligation(poele({ appareils: [{ energie: 'autre_biomasse' }] }))).toBe('');
    expect(phraseObligation(poele({ appareils: [{ energie: 'granules', hydraulique: true }] }))).toBe('');
  });
  it('jamais la date conseillée présentée comme une échéance légale : la PAC donne visite + 2 ans, même si la date conseillée est à 12 mois', () => {
    const p = phraseObligation(pac({ prochain_avant: '2027-11-04' }));
    expect(p).toContain('au plus tard le 4 novembre 2028');
    expect(p).not.toContain('2027');
    expect(p).not.toContain('04/11');
    // Visite du 29 février : deux ans plus tard n'existe pas, le 28 février (même règle que l'échéance légale)
    expect(phraseObligation(pac({ realise_le: '2028-02-29T10:00:00' }))).toContain('au plus tard le 28 février 2030');
    expect(phraseObligation(pac({ realise_le: '2026-02-27T10:00:00' }))).toContain('au plus tard le 27 février 2028');
  });
  it('la chaudière ne change pas', () => {
    const c = { categorie: 'chaudiere', puissance_kw: 24, realise_le: visite };
    expect(phraseObligation(c)).toBe('Pour rappel, l’entretien d’une chaudière doit être fait une fois par année civile (article R. 224-41-7 du code de l’environnement) : le prochain doit avoir lieu au plus tard le 31 décembre 2027.');
    expect(phraseObligation({ ...c, puissance_kw: '' })).toBe('');
  });
  it('la phrase écrite dans l’avis lui-même : chaque formule du § 4.5 se retrouve dans le texte du juriste', () => {
    expect(formuleDeLAvis('PAC / climatisation')).toMatch(/^Pour rappel, l'entretien d'une pompe à chaleur ou d'une climatisation de 4 à 70 kW doit être fait au moins tous les deux ans/);
    expect(formuleDeLAvis('Poêle, insert')).toMatch(/^Pour rappel, l'entretien d'un poêle ou d'un insert à bois ou à granulés doit être fait au moins tous les douze mois lorsqu'il est utilisé/);
  });
  it('dateEnLettres : « 1er » le premier du mois, jamais de fuseau', () => {
    expect(dateEnLettres('2028-03-01')).toBe('1er mars 2028');
    expect(dateEnLettres('2028-11-04')).toBe('4 novembre 2028');
    expect(dateEnLettres('2030-02-28')).toBe('28 février 2030');
    expect(dateEnLettres('')).toBe('');
    expect(dateEnLettres('pas une date')).toBe('');
  });
  it('Paramètres › Entretien dit les trois obligations (texte corrigé par la relecture du 4 nov., point 9)', () => {
    expect(AIDE_OBLIGATION_RAPPEL).toBe('La date conseillée est la vôtre (douze mois après la visite par défaut). Le rappel cite l’obligation d’entretien et son article seulement quand les données de l’appareil la rendent certaine : chaudière de 4 à 400 kW (une fois par année civile), pompe à chaleur ou climatisation de 4 à 70 kW hors contrat de performance énergétique (au moins tous les deux ans), poêle ou insert à bois ou à granulés (au moins tous les douze mois s’il est utilisé).');
  });
});

describe('entretien — TVA proposée (avis § 5.5) : une suggestion', () => {
  it('10 % dans un logement de plus de deux ans, y compris pour une chaudière gaz', () => {
    expect(tauxPropose({ categorie: 'chaudiere', logement_plus_2_ans: true, appareils: [{ energie: 'gaz' }] })).toBe(10);
  });
  it('5,5 % seulement si l’artisan déclare l’appareil éligible', () => {
    expect(tauxPropose({ categorie: 'chaudiere', logement_plus_2_ans: true, eligible_55: true })).toBe(5.5);
    expect(tauxPropose({ categorie: 'poele', logement_plus_2_ans: true, eligible_55: false })).toBe(10);
  });
  it('20 % hors logement de plus de deux ans ; jamais 5,5 % pour une climatisation en froid seul ; aucun en franchise', () => {
    expect(tauxPropose({ categorie: 'pac', logement_plus_2_ans: false, eligible_55: true })).toBe(20);
    expect(tauxPropose({ categorie: 'pac', logement_plus_2_ans: true, eligible_55: true, appareils: [{ type: 'clim' }] })).toBe(10);
    expect(tauxPropose({ categorie: 'chaudiere', logement_plus_2_ans: true }, { franchise: true })).toBe(0);
  });
  it('la ligne de facture porte l’adresse de l’installation et « immeuble achevé depuis plus de deux ans » au taux réduit', () => {
    // La case est cochée par l'artisan (D-38) : le brouillon ne la coche plus
    const l = ligneFacture({ ...chaudiere(), logement_plus_2_ans: true, numero: 'ENT-2026-00001', prix_ht: 120 });
    expect(l.tva).toBe(10);
    expect(l.prixUnitaire).toBe(120);
    expect(l.description).toContain('installation : 3 chemin de l’Exemple');
    expect(l.description).toContain('immeuble achevé depuis plus de deux ans');
    expect(l.description).toContain('ENT-2026-00001');
    const hors = ligneFacture({ ...chaudiere(), logement_plus_2_ans: false });
    expect(hors.tva).toBe(20);
    expect(hors.description).not.toContain('immeuble achevé');
    expect(ligneFacture(chaudiere(), { franchise: true }).tva).toBeUndefined();
  });
});

// D-38 (Hugo, 5 nov. 2026), décision 5 : la case « Logement achevé depuis plus de deux ans » n'est jamais cochée d'avance
describe('entretien — D-38 : « logement achevé depuis plus de deux ans » est un choix de l’artisan, jamais coché d’avance', () => {
  const maintenant = new Date('2026-11-04T10:00:00');
  it('un nouveau brouillon ne la coche pas : 20 % et aucune mention de l’âge du logement', () => {
    const b = nouveauBrouillon({ client, categorieValeur: 'chaudiere', maintenant });
    expect(b.logement_plus_2_ans).toBe(false);
    expect(tauxPropose(b)).toBe(20);
    const l = ligneFacture({ ...b, prix_ht: 120 });
    expect(l.tva).toBe(20);
    expect(l.description).not.toContain('immeuble achevé');
  });
  it('contre-essai : cochée par l’artisan, le taux réduit et la mention reviennent', () => {
    const b = { ...nouveauBrouillon({ client, categorieValeur: 'chaudiere', maintenant }), logement_plus_2_ans: true, prix_ht: 120 };
    expect(tauxPropose(b)).toBe(10);
    const l = ligneFacture(b);
    expect(l.tva).toBe(10);
    expect(l.description).toContain('immeuble achevé depuis plus de deux ans');
  });
  it('sans la case, même un appareil déclaré éligible reste à 20 % (pas de 5,5 % ni de mention)', () => {
    const b = { ...nouveauBrouillon({ client, categorieValeur: 'chaudiere', maintenant }), eligible_55: true };
    expect(tauxPropose(b)).toBe(20);
    expect(ligneFacture(b).description).not.toContain('immeuble achevé');
  });
  it('l’an dernier n’est pas repris : l’attestation précédente la cochait, la nouvelle ne l’est pas', () => {
    const precedent = { ...chaudiere(), id: 'e0', realise_le: '2025-11-02T10:00:00', logement_plus_2_ans: true };
    const b = nouveauBrouillon({ client, precedent, maintenant });
    expect(b.logement_plus_2_ans).toBe(false);
    expect(tauxPropose(b)).toBe(20);
  });
  it('la base reçoit « faux » quand la valeur manque (avant : « vrai » par défaut, 10 % sans que l’artisan ait choisi)', () => {
    const ligne = (o) => FIELD_MAPPINGS.entretiens.toSupabase({ id: 'e1', appareil_ref: 'a1', categorie: 'chaudiere', realise_le: '2026-11-04T10:00:00', prochain_avant: '2027-11-04', ...o });
    expect(ligne({}).logement_plus_2_ans).toBe(false);
    expect(ligne({ logement_plus_2_ans: undefined }).logement_plus_2_ans).toBe(false);
    expect(ligne({ logement_plus_2_ans: false }).logement_plus_2_ans).toBe(false);
    // Contre-essai : le choix de l'artisan passe
    expect(ligne({ logement_plus_2_ans: true }).logement_plus_2_ans).toBe(true);
  });
});

describe('entretien — champs obligatoires (annexes 3 et 5)', () => {
  it('une chaudière complète est enregistrable', () => {
    expect(manquants(chaudiere())).toEqual([]);
  });
  it('chaque élément « a minima » de l’annexe 5 manque s’il est vide (contre-essais)', () => {
    const cas = [
      [{ co_ppm: '' }, 'co_ppm'],
      [{ classe_energetique: '' }, 'classe_energetique'],
      [{ rendement: { evalue: '', reference: '94 %' } }, 'rendement'],
      [{ emissions: { evalue: '' } }, 'emissions'],
      [{ appareils_mesure: '' }, 'appareils_mesure'],
      [{ operations: '' }, 'operations'],
      [{ local: '' }, 'local'],
      [{ conseils: { usage: '', ameliorations: '', remplacement: '' } }, 'conseils'],
    ];
    for (const [modif, champ] of cas) {
      expect(manquants(chaudiere(modif)).map((x) => x.champ)).toContain(champ);
    }
    const sansPoint = chaudiere();
    sansPoint.appareils = [{ ...sansPoint.appareils[0], points: {} }];
    expect(manquants(sansPoint).map((x) => x.champ)).toContain('appareil0-points');
    const sansEvacuation = chaudiere();
    sansEvacuation.appareils = [{ ...sansEvacuation.appareils[0], evacuation: '' }];
    expect(manquants(sansEvacuation).map((x) => x.champ)).toContain('appareil0-evacuation');
  });
  it('la puissance et le numéro de série restent facultatifs (« si possible »)', () => {
    expect(manquants(chaudiere({ puissance_kw: '' }))).toEqual([]);
  });
  it('chaudière bois : température des fumées exigée, pas de norme NF X50 à décrire', () => {
    const e = chaudiere({ operations: '' });
    e.appareils = [{ ...e.appareils[0], energie: 'bois_buches', points: { 'solide.decendrage': true } }];
    expect(manquants(e).map((x) => x.champ)).toEqual(['mesures']);
    expect(manquants({ ...e, mesures: { temperature_fumees: '180 °C' } })).toEqual([]);
  });
  it('PAC : étanchéité, fluide, défauts et actions exigés', () => {
    const b = nouveauBrouillon({ client, categorieValeur: 'pac', maintenant: new Date('2026-11-04T10:00:00') });
    const pac = {
      ...b, local: 'Garage', intervenant_nom: 'P', appareils_mesure: 'Manomètres X',
      appareils: [{ ...b.appareils[0], type: 'air_eau', marque: 'M', modele: 'X', fluide: 'R32', points: { 'generateur.tensions': true } }],
      mesures: { resultats: 'Tensions 230 V' }, etancheite: 'controle', defauts: 'Aucun', actions: 'Aucune', conseils: { choix: ['fluide'], texte: '' },
    };
    expect(manquants(pac)).toEqual([]);
    expect(manquants({ ...pac, etancheite: '' }).map((x) => x.champ)).toContain('etancheite');
    expect(manquants({ ...pac, defauts: '' }).map((x) => x.champ)).toContain('defauts');
    const sansFluide = { ...pac, appareils: [{ ...pac.appareils[0], fluide: '' }] };
    expect(manquants(sansFluide).map((x) => x.champ)).toContain('appareil0-fluide');
  });
  it('poêle : marque et modèle « lorsqu’elles sont disponibles », points et conseils exigés', () => {
    const b = nouveauBrouillon({ client, categorieValeur: 'poele', maintenant: new Date('2026-11-04T10:00:00') });
    const poele = { ...b, local: 'Salon', intervenant_nom: 'P', appareils_mesure: '',
      appareils: [{ ...b.appareils[0], energie: 'granules', points: { 'commun.decendrage': true } }], conseils: { choix: ['stockage'], texte: '' } };
    expect(manquants(poele)).toEqual([]);
    expect(manquants({ ...poele, conseils: { choix: [], texte: '' } }).map((x) => x.champ)).toContain('conseils');
  });
  it('appareils de mesure : facultatifs pour un poêle (annexe 3 de l’arrêté du 20 juil. 2023), exigés pour une PAC', () => {
    const b = nouveauBrouillon({ client, categorieValeur: 'pac', maintenant: new Date('2026-11-04T10:00:00') });
    expect(manquants({ ...b, appareils_mesure: '' }).map((x) => x.champ)).toContain('appareils_mesure');
  });
  it('classe énergétique « Non déterminée » : acceptée pour le bois ou à 70 kW et plus, refusée pour le gaz de moins de 70 kW', () => {
    expect(manquants(chaudiere({ classe_energetique: 'Non déterminée' })).map((x) => x.champ)).toContain('classe_energetique');
    expect(manquants(chaudiere({ classe_energetique: 'Non déterminée', puissance_kw: '80' }))).toEqual([]);
    const bois = chaudiere({ classe_energetique: 'Non déterminée', operations: '', mesures: { temperature_fumees: '180 °C' } });
    bois.appareils = [{ ...bois.appareils[0], energie: 'bois_buches', points: { 'solide.decendrage': true } }];
    expect(manquants(bois)).toEqual([]);
  });
});

describe('entretien — points contrôlés selon l’appareil', () => {
  it('les points granulés n’apparaissent que pour un poêle à granulés ; ceux du solide pour une chaudière bois', () => {
    expect(groupesPoints('poele', { energie: 'granules' }).map((g) => g.cle)).toContain('granules');
    expect(groupesPoints('poele', { energie: 'bois_buches' }).map((g) => g.cle)).not.toContain('granules');
    expect(groupesPoints('chaudiere', { energie: 'gaz' }).map((g) => g.cle)).not.toContain('solide');
    expect(groupesPoints('chaudiere', { energie: 'charbon' }).map((g) => g.cle)).toContain('solide');
    expect(groupesPoints('pac', { type: 'air_air' }).map((g) => g.cle)).toEqual(['generateur', 'aero', 'air', 'regulation']);
  });
  it('seuls les points cochés sont listés, dans l’ordre de l’annexe', () => {
    const p = pointsCoches('chaudiere', { energie: 'gaz', points: { 'regulation.sondes': true, 'boucle.pression': true, 'boucle.purge': false } });
    expect(p.map((x) => x.cle)).toEqual(['boucle.pression', 'regulation.sondes']);
  });
  it('valeurs de référence des émissions du tableau 8', () => {
    expect(referenceEmissions('gaz')).toContain('35 mg / kWh');
    expect(referenceEmissions('fioul')).toContain('90 mg / kWh');
    expect(referenceEmissions('granules')).toContain('COV : 10');
    expect(referenceEmissions('bois_buches')).toContain('COV : 55');
  });
});

describe('entretien — brouillon repris de l’an dernier, historique, rappels', () => {
  const precedent = { ...chaudiere(), id: 'e0', numero: 'ENT-2025-00001', realise_le: '2025-11-02T10:00:00', prix_ht: 110 };
  it('reprend l’appareil, le lieu, les appareils de mesure et le prix ; jamais la mesure, les points ni les conseils', () => {
    const b = nouveauBrouillon({ client, precedent, dernierRamonage: '2026-09-01', maintenant: new Date('2026-11-04T10:00:00') });
    expect(b.appareil_ref).toBe(precedent.appareil_ref);
    expect(b.appareils[0].marque).toBe('Exemplair');
    expect(b.appareils[0].points).toEqual({});
    expect(b.co_ppm).toBe('');
    expect(b.conseils.usage).toBe('');
    expect(b.appareils_mesure).toBe('Analyseur Exemple A1');
    expect(b.dernier_entretien).toBe('2025-11-02');
    expect(b.dernier_ramonage).toBe('2026-09-01');
    expect(b.prix_ht).toBe(110);
  });
  it('rappel dû à partir de « date conseillée − délai », jamais pour un client qui a refusé ni après un rappel fait', () => {
    const e = { id: 'e1', client_id: 'c1', appareil_ref: 'a1', realise_le: '2026-11-04T10:00:00', prochain_avant: '2027-11-04' };
    expect(rappelsDus([e], [client], { aujourdhui: '2027-10-04' })).toHaveLength(0);
    expect(rappelsDus([e], [client], { aujourdhui: '2027-10-05' })).toHaveLength(1);
    expect(rappelsDus([e], [{ ...client, rappels_refuses_le: '2027-01-01' }], { aujourdhui: '2027-10-05' })).toHaveLength(0);
    expect(rappelsDus([{ ...e, rappel_fait_le: '2027-10-05' }], [client], { aujourdhui: '2027-10-06' })).toHaveLength(0);
    // Le dernier entretien de l'appareil compte, pas un plus ancien
    const ancien = { ...e, id: 'e0', realise_le: '2025-11-04T10:00:00', prochain_avant: '2026-11-04' };
    expect(rappelsDus([ancien, e], [client], { aujourdhui: '2026-10-20' })).toHaveLength(0);
  });
  it('historique par appareil et entretien précédent, annulées écartées', () => {
    const a = { id: 'x1', client_id: 'c1', appareil_ref: 'a1', realise_le: '2025-11-01T10:00:00' };
    const b = { id: 'x2', client_id: 'c1', appareil_ref: 'a1', realise_le: '2026-11-01T10:00:00', annulee_le: '2026-11-01T11:00:00' };
    const c = { id: 'x3', client_id: 'c1', appareil_ref: 'a1', realise_le: '2026-11-02T10:00:00' };
    expect(appareilsDuClient([a, b, c], 'c1')[0].dernier.id).toBe('x3');
    expect(entretienPrecedent([a, b, c], c).id).toBe('x1');
  });
  it('numéro de démo à la suite', () => {
    expect(numeroEntretienDemo([{ numero: 'ENT-2026-00004' }], new Date('2026-06-01'))).toBe('ENT-2026-00005');
  });
});

describe('entretien — corrections de la relecture juriste-btp du 4 nov. 2026', () => {
  it('aucune référence COV inventée pour le charbon (tableau 8 : bûches et granulés seulement)', () => {
    expect(referenceEmissions('charbon')).toBe('Poussières : 30 mg / Nm³ à 10 % d’O2');
    expect(referenceEmissions('charbon')).not.toContain('COV');
  });
  it('pas de 5,5 % pour une chaudière au charbon (pas une énergie renouvelable)', () => {
    expect(tauxPropose({ categorie: 'chaudiere', logement_plus_2_ans: true, eligible_55: true, appareils: [{ energie: 'charbon' }] })).toBe(10);
    expect(tauxPropose({ categorie: 'chaudiere', logement_plus_2_ans: true, eligible_55: true, appareils: [{ energie: 'granules' }] })).toBe(5.5);
  });
  it('pas de phrase d’obligation pour un poêle « autre biomasse » ou hydraulique (statut non tranché)', () => {
    expect(obligationConnue({ categorie: 'poele', appareils: [{ energie: 'granules' }] })).toBe(true);
    expect(obligationConnue({ categorie: 'poele', appareils: [{ energie: 'autre_biomasse' }] })).toBe(false);
    expect(obligationConnue({ categorie: 'poele', appareils: [{ energie: 'bois_buches', hydraulique: true }] })).toBe(false);
  });
  it('chaudière automatique à combustible solide : O2 et CO2 exigés', () => {
    const e = chaudiere({ operations: '', mesures: { temperature_fumees: '180 °C' } });
    e.appareils = [{ ...e.appareils[0], energie: 'granules', points: { 'solide.alimentation': true } }];
    expect(manquants(e).map((x) => x.champ)).toEqual(['mesures_o2']);
    expect(manquants({ ...e, mesures: { temperature_fumees: '180 °C', o2_co2: 'O2 8 %, CO2 12 %' } })).toEqual([]);
  });
  it('« climatisation » pour un appareil en froid seul, « entretenue » pour une pompe à chaleur', () => {
    expect(nomAppareil({ categorie: 'pac', appareils: [{ type: 'clim' }] })).toBe('climatisation');
    const sms = texteSms({ entreprise: { nom: 'X' }, entretien: { categorie: 'pac', appareils: [{ type: 'air_eau' }], realise_le: '2026-11-04T10:00:00', prochain_avant: '2027-11-04' }, aujourdhui: '2027-10-10' });
    expect(sms).toContain('votre pompe à chaleur');
    expect(sms).toContain('qui l’a entretenue');
  });
});
