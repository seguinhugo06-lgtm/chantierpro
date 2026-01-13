import React, { useState } from 'react';

const ROLES = { ouvrier: 'Ouvrier', chef: 'Chef', apprenti: 'Apprenti', admin: 'Admin' };

export default function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers }) {
  const [tab, setTab] = useState('liste');
  const [show, setShow] = useState(false);
  const [showP, setShowP] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', role: 'ouvrier', telephone: '', tauxHoraire: '' });
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heureDebut: '08:00', heureFin: '17:00', pause: 60 });

  const calcH = (d, f, p) => {
    const [hd, md] = d.split(':').map(Number);
    const [hf, mf] = f.split(':').map(Number);
    return Math.max(0, ((hf * 60 + mf) - (hd * 60 + md) - (p || 0)) / 60);
  };

  const getHM = (id) => pointages.filter(p => p.employeId === id && new Date(p.date).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.heures || 0), 0);

  const submitE = () => {
    if (!form.nom) return;
    setEquipe([...equipe, { id: Date.now().toString(), ...form, tauxHoraire: parseFloat(form.tauxHoraire) || 0 }]);
    setShow(false);
    setForm({ nom: '', prenom: '', role: 'ouvrier', telephone: '', tauxHoraire: '' });
  };

  const submitP = () => {
    if (!pForm.employeId) return;
    setPointages([...pointages, { id: Date.now().toString(), ...pForm, heures: calcH(pForm.heureDebut, pForm.heureFin, pForm.pause) }]);
    setShowP(false);
  };

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouveau membre</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Rôle</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Taux (€/h)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submitE} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button>
        </div>
      </div>
    </div>
  );

  if (showP) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShowP(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Saisir pointage</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Employé *</label><select className="w-full px-4 py-2.5 border rounded-xl" value={pForm.employeId} onChange={e => setPForm(p => ({...p, employeId: e.target.value}))}><option value="">Sélectionner...</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Chantier</label><select className="w-full px-4 py-2.5 border rounded-xl" value={pForm.chantierId} onChange={e => setPForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.date} onChange={e => setPForm(p => ({...p, date: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Pause (min)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.pause} onChange={e => setPForm(p => ({...p, pause: parseInt(e.target.value) || 0}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Début</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.heureDebut} onChange={e => setPForm(p => ({...p, heureDebut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Fin</label><input type="time" className="w-full px-4 py-2.5 border rounded-xl" value={pForm.heureFin} onChange={e => setPForm(p => ({...p, heureFin: e.target.value}))} /></div>
        </div>
        <div className="mt-4 p-4 bg-orange-50 rounded-xl">
          <p className="text-sm text-orange-800">⏱️ Heures: <span className="font-bold">{calcH(pForm.heureDebut, pForm.heureFin, pForm.pause).toFixed(1)}h</span></p>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShowP(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submitP} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Enregistrer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Équipe & Pointage</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowP(true)} className="px-4 py-2 bg-slate-100 rounded-xl">⏱️ Pointage</button>
          <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Membre</button>
        </div>
      </div>
      <div className="flex gap-2 border-b pb-2">
        {[['liste', '👥 Équipe'], ['pointages', '⏱️ Pointages']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>
        ))}
      </div>
      {tab === 'liste' ? (
        equipe.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👷</p><h3>Aucun membre</h3></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipe.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold">{m.nom?.[0]}{m.prenom?.[0]}</div>
                  <div><h3 className="font-semibold">{m.nom} {m.prenom}</h3><p className="text-sm text-slate-500">{ROLES[m.role]}</p></div>
                </div>
                {m.telephone && <p className="text-sm text-slate-500">📱 {m.telephone}</p>}
                {m.tauxHoraire > 0 && <p className="text-sm text-slate-500">💰 {m.tauxHoraire} €/h</p>}
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="text-sm text-slate-500">Ce mois</span>
                  <span className="font-bold text-orange-500">{getHM(m.id).toFixed(1)}h</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          {pointages.length === 0 ? (
            <p className="p-8 text-center text-slate-500">Aucun pointage</p>
          ) : (
            [...pointages].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(p => {
              const emp = equipe.find(e => e.id === p.employeId);
              const ch = chantiers.find(c => c.id === p.chantierId);
              return (
                <div key={p.id} className="flex items-center px-5 py-3 border-b gap-4">
                  <span className="w-28 font-medium">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                  <span className="flex-1">{emp?.nom} {emp?.prenom}</span>
                  <span className="flex-1 text-slate-500">{ch?.nom || '-'}</span>
                  <span className="w-24 text-sm">{p.heureDebut} - {p.heureFin}</span>
                  <span className="w-20 text-right font-bold text-orange-500">{(p.heures || 0).toFixed(1)}h</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
