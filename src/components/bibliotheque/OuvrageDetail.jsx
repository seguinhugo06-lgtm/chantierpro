import React from 'react';
import { X, Clock, Euro, Tag, FileText, Percent, ArrowRight, Star, ShoppingCart } from 'lucide-react';
import PriceDecomposition from './PriceDecomposition';

// =============================================================================
// Helpers
// =============================================================================

const formatPrice = (amount) => {
  if (amount == null) return '\u2014';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const DIFFICULTE_STYLES = {
  simple: {
    light: 'bg-green-100 text-green-700',
    dark: 'bg-green-900/30 text-green-400',
    label: 'Simple',
  },
  standard: {
    light: 'bg-blue-100 text-blue-700',
    dark: 'bg-blue-900/30 text-blue-400',
    label: 'Standard',
  },
  complexe: {
    light: 'bg-red-100 text-red-700',
    dark: 'bg-red-900/30 text-red-400',
    label: 'Complexe',
  },
};

// =============================================================================
// DifficultyBadge
// =============================================================================

function DifficultyBadge({ difficulte, isDark }) {
  const config = DIFFICULTE_STYLES[difficulte];
  if (!config) return null;

  const classes = isDark ? config.dark : config.light;

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${classes}`}>
      {config.label}
    </span>
  );
}

// =============================================================================
// PriceRangeBar
// =============================================================================

function PriceRangeBar({ prixMin, prixMax, prixUnitaireHT, isDark, couleur }) {
  if (prixMin == null || prixMax == null) return null;

  const range = prixMax - prixMin;
  const position = range > 0 ? ((prixUnitaireHT - prixMin) / range) * 100 : 50;
  const clampedPosition = Math.max(0, Math.min(100, position));

  const trackBg = isDark ? 'bg-gray-600' : 'bg-gray-200';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium ${textSecondary}`}>
          {formatPrice(prixMin)}
        </span>
        <span className={`text-xs font-medium ${textSecondary}`}>
          {formatPrice(prixMax)}
        </span>
      </div>
      <div className={`relative w-full h-2 rounded-full ${trackBg}`}>
        {/* Filled portion up to the indicator */}
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{
            width: `${clampedPosition}%`,
            backgroundColor: couleur,
          }}
        />
        {/* Position indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${clampedPosition}%`,
            transform: `translate(-50%, -50%)`,
            backgroundColor: couleur,
          }}
        />
      </div>
      <p className={`text-xs mt-1.5 text-center ${textSecondary}`}>
        Fourchette de prix constat\u00e9e
      </p>
    </div>
  );
}

// =============================================================================
// OuvrageDetail — Full-screen detail modal
// =============================================================================

export default function OuvrageDetail({
  ouvrage,
  isOpen,
  onClose,
  isDark,
  couleur = '#f97316',
  coefficientGeo,
  selectedDept,
  breadcrumb,
  onAddToDevis,
}) {
  if (!isOpen || !ouvrage) return null;

  // ── Theme classes ───────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const sectionBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';

  // ── Ouvrage data ────────────────────────────────────────────────────────────
  const {
    code,
    nom,
    description,
    unite,
    prixUnitaireHT,
    prixMin,
    prixMax,
    fourniture,
    mainOeuvre,
    materiel,
    tempsPoseH,
    tva,
    tags,
    difficulte,
    _coeffGeo,
    _prixOriginal,
  } = ouvrage;

  const hasGeoCoeff =
    coefficientGeo != null &&
    coefficientGeo !== 1 &&
    selectedDept &&
    _prixOriginal != null;

  // ── Keyboard handling ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // ── Breadcrumb rendering ────────────────────────────────────────────────────
  const renderBreadcrumb = () => {
    if (!breadcrumb || breadcrumb.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap text-xs mb-3">
        {breadcrumb.map((item, idx) => (
          <React.Fragment key={item.id || idx}>
            {idx > 0 && (
              <ArrowRight className={`w-3 h-3 flex-shrink-0 ${textSecondary}`} />
            )}
            <span
              className={`px-2 py-0.5 rounded-md font-medium ${
                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {item.nom}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={nom}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${bg}`}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-10 px-6 pt-5 pb-4 border-b"
          style={{
            borderColor: isDark ? '#374151' : '#e5e7eb',
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
              isDark
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          {renderBreadcrumb()}

          {/* Code */}
          {code && (
            <span
              className={`inline-block text-xs font-mono px-2 py-0.5 rounded-md mb-2 ${
                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {code}
            </span>
          )}

          {/* Name + Difficulty */}
          <div className="flex items-start gap-3 pr-10">
            <h2 className={`text-xl font-bold leading-tight ${textPrimary}`}>
              {nom}
            </h2>
            <div className="flex-shrink-0 mt-0.5">
              <DifficultyBadge difficulte={difficulte} isDark={isDark} />
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-6">
          {/* ── Price Section ─────────────────────────────────────────────── */}
          <div className={`rounded-xl p-5 border ${borderColor} ${sectionBg}`}>
            <div className="flex items-center gap-2 mb-4">
              <Euro className="w-5 h-5" style={{ color: couleur }} />
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${textSecondary}`}>
                Tarification
              </h3>
            </div>

            {/* Main price */}
            <div className="flex items-baseline gap-2 mb-1">
              {hasGeoCoeff ? (
                <>
                  <span className={`text-lg line-through ${textSecondary}`}>
                    {formatPrice(_prixOriginal)}
                  </span>
                  <span className="text-3xl font-bold" style={{ color: couleur }}>
                    {formatPrice(prixUnitaireHT)}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold" style={{ color: couleur }}>
                  {formatPrice(prixUnitaireHT)}
                </span>
              )}
              <span className={`text-base ${textSecondary}`}>
                / {unite || 'U'}
              </span>
            </div>

            {/* Geo coefficient badge */}
            {hasGeoCoeff && (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-white mt-2"
                style={{ backgroundColor: couleur }}
              >
                &times;{coefficientGeo.toFixed(2)} {selectedDept}
              </span>
            )}

            {/* Price range bar */}
            <PriceRangeBar
              prixMin={prixMin}
              prixMax={prixMax}
              prixUnitaireHT={prixUnitaireHT}
              isDark={isDark}
              couleur={couleur}
            />
          </div>

          {/* ── Price Decomposition ───────────────────────────────────────── */}
          {(fourniture != null || mainOeuvre != null || materiel != null) && (
            <PriceDecomposition
              fourniture={fourniture}
              mainOeuvre={mainOeuvre}
              materiel={materiel}
              isDark={isDark}
              couleur={couleur}
            />
          )}

          {/* ── Technical Details ─────────────────────────────────────────── */}
          <div className={`rounded-xl p-5 border ${borderColor} ${sectionBg}`}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" style={{ color: couleur }} />
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${textSecondary}`}>
                D\u00e9tails techniques
              </h3>
            </div>

            {/* Description */}
            {description && (
              <div className="mb-4">
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {description}
                </p>
              </div>
            )}

            {/* Detail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Temps de pose */}
              <div
                className={`rounded-lg p-3 text-center ${
                  isDark ? 'bg-gray-600/50' : 'bg-white'
                }`}
              >
                <Clock className={`w-4 h-4 mx-auto mb-1.5 ${textSecondary}`} />
                <p className={`text-xs font-medium mb-0.5 ${textSecondary}`}>
                  Temps de pose
                </p>
                <p className={`text-sm font-semibold ${textPrimary}`}>
                  {tempsPoseH != null ? `${tempsPoseH} h / ${unite || 'U'}` : '\u2014'}
                </p>
              </div>

              {/* Unite */}
              <div
                className={`rounded-lg p-3 text-center ${
                  isDark ? 'bg-gray-600/50' : 'bg-white'
                }`}
              >
                <Star className={`w-4 h-4 mx-auto mb-1.5 ${textSecondary}`} />
                <p className={`text-xs font-medium mb-0.5 ${textSecondary}`}>
                  Unit\u00e9
                </p>
                <p className={`text-sm font-semibold ${textPrimary}`}>
                  {unite || '\u2014'}
                </p>
              </div>

              {/* TVA */}
              <div
                className={`rounded-lg p-3 text-center ${
                  isDark ? 'bg-gray-600/50' : 'bg-white'
                }`}
              >
                <Percent className={`w-4 h-4 mx-auto mb-1.5 ${textSecondary}`} />
                <p className={`text-xs font-medium mb-0.5 ${textSecondary}`}>
                  TVA
                </p>
                <p className={`text-sm font-semibold ${textPrimary}`}>
                  {tva != null ? `${tva}\u202f%` : '\u2014'}
                </p>
              </div>

              {/* Difficulte */}
              <div
                className={`rounded-lg p-3 text-center ${
                  isDark ? 'bg-gray-600/50' : 'bg-white'
                }`}
              >
                <Star className={`w-4 h-4 mx-auto mb-1.5 ${textSecondary}`} />
                <p className={`text-xs font-medium mb-0.5 ${textSecondary}`}>
                  Difficult\u00e9
                </p>
                <div className="mt-1 flex justify-center">
                  <DifficultyBadge difficulte={difficulte} isDark={isDark} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Tags ──────────────────────────────────────────────────────── */}
          {tags && tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4" style={{ color: couleur }} />
                <h3 className={`text-sm font-semibold uppercase tracking-wide ${textSecondary}`}>
                  Tags
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Action Buttons ──────────────────────────────────────────────── */}
        <div
          className={`sticky bottom-0 px-6 py-4 border-t flex items-center gap-3 ${borderColor}`}
          style={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
          }}
        >
          <button
            onClick={onClose}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Fermer
          </button>
          {onAddToDevis && (
            <button
              onClick={() => onAddToDevis(ouvrage)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: couleur }}
            >
              <ShoppingCart className="w-4 h-4" />
              Ajouter au devis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
