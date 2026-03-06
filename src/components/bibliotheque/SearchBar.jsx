import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, ArrowRight, ChevronRight, Package } from 'lucide-react';
import { searchOuvrages, getNodeById, getPath } from '../../lib/data/bibliotheque';

// =============================================================================
// formatPrice — formatte un montant en EUR (locale FR)
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

// =============================================================================
// highlightMatch — met en gras les fragments qui correspondent a la query
// =============================================================================

function highlightMatch(text, query) {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-transparent font-semibold" style={{ color: 'inherit' }}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// =============================================================================
// SearchBar — barre de recherche avec autocomplete dropdown
// =============================================================================

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  onSelectOuvrage,
  onSelectNode,
  isDark = false,
  couleur = '#f97316',
}) {
  // ── Local state ───────────────────────────────────────────────────────────
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const inputBg = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const dropdownBg = isDark
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';
  const itemHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const highlightBg = isDark ? 'bg-gray-700' : 'bg-gray-100';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';

  // ── Autocomplete results ──────────────────────────────────────────────────
  const autocompleteResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    return searchOuvrages(searchQuery, 8);
  }, [searchQuery]);

  // ── Determine whether to show the dropdown ────────────────────────────────
  const shouldShowDropdown =
    isFocused && searchQuery.trim().length >= 2 && autocompleteResults.length > 0;

  useEffect(() => {
    setShowDropdown(shouldShowDropdown);
  }, [shouldShowDropdown]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [autocompleteResults]);

  // ── Scroll highlighted item into view ─────────────────────────────────────
  useEffect(() => {
    if (highlightedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll('[data-autocomplete-item]');
    if (items[highlightedIndex]) {
      items[highlightedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // ── Click-outside handler ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── handleSelectResult ────────────────────────────────────────────────────
  const handleSelectResult = useCallback(
    (ouvrage) => {
      setShowDropdown(false);
      setIsFocused(false);
      inputRef.current?.blur();
      onSelectOuvrage?.(ouvrage);
    },
    [onSelectOuvrage],
  );

  // ── handleNavigateToCategory ──────────────────────────────────────────────
  const handleNavigateToCategory = useCallback(
    (nodeId) => {
      setShowDropdown(false);
      setIsFocused(false);
      inputRef.current?.blur();
      onSelectNode?.(nodeId);
    },
    [onSelectNode],
  );

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (!showDropdown || autocompleteResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, autocompleteResults.length - 1),
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelectResult(autocompleteResults[highlightedIndex]);
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    },
    [showDropdown, autocompleteResults, highlightedIndex, handleSelectResult],
  );

  // ── Build category path for an ouvrage ────────────────────────────────────
  const getCategoryPath = useCallback((chapitreId) => {
    if (!chapitreId) return null;
    const path = getPath(chapitreId);
    if (!path || path.length === 0) return null;
    return path;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Search input ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: isFocused ? couleur : undefined }}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un ouvrage..."
          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${inputBg}`}
          style={{
            '--tw-ring-color': couleur,
            borderColor: isFocused ? couleur : undefined,
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
              isDark
                ? 'hover:bg-gray-600 text-gray-400'
                : 'hover:bg-gray-200 text-gray-400'
            }`}
            aria-label="Effacer la recherche"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Autocomplete dropdown ─────────────────────────────────────────── */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 left-0 right-0 mt-1.5 rounded-xl border shadow-lg overflow-hidden ${dropdownBg}`}
          style={{ maxHeight: '420px' }}
          role="listbox"
        >
          <div className="overflow-y-auto" style={{ maxHeight: '370px' }}>
            {autocompleteResults.map((ouvrage, index) => {
              const isHighlighted = index === highlightedIndex;
              const categoryPath = getCategoryPath(ouvrage.chapitreId);

              return (
                <button
                  key={ouvrage.id}
                  data-autocomplete-item
                  onClick={() => handleSelectResult(ouvrage)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors cursor-pointer border-b last:border-b-0 ${
                    isDark ? 'border-gray-700/50' : 'border-gray-100'
                  } ${isHighlighted ? highlightBg : itemHover}`}
                  role="option"
                  aria-selected={isHighlighted}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : `${couleur}10`,
                    }}
                  >
                    <Package
                      className="w-4 h-4"
                      style={{ color: couleur }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Ouvrage name */}
                    <div
                      className={`text-sm font-medium truncate ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}
                    >
                      {highlightMatch(ouvrage.nom, searchQuery)}
                    </div>

                    {/* Code + category path */}
                    <div className={`flex items-center gap-1.5 mt-0.5 ${textSecondary}`}>
                      <span className="text-xs font-mono opacity-75">
                        {ouvrage.code}
                      </span>
                      {categoryPath && categoryPath.length > 0 && (
                        <>
                          <span className={`text-xs ${textMuted}`}>&middot;</span>
                          <div className="flex items-center gap-0.5 text-xs truncate min-w-0">
                            {categoryPath.map((node, idx) => (
                              <React.Fragment key={node.id}>
                                {idx > 0 && (
                                  <ChevronRight
                                    className={`w-3 h-3 flex-shrink-0 ${textMuted}`}
                                  />
                                )}
                                <span
                                  className="truncate cursor-pointer hover:underline"
                                  title={node.nom}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigateToCategory(node.id);
                                  }}
                                >
                                  {node.nom}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 text-right ml-2">
                    <div
                      className="text-sm font-semibold whitespace-nowrap"
                      style={{ color: couleur }}
                    >
                      {formatPrice(ouvrage.prixUnitaireHT)}
                    </div>
                    <div className={`text-xs ${textMuted}`}>
                      {ouvrage.unite ? `/ ${ouvrage.unite}` : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Footer: "Voir tous les resultats" ─────────────────────────── */}
          <div
            className={`border-t px-3.5 py-2.5 ${
              isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-100 bg-gray-50/80'
            }`}
          >
            <button
              onClick={() => {
                setShowDropdown(false);
                inputRef.current?.blur();
              }}
              className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-1 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{ color: couleur }}
            >
              <Search className="w-3.5 h-3.5" />
              Voir tous les r&eacute;sultats
              <span
                className="text-xs font-normal px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : `${couleur}15`,
                  color: couleur,
                }}
              >
                {autocompleteResults.length}+
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
