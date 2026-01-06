import React, { useState, useEffect } from 'react';
import { Home, LogOut, Menu, X, TrendingUp, Users, FileText, Settings } from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import DashboardPage from './components/DashboardPage';
import ClientsPage from './components/ClientsPage';
import DevisPage from './components/DevisPage';
import SettingsPage from './components/SettingsPage';

function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function ChantierPro() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [showSidebar, setShowSidebar] = useState(true);
  const [notification, setNotification] = useState(null);
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [entrepriseInfo, setEntrepriseInfo] = useState({
    nom: '',
    adresse: '',
    siret: '',
    email: '',
    telephone: '',
    tva: 20,
    mentionsLegales: 'Devis valable 30 jours. TVA non applicable, article 293 B du CGI.'
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('current_user');
    const savedClients = localStorage.getItem('clients');
    const savedDevis = localStorage.getItem('devis');
    const savedEntreprise = localStorage.getItem('entreprise_info');

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
    }
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedDevis) setDevis(JSON.parse(savedDevis));
    if (savedEntreprise) setEntrepriseInfo(JSON.parse(savedEntreprise));
  }, []);

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('clients', JSON.stringify(clients));
  }, [clients, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('devis', JSON.stringify(devis));
  }, [devis, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && entrepriseInfo) localStorage.setItem('entreprise_info', JSON.stringify(entrepriseInfo));
  }, [entrepriseInfo, isAuthenticated]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = (email, password) => {
    if (!email || !password) {
      showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }
    const user = { id: Date.now(), email, nom: email.split('@')[0] };
    localStorage.setItem('current_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showNotification('Connexion réussie !');
  };

  const handleRegister = (email, password, nomEntreprise) => {
    if (!email || !password || !nomEntreprise) {
      showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }
    const user = { id: Date.now(), email, nom: email.split('@')[0] };
    const newEntrepriseInfo = { ...entrepriseInfo, nom: nomEntreprise };
    localStorage.setItem('current_user', JSON.stringify(user));
    localStorage.setItem('entreprise_info', JSON.stringify(newEntrepriseInfo));
    setCurrentUser(user);
    setEntrepriseInfo(newEntrepriseInfo);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showNotification('Compte créé avec succès !');
  };

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentPage('login');
    showNotification('Déconnexion réussie');
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const stats = {
    devisEnCours: devis.filter(d => d.statut === 'envoye').length,
    caEnAttente: devis.filter(d => d.statut === 'envoye').reduce((sum, d) => sum + d.totalTTC, 0),
    caMois: devis.filter(d => {
      if (d.type !== 'facture') return false;
      const date = new Date(d.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, d) => sum + d.totalTTC, 0),
    nbClients: clients.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          <span>{notification.message}</span>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition">
              {showSidebar ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Home className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ChantierPro</h1>
                <p className="text-xs text-gray-500">{entrepriseInfo?.nom || 'Mon entreprise'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">{currentUser?.email}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition flex items-center gap-2">
              <LogOut size={18} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {showSidebar && (
          <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 fixed lg:relative z-30">
            <nav className="space-y-2">
              <NavButton icon={<TrendingUp size={20} />} label="Tableau de bord" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
              <NavButton icon={<Users size={20} />} label="Clients" active={currentPage === 'clients'} onClick={() => setCurrentPage('clients')} />
              <NavButton icon={<FileText size={20} />} label="Devis & Factures" active={currentPage === 'devis'} onClick={() => setCurrentPage('devis')} />
              <NavButton icon={<Settings size={20} />} label="Paramètres" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} />
            </nav>
          </aside>
        )}

        <main className="flex-1 p-6">
          {currentPage === 'dashboard' && <DashboardPage stats={stats} devis={devis} clients={clients} onNavigate={setCurrentPage} />}
          {currentPage === 'clients' && <ClientsPage clients={clients} setClients={setClients} showNotification={showNotification} />}
          {currentPage === 'devis' && <DevisPage devis={devis} setDevis={setDevis} clients={clients} entrepriseInfo={entrepriseInfo} showNotification={showNotification} />}
          {currentPage === 'settings' && <SettingsPage entrepriseInfo={entrepriseInfo} setEntrepriseInfo={setEntrepriseInfo} showNotification={showNotification} />}
        </main>
      </div>
    </div>
  );
}