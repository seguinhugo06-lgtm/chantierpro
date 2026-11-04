import { describe, it, expect } from 'vitest';
import {
  echeanceLegale, prochainParDefaut, apresEcheance, limiteRemise, niveauCO, PHRASES_CO, obligationConnue, phraseObligation,
  tauxPropose, manquants, nouveauBrouillon, groupesPoints, pointsCoches, ligneFacture, rappelsDus, texteSms,
  referenceEmissions, numeroEntretienDemo, appareilsDuClient, entretienPrecedent,
} from '../entretien';

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
  it('PAC : « au moins tous les deux ans », jamais « annuel »', () => {
    const p = phraseObligation({ categorie: 'pac', puissance_kw: 8, realise_le: '2026-11-04T10:00:00' });
    expect(p).toContain('au moins tous les deux ans');
    expect(p).toContain('4 novembre 2028');
    expect(p).not.toMatch(/annuel/);
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
    const l = ligneFacture({ ...chaudiere(), numero: 'ENT-2026-00001', prix_ht: 120 });
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
    const poele = { ...b, local: 'Salon', intervenant_nom: 'P', appareils_mesure: 'Sans mesure : contrôle visuel',
      appareils: [{ ...b.appareils[0], energie: 'granules', points: { 'commun.decendrage': true } }], conseils: { choix: ['stockage'], texte: '' } };
    expect(manquants(poele)).toEqual([]);
    expect(manquants({ ...poele, conseils: { choix: [], texte: '' } }).map((x) => x.champ)).toContain('conseils');
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
