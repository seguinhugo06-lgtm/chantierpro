import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  ArrowLeft,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Package,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import {
  getStockMovements,
  exportMovementsToCSV,
  downloadCSV,
} from '../lib/stockAutoDeduction';

const MOVEMENT_TYPES = [
  { id: 'all', label: 'Tous' },
  { id: 'entree', label: 'Entrées', color: 'emerald' },
  { id: 'sortie', label: 'Sorties', color: 'red' },
  { id: 'ajustement', label: 'Ajustements', color: 'blue' },
  { id: 'inventaire', label: 'Inventaire', color: 'purple' },
];

const ITEMS_PER_PAGE = 25;

/**
 * Stock Movements History Page
 * Full history with filters and export
 *
 * @param {Object} props
 * @param {string} props.userId - Current user ID
 * @param {Array} props.catalogue - Catalogue items for filter
 * @param {Array} props.chantiers - Chantiers for filter
 * @param {Function} props.onBack - Navigate back
 * @param {boolean} props.isDark - Dark mode
 * @param {string} props.couleur - Theme color
 */
export default function StockMovementsHistory({
  userId,
  catalogue = [],
  chantiers = [],
  onBack,
  isDark = false,
  couleur = '#f97316',
}) {
  // State
  const [movements, setMovements] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterType, setFilterType] = useState('all');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterChantier, setFilterChantier] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  // Fetch movements
  const fetchMovements = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const filters = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      };

      if (filterType !== 'all') {
        filters.type = filterType;
      }
      if (filterProduct) {
        filters.catalogueId = filterProduct;
      }
      if (filterChantier) {
        filters.chantierId = filterChantier;
      }
      if (filterStartDate) {
        filters.startDate = new Date(filterStartDate).toISOString();
      }
      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        filters.endDate = endDate.toISOString();
      }

      const { data, count } = await getStockMovements(userId, filters);
      setMovements(data);
      setTotalCount(count);
    } catch (err) {
      console.error('Error fetching movements:', err);
      setError('Erreur de chargement des mouvements');
    } finally {
      setLoading(false);
    }
  }, [userId, currentPage, filterType, filterProduct, filterChantier, filterStartDate, filterEndDate]);

  // Initial load
  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterProduct, filterChantier, filterStartDate, filterEndDate]);

  // Filter movements by search (client-side)
  const filteredMovements = useMemo(() => {
    if (!debouncedSearch) return movements;

    const searchLower = debouncedSearch.toLowerCase();
    return movements.filter(
      (m) =>
        m.catalogue?.nom?.toLowerCase().includes(searchLower) ||
        m.motif?.toLowerCase().includes(searchLower) ||
        m.chantier?.nom?.toLowerCase().includes(searchLower) ||
        m.devis?.numero?.toString().includes(searchLower)
    );
  }, [movements, debouncedSearch]);

  // Stats
  const stats = useMemo(() => {
    const entrees = movements.filter((m) => m.type === 'entree').reduce((s, m) => s + Math.abs(m.quantite), 0);
    const sorties = movements.filter((m) => m.type === 'sortie').reduce((s, m) => s + Math.abs(m.quantite), 0);
    return { entrees, sorties };
  }, [movements]);

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Export
  const handleExport = async () => {
    setExporting(true);
    try {
      const filters = {};
      if (filterType !== 'all') filters.type = filterType;
      if (filterProduct) filters.catalogueId = filterProduct;
      if (filterChantier) filters.chantierId = filterChantier;
      if (filterStartDate) filters.startDate = new Date(filterStartDate).toISOString();
      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        filters.endDate = endDate.toISOString();
      }

      const csv = await exportMovementsToCSV(userId, filters);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `mouvements_stock_${date}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      setError('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterType('all');
    setFilterProduct('');
    setFilterChantier('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
  };

  // Has active filters
  const hasFilters =
    filterType !== 'all' || filterProduct || filterChantier || filterStartDate || filterEndDate || search;

  // Get type badge
  const getTypeBadge = (type) => {
    const typeInfo = MOVEMENT_TYPES.find((t) => t.id === type) || {};
    const colorMap = {
      emerald: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700',
      red: isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700',
      blue: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700',
      purple: isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700',
    };
    return colorMap[typeInfo.color] || colorMap.blue;
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className={`p-2 rounded-xl ${hoverBg}`}>
              <ArrowLeft size={20} className={textPrimary} />
            </button>
          )}
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Historique des mouvements</h1>
            <p className={textMuted}>
              {totalCount} mouvement{totalCount > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMovements}
            disabled={loading}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${hoverBg}`}
          >
            <RefreshCw size={18} className={`${loading ? 'animate-spin' : ''} ${textSecondary}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || movements.length === 0}
            className="px-4 py-2.5 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
            style={{ background: couleur }}
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: `${couleur}20` }}>
              <History size={18} style={{ color: couleur }} />
            </div>
            <span className={textMuted}>Cette page</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{filteredMovements.length}</p>
        </div>

        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
              <TrendingUp size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            </div>
            <span className={textMuted}>Entrées</span>
          </div>
          <p className={`text-2xl font-bold text-emerald-500`}>+{stats.entrees}</p>
        </div>

        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <TrendingDown size={18} className={isDark ? 'text-red-400' : 'text-red-600'} />
            </div>
            <span className={textMuted}>Sorties</span>
          </div>
          <p className={`text-2xl font-bold text-red-500`}>-{stats.sorties}</p>
        </div>

        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <Package size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <span className={textMuted}>Balance</span>
          </div>
          <p className={`text-2xl font-bold ${stats.entrees - stats.sorties >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {stats.entrees - stats.sorties >= 0 ? '+' : ''}
            {stats.entrees - stats.sorties}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Rechercher produit, motif, chantier..."
              aria-label="Rechercher produit, motif, chantier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
            />
          </div>

          {/* Type filter buttons */}
          <div className="flex gap-2">
            {MOVEMENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  filterType === type.id
                    ? 'text-white'
                    : isDark
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
                style={filterType === type.id ? { background: couleur } : {}}
              >
                {type.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
              hasFilters ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
            style={hasFilters ? { background: couleur } : {}}
          >
            <Filter size={16} />
            Filtres
            {hasFilters && (
              <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className={`${cardBg} rounded-xl border p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${textPrimary}`}>Filtres avances</h3>
              {hasFilters && (
                <button onClick={clearFilters} className={`text-sm ${textMuted} hover:${textPrimary}`}>
                  Reinitialiser
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                  <Package size={14} className="inline mr-1" />
                  Produit
                </label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                >
                  <option value="">Tous les produits</option>
                  {catalogue.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                  <Building2 size={14} className="inline mr-1" />
                  Chantier
                </label>
                <select
                  value={filterChantier}
                  onChange={(e) => setFilterChantier(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                >
                  <option value="">Tous les chantiers</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                  <Calendar size={14} className="inline mr-1" />
                  Date debut
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                  <Calendar size={14} className="inline mr-1" />
                  Date fin
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={`${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-xl p-4 flex items-center gap-3`}>
          <AlertCircle className="text-red-500" size={20} />
          <span className={isDark ? 'text-red-300' : 'text-red-700'}>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} className={isDark ? 'text-red-400' : 'text-red-500'} />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
          <Loader2 size={48} className={`mx-auto mb-4 animate-spin`} style={{ color: couleur }} />
          <p className={textMuted}>Chargement des mouvements...</p>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
          <History size={48} className={`mx-auto mb-4 ${textMuted}`} />
          <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
            {hasFilters ? 'Aucun resultat' : 'Aucun mouvement'}
          </h3>
          <p className={textMuted}>
            {hasFilters
              ? 'Modifiez vos filtres pour voir plus de resultats'
              : 'Les mouvements de stock apparaitront ici'}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 rounded-xl text-white font-medium"
              style={{ background: couleur }}
            >
              Reinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Movements table */}
          <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
            {/* Desktop header */}
            <div
              className={`hidden lg:flex px-5 py-3 border-b ${
                isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className={`w-40 text-sm font-medium ${textMuted}`}>Date</span>
              <span className={`flex-1 text-sm font-medium ${textMuted}`}>Produit</span>
              <span className={`w-28 text-sm font-medium ${textMuted}`}>Type</span>
              <span className={`w-24 text-sm font-medium text-center ${textMuted}`}>Quantite</span>
              <span className={`flex-1 text-sm font-medium ${textMuted}`}>Motif</span>
              <span className={`w-36 text-sm font-medium ${textMuted}`}>Chantier/Devis</span>
            </div>

            {/* Movements list */}
            <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filteredMovements.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col lg:flex-row lg:items-center px-5 py-4 gap-3 ${hoverBg}`}
                >
                  {/* Date */}
                  <div className="lg:w-40">
                    <p className={`text-sm ${textSecondary}`}>{formatDate(m.created_at)}</p>
                  </div>

                  {/* Product */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${textPrimary}`}>
                      {m.catalogue?.nom || 'Produit supprime'}
                    </p>
                    <p className={`text-xs ${textMuted} lg:hidden`}>
                      {m.catalogue?.unite || 'unite'}
                    </p>
                  </div>

                  {/* Type */}
                  <div className="lg:w-28">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadge(m.type)}`}>
                      {m.type === 'entree' && <TrendingUp size={12} className="mr-1" />}
                      {m.type === 'sortie' && <TrendingDown size={12} className="mr-1" />}
                      {m.type}
                    </span>
                  </div>

                  {/* Quantity */}
                  <div className="lg:w-24 lg:text-center">
                    <span
                      className={`font-bold ${
                        m.type === 'entree'
                          ? 'text-emerald-500'
                          : m.type === 'sortie'
                          ? 'text-red-500'
                          : textPrimary
                      }`}
                    >
                      {m.type === 'entree' ? '+' : m.type === 'sortie' ? '' : ''}
                      {m.quantite}
                    </span>
                    <span className={`text-xs ml-1 ${textMuted}`}>{m.catalogue?.unite || ''}</span>
                  </div>

                  {/* Motif */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${textSecondary}`}>{m.motif || '-'}</p>
                  </div>

                  {/* Chantier/Devis */}
                  <div className="lg:w-36">
                    {m.chantier?.nom ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className={textMuted} />
                        <span className={`text-sm truncate ${textSecondary}`}>{m.chantier.nom}</span>
                      </div>
                    ) : m.devis?.numero ? (
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className={textMuted} />
                        <span className={`text-sm ${textSecondary}`}>#{m.devis.numero}</span>
                      </div>
                    ) : (
                      <span className={textMuted}>-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className={textMuted}>
                Page {currentPage} sur {totalPages} ({totalCount} resultats)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={!canGoPrev}
                  className={`p-2 rounded-xl disabled:opacity-50 ${
                    isDark ? 'bg-slate-700' : 'bg-slate-100'
                  } ${hoverBg}`}
                >
                  <ChevronLeft size={18} className={textSecondary} />
                </button>

                {/* Page numbers */}
                <div className="flex gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-medium ${
                          currentPage === pageNum
                            ? 'text-white'
                            : isDark
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                        style={currentPage === pageNum ? { background: couleur } : {}}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!canGoNext}
                  className={`p-2 rounded-xl disabled:opacity-50 ${
                    isDark ? 'bg-slate-700' : 'bg-slate-100'
                  } ${hoverBg}`}
                >
                  <ChevronRight size={18} className={textSecondary} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
