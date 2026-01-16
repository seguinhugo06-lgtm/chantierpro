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
import { Home, FileText, Building2, Calendar, Users, Package, HardHat, Settings as SettingsIcon, Eye, EyeOff, Sun, Moon, LogOut, Menu, Bell, Plus, Gamepad2, X, ChevronRight, Zap, Shield, BarChart3, Clock } from 'lucide-react';

const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';

const Skeleton = ({ className = '' }) => <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
const CardSkeleton = () => <div className="bg-white rounded-2xl border p-5 space-y-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-3 w-2/3" /></div>;
const PageSkeleton = () => <div className="space-y-6"><div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-32" /></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <CardSkeleton key={i} />)}</div></div>;

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
  const [createMode, setCreateMode] = useState(null); // 'devis', 'client', 'chantier'
  const [entreprise, setEntreprise] = useState({ 
    nom: 'Martin Rénovation', logo: '', couleur: '#f97316', 
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
      { id: 'cat1', nom: 'Placo BA13 standard', categorie: 'Matériaux', unite: 'm²', prix: 8.50, prixAchat: 5.20, stock: 150 },
      { id: 'cat2', nom: 'Enduit de lissage', categorie: 'Matériaux', unite: 'sac 25kg', prix: 18.00, prixAchat: 12.00, stock: 45 },
      { id: 'cat3', nom: 'Peinture acrylique blanche', categorie: 'Matériaux', unite: 'pot 10L', prix: 45.00, prixAchat: 28.00, stock: 30 },
      { id: 'cat4', nom: 'Pose placo', categorie: "Main d'œuvre", unite: 'm²', prix: 25.00 },
      { id: 'cat5', nom: 'Peinture 2 couches', categorie: "Main d'œuvre", unite: 'm²', prix: 18.00 },
    ]);
    setEquipe([
      { id: 'e1', nom: 'Lucas Martin', role: 'Plaquiste', telephone: '06 11 11 11 11', tauxHoraire: 35, coutHoraireCharge: 52 },
      { id: 'e2', nom: 'Thomas Durand', role: 'Peintre', telephone: '06 22 22 22 22', tauxHoraire: 32, coutHoraireCharge: 48 },
    ]);
    setChantiers([
      { id: 'ch1', nom: 'Rénovation appartement Dupont', client_id: 'c1', adresse: '12 rue des Lilas, 75001 Paris', date_debut: formatDate(addDays(today, -15)), date_fin: formatDate(addDays(today, 15)), statut: 'en_cours', avancement: 60, notes: 'Accès par gardien', taches: [{ id: 't1', text: 'Démolition cloisons', done: true }, { id: 't2', text: 'Pose placo', done: true }, { id: 't3', text: 'Enduits', done: false }], photos: [] },
      { id: 'ch2', nom: 'Peinture bureaux SCI', client_id: 'c3', adresse: '8 place de la Mairie, 13001 Marseille', date_debut: formatDate(addDays(today, 5)), date_fin: formatDate(addDays(today, 20)), statut: 'planifie', avancement: 0, taches: [], photos: [] },
    ]);
    setDevis([
      { id: 'd1', numero: 'DEV-2026-001', type: 'devis', client_id: 'c1', chantier_id: 'ch1', date: formatDate(addDays(today, -30)), statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l1', description: 'Fourniture et pose placo BA13', quantite: 45, unite: 'm²', prixUnitaire: 33.50, prixAchat: 5.20, montant: 1507.50 }, { id: 'l2', description: 'Enduit et peinture', quantite: 45, unite: 'm²', prixUnitaire: 28.00, montant: 1260.00 }], total_ht: 2767.50, tva: 276.75, total_ttc: 3044.25, validite: 30 },
      { id: 'd2', numero: 'DEV-2026-002', type: 'devis', client_id: 'c2', date: formatDate(addDays(today, -7)), statut: 'envoye', tvaRate: 10, lignes: [{ id: 'l3', description: 'Réfection plafond cuisine', quantite: 12, unite: 'm²', prixUnitaire: 55.00, montant: 660.00 }, { id: 'l4', description: 'Peinture 2 couches', quantite: 35, unite: 'm²', prixUnitaire: 18.00, montant: 630.00 }], total_ht: 1500.00, tva: 150.00, total_ttc: 1650.00, validite: 30 },
      { id: 'd3', numero: 'DEV-2026-003', type: 'devis', client_id: 'c3', chantier_id: 'ch2', date: formatDate(addDays(today, -3)), statut: 'envoye', tvaRate: 20, lignes: [{ id: 'l5', description: 'Peinture bureaux 120m²', quantite: 120, unite: 'm²', prixUnitaire: 22.00, montant: 2640.00 }, { id: 'l6', description: 'Lessivage murs', quantite: 120, unite: 'm²', prixUnitaire: 5.00, montant: 600.00 }], total_ht: 3240.00, tva: 648.00, total_ttc: 3888.00, validite: 30 },
      { id: 'd4', numero: 'FAC-2026-001', type: 'facture', client_id: 'c4', date: formatDate(addDays(today, -20)), statut: 'envoye', tvaRate: 10, lignes: [{ id: 'l7', description: 'Réparation fissures plafond', quantite: 1, unite: 'forfait', prixUnitaire: 850.00, montant: 850.00 }], total_ht: 850.00, tva: 85.00, total_ttc: 935.00 },
      { id: 'd5', numero: 'DEV-2026-004', type: 'devis', client_id: 'c1', date: formatDate(addDays(today, -1)), statut: 'brouillon', tvaRate: 10, lignes: [{ id: 'l8', description: 'Extension véranda', quantite: 25, unite: 'm²', prixUnitaire: 85.00, montant: 2125.00 }], total_ht: 2125.00, tva: 212.50, total_ttc: 2337.50, validite: 30 },
      { id: 'd6', numero: 'DEV-2026-005', type: 'devis', client_id: 'c3', date: formatDate(addDays(today, -14)), statut: 'accepte', tvaRate: 10, lignes: [{ id: 'l9', description: 'Isolation combles', quantite: 80, unite: 'm²', prixUnitaire: 35.00, prixAchat: 15.00, montant: 2800.00 }], total_ht: 8500.00, tva: 850.00, total_ttc: 9350.00 },
    ]);
    setEvents([
      { id: 'ev1', title: 'RDV chantier Dupont', date: formatDate(addDays(today, 2)), time: '09:00', type: 'rdv', chantierId: 'ch1' },
      { id: 'ev2', title: 'Livraison matériaux', date: formatDate(addDays(today, 3)), time: '14:00', type: 'livraison' },
    ]);
    setPointages([
      { id: 'p1', employeId: 'e1', chantierId: 'ch1', date: formatDate(addDays(today, -1)), heures: 8, approuve: true },
      { id: 'p2', employeId: 'e2', chantierId: 'ch1', date: formatDate(addDays(today, -1)), heures: 7.5, approuve: false },
    ]);
    setDepenses([
      { id: 'dep1', chantierId: 'ch1', description: 'Placo BA13', montant: 234, date: formatDate(addDays(today, -10)), categorie: 'materiaux' },
    ]);
    setNotifications([
      { id: 'n1', type: 'devis', message: 'Devis DEV-2026-002 en attente depuis 7 jours', read: false, date: formatDate(today) },
      { id: 'n2', type: 'facture', message: 'Facture FAC-2026-001 impayée (935€)', read: false, date: formatDate(today) },
    ]);
  };

  useEffect(() => {
    if (isDemo) { loadDemoData(); return; }
    const checkAuth = async () => { try { const u = await auth.getUser(); setUser(u); } catch (e) {} finally { setLoading(false); } };
    checkAuth();
  }, []);

  const addClient = (data) => { const c = { id: Date.now().toString(), ...data }; setClients([...clients, c]); return c; };
  const updateClient = (id, data) => setClients(clients.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteClient = (id) => setClients(clients.filter(c => c.id !== id));
  const addDevis = (data) => { const d = { id: Date.now().toString(), ...data }; setDevis([...devis, d]); return d; };
  const updateDevis = (id, data) => setDevis(devis.map(d => d.id === id ? { ...d, ...data } : d));
  const deleteDevis = (id) => setDevis(devis.filter(d => d.id !== id));
  const addChantier = (data) => { const c = { id: Date.now().toString(), ...data }; setChantiers([...chantiers, c]); return c; };
  const updateChantier = (id, data) => setChantiers(chantiers.map(c => c.id === id ? { ...c, ...data } : c));
  const addEvent = (data) => { const e = { id: Date.now().toString(), ...data }; setEvents([...events, e]); return e; };
  const updateEvent = (id, data) => setEvents(events.map(e => e.id === id ? { ...e, ...data } : e));
  const deleteEvent = (id) => setEvents(events.filter(e => e.id !== id));
  const addAjustement = (data) => { const a = { id: Date.now().toString(), ...data }; setAjustements([...ajustements, a]); return a; };
  const deleteAjustement = (id) => setAjustements(ajustements.filter(a => a.id !== id));
  const deductStock = (catalogueId, qty) => setCatalogue(catalogue.map(c => c.id === catalogueId ? { ...c, stock: Math.max(0, (c.stock || 0) - qty) } : c));

  const getChantierBilan = (chantierId) => {
    const ch = chantiers.find(c => c.id === chantierId);
    if (!ch) return { caHT: 0, caDevis: 0, adjRevenus: 0, adjDepenses: 0, coutMateriaux: 0, coutMO: 0, fraisFixes: 0, marge: 0, tauxMarge: 0, margePrevue: 0, heuresTotal: 0 };
    const chDevis = devis.filter(d => d.chantier_id === chantierId && ['accepte', 'acompte_facture', 'facture_partielle'].includes(d.statut));
    const caDevis = chDevis.reduce((s, d) => s + (d.total_ht || 0), 0);
    const facturesPayees = devis.filter(d => d.chantier_id === chantierId && d.type === 'facture' && d.statut === 'payee');
    const caHT = facturesPayees.reduce((s, d) => s + (d.total_ht || 0), 0);
    const chAjustements = ajustements.filter(a => a.chantierId === chantierId);
    const adjRevenus = chAjustements.filter(a => a.type === 'REVENU').reduce((s, a) => s + (a.montant_ht || 0), 0);
    const adjDepenses = chAjustements.filter(a => a.type === 'DEPENSE').reduce((s, a) => s + (a.montant_ht || 0), 0);
    const coutMateriaux = depenses.filter(d => d.chantierId === chantierId).reduce((s, d) => s + (d.montant || 0), 0);
    const chPointages = pointages.filter(p => p.chantierId === chantierId);
    const coutMO = chPointages.reduce((s, p) => { const emp = equipe.find(e => e.id === p.employeId); return s + (p.heures || 0) * (emp?.coutHoraireCharge || 45); }, 0);
    const fraisFixes = caHT * ((entreprise.tauxFraisStructure || 15) / 100);
    const marge = caHT + adjRevenus - coutMateriaux - coutMO - fraisFixes - adjDepenses;
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
  const markNotifRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotifsRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="text-center"><Building2 size={48} className="mx-auto mb-4 text-orange-500 animate-bounce" /><p className="text-slate-500">Chargement...</p></div></div>;

  // Page de connexion moderne
  if (!user && !isDemo) return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Partie gauche - Hero moderne */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Gradient de fond animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        </div>
        
        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-center p-12 lg:p-16">
          <div className="max-w-lg">
            {/* Logo */}
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8">
              <Building2 size={32} className="text-white" />
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-4">ChantierPro</h1>
            <p className="text-2xl text-white/90 mb-8">Pilotez votre rentabilité en temps réel</p>
            
            {/* Features avec icônes */}
            <div className="space-y-4">
              {[
                { icon: BarChart3, text: 'Marge temps réel sur chaque chantier' },
                { icon: Users, text: 'Gestion équipe et pointages' },
                { icon: FileText, text: 'Devis et factures conformes' },
                { icon: Calendar, text: 'Planning interactif' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 text-white/90">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <feature.icon size={20} />
                  </div>
                  <span className="text-lg">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Stats ou trust indicators */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <p className="text-white/70 text-sm">Conçu pour les artisans et entreprises du bâtiment</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partie droite - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ChantierPro</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="text-slate-400 mb-8">{showSignUp ? 'Commencez gratuitement' : 'Accédez à votre espace'}</p>
          
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Nom de l'entreprise</label>
                <input className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" placeholder="Martin Rénovation" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} />
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Email</label>
              <input type="email" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" placeholder="vous@entreprise.fr" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Mot de passe</label>
              <input type="password" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            </div>
            {authError && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{authError}</p>}
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all">
              {showSignUp ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
          
          <p className="text-center text-slate-400 mt-6">
            {showSignUp ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}
            <button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 ml-2 hover:text-orange-400 transition-colors">
              {showSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
          
          <div className="mt-8 pt-8 border-t border-slate-800">
            <p className="text-center text-slate-500 text-sm mb-4">Ou découvrez l'application</p>
            <a href="?demo=true" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-center flex items-center justify-center gap-2 transition-colors">
              <Gamepad2 size={18} /> Mode démo
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: Home, label: 'Accueil' }, 
    { id: 'devis', icon: FileText, label: 'Devis & Factures', badge: stats.devisAttente }, 
    { id: 'chantiers', icon: Building2, label: 'Chantiers', badge: stats.chantiersEnCours }, 
    { id: 'planning', icon: Calendar, label: 'Planning' }, 
    { id: 'clients', icon: Users, label: 'Clients' }, 
    { id: 'catalogue', icon: Package, label: 'Catalogue' }, 
    { id: 'equipe', icon: HardHat, label: 'Équipe' }, 
    { id: 'settings', icon: SettingsIcon, label: 'Paramètres' }
  ];
  const couleur = entreprise.couleur || '#f97316';
  const isDark = theme === 'dark';
  const unreadNotifs = notifications.filter(n => !n.read);

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-900' : 'bg-slate-100'}`}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar améliorée avec ombre */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl shadow-black/50`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: couleur}}><Building2 size={20} className="text-white" /></div>
          <div className="flex-1 min-w-0"><h1 className="text-white font-bold truncate">{entreprise.nom || 'ChantierPro'}</h1><p className="text-slate-500 text-xs truncate">{isDemo ? 'Démo' : user?.email}</p></div>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); setCreateMode(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`} style={page === n.id ? {background: couleur} : {}}>
              <n.icon size={18} />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}
            </button>
          ))}
        </nav>
        
        {/* Section bas de sidebar avec meilleure séparation */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Mode discret */}
          <div className="px-3 pb-2">
            <button onClick={() => setModeDiscret(!modeDiscret)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${modeDiscret ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              {modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}
              <span>Mode discret</span>
            </button>
          </div>
          
          {/* Thème */}
          <div className="px-3 pb-3">
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm transition-colors">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDark ? 'Clair' : 'Sombre'}</span>
            </button>
          </div>
          
          {/* Séparateur */}
          <div className="border-t border-slate-800 mx-3" />
          
          {/* Quitter */}
          <div className="p-3">
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm transition-colors">
              <LogOut size={18} />
              <span>{isDemo ? 'Quitter démo' : 'Déconnexion'}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className={`sticky top-0 z-30 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'} backdrop-blur border-b px-4 py-3 flex items-center gap-4`}>
          <button onClick={() => setSidebarOpen(true)} className={`lg:hidden p-2 rounded-lg ${isDark ? 'text-white hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Menu size={24} /></button>
          {isDemo && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1"><Gamepad2 size={14} /> Démo</span>}
          {modeDiscret && <span className="px-3 py-1 bg-slate-700 text-white rounded-full text-xs font-medium flex items-center gap-1"><EyeOff size={14} /></span>}
          <div className="flex-1" />
          
          {/* Bouton Notifications avec dropdown */}
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className={`relative p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}>
              <Bell size={20} />
              {unreadNotifs.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            
            {/* Dropdown notifications */}
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border'}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : ''}`}>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : ''}`}>Notifications</h3>
                    {unreadNotifs.length > 0 && (
                      <button onClick={markAllNotifsRead} className="text-xs text-orange-500 hover:text-orange-600">Tout marquer lu</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={32} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                        <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markNotifRead(n.id)} className={`px-4 py-3 cursor-pointer transition-colors ${!n.read ? (isDark ? 'bg-slate-700/50' : 'bg-orange-50') : ''} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{n.message}</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.date}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Bouton Nouveau avec dropdown */}
          <div className="relative">
            <button onClick={() => setShowQuickAdd(!showQuickAdd)} className="px-4 py-2 text-white rounded-xl flex items-center gap-2 transition-all hover:shadow-lg" style={{background: couleur}}>
              <Plus size={18} /> <span className="hidden sm:inline">Nouveau</span>
            </button>
            
            {showQuickAdd && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl z-50 py-2 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border'}`}>
                  {[
                    { label: 'Nouveau devis', icon: FileText, action: () => { setPage('devis'); setCreateMode('devis'); setShowQuickAdd(false); } },
                    { label: 'Nouveau client', icon: Users, action: () => { setPage('clients'); setCreateMode('client'); setShowQuickAdd(false); } },
                    { label: 'Nouveau chantier', icon: Building2, action: () => { setPage('chantiers'); setCreateMode('chantier'); setShowQuickAdd(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-3 px-4 py-3 ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-50'} transition-colors`}>
                      <item.icon size={18} style={{color: couleur}} />
                      <span>{item.label}</span>
                      <ChevronRight size={16} className={`ml-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        <main className={`p-4 lg:p-6 ${isDark ? 'text-white' : ''}`}>
          {dataLoading ? <PageSkeleton /> : (
            <>
              {page === 'dashboard' && <Dashboard clients={clients} devis={devis} chantiers={chantiers} events={events} getChantierBilan={getChantierBilan} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} modeDiscret={modeDiscret} couleur={couleur} isDark={isDark} />}
              {page === 'devis' && <DevisPage clients={clients} setClients={setClients} devis={devis} setDevis={setDevis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={addDevis} onUpdate={updateDevis} onDelete={deleteDevis} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} isDark={isDark} couleur={couleur} createMode={createMode} setCreateMode={setCreateMode} />}
              {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={setDepenses} pointages={pointages} setPointages={setPointages} equipe={equipe} devis={devis} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} isDark={isDark} createMode={createMode} setCreateMode={setCreateMode} />}
              {page === 'planning' && <Planning events={events} setEvents={setEvents} addEvent={addEvent} chantiers={chantiers} equipe={equipe} setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier} couleur={couleur} isDark={isDark} />}
              {page === 'clients' && <Clients clients={clients} setClients={setClients} devis={devis} chantiers={chantiers} onSubmit={addClient} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} isDark={isDark} createMode={createMode} setCreateMode={setCreateMode} />}
              {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={setCatalogue} couleur={couleur} isDark={isDark} />}
              {page === 'equipe' && <Equipe equipe={equipe} setEquipe={setEquipe} pointages={pointages} setPointages={setPointages} chantiers={chantiers} couleur={couleur} isDark={isDark} />}
              {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} isDark={isDark} couleur={couleur} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
