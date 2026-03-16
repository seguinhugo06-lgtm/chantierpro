/**
 * Coefficients géographiques d'ajustement des prix BTP par département français.
 * Source : indices de coût de la construction 2025, ajustés par région.
 *
 * Chaque entrée contient :
 *   - code  : code officiel du département (string)
 *   - nom   : nom complet du département
 *   - region: nom de la région administrative
 *   - coefficient : multiplicateur de prix (base 1.00 = moyenne nationale)
 */

export const DEPARTEMENTS = [
  // ── Auvergne-Rhône-Alpes ──────────────────────────────────────────────
  { code: '01', nom: 'Ain',              region: 'Auvergne-Rhône-Alpes', coefficient: 0.95 },
  { code: '03', nom: 'Allier',           region: 'Auvergne-Rhône-Alpes', coefficient: 0.90 },
  { code: '07', nom: 'Ardèche',          region: 'Auvergne-Rhône-Alpes', coefficient: 0.93 },
  { code: '15', nom: 'Cantal',           region: 'Auvergne-Rhône-Alpes', coefficient: 0.90 },
  { code: '26', nom: 'Drôme',            region: 'Auvergne-Rhône-Alpes', coefficient: 0.96 },
  { code: '38', nom: 'Isère',            region: 'Auvergne-Rhône-Alpes', coefficient: 1.02 },
  { code: '42', nom: 'Loire',            region: 'Auvergne-Rhône-Alpes', coefficient: 0.95 },
  { code: '43', nom: 'Haute-Loire',      region: 'Auvergne-Rhône-Alpes', coefficient: 0.90 },
  { code: '63', nom: 'Puy-de-Dôme',      region: 'Auvergne-Rhône-Alpes', coefficient: 0.94 },
  { code: '69', nom: 'Rhône',            region: 'Auvergne-Rhône-Alpes', coefficient: 1.08 },
  { code: '73', nom: 'Savoie',           region: 'Auvergne-Rhône-Alpes', coefficient: 1.03 },
  { code: '74', nom: 'Haute-Savoie',     region: 'Auvergne-Rhône-Alpes', coefficient: 1.05 },

  // ── Bourgogne-Franche-Comté ───────────────────────────────────────────
  { code: '21', nom: 'Côte-d\'Or',       region: 'Bourgogne-Franche-Comté', coefficient: 0.94 },
  { code: '25', nom: 'Doubs',            region: 'Bourgogne-Franche-Comté', coefficient: 0.92 },
  { code: '39', nom: 'Jura',             region: 'Bourgogne-Franche-Comté', coefficient: 0.90 },
  { code: '58', nom: 'Nièvre',           region: 'Bourgogne-Franche-Comté', coefficient: 0.88 },
  { code: '70', nom: 'Haute-Saône',      region: 'Bourgogne-Franche-Comté', coefficient: 0.88 },
  { code: '71', nom: 'Saône-et-Loire',   region: 'Bourgogne-Franche-Comté', coefficient: 0.90 },
  { code: '89', nom: 'Yonne',            region: 'Bourgogne-Franche-Comté', coefficient: 0.89 },
  { code: '90', nom: 'Territoire de Belfort', region: 'Bourgogne-Franche-Comté', coefficient: 0.91 },

  // ── Bretagne ──────────────────────────────────────────────────────────
  { code: '22', nom: 'Côtes-d\'Armor',   region: 'Bretagne', coefficient: 0.92 },
  { code: '29', nom: 'Finistère',        region: 'Bretagne', coefficient: 0.94 },
  { code: '35', nom: 'Ille-et-Vilaine',  region: 'Bretagne', coefficient: 0.98 },
  { code: '56', nom: 'Morbihan',         region: 'Bretagne', coefficient: 0.95 },

  // ── Centre-Val de Loire ───────────────────────────────────────────────
  { code: '18', nom: 'Cher',             region: 'Centre-Val de Loire', coefficient: 0.88 },
  { code: '28', nom: 'Eure-et-Loir',     region: 'Centre-Val de Loire', coefficient: 0.92 },
  { code: '36', nom: 'Indre',            region: 'Centre-Val de Loire', coefficient: 0.88 },
  { code: '37', nom: 'Indre-et-Loire',   region: 'Centre-Val de Loire', coefficient: 0.93 },
  { code: '41', nom: 'Loir-et-Cher',     region: 'Centre-Val de Loire', coefficient: 0.90 },
  { code: '45', nom: 'Loiret',           region: 'Centre-Val de Loire', coefficient: 0.95 },

  // ── Corse ─────────────────────────────────────────────────────────────
  { code: '2A', nom: 'Corse-du-Sud',     region: 'Corse', coefficient: 1.18 },
  { code: '2B', nom: 'Haute-Corse',      region: 'Corse', coefficient: 1.15 },

  // ── Grand Est ─────────────────────────────────────────────────────────
  { code: '08', nom: 'Ardennes',         region: 'Grand Est', coefficient: 0.88 },
  { code: '10', nom: 'Aube',             region: 'Grand Est', coefficient: 0.90 },
  { code: '51', nom: 'Marne',            region: 'Grand Est', coefficient: 0.93 },
  { code: '52', nom: 'Haute-Marne',      region: 'Grand Est', coefficient: 0.88 },
  { code: '54', nom: 'Meurthe-et-Moselle', region: 'Grand Est', coefficient: 0.95 },
  { code: '55', nom: 'Meuse',            region: 'Grand Est', coefficient: 0.88 },
  { code: '57', nom: 'Moselle',          region: 'Grand Est', coefficient: 0.94 },
  { code: '67', nom: 'Bas-Rhin',         region: 'Grand Est', coefficient: 1.02 },
  { code: '68', nom: 'Haut-Rhin',        region: 'Grand Est', coefficient: 0.98 },
  { code: '88', nom: 'Vosges',           region: 'Grand Est', coefficient: 0.89 },

  // ── Hauts-de-France ───────────────────────────────────────────────────
  { code: '02', nom: 'Aisne',            region: 'Hauts-de-France', coefficient: 0.90 },
  { code: '59', nom: 'Nord',             region: 'Hauts-de-France', coefficient: 0.98 },
  { code: '60', nom: 'Oise',             region: 'Hauts-de-France', coefficient: 0.96 },
  { code: '62', nom: 'Pas-de-Calais',    region: 'Hauts-de-France', coefficient: 0.92 },
  { code: '80', nom: 'Somme',            region: 'Hauts-de-France', coefficient: 0.91 },

  // ── Île-de-France ─────────────────────────────────────────────────────
  { code: '75', nom: 'Paris',            region: 'Île-de-France', coefficient: 1.20 },
  { code: '77', nom: 'Seine-et-Marne',   region: 'Île-de-France', coefficient: 1.10 },
  { code: '78', nom: 'Yvelines',         region: 'Île-de-France', coefficient: 1.15 },
  { code: '91', nom: 'Essonne',          region: 'Île-de-France', coefficient: 1.12 },
  { code: '92', nom: 'Hauts-de-Seine',   region: 'Île-de-France', coefficient: 1.18 },
  { code: '93', nom: 'Seine-Saint-Denis', region: 'Île-de-France', coefficient: 1.12 },
  { code: '94', nom: 'Val-de-Marne',     region: 'Île-de-France', coefficient: 1.14 },
  { code: '95', nom: 'Val-d\'Oise',      region: 'Île-de-France', coefficient: 1.11 },

  // ── Normandie ─────────────────────────────────────────────────────────
  { code: '14', nom: 'Calvados',         region: 'Normandie', coefficient: 0.95 },
  { code: '27', nom: 'Eure',             region: 'Normandie', coefficient: 0.93 },
  { code: '50', nom: 'Manche',           region: 'Normandie', coefficient: 0.90 },
  { code: '61', nom: 'Orne',             region: 'Normandie', coefficient: 0.90 },
  { code: '76', nom: 'Seine-Maritime',   region: 'Normandie', coefficient: 0.96 },

  // ── Nouvelle-Aquitaine ────────────────────────────────────────────────
  { code: '16', nom: 'Charente',         region: 'Nouvelle-Aquitaine', coefficient: 0.90 },
  { code: '17', nom: 'Charente-Maritime', region: 'Nouvelle-Aquitaine', coefficient: 0.94 },
  { code: '19', nom: 'Corrèze',          region: 'Nouvelle-Aquitaine', coefficient: 0.90 },
  { code: '23', nom: 'Creuse',           region: 'Nouvelle-Aquitaine', coefficient: 0.88 },
  { code: '24', nom: 'Dordogne',         region: 'Nouvelle-Aquitaine', coefficient: 0.91 },
  { code: '33', nom: 'Gironde',          region: 'Nouvelle-Aquitaine', coefficient: 1.02 },
  { code: '40', nom: 'Landes',           region: 'Nouvelle-Aquitaine', coefficient: 0.93 },
  { code: '47', nom: 'Lot-et-Garonne',   region: 'Nouvelle-Aquitaine', coefficient: 0.90 },
  { code: '64', nom: 'Pyrénées-Atlantiques', region: 'Nouvelle-Aquitaine', coefficient: 0.98 },
  { code: '79', nom: 'Deux-Sèvres',     region: 'Nouvelle-Aquitaine', coefficient: 0.90 },
  { code: '86', nom: 'Vienne',           region: 'Nouvelle-Aquitaine', coefficient: 0.91 },
  { code: '87', nom: 'Haute-Vienne',     region: 'Nouvelle-Aquitaine', coefficient: 0.92 },

  // ── Occitanie ─────────────────────────────────────────────────────────
  { code: '09', nom: 'Ariège',           region: 'Occitanie', coefficient: 0.90 },
  { code: '11', nom: 'Aude',             region: 'Occitanie', coefficient: 0.91 },
  { code: '12', nom: 'Aveyron',          region: 'Occitanie', coefficient: 0.90 },
  { code: '30', nom: 'Gard',             region: 'Occitanie', coefficient: 0.97 },
  { code: '31', nom: 'Haute-Garonne',    region: 'Occitanie', coefficient: 1.02 },
  { code: '32', nom: 'Gers',             region: 'Occitanie', coefficient: 0.90 },
  { code: '34', nom: 'Hérault',          region: 'Occitanie', coefficient: 1.00 },
  { code: '46', nom: 'Lot',              region: 'Occitanie', coefficient: 0.90 },
  { code: '48', nom: 'Lozère',           region: 'Occitanie', coefficient: 0.88 },
  { code: '65', nom: 'Hautes-Pyrénées',  region: 'Occitanie', coefficient: 0.92 },
  { code: '66', nom: 'Pyrénées-Orientales', region: 'Occitanie', coefficient: 0.93 },
  { code: '81', nom: 'Tarn',             region: 'Occitanie', coefficient: 0.92 },
  { code: '82', nom: 'Tarn-et-Garonne',  region: 'Occitanie', coefficient: 0.91 },

  // ── Pays de la Loire ──────────────────────────────────────────────────
  { code: '44', nom: 'Loire-Atlantique', region: 'Pays de la Loire', coefficient: 1.00 },
  { code: '49', nom: 'Maine-et-Loire',   region: 'Pays de la Loire', coefficient: 0.96 },
  { code: '53', nom: 'Mayenne',          region: 'Pays de la Loire', coefficient: 0.93 },
  { code: '72', nom: 'Sarthe',           region: 'Pays de la Loire', coefficient: 0.93 },
  { code: '85', nom: 'Vendée',           region: 'Pays de la Loire', coefficient: 0.95 },

  // ── Provence-Alpes-Côte d'Azur ────────────────────────────────────────
  { code: '04', nom: 'Alpes-de-Haute-Provence', region: 'Provence-Alpes-Côte d\'Azur', coefficient: 1.05 },
  { code: '05', nom: 'Hautes-Alpes',     region: 'Provence-Alpes-Côte d\'Azur', coefficient: 1.05 },
  { code: '06', nom: 'Alpes-Maritimes',  region: 'Provence-Alpes-Côte d\'Azur', coefficient: 1.12 },
  { code: '13', nom: 'Bouches-du-Rhône', region: 'Provence-Alpes-Côte d\'Azur', coefficient: 1.08 },
  { code: '83', nom: 'Var',              region: 'Provence-Alpes-Côte d\'Azur', coefficient: 1.08 },
  { code: '84', nom: 'Vaucluse',         region: 'Provence-Alpes-Côte d\'Azur', coefficient: 1.02 },

  // ── DROM (Départements et Régions d'Outre-Mer) ────────────────────────
  { code: '971', nom: 'Guadeloupe',      region: 'DROM', coefficient: 1.30 },
  { code: '972', nom: 'Martinique',      region: 'DROM', coefficient: 1.28 },
  { code: '973', nom: 'Guyane',          region: 'DROM', coefficient: 1.40 },
  { code: '974', nom: 'La Réunion',      region: 'DROM', coefficient: 1.25 },
  { code: '976', nom: 'Mayotte',         region: 'DROM', coefficient: 1.35 },
];

// Index par code pour accès O(1)
const _indexByCode = new Map(DEPARTEMENTS.map((d) => [d.code, d]));

/**
 * Retourne le coefficient géographique pour un département donné.
 * @param {string} deptCode - Code du département (ex. '75', '2A', '971')
 * @returns {number} Le coefficient, ou 1.0 si le département n'est pas trouvé.
 */
export function getCoefficient(deptCode) {
  const dept = _indexByCode.get(String(deptCode).trim());
  return dept ? dept.coefficient : 1.0;
}

/**
 * Applique le coefficient géographique à un prix de base.
 * @param {number} prix - Prix de base (HT)
 * @param {string} deptCode - Code du département
 * @returns {number} Prix ajusté (arrondi à 2 décimales)
 */
export function applyCoefficient(prix, deptCode) {
  return Math.round(prix * getCoefficient(deptCode) * 100) / 100;
}

/**
 * Retourne la liste triée des noms de régions uniques.
 * @returns {string[]}
 */
export function getRegions() {
  const regions = new Set(DEPARTEMENTS.map((d) => d.region));
  return [...regions].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Retourne les départements d'une région donnée, triés par code.
 * @param {string} region - Nom exact de la région
 * @returns {Array<{code: string, nom: string, region: string, coefficient: number}>}
 */
export function getDepartementsByRegion(region) {
  return DEPARTEMENTS
    .filter((d) => d.region === region)
    .sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));
}
