/**
 * EmptyState — état vide des modules. Refonte du 9 oct. 2026 : même rendu que ui/EtatVide.jsx —
 * icône neutre, titre, phrase, une seule action (bouton principal d'accent). Sans halo ni motif.
 * L'API est gardée (isDark, couleur acceptés et ignorés).
 */
// eslint-disable-next-line no-unused-vars -- isDark, couleur : API historique, ignorés
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, isDark, couleur }) {
  return (
    <div data-ui="EtatVide" role="status" className="flex flex-col items-center text-center px-6 py-12">
      {Icon && (
        <span className="w-12 h-12 rounded-2xl bg-surface-2 text-encre-3 flex items-center justify-center" aria-hidden="true">
          <Icon size={24} />
        </span>
      )}
      <h3 className="mt-4 text-lg font-semibold text-encre">{title}</h3>
      {description && <p className="mt-1 text-sm text-encre-2 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-11 px-4 rounded-xl bg-accent text-sur-accent text-sm font-semibold shadow-e1 hover:brightness-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
