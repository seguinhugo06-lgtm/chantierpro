import { Package, Users, FileText, Home, Calendar, Search, Plus } from 'lucide-react';

/**
 * EmptyState - Consistent empty state component with SVG illustrations
 *
 * Usage:
 * <EmptyState
 *   icon={Users}
 *   illustration="team"
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

// ──── Inline SVG illustrations (flat line-art style) ────
function IllustrationCamera({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="30" width="90" height="60" rx="8" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <path d="M42 30V22a6 6 0 016-6h24a6 6 0 016 6v8" stroke={couleur} strokeWidth="2.5" />
      <circle cx="60" cy="58" r="16" stroke={couleur} strokeWidth="2.5" fill={`${couleur}15`} />
      <circle cx="60" cy="58" r="8" stroke={couleur} strokeWidth="2" fill={`${couleur}25`} />
      <circle cx="88" cy="42" r="4" fill={`${couleur}40`} />
      <rect x="22" y="38" width="12" height="6" rx="2" fill={`${couleur}30`} />
    </svg>
  );
}

function IllustrationReceipt({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 10h60a6 6 0 016 6v68l-8-5-8 5-8-5-8 5-8-5-8 5-8-5-8 5V16a6 6 0 016-6z" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <line x1="42" y1="30" x2="84" y2="30" stroke={couleur} strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="42" x2="78" y2="42" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="42" y1="54" x2="72" y2="54" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="36" cy="30" r="2.5" fill={couleur} />
      <circle cx="36" cy="42" r="2.5" fill={`${couleur}60`} />
      <circle cx="36" cy="54" r="2.5" fill={`${couleur}40`} />
      <line x1="42" y1="68" x2="60" y2="68" stroke={couleur} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="66" y1="68" x2="84" y2="68" stroke={couleur} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationFolder({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 28h28l8-10h36a6 6 0 016 6v2H16v2z" fill={`${couleur}20`} />
      <rect x="16" y="28" width="88" height="56" rx="6" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <path d="M16 28V22a6 6 0 016-6h22l8 12h36a6 6 0 016 6v-6" stroke={couleur} strokeWidth="2.5" />
      <line x1="40" y1="52" x2="80" y2="52" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="48" y1="62" x2="72" y2="62" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function IllustrationPencil({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="80" height="80" rx="6" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <line x1="34" y1="30" x2="86" y2="30" stroke={couleur} strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="42" x2="76" y2="42" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="34" y1="54" x2="68" y2="54" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="34" y1="66" x2="52" y2="66" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M82 56l12-12a3 3 0 014.2 0l3.8 3.8a3 3 0 010 4.2L90 64l-10 2 2-10z" stroke={couleur} strokeWidth="2" fill={`${couleur}20`} />
    </svg>
  );
}

function IllustrationChat({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="12" width="64" height="44" rx="8" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <path d="M26 56v14l14-14" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <line x1="28" y1="28" x2="64" y2="28" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="28" y1="38" x2="56" y2="38" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <rect x="48" y="40" width="56" height="36" rx="8" stroke={couleur} strokeWidth="2.5" fill={`${couleur}15`} />
      <path d="M90 76v10l-10-10" stroke={couleur} strokeWidth="2.5" fill={`${couleur}15`} />
      <line x1="60" y1="54" x2="92" y2="54" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="60" y1="62" x2="84" y2="62" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function IllustrationShelf({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shelf frame */}
      <rect x="16" y="8" width="88" height="84" rx="4" stroke={couleur} strokeWidth="2.5" fill="none" />
      <line x1="16" y1="38" x2="104" y2="38" stroke={couleur} strokeWidth="2" />
      <line x1="16" y1="68" x2="104" y2="68" stroke={couleur} strokeWidth="2" />
      {/* Top shelf items */}
      <rect x="24" y="16" width="14" height="20" rx="2" fill={`${couleur}30`} />
      <rect x="42" y="12" width="12" height="24" rx="2" fill={`${couleur}20`} />
      <rect x="58" y="18" width="16" height="18" rx="2" fill={`${couleur}15`} />
      {/* Middle shelf items */}
      <rect x="24" y="44" width="18" height="20" rx="3" fill={`${couleur}25`} />
      <rect x="48" y="46" width="10" height="18" rx="2" fill={`${couleur}15`} />
      <circle cx="78" cy="56" r="8" fill={`${couleur}20`} stroke={couleur} strokeWidth="1.5" />
      {/* Bottom shelf */}
      <rect x="28" y="74" width="24" height="14" rx="2" fill={`${couleur}15`} />
      <rect x="58" y="72" width="18" height="16" rx="2" fill={`${couleur}25`} />
    </svg>
  );
}

function IllustrationTeam({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Center person */}
      <circle cx="60" cy="32" r="12" stroke={couleur} strokeWidth="2.5" fill={`${couleur}15`} />
      <path d="M38 72c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      {/* Left person */}
      <circle cx="28" cy="40" r="9" stroke={couleur} strokeWidth="2" fill={`${couleur}10`} opacity="0.7" />
      <path d="M12 72c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke={couleur} strokeWidth="2" opacity="0.5" />
      {/* Right person */}
      <circle cx="92" cy="40" r="9" stroke={couleur} strokeWidth="2" fill={`${couleur}10`} opacity="0.7" />
      <path d="M76 72c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke={couleur} strokeWidth="2" opacity="0.5" />
      {/* Line underneath */}
      <line x1="20" y1="82" x2="100" y2="82" stroke={couleur} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

function IllustrationClock({ couleur }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="36" stroke={couleur} strokeWidth="2.5" fill={`${couleur}08`} />
      <circle cx="60" cy="50" r="3" fill={couleur} />
      <line x1="60" y1="50" x2="60" y2="28" stroke={couleur} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="50" x2="78" y2="56" stroke={couleur} strokeWidth="2" strokeLinecap="round" />
      {/* Hour marks */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
        <line
          key={deg}
          x1={60 + 30 * Math.cos((deg - 90) * Math.PI / 180)}
          y1={50 + 30 * Math.sin((deg - 90) * Math.PI / 180)}
          x2={60 + 34 * Math.cos((deg - 90) * Math.PI / 180)}
          y2={50 + 34 * Math.sin((deg - 90) * Math.PI / 180)}
          stroke={couleur}
          strokeWidth={deg % 90 === 0 ? "2.5" : "1.5"}
          strokeLinecap="round"
          opacity={deg % 90 === 0 ? "0.8" : "0.4"}
        />
      ))}
    </svg>
  );
}

const ILLUSTRATIONS = {
  camera: IllustrationCamera,
  receipt: IllustrationReceipt,
  folder: IllustrationFolder,
  pencil: IllustrationPencil,
  chat: IllustrationChat,
  shelf: IllustrationShelf,
  team: IllustrationTeam,
  clock: IllustrationClock
};

export default function EmptyState({
  icon: IconProp,
  iconType,
  illustration,
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
  const Illust = illustration ? ILLUSTRATIONS[illustration] : null;
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center text-center py-8 sm:py-10 px-4 ${className}`}>
        {Illust ? (
          <div className="mb-4 opacity-80">
            <Illust couleur={couleur} />
          </div>
        ) : (
          <div
            className="w-14 h-14 mb-4 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${couleur}12` }}
          >
            <Icon size={26} style={{ color: couleur }} />
          </div>
        )}
        <h3 className={`font-semibold mb-1 ${textPrimary}`}>{title}</h3>
        {description && (
          <p className={`text-sm mb-5 max-w-xs mx-auto ${textMuted}`}>{description}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.97]"
              style={{ background: couleur }}
            >
              {action.icon && <action.icon size={16} />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                isDark
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {secondaryAction.icon && <secondaryAction.icon size={16} />}
              {secondaryAction.label}
            </button>
          )}
        </div>
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
          {/* Illustration or Icon */}
          {Illust ? (
            <div className="mb-6 flex justify-center">
              <Illust couleur={couleur} />
            </div>
          ) : (
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
            >
              <Icon size={40} className="text-white" aria-hidden="true" />
            </div>
          )}

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
              <button
                onClick={action.onClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.97]"
                style={{ background: couleur }}
              >
                {action.icon ? <action.icon size={18} /> : <Plus size={18} />}
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all border ${
                  isDark
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {secondaryAction.icon && <secondaryAction.icon size={18} />}
                {secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Simple action (no features) */}
      {!features && action && (
        <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={action.onClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.97]"
              style={{ background: couleur }}
            >
              {action.icon ? <action.icon size={18} /> : <Plus size={18} />}
              {action.label}
            </button>
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all border ${
                  isDark
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {secondaryAction.icon && <secondaryAction.icon size={18} />}
                {secondaryAction.label}
              </button>
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
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

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
        Aucun résultat pour &quot;{query}&quot;
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onClear && (
          <button
            onClick={onClear}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Effacer la recherche
          </button>
        )}
        {onCreate && (
          <button
            onClick={onCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white font-medium transition-all hover:opacity-90 hover:shadow-lg"
            style={{ background: couleur }}
          >
            <Plus size={18} />
            Créer &quot;{query}&quot;
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ErrorEmptyState - Empty state for errors
 */
export function ErrorEmptyState({
  title = 'Quelque chose n\'a pas marché',
  description = 'Impossible de charger les données',
  onRetry,
  isDark = false
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

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
        <button
          onClick={onRetry}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            isDark
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
