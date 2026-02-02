/**
 * RevenueChartWidget - Widget showing monthly performance with attractive design
 *
 * Features:
 * - Beautiful area chart with gradient
 * - Current month stats with comparison
 * - Animated stat cards
 * - Goal progress indicator
 *
 * @module RevenueChartWidget
 */

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  BarChart3,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useDevis } from '../../context/DataContext';
import Widget, { WidgetHeader, WidgetContent, WidgetFooter, WidgetLink } from './Widget';

// Month names
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_NAMES_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * Format currency
 */
function formatMoney(amount) {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k`;
  }
  return amount.toFixed(0);
}

function formatFullMoney(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Custom tooltip
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {formatFullMoney(payload[0].value)}
        </p>
        {payload[0].payload.invoiceCount > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {payload[0].payload.invoiceCount} facture{payload[0].payload.invoiceCount > 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  }
  return null;
}

/**
 * Stat card component
 */
function StatCard({ icon: Icon, label, value, subValue, trend, color, gradient, isDark, highlight }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl p-4 transition-all duration-200',
      'border',
      highlight
        ? isDark
          ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/10 border-blue-500/30'
          : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200'
        : isDark
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-gray-50 border-gray-100'
    )}>
      {/* Gradient accent for highlight */}
      {highlight && gradient && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: gradient }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center',
                isDark ? 'bg-slate-700' : 'bg-white shadow-sm'
              )}
              style={{ color }}
            >
              <Icon size={14} />
            </div>
            <p className={cn(
              'text-xs font-medium',
              isDark ? 'text-gray-400' : 'text-gray-500'
            )}>
              {label}
            </p>
          </div>

          <p className={cn(
            'text-xl font-bold mt-2',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {value}
          </p>

          {subValue && (
            <p className={cn(
              'text-xs mt-0.5',
              isDark ? 'text-gray-500' : 'text-gray-400'
            )}>
              {subValue}
            </p>
          )}
        </div>

        {trend !== null && trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            trend >= 0
              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
          )}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Progress ring component
 */
function ProgressRing({ value, max, color, size = 48, strokeWidth = 4, isDark }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? '#334155' : '#e5e7eb'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          'text-xs font-bold',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

/**
 * RevenueChartWidget Component
 */
export default function RevenueChartWidget({ setPage, isDark = false, className }) {
  const { devis = [] } = useDevis();

  // Calculate monthly revenue data
  const { chartData, stats } = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const months = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: MONTH_NAMES[date.getMonth()],
        fullLabel: `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`,
        revenue: 0,
        invoiceCount: 0,
        isCurrent: date.getMonth() === currentMonth && date.getFullYear() === currentYear,
      });
    }

    // Calculate revenue per month
    let totalDevisEnCours = 0;
    let devisEnCoursCount = 0;

    devis.forEach(d => {
      // Comptabilise devis en cours
      if (d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)) {
        totalDevisEnCours += d.total_ht || 0;
        devisEnCoursCount++;
      }

      // Comptabilise CA (devis acceptés + factures)
      if (d.statut === 'accepte' || d.type === 'facture') {
        const date = new Date(d.date);
        const monthData = months.find(
          m => m.month === date.getMonth() && m.year === date.getFullYear()
        );
        if (monthData) {
          monthData.revenue += d.total_ht || 0;
          monthData.invoiceCount++;
        }
      }
    });

    // Calculate stats
    const currentMonthData = months[months.length - 1];
    const previousMonthData = months[months.length - 2];
    const total6Months = months.reduce((sum, m) => sum + m.revenue, 0);
    const average = total6Months / 6;

    // Goal (estimation based on average + 10%)
    const monthlyGoal = average * 1.1 || 10000;

    let trend = null;
    if (previousMonthData?.revenue > 0) {
      trend = Math.round(((currentMonthData.revenue - previousMonthData.revenue) / previousMonthData.revenue) * 100);
    }

    return {
      chartData: months,
      stats: {
        currentMonth: currentMonthData?.revenue || 0,
        currentMonthLabel: MONTH_NAMES_FULL[currentMonth],
        previousMonth: previousMonthData?.revenue || 0,
        total6Months,
        average,
        trend,
        monthlyGoal,
        goalProgress: monthlyGoal > 0 ? (currentMonthData.revenue / monthlyGoal) * 100 : 0,
        totalDevisEnCours,
        devisEnCoursCount,
        invoiceCountThisMonth: currentMonthData?.invoiceCount || 0,
      },
    };
  }, [devis]);

  const handleNavigate = () => {
    setPage?.('devis');
  };

  const isEmpty = stats.total6Months === 0;
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), stats.monthlyGoal);

  return (
    <Widget
      isDark={isDark}
      className={cn('col-span-full', className)}
    >
      <WidgetHeader
        title={`Performance ${stats.currentMonthLabel}`}
        icon={<BarChart3 />}
        isDark={isDark}
        actions={
          <div className="flex items-center gap-2">
            {stats.trend !== null && (
              <div className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                stats.trend >= 0
                  ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                  : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
              )}>
                {stats.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {stats.trend >= 0 ? '+' : ''}{stats.trend}% vs mois dernier
              </div>
            )}
          </div>
        }
      />

      <WidgetContent>
        {isEmpty ? (
          <div className={cn(
            'flex flex-col items-center justify-center py-16 text-center',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}>
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
              isDark ? 'bg-slate-700' : 'bg-gray-100'
            )}>
              <BarChart3 size={32} className="opacity-30" />
            </div>
            <p className="text-sm font-medium">Aucune donnée ce mois</p>
            <p className="text-xs mt-1 opacity-75 max-w-xs">
              Les données apparaîtront avec vos devis acceptés et factures
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Euro}
                label="Ce mois"
                value={formatFullMoney(stats.currentMonth)}
                subValue={`${stats.invoiceCountThisMonth} facture${stats.invoiceCountThisMonth > 1 ? 's' : ''}`}
                trend={stats.trend}
                color="#3b82f6"
                gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                isDark={isDark}
                highlight
              />

              <StatCard
                icon={Calendar}
                label="6 derniers mois"
                value={formatFullMoney(stats.total6Months)}
                subValue={`Moy. ${formatFullMoney(stats.average)}/mois`}
                color="#8b5cf6"
                isDark={isDark}
              />

              <StatCard
                icon={Sparkles}
                label="Devis en cours"
                value={formatFullMoney(stats.totalDevisEnCours)}
                subValue={`${stats.devisEnCoursCount} devis en attente`}
                color="#f59e0b"
                isDark={isDark}
              />

              {/* Goal progress */}
              <div className={cn(
                'relative overflow-hidden rounded-xl p-4 transition-all duration-200',
                'border',
                isDark
                  ? 'bg-slate-800/50 border-slate-700'
                  : 'bg-gray-50 border-gray-100'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center',
                          isDark ? 'bg-slate-700' : 'bg-white shadow-sm'
                        )}
                        style={{ color: '#10b981' }}
                      >
                        <Target size={14} />
                      </div>
                      <p className={cn(
                        'text-xs font-medium',
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        Objectif
                      </p>
                      <div className="relative group">
                        <Info size={12} className={cn('cursor-help', isDark ? 'text-gray-500' : 'text-gray-400')} />
                        <div className={cn(
                          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg',
                          isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-800 text-white'
                        )}>
                          Objectif calculé automatiquement : moyenne du CA des 6 derniers mois + 10%
                          <div className={cn(
                            'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent',
                            isDark ? 'border-t-slate-700' : 'border-t-gray-800'
                          )} />
                        </div>
                      </div>
                    </div>

                    <p className={cn(
                      'text-lg font-bold mt-2',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {formatFullMoney(stats.monthlyGoal)}
                    </p>

                    <p className={cn(
                      'text-xs mt-0.5',
                      stats.goalProgress >= 100
                        ? 'text-emerald-500 font-medium'
                        : isDark ? 'text-gray-500' : 'text-gray-400'
                    )}>
                      {stats.goalProgress >= 100 ? '🎉 Objectif atteint!' : `${Math.round(stats.goalProgress)}% atteint`}
                    </p>
                    <p className={cn(
                      'text-[10px] mt-1 italic',
                      isDark ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      Moy. 6 mois + 10%
                    </p>
                  </div>

                  <ProgressRing
                    value={stats.currentMonth}
                    max={stats.monthlyGoal}
                    color={stats.goalProgress >= 100 ? '#10b981' : '#3b82f6'}
                    size={52}
                    strokeWidth={5}
                    isDark={isDark}
                  />
                </div>
              </div>
            </div>

            {/* Area chart */}
            <div className={cn(
              'rounded-xl p-4',
              isDark ? 'bg-slate-800/30' : 'bg-gray-50/50'
            )}>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDark ? '#334155' : '#e5e7eb'}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                      tickFormatter={formatMoney}
                      domain={[0, maxRevenue * 1.1]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={stats.monthlyGoal}
                      stroke="#10b981"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: 'Objectif',
                        position: 'right',
                        fill: '#10b981',
                        fontSize: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isCurrent) {
                          return (
                            <g key={`dot-${payload.label}`}>
                              <circle cx={cx} cy={cy} r={6} fill="#3b82f6" />
                              <circle cx={cx} cy={cy} r={3} fill="#fff" />
                            </g>
                          );
                        }
                        return <circle key={`dot-${payload.label}`} cx={cx} cy={cy} r={3} fill="#3b82f6" />;
                      }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </WidgetContent>

      <WidgetFooter isDark={isDark}>
        <WidgetLink onClick={handleNavigate} isDark={isDark}>
          Voir toutes les factures
        </WidgetLink>
        <WidgetLink onClick={handleNavigate} isDark={isDark}>
          Créer une facture
          <ChevronRight size={14} className="ml-1" />
        </WidgetLink>
      </WidgetFooter>
    </Widget>
  );
}

/**
 * Skeleton for loading state
 */
export function RevenueChartWidgetSkeleton({ isDark = false }) {
  return (
    <Widget loading isDark={isDark} className="col-span-full">
      <WidgetHeader title="Performance ce mois" icon={<BarChart3 />} isDark={isDark} />
      <WidgetContent>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn('h-28 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
            ))}
          </div>
          <div className={cn('h-48 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
        </div>
      </WidgetContent>
    </Widget>
  );
}
