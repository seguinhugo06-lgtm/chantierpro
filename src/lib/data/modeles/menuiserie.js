/**
 * Modèles Devis - MENUISERIE (22 modèles)
 */

export const MENUISERIE_MODELES = {
  nom: 'Menuiserie',
  icon: '🪵',
  color: '#a855f7',
  modeles: [
    {
      id: 'fenetres-pvc',
      nom: 'Remplacement fenêtres maison (4-6 fenêtres PVC)',
      description: '~5 lignes | ~2 500 – 5 000 € HT | ~45% marge',
      prixMin: 2500,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'Dépose fenêtres existantes', quantite: 5, unite: 'u', prixUnitaire: 55, prixAchat: 18 },
        { description: 'F&P fenêtres PVC DV', quantite: 5, unite: 'u', prixUnitaire: 480, prixAchat: 280 },
        { description: 'Pose et calfeutrement', quantite: 5, unite: 'u', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Habillage intérieur (tapées)', quantite: 5, unite: 'u', prixUnitaire: 65, prixAchat: 28 },
        { description: 'Nettoyage et évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'fenetres-alu',
      nom: 'Remplacement fenêtres (alu / mixte)',
      description: '~5 lignes | ~4 000 – 10 000 € HT | ~40% marge',
      prixMin: 4000,
      prixMax: 10000,
      margeCible: 40,
      lignes: [
        { description: 'Dépose fenêtres existantes', quantite: 5, unite: 'u', prixUnitaire: 55, prixAchat: 18 },
        { description: 'F&P fenêtres alu / mixte DV', quantite: 5, unite: 'u', prixUnitaire: 850, prixAchat: 550 },
        { description: 'Pose et calfeutrement', quantite: 5, unite: 'u', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Habillage', quantite: 5, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
        { description: 'Nettoyage et évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'porte-entree',
      nom: 'Pose porte d\'entrée',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~45% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 45,
      lignes: [
        { description: 'Dépose porte existante', quantite: 1, unite: 'u', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P porte d\'entrée', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1100 },
        { description: 'Pose, calage, fixation', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
        { description: 'Habillage et finitions', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'porte-blindee',
      nom: 'Pose porte d\'entrée blindée',
      description: '~5 lignes | ~2 000 – 4 000 € HT | ~40% marge',
      prixMin: 2000,
      prixMax: 4000,
      margeCible: 40,
      lignes: [
        { description: 'Dépose porte existante', quantite: 1, unite: 'u', prixUnitaire: 100, prixAchat: 35 },
        { description: 'F&P porte blindée certifiée', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1900 },
        { description: 'Pose et réglage', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Habillage dormant', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
        { description: 'Jeu de clés et essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'portes-int',
      nom: 'Remplacement portes intérieures (appartement)',
      description: '~4 lignes | ~1 200 – 3 000 € HT | ~55% marge',
      prixMin: 1200,
      prixMax: 3000,
      margeCible: 55,
      lignes: [
        { description: 'Dépose portes existantes', quantite: 5, unite: 'u', prixUnitaire: 35, prixAchat: 12 },
        { description: 'F&P blocs-portes', quantite: 5, unite: 'u', prixUnitaire: 320, prixAchat: 170 },
        { description: 'Pose et ajustage', quantite: 5, unite: 'u', prixUnitaire: 95, prixAchat: 35 },
        { description: 'Finitions (chambranles)', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'porte-coulissante',
      nom: 'Pose porte coulissante',
      description: '~4 lignes | ~500 – 1 200 € HT | ~50% marge',
      prixMin: 500,
      prixMax: 1200,
      margeCible: 50,
      lignes: [
        { description: 'Dépose porte existante', quantite: 1, unite: 'u', prixUnitaire: 60, prixAchat: 20 },
        { description: 'F&P système coulissant (applique ou galandage)', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 380 },
        { description: 'Pose vantail et rail', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'porte-garage',
      nom: 'Pose porte de garage',
      description: '~4 lignes | ~1 000 – 2 500 € HT | ~45% marge',
      prixMin: 1000,
      prixMax: 2500,
      margeCible: 45,
      lignes: [
        { description: 'Dépose porte existante (si applicable)', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 40 },
        { description: 'F&P porte garage (sectionnelle / enroulable)', quantite: 1, unite: 'u', prixUnitaire: 1500, prixAchat: 950 },
        { description: 'Pose et fixation', quantite: 1, unite: 'forfait', prixUnitaire: 320, prixAchat: 110 },
        { description: 'Motorisation et essais', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'volets-roulants',
      nom: 'Pose volets roulants maison',
      description: '~4 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'F&P volets roulants électriques', quantite: 5, unite: 'u', prixUnitaire: 550, prixAchat: 320 },
        { description: 'Pose et fixation', quantite: 5, unite: 'u', prixUnitaire: 95, prixAchat: 35 },
        { description: 'Raccordement électrique', quantite: 5, unite: 'u', prixUnitaire: 75, prixAchat: 28 },
        { description: 'Programmation et essais', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'motorisation-volets',
      nom: 'Motorisation volets existants',
      description: '~3 lignes | ~1 000 – 3 000 € HT | ~50% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'F&P moteurs tubulaires', quantite: 5, unite: 'u', prixUnitaire: 280, prixAchat: 160 },
        { description: 'Raccordement électrique', quantite: 5, unite: 'u', prixUnitaire: 65, prixAchat: 25 },
        { description: 'Programmation (télécommande / horloge)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
      ]
    },
    {
      id: 'store-banne',
      nom: 'Pose store banne',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~45% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 45,
      lignes: [
        { description: 'F&P store banne', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1150 },
        { description: 'Pose et fixation murale', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 95 },
        { description: 'Raccordement électrique (si motorisé)', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 20 },
      ]
    },
    {
      id: 'velux',
      nom: 'Pose fenêtre de toit / velux',
      description: '~5 lignes | ~700 – 1 800 € HT | ~45% marge',
      prixMin: 700,
      prixMax: 1800,
      margeCible: 45,
      lignes: [
        { description: 'Création ouverture toiture', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'F&P fenêtre de toit', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 400 },
        { description: 'Pose chevêtre + étanchéité', quantite: 1, unite: 'forfait', prixUnitaire: 220, prixAchat: 80 },
        { description: 'Raccord couverture (collerette)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 75 },
        { description: 'Habillage intérieur', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
    {
      id: 'parquet-flottant',
      nom: 'Pose parquet flottant (pièce)',
      description: '~4 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Préparation sol', quantite: 25, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Sous-couche acoustique', quantite: 25, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'F&P parquet', quantite: 25, unite: 'm²', prixUnitaire: 48, prixAchat: 25 },
        { description: 'Plinthes et barres de seuil', quantite: 20, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
      ]
    },
    {
      id: 'parquet-massif',
      nom: 'Pose parquet massif',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~45% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 45,
      lignes: [
        { description: 'Préparation sol', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Ragréage (si nécessaire)', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'F&P parquet massif (collé ou cloué)', quantite: 25, unite: 'm²', prixUnitaire: 85, prixAchat: 48 },
        { description: 'Plinthes', quantite: 20, unite: 'ml', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Ponçage et vitrification', quantite: 25, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
      ]
    },
    {
      id: 'poncage-vitrification',
      nom: 'Ponçage et vitrification parquet',
      description: '~4 lignes | ~800 – 2 000 € HT | ~65% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 65,
      lignes: [
        { description: 'Ponçage (3 passes)', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 5 },
        { description: 'Dépoussiérage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'Application fond dur', quantite: 30, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Vitrification 2 couches', quantite: 30, unite: 'm²', prixUnitaire: 15, prixAchat: 5 },
      ]
    },
    {
      id: 'placard-mesure',
      nom: 'Création placard sur mesure',
      description: '~5 lignes | ~800 – 2 500 € HT | ~50% marge',
      prixMin: 800,
      prixMax: 2500,
      margeCible: 50,
      lignes: [
        { description: 'Structure / caisson', quantite: 3, unite: 'ml', prixUnitaire: 220, prixAchat: 110 },
        { description: 'Tablettes et penderie', quantite: 6, unite: 'u', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Portes coulissantes / battantes', quantite: 2, unite: 'u', prixUnitaire: 320, prixAchat: 175 },
        { description: 'Quincaillerie', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 50 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
    {
      id: 'dressing',
      nom: 'Pose dressing sur mesure',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~45% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 45,
      lignes: [
        { description: 'Prise de mesures et conception', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Structure et caissons', quantite: 4, unite: 'ml', prixUnitaire: 280, prixAchat: 150 },
        { description: 'Aménagement intérieur (tiroirs, penderies, étagères)', quantite: 1, unite: 'lot', prixUnitaire: 650, prixAchat: 350 },
        { description: 'Portes', quantite: 3, unite: 'u', prixUnitaire: 380, prixAchat: 210 },
        { description: 'Éclairage intégré', quantite: 2, unite: 'u', prixUnitaire: 85, prixAchat: 40 },
      ]
    },
    {
      id: 'cuisine-meubles',
      nom: 'Pose cuisine (meubles uniquement)',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~45% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 45,
      lignes: [
        { description: 'Montage meubles bas', quantite: 6, unite: 'u', prixUnitaire: 85, prixAchat: 35 },
        { description: 'Montage meubles hauts', quantite: 4, unite: 'u', prixUnitaire: 75, prixAchat: 30 },
        { description: 'Pose plan de travail', quantite: 4, unite: 'ml', prixUnitaire: 120, prixAchat: 55 },
        { description: 'Découpes (évier, plaque)', quantite: 2, unite: 'u', prixUnitaire: 85, prixAchat: 30 },
        { description: 'Finitions (plinthes, cornières, joints)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
      ]
    },
    {
      id: 'habillage-escalier',
      nom: 'Habillage escalier bois',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'Prise de mesures', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'F&P marches et contremarches', quantite: 14, unite: 'u', prixUnitaire: 120, prixAchat: 60 },
        { description: 'Pose nez de marche', quantite: 14, unite: 'u', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Garde-corps / rampe', quantite: 4, unite: 'ml', prixUnitaire: 180, prixAchat: 90 },
        { description: 'Finition (vernis / huile)', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'escalier-bois',
      nom: 'Construction escalier bois',
      description: '~5 lignes | ~3 000 – 8 000 € HT | ~40% marge',
      prixMin: 3000,
      prixMax: 8000,
      margeCible: 40,
      lignes: [
        { description: 'Conception et fabrication', quantite: 1, unite: 'forfait', prixUnitaire: 1500, prixAchat: 900 },
        { description: 'Limons / structure', quantite: 1, unite: 'lot', prixUnitaire: 1200, prixAchat: 700 },
        { description: 'Marches et contremarches', quantite: 14, unite: 'u', prixUnitaire: 95, prixAchat: 50 },
        { description: 'Garde-corps / rampe', quantite: 5, unite: 'ml', prixUnitaire: 220, prixAchat: 120 },
        { description: 'Finition', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 140 },
      ]
    },
    {
      id: 'terrasse-bois',
      nom: 'Pose terrasse bois',
      description: '~5 lignes | ~3 000 – 7 000 € HT | ~45% marge',
      prixMin: 3000,
      prixMax: 7000,
      margeCible: 45,
      lignes: [
        { description: 'Préparation sol', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
        { description: 'Plots / lambourdes', quantite: 25, unite: 'm²', prixUnitaire: 28, prixAchat: 13 },
        { description: 'Lames bois / composite', quantite: 25, unite: 'm²', prixUnitaire: 75, prixAchat: 40 },
        { description: 'Fixation (visserie inox)', quantite: 1, unite: 'lot', prixUnitaire: 180, prixAchat: 80 },
        { description: 'Finitions (cornières, nez de terrasse)', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'lambris',
      nom: 'Pose lambris (mur ou plafond)',
      description: '~4 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Préparation support / tasseaux', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P lambris', quantite: 25, unite: 'm²', prixUnitaire: 35, prixAchat: 16 },
        { description: 'Finitions (angles, plinthes)', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Traitement / lasure (si bois brut)', quantite: 25, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
      ]
    },
    {
      id: 'garde-corps',
      nom: 'Pose garde-corps / rampe (intérieur ou extérieur)',
      description: '~4 lignes | ~800 – 3 000 € HT | ~45% marge',
      prixMin: 800,
      prixMax: 3000,
      margeCible: 45,
      lignes: [
        { description: 'F&P garde-corps (bois / alu / verre / inox)', quantite: 5, unite: 'ml', prixUnitaire: 280, prixAchat: 160 },
        { description: 'Fixation (scellement / platine)', quantite: 6, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Main courante', quantite: 5, unite: 'ml', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
  ]
};
