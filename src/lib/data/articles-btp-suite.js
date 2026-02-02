/**
 * Suite du référentiel articles BTP - Parties 2
 * Peinture, Menuiserie, Carrelage, Chauffage, Couverture, Isolation, Terrassement
 */

export const ARTICLES_BTP_SUITE = {
  peinture: {
    nom: 'Peinture',
    sousCategories: {
      preparation: {
        nom: 'Préparation des supports',
        articles: [
          { id: 'lessivage', nom: 'Lessivage murs / plafonds', unite: 'm²', prixMin: 3, prixMax: 6, prixDefaut: 5 },
          { id: 'rebouchage', nom: 'Rebouchage fissures et trous', unite: 'm²', prixMin: 5, prixMax: 12, prixDefaut: 9 },
          { id: 'poncage', nom: 'Ponçage murs', unite: 'm²', prixMin: 4, prixMax: 8, prixDefaut: 6 },
          { id: 'decapage', nom: 'Décapage peinture ancienne', unite: 'm²', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'depose-papier', nom: 'Dépose papier peint', unite: 'm²', prixMin: 5, prixMax: 12, prixDefaut: 9 },
          { id: 'entoilage', nom: 'Entoilage / pose toile de rénovation', unite: 'm²', prixMin: 8, prixMax: 15, prixDefaut: 12 },
          { id: 'sous-couche', nom: 'Sous-couche / primaire d\'accrochage', unite: 'm²', prixMin: 4, prixMax: 8, prixDefaut: 6 },
          { id: 'traitement-humidite', nom: 'Traitement anti-humidité', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'traitement-moisissure', nom: 'Traitement anti-moisissures', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
        ]
      },
      interieur: {
        nom: 'Peinture intérieure',
        articles: [
          { id: 'mur-mat', nom: 'Peinture mur acrylique mat (2 couches)', unite: 'm²', prixMin: 12, prixMax: 22, prixDefaut: 17 },
          { id: 'mur-satin', nom: 'Peinture mur acrylique satin (2 couches)', unite: 'm²', prixMin: 14, prixMax: 25, prixDefaut: 20 },
          { id: 'plafond-mat', nom: 'Peinture plafond blanc mat (2 couches)', unite: 'm²', prixMin: 14, prixMax: 28, prixDefaut: 21 },
          { id: 'boiseries', nom: 'Peinture boiseries / portes (2 couches)', unite: 'm²', prixMin: 18, prixMax: 35, prixDefaut: 27 },
          { id: 'radiateur', nom: 'Peinture radiateur (par élément)', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'laque', nom: 'Laque brillante sur boiseries', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'sol-int', nom: 'Peinture sol intérieur (garage, cave)', unite: 'm²', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'peinture-humide', nom: 'Peinture cuisine/SDB (spéciale pièces humides)', unite: 'm²', prixMin: 15, prixMax: 28, prixDefaut: 22 },
        ]
      },
      exterieur: {
        nom: 'Peinture extérieure',
        articles: [
          { id: 'facade', nom: 'Peinture façade (2 couches)', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'volets', nom: 'Peinture volets / portails', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'lasure', nom: 'Lasure bois extérieur (2 couches)', unite: 'm²', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'vernis-ext', nom: 'Vernis bois extérieur', unite: 'm²', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'sol-ext', nom: 'Peinture sol extérieur', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
        ]
      },
      revetements: {
        nom: 'Revêtements muraux',
        articles: [
          { id: 'papier-classique', nom: 'Pose papier peint classique', unite: 'm²', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'papier-intisse', nom: 'Pose papier peint intissé', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'toile-verre', nom: 'Pose toile de verre + peinture', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'fibre-verre', nom: 'Pose fibre de verre', unite: 'm²', prixMin: 12, prixMax: 22, prixDefaut: 17 },
        ]
      },
      decoratif: {
        nom: 'Finitions décoratives',
        articles: [
          { id: 'stucco', nom: 'Enduit décoratif (stucco)', unite: 'm²', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'tadelakt', nom: 'Enduit tadelakt', unite: 'm²', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'beton-cire-mur', nom: 'Béton ciré mural', unite: 'm²', prixMin: 50, prixMax: 90, prixDefaut: 70 },
          { id: 'effet-chaux', nom: 'Peinture effet chaux', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'tableau-noir', nom: 'Peinture tableau noir', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
        ]
      },
      divers: {
        nom: 'Divers peinture',
        articles: [
          { id: 'protection', nom: 'Protection chantier (bâchage, scotch)', unite: 'forfait', prixMin: 50, prixMax: 150, prixDefaut: 100 },
          { id: 'raccord', nom: 'Raccord peinture après travaux', unite: 'forfait', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'nettoyage-peinture', nom: 'Nettoyage fin de chantier', unite: 'forfait', prixMin: 100, prixMax: 300, prixDefaut: 200 },
        ]
      },
    }
  },

  menuiserie: {
    nom: 'Menuiserie',
    sousCategories: {
      portesInt: {
        nom: 'Portes intérieures',
        articles: [
          { id: 'bloc-isoplane', nom: 'Bloc-porte isoplane', unite: 'u', prixMin: 200, prixMax: 400, prixDefaut: 300 },
          { id: 'bloc-postforme', nom: 'Bloc-porte postformée', unite: 'u', prixMin: 250, prixMax: 450, prixDefaut: 350 },
          { id: 'bloc-massif', nom: 'Bloc-porte bois massif', unite: 'u', prixMin: 400, prixMax: 900, prixDefaut: 650 },
          { id: 'porte-coulissante-app', nom: 'Porte coulissante en applique', unite: 'u', prixMin: 350, prixMax: 700, prixDefaut: 525 },
          { id: 'porte-galandage', nom: 'Porte coulissante à galandage', unite: 'u', prixMin: 600, prixMax: 1200, prixDefaut: 900 },
          { id: 'porte-vitree', nom: 'Porte vitrée intérieure', unite: 'u', prixMin: 350, prixMax: 700, prixDefaut: 525 },
          { id: 'porte-placard-bat', nom: 'Porte de placard battante', unite: 'u', prixMin: 150, prixMax: 400, prixDefaut: 275 },
          { id: 'porte-placard-coul', nom: 'Porte de placard coulissante (vantail)', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
          { id: 'ajustage-porte', nom: 'Ajustage / rabotage porte', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'depose-porte', nom: 'Dépose porte existante', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
        ]
      },
      portesExt: {
        nom: 'Portes extérieures',
        articles: [
          { id: 'porte-entree-bois', nom: 'Porte d\'entrée bois', unite: 'u', prixMin: 800, prixMax: 2000, prixDefaut: 1400 },
          { id: 'porte-entree-alu', nom: 'Porte d\'entrée aluminium', unite: 'u', prixMin: 1200, prixMax: 3000, prixDefaut: 2100 },
          { id: 'porte-entree-pvc', nom: 'Porte d\'entrée PVC', unite: 'u', prixMin: 600, prixMax: 1500, prixDefaut: 1050 },
          { id: 'porte-blindee', nom: 'Porte d\'entrée acier / blindée', unite: 'u', prixMin: 1500, prixMax: 3500, prixDefaut: 2500 },
          { id: 'porte-service', nom: 'Porte de service', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'porte-garage-sect', nom: 'Porte de garage sectionnelle', unite: 'u', prixMin: 800, prixMax: 2000, prixDefaut: 1400 },
          { id: 'porte-garage-enr', nom: 'Porte de garage enroulable', unite: 'u', prixMin: 1000, prixMax: 2500, prixDefaut: 1750 },
          { id: 'porte-garage-basc', nom: 'Porte de garage basculante', unite: 'u', prixMin: 500, prixMax: 1200, prixDefaut: 850 },
          { id: 'motor-garage', nom: 'Motorisation porte de garage', unite: 'u', prixMin: 250, prixMax: 600, prixDefaut: 425 },
        ]
      },
      fenetres: {
        nom: 'Fenêtres',
        articles: [
          { id: 'fenetre-pvc-1v', nom: 'Fenêtre PVC 1 vantail', unite: 'u', prixMin: 200, prixMax: 400, prixDefaut: 300 },
          { id: 'fenetre-pvc-2v', nom: 'Fenêtre PVC 2 vantaux', unite: 'u', prixMin: 300, prixMax: 600, prixDefaut: 450 },
          { id: 'fenetre-bois', nom: 'Fenêtre bois', unite: 'u', prixMin: 400, prixMax: 900, prixDefaut: 650 },
          { id: 'fenetre-alu', nom: 'Fenêtre alu', unite: 'u', prixMin: 500, prixMax: 1200, prixDefaut: 850 },
          { id: 'fenetre-mixte', nom: 'Fenêtre mixte bois-alu', unite: 'u', prixMin: 600, prixMax: 1400, prixDefaut: 1000 },
          { id: 'pf-pvc', nom: 'Porte-fenêtre PVC', unite: 'u', prixMin: 400, prixMax: 800, prixDefaut: 600 },
          { id: 'pf-alu', nom: 'Porte-fenêtre alu', unite: 'u', prixMin: 600, prixMax: 1300, prixDefaut: 950 },
          { id: 'baie-2v', nom: 'Baie vitrée coulissante 2 vantaux', unite: 'u', prixMin: 800, prixMax: 2000, prixDefaut: 1400 },
          { id: 'baie-3v', nom: 'Baie vitrée coulissante 3+ vantaux', unite: 'u', prixMin: 1200, prixMax: 3000, prixDefaut: 2100 },
          { id: 'velux', nom: 'Fenêtre de toit / velux', unite: 'u', prixMin: 500, prixMax: 1500, prixDefaut: 1000 },
          { id: 'puits-lumiere', nom: 'Puits de lumière / tube solaire', unite: 'u', prixMin: 400, prixMax: 1000, prixDefaut: 700 },
          { id: 'depose-fenetre', nom: 'Dépose fenêtre existante', unite: 'u', prixMin: 30, prixMax: 80, prixDefaut: 55 },
        ]
      },
      volets: {
        nom: 'Volets / Stores',
        articles: [
          { id: 'vr-manuel', nom: 'Volet roulant manuel', unite: 'u', prixMin: 250, prixMax: 500, prixDefaut: 375 },
          { id: 'vr-elec', nom: 'Volet roulant électrique', unite: 'u', prixMin: 400, prixMax: 800, prixDefaut: 600 },
          { id: 'vr-solaire', nom: 'Volet roulant solaire', unite: 'u', prixMin: 500, prixMax: 1000, prixDefaut: 750 },
          { id: 'volet-battant-bois', nom: 'Volet battant bois (paire)', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'volet-battant-alu', nom: 'Volet battant alu / PVC (paire)', unite: 'u', prixMin: 350, prixMax: 800, prixDefaut: 575 },
          { id: 'motor-volet', nom: 'Motorisation volet existant', unite: 'u', prixMin: 200, prixMax: 400, prixDefaut: 300 },
          { id: 'store-banne', nom: 'Store banne', unite: 'u', prixMin: 800, prixMax: 2500, prixDefaut: 1650 },
          { id: 'store-int', nom: 'Store intérieur (vénitien, enrouleur)', unite: 'u', prixMin: 50, prixMax: 200, prixDefaut: 125 },
          { id: 'bso', nom: 'Brise-soleil orientable (BSO)', unite: 'u', prixMin: 400, prixMax: 900, prixDefaut: 650 },
        ]
      },
      parquet: {
        nom: 'Parquet / Sol bois',
        articles: [
          { id: 'parquet-strat', nom: 'Parquet flottant stratifié', unite: 'm²', prixMin: 20, prixMax: 35, prixDefaut: 28 },
          { id: 'parquet-contre', nom: 'Parquet contrecollé', unite: 'm²', prixMin: 30, prixMax: 55, prixDefaut: 43 },
          { id: 'parquet-massif-colle', nom: 'Parquet massif collé', unite: 'm²', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'parquet-massif-cloue', nom: 'Parquet massif cloué', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'poncage-parquet', nom: 'Ponçage parquet', unite: 'm²', prixMin: 15, prixMax: 25, prixDefaut: 20 },
          { id: 'vitrification', nom: 'Vitrification parquet', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'huilage', nom: 'Huilage parquet', unite: 'm²', prixMin: 12, prixMax: 22, prixDefaut: 17 },
          { id: 'depose-parquet', nom: 'Dépose parquet existant', unite: 'm²', prixMin: 5, prixMax: 15, prixDefaut: 10 },
        ]
      },
      amenagements: {
        nom: 'Aménagements bois',
        articles: [
          { id: 'plinthes', nom: 'Plinthes bois', unite: 'ml', prixMin: 6, prixMax: 15, prixDefaut: 11 },
          { id: 'lambris-mur', nom: 'Lambris mur', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'lambris-plafond', nom: 'Lambris plafond', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'placard-mesure', nom: 'Placard sur mesure', unite: 'ml', prixMin: 300, prixMax: 800, prixDefaut: 550 },
          { id: 'dressing', nom: 'Dressing sur mesure', unite: 'ml', prixMin: 400, prixMax: 1000, prixDefaut: 700 },
          { id: 'etageres', nom: 'Étagères sur mesure', unite: 'ml', prixMin: 40, prixMax: 100, prixDefaut: 70 },
          { id: 'pdt-bois', nom: 'Plan de travail bois', unite: 'ml', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'pdt-strat', nom: 'Plan de travail stratifié', unite: 'ml', prixMin: 50, prixMax: 120, prixDefaut: 85 },
          { id: 'hab-escalier', nom: 'Habillage escalier bois', unite: 'forfait', prixMin: 1500, prixMax: 4000, prixDefaut: 2750 },
          { id: 'garde-corps-bois', nom: 'Garde-corps / rampe bois', unite: 'ml', prixMin: 100, prixMax: 300, prixDefaut: 200 },
          { id: 'garde-corps-verre', nom: 'Garde-corps verre / inox', unite: 'ml', prixMin: 200, prixMax: 500, prixDefaut: 350 },
          { id: 'terrasse-bois', nom: 'Terrasse bois (lames + structure)', unite: 'm²', prixMin: 60, prixMax: 120, prixDefaut: 90 },
        ]
      },
    }
  },

  carrelage: {
    nom: 'Carrelage',
    sousCategories: {
      preparation: {
        nom: 'Dépose / Préparation',
        articles: [
          { id: 'depose-carrelage-sol', nom: 'Dépose carrelage sol', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'depose-carrelage-mur', nom: 'Dépose carrelage mural', unite: 'm²', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'ragreage-carrelage', nom: 'Ragréage avant carrelage', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'natte-ditra', nom: 'Natte de découplage (Ditra)', unite: 'm²', prixMin: 15, prixMax: 25, prixDefaut: 20 },
          { id: 'etancheite-spec', nom: 'Étanchéité sous carrelage (SPEC)', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
        ]
      },
      solInt: {
        nom: 'Carrelage sol intérieur',
        articles: [
          { id: 'carrelage-petit', nom: 'Carrelage petit format (≤ 30x30)', unite: 'm²', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'carrelage-moyen', nom: 'Carrelage moyen format (30x60 / 45x45)', unite: 'm²', prixMin: 35, prixMax: 55, prixDefaut: 45 },
          { id: 'carrelage-grand', nom: 'Carrelage grand format (60x60)', unite: 'm²', prixMin: 40, prixMax: 60, prixDefaut: 50 },
          { id: 'carrelage-tgf', nom: 'Carrelage très grand format (60x120+)', unite: 'm²', prixMin: 50, prixMax: 80, prixDefaut: 65 },
          { id: 'carrelage-parquet', nom: 'Carrelage imitation parquet', unite: 'm²', prixMin: 40, prixMax: 65, prixDefaut: 53 },
          { id: 'carrelage-beton', nom: 'Carrelage imitation béton', unite: 'm²', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'pierre-nat', nom: 'Carrelage pierre naturelle', unite: 'm²', prixMin: 50, prixMax: 100, prixDefaut: 75 },
        ]
      },
      mural: {
        nom: 'Carrelage mural',
        articles: [
          { id: 'faience', nom: 'Faïence murale standard', unite: 'm²', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'metro', nom: 'Carrelage métro', unite: 'm²', prixMin: 35, prixMax: 55, prixDefaut: 45 },
          { id: 'mosaique', nom: 'Mosaïque', unite: 'm²', prixMin: 45, prixMax: 80, prixDefaut: 63 },
          { id: 'credence-carrelee', nom: 'Crédence cuisine carrelée', unite: 'ml', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'credence-verre', nom: 'Crédence verre / inox', unite: 'ml', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'zellige', nom: 'Zellige', unite: 'm²', prixMin: 60, prixMax: 100, prixDefaut: 80 },
        ]
      },
      exterieur: {
        nom: 'Carrelage extérieur',
        articles: [
          { id: 'terrasse-colle', nom: 'Carrelage terrasse (collé)', unite: 'm²', prixMin: 40, prixMax: 65, prixDefaut: 53 },
          { id: 'dalle-plot', nom: 'Dalle sur plot', unite: 'm²', prixMin: 45, prixMax: 70, prixDefaut: 58 },
          { id: 'margelle', nom: 'Margelle de piscine', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'nez-marche-ext', nom: 'Nez de marche extérieur', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
        ]
      },
      douche: {
        nom: 'Douche / Pièces humides',
        articles: [
          { id: 'receveur-carreler', nom: 'Receveur à carreler', unite: 'u', prixMin: 200, prixMax: 450, prixDefaut: 325 },
          { id: 'etancheite-douche', nom: 'Étanchéité douche complète (SPEC)', unite: 'forfait', prixMin: 150, prixMax: 300, prixDefaut: 225 },
          { id: 'tablier-baignoire-carr', nom: 'Habillage tablier baignoire carrelé', unite: 'forfait', prixMin: 150, prixMax: 300, prixDefaut: 225 },
        ]
      },
      finitions: {
        nom: 'Finitions carrelage',
        articles: [
          { id: 'joints-std', nom: 'Joints standard', unite: 'm²', prixMin: 5, prixMax: 10, prixDefaut: 8 },
          { id: 'joints-epoxy', nom: 'Joints époxy', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'plinthe-carrelage', nom: 'Plinthe carrelage', unite: 'ml', prixMin: 8, prixMax: 15, prixDefaut: 12 },
          { id: 'barre-seuil', nom: 'Barre de seuil / profil de finition', unite: 'u', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'profil-angle', nom: 'Profil d\'angle (alu / inox)', unite: 'ml', prixMin: 8, prixMax: 18, prixDefaut: 13 },
          { id: 'nettoyage-carrelage', nom: 'Nettoyage fin de chantier', unite: 'forfait', prixMin: 80, prixMax: 200, prixDefaut: 140 },
        ]
      },
    }
  },

  chauffage: {
    nom: 'Chauffage / Climatisation',
    sousCategories: {
      radiateurs: {
        nom: 'Radiateurs',
        articles: [
          { id: 'rad-rayonnant', nom: 'Radiateur électrique panneau rayonnant', unite: 'u', prixMin: 150, prixMax: 350, prixDefaut: 250 },
          { id: 'rad-inertie-seche', nom: 'Radiateur électrique inertie sèche', unite: 'u', prixMin: 250, prixMax: 600, prixDefaut: 425 },
          { id: 'rad-inertie-fluide', nom: 'Radiateur électrique inertie fluide', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'ss-elec', nom: 'Sèche-serviettes électrique', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
          { id: 'ss-eau', nom: 'Sèche-serviettes eau chaude', unite: 'u', prixMin: 250, prixMax: 600, prixDefaut: 425 },
          { id: 'ss-mixte', nom: 'Sèche-serviettes mixte', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'rad-acier', nom: 'Radiateur eau chaude acier', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
          { id: 'rad-fonte', nom: 'Radiateur eau chaude fonte', unite: 'u', prixMin: 400, prixMax: 900, prixDefaut: 650 },
          { id: 'rad-alu', nom: 'Radiateur eau chaude alu', unite: 'u', prixMin: 200, prixMax: 450, prixDefaut: 325 },
          { id: 'depose-rad', nom: 'Dépose radiateur existant', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
        ]
      },
      chaudieres: {
        nom: 'Chaudières',
        articles: [
          { id: 'chaud-gaz-mur', nom: 'Chaudière gaz condensation murale', unite: 'u', prixMin: 2500, prixMax: 4500, prixDefaut: 3500 },
          { id: 'chaud-gaz-sol', nom: 'Chaudière gaz condensation au sol', unite: 'u', prixMin: 3500, prixMax: 6500, prixDefaut: 5000 },
          { id: 'chaud-fioul', nom: 'Chaudière fioul condensation', unite: 'u', prixMin: 4000, prixMax: 8000, prixDefaut: 6000 },
          { id: 'chaud-bois', nom: 'Chaudière bois bûches', unite: 'u', prixMin: 3000, prixMax: 6000, prixDefaut: 4500 },
          { id: 'chaud-granules', nom: 'Chaudière granulés (pellets)', unite: 'u', prixMin: 6000, prixMax: 12000, prixDefaut: 9000 },
          { id: 'depose-chaud', nom: 'Dépose ancienne chaudière', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
          { id: 'racc-gaz', nom: 'Raccordement gaz', unite: 'forfait', prixMin: 200, prixMax: 500, prixDefaut: 350 },
        ]
      },
      pac: {
        nom: 'Pompes à chaleur',
        articles: [
          { id: 'pac-mono', nom: 'PAC air/air monosplit', unite: 'u', prixMin: 1500, prixMax: 3000, prixDefaut: 2250 },
          { id: 'pac-multi-2', nom: 'PAC air/air multisplit (2 unités int.)', unite: 'u', prixMin: 3000, prixMax: 5500, prixDefaut: 4250 },
          { id: 'pac-multi-3', nom: 'PAC air/air multisplit (3 unités int.)', unite: 'u', prixMin: 4500, prixMax: 7500, prixDefaut: 6000 },
          { id: 'pac-multi-4', nom: 'PAC air/air multisplit (4+ unités int.)', unite: 'u', prixMin: 6000, prixMax: 10000, prixDefaut: 8000 },
          { id: 'pac-air-eau', nom: 'PAC air/eau (chauffage seul)', unite: 'u', prixMin: 6000, prixMax: 12000, prixDefaut: 9000 },
          { id: 'pac-air-eau-ecs', nom: 'PAC air/eau (chauffage + ECS)', unite: 'u', prixMin: 8000, prixMax: 15000, prixDefaut: 11500 },
          { id: 'pac-geo', nom: 'PAC géothermique', unite: 'u', prixMin: 15000, prixMax: 25000, prixDefaut: 20000 },
          { id: 'unite-int-supp', nom: 'Unité intérieure supplémentaire', unite: 'u', prixMin: 600, prixMax: 1200, prixDefaut: 900 },
        ]
      },
      poeles: {
        nom: 'Poêles / Inserts',
        articles: [
          { id: 'poele-bois', nom: 'Poêle à bois', unite: 'u', prixMin: 1500, prixMax: 4000, prixDefaut: 2750 },
          { id: 'poele-granules', nom: 'Poêle à granulés', unite: 'u', prixMin: 2500, prixMax: 5000, prixDefaut: 3750 },
          { id: 'poele-canal', nom: 'Poêle à granulés canalisable', unite: 'u', prixMin: 3500, prixMax: 6000, prixDefaut: 4750 },
          { id: 'insert-bois', nom: 'Insert cheminée bois', unite: 'u', prixMin: 1500, prixMax: 4000, prixDefaut: 2750 },
          { id: 'insert-granules', nom: 'Insert granulés', unite: 'u', prixMin: 3000, prixMax: 6000, prixDefaut: 4500 },
          { id: 'tubage-inox', nom: 'Tubage conduit inox', unite: 'ml', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'conduit-fumee', nom: 'Création conduit de fumée', unite: 'ml', prixMin: 100, prixMax: 250, prixDefaut: 175 },
          { id: 'hab-cheminee', nom: 'Habillage cheminée', unite: 'forfait', prixMin: 500, prixMax: 1500, prixDefaut: 1000 },
        ]
      },
      plancher: {
        nom: 'Plancher chauffant',
        articles: [
          { id: 'pc-eau', nom: 'Plancher chauffant eau (tuyaux + collecteur)', unite: 'm²', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'pc-elec', nom: 'Plancher chauffant électrique', unite: 'm²', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'pc-rafraich', nom: 'Plancher chauffant/rafraîchissant', unite: 'm²', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'chape-pc', nom: 'Chape pour plancher chauffant', unite: 'm²', prixMin: 20, prixMax: 35, prixDefaut: 28 },
        ]
      },
      regulation: {
        nom: 'Régulation / Entretien',
        articles: [
          { id: 'thermo-filaire', nom: 'Thermostat programmable filaire', unite: 'u', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'thermo-connecte', nom: 'Thermostat connecté / smart', unite: 'u', prixMin: 200, prixMax: 450, prixDefaut: 325 },
          { id: 'robinet-thermo', nom: 'Robinet thermostatique radiateur', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'desembouage', nom: 'Désembouage circuit chauffage', unite: 'forfait', prixMin: 300, prixMax: 600, prixDefaut: 450 },
          { id: 'circulateur', nom: 'Remplacement circulateur', unite: 'u', prixMin: 200, prixMax: 400, prixDefaut: 300 },
          { id: 'vase-expansion', nom: 'Remplacement vase d\'expansion', unite: 'u', prixMin: 100, prixMax: 250, prixDefaut: 175 },
          { id: 'entretien-chaud', nom: 'Entretien annuel chaudière gaz', unite: 'forfait', prixMin: 100, prixMax: 180, prixDefaut: 140 },
          { id: 'entretien-pac', nom: 'Entretien annuel PAC', unite: 'forfait', prixMin: 150, prixMax: 250, prixDefaut: 200 },
        ]
      },
    }
  },
};

export default ARTICLES_BTP_SUITE;
