import React, { useState, useEffect } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';

// ============================================
// CHANTIERPRO V2 - Application Artisan BTP
// Design: Modern, Professional, Orange/Slate
// ============================================

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [events, setEvents] = useState([]);
  
  // AUTH STATE
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', prenom: '', entreprise: '' });
  const [authError, setAuthError] = useState('');
  
  // FORM STATES
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({ 
    nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' 
  });
  
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisForm, setDevisForm] = useState({ 
    clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], validite: 30, notes: ''
  });
  const [currentLigne, setCurrentLigne] = useState({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' });

  // CALENDAR STATE
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', date: '', time: '09:00', type: 'rdv', clientId: '', notes: '' });

  // AUTH EFFECT
  useEffect(() => {
    let mounted = true;
    auth.getCurrentUser().then(currentUser => {
      if (mounted) { setUser(currentUser); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    
    const result = auth.onAuthStateChange((event, session) => {
      if (mounted && event !== 'INITIAL_SESSION') setUser(session?.user ?? null);
    });
    return () => { mounted = false; result?.data?.subscription?.unsubscribe(); };
  }, []);
  
  // LOAD DATA
  useEffect(() => {
    if (user) { loadClients(); loadDevis(); loadEvents(); }
  }, [user]);
  
  const loadClients = async () => {
    const { data, error } = await clientsDB.getAll();
    if (!error && data) setClients(data);
  };
  
  const loadDevis = async () => {
    const { data, error } = await devisDB.getAll();
    if (!error && data) setDevis(data);
  };

  const loadEvents = () => {
    const saved = localStorage.getItem('cp_events');
    if (saved) setEvents(JSON.parse(saved));
  };

  const saveEvents = (newEvents) => {
    setEvents(newEvents);
    localStorage.setItem('cp_events', JSON.stringify(newEvents));
  };
  
  // AUTH HANDLERS
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom, prenom: authForm.prenom, entreprise: authForm.entreprise });
    if (error) setAuthError(error.message);
    else { alert('Compte créé ! Vérifiez votre email.'); setShowSignUp(false); }
  };
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await auth.signIn(authForm.email, authForm.password);
    if (error) setAuthError(error.message);
  };
  
  const handleSignOut = async () => {
    await auth.signOut();
    setClients([]); setDevis([]); setUser(null);
  };
  
  // CLIENT HANDLERS
  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (editingClient) await clientsDB.update(editingClient.id, clientForm);
    else await clientsDB.create(clientForm);
    loadClients();
    resetClientForm();
  };
  
  const resetClientForm = () => {
    setClientForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });
    setEditingClient(null);
    setShowClientForm(false);
  };

  const handleClientEdit = (client) => {
    setEditingClient(client);
    setClientForm(client);
    setShowClientForm(true);
  };
  
  const handleClientDelete = async (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      await clientsDB.delete(id);
      loadClients();
    }
  };
  
  // DEVIS HANDLERS
  const ajouterLigne = () => {
    if (!currentLigne.description || currentLigne.prixUnitaire <= 0) {
      alert('Remplissez description et prix'); return;
    }
    const montant = currentLigne.quantite * currentLigne.prixUnitaire;
    setDevisForm(prev => ({ ...prev, lignes: [...prev.lignes, { ...currentLigne, montant }] }));
    setCurrentLigne({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' });
  };
  
  const supprimerLigne = (index) => {
    setDevisForm(prev => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== index) }));
  };
  
  const calculerTotaux = (lignes) => {
    const totalHT = lignes.reduce((sum, l) => sum + (l.montant || 0), 0);
    const tva = totalHT * 0.2;
    return { totalHT, tva, totalTTC: totalHT + tva };
  };
  
  const handleDevisSubmit = async () => {
    if (!devisForm.clientId || devisForm.lignes.length === 0) {
      alert('Sélectionnez un client et ajoutez des lignes'); return;
    }
    const totaux = calculerTotaux(devisForm.lignes);
    const prefix = devisForm.type === 'devis' ? 'DEV' : 'FACT';
    const numero = `${prefix}-${new Date().getFullYear()}-${String(devis.length + 1).padStart(4, '0')}`;
    
    await devisDB.create({
      client_id: devisForm.clientId, numero, date: devisForm.date, type: devisForm.type,
      statut: 'brouillon', lignes: devisForm.lignes, total_ht: totaux.totalHT,
      tva: totaux.tva, total_ttc: totaux.totalTTC, validite: devisForm.validite, notes: devisForm.notes
    });
    loadDevis();
    setDevisForm({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], validite: 30, notes: '' });
    setShowDevisForm(false);
  };
  
  const transformerEnFacture = async (devisId) => {
    const d = devis.find(x => x.id === devisId);
    if (!d) return;
    const numero = `FACT-${new Date().getFullYear()}-${String(devis.filter(x => x.type === 'facture').length + 1).padStart(4, '0')}`;
    await devisDB.create({
      client_id: d.client_id, numero, date: new Date().toISOString().split('T')[0],
      type: 'facture', statut: 'envoyee', lignes: d.lignes,
      total_ht: d.total_ht, tva: d.tva, total_ttc: d.total_ttc
    });
    await devisDB.update(devisId, { statut: 'accepte' });
    loadDevis();
  };
  
  const changerStatut = async (id, nouveauStatut) => {
    await devisDB.update(id, { statut: nouveauStatut });
    loadDevis();
  };

  // EVENT HANDLERS
  const handleEventSubmit = (e) => {
    e.preventDefault();
    const newEvent = {
      id: Date.now().toString(),
      ...eventForm,
      date: eventForm.date || selectedDate.toISOString().split('T')[0]
    };
    saveEvents([...events, newEvent]);
    setEventForm({ title: '', date: '', time: '09:00', type: 'rdv', clientId: '', notes: '' });
    setShowEventForm(false);
  };

  const deleteEvent = (id) => saveEvents(events.filter(e => e.id !== id));

  // PDF HANDLER
  const handleDownloadPDF = async (devisItem) => {
    const client = clients.find(c => c.id === devisItem.client_id);
    if (!client) { alert('Client introuvable'); return; }
    
    const entreprise = {
      nom: String(user?.user_metadata?.entreprise || user?.user_metadata?.nom || 'Mon Entreprise'),
      adresse: '123 rue de la Construction, 75000 Paris',
      siret: '123 456 789 00010',
      email: String(user?.email || ''),
      telephone: '01 23 45 67 89',
      tva_percent: 20
    };
    
    try {
      const { downloadDevisPDF } = await import('./components/DevisPDF');
      await downloadDevisPDF(devisItem, client, entreprise);
    } catch (error) {
      console.error('Erreur PDF:', error);
      window.print();
    }
  };

  // COMPUTED STATS
  const stats = {
    caMois: devis.filter(d => d.type === 'facture' && d.statut === 'payee' && 
      new Date(d.date).getMonth() === new Date().getMonth() &&
      new Date(d.date).getFullYear() === new Date().getFullYear())
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0),
    caAnnee: devis.filter(d => d.type === 'facture' && d.statut === 'payee' &&
      new Date(d.date).getFullYear() === new Date().getFullYear())
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0),
    devisEnAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'brouillon'].includes(d.statut)),
    montantEnAttente: devis.filter(d => d.type === 'devis' && d.statut === 'envoye')
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0),
    facturesImpayees: devis.filter(d => d.type === 'facture' && d.statut !== 'payee'),
    montantImpaye: devis.filter(d => d.type === 'facture' && d.statut !== 'payee')
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0),
    tauxConversion: devis.filter(d => d.type === 'devis').length > 0 
      ? Math.round((devis.filter(d => d.type === 'devis' && d.statut === 'accepte').length / 
          devis.filter(d => d.type === 'devis').length) * 100) : 0,
    clientsActifs: clients.length
  };

  // ============================================
  // RENDER
  // ============================================
  
  // LOADING
  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingLogo}>🏗️</div>
        <p style={styles.loadingText}>Chargement...</p>
      </div>
    );
  }
  
  // AUTH SCREEN
  if (!user) {
    return (
      <div style={styles.authScreen}>
        <div style={styles.authLeft}>
          <div style={styles.authBranding}>
            <div style={styles.authLogo}>🏗️</div>
            <h1 style={styles.authBrandName}>ChantierPro</h1>
            <p style={styles.authTagline}>La gestion simplifiée pour artisans du bâtiment</p>
            <div style={styles.authFeatures}>
              <div style={styles.authFeature}><span>📊</span> Tableau de bord intelligent</div>
              <div style={styles.authFeature}><span>📄</span> Devis & Factures en 2 clics</div>
              <div style={styles.authFeature}><span>📅</span> Calendrier & Planning</div>
              <div style={styles.authFeature}><span>👥</span> Gestion clients complète</div>
            </div>
          </div>
        </div>
        <div style={styles.authRight}>
          <div style={styles.authBox}>
            <h2 style={styles.authTitle}>{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
            <p style={styles.authSubtitle}>{showSignUp ? 'Commencez gratuitement' : 'Accédez à votre espace'}</p>
            
            <form onSubmit={showSignUp ? handleSignUp : handleSignIn} style={styles.authForm}>
              {showSignUp && (
                <>
                  <div style={styles.inputRow}>
                    <input type="text" placeholder="Nom" value={authForm.nom} onChange={(e) => setAuthForm(p => ({...p, nom: e.target.value}))} required style={styles.input} />
                    <input type="text" placeholder="Prénom" value={authForm.prenom} onChange={(e) => setAuthForm(p => ({...p, prenom: e.target.value}))} style={styles.input} />
                  </div>
                  <input type="text" placeholder="Nom de l'entreprise" value={authForm.entreprise} onChange={(e) => setAuthForm(p => ({...p, entreprise: e.target.value}))} style={styles.input} />
                </>
              )}
              <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm(p => ({...p, email: e.target.value}))} required style={styles.input} />
              <input type="password" placeholder="Mot de passe" value={authForm.password} onChange={(e) => setAuthForm(p => ({...p, password: e.target.value}))} required style={styles.input} />
              {authError && <p style={styles.authError}>{authError}</p>}
              <button type="submit" style={styles.authButton}>{showSignUp ? 'Créer mon compte' : 'Se connecter'}</button>
            </form>
            
            <p style={styles.authSwitch}>
              {showSignUp ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}
              <button onClick={() => setShowSignUp(!showSignUp)} style={styles.authSwitchBtn}>
                {showSignUp ? 'Se connecter' : "S'inscrire"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // MAIN APP
  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>🏗️</div>
          <div>
            <h1 style={styles.sidebarTitle}>ChantierPro</h1>
            <p style={styles.sidebarSubtitle}>{String(user?.user_metadata?.entreprise || user?.email || '')}</p>
          </div>
        </div>
        
        <nav style={styles.nav}>
          {[
            { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
            { id: 'calendar', icon: '📅', label: 'Calendrier' },
            { id: 'clients', icon: '👥', label: 'Clients' },
            { id: 'devis', icon: '📄', label: 'Devis & Factures' },
            { id: 'settings', icon: '⚙️', label: 'Paramètres' }
          ].map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)}
              style={{...styles.navItem, ...(currentPage === item.id ? styles.navItemActive : {})}}>
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'devis' && stats.facturesImpayees.length > 0 && (
                <span style={styles.navBadge}>{stats.facturesImpayees.length}</span>
              )}
            </button>
          ))}
        </nav>
        
        <div style={styles.sidebarFooter}>
          <button onClick={handleSignOut} style={styles.logoutBtn}>🚪 Déconnexion</button>
        </div>
      </aside>
      
      {/* MAIN CONTENT */}
      <main style={styles.main}>
        {currentPage === 'dashboard' && <DashboardPage stats={stats} clients={clients} devis={devis} events={events} setCurrentPage={setCurrentPage} />}
        {currentPage === 'calendar' && <CalendarPage events={events} clients={clients} selectedDate={selectedDate} setSelectedDate={setSelectedDate} showEventForm={showEventForm} setShowEventForm={setShowEventForm} eventForm={eventForm} setEventForm={setEventForm} onSubmit={handleEventSubmit} onDelete={deleteEvent} />}
        {currentPage === 'clients' && <ClientsPage clients={clients} devis={devis} showClientForm={showClientForm} setShowClientForm={setShowClientForm} clientForm={clientForm} setClientForm={setClientForm} editingClient={editingClient} onSubmit={handleClientSubmit} onCancel={resetClientForm} onEdit={handleClientEdit} onDelete={handleClientDelete} />}
        {currentPage === 'devis' && <DevisPage clients={clients} devis={devis} showDevisForm={showDevisForm} setShowDevisForm={setShowDevisForm} devisForm={devisForm} setDevisForm={setDevisForm} currentLigne={currentLigne} setCurrentLigne={setCurrentLigne} onAddLigne={ajouterLigne} onDeleteLigne={supprimerLigne} onSubmit={handleDevisSubmit} calculerTotaux={calculerTotaux} transformerEnFacture={transformerEnFacture} changerStatut={changerStatut} onDownloadPDF={handleDownloadPDF} />}
        {currentPage === 'settings' && <SettingsPage user={user} />}
      </main>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
function DashboardPage({ stats, clients, devis, events, setCurrentPage }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const recentDevis = devis.slice(0, 5);
  
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Tableau de bord</h1>
          <p style={styles.pageSubtitle}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
      
      {/* STATS */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff'}}>
          <div style={styles.statIcon}>💰</div>
          <div>
            <p style={styles.statLabel}>CA du mois</p>
            <p style={styles.statValue}>{stats.caMois.toLocaleString('fr-FR')} €</p>
            <p style={styles.statSub}>Année: {stats.caAnnee.toLocaleString('fr-FR')} €</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📄</div>
          <div>
            <p style={styles.statLabel}>Devis en attente</p>
            <p style={styles.statValue}>{stats.devisEnAttente.length}</p>
            <p style={styles.statSub}>{stats.montantEnAttente.toLocaleString('fr-FR')} € potentiel</p>
          </div>
        </div>
        <div style={{...styles.statCard, ...(stats.facturesImpayees.length > 0 ? {borderColor: '#f59e0b', background: '#fffbeb'} : {})}}>
          <div style={styles.statIcon}>⚠️</div>
          <div>
            <p style={styles.statLabel}>Factures impayées</p>
            <p style={styles.statValue}>{stats.facturesImpayees.length}</p>
            <p style={styles.statSub}>{stats.montantImpaye.toLocaleString('fr-FR')} € à encaisser</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📈</div>
          <div>
            <p style={styles.statLabel}>Taux conversion</p>
            <p style={styles.statValue}>{stats.tauxConversion}%</p>
            <p style={styles.statSub}>{stats.clientsActifs} clients</p>
          </div>
        </div>
      </div>
      
      {/* GRID */}
      <div style={styles.dashGrid}>
        <div style={styles.card}>
          <div style={styles.cardHead}><h3>📅 Aujourd'hui</h3><button onClick={() => setCurrentPage('calendar')} style={styles.link}>Voir tout →</button></div>
          {todayEvents.length === 0 ? (
            <div style={styles.empty}><p>Aucun événement</p><button onClick={() => setCurrentPage('calendar')} style={styles.smallBtn}>+ Ajouter</button></div>
          ) : (
            <div style={styles.eventList}>{todayEvents.map(e => (
              <div key={e.id} style={styles.eventRow}>
                <span style={{...styles.dot, background: e.type === 'chantier' ? '#10b981' : '#3b82f6'}}></span>
                <span style={styles.eventTime}>{e.time}</span>
                <span>{e.title}</span>
              </div>
            ))}</div>
          )}
        </div>
        
        <div style={styles.card}>
          <div style={styles.cardHead}><h3>📄 Documents récents</h3><button onClick={() => setCurrentPage('devis')} style={styles.link}>Voir tout →</button></div>
          {recentDevis.length === 0 ? (
            <div style={styles.empty}><p>Aucun document</p></div>
          ) : (
            <div style={styles.docList}>{recentDevis.map(doc => {
              const client = clients.find(c => c.id === doc.client_id);
              return (
                <div key={doc.id} style={styles.docRow}>
                  <div><strong>{doc.numero}</strong><br/><span style={{fontSize: '12px', color: '#64748b'}}>{client ? `${client.nom} ${client.prenom||''}` : '-'}</span></div>
                  <div style={{textAlign: 'right'}}><span style={{...styles.badge, background: getStatusColor(doc.statut)}}>{getStatusLabel(doc.statut)}</span><br/><strong>{doc.total_ttc?.toFixed(0)} €</strong></div>
                </div>
              );
            })}</div>
          )}
        </div>
        
        <div style={styles.card}>
          <h3 style={{margin: '0 0 16px'}}>⚡ Actions rapides</h3>
          <div style={styles.quickActions}>
            <button onClick={() => setCurrentPage('devis')} style={styles.quickBtn}><span>📝</span> Nouveau devis</button>
            <button onClick={() => setCurrentPage('clients')} style={styles.quickBtn}><span>👤</span> Ajouter client</button>
            <button onClick={() => setCurrentPage('calendar')} style={styles.quickBtn}><span>📅</span> Planifier RDV</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CALENDAR PAGE
// ============================================
function CalendarPage({ events, clients, selectedDate, setSelectedDate, showEventForm, setShowEventForm, eventForm, setEventForm, onSubmit, onDelete }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };
  
  const days = getDaysInMonth(currentMonth);
  const today = new Date().toISOString().split('T')[0];
  const selectedStr = selectedDate.toISOString().split('T')[0];
  const selectedEvents = events.filter(e => e.date === selectedStr);
  
  if (showEventForm) {
    return (
      <div style={styles.page}>
        <button onClick={() => setShowEventForm(false)} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.pageTitle}>Nouvel événement</h1>
        <div style={styles.formCard}>
          <form onSubmit={onSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.field}><label>Titre *</label><input type="text" value={eventForm.title} onChange={e => setEventForm(p => ({...p, title: e.target.value}))} required style={styles.input} /></div>
              <div style={styles.field}><label>Type</label><select value={eventForm.type} onChange={e => setEventForm(p => ({...p, type: e.target.value}))} style={styles.input}><option value="rdv">Rendez-vous</option><option value="chantier">Chantier</option><option value="relance">Relance</option></select></div>
              <div style={styles.field}><label>Date</label><input type="date" value={eventForm.date || selectedStr} onChange={e => setEventForm(p => ({...p, date: e.target.value}))} style={styles.input} /></div>
              <div style={styles.field}><label>Heure</label><input type="time" value={eventForm.time} onChange={e => setEventForm(p => ({...p, time: e.target.value}))} style={styles.input} /></div>
              <div style={styles.field}><label>Client</label><select value={eventForm.clientId} onChange={e => setEventForm(p => ({...p, clientId: e.target.value}))} style={styles.input}><option value="">Aucun</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
              <div style={{...styles.field, gridColumn: '1/-1'}}><label>Notes</label><textarea value={eventForm.notes} onChange={e => setEventForm(p => ({...p, notes: e.target.value}))} style={{...styles.input, minHeight: '80px'}} /></div>
            </div>
            <div style={styles.formActions}><button type="button" onClick={() => setShowEventForm(false)} style={styles.secondaryBtn}>Annuler</button><button type="submit" style={styles.primaryBtn}>Créer</button></div>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}><h1 style={styles.pageTitle}>Calendrier</h1><button onClick={() => setShowEventForm(true)} style={styles.primaryBtn}>+ Nouvel événement</button></div>
      <div style={styles.calLayout}>
        <div style={styles.calCard}>
          <div style={styles.calHeader}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={styles.calNav}>←</button>
            <h3 style={{margin: 0, textTransform: 'capitalize'}}>{currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={styles.calNav}>→</button>
          </div>
          <div style={styles.weekdays}>{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} style={styles.weekday}>{d}</div>)}</div>
          <div style={styles.daysGrid}>{days.map((day, i) => {
            if (!day) return <div key={i} style={styles.dayEmpty}></div>;
            const dateStr = day.toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedStr;
            return (
              <button key={i} onClick={() => setSelectedDate(day)} style={{...styles.day, ...(isToday ? styles.dayToday : {}), ...(isSelected ? styles.daySelected : {})}}>
                {day.getDate()}
                {dayEvents.length > 0 && <div style={styles.dayDots}>{dayEvents.slice(0,3).map((e,j) => <span key={j} style={{...styles.dayDot, background: e.type === 'chantier' ? '#10b981' : '#3b82f6'}}></span>)}</div>}
              </button>
            );
          })}</div>
        </div>
        <div style={styles.calSidebar}>
          <h3>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {selectedEvents.length === 0 ? (
            <div style={styles.empty}><p>Aucun événement</p><button onClick={() => setShowEventForm(true)} style={styles.smallBtn}>+ Ajouter</button></div>
          ) : (
            <div>{selectedEvents.map(ev => (
              <div key={ev.id} style={styles.eventCard}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{...styles.badge, background: ev.type === 'chantier' ? '#10b981' : '#3b82f6'}}>{ev.type}</span>
                  <span style={{color: '#64748b'}}>{ev.time}</span>
                </div>
                <h4 style={{margin: '0 0 8px'}}>{ev.title}</h4>
                {ev.notes && <p style={{fontSize: '13px', color: '#64748b', margin: '0 0 8px'}}>{ev.notes}</p>}
                <button onClick={() => onDelete(ev.id)} style={styles.deleteBtn}>Supprimer</button>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CLIENTS PAGE
// ============================================
function ClientsPage({ clients, devis, showClientForm, setShowClientForm, clientForm, setClientForm, editingClient, onSubmit, onCancel, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const filtered = clients.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()) || (c.entreprise && c.entreprise.toLowerCase().includes(search.toLowerCase())));
  
  const getClientStats = (id) => {
    const docs = devis.filter(d => d.client_id === id);
    const ca = docs.filter(d => d.type === 'facture' && d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0);
    return { count: docs.length, ca };
  };
  
  if (showClientForm) {
    return (
      <div style={styles.page}>
        <button onClick={onCancel} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.pageTitle}>{editingClient ? 'Modifier' : 'Nouveau'} client</h1>
        <div style={styles.formCard}>
          <form onSubmit={onSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.field}><label>Nom *</label><input type="text" value={clientForm.nom} onChange={e => setClientForm(p => ({...p, nom: e.target.value}))} required style={styles.input} /></div>
              <div style={styles.field}><label>Prénom</label><input type="text" value={clientForm.prenom} onChange={e => setClientForm(p => ({...p, prenom: e.target.value}))} style={styles.input} /></div>
              <div style={styles.field}><label>Entreprise</label><input type="text" value={clientForm.entreprise} onChange={e => setClientForm(p => ({...p, entreprise: e.target.value}))} style={styles.input} /></div>
              <div style={styles.field}><label>Email *</label><input type="email" value={clientForm.email} onChange={e => setClientForm(p => ({...p, email: e.target.value}))} required style={styles.input} /></div>
              <div style={styles.field}><label>Téléphone *</label><input type="tel" value={clientForm.telephone} onChange={e => setClientForm(p => ({...p, telephone: e.target.value}))} required style={styles.input} /></div>
              <div style={{...styles.field, gridColumn: '1/-1'}}><label>Adresse *</label><textarea value={clientForm.adresse} onChange={e => setClientForm(p => ({...p, adresse: e.target.value}))} required style={{...styles.input, minHeight: '60px'}} /></div>
              <div style={{...styles.field, gridColumn: '1/-1'}}><label>Notes</label><textarea value={clientForm.notes || ''} onChange={e => setClientForm(p => ({...p, notes: e.target.value}))} style={{...styles.input, minHeight: '60px'}} /></div>
            </div>
            <div style={styles.formActions}><button type="button" onClick={onCancel} style={styles.secondaryBtn}>Annuler</button><button type="submit" style={styles.primaryBtn}>{editingClient ? 'Enregistrer' : 'Créer'}</button></div>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}><h1 style={styles.pageTitle}>Clients</h1><button onClick={() => setShowClientForm(true)} style={styles.primaryBtn}>+ Nouveau client</button></div>
      <div style={styles.searchBar}><span>🔍</span><input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} /></div>
      {filtered.length === 0 ? (
        <div style={styles.emptyCard}><div style={{fontSize: '48px'}}>👥</div><h3>Aucun client</h3><button onClick={() => setShowClientForm(true)} style={styles.primaryBtn}>+ Ajouter</button></div>
      ) : (
        <div style={styles.clientsGrid}>{filtered.map(c => {
          const cStats = getClientStats(c.id);
          return (
            <div key={c.id} style={styles.clientCard}>
              <div style={styles.clientHead}>
                <div style={styles.avatar}>{c.nom[0]}{c.prenom?.[0] || ''}</div>
                <div style={{display: 'flex', gap: '8px'}}><button onClick={() => onEdit(c)} style={styles.iconBtn}>✏️</button><button onClick={() => onDelete(c.id)} style={styles.iconBtnDanger}>🗑️</button></div>
              </div>
              <h3 style={{margin: '0 0 4px'}}>{c.nom} {c.prenom}</h3>
              {c.entreprise && <p style={{color: '#64748b', margin: '0 0 12px', fontSize: '14px'}}>{c.entreprise}</p>}
              <p style={{fontSize: '13px', color: '#64748b', margin: '4px 0'}}>📧 {c.email}</p>
              <p style={{fontSize: '13px', color: '#64748b', margin: '4px 0'}}>📱 {c.telephone}</p>
              <div style={styles.clientStats}>
                <div><strong>{cStats.count}</strong><br/><span style={{fontSize: '11px', color: '#64748b'}}>Documents</span></div>
                <div><strong>{cStats.ca.toLocaleString('fr-FR')} €</strong><br/><span style={{fontSize: '11px', color: '#64748b'}}>CA total</span></div>
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}

// ============================================
// DEVIS PAGE
// ============================================
function DevisPage({ clients, devis, showDevisForm, setShowDevisForm, devisForm, setDevisForm, currentLigne, setCurrentLigne, onAddLigne, onDeleteLigne, onSubmit, calculerTotaux, transformerEnFacture, changerStatut, onDownloadPDF }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const filtered = devis.filter(d => {
    const matchFilter = filter === 'all' || (filter === 'devis' && d.type === 'devis') || (filter === 'factures' && d.type === 'facture') || (filter === 'impayees' && d.type === 'facture' && d.statut !== 'payee');
    const client = clients.find(c => c.id === d.client_id);
    const matchSearch = !search || d.numero.toLowerCase().includes(search.toLowerCase()) || (client && client.nom.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });
  
  if (showDevisForm) {
    const totaux = calculerTotaux(devisForm.lignes);
    return (
      <div style={styles.page}>
        <button onClick={() => { setShowDevisForm(false); setDevisForm({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], validite: 30, notes: '' }); }} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.pageTitle}>Nouveau {devisForm.type}</h1>
        <div style={styles.formCard}>
          <div style={styles.formGrid}>
            <div style={styles.field}><label>Client *</label><select value={devisForm.clientId} onChange={e => setDevisForm(p => ({...p, clientId: e.target.value}))} required style={styles.input}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
            <div style={styles.field}><label>Date</label><input type="date" value={devisForm.date} onChange={e => setDevisForm(p => ({...p, date: e.target.value}))} style={styles.input} /></div>
            <div style={styles.field}><label>Type</label><select value={devisForm.type} onChange={e => setDevisForm(p => ({...p, type: e.target.value}))} style={styles.input}><option value="devis">Devis</option><option value="facture">Facture</option></select></div>
            <div style={styles.field}><label>Validité (jours)</label><input type="number" value={devisForm.validite} onChange={e => setDevisForm(p => ({...p, validite: parseInt(e.target.value) || 30}))} style={styles.input} /></div>
          </div>
          
          <h3 style={{marginTop: '24px'}}>Lignes</h3>
          <div style={styles.ligneForm}>
            <input placeholder="Description" value={currentLigne.description} onChange={e => setCurrentLigne(p => ({...p, description: e.target.value}))} style={{...styles.input, flex: 3}} />
            <input type="number" placeholder="Qté" value={currentLigne.quantite} onChange={e => setCurrentLigne(p => ({...p, quantite: parseFloat(e.target.value) || 1}))} min="1" style={{...styles.input, flex: 1}} />
            <select value={currentLigne.unite} onChange={e => setCurrentLigne(p => ({...p, unite: e.target.value}))} style={{...styles.input, flex: 1}}><option value="unité">unité</option><option value="heure">heure</option><option value="jour">jour</option><option value="m²">m²</option><option value="ml">ml</option><option value="forfait">forfait</option></select>
            <input type="number" placeholder="Prix HT" step="0.01" value={currentLigne.prixUnitaire || ''} onChange={e => setCurrentLigne(p => ({...p, prixUnitaire: parseFloat(e.target.value) || 0}))} style={{...styles.input, flex: 1}} />
            <button onClick={onAddLigne} type="button" style={styles.addBtn}>+</button>
          </div>
          
          {devisForm.lignes.length > 0 && (
            <div style={styles.lignesTable}>
              <div style={styles.lignesHead}><span style={{flex: 3}}>Description</span><span style={{flex: 1, textAlign: 'center'}}>Qté</span><span style={{flex: 1, textAlign: 'right'}}>Prix HT</span><span style={{flex: 1, textAlign: 'right'}}>Total</span><span style={{width: '40px'}}></span></div>
              {devisForm.lignes.map((l, i) => (
                <div key={i} style={styles.ligneRow}><span style={{flex: 3}}>{l.description}</span><span style={{flex: 1, textAlign: 'center'}}>{l.quantite} {l.unite}</span><span style={{flex: 1, textAlign: 'right'}}>{l.prixUnitaire.toFixed(2)} €</span><span style={{flex: 1, textAlign: 'right', fontWeight: '600'}}>{l.montant.toFixed(2)} €</span><button onClick={() => onDeleteLigne(i)} style={styles.delLigneBtn}>×</button></div>
              ))}
              <div style={styles.totaux}>
                <div style={styles.totauxRow}><span>Total HT</span><span>{totaux.totalHT.toFixed(2)} €</span></div>
                <div style={styles.totauxRow}><span>TVA (20%)</span><span>{totaux.tva.toFixed(2)} €</span></div>
                <div style={{...styles.totauxRow, fontWeight: '700', fontSize: '18px', color: '#f97316', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px'}}><span>Total TTC</span><span>{totaux.totalTTC.toFixed(2)} €</span></div>
              </div>
            </div>
          )}
          
          <div style={{...styles.field, marginTop: '20px'}}><label>Notes</label><textarea value={devisForm.notes} onChange={e => setDevisForm(p => ({...p, notes: e.target.value}))} style={{...styles.input, minHeight: '60px'}} /></div>
          <div style={styles.formActions}><button type="button" onClick={() => setShowDevisForm(false)} style={styles.secondaryBtn}>Annuler</button><button onClick={onSubmit} disabled={!devisForm.clientId || devisForm.lignes.length === 0} style={{...styles.primaryBtn, opacity: (!devisForm.clientId || devisForm.lignes.length === 0) ? 0.5 : 1}}>Créer</button></div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}><h1 style={styles.pageTitle}>Devis & Factures</h1><button onClick={() => setShowDevisForm(true)} disabled={clients.length === 0} style={{...styles.primaryBtn, opacity: clients.length === 0 ? 0.5 : 1}}>+ Nouveau</button></div>
      
      {clients.length === 0 ? (
        <div style={styles.emptyCard}><div style={{fontSize: '48px'}}>📄</div><h3>Ajoutez d'abord un client</h3></div>
      ) : (
        <>
          <div style={styles.filterBar}>
            <div style={styles.tabs}>{['all', 'devis', 'factures', 'impayees'].map(f => <button key={f} onClick={() => setFilter(f)} style={{...styles.tab, ...(filter === f ? styles.tabActive : {})}}>{f === 'all' ? 'Tous' : f === 'devis' ? 'Devis' : f === 'factures' ? 'Factures' : 'Impayées'}</button>)}</div>
            <div style={styles.searchBar}><span>🔍</span><input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} /></div>
          </div>
          
          {filtered.length === 0 ? (
            <div style={styles.emptyCard}><div style={{fontSize: '48px'}}>📄</div><h3>Aucun document</h3><button onClick={() => setShowDevisForm(true)} style={styles.primaryBtn}>+ Créer</button></div>
          ) : (
            <div style={styles.devisTable}>
              <div style={styles.devisHead}><span style={{flex: 1}}>Numéro</span><span style={{flex: 2}}>Client</span><span style={{flex: 1}}>Date</span><span style={{flex: 1, textAlign: 'right'}}>Montant</span><span style={{flex: 1, textAlign: 'center'}}>Statut</span><span style={{flex: 1, textAlign: 'center'}}>Actions</span></div>
              {filtered.map(doc => {
                const client = clients.find(c => c.id === doc.client_id);
                return (
                  <div key={doc.id} style={styles.devisRow}>
                    <span style={{flex: 1, fontWeight: '600'}}>{doc.numero}</span>
                    <span style={{flex: 2}}>{client ? `${client.nom} ${client.prenom||''}` : '-'}</span>
                    <span style={{flex: 1}}>{new Date(doc.date).toLocaleDateString('fr-FR')}</span>
                    <span style={{flex: 1, textAlign: 'right', fontWeight: '700'}}>{doc.total_ttc?.toFixed(2)} €</span>
                    <span style={{flex: 1, textAlign: 'center'}}><select value={doc.statut} onChange={e => changerStatut(doc.id, e.target.value)} style={{...styles.statusSelect, background: getStatusColor(doc.statut)}}><option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option><option value="accepte">Accepté</option><option value="refuse">Refusé</option>{doc.type === 'facture' && <option value="payee">Payée</option>}</select></span>
                    <span style={{flex: 1, textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center'}}>
                      <button onClick={() => onDownloadPDF(doc)} style={styles.actionBtn}>📄</button>
                      {doc.type === 'devis' && doc.statut === 'accepte' && <button onClick={() => transformerEnFacture(doc.id)} style={{...styles.actionBtn, background: '#10b981'}}>→💰</button>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// SETTINGS PAGE
// ============================================
function SettingsPage({ user }) {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Paramètres</h1>
      <div style={styles.settingsCard}>
        <h3>👤 Mon compte</h3>
        <div style={styles.settingsRow}><span>Email</span><strong>{String(user?.email || '')}</strong></div>
        <div style={styles.settingsRow}><span>Nom</span><strong>{String(user?.user_metadata?.nom || '-')}</strong></div>
        <div style={styles.settingsRow}><span>Entreprise</span><strong>{String(user?.user_metadata?.entreprise || '-')}</strong></div>
      </div>
      <div style={styles.settingsCard}>
        <h3>💳 Abonnements</h3>
        <div style={styles.pricingGrid}>
          <div style={styles.pricingCard}><h4>Solo</h4><p style={styles.price}>29€<span>/mois</span></p><ul><li>✅ Clients illimités</li><li>✅ Devis & Factures</li><li>✅ Calendrier</li></ul><button style={styles.primaryBtn}>Choisir</button></div>
          <div style={{...styles.pricingCard, borderColor: '#10b981'}}><h4>Pro</h4><p style={styles.price}>59€<span>/mois</span></p><ul><li>✅ Tout du Solo</li><li>✅ Multi-utilisateurs</li><li>✅ Export comptable</li></ul><button style={{...styles.primaryBtn, background: '#10b981'}}>Choisir</button></div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================
function getStatusColor(s) {
  const c = { brouillon: '#94a3b8', envoye: '#3b82f6', envoyee: '#3b82f6', accepte: '#10b981', refuse: '#ef4444', payee: '#10b981', impayee: '#f59e0b' };
  return c[s] || '#94a3b8';
}
function getStatusLabel(s) {
  const l = { brouillon: 'Brouillon', envoye: 'Envoyé', envoyee: 'Envoyée', accepte: 'Accepté', refuse: 'Refusé', payee: 'Payée', impayee: 'Impayée' };
  return l[s] || s;
}

// ============================================
// STYLES
// ============================================
const styles = {
  // Loading & Auth
  loadingScreen: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' },
  loadingLogo: { fontSize: '64px', marginBottom: '20px' },
  loadingText: { fontSize: '18px', opacity: 0.7 },
  
  authScreen: { minHeight: '100vh', display: 'flex', background: '#0f172a' },
  authLeft: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', padding: '60px' },
  authBranding: { maxWidth: '400px', color: '#fff' },
  authLogo: { width: '80px', height: '80px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '30px' },
  authBrandName: { fontSize: '42px', fontWeight: '800', margin: '0 0 16px' },
  authTagline: { fontSize: '20px', opacity: 0.9, marginBottom: '40px', lineHeight: 1.5 },
  authFeatures: { display: 'flex', flexDirection: 'column', gap: '16px' },
  authFeature: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px' },
  authRight: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' },
  authBox: { width: '100%', maxWidth: '400px' },
  authTitle: { fontSize: '32px', fontWeight: '700', color: '#fff', margin: '0 0 8px' },
  authSubtitle: { color: '#94a3b8', marginBottom: '32px' },
  authForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  authError: { color: '#ef4444', fontSize: '14px', textAlign: 'center' },
  authButton: { padding: '16px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  authSwitch: { textAlign: 'center', color: '#94a3b8', marginTop: '24px' },
  authSwitchBtn: { background: 'none', border: 'none', color: '#f97316', fontWeight: '600', cursor: 'pointer', marginLeft: '8px' },
  inputRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  
  // App Layout
  app: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  sidebar: { width: '260px', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', borderBottom: '1px solid #1e293b' },
  sidebarLogo: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  sidebarTitle: { fontSize: '18px', fontWeight: '700', margin: 0 },
  sidebarSubtitle: { fontSize: '11px', color: '#64748b', margin: 0, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '500', cursor: 'pointer', textAlign: 'left' },
  navItemActive: { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff' },
  navIcon: { fontSize: '18px' },
  navBadge: { background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '8px', marginLeft: 'auto' },
  sidebarFooter: { padding: '16px', borderTop: '1px solid #1e293b' },
  logoutBtn: { width: '100%', padding: '10px', background: '#1e293b', border: 'none', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  
  main: { flex: 1, marginLeft: '260px', minHeight: '100vh' },
  page: { padding: '28px 36px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  pageTitle: { fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 },
  pageSubtitle: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  
  // Buttons
  primaryBtn: { padding: '12px 20px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  secondaryBtn: { padding: '12px 20px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  smallBtn: { padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' },
  iconBtn: { padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  iconBtnDanger: { padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  deleteBtn: { padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  link: { background: 'none', border: 'none', color: '#f97316', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
  
  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' },
  statCard: { background: '#fff', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  statIcon: { fontSize: '28px' },
  statLabel: { fontSize: '13px', opacity: 0.8, margin: '0 0 4px' },
  statValue: { fontSize: '24px', fontWeight: '700', margin: '0 0 4px' },
  statSub: { fontSize: '12px', opacity: 0.7, margin: 0 },
  
  // Dashboard
  dashGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  card: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  empty: { textAlign: 'center', padding: '20px', color: '#64748b' },
  emptyCard: { background: '#fff', borderRadius: '12px', padding: '60px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  eventList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  eventRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  eventTime: { fontWeight: '600', color: '#64748b', width: '45px' },
  docList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' },
  badge: { padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', color: '#fff' },
  quickActions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'left' },
  
  // Forms
  formCard: { background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  input: { padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', width: '100%' },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' },
  
  // Devis Form
  ligneForm: { display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' },
  addBtn: { padding: '12px 18px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' },
  lignesTable: { border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' },
  lignesHead: { display: 'flex', padding: '12px 14px', background: '#f8fafc', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  ligneRow: { display: 'flex', alignItems: 'center', padding: '12px 14px', borderTop: '1px solid #e2e8f0', fontSize: '13px' },
  delLigneBtn: { width: '28px', height: '28px', background: '#fee2e2', border: 'none', borderRadius: '6px', color: '#ef4444', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  totaux: { background: '#f8fafc', padding: '14px 16px' },
  totauxRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#64748b' },
  
  // Calendar
  calLayout: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  calCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  calNav: { width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  weekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' },
  weekday: { textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#64748b', padding: '8px' },
  daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  dayEmpty: { aspectRatio: '1', background: 'transparent' },
  day: { aspectRatio: '1', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: '500', position: 'relative' },
  dayToday: { background: '#fff7ed', borderColor: '#f97316' },
  daySelected: { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', borderColor: '#f97316' },
  dayDots: { display: 'flex', gap: '2px', marginTop: '4px' },
  dayDot: { width: '4px', height: '4px', borderRadius: '50%' },
  calSidebar: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  eventCard: { background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '12px' },
  
  // Clients
  searchBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px' },
  searchInput: { flex: 1, border: 'none', background: 'transparent', fontSize: '14px', outline: 'none' },
  clientsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  clientCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  clientHead: { display: 'flex', justifyContent: 'space-between', marginBottom: '14px' },
  avatar: { width: '44px', height: '44px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: '700' },
  clientStats: { display: 'flex', justifyContent: 'space-around', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' },
  
  // Devis List
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' },
  tabs: { display: 'flex', gap: '8px' },
  tab: { padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#64748b' },
  tabActive: { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff' },
  devisTable: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  devisHead: { display: 'flex', padding: '14px 16px', background: '#f8fafc', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  devisRow: { display: 'flex', alignItems: 'center', padding: '14px 16px', borderTop: '1px solid #e2e8f0', fontSize: '13px' },
  statusSelect: { padding: '6px 10px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#fff', cursor: 'pointer' },
  actionBtn: { width: '32px', height: '32px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
  
  // Settings
  settingsCard: { background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  settingsRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  pricingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' },
  pricingCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  price: { fontSize: '36px', fontWeight: '700', color: '#f97316', margin: '12px 0 20px' },
};
