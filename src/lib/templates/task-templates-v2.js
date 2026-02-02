/**
 * Task Templates V2 - Système enrichi de gestion des tâches par phase
 * Version améliorée avec 25+ métiers et 25+ types de projets
 *
 * CHANGELOG:
 * - Ajout de 16 nouveaux métiers (terrassier, façadier, étancheur, etc.)
 * - Ajout de 18 nouveaux types de projets
 * - Durées estimées pour chaque tâche
 * - Tâches critiques mieux identifiées
 * - Support multi-corps d'état pour les projets complexes
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
    { text: 'Visite technique préalable', critical: false, duree: 2 },
    { text: 'Établir le planning', critical: false, duree: 1 },
    { text: 'Commander les matériaux', critical: true, duree: 1 },
    { text: 'Vérifier livraison matériaux', critical: true, duree: 0.5 },
    { text: 'Protection sols et meubles', critical: false, duree: 1 },
    { text: 'Installation zone de travail', critical: false, duree: 1 },
    { text: 'Coupure eau / électricité si nécessaire', critical: true, duree: 0.5 },
    { text: 'Photos état des lieux avant', critical: true, duree: 0.5 },
    { text: 'Informer voisinage si nécessaire', critical: false, duree: 0.25 }
  ],
  demolition: [
    { text: 'Dépose équipements existants', critical: false, duree: 4 },
    { text: 'Démolition cloisons / murs', critical: false, duree: 8 },
    { text: 'Évacuation gravats', critical: false, duree: 2 },
    { text: 'Tri et recyclage déchets', critical: false, duree: 1 }
  ],
  finitions: [
    { text: 'Retouches peinture', critical: false, duree: 2 },
    { text: 'Pose plinthes et finitions', critical: false, duree: 2 },
    { text: 'Vérification générale', critical: true, duree: 1 },
    { text: 'Liste des réserves', critical: false, duree: 0.5 }
  ],
  nettoyage: [
    { text: 'Nettoyage complet du chantier', critical: true, duree: 4 },
    { text: 'Évacuation derniers déchets', critical: false, duree: 2 },
    { text: 'Photos état des lieux après', critical: true, duree: 0.5 },
    { text: 'Visite de réception client', critical: true, duree: 1 },
    { text: 'Signature PV de réception', critical: true, duree: 0.25 },
    { text: 'Remise des clés / documents', critical: false, duree: 0.25 }
  ]
};

// === TÂCHES PAR MÉTIER (25+ métiers) ===
export const TASKS_BY_METIER = {
  // ==================== GROS ŒUVRE ====================

  terrassier: {
    label: 'Terrassement / VRD',
    icon: 'Mountain',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Bornage et implantation', critical: true, duree: 4 },
        { text: 'Étude de sol géotechnique', critical: true, duree: 8 },
        { text: 'DICT - Déclaration réseaux', critical: true, duree: 1 },
        { text: 'Installation base vie chantier', critical: false, duree: 4 },
        { text: 'Clôture et signalisation chantier', critical: true, duree: 2 }
      ],
      demolition: [
        { text: 'Décapage terre végétale', critical: false, duree: 8 },
        { text: 'Arrachage souches/arbres', critical: false, duree: 4 },
        { text: 'Démolition structures existantes', critical: false, duree: 16 }
      ],
      'gros-oeuvre': [
        { text: 'Excavation fouilles fondations', critical: true, duree: 16 },
        { text: 'Excavation tranchées réseaux', critical: false, duree: 8 },
        { text: 'Évacuation terres excédentaires', critical: false, duree: 8 },
        { text: 'Mise à niveau plateforme', critical: true, duree: 4 },
        { text: 'Compactage fond de forme', critical: true, duree: 4 },
        { text: 'Pose géotextile anti-contaminant', critical: false, duree: 2 },
        { text: 'Empierrement/tout-venant', critical: false, duree: 8 },
        { text: 'Pose drains périphériques', critical: true, duree: 8 },
        { text: 'Pose regards de visite', critical: false, duree: 4 },
        { text: 'Remblai technique', critical: false, duree: 8 }
      ],
      finitions: [
        { text: 'Réglage fin des niveaux', critical: true, duree: 4 },
        { text: 'Test de compactage', critical: true, duree: 2 },
        { text: 'Essai d\'étanchéité réseaux', critical: true, duree: 2 }
      ]
    }
  },

  macon: {
    label: 'Maçonnerie',
    icon: 'Landmark',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Implantation chantier', critical: true, duree: 4 },
        { text: 'Piquetage', critical: false, duree: 2 },
        { text: 'Déclaration préalable travaux', critical: true, duree: 1 }
      ],
      demolition: [
        { text: 'Terrassement fondations', critical: false, duree: 8 },
        { text: 'Démolition existant', critical: false, duree: 16 },
        { text: 'Évacuation terres', critical: false, duree: 4 }
      ],
      'gros-oeuvre': [
        { text: 'Coffrage semelles filantes', critical: false, duree: 8 },
        { text: 'Ferraillage fondations', critical: true, duree: 8 },
        { text: 'Coulage béton fondations', critical: true, duree: 4 },
        { text: 'Montage parpaings/briques', critical: false, duree: 24 },
        { text: 'Pose linteaux', critical: true, duree: 4 },
        { text: 'Chaînage horizontal', critical: true, duree: 4 },
        { text: 'Chaînage vertical poteaux', critical: true, duree: 4 },
        { text: 'Coffrage dalle béton', critical: false, duree: 8 },
        { text: 'Ferraillage dalle', critical: true, duree: 8 },
        { text: 'Coulage dalle béton', critical: true, duree: 4 },
        { text: 'Création ouvertures', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Enduit extérieur', critical: false, duree: 16 },
        { text: 'Enduit intérieur', critical: false, duree: 16 },
        { text: 'Joints de dilatation', critical: false, duree: 2 },
        { text: 'Seuils et appuis', critical: false, duree: 4 }
      ]
    }
  },

  charpentierBois: {
    label: 'Charpente bois',
    icon: 'TreePine',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Relevé de cotes sur site', critical: true, duree: 4 },
        { text: 'Plans d\'exécution charpente', critical: true, duree: 8 },
        { text: 'Fabrication atelier', critical: true, duree: 40 },
        { text: 'Traitement bois (insecticide/fongicide)', critical: true, duree: 8 }
      ],
      'gros-oeuvre': [
        { text: 'Levage fermes de charpente', critical: true, duree: 8 },
        { text: 'Assemblage pannes', critical: false, duree: 8 },
        { text: 'Pose chevrons', critical: false, duree: 16 },
        { text: 'Pose liteaux/voliges', critical: false, duree: 8 },
        { text: 'Contreventement', critical: true, duree: 4 },
        { text: 'Pose écran sous-toiture HPV', critical: true, duree: 8 }
      ],
      finitions: [
        { text: 'Habillage sous-face débords', critical: false, duree: 8 },
        { text: 'Pose planches de rive', critical: false, duree: 4 },
        { text: 'Traitement final bois apparent', critical: false, duree: 4 }
      ]
    }
  },

  charpentierMetal: {
    label: 'Charpente métallique',
    icon: 'Factory',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Relevé de cotes sur site', critical: true, duree: 4 },
        { text: 'Plans d\'exécution structure', critical: true, duree: 16 },
        { text: 'Fabrication atelier', critical: true, duree: 80 },
        { text: 'Traitement anticorrosion', critical: true, duree: 16 }
      ],
      'gros-oeuvre': [
        { text: 'Pose platines d\'ancrage', critical: true, duree: 4 },
        { text: 'Levage poteaux métalliques', critical: true, duree: 8 },
        { text: 'Pose poutres principales', critical: true, duree: 8 },
        { text: 'Assemblage structure secondaire', critical: false, duree: 16 },
        { text: 'Boulonnage/soudage définitif', critical: true, duree: 8 },
        { text: 'Contreventement', critical: true, duree: 4 }
      ],
      finitions: [
        { text: 'Retouche peinture assemblages', critical: false, duree: 4 },
        { text: 'Contrôle soudures', critical: true, duree: 2 },
        { text: 'Pose habillages', critical: false, duree: 8 }
      ]
    }
  },

  couvreur: {
    label: 'Couverture',
    icon: 'Home',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Installation échafaudage', critical: true, duree: 8 },
        { text: 'Sécurisation zone travail', critical: true, duree: 2 },
        { text: 'Commande tuiles/ardoises', critical: true, duree: 1 }
      ],
      demolition: [
        { text: 'Dépose ancienne couverture', critical: false, duree: 16 },
        { text: 'Dépose gouttières', critical: false, duree: 4 },
        { text: 'Retrait isolation existante', critical: false, duree: 8 },
        { text: 'Dépose Velux existants', critical: false, duree: 2 }
      ],
      'gros-oeuvre': [
        { text: 'Réparation charpente si nécessaire', critical: true, duree: 8 },
        { text: 'Pose écran sous-toiture', critical: true, duree: 8 },
        { text: 'Pose contre-liteaux', critical: false, duree: 4 },
        { text: 'Pose liteaux', critical: false, duree: 8 }
      ],
      'second-oeuvre': [
        { text: 'Pose tuiles/ardoises', critical: false, duree: 24 },
        { text: 'Pose faîtage', critical: true, duree: 4 },
        { text: 'Pose rives', critical: false, duree: 4 },
        { text: 'Pose noues', critical: true, duree: 4 },
        { text: 'Installation Velux/fenêtres de toit', critical: false, duree: 4 },
        { text: 'Pose chatières ventilation', critical: false, duree: 2 },
        { text: 'Pose gouttières', critical: false, duree: 8 },
        { text: 'Pose descentes EP', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Étanchéité pénétrations (cheminée, etc.)', critical: true, duree: 4 },
        { text: 'Pose solins', critical: true, duree: 2 },
        { text: 'Nettoyage toiture', critical: false, duree: 2 },
        { text: 'Test étanchéité eau', critical: true, duree: 1 }
      ]
    }
  },

  etancheur: {
    label: 'Étanchéité',
    icon: 'Droplets',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Diagnostic état support', critical: true, duree: 2 },
        { text: 'Choix système d\'étanchéité', critical: true, duree: 1 },
        { text: 'Préparation accès toiture terrasse', critical: false, duree: 2 }
      ],
      demolition: [
        { text: 'Dépose ancienne étanchéité', critical: false, duree: 16 },
        { text: 'Dépose isolant existant', critical: false, duree: 8 },
        { text: 'Dépose protection lourde', critical: false, duree: 8 }
      ],
      'gros-oeuvre': [
        { text: 'Réparation support béton', critical: true, duree: 8 },
        { text: 'Création formes de pentes', critical: true, duree: 16 },
        { text: 'Pose pare-vapeur', critical: true, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose isolant thermique (panneaux)', critical: true, duree: 8 },
        { text: 'Pose membrane d\'étanchéité', critical: true, duree: 16 },
        { text: 'Soudure lés', critical: true, duree: 8 },
        { text: 'Relevés d\'étanchéité', critical: true, duree: 8 },
        { text: 'Traitement joints de dilatation', critical: true, duree: 4 },
        { text: 'Pose entrées EP / trop-pleins', critical: true, duree: 4 }
      ],
      finitions: [
        { text: 'Pose protection (gravillons/dalles)', critical: false, duree: 16 },
        { text: 'Test d\'étanchéité mise en eau', critical: true, duree: 24 },
        { text: 'Nettoyage évacuations', critical: false, duree: 2 }
      ]
    }
  },

  facadier: {
    label: 'Façade / ITE',
    icon: 'Building',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Diagnostic façade existante', critical: true, duree: 4 },
        { text: 'Installation échafaudage', critical: true, duree: 8 },
        { text: 'Nettoyage haute pression', critical: false, duree: 8 },
        { text: 'Protection menuiseries', critical: false, duree: 4 }
      ],
      demolition: [
        { text: 'Dépose ancien revêtement', critical: false, duree: 16 },
        { text: 'Piquage enduit décollé', critical: false, duree: 8 },
        { text: 'Retrait ancien isolant extérieur', critical: false, duree: 16 }
      ],
      'gros-oeuvre': [
        { text: 'Réparation support maçonnerie', critical: true, duree: 8 },
        { text: 'Pose rails de départ ITE', critical: true, duree: 4 },
        { text: 'Collage panneaux isolants', critical: true, duree: 24 },
        { text: 'Chevillage mécanique isolant', critical: true, duree: 8 },
        { text: 'Traitement points singuliers', critical: true, duree: 8 }
      ],
      'second-oeuvre': [
        { text: 'Pose baguettes d\'angle', critical: false, duree: 4 },
        { text: 'Sous-enduit + treillis fibre verre', critical: true, duree: 16 },
        { text: 'Enduit de finition', critical: false, duree: 16 },
        { text: 'Peinture façade si nécessaire', critical: false, duree: 16 }
      ],
      finitions: [
        { text: 'Pose appuis de fenêtre neufs', critical: false, duree: 8 },
        { text: 'Retouches et raccords', critical: false, duree: 4 },
        { text: 'Dépose échafaudage', critical: false, duree: 8 }
      ]
    }
  },

  demolisseur: {
    label: 'Démolition',
    icon: 'Hammer',
    category: 'gros-oeuvre',
    phases: {
      preparation: [
        { text: 'Diagnostic amiante/plomb', critical: true, duree: 8 },
        { text: 'Plan de retrait si amiante', critical: true, duree: 8 },
        { text: 'Demande autorisation démolir', critical: true, duree: 1 },
        { text: 'Coupure réseaux (eau, gaz, élec)', critical: true, duree: 4 },
        { text: 'Installation clôture chantier', critical: true, duree: 4 },
        { text: 'Installation base vie', critical: false, duree: 4 }
      ],
      demolition: [
        { text: 'Curage intérieur', critical: false, duree: 16 },
        { text: 'Désamiantage si présence', critical: true, duree: 40 },
        { text: 'Démolition structure', critical: false, duree: 40 },
        { text: 'Tri sélectif déchets', critical: true, duree: 8 },
        { text: 'Évacuation gravats', critical: false, duree: 16 },
        { text: 'Bordereau suivi déchets', critical: true, duree: 1 }
      ],
      finitions: [
        { text: 'Nivellement terrain', critical: false, duree: 8 },
        { text: 'Nettoyage site', critical: false, duree: 4 },
        { text: 'Remise certificats élimination', critical: true, duree: 1 }
      ]
    }
  },

  // ==================== SECOND ŒUVRE ====================

  plombier: {
    label: 'Plomberie',
    icon: 'Droplets',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Repérage arrivées eau', critical: true, duree: 1 },
        { text: 'Repérage évacuations', critical: true, duree: 1 },
        { text: 'Vérification pression eau', critical: false, duree: 0.5 }
      ],
      demolition: [
        { text: 'Fermeture eau générale', critical: true, duree: 0.25 },
        { text: 'Vidange circuits', critical: false, duree: 0.5 },
        { text: 'Dépose robinetterie', critical: false, duree: 2 },
        { text: 'Dépose sanitaires', critical: false, duree: 4 },
        { text: 'Dépose tuyauterie', critical: false, duree: 4 }
      ],
      'gros-oeuvre': [
        { text: 'Passage des évacuations', critical: true, duree: 8 },
        { text: 'Passage alimentation eau (cuivre/PER)', critical: true, duree: 8 },
        { text: 'Installation nourrices/collecteurs', critical: false, duree: 4 },
        { text: 'Pose chauffe-eau / ballon', critical: false, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose WC', critical: false, duree: 2 },
        { text: 'Pose lavabo / vasque', critical: false, duree: 2 },
        { text: 'Pose meuble de salle de bain', critical: false, duree: 3 },
        { text: 'Pose douche / receveur', critical: false, duree: 4 },
        { text: 'Pose baignoire', critical: false, duree: 4 },
        { text: 'Pose robinetterie', critical: false, duree: 2 },
        { text: 'Raccordement lave-linge', critical: false, duree: 1 },
        { text: 'Raccordement lave-vaisselle', critical: false, duree: 1 },
        { text: 'Installation chasse d\'eau', critical: false, duree: 1 }
      ],
      finitions: [
        { text: 'Test étanchéité sous pression', critical: true, duree: 2 },
        { text: 'Vérification pressions', critical: true, duree: 0.5 },
        { text: 'Réglage mitigeurs thermostatiques', critical: false, duree: 0.5 },
        { text: 'Joints silicone sanitaires', critical: false, duree: 2 },
        { text: 'Fixation accessoires (porte-serviette, etc.)', critical: false, duree: 2 }
      ]
    }
  },

  electricien: {
    label: 'Électricité',
    icon: 'Zap',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Repérage tableau existant', critical: true, duree: 1 },
        { text: 'Plan d\'implantation électrique', critical: true, duree: 2 },
        { text: 'Calcul puissance nécessaire', critical: false, duree: 1 }
      ],
      demolition: [
        { text: 'Coupure disjoncteur général', critical: true, duree: 0.25 },
        { text: 'Dépose ancien tableau', critical: false, duree: 2 },
        { text: 'Dépose ancien appareillage', critical: false, duree: 4 },
        { text: 'Retrait anciens câbles', critical: false, duree: 4 }
      ],
      'gros-oeuvre': [
        { text: 'Traçage saignées', critical: false, duree: 2 },
        { text: 'Réalisation saignées', critical: false, duree: 8 },
        { text: 'Pose gaines ICTA', critical: false, duree: 8 },
        { text: 'Pose boîtes d\'encastrement', critical: false, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Tirage des câbles', critical: true, duree: 8 },
        { text: 'Pose tableau électrique', critical: true, duree: 4 },
        { text: 'Câblage tableau (disjoncteurs)', critical: true, duree: 4 },
        { text: 'Pose prises de courant', critical: false, duree: 4 },
        { text: 'Pose prises RJ45/TV', critical: false, duree: 2 },
        { text: 'Pose interrupteurs', critical: false, duree: 2 },
        { text: 'Pose va-et-vient/télérupteurs', critical: false, duree: 2 },
        { text: 'Pose luminaires', critical: false, duree: 4 },
        { text: 'Installation VMC', critical: true, duree: 4 },
        { text: 'Pose détecteurs fumée', critical: true, duree: 1 }
      ],
      finitions: [
        { text: 'Test différentiel 30mA', critical: true, duree: 0.5 },
        { text: 'Test circuits (continuité, isolement)', critical: true, duree: 2 },
        { text: 'Vérification terre', critical: true, duree: 0.5 },
        { text: 'Étiquetage tableau', critical: false, duree: 0.5 },
        { text: 'Rebouchage saignées', critical: false, duree: 2 },
        { text: 'Mise sous tension finale', critical: true, duree: 0.5 }
      ]
    }
  },

  chauffagiste: {
    label: 'Chauffage / Climatisation',
    icon: 'Thermometer',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Étude thermique', critical: true, duree: 8 },
        { text: 'Dimensionnement installation', critical: true, duree: 4 }
      ],
      demolition: [
        { text: 'Dépose ancienne chaudière', critical: false, duree: 4 },
        { text: 'Dépose radiateurs', critical: false, duree: 4 },
        { text: 'Vidange circuit chauffage', critical: true, duree: 1 }
      ],
      'gros-oeuvre': [
        { text: 'Passage gaines/tuyaux', critical: false, duree: 8 },
        { text: 'Percement murs extérieurs', critical: false, duree: 2 },
        { text: 'Création conduit fumées si nécessaire', critical: true, duree: 8 }
      ],
      'second-oeuvre': [
        { text: 'Pose chaudière gaz/fioul', critical: true, duree: 8 },
        { text: 'Pose pompe à chaleur', critical: true, duree: 16 },
        { text: 'Installation unités intérieures (split)', critical: false, duree: 8 },
        { text: 'Installation unité extérieure', critical: false, duree: 4 },
        { text: 'Pose radiateurs', critical: false, duree: 8 },
        { text: 'Pose plancher chauffant', critical: false, duree: 24 },
        { text: 'Tirage tuyauterie', critical: false, duree: 8 },
        { text: 'Raccordement gaz', critical: true, duree: 4 },
        { text: 'Raccordement électrique', critical: true, duree: 4 }
      ],
      finitions: [
        { text: 'Mise en eau circuit', critical: true, duree: 2 },
        { text: 'Purge radiateurs', critical: false, duree: 1 },
        { text: 'Mise en service', critical: true, duree: 2 },
        { text: 'Équilibrage réseau', critical: false, duree: 2 },
        { text: 'Programmation thermostat', critical: false, duree: 1 },
        { text: 'Certificat conformité gaz', critical: true, duree: 1 }
      ]
    }
  },

  climaticien: {
    label: 'Climatisation / VMC',
    icon: 'Wind',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Bilan thermique pièce par pièce', critical: true, duree: 4 },
        { text: 'Choix puissances unités', critical: true, duree: 2 },
        { text: 'Plan de passage gaines', critical: false, duree: 2 }
      ],
      demolition: [
        { text: 'Dépose ancienne climatisation', critical: false, duree: 4 },
        { text: 'Dépose ancienne VMC', critical: false, duree: 2 }
      ],
      'gros-oeuvre': [
        { text: 'Percements murs extérieurs', critical: false, duree: 2 },
        { text: 'Création passages gaines', critical: false, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose unité extérieure', critical: true, duree: 4 },
        { text: 'Pose unités intérieures (splits)', critical: false, duree: 8 },
        { text: 'Tirage liaisons frigorifiques', critical: true, duree: 8 },
        { text: 'Tirage câbles électriques', critical: false, duree: 4 },
        { text: 'Pose caisson VMC', critical: true, duree: 2 },
        { text: 'Pose réseau gaines VMC', critical: false, duree: 8 },
        { text: 'Pose bouches d\'extraction', critical: false, duree: 2 },
        { text: 'Pose entrées d\'air', critical: false, duree: 2 },
        { text: 'Raccordement évacuation condensats', critical: true, duree: 2 }
      ],
      finitions: [
        { text: 'Mise sous vide circuit frigo', critical: true, duree: 2 },
        { text: 'Charge fluide frigorigène', critical: true, duree: 1 },
        { text: 'Mise en service climatisation', critical: true, duree: 2 },
        { text: 'Réglage débits VMC', critical: false, duree: 1 },
        { text: 'Programmation télécommandes', critical: false, duree: 0.5 }
      ]
    }
  },

  platrier: {
    label: 'Plâtrerie / Placo',
    icon: 'Layers',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Traçage cloisons au sol/plafond', critical: true, duree: 2 },
        { text: 'Repérage réseaux existants', critical: true, duree: 1 }
      ],
      'gros-oeuvre': [
        { text: 'Pose rails sol/plafond', critical: false, duree: 4 },
        { text: 'Pose montants', critical: false, duree: 4 },
        { text: 'Passage gaines électriques', critical: true, duree: 4 },
        { text: 'Pose isolant (laine minérale)', critical: true, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose plaques 1ère face', critical: false, duree: 8 },
        { text: 'Pose plaques 2ème face', critical: false, duree: 8 },
        { text: 'Découpes autour obstacles', critical: false, duree: 4 },
        { text: 'Pose ossature faux-plafond', critical: false, duree: 8 },
        { text: 'Pose plaques faux-plafond', critical: false, duree: 8 },
        { text: 'Création trappes de visite', critical: false, duree: 2 }
      ],
      finitions: [
        { text: 'Bandes à joints (calicot)', critical: true, duree: 8 },
        { text: 'Enduit de lissage joints', critical: false, duree: 8 },
        { text: 'Ponçage joints', critical: false, duree: 4 },
        { text: 'Pose cornières angles', critical: false, duree: 2 },
        { text: 'Sous-couche d\'accrochage', critical: false, duree: 4 }
      ]
    }
  },

  peintre: {
    label: 'Peinture',
    icon: 'Paintbrush',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Lessivage murs et plafonds', critical: false, duree: 4 },
        { text: 'Décapage anciennes peintures', critical: false, duree: 8 },
        { text: 'Ponçage surfaces', critical: false, duree: 4 },
        { text: 'Rebouchage trous et fissures', critical: true, duree: 4 },
        { text: 'Application enduit de lissage', critical: false, duree: 8 },
        { text: 'Ponçage enduit', critical: false, duree: 4 },
        { text: 'Dépoussiérage complet', critical: false, duree: 1 }
      ],
      demolition: [
        { text: 'Dépose papier peint', critical: false, duree: 8 },
        { text: 'Dépose ancien revêtement', critical: false, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Application sous-couche plafond', critical: false, duree: 4 },
        { text: 'Application sous-couche murs', critical: false, duree: 4 },
        { text: 'Peinture plafond 1ère couche', critical: false, duree: 4 },
        { text: 'Peinture plafond 2ème couche', critical: false, duree: 4 },
        { text: 'Peinture murs 1ère couche', critical: false, duree: 6 },
        { text: 'Peinture murs 2ème couche', critical: false, duree: 6 },
        { text: 'Peinture boiseries (portes, plinthes)', critical: false, duree: 4 },
        { text: 'Pose papier peint', critical: false, duree: 8 }
      ],
      finitions: [
        { text: 'Retouches', critical: false, duree: 2 },
        { text: 'Filets et raccords', critical: false, duree: 2 },
        { text: 'Repose caches prises/interrupteurs', critical: false, duree: 1 }
      ]
    }
  },

  carreleur: {
    label: 'Carrelage',
    icon: 'Grid3x3',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Vérification planéité support', critical: true, duree: 1 },
        { text: 'Ragréage si nécessaire', critical: false, duree: 8 },
        { text: 'Traçage calepinage', critical: true, duree: 2 },
        { text: 'Découpe carreaux de réserve', critical: false, duree: 2 }
      ],
      demolition: [
        { text: 'Dépose ancien carrelage', critical: false, duree: 8 },
        { text: 'Nettoyage support', critical: false, duree: 2 }
      ],
      'second-oeuvre': [
        { text: 'Pose receveur douche/bac', critical: true, duree: 4 },
        { text: 'Étanchéité SPEC douche/SDB', critical: true, duree: 4 },
        { text: 'Pose carrelage sol', critical: false, duree: 16 },
        { text: 'Pose faïence murale', critical: false, duree: 12 },
        { text: 'Découpes autour obstacles', critical: false, duree: 4 },
        { text: 'Séchage (24-48h)', critical: true, duree: 24 }
      ],
      finitions: [
        { text: 'Préparation joints', critical: false, duree: 0.5 },
        { text: 'Application joints', critical: false, duree: 4 },
        { text: 'Nettoyage joints', critical: false, duree: 2 },
        { text: 'Pose plinthes carrelage', critical: false, duree: 4 },
        { text: 'Joint silicone périphérique', critical: true, duree: 2 }
      ]
    }
  },

  parqueteur: {
    label: 'Parquet / Sols souples',
    icon: 'Columns',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Vérification hygrométrie support', critical: true, duree: 1 },
        { text: 'Vérification planéité support', critical: true, duree: 1 },
        { text: 'Ragréage si nécessaire', critical: false, duree: 8 },
        { text: 'Acclimatation parquet (48h)', critical: true, duree: 48 }
      ],
      demolition: [
        { text: 'Dépose ancien revêtement', critical: false, duree: 4 },
        { text: 'Retrait plinthes existantes', critical: false, duree: 2 }
      ],
      'second-oeuvre': [
        { text: 'Pose sous-couche isolante', critical: false, duree: 2 },
        { text: 'Pose parquet flottant', critical: false, duree: 16 },
        { text: 'Pose parquet collé', critical: false, duree: 24 },
        { text: 'Pose parquet cloué', critical: false, duree: 32 },
        { text: 'Découpes autour obstacles', critical: false, duree: 4 },
        { text: 'Pose sol vinyle/PVC', critical: false, duree: 8 },
        { text: 'Soudure à chaud sols souples', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Pose plinthes', critical: false, duree: 4 },
        { text: 'Pose barres de seuil', critical: false, duree: 1 },
        { text: 'Ponçage si parquet massif', critical: false, duree: 8 },
        { text: 'Vitrification/huilage', critical: false, duree: 8 }
      ]
    }
  },

  menuisier: {
    label: 'Menuiserie intérieure',
    icon: 'DoorOpen',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Prise de cotes', critical: true, duree: 2 },
        { text: 'Vérification équerrage', critical: false, duree: 1 },
        { text: 'Commande menuiseries sur mesure', critical: true, duree: 1 }
      ],
      demolition: [
        { text: 'Dépose anciennes portes intérieures', critical: false, duree: 4 },
        { text: 'Dépose anciens placards', critical: false, duree: 4 },
        { text: 'Nettoyage bâtis', critical: false, duree: 1 }
      ],
      'second-oeuvre': [
        { text: 'Pose bloc-portes intérieurs', critical: false, duree: 8 },
        { text: 'Pose portes coulissantes', critical: false, duree: 4 },
        { text: 'Pose placards/dressings', critical: false, duree: 16 },
        { text: 'Pose escalier', critical: true, duree: 16 },
        { text: 'Pose habillages escalier', critical: false, duree: 8 },
        { text: 'Pose meubles cuisine', critical: false, duree: 16 },
        { text: 'Pose plan de travail cuisine', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Calage et réglage portes', critical: true, duree: 2 },
        { text: 'Réglage charnières', critical: false, duree: 1 },
        { text: 'Pose quincaillerie (poignées)', critical: false, duree: 2 },
        { text: 'Pose plinthes', critical: false, duree: 4 }
      ]
    }
  },

  menuisierExt: {
    label: 'Menuiserie extérieure (PVC/Alu)',
    icon: 'DoorClosed',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Relevé de cotes précis', critical: true, duree: 4 },
        { text: 'Vérification équerrage tableaux', critical: true, duree: 2 },
        { text: 'Commande menuiseries sur mesure', critical: true, duree: 1 },
        { text: 'Délai fabrication (2-6 semaines)', critical: true, duree: 0 }
      ],
      demolition: [
        { text: 'Dépose anciennes fenêtres', critical: false, duree: 8 },
        { text: 'Dépose ancienne porte d\'entrée', critical: false, duree: 2 },
        { text: 'Dépose anciens volets', critical: false, duree: 4 },
        { text: 'Nettoyage tableaux', critical: false, duree: 2 }
      ],
      'second-oeuvre': [
        { text: 'Pose fenêtres PVC/Alu', critical: true, duree: 12 },
        { text: 'Pose porte-fenêtres/baies', critical: true, duree: 8 },
        { text: 'Pose porte d\'entrée', critical: true, duree: 4 },
        { text: 'Pose volets battants', critical: false, duree: 8 },
        { text: 'Pose volets roulants', critical: false, duree: 12 },
        { text: 'Pose stores/BSO', critical: false, duree: 8 },
        { text: 'Pose porte de garage', critical: false, duree: 8 }
      ],
      finitions: [
        { text: 'Calage et fixation définitive', critical: true, duree: 4 },
        { text: 'Réglage ferrures oscillo-battant', critical: false, duree: 2 },
        { text: 'Joint mousse isolation périphérique', critical: true, duree: 4 },
        { text: 'Joint silicone extérieur', critical: true, duree: 4 },
        { text: 'Habillage tableaux intérieurs', critical: false, duree: 8 }
      ]
    }
  },

  vitrier: {
    label: 'Vitrerie / Miroiterie',
    icon: 'Square',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Relevé de cotes', critical: true, duree: 2 },
        { text: 'Commande verres sur mesure', critical: true, duree: 1 }
      ],
      demolition: [
        { text: 'Dépose anciens vitrages', critical: false, duree: 4 },
        { text: 'Nettoyage feuillures', critical: false, duree: 1 }
      ],
      'second-oeuvre': [
        { text: 'Pose double/triple vitrage', critical: false, duree: 8 },
        { text: 'Pose parois de douche', critical: false, duree: 4 },
        { text: 'Pose miroirs', critical: false, duree: 4 },
        { text: 'Pose cloisons vitrées', critical: false, duree: 16 },
        { text: 'Pose garde-corps verre', critical: true, duree: 8 },
        { text: 'Pose crédences cuisine verre', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Calage vitrages', critical: true, duree: 2 },
        { text: 'Joints silicone', critical: false, duree: 2 },
        { text: 'Nettoyage vitres', critical: false, duree: 2 }
      ]
    }
  },

  serrurier: {
    label: 'Serrurerie / Métallerie',
    icon: 'Lock',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Relevé de cotes', critical: true, duree: 2 },
        { text: 'Plans de fabrication', critical: true, duree: 4 },
        { text: 'Fabrication atelier', critical: true, duree: 40 }
      ],
      demolition: [
        { text: 'Dépose anciennes grilles/garde-corps', critical: false, duree: 4 },
        { text: 'Dépose anciens portails', critical: false, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose garde-corps métalliques', critical: true, duree: 8 },
        { text: 'Pose escaliers métalliques', critical: true, duree: 16 },
        { text: 'Pose portails', critical: false, duree: 8 },
        { text: 'Pose clôtures/grilles', critical: false, duree: 16 },
        { text: 'Pose marquises/auvents', critical: false, duree: 8 },
        { text: 'Pose mains courantes', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Retouche peinture soudures', critical: false, duree: 2 },
        { text: 'Réglage serrures/cylindres', critical: false, duree: 2 },
        { text: 'Contrôle scellements', critical: true, duree: 1 }
      ]
    }
  },

  fumiste: {
    label: 'Fumisterie (cheminées/poêles)',
    icon: 'Flame',
    category: 'second-oeuvre',
    phases: {
      preparation: [
        { text: 'Diagnostic conduit existant', critical: true, duree: 2 },
        { text: 'Vérification tirage', critical: true, duree: 1 },
        { text: 'Choix appareil (poêle/insert)', critical: false, duree: 1 }
      ],
      demolition: [
        { text: 'Dépose ancien insert/poêle', critical: false, duree: 4 },
        { text: 'Dépose ancien tubage', critical: false, duree: 4 },
        { text: 'Ramonage conduit', critical: true, duree: 2 }
      ],
      'gros-oeuvre': [
        { text: 'Création sortie de toit', critical: true, duree: 8 },
        { text: 'Pose conduit isolé (10/10)', critical: true, duree: 8 },
        { text: 'Tubage conduit existant', critical: true, duree: 8 }
      ],
      'second-oeuvre': [
        { text: 'Pose poêle à bois/granulés', critical: true, duree: 4 },
        { text: 'Pose insert/foyer fermé', critical: true, duree: 8 },
        { text: 'Raccordement conduit', critical: true, duree: 2 },
        { text: 'Pose plaque de sol protection', critical: true, duree: 1 },
        { text: 'Habillage cheminée', critical: false, duree: 16 }
      ],
      finitions: [
        { text: 'Test de mise en service', critical: true, duree: 2 },
        { text: 'Réglages combustion', critical: false, duree: 1 },
        { text: 'Certificat conformité', critical: true, duree: 0.5 }
      ]
    }
  },

  // ==================== SPÉCIALISTES ====================

  installateurSolaire: {
    label: 'Solaire / Photovoltaïque',
    icon: 'Sun',
    category: 'specialiste',
    phases: {
      preparation: [
        { text: 'Étude d\'ensoleillement', critical: true, duree: 4 },
        { text: 'Dimensionnement installation', critical: true, duree: 4 },
        { text: 'Demande Consuel/Enedis', critical: true, duree: 1 },
        { text: 'Commande panneaux et onduleur', critical: true, duree: 1 }
      ],
      'gros-oeuvre': [
        { text: 'Installation échafaudage/nacelle', critical: true, duree: 4 },
        { text: 'Pose rails de fixation toiture', critical: true, duree: 8 },
        { text: 'Vérification étanchéité pénétrations', critical: true, duree: 2 }
      ],
      'second-oeuvre': [
        { text: 'Pose panneaux photovoltaïques', critical: false, duree: 8 },
        { text: 'Câblage panneaux (série/parallèle)', critical: true, duree: 4 },
        { text: 'Tirage câbles DC vers onduleur', critical: true, duree: 4 },
        { text: 'Pose onduleur', critical: true, duree: 2 },
        { text: 'Pose coffret DC', critical: true, duree: 1 },
        { text: 'Raccordement tableau AC', critical: true, duree: 2 },
        { text: 'Pose batterie de stockage', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Tests de production', critical: true, duree: 2 },
        { text: 'Paramétrage onduleur', critical: false, duree: 1 },
        { text: 'Installation monitoring', critical: false, duree: 1 },
        { text: 'Attestation Consuel', critical: true, duree: 1 },
        { text: 'Mise en service Enedis', critical: true, duree: 4 }
      ]
    }
  },

  domoticien: {
    label: 'Domotique / Smart Home',
    icon: 'Wifi',
    category: 'specialiste',
    phases: {
      preparation: [
        { text: 'Analyse des besoins client', critical: true, duree: 2 },
        { text: 'Choix protocole (KNX, Zigbee, Z-Wave)', critical: true, duree: 2 },
        { text: 'Plan d\'implantation capteurs/actionneurs', critical: true, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose box domotique/serveur', critical: true, duree: 2 },
        { text: 'Pose modules variateurs', critical: false, duree: 4 },
        { text: 'Pose interrupteurs connectés', critical: false, duree: 4 },
        { text: 'Pose détecteurs présence/mouvement', critical: false, duree: 4 },
        { text: 'Pose capteurs température/humidité', critical: false, duree: 2 },
        { text: 'Pose capteurs ouverture', critical: false, duree: 2 },
        { text: 'Pose caméras surveillance', critical: false, duree: 4 },
        { text: 'Pose serrures connectées', critical: false, duree: 2 },
        { text: 'Motorisation volets', critical: false, duree: 8 }
      ],
      finitions: [
        { text: 'Appairage tous les équipements', critical: true, duree: 4 },
        { text: 'Programmation scénarios', critical: false, duree: 8 },
        { text: 'Configuration app smartphone', critical: false, duree: 2 },
        { text: 'Formation utilisateur', critical: false, duree: 2 }
      ]
    }
  },

  acousticien: {
    label: 'Acoustique / Isolation phonique',
    icon: 'Volume2',
    category: 'specialiste',
    phases: {
      preparation: [
        { text: 'Mesures acoustiques initiales', critical: true, duree: 4 },
        { text: 'Étude acoustique prévisionnelle', critical: true, duree: 8 },
        { text: 'Préconisations solutions', critical: true, duree: 4 }
      ],
      'second-oeuvre': [
        { text: 'Pose ossature désolidarisée', critical: true, duree: 8 },
        { text: 'Pose isolant acoustique murs', critical: false, duree: 8 },
        { text: 'Pose plafond acoustique suspendu', critical: false, duree: 16 },
        { text: 'Pose sol flottant acoustique', critical: false, duree: 8 },
        { text: 'Traitement jonctions (masse-ressort)', critical: true, duree: 4 },
        { text: 'Pose porte acoustique', critical: false, duree: 4 },
        { text: 'Pose panneau absorbant', critical: false, duree: 4 }
      ],
      finitions: [
        { text: 'Mesures acoustiques finales', critical: true, duree: 4 },
        { text: 'Rapport d\'essais', critical: false, duree: 4 }
      ]
    }
  },

  paysagiste: {
    label: 'Paysagisme / Aménagement extérieur',
    icon: 'TreeDeciduous',
    category: 'specialiste',
    phases: {
      preparation: [
        { text: 'Plan d\'aménagement paysager', critical: true, duree: 8 },
        { text: 'Étude des sols', critical: false, duree: 2 },
        { text: 'Commande végétaux', critical: true, duree: 1 }
      ],
      demolition: [
        { text: 'Débroussaillage', critical: false, duree: 8 },
        { text: 'Arrachage végétaux existants', critical: false, duree: 8 },
        { text: 'Évacuation déchets verts', critical: false, duree: 4 }
      ],
      'gros-oeuvre': [
        { text: 'Terrassement/modelage terrain', critical: false, duree: 16 },
        { text: 'Création allées (décaissement)', critical: false, duree: 8 },
        { text: 'Pose bordures', critical: false, duree: 8 },
        { text: 'Pose dalles/pavés', critical: false, duree: 24 },
        { text: 'Création murets/restanques', critical: false, duree: 16 }
      ],
      'second-oeuvre': [
        { text: 'Installation arrosage automatique', critical: false, duree: 16 },
        { text: 'Pose éclairage extérieur', critical: false, duree: 8 },
        { text: 'Plantation arbres/arbustes', critical: false, duree: 8 },
        { text: 'Création massifs fleuris', critical: false, duree: 8 },
        { text: 'Pose gazon (semis/placage)', critical: false, duree: 8 },
        { text: 'Pose clôtures végétales', critical: false, duree: 8 }
      ],
      finitions: [
        { text: 'Paillage massifs', critical: false, duree: 4 },
        { text: 'Programmation arrosage', critical: false, duree: 2 },
        { text: 'Entretien initial (arrosage)', critical: true, duree: 8 }
      ]
    }
  },

  pisciniste: {
    label: 'Piscine',
    icon: 'Waves',
    category: 'specialiste',
    phases: {
      preparation: [
        { text: 'Étude implantation', critical: true, duree: 4 },
        { text: 'Déclaration préalable/permis', critical: true, duree: 1 },
        { text: 'Traçage au sol', critical: true, duree: 2 }
      ],
      'gros-oeuvre': [
        { text: 'Terrassement bassin', critical: true, duree: 16 },
        { text: 'Évacuation terres', critical: false, duree: 8 },
        { text: 'Ferraillage radier', critical: true, duree: 8 },
        { text: 'Coulage radier béton', critical: true, duree: 4 },
        { text: 'Montage murs (béton/bloc)', critical: false, duree: 24 },
        { text: 'Chaînage périphérique', critical: true, duree: 4 },
        { text: 'Création plage/terrasse', critical: false, duree: 16 }
      ],
      'second-oeuvre': [
        { text: 'Pose liner/membrane', critical: true, duree: 8 },
        { text: 'Installation pièces à sceller', critical: true, duree: 4 },
        { text: 'Pose local technique', critical: false, duree: 8 },
        { text: 'Installation pompe/filtre', critical: true, duree: 4 },
        { text: 'Installation chauffage piscine', critical: false, duree: 8 },
        { text: 'Pose éclairage subaquatique', critical: false, duree: 4 },
        { text: 'Installation volet/couverture', critical: false, duree: 8 }
      ],
      finitions: [
        { text: 'Mise en eau', critical: true, duree: 24 },
        { text: 'Équilibrage chimique eau', critical: true, duree: 2 },
        { text: 'Mise en service filtration', critical: true, duree: 2 },
        { text: 'Formation client', critical: false, duree: 2 }
      ]
    }
  },

  ascensoriste: {
    label: 'Ascenseur',
    icon: 'ArrowUpDown',
    category: 'specialiste',
    phases: {
      preparation: [
        { text: 'Étude de faisabilité', critical: true, duree: 8 },
        { text: 'Plans de la gaine', critical: true, duree: 8 },
        { text: 'Déclaration préalable travaux', critical: true, duree: 1 }
      ],
      'gros-oeuvre': [
        { text: 'Création gaine maçonnée', critical: true, duree: 40 },
        { text: 'Création fosse', critical: true, duree: 16 },
        { text: 'Création machinerie', critical: true, duree: 16 }
      ],
      'second-oeuvre': [
        { text: 'Pose rails de guidage', critical: true, duree: 8 },
        { text: 'Installation treuil/moteur', critical: true, duree: 8 },
        { text: 'Pose cabine', critical: true, duree: 8 },
        { text: 'Pose portes palières', critical: true, duree: 16 },
        { text: 'Câblage électrique', critical: true, duree: 8 },
        { text: 'Installation armoire commande', critical: true, duree: 4 }
      ],
      finitions: [
        { text: 'Tests de fonctionnement', critical: true, duree: 8 },
        { text: 'Contrôle technique obligatoire', critical: true, duree: 4 },
        { text: 'Mise en service', critical: true, duree: 2 },
        { text: 'Formation utilisateurs', critical: false, duree: 2 }
      ]
    }
  }
};

// === TÂCHES RAPIDES UNIVERSELLES ===
export const QUICK_TASKS = [
  { text: 'Protection chantier', icon: 'Shield', phase: 'preparation', duree: 1 },
  { text: 'Approvisionnement matériel', icon: 'Truck', phase: 'preparation', duree: 2 },
  { text: 'Point avec le client', icon: 'Users', phase: 'preparation', duree: 1 },
  { text: 'Évacuation gravats', icon: 'Trash2', phase: 'demolition', duree: 2 },
  { text: 'Nettoyage fin de journée', icon: 'Sparkles', phase: 'nettoyage', duree: 0.5 },
  { text: 'Photo avant travaux', icon: 'Camera', phase: 'preparation', critical: true, duree: 0.25 },
  { text: 'Photo après travaux', icon: 'Camera', phase: 'nettoyage', critical: true, duree: 0.25 },
  { text: 'Commande matériel manquant', icon: 'ShoppingCart', phase: 'preparation', duree: 0.5 },
  { text: 'Appel fournisseur', icon: 'Phone', phase: 'preparation', duree: 0.25 },
  { text: 'Réception livraison', icon: 'Package', phase: 'preparation', duree: 1 }
];

// === TÂCHES PAR TYPE DE PROJET (25+ types) ===
export const TASKS_BY_PROJECT_TYPE = {
  // RÉSIDENTIEL
  'renovation-complete': {
    label: 'Rénovation complète',
    category: 'residentiel',
    suggestedMetiers: ['demolisseur', 'macon', 'platrier', 'electricien', 'plombier', 'carreleur', 'peintre'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Diagnostic amiante/plomb', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Demande autorisation travaux', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Coordination corps d\'état', phase: 'preparation', critical: true, duree: 4 }
    ]
  },
  'salle-de-bain': {
    label: 'Salle de bain',
    category: 'residentiel',
    suggestedMetiers: ['plombier', 'electricien', 'carreleur', 'platrier', 'peintre'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Vérification ventilation existante', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Étanchéité SPEC sous carrelage', phase: 'second-oeuvre', critical: true, duree: 4 },
      { text: 'Test étanchéité douche', phase: 'finitions', critical: true, duree: 24 }
    ]
  },
  'cuisine': {
    label: 'Cuisine',
    category: 'residentiel',
    suggestedMetiers: ['plombier', 'electricien', 'carreleur', 'menuisier', 'peintre'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Plan d\'implantation cuisine', phase: 'preparation', critical: true, duree: 2 },
      { text: 'Pose meubles hauts et bas', phase: 'second-oeuvre', critical: false, duree: 16 },
      { text: 'Pose plan de travail', phase: 'second-oeuvre', critical: false, duree: 4 },
      { text: 'Raccordement électroménager', phase: 'second-oeuvre', critical: false, duree: 4 },
      { text: 'Installation hotte', phase: 'second-oeuvre', critical: false, duree: 2 },
      { text: 'Pose crédence', phase: 'finitions', critical: false, duree: 4 }
    ]
  },
  'extension': {
    label: 'Extension',
    category: 'residentiel',
    suggestedMetiers: ['terrassier', 'macon', 'charpentierBois', 'couvreur', 'platrier', 'electricien', 'plombier'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Permis de construire', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Implantation géomètre', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Raccordement structure existante', phase: 'gros-oeuvre', critical: true, duree: 8 },
      { text: 'Contrôle technique RT2020', phase: 'finitions', critical: true, duree: 4 }
    ]
  },
  'combles': {
    label: 'Aménagement combles',
    category: 'residentiel',
    suggestedMetiers: ['charpentierBois', 'platrier', 'electricien', 'menuisier', 'peintre'],
    suggestedPhases: ['preparation', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Vérification portance plancher', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Renforcement charpente si nécessaire', phase: 'gros-oeuvre', critical: true, duree: 16 },
      { text: 'Création trémie escalier', phase: 'gros-oeuvre', critical: true, duree: 8 },
      { text: 'Pose Velux/fenêtres de toit', phase: 'second-oeuvre', critical: false, duree: 8 },
      { text: 'Isolation sous rampants', phase: 'second-oeuvre', critical: true, duree: 16 }
    ]
  },
  'surelevation': {
    label: 'Surélévation',
    category: 'residentiel',
    suggestedMetiers: ['macon', 'charpentierBois', 'couvreur', 'facadier', 'platrier', 'electricien', 'plombier'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Permis de construire', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Étude structure existante', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Dépose toiture existante', phase: 'demolition', critical: true, duree: 16 },
      { text: 'Renforcement fondations si nécessaire', phase: 'gros-oeuvre', critical: true, duree: 24 },
      { text: 'Création plancher surélévation', phase: 'gros-oeuvre', critical: true, duree: 16 }
    ]
  },
  'garage-carport': {
    label: 'Garage / Carport',
    category: 'residentiel',
    suggestedMetiers: ['terrassier', 'macon', 'charpentierBois', 'electricien', 'serrurier'],
    suggestedPhases: ['preparation', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Déclaration préalable', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Dalle béton/terrassement', phase: 'gros-oeuvre', critical: true, duree: 16 },
      { text: 'Pose porte de garage', phase: 'second-oeuvre', critical: false, duree: 8 },
      { text: 'Motorisation porte', phase: 'second-oeuvre', critical: false, duree: 4 }
    ]
  },
  'terrasse-veranda': {
    label: 'Terrasse / Véranda',
    category: 'residentiel',
    suggestedMetiers: ['terrassier', 'macon', 'menuisierExt', 'vitrier', 'electricien'],
    suggestedPhases: ['preparation', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Déclaration préalable travaux', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Création dalle/fondations', phase: 'gros-oeuvre', critical: true, duree: 16 },
      { text: 'Pose structure véranda', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Pose vitrages véranda', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Store/protection solaire', phase: 'finitions', critical: false, duree: 8 }
    ]
  },
  'renovation-energetique': {
    label: 'Rénovation énergétique globale',
    category: 'residentiel',
    suggestedMetiers: ['facadier', 'menuisierExt', 'chauffagiste', 'climaticien', 'couvreur'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Audit énergétique (DPE)', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Dossier MaPrimeRénov\'', phase: 'preparation', critical: true, duree: 4 },
      { text: 'ITE ou ITI', phase: 'gros-oeuvre', critical: true, duree: 40 },
      { text: 'Remplacement menuiseries', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Installation PAC/chaudière', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'VMC double flux', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Test infiltrométrie', phase: 'finitions', critical: true, duree: 4 }
    ]
  },
  'accessibilite-pmr': {
    label: 'Mise aux normes PMR',
    category: 'residentiel',
    suggestedMetiers: ['macon', 'plombier', 'electricien', 'carreleur', 'menuisier'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Diagnostic accessibilité', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Création rampe d\'accès', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Élargissement portes (90cm)', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Douche italienne accessible', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Pose barres d\'appui', phase: 'finitions', critical: true, duree: 4 },
      { text: 'WC surélevé', phase: 'second-oeuvre', critical: false, duree: 4 }
    ]
  },

  // EXTÉRIEUR
  'toiture': {
    label: 'Réfection toiture',
    category: 'exterieur',
    suggestedMetiers: ['couvreur', 'charpentierBois', 'etancheur'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Diagnostic état charpente', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Déclaration préalable si modification', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Traitement charpente si nécessaire', phase: 'gros-oeuvre', critical: true, duree: 8 }
    ]
  },
  'facade-ravalement': {
    label: 'Ravalement façade',
    category: 'exterieur',
    suggestedMetiers: ['facadier', 'macon', 'peintre'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Diagnostic façade (fissures, humidité)', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Déclaration préalable mairie', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Nettoyage haute pression', phase: 'demolition', critical: false, duree: 8 },
      { text: 'Traitement fissures', phase: 'second-oeuvre', critical: true, duree: 8 }
    ]
  },
  'ite': {
    label: 'ITE (Isolation Thermique Extérieure)',
    category: 'exterieur',
    suggestedMetiers: ['facadier', 'menuisierExt'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Audit thermique', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Dossier CEE/MaPrimeRénov\'', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Adaptation appuis de fenêtre', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Traitement ponts thermiques', phase: 'second-oeuvre', critical: true, duree: 8 }
    ]
  },
  'piscine': {
    label: 'Construction piscine',
    category: 'exterieur',
    suggestedMetiers: ['terrassier', 'pisciniste', 'electricien', 'paysagiste'],
    suggestedPhases: ['preparation', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Déclaration préalable/permis', phase: 'preparation', critical: true, duree: 1 },
      { text: 'Étude implantation', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Système de sécurité obligatoire', phase: 'second-oeuvre', critical: true, duree: 8 }
    ]
  },
  'amenagement-exterieur': {
    label: 'Aménagement paysager',
    category: 'exterieur',
    suggestedMetiers: ['paysagiste', 'terrassier', 'macon', 'electricien'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Plan paysager', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Arrosage automatique', phase: 'second-oeuvre', critical: false, duree: 16 },
      { text: 'Éclairage extérieur', phase: 'second-oeuvre', critical: false, duree: 8 }
    ]
  },
  'cloture-portail': {
    label: 'Clôtures et portails',
    category: 'exterieur',
    suggestedMetiers: ['serrurier', 'macon', 'electricien'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Bornage terrain si nécessaire', phase: 'preparation', critical: true, duree: 4 },
      { text: 'Fondations piliers/poteaux', phase: 'gros-oeuvre', critical: true, duree: 8 },
      { text: 'Motorisation portail', phase: 'second-oeuvre', critical: false, duree: 8 },
      { text: 'Interphone/visiophone', phase: 'second-oeuvre', critical: false, duree: 4 }
    ]
  },

  // TERTIAIRE/COMMERCIAL
  'bureau-openspace': {
    label: 'Aménagement bureau/open space',
    category: 'tertiaire',
    suggestedMetiers: ['platrier', 'electricien', 'climaticien', 'peintre', 'parqueteur'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Plan d\'implantation', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Cloisons modulaires', phase: 'second-oeuvre', critical: false, duree: 16 },
      { text: 'Faux-plafond acoustique', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Câblage réseau RJ45', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Éclairage LED', phase: 'second-oeuvre', critical: false, duree: 8 }
    ]
  },
  'commerce-boutique': {
    label: 'Aménagement commerce/boutique',
    category: 'tertiaire',
    suggestedMetiers: ['platrier', 'electricien', 'peintre', 'menuisier', 'vitrier'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Dossier ERP (si > 200m²)', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Vitrine commerciale', phase: 'second-oeuvre', critical: false, duree: 16 },
      { text: 'Éclairage commercial', phase: 'second-oeuvre', critical: false, duree: 8 },
      { text: 'Mobilier sur mesure', phase: 'second-oeuvre', critical: false, duree: 16 },
      { text: 'Enseigne extérieure', phase: 'finitions', critical: false, duree: 8 }
    ]
  },
  'restaurant-bar': {
    label: 'Création restaurant/bar',
    category: 'tertiaire',
    suggestedMetiers: ['plombier', 'electricien', 'climaticien', 'platrier', 'carreleur'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Dossier ERP catégorie 5', phase: 'preparation', critical: true, duree: 16 },
      { text: 'Extraction cuisine professionnelle', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Bac à graisse', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Chambre froide', phase: 'second-oeuvre', critical: false, duree: 8 },
      { text: 'Bar/comptoir sur mesure', phase: 'second-oeuvre', critical: false, duree: 16 },
      { text: 'Commission sécurité', phase: 'finitions', critical: true, duree: 4 }
    ]
  },
  'mise-aux-normes-erp': {
    label: 'Mise aux normes ERP',
    category: 'tertiaire',
    suggestedMetiers: ['electricien', 'platrier', 'menuisier', 'plombier'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Diagnostic accessibilité ERP', phase: 'preparation', critical: true, duree: 8 },
      { text: 'Mise aux normes incendie', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Éclairage de sécurité (BAES)', phase: 'second-oeuvre', critical: true, duree: 8 },
      { text: 'Sanitaires PMR', phase: 'second-oeuvre', critical: true, duree: 16 },
      { text: 'Signalétique', phase: 'finitions', critical: true, duree: 4 },
      { text: 'Visite commission sécurité', phase: 'finitions', critical: true, duree: 4 }
    ]
  },

  // SIMPLES (métier unique)
  'peinture': {
    label: 'Travaux de peinture',
    category: 'simple',
    suggestedMetiers: ['peintre'],
    suggestedPhases: ['preparation', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: []
  },
  'electricite': {
    label: 'Travaux électriques',
    category: 'simple',
    suggestedMetiers: ['electricien'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Consuel si nécessaire', phase: 'finitions', critical: true, duree: 4 }
    ]
  },
  'plomberie': {
    label: 'Travaux de plomberie',
    category: 'simple',
    suggestedMetiers: ['plombier'],
    suggestedPhases: ['preparation', 'demolition', 'gros-oeuvre', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: []
  },
  'chauffage': {
    label: 'Installation chauffage',
    category: 'simple',
    suggestedMetiers: ['chauffagiste'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: [
      { text: 'Certificat conformité gaz', phase: 'finitions', critical: true, duree: 1 }
    ]
  },
  'climatisation': {
    label: 'Installation climatisation',
    category: 'simple',
    suggestedMetiers: ['climaticien'],
    suggestedPhases: ['preparation', 'second-oeuvre', 'finitions', 'nettoyage'],
    specificTasks: []
  },
  'carrelage': {
    label: 'Travaux de carrelage',
    category: 'simple',
    suggestedMetiers: ['carreleur'],
    suggestedPhases: ['preparation', 'demolition', 'second-oeuvre', 'finitions', 'nettoyage'],
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
    .replace(/[î]/g, 'i')
    .replace(/\s+/g, '');

  const metierMap = {
    // Gros œuvre
    'terrassier': 'terrassier',
    'terrassement': 'terrassier',
    'vrd': 'terrassier',
    'macon': 'macon',
    'maconnerie': 'macon',
    'charpentierbois': 'charpentierBois',
    'charpente': 'charpentierBois',
    'charpentier': 'charpentierBois',
    'charpentiermetal': 'charpentierMetal',
    'charpentiermetallique': 'charpentierMetal',
    'metallerie': 'charpentierMetal',
    'couvreur': 'couvreur',
    'couverture': 'couvreur',
    'toiture': 'couvreur',
    'etancheur': 'etancheur',
    'etancheite': 'etancheur',
    'facadier': 'facadier',
    'facade': 'facadier',
    'ite': 'facadier',
    'ravalement': 'facadier',
    'demolisseur': 'demolisseur',
    'demolition': 'demolisseur',

    // Second œuvre
    'plombier': 'plombier',
    'plomberie': 'plombier',
    'electricien': 'electricien',
    'electricite': 'electricien',
    'chauffagiste': 'chauffagiste',
    'chauffage': 'chauffagiste',
    'climaticien': 'climaticien',
    'climatisation': 'climaticien',
    'vmc': 'climaticien',
    'platrier': 'platrier',
    'platrerie': 'platrier',
    'plaquiste': 'platrier',
    'placo': 'platrier',
    'peintre': 'peintre',
    'peinture': 'peintre',
    'carreleur': 'carreleur',
    'carrelage': 'carreleur',
    'faience': 'carreleur',
    'parqueteur': 'parqueteur',
    'parquet': 'parqueteur',
    'sol': 'parqueteur',
    'solier': 'parqueteur',
    'menuisier': 'menuisier',
    'menuiserie': 'menuisier',
    'agencement': 'menuisier',
    'menuisierext': 'menuisierExt',
    'menuiserieext': 'menuisierExt',
    'fenetres': 'menuisierExt',
    'vitrier': 'vitrier',
    'vitrerie': 'vitrier',
    'miroitier': 'vitrier',
    'miroiterie': 'vitrier',
    'serrurier': 'serrurier',
    'serrurerie': 'serrurier',
    'metallier': 'serrurier',
    'fumiste': 'fumiste',
    'cheminee': 'fumiste',
    'poele': 'fumiste',

    // Spécialistes
    'installateur solaire': 'installateurSolaire',
    'solaire': 'installateurSolaire',
    'photovoltaique': 'installateurSolaire',
    'panneaux': 'installateurSolaire',
    'domoticien': 'domoticien',
    'domotique': 'domoticien',
    'smarthome': 'domoticien',
    'acousticien': 'acousticien',
    'acoustique': 'acousticien',
    'isolation phonique': 'acousticien',
    'paysagiste': 'paysagiste',
    'paysagisme': 'paysagiste',
    'jardin': 'paysagiste',
    'pisciniste': 'pisciniste',
    'piscine': 'pisciniste',
    'ascensoriste': 'ascensoriste',
    'ascenseur': 'ascensoriste'
  };

  const key = metierMap[normalized];
  return key ? TASKS_BY_METIER[key] : { label: 'Général', phases: {}, icon: 'Briefcase' };
}

/**
 * Générer une liste de tâches suggérées pour un chantier
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
      critical: false,
      duree: null // À estimer
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

  // Poids des phases
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

/**
 * Obtenir la liste des métiers disponibles
 */
export function getAvailableMetiers() {
  return Object.entries(TASKS_BY_METIER).map(([key, value]) => ({
    key,
    label: value.label,
    icon: value.icon,
    category: value.category,
    taskCount: Object.values(value.phases || {}).reduce((sum, tasks) => sum + tasks.length, 0)
  }));
}

/**
 * Obtenir la liste des types de projets disponibles
 */
export function getAvailableProjectTypes() {
  return Object.entries(TASKS_BY_PROJECT_TYPE).map(([key, value]) => ({
    key,
    label: value.label,
    category: value.category,
    suggestedMetiers: value.suggestedMetiers || [],
    taskCount: (value.specificTasks || []).length
  }));
}

/**
 * Calculer la durée totale estimée d'un ensemble de tâches
 */
export function calculateTotalDuration(tasks) {
  return tasks.reduce((sum, task) => sum + (task.duree || 0), 0);
}
