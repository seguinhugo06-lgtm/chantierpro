import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit2, Trash2, X, Check, Users, Building2, Clock, AlertTriangle, GripVertical } from 'lucide-react';
import { useConfirm } from '../context/AppContext';
import { generateId } from '../lib/utils';

/**
 * Vue Gantt pour la planification des chantiers
 * Affiche les taches et leur progression dans le temps
 */
export default function GanttView({
  chantiers = [],
  equipe = [],
  taches = [],
  setTaches,
  onUpdateChantier,
  isDark = false,
  couleur = '#f97316'
}) {
  const { confirm } = useConfirm();

  const [viewMode, setViewMode] = useState('week'); // week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const containerRef = useRef(null);
  const [form, setForm] = useState({
    nom: '',
    chantierId: '',
    debut: new Date().toISOString().split('T')[0],
    fin: '',
    duree: 1,
    assignes: [],
    statut: 'planifie', // planifie, en_cours, termine
    couleur: couleur,
    notes: ''
  });

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const gridBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const todayBg = isDark ? 'bg-orange-900/30' : 'bg-orange-100';

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const dates = [];
    const start = new Date(currentDate);

    if (viewMode === 'week') {
      // Start from Monday
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);

      for (let i = 0; i < 14; i++) { // 2 weeks
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    } else {
      // Start from first of month
      start.setDate(1);
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    }

    return dates;
  }, [currentDate, viewMode]);

  // Group tasks by chantier
  const tasksByChantier = useMemo(() => {
    const grouped = {};

    // Add chantiers with their date ranges
    chantiers.forEach(ch => {
      if (ch.statut === 'en_cours' || ch.statut === 'planifie') {
        grouped[ch.id] = {
          chantier: ch,
          tasks: taches.filter(t => t.chantierId === ch.id)
        };
      }
    });

    return grouped;
  }, [chantiers, taches]);

  // Navigation
  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date helpers
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase();
  };

  // Calculate task position and width
  const getTaskStyle = (task) => {
    const startDate = new Date(task.debut);
    const endDate = new Date(task.fin || task.debut);

    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];

    // Check if task is visible in current range
    if (endDate < rangeStart || startDate > rangeEnd) {
      return null;
    }

    // Calculate position
    const visibleStart = startDate < rangeStart ? rangeStart : startDate;
    const visibleEnd = endDate > rangeEnd ? rangeEnd : endDate;

    const startOffset = Math.floor((visibleStart - rangeStart) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

    const cellWidth = viewMode === 'week' ? 60 : 30;

    return {
      left: startOffset * cellWidth,
      width: Math.max(duration * cellWidth - 4, 20),
      background: task.couleur || couleur,
      opacity: task.statut === 'termine' ? 0.6 : 1
    };
  };

  // Handle task form
  const handleSubmit = () => {
    if (!form.nom || !form.chantierId) return;

    const endDate = new Date(form.debut);
    endDate.setDate(endDate.getDate() + (form.duree - 1));

    const taskData = {
      ...form,
      fin: endDate.toISOString().split('T')[0]
    };

    if (editingTask) {
      setTaches(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
    } else {
      setTaches(prev => [...prev, { id: generateId(), ...taskData }]);
    }

    resetForm();
  };

  const handleDelete = async (taskId) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cette tâche ?' });
    if (confirmed) {
      setTaches(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const resetForm = () => {
    setForm({
      nom: '',
      chantierId: '',
      debut: new Date().toISOString().split('T')[0],
      fin: '',
      duree: 1,
      assignes: [],
      statut: 'planifie',
      couleur: couleur,
      notes: ''
    });
    setShowAddTask(false);
    setEditingTask(null);
  };

  const openEdit = (task) => {
    const debut = new Date(task.debut);
    const fin = new Date(task.fin || task.debut);
    const duree = Math.floor((fin - debut) / (1000 * 60 * 60 * 24)) + 1;

    setForm({
      ...task,
      duree
    });
    setEditingTask(task);
    setShowAddTask(true);
  };

  // Task status colors
  const statusColors = {
    planifie: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    en_cours: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
    termine: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' }
  };

  // Render header with dates
  const cellWidth = viewMode === 'week' ? 60 : 30;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={`text-xl font-bold ${textPrimary}`}>Planning Gantt</h2>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            {['week', 'month'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === mode
                    ? 'text-white'
                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'
                }`}
                style={viewMode === mode ? { background: couleur } : {}}
              >
                {mode === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${hoverBg}`}>
              <ChevronLeft size={18} className={textSecondary} />
            </button>
            <button
              onClick={goToToday}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
            >
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className={`p-2 rounded-lg ${hoverBg}`}>
              <ChevronRight size={18} className={textSecondary} />
            </button>
          </div>

          {/* Add task */}
          <button
            onClick={() => setShowAddTask(true)}
            className="px-4 py-2 text-white rounded-xl font-medium flex items-center gap-2"
            style={{ background: couleur }}
          >
            <Plus size={18} />
            Tache
          </button>
        </div>
      </div>

      {/* Current period label */}
      <div className={`text-center ${textPrimary} font-medium`}>
        {viewMode === 'week' ? (
          `${formatDate(dateRange[0])} - ${formatDate(dateRange[dateRange.length - 1])}`
        ) : (
          currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        )}
      </div>

      {/* Gantt chart */}
      <div className={`${cardBg} rounded-xl border overflow-hidden`}>
        <div className="overflow-x-auto" ref={containerRef}>
          <div style={{ minWidth: dateRange.length * cellWidth + 200 }}>
            {/* Date header */}
            <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className={`w-[200px] flex-shrink-0 px-4 py-3 font-medium ${textPrimary} border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                Chantiers
              </div>
              <div className="flex">
                {dateRange.map((date, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 text-center py-2 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'} ${
                      isToday(date) ? todayBg : isWeekend(date) ? (isDark ? 'bg-slate-800' : 'bg-slate-100') : ''
                    }`}
                    style={{ width: cellWidth }}
                  >
                    <p className={`text-xs ${textMuted}`}>{formatDayName(date)}</p>
                    <p className={`text-sm font-medium ${isToday(date) ? 'text-orange-500' : textPrimary}`}>
                      {date.getDate()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {Object.entries(tasksByChantier).length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Building2 size={48} className={`mx-auto mb-4 ${textMuted}`} />
                <p className={textMuted}>Aucun chantier actif</p>
              </div>
            ) : (
              Object.entries(tasksByChantier).map(([chantierId, { chantier, tasks }]) => (
                <div key={chantierId} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  {/* Chantier row */}
                  <div className="flex">
                    <div className={`w-[200px] flex-shrink-0 px-4 py-3 border-r ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} style={{ color: couleur }} />
                        <span className={`font-medium truncate ${textPrimary}`}>{chantier.nom}</span>
                      </div>
                      <p className={`text-xs ${textMuted} mt-1`}>
                        {chantier.avancement || 0}% complete
                      </p>
                    </div>
                    <div className={`relative flex-1 h-16 ${gridBg}`}>
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {dateRange.map((date, i) => (
                          <div
                            key={i}
                            className={`flex-shrink-0 h-full border-r ${isDark ? 'border-slate-700' : 'border-slate-200'} ${
                              isToday(date) ? todayBg : isWeekend(date) ? (isDark ? 'bg-slate-800/50' : 'bg-slate-100/50') : ''
                            }`}
                            style={{ width: cellWidth }}
                          />
                        ))}
                      </div>

                      {/* Chantier bar */}
                      {chantier.dateDebut && (
                        <div
                          className="absolute top-2 h-4 rounded-full opacity-30"
                          style={{
                            ...getTaskStyle({
                              debut: chantier.dateDebut,
                              fin: chantier.dateFin || chantier.dateDebut
                            }),
                            background: couleur
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Task rows */}
                  {tasks.map(task => {
                    const style = getTaskStyle(task);
                    if (!style) return null;

                    return (
                      <div key={task.id} className="flex">
                        <div className={`w-[200px] flex-shrink-0 px-4 py-2 pl-8 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: task.couleur || couleur }} />
                            <span className={`text-sm truncate ${textSecondary}`}>{task.nom}</span>
                          </div>
                        </div>
                        <div className={`relative flex-1 h-10 ${gridBg}`}>
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex">
                            {dateRange.map((date, i) => (
                              <div
                                key={i}
                                className={`flex-shrink-0 h-full border-r ${isDark ? 'border-slate-700' : 'border-slate-200'} ${
                                  isWeekend(date) ? (isDark ? 'bg-slate-800/50' : 'bg-slate-100/50') : ''
                                }`}
                                style={{ width: cellWidth }}
                              />
                            ))}
                          </div>

                          {/* Task bar */}
                          <div
                            className="absolute top-1.5 h-7 rounded-md flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                            style={style}
                            onClick={() => openEdit(task)}
                          >
                            <span className="text-xs text-white truncate font-medium">
                              {task.nom}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(statusColors).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${colors.bg}`} />
            <span className={`text-sm ${textSecondary}`}>
              {status === 'planifie' ? 'Planifie' : status === 'en_cours' ? 'En cours' : 'Termine'}
            </span>
          </div>
        ))}
      </div>

      {/* Add/Edit Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {editingTask ? 'Modifier la tache' : 'Nouvelle tache'}
              </h2>
              <button onClick={resetForm} className={`p-2 rounded-lg ${hoverBg}`}>
                <X size={20} className={textSecondary} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom de la tache *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="Ex: Pose carrelage salle de bain"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Chantier *</label>
                <select
                  value={form.chantierId}
                  onChange={e => setForm(p => ({ ...p, chantierId: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                >
                  <option value="">Selectionner un chantier</option>
                  {chantiers.filter(c => c.statut === 'en_cours' || c.statut === 'planifie').map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date de debut</label>
                  <input
                    type="date"
                    value={form.debut}
                    onChange={e => setForm(p => ({ ...p, debut: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Duree (jours)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.duree}
                    onChange={e => setForm(p => ({ ...p, duree: parseInt(e.target.value) || 1 }))}
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Statut</label>
                <select
                  value={form.statut}
                  onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                >
                  <option value="planifie">Planifie</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Termine</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Couleur</label>
                <div className="flex gap-2">
                  {['#f97316', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(p => ({ ...p, couleur: color }))}
                      className={`w-8 h-8 rounded-lg ${form.couleur === color ? 'ring-2 ring-offset-2' : ''}`}
                      style={{ background: color, ringColor: color }}
                    />
                  ))}
                </div>
              </div>

              {equipe.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Assigner a</label>
                  <div className="flex flex-wrap gap-2">
                    {equipe.map(e => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setForm(p => ({
                            ...p,
                            assignes: p.assignes.includes(e.id)
                              ? p.assignes.filter(id => id !== e.id)
                              : [...p.assignes, e.id]
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 ${
                          form.assignes.includes(e.id)
                            ? 'text-white'
                            : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                        style={form.assignes.includes(e.id) ? { background: couleur } : {}}
                      >
                        <Users size={14} />
                        {e.prenom}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  rows={2}
                  placeholder="Notes supplementaires..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {editingTask && (
                <button
                  onClick={() => handleDelete(editingTask.id)}
                  className={`px-4 py-2.5 rounded-xl ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={resetForm}
                className={`flex-1 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                style={{ background: couleur }}
              >
                <Check size={18} />
                {editingTask ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
