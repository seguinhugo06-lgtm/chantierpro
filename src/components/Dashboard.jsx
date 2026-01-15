import React, { useState, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Hammer, Calendar, Users, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function Dashboard({ chantiers = [], clients = [], devis = [], depenses = [], pointages = [], equipe = [], getChantierBilan, couleur, modeDiscret, setModeDiscret, setActiveModule, setSelectedChantier }) {
  const [todoFilter, setTodoFilter] = useState('all');

  // Gardes pour éviter les erreurs sur undefined
  const safeChantiers = chantiers || [];
  const safeClients = clients || [];
  const safeDevis = devis || [];
  const safeDepenses = depenses || [];
  const safePointages = pointages || [];
  const safeEquipe = equipe || [];

  // Calculs KPI
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // CA par mois (6 derniers mois)
    const caParMois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const moisLabel = d.toLocaleDateString('fr-FR', { month: 'short' });
      const devisMois = safeDevis.filter(dv => {
        const dd = new Date(dv.date || dv.created_at);
        return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear() && dv.statut !== 'brouillon';
      });
      const ca = devisMois.reduce((s, dv) => s + (dv.total_ht || 0), 0);
      caParMois.push({ mois: moisLabel, ca, fill: i === 0 ? couleur : '#64748b' });
    }

    // Marge par chantier
    const margesChantiers = safeChantiers.map(ch => {
      const bilan = getChantierBilan ? getChantierBilan(ch.id) : { tauxMarge: 0 };
      return { nom: (ch.nom || '').substring(0, 15), marge: bilan.tauxMarge, id: ch.id };
    }).sort((a, b) => b.marge - a.marge);

    // Totaux
    const totalCA = safeDevis.filter(d => d.type === 'facture' || d.statut === 'accepte').reduce((s, d) => s + (d.total_ht || 0), 0);
    const totalDepenses = safeDepenses.reduce((s, d) => s + (d.montant || 0), 0);
    const totalMO = safePointages.reduce((s, p) => {
      const emp = safeEquipe.find(e => e.id === p.employeId);
      return s + (p.heures * (emp?.coutHoraireCharge || 28));
    }, 0);
    const marge = totalCA - totalDepenses - totalMO;
    const tauxMarge = totalCA > 0 ? (marge / totalCA) * 100 : 0;

    // Encaissé vs En attente
    const factures = safeDevis.filter(d => d.type === 'facture');
    const encaisse = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0);
    const enAttente = factures.filter(f => f.statut !== 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0);

    // Chantiers actifs
    const chantiersActifs = safeChantiers.filter(c => c.statut === 'en_cours').length;

    // Tendance (vs mois précédent)
    const caMoisActuel = caParMois[5]?.ca || 0;
    const caMoisPrecedent = caParMois[4]?.ca || 0;
    const tendance = caMoisPrecedent > 0 ? ((caMoisActuel - caMoisPrecedent) / caMoisPrecedent) * 100 : 0;

    return { caParMois, margesChantiers, totalCA, marge, tauxMarge, encaisse, enAttente, chantiersActifs, tendance };
  }, [safeChantiers, safeDevis, safeDepenses, safePointages, safeEquipe, getChantierBilan, couleur]);

  // Actions du jour
  const actions = useMemo(() => {
    const items = [];
    
    // Devis en attente
    safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id);
      items.push({
        id: `devis-${d.id}`,
        type: 'devis',
        icon: FileText,
        title: `Relancer devis ${d.numero}`,
        description: client ? `${client.nom} - ${(d.total_ttc || 0).toLocaleString()}€` : `${(d.total_ttc || 0).toLocaleString()}€`,
        urgent: new Date(d.date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        action: () => { setActiveModule && setActiveModule('devis'); }
      });
    });

    // Factures impayées
    safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(f => {
      const client = safeClients.find(c => c.id === f.client_id);
      const age = Math.floor((Date.now() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        id: `facture-${f.id}`,
        type: 'facture',
        icon: DollarSign,
        title: `Facture ${f.numero} impayée`,
        description: client ? `${client.nom} - ${age}j` : `${age} jours`,
        urgent: age > 30,
        action: () => { setActiveModule && setActiveModule('devis'); }
      });
    });

    // Chantiers sans pointage cette semaine
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    safeChantiers.filter(c => c.statut === 'en_cours').forEach(ch => {
      const pointagesSemaine = safePointages.filter(p => p.chantierId === ch.id && new Date(p.date) >= weekStart);
      if (pointagesSemaine.length === 0) {
        items.push({
          id: `pointage-${ch.id}`,
          type: 'pointage',
          icon: Clock,
          title: `Pointer heures: ${ch.nom}`,
          description: 'Aucun pointage cette semaine',
          urgent: false,
          action: () => { setSelectedChantier && setSelectedChantier(ch.id); setActiveModule && setActiveModule('chantiers'); }
        });
      }
    });

    // Chantiers à marge négative
    safeChantiers.forEach(ch => {
      const bilan = getChantierBilan ? getChantierBilan(ch.id) : { tauxMarge: 0 };
      if (bilan.tauxMarge < 0 && ch.statut === 'en_cours') {
        items.push({
          id: `marge-${ch.id}`,
          type: 'alerte',
          icon: AlertCircle,
          title: `Marge négative: ${ch.nom}`,
          description: `${bilan.tauxMarge.toFixed(1)}% - Analyser les coûts`,
          urgent: true,
          action: () => { setSelectedChantier && setSelectedChantier(ch.id); setActiveModule && setActiveModule('chantiers'); }
        });
      }
    });

    return items;
  }, [safeDevis, safeClients, safeChantiers, safePointages, getChantierBilan, setActiveModule, setSelectedChantier]);

  const filteredActions = todoFilter === 'all' ? actions : actions.filter(a => a.type === todoFilter);

  // Top 3 / Flop 3
  const top3 = stats.margesChantiers.slice(0, 3);
  const flop3 = stats.margesChantiers.filter(m => m.marge < 15).slice(-3).reverse();

  const formatMoney = (n) => modeDiscret ? '•••••' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => modeDiscret ? '••%' : (n || 0).toFixed(1) + '%';

  const KPICard = ({ icon: Icon, label, value, subValue, trend, color, gradient }) => (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: `${color}15` }}>
          <Icon size={24} style={{ color }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`absolute top-3 right-16 flex items-center gap-1 text-xs px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-slate-500">Vue d'ensemble de votre activité</p>
        </div>
        <button
          onClick={() => setModeDiscret(!modeDiscret)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
        >
          {modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}
          {modeDiscret ? 'Afficher' : 'Masquer'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={DollarSign}
          label="Chiffre d'affaires"
          value={formatMoney(stats.totalCA)}
          trend={stats.tendance}
          color={couleur}
          gradient="bg-gradient-to-br from-white to-orange-50 border-orange-100"
        />
        <KPICard
          icon={TrendingUp}
          label="Marge nette"
          value={formatMoney(stats.marge)}
          subValue={formatPct(stats.tauxMarge)}
          color={stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444'}
          gradient={`bg-gradient-to-br from-white ${stats.tauxMarge >= 15 ? 'to-emerald-50 border-emerald-100' : stats.tauxMarge >= 0 ? 'to-amber-50 border-amber-100' : 'to-red-50 border-red-100'}`}
        />
        <KPICard
          icon={CheckCircle}
          label="Encaissé"
          value={formatMoney(stats.encaisse)}
          color="#10b981"
          gradient="bg-gradient-to-br from-white to-emerald-50 border-emerald-100"
        />
        <KPICard
          icon={Clock}
          label="En attente"
          value={formatMoney(stats.enAttente)}
          subValue={`${stats.chantiersActifs} chantiers actifs`}
          color="#f59e0b"
          gradient="bg-gradient-to-br from-white to-amber-50 border-amber-100"
        />
      </div>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* CA 6 mois */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={18} style={{ color: couleur }} />
            CA sur 6 mois
          </h3>
          {!modeDiscret ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.caParMois}>
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} €`, 'CA']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ca" radius={[8, 8, 0, 0]}>
                  {stats.caParMois.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400">
              <EyeOff size={32} className="mr-2" /> Données masquées
            </div>
          )}
        </div>

        {/* Marges par chantier */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            Marges par chantier
          </h3>
          {!modeDiscret && stats.margesChantiers.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.margesChantiers.slice(0, 8)}>
                <defs>
                  <linearGradient id="margeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Marge']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="marge" stroke="#10b981" fill="url(#margeGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : !modeDiscret ? (
            <div className="h-[200px] flex items-center justify-center text-slate-400">Aucun chantier</div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400">
              <EyeOff size={32} className="mr-2" /> Données masquées
            </div>
          )}
        </div>
      </div>

      {/* Actions du jour + Top/Flop */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Actions du jour */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle size={18} style={{ color: couleur }} />
              À faire aujourd'hui
              {actions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: couleur }}>
                  {actions.length}
                </span>
              )}
            </h3>
            <div className="flex gap-1">
              {[['all', 'Tout'], ['devis', 'Devis'], ['facture', 'Factures'], ['alerte', 'Alertes']].map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTodoFilter(k)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${todoFilter === k ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={todoFilter === k ? { background: couleur } : {}}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {filteredActions.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h4 className="text-lg font-semibold text-emerald-700 mb-2">Tout est à jour ! 🎉</h4>
              <p className="text-sm text-emerald-600">Aucune action en attente</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredActions.map(action => (
                <div
                  key={action.id}
                  onClick={action.action}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-white border hover:border-orange-200 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                    <action.icon size={20} style={{ color: couleur }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{action.title}</p>
                      {action.urgent && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white shrink-0">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{action.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 3 / Flop 3 */}
        <div className="space-y-4">
          {/* Top 3 */}
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🏆 Top 3 Rentabilité
            </h3>
            {top3.length > 0 ? (
              <div className="space-y-2">
                {top3.map((ch, i) => (
                  <div
                    key={ch.id}
                    onClick={() => { setSelectedChantier(ch.id); setActiveModule('chantiers'); }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition"
                  >
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className="flex-1 text-sm font-medium truncate">{ch.nom}</span>
                    <span className="font-bold text-emerald-600">{modeDiscret ? '••%' : `${ch.marge.toFixed(0)}%`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Aucun chantier</p>
            )}
          </div>

          {/* Flop 3 */}
          {flop3.length > 0 && (
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                À surveiller
              </h3>
              <div className="space-y-2">
                {flop3.map(ch => (
                  <div
                    key={ch.id}
                    onClick={() => { setSelectedChantier(ch.id); setActiveModule('chantiers'); }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${ch.marge < 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100'}`}
                  >
                    <span className="text-lg">{ch.marge < 0 ? '🚨' : '⚠️'}</span>
                    <span className="flex-1 text-sm font-medium truncate">{ch.nom}</span>
                    <span className={`font-bold ${ch.marge < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {modeDiscret ? '••%' : `${ch.marge.toFixed(0)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Nouveau devis', module: 'devis', color: '#3b82f6' },
          { icon: Hammer, label: 'Nouveau chantier', module: 'chantiers', color: '#10b981' },
          { icon: Users, label: 'Nouveau client', module: 'clients', color: '#8b5cf6' },
          { icon: Calendar, label: 'Planning', module: 'planning', color: '#f59e0b' },
        ].map(item => (
          <button
            key={item.module}
            onClick={() => setActiveModule(item.module)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="p-2 rounded-xl" style={{ background: `${item.color}15` }}>
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
