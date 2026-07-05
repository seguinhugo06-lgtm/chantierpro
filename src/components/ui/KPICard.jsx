import { resolveTone } from '../../lib/uiTheme';

/**
 * KPICard — Tuile KPI "énergique & coloré"
 *
 * Design system BatiGesti : chip d'icône coloré, valeur XL, bordure teintée,
 * pastille de tendance. Une couleur = un sens.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} label - KPI label (e.g. "Chiffre d'affaires")
 * @param {string|number} value - KPI value (e.g. "12 450 €")
 * @param {string} [sublabel] - Optional secondary text
 * @param {string} [color] - Accent hex (défaut orange). Ignoré si `tone` fourni.
 * @param {string} [tone] - Ton sémantique : money|info|warning|danger|neutral|accent
 * @param {'up'|'down'|null} [trend] - Optional trend direction
 * @param {string} [trendValue] - Trend text (e.g. "+12%")
 * @param {Function} [onClick] - Rend la tuile cliquable
 * @param {boolean} [isDark] - Dark mode
 */
export default function KPICard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = '#f97316',
  tone,
  trend,
  trendValue,
  onClick,
  isDark = false,
}) {
  const c = resolveTone(tone, color);
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl border p-4 overflow-hidden transition-all duration-200 ${cardBg} ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer' : ''
      }`}
      style={{ borderColor: isDark ? `${c}40` : `${c}33` }}
    >
      {/* Wash coloré discret (énergie) */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-60"
        style={{ background: `${c}14` }}
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between mb-3">
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${c}1f`, color: c }}
            aria-hidden="true"
          >
            <Icon size={18} />
          </div>
        )}
        {trend && trendValue && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={
              trend === 'up'
                ? { background: '#10b98120', color: isDark ? '#34d399' : '#059669' }
                : { background: '#ef444420', color: isDark ? '#f87171' : '#dc2626' }
            }
          >
            {trendValue}
          </span>
        )}
      </div>

      <p className={`relative text-2xl sm:text-3xl font-bold leading-none ${textPrimary}`}>{value}</p>
      <p className={`relative text-xs font-medium mt-2 ${textSecondary}`}>{label}</p>
      {sublabel && <p className={`relative text-xs mt-0.5 ${textSecondary}`}>{sublabel}</p>}
    </Comp>
  );
}
