/**
 * Task Templates by Profession and Project Type
 * Pre-filled tasks for artisans to quickly set up their chantier
 */

// Taches communes par metier
export const TASK_TEMPLATES_BY_METIER = {
  plombier: {
    label: 'Plomberie',
    phases: ['Preparation', 'Depose', 'Pose', 'Raccordements', 'Tests', 'Finitions'],
    quickTasks: [
      'Couper l\'eau',
      'Proteger les sols',
      'Deposer anciens equipements',
      'Evacuer gravats',
      'Test etancheite',
      'Nettoyage final'
    ],
    projects: {
      'salle-de-bain': [
        { text: 'Protection sols et murs', phase: 'Preparation' },
        { text: 'Coupure eau generale', phase: 'Preparation' },
        { text: 'Depose sanitaires existants', phase: 'Depose' },
        { text: 'Depose robinetterie', phase: 'Depose' },
        { text: 'Evacuation gravats', phase: 'Depose' },
        { text: 'Pose receveur douche', phase: 'Pose' },
        { text: 'Pose WC suspendu', phase: 'Pose' },
        { text: 'Pose meuble vasque', phase: 'Pose' },
        { text: 'Installation robinetterie', phase: 'Raccordements' },
        { text: 'Raccordement evacuations', phase: 'Raccordements' },
        { text: 'Raccordement eau chaude/froide', phase: 'Raccordements' },
        { text: 'Test etancheite', phase: 'Tests' },
        { text: 'Verification pressions', phase: 'Tests' },
        { text: 'Joints silicone', phase: 'Finitions' },
        { text: 'Nettoyage chantier', phase: 'Finitions' }
      ],
      'chauffe-eau': [
        { text: 'Coupure alimentation electrique', phase: 'Preparation' },
        { text: 'Coupure eau', phase: 'Preparation' },
        { text: 'Vidange ancien ballon', phase: 'Depose' },
        { text: 'Depose ancien chauffe-eau', phase: 'Depose' },
        { text: 'Pose nouveau ballon', phase: 'Pose' },
        { text: 'Installation groupe securite', phase: 'Raccordements' },
        { text: 'Raccordement eau', phase: 'Raccordements' },
        { text: 'Raccordement electrique', phase: 'Raccordements' },
        { text: 'Remplissage et purge', phase: 'Tests' },
        { text: 'Mise en service', phase: 'Tests' },
        { text: 'Verification etancheite', phase: 'Tests' }
      ],
      'cuisine': [
        { text: 'Protection sols', phase: 'Preparation' },
        { text: 'Coupure eau', phase: 'Preparation' },
        { text: 'Depose ancien evier', phase: 'Depose' },
        { text: 'Pose nouvel evier', phase: 'Pose' },
        { text: 'Installation mitigeur', phase: 'Raccordements' },
        { text: 'Raccordement lave-vaisselle', phase: 'Raccordements' },
        { text: 'Test etancheite', phase: 'Tests' }
      ]
    }
  },
  electricien: {
    label: 'Electricite',
    phases: ['Reperage', 'Saignees', 'Tirage cables', 'Appareillage', 'Tests', 'Finitions'],
    quickTasks: [
      'Couper disjoncteur principal',
      'Reperage circuits existants',
      'Tirage cables',
      'Pose appareillage',
      'Tests circuits',
      'Mise sous tension'
    ],
    projects: {
      'tableau': [
        { text: 'Coupure disjoncteur principal', phase: 'Reperage' },
        { text: 'Reperage circuits existants', phase: 'Reperage' },
        { text: 'Depose ancien tableau', phase: 'Saignees' },
        { text: 'Pose nouveau coffret', phase: 'Appareillage' },
        { text: 'Installation disjoncteurs', phase: 'Appareillage' },
        { text: 'Raccordement circuits', phase: 'Appareillage' },
        { text: 'Test differentiel', phase: 'Tests' },
        { text: 'Test circuits', phase: 'Tests' },
        { text: 'Etiquetage circuits', phase: 'Finitions' },
        { text: 'Mise sous tension', phase: 'Finitions' }
      ],
      'renovation': [
        { text: 'Coupure generale', phase: 'Reperage' },
        { text: 'Plan implantation', phase: 'Reperage' },
        { text: 'Tracage saignees', phase: 'Saignees' },
        { text: 'Realisation saignees', phase: 'Saignees' },
        { text: 'Pose boites encastrement', phase: 'Saignees' },
        { text: 'Tirage cables', phase: 'Tirage cables' },
        { text: 'Pose prises', phase: 'Appareillage' },
        { text: 'Pose interrupteurs', phase: 'Appareillage' },
        { text: 'Pose luminaires', phase: 'Appareillage' },
        { text: 'Raccordement tableau', phase: 'Appareillage' },
        { text: 'Tests circuits', phase: 'Tests' },
        { text: 'Rebouchage saignees', phase: 'Finitions' }
      ]
    }
  },
  peintre: {
    label: 'Peinture',
    phases: ['Preparation', 'Sous-couche', 'Peinture', 'Finitions'],
    quickTasks: [
      'Protection sols/meubles',
      'Lessivage murs',
      'Rebouchage fissures',
      'Poncage',
      'Sous-couche',
      'Peinture 1ere couche',
      'Peinture 2eme couche'
    ],
    projects: {
      'piece': [
        { text: 'Protection sols et meubles', phase: 'Preparation' },
        { text: 'Depose prises/interrupteurs', phase: 'Preparation' },
        { text: 'Lessivage murs', phase: 'Preparation' },
        { text: 'Rebouchage trous/fissures', phase: 'Preparation' },
        { text: 'Poncage', phase: 'Preparation' },
        { text: 'Depoussieriage', phase: 'Preparation' },
        { text: 'Application sous-couche', phase: 'Sous-couche' },
        { text: 'Sechage sous-couche', phase: 'Sous-couche' },
        { text: 'Peinture plafond', phase: 'Peinture' },
        { text: 'Peinture murs 1ere couche', phase: 'Peinture' },
        { text: 'Peinture murs 2eme couche', phase: 'Peinture' },
        { text: 'Repose prises/interrupteurs', phase: 'Finitions' },
        { text: 'Retouches', phase: 'Finitions' },
        { text: 'Nettoyage', phase: 'Finitions' }
      ]
    }
  },
  carreleur: {
    label: 'Carrelage',
    phases: ['Preparation', 'Pose', 'Joints', 'Finitions'],
    quickTasks: [
      'Preparation support',
      'Tracage',
      'Pose carrelage',
      'Decoupe carrelage',
      'Realisation joints',
      'Nettoyage'
    ],
    projects: {
      'sol': [
        { text: 'Verification planeite support', phase: 'Preparation' },
        { text: 'Ragréage si necessaire', phase: 'Preparation' },
        { text: 'Tracage calepinage', phase: 'Preparation' },
        { text: 'Preparation colle', phase: 'Pose' },
        { text: 'Pose carrelage', phase: 'Pose' },
        { text: 'Decoupes', phase: 'Pose' },
        { text: 'Sechage 24h', phase: 'Pose' },
        { text: 'Preparation joints', phase: 'Joints' },
        { text: 'Application joints', phase: 'Joints' },
        { text: 'Nettoyage joints', phase: 'Joints' },
        { text: 'Pose plinthes', phase: 'Finitions' },
        { text: 'Nettoyage final', phase: 'Finitions' }
      ],
      'mural': [
        { text: 'Verification support', phase: 'Preparation' },
        { text: 'Tracage ligne de depart', phase: 'Preparation' },
        { text: 'Pose tasseaux guide', phase: 'Preparation' },
        { text: 'Encollage double', phase: 'Pose' },
        { text: 'Pose faience', phase: 'Pose' },
        { text: 'Decoupes', phase: 'Pose' },
        { text: 'Retrait tasseaux', phase: 'Pose' },
        { text: 'Jointement', phase: 'Joints' },
        { text: 'Nettoyage', phase: 'Finitions' }
      ]
    }
  },
  macon: {
    label: 'Maconnerie',
    phases: ['Fondations', 'Elevation', 'Couverture', 'Finitions'],
    quickTasks: [
      'Tracage implantation',
      'Terrassement',
      'Coffrage',
      'Ferraillage',
      'Coulage beton',
      'Elevation murs'
    ],
    projects: {
      'extension': [
        { text: 'Implantation', phase: 'Fondations' },
        { text: 'Terrassement', phase: 'Fondations' },
        { text: 'Coffrage semelles', phase: 'Fondations' },
        { text: 'Ferraillage', phase: 'Fondations' },
        { text: 'Coulage beton', phase: 'Fondations' },
        { text: 'Montage parpaings', phase: 'Elevation' },
        { text: 'Linteaux', phase: 'Elevation' },
        { text: 'Chainage', phase: 'Elevation' },
        { text: 'Dalle', phase: 'Elevation' }
      ],
      'mur': [
        { text: 'Tracage', phase: 'Fondations' },
        { text: 'Semelle beton', phase: 'Fondations' },
        { text: 'Montage premiere rangee', phase: 'Elevation' },
        { text: 'Elevation mur', phase: 'Elevation' },
        { text: 'Joints', phase: 'Finitions' }
      ]
    }
  },
  menuisier: {
    label: 'Menuiserie',
    phases: ['Prise mesures', 'Depose', 'Pose', 'Finitions'],
    quickTasks: [
      'Prise de cotes',
      'Depose ancien',
      'Preparation ouverture',
      'Pose dormant',
      'Pose ouvrant',
      'Reglages'
    ],
    projects: {
      'fenetre': [
        { text: 'Verification cotes', phase: 'Prise mesures' },
        { text: 'Protection sols', phase: 'Depose' },
        { text: 'Depose ancienne fenetre', phase: 'Depose' },
        { text: 'Nettoyage tableau', phase: 'Depose' },
        { text: 'Pose dormant', phase: 'Pose' },
        { text: 'Calage et fixation', phase: 'Pose' },
        { text: 'Pose ouvrant', phase: 'Pose' },
        { text: 'Reglages', phase: 'Finitions' },
        { text: 'Joints mousse', phase: 'Finitions' },
        { text: 'Finitions interieures', phase: 'Finitions' }
      ],
      'porte': [
        { text: 'Verification cotes', phase: 'Prise mesures' },
        { text: 'Depose ancienne porte', phase: 'Depose' },
        { text: 'Pose bloc-porte', phase: 'Pose' },
        { text: 'Calage et fixation', phase: 'Pose' },
        { text: 'Reglages charnières', phase: 'Finitions' },
        { text: 'Pose quincaillerie', phase: 'Finitions' }
      ]
    }
  },
  general: {
    label: 'General',
    phases: ['Preparation', 'Travaux', 'Finitions'],
    quickTasks: [
      'Protection chantier',
      'Approvisionnement',
      'Travaux principaux',
      'Nettoyage',
      'Reception client'
    ],
    projects: {}
  }
};

// Taches rapides universelles
export const QUICK_TASKS = [
  { text: 'Protection chantier', icon: 'Shield' },
  { text: 'Approvisionnement materiel', icon: 'Truck' },
  { text: 'Evacuation gravats', icon: 'Trash2' },
  { text: 'Nettoyage fin de journee', icon: 'Sparkles' },
  { text: 'Photo avant travaux', icon: 'Camera' },
  { text: 'Photo apres travaux', icon: 'Camera' },
  { text: 'Point client', icon: 'Users' },
  { text: 'Commande materiel', icon: 'ShoppingCart' }
];

// Fonction pour obtenir les taches suggérées depuis un devis
export function suggestTasksFromDevis(devisLignes) {
  if (!devisLignes || devisLignes.length === 0) return [];

  return devisLignes
    .filter(l => l.description && l.description.length > 5)
    .map(ligne => ({
      text: ligne.description.substring(0, 60),
      source: 'devis',
      suggested: true,
      quantity: ligne.quantite,
      unit: ligne.unite
    }));
}

// Fonction pour obtenir les templates selon le metier
export function getTaskTemplatesForMetier(metier) {
  const normalized = metier?.toLowerCase().replace(/[éè]/g, 'e').replace(/[àâ]/g, 'a');

  // Map variations to standard keys
  const metierMap = {
    'plombier': 'plombier',
    'plomberie': 'plombier',
    'electricien': 'electricien',
    'electricite': 'electricien',
    'peintre': 'peintre',
    'peinture': 'peintre',
    'carreleur': 'carreleur',
    'carrelage': 'carreleur',
    'macon': 'macon',
    'maconnerie': 'macon',
    'menuisier': 'menuisier',
    'menuiserie': 'menuisier'
  };

  const key = metierMap[normalized] || 'general';
  return TASK_TEMPLATES_BY_METIER[key] || TASK_TEMPLATES_BY_METIER.general;
}
