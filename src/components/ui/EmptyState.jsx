/**
 * EmptyState — Reusable empty state placeholder
 *
 * Provides a consistent design for empty list states across all pages.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} title - Main message (e.g. "Aucun devis")
 * @param {string} [description] - Optional helper text
 * @param {string} [actionLabel] - Optional CTA button label
 * @param {Function} [onAction] - Optional CTA button handler
 * @param {boolean} [isDark] - Dark mode
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  isDark = false,
  couleur = '#f97316'
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="status">
      {Icon && (
        <div className="mb-4" aria-hidden="true">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: `${couleur}15` }}
          >
            <Icon size={32} strokeWidth={1.5} style={{ color: couleur }} />
          </div>
        </div>
      )}
      <h3 className={`text-lg font-semibold mb-1 ${textPrimary}`}>{title}</h3>
      {description && (
        <p className={`text-sm max-w-sm ${textSecondary}`}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-5 py-3 min-h-[44px] rounded-xl text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-200"
          style={{ background: couleur }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
