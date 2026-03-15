/**
 * Tarifs main d'œuvre par région — référentiel BTP France
 */

export const REGION_RATES = {
  'Paris': { moMin: 55, moMax: 75, label: 'Île-de-France' },
  'Versailles': { moMin: 50, moMax: 70, label: 'Île-de-France' },
  'Lyon': { moMin: 45, moMax: 60, label: 'Auvergne-Rhône-Alpes' },
  'Grenoble': { moMin: 45, moMax: 60, label: 'Auvergne-Rhône-Alpes' },
  'Marseille': { moMin: 40, moMax: 55, label: 'PACA' },
  'Nice': { moMin: 45, moMax: 60, label: 'PACA' },
  'Toulon': { moMin: 40, moMax: 55, label: 'PACA' },
  'Bordeaux': { moMin: 40, moMax: 55, label: 'Nouvelle-Aquitaine' },
  'Toulouse': { moMin: 40, moMax: 55, label: 'Occitanie' },
  'Montpellier': { moMin: 40, moMax: 55, label: 'Occitanie' },
  'Nantes': { moMin: 42, moMax: 57, label: 'Pays de la Loire' },
  'Angers': { moMin: 38, moMax: 52, label: 'Pays de la Loire' },
  'Rennes': { moMin: 40, moMax: 55, label: 'Bretagne' },
  'Brest': { moMin: 38, moMax: 52, label: 'Bretagne' },
  'Strasbourg': { moMin: 42, moMax: 58, label: 'Grand Est' },
  'Lille': { moMin: 40, moMax: 55, label: 'Hauts-de-France' },
  'Rouen': { moMin: 40, moMax: 55, label: 'Normandie' },
  'Dijon': { moMin: 38, moMax: 52, label: 'Bourgogne-Franche-Comté' },
  'Clermont': { moMin: 38, moMax: 52, label: 'Auvergne-Rhône-Alpes' },
};

const DEFAULT_RATES = { moMin: 40, moMax: 60, label: 'France' };

/**
 * Retourne les tarifs MO pour une ville/région.
 * @param {string|null} city
 * @returns {{ moMin: number, moMax: number, label: string }}
 */
export function getRatesForCity(city) {
  if (!city) return DEFAULT_RATES;
  return REGION_RATES[city] || DEFAULT_RATES;
}

/**
 * Formate la fourchette de tarifs.
 * @param {string|null} city
 * @returns {string}
 */
export function formatRateRange(city) {
  const rates = getRatesForCity(city);
  return `${rates.moMin}–${rates.moMax} €/h (${rates.label})`;
}
