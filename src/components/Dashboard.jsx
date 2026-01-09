import React from 'react';
import { Icons } from './Layout';

// ============================================
// COMPOSANTS UI RÉUTILISABLES
// ============================================

// Card de base
export function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Stat Card
export function StatCard({ icon, label, value, subValue, trend, trendUp, color = 'primary' }) {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    green: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              <span>{trendUp ? '↑' : '↓'}</span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Progress Bar
export function ProgressBar({ value, max = 100, color = 'primary', size = 'md', showLabel = true }) {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'bg-primary-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };
  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-slate-100 rounded-full ${sizes[size]} overflow-hidden`}>
        <div 
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-500 mt-1">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

// Badge
export function Badge({ children, color = 'slate', size = 'md' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-100 text-primary-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colors[color]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

// Button
export function Button({ children, variant = 'primary', size = 'md', icon, className = '', ...props }) {
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    outline: 'border-2 border-slate-200 hover:border-slate-300 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button 
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
export function DashboardPage({ stats, clients, devis, chantiers, events, setCurrentPage }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events?.filter(e => e.date === today) || [];
  
  // Chantiers en cours
  const chantiersEnCours = chantiers?.filter(c => c.statut === 'en_cours') || [];
  
  // Devis récents
  const recentDevis = devis?.slice(0, 5) || [];
  
  // Alertes
  const alertes = [
    ...(stats?.facturesImpayees?.length > 0 ? [{
      type: 'warning',
      icon: '⚠️',
      message: `${stats.facturesImpayees.length} facture(s) impayée(s)`,
      action: () => setCurrentPage('devis')
    }] : []),
    // Ajouter d'autres alertes ici
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setCurrentPage('rapports')}>
            📊 Rapports
          </Button>
          <Button onClick={() => setCurrentPage('chantiers')}>
            + Nouveau chantier
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="space-y-3">
          {alertes.map((alerte, i) => (
            <div 
              key={i}
              onClick={alerte.action}
              className={`
                flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all
                ${alerte.type === 'warning' ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100' : ''}
                ${alerte.type === 'error' ? 'bg-red-50 border border-red-200 hover:bg-red-100' : ''}
                ${alerte.type === 'info' ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100' : ''}
              `}
            >
              <span className="text-2xl">{alerte.icon}</span>
              <span className="font-medium">{alerte.message}</span>
              <span className="ml-auto text-slate-400">→</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="💰"
          label="CA du mois"
          value={`${(stats?.caMois || 0).toLocaleString('fr-FR')} €`}
          subValue={`Année: ${(stats?.caAnnee || 0).toLocaleString('fr-FR')} €`}
          trend="+12% vs mois dernier"
          trendUp={true}
          color="primary"
        />
        <StatCard
          icon="📄"
          label="Devis en attente"
          value={stats?.devisEnAttente?.length || 0}
          subValue={`${(stats?.montantEnAttente || 0).toLocaleString('fr-FR')} € potentiel`}
          color="blue"
        />
        <StatCard
          icon="🏗️"
          label="Chantiers en cours"
          value={chantiersEnCours.length}
          subValue={`${chantiers?.length || 0} au total`}
          color="green"
        />
        <StatCard
          icon="📈"
          label="Taux conversion"
          value={`${stats?.tauxConversion || 0}%`}
          subValue={`${stats?.clientsActifs || 0} clients actifs`}
          color="purple"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chantiers en cours */}
        <Card className="lg:col-span-2" padding={false}>
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Chantiers en cours</h3>
            <button 
              onClick={() => setCurrentPage('chantiers')}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Voir tout →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {chantiersEnCours.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-4xl mb-3">🏗️</p>
                <p>Aucun chantier en cours</p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setCurrentPage('chantiers')}
                >
                  Créer un chantier
                </Button>
              </div>
            ) : (
              chantiersEnCours.slice(0, 4).map((chantier) => {
                const client = clients?.find(c => c.id === chantier.client_id);
                return (
                  <div key={chantier.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900 truncate">{chantier.nom}</h4>
                          <Badge color={chantier.priorite === 'urgente' ? 'red' : chantier.priorite === 'haute' ? 'yellow' : 'slate'} size="sm">
                            {chantier.priorite}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {client?.nom} {client?.prenom} • {chantier.adresse}
                        </p>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Progression</span>
                            <span>{chantier.progression || 0}%</span>
                          </div>
                          <ProgressBar 
                            value={chantier.progression || 0} 
                            showLabel={false}
                            color={chantier.progression >= 80 ? 'green' : chantier.progression >= 50 ? 'blue' : 'primary'}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {(chantier.budget_prevu || 0).toLocaleString('fr-FR')} €
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Fin prévue: {new Date(chantier.date_fin_prevue).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Sidebar - Aujourd'hui */}
        <div className="space-y-6">
          {/* Planning du jour */}
          <Card padding={false}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">📅 Aujourd'hui</h3>
              <button 
                onClick={() => setCurrentPage('planning')}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Planning →
              </button>
            </div>
            <div className="p-4">
              {todayEvents.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  Aucun événement prévu
                </p>
              ) : (
                <div className="space-y-3">
                  {todayEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.type === 'chantier' ? 'bg-emerald-500' : 
                        event.type === 'rdv' ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />
                      <span className="text-sm font-medium text-slate-600 w-12">
                        {event.time}
                      </span>
                      <span className="text-sm text-slate-900 truncate flex-1">
                        {event.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Actions rapides */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4">⚡ Actions rapides</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setCurrentPage('devis')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xl">📝</span>
                <span className="text-sm font-medium">Créer un devis</span>
              </button>
              <button 
                onClick={() => setCurrentPage('clients')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xl">👤</span>
                <span className="text-sm font-medium">Ajouter un client</span>
              </button>
              <button 
                onClick={() => setCurrentPage('planning')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xl">📅</span>
                <span className="text-sm font-medium">Planifier un RDV</span>
              </button>
              <button 
                onClick={() => setCurrentPage('equipe')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xl">⏱️</span>
                <span className="text-sm font-medium">Saisir pointage</span>
              </button>
            </div>
          </Card>

          {/* Documents récents */}
          <Card padding={false}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">📄 Documents récents</h3>
              <button 
                onClick={() => setCurrentPage('devis')}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Voir tout →
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentDevis.length === 0 ? (
                <p className="text-slate-500 text-sm text-center p-4">
                  Aucun document
                </p>
              ) : (
                recentDevis.map((doc) => {
                  const client = clients?.find(c => c.id === doc.client_id);
                  const statusColors = {
                    brouillon: 'slate',
                    envoye: 'blue',
                    accepte: 'green',
                    refuse: 'red',
                    payee: 'green',
                  };
                  return (
                    <div key={doc.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{doc.numero}</p>
                          <p className="text-xs text-slate-500">
                            {client?.nom} {client?.prenom}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge color={statusColors[doc.statut] || 'slate'} size="sm">
                            {doc.statut}
                          </Badge>
                          <p className="text-sm font-semibold text-slate-900 mt-1">
                            {doc.total_ttc?.toFixed(0)} €
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
