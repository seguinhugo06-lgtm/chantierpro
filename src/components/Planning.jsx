import React, { useState, useEffect } from 'react';

const TYPES = { rdv: { label: 'RDV', color: 'bg-blue-500' }, chantier: { label: 'Chantier', color: 'bg-green-500' }, relance: { label: 'Relance', color: 'bg-amber-500' } };

export default function Planning({ events, setEvents, addEvent, chantiers }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '09:00', type: 'rdv', chantierId: '' });

  useEffect(() => { if (show) setForm(p => ({ ...p, date: selected.toISOString().split('T')[0] })); }, [show, selected]);

  const getDays = () => {
    const y = month.getFullYear(), m = month.getMonth();
    const days = [];
    const start = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < start; i++) days.push(null);
    for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push(new Date(y, m, i));
    return days;
  };

  const submit = () => {
    if (!form.title) return;
    addEvent(form);
    setShow(false);
    setForm({ title: '', date: '', time: '09:00', type: 'rdv', chantierId: '' });
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
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Titre *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Heure</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Chantier lié</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Créer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Planning</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Événement</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
            <h3 className="font-semibold capitalize">{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-xl">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDays().map((d, i) => d ? (() => {
              const dateStr = d.toISOString().split('T')[0];
              const dayEvents = events.filter(e => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selStr;
              return (
                <button key={i} onClick={() => setSelected(d)} className={`min-h-[60px] p-1 rounded-xl text-sm flex flex-col items-center ${isSel ? 'bg-orange-500 text-white' : isToday ? 'bg-orange-100' : 'hover:bg-slate-100'}`}>
                  <span className="font-medium">{d.getDate()}</span>
                  {dayEvents.length > 0 && <div className="flex gap-0.5 mt-1">{dayEvents.slice(0,3).map((e,j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : TYPES[e.type]?.color || 'bg-blue-500'}`} />)}</div>}
                </button>
              );
            })() : <div key={i} />)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold">{selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          </div>
          <div className="p-4">
            {selEvents.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucun événement</p>
            ) : (
              <div className="space-y-3">
                {selEvents.map(e => (
                  <div key={e.id} className={`p-3 rounded-xl border-l-4 bg-slate-50 ${TYPES[e.type]?.color.replace('bg-', 'border-')}`}>
                    <div className="flex justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${TYPES[e.type]?.color}`}>{TYPES[e.type]?.label}</span>
                      <button onClick={() => setEvents(events.filter(x => x.id !== e.id))} className="text-red-500">✕</button>
                    </div>
                    <p className="font-medium mt-1">{e.title}</p>
                    <p className="text-sm text-slate-500">{e.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
