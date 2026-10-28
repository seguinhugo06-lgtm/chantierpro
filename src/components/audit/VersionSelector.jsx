import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Clock, GitBranch, ArrowLeftRight } from 'lucide-react';
import { dateLue } from '../../lib/dates';

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
  isDark: _isDark,
  couleur: _couleur,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';
  const dropdownBg = 'bg-surface border-bord';

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
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-surface-2 text-encre-2`}
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
          <div className={`px-3 py-2 border-b border-bord`}>
            <p className={`text-xs font-medium ${textMuted}`}>Versions ({snapshots.length})</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {snapshots.map((snap, idx) => {
              const isLatest = idx === 0;
              return (
                <div
                  key={snap.id}
                  className={`px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-surface-2`}
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
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-accent-texte bg-accent/10">
                          Dernière
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${textMuted}`}>
                      {snap.label || snap.trigger}
                    </p>
                    <p className={`text-[10px] ${textMuted}`}>
                      <Clock size={10} className="inline mr-0.5" />
                      {dateLue(snap.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
                      className={`p-1.5 rounded-lg shrink-0 transition-colors hover:bg-bord`}
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
