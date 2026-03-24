/**
 * KPIGrid Component — 4 KPI cards with sparklines/progress bars
 * Premium Linear/Stripe-inspired design.
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
    ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
    : (isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600');
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${bg}`}>
      <Icon size={12} />
      {isPositive ? '+' : ''}{Math.round(value)}%
    </span>
  );
}

function Sparkline({ data, color }) {
  const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="h-[32px] w-full mt-2">
      <ResponsiveContainer width="100%" height={32}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressBar({ value, max, color, isDark }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`w-full h-2 rounded-full mt-3 ${isDark ? 'bg-slate-700' : 'bg-[#f0f0f0]'}`}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function KPICardItem({ icon: Icon, iconColor, label, value, trend, children, isDark, onClick, modeDiscret }) {
  const cardBg = isDark
    ? 'bg-slate-800 border border-slate-700/50'
    : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
  const labelColor = isDark ? 'text-slate-400' : 'text-gray-500';
  const valueColor = isDark ? 'text-slate-100' : 'text-gray-900';

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] cursor-pointer ${cardBg}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}15` }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {trend != null && <TrendBadge value={trend} isDark={isDark} />}
      </div>

      <p className={`text-sm font-medium mt-4 ${labelColor}`}>
        {label}
      </p>

      <p
        className={`text-2xl font-bold tracking-tight mt-1 ${valueColor}`}
        style={modeDiscret ? { filter: 'blur(6px)', userSelect: 'none' } : undefined}
      >
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
    if (modeDiscret) return '\u2022 \u2022 \u2022 \u2022';
    return currencyFormat.format(v);
  };

  const badgeBg = isDark ? 'bg-slate-700 text-slate-400' : 'bg-[#f5f5f5] text-[#666]';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* CA ce mois */}
      <KPICardItem
        icon={Wallet}
        iconColor="#10b981"
        label="CA ce mois"
        value={formatMontant(caMois)}
        trend={caTrend}
        isDark={isDark}
        modeDiscret={modeDiscret}
        onClick={() => setPage && setPage('finances')}
      >
        <Sparkline data={sparkCA} color="#10b981" />
      </KPICardItem>

      {/* A encaisser */}
      <KPICardItem
        icon={Receipt}
        iconColor="#f59e0b"
        label="A encaisser"
        value={formatMontant(aEncaisser)}
        isDark={isDark}
        modeDiscret={modeDiscret}
        onClick={() => setPage && setPage('devis')}
      >
        {nbFacturesAttente > 0 && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium mt-2 ${badgeBg}`}>
            {nbFacturesAttente} facture{nbFacturesAttente > 1 ? 's' : ''}
          </span>
        )}
        <Sparkline data={sparkEncaisser} color="#f59e0b" />
      </KPICardItem>

      {/* Marge moyenne */}
      <KPICardItem
        icon={BarChart3}
        iconColor="#3b82f6"
        label="Marge moyenne"
        value={modeDiscret ? '\u2022 \u2022 \u2022 \u2022' : `${Math.round(margeAvg)}%`}
        isDark={isDark}
        modeDiscret={modeDiscret}
        onClick={() => setPage && setPage('chantiers')}
      >
        <ProgressBar value={margeAvg} max={100} color="#3b82f6" isDark={isDark} />
      </KPICardItem>

      {/* Chantiers actifs */}
      <KPICardItem
        icon={HardHat}
        iconColor={couleur}
        label="Chantiers actifs"
        value={`${chantiersActifs}/${chantiersTotal}`}
        isDark={isDark}
        onClick={() => setPage && setPage('chantiers')}
      >
        <ProgressBar value={chantiersActifs} max={chantiersTotal || 1} color={couleur} isDark={isDark} />
      </KPICardItem>
    </div>
  );
}
