import React from 'react';
import { Clock, Euro } from 'lucide-react';

/**
 * Format a number as EUR currency (French locale)
 * @param {number} amount
 * @returns {string}
 */
const formatPrice = (amount) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Difficulty badge config
 */
const DIFFICULTE_STYLES = {
  simple: {
    light: 'bg-green-100 text-green-700',
    dark: 'bg-green-900/30 text-green-400',
  },
  standard: {
    light: 'bg-blue-100 text-blue-700',
    dark: 'bg-blue-900/30 text-blue-400',
  },
  complexe: {
    light: 'bg-red-100 text-red-700',
    dark: 'bg-red-900/30 text-red-400',
  },
};

/**
 * Thin proportional bar showing fourniture / mainOeuvre / materiel breakdown
 */
function DecompositionBar({ fourniture, mainOeuvre, materiel }) {
  const total = (fourniture || 0) + (mainOeuvre || 0) + (materiel || 0);
  if (total === 0) return null;

  const pctF = ((fourniture || 0) / total) * 100;
  const pctMO = ((mainOeuvre || 0) / total) * 100;
  const pctMat = ((materiel || 0) / total) * 100;

  return (
    <div className="flex w-full h-1.5 rounded-full overflow-hidden mt-1">
      {pctF > 0 && (
        <div
          className="bg-amber-400 h-full"
          style={{ width: `${pctF}%` }}
          title={`Fourniture: ${pctF.toFixed(0)}%`}
        />
      )}
      {pctMO > 0 && (
        <div
          className="bg-blue-400 h-full"
          style={{ width: `${pctMO}%` }}
          title={`Main d'oeuvre: ${pctMO.toFixed(0)}%`}
        />
      )}
      {pctMat > 0 && (
        <div
          className="bg-emerald-400 h-full"
          style={{ width: `${pctMat}%` }}
          title={`Matériel: ${pctMat.toFixed(0)}%`}
        />
      )}
    </div>
  );
}

/**
 * DifficultyBadge — small pill showing difficulty level
 */
function DifficultyBadge({ difficulte, isDark }) {
  const config = DIFFICULTE_STYLES[difficulte];
  if (!config) return null;

  const classes = isDark ? config.dark : config.light;
  const label = difficulte.charAt(0).toUpperCase() + difficulte.slice(1);

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

/**
 * OuvrageCard — Compact card displaying a single ouvrage (construction work item).
 *
 * Renders in grid mode (card) or list mode (table row).
 *
 * @param {Object} props
 * @param {Object} props.ouvrage - Ouvrage data object
 * @param {boolean} props.isDark - Dark mode
 * @param {string} props.couleur - Brand accent color (hex)
 * @param {'grid'|'list'} props.viewMode - Display mode
 * @param {Function} props.onSelect - Click handler receiving ouvrage
 */
const OuvrageCard = React.memo(function OuvrageCard({
  ouvrage,
  isDark = false,
  couleur = '#f97316',
  viewMode = 'grid',
  onSelect,
}) {
  if (!ouvrage) return null;

  const {
    code,
    nom,
    description,
    unite,
    prixUnitaireHT,
    fourniture,
    mainOeuvre,
    materiel,
    tempsPoseH,
    tags,
    difficulte,
    _coeffGeo,
    _prixOriginal,
  } = ouvrage;

  const hasGeoCoeff = _coeffGeo != null && _coeffGeo !== 1 && _prixOriginal != null;

  const handleClick = () => {
    onSelect?.(ouvrage);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(ouvrage);
    }
  };

  // ── List mode ─────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-4 px-4 py-3 border-b cursor-pointer transition-colors ${
          isDark
            ? 'border-gray-700 hover:bg-gray-700/50'
            : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        {/* Code */}
        <span className={`text-xs font-mono w-20 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {code}
        </span>

        {/* Nom / Unité */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {nom || description || '—'}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {unite || '—'}
          </p>
        </div>

        {/* Prix HT */}
        <span className="w-24 text-right shrink-0 text-sm font-semibold" style={{ color: couleur }}>
          {hasGeoCoeff ? (
            <span className="flex flex-col items-end leading-tight">
              <span className={`text-xs line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatPrice(_prixOriginal)}
              </span>
              <span>{formatPrice(prixUnitaireHT)}</span>
            </span>
          ) : (
            formatPrice(prixUnitaireHT)
          )}
        </span>

        {/* F / MO / Mat */}
        <span className={`text-xs w-32 shrink-0 hidden md:flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="text-amber-500">F:{fourniture ?? '—'}</span>
          <span className="text-blue-500">MO:{mainOeuvre ?? '—'}</span>
          <span className="text-emerald-500">M:{materiel ?? '—'}</span>
        </span>

        {/* Temps */}
        <span className={`text-xs w-14 text-center shrink-0 hidden sm:block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {tempsPoseH != null ? `${tempsPoseH}h` : '—'}
        </span>

        {/* Difficulté */}
        <span className="w-20 shrink-0 hidden lg:flex justify-center">
          <DifficultyBadge difficulte={difficulte} isDark={isDark} />
        </span>
      </div>
    );
  }

  // ── Grid mode (card) ──────────────────────────────────────
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
        isDark
          ? 'bg-gray-800 border-gray-700 hover:border-orange-500'
          : 'bg-white border-gray-200 hover:border-orange-300'
      }`}
    >
      {/* Header: code + difficulty */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {code}
        </span>
        <DifficultyBadge difficulte={difficulte} isDark={isDark} />
      </div>

      {/* Nom */}
      <h3 className={`text-sm font-semibold leading-snug mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {nom}
      </h3>

      {/* Description (2 lines truncated) */}
      {description && (
        <p className={`text-xs leading-relaxed line-clamp-2 mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {description}
        </p>
      )}

      {/* Price + temps */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-1">
          <Euro size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
          {hasGeoCoeff ? (
            <span className="flex items-baseline gap-1.5">
              <span className={`text-xs line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatPrice(_prixOriginal)}
              </span>
              <span className="text-lg font-bold" style={{ color: couleur }}>
                {formatPrice(prixUnitaireHT)}
              </span>
            </span>
          ) : (
            <span className="text-lg font-bold" style={{ color: couleur }}>
              {formatPrice(prixUnitaireHT)}
            </span>
          )}
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            /{unite}
          </span>
        </div>
        {tempsPoseH != null && (
          <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Clock size={12} />
            {tempsPoseH}h
          </span>
        )}
      </div>

      {/* Decomposition pills + bar */}
      <div className="mb-2">
        <div className="flex items-center gap-2 text-xs">
          {fourniture != null && (
            <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
              F: {formatPrice(fourniture)}
            </span>
          )}
          {mainOeuvre != null && (
            <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
              MO: {formatPrice(mainOeuvre)}
            </span>
          )}
          {materiel != null && (
            <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
              Mat: {formatPrice(materiel)}
            </span>
          )}
        </div>
        <DecompositionBar
          fourniture={fourniture}
          mainOeuvre={mainOeuvre}
          materiel={materiel}
        />
      </div>

      {/* Tags — limited to 3 visible */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${
                isDark
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                isDark
                  ? 'bg-gray-700 text-gray-400 hover:text-gray-200'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title={tags.slice(3).join(', ')}
            >
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default OuvrageCard;
