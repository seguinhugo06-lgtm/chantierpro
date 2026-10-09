/**
 * En-têtes — refonte du 9 oct. 2026.
 *
 * EnTetePage : titre de page 24 px, sous-titre, actions à droite (une seule pleine). Plus de tuile
 * d'icône en dégradé : sur téléphone elle repoussait le contenu, et l'accent est réservé à l'action.
 * TitreSection : intitulé de bloc 18 px, compteur, lien d'action à droite.
 */
export function EnTetePage({ titre, sousTitre, actions, className = '' }) {
  return (
    <header data-ui="EnTetePage" className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-5 sm:mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-encre text-balance">{titre}</h1>
        {sousTitre ? <p className="mt-1 text-sm text-encre-3">{sousTitre}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
    </header>
  );
}

export function TitreSection({ titre, compte, action, onAction, as: Element = 'h2', className = '' }) {
  return (
    <div data-ui="TitreSection" className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      <Element className="text-lg font-semibold text-encre flex items-baseline gap-2 min-w-0">
        <span className="truncate">{titre}</span>
        {compte !== undefined && compte !== null ? (
          <span className="text-sm font-medium text-encre-3 tabular-nums">{compte}</span>
        ) : null}
      </Element>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="h-11 -mr-2 px-2 rounded-xl text-sm font-semibold text-accent-texte hover:bg-surface-2 flex-shrink-0">
          {action}
        </button>
      ) : null}
    </div>
  );
}
