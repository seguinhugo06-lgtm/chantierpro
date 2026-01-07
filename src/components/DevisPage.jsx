import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';

export default function DevisPage({ devis, setDevis, clients, entrepriseInfo, showNotification }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDevis = devis.filter(d => {
    const client = clients.find(c => c.id === d.clientId);
    return client && (
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.numero.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Devis & Factures</h2>
        <button
          onClick={() => showNotification('Fonctionnalité bientôt disponible')}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition flex items-center gap-2"
        >
          <Plus size={20} />
          Nouveau devis
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDevis.map(d => {
              const client = clients.find(c => c.id === d.clientId);
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{d.numero}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{client?.nom || 'Inconnu'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{d.date}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{d.totalTTC.toFixed(2)}€</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      d.statut === 'accepte' ? 'bg-green-100 text-green-700' : 
                      d.statut === 'envoye' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {d.statut}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredDevis.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Aucun devis trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}