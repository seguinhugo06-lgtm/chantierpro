import { Keyboard } from 'lucide-react';
import {
  groupShortcutsByCategory,
  CATEGORY_LABELS,
} from '../hooks/useKeyboardShortcuts';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';

/**
 * ShortcutsHelp - Modal displaying all keyboard shortcuts
 * Accessible via Cmd+/ or help menu
 *
 * Fenêtre `ui/Modal` (portail, role="dialog", Échap, feuille du bas au téléphone) ; couleurs : jetons du thème.
 * isDark et couleur restent acceptés (plus nécessaires).
 */
export default function ShortcutsHelp({
  isOpen,
  onClose,
  isDark: _isDark = false,
  couleur: _couleur,
}) {
  // Theme classes
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const kbdBg = 'bg-surface-2';

  const isMac = typeof navigator !== 'undefined' &&
    navigator.platform.toLowerCase().includes('mac');

  // Group shortcuts
  const groupedShortcuts = groupShortcutsByCategory();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10 flex-shrink-0">
            <Keyboard size={20} className="text-accent-texte" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <ModalTitle>Raccourcis clavier</ModalTitle>
            <ModalDescription>
              {isMac ? 'Utilisez ⌘ pour les commandes' : 'Utilisez Ctrl pour les commandes'}
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category}>
            <h3 className={`text-xs font-semibold mb-3 ${textMuted}`}>
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-2"
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
      </ModalBody>

      <ModalFooter className="justify-center">
        <p className={`text-center text-xs ${textMuted}`}>
          Appuyez sur <Kbd bg={kbdBg} text={textPrimary}>{isMac ? '⌘' : 'Ctrl'}</Kbd> + <Kbd bg={kbdBg} text={textPrimary}>/</Kbd> pour ouvrir ce menu
        </p>
      </ModalFooter>
    </Modal>
  );
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
