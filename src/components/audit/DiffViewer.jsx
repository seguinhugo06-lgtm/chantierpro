import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { FIELD_LABELS } from '../../lib/auditService';

/**
 * DiffViewer — Side-by-side comparison of two document versions
 *
 * Props:
 *  - snapshotA: Older version (left side)
 *  - snapshotB: Newer version (right side)
 *  - entityType: 'devis' | 'facture' | etc.
 *  - isDark, couleur, modeDiscret
 *  - onClose: () => void
 */
export default function DiffViewer({
  snapshotA,
  snapshotB,
  entityType = 'devis',
  isDark,
  couleur,
  modeDiscret,
  onClose,
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  if (!snapshotA || !snapshotB) return null;

  const dataA = snapshotA.data || {};
  const dataB = snapshotB.data || {};
  const fmt = (n) => modeDiscret ? '•••' : formatMoney(n);

  // Fields to compare
  const fieldsToCompare = ['objet', 'statut', 'client_nom', 'notes', 'conditions', 'validite', 'remise_globale'];
  const changedFields = fieldsToCompare.filter(f => {
    return JSON.stringify(dataA[f] ?? null) !== JSON.stringify(dataB[f] ?? null);
  });

  // Lines diff
  const lignesA = dataA.lignes || [];
  const lignesB = dataB.lignes || [];
  const linesDiff = computeLinesDiff(lignesA, lignesB);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-5 border-b ${borderColor} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <h2 className={`font-bold text-lg ${textPrimary}`}>Comparaison</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded-lg ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                V{snapshotA.version}
              </span>
              <ArrowRight size={14} className={textMuted} />
              <span className={`px-2 py-0.5 rounded-lg ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                V{snapshotB.version}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* No changes */}
          {changedFields.length === 0 && linesDiff.length === 0 && (
            <div className="text-center py-8">
              <p className={`text-sm ${textMuted}`}>Aucune différence détectée entre les deux versions.</p>
            </div>
          )}

          {/* Changed fields */}
          {changedFields.length > 0 && (
            <div>
              <p className={`text-xs font-medium mb-3 ${textMuted}`}>Champs modifiés</p>
              <div className={`rounded-lg border ${borderColor} divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {changedFields.map(field => (
                  <div key={field} className="p-3">
                    <p className={`text-xs font-medium mb-1.5 ${textSecondary}`}>{FIELD_LABELS[field] || field}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={`text-sm p-2 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                        <span className={`text-xs ${textMuted} block mb-0.5`}>V{snapshotA.version}</span>
                        <span className={isDark ? 'text-red-300' : 'text-red-700'}>
                          {formatFieldValue(field, dataA[field], modeDiscret)}
                        </span>
                      </div>
                      <div className={`text-sm p-2 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                        <span className={`text-xs ${textMuted} block mb-0.5`}>V{snapshotB.version}</span>
                        <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>
                          {formatFieldValue(field, dataB[field], modeDiscret)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lines diff */}
          {linesDiff.length > 0 && (
            <div>
              <p className={`text-xs font-medium mb-3 ${textMuted}`}>Modifications des lignes</p>
              <div className={`rounded-lg border ${borderColor} overflow-hidden overflow-x-auto`}>
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                      <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted} w-8`}></th>
                      <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted}`}>Description</th>
                      <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Qté</th>
                      <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>P.U.</th>
                      <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linesDiff.map((diff, idx) => {
                      const bgClass = diff.type === 'added'
                        ? (isDark ? 'bg-emerald-900/20' : 'bg-emerald-50')
                        : diff.type === 'removed'
                        ? (isDark ? 'bg-red-900/20' : 'bg-red-50')
                        : (isDark ? 'bg-amber-900/20' : 'bg-amber-50');

                      const textClass = diff.type === 'added'
                        ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
                        : diff.type === 'removed'
                        ? (isDark ? 'text-red-300' : 'text-red-700')
                        : (isDark ? 'text-amber-300' : 'text-amber-700');

                      const symbol = diff.type === 'added' ? '+' : diff.type === 'removed' ? '−' : '~';
                      const ligne = diff.ligne;

                      return (
                        <tr key={idx} className={`border-t ${borderColor} ${bgClass}`}>
                          <td className={`px-3 py-2 font-mono text-xs font-bold ${textClass}`}>{symbol}</td>
                          <td className={`px-3 py-2 ${textClass} ${diff.type === 'removed' ? 'line-through' : ''}`}>{ligne.description}</td>
                          <td className={`px-3 py-2 text-right ${textClass}`}>{ligne.quantite} {ligne.unite}</td>
                          <td className={`px-3 py-2 text-right ${textClass}`}>{fmt(ligne.prixUnitaire)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${textClass}`}>{fmt((ligne.quantite || 0) * (ligne.prixUnitaire || 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals comparison */}
          {(changedFields.length > 0 || linesDiff.length > 0) && (
            <div className={`rounded-lg border ${borderColor} p-4`}>
              <p className={`text-xs font-medium mb-2 ${textMuted}`}>Totaux</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs ${textMuted}`}>V{snapshotA.version}</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>
                    {fmt(lignesA.reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0))} HT
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${textMuted}`}>V{snapshotB.version}</p>
                  <p className="text-lg font-bold" style={{ color: couleur }}>
                    {fmt(lignesB.reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0))} HT
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderColor} flex justify-end shrink-0`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors ${textSecondary}`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function computeLinesDiff(lignesA, lignesB) {
  const diffs = [];

  // Simple approach: match by description, then compare values
  const mapA = new Map();
  lignesA.forEach((l, i) => mapA.set(`${l.description}-${i}`, l));

  const mapB = new Map();
  lignesB.forEach((l, i) => mapB.set(`${l.description}-${i}`, l));

  // Find removed and modified
  lignesA.forEach((lineA, i) => {
    const key = `${lineA.description}-${i}`;
    if (i < lignesB.length) {
      const lineB = lignesB[i];
      if (lineA.description !== lineB.description ||
          lineA.quantite !== lineB.quantite ||
          lineA.prixUnitaire !== lineB.prixUnitaire) {
        if (lineA.description === lineB.description) {
          // Modified — show both
          diffs.push({ type: 'removed', ligne: lineA });
          diffs.push({ type: 'added', ligne: lineB });
        } else {
          diffs.push({ type: 'removed', ligne: lineA });
        }
      }
      // Unchanged — skip
    } else {
      diffs.push({ type: 'removed', ligne: lineA });
    }
  });

  // Find added (lines in B that aren't matched)
  lignesB.forEach((lineB, i) => {
    if (i >= lignesA.length) {
      diffs.push({ type: 'added', ligne: lineB });
    } else {
      const lineA = lignesA[i];
      if (lineA.description !== lineB.description) {
        diffs.push({ type: 'added', ligne: lineB });
      }
    }
  });

  return diffs;
}

function formatFieldValue(field, value, modeDiscret) {
  if (value === null || value === undefined) return '—';
  const moneyFields = ['total_ht', 'total_ttc', 'totalHt', 'totalTtc', 'montant', 'remise_globale', 'remiseGlobale'];
  if (modeDiscret && moneyFields.includes(field)) return '•••';
  if (moneyFields.includes(field)) return formatMoney(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
