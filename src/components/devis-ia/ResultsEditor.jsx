import React, { useState } from 'react';
import { Edit3, Trash2, Copy, Plus, Check, X, ChevronDown, ChevronUp, Package, Sparkles, Brain } from 'lucide-react';

/**
 * Tableau éditable des postes générés par l'IA.
 * Colonnes : Désignation | Provenance | Qté | Unité | PU HT | Total HT | Confiance
 */
export default function ResultsEditor({
  lines,
  onUpdateLine,
  onRemoveLine,
  onDuplicateLine,
  onAddLine,
  isDark,
  couleur,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';

  const totalHT = lines.reduce((sum, l) => sum + (l.totalHT || 0), 0);

  const sourceIcon = (source) => {
    switch (source) {
      case 'catalogue': return <Package size={14} className="text-green-500" />;
      case 'memory': return <Brain size={14} className="text-purple-500" />;
      default: return <Sparkles size={14} className="text-orange-500" />;
    }
  };

  const sourceLabel = (source) => {
    switch (source) {
      case 'catalogue': return 'Catalogue';
      case 'memory': return 'Mémoire';
      default: return 'Suggéré';
    }
  };

  const confidenceColor = (c) => {
    if (c >= 85) return 'text-green-500';
    if (c >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const startEdit = (line) => {
    setEditingId(line.id);
    setEditForm({
      designation: line.designation,
      qty: line.qty,
      unit: line.unit,
      puHT: line.puHT,
    });
  };

  const saveEdit = (id) => {
    const totalHT = (parseFloat(editForm.qty) || 0) * (parseFloat(editForm.puHT) || 0);
    onUpdateLine(id, {
      ...editForm,
      qty: parseFloat(editForm.qty) || 0,
      puHT: parseFloat(editForm.puHT) || 0,
      totalHT,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <h3 className="font-semibold flex items-center gap-2">
          <span>{lines.length} poste{lines.length > 1 ? 's' : ''} généré{lines.length > 1 ? 's' : ''}</span>
        </h3>
        <button
          onClick={onAddLine}
          className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1 hover:opacity-90 transition-opacity"
          style={{ background: couleur }}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {/* Desktop table header */}
      <div className={`hidden sm:grid grid-cols-[1fr_90px_60px_50px_80px_80px_70px_60px] gap-2 px-4 py-2 text-xs font-medium ${textMuted} border-b`}
        style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
      >
        <span>Désignation</span>
        <span>Source</span>
        <span className="text-right">Qté</span>
        <span>Unité</span>
        <span className="text-right">PU HT</span>
        <span className="text-right">Total HT</span>
        <span className="text-center">Confiance</span>
        <span />
      </div>

      {/* Lines */}
      <div className="divide-y" style={{ divideColor: isDark ? '#334155' : '#e2e8f0' }}>
        {lines.map((line) => (
          <div key={line.id}>
            {editingId === line.id ? (
              /* Edit mode */
              <div className="p-3 sm:p-4 space-y-3">
                <input
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className={`w-full p-2 rounded-lg border text-sm ${inputBg}`}
                  placeholder="Désignation"
                  autoFocus
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={`text-xs ${textMuted}`}>Quantité</label>
                    <input
                      type="number"
                      value={editForm.qty}
                      onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-sm ${inputBg}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${textMuted}`}>Unité</label>
                    <select
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-sm ${inputBg}`}
                    >
                      <option value="u">u</option>
                      <option value="m²">m²</option>
                      <option value="ml">ml</option>
                      <option value="m³">m³</option>
                      <option value="h">h</option>
                      <option value="j">j</option>
                      <option value="lot">lot</option>
                      <option value="kg">kg</option>
                      <option value="forfait">forfait</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${textMuted}`}>PU HT (€)</label>
                    <input
                      type="number"
                      value={editForm.puHT}
                      onChange={(e) => setEditForm({ ...editForm, puHT: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-sm ${inputBg}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <X size={14} />
                  </button>
                  <button onClick={() => saveEdit(line.id)} className="px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: couleur }}>
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <>
                {/* Desktop row */}
                <div
                  className={`hidden sm:grid grid-cols-[1fr_90px_60px_50px_80px_80px_70px_60px] gap-2 px-4 py-3 items-center text-sm ${rowHover} transition-colors cursor-pointer`}
                  onClick={() => setExpandedId(expandedId === line.id ? null : line.id)}
                >
                  <span className="font-medium truncate">{line.designation}</span>
                  <span className="flex items-center gap-1 text-xs">
                    {sourceIcon(line.source)}
                    {sourceLabel(line.source)}
                  </span>
                  <span className="text-right">{line.qty}</span>
                  <span className={textMuted}>{line.unit}</span>
                  <span className="text-right">{line.puHT?.toFixed(2)} €</span>
                  <span className="text-right font-medium">{line.totalHT?.toFixed(2)} €</span>
                  <span className={`text-center text-xs font-medium ${confidenceColor(line.confidence)}`}>
                    {line.confidence}%
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(line); }} className={`p-1 rounded ${textMuted} hover:opacity-70`}>
                      <Edit3 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveLine(line.id); }} className="p-1 rounded text-red-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{line.designation}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs">
                          {sourceIcon(line.source)}
                          {sourceLabel(line.source)}
                        </span>
                        <span className={`text-xs font-medium ${confidenceColor(line.confidence)}`}>
                          {line.confidence}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === line.id ? null : line.id)}
                      className={`p-1 ${textMuted}`}
                    >
                      {expandedId === line.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={textMuted}>{line.qty} {line.unit} × {line.puHT?.toFixed(2)} €</span>
                    <span className="font-semibold">{line.totalHT?.toFixed(2)} €</span>
                  </div>
                </div>

                {/* Expanded details (notes + actions) */}
                {expandedId === line.id && (
                  <div className={`px-4 pb-3 space-y-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                    {line.notes && (
                      <p className={`text-xs italic ${textMuted}`}>{line.notes}</p>
                    )}
                    {line.catalogueId && (
                      <p className={`text-xs ${textMuted}`}>Réf. catalogue : {line.catalogueId}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(line)}
                        className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                      >
                        <Edit3 size={12} /> Modifier
                      </button>
                      <button
                        onClick={() => onDuplicateLine(line.id)}
                        className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                      >
                        <Copy size={12} /> Dupliquer
                      </button>
                      <button
                        onClick={() => onRemoveLine(line.id)}
                        className="text-xs px-2 py-1 rounded-lg flex items-center gap-1 text-red-500 bg-red-500/10"
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Total footer */}
      <div className="p-4 border-t flex justify-between items-center" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <span className={`text-sm ${textMuted}`}>Total HT</span>
        <span className="text-lg font-bold" style={{ color: couleur }}>
          {totalHT.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}
