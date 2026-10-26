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
import { devisAvecLigneAjoutee } from '../../lib/ajoutLigneDevis';
import { FenetreAjoutDevis } from '../catalogue/FenetresCatalogue';

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

export default function Bibliotheque({ setPage, devis, addDevis, updateDevis, clients, showToast }) {
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

  // ── Add to devis state ────────────────────────────────────────────────────
  const [addToDevisModal, setAddToDevisModal] = useState(null);
  const [addToDevisQty, setAddToDevisQty] = useState(1);
  const [addToDevisSelected, setAddToDevisSelected] = useState(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeDept = useMemo(() => getDeptByCode(selectedDept), [selectedDept]);
  const hasActiveCoeff = coefficientGeo != null && coefficientGeo !== 1;

  const regions = useMemo(() => getRegions(), []);

  // ── Add to devis logic ────────────────────────────────────────────────────
  const devisBrouillons = useMemo(() => {
    return (devis || []).filter(d => (d.statut || d.status || '').toLowerCase() === 'brouillon');
  }, [devis]);

  const openAddToDevisModal = useCallback((ouvrage) => {
    setAddToDevisModal(ouvrage);
    setAddToDevisQty(1);
    setAddToDevisSelected(devisBrouillons.length > 0 ? devisBrouillons[0].id : null);
  }, [devisBrouillons]);

  const closeAddToDevisModal = useCallback(() => {
    setAddToDevisModal(null);
    setAddToDevisQty(1);
    setAddToDevisSelected(null);
  }, []);

  const handleAddToDevis = useCallback(async () => {
    if (!addToDevisSelected || !addToDevisModal) return;
    const targetDevis = devis.find(d => d.id === addToDevisSelected);
    if (!targetDevis) {
      if (showToast) showToast('Devis introuvable', 'error');
      return;
    }

    if ((targetDevis.statut || '') !== 'brouillon') {
      if (showToast) showToast('Seul un devis en brouillon peut recevoir un ouvrage', 'error');
      return;
    }
    // Même calcul que le Catalogue et l'éditeur (src/lib/ajoutLigneDevis.js)
    const champs = devisAvecLigneAjoutee(targetDevis, addToDevisModal, { quantite: addToDevisQty, tauxDefaut: Number(targetDevis.tvaRate ?? 10) });
    if (!updateDevis || !(await updateDevis(targetDevis.id, champs))) return;

    const numero = targetDevis.numero || targetDevis.reference || targetDevis.id?.slice(0, 8);
    if (showToast) showToast(`Ouvrage ajouté au devis ${numero}`, 'success');
    closeAddToDevisModal();
  }, [addToDevisSelected, addToDevisModal, addToDevisQty, devis, updateDevis, showToast, closeAddToDevisModal]);

  // ── Theme helpers ───────────────────────────────────────────────────────────
  const pageBg = 'bg-fond text-encre';
  const sidebarBg = 'bg-surface border-bord';
  const cardBg = 'bg-surface border-bord';
  const inputBg = 'bg-surface border-bord-fort text-encre placeholder:text-encre-3';
  const textSecondary = 'text-encre-3';
  const textMuted = 'text-encre-3';
  const btnBase = 'bg-surface border-bord-fort text-encre-2 hover:bg-surface-2';
  const btnActive = 'bg-encre text-surface';

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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-encre-3 pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Rechercher un ouvrage..."
        aria-label="Rechercher un ouvrage"
        className={`w-full pl-9 pr-8 h-11 rounded-xl border text-base sm:text-sm transition-shadow focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 ${inputBg}`}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-surface-2 text-encre-3"
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
      <MapPin className={`w-4 h-4 flex-shrink-0 ${hasActiveCoeff ? 'text-accent-texte' : 'text-encre-3'}`} aria-hidden="true" />
      <select
        value={selectedDept || ''}
        onChange={handleDeptChange}
        aria-label="Département (coefficient géographique)"
        className={`text-sm rounded-lg border h-10 pl-2 pr-7 appearance-none cursor-pointer transition-colors ${hasActiveCoeff ? 'bg-surface text-encre border-accent' : inputBg}`}
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
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-sur-accent"
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
          selectedNodeId == null ? 'font-semibold text-accent-texte' : textSecondary
        }`}
      >
        Tous
      </button>
      {breadcrumb &&
        breadcrumb.map((node, idx) => (
          <React.Fragment key={node.id}>
            <span className={textMuted}>/</span>
            <button
              onClick={() => handleBreadcrumbClick(node.id)}
              className={`shrink-0 hover:underline truncate max-w-[120px] sm:max-w-[200px] transition-colors ${
                idx === breadcrumb.length - 1 ? 'font-semibold text-accent-texte' : textSecondary
              }`}
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
    <div className={`inline-flex rounded-lg border overflow-hidden border-bord-fort`}>
      <button
        onClick={() => setViewMode('grid')}
        className={`w-10 h-10 flex items-center justify-center transition-colors ${
          viewMode === 'grid' ? btnActive : 'text-encre-3 hover:text-encre-2'
        }`}
        aria-pressed={viewMode === 'grid'}
        aria-label="Vue grille"
        title="Vue grille"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`w-10 h-10 flex items-center justify-center transition-colors ${
          viewMode === 'list' ? btnActive : 'text-encre-3 hover:text-encre-2'
        }`}
        aria-pressed={viewMode === 'list'}
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
        <div className={`flex items-center justify-between px-4 py-3 border-b border-bord`}>
          <div className="flex items-center gap-2">
            <TreePine className="w-5 h-5 text-accent-texte" />
            <span className="font-semibold text-sm">Nomenclature</span>
          </div>
          <button
            onClick={() => setShowTreeDrawer(false)}
            className={`p-1.5 rounded-lg transition-colors hover:bg-surface-2`}
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
          />
        </div>
      </div>
    </div>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Library className={`w-12 h-12 mb-4 ${textMuted}`} />
      <h3 className={`text-lg font-semibold mb-2 text-encre-2`}>
        Aucun ouvrage trouv&eacute;
      </h3>
      <p className={`text-sm max-w-md ${textSecondary}`}>
        {isSearching
          ? `Aucun résultat pour «\u202f${searchQuery}\u202f». Essayez un autre terme de recherche.`
          : (filters.priceRange[0] != null || filters.priceRange[1] != null || filters.difficulty || filters.unite)
            ? 'Aucun ouvrage ne correspond aux filtres actifs. Essayez de modifier ou réinitialiser les filtres.'
            : "Sélectionnez un lot ou un chapitre dans l'arbre de nomenclature pour afficher les ouvrages."}
      </p>
      {(isSearching || filters.priceRange[0] != null || filters.priceRange[1] != null || filters.difficulty || filters.unite) && (
        <button
          onClick={() => { setSearchQuery(''); resetFilters(); }}
          className="mt-4 text-sm font-medium px-4 py-2 rounded-lg transition-colors bg-accent text-sur-accent"
        >
          {isSearching ? 'Effacer la recherche' : 'Réinitialiser les filtres'}
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
          <h2 className="text-lg font-semibold text-encre">
            Biblioth&egrave;que de prix
          </h2>
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
            />
          </div>

          {/* Dept shortcut (mobile) */}
          <button
            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
            aria-label="Département (coefficient géographique)"
            className={`flex items-center gap-1 px-3 h-11 rounded-lg border text-sm transition-colors ${hasActiveCoeff ? 'bg-surface border-accent text-accent-texte' : btnBase}`}
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
          className={`hidden lg:flex flex-col w-72 flex-shrink-0 border-r rounded-xl overflow-hidden sticky top-4 self-start ${sidebarBg}`}
          style={{ maxHeight: 'calc(100vh - 140px)' }}
        >
          {/* Sidebar search (with autocomplete) */}
          <div className="px-3 py-3 border-b border-bord flex-shrink-0">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectOuvrage={handleSelectOuvrage}
              onSelectNode={setSelectedNodeId}
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
            <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 bg-surface-2 text-encre-2">
              {totalOuvrages.toLocaleString('fr-FR')} r&eacute;sultat{totalOuvrages !== 1 ? 's' : ''}
            </span>

            {/* Separator */}
            <div className="hidden sm:block w-px h-6 bg-bord" />

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
            />
          </div>

          {/* Searching indicator */}
          {isSearching && (
            <div className={`flex items-center gap-2 mb-3 text-sm ${textSecondary}`}>
              <Search className="w-4 h-4 animate-pulse text-accent-texte" />
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

      {/* ── Ajouter au devis : la même fenêtre que le Catalogue ──────────── */}
      <FenetreAjoutDevis
        article={addToDevisModal ? { ...addToDevisModal, prix: addToDevisModal.prixUnitaireHT || 0 } : null}
        brouillons={devisBrouillons} clients={clients || []} quantite={addToDevisQty} setQuantite={setAddToDevisQty}
        devisChoisi={addToDevisSelected} setDevisChoisi={setAddToDevisSelected} onFermer={closeAddToDevisModal} onAjouter={handleAddToDevis}
        onCreerDevis={() => { closeAddToDevisModal(); if (setPage) setPage('devis'); }}
      />

      {/* ── Ouvrage detail modal ────────────────────────────────────────── */}
      <OuvrageDetail
        ouvrage={selectedOuvrage}
        isOpen={!!selectedOuvrage}
        onClose={handleCloseDetail}
        coefficientGeo={coefficientGeo}
        selectedDept={selectedDept}
        breadcrumb={ouvrageBreadcrumb}
        onAddToDevis={(updateDevis || addDevis) ? (ouvrage) => {
          handleCloseDetail();
          openAddToDevisModal(ouvrage);
        } : undefined}
      />
    </div>
  );
}
