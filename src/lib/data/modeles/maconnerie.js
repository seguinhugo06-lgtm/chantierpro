/**
 * Modèles Devis - MAÇONNERIE (20 modèles)
 */

export const MACONNERIE_MODELES = {
  nom: 'Maçonnerie',
  icon: '🧱',
  color: '#a16207',
  modeles: [
    {
      id: 'ouverture-mur-porteur',
      nom: 'Ouverture mur porteur',
      description: '~6 lignes | ~2 000 – 5 000 € HT | ~50% marge',
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
      id: 'fermeture-ouverture',
      nom: 'Fermeture ouverture existante',
      description: '~4 lignes | ~500 – 1 500 € HT | ~55% marge',
      prixMin: 500,
      prixMax: 1500,
      margeCible: 55,
      lignes: [
        { description: 'Montage parpaing / brique', quantite: 3, unite: 'm²', prixUnitaire: 85, prixAchat: 38 },
        { description: 'Linteau (si nécessaire)', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 50 },
        { description: 'Enduit / finition', quantite: 6, unite: 'm²', prixUnitaire: 35, prixAchat: 14 },
        { description: 'Évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 30 },
      ]
    },
    {
      id: 'cloison-placo',
      nom: 'Construction cloison placo',
      description: '~4 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Ossature métallique', quantite: 15, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Plaques BA13 double face', quantite: 30, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Isolation intérieure', quantite: 15, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Bandes, enduit, finition', quantite: 30, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
      ]
    },
    {
      id: 'cloison-maconnee',
      nom: 'Construction cloison maçonnée',
      description: '~4 lignes | ~1 000 – 2 500 € HT | ~50% marge',
      prixMin: 1000,
      prixMax: 2500,
      margeCible: 50,
      lignes: [
        { description: 'Montage mur (parpaing / brique / béton cellulaire)', quantite: 12, unite: 'm²', prixUnitaire: 65, prixAchat: 30 },
        { description: 'Enduit 2 faces', quantite: 24, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Linteau porte (si nécessaire)', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 50 },
        { description: 'Évacuation gravats', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 60 },
      ]
    },
    {
      id: 'faux-plafond-placo',
      nom: 'Faux plafond placo',
      description: '~4 lignes | ~1 000 – 2 500 € HT | ~55% marge',
      prixMin: 1000,
      prixMax: 2500,
      margeCible: 55,
      lignes: [
        { description: 'Ossature suspendue', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Plaques BA13', quantite: 20, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Isolation phonique / thermique', quantite: 20, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Bandes, enduit, finition', quantite: 20, unite: 'm²', prixUnitaire: 14, prixAchat: 5 },
      ]
    },
    {
      id: 'faux-plafond-dalles',
      nom: 'Faux plafond dalles (bureau / commerce)',
      description: '~3 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Ossature T24', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Dalles minérales 60x60', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Intégration luminaires', quantite: 6, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
      ]
    },
    {
      id: 'dalle-beton',
      nom: 'Coulage dalle béton',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 45,
      lignes: [
        { description: 'Préparation sol', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Film PE + treillis soudé', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Coulage béton', quantite: 30, unite: 'm²', prixUnitaire: 65, prixAchat: 35 },
        { description: 'Règle vibrante et finition', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 90 },
        { description: 'Cure béton', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'chape',
      nom: 'Coulage chape',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~50% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Pose bandes périphériques', quantite: 30, unite: 'ml', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Chape traditionnelle / liquide', quantite: 30, unite: 'm²', prixUnitaire: 38, prixAchat: 18 },
        { description: 'Finition et séchage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'ragreage',
      nom: 'Ragréage sol',
      description: '~3 lignes | ~500 – 1 500 € HT | ~60% marge',
      prixMin: 500,
      prixMax: 1500,
      margeCible: 60,
      lignes: [
        { description: 'Nettoyage / ponçage support', quantite: 25, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Primaire d\'accrochage', quantite: 25, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Ragréage autolissant', quantite: 25, unite: 'm²', prixUnitaire: 22, prixAchat: 9 },
      ]
    },
    {
      id: 'enduit-facade-mono',
      nom: 'Enduit façade (monocouche)',
      description: '~4 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 60, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Projection enduit monocouche', quantite: 60, unite: 'm²', prixUnitaire: 38, prixAchat: 18 },
        { description: 'Points singuliers', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 550, prixAchat: 250 },
      ]
    },
    {
      id: 'enduit-facade-3couches',
      nom: 'Enduit façade traditionnel (3 couches)',
      description: '~5 lignes | ~3 000 – 7 000 € HT | ~45% marge',
      prixMin: 3000,
      prixMax: 7000,
      margeCible: 45,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 300 },
        { description: 'Gobetis', quantite: 60, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Corps d\'enduit', quantite: 60, unite: 'm²', prixUnitaire: 25, prixAchat: 11 },
        { description: 'Enduit de finition', quantite: 60, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Points singuliers', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 180 },
      ]
    },
    {
      id: 'ravalement-facade',
      nom: 'Ravalement façade',
      description: '~5 lignes | ~3 000 – 8 000 € HT | ~45% marge',
      prixMin: 3000,
      prixMax: 8000,
      margeCible: 45,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 400 },
        { description: 'Nettoyage HP / sablage', quantite: 80, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Rebouchage fissures', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 130 },
        { description: 'Enduit / peinture', quantite: 80, unite: 'm²', prixUnitaire: 32, prixAchat: 14 },
        { description: 'Repli chantier', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'rejointoiement-pierres',
      nom: 'Rejointoiement pierres',
      description: '~4 lignes | ~2 000 – 5 000 € HT | ~55% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 55,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 200 },
        { description: 'Dégarnissage joints', quantite: 40, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Rejointoiement (chaux)', quantite: 40, unite: 'm²', prixUnitaire: 42, prixAchat: 18 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'mur-soutenement',
      nom: 'Construction mur de soutènement',
      description: '~5 lignes | ~2 000 – 8 000 € HT | ~40% marge',
      prixMin: 2000,
      prixMax: 8000,
      margeCible: 40,
      lignes: [
        { description: 'Terrassement', quantite: 8, unite: 'm³', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Fondation béton armé', quantite: 8, unite: 'ml', prixUnitaire: 120, prixAchat: 55 },
        { description: 'Élévation mur', quantite: 12, unite: 'm²', prixUnitaire: 95, prixAchat: 45 },
        { description: 'Drainage arrière', quantite: 8, unite: 'ml', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Remblai', quantite: 6, unite: 'm³', prixUnitaire: 35, prixAchat: 15 },
      ]
    },
    {
      id: 'extension-maison',
      nom: 'Extension maison (gros œuvre ~20 m²)',
      description: '~9 lignes | ~15 000 – 35 000 € HT | ~35% marge',
      prixMin: 15000,
      prixMax: 35000,
      margeCible: 35,
      lignes: [
        { description: 'Terrassement et fondations', quantite: 1, unite: 'forfait', prixUnitaire: 3500, prixAchat: 2000 },
        { description: 'Soubassement', quantite: 18, unite: 'ml', prixUnitaire: 85, prixAchat: 40 },
        { description: 'Élévation murs', quantite: 45, unite: 'm²', prixUnitaire: 75, prixAchat: 35 },
        { description: 'Chaînages et linteaux', quantite: 25, unite: 'ml', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Dalle haute / plancher', quantite: 20, unite: 'm²', prixUnitaire: 120, prixAchat: 60 },
        { description: 'Charpente / toiture', quantite: 25, unite: 'm²', prixUnitaire: 150, prixAchat: 80 },
        { description: 'Ouverture sur existant', quantite: 1, unite: 'forfait', prixUnitaire: 1800, prixAchat: 900 },
        { description: 'Enduit extérieur', quantite: 45, unite: 'm²', prixUnitaire: 42, prixAchat: 20 },
        { description: 'Évacuation + nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 180 },
      ]
    },
    {
      id: 'garage-abri',
      nom: 'Construction garage / abri',
      description: '~7 lignes | ~8 000 – 20 000 € HT | ~40% marge',
      prixMin: 8000,
      prixMax: 20000,
      margeCible: 40,
      lignes: [
        { description: 'Terrassement et fondations', quantite: 1, unite: 'forfait', prixUnitaire: 2200, prixAchat: 1200 },
        { description: 'Dalle béton', quantite: 20, unite: 'm²', prixUnitaire: 75, prixAchat: 38 },
        { description: 'Élévation murs', quantite: 40, unite: 'm²', prixUnitaire: 72, prixAchat: 34 },
        { description: 'Charpente + couverture', quantite: 25, unite: 'm²', prixUnitaire: 125, prixAchat: 65 },
        { description: 'Enduit extérieur', quantite: 40, unite: 'm²', prixUnitaire: 38, prixAchat: 18 },
        { description: 'Porte de garage', quantite: 1, unite: 'u', prixUnitaire: 1500, prixAchat: 900 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 180 },
      ]
    },
    {
      id: 'muret-cloture',
      nom: 'Construction muret / clôture maçonnée',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 50,
      lignes: [
        { description: 'Fondation béton', quantite: 15, unite: 'ml', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Montage parpaing', quantite: 15, unite: 'm²', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Chaperon / couvertine', quantite: 15, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Enduit 2 faces', quantite: 30, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Piliers (si nécessaire)', quantite: 3, unite: 'u', prixUnitaire: 180, prixAchat: 80 },
      ]
    },
    {
      id: 'demolition-interieure',
      nom: 'Démolition intérieure complète',
      description: '~5 lignes | ~1 500 – 5 000 € HT | ~55% marge',
      prixMin: 1500,
      prixMax: 5000,
      margeCible: 55,
      lignes: [
        { description: 'Démolition cloisons', quantite: 40, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Dépose revêtements', quantite: 60, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Dépose faux plafonds', quantite: 30, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
        { description: 'Dépose sanitaires / équipements', quantite: 5, unite: 'u', prixUnitaire: 65, prixAchat: 22 },
        { description: 'Évacuation gravats (benne)', quantite: 2, unite: 'u', prixUnitaire: 450, prixAchat: 200 },
      ]
    },
    {
      id: 'reparation-fissures',
      nom: 'Réparation fissures structurelles',
      description: '~5 lignes | ~800 – 3 000 € HT | ~50% marge',
      prixMin: 800,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'Diagnostic fissures', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Ouverture et nettoyage fissures', quantite: 10, unite: 'ml', prixUnitaire: 25, prixAchat: 9 },
        { description: 'Injection résine / agrafage', quantite: 10, unite: 'ml', prixUnitaire: 85, prixAchat: 38 },
        { description: 'Rebouchage et finition', quantite: 10, unite: 'ml', prixUnitaire: 35, prixAchat: 14 },
        { description: 'Rapport', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'tremie',
      nom: 'Création trémie (escalier / conduit)',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~50% marge',
      prixMin: 1000,
      prixMax: 3000,
      margeCible: 50,
      lignes: [
        { description: 'Étaiement', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 120 },
        { description: 'Découpe plancher / dalle', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 250 },
        { description: 'Renforcement (chevêtre)', quantite: 1, unite: 'forfait', prixUnitaire: 550, prixAchat: 220 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
  ]
};
