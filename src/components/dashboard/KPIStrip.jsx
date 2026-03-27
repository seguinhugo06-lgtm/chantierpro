import { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * KPIStrip - 4 KPI cards in a 2x2 mobile / 4-column desktop grid.
 *
 * Props:
 *  - isDark (boolean)
 *  - couleur (string, hex)
 *  - kpis (array of { label, value, trend, trendUp, icon, onClick })
 *    - label: string (e.g. "Chiffre d'affaires")
 *    - value: string (e.g. "12 500 EUR")
 *    - trend: string (e.g. "+15%")
 *    - trendUp: boolean (true = positive, false = negative)
 *    - icon: lucide-react component
 *    - onClick: function (optional)
 */
const KPIStrip = memo(function KPIStrip({ isDark, couleur, kpis = [] }) {
  const cardBg = isDark
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi, idx) => {
          const IconComponent = kpi.icon;
          const isClickable = typeof kpi.onClick === 'function';
          const Tag = isClickable ? 'button' : 'div';

          return (
            <Tag
              key={kpi.label || idx}
              onClick={isClickable ? kpi.onClick : undefined}
              className={`${cardBg} rounded-2xl border p-5 text-left transition-all duration-200 ${
                isClickable
                  ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                  : ''
              }`}
              style={isClickable ? { '--tw-ring-color': couleur } : undefined}
              type={isClickable ? 'button' : undefined}
            >
            {/* Icon circle + trend */}
            <div className="flex items-center justify-between mb-2">
              {IconComponent && (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${couleur}15` }}
                >
                  <IconComponent size={18} style={{ color: couleur }} />
                </div>
              )}
              {kpi.trend && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    kpi.trendUp
                      ? isDark
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : 'bg-emerald-50 text-emerald-600'
                      : isDark
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-red-50 text-red-600'
                  }`}
                >
                  {kpi.trendUp ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {kpi.trend}
                </span>
              )}
            </div>

            {/* Value */}
            <p className={`text-xl font-bold ${textPrimary} leading-tight`}>
              {kpi.value}
            </p>

            {/* Label */}
            <p className={`text-xs mt-0.5 ${textMuted}`}>{kpi.label}</p>
            </Tag>
          );
        })}
      </div>
    </div>
  );
});

export default KPIStrip;
