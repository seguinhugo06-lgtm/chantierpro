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
import { Home, FileText, Building2, Calendar, Users, Package, HardHat, Settings as SettingsIcon, Eye, EyeOff, Sun, Moon, LogOut, Menu, Bell, Plus, Gamepad2, ChevronRight, BarChart3, X } from 'lucide-react';

const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';

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

export default function App() {
  const demoUser = { email: 'demo@chantierpro.test', user_metadata: { nom: 'Demo' } };
  const [user, setUser] = useState(isDemo ? demoUser : null);
  const [loading, setLoading] = useState(!isDemo);
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

  // Demo data loader
  const loadDemoData = () => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
    
    setClients([
      { id: 'c1', nom: 'Dupont', prenom: 'Jean', telephone: '06 12 34 56 78', email: 'jean.dupont@email.fr', adresse: '12 rue des Lilas, 75001 Paris' },
      { id: 'c2', nom: 'Martin', prenom: 'Marie', telephone: '06 98 76 54 32', email: 'marie.martin@email.fr', adresse: '45 avenue Victor Hugo, 69001 Lyon' },
      { id: 'c3', nom: 'Bernard', prenom: 'Pierre', entreprise: 'SCI Les Oliviers', telephone: '07 11 22 33 44', adresse: '8 place de la Mairie, 13001 Marseille' },
    ]);
    setCatalogue([
      { id: 'cat1', nom: 'Placo BA13', categorie: 'Materiaux', unite: 'm2', prix: 8.50, stock: 150 },
      { id: 'cat2', nom: 'Pose placo', categorie: "Main d'oeuvre", unite: 'm2', prix: 25.00 },
    ]);
    setEquipe([
      { id: 'e1', nom: 'Lucas Martin', role: 'Plaquiste', telephone: '06 11 11 11 11', tauxHoraire: 35, coutHoraireCharge: 52 },
      { id: 'e2', nom: 'Thomas Durand', role: 'Peintre', telephone: '06 22 22 22 22', tauxHoraire: 32, coutHoraireCharge: 48 },
    ]);
    setChantiers([
      { id: 'ch1', nom: 'Renovation appartement Dupont', client_id: 'c1', adresse: '12 rue des Lilas, 75001 Paris', date_debut: formatDate(addDays(today, -15)), date_fin: formatDate(addDays(today, 15)), statut: 'en_cours', avancement: 60, taches: [], photos: [] },
      { id: 'ch2', nom: 'Peinture bureaux SCI', client_id: 'c3', adresse: '8 place de la Mairie, 13001 Marseille', date_debut: formatDate(addDays(today, 5)), date_fin: formatDate(addDays(today, 20)), statut: 'planifie', avancement: 0, taches: [], photos: [] },
    ]);
    setDevis([
      { id: 'd1', numero: 'DEV-2026-001', type: 'devis', client_id: 'c1', chantier_id: 'ch1', date: formatDate(addDays(today, -30)), statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Fourniture et pose placo BA13', quantite: 45, unite: 'm2', prixUnitaire: 33.50, montant: 1507.50 }], total_ht: 2767.50, tva: 276.75, total_ttc: 3044.25 },
      { id: 'd2', numero: 'DEV-2026-002', type: 'devis', client_id: 'c2', date: formatDate(addDays(today, -7)), statut: 'envoye', tvaRate: 10, lignes: [{ id: 'l3', description: 'Refection plafond', quantite: 12, unite: 'm2', prixUnitaire: 55.00, montant: 660.00 }], total_ht: 1500.00, tva: 150.00, total_ttc: 1650.00 },
      { id: 'd3', numero: 'DEV-2026-003', type: 'devis', client_id: 'c3', date: formatDate(addDays(today, -3)), statut: 'envoye', tvaRate: 20, lignes: [{ id: 'l5', description: 'Peinture bureaux', quantite: 120, unite: 'm2', prixUnitaire: 22.00, montant: 2640.00 }], total_ht: 3240.00, tva: 648.00, total_ttc: 3888.00 },
      { id: 'd4', numero: 'FAC-2026-001', type: 'facture', client_id: 'c1', date: formatDate(addDays(today, -20)), statut: 'envoye', tvaRate: 10, lignes: [{ id: 'l7', description: 'Reparation plafond', quantite: 1, unite: 'forfait', prixUnitaire: 850.00, montant: 850.00 }], total_ht: 850.00, tva: 85.00, total_ttc: 935.00 },
    ]);
    setEvents([{ id: 'ev1', title: 'RDV chantier Dupont', date: formatDate(addDays(today, 2)), time: '09:00', type: 'rdv', chantierId: 'ch1' }]);
    setPointages([{ id: 'p1', employeId: 'e1', chantierId: 'ch1', date: formatDate(addDays(today, -1)), heures: 8, approuve: true }]);
    setDepenses([{ id: 'dep1', chantierId: 'ch1', description: 'Placo BA13', montant: 234, date: formatDate(addDays(today, -10)) }]);
    setNotifications([
      { id: 'n1', message: 'Devis DEV-2026-002 en attente depuis 7 jours', read: false, date: formatDate(today) },
      { id: 'n2', message: 'Facture FAC-2026-001 impayee - 935 EUR', read: false, date: formatDate(today) },
    ]);
  };

  useEffect(() => { 
    if (isDemo) { loadDemoData(); return; } 
    const checkAuth = async () => { 
      try { const u = await auth.getUser(); setUser(u); } catch (e) {} 
      finally { setLoading(false); } 
    }; 
    checkAuth(); 
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
    if (!ch) return { caHT: 0, coutMateriaux: 0, coutMO: 0, marge: 0, tauxMarge: 0, heuresTotal: 0 };
    const caHT = devis.filter(d => d.chantier_id === chantierId && d.type === 'facture' && d.statut === 'payee').reduce((s, d) => s + (d.total_ht || 0), 0);
    const coutMateriaux = depenses.filter(d => d.chantierId === chantierId).reduce((s, d) => s + (d.montant || 0), 0);
    const coutMO = pointages.filter(p => p.chantierId === chantierId).reduce((s, p) => { const emp = equipe.find(e => e.id === p.employeId); return s + (p.heures || 0) * (emp?.coutHoraireCharge || 45); }, 0);
    const marge = caHT - coutMateriaux - coutMO;
    const tauxMarge = caHT > 0 ? (marge / caHT) * 100 : 0;
    const heuresTotal = pointages.filter(p => p.chantierId === chantierId).reduce((s, p) => s + (p.heures || 0), 0);
    return { caHT, coutMateriaux, coutMO, marge, tauxMarge, heuresTotal };
  };

  const stats = { 
    devisAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length, 
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length 
  };

  // Auth handlers
  const handleSignIn = async (e) => { 
    e.preventDefault(); 
    setAuthError(''); 
    
    // Mode demo rapide
    if (authForm.email === 'demo' && authForm.password === 'demo') {
      window.location.href = '?demo=true';
      return;
    }
    
    try { 
      const { error } = await auth.signIn(authForm.email, authForm.password); 
      if (error) setAuthError(error.message); 
    } catch (e) { 
      setAuthError('Erreur de connexion. Utilisez demo/demo pour tester.'); 
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
    if (isDemo) window.location.href = window.location.pathname; 
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
  if (!user && !isDemo) return (
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
          
          <div className="mt-8 pt-8 border-t border-slate-800">
            <p className="text-center text-slate-500 text-sm mb-4">Ou decouvrez l'application</p>
            <a 
              href="?demo=true" 
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
            >
              <Gamepad2 size={18} /> Mode demo
            </a>
          </div>
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
            <p className="text-slate-500 text-xs truncate">{isDemo ? 'Mode Demo' : user?.email}</p>
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
            <span>{isDemo ? 'Quitter demo' : 'Deconnexion'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 backdrop-blur border-b px-4 py-3 flex items-center gap-4 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className={`lg:hidden p-2 rounded-lg ${isDark ? 'text-white hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <Menu size={24} />
          </button>
          
          {isDemo && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
              <Gamepad2 size={14} /> Demo
            </span>
          )}
          {modeDiscret && (
            <span className="px-3 py-1 bg-slate-700 text-white rounded-full text-xs font-medium flex items-center gap-1">
              <EyeOff size={14} />
            </span>
          )}
          
          <div className="flex-1" />
          
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifs(!showNotifs)} 
              className={`relative p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Bell size={20} />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifs.length}
                </span>
              )}
            </button>
            
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <h3 className={`font-semibold ${tc.text}`}>Notifications</h3>
                    {unreadNotifs.length > 0 && (
                      <button onClick={markAllNotifsRead} className="text-xs text-orange-500 hover:text-orange-400">
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={32} className={`mx-auto mb-2 ${tc.textMuted}`} />
                        <p className={tc.textMuted}>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => markNotifRead(n.id)} 
                          className={`px-4 py-3 cursor-pointer transition-colors border-b last:border-0 ${!n.read ? (isDark ? 'bg-slate-700/50' : 'bg-orange-50') : ''} ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`}
                        >
                          <p className={`text-sm ${tc.text}`}>{n.message}</p>
                          <p className={`text-xs mt-1 ${tc.textMuted}`}>{n.date}</p>
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
              className="px-4 py-2 text-white rounded-xl flex items-center gap-2 transition-all hover:shadow-lg" 
              style={{background: couleur}}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
            
            {showQuickAdd && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                  {[
                    { label: 'Nouveau devis', icon: FileText, p: 'devis' }, 
                    { label: 'Nouveau client', icon: Users, p: 'clients' }, 
                    { label: 'Nouveau chantier', icon: Building2, p: 'chantiers' }
                  ].map(item => (
                    <button 
                      key={item.label} 
                      onClick={() => { setPage(item.p); setShowQuickAdd(false); }} 
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
        <main className={`p-4 lg:p-6 ${tc.text}`}>
          {page === 'dashboard' && <Dashboard clients={clients} devis={devis} chantiers={chantiers} events={events} getChantierBilan={getChantierBilan} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} modeDiscret={modeDiscret} couleur={couleur} isDark={isDark} />}
          {page === 'devis' && <DevisPage clients={clients} setClients={setClients} devis={devis} setDevis={setDevis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={addDevis} onUpdate={updateDevis} onDelete={deleteDevis} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} isDark={isDark} couleur={couleur} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={setDepenses} pointages={pointages} setPointages={setPointages} equipe={equipe} devis={devis} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} isDark={isDark} />}
          {page === 'planning' && <Planning events={events} setEvents={setEvents} addEvent={addEvent} chantiers={chantiers} equipe={equipe} setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier} couleur={couleur} isDark={isDark} />}
          {page === 'clients' && <Clients clients={clients} setClients={setClients} devis={devis} chantiers={chantiers} onSubmit={addClient} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} isDark={isDark} />}
          {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={setCatalogue} couleur={couleur} isDark={isDark} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={setEquipe} pointages={pointages} setPointages={setPointages} chantiers={chantiers} couleur={couleur} isDark={isDark} />}
          {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} isDark={isDark} couleur={couleur} />}
        </main>
      </div>
    </div>
  );
}
