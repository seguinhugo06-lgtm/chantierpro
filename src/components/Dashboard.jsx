import React from 'react';

export default function Dashboard({ stats, chantiers, events, setPage }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const enCours = chantiers.filter(c => c.statut === 'en_cours');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-slate-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {stats.impayees.length > 0 && (
        <div onClick={() => setPage('devis')} className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl cursor-pointer">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-800">{stats.impayees.length} facture(s) impayée(s)</p>
            <p className="text-sm text-red-600">{stats.impayees.reduce((s,d) => s + (d.total_ttc||0), 0).toLocaleString('fr-FR')} € à encaisser</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80">CA du mois</p>
          <p className="text-3xl font-bold mt-1">{stats.caMois.toLocaleString('fr-FR')} €</p>
        </div>
        <div onClick={() => setPage('devis')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg">
          <p className="text-sm text-slate-500">Devis en attente</p>
          <p className="text-3xl font-bold mt-1">{stats.devisAttente}</p>
        </div>
        <div onClick={() => setPage('chantiers')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg">
          <p className="text-sm text-slate-500">Chantiers en cours</p>
          <p className="text-3xl font-bold mt-1">{stats.chantiersEnCours}</p>
        </div>
        <div onClick={() => setPage('equipe')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg">
          <p className="text-sm text-slate-500">Heures ce mois</p>
          <p className="text-3xl font-bold mt-1">{stats.heuresMois.toFixed(0)}h</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border">
          <div className="flex justify-between items-center px-5 py-4 border-b">
            <h3 className="font-semibold">🏗️ Chantiers en cours</h3>
            <button onClick={() => setPage('chantiers')} className="text-orange-500 text-sm">Voir tout →</button>
          </div>
          {enCours.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucun chantier</div>
          ) : (
            <div className="divide-y">
              {enCours.slice(0, 4).map(c => (
                <div key={c.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1"><p className="font-medium">{c.nom}</p></div>
                  <div className="w-32">
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-full bg-orange-500 rounded-full" style={{width: `${c.progression || 0}%`}} />
                    </div>
                  </div>
                  <span className="text-sm">{c.progression || 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border">
          <div className="flex justify-between items-center px-5 py-4 border-b">
            <h3 className="font-semibold">📅 Aujourd'hui</h3>
            <button onClick={() => setPage('planning')} className="text-orange-500 text-sm">Planning →</button>
          </div>
          <div className="p-4">
            {todayEvents.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Aucun événement</p>
            ) : (
              todayEvents.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center gap-3 py-2">
                  <span className="text-sm text-slate-500 w-12">{e.time}</span>
                  <span>{e.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
