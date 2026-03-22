import React, { useMemo } from 'react';
import { Search, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import OuvrageCard from './OuvrageCard';

/**
 * Build an array of page numbers to display with ellipsis.
 * Always shows first, last, and up to 3 pages around current.
 *
 * @param {number} currentPage - 1-based current page
 * @param {number} totalPages
 * @returns {Array<number|string>} e.g. [1, '...', 4, 5, 6, '...', 12]
 */
function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set();

  // Always show first and last
  pages.add(1);
  pages.add(totalPages);

  // Pages around current
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i >= 1 && i <= totalPages) {
      pages.add(i);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }

  return result;
}

/**
 * List header row for list view mode
 */
function ListHeader({ isDark }) {
  const textClass = isDark ? 'text-gray-400' : 'text-gray-500';
  return (
    <div
      className={`flex items-center gap-4 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide ${
        isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
      } ${textClass}`}
    >
      <span className="w-20 shrink-0">Code</span>
      <span className="flex-1 min-w-0">Nom / Unité</span>
      <span className="w-24 text-right shrink-0">Prix HT</span>
      <span className="w-32 shrink-0 hidden md:block">F / MO / Mat</span>
      <span className="w-14 text-center shrink-0 hidden sm:block">Temps</span>
      <span className="w-20 text-center shrink-0 hidden lg:block">Difficulté</span>
    </div>
  );
}

/**
 * Empty state when no ouvrages match
 */
function EmptyState({ isDark, isSearching, searchQuery }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        {isSearching ? (
          <Search size={28} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
        ) : (
          <PackageOpen size={28} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
        )}
      </div>
      <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Aucun ouvrage trouvé
      </p>
      {isSearching && searchQuery && (
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Aucun résultat pour « {searchQuery} »
        </p>
      )}
    </div>
  );
}

/**
 * OuvragesList — Paginated list/grid of ouvrages.
 *
 * @param {Object} props
 * @param {Array} props.ouvrages - Array of ouvrage objects (current page)
 * @param {number} props.totalOuvrages - Total count across all pages
 * @param {'grid'|'list'} props.viewMode - Display mode
 * @param {number} props.currentPage - Current page number (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Callback with new page number
 * @param {Function} props.onSelectOuvrage - Callback when an ouvrage is clicked
 * @param {boolean} props.isDark - Dark mode
 * @param {string} props.couleur - Brand accent color (hex)
 * @param {boolean} props.isSearching - Whether we are showing search results
 * @param {string} props.searchQuery - Current search query text
 */
export default function OuvragesList({
  ouvrages = [],
  totalOuvrages = 0,
  viewMode = 'grid',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSelectOuvrage,
  isDark = false,
  couleur = '#f97316',
  isSearching = false,
  searchQuery = '',
}) {
  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  // ── Empty state ──
  if (!ouvrages || ouvrages.length === 0) {
    return <EmptyState isDark={isDark} isSearching={isSearching} searchQuery={searchQuery} />;
  }

  return (
    <div>
      {/* Header: count */}
      <div className={`flex items-center justify-between mb-4 px-1`}>
        <p className={`text-sm ${textSecondary}`}>
          {isSearching && searchQuery ? (
            <>
              <span className={`font-semibold ${textPrimary}`}>{totalOuvrages}</span>
              {' '}résultat{totalOuvrages > 1 ? 's' : ''} pour{' '}
              <span className={`font-medium ${textPrimary}`}>« {searchQuery} »</span>
            </>
          ) : (
            <>
              <span className={`font-semibold ${textPrimary}`}>{totalOuvrages}</span>
              {' '}ouvrage{totalOuvrages > 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>

      {/* Grid layout */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ouvrages.map((ouvrage) => (
            <OuvrageCard
              key={ouvrage.id}
              ouvrage={ouvrage}
              isDark={isDark}
              couleur={couleur}
              viewMode="grid"
              onSelect={onSelectOuvrage}
            />
          ))}
        </div>
      )}

      {/* List layout */}
      {viewMode === 'list' && (
        <div
          className={`rounded-xl border overflow-hidden ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <ListHeader isDark={isDark} />
          {ouvrages.map((ouvrage) => (
            <OuvrageCard
              key={ouvrage.id}
              ouvrage={ouvrage}
              isDark={isDark}
              couleur={couleur}
              viewMode="list"
              onSelect={onSelectOuvrage}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-1 mt-6"
        >
          {/* Previous */}
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Page précédente"
            className={`px-3 py-1 rounded border text-sm flex items-center gap-1 transition-colors ${
              currentPage <= 1
                ? `opacity-50 cursor-not-allowed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`
                : `cursor-pointer ${
                    isDark
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`
            }`}
          >
            <ChevronLeft size={14} />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((page, idx) =>
            page === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className={`px-2 py-1 text-sm ${textSecondary}`}
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange?.(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Page ${page}`}
                className={`px-3 py-1 rounded border text-sm transition-colors ${
                  page === currentPage
                    ? 'text-white border-transparent font-semibold'
                    : `cursor-pointer ${
                        isDark
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`
                }`}
                style={
                  page === currentPage
                    ? { backgroundColor: couleur }
                    : undefined
                }
              >
                {page}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Page suivante"
            className={`px-3 py-1 rounded border text-sm flex items-center gap-1 transition-colors ${
              currentPage >= totalPages
                ? `opacity-50 cursor-not-allowed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`
                : `cursor-pointer ${
                    isDark
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`
            }`}
          >
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}
