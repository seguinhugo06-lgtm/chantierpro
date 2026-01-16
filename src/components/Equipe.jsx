import { Users, Plus, Phone, Clock, DollarSign, Check, X, Trash2, TrendingUp, Calendar, Edit, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers, couleur, isDark }) {
  // Variables thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const btnSecondary = isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
  const [tab, setTab] = useState('pointage');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', tauxHoraire: '', coutHoraireCharge: '' });
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [chrono, setChrono] = useState({ running: false, start: null, employeId: '', chantierId: '' });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { let i; if (chrono.running && chrono.start) i = setInterval(() => setElapsed(Math.floor((Date.now() - chrono.start) / 1000)), 1000); return () => clearInterval(i); }, [chrono.running, chrono.start]);

  const formatTime = (s) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const getWeekDates = () => { const now = new Date(); const day = now.getDay() || 7; const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1); const end = new Date(start.getTime() + 6 * 86400000); return { start, end }; };
  const { start: weekStart, end: weekEnd } = getWeekDates();
  const weekPointages = pointages.filter(p => { const d = new Date(p.date); return d >= weekStart && d <= weekEnd; });
  const totalWeekHours = weekPointages.reduce((s, p) => s + (p.heures || 0), 0);
  const approvedWeekHours = weekPointages.filter(p => p.approuve).reduce((s, p) => s + (p.heures || 0), 0);
  const pointagesEnAttente = pointages.filter(p => !p.approuve && !p.verrouille);

  const startChrono = () => { if (!chrono.employeId) return alert('Sélectionnez un employé'); setChrono(p => ({ ...p, running: true, start: Date.now() })); };
  const stopChrono = (note = '') => {
    if (!chrono.running) return;
    const heures = elapsed / 3600;
    if (heures > 0.1) setPointages([...pointages, { id: Date.now().toString(), employeId: chrono.employeId, chantierId: chrono.chantierId, date: new Date().toISOString().split('T')[0], heures: Math.round(heures * 10) / 10, approuve: false, manuel: false, verrouille: false, note }]);
    setChrono({ running: false, start: null, employeId: '', chantierId: '' }); setElapsed(0);
  };

  const addPointageManuel = () => {
    if (!pForm.employeId || !pForm.heures) return;
    setPointages([...pointages, { id: Date.now().toString(), ...pForm, heures: parseFloat(pForm.heures), approuve: false, manuel: true, verrouille: false }]);
    setPForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  };

  const approuverPointage = (id) => setPointages(pointages.map(p => p.id === id ? { ...p, approuve: true } : p));
  const approuverTout = () => setPointages(pointages.map(p => weekPointages.find(wp => wp.id === p.id && !p.verrouille) ? { ...p, approuve: true } : p));
  const rejeterPointage = (id) => { if (confirm('Supprimer ?')) setPointages(pointages.filter(p => p.id !== id)); };
  
  // Valider et verrouiller la semaine
  const validerSemaine = () => {
    if (!confirm('Valider et verrouiller les heures de la semaine ? Cette action est irréversible.')) return;
    setPointages(pointages.map(p => weekPointages.find(wp => wp.id === p.id) ? { ...p, approuve: true, verrouille: true } : p));
  };

  // Edition d'un pointage
  const updatePointage = (id, field, value) => {
    setPointages(pointages.map(p => {
      if (p.id !== id || p.verrouille) return p;
      return { ...p, [field]: field === 'heures' ? parseFloat(value) || 0 : value };
    }));
  };

  const addEmploye = () => {
    if (!form.nom) return;
    const data = { id: editId || Date.now().toString(), ...form, tauxHoraire: parseFloat(form.tauxHoraire) || 45, coutHoraireCharge: parseFloat(form.coutHoraireCharge) || parseFloat(form.tauxHoraire) * 0.6 || 28 };
    if (editId) setEquipe(equipe.map(e => e.id === editId ? data : e));
    else setEquipe([...equipe, data]);
    setShowAdd(false); setEditId(null); setForm({ nom: '', prenom: '', telephone: '', tauxHoraire: '', coutHoraireCharge: '' });
  };

  const startEdit = (emp) => { setForm({ nom: emp.nom || '', prenom: emp.prenom || '', telephone: emp.telephone || '', tauxHoraire: emp.tauxHoraire?.toString() || '', coutHoraireCharge: emp.coutHoraireCharge?.toString() || '' }); setEditId(emp.id); setShowAdd(true); };
  const deleteEmploye = (id) => { if (confirm('Supprimer ?')) setEquipe(equipe.filter(e => e.id !== id)); };

  const exportCSV = () => {
    const rows = [['Date', 'Employé', 'Chantier', 'Heures', 'Statut', 'Note']];
    weekPointages.forEach(p => { const emp = equipe.find(e => e.id === p.employeId); const ch = chantiers.find(c => c.id === p.chantierId); rows.push([p.date, `${emp?.nom || ''} ${emp?.prenom || ''}`, ch?.nom || '-', p.heures, p.verrouille ? 'Verrouillé' : p.approuve ? 'Validé' : 'En attente', p.note || '']); });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `heures_${weekStart.toISOString().split('T')[0]}.csv`; a.click();
  };

  const getHeuresMois = (empId) => { const now = new Date(); return pointages.filter(p => p.employeId === empId && new Date(p.date).getMonth() === now.getMonth() && p.approuve).reduce((s, p) => s + (p.heures || 0), 0); };

  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => { setShowAdd(false); setEditId(null); setForm({ nom: '', prenom: '', telephone: '', tauxHoraire: '', coutHoraireCharge: '' }); }} className={`p-2 ${hoverBg} rounded-xl`}></button><h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} employé</h1></div>
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Taux facturation (€/h)</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} placeholder="45" /></div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Coût horaire chargé (€/h) *</label>
            <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.coutHoraireCharge} onChange={e => setForm(p => ({...p, coutHoraireCharge: e.target.value}))} placeholder="28" />
            <p className="text-xs text-slate-500 mt-1">Salaire brut + charges patronales (~45%). Utilisé pour calculer la rentabilité réelle des chantiers.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => { setShowAdd(false); setEditId(null); }} className={`px-4 py-2 rounded-xl ${btnSecondary}`}>Annuler</button><button onClick={addEmploye} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>{editId ? 'Enregistrer' : 'Ajouter'}</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4"><h1 className={`text-2xl font-bold ${textPrimary}`}>Équipe & Heures</h1><button onClick={() => setShowAdd(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Employé</button></div>

      {/* Total Semaine */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-center">
          <div><p className="text-sm opacity-80">Semaine du {weekStart.toLocaleDateString('fr-FR')}</p><p className="text-3xl font-bold">{totalWeekHours.toFixed(1)}h <span className="text-lg opacity-80">/ 39h</span></p></div>
          <div className="text-right"><p className="text-sm opacity-80">Validées</p><p className={`text-2xl font-bold ${textPrimary}`}>{approvedWeekHours.toFixed(1)}h</p></div>
        </div>
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{width: `${Math.min((totalWeekHours / 39) * 100, 100)}%`}}></div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[['pointage', '¸ Pointage'], ['equipe', ' Équipe'], ['validation', ` Validation ${pointagesEnAttente.length > 0 ? `(${pointagesEnAttente.length})` : ''}`], ['historique', ' Historique']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium whitespace-nowrap ${tab === k ? (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border') + ' border-b-0 -mb-[3px]' : textSecondary}`}>{v}</button>
        ))}
      </div>

      {tab === 'pointage' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className="font-semibold mb-4">¸ Chronomètre</h3>
            <div className="text-center mb-6"><p className="text-5xl font-mono font-bold" style={{color: chrono.running ? couleur : '#64748b'}}>{formatTime(elapsed)}</p>{chrono.running && <p className="text-sm text-orange-500 mt-2"> En cours</p>}</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select className="px-4 py-2.5 border rounded-xl" value={chrono.employeId} onChange={e => setChrono(p => ({...p, employeId: e.target.value}))} disabled={chrono.running}><option value="">Employé *</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select>
              <select className="px-4 py-2.5 border rounded-xl" value={chrono.chantierId} onChange={e => setChrono(p => ({...p, chantierId: e.target.value}))} disabled={chrono.running}><option value="">Chantier</option>{chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
            </div>
            <div className="flex justify-center gap-4">
              {!chrono.running ? <button onClick={startChrono} className="px-8 py-3 text-white rounded-xl text-lg" style={{background: couleur}}>¸ Démarrer</button> : <button onClick={() => { const note = prompt('Note de fin (optionnel):'); stopChrono(note || ''); }} className="px-8 py-3 bg-red-500 text-white rounded-xl text-lg">¸ Arrêter</button>}
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className="font-semibold mb-4">¸ Saisie manuelle</h3>
            <div className="flex gap-3 flex-wrap">
              <select className="flex-1 min-w-[140px] px-4 py-2.5 border rounded-xl" value={pForm.employeId} onChange={e => setPForm(p => ({...p, employeId: e.target.value}))}><option value="">Employé *</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select>
              <select className="flex-1 min-w-[140px] px-4 py-2.5 border rounded-xl" value={pForm.chantierId} onChange={e => setPForm(p => ({...p, chantierId: e.target.value}))}><option value="">Chantier</option>{chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
              <input type="date" className="px-4 py-2.5 border rounded-xl" value={pForm.date} onChange={e => setPForm(p => ({...p, date: e.target.value}))} />
              <input type="number" step="0.5" placeholder="Heures" className="w-20 px-4 py-2.5 border rounded-xl" value={pForm.heures} onChange={e => setPForm(p => ({...p, heures: e.target.value}))} />
              <input placeholder="Note" className="flex-1 min-w-[140px] px-4 py-2.5 border rounded-xl" value={pForm.note} onChange={e => setPForm(p => ({...p, note: e.target.value}))} />
              <button onClick={addPointageManuel} className="px-6 py-2.5 text-white rounded-xl" style={{background: couleur}}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'validation' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-slate-500">{pointagesEnAttente.length} pointage(s) en attente</p>
            <div className="flex gap-2">
              {pointagesEnAttente.length > 0 && <button onClick={approuverTout} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm"> Tout valider</button>}
              <button onClick={validerSemaine} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm"> Verrouiller semaine</button>
            </div>
          </div>
          {pointagesEnAttente.length === 0 ? <div className={`rounded-2xl border p-12 text-center ${cardBg}`}><p className="text-5xl mb-4"></p><p className="text-slate-500">Tous validés</p></div> : (
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
              {pointagesEnAttente.map(p => {
                const emp = equipe.find(e => e.id === p.employeId);
                const ch = chantiers.find(c => c.id === p.chantierId);
                return (
                  <div key={p.id} className="flex items-center px-5 py-4 border-b gap-4 flex-wrap">
                    <span className={`text-2xl ${p.manuel ? '' : ' '}`}></span>
                    <div className="flex-1 min-w-[150px]"><p className="font-medium">{emp?.nom} {emp?.prenom}</p><p className="text-sm text-slate-500">{ch?.nom || 'Sans chantier'} • {new Date(p.date).toLocaleDateString('fr-FR')}</p>{p.note && <p className="text-xs text-blue-600 mt-1"> {p.note}</p>}</div>
                    <div className="flex items-center gap-2"><input type="number" value={p.heures} onChange={e => updatePointage(p.id, 'heures', e.target.value)} className="w-16 px-2 py-1 border rounded text-center" /><span>h</span></div>
                    <button onClick={() => approuverPointage(p.id)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm"></button>
                    <button onClick={() => rejeterPointage(p.id)} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm"></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'equipe' && (
        equipe.length === 0 ? <div className={`rounded-2xl border p-12 text-center ${cardBg}`}><p className="text-5xl mb-4"></p><p className="text-slate-500">Ajoutez votre équipe</p></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipe.map(e => (
              <div key={e.id} className={`rounded-2xl border p-5 ${cardBg}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{background: couleur}}>{e.nom?.[0]}{e.prenom?.[0]}</div>
                  <div className="flex-1"><h3 className="font-semibold">{e.nom} {e.prenom}</h3>{e.telephone && <p className="text-sm text-slate-500">{e.telephone}</p>}</div>
                  <button onClick={() => startEdit(e)} className="text-slate-400 hover:text-slate-600">¸</button>
                  <button onClick={() => deleteEmploye(e.id)} className="text-red-400 hover:text-red-600"></button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-xs text-slate-500">Taux facturé</p><p className="font-bold">{e.tauxHoraire || 45}€/h</p></div>
                  <div className="bg-red-50 p-3 rounded-xl"><p className="text-xs text-slate-500">Coût chargé</p><p className="font-bold text-red-600">{e.coutHoraireCharge || 28}€/h</p></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t"><div><p className={`text-2xl font-bold ${textPrimary}`} style={{color: couleur}}>{getHeuresMois(e.id).toFixed(1)}h</p><p className="text-xs text-slate-500">ce mois (validé)</p></div></div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'historique' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center"><p className="text-sm text-slate-500">Semaine du {weekStart.toLocaleDateString('fr-FR')}</p><button onClick={exportCSV} className="px-4 py-2 rounded-xl text-sm" style={{background: `${couleur}20`, color: couleur}}> Exporter CSV</button></div>
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            {weekPointages.length === 0 ? <p className="p-8 text-center text-slate-500">Aucun pointage</p> : weekPointages.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
              const emp = equipe.find(e => e.id === p.employeId);
              const ch = chantiers.find(c => c.id === p.chantierId);
              return (
                <div key={p.id} className="flex items-center px-5 py-3 border-b gap-4">
                  <span className={`text-lg ${p.verrouille ? '' : p.approuve ? '' : ''}`}></span>
                  <span className={`w-2 h-2 rounded-full ${p.manuel ? 'bg-blue-500' : 'bg-orange-500'}`} title={p.manuel ? 'Manuel' : 'Chrono'}></span>
                  <span className="w-24 text-sm">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                  <span className="flex-1">{emp?.nom} {emp?.prenom}</span>
                  <span className="flex-1 text-slate-500">{ch?.nom || '-'}</span>
                  <span className="w-20 text-right font-bold" style={{color: couleur}}>{(p.heures || 0).toFixed(1)}h</span>
                </div>
              );
            })}
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700"><span className="inline-flex items-center gap-2 mr-4"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Chrono</span><span className="inline-flex items-center gap-2 mr-4"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Manuel</span><span className="inline-flex items-center gap-2"> Verrouillé</span></div>
        </div>
      )}
    </div>
  );
}
