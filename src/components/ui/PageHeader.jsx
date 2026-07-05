/**
 * PageHeader — En-tête de page "énergique & coloré"
 *
 * Squelette unique de tous les modules : chip d'icône vif + titre XL + sous-titre
 * + zone d'actions. Design system BatiGesti.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} title - Page title
 * @param {string} [subtitle] - Optional subtitle/description
 * @param {React.ReactNode} [action] - Optional action area (button, etc.)
 * @param {boolean} [isDark] - Dark mode
 * @param {string} [color] - Accent color (default: orange-500)
 */
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  isDark = false,
  color = '#f97316',
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              color: '#fff',
            }}
            aria-hidden="true"
          >
            <Icon size={22} strokeWidth={2.2} />
          </div>
        )}
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${textPrimary}`}>{title}</h1>
          {subtitle && <p className={`text-sm mt-0.5 ${textSecondary}`}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
    </div>
  );
}
