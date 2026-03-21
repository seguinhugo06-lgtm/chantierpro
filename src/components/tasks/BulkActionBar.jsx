import { useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, PRIORITIES } from './constants';
import { today } from './helpers';

// ════════════════════════════════════════════════════════
// BulkActionBar — Floating bar for multi-selection
// ════════════════════════════════════════════════════════
export default function BulkActionBar({ count, onDate, onCategory, onPriority, onComplete, onDelete, onCancel, isDark, couleur }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-xl z-40">
      <span className="text-sm font-medium">{count} sélectionné{count > 1 ? 's' : ''}</span>
      <div className="w-px h-5 bg-gray-600" />

      {/* Date */}
      <div className="relative">
        <button onClick={() => setShowDatePicker(!showDatePicker)} className="text-sm hover:text-amber-300 transition-colors" title="Date">📅</button>
        {showDatePicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg p-2 shadow-lg min-w-[120px]">
            <button onClick={() => { onDate(today()); setShowDatePicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">Aujourd'hui</button>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); onDate(d.toISOString().split('T')[0]); setShowDatePicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">Demain</button>
            <button onClick={() => { onDate(''); setShowDatePicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700 text-red-400">Retirer date</button>
          </div>
        )}
      </div>

      {/* Category */}
      <div className="relative">
        <button onClick={() => setShowCategoryPicker(!showCategoryPicker)} className="text-sm hover:text-purple-300 transition-colors" title="Catégorie">🏷️</button>
        {showCategoryPicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg p-2 shadow-lg min-w-[120px]">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => { onCategory(c.value); setShowCategoryPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">{c.label}</button>
            ))}
            <button onClick={() => { onCategory(''); setShowCategoryPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700 text-red-400">Aucune</button>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="relative">
        <button onClick={() => setShowPriorityPicker(!showPriorityPicker)} className="text-sm hover:text-yellow-300 transition-colors" title="Priorité">⚡</button>
        {showPriorityPicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg p-2 shadow-lg min-w-[120px]">
            {PRIORITIES.map(p => (
              <button key={p.value} onClick={() => { onPriority(p.value); setShowPriorityPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">{p.dot} {p.label}</button>
            ))}
            <button onClick={() => { onPriority(''); setShowPriorityPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700 text-red-400">Aucune</button>
          </div>
        )}
      </div>

      <button onClick={onComplete} className="text-sm hover:text-green-300 transition-colors" title="Terminer">✅</button>
      <button onClick={onDelete} className="text-sm text-red-400 hover:text-red-300 transition-colors" title="Supprimer">🗑️</button>
      <div className="w-px h-5 bg-gray-600" />
      <button onClick={onCancel} className="text-sm hover:text-gray-300 transition-colors"><X size={14} /></button>
    </div>
  );
}
