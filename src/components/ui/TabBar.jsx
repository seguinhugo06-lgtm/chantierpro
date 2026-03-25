import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * TabBar — Reusable tab navigation with overflow menu.
 * Shows up to maxVisible tabs, with remaining tabs in a "..." dropdown.
 *
 * @param {Array} tabs - [{ key, label, icon?: LucideIcon, badge?: number, alert?: boolean }]
 * @param {string} activeTab - Currently active tab key
 * @param {Function} onTabChange - Called with tab key when tab is clicked
 * @param {number} maxVisible - Max tabs to show before overflow (default: 5)
 * @param {boolean} isDark
 * @param {string} couleur - hex accent color
 */
export default function TabBar({ tabs = [], activeTab, onTabChange, maxVisible = 5, isDark = false, couleur = '#8b5cf6' }) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!showMore) return;
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore]);

  const visibleTabs = tabs.slice(0, maxVisible);
  const overflowTabs = tabs.slice(maxVisible);
  // If active tab is in overflow, swap it into visible
  const activeInOverflow = overflowTabs.find(t => t.key === activeTab);
  let displayVisible = visibleTabs;
  let displayOverflow = overflowTabs;
  if (activeInOverflow) {
    // Swap last visible tab with the active overflow tab
    displayVisible = [...visibleTabs.slice(0, maxVisible - 1), activeInOverflow];
    displayOverflow = [...overflowTabs.filter(t => t.key !== activeTab), visibleTabs[maxVisible - 1]];
  }

  return (
    <div className="relative" role="tablist" aria-label="Navigation par onglets">
      <div className={`flex items-center gap-1 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {displayVisible.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 min-h-[48px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-current'
                  : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
              }`}
              style={isActive ? { color: couleur, borderColor: couleur } : undefined}
            >
              {Icon && <Icon size={16} aria-hidden="true" />}
              <span className="hidden sm:inline">{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                  tab.alert
                    ? 'bg-red-500 text-white'
                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {displayOverflow.length > 0 && (
          <div className="relative ml-auto" ref={moreRef}>
            <button
              onClick={() => setShowMore(p => !p)}
              className={`flex items-center gap-1 px-3 min-h-[48px] text-sm transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-expanded={showMore}
              aria-haspopup="true"
              aria-label="Plus d'onglets"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMore && (
              <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl border shadow-lg py-1 min-w-[200px] ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                {displayOverflow.map(tab => {
                  const isActive = activeTab === tab.key;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => { onTabChange(tab.key); setShowMore(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                        isActive ? 'font-semibold' : ''
                      } ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                      style={isActive ? { color: couleur } : undefined}
                    >
                      {Icon && <Icon size={16} aria-hidden="true" />}
                      <span className="flex-1">{tab.label}</span>
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                          tab.alert ? 'bg-red-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>{tab.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
