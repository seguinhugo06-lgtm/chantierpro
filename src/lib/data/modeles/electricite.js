/**
 * Modèles Devis - ÉLECTRICITÉ (24 modèles)
 */

export const ELECTRICITE_MODELES = {
  nom: 'Électricité',
  icon: '⚡',
  color: '#eab308',
  modeles: [
    {
      id: 'normes-studio',
      nom: 'Mise en conformité studio / T1',
      description: '~7 lignes | ~1 500 – 3 000 € HT | ~55% marge',
      prixMin: 1500,
      prixMax: 3000,
      margeCible: 55,
      lignes: [
        { description: 'Remplacement tableau 1 rangée', quantite: 1, unite: 'u', prixUnitaire: 450, prixAchat: 250 },
        { description: 'Différentiels 30mA', quantite: 2, unite: 'u', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Remplacement prises non conformes', quantite: 8, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'Ajout circuit spécialisé (cuisson)', quantite: 1, unite: 'u', prixUnitaire: 150, prixAchat: 55 },
        { description: 'Mise à la terre', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 100 },
        { description: 'Liaison équipotentielle SDB', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'normes-t2t3',
      nom: 'Mise en conformité T2/T3',
      description: '~8 lignes | ~3 000 – 6 000 € HT | ~50% marge',
      prixMin: 3000,
      prixMax: 6000,
      margeCible: 50,
      lignes: [
        { description: 'Remplacement tableau 2 rangées', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
        { description: 'Différentiels 30mA type A + AC', quantite: 4, unite: 'u', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Remplacement prises', quantite: 15, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'Circuits spécialisés', quantite: 4, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
        { description: 'Mise à la terre', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Liaisons équipotentielles SDB', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Reprise câblage', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 150 },
        { description: 'CONSUEL', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'normes-maison',
      nom: 'Mise en conformité T4 / T5 / maison',
      description: '~9 lignes | ~4 000 – 8 000 € HT | ~45% marge',
      prixMin: 4000,
      prixMax: 8000,
      margeCible: 45,
      lignes: [
        { description: 'Remplacement tableau 3-4 rangées', quantite: 1, unite: 'u', prixUnitaire: 950, prixAchat: 550 },
        { description: 'Différentiels 30mA', quantite: 6, unite: 'u', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Disjoncteurs divisionnaires', quantite: 20, unite: 'u', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Remplacement prises', quantite: 25, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'Circuits spécialisés', quantite: 6, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
        { description: 'Mise à la terre', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Liaisons équipotentielles', quantite: 2, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Câblage complet', quantite: 150, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'CONSUEL', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'elec-maison-neuve',
      nom: 'Installation électrique maison neuve (~100 m²)',
      description: '~11 lignes | ~8 000 – 15 000 € HT | ~45% marge',
      prixMin: 8000,
      prixMax: 15000,
      margeCible: 45,
      lignes: [
        { description: 'Tableau électrique complet', quantite: 1, unite: 'u', prixUnitaire: 1200, prixAchat: 700 },
        { description: 'Prises de courant 16A', quantite: 35, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'Points lumineux + interrupteurs', quantite: 20, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
        { description: 'Circuits spécialisés (cuisson, LL, SL, LV, four)', quantite: 5, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
        { description: 'Prises RJ45', quantite: 8, unite: 'u', prixUnitaire: 75, prixAchat: 30 },
        { description: 'Prises TV/SAT', quantite: 4, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'VMC hygroréglable', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 450 },
        { description: 'Câblage et gaines ICTA', quantite: 250, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Mise à la terre + liaisons', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Coffret de communication', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 200 },
        { description: 'Essais et CONSUEL', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'remplacement-tableau',
      nom: 'Remplacement tableau électrique',
      description: '~5 lignes | ~800 – 1 800 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 1800,
      margeCible: 55,
      lignes: [
        { description: 'Dépose ancien tableau', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 35 },
        { description: 'F&P tableau neuf', quantite: 1, unite: 'u', prixUnitaire: 580, prixAchat: 320 },
        { description: 'Différentiels + disjoncteurs', quantite: 1, unite: 'lot', prixUnitaire: 380, prixAchat: 200 },
        { description: 'Raccordement circuits', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 30 },
      ]
    },
    {
      id: 'ajout-circuit-prise',
      nom: 'Ajout circuit prise',
      description: '~4 lignes | ~150 – 400 € HT | ~65% marge',
      prixMin: 150,
      prixMax: 400,
      margeCible: 65,
      lignes: [
        { description: 'Passage gaine ICTA', quantite: 8, unite: 'ml', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P prise(s) 16A', quantite: 2, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'Disjoncteur au tableau', quantite: 1, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'ajout-circuit-eclairage',
      nom: 'Ajout circuit éclairage',
      description: '~4 lignes | ~150 – 400 € HT | ~65% marge',
      prixMin: 150,
      prixMax: 400,
      margeCible: 65,
      lignes: [
        { description: 'Passage gaine', quantite: 10, unite: 'ml', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P point lumineux + interrupteur', quantite: 2, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
        { description: 'Disjoncteur au tableau', quantite: 1, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'circuit-specialise',
      nom: 'Ajout circuit spécialisé (cuisson, four, LL…)',
      description: '~4 lignes | ~200 – 500 € HT | ~60% marge',
      prixMin: 200,
      prixMax: 500,
      margeCible: 60,
      lignes: [
        { description: 'Tirage câble section adaptée', quantite: 12, unite: 'ml', prixUnitaire: 15, prixAchat: 6 },
        { description: 'F&P prise spécialisée (20A ou 32A)', quantite: 1, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
        { description: 'Protection tableau', quantite: 1, unite: 'u', prixUnitaire: 65, prixAchat: 28 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'vmc-simple-flux',
      nom: 'Installation VMC simple flux',
      description: '~5 lignes | ~500 – 1 000 € HT | ~55% marge',
      prixMin: 500,
      prixMax: 1000,
      margeCible: 55,
      lignes: [
        { description: 'F&P caisson VMC', quantite: 1, unite: 'u', prixUnitaire: 320, prixAchat: 180 },
        { description: 'Pose en combles', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Bouches d\'extraction', quantite: 4, unite: 'u', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Gaines isolées', quantite: 15, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Raccordement et essais', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'vmc-double-flux',
      nom: 'Installation VMC double flux',
      description: '~6 lignes | ~2 500 – 5 000 € HT | ~40% marge',
      prixMin: 2500,
      prixMax: 5000,
      margeCible: 40,
      lignes: [
        { description: 'F&P caisson VMC double flux', quantite: 1, unite: 'u', prixUnitaire: 2200, prixAchat: 1400 },
        { description: 'Réseau insufflation', quantite: 20, unite: 'ml', prixUnitaire: 25, prixAchat: 12 },
        { description: 'Réseau extraction', quantite: 15, unite: 'ml', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Bouches (insufflation + extraction)', quantite: 8, unite: 'u', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Raccordement et condensats', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Mise en service et réglages', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 65 },
      ]
    },
    {
      id: 'borne-ve-7kw',
      nom: 'Installation borne de recharge VE (7kW)',
      description: '~5 lignes | ~1 000 – 2 000 € HT | ~45% marge',
      prixMin: 1000,
      prixMax: 2000,
      margeCible: 45,
      lignes: [
        { description: 'F&P borne de recharge 7kW', quantite: 1, unite: 'u', prixUnitaire: 850, prixAchat: 550 },
        { description: 'Tirage câble 6mm²', quantite: 15, unite: 'ml', prixUnitaire: 18, prixAchat: 7 },
        { description: 'Protection tableau (disj + diff)', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 90 },
        { description: 'Pose et raccordement', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 30 },
      ]
    },
    {
      id: 'borne-ve-22kw',
      nom: 'Installation borne de recharge VE (22kW)',
      description: '~6 lignes | ~2 000 – 4 000 € HT | ~40% marge',
      prixMin: 2000,
      prixMax: 4000,
      margeCible: 40,
      lignes: [
        { description: 'F&P borne de recharge 22kW', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1200 },
        { description: 'Tirage câble 10mm² (triphasé)', quantite: 15, unite: 'ml', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Protection tableau (disj + diff tetra)', quantite: 1, unite: 'u', prixUnitaire: 350, prixAchat: 180 },
        { description: 'Pose et raccordement', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        { description: 'Demande CONSUEL (si nécessaire)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'interphone-visiophone',
      nom: 'Installation interphone / visiophone',
      description: '~4 lignes | ~300 – 800 € HT | ~50% marge',
      prixMin: 300,
      prixMax: 800,
      margeCible: 50,
      lignes: [
        { description: 'F&P platine de rue', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 160 },
        { description: 'F&P moniteur intérieur / combiné', quantite: 1, unite: 'u', prixUnitaire: 220, prixAchat: 120 },
        { description: 'Câblage', quantite: 15, unite: 'ml', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Raccordement et essais', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'alarme-intrusion',
      nom: 'Installation alarme intrusion',
      description: '~6 lignes | ~800 – 2 500 € HT | ~45% marge',
      prixMin: 800,
      prixMax: 2500,
      margeCible: 45,
      lignes: [
        { description: 'F&P centrale alarme', quantite: 1, unite: 'u', prixUnitaire: 480, prixAchat: 280 },
        { description: 'Détecteurs de mouvement', quantite: 4, unite: 'u', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Détecteurs d\'ouverture', quantite: 4, unite: 'u', prixUnitaire: 55, prixAchat: 28 },
        { description: 'Sirène intérieure + extérieure', quantite: 1, unite: 'lot', prixUnitaire: 180, prixAchat: 95 },
        { description: 'Câblage / configuration', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Mise en service et formation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'videosurveillance',
      nom: 'Installation vidéosurveillance',
      description: '~5 lignes | ~800 – 2 500 € HT | ~45% marge',
      prixMin: 800,
      prixMax: 2500,
      margeCible: 45,
      lignes: [
        { description: 'F&P caméras extérieures', quantite: 4, unite: 'u', prixUnitaire: 180, prixAchat: 100 },
        { description: 'F&P enregistreur (NVR)', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 220 },
        { description: 'Câblage réseau', quantite: 40, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Pose et orientation caméras', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Configuration et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'spots-encastres',
      nom: 'Installation spots encastrés',
      description: '~4 lignes | ~300 – 800 € HT | ~60% marge',
      prixMin: 300,
      prixMax: 800,
      margeCible: 60,
      lignes: [
        { description: 'Perçage faux plafond', quantite: 8, unite: 'u', prixUnitaire: 15, prixAchat: 5 },
        { description: 'F&P spots LED encastrés', quantite: 8, unite: 'u', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Câblage et raccordement', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'eclairage-exterieur',
      nom: 'Installation éclairage extérieur',
      description: '~5 lignes | ~500 – 1 500 € HT | ~50% marge',
      prixMin: 500,
      prixMax: 1500,
      margeCible: 50,
      lignes: [
        { description: 'Tranchée + gaine TPC', quantite: 20, unite: 'ml', prixUnitaire: 25, prixAchat: 10 },
        { description: 'F&P luminaires (bornes, appliques, projecteurs)', quantite: 4, unite: 'u', prixUnitaire: 120, prixAchat: 60 },
        { description: 'Détecteur crépusculaire / mouvement', quantite: 2, unite: 'u', prixUnitaire: 65, prixAchat: 30 },
        { description: 'Raccordement tableau', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'domotique',
      nom: 'Domotique / maison connectée',
      description: '~6 lignes | ~1 500 – 5 000 € HT | ~40% marge',
      prixMin: 1500,
      prixMax: 5000,
      margeCible: 40,
      lignes: [
        { description: 'F&P box domotique', quantite: 1, unite: 'u', prixUnitaire: 450, prixAchat: 280 },
        { description: 'Interrupteurs connectés', quantite: 8, unite: 'u', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Prises connectées', quantite: 4, unite: 'u', prixUnitaire: 65, prixAchat: 35 },
        { description: 'Modules volets roulants', quantite: 4, unite: 'u', prixUnitaire: 95, prixAchat: 50 },
        { description: 'Thermostat connecté', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 160 },
        { description: 'Configuration et formation', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
      ]
    },
    {
      id: 'cablage-reseau',
      nom: 'Câblage réseau (maison / bureau)',
      description: '~5 lignes | ~500 – 2 000 € HT | ~55% marge',
      prixMin: 500,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'F&P baie de brassage / coffret', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 150 },
        { description: 'Tirage câble Cat6', quantite: 60, unite: 'ml', prixUnitaire: 8, prixAchat: 3 },
        { description: 'F&P prises RJ45', quantite: 8, unite: 'u', prixUnitaire: 65, prixAchat: 28 },
        { description: 'Raccordement et test', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'panneaux-solaires',
      nom: 'Installation panneaux solaires photovoltaïques',
      description: '~7 lignes | ~8 000 – 18 000 € HT | ~30% marge',
      prixMin: 8000,
      prixMax: 18000,
      margeCible: 30,
      lignes: [
        { description: 'F&P panneaux photovoltaïques', quantite: 10, unite: 'u', prixUnitaire: 450, prixAchat: 320 },
        { description: 'F&P micro-onduleurs / onduleur', quantite: 1, unite: 'lot', prixUnitaire: 1800, prixAchat: 1300 },
        { description: 'Structure de fixation toiture', quantite: 1, unite: 'lot', prixUnitaire: 850, prixAchat: 550 },
        { description: 'Câblage DC + AC', quantite: 30, unite: 'ml', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Raccordement tableau + compteur', quantite: 1, unite: 'forfait', prixUnitaire: 480, prixAchat: 200 },
        { description: 'CONSUEL + Enedis', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 200 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'securite-diagnostic',
      nom: 'Mise en sécurité électrique (diagnostic)',
      description: '~4 lignes | ~300 – 600 € HT | ~60% marge',
      prixMin: 300,
      prixMax: 600,
      margeCible: 60,
      lignes: [
        { description: 'Diagnostic installation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Remplacement éléments dangereux', quantite: 5, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Mise en sécurité minimum', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Rapport et recommandations', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'deplacement-compteur',
      nom: 'Déplacement / ajout de compteur',
      description: '~3 lignes | ~400 – 1 000 € HT | ~45% marge',
      prixMin: 400,
      prixMax: 1000,
      margeCible: 45,
      lignes: [
        { description: 'Tirage câble', quantite: 15, unite: 'ml', prixUnitaire: 25, prixAchat: 10 },
        { description: 'Pose nouveau coffret', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 150 },
        { description: 'Raccordement et essais', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'detecteurs-fumee',
      nom: 'Installation détecteurs de fumée (immeuble / copro)',
      description: '~3 lignes | ~200 – 600 € HT | ~65% marge',
      prixMin: 200,
      prixMax: 600,
      margeCible: 65,
      lignes: [
        { description: 'F&P DAAF', quantite: 6, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Pose', quantite: 6, unite: 'u', prixUnitaire: 25, prixAchat: 8 },
        { description: 'Essais et attestation', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'renovation-piece',
      nom: 'Rénovation électrique pièce (cuisine / SDB)',
      description: '~6 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Prises spécialisées', quantite: 3, unite: 'u', prixUnitaire: 95, prixAchat: 40 },
        { description: 'Points lumineux', quantite: 3, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
        { description: 'Interrupteurs', quantite: 2, unite: 'u', prixUnitaire: 55, prixAchat: 22 },
        { description: 'Protection tableau', quantite: 3, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Liaison équipotentielle (SDB)', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
  ]
};
