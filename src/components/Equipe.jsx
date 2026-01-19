import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Edit3, Trash2, Check, X, User, Phone, Mail, Briefcase, Clock, Calendar, Timer, Play, Square, ChevronRight, Euro, DollarSign, Users, CheckSquare, History, FileText, Download, ArrowUpDown, MapPin, UserPlus, AlertCircle, TrendingUp, Zap, HardHat, Wrench, Plug, Paintbrush, Building2, UserCheck, PhoneCall } from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';

export default function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers, couleur, isDark, modeDiscret }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  const [tab, setTab] = useState('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '' });
  const [sortBy, setSortBy] = useState('name');
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [chrono, setChrono] = useState({ running: false, start: null, employeId: '', chantierId: '' });
  const [elapsed, setElapsed] = useState(0);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [bulkForm, setBulkForm] = useState({ chantierId: '', date: new Date().toISOString().split('T')[0], heures: '8', selectedEmployees: [] });

  // Role icons mapping
  const roleIcons = {
    'Chef de chantier': HardHat,
    'Ouvrier qualifie': Wrench,
    'Electricien': Plug,
    'Plombier': Wrench,
    'Peintre': Paintbrush,
    'Macon': Building2,
    'Apprenti': UserPlus,
    'default': User
  };

  const getRoleIcon = (role) => roleIcons[role] || roleIcons['default'];

  useEffect(() => { let i; if (chrono.running && chrono.start) i = setInterval(() => setElapsed(Math.floor((Date.now() - chrono.start) / 1000)), 1000); return () => clearInterval(i); }, [chrono.running, chrono.start]);

  const formatTime = (s) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const getWeekDates = () => { const now = new Date(); const day = now.getDay() || 7; const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1); const end = new Date(start.getTime() + 6 * 86400000); return { start, end }; };
  const { start: weekStart, end: weekEnd } = getWeekDates();
  const weekPointages = pointages.filter(p => { const d = new Date(p.date); return d >= weekStart && d <= weekEnd; });
  const totalWeekHours = weekPointages.reduce((s, p) => s + (p.heures || 0), 0);
  const approvedWeekHours = weekPointages.filter(p => p.approuve).reduce((s, p) => s + (p.heures || 0), 0);
  const pointagesEnAttente = pointages.filter(p => !p.approuve && !p.verrouille);

  // Today's activity
  const today = new Date().toISOString().split('T')[0];
  const todayPointages = pointages.filter(p => p.date === today);
  const todayHours = todayPointages.reduce((s, p) => s + (p.heures || 0), 0);
  const activeEmployeesToday = [...new Set(todayPointages.map(p => p.employeId))];

  // Weekly cost calculation
  const weekCost = weekPointages.reduce((s, p) => {
    const emp = equipe.find(e => e.id === p.employeId);
    return s + (p.heures || 0) * (emp?.coutHoraireCharge || 28);
  }, 0);

  // Get employee's current chantier (last pointage today)
  const getEmployeeCurrentChantier = (empId) => {
    const todayP = todayPointages.filter(p => p.employeId === empId);
    if (todayP.length === 0) return null;
    const lastP = todayP[todayP.length - 1];
    return chantiers.find(c => c.id === lastP.chantierId);
  };

  const getEmployeeTodayHours = (empId) => {
    return todayPointages.filter(p => p.employeId === empId).reduce((s, p) => s + (p.heures || 0), 0);
  };

  const startChrono = () => { if (!chrono.employeId) return showToast('Sélectionnez un employé', 'error'); setChrono(p => ({ ...p, running: true, start: Date.now() })); };
  const stopChrono = (note = '') => {
    if (!chrono.running) return;
    const heures = elapsed / 3600;
    if (heures > 0.1) setPointages([...pointages, { id: generateId(), employeId: chrono.employeId, chantierId: chrono.chantierId, date: new Date().toISOString().split('T')[0], heures: Math.round(heures * 10) / 10, approuve: false, manuel: false, verrouille: false, note }]);
    setChrono({ running: false, start: null, employeId: '', chantierId: '' }); setElapsed(0);
  };

  const addPointageManuel = () => {
    if (!pForm.employeId || !pForm.heures) return;
    setPointages([...pointages, { id: generateId(), ...pForm, heures: parseFloat(pForm.heures), approuve: false, manuel: true, verrouille: false }]);
    setPForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  };

  // Bulk time entry
  const addBulkPointages = () => {
    if (!bulkForm.chantierId || bulkForm.selectedEmployees.length === 0 || !bulkForm.heures) return;
    const newPointages = bulkForm.selectedEmployees.map(empId => ({
      id: generateId(),
      employeId: empId,
      chantierId: bulkForm.chantierId,
      date: bulkForm.date,
      heures: parseFloat(bulkForm.heures),
      approuve: false,
      manuel: true,
      verrouille: false,
      note: 'Saisie groupee'
    }));
    setPointages([...pointages, ...newPointages]);
    setShowBulkEntry(false);
    setBulkForm({ chantierId: '', date: new Date().toISOString().split('T')[0], heures: '8', selectedEmployees: [] });
  };

  const toggleBulkEmployee = (empId) => {
    setBulkForm(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(empId)
        ? prev.selectedEmployees.filter(id => id !== empId)
        : [...prev.selectedEmployees, empId]
    }));
  };

  const selectAllEmployees = () => {
    setBulkForm(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.length === equipe.length ? [] : equipe.map(e => e.id)
    }));
  };

  const approuverPointage = (id) => setPointages(pointages.map(p => p.id === id ? { ...p, approuve: true } : p));
  const approuverTout = () => setPointages(pointages.map(p => weekPointages.find(wp => wp.id === p.id && !p.verrouille) ? { ...p, approuve: true } : p));
  const rejeterPointage = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce pointage ?' });
    if (confirmed) setPointages(pointages.filter(p => p.id !== id));
  };

  const validerSemaine = async () => {
    const confirmed = await confirm({
      title: 'Valider la semaine',
      message: 'Valider et verrouiller les heures de la semaine ? Cette action est irréversible.',
      variant: 'warning'
    });
    if (!confirmed) return;
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
    const data = {
      id: editId || generateId(),
      ...form,
      tauxHoraire: parseFloat(form.tauxHoraire) || 45,
      coutHoraireCharge: parseFloat(form.coutHoraireCharge) || parseFloat(form.tauxHoraire) * 0.6 || 28
    };
    if (editId) setEquipe(equipe.map(e => e.id === editId ? data : e));
    else setEquipe([...equipe, data]);
    setShowAdd(false);
    setEditId(null);
    setForm({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '' });
  };

  const startEdit = (emp) => {
    setForm({
      nom: emp.nom || '',
      prenom: emp.prenom || '',
      telephone: emp.telephone || '',
      email: emp.email || '',
      role: emp.role || '',
      contrat: emp.contrat || '',
      tauxHoraire: emp.tauxHoraire?.toString() || '',
      coutHoraireCharge: emp.coutHoraireCharge?.toString() || ''
    });
    setEditId(emp.id);
    setShowAdd(true);
  };
  const deleteEmploye = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cet employé ?' });
    if (confirmed) setEquipe(equipe.filter(e => e.id !== id));
  };

  const exportCSV = () => {
    const rows = [['Date', 'Employe', 'Chantier', 'Heures', 'Statut', 'Note']];
    weekPointages.forEach(p => { const emp = equipe.find(e => e.id === p.employeId); const ch = chantiers.find(c => c.id === p.chantierId); rows.push([p.date, `${emp?.nom || ''} ${emp?.prenom || ''}`, ch?.nom || '-', p.heures, p.verrouille ? 'Verrouille' : p.approuve ? 'Valide' : 'En attente', p.note || '']); });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `heures_${weekStart.toISOString().split('T')[0]}.csv`; a.click();
  };

  const getHeuresMois = (empId) => { const now = new Date(); return pointages.filter(p => p.employeId === empId && new Date(p.date).getMonth() === now.getMonth() && p.approuve).reduce((s, p) => s + (p.heures || 0), 0); };

  const callPhone = (tel) => { if (!tel) return; window.location.href = `tel:${tel.replace(/\s/g, '')}`; };

  const getSortedEquipe = () => {
    return [...equipe].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
        case 'hours':
          return getHeuresMois(b.id) - getHeuresMois(a.id);
        case 'rate':
          return (b.tauxHoraire || 45) - (a.tauxHoraire || 45);
        default:
          return 0;
      }
    });
  };

  // Employee add/edit form
  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShowAdd(false); setEditId(null); setForm({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} employe</h1>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prenom</label><input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Role / Poste</label>
            <select className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
              <option value="">Selectionner...</option>
              <option value="Chef de chantier">Chef de chantier</option>
              <option value="Ouvrier qualifie">Ouvrier qualifie</option>
              <option value="Electricien">Electricien</option>
              <option value="Plombier">Plombier</option>
              <option value="Peintre">Peintre</option>
              <option value="Macon">Macon</option>
              <option value="Carreleur">Carreleur</option>
              <option value="Menuisier">Menuisier</option>
              <option value="Apprenti">Apprenti</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Type de contrat</label>
            <select className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.contrat} onChange={e => setForm(p => ({...p, contrat: e.target.value}))}>
              <option value="">Selectionner...</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Interim">Interim</option>
              <option value="Apprentissage">Apprentissage</option>
              <option value="Stage">Stage</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
            </select>
          </div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Telephone</label><input type="tel" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} placeholder="06 12 34 56 78" /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label><input type="email" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="email@example.com" /></div>
        </div>

        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h4 className={`font-medium mb-4 flex items-center gap-2 ${textPrimary}`}><Euro size={16} style={{ color: couleur }} /> Tarification</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Taux facturation (EUR/h)</label>
              <input type="number" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} placeholder="45" />
              <p className={`text-xs ${textMuted} mt-1`}>Prix facture au client</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Cout horaire charge (EUR/h) *</label>
              <input type="number" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.coutHoraireCharge} onChange={e => setForm(p => ({...p, coutHoraireCharge: e.target.value}))} placeholder="28" />
              <p className={`text-xs ${textMuted} mt-1`}>Salaire brut + charges (~45%)</p>
            </div>
          </div>
        </div>

        <div className={`flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => { setShowAdd(false); setEditId(null); }} className={`px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>Annuler</button>
          <button onClick={addEmploye} className="px-6 py-2.5 text-white rounded-xl min-h-[44px] flex items-center justify-center gap-2" style={{background: couleur}}>
            <Check size={16} /> {editId ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );

  // Bulk entry modal
  if (showBulkEntry) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShowBulkEntry(false)} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Saisie groupee</h1>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <p className={`text-sm ${textMuted} mb-4`}>Ajoutez les heures pour plusieurs employes en une seule fois</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Chantier *</label>
            <select className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={bulkForm.chantierId} onChange={e => setBulkForm(p => ({...p, chantierId: e.target.value}))}>
              <option value="">Selectionner...</option>
              {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date</label>
            <input type="date" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={bulkForm.date} onChange={e => setBulkForm(p => ({...p, date: e.target.value}))} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Heures *</label>
            <input type="number" step="0.5" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={bulkForm.heures} onChange={e => setBulkForm(p => ({...p, heures: e.target.value}))} placeholder="8" />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className={`text-sm font-medium ${textPrimary}`}>Employes ({bulkForm.selectedEmployees.length} selectionne{bulkForm.selectedEmployees.length > 1 ? 's' : ''})</label>
            <button onClick={selectAllEmployees} className={`text-sm px-3 py-1 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {bulkForm.selectedEmployees.length === equipe.length ? 'Deselectionner tout' : 'Tout selectionner'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {equipe.map(e => (
              <button
                key={e.id}
                onClick={() => toggleBulkEmployee(e.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  bulkForm.selectedEmployees.includes(e.id)
                    ? 'border-2'
                    : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                }`}
                style={bulkForm.selectedEmployees.includes(e.id) ? { borderColor: couleur, background: `${couleur}10` } : {}}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${bulkForm.selectedEmployees.includes(e.id) ? 'text-white' : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`} style={bulkForm.selectedEmployees.includes(e.id) ? { background: couleur } : {}}>
                    {e.nom?.[0]}{e.prenom?.[0]}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{e.nom}</p>
                    {e.role && <p className={`text-xs ${textMuted}`}>{e.role}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setShowBulkEntry(false)} className={`px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>Annuler</button>
          <button onClick={addBulkPointages} disabled={!bulkForm.chantierId || bulkForm.selectedEmployees.length === 0} className="px-6 py-2.5 text-white rounded-xl min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50" style={{background: couleur}}>
            <Plus size={16} /> Ajouter {bulkForm.selectedEmployees.length} pointage{bulkForm.selectedEmployees.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );

  // Empty state
  if (equipe.length === 0) return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Equipe & Heures</h1>
      </div>

      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
            <Users size={40} className="text-white" />
          </div>
          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>Gerez votre equipe</h2>
          <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
            Ajoutez vos employes, suivez leurs heures et calculez la rentabilite de vos chantiers.
          </p>
        </div>

        <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Fonctionnalites</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                <Timer size={18} style={{ color: couleur }} />
              </div>
              <div>
                <p className={`font-medium text-sm ${textPrimary}`}>Chronometre</p>
                <p className={`text-xs ${textMuted}`}>Pointage en temps reel</p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                <TrendingUp size={18} style={{ color: couleur }} />
              </div>
              <div>
                <p className={`font-medium text-sm ${textPrimary}`}>Cout de revient</p>
                <p className={`text-xs ${textMuted}`}>Rentabilite par chantier</p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                <Download size={18} style={{ color: couleur }} />
              </div>
              <div>
                <p className={`font-medium text-sm ${textPrimary}`}>Export CSV</p>
                <p className={`text-xs ${textMuted}`}>Pour votre comptable</p>
              </div>
            </div>
          </div>

          <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
            <UserPlus size={18} />
            Ajouter mon premier employe
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Equipe & Heures</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkEntry(true)} className={`px-3 sm:px-4 py-2 rounded-xl text-sm min-h-[44px] flex items-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Zap size={16} /> <span className="hidden sm:inline">Saisie groupee</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="px-3 sm:px-4 py-2 text-white rounded-xl text-sm min-h-[44px] flex items-center gap-2" style={{background: couleur}}>
            <Plus size={16} /> <span className="hidden sm:inline">Employe</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Week total */}
        <div className="col-span-2 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm opacity-80">Semaine du {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              <p className="text-2xl sm:text-3xl font-bold">{totalWeekHours.toFixed(1)}h</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Validees</p>
              <p className="text-xl font-bold">{approvedWeekHours.toFixed(1)}h</p>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{width: `${Math.min((approvedWeekHours / totalWeekHours) * 100, 100) || 0}%`}}></div>
          </div>
        </div>

        {/* Today's activity */}
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} style={{ color: couleur }} />
            <span className={`text-xs ${textMuted}`}>Aujourd'hui</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: couleur }}>{todayHours.toFixed(1)}h</p>
          <p className={`text-xs ${textMuted}`}>{activeEmployeesToday.length} employe{activeEmployeesToday.length > 1 ? 's' : ''} actif{activeEmployeesToday.length > 1 ? 's' : ''}</p>
        </div>

        {/* Week cost */}
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-red-500" />
            <span className={`text-xs ${textMuted}`}>Cout semaine</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-500">{modeDiscret ? '***' : weekCost.toFixed(0)} EUR</p>
          <p className={`text-xs ${textMuted}`}>Charges comprises</p>
        </div>
      </div>

      {/* Quick Team Overview - Who's working where today */}
      {activeEmployeesToday.length > 0 && (
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${textPrimary}`}>
            <UserCheck size={16} style={{ color: couleur }} /> Equipe active aujourd'hui
          </h3>
          <div className="flex flex-wrap gap-2">
            {equipe.filter(e => activeEmployeesToday.includes(e.id)).map(e => {
              const currentCh = getEmployeeCurrentChantier(e.id);
              const todayH = getEmployeeTodayHours(e.id);
              const RoleIcon = getRoleIcon(e.role);
              return (
                <div key={e.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background: couleur}}>
                    <RoleIcon size={14} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{e.nom}</p>
                    <p className={`text-xs ${textMuted}`}>{currentCh?.nom || 'Sans chantier'} - {todayH.toFixed(1)}h</p>
                  </div>
                  {e.telephone && (
                    <button onClick={() => callPhone(e.telephone)} className={`p-1.5 rounded-lg ml-1 ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                      <PhoneCall size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending validations alert */}
      {pointagesEnAttente.length > 0 && (
        <div className={`rounded-xl p-4 flex items-center justify-between gap-4 ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-amber-500" />
            <div>
              <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{pointagesEnAttente.length} pointage{pointagesEnAttente.length > 1 ? 's' : ''} en attente</p>
              <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>A valider avant export</p>
            </div>
          </div>
          <button onClick={() => setTab('validation')} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm min-h-[40px] flex items-center gap-2">
            <Check size={16} /> Valider
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex gap-1 border-b pb-2 overflow-x-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {[
          { key: 'overview', label: 'Equipe', icon: Users },
          { key: 'pointage', label: 'Pointage', icon: Timer },
          { key: 'validation', label: `Validation${pointagesEnAttente.length > 0 ? ` (${pointagesEnAttente.length})` : ''}`, icon: CheckSquare },
          { key: 'historique', label: 'Historique', icon: History }
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap min-h-[44px] transition-colors ${tab === key ? 'text-white' : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} style={tab === key ? { background: couleur } : {}}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview / Equipe Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowUpDown size={16} className={textMuted} />
            <span className={`text-sm ${textMuted}`}>Trier:</span>
            {[
              { key: 'name', label: 'Nom' },
              { key: 'hours', label: 'Heures' },
              { key: 'rate', label: 'Taux' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm min-h-[36px] transition-colors ${
                  sortBy === opt.key
                    ? 'text-white'
                    : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={sortBy === opt.key ? { background: couleur } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getSortedEquipe().map(e => {
              const RoleIcon = getRoleIcon(e.role);
              const isActiveToday = activeEmployeesToday.includes(e.id);
              const currentCh = isActiveToday ? getEmployeeCurrentChantier(e.id) : null;
              return (
                <div key={e.id} className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-5`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{background: couleur}}>
                        <RoleIcon size={20} />
                      </div>
                      {isActiveToday && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${textPrimary}`}>{e.nom} {e.prenom}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {e.role && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{e.role}</span>}
                        {e.contrat && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{e.contrat}</span>}
                      </div>
                      {isActiveToday && currentCh && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          <MapPin size={12} /> {currentCh.nom}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {e.telephone && (
                        <button onClick={() => callPhone(e.telephone)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'}`} title="Appeler">
                          <Phone size={16} />
                        </button>
                      )}
                      <button onClick={() => startEdit(e)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}><Edit3 size={16} /></button>
                      <button onClick={() => deleteEmploye(e.id)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className={`p-2 sm:p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <p className={`text-xs ${textMuted}`}>Facture</p>
                      <p className={`font-bold ${textPrimary}`}>{modeDiscret ? '**' : e.tauxHoraire || 45}EUR</p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-xl text-center ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                      <p className={`text-xs ${textMuted}`}>Cout</p>
                      <p className="font-bold text-red-500">{modeDiscret ? '**' : e.coutHoraireCharge || 28}EUR</p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-xl text-center`} style={{ background: `${couleur}15` }}>
                      <p className={`text-xs ${textMuted}`}>Ce mois</p>
                      <p className="font-bold" style={{ color: couleur }}>{getHeuresMois(e.id).toFixed(0)}h</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pointage Tab */}
      {tab === 'pointage' && (
        <div className="space-y-6">
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><Timer size={18} style={{ color: couleur }} /> Chronometre</h3>
            <div className="text-center mb-6">
              <p className="text-4xl sm:text-5xl font-mono font-bold" style={{color: chrono.running ? couleur : isDark ? '#94a3b8' : '#64748b'}}>{formatTime(elapsed)}</p>
              {chrono.running && <p className="text-sm mt-2 flex items-center justify-center gap-2" style={{ color: couleur }}><span className="w-2 h-2 rounded-full animate-pulse" style={{ background: couleur }}></span> En cours</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <select className={`px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={chrono.employeId} onChange={e => setChrono(p => ({...p, employeId: e.target.value}))} disabled={chrono.running}>
                <option value="">Employe *</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
              </select>
              <select className={`px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={chrono.chantierId} onChange={e => setChrono(p => ({...p, chantierId: e.target.value}))} disabled={chrono.running}>
                <option value="">Chantier</option>
                {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="flex justify-center gap-4">
              {!chrono.running ? (
                <button onClick={startChrono} className="px-8 py-3 text-white rounded-xl text-lg flex items-center gap-2 hover:shadow-lg transition-all min-h-[52px]" style={{background: couleur}}>
                  <Play size={20} /> Demarrer
                </button>
              ) : (
                <button onClick={() => { const note = prompt('Note de fin (optionnel):'); stopChrono(note || ''); }} className="px-8 py-3 bg-red-500 text-white rounded-xl text-lg flex items-center gap-2 hover:shadow-lg transition-all min-h-[52px]">
                  <Square size={20} /> Arreter
                </button>
              )}
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><Edit3 size={18} style={{ color: couleur }} /> Saisie manuelle</h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <select className={`col-span-2 sm:col-span-1 px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={pForm.employeId} onChange={e => setPForm(p => ({...p, employeId: e.target.value}))}>
                <option value="">Employe *</option>
                {equipe.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <select className={`col-span-2 sm:col-span-1 px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={pForm.chantierId} onChange={e => setPForm(p => ({...p, chantierId: e.target.value}))}>
                <option value="">Chantier</option>
                {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <input type="date" className={`px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={pForm.date} onChange={e => setPForm(p => ({...p, date: e.target.value}))} />
              <input type="number" step="0.5" placeholder="Nb heures" className={`px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={pForm.heures} onChange={e => setPForm(p => ({...p, heures: e.target.value}))} />
              <input placeholder="Ex: Pose carrelage, finitions..." className={`col-span-2 sm:col-span-1 px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={pForm.note} onChange={e => setPForm(p => ({...p, note: e.target.value}))} />
              <button onClick={addPointageManuel} className="col-span-2 sm:col-span-1 px-4 py-2.5 text-white rounded-xl min-h-[44px] flex items-center justify-center gap-2" style={{background: couleur}}>
                <Plus size={16} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Tab */}
      {tab === 'validation' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className={`text-sm ${textMuted}`}>{pointagesEnAttente.length} pointage(s) en attente</p>
            <div className="flex gap-2">
              {pointagesEnAttente.length > 0 && <button onClick={approuverTout} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm min-h-[40px] flex items-center gap-2"><Check size={16} /> Tout valider</button>}
              <button onClick={validerSemaine} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm min-h-[40px] flex items-center gap-2"><CheckSquare size={16} /> Verrouiller semaine</button>
            </div>
          </div>
          {pointagesEnAttente.length === 0 ? (
            <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
              <CheckSquare size={48} className="mx-auto mb-4 text-emerald-500" />
              <p className={`font-medium ${textPrimary}`}>Tous les pointages sont valides</p>
              <p className={`text-sm ${textMuted} mt-1`}>Vous pouvez verrouiller la semaine</p>
            </div>
          ) : (
            <div className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden`}>
              {pointagesEnAttente.map(p => {
                const emp = equipe.find(e => e.id === p.employeId);
                const ch = chantiers.find(c => c.id === p.chantierId);
                return (
                  <div key={p.id} className={`flex items-center px-4 sm:px-5 py-4 border-b gap-3 sm:gap-4 flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.manuel ? 'bg-blue-500' : 'bg-orange-500'}`} title={p.manuel ? 'Saisie manuelle' : 'Chronometre'}></span>
                    <div className="flex-1 min-w-[120px]">
                      <p className={`font-medium ${textPrimary}`}>{emp?.nom} {emp?.prenom}</p>
                      <p className={`text-sm ${textMuted}`}>{ch?.nom || 'Sans chantier'} - {new Date(p.date).toLocaleDateString('fr-FR')}</p>
                      {p.note && <p className="text-xs text-blue-600 mt-1">{p.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.5" value={p.heures} onChange={e => updatePointage(p.id, 'heures', e.target.value)} className={`w-16 px-2 py-1.5 border rounded-lg text-center min-h-[36px] ${inputBg}`} />
                      <span className={textMuted}>h</span>
                    </div>
                    <button onClick={() => approuverPointage(p.id)} className="p-2.5 bg-emerald-500 text-white rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"><Check size={18} /></button>
                    <button onClick={() => rejeterPointage(p.id)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'}`}><X size={18} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Historique Tab */}
      {tab === 'historique' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className={`text-sm ${textMuted}`}>Semaine du {weekStart.toLocaleDateString('fr-FR')}</p>
            <button onClick={exportCSV} className="px-4 py-2 rounded-xl text-sm min-h-[40px] flex items-center gap-2" style={{background: `${couleur}20`, color: couleur}}>
              <Download size={16} /> Exporter CSV
            </button>
          </div>
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden`}>
            {weekPointages.length === 0 ? (
              <p className={`p-8 text-center ${textMuted}`}>Aucun pointage cette semaine</p>
            ) : (
              weekPointages.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
                const emp = equipe.find(e => e.id === p.employeId);
                const ch = chantiers.find(c => c.id === p.chantierId);
                return (
                  <div key={p.id} className={`flex items-center px-4 sm:px-5 py-3 border-b gap-3 sm:gap-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    {p.verrouille ? <CheckSquare size={16} className="text-blue-500 flex-shrink-0" /> : p.approuve ? <Check size={16} className="text-emerald-500 flex-shrink-0" /> : <Clock size={16} className={`${textMuted} flex-shrink-0`} />}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.manuel ? 'bg-blue-500' : 'bg-orange-500'}`} title={p.manuel ? 'Manuel' : 'Chrono'}></span>
                    <span className={`w-20 sm:w-24 text-sm ${textMuted} flex-shrink-0`}>{new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
                    <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>{emp?.nom} {emp?.prenom}</span>
                    <span className={`flex-1 min-w-0 truncate ${textMuted} hidden sm:block`}>{ch?.nom || '-'}</span>
                    <span className="w-16 sm:w-20 text-right font-bold flex-shrink-0" style={{color: couleur}}>{(p.heures || 0).toFixed(1)}h</span>
                  </div>
                );
              })
            )}
          </div>
          <div className={`rounded-xl p-4 text-sm flex flex-wrap gap-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> <span className={textMuted}>Chrono</span></span>
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <span className={textMuted}>Manuel</span></span>
            <span className="inline-flex items-center gap-2"><CheckSquare size={14} className="text-blue-500" /> <span className={textMuted}>Verrouille</span></span>
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-emerald-500" /> <span className={textMuted}>Valide</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
