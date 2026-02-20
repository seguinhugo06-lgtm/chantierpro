import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ArrowLeft, Calendar, Clock, User, MapPin, X, Edit3, Trash2, Check, ChevronLeft, ChevronRight, AlertCircle, CalendarDays, Bell, Home, Briefcase, Phone, RefreshCw, Zap, CalendarCheck, Filter, Info, Building2, ClipboardList } from 'lucide-react';
import { useConfirm } from '../context/AppContext';

const DURATIONS = [
  { label: '30min', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '4h', value: 240 },
  { label: 'Journée', value: 480 },
];

const formatDuration = (mins) => {
  if (!mins) return '';
  if (mins >= 480) return 'Journée';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}min`;
};

export default function Planning({ events, setEvents, addEvent, updateEvent: updateEventProp, deleteEvent: deleteEventProp, chantiers, clients = [], equipe, memos = [], couleur, setPage, setSelectedChantier, updateChantier, isDark, prefill, clearPrefill }) {
  const { confirm } = useConfirm();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterEmploye, setFilterEmploye] = useState('');
  const [filterType, setFilterType] = useState('');
  const [quickAdd, setQuickAdd] = useState(null); // Date string for quick add
  const [tooltip, setTooltip] = useState(null); // { event, x, y } for month view hover
  const [showTips, setShowTips] = useState(() => { try { return !localStorage.getItem('cp_planning_tips_dismissed'); } catch { return true; } });
  const [mobileWeekDay, setMobileWeekDay] = useState(0); // index into weekDays for mobile week grid
  const [agendaRange, setAgendaRange] = useState(30); // days to show in agenda view
  const weekGridRef = useRef(null);
  const emptyForm = { title: '', date: '', time: '', type: 'rdv', employeId: '', clientId: '', description: '', duration: 60, recurrence: 'never', recurrenceEnd: '' };
  const [form, setForm] = useState(emptyForm);

  // Escape key handler for form and modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDetail) { setShowDetail(null); setEditMode(false); }
        else if (showAdd || quickAdd) { setShowAdd(false); setQuickAdd(null); setForm(emptyForm); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetail, showAdd, quickAdd]);

  // Handle prefill from external navigation (e.g. Chantier → Planifier)
  useEffect(() => {
    if (prefill) {
      setForm(prev => ({ ...emptyForm, ...prefill }));
      setShowAdd(true);
      clearPrefill?.();
    }
  }, [prefill]);

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Week view calculations
  const getWeekDays = () => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };
  const weekDays = getWeekDays();

  // Auto-scroll week grid to current time
  useEffect(() => {
    if (viewMode === 'week' && weekGridRef.current) {
      const now = new Date();
      const scrollTo = Math.max(0, ((now.getHours() - 7) * 60 + now.getMinutes()) - 60);
      setTimeout(() => weekGridRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' }), 100);
    }
  }, [viewMode]);

  // Reset mobileWeekDay to today when navigating weeks
  useEffect(() => {
    const todayIdx = weekDays.findIndex(d => formatLocalDate(d) === formatLocalDate(new Date()));
    if (todayIdx >= 0) setMobileWeekDay(todayIdx);
  }, [date]);

  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const JOURS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const TYPE_LABELS = { chantier: 'Chantier', rdv: 'RDV Client', relance: 'Relance', urgence: 'Urgence', memo: 'Mémo', autre: 'Autre' };
  const TYPE_ICONS = { chantier: Home, rdv: User, relance: Phone, urgence: Zap, memo: ClipboardList, autre: Calendar };

  // Couleurs cohérentes avec la légende - chantiers toujours bleus
  const getChantierColor = (ch) => { if (ch.statut === 'termine') return '#64748b'; return '#3b82f6'; };
  const typeColors = { chantier: '#3b82f6', rdv: '#22c55e', relance: '#f97316', urgence: '#ef4444', memo: '#f59e0b', autre: '#8b5cf6' };

  // Helper pour obtenir la couleur d'un événement - TOUJOURS utiliser typeColors en priorité
  const getEventColor = (ev) => {
    // Pour les chantiers, utiliser bleu (ou gris si terminé - la couleur vient de getChantierColor)
    if (ev.isChantier) {
      return ev.color || typeColors.chantier;
    }
    // PRIORITÉ ABSOLUE: si le type est défini et existe dans typeColors, l'utiliser
    if (ev.type && typeColors[ev.type]) {
      return typeColors[ev.type];
    }
    // Fallback uniquement si type invalide/inexistant
    return couleur;
  };

  const getChantierEvents = () => chantiers.filter(ch => ch.date_debut).map(ch => ({
    id: `ch_${ch.id}`, title: ch.nom, date: ch.date_debut, dateEnd: ch.date_fin, type: 'chantier',
    chantierId: ch.id, color: getChantierColor(ch), isChantier: true, description: ch.adresse || ''
  }));
  const getMemoEvents = () => memos.filter(m => m.due_date && !m.is_done).map(m => ({
    id: `memo_${m.id}`, title: m.text?.substring(0, 50) || 'Mémo', date: m.due_date,
    time: m.due_time || '', type: 'memo', isMemo: true, description: m.notes || '',
    color: '#f59e0b',
  }));
  // Expand recurring events into virtual instances within visible range
  const expandRecurringEvents = (evts) => {
    const expanded = [];
    // View range: 3 months from now as safety limit
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 3);
    const rangeEndStr = formatLocalDate(rangeEnd);

    evts.forEach(ev => {
      expanded.push(ev);
      if (!ev.recurrence || ev.recurrence === 'never' || !ev.date) return;
      const endStr = ev.recurrenceEnd || rangeEndStr;
      const srcDate = new Date(ev.date + 'T00:00:00');
      let cur = new Date(srcDate);
      for (let i = 0; i < 100; i++) { // safety limit
        if (ev.recurrence === 'weekly') cur.setDate(cur.getDate() + 7);
        else cur.setMonth(cur.getMonth() + 1);
        const dateStr = formatLocalDate(cur);
        if (dateStr > endStr) break;
        expanded.push({
          ...ev,
          id: `${ev.id}_rec_${dateStr}`,
          date: dateStr,
          isRecurrence: true,
          originalId: ev.id,
        });
      }
    });
    return expanded;
  };

  const allEvents = useMemo(() => [...expandRecurringEvents(events), ...getChantierEvents(), ...getMemoEvents()], [events, chantiers, memos]);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const d = typeof day === 'string' ? day : `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter(e => {
      if (filterEmploye && e.employeId !== filterEmploye) return false;
      if (filterType && e.type !== filterType) return false;
      if (e.dateEnd) return d >= e.date && d <= e.dateEnd;
      return e.date === d;
    });
  };

  // Format a Date object as YYYY-MM-DD in LOCAL timezone (NOT UTC)
  const formatLocalDate = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventsForDate = (dateObj) => {
    const d = formatLocalDate(dateObj);
    return getEventsForDay(d);
  };

  const handleEventClick = (e, ev) => { e.stopPropagation(); setShowDetail(ev); setEditMode(false); };
  const goToChantier = (chantierId) => { if (setSelectedChantier && setPage) { setSelectedChantier(chantierId); setPage('chantiers'); } };
  const goToToday = () => setDate(new Date());

  const moveEvent = (eventId, newDate) => {
    const ev = allEvents.find(e => e.id === eventId);
    if (!ev) return;
    if (ev.isChantier && updateChantier) {
      const duration = ev.dateEnd ? Math.ceil((new Date(ev.dateEnd) - new Date(ev.date)) / 86400000) : 0;
      const newDateEnd = duration > 0 ? formatLocalDate(new Date(new Date(newDate).getTime() + duration * 86400000)) : '';
      updateChantier(ev.chantierId, { date_debut: newDate, date_fin: newDateEnd });
    } else if (updateEventProp) {
      updateEventProp(eventId, { date: newDate });
    } else {
      setEvents(events.map(e => e.id === eventId ? { ...e, date: newDate } : e));
    }
  };

  const submit = () => {
    if (!form.title || !form.date) return;
    addEvent({ ...form });
    setShowAdd(false);
    setQuickAdd(null);
    setForm(emptyForm);
  };

  const handleDeleteEvent = async (id) => {
    if (id.startsWith('ch_')) return;
    // For recurring instances, delete the original event (whole series)
    const ev = allEvents.find(e => e.id === id);
    const realId = ev?.isRecurrence ? ev.originalId : id;
    const msg = ev?.isRecurrence ? 'Supprimer toute la série récurrente ?' : 'Supprimer cet événement ?';
    const confirmed = await confirm({ title: 'Supprimer', message: msg });
    if (confirmed) {
      if (deleteEventProp) {
        await deleteEventProp(realId);
      } else {
        setEvents(events.filter(e => e.id !== realId));
      }
      setShowDetail(null);
    }
  };

  const handleUpdateEvent = () => {
    if (!showDetail || showDetail.isChantier) return;
    const realId = showDetail.isRecurrence ? showDetail.originalId : showDetail.id;
    if (updateEventProp) {
      updateEventProp(realId, form);
    } else {
      setEvents(events.map(e => e.id === realId ? { ...e, ...form } : e));
    }
    setShowDetail(null); setEditMode(false);
    setForm(emptyForm);
  };

  const startEdit = () => {
    setForm({ title: showDetail.title || '', date: showDetail.date || '', time: showDetail.time || '',
      type: showDetail.type || 'rdv', employeId: showDetail.employeId || '', clientId: showDetail.clientId || '', description: showDetail.description || '',
      duration: showDetail.duration || 60, recurrence: showDetail.recurrence || 'never', recurrenceEnd: showDetail.recurrenceEnd || '' });
    setEditMode(true);
  };

  // Quick add handler
  const handleQuickAdd = (dateStr) => {
    setForm({ ...form, date: dateStr });
    setQuickAdd(dateStr);
  };

  // Formulaire création / Quick add
  if (showAdd || quickAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShowAdd(false); setQuickAdd(null); setForm(emptyForm); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>Nouvel événement</h2>
      </div>

      {/* Quick type selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(TYPE_LABELS).filter(([k]) => k !== 'chantier').map(([key, label]) => {
          const Icon = TYPE_ICONS[key];
          const isSelected = form.type === key;
          return (
            <button key={key} onClick={() => setForm(p => ({...p, type: key}))} className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${isSelected ? 'text-white border-transparent' : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'}`} style={isSelected ? { background: typeColors[key] } : {}}>
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      <div className={`${cardBg} rounded-2xl border p-5`}>
        <div className="space-y-4">
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Titre *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Ex: RDV devis M. Dupont" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date *</label><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Heure</label><input type="time" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
          </div>
          {/* Duration quick picker */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Durée</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setForm(p => ({...p, duration: d.value}))}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${form.duration === d.value ? 'text-white shadow-md' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  style={form.duration === d.value ? { background: couleur } : {}}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          {/* Recurrence */}
          <div className={`grid ${form.recurrence !== 'never' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Récurrence</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.recurrence} onChange={e => setForm(p => ({...p, recurrence: e.target.value}))}>
                <option value="never">Jamais</option>
                <option value="weekly">Chaque semaine</option>
                <option value="monthly">Chaque mois</option>
              </select>
            </div>
            {form.recurrence !== 'never' && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Jusqu'au</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.recurrenceEnd} onChange={e => setForm(p => ({...p, recurrenceEnd: e.target.value}))} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Assigner à</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}><option value="">Moi-même</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
            {clients.length > 0 && (
              <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Client</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">— Aucun —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>)}</select></div>
            )}
          </div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes</label><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Adresse, infos utiles..." /></div>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : ''}`}>
          <button onClick={() => { setShowAdd(false); setQuickAdd(null); }} className={`px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl min-h-[44px] flex items-center gap-2" style={{background: couleur}}>
            <Check size={16} /> Créer
          </button>
        </div>
      </div>
    </div>
  );

  // Today stats
  const todayStr = formatLocalDate(new Date());
  const todayEvents = getEventsForDay(todayStr);
  const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Planning</h1>
            <p className={`text-sm ${textMuted}`}>{todayEvents.length} événement{todayEvents.length > 1 ? 's' : ''} aujourd'hui</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl flex items-center justify-center sm:gap-2 hover:shadow-lg transition-all" style={{background: couleur}}>
            <Plus size={16} /><span className="hidden sm:inline">Événement</span>
          </button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 items-center">
          <button onClick={goToToday} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textSecondary}`}>
            Aujourd'hui
          </button>
          <select className={`px-3 py-1.5 border rounded-lg text-sm ${inputBg}`} value={filterEmploye} onChange={e => setFilterEmploye(e.target.value)}>
            <option value="">Tous</option>
            {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <select className={`px-3 py-1.5 border rounded-lg text-sm hidden sm:block ${inputBg}`} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => { setViewMode('month'); }} className={`px-3 py-1.5 text-sm ${viewMode === 'month' ? 'text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`} style={viewMode === 'month' ? { background: couleur } : {}}>Mois</button>
          <button onClick={() => { const today = new Date(); if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) setDate(today); setViewMode('week'); }} className={`px-3 py-1.5 text-sm ${viewMode === 'week' ? 'text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`} style={viewMode === 'week' ? { background: couleur } : {}}>Semaine</button>
          <button onClick={() => { const today = new Date(); if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) setDate(today); setViewMode('day'); }} className={`px-3 py-1.5 text-sm ${viewMode === 'day' ? 'text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`} style={viewMode === 'day' ? { background: couleur } : {}}>Jour</button>
          <button onClick={() => setViewMode('agenda')} className={`px-3 py-1.5 text-sm ${viewMode === 'agenda' ? 'text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`} style={viewMode === 'agenda' ? { background: couleur } : {}}>Agenda</button>
        </div>
      </div>

      {/* Legend */}
      <div className={`flex gap-2 sm:gap-3 flex-wrap p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white shadow-sm border border-slate-200'}`}>
        {Object.entries(TYPE_LABELS).map(([key, label]) => {
          const Icon = TYPE_ICONS[key];
          const isActive = filterType === key;
          return (
            <button
              key={key}
              onClick={() => setFilterType(filterType === key ? '' : key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'text-white shadow-md'
                  : isDark
                  ? 'bg-slate-700 hover:bg-slate-600'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
              style={isActive ? { background: typeColors[key] } : {}}
            >
              <span className={`w-4 h-4 rounded-full shadow-sm ${isActive ? 'bg-white/40' : ''}`} style={!isActive ? { background: typeColors[key] } : {}} />
              <span className={`text-sm font-semibold ${isActive ? '' : textPrimary}`}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Calendar */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {viewMode !== 'agenda' ? (
            <button onClick={() => setDate(viewMode === 'month' ? new Date(year, month - 1) : viewMode === 'day' ? new Date(date.getTime() - 86400000) : new Date(date.getTime() - 7 * 86400000))} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 active:bg-slate-600' : 'hover:bg-slate-100 active:bg-slate-200'}`}>
              <ChevronLeft size={24} className={textPrimary} />
            </button>
          ) : <div className="w-10" />}
          <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>
            {viewMode === 'month' ? `${MOIS[month]} ${year}` : viewMode === 'day' ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : viewMode === 'agenda' ? 'Agenda' : `Semaine du ${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
          </h2>
          {viewMode !== 'agenda' ? (
            <button onClick={() => setDate(viewMode === 'month' ? new Date(year, month + 1) : viewMode === 'day' ? new Date(date.getTime() + 86400000) : new Date(date.getTime() + 7 * 86400000))} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 active:bg-slate-600' : 'hover:bg-slate-100 active:bg-slate-200'}`}>
              <ChevronRight size={24} className={textPrimary} />
            </button>
          ) : <div className="w-10" />}
        </div>

        {viewMode === 'month' ? (
          <>
            <div className={`grid grid-cols-7 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              {JOURS.map(j => <div key={j} className={`py-2 text-center text-xs sm:text-sm font-medium ${textMuted}`}>{j}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                return (
                  <div key={i} className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-r border-b ${isDark ? 'border-slate-700' : 'border-slate-100'} ${!day ? (isDark ? 'bg-slate-900/50' : 'bg-slate-50') : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('eventId'); if (id && dateStr) moveEvent(id, dateStr); }} onClick={() => day && handleQuickAdd(dateStr)}>
                    {day && (<>
                      <div className="flex items-center gap-1 mb-1">
                        <p className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'text-white' : textPrimary}`} style={isToday ? {background: couleur} : {}}>{day}</p>
                        {(() => {
                          const totalMins = dayEvents.reduce((s, ev) => s + (ev.duration || 60), 0);
                          if (totalMins === 0) return null;
                          const hrs = totalMins / 60;
                          const color = hrs < 4 ? '#22c55e' : hrs <= 7 ? '#f97316' : '#ef4444';
                          return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />;
                        })()}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayEvents.slice(0, 2).map(ev => {
                          const TypeIcon = TYPE_ICONS[ev.type] || Calendar;
                          return (
                            <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} draggable onDragStart={e => e.dataTransfer.setData('eventId', ev.id)}
                              onMouseEnter={(e) => { if (window.innerWidth >= 640) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ event: ev, x: r.right + 8, y: r.top }); }}}
                              onMouseLeave={() => setTooltip(null)}
                              className="group text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded-md sm:rounded-lg text-white cursor-pointer hover:scale-105 hover:shadow-md transition-all flex items-center gap-1" style={{background: getEventColor(ev)}}>
                              <TypeIcon size={10} className="opacity-75 flex-shrink-0 hidden sm:block" />
                              <span className="truncate font-medium">{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDate(new Date(year, month, day)); setViewMode('week'); }}
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                            style={{ color: couleur }}
                          >
                            +{dayEvents.length - 2} autres
                          </button>
                        )}
                      </div>
                    </>)}
                  </div>
                );
              })}
            </div>
          </>
        ) : viewMode === 'week' ? (
          // Week view — hourly grid (Google Calendar style)
          (() => {
            const HOUR_START = 7;
            const HOUR_END = 20;
            const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
            const HOUR_HEIGHT = 60; // px per hour slot
            const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;
            const todayStr = formatLocalDate(new Date());

            const getEventPos = (ev) => {
              if (!ev.time) return null;
              const [h, m] = ev.time.split(':').map(Number);
              const topMins = (h - HOUR_START) * 60 + (m || 0);
              if (topMins < 0) return null;
              const top = (topMins / 60) * HOUR_HEIGHT;
              const dur = ev.duration || 60;
              const height = Math.max((dur / 60) * HOUR_HEIGHT, 22);
              return { top, height };
            };

            // Current time indicator
            const now = new Date();
            const nowMins = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
            const nowTop = nowMins >= 0 && nowMins <= (HOUR_END - HOUR_START + 1) * 60 ? (nowMins / 60) * HOUR_HEIGHT : null;

            // Render a single day column
            const renderDayColumn = (dayDate, dayIdx, style = {}) => {
              const dayEvts = getEventsForDate(dayDate);
              const isToday = formatLocalDate(dayDate) === todayStr;
              const dateStr = formatLocalDate(dayDate);
              const allDayEvts = dayEvts.filter(ev => !ev.time);
              const timedEvts = dayEvts.filter(ev => ev.time);

              return (
                <div key={dayIdx} className={`relative border-l ${isDark ? 'border-slate-700' : 'border-slate-200'}`} style={{ height: TOTAL_HEIGHT, ...style }}>
                  {/* Hour grid lines */}
                  {HOURS.map(h => (
                    <div key={h} className={`absolute left-0 right-0 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`} style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onClick={() => { setForm(f => ({ ...f, date: dateStr, time: `${String(h).padStart(2, '0')}:00` })); setShowAdd(true); }} />
                  ))}
                  {/* Current time indicator */}
                  {isToday && nowTop !== null && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  )}
                  {/* Timed event blocks */}
                  {timedEvts.map(ev => {
                    const pos = getEventPos(ev);
                    if (!pos) return null;
                    return (
                      <div key={ev.id} onClick={(e) => { e.stopPropagation(); handleEventClick(e, ev); }}
                        draggable={!ev.isChantier} onDragStart={e => e.dataTransfer.setData('eventId', ev.id)}
                        className="absolute left-1 right-1 rounded-lg px-2 py-0.5 text-white text-xs cursor-pointer overflow-hidden hover:shadow-lg hover:brightness-110 transition-all z-10"
                        style={{ top: pos.top, height: pos.height, background: getEventColor(ev), minHeight: 22 }}>
                        <p className="font-semibold truncate leading-tight">{ev.title}</p>
                        {pos.height > 32 && <p className="opacity-80 text-[10px] leading-tight">{ev.time}{ev.duration ? ` · ${formatDuration(ev.duration)}` : ''}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            };

            return (
              <div>
                {/* All-day events row */}
                {(() => {
                  const allDayMap = weekDays.map(d => getEventsForDate(d).filter(ev => !ev.time));
                  const hasAnyAllDay = allDayMap.some(arr => arr.length > 0);
                  if (!hasAnyAllDay) return null;
                  return (
                    <div className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      {/* Desktop all-day */}
                      <div className="hidden sm:flex">
                        <div className={`w-14 flex-shrink-0 text-[10px] text-center py-1 ${textMuted}`}>Journée</div>
                        {weekDays.map((d, i) => (
                          <div key={i} className={`flex-1 p-1 border-l ${isDark ? 'border-slate-700' : 'border-slate-200'} min-h-[28px]`}>
                            {allDayMap[i].map(ev => (
                              <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className="text-[10px] px-1.5 py-0.5 rounded text-white cursor-pointer truncate mb-0.5" style={{ background: getEventColor(ev) }}>{ev.title}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                      {/* Mobile all-day */}
                      <div className="sm:hidden p-2">
                        {allDayMap[mobileWeekDay]?.map(ev => (
                          <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className="text-xs px-2 py-1 rounded-lg text-white cursor-pointer truncate mb-1" style={{ background: getEventColor(ev) }}>{ev.title}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Desktop: 7-column grid */}
                <div className="hidden sm:block">
                  {/* Day headers */}
                  <div className="flex border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                    <div className="w-14 flex-shrink-0" />
                    {weekDays.map((d, i) => {
                      const isToday = formatLocalDate(d) === todayStr;
                      return (
                        <div key={i} className={`flex-1 text-center py-2 border-l ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <p className={`text-xs ${textMuted}`}>{JOURS[i]}</p>
                          <p className={`text-sm font-bold ${isToday ? 'text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto' : textPrimary}`} style={isToday ? { background: couleur } : {}}>{d.getDate()}</p>
                        </div>
                      );
                    })}
                  </div>
                  {/* Scrollable grid */}
                  <div ref={weekGridRef} className="overflow-y-auto" style={{ maxHeight: 'min(600px, 60vh)' }}>
                    <div className="flex" style={{ height: TOTAL_HEIGHT }}>
                      {/* Hour gutter */}
                      <div className="w-14 flex-shrink-0 relative">
                        {HOURS.map(h => (
                          <div key={h} className={`absolute right-2 text-[11px] font-medium ${textMuted}`} style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 6 }}>
                            {String(h).padStart(2, '0')}h
                          </div>
                        ))}
                      </div>
                      {/* Day columns */}
                      {weekDays.map((d, i) => renderDayColumn(d, i, { flex: '1 1 0%' }))}
                    </div>
                  </div>
                </div>

                {/* Mobile: day tabs + single column */}
                <div className="sm:hidden">
                  {/* Day tab selector */}
                  <div className={`flex overflow-x-auto gap-1 p-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    {weekDays.map((d, i) => {
                      const isToday = formatLocalDate(d) === todayStr;
                      const isActive = mobileWeekDay === i;
                      return (
                        <button key={i} onClick={() => setMobileWeekDay(i)}
                          className={`flex-shrink-0 w-11 py-2 rounded-xl text-center transition-all ${isActive ? 'text-white shadow-md' : isToday ? '' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
                          style={isActive ? { background: couleur } : isToday ? { color: couleur } : {}}>
                          <p className="text-[10px] font-medium">{JOURS[i]}</p>
                          <p className="text-base font-bold">{d.getDate()}</p>
                        </button>
                      );
                    })}
                  </div>
                  {/* Single day hourly grid */}
                  <div className="overflow-y-auto" style={{ maxHeight: 'min(500px, 55vh)' }}>
                    <div className="flex" style={{ height: TOTAL_HEIGHT }}>
                      <div className="w-12 flex-shrink-0 relative">
                        {HOURS.map(h => (
                          <div key={h} className={`absolute right-1.5 text-[10px] font-medium ${textMuted}`} style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 5 }}>
                            {String(h).padStart(2, '0')}h
                          </div>
                        ))}
                      </div>
                      {renderDayColumn(weekDays[mobileWeekDay], mobileWeekDay, { flex: '1 1 0%' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : viewMode === 'day' ? (
          // Day view with hourly slots
          (() => {
            const dayStr = formatLocalDate(date);
            const dayEvents = getEventsForDay(dayStr);
            const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h

            return (
              <div>
                <div className={`text-center py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-lg font-bold ${textPrimary}`}>
                    {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {HOURS.map(hour => {
                    const hourStr = `${String(hour).padStart(2, '0')}:00`;
                    const hourEvents = dayEvents.filter(ev => {
                      if (!ev.time) return hour === 8; // Default no-time events to 8h
                      const evHour = parseInt(ev.time.split(':')[0]);
                      return evHour === hour;
                    });

                    return (
                      <div
                        key={hour}
                        className={`flex min-h-[60px] ${isDark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'}`}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData('eventId');
                          if (id) {
                            const ev = allEvents.find(evt => evt.id === id);
                            if (ev && !ev.isChantier) {
                              if (updateEventProp) {
                                updateEventProp(id, { date: dayStr, time: hourStr });
                              } else {
                                setEvents(events.map(evt => evt.id === id ? { ...evt, date: dayStr, time: hourStr } : evt));
                              }
                            }
                          }
                        }}
                        onClick={() => {
                          setForm(f => ({ ...f, date: dayStr, time: hourStr }));
                          setShowAdd(true);
                        }}
                      >
                        <div className={`w-16 sm:w-20 p-2 text-right flex-shrink-0 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <span className={`text-xs font-medium ${textMuted}`}>{hourStr}</span>
                        </div>
                        <div className="flex-1 p-1.5">
                          {hourEvents.map(ev => {
                            const TypeIcon = TYPE_ICONS[ev.type] || Calendar;
                            const eventColor = getEventColor(ev);
                            return (
                              <div
                                key={ev.id}
                                draggable={!ev.isChantier}
                                onDragStart={e => e.dataTransfer.setData('eventId', ev.id)}
                                onClick={e => { e.stopPropagation(); handleEventClick(e, ev); }}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border-l-3 mb-1 ${isDark ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-white hover:bg-slate-50 shadow-sm'}`}
                                style={{ borderLeft: `3px solid ${eventColor}` }}
                              >
                                <TypeIcon size={14} style={{ color: eventColor }} />
                                <span className={`text-sm font-medium truncate ${textPrimary}`}>{ev.title}</span>
                                {ev.time && <span className={`text-xs ${textMuted} ml-auto`}>{ev.time}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : viewMode === 'agenda' ? (
          // Agenda view — chronological scrollable list
          (() => {
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            const agendaDays = [];
            for (let i = 0; i < agendaRange; i++) {
              const d = new Date(startDate);
              d.setDate(d.getDate() + i);
              const dateStr = formatLocalDate(d);
              const dayEvts = getEventsForDay(dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              agendaDays.push({ date: d, dateStr, events: dayEvts });
            }
            return (
              <div>
                {agendaDays.map(({ date: dayDate, dateStr, events: dayEvts }) => {
                  const isToday = dateStr === formatLocalDate(new Date());
                  return (
                    <div key={dateStr}>
                      <div className={`sticky top-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wider ${isToday ? (isDark ? 'bg-slate-700' : 'bg-orange-50') : isDark ? 'bg-slate-900' : 'bg-slate-50'}`} style={isToday ? { color: couleur } : {}}>
                        {isToday ? "Aujourd'hui — " : ''}{dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      {dayEvts.length === 0 ? (
                        <div className={`px-4 py-3 text-sm ${textMuted} border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>Aucun événement</div>
                      ) : (
                        dayEvts.map(ev => {
                          const TypeIcon = TYPE_ICONS[ev.type] || Calendar;
                          const eventColor = getEventColor(ev);
                          const client = ev.clientId ? clients.find(c => c.id === ev.clientId) : null;
                          return (
                            <div key={ev.id} onClick={(e) => handleEventClick(e, ev)}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b min-h-[56px] ${isDark ? 'border-slate-700/50 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'}`}>
                              <div className="flex flex-col items-center w-14 flex-shrink-0">
                                <span className={`text-sm font-bold ${textPrimary}`}>{ev.time || '--:--'}</span>
                                {ev.duration && <span className={`text-[10px] ${textMuted}`}>{formatDuration(ev.duration)}</span>}
                              </div>
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: eventColor }} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${textPrimary}`}>{ev.title}</p>
                                {client && <p className={`text-xs ${textMuted} truncate`}>{client.nom} {client.prenom || ''}</p>}
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: eventColor }}>
                                {TYPE_LABELS[ev.type] || 'Autre'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setAgendaRange(r => r + 30)}
                  className={`w-full py-4 text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}>
                  Charger 30 jours de plus...
                </button>
              </div>
            );
          })()
        ) : null}
      </div>

      {/* Tooltip popover for month view */}
      {tooltip && (() => {
        const ev = tooltip.event;
        const client = ev.clientId ? clients.find(c => c.id === ev.clientId) : null;
        // Smart positioning: flip left if overflowing right
        const tx = tooltip.x + 260 > window.innerWidth ? tooltip.x - 275 : tooltip.x;
        const ty = tooltip.y + 150 > window.innerHeight ? tooltip.y - 100 : tooltip.y;
        return (
          <div className="fixed z-50 pointer-events-none" style={{ top: ty, left: tx }}>
            <div className={`${cardBg} rounded-xl border shadow-2xl p-3 w-64`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getEventColor(ev) }} />
                <span className={`font-semibold text-sm ${textPrimary} truncate`}>{ev.title}</span>
              </div>
              {ev.time && <p className={`text-xs ${textMuted} mb-1`}>{ev.time}{ev.duration ? ` — ${formatDuration(ev.duration)}` : ''}</p>}
              {client && <p className={`text-xs ${textMuted} mb-1`}>{client.nom} {client.prenom || ''}</p>}
              {(ev.recurrence && ev.recurrence !== 'never') && <p className={`text-xs ${textMuted} mb-1`}>🔁 {ev.recurrence === 'weekly' ? 'Chaque semaine' : 'Chaque mois'}</p>}
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white inline-block mt-1" style={{ background: getEventColor(ev) }}>
                {TYPE_LABELS[ev.type] || 'Événement'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Upcoming events */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
          <CalendarCheck size={18} style={{color: couleur}} /> Prochains événements
        </h3>
        {upcomingEvents.length === 0 ? (
          <div className={`text-center py-6 ${textMuted}`}>
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p>Aucun événement à venir</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm hover:underline" style={{ color: couleur }}>Créer un événement</button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.slice(0, 5).map(ev => {
              const TypeIcon = TYPE_ICONS[ev.type] || Calendar;
              const daysUntil = Math.ceil((new Date(ev.date) - new Date()) / 86400000);
              return (
                <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: getEventColor(ev) }}>
                    <TypeIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${textPrimary}`} title={ev.title}>{ev.title}</p>
                    <p className={`text-sm ${textMuted}`}>{new Date(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} {ev.time && `à ${ev.time}`}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${daysUntil === 0 ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : daysUntil <= 2 ? (isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700') : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600')}`}>
                    {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `${daysUntil}j`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips — dismissable, stored in localStorage */}
      {showTips && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className={`text-sm flex-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
            <p className="font-medium mb-1">Astuces</p>
            <ul className="space-y-1 text-xs opacity-80">
              <li>Cliquez sur un jour pour créer un événement</li>
              <li>Glissez-déposez pour déplacer un événement</li>
              <li>Les chantiers avec dates apparaissent automatiquement</li>
            </ul>
          </div>
          <button onClick={() => { setShowTips(false); try { localStorage.setItem('cp_planning_tips_dismissed', 'true'); } catch {} }} className={`p-1 rounded-lg flex-shrink-0 ${isDark ? 'hover:bg-blue-800' : 'hover:bg-blue-100'}`}>
            <X size={14} className="text-blue-400" />
          </button>
        </div>
      )}

      {/* Modal détail/édition - overlays on top of calendar */}
      {showDetail && (() => {
        const TypeIcon = TYPE_ICONS[showDetail.type] || Calendar;
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowDetail(null)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-md shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: showDetail.color || typeColors[showDetail.type] || couleur }}>
                      <TypeIcon size={20} />
                    </div>
                    <div>
                      <p className={`text-xs ${textMuted}`}>{TYPE_LABELS[showDetail.type] || 'Événement'}{(showDetail.recurrence && showDetail.recurrence !== 'never') || showDetail.isRecurrence ? ' · 🔁 Récurrent' : ''}</p>
                      <h2 className={`font-bold ${textPrimary}`}>{editMode ? 'Modifier' : showDetail.title}</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowDetail(null)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                    <X size={20} className={textMuted} />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {editMode ? (
                  <div className="space-y-4">
                    <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Titre *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Date *</label><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Heure</label><input type="time" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Durée</label>
                      <div className="flex flex-wrap gap-2">
                        {DURATIONS.map(d => (
                          <button key={d.value} type="button" onClick={() => setForm(p => ({...p, duration: d.value}))}
                            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${form.duration === d.value ? 'text-white shadow-md' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            style={form.duration === d.value ? { background: couleur } : {}}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`grid ${form.recurrence !== 'never' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Récurrence</label>
                        <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.recurrence} onChange={e => setForm(p => ({...p, recurrence: e.target.value}))}>
                          <option value="never">Jamais</option>
                          <option value="weekly">Chaque semaine</option>
                          <option value="monthly">Chaque mois</option>
                        </select>
                      </div>
                      {form.recurrence !== 'never' && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Jusqu'au</label>
                          <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.recurrenceEnd} onChange={e => setForm(p => ({...p, recurrenceEnd: e.target.value}))} />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Type</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="rdv">RDV Client</option><option value="chantier">Chantier</option><option value="memo">Mémo</option><option value="relance">Relance</option><option value="urgence">Urgence</option><option value="autre">Autre</option></select></div>
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Employé</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}><option value="">Aucun</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
                    </div>
                    {clients.length > 0 && (
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Client</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">— Aucun —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>)}</select></div>
                    )}
                    <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Notes</label><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className={textMuted} />
                        <span className={textPrimary}>{new Date(showDetail.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}{showDetail.dateEnd && showDetail.dateEnd !== showDetail.date && ` → ${new Date(showDetail.dateEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}</span>
                      </div>
                      {showDetail.time && (
                        <div className="flex items-center gap-3">
                          <Clock size={16} className={textMuted} />
                          <span className={textPrimary}>{showDetail.time}{showDetail.duration ? ` — ${formatDuration(showDetail.duration)}` : ''}</span>
                        </div>
                      )}
                      {showDetail.employeId && (
                        <div className="flex items-center gap-3">
                          <User size={16} className={textMuted} />
                          <span className={textPrimary}>{equipe.find(e => e.id === showDetail.employeId)?.nom || '-'}</span>
                        </div>
                      )}
                      {showDetail.clientId && (() => {
                        const client = clients.find(c => c.id === showDetail.clientId);
                        return client ? (
                          <div className="flex items-center gap-3">
                            <Building2 size={16} className={textMuted} />
                            <span className={textPrimary}>{client.nom} {client.prenom || ''}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {showDetail.description && (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <p className={`text-sm ${textSecondary} whitespace-pre-wrap`}>{showDetail.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'} rounded-b-2xl flex gap-3`}>
                {showDetail.isChantier ? (
                  <button onClick={() => goToChantier(showDetail.chantierId)} className="flex-1 px-4 py-2.5 text-white rounded-xl flex items-center justify-center gap-2 min-h-[44px]" style={{ background: couleur }}>
                    <Home size={16} /> Voir le chantier
                  </button>
                ) : editMode ? (
                  <>
                    <button onClick={() => setEditMode(false)} className={`flex-1 px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200'}`}>Annuler</button>
                    <button onClick={handleUpdateEvent} className="flex-1 px-4 py-2.5 text-white rounded-xl min-h-[44px]" style={{ background: couleur }}>Enregistrer</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleDeleteEvent(showDetail.id)} className={`px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
                      <Trash2 size={16} />
                    </button>
                    <button onClick={startEdit} className="flex-1 px-4 py-2.5 text-white rounded-xl flex items-center justify-center gap-2 min-h-[44px]" style={{ background: couleur }}>
                      <Edit3 size={16} /> Modifier
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
