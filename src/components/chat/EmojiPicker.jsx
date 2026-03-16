/**
 * EmojiPicker.jsx — Lightweight emoji grid for reactions + message input
 *
 * No external dependency — uses a curated set of frequently-used emoji.
 * Shows as a popover anchored to a button.
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { Smile, X } from 'lucide-react';

const EMOJI_CATEGORIES = {
  frequent: {
    label: 'Fréquents',
    emojis: ['👍', '❤️', '😂', '🎉', '👏', '🔥', '✅', '👀', '💪', '🙏', '😊', '👌'],
  },
  smileys: {
    label: 'Visages',
    emojis: ['😀', '😃', '😄', '😁', '😆', '🤣', '😅', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😎', '🤓', '🧐', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😮', '😯', '😲', '😳', '🥺', '😢', '😭', '😤', '😡', '🤬', '🤯', '😱', '😰', '😥'],
  },
  gestures: {
    label: 'Gestes',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐️', '👋', '🤝', '🙏', '💪', '🫡'],
  },
  objects: {
    label: 'Objets',
    emojis: ['⚡', '🔥', '💯', '✨', '🎉', '🎊', '🏆', '🎯', '💡', '📌', '📎', '🔧', '🔨', '⚙️', '🧱', '🏗️', '🚧', '📐', '📏', '🪛'],
  },
  symbols: {
    label: 'Symboles',
    emojis: ['✅', '❌', '⚠️', '❓', '❗', '💬', '🔔', '📢', '🏷️', '⭐', '💰', '📊', '📈', '📉', '🕐', '📅'],
  },
};

const EmojiPicker = memo(function EmojiPicker({
  onSelect,
  onClose,
  isDark = false,
  compact = false,
}) {
  const [activeCategory, setActiveCategory] = useState('frequent');
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const bgClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const hoverClass = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const tabActive = isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900';
  const tabInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

  const category = EMOJI_CATEGORIES[activeCategory];

  return (
    <div
      ref={ref}
      className={`${bgClass} border rounded-2xl shadow-xl z-50 ${compact ? 'w-64' : 'w-72'}`}
      onClick={e => e.stopPropagation()}
    >
      {/* Category tabs */}
      {!compact && (
        <div className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto scrollbar-hide">
          {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === key ? tabActive : tabInactive
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className={`grid ${compact ? 'grid-cols-6' : 'grid-cols-8'} gap-0.5 p-2 max-h-48 overflow-y-auto`}>
        {category.emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect?.(emoji);
              onClose?.();
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg ${hoverClass} transition-colors`}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});

/**
 * EmojiButton — Toggle button that opens/closes the picker
 */
export const EmojiButton = memo(function EmojiButton({
  onSelect,
  isDark = false,
  compact = false,
  className = '',
  position = 'top',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    'top-right': 'bottom-full right-0 mb-2',
    'top-left': 'bottom-full left-0 mb-2',
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isDark
            ? 'text-slate-400 hover:text-white hover:bg-slate-700'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Emoji"
      >
        <Smile size={18} />
      </button>

      {isOpen && (
        <div className={`absolute ${positionClasses[position] || positionClasses.top} z-50`}>
          <EmojiPicker
            onSelect={(emoji) => {
              onSelect?.(emoji);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
            isDark={isDark}
            compact={compact}
          />
        </div>
      )}
    </div>
  );
});

export default EmojiPicker;
