/**
 * Modèles Devis - PEINTURE (18 modèles)
 */

export const PEINTURE_MODELES = {
  nom: 'Peinture',
  icon: '🎨',
  color: '#ec4899',
  modeles: [
    {
      id: 'appart-t1',
      nom: 'Peinture appartement complet (T1)',
      description: '~6 lignes | ~1 500 – 3 000 € HT | ~65% marge',
      prixMin: 1500,
      prixMax: 3000,
      margeCible: 65,
      lignes: [
        { description: 'Préparation murs', quantite: 80, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Sous-couche', quantite: 110, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Peinture murs 2 couches', quantite: 80, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Peinture plafonds 2 couches', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 7 },
        { description: 'Peinture boiseries', quantite: 10, unite: 'm²', prixUnitaire: 28, prixAchat: 9 },
        { description: 'Protection + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'appart-t2t3',
      nom: 'Peinture appartement complet (T2/T3)',
      description: '~6 lignes | ~2 500 – 5 000 € HT | ~60% marge',
      prixMin: 2500,
      prixMax: 5000,
      margeCible: 60,
      lignes: [
        { description: 'Préparation murs', quantite: 140, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Sous-couche', quantite: 190, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Peinture murs 2 couches', quantite: 140, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Peinture plafonds 2 couches', quantite: 50, unite: 'm²', prixUnitaire: 22, prixAchat: 7 },
        { description: 'Peinture boiseries / portes', quantite: 18, unite: 'm²', prixUnitaire: 28, prixAchat: 9 },
        { description: 'Protection + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'maison-t4t5',
      nom: 'Peinture maison complète (T4/T5)',
      description: '~7 lignes | ~5 000 – 10 000 € HT | ~55% marge',
      prixMin: 5000,
      prixMax: 10000,
      margeCible: 55,
      lignes: [
        { description: 'Préparation complète', quantite: 220, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Sous-couche', quantite: 320, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Peinture murs', quantite: 220, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Peinture plafonds', quantite: 100, unite: 'm²', prixUnitaire: 22, prixAchat: 7 },
        { description: 'Peinture boiseries / portes', quantite: 30, unite: 'm²', prixUnitaire: 28, prixAchat: 9 },
        { description: 'Peinture escalier / cage d\'escalier', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 220 },
        { description: 'Protection + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
      ]
    },
    {
      id: 'piece-unique',
      nom: 'Peinture pièce unique',
      description: '~5 lignes | ~400 – 1 000 € HT | ~65% marge',
      prixMin: 400,
      prixMax: 1000,
      margeCible: 65,
      lignes: [
        { description: 'Préparation', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 35 },
        { description: 'Sous-couche', quantite: 50, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Peinture murs 2 couches', quantite: 35, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Peinture plafond 2 couches', quantite: 15, unite: 'm²', prixUnitaire: 22, prixAchat: 7 },
        { description: 'Protection + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'cage-escalier',
      nom: 'Peinture cage d\'escalier / parties communes',
      description: '~6 lignes | ~2 000 – 6 000 € HT | ~55% marge',
      prixMin: 2000,
      prixMax: 6000,
      margeCible: 55,
      lignes: [
        { description: 'Échafaudage / nacelle', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 300 },
        { description: 'Préparation', quantite: 100, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Sous-couche', quantite: 130, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Peinture murs', quantite: 100, unite: 'm²', prixUnitaire: 20, prixAchat: 7 },
        { description: 'Peinture plafonds', quantite: 30, unite: 'm²', prixUnitaire: 24, prixAchat: 8 },
        { description: 'Protection + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'ravalement-peinture',
      nom: 'Ravalement façade (peinture)',
      description: '~5 lignes | ~3 000 – 8 000 € HT | ~50% marge',
      prixMin: 3000,
      prixMax: 8000,
      margeCible: 50,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 400 },
        { description: 'Nettoyage HP', quantite: 80, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Fixateur / impression', quantite: 80, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Peinture façade 2 couches', quantite: 80, unite: 'm²', prixUnitaire: 28, prixAchat: 11 },
        { description: 'Repli', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'ravalement-enduit-deco',
      nom: 'Ravalement façade (enduit décoratif)',
      description: '~5 lignes | ~4 000 – 10 000 € HT | ~45% marge',
      prixMin: 4000,
      prixMax: 10000,
      margeCible: 45,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 950, prixAchat: 450 },
        { description: 'Préparation support', quantite: 80, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Sous-enduit', quantite: 80, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Enduit décoratif de finition', quantite: 80, unite: 'm²', prixUnitaire: 32, prixAchat: 15 },
        { description: 'Repli', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'volets-ext',
      nom: 'Peinture extérieure (volets, portails, grilles)',
      description: '~5 lignes | ~500 – 2 000 € HT | ~60% marge',
      prixMin: 500,
      prixMax: 2000,
      margeCible: 60,
      lignes: [
        { description: 'Dépose volets (si nécessaire)', quantite: 4, unite: 'u', prixUnitaire: 35, prixAchat: 12 },
        { description: 'Décapage / ponçage', quantite: 12, unite: 'm²', prixUnitaire: 22, prixAchat: 8 },
        { description: 'Sous-couche', quantite: 12, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Laque / peinture 2 couches', quantite: 12, unite: 'm²', prixUnitaire: 35, prixAchat: 12 },
        { description: 'Repose', quantite: 4, unite: 'u', prixUnitaire: 30, prixAchat: 10 },
      ]
    },
    {
      id: 'papier-peint-piece',
      nom: 'Pose papier peint (pièce)',
      description: '~4 lignes | ~600 – 1 500 € HT | ~60% marge',
      prixMin: 600,
      prixMax: 1500,
      margeCible: 60,
      lignes: [
        { description: 'Dépose ancien revêtement', quantite: 30, unite: 'm²', prixUnitaire: 8, prixAchat: 2 },
        { description: 'Préparation murs', quantite: 30, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'F&P papier peint intissé', quantite: 30, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'papier-peint-appart',
      nom: 'Pose papier peint (appartement complet)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~55% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 55,
      lignes: [
        { description: 'Dépose ancien revêtement', quantite: 100, unite: 'm²', prixUnitaire: 8, prixAchat: 2 },
        { description: 'Préparation murs', quantite: 100, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'F&P papier peint', quantite: 100, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Frises et raccords', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'enduit-deco',
      nom: 'Enduit décoratif (stucco / tadelakt / chaux)',
      description: '~4 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Sous-couche spéciale', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Application enduit décoratif (2-3 passes)', quantite: 25, unite: 'm²', prixUnitaire: 65, prixAchat: 30 },
        { description: 'Finition (cire / ferrage)', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
      ]
    },
    {
      id: 'beton-cire',
      nom: 'Béton ciré (sol ou mur)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'Préparation support', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Primaire d\'accrochage', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Application béton ciré (2 couches)', quantite: 25, unite: 'm²', prixUnitaire: 75, prixAchat: 38 },
        { description: 'Ponçage', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Finition (vernis / cire)', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
      ]
    },
    {
      id: 'peinture-sol',
      nom: 'Peinture sol (garage / cave / atelier)',
      description: '~4 lignes | ~500 – 1 500 € HT | ~60% marge',
      prixMin: 500,
      prixMax: 1500,
      margeCible: 60,
      lignes: [
        { description: 'Préparation (nettoyage, dégraissage)', quantite: 30, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Primaire époxy', quantite: 30, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Peinture sol 2 couches', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 9 },
        { description: 'Protection chantier', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'traitement-humidite',
      nom: 'Traitement anti-humidité murs',
      description: '~4 lignes | ~500 – 2 000 € HT | ~55% marge',
      prixMin: 500,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Traitement anti-humidité', quantite: 20, unite: 'm²', prixUnitaire: 25, prixAchat: 10 },
        { description: 'Enduit de rénovation', quantite: 20, unite: 'm²', prixUnitaire: 22, prixAchat: 9 },
        { description: 'Peinture de finition', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
      ]
    },
    {
      id: 'local-commercial',
      nom: 'Peinture local commercial / bureau',
      description: '~5 lignes | ~1 500 – 5 000 € HT | ~55% marge',
      prixMin: 1500,
      prixMax: 5000,
      margeCible: 55,
      lignes: [
        { description: 'Protection mobilier et sols', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 80 },
        { description: 'Préparation', quantite: 100, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Peinture murs', quantite: 100, unite: 'm²', prixUnitaire: 20, prixAchat: 7 },
        { description: 'Peinture plafonds', quantite: 50, unite: 'm²', prixUnitaire: 24, prixAchat: 8 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'lasure-bois-ext',
      nom: 'Lasure / vernis boiseries extérieures',
      description: '~4 lignes | ~500 – 2 000 € HT | ~60% marge',
      prixMin: 500,
      prixMax: 2000,
      margeCible: 60,
      lignes: [
        { description: 'Ponçage / décapage', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Traitement insecticide-fongicide', quantite: 20, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Lasure / vernis 2 couches', quantite: 20, unite: 'm²', prixUnitaire: 25, prixAchat: 10 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'sinistre',
      nom: 'Peinture après sinistre (dégât des eaux)',
      description: '~5 lignes | ~800 – 2 500 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2500,
      margeCible: 55,
      lignes: [
        { description: 'Grattage zones endommagées', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Traitement anti-moisissures', quantite: 25, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Rebouchage / enduit', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 5 },
        { description: 'Sous-couche + peinture 2 couches', quantite: 25, unite: 'm²', prixUnitaire: 25, prixAchat: 9 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'marquage-sol',
      nom: 'Marquage / peinture au sol (parking, entrepôt)',
      description: '~4 lignes | ~500 – 2 000 € HT | ~60% marge',
      prixMin: 500,
      prixMax: 2000,
      margeCible: 60,
      lignes: [
        { description: 'Nettoyage sol', quantite: 100, unite: 'm²', prixUnitaire: 3, prixAchat: 1 },
        { description: 'Traçage', quantite: 50, unite: 'ml', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Peinture routière', quantite: 50, unite: 'ml', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Pictogrammes / numérotation', quantite: 10, unite: 'u', prixUnitaire: 25, prixAchat: 9 },
      ]
    },
  ]
};
