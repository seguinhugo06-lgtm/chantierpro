import React, { useState } from 'react';
import { Plus, ArrowLeft, Calendar, Clock, User, MapPin, X, Edit3, Trash2, Check, ChevronLeft, ChevronRight, AlertCircle, CalendarDays, Bell, Home, Briefcase, Phone, RefreshCw, Zap, CalendarCheck, Filter, Info } from 'lucide-react';
import { useConfirm } from '../context/AppContext';
import { generateId } from '../lib/utils';

export default function Planning({ events, setEvents, addEvent, chantiers, equipe, couleur, setPage, setSelectedChantier, updateChantier, isDark }) {
  const { confirm } = useConfirm();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterEmploye, setFilterEmploye] = useState('');
  const [filterType, setFilterType] = useState('');
  const [quickAdd, setQuickAdd] = useState(null); // Date string for quick add
  const [form, setForm] = useState({ title: '', date: '', time: '', type: 'rdv', employeId: '', description: '' });

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

  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const JOURS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const TYPE_LABELS = { chantier: 'Chantier', rdv: 'RDV Client', relance: 'Relance', urgence: 'Urgence', autre: 'Autre' };
  const TYPE_ICONS = { chantier: Home, rdv: User, relance: Phone, urgence: Zap, autre: Calendar };

  const getChantierColor = (ch) => { if (ch.statut === 'termine') return '#64748b'; if (ch.statut === 'en_cours') return '#22c55e'; return '#3b82f6'; };
  const typeColors = { chantier: '#3b82f6', rdv: '#22c55e', relance: '#f97316', urgence: '#ef4444', autre: '#8b5cf6' };

  const getChantierEvents = () => chantiers.filter(ch => ch.date_debut).map(ch => ({
    id: `ch_${ch.id}`, title: ch.nom, date: ch.date_debut, dateEnd: ch.date_fin, type: 'chantier',
    chantierId: ch.id, color: getChantierColor(ch), isChantier: true, description: ch.adresse || ''
  }));
  const allEvents = [...events, ...getChantierEvents()];

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

  const getEventsForDate = (dateObj) => {
    const d = dateObj.toISOString().split('T')[0];
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
      const newDateEnd = duration > 0 ? new Date(new Date(newDate).getTime() + duration * 86400000).toISOString().split('T')[0] : '';
      updateChantier(ev.chantierId, { date_debut: newDate, date_fin: newDateEnd });
    } else {
      setEvents(events.map(e => e.id === eventId ? { ...e, date: newDate } : e));
    }
  };

  const submit = () => {
    if (!form.title || !form.date) return;
    addEvent({ ...form, id: generateId() });
    setShowAdd(false);
    setQuickAdd(null);
    setForm({ title: '', date: '', time: '', type: 'rdv', employeId: '', description: '' });
  };

  const deleteEvent = async (id) => {
    if (id.startsWith('ch_')) return;
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cet événement ?' });
    if (confirmed) { setEvents(events.filter(e => e.id !== id)); setShowDetail(null); }
  };

  const updateEvent = () => {
    if (!showDetail || showDetail.isChantier) return;
    setEvents(events.map(e => e.id === showDetail.id ? { ...e, ...form } : e));
    setShowDetail(null); setEditMode(false);
    setForm({ title: '', date: '', time: '', type: 'rdv', employeId: '', description: '' });
  };

  const startEdit = () => {
    setForm({ title: showDetail.title || '', date: showDetail.date || '', time: showDetail.time || '',
      type: showDetail.type || 'rdv', employeId: showDetail.employeId || '', description: showDetail.description || '' });
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
        <button onClick={() => { setShowAdd(false); setQuickAdd(null); setForm({ title: '', date: '', time: '', type: 'rdv', employeId: '', description: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Nouvel événement</h1>
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
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Assigner à</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}><option value="">Moi-même</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
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
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = getEventsForDay(todayStr);
  const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Planning</h1>
          <p className={`text-sm ${textMuted}`}>{todayEvents.length} événement{todayEvents.length > 1 ? 's' : ''} aujourd'hui</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="px-3 sm:px-4 py-2.5 text-white rounded-xl flex items-center gap-1.5 min-h-[44px] hover:shadow-lg transition-all" style={{background: couleur}}>
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
          <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-sm ${viewMode === 'month' ? 'text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`} style={viewMode === 'month' ? { background: couleur } : {}}>Mois</button>
          <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-sm ${viewMode === 'week' ? 'text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`} style={viewMode === 'week' ? { background: couleur } : {}}>Semaine</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 sm:gap-4 flex-wrap text-xs">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setFilterType(filterType === key ? '' : key)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterType === key ? 'ring-2 ring-offset-1' : ''}`} style={filterType === key ? { ringColor: typeColors[key] } : {}}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: typeColors[key] }}></span>
            <span className={textMuted}>{label}</span>
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setDate(viewMode === 'month' ? new Date(year, month - 1) : new Date(date.getTime() - 7 * 86400000))} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronLeft size={20} className={textPrimary} />
          </button>
          <h2 className={`text-base sm:text-lg font-semibold ${textPrimary}`}>
            {viewMode === 'month' ? `${MOIS[month]} ${year}` : `Semaine du ${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
          </h2>
          <button onClick={() => setDate(viewMode === 'month' ? new Date(year, month + 1) : new Date(date.getTime() + 7 * 86400000))} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronRight size={20} className={textPrimary} />
          </button>
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
                      <p className={`text-xs sm:text-sm font-medium mb-1 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'text-white' : textPrimary}`} style={isToday ? {background: couleur} : {}}>{day}</p>
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayEvents.slice(0, 2).map(ev => {
                          const TypeIcon = TYPE_ICONS[ev.type] || Calendar;
                          return (
                            <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} draggable onDragStart={e => e.dataTransfer.setData('eventId', ev.id)} className="group text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded-md sm:rounded-lg text-white cursor-pointer hover:scale-105 hover:shadow-md transition-all flex items-center gap-1" style={{background: ev.color || typeColors[ev.type] || couleur}} title={ev.title}>
                              <TypeIcon size={10} className="opacity-75 flex-shrink-0 hidden sm:block" />
                              <span className="truncate font-medium">{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && <p className={`text-[10px] sm:text-xs ${textMuted} cursor-pointer hover:underline`}>+{dayEvents.length - 2}</p>}
                      </div>
                    </>)}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          // Week view
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {weekDays.map((dayDate, i) => {
              const dayEvents = getEventsForDate(dayDate);
              const isToday = dayDate.toDateString() === new Date().toDateString();
              const dateStr = dayDate.toISOString().split('T')[0];
              return (
                <div key={i} className={`flex ${isToday ? (isDark ? 'bg-slate-700/30' : 'bg-blue-50/50') : ''}`}>
                  <div className={`w-20 sm:w-28 p-3 flex-shrink-0 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <p className={`text-xs ${textMuted}`}>{JOURS_FULL[i].slice(0, 3)}</p>
                    <p className={`text-lg sm:text-xl font-bold ${isToday ? '' : textPrimary}`} style={isToday ? { color: couleur } : {}}>{dayDate.getDate()}</p>
                  </div>
                  <div className="flex-1 p-2 min-h-[80px]" onClick={() => handleQuickAdd(dateStr)}>
                    {dayEvents.length === 0 ? (
                      <p className={`text-xs ${textMuted} py-2`}>Aucun événement</p>
                    ) : (
                      <div className="space-y-1">
                        {dayEvents.map(ev => {
                          const TypeIcon = TYPE_ICONS[ev.type] || Calendar;
                          return (
                            <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: ev.color || typeColors[ev.type] || couleur }}>
                                <TypeIcon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${textPrimary}`}>{ev.title}</p>
                                {ev.time && <p className={`text-xs ${textMuted}`}>{ev.time}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: ev.color || typeColors[ev.type] || couleur }}>
                    <TypeIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${textPrimary}`}>{ev.title}</p>
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

      {/* Tips */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
          <p className="font-medium mb-1">Astuces</p>
          <ul className="space-y-1 text-xs opacity-80">
            <li>Cliquez sur un jour pour créer un événement</li>
            <li>Glissez-déposez pour déplacer un événement</li>
            <li>Les chantiers avec dates apparaissent automatiquement</li>
          </ul>
        </div>
      </div>

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
                      <p className={`text-xs ${textMuted}`}>{TYPE_LABELS[showDetail.type] || 'Événement'}</p>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Type</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="rdv">RDV Client</option><option value="relance">Relance</option><option value="urgence">Urgence</option><option value="autre">Autre</option></select></div>
                      <div><label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Employé</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}><option value="">Aucun</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
                    </div>
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
                          <span className={textPrimary}>{showDetail.time}</span>
                        </div>
                      )}
                      {showDetail.employeId && (
                        <div className="flex items-center gap-3">
                          <User size={16} className={textMuted} />
                          <span className={textPrimary}>{equipe.find(e => e.id === showDetail.employeId)?.nom || '-'}</span>
                        </div>
                      )}
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
                    <button onClick={updateEvent} className="flex-1 px-4 py-2.5 text-white rounded-xl min-h-[44px]" style={{ background: couleur }}>Enregistrer</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => deleteEvent(showDetail.id)} className={`px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
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
