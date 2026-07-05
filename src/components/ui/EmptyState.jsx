/**
 * EmptyState — État vide "énergique & coloré"
 *
 * Placeholder amical et vivant pour les listes vides. Design system BatiGesti.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} title - Main message (e.g. "Aucun devis")
 * @param {string} [description] - Optional helper text
 * @param {string} [actionLabel] - Optional CTA button label
 * @param {Function} [onAction] - Optional CTA button handler
 * @param {boolean} [isDark] - Dark mode
 * @param {string} [couleur] - Accent hex
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  isDark = false,
  couleur = '#f97316',
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl ${
        isDark ? 'bg-slate-800/50' : 'bg-white'
      }`}
      role="status"
    >
      {Icon && (
        <div className="mb-5 relative" aria-hidden="true">
          {/* Halo coloré */}
          <div
            className="absolute inset-0 rounded-[28px] blur-xl opacity-40"
            style={{ background: couleur }}
          />
          <div
            className="relative w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto"
            style={{ background: `linear-gradient(135deg, ${couleur}22, ${couleur}0d)` }}
          >
            <Icon size={34} strokeWidth={1.75} style={{ color: couleur }} />
          </div>
        </div>
      )}
      <h3 className={`text-lg font-bold mb-1.5 ${textPrimary}`}>{title}</h3>
      {description && <p className={`text-sm max-w-sm ${textSecondary}`}>{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-5 py-3 min-h-[44px] rounded-xl text-white text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}d9)`, outlineColor: couleur }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
