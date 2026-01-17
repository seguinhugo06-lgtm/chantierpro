import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Hammer, Calendar, Users, Eye, EyeOff } from 'lucide-react';

const DEMO_CA = [{ mois: 'août', ca: 4200 }, { mois: 'sept.', ca: 5100 }, { mois: 'oct.', ca: 3800 }, { mois: 'nov.', ca: 6500 }, { mois: 'déc.', ca: 4700 }, { mois: 'janv.', ca: 3885 }];
const DEMO_MARGES = [{ nom: 'Rénovation SDB', marge: 67, id: 'd1' }, { nom: 'Cuisine moderne', marge: 52, id: 'd2' }, { nom: 'Peinture T3', marge: 45, id: 'd3' }, { nom: 'Parquet salon', marge: 38, id: 'd4' }, { nom: 'Terrasse bois', marge: 28, id: 'd5' }];

export default function Dashboard({ chantiers = [], clients = [], devis = [], depenses = [], pointages = [], equipe = [], getChantierBilan, couleur, modeDiscret, setModeDiscret, setActiveModule, setSelectedChantier, setPage, setSelectedDevis, setCreateMode, isDark }) {
  // Theme classes
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
    const margesChantiers = safeChantiers.map(ch => ({ nom: (ch.nom || '').substring(0, 14), marge: getChantierBilan?.(ch.id)?.tauxMarge || 0, id: ch.id })).sort((a, b) => b.marge - a.marge);
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
    return { caParMois: hasRealData ? caParMois : DEMO_CA.map((d, i) => ({ ...d, fill: i === 5 ? couleur : '#94a3b8' })), margesChantiers: margesChantiers.length > 0 ? margesChantiers : DEMO_MARGES, hasRealData, totalCA: hasRealData ? totalCA : 15200, marge: hasRealData ? marge : 8700, tauxMarge: hasRealData ? tauxMarge : 57.3, encaisse: hasRealData ? encaisse : 11390, enAttente: hasRealData ? enAttente : 3810, chantiersActifs, devisEnAttente, tendance: hasRealData ? tendance : 15 };
  }, [safeChantiers, safeDevis, safeDepenses, safePointages, safeEquipe, getChantierBilan, couleur]);

  const actions = useMemo(() => {
    const items = [], now = new Date();
    safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `d-${d.id}`, type: 'devis', icon: FileText, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} · ${(d.total_ttc || 0).toLocaleString()}€`, priority: days > 7 ? 'urgent' : days > 3 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
    });
    safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `f-${d.id}`, type: 'facture', icon: DollarSign, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} · ${(d.total_ttc || 0).toLocaleString()}€`, priority: days > 30 ? 'urgent' : days > 15 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
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
  const formatMoney = (n) => modeDiscret ? '·····' : `${(n || 0).toLocaleString('fr-FR')} €`;
  const getMargeColor = (m) => m >= 50 ? '#10b981' : m >= 30 ? '#f59e0b' : '#ef4444';

  // Classes conditionnelles pour le thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const btnBg = isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200';

  const KPICard = ({ icon: Icon, label, value, sub, trend, color, detail }) => (
    <div className={`rounded-2xl border p-5 ${cardBg} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}20` }}><Icon size={22} style={{ color }} /></div>
        {trend !== undefined && <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${trend >= 0 ? (isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800')}`}>{trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{trend >= 0 ? '+' : ''}{trend.toFixed(0)}%</div>}
      </div>
      <p className={`text-sm ${textSecondary} mt-3`}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className={`text-xs ${textSecondary} mt-1`}>{sub}</p>}
      {detail && <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} space-y-1 text-xs ${textSecondary}`}>{detail}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Tableau de bord</h1>
          <p className={textSecondary}>Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-3">
          {!stats.hasRealData && <span className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'}`}> Données démo</span>}
          <button onClick={() => setModeDiscret(!modeDiscret)} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${btnBg}`}>{modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}{modeDiscret ? 'Afficher' : 'Masquer'}</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Chiffre d'affaires" value={formatMoney(stats.totalCA)} trend={stats.tendance} color={couleur} />
        <KPICard icon={TrendingUp} label="Marge nette" value={formatMoney(stats.marge)} sub={modeDiscret ? '··%' : `${stats.tauxMarge.toFixed(1)}%`} color={stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444'} />
        <KPICard icon={CheckCircle} label="Encaissé" value={formatMoney(stats.encaisse)} color="#10b981" />
        <KPICard icon={Clock} label="En attente" value={formatMoney(stats.enAttente)} color="#f59e0b" detail={!modeDiscret && <><p>· {stats.chantiersActifs} chantiers en cours</p><p>· {stats.devisEnAttente} devis en attente</p></>} />
      </div>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><DollarSign size={18} style={{ color: couleur }} />CA sur 6 mois</h3>
          {!modeDiscret ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.caParMois}>
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={[0, 'auto']} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} €`, 'CA']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' }} />
                <Bar dataKey="ca" radius={[8, 8, 0, 0]}>{stats.caParMois.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={`h-[220px] flex items-center justify-center ${textSecondary}`}><EyeOff size={32} className="mr-2" />Masqué</div>}
        </div>

        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}>
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <TrendingUp size={16} className="text-white" />
              </div>
              Rentabilité Chantiers
            </h3>
            {stats.margesChantiers.length > 0 && !modeDiscret && (
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textSecondary}`}>
                {stats.margesChantiers.length} chantier{stats.margesChantiers.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {modeDiscret ? (
            <div className={`h-[220px] flex items-center justify-center ${textSecondary}`}><EyeOff size={32} className="mr-2" />Masqué</div>
          ) : stats.margesChantiers.length === 0 ? (
            <div className={`h-[220px] flex flex-col items-center justify-center ${textSecondary}`}>
              <Hammer size={40} className="mb-3 opacity-30" />
              <p>Aucun chantier</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {stats.margesChantiers.slice(0, 6).map((ch, idx) => {
                const bilan = getChantierBilan?.(ch.id);
                const ca = bilan?.caHT || 0;
                const margeAmount = bilan?.marge || 0;
                const isPositive = ch.marge >= 0;
                const isGood = ch.marge >= 30;
                const isWarning = ch.marge >= 0 && ch.marge < 15;
                const isBad = ch.marge < 0;
                return (
                  <div
                    key={ch.id}
                    onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }}
                    className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                      isDark
                        ? `border-slate-700 hover:border-slate-600 ${isBad ? 'bg-red-900/20' : isGood ? 'bg-emerald-900/10' : 'bg-slate-800/50'}`
                        : `border-slate-100 hover:border-slate-200 ${isBad ? 'bg-red-50' : isGood ? 'bg-emerald-50/50' : 'bg-slate-50/50'}`
                    } hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-sm font-medium ${textPrimary} truncate`}>{ch.nom}</span>
                        {idx === 0 && isGood && <span className="text-xs">🏆</span>}
                        {isBad && <span className="text-xs">⚠️</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isBad ? 'bg-red-100 text-red-700' : isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ch.marge.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden bg-slate-200">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                          isBad ? 'bg-gradient-to-r from-red-500 to-red-400'
                          : isGood ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                        }`}
                        style={{ width: `${Math.min(Math.max(ch.marge, 0), 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${textMuted}`}>
                        CA: {formatMoney(ca)}
                      </span>
                      <span className={`text-xs font-medium ${isBad ? 'text-red-500' : isGood ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isPositive ? '+' : ''}{formatMoney(margeAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions + Top/Flop */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}><AlertCircle size={18} style={{ color: couleur }} />À faire aujourd'hui{actions.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: couleur }}>{actions.length}</span>}</h3>
            <div className="flex gap-1">{[['all', 'Tout'], ['devis', 'Devis'], ['facture', 'Factures'], ['alerte', 'Alertes']].map(([k, v]) => <button key={k} onClick={() => setTodoFilter(k)} className={`px-3 py-1 rounded-lg text-xs font-medium ${todoFilter === k ? 'text-white' : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`} style={todoFilter === k ? { background: couleur } : {}}>{v}</button>)}</div>
          </div>
          {filteredActions.length === 0 ? (
            <div className={`rounded-2xl p-8 text-center border ${isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}><div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}><CheckCircle size={32} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} /></div><h4 className={`text-lg font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>Tout est à jour ! </h4></div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">{filteredActions.map(a => {
              const pBg = a.priority === 'urgent' ? (isDark ? 'bg-red-900/30' : 'bg-red-50') : a.priority === 'high' ? (isDark ? 'bg-orange-900/30' : 'bg-orange-50') : (isDark ? 'bg-slate-800' : 'bg-white');
              const pBorder = a.priority === 'urgent' ? 'border-l-4 border-red-500' : a.priority === 'high' ? 'border-l-4 border-orange-400' : 'border-l-4 border-slate-200';
              const iconBg = a.priority === 'urgent' ? (isDark ? 'bg-red-900/50' : 'bg-red-100') : a.priority === 'high' ? (isDark ? 'bg-orange-900/50' : 'bg-orange-100') : (isDark ? 'bg-slate-700' : 'bg-slate-100');
              const iconColor = a.priority === 'urgent' ? (isDark ? 'text-red-400' : 'text-red-600') : a.priority === 'high' ? (isDark ? 'text-orange-400' : 'text-orange-600') : 'text-slate-500';
              return (
                <div key={a.id} onClick={a.action} className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:shadow-md transition-all ${pBorder} ${pBg}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}><a.icon size={20} className={iconColor} /></div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className={`font-medium truncate ${textPrimary}`}>{a.title}</p>{a.priority === 'urgent' && <span className="px-2 py-0.5 text-xs font-bold text-white rounded bg-red-500 animate-pulse">URGENT</span>}</div><p className={`text-sm ${textSecondary} truncate`}>{a.desc}</p></div>
                  {a.days !== undefined && <span className={`text-xs ${textSecondary}`}>{a.days}j</span>}
                </div>
              );
            })}</div>
          )}
        </div>

        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}> Top Rentabilité</h3>
            {top3.length === 0 ? <p className={`text-center ${textSecondary} py-4`}>Aucun chantier</p> : top3.map((ch, i) => (
              <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3"><span className="text-xl">{['', '', ''][i]}</span><p className={`font-medium text-sm ${textPrimary}`}>{ch.nom}</p></div>
                <span className="font-bold" style={{ color: getMargeColor(ch.marge) }}>{ch.marge.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          {aSurveiller.length > 0 && (
            <div className={`rounded-2xl border p-5 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-800'}`}>⚠️  À surveiller</h3>
              {aSurveiller.slice(0, 3).map(ch => (
                <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }} className={`flex items-center justify-between p-3 rounded-xl mb-2 cursor-pointer hover:shadow-sm border ${isDark ? 'bg-slate-800 border-red-900' : 'bg-white border-red-100'}`}>
                  <p className={`font-medium text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>{ch.nom}</p>
                  <span className={`text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{ch.marge.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ icon: FileText, label: 'Nouveau devis', sub: `${stats.devisEnAttente} en attente`, color: '#3b82f6', target: 'devis', create: 'devis' }, { icon: Hammer, label: 'Nouveau chantier', sub: `${stats.chantiersActifs} actifs`, color: couleur, target: 'chantiers', create: 'chantier' }, { icon: Users, label: 'Nouveau client', sub: `${safeClients.length} clients`, color: '#10b981', target: 'clients', create: 'client' }, { icon: Calendar, label: 'Planning', sub: 'Voir agenda', color: '#8b5cf6', target: 'planning' }].map(b => (
          <button key={b.target} onClick={() => { if (b.create && setCreateMode) setCreateMode(p => ({...p, [b.create]: true})); setPage?.(b.target); }} className={`flex flex-col items-center gap-2 p-4 rounded-xl border hover:shadow-md transition-all ${cardBg}`}>
            <b.icon size={24} style={{ color: b.color }} />
            <span className={`text-sm font-medium ${textPrimary}`}>{b.label}</span>
            <span className={`text-xs ${textSecondary}`}>{b.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
