import React, { useState, useEffect } from 'react';

const TYPES = { rdv: { label: 'RDV', color: '#3b82f6' }, chantier: { label: 'Chantier', color: '#22c55e' }, relance: { label: 'Relance', color: '#f59e0b' } };

export default function Planning({ events, setEvents, addEvent, chantiers, equipe, couleur }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '09:00', type: 'rdv', employeId: '' });

  useEffect(() => { if (show) setForm(p => ({ ...p, date: selected.toISOString().split('T')[0] })); }, [show, selected]);

  const getDays = () => {
    const y = month.getFullYear(), m = month.getMonth(), days = [];
    const start = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < start; i++) days.push(null);
    for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push(new Date(y, m, i));
    return days;
  };

  const submit = () => {
    if (!form.title) return;
    addEvent(form);
    setShow(false);
    setForm({ title: '', date: '', time: '09:00', type: 'rdv', employeId: '' });
  };

  const selStr = selected.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const selEvents = events.filter(e => e.date === selStr);

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouvel événement</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titre *</label>
            <input className="w-full px-4 py-2.5 border rounded-xl" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Ex: RDV client Dupont" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employé</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.employeId} onChange={e => setForm(p => ({...p, employeId: e.target.value}))}>
                <option value="">Tous</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heure</label>
              <input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Planning</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Événement</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendrier */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
            <h3 className="font-semibold capitalize">{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-xl text-xl">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDays().map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = d.toISOString().split('T')[0];
              const dayEvents = events.filter(e => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selStr;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={`min-h-[60px] p-1 rounded-xl text-sm flex flex-col items-center ${isSel ? 'text-white' : isToday ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                  style={isSel ? {background: couleur} : {}}
                >
                  <span className="font-medium">{d.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <span key={j} className="w-1.5 h-1.5 rounded-full" style={{background: isSel ? 'white' : TYPES[e.type]?.color}} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Événements du jour */}
        <div className="bg-white rounded-2xl border">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold">{selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          </div>
          <div className="p-4">
            {selEvents.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucun événement</p>
            ) : (
              <div className="space-y-3">
                {selEvents.map(e => {
                  const emp = equipe.find(x => x.id === e.employeId);
                  return (
                    <div key={e.id} className="p-3 rounded-xl bg-slate-50 border-l-4" style={{borderColor: TYPES[e.type]?.color}}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{e.title}</p>
                          <p className="text-sm text-slate-500">{e.time} {emp && `• ${emp.nom}`}</p>
                        </div>
                        <button onClick={() => setEvents(events.filter(x => x.id !== e.id))} className="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vue semaine simplifiée */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="font-semibold mb-4">📅 Cette semaine</h3>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - d.getDay() + 1 + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateStr);
            return (
              <div key={i} className={`p-3 rounded-xl text-center ${dateStr === todayStr ? 'bg-orange-50' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                <p className="font-bold">{d.getDate()}</p>
                <p className="text-xs mt-1" style={{color: couleur}}>{dayEvents.length > 0 ? `${dayEvents.length} évt` : '-'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
