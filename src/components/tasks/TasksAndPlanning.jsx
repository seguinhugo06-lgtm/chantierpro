import React, { useState, useMemo, lazy, Suspense } from 'react';
import { List, Kanban, Calendar, CalendarCheck, GanttChart, Users } from 'lucide-react';
import TaskFilters from './TaskFilters';

const TaskListView = lazy(() => import('./TaskListView'));
const TaskKanbanView = lazy(() => import('./TaskKanbanView'));
const TaskCalendarView = lazy(() => import('./TaskCalendarView'));
const TaskGanttView = lazy(() => import('./TaskGanttView'));
const TaskTeamView = lazy(() => import('./TaskTeamView'));

// ════════════════════════════════════════════════════════
// TasksAndPlanning — Unified parent for tasks + planning
// Combines MemosPage (list/kanban) and Planning (calendar/agenda)
// ════════════════════════════════════════════════════════

const VIEW_MODES = [
  { id: 'list', icon: List, label: 'Liste' },
  { id: 'kanban', icon: Kanban, label: 'Kanban' },
  { id: 'gantt', icon: GanttChart, label: 'Gantt' },
  { id: 'team', icon: Users, label: 'Equipe' },
  { id: 'calendar', icon: Calendar, label: 'Calendrier' },
];

export default function TasksAndPlanning({
  // Memos
  memos, addMemo, updateMemo, deleteMemo, toggleMemo,
  // Planning events
  events, setEvents, addEvent, updateEvent, deleteEvent,
  // Shared data
  chantiers, clients, equipe, devis,
  // Navigation
  setPage, setSelectedChantier, updateChantier,
  // UI
  isDark, couleur, showToast,
  // Planning specifics
  prefill, clearPrefill,
  // Initial view (for redirects from planning/memos)
  initialView,
}) {
  const [viewMode, setViewMode] = useState(() => {
    const raw = initialView || localStorage.getItem('cp_tasks_view') || 'list';
    // 'agenda' view removed — fallback to calendar
    return raw === 'agenda' ? 'calendar' : raw;
  });
  const [filters, setFilters] = useState({ search: '', category: '', priority: '', status: '' });
  const [selectedMemoId, setSelectedMemoId] = useState(null);

  const handleViewChange = (v) => {
    // If user had 'agenda' saved, fallback to 'calendar'
    const resolved = v === 'agenda' ? 'calendar' : v;
    setViewMode(resolved);
    localStorage.setItem('cp_tasks_view', resolved);
  };

  // Fix 12: Global task counters
  const taskStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalActive = memos.filter(m => !m.is_done).length;
    const overdueCount = memos.filter(m => !m.is_done && m.due_date && m.due_date < todayStr).length;
    return { totalActive, overdueCount };
  }, [memos]);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-3">
          <CalendarCheck size={24} style={{ color: couleur }} />
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tâches & Planning
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {taskStats.totalActive} tâche{taskStats.totalActive !== 1 ? 's' : ''}
              {taskStats.overdueCount > 0 && (
                <span className="text-red-500"> · {taskStats.overdueCount} en retard</span>
              )}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className={`flex rounded-xl border p-1 ${cardBg}`}>
          {VIEW_MODES.map(v => (
            <button
              key={v.id}
              onClick={() => handleViewChange(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === v.id
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={viewMode === v.id ? { background: couleur } : {}}
            >
              <v.icon size={14} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters (for list/kanban/gantt/team views) */}
      {(viewMode === 'list' || viewMode === 'kanban' || viewMode === 'gantt' || viewMode === 'team') && (
        <div className="mb-4">
          <TaskFilters filters={filters} onFiltersChange={setFilters} isDark={isDark} couleur={couleur} />
        </div>
      )}

      {/* View content */}
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${couleur}33`, borderTopColor: couleur }}
          />
        </div>
      }>
        {viewMode === 'list' && (
          <TaskListView
            memos={memos}
            addMemo={addMemo}
            updateMemo={updateMemo}
            deleteMemo={deleteMemo}
            toggleMemo={toggleMemo}
            chantiers={chantiers}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            filters={filters}
            selectedMemoId={selectedMemoId}
            onSelectMemo={setSelectedMemoId}
            setPage={setPage}
          />
        )}
        {viewMode === 'kanban' && (
          <TaskKanbanView
            memos={memos}
            updateMemo={updateMemo}
            addMemo={addMemo}
            deleteMemo={deleteMemo}
            toggleMemo={toggleMemo}
            chantiers={chantiers}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            filters={filters}
            selectedMemoId={selectedMemoId}
            onSelectMemo={setSelectedMemoId}
          />
        )}
        {viewMode === 'gantt' && (
          <TaskGanttView
            memos={memos}
            updateMemo={updateMemo}
            chantiers={chantiers}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            filters={filters}
            onSelectMemo={setSelectedMemoId}
          />
        )}
        {viewMode === 'team' && (
          <TaskTeamView
            memos={memos}
            updateMemo={updateMemo}
            deleteMemo={deleteMemo}
            equipe={equipe}
            chantiers={chantiers}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            filters={filters}
            selectedMemoId={selectedMemoId}
            onSelectMemo={setSelectedMemoId}
          />
        )}
        {viewMode === 'calendar' && (
          <TaskCalendarView
            events={events}
            setEvents={setEvents}
            addEvent={addEvent}
            updateEvent={updateEvent}
            deleteEvent={deleteEvent}
            memos={memos}
            toggleMemo={toggleMemo}
            updateMemo={updateMemo}
            chantiers={chantiers}
            clients={clients}
            equipe={equipe}
            devis={devis}
            setPage={setPage}
            setSelectedChantier={setSelectedChantier}
            updateChantier={updateChantier}
            couleur={couleur}
            isDark={isDark}
            prefill={prefill}
            clearPrefill={clearPrefill}
          />
        )}
      </Suspense>
    </div>
  );
}
