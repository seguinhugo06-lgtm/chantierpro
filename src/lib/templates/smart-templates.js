/**
 * Smart Templates - Modèles métiers avec prix ajustables
 * Permet de créer un devis professionnel en 2 clics
 */

export const SMART_TEMPLATES = {
  maconnerie: {
    id: 'maconnerie',
    nom: 'Maçonnerie',
    icon: '🧱',
    color: '#78716c',
    missions: [
      { id: 'mur-parpaings', nom: 'Construction d\'un mur en parpaings (100 m²)', prixMin: 5000, prixMax: 8000, unite: 'forfait' },
      { id: 'fondations', nom: 'Pose de fondations pour maison individuelle', prixMin: 3000, prixMax: 6000, unite: 'forfait' },
      { id: 'renovation-facade', nom: 'Rénovation de façade', prixMin: 2000, prixMax: 5000, unite: 'forfait' },
      { id: 'dalle-beton', nom: 'Coulage de dalle béton (50 m²)', prixMin: 2500, prixMax: 4000, unite: 'forfait' },
      { id: 'cloison-brique', nom: 'Montage de cloison en brique', prixMin: 1500, prixMax: 3000, unite: 'forfait' }
    ]
  },
  plomberie: {
    id: 'plomberie',
    nom: 'Plomberie',
    icon: '🔧',
    color: '#3b82f6',
    missions: [
      { id: 'install-complete', nom: 'Installation complète de plomberie pour maison 120 m²', prixMin: 8000, prixMax: 17000, unite: 'forfait' },
      { id: 'chauffe-eau', nom: 'Remplacement de chauffe-eau', prixMin: 500, prixMax: 1500, unite: 'forfait' },
      { id: 'fuite-eau', nom: 'Réparation de fuite d\'eau', prixMin: 200, prixMax: 500, unite: 'forfait' },
      { id: 'salle-bain', nom: 'Installation de salle de bain', prixMin: 3000, prixMax: 6000, unite: 'forfait' },
      { id: 'reseau-evacuation', nom: 'Pose de réseau d\'évacuation', prixMin: 1000, prixMax: 3000, unite: 'forfait' }
    ]
  },
  electricite: {
    id: 'electricite',
    nom: 'Électricité',
    icon: '⚡',
    color: '#eab308',
    missions: [
      { id: 'install-complete', nom: 'Installation électrique complète pour maison 100 m²', prixMin: 5000, prixMax: 10000, unite: 'forfait' },
      { id: 'tableau-normes', nom: 'Mise aux normes tableau électrique', prixMin: 1000, prixMax: 2500, unite: 'forfait' },
      { id: 'prises-interrupteurs', nom: 'Pose de prises et interrupteurs (10 unités)', prixMin: 500, prixMax: 1000, unite: 'forfait' },
      { id: 'eclairage-exterieur', nom: 'Installation d\'éclairage extérieur', prixMin: 800, prixMax: 2000, unite: 'forfait' },
      { id: 'cablage-ancien', nom: 'Rénovation câblage ancien', prixMin: 2000, prixMax: 5000, unite: 'forfait' }
    ]
  },
  peinture: {
    id: 'peinture',
    nom: 'Peinture',
    icon: '🎨',
    color: '#ec4899',
    missions: [
      { id: 'piece-interieure', nom: 'Peinture intérieure d\'une pièce (20 m²)', prixMin: 400, prixMax: 800, unite: 'forfait' },
      { id: 'facade-exterieure', nom: 'Peinture façade extérieure (100 m²)', prixMin: 2000, prixMax: 4000, unite: 'forfait' },
      { id: 'plafond', nom: 'Préparation et peinture plafond', prixMin: 300, prixMax: 600, unite: 'forfait' },
      { id: 'decorative', nom: 'Application de peinture décorative', prixMin: 500, prixMax: 1000, unite: 'forfait' },
      { id: 'renovation-ancien', nom: 'Rénovation peinture sur support ancien (50 m²)', prixMin: 1000, prixMax: 2000, unite: 'forfait' }
    ]
  },
  charpente: {
    id: 'charpente',
    nom: 'Charpente',
    icon: '🪵',
    color: '#a16207',
    missions: [
      { id: 'charpente-bois', nom: 'Pose de charpente bois traditionnelle (100 m²)', prixMin: 4500, prixMax: 8000, unite: 'forfait' },
      { id: 'reparation', nom: 'Réparation de charpente endommagée', prixMin: 6000, prixMax: 30000, unite: 'forfait' },
      { id: 'traitement-insectes', nom: 'Traitement contre insectes (100 m²)', prixMin: 1000, prixMax: 2000, unite: 'forfait' },
      { id: 'charpente-metal', nom: 'Installation charpente métallique', prixMin: 5000, prixMax: 10000, unite: 'forfait' },
      { id: 'renforcement', nom: 'Renforcement structurel', prixMin: 3000, prixMax: 6000, unite: 'forfait' }
    ]
  },
  couverture: {
    id: 'couverture',
    nom: 'Couverture (Toiture)',
    icon: '🏠',
    color: '#dc2626',
    missions: [
      { id: 'toiture-tuiles', nom: 'Pose de toiture en tuiles (100 m²)', prixMin: 5500, prixMax: 6500, unite: 'forfait' },
      { id: 'renovation-complete', nom: 'Rénovation complète toiture (100 m²)', prixMin: 13000, prixMax: 26000, unite: 'forfait' },
      { id: 'toiture-ardoise', nom: 'Installation toiture ardoise (100 m²)', prixMin: 6000, prixMax: 6500, unite: 'forfait' },
      { id: 'fuites', nom: 'Réparation fuites toiture', prixMin: 500, prixMax: 2000, unite: 'forfait' },
      { id: 'bac-acier', nom: 'Pose de toiture bac acier (100 m²)', prixMin: 3000, prixMax: 5000, unite: 'forfait' }
    ]
  },
  menuiserie: {
    id: 'menuiserie',
    nom: 'Menuiserie',
    icon: '🪚',
    color: '#854d0e',
    missions: [
      { id: 'fenetres-pvc', nom: 'Pose de fenêtres PVC (5 unités)', prixMin: 2000, prixMax: 4000, unite: 'forfait' },
      { id: 'porte-entree', nom: 'Installation porte d\'entrée', prixMin: 800, prixMax: 2000, unite: 'forfait' },
      { id: 'escalier-bois', nom: 'Fabrication et pose escalier bois', prixMin: 3000, prixMax: 6000, unite: 'forfait' },
      { id: 'parquet', nom: 'Pose de parquet (50 m²)', prixMin: 1500, prixMax: 3000, unite: 'forfait' },
      { id: 'placard', nom: 'Aménagement placard sur mesure', prixMin: 1000, prixMax: 2500, unite: 'forfait' }
    ]
  },
  serrurerie: {
    id: 'serrurerie',
    nom: 'Serrurerie',
    icon: '🔐',
    color: '#6b7280',
    missions: [
      { id: 'serrure-securite', nom: 'Installation serrure haute sécurité', prixMin: 200, prixMax: 500, unite: 'forfait' },
      { id: 'portail', nom: 'Pose de portail métallique', prixMin: 1500, prixMax: 3000, unite: 'forfait' },
      { id: 'volet-roulant', nom: 'Réparation volet roulant', prixMin: 300, prixMax: 800, unite: 'forfait' },
      { id: 'grille-protection', nom: 'Fabrication grille de protection', prixMin: 500, prixMax: 1500, unite: 'forfait' },
      { id: 'ouverture-porte', nom: 'Ouverture porte claquée', prixMin: 100, prixMax: 300, unite: 'forfait' }
    ]
  },
  vitrerie: {
    id: 'vitrerie',
    nom: 'Vitrerie',
    icon: '🪟',
    color: '#06b6d4',
    missions: [
      { id: 'vitre-simple', nom: 'Remplacement vitre simple (1 m²)', prixMin: 100, prixMax: 300, unite: 'forfait' },
      { id: 'double-vitrage', nom: 'Installation double vitrage (5 m²)', prixMin: 500, prixMax: 1000, unite: 'forfait' },
      { id: 'miroir', nom: 'Pose de miroir sur mesure', prixMin: 200, prixMax: 500, unite: 'forfait' },
      { id: 'fenetre-cassee', nom: 'Réparation fenêtre cassée', prixMin: 150, prixMax: 400, unite: 'forfait' },
      { id: 'vitrine', nom: 'Installation vitrine commerciale', prixMin: 1000, prixMax: 3000, unite: 'forfait' }
    ]
  },
  platrerie: {
    id: 'platrerie',
    nom: 'Plâtrerie',
    icon: '🏗️',
    color: '#f5f5f4',
    missions: [
      { id: 'plaques-platre', nom: 'Pose de plaques de plâtre (50 m²)', prixMin: 1500, prixMax: 3000, unite: 'forfait' },
      { id: 'enduit-lissage', nom: 'Enduit et lissage murs', prixMin: 800, prixMax: 2000, unite: 'forfait' },
      { id: 'cloison-placo', nom: 'Création cloison placo', prixMin: 1000, prixMax: 2500, unite: 'forfait' },
      { id: 'isolation-platre', nom: 'Isolation plâtre (50 m²)', prixMin: 2000, prixMax: 4000, unite: 'forfait' },
      { id: 'fissures-plafond', nom: 'Réparation fissures plafond', prixMin: 300, prixMax: 800, unite: 'forfait' }
    ]
  },
  carrelage: {
    id: 'carrelage',
    nom: 'Carrelage',
    icon: '🔲',
    color: '#0ea5e9',
    missions: [
      { id: 'carrelage-sol', nom: 'Pose carrelage sol (50 m²)', prixMin: 2000, prixMax: 5000, unite: 'forfait' },
      { id: 'carrelage-mural', nom: 'Carrelage mural salle de bain', prixMin: 1000, prixMax: 3000, unite: 'forfait' },
      { id: 'carrelage-exterieur', nom: 'Rénovation carrelage extérieur (30 m²)', prixMin: 1500, prixMax: 4000, unite: 'forfait' },
      { id: 'jointoiement', nom: 'Jointoiement et finition', prixMin: 500, prixMax: 1000, unite: 'forfait' },
      { id: 'mosaique', nom: 'Pose mosaïque', prixMin: 800, prixMax: 2000, unite: 'forfait' }
    ]
  },
  chauffage: {
    id: 'chauffage',
    nom: 'Chauffage / Climatisation',
    icon: '🌡️',
    color: '#f97316',
    missions: [
      { id: 'clim-monosplit', nom: 'Installation climatisation réversible monosplit', prixMin: 2000, prixMax: 5000, unite: 'forfait' },
      { id: 'pac-air-air', nom: 'Pose pompe à chaleur air-air', prixMin: 4000, prixMax: 15000, unite: 'forfait' },
      { id: 'chaudiere-gaz', nom: 'Remplacement chaudière gaz', prixMin: 3000, prixMax: 6000, unite: 'forfait' },
      { id: 'radiateurs', nom: 'Installation radiateurs (5 unités)', prixMin: 1500, prixMax: 3000, unite: 'forfait' },
      { id: 'maintenance', nom: 'Maintenance système chauffage', prixMin: 200, prixMax: 500, unite: 'forfait' }
    ]
  },
  paysagisme: {
    id: 'paysagisme',
    nom: 'Paysagisme / Jardinerie',
    icon: '🌳',
    color: '#22c55e',
    creditImpot: true,
    missions: [
      { id: 'amenagement-jardin', nom: 'Aménagement jardin 200 m²', prixMin: 2000, prixMax: 5000, unite: 'forfait' },
      { id: 'entretien-annuel', nom: 'Entretien annuel espaces verts', prixMin: 500, prixMax: 1500, unite: 'forfait' },
      { id: 'plantation-haie', nom: 'Plantation haie (50 m)', prixMin: 1000, prixMax: 2000, unite: 'forfait' },
      { id: 'arrosage-auto', nom: 'Installation arrosage automatique', prixMin: 800, prixMax: 3000, unite: 'forfait' },
      { id: 'tonte-taille', nom: 'Tonte pelouse et taille arbustes', prixMin: 200, prixMax: 500, unite: 'intervention' }
    ]
  },
  terrassement: {
    id: 'terrassement',
    nom: 'Terrassement',
    icon: '🚜',
    color: '#92400e',
    missions: [
      { id: 'terrassement-terrain', nom: 'Terrassement terrain 500 m²', prixMin: 15000, prixMax: 33000, unite: 'forfait' },
      { id: 'creusage-fondations', nom: 'Creusage fondations', prixMin: 5000, prixMax: 15000, unite: 'forfait' },
      { id: 'nivellement', nom: 'Nivellement sol', prixMin: 3000, prixMax: 6000, unite: 'forfait' },
      { id: 'enlevement-terre', nom: 'Enlèvement terre et gravats', prixMin: 2000, prixMax: 5000, unite: 'forfait' },
      { id: 'chemin-acces', nom: 'Création chemin d\'accès (50 m²)', prixMin: 1000, prixMax: 5000, unite: 'forfait' }
    ]
  },
  demolition: {
    id: 'demolition',
    nom: 'Démolition',
    icon: '🔨',
    color: '#991b1b',
    missions: [
      { id: 'demolition-maison', nom: 'Démolition maison 100 m²', prixMin: 20000, prixMax: 40000, unite: 'forfait' },
      { id: 'mur-porteur', nom: 'Démolition mur porteur', prixMin: 1000, prixMax: 3000, unite: 'forfait' },
      { id: 'evacuation-debris', nom: 'Évacuation débris', prixMin: 500, prixMax: 2000, unite: 'forfait' },
      { id: 'demolition-cloisons', nom: 'Démolition intérieure (cloisons)', prixMin: 1500, prixMax: 4000, unite: 'forfait' },
      { id: 'demolition-mecanique', nom: 'Démolition mécanique bâtiment', prixMin: 8000, prixMax: 20000, unite: 'forfait' }
    ]
  },
  etancheite: {
    id: 'etancheite',
    nom: 'Étanchéité',
    icon: '💧',
    color: '#0284c7',
    missions: [
      { id: 'toiture-terrasse', nom: 'Étanchéité toiture terrasse (50 m²)', prixMin: 2000, prixMax: 4250, unite: 'forfait' },
      { id: 'humidite-murs', nom: 'Traitement humidité murs', prixMin: 1000, prixMax: 3000, unite: 'forfait' },
      { id: 'membrane-bitume', nom: 'Pose membrane bitumineuse', prixMin: 1500, prixMax: 4000, unite: 'forfait' },
      { id: 'balcon', nom: 'Étanchéité balcon', prixMin: 800, prixMax: 2000, unite: 'forfait' },
      { id: 'infiltration', nom: 'Réparation infiltration', prixMin: 500, prixMax: 1500, unite: 'forfait' }
    ]
  },
  isolation: {
    id: 'isolation',
    nom: 'Isolation',
    icon: '🧊',
    color: '#8b5cf6',
    missions: [
      { id: 'ite-murs', nom: 'Isolation extérieure murs (100 m²)', prixMin: 12000, prixMax: 27000, unite: 'forfait' },
      { id: 'combles-perdus', nom: 'Isolation combles perdus (100 m²)', prixMin: 1500, prixMax: 4000, unite: 'forfait' },
      { id: 'iti-murs', nom: 'Isolation intérieure murs (50 m²)', prixMin: 2500, prixMax: 5000, unite: 'forfait' },
      { id: 'isolation-sols', nom: 'Isolation sols', prixMin: 1500, prixMax: 4500, unite: 'forfait' },
      { id: 'toiture-interieur', nom: 'Isolation toiture par l\'intérieur', prixMin: 2000, prixMax: 10000, unite: 'forfait' }
    ]
  }
};

/**
 * Get all métiers for selection
 */
export function getMetiers() {
  return Object.values(SMART_TEMPLATES).map(m => ({
    id: m.id,
    nom: m.nom,
    icon: m.icon,
    color: m.color,
    missionsCount: m.missions.length,
    creditImpot: m.creditImpot || false
  }));
}

/**
 * Get missions for a specific métier
 */
export function getMissions(metierId) {
  return SMART_TEMPLATES[metierId]?.missions || [];
}

/**
 * Get a specific mission
 */
export function getMission(metierId, missionId) {
  const metier = SMART_TEMPLATES[metierId];
  if (!metier) return null;
  return metier.missions.find(m => m.id === missionId) || null;
}

/**
 * Calculate default price (middle of range)
 */
export function getDefaultPrice(mission) {
  return Math.round((mission.prixMin + mission.prixMax) / 2);
}

/**
 * Format price for display
 */
export function formatPriceRange(mission) {
  return `${mission.prixMin.toLocaleString('fr-FR')} € - ${mission.prixMax.toLocaleString('fr-FR')} €`;
}

export default SMART_TEMPLATES;
