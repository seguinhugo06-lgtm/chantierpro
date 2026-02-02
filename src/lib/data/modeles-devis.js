/**
 * Modèles de Devis Express - Templates pré-remplis par métier
 * Chaque modèle contient des lignes types avec prix indicatifs et marges cibles
 */

export const MODELES_DEVIS = {
  plomberie: {
    nom: 'Plomberie',
    icon: '🔧',
    color: '#3b82f6',
    modeles: [
      {
        id: 'sdb-complete',
        nom: 'Installation complète salle de bain',
        description: 'Création SDB complète (douche ou baignoire, lavabo, WC)',
        prixMin: 3500,
        prixMax: 7000,
        margeCible: 45,
        lignes: [
          { description: 'Dépose sanitaires existants', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
          { description: 'Alimentation eau chaude/froide PER', quantite: 10, unite: 'ml', prixUnitaire: 30, prixAchat: 12 },
          { description: 'Évacuations EU PVC', quantite: 8, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
          { description: 'F&P receveur douche extra-plat', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
          { description: 'F&P meuble vasque', quantite: 1, unite: 'u', prixUnitaire: 750, prixAchat: 400 },
          { description: 'F&P WC suspendu (bâti-support inclus)', quantite: 1, unite: 'u', prixUnitaire: 950, prixAchat: 550 },
          { description: 'F&P robinetterie (mitigeurs)', quantite: 2, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
          { description: 'Raccordements et essais', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        ]
      },
      {
        id: 'sdb-renovation',
        nom: 'Rénovation salle de bain (remplacement sanitaires)',
        description: 'Remplacement des sanitaires sans modification réseau',
        prixMin: 2000,
        prixMax: 4500,
        margeCible: 50,
        lignes: [
          { description: 'Dépose sanitaires existants', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
          { description: 'F&P receveur douche / baignoire', quantite: 1, unite: 'u', prixUnitaire: 550, prixAchat: 300 },
          { description: 'F&P meuble vasque', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
          { description: 'F&P robinetterie', quantite: 2, unite: 'u', prixUnitaire: 150, prixAchat: 70 },
          { description: 'F&P WC', quantite: 1, unite: 'u', prixUnitaire: 450, prixAchat: 250 },
          { description: 'Raccordements et essais', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        ]
      },
      {
        id: 'chauffe-eau',
        nom: 'Remplacement chauffe-eau',
        description: 'Dépose ancien + pose nouveau ballon',
        prixMin: 500,
        prixMax: 1500,
        margeCible: 55,
        lignes: [
          { description: 'Dépose chauffe-eau existant', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
          { description: 'F&P chauffe-eau électrique 200L', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
          { description: 'Remplacement groupe de sécurité', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
          { description: 'Mise en service et essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 20 },
        ]
      },
      {
        id: 'ce-thermo',
        nom: 'Installation chauffe-eau thermodynamique',
        description: 'Remplacement cumulus par thermodynamique',
        prixMin: 2500,
        prixMax: 4000,
        margeCible: 40,
        lignes: [
          { description: 'Dépose chauffe-eau existant', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 30 },
          { description: 'F&P chauffe-eau thermodynamique', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1800 },
          { description: 'Raccordement hydraulique et électrique', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
          { description: 'Création évacuation condensats', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
          { description: 'Mise en service et essais', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 40 },
        ]
      },
      {
        id: 'fuite',
        nom: 'Réparation fuite d\'eau',
        description: 'Intervention dépannage fuite',
        prixMin: 200,
        prixMax: 500,
        margeCible: 65,
        lignes: [
          { description: 'Déplacement et diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 20 },
          { description: 'Recherche et réparation fuite', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 50 },
          { description: 'Fournitures (raccords, joints)', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 25 },
        ]
      },
      {
        id: 'point-eau',
        nom: 'Création point d\'eau',
        description: 'Alimentation + évacuation cuisine/buanderie',
        prixMin: 400,
        prixMax: 800,
        margeCible: 55,
        lignes: [
          { description: 'Alimentation eau froide PER', quantite: 5, unite: 'ml', prixUnitaire: 28, prixAchat: 12 },
          { description: 'Alimentation eau chaude PER', quantite: 5, unite: 'ml', prixUnitaire: 32, prixAchat: 14 },
          { description: 'Évacuation PVC Ø40', quantite: 4, unite: 'ml', prixUnitaire: 30, prixAchat: 12 },
          { description: 'Raccordement et robinetterie', quantite: 1, unite: 'u', prixUnitaire: 150, prixAchat: 60 },
          { description: 'Essais et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 20 },
        ]
      },
      {
        id: 'plomberie-maison',
        nom: 'Installation plomberie maison complète (~120 m²)',
        description: 'Plomberie neuve construction/rénovation totale',
        prixMin: 8000,
        prixMax: 17000,
        margeCible: 40,
        lignes: [
          { description: 'Réseau alimentation eau PER', quantite: 60, unite: 'ml', prixUnitaire: 32, prixAchat: 14 },
          { description: 'Réseau évacuation EU/EV PVC', quantite: 40, unite: 'ml', prixUnitaire: 38, prixAchat: 16 },
          { description: 'F&P chauffe-eau thermodynamique', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1800 },
          { description: 'Équipement SDB 1 (douche + vasque + WC)', quantite: 1, unite: 'lot', prixUnitaire: 2200, prixAchat: 1200 },
          { description: 'Équipement SDB 2 / WC séparé', quantite: 1, unite: 'lot', prixUnitaire: 1200, prixAchat: 650 },
          { description: 'Équipement cuisine (évier + robinetterie)', quantite: 1, unite: 'lot', prixUnitaire: 450, prixAchat: 220 },
          { description: 'Raccordement machines (LL, LV)', quantite: 2, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
          { description: 'Nourrice / collecteur', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
          { description: 'Vannes d\'arrêt et accessoires', quantite: 1, unite: 'lot', prixUnitaire: 250, prixAchat: 100 },
          { description: 'Essais pression et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 100 },
        ]
      },
    ]
  },

  electricite: {
    nom: 'Électricité',
    icon: '⚡',
    color: '#eab308',
    modeles: [
      {
        id: 'normes-t2t3',
        nom: 'Mise en conformité appartement (T2/T3)',
        description: 'Remise aux normes NF C 15-100',
        prixMin: 3000,
        prixMax: 6000,
        margeCible: 50,
        lignes: [
          { description: 'Remplacement tableau électrique 2 rangées', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
          { description: 'Mise à la terre', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 100 },
          { description: 'Remplacement prises non conformes', quantite: 12, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
          { description: 'Ajout circuits spécialisés (LL, LV, four)', quantite: 3, unite: 'u', prixUnitaire: 95, prixAchat: 40 },
          { description: 'Interrupteurs différentiels 30mA', quantite: 4, unite: 'u', prixUnitaire: 85, prixAchat: 45 },
          { description: 'Liaisons équipotentielles SDB', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
          { description: 'Reprise câblage existant', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 150 },
          { description: 'Vérification et CONSUEL', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        ]
      },
      {
        id: 'elec-maison',
        nom: 'Installation électrique maison neuve (~100 m²)',
        description: 'Électricité complète NF C 15-100',
        prixMin: 8000,
        prixMax: 15000,
        margeCible: 45,
        lignes: [
          { description: 'Tableau électrique complet 4 rangées', quantite: 1, unite: 'u', prixUnitaire: 1200, prixAchat: 700 },
          { description: 'Prises de courant 16A', quantite: 35, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
          { description: 'Points lumineux + interrupteurs', quantite: 18, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
          { description: 'Circuits spécialisés (plaque, four, LL, LV, SL)', quantite: 5, unite: 'u', prixUnitaire: 110, prixAchat: 45 },
          { description: 'Prises RJ45 / TV', quantite: 8, unite: 'u', prixUnitaire: 75, prixAchat: 30 },
          { description: 'VMC hygroréglable B', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 450 },
          { description: 'Câblage et gaines ICTA', quantite: 200, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
          { description: 'Mise à la terre + liaisons équipotentielles', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
          { description: 'Coffret de communication grade 3', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 200 },
          { description: 'Essais et CONSUEL', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        ]
      },
      {
        id: 'circuit-prise',
        nom: 'Ajout circuit prise / éclairage',
        description: 'Extension réseau existant',
        prixMin: 200,
        prixMax: 500,
        margeCible: 60,
        lignes: [
          { description: 'Passage gaine ICTA', quantite: 8, unite: 'ml', prixUnitaire: 12, prixAchat: 4 },
          { description: 'F&P prise(s) ou point lumineux', quantite: 2, unite: 'u', prixUnitaire: 70, prixAchat: 28 },
          { description: 'Raccordement au tableau', quantite: 1, unite: 'u', prixUnitaire: 85, prixAchat: 30 },
          { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
        ]
      },
      {
        id: 'borne-ve',
        nom: 'Installation borne de recharge VE',
        description: 'Borne 7kW résidentielle',
        prixMin: 1000,
        prixMax: 2000,
        margeCible: 45,
        lignes: [
          { description: 'Fourniture borne 7kW', quantite: 1, unite: 'u', prixUnitaire: 850, prixAchat: 550 },
          { description: 'Tirage câble 6mm²', quantite: 15, unite: 'ml', prixUnitaire: 18, prixAchat: 7 },
          { description: 'Protection tableau (disj + diff)', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 90 },
          { description: 'Pose et raccordement', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
          { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 30 },
        ]
      },
      {
        id: 'tableau',
        nom: 'Remplacement tableau électrique',
        description: 'Nouveau tableau NF C 15-100',
        prixMin: 800,
        prixMax: 1800,
        margeCible: 55,
        lignes: [
          { description: 'Dépose ancien tableau', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 35 },
          { description: 'F&P tableau neuf 2 rangées', quantite: 1, unite: 'u', prixUnitaire: 580, prixAchat: 320 },
          { description: 'Différentiels + disjoncteurs', quantite: 1, unite: 'lot', prixUnitaire: 350, prixAchat: 180 },
          { description: 'Raccordement circuits', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
          { description: 'Essais et vérifications', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 35 },
        ]
      },
      {
        id: 'vmc',
        nom: 'Installation VMC',
        description: 'VMC simple flux hygroréglable B',
        prixMin: 600,
        prixMax: 1200,
        margeCible: 55,
        lignes: [
          { description: 'Fourniture VMC hygroréglable B', quantite: 1, unite: 'u', prixUnitaire: 420, prixAchat: 220 },
          { description: 'Pose groupe en combles', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
          { description: 'Bouches d\'extraction', quantite: 4, unite: 'u', prixUnitaire: 35, prixAchat: 15 },
          { description: 'Gaines isolées', quantite: 15, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
          { description: 'Raccordement électrique et essais', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        ]
      },
    ]
  },

  maconnerie: {
    nom: 'Maçonnerie',
    icon: '🧱',
    color: '#f97316',
    modeles: [
      {
        id: 'ouverture-mur',
        nom: 'Ouverture mur porteur',
        description: 'Création ouverture + IPN',
        prixMin: 2000,
        prixMax: 5000,
        margeCible: 50,
        lignes: [
          { description: 'Étaiement provisoire', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 150 },
          { description: 'Découpe et démolition', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 200 },
          { description: 'F&P IPN', quantite: 3, unite: 'ml', prixUnitaire: 280, prixAchat: 150 },
          { description: 'Scellement IPN', quantite: 2, unite: 'u', prixUnitaire: 180, prixAchat: 60 },
          { description: 'Reprise enduit / finitions', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 120 },
          { description: 'Évacuation gravats', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 100 },
        ]
      },
      {
        id: 'cloison-placo',
        nom: 'Construction cloison placo',
        description: 'Cloison BA13 sur rail',
        prixMin: 800,
        prixMax: 2000,
        margeCible: 55,
        lignes: [
          { description: 'Ossature métallique', quantite: 12, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
          { description: 'Plaques BA13 (double face)', quantite: 24, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
          { description: 'Isolation intérieure laine de verre', quantite: 12, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
          { description: 'Bandes, enduit, finition', quantite: 24, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        ]
      },
      {
        id: 'faux-plafond',
        nom: 'Faux plafond placo',
        description: 'Plafond suspendu BA13',
        prixMin: 1000,
        prixMax: 2500,
        margeCible: 55,
        lignes: [
          { description: 'Ossature suspendue', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
          { description: 'Plaques BA13', quantite: 20, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
          { description: 'Isolation phonique', quantite: 20, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
          { description: 'Bandes, enduit, finition', quantite: 20, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        ]
      },
      {
        id: 'dalle-beton',
        nom: 'Coulage dalle béton',
        description: 'Dalle ép. 12 cm',
        prixMin: 2000,
        prixMax: 5000,
        margeCible: 45,
        lignes: [
          { description: 'Préparation du sol', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
          { description: 'Film PE + treillis soudé', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
          { description: 'Coulage béton ép. 12cm', quantite: 30, unite: 'm²', prixUnitaire: 65, prixAchat: 35 },
          { description: 'Règle vibrante et finition', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
          { description: 'Cure béton', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        ]
      },
      {
        id: 'enduit-facade',
        nom: 'Enduit façade',
        description: 'Enduit monocouche projeté',
        prixMin: 2000,
        prixMax: 4500,
        margeCible: 50,
        lignes: [
          { description: 'Préparation support', quantite: 60, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
          { description: 'Projection enduit monocouche', quantite: 60, unite: 'm²', prixUnitaire: 38, prixAchat: 18 },
          { description: 'Points singuliers (angles, tableaux)', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
          { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 200 },
        ]
      },
    ]
  },

  peinture: {
    nom: 'Peinture',
    icon: '🎨',
    color: '#ec4899',
    modeles: [
      {
        id: 'appart-complet',
        nom: 'Peinture appartement complet (T2 ~50 m²)',
        description: 'Murs + plafonds + boiseries',
        prixMin: 2500,
        prixMax: 5000,
        margeCible: 60,
        lignes: [
          { description: 'Préparation murs (rebouchage, ponçage)', quantite: 120, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
          { description: 'Sous-couche murs et plafonds', quantite: 170, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
          { description: 'Peinture murs acrylique 2 couches', quantite: 120, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
          { description: 'Peinture plafonds blanc mat 2 couches', quantite: 50, unite: 'm²', prixUnitaire: 22, prixAchat: 7 },
          { description: 'Peinture boiseries / portes', quantite: 15, unite: 'm²', prixUnitaire: 28, prixAchat: 9 },
          { description: 'Protection + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        ]
      },
      {
        id: 'piece-unique',
        nom: 'Peinture pièce unique',
        description: '1 pièce murs + plafond (~15 m²)',
        prixMin: 500,
        prixMax: 1200,
        margeCible: 65,
        lignes: [
          { description: 'Préparation support (rebouchage)', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 35 },
          { description: 'Sous-couche', quantite: 50, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
          { description: 'Peinture murs 2 couches', quantite: 35, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
          { description: 'Peinture plafond 2 couches', quantite: 15, unite: 'm²', prixUnitaire: 22, prixAchat: 7 },
          { description: 'Protection et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        ]
      },
      {
        id: 'ravalement',
        nom: 'Ravalement façade',
        description: 'Nettoyage + peinture façade',
        prixMin: 3000,
        prixMax: 8000,
        margeCible: 50,
        lignes: [
          { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 800, prixAchat: 400 },
          { description: 'Nettoyage haute pression', quantite: 80, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
          { description: 'Fixateur', quantite: 80, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
          { description: 'Peinture façade 2 couches', quantite: 80, unite: 'm²', prixUnitaire: 25, prixAchat: 10 },
          { description: 'Repli chantier', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
        ]
      },
      {
        id: 'papier-peint',
        nom: 'Pose papier peint',
        description: 'Dépose ancien + pose intissé',
        prixMin: 600,
        prixMax: 1500,
        margeCible: 60,
        lignes: [
          { description: 'Dépose ancien revêtement', quantite: 30, unite: 'm²', prixUnitaire: 8, prixAchat: 2 },
          { description: 'Préparation murs', quantite: 30, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
          { description: 'F&P papier peint intissé', quantite: 30, unite: 'm²', prixUnitaire: 25, prixAchat: 10 },
          { description: 'Finitions et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 30 },
        ]
      },
    ]
  },

  menuiserie: {
    nom: 'Menuiserie',
    icon: '🪵',
    color: '#a855f7',
    modeles: [
      {
        id: 'fenetres-maison',
        nom: 'Remplacement fenêtres maison (4-5 fenêtres)',
        description: 'Dépose/repose fenêtres PVC DV',
        prixMin: 2500,
        prixMax: 5000,
        margeCible: 45,
        lignes: [
          { description: 'Dépose fenêtres existantes', quantite: 5, unite: 'u', prixUnitaire: 55, prixAchat: 18 },
          { description: 'Fourniture fenêtres PVC DV', quantite: 5, unite: 'u', prixUnitaire: 480, prixAchat: 280 },
          { description: 'Pose et calfeutrement', quantite: 5, unite: 'u', prixUnitaire: 120, prixAchat: 40 },
          { description: 'Habillage intérieur', quantite: 5, unite: 'u', prixUnitaire: 85, prixAchat: 30 },
          { description: 'Nettoyage et évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        ]
      },
      {
        id: 'porte-entree',
        nom: 'Pose porte d\'entrée',
        description: 'Fourniture et pose porte d\'entrée alu',
        prixMin: 1000,
        prixMax: 3000,
        margeCible: 45,
        lignes: [
          { description: 'Dépose porte existante', quantite: 1, unite: 'u', prixUnitaire: 80, prixAchat: 25 },
          { description: 'Fourniture porte d\'entrée alu', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1100 },
          { description: 'Pose, calage et fixation', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
          { description: 'Habillage et finitions', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        ]
      },
      {
        id: 'parquet',
        nom: 'Pose parquet pièce',
        description: 'Parquet flottant ou contrecollé (~25 m²)',
        prixMin: 800,
        prixMax: 2000,
        margeCible: 55,
        lignes: [
          { description: 'Préparation sol (ragréage)', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
          { description: 'Sous-couche acoustique', quantite: 25, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
          { description: 'F&P parquet contrecollé', quantite: 25, unite: 'm²', prixUnitaire: 48, prixAchat: 25 },
          { description: 'Plinthes et barres de seuil', quantite: 20, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        ]
      },
      {
        id: 'placard',
        nom: 'Création placard sur mesure',
        description: 'Placard encastré avec aménagement',
        prixMin: 800,
        prixMax: 2500,
        margeCible: 50,
        lignes: [
          { description: 'Structure / caisson', quantite: 2.5, unite: 'ml', prixUnitaire: 280, prixAchat: 140 },
          { description: 'Tablettes et penderie', quantite: 6, unite: 'u', prixUnitaire: 45, prixAchat: 20 },
          { description: 'Portes coulissantes', quantite: 2, unite: 'u', prixUnitaire: 320, prixAchat: 180 },
          { description: 'Quincaillerie', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 50 },
          { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        ]
      },
      {
        id: 'volets-roulants',
        nom: 'Pose volets roulants maison',
        description: 'Équipement volets roulants électriques (5 fenêtres)',
        prixMin: 2000,
        prixMax: 5000,
        margeCible: 45,
        lignes: [
          { description: 'Fourniture volets roulants électriques', quantite: 5, unite: 'u', prixUnitaire: 550, prixAchat: 320 },
          { description: 'Pose et fixation', quantite: 5, unite: 'u', prixUnitaire: 120, prixAchat: 40 },
          { description: 'Raccordement électrique', quantite: 5, unite: 'u', prixUnitaire: 85, prixAchat: 30 },
          { description: 'Programmation et essais', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 45 },
        ]
      },
    ]
  },

  carrelage: {
    nom: 'Carrelage',
    icon: '🔶',
    color: '#14b8a6',
    modeles: [
      {
        id: 'sdb-carrelage',
        nom: 'Carrelage salle de bain complète',
        description: 'Sol + murs douche + faïence (~8 m²)',
        prixMin: 2000,
        prixMax: 4500,
        margeCible: 55,
        lignes: [
          { description: 'Préparation supports', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
          { description: 'Étanchéité zone douche (SPEC)', quantite: 6, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
          { description: 'Carrelage sol grand format', quantite: 8, unite: 'm²', prixUnitaire: 55, prixAchat: 25 },
          { description: 'Faïence murale', quantite: 15, unite: 'm²', prixUnitaire: 48, prixAchat: 22 },
          { description: 'Joints + profils de finition', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
          { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        ]
      },
      {
        id: 'sol-sejour',
        nom: 'Carrelage sol pièce de vie',
        description: 'Carrelage grand format salon (~35 m²)',
        prixMin: 1500,
        prixMax: 3500,
        margeCible: 55,
        lignes: [
          { description: 'Ragréage', quantite: 35, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
          { description: 'F&P carrelage 60x60', quantite: 35, unite: 'm²', prixUnitaire: 55, prixAchat: 25 },
          { description: 'Découpes et ajustements', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
          { description: 'Plinthes', quantite: 25, unite: 'ml', prixUnitaire: 14, prixAchat: 6 },
          { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        ]
      },
      {
        id: 'credence',
        nom: 'Crédence cuisine',
        description: 'Carrelage entre plan de travail et meubles hauts',
        prixMin: 400,
        prixMax: 1000,
        margeCible: 60,
        lignes: [
          { description: 'Préparation support', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
          { description: 'F&P carrelage mural métro', quantite: 4, unite: 'm²', prixUnitaire: 55, prixAchat: 25 },
          { description: 'Joints et finitions', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
        ]
      },
      {
        id: 'terrasse-carrelage',
        nom: 'Carrelage terrasse',
        description: 'Carrelage extérieur sur dalle (~20 m²)',
        prixMin: 2000,
        prixMax: 4500,
        margeCible: 50,
        lignes: [
          { description: 'Préparation support', quantite: 20, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
          { description: 'Colle extérieure flexible', quantite: 20, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
          { description: 'F&P carrelage extérieur', quantite: 20, unite: 'm²', prixUnitaire: 58, prixAchat: 28 },
          { description: 'Joints de dilatation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
          { description: 'Nez de marche et finitions', quantite: 4, unite: 'u', prixUnitaire: 35, prixAchat: 15 },
        ]
      },
    ]
  },

  chauffage: {
    nom: 'Chauffage / Climatisation',
    icon: '🔥',
    color: '#ef4444',
    modeles: [
      {
        id: 'pac-3pieces',
        nom: 'Installation PAC air/air (3 pièces)',
        description: 'Multisplit 3 unités intérieures',
        prixMin: 5000,
        prixMax: 9000,
        margeCible: 40,
        lignes: [
          { description: 'Fourniture unité extérieure', quantite: 1, unite: 'u', prixUnitaire: 2200, prixAchat: 1400 },
          { description: 'Fourniture unités intérieures', quantite: 3, unite: 'u', prixUnitaire: 750, prixAchat: 450 },
          { description: 'Pose et liaison frigorifique', quantite: 3, unite: 'u', prixUnitaire: 380, prixAchat: 150 },
          { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
          { description: 'Mise sous vide et charge', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
          { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 60 },
        ]
      },
      {
        id: 'chaudiere-gaz',
        nom: 'Remplacement chaudière gaz',
        description: 'Dépose + pose condensation',
        prixMin: 3000,
        prixMax: 5500,
        margeCible: 40,
        lignes: [
          { description: 'Dépose ancienne chaudière', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
          { description: 'F&P chaudière gaz condensation', quantite: 1, unite: 'u', prixUnitaire: 3200, prixAchat: 2100 },
          { description: 'Raccordement hydraulique', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 130 },
          { description: 'Raccordement fumisterie', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
          { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        ]
      },
      {
        id: 'poele-granules',
        nom: 'Installation poêle à granulés',
        description: 'Pose poêle + conduit',
        prixMin: 3500,
        prixMax: 6500,
        margeCible: 40,
        lignes: [
          { description: 'F&P poêle à granulés', quantite: 1, unite: 'u', prixUnitaire: 3500, prixAchat: 2300 },
          { description: 'Tubage conduit inox', quantite: 6, unite: 'ml', prixUnitaire: 95, prixAchat: 50 },
          { description: 'Sortie toiture', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 140 },
          { description: 'Raccordement et habillage', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
          { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 60 },
        ]
      },
      {
        id: 'clim-mono',
        nom: 'Climatisation mono-split',
        description: 'Clim réversible 1 pièce',
        prixMin: 1500,
        prixMax: 3000,
        margeCible: 50,
        lignes: [
          { description: 'F&P unité int. + ext.', quantite: 1, unite: 'lot', prixUnitaire: 1400, prixAchat: 850 },
          { description: 'Liaison frigorifique', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 130 },
          { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
          { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 45 },
        ]
      },
    ]
  },

  couverture: {
    nom: 'Couverture / Toiture',
    icon: '🏠',
    color: '#6366f1',
    modeles: [
      {
        id: 'refection-toiture',
        nom: 'Réfection couverture complète',
        description: 'Dépose + repose tuiles (~80 m²)',
        prixMin: 8000,
        prixMax: 18000,
        margeCible: 40,
        lignes: [
          { description: 'Échafaudage / nacelle', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 600 },
          { description: 'Dépose couverture', quantite: 80, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
          { description: 'Remplacement liteaux', quantite: 80, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
          { description: 'Écran sous-toiture HPV', quantite: 80, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
          { description: 'F&P tuiles neuves', quantite: 80, unite: 'm²', prixUnitaire: 58, prixAchat: 30 },
          { description: 'Faîtage, rives, noues', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 400 },
          { description: 'Zinguerie (gouttières, descentes)', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 600 },
        ]
      },
      {
        id: 'reparation-toiture',
        nom: 'Réparation toiture ponctuelle',
        description: 'Intervention fuite ou tuiles',
        prixMin: 300,
        prixMax: 800,
        margeCible: 60,
        lignes: [
          { description: 'Déplacement et diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
          { description: 'Remplacement tuiles', quantite: 10, unite: 'u', prixUnitaire: 18, prixAchat: 7 },
          { description: 'Réfection solin / faîtage', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
          { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        ]
      },
      {
        id: 'demoussage',
        nom: 'Nettoyage et traitement toiture',
        description: 'Démoussage + hydrofuge (~80 m²)',
        prixMin: 800,
        prixMax: 2000,
        margeCible: 60,
        lignes: [
          { description: 'Nettoyage HP', quantite: 80, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
          { description: 'Traitement anti-mousse', quantite: 80, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
          { description: 'Hydrofuge', quantite: 80, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
          { description: 'Nettoyage gouttières', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        ]
      },
    ]
  },

  isolation: {
    nom: 'Isolation',
    icon: '🧊',
    color: '#06b6d4',
    modeles: [
      {
        id: 'combles-perdus',
        nom: 'Isolation combles perdus (soufflage R=7)',
        description: 'Laine soufflée en combles perdus (~60 m²)',
        prixMin: 1500,
        prixMax: 3000,
        margeCible: 55,
        lignes: [
          { description: 'Préparation combles (déblaiement)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
          { description: 'Protection spots et VMC', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
          { description: 'Repérage trappe et circulation', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
          { description: 'Laine minérale soufflée ép.30cm R=7', quantite: 60, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
          { description: 'Mise en place piges de repérage', quantite: 60, unite: 'm²', prixUnitaire: 2, prixAchat: 1 },
          { description: 'Attestation fin de travaux', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
        ]
      },
      {
        id: 'ite-pse',
        nom: 'ITE polystyrène + enduit',
        description: 'Isolation thermique par l\'extérieur (~80 m²)',
        prixMin: 8000,
        prixMax: 14000,
        margeCible: 45,
        lignes: [
          { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 1500, prixAchat: 750 },
          { description: 'Préparation support', quantite: 80, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
          { description: 'Pose panneaux PSE 140mm', quantite: 80, unite: 'm²', prixUnitaire: 55, prixAchat: 28 },
          { description: 'Armature fibre de verre + sous-enduit', quantite: 80, unite: 'm²', prixUnitaire: 25, prixAchat: 12 },
          { description: 'Enduit de finition', quantite: 80, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
          { description: 'Points singuliers (appuis, tableaux)', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 500 },
          { description: 'Repli chantier', quantite: 1, unite: 'forfait', prixUnitaire: 300, prixAchat: 100 },
        ]
      },
      {
        id: 'rampants',
        nom: 'Isolation rampants (combles aménagés)',
        description: 'Sous-toiture + placo (~40 m²)',
        prixMin: 3000,
        prixMax: 6000,
        margeCible: 50,
        lignes: [
          { description: 'Isolant entre chevrons R=6', quantite: 40, unite: 'm²', prixUnitaire: 38, prixAchat: 18 },
          { description: 'Pare-vapeur', quantite: 40, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
          { description: 'Placo BA13 sur ossature', quantite: 40, unite: 'm²', prixUnitaire: 48, prixAchat: 22 },
          { description: 'Bandes et joints', quantite: 40, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
          { description: 'Trappe d\'accès', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 50 },
        ]
      },
    ]
  },

  terrassement: {
    nom: 'Terrassement / VRD',
    icon: '🔨',
    color: '#84cc16',
    modeles: [
      {
        id: 'allee-beton',
        nom: 'Allée / cour béton désactivé',
        description: 'Allée carrossable (~40 m²)',
        prixMin: 2000,
        prixMax: 5000,
        margeCible: 45,
        lignes: [
          { description: 'Décaissement', quantite: 40, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
          { description: 'Sous-couche tout-venant', quantite: 40, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
          { description: 'Coffrage', quantite: 30, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
          { description: 'Coulage béton désactivé', quantite: 40, unite: 'm²', prixUnitaire: 75, prixAchat: 40 },
          { description: 'Lavage et finition', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        ]
      },
      {
        id: 'cloture-portail',
        nom: 'Clôture et portail',
        description: 'Clôture périmétrique + portail (~30 ml)',
        prixMin: 3000,
        prixMax: 8000,
        margeCible: 45,
        lignes: [
          { description: 'Terrassement + scellement poteaux', quantite: 15, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
          { description: 'F&P panneaux grillage rigide', quantite: 30, unite: 'ml', prixUnitaire: 55, prixAchat: 28 },
          { description: 'Piliers béton portail', quantite: 2, unite: 'u', prixUnitaire: 220, prixAchat: 100 },
          { description: 'F&P portail coulissant', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1100 },
          { description: 'Motorisation portail', quantite: 1, unite: 'u', prixUnitaire: 750, prixAchat: 420 },
        ]
      },
      {
        id: 'terrasse-beton',
        nom: 'Terrasse béton',
        description: 'Dalle béton extérieure (~25 m²)',
        prixMin: 2000,
        prixMax: 5000,
        margeCible: 50,
        lignes: [
          { description: 'Terrassement et fond de forme', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
          { description: 'Film PE + hérisson', quantite: 25, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
          { description: 'Coffrage', quantite: 20, unite: 'ml', prixUnitaire: 15, prixAchat: 6 },
          { description: 'Ferraillage et coulage béton', quantite: 25, unite: 'm²', prixUnitaire: 68, prixAchat: 35 },
          { description: 'Finition (lissé, brossé, désactivé)', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
        ]
      },
    ]
  },

  paysagisme: {
    nom: 'Paysagisme',
    icon: '🌿',
    color: '#22c55e',
    modeles: [
      {
        id: 'terrasse-bois',
        nom: 'Terrasse bois',
        description: 'Terrasse bois sur lambourdes (~20 m²)',
        prixMin: 3000,
        prixMax: 7000,
        margeCible: 45,
        lignes: [
          { description: 'Terrassement et nivellement', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
          { description: 'Plots béton / réglables', quantite: 25, unite: 'u', prixUnitaire: 18, prixAchat: 8 },
          { description: 'Lambourdes', quantite: 20, unite: 'm²', prixUnitaire: 25, prixAchat: 12 },
          { description: 'Lames bois/composite', quantite: 20, unite: 'm²', prixUnitaire: 85, prixAchat: 45 },
          { description: 'Finitions (nez de marche, cornières)', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 150 },
        ]
      },
      {
        id: 'amenagement-jardin',
        nom: 'Aménagement jardin',
        description: 'Gazon + plantations (~100 m²)',
        prixMin: 2000,
        prixMax: 6000,
        margeCible: 50,
        lignes: [
          { description: 'Préparation terrain', quantite: 100, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
          { description: 'Semis gazon', quantite: 80, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
          { description: 'Plantation arbustes et haies', quantite: 15, unite: 'u', prixUnitaire: 55, prixAchat: 25 },
          { description: 'Paillage + géotextile', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
          { description: 'Bordures', quantite: 25, unite: 'ml', prixUnitaire: 15, prixAchat: 6 },
          { description: 'Arrosage automatique (2 zones)', quantite: 2, unite: 'u', prixUnitaire: 380, prixAchat: 180 },
        ]
      },
    ]
  },

  serrurerie: {
    nom: 'Serrurerie',
    icon: '🔐',
    color: '#64748b',
    modeles: [
      {
        id: 'blindage',
        nom: 'Blindage porte d\'entrée',
        description: 'Blindage porte existante',
        prixMin: 1000,
        prixMax: 2000,
        margeCible: 50,
        lignes: [
          { description: 'Kit blindage', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
          { description: 'Pose tôle + paumelles', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 130 },
          { description: 'Serrure 5 points', quantite: 1, unite: 'u', prixUnitaire: 420, prixAchat: 230 },
          { description: 'Cylindre haute sécurité', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 90 },
        ]
      },
      {
        id: 'serrure',
        nom: 'Remplacement serrure',
        description: 'Changement serrure multipoints',
        prixMin: 200,
        prixMax: 500,
        margeCible: 60,
        lignes: [
          { description: 'Dépose serrure existante', quantite: 1, unite: 'u', prixUnitaire: 60, prixAchat: 18 },
          { description: 'F&P serrure multipoints', quantite: 1, unite: 'u', prixUnitaire: 320, prixAchat: 180 },
          { description: 'Cylindre et essais', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 55 },
        ]
      },
    ]
  },
};

/**
 * Obtenir tous les métiers avec leurs modèles
 */
export function getMetiersWithModeles() {
  return Object.entries(MODELES_DEVIS).map(([id, metier]) => ({
    id,
    ...metier,
    modelesCount: metier.modeles.length,
  }));
}

/**
 * Obtenir les modèles d'un métier
 */
export function getModelesByMetier(metierId) {
  const metier = MODELES_DEVIS[metierId];
  if (!metier) return [];
  return metier.modeles;
}

/**
 * Obtenir un modèle spécifique
 */
export function getModele(metierId, modeleId) {
  const metier = MODELES_DEVIS[metierId];
  if (!metier) return null;
  return metier.modeles.find(m => m.id === modeleId);
}

/**
 * Préparer les lignes d'un modèle pour le formulaire de devis
 */
export function prepareModeleLignes(modele, tvaDefaut = 10) {
  return modele.lignes.map((ligne, index) => ({
    id: `ligne-${Date.now()}-${index}`,
    description: ligne.description,
    quantite: ligne.quantite,
    unite: ligne.unite,
    prixUnitaire: ligne.prixUnitaire,
    prixAchat: ligne.prixAchat,
    tva: tvaDefaut,
    total: ligne.quantite * ligne.prixUnitaire,
  }));
}

/**
 * Calculer le total d'un modèle
 */
export function calculateModeleTotal(modele) {
  return modele.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixUnitaire), 0);
}

/**
 * Calculer la marge d'un modèle
 */
export function calculateModeleMarge(modele) {
  const totalVente = modele.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixUnitaire), 0);
  const totalAchat = modele.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixAchat), 0);
  if (totalVente === 0) return 0;
  return Math.round(((totalVente - totalAchat) / totalVente) * 100);
}

export default MODELES_DEVIS;
