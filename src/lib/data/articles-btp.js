/**
 * Référentiel complet des articles BTP
 * Structure : Catégorie métier → Sous-catégorie → Articles avec variantes
 */

export const CATEGORIES_METIERS = [
  { id: 'plomberie', nom: 'Plomberie', icon: '🔧', color: '#3b82f6' },
  { id: 'electricite', nom: 'Électricité', icon: '⚡', color: '#eab308' },
  { id: 'maconnerie', nom: 'Maçonnerie', icon: '🧱', color: '#f97316' },
  { id: 'peinture', nom: 'Peinture', icon: '🎨', color: '#ec4899' },
  { id: 'menuiserie', nom: 'Menuiserie', icon: '🪵', color: '#a855f7' },
  { id: 'carrelage', nom: 'Carrelage', icon: '🔶', color: '#14b8a6' },
  { id: 'chauffage', nom: 'Chauffage / Clim', icon: '🔥', color: '#ef4444' },
  { id: 'couverture', nom: 'Couverture / Toiture', icon: '🏠', color: '#6366f1' },
  { id: 'isolation', nom: 'Isolation', icon: '🧊', color: '#06b6d4' },
  { id: 'terrassement', nom: 'Terrassement / VRD', icon: '🔨', color: '#84cc16' },
  { id: 'serrurerie', nom: 'Serrurerie', icon: '🔐', color: '#64748b' },
  { id: 'vitrerie', nom: 'Vitrerie', icon: '🪟', color: '#0ea5e9' },
  { id: 'paysagisme', nom: 'Paysagisme', icon: '🌿', color: '#22c55e' },
  { id: 'etancheite', nom: 'Étanchéité', icon: '🛡️', color: '#8b5cf6' },
  { id: 'demolition', nom: 'Démolition', icon: '🪓', color: '#dc2626' },
];

export const ARTICLES_BTP = {
  plomberie: {
    nom: 'Plomberie',
    sousCategories: {
      wc: {
        nom: 'Sanitaires — WC',
        articles: [
          { id: 'wc-poser', nom: 'WC à poser classique', unite: 'u', prixMin: 250, prixMax: 500, prixDefaut: 375 },
          { id: 'wc-suspendu', nom: 'WC suspendu (bâti-support inclus)', unite: 'u', prixMin: 650, prixMax: 1200, prixDefaut: 925 },
          { id: 'wc-broyeur', nom: 'WC broyeur', unite: 'u', prixMin: 400, prixMax: 800, prixDefaut: 600 },
          { id: 'abattant-japonais', nom: 'Abattant WC japonais / lavant', unite: 'u', prixMin: 300, prixMax: 800, prixDefaut: 550 },
          { id: 'depose-wc', nom: 'Dépose WC existant', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
        ]
      },
      lavabos: {
        nom: 'Sanitaires — Lavabos / Vasques',
        articles: [
          { id: 'lavabo-colonne', nom: 'Lavabo sur colonne', unite: 'u', prixMin: 200, prixMax: 450, prixDefaut: 325 },
          { id: 'vasque-poser', nom: 'Vasque à poser', unite: 'u', prixMin: 250, prixMax: 500, prixDefaut: 375 },
          { id: 'vasque-encastrer', nom: 'Vasque à encastrer', unite: 'u', prixMin: 200, prixMax: 450, prixDefaut: 325 },
          { id: 'meuble-vasque-simple', nom: 'Meuble vasque simple', unite: 'u', prixMin: 400, prixMax: 900, prixDefaut: 650 },
          { id: 'meuble-double-vasque', nom: 'Meuble double vasque', unite: 'u', prixMin: 700, prixMax: 1500, prixDefaut: 1100 },
          { id: 'lave-mains', nom: 'Lave-mains (WC)', unite: 'u', prixMin: 150, prixMax: 350, prixDefaut: 250 },
          { id: 'depose-lavabo', nom: 'Dépose lavabo/vasque existant', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
        ]
      },
      douche: {
        nom: 'Sanitaires — Douche',
        articles: [
          { id: 'receveur-extraplat', nom: 'Receveur de douche extra-plat', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'cabine-integrale', nom: 'Cabine de douche intégrale', unite: 'u', prixMin: 500, prixMax: 1200, prixDefaut: 850 },
          { id: 'paroi-fixe', nom: 'Paroi de douche fixe', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
          { id: 'paroi-coulissante', nom: 'Paroi de douche coulissante', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'colonne-classique', nom: 'Colonne de douche classique', unite: 'u', prixMin: 150, prixMax: 350, prixDefaut: 250 },
          { id: 'colonne-thermo', nom: 'Colonne de douche thermostatique', unite: 'u', prixMin: 250, prixMax: 500, prixDefaut: 375 },
          { id: 'caniveau-italienne', nom: 'Caniveau de douche italienne', unite: 'u', prixMin: 100, prixMax: 250, prixDefaut: 175 },
          { id: 'depose-douche', nom: 'Dépose douche existante', unite: 'u', prixMin: 50, prixMax: 120, prixDefaut: 85 },
        ]
      },
      baignoire: {
        nom: 'Sanitaires — Baignoire',
        articles: [
          { id: 'baignoire-acrylique', nom: 'Baignoire acrylique standard', unite: 'u', prixMin: 300, prixMax: 700, prixDefaut: 500 },
          { id: 'baignoire-balneo', nom: 'Baignoire balnéo', unite: 'u', prixMin: 1000, prixMax: 3000, prixDefaut: 2000 },
          { id: 'baignoire-ilot', nom: 'Baignoire îlot', unite: 'u', prixMin: 800, prixMax: 2500, prixDefaut: 1650 },
          { id: 'tablier-baignoire', nom: 'Tablier de baignoire', unite: 'u', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'depose-baignoire', nom: 'Dépose baignoire existante', unite: 'u', prixMin: 60, prixMax: 120, prixDefaut: 90 },
        ]
      },
      robinetterie: {
        nom: 'Robinetterie',
        articles: [
          { id: 'mitigeur-lavabo', nom: 'Mitigeur lavabo', unite: 'u', prixMin: 60, prixMax: 200, prixDefaut: 130 },
          { id: 'mitigeur-evier', nom: 'Mitigeur évier cuisine', unite: 'u', prixMin: 80, prixMax: 300, prixDefaut: 190 },
          { id: 'mitigeur-thermo-douche', nom: 'Mitigeur thermostatique douche', unite: 'u', prixMin: 150, prixMax: 400, prixDefaut: 275 },
          { id: 'mitigeur-thermo-bain', nom: 'Mitigeur thermostatique bain/douche', unite: 'u', prixMin: 180, prixMax: 450, prixDefaut: 315 },
          { id: 'robinet-encastre', nom: 'Robinet mural encastré', unite: 'u', prixMin: 120, prixMax: 350, prixDefaut: 235 },
          { id: 'douchette-evier', nom: 'Douchette évier cuisine', unite: 'u', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'depose-robinetterie', nom: 'Dépose robinetterie existante', unite: 'u', prixMin: 20, prixMax: 40, prixDefaut: 30 },
        ]
      },
      eauChaude: {
        nom: 'Production d\'eau chaude',
        articles: [
          { id: 'ce-elec-100l', nom: 'Chauffe-eau électrique 100L', unite: 'u', prixMin: 350, prixMax: 600, prixDefaut: 475 },
          { id: 'ce-elec-150l', nom: 'Chauffe-eau électrique 150L', unite: 'u', prixMin: 400, prixMax: 700, prixDefaut: 550 },
          { id: 'ce-elec-200l', nom: 'Chauffe-eau électrique 200L', unite: 'u', prixMin: 450, prixMax: 800, prixDefaut: 625 },
          { id: 'ce-elec-300l', nom: 'Chauffe-eau électrique 300L', unite: 'u', prixMin: 600, prixMax: 1000, prixDefaut: 800 },
          { id: 'ce-thermo', nom: 'Chauffe-eau thermodynamique', unite: 'u', prixMin: 2000, prixMax: 3500, prixDefaut: 2750 },
          { id: 'ce-gaz', nom: 'Chauffe-eau gaz instantané', unite: 'u', prixMin: 500, prixMax: 1000, prixDefaut: 750 },
          { id: 'ballon-solaire', nom: 'Ballon solaire (CESI)', unite: 'u', prixMin: 3000, prixMax: 5500, prixDefaut: 4250 },
          { id: 'groupe-secu', nom: 'Remplacement groupe de sécurité', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'detartrage', nom: 'Détartrage ballon', unite: 'u', prixMin: 120, prixMax: 200, prixDefaut: 160 },
          { id: 'depose-ce', nom: 'Dépose chauffe-eau existant', unite: 'u', prixMin: 50, prixMax: 100, prixDefaut: 75 },
        ]
      },
      alimentation: {
        nom: 'Alimentation / Réseaux',
        articles: [
          { id: 'alim-ef-per', nom: 'Alimentation eau froide PER', unite: 'ml', prixMin: 20, prixMax: 35, prixDefaut: 28 },
          { id: 'alim-ef-cuivre', nom: 'Alimentation eau froide cuivre', unite: 'ml', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'alim-ec-per', nom: 'Alimentation eau chaude PER', unite: 'ml', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'alim-ec-cuivre', nom: 'Alimentation eau chaude cuivre', unite: 'ml', prixMin: 30, prixMax: 55, prixDefaut: 43 },
          { id: 'point-eau', nom: 'Création point d\'eau complet', unite: 'u', prixMin: 300, prixMax: 600, prixDefaut: 450 },
          { id: 'vanne-arret', nom: 'Vanne d\'arrêt / robinet d\'arrêt', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'reducteur-pression', nom: 'Réducteur de pression', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'anti-belier', nom: 'Anti-bélier', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'disconnecteur', nom: 'Disconnecteur', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'collecteur', nom: 'Collecteur / nourrice', unite: 'u', prixMin: 60, prixMax: 150, prixDefaut: 105 },
        ]
      },
      evacuation: {
        nom: 'Évacuation',
        articles: [
          { id: 'evac-pvc-32', nom: 'Évacuation PVC Ø32', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'evac-pvc-40', nom: 'Évacuation PVC Ø40', unite: 'ml', prixMin: 20, prixMax: 35, prixDefaut: 28 },
          { id: 'evac-pvc-50', nom: 'Évacuation PVC Ø50', unite: 'ml', prixMin: 22, prixMax: 38, prixDefaut: 30 },
          { id: 'evac-pvc-100', nom: 'Évacuation PVC Ø100', unite: 'ml', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'siphon-sol', nom: 'Siphon de sol', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'colonne-ev', nom: 'Colonne d\'évacuation EU/EV', unite: 'ml', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'raccord-egout', nom: 'Raccordement tout-à-l\'égout', unite: 'forfait', prixMin: 500, prixMax: 1500, prixDefaut: 1000 },
        ]
      },
      electro: {
        nom: 'Raccordements électroménager',
        articles: [
          { id: 'racc-ll', nom: 'Raccordement machine à laver', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'racc-lv', nom: 'Raccordement lave-vaisselle', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'racc-frigo', nom: 'Raccordement réfrigérateur américain (eau)', unite: 'u', prixMin: 100, prixMax: 200, prixDefaut: 150 },
          { id: 'racc-adoucisseur', nom: 'Raccordement adoucisseur d\'eau', unite: 'u', prixMin: 150, prixMax: 300, prixDefaut: 225 },
        ]
      },
      depannage: {
        nom: 'Dépannage / Entretien',
        articles: [
          { id: 'recherche-fuite', nom: 'Recherche de fuite', unite: 'forfait', prixMin: 150, prixMax: 350, prixDefaut: 250 },
          { id: 'debouchage', nom: 'Débouchage canalisation', unite: 'forfait', prixMin: 100, prixMax: 250, prixDefaut: 175 },
          { id: 'curage-hp', nom: 'Curage haute pression', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'camera-inspection', nom: 'Passage caméra inspection', unite: 'forfait', prixMin: 150, prixMax: 300, prixDefaut: 225 },
          { id: 'repar-fuite', nom: 'Remplacement joint / réparation fuite', unite: 'u', prixMin: 50, prixMax: 120, prixDefaut: 85 },
          { id: 'remp-flexible', nom: 'Remplacement flexible', unite: 'u', prixMin: 20, prixMax: 50, prixDefaut: 35 },
        ]
      },
    }
  },

  electricite: {
    nom: 'Électricité',
    sousCategories: {
      prises: {
        nom: 'Prises',
        articles: [
          { id: 'prise-16a', nom: 'Prise 2P+T 16A', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'prise-etanche', nom: 'Prise 2P+T étanche IP44', unite: 'u', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'prise-20a', nom: 'Prise 20A spécialisée (LL, SL, LV, four)', unite: 'u', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'prise-32a', nom: 'Prise 32A (plaque de cuisson)', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'prise-rj45', nom: 'Prise RJ45 (réseau/téléphone)', unite: 'u', prixMin: 50, prixMax: 90, prixDefaut: 70 },
          { id: 'prise-tv', nom: 'Prise TV / coaxiale', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'prise-tv-sat', nom: 'Prise TV/SAT double', unite: 'u', prixMin: 50, prixMax: 90, prixDefaut: 70 },
          { id: 'prise-usb', nom: 'Prise USB murale', unite: 'u', prixMin: 50, prixMax: 90, prixDefaut: 70 },
          { id: 'prise-ext', nom: 'Prise extérieure étanche', unite: 'u', prixMin: 60, prixMax: 110, prixDefaut: 85 },
          { id: 'depose-prise', nom: 'Dépose prise existante', unite: 'u', prixMin: 10, prixMax: 25, prixDefaut: 18 },
        ]
      },
      eclairage: {
        nom: 'Éclairage / Points lumineux',
        articles: [
          { id: 'point-lum-simple', nom: 'Point lumineux simple (DCL)', unite: 'u', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'point-lum-vv', nom: 'Point lumineux va-et-vient', unite: 'u', prixMin: 80, prixMax: 140, prixDefaut: 110 },
          { id: 'point-lum-var', nom: 'Point lumineux + variateur', unite: 'u', prixMin: 100, prixMax: 170, prixDefaut: 135 },
          { id: 'spot-led', nom: 'Spot encastré LED (fourni + posé)', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'bandeau-led', nom: 'Bandeau LED (fourni + posé)', unite: 'ml', prixMin: 20, prixMax: 45, prixDefaut: 33 },
          { id: 'applique', nom: 'Applique murale (pose)', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'plafonnier', nom: 'Plafonnier (pose)', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'suspension', nom: 'Suspension (pose)', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'luminaire-ext', nom: 'Luminaire extérieur (pose)', unite: 'u', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'borne-ext', nom: 'Borne extérieure', unite: 'u', prixMin: 80, prixMax: 180, prixDefaut: 130 },
          { id: 'projecteur-ext', nom: 'Projecteur extérieur', unite: 'u', prixMin: 60, prixMax: 150, prixDefaut: 105 },
          { id: 'detecteur-mouv', nom: 'Détecteur de mouvement / présence', unite: 'u', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'minuterie', nom: 'Minuterie', unite: 'u', prixMin: 50, prixMax: 100, prixDefaut: 75 },
        ]
      },
      interrupteurs: {
        nom: 'Interrupteurs / Commandes',
        articles: [
          { id: 'inter-simple', nom: 'Interrupteur simple allumage', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'inter-double', nom: 'Interrupteur double allumage', unite: 'u', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'inter-vv', nom: 'Interrupteur va-et-vient', unite: 'u', prixMin: 40, prixMax: 70, prixDefaut: 55 },
          { id: 'bouton-telerupteur', nom: 'Bouton poussoir + télérupteur', unite: 'u', prixMin: 60, prixMax: 110, prixDefaut: 85 },
          { id: 'variateur', nom: 'Variateur', unite: 'u', prixMin: 50, prixMax: 100, prixDefaut: 75 },
          { id: 'inter-volet', nom: 'Interrupteur volet roulant', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'inter-connecte', nom: 'Interrupteur connecté / smart', unite: 'u', prixMin: 60, prixMax: 130, prixDefaut: 95 },
          { id: 'sortie-cable', nom: 'Sortie de câble (hotte, VMC, volets)', unite: 'u', prixMin: 30, prixMax: 60, prixDefaut: 45 },
        ]
      },
      tableau: {
        nom: 'Tableau électrique / Protection',
        articles: [
          { id: 'tableau-1r', nom: 'Tableau électrique 1 rangée (13 modules)', unite: 'u', prixMin: 250, prixMax: 450, prixDefaut: 350 },
          { id: 'tableau-2r', nom: 'Tableau électrique 2 rangées', unite: 'u', prixMin: 400, prixMax: 700, prixDefaut: 550 },
          { id: 'tableau-3r', nom: 'Tableau électrique 3 rangées', unite: 'u', prixMin: 500, prixMax: 900, prixDefaut: 700 },
          { id: 'tableau-4r', nom: 'Tableau électrique 4 rangées', unite: 'u', prixMin: 600, prixMax: 1200, prixDefaut: 900 },
          { id: 'disj-div', nom: 'Disjoncteur divisionnaire 10A/16A/20A', unite: 'u', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'disj-32a', nom: 'Disjoncteur 32A', unite: 'u', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'diff-ac', nom: 'Interrupteur différentiel 30mA type AC', unite: 'u', prixMin: 50, prixMax: 90, prixDefaut: 70 },
          { id: 'diff-a', nom: 'Interrupteur différentiel 30mA type A', unite: 'u', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'parafoudre', nom: 'Parafoudre', unite: 'u', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'delesteur', nom: 'Délesteur', unite: 'u', prixMin: 100, prixMax: 200, prixDefaut: 150 },
          { id: 'contacteur-jn', nom: 'Contacteur jour/nuit', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'horloge', nom: 'Horloge programmable', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
        ]
      },
      cablage: {
        nom: 'Câblage / Cheminement',
        articles: [
          { id: 'gaine-icta', nom: 'Passage de câble sous gaine ICTA', unite: 'ml', prixMin: 8, prixMax: 15, prixDefaut: 12 },
          { id: 'tirage-cable', nom: 'Tirage de câble en gaine existante', unite: 'ml', prixMin: 5, prixMax: 12, prixDefaut: 9 },
          { id: 'saignee-mur', nom: 'Saignée dans mur (rebouchage inclus)', unite: 'ml', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'moulure', nom: 'Pose moulure / goulotte', unite: 'ml', prixMin: 8, prixMax: 18, prixDefaut: 13 },
          { id: 'chemin-cables', nom: 'Pose chemin de câbles', unite: 'ml', prixMin: 20, prixMax: 40, prixDefaut: 30 },
        ]
      },
      normes: {
        nom: 'Mise aux normes / Sécurité',
        articles: [
          { id: 'normes-t1', nom: 'Mise en conformité NF C 15-100 (studio/T1)', unite: 'forfait', prixMin: 1500, prixMax: 3000, prixDefaut: 2250 },
          { id: 'normes-t2t3', nom: 'Mise en conformité NF C 15-100 (T2/T3)', unite: 'forfait', prixMin: 2500, prixMax: 5000, prixDefaut: 3750 },
          { id: 'normes-t4', nom: 'Mise en conformité NF C 15-100 (T4+)', unite: 'forfait', prixMin: 3500, prixMax: 7000, prixDefaut: 5250 },
          { id: 'terre', nom: 'Mise à la terre (piquet + câble)', unite: 'forfait', prixMin: 150, prixMax: 300, prixDefaut: 225 },
          { id: 'liaison-equi-sdb', nom: 'Liaison équipotentielle SDB', unite: 'forfait', prixMin: 80, prixMax: 150, prixDefaut: 115 },
          { id: 'consuel', nom: 'CONSUEL (passage)', unite: 'forfait', prixMin: 120, prixMax: 200, prixDefaut: 160 },
          { id: 'diagnostic-elec', nom: 'Diagnostic électrique', unite: 'forfait', prixMin: 100, prixMax: 200, prixDefaut: 150 },
        ]
      },
      vmc: {
        nom: 'Ventilation',
        articles: [
          { id: 'vmc-sf-auto', nom: 'VMC simple flux autoréglable', unite: 'forfait', prixMin: 400, prixMax: 700, prixDefaut: 550 },
          { id: 'vmc-sf-hygro', nom: 'VMC simple flux hygroréglable B', unite: 'forfait', prixMin: 600, prixMax: 1000, prixDefaut: 800 },
          { id: 'vmc-df', nom: 'VMC double flux', unite: 'forfait', prixMin: 2000, prixMax: 4000, prixDefaut: 3000 },
          { id: 'bouche-cuisine', nom: 'Bouche d\'extraction cuisine', unite: 'u', prixMin: 25, prixMax: 50, prixDefaut: 38 },
          { id: 'bouche-sdb', nom: 'Bouche d\'extraction SDB/WC', unite: 'u', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'entree-air', nom: 'Entrée d\'air fenêtre', unite: 'u', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'aerateur', nom: 'Aérateur individuel', unite: 'u', prixMin: 60, prixMax: 150, prixDefaut: 105 },
        ]
      },
      equipements: {
        nom: 'Équipements spéciaux',
        articles: [
          { id: 'interphone', nom: 'Interphone audio', unite: 'u', prixMin: 200, prixMax: 400, prixDefaut: 300 },
          { id: 'visiophone', nom: 'Visiophone', unite: 'u', prixMin: 350, prixMax: 800, prixDefaut: 575 },
          { id: 'sonnette', nom: 'Sonnette / carillon', unite: 'u', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'daaf', nom: 'Détecteur de fumée (DAAF)', unite: 'u', prixMin: 20, prixMax: 50, prixDefaut: 35 },
          { id: 'alarme', nom: 'Alarme intrusion (kit)', unite: 'forfait', prixMin: 500, prixMax: 1500, prixDefaut: 1000 },
          { id: 'borne-ve', nom: 'Borne de recharge véhicule électrique', unite: 'u', prixMin: 800, prixMax: 1500, prixDefaut: 1150 },
          { id: 'coffret-com', nom: 'Coffret de communication (grade 3)', unite: 'u', prixMin: 200, prixMax: 500, prixDefaut: 350 },
        ]
      },
    }
  },

  maconnerie: {
    nom: 'Maçonnerie',
    sousCategories: {
      demolition: {
        nom: 'Démolition / Dépose',
        articles: [
          { id: 'demo-cloison-legere', nom: 'Démolition cloison légère (placo)', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'demo-cloison-lourde', nom: 'Démolition cloison lourde (brique, parpaing)', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'demo-mur-porteur', nom: 'Démolition mur porteur (IPN inclus)', unite: 'forfait', prixMin: 2000, prixMax: 5000, prixDefaut: 3500 },
          { id: 'ouverture-ipn', nom: 'Ouverture dans mur porteur + pose IPN', unite: 'forfait', prixMin: 1500, prixMax: 4000, prixDefaut: 2750 },
          { id: 'demo-dalle', nom: 'Démolition dalle / chape', unite: 'm²', prixMin: 15, prixMax: 35, prixDefaut: 25 },
          { id: 'depose-sol', nom: 'Dépose revêtement sol', unite: 'm²', prixMin: 10, prixMax: 25, prixDefaut: 18 },
          { id: 'evac-gravats', nom: 'Évacuation gravats (benne)', unite: 'm³', prixMin: 40, prixMax: 80, prixDefaut: 60 },
        ]
      },
      murs: {
        nom: 'Gros œuvre — Murs',
        articles: [
          { id: 'mur-parpaing-15', nom: 'Mur parpaing 15 cm', unite: 'm²', prixMin: 45, prixMax: 70, prixDefaut: 58 },
          { id: 'mur-parpaing-20', nom: 'Mur parpaing 20 cm', unite: 'm²', prixMin: 50, prixMax: 80, prixDefaut: 65 },
          { id: 'mur-brique', nom: 'Mur brique', unite: 'm²', prixMin: 55, prixMax: 90, prixDefaut: 73 },
          { id: 'mur-beton-cell', nom: 'Mur béton cellulaire', unite: 'm²', prixMin: 45, prixMax: 75, prixDefaut: 60 },
          { id: 'mur-beton-banche', nom: 'Mur béton banché', unite: 'm²', prixMin: 80, prixMax: 130, prixDefaut: 105 },
          { id: 'mur-pierre', nom: 'Mur en pierre', unite: 'm²', prixMin: 100, prixMax: 200, prixDefaut: 150 },
          { id: 'pilier-beton', nom: 'Pilier / poteau béton', unite: 'u', prixMin: 150, prixMax: 400, prixDefaut: 275 },
        ]
      },
      dalles: {
        nom: 'Gros œuvre — Dalles / Chapes',
        articles: [
          { id: 'dalle-10-15', nom: 'Dalle béton armé (ép. 10–15 cm)', unite: 'm²', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'dalle-20', nom: 'Dalle béton armé (ép. 20 cm+)', unite: 'm²', prixMin: 60, prixMax: 110, prixDefaut: 85 },
          { id: 'chape-trad', nom: 'Chape traditionnelle (ép. 5–7 cm)', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'chape-liquide', nom: 'Chape liquide autonivelante', unite: 'm²', prixMin: 20, prixMax: 35, prixDefaut: 28 },
          { id: 'ragreage', nom: 'Ragréage sol', unite: 'm²', prixMin: 10, prixMax: 20, prixDefaut: 15 },
          { id: 'herisson', nom: 'Hérisson (tout-venant + film PE)', unite: 'm²', prixMin: 15, prixMax: 30, prixDefaut: 23 },
        ]
      },
      structure: {
        nom: 'Gros œuvre — Éléments structurels',
        articles: [
          { id: 'linteau', nom: 'Linteau béton armé', unite: 'ml', prixMin: 60, prixMax: 120, prixDefaut: 90 },
          { id: 'chainage-h', nom: 'Chaînage horizontal', unite: 'ml', prixMin: 25, prixMax: 50, prixDefaut: 38 },
          { id: 'chainage-v', nom: 'Chaînage vertical (raidisseur)', unite: 'ml', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'appui-fenetre', nom: 'Appui de fenêtre béton', unite: 'u', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'seuil-beton', nom: 'Seuil béton', unite: 'ml', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'escalier-beton', nom: 'Escalier béton coulé', unite: 'forfait', prixMin: 2000, prixMax: 5000, prixDefaut: 3500 },
          { id: 'coffrage', nom: 'Coffrage bois', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
          { id: 'ferraillage', nom: 'Ferraillage (treillis soudé)', unite: 'm²', prixMin: 8, prixMax: 15, prixDefaut: 12 },
        ]
      },
      platrerie: {
        nom: 'Plâtrerie / Cloisons sèches',
        articles: [
          { id: 'cloison-simple', nom: 'Cloison placo BA13 simple (72/48)', unite: 'm²', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'cloison-double', nom: 'Cloison placo BA13 double (98/48)', unite: 'm²', prixMin: 40, prixMax: 60, prixDefaut: 50 },
          { id: 'cloison-hydro', nom: 'Cloison placo hydrofuge', unite: 'm²', prixMin: 35, prixMax: 55, prixDefaut: 45 },
          { id: 'cloison-phon', nom: 'Cloison placo phonique', unite: 'm²', prixMin: 40, prixMax: 65, prixDefaut: 53 },
          { id: 'cloison-cf', nom: 'Cloison placo coupe-feu', unite: 'm²', prixMin: 45, prixMax: 70, prixDefaut: 58 },
          { id: 'doublage-rail', nom: 'Doublage placo sur rail + isolant', unite: 'm²', prixMin: 40, prixMax: 65, prixDefaut: 53 },
          { id: 'doublage-colle', nom: 'Doublage placo collé (complexe isolant)', unite: 'm²', prixMin: 30, prixMax: 50, prixDefaut: 40 },
          { id: 'fp-placo', nom: 'Faux plafond placo sur ossature', unite: 'm²', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'fp-hydro', nom: 'Faux plafond placo hydro', unite: 'm²', prixMin: 40, prixMax: 65, prixDefaut: 53 },
          { id: 'fp-dalles', nom: 'Faux plafond dalles 60x60', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'bandes-joints', nom: 'Bandes et enduit joints placo', unite: 'm²', prixMin: 8, prixMax: 15, prixDefaut: 12 },
          { id: 'trappe', nom: 'Trappe de visite', unite: 'u', prixMin: 20, prixMax: 50, prixDefaut: 35 },
        ]
      },
      facade: {
        nom: 'Façade / Enduit',
        articles: [
          { id: 'enduit-mono', nom: 'Enduit monocouche (projeté)', unite: 'm²', prixMin: 25, prixMax: 45, prixDefaut: 35 },
          { id: 'enduit-trad', nom: 'Enduit traditionnel 3 couches', unite: 'm²', prixMin: 35, prixMax: 60, prixDefaut: 48 },
          { id: 'ravalement', nom: 'Ravalement façade (nettoyage + peinture)', unite: 'm²', prixMin: 30, prixMax: 60, prixDefaut: 45 },
          { id: 'rejointoiement', nom: 'Rejointoiement pierres apparentes', unite: 'm²', prixMin: 40, prixMax: 80, prixDefaut: 60 },
          { id: 'crepissage', nom: 'Crépissage', unite: 'm²', prixMin: 20, prixMax: 40, prixDefaut: 30 },
        ]
      },
      divers: {
        nom: 'Divers maçonnerie',
        articles: [
          { id: 'scellement', nom: 'Scellement chimique', unite: 'u', prixMin: 15, prixMax: 30, prixDefaut: 23 },
          { id: 'percement-petit', nom: 'Percement petit diamètre', unite: 'u', prixMin: 20, prixMax: 50, prixDefaut: 35 },
          { id: 'carottage', nom: 'Carottage béton (gros Ø)', unite: 'u', prixMin: 80, prixMax: 200, prixDefaut: 140 },
          { id: 'regard-beton', nom: 'Création regard béton', unite: 'u', prixMin: 150, prixMax: 300, prixDefaut: 225 },
          { id: 'reprise-so', nom: 'Reprise sous-œuvre', unite: 'ml', prixMin: 200, prixMax: 500, prixDefaut: 350 },
        ]
      },
    }
  },
};

// Fonction utilitaire pour obtenir tous les articles d'une catégorie
export function getArticlesByCategorie(categorieId) {
  const categorie = ARTICLES_BTP[categorieId];
  if (!categorie) return [];

  const articles = [];
  Object.entries(categorie.sousCategories).forEach(([sousCatId, sousCat]) => {
    sousCat.articles.forEach(article => {
      articles.push({
        ...article,
        categorieId,
        sousCategorieId: sousCatId,
        sousCategorieNom: sousCat.nom,
      });
    });
  });
  return articles;
}

// Fonction pour rechercher des articles
export function searchArticles(query, categorieId = null) {
  const results = [];
  const searchLower = query.toLowerCase();

  const categories = categorieId ? { [categorieId]: ARTICLES_BTP[categorieId] } : ARTICLES_BTP;

  Object.entries(categories).forEach(([catId, categorie]) => {
    if (!categorie) return;
    Object.entries(categorie.sousCategories).forEach(([sousCatId, sousCat]) => {
      sousCat.articles.forEach(article => {
        if (article.nom.toLowerCase().includes(searchLower)) {
          results.push({
            ...article,
            categorieId: catId,
            sousCategorieId: sousCatId,
            sousCategorieNom: sousCat.nom,
            categorieNom: categorie.nom,
          });
        }
      });
    });
  });

  return results;
}

export default ARTICLES_BTP;
