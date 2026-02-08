/**
 * PageHeader — Reusable page header with icon, title, subtitle & action
 *
 * Provides a consistent design for page headers across all pages.
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
  color = '#f97316'
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color + '20' }}
            aria-hidden="true"
          >
            <Icon size={20} style={{ color }} />
          </div>
        )}
        <div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>{title}</h1>
          {subtitle && (
            <p className={`text-sm ${textSecondary}`}>{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
