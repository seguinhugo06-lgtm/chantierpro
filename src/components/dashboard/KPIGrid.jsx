/**
 * KPIGrid Component — 4 KPI cards with sparklines/progress bars
 * Displays CA, encaissements, marge, chantiers actifs.
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Receipt, HardHat, BarChart3 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const currencyFormat = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function generateSparkData(baseValue, points = 8) {
  const data = [];
  for (let i = 0; i < points; i++) {
    const variance = baseValue * (0.7 + Math.random() * 0.6);
    data.push({ v: Math.round(variance) });
  }
  return data;
}

function TrendBadge({ value, isDark }) {
  if (value == null || isNaN(value)) return null;
  const isPositive = value >= 0;
  const bg = isPositive
    ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
    : (isDark ? 'bg-red-500/10' : 'bg-red-50');
  const text = isPositive
    ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
    : (isDark ? 'text-red-400' : 'text-red-600');
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} />
      {isPositive ? '+' : ''}{Math.round(value)}%
    </span>
  );
}

function Sparkline({ data, couleur }) {
  const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="h-[35px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={couleur} stopOpacity={0.25} />
              <stop offset="100%" stopColor={couleur} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={couleur}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressBar({ value, max, couleur, isDark }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`w-full h-2 rounded-full mt-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, background: couleur }}
      />
    </div>
  );
}

function KPICardItem({ icon: Icon, label, value, trend, children, isDark, couleur, onClick }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const labelColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const valueColor = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div
      className={`rounded-2xl shadow-sm border transition-all hover:shadow-md cursor-pointer p-4 sm:p-5 ${cardBg}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${couleur}15` }}
        >
          <Icon size={20} style={{ color: couleur }} />
        </div>
        {trend != null && <TrendBadge value={trend} isDark={isDark} />}
      </div>

      <p className={`text-xs font-medium uppercase tracking-wide mt-3 ${labelColor}`}>
        {label}
      </p>

      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${valueColor}`}>
        {value}
      </p>

      {children}
    </div>
  );
}

export default function KPIGrid({
  stats = {},
  isDark = false,
  couleur = '#f97316',
  setPage,
  modeDiscret = false,
}) {
  const {
    caMois = 0,
    caPrevious = 0,
    aEncaisser = 0,
    nbFacturesAttente = 0,
    margeAvg = 0,
    chantiersActifs = 0,
    chantiersTotal = 0,
  } = stats;

  const caTrend = useMemo(() => {
    if (!caPrevious || caPrevious === 0) return null;
    return ((caMois - caPrevious) / caPrevious) * 100;
  }, [caMois, caPrevious]);

  const sparkCA = useMemo(() => generateSparkData(caMois || 5000), [caMois]);
  const sparkEncaisser = useMemo(() => generateSparkData(aEncaisser || 3000), [aEncaisser]);

  const formatMontant = (v) => {
    if (modeDiscret) return '\u2022\u2022\u2022\u2022';
    return currencyFormat.format(v);
  };

  const badgeBg = isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* CA ce mois */}
      <KPICardItem
        icon={Wallet}
        label="CA ce mois"
        value={formatMontant(caMois)}
        trend={caTrend}
        isDark={isDark}
        couleur={couleur}
        onClick={() => setPage && setPage('tresorerie')}
      >
        <Sparkline data={sparkCA} couleur={couleur} />
      </KPICardItem>

      {/* A encaisser */}
      <KPICardItem
        icon={Receipt}
        label="A encaisser"
        value={formatMontant(aEncaisser)}
        isDark={isDark}
        couleur={couleur}
        onClick={() => setPage && setPage('devis')}
      >
        {nbFacturesAttente > 0 && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${badgeBg}`}>
            {nbFacturesAttente} facture{nbFacturesAttente > 1 ? 's' : ''}
          </span>
        )}
        <Sparkline data={sparkEncaisser} couleur={couleur} />
      </KPICardItem>

      {/* Marge moyenne */}
      <KPICardItem
        icon={BarChart3}
        label="Marge moyenne"
        value={modeDiscret ? '\u2022\u2022\u2022\u2022' : `${Math.round(margeAvg)}%`}
        isDark={isDark}
        couleur={couleur}
        onClick={() => setPage && setPage('chantiers')}
      >
        <ProgressBar value={margeAvg} max={100} couleur={couleur} isDark={isDark} />
      </KPICardItem>

      {/* Chantiers actifs */}
      <KPICardItem
        icon={HardHat}
        label="Chantiers actifs"
        value={`${chantiersActifs}/${chantiersTotal}`}
        isDark={isDark}
        couleur={couleur}
        onClick={() => setPage && setPage('chantiers')}
      >
        <ProgressBar value={chantiersActifs} max={chantiersTotal || 1} couleur={couleur} isDark={isDark} />
      </KPICardItem>
    </div>
  );
}
