import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function Dashboard({ stats, devis, chantiers, depenses, pointages, equipe, catalogue, setPage, setSelectedChantier, couleur, getChantierBilan, isDark, modeDiscret, entreprise, clients }) {
  const [loaded, setLoaded] = useState(false);
  const [actionsCompleted, setActionsCompleted] = useState({});
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const formatMoney = (n) => modeDiscret ? '•••••' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => modeDiscret ? '••%' : (n || 0).toFixed(1) + '%';
  const getMargeColor = (t) => t < 0 ? 'text-red-500' : t < 15 ? 'text-amber-500' : 'text-emerald-500';
  const getMargeBg = (t) => t < 0 ? 'bg-red-500' : t < 15 ? 'bg-amber-500' : 'bg-emerald-500';

  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');
  const chantiersTermines = chantiers.filter(c => c.statut === 'termine');
  let totalCA = 0, totalMarge = 0;
  chantiersActifs.forEach(ch => { const b = getChantierBilan(ch.id); totalCA += b.caHT; totalMarge += b.marge; });
  const tauxMargeGlobal = totalCA > 0 ? (totalMarge / totalCA) * 100 : 0;
  const alertesStock = (catalogue || []).filter(c => c.stock_actuel !== undefined && c.stock_seuil_alerte !== undefined && c.stock_actuel < c.stock_seuil_alerte);

  // Données 6 mois
  const getMonthlyData = () => {
    const months = []; const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthDevis = devis.filter(dv => { const dvDate = new Date(dv.date); return dvDate.getMonth() === d.getMonth() && dvDate.getFullYear() === d.getFullYear(); });
      months.push({ month: d.toLocaleDateString('fr-FR', { month: 'short' }), ca: monthDevis.filter(dv => dv.statut === 'payee').reduce((s, dv) => s + (dv.total_ttc || 0), 0), devis: monthDevis.filter(dv => dv.type === 'devis' && dv.statut !== 'payee').reduce((s, dv) => s + (dv.total_ttc || 0), 0) });
    }
    return months;
  };
  const monthlyData = getMonthlyData();

  const getMargesData = () => {
    const months = []; const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthChantiers = chantiers.filter(ch => { const chDate = new Date(ch.date_debut || ch.created_at); return chDate.getMonth() === d.getMonth() && chDate.getFullYear() === d.getFullYear(); });
      let marge = 0, count = 0;
      monthChantiers.forEach(ch => { const b = getChantierBilan(ch.id); if (b.caHT > 0) { marge += b.tauxMarge; count++; } });
      months.push({ month: d.toLocaleDateString('fr-FR', { month: 'short' }), marge: count > 0 ? marge / count : 0 });
    }
    return months;
  };
  const margesData = getMargesData();

  const getTrend = () => {
    const curr = monthlyData[5]?.ca || 0, prev = monthlyData[4]?.ca || 0;
    if (prev === 0) return curr > 0 ? { dir: 'up', pct: 100 } : null;
    const diff = ((curr - prev) / prev) * 100;
    return { dir: diff >= 0 ? 'up' : 'down', pct: Math.abs(diff).toFixed(0) };
  };
  const trend = getTrend();

  // Top 3 / Flop 3
  const getTop3 = () => [...chantiersActifs, ...chantiersTermines].map(ch => ({ ...ch, bilan: getChantierBilan(ch.id), client: clients?.find(c => c.id === ch.client_id) })).filter(ch => ch.bilan.caHT > 0).sort((a, b) => b.bilan.tauxMarge - a.bilan.tauxMarge).slice(0, 3);
  const getFlop3 = () => [...chantiersActifs, ...chantiersTermines].map(ch => ({ ...ch, bilan: getChantierBilan(ch.id) })).filter(ch => ch.bilan.caHT > 0 && ch.bilan.tauxMarge < 15).sort((a, b) => a.bilan.tauxMarge - b.bilan.tauxMarge).slice(0, 3);
  const top3 = getTop3(), flop3 = getFlop3();

  // Actions du jour
  const getActions = () => {
    const actions = [], now = new Date();
    devis.filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const days = Math.floor((now - new Date(d.date)) / 86400000);
      if (days > 7) actions.push({ id: `r_${d.id}`, type: 'finance', icon: '📄', text: `Relancer ${d.numero} (${days}j)`, action: () => setPage('devis'), priority: days > 15 ? 'high' : 'medium' });
    });
    devis.filter(d => d.type === 'facture' && d.statut === 'envoye').forEach(d => {
      const days = Math.floor((now - new Date(d.date)) / 86400000);
      if (days > 30) actions.push({ id: `i_${d.id}`, type: 'finance', icon: '💰', text: `${d.numero} impayée (${days}j)`, action: () => setPage('devis'), priority: 'high' });
    });
    const pEnAttente = pointages.filter(p => !p.approuve && !p.verrouille);
    if (pEnAttente.length > 0) actions.push({ id: 'pt', type: 'chantier', icon: '⏱️', text: `Valider ${pEnAttente.length} pointage(s)`, action: () => setPage('equipe'), priority: 'medium' });
    chantiersTermines.forEach(ch => { if (!devis.some(d => d.chantier_id === ch.id && d.type === 'facture')) actions.push({ id: `f_${ch.id}`, type: 'finance', icon: '🧾', text: `Facturer ${ch.nom}`, action: () => { setSelectedChantier(ch.id); setPage('chantiers'); }, priority: 'high' }); });
    if (alertesStock.length > 0) actions.push({ id: 'stk', type: 'admin', icon: '📦', text: `${alertesStock.length} article(s) stock faible`, action: () => setPage('catalogue'), priority: 'low' });
    return actions.slice(0, 5);
  };
  const actionsJour = getActions();
  const toggleAction = (id) => setActionsCompleted(p => ({ ...p, [id]: !p[id] }));

  const Sparkline = ({ data, color }) => { if (!data?.length) return null; const max = Math.max(...data, 1); const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(' '); return <svg viewBox="0 0 100 40" className="w-full h-8"><polyline fill="none" stroke={color} strokeWidth="2" points={pts} /></svg>; };
  const CustomTooltip = ({ active, payload, label }) => { if (!active || !payload) return null; return <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm shadow-lg"><p className="font-medium">{label}</p>{payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {formatMoney(p.value)}</p>)}</div>; };
  const goToChantier = (id) => { setSelectedChantier?.(id); setPage('chantiers'); };
  const anim = `transform transition-all duration-500 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex justify-between items-center flex-wrap gap-4 ${anim}`}>
        <div><h1 className="text-2xl font-bold">Bonjour{entreprise?.nom ? `, ${entreprise.nom.split(' ')[0]}` : ''} 👋</h1><p className="text-slate-500 text-sm">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
        <button onClick={() => setPage('devis')} className="px-5 py-2.5 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-95" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>+ Nouveau devis</button>
      </div>

      {/* Actions du jour */}
      {actionsJour.length > 0 && (
        <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 ${anim}`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3"><div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-xl">⚡</div><div><h3 className="font-semibold">À faire aujourd'hui</h3><p className="text-sm text-slate-500">{actionsJour.filter(a => !actionsCompleted[a.id]).length} action(s)</p></div></div>
            <div className="flex gap-2 text-xs flex-wrap"><span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">💰 ({actionsJour.filter(a => a.type === 'finance').length})</span><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">🏗️ ({actionsJour.filter(a => a.type === 'chantier').length})</span></div>
          </div>
          <div className="space-y-2">{actionsJour.map(a => (
            <div key={a.id} onClick={() => a.action()} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${actionsCompleted[a.id] ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-white dark:bg-slate-800 hover:shadow-md'}`}>
              <button onClick={e => { e.stopPropagation(); toggleAction(a.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${actionsCompleted[a.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{actionsCompleted[a.id] && '✓'}</button>
              <span className="text-xl">{a.icon}</span><span className={`flex-1 min-w-0 truncate ${actionsCompleted[a.id] ? 'line-through text-slate-400' : ''}`}>{a.text}</span>
              {a.priority === 'high' && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex-shrink-0">Urgent</span>}<span className="text-slate-400">→</span>
            </div>
          ))}</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CA */}
        <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-xl cursor-pointer group ${anim}`} style={{ background: `linear-gradient(135deg, ${couleur}, #ec4899)` }} onClick={() => setPage('chantiers')}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3"><div className="p-2 bg-white/20 rounded-xl">💰</div>{trend && <span className={`flex items-center gap-1 text-sm font-medium ${trend.dir === 'up' ? 'text-emerald-200' : 'text-red-200'}`}>{trend.dir === 'up' ? '↗️' : '↘️'} {trend.pct}%</span>}</div>
            <p className="text-sm text-white/80 mb-1">CA en Cours</p><p className="text-3xl font-bold">{formatMoney(totalCA)}</p>
            <p className={`text-sm mt-2 ${tauxMargeGlobal >= 15 ? 'text-emerald-200' : tauxMargeGlobal >= 0 ? 'text-amber-200' : 'text-red-200'}`}>Marge: {formatMoney(totalMarge)} ({formatPct(tauxMargeGlobal)})</p>
            <div className="mt-3"><Sparkline data={monthlyData.map(m => m.ca)} color="rgba(255,255,255,0.6)" /></div>
          </div>
        </div>
        {/* Devis */}
        <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-xl cursor-pointer group ${anim}`} style={{ background: isDark ? 'linear-gradient(135deg, #1e293b, #334155)' : 'linear-gradient(135deg, #fef3c7, #fde68a)' }} onClick={() => setPage('devis')}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3"><div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">📄</div>{stats.devisAttente > 0 && <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full animate-pulse">Action requise</span>}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Devis en Attente</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.devisAttente}</p>
            {stats.devisAttente > 0 && <p className="text-sm text-amber-600 mt-2">{devis.filter(d => d.type === 'devis' && d.statut === 'envoye' && (new Date() - new Date(d.date)) > 7 * 86400000).length} sans réponse &gt;7j</p>}
          </div>
        </div>
        {/* Chantiers */}
        <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-xl cursor-pointer group ${anim}`} style={{ background: isDark ? 'linear-gradient(135deg, #1e293b, #334155)' : 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }} onClick={() => setPage('chantiers')}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">🏗️</div>{chantiersActifs.some(ch => getChantierBilan(ch.id).tauxMarge < 0) && <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">⚠️ Alerte</span>}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Chantiers Actifs</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.chantiersEnCours}</p>
            <div className="flex gap-2 mt-2 flex-wrap"><span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{chantiersActifs.filter(ch => getChantierBilan(ch.id).tauxMarge >= 15).length} rentables</span><span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{chantiersActifs.filter(ch => getChantierBilan(ch.id).tauxMarge < 0).length} en perte</span></div>
          </div>
        </div>
        {/* Encaissé */}
        <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-xl cursor-pointer group ${anim}`} style={{ background: isDark ? 'linear-gradient(135deg, #1e293b, #334155)' : 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }} onClick={() => setPage('devis')}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3"><div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">✅</div></div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Encaissé ce Mois</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{formatMoney(stats.caMois)}</p>
            <p className="text-sm text-slate-500 mt-2">À encaisser: {formatMoney(stats.enAttente)}</p>
            {entreprise?.objectifMensuel > 0 && <div className="mt-2"><div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((stats.caMois / entreprise.objectifMensuel) * 100, 100)}%` }} /></div><p className="text-xs text-slate-500 mt-1">{((stats.caMois / entreprise.objectifMensuel) * 100).toFixed(0)}% de {formatMoney(entreprise.objectifMensuel)}</p></div>}
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${anim}`}>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2"><div><h3 className="font-semibold text-lg">📈 Évolution CA</h3><p className="text-sm text-slate-500">6 derniers mois</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: couleur }} /> Encaissé</span><span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-300" /> Devis</span></div></div>
          {monthlyData.every(m => m.ca === 0 && m.devis === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center"><div className="w-16 h-16 mb-4 rounded-full bg-orange-100 flex items-center justify-center text-2xl">📈</div><h3 className="text-lg font-semibold mb-2">Commencez à suivre votre CA</h3><p className="text-sm text-slate-500 max-w-sm mb-4">Créez votre premier devis pour voir les graphiques</p><button onClick={() => setPage('devis')} className="px-4 py-2 text-white rounded-xl" style={{ background: couleur }}>Créer un devis</button></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData} barGap={4}>
                <defs><linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={couleur} stopOpacity={1} /><stop offset="100%" stopColor={couleur} stopOpacity={0.6} /></linearGradient></defs>
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ca" name="Encaissé" fill="url(#caGrad)" radius={[6, 6, 0, 0]} animationDuration={1000} />
                <Bar dataKey="devis" name="Devis" fill="#CBD5E1" radius={[6, 6, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2"><div><h3 className="font-semibold text-lg">📊 Évolution Marges</h3><p className="text-sm text-slate-500">% moyen par mois</p></div><div className="text-right"><p className="text-2xl font-bold" style={{ color: couleur }}>{formatPct(margesData[5]?.marge || 0)}</p><p className="text-xs text-slate-500">ce mois</p></div></div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={margesData}>
              <defs><linearGradient id="margeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={couleur} stopOpacity={0.3} /><stop offset="100%" stopColor={couleur} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(0)}%`} domain={[0, 100]} />
              <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Marge']} contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="marge" stroke={couleur} strokeWidth={3} fill="url(#margeGrad)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2 text-xs"><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> &lt;15%</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> 15-30%</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> &gt;30%</span></div>
        </div>
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className={anim}><h2 className="text-xl font-bold mb-4">🏆 Top 3 Chantiers Rentables</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{top3.map((ch, i) => {
            const medals = ['🥇', '🥈', '🥉'], grads = ['from-amber-100 to-yellow-50 border-amber-300', 'from-slate-100 to-gray-50 border-slate-300', 'from-orange-100 to-amber-50 border-orange-300'];
            return (<div key={ch.id} onClick={() => goToChantier(ch.id)} className={`relative bg-gradient-to-br ${grads[i]} rounded-2xl border-2 p-5 cursor-pointer hover:shadow-lg transition-all`}><div className="absolute -top-3 -left-3 text-3xl">{medals[i]}</div><div className="ml-4"><h3 className="font-semibold text-lg truncate">{ch.nom}</h3><p className="text-sm text-slate-500 mb-3">{ch.client?.nom || 'Client'}</p><div className="flex items-end justify-between"><div><p className="text-xs text-slate-500">Marge</p><p className="text-2xl font-bold text-emerald-600">{formatPct(ch.bilan.tauxMarge)}</p></div><div className="text-right"><p className="text-xs text-slate-500">Bénéfice</p><p className="text-lg font-bold" style={{ color: couleur }}>{formatMoney(ch.bilan.marge)}</p></div></div></div></div>);
          })}</div>
        </div>
      )}

      {/* Flop 3 */}
      {flop3.length > 0 && (
        <div className={`${anim} bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800`}>
          <h3 className="font-semibold mb-3 text-red-700 dark:text-red-400">⚠️ Chantiers à surveiller</h3><p className="text-sm text-red-600 dark:text-red-400 mb-4">Analyse des dépassements recommandée</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{flop3.map(ch => (<div key={ch.id} onClick={() => goToChantier(ch.id)} className="bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"><p className="font-medium truncate">{ch.nom}</p><div className="flex justify-between items-center mt-2"><span className={`text-lg font-bold ${getMargeColor(ch.bilan.tauxMarge)}`}>{formatPct(ch.bilan.tauxMarge)}</span><span className="text-sm text-slate-500">{formatMoney(ch.bilan.marge)}</span></div></div>))}</div>
        </div>
      )}

      {/* Alertes Stock */}
      {alertesStock.length > 0 && (
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5 ${anim}`}>
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl">📦</div><div><h3 className="font-semibold">Stock sous tension</h3><p className="text-sm text-slate-500">{alertesStock.length} article(s) à commander</p></div></div><button onClick={() => setPage('catalogue')} className="text-sm font-medium" style={{ color: couleur }}>Catalogue →</button></div>
          <div className="flex gap-3 flex-wrap">{alertesStock.map(item => (<div key={item.id} onClick={() => setPage('catalogue')} className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 rounded-xl cursor-pointer hover:bg-red-100 transition-all"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="font-medium">{item.nom}</span><span className="text-red-600 text-sm">{item.stock_actuel}/{item.stock_seuil_alerte}</span></div>))}</div>
        </div>
      )}

      {/* Chantiers actifs */}
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-6 ${anim}`}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">🏗️ Suivi Chantiers Actifs</h3><button onClick={() => setPage('chantiers')} className="text-sm font-medium" style={{ color: couleur }}>Voir tout →</button></div>
        {chantiersActifs.length === 0 ? (<div className="text-center py-8"><p className="text-5xl mb-4">🏗️</p><p className="text-slate-500">Aucun chantier en cours</p><button onClick={() => setPage('chantiers')} className="mt-4 px-4 py-2 rounded-xl" style={{ background: `${couleur}20`, color: couleur }}>Créer un chantier</button></div>) : (
          <div className="grid md:grid-cols-2 gap-4">{chantiersActifs.slice(0, 4).map(ch => {
            const bilan = getChantierBilan(ch.id), progress = ch.taches?.length > 0 ? (ch.taches.filter(t => t.done).length / ch.taches.length) * 100 : 0;
            return (<div key={ch.id} onClick={() => goToChantier(ch.id)} className={`group relative ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gradient-to-br from-slate-50 to-white hover:shadow-lg'} rounded-xl p-4 cursor-pointer transition-all border`}><div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-orange-500/50 transition-colors" /><div className="relative z-10"><div className="flex items-start justify-between mb-3"><div className="flex-1 min-w-0"><h4 className="font-semibold truncate">{ch.nom}</h4><p className="text-xs text-slate-500">{bilan.heuresTotal}h • {ch.taches?.length || 0} tâches</p></div><div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getMargeColor(bilan.tauxMarge)}`} style={{ background: bilan.tauxMarge < 0 ? '#fef2f2' : bilan.tauxMarge < 15 ? '#fffbeb' : '#f0fdf4' }}>{formatPct(bilan.tauxMarge)}</div></div><div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mb-3"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: couleur }} /></div><div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-xs text-slate-500">CA</p><p className="text-sm font-bold" style={{ color: couleur }}>{formatMoney(bilan.caHT)}</p></div><div><p className="text-xs text-slate-500">Coûts</p><p className="text-sm font-bold text-red-500">{formatMoney(bilan.coutMateriaux + bilan.coutMO)}</p></div><div><p className="text-xs text-slate-500">Marge</p><p className={`text-sm font-bold ${getMargeColor(bilan.tauxMarge)}`}>{formatMoney(bilan.marge)}</p></div></div></div></div>);
          })}</div>
        )}
      </div>

      {/* Activité récente */}
      <div className={`grid md:grid-cols-2 gap-6 ${anim}`}>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">📄 Derniers documents</h3><button onClick={() => setPage('devis')} className="text-xs font-medium" style={{ color: couleur }}>Voir →</button></div>
          <div className="space-y-2">{devis.slice(0, 4).map(d => { const icon = { brouillon: '⚪', envoye: '🟡', accepte: '✅', payee: '💰', refuse: '❌' }[d.statut] || '📄'; return (<div key={d.id} onClick={() => setPage('devis')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><span className="text-lg">{icon}</span><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{d.numero}</p><p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p></div><p className="font-bold text-sm">{formatMoney(d.total_ttc)}</p></div>); })}{devis.length === 0 && <p className="text-center text-slate-500 py-4">Aucun document</p>}</div>
        </div>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl border p-5`}>
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">👷 Heures récentes</h3><button onClick={() => setPage('equipe')} className="text-xs font-medium" style={{ color: couleur }}>Voir →</button></div>
          <div className="space-y-2">{pointages.slice(0, 4).map(p => { const emp = equipe.find(e => e.id === p.employeId), ch = chantiers.find(c => c.id === p.chantierId); return (<div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><span className="text-lg">{p.verrouille ? '🔒' : p.approuve ? '✅' : '⏳'}</span><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{emp?.nom} {emp?.prenom}</p><p className="text-xs text-slate-500 truncate">{ch?.nom}</p></div><p className="font-bold text-sm" style={{ color: couleur }}>{p.heures}h</p></div>); })}{pointages.length === 0 && <p className="text-center text-slate-500 py-4">Aucun pointage</p>}</div>
        </div>
      </div>
    </div>
  );
}
