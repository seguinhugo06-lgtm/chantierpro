import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import {
  LOTS,
  getChildren,
  getNodeById,
  getPath,
  getAllDescendants,
  ALL_OUVRAGES,
  getOuvragesByNode,
  countOuvragesByNode,
  searchOuvrages,
  applyGeoCoefficient,
  STATS,
} from '../lib/data/bibliotheque';
import {
  getCoefficient,
  getRegions,
  getDepartementsByRegion,
} from '../lib/data/bibliotheque/coefficients-geo';

const ITEMS_PER_PAGE = 50;

export default function useBibliotheque() {
  // ── Tree navigation ──────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = [];
    LOTS.forEach((lot) => {
      allIds.push(lot.id);
      const descendants = getAllDescendants(lot.id);
      descendants.forEach((d) => allIds.push(d.id));
    });
    setExpandedNodes(new Set(allIds));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const breadcrumb = useMemo(() => {
    if (!selectedNodeId) return [];
    return getPath(selectedNodeId);
  }, [selectedNodeId]);

  // ── Search ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 200);
  const isSearching = debouncedQuery.length >= 2;

  // ── Pagination ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Geo coefficient ──────────────────────────────────────────────────
  const [selectedDept, setSelectedDept] = useState(null);

  const coefficientGeo = useMemo(() => {
    if (!selectedDept) return 1;
    return getCoefficient(selectedDept);
  }, [selectedDept]);

  const resetCoefficient = useCallback(() => {
    setSelectedDept(null);
  }, []);

  // ── View / Sort ──────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('nom');
  const [sortDir, setSortDir] = useState('asc');

  // ── Filters ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    priceRange: [null, null],
    difficulty: null,
    unite: null,
  });

  const resetFilters = useCallback(() => {
    setFilters({
      priceRange: [null, null],
      difficulty: null,
      unite: null,
    });
  }, []);

  // ── Reset page on navigation / search changes ────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedNodeId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ── Build ouvrage list (before pagination) ───────────────────────────
  const filteredAndSorted = useMemo(() => {
    // 1. Get raw list
    let items = [];
    if (isSearching) {
      items = searchOuvrages(debouncedQuery);
    } else if (selectedNodeId) {
      items = getOuvragesByNode(selectedNodeId);
    } else {
      // No selection and no search: show all ouvrages
      items = ALL_OUVRAGES;
    }

    // 2. Apply filters
    const [minPrice, maxPrice] = filters.priceRange;
    if (minPrice !== null && minPrice !== undefined) {
      items = items.filter((o) => o.prixUnitaireHT >= minPrice);
    }
    if (maxPrice !== null && maxPrice !== undefined) {
      items = items.filter((o) => o.prixUnitaireHT <= maxPrice);
    }
    if (filters.difficulty) {
      items = items.filter((o) => o.difficulte === filters.difficulty);
    }
    if (filters.unite) {
      items = items.filter((o) => o.unite === filters.unite);
    }

    // 3. Sort
    items = [...items].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // 4. Apply geo coefficient
    if (selectedDept && coefficientGeo !== 1) {
      items = items.map((o) => applyGeoCoefficient(o, selectedDept));
    }

    return items;
  }, [
    isSearching,
    debouncedQuery,
    selectedNodeId,
    filters,
    sortBy,
    sortDir,
    selectedDept,
    coefficientGeo,
  ]);

  // ── Pagination derived values ────────────────────────────────────────
  const totalOuvrages = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalOuvrages / ITEMS_PER_PAGE));

  const ouvrages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  // ── Return ───────────────────────────────────────────────────────────
  return {
    // Tree
    selectedNodeId,
    setSelectedNodeId,
    expandedNodes,
    toggleNode,
    expandAll,
    collapseAll,
    breadcrumb,

    // Ouvrages list
    ouvrages,
    totalOuvrages,

    // Search
    searchQuery,
    setSearchQuery,
    isSearching,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,

    // Geo coefficient
    selectedDept,
    setSelectedDept,
    coefficientGeo,
    resetCoefficient,

    // View
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,

    // Filters
    filters,
    setFilters,
    resetFilters,

    // Stats
    stats: STATS,
  };
}
