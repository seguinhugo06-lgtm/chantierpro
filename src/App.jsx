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
  const [pointages, setPointages] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', entreprise: '' });
  const [authError, setAuthError] = useState('');
  const [entreprise, setEntreprise] = useState({
    nom: '', logo: '', couleur: '#f97316', siret: '', tvaIntra: '', assurance: '', rib: '', adresse: '', tel: '', email: ''
  });

  useEffect(() => { const e = localStorage.getItem('cp_entreprise'); if (e) setEntreprise(JSON.parse(e)); }, []);
  useEffect(() => { localStorage.setItem('cp_entreprise', JSON.stringify(entreprise)); }, [entreprise]);

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

  useEffect(() => {
    const notifs = [];
    devis.filter(d => d.type === 'facture' && d.statut === 'envoyee').forEach(d => {
      const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
      if (days > 30) notifs.push({ id: 'r'+d.id, icon: '🔴', msg: `Retard: ${d.numero}` });
      else if (days > 15) notifs.push({ id: 'a'+d.id, icon: '🟡', msg: `Relance: ${d.numero}` });
    });
    setNotifications(notifs);
  }, [devis]);

  const save = (k, d) => localStorage.setItem('cp_' + k, JSON.stringify(d));

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
    enAttente: devis.filter(d => d.type === 'facture' && d.statut === 'envoyee').reduce((s, d) => s + (d.total_ttc || 0), 0),
    enRetard: devis.filter(d => d.type === 'facture' && d.statut === 'envoyee' && (Date.now() - new Date(d.date)) > 30*86400000).reduce((s, d) => s + (d.total_ttc || 0), 0),
    devisAttente: devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length,
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours').length,
  };

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
          <p className="text-xl opacity-90">Gestion simple pour artisans.</p>
          <p className="mt-4 opacity-75">Devis en 2 min • Signature mobile • Suivi rentabilité</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4 mt-6">
            {showSignUp && <>
              <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Votre nom" value={authForm.nom} onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))} />
              <input className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Nom entreprise" value={authForm.entreprise} onChange={e => setAuthForm(p => ({...p, entreprise: e.target.value}))} />
            </>}
            <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Email" value={authForm.email} onChange={e => setAuthForm(p => ({...p, email: e.target.value}))} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(p => ({...p, password: e.target.value}))} required />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl">{showSignUp ? 'Créer mon compte' : 'Se connecter'}</button>
          </form>
          <p className="text-center text-slate-400 mt-6">{showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}<button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 font-semibold ml-2">{showSignUp ? 'Connexion' : "S'inscrire"}</button></p>
        </div>
      </div>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: '📊', label: 'Accueil' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures' },
    { id: 'chantiers', icon: '🏗️', label: 'Chantiers', badge: stats.chantiersEnCours },
    { id: 'planning', icon: '📅', label: 'Planning' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'catalogue', icon: '📦', label: 'Catalogue' },
    { id: 'equipe', icon: '👷', label: 'Équipe & Heures' },
    { id: 'settings', icon: '⚙️', label: 'Mon entreprise' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          {entreprise.logo ? <img src={entreprise.logo} className="w-10 h-10 rounded-xl object-cover" alt="" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background: entreprise.couleur}}>🏗️</div>}
          <div><h1 className="text-white font-bold truncate">{entreprise.nom || 'ChantierPro'}</h1><p className="text-slate-500 text-xs truncate">{String(user?.email || '')}</p></div>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map(n => <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${page === n.id ? 'text-white' : 'text-slate-400 hover:bg-slate-800'}`} style={page === n.id ? {background: entreprise.couleur} : {}}>
            <span className="text-lg">{n.icon}</span><span className="flex-1 text-left">{n.label}</span>{n.badge > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{n.badge}</span>}
          </button>)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800"><button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm">🚪 Déconnexion</button></div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-xl">☰</button>
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2.5 hover:bg-slate-100 rounded-xl"><span className="text-xl">🔔</span>{notifications.length > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifications.length}</span>}</button>
            {showNotifs && <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border z-50"><div className="px-4 py-3 border-b font-semibold">Notifications</div>{notifications.length === 0 ? <p className="p-4 text-center text-slate-500">✅ Tout est OK</p> : notifications.map(n => <div key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-sm border-b last:border-0"><span>{n.icon}</span><span>{n.msg}</span></div>)}</div>}
          </div>
          <div className="relative">
            <button onClick={() => setShowQuickAdd(!showQuickAdd)} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium" style={{background: entreprise.couleur}}>+ Nouveau</button>
            {showQuickAdd && <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border z-50">{[{icon:'📄',label:'Nouveau devis',p:'devis'},{icon:'🧾',label:'Nouvelle facture',p:'devis'},{icon:'🏗️',label:'Nouveau chantier',p:'chantiers'},{icon:'👤',label:'Nouveau client',p:'clients'}].map((item, i) => <button key={i} onClick={() => { setPage(item.p); setShowQuickAdd(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm border-b last:border-0"><span className="text-lg">{item.icon}</span>{item.label}</button>)}</div>}
          </div>
          {showQuickAdd && <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />}
          {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
        </header>
        <main className="p-4 lg:p-6">
          {page === 'dashboard' && <Dashboard stats={stats} devis={devis} chantiers={chantiers} depenses={depenses} pointages={pointages} setPage={setPage} couleur={entreprise.couleur} getChantierBilan={getChantierBilan} />}
          {page === 'devis' && <DevisPage clients={clients} devis={devis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={async d => { await devisDB.create(d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} onUpdate={async (id, d) => { await devisDB.update(id, d); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} onDelete={async id => { await devisDB.delete(id); const r = await devisDB.getAll(); if (r.data) setDevis(r.data); }} />}
          {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={d => { setDepenses(d); save('depenses', d); }} getChantierBilan={getChantierBilan} couleur={entreprise.couleur} />}
          {page === 'planning' && <Planning events={events} setEvents={e => { setEvents(e); save('events', e); }} addEvent={addEvent} chantiers={chantiers} equipe={equipe} couleur={entreprise.couleur} />}
          {page === 'clients' && <Clients clients={clients} devis={devis} onSubmit={async d => { await clientsDB.create(d); const r = await clientsDB.getAll(); if (r.data) setClients(r.data); }} couleur={entreprise.couleur} />}
          {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={c => { setCatalogue(c); save('catalogue', c); }} couleur={entreprise.couleur} />}
          {page === 'equipe' && <Equipe equipe={equipe} setEquipe={e => { setEquipe(e); save('equipe', e); }} pointages={pointages} setPointages={p => { setPointages(p); save('pointages', p); }} chantiers={chantiers} couleur={entreprise.couleur} />}
          {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} />}
        </main>
      </div>
    </div>
  );
}
