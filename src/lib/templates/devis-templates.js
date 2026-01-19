/**
 * Templates de devis pre-remplis par metier BTP
 * Chaque template contient des lignes types avec prix moyens du marche
 */

export const TEMPLATES_METIER = {
  plomberie: {
    id: 'plomberie',
    nom: 'Plomberie',
    icon: 'Droplets',
    color: '#3b82f6',
    templates: [
      {
        id: 'sdb-complete',
        nom: 'Renovation salle de bain complete',
        description: 'Depose + fourniture + pose equipements sanitaires',
        lignes: [
          { description: 'Depose anciens equipements sanitaires', quantite: 1, unite: 'forfait', prixUnitaire: 350, tva: 10 },
          { description: 'Evacuation gravats et dechets', quantite: 1, unite: 'forfait', prixUnitaire: 150, tva: 10 },
          { description: 'Fourniture et pose WC suspendu Geberit', quantite: 1, unite: 'unite', prixUnitaire: 650, prixAchat: 380, tva: 10 },
          { description: 'Fourniture et pose meuble vasque 80cm', quantite: 1, unite: 'unite', prixUnitaire: 550, prixAchat: 320, tva: 10 },
          { description: 'Fourniture et pose mitigeur lavabo', quantite: 1, unite: 'unite', prixUnitaire: 180, prixAchat: 85, tva: 10 },
          { description: 'Fourniture et pose colonne de douche thermostatique', quantite: 1, unite: 'unite', prixUnitaire: 450, prixAchat: 220, tva: 10 },
          { description: 'Fourniture et pose receveur douche 90x90', quantite: 1, unite: 'unite', prixUnitaire: 380, prixAchat: 180, tva: 10 },
          { description: 'Fourniture et pose paroi de douche', quantite: 1, unite: 'unite', prixUnitaire: 420, prixAchat: 200, tva: 10 },
          { description: 'Raccordements eau chaude/froide', quantite: 1, unite: 'forfait', prixUnitaire: 280, tva: 10 },
          { description: 'Raccordements evacuations', quantite: 1, unite: 'forfait', prixUnitaire: 220, tva: 10 },
        ]
      },
      {
        id: 'chauffe-eau',
        nom: 'Remplacement chauffe-eau',
        description: 'Depose ancien + fourniture + pose nouveau ballon',
        lignes: [
          { description: 'Depose et evacuation ancien chauffe-eau', quantite: 1, unite: 'forfait', prixUnitaire: 120, tva: 10 },
          { description: 'Fourniture chauffe-eau 200L Atlantic', quantite: 1, unite: 'unite', prixUnitaire: 650, prixAchat: 380, tva: 10 },
          { description: 'Groupe de securite neuf', quantite: 1, unite: 'unite', prixUnitaire: 85, prixAchat: 35, tva: 10 },
          { description: 'Raccordements et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 180, tva: 10 },
          { description: 'Verification etancheite', quantite: 1, unite: 'forfait', prixUnitaire: 50, tva: 10 },
        ]
      },
      {
        id: 'fuite',
        nom: 'Reparation fuite',
        description: 'Recherche et reparation de fuite',
        lignes: [
          { description: 'Deplacement et diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 80, tva: 10 },
          { description: 'Recherche de fuite', quantite: 1, unite: 'heure', prixUnitaire: 55, tva: 10 },
          { description: 'Reparation canalisation', quantite: 1, unite: 'forfait', prixUnitaire: 120, tva: 10 },
          { description: 'Fournitures diverses (joints, raccords)', quantite: 1, unite: 'forfait', prixUnitaire: 45, prixAchat: 15, tva: 10 },
        ]
      }
    ]
  },

  electricite: {
    id: 'electricite',
    nom: 'Electricite',
    icon: 'Zap',
    color: '#eab308',
    templates: [
      {
        id: 'tableau-nfc15100',
        nom: 'Mise aux normes tableau electrique',
        description: 'Remplacement tableau selon NFC 15-100',
        lignes: [
          { description: 'Depose ancien tableau', quantite: 1, unite: 'forfait', prixUnitaire: 150, tva: 10 },
          { description: 'Fourniture tableau 3 rangees Schneider/Legrand', quantite: 1, unite: 'unite', prixUnitaire: 320, prixAchat: 180, tva: 10 },
          { description: 'Disjoncteur differentiel 63A type A', quantite: 1, unite: 'unite', prixUnitaire: 120, prixAchat: 65, tva: 10 },
          { description: 'Disjoncteur differentiel 40A type AC', quantite: 1, unite: 'unite', prixUnitaire: 85, prixAchat: 45, tva: 10 },
          { description: 'Disjoncteurs modulaires 16A', quantite: 8, unite: 'unite', prixUnitaire: 18, prixAchat: 8, tva: 10 },
          { description: 'Disjoncteurs modulaires 20A', quantite: 4, unite: 'unite', prixUnitaire: 20, prixAchat: 9, tva: 10 },
          { description: 'Disjoncteur 32A (cuisson)', quantite: 1, unite: 'unite', prixUnitaire: 28, prixAchat: 12, tva: 10 },
          { description: 'Parafoudre', quantite: 1, unite: 'unite', prixUnitaire: 95, prixAchat: 50, tva: 10 },
          { description: 'Cablage et raccordements', quantite: 1, unite: 'forfait', prixUnitaire: 280, tva: 10 },
          { description: 'Mise en service et tests', quantite: 1, unite: 'forfait', prixUnitaire: 120, tva: 10 },
        ]
      },
      {
        id: 'prises-interrupteurs',
        nom: 'Installation prises et interrupteurs',
        description: 'Creation de points electriques',
        lignes: [
          { description: 'Creation point electrique (saignee + tirage)', quantite: 1, unite: 'unite', prixUnitaire: 95, tva: 10 },
          { description: 'Fourniture et pose prise 2P+T Legrand', quantite: 1, unite: 'unite', prixUnitaire: 45, prixAchat: 12, tva: 10 },
          { description: 'Fourniture et pose interrupteur va-et-vient', quantite: 1, unite: 'unite', prixUnitaire: 55, prixAchat: 15, tva: 10 },
          { description: 'Fourniture et pose spot LED encastre', quantite: 1, unite: 'unite', prixUnitaire: 65, prixAchat: 25, tva: 10 },
          { description: 'Rebouchage saignees', quantite: 1, unite: 'ml', prixUnitaire: 12, tva: 10 },
        ]
      }
    ]
  },

  maconnerie: {
    id: 'maconnerie',
    nom: 'Maconnerie',
    icon: 'Layers',
    color: '#78716c',
    templates: [
      {
        id: 'mur-parpaings',
        nom: 'Construction mur en parpaings',
        description: 'Mur de cloture ou separation',
        lignes: [
          { description: 'Implantation et tracage', quantite: 1, unite: 'forfait', prixUnitaire: 150, tva: 10 },
          { description: 'Terrassement fondations', quantite: 1, unite: 'm3', prixUnitaire: 45, tva: 10 },
          { description: 'Beton fondation dose a 350kg', quantite: 1, unite: 'm3', prixUnitaire: 180, prixAchat: 95, tva: 10 },
          { description: 'Parpaings creux 20x20x50', quantite: 10, unite: 'unite', prixUnitaire: 2.50, prixAchat: 1.20, tva: 10 },
          { description: 'Mortier de pose', quantite: 1, unite: 'sac 25kg', prixUnitaire: 8, prixAchat: 4, tva: 10 },
          { description: 'Chainages horizontaux (ferraillage)', quantite: 1, unite: 'ml', prixUnitaire: 25, prixAchat: 12, tva: 10 },
          { description: 'Main d\'oeuvre maconnerie', quantite: 1, unite: 'm2', prixUnitaire: 85, tva: 10 },
        ]
      },
      {
        id: 'dalle-beton',
        nom: 'Dalle beton',
        description: 'Coulee de dalle avec ferraillage',
        lignes: [
          { description: 'Preparation sol (decaissement)', quantite: 1, unite: 'm2', prixUnitaire: 15, tva: 10 },
          { description: 'Mise en place herisson', quantite: 1, unite: 'm2', prixUnitaire: 12, prixAchat: 5, tva: 10 },
          { description: 'Film polyane', quantite: 1, unite: 'm2', prixUnitaire: 3, prixAchat: 1, tva: 10 },
          { description: 'Treillis soude ST25', quantite: 1, unite: 'm2', prixUnitaire: 8, prixAchat: 4, tva: 10 },
          { description: 'Beton pret a l\'emploi', quantite: 1, unite: 'm3', prixUnitaire: 180, prixAchat: 95, tva: 10 },
          { description: 'Coulee et talochage', quantite: 1, unite: 'm2', prixUnitaire: 35, tva: 10 },
        ]
      }
    ]
  },

  peinture: {
    id: 'peinture',
    nom: 'Peinture',
    icon: 'Brush',
    color: '#ec4899',
    templates: [
      {
        id: 'piece-complete',
        nom: 'Peinture piece complete',
        description: 'Murs + plafond avec preparation',
        lignes: [
          { description: 'Protection sols et mobilier', quantite: 1, unite: 'forfait', prixUnitaire: 80, tva: 10 },
          { description: 'Lessivage murs et plafond', quantite: 1, unite: 'm2', prixUnitaire: 4, tva: 10 },
          { description: 'Rebouchage fissures et trous', quantite: 1, unite: 'forfait', prixUnitaire: 120, tva: 10 },
          { description: 'Sous-couche d\'accroche', quantite: 1, unite: 'm2', prixUnitaire: 8, prixAchat: 2, tva: 10 },
          { description: 'Peinture acrylique mate murs (2 couches)', quantite: 1, unite: 'm2', prixUnitaire: 18, prixAchat: 4, tva: 10 },
          { description: 'Peinture plafond blanc mat (2 couches)', quantite: 1, unite: 'm2', prixUnitaire: 16, prixAchat: 3, tva: 10 },
          { description: 'Finitions (angles, plinthes)', quantite: 1, unite: 'ml', prixUnitaire: 6, tva: 10 },
        ]
      },
      {
        id: 'facade',
        nom: 'Ravalement facade',
        description: 'Nettoyage + traitement + peinture facade',
        lignes: [
          { description: 'Montage echafaudage', quantite: 1, unite: 'm2', prixUnitaire: 15, tva: 10 },
          { description: 'Nettoyage haute pression', quantite: 1, unite: 'm2', prixUnitaire: 8, tva: 10 },
          { description: 'Traitement anti-mousse', quantite: 1, unite: 'm2', prixUnitaire: 6, prixAchat: 2, tva: 10 },
          { description: 'Rebouchage fissures facade', quantite: 1, unite: 'ml', prixUnitaire: 18, tva: 10 },
          { description: 'Fixateur de fond', quantite: 1, unite: 'm2', prixUnitaire: 5, prixAchat: 1.50, tva: 10 },
          { description: 'Peinture facade minerale (2 couches)', quantite: 1, unite: 'm2', prixUnitaire: 28, prixAchat: 8, tva: 10 },
          { description: 'Demontage echafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 200, tva: 10 },
        ]
      }
    ]
  },

  menuiserie: {
    id: 'menuiserie',
    nom: 'Menuiserie',
    icon: 'Ruler',
    color: '#a16207',
    templates: [
      {
        id: 'fenetre-pvc',
        nom: 'Remplacement fenetre PVC',
        description: 'Depose + fourniture + pose fenetre PVC double vitrage',
        lignes: [
          { description: 'Depose ancienne fenetre', quantite: 1, unite: 'unite', prixUnitaire: 80, tva: 10 },
          { description: 'Fourniture fenetre PVC 2 vantaux Uw 1.3', quantite: 1, unite: 'unite', prixUnitaire: 450, prixAchat: 280, tva: 10 },
          { description: 'Pose fenetre en renovation', quantite: 1, unite: 'unite', prixUnitaire: 180, tva: 10 },
          { description: 'Joint silicone etancheite', quantite: 1, unite: 'forfait', prixUnitaire: 35, prixAchat: 8, tva: 10 },
          { description: 'Finitions interieures (habillage)', quantite: 1, unite: 'forfait', prixUnitaire: 65, tva: 10 },
          { description: 'Evacuation gravats', quantite: 1, unite: 'forfait', prixUnitaire: 40, tva: 10 },
        ]
      },
      {
        id: 'porte-interieure',
        nom: 'Pose porte interieure',
        description: 'Fourniture et pose bloc-porte',
        lignes: [
          { description: 'Bloc-porte postforme 83cm', quantite: 1, unite: 'unite', prixUnitaire: 220, prixAchat: 120, tva: 10 },
          { description: 'Pose bloc-porte', quantite: 1, unite: 'unite', prixUnitaire: 150, tva: 10 },
          { description: 'Poignee de porte inox', quantite: 1, unite: 'unite', prixUnitaire: 35, prixAchat: 15, tva: 10 },
          { description: 'Finitions et reglages', quantite: 1, unite: 'forfait', prixUnitaire: 40, tva: 10 },
        ]
      }
    ]
  },

  carrelage: {
    id: 'carrelage',
    nom: 'Carrelage',
    icon: 'LayoutGrid',
    color: '#0891b2',
    templates: [
      {
        id: 'sol-carrelage',
        nom: 'Pose carrelage sol',
        description: 'Preparation + pose + joints',
        lignes: [
          { description: 'Preparation support (ragerage)', quantite: 1, unite: 'm2', prixUnitaire: 15, tva: 10 },
          { description: 'Fourniture carrelage gres cerame 60x60', quantite: 1, unite: 'm2', prixUnitaire: 45, prixAchat: 25, tva: 10 },
          { description: 'Pose collee droite', quantite: 1, unite: 'm2', prixUnitaire: 45, tva: 10 },
          { description: 'Colle carrelage C2', quantite: 1, unite: 'sac 25kg', prixUnitaire: 25, prixAchat: 12, tva: 10 },
          { description: 'Joints carrelage', quantite: 1, unite: 'm2', prixUnitaire: 8, prixAchat: 2, tva: 10 },
          { description: 'Plinthes assorties', quantite: 1, unite: 'ml', prixUnitaire: 18, prixAchat: 8, tva: 10 },
        ]
      },
      {
        id: 'faience-sdb',
        nom: 'Faience salle de bain',
        description: 'Pose faience murale avec finitions',
        lignes: [
          { description: 'Preparation support', quantite: 1, unite: 'm2', prixUnitaire: 12, tva: 10 },
          { description: 'Fourniture faience 20x60', quantite: 1, unite: 'm2', prixUnitaire: 35, prixAchat: 18, tva: 10 },
          { description: 'Pose faience murale', quantite: 1, unite: 'm2', prixUnitaire: 55, tva: 10 },
          { description: 'Colle carrelage C1', quantite: 1, unite: 'sac 25kg', prixUnitaire: 18, prixAchat: 8, tva: 10 },
          { description: 'Joints epoxy hydrofuge', quantite: 1, unite: 'm2', prixUnitaire: 12, prixAchat: 4, tva: 10 },
          { description: 'Profils de finition alu', quantite: 1, unite: 'ml', prixUnitaire: 15, prixAchat: 6, tva: 10 },
        ]
      }
    ]
  },

  chauffage: {
    id: 'chauffage',
    nom: 'Chauffage / Climatisation',
    icon: 'Thermometer',
    color: '#dc2626',
    templates: [
      {
        id: 'clim-split',
        nom: 'Installation climatisation split',
        description: 'Fourniture et pose climatisation reversible',
        lignes: [
          { description: 'Climatisation reversible 2.5kW Daikin/Mitsubishi', quantite: 1, unite: 'unite', prixUnitaire: 1200, prixAchat: 750, tva: 10 },
          { description: 'Support unite exterieure', quantite: 1, unite: 'unite', prixUnitaire: 85, prixAchat: 35, tva: 10 },
          { description: 'Liaisons frigorifiques (6m)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 80, tva: 10 },
          { description: 'Alimentation electrique dediee', quantite: 1, unite: 'forfait', prixUnitaire: 220, tva: 10 },
          { description: 'Pose et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 450, tva: 10 },
          { description: 'Attestation capacitaire fluides frigorigenes', quantite: 1, unite: 'forfait', prixUnitaire: 80, tva: 10 },
        ]
      },
      {
        id: 'radiateur-electrique',
        nom: 'Remplacement radiateurs electriques',
        description: 'Depose anciens + pose radiateurs a inertie',
        lignes: [
          { description: 'Depose ancien radiateur', quantite: 1, unite: 'unite', prixUnitaire: 40, tva: 10 },
          { description: 'Radiateur inertie seche 1500W', quantite: 1, unite: 'unite', prixUnitaire: 380, prixAchat: 220, tva: 10 },
          { description: 'Pose et raccordement', quantite: 1, unite: 'unite', prixUnitaire: 85, tva: 10 },
          { description: 'Programmateur fil pilote', quantite: 1, unite: 'unite', prixUnitaire: 120, prixAchat: 55, tva: 10 },
        ]
      }
    ]
  },

  couverture: {
    id: 'couverture',
    nom: 'Couverture / Toiture',
    icon: 'Home',
    color: '#7c3aed',
    templates: [
      {
        id: 'renovation-toiture',
        nom: 'Renovation toiture tuiles',
        description: 'Depose + ecran + pose tuiles neuves',
        lignes: [
          { description: 'Montage echafaudage perimetrique', quantite: 1, unite: 'm2', prixUnitaire: 18, tva: 10 },
          { description: 'Depose ancienne couverture', quantite: 1, unite: 'm2', prixUnitaire: 15, tva: 10 },
          { description: 'Verification/renfort charpente', quantite: 1, unite: 'forfait', prixUnitaire: 350, tva: 10 },
          { description: 'Ecran sous-toiture HPV', quantite: 1, unite: 'm2', prixUnitaire: 12, prixAchat: 5, tva: 10 },
          { description: 'Contre-lattes et liteaux', quantite: 1, unite: 'm2', prixUnitaire: 18, prixAchat: 8, tva: 10 },
          { description: 'Tuiles terre cuite (75/m2)', quantite: 75, unite: 'unite', prixUnitaire: 1.20, prixAchat: 0.60, tva: 10 },
          { description: 'Pose tuiles', quantite: 1, unite: 'm2', prixUnitaire: 45, tva: 10 },
          { description: 'Faitieres', quantite: 1, unite: 'ml', prixUnitaire: 35, prixAchat: 15, tva: 10 },
          { description: 'Demontage echafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 300, tva: 10 },
        ]
      }
    ]
  },

  isolation: {
    id: 'isolation',
    nom: 'Isolation',
    icon: 'Layers',
    color: '#059669',
    templates: [
      {
        id: 'combles-perdus',
        nom: 'Isolation combles perdus',
        description: 'Isolation en laine soufflee R=7',
        lignes: [
          { description: 'Preparation combles (deblaiement)', quantite: 1, unite: 'forfait', prixUnitaire: 180, tva: 5.5 },
          { description: 'Protection spots et VMC', quantite: 1, unite: 'forfait', prixUnitaire: 120, tva: 5.5 },
          { description: 'Reperage trappe et circulation', quantite: 1, unite: 'forfait', prixUnitaire: 80, tva: 5.5 },
          { description: 'Laine minerale soufflee ep.30cm R=7', quantite: 1, unite: 'm2', prixUnitaire: 28, prixAchat: 12, tva: 5.5 },
          { description: 'Mise en place piges de reperage', quantite: 1, unite: 'm2', prixUnitaire: 2, tva: 5.5 },
          { description: 'Attestation fin de travaux', quantite: 1, unite: 'forfait', prixUnitaire: 50, tva: 5.5 },
        ]
      },
      {
        id: 'ite',
        nom: 'Isolation thermique exterieure',
        description: 'ITE polystyrene + enduit',
        lignes: [
          { description: 'Montage echafaudage', quantite: 1, unite: 'm2', prixUnitaire: 18, tva: 5.5 },
          { description: 'Preparation support', quantite: 1, unite: 'm2', prixUnitaire: 8, tva: 5.5 },
          { description: 'Panneau PSE gris ep.14cm R=4.5', quantite: 1, unite: 'm2', prixUnitaire: 35, prixAchat: 18, tva: 5.5 },
          { description: 'Collage et chevillage', quantite: 1, unite: 'm2', prixUnitaire: 25, tva: 5.5 },
          { description: 'Sous-enduit arme fibre de verre', quantite: 1, unite: 'm2', prixUnitaire: 22, prixAchat: 8, tva: 5.5 },
          { description: 'Enduit de finition gratte', quantite: 1, unite: 'm2', prixUnitaire: 28, prixAchat: 10, tva: 5.5 },
          { description: 'Profiles de depart et d\'angle', quantite: 1, unite: 'ml', prixUnitaire: 15, prixAchat: 6, tva: 5.5 },
        ]
      }
    ]
  },

  terrassement: {
    id: 'terrassement',
    nom: 'Terrassement / VRD',
    icon: 'Mountain',
    color: '#854d0e',
    templates: [
      {
        id: 'tranchee-reseau',
        nom: 'Tranchee pour reseaux',
        description: 'Terrassement + pose gaine + remblai',
        lignes: [
          { description: 'Implantation et piquetage', quantite: 1, unite: 'forfait', prixUnitaire: 150, tva: 20 },
          { description: 'Terrassement tranchee 60x80', quantite: 1, unite: 'ml', prixUnitaire: 35, tva: 20 },
          { description: 'Lit de sable fond de fouille', quantite: 1, unite: 'ml', prixUnitaire: 8, prixAchat: 3, tva: 20 },
          { description: 'Gaine TPC diam.63 rouge', quantite: 1, unite: 'ml', prixUnitaire: 6, prixAchat: 2.50, tva: 20 },
          { description: 'Grillage avertisseur', quantite: 1, unite: 'ml', prixUnitaire: 2, prixAchat: 0.50, tva: 20 },
          { description: 'Remblai et compactage', quantite: 1, unite: 'ml', prixUnitaire: 15, tva: 20 },
          { description: 'Evacuation terres excedentaires', quantite: 1, unite: 'm3', prixUnitaire: 45, tva: 20 },
        ]
      },
      {
        id: 'allee-enrobe',
        nom: 'Allee en enrobe',
        description: 'Terrassement + tout-venant + enrobe noir',
        lignes: [
          { description: 'Decaissement 30cm', quantite: 1, unite: 'm2', prixUnitaire: 18, tva: 20 },
          { description: 'Geotextile anti-contaminant', quantite: 1, unite: 'm2', prixUnitaire: 4, prixAchat: 1.50, tva: 20 },
          { description: 'Fond de forme tout-venant 0/31.5', quantite: 1, unite: 'm2', prixUnitaire: 22, prixAchat: 12, tva: 20 },
          { description: 'Compactage', quantite: 1, unite: 'm2', prixUnitaire: 5, tva: 20 },
          { description: 'Enrobe noir 0/10 ep.5cm', quantite: 1, unite: 'm2', prixUnitaire: 45, prixAchat: 25, tva: 20 },
          { description: 'Bordures beton', quantite: 1, unite: 'ml', prixUnitaire: 35, prixAchat: 15, tva: 20 },
        ]
      }
    ]
  }
};

/**
 * Obtenir tous les metiers disponibles
 * @returns {Array} Liste des metiers avec id, nom, icon, color
 */
export const getMetiers = () => {
  return Object.values(TEMPLATES_METIER).map(m => ({
    id: m.id,
    nom: m.nom,
    icon: m.icon,
    color: m.color,
    templatesCount: m.templates.length
  }));
};

/**
 * Obtenir les templates d'un metier
 * @param {string} metierId - ID du metier
 * @returns {Array} Liste des templates
 */
export const getTemplatesByMetier = (metierId) => {
  return TEMPLATES_METIER[metierId]?.templates || [];
};

/**
 * Obtenir un template specifique
 * @param {string} metierId - ID du metier
 * @param {string} templateId - ID du template
 * @returns {Object|null} Template ou null
 */
export const getTemplate = (metierId, templateId) => {
  const metier = TEMPLATES_METIER[metierId];
  if (!metier) return null;
  return metier.templates.find(t => t.id === templateId) || null;
};

/**
 * Preparer les lignes d'un template pour un nouveau devis
 * @param {Object} template - Template selectionne
 * @returns {Array} Lignes formatees pour le formulaire de devis
 */
export const prepareTemplateLines = (template) => {
  return template.lignes.map((ligne, index) => ({
    id: `${Date.now()}_${index}`,
    description: ligne.description,
    quantite: ligne.quantite,
    unite: ligne.unite,
    prixUnitaire: ligne.prixUnitaire,
    prixAchat: ligne.prixAchat || 0,
    montant: ligne.quantite * ligne.prixUnitaire,
    tva: ligne.tva || 10
  }));
};

export default {
  TEMPLATES_METIER,
  getMetiers,
  getTemplatesByMetier,
  getTemplate,
  prepareTemplateLines
};
