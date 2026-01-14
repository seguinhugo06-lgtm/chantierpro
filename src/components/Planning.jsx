import React, { useState } from 'react';

export default function Planning({ events, setEvents, addEvent, chantiers, equipe, couleur, setPage, setSelectedChantier, updateChantier }) {
  const [date, setDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [filterEmploye, setFilterEmploye] = useState('');
  const [form, setForm] = useState({ title: '', date: '', time: '', type: 'rdv', employeId: '' });

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getChantierColor = (ch) => { if (ch.statut === 'termine') return '#64748b'; if (ch.statut === 'en_cours') return '#22c55e'; return '#3b82f6'; };
  const typeColors = { chantier: '#3b82f6', rdv: '#22c55e', relance: '#f97316', urgence: '#ef4444', autre: '#8b5cf6' };

  const getChantierEvents = () => chantiers.filter(ch => ch.date_debut).map(ch => ({ id: `ch_${ch.id}`, title: ch.nom, date: ch.date_debut, dateEnd: ch.date_fin, type: 'chantier', chantierId: ch.id, color: getChantierColor(ch), isChantier: true }));
  const allEvents = [...events, ...getChantierEvents()];

  const getEventsForDay = (day) => {
    if (!day) return [];
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter(e => { if (filterEmploye && e.employeId !== filterEmploye) return false; if (e.dateEnd) return d >= e.date && d <= e.dateEnd; return e.date === d; });
  };

  const handleEventClick = (e, ev) => { e.stopPropagation(); if (ev.isChantier && ev.chantierId && setSelectedChantier && setPage) { setSelectedChantier(ev.chantierId); setPage('chantiers'); } };

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

  const submit = () => { if (!form.title || !form.date) return; addEvent(form); setShowAdd(false); setForm({ title: '', date: '', time: '', type: 'rdv', employeId: '' }); };
  const deleteEvent = (id) => { if (id.startsWith('ch_')) return; if (confirm('Supprimer ?')) setEvents(events.filter(e => e.id !== id)); };

  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouvel événement</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Titre *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium mb-1">Date *</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className="block text-sm font-medium mb-1">Heure</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
            <div><label className="block text-sm font-medium mb-1">Type</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="rdv">RDV</option><option value="relance">Relance</option><option value="urgence">Urgence</option><option value="autre">Autre</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Employé</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}><option value="">Tous</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Planning</h1>
        <div className="flex gap-2">
          <select className="px-4 py-2 border rounded-xl text-sm" value={filterEmploye} onChange={e => setFilterEmploye(e.target.value)}><option value="">Tous</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Événement</button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap text-xs">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500"></span> À venir</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> En cours</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-400"></span> Terminé</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span> Urgence</span>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button onClick={() => setDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <h2 className="text-lg font-semibold">{MOIS[month]} {year}</h2>
          <button onClick={() => setDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-100 rounded-xl text-xl">→</button>
        </div>
        <div className="grid grid-cols-7 border-b">{JOURS.map(j => <div key={j} className="py-2 text-center text-sm font-medium text-slate-500">{j}</div>)}</div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            return (
              <div key={i} className={`min-h-[100px] p-2 border-r border-b ${!day ? 'bg-slate-50' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('eventId'); if (id && dateStr) moveEvent(id, dateStr); }}>
                {day && (<>
                  <p className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'text-white' : ''}`} style={isToday ? {background: couleur} : {}}>{day}</p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} draggable onDragStart={e => e.dataTransfer.setData('eventId', ev.id)} className="text-xs px-2 py-1 rounded truncate text-white cursor-pointer hover:opacity-80 flex items-center gap-1" style={{background: ev.color || typeColors[ev.type] || couleur}}>
                        {ev.time && <span className="opacity-75">{ev.time}</span>}
                        <span className="truncate">{ev.title}</span>
                        {ev.isChantier && <span className="ml-auto text-[10px]">→</span>}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <p className="text-xs text-slate-500">+{dayEvents.length - 3}</p>}
                  </div>
                </>)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="font-semibold mb-4">📅 Prochains événements</h3>
        {allEvents.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8).map(ev => (
          <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className="flex items-center gap-4 py-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 rounded-xl px-2">
            <div className="w-3 h-3 rounded-full" style={{background: ev.color || typeColors[ev.type] || couleur}}></div>
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{ev.title}</p><p className="text-sm text-slate-500">{new Date(ev.date).toLocaleDateString('fr-FR')} {ev.time && `à ${ev.time}`}</p></div>
            {ev.isChantier ? <span className="text-slate-400">→</span> : <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }} className="text-red-400">🗑️</button>}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">💡 Glissez-déposez les blocs pour modifier les dates. Cliquez sur un chantier pour voir ses détails.</div>
    </div>
  );
}
