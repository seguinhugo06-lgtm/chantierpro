import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Search, Star, Package, Zap, Droplets, PaintBucket, Hammer, Wrench, X, Plus, Check } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

// Category icons and colors
const CATEGORY_CONFIG = {
  'Carrelage': { icon: '🔲', color: '#78716c' },
  'Peinture': { icon: '🎨', color: '#8b5cf6' },
  'Plomberie': { icon: '🔧', color: '#3b82f6' },
  'Électricité': { icon: '⚡', color: '#eab308' },
  'Maçonnerie': { icon: '🧱', color: '#a16207' },
  'Menuiserie': { icon: '🪵', color: '#92400e' },
  'Matériaux': { icon: '📦', color: '#64748b' },
  'Main d\'oeuvre': { icon: '👷', color: '#f97316' },
  'Outillage': { icon: '🔨', color: '#6b7280' },
  'Location': { icon: '🚛', color: '#0891b2' },
  'Autre': { icon: '📋', color: '#94a3b8' }
};

/**
 * CatalogBrowser - Visual catalog grid with categories
 * For quick item selection in DevisPage
 */
export default function CatalogBrowser({
  catalogue = [],
  onSelectItem,
  isDark = false,
  couleur = '#f97316',
  onClose,
  isOpen = true
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [addedItems, setAddedItems] = useState(new Set());

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    catalogue.forEach(item => {
      const cat = item.categorie || 'Autre';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [catalogue]);

  // Get favorites
  const favorites = useMemo(() =>
    catalogue.filter(item => item.favori),
  [catalogue]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = selectedCategory
      ? (groupedItems[selectedCategory] || [])
      : catalogue;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(item =>
        item.nom?.toLowerCase().includes(q) ||
        item.categorie?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [catalogue, groupedItems, selectedCategory, debouncedSearch]);

  // Categories with counts
  const categories = useMemo(() => {
    return Object.keys(groupedItems).map(cat => ({
      name: cat,
      count: groupedItems[cat].length,
      ...CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Autre']
    }));
  }, [groupedItems]);

  const handleSelectItem = (item) => {
    setAddedItems(prev => new Set([...prev, item.id]));
    onSelectItem?.(item);

    // Brief visual feedback
    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 1500);
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={`relative w-full sm:max-w-2xl max-h-[90vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b flex items-center justify-between"
          style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary}`}>Catalogue</h2>
            <p className={`text-sm ${textMuted}`}>{catalogue.length} articles</p>
          </div>
          <button
            onClick={onClose}
            className={`p-3 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              aria-label="Rechercher un article"
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">

          {/* Favorites section */}
          {favorites.length > 0 && !search && !selectedCategory && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-amber-500" fill="#f59e0b" />
                <h3 className={`text-sm font-semibold ${textPrimary}`}>Favoris</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {favorites.slice(0, 6).map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onSelect={handleSelectItem}
                    isAdded={addedItems.has(item.id)}
                    isDark={isDark}
                    couleur={couleur}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Categories grid */}
          {!search && !selectedCategory && (
            <div className="mb-6">
              <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Categories</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`p-3 rounded-xl border-2 text-center transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                      isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.icon}</span>
                    <p className={`text-xs font-medium truncate ${textPrimary}`}>{cat.name}</p>
                    <p className={`text-[10px] ${textMuted}`}>{cat.count}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected category or search results */}
          {(selectedCategory || search) && (
            <div>
              {/* Category header with back button */}
              {selectedCategory && (
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                  >
                    <X size={16} className={textMuted} />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CATEGORY_CONFIG[selectedCategory]?.icon || '📋'}</span>
                    <h3 className={`font-semibold ${textPrimary}`}>{selectedCategory}</h3>
                  </div>
                  <span className={`text-sm ${textMuted}`}>({filteredItems.length})</span>
                </div>
              )}

              {/* Items grid */}
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onSelect={handleSelectItem}
                      isAdded={addedItems.has(item.id)}
                      isDark={isDark}
                      couleur={couleur}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${textMuted}`}>
                  <Package size={40} className="mx-auto mb-3 opacity-50" />
                  <p>Aucun article trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {catalogue.length === 0 && (
            <div className={`text-center py-12 ${textMuted}`}>
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">Catalogue vide</p>
              <p className="text-sm">Ajoutez des articles dans les parametres</p>
            </div>
          )}
        </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

// Individual item card component
function ItemCard({ item, onSelect, isAdded, isDark, couleur }) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const catConfig = CATEGORY_CONFIG[item.categorie] || CATEGORY_CONFIG['Autre'];

  return (
    <button
      onClick={() => onSelect(item)}
      disabled={isAdded}
      className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg relative overflow-hidden ${
        isAdded
          ? 'border-emerald-500 bg-emerald-500/10'
          : isDark
            ? 'border-slate-700 hover:border-slate-600'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Added checkmark overlay */}
      {isAdded && (
        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <Check size={18} className="text-white" />
          </div>
        </div>
      )}

      {/* Favorite badge */}
      {item.favori && (
        <div className="absolute top-1 right-1">
          <Star size={12} className="text-amber-500" fill="#f59e0b" />
        </div>
      )}

      {/* Content */}
      <div className={isAdded ? 'opacity-30' : ''}>
        <div className="flex items-start gap-2 mb-2">
          <span className="text-lg">{catConfig.icon}</span>
          <p className={`text-sm font-medium leading-tight line-clamp-2 ${textPrimary}`}>
            {item.nom}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textMuted}`}>{item.unite || 'unite'}</span>
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: couleur }}>
            {(item.prix || 0).toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>

      {/* Add indicator */}
      {!isAdded && (
        <div
          className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: couleur }}
        >
          <Plus size={14} className="text-white" />
        </div>
      )}
    </button>
  );
}
