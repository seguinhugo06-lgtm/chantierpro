/**
 * Demo data for ChantierPro
 * Extracted from App.jsx for cleaner architecture
 * Use: import { DEMO_DATA } from './lib/demo-data'
 */

export const DEMO_CLIENTS = [
  { id: 'c1', nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@email.fr', telephone: '06 12 34 56 78', adresse: '12 rue des Lilas, 75011 Paris', entreprise: '' },
  { id: 'c2', nom: 'Martin', prenom: 'Jean', email: 'j.martin@gmail.com', telephone: '06 98 76 54 32', adresse: '45 avenue Victor Hugo, 69006 Lyon', entreprise: 'SCI Martin' },
  { id: 'c3', nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@outlook.fr', telephone: '07 11 22 33 44', adresse: '8 place de la Republique, 33000 Bordeaux', entreprise: '' },
  { id: 'c4', nom: 'Petit', prenom: 'Luc', email: 'luc.petit@entreprise.com', telephone: '06 55 44 33 22', adresse: '23 boulevard Gambetta, 13001 Marseille', entreprise: 'Petit & Fils' },
  { id: 'c5', nom: 'Rousseau', prenom: 'Claire', email: 'claire.rousseau@mail.fr', telephone: '06 77 88 99 00', adresse: '56 rue Nationale, 44000 Nantes', entreprise: '' },
  { id: 'c6', nom: 'Lefevre', prenom: 'Marc', email: 'marc.lefevre@pro.fr', telephone: '06 44 55 66 77', adresse: '7 allee des Roses, 31000 Toulouse', entreprise: 'Lefevre Immobilier' },
  { id: 'c7', nom: 'Garcia', prenom: 'Elena', email: 'elena.garcia@gmail.com', telephone: '07 22 33 44 55', adresse: '120 cours Mirabeau, 13100 Aix-en-Provence', entreprise: '' },
  { id: 'c8', nom: 'Dubois', prenom: 'Philippe', email: 'p.dubois@orange.fr', telephone: '06 88 99 00 11', adresse: '3 place du Marche, 67000 Strasbourg', entreprise: 'SCI Dubois' }
];

export const DEMO_EQUIPE = [
  { id: 'e1', nom: 'Moreau', prenom: 'Pierre', role: 'Chef de chantier', telephone: '06 11 11 11 11', email: 'p.moreau@chantier.fr', tauxHoraire: 45, coutHoraireCharge: 28, contrat: 'CDI' },
  { id: 'e2', nom: 'Leroy', prenom: 'Thomas', role: 'Ouvrier qualifie', telephone: '06 22 22 22 22', email: 't.leroy@chantier.fr', tauxHoraire: 35, coutHoraireCharge: 22, contrat: 'CDI' },
  { id: 'e3', nom: 'Garcia', prenom: 'Antoine', role: 'Apprenti', telephone: '06 33 33 33 33', email: 'a.garcia@chantier.fr', tauxHoraire: 20, coutHoraireCharge: 12, contrat: 'Apprentissage' },
  { id: 'e4', nom: 'Benoit', prenom: 'Lucas', role: 'Electricien', telephone: '06 44 44 44 44', email: 'l.benoit@chantier.fr', tauxHoraire: 40, coutHoraireCharge: 25, contrat: 'CDI' }
];

export const DEMO_CHANTIERS = [
  { id: 'ch1', nom: 'Renovation cuisine Dupont', client_id: 'c1', adresse: '12 rue des Lilas, 75011 Paris', date_debut: '2025-01-10', date_fin: '2025-02-15', statut: 'en_cours', avancement: 65, notes: 'Cuisine complete avec ilot central', budget_estime: 3760 },
  { id: 'ch2', nom: 'Salle de bain Martin', client_id: 'c2', adresse: '45 avenue Victor Hugo, 69006 Lyon', date_debut: '2025-01-20', date_fin: '2025-02-28', statut: 'en_cours', avancement: 30, notes: 'SDB avec douche italienne', budget_estime: 4475 },
  { id: 'ch3', nom: 'Peinture appartement Bernard', client_id: 'c3', adresse: '8 place de la Republique, 33000 Bordeaux', date_debut: '2024-12-01', date_fin: '2024-12-20', statut: 'termine', avancement: 100, notes: 'T3, peinture complete', budget_estime: 2125 },
  { id: 'ch4', nom: 'Extension maison Petit', client_id: 'c4', adresse: '23 boulevard Gambetta, 13001 Marseille', date_debut: '2025-03-01', date_fin: '2025-06-30', statut: 'prospect', avancement: 0, notes: 'Extension 40m2 + terrasse', budget_estime: 32600 },
  { id: 'ch5', nom: 'Renovation studio Rousseau', client_id: 'c5', adresse: '56 rue Nationale, 44000 Nantes', date_debut: '2025-01-05', date_fin: '2025-01-25', statut: 'en_cours', avancement: 85, notes: 'Studio 25m2 renovation complete', budget_estime: 8500 },
  { id: 'ch6', nom: 'Amenagement bureau Lefevre', client_id: 'c6', adresse: '7 allee des Roses, 31000 Toulouse', date_debut: '2025-02-01', date_fin: '2025-02-20', statut: 'prospect', avancement: 0, notes: 'Bureau 45m2 cloisons + electricite', budget_estime: 12000 },
  { id: 'ch7', nom: 'Terrasse Garcia', client_id: 'c7', adresse: '120 cours Mirabeau, 13100 Aix-en-Provence', date_debut: '2024-11-15', date_fin: '2024-12-10', statut: 'termine', avancement: 100, notes: 'Terrasse bois 30m2', budget_estime: 6800 },
  { id: 'ch8', nom: 'Renovation appartement Dubois', client_id: 'c8', adresse: '3 place du Marche, 67000 Strasbourg', date_debut: '2025-01-15', date_fin: '2025-03-15', statut: 'en_cours', avancement: 45, notes: 'T4 renovation complete plomberie electricite', budget_estime: 28000 }
];

export const DEMO_CATALOGUE = [
  { id: 'cat1', nom: 'Carrelage gres cerame 60x60', prix: 45, prixAchat: 28, unite: 'm2', categorie: 'Carrelage', favori: true },
  { id: 'cat2', nom: 'Peinture acrylique blanc mat', prix: 35, prixAchat: 18, unite: 'pot', categorie: 'Peinture', favori: true },
  { id: 'cat3', nom: 'Placo BA13 standard', prix: 12, prixAchat: 6, unite: 'm2', categorie: 'Materiaux', favori: false },
  { id: 'cat4', nom: 'Cable electrique 2.5mm2', prix: 2.5, prixAchat: 1.2, unite: 'ml', categorie: 'Electricite', favori: false },
  { id: 'cat5', nom: 'Tube PER 16mm', prix: 3, prixAchat: 1.5, unite: 'ml', categorie: 'Plomberie', favori: true },
  { id: 'cat6', nom: 'Main d\'oeuvre pose carrelage', prix: 45, prixAchat: 0, unite: 'm2', categorie: 'Main d\'oeuvre', favori: true },
  { id: 'cat7', nom: 'Main d\'oeuvre peinture', prix: 25, prixAchat: 0, unite: 'm2', categorie: 'Main d\'oeuvre', favori: true },
  { id: 'cat8', nom: 'Sac de ciment 35kg', prix: 12, prixAchat: 7, unite: 'sac', categorie: 'Maconnerie', favori: false }
];

export const DEMO_DEVIS = [
  { id: 'd1', numero: 'DEV-2025-001', type: 'devis', client_id: 'c1', chantier_id: 'ch1', date: '2025-01-05', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Depose cuisine existante', quantite: 1, unite: 'forfait', prixUnitaire: 800, montant: 800 }, { id: 'l2', description: 'Pose carrelage sol', quantite: 18, unite: 'm2', prixUnitaire: 45, montant: 810 }, { id: 'l3', description: 'Plomberie cuisine', quantite: 1, unite: 'forfait', prixUnitaire: 1200, montant: 1200 }, { id: 'l4', description: 'Electricite', quantite: 1, unite: 'forfait', prixUnitaire: 950, montant: 950 }], total_ht: 3760, tva: 376, total_ttc: 4136 },
  { id: 'd2', numero: 'DEV-2025-002', type: 'devis', client_id: 'c2', chantier_id: 'ch2', date: '2025-01-15', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Depose salle de bain', quantite: 1, unite: 'forfait', prixUnitaire: 600, montant: 600 }, { id: 'l2', description: 'Pose douche italienne', quantite: 1, unite: 'forfait', prixUnitaire: 2500, montant: 2500 }, { id: 'l3', description: 'Carrelage mural', quantite: 25, unite: 'm2', prixUnitaire: 55, montant: 1375 }], total_ht: 4475, tva: 447.5, total_ttc: 4922.5 },
  { id: 'd3', numero: 'FAC-2024-015', type: 'facture', client_id: 'c3', chantier_id: 'ch3', date: '2024-12-20', statut: 'payee', tvaRate: 10, lignes: [{ id: 'l1', description: 'Peinture T3 complet', quantite: 85, unite: 'm2', prixUnitaire: 25, montant: 2125 }], total_ht: 2125, tva: 212.5, total_ttc: 2337.5 },
  { id: 'd4', numero: 'DEV-2025-003', type: 'devis', client_id: 'c4', chantier_id: 'ch4', date: '2025-01-25', validite: 60, statut: 'brouillon', tvaRate: 20, lignes: [{ id: 'l1', description: 'Gros oeuvre extension', quantite: 40, unite: 'm2', prixUnitaire: 450, montant: 18000 }, { id: 'l2', description: 'Toiture', quantite: 45, unite: 'm2', prixUnitaire: 180, montant: 8100 }, { id: 'l3', description: 'Menuiseries exterieures', quantite: 1, unite: 'forfait', prixUnitaire: 6500, montant: 6500 }], total_ht: 32600, tva: 6520, total_ttc: 39120 },
  { id: 'd5', numero: 'DEV-2025-004', type: 'devis', client_id: 'c5', chantier_id: 'ch5', date: '2025-01-02', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Renovation studio complete', quantite: 25, unite: 'm2', prixUnitaire: 280, montant: 7000 }, { id: 'l2', description: 'Electricite', quantite: 1, unite: 'forfait', prixUnitaire: 1500, montant: 1500 }], total_ht: 8500, tva: 850, total_ttc: 9350 },
  { id: 'd6', numero: 'DEV-2025-005', type: 'devis', client_id: 'c6', chantier_id: 'ch6', date: '2025-01-20', validite: 45, statut: 'envoye', tvaRate: 20, lignes: [{ id: 'l1', description: 'Cloisons bureau', quantite: 30, unite: 'm2', prixUnitaire: 180, montant: 5400 }, { id: 'l2', description: 'Electricite complete', quantite: 1, unite: 'forfait', prixUnitaire: 4200, montant: 4200 }, { id: 'l3', description: 'Climatisation', quantite: 2, unite: 'unite', prixUnitaire: 1200, montant: 2400 }], total_ht: 12000, tva: 2400, total_ttc: 14400 },
  { id: 'd7', numero: 'FAC-2024-012', type: 'facture', client_id: 'c7', chantier_id: 'ch7', date: '2024-12-10', statut: 'payee', tvaRate: 10, lignes: [{ id: 'l1', description: 'Terrasse bois composite', quantite: 30, unite: 'm2', prixUnitaire: 180, montant: 5400 }, { id: 'l2', description: 'Structure porteuse', quantite: 1, unite: 'forfait', prixUnitaire: 1400, montant: 1400 }], total_ht: 6800, tva: 680, total_ttc: 7480 },
  { id: 'd8', numero: 'DEV-2025-006', type: 'devis', client_id: 'c8', chantier_id: 'ch8', date: '2025-01-10', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Renovation plomberie complete', quantite: 1, unite: 'forfait', prixUnitaire: 8500, montant: 8500 }, { id: 'l2', description: 'Refection electrique', quantite: 1, unite: 'forfait', prixUnitaire: 9500, montant: 9500 }, { id: 'l3', description: 'Peinture et finitions', quantite: 95, unite: 'm2', prixUnitaire: 65, montant: 6175 }, { id: 'l4', description: 'Sols', quantite: 75, unite: 'm2', prixUnitaire: 51, montant: 3825 }], total_ht: 28000, tva: 2800, total_ttc: 30800 },
  { id: 'd9', numero: 'FAC-2025-001', type: 'facture', client_id: 'c5', chantier_id: 'ch5', date: '2025-01-15', statut: 'envoye', tvaRate: 10, facture_type: 'acompte', devis_source_id: 'd5', lignes: [{ id: 'l1', description: 'Acompte 40% - Renovation studio', quantite: 1, unite: 'forfait', prixUnitaire: 3400, montant: 3400 }], total_ht: 3400, tva: 340, total_ttc: 3740 }
];

export const DEMO_DEPENSES = [
  { id: 'dep1', chantierId: 'ch1', description: 'Carrelage cuisine', montant: 520, categorie: 'Materiaux', date: '2025-01-12' },
  { id: 'dep2', chantierId: 'ch1', description: 'Robinetterie', montant: 380, categorie: 'Materiaux', date: '2025-01-14' },
  { id: 'dep3', chantierId: 'ch1', description: 'Electromenager', montant: 1850, categorie: 'Materiaux', date: '2025-01-18' },
  { id: 'dep4', chantierId: 'ch2', description: 'Receveur douche', montant: 450, categorie: 'Materiaux', date: '2025-01-22' },
  { id: 'dep5', chantierId: 'ch2', description: 'Carrelage mural', montant: 680, categorie: 'Materiaux', date: '2025-01-23' },
  { id: 'dep6', chantierId: 'ch3', description: 'Peinture + appret', montant: 320, categorie: 'Materiaux', date: '2024-12-05' },
  { id: 'dep7', chantierId: 'ch5', description: 'Electricite - cables', montant: 280, categorie: 'Materiaux', date: '2025-01-08' },
  { id: 'dep8', chantierId: 'ch5', description: 'Plomberie - raccords', montant: 195, categorie: 'Materiaux', date: '2025-01-10' },
  { id: 'dep9', chantierId: 'ch7', description: 'Lames terrasse composite', montant: 2400, categorie: 'Materiaux', date: '2024-11-20' },
  { id: 'dep10', chantierId: 'ch7', description: 'Plots reglables', montant: 580, categorie: 'Materiaux', date: '2024-11-18' },
  { id: 'dep11', chantierId: 'ch8', description: 'Tuyaux cuivre', montant: 890, categorie: 'Materiaux', date: '2025-01-18' },
  { id: 'dep12', chantierId: 'ch8', description: 'Tableau electrique', montant: 1250, categorie: 'Materiaux', date: '2025-01-20' },
  { id: 'dep13', chantierId: 'ch8', description: 'Peinture premium', montant: 780, categorie: 'Materiaux', date: '2025-01-22' }
];

export const DEMO_POINTAGES = [
  { id: 'p1', employeId: 'e1', chantierId: 'ch1', date: '2025-01-10', heures: 8, approuve: true, verrouille: true },
  { id: 'p2', employeId: 'e2', chantierId: 'ch1', date: '2025-01-10', heures: 8, approuve: true, verrouille: true },
  { id: 'p3', employeId: 'e1', chantierId: 'ch1', date: '2025-01-13', heures: 7.5, approuve: true },
  { id: 'p4', employeId: 'e2', chantierId: 'ch1', date: '2025-01-13', heures: 8, approuve: true },
  { id: 'p5', employeId: 'e4', chantierId: 'ch1', date: '2025-01-14', heures: 6, approuve: true },
  { id: 'p6', employeId: 'e1', chantierId: 'ch2', date: '2025-01-22', heures: 8, approuve: true },
  { id: 'p7', employeId: 'e3', chantierId: 'ch2', date: '2025-01-22', heures: 6, approuve: true },
  { id: 'p8', employeId: 'e1', chantierId: 'ch3', date: '2024-12-05', heures: 8, approuve: true, verrouille: true },
  { id: 'p9', employeId: 'e2', chantierId: 'ch3', date: '2024-12-05', heures: 8, approuve: true, verrouille: true },
  { id: 'p10', employeId: 'e2', chantierId: 'ch3', date: '2024-12-06', heures: 8, approuve: true, verrouille: true },
  { id: 'p11', employeId: 'e1', chantierId: 'ch5', date: '2025-01-06', heures: 8, approuve: true },
  { id: 'p12', employeId: 'e3', chantierId: 'ch5', date: '2025-01-06', heures: 8, approuve: true },
  { id: 'p13', employeId: 'e1', chantierId: 'ch5', date: '2025-01-07', heures: 8, approuve: true },
  { id: 'p14', employeId: 'e4', chantierId: 'ch5', date: '2025-01-08', heures: 6, approuve: true },
  { id: 'p15', employeId: 'e1', chantierId: 'ch7', date: '2024-11-18', heures: 8, approuve: true, verrouille: true },
  { id: 'p16', employeId: 'e2', chantierId: 'ch7', date: '2024-11-18', heures: 8, approuve: true, verrouille: true },
  { id: 'p17', employeId: 'e1', chantierId: 'ch7', date: '2024-11-19', heures: 8, approuve: true, verrouille: true },
  { id: 'p18', employeId: 'e2', chantierId: 'ch7', date: '2024-11-19', heures: 8, approuve: true, verrouille: true },
  { id: 'p19', employeId: 'e1', chantierId: 'ch8', date: '2025-01-16', heures: 8, approuve: true },
  { id: 'p20', employeId: 'e2', chantierId: 'ch8', date: '2025-01-16', heures: 8, approuve: true },
  { id: 'p21', employeId: 'e4', chantierId: 'ch8', date: '2025-01-17', heures: 8, approuve: false },
  { id: 'p22', employeId: 'e1', chantierId: 'ch8', date: '2025-01-17', heures: 8, approuve: false }
];

export const DEMO_EVENTS = [
  { id: 'ev1', title: 'RDV devis M. Lefevre', date: '2025-01-18', type: 'rdv', time: '10:00', description: 'Visite pour devis amenagement bureau' },
  { id: 'ev2', title: 'Livraison carrelage', date: '2025-01-19', chantierId: 'ch1', type: 'autre', description: 'Livraison Leroy Merlin' },
  { id: 'ev3', title: 'Relance devis Lefevre', date: '2025-01-25', type: 'relance', description: 'Relancer pour acceptation devis bureau' },
  { id: 'ev4', title: 'Fin chantier Rousseau', date: '2025-01-25', chantierId: 'ch5', type: 'chantier' },
  { id: 'ev5', title: 'RDV reception Dubois', date: '2025-01-28', chantierId: 'ch8', type: 'rdv', time: '14:00', description: 'Point avancement avec le client' },
  { id: 'ev6', title: 'Urgence fuite Martin', date: '2025-01-17', chantierId: 'ch2', type: 'urgence', description: 'Fuite detectee - intervention rapide' }
];

/**
 * Combined demo data object for DataProvider initialization
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
  paiements: [],
  echanges: [],
  ajustements: []
};

export default DEMO_DATA;
