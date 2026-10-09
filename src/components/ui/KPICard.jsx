/**
 * KPICard — tuile de chiffre des modules. Refonte du 9 oct. 2026 : même rendu que
 * ui/TuileChiffre.jsx — libellé, gros chiffre tabulaire, contexte ; ni pastille d'icône, ni bordure
 * colorée, ni cercle décoratif (les 8 modèles de tuiles de l'app se lisaient chacun autrement).
 * La seule couleur : le ton « danger » (valeur en rouge) et la tendance.
 * L'API est gardée (icon, color, isDark acceptés et ignorés).
 *
 * @param {string} label
 * @param {string|number} value
 * @param {string} [sublabel]
 * @param {string} [tone] seul « danger » colore la valeur
 * @param {'up'|'down'|null} [trend]
 * @param {string} [trendValue]
 * @param {Function} [onClick]
 */
// eslint-disable-next-line no-unused-vars -- icon, color, isDark : API historique, ignorés
export default function KPICard({ icon, label, value, sublabel, color, tone, trend, trendValue, onClick, isDark }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      data-ui="TuileChiffre"
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`w-full min-w-0 min-h-[96px] flex flex-col justify-between gap-2 text-left rounded-2xl border border-bord bg-surface shadow-e1 p-4 ${
        onClick ? 'transition-colors hover:border-bord-fort active:bg-surface-2' : ''
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight text-encre-2">{label}</span>
        {trend && trendValue ? (
          <span className={`text-xs font-semibold whitespace-nowrap ${trend === 'up' ? 'text-succes-texte' : 'text-danger-texte'}`}>{trendValue}</span>
        ) : null}
      </span>
      <span className={`text-2xl sm:text-3xl font-bold leading-none tabular-nums tracking-tight truncate ${tone === 'danger' ? 'text-danger-texte' : 'text-encre'}`}>{value}</span>
      {sublabel ? <span className="text-sm text-encre-3 truncate">{sublabel}</span> : null}
    </Comp>
  );
}
