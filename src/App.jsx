import React, { useState, useEffect } from 'react';
import ClientForm from './ClientForm';
import DevisForm from './DevisForm';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  
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
  
  // LOAD FROM LOCALSTORAGE
  useEffect(() => {
    const savedClients = localStorage.getItem('cp_clients');
    const savedDevis = localStorage.getItem('cp_devis');
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedDevis) setDevis(JSON.parse(savedDevis));
  }, []);
  
  // SAVE TO LOCALSTORAGE
  useEffect(() => { 
    if (isAuth && clients.length >= 0) localStorage.setItem('cp_clients', JSON.stringify(clients)); 
  }, [clients, isAuth]);
  
  useEffect(() => { 
    if (isAuth && devis.length >= 0) localStorage.setItem('cp_devis', JSON.stringify(devis)); 
  }, [devis, isAuth]);
  
  // CLIENT HANDLERS
  const handleClientSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      setClients(clients.map(c => 
        c.id === editingClient.id ? { ...clientForm, id: c.id } : c
      ));
    } else {
      setClients([...clients, { ...clientForm, id: Date.now() }]);
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
  
  const handleClientDelete = (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      setClients(clients.filter(c => c.id !== id));
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
  
  const handleDevisSubmit = () => {
    if (!devisForm.clientId || devisForm.lignes.length === 0) {
      alert('Sélectionnez un client et ajoutez au moins une ligne');
      return;
    }
    const totaux = calculerTotaux(devisForm.lignes);
    const numero = `${devisForm.type === 'devis' ? 'DEV' : 'FACT'}-${new Date().getFullYear()}-${String(devis.length + 1).padStart(3, '0')}`;
    const nouveauDevis = {
      id: Date.now(),
      numero,
      ...devisForm,
      ...totaux,
      statut: 'brouillon',
      createdAt: new Date().toISOString()
    };
    setDevis([...devis, nouveauDevis]);
    setDevisForm({ 
      clientId: '', 
      date: new Date().toISOString().split('T')[0], 
      type: 'devis', 
      lignes: [] 
    });
    setShowDevisForm(false);
  };
  
  const transformerEnFacture = (devisId) => {
    const d = devis.find(x => x.id === devisId);
    if (!d) return;
    const numero = `FACT-${new Date().getFullYear()}-${String(devis.filter(x => x.type === 'facture').length + 1).padStart(3, '0')}`;
    const facture = { 
      ...d, 
      id: Date.now(), 
      numero, 
      type: 'facture', 
      statut: 'impayee', 
      createdAt: new Date().toISOString() 
    };
    setDevis(prev => [...prev, facture].map(x => 
      x.id === devisId ? { ...x, statut: 'accepte' } : x
    ));
  };
  
  const changerStatut = (id, nouveauStatut) => {
    setDevis(devis.map(d => d.id === id ? { ...d, statut: nouveauStatut } : d));
  };
  
  // RENDER AUTH SCREEN
  if (!isAuth) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <div style={styles.authHeader}>
            <div style={styles.logo}>🏗️</div>
            <h1 style={styles.authTitle}>ChantierPro</h1>
            <p style={styles.authSubtitle}>Accédez à votre espace</p>
          </div>
          <button onClick={() => setIsAuth(true)} style={styles.authButton}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }
  
  // RENDER MAIN APP
  return (
    <div style={styles.app}>
      <Header onLogout={() => setIsAuth(false)} />
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
            />
          )}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

// HEADER COMPONENT
function Header({ onLogout }) {
  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.headerLeft}>
          <div style={styles.headerLogo}>🏗️</div>
          <div>
            <h1 style={styles.headerTitle}>ChantierPro</h1>
            <p style={styles.headerSubtitle}>Mon Entreprise BTP</p>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}

// SIDEBAR COMPONENT
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

// DASHBOARD PAGE
function DashboardPage({ clients, devis }) {
  const stats = {
    devisEnCours: devis.filter(d => d.statut === 'envoye').length,
    caEnAttente: devis.filter(d => d.statut === 'envoye')
      .reduce((s, d) => s + (d.totalTTC || 0), 0),
    caMois: devis.filter(d => 
      d.type === 'facture' && 
      new Date(d.date).getMonth() === new Date().getMonth()
    ).reduce((s, d) => s + (d.totalTTC || 0), 0),
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
        <h3 style={styles.successTitle}>🎉 Application Fonctionnelle !</h3>
        <p style={styles.successText}>
          Gérez vos clients, créez des devis et suivez vos factures
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

// CLIENTS PAGE
function ClientsPage({ 
  clients, 
  showClientForm, 
  setShowClientForm, 
  clientForm,
  setClientForm,
  editingClient,
  onSubmit,
  onCancel,
  onEdit,
  onDelete
}) {
  if (showClientForm) {
    return (
      <div>
        <button onClick={onCancel} style={styles.backButton}>
          ← Retour
        </button>
        <h2 style={styles.pageTitle}>
          {editingClient ? 'Modifier' : 'Nouveau'} client
        </h2>
        <ClientForm
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

// DEVIS PAGE
function DevisPage({
  clients,
  devis,
  showDevisForm,
  setShowDevisForm,
  devisForm,
  setDevisForm,
  currentLigne,
  setCurrentLigne,
  onAddLigne,
  onDeleteLigne,
  onSubmit,
  calculerTotaux,
  transformerEnFacture,
  changerStatut
}) {
  if (showDevisForm) {
    return (
      <div>
        <button 
          onClick={() => {
            setShowDevisForm(false);
            setDevisForm({ 
              clientId: '', 
              date: new Date().toISOString().split('T')[0], 
              type: 'devis', 
              lignes: [] 
            });
          }} 
          style={styles.backButton}
        >
          ← Retour
        </button>
        <h2 style={styles.pageTitle}>Nouveau devis</h2>
        <DevisForm
          devisForm={devisForm}
          setDevisForm={setDevisForm}
          currentLigne={currentLigne}
          setCurrentLigne={setCurrentLigne}
          clients={clients}
          onAddLigne={onAddLigne}
          onDeleteLigne={onDeleteLigne}
          onSubmit={onSubmit}
          calculerTotaux={calculerTotaux}
        />
      </div>
    );
  }
  
  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Devis & Factures</h2>
        <button 
          onClick={() => setShowDevisForm(true)}
          disabled={clients.length === 0}
          style={{
            ...styles.primaryButton,
            opacity: clients.length === 0 ? 0.5 : 1,
            cursor: clients.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          + Nouveau devis
        </button>
      </div>
      
      {devis.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Aucun devis"
          text={clients.length === 0 ? "Ajoutez d'abord un client" : "Créez votre premier devis"}
          buttonText={clients.length > 0 ? "Créer un devis" : null}
          onButtonClick={clients.length > 0 ? () => setShowDevisForm(true) : null}
        />
      ) : (
        <DevisList
          devis={devis}
          clients={clients}
          transformerEnFacture={transformerEnFacture}
          changerStatut={changerStatut}
        />
      )}
    </div>
  );
}

function DevisList({ devis, clients, transformerEnFacture, changerStatut }) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead style={styles.tableHead}>
          <tr>
            <th style={styles.th}>Numéro</th>
            <th style={styles.th}>Client</th>
            <th style={styles.th}>Date</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Montant TTC</th>
            <th style={styles.th}>Statut</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devis.map(d => {
            const client = clients.find(c => c.id === parseInt(d.clientId));
            return (
              <tr key={d.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: '600' }}>{d.numero}</td>
                <td style={styles.td}>
                  {client ? `${client.nom} ${client.prenom}` : 'Client inconnu'}
                </td>
                <td style={styles.td}>
                  {new Date(d.date).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', fontSize: '16px' }}>
                  {d.totalTTC.toFixed(2)}€
                </td>
                <td style={styles.td}>
                  <select 
                    value={d.statut} 
                    onChange={(e) => changerStatut(d.id, e.target.value)}
                    style={styles.statutSelect}
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="envoye">Envoyé</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                    {d.type === 'facture' && <option value="paye">Payé</option>}
                  </select>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {d.type === 'devis' && d.statut === 'accepte' && (
                    <button 
                      onClick={() => transformerEnFacture(d.id)}
                      style={styles.factureButton}
                    >
                      → Facture
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// SETTINGS PAGE
function SettingsPage() {
  return (
    <div>
      <h2 style={styles.pageTitle}>Paramètres</h2>
      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Informations de l'entreprise</h3>
        <p style={{ color: '#666' }}>Configuration à venir...</p>
      </div>
    </div>
  );
}

// EMPTY STATE COMPONENT
function EmptyState({ icon, title, text, buttonText, onButtonClick }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>
      <h3 style={styles.emptyTitle}>{title}</h3>
      {text && <p style={styles.emptyText}>{text}</p>}
      {buttonText && onButtonClick && (
        <button onClick={onButtonClick} style={styles.primaryButton}>
          {buttonText}
        </button>
      )}
    </div>
  );
}

// STYLES
const styles = {
  // Auth styles
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fff5f0 0%, #fff 50%, #fef0f5 100%)',
    padding: '20px'
  },
  authBox: {
    background: '#fff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    maxWidth: '450px',
    width: '100%'
  },
  authHeader: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  logo: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    borderRadius: '16px',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px'
  },
  authTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#111',
    marginBottom: '10px',
    margin: '0 0 10px 0'
  },
  authSubtitle: {
    color: '#666',
    margin: 0
  },
  authButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  
  // Layout styles
  app: {
    minHeight: '100vh',
    background: '#f9fafb'
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 50
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerLogo: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    color: '#111'
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#666',
    margin: 0
  },
  logoutButton: {
    padding: '10px 20px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  layout: {
    display: 'flex'
  },
  sidebar: {
    width: '250px',
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    minHeight: 'calc(100vh - 81px)',
    padding: '20px'
  },
  navButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    marginBottom: '8px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'left'
  },
  navButtonActive: {
    background: '#fff7ed',
    color: '#f97316',
    fontWeight: '600'
  },
  navIcon: {
    fontSize: '20px'
  },
  main: {
    flex: 1,
    padding: '40px',
    maxWidth: '1400px'
  },
  
  // Page styles
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '30px',
    margin: '0 0 30px 0',
    color: '#111'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '20px',
    fontSize: '14px'
  },
  
  // Dashboard styles
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 8px 0'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '8px 0',
    color: '#111'
  },
  statSubtext: {
    fontSize: '14px',
    fontWeight: '500',
    margin: 0
  },
  successBanner: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    padding: '40px',
    borderRadius: '16px',
    color: '#fff',
    textAlign: 'center'
  },
  successTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 16px 0'
  },
  successText: {
    fontSize: '18px',
    opacity: 0.95,
    margin: 0
  },
  
  // Clients styles
  clientsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  clientCard: {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  clientHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  clientAvatar: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  clientActions: {
    display: 'flex',
    gap: '8px'
  },
  iconButton: {
    padding: '8px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  deleteIconButton: {
    padding: '8px',
    background: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  clientName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '4px',
    margin: '0 0 4px 0',
    color: '#111'
  },
  clientCompany: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  clientInfo: {
    fontSize: '14px',
    color: '#666'
  },
  
  // Table styles
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHead: {
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase'
  },
  tr: {
    borderBottom: '1px solid #f3f4f6'
  },
  td: {
    padding: '16px'
  },
  statutSelect: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontWeight: '500',
    background: '#f3f4f6',
    color: '#374151'
  },
  factureButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  
  // Empty state
  emptyState: {
    background: '#fff',
    padding: '60px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    margin: '0 0 12px 0',
    color: '#111'
  },
  emptyText: {
    color: '#666',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  
  // Form card
  formCard: {
    background: '#fff',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    maxWidth: '800px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    margin: '0 0 20px 0',
    color: '#111'
  }
};