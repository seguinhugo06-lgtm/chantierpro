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
  isDark = false
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="status">
      {Icon && (
        <div className={`mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} aria-hidden="true">
          <Icon size={48} strokeWidth={1.5} />
        </div>
      )}
      <h3 className={`text-lg font-semibold mb-1 ${textPrimary}`}>{title}</h3>
      {description && (
        <p className={`text-sm max-w-sm ${textSecondary}`}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
