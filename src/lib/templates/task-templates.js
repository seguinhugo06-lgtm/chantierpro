/**
 * Task Templates - Système complet de gestion des tâches par phase
 * Tâches organisées par catégorie et phase de chantier
 */

// === PHASES UNIVERSELLES ===
export const PHASES = [
  { id: 'preparation', label: 'Préparation', icon: 'ClipboardList', color: '#3b82f6' },
  { id: 'demolition', label: 'Démolition / Dépose', icon: 'Hammer', color: '#ef4444' },
  { id: 'gros-oeuvre', label: 'Gros œuvre', icon: 'Building2', color: '#f59e0b' },
  { id: 'second-oeuvre', label: 'Second œuvre', icon: 'Wrench', color: '#8b5cf6' },
  { id: 'finitions', label: 'Finitions', icon: 'Paintbrush', color: '#10b981' },
  { id: 'nettoyage', label: 'Nettoyage / Réception', icon: 'Sparkles', color: '#06b6d4' }
];

// === TÂCHES COMMUNES À TOUS LES CHANTIERS ===
export const COMMON_TASKS = {
  preparation: [
    { text: 'Visite technique préalable', critical: false },
    { text: 'Établir le planning', critical: false },
    { text: 'Commander les matériaux', critical: true },
    { text: 'Vérifier livraison matériaux', critical: true },
    { text: 'Protection sols et meubles', critical: false },
    { text: 'Installation zone de travail', critical: false },
    { text: 'Coupure eau / électricité si nécessaire', critical: true },
    { text: 'Photos état des lieux avant', critical: true },
    { text: 'Informer voisinage si nécessaire', critical: false }
  ],
  demolition: [
    { text: 'Dépose équipements existants', critical: false },
    { text: 'Démolition cloisons / murs', critical: false },
    { text: 'Évacuation gravats', critical: false },
    { text: 'Tri et recyclage déchets', critical: false }
  ],
  finitions: [
    { text: 'Retouches peinture', critical: false },
    { text: 'Pose plinthes et finitions', critical: false },
    { text: 'Vérification générale', critical: true },
    { text: 'Liste des réserves', critical: false }
  ],
  nettoyage: [
    { text: 'Nettoyage complet du chantier', critical: true },
    { text: 'Évacuation derniers déchets', critical: false },
    { text: 'Photos état des lieux après', critical: true },
    { text: 'Visite de réception client', critical: true },
    { text: 'Signature PV de réception', critical: true },
    { text: 'Remise des clés / documents', critical: false }
  ]
};

// === TÂCHES PAR MÉTIER ===
export const TASKS_BY_METIER = {
  plombier: {
    label: 'Plomberie',
    icon: 'Droplets',
    phases: {
      preparation: [
        { text: 'Repérage arrivées eau', critical: true },
        { text: 'Repérage évacuations', critical: true },
        { text: 'Vérification pression eau', critical: false }
      ],
      demolition: [
        { text: 'Fermeture eau générale', critical: true },
        { text: 'Vidange circuits', critical: false },
        { text: 'Dépose robinetterie', critical: false },
        { text: 'Dépose sanitaires', critical: false },
        { text: 'Dépose tuyauterie', critical: false }
      ],
      'gros-oeuvre': [
        { text: 'Passage des évacuations', critical: true },
        { text: 'Passage alimentation eau', critical: true },
        { text: 'Installation nourrices', critical: false },
        { text: 'Pose chauffe-eau / ballon', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Pose WC', critical: false },
        { text: 'Pose lavabo / vasque', critical: false },
        { text: 'Pose douche / baignoire', critical: false },
        { text: 'Pose robinetterie', critical: false },
        { text: 'Raccordement lave-linge', critical: false },
        { text: 'Raccordement lave-vaisselle', critical: false },
        { text: 'Installation chasse d\'eau', critical: false }
      ],
      finitions: [
        { text: 'Test étanchéité', critical: true },
        { text: 'Vérification pressions', critical: true },
        { text: 'Réglage mitigeurs', critical: false },
        { text: 'Joints silicone', critical: false },
        { text: 'Fixation accessoires (porte-serviette, etc.)', critical: false }
      ]
    }
  },
  electricien: {
    label: 'Électricité',
    icon: 'Zap',
    phases: {
      preparation: [
        { text: 'Repérage tableau existant', critical: true },
        { text: 'Plan d\'implantation', critical: false },
        { text: 'Calcul puissance nécessaire', critical: false }
      ],
      demolition: [
        { text: 'Coupure disjoncteur général', critical: true },
        { text: 'Dépose ancien tableau', critical: false },
        { text: 'Dépose ancien appareillage', critical: false },
        { text: 'Retrait anciens câbles', critical: false }
      ],
      'gros-oeuvre': [
        { text: 'Traçage saignées', critical: false },
        { text: 'Réalisation saignées', critical: false },
        { text: 'Pose gaines ICTA', critical: false },
        { text: 'Pose boîtes d\'encastrement', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Tirage des câbles', critical: true },
        { text: 'Pose tableau électrique', critical: true },
        { text: 'Câblage tableau', critical: true },
        { text: 'Pose prises de courant', critical: false },
        { text: 'Pose interrupteurs', critical: false },
        { text: 'Pose luminaires', critical: false },
        { text: 'Installation VMC', critical: false },
        { text: 'Pose détecteurs fumée', critical: true }
      ],
      finitions: [
        { text: 'Test différentiel', critical: true },
        { text: 'Test circuits', critical: true },
        { text: 'Vérification terre', critical: true },
        { text: 'Étiquetage tableau', critical: false },
        { text: 'Rebouchage saignées', critical: false },
        { text: 'Mise sous tension', critical: true }
      ]
    }
  },
  peintre: {
    label: 'Peinture',
    icon: 'Paintbrush',
    phases: {
      preparation: [
        { text: 'Lessivage murs et plafonds', critical: false },
        { text: 'Décapage anciennes peintures', critical: false },
        { text: 'Ponçage surfaces', critical: false },
        { text: 'Rebouchage trous et fissures', critical: true },
        { text: 'Application enduit de lissage', critical: false },
        { text: 'Ponçage enduit', critical: false },
        { text: 'Dépoussiérage', critical: false }
      ],
      demolition: [
        { text: 'Dépose papier peint', critical: false },
        { text: 'Dépose ancien revêtement', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Application sous-couche plafond', critical: false },
        { text: 'Application sous-couche murs', critical: false },
        { text: 'Peinture plafond 1ère couche', critical: false },
        { text: 'Peinture plafond 2ème couche', critical: false },
        { text: 'Peinture murs 1ère couche', critical: false },
        { text: 'Peinture murs 2ème couche', critical: false },
        { text: 'Peinture boiseries', critical: false },
        { text: 'Pose papier peint', critical: false }
      ],
      finitions: [
        { text: 'Retouches', critical: false },
        { text: 'Filets et raccords', critical: false },
        { text: 'Repose caches prises/interrupteurs', critical: false }
      ]
    }
  },
  carreleur: {
    label: 'Carrelage',
    icon: 'Grid3x3',
    phases: {
      preparation: [
        { text: 'Vérification planéité support', critical: true },
        { text: 'Ragréage si nécessaire', critical: false },
        { text: 'Traçage calepinage', critical: true },
        { text: 'Découpe carreaux de réserve', critical: false }
      ],
      demolition: [
        { text: 'Dépose ancien carrelage', critical: false },
        { text: 'Nettoyage support', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Pose carrelage sol', critical: false },
        { text: 'Pose faïence murale', critical: false },
        { text: 'Découpes autour obstacles', critical: false },
        { text: 'Séchage (24-48h)', critical: true }
      ],
      finitions: [
        { text: 'Préparation joints', critical: false },
        { text: 'Application joints', critical: false },
        { text: 'Nettoyage joints', critical: false },
        { text: 'Pose plinthes carrelage', critical: false },
        { text: 'Joint silicone périphérique', critical: false }
      ]
    }
  },
  macon: {
    label: 'Maçonnerie',
    icon: 'Landmark',
    phases: {
      preparation: [
        { text: 'Implantation chantier', critical: true },
        { text: 'Piquetage', critical: false },
        { text: 'Déclaration travaux si nécessaire', critical: true }
      ],
      demolition: [
        { text: 'Terrassement', critical: false },
        { text: 'Démolition existant', critical: false },
        { text: 'Évacuation terres', critical: false }
      ],
      'gros-oeuvre': [
        { text: 'Coffrage semelles', critical: false },
        { text: 'Ferraillage', critical: true },
        { text: 'Coulage béton fondations', critical: true },
        { text: 'Montage parpaings/briques', critical: false },
        { text: 'Pose linteaux', critical: true },
        { text: 'Chaînage horizontal', critical: true },
        { text: 'Chaînage vertical', critical: true },
        { text: 'Dalle béton', critical: true }
      ],
      finitions: [
        { text: 'Enduit extérieur', critical: false },
        { text: 'Enduit intérieur', critical: false },
        { text: 'Joints de dilatation', critical: false }
      ]
    }
  },
  menuisier: {
    label: 'Menuiserie',
    icon: 'DoorOpen',
    phases: {
      preparation: [
        { text: 'Prise de cotes', critical: true },
        { text: 'Vérification équerrage', critical: false },
        { text: 'Commande menuiseries', critical: true }
      ],
      demolition: [
        { text: 'Dépose anciennes fenêtres', critical: false },
        { text: 'Dépose anciennes portes', critical: false },
        { text: 'Nettoyage tableaux', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Pose fenêtres', critical: false },
        { text: 'Pose portes intérieures', critical: false },
        { text: 'Pose porte d\'entrée', critical: false },
        { text: 'Pose volets', critical: false },
        { text: 'Pose placards', critical: false },
        { text: 'Pose cuisine', critical: false }
      ],
      finitions: [
        { text: 'Calage et fixation définitive', critical: true },
        { text: 'Réglage charnières', critical: false },
        { text: 'Pose quincaillerie', critical: false },
        { text: 'Joint mousse isolation', critical: false },
        { text: 'Habillage tableaux', critical: false }
      ]
    }
  },
  chauffagiste: {
    label: 'Chauffage / Climatisation',
    icon: 'Thermometer',
    phases: {
      preparation: [
        { text: 'Étude thermique', critical: false },
        { text: 'Dimensionnement installation', critical: true }
      ],
      demolition: [
        { text: 'Dépose ancienne chaudière', critical: false },
        { text: 'Dépose radiateurs', critical: false },
        { text: 'Vidange circuit', critical: true }
      ],
      'gros-oeuvre': [
        { text: 'Passage gaines', critical: false },
        { text: 'Percement murs extérieurs', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Pose chaudière / PAC', critical: true },
        { text: 'Installation unités intérieures', critical: false },
        { text: 'Installation unité extérieure', critical: false },
        { text: 'Pose radiateurs', critical: false },
        { text: 'Tirage tuyauterie', critical: false },
        { text: 'Raccordement gaz', critical: true },
        { text: 'Raccordement électrique', critical: true }
      ],
      finitions: [
        { text: 'Mise en eau circuit', critical: true },
        { text: 'Purge radiateurs', critical: false },
        { text: 'Mise en service', critical: true },
        { text: 'Équilibrage réseau', critical: false },
        { text: 'Programmation thermostat', critical: false },
        { text: 'Certificat conformité gaz', critical: true }
      ]
    }
  },
  couvreur: {
    label: 'Couverture',
    icon: 'Home',
    phases: {
      preparation: [
        { text: 'Installation échafaudage', critical: true },
        { text: 'Sécurisation zone travail', critical: true }
      ],
      demolition: [
        { text: 'Dépose ancienne couverture', critical: false },
        { text: 'Dépose gouttières', critical: false },
        { text: 'Retrait isolation existante', critical: false }
      ],
      'gros-oeuvre': [
        { text: 'Réparation charpente si nécessaire', critical: true },
        { text: 'Pose écran sous-toiture', critical: false },
        { text: 'Pose liteaux', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Pose tuiles/ardoises', critical: false },
        { text: 'Pose faîtage', critical: false },
        { text: 'Pose rives', critical: false },
        { text: 'Installation Velux', critical: false },
        { text: 'Pose gouttières', critical: false },
        { text: 'Pose descentes EP', critical: false }
      ],
      finitions: [
        { text: 'Étanchéité pénétrations', critical: true },
        { text: 'Pose solins', critical: false },
        { text: 'Nettoyage toiture', critical: false },
        { text: 'Test étanchéité', critical: true }
      ]
    }
  },
  platrier: {
    label: 'Plâtrerie / Placo',
    icon: 'Layers',
    phases: {
      preparation: [
        { text: 'Traçage cloisons', critical: true },
        { text: 'Repérage réseaux existants', critical: true }
      ],
      'gros-oeuvre': [
        { text: 'Pose rails sol/plafond', critical: false },
        { text: 'Pose montants', critical: false },
        { text: 'Passage gaines électriques', critical: true },
        { text: 'Pose isolant', critical: false }
      ],
      'second-oeuvre': [
        { text: 'Pose plaques 1ère face', critical: false },
        { text: 'Pose plaques 2ème face', critical: false },
        { text: 'Découpes autour obstacles', critical: false },
        { text: 'Pose faux-plafond', critical: false }
      ],
      finitions: [
        { text: 'Bandes à joints', critical: true },
        { text: 'Enduit de finition', critical: false },
        { text: 'Ponçage joints', critical: false },
        { text: 'Pose cornières angles', critical: false }
      ]
    }
  }
};

// === TÂCHES RAPIDES UNIVERSELLES ===
export const QUICK_TASKS = [
  { text: 'Protection chantier', icon: 'Shield', phase: 'preparation' },
  { text: 'Approvisionnement matériel', icon: 'Truck', phase: 'preparation' },
  { text: 'Point avec le client', icon: 'Users', phase: 'preparation' },
  { text: 'Évacuation gravats', icon: 'Trash2', phase: 'demolition' },
  { text: 'Nettoyage fin de journée', icon: 'Sparkles', phase: 'nettoyage' },
  { text: 'Photo avant travaux', icon: 'Camera', phase: 'preparation', critical: true },
  { text: 'Photo après travaux', icon: 'Camera', phase: 'nettoyage', critical: true },
  { text: 'Commande matériel manquant', icon: 'ShoppingCart', phase: 'preparation' },
  { text: 'Appel fournisseur', icon: 'Phone', phase: 'preparation' },
  { text: 'Réception livraison', icon: 'Package', phase: 'preparation' }
];

// === TÂCHES PAR TYPE DE PROJET ===
export const TASKS_BY_PROJECT_TYPE = {
  'renovation-complete': {
    label: 'Rénovation complète',
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Diagnostic amiante/plomb', phase: 'preparation', critical: true },
      { text: 'Demande autorisation travaux', phase: 'preparation', critical: true },
      { text: 'Coordination corps d\'état', phase: 'preparation', critical: false }
    ]
  },
  'salle-de-bain': {
    label: 'Salle de bain',
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Vérification ventilation', phase: 'preparation', critical: true },
      { text: 'Test étanchéité douche', phase: 'finitions', critical: true }
    ]
  },
  'cuisine': {
    label: 'Cuisine',
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Pose plan de travail', phase: 'second-oeuvre', critical: false },
      { text: 'Raccordement électroménager', phase: 'second-oeuvre', critical: false },
      { text: 'Installation hotte', phase: 'second-oeuvre', critical: false }
    ]
  },
  'extension': {
    label: 'Extension',
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Permis de construire', phase: 'preparation', critical: true },
      { text: 'Implantation géomètre', phase: 'preparation', critical: true },
      { text: 'Contrôle technique', phase: 'finitions', critical: true }
    ]
  },
  'peinture': {
    label: 'Travaux de peinture',
    suggestedPhases: ['preparation', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: []
  },
  'electricite': {
    label: 'Travaux électriques',
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Consuel si nécessaire', phase: 'finitions', critical: true }
    ]
  },
  'plomberie': {
    label: 'Travaux de plomberie',
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: []
  }
};

// === FONCTIONS UTILITAIRES ===

/**
 * Obtenir les templates de tâches selon le métier
 */
export function getTaskTemplatesForMetier(metier) {
  if (!metier) return { label: 'Général', phases: {}, icon: 'Briefcase' };

  const normalized = metier.toLowerCase()
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[ù]/g, 'u')
    .replace(/[î]/g, 'i');

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
    'menuiserie': 'menuisier',
    'chauffagiste': 'chauffagiste',
    'chauffage': 'chauffagiste',
    'climatisation': 'chauffagiste',
    'couvreur': 'couvreur',
    'couverture': 'couvreur',
    'toiture': 'couvreur',
    'platrier': 'platrier',
    'platrerie': 'platrier',
    'plaquiste': 'platrier',
    'placo': 'platrier'
  };

  const key = metierMap[normalized];
  return key ? TASKS_BY_METIER[key] : { label: 'Général', phases: {}, icon: 'Briefcase' };
}

/**
 * Générer une liste de tâches suggérées pour un chantier
 * @param {string} metier - Le métier de l'entreprise
 * @param {string} projectType - Le type de projet (optionnel)
 * @param {Array} devisLignes - Les lignes du devis lié (optionnel)
 */
export function generateSmartTasks(metier, projectType = null, devisLignes = null) {
  const tasks = [];
  const metierTemplates = getTaskTemplatesForMetier(metier);
  const projectTemplates = projectType ? TASKS_BY_PROJECT_TYPE[projectType] : null;

  // 1. Ajouter les tâches communes de préparation
  COMMON_TASKS.preparation.forEach(task => {
    tasks.push({ ...task, phase: 'preparation', source: 'common' });
  });

  // 2. Ajouter les tâches spécifiques au métier
  if (metierTemplates.phases) {
    Object.entries(metierTemplates.phases).forEach(([phase, phaseTasks]) => {
      phaseTasks.forEach(task => {
        tasks.push({ ...task, phase, source: 'metier' });
      });
    });
  }

  // 3. Ajouter les tâches spécifiques au type de projet
  if (projectTemplates?.specificTasks) {
    projectTemplates.specificTasks.forEach(task => {
      tasks.push({ ...task, source: 'project' });
    });
  }

  // 4. Ajouter les tâches depuis le devis
  if (devisLignes && devisLignes.length > 0) {
    const devisTasks = suggestTasksFromDevis(devisLignes);
    devisTasks.forEach(task => {
      tasks.push({ ...task, source: 'devis' });
    });
  }

  // 5. Ajouter les tâches de finition et nettoyage communes
  COMMON_TASKS.finitions.forEach(task => {
    tasks.push({ ...task, phase: 'finitions', source: 'common' });
  });
  COMMON_TASKS.nettoyage.forEach(task => {
    tasks.push({ ...task, phase: 'nettoyage', source: 'common' });
  });

  return tasks;
}

/**
 * Obtenir les tâches suggérées depuis un devis
 */
export function suggestTasksFromDevis(devisLignes) {
  if (!devisLignes || devisLignes.length === 0) return [];

  return devisLignes
    .filter(l => l.description && l.description.length > 5)
    .map(ligne => ({
      text: ligne.description.substring(0, 60),
      phase: 'second-oeuvre',
      source: 'devis',
      suggested: true,
      quantity: ligne.quantite,
      unit: ligne.unite,
      critical: false
    }));
}

/**
 * Obtenir toutes les tâches disponibles pour un métier, groupées par phase
 */
export function getAllTasksByPhase(metier) {
  const result = {};
  const metierTemplates = getTaskTemplatesForMetier(metier);

  PHASES.forEach(phase => {
    result[phase.id] = [];

    // Ajouter les tâches communes
    if (COMMON_TASKS[phase.id]) {
      COMMON_TASKS[phase.id].forEach(task => {
        result[phase.id].push({ ...task, source: 'common' });
      });
    }

    // Ajouter les tâches du métier
    if (metierTemplates.phases && metierTemplates.phases[phase.id]) {
      metierTemplates.phases[phase.id].forEach(task => {
        result[phase.id].push({ ...task, source: 'metier' });
      });
    }
  });

  return result;
}

/**
 * Calculer l'avancement basé sur les tâches par phase
 */
export function calculateProgressByPhase(tasks) {
  if (!tasks || tasks.length === 0) return { total: 0, byPhase: {} };

  const byPhase = {};
  let totalDone = 0;
  let totalTasks = 0;

  // Poids des phases (les premières phases comptent moins car elles sont rapides)
  const phaseWeights = {
    'preparation': 0.1,
    'demolition': 0.1,
    'gros-oeuvre': 0.25,
    'second-oeuvre': 0.35,
    'finitions': 0.15,
    'nettoyage': 0.05
  };

  PHASES.forEach(phase => {
    const phaseTasks = tasks.filter(t => t.phase === phase.id);
    const done = phaseTasks.filter(t => t.done).length;
    const total = phaseTasks.length;

    byPhase[phase.id] = {
      done,
      total,
      percentage: total > 0 ? Math.round((done / total) * 100) : 0
    };

    if (total > 0) {
      totalDone += (done / total) * (phaseWeights[phase.id] || 0.1);
      totalTasks += phaseWeights[phase.id] || 0.1;
    }
  });

  const totalPercentage = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return {
    total: totalPercentage,
    byPhase,
    tasksDone: tasks.filter(t => t.done).length,
    tasksTotal: tasks.length
  };
}
