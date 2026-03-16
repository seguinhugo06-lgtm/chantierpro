import React from 'react';
import { RotateCcw, X, FileText, Calendar, Tag, Hash } from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { TRIGGER_LABELS } from '../../lib/snapshotService';

/**
 * SnapshotViewer — Display a full document snapshot with restore option
 *
 * Props:
 *  - snapshot: document_snapshot object with .data (full document JSON)
 *  - entityType: 'devis' | 'facture' | etc.
 *  - isDark, couleur, modeDiscret
 *  - onRestore: (snapshot) => void — callback to restore this version
 *  - onClose: () => void
 *  - onCompare: (snapshot) => void — callback to open DiffViewer
 */
export default function SnapshotViewer({
  snapshot,
  entityType = 'devis',
  isDark,
  couleur,
  modeDiscret,
  onRestore,
  onClose,
  onCompare,
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  if (!snapshot) return null;

  const data = snapshot.data || {};
  const lignes = data.lignes || [];
  const totalHt = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
  const fmt = (n) => modeDiscret ? '•••' : formatMoney(n);
  const triggerLabel = TRIGGER_LABELS[snapshot.trigger] || snapshot.trigger;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-5 border-b ${borderColor} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <FileText size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>
                {snapshot.label || `Version ${snapshot.version}`}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {triggerLabel} · {new Date(snapshot.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
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
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Hash size={12} />
              Version {snapshot.version}
            </span>
            {data.numero && (
              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <FileText size={12} />
                {data.numero}
              </span>
            )}
            {data.statut && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: `${couleur}20`, color: couleur }}>
                <Tag size={12} />
                {data.statut}
              </span>
            )}
            {data.client_nom && (
              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {data.client_nom}
              </span>
            )}
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Calendar size={12} />
              {data.date ? new Date(data.date).toLocaleDateString('fr-FR') : '—'}
            </span>
          </div>

          {/* Object */}
          {data.objet && (
            <div>
              <p className={`text-xs font-medium mb-1 ${textMuted}`}>Objet</p>
              <p className={`text-sm ${textPrimary}`}>{data.objet}</p>
            </div>
          )}

          {/* Lines table */}
          {lignes.length > 0 && (
            <div>
              <p className={`text-xs font-medium mb-2 ${textMuted}`}>Lignes ({lignes.length})</p>
              <div className={`rounded-lg border ${borderColor} overflow-hidden overflow-x-auto`}>
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                      <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted}`}>Description</th>
                      <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Qté</th>
                      <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>P.U.</th>
                      <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, idx) => (
                      <tr key={idx} className={`border-t ${borderColor}`}>
                        <td className={`px-3 py-2 ${textPrimary}`}>{l.description}</td>
                        <td className={`px-3 py-2 text-right ${textSecondary}`}>{l.quantite} {l.unite}</td>
                        <td className={`px-3 py-2 text-right ${textSecondary}`}>{fmt(l.prixUnitaire)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${textPrimary}`}>{fmt((l.quantite || 0) * (l.prixUnitaire || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${borderColor}`}>
                      <td colSpan={3} className={`px-3 py-2 text-right font-medium ${textSecondary}`}>Total HT</td>
                      <td className={`px-3 py-2 text-right font-bold ${textPrimary}`}>{fmt(totalHt)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div>
              <p className={`text-xs font-medium mb-1 ${textMuted}`}>Notes</p>
              <p className={`text-sm ${textSecondary} whitespace-pre-wrap`}>{data.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={`p-4 border-t ${borderColor} flex items-center justify-end gap-3 shrink-0`}>
          {onCompare && (
            <button
              onClick={() => onCompare(snapshot)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'} transition-colors`}
            >
              Comparer avec l'actuel
            </button>
          )}
          {onRestore && (
            <button
              onClick={() => onRestore(snapshot)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-colors"
              style={{ background: couleur }}
            >
              <RotateCcw size={14} />
              Restaurer cette version
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
