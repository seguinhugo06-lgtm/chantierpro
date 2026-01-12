import React, { useState, useEffect } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';

// ============================================
// CHANTIERPRO V3 - APP COMPLÈTE
// ============================================

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [stocks, setStocks] = useState([]);
  
  // Auth state
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', prenom: '', entreprise: '' });
  const [authError, setAuthError] = useState('');

  // Forms state
  const [showClientForm, setShowClientForm] = useState(false);
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ============================================
  // AUTH & DATA LOADING
  // ============================================
  useEffect(() => {
    let mounted = true;
    auth.getCurrentUser().then(u => {
      if (mounted) { setUser(u); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    
    const result = auth.onAuthStateChange((event, session) => {
      if (mounted && event !== 'INITIAL_SESSION') setUser(session?.user ?? null);
    });
    return () => { mounted = false; result?.data?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (user) loadAllData();
  }, [user]);

  const loadAllData = async () => {
    const [clientsRes, devisRes] = await Promise.all([clientsDB.getAll(), devisDB.getAll()]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (devisRes.data) setDevis(devisRes.data);
    
    const savedChantiers = localStorage.getItem('cp_chantiers');
    const savedEvents = localStorage.getItem('cp_events');
    const savedEquipe = localStorage.getItem('cp_equipe');
    const savedStocks = localStorage.getItem('cp_stocks');
    
    if (savedChantiers) setChantiers(JSON.parse(savedChantiers));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedEquipe) setEquipe(JSON.parse(savedEquipe));
    if (savedStocks) setStocks(JSON.parse(savedStocks));
  };

  // ============================================
  // CRUD FUNCTIONS
  // ============================================
  const saveToLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // Clients
  const handleClientSubmit = async (data) => {
    if (editingItem) await clientsDB.update(editingItem.id, data);
    else await clientsDB.create(data);
    const { data: updated } = await clientsDB.getAll();
    if (updated) setClients(updated);
    setShowClientForm(false);
    setEditingItem(null);
  };

  // Devis
  const handleDevisSubmit = async (data) => {
    if (editingItem) await devisDB.update(editingItem.id, data);
    else await devisDB.create(data);
    const { data: updated } = await devisDB.getAll();
    if (updated) setDevis(updated);
    setShowDevisForm(false);
    setEditingItem(null);
  };

  const changerStatutDevis = async (id, statut) => {
    await devisDB.update(id, { statut });
    const { data: updated } = await devisDB.getAll();
    if (updated) setDevis(updated);
  };

  // Chantiers
  const handleChantierSubmit = (data) => {
    let updated;
    if (editingItem) {
      updated = chantiers.map(c => c.id === editingItem.id ? { ...c, ...data } : c);
    } else {
      const newChantier = { id: Date.now().toString(), numero: `CH-${Date.now()}`, ...data };
      updated = [...chantiers, newChantier];
    }
    setChantiers(updated);
    saveToLocal('cp_chantiers', updated);
    setShowChantierForm(false);
    setEditingItem(null);
  };

  const updateChantierStatut = (id, statut) => {
    const updated = chantiers.map(c => c.id === id ? { ...c, statut } : c);
    setChantiers(updated);
    saveToLocal('cp_chantiers', updated);
  };

  const deleteChantier = (id) => {
    const updated = chantiers.filter(c => c.id !== id);
    setChantiers(updated);
    saveToLocal('cp_chantiers', updated);
  };

  // Events
  const handleEventSubmit = (data) => {
    let updated;
    if (editingItem) {
      updated = events.map(e => e.id === editingItem.id ? { ...e, ...data } : e);
    } else {
      updated = [...events, { id: Date.now().toString(), ...data }];
    }
    setEvents(updated);
    saveToLocal('cp_events', updated);
    setShowEventForm(false);
    setEditingItem(null);
  };

  const deleteEvent = (id) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveToLocal('cp_events', updated);
  };

  // Equipe
  const handleEquipeSubmit = (data) => {
    let updated;
    if (editingItem) {
      updated = equipe.map(e => e.id === editingItem.id ? { ...e, ...data } : e);
    } else {
      updated = [...equipe, { id: Date.now().toString(), ...data }];
    }
    setEquipe(updated);
    saveToLocal('cp_equipe', updated);
  };

  // Stocks
  const handleStockSubmit = (data) => {
    let updated;
    if (editingItem) {
      updated = stocks.map(s => s.id === editingItem.id ? { ...s, ...data } : s);
    } else {
      updated = [...stocks, { id: Date.now().toString(), ...data }];
    }
    setStocks(updated);
    saveToLocal('cp_stocks', updated);
  };

  // Auth
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await auth.signIn(authForm.email, authForm.password);
    if (error) setAuthError(error.message);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await auth.signUp(authForm.email, authForm.password, {
      nom: authForm.nom, prenom: authForm.prenom, entreprise: authForm.entreprise
    });
    if (error) setAuthError(error.message);
    else { alert('Compte créé ! Vérifiez votre email.'); setShowSignUp(false); }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    setClients([]);
    setDevis([]);
  };

  // ============================================
  // COMPUTED STATS
  // ============================================
  const stats = {
    caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee' &&
      new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    caAnnee: devis.filter(d => d.type === 'facture' && d.statut === 'payee' &&
      new Date(d.date).getFullYear() === new Date().getFullYear()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    devisEnAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'brouillon'].includes(d.statut)),
    montantEnAttente: devis.filter(d => d.type === 'devis' && d.statut === 'envoye').reduce((s, d) => s + (d.total_ttc || 0), 0),
    facturesImpayees: devis.filter(d => d.type === 'facture' && d.statut !== 'payee'),
    montantImpaye: devis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0),
    tauxConversion: devis.filter(d => d.type === 'devis').length > 0
      ? Math.round((devis.filter(d => d.statut === 'accepte').length / devis.filter(d => d.type === 'devis').length) * 100) : 0,
    clientsActifs: clients.length,
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length,
    stocksBas: stocks.filter(s => s.quantite <= s.seuil_alerte).length,
  };

  // ============================================
  // LOADING SCREEN
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏗️</div>
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // AUTH SCREEN
  // ============================================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex">
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center">
          <div className="max-w-md text-white">
            <div className="text-6xl mb-6">🏗️</div>
            <h1 className="text-4xl font-bold mb-4">ChantierPro</h1>
            <p className="text-xl opacity-90 mb-8">La solution complète pour gérer vos chantiers, clients et équipes.</p>
            <div className="space-y-3">
              {['📊 Dashboard intelligent', '🏗️ Gestion chantiers', '📄 Devis & Factures', '👥 Planning équipe', '📦 Gestion stocks'].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-lg">{f}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <div className="text-5xl mb-2">🏗️</div>
              <h1 className="text-2xl font-bold text-white">ChantierPro</h1>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
            <p className="text-slate-400 mb-8">{showSignUp ? 'Commencez gratuitement' : 'Accédez à votre espace'}</p>
            <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {showSignUp && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Nom" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} required className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                    <input type="text" placeholder="Prénom" value={authForm.prenom} onChange={e => setAuthForm(p => ({...p, prenom: e.target.value}))} className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                  </div>
                  <input type="text" placeholder="Entreprise" value={authForm.entreprise} onChange={e => setAuthForm(p => ({...p, entreprise: e.target.value}))} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                </>
              )}
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
              <input type="password" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
              {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
              <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all">
                {showSignUp ? 'Créer mon compte' : 'Se connecter'}
              </button>
            </form>
            <p className="text-center text-slate-400 mt-6">
              {showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}
              <button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 font-semibold ml-2">{showSignUp ? 'Se connecter' : "S'inscrire"}</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN APP
  // ============================================
  const navigation = [
    { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
    { id: 'chantiers', icon: '🏗️', label: 'Chantiers', badge: stats.chantiersEnCours },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures', badge: stats.facturesImpayees.length },
    { id: 'planning', icon: '📅', label: 'Planning' },
    { id: 'equipe', icon: '👷', label: 'Équipe' },
    { id: 'stocks', icon: '📦', label: 'Stocks', badge: stats.stocksBas },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-xl">🏗️</div>
          <div>
            <h1 className="text-white font-bold">ChantierPro</h1>
            <p className="text-slate-400 text-xs truncate max-w-[140px]">{String(user?.user_metadata?.entreprise || user?.email || '')}</p>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPage === item.id ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <span>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">☰</button>
            <div className="flex-1">
              <input type="text" placeholder="Rechercher..." className="w-full max-w-md px-4 py-2 bg-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <button className="relative p-2 hover:bg-slate-100 rounded-xl">🔔<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span></button>
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">+ Nouveau</button>
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">{(user?.email?.[0] || 'U').toUpperCase()}</div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-8">
          {currentPage === 'dashboard' && <DashboardPage stats={stats} clients={clients} devis={devis} chantiers={chantiers} events={events} setCurrentPage={setCurrentPage} />}
          {currentPage === 'chantiers' && <ChantiersPage chantiers={chantiers} clients={clients} showForm={showChantierForm} setShowForm={setShowChantierForm} editingItem={editingItem} setEditingItem={setEditingItem} onSubmit={handleChantierSubmit} onUpdateStatut={updateChantierStatut} onDelete={deleteChantier} />}
          {currentPage === 'clients' && <ClientsPage clients={clients} devis={devis} showForm={showClientForm} setShowForm={setShowClientForm} editingItem={editingItem} setEditingItem={setEditingItem} onSubmit={handleClientSubmit} />}
          {currentPage === 'devis' && <DevisPage clients={clients} devis={devis} showForm={showDevisForm} setShowForm={setShowDevisForm} editingItem={editingItem} setEditingItem={setEditingItem} onSubmit={handleDevisSubmit} onChangeStatut={changerStatutDevis} />}
          {currentPage === 'planning' && <PlanningPage events={events} clients={clients} chantiers={chantiers} showForm={showEventForm} setShowForm={setShowEventForm} editingItem={editingItem} setEditingItem={setEditingItem} onSubmit={handleEventSubmit} onDelete={deleteEvent} />}
          {currentPage === 'equipe' && <EquipePage equipe={equipe} chantiers={chantiers} onSubmit={handleEquipeSubmit} />}
          {currentPage === 'stocks' && <StocksPage stocks={stocks} onSubmit={handleStockSubmit} />}
          {currentPage === 'settings' && <SettingsPage user={user} />}
        </main>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
function DashboardPage({ stats, clients, devis, chantiers, events, setCurrentPage }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const chantiersEnCours = chantiers.filter(c => c.statut === 'en_cours');
  const recentDevis = devis.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Alertes */}
      {stats.facturesImpayees.length > 0 && (
        <div onClick={() => setCurrentPage('devis')} className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100">
          <span className="text-2xl">⚠️</span>
          <span className="font-medium">{stats.facturesImpayees.length} facture(s) impayée(s) - {stats.montantImpaye.toLocaleString('fr-FR')} €</span>
          <span className="ml-auto">→</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" label="CA du mois" value={`${stats.caMois.toLocaleString('fr-FR')} €`} sub={`Année: ${stats.caAnnee.toLocaleString('fr-FR')} €`} color="orange" />
        <StatCard icon="📄" label="Devis en attente" value={stats.devisEnAttente.length} sub={`${stats.montantEnAttente.toLocaleString('fr-FR')} € potentiel`} color="blue" />
        <StatCard icon="🏗️" label="Chantiers en cours" value={stats.chantiersEnCours} sub={`${chantiers.length} au total`} color="green" />
        <StatCard icon="📈" label="Taux conversion" value={`${stats.tauxConversion}%`} sub={`${stats.clientsActifs} clients`} color="purple" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chantiers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold">🏗️ Chantiers en cours</h3>
            <button onClick={() => setCurrentPage('chantiers')} className="text-sm text-orange-500 font-medium">Voir tout →</button>
          </div>
          {chantiersEnCours.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-4xl mb-2">🏗️</p>
              <p>Aucun chantier en cours</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {chantiersEnCours.slice(0, 4).map(c => {
                const client = clients.find(cl => cl.id === c.client_id);
                return (
                  <div key={c.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{c.nom}</h4>
                        <p className="text-sm text-slate-500">👤 {client?.nom || 'Client'} • 📍 {c.adresse || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p>
                        <p className="text-xs text-slate-500">Fin: {c.date_fin_prevue ? new Date(c.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.progression || 0}%` }}></div>
                      </div>
                      <span className="text-sm font-medium">{c.progression || 0}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Aujourd'hui */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold">📅 Aujourd'hui</h3>
              <button onClick={() => setCurrentPage('planning')} className="text-sm text-orange-500 font-medium">Planning →</button>
            </div>
            <div className="p-4">
              {todayEvents.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Aucun événement</p>
              ) : (
                <div className="space-y-3">
                  {todayEvents.slice(0, 4).map(e => (
                    <div key={e.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${e.type === 'chantier' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <span className="text-sm font-medium text-slate-500 w-12">{e.time}</span>
                      <span className="text-sm truncate">{e.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold mb-4">⚡ Actions rapides</h3>
            <div className="space-y-2">
              {[
                { icon: '📝', label: 'Créer un devis', page: 'devis' },
                { icon: '👤', label: 'Ajouter client', page: 'clients' },
                { icon: '🏗️', label: 'Nouveau chantier', page: 'chantiers' },
                { icon: '📅', label: 'Planifier RDV', page: 'planning' },
              ].map((a, i) => (
                <button key={i} onClick={() => setCurrentPage(a.page)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left">
                  <span>{a.icon}</span>
                  <span className="text-sm font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CHANTIERS PAGE (Liste + Kanban)
// ============================================
function ChantiersPage({ chantiers, clients, showForm, setShowForm, editingItem, setEditingItem, onSubmit, onUpdateStatut, onDelete }) {
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', description: '', date_debut: '', date_fin_prevue: '', budget_prevu: '', statut: 'prospect', priorite: 'normale', progression: 0 });

  useEffect(() => {
    if (editingItem) setForm(editingItem);
    else setForm({ nom: '', client_id: '', adresse: '', description: '', date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', budget_prevu: '', statut: 'prospect', priorite: 'normale', progression: 0 });
  }, [editingItem, showForm]);

  const filtered = chantiers.filter(c => filter === 'all' || c.statut === filter);
  const STATUTS = { prospect: '🎯 Prospect', devis: '📄 Devis', en_cours: '🔨 En cours', pause: '⏸️ Pause', termine: '✅ Terminé', annule: '❌ Annulé' };
  const PRIORITES = { basse: 'Basse', normale: 'Normale', haute: 'Haute', urgente: 'Urgente' };
  const COLORS = { prospect: 'slate', devis: 'blue', en_cours: 'green', pause: 'yellow', termine: 'emerald', annule: 'red' };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 hover:bg-slate-100 rounded-lg">← Retour</button>
          <h1 className="text-2xl font-bold">{editingItem ? 'Modifier' : 'Nouveau'} chantier</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, budget_prevu: parseFloat(form.budget_prevu) || 0, progression: parseInt(form.progression) || 0 }); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label><input type="text" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Client *</label><select value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))} required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label><input type="text" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date début</label><input type="date" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date fin prévue</label><input type="date" value={form.date_fin_prevue} onChange={e => setForm(p => ({...p, date_fin_prevue: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Budget (€)</label><input type="number" value={form.budget_prevu} onChange={e => setForm(p => ({...p, budget_prevu: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Progression (%)</label><input type="number" min="0" max="100" value={form.progression} onChange={e => setForm(p => ({...p, progression: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Statut</label><select value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl">{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Priorité</label><select value={form.priorite} onChange={e => setForm(p => ({...p, priorite: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl">{Object.entries(PRIORITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-4 py-2 bg-slate-100 rounded-xl font-medium">Annuler</button>
              <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600">{editingItem ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chantiers</h1>
          <p className="text-slate-500">{chantiers.length} chantiers • {chantiers.filter(c => c.statut === 'en_cours').length} en cours</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600">+ Nouveau chantier</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl">
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'list' ? 'bg-white shadow' : ''}`}>☰ Liste</button>
          <button onClick={() => setView('kanban')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'kanban' ? 'bg-white shadow' : ''}`}>▦ Kanban</button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <h3 className="text-lg font-semibold">Aucun chantier</h3>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">+ Créer un chantier</button>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {filtered.map(c => {
            const client = clients.find(cl => cl.id === c.client_id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.nom}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${COLORS[c.statut]}-100 text-${COLORS[c.statut]}-700`}>{STATUTS[c.statut]}</span>
                    </div>
                    <p className="text-sm text-slate-500">👤 {client?.nom || '-'} • 📍 {c.adresse || '-'}</p>
                  </div>
                  <div className="w-40">
                    <div className="flex justify-between text-sm mb-1"><span>Progression</span><span>{c.progression || 0}%</span></div>
                    <div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.progression || 0}%` }}></div></div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p>
                    <p className="text-xs text-slate-500">Fin: {c.date_fin_prevue ? new Date(c.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(c); setShowForm(true); }} className="p-2 hover:bg-slate-100 rounded-lg">✏️</button>
                    <button onClick={() => { if(confirm('Supprimer ?')) onDelete(c.id); }} className="p-2 hover:bg-red-50 rounded-lg text-red-500">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {['prospect', 'devis', 'en_cours', 'pause', 'termine'].map(statut => {
            const items = filtered.filter(c => c.statut === statut);
            return (
              <div key={statut} className="flex-shrink-0 w-72"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('id'); if (id) onUpdateStatut(id, statut); }}>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <span>{STATUTS[statut]}</span>
                  <span className="ml-auto bg-slate-200 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="bg-slate-100 rounded-xl p-3 min-h-[400px] space-y-3">
                  {items.map(c => {
                    const client = clients.find(cl => cl.id === c.client_id);
                    return (
                      <div key={c.id} draggable onDragStart={e => e.dataTransfer.setData('id', c.id)}
                        onClick={() => { setEditingItem(c); setShowForm(true); }}
                        className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md border">
                        <h4 className="font-medium text-sm mb-1">{c.nom}</h4>
                        <p className="text-xs text-slate-500 mb-2">👤 {client?.nom || '-'}</p>
                        <div className="h-1.5 bg-slate-100 rounded-full mb-2"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.progression || 0}%` }}></div></div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>📅 {c.date_fin_prevue ? new Date(c.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}</span>
                          <span className="font-semibold text-slate-900">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ icon, label, value, sub, color }) {
  const colors = { orange: 'from-orange-500 to-orange-600', blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-green-600', purple: 'from-purple-500 to-purple-600' };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-xl text-white`}>{icon}</div>
      </div>
    </div>
  );
}

// CLIENTS PAGE
function ClientsPage({ clients, devis, showForm, setShowForm, editingItem, setEditingItem, onSubmit }) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });
  useEffect(() => { if (editingItem) setForm(editingItem); else setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' }); }, [editingItem, showForm]);
  const filtered = clients.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()));
  const getStats = (id) => { const docs = devis.filter(d => d.client_id === id); return { docs: docs.length, ca: docs.filter(d => d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0) }; };
  if (showForm) return (<div className="space-y-6"><button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 hover:bg-slate-100 rounded-lg">← Retour</button><h1 className="text-2xl font-bold">{editingItem ? 'Modifier' : 'Nouveau'} client</h1><div className="bg-white rounded-2xl border p-6"><form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="text" placeholder="Nom *" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} required className="px-4 py-2.5 border rounded-xl" /><input type="text" placeholder="Prénom" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><input type="email" placeholder="Email *" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required className="px-4 py-2.5 border rounded-xl" /><input type="tel" placeholder="Téléphone *" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} required className="px-4 py-2.5 border rounded-xl" /><textarea placeholder="Adresse" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} className="md:col-span-2 px-4 py-2.5 border rounded-xl" /><div className="md:col-span-2 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl">Enregistrer</button></div></form></div></div>);
  return (<div className="space-y-6"><div className="flex justify-between"><h1 className="text-2xl font-bold">Clients ({clients.length})</h1><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div><input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2 border rounded-xl" />{filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👥</p><h3>Aucun client</h3></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => { const s = getStats(c.id); return (<div key={c.id} className="bg-white rounded-2xl border p-5"><div className="flex justify-between mb-3"><div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">{c.nom[0]}</div><button onClick={() => { setEditingItem(c); setShowForm(true); }} className="p-2 hover:bg-slate-100 rounded-lg">✏️</button></div><h3 className="font-semibold">{c.nom} {c.prenom}</h3><p className="text-sm text-slate-500">📧 {c.email}</p><p className="text-sm text-slate-500">📱 {c.telephone}</p><div className="flex justify-around mt-4 pt-4 border-t text-center"><div><p className="font-bold">{s.docs}</p><p className="text-xs text-slate-500">Docs</p></div><div><p className="font-bold">{s.ca.toLocaleString('fr-FR')} €</p><p className="text-xs text-slate-500">CA</p></div></div></div>); })}</div>}</div>);
}

// DEVIS PAGE
function DevisPage({ clients, devis, showForm, setShowForm, onSubmit, onChangeStatut }) {
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], validite: 30 });
  const [ligne, setLigne] = useState({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' });
  const filtered = devis.filter(d => filter === 'all' || (filter === 'devis' && d.type === 'devis') || (filter === 'factures' && d.type === 'facture'));
  const addLigne = () => { if (!ligne.description) return; setForm(p => ({ ...p, lignes: [...p.lignes, { ...ligne, montant: ligne.quantite * ligne.prixUnitaire }] })); setLigne({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' }); };
  const totaux = form.lignes.reduce((s, l) => s + (l.montant || 0), 0);
  const handleSubmit = () => { if (!form.clientId || form.lignes.length === 0) return alert('Remplissez tous les champs'); onSubmit({ client_id: form.clientId, numero: `${form.type === 'devis' ? 'DEV' : 'FACT'}-${Date.now()}`, date: form.date, type: form.type, statut: 'brouillon', lignes: form.lignes, total_ht: totaux, tva: totaux * 0.2, total_ttc: totaux * 1.2 }); };
  if (showForm) return (<div className="space-y-6"><button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">← Retour</button><h1 className="text-2xl font-bold">Nouveau {form.type}</h1><div className="bg-white rounded-2xl border p-6 space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><select value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))} className="px-4 py-2.5 border rounded-xl"><option value="">Client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select><input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className="px-4 py-2.5 border rounded-xl"><option value="devis">Devis</option><option value="facture">Facture</option></select></div><div className="flex gap-2"><input placeholder="Description" value={ligne.description} onChange={e => setLigne(p => ({...p, description: e.target.value}))} className="flex-1 px-3 py-2 border rounded-lg" /><input type="number" placeholder="Qté" value={ligne.quantite} onChange={e => setLigne(p => ({...p, quantite: parseFloat(e.target.value) || 1}))} className="w-20 px-3 py-2 border rounded-lg" /><input type="number" placeholder="Prix" value={ligne.prixUnitaire || ''} onChange={e => setLigne(p => ({...p, prixUnitaire: parseFloat(e.target.value) || 0}))} className="w-24 px-3 py-2 border rounded-lg" /><button onClick={addLigne} className="px-4 py-2 bg-orange-500 text-white rounded-lg">+</button></div>{form.lignes.length > 0 && <div className="border rounded-xl overflow-hidden">{form.lignes.map((l, i) => <div key={i} className="flex px-4 py-2 border-b"><span className="flex-1">{l.description}</span><span className="w-20">{l.quantite}</span><span className="w-24 text-right">{l.montant?.toFixed(2)} €</span></div>)}<div className="bg-slate-50 px-4 py-3 font-bold text-right text-orange-500">Total TTC: {(totaux * 1.2).toFixed(2)} €</div></div>}<div className="flex justify-end gap-3"><button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={handleSubmit} className="px-4 py-2 bg-orange-500 text-white rounded-xl">Créer</button></div></div></div>);
  return (<div className="space-y-6"><div className="flex justify-between"><h1 className="text-2xl font-bold">Devis & Factures</h1><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div><div className="flex gap-2">{['all', 'devis', 'factures'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl ${filter === f ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>{f === 'all' ? 'Tous' : f}</button>)}</div>{filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📄</p><h3>Aucun document</h3></div> : <div className="bg-white rounded-2xl border">{filtered.map(d => <div key={d.id} className="flex items-center px-4 py-3 border-b"><span className="flex-1 font-semibold">{d.numero}</span><span className="flex-1">{clients.find(c => c.id === d.client_id)?.nom || '-'}</span><span className="w-28 text-right font-bold">{d.total_ttc?.toFixed(2)} €</span><select value={d.statut} onChange={e => onChangeStatut(d.id, e.target.value)} className="ml-4 px-2 py-1 border rounded-lg text-sm">{['brouillon', 'envoye', 'accepte', 'payee'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>)}</div>}</div>);
}

// PLANNING PAGE
function PlanningPage({ events, clients, showForm, setShowForm, onSubmit, onDelete }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [form, setForm] = useState({ title: '', date: '', time: '09:00', type: 'rdv' });
  useEffect(() => { if (showForm) setForm(p => ({ ...p, date: selected.toISOString().split('T')[0] })); }, [showForm, selected]);
  const getDays = () => { const y = month.getFullYear(), m = month.getMonth(); const days = []; const start = (new Date(y, m, 1).getDay() + 6) % 7; for (let i = 0; i < start; i++) days.push(null); for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push(new Date(y, m, i)); return days; };
  const selStr = selected.toISOString().split('T')[0];
  const selEvents = events.filter(e => e.date === selStr);
  if (showForm) return (<div className="space-y-6"><button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">← Retour</button><h1 className="text-2xl font-bold">Nouvel événement</h1><div className="bg-white rounded-2xl border p-6"><form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Titre *" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required className="px-4 py-2.5 border rounded-xl" /><select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className="px-4 py-2.5 border rounded-xl"><option value="rdv">RDV</option><option value="chantier">Chantier</option></select><input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><input type="time" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl">Créer</button></div></form></div></div>);
  return (<div className="space-y-6"><div className="flex justify-between"><h1 className="text-2xl font-bold">Planning</h1><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white rounded-2xl border p-4"><div className="flex justify-between mb-4"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="p-2">←</button><h3 className="font-semibold capitalize">{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="p-2">→</button></div><div className="grid grid-cols-7 gap-1">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-center text-xs text-slate-500 py-2">{d}</div>)}{getDays().map((d, i) => d ? <button key={i} onClick={() => setSelected(d)} className={`aspect-square rounded-lg flex items-center justify-center text-sm ${d.toISOString().split('T')[0] === selStr ? 'bg-orange-500 text-white' : 'hover:bg-slate-100'}`}>{d.getDate()}</button> : <div key={i} />)}</div></div><div className="bg-white rounded-2xl border p-4"><h3 className="font-semibold mb-4">{selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>{selEvents.length === 0 ? <p className="text-slate-500 text-center py-8">Aucun événement</p> : <div className="space-y-3">{selEvents.map(e => <div key={e.id} className="p-3 bg-slate-50 rounded-xl"><div className="flex justify-between"><span className="text-sm font-medium">{e.time}</span><button onClick={() => onDelete(e.id)} className="text-red-500 text-sm">×</button></div><h4 className="font-medium">{e.title}</h4></div>)}</div>}</div></div></div>);
}

// EQUIPE + STOCKS + SETTINGS
function EquipePage({ equipe, onSubmit }) { const [show, setShow] = useState(false); const [form, setForm] = useState({ nom: '', prenom: '', role: 'ouvrier', telephone: '' }); if (show) return (<div className="space-y-6"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-lg">← Retour</button><h1 className="text-2xl font-bold">Nouveau membre</h1><div className="bg-white rounded-2xl border p-6"><form onSubmit={e => { e.preventDefault(); onSubmit(form); setShow(false); }} className="grid grid-cols-2 gap-4"><input placeholder="Nom *" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} required className="px-4 py-2.5 border rounded-xl" /><input placeholder="Prénom" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className="px-4 py-2.5 border rounded-xl"><option value="ouvrier">Ouvrier</option><option value="chef">Chef</option></select><input placeholder="Téléphone" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><div className="col-span-2 flex justify-end gap-3"><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button></div></form></div></div>); return (<div className="space-y-6"><div className="flex justify-between"><h1 className="text-2xl font-bold">Équipe ({equipe.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>{equipe.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👷</p><h3>Aucun membre</h3></div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{equipe.map(m => <div key={m.id} className="bg-white rounded-2xl border p-5"><div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold mb-3">{m.nom[0]}</div><h3 className="font-semibold">{m.nom} {m.prenom}</h3><p className="text-sm text-slate-500">{m.role}</p>{m.telephone && <p className="text-sm text-slate-500">📱 {m.telephone}</p>}</div>)}</div>}</div>); }
function StocksPage({ stocks, onSubmit }) { const [show, setShow] = useState(false); const [form, setForm] = useState({ nom: '', categorie: 'Autre', quantite: 0, seuil_alerte: 5, prix_unitaire: 0 }); if (show) return (<div className="space-y-6"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-lg">← Retour</button><h1 className="text-2xl font-bold">Nouveau matériau</h1><div className="bg-white rounded-2xl border p-6"><form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, quantite: parseFloat(form.quantite), prix_unitaire: parseFloat(form.prix_unitaire) }); setShow(false); }} className="grid grid-cols-2 gap-4"><input placeholder="Nom *" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} required className="px-4 py-2.5 border rounded-xl" /><select value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))} className="px-4 py-2.5 border rounded-xl">{['Plomberie', 'Électricité', 'Maçonnerie', 'Autre'].map(c => <option key={c}>{c}</option>)}</select><input type="number" placeholder="Quantité" value={form.quantite} onChange={e => setForm(p => ({...p, quantite: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><input type="number" placeholder="Seuil alerte" value={form.seuil_alerte} onChange={e => setForm(p => ({...p, seuil_alerte: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><input type="number" placeholder="Prix €" value={form.prix_unitaire} onChange={e => setForm(p => ({...p, prix_unitaire: e.target.value}))} className="px-4 py-2.5 border rounded-xl" /><div className="col-span-2 flex justify-end"><button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button></div></form></div></div>); const alertes = stocks.filter(s => s.quantite <= s.seuil_alerte); return (<div className="space-y-6"><div className="flex justify-between"><h1 className="text-2xl font-bold">Stocks ({stocks.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>{alertes.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><h3 className="font-semibold text-amber-800">⚠️ Stocks bas</h3><div className="flex gap-2 mt-2 flex-wrap">{alertes.map(s => <span key={s.id} className="px-3 py-1 bg-amber-100 rounded-full text-sm">{s.nom}: {s.quantite}</span>)}</div></div>}{stocks.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📦</p><h3>Aucun matériau</h3></div> : <div className="bg-white rounded-2xl border">{stocks.map(s => <div key={s.id} className={`flex items-center px-4 py-3 border-b ${s.quantite <= s.seuil_alerte ? 'bg-red-50' : ''}`}><span className="flex-1 font-medium">{s.nom}</span><span className="w-24">{s.categorie}</span><span className={`w-20 text-center font-semibold ${s.quantite <= s.seuil_alerte ? 'text-red-500' : ''}`}>{s.quantite}</span><span className="w-24 text-right">{s.prix_unitaire?.toFixed(2)} €</span></div>)}</div>}</div>); }
function SettingsPage({ user }) { return (<div className="space-y-6"><h1 className="text-2xl font-bold">Paramètres</h1><div className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-4">👤 Mon compte</h3><div className="space-y-3"><div className="flex justify-between py-2 border-b"><span className="text-slate-500">Email</span><span>{String(user?.email || '')}</span></div><div className="flex justify-between py-2 border-b"><span className="text-slate-500">Nom</span><span>{String(user?.user_metadata?.nom || '-')}</span></div><div className="flex justify-between py-2"><span className="text-slate-500">Entreprise</span><span>{String(user?.user_metadata?.entreprise || '-')}</span></div></div></div><div className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-4">💳 Abonnement</h3><div className="grid grid-cols-2 gap-4"><div className="border-2 rounded-xl p-6 text-center"><h4 className="font-bold">Solo</h4><p className="text-3xl font-bold text-orange-500 my-3">29€<span className="text-sm text-slate-500">/mois</span></p><button className="w-full py-2 bg-orange-500 text-white rounded-xl">Choisir</button></div><div className="border-2 border-green-500 rounded-xl p-6 text-center"><h4 className="font-bold">Pro</h4><p className="text-3xl font-bold text-green-500 my-3">59€<span className="text-sm text-slate-500">/mois</span></p><button className="w-full py-2 bg-green-500 text-white rounded-xl">Choisir</button></div></div></div></div>); }
"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau matériau</h1></div><div className="bg-white rounded-2xl border p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Référence</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Catégorie</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">Unité</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}><option>unité</option><option>m</option><option>m²</option><option>kg</option><option>litre</option><option>rouleau</option></select></div><div><label className="block text-sm font-medium mb-1">Quantité</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.quantite} onChange={e => setForm(p => ({...p, quantite: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Seuil alerte</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.seuil} onChange={e => setForm(p => ({...p, seuil: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Prix unitaire (€)</label><input type="number" step="0.01" className="w-full px-4 py-2.5 border rounded-xl" value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Emplacement</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.emplacement} onChange={e => setForm(p => ({...p, emplacement: e.target.value}))} placeholder="Entrepôt A, Étagère 3..." /></div></div><div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button></div></div></div>);
  return (<div className="space-y-6"><div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Stocks ({stocks.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>{lowStocks.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><div className="flex items-center gap-3 mb-3"><span className="text-2xl">⚠️</span><h3 className="font-semibold text-amber-800">Stocks bas ({lowStocks.length})</h3></div><div className="flex flex-wrap gap-2">{lowStocks.map(s => <span key={s.id} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">{s.nom}: {s.quantite} {s.unite}</span>)}</div></div>}{stocks.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📦</p><h3 className="font-semibold">Aucun matériau</h3><button onClick={() => setShow(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">+ Ajouter</button></div> : <div className="bg-white rounded-2xl border overflow-hidden"><div className="hidden md:flex px-5 py-3 bg-slate-50 text-sm font-medium text-slate-500"><span className="flex-1">Article</span><span className="w-28">Catégorie</span><span className="w-32 text-center">Quantité</span><span className="w-24 text-right">Prix unit.</span><span className="w-24 text-right">Valeur</span></div>{stocks.map(s => <div key={s.id} className={`flex flex-col md:flex-row md:items-center px-5 py-4 border-t gap-3 ${s.quantite <= (s.seuil || 5) ? 'bg-red-50' : ''}`}><div className="flex-1"><p className="font-medium text-slate-900">{s.nom}</p>{s.reference && <p className="text-xs text-slate-500">Réf: {s.reference}</p>}{s.emplacement && <p className="text-xs text-slate-400">📍 {s.emplacement}</p>}</div><span className="w-28 text-sm text-slate-600">{s.categorie}</span><div className="w-32 flex items-center justify-center gap-2"><button onClick={() => updateQty(s.id, -1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold">-</button><span className={`font-semibold min-w-[40px] text-center ${s.quantite <= (s.seuil || 5) ? 'text-red-600' : ''}`}>{s.quantite}</span><button onClick={() => updateQty(s.id, 1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold">+</button></div><span className="w-24 text-right text-slate-600">{(s.prix || 0).toFixed(2)} €</span><span className="w-24 text-right font-semibold">{((s.quantite || 0) * (s.prix || 0)).toFixed(2)} €</span></div>)}<div className="px-5 py-4 bg-slate-50 border-t flex justify-between"><span className="font-semibold">Valeur totale du stock</span><span className="font-bold text-orange-500">{stocks.reduce((sum, s) => sum + (s.quantite || 0) * (s.prix || 0), 0).toFixed(2)} €</span></div></div>}</div>);
}

function Settings({ user }) {
  const [tab, setTab] = useState('compte');
  return (<div className="space-y-6"><h1 className="text-2xl font-bold">Paramètres</h1><div className="flex gap-2 border-b border-slate-200 pb-2">{[['compte', '👤 Compte'], ['preferences', '⚙️ Préférences'], ['entreprise', '🏢 Entreprise']].map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium transition-all ${tab === k ? 'bg-white border border-b-white -mb-[3px] text-orange-500' : 'text-slate-500 hover:text-slate-700'}`}>{v}</button>)}</div>
  {tab === 'compte' && <div className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-6">Informations du compte</h3><div className="space-y-4"><div className="flex justify-between py-3 border-b"><span className="text-slate-500">Email</span><span className="font-medium">{String(user?.email || '-')}</span></div><div className="flex justify-between py-3 border-b"><span className="text-slate-500">Nom</span><span className="font-medium">{String(user?.user_metadata?.nom || '-')}</span></div><div className="flex justify-between py-3 border-b"><span className="text-slate-500">Entreprise</span><span className="font-medium">{String(user?.user_metadata?.entreprise || '-')}</span></div><div className="flex justify-between py-3"><span className="text-slate-500">Membre depuis</span><span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-'}</span></div></div></div>}
  {tab === 'preferences' && <div className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-6">Préférences</h3><div className="space-y-6"><div className="flex items-center justify-between py-3 border-b"><div><p className="font-medium">Notifications email</p><p className="text-sm text-slate-500">Recevoir des alertes par email</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" defaultChecked /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div></label></div><div className="flex items-center justify-between py-3 border-b"><div><p className="font-medium">Mode sombre</p><p className="text-sm text-slate-500">Interface en thème sombre</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div></label></div><div><label className="block font-medium mb-2">Taux de TVA par défaut</label><select className="px-4 py-2.5 border rounded-xl"><option>20%</option><option>10%</option><option>5.5%</option><option>0%</option></select></div></div></div>}
  {tab === 'entreprise' && <div className="space-y-6"><div className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-6">💳 Abonnement</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="border-2 border-slate-200 rounded-2xl p-6 text-center hover:border-orange-300 transition-colors"><h4 className="font-bold text-lg">Solo</h4><p className="text-4xl font-bold text-orange-500 my-4">29€<span className="text-sm text-slate-500 font-normal">/mois</span></p><ul className="text-sm text-slate-600 space-y-2 mb-6 text-left"><li>✅ Clients illimités</li><li>✅ Devis & Factures</li><li>✅ Calendrier</li><li>✅ 1 utilisateur</li></ul><button className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium">Choisir Solo</button></div><div className="border-2 border-green-500 rounded-2xl p-6 text-center relative"><div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">POPULAIRE</div><h4 className="font-bold text-lg">Pro</h4><p className="text-4xl font-bold text-green-500 my-4">59€<span className="text-sm text-slate-500 font-normal">/mois</span></p><ul className="text-sm text-slate-600 space-y-2 mb-6 text-left"><li>✅ Tout du Solo</li><li>✅ Multi-utilisateurs</li><li>✅ Gestion équipe</li><li>✅ Export comptable</li><li>✅ Support prioritaire</li></ul><button className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium">Choisir Pro</button></div></div></div><div className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-4">📤 Export des données</h3><p className="text-slate-500 text-sm mb-4">Téléchargez une copie de toutes vos données</p><div className="flex gap-3"><button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">📄 Export CSV</button><button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">📊 Export Excel</button></div></div></div>}
  </div>);
}
