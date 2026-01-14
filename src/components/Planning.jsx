import React, { useState } from 'react';

export default function Planning({ events, setEvents, addEvent, chantiers, equipe, couleur }) {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', type: 'rdv' });

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const d = new Date(year, month, day).toISOString().split('T')[0];
    return events.filter(e => e.date === d);
  };

  const submit = () => {
    if (!form.title || !form.date) return;
    addEvent(form);
    setShowAdd(false);
    setForm({ title: '', date: '', time: '', type: 'rdv' });
  };

  const deleteEvent = (id) => {
    if (confirm('Supprimer ?')) setEvents(events.filter(e => e.id !== id));
  };

  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const typeColors = { chantier: '#3b82f6', rdv: '#22c55e', relance: '#f97316', autre: '#8b5cf6' };

  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouvel événement</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Titre *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Date *</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className="block text-sm font-medium mb-1">Heure</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
            <div><label className="block text-sm font-medium mb-1">Type</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="rdv">RDV</option><option value="chantier">Chantier</option><option value="relance">Relance</option><option value="autre">Autre</option></select></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Planning</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Événement</button>
      </div>

      <div className="bg-white rounded-2xl border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button onClick={() => setDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
          <h2 className="text-lg font-semibold">{MOIS[month]} {year}</h2>
          <button onClick={() => setDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-100 rounded-xl">→</button>
        </div>
        <div className="grid grid-cols-7 border-b">
          {JOURS.map(j => <div key={j} className="py-2 text-center text-sm font-medium text-slate-500">{j}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
            return (
              <div key={i} className={`min-h-[100px] p-2 border-r border-b ${!day ? 'bg-slate-50' : ''}`}>
                {day && (
                  <>
                    <p className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'text-white' : ''}`} style={isToday ? {background: couleur} : {}}>{day}</p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} onClick={() => deleteEvent(e.id)} className="text-xs px-2 py-1 rounded truncate text-white cursor-pointer" style={{background: typeColors[e.type] || couleur}}>
                          {e.time && <span className="opacity-75">{e.time} </span>}{e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <p className="text-xs text-slate-500">+{dayEvents.length - 3}</p>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="font-semibold mb-4">📅 Prochains événements</h3>
        {events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5).map(e => (
          <div key={e.id} className="flex items-center gap-4 py-3 border-b last:border-0">
            <div className="w-3 h-3 rounded-full" style={{background: typeColors[e.type] || couleur}}></div>
            <div className="flex-1">
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-slate-500">{new Date(e.date).toLocaleDateString('fr-FR')} {e.time && `à ${e.time}`}</p>
            </div>
            <button onClick={() => deleteEvent(e.id)} className="text-red-400 hover:text-red-600">🗑️</button>
          </div>
        ))}
        {events.filter(e => new Date(e.date) >= new Date()).length === 0 && <p className="text-slate-500 text-center py-4">Aucun événement à venir</p>}
      </div>
    </div>
  );
}
