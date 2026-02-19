/**
 * MemosWidget
 * Daily memos / quick notes widget for the dashboard.
 *
 * Features:
 * - Add quick memos with a text input
 * - Mark memos as done with a checkbox
 * - Delete individual memos
 * - Auto-cleanup of done memos after 24 hours
 * - Max 10 memos displayed
 * - Persisted in localStorage (key: chantierPro_memos)
 *
 * @module MemosWidget
 */

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { StickyNote, Plus, Trash2, Check } from 'lucide-react';
import Widget, { WidgetHeader, WidgetContent } from './Widget';

const STORAGE_KEY = 'chantierPro_memos';
const MAX_MEMOS = 10;
const DONE_CLEANUP_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load memos from localStorage
 * @returns {Array} Parsed memos array
 */
function loadMemos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save memos to localStorage
 * @param {Array} memos - Memos to persist
 */
function saveMemos(memos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Clean up done memos older than 24h
 * @param {Array} memos - Current memos list
 * @returns {Array} Cleaned memos list
 */
function cleanupDoneMemos(memos) {
  const now = Date.now();
  return memos.filter((m) => {
    if (!m.done) return true;
    return now - m.doneAt < DONE_CLEANUP_MS;
  });
}

const MemosWidget = memo(function MemosWidget({ isDark, couleur }) {
  const [memos, setMemos] = useState(() => {
    const loaded = loadMemos();
    return cleanupDoneMemos(loaded);
  });
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Persist memos whenever they change
  useEffect(() => {
    saveMemos(memos);
  }, [memos]);

  // Auto-cleanup on mount and every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setMemos((prev) => cleanupDoneMemos(prev));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addMemo = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    if (memos.length >= MAX_MEMOS) return;

    const newMemo = {
      id: `memo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      done: false,
      doneAt: null,
      createdAt: Date.now(),
    };

    setMemos((prev) => [newMemo, ...prev]);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, memos.length]);

  const toggleDone = useCallback((id) => {
    setMemos((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, done: !m.done, doneAt: !m.done ? Date.now() : null }
          : m
      )
    );
  }, []);

  const deleteMemo = useCallback((id) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addMemo();
      }
    },
    [addMemo]
  );

  /**
   * Format a timestamp as a short time string (HH:MM)
   */
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  const displayedMemos = memos.slice(0, MAX_MEMOS);
  const accentColor = couleur || '#3b82f6';

  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title="Mémos du jour"
        icon={<StickyNote />}
        isDark={isDark}
        badge={displayedMemos.length > 0 ? displayedMemos.filter((m) => !m.done).length : undefined}
      />

      <WidgetContent>
        {/* Input row */}
        <div className="flex items-center gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un mémo..."
            maxLength={140}
            disabled={memos.length >= MAX_MEMOS}
            className={`
              flex-1 px-3 py-2 text-sm rounded-lg border outline-none
              transition-colors duration-150
              ${isDark
                ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
              }
              ${memos.length >= MAX_MEMOS ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
          <button
            type="button"
            onClick={addMemo}
            disabled={!inputValue.trim() || memos.length >= MAX_MEMOS}
            className={`
              flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg
              text-white transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:opacity-90 active:scale-95
            `}
            style={{ background: accentColor }}
            aria-label="Ajouter mémo"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Memos list */}
        {displayedMemos.length > 0 ? (
          <div className="space-y-1.5">
            {displayedMemos.map((m) => (
              <div
                key={m.id}
                className={`
                  group flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                  transition-colors duration-150
                  ${isDark
                    ? 'hover:bg-slate-700/40'
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleDone(m.id)}
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center
                    transition-all duration-150
                    ${m.done
                      ? 'border-transparent'
                      : isDark
                        ? 'border-slate-500 hover:border-slate-400'
                        : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  style={m.done ? { background: accentColor, borderColor: accentColor } : undefined}
                  aria-label={m.done ? 'Marquer comme non fait' : 'Marquer comme fait'}
                >
                  {m.done && <Check size={12} className="text-white" />}
                </button>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`
                      text-sm leading-snug truncate
                      ${m.done
                        ? isDark ? 'text-slate-500 line-through' : 'text-gray-400 line-through'
                        : isDark ? 'text-white' : 'text-gray-900'
                      }
                    `}
                  >
                    {m.text}
                  </p>
                </div>

                {/* Timestamp */}
                <span
                  className={`
                    flex-shrink-0 text-[10px] font-medium
                    ${isDark ? 'text-slate-600' : 'text-gray-300'}
                  `}
                >
                  {formatTime(m.createdAt)}
                </span>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => deleteMemo(m.id)}
                  className={`
                    flex-shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100
                    transition-all duration-150
                    ${isDark
                      ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                      : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                    }
                  `}
                  aria-label="Supprimer mémo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-3
                ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}
            >
              <StickyNote size={20} className={isDark ? 'text-slate-500' : 'text-gray-300'} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Aucun mémo
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Ajoutez vos notes rapides ici
            </p>
          </div>
        )}

        {/* Capacity hint */}
        {memos.length >= MAX_MEMOS && (
          <p className={`text-xs text-center mt-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Limite de {MAX_MEMOS} mémos atteinte
          </p>
        )}
      </WidgetContent>
    </Widget>
  );
});

export default MemosWidget;
