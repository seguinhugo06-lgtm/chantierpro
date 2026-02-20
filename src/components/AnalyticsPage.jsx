import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  TrendingUp, FileText, Target, Wallet,
  Users, HardHat, CreditCard,
  Building2, ArrowUpRight, ArrowDownRight, Percent,
  PieChart as PieChartIcon, BarChart3,
  Calendar, Info, FileEdit,
} from 'lucide-react';
import { useAnalytique } from '../hooks/useAnalytique';

const formatEUR = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value || 0);

const DEVIS_STATUS_COLORS = {
  brouillon: '#94a3b8',
  envoye: '#3b82f6',
  vu: '#8b5cf6',
  accepte: '#22c55e',
  signe: '#16a34a',
  refuse: '#ef4444',
  expire: '#f97316',
  payee: '#0ea5e9',
  facture: '#6366f1',
};

const DEVIS_STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  vu: 'Vu',
  accepte: 'Accepté',
  signe: 'Signé',
  refuse: 'Refusé',
  expire: 'Expiré',
  payee: 'Payée',
  facture: 'Facturé',
};

const CHANTIER_STATUS_COLORS = {
  en_cours: '#3b82f6',
  termine: '#22c55e',
  en_attente: '#f59e0b',
};

const CHANTIER_STATUS_LABELS = {
  en_cours: 'En cours',
  termine: 'Terminé',
  en_attente: 'En attente',
};

const DEPENSE_CAT_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
];

const PERIOD_OPTIONS = [
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
  { key: '12m', label: '12 mois' },
  { key: 'all', label: 'Tout' },
];

const PERIOD_LABELS = {
  month: 'ce mois',
  quarter: 'ce trimestre',
  year: 'cette année',
  '12m': 'les 12 derniers mois',
  all: 'toutes périodes',
};

/** Small badge showing N-1 comparison */
function ComparisonBadge({ value, isDark, suffix = '%', invert = false }) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  const isPositive = invert ? value < 0 : value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      isPositive
        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
        : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
    }`}>
      {value >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {value >= 0 ? '+' : ''}{Math.round(value)}{suffix}
      <span className="opacity-60 ml-0.5">vs N-1</span>
    </span>
  );
}

export default function AnalyticsPage({ devis = [], clients = [], chantiers = [], depenses = [], equipe = [], paiements = [], isDark, couleur, setPage }) {

  // ─── Period state (persisted to localStorage) ──────────────────────
  const [period, setPeriod] = useState(() => {
    try { return localStorage.getItem('cp_analytics_period') || 'all'; } catch { return 'all'; }
  });

  useEffect(() => {
    try { localStorage.setItem('cp_analytics_period', period); } catch {}
  }, [period]);

  // ─── All analytics from hook ─────────────────────────────────────
  const {
    kpis,
    comparisons,
    monthlyRevenue,
    topClients,
    devisParStatut,
    chantiersParStatut,
    totalChantiers,
    totalDevis,
    cashFlow,
    rentabiliteChantiers,
    avgMargin,
    marginDistribution,
    depensesParCategorie,
  } = useAnalytique({ devis, clients, chantiers, depenses, paiements, equipe, period });

  const topClientMax = topClients.length > 0 ? topClients[0].montant : 1;
  const topClientTotal = topClients.reduce((s, c) => s + c.montant, 0) || 1;
  const cashFlowMax = Math.max(cashFlow.totalPaiements, cashFlow.totalDepenses, 1);
  const hasMarginData = rentabiliteChantiers.some(r => r.ca > 0);
  const rentaMaxCA = rentabiliteChantiers.length > 0 ? Math.max(...rentabiliteChantiers.map(r => r.ca), 1) : 1;

  // Devis par statut for chart
  const devisChartData = Object.entries(devisParStatut).map(([statut, count]) => ({
    name: DEVIS_STATUS_LABELS[statut] || statut,
    value: count,
    color: DEVIS_STATUS_COLORS[statut] || '#94a3b8',
  }));

  // Chantiers par statut for chart
  const chantiersChartData = Object.entries(chantiersParStatut).map(([statut, count]) => ({
    name: CHANTIER_STATUS_LABELS[statut] || statut,
    value: count,
    color: CHANTIER_STATUS_COLORS[statut] || '#94a3b8',
  }));

  // Depenses par categorie for chart
  const depensesCatData = Object.entries(depensesParCategorie)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([cat, montant], i) => ({
      name: cat,
      value: montant,
      color: DEPENSE_CAT_COLORS[i % DEPENSE_CAT_COLORS.length],
    }));

  // ─── Style helpers ─────────────────────────────────────────────────
  const cardClass = `rounded-xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPage = isDark ? 'bg-slate-900' : 'bg-slate-50';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className={`rounded-lg border px-3 py-2 shadow-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <p className="font-medium">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {formatEUR(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0];
    return (
      <div className={`rounded-lg border px-3 py-2 shadow-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <p style={{ color: d.payload.color }} className="font-medium">{d.name}</p>
        <p>{typeof d.value === 'number' && d.value > 100 ? formatEUR(d.value) : d.value}</p>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bgPage} p-4 md:p-6 space-y-6`}>

      {/* Header + Period Selector */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Tableau de bord analytique</h1>
          <p className={`text-sm ${textSecondary}`}>
            Vue d'ensemble {period !== 'all' ? `— ${PERIOD_LABELS[period] || period}` : ''}
            {period !== 'all' && totalDevis > 0 && <span className="ml-2">({totalDevis} devis)</span>}
          </p>
        </div>

        {/* Period filter pills */}
        <div className={`sticky top-0 z-10 flex items-center gap-2 py-2 px-1 -mx-1 ${isDark ? 'bg-slate-900/95' : 'bg-slate-50/95'} backdrop-blur-sm`}>
          <Calendar size={16} className={textSecondary} />
          <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === opt.key
                    ? 'text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={period === opt.key ? { backgroundColor: couleur } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period !== 'all' && comparisons.ca !== null && (
            <span className={`text-xs ${textSecondary} hidden sm:inline`}>Comparaison N-1 active</span>
          )}
        </div>
      </div>

      {/* ────── KPI Cards ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Chiffre d'affaires</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${couleur}20` }}>
              <TrendingUp size={18} style={{ color: couleur }} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{formatEUR(kpis.ca)}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className={`text-xs ${textSecondary}`}>Devis acceptés / signés TTC</p>
            <ComparisonBadge value={comparisons.ca} isDark={isDark} />
          </div>
        </div>

        {/* Devis en attente */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Devis en attente</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${couleur}20` }}>
              <FileText size={18} style={{ color: couleur }} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{kpis.devisEnAttente}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            {kpis.montantEnAttente > 0 ? `${formatEUR(kpis.montantEnAttente)} en jeu` : 'Envoyés ou vus'}
          </p>
        </div>

        {/* Taux de conversion (FIXED: excludes brouillons + tooltip) */}
        <div className={cardClass + ' group relative'}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-medium ${textSecondary}`}>Taux de conversion</span>
              <div className="relative">
                <Info size={13} className={`${textSecondary} opacity-60 cursor-help`} />
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-lg ${isDark ? 'bg-slate-700 text-slate-200 border border-slate-600' : 'bg-gray-800 text-white'}`}>
                  <p className="font-semibold mb-1">Calcul :</p>
                  <p>Devis signés ({kpis.signedCount}) / Devis envoyés ({kpis.totalDevisEnvoyes})</p>
                  <p className="mt-1 opacity-70">Brouillons exclus du calcul ({kpis.brouillonsCount})</p>
                </div>
              </div>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${couleur}20` }}>
              <Target size={18} style={{ color: couleur }} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{kpis.tauxConversion.toFixed(1)}%</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className={`text-xs ${textSecondary}`}>{kpis.signedCount}/{kpis.totalDevisEnvoyes} signés</p>
            <ComparisonBadge value={comparisons.tauxConversion} isDark={isDark} suffix="pts" />
          </div>
        </div>

        {/* Marge brute */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Marge brute</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: kpis.margeBrute >= 0 ? '#22c55e20' : '#ef444420' }}>
              <Wallet size={18} style={{ color: kpis.margeBrute >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${kpis.margeBrute >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatEUR(kpis.margeBrute)}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className={`text-xs ${textSecondary}`}>
              {kpis.margePercent > 0 ? `${kpis.margePercent.toFixed(1)}% du CA` : 'CA - Dépenses'}
            </p>
            <ComparisonBadge value={comparisons.marge} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* ────── Brouillons banner (if any) ────── */}
      {kpis.brouillonsCount > 0 && (
        <div className={`${cardClass} flex items-center gap-4`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${couleur}15` }}>
            <FileEdit size={20} style={{ color: couleur }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${textPrimary}`}>
              Potentiel non comptabilisé : <span style={{ color: couleur }}>{formatEUR(kpis.brouillonsMontant)} TTC</span>
            </p>
            <p className={`text-xs mt-0.5 ${textSecondary}`}>
              {kpis.brouillonsCount} brouillon{kpis.brouillonsCount > 1 ? 's' : ''} non inclus dans les statistiques — convertissez-les en devis envoyés
            </p>
          </div>
          <button onClick={() => setPage('devis')}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: couleur }}>
            Voir les brouillons
          </button>
        </div>
      )}

      {/* ────── Pipeline & Key Metrics ────── */}
      {(kpis.pipelineValue > 0 || kpis.avgDevisValue > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${cardClass} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
              <BarChart3 size={18} style={{ color: couleur }} />
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Pipeline devis</p>
              <p className={`text-lg font-bold ${textPrimary}`}>{formatEUR(kpis.pipelineValue)}</p>
            </div>
          </div>
          <div className={`${cardClass} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
              <FileText size={18} style={{ color: couleur }} />
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Devis moyen</p>
              <p className={`text-lg font-bold ${textPrimary}`}>{formatEUR(kpis.avgDevisValue)}</p>
            </div>
          </div>
          <div className={`${cardClass} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
              <Percent size={18} style={{ color: couleur }} />
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Marge moy. chantiers</p>
              <p className={`text-lg font-bold ${!hasMarginData ? textSecondary : avgMargin >= 20 ? 'text-green-500' : avgMargin >= 10 ? isDark ? 'text-amber-400' : 'text-amber-600' : 'text-red-500'}`}>
                {hasMarginData ? `${avgMargin.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ────── Monthly Revenue + Top Clients ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly Revenue Chart (with depenses overlay) */}
        <div className={`${cardClass} lg:col-span-2`}>
          <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>CA & Dépenses mensuels</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="montant" name="CA" fill={couleur} radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clients */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Top clients</h2>
          </div>
          {topClients.length === 0 ? (
            <p className={`text-sm ${textSecondary}`}>Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {topClients.slice(0, 5).map((client, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium truncate mr-2 ${textPrimary}`}>{client.nom}</span>
                    <span className={`text-sm font-semibold whitespace-nowrap ${textSecondary}`}>
                      {formatEUR(client.montant)}
                      <span className={`text-xs font-normal ml-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        ({((client.montant / topClientTotal) * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(client.montant / topClientMax) * 100}%`,
                          backgroundColor: couleur,
                          opacity: 1 - idx * 0.15,
                        }}
                      />
                    </div>
                    {client.margePercent > 0 && (
                      <span className={`text-[10px] font-medium ${client.margePercent >= 20 ? 'text-green-500' : isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        marge {client.margePercent.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ────── Devis Status + Chantiers Status ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Devis by Status */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Devis par statut</h2>
          </div>
          {devisChartData.length === 0 ? (
            <p className={`text-sm ${textSecondary}`}>Aucun devis</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devisChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {devisChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {devisChartData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className={`text-sm ${textSecondary}`}>
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chantiers by Status */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <HardHat size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Chantiers par statut</h2>
          </div>
          {chantiersChartData.length === 0 ? (
            <p className={`text-sm ${textSecondary}`}>Aucun chantier</p>
          ) : (
            <div className="space-y-4">
              {chantiersChartData.map((entry, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className={`text-sm font-medium ${textPrimary}`}>{entry.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${textSecondary}`}>
                      {entry.value} {entry.value > 1 ? 'chantiers' : 'chantier'}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: totalChantiers > 0 ? `${(entry.value / totalChantiers) * 100}%` : '0%',
                        backgroundColor: entry.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className={`text-xs ${textSecondary} pt-1`}>
                Total : {totalChantiers} chantier{totalChantiers > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ────── Depenses par Categorie + Margin Distribution ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Depenses by Category */}
        {depensesCatData.length > 0 && (
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon size={18} style={{ color: couleur }} />
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Dépenses par catégorie</h2>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={depensesCatData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                      {depensesCatData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {depensesCatData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className={`text-sm ${textSecondary}`}>{entry.name} ({formatEUR(entry.value)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Margin Distribution */}
        {(marginDistribution.excellent + marginDistribution.bon + marginDistribution.faible + marginDistribution.negatif) > 0 && (
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <Percent size={18} style={{ color: couleur }} />
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Distribution des marges</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Excellent (≥30%)', count: marginDistribution.excellent, color: '#22c55e' },
                { label: 'Bon (15-30%)', count: marginDistribution.bon, color: '#f59e0b' },
                { label: 'Faible (0-15%)', count: marginDistribution.faible, color: '#f97316' },
                { label: 'Négatif (<0%)', count: marginDistribution.negatif, color: '#ef4444' },
              ].filter(b => b.count > 0).map((band, i) => {
                const total = marginDistribution.excellent + marginDistribution.bon + marginDistribution.faible + marginDistribution.negatif;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: band.color }} />
                        <span className={`text-sm font-medium ${textPrimary}`}>{band.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${textSecondary}`}>{band.count} chantier{band.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className="h-3 rounded-full transition-all" style={{ width: `${(band.count / total) * 100}%`, backgroundColor: band.color }} />
                    </div>
                  </div>
                );
              })}
              <p className={`text-xs ${textSecondary} pt-2`}>
                Marge moyenne : <strong className={!hasMarginData ? textSecondary : avgMargin >= 20 ? 'text-green-500' : avgMargin >= 10 ? isDark ? 'text-amber-400' : 'text-amber-600' : 'text-red-500'}>{hasMarginData ? `${avgMargin.toFixed(1)}%` : '—'}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ────── Rentabilité par Chantier ────── */}
      {rentabiliteChantiers.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Rentabilité par chantier</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs uppercase tracking-wide ${textSecondary} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <th className="text-left py-3 pr-4 font-semibold">Chantier</th>
                  <th className="text-right py-3 pr-4 font-semibold">CA TTC</th>
                  <th className="text-right py-3 pr-4 font-semibold">Dépenses</th>
                  <th className="text-right py-3 pr-4 font-semibold">Marge</th>
                  <th className="text-right py-3 pr-4 font-semibold">Marge %</th>
                  <th className="text-left py-3 font-semibold" style={{ minWidth: 120 }}>Rentabilité</th>
                </tr>
              </thead>
              <tbody>
                {rentabiliteChantiers.map((r) => {
                  const margeColor = r.margePercent >= 30 ? 'text-green-500' : r.margePercent >= 15 ? (isDark ? 'text-amber-400' : 'text-amber-600') : r.margePercent >= 0 ? (isDark ? 'text-orange-400' : 'text-orange-600') : 'text-red-500';
                  const barColor = r.margePercent >= 30 ? '#22c55e' : r.margePercent >= 15 ? '#f59e0b' : r.margePercent >= 0 ? '#f97316' : '#ef4444';
                  const barWidth = r.ca > 0 ? Math.max(Math.min((r.ca / rentaMaxCA) * 100, 100), 5) : 5;
                  return (
                    <tr key={r.id} className={`border-b last:border-b-0 transition-colors ${isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className="py-3 pr-4">
                        <p className={`font-medium ${textPrimary}`}>{r.nom}</p>
                        {r.clientNom && <p className={`text-xs ${textSecondary}`}>{r.clientNom}</p>}
                        <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          r.statut === 'termine' ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                          : isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>{r.statut === 'termine' ? 'Terminé' : 'En cours'}{r.avancement > 0 ? ` — ${r.avancement}%` : ''}</span>
                      </td>
                      <td className={`py-3 pr-4 text-right font-semibold whitespace-nowrap ${textPrimary}`}>{formatEUR(r.ca)}</td>
                      <td className={`py-3 pr-4 text-right whitespace-nowrap ${r.depenses > 0 ? 'text-red-500' : textSecondary}`}>{formatEUR(r.depenses)}</td>
                      <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap ${margeColor}`}>{formatEUR(r.marge)}</td>
                      <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap ${margeColor}`}>
                        <span className="inline-flex items-center gap-1">
                          {r.margePercent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {r.margePercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3" style={{ minWidth: 120 }}>
                        <div className={`h-4 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <div className="h-4 rounded-full transition-all flex items-center justify-end pr-1.5"
                            style={{ width: `${barWidth}%`, backgroundColor: barColor }}>
                            {r.ca > rentaMaxCA * 0.15 && <span className="text-[9px] text-white font-bold">{formatCompact(r.ca)}</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Summary row */}
          <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <span className={`text-sm font-medium ${textSecondary}`}>
              {rentabiliteChantiers.length} chantier{rentabiliteChantiers.length > 1 ? 's' : ''} actif{rentabiliteChantiers.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-4 text-sm">
              <span className={textSecondary}>
                CA total : <strong className={textPrimary}>{formatEUR(rentabiliteChantiers.reduce((s, r) => s + r.ca, 0))}</strong>
              </span>
              <span className={textSecondary}>
                Marge moy. : <strong className={!hasMarginData ? textSecondary : avgMargin >= 20 ? 'text-green-500' : avgMargin >= 10 ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-red-500'}>
                  {hasMarginData ? `${avgMargin.toFixed(1)}%` : '—'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ────── Cash Flow ────── */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={18} style={{ color: couleur }} />
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Flux de trésorerie</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Paiements received */}
          <div>
            <p className={`text-sm mb-2 ${textSecondary}`}>Paiements reçus</p>
            <p className={`text-xl font-bold text-green-500 mb-2`}>{formatEUR(cashFlow.totalPaiements)}</p>
            <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-3 rounded-full bg-green-500 transition-all"
                style={{ width: `${(cashFlow.totalPaiements / cashFlowMax) * 100}%` }}
              />
            </div>
          </div>

          {/* Depenses */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className={`text-sm ${textSecondary}`}>Dépenses totales</p>
              <ComparisonBadge value={comparisons.depenses} isDark={isDark} invert />
            </div>
            <p className={`text-xl font-bold ${cashFlow.totalDepenses > 0 ? 'text-red-500' : textSecondary} mb-2`}>{formatEUR(cashFlow.totalDepenses)}</p>
            <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-3 rounded-full bg-red-500 transition-all"
                style={{ width: `${(cashFlow.totalDepenses / cashFlowMax) * 100}%` }}
              />
            </div>
          </div>

          {/* Solde */}
          <div>
            <p className={`text-sm mb-2 ${textSecondary}`}>Solde net</p>
            <p className={`text-xl font-bold mb-2 ${cashFlow.solde === 0 ? textSecondary : cashFlow.solde > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatEUR(cashFlow.solde)}
            </p>
            <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className={`h-3 rounded-full transition-all ${cashFlow.solde === 0 ? (isDark ? 'bg-slate-600' : 'bg-slate-300') : cashFlow.solde > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.abs(cashFlow.solde) / cashFlowMax * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
