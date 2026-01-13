import React, { useState, useEffect } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';
import Dashboard from './components/Dashboard';
import Chantiers from './components/Chantiers';
import Planning from './components/Planning';
import Clients from './components/Clients';
import DevisPage from './components/DevisPage';
import Equipe from './components/Equipe';
import Stocks from './components/Stocks';
import Settings from './components/Settings';

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
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', entreprise: '' });
  const [authError, setAuthError] = useState('');
  const [settings, setSettings] = useState({ theme: 'light', tvaDefault: 20, tvaRates: [20, 10, 5.5, 0], currency: 'EUR', notifications: true, autoBackup: true, twoFA: false });

  useEffect(() => { const s = localStorage.getItem('cp_settings'); if (s) setSettings(JSON.parse(s)); }, []);
  useEffect(() => { localStorage.setItem('cp_settings', JSON.stringify(settings)); }, [settings]);

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
  };

  useEffect(() => {
    const notifs = [];
    stocks.filter(s => s.quantite <= (s.seuil || 5)).forEach(s => notifs.push({ id: 's'+s.id, icon: '📦', msg: `Stock bas: ${s.nom}`, page: 'stocks' }));
    devis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => notifs.push({ id: 'd'+d.id, icon: '💰', msg: `Impayée: ${d.numero}`, page: 'devis' }));
    setNotifications(notifs);
  }, [stocks, devis]);

  const save = (k, d) => localStorage.setItem('cp_' + k, JSON.stringify(d));

  const addChantierWithEvent = (ch) => {
    const newCh = { id: Date.now().toString(), ...ch };
    setChantiers(prev => { const u = [...prev, newCh]; save('chantiers', u); return u; });
    if (ch.date_debut) {
      const ev = { id: 'ch_' + newCh.id, title: '🏗️ ' + ch.nom, date: ch.date_debut, time: '08:00', type: 'chantier', chantierId: newCh.id };
      setEvents(prev => { const u = [...prev, ev]; save('events', u); return u; });
    }
  };

  const updateChantier = (id, data) => {
    setChantiers(prev => { const u = prev.map(c => c.id === id ? { ...c, ...data } : c); save('chantiers', u); return u; });
  };

  const addEventWithChantier = (ev) => {
    const newEv = { id: Date.now().toString(), ...ev };
    setEvents(prev => { const u = [...prev, newEv]; save('events', u); return u; });
    if (ev.type === 'chantier' && !ev.chantierId) {
      const newCh = { id: 'ev_' + newEv.id, nom: ev.title, date_debut: ev.date, statut: 'en_cours', progression: 0 };
      setChantiers(prev => { const u = [...prev, newCh]; save('chantiers', u); return u; });
    }
  };

  const stats = {
    caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee' && new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    devisAttente: devis.filter(d => d.type === 'devis' && !['accepte', 'refuse'].includes(d.statut)).length,
    impayees: devis.filter(d => d.type === 'facture' && d.statut !== 'payee'),
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length,
    stocksBas: stocks.filter(s => s.quantite <= (s.seuil || 5)).length,
    heuresMois: pointages.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0),
  };

  const searchResults = search.length > 1 ? [
    ...clients.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())).slice(0,3).map(c => ({type:'clients', icon:'👤', label: c.nom})),
    ...chantiers.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())).slice(0,3).map(c => ({type:'chantiers', icon:'🏗️', label: c.nom})),
    ...stocks.filter(s => s.nom?.toLowerCase().includes(search.toLowerCase())).slice(0,3).map(s => ({type:'stocks', icon:'📦', label: s.nom})),
    ...equipe.filter(e => e.nom?.toLowerCase().includes(search.toLowerCase())).slice(0,3).map(e => ({type:'equipe', icon:'👷', label: e.nom})),
  ] : [];

  const handleSignIn = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signIn(authForm.email, authForm.password); if (error) setAuthError(error.message); };
  const handleSignUp = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom, entreprise: authForm.entreprise }); if (error) setAuthError(error.message); else { alert('Compte créé !'); setShowSignUp(false); } };
  const handleSignOut = async () => { await auth.signOut(); setUser(null); };

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="text-6xl animate-bounce">🏗️</div></div>;

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center">
        <div className="max-w-md text-white">
          <div className="text-6xl mb-6">🏗️</div>
          <h1 className="text-4xl font-bold mb-4">ChantierPro</h1>
          <p className="text-xl opacity-90">La solution tout-en-un pour artisans du BTP.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="text-slate-400 mb-6">{showSignUp ? 'Essai gratuit' : 'Accédez à votre espace'}</p>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && <>
              <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Nom" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} />
              <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Entreprise" value={authForm.entreprise} onChange={e => setAuthForm(p => ({...p, entreprise: e.target.value}))} />
            </>}
            <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Email" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl">{showSignUp ? 'Créer' : 'Se connecter'}</button>
          </form>
          <p className="text-center text-slate-400 mt-6">
            {showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}
            <button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 font-semibold ml-2">{showSignUp ? 'Connexion' : "S'inscrire"}</button>
          </p>
        </div>
      </div>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'chantiers', icon: '🏗️', label: 'Chantiers', badge: stats.chantiersEnCours },
    { id: 'planning', icon: '📅', label: 'Planning' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures', badge: stats.impayees.length },
    { id: 'equipe', icon: '👷', label: 'Équipe' },
    { id: 'stocks', icon: '📦', label: 'Stocks', badge: stats.stocksBas },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ];

  const quickAddItems = [
    {icon:'📝',label:'Devis',p:'devis'}, {icon:'🧾',label:'Facture',p:'devis'},
    {icon:'🏗️',label:'Chantier',p:'chantiers'}, {icon:'👤',label:'Client',p:'clients'},
    {icon:'👷',label:'Employé',p:'equipe'}, {icon:'📦',label:'Stock',p:'stocks'},
    {icon:'📅',label:'Événement',p:'planning'}
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-xl">🏗️</div>
          <div>
            <h1 className="text-white font-bold">ChantierPro</h1>
            <p className="text-slate-500 text-xs truncate">{String(user?.email || '')}</p>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${page === n.id ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <span className="text-lg">{n.icon}</span>
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">🚪 Déconnexion</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b px-4 lg:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-xl">☰</button>
          
          <div className="flex-1 max-w-xl relative">
            <input type="text" placeholder="Rechercher clients, chantiers, stocks..." value={search} onChange={e => { setSearch(e.target.value); setShowSearch(true); }} onFocus={() => setShowSearch(true)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-50">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { setPage(r.type); setSearch(''); setShowSearch(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0">
                    <span>{r.icon}</span><span>{r.label}</span><span className="text-xs text-slate-400 ml-auto">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {showSearch && <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)} />}

          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2.5 hover:bg-slate-100 rounded-xl">
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifications.length}</span>}
            </button>
            {showNotifs && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border z-50">
                <div className="px-4 py-3 border-b font-semibold">Notifications</div>
                {notifications.length === 0 ? <p className="p-4 text-center text-slate-500">Aucune</p> : notifications.map(n => (
                  <button key={n.id} onClick={() => { setPage(n.page); setShowNotifs(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm">
                    <span>{n.icon}</span>{n.msg}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setShowQuickAdd(!showQuickAdd)} className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium">+ Nouveau</button>
            {showQuickAdd && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border z-50">
                {quickAddItems.map((item, i) => (
                  <button key={i} onClick={() => { setPage(item.p); setShowQuickAdd(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm border-b last:border-0">
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showQuickAdd && <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />}

          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">{(user?.email?.[0] || 'U').toUpperCase()}</div>
        </header>

        <main className="p-4 lg:p-6">
          {page === 'dashboard' && <Dashboard stats={stats} chantiers={chantiers} events={events} setPage={setPage} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantierWithEvent} updateChantier={updateChantier} clients={clients} stocks={stocks} />}
          {page === 'planning' && <Planning events={events} setEvents={e => { setEvents(e); save('events', e); }} addEvent={addEventWithChantier} chantiers={chantiers} />}
          {page === 'clients' && <Clients clients={clients} devis={devis} onSubmit={async d => { await clientsDB.create(d); const r = await clientsDB.getAll(); if (r.data) setClients(r.data); }} />}
          {page === 'devis' && <DevisPage clients={clients} devis={devis} chantiers={chantiers} settings={settings} onSubmit={async d => { await devisDB.create(d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} onUpdate={async (id, d) => { await devisDB.update(id, d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} onDelete={async id => { await devisDB.delete(id); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={e => { setEquipe(e); save('equipe', e); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} chantiers={chantiers} />}
          {page === 'stocks' && <Stocks stocks={stocks} setStocks={s => { setStocks(s); save('stocks', s); }} />}
          {page === 'settings' && <Settings user={user} settings={settings} setSettings={setSettings} clients={clients} devis={devis} chantiers={chantiers} equipe={equipe} />}
        </main>
      </div>
    </div>
  );
}
