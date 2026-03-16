// =============================================================================
// BIBLIOTHÈQUE DE PRIX BTP — Module principal
// Exports, recherche Fuse.js, helpers
// =============================================================================

import Fuse from 'fuse.js';
import { NOMENCLATURE, LOTS, getChildren, getNodeById, getPath, getAllDescendants } from './nomenclature';
import { DEPARTEMENTS, getCoefficient, applyCoefficient, getRegions, getDepartementsByRegion } from './coefficients-geo';

// Import ouvrages par lot
import ouvragesCommuns from './ouvrages-communs';
import ouvragesLot01 from './ouvrages-lot01-gros-oeuvre';
import ouvragesLot02 from './ouvrages-lot02-vrd';
import ouvragesLot03 from './ouvrages-lot03-menuiserie-ext';
import ouvragesLot04 from './ouvrages-lot04-metallerie';
import ouvragesLot05 from './ouvrages-lot05-second-oeuvre';
import ouvragesLot06 from './ouvrages-lot06-peinture-revetements';
import ouvragesLot07 from './ouvrages-lot07-charpente-couverture';
import ouvragesLot08 from './ouvrages-lot08-plomberie-cvc';
import ouvragesLot09 from './ouvrages-lot09-electricite';
import ouvragesLot10 from './ouvrages-lot10-renovation-energetique';
import ouvragesLot11 from './ouvrages-lot11-desamiantage';

// =============================================================================
// Tous les ouvrages concaténés
// =============================================================================

export const ALL_OUVRAGES = [
  ...ouvragesCommuns,
  ...ouvragesLot01,
  ...ouvragesLot02,
  ...ouvragesLot03,
  ...ouvragesLot04,
  ...ouvragesLot05,
  ...ouvragesLot06,
  ...ouvragesLot07,
  ...ouvragesLot08,
  ...ouvragesLot09,
  ...ouvragesLot10,
  ...ouvragesLot11,
];

// =============================================================================
// Map des ouvrages par lot (pour lazy-loading dans l'arbre)
// =============================================================================

const OUVRAGES_PAR_LOT = {
  LOT_CN: ouvragesCommuns,
  LOT_01: ouvragesLot01,
  LOT_02: ouvragesLot02,
  LOT_03: ouvragesLot03,
  LOT_04: ouvragesLot04,
  LOT_05: ouvragesLot05,
  LOT_06: ouvragesLot06,
  LOT_07: ouvragesLot07,
  LOT_08: ouvragesLot08,
  LOT_09: ouvragesLot09,
  LOT_10: ouvragesLot10,
  LOT_11: ouvragesLot11,
};

// =============================================================================
// Index par chapitreId (pré-calculé pour lookups O(1))
// =============================================================================

const _ouvragesParChapitre = new Map();
ALL_OUVRAGES.forEach(o => {
  if (!_ouvragesParChapitre.has(o.chapitreId)) {
    _ouvragesParChapitre.set(o.chapitreId, []);
  }
  _ouvragesParChapitre.get(o.chapitreId).push(o);
});

/**
 * Retourne les ouvrages pour un chapitreId donné
 */
export function getOuvragesByChapitre(chapitreId) {
  return _ouvragesParChapitre.get(chapitreId) || [];
}

/**
 * Retourne les ouvrages pour un lot donné
 */
export function getOuvragesByLot(lotId) {
  return OUVRAGES_PAR_LOT[lotId] || [];
}

/**
 * Retourne les ouvrages pour un noeud de nomenclature (lot, corps ou chapitre)
 * Pour un lot ou un corps, récupère les ouvrages de tous les chapitres descendants
 */
export function getOuvragesByNode(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) return [];

  if (node.type === 'chapitre') {
    return getOuvragesByChapitre(nodeId);
  }

  // Pour lot ou corps : récupérer tous les chapitres descendants
  const descendants = getAllDescendants(nodeId);
  const chapitres = descendants.filter(d => d.type === 'chapitre');
  const result = [];
  chapitres.forEach(ch => {
    const ouvrages = getOuvragesByChapitre(ch.id);
    result.push(...ouvrages);
  });
  return result;
}

/**
 * Compte le nombre d'ouvrages pour un noeud donné
 */
export function countOuvragesByNode(nodeId) {
  return getOuvragesByNode(nodeId).length;
}

// =============================================================================
// Recherche Fuse.js
// =============================================================================

const FUSE_OPTIONS = {
  keys: [
    { name: 'nom', weight: 0.4 },
    { name: 'description', weight: 0.2 },
    { name: 'code', weight: 0.15 },
    { name: 'tags', weight: 0.25 },
  ],
  threshold: 0.35,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
};

let _fuseInstance = null;

/**
 * Retourne l'instance Fuse.js (lazy-initialized)
 */
export function getFuseInstance() {
  if (!_fuseInstance) {
    _fuseInstance = new Fuse(ALL_OUVRAGES, FUSE_OPTIONS);
  }
  return _fuseInstance;
}

/**
 * Recherche dans tous les ouvrages
 * @param {string} query - Terme de recherche
 * @param {number} limit - Nombre max de résultats (défaut: 50)
 * @returns {Array} Résultats avec score
 */
export function searchOuvrages(query, limit = 50) {
  if (!query || query.trim().length < 2) return [];
  const fuse = getFuseInstance();
  return fuse.search(query.trim(), { limit }).map(r => ({
    ...r.item,
    _score: r.score,
  }));
}

// =============================================================================
// Helpers de prix
// =============================================================================

/**
 * Applique le coefficient géographique à un ouvrage
 * @returns Nouvel objet ouvrage avec prix ajustés
 */
export function applyGeoCoefficient(ouvrage, departement) {
  if (!departement) return ouvrage;
  const coeff = getCoefficient(departement);
  if (coeff === 1) return ouvrage;
  return {
    ...ouvrage,
    prixUnitaireHT: Math.round(ouvrage.prixUnitaireHT * coeff * 100) / 100,
    prixMin: Math.round(ouvrage.prixMin * coeff * 100) / 100,
    prixMax: Math.round(ouvrage.prixMax * coeff * 100) / 100,
    fourniture: Math.round(ouvrage.fourniture * coeff * 100) / 100,
    mainOeuvre: Math.round(ouvrage.mainOeuvre * coeff * 100) / 100,
    materiel: Math.round(ouvrage.materiel * coeff * 100) / 100,
    _coeffGeo: coeff,
    _prixOriginal: ouvrage.prixUnitaireHT,
  };
}

/**
 * Convertit un ouvrage en ligne de devis
 */
export function ouvrageToLigneDevis(ouvrage, quantite = 1, departement = null) {
  const adjusted = departement ? applyGeoCoefficient(ouvrage, departement) : ouvrage;
  return {
    designation: adjusted.nom,
    description: adjusted.description,
    unite: adjusted.unite,
    quantite,
    prixUnitaire: adjusted.prixUnitaireHT,
    prixAchat: adjusted.fourniture + adjusted.materiel,
    tva: adjusted.tva,
    _ouvrageId: adjusted.id,
    _ouvrageCode: adjusted.code,
  };
}

// =============================================================================
// Statistiques
// =============================================================================

export const STATS = {
  totalOuvrages: ALL_OUVRAGES.length,
  totalLots: LOTS.length,
  totalChapitres: NOMENCLATURE.filter(n => n.type === 'chapitre').length,
  totalCorps: NOMENCLATURE.filter(n => n.type === 'corps').length,
};

// =============================================================================
// Re-exports
// =============================================================================

export {
  NOMENCLATURE,
  LOTS,
  getChildren,
  getNodeById,
  getPath,
  getAllDescendants,
  DEPARTEMENTS,
  getCoefficient,
  applyCoefficient,
  getRegions,
  getDepartementsByRegion,
  OUVRAGES_PAR_LOT,
};
