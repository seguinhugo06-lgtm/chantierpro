import React, { useState, useEffect } from 'react';

export default function App() {
  // AUTH STATE
  const [isAuth, setIsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // DATA STATE
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  
  // FORMS STATE
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: ''
  });
  
  // Load data from localStorage
  useEffect(() => {
    const savedClients = localStorage.getItem('chantierpro_clients');
    const savedDevis = localStorage.getItem('chantierpro_devis');
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedDevis) setDevis(JSON.parse(savedDevis));
  }, []);
  
  // Save clients
  useEffect(() => {
    if (isAuth && clients.length >= 0) {
      localStorage.setItem('chantierpro_clients', JSON.stringify(clients));
    }
  }, [clients, isAuth]);
  
  // Save devis
  useEffect(() => {
    if (isAuth && devis.length >= 0) {
      localStorage.setItem('chantierpro_devis', JSON.stringify(devis));
    }
  }, [devis, isAuth]);
  
  // CLIENT HANDLERS
  const handleClientSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? { ...clientForm, id: c.id } : c));
    } else {
      setClients([...clients, { ...clientForm, id: Date.now(), createdAt: new Date().toISOString() }]);
    }
    resetClientForm();
  };
  
  const handleClientEdit = (client) => {
    setEditingClient(client);
    setClientForm(client);
    setShowClientForm(true);
  };
  
  const handleClientDelete = (id) => {
    if (confirm('Supprimer ce client ?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };
  
  const resetClientForm = () => {
    setClientForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
    setEditingClient(null);
    setShowClientForm(false);
  };
  
  // AUTH SCREEN
  if (!isAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 50%, #fef0f5 100%)', padding: '20px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '16px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏗️</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111', marginBottom: '10px' }}>ChantierPro</h1>
            <p style={{ color: '#666', fontSize: '16px' }}>Accédez à votre espace ChantierPro</p>
          </div>
          <button onClick={() => setIsAuth(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }
  
  // HEADER
  const Header = () => (
    <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏗️</div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111' }}>ChantierPro</h1>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Mon Entreprise BTP</p>
          </div>
        </div>
        <button onClick={() => setIsAuth(false)} style={{ padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
          Déconnexion
        </button>
      </div>
    </header>
  );
  
  // SIDEBAR
  const Sidebar = () => (
    <div style={{ width: '250px', background: 'white', borderRight: '1px solid #e5e7eb', minHeight: 'calc(100vh - 81px)', padding: '20px' }}>
      <nav>
        {[
          { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
          { id: 'clients', icon: '👥', label: 'Clients' },
          { id: 'devis', icon: '📄', label: 'Devis & Factures' },
          { id: 'settings', icon: '⚙️', label: 'Paramètres' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              marginBottom: '8px',
              background: currentPage === item.id ? '#fff7ed' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: currentPage === item.id ? '600' : '500',
              color: currentPage === item.id ? '#f97316' : '#374151',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (currentPage !== item.id) e.target.style.background = '#f9fafb' }}
            onMouseLeave={(e) => { if (currentPage !== item.id) e.target.style.background = 'transparent' }}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
  
  // DASHBOARD PAGE
  const DashboardPage = () => (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#111' }}>Tableau de bord</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {[
          { icon: '⏱️', label: 'Devis en cours', value: devis.filter(d => d.statut === 'envoye').length, subtext: `${devis.filter(d => d.statut === 'envoye').reduce((sum, d) => sum + (d.totalTTC || 0), 0).toFixed(0)}€ en attente`, color: '#3b82f6' },
          { icon: '💰', label: 'CA du mois', value: `${devis.filter(d => d.type === 'facture').reduce((sum, d) => sum + (d.totalTTC || 0), 0).toFixed(0)}€`, subtext: '+12% vs mois dernier', color: '#10b981' },
          { icon: '👥', label: 'Clients', value: clients.length, subtext: 'clients actifs', color: '#8b5cf6' },
          { icon: '📄', label: 'Documents', value: devis.length, subtext: 'devis & factures', color: '#f97316' }
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>{stat.label}</p>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#111', margin: '8px 0' }}>{stat.value}</p>
            <p style={{ fontSize: '14px', color: stat.color, fontWeight: '500', margin: 0 }}>{stat.subtext}</p>
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '40px', borderRadius: '16px', color: 'white', textAlign: 'center' }}>
        <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 16px 0' }}>🎉 Application Fonctionnelle !</h3>
        <p style={{ fontSize: '18px', opacity: 0.95, margin: '0 0 8px 0' }}>Gérez vos clients, créez des devis et suivez vos factures</p>
      </div>
    </div>
  );
  
  // CLIENTS PAGE
  const ClientsPage = () => {
    if (showClientForm) {
      return (
        <div>
          <button onClick={resetClientForm} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
            ← Retour
          </button>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#111' }}>
            {editingClient ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '800px' }}>
            <form onSubmit={handleClientSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Nom *</label>
                  <input type="text" value={clientForm.nom} onChange={(e) => setClientForm({...clientForm, nom: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Prénom</label>
                  <input type="text" value={clientForm.prenom} onChange={(e) => setClientForm({...clientForm, prenom: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Entreprise</label>
                <input type="text" value={clientForm.entreprise} onChange={(e) => setClientForm({...clientForm, entreprise: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Email *</label>
                  <input type="email" value={clientForm.email} onChange={(e) => setClientForm({...clientForm, email: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Téléphone *</label>
                  <input type="tel" value={clientForm.telephone} onChange={(e) => setClientForm({...clientForm, telephone: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Adresse complète *</label>
                <textarea value={clientForm.adresse} onChange={(e) => setClientForm({...clientForm, adresse: e.target.value})} required rows={3} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={resetClientForm} style={{ flex: 1, padding: '14px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', color: '#374151' }}>
                  Annuler
                </button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>
                  {editingClient ? 'Modifier' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111', margin: 0 }}>Clients</h2>
          <button onClick={() => setShowClientForm(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>+</span> Nouveau client
          </button>
        </div>
        
        {clients.length === 0 ? (
          <div style={{ background: 'white', padding: '60px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '12px' }}>Aucun client</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>Commencez par ajouter votre premier client</p>
            <button onClick={() => setShowClientForm(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>
              Ajouter un client
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {clients.map(client => (
              <div key={client.id} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                    {client.nom[0]}{client.prenom ? client.prenom[0] : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleClientEdit(client)} style={{ padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => handleClientDelete(client.id)} style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>{client.nom} {client.prenom}</h3>
                {client.entreprise && <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>{client.entreprise}</p>}
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                  <p style={{ margin: '4px 0' }}>📧 {client.email}</p>
                  <p style={{ margin: '4px 0' }}>📱 {client.telephone}</p>
                  <p style={{ margin: '4px 0' }}>📍 {client.adresse}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // DEVIS PAGE (Placeholder)
  const DevisPage = () => (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#111' }}>Devis & Factures</h2>
      <div style={{ background: 'white', padding: '60px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '12px' }}>Bientôt disponible</h3>
        <p style={{ color: '#666' }}>La création de devis arrive dans quelques minutes...</p>
      </div>
    </div>
  );
  
  // SETTINGS PAGE
  const SettingsPage = () => (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#111' }}>Paramètres</h2>
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '800px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Informations de l'entreprise</h3>
        <p style={{ color: '#666' }}>Configuration à venir...</p>
      </div>
    </div>
  );
  
  // MAIN LAYOUT
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Header />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '40px', maxWidth: '1400px' }}>
          {currentPage === 'dashboard' && <DashboardPage />}
          {currentPage === 'clients' && <ClientsPage />}
          {currentPage === 'devis' && <DevisPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}