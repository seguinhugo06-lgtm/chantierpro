/**
 * PageHeader — en-tête de page des modules. Refonte du 9 oct. 2026 : même rendu que
 * ui/EnTete.jsx (EnTetePage) — titre 24 px, sous-titre, actions. La tuile d'icône en dégradé est
 * retirée : sur téléphone elle repoussait le contenu, et l'accent est réservé à l'action.
 * L'API est gardée (icon, isDark, color acceptés et ignorés) pour les 7 modules qui l'utilisent.
 *
 * @param {string} title
 * @param {string} [subtitle]
 * @param {React.ReactNode} [action]
 */
// eslint-disable-next-line no-unused-vars -- icon, isDark, color : API historique, ignorés
export default function PageHeader({ icon, title, subtitle, action, isDark, color }) {
  return (
    <header data-ui="EnTetePage" className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-encre text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-encre-3">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
    </header>
  );
}
