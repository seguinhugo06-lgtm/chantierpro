import { Search, X } from 'lucide-react';
import { CATEGORIES, PRIORITIES, TASK_STATUSES } from './constants';

// ════════════════════════════════════════════════════════
// TaskFilters — Search, category, priority, status filters
// ════════════════════════════════════════════════════════
export default function TaskFilters({ filters, onFiltersChange, isDark, couleur }) {
  const { search = '', category = '', priority = '', status = '' } = filters;

  const tc = {
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 text-white placeholder-slate-400 border-slate-600' : 'bg-white text-slate-900 placeholder-slate-400 border-slate-300',
  };

  const update = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActive = search || category || priority || status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${tc.muted}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Rechercher (texte, notes, client, chantier)..."
          className={`w-full pl-8 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
          style={{ '--tw-ring-color': couleur }}
        />
        {search && (
          <button
            onClick={() => update('search', '')}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${tc.muted}`}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => update('category', e.target.value)}
        className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
        style={{ '--tw-ring-color': couleur }}
      >
        <option value="">Catégorie</option>
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        value={priority}
        onChange={(e) => update('priority', e.target.value)}
        className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
        style={{ '--tw-ring-color': couleur }}
      >
        <option value="">Priorité</option>
        {PRIORITIES.map(p => (
          <option key={p.value} value={p.value}>{p.dot} {p.label}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={(e) => update('status', e.target.value)}
        className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
        style={{ '--tw-ring-color': couleur }}
      >
        <option value="">Statut</option>
        {TASK_STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Reset */}
      {hasActive && (
        <button
          onClick={() => onFiltersChange({ search: '', category: '', priority: '', status: '' })}
          className={`text-xs px-2 py-1.5 rounded-lg text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
