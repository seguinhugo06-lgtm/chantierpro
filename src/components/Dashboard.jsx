import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Building2, Calendar, Users, Eye, EyeOff } from 'lucide-react';

const DEMO_CA = [{ mois: 'août', ca: 4200 }, { mois: 'sept.', ca: 5100 }, { mois: 'oct.', ca: 3800 }, { mois: 'nov.', ca: 6500 }, { mois: 'déc.', ca: 4700 }, { mois: 'janv.', ca: 3885 }];
const DEMO_MARGES = [{ nom: 'Rénovation SDB', marge: 67, id: 'd1' }, { nom: 'Cuisine moderne', marge: 52, id: 'd2' }, { nom: 'Peinture T3', marge: 45, id: 'd3' }, { nom: 'Parquet salon', marge: 38, id: 'd4' }, { nom: 'Terrasse bois', marge: 28, id: 'd5' }];

export default function Dashboard({ chantiers = [], clients = [], devis = [], depenses = [], pointages = [], equipe = [], getChantierBilan, couleur, modeDiscret, setModeDiscret, setActiveModule, setSelectedChantier, setPage, isDark }) {
  const [todoFilter, setTodoFilter] = useState('all');
  const safeChantiers = chantiers || [], safeClients = clients || [], safeDevis = devis || [], safeDepenses = depenses || [], safePointages = pointages || [], safeEquipe = equipe || [];

  // Variables thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const btnBg = isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

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
      items.push({ id: `d-${d.id}`, type: 'devis', icon: FileText, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} • ${(d.total_ttc || 0).toLocaleString()} €`, priority: days > 7 ? 'urgent' : days > 3 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
    });
    safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `f-${d.id}`, type: 'facture', icon: DollarSign, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} • ${(d.total_ttc || 0).toLocaleString()} €`, priority: days > 30 ? 'urgent' : days > 15 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Tableau de bord</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setModeDiscret?.(!modeDiscret)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${modeDiscret ? 'bg-amber-100 text-amber-700' : btnBg}`}>
            {modeDiscret ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">{modeDiscret ? 'Discret' : 'Visible'}</span>
          </button>
        </div>
      </div>

      {!stats.hasRealData && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
          <AlertCircle size={20} className="text-amber-500" />
          <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Données de démonstration. Créez vos premiers devis pour voir vos vraies statistiques.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="CA Total" value={formatMoney(stats.totalCA)} trend={stats.tendance} color={couleur} sub={`dont ${formatMoney(stats.encaisse)} encaissé`} />
        <KPICard icon={TrendingUp} label="Marge globale" value={modeDiscret ? '••%' : `${stats.tauxMarge.toFixed(0)}%`} color={getMargeColor(stats.tauxMarge)} sub={`${formatMoney(stats.marge)} de bénéfice`} />
        <KPICard icon={Clock} label="En attente" value={formatMoney(stats.enAttente)} color="#f59e0b" sub={`${stats.devisEnAttente} devis à relancer`} />
        <KPICard icon={Building2} label="Chantiers actifs" value={stats.chantiersActifs} color="#3b82f6" sub={`${safeChantiers.filter(c => c.statut === 'planifie').length} planifiés`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${textPrimary}`}>CA sur 6 mois</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.caParMois} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="mois" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} €`, 'CA']} contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ca" radius={[6, 6, 0, 0]}>{stats.caParMois.map((entry, i) => <Cell key={i} fill={entry.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h3 className={`font-semibold mb-4 ${textPrimary}`}>Marges par chantier</h3>
          <div className="space-y-3">
            {top3.map((ch, i) => (
              <div key={ch.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${hoverBg}`} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0"><p className={`font-medium truncate ${textPrimary}`}>{ch.nom}</p></div>
                <span className="font-bold" style={{ color: getMargeColor(ch.marge) }}>{ch.marge.toFixed(0)}%</span>
              </div>
            ))}
            {aSurveiller.length > 0 && (
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <p className={`text-xs ${textSecondary} mb-2 flex items-center gap-2`}><AlertCircle size={14} /> À surveiller</p>
                {aSurveiller.slice(0, 2).map(ch => (
                  <div key={ch.id} className={`flex items-center justify-between py-2 ${textSecondary}`}>
                    <span className="truncate text-sm">{ch.nom}</span>
                    <span className="text-red-500 font-medium">{ch.marge.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}><Clock size={18} /> À faire aujourd'hui <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{actions.length}</span></h3>
          <div className="flex gap-1">
            {[['all', 'Tout'], ['devis', 'Devis'], ['facture', 'Factures'], ['alerte', 'Alertes']].map(([k, v]) => (
              <button key={k} onClick={() => setTodoFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${todoFilter === k ? 'text-white' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} style={todoFilter === k ? { background: couleur } : {}}>{v}</button>
            ))}
          </div>
        </div>
        {filteredActions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={40} className="mx-auto mb-2 text-emerald-500" />
            <p className={textSecondary}>Aucune action en attente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredActions.slice(0, 5).map(action => (
              <div key={action.id} onClick={action.action} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer ${hoverBg}`}>
                <div className={`p-2 rounded-lg ${action.priority === 'urgent' ? 'bg-red-100 text-red-600' : action.priority === 'high' ? 'bg-amber-100 text-amber-600' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <action.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${textPrimary}`}>{action.title}</p>
                  <p className={`text-sm ${textSecondary}`}>{action.desc}</p>
                </div>
                {action.days !== undefined && <span className={`text-xs px-2 py-1 rounded-full ${action.priority === 'urgent' ? 'bg-red-100 text-red-700' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{action.days}j</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Nouveau devis', icon: FileText, page: 'devis', color: couleur, sub: `${stats.devisEnAttente} en attente` },
          { label: 'Nouveau chantier', icon: Building2, page: 'chantiers', color: '#3b82f6', sub: `${stats.chantiersActifs} actifs` },
          { label: 'Nouveau client', icon: Users, page: 'clients', color: '#10b981', sub: `${safeClients.length} clients` },
          { label: 'Planning', icon: Calendar, page: 'planning', color: '#8b5cf6', sub: 'Voir agenda' },
        ].map(item => (
          <button key={item.label} onClick={() => setPage?.(item.page)} className={`rounded-2xl border p-5 text-left ${cardBg} hover:shadow-md transition-all group`}>
            <div className="p-2.5 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform" style={{ background: `${item.color}20` }}>
              <item.icon size={22} style={{ color: item.color }} />
            </div>
            <p className={`font-medium ${textPrimary}`}>{item.label}</p>
            <p className={`text-sm ${textSecondary}`}>{item.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
