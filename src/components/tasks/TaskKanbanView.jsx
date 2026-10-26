/**
 * TaskKanbanView — Vue Kanban pour les tâches (memos)
 *
 * Colonnes : À faire → En cours → Terminé
 * Features :
 *  - Drag-and-drop HTML5 natif entre colonnes
 *  - Cartes avec priorité, catégorie, échéance, sous-tâches
 *  - Filtrage par search/category/priority
 *  - Bouton "+ Ajouter" par colonne
 *  - Responsive mobile (scroll horizontal)
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Circle, Clock, CheckCircle, Plus, GripVertical,
  Calendar, Tag, ListTodo,
} from 'lucide-react';
import TaskDetail from './TaskDetail';
import { CATEGORIES, PRIORITIES, TASK_STATUSES, classesTon } from './constants';
import { jourLocal } from '../../lib/dates';

// ─── Column definitions ─────────────────────────────────────────────────────

const ICONES_COLONNE = { a_faire: Circle, en_cours: Clock, termine: CheckCircle };
const COLUMNS = TASK_STATUSES.map((s) => ({ id: s.value, label: s.label, ton: s.ton, icon: ICONES_COLONNE[s.value] }));

// ─── KanbanCard ──────────────────────────────────────────────────────────────

function KanbanCard({ memo, chantier, onSelect, onDragStart, isTermine }) {
  const isOverdue = useMemo(() => {
    if (!memo.due_date) return false;
    return String(memo.due_date).slice(0, 10) < jourLocal() && memo.status !== 'termine'; // due aujourd'hui : pas en retard
  }, [memo.due_date, memo.status]);

  const subtaskProgress = useMemo(() => {
    if (!memo.subtasks || memo.subtasks.length === 0) return null;
    const done = memo.subtasks.filter(s => s.done || s.is_done).length;
    return { done, total: memo.subtasks.length };
  }, [memo.subtasks]);

  const priorite = PRIORITIES.find(p => p.value === memo.priority) || PRIORITIES.find(p => p.value === 'moyenne');
  const categorie = CATEGORIES.find(c => c.value === memo.category);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => {
        e.dataTransfer.setData('memoId', memo.id);
        e.dataTransfer.setData('fromStatus', memo.status || 'a_faire');
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(memo.id);
      }}
      onClick={() => onSelect?.(memo.id)}
      className={`group ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} rounded-lg border p-3 transition-all hover:shadow-md ${
        isTermine
          ? 'bg-fond border-bord opacity-60'
          : 'bg-surface border-bord hover:border-bord-fort'
      } ${isOverdue ? 'border-danger-point/60' : ''}`}
    >
      {/* Header: priority dot + grip */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Priority dot */}
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${classesTon(priorite.ton).point}`}
            title={`Priorité ${priorite.label.toLowerCase()}`}
          />
          {/* Title */}
          <p className={`text-sm font-medium line-clamp-2 ${isTermine ? 'line-through' : ''} text-encre`}>
            {memo.title || memo.text || 'Sans titre'}
          </p>
        </div>
        {onDragStart && (
          <GripVertical
            size={14}
            className="text-encre-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
          />
        )}
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        {/* Completed badge */}
        {isTermine && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-succes-fond text-succes-texte">
            <CheckCircle size={12} aria-hidden="true" />
            Terminé
          </span>
        )}
        {/* Category badge */}
        {memo.category && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${classesTon(categorie?.ton).pastille}`}>
            <Tag size={12} aria-hidden="true" />
            {categorie?.label || memo.category}
          </span>
        )}

        {/* Due date */}
        {memo.due_date && (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isOverdue
                ? 'bg-danger-fond text-danger-texte'
                : 'bg-surface-2 text-encre-3'
            }`}
          >
            <Calendar size={12} aria-hidden="true" />
            {formatDate(memo.due_date)}
          </span>
        )}

        {/* Subtask progress */}
        {subtaskProgress && (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-surface-2 text-encre-3"
          >
            <ListTodo size={12} aria-hidden="true" />
            {subtaskProgress.done}/{subtaskProgress.total}
          </span>
        )}
      </div>

      {/* Subtask progress bar */}
      {subtaskProgress && (
        <div className={`mt-2 h-1 rounded-full overflow-hidden bg-surface-2`}>
          <div
            className="h-full rounded-full transition-all bg-accent"
            style={{
              width: `${(subtaskProgress.done / subtaskProgress.total) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Chantier link */}
      {chantier && (
        <p className={`text-xs mt-2 truncate text-encre-3`}>
          {chantier.nom || chantier.name || ''}
        </p>
      )}
    </div>
  );
}

// ─── KanbanColumn ────────────────────────────────────────────────────────────

function KanbanColumn({
  column, cards, chantiers, isDark, couleur,
  onSelect, onDragStart, onDrop, onAddMemo,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const Icon = column.icon;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set false if leaving the column (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const memoId = e.dataTransfer.getData('memoId');
    const fromStatus = e.dataTransfer.getData('fromStatus');
    if (memoId && fromStatus !== column.id) {
      onDrop(memoId, column.id);
    }
  };

  return (
    <div
      className={`flex flex-col min-w-[280px] sm:min-w-0 sm:flex-1 snap-center rounded-xl border transition-all ${
        isDragOver
          ? 'ring-2 ring-accent ring-offset-1 ring-offset-fond'
          : ''
      } border-bord`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`px-3 py-3 rounded-t-xl bg-fond/80`}>
        <div className="flex items-center gap-2">
          <div className={`w-1 h-5 rounded-full flex-shrink-0 ${classesTon(column.ton).point}`} />
          <Icon size={14} aria-hidden="true" className={classesTon(column.ton).texte} />
          <span className={`text-sm font-semibold text-encre`}>
            {column.label}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium bg-surface text-encre-3`}>
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[200px] transition-colors ${
          isDragOver
            ? 'bg-fond'
            : ''
        }`}
      >
        {cards.length === 0 ? (
          <div className="text-center py-8 text-xs text-encre-3">
            Aucune tâche
          </div>
        ) : (
          cards.map((memo) => (
            <KanbanCard
              key={memo.id}
              memo={memo}
              chantier={chantiers?.find(c =>
                c.id === memo.chantier_id || c.id === memo.chantierId
              )}
              isDark={isDark}
              couleur={couleur}
              onSelect={onSelect}
              onDragStart={onDragStart}
              isTermine={column.id === 'termine'}
            />
          ))
        )}
      </div>

      {/* Add button : seulement pour qui peut créer des tâches */}
      {onAddMemo && (
        <div className={`p-2 border-t border-bord`}>
          <button
            onClick={() => onAddMemo(column.id)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors text-encre-3 hover:bg-surface-2 hover:text-encre-2`}
          >
            <Plus size={14} />
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main TaskKanbanView ─────────────────────────────────────────────────────

export default function TaskKanbanView({
  memos = [],
  updateMemo,
  addMemo,
  deleteMemo,
  toggleMemo: _toggleMemo,
  chantiers = [],
  clients = [],
  isDark,
  couleur,
  filters = {},
  selectedMemoId,
  onSelectMemo,
  peutCreer = true,
  peutModifier = true,
  peutSupprimer = true,
}) {
  const [dragId, setDragId] = useState(null);

  // Apply filters and group into columns
  const filteredMemos = useMemo(() => {
    let items = [...memos];

    // Search filter
    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase();
      items = items.filter(m => {
        const title = (m.title || m.text || '').toLowerCase();
        const cat = (m.category || '').toLowerCase();
        return title.includes(q) || cat.includes(q);
      });
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      items = items.filter(m => m.category === filters.category);
    }

    // Priority filter
    if (filters.priority && filters.priority !== 'all') {
      items = items.filter(m => m.priority === filters.priority);
    }

    return items;
  }, [memos, filters]);

  // Group by column
  const columnData = useMemo(() => {
    const groups = {};
    for (const col of COLUMNS) {
      groups[col.id] = [];
    }

    for (const memo of filteredMemos) {
      let status = memo.status || 'a_faire';
      // If memo is marked done but status not set, put in termine
      if (memo.is_done && status !== 'termine') {
        status = 'termine';
      }
      // Fallback to a_faire if unknown status
      if (!groups[status]) {
        status = 'a_faire';
      }
      groups[status].push(memo);
    }

    // Sort: overdue first, then by priority, then by date
    const priorityOrder = { haute: 0, moyenne: 1, basse: 2 };
    for (const colId of Object.keys(groups)) {
      groups[colId].sort((a, b) => {
        // Overdue items first (only in non-termine columns)
        if (colId !== 'termine') {
          const aOverdue = a.due_date && String(a.due_date).slice(0, 10) < jourLocal();
          const bOverdue = b.due_date && String(b.due_date).slice(0, 10) < jourLocal();
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
        }
        // Then by priority
        const aPrio = priorityOrder[a.priority] ?? 1;
        const bPrio = priorityOrder[b.priority] ?? 1;
        if (aPrio !== bPrio) return aPrio - bPrio;
        // Then by date (most recent first)
        return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
      });
    }

    return groups;
  }, [filteredMemos]);

  // Handle drop: update memo status
  const handleDrop = useCallback((memoId, newStatus) => {
    if (!updateMemo || !peutModifier) return;
    updateMemo(memoId, {
      status: newStatus,
      is_done: newStatus === 'termine',
      done_at: newStatus === 'termine' ? new Date().toISOString() : null,
    });
    setDragId(null);
  }, [updateMemo, peutModifier]);

  // Handle add memo in specific column
  const handleAddMemo = useCallback((status) => {
    if (!addMemo || !peutCreer) return;
    addMemo({
      status,
      is_done: status === 'termine',
    });
  }, [addMemo, peutCreer]);

  // Handle select memo
  const handleSelectMemo = useCallback((memoId) => {
    onSelectMemo?.(memoId);
  }, [onSelectMemo]);

  const selectedMemo = memos.find(m => m.id === selectedMemoId);

  return (
    <>
      <div
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            cards={columnData[col.id] || []}
            chantiers={chantiers}
            isDark={isDark}
            couleur={couleur}
            onSelect={handleSelectMemo}
            onDragStart={peutModifier ? setDragId : undefined}
            onDrop={handleDrop}
            onAddMemo={peutCreer ? handleAddMemo : undefined}
          />
        ))}
      </div>

      {/* Detail panel */}
      {selectedMemo && (
        <TaskDetail
          memo={selectedMemo}
          onUpdate={updateMemo}
          onDelete={deleteMemo}
          peutModifier={peutModifier}
          peutSupprimer={peutSupprimer}
          onClose={() => onSelectMemo(null)}
          chantiers={chantiers}
          clients={clients}
          couleur={couleur}
          isDark={isDark}
        />
      )}
    </>
  );
}
