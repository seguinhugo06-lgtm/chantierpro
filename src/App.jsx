import React, { useState, useEffect } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';
import Dashboard from './components/Dashboard';
import Chantiers from './components/Chantiers';
import Planning from './components/Planning';
import Clients from './components/Clients';
import DevisPage from './components/DevisPage';
import Equipe from './components/Equipe';
import Catalogue from './components/Catalogue';
import Settings from './components/Settings';
import { Home, FileText, Building2, Calendar, Users, Package, HardHat, Settings as SettingsIcon, Eye, EyeOff, Sun, Moon, LogOut, Menu, Bell, Plus, ChevronRight, BarChart3, HelpCircle } from 'lucide-react';

// Theme classes helper
const getThemeClasses = (isDark) => ({
  card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
  cardHover: isDark ? "hover:bg-slate-700" : "hover:bg-slate-50",
  input: isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
  text: isDark ? "text-slate-100" : "text-slate-900",
  textSecondary: isDark ? "text-slate-300" : "text-slate-600",
  textMuted: isDark ? "text-slate-400" : "text-slate-500",
  bg: isDark ? "bg-slate-900" : "bg-slate-100",
  border: isDark ? "border-slate-700" : "border-slate-200",
});

// Demo data for testing
const DEMO_CLIENTS = [
  { id: 'c1', nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@email.fr', telephone: '06 12 34 56 78', adresse: '12 rue des Lilas, 75011 Paris', entreprise: '' },
  { id: 'c2', nom: 'Martin', prenom: 'Jean', email: 'j.martin@gmail.com', telephone: '06 98 76 54 32', adresse: '45 avenue Victor Hugo, 69006 Lyon', entreprise: 'SCI Martin' },
  { id: 'c3', nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@outlook.fr', telephone: '07 11 22 33 44', adresse: '8 place de la République, 33000 Bordeaux', entreprise: '' },
  { id: 'c4', nom: 'Petit', prenom: 'Luc', email: 'luc.petit@entreprise.com', telephone: '06 55 44 33 22', adresse: '23 boulevard Gambetta, 13001 Marseille', entreprise: 'Petit & Fils' },
  { id: 'c5', nom: 'Rousseau', prenom: 'Claire', email: 'claire.rousseau@mail.fr', telephone: '06 77 88 99 00', adresse: '56 rue Nationale, 44000 Nantes', entreprise: '' },
  { id: 'c6', nom: 'Lefevre', prenom: 'Marc', email: 'marc.lefevre@pro.fr', telephone: '06 44 55 66 77', adresse: '7 allée des Roses, 31000 Toulouse', entreprise: 'Lefevre Immobilier' },
  { id: 'c7', nom: 'Garcia', prenom: 'Elena', email: 'elena.garcia@gmail.com', telephone: '07 22 33 44 55', adresse: '120 cours Mirabeau, 13100 Aix-en-Provence', entreprise: '' },
  { id: 'c8', nom: 'Dubois', prenom: 'Philippe', email: 'p.dubois@orange.fr', telephone: '06 88 99 00 11', adresse: '3 place du Marché, 67000 Strasbourg', entreprise: 'SCI Dubois' }
];

const DEMO_EQUIPE = [
  { id: 'e1', nom: 'Moreau', prenom: 'Pierre', role: 'Chef de chantier', telephone: '06 11 11 11 11', email: 'p.moreau@chantier.fr', tauxHoraire: 45, coutHoraireCharge: 28, contrat: 'CDI' },
  { id: 'e2', nom: 'Leroy', prenom: 'Thomas', role: 'Ouvrier qualifié', telephone: '06 22 22 22 22', email: 't.leroy@chantier.fr', tauxHoraire: 35, coutHoraireCharge: 22, contrat: 'CDI' },
  { id: 'e3', nom: 'Garcia', prenom: 'Antoine', role: 'Apprenti', telephone: '06 33 33 33 33', email: 'a.garcia@chantier.fr', tauxHoraire: 20, coutHoraireCharge: 12, contrat: 'Apprentissage' },
  { id: 'e4', nom: 'Benoit', prenom: 'Lucas', role: 'Électricien', telephone: '06 44 44 44 44', email: 'l.benoit@chantier.fr', tauxHoraire: 40, coutHoraireCharge: 25, contrat: 'CDI' }
];

const DEMO_CHANTIERS = [
  { id: 'ch1', nom: 'Rénovation cuisine Dupont', client_id: 'c1', adresse: '12 rue des Lilas, 75011 Paris', date_debut: '2025-01-10', date_fin: '2025-02-15', statut: 'en_cours', avancement: 65, notes: 'Cuisine complète avec îlot central', budget_estime: 3760 },
  { id: 'ch2', nom: 'Salle de bain Martin', client_id: 'c2', adresse: '45 avenue Victor Hugo, 69006 Lyon', date_debut: '2025-01-20', date_fin: '2025-02-28', statut: 'en_cours', avancement: 30, notes: 'SDB avec douche italienne', budget_estime: 4475 },
  { id: 'ch3', nom: 'Peinture appartement Bernard', client_id: 'c3', adresse: '8 place de la République, 33000 Bordeaux', date_debut: '2024-12-01', date_fin: '2024-12-20', statut: 'termine', avancement: 100, notes: 'T3, peinture complète', budget_estime: 2125 },
  { id: 'ch4', nom: 'Extension maison Petit', client_id: 'c4', adresse: '23 boulevard Gambetta, 13001 Marseille', date_debut: '2025-03-01', date_fin: '2025-06-30', statut: 'prospect', avancement: 0, notes: 'Extension 40m² + terrasse', budget_estime: 32600 },
  { id: 'ch5', nom: 'Rénovation studio Rousseau', client_id: 'c5', adresse: '56 rue Nationale, 44000 Nantes', date_debut: '2025-01-05', date_fin: '2025-01-25', statut: 'en_cours', avancement: 85, notes: 'Studio 25m² rénovation complète', budget_estime: 8500 },
  { id: 'ch6', nom: 'Aménagement bureau Lefevre', client_id: 'c6', adresse: '7 allée des Roses, 31000 Toulouse', date_debut: '2025-02-01', date_fin: '2025-02-20', statut: 'prospect', avancement: 0, notes: 'Bureau 45m² cloisons + électricité', budget_estime: 12000 },
  { id: 'ch7', nom: 'Terrasse Garcia', client_id: 'c7', adresse: '120 cours Mirabeau, 13100 Aix-en-Provence', date_debut: '2024-11-15', date_fin: '2024-12-10', statut: 'termine', avancement: 100, notes: 'Terrasse bois 30m²', budget_estime: 6800 },
  { id: 'ch8', nom: 'Rénovation appartement Dubois', client_id: 'c8', adresse: '3 place du Marché, 67000 Strasbourg', date_debut: '2025-01-15', date_fin: '2025-03-15', statut: 'en_cours', avancement: 45, notes: 'T4 rénovation complète plomberie électricité', budget_estime: 28000 }
];

const DEMO_CATALOGUE = [
  { id: 'cat1', nom: 'Carrelage grès cérame 60x60', prix: 45, prixAchat: 28, unite: 'm²', categorie: 'Carrelage', favori: true },
  { id: 'cat2', nom: 'Peinture acrylique blanc mat', prix: 35, prixAchat: 18, unite: 'pot', categorie: 'Peinture', favori: true },
  { id: 'cat3', nom: 'Placo BA13 standard', prix: 12, prixAchat: 6, unite: 'm²', categorie: 'Matériaux', favori: false },
  { id: 'cat4', nom: 'Câble électrique 2.5mm²', prix: 2.5, prixAchat: 1.2, unite: 'ml', categorie: 'Électricité', favori: false },
  { id: 'cat5', nom: 'Tube PER 16mm', prix: 3, prixAchat: 1.5, unite: 'ml', categorie: 'Plomberie', favori: true },
  { id: 'cat6', nom: 'Main d\'oeuvre pose carrelage', prix: 45, prixAchat: 0, unite: 'm²', categorie: 'Main d\'oeuvre', favori: true },
  { id: 'cat7', nom: 'Main d\'oeuvre peinture', prix: 25, prixAchat: 0, unite: 'm²', categorie: 'Main d\'oeuvre', favori: true },
  { id: 'cat8', nom: 'Sac de ciment 35kg', prix: 12, prixAchat: 7, unite: 'sac', categorie: 'Maçonnerie', favori: false }
];

const DEMO_DEVIS = [
  { id: 'd1', numero: 'DEV-2025-001', type: 'devis', client_id: 'c1', chantier_id: 'ch1', date: '2025-01-05', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Dépose cuisine existante', quantite: 1, unite: 'forfait', prixUnitaire: 800, montant: 800 }, { id: 'l2', description: 'Pose carrelage sol', quantite: 18, unite: 'm²', prixUnitaire: 45, montant: 810 }, { id: 'l3', description: 'Plomberie cuisine', quantite: 1, unite: 'forfait', prixUnitaire: 1200, montant: 1200 }, { id: 'l4', description: 'Électricité', quantite: 1, unite: 'forfait', prixUnitaire: 950, montant: 950 }], total_ht: 3760, tva: 376, total_ttc: 4136 },
  { id: 'd2', numero: 'DEV-2025-002', type: 'devis', client_id: 'c2', chantier_id: 'ch2', date: '2025-01-15', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Dépose salle de bain', quantite: 1, unite: 'forfait', prixUnitaire: 600, montant: 600 }, { id: 'l2', description: 'Pose douche italienne', quantite: 1, unite: 'forfait', prixUnitaire: 2500, montant: 2500 }, { id: 'l3', description: 'Carrelage mural', quantite: 25, unite: 'm²', prixUnitaire: 55, montant: 1375 }], total_ht: 4475, tva: 447.5, total_ttc: 4922.5 },
  { id: 'd3', numero: 'FAC-2024-015', type: 'facture', client_id: 'c3', chantier_id: 'ch3', date: '2024-12-20', statut: 'payee', tvaRate: 10, lignes: [{ id: 'l1', description: 'Peinture T3 complet', quantite: 85, unite: 'm²', prixUnitaire: 25, montant: 2125 }], total_ht: 2125, tva: 212.5, total_ttc: 2337.5 },
  { id: 'd4', numero: 'DEV-2025-003', type: 'devis', client_id: 'c4', chantier_id: 'ch4', date: '2025-01-25', validite: 60, statut: 'brouillon', tvaRate: 20, lignes: [{ id: 'l1', description: 'Gros oeuvre extension', quantite: 40, unite: 'm²', prixUnitaire: 450, montant: 18000 }, { id: 'l2', description: 'Toiture', quantite: 45, unite: 'm²', prixUnitaire: 180, montant: 8100 }, { id: 'l3', description: 'Menuiseries extérieures', quantite: 1, unite: 'forfait', prixUnitaire: 6500, montant: 6500 }], total_ht: 32600, tva: 6520, total_ttc: 39120 },
  { id: 'd5', numero: 'DEV-2025-004', type: 'devis', client_id: 'c5', chantier_id: 'ch5', date: '2025-01-02', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Rénovation studio complète', quantite: 25, unite: 'm²', prixUnitaire: 280, montant: 7000 }, { id: 'l2', description: 'Électricité', quantite: 1, unite: 'forfait', prixUnitaire: 1500, montant: 1500 }], total_ht: 8500, tva: 850, total_ttc: 9350 },
  { id: 'd6', numero: 'DEV-2025-005', type: 'devis', client_id: 'c6', chantier_id: 'ch6', date: '2025-01-20', validite: 45, statut: 'envoye', tvaRate: 20, lignes: [{ id: 'l1', description: 'Cloisons bureau', quantite: 30, unite: 'm²', prixUnitaire: 180, montant: 5400 }, { id: 'l2', description: 'Électricité complète', quantite: 1, unite: 'forfait', prixUnitaire: 4200, montant: 4200 }, { id: 'l3', description: 'Climatisation', quantite: 2, unite: 'unité', prixUnitaire: 1200, montant: 2400 }], total_ht: 12000, tva: 2400, total_ttc: 14400 },
  { id: 'd7', numero: 'FAC-2024-012', type: 'facture', client_id: 'c7', chantier_id: 'ch7', date: '2024-12-10', statut: 'payee', tvaRate: 10, lignes: [{ id: 'l1', description: 'Terrasse bois composite', quantite: 30, unite: 'm²', prixUnitaire: 180, montant: 5400 }, { id: 'l2', description: 'Structure porteuse', quantite: 1, unite: 'forfait', prixUnitaire: 1400, montant: 1400 }], total_ht: 6800, tva: 680, total_ttc: 7480 },
  { id: 'd8', numero: 'DEV-2025-006', type: 'devis', client_id: 'c8', chantier_id: 'ch8', date: '2025-01-10', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Rénovation plomberie complète', quantite: 1, unite: 'forfait', prixUnitaire: 8500, montant: 8500 }, { id: 'l2', description: 'Réfection électrique', quantite: 1, unite: 'forfait', prixUnitaire: 9500, montant: 9500 }, { id: 'l3', description: 'Peinture et finitions', quantite: 95, unite: 'm²', prixUnitaire: 65, montant: 6175 }, { id: 'l4', description: 'Sols', quantite: 75, unite: 'm²', prixUnitaire: 51, montant: 3825 }], total_ht: 28000, tva: 2800, total_ttc: 30800 },
  { id: 'd9', numero: 'FAC-2025-001', type: 'facture', client_id: 'c5', chantier_id: 'ch5', date: '2025-01-15', statut: 'envoye', tvaRate: 10, facture_type: 'acompte', devis_source_id: 'd5', lignes: [{ id: 'l1', description: 'Acompte 40% - Rénovation studio', quantite: 1, unite: 'forfait', prixUnitaire: 3400, montant: 3400 }], total_ht: 3400, tva: 340, total_ttc: 3740 }
];

const DEMO_DEPENSES = [
  { id: 'dep1', chantierId: 'ch1', description: 'Carrelage cuisine', montant: 520, categorie: 'Matériaux', date: '2025-01-12' },
  { id: 'dep2', chantierId: 'ch1', description: 'Robinetterie', montant: 380, categorie: 'Matériaux', date: '2025-01-14' },
  { id: 'dep3', chantierId: 'ch1', description: 'Électroménager', montant: 1850, categorie: 'Matériaux', date: '2025-01-18' },
  { id: 'dep4', chantierId: 'ch2', description: 'Receveur douche', montant: 450, categorie: 'Matériaux', date: '2025-01-22' },
  { id: 'dep5', chantierId: 'ch2', description: 'Carrelage mural', montant: 680, categorie: 'Matériaux', date: '2025-01-23' },
  { id: 'dep6', chantierId: 'ch3', description: 'Peinture + apprêt', montant: 320, categorie: 'Matériaux', date: '2024-12-05' },
  { id: 'dep7', chantierId: 'ch5', description: 'Électricité - câbles', montant: 280, categorie: 'Matériaux', date: '2025-01-08' },
  { id: 'dep8', chantierId: 'ch5', description: 'Plomberie - raccords', montant: 195, categorie: 'Matériaux', date: '2025-01-10' },
  { id: 'dep9', chantierId: 'ch7', description: 'Lames terrasse composite', montant: 2400, categorie: 'Matériaux', date: '2024-11-20' },
  { id: 'dep10', chantierId: 'ch7', description: 'Plots réglables', montant: 580, categorie: 'Matériaux', date: '2024-11-18' },
  { id: 'dep11', chantierId: 'ch8', description: 'Tuyaux cuivre', montant: 890, categorie: 'Matériaux', date: '2025-01-18' },
  { id: 'dep12', chantierId: 'ch8', description: 'Tableau électrique', montant: 1250, categorie: 'Matériaux', date: '2025-01-20' },
  { id: 'dep13', chantierId: 'ch8', description: 'Peinture premium', montant: 780, categorie: 'Matériaux', date: '2025-01-22' }
];

const DEMO_POINTAGES = [
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

const DEMO_EVENTS = [
  { id: 'ev1', title: 'RDV devis M. Lefevre', date: '2025-01-18', type: 'rdv', time: '10:00', description: 'Visite pour devis aménagement bureau' },
  { id: 'ev2', title: 'Livraison carrelage', date: '2025-01-19', chantierId: 'ch1', type: 'autre', description: 'Livraison Leroy Merlin' },
  { id: 'ev3', title: 'Relance devis Lefevre', date: '2025-01-25', type: 'relance', description: 'Relancer pour acceptation devis bureau' },
  { id: 'ev4', title: 'Fin chantier Rousseau', date: '2025-01-25', chantierId: 'ch5', type: 'chantier' },
  { id: 'ev5', title: 'RDV réception Dubois', date: '2025-01-28', chantierId: 'ch8', type: 'rdv', time: '14:00', description: 'Point avancement avec le client' },
  { id: 'ev6', title: 'Urgence fuite Martin', date: '2025-01-17', chantierId: 'ch2', type: 'urgence', description: 'Fuite détectée - intervention rapide' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [createMode, setCreateMode] = useState({ devis: false, chantier: false, client: false });
  // Initial test data for demo
  const [clients, setClients] = useState([
    { id: 'c1', nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@email.fr', telephone: '06 12 34 56 78', adresse: '12 rue des Lilas, 75011 Paris' },
    { id: 'c2', nom: 'Martin', prenom: 'Jean', email: 'j.martin@gmail.com', telephone: '06 98 76 54 32', adresse: '45 avenue Victor Hugo, 69006 Lyon' }
  ]);
  const [devis, setDevis] = useState([
    { id: 'd1', numero: 'DEV-2025-001', type: 'devis', client_id: 'c1', date: '2025-01-15', validite: 30, statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Rénovation cuisine complète', quantite: 1, unite: 'forfait', prixUnitaire: 5000, montant: 5000 }], total_ht: 5000, tva: 500, total_ttc: 5500 }
  ]);
  const [chantiers, setChantiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [equipe, setEquipe] = useState([
    { id: 'e1', nom: 'Moreau', prenom: 'Pierre', role: 'Chef de chantier', telephone: '06 11 11 11 11', tauxHoraire: 45, coutHoraireCharge: 28 }
  ]);
  const [pointages, setPointages] = useState([]);
  const [catalogue, setCatalogue] = useState([
    { id: 'cat1', nom: 'Carrelage 60x60', prix: 45, prixAchat: 28, unite: 'm²', categorie: 'Carrelage', favori: true },
    { id: 'cat2', nom: 'Peinture blanc mat', prix: 35, prixAchat: 18, unite: 'pot', categorie: 'Peinture', favori: true }
  ]);
  const [depenses, setDepenses] = useState([]);
  const [ajustements, setAjustements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '' });
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState('light');
  const [modeDiscret, setModeDiscret] = useState(false);
  const [entreprise, setEntreprise] = useState({ 
    nom: 'Martin Renovation', logo: '', couleur: '#f97316', 
    formeJuridique: '', capital: '', adresse: '', tel: '', email: '', siteWeb: '',
    siret: '', codeApe: '', rcs: '', tvaIntra: '', validiteDevis: 30, tvaDefaut: 10, 
    delaiPaiement: 30, acompteDefaut: 30, tauxFraisStructure: 15 
  });

  // Load settings from localStorage
  useEffect(() => { 
    try { 
      const e = localStorage.getItem('cp_entreprise'); if (e) setEntreprise(JSON.parse(e)); 
      const t = localStorage.getItem('cp_theme'); if (t) setTheme(t); 
      const m = localStorage.getItem('cp_mode_discret'); if (m) setModeDiscret(JSON.parse(m));
    } catch (err) {} 
  }, []);
  useEffect(() => { try { localStorage.setItem('cp_entreprise', JSON.stringify(entreprise)); } catch (e) {} }, [entreprise]);
  useEffect(() => { try { localStorage.setItem('cp_theme', theme); } catch (e) {} }, [theme]);
  useEffect(() => { try { localStorage.setItem('cp_mode_discret', JSON.stringify(modeDiscret)); } catch (e) {} }, [modeDiscret]);

  // Auth state listener - persists session across page refreshes
  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const u = await auth.getCurrentUser();
        setUser(u);
      } catch (e) {}
      finally { setLoading(false); }
    };
    checkAuth();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // CRUD functions
  const addClient = (data) => { const c = { id: Date.now().toString(), ...data }; setClients([...clients, c]); return c; };
  const addDevis = (data) => { const d = { id: Date.now().toString(), ...data }; setDevis([...devis, d]); return d; };
  const updateDevis = (id, data) => setDevis(devis.map(d => d.id === id ? { ...d, ...data } : d));
  const deleteDevis = (id) => setDevis(devis.filter(d => d.id !== id));
  const addChantier = (data) => { const c = { id: Date.now().toString(), ...data }; setChantiers([...chantiers, c]); return c; };
  const updateChantier = (id, data) => setChantiers(chantiers.map(c => c.id === id ? { ...c, ...data } : c));
  const addEvent = (data) => { const e = { id: Date.now().toString(), ...data }; setEvents([...events, e]); return e; };
  const addAjustement = (data) => { const a = { id: Date.now().toString(), ...data }; setAjustements([...ajustements, a]); return a; };
  const deleteAjustement = (id) => setAjustements(ajustements.filter(a => a.id !== id));
  const deductStock = (catalogueId, qty) => setCatalogue(catalogue.map(c => c.id === catalogueId ? { ...c, stock: Math.max(0, (c.stock || 0) - qty) } : c));

  const getChantierBilan = (chantierId) => {
    const ch = chantiers.find(c => c.id === chantierId);
    if (!ch) return { revenuPrevu: 0, revenuEncaisse: 0, coutMateriaux: 0, coutMO: 0, coutAutres: 0, margePrevisionnelle: 0, margeReelle: 0, tauxMargePrevi: 0, tauxMargeReelle: 0, heuresTotal: 0 };

    // Revenus
    const devisLie = devis.find(d => d.chantier_id === chantierId && d.type === 'devis');
    const revenuPrevu = devisLie?.total_ht || ch.budget_estime || 0;
    const revenuEncaisse = devis.filter(d => d.chantier_id === chantierId && d.type === 'facture' && d.statut === 'payee').reduce((s, d) => s + (d.total_ht || 0), 0);
    const facturesEnAttente = devis.filter(d => d.chantier_id === chantierId && d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ht || 0), 0);

    // Dépenses
    const coutMateriaux = depenses.filter(d => d.chantierId === chantierId).reduce((s, d) => s + (d.montant || 0), 0);
    const coutMO = pointages.filter(p => p.chantierId === chantierId).reduce((s, p) => { const emp = equipe.find(e => e.id === p.employeId); return s + (p.heures || 0) * (emp?.coutHoraireCharge || 45); }, 0);
    const chAjustements = ajustements.filter(a => a.chantierId === chantierId);
    const adjRevenus = chAjustements.filter(a => a.type === 'REVENU').reduce((s, a) => s + (a.montant_ht || 0), 0);
    const adjDepenses = chAjustements.filter(a => a.type === 'DEPENSE').reduce((s, a) => s + (a.montant_ht || 0), 0);
    const coutAutres = adjDepenses;
    const totalDepenses = coutMateriaux + coutMO + coutAutres;

    // Marges
    const revenuTotal = revenuPrevu + adjRevenus;
    const margePrevisionnelle = revenuTotal - totalDepenses;
    const tauxMargePrevi = revenuTotal > 0 ? (margePrevisionnelle / revenuTotal) * 100 : 0;
    const margeReelle = revenuEncaisse - totalDepenses;
    const tauxMargeReelle = revenuEncaisse > 0 ? (margeReelle / revenuEncaisse) * 100 : 0;

    const heuresTotal = pointages.filter(p => p.chantierId === chantierId).reduce((s, p) => s + (p.heures || 0), 0);

    // Legacy compatibility
    const caHT = revenuPrevu || revenuEncaisse;
    const marge = margePrevisionnelle;
    const tauxMarge = tauxMargePrevi;

    return { revenuPrevu, revenuEncaisse, facturesEnAttente, coutMateriaux, coutMO, coutAutres, adjRevenus, adjDepenses, totalDepenses, margePrevisionnelle, margeReelle, tauxMargePrevi, tauxMargeReelle, heuresTotal, caHT, marge, tauxMarge };
  };

  const stats = { 
    devisAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length, 
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length 
  };

  // Auth handlers
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const { error } = await auth.signIn(authForm.email, authForm.password);
      if (error) setAuthError(error.message);
    } catch (e) {
      setAuthError('Erreur de connexion.');
    }
  };
  
  const handleSignUp = async (e) => { 
    e.preventDefault(); 
    setAuthError(''); 
    try { 
      const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom }); 
      if (error) setAuthError(error.message); 
      else { alert('Compte cree avec succes!'); setShowSignUp(false); } 
    } catch (e) { 
      setAuthError('Erreur lors de la creation du compte'); 
    } 
  };
  
  const handleSignOut = async () => {
    try { await auth.signOut(); } catch (e) {}
    setUser(null);
  };
  
  const markNotifRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotifsRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));

  // Loading screen
  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <Building2 size={48} className="text-orange-500 animate-bounce" />
    </div>
  );

  const isDark = theme === 'dark';
  const tc = getThemeClasses(isDark);

  // Login Page
  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left - Hero */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-amber-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="max-w-lg">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">ChantierPro</h1>
            <p className="text-2xl text-white/90 mb-8">Pilotez votre rentabilite</p>
            <div className="space-y-4">
              {[
                { icon: BarChart3, text: 'Marge temps reel' }, 
                { icon: Users, text: 'Gestion equipe' }, 
                { icon: FileText, text: 'Devis & Factures' }, 
                { icon: Calendar, text: 'Planning' }
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-4 text-white/90">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <f.icon size={20} />
                  </div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ChantierPro</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Creer un compte' : 'Connexion'}</h2>
          <p className="text-slate-400 mb-8">{showSignUp ? 'Commencez gratuitement' : 'Accedez a votre espace'}</p>
          
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && (
              <input 
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none" 
                placeholder="Nom entreprise" 
                value={authForm.nom} 
                onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} 
              />
            )}
            <input 
              type="email" 
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none" 
              placeholder="Email" 
              value={authForm.email} 
              onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} 
              required 
            />
            <input 
              type="password" 
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none" 
              placeholder="Mot de passe" 
              value={authForm.password} 
              onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} 
              required 
            />
            {authError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                {authError}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              {showSignUp ? 'Creer mon compte' : 'Se connecter'}
            </button>
          </form>
          
          <p className="text-center text-slate-400 mt-6">
            {showSignUp ? 'Deja inscrit?' : 'Pas de compte?'}{' '}
            <button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 hover:text-orange-400">
              {showSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // Navigation items
  const nav = [
    { id: 'dashboard', icon: Home, label: 'Accueil' }, 
    { id: 'devis', icon: FileText, label: 'Devis & Factures', badge: stats.devisAttente }, 
    { id: 'chantiers', icon: Building2, label: 'Chantiers', badge: stats.chantiersEnCours }, 
    { id: 'planning', icon: Calendar, label: 'Planning' }, 
    { id: 'clients', icon: Users, label: 'Clients' }, 
    { id: 'catalogue', icon: Package, label: 'Catalogue' }, 
    { id: 'equipe', icon: HardHat, label: 'Equipe' }, 
    { id: 'settings', icon: SettingsIcon, label: 'Parametres' }
  ];
  
  const couleur = entreprise.couleur || '#f97316';
  const unreadNotifs = notifications.filter(n => !n.read);

  return (
    <div className={`min-h-screen ${tc.bg}`}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: couleur}}>
            <Building2 size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold truncate">{entreprise.nom || 'ChantierPro'}</h1>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        
        <nav className="p-3 space-y-1">
          {nav.map(n => (
            <button 
              key={n.id} 
              onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} 
              style={page === n.id ? {background: couleur} : {}}
            >
              <n.icon size={18} />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}
            </button>
          ))}
        </nav>
        
        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1 border-t border-slate-800">
          <button 
            onClick={() => setModeDiscret(!modeDiscret)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${modeDiscret ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            {modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}
            <span>Mode discret</span>
          </button>
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          <button 
            onClick={handleSignOut} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm transition-colors"
          >
            <LogOut size={18} />
            <span>Deconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 backdrop-blur border-b px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'text-white hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <Menu size={22} />
          </button>

          {modeDiscret && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              <EyeOff size={14} />
              <span className="hidden sm:inline">Discret</span>
            </span>
          )}

          <div className="flex-1" />

          {/* Help button */}
          <button
            onClick={() => setShowHelp(true)}
            className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`}
            title="Aide"
          >
            <HelpCircle size={20} />
          </button>

          {/* Mode discret toggle */}
          <button
            onClick={() => setModeDiscret(!modeDiscret)}
            className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${modeDiscret ? 'text-white' : isDark ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`}
            style={modeDiscret ? {background: couleur} : {}}
            title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
          >
            {modeDiscret ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${showNotifs ? 'text-white shadow-lg' : isDark ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`}
              style={showNotifs ? {background: couleur} : {}}
            >
              <Bell size={20} className={showNotifs ? 'animate-pulse' : ''} />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md" style={{background: couleur}}>
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setShowNotifs(false)} />
                <div className={`absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                  <div className="px-4 py-3 border-b" style={{background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)`, borderColor: isDark ? '#334155' : '#e2e8f0'}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} style={{color: couleur}} />
                        <h3 className={`font-semibold ${tc.text}`}>Notifications</h3>
                        {unreadNotifs.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full" style={{background: couleur}}>
                            {unreadNotifs.length} nouveau{unreadNotifs.length > 1 ? 'x' : ''}
                          </span>
                        )}
                      </div>
                      {unreadNotifs.length > 0 && (
                        <button onClick={markAllNotifsRead} className="text-xs hover:underline" style={{color: couleur}}>
                          Tout marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center" style={{background: `${couleur}15`}}>
                          <Bell size={28} style={{color: couleur}} />
                        </div>
                        <p className={`font-medium ${tc.text}`}>Tout est à jour</p>
                        <p className={`text-sm mt-1 ${tc.textMuted}`}>Aucune notification pour le moment</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markNotifRead(n.id)}
                          className={`px-4 py-3 cursor-pointer transition-all border-b last:border-0 ${!n.read ? (isDark ? 'bg-slate-700/50 border-l-2' : 'bg-orange-50/80 border-l-2') : ''} ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`}
                          style={!n.read ? {borderLeftColor: couleur} : {}}
                        >
                          <div className="flex items-start gap-3">
                            {!n.read && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background: couleur}}></span>}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${tc.text}`}>{n.message}</p>
                              <p className={`text-xs mt-1 ${tc.textMuted}`}>{n.date}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Quick add */}
          <div className="relative">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="px-3 sm:px-4 py-2.5 text-white rounded-xl flex items-center gap-2 transition-all hover:shadow-lg min-h-[44px]"
              style={{background: couleur}}
            >
              <Plus size={18} />
              <span className="hidden sm:inline text-sm font-medium">Nouveau</span>
            </button>
            
            {showQuickAdd && (
              <>
                <div className="fixed inset-0 z-40 animate-fade-in" onClick={() => setShowQuickAdd(false)} />
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                  {[
                    { label: 'Nouveau devis', icon: FileText, p: 'devis', create: 'devis' },
                    { label: 'Nouveau client', icon: Users, p: 'clients', create: 'client' },
                    { label: 'Nouveau chantier', icon: Building2, p: 'chantiers', create: 'chantier' }
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { if (item.create) setCreateMode(p => ({...p, [item.create]: true})); setPage(item.p); setShowQuickAdd(false); }} 
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-50 text-slate-900'}`}
                    >
                      <item.icon size={18} style={{color: couleur}} />
                      <span>{item.label}</span>
                      <ChevronRight size={16} className={`ml-auto ${tc.textMuted}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className={`p-3 sm:p-4 lg:p-6 ${tc.text}`}>
          {page === 'dashboard' && <Dashboard clients={clients} devis={devis} chantiers={chantiers} events={events} depenses={depenses} pointages={pointages} equipe={equipe} getChantierBilan={getChantierBilan} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} setCreateMode={setCreateMode} modeDiscret={modeDiscret} setModeDiscret={setModeDiscret} couleur={couleur} isDark={isDark} showHelp={showHelp} setShowHelp={setShowHelp} />}
          {page === 'devis' && <DevisPage clients={clients} setClients={setClients} devis={devis} setDevis={setDevis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={addDevis} onUpdate={updateDevis} onDelete={deleteDevis} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} isDark={isDark} couleur={couleur} createMode={createMode.devis} setCreateMode={(v) => setCreateMode(p => ({...p, devis: v}))} addChantier={addChantier} setPage={setPage} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={setDepenses} pointages={pointages} setPointages={setPointages} equipe={equipe} devis={devis} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} isDark={isDark} createMode={createMode.chantier} setCreateMode={(v) => setCreateMode(p => ({...p, chantier: v}))} />}
          {page === 'planning' && <Planning events={events} setEvents={setEvents} addEvent={addEvent} chantiers={chantiers} equipe={equipe} setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier} couleur={couleur} isDark={isDark} />}
          {page === 'clients' && <Clients clients={clients} setClients={setClients} devis={devis} chantiers={chantiers} onSubmit={addClient} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} isDark={isDark} createMode={createMode.client} setCreateMode={(v) => setCreateMode(p => ({...p, client: v}))} />}
          {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={setCatalogue} couleur={couleur} isDark={isDark} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={setEquipe} pointages={pointages} setPointages={setPointages} chantiers={chantiers} couleur={couleur} isDark={isDark} />}
          {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} isDark={isDark} couleur={couleur} />}
        </main>
      </div>
    </div>
  );
}
