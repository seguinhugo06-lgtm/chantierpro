/**
 * Modèles Devis - AUTRES MÉTIERS
 * Couverture, Isolation, Terrassement, Serrurerie, Vitrerie, Paysagisme,
 * Étanchéité, Démolition, Charpente, Plâtrerie
 */

// COUVERTURE / TOITURE (14 modèles)
export const COUVERTURE_MODELES = {
  nom: 'Couverture / Toiture',
  icon: '🏠',
  color: '#6366f1',
  modeles: [
    {
      id: 'refection-tuiles',
      nom: 'Réfection couverture complète (tuiles)',
      description: '~7 lignes | ~8 000 – 18 000 € HT | ~40% marge',
      prixMin: 8000, prixMax: 18000, margeCible: 40,
      lignes: [
        { description: 'Échafaudage / nacelle', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 600 },
        { description: 'Dépose couverture', quantite: 80, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Remplacement liteaux', quantite: 80, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Écran sous-toiture HPV', quantite: 80, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'F&P tuiles', quantite: 80, unite: 'm²', prixUnitaire: 58, prixAchat: 30 },
        { description: 'Faîtage, rives, noues', quantite: 1, unite: 'forfait', prixUnitaire: 850, prixAchat: 400 },
        { description: 'Zinguerie', quantite: 1, unite: 'forfait', prixUnitaire: 950, prixAchat: 450 },
      ]
    },
    {
      id: 'refection-ardoise',
      nom: 'Réfection couverture (ardoise)',
      description: '~7 lignes | ~12 000 – 25 000 € HT | ~35% marge',
      prixMin: 12000, prixMax: 25000, margeCible: 35,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 1400, prixAchat: 700 },
        { description: 'Dépose couverture', quantite: 80, unite: 'm²', prixUnitaire: 22, prixAchat: 8 },
        { description: 'Remplacement voliges / liteaux', quantite: 80, unite: 'm²', prixUnitaire: 25, prixAchat: 11 },
        { description: 'Écran sous-toiture', quantite: 80, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'F&P ardoises', quantite: 80, unite: 'm²', prixUnitaire: 95, prixAchat: 55 },
        { description: 'Faîtage et rives', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 600 },
        { description: 'Zinguerie', quantite: 1, unite: 'forfait', prixUnitaire: 1100, prixAchat: 550 },
      ]
    },
    {
      id: 'bac-acier',
      nom: 'Couverture bac acier (garage / annexe)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 50,
      lignes: [
        { description: 'Dépose existant (si applicable)', quantite: 30, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P bac acier', quantite: 30, unite: 'm²', prixUnitaire: 45, prixAchat: 22 },
        { description: 'Faîtage et rives', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 120 },
        { description: 'Gouttières', quantite: 15, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
    {
      id: 'etancheite-toit-plat',
      nom: 'Étanchéité toit plat (EPDM / membrane)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 45,
      lignes: [
        { description: 'Préparation support', quantite: 30, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Pose membrane EPDM / PVC', quantite: 30, unite: 'm²', prixUnitaire: 55, prixAchat: 28 },
        { description: 'Relevés d\'étanchéité', quantite: 15, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Évacuations EP', quantite: 2, unite: 'u', prixUnitaire: 120, prixAchat: 55 },
        { description: 'Essai d\'étanchéité', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'reparation-toiture',
      nom: 'Réparation toiture ponctuelle',
      description: '~4 lignes | ~300 – 800 € HT | ~60% marge',
      prixMin: 300, prixMax: 800, margeCible: 60,
      lignes: [
        { description: 'Déplacement et diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Remplacement tuiles / ardoises', quantite: 15, unite: 'u', prixUnitaire: 18, prixAchat: 7 },
        { description: 'Réfection solin / faîtage', quantite: 1, unite: 'forfait', prixUnitaire: 220, prixAchat: 80 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'demoussage',
      nom: 'Nettoyage et démoussage toiture',
      description: '~4 lignes | ~800 – 2 000 € HT | ~65% marge',
      prixMin: 800, prixMax: 2000, margeCible: 65,
      lignes: [
        { description: 'Nettoyage HP', quantite: 80, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
        { description: 'Traitement anti-mousse', quantite: 80, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Application hydrofuge', quantite: 80, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Nettoyage gouttières', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'gouttieres',
      nom: 'Remplacement gouttières',
      description: '~4 lignes | ~1 000 – 2 500 € HT | ~50% marge',
      prixMin: 1000, prixMax: 2500, margeCible: 50,
      lignes: [
        { description: 'Dépose gouttières existantes', quantite: 25, unite: 'ml', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P gouttières neuves (zinc/alu/PVC)', quantite: 25, unite: 'ml', prixUnitaire: 45, prixAchat: 22 },
        { description: 'Descentes EP', quantite: 10, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Naissances et raccords', quantite: 4, unite: 'u', prixUnitaire: 35, prixAchat: 14 },
      ]
    },
    {
      id: 'velux',
      nom: 'Pose velux / fenêtre de toit',
      description: '~5 lignes | ~700 – 1 800 € HT | ~45% marge',
      prixMin: 700, prixMax: 1800, margeCible: 45,
      lignes: [
        { description: 'Création chevêtre', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'F&P fenêtre de toit', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 400 },
        { description: 'Raccord d\'étanchéité (collerette)', quantite: 1, unite: 'u', prixUnitaire: 150, prixAchat: 70 },
        { description: 'Habillage intérieur', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
        { description: 'Reprise couverture', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
    {
      id: 'traitement-charpente',
      nom: 'Traitement charpente',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~60% marge',
      prixMin: 1000, prixMax: 3000, margeCible: 60,
      lignes: [
        { description: 'Diagnostic (sondage, état)', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Bûchage bois attaqué', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Traitement par injection', quantite: 40, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Traitement par pulvérisation', quantite: 40, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
      ]
    },
    {
      id: 'sortie-toit',
      nom: 'Installation sortie de toit (VMC / poêle)',
      description: '~3 lignes | ~200 – 500 € HT | ~55% marge',
      prixMin: 200, prixMax: 500, margeCible: 55,
      lignes: [
        { description: 'Percement couverture', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Pose sortie de toit + collerette', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 90 },
        { description: 'Étanchéité', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 28 },
      ]
    },
  ]
};

// ISOLATION (14 modèles)
export const ISOLATION_MODELES = {
  nom: 'Isolation',
  icon: '🧊',
  color: '#06b6d4',
  modeles: [
    {
      id: 'combles-perdus-soufflage',
      nom: 'Isolation combles perdus (soufflage R=7)',
      description: '~6 lignes | ~15 – 35 €/m² HT | ~70% marge',
      prixMin: 1200, prixMax: 2800, margeCible: 70,
      lignes: [
        { description: 'Préparation combles (déblaiement)', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Protection spots et VMC', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
        { description: 'Repérage trappe et circulation', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'Laine minérale soufflée ép.30cm R=7', quantite: 80, unite: 'm²', prixUnitaire: 25, prixAchat: 8 },
        { description: 'Piges de repérage', quantite: 80, unite: 'm²', prixUnitaire: 2, prixAchat: 1 },
        { description: 'Attestation fin de travaux', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'combles-perdus-deroulage',
      nom: 'Isolation combles perdus (déroulage)',
      description: '~5 lignes | ~20 – 40 €/m² HT | ~60% marge',
      prixMin: 1600, prixMax: 3200, margeCible: 60,
      lignes: [
        { description: 'Préparation combles', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Pose laine de verre en rouleaux (2 couches croisées)', quantite: 80, unite: 'm²', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Pare-vapeur', quantite: 80, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Protection spots', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
        { description: 'Attestation', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
      ]
    },
    {
      id: 'rampants',
      nom: 'Isolation rampants (combles aménagés)',
      description: '~6 lignes | ~40 – 70 €/m² HT | ~50% marge',
      prixMin: 2400, prixMax: 4200, margeCible: 50,
      lignes: [
        { description: 'Pose isolant entre chevrons', quantite: 60, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Complément isolant sous chevrons', quantite: 60, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Frein-vapeur', quantite: 60, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Pose placo BA13 sur ossature', quantite: 60, unite: 'm²', prixUnitaire: 28, prixAchat: 13 },
        { description: 'Bandes et joints', quantite: 60, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Trappe d\'accès', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 50 },
      ]
    },
    {
      id: 'ite-pse',
      nom: 'ITE polystyrène + enduit',
      description: '~7 lignes | ~80 – 150 €/m² HT | ~45% marge',
      prixMin: 8000, prixMax: 15000, margeCible: 45,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 1500, prixAchat: 750 },
        { description: 'Préparation support', quantite: 100, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Pose panneaux PSE / graphité', quantite: 100, unite: 'm²', prixUnitaire: 48, prixAchat: 24 },
        { description: 'Armature fibre de verre + sous-enduit', quantite: 100, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Enduit de finition', quantite: 100, unite: 'm²', prixUnitaire: 20, prixAchat: 9 },
        { description: 'Points singuliers (appuis, tableaux, angles)', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 550 },
        { description: 'Repli', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
      ]
    },
    {
      id: 'ite-bardage',
      nom: 'ITE sous bardage',
      description: '~7 lignes | ~100 – 200 €/m² HT | ~40% marge',
      prixMin: 10000, prixMax: 20000, margeCible: 40,
      lignes: [
        { description: 'Échafaudage', quantite: 1, unite: 'forfait', prixUnitaire: 1500, prixAchat: 750 },
        { description: 'Pose ossature bois', quantite: 100, unite: 'm²', prixUnitaire: 28, prixAchat: 13 },
        { description: 'Pose panneaux isolants (fibre de bois / laine de roche)', quantite: 100, unite: 'm²', prixUnitaire: 35, prixAchat: 18 },
        { description: 'Pare-pluie', quantite: 100, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Pose bardage (bois / composite / métal)', quantite: 100, unite: 'm²', prixUnitaire: 65, prixAchat: 35 },
        { description: 'Points singuliers', quantite: 1, unite: 'forfait', prixUnitaire: 1400, prixAchat: 650 },
        { description: 'Repli', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'iti',
      nom: 'Isolation murs intérieurs (ITI)',
      description: '~4 lignes | ~30 – 60 €/m² HT | ~55% marge',
      prixMin: 1800, prixMax: 3600, margeCible: 55,
      lignes: [
        { description: 'Doublage isolant', quantite: 60, unite: 'm²', prixUnitaire: 28, prixAchat: 13 },
        { description: 'Pose placo BA13', quantite: 60, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Bandes et joints', quantite: 60, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Traitement ponts thermiques', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'sol-sous-dalle',
      nom: 'Isolation sol (sous dalle)',
      description: '~4 lignes | ~15 – 30 €/m² HT | ~55% marge',
      prixMin: 900, prixMax: 1800, margeCible: 55,
      lignes: [
        { description: 'Film PE', quantite: 60, unite: 'm²', prixUnitaire: 3, prixAchat: 1 },
        { description: 'Pose panneaux isolants PSE / PU', quantite: 60, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Bandes périphériques', quantite: 30, unite: 'ml', prixUnitaire: 4, prixAchat: 1 },
        { description: 'Prêt pour chape', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'plafond-cave',
      nom: 'Isolation plafond de cave / garage',
      description: '~3 lignes | ~25 – 50 €/m² HT | ~55% marge',
      prixMin: 1250, prixMax: 2500, margeCible: 55,
      lignes: [
        { description: 'Préparation support', quantite: 50, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Pose panneaux rigides (collés ou fixés)', quantite: 50, unite: 'm²', prixUnitaire: 32, prixAchat: 15 },
        { description: 'Finition (joints, rives)', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'phonique-mur',
      nom: 'Isolation phonique mur mitoyen',
      description: '~4 lignes | ~30 – 60 €/m² HT | ~50% marge',
      prixMin: 900, prixMax: 1800, margeCible: 50,
      lignes: [
        { description: 'Ossature désolidarisée', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Pose isolant phonique (laine minérale)', quantite: 30, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Placo phonique (1 ou 2 plaques)', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Bandes et joints', quantite: 30, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
      ]
    },
    {
      id: 'phonique-plafond',
      nom: 'Isolation phonique plafond',
      description: '~4 lignes | ~40 – 75 €/m² HT | ~45% marge',
      prixMin: 1200, prixMax: 2250, margeCible: 45,
      lignes: [
        { description: 'Ossature suspendue anti-vibratile', quantite: 30, unite: 'm²', prixUnitaire: 25, prixAchat: 12 },
        { description: 'Isolant phonique', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Placo phonique', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Bandes et joints', quantite: 30, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
      ]
    },
  ]
};

// TERRASSEMENT / VRD (16 modèles)
export const TERRASSEMENT_MODELES = {
  nom: 'Terrassement / VRD',
  icon: '🔨',
  color: '#84cc16',
  modeles: [
    {
      id: 'fondations-maison',
      nom: 'Terrassement fondations maison',
      description: '~6 lignes | ~3 000 – 8 000 € HT | ~45% marge',
      prixMin: 3000, prixMax: 8000, margeCible: 45,
      lignes: [
        { description: 'Implantation et piquetage', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Décapage terre végétale', quantite: 100, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Fouilles', quantite: 30, unite: 'm³', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Fond de fouille + compactage', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 130 },
        { description: 'Remblai', quantite: 15, unite: 'm³', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Évacuation terres', quantite: 25, unite: 'm³', prixUnitaire: 45, prixAchat: 20 },
      ]
    },
    {
      id: 'viabilisation',
      nom: 'Viabilisation terrain',
      description: '~7 lignes | ~5 000 – 15 000 € HT | ~40% marge',
      prixMin: 5000, prixMax: 15000, margeCible: 40,
      lignes: [
        { description: 'Tranchée + gaine électrique TPC', quantite: 30, unite: 'ml', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Tranchée + canalisation eau', quantite: 25, unite: 'ml', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Tranchée + tout-à-l\'égout', quantite: 25, unite: 'ml', prixUnitaire: 75, prixAchat: 35 },
        { description: 'Tranchée + gaine télécom', quantite: 30, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Regards de visite', quantite: 4, unite: 'u', prixUnitaire: 280, prixAchat: 130 },
        { description: 'Raccordement compteurs', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 200 },
        { description: 'Remblai et compactage', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 140 },
      ]
    },
    {
      id: 'allee-beton',
      nom: 'Création allée carrossable (béton désactivé)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 45,
      lignes: [
        { description: 'Décaissement', quantite: 40, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Sous-couche tout-venant', quantite: 40, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Coffrage', quantite: 30, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Coulage béton désactivé', quantite: 40, unite: 'm²', prixUnitaire: 75, prixAchat: 40 },
        { description: 'Lavage et finition', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
      ]
    },
    {
      id: 'allee-enrobe',
      nom: 'Création allée carrossable (enrobé)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~45% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 45,
      lignes: [
        { description: 'Décaissement', quantite: 40, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Fondation tout-venant', quantite: 40, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Compactage', quantite: 40, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Enrobé à chaud ép. 5 cm', quantite: 40, unite: 'm²', prixUnitaire: 55, prixAchat: 28 },
        { description: 'Bordures', quantite: 25, unite: 'ml', prixUnitaire: 28, prixAchat: 12 },
      ]
    },
    {
      id: 'allee-paves',
      nom: 'Création allée piétonne (pavés / dalles)',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500, prixMax: 4000, margeCible: 50,
      lignes: [
        { description: 'Décaissement', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Lit de sable / tout-venant', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'F&P pavés / dalles', quantite: 25, unite: 'm²', prixUnitaire: 55, prixAchat: 28 },
        { description: 'Bordures', quantite: 20, unite: 'ml', prixUnitaire: 22, prixAchat: 9 },
        { description: 'Jointement et compactage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'terrasse-beton',
      nom: 'Création terrasse béton',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 50,
      lignes: [
        { description: 'Terrassement et fond de forme', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
        { description: 'Film PE + hérisson', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Coffrage', quantite: 22, unite: 'ml', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Ferraillage et coulage', quantite: 30, unite: 'm²', prixUnitaire: 65, prixAchat: 32 },
        { description: 'Finition', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
      ]
    },
    {
      id: 'cloture-grillage',
      nom: 'Pose clôture grillage rigide',
      description: '~4 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500, prixMax: 4000, margeCible: 50,
      lignes: [
        { description: 'Terrassement + scellement poteaux', quantite: 15, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'F&P panneaux rigides', quantite: 30, unite: 'ml', prixUnitaire: 48, prixAchat: 24 },
        { description: 'Portillon (si applicable)', quantite: 1, unite: 'u', prixUnitaire: 350, prixAchat: 190 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
    {
      id: 'portail-motorise',
      nom: 'Pose portail + motorisation',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~45% marge',
      prixMin: 1500, prixMax: 4000, margeCible: 45,
      lignes: [
        { description: 'Piliers béton (si nécessaire)', quantite: 2, unite: 'u', prixUnitaire: 280, prixAchat: 130 },
        { description: 'F&P portail (battant ou coulissant)', quantite: 1, unite: 'u', prixUnitaire: 1600, prixAchat: 1000 },
        { description: 'Motorisation', quantite: 1, unite: 'u', prixUnitaire: 750, prixAchat: 420 },
        { description: 'Raccordement électrique', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Essais et programmation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'assainissement-fosse',
      nom: 'Assainissement individuel (fosse + épandage)',
      description: '~6 lignes | ~5 000 – 12 000 € HT | ~40% marge',
      prixMin: 5000, prixMax: 12000, margeCible: 40,
      lignes: [
        { description: 'Terrassement', quantite: 1, unite: 'forfait', prixUnitaire: 1500, prixAchat: 700 },
        { description: 'F&P fosse toutes eaux', quantite: 1, unite: 'u', prixUnitaire: 1800, prixAchat: 1100 },
        { description: 'Canalisations', quantite: 30, unite: 'ml', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Épandage / tranchées filtrantes', quantite: 40, unite: 'ml', prixUnitaire: 55, prixAchat: 25 },
        { description: 'Regards', quantite: 3, unite: 'u', prixUnitaire: 220, prixAchat: 100 },
        { description: 'Remblai et remise en état', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 280 },
      ]
    },
    {
      id: 'drainage',
      nom: 'Drainage périphérique maison',
      description: '~5 lignes | ~3 000 – 8 000 € HT | ~45% marge',
      prixMin: 3000, prixMax: 8000, margeCible: 45,
      lignes: [
        { description: 'Terrassement tranchée périphérique', quantite: 40, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Pose drain et géotextile', quantite: 40, unite: 'ml', prixUnitaire: 28, prixAchat: 12 },
        { description: 'Gravier drainant', quantite: 8, unite: 'm³', prixUnitaire: 85, prixAchat: 40 },
        { description: 'Raccordement exutoire / regard', quantite: 2, unite: 'u', prixUnitaire: 280, prixAchat: 130 },
        { description: 'Remblai', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 190 },
      ]
    },
  ]
};

// SERRURERIE (8 modèles)
export const SERRURERIE_MODELES = {
  nom: 'Serrurerie',
  icon: '🔐',
  color: '#64748b',
  modeles: [
    {
      id: 'blindage',
      nom: 'Blindage porte d\'entrée',
      description: '~4 lignes | ~1 000 – 2 000 € HT | ~50% marge',
      prixMin: 1000, prixMax: 2000, margeCible: 50,
      lignes: [
        { description: 'Kit blindage (tôle acier + paumelles)', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 350 },
        { description: 'Pose', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 130 },
        { description: 'Serrure multipoints', quantite: 1, unite: 'u', prixUnitaire: 420, prixAchat: 230 },
        { description: 'Cylindre haute sécurité', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 90 },
      ]
    },
    {
      id: 'serrure-multipoints',
      nom: 'Remplacement serrure multipoints',
      description: '~3 lignes | ~200 – 500 € HT | ~60% marge',
      prixMin: 200, prixMax: 500, margeCible: 60,
      lignes: [
        { description: 'Dépose serrure existante', quantite: 1, unite: 'u', prixUnitaire: 60, prixAchat: 18 },
        { description: 'F&P serrure multipoints (3 ou 5 pts)', quantite: 1, unite: 'u', prixUnitaire: 320, prixAchat: 175 },
        { description: 'Réglage et essais', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'ouverture-urgence',
      nom: 'Ouverture de porte (urgence)',
      description: '~3 lignes | ~100 – 300 € HT | ~70% marge',
      prixMin: 100, prixMax: 300, margeCible: 70,
      lignes: [
        { description: 'Déplacement urgence', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'Ouverture (sans casse / avec casse)', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 35 },
        { description: 'Remplacement cylindre (si nécessaire)', quantite: 1, unite: 'u', prixUnitaire: 100, prixAchat: 45 },
      ]
    },
    {
      id: 'grilles-defense',
      nom: 'Pose grilles de défense',
      description: '~3 lignes | ~600 – 2 000 € HT | ~50% marge',
      prixMin: 600, prixMax: 2000, margeCible: 50,
      lignes: [
        { description: 'F&P grilles sur mesure', quantite: 4, unite: 'u', prixUnitaire: 280, prixAchat: 150 },
        { description: 'Pose et scellement', quantite: 4, unite: 'u', prixUnitaire: 85, prixAchat: 30 },
        { description: 'Finition (peinture)', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'rideau-metallique',
      nom: 'Pose rideau métallique (commerce)',
      description: '~4 lignes | ~1 500 – 4 000 € HT | ~40% marge',
      prixMin: 1500, prixMax: 4000, margeCible: 40,
      lignes: [
        { description: 'F&P rideau métallique', quantite: 1, unite: 'u', prixUnitaire: 2200, prixAchat: 1450 },
        { description: 'Pose et fixation', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 160 },
        { description: 'Motorisation', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 380 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'cylindre',
      nom: 'Remplacement cylindre',
      description: '~2 lignes | ~80 – 200 € HT | ~65% marge',
      prixMin: 80, prixMax: 200, margeCible: 65,
      lignes: [
        { description: 'F&P cylindre haute sécurité', quantite: 1, unite: 'u', prixUnitaire: 120, prixAchat: 55 },
        { description: 'Pose et essais', quantite: 1, unite: 'forfait', prixUnitaire: 60, prixAchat: 18 },
      ]
    },
    {
      id: 'cle-passe-partout',
      nom: 'Création clé passe-partout (immeuble / copro)',
      description: '~3 lignes | ~300 – 800 € HT | ~55% marge',
      prixMin: 300, prixMax: 800, margeCible: 55,
      lignes: [
        { description: 'Relevé organigramme', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'F&P cylindres compatibles', quantite: 6, unite: 'u', prixUnitaire: 65, prixAchat: 32 },
        { description: 'Jeux de clés', quantite: 3, unite: 'lots', prixUnitaire: 55, prixAchat: 22 },
      ]
    },
    {
      id: 'coffre-fort',
      nom: 'Installation coffre-fort',
      description: '~3 lignes | ~500 – 2 000 € HT | ~45% marge',
      prixMin: 500, prixMax: 2000, margeCible: 45,
      lignes: [
        { description: 'F&P coffre-fort', quantite: 1, unite: 'u', prixUnitaire: 950, prixAchat: 600 },
        { description: 'Scellement / fixation', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
        { description: 'Programmation (si électronique)', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
  ]
};

// VITRERIE (6 modèles)
export const VITRERIE_MODELES = {
  nom: 'Vitrerie',
  icon: '🪟',
  color: '#0ea5e9',
  modeles: [
    {
      id: 'vitrage-fenetre',
      nom: 'Remplacement vitrage (fenêtre)',
      description: '~3 lignes | ~150 – 400 € HT | ~55% marge',
      prixMin: 150, prixMax: 400, margeCible: 55,
      lignes: [
        { description: 'Dépose vitrage cassé', quantite: 1, unite: 'u', prixUnitaire: 50, prixAchat: 15 },
        { description: 'F&P double vitrage sur mesure', quantite: 1, unite: 'u', prixUnitaire: 220, prixAchat: 120 },
        { description: 'Pose et joints', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 28 },
      ]
    },
    {
      id: 'miroir',
      nom: 'Pose miroir sur mesure',
      description: '~3 lignes | ~200 – 600 € HT | ~50% marge',
      prixMin: 200, prixMax: 600, margeCible: 50,
      lignes: [
        { description: 'Prise de mesures', quantite: 1, unite: 'forfait', prixUnitaire: 50, prixAchat: 15 },
        { description: 'F&P miroir (découpe sur mesure)', quantite: 2, unite: 'm²', prixUnitaire: 150, prixAchat: 80 },
        { description: 'Pose (collage / fixation)', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'credence-verre',
      nom: 'Pose crédence verre cuisine',
      description: '~3 lignes | ~300 – 800 € HT | ~50% marge',
      prixMin: 300, prixMax: 800, margeCible: 50,
      lignes: [
        { description: 'Prise de mesures et gabarit', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P verre laqué sur mesure', quantite: 2, unite: 'ml', prixUnitaire: 220, prixAchat: 120 },
        { description: 'Pose et fixation', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'garde-corps-vitre',
      nom: 'Pose garde-corps vitré',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~40% marge',
      prixMin: 1000, prixMax: 3000, margeCible: 40,
      lignes: [
        { description: 'F&P verre feuilleté', quantite: 4, unite: 'm²', prixUnitaire: 280, prixAchat: 170 },
        { description: 'F&P profils / pinces', quantite: 5, unite: 'ml', prixUnitaire: 120, prixAchat: 65 },
        { description: 'Pose', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 130 },
        { description: 'Main courante', quantite: 5, unite: 'ml', prixUnitaire: 55, prixAchat: 25 },
      ]
    },
    {
      id: 'vitrine-commerce',
      nom: 'Remplacement vitrine commerce',
      description: '~3 lignes | ~500 – 2 000 € HT | ~45% marge',
      prixMin: 500, prixMax: 2000, margeCible: 45,
      lignes: [
        { description: 'Dépose vitrine cassée', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'F&P vitrage feuilleté', quantite: 4, unite: 'm²', prixUnitaire: 250, prixAchat: 145 },
        { description: 'Pose et joints', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
      ]
    },
    {
      id: 'film',
      nom: 'Pose film (sécurité / solaire / intimité)',
      description: '~3 lignes | ~200 – 800 € HT | ~60% marge',
      prixMin: 200, prixMax: 800, margeCible: 60,
      lignes: [
        { description: 'Nettoyage vitrage', quantite: 10, unite: 'm²', prixUnitaire: 5, prixAchat: 1 },
        { description: 'Pose film', quantite: 10, unite: 'm²', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Finitions (découpe, joints)', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
  ]
};

// PAYSAGISME (20 modèles) - version réduite pour ce fichier
export const PAYSAGISME_MODELES = {
  nom: 'Paysagisme',
  icon: '🌿',
  color: '#22c55e',
  modeles: [
    {
      id: 'jardin-complet',
      nom: 'Création jardin complet',
      description: '~8 lignes | ~3 000 – 10 000 € HT | ~45% marge',
      prixMin: 3000, prixMax: 10000, margeCible: 45,
      lignes: [
        { description: 'Préparation terrain (rotovateur, nivellement)', quantite: 100, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Amendement terre', quantite: 100, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Semis gazon', quantite: 80, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Plantation haies', quantite: 15, unite: 'ml', prixUnitaire: 35, prixAchat: 16 },
        { description: 'Plantation arbustes', quantite: 10, unite: 'u', prixUnitaire: 55, prixAchat: 26 },
        { description: 'Paillage + géotextile', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Bordures', quantite: 30, unite: 'ml', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Arrosage automatique', quantite: 2, unite: 'zones', prixUnitaire: 380, prixAchat: 180 },
      ]
    },
    {
      id: 'gazon-rouleau',
      nom: 'Pose gazon en rouleau',
      description: '~4 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500, prixMax: 4000, margeCible: 50,
      lignes: [
        { description: 'Préparation terrain', quantite: 80, unite: 'm²', prixUnitaire: 8, prixAchat: 3 },
        { description: 'Amendement / terreau', quantite: 80, unite: 'm²', prixUnitaire: 5, prixAchat: 2 },
        { description: 'Pose gazon en rouleau', quantite: 80, unite: 'm²', prixUnitaire: 18, prixAchat: 9 },
        { description: 'Roulage et arrosage initial', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
      ]
    },
    {
      id: 'gazon-synth',
      nom: 'Pose gazon synthétique',
      description: '~5 lignes | ~2 000 – 6 000 € HT | ~45% marge',
      prixMin: 2000, prixMax: 6000, margeCible: 45,
      lignes: [
        { description: 'Décaissement', quantite: 50, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Pose tout-venant + compactage', quantite: 50, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Géotextile', quantite: 50, unite: 'm²', prixUnitaire: 4, prixAchat: 1 },
        { description: 'Pose gazon synthétique', quantite: 50, unite: 'm²', prixUnitaire: 55, prixAchat: 30 },
        { description: 'Fixation et remplissage sable', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
      ]
    },
    {
      id: 'terrasse-bois',
      nom: 'Terrasse bois',
      description: '~5 lignes | ~3 000 – 7 000 € HT | ~45% marge',
      prixMin: 3000, prixMax: 7000, margeCible: 45,
      lignes: [
        { description: 'Préparation sol', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
        { description: 'Plots / lambourdes', quantite: 25, unite: 'm²', prixUnitaire: 28, prixAchat: 13 },
        { description: 'Lames bois / composite', quantite: 25, unite: 'm²', prixUnitaire: 75, prixAchat: 40 },
        { description: 'Fixation inox', quantite: 1, unite: 'lot', prixUnitaire: 180, prixAchat: 80 },
        { description: 'Finitions', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
      ]
    },
    {
      id: 'haie',
      nom: 'Plantation haie',
      description: '~4 lignes | ~500 – 2 000 € HT | ~50% marge',
      prixMin: 500, prixMax: 2000, margeCible: 50,
      lignes: [
        { description: 'Tranchée', quantite: 20, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Amendement terre', quantite: 20, unite: 'ml', prixUnitaire: 6, prixAchat: 2 },
        { description: 'Plantation (laurier, thuya, photinia…)', quantite: 25, unite: 'u', prixUnitaire: 25, prixAchat: 12 },
        { description: 'Paillage', quantite: 20, unite: 'ml', prixUnitaire: 8, prixAchat: 3 },
      ]
    },
    {
      id: 'abattage',
      nom: 'Abattage d\'arbre',
      description: '~4 lignes | ~300 – 2 000 € HT | ~55% marge',
      prixMin: 300, prixMax: 2000, margeCible: 55,
      lignes: [
        { description: 'Abattage (haubanage si nécessaire)', quantite: 1, unite: 'u', prixUnitaire: 450, prixAchat: 180 },
        { description: 'Élagage branches', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 100 },
        { description: 'Débitage et évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 150 },
        { description: 'Dessouchage (si demandé)', quantite: 1, unite: 'u', prixUnitaire: 250, prixAchat: 100 },
      ]
    },
    {
      id: 'taille-haie',
      nom: 'Taille de haie',
      description: '~2 lignes | ~200 – 800 € HT | ~70% marge',
      prixMin: 200, prixMax: 800, margeCible: 70,
      lignes: [
        { description: 'Taille de haie', quantite: 30, unite: 'ml', prixUnitaire: 15, prixAchat: 4 },
        { description: 'Évacuation déchets verts', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
    {
      id: 'arrosage-auto',
      nom: 'Installation arrosage automatique',
      description: '~5 lignes | ~1 000 – 3 000 € HT | ~45% marge',
      prixMin: 1000, prixMax: 3000, margeCible: 45,
      lignes: [
        { description: 'Tranchée', quantite: 40, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Pose tuyaux PE', quantite: 40, unite: 'ml', prixUnitaire: 8, prixAchat: 3 },
        { description: 'F&P turbines / goutteurs', quantite: 12, unite: 'u', prixUnitaire: 35, prixAchat: 16 },
        { description: 'Programmateur', quantite: 1, unite: 'u', prixUnitaire: 180, prixAchat: 95 },
        { description: 'Essais', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
  ]
};

// ÉTANCHÉITÉ (8 modèles)
export const ETANCHEITE_MODELES = {
  nom: 'Étanchéité',
  icon: '🛡️',
  color: '#0369a1',
  modeles: [
    {
      id: 'terrasse-bitume',
      nom: 'Étanchéité terrasse (membrane bitumineuse)',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 40, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Pose membrane bitumineuse (2 couches)', quantite: 40, unite: 'm²', prixUnitaire: 45, prixAchat: 22 },
        { description: 'Relevés', quantite: 20, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Évacuations EP', quantite: 2, unite: 'u', prixUnitaire: 120, prixAchat: 55 },
        { description: 'Essai', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'terrasse-resine',
      nom: 'Étanchéité terrasse (résine / SEL)',
      description: '~4 lignes | ~2 500 – 6 000 € HT | ~45% marge',
      prixMin: 2500, prixMax: 6000, margeCible: 45,
      lignes: [
        { description: 'Préparation support', quantite: 40, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Primaire', quantite: 40, unite: 'm²', prixUnitaire: 10, prixAchat: 4 },
        { description: 'Application résine (2-3 couches)', quantite: 40, unite: 'm²', prixUnitaire: 55, prixAchat: 28 },
        { description: 'Finition anti-dérapante', quantite: 40, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
      ]
    },
    {
      id: 'cuvelage',
      nom: 'Cuvelage cave / sous-sol',
      description: '~5 lignes | ~3 000 – 8 000 € HT | ~45% marge',
      prixMin: 3000, prixMax: 8000, margeCible: 45,
      lignes: [
        { description: 'Diagnostic humidité', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 70 },
        { description: 'Préparation murs', quantite: 60, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Application enduit de cuvelage (2 couches)', quantite: 60, unite: 'm²', prixUnitaire: 45, prixAchat: 22 },
        { description: 'Traitement sol', quantite: 25, unite: 'm²', prixUnitaire: 35, prixAchat: 16 },
        { description: 'Pompe de relevage (si nécessaire)', quantite: 1, unite: 'u', prixUnitaire: 650, prixAchat: 380 },
      ]
    },
    {
      id: 'remontees-capillaires',
      nom: 'Traitement remontées capillaires',
      description: '~4 lignes | ~2 000 – 6 000 € HT | ~50% marge',
      prixMin: 2000, prixMax: 6000, margeCible: 50,
      lignes: [
        { description: 'Diagnostic', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 60 },
        { description: 'Forage murs', quantite: 30, unite: 'u', prixUnitaire: 25, prixAchat: 10 },
        { description: 'Injection résine', quantite: 15, unite: 'ml', prixUnitaire: 85, prixAchat: 40 },
        { description: 'Enduit de rénovation', quantite: 30, unite: 'm²', prixUnitaire: 35, prixAchat: 15 },
      ]
    },
    {
      id: 'balcon',
      nom: 'Étanchéité balcon / loggia',
      description: '~4 lignes | ~800 – 2 000 € HT | ~50% marge',
      prixMin: 800, prixMax: 2000, margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 10, unite: 'm²', prixUnitaire: 15, prixAchat: 5 },
        { description: 'Pose SEL / résine', quantite: 10, unite: 'm²', prixUnitaire: 65, prixAchat: 32 },
        { description: 'Relevés', quantite: 8, unite: 'ml', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Seuil / nez de dalle', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
      ]
    },
  ]
};

// DÉMOLITION (6 modèles)
export const DEMOLITION_MODELES = {
  nom: 'Démolition',
  icon: '🔨',
  color: '#dc2626',
  modeles: [
    {
      id: 'curage-appart',
      nom: 'Curage appartement complet',
      description: '~6 lignes | ~2 000 – 6 000 € HT | ~55% marge',
      prixMin: 2000, prixMax: 6000, margeCible: 55,
      lignes: [
        { description: 'Démolition cloisons', quantite: 50, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Dépose revêtements sol', quantite: 70, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Dépose faux plafonds', quantite: 50, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
        { description: 'Dépose sanitaires / cuisine', quantite: 8, unite: 'u', prixUnitaire: 65, prixAchat: 22 },
        { description: 'Dépose menuiseries intérieures', quantite: 6, unite: 'u', prixUnitaire: 35, prixAchat: 12 },
        { description: 'Évacuation gravats', quantite: 3, unite: 'bennes', prixUnitaire: 450, prixAchat: 200 },
      ]
    },
    {
      id: 'demolition-piece',
      nom: 'Démolition pièce unique',
      description: '~4 lignes | ~500 – 1 500 € HT | ~60% marge',
      prixMin: 500, prixMax: 1500, margeCible: 60,
      lignes: [
        { description: 'Démolition cloisons / revêtements', quantite: 20, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Dépose équipements', quantite: 3, unite: 'u', prixUnitaire: 55, prixAchat: 18 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
        { description: 'Évacuation', quantite: 1, unite: 'benne', prixUnitaire: 400, prixAchat: 180 },
      ]
    },
    {
      id: 'demolition-mur-porteur',
      nom: 'Démolition mur porteur',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000, prixMax: 5000, margeCible: 50,
      lignes: [
        { description: 'Étude structure (si nécessaire)', quantite: 1, unite: 'forfait', prixUnitaire: 350, prixAchat: 150 },
        { description: 'Étaiement', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 160 },
        { description: 'Démolition', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 230 },
        { description: 'F&P IPN / poutre', quantite: 3, unite: 'ml', prixUnitaire: 280, prixAchat: 150 },
        { description: 'Évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 100 },
      ]
    },
    {
      id: 'depose-cuisine',
      nom: 'Dépose cuisine complète',
      description: '~4 lignes | ~500 – 1 200 € HT | ~60% marge',
      prixMin: 500, prixMax: 1200, margeCible: 60,
      lignes: [
        { description: 'Dépose meubles', quantite: 10, unite: 'u', prixUnitaire: 35, prixAchat: 12 },
        { description: 'Dépose plan de travail + crédence', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Déconnexion eau / élec / gaz', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
        { description: 'Évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 120 },
      ]
    },
    {
      id: 'depose-sdb',
      nom: 'Dépose salle de bain complète',
      description: '~4 lignes | ~500 – 1 200 € HT | ~60% marge',
      prixMin: 500, prixMax: 1200, margeCible: 60,
      lignes: [
        { description: 'Dépose sanitaires', quantite: 4, unite: 'u', prixUnitaire: 55, prixAchat: 18 },
        { description: 'Dépose carrelage / faïence', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 5 },
        { description: 'Déconnexion eau / élec', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
        { description: 'Évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 120 },
      ]
    },
  ]
};

// CHARPENTE (6 modèles)
export const CHARPENTE_MODELES = {
  nom: 'Charpente',
  icon: '🏗️',
  color: '#92400e',
  modeles: [
    {
      id: 'traditionnelle',
      nom: 'Charpente traditionnelle (construction neuve)',
      description: '~5 lignes | ~8 000 – 20 000 € HT | ~35% marge',
      prixMin: 8000, prixMax: 20000, margeCible: 35,
      lignes: [
        { description: 'Fabrication en atelier', quantite: 1, unite: 'lot', prixUnitaire: 5500, prixAchat: 3800 },
        { description: 'Levage et pose', quantite: 1, unite: 'forfait', prixUnitaire: 2200, prixAchat: 1300 },
        { description: 'Contreventement', quantite: 1, unite: 'forfait', prixUnitaire: 650, prixAchat: 300 },
        { description: 'Traitement bois', quantite: 1, unite: 'forfait', prixUnitaire: 480, prixAchat: 200 },
        { description: 'Pose écran sous-toiture', quantite: 80, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
      ]
    },
    {
      id: 'fermettes',
      nom: 'Charpente fermettes (construction neuve)',
      description: '~4 lignes | ~4 000 – 10 000 € HT | ~40% marge',
      prixMin: 4000, prixMax: 10000, margeCible: 40,
      lignes: [
        { description: 'F&P fermettes industrielles', quantite: 15, unite: 'u', prixUnitaire: 280, prixAchat: 165 },
        { description: 'Levage et pose', quantite: 1, unite: 'forfait', prixUnitaire: 1500, prixAchat: 850 },
        { description: 'Contreventement', quantite: 1, unite: 'forfait', prixUnitaire: 450, prixAchat: 200 },
        { description: 'Pose écran sous-toiture', quantite: 80, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
      ]
    },
    {
      id: 'reparation',
      nom: 'Réparation charpente (remplacement pièces)',
      description: '~4 lignes | ~1 500 – 5 000 € HT | ~45% marge',
      prixMin: 1500, prixMax: 5000, margeCible: 45,
      lignes: [
        { description: 'Étaiement', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 140 },
        { description: 'Remplacement pièces (pannes, chevrons, arbalétriers)', quantite: 8, unite: 'ml', prixUnitaire: 180, prixAchat: 90 },
        { description: 'Traitement bois neuf', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
        { description: 'Remise en couverture', quantite: 1, unite: 'forfait', prixUnitaire: 380, prixAchat: 150 },
      ]
    },
    {
      id: 'traitement',
      nom: 'Traitement charpente',
      description: '~4 lignes | ~1 000 – 3 000 € HT | ~65% marge',
      prixMin: 1000, prixMax: 3000, margeCible: 65,
      lignes: [
        { description: 'Diagnostic (sondage)', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Bûchage bois attaqué', quantite: 1, unite: 'forfait', prixUnitaire: 280, prixAchat: 95 },
        { description: 'Injection', quantite: 60, unite: 'm²', prixUnitaire: 15, prixAchat: 5 },
        { description: 'Pulvérisation', quantite: 60, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
      ]
    },
    {
      id: 'modification-combles',
      nom: 'Modification charpente (combles aménageables)',
      description: '~5 lignes | ~5 000 – 15 000 € HT | ~35% marge',
      prixMin: 5000, prixMax: 15000, margeCible: 35,
      lignes: [
        { description: 'Étaiement', quantite: 1, unite: 'forfait', prixUnitaire: 550, prixAchat: 220 },
        { description: 'Suppression fermettes / entraits', quantite: 8, unite: 'u', prixUnitaire: 180, prixAchat: 70 },
        { description: 'Création portique (IPN / bois lamellé)', quantite: 3, unite: 'u', prixUnitaire: 850, prixAchat: 480 },
        { description: 'Renforcement', quantite: 1, unite: 'forfait', prixUnitaire: 1200, prixAchat: 580 },
        { description: 'Plancher', quantite: 40, unite: 'm²', prixUnitaire: 65, prixAchat: 32 },
      ]
    },
  ]
};

// PLÂTRERIE (8 modèles)
export const PLATRERIE_MODELES = {
  nom: 'Plâtrerie',
  icon: '🏢',
  color: '#a3a3a3',
  modeles: [
    {
      id: 'cloison-ba13',
      nom: 'Cloison placo standard (BA13)',
      description: '~4 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800, prixMax: 2000, margeCible: 55,
      lignes: [
        { description: 'Ossature métallique (72/48)', quantite: 15, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Plaques BA13 double face', quantite: 30, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Isolation (laine de verre 45mm)', quantite: 15, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Bandes et enduit', quantite: 30, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
      ]
    },
    {
      id: 'cloison-hydro',
      nom: 'Cloison placo hydro (salle de bain)',
      description: '~4 lignes | ~1 000 – 2 500 € HT | ~50% marge',
      prixMin: 1000, prixMax: 2500, margeCible: 50,
      lignes: [
        { description: 'Ossature métallique', quantite: 15, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Plaques hydro (H1) double face', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Isolation', quantite: 15, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Bandes et enduit', quantite: 30, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
      ]
    },
    {
      id: 'cloison-phonique',
      nom: 'Cloison placo phonique',
      description: '~4 lignes | ~1 200 – 3 000 € HT | ~50% marge',
      prixMin: 1200, prixMax: 3000, margeCible: 50,
      lignes: [
        { description: 'Ossature désolidarisée', quantite: 15, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Plaques Placo Phonique double face', quantite: 30, unite: 'm²', prixUnitaire: 22, prixAchat: 10 },
        { description: 'Laine de roche 45mm', quantite: 15, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Bandes et enduit', quantite: 30, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
      ]
    },
    {
      id: 'doublage',
      nom: 'Doublage murs (isolation + placo)',
      description: '~4 lignes | ~1 500 – 3 500 € HT | ~50% marge',
      prixMin: 1500, prixMax: 3500, margeCible: 50,
      lignes: [
        { description: 'Ossature métallique', quantite: 50, unite: 'm²', prixUnitaire: 15, prixAchat: 7 },
        { description: 'Isolant', quantite: 50, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Plaques BA13', quantite: 50, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Bandes et enduit', quantite: 50, unite: 'm²', prixUnitaire: 10, prixAchat: 3 },
      ]
    },
    {
      id: 'faux-plafond-suspendu',
      nom: 'Faux plafond placo (suspendu)',
      description: '~4 lignes | ~1 000 – 2 500 € HT | ~55% marge',
      prixMin: 1000, prixMax: 2500, margeCible: 55,
      lignes: [
        { description: 'Ossature suspendue', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Plaques BA13', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Isolation (si demandée)', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Bandes et enduit', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
      ]
    },
    {
      id: 'habillage-coffrage',
      nom: 'Habillage gaines / coffrage',
      description: '~3 lignes | ~300 – 1 000 € HT | ~55% marge',
      prixMin: 300, prixMax: 1000, margeCible: 55,
      lignes: [
        { description: 'Ossature métallique', quantite: 8, unite: 'ml', prixUnitaire: 25, prixAchat: 10 },
        { description: 'Habillage placo', quantite: 12, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'Bandes et enduit', quantite: 12, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
      ]
    },
    {
      id: 'ratissage',
      nom: 'Ratissage / enduit lissé (murs / plafonds)',
      description: '~3 lignes | ~500 – 1 500 € HT | ~60% marge',
      prixMin: 500, prixMax: 1500, margeCible: 60,
      lignes: [
        { description: 'Préparation support', quantite: 50, unite: 'm²', prixUnitaire: 5, prixAchat: 1 },
        { description: 'Enduit de lissage (2 passes)', quantite: 50, unite: 'm²', prixUnitaire: 18, prixAchat: 7 },
        { description: 'Ponçage finition', quantite: 50, unite: 'm²', prixUnitaire: 6, prixAchat: 2 },
      ]
    },
  ]
};
