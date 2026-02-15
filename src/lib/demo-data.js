/**
 * Demo data for ChantierPro
 * Comprehensive seed data for testing ALL modules
 * Use: import { DEMO_DATA } from './lib/demo-data'
 *
 * Updated: February 2026 - Realistic BTP data
 * Covers: clients, equipe, chantiers, catalogue (with stock), devis/factures (mixed TVA rates),
 *         depenses (varied categories), pointages, paiements, echanges, ajustements,
 *         events, previsions, fournisseurs, mouvements, packs
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTS (10)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_CLIENTS = [
  { id: 'c1', nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@email.fr', telephone: '06 12 34 56 78', adresse: '12 rue des Lilas, 75011 Paris', entreprise: '' },
  { id: 'c2', nom: 'Martin', prenom: 'Jean', email: 'j.martin@gmail.com', telephone: '06 98 76 54 32', adresse: '45 avenue Victor Hugo, 69006 Lyon', entreprise: 'SCI Martin' },
  { id: 'c3', nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@outlook.fr', telephone: '07 11 22 33 44', adresse: '8 place de la République, 33000 Bordeaux', entreprise: '' },
  { id: 'c4', nom: 'Petit', prenom: 'Luc', email: 'luc.petit@entreprise.com', telephone: '06 55 44 33 22', adresse: '23 boulevard Gambetta, 13001 Marseille', entreprise: 'Petit & Fils' },
  { id: 'c5', nom: 'Rousseau', prenom: 'Claire', email: 'claire.rousseau@mail.fr', telephone: '06 77 88 99 00', adresse: '56 rue Nationale, 44000 Nantes', entreprise: '' },
  { id: 'c6', nom: 'Lefevre', prenom: 'Marc', email: 'marc.lefevre@pro.fr', telephone: '06 44 55 66 77', adresse: '7 allée des Roses, 31000 Toulouse', entreprise: 'Lefevre Immobilier' },
  { id: 'c7', nom: 'Garcia', prenom: 'Elena', email: 'elena.garcia@gmail.com', telephone: '07 22 33 44 55', adresse: '120 cours Mirabeau, 13100 Aix-en-Provence', entreprise: '' },
  { id: 'c8', nom: 'Dubois', prenom: 'Philippe', email: 'p.dubois@orange.fr', telephone: '06 88 99 00 11', adresse: '3 place du Marché, 67000 Strasbourg', entreprise: 'SCI Dubois' },
  { id: 'c9', nom: 'Moreau', prenom: 'Isabelle', email: 'isabelle.moreau@wanadoo.fr', telephone: '06 33 22 11 00', adresse: '18 rue du Faubourg, 69003 Lyon', entreprise: '' },
  { id: 'c10', nom: 'Lambert', prenom: 'Nicolas', email: 'n.lambert@pro-habitat.fr', telephone: '06 11 00 99 88', adresse: '42 chemin des Vignes, 34000 Montpellier', entreprise: 'Pro Habitat SARL' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPE (6)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_EQUIPE = [
  { id: 'e1', nom: 'Moreau', prenom: 'Pierre', role: 'Chef de chantier', telephone: '06 11 11 11 11', email: 'p.moreau@chantier.fr', tauxHoraire: 45, coutHoraireCharge: 28, contrat: 'CDI' },
  { id: 'e2', nom: 'Leroy', prenom: 'Thomas', role: 'Ouvrier qualifié', telephone: '06 22 22 22 22', email: 't.leroy@chantier.fr', tauxHoraire: 35, coutHoraireCharge: 22, contrat: 'CDI' },
  { id: 'e3', nom: 'Garcia', prenom: 'Antoine', role: 'Apprenti', telephone: '06 33 33 33 33', email: 'a.garcia@chantier.fr', tauxHoraire: 20, coutHoraireCharge: 12, contrat: 'Apprentissage' },
  { id: 'e4', nom: 'Benoit', prenom: 'Lucas', role: 'Électricien', telephone: '06 44 44 44 44', email: 'l.benoit@chantier.fr', tauxHoraire: 40, coutHoraireCharge: 25, contrat: 'CDI' },
  { id: 'e5', nom: 'Fontaine', prenom: 'Julie', role: 'Plombier', telephone: '06 55 55 55 55', email: 'j.fontaine@chantier.fr', tauxHoraire: 38, coutHoraireCharge: 24, contrat: 'CDI' },
  { id: 'e6', nom: 'Roux', prenom: 'Maxime', role: 'Peintre', telephone: '06 66 66 66 66', email: 'm.roux@chantier.fr', tauxHoraire: 32, coutHoraireCharge: 20, contrat: 'CDD' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHANTIERS (10)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_CHANTIERS = [
  { id: 'ch1', nom: 'Rénovation cuisine Dupont', client_id: 'c1', adresse: '12 rue des Lilas, 75011 Paris', date_debut: '2026-01-10', date_fin: '2026-02-15', statut: 'en_cours', avancement: 65, notes: 'Cuisine complète avec îlot central', budget_estime: 3760 },
  { id: 'ch2', nom: 'Salle de bain Martin', client_id: 'c2', adresse: '45 avenue Victor Hugo, 69006 Lyon', date_debut: '2026-01-20', date_fin: '2026-02-28', statut: 'en_cours', avancement: 30, notes: 'SDB avec douche italienne', budget_estime: 4475 },
  { id: 'ch3', nom: 'Peinture appartement Bernard', client_id: 'c3', adresse: '8 place de la République, 33000 Bordeaux', date_debut: '2025-12-01', date_fin: '2025-12-20', statut: 'termine', avancement: 100, notes: 'T3, peinture complète', budget_estime: 2125 },
  { id: 'ch4', nom: 'Extension maison Petit', client_id: 'c4', adresse: '23 boulevard Gambetta, 13001 Marseille', date_debut: '2026-03-01', date_fin: '2026-06-30', statut: 'prospect', avancement: 0, notes: 'Extension 40m² + terrasse', budget_estime: 32600 },
  { id: 'ch5', nom: 'Rénovation studio Rousseau', client_id: 'c5', adresse: '56 rue Nationale, 44000 Nantes', date_debut: '2026-01-05', date_fin: '2026-01-25', statut: 'en_cours', avancement: 85, notes: 'Studio 25m² rénovation complète', budget_estime: 8500 },
  { id: 'ch6', nom: 'Aménagement bureau Lefevre', client_id: 'c6', adresse: '7 allée des Roses, 31000 Toulouse', date_debut: '2026-02-01', date_fin: '2026-02-20', statut: 'prospect', avancement: 0, notes: 'Bureau 45m² cloisons + électricité', budget_estime: 12000 },
  { id: 'ch7', nom: 'Terrasse Garcia', client_id: 'c7', adresse: '120 cours Mirabeau, 13100 Aix-en-Provence', date_debut: '2025-11-15', date_fin: '2025-12-10', statut: 'termine', avancement: 100, notes: 'Terrasse bois 30m²', budget_estime: 6800 },
  { id: 'ch8', nom: 'Rénovation appartement Dubois', client_id: 'c8', adresse: '3 place du Marché, 67000 Strasbourg', date_debut: '2026-01-15', date_fin: '2026-03-15', statut: 'en_cours', avancement: 45, notes: 'T4 rénovation complète plomberie électricité', budget_estime: 28000 },
  { id: 'ch9', nom: 'Isolation combles Moreau', client_id: 'c9', adresse: '18 rue du Faubourg, 69003 Lyon', date_debut: '2025-10-10', date_fin: '2025-11-05', statut: 'termine', avancement: 100, notes: 'Isolation laine de roche 120mm, 85m² sous toiture', budget_estime: 9200 },
  { id: 'ch10', nom: 'Ravalement façade Lambert', client_id: 'c10', adresse: '42 chemin des Vignes, 34000 Montpellier', date_debut: '2026-02-15', date_fin: '2026-04-15', statut: 'en_cours', avancement: 15, notes: 'Façade 180m², enduit projeté + peinture', budget_estime: 18500 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE (16 articles with stock & varied categories)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_CATALOGUE = [
  // Carrelage
  { id: 'cat1', nom: 'Carrelage grès cérame 60x60', prix: 45, prixAchat: 28, unite: 'm²', categorie: 'Carrelage', favori: true, stock: 48, stockMin: 20, stock_actuel: 48, stock_seuil_alerte: 20, reference: 'CAR-001', tva_rate: 20 },
  { id: 'cat2', nom: 'Faïence murale blanche 20x60', prix: 32, prixAchat: 16, unite: 'm²', categorie: 'Carrelage', favori: false, stock: 35, stockMin: 15, stock_actuel: 35, stock_seuil_alerte: 15, reference: 'CAR-002', tva_rate: 20 },
  // Peinture
  { id: 'cat3', nom: 'Peinture acrylique blanc mat', prix: 35, prixAchat: 18, unite: 'pot', categorie: 'Peinture', favori: true, stock: 12, stockMin: 10, stock_actuel: 12, stock_seuil_alerte: 10, reference: 'PEI-001', tva_rate: 20 },
  { id: 'cat4', nom: 'Sous-couche universelle', prix: 28, prixAchat: 14, unite: 'pot', categorie: 'Peinture', favori: false, stock: 8, stockMin: 5, stock_actuel: 8, stock_seuil_alerte: 5, reference: 'PEI-002', tva_rate: 20 },
  // Matériaux
  { id: 'cat5', nom: 'Placo BA13 standard', prix: 12, prixAchat: 6, unite: 'm²', categorie: 'Matériaux', favori: false, stock: 120, stockMin: 50, stock_actuel: 120, stock_seuil_alerte: 50, reference: 'MAT-001', tva_rate: 20 },
  { id: 'cat6', nom: 'Sac de ciment 35kg', prix: 12, prixAchat: 7, unite: 'sac', categorie: 'Maçonnerie', favori: false, stock: 25, stockMin: 10, stock_actuel: 25, stock_seuil_alerte: 10, reference: 'MAC-001', tva_rate: 20 },
  { id: 'cat7', nom: 'Laine de roche 120mm (rouleau)', prix: 18, prixAchat: 9, unite: 'm²', categorie: 'Isolation', favori: true, stock: 3, stockMin: 10, stock_actuel: 3, stock_seuil_alerte: 10, reference: 'ISO-001', tva_rate: 5.5 },
  // Électricité
  { id: 'cat8', nom: 'Câble électrique 2.5mm²', prix: 2.5, prixAchat: 1.2, unite: 'ml', categorie: 'Électricité', favori: false, stock: 250, stockMin: 100, stock_actuel: 250, stock_seuil_alerte: 100, reference: 'ELE-001', tva_rate: 20 },
  { id: 'cat9', nom: 'Prise NF 2P+T encastrable', prix: 8, prixAchat: 3.5, unite: 'pièce', categorie: 'Électricité', favori: true, stock: 45, stockMin: 20, stock_actuel: 45, stock_seuil_alerte: 20, reference: 'ELE-002', tva_rate: 20 },
  // Plomberie
  { id: 'cat10', nom: 'Tube PER 16mm', prix: 3, prixAchat: 1.5, unite: 'ml', categorie: 'Plomberie', favori: true, stock: 180, stockMin: 50, stock_actuel: 180, stock_seuil_alerte: 50, reference: 'PLO-001', tva_rate: 20 },
  { id: 'cat11', nom: 'Receveur douche 80x120 extra-plat', prix: 280, prixAchat: 145, unite: 'pièce', categorie: 'Plomberie', favori: true, stock: 2, stockMin: 1, stock_actuel: 2, stock_seuil_alerte: 1, reference: 'PLO-002', tva_rate: 20 },
  // Menuiserie
  { id: 'cat12', nom: 'Porte intérieure bloc-porte 83cm', prix: 185, prixAchat: 95, unite: 'pièce', categorie: 'Menuiserie', favori: false, stock: 6, stockMin: 3, stock_actuel: 6, stock_seuil_alerte: 3, reference: 'MEN-001', tva_rate: 20 },
  { id: 'cat13', nom: 'Lame terrasse composite', prix: 38, prixAchat: 22, unite: 'm²', categorie: 'Menuiserie', favori: false, stock: 0, stockMin: 10, stock_actuel: 0, stock_seuil_alerte: 10, reference: 'MEN-002', tva_rate: 20 },
  // Main d'oeuvre (pas de stock, pas de prixAchat)
  { id: 'cat14', nom: 'Main d\'œuvre pose carrelage', prix: 45, prixAchat: 0, unite: 'm²', categorie: 'Main d\'œuvre', favori: true, reference: 'MO-001', tva_rate: 20 },
  { id: 'cat15', nom: 'Main d\'œuvre peinture', prix: 25, prixAchat: 0, unite: 'm²', categorie: 'Main d\'œuvre', favori: true, reference: 'MO-002', tva_rate: 20 },
  { id: 'cat16', nom: 'Main d\'œuvre plomberie', prix: 55, prixAchat: 0, unite: 'h', categorie: 'Main d\'œuvre', favori: true, reference: 'MO-003', tva_rate: 20 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEVIS & FACTURES (15 — mixed TVA rates: 20%, 10%, 5.5%)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_DEVIS = [
  // ch1 - Cuisine Dupont — TVA 10% (rénovation)
  { id: 'd1', numero: 'DEV-2026-001', type: 'devis', client_id: 'c1', chantier_id: 'ch1', date: '2026-01-05', validite: 30, statut: 'accepte', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Dépose cuisine existante', quantite: 1, unite: 'forfait', prixUnitaire: 800, montant: 800 },
      { id: 'l2', description: 'Pose carrelage sol', quantite: 18, unite: 'm²', prixUnitaire: 45, montant: 810 },
      { id: 'l3', description: 'Plomberie cuisine', quantite: 1, unite: 'forfait', prixUnitaire: 1200, montant: 1200 },
      { id: 'l4', description: 'Électricité', quantite: 1, unite: 'forfait', prixUnitaire: 950, montant: 950 },
    ], total_ht: 3760, tva: 376, total_ttc: 4136 },

  // ch2 - SDB Martin — TVA 10%
  { id: 'd2', numero: 'DEV-2026-002', type: 'devis', client_id: 'c2', chantier_id: 'ch2', date: '2026-01-15', validite: 30, statut: 'accepte', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Dépose salle de bain', quantite: 1, unite: 'forfait', prixUnitaire: 600, montant: 600 },
      { id: 'l2', description: 'Pose douche italienne', quantite: 1, unite: 'forfait', prixUnitaire: 2500, montant: 2500 },
      { id: 'l3', description: 'Carrelage mural', quantite: 25, unite: 'm²', prixUnitaire: 55, montant: 1375 },
    ], total_ht: 4475, tva: 447.5, total_ttc: 4922.5 },

  // ch3 - Peinture Bernard — FAC payée TVA 10%
  { id: 'd3', numero: 'FAC-2025-015', type: 'facture', client_id: 'c3', chantier_id: 'ch3', date: '2025-12-20', statut: 'payee', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Peinture T3 complet', quantite: 85, unite: 'm²', prixUnitaire: 25, montant: 2125 },
    ], total_ht: 2125, tva: 212.5, total_ttc: 2337.5 },

  // ch4 - Extension Petit — DEV brouillon TVA 20% (neuf)
  { id: 'd4', numero: 'DEV-2026-003', type: 'devis', client_id: 'c4', chantier_id: 'ch4', date: '2026-01-25', validite: 60, statut: 'brouillon', tvaRate: 20,
    lignes: [
      { id: 'l1', description: 'Gros œuvre extension', quantite: 40, unite: 'm²', prixUnitaire: 450, montant: 18000 },
      { id: 'l2', description: 'Toiture', quantite: 45, unite: 'm²', prixUnitaire: 180, montant: 8100 },
      { id: 'l3', description: 'Menuiseries extérieures', quantite: 1, unite: 'forfait', prixUnitaire: 6500, montant: 6500 },
    ], total_ht: 32600, tva: 6520, total_ttc: 39120 },

  // ch5 - Studio Rousseau — DEV accepté TVA 10%
  { id: 'd5', numero: 'DEV-2026-004', type: 'devis', client_id: 'c5', chantier_id: 'ch5', date: '2026-01-02', validite: 30, statut: 'accepte', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Rénovation studio complète', quantite: 25, unite: 'm²', prixUnitaire: 280, montant: 7000 },
      { id: 'l2', description: 'Électricité', quantite: 1, unite: 'forfait', prixUnitaire: 1500, montant: 1500 },
    ], total_ht: 8500, tva: 850, total_ttc: 9350 },

  // ch6 - Bureau Lefevre — DEV envoyé TVA 20%
  { id: 'd6', numero: 'DEV-2026-005', type: 'devis', client_id: 'c6', chantier_id: 'ch6', date: '2026-01-20', validite: 45, statut: 'envoye', tvaRate: 20,
    lignes: [
      { id: 'l1', description: 'Cloisons bureau', quantite: 30, unite: 'm²', prixUnitaire: 180, montant: 5400 },
      { id: 'l2', description: 'Électricité complète', quantite: 1, unite: 'forfait', prixUnitaire: 4200, montant: 4200 },
      { id: 'l3', description: 'Climatisation', quantite: 2, unite: 'unité', prixUnitaire: 1200, montant: 2400 },
    ], total_ht: 12000, tva: 2400, total_ttc: 14400 },

  // ch7 - Terrasse Garcia — FAC payée TVA 10%
  { id: 'd7', numero: 'FAC-2025-012', type: 'facture', client_id: 'c7', chantier_id: 'ch7', date: '2025-12-10', statut: 'payee', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Terrasse bois composite', quantite: 30, unite: 'm²', prixUnitaire: 180, montant: 5400 },
      { id: 'l2', description: 'Structure porteuse', quantite: 1, unite: 'forfait', prixUnitaire: 1400, montant: 1400 },
    ], total_ht: 6800, tva: 680, total_ttc: 7480 },

  // ch8 - Appart Dubois — DEV accepté TVA 10%
  { id: 'd8', numero: 'DEV-2026-006', type: 'devis', client_id: 'c8', chantier_id: 'ch8', date: '2026-01-10', validite: 30, statut: 'accepte', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Rénovation plomberie complète', quantite: 1, unite: 'forfait', prixUnitaire: 8500, montant: 8500 },
      { id: 'l2', description: 'Réfection électrique', quantite: 1, unite: 'forfait', prixUnitaire: 9500, montant: 9500 },
      { id: 'l3', description: 'Peinture et finitions', quantite: 95, unite: 'm²', prixUnitaire: 65, montant: 6175 },
      { id: 'l4', description: 'Sols', quantite: 75, unite: 'm²', prixUnitaire: 51, montant: 3825 },
    ], total_ht: 28000, tva: 2800, total_ttc: 30800 },

  // ch5 - Acompte facture Rousseau — TVA 10%
  { id: 'd9', numero: 'FAC-2026-001', type: 'facture', client_id: 'c5', chantier_id: 'ch5', date: '2026-01-22', statut: 'envoye', tvaRate: 10, facture_type: 'acompte', devis_source_id: 'd5',
    lignes: [
      { id: 'l1', description: 'Acompte 40% - Rénovation studio', quantite: 1, unite: 'forfait', prixUnitaire: 3400, montant: 3400 },
    ], total_ht: 3400, tva: 340, total_ttc: 3740 },

  // ch9 - Isolation Moreau — FAC payée TVA 5.5% (rénovation énergétique)
  { id: 'd10', numero: 'FAC-2025-010', type: 'facture', client_id: 'c9', chantier_id: 'ch9', date: '2025-11-05', statut: 'payee', tvaRate: 5.5,
    lignes: [
      { id: 'l1', description: 'Fourniture laine de roche 120mm', quantite: 85, unite: 'm²', prixUnitaire: 18, montant: 1530 },
      { id: 'l2', description: 'Pose isolation sous toiture', quantite: 85, unite: 'm²', prixUnitaire: 42, montant: 3570 },
      { id: 'l3', description: 'Pare-vapeur + finitions', quantite: 85, unite: 'm²', prixUnitaire: 15, montant: 1275 },
      { id: 'l4', description: 'Trappe d\'accès isolée', quantite: 1, unite: 'forfait', prixUnitaire: 450, montant: 450 },
    ], total_ht: 6825, tva: 375.38, total_ttc: 7200.38 },

  // ch9 - DEV initial Moreau TVA 5.5%
  { id: 'd11', numero: 'DEV-2025-018', type: 'devis', client_id: 'c9', chantier_id: 'ch9', date: '2025-09-28', validite: 30, statut: 'accepte', tvaRate: 5.5,
    lignes: [
      { id: 'l1', description: 'Isolation combles perdus 85m²', quantite: 85, unite: 'm²', prixUnitaire: 75, montant: 6375 },
      { id: 'l2', description: 'Trappe d\'accès', quantite: 1, unite: 'forfait', prixUnitaire: 450, montant: 450 },
    ], total_ht: 6825, tva: 375.38, total_ttc: 7200.38 },

  // ch10 - Façade Lambert — DEV accepté TVA 10%
  { id: 'd12', numero: 'DEV-2026-007', type: 'devis', client_id: 'c10', chantier_id: 'ch10', date: '2026-02-01', validite: 30, statut: 'accepte', tvaRate: 10,
    lignes: [
      { id: 'l1', description: 'Échafaudage + installation', quantite: 1, unite: 'forfait', prixUnitaire: 3200, montant: 3200 },
      { id: 'l2', description: 'Nettoyage / décapage façade', quantite: 180, unite: 'm²', prixUnitaire: 12, montant: 2160 },
      { id: 'l3', description: 'Enduit projeté monocouche', quantite: 180, unite: 'm²', prixUnitaire: 45, montant: 8100 },
      { id: 'l4', description: 'Peinture façade siloxane', quantite: 180, unite: 'm²', prixUnitaire: 18, montant: 3240 },
      { id: 'l5', description: 'Reprise appuis de fenêtres', quantite: 8, unite: 'pièce', prixUnitaire: 225, montant: 1800 },
    ], total_ht: 18500, tva: 1850, total_ttc: 20350 },

  // ch10 - Acompte facture Lambert
  { id: 'd13', numero: 'FAC-2026-002', type: 'facture', client_id: 'c10', chantier_id: 'ch10', date: '2026-02-10', statut: 'envoye', tvaRate: 10, facture_type: 'acompte', devis_source_id: 'd12',
    lignes: [
      { id: 'l1', description: 'Acompte 30% - Ravalement façade', quantite: 1, unite: 'forfait', prixUnitaire: 5550, montant: 5550 },
    ], total_ht: 5550, tva: 555, total_ttc: 6105 },

  // ch1 - Facture solde Dupont
  { id: 'd14', numero: 'FAC-2026-003', type: 'facture', client_id: 'c1', chantier_id: 'ch1', date: '2026-02-05', statut: 'envoye', tvaRate: 10, facture_type: 'solde', devis_source_id: 'd1',
    lignes: [
      { id: 'l1', description: 'Solde - Rénovation cuisine', quantite: 1, unite: 'forfait', prixUnitaire: 3760, montant: 3760 },
    ], total_ht: 3760, tva: 376, total_ttc: 4136 },

  // Devis refusé — pour tester le statut "refusé"
  { id: 'd15', numero: 'DEV-2026-008', type: 'devis', client_id: 'c9', chantier_id: null, date: '2026-01-28', validite: 30, statut: 'refuse', tvaRate: 20,
    lignes: [
      { id: 'l1', description: 'Construction garage', quantite: 25, unite: 'm²', prixUnitaire: 680, montant: 17000 },
      { id: 'l2', description: 'Porte basculante motorisée', quantite: 1, unite: 'forfait', prixUnitaire: 2800, montant: 2800 },
    ], total_ht: 19800, tva: 3960, total_ttc: 23760 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEPENSES (22 — varied categories, linked to chantiers, with TVA)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_DEPENSES = [
  // ch1 - Cuisine
  { id: 'dep1', chantierId: 'ch1', description: 'Carrelage cuisine (Leroy Merlin)', montant: 520, categorie: 'Matériaux', date: '2026-01-12', fournisseur: 'Leroy Merlin', tvaRate: 20 },
  { id: 'dep2', chantierId: 'ch1', description: 'Robinetterie Grohe', montant: 380, categorie: 'Matériaux', date: '2026-01-14', fournisseur: 'Cedeo', tvaRate: 20 },
  { id: 'dep3', chantierId: 'ch1', description: 'Électroménager encastrable', montant: 1850, categorie: 'Matériaux', date: '2026-01-18', fournisseur: 'Boulanger Pro', tvaRate: 20 },
  // ch2 - SDB
  { id: 'dep4', chantierId: 'ch2', description: 'Receveur douche extra-plat', montant: 450, categorie: 'Matériaux', date: '2026-01-22', fournisseur: 'Cedeo', tvaRate: 20 },
  { id: 'dep5', chantierId: 'ch2', description: 'Carrelage mural', montant: 680, categorie: 'Matériaux', date: '2026-01-23', fournisseur: 'Point P', tvaRate: 20 },
  { id: 'dep6', chantierId: 'ch2', description: 'Colonne de douche thermostatique', montant: 320, categorie: 'Matériaux', date: '2026-01-25', fournisseur: 'Cedeo', tvaRate: 20 },
  // ch3 - Peinture
  { id: 'dep7', chantierId: 'ch3', description: 'Peinture + apprêt (12 pots)', montant: 320, categorie: 'Matériaux', date: '2025-12-05', fournisseur: 'Tollens', tvaRate: 20 },
  { id: 'dep8', chantierId: 'ch3', description: 'Bâches + scotch + rouleaux', montant: 85, categorie: 'Outillage', date: '2025-12-04', fournisseur: 'Leroy Merlin', tvaRate: 20 },
  // ch5 - Studio
  { id: 'dep9', chantierId: 'ch5', description: 'Câbles et gaines ICTA', montant: 280, categorie: 'Matériaux', date: '2026-01-08', fournisseur: 'Rexel', tvaRate: 20 },
  { id: 'dep10', chantierId: 'ch5', description: 'Raccords plomberie PER', montant: 195, categorie: 'Matériaux', date: '2026-01-10', fournisseur: 'Cedeo', tvaRate: 20 },
  { id: 'dep11', chantierId: 'ch5', description: 'Sous-traitance plaquiste', montant: 1200, categorie: 'Sous-traitance', date: '2026-01-12', fournisseur: 'Placo Express', tvaRate: 20 },
  // ch7 - Terrasse
  { id: 'dep12', chantierId: 'ch7', description: 'Lames terrasse composite', montant: 2400, categorie: 'Matériaux', date: '2025-11-20', fournisseur: 'Silvadec', tvaRate: 20 },
  { id: 'dep13', chantierId: 'ch7', description: 'Plots réglables (120 pièces)', montant: 580, categorie: 'Matériaux', date: '2025-11-18', fournisseur: 'Jouplast', tvaRate: 20 },
  // ch8 - Appart Dubois
  { id: 'dep14', chantierId: 'ch8', description: 'Tuyaux cuivre 14/16', montant: 890, categorie: 'Matériaux', date: '2026-01-18', fournisseur: 'Cedeo', tvaRate: 20 },
  { id: 'dep15', chantierId: 'ch8', description: 'Tableau électrique Legrand', montant: 1250, categorie: 'Matériaux', date: '2026-01-20', fournisseur: 'Rexel', tvaRate: 20 },
  { id: 'dep16', chantierId: 'ch8', description: 'Peinture premium Tollens', montant: 780, categorie: 'Matériaux', date: '2026-01-22', fournisseur: 'Tollens', tvaRate: 20 },
  { id: 'dep17', chantierId: 'ch8', description: 'Location benne gravats', montant: 350, categorie: 'Location', date: '2026-01-16', fournisseur: 'Loxam', tvaRate: 20 },
  // ch9 - Isolation
  { id: 'dep18', chantierId: 'ch9', description: 'Laine de roche 120mm (90m²)', montant: 810, categorie: 'Matériaux', date: '2025-10-12', fournisseur: 'Point P', tvaRate: 20 },
  { id: 'dep19', chantierId: 'ch9', description: 'Pare-vapeur + adhésif', montant: 195, categorie: 'Matériaux', date: '2025-10-12', fournisseur: 'Point P', tvaRate: 20 },
  // ch10 - Façade
  { id: 'dep20', chantierId: 'ch10', description: 'Location échafaudage (2 mois)', montant: 2800, categorie: 'Location', date: '2026-02-14', fournisseur: 'Loxam', tvaRate: 20 },
  { id: 'dep21', chantierId: 'ch10', description: 'Enduit monocouche (40 sacs)', montant: 960, categorie: 'Matériaux', date: '2026-02-16', fournisseur: 'Weber', tvaRate: 20 },
  // Frais généraux (pas liés à un chantier)
  { id: 'dep22', chantierId: null, description: 'Carburant fourgon janvier', montant: 420, categorie: 'Déplacements', date: '2026-01-31', fournisseur: 'TotalEnergies', tvaRate: 20 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// POINTAGES (30)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_POINTAGES = [
  // ch1 - Cuisine
  { id: 'p1', employeId: 'e1', chantierId: 'ch1', date: '2026-01-10', heures: 8, approuve: true, verrouille: true },
  { id: 'p2', employeId: 'e2', chantierId: 'ch1', date: '2026-01-10', heures: 8, approuve: true, verrouille: true },
  { id: 'p3', employeId: 'e1', chantierId: 'ch1', date: '2026-01-13', heures: 7.5, approuve: true },
  { id: 'p4', employeId: 'e2', chantierId: 'ch1', date: '2026-01-13', heures: 8, approuve: true },
  { id: 'p5', employeId: 'e4', chantierId: 'ch1', date: '2026-01-14', heures: 6, approuve: true },
  { id: 'p6', employeId: 'e5', chantierId: 'ch1', date: '2026-01-15', heures: 8, approuve: true },
  // ch2 - SDB
  { id: 'p7', employeId: 'e1', chantierId: 'ch2', date: '2026-01-22', heures: 8, approuve: true },
  { id: 'p8', employeId: 'e3', chantierId: 'ch2', date: '2026-01-22', heures: 6, approuve: true },
  { id: 'p9', employeId: 'e5', chantierId: 'ch2', date: '2026-01-23', heures: 8, approuve: true },
  // ch3 - Peinture
  { id: 'p10', employeId: 'e6', chantierId: 'ch3', date: '2025-12-05', heures: 8, approuve: true, verrouille: true },
  { id: 'p11', employeId: 'e6', chantierId: 'ch3', date: '2025-12-06', heures: 8, approuve: true, verrouille: true },
  { id: 'p12', employeId: 'e6', chantierId: 'ch3', date: '2025-12-09', heures: 8, approuve: true, verrouille: true },
  { id: 'p13', employeId: 'e3', chantierId: 'ch3', date: '2025-12-05', heures: 8, approuve: true, verrouille: true },
  // ch5 - Studio
  { id: 'p14', employeId: 'e1', chantierId: 'ch5', date: '2026-01-06', heures: 8, approuve: true },
  { id: 'p15', employeId: 'e3', chantierId: 'ch5', date: '2026-01-06', heures: 8, approuve: true },
  { id: 'p16', employeId: 'e1', chantierId: 'ch5', date: '2026-01-07', heures: 8, approuve: true },
  { id: 'p17', employeId: 'e4', chantierId: 'ch5', date: '2026-01-08', heures: 6, approuve: true },
  // ch7 - Terrasse
  { id: 'p18', employeId: 'e1', chantierId: 'ch7', date: '2025-11-18', heures: 8, approuve: true, verrouille: true },
  { id: 'p19', employeId: 'e2', chantierId: 'ch7', date: '2025-11-18', heures: 8, approuve: true, verrouille: true },
  { id: 'p20', employeId: 'e1', chantierId: 'ch7', date: '2025-11-19', heures: 8, approuve: true, verrouille: true },
  { id: 'p21', employeId: 'e2', chantierId: 'ch7', date: '2025-11-19', heures: 8, approuve: true, verrouille: true },
  // ch8 - Appart Dubois
  { id: 'p22', employeId: 'e1', chantierId: 'ch8', date: '2026-01-16', heures: 8, approuve: true },
  { id: 'p23', employeId: 'e2', chantierId: 'ch8', date: '2026-01-16', heures: 8, approuve: true },
  { id: 'p24', employeId: 'e4', chantierId: 'ch8', date: '2026-01-17', heures: 8, approuve: false },
  { id: 'p25', employeId: 'e5', chantierId: 'ch8', date: '2026-01-17', heures: 8, approuve: false },
  // ch9 - Isolation
  { id: 'p26', employeId: 'e1', chantierId: 'ch9', date: '2025-10-14', heures: 8, approuve: true, verrouille: true },
  { id: 'p27', employeId: 'e2', chantierId: 'ch9', date: '2025-10-14', heures: 8, approuve: true, verrouille: true },
  { id: 'p28', employeId: 'e2', chantierId: 'ch9', date: '2025-10-15', heures: 8, approuve: true, verrouille: true },
  // ch10 - Façade
  { id: 'p29', employeId: 'e1', chantierId: 'ch10', date: '2026-02-17', heures: 8, approuve: false },
  { id: 'p30', employeId: 'e6', chantierId: 'ch10', date: '2026-02-17', heures: 8, approuve: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PAIEMENTS (6 — linked to factures, for Journal Banque)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_PAIEMENTS = [
  // Paiement facture Bernard (ch3 peinture - payée)
  { id: 'pay1', devisId: 'd3', devis_id: 'd3', facture_id: 'd3', amount: 2337.5, montant: 2337.5, methode: 'virement', date: '2025-12-28', reference: 'VIR-2025-001', createdAt: '2025-12-28T10:00:00Z' },
  // Paiement facture Garcia (ch7 terrasse - payée)
  { id: 'pay2', devisId: 'd7', devis_id: 'd7', facture_id: 'd7', amount: 7480, montant: 7480, methode: 'virement', date: '2025-12-18', reference: 'VIR-2025-002', createdAt: '2025-12-18T14:30:00Z' },
  // Paiement facture Moreau isolation (ch9 - payée)
  { id: 'pay3', devisId: 'd10', devis_id: 'd10', facture_id: 'd10', amount: 7200.38, montant: 7200.38, methode: 'virement', date: '2025-11-20', reference: 'VIR-2025-003', createdAt: '2025-11-20T09:15:00Z' },
  // Paiement partiel acompte Rousseau (ch5)
  { id: 'pay4', devisId: 'd9', devis_id: 'd9', facture_id: 'd9', amount: 3740, montant: 3740, methode: 'cheque', date: '2026-01-30', reference: 'CHQ-2026-001', createdAt: '2026-01-30T11:00:00Z' },
  // Paiement acompte Dupont (ch1 - virement reçu)
  { id: 'pay5', devisId: 'd14', devis_id: 'd14', facture_id: 'd14', amount: 2068, montant: 2068, methode: 'virement', date: '2026-02-08', reference: 'VIR-2026-001', createdAt: '2026-02-08T16:45:00Z' },
  // Paiement CB Lambert acompte façade
  { id: 'pay6', devisId: 'd13', devis_id: 'd13', facture_id: 'd13', amount: 6105, montant: 6105, methode: 'carte', date: '2026-02-12', reference: 'CB-2026-001', createdAt: '2026-02-12T10:30:00Z' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ECHANGES (8 — communications chantier)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_ECHANGES = [
  { id: 'ech1', chantierId: 'ch1', type: 'email', contenu: 'Bonjour Mme Dupont, les travaux avancent bien. Le carrelage sera posé cette semaine.', objet: 'Point avancement cuisine', destinataire: 'marie.dupont@email.fr', date: '2026-01-20T09:00:00Z' },
  { id: 'ech2', chantierId: 'ch1', type: 'note', contenu: 'Client souhaite modifier la couleur des joints (blanc cassé au lieu de gris).', date: '2026-01-22T14:30:00Z' },
  { id: 'ech3', chantierId: 'ch2', type: 'email', contenu: 'M. Martin, le receveur de douche a été livré. Pose prévue lundi prochain.', objet: 'Livraison receveur', destinataire: 'j.martin@gmail.com', date: '2026-01-24T10:00:00Z' },
  { id: 'ech4', chantierId: 'ch5', type: 'note', contenu: 'Problème d\'humidité découvert derrière le placo côté nord. Traitement hydrofuge nécessaire avant peinture.', date: '2026-01-09T08:30:00Z' },
  { id: 'ech5', chantierId: 'ch8', type: 'email', contenu: 'M. Dubois, nous avons terminé la démolition. La plomberie commence demain.', objet: 'Fin phase démolition', destinataire: 'p.dubois@orange.fr', date: '2026-01-19T17:00:00Z' },
  { id: 'ech6', chantierId: 'ch8', type: 'note', contenu: 'Fournisseur tableau électrique en retard de 5 jours. Impacte le planning.', date: '2026-01-21T11:00:00Z' },
  { id: 'ech7', chantierId: 'ch10', type: 'email', contenu: 'M. Lambert, l\'échafaudage sera installé le 14 février. Merci de prévoir le dégagement du parking.', objet: 'Installation échafaudage', destinataire: 'n.lambert@pro-habitat.fr', date: '2026-02-10T09:00:00Z' },
  { id: 'ech8', chantierId: 'ch6', type: 'note', contenu: 'En attente retour client pour acceptation du devis. Relancer le 05/02 si pas de réponse.', date: '2026-01-22T16:00:00Z' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AJUSTEMENTS (4)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_AJUSTEMENTS = [
  { id: 'aj1', chantierId: 'ch1', type: 'DEPENSE', montant: 250, description: 'Supplément électroménager (hotte aspirante upgrade)', createdAt: '2026-01-19T10:00:00Z' },
  { id: 'aj2', chantierId: 'ch5', type: 'DEPENSE', montant: 180, description: 'Traitement hydrofuge mur nord (imprévu)', createdAt: '2026-01-11T14:00:00Z' },
  { id: 'aj3', chantierId: 'ch7', type: 'REVENU', montant: 400, description: 'Travaux supplémentaires marches terrasse', createdAt: '2025-12-05T09:00:00Z' },
  { id: 'aj4', chantierId: 'ch8', type: 'DEPENSE', montant: 320, description: 'Location perforateur SDS+ (2 jours)', createdAt: '2026-01-17T08:00:00Z' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS (10)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_EVENTS = [
  { id: 'ev1', title: 'RDV devis M. Lefevre', date: '2026-01-30', type: 'rdv', time: '10:00', description: 'Visite pour devis aménagement bureau' },
  { id: 'ev2', title: 'Livraison carrelage', date: '2026-01-31', chantierId: 'ch1', type: 'autre', description: 'Livraison Leroy Merlin' },
  { id: 'ev3', title: 'Relance devis Lefevre', date: '2026-02-03', type: 'relance', description: 'Relancer pour acceptation devis bureau' },
  { id: 'ev4', title: 'Fin chantier Rousseau', date: '2026-01-30', chantierId: 'ch5', type: 'chantier' },
  { id: 'ev5', title: 'RDV réception Dubois', date: '2026-02-05', chantierId: 'ch8', type: 'rdv', time: '14:00', description: 'Point avancement avec le client' },
  { id: 'ev6', title: 'Urgence fuite Martin', date: '2026-01-29', chantierId: 'ch2', type: 'urgence', description: 'Fuite détectée - intervention rapide' },
  { id: 'ev7', title: 'Inspection échafaudage', date: '2026-02-14', chantierId: 'ch10', type: 'chantier', time: '08:00', description: 'Contrôle sécurité échafaudage avant travaux' },
  { id: 'ev8', title: 'Livraison enduit Weber', date: '2026-02-16', chantierId: 'ch10', type: 'autre', description: '40 sacs enduit monocouche' },
  { id: 'ev9', title: 'Visite chantier Mme Moreau', date: '2026-02-20', type: 'rdv', time: '11:00', description: 'Demande nouvelle isolation garage' },
  { id: 'ev10', title: 'Réunion équipe mensuelle', date: '2026-02-28', type: 'autre', time: '08:30', description: 'Point mensuel équipe + planning mars' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECONDARY DATA: Prévisions trésorerie (localStorage: cp_tresorerie_previsions)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_PREVISIONS = [
  // Charges récurrentes mensuelles
  { id: 'prev_1', type: 'sortie', description: 'Loyer local / dépôt', montant: 1800, date: '2026-02-05', categorie: 'Loyer', recurrence: 'mensuel', statut: 'prevu', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'prev_2', type: 'sortie', description: 'Assurance pro (RC/décennale)', montant: 450, date: '2026-02-05', categorie: 'Assurance', recurrence: 'mensuel', statut: 'prevu', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'prev_3', type: 'sortie', description: 'Salaires et charges', montant: 8500, date: '2026-02-25', categorie: 'Salaires', recurrence: 'mensuel', statut: 'prevu', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'prev_4', type: 'sortie', description: 'Leasing fourgon Renault Master', montant: 650, date: '2026-02-10', categorie: 'Divers', recurrence: 'mensuel', statut: 'prevu', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'prev_5', type: 'sortie', description: 'Carburant / déplacements', montant: 400, date: '2026-02-28', categorie: 'Divers', recurrence: 'mensuel', statut: 'prevu', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'prev_6', type: 'sortie', description: 'Télécom + logiciels', montant: 180, date: '2026-02-01', categorie: 'Divers', recurrence: 'mensuel', statut: 'prevu', createdAt: '2026-01-01T00:00:00Z' },
  // Charges payées janvier
  { id: 'prev_7', type: 'sortie', description: 'Loyer janvier', montant: 1800, date: '2026-01-05', categorie: 'Loyer', recurrence: 'unique', statut: 'paye', createdAt: '2026-01-05T00:00:00Z' },
  { id: 'prev_8', type: 'sortie', description: 'Assurance janvier', montant: 450, date: '2026-01-05', categorie: 'Assurance', recurrence: 'unique', statut: 'paye', createdAt: '2026-01-05T00:00:00Z' },
  { id: 'prev_9', type: 'sortie', description: 'Salaires janvier', montant: 8500, date: '2026-01-25', categorie: 'Salaires', recurrence: 'unique', statut: 'paye', createdAt: '2026-01-25T00:00:00Z' },
  // Entrées prévues (règlements clients attendus)
  { id: 'prev_10', type: 'entree', description: 'Règlement solde Dubois (ch8)', montant: 15400, date: '2026-03-20', categorie: 'Client', recurrence: 'unique', statut: 'prevu', chantierId: 'ch8', createdAt: '2026-01-15T00:00:00Z' },
  { id: 'prev_11', type: 'entree', description: 'Solde facture Rousseau', montant: 5610, date: '2026-02-15', categorie: 'Client', recurrence: 'unique', statut: 'prevu', chantierId: 'ch5', createdAt: '2026-01-22T00:00:00Z' },
  { id: 'prev_12', type: 'entree', description: 'Acompte si acceptation Lefevre', montant: 4320, date: '2026-03-01', categorie: 'Client', recurrence: 'unique', statut: 'prevu', chantierId: 'ch6', createdAt: '2026-01-20T00:00:00Z' },
  // Dépenses ponctuelles à venir
  { id: 'prev_13', type: 'sortie', description: 'Achat ponceuse Festool', montant: 890, date: '2026-02-20', categorie: 'Materiaux', recurrence: 'unique', statut: 'prevu', createdAt: '2026-02-01T00:00:00Z' },
  { id: 'prev_14', type: 'sortie', description: 'Taxe formation professionnelle', montant: 1200, date: '2026-03-15', categorie: 'Divers', recurrence: 'unique', statut: 'prevu', createdAt: '2026-01-15T00:00:00Z' },
];

export const DEMO_TRESORERIE_SETTINGS = {
  seuilAlerte: 5000,
  soldeInitial: 24500,
  soldeDate: '2026-01-01',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECONDARY DATA: Fournisseurs (localStorage: chantierpro_fournisseurs)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_FOURNISSEURS = [
  { id: 'four1', nom: 'Point P', email: 'commercial@pointp.fr', contact: 'commercial@pointp.fr', telephone: '01 40 50 60 70', adresse: '15 rue des Matériaux, 93200 Saint-Denis', categorie: 'Matériaux', conditions: 'Net 30 jours', delaiLivraison: '3' },
  { id: 'four2', nom: 'Cedeo', email: 'pro@cedeo.fr', contact: 'pro@cedeo.fr', telephone: '01 55 66 77 88', adresse: '8 zone industrielle, 94500 Champigny', categorie: 'Plomberie', conditions: 'Net 45 jours', delaiLivraison: '5' },
  { id: 'four3', nom: 'Rexel', email: 'agence.paris@rexel.fr', contact: 'agence.paris@rexel.fr', telephone: '01 33 44 55 66', adresse: '22 avenue de l\'Industrie, 92000 Nanterre', categorie: 'Électricité', conditions: 'Net 30 jours', delaiLivraison: '2' },
  { id: 'four4', nom: 'Leroy Merlin Pro', email: 'pro@leroymerlin.fr', contact: 'pro@leroymerlin.fr', telephone: '01 77 88 99 00', adresse: '120 avenue de France, 75013 Paris', categorie: 'Généraliste', conditions: 'Comptant', delaiLivraison: '1' },
  { id: 'four5', nom: 'Tollens', email: 'pro.idf@tollens.com', contact: 'pro.idf@tollens.com', telephone: '01 22 33 44 55', adresse: '5 rue des Peintres, 92100 Boulogne', categorie: 'Peinture', conditions: 'Net 30 jours', delaiLivraison: '2' },
  { id: 'four6', nom: 'Loxam', email: 'agence.paris@loxam.fr', contact: 'agence.paris@loxam.fr', telephone: '01 44 55 66 77', adresse: '30 rue des Locations, 93100 Montreuil', categorie: 'Location', conditions: 'Comptant', delaiLivraison: '1' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECONDARY DATA: Article-Fournisseur links
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_ARTICLE_FOURNISSEURS = [
  { id: 'af1', articleId: 'cat1', fournisseurId: 'four1', prixAchat: 28, reference: 'PP-GRES-6060', delaiJours: 3 },
  { id: 'af2', articleId: 'cat2', fournisseurId: 'four1', prixAchat: 16, reference: 'PP-FAIE-2060', delaiJours: 3 },
  { id: 'af3', articleId: 'cat3', fournisseurId: 'four5', prixAchat: 18, reference: 'TOL-ACR-BM15', delaiJours: 2 },
  { id: 'af4', articleId: 'cat8', fournisseurId: 'four3', prixAchat: 1.2, reference: 'REX-CAB-25', delaiJours: 1 },
  { id: 'af5', articleId: 'cat10', fournisseurId: 'four2', prixAchat: 1.5, reference: 'CED-PER-16', delaiJours: 2 },
  { id: 'af6', articleId: 'cat11', fournisseurId: 'four2', prixAchat: 145, reference: 'CED-REC-80120', delaiJours: 5 },
  { id: 'af7', articleId: 'cat5', fournisseurId: 'four1', prixAchat: 6, reference: 'PP-BA13-STD', delaiJours: 1 },
  { id: 'af8', articleId: 'cat9', fournisseurId: 'four3', prixAchat: 3.5, reference: 'REX-PRS-2PT', delaiJours: 1 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECONDARY DATA: Stock mouvements (localStorage: chantierpro_mouvements)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_MOUVEMENTS = [
  { id: 'mv1', articleId: 'cat6', type: 'in', quantite: 50, date: '2026-01-05', raison: 'Réception commande Point P', fournisseurId: 'four1', articleNom: 'Sac de ciment 35kg' },
  { id: 'mv2', articleId: 'cat1', type: 'out', quantite: 18, date: '2026-01-12', raison: 'Rénovation cuisine Dupont', chantierId: 'ch1', articleNom: 'Carrelage grès cérame 60x60' },
  { id: 'mv3', articleId: 'cat10', type: 'adjustment', quantite: -5, date: '2026-01-02', raison: 'Ajustement inventaire', articleNom: 'Tube PER 16mm' },
  { id: 'mv4', articleId: 'cat3', type: 'out', quantite: 12, date: '2025-12-05', raison: 'Peinture appartement Bernard', chantierId: 'ch3', articleNom: 'Peinture acrylique blanc mat' },
  { id: 'mv5', articleId: 'cat10', type: 'in', quantite: 200, date: '2025-12-20', raison: 'Réception commande Cedeo', fournisseurId: 'four2', articleNom: 'Tube PER 16mm' },
  { id: 'mv6', articleId: 'cat5', type: 'out', quantite: 25, date: '2026-01-10', raison: 'Rénovation studio Rousseau', chantierId: 'ch5', articleNom: 'Placo BA13 standard' },
  { id: 'mv7', articleId: 'cat8', type: 'out', quantite: 85, date: '2025-10-12', raison: 'Chantier Moreau - câblage', chantierId: 'ch9', articleNom: 'Câble électrique 2.5mm²' },
  { id: 'mv8', articleId: 'cat2', type: 'in', quantite: 15, date: '2025-12-15', raison: 'Réception commande Point P', fournisseurId: 'four1', articleNom: 'Faïence murale blanche 20x60' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECONDARY DATA: Packs (localStorage: chantierpro_packs)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_PACKS = [
  {
    id: 'pack1', nom: 'Pack SDB douche italienne', description: 'Fournitures et main d\'œuvre pour SDB standard avec douche italienne',
    articles: [
      { articleId: 'cat1', quantite: 8, label: 'Carrelage sol' },
      { articleId: 'cat2', quantite: 15, label: 'Faïence murale' },
      { articleId: 'cat11', quantite: 1, label: 'Receveur douche' },
      { articleId: 'cat10', quantite: 20, label: 'Tube PER raccords' },
    ],
  },
  {
    id: 'pack2', nom: 'Pack peinture pièce 15m²', description: 'Kit peinture complet pour une pièce de 15m²',
    articles: [
      { articleId: 'cat3', quantite: 2, label: 'Peinture acrylique' },
      { articleId: 'cat4', quantite: 1, label: 'Sous-couche' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENTREPRISE (settings)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_ENTREPRISE = {
  nom: 'BTP Rénovation Pro',
  siret: '123 456 789 00012',
  tvaIntra: 'FR12345678900',
  adresse: '15 rue des Artisans',
  cp: '75012',
  ville: 'Paris',
  telephone: '01 23 45 67 89',
  email: 'contact@btp-renovation.fr',
  logo: '',
  rcs: 'Paris B 123 456 789',
  codeAPE: '4120A',
  assuranceDecennale: 'AXA Entreprises - Contrat n° DEC-2024-789456',
  assuranceRC: 'AXA Entreprises - Contrat n° RC-2024-123456',
  iban: 'FR76 1234 5678 9012 3456 7890 123',
  bic: 'BNPAFRPPXXX',
  banque: 'BNP Paribas',
  tvaDefaut: 10,
  mentionsDevis: 'Devis valable 30 jours. TVA applicable selon le type de travaux.',
  conditionsPaiement: 'Paiement à 30 jours fin de mois. Acompte de 30% à la commande.',
  couleur: '#f97316',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Combined demo data object for DataProvider initialization.
 * This populates the main DataContext arrays.
 */
export const DEMO_DATA = {
  clients: DEMO_CLIENTS,
  equipe: DEMO_EQUIPE,
  chantiers: DEMO_CHANTIERS,
  catalogue: DEMO_CATALOGUE,
  devis: DEMO_DEVIS,
  depenses: DEMO_DEPENSES,
  pointages: DEMO_POINTAGES,
  events: DEMO_EVENTS,
  paiements: DEMO_PAIEMENTS,
  echanges: DEMO_ECHANGES,
  ajustements: DEMO_AJUSTEMENTS,
};

/**
 * Seeds secondary localStorage data that lives outside DataContext.
 * Call this once when demo mode initializes with ?demo=true.
 */
export function seedSecondaryDemoData() {
  const keys = {
    'cp_tresorerie_previsions': DEMO_PREVISIONS,
    'cp_tresorerie_settings': DEMO_TRESORERIE_SETTINGS,
    'chantierpro_fournisseurs': DEMO_FOURNISSEURS,
    'chantierpro_article_fournisseurs': DEMO_ARTICLE_FOURNISSEURS,
    'chantierpro_mouvements': DEMO_MOUVEMENTS,
    'chantierpro_packs': DEMO_PACKS,
    'cp_entreprise': DEMO_ENTREPRISE,
  };

  Object.entries(keys).forEach(([key, data]) => {
    try {
      // Only seed if not already populated (don't overwrite user changes)
      const existing = localStorage.getItem(key);
      if (!existing || existing === '[]' || existing === '{}' || existing === 'null') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch { /* silent - localStorage may be full */ }
  });
}

export default DEMO_DATA;
