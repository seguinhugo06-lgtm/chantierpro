import React from 'react';
import { Clock, Euro, Users, FileText } from 'lucide-react';

function StatCard({ icon, label, value, subtext }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-2 font-medium">{subtext}</p>
    </div>
  );
}

export default function DashboardPage({ stats, devis, clients, onNavigate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<Clock className="text-blue-600" size={24} />} 
          label="Devis en cours" 
          value={stats.devisEnCours} 
          subtext={`${stats.caEnAttente.toFixed(0)}€ en attente`} 
        />
        <StatCard 
          icon={<Euro className="text-green-600" size={24} />} 
          label="CA du mois" 
          value={`${stats.caMois.toFixed(0)}€`} 
          subtext="+12% vs mois dernier" 
        />
        <StatCard 
          icon={<Users className="text-purple-600" size={24} />} 
          label="Clients" 
          value={stats.nbClients} 
          subtext="clients actifs" 
        />
        <StatCard 
          icon={<FileText className="text-orange-600" size={24} />} 
          label="Documents" 
          value={devis.length} 
          subtext="devis & factures" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Derniers devis</h3>
            <button 
              onClick={() => onNavigate('devis')} 
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Voir tout →
            </button>
          </div>
          <div className="space-y-3">
            {devis.slice(0, 5).map(d => {
              const client = clients.find(c => c.id === d.clientId);
              return (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{d.numero}</p>
                    <p className="text-sm text-gray-500">{client?.nom || 'Client inconnu'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{d.totalTTC.toFixed(0)}€</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      d.statut === 'accepte' ? 'bg-green-100 text-green-700' : 
                      d.statut === 'envoye' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {d.statut}
                    </span>
                  </div>
                </div>
              );
            })}
            {devis.length === 0 && (
              <p className="text-gray-500 text-center py-8">Aucun devis pour le moment</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Clients récents</h3>
            <button 
              onClick={() => onNavigate('clients')} 
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Voir tout →
            </button>
          </div>
          <div className="space-y-3">
            {clients.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                  {c.nom[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{c.nom} {c.prenom}</p>
                  <p className="text-sm text-gray-500">{c.email}</p>
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <p className="text-gray-500 text-center py-8">Aucun client pour le moment</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}