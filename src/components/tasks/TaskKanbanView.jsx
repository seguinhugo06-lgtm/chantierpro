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

import React, { useState, useMemo, useCallback } from 'react';
import {
  Circle, Clock, CheckCircle, Plus, GripVertical,
  Calendar, Tag, AlertCircle, ListTodo,
} from 'lucide-react';

// ─── Column definitions ─────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'a_faire', label: 'À faire', color: '#3b82f6', icon: Circle },
  { id: 'en_cours', label: 'En cours', color: '#f59e0b', icon: Clock },
  { id: 'termine', label: 'Terminé', color: '#10b981', icon: CheckCircle },
];

const PRIORITY_COLORS = {
  haute: '#ef4444',
  moyenne: '#f59e0b',
  basse: '#22c55e',
};

const PRIORITY_LABELS = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

const CATEGORY_COLORS = {
  chantier: '#3b82f6',
  administratif: '#8b5cf6',
  achat: '#f97316',
  client: '#ec4899',
  autre: '#6b7280',
};

// ─── KanbanCard ──────────────────────────────────────────────────────────────

function KanbanCard({ memo, chantier, isDark, couleur, onSelect, onDragStart }) {
  const isOverdue = useMemo(() => {
    if (!memo.due_date) return false;
    return new Date(memo.due_date) < new Date() && memo.status !== 'termine';
  }, [memo.due_date, memo.status]);

  const subtaskProgress = useMemo(() => {
    if (!memo.subtasks || memo.subtasks.length === 0) return null;
    const done = memo.subtasks.filter(s => s.done || s.is_done).length;
    return { done, total: memo.subtasks.length };
  }, [memo.subtasks]);

  const priorityColor = PRIORITY_COLORS[memo.priority] || PRIORITY_COLORS.moyenne;
  const categoryColor = CATEGORY_COLORS[memo.category] || CATEGORY_COLORS.autre;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('memoId', memo.id);
        e.dataTransfer.setData('fromStatus', memo.status || 'a_faire');
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(memo.id);
      }}
      onClick={() => onSelect?.(memo.id)}
      className={`group cursor-grab active:cursor-grabbing rounded-lg border p-3 transition-all hover:shadow-md ${
        isDark
          ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
          : 'bg-white border-slate-200 hover:border-slate-300'
      } ${isOverdue ? (isDark ? 'border-red-500/50' : 'border-red-300') : ''}`}
    >
      {/* Header: priority dot + grip */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Priority dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: priorityColor }}
            title={PRIORITY_LABELS[memo.priority] || 'Moyenne'}
          />
          {/* Title */}
          <p className={`text-sm font-medium line-clamp-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {memo.title || memo.text || 'Sans titre'}
          </p>
        </div>
        <GripVertical
          size={14}
          className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
        />
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        {/* Category badge */}
        {memo.category && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: `${categoryColor}15`,
              color: categoryColor,
            }}
          >
            <Tag size={8} />
            {memo.category}
          </span>
        )}

        {/* Due date */}
        {memo.due_date && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isOverdue
                ? 'bg-red-100 text-red-600'
                : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Calendar size={8} />
            {formatDate(memo.due_date)}
          </span>
        )}

        {/* Subtask progress */}
        {subtaskProgress && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <ListTodo size={8} />
            {subtaskProgress.done}/{subtaskProgress.total}
          </span>
        )}
      </div>

      {/* Subtask progress bar */}
      {subtaskProgress && (
        <div className={`mt-2 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(subtaskProgress.done / subtaskProgress.total) * 100}%`,
              background: couleur,
            }}
          />
        </div>
      )}

      {/* Chantier link */}
      {chantier && (
        <p className={`text-xs mt-2 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
          ? `ring-2 ring-offset-1 ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'}`
          : ''
      } ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
      style={isDragOver ? { '--tw-ring-color': column.color } : {}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`px-3 py-3 rounded-t-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/80'}`}>
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-5 rounded-full flex-shrink-0"
            style={{ background: column.color }}
          />
          <Icon size={14} style={{ color: column.color }} />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {column.label}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-500'
          }`}>
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[200px] transition-colors ${
          isDragOver
            ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50')
            : ''
        }`}
      >
        {cards.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
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
            />
          ))
        )}
      </div>

      {/* Add button */}
      <div className={`p-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <button
          onClick={() => onAddMemo?.(column.id)}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            isDark
              ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── Main TaskKanbanView ─────────────────────────────────────────────────────

export default function TaskKanbanView({
  memos = [],
  updateMemo,
  addMemo,
  deleteMemo,
  toggleMemo,
  chantiers = [],
  clients = [],
  isDark,
  couleur,
  filters = {},
  selectedMemoId,
  onSelectMemo,
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
          const aOverdue = a.due_date && new Date(a.due_date) < new Date();
          const bOverdue = b.due_date && new Date(b.due_date) < new Date();
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
    if (!updateMemo) return;
    updateMemo(memoId, {
      status: newStatus,
      is_done: newStatus === 'termine',
    });
    setDragId(null);
  }, [updateMemo]);

  // Handle add memo in specific column
  const handleAddMemo = useCallback((status) => {
    if (!addMemo) return;
    addMemo({
      status,
      is_done: status === 'termine',
    });
  }, [addMemo]);

  // Handle select memo
  const handleSelectMemo = useCallback((memoId) => {
    onSelectMemo?.(memoId);
  }, [onSelectMemo]);

  return (
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
          onDragStart={setDragId}
          onDrop={handleDrop}
          onAddMemo={handleAddMemo}
        />
      ))}
    </div>
  );
}
