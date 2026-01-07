import React, { useState, useEffect } from 'react';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  
  // CLIENT FORM
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
  
  // DEVIS FORM
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisForm, setDevisForm] = useState({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] });
  const [currentLigne, setCurrentLigne] = useState({ description: '', quantite: 1, prixUnitaire: 0 });
  
  useEffect(() => {
    const savedClients = localStorage.getItem('cp_clients');
    const savedDevis = localStorage.getItem('cp_devis');
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedDevis) setDevis(JSON.parse(savedDevis));
  }, []);
  
  useEffect(() => { if (isAuth) localStorage.setItem('cp_clients', JSON.stringify(clients)); }, [clients, isAuth]);
  useEffect(() => { if (isAuth) localStorage.setItem('cp_devis', JSON.stringify(devis)); }, [devis, isAuth]);
  
  // CLIENT HANDLERS
  const handleClientSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? { ...clientForm, id: c.id } : c));
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
    if (confirm('Supprimer ce client ?')) setClients(clients.filter(c => c.id !== id));
  };
  
  // DEVIS HANDLERS
  const ajouterLigne = () => {
    if (!currentLigne.description || currentLigne.prixUnitaire <= 0) return alert('Remplissez la description et le prix');
    const montant = currentLigne.quantite * currentLigne.prixUnitaire;
    setDevisForm({ ...devisForm, lignes: [...devisForm.lignes, { ...currentLigne, montant }] });
    setCurrentLigne({ description: '', quantite: 1, prixUnitaire: 0 });
  };
  
  const supprimerLigne = (index) => {
    setDevisForm({ ...devisForm, lignes: devisForm.lignes.filter((_, i) => i !== index) });
  };
  
  const calculerTotaux = (lignes) => {
    const totalHT = lignes.reduce((sum, l) => sum + l.montant, 0);
    const tva = totalHT * 0.2;
    const totalTTC = totalHT + tva;
    return { totalHT, tva, totalTTC };
  };
  
  const handleDevisSubmit = () => {
    if (!devisForm.clientId || devisForm.lignes.length === 0) return alert('Sélectionnez un client et ajoutez au moins une ligne');
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
    setDevisForm({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] });
    setShowDevisForm(false);
  };
  
  const transformerEnFacture = (devisId) => {
    const d = devis.find(x => x.id === devisId);
    if (!d) return;
    const numero = `FACT-${new Date().getFullYear()}-${String(devis.filter(x => x.type === 'facture').length + 1).padStart(3, '0')}`;
    const facture = { ...d, id: Date.now(), numero, type: 'facture', statut: 'impayee', createdAt: new Date().toISOString() };
    setDevis([...devis, facture]);
    setDevis(devis.map(x => x.id === devisId ? { ...x, statut: 'accepte' } : x));
  };
  
  const changerStatut = (id, nouveauStatut) => {
    setDevis(devis.map(d => d.id === id ? { ...d, statut: nouveauStatut } : d));
  };
  
  if (!isAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff5f0 0%, #fff 50%, #fef0f5 100%)', padding: '20px' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '16px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏗️</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111', marginBottom: '10px' }}>ChantierPro</h1>
            <p style={{ color: '#666' }}>Accédez à votre espace</p>
          </div>
          <button onClick={() => setIsAuth(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>Se connecter</button>
        </div>
      </div>
    );
  }
  
  const Header = () => (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏗️</div>
          <div><h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>ChantierPro</h1><p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Mon Entreprise BTP</p></div>
        </div>
        <button onClick={() => setIsAuth(false)} style={{ padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>Déconnexion</button>
      </div>
    </header>
  );
  
  const Sidebar = () => (
    <div style={{ width: '250px', background: '#fff', borderRight: '1px solid #e5e7eb', minHeight: 'calc(100vh - 81px)', padding: '20px' }}>
      <nav>
        {[
          { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
          { id: 'clients', icon: '👥', label: 'Clients' },
          { id: 'devis', icon: '📄', label: 'Devis & Factures' },
          { id: 'settings', icon: '⚙️', label: 'Paramètres' }
        ].map(item => (
          <button key={item.id} onClick={() => setCurrentPage(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', marginBottom: '8px', background: currentPage === item.id ? '#fff7ed' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: currentPage === item.id ? '600' : '500', color: currentPage === item.id ? '#f97316' : '#374151', textAlign: 'left' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </div>
  );
  
  const DashboardPage = () => {
    const stats = {
      devisEnCours: devis.filter(d => d.statut === 'envoye').length,
      caEnAttente: devis.filter(d => d.statut === 'envoye').reduce((s, d) => s + d.totalTTC, 0),
      caMois: devis.filter(d => d.type === 'facture' && new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + d.totalTTC, 0),
      nbClients: clients.length,
      nbDocs: devis.length
    };
    
    return (
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>Tableau de bord</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {[
            { icon: '⏱️', label: 'Devis en cours', value: stats.devisEnCours, subtext: `${stats.caEnAttente.toFixed(0)}€ en attente`, color: '#3b82f6' },
            { icon: '💰', label: 'CA du mois', value: `${stats.caMois.toFixed(0)}€`, subtext: '+12% vs mois dernier', color: '#10b981' },
            { icon: '👥', label: 'Clients', value: stats.nbClients, subtext: 'clients actifs', color: '#8b5cf6' },
            { icon: '📄', label: 'Documents', value: stats.nbDocs, subtext: 'devis & factures', color: '#f97316' }
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.icon}</div>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>{s.label}</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '8px 0' }}>{s.value}</p>
              <p style={{ fontSize: '14px', color: s.color, fontWeight: '500', margin: 0 }}>{s.subtext}</p>
            </div>
          ))}
        </div>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '40px', borderRadius: '16px', color: '#fff', textAlign: 'center' }}>
          <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 16px 0' }}>🎉 Application Fonctionnelle !</h3>
          <p style={{ fontSize: '18px', opacity: 0.95, margin: 0 }}>Gérez vos clients, créez des devis et suivez vos factures</p>
        </div>
      </div>
    );
  };
  
  const ClientsPage = () => {
    if (showClientForm) {
      return (
        <div>
          <button onClick={() => { setShowClientForm(false); setClientForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' }); setEditingClient(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>← Retour</button>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>{editingClient ? 'Modifier' : 'Nouveau'} client</h2>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '800px' }}>
            <form onSubmit={handleClientSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Nom *</label><input type="text" value={clientForm.nom} onChange={(e) => setClientForm({...clientForm, nom: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Prénom</label><input type="text" value={clientForm.prenom} onChange={(e) => setClientForm({...clientForm, prenom: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} /></div>
              </div>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Entreprise</label><input type="text" value={clientForm.entreprise} onChange={(e) => setClientForm({...clientForm, entreprise: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Email *</label><input type="email" value={clientForm.email} onChange={(e) => setClientForm({...clientForm, email: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Téléphone *</label><input type="tel" value={clientForm.telephone} onChange={(e) => setClientForm({...clientForm, telephone: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} /></div>
              </div>
              <div style={{ marginBottom: '30px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Adresse *</label><textarea value={clientForm.adresse} onChange={(e) => setClientForm({...clientForm, adresse: e.target.value})} required rows={3} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowClientForm(false); setClientForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' }); }} style={{ flex: 1, padding: '14px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{editingClient ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Clients</h2>
          <button onClick={() => setShowClientForm(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>+ Nouveau</button>
        </div>
        {clients.length === 0 ? (
          <div style={{ background: '#fff', padding: '60px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Aucun client</h3>
            <button onClick={() => setShowClientForm(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '20px' }}>Ajouter un client</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {clients.map(c => (
              <div key={c.id} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{c.nom[0]}{c.prenom?.[0] || ''}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleClientEdit(c)} style={{ padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => handleClientDelete(c.id)} style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{c.nom} {c.prenom}</h3>
                {c.entreprise && <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>{c.entreprise}</p>}
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <p style={{ margin: '4px 0' }}>📧 {c.email}</p>
                  <p style={{ margin: '4px 0' }}>📱 {c.telephone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const DevisPage = () => {
    if (showDevisForm) {
      const totaux = calculerTotaux(devisForm.lignes);
      return (
        <div>
          <button onClick={() => { setShowDevisForm(false); setDevisForm({ clientId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [] }); }} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>← Retour</button>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>Nouveau devis</h2>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '1000px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Client *</label><select value={devisForm.clientId} onChange={(e) => setDevisForm({...devisForm, clientId: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
              <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Date</label><input type="date" value={devisForm.date} onChange={(e) => setDevisForm({...devisForm, date: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} /></div>
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Lignes du devis</h3>
            <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', marginBottom: '12px' }}>
                <input placeholder="Description" value={currentLigne.description} onChange={(e) => setCurrentLigne({...currentLigne, description: e.target.value})} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input type="number" placeholder="Qté" value={currentLigne.quantite} onChange={(e) => setCurrentLigne({...currentLigne, quantite: parseFloat(e.target.value) || 1})} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input type="number" placeholder="Prix HT" step="0.01" value={currentLigne.prixUnitaire} onChange={(e) => setCurrentLigne({...currentLigne, prixUnitaire: parseFloat(e.target.value) || 0})} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <button onClick={ajouterLigne} style={{ padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+</button>
              </div>
            </div>
            
            {devisForm.lignes.length > 0 && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>Description</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666' }}>Qté</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666' }}>Prix HT</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666' }}>Total</th>
                      <th style={{ padding: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {devisForm.lignes.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>{l.description}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{l.quantite}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{l.prixUnitaire.toFixed(2)}€</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{l.montant.toFixed(2)}€</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}><button onClick={() => supprimerLigne(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ background: '#f9fafb', padding: '20px', borderTop: '2px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '16px' }}>
                    <div><span style={{ color: '#666' }}>Total HT:</span> <strong>{totaux.totalHT.toFixed(2)}€</strong></div>
                    <div><span style={{ color: '#666' }}>TVA (20%):</span> <strong>{totaux.tva.toFixed(2)}€</strong></div>
                    <div><span style={{ color: '#666' }}>Total TTC:</span> <strong style={{ fontSize: '20px', color: '#f97316' }}>{totaux.totalTTC.toFixed(2)}€</strong></div>
                  </div>
                </div>
               </div>
            )}
            
            <button onClick={handleDevisSubmit} disabled={!devisForm.clientId || devisForm.lignes.length === 0} style={{ width: '100%', padding: '16px', background: devisForm.clientId && devisForm.lignes.length > 0 ? 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', cursor: devisForm.clientId && devisForm.lignes.length > 0 ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: '600' }}>Créer le devis</button>
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Devis & Factures</h2>
          <button onClick={() => setShowDevisForm(true)} disabled={clients.length === 0} style={{ padding: '12px 24px', background: clients.length > 0 ? 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', cursor: clients.length > 0 ? 'pointer' : 'not-allowed', fontWeight: '600' }}>+ Nouveau devis</button>
        </div>
        
        {devis.length === 0 ? (
          <div style={{ background: '#fff', padding: '60px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Aucun devis</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>{clients.length === 0 ? 'Ajoutez d\'abord un client' : 'Créez votre premier devis'}</p>
            {clients.length > 0 && <button onClick={() => setShowDevisForm(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Créer un devis</button>}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Numéro</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Montant TTC</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Statut</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devis.map(d => {
                  const client = clients.find(c => c.id === parseInt(d.clientId));
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px', fontWeight: '600' }}>{d.numero}</td>
                      <td style={{ padding: '16px' }}>{client ? `${client.nom} ${client.prenom}` : 'Client inconnu'}</td>
                      <td style={{ padding: '16px', color: '#666' }}>{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '16px' }}>{d.totalTTC.toFixed(2)}€</td>
                      <td style={{ padding: '16px' }}>
                        <select value={d.statut} onChange={(e) => changerStatut(d.id, e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: '500', background: d.statut === 'accepte' ? '#dcfce7' : d.statut === 'envoye' ? '#dbeafe' : d.statut === 'refuse' ? '#fee2e2' : '#f3f4f6', color: d.statut === 'accepte' ? '#166534' : d.statut === 'envoye' ? '#1e40af' : d.statut === 'refuse' ? '#991b1b' : '#374151' }}>
                          <option value="brouillon">Brouillon</option>
                          <option value="envoye">Envoyé</option>
                          <option value="accepte">Accepté</option>
                          <option value="refuse">Refusé</option>
                          {d.type === 'facture' && <option value="paye">Payé</option>}
                        </select>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {d.type === 'devis' && d.statut === 'accepte' && (
                          <button onClick={() => transformerEnFacture(d.id)} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>→ Facture</button>
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
  };
  
  const SettingsPage = () => (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>Paramètres</h2>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', maxWidth: '800px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Informations de l'entreprise</h3>
        <p style={{ color: '#666' }}>Configuration à venir...</p>
      </div>
    </div>
  );
  
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