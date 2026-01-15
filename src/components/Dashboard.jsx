import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Hammer, Calendar, Users, Eye, EyeOff } from 'lucide-react';

// Données démo réalistes
const DEMO_CA = [{ mois: 'août', ca: 4200 }, { mois: 'sept.', ca: 5100 }, { mois: 'oct.', ca: 3800 }, { mois: 'nov.', ca: 6500 }, { mois: 'déc.', ca: 4700 }, { mois: 'janv.', ca: 3885 }];
const DEMO_MARGES = [{ nom: 'Rénovation SDB', marge: 67, id: 'd1' }, { nom: 'Cuisine moderne', marge: 52, id: 'd2' }, { nom: 'Peinture T3', marge: 45, id: 'd3' }, { nom: 'Parquet salon', marge: 38, id: 'd4' }, { nom: 'Terrasse bois', marge: 28, id: 'd5' }];

export default function Dashboard({ chantiers = [], clients = [], devis = [], depenses = [], pointages = [], equipe = [], getChantierBilan, couleur, modeDiscret, setModeDiscret, setActiveModule, setSelectedChantier, setPage }) {
  const [todoFilter, setTodoFilter] = useState('all');
  const safeChantiers = chantiers || [], safeClients = clients || [], safeDevis = devis || [], safeDepenses = depenses || [], safePointages = pointages || [], safeEquipe = equipe || [];

  const stats = useMemo(() => {
    const now = new Date(), thisMonth = now.getMonth(), thisYear = now.getFullYear();
    const caParMois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const ca = safeDevis.filter(dv => { const dd = new Date(dv.date); return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear() && dv.statut !== 'brouillon'; }).reduce((s, dv) => s + (dv.total_ht || 0), 0);
      caParMois.push({ mois: d.toLocaleDateString('fr-FR', { month: 'short' }), ca, fill: i === 0 ? couleur : '#94a3b8' });
    }
    const hasRealData = caParMois.some(m => m.ca > 0);
    
    // CORRECTION: Afficher TOUS les chantiers, même avec marge 0
    const margesChantiers = safeChantiers.map(ch => ({ 
      nom: (ch.nom || '').substring(0, 14), 
      marge: getChantierBilan?.(ch.id)?.tauxMarge || 0, 
      id: ch.id 
    })).sort((a, b) => b.marge - a.marge);
    
    const totalCA = safeDevis.filter(d => d.type === 'facture' || d.statut === 'accepte').reduce((s, d) => s + (d.total_ht || 0), 0);
    const totalDep = safeDepenses.reduce((s, d) => s + (d.montant || 0), 0);
    const totalMO = safePointages.reduce((s, p) => s + (p.heures * (safeEquipe.find(e => e.id === p.employeId)?.coutHoraireCharge || 28)), 0);
    const marge = totalCA - totalDep - totalMO, tauxMarge = totalCA > 0 ? (marge / totalCA) * 100 : 0;
    const factures = safeDevis.filter(d => d.type === 'facture');
    const encaisse = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0);
    const enAttente = factures.filter(f => f.statut !== 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0);
    const chantiersActifs = safeChantiers.filter(c => c.statut === 'en_cours').length;
    const devisEnAttente = safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').length;
    const tendance = caParMois[4]?.ca > 0 ? ((caParMois[5]?.ca - caParMois[4]?.ca) / caParMois[4]?.ca) * 100 : 0;
    
    return { 
      caParMois: hasRealData ? caParMois : DEMO_CA.map((d, i) => ({ ...d, fill: i === 5 ? couleur : '#94a3b8' })), 
      margesChantiers: margesChantiers.length > 0 ? margesChantiers : DEMO_MARGES, 
      hasRealData, 
      totalCA: hasRealData ? totalCA : 15200, 
      marge: hasRealData ? marge : 8700, 
      tauxMarge: hasRealData ? tauxMarge : 57.3, 
      encaisse: hasRealData ? encaisse : 11390, 
      enAttente: hasRealData ? enAttente : 3810,
      chantiersActifs, 
      devisEnAttente, 
      tendance: hasRealData ? tendance : 15 
    };
  }, [safeChantiers, safeDevis, safeDepenses, safePointages, safeEquipe, getChantierBilan, couleur]);

  const actions = useMemo(() => {
    const items = [], now = new Date();
    safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `d-${d.id}`, type: 'devis', icon: FileText, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} • ${(d.total_ttc || 0).toLocaleString()}€`, priority: days > 7 ? 'urgent' : days > 3 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
    });
    safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `f-${d.id}`, type: 'facture', icon: DollarSign, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} • ${(d.total_ttc || 0).toLocaleString()}€`, priority: days > 30 ? 'urgent' : days > 15 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
    });
    safeChantiers.filter(ch => ch.statut === 'en_cours').forEach(ch => {
      const bilan = getChantierBilan?.(ch.id);
      if (bilan?.tauxMarge !== undefined && bilan.tauxMarge < 10) items.push({ id: `ch-${ch.id}`, type: 'alerte', icon: AlertCircle, title: `Marge faible: ${ch.nom.substring(0, 15)}`, desc: `${bilan.tauxMarge?.toFixed(0)}% de marge`, priority: bilan.tauxMarge < 0 ? 'urgent' : 'high', action: () => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); } });
    });
    return items.sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]));
  }, [safeDevis, safeClients, safeChantiers, getChantierBilan, setActiveModule, setSelectedChantier, setPage]);

  const filteredActions = todoFilter === 'all' ? actions : actions.filter(a => a.type === todoFilter);
  const top3 = stats.margesChantiers.filter(c => c.marge > 0).slice(0, 3);
  const aSurveiller = stats.margesChantiers.filter(c => c.marge < 15);
  const formatMoney = (n) => modeDiscret ? '•••••' : `${(n || 0).toLocaleString('fr-FR')} €`;
  const getMargeColor = (m) => m >= 50 ? '#10b981' : m >= 30 ? '#f59e0b' : '#ef4444';
  const pStyles = { urgent: { border: 'border-l-4 border-red-500', bg: 'bg-red-50 dark:bg-red-900/20', badge: 'bg-red-500 animate-pulse' }, high: { border: 'border-l-4 border-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', badge: 'bg-orange-500' }, normal: { border: 'border-l-4 border-slate-200 dark:border-slate-600', bg: 'bg-white dark:bg-slate-800', badge: '' } };

  // ACCESSIBILITÉ: Contraste minimum 4.5:1 selon WCAG 2.1 AA
  const KPICard = ({ icon: Icon, label, value, sub, trend, color, detail }) => (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}20` }}><Icon size={22} style={{ color }} /></div>
        {trend !== undefined && <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${trend >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>{trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{trend >= 0 ? '+' : ''}{trend.toFixed(0)}%</div>}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">{label}</p>
      <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
      {detail && <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs text-slate-600 dark:text-slate-400">{detail}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tableau de bord</h1>
          <p className="text-slate-600 dark:text-slate-400">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-3">
          {!stats.hasRealData && <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium">🏗️ Données démo</span>}
          <button onClick={() => setModeDiscret(!modeDiscret)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200">{modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}{modeDiscret ? 'Afficher' : 'Masquer'}</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Chiffre d'affaires" value={formatMoney(stats.totalCA)} trend={stats.tendance} color={couleur} />
        <KPICard icon={TrendingUp} label="Marge nette" value={formatMoney(stats.marge)} sub={modeDiscret ? '••%' : `${stats.tauxMarge.toFixed(1)}%`} color={stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444'} />
        <KPICard icon={CheckCircle} label="Encaissé" value={formatMoney(stats.encaisse)} color="#10b981" />
        <KPICard icon={Clock} label="En attente" value={formatMoney(stats.enAttente)} color="#f59e0b" detail={!modeDiscret && <><p>• {stats.chantiersActifs} chantiers en cours</p><p>• {stats.devisEnAttente} devis en attente</p></>} />
      </div>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><DollarSign size={18} style={{ color: couleur }} />CA sur 6 mois</h3>
          {!modeDiscret ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.caParMois}>
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={[0, 'auto']} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} €`, 'CA']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: '#fff' }} />
                <Bar dataKey="ca" radius={[8, 8, 0, 0]}>{stats.caParMois.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-slate-500 dark:text-slate-400"><EyeOff size={32} className="mr-2" />Masqué</div>}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><TrendingUp size={18} className="text-emerald-500" />Marges par chantier</h3>
          {!modeDiscret && stats.margesChantiers.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.margesChantiers.slice(0, 8)} layout="vertical" margin={{ left: 90 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis type="category" dataKey="nom" width={85} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Marge']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: '#fff' }} />
                <Bar dataKey="marge" radius={[0, 4, 4, 0]}>{stats.margesChantiers.slice(0, 8).map((e, i) => <Cell key={i} fill={getMargeColor(e.marge)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-slate-500 dark:text-slate-400">{modeDiscret ? <><EyeOff size={32} className="mr-2" />Masqué</> : 'Aucun chantier'}</div>}
        </div>
      </div>

      {/* Actions + Top/Flop */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-white"><AlertCircle size={18} style={{ color: couleur }} />À faire aujourd'hui{actions.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: couleur }}>{actions.length}</span>}</h3>
            <div className="flex gap-1">{[['all', 'Tout'], ['devis', 'Devis'], ['facture', 'Factures'], ['alerte', 'Alertes']].map(([k, v]) => <button key={k} onClick={() => setTodoFilter(k)} className={`px-3 py-1 rounded-lg text-xs font-medium ${todoFilter === k ? 'text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`} style={todoFilter === k ? { background: couleur } : {}}>{v}</button>)}</div>
          </div>
          {filteredActions.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" /></div><h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">Tout est à jour ! 🎉</h4></div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">{filteredActions.map(a => (
              <div key={a.id} onClick={a.action} className={`group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 cursor-pointer hover:shadow-md transition-all ${pStyles[a.priority].border} ${pStyles[a.priority].bg}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/40' : a.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}><a.icon size={20} className={a.priority === 'urgent' ? 'text-red-600 dark:text-red-400' : a.priority === 'high' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'} /></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-medium truncate text-slate-900 dark:text-white">{a.title}</p>{a.priority === 'urgent' && <span className={`px-2 py-0.5 text-xs font-bold text-white rounded ${pStyles.urgent.badge}`}>URGENT</span>}</div><p className="text-sm text-slate-600 dark:text-slate-400 truncate">{a.desc}</p></div>
                {a.days !== undefined && <span className="text-xs text-slate-500 dark:text-slate-400">{a.days}j</span>}
              </div>
            ))}</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">🏆 Top Rentabilité</h3>
            {top3.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-4">Aucun chantier</p> : top3.map((ch, i) => (
              <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors">
                <div className="flex items-center gap-3"><span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span><p className="font-medium text-sm text-slate-900 dark:text-white">{ch.nom}</p></div>
                <span className="font-bold" style={{ color: getMargeColor(ch.marge) }}>{ch.marge.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          {aSurveiller.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-red-800 dark:text-red-300">⚠️ À surveiller</h3>
              {aSurveiller.slice(0, 3).map(ch => (
                <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl mb-2 cursor-pointer hover:shadow-sm border border-red-100 dark:border-red-900">
                  <p className="font-medium text-sm text-red-800 dark:text-red-300">{ch.nom}</p>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{ch.marge.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides - CORRIGÉ: onClick fonctionne */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Nouveau devis', sub: `${stats.devisEnAttente} en attente`, color: '#3b82f6', target: 'devis' }, 
          { icon: Hammer, label: 'Nouveau chantier', sub: `${stats.chantiersActifs} actifs`, color: couleur, target: 'chantiers' }, 
          { icon: Users, label: 'Nouveau client', sub: `${safeClients.length} clients`, color: '#10b981', target: 'clients' }, 
          { icon: Calendar, label: 'Planning', sub: 'Voir agenda', color: '#8b5cf6', target: 'planning' }
        ].map(b => (
          <button 
            key={b.target} 
            onClick={() => { if (setPage) setPage(b.target); }}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all"
          >
            <b.icon size={24} style={{ color: b.color }} />
            <span className="text-sm font-medium text-slate-900 dark:text-white">{b.label}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{b.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
