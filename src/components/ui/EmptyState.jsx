import { Package, Users, FileText, Home, Calendar, Briefcase, Search, Plus } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState - Consistent empty state component
 *
 * Usage:
 * <EmptyState
 *   icon={Users}
 *   title="Aucun client"
 *   description="Ajoutez votre premier client pour commencer"
 *   action={{ label: "Ajouter un client", onClick: () => {} }}
 * />
 */

const DEFAULT_ICONS = {
  clients: Users,
  devis: FileText,
  chantiers: Home,
  planning: Calendar,
  equipe: Users,
  catalogue: Package,
  search: Search,
  default: Package
};

export default function EmptyState({
  icon: IconProp,
  iconType,
  title,
  description,
  action,
  secondaryAction,
  features,
  isDark = false,
  couleur = '#f97316',
  compact = false,
  className = ''
}) {
  const Icon = IconProp || DEFAULT_ICONS[iconType] || DEFAULT_ICONS.default;
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  if (compact) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div
          className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${couleur}15` }}
        >
          <Icon size={24} style={{ color: couleur }} />
        </div>
        <h3 className={`font-medium mb-1 ${textPrimary}`}>{title}</h3>
        {description && (
          <p className={`text-sm mb-4 ${textMuted}`}>{description}</p>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            couleur={couleur}
            isDark={isDark}
            size="sm"
          >
            {action.icon && <action.icon size={16} />}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${className}`}>
      {/* Header with gradient */}
      <div
        className="p-8 sm:p-12 text-center relative"
        style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.3\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")'
          }}
          aria-hidden="true"
        />

        <div className="relative">
          {/* Icon */}
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
          >
            <Icon size={40} className="text-white" aria-hidden="true" />
          </div>

          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>
            {title}
          </h2>

          {description && (
            <p className={`text-sm sm:text-base max-w-md mx-auto ${textMuted}`}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Features grid */}
      {features && features.length > 0 && (
        <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>
            Ce que vous pouvez faire
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${couleur}20` }}
                >
                  {feature.icon && <feature.icon size={18} style={{ color: couleur }} />}
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>{feature.title}</p>
                  <p className={`text-xs ${textMuted}`}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {action && (
              <Button
                onClick={action.onClick}
                couleur={couleur}
                isDark={isDark}
              >
                {action.icon ? <action.icon size={18} /> : <Plus size={18} />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="secondary"
                isDark={isDark}
              >
                {secondaryAction.icon && <secondaryAction.icon size={18} />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Simple action (no features) */}
      {!features && action && (
        <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={action.onClick}
              couleur={couleur}
              isDark={isDark}
            >
              {action.icon ? <action.icon size={18} /> : <Plus size={18} />}
              {action.label}
            </Button>
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="secondary"
                isDark={isDark}
              >
                {secondaryAction.icon && <secondaryAction.icon size={18} />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SearchEmptyState - Empty state for search results
 */
export function SearchEmptyState({
  query,
  onClear,
  onCreate,
  entityName = 'résultat',
  isDark = false,
  couleur = '#f97316'
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`text-center py-12 px-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${couleur}15` }}
      >
        <Search size={28} style={{ color: couleur }} />
      </div>

      <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
        Aucun {entityName} trouvé
      </h3>

      <p className={`text-sm mb-6 ${textMuted}`}>
        Aucun résultat pour "{query}"
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onClear && (
          <Button
            onClick={onClear}
            variant="secondary"
            isDark={isDark}
          >
            Effacer la recherche
          </Button>
        )}
        {onCreate && (
          <Button
            onClick={onCreate}
            couleur={couleur}
            isDark={isDark}
          >
            <Plus size={18} />
            Créer "{query}"
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * ErrorEmptyState - Empty state for errors
 */
export function ErrorEmptyState({
  title = 'Une erreur est survenue',
  description = 'Impossible de charger les données',
  onRetry,
  isDark = false
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`text-center py-12 px-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center bg-red-100">
        <Package size={28} className="text-red-500" />
      </div>

      <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
        {title}
      </h3>

      <p className={`text-sm mb-6 ${textMuted}`}>
        {description}
      </p>

      {onRetry && (
        <Button onClick={onRetry} variant="secondary" isDark={isDark}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
