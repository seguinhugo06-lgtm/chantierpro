import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, isDemo } from './supabaseClient';

// Eager load critical components
import Dashboard from './components/Dashboard';
import FABMenu from './components/FABMenu';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';

// Lazy load heavy page components for code splitting
const Chantiers = lazy(() => import('./components/Chantiers'));
const Planning = lazy(() => import('./components/Planning'));
const Clients = lazy(() => import('./components/Clients'));
const DevisPage = lazy(() => import('./components/DevisPage'));
const Equipe = lazy(() => import('./components/Equipe'));
const Catalogue = lazy(() => import('./components/Catalogue'));
const Settings = lazy(() => import('./components/Settings'));
const AdminHelp = lazy(() => import('./components/admin-help/AdminHelp'));
const DevisWizard = lazy(() => import('./components/DevisWizard'));
const QuickClientModal = lazy(() => import('./components/QuickClientModal'));
const QuickChantierModal = lazy(() => import('./components/QuickChantierModal'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const DesignSystemDemo = lazy(() => import('./components/DesignSystemDemo'));
const TresorerieModule = lazy(() => import('./components/tresorerie/TresorerieModule'));
const BibliothequeOuvrages = lazy(() => import('./components/catalogue/BibliothequeOuvrages'));
const SousTraitantsModule = lazy(() => import('./components/soustraitants/SousTraitantsModule'));
const CommandesFournisseurs = lazy(() => import('./components/commandes/CommandesFournisseurs'));
const IADevisAnalyse = lazy(() => import('./components/ia/IADevisAnalyse'));
const CarnetEntretien = lazy(() => import('./components/entretien/CarnetEntretien'));
const SignatureModule = lazy(() => import('./components/signatures/SignatureModule'));
const ExportComptable = lazy(() => import('./components/export/ExportComptable'));
import { useConfirm, useToast } from './context/AppContext';
import { useData } from './context/DataContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ConfirmModal } from './components/ui/Modal';
import ToastContainer from './components/ui/ToastContainer';
import ModalContainer from './components/ui/ModalContainer';
import { Home, FileText, Building2, Calendar, Users, Package, HardHat, Settings as SettingsIcon, Eye, EyeOff, Sun, Moon, LogOut, Menu, Bell, Plus, ChevronRight, ChevronDown, BarChart3, HelpCircle, Search, X, CheckCircle, AlertCircle, Info, Clock, Receipt, Wifi, WifiOff, Palette, Wallet, Library, UserCheck, ShoppingCart, Camera, ClipboardList, PenTool, Download } from 'lucide-react';
import { registerNetworkListeners, getPendingCount } from './lib/offline/sync';

// Theme classes helper
const getThemeClasses = (isDark) => ({
  card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
  cardHover: isDark ? "hover:bg-slate-700" : "hover:bg-slate-50",
  input: isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
  text: isDark ? "text-slate-100" : "text-slate-900",
  textSecondary: isDark ? "text-slate-300" : "text-slate-700",
  textMuted: isDark ? "text-slate-400" : "text-slate-600",
  bg: isDark ? "bg-slate-900" : "bg-slate-100",
  border: isDark ? "border-slate-700" : "border-slate-200",
});

export default function App() {
  // Global context hooks
  const { confirmModal, closeConfirm } = useConfirm();
  const { showToast, toast, hideToast } = useToast();

  // Data from DataContext (replaces local state)
  const {
    clients, setClients, addClient: dataAddClient, updateClient: dataUpdateClient,
    devis, setDevis, addDevis: dataAddDevis, updateDevis: dataUpdateDevis, deleteDevis: dataDeleteDevis,
    chantiers, setChantiers, addChantier: dataAddChantier, updateChantier: dataUpdateChantier,
    depenses, setDepenses, addDepense,
    pointages, setPointages,
    equipe, setEquipe,
    ajustements, addAjustement: dataAddAjustement, deleteAjustement: dataDeleteAjustement,
    catalogue, setCatalogue, deductStock,
    paiements, addPaiement: dataAddPaiement,
    echanges, addEchange: dataAddEchange,
    getChantierBilan
  } = useData();

  // Events stored separately (not in DataContext yet)
  const [events, setEvents] = useState([]);

  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '' });
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state - persist page in localStorage to survive refresh
  const [page, setPage] = useState(() => {
    try {
      const savedPage = localStorage.getItem('cp_current_page');
      return savedPage || 'dashboard';
    } catch { return 'dashboard'; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [createMode, setCreateMode] = useState({ devis: false, chantier: false, client: false });
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFABDevisWizard, setShowFABDevisWizard] = useState(false);
  const [showFABQuickClient, setShowFABQuickClient] = useState(false);
  const [showFABQuickChantier, setShowFABQuickChantier] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !isDemo && !localStorage.getItem('chantierpro_onboarding_complete'));

  // Settings state
  const [theme, setTheme] = useState('light');
  const [modeDiscret, setModeDiscret] = useState(false);
  const [entreprise, setEntreprise] = useState({
    nom: 'Martin Renovation', logo: '', couleur: '#f97316',
    formeJuridique: '', capital: '', adresse: '', tel: '', email: '', siteWeb: '',
    siret: '', codeApe: '', rcs: '', tvaIntra: '', validiteDevis: 30, tvaDefaut: 10,
    delaiPaiement: 30, acompteDefaut: 30, tauxFraisStructure: 15
  });

  // CRUD wrappers with toasts (delegate to DataContext)
  const addClient = async (data) => { const c = await dataAddClient(data); showToast(`Client "${data.nom}" ajouté`, 'success'); return c; };
  const updateClient = async (id, data) => { await dataUpdateClient(id, data); showToast(`Client "${data.nom || 'mis à jour'}" modifié`, 'success'); };
  const addDevis = (data) => dataAddDevis(data);
  const updateDevis = (id, data) => dataUpdateDevis(id, data);
  const deleteDevis = (id) => { dataDeleteDevis(id); showToast('Document supprimé', 'info'); };
  const addChantier = (data) => { const c = dataAddChantier(data); showToast(`Chantier "${data.nom}" créé`, 'success'); return c; };
  const updateChantier = (id, data) => dataUpdateChantier(id, data);
  const addAjustement = (data) => { const a = dataAddAjustement(data); showToast('Ajustement enregistré', 'success'); return a; };
  const deleteAjustement = (id) => { dataDeleteAjustement(id); showToast('Ajustement supprimé', 'info'); };
  const addEchange = (data) => dataAddEchange(data);
  const addPaiement = (data) => { const p = dataAddPaiement(data); showToast(`Paiement de ${(data.amount || 0).toLocaleString('fr-FR')} EUR enregistré`, 'success'); return p; };
  const addEvent = (data) => { const e = { id: `ev${Date.now()}`, ...data }; setEvents(prev => [...prev, e]); showToast('Événement ajouté', 'success'); return e; };

  // Load settings from localStorage
  useEffect(() => {
    try {
      const e = localStorage.getItem('cp_entreprise'); if (e) setEntreprise(JSON.parse(e));
      const t = localStorage.getItem('cp_theme'); if (t) setTheme(t);
      const m = localStorage.getItem('cp_mode_discret'); if (m) setModeDiscret(JSON.parse(m));
    } catch (err) { console.warn('Failed to load settings from localStorage:', err.message); }
  }, []);
  useEffect(() => { try { localStorage.setItem('cp_entreprise', JSON.stringify(entreprise)); } catch (e) { console.warn('Failed to save entreprise:', e.message); } }, [entreprise]);
  useEffect(() => { try { localStorage.setItem('cp_theme', theme); } catch (e) { console.warn('Failed to save theme:', e.message); } }, [theme]);
  useEffect(() => { try { localStorage.setItem('cp_mode_discret', JSON.stringify(modeDiscret)); } catch (e) { console.warn('Failed to save modeDiscret:', e.message); } }, [modeDiscret]);
  useEffect(() => { try { localStorage.setItem('cp_current_page', page); } catch (e) { console.warn('Failed to save page:', e.message); } }, [page]);

  // Auth state listener - persists session across page refreshes
  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const u = await auth.getCurrentUser();
        setUser(u);
      } catch (e) { console.warn('Auth check failed:', e.message); }
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

  const stats = { 
    devisAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length, 
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length 
  };

  // Auth handlers
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      const { error } = await auth.signIn(authForm.email, authForm.password);
      if (error) setAuthError(error.message);
    } catch (e) {
      setAuthError('Erreur de connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom });
      if (error) setAuthError(error.message);
      else { showToast('Compte créé ✓', 'success'); setShowSignUp(false); }
    } catch (e) {
      setAuthError('Erreur lors de la création du compte');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSignOut = async () => {
    try { await auth.signOut(); } catch (e) { console.warn('Sign out error:', e.message); }
    setUser(null);
  };
  
  const markNotifRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotifsRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));

  // Global search results
  const searchResults = searchQuery.length > 1 ? {
    clients: clients.filter(c =>
      `${c.nom} ${c.prenom} ${c.email} ${c.telephone}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3),
    chantiers: chantiers.filter(c =>
      `${c.nom} ${c.adresse}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3),
    devis: devis.filter(d =>
      `${d.numero} ${clients.find(c => c.id === d.client_id)?.nom || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3)
  } : { clients: [], chantiers: [], devis: [] };

  const hasSearchResults = searchResults.clients.length > 0 || searchResults.chantiers.length > 0 || searchResults.devis.length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      const target = e.target;
      const tagName = target.tagName.toLowerCase();
      const isInput = ['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable;

      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      // Cmd/Ctrl + D for new devis
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isInput) {
        e.preventDefault();
        setShowFABDevisWizard(true);
        return;
      }

      // Cmd/Ctrl + H for new chantier
      if ((e.metaKey || e.ctrlKey) && e.key === 'h' && !isInput) {
        e.preventDefault();
        setShowFABQuickChantier(true);
        return;
      }

      // Cmd/Ctrl + N for new client
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !isInput) {
        e.preventDefault();
        setShowFABQuickClient(true);
        return;
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowQuickAdd(false);
        setShowNotifs(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Network status listener for offline mode
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingCount();
      setPendingSync(count);
    };

    const unsubscribe = registerNetworkListeners(
      () => {
        setIsOnline(true);
        updatePendingCount();
        showToast('Connexion rétablie', 'success');
      },
      () => {
        setIsOnline(false);
        showToast('Mode hors ligne activé', 'info');
      }
    );

    updatePendingCount();
    return unsubscribe;
  }, []);

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
            <p className="text-2xl text-white/90 mb-8">Pilotez votre rentabilité</p>
            <div className="space-y-6">
              {[
                { icon: BarChart3, text: 'Marge temps réel' },
                { icon: Users, text: 'Gestion équipe' },
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
          
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="text-slate-400 mb-8">{showSignUp ? 'Commencez gratuitement' : 'Accédez à votre espace'}</p>
          
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && (
              <input
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Nom entreprise"
                value={authForm.nom}
                onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))}
                aria-label="Nom de l'entreprise"
                autoComplete="organization"
              />
            )}
            <input
              type="email"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              placeholder="Email"
              value={authForm.email}
              onChange={e => setAuthForm(p => ({...p, email: e.target.value}))}
              required
              aria-label="Adresse email"
              autoComplete="email"
            />
            <div>
              <input
                type="password"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Mot de passe"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({...p, password: e.target.value}))}
                required
                aria-label="Mot de passe"
                autoComplete={showSignUp ? "new-password" : "current-password"}
              />
              {!showSignUp && (
                <button
                  type="button"
                  onClick={() => showToast('Contactez support@chantierpro.fr', 'info')}
                  className="text-sm text-slate-400 hover:text-orange-400 mt-2 transition-colors self-end"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            {authError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                {authError}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{showSignUp ? 'Création...' : 'Connexion...'}</span>
                </>
              ) : (
                showSignUp ? 'Créer mon compte' : 'Se connecter'
              )}
            </button>
          </form>
          
          <p className="text-center text-slate-400 mt-6">
            {showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}{' '}
            <button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 hover:text-orange-400 font-medium">
              {showSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // Calculate stats for badges
  const facturesImpayees = devis.filter(d => d.type === 'facture' && !['payee', 'brouillon'].includes(d.statut)).length;
  const devisEnAttenteCount = devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length;
  const todayEvents = events.filter(e => e.date === new Date().toISOString().split('T')[0]).length;

  // Navigation items - full sidebar with all sections
  // Badges now include explicit context for clarity
  const nav = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    {
      id: 'devis',
      icon: FileText,
      label: 'Devis & Factures',
      badge: stats.devisAttente + facturesImpayees,
      badgeColor: facturesImpayees > 0 ? '#ef4444' : '#f97316',
      badgeTitle: facturesImpayees > 0
        ? `${facturesImpayees} facture${facturesImpayees > 1 ? 's' : ''} impayée${facturesImpayees > 1 ? 's' : ''}, ${devisEnAttenteCount} devis en attente`
        : `${devisEnAttenteCount} devis en attente de réponse`
    },
    {
      id: 'chantiers',
      icon: Building2,
      label: 'Chantiers',
      badge: stats.chantiersEnCours,
      badgeColor: '#22c55e',
      badgeTitle: `${stats.chantiersEnCours} chantier${stats.chantiersEnCours > 1 ? 's' : ''} en cours`
    },
    {
      id: 'planning',
      icon: Calendar,
      label: 'Planning',
      badge: todayEvents,
      badgeColor: '#3b82f6',
      badgeTitle: `${todayEvents} événement${todayEvents > 1 ? 's' : ''} aujourd'hui`
    },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'catalogue', icon: Package, label: 'Catalogue' },
    { id: 'ouvrages', icon: Library, label: 'Ouvrages' },
    { id: 'soustraitants', icon: UserCheck, label: 'Sous-Traitants' },
    { id: 'commandes', icon: ShoppingCart, label: 'Commandes' },
    { id: 'tresorerie', icon: Wallet, label: 'Trésorerie' },
    { id: 'ia-devis', icon: Camera, label: 'IA Devis' },
    { id: 'entretien', icon: ClipboardList, label: 'Entretien' },
    { id: 'signatures', icon: PenTool, label: 'Signatures' },
    { id: 'export', icon: Download, label: 'Export Compta' },
    { id: 'equipe', icon: HardHat, label: 'Équipe' },
    { id: 'admin', icon: HelpCircle, label: 'Administratif' },
    { id: 'settings', icon: SettingsIcon, label: 'Paramètres' }
  ];
  
  // Generate notifications from data
  useEffect(() => {
    const notifs = [];
    const now = new Date();

    // Overdue invoices (factures unpaid > 30 days)
    devis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(f => {
      const days = Math.floor((now - new Date(f.date)) / 86400000);
      if (days > 30) {
        notifs.push({ id: `overdue-${f.id}`, message: `Facture ${f.numero || '#'} impayée depuis ${days} jours`, date: `${days}j de retard`, read: false, type: 'urgent' });
      }
    });

    // Stale devis (sent > 10 days without response)
    devis.filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const days = Math.floor((now - new Date(d.date)) / 86400000);
      if (days > 10) {
        notifs.push({ id: `stale-${d.id}`, message: `Devis ${d.numero || '#'} sans réponse depuis ${days} jours`, date: 'À relancer', read: false, type: 'warning' });
      }
    });

    // Expired insurance
    if (entreprise.rcProValidite && new Date(entreprise.rcProValidite) < now) {
      notifs.push({ id: 'rc-expired', message: 'Votre assurance RC Pro est expirée', date: 'Action requise', read: false, type: 'urgent' });
    }
    if (entreprise.decennaleValidite && new Date(entreprise.decennaleValidite) < now) {
      notifs.push({ id: 'dec-expired', message: 'Votre assurance Décennale est expirée', date: 'Action requise', read: false, type: 'urgent' });
    }

    // Incomplete profile
    const requiredFields = ['nom', 'adresse', 'siret', 'tel', 'email'];
    const missingFields = requiredFields.filter(k => !entreprise[k] || String(entreprise[k]).trim() === '');
    if (missingFields.length > 0) {
      notifs.push({ id: 'profile-incomplete', message: `${missingFields.length} champ${missingFields.length > 1 ? 's' : ''} obligatoire${missingFields.length > 1 ? 's' : ''} manquant${missingFields.length > 1 ? 's' : ''} dans votre profil`, date: 'Paramètres', read: false, type: 'info' });
    }

    // Preserve read status from previous notifications
    setNotifications(prev => {
      const readIds = new Set(prev.filter(n => n.read).map(n => n.id));
      return notifs.map(n => ({ ...n, read: readIds.has(n.id) }));
    });
  }, [devis, entreprise.rcProValidite, entreprise.decennaleValidite, entreprise.nom, entreprise.adresse, entreprise.siret, entreprise.tel, entreprise.email]);

  const couleur = entreprise.couleur || '#f97316';
  const unreadNotifs = notifications.filter(n => !n.read);

  return (
    <div className={`min-h-screen ${tc.bg}`}>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-offset-2"
        style={{ '--tw-ring-color': couleur }}
      >
        Aller au contenu principal
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar - Optimized mobile layout */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:shadow-none`}>
        {/* Header with close button on mobile */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: couleur}}>
            <Building2 size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">{entreprise.nom || 'ChantierPro'}</h1>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable navigation area */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {/* Main navigation */}
          <nav className="space-y-0.5" aria-label="Navigation principale">
            {nav.slice(0, 4).map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                style={page === n.id ? {background: couleur} : {}}
                aria-current={page === n.id ? 'page' : undefined}
              >
                <n.icon size={18} aria-hidden="true" />
                <span className="flex-1 text-left truncate">{n.label}</span>
                {n.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-white text-[10px] rounded-full min-w-[20px] text-center"
                    style={{ background: n.badgeColor || '#ef4444' }}
                    title={n.badgeTitle}
                  >
                    {n.badge > 99 ? '99+' : n.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Separator */}
          <div className="my-2 mx-3 border-t border-slate-800" />

          {/* Secondary navigation */}
          <nav className="space-y-0.5" aria-label="Gestion">
            {nav.slice(4).map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                style={page === n.id ? {background: couleur} : {}}
                aria-current={page === n.id ? 'page' : undefined}
              >
                <n.icon size={18} aria-hidden="true" />
                <span className="flex-1 text-left truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom actions - fixed at bottom */}
        <div className="flex-shrink-0 p-2 border-t border-slate-800 space-y-0.5">
          <div className="flex gap-1">
            <button
              onClick={() => setModeDiscret(!modeDiscret)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${modeDiscret ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              title={modeDiscret ? 'Désactiver mode discret' : 'Activer mode discret'}
            >
              {modeDiscret ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline text-xs">Discret</span>
            </button>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 text-sm transition-colors"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline text-xs">{isDark ? 'Clair' : 'Sombre'}</span>
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-900/50 hover:text-red-400 text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`lg:pl-64 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
        {/* Header - Optimized for mobile */}
        <header className={`sticky top-0 z-30 backdrop-blur border-b px-2 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-3 ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-slate-100/95 border-slate-200'}`}>
          {/* Menu button - mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden p-2 rounded-xl min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center ${isDark ? 'text-white hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>

          {/* Logo - compact on mobile */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
              style={{background: couleur}}
            >
              <Building2 size={16} className="text-white" />
            </div>
            <span className={`font-semibold text-sm truncate hidden sm:block lg:text-base ${tc.text}`}>
              {entreprise.nom || 'ChantierPro'}
            </span>
          </div>

          {/* Status badges - compact on mobile */}
          <div className="hidden xs:flex items-center gap-1.5">
            {!isOnline && (
              <span className="px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 bg-amber-500 text-white">
                <WifiOff size={12} />
                <span className="hidden md:inline">Hors ligne</span>
              </span>
            )}
            {isOnline && pendingSync > 0 && (
              <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                <Wifi size={12} className="animate-pulse" />
                <span className="hidden md:inline">Sync</span>
              </span>
            )}
          </div>

          {/* Search button - tablet and desktop */}
          <button
            onClick={() => setShowSearch(true)}
            className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all flex-1 max-w-[200px] lg:max-w-xs ${isDark ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50 text-slate-400' : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-500'}`}
          >
            <Search size={16} />
            <span className="text-sm truncate">Rechercher...</span>
            <kbd className={`ml-auto text-xs px-1.5 py-0.5 rounded hidden lg:block ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>⌘K</kbd>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search button - mobile only (icon) */}
          <button
            onClick={() => setShowSearch(true)}
            className={`md:hidden p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
            aria-label="Rechercher"
          >
            <Search size={18} />
          </button>

          {/* Theme toggle - hidden on mobile, shown in sidebar instead */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`hidden sm:flex p-2 rounded-xl min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] items-center justify-center transition-all ${isDark ? 'hover:bg-slate-700 text-amber-400' : 'hover:bg-slate-200 text-slate-600'}`}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Help button - tablet and desktop only */}
          <button
            onClick={() => setShowHelp(true)}
            className={`hidden md:flex p-2 rounded-xl min-w-[44px] min-h-[44px] items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
            title="Aide"
          >
            <HelpCircle size={18} />
          </button>

          {/* Mode discret toggle - combined indicator and button */}
          <button
            onClick={() => setModeDiscret(!modeDiscret)}
            className={`p-2 rounded-xl min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center transition-colors ${modeDiscret ? 'text-white' : isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
            style={modeDiscret ? {background: couleur} : {}}
            title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
          >
            {modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${showNotifs ? 'text-white shadow-lg' : isDark ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`}
              style={showNotifs ? {background: couleur} : {}}
              title={unreadNotifs.length > 0 ? `${unreadNotifs.length} notification${unreadNotifs.length > 1 ? 's' : ''} non lue${unreadNotifs.length > 1 ? 's' : ''}` : 'Notifications'}
              aria-label={`Notifications${unreadNotifs.length > 0 ? ` (${unreadNotifs.length} non lues)` : ''}`}
              aria-expanded={showNotifs}
            >
              <Bell size={20} className={showNotifs ? 'animate-pulse' : ''} />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md" style={{background: couleur}}>
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={() => setShowNotifs(false)}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div
                  className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b" style={{background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)`, borderColor: isDark ? '#334155' : '#e2e8f0'}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} style={{color: couleur}} />
                        <h3 className={`font-semibold ${tc.text}`}>Notifications</h3>
                        {unreadNotifs.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full" style={{background: couleur}}>
                            {unreadNotifs.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadNotifs.length > 0 && (
                          <button onClick={markAllNotifsRead} className="text-xs hover:underline" style={{color: couleur}}>
                            Tout lire
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifs(false)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                        >
                          <X size={18} className={tc.textMuted} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center" style={{background: `${couleur}15`}}>
                          <Bell size={18} style={{color: couleur}} />
                        </div>
                        <p className={`text-sm font-medium ${tc.text}`}>Tout est à jour</p>
                        <p className={`text-xs mt-0.5 ${tc.textMuted}`}>Aucune notification</p>
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
                            <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${
                              n.type === 'urgent' ? (isDark ? 'bg-red-500/15' : 'bg-red-50') :
                              n.type === 'warning' ? (isDark ? 'bg-amber-500/15' : 'bg-amber-50') :
                              (isDark ? 'bg-blue-500/15' : 'bg-blue-50')
                            }`}>
                              {n.type === 'urgent' ? <AlertCircle size={14} className="text-red-500" /> :
                               n.type === 'warning' ? <Clock size={14} className="text-amber-500" /> :
                               <Info size={14} className="text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.read ? 'font-medium' : ''} ${tc.text}`}>{n.message}</p>
                              <p className={`text-xs mt-1 ${tc.textMuted}`}>{n.date}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{background: couleur}}></span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick add */}
          <div className="relative">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-white rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all hover:shadow-lg min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]"
              style={{background: couleur}}
              aria-label="Créer nouveau"
            >
              <Plus size={18} />
              <span className="hidden sm:inline text-sm font-medium">Nouveau</span>
            </button>

            {showQuickAdd && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />
                <div className={`absolute right-0 top-full mt-2 w-48 sm:w-56 max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
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

          {/* User avatar */}
          <button
            onClick={() => setPage('settings')}
            className={`ml-1 w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg`}
            style={{background: couleur}}
            title={user?.email || 'Mon compte'}
            aria-label="Mon compte"
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </button>
        </header>

        {/* Page content */}
        <main id="main-content" className={`${page === 'dashboard' ? '' : 'p-3 sm:p-4 lg:p-6'} ${tc.text} max-w-[1800px] mx-auto`}>
          <ErrorBoundary isDark={isDark} showDetails={true}>
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} /></div>}>
              {page === 'dashboard' && <Dashboard clients={clients} devis={devis} chantiers={chantiers} events={events} depenses={depenses} pointages={pointages} equipe={equipe} ajustements={ajustements} entreprise={entreprise} getChantierBilan={getChantierBilan} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} setCreateMode={setCreateMode} modeDiscret={modeDiscret} setModeDiscret={setModeDiscret} couleur={couleur} isDark={isDark} showHelp={showHelp} setShowHelp={setShowHelp} user={user} onOpenSearch={() => setShowSearch(true)} />}
              {page === 'devis' && <DevisPage clients={clients} setClients={setClients} addClient={addClient} devis={devis} setDevis={setDevis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={addDevis} onUpdate={updateDevis} onDelete={deleteDevis} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} isDark={isDark} couleur={couleur} createMode={createMode.devis} setCreateMode={(v) => setCreateMode(p => ({...p, devis: v}))} addChantier={addChantier} setPage={setPage} setSelectedChantier={setSelectedChantier} addEchange={addEchange} paiements={paiements} addPaiement={addPaiement} />}
              {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={setDepenses} pointages={pointages} setPointages={setPointages} equipe={equipe} devis={devis} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} isDark={isDark} createMode={createMode.chantier} setCreateMode={(v) => setCreateMode(p => ({...p, chantier: v}))} />}
              {page === 'planning' && <Planning events={events} setEvents={setEvents} addEvent={addEvent} chantiers={chantiers} equipe={equipe} setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier} couleur={couleur} isDark={isDark} />}
              {page === 'clients' && <Clients clients={clients} setClients={setClients} updateClient={updateClient} devis={devis} chantiers={chantiers} echanges={echanges} onSubmit={addClient} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} isDark={isDark} createMode={createMode.client} setCreateMode={(v) => setCreateMode(p => ({...p, client: v}))} />}
              {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={setCatalogue} couleur={couleur} isDark={isDark} />}
              {page === 'ouvrages' && <BibliothequeOuvrages catalogue={catalogue} isDark={isDark} couleur={couleur} />}
              {page === 'soustraitants' && <SousTraitantsModule chantiers={chantiers} isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'commandes' && <CommandesFournisseurs chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'tresorerie' && <TresorerieModule devis={devis} depenses={depenses} chantiers={chantiers} clients={clients} entreprise={entreprise} isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'ia-devis' && <IADevisAnalyse catalogue={catalogue} clients={clients} isDark={isDark} couleur={couleur} />}
              {page === 'entretien' && <CarnetEntretien chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'signatures' && <SignatureModule devis={devis} chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur} />}
              {page === 'export' && <ExportComptable devis={devis} depenses={depenses} chantiers={chantiers} clients={clients} entreprise={entreprise} isDark={isDark} couleur={couleur} />}
              {page === 'equipe' && <Equipe equipe={equipe} setEquipe={setEquipe} pointages={pointages} setPointages={setPointages} chantiers={chantiers} couleur={couleur} isDark={isDark} />}
              {page === 'admin' && <AdminHelp chantiers={chantiers} clients={clients} devis={devis} factures={devis.filter(d => d.type === 'facture')} depenses={depenses} entreprise={entreprise} isDark={isDark} couleur={couleur} />}
              {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} depenses={depenses} clients={clients} chantiers={chantiers} isDark={isDark} couleur={couleur} />}
              {page === 'design-system' && <DesignSystemDemo />}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Floating Action Button (FAB) for quick actions - hidden on form pages */}
        <FABMenu
          onNewDevis={() => setShowFABDevisWizard(true)}
          onNewClient={() => setShowFABQuickClient(true)}
          onNewChantier={() => setShowFABQuickChantier(true)}
          isDark={isDark}
          couleur={couleur}
          hidden={
            createMode.devis || createMode.chantier || createMode.client ||
            selectedChantier !== null ||
            showFABDevisWizard || showFABQuickClient || showFABQuickChantier ||
            showSearch ||
            page === 'devis' || page === 'settings'
          }
        />
      </div>

      {/* FAB Devis Wizard */}
      {showFABDevisWizard && (
        <Suspense fallback={null}>
          <DevisWizard
            isOpen={showFABDevisWizard}
            onClose={() => setShowFABDevisWizard(false)}
            onSubmit={(data) => {
              const newDevis = {
                id: `d${Date.now()}`,
                numero: `DEV-${new Date().getFullYear()}-${String(devis.filter(d => d.type === 'devis').length + 1).padStart(3, '0')}`,
                ...data,
                date: new Date().toISOString().split('T')[0],
                statut: 'brouillon'
              };
              setDevis(prev => [...prev, newDevis]);
              setShowFABDevisWizard(false);
              showToast('Devis créé ✓', 'success');
            }}
            clients={clients}
            catalogue={catalogue}
            chantiers={chantiers}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* FAB Quick Client Modal */}
      {showFABQuickClient && (
        <Suspense fallback={null}>
          <QuickClientModal
            isOpen={showFABQuickClient}
            onClose={() => setShowFABQuickClient(false)}
            onSubmit={(data) => {
              const newClient = { id: `c${Date.now()}`, ...data };
              setClients(prev => [...prev, newClient]);
              setShowFABQuickClient(false);
              showToast('Client ajouté !', 'success');
            }}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* FAB Quick Chantier Modal */}
      {showFABQuickChantier && (
        <Suspense fallback={null}>
          <QuickChantierModal
            isOpen={showFABQuickChantier}
            onClose={() => setShowFABQuickChantier(false)}
            onSubmit={(data) => {
              const newChantier = {
                id: `ch${Date.now()}`,
                ...data,
                statut: 'prospect',
                avancement: 0,
                photos: [],
                taches: []
              };
              setChantiers(prev => [...prev, newChantier]);
              setShowFABQuickChantier(false);
              showToast('Chantier créé !', 'success');
            }}
            clients={clients}
            devis={devis}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* Global Help Modal */}
      {showHelp && <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} isDark={isDark} couleur={couleur} tc={tc} />}

      {/* Onboarding Modal for first-time users */}
      {showOnboarding && <OnboardingModal setShowOnboarding={setShowOnboarding} isDark={isDark} couleur={couleur} />}

      {/* Command Palette (⌘K) */}
      <Suspense fallback={null}>
        <CommandPalette
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          setPage={setPage}
          setSelectedChantier={setSelectedChantier}
          setSelectedDevis={setSelectedDevis}
          clients={clients}
          chantiers={chantiers}
          devis={devis}
          onNewDevis={(type) => {
            setCreateMode(p => ({ ...p, devis: true }));
            setPage('devis');
          }}
          onNewClient={() => setShowFABQuickClient(true)}
          onNewChantier={() => setShowFABQuickChantier(true)}
          isDark={isDark}
          couleur={couleur}
        />
      </Suspense>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up ${
              toast.type === 'success' ? (isDark ? 'bg-emerald-900/90 text-emerald-100' : 'bg-emerald-600 text-white') :
              toast.type === 'error' ? (isDark ? 'bg-red-900/90 text-red-100' : 'bg-red-600 text-white') :
              toast.type === 'warning' ? (isDark ? 'bg-amber-900/90 text-amber-100' : 'bg-amber-600 text-white') :
              (isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-white')
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'warning' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={hideToast} className="ml-2 opacity-70 hover:opacity-100" aria-label="Fermer la notification">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal (Legacy) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onCancel || closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
        isDark={isDark}
      />

      {/* New Zustand-based Modal System */}
      <ModalContainer isDark={isDark} />

      {/* New Zustand-based Toast System */}
      <ToastContainer position="bottom-right" />

      {/* PWA Install/Update Prompt - visible sur mobile */}
      <PWAUpdatePrompt />
    </div>
  );
}

// Help Modal Component
function HelpModal({ showHelp, setShowHelp, isDark, couleur, tc }) {
  const [helpSection, setHelpSection] = useState('overview');

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-700';

  const helpSections = {
    overview: {
      title: "Bienvenue",
      titleFull: "Bienvenue dans ChantierPro",
      icon: "🏠",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>ChantierPro est votre assistant de gestion quotidien. Suivez vos chantiers, vos devis et votre rentabilité en quelques clics.</p>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>💡 Exemple concret</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Jean, plombier, utilise ChantierPro pour : créer ses devis en 5 min, suivre la marge de chaque chantier, et ne jamais oublier une relance client.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <h4 className={`font-semibold mb-2 ${textPrimary}`}>📍 Par où commencer ?</h4>
            <ol className={`text-sm space-y-2 ${textSecondary}`}>
              <li>1. Configurez votre entreprise dans <strong>Paramètres</strong></li>
              <li>2. Ajoutez vos prestations dans le <strong>Catalogue</strong></li>
              <li>3. Créez votre premier <strong>Client</strong> et <strong>Devis</strong></li>
            </ol>
          </div>
        </div>
      )
    },
    devis: {
      title: "Devis & Factures",
      titleFull: "Créer et gérer vos devis",
      icon: "📋",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Créez des devis professionnels et transformez-les en factures en un clic.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>1. Créer un devis</h5>
              <p className={`text-sm ${textSecondary}`}>Cliquez sur "Nouveau" puis ajoutez vos lignes depuis le catalogue ou manuellement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>2. Envoyer au client</h5>
              <p className={`text-sm ${textSecondary}`}>Générez le PDF et envoyez-le par WhatsApp ou email directement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>3. Convertir en facture</h5>
              <p className={`text-sm ${textSecondary}`}>Devis accepté ? Demandez un acompte ou facturez directement.</p>
            </div>
          </div>
        </div>
      )
    },
    chantiers: {
      title: "Chantiers",
      titleFull: "Suivre vos chantiers",
      icon: "🏗️",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Suivez chaque chantier : dépenses, heures, avancement et rentabilité.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>📊 Suivi financier</h5>
              <p className={`text-sm ${textSecondary}`}>Ajoutez vos dépenses (matériaux, sous-traitance) et pointez les heures. La marge se calcule automatiquement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>📸 Photos de chantier</h5>
              <p className={`text-sm ${textSecondary}`}>Prenez des photos avant/pendant/après pour documenter votre travail.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>✅ To-do list</h5>
              <p className={`text-sm ${textSecondary}`}>Créez des tâches pour ne rien oublier sur chaque chantier.</p>
            </div>
          </div>
        </div>
      )
    },
    rentabilite: {
      title: "Rentabilité",
      titleFull: "Comprendre votre marge",
      icon: "💰",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>La marge nette est calculée automatiquement :</p>
          <div className={`p-4 rounded-xl font-mono text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <p className={textPrimary}>Marge = CA - Dépenses - Main d'œuvre</p>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <span className="text-2xl">🟢</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{">"} 40% = Excellent</p>
                <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Vous êtes très rentable</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <span className="text-2xl">🟡</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>20-40% = Correct</p>
                <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Marge standard du BTP</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <span className="text-2xl">🔴</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>{"<"} 20% = Attention</p>
                <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>Revoyez vos prix ou coûts</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    astuces: {
      title: "Astuces",
      titleFull: "Astuces pour gagner du temps",
      icon: "⚡",
      content: (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>📱 Utilisez le sur mobile</h4>
            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>ChantierPro fonctionne parfaitement sur téléphone. Ajoutez-le à votre écran d'accueil pour un accès rapide.</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>🎨 Personnalisez</h4>
            <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>Dans Paramètres, ajoutez votre logo et choisissez votre couleur. Vos devis auront un aspect professionnel unique.</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>📊 Mode discret</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>Cliquez sur l'œil pour masquer les montants. Pratique quand un client regarde votre écran !</p>
          </div>
        </div>
      )
    }
  };

  const currentSection = helpSections[helpSection];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHelp(false)}>
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                <span className="text-xl">❓</span>
              </div>
              <div>
                <h2 className={`font-bold text-lg ${textPrimary}`}>Guide d'utilisation</h2>
                <p className={`text-sm ${textSecondary}`}>Tout savoir sur ChantierPro</p>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <span className={textPrimary}>✕</span>
            </button>
          </div>
        </div>

        {/* Tabs - Mobile only */}
        <div className={`md:hidden border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex overflow-x-auto p-2 gap-1 scrollbar-hide">
            {Object.entries(helpSections).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setHelpSection(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap min-h-[40px] transition-colors flex-shrink-0 ${
                  helpSection === key
                    ? 'text-white'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={helpSection === key ? { background: couleur } : {}}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content with sidebar for desktop */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Desktop only */}
          <div className={`hidden md:block w-48 border-r ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} p-3`}>
            <div className="space-y-1">
              {Object.entries(helpSections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setHelpSection(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                    helpSection === key
                      ? 'text-white'
                      : isDark
                        ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  style={helpSection === key ? { background: couleur } : {}}
                >
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{currentSection.icon}</span>
              <h3 className={`text-xl font-bold ${textPrimary}`}>{currentSection.titleFull || currentSection.title}</h3>
            </div>
            {currentSection.content}
          </div>
        </div>
      </div>
    </div>
  );
}

// Onboarding Modal for first-time users
function OnboardingModal({ setShowOnboarding, isDark, couleur }) {
  const [step, setStep] = useState(0);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-700';

  const steps = [
    {
      icon: "👋",
      title: "Bienvenue sur ChantierPro",
      subtitle: "Votre assistant de gestion pour artisan",
      content: (
        <div className="space-y-4">
          <p className={`text-center ${textSecondary}`}>
            Gérez vos devis, factures et chantiers en toute simplicité. Tout est pensé pour vous faire gagner du temps.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <span className="text-3xl mb-2 block">📋</span>
              <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Devis en 5 min</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <span className="text-3xl mb-2 block">💰</span>
              <p className={`text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Marge automatique</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <span className="text-3xl mb-2 block">📱</span>
              <p className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Mobile friendly</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: "📋",
      title: "Créez vos devis rapidement",
      subtitle: "Du devis à la facture en 2 clics",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: couleur + '30' }}>
                  <FileText size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>DEV-2025-001</p>
                  <p className={`text-sm ${textSecondary}`}>Client: Dupont Marie</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Accepté</span>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-white'} space-y-2`}>
              <div className="flex justify-between text-sm">
                <span className={textSecondary}>Rénovation cuisine complète</span>
                <span className={textPrimary}>5 000 €</span>
              </div>
              <div className={`pt-2 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'} flex justify-between`}>
                <span className={`font-medium ${textPrimary}`}>Total TTC</span>
                <span className="font-bold text-lg" style={{ color: couleur }}>5 500 €</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>✓ Accepté</span>
            <span className={textSecondary}>→</span>
            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>💰 Facturer</span>
          </div>
        </div>
      )
    },
    {
      icon: "🏗️",
      title: "Suivez vos chantiers",
      subtitle: "Dépenses, heures et rentabilité",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-bold ${textPrimary}`}>Rénovation Dupont</p>
                <p className={`text-sm ${textSecondary}`}>En cours</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">67%</p>
                <p className={`text-xs ${textSecondary}`}>Marge nette</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-blue-500">5 500€</p>
                <p className={`text-xs ${textSecondary}`}>CA</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-red-500">1 200€</p>
                <p className={`text-xs ${textSecondary}`}>Dépenses</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-emerald-500">3 685€</p>
                <p className={`text-xs ${textSecondary}`}>Marge</p>
              </div>
            </div>
          </div>
          <p className={`text-center text-sm ${textSecondary}`}>
            Ajoutez vos dépenses et heures pour calculer automatiquement votre rentabilité
          </p>
        </div>
      )
    },
    {
      icon: "🚀",
      title: "Prêt à commencer ?",
      subtitle: "Votre première étape",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>1</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Configurez votre entreprise</p>
                  <p className={`text-sm ${textSecondary}`}>Allez dans Paramètres pour ajouter votre logo et vos infos</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>2</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Créez votre premier client</p>
                  <p className={`text-sm ${textSecondary}`}>Ajoutez les coordonnées de vos clients pour les retrouver facilement</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>3</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Créez votre premier devis</p>
                  <p className={`text-sm ${textSecondary}`}>Générez un devis professionnel en quelques minutes</p>
                </div>
              </li>
            </ol>
          </div>
          <p className={`text-center text-sm ${textSecondary}`}>
            Besoin d'aide ? Cliquez sur <strong>?</strong> en haut à droite à tout moment
          </p>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  const completeOnboarding = () => {
    localStorage.setItem('chantierpro_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('chantierpro_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative`}>
        {/* Close button */}
        <button
          onClick={skipOnboarding}
          className={`absolute top-4 right-4 p-2 rounded-xl z-10 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        {/* Progress bar */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: couleur }}></div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className="text-5xl mb-4 block">{currentStep.icon}</span>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>{currentStep.title}</h2>
            <p className={textSecondary}>{currentStep.subtitle}</p>
          </div>

          {currentStep.content}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setStep(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${i === step ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                    style={i === step ? { background: couleur } : {}}
                  />
                ))}
              </div>
              <button
                onClick={skipOnboarding}
                className={`text-xs ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Passer
              </button>
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className={`px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Retour
                </button>
              )}
              <button
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : completeOnboarding()}
                className="px-4 py-2 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                style={{ background: couleur }}
              >
                {step < steps.length - 1 ? 'Suivant' : 'Terminer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
