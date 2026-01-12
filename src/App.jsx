import React, { useState, useEffect, useCallback } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';

// =============================================
// CHANTIERPRO V5 - APP COMPLÈTE BTP
// Toutes fonctionnalités artisans intégrées
// =============================================

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [pointages, setPointages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', entreprise: '' });
  const [authError, setAuthError] = useState('');
  const [meteo, setMeteo] = useState(null);

  // Auth
  useEffect(() => {
    let m = true;
    auth.getCurrentUser().then(u => { if (m) { setUser(u); setLoading(false); } }).catch(() => { if (m) setLoading(false); });
    const r = auth.onAuthStateChange((e, s) => { if (m && e !== 'INITIAL_SESSION') setUser(s?.user ?? null); });
    return () => { m = false; r?.data?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    const [c, d] = await Promise.all([clientsDB.getAll(), devisDB.getAll()]);
    if (c.data) setClients(c.data);
    if (d.data) setDevis(d.data);
    ['chantiers', 'events', 'equipe', 'stocks', 'pointages'].forEach(k => {
      const v = localStorage.getItem('cp_' + k);
      if (v) { const p = JSON.parse(v); if (k === 'chantiers') setChantiers(p); if (k === 'events') setEvents(p); if (k === 'equipe') setEquipe(p); if (k === 'stocks') setStocks(p); if (k === 'pointages') setPointages(p); }
    });
    // Météo simulée (en prod: API OpenWeather)
    setMeteo({ temp: 12, condition: 'nuageux', icon: '⛅', alerte: false });
  };

  // Notifications automatiques cross-pages
  useEffect(() => {
    const notifs = [];
    stocks.filter(s => s.quantite <= (s.seuil || 5)).forEach(s => notifs.push({ id: 's'+s.id, type: 'warning', icon: '📦', msg: `Stock bas: ${s.nom}`, page: 'stocks', priority: 2 }));
    devis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => notifs.push({ id: 'd'+d.id, type: 'danger', icon: '💰', msg: `Facture impayée: ${d.numero}`, page: 'devis', priority: 1 }));
    const today = new Date().toISOString().split('T')[0];
    events.filter(e => e.date === today).forEach(e => notifs.push({ id: 'e'+e.id, type: 'info', icon: '📅', msg: `Aujourd'hui: ${e.title}`, page: 'planning', priority: 3 }));
    chantiers.filter(c => c.statut === 'en_cours' && c.date_fin_prevue && new Date(c.date_fin_prevue) < new Date(Date.now() + 7*24*60*60*1000)).forEach(c => notifs.push({ id: 'c'+c.id, type: 'warning', icon: '⏰', msg: `Échéance proche: ${c.nom}`, page: 'chantiers', priority: 1 }));
    // Alerte météo
    if (meteo?.alerte) notifs.push({ id: 'meteo', type: 'danger', icon: '🌧️', msg: 'Alerte météo: Travaux extérieurs déconseillés', page: 'planning', priority: 0 });
    setNotifications(notifs.sort((a, b) => a.priority - b.priority));
  }, [stocks, devis, events, chantiers, meteo]);

  const save = (k, d) => localStorage.setItem('cp_' + k, JSON.stringify(d));
  const handleSignIn = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signIn(authForm.email, authForm.password); if (error) setAuthError(error.message); };
  const handleSignUp = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom, entreprise: authForm.entreprise }); if (error) setAuthError(error.message); else { alert('Compte créé !'); setShowSignUp(false); } };
  const handleSignOut = async () => { await auth.signOut(); setUser(null); };

  // Stats complètes
  const stats = {
    caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee' && new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    caAnnee: devis.filter(d => d.type === 'facture' && d.statut === 'payee' && new Date(d.date).getFullYear() === new Date().getFullYear()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    devisAttente: devis.filter(d => d.type === 'devis' && !['accepte', 'refuse'].includes(d.statut)),
    montantAttente: devis.filter(d => d.type === 'devis' && !['accepte', 'refuse'].includes(d.statut)).reduce((s, d) => s + (d.total_ttc || 0), 0),
    impayees: devis.filter(d => d.type === 'facture' && d.statut !== 'payee'),
    montantImpaye: devis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0),
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length,
    chantiersTotal: chantiers.length,
    stocksBas: stocks.filter(s => s.quantite <= (s.seuil || 5)).length,
    valeurStock: stocks.reduce((s, st) => s + (st.quantite || 0) * (st.prix || 0), 0),
    heuresMois: pointages.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0),
    tauxConversion: devis.length > 0 ? Math.round(devis.filter(d => d.type === 'devis' && d.statut === 'accepte').length / devis.filter(d => d.type === 'devis').length * 100) || 0 : 0,
  };

  // Recherche globale
  const searchResults = search.length > 1 ? [
    ...clients.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())).slice(0, 3).map(c => ({ type: 'client', icon: '👤', ...c })),
    ...chantiers.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())).slice(0, 3).map(c => ({ type: 'chantier', icon: '🏗️', ...c })),
    ...stocks.filter(s => s.nom?.toLowerCase().includes(search.toLowerCase())).slice(0, 2).map(s => ({ type: 'stock', icon: '📦', ...s })),
    ...equipe.filter(e => e.nom?.toLowerCase().includes(search.toLowerCase())).slice(0, 2).map(e => ({ type: 'equipe', icon: '👷', ...e })),
  ] : [];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4 animate-bounce">🏗️</div><p className="text-white">Chargement...</p></div></div>;

  // AUTH SCREEN
  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center">
        <div className="max-w-lg text-white">
          <div className="text-6xl mb-6">🏗️</div>
          <h1 className="text-5xl font-bold mb-4">ChantierPro</h1>
          <p className="text-xl opacity-90 mb-8">La solution tout-en-un pour artisans du BTP. Gérez chantiers, devis, équipes et stocks en un seul endroit.</p>
          <div className="grid grid-cols-2 gap-4">
            {['📊 Dashboard temps réel', '🏗️ Suivi chantiers', '📄 Devis & Factures', '👷 Pointage équipe', '📦 Gestion stocks', '📅 Planning intelligent', '⛅ Alertes météo', '📱 Mode terrain'].map((f, i) => <div key={i} className="flex items-center gap-2 text-sm bg-white/10 rounded-lg px-3 py-2">{f}</div>)}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8"><div className="text-5xl mb-2">🏗️</div><h1 className="text-2xl font-bold text-white">ChantierPro</h1></div>
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="text-slate-400 mb-6">{showSignUp ? 'Essai gratuit 14 jours' : 'Accédez à votre espace'}</p>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && <><input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Votre nom" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} /><input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Nom de l'entreprise" value={authForm.entreprise} onChange={e => setAuthForm(p => ({...p, entreprise: e.target.value}))} /></>}
            <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Email professionnel" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            {authError && <p className="text-red-400 text-sm text-center bg-red-900/30 p-2 rounded-lg">{authError}</p>}
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/30">{showSignUp ? 'Créer mon compte' : 'Se connecter'}</button>
          </form>
          <p className="text-center text-slate-400 mt-6">{showSignUp ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}<button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 font-semibold ml-2 hover:underline">{showSignUp ? 'Se connecter' : "S'inscrire gratuitement"}</button></p>
        </div>
      </div>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
    { id: 'chantiers', icon: '🏗️', label: 'Chantiers', badge: stats.chantiersEnCours },
    { id: 'planning', icon: '📅', label: 'Planning' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures', badge: stats.impayees.length },
    { id: 'equipe', icon: '👷', label: 'Équipe & Pointage' },
    { id: 'stocks', icon: '📦', label: 'Stocks', badge: stats.stocksBas },
    { id: 'rapports', icon: '📈', label: 'Rapports' },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-xl">🏗️</div>
          <div className="flex-1 min-w-0"><h1 className="text-white font-bold">ChantierPro</h1><p className="text-slate-500 text-xs truncate">{String(user?.user_metadata?.entreprise || user?.email || '')}</p></div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">✕</button>
        </div>
        
        {/* Météo widget */}
        {meteo && <div className="mx-3 mt-3 p-3 bg-slate-800 rounded-xl flex items-center gap-3"><span className="text-2xl">{meteo.icon}</span><div><p className="text-white font-medium">{meteo.temp}°C</p><p className="text-slate-400 text-xs">{meteo.condition}</p></div>{meteo.alerte && <span className="ml-auto text-red-500 text-xs">⚠️</span>}</div>}
        
        <nav className="p-3 space-y-1 mt-2 overflow-y-auto" style={{maxHeight: 'calc(100vh - 200px)'}}>
          {nav.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${page === n.id ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <span className="text-lg">{n.icon}</span><span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${page === n.id ? 'bg-white/20' : 'bg-red-500 text-white'}`}>{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">🚪 Déconnexion</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="lg:pl-64">
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-xl">☰</button>
            
            {/* Search global */}
            <div className="flex-1 max-w-xl relative">
              <input type="text" placeholder="Rechercher client, chantier, stock..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border overflow-hidden z-50">
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => { setPage(r.type === 'client' ? 'clients' : r.type === 'chantier' ? 'chantiers' : r.type === 'equipe' ? 'equipe' : 'stocks'); setSearch(''); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0">
                      <span>{r.icon}</span><span className="font-medium">{r.nom}</span><span className="text-xs text-slate-400 ml-auto">{r.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2.5 hover:bg-slate-100 rounded-xl">
                <span className="text-xl">🔔</span>
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{Math.min(notifications.length, 9)}{notifications.length > 9 ? '+' : ''}</span>}
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border overflow-hidden z-50">
                  <div className="px-4 py-3 border-b font-semibold flex justify-between items-center"><span>Notifications</span>{notifications.length > 0 && <span className="text-xs text-slate-500">{notifications.length} alertes</span>}</div>
                  <div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <p className="p-4 text-center text-slate-500">✅ Tout est en ordre</p> : notifications.slice(0, 8).map(n => (
                    <button key={n.id} onClick={() => { setPage(n.page); setShowNotifs(false); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0 ${n.type === 'danger' ? 'bg-red-50' : n.type === 'warning' ? 'bg-amber-50' : ''}`}>
                      <span className="text-xl">{n.icon}</span><span className="text-sm flex-1">{n.msg}</span><span className="text-slate-400">→</span>
                    </button>
                  ))}</div>
                </div>
              )}
            </div>

            <button onClick={() => setPage('devis')} className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"><span>+</span><span>Nouveau</span></button>
            <div onClick={() => setPage('settings')} className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold cursor-pointer">{(user?.user_metadata?.nom?.[0] || user?.email?.[0] || 'U').toUpperCase()}</div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="p-4 lg:p-6">
          {page === 'dashboard' && <Dashboard stats={stats} clients={clients} devis={devis} chantiers={chantiers} events={events} equipe={equipe} stocks={stocks} pointages={pointages} meteo={meteo} setPage={setPage} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} setChantiers={c => { setChantiers(c); save('chantiers', c); }} clients={clients} equipe={equipe} stocks={stocks} setPage={setPage} />}
          {page === 'planning' && <Planning events={events} setEvents={e => { setEvents(e); save('events', e); }} clients={clients} chantiers={chantiers} equipe={equipe} meteo={meteo} />}
          {page === 'clients' && <Clients clients={clients} devis={devis} chantiers={chantiers} onSubmit={async d => { await clientsDB.create(d); const r = await clientsDB.getAll(); if (r.data) setClients(r.data); }} setPage={setPage} />}
          {page === 'devis' && <Devis clients={clients} devis={devis} chantiers={chantiers} onSubmit={async d => { await devisDB.create(d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} onUpdate={async (id, d) => { await devisDB.update(id, d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={e => { setEquipe(e); save('equipe', e); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} chantiers={chantiers} />}
          {page === 'stocks' && <Stocks stocks={stocks} setStocks={s => { setStocks(s); save('stocks', s); }} chantiers={chantiers} />}
          {page === 'rapports' && <Rapports stats={stats} devis={devis} chantiers={chantiers} equipe={equipe} pointages={pointages} stocks={stocks} />}
          {page === 'settings' && <Settings user={user} />}
        </main>
      </div>
    </div>
  );
}

// =============================================
// DASHBOARD - Hub central KPI temps réel
// =============================================
function Dashboard({ stats, clients, devis, chantiers, events, equipe, stocks, pointages, meteo, setPage }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const enCours = chantiers.filter(c => c.statut === 'en_cours');
  const lowStocks = stocks.filter(s => s.quantite <= (s.seuil || 5));
  const recentDevis = [...devis].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  
  // Chantiers avec deadline proche
  const urgents = chantiers.filter(c => c.statut === 'en_cours' && c.date_fin_prevue && new Date(c.date_fin_prevue) < new Date(Date.now() + 7*24*60*60*1000));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          {meteo && <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border"><span className="text-xl">{meteo.icon}</span><span className="font-medium">{meteo.temp}°C</span></div>}
          <button onClick={() => setPage('devis')} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium">+ Nouveau devis</button>
        </div>
      </div>

      {/* Alertes urgentes */}
      {(stats.impayees.length > 0 || lowStocks.length > 0 || urgents.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.impayees.length > 0 && <div onClick={() => setPage('devis')} className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl cursor-pointer hover:bg-red-100"><span className="text-2xl">💰</span><div><p className="font-semibold text-red-800">{stats.impayees.length} impayée(s)</p><p className="text-sm text-red-600">{stats.montantImpaye.toLocaleString('fr-FR')} € à encaisser</p></div></div>}
          {lowStocks.length > 0 && <div onClick={() => setPage('stocks')} className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100"><span className="text-2xl">📦</span><div><p className="font-semibold text-amber-800">{lowStocks.length} stock(s) bas</p><p className="text-sm text-amber-600">Réappro. conseillé</p></div></div>}
          {urgents.length > 0 && <div onClick={() => setPage('chantiers')} className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-100"><span className="text-2xl">⏰</span><div><p className="font-semibold text-blue-800">{urgents.length} échéance(s)</p><p className="text-sm text-blue-600">Cette semaine</p></div></div>}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">💰</span><span className="text-sm opacity-80">CA du mois</span></div>
          <p className="text-3xl font-bold">{stats.caMois.toLocaleString('fr-FR')} €</p>
          <p className="text-sm opacity-70 mt-1">Année: {stats.caAnnee.toLocaleString('fr-FR')} €</p>
        </div>
        <div onClick={() => setPage('devis')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">📄</span><span className="text-sm text-slate-500">Devis en attente</span></div>
          <p className="text-3xl font-bold">{stats.devisAttente.length}</p>
          <p className="text-sm text-slate-500">{stats.montantAttente.toLocaleString('fr-FR')} € potentiel</p>
        </div>
        <div onClick={() => setPage('chantiers')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">🏗️</span><span className="text-sm text-slate-500">Chantiers</span></div>
          <p className="text-3xl font-bold">{stats.chantiersEnCours}</p>
          <p className="text-sm text-slate-500">en cours / {stats.chantiersTotal} total</p>
        </div>
        <div onClick={() => setPage('equipe')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">⏱️</span><span className="text-sm text-slate-500">Heures ce mois</span></div>
          <p className="text-3xl font-bold">{stats.heuresMois}h</p>
          <p className="text-sm text-slate-500">{equipe.length} employés</p>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chantiers en cours */}
        <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b"><h3 className="font-semibold">🏗️ Chantiers en cours</h3><button onClick={() => setPage('chantiers')} className="text-orange-500 text-sm font-medium">Voir tout →</button></div>
          {enCours.length === 0 ? <div className="p-8 text-center text-slate-500"><p className="text-4xl mb-2">🏗️</p><p>Aucun chantier en cours</p><button onClick={() => setPage('chantiers')} className="mt-3 text-orange-500 font-medium">+ Créer un chantier</button></div> : (
            <div className="divide-y">{enCours.slice(0, 4).map(c => {
              const cl = clients.find(x => x.id === c.client_id);
              const progress = c.progression || 0;
              const isUrgent = c.date_fin_prevue && new Date(c.date_fin_prevue) < new Date(Date.now() + 7*24*60*60*1000);
              return (
                <div key={c.id} className={`p-4 hover:bg-slate-50 cursor-pointer ${isUrgent ? 'border-l-4 border-red-500' : ''}`} onClick={() => setPage('chantiers')}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><h4 className="font-medium truncate">{c.nom}</h4>{isUrgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Urgent</span>}</div>
                      <p className="text-sm text-slate-500">👤 {cl?.nom || '-'} • 📍 {c.adresse || '-'}</p>
                    </div>
                    <div className="w-28">
                      <div className="flex justify-between text-xs mb-1"><span>{progress}%</span></div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{width: `${progress}%`}} /></div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p>
                      <p className="text-xs text-slate-500">{c.date_fin_prevue ? new Date(c.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}</p>
                    </div>
                  </div>
                </div>
              );
            })}</div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Planning jour */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b"><h3 className="font-semibold">📅 Aujourd'hui</h3><button onClick={() => setPage('planning')} className="text-orange-500 text-sm">Planning →</button></div>
            <div className="p-4">{todayEvents.length === 0 ? <p className="text-slate-500 text-center py-4">Aucun événement</p> : <div className="space-y-2">{todayEvents.slice(0, 4).map(e => <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"><div className={`w-2 h-2 rounded-full ${e.type === 'chantier' ? 'bg-green-500' : e.type === 'rdv' ? 'bg-blue-500' : 'bg-amber-500'}`} /><span className="text-sm text-slate-500 w-12">{e.time}</span><span className="text-sm truncate">{e.title}</span></div>)}</div>}</div>
          </div>

          {/* Actions rapides - moins de 3 clics */}
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold mb-4">⚡ Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📝', label: 'Devis', p: 'devis' },
                { icon: '👤', label: 'Client', p: 'clients' },
                { icon: '🏗️', label: 'Chantier', p: 'chantiers' },
                { icon: '⏱️', label: 'Pointage', p: 'equipe' },
                { icon: '📅', label: 'RDV', p: 'planning' },
                { icon: '📦', label: 'Stock', p: 'stocks' },
              ].map((a, i) => <button key={i} onClick={() => setPage(a.p)} className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-slate-50 transition-colors"><span className="text-2xl">{a.icon}</span><span className="text-xs font-medium text-slate-600">{a.label}</span></button>)}
            </div>
          </div>

          {/* Mini stats */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-4">📈 Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-400">Taux conversion</span><span className="font-bold">{stats.tauxConversion}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Valeur stock</span><span className="font-bold">{stats.valeurStock.toLocaleString('fr-FR')} €</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Clients actifs</span><span className="font-bold">{clients.length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// =============================================
// CHANTIERS - Gestion complète avec timeline
// =============================================
function Chantiers({ chantiers, setChantiers, clients, equipe, stocks, setPage }) {
  const [view, setView] = useState('list');
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', description: '', date_debut: '', date_fin_prevue: '', budget_prevu: '', statut: 'prospect', priorite: 'normale', progression: 0, notes: '', equipe_ids: [], materiaux: [] });
  
  const STATUTS = { prospect: { label: '🎯 Prospect', color: 'bg-slate-100 text-slate-700' }, devis: { label: '📄 Devis envoyé', color: 'bg-blue-100 text-blue-700' }, en_cours: { label: '🔨 En cours', color: 'bg-green-100 text-green-700' }, pause: { label: '⏸️ En pause', color: 'bg-amber-100 text-amber-700' }, termine: { label: '✅ Terminé', color: 'bg-emerald-100 text-emerald-700' }, annule: { label: '❌ Annulé', color: 'bg-red-100 text-red-700' } };
  const PRIORITES = { basse: { label: 'Basse', color: 'bg-slate-100' }, normale: { label: 'Normale', color: 'bg-blue-100' }, haute: { label: 'Haute', color: 'bg-orange-100' }, urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' } };

  useEffect(() => {
    if (edit) setForm({ ...edit, equipe_ids: edit.equipe_ids || [], materiaux: edit.materiaux || [] });
    else setForm({ nom: '', client_id: '', adresse: '', description: '', date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', budget_prevu: '', statut: 'prospect', priorite: 'normale', progression: 0, notes: '', equipe_ids: [], materiaux: [] });
  }, [edit, show]);

  const filtered = chantiers.filter(c => filter === 'all' || c.statut === filter);

  const submit = () => {
    if (!form.nom) return alert('Nom requis');
    const data = { ...form, budget_prevu: parseFloat(form.budget_prevu) || 0, progression: parseInt(form.progression) || 0 };
    if (edit) setChantiers(chantiers.map(c => c.id === edit.id ? { ...c, ...data } : c));
    else setChantiers([...chantiers, { id: Date.now().toString(), ...data, created_at: new Date().toISOString() }]);
    setShow(false); setEdit(null);
  };

  const updateStatut = (id, statut) => setChantiers(chantiers.map(c => c.id === id ? { ...c, statut } : c));
  const updateProgression = (id, progression) => setChantiers(chantiers.map(c => c.id === id ? { ...c, progression: Math.min(100, Math.max(0, progression)) } : c));
  const deleteChantier = id => { if (confirm('Supprimer ce chantier ?')) setChantiers(chantiers.filter(c => c.id !== id)); };

  // Vue détail chantier
  if (detail) {
    const c = chantiers.find(x => x.id === detail);
    if (!c) { setDetail(null); return null; }
    const cl = clients.find(x => x.id === c.client_id);
    const assigned = equipe.filter(e => c.equipe_ids?.includes(e.id));
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><button onClick={() => setDetail(null)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold flex-1">{c.nom}</h1><span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUTS[c.statut]?.color}`}>{STATUTS[c.statut]?.label}</span></div>
        
        {/* Tabs */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 border-b">
            {['Détails', 'Équipe', 'Matériaux', 'Timeline'].map((tab, i) => <button key={i} className="px-4 py-3 font-medium text-sm hover:bg-slate-50 border-b-2 border-transparent hover:border-orange-500">{tab}</button>)}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">📋 Informations</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Client:</span> <span className="font-medium">{cl?.nom || '-'}</span></p>
                  <p><span className="text-slate-500">Adresse:</span> <span className="font-medium">{c.adresse || '-'}</span></p>
                  <p><span className="text-slate-500">Début:</span> <span className="font-medium">{c.date_debut ? new Date(c.date_debut).toLocaleDateString('fr-FR') : '-'}</span></p>
                  <p><span className="text-slate-500">Fin prévue:</span> <span className="font-medium">{c.date_fin_prevue ? new Date(c.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}</span></p>
                  <p><span className="text-slate-500">Budget:</span> <span className="font-bold text-orange-500">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</span></p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">📊 Progression</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2"><span>Avancement</span><span className="font-bold">{c.progression}%</span></div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${c.progression >= 80 ? 'bg-green-500' : c.progression >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{width: `${c.progression}%`}} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateProgression(c.id, c.progression - 10)} className="px-3 py-1 bg-slate-100 rounded-lg text-sm">-10%</button>
                  <button onClick={() => updateProgression(c.id, c.progression + 10)} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm">+10%</button>
                  <button onClick={() => updateProgression(c.id, 100)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm">Terminer</button>
                </div>
              </div>
            </div>
            {assigned.length > 0 && <div className="mt-6 pt-6 border-t"><h3 className="font-semibold mb-3">👷 Équipe assignée</h3><div className="flex flex-wrap gap-2">{assigned.map(e => <span key={e.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{e.nom} {e.prenom}</span>)}</div></div>}
            {c.notes && <div className="mt-6 pt-6 border-t"><h3 className="font-semibold mb-2">📝 Notes</h3><p className="text-slate-600">{c.notes}</p></div>}
          </div>
        </div>
        <div className="flex gap-3"><button onClick={() => { setEdit(c); setDetail(null); setShow(true); }} className="px-4 py-2 bg-slate-100 rounded-xl font-medium">✏️ Modifier</button><button onClick={() => { deleteChantier(c.id); setDetail(null); }} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium">🗑️ Supprimer</button></div>
      </div>
    );
  }

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => { setShow(false); setEdit(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">{edit ? 'Modifier' : 'Nouveau'} chantier</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom du chantier *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: Rénovation cuisine Dupont" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Adresse du chantier</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} placeholder="123 rue de la Paix, 75001 Paris" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Date fin prévue</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_fin_prevue} onChange={e => setForm(p => ({...p, date_fin_prevue: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Budget (€ HT)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.budget_prevu} onChange={e => setForm(p => ({...p, budget_prevu: e.target.value}))} placeholder="15000" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Progression (%)</label><input type="range" min="0" max="100" className="w-full" value={form.progression} onChange={e => setForm(p => ({...p, progression: e.target.value}))} /><span className="text-sm text-slate-500">{form.progression}%</span></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Statut</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Priorité</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.priorite} onChange={e => setForm(p => ({...p, priorite: e.target.value}))}>{Object.entries(PRIORITES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Équipe assignée</label><div className="flex flex-wrap gap-2">{equipe.map(e => <button key={e.id} type="button" onClick={() => setForm(p => ({ ...p, equipe_ids: p.equipe_ids.includes(e.id) ? p.equipe_ids.filter(x => x !== e.id) : [...p.equipe_ids, e.id] }))} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.equipe_ids.includes(e.id) ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>{e.nom}</button>)}</div></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Notes / Description</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={3} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Détails du chantier, contraintes, accès..." /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => { setShow(false); setEdit(null); }} className="px-4 py-2.5 bg-slate-100 rounded-xl font-medium">Annuler</button><button onClick={submit} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium">{edit ? 'Enregistrer' : 'Créer le chantier'}</button></div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Chantiers</h1><p className="text-slate-500">{chantiers.length} chantiers • {chantiers.filter(c => c.statut === 'en_cours').length} en cours</p></div>
        <button onClick={() => setShow(true)} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-medium">+ Nouveau chantier</button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 bg-white border rounded-xl"><option value="all">Tous les statuts</option>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <div className="flex bg-slate-100 rounded-xl p-1">{[['list', '☰ Liste'], ['kanban', '▦ Kanban']].map(([v, label]) => <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === v ? 'bg-white shadow' : ''}`}>{label}</button>)}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">🏗️</p><h3 className="font-semibold text-lg">Aucun chantier</h3><p className="text-slate-500 mb-4">Créez votre premier chantier pour commencer</p><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Créer un chantier</button></div>
      ) : view === 'list' ? (
        <div className="space-y-3">{filtered.map(c => {
          const cl = clients.find(x => x.id === c.client_id);
          const isUrgent = c.priorite === 'urgente' || (c.date_fin_prevue && new Date(c.date_fin_prevue) < new Date(Date.now() + 7*24*60*60*1000));
          return (
            <div key={c.id} onClick={() => setDetail(c.id)} className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-all ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{c.nom}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUTS[c.statut]?.color}`}>{STATUTS[c.statut]?.label}</span>
                    {c.priorite === 'urgente' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">⚡ Urgent</span>}
                  </div>
                  <p className="text-sm text-slate-500">👤 {cl?.nom || 'Sans client'} • 📍 {c.adresse || 'Adresse non renseignée'}</p>
                </div>
                <div className="w-full lg:w-36">
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Progression</span><span className="font-medium">{c.progression}%</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.progression >= 80 ? 'bg-green-500' : c.progression >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{width: `${c.progression}%`}} /></div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p>
                  <p className="text-xs text-slate-500">📅 {c.date_fin_prevue ? new Date(c.date_fin_prevue).toLocaleDateString('fr-FR') : 'Non planifié'}</p>
                </div>
              </div>
            </div>
          );
        })}</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">{Object.entries(STATUTS).filter(([k]) => k !== 'annule').map(([statut, config]) => {
          const items = filtered.filter(c => c.statut === statut);
          return (
            <div key={statut} className="flex-shrink-0 w-72" onDragOver={e => e.preventDefault()} onDrop={e => { const id = e.dataTransfer.getData('id'); if (id) updateStatut(id, statut); }}>
              <div className="flex items-center justify-between mb-3"><span className={`font-medium text-sm px-2 py-1 rounded-lg ${config.color}`}>{config.label}</span><span className="bg-slate-200 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span></div>
              <div className="bg-slate-100 rounded-xl p-3 min-h-[400px] space-y-3">
                {items.map(c => {
                  const cl = clients.find(x => x.id === c.client_id);
                  return (
                    <div key={c.id} draggable onDragStart={e => e.dataTransfer.setData('id', c.id)} onClick={() => setDetail(c.id)} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all">
                      <h4 className="font-medium truncate mb-1">{c.nom}</h4>
                      <p className="text-xs text-slate-500 mb-3">👤 {cl?.nom || '-'}</p>
                      <div className="h-1.5 bg-slate-100 rounded-full mb-2"><div className="h-full bg-orange-500 rounded-full" style={{width: `${c.progression}%`}} /></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-500">{c.progression}%</span><span className="font-semibold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</span></div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Glissez un chantier ici</p>}
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}

e.target.value)} className="w-full max-w-md px-4 py-2.5 border rounded-xl" />
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👥</p><h3 className="font-semibold text-lg">Aucun client</h3><p className="text-slate-500 mb-4">Ajoutez votre premier client</p><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Ajouter</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => {
          const stats = getStats(c.id);
          return (
            <div key={c.id} onClick={() => setDetail(c.id)} className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">{c.nom?.[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{c.nom} {c.prenom}</h3>{c.entreprise && <p className="text-sm text-slate-500 truncate">{c.entreprise}</p>}</div>
              </div>
              <div className="space-y-1 text-sm text-slate-500 mb-4"><p>📧 {c.email}</p>{c.telephone && <p>📱 {c.telephone}</p>}</div>
              <div className="flex justify-around pt-4 border-t text-center">
                <div><p className="font-bold">{stats.devisCount + stats.facturesCount}</p><p className="text-xs text-slate-500">Docs</p></div>
                <div><p className="font-bold">{stats.chantiersCount}</p><p className="text-xs text-slate-500">Chantiers</p></div>
                <div><p className="font-bold text-orange-500">{stats.ca.toLocaleString('fr-FR')} €</p><p className="text-xs text-slate-500">CA</p></div>
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}

// =============================================
// DEVIS & FACTURES - Création rapide
// =============================================
function Devis({ clients, devis, chantiers, onSubmit, onUpdate }) {
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], validite: 30, notes: '', conditions: '' });
  const [ligne, setLigne] = useState({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité', tva: 20 });

  const filtered = devis.filter(d => filter === 'all' || (filter === 'devis' && d.type === 'devis') || (filter === 'factures' && d.type === 'facture') || (filter === 'impayees' && d.type === 'facture' && d.statut !== 'payee') || (filter === 'brouillon' && d.statut === 'brouillon'));
  
  const addLigne = () => {
    if (!ligne.description) return;
    setForm(p => ({ ...p, lignes: [...p.lignes, { ...ligne, montant: ligne.quantite * ligne.prixUnitaire }] }));
    setLigne({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité', tva: 20 });
  };
  
  const removeLigne = i => setForm(p => ({ ...p, lignes: p.lignes.filter((_, j) => j !== i) }));
  
  const totaux = {
    ht: form.lignes.reduce((s, l) => s + (l.montant || 0), 0),
    get tva() { return this.ht * 0.2; },
    get ttc() { return this.ht * 1.2; }
  };

  const submit = () => {
    if (!form.clientId || form.lignes.length === 0) return alert('Sélectionnez un client et ajoutez au moins une ligne');
    const numero = `${form.type === 'devis' ? 'DEV' : 'FACT'}-${new Date().getFullYear()}-${String(devis.length + 1).padStart(4, '0')}`;
    onSubmit({ 
      client_id: form.clientId, 
      chantier_id: form.chantierId,
      numero, 
      date: form.date, 
      type: form.type, 
      statut: 'brouillon', 
      lignes: form.lignes, 
      total_ht: totaux.ht, 
      tva: totaux.tva, 
      total_ttc: totaux.ttc,
      validite: form.validite,
      notes: form.notes,
      conditions: form.conditions
    });
    setShow(false);
    setForm({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], validite: 30, notes: '', conditions: '' });
  };

  const STATUTS = { brouillon: 'bg-slate-200 text-slate-700', envoye: 'bg-blue-100 text-blue-700', accepte: 'bg-green-100 text-green-700', refuse: 'bg-red-100 text-red-700', payee: 'bg-emerald-100 text-emerald-700' };
  const UNITES = ['unité', 'heure', 'jour', 'm²', 'ml', 'm³', 'kg', 'forfait'];

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau {form.type}</h1></div>
      <div className="bg-white rounded-2xl border p-6 space-y-6">
        {/* En-tête */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium mb-1">Client *</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Chantier</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
        </div>

        {/* Lignes */}
        <div>
          <h3 className="font-semibold mb-3">📝 Lignes de {form.type}</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            <input placeholder="Description de la prestation" className="flex-[3] min-w-[200px] px-3 py-2 border rounded-lg" value={ligne.description} onChange={e => setLigne(p => ({...p, description: e.target.value}))} />
            <input type="number" placeholder="Qté" className="w-20 px-3 py-2 border rounded-lg" value={ligne.quantite} onChange={e => setLigne(p => ({...p, quantite: parseFloat(e.target.value) || 1}))} />
            <select className="w-24 px-2 py-2 border rounded-lg" value={ligne.unite} onChange={e => setLigne(p => ({...p, unite: e.target.value}))}>{UNITES.map(u => <option key={u}>{u}</option>)}</select>
            <input type="number" placeholder="Prix HT" className="w-28 px-3 py-2 border rounded-lg" value={ligne.prixUnitaire || ''} onChange={e => setLigne(p => ({...p, prixUnitaire: parseFloat(e.target.value) || 0}))} />
            <button onClick={addLigne} className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold">+</button>
          </div>
          
          {form.lignes.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="hidden md:flex bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
                <span className="flex-[3]">Description</span><span className="w-20 text-center">Qté</span><span className="w-24 text-center">Unité</span><span className="w-28 text-right">Prix unit.</span><span className="w-28 text-right">Total HT</span><span className="w-10"></span>
              </div>
              {form.lignes.map((l, i) => (
                <div key={i} className="flex flex-wrap md:flex-nowrap items-center px-4 py-3 border-t gap-2">
                  <span className="flex-[3] min-w-[150px]">{l.description}</span>
                  <span className="w-20 text-center">{l.quantite}</span>
                  <span className="w-24 text-center text-slate-500">{l.unite}</span>
                  <span className="w-28 text-right">{l.prixUnitaire.toFixed(2)} €</span>
                  <span className="w-28 text-right font-medium">{l.montant.toFixed(2)} €</span>
                  <button onClick={() => removeLigne(i)} className="w-10 text-red-500 text-center hover:bg-red-50 rounded">✕</button>
                </div>
              ))}
              <div className="bg-slate-50 p-4 space-y-2">
                <div className="flex justify-end gap-8"><span className="text-slate-500">Total HT</span><span className="w-28 text-right font-medium">{totaux.ht.toFixed(2)} €</span></div>
                <div className="flex justify-end gap-8"><span className="text-slate-500">TVA (20%)</span><span className="w-28 text-right">{totaux.tva.toFixed(2)} €</span></div>
                <div className="flex justify-end gap-8 text-lg font-bold text-orange-500 pt-2 border-t"><span>Total TTC</span><span className="w-28 text-right">{totaux.ttc.toFixed(2)} €</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div><label className="block text-sm font-medium mb-1">Notes / Conditions</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Conditions de paiement, délais, etc." /></div>

        <div className="flex justify-end gap-3 pt-4 border-t"><button onClick={() => setShow(false)} className="px-4 py-2.5 bg-slate-100 rounded-xl font-medium">Annuler</button><button onClick={submit} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium">Créer le {form.type}</button></div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Devis & Factures</h1><p className="text-slate-500">{devis.length} documents</p></div>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium">+ Nouveau</button>
      </div>

      <div className="flex gap-2 flex-wrap">{[['all', 'Tous', devis.length], ['devis', 'Devis', devis.filter(d => d.type === 'devis').length], ['factures', 'Factures', devis.filter(d => d.type === 'facture').length], ['impayees', '⚠️ Impayées', devis.filter(d => d.type === 'facture' && d.statut !== 'payee').length]].map(([k, v, count]) => <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === k ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{v} ({count})</button>)}</div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📄</p><h3 className="font-semibold text-lg">Aucun document</h3><button onClick={() => setShow(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">+ Créer</button></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="hidden md:flex px-5 py-3 bg-slate-50 text-sm font-medium text-slate-500"><span className="w-32">Numéro</span><span className="flex-1">Client</span><span className="w-28">Date</span><span className="w-28 text-right">Montant</span><span className="w-32 text-center">Statut</span></div>
          {filtered.map(d => {
            const cl = clients.find(c => c.id === d.client_id);
            return (
              <div key={d.id} className="flex flex-col md:flex-row md:items-center px-5 py-4 border-t gap-2 hover:bg-slate-50">
                <span className="w-32"><span className={`text-xs px-2 py-1 rounded ${d.type === 'devis' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{d.type}</span> <span className="font-semibold">{d.numero}</span></span>
                <span className="flex-1 text-slate-600">{cl?.nom || '-'} {cl?.prenom || ''}</span>
                <span className="w-28 text-sm text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</span>
                <span className="w-28 text-right font-bold">{(d.total_ttc || 0).toFixed(2)} €</span>
                <span className="w-32 flex justify-center">
                  <select value={d.statut} onChange={e => onUpdate(d.id, { statut: e.target.value })} className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer ${STATUTS[d.statut] || STATUTS.brouillon}`}>
                    {Object.keys(STATUTS).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================
// EQUIPE & POINTAGE - Gestion RH complète
// =============================================
function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers }) {
  const [tab, setTab] = useState('liste');
  const [show, setShow] = useState(false);
  const [showPointage, setShowPointage] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', role: 'ouvrier', telephone: '', email: '', competences: '', tauxHoraire: '', dateEmbauche: '' });
  const [pointageForm, setPointageForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heureDebut: '08:00', heureFin: '17:00', pause: 60, notes: '' });

  const ROLES = { ouvrier: 'Ouvrier', chef: 'Chef d\'équipe', apprenti: 'Apprenti', soustraitant: 'Sous-traitant', admin: 'Administratif' };

  const calculateHeures = (debut, fin, pause) => {
    const [hd, md] = debut.split(':').map(Number);
    const [hf, mf] = fin.split(':').map(Number);
    const minutes = (hf * 60 + mf) - (hd * 60 + md) - (pause || 0);
    return Math.max(0, minutes / 60);
  };

  const submitEquipe = () => {
    if (!form.nom) return alert('Nom requis');
    setEquipe([...equipe, { id: Date.now().toString(), ...form, tauxHoraire: parseFloat(form.tauxHoraire) || 0 }]);
    setShow(false);
    setForm({ nom: '', prenom: '', role: 'ouvrier', telephone: '', email: '', competences: '', tauxHoraire: '', dateEmbauche: '' });
  };

  const submitPointage = () => {
    if (!pointageForm.employeId) return alert('Sélectionnez un employé');
    const heures = calculateHeures(pointageForm.heureDebut, pointageForm.heureFin, pointageForm.pause);
    setPointages([...pointages, { id: Date.now().toString(), ...pointageForm, heures }]);
    setShowPointage(false);
    setPointageForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heureDebut: '08:00', heureFin: '17:00', pause: 60, notes: '' });
  };

  const getHeuresMois = (employeId) => {
    const now = new Date();
    return pointages.filter(p => p.employeId === employeId && new Date(p.date).getMonth() === now.getMonth()).reduce((s, p) => s + (p.heures || 0), 0);
  };

  // Formulaire membre
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau membre</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Rôle</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Taux horaire (€)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full px-4 py-2.5 border rounded-xl" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date d'embauche</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.dateEmbauche} onChange={e => setForm(p => ({...p, dateEmbauche: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Compétences</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.competences} onChange={e => setForm(p => ({...p, competences: e.target.value}))} placeholder="Plomberie, Électricité..." /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-medium">Annuler</button><button onClick={submitEquipe} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-medium">Ajouter</button></div>
      </div>
    </div>
  );

  // Formulaire pointage
  if (showPointage) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShowPointage(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Saisir un pointage</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Employé *</label><select className="w-full px-4 py-2.5 border rounded-xl" value={pointageForm.employeId} onChange={e => setPointageForm(p => ({...p, employeId: e.target.value}))}><option value="">Sélectionner...</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Chantier</label><select className="w-full px-4 py-2.5 border rounded-xl" value={pointageForm.chantierId} onChange={e => setPointageForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={pointageForm.date} onChange={e => setPointageForm(p => ({...p, date: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Pause (min)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={pointageForm.pause} onChange={e => setPointageForm(p => ({...p, pause: parseInt(e.target.value) || 0}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Heure début</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={pointageForm.heureDebut} onChange={e => setPointageForm(p => ({...p, heureDebut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Heure fin</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={pointageForm.heureFin} onChange={e => setPointageForm(p => ({...p, heureFin: e.target.value}))} /></div>
        </div>
        <div className="mt-4 p-4 bg-orange-50 rounded-xl"><p className="text-sm text-orange-800">⏱️ Heures calculées: <span className="font-bold">{calculateHeures(pointageForm.heureDebut, pointageForm.heureFin, pointageForm.pause).toFixed(1)}h</span></p></div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShowPointage(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-medium">Annuler</button><button onClick={submitPointage} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-medium">Enregistrer</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Équipe & Pointage</h1><p className="text-slate-500">{equipe.length} membres • {pointages.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0).toFixed(0)}h ce mois</p></div>
        <div className="flex gap-2"><button onClick={() => setShowPointage(true)} className="px-4 py-2 bg-slate-100 rounded-xl font-medium">⏱️ Pointage</button><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium">+ Membre</button></div>
      </div>

      <div className="flex gap-2 border-b pb-2">{[['liste', '👥 Équipe'], ['pointages', '⏱️ Pointages']].map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>)}</div>

      {tab === 'liste' ? (
        equipe.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👷</p><h3 className="font-semibold text-lg">Aucun membre</h3><button onClick={() => setShow(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">+ Ajouter</button></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{equipe.map(m => {
            const heuresMois = getHeuresMois(m.id);
            return (
              <div key={m.id} className="bg-white rounded-2xl border p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">{m.nom?.[0]}{m.prenom?.[0]}</div>
                  <div><h3 className="font-semibold">{m.nom} {m.prenom}</h3><p className="text-sm text-slate-500">{ROLES[m.role] || m.role}</p></div>
                </div>
                <div className="space-y-1 text-sm text-slate-500">
                  {m.telephone && <p>📱 {m.telephone}</p>}
                  {m.email && <p>📧 {m.email}</p>}
                  {m.tauxHoraire > 0 && <p>💰 {m.tauxHoraire} €/h</p>}
                  {m.competences && <p>🔧 {m.competences}</p>}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-sm text-slate-500">Ce mois</span>
                  <span className="font-bold text-orange-500">{heuresMois.toFixed(1)}h</span>
                </div>
              </div>
            );
          })}</div>
        )
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="hidden md:flex px-5 py-3 bg-slate-50 text-sm font-medium text-slate-500"><span className="w-32">Date</span><span className="flex-1">Employé</span><span className="flex-1">Chantier</span><span className="w-24">Horaires</span><span className="w-20 text-right">Heures</span></div>
          {pointages.length === 0 ? <p className="p-8 text-center text-slate-500">Aucun pointage</p> : [...pointages].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(p => {
            const emp = equipe.find(e => e.id === p.employeId);
            const ch = chantiers.find(c => c.id === p.chantierId);
            return (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center px-5 py-3 border-t gap-2">
                <span className="w-32 font-medium">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                <span className="flex-1">{emp?.nom} {emp?.prenom}</span>
                <span className="flex-1 text-slate-500">{ch?.nom || '-'}</span>
                <span className="w-24 text-sm">{p.heureDebut} - {p.heureFin}</span>
                <span className="w-20 text-right font-bold text-orange-500">{(p.heures || 0).toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================
// STOCKS - Gestion inventaire
// =============================================
function Stocks({ stocks, setStocks, chantiers }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', reference: '', categorie: 'Autre', unite: 'unité', quantite: 0, seuil: 5, prix: 0, emplacement: '', fournisseur: '' });

  const CATS = ['Plomberie', 'Électricité', 'Maçonnerie', 'Peinture', 'Menuiserie', 'Outillage', 'Consommables', 'EPI', 'Autre'];
  const lowStocks = stocks.filter(s => s.quantite <= (s.seuil || 5));
  const filtered = stocks.filter(s => !search || s.nom?.toLowerCase().includes(search.toLowerCase()) || s.reference?.toLowerCase().includes(search.toLowerCase()));
  const totalValue = stocks.reduce((s, st) => s + (st.quantite || 0) * (st.prix || 0), 0);

  const submit = () => {
    if (!form.nom) return alert('Nom requis');
    setStocks([...stocks, { id: Date.now().toString(), ...form, quantite: parseFloat(form.quantite) || 0, seuil: parseInt(form.seuil) || 5, prix: parseFloat(form.prix) || 0 }]);
    setShow(false);
    setForm({ nom: '', reference: '', categorie: 'Autre', unite: 'unité', quantite: 0, seuil: 5, prix: 0, emplacement: '', fournisseur: '' });
  };

  const updateQty = (id, delta) => setStocks(stocks.map(s => s.id === id ? { ...s, quantite: Math.max(0, (s.quantite || 0) + delta) } : s));

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau matériau</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Référence</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Catégorie</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Unité</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}><option>unité</option><option>m</option><option>m²</option><option>kg</option><option>litre</option><option>rouleau</option><option>boîte</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Quantité</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.quantite} onChange={e => setForm(p => ({...p, quantite: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Seuil alerte</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.seuil} onChange={e => setForm(p => ({...p, seuil: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prix unitaire (€)</label><input type="number" step="0.01" className="w-full px-4 py-2.5 border rounded-xl" value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Emplacement</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.emplacement} onChange={e => setForm(p => ({...p, emplacement: e.target.value}))} placeholder="Entrepôt A, Étagère 3" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Fournisseur</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.fournisseur} onChange={e => setForm(p => ({...p, fournisseur: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-medium">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-medium">Ajouter</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Stocks</h1><p className="text-slate-500">{stocks.length} articles • Valeur: {totalValue.toLocaleString('fr-FR')} €</p></div>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium">+ Nouveau</button>
      </div>

      {lowStocks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3"><span className="text-2xl">⚠️</span><h3 className="font-semibold text-amber-800">Stocks bas ({lowStocks.length})</h3></div>
          <div className="flex flex-wrap gap-2">{lowStocks.map(s => <span key={s.id} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">{s.nom}: {s.quantite} {s.unite}</span>)}</div>
        </div>
      )}

      <input type="text" placeholder="Rechercher par nom ou référence..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 border rounded-xl" />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📦</p><h3 className="font-semibold text-lg">Aucun matériau</h3><button onClick={() => setShow(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">+ Ajouter</button></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="hidden md:flex px-5 py-3 bg-slate-50 text-sm font-medium text-slate-500"><span className="flex-1">Article</span><span className="w-28">Catégorie</span><span className="w-36 text-center">Quantité</span><span className="w-24 text-right">Prix unit.</span><span className="w-28 text-right">Valeur</span></div>
          {filtered.map(s => (
            <div key={s.id} className={`flex flex-col md:flex-row md:items-center px-5 py-4 border-t gap-3 ${s.quantite <= (s.seuil || 5) ? 'bg-red-50' : ''}`}>
              <div className="flex-1">
                <p className="font-medium">{s.nom}</p>
                <div className="flex gap-2 text-xs text-slate-500">
                  {s.reference && <span>Réf: {s.reference}</span>}
                  {s.emplacement && <span>📍 {s.emplacement}</span>}
                  {s.fournisseur && <span>🏭 {s.fournisseur}</span>}
                </div>
              </div>
              <span className="w-28 text-sm">{s.categorie}</span>
              <div className="w-36 flex items-center justify-center gap-2">
                <button onClick={() => updateQty(s.id, -1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold">-</button>
                <span className={`font-semibold min-w-[50px] text-center ${s.quantite <= (s.seuil || 5) ? 'text-red-600' : ''}`}>{s.quantite} {s.unite}</span>
                <button onClick={() => updateQty(s.id, 1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold">+</button>
              </div>
              <span className="w-24 text-right text-slate-600">{(s.prix || 0).toFixed(2)} €</span>
              <span className="w-28 text-right font-semibold">{((s.quantite || 0) * (s.prix || 0)).toFixed(2)} €</span>
            </div>
          ))}
          <div className="px-5 py-4 bg-slate-50 border-t flex justify-between"><span className="font-semibold">Valeur totale</span><span className="font-bold text-orange-500">{totalValue.toFixed(2)} €</span></div>
        </div>
      )}
    </div>
  );
}

// =============================================
// RAPPORTS - Analytics
// =============================================
function Rapports({ stats, devis, chantiers, equipe, pointages, stocks }) {
  const [period, setPeriod] = useState('month');
  
  const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonth = new Date().getMonth();
  
  // CA par mois (simulé)
  const caParMois = moisLabels.map((_, i) => {
    return devis.filter(d => d.type === 'facture' && d.statut === 'payee' && new Date(d.date).getMonth() === i).reduce((s, d) => s + (d.total_ttc || 0), 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Rapports & Statistiques</h1><p className="text-slate-500">Analyse de votre activité</p></div>
        <div className="flex gap-2">{[['month', 'Ce mois'], ['year', 'Cette année'], ['all', 'Tout']].map(([k, v]) => <button key={k} onClick={() => setPeriod(k)} className={`px-4 py-2 rounded-xl text-sm font-medium ${period === k ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>{v}</button>)}</div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border p-5"><p className="text-sm text-slate-500 mb-1">💰 CA Total</p><p className="text-3xl font-bold text-orange-500">{stats.caAnnee.toLocaleString('fr-FR')} €</p></div>
        <div className="bg-white rounded-2xl border p-5"><p className="text-sm text-slate-500 mb-1">📄 Taux conversion</p><p className="text-3xl font-bold">{stats.tauxConversion}%</p></div>
        <div className="bg-white rounded-2xl border p-5"><p className="text-sm text-slate-500 mb-1">🏗️ Chantiers terminés</p><p className="text-3xl font-bold">{chantiers.filter(c => c.statut === 'termine').length}</p></div>
        <div className="bg-white rounded-2xl border p-5"><p className="text-sm text-slate-500 mb-1">⏱️ Heures totales</p><p className="text-3xl font-bold">{pointages.reduce((s, p) => s + (p.heures || 0), 0).toFixed(0)}h</p></div>
      </div>

      {/* Graphique CA */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4">📈 Évolution du CA</h3>
        <div className="flex items-end gap-2 h-48">
          {caParMois.map((ca, i) => {
            const maxCa = Math.max(...caParMois, 1);
            const height = (ca / maxCa) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full rounded-t transition-all ${i === currentMonth ? 'bg-orange-500' : 'bg-slate-200'}`} style={{ height: `${Math.max(height, 2)}%` }} />
                <span className="text-xs text-slate-500">{moisLabels[i]}</span>
                {ca > 0 && <span className="text-xs font-medium">{(ca / 1000).toFixed(0)}k</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">📊 Répartition chantiers</h3>
          <div className="space-y-3">
            {Object.entries({ prospect: 'Prospect', devis: 'Devis', en_cours: 'En cours', termine: 'Terminé', pause: 'En pause' }).map(([k, v]) => {
              const count = chantiers.filter(c => c.statut === k).length;
              const pct = chantiers.length > 0 ? (count / chantiers.length * 100) : 0;
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-1"><span>{v}</span><span className="font-medium">{count}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">👷 Heures par employé (ce mois)</h3>
          {equipe.length === 0 ? <p className="text-slate-500">Aucun employé</p> : (
            <div className="space-y-3">{equipe.map(e => {
              const heures = pointages.filter(p => p.employeId === e.id && new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0);
              return (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">{e.nom?.[0]}</div>
                  <span className="flex-1">{e.nom} {e.prenom}</span>
                  <span className="font-bold">{heures.toFixed(1)}h</span>
                </div>
              );
            })}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// SETTINGS
// =============================================
function Settings({ user }) {
  const [tab, setTab] = useState('compte');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <div className="flex gap-2 border-b pb-2 flex-wrap">{[['compte', '👤 Compte'], ['preferences', '⚙️ Préférences'], ['entreprise', '🏢 Entreprise'], ['export', '📤 Export']].map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium transition-all ${tab === k ? 'bg-white border border-b-white -mb-[3px] text-orange-500' : 'text-slate-500'}`}>{v}</button>)}</div>

      {tab === 'compte' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-6">Informations du compte</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Email</span><span className="font-medium">{String(user?.email || '-')}</span></div>
            <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Nom</span><span className="font-medium">{String(user?.user_metadata?.nom || '-')}</span></div>
            <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Entreprise</span><span className="font-medium">{String(user?.user_metadata?.entreprise || '-')}</span></div>
            <div className="flex justify-between py-3"><span className="text-slate-500">Membre depuis</span><span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-'}</span></div>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="bg-white rounded-2xl border p-6 space-y-6">
          <div className="flex items-center justify-between py-3 border-b"><div><p className="font-medium">Notifications email</p><p className="text-sm text-slate-500">Recevoir alertes par email</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" defaultChecked /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" /></label></div>
          <div><label className="block font-medium mb-2">Taux TVA par défaut</label><select className="px-4 py-2.5 border rounded-xl"><option>20%</option><option>10%</option><option>5.5%</option><option>0%</option></select></div>
          <div><label className="block font-medium mb-2">Devise</label><select className="px-4 py-2.5 border rounded-xl"><option>EUR (€)</option><option>CHF (Fr.)</option></select></div>
        </div>
      )}

      {tab === 'entreprise' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">💳 Abonnement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 rounded-2xl p-6 text-center hover:border-orange-300 transition-colors"><h4 className="font-bold text-lg">Solo</h4><p className="text-4xl font-bold text-orange-500 my-4">29€<span className="text-sm text-slate-500">/mois</span></p><ul className="text-sm text-slate-600 space-y-2 mb-6 text-left"><li>✅ Clients illimités</li><li>✅ Devis & Factures</li><li>✅ Planning</li><li>✅ 1 utilisateur</li></ul><button className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-medium">Choisir</button></div>
            <div className="border-2 border-green-500 rounded-2xl p-6 text-center relative"><div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">POPULAIRE</div><h4 className="font-bold text-lg">Pro</h4><p className="text-4xl font-bold text-green-500 my-4">59€<span className="text-sm text-slate-500">/mois</span></p><ul className="text-sm text-slate-600 space-y-2 mb-6 text-left"><li>✅ Tout du Solo</li><li>✅ Multi-utilisateurs</li><li>✅ Gestion équipe</li><li>✅ Rapports avancés</li></ul><button className="w-full py-2.5 bg-green-500 text-white rounded-xl font-medium">Choisir</button></div>
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">📤 Export des données</h3>
          <p className="text-slate-500 mb-6">Téléchargez une copie de vos données</p>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">📄 Clients (CSV)</button>
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">📊 Devis (CSV)</button>
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">🏗️ Chantiers (CSV)</button>
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">⏱️ Pointages (CSV)</button>
          </div>
        </div>
      )}
    </div>
  );
}
