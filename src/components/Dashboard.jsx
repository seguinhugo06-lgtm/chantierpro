import React from 'react';

export default function Dashboard({ stats, devis, chantiers, depenses, pointages, equipe, catalogue, setPage, setSelectedChantier, couleur, getChantierBilan, isDark, modeDiscret, entreprise }) {
  const formatMoney = (n) => modeDiscret ? '•••••' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => modeDiscret ? '••%' : (n || 0).toFixed(1) + '%';

  const getMargeColor = (taux) => taux >= 20 ? 'text-emerald-500' : taux >= 5 ? 'text-amber-500' : 'text-red-500';
  const getMargeBg = (taux) => taux >= 20 ? 'bg-emerald-500' : taux >= 5 ? 'bg-amber-500' : 'bg-red-500';

  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');
  let totalCA = 0, totalCouts = 0, totalMarge = 0;
  chantiersActifs.forEach(ch => {
    const b = getChantierBilan(ch.id);
    totalCA += b.caHT;
    totalCouts += b.coutMateriaux + b.coutMO + b.fraisFixes;
    totalMarge += b.marge;
  });
  const tauxMargeGlobal = totalCA > 0 ? (totalMarge / totalCA) * 100 : 0;

  const alertesStock = (catalogue || []).filter(c => c.stock_actuel !== undefined && c.stock_minimum !== undefined && c.stock_actuel < c.stock_minimum);

  const getMonthlyData = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthDevis = devis.filter(dv => {
        const dvDate = new Date(dv.date);
        return dvDate.getMonth() === d.getMonth() && dvDate.getFullYear() === d.getFullYear();
      });
      months.push({
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        ca: monthDevis.filter(dv => dv.statut === 'payee').reduce((s, dv) => s + (dv.total_ttc || 0), 0),
        devis: monthDevis.filter(dv => dv.type === 'devis').reduce((s, dv) => s + (dv.total_ttc || 0), 0)
      });
    }
    return months;
  };

  const monthlyData = getMonthlyData();
  const maxValue = Math.max(...monthlyData.map(m => Math.max(m.ca, m.devis)), 1);

  const goToChantier = (chantierId) => {
    if (setSelectedChantier) setSelectedChantier(chantierId);
    setPage('chantiers');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => setPage('devis')} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium shadow-lg" style={{background: couleur}}>+ Nouveau devis</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl p-5 border shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💰</span>
            <span className={`w-2 h-2 rounded-full ${getMargeBg(tauxMargeGlobal)}`}></span>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">CA en cours</p>
          <p className="text-2xl font-bold mt-1" style={{color: couleur}}>{formatMoney(totalCA)}</p>
          <p className="text-xs text-slate-400 mt-1">Marge: {formatPct(tauxMargeGlobal)}</p>
        </div>

        <div className={`${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl p-5 border shadow-sm cursor-pointer hover:shadow-md`} onClick={() => setPage('devis')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📄</span>
            {stats.devisAttente > 0 && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{stats.devisAttente}</span>}
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Devis en attente</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">{stats.devisAttente}</p>
        </div>

        <div className={`${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl p-5 border shadow-sm cursor-pointer hover:shadow-md`} onClick={() => setPage('chantiers')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🏗️</span>
            {stats.chantiersEnCours > 0 && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{stats.chantiersEnCours}</span>}
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Chantiers actifs</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{stats.chantiersEnCours}</p>
        </div>

        <div className={`${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl p-5 border shadow-sm`}>
          <div className="flex items-center justify-between mb-3"><span className="text-2xl">✅</span></div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Encaissé ce mois</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{formatMoney(stats.caMois)}</p>
          <p className="text-xs text-slate-400 mt-1">À encaisser: {formatMoney(stats.enAttente)}</p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6`}>
        <h3 className="font-semibold mb-4">📈 Évolution (6 mois)</h3>
        <div className="flex items-end gap-3 h-40">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end justify-center h-32">
                <div className="w-4 rounded-t transition-all" style={{height: `${(m.ca / maxValue) * 100}%`, background: couleur, minHeight: m.ca > 0 ? '4px' : '0'}} title={`Encaissé: ${formatMoney(m.ca)}`} />
                <div className="w-4 bg-slate-200 rounded-t transition-all" style={{height: `${(m.devis / maxValue) * 100}%`, minHeight: m.devis > 0 ? '4px' : '0'}} title={`Devis: ${formatMoney(m.devis)}`} />
              </div>
              <span className="text-xs text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-4 justify-center text-xs">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{background: couleur}}></span> Encaissé</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-200"></span> Devis émis</span>
        </div>
      </div>

      {alertesStock.length > 0 && (
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">📦 Alertes Stock</h3>
            <button onClick={() => setPage('catalogue')} className="text-xs" style={{color: couleur}}>Catalogue →</button>
          </div>
          <div className="flex gap-3 flex-wrap">
            {alertesStock.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100" onClick={() => setPage('catalogue')}>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-sm font-medium">{item.nom}</span>
                <span className="text-xs text-red-600">{item.stock_actuel}/{item.stock_minimum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">🏗️ Rentabilité par Chantier</h3>
          <button onClick={() => setPage('chantiers')} className="text-xs" style={{color: couleur}}>Voir tout →</button>
        </div>
        {chantiersActifs.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Aucun chantier en cours</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {chantiersActifs.slice(0, 4).map(ch => {
              const bilan = getChantierBilan(ch.id);
              const margePrevueDevis = devis.filter(d => d.chantier_id === ch.id && d.statut === 'accepte').reduce((s, d) => s + (d.margePrevue || 0), 0);
              const ecart = bilan.marge - margePrevueDevis;
              const progress = ch.taches?.length > 0 ? (ch.taches.filter(t => t.done).length / ch.taches.length) * 100 : 0;
              
              return (
                <div key={ch.id} onClick={() => goToChantier(ch.id)} className={`${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gradient-to-br from-slate-50 to-white hover:shadow-lg'} rounded-xl p-4 cursor-pointer transition-all border`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{ch.nom}</h4>
                      <p className="text-xs text-slate-500">{bilan.heuresTotal}h pointées</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-sm font-bold ${getMargeColor(bilan.tauxMarge)}`}>
                      {formatPct(bilan.tauxMarge)}
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full" style={{width: `${progress}%`, background: couleur}}></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-xs text-slate-500">CA</p><p className="text-sm font-bold" style={{color: couleur}}>{formatMoney(bilan.caHT)}</p></div>
                    <div><p className="text-xs text-slate-500">Coûts</p><p className="text-sm font-bold text-red-500">{formatMoney(bilan.coutMateriaux + bilan.coutMO)}</p></div>
                    <div><p className="text-xs text-slate-500">Marge</p><p className={`text-sm font-bold ${getMargeColor(bilan.tauxMarge)}`}>{formatMoney(bilan.marge)}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">📄 Derniers documents</h3>
            <button onClick={() => setPage('devis')} className="text-xs" style={{color: couleur}}>Voir →</button>
          </div>
          <div className="space-y-2">
            {devis.slice(0, 4).map(d => {
              const statusIcon = { brouillon: '⚪', envoye: '🟡', accepte: '✅', payee: '💰', refuse: '❌' }[d.statut] || '📄';
              return (
                <div key={d.id} onClick={() => setPage('devis')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                  <span>{statusIcon}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{d.numero}</p><p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
                  <p className="font-bold text-sm">{formatMoney(d.total_ttc)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">👷 Heures récentes</h3>
            <button onClick={() => setPage('equipe')} className="text-xs" style={{color: couleur}}>Voir →</button>
          </div>
          <div className="space-y-2">
            {pointages.slice(0, 4).map(p => {
              const emp = equipe.find(e => e.id === p.employeId);
              const ch = chantiers.find(c => c.id === p.chantierId);
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <span>{p.approuve ? '✅' : '⏳'}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{emp?.nom} {emp?.prenom}</p><p className="text-xs text-slate-500 truncate">{ch?.nom}</p></div>
                  <div className="text-right"><p className="font-bold text-sm">{p.heures}h</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
