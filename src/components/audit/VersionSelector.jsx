import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Clock, GitBranch, ArrowLeftRight } from 'lucide-react';

/**
 * VersionSelector — Dropdown to select and view document versions
 *
 * Props:
 *  - snapshots: Array of document_snapshot objects (sorted version DESC)
 *  - currentVersion: number|null — current version label
 *  - onSelectVersion: (snapshot) => void — opens SnapshotViewer
 *  - onCompareVersions: (snapshotA, snapshotB) => void — opens DiffViewer
 *  - isDark, couleur
 */
export default function VersionSelector({
  snapshots = [],
  currentVersion = null,
  onSelectVersion,
  onCompareVersions,
  isDark,
  couleur,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const dropdownBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (snapshots.length === 0) return null;

  const latestVersion = snapshots[0]?.version || 1;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
        }`}
      >
        <GitBranch size={13} />
        V{latestVersion}
        {snapshots.length > 1 && (
          <span className={textMuted}>({snapshots.length})</span>
        )}
        <ChevronDown size={12} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 top-full mt-1 w-72 rounded-xl border shadow-xl z-50 ${dropdownBg} overflow-hidden`}>
          <div className={`px-3 py-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className={`text-xs font-medium ${textMuted}`}>Versions ({snapshots.length})</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {snapshots.map((snap, idx) => {
              const isLatest = idx === 0;
              return (
                <div
                  key={snap.id}
                  className={`px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onSelectVersion(snap);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        Version {snap.version}
                      </span>
                      {isLatest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${couleur}20`, color: couleur }}>
                          Dernière
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${textMuted}`}>
                      {snap.label || snap.trigger}
                    </p>
                    <p className={`text-[10px] ${textMuted}`}>
                      <Clock size={10} className="inline mr-0.5" />
                      {new Date(snap.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Compare button (compare with latest) */}
                  {!isLatest && onCompareVersions && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompareVersions(snap, snapshots[0]);
                        setIsOpen(false);
                      }}
                      className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'
                      }`}
                      title="Comparer avec la dernière version"
                    >
                      <ArrowLeftRight size={14} className={textMuted} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
