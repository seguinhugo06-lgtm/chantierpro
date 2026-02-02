/**
 * Modèles Devis - PLOMBERIE (22 modèles)
 */

export const PLOMBERIE_MODELES = {
  nom: 'Plomberie',
  icon: '🔧',
  color: '#3b82f6',
  modeles: [
    {
      id: 'sdb-complete',
      nom: 'Création salle de bain complète',
      description: '~10 lignes | ~4 000 – 8 000 € HT | ~45% marge',
      prixMin: 4000,
      prixMax: 8000,
      margeCible: 45,
      lignes: [
        { description: 'Alimentation eau chaude/froide', quantite: 10, unite: 'ml', prixUnitaire: 32, prixAchat: 14 },
        { description: 'Évacuations EU/EV', quantite: 8, unite: 'ml', prixUnitaire: 38, prixAchat: 16 },
        { description: 'F&P receveur douche ou baignoire', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
        { description: 'F&P paroi de douche', quantite: 1, unite: 'u', prixUnitaire: 450, prixAchat: 250 },
        { description: 'F&P colonne de douche / robinetterie', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 200 },
        { description: 'F&P meuble vasque', quantite: 1, unite: 'u', prixUnitaire: 750, prixAchat: 400 },
        { description: 'F&P miroir et accessoires', quantite: 1, unite: 'lot', prixUnitaire: 280, prixAchat: 150 },
        { description: 'F&P WC suspendu (bâti-support)', quantite: 1, unite: 'u', prixUnitaire: 950, prixAchat: 550 },
        { description: 'F&P sèche-serviettes', quantite: 1, unite: 'u', prixUnitaire: 350, prixAchat: 180 },
        { description: 'Raccordements et essais', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
      ]
    },
    {
      id: 'sdb-renovation',
      nom: 'Rénovation salle de bain (remplacement sanitaires)',
      description: '~7 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 50,
      lignes: [
        { description: 'Dépose sanitaires existants', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'F&P receveur douche / baignoire', quantite: 1, unite: 'u', prixUnitaire: 550, prixAchat: 300 },
        { description: 'F&P robinetterie', quantite: 2, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
        { description: 'F&P meuble vasque', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
        { description: 'F&P WC', quantite: 1, unite: 'u', prixUnitaire: 450, prixAchat: 250 },
        { description: 'Reprise raccordements', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Essais et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'transfo-baignoire-douche',
      nom: 'Transformation baignoire en douche',
      description: '~8 lignes | ~2 500 – 5 000 € HT | ~50% marge',
      prixMin: 2500,
      prixMax: 5000,
      margeCible: 50,
      lignes: [
        { description: 'Dépose baignoire + tablier', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Reprise évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 220, prixAchat: 80 },
        { description: 'Étanchéité zone douche', quantite: 4, unite: 'm²', prixUnitaire: 45, prixAchat: 20 },
        { description: 'F&P receveur extra-plat ou douche italienne', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
        { description: 'F&P paroi de douche', quantite: 1, unite: 'u', prixUnitaire: 480, prixAchat: 260 },
        { description: 'F&P colonne de douche thermostatique', quantite: 1, unite: 'u', prixUnitaire: 420, prixAchat: 220 },
        { description: 'Carrelage sol et murs douche', quantite: 6, unite: 'm²', prixUnitaire: 65, prixAchat: 30 },
        { description: 'Raccordements et essais', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'douche-italienne',
      nom: 'Création douche italienne',
      description: '~9 lignes | ~3 000 – 6 000 € HT | ~45% marge',
      prixMin: 3000,
      prixMax: 6000,
      margeCible: 45,
      lignes: [
        { description: 'Dépose existant', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Décaissement sol', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Reprise évacuation (pente)', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Étanchéité SPEC complète', quantite: 6, unite: 'm²', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Pose caniveau / bonde de sol', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 150 },
        { description: 'Carrelage sol (antidérapant)', quantite: 4, unite: 'm²', prixUnitaire: 75, prixAchat: 35 },
        { description: 'Carrelage murs', quantite: 8, unite: 'm²', prixUnitaire: 65, prixAchat: 30 },
        { description: 'F&P robinetterie encastrée', quantite: 1, unite: 'u', prixUnitaire: 480, prixAchat: 260 },
        { description: 'Paroi vitrée', quantite: 1, unite: 'u', prixUnitaire: 550, prixAchat: 300 },
      ]
    },
    {
      id: 'wc-suspendu',
      nom: 'Installation WC suspendu',
      description: '~5 lignes | ~600 – 1 200 € HT | ~55% marge',
      prixMin: 600,
      prixMax: 1200,
      margeCible: 55,
      lignes: [
        { description: 'Dépose WC existant', quantite: 1, unite: 'u', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P bâti-support', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 200 },
        { description: 'F&P cuvette suspendue + abattant', quantite: 1, unite: 'u', prixUnitaire: 350, prixAchat: 180 },
        { description: 'Raccordement eau + évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Habillage bâti (placo ou coffrage)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'wc-broyeur',
      nom: 'Installation WC broyeur',
      description: '~4 lignes | ~500 – 900 € HT | ~55% marge',
      prixMin: 500,
      prixMax: 900,
      margeCible: 55,
      lignes: [
        { description: 'Dépose WC existant', quantite: 1, unite: 'u', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P WC broyeur', quantite: 1, unite: 'u', prixUnitaire: 550, prixAchat: 300 },
        { description: 'Raccordement eau + évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 20 },
      ]
    },
    {
      id: 'chauffe-eau-elec',
      nom: 'Remplacement chauffe-eau électrique',
      description: '~4 lignes | ~500 – 1 500 € HT | ~55% marge',
      prixMin: 500,
      prixMax: 1500,
      margeCible: 55,
      lignes: [
        { description: 'Dépose chauffe-eau existant', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P chauffe-eau électrique', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
        { description: 'Remplacement groupe de sécurité', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
        { description: 'Mise en service et essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'chauffe-eau-thermo',
      nom: 'Installation chauffe-eau thermodynamique',
      description: '~5 lignes | ~2 500 – 4 000 € HT | ~40% marge',
      prixMin: 2500,
      prixMax: 4000,
      margeCible: 40,
      lignes: [
        { description: 'Dépose chauffe-eau existant', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 30 },
        { description: 'F&P chauffe-eau thermodynamique', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1800 },
        { description: 'Raccordement hydraulique et électrique', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        { description: 'Création évacuation condensats', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 45 },
      ]
    },
    {
      id: 'ballon-solaire',
      nom: 'Installation ballon solaire (CESI)',
      description: '~6 lignes | ~4 000 – 7 000 € HT | ~35% marge',
      prixMin: 4000,
      prixMax: 7000,
      margeCible: 35,
      lignes: [
        { description: 'F&P capteurs solaires thermiques', quantite: 2, unite: 'u', prixUnitaire: 1200, prixAchat: 800 },
        { description: 'F&P ballon solaire', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1200 },
        { description: 'Liaison capteurs → ballon (circuit primaire)', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 350 },
        { description: 'Raccordement hydraulique', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 150 },
        { description: 'Raccordement électrique (appoint)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 70 },
        { description: 'Mise en service et essais', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
      ]
    },
    {
      id: 'point-eau',
      nom: 'Création point d\'eau (cuisine / buanderie)',
      description: '~5 lignes | ~400 – 800 € HT | ~55% marge',
      prixMin: 400,
      prixMax: 800,
      margeCible: 55,
      lignes: [
        { description: 'Alimentation eau froide', quantite: 5, unite: 'ml', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Alimentation eau chaude', quantite: 5, unite: 'ml', prixUnitaire: 32, prixAchat: 14 },
        { description: 'Évacuation PVC', quantite: 4, unite: 'ml', prixUnitaire: 30, prixAchat: 12 },
        { description: 'F&P robinetterie', quantite: 1, unite: 'u', prixUnitaire: 150, prixAchat: 70 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 20 },
      ]
    },
    {
      id: 'evier-cuisine',
      nom: 'Installation évier de cuisine',
      description: '~5 lignes | ~400 – 900 € HT | ~55% marge',
      prixMin: 400,
      prixMax: 900,
      margeCible: 55,
      lignes: [
        { description: 'Dépose évier existant', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 20 },
        { description: 'F&P évier (inox / granit / céramique)', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 200 },
        { description: 'F&P mitigeur cuisine', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 90 },
        { description: 'Raccordement eau + évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'raccord-electromenager',
      nom: 'Raccordement électroménager',
      description: '~4 lignes | ~150 – 400 € HT | ~60% marge',
      prixMin: 150,
      prixMax: 400,
      margeCible: 60,
      lignes: [
        { description: 'Raccordement machine à laver', quantite: 1, unite: 'u', prixUnitaire: 90, prixAchat: 35 },
        { description: 'Raccordement lave-vaisselle', quantite: 1, unite: 'u', prixUnitaire: 90, prixAchat: 35 },
        { description: 'Raccordement sèche-linge (évacuation)', quantite: 1, unite: 'u', prixUnitaire: 80, prixAchat: 30 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'reparation-fuite',
      nom: 'Réparation fuite d\'eau',
      description: '~3 lignes | ~150 – 500 € HT | ~65% marge',
      prixMin: 150,
      prixMax: 500,
      margeCible: 65,
      lignes: [
        { description: 'Déplacement et diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'Recherche et réparation fuite', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 50 },
        { description: 'Fournitures (raccords, joints)', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 25 },
      ]
    },
    {
      id: 'recherche-fuite',
      nom: 'Recherche de fuite (avec rapport)',
      description: '~4 lignes | ~250 – 600 € HT | ~60% marge',
      prixMin: 250,
      prixMax: 600,
      margeCible: 60,
      lignes: [
        { description: 'Déplacement', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'Recherche de fuite (gaz traceur / caméra thermique)', quantite: 1, unite: 'forfait', prixUnitaire: 220, prixAchat: 80 },
        { description: 'Passage caméra inspection', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Rapport d\'intervention', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'debouchage',
      nom: 'Débouchage canalisation',
      description: '~3 lignes | ~100 – 350 € HT | ~70% marge',
      prixMin: 100,
      prixMax: 350,
      margeCible: 70,
      lignes: [
        { description: 'Déplacement', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 20 },
        { description: 'Débouchage mécanique / haute pression', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 40 },
        { description: 'Nettoyage et essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'reseau-evacuation',
      nom: 'Pose réseau d\'évacuation',
      description: '~5 lignes | ~1 000 – 3 000 € HT | ~50% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'Démolition / ouverture', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Pose canalisation PVC', quantite: 20, unite: 'ml', prixUnitaire: 42, prixAchat: 18 },
        { description: 'Création regard(s)', quantite: 2, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
        { description: 'Raccordement collecteur', quantite: 1, unite: 'forfait', prixUnitaire: 220, prixAchat: 80 },
        { description: 'Essais d\'étanchéité', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'adoucisseur',
      nom: 'Installation adoucisseur d\'eau',
      description: '~4 lignes | ~800 – 2 000 € HT | ~45% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 45,
      lignes: [
        { description: 'F&P adoucisseur d\'eau', quantite: 1, unite: 'u', prixUnitaire: 1200, prixAchat: 750 },
        { description: 'Raccordement bypass', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 70 },
        { description: 'Raccordement évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 45 },
        { description: 'Mise en service et réglages', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'recuperateur-eau-pluie',
      nom: 'Installation récupérateur d\'eau de pluie',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~40% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 40,
      lignes: [
        { description: 'Terrassement', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 200 },
        { description: 'F&P cuve enterrée / hors-sol', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1200 },
        { description: 'Raccordement gouttières', quantite: 2, unite: 'u', prixUnitaire: 120, prixAchat: 50 },
        { description: 'Pompe et réseau de distribution', quantite: 1, unite: 'forfait', prixUnitaire: 550, prixAchat: 300 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'plomberie-maison-complete',
      nom: 'Installation plomberie maison complète (~120 m²)',
      description: '~12 lignes | ~8 000 – 17 000 € HT | ~40% marge',
      prixMin: 8000,
      prixMax: 17000,
      margeCible: 40,
      lignes: [
        { description: 'Réseau alimentation eau (PER/cuivre)', quantite: 60, unite: 'ml', prixUnitaire: 32, prixAchat: 14 },
        { description: 'Réseau évacuation EU/EV', quantite: 40, unite: 'ml', prixUnitaire: 38, prixAchat: 16 },
        { description: 'Nourrice / collecteur', quantite: 2, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
        { description: 'F&P chauffe-eau', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1800 },
        { description: 'Équipement SDB 1 (douche + vasque + WC)', quantite: 1, unite: 'lot', prixUnitaire: 2200, prixAchat: 1200 },
        { description: 'Équipement SDB 2 / WC séparé', quantite: 1, unite: 'lot', prixUnitaire: 1200, prixAchat: 650 },
        { description: 'Équipement cuisine (évier + robinetterie)', quantite: 1, unite: 'lot', prixUnitaire: 450, prixAchat: 220 },
        { description: 'Raccordement machines (LL, LV)', quantite: 2, unite: 'u', prixUnitaire: 120, prixAchat: 45 },
        { description: 'Vannes d\'arrêt', quantite: 8, unite: 'u', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Réducteur de pression', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 55 },
        { description: 'Essais pression', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 65 },
      ]
    },
    {
      id: 'colonne-eau-immeuble',
      nom: 'Remplacement colonne d\'eau (immeuble)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'Dépose colonne existante', quantite: 15, unite: 'ml', prixUnitaire: 45, prixAchat: 18 },
        { description: 'F&P colonne cuivre / PER', quantite: 15, unite: 'ml', prixUnitaire: 65, prixAchat: 30 },
        { description: 'Raccordement par appartement', quantite: 4, unite: 'u', prixUnitaire: 180, prixAchat: 70 },
        { description: 'Remise en eau et essais', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        { description: 'Reprise finitions (rebouchage)', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
      ]
    },
    {
      id: 'remplacement-robinetterie',
      nom: 'Remplacement robinetterie complète',
      description: '~4 lignes | ~300 – 800 € HT | ~55% marge',
      prixMin: 300,
      prixMax: 800,
      margeCible: 55,
      lignes: [
        { description: 'Dépose robinetterie existante', quantite: 4, unite: 'u', prixUnitaire: 35, prixAchat: 12 },
        { description: 'F&P mitigeurs / mélangeurs', quantite: 4, unite: 'u', prixUnitaire: 150, prixAchat: 70 },
        { description: 'Raccordement et joints', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'reseau-per-renovation',
      nom: 'Installation réseau PER (rénovation)',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 50,
      lignes: [
        { description: 'Dépose ancien réseau (si nécessaire)', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Pose nourrice(s)', quantite: 2, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
        { description: 'Distribution PER gainé', quantite: 40, unite: 'ml', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Raccordements', quantite: 10, unite: 'u', prixUnitaire: 35, prixAchat: 14 },
        { description: 'Essais pression et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
  ]
};
