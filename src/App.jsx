import React, { useState, useEffect, memo } from 'react';
import { auth, clientsDB, devisDB } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  
  // AUTH STATE
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '', prenom: '' });
  const [authError, setAuthError] = useState('');
  
  // CLIENT FORM STATE
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({ 
    nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' 
  });
  
  // DEVIS FORM STATE
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisForm, setDevisForm] = useState({ 
    clientId: '', 
    date: new Date().toISOString().split('T')[0], 
    type: 'devis', 
    lignes: [] 
  });
  const [currentLigne, setCurrentLigne] = useState({ 
    description: '', quantite: 1, prixUnitaire: 0 
  });
  
  // CHECK AUTH ON MOUNT
  // CHECK AUTH ON MOUNT
  useEffect(() => {
    let mounted = true;
    
    auth.getCurrentUser().then(currentUser => {
      if (mounted) {
        setUser(currentUser);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    
    const result = auth.onAuthStateChange((event, session) => {
      if (mounted && event !== 'INITIAL_SESSION') {
        setUser(session?.user ?? null);
      }
    });
    
    return () => {
      mounted = false;
      result?.data?.subscription?.unsubscribe();
    };
  }, []);
  
  // LOAD DATA WHEN USER LOGGED IN
  useEffect(() => {
    if (user) {
      loadClients();
      loadDevis();
    }
  }, [user]);
  
  // LOAD FUNCTIONS
  const loadClients = async () => {
    const { data, error } = await clientsDB.getAll();
    if (!error && data) setClients(data);
  };
  
  const loadDevis = async () => {
    const { data, error } = await devisDB.getAll();
    if (!error && data) setDevis(data);
  };
  
  // AUTH HANDLERS
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await auth.signUp(
      authForm.email, 
      authForm.password,
      { nom: authForm.nom, prenom: authForm.prenom }
    );
    if (error) {
      setAuthError(error.message);
    } else {
      alert('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
    }
  };
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await auth.signIn(authForm.email, authForm.password);
    if (error) {
      setAuthError(error.message);
    }
  };
  
  const handleSignOut = async () => {
    await auth.signOut();
    setClients([]);
    setDevis([]);
  };
  
  // CLIENT HANDLERS
  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (editingClient) {
      const { error } = await clientsDB.update(editingClient.id, clientForm);
      if (!error) loadClients();
    } else {
      const { error } = await clientsDB.create(clientForm);
      if (!error) loadClients();
    }
    setClientForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
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
      const { error } = await clientsDB.delete(id);
      if (!error) loadClients();
    }
  };
  
  const handleCancelClientForm = () => {
    setShowClientForm(false);
    setClientForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
    setEditingClient(null);
  };
  
  // DEVIS HANDLERS
  const ajouterLigne = () => {
    if (!currentLigne.description || currentLigne.prixUnitaire <= 0) {
      alert('Remplissez la description et le prix');
      return;
    }
    const montant = currentLigne.quantite * currentLigne.prixUnitaire;
    setDevisForm(prev => ({ 
      ...prev, 
      lignes: [...prev.lignes, { ...currentLigne, montant }] 
    }));
    setCurrentLigne({ description: '', quantite: 1, prixUnitaire: 0 });
  };
  
  const supprimerLigne = (index) => {
    setDevisForm(prev => ({ 
      ...prev, 
      lignes: prev.lignes.filter((_, i) => i !== index) 
    }));
  };
  
  const calculerTotaux = (lignes) => {
    const totalHT = lignes.reduce((sum, l) => sum + l.montant, 0);
    const tva = totalHT * 0.2;
    const totalTTC = totalHT + tva;
    return { totalHT, tva, totalTTC };
  };
  
  const handleDevisSubmit = async () => {
    if (!devisForm.clientId || devisForm.lignes.length === 0) {
      alert('Sélectionnez un client et ajoutez au moins une ligne');
      return;
    }
    const totaux = calculerTotaux(devisForm.lignes);
    const numero = `${devisForm.type === 'devis' ? 'DEV' : 'FACT'}-${new Date().getFullYear()}-${String(devis.length + 1).padStart(3, '0')}`;
    
    const nouveauDevis = {
      client_id: devisForm.clientId,
      numero,
      date: devisForm.date,
      type: devisForm.type,
      statut: 'brouillon',
      lignes: devisForm.lignes,
      total_ht: totaux.totalHT,
      tva: totaux.tva,
      total_ttc: totaux.totalTTC
    };
    
    const { error } = await devisDB.create(nouveauDevis);
    if (!error) {
      loadDevis();
      setDevisForm({ 
        clientId: '', 
        date: new Date().toISOString().split('T')[0], 
        type: 'devis', 
        lignes: [] 
      });
      setShowDevisForm(false);
    }
  };
  
  const transformerEnFacture = async (devisId) => {
    const d = devis.find(x => x.id === devisId);
    if (!d) return;
    
    const numero = `FACT-${new Date().getFullYear()}-${String(devis.filter(x => x.type === 'facture').length + 1).padStart(3, '0')}`;
    const facture = {
      client_id: d.client_id,
      numero,
      date: new Date().toISOString().split('T')[0],
      type: 'facture',
      statut: 'impayee',
      lignes: d.lignes,
      total_ht: d.total_ht,
      tva: d.tva,
      total_ttc: d.total_ttc
    };
    
    await devisDB.create(facture);
    await devisDB.update(devisId, { statut: 'accepte' });
    loadDevis();
  };
  
  const changerStatut = async (id, nouveauStatut) => {
    await devisDB.update(id, { statut: nouveauStatut });
    loadDevis();
  };
  
  const handleDownloadPDF = async (devisItem) => {
    const client = clients.find(c => c.id === devisItem.client_id);
    if (!client) {
      alert('Client introuvable');
      return;
    }
    
    // Entreprise par défaut (à remplacer par vraies données utilisateur)
    const entreprise = {
      nom: user?.user_metadata?.nom || 'Mon Entreprise BTP',
      adresse: '123 rue de la Construction, 75000 Paris',
      siret: '123 456 789 00010',
      email: user?.email || 'contact@entreprise.fr',
      telephone: '01 23 45 67 89',
      tva_percent: 20
    };
    
    try {
      const { downloadDevisPDF } = await import('./components/DevisPDF');
      await downloadDevisPDF(devisItem, client, entreprise);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };
  
  // RENDER AUTH SCREEN
  if (loading) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <div style={styles.authHeader}>
            <div style={styles.logo}>🏗️</div>
            <h1 style={styles.authTitle}>ChantierPro</h1>
            <p style={styles.authSubtitle}>
              {showSignUp ? 'Créer un compte' : 'Connectez-vous à votre espace'}
            </p>
          </div>
          
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn}>
            {showSignUp && (
              <>
                <input
                  type="text"
                  placeholder="Nom"
                  value={authForm.nom}
                  onChange={(e) => setAuthForm(prev => ({...prev, nom: e.target.value}))}
                  required
                  style={styles.authInput}
                />
                <input
                  type="text"
                  placeholder="Prénom"
                  value={authForm.prenom}
                  onChange={(e) => setAuthForm(prev => ({...prev, prenom: e.target.value}))}
                  style={styles.authInput}
                />
              </>
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm(prev => ({...prev, email: e.target.value}))}
              required
              style={styles.authInput}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={authForm.password}
              onChange={(e) => setAuthForm(prev => ({...prev, password: e.target.value}))}
              required
              style={styles.authInput}
            />
            
            {authError && <p style={styles.authError}>{authError}</p>}
            
            <button type="submit" style={styles.authButton}>
              {showSignUp ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
          
          <p style={styles.authToggle}>
            {showSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
            <button 
              onClick={() => setShowSignUp(!showSignUp)}
              style={styles.authToggleButton}
            >
              {showSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    );
  }
  
  // RENDER MAIN APP
  return (
    <div style={styles.app}>
      <Header user={user} onLogout={handleSignOut} />
      <div style={styles.layout}>
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main style={styles.main}>
          {currentPage === 'dashboard' && (
            <DashboardPage clients={clients} devis={devis} />
          )}
          {currentPage === 'clients' && (
            <ClientsPage 
              clients={clients}
              showClientForm={showClientForm}
              setShowClientForm={setShowClientForm}
              clientForm={clientForm}
              setClientForm={setClientForm}
              editingClient={editingClient}
              onSubmit={handleClientSubmit}
              onCancel={handleCancelClientForm}
              onEdit={handleClientEdit}
              onDelete={handleClientDelete}
            />
          )}
          {currentPage === 'devis' && (
            <DevisPage 
              clients={clients}
              devis={devis}
              showDevisForm={showDevisForm}
              setShowDevisForm={setShowDevisForm}
              devisForm={devisForm}
              setDevisForm={setDevisForm}
              currentLigne={currentLigne}
              setCurrentLigne={setCurrentLigne}
              onAddLigne={ajouterLigne}
              onDeleteLigne={supprimerLigne}
              onSubmit={handleDevisSubmit}
              calculerTotaux={calculerTotaux}
              transformerEnFacture={transformerEnFacture}
              changerStatut={changerStatut}
              onDownloadPDF={handleDownloadPDF}
            />
          )}
          {currentPage === 'settings' && <SettingsPage user={user} />}
        </main>
      </div>
    </div>
  );
}

// COMPONENTS
function Header({ user, onLogout }) {
  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.headerLeft}>
          <div style={styles.headerLogo}>🏗️</div>
          <div>
            <h1 style={styles.headerTitle}>ChantierPro</h1>
            <p style={styles.headerSubtitle}>
              {user?.user_metadata?.nom || user?.email}
            </p>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}

function Sidebar({ currentPage, setCurrentPage }) {
  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures' },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' }
  ];
  
  return (
    <aside style={styles.sidebar}>
      <nav>
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={{
              ...styles.navButton,
              ...(currentPage === item.id ? styles.navButtonActive : {})
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DashboardPage({ clients, devis }) {
  const stats = {
    devisEnCours: devis.filter(d => d.statut === 'envoye').length,
    caEnAttente: devis.filter(d => d.statut === 'envoye')
      .reduce((s, d) => s + (d.total_ttc || 0), 0),
    caMois: devis.filter(d => 
      d.type === 'facture' && 
      new Date(d.date).getMonth() === new Date().getMonth()
    ).reduce((s, d) => s + (d.total_ttc || 0), 0),
    nbClients: clients.length,
    nbDocs: devis.length
  };
  
  return (
    <div>
      <h2 style={styles.pageTitle}>Tableau de bord</h2>
      <div style={styles.statsGrid}>
        <StatCard 
          icon="⏱️" 
          label="Devis en cours" 
          value={stats.devisEnCours}
          subtext={`${stats.caEnAttente.toFixed(0)}€ en attente`}
          color="#3b82f6"
        />
        <StatCard 
          icon="💰" 
          label="CA du mois" 
          value={`${stats.caMois.toFixed(0)}€`}
          subtext="+12% vs mois dernier"
          color="#10b981"
        />
        <StatCard 
          icon="👥" 
          label="Clients" 
          value={stats.nbClients}
          subtext="clients actifs"
          color="#8b5cf6"
        />
        <StatCard 
          icon="📄" 
          label="Documents" 
          value={stats.nbDocs}
          subtext="devis & factures"
          color="#f97316"
        />
      </div>
      <div style={styles.successBanner}>
        <h3 style={styles.successTitle}>🎉 Application Connectée !</h3>
        <p style={styles.successText}>
          Vos données sont synchronisées et sécurisées
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
      <p style={{ ...styles.statSubtext, color }}>{subtext}</p>
    </div>
  );
}

const ClientFormMemo = memo(({ 
  clientForm, 
  setClientForm, 
  onSubmit, 
  onCancel, 
  editingClient 
}) => {
  const handleChange = (field) => (e) => {
    setClientForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div style={formStyles.container}>
      <form onSubmit={onSubmit}>
        <div style={formStyles.formRow}>
          <div>
            <label style={formStyles.label}>Nom *</label>
            <input
              type="text"
              value={clientForm.nom}
              onChange={handleChange('nom')}
              required
              style={formStyles.input}
              autoComplete="off"
            />
          </div>
          <div>
            <label style={formStyles.label}>Prénom</label>
            <input
              type="text"
              value={clientForm.prenom}
              onChange={handleChange('prenom')}
              style={formStyles.input}
              autoComplete="off"
            />
          </div>
        </div>

        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Entreprise</label>
          <input
            type="text"
            value={clientForm.entreprise}
            onChange={handleChange('entreprise')}
            style={formStyles.input}
            autoComplete="off"
          />
        </div>

        <div style={formStyles.formRow}>
          <div>
            <label style={formStyles.label}>Email *</label>
            <input
              type="email"
              value={clientForm.email}
              onChange={handleChange('email')}
              required
              style={formStyles.input}
              autoComplete="off"
            />
          </div>
          <div>
            <label style={formStyles.label}>Téléphone *</label>
            <input
              type="tel"
              value={clientForm.telephone}
              onChange={handleChange('telephone')}
              required
              style={formStyles.input}
              autoComplete="off"
            />
          </div>
        </div>

        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Adresse *</label>
          <textarea
            value={clientForm.adresse}
            onChange={handleChange('adresse')}
            required
            rows={3}
            style={formStyles.textarea}
          />
        </div>

        <div style={formStyles.buttonRow}>
          <button type="button" onClick={onCancel} style={formStyles.cancelButton}>
            Annuler
          </button>
          <button type="submit" style={formStyles.submitButton}>
            {editingClient ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
});

ClientFormMemo.displayName = 'ClientFormMemo';

function ClientsPage({ clients, showClientForm, setShowClientForm, clientForm, setClientForm, editingClient, onSubmit, onCancel, onEdit, onDelete }) {
  if (showClientForm) {
    return (
      <div>
        <button onClick={onCancel} style={styles.backButton}>← Retour</button>
        <h2 style={styles.pageTitle}>{editingClient ? 'Modifier' : 'Nouveau'} client</h2>
        <ClientFormMemo
          clientForm={clientForm}
          setClientForm={setClientForm}
          onSubmit={onSubmit}
          onCancel={onCancel}
          editingClient={editingClient}
        />
      </div>
    );
  }
  
  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Clients</h2>
        <button onClick={() => setShowClientForm(true)} style={styles.primaryButton}>
          + Nouveau
        </button>
      </div>
      {clients.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucun client"
          buttonText="Ajouter un client"
          onButtonClick={() => setShowClientForm(true)}
        />
      ) : (
        <div style={styles.clientsGrid}>
          {clients.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, onEdit, onDelete }) {
  return (
    <div style={styles.clientCard}>
      <div style={styles.clientHeader}>
        <div style={styles.clientAvatar}>
          {client.nom[0]}{client.prenom?.[0] || ''}
        </div>
        <div style={styles.clientActions}>
          <button onClick={onEdit} style={styles.iconButton}>✏️</button>
          <button onClick={onDelete} style={styles.deleteIconButton}>🗑️</button>
        </div>
      </div>
      <h3 style={styles.clientName}>{client.nom} {client.prenom}</h3>
      {client.entreprise && <p style={styles.clientCompany}>{client.entreprise}</p>}
      <div style={styles.clientInfo}>
        <p>📧 {client.email}</p>
        <p>📱 {client.telephone}</p>
      </div>
    </div>
  );
}

function DevisPage({ clients, devis, showDevisForm, setShowDevisForm, devisForm, setDevisForm, currentLigne, setCurrentLigne, onAddLigne, onDeleteLigne, onSubmit, calculerTotaux, transformerEnFacture, changerStatut, onDownloadPDF }) {
  if (showDevisForm) {
    const totaux = calculerTotaux(devisForm.lignes);
    const canSubmit = devisForm.clientId && devisForm.lignes.length > 0;

    return (
      <div>
        <button onClick={() => { setShowDevisForm(false); setDevisForm({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] }); }} style={styles.backButton}>← Retour</button>
        <h2 style={styles.pageTitle}>Nouveau devis</h2>
        <div style={formStyles.container}>
          <div style={formStyles.formRow}>
            <div style={formStyles.formGroup}>
              <label style={formStyles.label}>Client *</label>
              <select value={devisForm.clientId} onChange={(e) => setDevisForm(prev => ({...prev, clientId: e.target.value}))} required style={formStyles.input}>
                <option value="">Sélectionner...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
            </div>
            <div style={formStyles.formGroup}>
              <label style={formStyles.label}>Date</label>
              <input type="date" value={devisForm.date} onChange={(e) => setDevisForm(prev => ({...prev, date: e.target.value}))} style={formStyles.input} />
            </div>
          </div>

          <h3 style={formStyles.sectionTitle}>Lignes du devis</h3>
          <div style={formStyles.ligneForm}>
            <input placeholder="Description" value={currentLigne.description} onChange={(e) => setCurrentLigne(prev => ({...prev, description: e.target.value}))} style={formStyles.input} />
            <input type="number" placeholder="Qté" value={currentLigne.quantite} onChange={(e) => setCurrentLigne(prev => ({...prev, quantite: parseFloat(e.target.value) || 1}))} min="1" style={formStyles.input} />
            <input type="number" placeholder="Prix HT" step="0.01" value={currentLigne.prixUnitaire} onChange={(e) => setCurrentLigne(prev => ({...prev, prixUnitaire: parseFloat(e.target.value) || 0}))} min="0" style={formStyles.input} />
            <button onClick={onAddLigne} type="button" style={formStyles.addButton}>+</button>
          </div>

          {devisForm.lignes.length > 0 && (
            <div>
              <table style={formStyles.table}>
                <thead style={formStyles.tableHead}>
                  <tr>
                    <th style={formStyles.th}>Description</th>
                    <th style={{...formStyles.th, textAlign: 'right'}}>Qté</th>
                    <th style={{...formStyles.th, textAlign: 'right'}}>Prix HT</th>
                    <th style={{...formStyles.th, textAlign: 'right'}}>Total</th>
                    <th style={{...formStyles.th, width: '50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {devisForm.lignes.map((ligne, index) => (
                    <tr key={index}>
                      <td style={formStyles.td}>{ligne.description}</td>
                      <td style={{...formStyles.td, textAlign: 'right'}}>{ligne.quantite}</td>
                      <td style={{...formStyles.td, textAlign: 'right'}}>{ligne.prixUnitaire.toFixed(2)}€</td>
                      <td style={{...formStyles.td, textAlign: 'right', fontWeight: '600'}}>{ligne.montant.toFixed(2)}€</td>
                      <td style={{...formStyles.td, textAlign: 'center'}}>
                        <button onClick={() => onDeleteLigne(index)} type="button" style={formStyles.deleteButton}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={formStyles.totaux}>
                <div>Total HT: <strong>{totaux.totalHT.toFixed(2)}€</strong></div>
                <div>TVA (20%): <strong>{totaux.tva.toFixed(2)}€</strong></div>
                <div style={formStyles.totalTTC}>Total TTC: <strong>{totaux.totalTTC.toFixed(2)}€</strong></div>
              </div>
            </div>
          )}

          <button onClick={onSubmit} disabled={!canSubmit} style={canSubmit ? formStyles.submitButton : formStyles.submitButtonDisabled}>Créer le devis</button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Devis & Factures</h2>
        <button onClick={() => setShowDevisForm(true)} disabled={clients.length === 0} style={{...styles.primaryButton, opacity: clients.length === 0 ? 0.5 : 1, cursor: clients.length === 0 ? 'not-allowed' : 'pointer'}}>+ Nouveau devis</button>
      </div>
      
      {devis.length === 0 ? (
        <EmptyState icon="📄" title="Aucun devis" text={clients.length === 0 ? "Ajoutez d'abord un client" : "Créez votre premier devis"} buttonText={clients.length > 0 ? "Créer un devis" : null} onButtonClick={clients.length > 0 ? () => setShowDevisForm(true) : null} />
      ) : (
        <DevisList devis={devis} clients={clients} transformerEnFacture={transformerEnFacture} changerStatut={changerStatut} onDownloadPDF={onDownloadPDF} />
      )}
    </div>
  );
}

function DevisList({ devis, clients, transformerEnFacture, changerStatut, onDownloadPDF }) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead style={styles.tableHead}>
          <tr>
            <th style={styles.th}>Numéro</th>
            <th style={styles.th}>Client</th>
            <th style={styles.th}>Date</th>
            <th style={{...styles.th, textAlign: 'right'}}>Montant TTC</th>
            <th style={styles.th}>Statut</th>
            <th style={{...styles.th, textAlign: 'center'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devis.map(d => {
            const client = clients.find(c => c.id === d.client_id);
            return (
              <tr key={d.id} style={styles.tr}>
                <td style={{...styles.td, fontWeight: '600'}}>{d.numero}</td>
                <td style={styles.td}>{client ? `${client.nom} ${client.prenom}` : 'Client inconnu'}</td>
                <td style={styles.td}>{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: '700', fontSize: '16px'}}>{d.total_ttc.toFixed(2)}€</td>
                <td style={styles.td}>
                  <select value={d.statut} onChange={(e) => changerStatut(d.id, e.target.value)} style={styles.statutSelect}>
                    <option value="brouillon">Brouillon</option>
                    <option value="envoye">Envoyé</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                    {d.type === 'facture' && <option value="paye">Payé</option>}
                  </select>
                </td>
                <td style={{...styles.td, textAlign: 'center'}}>
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                    <button onClick={() => onDownloadPDF(d)} style={styles.pdfButton} title="Télécharger PDF">📄 PDF</button>
                    {d.type === 'devis' && d.statut === 'accepte' && (
                      <button onClick={() => transformerEnFacture(d.id)} style={styles.factureButton}>→ Facture</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPage({ user }) {
  const stripeLinks = {
    solo: import.meta.env.VITE_STRIPE_SOLO_LINK || '#',
    pro: import.meta.env.VITE_STRIPE_PRO_LINK || '#'
  };

  return (
    <div>
      <h2 style={styles.pageTitle}>Paramètres</h2>
      
      <div style={formStyles.container}>
        <h3 style={formStyles.sectionTitle}>Mon Compte</h3>
        <p style={{color: '#666', marginBottom: '20px'}}>
          Email: <strong>{user?.email}</strong>
        </p>
      </div>

      <div style={{...formStyles.container, marginTop: '20px'}}>
        <h3 style={formStyles.sectionTitle}>💳 Abonnements</h3>
        <p style={{color: '#666', marginBottom: '20px'}}>
          Passez à un plan payant pour débloquer toutes les fonctionnalités
        </p>
        
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
          <div style={styles.pricingCard}>
            <h4 style={styles.pricingTitle}>Plan Solo</h4>
            <p style={styles.pricingPrice}>29€<span style={styles.pricingPeriod}>/mois</span></p>
            <ul style={styles.pricingFeatures}>
              <li>✅ Clients illimités</li>
              <li>✅ Devis & Factures illimités</li>
              <li>✅ Génération PDF</li>
              <li>✅ Support email</li>
            </ul>
            <button 
              onClick={() => window.open(stripeLinks.solo, '_blank')}
              style={styles.pricingButton}
            >
              S'abonner
            </button>
          </div>

          <div style={styles.pricingCard}>
            <h4 style={styles.pricingTitle}>Plan Pro</h4>
            <p style={styles.pricingPrice}>59€<span style={styles.pricingPeriod}>/mois</span></p>
            <ul style={styles.pricingFeatures}>
              <li>✅ Tout du plan Solo</li>
              <li>✅ Gestion multi-utilisateurs</li>
              <li>✅ Statistiques avancées</li>
              <li>✅ Support prioritaire</li>
            </ul>
            <button 
              onClick={() => window.open(stripeLinks.pro, '_blank')}
              style={{...styles.pricingButton, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}
            >
              S'abonner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text, buttonText, onButtonClick }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>
      <h3 style={styles.emptyTitle}>{title}</h3>
      {text && <p style={styles.emptyText}>{text}</p>}
      {buttonText && onButtonClick && <button onClick={onButtonClick} style={styles.primaryButton}>{buttonText}</button>}
    </div>
  );
}

// STYLES (suite dans le prochain message car trop long)
const styles = {
  authContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff5f0 0%, #fff 50%, #fef0f5 100%)', padding: '20px' },
  authBox: { background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%' },
  authHeader: { textAlign: 'center', marginBottom: '30px' },
  logo: { width: '80px', height: '80px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '16px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' },
  authTitle: { fontSize: '32px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0' },
  authSubtitle: { color: '#666', margin: 0 },
  authInput: { width: '100%', padding: '14px', marginBottom: '15px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' },
  authError: { color: '#dc2626', fontSize: '14px', marginBottom: '15px', textAlign: 'center' },
  authButton: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
  authToggle: { textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '14px' },
  authToggleButton: { background: 'none', border: 'none', color: '#f97316', fontWeight: '600', cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' },
  app: { minHeight: '100vh', background: '#f9fafb' },
  header: { background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 },
  headerContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerLogo: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  headerTitle: { fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111' },
  headerSubtitle: { fontSize: '12px', color: '#666', margin: 0 },
  logoutButton: { padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
  layout: { display: 'flex' },
  sidebar: { width: '250px', background: '#fff', borderRight: '1px solid #e5e7eb', minHeight: 'calc(100vh - 81px)', padding: '20px' },
  navButton: { width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', marginBottom: '8px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '500', color: '#374151', textAlign: 'left' },
  navButtonActive: { background: '#fff7ed', color: '#f97316', fontWeight: '600' },
  navIcon: { fontSize: '20px' },
  main: { flex: 1, padding: '40px', maxWidth: '1400px' },
  pageTitle: { fontSize: '28px', fontWeight: 'bold', margin: '0 0 30px 0', color: '#111' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  primaryButton: { padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' },
  backButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' },
  statCard: { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statIcon: { fontSize: '32px', marginBottom: '8px' },
  statLabel: { fontSize: '14px', color: '#666', margin: '0 0 8px 0' },
  statValue: { fontSize: '36px', fontWeight: 'bold', margin: '8px 0', color: '#111' },
  statSubtext: { fontSize: '14px', fontWeight: '500', margin: 0 },
  successBanner: { background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '40px', borderRadius: '16px', color: '#fff', textAlign: 'center' },
  successTitle: { fontSize: '28px', fontWeight: 'bold', margin: '0 0 16px 0' },
  successText: { fontSize: '18px', opacity: 0.95, margin: 0 },
  clientsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  clientCard: { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' },
  clientHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  clientAvatar: { width: '50px', height: '50px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold' },
  clientActions: { display: 'flex', gap: '8px' },
  iconButton: { padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  deleteIconButton: { padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  clientName: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#111' },
  clientCompany: { color: '#666', fontSize: '14px', margin: '0 0 12px 0' },
  clientInfo: { fontSize: '14px', color: '#666' },
  tableContainer: { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  th: { padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '16px' },
  statutSelect: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: '500', background: '#f3f4f6', color: '#374151' },
  pdfButton: { padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  factureButton: { padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  emptyState: { background: '#fff', padding: '60px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' },
  emptyIcon: { fontSize: '64px', marginBottom: '20px' },
  emptyTitle: { fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#111' },
  emptyText: { color: '#666', margin: '0 0 20px 0' },
  pricingCard: { background: '#fff', padding: '30px', borderRadius: '12px', border: '2px solid #e5e7eb' },
  pricingTitle: { fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#111' },
  pricingPrice: { fontSize: '48px', fontWeight: 'bold', color: '#f97316', marginBottom: '20px' },
  pricingPeriod: { fontSize: '18px', color: '#666' },
  pricingFeatures: { listStyle: 'none', padding: 0, marginBottom: '20px', fontSize: '14px', color: '#666' },
  pricingButton: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' }
};

const formStyles = {
  container: { background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '1000px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' },
  input: { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', resize: 'vertical', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  buttonRow: { display: 'flex', gap: '12px' },
  cancelButton: { flex: 1, padding: '14px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' },
  submitButton: { flex: 1, padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' },
  submitButtonDisabled: { flex: 1, padding: '14px', background: '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontSize: '16px', fontWeight: '600' },
  sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' },
  ligneForm: { background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' },
  addButton: { padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '18px' },
  table: { width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' },
  tableHead: { background: '#f9fafb' },
  th: { padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' },
  td: { padding: '12px', borderTop: '1px solid #e5e7eb' },
  deleteButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' },
  totaux: { background: '#f9fafb', padding: '20px', borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '16px' },
  totalTTC: { fontSize: '20px', color: '#f97316', fontWeight: 'bold' }
};