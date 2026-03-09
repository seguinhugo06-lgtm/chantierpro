import React from 'react';
import {
  Plus, Trash2, RefreshCw, ArrowRight, AlertCircle,
} from 'lucide-react';

const fmtCurrency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const UNITES = ['u', 'm²', 'ml', 'm³', 'h', 'forfait', 'jour', 'kg', 'L', 'lot', 'ensemble'];

/**
 * IAResultsStep — Step 3: Editable analysis results
 */
export default function IAResultsStep({
  analyseResult,
  editableLines,
  updateLine,
  addLine,
  removeLine,
  undoLine,
  onUndo,
  onRefresh,
  onContinue,
  isDark = false,
  couleur = '#f97316',
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  const editableTotalHT = editableLines.reduce((s, l) => s + (l.quantite * l.prixUnitaire || 0), 0);

  return (
    <div>
      {/* Summary banner */}
      <div className={`rounded-xl border p-4 mb-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${textPrimary}`}>{analyseResult.description}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            analyseResult.confiance >= 80 ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700' :
            analyseResult.confiance >= 60 ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700' :
            isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
          }`}>
            {analyseResult.confiance >= 80 ? '🟢' : analyseResult.confiance >= 60 ? '🟡' : '🔴'} {analyseResult.confiance}% fiabilité
          </span>
        </div>

        {/* Confidence breakdown */}
        <div className={`text-xs rounded-lg p-2.5 mb-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <p className={`font-medium mb-1.5 ${textMuted}`}>
            {analyseResult.confiance >= 80
              ? '✅ Estimation fiable — description suffisamment détaillée'
              : analyseResult.confiance >= 60
                ? '⚠️ Estimation approximative — ajustez les montants'
                : '🔍 Estimation large — vérifiez chaque ligne'}
          </p>
          {analyseResult.confianceFactors && (
            <div className="flex flex-wrap gap-1.5">
              {analyseResult.confianceFactors.map((f, i) => (
                <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  f.points >= 15
                    ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    : f.points >= 10
                      ? isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'
                      : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  {f.points >= 15 ? '✓' : f.points >= 10 ? '~' : '?'} {f.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {analyseResult.notes && (
          <p className={`text-xs ${textMuted}`}>
            💡 {analyseResult.notes === 'Estimation locale (IA non configurée)'
              ? 'Estimation basée sur les prix moyens du marché. Ajustez selon vos tarifs.'
              : analyseResult.notes}
          </p>
        )}
      </div>

      {/* Editable lines */}
      <div className="space-y-2 mb-4">
        {editableLines.map((line, idx) => (
          <div key={line.id} className={`rounded-xl border p-3 ${cardBg} group`}>
            {/* Row 1: Number + Designation + delete */}
            <div className="flex items-start gap-2 mb-2">
              <span className={`text-[11px] font-bold mt-0.5 w-5 text-center shrink-0 ${textMuted}`}>
                {idx + 1}.
              </span>
              <input
                type="text"
                value={line.designation}
                onChange={e => updateLine(idx, 'designation', e.target.value)}
                className={`flex-1 bg-transparent text-sm font-medium ${textPrimary} outline-none`}
                placeholder="Poste..."
              />
              <button
                onClick={() => removeLine(idx)}
                className="p-1 text-red-400 hover:text-red-600 rounded shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {/* Row 2: Qté × Unité × P.U. = Total */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pl-7">
              <input
                type="number"
                value={line.quantite}
                onChange={e => updateLine(idx, 'quantite', parseFloat(e.target.value) || 0)}
                className={`w-14 text-center rounded-lg px-1 py-1 text-xs sm:text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textPrimary} outline-none`}
                min="0"
                step="0.1"
              />
              <select
                value={line.unite}
                onChange={e => updateLine(idx, 'unite', e.target.value)}
                className={`rounded-lg px-1 py-1 text-[11px] sm:text-xs ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textPrimary} outline-none`}
              >
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <span className={`text-[10px] sm:text-xs ${textMuted}`}>×</span>
              <input
                type="number"
                value={line.prixUnitaire}
                onChange={e => updateLine(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                className={`w-16 sm:w-20 text-right rounded-lg px-1 sm:px-2 py-1 text-xs sm:text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textPrimary} outline-none`}
                min="0"
                step="0.01"
              />
              <span className={`ml-auto text-xs sm:text-sm font-semibold whitespace-nowrap ${textPrimary}`}>
                {fmtCurrency.format(line.quantite * line.prixUnitaire)}
              </span>
            </div>
          </div>
        ))}

        {/* Add line */}
        <button
          onClick={addLine}
          className={`w-full rounded-xl border border-dashed px-3 py-3 text-xs font-medium flex items-center justify-center gap-1 ${
            isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Plus size={14} />
          Ajouter un poste
        </button>

        {/* Undo banner */}
        {undoLine && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
            isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-800'
          }`}>
            <span>Ligne supprimée</span>
            <button onClick={onUndo} className="font-semibold underline" style={{ color: couleur }}>
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Total */}
      <div className={`rounded-xl border p-4 mb-6 ${cardBg}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${textPrimary}`}>Total HT</span>
          <span className="text-xl font-bold" style={{ color: couleur }}>
            {fmtCurrency.format(editableTotalHT)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <RefreshCw size={14} />
          Refaire
        </button>
        <button
          onClick={onContinue}
          disabled={editableLines.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-40"
          style={{ backgroundColor: couleur }}
        >
          Continuer
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
