// =============================================================================
// NOMENCLATURE BTP — Arborescence hierarchique des lots, corps d'etat et chapitres
// =============================================================================

export const NOMENCLATURE = [

  // ===========================================================================
  // LOT CN — Ouvrages communs TCE
  // ===========================================================================
  { id: 'LOT_CN', code: 'CN', nom: 'Ouvrages communs TCE', type: 'lot', parentId: null, icon: 'Briefcase', color: '#64748b', ordre: 0 },

  // Corps d'état
  { id: 'CORPS_CN_01', code: 'CN-01', nom: 'Installation chantier', type: 'corps', parentId: 'LOT_CN', icon: 'Briefcase', color: '#64748b', ordre: 1 },
  { id: 'CORPS_CN_02', code: 'CN-02', nom: 'Échafaudages', type: 'corps', parentId: 'LOT_CN', icon: 'Briefcase', color: '#64748b', ordre: 2 },
  { id: 'CORPS_CN_03', code: 'CN-03', nom: 'Protections / Sécurité', type: 'corps', parentId: 'LOT_CN', icon: 'Briefcase', color: '#64748b', ordre: 3 },

  // Chapitres — Installation chantier
  { id: 'CHAP_CN_01_01', code: 'CN-01-01', nom: 'Baraque / WC chantier', type: 'chapitre', parentId: 'CORPS_CN_01', icon: 'Briefcase', color: '#64748b', ordre: 1 },
  { id: 'CHAP_CN_01_02', code: 'CN-01-02', nom: 'Clôture / Signalisation', type: 'chapitre', parentId: 'CORPS_CN_01', icon: 'Briefcase', color: '#64748b', ordre: 2 },
  { id: 'CHAP_CN_01_03', code: 'CN-01-03', nom: 'Branchements provisoires', type: 'chapitre', parentId: 'CORPS_CN_01', icon: 'Briefcase', color: '#64748b', ordre: 3 },

  // Chapitres — Échafaudages
  { id: 'CHAP_CN_02_01', code: 'CN-02-01', nom: 'Échafaudage fixe', type: 'chapitre', parentId: 'CORPS_CN_02', icon: 'Briefcase', color: '#64748b', ordre: 1 },
  { id: 'CHAP_CN_02_02', code: 'CN-02-02', nom: 'Échafaudage roulant', type: 'chapitre', parentId: 'CORPS_CN_02', icon: 'Briefcase', color: '#64748b', ordre: 2 },
  { id: 'CHAP_CN_02_03', code: 'CN-02-03', nom: 'Plateformes élévatrices', type: 'chapitre', parentId: 'CORPS_CN_02', icon: 'Briefcase', color: '#64748b', ordre: 3 },

  // Chapitres — Protections / Sécurité
  { id: 'CHAP_CN_03_01', code: 'CN-03-01', nom: 'Bâchage', type: 'chapitre', parentId: 'CORPS_CN_03', icon: 'Briefcase', color: '#64748b', ordre: 1 },
  { id: 'CHAP_CN_03_02', code: 'CN-03-02', nom: 'Protection sols', type: 'chapitre', parentId: 'CORPS_CN_03', icon: 'Briefcase', color: '#64748b', ordre: 2 },
  { id: 'CHAP_CN_03_03', code: 'CN-03-03', nom: 'Nettoyage chantier', type: 'chapitre', parentId: 'CORPS_CN_03', icon: 'Briefcase', color: '#64748b', ordre: 3 },

  // ===========================================================================
  // LOT 01 — Gros Œuvre
  // ===========================================================================
  { id: 'LOT_01', code: '01', nom: 'Gros Œuvre', type: 'lot', parentId: null, icon: 'Building2', color: '#f97316', ordre: 1 },

  // Corps d'état
  { id: 'CORPS_01_01', code: '01-01', nom: 'Terrassement / Fondations', type: 'corps', parentId: 'LOT_01', icon: 'Building2', color: '#f97316', ordre: 1 },
  { id: 'CORPS_01_02', code: '01-02', nom: 'Élévation / Maçonnerie', type: 'corps', parentId: 'LOT_01', icon: 'Building2', color: '#f97316', ordre: 2 },
  { id: 'CORPS_01_03', code: '01-03', nom: 'Béton armé', type: 'corps', parentId: 'LOT_01', icon: 'Building2', color: '#f97316', ordre: 3 },
  { id: 'CORPS_01_04', code: '01-04', nom: 'Dallage / Chape', type: 'corps', parentId: 'LOT_01', icon: 'Building2', color: '#f97316', ordre: 4 },

  // Chapitres — Terrassement / Fondations
  { id: 'CHAP_01_01_01', code: '01-01-01', nom: 'Fouilles', type: 'chapitre', parentId: 'CORPS_01_01', icon: 'Building2', color: '#f97316', ordre: 1 },
  { id: 'CHAP_01_01_02', code: '01-01-02', nom: 'Remblaiement', type: 'chapitre', parentId: 'CORPS_01_01', icon: 'Building2', color: '#f97316', ordre: 2 },
  { id: 'CHAP_01_01_03', code: '01-01-03', nom: 'Évacuation terres', type: 'chapitre', parentId: 'CORPS_01_01', icon: 'Building2', color: '#f97316', ordre: 3 },

  // Chapitres — Élévation / Maçonnerie
  { id: 'CHAP_01_02_01', code: '01-02-01', nom: 'Parpaings / Blocs', type: 'chapitre', parentId: 'CORPS_01_02', icon: 'Building2', color: '#f97316', ordre: 1 },
  { id: 'CHAP_01_02_02', code: '01-02-02', nom: 'Briques', type: 'chapitre', parentId: 'CORPS_01_02', icon: 'Building2', color: '#f97316', ordre: 2 },
  { id: 'CHAP_01_02_03', code: '01-02-03', nom: 'Pierre', type: 'chapitre', parentId: 'CORPS_01_02', icon: 'Building2', color: '#f97316', ordre: 3 },

  // Chapitres — Béton armé
  { id: 'CHAP_01_03_01', code: '01-03-01', nom: 'Semelles / Longrines', type: 'chapitre', parentId: 'CORPS_01_03', icon: 'Building2', color: '#f97316', ordre: 1 },
  { id: 'CHAP_01_03_02', code: '01-03-02', nom: 'Poteaux / Poutres', type: 'chapitre', parentId: 'CORPS_01_03', icon: 'Building2', color: '#f97316', ordre: 2 },
  { id: 'CHAP_01_03_03', code: '01-03-03', nom: 'Dalles / Planchers', type: 'chapitre', parentId: 'CORPS_01_03', icon: 'Building2', color: '#f97316', ordre: 3 },

  // Chapitres — Dallage / Chape
  { id: 'CHAP_01_04_01', code: '01-04-01', nom: 'Dallage sur terre-plein', type: 'chapitre', parentId: 'CORPS_01_04', icon: 'Building2', color: '#f97316', ordre: 1 },
  { id: 'CHAP_01_04_02', code: '01-04-02', nom: 'Chapes', type: 'chapitre', parentId: 'CORPS_01_04', icon: 'Building2', color: '#f97316', ordre: 2 },
  { id: 'CHAP_01_04_03', code: '01-04-03', nom: 'Ragréage', type: 'chapitre', parentId: 'CORPS_01_04', icon: 'Building2', color: '#f97316', ordre: 3 },

  // ===========================================================================
  // LOT 02 — VRD
  // ===========================================================================
  { id: 'LOT_02', code: '02', nom: 'VRD', type: 'lot', parentId: null, icon: 'Route', color: '#84cc16', ordre: 2 },

  // Corps d'état
  { id: 'CORPS_02_01', code: '02-01', nom: 'Voirie', type: 'corps', parentId: 'LOT_02', icon: 'Route', color: '#84cc16', ordre: 1 },
  { id: 'CORPS_02_02', code: '02-02', nom: 'Réseaux enterrés', type: 'corps', parentId: 'LOT_02', icon: 'Route', color: '#84cc16', ordre: 2 },
  { id: 'CORPS_02_03', code: '02-03', nom: 'Espaces verts / Aménagement extérieur', type: 'corps', parentId: 'LOT_02', icon: 'Route', color: '#84cc16', ordre: 3 },

  // Chapitres — Voirie
  { id: 'CHAP_02_01_01', code: '02-01-01', nom: 'Terrassement VRD', type: 'chapitre', parentId: 'CORPS_02_01', icon: 'Route', color: '#84cc16', ordre: 1 },
  { id: 'CHAP_02_01_02', code: '02-01-02', nom: 'Empierrement / Grave', type: 'chapitre', parentId: 'CORPS_02_01', icon: 'Route', color: '#84cc16', ordre: 2 },
  { id: 'CHAP_02_01_03', code: '02-01-03', nom: 'Enrobé / Béton désactivé', type: 'chapitre', parentId: 'CORPS_02_01', icon: 'Route', color: '#84cc16', ordre: 3 },

  // Chapitres — Réseaux enterrés
  { id: 'CHAP_02_02_01', code: '02-02-01', nom: 'Assainissement EU / EP', type: 'chapitre', parentId: 'CORPS_02_02', icon: 'Route', color: '#84cc16', ordre: 1 },
  { id: 'CHAP_02_02_02', code: '02-02-02', nom: 'Adduction eau', type: 'chapitre', parentId: 'CORPS_02_02', icon: 'Route', color: '#84cc16', ordre: 2 },
  { id: 'CHAP_02_02_03', code: '02-02-03', nom: 'Gaines techniques', type: 'chapitre', parentId: 'CORPS_02_02', icon: 'Route', color: '#84cc16', ordre: 3 },

  // Chapitres — Espaces verts / Aménagement extérieur
  { id: 'CHAP_02_03_01', code: '02-03-01', nom: 'Engazonnement', type: 'chapitre', parentId: 'CORPS_02_03', icon: 'Route', color: '#84cc16', ordre: 1 },
  { id: 'CHAP_02_03_02', code: '02-03-02', nom: 'Plantations', type: 'chapitre', parentId: 'CORPS_02_03', icon: 'Route', color: '#84cc16', ordre: 2 },
  { id: 'CHAP_02_03_03', code: '02-03-03', nom: 'Clôtures extérieures', type: 'chapitre', parentId: 'CORPS_02_03', icon: 'Route', color: '#84cc16', ordre: 3 },

  // ===========================================================================
  // LOT 03 — Menuiserie Extérieure
  // ===========================================================================
  { id: 'LOT_03', code: '03', nom: 'Menuiserie Extérieure', type: 'lot', parentId: null, icon: 'DoorOpen', color: '#3b82f6', ordre: 3 },

  // Corps d'état
  { id: 'CORPS_03_01', code: '03-01', nom: 'Fenêtres', type: 'corps', parentId: 'LOT_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 1 },
  { id: 'CORPS_03_02', code: '03-02', nom: 'Portes extérieures', type: 'corps', parentId: 'LOT_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 2 },
  { id: 'CORPS_03_03', code: '03-03', nom: 'Stores / Fermetures', type: 'corps', parentId: 'LOT_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 3 },
  { id: 'CORPS_03_04', code: '03-04', nom: 'Vitrerie', type: 'corps', parentId: 'LOT_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 4 },

  // Chapitres — Fenêtres
  { id: 'CHAP_03_01_01', code: '03-01-01', nom: 'PVC', type: 'chapitre', parentId: 'CORPS_03_01', icon: 'DoorOpen', color: '#3b82f6', ordre: 1 },
  { id: 'CHAP_03_01_02', code: '03-01-02', nom: 'Aluminium', type: 'chapitre', parentId: 'CORPS_03_01', icon: 'DoorOpen', color: '#3b82f6', ordre: 2 },
  { id: 'CHAP_03_01_03', code: '03-01-03', nom: 'Bois', type: 'chapitre', parentId: 'CORPS_03_01', icon: 'DoorOpen', color: '#3b82f6', ordre: 3 },

  // Chapitres — Portes extérieures
  { id: 'CHAP_03_02_01', code: '03-02-01', nom: "Porte d'entrée", type: 'chapitre', parentId: 'CORPS_03_02', icon: 'DoorOpen', color: '#3b82f6', ordre: 1 },
  { id: 'CHAP_03_02_02', code: '03-02-02', nom: 'Porte de service', type: 'chapitre', parentId: 'CORPS_03_02', icon: 'DoorOpen', color: '#3b82f6', ordre: 2 },
  { id: 'CHAP_03_02_03', code: '03-02-03', nom: 'Porte de garage', type: 'chapitre', parentId: 'CORPS_03_02', icon: 'DoorOpen', color: '#3b82f6', ordre: 3 },

  // Chapitres — Stores / Fermetures
  { id: 'CHAP_03_03_01', code: '03-03-01', nom: 'Volets roulants', type: 'chapitre', parentId: 'CORPS_03_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 1 },
  { id: 'CHAP_03_03_02', code: '03-03-02', nom: 'Volets battants', type: 'chapitre', parentId: 'CORPS_03_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 2 },
  { id: 'CHAP_03_03_03', code: '03-03-03', nom: 'Stores banne', type: 'chapitre', parentId: 'CORPS_03_03', icon: 'DoorOpen', color: '#3b82f6', ordre: 3 },

  // Chapitres — Vitrerie
  { id: 'CHAP_03_04_01', code: '03-04-01', nom: 'Double / Triple vitrage', type: 'chapitre', parentId: 'CORPS_03_04', icon: 'DoorOpen', color: '#3b82f6', ordre: 1 },
  { id: 'CHAP_03_04_02', code: '03-04-02', nom: 'Vitrage sécurité', type: 'chapitre', parentId: 'CORPS_03_04', icon: 'DoorOpen', color: '#3b82f6', ordre: 2 },

  // ===========================================================================
  // LOT 04 — Métallerie
  // ===========================================================================
  { id: 'LOT_04', code: '04', nom: 'Métallerie', type: 'lot', parentId: null, icon: 'Wrench', color: '#64748b', ordre: 4 },

  // Corps d'état
  { id: 'CORPS_04_01', code: '04-01', nom: 'Serrurerie / Métallerie', type: 'corps', parentId: 'LOT_04', icon: 'Wrench', color: '#64748b', ordre: 1 },
  { id: 'CORPS_04_02', code: '04-02', nom: 'Charpente métallique', type: 'corps', parentId: 'LOT_04', icon: 'Wrench', color: '#64748b', ordre: 2 },

  // Chapitres — Serrurerie / Métallerie
  { id: 'CHAP_04_01_01', code: '04-01-01', nom: 'Garde-corps', type: 'chapitre', parentId: 'CORPS_04_01', icon: 'Wrench', color: '#64748b', ordre: 1 },
  { id: 'CHAP_04_01_02', code: '04-01-02', nom: 'Rampes / Mains courantes', type: 'chapitre', parentId: 'CORPS_04_01', icon: 'Wrench', color: '#64748b', ordre: 2 },
  { id: 'CHAP_04_01_03', code: '04-01-03', nom: 'Grilles / Portails', type: 'chapitre', parentId: 'CORPS_04_01', icon: 'Wrench', color: '#64748b', ordre: 3 },

  // Chapitres — Charpente métallique
  { id: 'CHAP_04_02_01', code: '04-02-01', nom: 'Structure acier', type: 'chapitre', parentId: 'CORPS_04_02', icon: 'Wrench', color: '#64748b', ordre: 1 },
  { id: 'CHAP_04_02_02', code: '04-02-02', nom: 'Bardage métallique', type: 'chapitre', parentId: 'CORPS_04_02', icon: 'Wrench', color: '#64748b', ordre: 2 },
  { id: 'CHAP_04_02_03', code: '04-02-03', nom: 'Couverture bac acier', type: 'chapitre', parentId: 'CORPS_04_02', icon: 'Wrench', color: '#64748b', ordre: 3 },

  // ===========================================================================
  // LOT 05 — Second Œuvre
  // ===========================================================================
  { id: 'LOT_05', code: '05', nom: 'Second Œuvre', type: 'lot', parentId: null, icon: 'LayoutGrid', color: '#a855f7', ordre: 5 },

  // Corps d'état
  { id: 'CORPS_05_01', code: '05-01', nom: 'Plâtrerie / Cloisons sèches', type: 'corps', parentId: 'LOT_05', icon: 'LayoutGrid', color: '#a855f7', ordre: 1 },
  { id: 'CORPS_05_02', code: '05-02', nom: 'Menuiserie intérieure', type: 'corps', parentId: 'LOT_05', icon: 'LayoutGrid', color: '#a855f7', ordre: 2 },
  { id: 'CORPS_05_03', code: '05-03', nom: 'Agencement', type: 'corps', parentId: 'LOT_05', icon: 'LayoutGrid', color: '#a855f7', ordre: 3 },

  // Chapitres — Plâtrerie / Cloisons sèches
  { id: 'CHAP_05_01_01', code: '05-01-01', nom: 'Cloisons placo', type: 'chapitre', parentId: 'CORPS_05_01', icon: 'LayoutGrid', color: '#a855f7', ordre: 1 },
  { id: 'CHAP_05_01_02', code: '05-01-02', nom: 'Doublages', type: 'chapitre', parentId: 'CORPS_05_01', icon: 'LayoutGrid', color: '#a855f7', ordre: 2 },
  { id: 'CHAP_05_01_03', code: '05-01-03', nom: 'Faux plafonds', type: 'chapitre', parentId: 'CORPS_05_01', icon: 'LayoutGrid', color: '#a855f7', ordre: 3 },

  // Chapitres — Menuiserie intérieure
  { id: 'CHAP_05_02_01', code: '05-02-01', nom: 'Portes intérieures', type: 'chapitre', parentId: 'CORPS_05_02', icon: 'LayoutGrid', color: '#a855f7', ordre: 1 },
  { id: 'CHAP_05_02_02', code: '05-02-02', nom: 'Placards / Rangements', type: 'chapitre', parentId: 'CORPS_05_02', icon: 'LayoutGrid', color: '#a855f7', ordre: 2 },
  { id: 'CHAP_05_02_03', code: '05-02-03', nom: 'Escaliers bois', type: 'chapitre', parentId: 'CORPS_05_02', icon: 'LayoutGrid', color: '#a855f7', ordre: 3 },

  // Chapitres — Agencement
  { id: 'CHAP_05_03_01', code: '05-03-01', nom: 'Cuisine', type: 'chapitre', parentId: 'CORPS_05_03', icon: 'LayoutGrid', color: '#a855f7', ordre: 1 },
  { id: 'CHAP_05_03_02', code: '05-03-02', nom: 'Dressing', type: 'chapitre', parentId: 'CORPS_05_03', icon: 'LayoutGrid', color: '#a855f7', ordre: 2 },
  { id: 'CHAP_05_03_03', code: '05-03-03', nom: 'Salle de bain (mobilier)', type: 'chapitre', parentId: 'CORPS_05_03', icon: 'LayoutGrid', color: '#a855f7', ordre: 3 },

  // ===========================================================================
  // LOT 06 — Peinture & Revêtements
  // ===========================================================================
  { id: 'LOT_06', code: '06', nom: 'Peinture & Revêtements', type: 'lot', parentId: null, icon: 'Paintbrush', color: '#ec4899', ordre: 6 },

  // Corps d'état
  { id: 'CORPS_06_01', code: '06-01', nom: 'Peinture intérieure', type: 'corps', parentId: 'LOT_06', icon: 'Paintbrush', color: '#ec4899', ordre: 1 },
  { id: 'CORPS_06_02', code: '06-02', nom: 'Carrelage / Faïence', type: 'corps', parentId: 'LOT_06', icon: 'Paintbrush', color: '#ec4899', ordre: 2 },
  { id: 'CORPS_06_03', code: '06-03', nom: 'Revêtements de sol', type: 'corps', parentId: 'LOT_06', icon: 'Paintbrush', color: '#ec4899', ordre: 3 },

  // Chapitres — Peinture intérieure
  { id: 'CHAP_06_01_01', code: '06-01-01', nom: 'Peinture murs / plafonds', type: 'chapitre', parentId: 'CORPS_06_01', icon: 'Paintbrush', color: '#ec4899', ordre: 1 },
  { id: 'CHAP_06_01_02', code: '06-01-02', nom: 'Peinture boiseries', type: 'chapitre', parentId: 'CORPS_06_01', icon: 'Paintbrush', color: '#ec4899', ordre: 2 },
  { id: 'CHAP_06_01_03', code: '06-01-03', nom: 'Enduits décoratifs', type: 'chapitre', parentId: 'CORPS_06_01', icon: 'Paintbrush', color: '#ec4899', ordre: 3 },

  // Chapitres — Carrelage / Faïence
  { id: 'CHAP_06_02_01', code: '06-02-01', nom: 'Carrelage sol', type: 'chapitre', parentId: 'CORPS_06_02', icon: 'Paintbrush', color: '#ec4899', ordre: 1 },
  { id: 'CHAP_06_02_02', code: '06-02-02', nom: 'Faïence murale', type: 'chapitre', parentId: 'CORPS_06_02', icon: 'Paintbrush', color: '#ec4899', ordre: 2 },
  { id: 'CHAP_06_02_03', code: '06-02-03', nom: 'Mosaïque', type: 'chapitre', parentId: 'CORPS_06_02', icon: 'Paintbrush', color: '#ec4899', ordre: 3 },

  // Chapitres — Revêtements de sol
  { id: 'CHAP_06_03_01', code: '06-03-01', nom: 'Parquet', type: 'chapitre', parentId: 'CORPS_06_03', icon: 'Paintbrush', color: '#ec4899', ordre: 1 },
  { id: 'CHAP_06_03_02', code: '06-03-02', nom: 'Sol souple / PVC', type: 'chapitre', parentId: 'CORPS_06_03', icon: 'Paintbrush', color: '#ec4899', ordre: 2 },
  { id: 'CHAP_06_03_03', code: '06-03-03', nom: 'Résine', type: 'chapitre', parentId: 'CORPS_06_03', icon: 'Paintbrush', color: '#ec4899', ordre: 3 },

  // ===========================================================================
  // LOT 07 — Charpente & Couverture
  // ===========================================================================
  { id: 'LOT_07', code: '07', nom: 'Charpente & Couverture', type: 'lot', parentId: null, icon: 'Home', color: '#6366f1', ordre: 7 },

  // Corps d'état
  { id: 'CORPS_07_01', code: '07-01', nom: 'Charpente bois', type: 'corps', parentId: 'LOT_07', icon: 'Home', color: '#6366f1', ordre: 1 },
  { id: 'CORPS_07_02', code: '07-02', nom: 'Couverture', type: 'corps', parentId: 'LOT_07', icon: 'Home', color: '#6366f1', ordre: 2 },
  { id: 'CORPS_07_03', code: '07-03', nom: 'Zinguerie', type: 'corps', parentId: 'LOT_07', icon: 'Home', color: '#6366f1', ordre: 3 },

  // Chapitres — Charpente bois
  { id: 'CHAP_07_01_01', code: '07-01-01', nom: 'Charpente traditionnelle', type: 'chapitre', parentId: 'CORPS_07_01', icon: 'Home', color: '#6366f1', ordre: 1 },
  { id: 'CHAP_07_01_02', code: '07-01-02', nom: 'Charpente fermette', type: 'chapitre', parentId: 'CORPS_07_01', icon: 'Home', color: '#6366f1', ordre: 2 },
  { id: 'CHAP_07_01_03', code: '07-01-03', nom: 'Charpente lamellé-collé', type: 'chapitre', parentId: 'CORPS_07_01', icon: 'Home', color: '#6366f1', ordre: 3 },

  // Chapitres — Couverture
  { id: 'CHAP_07_02_01', code: '07-02-01', nom: 'Tuiles terre cuite', type: 'chapitre', parentId: 'CORPS_07_02', icon: 'Home', color: '#6366f1', ordre: 1 },
  { id: 'CHAP_07_02_02', code: '07-02-02', nom: 'Ardoises', type: 'chapitre', parentId: 'CORPS_07_02', icon: 'Home', color: '#6366f1', ordre: 2 },
  { id: 'CHAP_07_02_03', code: '07-02-03', nom: 'Couverture zinc', type: 'chapitre', parentId: 'CORPS_07_02', icon: 'Home', color: '#6366f1', ordre: 3 },

  // Chapitres — Zinguerie
  { id: 'CHAP_07_03_01', code: '07-03-01', nom: 'Gouttières', type: 'chapitre', parentId: 'CORPS_07_03', icon: 'Home', color: '#6366f1', ordre: 1 },
  { id: 'CHAP_07_03_02', code: '07-03-02', nom: 'Descentes EP', type: 'chapitre', parentId: 'CORPS_07_03', icon: 'Home', color: '#6366f1', ordre: 2 },
  { id: 'CHAP_07_03_03', code: '07-03-03', nom: 'Solins / Abergements', type: 'chapitre', parentId: 'CORPS_07_03', icon: 'Home', color: '#6366f1', ordre: 3 },

  // ===========================================================================
  // LOT 08 — Plomberie CVC
  // ===========================================================================
  { id: 'LOT_08', code: '08', nom: 'Plomberie CVC', type: 'lot', parentId: null, icon: 'Droplets', color: '#0ea5e9', ordre: 8 },

  // Corps d'état
  { id: 'CORPS_08_01', code: '08-01', nom: 'Plomberie / Sanitaire', type: 'corps', parentId: 'LOT_08', icon: 'Droplets', color: '#0ea5e9', ordre: 1 },
  { id: 'CORPS_08_02', code: '08-02', nom: 'Chauffage', type: 'corps', parentId: 'LOT_08', icon: 'Droplets', color: '#0ea5e9', ordre: 2 },
  { id: 'CORPS_08_03', code: '08-03', nom: 'Ventilation / Climatisation', type: 'corps', parentId: 'LOT_08', icon: 'Droplets', color: '#0ea5e9', ordre: 3 },

  // Chapitres — Plomberie / Sanitaire
  { id: 'CHAP_08_01_01', code: '08-01-01', nom: 'Distribution eau', type: 'chapitre', parentId: 'CORPS_08_01', icon: 'Droplets', color: '#0ea5e9', ordre: 1 },
  { id: 'CHAP_08_01_02', code: '08-01-02', nom: 'Évacuation', type: 'chapitre', parentId: 'CORPS_08_01', icon: 'Droplets', color: '#0ea5e9', ordre: 2 },
  { id: 'CHAP_08_01_03', code: '08-01-03', nom: 'Appareils sanitaires', type: 'chapitre', parentId: 'CORPS_08_01', icon: 'Droplets', color: '#0ea5e9', ordre: 3 },
  { id: 'CHAP_08_01_04', code: '08-01-04', nom: 'Robinetterie', type: 'chapitre', parentId: 'CORPS_08_01', icon: 'Droplets', color: '#0ea5e9', ordre: 4 },

  // Chapitres — Chauffage
  { id: 'CHAP_08_02_01', code: '08-02-01', nom: 'Chaudières', type: 'chapitre', parentId: 'CORPS_08_02', icon: 'Droplets', color: '#0ea5e9', ordre: 1 },
  { id: 'CHAP_08_02_02', code: '08-02-02', nom: 'Radiateurs', type: 'chapitre', parentId: 'CORPS_08_02', icon: 'Droplets', color: '#0ea5e9', ordre: 2 },
  { id: 'CHAP_08_02_03', code: '08-02-03', nom: 'Plancher chauffant', type: 'chapitre', parentId: 'CORPS_08_02', icon: 'Droplets', color: '#0ea5e9', ordre: 3 },

  // Chapitres — Ventilation / Climatisation
  { id: 'CHAP_08_03_01', code: '08-03-01', nom: 'VMC simple / double flux', type: 'chapitre', parentId: 'CORPS_08_03', icon: 'Droplets', color: '#0ea5e9', ordre: 1 },
  { id: 'CHAP_08_03_02', code: '08-03-02', nom: 'Climatisation split', type: 'chapitre', parentId: 'CORPS_08_03', icon: 'Droplets', color: '#0ea5e9', ordre: 2 },
  { id: 'CHAP_08_03_03', code: '08-03-03', nom: 'Gainable', type: 'chapitre', parentId: 'CORPS_08_03', icon: 'Droplets', color: '#0ea5e9', ordre: 3 },

  // ===========================================================================
  // LOT 09 — Électricité
  // ===========================================================================
  { id: 'LOT_09', code: '09', nom: 'Électricité', type: 'lot', parentId: null, icon: 'Zap', color: '#eab308', ordre: 9 },

  // Corps d'état
  { id: 'CORPS_09_01', code: '09-01', nom: 'Courant fort', type: 'corps', parentId: 'LOT_09', icon: 'Zap', color: '#eab308', ordre: 1 },
  { id: 'CORPS_09_02', code: '09-02', nom: 'Courant faible', type: 'corps', parentId: 'LOT_09', icon: 'Zap', color: '#eab308', ordre: 2 },
  { id: 'CORPS_09_03', code: '09-03', nom: 'Domotique / IRVE', type: 'corps', parentId: 'LOT_09', icon: 'Zap', color: '#eab308', ordre: 3 },

  // Chapitres — Courant fort
  { id: 'CHAP_09_01_01', code: '09-01-01', nom: 'Tableau électrique', type: 'chapitre', parentId: 'CORPS_09_01', icon: 'Zap', color: '#eab308', ordre: 1 },
  { id: 'CHAP_09_01_02', code: '09-01-02', nom: 'Câblage / Appareillage', type: 'chapitre', parentId: 'CORPS_09_01', icon: 'Zap', color: '#eab308', ordre: 2 },
  { id: 'CHAP_09_01_03', code: '09-01-03', nom: 'Éclairage', type: 'chapitre', parentId: 'CORPS_09_01', icon: 'Zap', color: '#eab308', ordre: 3 },

  // Chapitres — Courant faible
  { id: 'CHAP_09_02_01', code: '09-02-01', nom: 'Réseau data / RJ45', type: 'chapitre', parentId: 'CORPS_09_02', icon: 'Zap', color: '#eab308', ordre: 1 },
  { id: 'CHAP_09_02_02', code: '09-02-02', nom: 'Téléphonie', type: 'chapitre', parentId: 'CORPS_09_02', icon: 'Zap', color: '#eab308', ordre: 2 },
  { id: 'CHAP_09_02_03', code: '09-02-03', nom: 'Sécurité / Alarme', type: 'chapitre', parentId: 'CORPS_09_02', icon: 'Zap', color: '#eab308', ordre: 3 },

  // Chapitres — Domotique / IRVE
  { id: 'CHAP_09_03_01', code: '09-03-01', nom: 'Installation domotique', type: 'chapitre', parentId: 'CORPS_09_03', icon: 'Zap', color: '#eab308', ordre: 1 },
  { id: 'CHAP_09_03_02', code: '09-03-02', nom: 'Bornes IRVE', type: 'chapitre', parentId: 'CORPS_09_03', icon: 'Zap', color: '#eab308', ordre: 2 },
  { id: 'CHAP_09_03_03', code: '09-03-03', nom: 'Éclairage LED connecté', type: 'chapitre', parentId: 'CORPS_09_03', icon: 'Zap', color: '#eab308', ordre: 3 },

  // ===========================================================================
  // LOT 61 — Désamiantage
  // ===========================================================================
  { id: 'LOT_61', code: '61', nom: 'Désamiantage', type: 'lot', parentId: null, icon: 'AlertTriangle', color: '#dc2626', ordre: 10 },

  // Corps d'état
  { id: 'CORPS_61_01', code: '61-01', nom: 'Diagnostic', type: 'corps', parentId: 'LOT_61', icon: 'AlertTriangle', color: '#dc2626', ordre: 1 },
  { id: 'CORPS_61_02', code: '61-02', nom: 'Retrait amiante', type: 'corps', parentId: 'LOT_61', icon: 'AlertTriangle', color: '#dc2626', ordre: 2 },
  { id: 'CORPS_61_03', code: '61-03', nom: 'Confinement', type: 'corps', parentId: 'LOT_61', icon: 'AlertTriangle', color: '#dc2626', ordre: 3 },

  // Chapitres — Diagnostic
  { id: 'CHAP_61_01_01', code: '61-01-01', nom: 'DTA', type: 'chapitre', parentId: 'CORPS_61_01', icon: 'AlertTriangle', color: '#dc2626', ordre: 1 },
  { id: 'CHAP_61_01_02', code: '61-01-02', nom: 'Repérage avant travaux', type: 'chapitre', parentId: 'CORPS_61_01', icon: 'AlertTriangle', color: '#dc2626', ordre: 2 },

  // Chapitres — Retrait amiante
  { id: 'CHAP_61_02_01', code: '61-02-01', nom: 'Retrait flocage', type: 'chapitre', parentId: 'CORPS_61_02', icon: 'AlertTriangle', color: '#dc2626', ordre: 1 },
  { id: 'CHAP_61_02_02', code: '61-02-02', nom: 'Retrait dalles vinyle', type: 'chapitre', parentId: 'CORPS_61_02', icon: 'AlertTriangle', color: '#dc2626', ordre: 2 },
  { id: 'CHAP_61_02_03', code: '61-02-03', nom: 'Retrait conduits fibro-ciment', type: 'chapitre', parentId: 'CORPS_61_02', icon: 'AlertTriangle', color: '#dc2626', ordre: 3 },

  // Chapitres — Confinement
  { id: 'CHAP_61_03_01', code: '61-03-01', nom: 'Zone de confinement', type: 'chapitre', parentId: 'CORPS_61_03', icon: 'AlertTriangle', color: '#dc2626', ordre: 1 },
  { id: 'CHAP_61_03_02', code: '61-03-02', nom: 'Traitement déchets', type: 'chapitre', parentId: 'CORPS_61_03', icon: 'AlertTriangle', color: '#dc2626', ordre: 2 },

  // ===========================================================================
  // LOT RE — Rénovation Énergétique
  // ===========================================================================
  { id: 'LOT_RE', code: 'RE', nom: 'Rénovation Énergétique', type: 'lot', parentId: null, icon: 'Leaf', color: '#22c55e', ordre: 11 },

  // Corps d'état
  { id: 'CORPS_RE_01', code: 'RE-01', nom: 'Isolation thermique extérieure (ITE)', type: 'corps', parentId: 'LOT_RE', icon: 'Leaf', color: '#22c55e', ordre: 1 },
  { id: 'CORPS_RE_02', code: 'RE-02', nom: 'Isolation thermique intérieure (ITI)', type: 'corps', parentId: 'LOT_RE', icon: 'Leaf', color: '#22c55e', ordre: 2 },
  { id: 'CORPS_RE_03', code: 'RE-03', nom: 'Systèmes énergétiques', type: 'corps', parentId: 'LOT_RE', icon: 'Leaf', color: '#22c55e', ordre: 3 },

  // Chapitres — ITE
  { id: 'CHAP_RE_01_01', code: 'RE-01-01', nom: 'ITE polystyrène', type: 'chapitre', parentId: 'CORPS_RE_01', icon: 'Leaf', color: '#22c55e', ordre: 1 },
  { id: 'CHAP_RE_01_02', code: 'RE-01-02', nom: 'ITE laine de roche', type: 'chapitre', parentId: 'CORPS_RE_01', icon: 'Leaf', color: '#22c55e', ordre: 2 },
  { id: 'CHAP_RE_01_03', code: 'RE-01-03', nom: 'ITE bardage ventilé', type: 'chapitre', parentId: 'CORPS_RE_01', icon: 'Leaf', color: '#22c55e', ordre: 3 },

  // Chapitres — ITI
  { id: 'CHAP_RE_02_01', code: 'RE-02-01', nom: 'Doublage isolant', type: 'chapitre', parentId: 'CORPS_RE_02', icon: 'Leaf', color: '#22c55e', ordre: 1 },
  { id: 'CHAP_RE_02_02', code: 'RE-02-02', nom: 'Isolation combles', type: 'chapitre', parentId: 'CORPS_RE_02', icon: 'Leaf', color: '#22c55e', ordre: 2 },
  { id: 'CHAP_RE_02_03', code: 'RE-02-03', nom: 'Isolation plancher bas', type: 'chapitre', parentId: 'CORPS_RE_02', icon: 'Leaf', color: '#22c55e', ordre: 3 },

  // Chapitres — Systèmes énergétiques
  { id: 'CHAP_RE_03_01', code: 'RE-03-01', nom: 'PAC air / eau', type: 'chapitre', parentId: 'CORPS_RE_03', icon: 'Leaf', color: '#22c55e', ordre: 1 },
  { id: 'CHAP_RE_03_02', code: 'RE-03-02', nom: 'PAC air / air', type: 'chapitre', parentId: 'CORPS_RE_03', icon: 'Leaf', color: '#22c55e', ordre: 2 },
  { id: 'CHAP_RE_03_03', code: 'RE-03-03', nom: 'Panneaux solaires', type: 'chapitre', parentId: 'CORPS_RE_03', icon: 'Leaf', color: '#22c55e', ordre: 3 },
  { id: 'CHAP_RE_03_04', code: 'RE-03-04', nom: 'VMC thermodynamique', type: 'chapitre', parentId: 'CORPS_RE_03', icon: 'Leaf', color: '#22c55e', ordre: 4 },
];

// =============================================================================
// Convenience exports
// =============================================================================

/** All top-level lots */
export const LOTS = NOMENCLATURE.filter(n => n.type === 'lot');

/**
 * Get direct children of a node, sorted by `ordre`.
 * @param {string} nodeId
 * @returns {Array}
 */
export function getChildren(nodeId) {
  return NOMENCLATURE.filter(n => n.parentId === nodeId).sort((a, b) => a.ordre - b.ordre);
}

/**
 * Find a node by its id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getNodeById(id) {
  return NOMENCLATURE.find(n => n.id === id);
}

/**
 * Get the full path from the root lot down to the given node (inclusive).
 * Returns an array ordered from lot -> corps -> chapitre.
 * @param {string} nodeId
 * @returns {Array}
 */
export function getPath(nodeId) {
  const path = [];
  let current = getNodeById(nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? getNodeById(current.parentId) : null;
  }
  return path;
}

/**
 * Get all descendants of a node recursively (children, grandchildren, etc.).
 * Does NOT include the node itself.
 * @param {string} nodeId
 * @returns {Array}
 */
export function getAllDescendants(nodeId) {
  const children = NOMENCLATURE.filter(n => n.parentId === nodeId);
  const descendants = [...children];
  for (const child of children) {
    descendants.push(...getAllDescendants(child.id));
  }
  return descendants;
}
