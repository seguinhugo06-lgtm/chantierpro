import { Calendar, Tag, Building2, Users, CheckCircle2, Circle, Clock, Repeat, CalendarCheck, Flag, Trash2, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { CATEGORIES, PRIORITIES, TASK_STATUSES, classesTon } from './constants';
import { isOverdue, isToday, formatDateFR, formatTimeFR, today } from './helpers';

// Action rapide d'une ligne : 44 px au doigt (règle du projet), 28 px seulement avec une souris (pointeur précis).
const ACTION_RAPIDE = 'inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded text-encre-2 hover:bg-surface-2 [@media(pointer:fine)]:min-w-[28px] [@media(pointer:fine)]:min-h-[28px]';

// ════════════════════════════════════════════════════════
// TaskItem — Single task row with quick actions + status badge
// ════════════════════════════════════════════════════════
export default function TaskItem({
  memo, onToggle, onSelect, isSelected, chantiers, clients, equipe, couleur: _couleur, isDark: _isDark,
  onQuickDate, onQuickPriority, onQuickDelete, setPage,
  selectionMode, isMultiSelected, onMultiSelect,
}) {
  const chantier = memo.chantier_id ? chantiers.find(c => c.id === memo.chantier_id) : null;
  const client = memo.client_id ? clients.find(c => c.id === memo.client_id) : null;
  const assignedMember = memo.assigned_to ? (equipe || []).find(m => m.id === memo.assigned_to) : null;
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
    ? 'text-danger-texte font-semibold'
    : isToday(memo)
      ? 'text-alerte-texte'
      : 'text-encre-3';

  return (
    <div
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-surface-2 ring-1 ring-bord'
          : 'hover:bg-surface-2'
      } ${memo.is_done ? 'opacity-60' : ''}`}
      onClick={() => selectionMode ? onMultiSelect(memo.id) : onSelect(memo.id)}
    >
      {/* Checkbox or selection checkbox */}
      {selectionMode ? (
        <button
          onClick={(e) => { e.stopPropagation(); onMultiSelect(memo.id); }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isMultiSelected
              ? 'border-accent bg-accent text-sur-accent'
              : 'border-bord-fort'
          }`}
        >
          {isMultiSelected && <CheckCircle2 size={12} />}
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.(memo.id); }}
          disabled={!onToggle}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] [@media(pointer:fine)]:min-w-[28px] [@media(pointer:fine)]:min-h-[28px] flex items-center justify-center -m-2 [@media(pointer:fine)]:-m-0.5 disabled:cursor-default"
          aria-label={memo.is_done ? 'Marquer comme non fait' : 'Marquer comme fait'}
        >
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            memo.is_done
              ? 'border-succes-texte bg-succes-texte text-white'
              : 'border-bord-fort hover:border-encre-3'
          }`}>
            {memo.is_done && <CheckCircle2 size={12} />}
          </span>
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm leading-snug flex-1 ${memo.is_done ? 'line-through' : ''} text-encre`}>
            {priority && priority.ton !== 'neutre' && (
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${classesTon(priority.ton).point}`} title={`Priorité ${priority.label.toLowerCase()}`} />
            )}
            {memo.recurrence && (
              <span className="mr-1 inline-flex items-center" title="Récurrent">
                <Repeat size={12} className="text-accent-texte" />
              </span>
            )}
            {memo.text}
          </p>
          {/* Status badge — visible for ALL statuses */}
          {status && status.value !== 'a_faire' && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${classesTon(status.ton).pastille}`}>
              <StatusIcon size={12} aria-hidden="true" />
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
              })() : (
                <>
                  {formatDateFR(memo.due_date)}
                  {memo.due_date_end && memo.due_date_end >= memo.due_date && (
                    <span className="inline-flex items-center gap-1"><ArrowRight size={10} aria-hidden="true" /> {formatDateFR(memo.due_date_end)}</span>
                  )}
                </>
              )}
              {memo.due_time && !isOverdue(memo) && !memo.due_date_end && <span>à {formatTimeFR(memo.due_time)}</span>}
            </span>
          )}
          {category && (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${classesTon(category.ton).pastille}`}>
              <Tag size={10} aria-hidden="true" />
              {category.label}
            </span>
          )}
          {chantier && (
            <span
              className={`inline-flex items-center gap-1 text-xs hover:underline cursor-pointer max-w-[180px] truncate text-encre-3`}
              onClick={(e) => { e.stopPropagation(); setPage?.('chantiers'); }}
              title={chantier.nom}
            >
              <Building2 size={10} className="shrink-0" />
              <span className="truncate">{chantier.nom}</span>
            </span>
          )}
          {client && (
            <span
              className={`inline-flex items-center gap-1 text-xs hover:underline cursor-pointer text-encre-3`}
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
                  ? 'bg-succes-fond text-succes-texte'
                  : 'bg-surface-2 text-encre-2'
              }`}
            >
              {stDone === stTotal ? <CheckSquare size={12} aria-hidden="true" /> : <Square size={12} aria-hidden="true" />} {stDone}/{stTotal}
            </span>
          )}
          {assignedMember && (
            <span
              className="w-6 h-6 rounded-full bg-neutre-fond text-neutre-texte text-xs font-semibold flex items-center justify-center flex-shrink-0"
              title={`${assignedMember.prenom} ${assignedMember.nom}`}
            >
              {assignedMember.prenom?.[0]}{assignedMember.nom?.[0]}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions (hover) -- hidden on mobile */}
      {!selectionMode && (onQuickDate || onQuickPriority || onQuickDelete) && (
        <div className="hidden sm:flex opacity-0 group-hover:opacity-100 items-center gap-0.5 flex-shrink-0 transition-opacity">
          {onQuickDate && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickDate(memo.id); }}
              className={ACTION_RAPIDE}
              title="Mettre à aujourd'hui"
              aria-label="Mettre à aujourd'hui"
            ><CalendarCheck size={16} aria-hidden="true" /></button>
          )}
          {onQuickPriority && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickPriority(memo.id); }}
              className={ACTION_RAPIDE}
              title="Priorité haute"
              aria-label="Priorité haute"
            ><Flag size={16} aria-hidden="true" /></button>
          )}
          {onQuickDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickDelete(memo.id); }}
              className={ACTION_RAPIDE}
              title="Supprimer"
              aria-label="Supprimer"
            ><Trash2 size={16} aria-hidden="true" /></button>
          )}
        </div>
      )}
    </div>
  );
}
