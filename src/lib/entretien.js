/**
 * Attestation d'entretien d'une chaudière, d'une pompe à chaleur (ou climatisation) ou d'un poêle / insert, avec le
 * rappel du prochain entretien (lot métier n° 2, décision D-33). Logique pure, sans React ni Supabase : testée dans
 * src/lib/__tests__/entretien.test.js.
 *
 * Toutes les règles viennent de l'avis juriste-btp du 4 nov. 2026, lu au texte (docs/metiers/avis-juriste-2026-11-04-
 * entretien.md, errata compris) :
 *   - chaudière 4-400 kW : C. env. R. 224-41-4 à -9, arrêté du 15 sept. 2009 (annexes 1 à 5) ;
 *   - système thermodynamique 4-70 kW : C. env. R. 224-42 à R. 224-44-5, arrêté du 24 juil. 2020 (annexes 1 à 3) ;
 *   - foyer fermé à combustible solide : CSP R. 1331-66 à -78, arrêté du 20 juil. 2023 (annexes 1 à 3).
 * Les libellés des points contrôlés et des conseils sont recopiés des annexes. Rien n'est calculé que le texte ne fixe :
 * rendement, émissions et classe énergétique sont saisis par l'artisan (tableaux 1, 2, 4 et 5 non relus au fac-similé).
 */
import { jourLocal, ajouterMois, dateLue } from './dates';
import { nomImprime } from './identiteEntreprise';
import { estClientParticulier } from './retractation';

const liste = (paires) => paires.map(([valeur, libelle]) => ({ valeur, libelle }));
export const libelleDe = (options, valeur) => options.find((o) => o.valeur === valeur)?.libelle || '';

// ── Catégories ────────────────────────────────────────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  {
    valeur: 'chaudiere', libelle: 'Chaudière', court: 'chaudière',
    titre: 'Attestation d’entretien de chaudière',
    texte: 'Article R. 224-41-8 du code de l’environnement ; arrêté du 15 septembre 2009, annexe 5',
    // Avis § 7.1, 7
    pied: 'À conserver au moins deux ans et à tenir à la disposition des agents chargés du contrôle (article R. 224-41-8 du code de l’environnement).',
    delaiAttestation: 'établie dans les quinze jours suivant la visite, puis remise au commanditaire (article R. 224-41-8 du code de l’environnement)',
  },
  {
    valeur: 'pac', libelle: 'Pompe à chaleur ou climatisation', court: 'pompe à chaleur',
    titre: 'Attestation d’entretien de pompe à chaleur ou de climatisation',
    texte: 'Article R. 224-44-4 du code de l’environnement ; arrêté du 24 juillet 2020, annexe 3',
    // Sans durée : aucune n'est fixée pour le client (R. 224-44-4)
    pied: 'À tenir à la disposition des agents chargés du contrôle (article R. 224-44-4 du code de l’environnement).',
    delaiAttestation: 'établie dans les quinze jours suivant la visite, puis remise au commanditaire (article R. 224-44-4 du code de l’environnement)',
  },
  {
    valeur: 'poele', libelle: 'Poêle ou insert (bois, granulés)', court: 'poêle ou insert',
    titre: 'Attestation d’entretien de poêle ou d’insert',
    texte: 'Article R. 1331-75 du code de la santé publique ; arrêté du 20 juillet 2023, annexe 3',
    pied: 'À conserver au moins deux ans et à tenir à la disposition des agents chargés du contrôle (article R. 1331-75 du code de la santé publique).',
    delaiAttestation: 'remise dans les quinze jours ouvrés suivant l’achèvement de l’opération (article R. 1331-75 du code de la santé publique)',
  },
];
export const categorie = (valeur) => CATEGORIES.find((c) => c.valeur === valeur) || null;

// ── Identification de l'appareil ──────────────────────────────────────────────────────────────────────────────────
export const ENERGIES = {
  chaudiere: liste([['gaz', 'Gaz'], ['fioul', 'Fioul'], ['bois_buches', 'Bois (bûches)'], ['granules', 'Granulés'],
    ['bois_dechiquete', 'Bois déchiqueté'], ['charbon', 'Charbon ou autre solide']]),
  pac: liste([['electricite', 'Électricité'], ['gaz', 'Gaz (PAC à absorption)']]),
  poele: liste([['bois_buches', 'Bois (bûches)'], ['granules', 'Granulés'], ['plaquettes', 'Plaquettes'], ['autre_biomasse', 'Autre biomasse']]),
};
export const TYPES_POELE = liste([['poele', 'Poêle'], ['insert', 'Insert'], ['foyer_ferme', 'Foyer fermé'], ['cuisiniere', 'Cuisinière']]);
// Un chauffe-eau thermodynamique d'un seul logement est hors du champ (R. 224-44) : il n'est pas proposé
export const TYPES_PAC = liste([['air_eau', 'PAC air/eau'], ['eau_eau', 'PAC eau/eau ou géothermie'], ['air_air', 'PAC air/air ou climatisation réversible'],
  ['clim', 'Climatisation (froid seul)']]);
export const TECHNOLOGIES_CHAUDIERE = liste([['standard', 'Standard'], ['basse_temperature', 'Basse température'], ['condensation', 'Condensation'],
  ['solide', 'Combustible solide']]);
export const EVACUATIONS = liste([['cheminee', 'Conduit de fumée (tirage naturel)'], ['ventouse', 'Ventouse'], ['vmc_gaz', 'VMC gaz'], ['autre', 'Autre']]);
// Arrêté du 15 sept. 2009, art. 1er : classification par l'intervenant seulement pour un combustible liquide ou gazeux de
// moins de 70 kW (tableau 12) ; sinon (bois, charbon, 70 kW ou plus, sans étiquette) « Non déterminée » (juriste-btp, 4 nov.)
export const CLASSES = [...liste(['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => [c, c])), { valeur: 'Non déterminée', libelle: 'Non déterminée (chaudière non étiquetée, hors tableau 12)' }];

export const estSolide = (energie) => ['bois_buches', 'granules', 'bois_dechiquete', 'charbon', 'plaquettes', 'autre_biomasse'].includes(energie);
const estGranules = (energie) => energie === 'granules';
export const estGazFioul = (energie) => ['gaz', 'fioul'].includes(energie);

// ── Points contrôlés (annexes 1, recopiées) ───────────────────────────────────────────────────────────────────────
const point = (cle, libelle) => ({ cle, libelle });

// Arrêté du 15 sept. 2009, annexe 1, § 3 (solide) ; la mesure du CO a son propre champ
const CHAUDIERE_SOLIDE = [
  point('surfaces', 'Nettoyage des surfaces d’échange'),
  point('verification', 'Vérification complète de l’appareil'),
  point('regulation_solide', 'Contrôle de la régulation, si existante'),
  point('raccordement', 'Contrôle du raccordement et de l’étanchéité du conduit d’évacuation des produits de combustion'),
  point('securite', 'Vérification des organes de sécurité'),
  point('joints', 'Vérification de l’état des joints'),
  point('ventilateur', 'Nettoyage du ventilateur, si existant'),
  point('alimentation', 'Vérification du système d’alimentation automatique (pour les chaudières automatiques uniquement)'),
  point('decendrage', 'Décendrage approfondi'),
];
// § 6 (boucle d'eau) et § 7 (régulation), pour toutes les chaudières
const CHAUDIERE_BOUCLE = [
  point('embouement', 'Contrôle de l’embouement'),
  point('purge', 'Purge des bulles d’air du circuit lorsque le purgeur est fonctionnel et accessible'),
  point('pression', 'Contrôle de la pression'),
  point('circulateur', 'Vérification du fonctionnement du circulateur'),
  point('vase', 'Contrôle de la pression de gonflage des vases d’expansion avec regonflage si nécessaire'),
];
const REGULATION = [
  point('regulation_presence', 'Vérification de la présence ou non d’un système de régulation automatique de la température de chauffage'),
  point('depart_eau', 'Vérification de la température de départ d’eau via un équipement d’affichage ou de mesure présent sur l’installation, le cas échéant'),
  point('sondes', 'Vérification du fonctionnement des sondes de température, le cas échéant'),
  point('robinets', 'Vérification du positionnement et du fonctionnement des robinets thermostatiques, le cas échéant'),
  point('programmation', 'Vérification de la mise en place d’une programmation horaire cohérente selon les modes disponibles et en adéquation avec les usages du bâtiment, le cas échéant'),
  point('coherence_depart', 'Vérification de la cohérence de la température de départ d’eau selon les modes disponibles, le cas échéant'),
];
// Arrêté du 24 juil. 2020, annexe 1
const PAC_GENERATEUR = [
  point('temperatures', 'Relevé des températures de l’unité intérieure et de l’unité extérieure et vérification du bon fonctionnement'),
  point('inversion', 'Vérification du fonctionnement de l’inversion de cycle lorsque c’est possible'),
  point('appoints', 'Vérification de l’enclenchement des appoints'),
  point('tensions', 'Mesure des tensions électriques statiques et dynamiques'),
];
const PAC_AERO = [
  point('echangeur_ext', 'Vérification de l’échangeur de l’unité extérieure et nettoyage si nécessaire'),
  point('unite_int', 'Nettoyage et décrassage de l’unité intérieure et du filtre'),
];
const PAC_BOUCLE = [
  point('embouement', 'Contrôle de l’embouement lié au phénomène d’hydrolyse'),
  point('purge', 'Purge des bulles d’air du circuit lorsque le purgeur est fonctionnel et accessible'),
  point('pression', 'Contrôle de la pression'),
  point('circulateurs', 'Vérification du fonctionnement des circulateurs'),
  point('filtre_eau', 'Vérification et nettoyage du filtre sur la boucle d’eau si nécessaire'),
  point('vase', 'Contrôle de la pression de gonflage des vases d’expansion avec regonflage si nécessaire'),
];
const PAC_AIR = [
  point('gaines', 'Vérification de l’état des gaines accessibles'),
  point('unite_int_air', 'Vérification et nettoyage avec désinfection si nécessaire de l’unité intérieure et du filtre'),
  point('ventilateur', 'Vérification du fonctionnement du ventilateur'),
];
// Arrêté du 20 juil. 2023, annexe 1
const POELE_COMMUN = [
  point('raccordement', 'Vérification du conduit de raccordement, et le cas échéant son nettoyage'),
  point('surfaces', 'Nettoyage des surfaces d’échange'),
  point('terminal', 'Vérification du débouché du terminal d’évacuation'),
  point('air_comburant', 'Inspection et nettoyage des amenées d’air comburant'),
  point('ventilateur', 'Nettoyage du ventilateur (si présent) et des éléments aérauliques (passages d’air, grilles)'),
  point('usure', 'Vérification et remplacement éventuel des pièces d’usure (joints et bougies d’allumage le cas échéant, selon les prescriptions du constructeur), des trappes d’accès ou de tout élément amovible'),
  point('pressostat', 'Vérification des organes de sécurité du dispositif de chauffage (si présent) : vérifier le pressostat'),
  point('arret_auto', 'Vérification des organes de sécurité du dispositif de chauffage (si présent) : vérifier l’arrêt automatique de l’appareil notamment en cas de dépassement de la limite haute de température'),
  point('regulation', 'Vérification des organes de sécurité du dispositif de chauffage (si présent) : vérifier le bon fonctionnement de la régulation (alimentation, ventilation)'),
  point('alimentation', 'Vérification et nettoyage du circuit d’alimentation en combustible (si concerné)'),
  point('extracteur', 'Nettoyage, vérification et réglage de l’extracteur de fumée (si concerné)'),
  point('electrique', 'Vérification des connexions électriques (si concerné)'),
  point('decendrage', 'Décendrage approfondi'),
];
const POELE_HYDRAULIQUE = [
  point('circulateur', 'Vérification du circulateur'),
  point('pression', 'Vérification de la pression hydraulique'),
  point('vase', 'Vérification du vase d’expansion et regonflage si nécessaire'),
  point('embouement', 'Contrôle de l’embouement du circuit hydraulique, et, le cas échéant, recommandation d’effectuer un désembouement'),
  point('pot_boue', 'Vidange du pot à boue (si présence d’un ballon hydro-accumulation)'),
  point('purge', 'Purge des bulles d’air du circuit hydraulique lorsque le purgeur est fonctionnel et accessible'),
];
const POELE_GRANULES = [
  point('puissance_defaut', 'Vérification de l’adéquation entre le niveau de puissance choisi par défaut sur l’appareil et les besoins en chauffage du logement, sauf si le dispositif de chauffage et les besoins en chauffage n’ont pas changé depuis le dernier entretien'),
  point('extraction_creuset', 'Vérification de l’adéquation des réglages du ventilateur d’extraction et si possible, du nombre et de la fréquence du nettoyage du creuset en fonction du combustible utilisé'),
];

/**
 * Les groupes de points à cocher pour un appareil, selon la catégorie, l'énergie et la distribution.
 * @returns {{ cle: string, titre: string, points: {cle, libelle}[] }[]}
 */
export function groupesPoints(categorieValeur, appareil = {}) {
  if (categorieValeur === 'chaudiere') {
    return [
      ...(estSolide(appareil.energie) ? [{ cle: 'solide', titre: 'Chaudière à combustible solide (annexe 1, § 3)', points: CHAUDIERE_SOLIDE }] : []),
      { cle: 'boucle', titre: 'Boucle d’eau (annexe 1, § 6)', points: CHAUDIERE_BOUCLE },
      { cle: 'regulation', titre: 'Régulation (annexe 1, § 7)', points: REGULATION },
    ];
  }
  if (categorieValeur === 'pac') {
    const aero = ['air_eau', 'air_air', 'clim'].includes(appareil.type);
    const air = ['air_air', 'clim'].includes(appareil.type);
    return [
      { cle: 'generateur', titre: 'Générateur de chaleur ou de froid (annexe 1, § 1)', points: PAC_GENERATEUR },
      ...(aero ? [{ cle: 'aero', titre: 'Système aérothermique (annexe 1, § 2)', points: PAC_AERO }] : []),
      ...(air ? [] : [{ cle: 'boucle', titre: 'Distribution par boucle d’eau (annexe 1, § 3)', points: PAC_BOUCLE }]),
      ...(air ? [{ cle: 'air', titre: 'Distribution par vecteur air (annexe 1, § 4)', points: PAC_AIR }] : []),
      { cle: 'regulation', titre: 'Système de pilotage (annexe 1, § 5)', points: REGULATION },
    ];
  }
  if (categorieValeur === 'poele') {
    return [
      { cle: 'commun', titre: 'Opérations d’entretien (annexe 1)', points: POELE_COMMUN },
      ...(appareil.hydraulique ? [{ cle: 'hydraulique', titre: 'Appareil raccordé à un circuit hydraulique', points: POELE_HYDRAULIQUE }] : []),
      ...(estGranules(appareil.energie) ? [{ cle: 'granules', titre: 'Appareil à granulés', points: POELE_GRANULES }] : []),
    ];
  }
  return [];
}

/** Les points cochés d'un appareil, dans l'ordre des annexes : { cle: groupe.point, libelle }. */
export function pointsCoches(categorieValeur, appareil = {}) {
  const coches = appareil.points || {};
  return groupesPoints(categorieValeur, appareil).flatMap((g) => g.points
    .filter((p) => coches[`${g.cle}.${p.cle}`])
    .map((p) => ({ cle: `${g.cle}.${p.cle}`, libelle: p.libelle, groupe: g.titre })));
}

// ── Monoxyde de carbone (arrêté du 15 sept. 2009, annexe 5, § 2 ; art. 3) ─────────────────────────────────────────
export const PHRASES_CO = {
  a: 'La situation est normale',
  b: 'Il y a anomalie de fonctionnement nécessitant impérativement des investigations complémentaires concernant le tirage du conduit de fumée et la ventilation du local',
  c: 'Il y a un danger grave et imminent nécessitant la mise à l’arrêt de la chaudière et la recherche du dysfonctionnement avant remise en service',
};
const nombre = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
/** a : moins de 10 ppm ; b : de 10 inclus à 50 exclu ; c : 50 ou plus. Sans mesure : null. */
export function niveauCO(ppm) {
  const n = nombre(ppm);
  if (n === null || n < 0) return null;
  if (n < 10) return 'a';
  return n < 50 ? 'b' : 'c';
}
/** Ce que l'intervenant doit dire à l'usager (art. 3), affiché à l'écran pendant la saisie. */
export const DEVOIR_CO = {
  b: 'Entre 10 et 50 ppm, la situation est anormale : vous devez informer l’usager que des investigations complémentaires concernant le tirage du conduit de fumée et la ventilation du local sont nécessaires (arrêté du 15 septembre 2009, article 3). Elles peuvent être faites pendant la visite, ou faire l’objet d’un devis.',
  c: 'À 50 ppm ou plus, le danger est grave et immédiat : vous devez enjoindre à l’usager de maintenir sa chaudière à l’arrêt jusqu’à sa remise en service dans les conditions normales de fonctionnement (arrêté du 15 septembre 2009, article 3).',
};

// ── Rendement, émissions, classe : modèles des tableaux 8 à 13 ────────────────────────────────────────────────────
export const SAUF_IMPOSSIBILITE = 'sauf impossibilité liée aux caractéristiques techniques de l’installation';
/** Référence du rendement (annexe 2, point 2) : texte du tableau 9, sans valeur chiffrée (saisie par l'artisan). */
export function referenceRendement(energie) {
  if (estSolide(energie)) return 'Rendement d’une chaudière 2009 utilisant le même combustible solide et de même type';
  return `Rendement d’une chaudière utilisant des combustibles ${energie === 'fioul' ? 'liquides' : 'gazeux'} à condensation de même puissance`;
}
/** Valeurs de référence des émissions, tableau 8 (lues sans symbole douteux). */
export function referenceEmissions(energie) {
  if (energie === 'gaz') return 'NOx : 35 mg / kWh à 0 % d’O2';
  if (energie === 'fioul') return 'NOx : 90 mg / kWh à 0 % d’O2';
  if (estSolide(energie)) {
    // Tableau 8 : 10 « pour les granulés de bois et le bois déchiqueté », 55 « pour les bois de bûches » ; rien pour le
    // charbon ou un autre solide (juriste-btp, 4 nov. 2026 : à vérifier, rien n'est imprimé)
    const cov = ['granules', 'bois_dechiquete'].includes(energie) ? '10' : energie === 'bois_buches' ? '55' : null;
    return `Poussières : 30 mg / Nm³ à 10 % d’O2${cov ? ` ; COV : ${cov} mg C3H8 / Nm³ à 10 % d’O2` : ''}`;
  }
  return '';
}
export const POLLUANTS = (energie) => (estSolide(energie) ? 'poussières et composés organiques volatils (COV)' : 'oxydes d’azote (NOx)');
/** Tableau 13, imprimé tel quel. */
export const TABLEAU_13 = [
  ['Bois', 'Chaudière bûche', 'C'], ['Bois', 'Chaudière granulé', 'A'], ['Electricité', 'PAC eau-eau', 'A + +/ A + + +'],
  ['Electricité', 'PAC air-eau', 'A +/ A + +'], ['Gaz', 'Chaudière condensation', 'A'], ['Gaz', 'Chaudière de type B1', 'C'],
  ['Combustible liquide', 'Chaudière condensation', 'A/ B'],
];

// ── Conseils ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Chaudière : les trois rubriques du tableau 11 (annexe 5), et sa phrase, mot pour mot. */
export const RUBRIQUES_CHAUDIERE = [
  { cle: 'usage', libelle: 'Conseils et recommandations portant sur le bon usage de l’installation de chauffage en place :' },
  { cle: 'ameliorations', libelle: 'Conseils et recommandations portant sur les améliorations possibles de l’ensemble de l’installation de chauffage :' },
  { cle: 'remplacement', libelle: 'Conseils et recommandations portant sur l’intérêt éventuel du remplacement du brûleur, de la chaudière, ou de l’installation de chauffage :' },
];
export const PHRASE_CONSEILS_CHAUDIERE = 'Les conseils et recommandations de la présente attestation sont donnés à titre indicatif et ont une valeur informative. Aucun investissement proposé par la personne ayant effectué l’entretien ne revêt un caractère obligatoire. Il s’agit de conseils et non de prescriptions ou d’injonctions de faire, sauf pour le cas où une teneur anormalement élevée en monoxyde de carbone est constatée.';
/**
 * PAC (arrêté du 24 juil. 2020, annexe 2) et poêle (arrêté du 20 juil. 2023, annexe 2), mot pour mot. Pour le poêle, la
 * mention « et sont conformes aux recommandations disponibles sur le site internet de l'ADEME » n'est pas imprimée : ces
 * recommandations n'ont pas été lues et le texte libre de l'artisan n'est pas vérifiable (juriste-btp, 4 nov. 2026).
 */
export const PHRASES_CONSEILS = {
  pac: 'Ces conseils sont inscrits sur l’attestation d’entretien, ils sont donnés à titre indicatif et ont une valeur informative. Aucun investissement proposé par la personne ayant effectué l’entretien ne revêt un caractère obligatoire. Il s’agit de conseils et non de prescriptions ou d’injonctions de faire.',
  poele: 'Ces conseils et recommandations sont joints à l’attestation d’entretien. Ils sont donnés à titre indicatif et ont une valeur informative. Aucun investissement proposé par la personne ayant effectué l’entretien ne revêt un caractère obligatoire. Il s’agit de conseils et non de prescriptions ou d’injonctions de faire.',
};
/** Sujets des conseils (annexe 2 de chaque arrêté), en cases ; un texte libre les complète. */
export const SUJETS_CONSEILS = {
  pac: liste([
    ['systeme', 'Le système thermodynamique'], ['fluide', 'Le fluide frigorigène'],
    ['regulation', 'Les systèmes de régulation et de contrôle de température, et l’intérêt d’une régulation automatique'],
    ['reseau', 'Le réseau de distribution : désembouage, rééquilibrage, isolation des réseaux'],
    ['emetteurs', 'L’adéquation des émetteurs avec le générateur'],
    ['apports', 'Les améliorations permettant d’optimiser les radiations solaires et les apports de chaleur internes'],
    ['usage_reel', 'L’adaptation à l’utilisation réelle du bâtiment'], ['besoins', 'La réduction des besoins de refroidissement et de chauffage'],
    ['fonctionnement', 'Le fonctionnement incorrect du système, des sous-systèmes ou des composants'],
    ['remplacement', 'Le remplacement du système, des sous-systèmes et des composants'],
  ]),
  poele: liste([
    ['emissions', 'L’utilisation de l’appareil, notamment vis-à-vis de ses émissions potentielles de polluants'],
    ['regulation', 'Les systèmes de régulation et de contrôle de température'],
    ['prevention', 'La prévention des risques sanitaires et des accidents de la vie courante'],
    ['ramonage', 'L’intérêt de renforcer la fréquence de ramonage en fonction de la consommation de bois'],
    ['stockage', 'Les conditions appropriées de stockage et d’utilisation des combustibles solides'],
    ['besoins_reels', 'L’adaptation aux besoins de chauffage réels du bâtiment'], ['reduction', 'La réduction des besoins de chauffage'],
    ['fonctionnement', 'Le fonctionnement incorrect du système, des sous-systèmes ou des composants'],
    ['remplacement', 'Le remplacement du système, des sous-systèmes et des composants, et les organismes de conseil et d’aides financières'],
    ['non_conformites', 'Les non-conformités de l’installation par rapport aux règles de l’art, facilement visibles'],
    ['reglementation_locale', 'La réglementation locale prise par le préfet (article L. 222-6 du code de l’environnement)'],
    ['inutilisation', 'L’intérêt de ramoner avant une période d’inutilisation prolongée'],
  ]),
};

// ── Dates : échéance légale et date conseillée (avis § 1.4, 2.4, 3.3, 7.5) ────────────────────────────────────────
export const jourDe = (horodatage) => jourLocal(horodatage ? new Date(horodatage) : new Date());

/**
 * Échéance légale du prochain entretien, d'après la date de la visite :
 *   chaudière : 31 décembre de l'année qui suit (« chaque année civile », R. 224-41-7) ;
 *   PAC : deux ans après (« ne peut pas excéder deux ans », R. 224-44-3) ;
 *   poêle : douze mois après (« au moins tous les douze mois », R. 1331-68).
 */
export function echeanceLegale(categorieValeur, realiseLe) {
  const jour = jourDe(realiseLe);
  if (!jour) return '';
  if (categorieValeur === 'chaudiere') return `${Number(jour.slice(0, 4)) + 1}-12-31`;
  if (categorieValeur === 'pac') return ajouterMois(jour, 24);
  if (categorieValeur === 'poele') return ajouterMois(jour, 12);
  return '';
}
/** Date conseillée par défaut : douze mois après la visite (l'artisan la change ; 24 mois possible pour une PAC). */
export const prochainParDefaut = (realiseLe, mois = 12) => ajouterMois(jourDe(realiseLe), mois);
/** La date conseillée dépasse l'échéance légale : alerte non bloquante. */
export const apresEcheance = (prochain, echeance) => !!(prochain && echeance && String(prochain) > String(echeance));

/** Ouvrés : du lundi au vendredi (les jours fériés ne sont pas connus de l'app : délai indicatif). */
function ajouterJoursOuvres(jour, n) {
  const d = dateLue(jour);
  let reste = n;
  while (reste > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) reste -= 1;
  }
  return jourLocal(d);
}
/** Dernier jour pour remettre l'attestation : 15 jours (chaudière, PAC), 15 jours ouvrés (poêle, hors jours fériés). */
export function limiteRemise(categorieValeur, realiseLe) {
  const jour = jourDe(realiseLe);
  if (!jour) return '';
  if (categorieValeur === 'poele') return ajouterJoursOuvres(jour, 15);
  const d = dateLue(jour);
  d.setDate(d.getDate() + 15);
  return jourLocal(d);
}

// ── L'obligation : connue seulement si ses conditions le sont (avis § 4.1, 4.2, 4.5) ──────────────────────────────
/**
 * L'app peut-elle énoncer l'obligation légale pour cet entretien ?
 *   chaudière : puissance connue, de 4 à 400 kW ;
 *   PAC : puissance du système connue, de 4 à 70 kW, et pas de contrat de performance énergétique (R. 224-43) ;
 *   poêle : foyer fermé à combustible solide (seul proposé) ; la phrase dit « lorsqu'il est utilisé ».
 */
export function obligationConnue(e) {
  const p = nombre(e?.puissance_kw);
  if (e?.categorie === 'chaudiere') return p !== null && p >= 4 && p <= 400;
  if (e?.categorie === 'pac') return p !== null && p >= 4 && p <= 70 && !e?.contrat_performance;
  // Poêle : la phrase dit « à bois ou à granulés » ; un appareil « autre biomasse » ou hydraulique (poêle ou chaudière ?
  // non tranché) ne la reçoit pas
  return e?.categorie === 'poele' && !(e.appareils || []).some((a) => a?.energie === 'autre_biomasse' || a?.hydraulique);
}

/** Le nom de l'appareil dans les messages : « chaudière », « pompe à chaleur », « climatisation », « poêle ou insert ». */
export function nomAppareil(e) {
  if (e?.categorie === 'pac') return e?.appareils?.[0]?.type === 'clim' ? 'climatisation' : 'pompe à chaleur';
  return categorie(e?.categorie)?.court || 'appareil';
}

const dateFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR') : '');

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/**
 * « 4 novembre 2028 », « 1er mars 2028 » depuis « AAAA-MM-JJ ». Calculé sur la chaîne, sans `Date` : ni l'horloge ni le
 * fuseau de l'appareil n'y changent rien. Même texte côté serveur (supabase/functions/send-scheduled-relances/entretien.ts).
 */
export function dateEnLettres(jour) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(jour || ''));
  if (!m) return '';
  const j = Number(m[3]);
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois || j < 1 || j > 31) return '';
  return `${j === 1 ? '1er' : j} ${mois} ${m[1]}`;
}

/**
 * La phrase d'obligation des rappels (avis juriste-btp du 4 nov. 2026, § 4.5, mot pour mot), ou '' si ses conditions ne
 * sont pas connues (`obligationConnue`). Décision D-38 (Hugo, 5 nov. 2026) : pour la chaudière, la PAC ou climatisation
 * et le poêle ou insert (en v3, la chaudière seule, dans l'attente de cette décision). Jamais la date conseillée
 * présentée comme une échéance légale : la chaudière donne le 31 décembre de l'année suivante, la PAC la visite + 2 ans.
 * La chaudière garde ses apostrophes typographiques ; la PAC et le poêle, les caractères du fichier de l'avis.
 */
export function phraseObligation(e) {
  if (!obligationConnue(e)) return '';
  if (e.categorie === 'chaudiere') {
    return `Pour rappel, l’entretien d’une chaudière doit être fait une fois par année civile (article R. 224-41-7 du code de l’environnement) : le prochain doit avoir lieu au plus tard le 31 décembre ${Number(jourDe(e.realise_le).slice(0, 4)) + 1}.`;
  }
  if (e.categorie === 'pac') {
    return `Pour rappel, l'entretien d'une pompe à chaleur ou d'une climatisation de 4 à 70 kW doit être fait au moins tous les deux ans (article R. 224-44-3 du code de l'environnement) : le prochain doit avoir lieu au plus tard le ${dateEnLettres(echeanceLegale('pac', e.realise_le))}.`;
  }
  if (e.categorie === 'poele') {
    return "Pour rappel, l'entretien d'un poêle ou d'un insert à bois ou à granulés doit être fait au moins tous les douze mois lorsqu'il est utilisé (article R. 1331-68 du code de la santé publique).";
  }
  return '';
}

// ── Aides de la saisie : puissance de la chaudière, système de PAC (avis du 4 nov. 2026, § 2.1 et erratum 5) ─────────
/** Code de l'environnement, R. 224-20, 1°, alinéa 2 (en vigueur depuis le 12/06/2009), mot pour mot : erratum 5 de l'avis. */
export const TEXTE_CHAUDIERES_EN_RESEAU = "Lorsque plusieurs chaudières sont mises en réseau dans un même local, l'ensemble est considéré comme une seule chaudière, dont la puissance nominale est égale à la somme des puissances nominales des chaudières du réseau et dont la date d'installation est celle de la chaudière la plus ancienne.";
export const LIBELLE_PUISSANCE_CHAUDIERE = 'Puissance nominale, en kW (chaudières en réseau dans le même local : la somme de leurs puissances, article R. 224-20 du code de l’environnement)';
/**
 * D-38 (Hugo, 5 nov. 2026), décision 4 : des chaudières en réseau dans un même local forment une seule chaudière, avec une
 * attestation pour l'ensemble. La citation est celle de l'erratum 5 ; le reste de l'aide est à relire par le juriste.
 */
export const AIDE_PUISSANCE_CHAUDIERE = `Si elle est connue, le rappel peut citer l’obligation d’entretien et son article. Plusieurs chaudières en réseau dans un même local forment une seule chaudière (article R. 224-20, 1°, alinéa 2, du code de l’environnement) : faites une seule attestation pour l’ensemble, avec la somme de leurs puissances. Décrivez les autres chaudières du réseau dans les observations. Le texte : « ${TEXTE_CHAUDIERES_EN_RESEAU} »`;
/** Aide des « autres machines » d'une PAC (relecture juriste-btp du 4 nov. 2026, point 5) : R. 224-42, 1°, machines thermodynamiques seulement. */
export const AIDE_SYSTEME_PAC = 'Toutes les machines thermodynamiques (pompes à chaleur, climatisations) qui chauffent ou refroidissent le même bâtiment forment un seul système, dont la puissance est la somme de leurs puissances (article R. 224-42, 1° du code de l’environnement) : une attestation pour le système.';

/** Paramètres → Entretien : ce que le rappel dit de l'obligation (texte de la relecture juriste-btp du 4 nov. 2026, point 9). */
export const AIDE_OBLIGATION_RAPPEL = 'La date conseillée est la vôtre (douze mois après la visite par défaut). Le rappel cite l’obligation d’entretien et son article seulement quand les données de l’appareil la rendent certaine : chaudière de 4 à 400 kW (une fois par année civile), pompe à chaleur ou climatisation de 4 à 70 kW hors contrat de performance énergétique (au moins tous les deux ans), poêle ou insert à bois ou à granulés (au moins tous les douze mois s’il est utilisé).';
// Recommandée par juriste-btp (aucun texte ne l'exige ; avis § 4.5, question 6) : elle écarte toute impression de mandat
export const PHRASE_LIBRE_CHOIX = 'Vous restez libre de confier cet entretien au professionnel qualifié de votre choix.';

/** Le SMS de rappel (avis § 4.5 pour la chaudière ; même forme sans obligation sinon). */
export function texteSms({ entreprise, entretien, aujourdhui = jourLocal() }) {
  const qui = [nomImprime(entreprise), entreprise?.tel || entreprise?.telephone].filter(Boolean).join(', ');
  const verbe = String(entretien?.prochain_avant || '') < aujourdhui ? 'était conseillé avant le' : 'est à prévoir avant le';
  const obligation = entretien?.categorie === 'chaudiere' && obligationConnue(entretien)
    ? ' Il est à faire une fois par année civile (art. R. 224-41-7 du code de l’environnement).' : '';
  const participe = entretien?.categorie === 'poele' ? 'entretenu' : 'entretenue';
  return `Bonjour, l’entretien de votre ${nomAppareil(entretien)} ${verbe} ${dateFr(entretien?.prochain_avant)}.${obligation} `
    + `${qui}${qui ? ', ' : ''}qui l’a ${participe} le ${dateFr(jourDe(entretien?.realise_le))}. Pour ne plus recevoir de rappel, répondez STOP.`;
}

// ── TVA proposée (avis § 5.5, 7.6) : une suggestion, jamais un blocage ────────────────────────────────────────────
/** Critères du 5,5 %, affichés à côté de la case « appareil éligible » (CGI, annexe IV). */
export function criteres55(e) {
  const energie = e?.appareils?.[0]?.energie;
  if (e?.categorie === 'chaudiere') {
    return estSolide(energie)
      ? 'Chaudière à bois ou autres biomasses de 300 kW au plus qui remplit l’article 30-0 D ter, 3° de l’annexe IV du CGI : alimentation automatique avec silo d’au moins 225 litres, ou manuelle avec ballon tampon ; efficacité énergétique saisonnière d’au moins 77 % jusqu’à 20 kW et 79 % au-delà ; émissions plafonnées (automatique : CO ≤ 400, particules ≤ 30, COG ≤ 16, NOx ≤ 200 mg/Nm³ ; manuelle : CO ≤ 600, particules ≤ 40, COG ≤ 20, NOx ≤ 200 mg/Nm³, à 10 % d’O2) ; régulateur de classe IV à VIII.'
      : 'Chaudière à très haute performance énergétique (annexe IV du CGI, art. 30-0 D nonies) : efficacité énergétique saisonnière d’au moins 92 % jusqu’à 70 kW (au-delà : 87 % à pleine puissance et 95,5 % à 30 %) ET régulateur de classe IV, V, VI, VII ou VIII. La condensation seule ne suffit pas.';
  }
  if (e?.categorie === 'pac') {
    return ['air_air', 'clim'].includes(e?.appareils?.[0]?.type)
      ? 'PAC air/air qui remplit l’article 30-0 D ter, 1° bis de l’annexe IV du CGI : jusqu’à 12 kW, classe A+ en multi-split ou A++ en mono-split, en chauffage (SCOP) et en refroidissement (SEER) ; au-delà de 12 kW, efficacité énergétique saisonnière d’au moins 145 % en chauffage et 250 % en refroidissement (seuils propres aux PAC en toiture) ; fluide frigorigène qui respecte les seuils et le calendrier du règlement (UE) 2024/573 ; PAC connectable à un réseau numérique. Une climatisation en froid seul n’est pas éligible.'
      : 'PAC qui remplit l’article 30-0 D ter, 1° de l’annexe IV du CGI (efficacité énergétique saisonnière d’au moins 126 % à basse température, ou 111 % à moyenne et haute température).';
  }
  return 'Appareil qui remplit l’article 30-0 D ter, 4° de l’annexe IV du CGI (granulés ou plaquettes : efficacité énergétique saisonnière d’au moins 79 %, CO ≤ 300, particules ≤ 20, COG ≤ 60, NOx ≤ 200 mg/Nm³ ; bûches ou autres biomasses : efficacité énergétique saisonnière d’au moins 65 %, CO ≤ 1500, particules ≤ 40, COG ≤ 120, NOx ≤ 200 mg/Nm³, à 13 % d’O2).';
}
/** La case 5,5 % a-t-elle un sens ? Ni une climatisation en froid seul, ni une chaudière au charbon (pas une énergie
 * renouvelable, ann. IV, art. 30-0 D, 2°). */
export const peutEtre55 = (e) => !(e?.categorie === 'pac' && e?.appareils?.[0]?.type === 'clim')
  && !(e?.categorie === 'chaudiere' && e?.appareils?.[0]?.energie === 'charbon');

/**
 * Taux proposé pour la facture : 10 % dans un logement achevé depuis plus de deux ans, 5,5 % si l'artisan déclare
 * l'appareil éligible, 20 % sinon ; aucun en franchise. Jamais 20 % pour une chaudière gaz en état d'entretien.
 */
export function tauxPropose(e, { franchise = false } = {}) {
  if (franchise) return 0;
  if (!e?.logement_plus_2_ans) return 20;
  if (!peutEtre55(e)) return 10;
  return e?.eligible_55 ? 5.5 : 10;
}

// ── Saisie : brouillon, contrôle, facture ─────────────────────────────────────────────────────────────────────────
export const DELAI_RAPPEL_DEFAUT = 30;

const appareilVide = (categorieValeur, precedent = {}) => ({
  type: precedent.type || (categorieValeur === 'poele' ? 'poele' : ''),
  energie: precedent.energie || (categorieValeur === 'pac' ? 'electricite' : ''),
  marque: precedent.marque || '',
  modele: precedent.modele || '',
  evacuation: precedent.evacuation || '',
  technologie: precedent.technologie || '',
  numero_serie: precedent.numero_serie || '',
  mise_en_service: precedent.mise_en_service || '',
  hydraulique: !!precedent.hydraulique,
  bruleur: precedent.bruleur || { date: '', marque: '', modele: '' },
  fluide: precedent.fluide || '',
  charge_kg: precedent.charge_kg ?? '',
  autres_machines: precedent.autres_machines || '',
  points: {},
});

/**
 * Brouillon d'un nouvel entretien. Du dernier entretien du même appareil, l'identification de l'appareil, le lieu, les
 * appareils de mesure et le prix sont repris ; jamais les points contrôlés, les mesures ni les conseils.
 */
export function nouveauBrouillon({ client, categorieValeur, precedent = null, entreprise = null, intervenant = '', dernierRamonage = '', maintenant = new Date() }) {
  const realiseLe = maintenant.toISOString();
  const cat = precedent?.categorie || categorieValeur;
  return {
    client_id: client?.id || null,
    appareil_ref: precedent?.appareil_ref || crypto.randomUUID(),
    categorie: cat,
    client_nom: [client?.prenom, client?.nom].filter(Boolean).join(' ').trim() || client?.entreprise || '',
    client_adresse: client?.adresse || '',
    client_contact: [client?.telephone, client?.email].filter(Boolean).join(' · '),
    adresse_installation: precedent?.adresse_installation || client?.adresse || '',
    local: precedent?.local || '',
    appareils: (precedent?.appareils?.length ? precedent.appareils : [{}]).map((a) => appareilVide(cat, a)),
    puissance_kw: precedent?.puissance_kw ?? '',
    contrat_performance: !!precedent?.contrat_performance,
    realise_le: realiseLe,
    intervenant_nom: intervenant || entreprise?.nomEntrepreneur || '',
    dernier_entretien: precedent ? jourDe(precedent.realise_le) : '',
    dernier_ramonage: dernierRamonage || '',
    appareils_mesure: precedent?.appareils_mesure || entreprise?.entretienAppareilsMesure || '',
    mesures: {},
    operations: '',
    co_ppm: '',
    rendement: { evalue: '', reference: '' },
    emissions: { evalue: '' },
    classe_energetique: '',
    etancheite: '',
    etancheite_detail: '',
    defauts: '',
    actions: '',
    conseils: { usage: '', ameliorations: '', remplacement: '', choix: [], texte: '' },
    observations: '',
    prochain_avant: prochainParDefaut(realiseLe),
    // D-38 (Hugo, 5 nov. 2026) : jamais cochée d'avance, pas même reprise de l'an dernier. Le taux réduit et la mention
    // « immeuble achevé depuis plus de deux ans » sont une déclaration que l'artisan fait à chaque attestation.
    logement_plus_2_ans: false,
    eligible_55: !!precedent?.eligible_55,
    eligible_55_detail: precedent?.eligible_55_detail || '',
    prix_ht: precedent?.prix_ht ?? tarifPour(entreprise, cat) ?? null,
    signature: null,
  };
}

/** Tarif réglé pour cette catégorie (Paramètres → Entretien), sinon null. */
export function tarifPour(entreprise, cat) {
  const v = Number(entreprise?.entretienTarifs?.[cat]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Ce qui manque avant d'enregistrer (les éléments « a minima » de l'annexe de chaque arrêté, avis § 7.2 à 7.4).
 * Liste vide = enregistrable. Les champs « si possible » ou « si disponible » restent facultatifs.
 */
export function manquants(e) {
  const m = [];
  const vide = (v) => !String(v ?? '').trim();
  const ajoute = (champ, message) => m.push({ champ, message });
  if (!categorie(e?.categorie)) { ajoute('categorie', 'Le type d’appareil'); return m; }
  if (vide(e.client_nom)) ajoute('client_nom', 'Le nom du commanditaire');
  if (vide(e.client_adresse)) ajoute('client_adresse', 'L’adresse du commanditaire');
  if (vide(e.adresse_installation)) ajoute('adresse_installation', 'L’adresse de l’installation');
  if (vide(e.local)) ajoute('local', 'Le local où se trouve l’appareil');
  if (vide(e.realise_le)) ajoute('realise_le', 'La date de la visite');
  if (vide(e.intervenant_nom)) ajoute('intervenant_nom', 'Le nom de l’intervenant');
  const appareils = e.appareils || [];
  if (!appareils.length) ajoute('appareils', 'L’appareil');
  appareils.forEach((a, i) => {
    const n = appareils.length > 1 ? ` (appareil ${i + 1})` : '';
    const ch = (c) => `appareil${i}-${c}`;
    if (e.categorie !== 'poele') {
      // Chaudière (annexe 5) et PAC (annexe 3) : marque, modèle, énergie exigés ; poêle : « lorsqu'elles sont disponibles »
      if (vide(a.marque)) ajoute(ch('marque'), `La marque${n}`);
      if (vide(a.modele)) ajoute(ch('modele'), `Le modèle${n}`);
    }
    if (vide(a.energie)) ajoute(ch('energie'), `L’énergie${n}`);
    if (e.categorie === 'chaudiere' && vide(a.evacuation)) ajoute(ch('evacuation'), `Le mode d’évacuation${n}`);
    if (e.categorie === 'pac' && vide(a.type)) ajoute(ch('type'), `Le type de système${n}`);
    if (e.categorie === 'poele' && vide(a.type)) ajoute(ch('type'), `Le type d’appareil${n}`);
    if (!pointsCoches(e.categorie, a).length) ajoute(ch('points'), `Les points contrôlés${n}`);
  });
  // Exigés par l'annexe 5 (chaudière) et l'annexe 3 (PAC) ; l'annexe 3 du poêle (arrêté du 20 juil. 2023) ne les demande pas
  if (e.categorie !== 'poele' && vide(e.appareils_mesure)) ajoute('appareils_mesure', 'La marque et la référence des appareils de mesure');
  if (e.categorie === 'chaudiere') {
    const a = appareils[0] || {};
    if (estGazFioul(a.energie) && vide(e.operations)) ajoute('operations', 'Les opérations réalisées (norme NF X50-010 ou NF X50-011)');
    if (niveauCO(e.co_ppm) === null) ajoute('co_ppm', 'La teneur en CO mesurée dans l’air ambiant (ppm)');
    if (estSolide(a.energie) && vide(e.mesures?.temperature_fumees)) ajoute('mesures', 'La température des fumées');
    // Annexe 1, § 3 : O2 et CO2 « pour les chaudières automatiques uniquement » (alimentation automatique cochée)
    if (estSolide(a.energie) && a.points?.['solide.alimentation'] && vide(e.mesures?.o2_co2)) ajoute('mesures_o2', 'La teneur en O2 et en CO2 (chaudière automatique)');
    if (vide(e.rendement?.evalue)) ajoute('rendement', 'Le rendement évalué');
    if (vide(e.rendement?.reference)) ajoute('rendement_reference', 'Le rendement de référence');
    if (vide(e.emissions?.evalue)) ajoute('emissions', 'Les émissions évaluées');
    if (vide(e.classe_energetique) || (e.classe_energetique === 'Non déterminée' && estGazFioul(a.energie) && !(nombre(e.puissance_kw) >= 70))) ajoute('classe_energetique', 'La classe énergétique');
    if (!RUBRIQUES_CHAUDIERE.some((r) => !vide(e.conseils?.[r.cle]))) ajoute('conseils', 'Les conseils (au moins une rubrique)');
  } else {
    if (e.categorie === 'pac') {
      if (vide(e.mesures?.resultats)) ajoute('mesures', 'Les résultats des mesures');
      if (!['controle', 'reglement_ue'].includes(e.etancheite)) ajoute('etancheite', 'Le contrôle d’étanchéité');
      if (e.etancheite && vide(appareils[0]?.fluide)) ajoute('appareil0-fluide', 'Le fluide frigorigène');
      if (vide(e.defauts)) ajoute('defauts', 'Les défauts constatés (« aucun » si aucun)');
      if (vide(e.actions)) ajoute('actions', 'Les actions effectuées (« aucune » si aucune)');
    }
    if (!(e.conseils?.choix?.length || !vide(e.conseils?.texte))) ajoute('conseils', 'Les conseils donnés');
  }
  if (vide(e.prochain_avant)) ajoute('prochain_avant', 'La date conseillée du prochain entretien');
  else if (String(e.prochain_avant) <= jourDe(e.realise_le)) ajoute('prochain_avant', 'Un prochain entretien après la date de la visite');
  return m;
}

/** Description courte : « Chaudière gaz De Dietrich Naneo (cuisine) ». */
export function descriptionAppareil(e) {
  if (!e) return '';
  const c = categorie(e.categorie);
  const a = e.appareils?.[0] || {};
  const type = e.categorie === 'poele' ? libelleDe(TYPES_POELE, a.type) : e.categorie === 'pac' ? libelleDe(TYPES_PAC, a.type) : c?.libelle;
  const energie = e.categorie === 'chaudiere' ? libelleDe(ENERGIES.chaudiere, a.energie).toLowerCase() : '';
  const plus = (e.appareils?.length || 0) > 1 ? ` et ${e.appareils.length - 1} autre(s)` : '';
  return [type || c?.libelle || 'Appareil', energie, [a.marque, a.modele].filter(Boolean).join(' ')].filter(Boolean).join(' ')
    + plus + (e.local ? ` (${e.local})` : '');
}

/**
 * La ligne de facture tirée d'une attestation : date de la prestation, appareil, adresse de l'installation, numéro, et
 * « immeuble achevé depuis plus de deux ans » au taux réduit (BOI-TVA-LIQ-30-20-90-40 § 90 : sous 1 000 € TTC, ces
 * mentions dispensent de la certification ; au-delà, celle de mentionTvaReduite s'imprime dans les deux générateurs).
 */
export function ligneFacture(e, { franchise = false } = {}) {
  const le = e?.realise_le ? ` du ${dateFr(jourDe(e.realise_le))}` : '';
  const taux = tauxPropose(e, { franchise });
  const morceaux = [
    `${operation(e)}${le}`,
    descriptionAppareil(e),
    e?.adresse_installation ? `installation : ${e.adresse_installation}` : '',
    e?.numero ? `attestation n° ${e.numero}` : '',
    e?.logement_plus_2_ans && (taux === 10 || taux === 5.5) ? 'immeuble achevé depuis plus de deux ans' : '',
  ].filter(Boolean);
  return {
    description: morceaux.join(' — '),
    quantite: 1,
    unite: 'u',
    prixUnitaire: Number(e?.prix_ht) || 0,
    ...(franchise ? {} : { tva: taux }),
  };
}

/** L'opération : « Entretien de chaudière », « … de pompe à chaleur ou climatisation », « … de poêle ou insert ». */
const operation = (e) => {
  const c = categorie(e?.categorie);
  return `Entretien${c ? ` de ${e.categorie === 'chaudiere' ? 'chaudière' : e.categorie === 'pac' ? 'pompe à chaleur ou climatisation' : 'poêle ou insert'}` : ''}`;
};

/**
 * La ligne du devis de la visite (D-38, décision 2 : « Faire le devis de la visite » depuis l'attestation). Arrêté du
 * 24 janv. 2017, art. 4 : avant une visite d'entretien payée chez un particulier, un devis détaillé est dû ; un prix
 * forfaitaire par visite se fait dans un devis (avis du 4 nov. 2026, § 6). Une ligne « Entretien de … » d'après l'appareil,
 * avec l'adresse de l'installation (le lieu d'exécution) ; au tarif réglé dans Paramètres → Entretien s'il existe, sinon
 * sans prix ; au taux de TVA que les règles de l'entretien proposent. La visite est à venir : ni numéro d'attestation ni
 * date de visite, contrairement à la ligne de facture.
 */
export function ligneDevisVisite(e, { franchise = false, entreprise = null } = {}) {
  const taux = tauxPropose(e, { franchise });
  const morceaux = [
    operation(e),
    descriptionAppareil(e),
    e?.adresse_installation ? `installation : ${e.adresse_installation}` : '',
    e?.logement_plus_2_ans && (taux === 10 || taux === 5.5) ? 'immeuble achevé depuis plus de deux ans' : '',
  ].filter(Boolean);
  return {
    description: morceaux.join(' — '),
    quantite: 1,
    unite: 'forfait',
    prixUnitaire: tarifPour(entreprise, e?.categorie) ?? 0,
    ...(franchise ? {} : { tva: taux }),
  };
}

/**
 * Texte proposé par juriste-btp (relecture du 4 nov. 2026, « Visite d'entretien chez un particulier ») : la facture tirée
 * d'une attestation, chez un client particulier, rappelle les sept jours (C. conso. L221-10).
 */
export const AVERTISSEMENT_SEPT_JOURS = 'Entretien convenu chez le client : aucun paiement ne peut être reçu avant sept jours après la conclusion du contrat (article L221-10 du code de la consommation).';
/** L'avertissement pour ce client, ou '' (professionnel, copropriété : pas de contrat de consommation). */
export const avertissementSeptJours = (client) => (estClientParticulier(client) ? AVERTISSEMENT_SEPT_JOURS : '');

// ── Historique et rappels ─────────────────────────────────────────────────────────────────────────────────────────
const parDateDecroissante = (a, b) => String(b.realise_le || '').localeCompare(String(a.realise_le || ''));
const vivante = (e) => !e.annulee_le;

/** Les appareils (installations) d'un client : dernier entretien non annulé et historique. */
export function appareilsDuClient(entretiens, clientId) {
  const groupes = new Map();
  for (const e of entretiens || []) {
    if (e.client_id !== clientId) continue;
    if (!groupes.has(e.appareil_ref)) groupes.set(e.appareil_ref, []);
    groupes.get(e.appareil_ref).push(e);
  }
  return [...groupes.entries()]
    .map(([ref, passages]) => {
      const tries = [...passages].sort(parDateDecroissante);
      return { appareil_ref: ref, passages: tries, dernier: tries.find(vivante) || null };
    })
    .filter((a) => a.dernier)
    .sort((a, b) => parDateDecroissante(a.dernier, b.dernier));
}

/** Le dernier entretien non annulé du même appareil avant celui-ci. */
export function entretienPrecedent(entretiens, e) {
  return (entretiens || [])
    .filter((x) => x.appareil_ref === e?.appareil_ref && x.id !== e?.id && vivante(x) && String(x.realise_le || '') < String(e?.realise_le || ''))
    .sort(parDateDecroissante)[0] || null;
}

/** « AAAA-MM-JJ » décalé de n jours. */
export function ajouterJours(jour, n) {
  const d = dateLue(String(jour || '').slice(0, 10));
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return jourLocal(d);
}
export const jourDuRappel = (e, jours = DELAI_RAPPEL_DEFAUT) => ajouterJours(e?.prochain_avant, -Math.max(0, Number(jours) || 0));

/**
 * Rappels à faire : pour chaque appareil, son dernier entretien non annulé, rappel pas fait, à partir de « date
 * conseillée − délai », pour un client connu qui n'a pas refusé les rappels.
 * @returns {{ entretien, client, jourRappel, joursRestants, enRetard }[]}
 */
export function rappelsDus(entretiens, clients, { jours = DELAI_RAPPEL_DEFAUT, aujourdhui = jourLocal() } = {}) {
  const parClient = new Map((clients || []).map((c) => [c.id, c]));
  const derniers = new Map();
  for (const e of entretiens || []) {
    if (!vivante(e) || !e.appareil_ref) continue;
    const actuel = derniers.get(e.appareil_ref);
    if (!actuel || parDateDecroissante(e, actuel) < 0) derniers.set(e.appareil_ref, e);
  }
  const dus = [];
  for (const e of derniers.values()) {
    const client = parClient.get(e.client_id);
    if (!client || client.rappels_refuses_le || e.rappel_fait_le || !e.prochain_avant) continue;
    const jourRappel = jourDuRappel(e, jours);
    if (aujourdhui < jourRappel) continue;
    const joursRestants = Math.round((dateLue(e.prochain_avant) - dateLue(aujourdhui)) / 86400000);
    dus.push({ entretien: e, client, jourRappel, joursRestants, enRetard: joursRestants < 0 });
  }
  return dus.sort((a, b) => String(a.entretien.prochain_avant).localeCompare(String(b.entretien.prochain_avant)));
}

/** Mode démo : ENT-AAAA-NNNNN, à la suite du plus grand. */
export function numeroEntretienDemo(entretiens, maintenant = new Date()) {
  const an = new Date(maintenant).getFullYear();
  const motif = new RegExp(`^ENT-${an}-(\\d{5})$`);
  const dernier = Math.max(0, ...(entretiens || []).map((e) => Number(String(e.numero || '').match(motif)?.[1] || 0)));
  return `ENT-${an}-${String(dernier + 1).padStart(5, '0')}`;
}
