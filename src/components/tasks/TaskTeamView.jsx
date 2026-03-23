/**
 * TaskTeamView — Dispatch board par membre d'equipe
 *
 * Affiche le planning des taches par membre, semaine ou jour.
 * Features :
 *  - Grille membres x jours (semaine) ou liste (jour)
 *  - Indicateurs de charge (heures planifiees / capacite)
 *  - Drag & drop pour reassigner ou replanifier
 *  - Responsive : accordeon sur mobile
 *  - Section "Non assigne" pour les taches orphelines
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Tag, Calendar, User, Users, UserX,
} from 'lucide-react';
import { CATEGORIES, PRIORITIES } from './constants';
import TaskDetail from './TaskDetail';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = ['jan.', 'fev.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function formatShortDate(d) {
  return `${DAYS_FR[d.getDay()]} ${d.getDate()}`;
}

function formatWeekRange(monday) {
  const friday = addDays(monday, 4);
  const mDay = monday.getDate();
  const fDay = friday.getDate();
  const mMonth = MONTHS_FR[monday.getMonth()];
  const fMonth = MONTHS_FR[friday.getMonth()];
  const year = monday.getFullYear();
  if (mMonth === fMonth) {
    return `${DAYS_FR[monday.getDay()]} ${mDay} - ${DAYS_FR[friday.getDay()]} ${fDay} ${mMonth} ${year}`;
  }
  return `${mDay} ${mMonth} - ${fDay} ${fMonth} ${year}`;
}

const PRIORITY_COLORS = {
  haute: '#ef4444',
  moyenne: '#f59e0b',
  basse: '#22c55e',
};

const CATEGORY_COLORS = {
  rappel: '#3b82f6',
  achat: '#f59e0b',
  rdv: '#8b5cf6',
  admin: '#6366f1',
  idee: '#22c55e',
  urgent: '#ef4444',
  chantier: '#3b82f6',
  administratif: '#8b5cf6',
  client: '#ec4899',
  autre: '#6b7280',
};

const DEFAULT_CAPACITY = 8; // heures/jour

// ─── MiniTaskCard ────────────────────────────────────────────────────────────

function MiniTaskCard({ memo, isDark, couleur, onSelect, onDragStart }) {
  const priorityColor = PRIORITY_COLORS[memo.priority] || PRIORITY_COLORS.moyenne;
  const category = CATEGORIES.find(c => c.value === memo.category);
  const categoryColor = category?.color || CATEGORY_COLORS[memo.category] || CATEGORY_COLORS.autre;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('memoId', memo.id);
        e.dataTransfer.setData('sourceAssignee', memo.assignedTo || memo.employe_id || '');
        e.dataTransfer.setData('sourceDate', memo.due_date || '');
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(memo.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(memo.id);
      }}
      className={`group cursor-grab active:cursor-grabbing rounded-md border px-2 py-1.5 text-xs transition-all hover:shadow-sm mb-1 ${
        isDark
          ? 'bg-slate-700/80 border-slate-600 hover:border-slate-500'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: priorityColor }}
        />
        <span className={`truncate font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {memo.title || memo.text || 'Sans titre'}
        </span>
      </div>
      {memo.category && (
        <span
          className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0 rounded mt-0.5"
          style={{ background: `${categoryColor}15`, color: categoryColor }}
        >
          <Tag size={7} />
          {category?.label || memo.category}
        </span>
      )}
    </div>
  );
}

// ─── LoadIndicator ───────────────────────────────────────────────────────────

function LoadIndicator({ hours, capacity, isDark }) {
  const pct = capacity > 0 ? (hours / capacity) * 100 : 0;
  const color = pct > 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
  const dot = pct > 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: dot }}
      />
      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {hours}h / {capacity}h
      </span>
    </div>
  );
}

// ─── DayCell ─────────────────────────────────────────────────────────────────

function DayCell({ memos, dateStr, isToday, isDark, couleur, onSelect, onDragStart, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const memoId = e.dataTransfer.getData('memoId');
    const sourceAssignee = e.dataTransfer.getData('sourceAssignee');
    const sourceDate = e.dataTransfer.getData('sourceDate');
    if (memoId) {
      onDrop?.(memoId, dateStr, sourceAssignee, sourceDate);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-[60px] p-1 border-r last:border-r-0 transition-colors ${
        isDragOver
          ? isDark ? 'bg-slate-700/50' : 'bg-blue-50/50'
          : isToday
            ? isDark ? 'bg-slate-700/30' : 'bg-orange-50/30'
            : ''
      } ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
    >
      {memos.map(memo => (
        <MiniTaskCard
          key={memo.id}
          memo={memo}
          isDark={isDark}
          couleur={couleur}
          onSelect={onSelect}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}

// ─── MemberRow (Desktop) ────────────────────────────────────────────────────

function MemberRow({ membre, weekDays, memosByDay, totalHours, isDark, couleur, onSelect, onDragStart, onDropToCell }) {
  const todayStr = toDateStr(new Date());
  const displayName = membre
    ? `${membre.prenom || ''} ${(membre.nom || '').charAt(0)}.`.trim()
    : 'Non assigne';

  const weekCapacity = weekDays.length * DEFAULT_CAPACITY;

  return (
    <div className={`grid border-b last:border-b-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
      style={{ gridTemplateColumns: `160px repeat(${weekDays.length}, 1fr)` }}
    >
      {/* Member info column */}
      <div className={`p-2 flex flex-col justify-center border-r ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'}`}>
        <div className="flex items-center gap-2">
          {membre ? (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: couleur }}
            >
              {(membre.prenom || '?')[0]}{(membre.nom || '?')[0]}
            </div>
          ) : (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-500'}`}>
              <UserX size={14} />
            </div>
          )}
          <div className="min-w-0">
            <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {displayName}
            </p>
            {membre?.role && (
              <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {membre.role}
              </p>
            )}
            <LoadIndicator hours={totalHours} capacity={weekCapacity} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Day cells */}
      {weekDays.map(day => {
        const dateStr = toDateStr(day);
        return (
          <DayCell
            key={dateStr}
            memos={memosByDay[dateStr] || []}
            dateStr={dateStr}
            isToday={dateStr === todayStr}
            isDark={isDark}
            couleur={couleur}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDrop={(memoId, newDate, srcAssignee, srcDate) => {
              onDropToCell(memoId, membre?.id || null, newDate);
            }}
          />
        );
      })}
    </div>
  );
}

// ─── MemberAccordion (Mobile) ───────────────────────────────────────────────

function MemberAccordion({ membre, weekDays, memosByDay, totalHours, isDark, couleur, onSelect, onDragStart, onDropToCell }) {
  const [open, setOpen] = useState(false);
  const todayStr = toDateStr(new Date());
  const displayName = membre
    ? `${membre.prenom || ''} ${(membre.nom || '').charAt(0)}.`.trim()
    : 'Non assigne';

  const allMemos = weekDays.flatMap(d => memosByDay[toDateStr(d)] || []);
  const weekCapacity = weekDays.length * DEFAULT_CAPACITY;

  return (
    <div className={`border rounded-xl mb-2 overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          isDark ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-slate-50'
        }`}
      >
        {membre ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: couleur }}
          >
            {(membre.prenom || '?')[0]}{(membre.nom || '?')[0]}
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-500'}`}>
            <UserX size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {displayName}
          </p>
          <div className="flex items-center gap-2">
            <LoadIndicator hours={totalHours} capacity={weekCapacity} isDark={isDark} />
            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {allMemos.length} tache{allMemos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {open ? <ChevronUp size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} /> : <ChevronDown size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />}
      </button>

      {open && (
        <div className={`p-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
          {weekDays.map(day => {
            const dateStr = toDateStr(day);
            const dayMemos = memosByDay[dateStr] || [];
            if (dayMemos.length === 0) return null;
            return (
              <div key={dateStr} className="mb-2">
                <p className={`text-[10px] font-semibold uppercase tracking-wide px-1 mb-1 ${
                  dateStr === todayStr
                    ? 'text-orange-500'
                    : isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {formatShortDate(day)} {day.getDate() < 10 ? '0' : ''}{MONTHS_FR[day.getMonth()]}
                </p>
                {dayMemos.map(memo => (
                  <MiniTaskCard
                    key={memo.id}
                    memo={memo}
                    isDark={isDark}
                    couleur={couleur}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            );
          })}
          {allMemos.length === 0 && (
            <p className={`text-xs text-center py-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Aucune tache cette semaine
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main TaskTeamView
// ═════════════════════════════════════════════════════════════════════════════

export default function TaskTeamView({
  memos = [],
  updateMemo,
  equipe = [],
  isDark,
  couleur = '#f97316',
  filters = {},
  onSelectMemo,
  chantiers = [],
  clients = [],
  deleteMemo,
  selectedMemoId,
}) {
  const [currentDate, setCurrentDate] = useState(() => getMonday(new Date()));
  const [rangeMode, setRangeMode] = useState('week'); // 'week' | 'day'
  const [dragId, setDragId] = useState(null);

  // Build day array
  const weekDays = useMemo(() => {
    if (rangeMode === 'day') {
      return [new Date(currentDate)];
    }
    return Array.from({ length: 5 }, (_, i) => addDays(currentDate, i));
  }, [currentDate, rangeMode]);

  // Navigation
  const goBack = () => {
    setCurrentDate(prev => addDays(prev, rangeMode === 'day' ? -1 : -7));
  };
  const goForward = () => {
    setCurrentDate(prev => addDays(prev, rangeMode === 'day' ? 1 : 7));
  };
  const goToday = () => {
    setCurrentDate(rangeMode === 'day' ? new Date() : getMonday(new Date()));
  };

  // Filter memos
  const filteredMemos = useMemo(() => {
    let items = memos.filter(m => !m.is_done);

    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase();
      items = items.filter(m => {
        const title = (m.title || m.text || '').toLowerCase();
        const cat = (m.category || '').toLowerCase();
        return title.includes(q) || cat.includes(q);
      });
    }
    if (filters.category && filters.category !== 'all') {
      items = items.filter(m => m.category === filters.category);
    }
    if (filters.priority && filters.priority !== 'all') {
      items = items.filter(m => m.priority === filters.priority);
    }

    return items;
  }, [memos, filters]);

  // Group memos by assignee and day
  const { memberData, unassignedData } = useMemo(() => {
    const dateSet = new Set(weekDays.map(d => toDateStr(d)));

    // Build per-member + per-day map
    const memberMap = {};
    equipe.forEach(m => {
      memberMap[m.id] = {};
      weekDays.forEach(d => {
        memberMap[m.id][toDateStr(d)] = [];
      });
    });

    const unassignedMap = {};
    weekDays.forEach(d => {
      unassignedMap[toDateStr(d)] = [];
    });

    filteredMemos.forEach(memo => {
      const assignee = memo.assignedTo || memo.employe_id || null;
      const dateStr = memo.due_date || '';
      if (!dateSet.has(dateStr)) return; // not in current range

      if (assignee && memberMap[assignee]) {
        memberMap[assignee][dateStr].push(memo);
      } else if (!assignee) {
        if (unassignedMap[dateStr]) {
          unassignedMap[dateStr].push(memo);
        }
      } else {
        // Assigned to someone not in equipe — treat as unassigned
        if (unassignedMap[dateStr]) {
          unassignedMap[dateStr].push(memo);
        }
      }
    });

    // Compute hours per member
    const memberDataArr = equipe.map(membre => {
      const memosByDay = memberMap[membre.id];
      let totalHours = 0;
      Object.values(memosByDay).forEach(dayMemos => {
        dayMemos.forEach(memo => {
          totalHours += memo.estimated_hours || memo.estimatedHours || 1;
        });
      });
      return { membre, memosByDay, totalHours };
    });

    let unassignedHours = 0;
    Object.values(unassignedMap).forEach(dayMemos => {
      dayMemos.forEach(memo => {
        unassignedHours += memo.estimated_hours || memo.estimatedHours || 1;
      });
    });

    return {
      memberData: memberDataArr,
      unassignedData: { memosByDay: unassignedMap, totalHours: unassignedHours },
    };
  }, [equipe, filteredMemos, weekDays]);

  // Has any unassigned tasks?
  const hasUnassigned = Object.values(unassignedData.memosByDay).some(arr => arr.length > 0);

  // Handle drop on cell — reassign + redate
  const handleDropToCell = useCallback((memoId, newAssigneeId, newDate) => {
    if (!updateMemo) return;
    const updates = {};
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;

    const currentAssignee = memo.assignedTo || memo.employe_id || null;
    if (newAssigneeId !== currentAssignee) {
      updates.assignedTo = newAssigneeId;
      updates.employe_id = newAssigneeId;
    }
    if (newDate && newDate !== memo.due_date) {
      updates.due_date = newDate;
    }
    if (Object.keys(updates).length > 0) {
      updateMemo(memoId, updates);
    }
    setDragId(null);
  }, [updateMemo, memos]);

  const selectedMemo = memos.find(m => m.id === selectedMemoId);
  const todayStr = toDateStr(new Date());

  const headerBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const headerText = isDark ? 'text-slate-200' : 'text-slate-800';

  return (
    <>
      {/* Navigation header */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 mb-3 p-3 rounded-xl border ${headerBg}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            aria-label="Precedent"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToday}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={goForward}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            aria-label="Suivant"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <h2 className={`text-sm sm:text-base font-semibold ${headerText}`}>
          {rangeMode === 'day'
            ? `${DAYS_FR[currentDate.getDay()]} ${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            : formatWeekRange(currentDate)
          }
        </h2>

        <div className={`flex rounded-lg border p-0.5 ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
          {[
            { id: 'day', label: 'Jour' },
            { id: 'week', label: 'Semaine' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => {
                setRangeMode(m.id);
                if (m.id === 'week') {
                  setCurrentDate(getMonday(currentDate));
                }
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                rangeMode === m.id
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={rangeMode === m.id ? { background: couleur } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop grid view (hidden on mobile) */}
      <div className={`hidden sm:block rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {/* Column headers */}
        <div
          className={`grid border-b ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}
          style={{ gridTemplateColumns: `160px repeat(${weekDays.length}, 1fr)` }}
        >
          <div className={`p-2 flex items-center gap-1.5 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <Users size={14} style={{ color: couleur }} />
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Membre</span>
          </div>
          {weekDays.map(day => {
            const dateStr = toDateStr(day);
            const isTodayCol = dateStr === todayStr;
            return (
              <div
                key={dateStr}
                className={`p-2 text-center border-r last:border-r-0 ${isDark ? 'border-slate-700' : 'border-slate-200'} ${
                  isTodayCol ? (isDark ? 'bg-slate-700/30' : 'bg-orange-50/50') : ''
                }`}
              >
                <p className={`text-[10px] uppercase tracking-wide font-medium ${
                  isTodayCol
                    ? 'text-orange-500'
                    : isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {DAYS_FR[day.getDay()]}
                </p>
                <p className={`text-sm font-bold ${
                  isTodayCol
                    ? 'text-orange-500'
                    : isDark ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Member rows */}
        {memberData.map(({ membre, memosByDay, totalHours }) => (
          <MemberRow
            key={membre.id}
            membre={membre}
            weekDays={weekDays}
            memosByDay={memosByDay}
            totalHours={totalHours}
            isDark={isDark}
            couleur={couleur}
            onSelect={onSelectMemo}
            onDragStart={setDragId}
            onDropToCell={handleDropToCell}
          />
        ))}

        {/* Unassigned row */}
        {hasUnassigned && (
          <MemberRow
            key="__unassigned__"
            membre={null}
            weekDays={weekDays}
            memosByDay={unassignedData.memosByDay}
            totalHours={unassignedData.totalHours}
            isDark={isDark}
            couleur={couleur}
            onSelect={onSelectMemo}
            onDragStart={setDragId}
            onDropToCell={handleDropToCell}
          />
        )}

        {/* Empty state */}
        {memberData.length === 0 && !hasUnassigned && (
          <div className={`text-center py-12 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun membre dans l'equipe</p>
            <p className="text-xs mt-1">Ajoutez des membres depuis la page Equipe</p>
          </div>
        )}
      </div>

      {/* Mobile accordion view (visible on small screens) */}
      <div className="sm:hidden">
        {memberData.map(({ membre, memosByDay, totalHours }) => (
          <MemberAccordion
            key={membre.id}
            membre={membre}
            weekDays={weekDays}
            memosByDay={memosByDay}
            totalHours={totalHours}
            isDark={isDark}
            couleur={couleur}
            onSelect={onSelectMemo}
            onDragStart={setDragId}
            onDropToCell={handleDropToCell}
          />
        ))}

        {hasUnassigned && (
          <MemberAccordion
            key="__unassigned__"
            membre={null}
            weekDays={weekDays}
            memosByDay={unassignedData.memosByDay}
            totalHours={unassignedData.totalHours}
            isDark={isDark}
            couleur={couleur}
            onSelect={onSelectMemo}
            onDragStart={setDragId}
            onDropToCell={handleDropToCell}
          />
        )}

        {memberData.length === 0 && !hasUnassigned && (
          <div className={`text-center py-12 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun membre dans l'equipe</p>
            <p className="text-xs mt-1">Ajoutez des membres depuis la page Equipe</p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedMemo && (
        <TaskDetail
          memo={selectedMemo}
          onUpdate={updateMemo}
          onDelete={deleteMemo}
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
