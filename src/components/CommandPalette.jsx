import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, X, FileText, Building2, Users, Plus, Calendar, Package,
  Home, Settings, HardHat, ChevronRight, Command, ArrowUp, ArrowDown,
  Zap, Receipt, Clock, BarChart3, Mic
} from 'lucide-react';

/**
 * CommandPalette - Spotlight-style command palette (⌘K)
 * Features:
 * - Keyboard navigation (arrows, enter, escape)
 * - Quick actions (new devis, client, chantier)
 * - Search across all entities
 * - Recent items
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
  onStartVoiceNote,
  // Theme
  isDark = false,
  couleur = '#f97316'
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'bg-slate-700' : 'bg-slate-100';
  const selectedBg = isDark ? 'bg-slate-700' : 'bg-slate-100';

  // Quick actions (always available)
  const quickActions = [
    { id: 'new-devis', label: 'Nouveau devis', icon: FileText, shortcut: 'D', action: () => { onNewDevis?.(); onClose(); }, color: '#f97316' },
    { id: 'new-facture', label: 'Nouvelle facture', icon: Receipt, shortcut: 'F', action: () => { onNewDevis?.('facture'); onClose(); }, color: '#8b5cf6' },
    { id: 'new-client', label: 'Nouveau client', icon: Users, shortcut: 'C', action: () => { onNewClient?.(); onClose(); }, color: '#3b82f6' },
    { id: 'new-chantier', label: 'Nouveau chantier', icon: Building2, shortcut: 'H', action: () => { onNewChantier?.(); onClose(); }, color: '#22c55e' },
    { id: 'voice-note', label: 'Note vocale', icon: Mic, shortcut: 'V', action: () => { onStartVoiceNote?.(); onClose(); }, color: '#ec4899' },
  ];

  // Navigation items
  const navigationItems = [
    { id: 'nav-dashboard', label: 'Dashboard', icon: Home, action: () => { setPage('dashboard'); onClose(); } },
    { id: 'nav-devis', label: 'Devis & Factures', icon: FileText, action: () => { setPage('devis'); onClose(); } },
    { id: 'nav-chantiers', label: 'Chantiers', icon: Building2, action: () => { setPage('chantiers'); onClose(); } },
    { id: 'nav-clients', label: 'Clients', icon: Users, action: () => { setPage('clients'); onClose(); } },
    { id: 'nav-planning', label: 'Planning', icon: Calendar, action: () => { setPage('planning'); onClose(); } },
    { id: 'nav-catalogue', label: 'Catalogue', icon: Package, action: () => { setPage('catalogue'); onClose(); } },
    { id: 'nav-equipe', label: 'Equipe', icon: HardHat, action: () => { setPage('equipe'); onClose(); } },
    { id: 'nav-settings', label: 'Parametres', icon: Settings, action: () => { setPage('settings'); onClose(); } },
  ];

  // Search results
  const searchResults = useMemo(() => {
    if (query.length < 2) return { clients: [], chantiers: [], devis: [] };

    const q = query.toLowerCase();
    return {
      clients: clients.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.prenom?.toLowerCase().includes(q) ||
        c.entreprise?.toLowerCase().includes(q) ||
        c.telephone?.includes(q)
      ).slice(0, 5),
      chantiers: chantiers.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.adresse?.toLowerCase().includes(q)
      ).slice(0, 5),
      devis: devis.filter(d =>
        d.numero?.toLowerCase().includes(q) ||
        clients.find(c => c.id === d.client_id)?.nom?.toLowerCase().includes(q)
      ).slice(0, 5)
    };
  }, [query, clients, chantiers, devis]);

  // Build flat list of all items
  const allItems = useMemo(() => {
    const items = [];

    if (query.length < 2) {
      // Show quick actions first
      items.push({ type: 'header', label: 'Actions rapides' });
      quickActions.forEach(a => items.push({ type: 'action', ...a }));

      // Then navigation
      items.push({ type: 'header', label: 'Navigation' });
      navigationItems.forEach(n => items.push({ type: 'nav', ...n }));
    } else {
      // Show filtered quick actions
      const filteredActions = quickActions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase())
      );
      if (filteredActions.length > 0) {
        items.push({ type: 'header', label: 'Actions' });
        filteredActions.forEach(a => items.push({ type: 'action', ...a }));
      }

      // Show search results
      if (searchResults.clients.length > 0) {
        items.push({ type: 'header', label: 'Clients' });
        searchResults.clients.forEach(c => items.push({
          type: 'result',
          id: `client-${c.id}`,
          label: `${c.nom} ${c.prenom || ''}`,
          sublabel: c.telephone || c.entreprise,
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
            label: d.numero,
            sublabel: `${client?.nom || ''} - ${(d.total_ttc || 0).toLocaleString('fr-FR')}€`,
            icon: d.type === 'facture' ? Receipt : FileText,
            color: d.type === 'facture' ? '#8b5cf6' : '#f97316',
            action: () => { setPage('devis'); setSelectedDevis?.(d); onClose(); }
          });
        });
      }

      // Show filtered navigation
      const filteredNav = navigationItems.filter(n =>
        n.label.toLowerCase().includes(query.toLowerCase())
      );
      if (filteredNav.length > 0) {
        items.push({ type: 'header', label: 'Pages' });
        filteredNav.forEach(n => items.push({ type: 'nav', ...n }));
      }
    }

    return items;
  }, [query, quickActions, navigationItems, searchResults, clients]);

  // Selectable items (exclude headers)
  const selectableItems = allItems.filter(i => i.type !== 'header');

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
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
        selectableItems[selectedIndex]?.action?.();
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
          className="fixed inset-0 flex items-start justify-center z-[100] pt-16 sm:pt-24 p-4"
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
            className={`relative w-full max-w-xl ${cardBg} rounded-2xl shadow-2xl border ${borderColor} overflow-hidden`}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Palette de commandes"
          >
            {/* Search input */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${borderColor}`}>
              <Search size={20} className={textMuted} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher ou taper une commande..."
                className={`flex-1 bg-transparent outline-none text-lg ${textPrimary}`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Rechercher"
              />
              <div className="flex items-center gap-1">
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <ArrowUp size={10} className="inline" />
                </kbd>
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <ArrowDown size={10} className="inline" />
                </kbd>
                <span className={`text-xs ${textMuted} mx-1`}>naviguer</span>
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>↵</kbd>
              </div>
            </div>

            {/* Results list */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {allItems.map((item, idx) => {
                  if (item.type === 'header') {
                    return (
                      <motion.p
                        key={`header-${item.label}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`text-xs font-semibold uppercase tracking-wider px-5 py-2 ${textMuted}`}
                      >
                        {item.label}
                      </motion.p>
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
                      onClick={item.action}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15, delay: currentIndex * 0.02 }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 mx-1 rounded-xl transition-colors ${
                        isSelected ? selectedBg : `hover:${hoverBg}`
                      }`}
                      style={isSelected ? { backgroundColor: isDark ? '#334155' : '#f1f5f9' } : {}}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <motion.div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color || couleur}20` }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon size={18} style={{ color: item.color || couleur }} />
                      </motion.div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`font-medium truncate ${textPrimary}`}>{item.label}</p>
                        {item.sublabel && (
                          <p className={`text-sm truncate ${textMuted}`}>{item.sublabel}</p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
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

              {query.length >= 2 && selectableItems.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-12 text-center"
                >
                  <Search size={40} className={`mx-auto mb-3 ${textMuted} opacity-30`} />
                  <p className={`font-medium ${textPrimary}`}>Aucun resultat</p>
                  <p className={`text-sm mt-1 ${textMuted}`}>
                    Essayez une autre recherche pour "{query}"
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-4 py-3 border-t ${borderColor} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-4 text-xs">
                <span className={`flex items-center gap-1 ${textMuted}`}>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>↑</kbd>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>↓</kbd>
                  <span className="ml-1">naviguer</span>
                </span>
                <span className={`flex items-center gap-1 ${textMuted}`}>
                  <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>↵</kbd>
                  <span className="ml-1">selectionner</span>
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
