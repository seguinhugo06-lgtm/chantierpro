import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import useKeepInViewport from '../../hooks/useKeepInViewport';

/**
 * TabBar — Reusable tab navigation with overflow menu.
 * Shows up to maxVisible tabs, with remaining tabs in a "..." dropdown.
 *
 * @param {Array} tabs - [{ key, label, icon?: LucideIcon, badge?: number, alert?: boolean }]
 * @param {string} activeTab - Currently active tab key
 * @param {Function} onTabChange - Called with tab key when tab is clicked
 * @param {number} maxVisible - Max tabs to show before overflow (default: 5)
 * @param {boolean} isDark  accepté, plus nécessaire : jetons de src/styles/theme.css (refonte du 9 oct.)
 * @param {string} couleur accepté, plus nécessaire : le trait actif est l'accent du thème
 */
export default function TabBar({ tabs = [], activeTab, onTabChange, maxVisible = 5 }) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  const menuRef = useRef(null);
  useKeepInViewport(menuRef, showMore);

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

  // L'onglet actif est ramené dans la rangée qui défile (au bout, il paraissait coupé — recette du 9 oct.).
  // On ne fait défiler QUE la rangée : scrollIntoView ferait aussi sauter la page.
  const rangeeRef = useRef(null);
  useEffect(() => {
    const rangee = rangeeRef.current;
    const actif = rangee?.querySelector('[aria-selected="true"]');
    if (!rangee || !actif) return;
    const gauche = actif.offsetLeft - rangee.offsetLeft;
    if (gauche < rangee.scrollLeft || gauche + actif.offsetWidth > rangee.scrollLeft + rangee.clientWidth) {
      rangee.scrollLeft = Math.max(0, gauche - 12);
    }
  }, [activeTab]);

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
      <div className="flex items-center gap-1 border-b border-bord">
        {/* Les onglets défilent si l'écran est trop étroit ; le bouton « … » reste toujours visible. */}
        <div ref={rangeeRef} className="flex items-center gap-5 sm:gap-6 min-w-0 flex-1 overflow-x-auto scrollbar-hide">
        {displayVisible.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.key)}
              className={`relative flex items-center gap-1.5 h-12 text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive ? 'text-encre' : 'text-encre-3 hover:text-encre-2'
              }`}
            >
              {Icon && <Icon size={16} aria-hidden="true" className="hidden md:block" />}
              {/* Nom toujours affiché : masqué sur téléphone, l'onglet n'était qu'une icône à deviner, sans
                  nom pour un lecteur d'écran (recette du 9 oct.). La rangée défile si elle est trop longue. */}
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold leading-none inline-flex items-center justify-center tabular-nums ${
                  tab.alert ? 'bg-danger-fond text-danger-texte' : 'bg-surface-2 text-encre-2'
                }`}>
                  {tab.badge}
                </span>
              )}
              <span aria-hidden="true" className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
            </button>
          );
        })}
        </div>

        {displayOverflow.length > 0 && (
          <div className="relative flex-shrink-0" ref={moreRef}>
            <button
              onClick={() => setShowMore(p => !p)}
              className="flex items-center justify-center w-11 h-12 text-encre-3 hover:text-encre transition-colors"
              aria-expanded={showMore}
              aria-haspopup="true"
              aria-label="Plus d'onglets"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMore && (
              <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 rounded-2xl border border-bord bg-surface shadow-e2 py-1 min-w-[220px]">
                {displayOverflow.map(tab => {
                  const isActive = activeTab === tab.key;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => { onTabChange(tab.key); setShowMore(false); }}
                      className={`w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-left text-encre transition-colors hover:bg-surface-2 ${
                        isActive ? 'font-semibold' : ''
                      }`}
                    >
                      {Icon && <Icon size={16} aria-hidden="true" />}
                      <span className="flex-1">{tab.label}</span>
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold leading-none inline-flex items-center justify-center tabular-nums ${
                          tab.alert ? 'bg-danger-fond text-danger-texte' : 'bg-surface-2 text-encre-2'
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
