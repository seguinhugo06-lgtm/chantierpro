import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Fuse from 'fuse.js';
import {
  Search, X, FileText, Building2, Users, Plus, Calendar, Package,
  Home, Settings, HardHat, ChevronRight, Command, ArrowUp, ArrowDown,
  Zap, Receipt, Clock, BarChart3, History, Star, Wallet, Library,
  UserCheck, ShoppingCart, Camera, ClipboardList, PenTool, Download
} from 'lucide-react';

/**
 * Storage key for recent items
 */
const RECENT_ITEMS_KEY = 'chantierpro_recent_items';
const MAX_RECENT_ITEMS = 5;

/**
 * Debounce hook
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Get recent items from localStorage
 */
function getRecentItems() {
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save recent item to localStorage
 */
function saveRecentItem(item) {
  try {
    const items = getRecentItems();
    // Remove if already exists
    const filtered = items.filter(i => i.id !== item.id);
    // Add to front
    const updated = [item, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * CommandPalette - Spotlight-style command palette (⌘K)
 * Features:
 * - Keyboard navigation (arrows, enter, escape)
 * - Quick actions (new devis, client, chantier)
 * - Fuzzy search across all entities (fuse.js)
 * - Recent items
 * - ⌘1-9 quick select
 */
export default function CommandPalette({
  isOpen,
  onClose,
  // Navigation
  setPage,
  setSelectedChantier,
  setSelectedDevis,
  // Data
  clients = [],
  chantiers = [],
  devis = [],
  // Actions
  onNewDevis,
  onNewClient,
  onNewChantier,
  // Theme
  isDark = false,
  couleur = '#f97316'
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Debounce search query (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const selectedBg = isDark ? 'bg-slate-700' : 'bg-slate-100';

  // Load recent items on mount
  useEffect(() => {
    setRecentItems(getRecentItems());
  }, [isOpen]);

  // Quick actions (always available)
  const quickActions = useMemo(() => [
    { id: 'new-devis', label: 'Créer un devis', keywords: 'nouveau devis créer', icon: FileText, shortcut: '⌘D', action: () => { onNewDevis?.(); onClose(); }, color: '#f97316' },
    { id: 'new-facture', label: 'Créer une facture', keywords: 'nouvelle facture créer', icon: Receipt, shortcut: '⌘F', action: () => { onNewDevis?.('facture'); onClose(); }, color: '#8b5cf6' },
    { id: 'new-client', label: 'Ajouter un client', keywords: 'nouveau client ajouter', icon: Users, shortcut: '⌘C', action: () => { onNewClient?.(); onClose(); }, color: '#3b82f6' },
    { id: 'new-chantier', label: 'Créer un chantier', keywords: 'nouveau chantier créer', icon: Building2, shortcut: '⌘H', action: () => { onNewChantier?.(); onClose(); }, color: '#22c55e' },
  ], [onNewDevis, onNewClient, onNewChantier, onClose]);

  // Navigation items
  const navigationItems = useMemo(() => [
    { id: 'nav-dashboard', label: 'Dashboard', keywords: 'accueil tableau de bord', icon: Home, action: () => { setPage('dashboard'); onClose(); } },
    { id: 'nav-devis', label: 'Devis & Factures', keywords: 'documents', icon: FileText, action: () => { setPage('devis'); onClose(); } },
    { id: 'nav-chantiers', label: 'Chantiers', keywords: 'projets travaux', icon: Building2, action: () => { setPage('chantiers'); onClose(); } },
    { id: 'nav-clients', label: 'Clients', keywords: 'contacts', icon: Users, action: () => { setPage('clients'); onClose(); } },
    { id: 'nav-planning', label: 'Planning', keywords: 'calendrier agenda', icon: Calendar, action: () => { setPage('planning'); onClose(); } },
    { id: 'nav-catalogue', label: 'Catalogue', keywords: 'produits articles', icon: Package, action: () => { setPage('catalogue'); onClose(); } },
    { id: 'nav-ouvrages', label: 'Bibliothèque d\'Ouvrages', keywords: 'ouvrages composites prix', icon: Library, action: () => { setPage('ouvrages'); onClose(); } },
    { id: 'nav-soustraitants', label: 'Sous-Traitants', keywords: 'sous-traitants prestataires', icon: UserCheck, action: () => { setPage('soustraitants'); onClose(); } },
    { id: 'nav-commandes', label: 'Commandes Fournisseurs', keywords: 'commandes achats fournisseurs', icon: ShoppingCart, action: () => { setPage('commandes'); onClose(); } },
    { id: 'nav-tresorerie', label: 'Trésorerie', keywords: 'tresorerie cash flow finances', icon: Wallet, action: () => { setPage('tresorerie'); onClose(); } },
    { id: 'nav-ia-devis', label: 'IA Devis', keywords: 'ia photo analyse devis automatique', icon: Camera, action: () => { setPage('ia-devis'); onClose(); } },
    { id: 'nav-entretien', label: 'Carnet d\'Entretien', keywords: 'entretien maintenance garantie', icon: ClipboardList, action: () => { setPage('entretien'); onClose(); } },
    { id: 'nav-signatures', label: 'Signatures', keywords: 'signature electronique signer', icon: PenTool, action: () => { setPage('signatures'); onClose(); } },
    { id: 'nav-export', label: 'Export Comptable', keywords: 'export comptabilite fec csv', icon: Download, action: () => { setPage('export'); onClose(); } },
    { id: 'nav-equipe', label: 'Équipe', keywords: 'collaborateurs employés', icon: HardHat, action: () => { setPage('equipe'); onClose(); } },
    { id: 'nav-rentabilite', label: 'Rentabilité', keywords: 'statistiques analyse', icon: BarChart3, action: () => { setPage('rentabilite'); onClose(); } },
    { id: 'nav-settings', label: 'Paramètres', keywords: 'configuration reglages', icon: Settings, action: () => { setPage('settings'); onClose(); } },
  ], [setPage, onClose]);

  // Create Fuse instances for fuzzy search
  const fuseClients = useMemo(() => new Fuse(clients, {
    keys: ['nom', 'prenom', 'entreprise', 'telephone', 'email'],
    threshold: 0.4,
    includeScore: true,
  }), [clients]);

  const fuseChantiers = useMemo(() => new Fuse(chantiers, {
    keys: ['nom', 'adresse', 'notes'],
    threshold: 0.4,
    includeScore: true,
  }), [chantiers]);

  const fuseDevis = useMemo(() => new Fuse(devis.map(d => ({
    ...d,
    clientNom: clients.find(c => c.id === d.client_id)?.nom || ''
  })), {
    keys: ['numero', 'clientNom', 'objet', 'titre'],
    threshold: 0.4,
    includeScore: true,
  }), [devis, clients]);

  const fuseActions = useMemo(() => new Fuse([...quickActions, ...navigationItems], {
    keys: ['label', 'keywords'],
    threshold: 0.4,
    includeScore: true,
  }), [quickActions, navigationItems]);

  // Handle item selection with recent tracking
  const handleSelectItem = useCallback((item) => {
    // Save to recent items (only results, not actions)
    if (item.type === 'result') {
      saveRecentItem({
        id: item.id,
        label: item.label,
        sublabel: item.sublabel,
        icon: item.icon?.name || 'FileText',
        color: item.color,
        entityType: item.entityType,
        entityId: item.entityId,
      });
    }
    item.action?.();
  }, []);

  // Search results with fuzzy matching
  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 2) return { actions: [], clients: [], chantiers: [], devis: [] };

    const actionResults = fuseActions.search(debouncedQuery).slice(0, 5);
    const clientResults = fuseClients.search(debouncedQuery).slice(0, 5);
    const chantierResults = fuseChantiers.search(debouncedQuery).slice(0, 5);
    const devisResults = fuseDevis.search(debouncedQuery).slice(0, 5);

    return {
      actions: actionResults.map(r => r.item),
      clients: clientResults.map(r => r.item),
      chantiers: chantierResults.map(r => r.item),
      devis: devisResults.map(r => r.item),
    };
  }, [debouncedQuery, fuseActions, fuseClients, fuseChantiers, fuseDevis]);

  // Build flat list of all items
  const allItems = useMemo(() => {
    const items = [];

    if (debouncedQuery.length < 2) {
      // Show recent items first
      if (recentItems.length > 0) {
        items.push({ type: 'header', label: 'Récents' });
        recentItems.forEach(r => {
          // Resolve icon from name
          const iconMap = { FileText, Receipt, Users, Building2, HardHat };
          const Icon = iconMap[r.icon] || FileText;

          items.push({
            type: 'result',
            id: `recent-${r.id}`,
            label: r.label,
            sublabel: r.sublabel,
            icon: Icon,
            color: r.color || couleur,
            action: () => {
              if (r.entityType === 'client') {
                setPage('clients');
              } else if (r.entityType === 'chantier') {
                setPage('chantiers');
                setSelectedChantier?.(r.entityId);
              } else if (r.entityType === 'devis') {
                setPage('devis');
                setSelectedDevis?.({ id: r.entityId });
              }
              onClose();
            }
          });
        });
      }

      // Show quick actions
      items.push({ type: 'header', label: 'Actions rapides' });
      quickActions.forEach(a => items.push({ type: 'action', ...a }));

      // Then navigation
      items.push({ type: 'header', label: 'Navigation' });
      navigationItems.forEach(n => items.push({ type: 'nav', ...n }));
    } else {
      // Show filtered actions
      if (searchResults.actions.length > 0) {
        items.push({ type: 'header', label: 'Actions' });
        searchResults.actions.forEach(a => {
          const isAction = quickActions.some(qa => qa.id === a.id);
          items.push({ type: isAction ? 'action' : 'nav', ...a });
        });
      }

      // Show search results
      if (searchResults.clients.length > 0) {
        items.push({ type: 'header', label: 'Clients' });
        searchResults.clients.forEach(c => items.push({
          type: 'result',
          id: `client-${c.id}`,
          entityType: 'client',
          entityId: c.id,
          label: `${c.nom} ${c.prenom || ''}`.trim(),
          sublabel: c.entreprise || c.telephone,
          icon: Users,
          color: '#3b82f6',
          action: () => { setPage('clients'); onClose(); }
        }));
      }

      if (searchResults.chantiers.length > 0) {
        items.push({ type: 'header', label: 'Chantiers' });
        searchResults.chantiers.forEach(c => items.push({
          type: 'result',
          id: `chantier-${c.id}`,
          entityType: 'chantier',
          entityId: c.id,
          label: c.nom,
          sublabel: c.adresse?.substring(0, 40),
          icon: Building2,
          color: c.statut === 'en_cours' ? '#22c55e' : c.statut === 'termine' ? '#64748b' : '#3b82f6',
          action: () => { setPage('chantiers'); setSelectedChantier?.(c.id); onClose(); }
        }));
      }

      if (searchResults.devis.length > 0) {
        items.push({ type: 'header', label: 'Documents' });
        searchResults.devis.forEach(d => {
          const client = clients.find(c => c.id === d.client_id);
          items.push({
            type: 'result',
            id: `devis-${d.id}`,
            entityType: 'devis',
            entityId: d.id,
            label: d.numero || `#${d.id?.slice(-6)}`,
            sublabel: `${client?.nom || ''} • ${(d.total_ttc || 0).toLocaleString('fr-FR')} €`,
            icon: d.type === 'facture' ? Receipt : FileText,
            color: d.type === 'facture' ? '#8b5cf6' : '#f97316',
            action: () => { setPage('devis'); setSelectedDevis?.(d); onClose(); }
          });
        });
      }

      // No results message handled separately
    }

    return items;
  }, [debouncedQuery, quickActions, navigationItems, searchResults, recentItems, clients, couleur, setPage, setSelectedChantier, setSelectedDevis, onClose]);

  // Selectable items (exclude headers)
  const selectableItems = allItems.filter(i => i.type !== 'header');

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
      setRecentItems(getRecentItems());
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectableItems[selectedIndex]) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, selectableItems]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    // ⌘1-9 quick select
    if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (selectableItems[index]) {
        handleSelectItem(selectableItems[index]);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, selectableItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectableItems[selectedIndex]) {
          handleSelectItem(selectableItems[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  let selectableIndex = -1;

  // Use createPortal to render at document body level
  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-start justify-center z-[100] pt-16 sm:pt-20 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className={`relative w-full max-w-2xl ${cardBg} rounded-2xl shadow-2xl border ${borderColor} overflow-hidden`}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.2, bounce: 0 }}
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Palette de commandes"
          >
            {/* Search input */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${borderColor}`}>
              <Search size={22} className={textMuted} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher ou taper une commande..."
                className={`flex-1 bg-transparent outline-none text-lg ${textPrimary} placeholder:${textMuted}`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Rechercher"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${textMuted}`}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Results list */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
              <AnimatePresence mode="popLayout">
                {allItems.map((item, idx) => {
                  if (item.type === 'header') {
                    return (
                      <motion.div
                        key={`header-${item.label}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-5 py-2 ${textMuted}`}
                      >
                        {item.label === 'Récents' && <History size={12} />}
                        {item.label === 'Actions rapides' && <Zap size={12} />}
                        {item.label}
                      </motion.div>
                    );
                  }

                  selectableIndex++;
                  const currentIndex = selectableIndex;
                  const isSelected = currentIndex === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <motion.button
                      key={item.id}
                      data-index={currentIndex}
                      onClick={() => handleSelectItem(item)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.1, delay: Math.min(currentIndex * 0.02, 0.1) }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 mx-1 rounded-xl transition-colors ${
                        isSelected ? selectedBg : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                      style={isSelected ? { backgroundColor: isDark ? '#334155' : '#f1f5f9' } : {}}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      {/* Number badge for quick select */}
                      {currentIndex < 9 && (
                        <span className={`w-5 h-5 text-[10px] font-medium rounded flex items-center justify-center flex-shrink-0 ${
                          isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {currentIndex + 1}
                        </span>
                      )}
                      {currentIndex >= 9 && <span className="w-5" />}

                      {/* Icon */}
                      <motion.div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color || couleur}15` }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon size={18} style={{ color: item.color || couleur }} />
                      </motion.div>

                      {/* Label */}
                      <div className="flex-1 text-left min-w-0">
                        <p className={`font-medium truncate ${textPrimary}`}>{item.label}</p>
                        {item.sublabel && (
                          <p className={`text-sm truncate ${textMuted}`}>{item.sublabel}</p>
                        )}
                      </div>

                      {/* Shortcut or arrow */}
                      {item.shortcut && (
                        <kbd className={`text-xs px-2 py-1 rounded font-mono ${
                          isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {item.shortcut}
                        </kbd>
                      )}
                      {item.type === 'result' && (
                        <ChevronRight size={16} className={textMuted} />
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {debouncedQuery.length >= 2 && selectableItems.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-12 text-center"
                >
                  <Search size={40} className={`mx-auto mb-3 ${textMuted} opacity-30`} />
                  <p className={`font-medium ${textPrimary}`}>Aucun résultat</p>
                  <p className={`text-sm mt-1 ${textMuted}`}>
                    Essayez une autre recherche pour "{debouncedQuery}"
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-5 py-3 border-t ${borderColor} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-4 text-xs">
                <span className={`flex items-center gap-1 ${textMuted}`}>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>↑</kbd>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>↓</kbd>
                  <span className="ml-1">naviguer</span>
                </span>
                <span className={`flex items-center gap-1 ${textMuted}`}>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>↵</kbd>
                  <span className="ml-1">sélectionner</span>
                </span>
                <span className={`flex items-center gap-1 ${textMuted}`}>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>⌘</kbd>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>1-9</kbd>
                  <span className="ml-1">accès rapide</span>
                </span>
                <span className={`flex items-center gap-1 ${textMuted}`}>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>esc</kbd>
                  <span className="ml-1">fermer</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={14} style={{ color: couleur }} />
                <span className={`text-xs font-medium`} style={{ color: couleur }}>ChantierPro</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
