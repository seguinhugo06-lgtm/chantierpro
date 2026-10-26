import { useState, useMemo } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';

export default function FiltresPanel({
  filters,
  setFilters,
  resetFilters,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.priceRange[0] != null) count++;
    if (filters.priceRange[1] != null) count++;
    if (filters.difficulty) count++;
    if (filters.unite) count++;
    return count;
  }, [filters]);

  const bg = 'bg-surface border-bord';
  const inputBg = 'bg-surface border-bord-fort text-encre placeholder:text-encre-3 focus:border-accent focus:ring-4 focus:ring-accent/20';
  const textSecondary = 'text-encre-3';

  const difficulties = [
    { label: 'Tous', value: null },
    { label: 'Simple', value: 'simple' },
    { label: 'Standard', value: 'standard' },
    { label: 'Complexe', value: 'complexe' },
  ];

  const unites = ['Tous', 'm²', 'ml', 'm³', 'U', 'ens', 'forfait', 'h', 'kg'];

  const handlePriceChange = (index, value) => {
    const parsed = value === '' ? null : Number(value);
    const newRange = [...filters.priceRange];
    newRange[index] = parsed;
    setFilters({ ...filters, priceRange: newRange });
  };

  const handleDifficultyChange = (value) => {
    setFilters({ ...filters, difficulty: value });
  };

  const handleUniteChange = (e) => {
    const val = e.target.value === 'Tous' ? null : e.target.value;
    setFilters({ ...filters, unite: val });
  };

  return (
    <div className={`border rounded-xl ${bg} transition-all duration-300 ease-in-out overflow-hidden`}>
      {/* Collapsed / Toggle bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`flex items-center gap-2 text-sm font-medium text-encre-2 hover:opacity-80 transition-opacity`}
        >
          <SlidersHorizontal size={16} />
          <span>Filtres</span>
          {activeCount > 0 && (
            <span
              className="inline-flex items-center justify-center text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 bg-accent text-sur-accent"
            >
              {activeCount}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {activeCount > 0 && !isExpanded && (
          <button
            onClick={resetFilters}
            className={`flex items-center gap-1 text-xs ${textSecondary} hover:opacity-80 transition-opacity`}
          >
            <RotateCcw size={12} />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* Expanded panel */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className={`px-4 pb-4 pt-1 border-t border-bord`}>
          <div className="flex flex-wrap items-end gap-4">
            {/* Price Range */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-medium ${textSecondary}`}>Fourchette de prix</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  placeholder="Min"
                  value={filters.priceRange[0] ?? ''}
                  onChange={(e) => handlePriceChange(0, e.target.value)}
                  aria-label="Prix minimum"
                  className={`w-24 px-2.5 h-11 text-base sm:text-sm border rounded-lg outline-none transition-shadow ${inputBg}`}
                />
                <span className={`text-xs ${textSecondary}`}>—</span>
                <input
                  type="number"
                  step="1"
                  placeholder="Max"
                  value={filters.priceRange[1] ?? ''}
                  onChange={(e) => handlePriceChange(1, e.target.value)}
                  aria-label="Prix maximum"
                  className={`w-24 px-2.5 h-11 text-base sm:text-sm border rounded-lg outline-none transition-shadow ${inputBg}`}
                />
                <span className={`text-xs ${textSecondary}`}>€</span>
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-medium ${textSecondary}`}>Difficulté</label>
              <div className="flex items-center rounded-lg overflow-hidden border border-bord-fort">
                {difficulties.map((d, i) => {
                  const isActive = filters.difficulty === d.value;
                  return (
                    <button
                      key={d.label}
                      onClick={() => handleDifficultyChange(d.value)}
                      aria-pressed={isActive}
                      className={`px-3 h-11 text-sm font-medium transition-colors duration-150 ${
                        i > 0 ? 'border-l border-bord-fort' : ''
                      } ${isActive ? 'bg-encre text-surface' : 'text-encre-2 hover:bg-surface-2'}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unité */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-medium ${textSecondary}`}>Unité</label>
              <select
                value={filters.unite ?? 'Tous'}
                onChange={handleUniteChange}
                className={`px-2.5 h-11 text-base sm:text-sm border rounded-lg outline-none transition-shadow cursor-pointer ${inputBg}`}
              >
                {unites.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset */}
            {activeCount > 0 && (
              <button
                onClick={resetFilters}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 text-encre-3 hover:bg-surface-2 hover:text-encre-2`}
              >
                <X size={14} />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
