import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Clock, Building2, ChevronRight, AlertCircle, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Target, Wallet, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { calculateGlobalKPIs, getMarginColor, formatMoney, formatPercent, MARGIN_THRESHOLDS } from '../lib/business/margin-calculator';

/**
 * Dashboard de rentabilite avec visualisation des marges par chantier
 * Affiche en modal fullscreen
 */
export default function RentabilityDashboard({
  chantiers,
  devis,
  depenses,
  pointages,
  equipe,
  ajustements,
  modeDiscret,
  isDark,
  couleur,
  onClose,
  onSelectChantier
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, chantiers, alerts

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  // Calculate KPIs
  const kpis = useMemo(() => {
    return calculateGlobalKPIs(chantiers, { devis, depenses, pointages, equipe, ajustements });
  }, [chantiers, devis, depenses, pointages, equipe, ajustements]);

  // Chart data for margins by chantier
  const margeChartData = useMemo(() => {
    return kpis.margins
      .filter(m => m.statut === 'en_cours' || m.statut === 'termine')
      .sort((a, b) => b.tauxMarge - a.tauxMarge)
      .slice(0, 8)
      .map(m => ({
        nom: m.chantierNom.length > 15 ? m.chantierNom.substring(0, 15) + '...' : m.chantierNom,
        marge: parseFloat(m.tauxMarge.toFixed(1)),
        montant: m.margeBrute,
        color: getMarginColor(m.tauxMarge, isDark).hex,
        chantierId: m.chantierId
      }));
  }, [kpis.margins, isDark]);

  // Pie chart data for cost distribution
  const costDistributionData = useMemo(() => {
    const totalMat = kpis.margins.reduce((s, m) => s + m.coutMateriaux, 0);
    const totalMO = kpis.margins.reduce((s, m) => s + m.coutMO, 0);
    const totalAutres = kpis.margins.reduce((s, m) => s + m.coutAutres, 0);
    const total = totalMat + totalMO + totalAutres;

    if (total === 0) return [];

    return [
      { name: 'Materiaux', value: totalMat, color: '#3b82f6', percent: (totalMat / total * 100).toFixed(0) },
      { name: 'Main d\'oeuvre', value: totalMO, color: '#f59e0b', percent: (totalMO / total * 100).toFixed(0) },
      { name: 'Autres', value: totalAutres, color: '#8b5cf6', percent: (totalAutres / total * 100).toFixed(0) }
    ].filter(d => d.value > 0);
  }, [kpis.margins]);

  // Modal wrapper
  const modalBg = isDark ? "bg-slate-900" : "bg-slate-50";

  // Empty state
  if (chantiers.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className={`${cardBg} rounded-2xl border p-8 text-center max-w-md w-full`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X size={20} className={textSecondary} />
          </button>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
            <BarChart3 size={32} style={{ color: couleur }} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Tableau de bord rentabilité</h3>
          <p className={`${textMuted} mb-4`}>Créez votre premier chantier pour voir votre rentabilité</p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-white font-medium"
            style={{ background: couleur }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 animate-fade-in flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className={`relative flex-1 ${modalBg} overflow-hidden flex flex-col m-2 sm:m-4 rounded-2xl shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
              <BarChart3 size={24} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Analyse de rentabilite</h2>
              <p className={textMuted}>{kpis.chantiersEnCours} chantier{kpis.chantiersEnCours > 1 ? 's' : ''} en cours</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="hidden sm:flex gap-2">
          {[
            { id: 'overview', label: 'Vue globale', icon: BarChart3 },
            { id: 'chantiers', label: 'Par chantier', icon: Building2 },
            { id: 'alerts', label: 'Alertes', icon: AlertTriangle, badge: kpis.criticalAlerts }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={activeTab === tab.id ? { background: couleur } : {}}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}
            >
              <X size={20} className={textSecondary} />
            </button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className={`sm:hidden flex gap-2 px-4 pb-4 overflow-x-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {[
            { id: 'overview', label: 'Global', icon: BarChart3 },
            { id: 'chantiers', label: 'Chantiers', icon: Building2 },
            { id: 'alerts', label: 'Alertes', icon: AlertTriangle, badge: kpis.criticalAlerts }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
              style={activeTab === tab.id ? { background: couleur } : {}}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="px-1 py-0.5 bg-red-500 text-white text-[9px] rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Marge moyenne */}
            <div className={`${cardBg} rounded-xl border p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={textMuted}>Marge moyenne</span>
                <div className={`p-1.5 rounded-lg ${getMarginColor(kpis.margeGlobale, isDark).bg}`}>
                  <Target size={16} className={getMarginColor(kpis.margeGlobale, isDark).text} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${getMarginColor(kpis.margeGlobale, isDark).text}`}>
                {formatPercent(kpis.margeGlobale, modeDiscret)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {kpis.tendance >= 0 ? (
                  <ArrowUpRight size={14} className="text-emerald-500" />
                ) : (
                  <ArrowDownRight size={14} className="text-red-500" />
                )}
                <span className={`text-xs ${kpis.tendance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpis.tendance >= 0 ? '+' : ''}{kpis.tendance.toFixed(1)}% vs termines
                </span>
              </div>
            </div>

            {/* CA Total */}
            <div className={`${cardBg} rounded-xl border p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={textMuted}>CA Total</span>
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                  <DollarSign size={16} className="text-emerald-500" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>
                {formatMoney(kpis.caTotal, modeDiscret)}
              </p>
              <p className={`text-xs ${textMuted}`}>
                {formatMoney(kpis.aEncaisser, modeDiscret)} a encaisser
              </p>
            </div>

            {/* Chantiers rentables */}
            <div className={`${cardBg} rounded-xl border p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={textMuted}>Chantiers rentables</span>
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                  <CheckCircle size={16} className="text-blue-500" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>
                {kpis.chantiersRentables}/{kpis.nombreChantiers}
              </p>
              <p className={`text-xs ${textMuted}`}>
                {formatPercent(kpis.tauxRentabilite, modeDiscret)} du total
              </p>
            </div>

            {/* Alertes */}
            <div className={`${cardBg} rounded-xl border p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={textMuted}>Alertes actives</span>
                <div className={`p-1.5 rounded-lg ${kpis.criticalAlerts > 0 ? (isDark ? 'bg-red-900/30' : 'bg-red-100') : (isDark ? 'bg-slate-700' : 'bg-slate-100')}`}>
                  <AlertTriangle size={16} className={kpis.criticalAlerts > 0 ? 'text-red-500' : textMuted} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpis.criticalAlerts > 0 ? 'text-red-500' : textPrimary}`}>
                {kpis.totalAlerts}
              </p>
              <p className={`text-xs ${textMuted}`}>
                {kpis.criticalAlerts} critique{kpis.criticalAlerts > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Margin by Chantier */}
            <div className={`lg:col-span-2 ${cardBg} rounded-2xl border p-6`}>
              <h3 className={`font-semibold mb-4 ${textPrimary}`}>Marge par chantier</h3>
              {margeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={margeChartData} layout="vertical">
                    <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className={`${cardBg} border rounded-lg p-3 shadow-lg`}>
                            <p className={`font-medium ${textPrimary}`}>{data.nom}</p>
                            <p className={`text-sm ${textSecondary}`}>Marge: {data.marge}%</p>
                            <p className={`text-sm ${textSecondary}`}>{formatMoney(data.montant, modeDiscret)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="marge" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => onSelectChantier?.(data.chantierId)}>
                      {margeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <p className={textMuted}>Aucune donnée à afficher</p>
                </div>
              )}

              {/* Seuils légende */}
              <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className={`text-xs ${textMuted}`}>&lt; {MARGIN_THRESHOLDS.CRITICAL}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className={`text-xs ${textMuted}`}>{MARGIN_THRESHOLDS.CRITICAL}-{MARGIN_THRESHOLDS.WARNING}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className={`text-xs ${textMuted}`}>{MARGIN_THRESHOLDS.WARNING}-{MARGIN_THRESHOLDS.GOOD}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className={`text-xs ${textMuted}`}>&gt; {MARGIN_THRESHOLDS.GOOD}%</span>
                </div>
              </div>
            </div>

            {/* Cost Distribution */}
            <div className={`${cardBg} rounded-2xl border p-6`}>
              <h3 className={`font-semibold mb-4 ${textPrimary}`}>Repartition des couts</h3>
              {costDistributionData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <RePieChart>
                      <Pie
                        data={costDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {costDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className={`${cardBg} border rounded-lg p-3 shadow-lg`}>
                              <p className={`font-medium ${textPrimary}`}>{data.name}</p>
                              <p className={`text-sm ${textSecondary}`}>{formatMoney(data.value, modeDiscret)}</p>
                              <p className={`text-sm ${textSecondary}`}>{data.percent}%</p>
                            </div>
                          );
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {costDistributionData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                          <span className={`text-sm ${textSecondary}`}>{item.name}</span>
                        </div>
                        <span className={`text-sm font-medium ${textPrimary}`}>{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <p className={textMuted}>Aucune dépense enregistrée</p>
                </div>
              )}
            </div>
          </div>

          {/* Profit Summary */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
                <Wallet size={20} style={{ color: couleur }} />
              </div>
              <h3 className={`font-semibold ${textPrimary}`}>Resume financier</h3>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <p className={`text-sm ${textMuted} mb-1`}>Chiffre d'affaires</p>
                <p className={`text-xl font-bold ${textPrimary}`}>{formatMoney(kpis.caTotal, modeDiscret)}</p>
              </div>
              <div>
                <p className={`text-sm ${textMuted} mb-1`}>Couts totaux</p>
                <p className={`text-xl font-bold text-red-500`}>{formatMoney(kpis.coutTotal, modeDiscret)}</p>
              </div>
              <div>
                <p className={`text-sm ${textMuted} mb-1`}>Marge brute</p>
                <p className={`text-xl font-bold ${kpis.margeGlobaleMontant >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatMoney(kpis.margeGlobaleMontant, modeDiscret)}
                </p>
              </div>
              <div>
                <p className={`text-sm ${textMuted} mb-1`}>Taux de marge</p>
                <p className={`text-xl font-bold ${getMarginColor(kpis.margeGlobale, isDark).text}`}>
                  {formatPercent(kpis.margeGlobale, modeDiscret)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chantiers Tab */}
      {activeTab === 'chantiers' && (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-700' : 'bg-slate-50'}>
              <tr>
                <th className={`text-left px-4 py-3 text-sm font-medium ${textMuted}`}>Chantier</th>
                <th className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>CA HT</th>
                <th className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Couts</th>
                <th className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Marge</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${textMuted}`}>Statut</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {kpis.margins.map(m => {
                const colors = getMarginColor(m.tauxMarge, isDark);
                return (
                  <tr
                    key={m.chantierId}
                    onClick={() => onSelectChantier?.(m.chantierId)}
                    className={`border-t cursor-pointer ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${colors.bg}`} style={{ background: colors.hex }} />
                        <div>
                          <p className={`font-medium ${textPrimary}`}>{m.chantierNom}</p>
                          <p className={`text-xs ${textMuted}`}>{m.avancement}% complete</p>
                        </div>
                      </div>
                    </td>
                    <td className={`text-right px-4 py-3 font-medium ${textPrimary}`}>
                      {formatMoney(m.revenuTotal, modeDiscret)}
                    </td>
                    <td className={`text-right px-4 py-3 text-red-500`}>
                      {formatMoney(m.totalDepenses, modeDiscret)}
                    </td>
                    <td className={`text-right px-4 py-3`}>
                      <span className={`font-bold ${colors.text}`}>
                        {formatPercent(m.tauxMarge, modeDiscret)}
                      </span>
                      <span className={`block text-xs ${textMuted}`}>
                        {formatMoney(m.margeBrute, modeDiscret)}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        m.statut === 'en_cours' ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                        : m.statut === 'termine' ? (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')
                        : (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')
                      }`}>
                        {m.statut === 'en_cours' ? 'En cours' : m.statut === 'termine' ? 'Termine' : 'Prospect'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className={textMuted} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {kpis.alerts.length > 0 ? (
            kpis.alerts.map((alert, i) => (
              <div
                key={i}
                onClick={() => onSelectChantier?.(alert.chantierId)}
                className={`${cardBg} rounded-xl border p-4 cursor-pointer hover:shadow-lg transition-all ${
                  alert.severity === 'critical' ? (isDark ? 'border-red-800' : 'border-red-200')
                  : alert.severity === 'warning' ? (isDark ? 'border-amber-800' : 'border-amber-200')
                  : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${
                    alert.severity === 'critical' ? (isDark ? 'bg-red-900/30' : 'bg-red-100')
                    : alert.severity === 'warning' ? (isDark ? 'bg-amber-900/30' : 'bg-amber-100')
                    : (isDark ? 'bg-blue-900/30' : 'bg-blue-100')
                  }`}>
                    <AlertCircle size={20} className={
                      alert.severity === 'critical' ? 'text-red-500'
                      : alert.severity === 'warning' ? 'text-amber-500'
                      : 'text-blue-500'
                    } />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${textPrimary}`}>{alert.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-500 text-white'
                        : alert.severity === 'warning' ? 'bg-amber-500 text-white'
                        : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')
                      }`}>
                        {alert.severity === 'critical' ? 'Critique' : alert.severity === 'warning' ? 'Attention' : 'Info'}
                      </span>
                    </div>
                    <p className={`text-sm ${textSecondary} mt-1`}>{alert.message}</p>
                    {alert.suggestion && (
                      <p className={`text-xs ${textMuted} mt-2 italic`}>{alert.suggestion}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className={textMuted} />
                </div>
              </div>
            ))
          ) : (
            <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
              <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Tout va bien!</h3>
              <p className={textMuted}>Aucune alerte active sur vos chantiers</p>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
