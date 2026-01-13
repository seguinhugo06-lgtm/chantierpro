import React, { useState, useEffect } from 'react';

export default function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers, couleur }) {
  const [tab, setTab] = useState('pointage');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', tauxHoraire: '' });
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '' });
  
  // Chronomètre
  const [chrono, setChrono] = useState({ running: false, start: null, employeId: '', chantierId: '' });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (chrono.running && chrono.start) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - chrono.start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [chrono.running, chrono.start]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startChrono = () => {
    if (!chrono.employeId) return alert('Sélectionnez un employé');
    setChrono(p => ({ ...p, running: true, start: Date.now() }));
  };

  const stopChrono = () => {
    if (!chrono.running) return;
    const heures = elapsed / 3600;
    if (heures > 0.1) {
      setPointages([...pointages, {
        id: Date.now().toString(),
        employeId: chrono.employeId,
        chantierId: chrono.chantierId,
        date: new Date().toISOString().split('T')[0],
        heures: Math.round(heures * 10) / 10
      }]);
    }
    setChrono({ running: false, start: null, employeId: '', chantierId: '' });
    setElapsed(0);
  };

  const addPointageManuel = () => {
    if (!pForm.employeId || !pForm.heures) return;
    setPointages([...pointages, {
      id: Date.now().toString(),
      ...pForm,
      heures: parseFloat(pForm.heures)
    }]);
    setPForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '' });
  };

  const addEmploye = () => {
    if (!form.nom) return;
    setEquipe([...equipe, { id: Date.now().toString(), ...form, tauxHoraire: parseFloat(form.tauxHoraire) || 35 }]);
    setShowAdd(false);
    setForm({ nom: '', prenom: '', telephone: '', tauxHoraire: '' });
  };

  const getHeuresMois = (empId) => {
    const now = new Date();
    return pointages
      .filter(p => p.employeId === empId && new Date(p.date).getMonth() === now.getMonth())
      .reduce((s, p) => s + (p.heures || 0), 0);
  };

  const getTotalMois = () => {
    const now = new Date();
    return pointages
      .filter(p => new Date(p.date).getMonth() === now.getMonth())
      .reduce((s, p) => s + (p.heures || 0), 0);
  };

  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouvel employé</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Taux horaire (€)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} placeholder="35" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={addEmploye} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Équipe & Heures</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Employé</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[['pointage', '⏱️ Pointage'], ['equipe', '👷 Équipe'], ['historique', '📋 Historique']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>
        ))}
      </div>

      {/* Pointage */}
      {tab === 'pointage' && (
        <div className="space-y-6">
          {/* Chronomètre */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">⏱️ Chronomètre</h3>
            <div className="text-center mb-6">
              <p className="text-5xl font-mono font-bold" style={{color: chrono.running ? couleur : '#64748b'}}>{formatTime(elapsed)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select className="px-4 py-2.5 border rounded-xl" value={chrono.employeId} onChange={e => setChrono(p => ({...p, employeId: e.target.value}))} disabled={chrono.running}>
                <option value="">Employé *</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
              </select>
              <select className="px-4 py-2.5 border rounded-xl" value={chrono.chantierId} onChange={e => setChrono(p => ({...p, chantierId: e.target.value}))} disabled={chrono.running}>
                <option value="">Chantier</option>
                {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="flex justify-center gap-4">
              {!chrono.running ? (
                <button onClick={startChrono} className="px-8 py-3 text-white rounded-xl text-lg" style={{background: couleur}}>▶️ Démarrer</button>
              ) : (
                <button onClick={stopChrono} className="px-8 py-3 bg-red-500 text-white rounded-xl text-lg">⏹️ Arrêter & Enregistrer</button>
              )}
            </div>
          </div>

          {/* Saisie manuelle */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">✏️ Saisie manuelle</h3>
            <div className="flex gap-3 flex-wrap">
              <select className="flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl" value={pForm.employeId} onChange={e => setPForm(p => ({...p, employeId: e.target.value}))}>
                <option value="">Employé *</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <select className="flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl" value={pForm.chantierId} onChange={e => setPForm(p => ({...p, chantierId: e.target.value}))}>
                <option value="">Chantier</option>
                {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <input type="date" className="px-4 py-2.5 border rounded-xl" value={pForm.date} onChange={e => setPForm(p => ({...p, date: e.target.value}))} />
              <input type="number" step="0.5" placeholder="Heures" className="w-24 px-4 py-2.5 border rounded-xl" value={pForm.heures} onChange={e => setPForm(p => ({...p, heures: e.target.value}))} />
              <button onClick={addPointageManuel} className="px-6 py-2.5 text-white rounded-xl" style={{background: couleur}}>Ajouter</button>
            </div>
          </div>

          {/* Résumé du mois */}
          <div className="bg-slate-50 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">📊 Ce mois</h3>
            <p className="text-3xl font-bold" style={{color: couleur}}>{getTotalMois().toFixed(1)}h</p>
            <p className="text-slate-500">Total équipe</p>
          </div>
        </div>
      )}

      {/* Équipe */}
      {tab === 'equipe' && (
        equipe.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-5xl mb-4">👷</p>
            <h3 className="font-semibold mb-2">Pas d'employé</h3>
            <p className="text-slate-500">Ajoutez votre équipe</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipe.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{background: couleur}}>
                    {e.nom?.[0]}{e.prenom?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold">{e.nom} {e.prenom}</h3>
                    {e.telephone && <p className="text-sm text-slate-500">{e.telephone}</p>}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold" style={{color: couleur}}>{getHeuresMois(e.id).toFixed(1)}h</p>
                    <p className="text-xs text-slate-500">ce mois</p>
                  </div>
                  <p className="text-slate-500">{e.tauxHoraire || 35}€/h</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Historique */}
      {tab === 'historique' && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          {pointages.length === 0 ? (
            <p className="p-8 text-center text-slate-500">Aucun pointage</p>
          ) : (
            [...pointages].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30).map(p => {
              const emp = equipe.find(e => e.id === p.employeId);
              const ch = chantiers.find(c => c.id === p.chantierId);
              return (
                <div key={p.id} className="flex items-center px-5 py-3 border-b gap-4">
                  <span className="w-24 font-medium">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                  <span className="flex-1">{emp?.nom || '?'} {emp?.prenom || ''}</span>
                  <span className="flex-1 text-slate-500">{ch?.nom || '-'}</span>
                  <span className="w-20 text-right font-bold" style={{color: couleur}}>{(p.heures || 0).toFixed(1)}h</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
