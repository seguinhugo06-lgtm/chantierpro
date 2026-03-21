import { Calendar, Tag, Building2, Users, CheckCircle2, Circle, Clock } from 'lucide-react';
import { CATEGORIES, PRIORITIES, TASK_STATUSES } from './constants';
import { isOverdue, isToday, formatDateFR, formatTimeFR, today } from './helpers';

// ════════════════════════════════════════════════════════
// TaskItem — Single task row with quick actions + status badge
// ════════════════════════════════════════════════════════
export default function TaskItem({
  memo, onToggle, onSelect, isSelected, chantiers, clients, couleur, isDark,
  onQuickDate, onQuickPriority, onQuickDelete, setPage,
  selectionMode, isMultiSelected, onMultiSelect,
}) {
  const chantier = memo.chantier_id ? chantiers.find(c => c.id === memo.chantier_id) : null;
  const client = memo.client_id ? clients.find(c => c.id === memo.client_id) : null;
  const priority = PRIORITIES.find(p => p.value === memo.priority);
  const category = CATEGORIES.find(c => c.value === memo.category);
  const subtasks = memo.subtasks || [];
  const stDone = subtasks.filter(s => s.done).length;
  const stTotal = subtasks.length;

  // Status badge
  const status = memo.is_done
    ? TASK_STATUSES.find(s => s.value === 'termine')
    : TASK_STATUSES.find(s => s.value === (memo.status || 'a_faire'));
  const StatusIcon = status?.value === 'termine' ? CheckCircle2 : status?.value === 'en_cours' ? Clock : Circle;

  const dateColor = isOverdue(memo)
    ? 'text-red-500'
    : isToday(memo)
      ? 'text-amber-500'
      : isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? isDark ? 'bg-slate-700 ring-1 ring-slate-600' : 'bg-slate-100 ring-1 ring-slate-200'
          : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
      } ${memo.is_done ? 'opacity-60' : ''}`}
      onClick={() => selectionMode ? onMultiSelect(memo.id) : onSelect(memo.id)}
    >
      {/* Checkbox or selection checkbox */}
      {selectionMode ? (
        <button
          onClick={(e) => { e.stopPropagation(); onMultiSelect(memo.id); }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isMultiSelected
              ? 'border-blue-500 bg-blue-500 text-white'
              : isDark ? 'border-slate-500' : 'border-slate-300'
          }`}
        >
          {isMultiSelected && <CheckCircle2 size={12} />}
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(memo.id); }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            memo.is_done
              ? 'border-green-500 bg-green-500 text-white'
              : isDark ? 'border-slate-500 hover:border-slate-400' : 'border-slate-300 hover:border-slate-400'
          }`}
          aria-label={memo.is_done ? 'Marquer comme non fait' : 'Marquer comme fait'}
        >
          {memo.is_done && <CheckCircle2 size={12} />}
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm leading-snug flex-1 ${memo.is_done ? 'line-through' : ''} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {priority && <span className="mr-1.5" title={`Priorité ${priority.label}`}>{priority.dot}</span>}
            {memo.recurrence && <span className="mr-1" title="Récurrent">🔄</span>}
            {memo.text}
          </p>
          {/* Status badge */}
          {status && !memo.is_done && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: status.color + '18', color: status.color }}
            >
              <StatusIcon size={10} />
              {status.label}
            </span>
          )}
        </div>
        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {memo.due_date && (
            <span className={`inline-flex items-center gap-1 text-xs ${dateColor}`}>
              <Calendar size={10} />
              {isOverdue(memo) ? (() => {
                const diffDays = Math.ceil((new Date(today() + 'T00:00:00') - new Date(memo.due_date + 'T00:00:00')) / 86400000);
                return `En retard de ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
              })() : formatDateFR(memo.due_date)}
              {memo.due_time && !isOverdue(memo) && <span>à {formatTimeFR(memo.due_time)}</span>}
            </span>
          )}
          {category && (
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: category.color + '18', color: category.color }}
            >
              <Tag size={9} />
              {category.label}
            </span>
          )}
          {chantier && (
            <span
              className={`inline-flex items-center gap-1 text-xs hover:underline cursor-pointer max-w-[180px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              onClick={(e) => { e.stopPropagation(); setPage?.('chantiers'); }}
              title={chantier.nom}
            >
              <Building2 size={10} className="shrink-0" />
              <span className="truncate">{chantier.nom}</span>
            </span>
          )}
          {client && (
            <span
              className={`inline-flex items-center gap-1 text-xs hover:underline cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              onClick={(e) => { e.stopPropagation(); setPage?.('clients'); }}
              title={client.nom}
            >
              <Users size={10} />
              {client.nom || ''}
            </span>
          )}
          {stTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${
                stDone === stTotal
                  ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stDone === stTotal ? '☑' : '◻'} {stDone}/{stTotal}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions (hover) -- hidden on mobile */}
      {!selectionMode && (
        <div className="hidden sm:flex opacity-0 group-hover:opacity-100 items-center gap-0.5 flex-shrink-0 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickDate(memo.id); }}
            className={`p-1 rounded text-xs ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Mettre à aujourd'hui"
          >📅</button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickPriority(memo.id); }}
            className={`p-1 rounded text-xs ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Priorité haute"
          >🔴</button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickDelete(memo.id); }}
            className={`p-1 rounded text-xs ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Supprimer"
          >🗑️</button>
        </div>
      )}
    </div>
  );
}
