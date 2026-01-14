import React from 'react';

export default function Dashboard({ stats, devis, chantiers, depenses, pointages, equipe, setPage, couleur, getChantierBilan, isDark, modeDiscret, entreprise }) {
  const formatMoney = (n) => modeDiscret ? '•••••' : (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const formatPct = (n) => modeDiscret ? '••%' : (n || 0).toFixed(1) + '%';

  // Couleur selon le taux de marge
  const getMargeColor = (taux) => {
    if (taux >= 20) return 'text-emerald-600';
    if (taux >= 5) return 'text-amber-500';
    return 'text-red-600';
  };

  const getMargeBg = (taux) => {
    if (taux >= 20) return 'bg-emerald-100';
    if (taux >= 5) return 'bg-amber-100';
    return 'bg-red-100';
  };

  // Stats globales
  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');
  let totalCA = 0, totalCouts = 0, totalMarge = 0;
  chantiersActifs.forEach(ch => {
    const b = getChantierBilan(ch.id);
    totalCA += b.caHT;
    totalCouts += b.coutMateriaux + b.coutMO + b.fraisFixes;
    totalMarge += b.marge;
  });
  const tauxMargeGlobal = totalCA > 0 ? (totalMarge / totalCA) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <button onClick={() => setPage('devis')} className="px-4 py-2 text-white rounded-xl text-sm" style={{background: couleur}}>+ Nouveau devis</button>
      </div>

      {/* Widget Santé Financière Global */}
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            💰 Santé Financière Globale
          </h2>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${getMargeBg(tauxMargeGlobal)} ${getMargeColor(tauxMargeGlobal)}`}>
            {formatPct(tauxMargeGlobal)} marge
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-500 mb-1">CA HT Chantiers</p>
            <p className="text-xl font-bold" style={{color: couleur}}>{formatMoney(totalCA)}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-500 mb-1">Coûts Totaux</p>
            <p className="text-xl font-bold text-red-500">{formatMoney(totalCouts)}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-500 mb-1">Marge Nette</p>
            <p className={`text-xl font-bold ${getMargeColor(tauxMargeGlobal)}`}>{formatMoney(totalMarge)}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-500 mb-1">Factures Payées</p>
            <p className="text-xl font-bold text-emerald-600">{formatMoney(stats.caMois)}</p>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <p className="text-sm text-slate-500 mb-1">Devis en attente</p>
          <p className="text-3xl font-bold text-amber-500">{stats.devisAttente}</p>
        </div>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <p className="text-sm text-slate-500 mb-1">Chantiers actifs</p>
          <p className="text-3xl font-bold text-blue-500">{stats.chantiersEnCours}</p>
        </div>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <p className="text-sm text-slate-500 mb-1">À encaisser</p>
          <p className="text-3xl font-bold text-purple-500">{formatMoney(stats.enAttente)}</p>
        </div>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <p className="text-sm text-slate-500 mb-1">Taux frais structure</p>
          <p className="text-3xl font-bold">{entreprise.tauxFraisStructure || 15}%</p>
        </div>
      </div>

      {/* Rentabilité par chantier */}
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2">🏗️ Rentabilité par Chantier</h3>
        {chantiersActifs.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Aucun chantier en cours</p>
        ) : (
          <div className="space-y-4">
            {chantiersActifs.map(ch => {
              const bilan = getChantierBilan(ch.id);
              const ecart = bilan.tauxMarge - (ch.margePrevisionnelle || 25);
              return (
                <div key={ch.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{ch.nom}</h4>
                      <p className="text-xs text-slate-500">Marge prévue: {ch.margePrevisionnelle || 25}%</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMargeBg(bilan.tauxMarge)} ${getMargeColor(bilan.tauxMarge)}`}>
                        {formatPct(bilan.tauxMarge)}
                      </span>
                      {!modeDiscret && (
                        <p className={`text-xs mt-1 ${ecart >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {ecart >= 0 ? '↑' : '↓'} {Math.abs(ecart).toFixed(1)}% vs prévu
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="text-slate-500">CA HT</p>
                      <p className="font-semibold" style={{color: couleur}}>{formatMoney(bilan.caHT)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Matériaux</p>
                      <p className="font-semibold text-red-500">{formatMoney(bilan.coutMateriaux)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">MO ({bilan.heuresTotal}h)</p>
                      <p className="font-semibold text-blue-500">{formatMoney(bilan.coutMO)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Marge</p>
                      <p className={`font-semibold ${getMargeColor(bilan.tauxMarge)}`}>{formatMoney(bilan.marge)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Derniers documents */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">📄 Derniers devis</h3>
            <button onClick={() => setPage('devis')} className="text-sm" style={{color: couleur}}>Voir tout →</button>
          </div>
          <div className="space-y-2">
            {devis.filter(d => d.type === 'devis').slice(0, 4).map(d => {
              const statusIcon = d.statut === 'accepte' ? '✅' : d.statut === 'envoye' ? '🟡' : '⚪';
              return (
                <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <span>{statusIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{d.numero}</p>
                    <p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <p className="font-bold">{formatMoney(d.total_ttc)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">👷 Heures récentes</h3>
            <button onClick={() => setPage('equipe')} className="text-sm" style={{color: couleur}}>Voir tout →</button>
          </div>
          <div className="space-y-2">
            {pointages.slice(0, 4).map(p => {
              const emp = equipe.find(e => e.id === p.employeId);
              const ch = chantiers.find(c => c.id === p.chantierId);
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <span>{p.approuve ? '✅' : '⏳'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{emp?.nom} {emp?.prenom}</p>
                    <p className="text-xs text-slate-500 truncate">{ch?.nom}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{p.heures}h</p>
                    {!modeDiscret && <p className="text-xs text-slate-500">{formatMoney((p.heures || 0) * (emp?.coutHoraireCharge || 35))}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
