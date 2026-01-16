import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, User, MapPin, X, Edit2, Trash2, AlertCircle, Info } from 'lucide-react';

export default function Planning({ events, setEvents, addEvent, chantiers, equipe, couleur, setPage, setSelectedChantier, updateChantier, isDark }) {
  const [date, setDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterEmploye, setFilterEmploye] = useState('');
  const [form, setForm] = useState({ title: '', date: '', time: '', type: 'rdv', employeId: '', description: '' });

  // Classes pour le thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const TYPE_LABELS = { chantier: '🏗️ Chantier', rdv: '📅 RDV', relance: '📞 Relance', urgence: '🚨 Urgence', autre: '📌 Autre' };

  const getChantierColor = (ch) => { 
    if (ch.statut === 'termine') return '#64748b'; 
    if (ch.statut === 'en_cours') return '#22c55e'; 
    return '#3b82f6'; 
  };
  const typeColors = { chantier: '#3b82f6', rdv: '#22c55e', relance: '#f97316', urgence: '#ef4444', autre: '#8b5cf6' };

  const getChantierEvents = () => chantiers.filter(ch => ch.date_debut).map(ch => ({ 
    id: `ch_${ch.id}`, title: ch.nom, date: ch.date_debut, dateEnd: ch.date_fin, type: 'chantier', 
    chantierId: ch.id, color: getChantierColor(ch), isChantier: true, description: ch.adresse || ''
  }));
  const allEvents = [...events, ...getChantierEvents()];

  const getEventsForDay = (day) => {
    if (!day) return [];
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter(e => { 
      if (filterEmploye && e.employeId !== filterEmploye) return false; 
      if (e.dateEnd) return d >= e.date && d <= e.dateEnd; 
      return e.date === d; 
    });
  };

  const handleEventClick = (e, ev) => { e.stopPropagation(); setShowDetail(ev); setEditMode(false); };
  const goToChantier = (chantierId) => { if (setSelectedChantier && setPage) { setSelectedChantier(chantierId); setPage('chantiers'); } };

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
    addEvent({ ...form, id: Date.now().toString() }); 
    setShowAdd(false); 
    setForm({ title: '', date: '', time: '', type: 'rdv', employeId: '', description: '' }); 
  };
  
  const deleteEvent = (id) => { 
    if (id.startsWith('ch_')) return; 
    if (confirm('Supprimer cet événement ?')) { setEvents(events.filter(e => e.id !== id)); setShowDetail(null); }
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

  // Modal détail/édition
  if (showDetail) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
      <div className={`rounded-2xl w-full max-w-md shadow-xl ${cardBg} border`} onClick={e => e.stopPropagation()}>
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: showDetail.color || typeColors[showDetail.type] || couleur }} />
              <h2 className={`font-bold text-lg ${textPrimary}`}>{editMode ? 'Modifier' : (TYPE_LABELS[showDetail.type] || 'Événement')}</h2>
            </div>
            <button onClick={() => setShowDetail(null)} className={`p-2 rounded-xl transition-colors ${hoverBg} ${textSecondary}`}>
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Titre *</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Date *</label>
                  <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Heure</label>
                  <input type="time" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Type</label>
                  <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    <option value="rdv">RDV</option>
                    <option value="relance">Relance</option>
                    <option value="urgence">Urgence</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Employé</label>
                  <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}>
                    <option value="">Aucun</option>
                    {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Description</label>
                <textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className={`text-xl font-bold ${textPrimary}`}>{showDetail.title}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className={textSecondary} />
                  <span className={`font-medium ${textPrimary}`}>
                    {new Date(showDetail.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {showDetail.dateEnd && showDetail.dateEnd !== showDetail.date && ` → ${new Date(showDetail.dateEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                  </span>
                </div>
                {showDetail.time && (
                  <div className="flex items-center gap-3">
                    <Clock size={16} className={textSecondary} />
                    <span className={`font-medium ${textPrimary}`}>{showDetail.time}</span>
                  </div>
                )}
                {showDetail.employeId && (
                  <div className="flex items-center gap-3">
                    <User size={16} className={textSecondary} />
                    <span className={`font-medium ${textPrimary}`}>{equipe.find(e => e.id === showDetail.employeId)?.nom || '-'}</span>
                  </div>
                )}
              </div>
              {showDetail.description && (
                <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{showDetail.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`p-4 border-t rounded-b-2xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex gap-3">
            {showDetail.isChantier ? (
              <button onClick={() => goToChantier(showDetail.chantierId)} className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{ background: couleur }}>
                🏗️ Voir le chantier
              </button>
            ) : editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
                  Annuler
                </button>
                <button onClick={updateEvent} className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{ background: couleur }}>
                  Enregistrer
                </button>
              </>
            ) : (
              <>
                <button onClick={() => deleteEvent(showDetail.id)} className={`px-4 py-2.5 rounded-xl transition-colors ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                  <Trash2 size={18} />
                </button>
                <button onClick={startEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{ background: couleur }}>
                  <Edit2 size={16} />
                  Modifier
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Formulaire création
  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShowAdd(false)} className={`p-2.5 rounded-xl transition-colors ${hoverBg} ${textPrimary}`}>
          <ChevronLeft size={20} />
        </button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Nouvel événement</h1>
      </div>
      
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Titre *</label>
            <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Ex: RDV client, Livraison..." />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Date *</label>
              <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Heure</label>
              <input type="time" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Type</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                <option value="rdv">RDV</option>
                <option value="relance">Relance</option>
                <option value="urgence">Urgence</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Employé</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}>
                <option value="">Tous</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Description</label>
            <textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Détails..." />
          </div>
        </div>
        
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setShowAdd(false)} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            Annuler
          </button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
            Créer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Planning</h1>
        <div className="flex gap-2">
          <select className={`px-4 py-2 border rounded-xl text-sm ${inputBg}`} value={filterEmploye} onChange={e => setFilterEmploye(e.target.value)}>
            <option value="">Tous</option>
            {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
            <Plus size={18} />
            Événement
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className={`flex gap-4 flex-wrap text-xs ${textSecondary}`}>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500"></span> À venir</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> En cours</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-400"></span> Terminé</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span> Urgence</span>
      </div>

      {/* Calendrier */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setDate(new Date(year, month - 1))} className={`p-2 rounded-xl transition-colors ${hoverBg}`}>
            <ChevronLeft size={20} className={textPrimary} />
          </button>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>{MOIS[month]} {year}</h2>
          <button onClick={() => setDate(new Date(year, month + 1))} className={`p-2 rounded-xl transition-colors ${hoverBg}`}>
            <ChevronRight size={20} className={textPrimary} />
          </button>
        </div>
        
        <div className={`grid grid-cols-7 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {JOURS.map(j => <div key={j} className={`py-2 text-center text-sm font-medium ${textSecondary}`}>{j}</div>)}
        </div>
        
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            return (
              <div 
                key={i} 
                className={`min-h-[100px] p-2 border-r border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} ${!day ? (isDark ? 'bg-slate-900' : 'bg-slate-50') : ''}`} 
                onDragOver={e => e.preventDefault()} 
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('eventId'); if (id && dateStr) moveEvent(id, dateStr); }}
              >
                {day && (
                  <>
                    <p className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'text-white' : textPrimary}`} style={isToday ? {background: couleur} : {}}>
                      {day}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div 
                          key={ev.id} 
                          onClick={(e) => handleEventClick(e, ev)} 
                          draggable 
                          onDragStart={e => e.dataTransfer.setData('eventId', ev.id)} 
                          className="text-xs px-2 py-1 rounded truncate text-white cursor-pointer hover:opacity-80 flex items-center gap-1 transition-opacity" 
                          style={{background: ev.color || typeColors[ev.type] || couleur}}
                        >
                          {ev.time && <span className="opacity-75">{ev.time}</span>}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && <p className={`text-xs cursor-pointer hover:underline ${textSecondary}`}>+{dayEvents.length - 3}</p>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochains événements */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
          <Calendar size={18} style={{color: couleur}} />
          Prochains événements
        </h3>
        {allEvents.filter(e => new Date(e.date) >= new Date()).length === 0 ? (
          <p className={`text-center py-4 ${textSecondary}`}>Aucun événement à venir</p>
        ) : (
          <div className="space-y-1">
            {allEvents.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8).map(ev => (
              <div 
                key={ev.id} 
                onClick={(e) => handleEventClick(e, ev)} 
                className={`flex items-center gap-4 py-3 border-b last:border-0 cursor-pointer rounded-xl px-2 transition-colors ${hoverBg} ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background: ev.color || typeColors[ev.type] || couleur}}></div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${textPrimary}`}>{ev.title}</p>
                  <p className={`text-sm ${textSecondary}`}>{new Date(ev.date).toLocaleDateString('fr-FR')} {ev.time && `à ${ev.time}`}</p>
                </div>
                <span className={textSecondary}>{ev.isChantier ? '🏗️' : <ChevronRight size={16} />}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <p>Glissez-déposez les blocs pour modifier les dates. Cliquez sur un événement pour voir ou modifier.</p>
      </div>
    </div>
  );
}
