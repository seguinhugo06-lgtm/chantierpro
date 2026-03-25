import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, Clock, ShoppingCart, Target, Users, AlertTriangle,
  BarChart3, HardHat, Zap, RefreshCw, ChevronRight,
} from 'lucide-react';
import { useAnalyticsPremium } from '../hooks/useAnalyticsPremium';

// ── Formatters ──────────────────────────────────────────────────
const formatEUR = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

const formatCompact = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const PERIOD_OPTIONS = [
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
];

const STATUT_LABELS = {
  en_cours: 'En cours',
  termine: 'Terminé',
  en_attente: 'En attente',
  planifie: 'Planifié',
};

// ── Custom Tooltip ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label, isDark, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className={`rounded-xl border px-3 py-2 shadow-lg text-xs ${
        isDark ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-800'
      }`}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{entry.name} :</span>
          <span className="font-medium">{formatter ? formatter(entry.value) : formatEUR(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Circular Gauge (SVG) ────────────────────────────────────────
function CircularGauge({ value, max = 100, size = 64, strokeWidth = 6, couleur, isDark }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} className="transform -rotate-90" role="img" aria-label={`Score : ${value}${max === 100 ? '%' : '/' + max}`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={isDark ? '#334155' : '#e2e8f0'}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={couleur}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

// ── KPI Card ────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, couleur, isDark, gauge, gaugeValue }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-[#ebebeb]';
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 ${cardBg} transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
              <Icon size={16} style={{ color: couleur }} />
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
          </div>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </div>
          {sub && <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        {gauge && (
          <div className="relative flex items-center justify-center">
            <CircularGauge value={gaugeValue || 0} couleur={couleur} isDark={isDark} />
            <span className={`absolute text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {gaugeValue}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────
function Section({ title, icon: Icon, couleur, isDark, children, className = '' }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-[#ebebeb]';
  return (
    <div className={`rounded-xl border ${cardBg} transition-all ${className}`}>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
          <Icon size={15} style={{ color: couleur }} />
        </div>
        <h2 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      </div>
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function AnalyticsPremium({
  devis = [],
  clients = [],
  chantiers = [],
  depenses = [],
  equipe = [],
  paiements = [],
  pointages = [],
  isDark,
  couleur = '#f97316',
  showToast,
  setPage,
}) {
  const [period, setPeriod] = useState(() => {
    try { return localStorage.getItem('cp_analytics_premium_period') || 'all'; } catch { return 'all'; }
  });

  useEffect(() => {
    try { localStorage.setItem('cp_analytics_premium_period', period); } catch {}
  }, [period]);

  const {
    funnel,
    delaiMoyenSignature,
    tauxRefus,
    caPrevisionnel,
    panierMoyen,
    tauxConversion,
    clientStats,
    clientsDormants,
    topPrestations,
    rentabiliteChantiers,
    productivite,
    moisList,
    retardMoyenPaiement,
  } = useAnalyticsPremium({ devis, clients, chantiers, depenses, equipe, paiements, pointages, period });

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-gray-400';
  const gridColor = isDark ? '#334155' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  // Max CA for proportional bars
  const maxClientCA = clientStats.length > 0 ? clientStats[0].ca : 1;
  const maxPrestCA = topPrestations.length > 0 ? topPrestations[0].ca : 1;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${textPrimary}`}>Analytics</h1>
          <p className={`text-xs sm:text-sm ${textSecondary} mt-0.5`}>Vue d'ensemble de votre performance commerciale</p>
        </div>
        <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`min-h-[44px] px-4 py-2.5 text-xs font-medium rounded-lg transition-all ${
                period === opt.key
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
              style={period === opt.key ? { backgroundColor: couleur } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 1: KPIs + Funnel ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          icon={Target}
          label="Taux de conversion"
          value={`${tauxConversion}%`}
          sub={`${tauxRefus}% refusés`}
          couleur={couleur}
          isDark={isDark}
          gauge
          gaugeValue={tauxConversion}
        />
        <KPICard
          icon={Clock}
          label="Délai moyen signature"
          value={`${delaiMoyenSignature}j`}
          sub={retardMoyenPaiement > 0 ? `Retard paiement : ${retardMoyenPaiement}j` : 'Paiements à temps'}
          couleur={couleur}
          isDark={isDark}
        />
        <KPICard
          icon={ShoppingCart}
          label="Panier moyen"
          value={formatCompact(panierMoyen)}
          sub={`Sur ${clientStats.length} clients`}
          couleur={couleur}
          isDark={isDark}
        />
        <KPICard
          icon={TrendingUp}
          label="CA prévisionnel"
          value={formatCompact(caPrevisionnel)}
          sub="Basé sur le taux de conversion"
          couleur={couleur}
          isDark={isDark}
        />
      </div>

      {/* Funnel de conversion */}
      <Section title="Funnel de conversion" icon={Target} couleur={couleur} isDark={isDark}>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const widthPct = Math.max(step.pct, 8);
            const prevStep = i > 0 ? funnel[i - 1] : null;
            const convRate = prevStep && prevStep.count > 0
              ? Math.round((step.count / prevStep.count) * 100)
              : null;
            return (
              <div key={step.etape}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${textSecondary}`}>{step.etape}</span>
                  <div className="flex items-center gap-2">
                    {convRate !== null && i > 0 && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {convRate}%
                      </span>
                    )}
                    <span className={`text-xs font-bold ${textPrimary}`}>{step.count}</span>
                  </div>
                </div>
                <div className={`h-8 rounded-lg overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <div
                    className="h-full rounded-lg transition-all duration-1000 ease-out flex items-center px-3"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`,
                      opacity: 1 - (i * 0.15),
                    }}
                  >
                    {widthPct > 20 && (
                      <span className="text-[11px] font-semibold text-white">{step.pct}%</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Section 2: CA & Marge mensuel ──────────────────── */}
      <Section title="CA & Marge mensuel" icon={BarChart3} couleur={couleur} isDark={isDark}>
        <div style={{ minHeight: 280 }}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={moisList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
              />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Bar
                dataKey="depenses"
                name="Dépenses"
                fill={isDark ? '#f8717150' : '#fee2e250'}
                stroke={isDark ? '#f87171' : '#fca5a5'}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
              />
              <Bar
                dataKey="ca"
                name="CA"
                fill={couleur}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
              >
                {moisList.map((_, idx) => (
                  <Cell key={idx} fill={`${couleur}${idx === moisList.length - 1 ? 'ff' : 'cc'}`} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="marge"
                name="Marge"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#22c55e', stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }}
                isAnimationActive={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Section 3: Intelligence clients ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Top clients */}
        <Section title="Top 10 clients" icon={Users} couleur={couleur} isDark={isDark}>
          <div className="space-y-2.5">
            {clientStats.slice(0, 10).map((cl, i) => (
              <div key={cl.id} className="flex items-center gap-3">
                <span className={`w-5 text-xs font-bold text-center ${textMuted}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium truncate ${textPrimary}`}>{cl.nom}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {cl.tauxConversion}%
                      </span>
                      <span className={`text-xs font-semibold ${textPrimary}`}>{formatCompact(cl.ca)}</span>
                    </div>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max((cl.ca / maxClientCA) * 100, 3)}%`,
                        background: couleur,
                        opacity: 1 - (i * 0.07),
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {clientStats.length === 0 && (
              <p className={`text-xs text-center py-6 ${textMuted}`}>Aucune donnée client disponible</p>
            )}
          </div>
        </Section>

        {/* Clients dormants */}
        <Section title="Clients dormants" icon={AlertTriangle} couleur={couleur} isDark={isDark}>
          <div className="space-y-2">
            {clientsDormants.map(cl => (
              <div
                key={cl.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-slate-700/40' : 'bg-gray-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${textPrimary}`}>{cl.nom}</p>
                  <p className={`text-[11px] ${textMuted}`}>
                    Inactif depuis {cl.joursSansActivite} jours
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                  }`}>
                    Dormant
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(cl.nom);
                      }
                      if (showToast) showToast(`${cl.nom} copié`, 'success');
                    }}
                    className={`text-[11px] min-h-[44px] px-3 py-2 rounded-lg font-medium transition-colors ${
                      isDark ? 'bg-slate-600 text-slate-200 hover:bg-slate-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Relancer
                  </button>
                </div>
              </div>
            ))}
            {clientsDormants.length === 0 && (
              <div className={`text-center py-8 ${textMuted}`}>
                <Users size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">Aucun client dormant</p>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ── Section 4: Top prestations ─────────────────────── */}
      <Section title="Top prestations" icon={Zap} couleur={couleur} isDark={isDark}>
        <div className="space-y-2.5">
          {topPrestations.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium truncate max-w-[60%] ${textPrimary}`}>{p.nom}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] ${textMuted}`}>{p.count}x</span>
                    <span className={`text-xs font-semibold ${textPrimary}`}>{formatCompact(p.ca)}</span>
                  </div>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max((p.ca / maxPrestCA) * 100, 3)}%`,
                      background: couleur,
                      opacity: 1 - (i * 0.08),
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {topPrestations.length === 0 && (
            <p className={`text-xs text-center py-6 ${textMuted}`}>Aucune prestation trouvée dans les devis</p>
          )}
        </div>
      </Section>

      {/* ── Section 5: Rentabilité chantiers ───────────────── */}
      <Section title="Rentabilité chantiers" icon={HardHat} couleur={couleur} isDark={isDark}>
        <div className="space-y-2">
          {rentabiliteChantiers.slice(0, 15).map(ch => {
            const margeColor = ch.margePct > 20 ? '#22c55e' : ch.margePct >= 0 ? '#f59e0b' : '#ef4444';
            const margeLabel = ch.margePct > 20 ? 'Bonne marge' : ch.margePct >= 0 ? 'Marge faible' : 'Marge négative';
            return (
              <div
                key={ch.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg ${
                  isDark ? 'bg-slate-700/40' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: `${margeColor}20`,
                      color: margeColor,
                    }}
                  >
                    {STATUT_LABELS[ch.statut] || ch.statut}
                  </span>
                  <span className="sr-only">{margeLabel}</span>
                  <span className={`text-sm font-medium truncate ${textPrimary}`}>{ch.nom}</span>
                </div>
                <div className="flex items-center gap-3 sm:w-1/3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] ${textMuted}`}>Marge</span>
                      <span className="text-[11px] font-bold" style={{ color: margeColor }}>
                        {ch.margePct}%
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(Math.max(ch.margePct, 0), 100)}%`,
                          background: margeColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:w-1/3 sm:justify-end text-xs">
                  <div className="text-center">
                    <p className={textMuted}>CA</p>
                    <p className={`font-semibold ${textPrimary}`}>{formatCompact(ch.ca)}</p>
                  </div>
                  <div className="text-center">
                    <p className={textMuted}>Dépenses</p>
                    <p className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{formatCompact(ch.depenses)}</p>
                  </div>
                  <div className="text-center">
                    <p className={textMuted}>Marge</p>
                    <p className="font-semibold" style={{ color: margeColor }}>{formatCompact(ch.marge)}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {rentabiliteChantiers.length === 0 && (
            <p className={`text-xs text-center py-6 ${textMuted}`}>Aucun chantier avec données financières</p>
          )}
        </div>
      </Section>

      {/* ── Section 6: Productivité équipe ─────────────────── */}
      <Section title="Productivité équipe" icon={RefreshCw} couleur={couleur} isDark={isDark}>
        <div className="space-y-3">
          {productivite.map(m => {
            const barColor = m.taux > 100 ? '#ef4444' : m.taux >= 80 ? '#f59e0b' : '#22c55e';
            const chargeLabel = m.taux > 100 ? 'Surcharge' : 'Charge normale';
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-24 sm:w-32 shrink-0">
                  <p className={`text-xs font-medium truncate ${textPrimary}`}>{m.nom}</p>
                  <p className={`text-[11px] ${textMuted}`}>{m.role}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] ${textMuted}`}>{m.heures}h / {m.capacite}h</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold" style={{ color: barColor }}>{m.taux}%</span>
                      <span className="sr-only">{chargeLabel}</span>
                      {m.cout > 0 && (
                        <span className={`text-[11px] ${textMuted}`}>{formatCompact(m.cout)}</span>
                      )}
                    </div>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(m.taux, 120)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {productivite.length === 0 && (
            <div className={`text-center py-8 ${textMuted}`}>
              <Zap size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Aucun pointage enregistré</p>
              <p className="text-[11px] mt-1">Les données apparaîtront quand l'équipe pointera ses heures</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
