/**
 * Modèles Devis - CHAUFFAGE / CLIMATISATION (18 modèles)
 */

export const CHAUFFAGE_MODELES = {
  nom: 'Chauffage / Climatisation',
  icon: '🔥',
  color: '#ef4444',
  modeles: [
    {
      id: 'pac-mono',
      nom: 'Installation PAC air/air monosplit (1 pièce)',
      description: '~4 lignes | ~1 500 – 3 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'F&P unité intérieure + extérieure', quantite: 1, unite: 'lot', prixUnitaire: 1400, prixAchat: 850 },
        { description: 'Liaison frigorifique', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 130 },
        { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'pac-multi-2-3',
      nom: 'Installation PAC air/air multisplit (2-3 pièces)',
      description: '~6 lignes | ~4 000 – 8 000 € HT | ~40% marge',
      prixMin: 4000,
      prixMax: 8000,
      margeCible: 40,
      lignes: [
        { description: 'F&P unité extérieure', quantite: 1, unite: 'u', prixUnitaire: 2200, prixAchat: 1400 },
        { description: 'F&P unités intérieures', quantite: 3, unite: 'u', prixUnitaire: 750, prixAchat: 450 },
        { description: 'Liaisons frigorifiques', quantite: 3, unite: 'u', prixUnitaire: 350, prixAchat: 140 },
        { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Mise sous vide et charge', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'pac-multi-4-5',
      nom: 'Installation PAC air/air multisplit (4-5 pièces)',
      description: '~6 lignes | ~7 000 – 12 000 € HT | ~35% marge',
      prixMin: 7000,
      prixMax: 12000,
      margeCible: 35,
      lignes: [
        { description: 'F&P unité extérieure', quantite: 1, unite: 'u', prixUnitaire: 3500, prixAchat: 2400 },
        { description: 'F&P unités intérieures', quantite: 5, unite: 'u', prixUnitaire: 750, prixAchat: 450 },
        { description: 'Liaisons frigorifiques', quantite: 5, unite: 'u', prixUnitaire: 380, prixAchat: 150 },
        { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 160 },
        { description: 'Mise sous vide et charge', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 130 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'pac-air-eau',
      nom: 'Installation PAC air/eau',
      description: '~7 lignes | ~8 000 – 16 000 € HT | ~35% marge',
      prixMin: 8000,
      prixMax: 16000,
      margeCible: 35,
      lignes: [
        { description: 'F&P unité extérieure PAC', quantite: 1, unite: 'u', prixUnitaire: 5500, prixAchat: 3800 },
        { description: 'F&P module hydraulique intérieur', quantite: 1, unite: 'u', prixUnitaire: 2200, prixAchat: 1500 },
        { description: 'Raccordement hydraulique', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 350 },
        { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 160 },
        { description: 'Ballon ECS (si inclus)', quantite: 1, unite: 'u', prixUnitaire: 1200, prixAchat: 750 },
        { description: 'Régulation', quantite: 1, unite: 'u', prixUnitaire: 480, prixAchat: 280 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
      ]
    },
    {
      id: 'chaudiere-gaz',
      nom: 'Remplacement chaudière gaz (condensation)',
      description: '~5 lignes | ~3 000 – 5 500 € HT | ~40% marge',
      // Chaudière à énergie fossile : TVA à 20 % depuis le 1er mars 2025, fourniture et pose (loi de finances pour 2025 ;
      // docs/metiers/chauffagiste.md § 5). L'entretien d'une chaudière fossile n'est pas visé par l'exclusion :
      // 10 %, ou 5,5 % pour une chaudière à très haute performance énergétique (BOI-TVA-LIQ-30-20-90-20 § 230 ; BOI-TVA-LIQ-30-20-95 § 35).
      tva: 20,
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
      id: 'poele-bois',
      nom: 'Installation poêle à bois',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~40% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 40,
      lignes: [
        { description: 'F&P poêle à bois', quantite: 1, unite: 'u', prixUnitaire: 2200, prixAchat: 1400 },
        { description: 'Tubage conduit inox', quantite: 6, unite: 'ml', prixUnitaire: 95, prixAchat: 50 },
        { description: 'Sortie toiture', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 140 },
        { description: 'Raccordement et habillage', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'poele-granules',
      nom: 'Installation poêle à granulés',
      description: '~6 lignes | ~3 500 – 7 000 € HT | ~40% marge',
      prixMin: 3500,
      prixMax: 7000,
      margeCible: 40,
      lignes: [
        { description: 'F&P poêle à granulés', quantite: 1, unite: 'u', prixUnitaire: 3500, prixAchat: 2300 },
        { description: 'Tubage conduit inox', quantite: 6, unite: 'ml', prixUnitaire: 95, prixAchat: 50 },
        { description: 'Sortie toiture', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 140 },
        { description: 'Arrivée d\'air comburant', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
        { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'insert',
      nom: 'Installation insert cheminée',
      description: '~6 lignes | ~2 500 – 6 000 € HT | ~40% marge',
      prixMin: 2500,
      prixMax: 6000,
      margeCible: 40,
      lignes: [
        { description: 'Dépose ancien insert / foyer', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'F&P insert', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1850 },
        { description: 'Tubage conduit', quantite: 8, unite: 'ml', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Habillage cheminée', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 180 },
        { description: 'Ventilation (grilles, récupérateur)', quantite: 1, unite: 'lot', prixUnitaire: 280, prixAchat: 120 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'plancher-chauffant-eau',
      nom: 'Pose plancher chauffant eau',
      description: '~5 lignes | ~2 500 – 5 000 € HT | ~45% marge',
      prixMin: 2500,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'Isolation sol', quantite: 40, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Pose tubes PER', quantite: 40, unite: 'm²', prixUnitaire: 35, prixAchat: 16 },
        { description: 'Collecteur / nourrice', quantite: 1, unite: 'u', prixUnitaire: 380, prixAchat: 200 },
        { description: 'Chape anhydrite', quantite: 40, unite: 'm²', prixUnitaire: 28, prixAchat: 13 },
        { description: 'Essais et mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'plancher-chauffant-elec',
      nom: 'Pose plancher chauffant électrique',
      description: '~4 lignes | ~1 500 – 3 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'Isolation sol', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Pose trame chauffante', quantite: 25, unite: 'm²', prixUnitaire: 55, prixAchat: 28 },
        { description: 'Thermostat', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 95 },
        { description: 'Raccordement et essais', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'radiateurs-elec',
      nom: 'Remplacement radiateurs électriques',
      description: '~3 lignes | ~800 – 2 500 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2500,
      margeCible: 55,
      lignes: [
        { description: 'Dépose anciens radiateurs', quantite: 5, unite: 'u', prixUnitaire: 35, prixAchat: 12 },
        { description: 'F&P radiateurs (inertie)', quantite: 5, unite: 'u', prixUnitaire: 380, prixAchat: 210 },
        { description: 'Raccordement et essais', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'radiateurs-eau',
      nom: 'Remplacement radiateurs eau chaude',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~50% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'Dépose anciens radiateurs', quantite: 5, unite: 'u', prixUnitaire: 45, prixAchat: 15 },
        { description: 'F&P radiateurs neufs', quantite: 5, unite: 'u', prixUnitaire: 320, prixAchat: 175 },
        { description: 'Raccordement (robinet thermo + coude)', quantite: 5, unite: 'u', prixUnitaire: 65, prixAchat: 28 },
        { description: 'Remplissage circuit et essais', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'desembouage',
      nom: 'Désembouage chauffage central',
      description: '~4 lignes | ~400 – 800 € HT | ~60% marge',
      prixMin: 400,
      prixMax: 800,
      margeCible: 60,
      lignes: [
        { description: 'Rinçage circuit', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Injection produit désembouant', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
        { description: 'Rinçage final', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Ajout inhibiteur de corrosion', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 30 },
      ]
    },
    {
      id: 'entretien-chaudiere',
      nom: 'Entretien annuel chaudière gaz',
      description: '~4 lignes | ~100 – 180 € HT | ~70% marge',
      prixMin: 100,
      prixMax: 180,
      margeCible: 70,
      lignes: [
        { description: 'Vérification et nettoyage brûleur', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
        { description: 'Analyse de combustion', quantite: 1, unite: 'forfait', prixUnitaire: 40, prixAchat: 12 },
        { description: 'Contrôle sécurité', quantite: 1, unite: 'forfait', prixUnitaire: 35, prixAchat: 10 },
        { description: 'Établissement et remise de l’attestation d’entretien (due à chaque entretien)', quantite: 1, unite: 'forfait', prixUnitaire: 25, prixAchat: 8 },
      ]
    },
    {
      id: 'entretien-pac',
      nom: 'Entretien PAC (au moins tous les deux ans)',
      description: '~4 lignes | ~150 – 250 € HT | ~65% marge',
      prixMin: 150,
      prixMax: 250,
      margeCible: 65,
      lignes: [
        { description: 'Vérification fluide frigorigène', quantite: 1, unite: 'forfait', prixUnitaire: 65, prixAchat: 22 },
        { description: 'Nettoyage échangeurs', quantite: 1, unite: 'forfait', prixUnitaire: 55, prixAchat: 18 },
        { description: 'Contrôle performances', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 16 },
        { description: 'Établissement et remise de l’attestation d’entretien (due à chaque entretien)', quantite: 1, unite: 'forfait', prixUnitaire: 30, prixAchat: 10 },
      ]
    },
    {
      id: 'gainable',
      nom: 'Installation climatisation gainable',
      description: '~6 lignes | ~5 000 – 12 000 € HT | ~35% marge',
      prixMin: 5000,
      prixMax: 12000,
      margeCible: 35,
      lignes: [
        { description: 'F&P unité extérieure', quantite: 1, unite: 'u', prixUnitaire: 2800, prixAchat: 1900 },
        { description: 'F&P unité gainable (faux plafond)', quantite: 1, unite: 'u', prixUnitaire: 2500, prixAchat: 1700 },
        { description: 'Réseau gaines', quantite: 25, unite: 'ml', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Bouches de soufflage', quantite: 6, unite: 'u', prixUnitaire: 65, prixAchat: 28 },
        { description: 'Raccordement et condensats', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 140 },
        { description: 'Mise en service', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'thermostat-connecte',
      nom: 'Installation thermostat connecté',
      description: '~3 lignes | ~250 – 500 € HT | ~55% marge',
      prixMin: 250,
      prixMax: 500,
      margeCible: 55,
      lignes: [
        { description: 'F&P thermostat connecté', quantite: 1, unite: 'u', prixUnitaire: 280, prixAchat: 160 },
        { description: 'Installation et câblage', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Configuration (app + WiFi)', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'circulateur-vase',
      nom: 'Remplacement circulateur + vase d\'expansion',
      description: '~3 lignes | ~400 – 800 € HT | ~55% marge',
      prixMin: 400,
      prixMax: 800,
      margeCible: 55,
      lignes: [
        { description: 'Vidange partielle circuit', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P circulateur + vase d\'expansion', quantite: 1, unite: 'lot', prixUnitaire: 380, prixAchat: 210 },
        { description: 'Remplissage et essais', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
  ]
};
