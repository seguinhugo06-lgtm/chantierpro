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

// Mode démo: ?demo=true dans l'URL = 100% localStorage, pas de Supabase
const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';

export default function App() {
  const demoUser = { email: 'demo@chantierpro.test', user_metadata: { nom: 'Artisan Démo', entreprise: 'Martin Rénovation' } };
  
  const [user, setUser] = useState(isDemo ? demoUser : null);
  const [loading, setLoading] = useState(!isDemo);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [pointages, setPointages] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', entreprise: '' });
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState('light');
  const [entreprise, setEntreprise] = useState({
    nom: '', logo: '', couleur: '#f97316', siret: '', tvaIntra: '', assurance: '', rib: '', adresse: '', tel: '', email: ''
  });

  // Charger préférences
  useEffect(() => {
    const e = localStorage.getItem('cp_entreprise');
    if (e) setEntreprise(JSON.parse(e));
    const t = localStorage.getItem('cp_theme');
    if (t) setTheme(t);
    // Premier lancement = tutoriel
    if (!localStorage.getItem('cp_tutorial_done') && !isDemo) {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => { localStorage.setItem('cp_entreprise', JSON.stringify(entreprise)); }, [entreprise]);
  useEffect(() => { localStorage.setItem('cp_theme', theme); }, [theme]);

  // Auth (seulement si pas en mode démo)
  useEffect(() => {
    if (isDemo) return;
    let m = true;
    auth.getCurrentUser().then(u => { if (m) { setUser(u); setLoading(false); } }).catch(() => { if (m) setLoading(false); });
    const r = auth.onAuthStateChange((e, s) => { if (m && e !== 'INITIAL_SESSION') setUser(s?.user ?? null); });
    return () => { m = false; r?.data?.subscription?.unsubscribe(); };
  }, []);

  // Charger données
  useEffect(() => { if (user) loadData(); }, [user]);

  // Données de démonstration complètes
  const loadDemoData = () => {
    const demoClients = [
      { id: 'd1', nom: 'Dupont', prenom: 'Jean', telephone: '06 12 34 56 78', email: 'jean.dupont@email.fr', adresse: '12 rue des Lilas, 75001 Paris' },
      { id: 'd2', nom: 'Martin', prenom: 'Marie', telephone: '06 98 76 54 32', email: 'marie.martin@email.fr', adresse: '45 avenue Victor Hugo, 69001 Lyon' },
      { id: 'd3', nom: 'Bernard', prenom: 'Pierre', entreprise: 'SCI Les Oliviers', telephone: '07 11 22 33 44', adresse: '8 place de la Mairie, 13001 Marseille' },
      { id: 'd4', nom: 'Lefebvre', prenom: 'Sophie', telephone: '06 55 66 77 88', email: 'sophie.lefebvre@gmail.com', adresse: '23 boulevard Haussmann, 75009 Paris' }
    ];
    const demoCatalogue = [
      { id: 'c1', nom: 'Pose carrelage sol', prix: 45, unite: 'm²', categorie: 'Carrelage', favori: true },
      { id: 'c2', nom: 'Pose carrelage mural', prix: 55, unite: 'm²', categorie: 'Carrelage', favori: true },
      { id: 'c3', nom: 'Peinture murs (2 couches)', prix: 25, unite: 'm²', categorie: 'Peinture', favori: true },
      { id: 'c4', nom: 'Peinture plafond', prix: 30, unite: 'm²', categorie: 'Peinture', favori: false },
      { id: 'c5', nom: 'Plomberie - Main d\'oeuvre', prix: 55, unite: 'h', categorie: 'Plomberie', favori: true },
      { id: 'c6', nom: 'Remplacement WC complet', prix: 350, unite: 'forfait', categorie: 'Plomberie', favori: true },
      { id: 'c7', nom: 'Électricité - Point lumineux', prix: 85, unite: 'unité', categorie: 'Électricité', favori: false },
      { id: 'c8', nom: 'Électricité - Prise', prix: 65, unite: 'unité', categorie: 'Électricité', favori: false },
      { id: 'c9', nom: 'Forfait déplacement', prix: 50, unite: 'forfait', categorie: 'Autre', favori: true },
      { id: 'c10', nom: 'Démolition légère', prix: 35, unite: 'm²', categorie: 'Maçonnerie', favori: false }
    ];
    const demoChantiers = [
      { id: 'ch1', nom: 'Rénovation SDB Dupont', client_id: 'd1', adresse: '12 rue des Lilas, Paris', statut: 'en_cours', date_debut: '2024-01-15', photos: [], taches: [{ id: 't1', text: 'Démolition ancienne douche', done: true }, { id: 't2', text: 'Pose nouveau receveur', done: true }, { id: 't3', text: 'Pose carrelage mural', done: false }, { id: 't4', text: 'Installation robinetterie', done: false }], notes: 'Client disponible le matin uniquement' },
      { id: 'ch2', nom: 'Peinture T3 Martin', client_id: 'd2', adresse: '45 avenue Victor Hugo, Lyon', statut: 'en_cours', date_debut: '2024-01-20', photos: [], taches: [{ id: 't5', text: 'Préparation murs', done: true }, { id: 't6', text: 'Peinture salon', done: false }], notes: '' },
      { id: 'ch3', nom: 'Cuisine Bernard', client_id: 'd3', adresse: '8 place de la Mairie, Marseille', statut: 'prospect', date_debut: '', photos: [], taches: [], notes: 'RDV prévu semaine prochaine' }
    ];
    const demoDevis = [
      { id: 'dv1', numero: 'DEV-2024-001', client_id: 'd1', chantier_id: 'ch1', date: '2024-01-10', type: 'devis', statut: 'accepte', tvaRate: 10, total_ht: 2850, tva: 285, total_ttc: 3135, lignes: [{ description: 'Démolition SDB', quantite: 8, unite: 'm²', prixUnitaire: 35, montant: 280 }, { description: 'Pose carrelage sol', quantite: 8, unite: 'm²', prixUnitaire: 45, montant: 360 }, { description: 'Pose carrelage mural', quantite: 25, unite: 'm²', prixUnitaire: 55, montant: 1375 }, { description: 'Plomberie', quantite: 15, unite: 'h', prixUnitaire: 55, montant: 825 }], signature: 'data:image/png;base64,demo', signatureDate: '2024-01-12' },
      { id: 'dv2', numero: 'DEV-2024-002', client_id: 'd2', chantier_id: 'ch2', date: '2024-01-18', type: 'devis', statut: 'envoye', tvaRate: 10, total_ht: 1500, tva: 150, total_ttc: 1650, lignes: [{ description: 'Peinture murs', quantite: 60, unite: 'm²', prixUnitaire: 25, montant: 1500 }] },
      { id: 'dv3', numero: 'FACT-2024-001', client_id: 'd1', chantier_id: 'ch1', date: '2024-01-25', type: 'facture', statut: 'payee', tvaRate: 10, total_ht: 940.91, tva: 94.09, total_ttc: 1035, lignes: [{ description: 'Acompte 33% - DEV-2024-001', quantite: 1, unite: 'forfait', prixUnitaire: 940.91, montant: 940.91 }] }
    ];
    const demoEquipe = [
      { id: 'e1', nom: 'Durand', prenom: 'Luc', telephone: '06 55 44 33 22', tauxHoraire: 35 },
      { id: 'e2', nom: 'Petit', prenom: 'Marc', telephone: '06 11 22 33 44', tauxHoraire: 32 }
    ];
    const demoPointages = [
      { id: 'p1', employeId: 'e1', chantierId: 'ch1', date: '2024-01-15', heures: 8 },
      { id: 'p2', employeId: 'e1', chantierId: 'ch1', date: '2024-01-16', heures: 7.5 },
      { id: 'p3', employeId: 'e2', chantierId: 'ch1', date: '2024-01-16', heures: 8 },
      { id: 'p4', employeId: 'e1', chantierId: 'ch2', date: '2024-01-20', heures: 6 }
    ];
    const demoDepenses = [
      { id: 'dep1', chantierId: 'ch1', description: 'Carrelage Leroy Merlin', montant: 450, date: '2024-01-14' },
      { id: 'dep2', chantierId: 'ch1', description: 'Colle + joints', montant: 85, date: '2024-01-14' },
      { id: 'dep3', chantierId: 'ch2', description: 'Peinture Tollens', montant: 320, date: '2024-01-19' }
    ];
    const demoEvents = [
      { id: 'ev1', title: '🏗️ Chantier Dupont', date: '2024-01-15', type: 'chantier', chantierId: 'ch1' },
      { id: 'ev2', title: '📞 RDV Bernard cuisine', date: '2024-01-22', type: 'rdv', time: '10:00' },
      { id: 'ev3', title: '🔔 Relance devis Martin', date: '2024-01-25', type: 'relance' }
    ];
    
    setClients(demoClients);
    setCatalogue(demoCatalogue);
    setChantiers(demoChantiers);
    setDevis(demoDevis);
    setEquipe(demoEquipe);
    setPointages(demoPointages);
    setDepenses(demoDepenses);
    setEvents(demoEvents);
    setEntreprise({
      nom: 'Martin Rénovation', 
      couleur: '#f97316', 
      siret: '123 456 789 00012', 
      tvaIntra: 'FR12345678901',
      assurance: 'AXA Décennale N°456789 - Valide jusqu\'au 31/12/2025', 
      adresse: '25 rue du Commerce\n75015 Paris', 
      tel: '01 23 45 67 89',
      email: 'contact@martin-renovation.fr', 
      rib: 'FR76 1234 5678 9012 3456 7890 123', 
      logo: ''
    });
  };

  useEffect(() => { if (isDemo) loadDemoData(); }, []);

  const loadData = async () => {
    if (isDemo) return; // En mode démo, on utilise les données locales
    try {
      const [c, d] = await Promise.all([clientsDB.getAll(), devisDB.getAll()]);
      if (c.data) setClients(c.data);
      if (d.data) setDevis(d.data);
    } catch (e) {
      console.log('Mode hors-ligne ou erreur Supabase');
    }
    ['chantiers', 'events', 'equipe', 'pointages', 'catalogue', 'depenses'].forEach(k => {
      const v = localStorage.getItem('cp_' + k);
      if (v) {
        const p = JSON.parse(v);
        if (k === 'chantiers') setChantiers(p);
        if (k === 'events') setEvents(p);
        if (k === 'equipe') setEquipe(p);
        if (k === 'pointages') setPointages(p);
        if (k === 'catalogue') setCatalogue(p);
        if (k === 'depenses') setDepenses(p);
      }
    });
  };

  // Notifications
  useEffect(() => {
    const notifs = [];
    devis.filter(d => d.type === 'facture' && d.statut === 'envoyee').forEach(d => {
      const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
      if (days > 30) notifs.push({ id: 'r'+d.id, icon: '🔴', msg: `Retard: ${d.numero}`, type: 'urgent' });
      else if (days > 15) notifs.push({ id: 'a'+d.id, icon: '🟡', msg: `Relance: ${d.numero}`, type: 'warning' });
    });
    chantiers.filter(c => c.statut === 'en_cours' && c.taches?.some(t => !t.done)).forEach(c => {
      notifs.push({ id: 'ch'+c.id, icon: '📋', msg: `Tâches: ${c.nom}`, type: 'info' });
    });
    setNotifications(notifs);
  }, [devis, chantiers]);

  const save = (k, d) => localStorage.setItem('cp_' + k, JSON.stringify(d));

  // CRUD Clients (mode démo = local)
  const handleClientSubmit = async (data) => {
    if (isDemo) {
      const newClient = { id: Date.now().toString(), ...data };
      setClients(prev => [...prev, newClient]);
    } else {
      await clientsDB.create(data);
      const r = await clientsDB.getAll();
      if (r.data) setClients(r.data);
    }
  };

  // CRUD Devis (mode démo = local)
  const handleDevisSubmit = async (data) => {
    if (isDemo) {
      const newDevis = { id: Date.now().toString(), ...data };
      setDevis(prev => [...prev, newDevis]);
    } else {
      await devisDB.create(data);
      const r = await devisDB.getAll();
      if (r.data) setDevis(r.data);
    }
  };

  const handleDevisUpdate = async (id, data) => {
    if (isDemo) {
      setDevis(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    } else {
      await devisDB.update(id, data);
      const r = await devisDB.getAll();
      if (r.data) setDevis(r.data);
    }
  };

  const handleDevisDelete = async (id) => {
    if (isDemo) {
      setDevis(prev => prev.filter(d => d.id !== id));
    } else {
      await devisDB.delete(id);
      const r = await devisDB.getAll();
      if (r.data) setDevis(r.data);
    }
  };

  const addChantier = (ch) => {
    const newCh = { id: Date.now().toString(), ...ch, photos: [], taches: [], notes: '' };
    setChantiers(prev => { const u = [...prev, newCh]; save('chantiers', u); return u; });
    if (ch.date_debut) {
      const ev = { id: 'ch_' + newCh.id, title: '🏗️ ' + ch.nom, date: ch.date_debut, type: 'chantier', chantierId: newCh.id };
      setEvents(prev => { const u = [...prev, ev]; save('events', u); return u; });
    }
  };

  const updateChantier = (id, data) => {
    setChantiers(prev => { const u = prev.map(c => c.id === id ? { ...c, ...data } : c); save('chantiers', u); return u; });
  };

  const addEvent = (ev) => {
    const newEv = { id: Date.now().toString(), ...ev };
    setEvents(prev => { const u = [...prev, newEv]; save('events', u); return u; });
  };

  const getChantierBilan = (chantierId) => {
    const revenus = devis.filter(d => d.chantier_id === chantierId && d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0);
    const materiaux = depenses.filter(d => d.chantierId === chantierId).reduce((s, d) => s + (d.montant || 0), 0);
    const heures = pointages.filter(p => p.chantierId === chantierId).reduce((s, p) => s + (p.heures || 0), 0);
    const coutMO = heures * 35;
    return { revenus, materiaux, mainOeuvre: coutMO, marge: revenus - materiaux - coutMO };
  };

  const stats = {
    caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee' && new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    enAttente: devis.filter(d => d.type === 'facture' && ['envoyee', 'envoye'].includes(d.statut)).reduce((s, d) => s + (d.total_ttc || 0), 0),
    enRetard: devis.filter(d => d.type === 'facture' && d.statut === 'envoyee' && (Date.now() - new Date(d.date)) > 30*86400000).reduce((s, d) => s + (d.total_ttc || 0), 0),
    devisAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length,
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length,
  };

  const handleSignIn = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signIn(authForm.email, authForm.password); if (error) setAuthError(error.message); };
  const handleSignUp = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom, entreprise: authForm.entreprise }); if (error) setAuthError(error.message); else { alert('Compte créé !'); setShowSignUp(false); } };
  const handleSignOut = async () => { if (!isDemo) await auth.signOut(); setUser(null); if (isDemo) window.location.href = window.location.pathname; };

  // Tutoriel
  const tutorialSteps = [
    { title: 'Bienvenue sur ChantierPro ! 👋', text: 'Gérez vos devis, chantiers et équipe en quelques clics.' },
    { title: 'Créez votre premier devis 📄', text: 'Cliquez sur "+ Nouveau" puis "Nouveau devis". Ajoutez des lignes depuis votre catalogue.' },
    { title: 'Faites signer vos clients ✍️', text: 'Sur le devis, cliquez "Signer" pour une signature tactile directe.' },
    { title: 'Suivez vos chantiers 🏗️', text: 'Photos, tâches, dépenses... tout est centralisé par chantier.' },
    { title: 'Analysez votre rentabilité 📊', text: 'Le tableau de bord calcule automatiquement vos marges.' }
  ];

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('cp_tutorial_done', 'true');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl animate-bounce mb-4">🏗️</div>
        <p className="text-slate-600">Chargement...</p>
      </div>
    </div>
  );

  // Login
  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center">
        <div className="max-w-md text-white">
          <div className="text-6xl mb-6">🏗️</div>
          <h1 className="text-4xl font-bold mb-4">ChantierPro</h1>
          <p className="text-xl opacity-90">Gestion simple pour artisans.</p>
          <ul className="mt-6 space-y-2 opacity-80">
            <li>✓ Devis en 2 minutes</li>
            <li>✓ Signature mobile</li>
            <li>✓ Suivi rentabilité</li>
            <li>✓ Envoi WhatsApp</li>
          </ul>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="text-5xl mb-2">🏗️</div>
            <h1 className="text-2xl font-bold text-white">ChantierPro</h1>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4 mt-6">
            {showSignUp && <>
              <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Votre nom" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} />
              <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Nom entreprise" value={authForm.entreprise} onChange={e => setAuthForm(p => ({...p, entreprise: e.target.value}))} />
            </>}
            <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Email" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl">{showSignUp ? 'Créer mon compte' : 'Se connecter'}</button>
          </form>
          <p className="text-center text-slate-400 mt-6">{showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}<button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 font-semibold ml-2">{showSignUp ? 'Connexion' : "S'inscrire"}</button></p>
          
          {/* Bouton démo */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-center text-slate-500 mb-3">Ou testez sans inscription</p>
            <a href="?demo=true" className="block w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-center">
              🎮 Essayer la démo
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: '📊', label: 'Accueil' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures', badge: stats.devisAttente },
    { id: 'chantiers', icon: '🏗️', label: 'Chantiers', badge: stats.chantiersEnCours },
    { id: 'planning', icon: '📅', label: 'Planning' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'catalogue', icon: '📦', label: 'Catalogue' },
    { id: 'equipe', icon: '👷', label: 'Équipe & Heures' },
    { id: 'settings', icon: '⚙️', label: 'Mon entreprise' },
  ];

  const quickActions = [
    { icon: '📄', label: 'Nouveau devis', p: 'devis' },
    { icon: '🧾', label: 'Nouvelle facture', p: 'devis' },
    { icon: '🏗️', label: 'Nouveau chantier', p: 'chantiers' },
    { icon: '👤', label: 'Nouveau client', p: 'clients' },
  ];

  const couleur = entreprise.couleur || '#f97316';
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      {/* Sidebar overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          {entreprise.logo ? (
            <img src={entreprise.logo} className="w-10 h-10 rounded-xl object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background: couleur}}>🏗️</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold truncate">{entreprise.nom || 'ChantierPro'}</h1>
            <p className="text-slate-500 text-xs truncate">{isDemo ? '🎮 Mode démo' : String(user?.email || '')}</p>
          </div>
        </div>
        
        <nav className="p-3 space-y-1">
          {nav.map(n => (
            <button 
              key={n.id} 
              onClick={() => { setPage(n.id); setSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800'}`} 
              style={page === n.id ? {background: couleur} : {}}
            >
              <span className="text-lg">{n.icon}</span>
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}
            </button>
          ))}
        </nav>
        
        {/* Theme toggle */}
        <div className="absolute bottom-16 left-0 right-0 px-3">
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm"
          >
            {isDark ? '☀️' : '🌙'} {isDark ? 'Mode clair' : 'Mode sombre'}
          </button>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">
            🚪 {isDemo ? 'Quitter démo' : 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 ${isDark ? 'bg-slate-800/95' : 'bg-white/95'} backdrop-blur border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} px-4 py-3 flex items-center gap-4`}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-xl">☰</button>
          
          {/* Badge démo */}
          {isDemo && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              🎮 Mode démo
            </span>
          )}
          
          <div className="flex-1" />
          
          {/* Notifications */}
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className={`relative p-2.5 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className={`absolute top-full right-0 mt-2 w-80 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl border ${isDark ? 'border-slate-700' : ''} z-50`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : ''} font-semibold ${isDark ? 'text-white' : ''}`}>Notifications</div>
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-slate-500">✅ Tout est OK</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`flex items-center gap-3 px-4 py-3 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} text-sm border-b last:border-0 ${isDark ? 'border-slate-700 text-slate-300' : ''}`}>
                      <span>{n.icon}</span>
                      <span>{n.msg}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick add */}
          <div className="relative">
            <button 
              onClick={() => setShowQuickAdd(!showQuickAdd)} 
              className="px-4 py-2.5 text-white rounded-xl text-sm font-medium" 
              style={{background: couleur}}
            >
              + Nouveau
            </button>
            {showQuickAdd && (
              <div className={`absolute top-full right-0 mt-2 w-52 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl border ${isDark ? 'border-slate-700' : ''} z-50`}>
                {quickActions.map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setPage(item.p); setShowQuickAdd(false); }} 
                    className={`w-full flex items-center gap-3 px-4 py-3 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'} text-left text-sm border-b last:border-0 ${isDark ? 'border-slate-700' : ''}`}
                  >
                    <span className="text-lg">{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Close dropdowns on outside click */}
          {showQuickAdd && <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />}
          {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
        </header>

        {/* Main */}
        <main className={`p-4 lg:p-6 ${isDark ? 'text-white' : ''}`}>
          {page === 'dashboard' && <Dashboard stats={stats} devis={devis} chantiers={chantiers} depenses={depenses} pointages={pointages} setPage={setPage} couleur={couleur} getChantierBilan={getChantierBilan} isDark={isDark} />}
          {page === 'devis' && <DevisPage clients={clients} setClients={setClients} clientsDB={isDemo ? null : clientsDB} devis={devis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={handleDevisSubmit} onUpdate={handleDevisUpdate} onDelete={handleDevisDelete} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={d => { setDepenses(d); save('depenses', d); }} getChantierBilan={getChantierBilan} couleur={couleur} />}
          {page === 'planning' && <Planning events={events} setEvents={e => { setEvents(e); save('events', e); }} addEvent={addEvent} chantiers={chantiers} equipe={equipe} couleur={couleur} />}
          {page === 'clients' && <Clients clients={clients} devis={devis} onSubmit={handleClientSubmit} couleur={couleur} />}
          {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={c => { setCatalogue(c); save('catalogue', c); }} couleur={couleur} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={e => { setEquipe(e); save('equipe', e); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} chantiers={chantiers} couleur={couleur} />}
          {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} />}
        </main>
      </div>

      {/* Tutoriel */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">{tutorialStep === 0 ? '👋' : tutorialStep === 1 ? '📄' : tutorialStep === 2 ? '✍️' : tutorialStep === 3 ? '🏗️' : '📊'}</div>
              <h3 className="text-xl font-bold mb-2">{tutorialSteps[tutorialStep].title}</h3>
              <p className="text-slate-600">{tutorialSteps[tutorialStep].text}</p>
            </div>
            
            <div className="flex justify-center gap-2 mb-6">
              {tutorialSteps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === tutorialStep ? 'bg-orange-500' : 'bg-slate-200'}`} />
              ))}
            </div>
            
            <div className="flex gap-3">
              <button onClick={closeTutorial} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-slate-600">Passer</button>
              <button 
                onClick={() => tutorialStep < tutorialSteps.length - 1 ? setTutorialStep(tutorialStep + 1) : closeTutorial()} 
                className="flex-1 py-2.5 text-white rounded-xl" 
                style={{background: couleur}}
              >
                {tutorialStep < tutorialSteps.length - 1 ? 'Suivant' : 'Commencer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
