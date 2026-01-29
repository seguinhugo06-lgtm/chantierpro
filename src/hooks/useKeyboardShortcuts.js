import { useEffect, useCallback, useMemo } from 'react';

/**
 * @typedef {Object} Shortcut
 * @property {string} key - Key to press (e.g., 'k', 'Enter', 'Escape')
 * @property {boolean} [ctrl] - Requires Ctrl key
 * @property {boolean} [shift] - Requires Shift key
 * @property {boolean} [alt] - Requires Alt key
 * @property {boolean} [meta] - Requires Meta (Cmd) key
 * @property {Function} handler - Handler function
 * @property {string} [description] - Human-readable description
 * @property {boolean} [preventDefault] - Prevent default browser behavior
 */

/**
 * useKeyboardShortcuts - Register keyboard shortcuts
 *
 * @param {Shortcut[]} shortcuts - Array of shortcut configurations
 * @param {Object} options
 * @param {boolean} options.enabled - Enable/disable shortcuts (default: true)
 * @param {boolean} options.ignoreInputs - Ignore shortcuts when in input/textarea (default: true)
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', meta: true, handler: () => setShowSearch(true), description: 'Open search' },
 *   { key: 'd', meta: true, handler: () => openModal('new-devis'), description: 'New devis' },
 *   { key: 'Escape', handler: () => closeModal(), description: 'Close modal' }
 * ]);
 */
export default function useKeyboardShortcuts(shortcuts, options = {}) {
  const { enabled = true, ignoreInputs = true } = options;

  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in input elements
      if (ignoreInputs) {
        const target = event.target;
        const tagName = target.tagName.toLowerCase();
        const isInput = ['input', 'textarea', 'select'].includes(tagName);
        const isEditable = target.isContentEditable;

        if (isInput || isEditable) {
          // Only allow Escape in inputs
          if (event.key !== 'Escape') return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                        event.code.toLowerCase() === shortcut.key.toLowerCase();

        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey && !event.metaKey);
        const metaMatch = !!shortcut.meta === event.metaKey;
        const shiftMatch = !!shortcut.shift === event.shiftKey;
        const altMatch = !!shortcut.alt === event.altKey;

        // Handle cross-platform: Ctrl on Windows/Linux, Cmd on Mac
        const modifierMatch = shortcut.ctrl || shortcut.meta
          ? (event.ctrlKey || event.metaKey)
          : (!event.ctrlKey && !event.metaKey);

        if (keyMatch && (shortcut.ctrl || shortcut.meta ? modifierMatch : (ctrlMatch && metaMatch)) && shiftMatch && altMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    },
    [shortcuts, enabled, ignoreInputs]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * useKeyboardShortcut - Register a single keyboard shortcut
 *
 * @param {string} key - Key or key combo (e.g., 'k', 'ctrl+k', 'cmd+shift+p')
 * @param {Function} handler - Handler function
 * @param {Object} options
 *
 * @example
 * useKeyboardShortcut('cmd+k', () => setShowSearch(true));
 * useKeyboardShortcut('escape', () => closeModal());
 */
export function useKeyboardShortcut(key, handler, options = {}) {
  const shortcut = useMemo(() => {
    const parts = key.toLowerCase().split('+');
    const actualKey = parts[parts.length - 1];

    return {
      key: actualKey,
      ctrl: parts.includes('ctrl'),
      meta: parts.includes('cmd') || parts.includes('meta'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      handler,
      ...options
    };
  }, [key, handler, options]);

  useKeyboardShortcuts([shortcut], options);
}

/**
 * Format a shortcut for display
 *
 * @param {Shortcut} shortcut - Shortcut configuration
 * @returns {string} - Formatted shortcut string (e.g., "⌘K")
 */
export function formatShortcut(shortcut) {
  const isMac = typeof navigator !== 'undefined' &&
    navigator.platform.toLowerCase().includes('mac');

  const parts = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');

  // Format special keys
  const keyMap = {
    'escape': 'Esc',
    'enter': '↵',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'backspace': '⌫',
    'delete': 'Del',
    'tab': '⇥',
    'space': 'Space'
  };

  const displayKey = keyMap[shortcut.key.toLowerCase()] ||
    shortcut.key.toUpperCase();

  parts.push(displayKey);

  return parts.join(isMac ? '' : '+');
}

/**
 * Common shortcuts registry for help display
 */
export const COMMON_SHORTCUTS = [
  // Global shortcuts
  { key: 'k', meta: true, description: 'Ouvrir la recherche', category: 'global' },
  { key: 'd', meta: true, description: 'Nouveau devis', category: 'global' },
  { key: 'n', meta: true, description: 'Nouveau client', category: 'global' },
  { key: 'h', meta: true, description: 'Nouveau chantier', category: 'global' },
  { key: 's', meta: true, description: 'Sauvegarder', category: 'global' },
  { key: 'p', meta: true, description: 'Imprimer / PDF', category: 'global' },
  { key: 'Escape', description: 'Fermer le modal', category: 'global' },

  // Navigation shortcuts (displayed as sequences)
  { key: 'g then d', description: 'Tableau de bord', category: 'navigation', sequence: 'g d' },
  { key: 'g then c', description: 'Clients', category: 'navigation', sequence: 'g c' },
  { key: 'g then v', description: 'Devis/Factures', category: 'navigation', sequence: 'g v' },
  { key: 'g then h', description: 'Chantiers', category: 'navigation', sequence: 'g h' },
  { key: 'g then e', description: 'Équipe', category: 'navigation', sequence: 'g e' },
  { key: 'g then p', description: 'Planning', category: 'navigation', sequence: 'g p' },
  { key: 'g then s', description: 'Paramètres', category: 'navigation', sequence: 'g s' },

  // Quick actions (displayed as sequences)
  { key: 'n then d', description: 'Nouveau devis', category: 'actions', sequence: 'n d' },
  { key: 'n then c', description: 'Nouveau client', category: 'actions', sequence: 'n c' },
  { key: 'n then h', description: 'Nouveau chantier', category: 'actions', sequence: 'n h' },
  { key: 'n then f', description: 'Nouvelle facture', category: 'actions', sequence: 'n f' }
];

/**
 * Group shortcuts by category
 */
export function groupShortcutsByCategory(shortcuts = COMMON_SHORTCUTS) {
  const groups = {};
  shortcuts.forEach(s => {
    const cat = s.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });
  return groups;
}

/**
 * CATEGORY_LABELS - Labels for shortcut categories
 */
export const CATEGORY_LABELS = {
  global: 'Raccourcis globaux',
  navigation: 'Navigation (g puis...)',
  actions: 'Actions rapides (n puis...)',
  other: 'Autres'
};
