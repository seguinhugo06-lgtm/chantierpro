import React, { useState, useEffect } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';

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
    stocks.filter(s => s.quantite <= (s.seuil || 5)).forEach(s => notifs.push({ id: 's'+s.id, type: 'warning', icon: '📦', msg: `Stock bas: ${s.nom}`, page: 'stocks' }));
    devis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => notifs.push({ id: 'd'+d.id, type: 'danger', icon: '💰', msg: `Impayée: ${d.numero}`, page: 'devis' }));
    setNotifications(notifs);
  }, [stocks, devis]);

  const save = (k, d) => localStorage.setItem('cp_' + k, JSON.stringify(d));
  const handleSignIn = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signIn(authForm.email, authForm.password); if (error) setAuthError(error.message); };
  const handleSignUp = async (e) => { e.preventDefault(); setAuthError(''); const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom, entreprise: authForm.entreprise }); if (error) setAuthError(error.message); else { alert('Compte créé !'); setShowSignUp(false); } };
  const handleSignOut = async () => { await auth.signOut(); setUser(null); };

  const stats = {
    caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee' && new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0),
    caAnnee: devis.filter(d => d.type === 'facture' && d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0),
    devisAttente: devis.filter(d => d.type === 'devis' && !['accepte', 'refuse'].includes(d.statut)).length,
    impayees: devis.filter(d => d.type === 'facture' && d.statut !== 'payee'),
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length,
    stocksBas: stocks.filter(s => s.quantite <= (s.seuil || 5)).length,
    heuresMois: pointages.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0),
  };

  const searchResults = search.length > 1 ? [...clients.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())).slice(0,3).map(c => ({type:'client',icon:'👤',...c})), ...chantiers.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())).slice(0,3).map(c => ({type:'chantier',icon:'🏗️',...c}))] : [];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-6xl animate-bounce">🏗️</div></div>;

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center"><div className="max-w-md text-white"><div className="text-6xl mb-6">🏗️</div><h1 className="text-4xl font-bold mb-4">ChantierPro</h1><p className="text-xl opacity-90">La solution tout-en-un pour artisans du BTP.</p></div></div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="text-slate-400 mb-6">{showSignUp ? 'Essai gratuit' : 'Accédez à votre espace'}</p>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && <><input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Nom" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} /><input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Entreprise" value={authForm.entreprise} onChange={e => setAuthForm(p => ({...p, entreprise: e.target.value}))} /></>}
            <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Email" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl">{showSignUp ? 'Créer' : 'Se connecter'}</button>
          </form>
          <p className="text-center text-slate-400 mt-6">{showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}<button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 font-semibold ml-2">{showSignUp ? 'Connexion' : "S'inscrire"}</button></p>
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
    { id: 'equipe', icon: '👷', label: 'Équipe', badge: 0 },
    { id: 'stocks', icon: '📦', label: 'Stocks', badge: stats.stocksBas },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-xl">🏗️</div>
          <div><h1 className="text-white font-bold">ChantierPro</h1><p className="text-slate-500 text-xs truncate">{String(user?.email || '')}</p></div>
        </div>
        <nav className="p-3 space-y-1">{nav.map(n => <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${page === n.id ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span className="text-lg">{n.icon}</span><span className="flex-1 text-left">{n.label}</span>{n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}</button>)}</nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800"><button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">🚪 Déconnexion</button></div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b px-4 lg:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-xl">☰</button>
          <div className="flex-1 max-w-xl relative">
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
            {searchResults.length > 0 && <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-50">{searchResults.map((r, i) => <button key={i} onClick={() => { setPage(r.type === 'client' ? 'clients' : 'chantiers'); setSearch(''); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"><span>{r.icon}</span><span>{r.nom}</span></button>)}</div>}
          </div>
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2.5 hover:bg-slate-100 rounded-xl"><span className="text-xl">🔔</span>{notifications.length > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifications.length}</span>}</button>
            {showNotifs && <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border z-50"><div className="px-4 py-3 border-b font-semibold">Notifications</div>{notifications.length === 0 ? <p className="p-4 text-center text-slate-500">Aucune</p> : notifications.map(n => <button key={n.id} onClick={() => { setPage(n.page); setShowNotifs(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm"><span>{n.icon}</span>{n.msg}</button>)}</div>}
          </div>
          <button onClick={() => setPage('devis')} className="hidden sm:block px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium">+ Nouveau</button>
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">{(user?.email?.[0] || 'U').toUpperCase()}</div>
        </header>
        <main className="p-4 lg:p-6">
          {page === 'dashboard' && <Dashboard stats={stats} clients={clients} devis={devis} chantiers={chantiers} events={events} equipe={equipe} setPage={setPage} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} setChantiers={c => { setChantiers(c); save('chantiers', c); }} clients={clients} />}
          {page === 'planning' && <Planning events={events} setEvents={e => { setEvents(e); save('events', e); }} clients={clients} chantiers={chantiers} />}
          {page === 'clients' && <Clients clients={clients} devis={devis} onSubmit={async d => { await clientsDB.create(d); const r = await clientsDB.getAll(); if (r.data) setClients(r.data); }} />}
          {page === 'devis' && <Devis clients={clients} devis={devis} chantiers={chantiers} onSubmit={async d => { await devisDB.create(d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} onUpdate={async (id, d) => { await devisDB.update(id, d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={e => { setEquipe(e); save('equipe', e); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} chantiers={chantiers} />}
          {page === 'stocks' && <Stocks stocks={stocks} setStocks={s => { setStocks(s); save('stocks', s); }} />}
          {page === 'settings' && <Settings user={user} />}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ stats, clients, devis, chantiers, events, equipe, setPage }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const enCours = chantiers.filter(c => c.statut === 'en_cours');
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Tableau de bord</h1><p className="text-slate-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      {stats.impayees.length > 0 && <div onClick={() => setPage('devis')} className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl cursor-pointer"><span className="text-2xl">⚠️</span><div><p className="font-semibold text-red-800">{stats.impayees.length} facture(s) impayée(s)</p><p className="text-sm text-red-600">{stats.impayees.reduce((s,d) => s + (d.total_ttc||0), 0).toLocaleString('fr-FR')} € à encaisser</p></div></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white"><p className="text-sm opacity-80">CA du mois</p><p className="text-3xl font-bold mt-1">{stats.caMois.toLocaleString('fr-FR')} €</p><p className="text-sm opacity-70">Année: {stats.caAnnee.toLocaleString('fr-FR')} €</p></div>
        <div onClick={() => setPage('devis')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg"><p className="text-sm text-slate-500">Devis en attente</p><p className="text-3xl font-bold mt-1">{stats.devisAttente}</p></div>
        <div onClick={() => setPage('chantiers')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg"><p className="text-sm text-slate-500">Chantiers en cours</p><p className="text-3xl font-bold mt-1">{stats.chantiersEnCours}</p></div>
        <div onClick={() => setPage('equipe')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg"><p className="text-sm text-slate-500">Heures ce mois</p><p className="text-3xl font-bold mt-1">{stats.heuresMois.toFixed(0)}h</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border">
          <div className="flex justify-between items-center px-5 py-4 border-b"><h3 className="font-semibold">🏗️ Chantiers en cours</h3><button onClick={() => setPage('chantiers')} className="text-orange-500 text-sm">Voir tout →</button></div>
          {enCours.length === 0 ? <div className="p-8 text-center text-slate-500">Aucun chantier</div> : <div className="divide-y">{enCours.slice(0, 4).map(c => { const cl = clients.find(x => x.id === c.client_id); return (<div key={c.id} className="p-4 flex items-center gap-4"><div className="flex-1"><p className="font-medium">{c.nom}</p><p className="text-sm text-slate-500">👤 {cl?.nom || '-'}</p></div><div className="w-32"><div className="flex justify-between text-xs mb-1"><span>Progression</span><span>{c.progression || 0}%</span></div><div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{width: `${c.progression || 0}%`}} /></div></div><p className="font-bold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p></div>); })}</div>}
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border">
            <div className="flex justify-between items-center px-5 py-4 border-b"><h3 className="font-semibold">📅 Aujourd'hui</h3><button onClick={() => setPage('planning')} className="text-orange-500 text-sm">Planning →</button></div>
            <div className="p-4">{todayEvents.length === 0 ? <p className="text-slate-500 text-center py-4">Aucun événement</p> : todayEvents.slice(0, 4).map(e => <div key={e.id} className="flex items-center gap-3 py-2"><span className="text-sm text-slate-500 w-12">{e.time}</span><span>{e.title}</span></div>)}</div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold mb-4">⚡ Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2">{[{icon:'📝',label:'Devis',p:'devis'},{icon:'👤',label:'Client',p:'clients'},{icon:'🏗️',label:'Chantier',p:'chantiers'},{icon:'⏱️',label:'Pointage',p:'equipe'}].map((a,i) => <button key={i} onClick={() => setPage(a.p)} className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-slate-50"><span className="text-2xl">{a.icon}</span><span className="text-xs">{a.label}</span></button>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chantiers({ chantiers, setChantiers, clients }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin_prevue: '', budget_prevu: '', statut: 'prospect', progression: 0 });
  const STATUTS = { prospect: '🎯 Prospect', devis: '📄 Devis', en_cours: '🔨 En cours', pause: '⏸️ Pause', termine: '✅ Terminé' };
  
  useEffect(() => { if (edit) setForm(edit); else setForm({ nom: '', client_id: '', adresse: '', date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', budget_prevu: '', statut: 'prospect', progression: 0 }); }, [edit, show]);
  
  const submit = () => { if (!form.nom) return; if (edit) setChantiers(chantiers.map(c => c.id === edit.id ? { ...c, ...form, budget_prevu: parseFloat(form.budget_prevu) || 0, progression: parseInt(form.progression) || 0 } : c)); else setChantiers([...chantiers, { id: Date.now().toString(), ...form, budget_prevu: parseFloat(form.budget_prevu) || 0, progression: parseInt(form.progression) || 0 }]); setShow(false); setEdit(null); };
  
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => { setShow(false); setEdit(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">{edit ? 'Modifier' : 'Nouveau'} chantier</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date fin</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_fin_prevue} onChange={e => setForm(p => ({...p, date_fin_prevue: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Budget (€)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.budget_prevu} onChange={e => setForm(p => ({...p, budget_prevu: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Statut</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Progression (%)</label><input type="number" min="0" max="100" className="w-full px-4 py-2.5 border rounded-xl" value={form.progression} onChange={e => setForm(p => ({...p, progression: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => { setShow(false); setEdit(null); }} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">{edit ? 'Enregistrer' : 'Créer'}</button></div>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Chantiers ({chantiers.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>
      {chantiers.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">🏗️</p><h3>Aucun chantier</h3></div> : <div className="space-y-3">{chantiers.map(c => { const cl = clients.find(x => x.id === c.client_id); return (<div key={c.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg cursor-pointer" onClick={() => { setEdit(c); setShow(true); }}><div className="flex items-center gap-4"><div className="flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">{c.nom}</h3><span className="px-2 py-1 bg-slate-100 rounded text-xs">{STATUTS[c.statut]}</span></div><p className="text-sm text-slate-500">👤 {cl?.nom || '-'} • 📍 {c.adresse || '-'}</p></div><div className="w-32"><div className="flex justify-between text-xs mb-1"><span>Progression</span><span>{c.progression}%</span></div><div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{width: `${c.progression}%`}} /></div></div><p className="text-xl font-bold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p></div></div>); })}</div>}
    </div>
  );
}

function Planning({ events, setEvents, clients, chantiers }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '09:00', type: 'rdv', clientId: '', chantierId: '' });
  
  useEffect(() => { if (show) setForm(p => ({ ...p, date: selected.toISOString().split('T')[0] })); }, [show, selected]);
  
  const getDays = () => { const y = month.getFullYear(), m = month.getMonth(); const days = []; const start = (new Date(y, m, 1).getDay() + 6) % 7; for (let i = 0; i < start; i++) days.push(null); for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push(new Date(y, m, i)); return days; };
  const submit = () => { if (!form.title) return; setEvents([...events, { id: Date.now().toString(), ...form }]); setShow(false); };
  const selStr = selected.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const selEvents = events.filter(e => e.date === selStr);
  const TYPES = { rdv: { label: 'RDV', color: 'bg-blue-500' }, chantier: { label: 'Chantier', color: 'bg-green-500' }, relance: { label: 'Relance', color: 'bg-amber-500' } };

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouvel événement</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Titre *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Heure</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Aucun</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Créer</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Planning</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Événement</button></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5">
          <div className="flex justify-between items-center mb-4"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h3 className="font-semibold capitalize">{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-xl">→</button></div>
          <div className="grid grid-cols-7 gap-1 mb-2">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{getDays().map((d, i) => d ? (() => { const dateStr = d.toISOString().split('T')[0]; const dayEvents = events.filter(e => e.date === dateStr); const isToday = dateStr === todayStr; const isSel = dateStr === selStr; return <button key={i} onClick={() => setSelected(d)} className={`min-h-[60px] p-1 rounded-xl text-sm flex flex-col items-center ${isSel ? 'bg-orange-500 text-white' : isToday ? 'bg-orange-100' : 'hover:bg-slate-100'}`}><span className="font-medium">{d.getDate()}</span>{dayEvents.length > 0 && <div className="flex gap-0.5 mt-1">{dayEvents.slice(0,3).map((e,j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : TYPES[e.type]?.color || 'bg-blue-500'}`} />)}</div>}</button>; })() : <div key={i} />)}</div>
        </div>
        <div className="bg-white rounded-2xl border">
          <div className="px-5 py-4 border-b"><h3 className="font-semibold">{selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div>
          <div className="p-4">{selEvents.length === 0 ? <p className="text-slate-500 text-center py-8">Aucun événement</p> : <div className="space-y-3">{selEvents.map(e => <div key={e.id} className={`p-3 rounded-xl border-l-4 bg-slate-50 ${TYPES[e.type]?.color.replace('bg-', 'border-')}`}><div className="flex justify-between"><span className={`text-xs px-2 py-0.5 rounded-full text-white ${TYPES[e.type]?.color}`}>{TYPES[e.type]?.label}</span><button onClick={() => setEvents(events.filter(x => x.id !== e.id))} className="text-red-500">✕</button></div><p className="font-medium mt-1">{e.title}</p><p className="text-sm text-slate-500">{e.time}</p></div>)}</div>}</div>
        </div>
      </div>
    </div>
  );
}

function Clients({ clients, devis, onSubmit }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
  const filtered = clients.filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));
  const getStats = (id) => ({ docs: devis.filter(d => d.client_id === id).length, ca: devis.filter(d => d.client_id === id && d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0) });
  const submit = () => { if (!form.nom || !form.email) return; onSubmit(form); setShow(false); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' }); };

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau client</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Entreprise</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Email *</label><input type="email" className="w-full px-4 py-2.5 border rounded-xl" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><textarea className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Créer</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Clients ({clients.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>
      <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 border rounded-xl" />
      {filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👥</p><h3>Aucun client</h3></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => { const s = getStats(c.id); return (<div key={c.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg"><div className="flex gap-3 mb-4"><div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">{c.nom?.[0]}</div><div><h3 className="font-semibold">{c.nom} {c.prenom}</h3>{c.entreprise && <p className="text-sm text-slate-500">{c.entreprise}</p>}</div></div><p className="text-sm text-slate-500">📧 {c.email}</p>{c.telephone && <p className="text-sm text-slate-500">📱 {c.telephone}</p>}<div className="flex justify-around mt-4 pt-4 border-t text-center"><div><p className="font-bold">{s.docs}</p><p className="text-xs text-slate-500">Docs</p></div><div><p className="font-bold text-orange-500">{s.ca.toLocaleString('fr-FR')} €</p><p className="text-xs text-slate-500">CA</p></div></div></div>); })}</div>}
    </div>
  );
}

function Devis({ clients, devis, chantiers, onSubmit, onUpdate }) {
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] });
  const [ligne, setLigne] = useState({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' });
  const filtered = devis.filter(d => filter === 'all' || (filter === 'devis' && d.type === 'devis') || (filter === 'factures' && d.type === 'facture') || (filter === 'impayees' && d.type === 'facture' && d.statut !== 'payee'));
  const addLigne = () => { if (!ligne.description) return; setForm(p => ({ ...p, lignes: [...p.lignes, { ...ligne, montant: ligne.quantite * ligne.prixUnitaire }] })); setLigne({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' }); };
  const totaux = form.lignes.reduce((s, l) => s + (l.montant || 0), 0);
  const submit = () => { if (!form.clientId || form.lignes.length === 0) return alert('Client et lignes requis'); onSubmit({ client_id: form.clientId, chantier_id: form.chantierId, numero: `${form.type === 'devis' ? 'DEV' : 'FACT'}-${Date.now()}`, date: form.date, type: form.type, statut: 'brouillon', lignes: form.lignes, total_ht: totaux, tva: totaux * 0.2, total_ttc: totaux * 1.2 }); setShow(false); setForm({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] }); };
  const STATUTS = { brouillon: 'bg-slate-200', envoye: 'bg-blue-100 text-blue-700', accepte: 'bg-green-100 text-green-700', refuse: 'bg-red-100 text-red-700', payee: 'bg-emerald-100 text-emerald-700' };

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau {form.type}</h1></div>
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <select className="px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <select className="px-4 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Chantier...</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <select className="px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select>
          <input type="date" className="px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
        </div>
        <div className="flex gap-2 flex-wrap"><input placeholder="Description" className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" value={ligne.description} onChange={e => setLigne(p => ({...p, description: e.target.value}))} /><input type="number" placeholder="Qté" className="w-20 px-3 py-2 border rounded-lg" value={ligne.quantite} onChange={e => setLigne(p => ({...p, quantite: parseFloat(e.target.value) || 1}))} /><select className="w-24 px-2 py-2 border rounded-lg" value={ligne.unite} onChange={e => setLigne(p => ({...p, unite: e.target.value}))}><option>unité</option><option>heure</option><option>m²</option><option>forfait</option></select><input type="number" placeholder="Prix HT" className="w-28 px-3 py-2 border rounded-lg" value={ligne.prixUnitaire || ''} onChange={e => setLigne(p => ({...p, prixUnitaire: parseFloat(e.target.value) || 0}))} /><button onClick={addLigne} className="px-4 py-2 bg-orange-500 text-white rounded-lg">+</button></div>
        {form.lignes.length > 0 && <div className="border rounded-xl overflow-hidden">{form.lignes.map((l, i) => <div key={i} className="flex px-4 py-2 border-b"><span className="flex-1">{l.description}</span><span className="w-20 text-center">{l.quantite} {l.unite}</span><span className="w-28 text-right">{l.montant?.toFixed(2)} €</span><button onClick={() => setForm(p => ({...p, lignes: p.lignes.filter((_,j) => j !== i)}))} className="w-10 text-red-500">✕</button></div>)}<div className="bg-slate-50 p-4"><div className="flex justify-end gap-8"><span>Total HT</span><span className="font-medium">{totaux.toFixed(2)} €</span></div><div className="flex justify-end gap-8"><span>TVA (20%)</span><span>{(totaux * 0.2).toFixed(2)} €</span></div><div className="flex justify-end gap-8 text-lg font-bold text-orange-500 pt-2 border-t mt-2"><span>Total TTC</span><span>{(totaux * 1.2).toFixed(2)} €</span></div></div></div>}
        <div className="flex justify-end gap-3"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Créer</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Devis & Factures</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>
      <div className="flex gap-2">{[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['impayees', '⚠️ Impayées']].map(([k, v]) => <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === k ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>{v}</button>)}</div>
      {filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📄</p><h3>Aucun document</h3></div> : <div className="bg-white rounded-2xl border overflow-hidden">{filtered.map(d => { const cl = clients.find(c => c.id === d.client_id); return (<div key={d.id} className="flex items-center px-5 py-4 border-b gap-4"><span className="w-24"><span className={`text-xs px-2 py-1 rounded ${d.type === 'devis' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{d.type}</span></span><span className="flex-1 font-semibold">{d.numero}</span><span className="w-32 text-slate-600">{cl?.nom || '-'}</span><span className="w-28 text-right font-bold">{(d.total_ttc || 0).toFixed(2)} €</span><select value={d.statut} onChange={e => onUpdate(d.id, { statut: e.target.value })} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STATUTS[d.statut] || STATUTS.brouillon}`}>{Object.keys(STATUTS).map(s => <option key={s} value={s}>{s}</option>)}</select></div>); })}</div>}
    </div>
  );
}

function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers }) {
  const [tab, setTab] = useState('liste');
  const [show, setShow] = useState(false);
  const [showPointage, setShowPointage] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', role: 'ouvrier', telephone: '', tauxHoraire: '' });
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heureDebut: '08:00', heureFin: '17:00', pause: 60 });
  const ROLES = { ouvrier: 'Ouvrier', chef: 'Chef', apprenti: 'Apprenti' };
  const calcHeures = (d, f, p) => { const [hd, md] = d.split(':').map(Number); const [hf, mf] = f.split(':').map(Number); return Math.max(0, ((hf * 60 + mf) - (hd * 60 + md) - (p || 0)) / 60); };
  const getHeuresMois = (id) => pointages.filter(p => p.employeId === id && new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0);
  const submitEquipe = () => { if (!form.nom) return; setEquipe([...equipe, { id: Date.now().toString(), ...form, tauxHoraire: parseFloat(form.tauxHoraire) || 0 }]); setShow(false); setForm({ nom: '', prenom: '', role: 'ouvrier', telephone: '', tauxHoraire: '' }); };
  const submitPointage = () => { if (!pForm.employeId) return; setPointages([...pointages, { id: Date.now().toString(), ...pForm, heures: calcHeures(pForm.heureDebut, pForm.heureFin, pForm.pause) }]); setShowPointage(false); setPForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heureDebut: '08:00', heureFin: '17:00', pause: 60 }); };

  if (show) return (<div className="space-y-6"><div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau membre</h1></div><div className="bg-white rounded-2xl border p-6"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Rôle</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">Taux horaire (€)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div></div><div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submitEquipe} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button></div></div></div>);
  
  if (showPointage) return (<div className="space-y-6"><div className="flex items-center gap-4"><button onClick={() => setShowPointage(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Saisir pointage</h1></div><div className="bg-white rounded-2xl border p-6"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Employé *</label><select className="w-full px-4 py-2.5 border rounded-xl" value={pForm.employeId} onChange={e => setPForm(p => ({...p, employeId: e.target.value}))}><option value="">Sélectionner...</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">Chantier</label><select className="w-full px-4 py-2.5 border rounded-xl" value={pForm.chantierId} onChange={e => setPForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.date} onChange={e => setPForm(p => ({...p, date: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Pause (min)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.pause} onChange={e => setPForm(p => ({...p, pause: parseInt(e.target.value) || 0}))} /></div><div><label className="block text-sm font-medium mb-1">Début</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.heureDebut} onChange={e => setPForm(p => ({...p, heureDebut: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Fin</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.heureFin} onChange={e => setPForm(p => ({...p, heureFin: e.target.value}))} /></div></div><div className="mt-4 p-4 bg-orange-50 rounded-xl"><p className="text-sm text-orange-800">⏱️ Heures: <span className="font-bold">{calcHeures(pForm.heureDebut, pForm.heureFin, pForm.pause).toFixed(1)}h</span></p></div><div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShowPointage(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submitPointage} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Enregistrer</button></div></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Équipe & Pointage</h1><div className="flex gap-2"><button onClick={() => setShowPointage(true)} className="px-4 py-2 bg-slate-100 rounded-xl">⏱️ Pointage</button><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Membre</button></div></div>
      <div className="flex gap-2 border-b pb-2">{[['liste', '👥 Équipe'], ['pointages', '⏱️ Pointages']].map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>)}</div>
      {tab === 'liste' ? (equipe.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👷</p><h3>Aucun membre</h3></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{equipe.map(m => <div key={m.id} className="bg-white rounded-2xl border p-5"><div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold">{m.nom?.[0]}{m.prenom?.[0]}</div><div><h3 className="font-semibold">{m.nom} {m.prenom}</h3><p className="text-sm text-slate-500">{ROLES[m.role] || m.role}</p></div></div>{m.telephone && <p className="text-sm text-slate-500">📱 {m.telephone}</p>}{m.tauxHoraire > 0 && <p className="text-sm text-slate-500">💰 {m.tauxHoraire} €/h</p>}<div className="mt-4 pt-4 border-t flex justify-between"><span className="text-sm text-slate-500">Ce mois</span><span className="font-bold text-orange-500">{getHeuresMois(m.id).toFixed(1)}h</span></div></div>)}</div>) : (<div className="bg-white rounded-2xl border overflow-hidden">{pointages.length === 0 ? <p className="p-8 text-center text-slate-500">Aucun pointage</p> : [...pointages].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(p => { const emp = equipe.find(e => e.id === p.employeId); const ch = chantiers.find(c => c.id === p.chantierId); return (<div key={p.id} className="flex items-center px-5 py-3 border-b gap-4"><span className="w-28 font-medium">{new Date(p.date).toLocaleDateString('fr-FR')}</span><span className="flex-1">{emp?.nom} {emp?.prenom}</span><span className="flex-1 text-slate-500">{ch?.nom || '-'}</span><span className="w-24 text-sm">{p.heureDebut} - {p.heureFin}</span><span className="w-20 text-right font-bold text-orange-500">{(p.heures || 0).toFixed(1)}h</span></div>); })}</div>)}
    </div>
  );
}

function Stocks({ stocks, setStocks }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', reference: '', categorie: 'Autre', quantite: 0, seuil: 5, prix: 0, emplacement: '' });
  const CATS = ['Plomberie', 'Électricité', 'Maçonnerie', 'Peinture', 'Outillage', 'Autre'];
  const lowStocks = stocks.filter(s => s.quantite <= (s.seuil || 5));
  const filtered = stocks.filter(s => !search || s.nom?.toLowerCase().includes(search.toLowerCase()));
  const totalValue = stocks.reduce((s, st) => s + (st.quantite || 0) * (st.prix || 0), 0);
  const submit = () => { if (!form.nom) return; setStocks([...stocks, { id: Date.now().toString(), ...form, quantite: parseFloat(form.quantite) || 0, seuil: parseInt(form.seuil) || 5, prix: parseFloat(form.prix) || 0 }]); setShow(false); setForm({ nom: '', reference: '', categorie: 'Autre', quantite: 0, seuil: 5, prix: 0, emplacement: '' }); };
  const updateQty = (id, delta) => setStocks(stocks.map(s => s.id === id ? { ...s, quantite: Math.max(0, (s.quantite || 0) + delta) } : s));

  if (show) return (<div className="space-y-6"><div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau matériau</h1></div><div className="bg-white rounded-2xl border p-6"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Référence</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Catégorie</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">Quantité</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.quantite} onChange={e => setForm(p => ({...p, quantite: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Seuil alerte</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.seuil} onChange={e => setForm(p => ({...p, seuil: e.target.value}))} /></div><div><label className="block text-sm font-medium mb-1">Prix unitaire (€)</label><input type="number" step="0.01" className="w-full px-4 py-2.5 border rounded-xl" value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div><div className="col-span-2"><label className="block text-sm font-medium mb-1">Emplacement</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.emplacement} onChange={e => setForm(p => ({...p, emplacement: e.target.value}))} placeholder="Entrepôt A, Étagère 3" /></div></div><div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button></div></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Stocks ({stocks.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button></div>
      {lowStocks.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><div className="flex items-center gap-3 mb-2"><span className="text-2xl">⚠️</span><h3 className="font-semibold text-amber-800">Stocks bas ({lowStocks.length})</h3></div><div className="flex flex-wrap gap-2">{lowStocks.map(s => <span key={s.id} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">{s.nom}: {s.quantite}</span>)}</div></div>}
      <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 border rounded-xl" />
      {filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📦</p><h3>Aucun matériau</h3></div> : <div className="bg-white rounded-2xl border overflow-hidden">{filtered.map(s => <div key={s.id} className={`flex items-center px-5 py-4 border-b gap-4 ${s.quantite <= (s.seuil || 5) ? 'bg-red-50' : ''}`}><div className="flex-1"><p className="font-medium">{s.nom}</p><div className="flex gap-2 text-xs text-slate-500">{s.reference && <span>Réf: {s.reference}</span>}{s.emplacement && <span>📍 {s.emplacement}</span>}</div></div><span className="w-24 text-sm">{s.categorie}</span><div className="flex items-center gap-2"><button onClick={() => updateQty(s.id, -1)} className="w-8 h-8 bg-slate-100 rounded-lg font-bold">-</button><span className={`w-12 text-center font-semibold ${s.quantite <= (s.seuil || 5) ? 'text-red-600' : ''}`}>{s.quantite}</span><button onClick={() => updateQty(s.id, 1)} className="w-8 h-8 bg-slate-100 rounded-lg font-bold">+</button></div><span className="w-20 text-right">{(s.prix || 0).toFixed(2)} €</span><span className="w-24 text-right font-semibold">{((s.quantite || 0) * (s.prix || 0)).toFixed(2)} €</span></div>)}<div className="px-5 py-4 bg-slate-50 flex justify-between"><span className="font-semibold">Valeur totale</span><span className="font-bold text-orange-500">{totalValue.toFixed(2)} €</span></div></div>}
    </div>
  );
}

function Settings({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4">👤 Mon compte</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Email</span><span className="font-medium">{String(user?.email || '-')}</span></div>
          <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Nom</span><span className="font-medium">{String(user?.user_metadata?.nom || '-')}</span></div>
          <div className="flex justify-between py-3"><span className="text-slate-500">Entreprise</span><span className="font-medium">{String(user?.user_metadata?.entreprise || '-')}</span></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4">💳 Abonnement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 rounded-2xl p-6 text-center"><h4 className="font-bold text-lg">Solo</h4><p className="text-4xl font-bold text-orange-500 my-4">29€<span className="text-sm text-slate-500">/mois</span></p><ul className="text-sm text-slate-600 space-y-2 mb-6"><li>✅ Clients illimités</li><li>✅ Devis & Factures</li><li>✅ Planning</li></ul><button className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-medium">Choisir</button></div>
          <div className="border-2 border-green-500 rounded-2xl p-6 text-center relative"><div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">POPULAIRE</div><h4 className="font-bold text-lg">Pro</h4><p className="text-4xl font-bold text-green-500 my-4">59€<span className="text-sm text-slate-500">/mois</span></p><ul className="text-sm text-slate-600 space-y-2 mb-6"><li>✅ Tout du Solo</li><li>✅ Multi-utilisateurs</li><li>✅ Rapports avancés</li></ul><button className="w-full py-2.5 bg-green-500 text-white rounded-xl font-medium">Choisir</button></div>
        </div>
      </div>
    </div>
  );
}
