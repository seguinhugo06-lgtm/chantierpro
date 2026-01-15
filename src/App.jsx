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

const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';

// Skeleton Components
const Skeleton = ({ className = '' }) => <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
const CardSkeleton = () => <div className="bg-white rounded-2xl border p-5 space-y-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-3 w-2/3" /></div>;
const PageSkeleton = () => <div className="space-y-6"><div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-32" /></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <CardSkeleton key={i} />)}</div></div>;

// Safe API wrapper
const safeApiCall = async (fn, fallback = null) => {
  try { const result = await fn(); return result?.data ?? fallback; } 
  catch (error) { console.warn('API error:', error?.message); return fallback; }
};

export default function App() {
  const demoUser = { email: 'demo@chantierpro.test', user_metadata: { nom: 'Artisan Démo' } };
  const [user, setUser] = useState(isDemo ? demoUser : null);
  const [loading, setLoading] = useState(!isDemo);
  const [dataLoading, setDataLoading] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [pointages, setPointages] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [ajustements, setAjustements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '' });
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState('light');
  const [modeDiscret, setModeDiscret] = useState(false);
  const [entreprise, setEntreprise] = useState({ 
    nom: '', logo: '', couleur: '#f97316', 
    formeJuridique: '', capital: '', adresse: '', tel: '', email: '', siteWeb: '',
    siret: '', codeApe: '', rcs: '', tvaIntra: '',
    rge: '', rgeOrganisme: '', cartePro: '',
    rcProAssureur: '', rcProNumero: '', rcProZone: 'France entière',
    decennaleAssureur: '', decennaleNumero: '', decennaleValidite: '', decennaleActivites: '',
    banque: '', titulaireBanque: '', iban: '', bic: '',
    validiteDevis: 30, tvaDefaut: 10, delaiPaiement: 30, acompteDefaut: 30,
    notesDefaut: '', mentionRetractation: true, mentionGaranties: true,
    tauxFraisStructure: 15 
  });

  useEffect(() => { try { const e = localStorage.getItem('cp_entreprise'); if (e) setEntreprise(JSON.parse(e)); const t = localStorage.getItem('cp_theme'); if (t) setTheme(t); const m = localStorage.getItem('cp_mode_discret'); if (m) setModeDiscret(JSON.parse(m)); } catch (err) {} }, []);
  useEffect(() => { try { localStorage.setItem('cp_entreprise', JSON.stringify(entreprise)); } catch (e) {} }, [entreprise]);
  useEffect(() => { try { localStorage.setItem('cp_theme', theme); } catch (e) {} }, [theme]);
  useEffect(() => { try { localStorage.setItem('cp_mode_discret', JSON.stringify(modeDiscret)); } catch (e) {} }, [modeDiscret]);

  const loadDemoData = () => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
    
    setClients([
      { id: 'c1', nom: 'Dupont', prenom: 'Jean', telephone: '06 12 34 56 78', email: 'jean.dupont@email.fr', adresse: '12 rue des Lilas, 75001 Paris', notes: 'Code portail: 1234' },
      { id: 'c2', nom: 'Martin', prenom: 'Marie', telephone: '06 98 76 54 32', email: 'marie.martin@email.fr', adresse: '45 avenue Victor Hugo, 69001 Lyon' },
      { id: 'c3', nom: 'Bernard', prenom: 'Pierre', entreprise: 'SCI Les Oliviers', telephone: '07 11 22 33 44', adresse: '8 place de la Mairie, 13001 Marseille' },
      { id: 'c4', nom: 'Leroy', prenom: 'Sophie', telephone: '06 77 88 99 00', email: 'sophie.leroy@gmail.com', adresse: '23 boulevard Pasteur, 33000 Bordeaux' },
    ]);
    setCatalogue([
      { id: 'cat1', nom: 'Pose carrelage sol', prix: 45, prixAchat: 12, unite: 'm²', categorie: 'Carrelage', favori: true, stock_actuel: 50, stock_seuil_alerte: 20 },
      { id: 'cat2', nom: 'Pose carrelage mural', prix: 55, prixAchat: 15, unite: 'm²', categorie: 'Carrelage', favori: true, stock_actuel: 30, stock_seuil_alerte: 10 },
      { id: 'cat3', nom: 'Peinture murs', prix: 25, prixAchat: 8, unite: 'm²', categorie: 'Peinture', favori: true, stock_actuel: 8, stock_seuil_alerte: 15 },
      { id: 'cat4', nom: 'Plomberie MO', prix: 55, prixAchat: 0, unite: 'h', categorie: 'Plomberie', favori: true },
      { id: 'cat5', nom: 'Remplacement WC', prix: 450, prixAchat: 180, unite: 'forfait', categorie: 'Plomberie', favori: true, stock_actuel: 3, stock_seuil_alerte: 2 },
      { id: 'cat6', nom: 'Électricité point', prix: 85, prixAchat: 25, unite: 'unité', categorie: 'Électricité', favori: false, stock_actuel: 25, stock_seuil_alerte: 10 },
      { id: 'cat7', nom: 'Déplacement', prix: 50, prixAchat: 15, unite: 'forfait', categorie: 'Autre', favori: true },
      { id: 'cat8', nom: 'Sac ciment 35kg', prix: 8.50, prixAchat: 5.20, unite: 'unité', categorie: 'Matériaux', favori: false, stock_actuel: 15, stock_seuil_alerte: 5 },
    ]);
    setChantiers([
      { id: 'ch1', nom: 'Rénovation SDB Dupont', client_id: 'c1', adresse: '12 rue des Lilas, Paris', statut: 'en_cours', date_debut: formatDate(addDays(today, -10)), date_fin: formatDate(addDays(today, 10)), fraisFixes: 10, avancement: 65, photos: [], taches: [{ id: 't1', text: 'Démolition', done: true }, { id: 't2', text: 'Pose carrelage sol', done: true }, { id: 't3', text: 'Pose carrelage mur', done: false }, { id: 't4', text: 'Plomberie', done: false }], notes: 'Client très sympa, prévoir café' },
      { id: 'ch2', nom: 'Peinture T3 Martin', client_id: 'c2', adresse: '45 avenue Victor Hugo, Lyon', statut: 'en_cours', date_debut: formatDate(addDays(today, -3)), date_fin: formatDate(addDays(today, 4)), fraisFixes: 8, avancement: 40, photos: [], taches: [{ id: 't5', text: 'Lessivage murs', done: true }, { id: 't6', text: 'Sous-couche', done: false }, { id: 't7', text: 'Peinture finition', done: false }], notes: '' },
      { id: 'ch3', nom: 'Cuisine moderne Bernard', client_id: 'c3', adresse: '8 place de la Mairie, Marseille', statut: 'prospect', date_debut: formatDate(addDays(today, 15)), date_fin: formatDate(addDays(today, 45)), fraisFixes: 12, avancement: 0, photos: [], taches: [], notes: 'Attente validation devis' },
    ]);
    setDevis([
      { id: 'dv1', numero: 'DEV-2024-001', client_id: 'c1', client_nom: 'Jean Dupont', chantier_id: 'ch1', date: formatDate(addDays(today, -15)), type: 'devis', statut: 'accepte', tvaRate: 10, total_ht: 2850, tva: 285, total_ttc: 3135, lignes: [{ id: 'l1', description: 'Démolition SDB', quantite: 8, unite: 'm²', prixUnitaire: 35, montant: 280, tva: 10 }, { id: 'l2', description: 'Pose carrelage sol + mur', quantite: 33, unite: 'm²', prixUnitaire: 50, montant: 1650, tva: 10 }, { id: 'l3', description: 'Plomberie complète', quantite: 15, unite: 'h', prixUnitaire: 55, montant: 825, tva: 10 }, { id: 'l4', description: 'Fournitures sanitaires', quantite: 1, unite: 'lot', prixUnitaire: 95, montant: 95, tva: 20 }], signature: 'signed', signatureDate: formatDate(addDays(today, -12)) },
      { id: 'dv2', numero: 'DEV-2024-002', client_id: 'c2', client_nom: 'Marie Martin', chantier_id: 'ch2', date: formatDate(addDays(today, -5)), type: 'devis', statut: 'envoye', tvaRate: 10, total_ht: 1500, tva: 150, total_ttc: 1650, lignes: [{ id: 'l5', description: 'Peinture murs 3 pièces', quantite: 60, unite: 'm²', prixUnitaire: 25, montant: 1500, tva: 10 }]},
      { id: 'dv3', numero: 'DEV-2024-003', client_id: 'c3', client_nom: 'Pierre Bernard', chantier_id: 'ch3', date: formatDate(addDays(today, -2)), type: 'devis', statut: 'envoye', tvaRate: 10, total_ht: 8500, tva: 850, total_ttc: 9350, lignes: [{ id: 'l6', description: 'Cuisine complète pose + fournitures', quantite: 1, unite: 'forfait', prixUnitaire: 8500, montant: 8500, tva: 10 }]},
      { id: 'dv4', numero: 'FACT-2024-001', client_id: 'c1', client_nom: 'Jean Dupont', chantier_id: 'ch1', devis_source: 'dv1', date: formatDate(addDays(today, -8)), type: 'facture', statut: 'payee', tvaRate: 10, total_ht: 1035, tva: 103.5, total_ttc: 1138.5, acompte_pct: 33, lignes: [{ id: 'l7', description: 'Acompte 33% - Rénovation SDB', quantite: 1, unite: 'forfait', prixUnitaire: 1035, montant: 1035, tva: 10 }]},
      { id: 'dv5', numero: 'FACT-2024-002', client_id: 'c4', client_nom: 'Sophie Leroy', date: formatDate(addDays(today, -20)), type: 'facture', statut: 'envoye', tvaRate: 10, total_ht: 850, tva: 85, total_ttc: 935, lignes: [{ id: 'l8', description: 'Dépannage plomberie', quantite: 1, unite: 'forfait', prixUnitaire: 850, montant: 850, tva: 10 }]},
    ]);
    setEquipe([
      { id: 'e1', nom: 'Durand', prenom: 'Luc', telephone: '06 55 44 33 22', email: 'luc.durand@email.fr', tauxHoraire: 45, coutHoraireCharge: 28, couleur: '#3b82f6' },
      { id: 'e2', nom: 'Petit', prenom: 'Marc', telephone: '06 11 22 33 44', email: 'marc.petit@email.fr', tauxHoraire: 40, coutHoraireCharge: 25, couleur: '#10b981' }
    ]);
    setPointages([
      { id: 'p1', employeId: 'e1', chantierId: 'ch1', date: formatDate(addDays(today, -10)), heures: 8, approuve: true, verrouille: true },
      { id: 'p2', employeId: 'e1', chantierId: 'ch1', date: formatDate(addDays(today, -9)), heures: 7.5, approuve: true, verrouille: true },
      { id: 'p3', employeId: 'e2', chantierId: 'ch1', date: formatDate(addDays(today, -9)), heures: 8, approuve: true, verrouille: false },
      { id: 'p4', employeId: 'e1', chantierId: 'ch1', date: formatDate(addDays(today, -8)), heures: 8, approuve: true, verrouille: false },
      { id: 'p5', employeId: 'e1', chantierId: 'ch2', date: formatDate(addDays(today, -3)), heures: 6, approuve: true, verrouille: false },
      { id: 'p6', employeId: 'e2', chantierId: 'ch2', date: formatDate(addDays(today, -2)), heures: 7, approuve: false, verrouille: false }
    ]);
    setDepenses([
      { id: 'dep1', chantierId: 'ch1', description: 'Carrelage Leroy Merlin', montant: 450, date: formatDate(addDays(today, -12)), categorie: 'Matériaux' },
      { id: 'dep2', chantierId: 'ch1', description: 'Colle + joints', montant: 85, date: formatDate(addDays(today, -12)), categorie: 'Matériaux' },
      { id: 'dep3', chantierId: 'ch1', description: 'Robinetterie Grohe', montant: 280, date: formatDate(addDays(today, -7)), categorie: 'Matériaux' },
      { id: 'dep4', chantierId: 'ch2', description: 'Peinture Tollens 20L', montant: 320, date: formatDate(addDays(today, -4)), categorie: 'Matériaux' },
      { id: 'dep5', chantierId: 'ch2', description: 'Bâches + scotch', montant: 45, date: formatDate(addDays(today, -4)), categorie: 'Matériaux' }
    ]);
    setAjustements([
      { id: 'adj1', chantierId: 'ch1', type: 'REVENU', libelle: 'Supplément faïence plafond', montant_ht: 350 },
      { id: 'adj2', chantierId: 'ch1', type: 'DEPENSE', libelle: 'Location perforateur', montant_ht: 45 }
    ]);
    // ÉVÉNEMENTS PLANNING - Données démo complètes
    setEvents([
      { id: 'ev1', title: 'RDV Devis Bernard', date: formatDate(addDays(today, 1)), type: 'rdv', time: '10:00', description: 'Visite appartement pour devis cuisine. Apporter catalogue.' },
      { id: 'ev2', title: 'Relance devis Martin', date: formatDate(addDays(today, 2)), type: 'relance', time: '14:00', description: 'Appeler Mme Martin pour relancer le devis peinture T3' },
      { id: 'ev3', title: 'Livraison carrelage', date: formatDate(addDays(today, 3)), type: 'autre', time: '08:00', description: 'Livraison Leroy Merlin - Carrelage SDB Dupont', employeId: 'e1' },
      { id: 'ev4', title: 'RDV Nouveau prospect', date: formatDate(addDays(today, 5)), type: 'rdv', time: '11:00', description: 'M. Durand - Rénovation complète maison 120m²' },
      { id: 'ev5', title: 'Urgence fuite Leroy', date: formatDate(today), type: 'urgence', time: '09:00', description: 'Fuite sous évier cuisine - intervention urgente', employeId: 'e2' },
      { id: 'ev6', title: 'Formation sécurité', date: formatDate(addDays(today, 7)), type: 'autre', time: '09:00', description: 'Formation annuelle sécurité chantier - équipe complète' },
      { id: 'ev7', title: 'Réception chantier Dupont', date: formatDate(addDays(today, 12)), type: 'rdv', time: '16:00', description: 'Visite finale avec le client pour réception travaux' },
    ]);
    setEntreprise({ 
      nom: 'Martin Rénovation', 
      couleur: '#f97316', 
      formeJuridique: 'SARL',
      capital: '10000',
      siret: '123 456 789 00012', 
      codeApe: '4339Z',
      rcsVille: 'Paris',
      rcsNumero: '123456789',
      tvaIntra: 'FR12345678901', 
      adresse: '25 rue du Commerce\n75015 Paris', 
      tel: '01 23 45 67 89', 
      email: 'contact@martin-renovation.fr', 
      siteWeb: 'www.martin-renovation.fr',
      iban: 'FR76 1234 5678 9012 3456 7890 123',
      bic: 'BNPAFRPP',
      banque: 'BNP Paribas',
      rcProAssureur: 'AXA',
      rcProNumero: 'RC-456789',
      rcProValidite: formatDate(addDays(today, 180)),
      decennaleAssureur: 'SMABTP',
      decennaleNumero: 'DEC-123456',
      decennaleValidite: formatDate(addDays(today, 250)),
      validiteDevis: 30,
      tvaDefaut: 10,
      acompteDefaut: 30,
      delaiPaiement: 30,
      tauxFraisStructure: 15,
      mentionRetractation: true,
      mentionGaranties: true,
      logo: '' 
    });
    setLoading(false);
  };

  useEffect(() => { 
    if (isDemo) { loadDemoData(); return; } 
    const initAuth = async () => { try { const u = await safeApiCall(() => auth.getCurrentUser(), null); setUser(u); } catch (e) {} finally { setLoading(false); } };
    initAuth();
    let subscription;
    try { const sub = auth.onAuthStateChange((event, session) => { if (event !== 'INITIAL_SESSION') setUser(session?.user ?? null); }); subscription = sub?.data?.subscription; } catch (e) {}
    return () => subscription?.unsubscribe?.();
  }, []);

  useEffect(() => { if (user && !isDemo) loadUserData(); }, [user]);

  const loadUserData = async () => {
    setDataLoading(true);
    try { const [c, d] = await Promise.all([safeApiCall(() => clientsDB.getAll(), []), safeApiCall(() => devisDB.getAll(), [])]); if (c) setClients(c); if (d) setDevis(d); } catch (e) {}
    ['chantiers', 'events', 'equipe', 'pointages', 'catalogue', 'depenses', 'ajustements'].forEach(k => { try { const v = localStorage.getItem('cp_' + k); if (v) { const p = JSON.parse(v); if (k === 'chantiers') setChantiers(p); if (k === 'events') setEvents(p); if (k === 'equipe') setEquipe(p); if (k === 'pointages') setPointages(p); if (k === 'catalogue') setCatalogue(p); if (k === 'depenses') setDepenses(p); if (k === 'ajustements') setAjustements(p); }} catch (e) {} });
    setDataLoading(false);
  };

  useEffect(() => {
    const notifs = [];
    devis.filter(d => d.type === 'facture' && ['envoyee', 'envoye'].includes(d.statut)).forEach(d => { const days = Math.floor((Date.now() - new Date(d.date)) / 86400000); if (days > 30) notifs.push({ id: 'r'+d.id, icon: '🔴', msg: `Retard: ${d.numero}`, action: () => setPage('devis') }); else if (days > 15) notifs.push({ id: 'a'+d.id, icon: '🟡', msg: `Relance: ${d.numero}`, action: () => setPage('devis') }); });
    chantiers.filter(c => c.statut === 'en_cours').forEach(ch => { const bilan = getChantierBilan(ch.id); if (bilan.marge < 0) notifs.push({ id: 'marge'+ch.id, icon: '🔴', msg: `Marge: ${ch.nom} (${bilan.tauxMarge.toFixed(1)}%)`, action: () => { setSelectedChantier(ch.id); setPage('chantiers'); } }); else if (bilan.tauxMarge < 15 && bilan.tauxMarge > 0) notifs.push({ id: 'margelow'+ch.id, icon: '🟠', msg: `Marge faible: ${ch.nom} (${bilan.tauxMarge.toFixed(1)}%)`, action: () => { setSelectedChantier(ch.id); setPage('chantiers'); } }); });
    catalogue.filter(c => c.stock_actuel !== undefined && c.stock_seuil_alerte !== undefined && c.stock_actuel < c.stock_seuil_alerte).forEach(c => notifs.push({ id: 'stock'+c.id, icon: '📦', msg: `Stock: ${c.nom} (${c.stock_actuel}/${c.stock_seuil_alerte})`, action: () => setPage('catalogue') }));
    setNotifications(notifs);
  }, [devis, chantiers, pointages, depenses, catalogue, ajustements]);

  const save = (k, d) => { try { localStorage.setItem('cp_' + k, JSON.stringify(d)); } catch (e) {} };
  const handleClientSubmit = async (data) => { const n = { id: Date.now().toString(), ...data }; if (!isDemo) { try { await clientsDB.create(data); const r = await safeApiCall(() => clientsDB.getAll(), null); if (r) { setClients(r); return; } } catch (e) {} } setClients(prev => [...prev, n]); };
  const handleDevisSubmit = async (data) => { const n = { id: Date.now().toString(), ...data }; if (!isDemo) { try { await devisDB.create(data); const r = await safeApiCall(() => devisDB.getAll(), null); if (r) { setDevis(r); return; } } catch (e) {} } setDevis(prev => [...prev, n]); };
  const handleDevisUpdate = async (id, data) => { if (!isDemo) { try { await devisDB.update(id, data); const r = await safeApiCall(() => devisDB.getAll(), null); if (r) { setDevis(r); return; } } catch (e) {} } setDevis(prev => prev.map(d => d.id === id ? { ...d, ...data } : d)); };
  const handleDevisDelete = async (id) => { if (!isDemo) { try { await devisDB.delete(id); const r = await safeApiCall(() => devisDB.getAll(), null); if (r) { setDevis(r); return; } } catch (e) {} } setDevis(prev => prev.filter(d => d.id !== id)); };
  const addChantier = (ch) => { const n = { id: Date.now().toString(), ...ch, photos: [], taches: [], notes: '', fraisFixes: entreprise.tauxFraisStructure || 15, margePrevisionnelle: 25 }; setChantiers(prev => { const u = [...prev, n]; save('chantiers', u); return u; }); };
  const updateChantier = (id, data) => { setChantiers(prev => { const u = prev.map(c => c.id === id ? { ...c, ...data } : c); save('chantiers', u); return u; }); };
  const addAjustement = (data) => { const n = { id: Date.now().toString(), ...data }; setAjustements(prev => { const u = [...prev, n]; save('ajustements', u); return u; }); };
  const deleteAjustement = (id) => { setAjustements(prev => { const u = prev.filter(a => a.id !== id); save('ajustements', u); return u; }); };
  const deductStock = (catalogueId, quantity) => { setCatalogue(prev => { const u = prev.map(c => c.id === catalogueId && c.stock_actuel !== undefined ? { ...c, stock_actuel: Math.max(0, c.stock_actuel - quantity) } : c); save('catalogue', u); return u; }); };
  const addEvent = (ev) => { const n = { id: Date.now().toString(), ...ev }; setEvents(prev => { const u = [...prev, n]; save('events', u); return u; }); };

  const getChantierBilan = (chantierId) => {
    const ch = chantiers.find(c => c.id === chantierId);
    const chAdj = ajustements.filter(a => a.chantierId === chantierId);
    const adjRevenus = chAdj.filter(a => a.type === 'REVENU').reduce((s, a) => s + (a.montant_ht || 0), 0);
    const adjDepenses = chAdj.filter(a => a.type === 'DEPENSE').reduce((s, a) => s + (a.montant_ht || 0), 0);
    const caDevis = devis.filter(d => d.chantier_id === chantierId && ['accepte', 'payee'].includes(d.statut)).reduce((s, d) => s + (d.total_ht || 0), 0);
    const caHT = caDevis + adjRevenus;
    const coutMateriaux = depenses.filter(d => d.chantierId === chantierId).reduce((s, d) => s + (d.montant || 0), 0);
    const coutMO = pointages.filter(p => p.chantierId === chantierId && p.approuve !== false).reduce((s, p) => { const emp = equipe.find(e => e.id === p.employeId); const cout = emp?.coutHoraireCharge || (emp?.tauxHoraire ? emp.tauxHoraire * 0.6 : 28); return s + ((p.heures || 0) * cout); }, 0);
    const tauxFrais = ch?.fraisFixes || entreprise.tauxFraisStructure || 15;
    const fraisFixes = caHT * (tauxFrais / 100);
    const marge = caHT - coutMateriaux - coutMO - fraisFixes - adjDepenses;
    const tauxMarge = caHT > 0 ? (marge / caHT) * 100 : 0;
    const heuresTotal = pointages.filter(p => p.chantierId === chantierId).reduce((s, p) => s + (p.heures || 0), 0);
    const margePrevue = devis.filter(d => d.chantier_id === chantierId && d.statut === 'accepte').reduce((s, d) => s + (d.margePrevue || 0), 0);
    return { caHT, caDevis, adjRevenus, adjDepenses, coutMateriaux, coutMO, fraisFixes, marge, tauxMarge, margePrevue, heuresTotal };
  };

  const getStatsGlobales = () => {
    let totalCA = 0, totalMarge = 0;
    chantiers.filter(c => c.statut === 'en_cours').forEach(ch => { const b = getChantierBilan(ch.id); totalCA += b.caHT; totalMarge += b.marge; });
    return { caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0), enAttente: devis.filter(d => d.type === 'facture' && ['envoyee', 'envoye'].includes(d.statut)).reduce((s, d) => s + (d.total_ttc || 0), 0), devisAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length, chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length, margeGlobale: totalMarge, tauxMargeGlobal: totalCA > 0 ? (totalMarge / totalCA) * 100 : 0 };
  };

  const stats = getStatsGlobales();
  const handleSignIn = async (e) => { e.preventDefault(); setAuthError(''); try { const { error } = await auth.signIn(authForm.email, authForm.password); if (error) setAuthError(error.message); } catch (e) { setAuthError('Erreur de connexion'); } };
  const handleSignUp = async (e) => { e.preventDefault(); setAuthError(''); try { const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom }); if (error) setAuthError(error.message); else { alert('Compte créé !'); setShowSignUp(false); } } catch (e) { setAuthError('Erreur'); } };
  const handleSignOut = async () => { try { await auth.signOut(); } catch (e) {} setUser(null); if (isDemo) window.location.href = window.location.pathname; };

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="text-center"><div className="text-6xl animate-bounce mb-4">🏗️</div><p className="text-slate-500">Chargement...</p></div></div>;

  if (!user && !isDemo) return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center"><div className="max-w-md text-white"><div className="text-6xl mb-6">🏗️</div><h1 className="text-4xl font-bold mb-4">ChantierPro</h1><p className="text-xl opacity-90">Pilotez votre rentabilité.</p><ul className="mt-6 space-y-2 opacity-80"><li>✓ Marge temps réel</li><li>✓ Gestion équipe</li><li>✓ Devis & Factures</li><li>✓ Planning interactif</li></ul></div></div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-white mb-6">{showSignUp ? 'Inscription' : 'Connexion'}</h2>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Nom entreprise" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} />}
            <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Email" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl">{showSignUp ? 'Créer' : 'Connexion'}</button>
          </form>
          <p className="text-center text-slate-400 mt-6">{showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}<button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 ml-2">{showSignUp ? 'Connexion' : "S'inscrire"}</button></p>
          <div className="mt-8 pt-6 border-t border-slate-700"><a href="?demo=true" className="block w-full py-3 bg-slate-700 text-white rounded-xl text-center">🎮 Démo</a></div>
        </div>
      </div>
    </div>
  );

  const nav = [{ id: 'dashboard', icon: '📊', label: 'Accueil' }, { id: 'devis', icon: '📄', label: 'Devis & Factures', badge: stats.devisAttente }, { id: 'chantiers', icon: '🏗️', label: 'Chantiers', badge: stats.chantiersEnCours }, { id: 'planning', icon: '📅', label: 'Planning' }, { id: 'clients', icon: '👥', label: 'Clients' }, { id: 'catalogue', icon: '📦', label: 'Catalogue' }, { id: 'equipe', icon: '👷', label: 'Équipe' }, { id: 'settings', icon: '⚙️', label: 'Paramètres' }];
  const couleur = entreprise.couleur || '#f97316';
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background: couleur}}>🏗️</div><div className="flex-1 min-w-0"><h1 className="text-white font-bold truncate">{entreprise.nom || 'ChantierPro'}</h1><p className="text-slate-500 text-xs">{isDemo ? '🎮 Démo' : user?.email}</p></div></div>
        <nav className="p-3 space-y-1">{nav.map(n => <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800'}`} style={page === n.id ? {background: couleur} : {}}><span className="text-lg">{n.icon}</span><span className="flex-1 text-left">{n.label}</span>{n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}</button>)}</nav>
        <div className="absolute bottom-28 left-0 right-0 px-3"><button onClick={() => setModeDiscret(!modeDiscret)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${modeDiscret ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>{modeDiscret ? '👁️‍🗨️ Discret ON' : '👁️ Mode discret'}</button></div>
        <div className="absolute bottom-16 left-0 right-0 px-3"><button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">{isDark ? '☀️ Clair' : '🌙 Sombre'}</button></div>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800"><button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">🚪 {isDemo ? 'Quitter' : 'Déconnexion'}</button></div>
      </aside>

      <div className="lg:pl-64">
        <header className={`sticky top-0 z-30 ${isDark ? 'bg-slate-800/95' : 'bg-white/95'} backdrop-blur border-b px-4 py-3 flex items-center gap-4`}>
          <button onClick={() => setSidebarOpen(true)} className={`lg:hidden p-2 text-xl ${isDark ? 'text-white' : ''}`}>☰</button>
          {isDemo && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">🎮 Démo</span>}
          {modeDiscret && <span className="px-3 py-1 bg-slate-700 text-white rounded-full text-xs font-medium">👁️‍🗨️</span>}
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className={`relative p-2.5 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><span className="text-xl">🔔</span>{notifications.length > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifications.length}</span>}</button>
            {showNotifs && <div className={`absolute top-full right-0 mt-2 w-80 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl border z-50 max-h-80 overflow-y-auto`}><div className={`px-4 py-3 border-b font-semibold ${isDark ? 'text-white' : ''}`}>Alertes ({notifications.length})</div>{notifications.length === 0 ? <p className="p-4 text-center text-slate-500">✅ RAS</p> : notifications.map(n => <div key={n.id} onClick={() => { n.action?.(); setShowNotifs(false); }} className={`flex items-center gap-3 px-4 py-3 text-sm border-b last:border-0 cursor-pointer ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'hover:bg-slate-50'}`}><span>{n.icon}</span><span className="flex-1">{n.msg}</span><span className="text-slate-400">→</span></div>)}</div>}
          </div>
          <div className="relative">
            <button onClick={() => setShowQuickAdd(!showQuickAdd)} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium" style={{background: couleur}}>+ Nouveau</button>
            {showQuickAdd && <div className={`absolute top-full right-0 mt-2 w-48 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl border z-50`}>{[{icon:'📄',label:'Devis',p:'devis'},{icon:'🏗️',label:'Chantier',p:'chantiers'},{icon:'👤',label:'Client',p:'clients'},{icon:'📅',label:'Événement',p:'planning'}].map((item, i) => <button key={i} onClick={() => { setPage(item.p); setShowQuickAdd(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-b last:border-0 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}><span>{item.icon}</span>{item.label}</button>)}</div>}
          </div>
          {showQuickAdd && <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />}
          {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
        </header>

        <main className={`p-4 lg:p-6 ${isDark ? 'text-white' : ''}`}>
          {dataLoading ? <PageSkeleton /> : <>
            {page === 'dashboard' && <Dashboard chantiers={chantiers} clients={clients} devis={devis} depenses={depenses} pointages={pointages} equipe={equipe} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} setModeDiscret={setModeDiscret} setActiveModule={setPage} setSelectedChantier={setSelectedChantier} />}
            {page === 'devis' && <DevisPage clients={clients} setClients={setClients} devis={devis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={handleDevisSubmit} onUpdate={handleDevisUpdate} onDelete={handleDevisDelete} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} />}
            {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={d => { setDepenses(d); save('depenses', d); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} equipe={equipe} devis={devis} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} />}
            {page === 'planning' && <Planning events={events} setEvents={e => { setEvents(e); save('events', e); }} addEvent={addEvent} chantiers={chantiers} equipe={equipe} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier} />}
            {page === 'clients' && <Clients clients={clients} setClients={setClients} devis={devis} chantiers={chantiers} onSubmit={handleClientSubmit} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} />}
            {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={c => { setCatalogue(c); save('catalogue', c); }} couleur={couleur} />}
            {page === 'equipe' && <Equipe equipe={equipe} setEquipe={e => { setEquipe(e); save('equipe', e); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} chantiers={chantiers} couleur={couleur} />}
            {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} />}
          </>}
        </main>
      </div>
    </div>
  );
}
