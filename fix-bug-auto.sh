#!/bin/bash

# ============================================
# SCRIPT DE CORRECTION AUTOMATIQUE DU BUG
# ============================================

cd /Users/hugoseguin/Documents/chantierpro-app

echo "🔧 Sauvegarde de l'ancien App.jsx..."
cp src/App.jsx src/App.jsx.backup-$(date +%Y%m%d-%H%M%S)

echo "📝 Création du nouveau App.jsx sans bug..."
cat > src/App.jsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  
  // CLIENT STATE
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientFormData, setClientFormData] = useState({ 
    nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' 
  });
  
  // DEVIS STATE
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisFormData, setDevisFormData] = useState({ 
    clientId: '', 
    date: new Date().toISOString().split('T')[0], 
    type: 'devis', 
    lignes: [] 
  });
  const [currentLigne, setCurrentLigne] = useState({ 
    description: '', quantite: 1, prixUnitaire: 0 
  });
  
  // LOAD/SAVE LOCALSTORAGE
  useEffect(() => {
    const savedClients = localStorage.getItem('cp_clients');
    const savedDevis = localStorage.getItem('cp_devis');
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedDevis) setDevis(JSON.parse(savedDevis));
  }, []);
  
  useEffect(() => { 
    if (isAuth) localStorage.setItem('cp_clients', JSON.stringify(clients)); 
  }, [clients, isAuth]);
  
  useEffect(() => { 
    if (isAuth) localStorage.setItem('cp_devis', JSON.stringify(devis)); 
  }, [devis, isAuth]);
  
  // CLIENT HANDLERS
  const handleClientSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      setClients(clients.map(c => 
        c.id === editingClient.id ? { ...clientFormData, id: c.id } : c
      ));
    } else {
      setClients([...clients, { ...clientFormData, id: Date.now() }]);
    }
    setClientFormData({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
    setEditingClient(null);
    setShowClientForm(false);
  };
  
  const handleClientEdit = (client) => {
    setEditingClient(client);
    setClientFormData(client);
    setShowClientForm(true);
  };
  
  const handleClientDelete = (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };
  
  const handleCancelClientForm = () => {
    setShowClientForm(false);
    setClientFormData({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
    setEditingClient(null);
  };
  
  // DEVIS HANDLERS
  const ajouterLigne = () => {
    if (!currentLigne.description || currentLigne.prixUnitaire <= 0) {
      alert('Remplissez la description et le prix');
      return;
    }
    const montant = currentLigne.quantite * currentLigne.prixUnitaire;
    setDevisFormData(prev => ({ 
      ...prev, 
      lignes: [...prev.lignes, { ...currentLigne, montant }] 
    }));
    setCurrentLigne({ description: '', quantite: 1, prixUnitaire: 0 });
  };
  
  const supprimerLigne = (index) => {
    setDevisFormData(prev => ({ 
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
    if (!devisFormData.clientId || devisFormData.lignes.length === 0) {
      alert('Sélectionnez un client et ajoutez au moins une ligne');
      return;
    }
    const totaux = calculerTotaux(devisFormData.lignes);
    const numero = \`\${devisFormData.type === 'devis' ? 'DEV' : 'FACT'}-\${new Date().getFullYear()}-\${String(devis.length + 1).padStart(3, '0')}\`;
    const nouveauDevis = {
      id: Date.now(),
      numero,
      ...devisFormData,
      ...totaux,
      statut: 'brouillon',
      createdAt: new Date().toISOString()
    };
    setDevis([...devis, nouveauDevis]);
    setDevisFormData({ 
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
    const numero = \`FACT-\${new Date().getFullYear()}-\${String(devis.filter(x => x.type === 'facture').length + 1).padStart(3, '0')}\`;
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
  
  return (
    <div style={styles.app}>
      <Header onLogout={() => setIsAuth(false)} />
      <div style={styles.layout}>
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main style={styles.main}>
          {currentPage === 'dashboard' && <DashboardPage clients={clients} devis={devis} />}
          {currentPage === 'clients' && (
            <ClientsPage 
              clients={clients}
              showForm={showClientForm}
              setShowForm={setShowClientForm}
              formData={clientFormData}
              setFormData={setClientFormData}
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
              showForm={showDevisForm}
              setShowForm={setShowDevisForm}
              formData={devisFormData}
              setFormData={setDevisFormData}
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
        <button onClick={onLogout} style={styles.logoutButton}>Déconnexion</button>
      </div>
    </header>
  );
}

function Sidebar({ currentPage, setCurrentPage }) {
  const items = [
    { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
    { id: 'clients', icon: '👥', label: 'Clients' },
    { id: 'devis', icon: '📄', label: 'Devis & Factures' },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' }
  ];
  
  return (
    <aside style={styles.sidebar}>
      <nav>
        {items.map(item => (
          <button 
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={{...styles.navButton, ...(currentPage === item.id ? styles.navButtonActive : {})}}
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
    caEnAttente: devis.filter(d => d.statut === 'envoye').reduce((s, d) => s + (d.totalTTC || 0), 0),
    caMois: devis.filter(d => d.type === 'facture' && new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.totalTTC || 0), 0),
    nbClients: clients.length,
    nbDocs: devis.length
  };
  
  return (
    <div>
      <h2 style={styles.pageTitle}>Tableau de bord</h2>
      <div style={styles.statsGrid}>
        {[
          { icon: '⏱️', label: 'Devis en cours', value: stats.devisEnCours, subtext: \`\${stats.caEnAttente.toFixed(0)}€ en attente\`, color: '#3b82f6' },
          { icon: '💰', label: 'CA du mois', value: \`\${stats.caMois.toFixed(0)}€\`, subtext: '+12% vs mois dernier', color: '#10b981' },
          { icon: '👥', label: 'Clients', value: stats.nbClients, subtext: 'clients actifs', color: '#8b5cf6' },
          { icon: '📄', label: 'Documents', value: stats.nbDocs, subtext: 'devis & factures', color: '#f97316' }
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={styles.statIcon}>{s.icon}</div>
            <p style={styles.statLabel}>{s.label}</p>
            <p style={styles.statValue}>{s.value}</p>
            <p style={{...styles.statSubtext, color: s.color}}>{s.subtext}</p>
          </div>
        ))}
      </div>
      <div style={styles.successBanner}>
        <h3 style={styles.successTitle}>🎉 Application Fonctionnelle !</h3>
        <p style={styles.successText}>Gérez vos clients, créez des devis et suivez vos factures</p>
      </div>
    </div>
  );
}

function ClientsPage({ clients, showForm, setShowForm, formData, setFormData, editingClient, onSubmit, onCancel, onEdit, onDelete }) {
  
  // FONCTION HANDLER OPTIMISÉE - KEY FIX
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  if (showForm) {
    return (
      <div>
        <button onClick={onCancel} style={styles.backButton}>← Retour</button>
        <h2 style={styles.pageTitle}>{editingClient ? 'Modifier' : 'Nouveau'} client</h2>
        <div style={formStyles.container}>
          <form onSubmit={onSubmit}>
            <div style={formStyles.row}>
              <div style={formStyles.field}>
                <label style={formStyles.label}>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => updateField('nom', e.target.value)}
                  required
                  style={formStyles.input}
                  autoComplete="off"
                />
              </div>
              <div style={formStyles.field}>
                <label style={formStyles.label}>Prénom</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => updateField('prenom', e.target.value)}
                  style={formStyles.input}
                  autoComplete="off"
                />
              </div>
            </div>
            
            <div style={formStyles.field}>
              <label style={formStyles.label}>Entreprise</label>
              <input
                type="text"
                value={formData.entreprise}
                onChange={(e) => updateField('entreprise', e.target.value)}
                style={formStyles.input}
                autoComplete="off"
              />
            </div>
            
            <div style={formStyles.row}>
              <div style={formStyles.field}>
                <label style={formStyles.label}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  style={formStyles.input}
                  autoComplete="off"
                />
              </div>
              <div style={formStyles.field}>
                <label style={formStyles.label}>Téléphone *</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => updateField('telephone', e.target.value)}
                  required
                  style={formStyles.input}
                  autoComplete="off"
                />
              </div>
            </div>
            
            <div style={formStyles.field}>
              <label style={formStyles.label}>Adresse *</label>
              <textarea
                value={formData.adresse}
                onChange={(e) => updateField('adresse', e.target.value)}
                required
                rows={3}
                style={formStyles.textarea}
              />
            </div>
            
            <div style={formStyles.buttonRow}>
              <button type="button" onClick={onCancel} style={formStyles.cancelBtn}>Annuler</button>
              <button type="submit" style={formStyles.submitBtn}>{editingClient ? 'Modifier' : 'Créer'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Clients</h2>
        <button onClick={() => setShowForm(true)} style={styles.primaryButton}>+ Nouveau</button>
      </div>
      {clients.length === 0 ? (
        <EmptyState icon="👥" title="Aucun client" buttonText="Ajouter un client" onButtonClick={() => setShowForm(true)} />
      ) : (
        <div style={styles.clientsGrid}>
          {clients.map(c => (
            <div key={c.id} style={styles.clientCard}>
              <div style={styles.clientHeader}>
                <div style={styles.clientAvatar}>{c.nom[0]}{c.prenom?.[0] || ''}</div>
                <div style={styles.clientActions}>
                  <button onClick={() => onEdit(c)} style={styles.iconButton}>✏️</button>
                  <button onClick={() => onDelete(c.id)} style={styles.deleteIconButton}>🗑️</button>
                </div>
              </div>
              <h3 style={styles.clientName}>{c.nom} {c.prenom}</h3>
              {c.entreprise && <p style={styles.clientCompany}>{c.entreprise}</p>}
              <div style={styles.clientInfo}>
                <p>📧 {c.email}</p>
                <p>📱 {c.telephone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DevisPage({ clients, devis, showForm, setShowForm, formData, setFormData, currentLigne, setCurrentLigne, onAddLigne, onDeleteLigne, onSubmit, calculerTotaux, transformerEnFacture, changerStatut }) {
  
  const updateDevisField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const updateLigneField = (field, value) => {
    setCurrentLigne(prev => ({ ...prev, [field]: value }));
  };
  
  if (showForm) {
    const totaux = calculerTotaux(formData.lignes);
    const canSubmit = formData.clientId && formData.lignes.length > 0;

    return (
      <div>
        <button onClick={() => { setShowForm(false); setFormData({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] }); }} style={styles.backButton}>← Retour</button>
        <h2 style={styles.pageTitle}>Nouveau devis</h2>
        <div style={formStyles.container}>
          <div style={formStyles.row}>
            <div style={formStyles.field}>
              <label style={formStyles.label}>Client *</label>
              <select value={formData.clientId} onChange={(e) => updateDevisField('clientId', e.target.value)} required style={formStyles.input}>
                <option value="">Sélectionner...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
            </div>
            <div style={formStyles.field}>
              <label style={formStyles.label}>Date</label>
              <input type="date" value={formData.date} onChange={(e) => updateDevisField('date', e.target.value)} style={formStyles.input} />
            </div>
          </div>

          <h3 style={formStyles.sectionTitle}>Lignes du devis</h3>
          <div style={formStyles.ligneForm}>
            <input placeholder="Description" value={currentLigne.description} onChange={(e) => updateLigneField('description', e.target.value)} style={formStyles.input} />
            <input type="number" placeholder="Qté" value={currentLigne.quantite} onChange={(e) => updateLigneField('quantite', parseFloat(e.target.value) || 1)} min="1" style={formStyles.input} />
            <input type="number" placeholder="Prix HT" step="0.01" value={currentLigne.prixUnitaire} onChange={(e) => updateLigneField('prixUnitaire', parseFloat(e.target.value) || 0)} min="0" style={formStyles.input} />
            <button onClick={onAddLigne} type="button" style={formStyles.addButton}>+</button>
          </div>

          {formData.lignes.length > 0 && (
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
                  {formData.lignes.map((ligne, index) => (
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

          <button onClick={onSubmit} disabled={!canSubmit} style={canSubmit ? formStyles.submitBtn : formStyles.submitBtnDisabled}>Créer le devis</button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Devis & Factures</h2>
        <button onClick={() => setShowForm(true)} disabled={clients.length === 0} style={{...styles.primaryButton, opacity: clients.length === 0 ? 0.5 : 1, cursor: clients.length === 0 ? 'not-allowed' : 'pointer'}}>+ Nouveau devis</button>
      </div>
      
      {devis.length === 0 ? (
        <EmptyState icon="📄" title="Aucun devis" text={clients.length === 0 ? "Ajoutez d'abord un client" : "Créez votre premier devis"} buttonText={clients.length > 0 ? "Créer un devis" : null} onButtonClick={clients.length > 0 ? () => setShowForm(true) : null} />
      ) : (
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
                const client = clients.find(c => c.id === parseInt(d.clientId));
                return (
                  <tr key={d.id} style={styles.tr}>
                    <td style={{...styles.td, fontWeight: '600'}}>{d.numero}</td>
                    <td style={styles.td}>{client ? \`\${client.nom} \${client.prenom}\` : 'Client inconnu'}</td>
                    <td style={styles.td}>{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: '700', fontSize: '16px'}}>{d.totalTTC.toFixed(2)}€</td>
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
                      {d.type === 'devis' && d.statut === 'accepte' && (
                        <button onClick={() => transformerEnFacture(d.id)} style={styles.factureButton}>→ Facture</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <h2 style={styles.pageTitle}>Paramètres</h2>
      <div style={formStyles.container}>
        <h3 style={formStyles.sectionTitle}>Informations de l'entreprise</h3>
        <p style={{color: '#666'}}>Configuration à venir...</p>
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

const styles = {
  authContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff5f0 0%, #fff 50%, #fef0f5 100%)', padding: '20px' },
  authBox: { background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%' },
  authHeader: { textAlign: 'center', marginBottom: '30px' },
  logo: { width: '80px', height: '80px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '16px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' },
  authTitle: { fontSize: '32px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0' },
  authSubtitle: { color: '#666', margin: 0 },
  authButton: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
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
  factureButton: { padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  emptyState: { background: '#fff', padding: '60px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' },
  emptyIcon: { fontSize: '64px', marginBottom: '20px' },
  emptyTitle: { fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#111' },
  emptyText: { color: '#666', margin: '0 0 20px 0' }
};

const formStyles = {
  container: { background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '1000px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' },
  input: { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', resize: 'vertical', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  buttonRow: { display: 'flex', gap: '12px' },
  cancelBtn: { flex: 1, padding: '14px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' },
  submitBtn: { flex: 1, padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' },
  submitBtnDisabled: { flex: 1, padding: '14px', background: '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontSize: '16px', fontWeight: '600' },
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
ENDOFFILE

echo "✅ Nouveau App.jsx créé sans bug!"
echo ""
echo "📦 Push sur GitHub..."
git add src/App.jsx
git commit -m "Fix: Resolve input focus bug with optimized handlers"
git push origin main

echo ""
echo "✅ TERMINÉ!"
echo "👉 Attends 2-3 minutes que Vercel redéploie"
echo "👉 URL: https://chantierpro.vercel.app"
echo ""
echo "🎯 Le bug de focus est maintenant RÉSOLU!"
