import React, { useState, useEffect } from 'react';
import { Clock, Users, UserPlus, Play, Square, Check, X, ChevronLeft, Download, Lock, Calendar, Edit2, Trash2, AlertCircle } from 'lucide-react';

export default function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers, couleur, isDark }) {
  const [tab, setTab] = useState('pointage');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', tauxHoraire: '', coutHoraireCharge: '' });
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [chrono, setChrono] = useState({ running: false, start: null, employeId: '', chantierId: '' });
  const [elapsed, setElapsed] = useState(0);

  // Classes pour le thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  useEffect(() => { 
    let i; 
    if (chrono.running && chrono.start) i = setInterval(() => setElapsed(Math.floor((Date.now() - chrono.start) / 1000)), 1000); 
    return () => clearInterval(i); 
  }, [chrono.running, chrono.start]);

  const formatTime = (s) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const getWeekDates = () => { 
    const now = new Date(); 
    const day = now.getDay() || 7; 
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1); 
    const end = new Date(start.getTime() + 6 * 86400000); 
    return { start, end }; 
  };
  const { start: weekStart, end: weekEnd } = getWeekDates();
  const weekPointages = pointages.filter(p => { const d = new Date(p.date); return d >= weekStart && d <= weekEnd; });
  const totalWeekHours = weekPointages.reduce((s, p) => s + (p.heures || 0), 0);
  const approvedWeekHours = weekPointages.filter(p => p.approuve).reduce((s, p) => s + (p.heures || 0), 0);
  const pointagesEnAttente = pointages.filter(p => !p.approuve && !p.verrouille);

  const startChrono = () => { 
    if (!chrono.employeId) return alert('Sélectionnez un employé'); 
    setChrono(p => ({ ...p, running: true, start: Date.now() })); 
  };
  
  const stopChrono = (note = '') => {
    if (!chrono.running) return;
    const heures = elapsed / 3600;
    if (heures > 0.1) setPointages([...pointages, { id: Date.now().toString(), employeId: chrono.employeId, chantierId: chrono.chantierId, date: new Date().toISOString().split('T')[0], heures: Math.round(heures * 10) / 10, approuve: false, manuel: false, verrouille: false, note }]);
    setChrono({ running: false, start: null, employeId: '', chantierId: '' }); 
    setElapsed(0);
  };

  const addPointageManuel = () => {
    if (!pForm.employeId || !pForm.heures) return;
    setPointages([...pointages, { id: Date.now().toString(), ...pForm, heures: parseFloat(pForm.heures), approuve: false, manuel: true, verrouille: false }]);
    setPForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  };

  const approuverPointage = (id) => setPointages(pointages.map(p => p.id === id ? { ...p, approuve: true } : p));
  const approuverTout = () => setPointages(pointages.map(p => weekPointages.find(wp => wp.id === p.id && !p.verrouille) ? { ...p, approuve: true } : p));
  const rejeterPointage = (id) => { if (confirm('Supprimer ce pointage ?')) setPointages(pointages.filter(p => p.id !== id)); };
  
  const validerSemaine = () => {
    if (!confirm('Valider et verrouiller les heures de la semaine ? Cette action est irréversible.')) return;
    setPointages(pointages.map(p => weekPointages.find(wp => wp.id === p.id) ? { ...p, approuve: true, verrouille: true } : p));
  };

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

  const startEdit = (emp) => { 
    setForm({ 
      nom: emp.nom || '', 
      prenom: emp.prenom || '', 
      telephone: emp.telephone || '', 
      tauxHoraire: emp.tauxHoraire?.toString() || '', 
      coutHoraireCharge: emp.coutHoraireCharge?.toString() || '' 
    }); 
    setEditId(emp.id); 
    setShowAdd(true); 
  };
  
  const deleteEmploye = (id) => { if (confirm('Supprimer cet employé ?')) setEquipe(equipe.filter(e => e.id !== id)); };

  const exportCSV = () => {
    const rows = [['Date', 'Employé', 'Chantier', 'Heures', 'Statut', 'Note']];
    weekPointages.forEach(p => { 
      const emp = equipe.find(e => e.id === p.employeId); 
      const ch = chantiers.find(c => c.id === p.chantierId); 
      rows.push([p.date, `${emp?.nom || ''} ${emp?.prenom || ''}`, ch?.nom || '-', p.heures, p.verrouille ? 'Verrouillé' : p.approuve ? 'Validé' : 'En attente', p.note || '']); 
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = `heures_${weekStart.toISOString().split('T')[0]}.csv`; 
    a.click();
  };

  const getHeuresMois = (empId) => { 
    const now = new Date(); 
    return pointages.filter(p => p.employeId === empId && new Date(p.date).getMonth() === now.getMonth() && p.approuve).reduce((s, p) => s + (p.heures || 0), 0); 
  };

  // Formulaire employé
  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShowAdd(false); setEditId(null); setForm({ nom: '', prenom: '', telephone: '', tauxHoraire: '', coutHoraireCharge: '' }); }} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}>
          <ChevronLeft size={20} />
        </button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} employé</h1>
      </div>
      
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Nom *</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Dupont" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Prénom</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} placeholder="Jean" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Téléphone</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Taux horaire facturé (€)</label>
            <input type="number" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} placeholder="45" />
          </div>
          <div className="col-span-2">
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Coût horaire chargé (€)</label>
            <input type="number" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.coutHoraireCharge} onChange={e => setForm(p => ({...p, coutHoraireCharge: e.target.value}))} placeholder="28" />
            <p className={`text-xs mt-1 ${textSecondary}`}>Salaire + charges sociales + frais. Utilisé pour calculer la marge réelle.</p>
          </div>
        </div>
        
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setShowAdd(false)} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            Annuler
          </button>
          <button onClick={addEmploye} className="px-6 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
            {editId ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Équipe & Heures</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
          <UserPlus size={18} />
          Employé
        </button>
      </div>

      {/* Résumé semaine */}
      <div className="rounded-2xl p-5 text-white" style={{background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`}}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/80 text-sm">Semaine du {weekStart.toLocaleDateString('fr-FR')}</p>
            <p className="text-3xl font-bold mt-1">{totalWeekHours.toFixed(1)}h <span className="text-lg font-normal text-white/80">/ 39h</span></p>
          </div>
          <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{width: `${Math.min((totalWeekHours / 39) * 100, 100)}%`}} />
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Validées</p>
            <p className="text-2xl font-bold">{approvedWeekHours.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 border-b pb-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {[
          ['pointage', '⏱️ Pointage'],
          ['equipe', '👥 Équipe'],
          ['validation', '✅ Validation'],
          ['historique', '📋 Historique']
        ].map(([k, v]) => (
          <button 
            key={k} 
            onClick={() => setTab(k)} 
            className={`px-4 py-2 rounded-t-xl font-medium transition-colors ${
              tab === k 
                ? (isDark ? 'bg-slate-800 text-white border border-slate-700 border-b-slate-800 -mb-[3px]' : 'bg-white border border-slate-200 border-b-white -mb-[3px]') 
                : textSecondary
            }`}
            style={tab === k ? {color: couleur} : {}}
          >
            {v}
          </button>
        ))}
      </div>

      {/* POINTAGE */}
      {tab === 'pointage' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chronomètre */}
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Clock size={18} style={{color: couleur}} />
              Chronomètre
            </h3>
            <div className={`text-center py-8 text-5xl font-mono ${textPrimary}`}>
              {formatTime(elapsed)}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select 
                className={`px-4 py-2.5 border rounded-xl ${inputBg}`} 
                value={chrono.employeId} 
                onChange={e => setChrono(p => ({...p, employeId: e.target.value}))}
                disabled={chrono.running}
              >
                <option value="">Employé *</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
              </select>
              <select 
                className={`px-4 py-2.5 border rounded-xl ${inputBg}`} 
                value={chrono.chantierId} 
                onChange={e => setChrono(p => ({...p, chantierId: e.target.value}))}
                disabled={chrono.running}
              >
                <option value="">Chantier</option>
                {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            {!chrono.running ? (
              <button onClick={startChrono} className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
                <Play size={20} />
                Démarrer
              </button>
            ) : (
              <button onClick={() => stopChrono()} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">
                <Square size={20} />
                Arrêter & Enregistrer
              </button>
            )}
          </div>

          {/* Saisie manuelle */}
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Edit2 size={18} style={{color: couleur}} />
              Saisie manuelle
            </h3>
            <div className="space-y-3">
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={pForm.employeId} onChange={e => setPForm(p => ({...p, employeId: e.target.value}))}>
                <option value="">Employé *</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
              </select>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={pForm.chantierId} onChange={e => setPForm(p => ({...p, chantierId: e.target.value}))}>
                <option value="">Chantier</option>
                {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={pForm.date} onChange={e => setPForm(p => ({...p, date: e.target.value}))} />
                <input type="number" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Heures" step="0.5" value={pForm.heures} onChange={e => setPForm(p => ({...p, heures: e.target.value}))} />
              </div>
              <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Note (optionnel)" value={pForm.note} onChange={e => setPForm(p => ({...p, note: e.target.value}))} />
              <button onClick={addPointageManuel} className="w-full py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÉQUIPE */}
      {tab === 'equipe' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipe.length === 0 ? (
            <div className={`col-span-full rounded-2xl border p-12 text-center ${cardBg}`}>
              <Users size={48} className={`mx-auto mb-4 ${textSecondary}`} />
              <p className={textSecondary}>Aucun employé</p>
              <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 text-white rounded-xl text-sm" style={{background: couleur}}>
                Ajouter un employé
              </button>
            </div>
          ) : equipe.map(emp => (
            <div key={emp.id} className={`rounded-2xl border p-5 ${cardBg}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{background: emp.couleur || couleur}}>
                  {emp.nom?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${textPrimary}`}>{emp.nom} {emp.prenom}</h3>
                  {emp.telephone && <p className={`text-sm ${textSecondary}`}>{emp.telephone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(emp)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteEmploye(emp.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <p className={`text-xs ${textSecondary}`}>Taux horaire</p>
                  <p className={`font-bold ${textPrimary}`}>{emp.tauxHoraire}€/h</p>
                </div>
                <div>
                  <p className={`text-xs ${textSecondary}`}>Heures ce mois</p>
                  <p className="font-bold" style={{color: couleur}}>{getHeuresMois(emp.id).toFixed(1)}h</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VALIDATION */}
      {tab === 'validation' && (
        <div className={`rounded-2xl border p-6 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className={`font-semibold ${textPrimary}`}>{pointagesEnAttente.length} pointage(s) en attente</h3>
            {weekPointages.filter(p => !p.verrouille).length > 0 && (
              <button onClick={validerSemaine} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
                <Lock size={16} />
                Verrouiller semaine
              </button>
            )}
          </div>
          
          {pointagesEnAttente.length === 0 ? (
            <div className={`text-center py-8 rounded-2xl ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                <Check size={32} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <p className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Tous validés</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pointagesEnAttente.map(p => {
                const emp = equipe.find(e => e.id === p.employeId);
                const ch = chantiers.find(c => c.id === p.chantierId);
                return (
                  <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{background: emp?.couleur || couleur}}>
                      {emp?.nom?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{emp?.nom} {emp?.prenom}</p>
                      <p className={`text-sm ${textSecondary}`}>{new Date(p.date).toLocaleDateString('fr-FR')} • {ch?.nom || 'Sans chantier'}</p>
                    </div>
                    <p className={`text-lg font-bold ${textPrimary}`}>{p.heures}h</p>
                    <div className="flex gap-2">
                      <button onClick={() => approuverPointage(p.id)} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={() => rejeterPointage(p.id)} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORIQUE */}
      {tab === 'historique' && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className={`font-semibold ${textPrimary}`}>Historique de la semaine</h3>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors" style={{background: `${couleur}20`, color: couleur}}>
              <Download size={16} />
              Exporter CSV
            </button>
          </div>
          
          {weekPointages.length === 0 ? (
            <div className={`text-center py-8 ${textSecondary}`}>Aucun pointage cette semaine</div>
          ) : (
            <table className="w-full text-sm">
              <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Date</th>
                  <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Employé</th>
                  <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Chantier</th>
                  <th className={`text-center px-4 py-3 font-semibold ${textPrimary}`}>Heures</th>
                  <th className={`text-center px-4 py-3 font-semibold ${textPrimary}`}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {weekPointages.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
                  const emp = equipe.find(e => e.id === p.employeId);
                  const ch = chantiers.find(c => c.id === p.chantierId);
                  return (
                    <tr key={p.id} className={`border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <td className={`px-4 py-3 ${textPrimary}`}>{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                      <td className={`px-4 py-3 ${textPrimary}`}>{emp?.nom} {emp?.prenom}</td>
                      <td className={`px-4 py-3 ${textSecondary}`}>{ch?.nom || '-'}</td>
                      <td className={`px-4 py-3 text-center font-bold ${textPrimary}`}>{p.heures}h</td>
                      <td className="px-4 py-3 text-center">
                        {p.verrouille ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                            <Lock size={12} /> Verrouillé
                          </span>
                        ) : p.approuve ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                            <Check size={12} /> Validé
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                            <AlertCircle size={12} /> En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
