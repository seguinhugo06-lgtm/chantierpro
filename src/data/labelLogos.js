/**
 * Predefined BTP label/certification types with default logos
 * Used by LabelsManager in Settings
 */

// Simple SVG badge generator for labels (small, clean, professional)
function svgBadge(text, color) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><rect width="80" height="40" rx="6" fill="${color}"/><text x="40" y="26" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="11" fill="white">${text}</text></svg>`)}`;
}

export const LABEL_TYPES = [
  {
    type: 'rge',
    nom: 'RGE',
    description: 'Reconnu Garant de l\'Environnement',
    organisme: 'Qualibat',
    color: '#16a34a',
    defaultLogo: svgBadge('RGE', '#16a34a'),
  },
  {
    type: 'qualibat',
    nom: 'Qualibat',
    description: 'Qualification et certification des entreprises de construction',
    organisme: 'Qualibat',
    color: '#2563eb',
    defaultLogo: svgBadge('QUALIBAT', '#2563eb'),
  },
  {
    type: 'qualifelec',
    nom: 'Qualifelec',
    description: 'Qualification des entreprises du génie électrique et énergétique',
    organisme: 'Qualifelec',
    color: '#0369a1',
    defaultLogo: svgBadge('QUALIFELEC', '#0369a1'),
  },
  {
    type: 'qualipv',
    nom: 'QualiPV',
    description: 'Qualification photovoltaïque',
    organisme: 'Qualit\'EnR',
    color: '#ea580c',
    defaultLogo: svgBadge('QualiPV', '#ea580c'),
  },
  {
    type: 'qualibois',
    nom: 'QualiBois',
    description: 'Qualification chauffage bois énergie',
    organisme: 'Qualit\'EnR',
    color: '#854d0e',
    defaultLogo: svgBadge('QualiBois', '#854d0e'),
  },
  {
    type: 'handibat',
    nom: 'Handibat',
    description: 'Accessibilité et adaptation du logement',
    organisme: 'CAPEB',
    color: '#7c3aed',
    defaultLogo: svgBadge('HANDIBAT', '#7c3aed'),
  },
  {
    type: 'eco_artisan',
    nom: 'Éco Artisan',
    description: 'Performance énergétique des logements',
    organisme: 'CAPEB',
    color: '#059669',
    defaultLogo: svgBadge('ÉCO ART.', '#059669'),
  },
  {
    type: 'qualisol',
    nom: 'QualiSol',
    description: 'Qualification solaire thermique',
    organisme: 'Qualit\'EnR',
    color: '#dc2626',
    defaultLogo: svgBadge('QualiSol', '#dc2626'),
  },
  {
    type: 'certibat',
    nom: 'Certibat',
    description: 'Certification rénovation énergétique des bâtiments',
    organisme: 'Certibat',
    color: '#0891b2',
    defaultLogo: svgBadge('CERTIBAT', '#0891b2'),
  },
  {
    type: 'nf_habitat',
    nom: 'NF Habitat',
    description: 'Certification qualité du logement',
    organisme: 'Cerqual',
    color: '#1d4ed8',
    defaultLogo: svgBadge('NF HAB.', '#1d4ed8'),
  },
];

/**
 * Get the default logo for a label type
 * @param {string} type - Label type key
 * @returns {string} SVG data URL
 */
export function getDefaultLogo(type) {
  const found = LABEL_TYPES.find(l => l.type === type);
  return found?.defaultLogo || svgBadge('LABEL', '#64748b');
}

/**
 * Get label type info
 * @param {string} type - Label type key
 * @returns {Object|undefined}
 */
export function getLabelTypeInfo(type) {
  return LABEL_TYPES.find(l => l.type === type);
}
