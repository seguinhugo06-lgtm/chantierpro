/**
 * KPICard — Reusable KPI indicator card
 *
 * Provides a consistent design for KPI cards across all pages.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} label - KPI label (e.g. "Chiffre d'affaires")
 * @param {string|number} value - KPI value (e.g. "12 450 €")
 * @param {string} [sublabel] - Optional secondary text
 * @param {string} [color] - Accent color (default: orange-500)
 * @param {'up'|'down'|null} [trend] - Optional trend direction
 * @param {string} [trendValue] - Trend text (e.g. "+12%")
 * @param {boolean} [isDark] - Dark mode
 */
export default function KPICard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = '#f97316',
  trend,
  trendValue,
  isDark = false
}) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`rounded-xl border p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color + '20' }}
            aria-hidden="true"
          >
            <Icon size={16} style={{ color }} />
          </div>
        )}
        <span className={`text-xs font-medium uppercase tracking-wide ${textSecondary}`}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <p className={`text-2xl font-bold ${textPrimary}`}>{value}</p>
        {trend && trendValue && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {trendValue}
          </span>
        )}
      </div>
      {sublabel && <p className={`text-xs mt-1 ${textSecondary}`}>{sublabel}</p>}
    </div>
  );
}
