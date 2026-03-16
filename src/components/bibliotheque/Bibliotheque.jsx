import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  TreePine,
  MapPin,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  Library,
  ChevronDown,
} from 'lucide-react';
import useBibliotheque from '../../hooks/useBibliotheque';
import ArbreNomenclature from './ArbreNomenclature';
import OuvragesList from './OuvragesList';
import OuvrageDetail from './OuvrageDetail';
import SearchBar from './SearchBar';
import FiltresPanel from './FiltresPanel';
import {
  countOuvragesByNode,
  getRegions,
  getDepartementsByRegion,
  getPath,
  STATS,
  DEPARTEMENTS,
} from '../../lib/data/bibliotheque';

// =============================================================================
// Sort options
// =============================================================================

const SORT_OPTIONS = [
  { value: 'nom', label: 'Nom A→Z' },
  { value: 'prix_asc', label: 'Prix ↑' },
  { value: 'prix_desc', label: 'Prix ↓' },
  { value: 'code', label: 'Code' },
];

// =============================================================================
// Helper to find a department entry by its code
// =============================================================================

function getDeptByCode(code) {
  if (!code) return null;
  return DEPARTEMENTS.find((d) => d.code === code) || null;
}

// =============================================================================
// Bibliotheque — Main page component
// =============================================================================

export default function Bibliotheque({ isDark, couleur = '#f97316', setPage, devis, addDevis }) {
  // ── Hook state ──────────────────────────────────────────────────────────────
  const {
    selectedNodeId,
    setSelectedNodeId,
    expandedNodes,
    toggleNode,
    breadcrumb,
    ouvrages,
    totalOuvrages,
    searchQuery,
    setSearchQuery,
    isSearching,
    currentPage,
    setCurrentPage,
    totalPages,
    selectedDept,
    setSelectedDept,
    coefficientGeo,
    resetCoefficient,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    filters,
    setFilters,
    resetFilters,
    stats,
  } = useBibliotheque();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [showTreeDrawer, setShowTreeDrawer] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [selectedOuvrage, setSelectedOuvrage] = useState(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeDept = useMemo(() => getDeptByCode(selectedDept), [selectedDept]);
  const hasActiveCoeff = coefficientGeo != null && coefficientGeo !== 1;

  const regions = useMemo(() => getRegions(), []);

  // ── Theme helpers ───────────────────────────────────────────────────────────
  const pageBg = isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const sidebarBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const toolbarBg = isDark ? 'bg-gray-800/50' : 'bg-white/80';
  const btnBase = isDark
    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50';
  const btnActive = `border-transparent text-white`;

  // ── Ouvrage detail modal handlers ───────────────────────────────────────────
  const handleSelectOuvrage = useCallback((ouvrage) => {
    setSelectedOuvrage(ouvrage);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedOuvrage(null);
  }, []);

  const ouvrageBreadcrumb = useMemo(() => {
    if (!selectedOuvrage) return [];
    return getPath(selectedOuvrage.chapitreId) || [];
  }, [selectedOuvrage]);

  // ── Callbacks ───────────────────────────────────────────────────────────────
  const handleBreadcrumbClick = useCallback(
    (nodeId) => {
      setSelectedNodeId(nodeId);
    },
    [setSelectedNodeId],
  );

  const handleDeptChange = useCallback(
    (e) => {
      setSelectedDept(e.target.value || null);
    },
    [setSelectedDept],
  );

  const handleSortChange = useCallback(
    (e) => {
      const val = e.target.value;
      if (val === 'prix_asc') {
        setSortBy('prix');
        setSortDir('asc');
      } else if (val === 'prix_desc') {
        setSortBy('prix');
        setSortDir('desc');
      } else {
        setSortBy(val);
        setSortDir('asc');
      }
    },
    [setSortBy, setSortDir],
  );

  const currentSortValue = useMemo(() => {
    if (sortBy === 'prix') return sortDir === 'asc' ? 'prix_asc' : 'prix_desc';
    return sortBy;
  }, [sortBy, sortDir]);

  // ── Search input (simple version for sidebar/drawer) ────────────────────────
  const SearchInputSimple = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Rechercher un ouvrage..."
        className={`w-full pl-9 pr-8 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${inputBg}`}
        style={{ focusRingColor: couleur }}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors ${
            isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-400'
          }`}
          aria-label="Effacer la recherche"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // ── Dept selector (select element) ──────────────────────────────────────────
  const DeptSelector = (
    <div className="relative flex items-center gap-2">
      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: hasActiveCoeff ? couleur : undefined }} />
      <select
        value={selectedDept || ''}
        onChange={handleDeptChange}
        className={`text-sm rounded-lg border py-1.5 pl-2 pr-7 appearance-none cursor-pointer transition-colors ${inputBg}`}
        style={hasActiveCoeff ? { borderColor: couleur } : undefined}
      >
        <option value="">France (&times;1.00)</option>
        {regions.map((region) => (
          <optgroup key={region} label={region}>
            {getDepartementsByRegion(region).map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {d.nom} (&times;{d.coefficient.toFixed(2)})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {hasActiveCoeff && activeDept && (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: couleur }}
        >
          &times;{coefficientGeo.toFixed(2)}
          <button
            onClick={resetCoefficient}
            className="ml-0.5 hover:opacity-80"
            aria-label="Retirer le coefficient"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const BreadcrumbBar = (
    <div className="flex items-center gap-1 text-sm overflow-x-auto flex-shrink-0 min-w-0">
      <button
        onClick={() => handleBreadcrumbClick(null)}
        className={`shrink-0 hover:underline transition-colors ${
          selectedNodeId == null ? 'font-semibold' : textSecondary
        }`}
        style={selectedNodeId == null ? { color: couleur } : undefined}
      >
        Tous
      </button>
      {breadcrumb &&
        breadcrumb.map((node, idx) => (
          <React.Fragment key={node.id}>
            <span className={textMuted}>/</span>
            <button
              onClick={() => handleBreadcrumbClick(node.id)}
              className={`shrink-0 hover:underline truncate max-w-[160px] transition-colors ${
                idx === breadcrumb.length - 1 ? 'font-semibold' : textSecondary
              }`}
              style={idx === breadcrumb.length - 1 ? { color: couleur } : undefined}
              title={node.nom}
            >
              {node.nom}
            </button>
          </React.Fragment>
        ))}
    </div>
  );

  // ── View toggle ─────────────────────────────────────────────────────────────
  const ViewToggle = (
    <div className={`inline-flex rounded-lg border overflow-hidden ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
      <button
        onClick={() => setViewMode('grid')}
        className={`p-1.5 transition-colors ${
          viewMode === 'grid' ? btnActive : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
        style={viewMode === 'grid' ? { backgroundColor: couleur } : undefined}
        aria-label="Vue grille"
        title="Vue grille"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-1.5 transition-colors ${
          viewMode === 'list' ? btnActive : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
        style={viewMode === 'list' ? { backgroundColor: couleur } : undefined}
        aria-label="Vue liste"
        title="Vue liste"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );

  // ── Sort dropdown ───────────────────────────────────────────────────────────
  const SortDropdown = (
    <div className="relative flex items-center gap-1.5">
      <SlidersHorizontal className={`w-3.5 h-3.5 ${textSecondary}`} />
      <select
        value={currentSortValue}
        onChange={handleSortChange}
        className={`text-sm rounded-lg border py-1.5 pl-2 pr-7 appearance-none cursor-pointer transition-colors ${inputBg}`}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  // ── Mobile tree drawer ──────────────────────────────────────────────────────
  const TreeDrawer = showTreeDrawer && (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowTreeDrawer(false)}
      />
      {/* Panel */}
      <div
        className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-xl flex flex-col transition-transform duration-300 ${sidebarBg}`}
      >
        {/* Drawer header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <TreePine className="w-5 h-5" style={{ color: couleur }} />
            <span className="font-semibold text-sm">Nomenclature</span>
          </div>
          <button
            onClick={() => setShowTreeDrawer(false)}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer search */}
        <div className="px-3 py-3">
          {SearchInputSimple}
        </div>

        {/* Drawer tree */}
        <div className="flex-1 overflow-y-auto px-1">
          <ArbreNomenclature
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              setShowTreeDrawer(false);
            }}
            expandedNodes={expandedNodes}
            onToggleNode={toggleNode}
            countByNode={countOuvragesByNode}
            isDark={isDark}
            couleur={couleur}
          />
        </div>
      </div>
    </div>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Library className={`w-12 h-12 mb-4 ${textMuted}`} />
      <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
        Aucun ouvrage trouv&eacute;
      </h3>
      <p className={`text-sm max-w-md ${textSecondary}`}>
        {isSearching
          ? `Aucun résultat pour «\u202f${searchQuery}\u202f». Essayez un autre terme de recherche.`
          : "Sélectionnez un lot ou un chapitre dans l'arbre de nomenclature pour afficher les ouvrages."}
      </p>
      {isSearching && (
        <button
          onClick={() => setSearchQuery('')}
          className="mt-4 text-sm font-medium px-4 py-2 rounded-lg transition-colors text-white"
          style={{ backgroundColor: couleur }}
        >
          Effacer la recherche
        </button>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className={`min-h-screen ${pageBg}`}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <Library className="w-6 h-6 flex-shrink-0" style={{ color: couleur }} />
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Biblioth&egrave;que de Prix
          </h1>
          <span className={`text-sm ${textSecondary}`}>
            {(stats?.totalOuvrages ?? STATS.totalOuvrages).toLocaleString('fr-FR')} ouvrages
            {' \u2022 '}
            {stats?.totalLots ?? STATS.totalLots} lots
          </span>
        </div>

        {/* ── Mobile controls row ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 lg:hidden mb-3">
          {/* Tree drawer button */}
          <button
            onClick={() => setShowTreeDrawer(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${btnBase}`}
          >
            <TreePine className="w-4 h-4" />
            <span className="hidden sm:inline">Nomenclature</span>
          </button>

          {/* Search with autocomplete (mobile) */}
          <div className="flex-1 min-w-0">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectOuvrage={handleSelectOuvrage}
              onSelectNode={setSelectedNodeId}
              isDark={isDark}
              couleur={couleur}
            />
          </div>

          {/* Dept shortcut (mobile) */}
          <button
            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm transition-colors ${btnBase}`}
            style={hasActiveCoeff ? { borderColor: couleur, color: couleur } : undefined}
          >
            <MapPin className="w-4 h-4" />
            {hasActiveCoeff && <span className="text-xs font-semibold">&times;{coefficientGeo.toFixed(2)}</span>}
          </button>
        </div>

        {/* Mobile dept dropdown (conditionally shown) */}
        {showDeptDropdown && (
          <div className="lg:hidden mb-3">
            {DeptSelector}
          </div>
        )}
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 px-4 sm:px-6 gap-0 lg:gap-6">
        {/* ── Sidebar (desktop only) ──────────────────────────────────── */}
        <aside
          className={`hidden lg:flex flex-col w-72 flex-shrink-0 border-r rounded-xl overflow-hidden ${sidebarBg}`}
          style={{ maxHeight: 'calc(100vh - 140px)' }}
        >
          {/* Sidebar search (with autocomplete) */}
          <div className="px-3 py-3 border-b flex-shrink-0"
            style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}
          >
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectOuvrage={handleSelectOuvrage}
              onSelectNode={setSelectedNodeId}
              isDark={isDark}
              couleur={couleur}
            />
          </div>

          {/* Sidebar tree */}
          <div className="flex-1 overflow-y-auto py-1">
            <ArbreNomenclature
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              expandedNodes={expandedNodes}
              onToggleNode={toggleNode}
              countByNode={countOuvragesByNode}
              isDark={isDark}
              couleur={couleur}
            />
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 pb-8">
          {/* Toolbar */}
          <div
            className={`flex items-center gap-2 flex-wrap mb-4 px-3 py-2.5 rounded-xl border ${cardBg}`}
          >
            {/* Breadcrumb */}
            <div className="flex-1 min-w-0">
              {BreadcrumbBar}
            </div>

            {/* Count badge */}
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#d1d5db' : '#6b7280',
              }}
            >
              {totalOuvrages.toLocaleString('fr-FR')} r&eacute;sultat{totalOuvrages !== 1 ? 's' : ''}
            </span>

            {/* Separator */}
            <div className={`hidden sm:block w-px h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

            {/* Sort */}
            <div className="hidden sm:flex">
              {SortDropdown}
            </div>

            {/* View toggle */}
            {ViewToggle}

            {/* Dept selector (desktop) */}
            <div className="hidden lg:flex">
              {DeptSelector}
            </div>
          </div>

          {/* Mobile sort row */}
          <div className="flex items-center gap-2 mb-3 sm:hidden">
            {SortDropdown}
          </div>

          {/* Filters panel */}
          <div className="mb-4">
            <FiltresPanel
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              isDark={isDark}
              couleur={couleur}
            />
          </div>

          {/* Searching indicator */}
          {isSearching && (
            <div className={`flex items-center gap-2 mb-3 text-sm ${textSecondary}`}>
              <Search className="w-4 h-4 animate-pulse" style={{ color: couleur }} />
              <span>
                Recherche de &laquo;&nbsp;{searchQuery}&nbsp;&raquo;...
              </span>
            </div>
          )}

          {/* Ouvrages list / grid */}
          {ouvrages && ouvrages.length > 0 ? (
            <OuvragesList
              ouvrages={ouvrages}
              viewMode={viewMode}
              isDark={isDark}
              couleur={couleur}
              currentPage={currentPage}
              totalPages={totalPages}
              totalOuvrages={totalOuvrages}
              onPageChange={setCurrentPage}
              onSelectOuvrage={handleSelectOuvrage}
              isSearching={isSearching}
              searchQuery={searchQuery}
            />
          ) : (
            EmptyState
          )}
        </main>
      </div>

      {/* ── Mobile tree drawer overlay ──────────────────────────────────── */}
      {TreeDrawer}

      {/* ── Ouvrage detail modal ────────────────────────────────────────── */}
      <OuvrageDetail
        ouvrage={selectedOuvrage}
        isOpen={!!selectedOuvrage}
        onClose={handleCloseDetail}
        isDark={isDark}
        couleur={couleur}
        coefficientGeo={coefficientGeo}
        selectedDept={selectedDept}
        breadcrumb={ouvrageBreadcrumb}
        onAddToDevis={addDevis ? (ouvrage) => {
          // TODO: Phase 3 — proper AddToDevisModal
          handleCloseDetail();
        } : undefined}
      />
    </div>
  );
}
