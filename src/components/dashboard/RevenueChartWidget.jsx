/**
 * RevenueChartWidget - Linear-style analytics chart widget
 *
 * Features:
 * - Clean area chart with subtle gradient
 * - Period toggle (Sem/Mois/Trim)
 * - Trend badge
 * - Mini stats row below chart
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
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useDevis } from '../../context/DataContext';
import Widget, { WidgetHeader, WidgetContent, WidgetFooter, WidgetLink } from './Widget';

// Month names
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_NAMES_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const PERIOD_TABS = [
  { value: 'week', label: 'Sem' },
  { value: 'month', label: 'Mois' },
  { value: 'quarter', label: 'Trim' },
];

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
 * Custom tooltip — Linear style
 */
function CustomTooltip({ active, payload, label, isDark }) {
  if (active && payload && payload.length) {
    return (
      <div
        className={cn(
          'px-3.5 py-2.5 rounded-lg shadow-lg border text-sm',
          isDark
            ? 'bg-[#161616] border-[#262626]'
            : 'bg-white border-[#ebebeb]'
        )}
      >
        <p className={cn(
          'text-[11px] mb-0.5',
          isDark ? 'text-gray-500' : 'text-gray-400'
        )}>
          {label}
        </p>
        <p className={cn(
          'text-sm font-semibold tracking-tight',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          {formatFullMoney(payload[0].value)}
        </p>
        {payload[0].payload.invoiceCount > 0 && (
          <p className={cn(
            'text-[11px] mt-0.5',
            isDark ? 'text-gray-500' : 'text-gray-400'
          )}>
            {payload[0].payload.invoiceCount} facture{payload[0].payload.invoiceCount > 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  }
  return null;
}

/**
 * Period toggle — Linear-style pill tabs
 */
function PeriodToggle({ value, onChange, isDark }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-0.5 p-0.5 rounded-lg',
      isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100'
    )}>
      {PERIOD_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-150',
            value === tab.value
              ? isDark
                ? 'bg-[#262626] text-white shadow-sm'
                : 'bg-white text-gray-900 shadow-sm'
              : isDark
                ? 'text-gray-500 hover:text-gray-400'
                : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Mini stat — compact inline stat below chart
 */
function MiniStat({ label, value, isDark }) {
  return (
    <div className="flex-1 min-w-0">
      <p className={cn(
        'text-[11px] font-medium',
        isDark ? 'text-gray-500' : 'text-gray-400'
      )}>
        {label}
      </p>
      <p className={cn(
        'text-sm font-semibold tracking-tight mt-0.5',
        isDark ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
    </div>
  );
}

/**
 * RevenueChartWidget Component
 */
export default function RevenueChartWidget({ setPage, isDark = false, couleur = '#3b82f6', className }) {
  const { devis = [] } = useDevis();
  const [period, setPeriod] = React.useState('month');

  // Calculate monthly revenue data
  const { chartData, stats } = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Determine months to show based on period
    const monthCount = period === 'week' ? 4 : period === 'quarter' ? 12 : 6;
    const months = [];

    for (let i = monthCount - 1; i >= 0; i--) {
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
      if (d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)) {
        totalDevisEnCours += d.total_ht || 0;
        devisEnCoursCount++;
      }

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
    const totalPeriod = months.reduce((sum, m) => sum + m.revenue, 0);
    const activeMonths = months.filter(m => m.revenue > 0);
    const average = activeMonths.length > 0 ? totalPeriod / activeMonths.length : 0;
    const bestMonth = months.reduce((best, m) => m.revenue > (best?.revenue || 0) ? m : best, null);

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
        totalPeriod,
        average,
        trend,
        bestMonth: bestMonth?.fullLabel || '-',
        bestMonthValue: bestMonth?.revenue || 0,
        totalDevisEnCours,
        devisEnCoursCount,
        invoiceCountThisMonth: currentMonthData?.invoiceCount || 0,
      },
    };
  }, [devis, period]);

  const handleNavigate = () => {
    setPage?.('devis');
  };

  const isEmpty = stats.totalPeriod === 0;

  return (
    <Widget
      isDark={isDark}
      className={cn('col-span-full', className)}
    >
      {/* Header with title, trend badge, and period toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className={cn(
            'text-base font-semibold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            Chiffre d'affaires
          </h2>
          {stats.trend !== null && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium',
              stats.trend >= 0
                ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600')
            )}>
              {stats.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {stats.trend >= 0 ? '+' : ''}{stats.trend}%
            </div>
          )}
        </div>
        <PeriodToggle value={period} onChange={setPeriod} isDark={isDark} />
      </div>

      <WidgetContent>
        {isEmpty ? (
          <div className={cn(
            'flex flex-col items-center justify-center py-16 text-center',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}>
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
              isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            )}>
              <BarChart3 size={28} className="opacity-30" />
            </div>
            <p className="text-sm font-medium">Aucune donnée ce mois</p>
            <p className="text-xs mt-1 opacity-75 max-w-xs">
              Les données apparaîtront avec vos devis acceptés et factures
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Area chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={couleur} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={couleur} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal={true}
                    vertical={false}
                    stroke={isDark ? '#1a1a1a' : '#f5f5f5'}
                    strokeDasharray=""
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#666' : '#999' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#666' : '#999' }}
                    tickFormatter={formatMoney}
                  />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={couleur}
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="url(#revenueGradient)"
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      // Only show dot on last (current) point
                      if (payload.isCurrent) {
                        return (
                          <g key={`dot-${payload.label}`}>
                            <circle cx={cx} cy={cy} r={5} fill={couleur} />
                            <circle cx={cx} cy={cy} r={2.5} fill={isDark ? '#161616' : '#fff'} />
                          </g>
                        );
                      }
                      return <g key={`dot-${payload.label}`} />;
                    }}
                    activeDot={{ r: 5, stroke: couleur, strokeWidth: 2, fill: isDark ? '#161616' : '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Mini stats row */}
            <div className={cn(
              'flex items-center gap-6 pt-4 border-t',
              isDark ? 'border-[#1a1a1a]' : 'border-gray-100'
            )}>
              <MiniStat
                label="Total"
                value={formatFullMoney(stats.totalPeriod)}
                isDark={isDark}
              />
              <MiniStat
                label="Moyenne"
                value={formatFullMoney(stats.average)}
                isDark={isDark}
              />
              <MiniStat
                label="Meilleur"
                value={formatFullMoney(stats.bestMonthValue)}
                isDark={isDark}
              />
              {stats.devisEnCoursCount > 0 && (
                <MiniStat
                  label="En cours"
                  value={`${stats.devisEnCoursCount} devis`}
                  isDark={isDark}
                />
              )}
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
      <WidgetHeader title="Chiffre d'affaires" icon={<BarChart3 />} isDark={isDark} />
      <WidgetContent>
        <div className="animate-pulse space-y-5">
          <div className={cn('h-52 rounded-xl', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
          <div className="flex gap-6 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 space-y-1.5">
                <div className={cn('h-3 w-12 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
                <div className={cn('h-4 w-20 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')} />
              </div>
            ))}
          </div>
        </div>
      </WidgetContent>
    </Widget>
  );
}
