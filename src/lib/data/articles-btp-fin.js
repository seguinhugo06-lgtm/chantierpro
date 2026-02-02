/**
 * Suite du référentiel articles BTP - Partie 3
 * Couverture, Isolation, Terrassement, Serrurerie, Vitrerie, Paysagisme, Étanchéité, Démolition
 */

export const ARTICLES_BTP_FIN = {
  couverture: {
    nom: 'Couverture / Toiture',
    sousCategories: {
      depose: {
        nom: 'Dépose',
        articles: [
          { id: 'depose-tuiles', nom: 'Dépose couverture tuiles', unite: 'm²', prixMin: 10, prixMax: 25, prixDefaut: 18 },
          { id: 'depose-ardoise', nom: 'Dépose couverture ardoise', unite: 'm²', prixMin: 12, prixMax: 28, prixDefaut: 20 },
          { id: 'depose-gouttieres', nom: 'Dépose gouttières', unite: 'ml', prixMin: 5, prixMax: 12, prixDefaut: 9 },
        ]
      },
      couverture: {
        nom: 'Couverture',
        articles: [
          { id: 'tuiles-tc', nom: 'Tuiles terre cuite', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'tuiles-beton', nom: 'Tuiles béton', unite: 'm²', prixMin: 30, prixMax: 55, prixDefaut: 43 },
          { id: 'ardoise-nat', nom: 'Ardoise naturelle', unite: 'm²', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'ardoise-fibro', nom: 'Ardoise fibro-ciment', unite: 'm²', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'bac-acier-simple', nom: 'Bac acier simple peau', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'bac-acier-double', nom: 'Bac acier double peau isolé', unite: 'm²', prixMin: 45, prixMax: 80, prixDefaut: 63 },
          { id: 'zinc-debout', nom: 'Zinc joint debout', unite: 'm²', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'tole-ondulee', nom: 'Tôle ondulée', unite: 'm²', prixMin: 20, prixMax: 35, prixDefaut: 28 },
          { id: 'shingle', nom: 'Shingle / bardeaux bitumés', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'epdm-toit', nom: 'EPDM (toit plat)', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'membrane-pvc', nom: 'Membrane PVC (toit plat)', unite: 'm²', prixMin: 35, prixMax: 65, prixDefaut: 50 },
        ]
      },
      elements: {
        nom: 'Éléments de toiture',
        articles: [
          { id: 'faitiere', nom: 'Faîtière / faîtage', unite: 'ml', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'aretier', nom: 'Arêtier', unite: 'ml', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'rive', nom: 'Rive latérale', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'noue', nom: 'Noue (zinc / plomb)', unite: 'ml', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'solin', nom: 'Solin / abergement', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'chatiere', nom: 'Chatière / tuile de ventilation', unite: 'u', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'closoir', nom: 'Closoir de faîtage', unite: 'ml', prixMin: 8, prixMax: 15, prixDefaut: 12 },
          { id: 'ecran-hpv', nom: 'Écran sous-toiture HPV', unite: 'm²', prixMin: 5, prixMax: 12, prixDefaut: 9 },
        ]
      },
      charpente: {
        nom: 'Charpente',
        articles: [
          { id: 'charp-trad', nom: 'Charpente traditionnelle bois', unite: 'm²', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'charp-fermettes', nom: 'Charpente fermettes industrielles', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'remp-chevron', nom: 'Remplacement chevron', unite: 'ml', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'remp-panne', nom: 'Remplacement panne', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'trait-charp-inj', nom: 'Traitement charpente (injection)', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'trait-charp-pulv', nom: 'Traitement charpente (pulvérisation)', unite: 'm²', prixMin: 8, prixMax: 15, prixDefaut: 12 },
        ]
      },
      zinguerie: {
        nom: 'Zinguerie / Eaux pluviales',
        articles: [
          { id: 'gouttiere-zinc', nom: 'Gouttière zinc', unite: 'ml', prixMin: 30, prixMax: 55, prixDefaut: 43 },
          { id: 'gouttiere-alu', nom: 'Gouttière alu', unite: 'ml', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'gouttiere-pvc', nom: 'Gouttière PVC', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'desc-zinc', nom: 'Descente EP zinc', unite: 'ml', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'desc-pvc', nom: 'Descente EP PVC', unite: 'ml', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'naissance', nom: 'Naissance / moignon', unite: 'u', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'dauphin', nom: 'Dauphin / regard EP', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'planche-rive', nom: 'Planche de rive', unite: 'ml', prixMin: 15, prixMax: 35, prixDefaut: 25 },
        ]
      },
      entretien: {
        nom: 'Entretien toiture',
        articles: [
          { id: 'repar-fuite', nom: 'Réparation fuite (intervention)', unite: 'forfait', prixMin: 150, prixMax: 400, prixDefaut: 275 },
          { id: 'remp-tuiles', nom: 'Remplacement tuiles cassées', unite: 'u', prixMin: 8, prixMax: 20, prixDefaut: 14 },
          { id: 'demoussage', nom: 'Nettoyage / démoussage', unite: 'm²', prixMin: 8, prixMax: 18, prixDefaut: 13 },
          { id: 'hydrofuge', nom: 'Hydrofuge toiture', unite: 'm²', prixMin: 5, prixMax: 12, prixDefaut: 9 },
          { id: 'sortie-toit', nom: 'Sortie de toit (VMC, poêle)', unite: 'u', prixMin: 80, prixMax: 200, prixDefaut: 140 },
        ]
      },
    }
  },

  isolation: {
    nom: 'Isolation',
    sousCategories: {
      comblesPerdus: {
        nom: 'Combles perdus',
        articles: [
          { id: 'lv-soufflee', nom: 'Laine de verre soufflée R=7', unite: 'm²', prixMin: 20, prixMax: 35, prixDefaut: 28 },
          { id: 'lr-soufflee', nom: 'Laine de roche soufflée R=7', unite: 'm²', prixMin: 22, prixMax: 38, prixDefaut: 30 },
          { id: 'ouate-soufflee', nom: 'Ouate de cellulose soufflée', unite: 'm²', prixMin: 20, prixMax: 35, prixDefaut: 28 },
        ]
      },
      comblesAmenages: {
        nom: 'Combles aménagés / Rampants',
        articles: [
          { id: 'lv-rouleau', nom: 'Laine de verre rouleau R=6', unite: 'm²', prixMin: 25, prixMax: 40, prixDefaut: 33 },
          { id: 'lr-panneau', nom: 'Laine de roche panneau R=6', unite: 'm²', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'isolant-mince', nom: 'Isolant mince multicouche (complément)', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
        ]
      },
      iti: {
        nom: 'Isolation murs intérieurs (ITI)',
        articles: [
          { id: 'doublage-lv', nom: 'Doublage laine de verre + placo', unite: 'm²', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'doublage-lr', nom: 'Doublage laine de roche + placo', unite: 'm²', prixMin: 35, prixMax: 55, prixDefaut: 45 },
          { id: 'doublage-pse', nom: 'Doublage PSE collé', unite: 'm²', prixMin: 25, prixMax: 40, prixDefaut: 33 },
          { id: 'doublage-pu', nom: 'Doublage polyuréthane collé', unite: 'm²', prixMin: 35, prixMax: 55, prixDefaut: 45 },
          { id: 'doublage-bio', nom: 'Isolation chanvre / laine de bois + placo', unite: 'm²', prixMin: 40, prixMax: 65, prixDefaut: 53 },
          { id: 'doublage-liege', nom: 'Isolation liège (panneau)', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
        ]
      },
      ite: {
        nom: 'Isolation murs extérieurs (ITE)',
        articles: [
          { id: 'ite-pse', nom: 'ITE polystyrène expansé + enduit', unite: 'm²', prixMin: 80, prixMax: 140, prixDefaut: 110 },
          { id: 'ite-graphite', nom: 'ITE polystyrène graphité + enduit', unite: 'm²', prixMin: 90, prixMax: 150, prixDefaut: 120 },
          { id: 'ite-lr', nom: 'ITE laine de roche + enduit', unite: 'm²', prixMin: 100, prixMax: 170, prixDefaut: 135 },
          { id: 'ite-fibre', nom: 'ITE fibre de bois + enduit', unite: 'm²', prixMin: 120, prixMax: 200, prixDefaut: 160 },
          { id: 'ite-bardage-bois', nom: 'ITE sous bardage bois', unite: 'm²', prixMin: 120, prixMax: 200, prixDefaut: 160 },
          { id: 'ite-bardage-comp', nom: 'ITE sous bardage composite', unite: 'm²', prixMin: 130, prixMax: 220, prixDefaut: 175 },
        ]
      },
      sol: {
        nom: 'Isolation sol',
        articles: [
          { id: 'iso-sous-dalle', nom: 'Isolation sous dalle (PSE 80mm)', unite: 'm²', prixMin: 15, prixMax: 25, prixDefaut: 20 },
          { id: 'iso-sous-chape', nom: 'Isolation sous chape (PU 40mm)', unite: 'm²', prixMin: 18, prixMax: 30, prixDefaut: 24 },
          { id: 'iso-plafond-cave', nom: 'Isolation plafond de cave / garage', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
        ]
      },
      phonique: {
        nom: 'Isolation phonique',
        articles: [
          { id: 'sous-couche-acou', nom: 'Sous-couche acoustique sol', unite: 'm²', prixMin: 8, prixMax: 15, prixDefaut: 12 },
          { id: 'placo-phon', nom: 'Placo phonique (mur ou plafond)', unite: 'm²', prixMin: 15, prixMax: 28, prixDefaut: 22 },
          { id: 'iso-phon-cloison', nom: 'Isolation phonique cloison existante', unite: 'm²', prixMin: 30, prixMax: 55, prixDefaut: 43 },
          { id: 'fp-acoustique', nom: 'Faux plafond acoustique', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
        ]
      },
      accessoires: {
        nom: 'Accessoires isolation',
        articles: [
          { id: 'prep-combles', nom: 'Préparation combles (déblaiement)', unite: 'forfait', prixMin: 100, prixMax: 250, prixDefaut: 180 },
          { id: 'protection-spots', nom: 'Protection spots et VMC', unite: 'forfait', prixMin: 80, prixMax: 150, prixDefaut: 120 },
          { id: 'reperage-trappe', nom: 'Repérage trappe et circulation', unite: 'forfait', prixMin: 50, prixMax: 100, prixDefaut: 80 },
          { id: 'piges', nom: 'Piges de repérage', unite: 'm²', prixMin: 1, prixMax: 3, prixDefaut: 2 },
          { id: 'pare-vapeur', nom: 'Pare-vapeur', unite: 'm²', prixMin: 3, prixMax: 6, prixDefaut: 5 },
          { id: 'frein-vapeur', nom: 'Frein-vapeur', unite: 'm²', prixMin: 5, prixMax: 10, prixDefaut: 8 },
          { id: 'attestation', nom: 'Attestation fin de travaux', unite: 'forfait', prixMin: 30, prixMax: 50, prixDefaut: 50 },
        ]
      },
    }
  },

  terrassement: {
    nom: 'Terrassement / VRD',
    sousCategories: {
      terrassement: {
        nom: 'Terrassement',
        articles: [
          { id: 'decapage', nom: 'Décapage terre végétale', unite: 'm²', prixMin: 3, prixMax: 8, prixDefaut: 6 },
          { id: 'terrass-masse', nom: 'Terrassement pleine masse', unite: 'm³', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'terrass-fouilles', nom: 'Terrassement fouilles (fondations)', unite: 'm³', prixMin: 25, prixMax: 50, prixDefaut: 38 },
          { id: 'terrass-tranchee', nom: 'Terrassement tranchée', unite: 'ml', prixMin: 10, prixMax: 25, prixDefaut: 18 },
          { id: 'remblai', nom: 'Remblai', unite: 'm³', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'evac-terres', nom: 'Évacuation de terres', unite: 'm³', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'compactage', nom: 'Compactage', unite: 'm²', prixMin: 2, prixMax: 5, prixDefaut: 4 },
          { id: 'enrochement', nom: 'Enrochement', unite: 'm³', prixMin: 50, prixMax: 100, prixDefaut: 75 },
        ]
      },
      reseaux: {
        nom: 'Réseaux enterrés',
        articles: [
          { id: 'tranchee-elec', nom: 'Tranchée + gaine électrique TPC', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'tranchee-eau', nom: 'Tranchée + canalisation eau', unite: 'ml', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'tranchee-egout', nom: 'Tranchée + tout-à-l\'égout', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'tranchee-telecom', nom: 'Tranchée + gaine télécom', unite: 'ml', prixMin: 12, prixMax: 25, prixDefaut: 19 },
          { id: 'regard-visite', nom: 'Regard de visite béton', unite: 'u', prixMin: 150, prixMax: 350, prixDefaut: 250 },
          { id: 'regard-ep', nom: 'Regard eaux pluviales', unite: 'u', prixMin: 120, prixMax: 280, prixDefaut: 200 },
          { id: 'racc-collectif', nom: 'Raccordement réseau EU/EV collectif', unite: 'forfait', prixMin: 500, prixMax: 1500, prixDefaut: 1000 },
        ]
      },
      assainissement: {
        nom: 'Assainissement',
        articles: [
          { id: 'fosse-3000', nom: 'Fosse septique 3000L', unite: 'u', prixMin: 1500, prixMax: 3000, prixDefaut: 2250 },
          { id: 'fosse-5000', nom: 'Fosse septique 5000L', unite: 'u', prixMin: 2500, prixMax: 4500, prixDefaut: 3500 },
          { id: 'micro-station', nom: 'Micro-station d\'épuration', unite: 'u', prixMin: 5000, prixMax: 10000, prixDefaut: 7500 },
          { id: 'filtre-compact', nom: 'Filtre compact', unite: 'u', prixMin: 6000, prixMax: 12000, prixDefaut: 9000 },
          { id: 'epandage', nom: 'Épandage (tranchées filtrantes)', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'bac-graisse', nom: 'Bac à graisse', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
        ]
      },
      voirie: {
        nom: 'Voirie / Revêtements extérieurs',
        articles: [
          { id: 'fond-tv', nom: 'Fondation tout-venant (ép. 20 cm)', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'gravillonnage', nom: 'Gravillonnage', unite: 'm²', prixMin: 5, prixMax: 12, prixDefaut: 9 },
          { id: 'enrobe-chaud', nom: 'Enrobé à chaud (ép. 5 cm)', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'enrobe-froid', nom: 'Enrobé à froid', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'beton-desactive', nom: 'Béton désactivé', unite: 'm²', prixMin: 50, prixMax: 90, prixDefaut: 70 },
          { id: 'beton-balaye', nom: 'Béton balayé', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'beton-imprime', nom: 'Béton imprimé', unite: 'm²', prixMin: 60, prixMax: 110, prixDefaut: 85 },
          { id: 'paves', nom: 'Pavés autobloquants', unite: 'm²', prixMin: 30, prixMax: 55, prixDefaut: 43 },
          { id: 'dalles-ext', nom: 'Dalles béton extérieur', unite: 'm²', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'bordures', nom: 'Bordures béton', unite: 'ml', prixMin: 15, prixMax: 25, prixDefaut: 20 },
          { id: 'caniveau-grille', nom: 'Caniveau + grille', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
        ]
      },
      clotures: {
        nom: 'Clôtures / Portails',
        articles: [
          { id: 'cloture-souple', nom: 'Clôture grillage souple', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'cloture-rigide', nom: 'Clôture grillage rigide (panneau)', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'cloture-alu', nom: 'Clôture alu / composite', unite: 'ml', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'cloture-bois', nom: 'Clôture bois', unite: 'ml', prixMin: 40, prixMax: 90, prixDefaut: 65 },
          { id: 'mur-cloture', nom: 'Mur de clôture parpaing', unite: 'ml', prixMin: 100, prixMax: 250, prixDefaut: 175 },
          { id: 'pilier-portail', nom: 'Pilier de portail béton', unite: 'u', prixMin: 100, prixMax: 250, prixDefaut: 175 },
          { id: 'portail-battant', nom: 'Portail battant (alu/acier)', unite: 'u', prixMin: 500, prixMax: 2000, prixDefaut: 1250 },
          { id: 'portail-coulissant', nom: 'Portail coulissant', unite: 'u', prixMin: 800, prixMax: 2500, prixDefaut: 1650 },
          { id: 'motor-portail', nom: 'Motorisation portail', unite: 'u', prixMin: 400, prixMax: 1000, prixDefaut: 700 },
          { id: 'portillon', nom: 'Portillon piéton', unite: 'u', prixMin: 200, prixMax: 600, prixDefaut: 400 },
        ]
      },
    }
  },

  serrurerie: {
    nom: 'Serrurerie',
    sousCategories: {
      serrures: {
        nom: 'Serrures',
        articles: [
          { id: 'serrure-3pts', nom: 'Remplacement serrure 3 points', unite: 'u', prixMin: 150, prixMax: 350, prixDefaut: 250 },
          { id: 'serrure-5pts', nom: 'Remplacement serrure 5 points', unite: 'u', prixMin: 250, prixMax: 500, prixDefaut: 375 },
          { id: 'cylindre', nom: 'Remplacement cylindre', unite: 'u', prixMin: 60, prixMax: 150, prixDefaut: 105 },
          { id: 'blindage', nom: 'Blindage porte existante', unite: 'u', prixMin: 800, prixMax: 1800, prixDefaut: 1300 },
          { id: 'grille-defense', nom: 'Pose grille de défense', unite: 'u', prixMin: 150, prixMax: 400, prixDefaut: 275 },
          { id: 'ouverture-sans', nom: 'Ouverture de porte (sans casse)', unite: 'forfait', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'ouverture-avec', nom: 'Ouverture de porte (avec casse)', unite: 'forfait', prixMin: 150, prixMax: 400, prixDefaut: 275 },
        ]
      },
    }
  },

  vitrerie: {
    nom: 'Vitrerie',
    sousCategories: {
      vitrages: {
        nom: 'Vitrages',
        articles: [
          { id: 'simple-vitrage', nom: 'Remplacement simple vitrage', unite: 'm²', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'double-vitrage', nom: 'Remplacement double vitrage', unite: 'm²', prixMin: 80, prixMax: 180, prixDefaut: 130 },
          { id: 'survitrage', nom: 'Survitrage', unite: 'm²', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'feuillete', nom: 'Vitrage feuilleté sécurité', unite: 'm²', prixMin: 100, prixMax: 200, prixDefaut: 150 },
          { id: 'miroir', nom: 'Miroir sur mesure (pose)', unite: 'm²', prixMin: 60, prixMax: 150, prixDefaut: 105 },
          { id: 'credence-verre-mesure', nom: 'Crédence verre sur mesure', unite: 'ml', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'garde-corps-vitre', nom: 'Garde-corps vitré', unite: 'ml', prixMin: 200, prixMax: 500, prixDefaut: 350 },
        ]
      },
    }
  },

  paysagisme: {
    nom: 'Paysagisme',
    sousCategories: {
      espaces: {
        nom: 'Espaces verts',
        articles: [
          { id: 'gazon-semis', nom: 'Gazon semis', unite: 'm²', prixMin: 5, prixMax: 12, prixDefaut: 9 },
          { id: 'gazon-rouleau', nom: 'Gazon en rouleau', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'gazon-synth', nom: 'Gazon synthétique', unite: 'm²', prixMin: 25, prixMax: 50, prixDefaut: 38 },
          { id: 'plantation-arbuste', nom: 'Plantation arbuste', unite: 'u', prixMin: 30, prixMax: 80, prixDefaut: 55 },
          { id: 'plantation-arbre', nom: 'Plantation arbre', unite: 'u', prixMin: 80, prixMax: 250, prixDefaut: 165 },
          { id: 'plantation-haie', nom: 'Plantation haie', unite: 'ml', prixMin: 20, prixMax: 50, prixDefaut: 35 },
          { id: 'massif', nom: 'Massif floral', unite: 'm²', prixMin: 30, prixMax: 70, prixDefaut: 50 },
          { id: 'paillage', nom: 'Paillage', unite: 'm²', prixMin: 8, prixMax: 18, prixDefaut: 13 },
          { id: 'geotextile', nom: 'Géotextile', unite: 'm²', prixMin: 2, prixMax: 5, prixDefaut: 4 },
        ]
      },
      amenagements: {
        nom: 'Aménagements extérieurs',
        articles: [
          { id: 'terrasse-bois-pays', nom: 'Terrasse bois', unite: 'm²', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'terrasse-composite', nom: 'Terrasse composite', unite: 'm²', prixMin: 70, prixMax: 140, prixDefaut: 105 },
          { id: 'terrasse-plots', nom: 'Terrasse dalles sur plots', unite: 'm²', prixMin: 45, prixMax: 80, prixDefaut: 63 },
          { id: 'muret-soutien', nom: 'Muret de soutènement', unite: 'ml', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'escalier-ext', nom: 'Escalier extérieur', unite: 'forfait', prixMin: 500, prixMax: 2000, prixDefaut: 1250 },
          { id: 'eclairage-ext', nom: 'Éclairage extérieur (borne, spot)', unite: 'u', prixMin: 60, prixMax: 200, prixDefaut: 130 },
          { id: 'arrosage-auto', nom: 'Arrosage automatique (zone)', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
        ]
      },
    }
  },

  etancheite: {
    nom: 'Étanchéité',
    sousCategories: {
      toiture: {
        nom: 'Toiture terrasse',
        articles: [
          { id: 'membrane-bitu', nom: 'Membrane bitumineuse (terrasse)', unite: 'm²', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'membrane-resine', nom: 'Membrane résine (terrasse)', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'epdm-terrasse', nom: 'EPDM toit-terrasse', unite: 'm²', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'etancheite-carrelage', nom: 'Étanchéité sous carrelage (SPEC)', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
        ]
      },
      sousSol: {
        nom: 'Sous-sol / Cave',
        articles: [
          { id: 'cuvelage', nom: 'Cuvelage cave / sous-sol', unite: 'm²', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'injection-resine', nom: 'Injection résine (remontées capillaires)', unite: 'ml', prixMin: 80, prixMax: 180, prixDefaut: 130 },
          { id: 'drainage-periph', nom: 'Drainage périphérique', unite: 'ml', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'delta-ms', nom: 'Membrane Delta-MS', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'joint-dilatation', nom: 'Joint de dilatation (traitement)', unite: 'ml', prixMin: 15, prixMax: 35, prixDefaut: 25 },
        ]
      },
    }
  },

  demolition: {
    nom: 'Démolition',
    sousCategories: {
      travaux: {
        nom: 'Travaux de démolition',
        articles: [
          { id: 'demo-cloison-leg', nom: 'Démolition cloison légère', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'demo-cloison-lourd', nom: 'Démolition cloison lourde', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'demo-mur-port', nom: 'Démolition mur porteur', unite: 'forfait', prixMin: 2000, prixMax: 5000, prixDefaut: 3500 },
          { id: 'demo-dalle-chape', nom: 'Démolition dalle / chape', unite: 'm²', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'depose-sol-demo', nom: 'Dépose revêtement sol', unite: 'm²', prixMin: 10, prixMax: 25, prixDefaut: 18 },
          { id: 'depose-fp', nom: 'Dépose faux plafond', unite: 'm²', prixMin: 8, prixMax: 18, prixDefaut: 13 },
          { id: 'depose-menuiseries', nom: 'Dépose menuiseries', unite: 'u', prixMin: 30, prixMax: 80, prixDefaut: 55 },
          { id: 'depose-sanitaires', nom: 'Dépose sanitaires', unite: 'u', prixMin: 30, prixMax: 80, prixDefaut: 55 },
          { id: 'curage', nom: 'Curage intérieur complet (pièce)', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'evac-benne', nom: 'Évacuation gravats (benne 8m³)', unite: 'u', prixMin: 300, prixMax: 600, prixDefaut: 450 },
          { id: 'evac-bigbag', nom: 'Évacuation gravats (big bag 1m³)', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
        ]
      },
    }
  },
};

export default ARTICLES_BTP_FIN;
