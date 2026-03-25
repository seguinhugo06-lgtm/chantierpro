import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export function TabBar({ tabs, activeTab, onTabChange, maxVisible = 5, isDark, couleur }) {
  const [showMore, setShowMore] = useState(false);
  const visibleTabs = tabs.slice(0, maxVisible);
  const overflowTabs = tabs.slice(maxVisible);

  return (
    <div className="relative px-4 sm:px-6 mb-5">
      <div className={`flex items-center gap-1 border-b overflow-x-auto scrollbar-hide ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-3 sm:px-4 min-h-[48px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.key
                ? 'border-current'
                : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
            style={activeTab === tab.key ? { color: couleur, borderColor: couleur } : undefined}
          >
            {tab.icon && <tab.icon size={16} />}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                tab.alert ? 'bg-red-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}

        {overflowTabs.length > 0 && (
          <div className="relative ml-auto flex-shrink-0">
            <button
              onClick={() => setShowMore(p => !p)}
              className={`flex items-center gap-1 px-3 min-h-[48px] text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              aria-expanded={showMore}
              aria-label="Plus d'onglets"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} role="presentation" />
                <div className={`absolute right-0 top-full mt-1 z-40 rounded-xl border shadow-lg py-1 min-w-[180px] ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {overflowTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { onTabChange(tab.key); setShowMore(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left ${
                        activeTab === tab.key ? 'font-semibold' : ''
                      } ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                      style={activeTab === tab.key ? { color: couleur } : undefined}
                    >
                      {tab.icon && <tab.icon size={16} />}
                      {tab.label}
                      {tab.badge > 0 && (
                        <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                          tab.alert ? 'bg-red-500 text-white' : isDark ? 'bg-slate-700' : 'bg-slate-100'
                        }`}>{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
