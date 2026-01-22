import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Keyboard, Command } from 'lucide-react';
import {
  COMMON_SHORTCUTS,
  groupShortcutsByCategory,
  CATEGORY_LABELS,
  formatShortcut
} from '../hooks/useKeyboardShortcuts';

/**
 * ShortcutsHelp - Modal displaying all keyboard shortcuts
 * Accessible via Cmd+/ or help menu
 */
export default function ShortcutsHelp({
  isOpen,
  onClose,
  isDark = false,
  couleur = '#f97316'
}) {
  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const kbdBg = isDark ? 'bg-slate-700' : 'bg-slate-100';

  const isMac = typeof navigator !== 'undefined' &&
    navigator.platform.toLowerCase().includes('mac');

  // Group shortcuts
  const groupedShortcuts = groupShortcutsByCategory();

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className={`relative w-full max-w-lg ${cardBg} rounded-2xl shadow-2xl overflow-hidden`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div
            className="px-6 pt-6 pb-4"
            style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Keyboard size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Raccourcis clavier</h2>
                  <p className="text-white/80 text-sm">
                    {isMac ? 'Utilisez ⌘ pour les commandes' : 'Utilisez Ctrl pour les commandes'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-sm ${textPrimary}`}>
                        {shortcut.description}
                      </span>
                      <ShortcutKeys
                        shortcut={shortcut}
                        isMac={isMac}
                        kbdBg={kbdBg}
                        textPrimary={textPrimary}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${borderColor}`}>
            <p className={`text-center text-xs ${textMuted}`}>
              Appuyez sur <Kbd bg={kbdBg} text={textPrimary}>{isMac ? '⌘' : 'Ctrl'}</Kbd> + <Kbd bg={kbdBg} text={textPrimary}>/</Kbd> pour ouvrir ce menu
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Kbd - Keyboard key component
 */
function Kbd({ children, bg, text }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded font-mono text-xs font-medium ${bg} ${text}`}
    >
      {children}
    </kbd>
  );
}

/**
 * ShortcutKeys - Display shortcut key combination
 */
function ShortcutKeys({ shortcut, isMac, kbdBg, textPrimary }) {
  // Handle sequence shortcuts (g d, n c, etc.)
  if (shortcut.sequence) {
    const parts = shortcut.sequence.split(' ');
    return (
      <div className="flex items-center gap-1">
        {parts.map((part, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <span className={`text-xs ${textPrimary} opacity-50`}>puis</span>}
            <Kbd bg={kbdBg} text={textPrimary}>{part.toUpperCase()}</Kbd>
          </span>
        ))}
      </div>
    );
  }

  // Handle regular shortcuts with modifiers
  const keys = [];

  if (shortcut.meta) {
    keys.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.ctrl && !shortcut.meta) {
    keys.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.alt) {
    keys.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    keys.push(isMac ? '⇧' : 'Shift');
  }

  // Format the main key
  const keyMap = {
    'escape': 'Esc',
    'enter': '↵',
    'space': 'Space',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
  };
  const displayKey = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  keys.push(displayKey);

  return (
    <div className="flex items-center gap-1">
      {keys.map((key, idx) => (
        <span key={idx} className="flex items-center">
          {idx > 0 && !isMac && <span className="mx-0.5 text-xs opacity-50">+</span>}
          <Kbd bg={kbdBg} text={textPrimary}>{key}</Kbd>
        </span>
      ))}
    </div>
  );
}
