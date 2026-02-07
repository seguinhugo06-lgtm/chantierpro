import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ArrowLeft, Edit3, Trash2, Check, X, User, Phone, Mail,
  Clock, Timer, Play, Square, ChevronRight, Euro, Users, CheckSquare,
  History, Download, MapPin, UserPlus, AlertCircle, TrendingUp, Zap,
  HardHat, Wrench, Plug, Paintbrush, Building2, UserCheck, PhoneCall,
  Pause, RotateCcw, ChevronDown, Sparkles, Target, Calendar, Search,
  ChevronLeft, Coffee, Wifi, WifiOff, Filter, Navigation, Smartphone
} from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import Button from './ui/Button';
import Card from './ui/Card';
import NoteModal from './NoteModal';
import SmartClockingWidget from './SmartClockingWidget';
import PointageNotification, { GeofenceArrivalToast } from './PointageNotification';
import useSmartClocking from '../hooks/useSmartClocking';

// Storage key for timer persistence
const TIMER_STORAGE_KEY = 'chantierpro_equipe_timer';

export default function Equipe({ equipe, setEquipe, pointages, setPointages, chantiers, couleur, isDark, modeDiscret }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  // Core state
  const [tab, setTab] = useState('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '', dateEmbauche: '', competences: '', certifications: '', notes: '' });
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  // Pointage state
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [chrono, setChrono] = useState({ running: false, start: null, employeId: '', chantierId: '', paused: false, pausedAt: null, totalPauseTime: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [bulkForm, setBulkForm] = useState({ chantierId: '', date: new Date().toISOString().split('T')[0], heures: '8', selectedEmployees: [] });

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Note modal state (replaces prompt())
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingStopChrono, setPendingStopChrono] = useState(false);

  // Break tracking
  const [breakStart, setBreakStart] = useState(null);
  const [totalBreakTime, setTotalBreakTime] = useState(0);

  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Smart Clocking mode - GPS intelligent
  const [smartClockingMode, setSmartClockingMode] = useState(false);
  const [currentEmployeForSmartClock, setCurrentEmployeForSmartClock] = useState(null);

  // Smart Clocking hook
  const smartClocking = useSmartClocking({
    employeId: currentEmployeForSmartClock?.id,
    chantiers,
    enabled: smartClockingMode,
    onPointageCreated: (pointage) => {
      // Add the pointage to the list
      setPointages(prev => [...prev, pointage]);
      showToast(`${Math.round(pointage.heures * 10) / 10}h enregistrées`, 'success');
    },
    onGeofenceEnter: (chantier) => {
      showToast(`Arrivé à ${chantier.nom}`, 'info');
    }
  });

  // Role configuration with icons and colors
  const roleConfig = {
    'Chef de chantier': { icon: HardHat, color: '#f59e0b', emoji: '👷' },
    'Ouvrier qualifie': { icon: Wrench, color: '#6366f1', emoji: '🔧' },
    'Electricien': { icon: Plug, color: '#eab308', emoji: '⚡' },
    'Plombier': { icon: Wrench, color: '#3b82f6', emoji: '🔧' },
    'Peintre': { icon: Paintbrush, color: '#8b5cf6', emoji: '🎨' },
    'Macon': { icon: Building2, color: '#a16207', emoji: '🧱' },
    'Carreleur': { icon: Building2, color: '#78716c', emoji: '🔲' },
    'Menuisier': { icon: Wrench, color: '#92400e', emoji: '🪵' },
    'Apprenti': { icon: UserPlus, color: '#10b981', emoji: '📚' },
    'default': { icon: User, color: '#64748b', emoji: '👤' }
  };

  const getRoleConfig = (role) => roleConfig[role] || roleConfig['default'];
  const getRoleIcon = (role) => getRoleConfig(role).icon;

  // Online status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load timer from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.running && data.start) {
          // Restore running timer
          setChrono({
            running: true,
            start: data.start,
            employeId: data.employeId || '',
            chantierId: data.chantierId || '',
            paused: data.paused || false,
            pausedAt: data.pausedAt || null,
            totalPauseTime: data.totalPauseTime || 0
          });
        }
      }
    } catch (e) {
      console.error('Failed to load timer state:', e);
    }
  }, []);

  // Save timer to localStorage on change
  useEffect(() => {
    try {
      if (chrono.running) {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(chrono));
      } else {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save timer state:', e);
    }
  }, [chrono]);

  // Timer tick
  useEffect(() => {
    let interval;
    if (chrono.running && chrono.start && !chrono.paused) {
      interval = setInterval(() => {
        const now = Date.now();
        const pauseOffset = chrono.totalPauseTime || 0;
        setElapsed(Math.floor((now - chrono.start - pauseOffset) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [chrono.running, chrono.start, chrono.paused, chrono.totalPauseTime]);

  const formatTime = (s) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // Week calculation with offset
  const getWeekDates = useCallback((offset = 0) => {
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7));
    const day = now.getDay() || 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    const end = new Date(start.getTime() + 6 * 86400000);
    return { start, end };
  }, []);

  const { start: weekStart, end: weekEnd } = getWeekDates(weekOffset);

  const weekPointages = useMemo(() =>
    pointages.filter(p => {
      const d = new Date(p.date);
      return d >= weekStart && d <= weekEnd;
    }),
    [pointages, weekStart, weekEnd]
  );

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

  // Quick start timer for an employee
  const quickStartTimer = (empId, chantierId = '') => {
    if (chrono.running) {
      showToast('Arrêtez le chronomètre actuel d\'abord', 'error');
      return;
    }
    setChrono({
      running: true,
      start: Date.now(),
      employeId: empId,
      chantierId: chantierId,
      paused: false,
      pausedAt: null,
      totalPauseTime: 0
    });
    setTab('pointage');
    showToast('Chronomètre démarré', 'success');
  };

  const startChrono = () => {
    if (!chrono.employeId) return showToast('Sélectionnez un employé', 'error');
    setChrono(p => ({ ...p, running: true, start: Date.now(), paused: false, pausedAt: null, totalPauseTime: 0 }));
  };

  // Pause/resume timer
  const togglePause = () => {
    if (!chrono.running) return;

    if (chrono.paused) {
      // Resume - add pause duration to total
      const pauseDuration = Date.now() - chrono.pausedAt;
      setChrono(p => ({
        ...p,
        paused: false,
        pausedAt: null,
        totalPauseTime: (p.totalPauseTime || 0) + pauseDuration
      }));
      showToast('Chronomètre repris', 'success');
    } else {
      // Pause
      setChrono(p => ({
        ...p,
        paused: true,
        pausedAt: Date.now()
      }));
      showToast('Pause', 'info');
    }
  };

  // Handle stop chrono - opens note modal
  const handleStopChrono = () => {
    if (!chrono.running) return;
    setPendingStopChrono(true);
    setNoteModalOpen(true);
  };

  // Actually stop the chrono with note
  const stopChronoWithNote = (note) => {
    if (!pendingStopChrono) return;

    let finalElapsed = elapsed;
    if (chrono.paused && chrono.pausedAt) {
      // Don't count current pause in final time
      finalElapsed = Math.floor((chrono.pausedAt - chrono.start - (chrono.totalPauseTime || 0)) / 1000);
    }

    const heures = finalElapsed / 3600;
    if (heures > 0.1) {
      setPointages([...pointages, {
        id: generateId(),
        employeId: chrono.employeId,
        chantierId: chrono.chantierId,
        date: new Date().toISOString().split('T')[0],
        heures: Math.round(heures * 10) / 10,
        approuve: false,
        manuel: false,
        verrouille: false,
        note: note || ''
      }]);
      showToast(`${Math.round(heures * 10) / 10}h enregistrées`, 'success');
    }

    setChrono({ running: false, start: null, employeId: '', chantierId: '', paused: false, pausedAt: null, totalPauseTime: 0 });
    setElapsed(0);
    setPendingStopChrono(false);
  };

  const addPointageManuel = () => {
    if (!pForm.employeId || !pForm.heures) {
      showToast('Employé et heures requis', 'error');
      return;
    }
    setPointages([...pointages, { id: generateId(), ...pForm, heures: parseFloat(pForm.heures), approuve: false, manuel: true, verrouille: false }]);
    setPForm({ employeId: '', chantierId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
    showToast('Pointage ajouté', 'success');
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
    showToast(`${newPointages.length} pointages ajoutés`, 'success');
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
  const approuverTout = () => {
    const ids = weekPointages.filter(p => !p.verrouille && !p.approuve).map(p => p.id);
    setPointages(pointages.map(p => ids.includes(p.id) ? { ...p, approuve: true } : p));
    showToast(`${ids.length} pointages validés`, 'success');
  };

  const rejeterPointage = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce pointage ?' });
    if (confirmed) setPointages(pointages.filter(p => p.id !== id));
  };

  const validerSemaine = async () => {
    const confirmed = await confirm({
      title: 'Valider la semaine',
      message: 'Valider et verrouiller les heures de la semaine ? Cette action est irreversible.',
      variant: 'warning'
    });
    if (!confirmed) return;
    const ids = weekPointages.map(p => p.id);
    setPointages(pointages.map(p => ids.includes(p.id) ? { ...p, approuve: true, verrouille: true } : p));
    showToast('Semaine validée et verrouillée', 'success');
  };

  const updatePointage = (id, field, value) => {
    setPointages(pointages.map(p => {
      if (p.id !== id || p.verrouille) return p;
      return { ...p, [field]: field === 'heures' ? parseFloat(value) || 0 : value };
    }));
  };

  const addEmploye = () => {
    if (!form.nom.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }
    const data = {
      id: editId || generateId(),
      ...form,
      tauxHoraire: parseFloat(form.tauxHoraire) || 45,
      coutHoraireCharge: parseFloat(form.coutHoraireCharge) || parseFloat(form.tauxHoraire) * 0.6 || 28,
      competences: form.competences || '',
      certifications: form.certifications || '',
      dateEmbauche: form.dateEmbauche || '',
      notes: form.notes || '',
    };
    if (editId) {
      setEquipe(equipe.map(e => e.id === editId ? data : e));
      showToast('Employé modifié', 'success');
    } else {
      setEquipe([...equipe, data]);
      showToast('Employé ajouté', 'success');
    }
    setShowAdd(false);
    setEditId(null);
    setForm({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '', dateEmbauche: '', competences: '', certifications: '', notes: '' });
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
      coutHoraireCharge: emp.coutHoraireCharge?.toString() || '',
      dateEmbauche: emp.dateEmbauche || '',
      competences: emp.competences || '',
      certifications: emp.certifications || '',
      notes: emp.notes || '',
    });
    setEditId(emp.id);
    setShowAdd(true);
  };

  const deleteEmploye = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cet employé ?' });
    if (confirmed) {
      setEquipe(equipe.filter(e => e.id !== id));
      showToast('Employé supprimé', 'success');
    }
  };

  const exportCSV = () => {
    const rows = [['Date', 'Employé', 'Chantier', 'Heures', 'Statut', 'Note']];
    weekPointages.forEach(p => {
      const emp = equipe.find(e => e.id === p.employeId);
      const ch = chantiers.find(c => c.id === p.chantierId);
      rows.push([
        p.date,
        `${emp?.nom || ''} ${emp?.prenom || ''}`,
        ch?.nom || '-',
        p.heures,
        p.verrouille ? 'Verrouille' : p.approuve ? 'Valide' : 'En attente',
        p.note || ''
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `heures_${weekStart.toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Export CSV téléchargé', 'success');
  };

  const getHeuresMois = (empId) => {
    const now = new Date();
    return pointages.filter(p => p.employeId === empId && new Date(p.date).getMonth() === now.getMonth() && p.approuve).reduce((s, p) => s + (p.heures || 0), 0);
  };

  const callPhone = (tel) => {
    if (!tel) return;
    window.location.href = `tel:${tel.replace(/\s/g, '')}`;
  };

  // Filtered and sorted employees
  const getFilteredEquipe = useMemo(() => {
    let filtered = [...equipe];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.nom?.toLowerCase().includes(q) ||
        e.prenom?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.telephone?.includes(q)
      );
    }

    // Role filter
    if (filterRole) {
      filtered = filtered.filter(e => e.role === filterRole);
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
        case 'hours':
          return getHeuresMois(b.id) - getHeuresMois(a.id);
        case 'rate':
          return (b.tauxHoraire || 45) - (a.tauxHoraire || 45);
        case 'active':
          const aActive = activeEmployeesToday.includes(a.id) ? 1 : 0;
          const bActive = activeEmployeesToday.includes(b.id) ? 1 : 0;
          return bActive - aActive;
        default:
          return 0;
      }
    });
  }, [equipe, searchQuery, filterRole, sortBy, activeEmployeesToday]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    return [...new Set(equipe.map(e => e.role).filter(Boolean))];
  }, [equipe]);

  // Employee add/edit form
  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShowAdd(false); setEditId(null); setForm({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '', dateEmbauche: '', competences: '', certifications: '', notes: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} employé</h1>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label>
            <input
              className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg} ${!form.nom.trim() && form.nom !== '' ? 'border-red-400' : ''}`}
              value={form.nom}
              onChange={e => setForm(p => ({...p, nom: e.target.value}))}
              placeholder="Dupont"
            />
            {!form.nom.trim() && form.nom !== '' && (
              <p className="text-red-500 text-xs mt-1">Le nom est requis</p>
            )}
          </div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prenom</label><input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} placeholder="Marie" /></div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Role / Poste</label>
            <select className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
              <option value="">Sélectionner...</option>
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
              <option value="">Sélectionner...</option>
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
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date d'embauche</label>
            <input type="date" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.dateEmbauche} onChange={e => setForm(p => ({...p, dateEmbauche: e.target.value}))} />
          </div>
        </div>

        {/* Compétences & Certifications */}
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h4 className={`font-medium mb-4 flex items-center gap-2 ${textPrimary}`}><HardHat size={16} style={{ color: couleur }} /> Compétences & Certifications</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Compétences</label>
              <textarea
                className={`w-full px-4 py-2.5 border rounded-xl min-h-[80px] resize-none ${inputBg}`}
                value={form.competences}
                onChange={e => setForm(p => ({...p, competences: e.target.value}))}
                placeholder="Plâtrerie, carrelage, plomberie..."
                rows={3}
              />
              <p className={`text-xs ${textMuted} mt-1`}>Séparez par des virgules</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Certifications</label>
              <textarea
                className={`w-full px-4 py-2.5 border rounded-xl min-h-[80px] resize-none ${inputBg}`}
                value={form.certifications}
                onChange={e => setForm(p => ({...p, certifications: e.target.value}))}
                placeholder="CACES, Habilitation électrique, SST..."
                rows={3}
              />
              <p className={`text-xs ${textMuted} mt-1`}>Séparez par des virgules</p>
            </div>
          </div>
          <div className="mt-4">
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes</label>
            <textarea
              className={`w-full px-4 py-2.5 border rounded-xl min-h-[60px] resize-none ${inputBg}`}
              value={form.notes}
              onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              placeholder="Notes sur cet employé..."
              rows={2}
            />
          </div>
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
          <button onClick={addEmploye} disabled={!form.nom.trim()} className="px-6 py-2.5 text-white rounded-xl min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50" style={{background: couleur}}>
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
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Saisie groupée</h1>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <p className={`text-sm ${textMuted} mb-4`}>Ajoutez les heures pour plusieurs employés en une seule fois</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Chantier *</label>
            <select className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={bulkForm.chantierId} onChange={e => setBulkForm(p => ({...p, chantierId: e.target.value}))}>
              <option value="">Sélectionner...</option>
              {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date</label>
            <input type="date" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={bulkForm.date} onChange={e => setBulkForm(p => ({...p, date: e.target.value}))} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Heures *</label>
            <div className="flex gap-2">
              <input type="number" step="0.5" className={`flex-1 px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={bulkForm.heures} onChange={e => setBulkForm(p => ({...p, heures: e.target.value}))} placeholder="8" />
              {/* Quick hour buttons */}
              <div className="flex gap-1">
                {[7, 8, 10].map(h => (
                  <button
                    key={h}
                    onClick={() => setBulkForm(p => ({ ...p, heures: h.toString() }))}
                    className={`px-2 py-1 rounded-lg text-xs font-medium min-h-[44px] transition-all ${
                      bulkForm.heures === h.toString()
                        ? 'text-white'
                        : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                    style={bulkForm.heures === h.toString() ? { background: couleur } : {}}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className={`text-sm font-medium ${textPrimary}`}>Employés ({bulkForm.selectedEmployees.length} sélectionné{bulkForm.selectedEmployees.length > 1 ? 's' : ''})</label>
            <button onClick={selectAllEmployees} className={`text-sm px-3 py-1 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {bulkForm.selectedEmployees.length === equipe.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {equipe.map(e => {
              const config = getRoleConfig(e.role);
              return (
                <button
                  key={e.id}
                  onClick={() => toggleBulkEmployee(e.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    bulkForm.selectedEmployees.includes(e.id)
                      ? 'shadow-lg scale-[1.02]'
                      : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={bulkForm.selectedEmployees.includes(e.id) ? { borderColor: couleur, background: `${couleur}10` } : {}}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: bulkForm.selectedEmployees.includes(e.id) ? couleur : config.color }}
                    >
                      {e.nom?.[0]}{e.prenom?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${textPrimary}`}>{e.nom}</p>
                      {e.role && <p className={`text-xs truncate ${textMuted}`}>{e.role}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
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
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Équipe & Heures</h1>
      </div>

      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
            <Users size={40} className="text-white" />
          </div>
          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>Gérez votre équipe</h2>
          <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
            Ajoutez vos employés, suivez leurs heures et calculez la rentabilité de vos chantiers.
          </p>
        </div>

        <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Fonctionnalités</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                <Timer size={18} style={{ color: couleur }} />
              </div>
              <div>
                <p className={`font-medium text-sm ${textPrimary}`}>Chronomètre</p>
                <p className={`text-xs ${textMuted}`}>Pointage en temps réel</p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                <TrendingUp size={18} style={{ color: couleur }} />
              </div>
              <div>
                <p className={`font-medium text-sm ${textPrimary}`}>Coût de revient</p>
                <p className={`text-xs ${textMuted}`}>Rentabilité par chantier</p>
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
            Ajouter mon premier employé
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Note Modal */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setPendingStopChrono(false);
        }}
        onSubmit={stopChronoWithNote}
        title="Fin du pointage"
        placeholder="Note pour ce pointage..."
        isDark={isDark}
        couleur={couleur}
      />

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Équipe & Heures</h1>
          {/* Online indicator */}
          <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
            isOnline
              ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'
          }`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkEntry(true)} className={`px-3 sm:px-4 py-2 rounded-xl text-sm min-h-[44px] flex items-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Zap size={16} /> <span className="hidden sm:inline">Saisie groupee</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="px-3 sm:px-4 py-2 text-white rounded-xl text-sm min-h-[44px] flex items-center gap-2" style={{background: couleur}}>
            <Plus size={16} /> <span className="hidden sm:inline">Employé</span>
          </button>
        </div>
      </div>

      {/* Visual Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Week Hero Card with Navigation */}
        <motion.div
          className="col-span-2 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden shadow-lg"
          style={{ background: `linear-gradient(135deg, #ea580c, #c2410c)` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-black/10 -ml-8 -mb-8" />

          <div className="relative">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="w-12 h-12 rounded-xl bg-white/90 hover:bg-white transition-colors flex items-center justify-center shadow-lg"
                aria-label="Semaine precedente"
              >
                <ChevronLeft size={24} className="text-orange-600" />
              </button>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-black/20 rounded-xl backdrop-blur-sm">
                <Calendar size={16} className="text-white" />
                <p className="text-sm text-white font-bold">
                  {weekOffset === 0 ? 'Cette semaine' : `Semaine du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <button
                onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
                disabled={weekOffset >= 0}
                className="w-12 h-12 rounded-xl bg-white/90 hover:bg-white transition-colors flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Semaine suivante"
              >
                <ChevronRight size={24} className="text-orange-600" />
              </button>
            </div>

            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-5xl sm:text-6xl font-black text-white" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>{totalWeekHours.toFixed(0)}<span className="text-3xl">h</span></p>
                <p className="text-sm text-white/95 mt-2 font-semibold" style={{textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}>{equipe.length} membre{equipe.length > 1 ? 's' : ''} dans l'équipe</p>
              </div>
              <div className="text-right bg-black/15 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 justify-end">
                  <Check size={16} className="text-white" />
                  <span className="text-sm text-white font-semibold">Validées</span>
                </div>
                <p className="text-2xl font-black text-white">{approvedWeekHours.toFixed(1)}h</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative">
              <div className="h-4 bg-black/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((approvedWeekHours / totalWeekHours) * 100, 100) || 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-sm mt-2 text-white text-right font-bold" style={{textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}>
                {totalWeekHours > 0 ? Math.round((approvedWeekHours / totalWeekHours) * 100) : 0}% validé
              </p>
            </div>
          </div>
        </motion.div>

        {/* Today's Activity Card */}
        <motion.div
          className={`${cardBg} rounded-2xl border p-4 relative overflow-hidden shadow-sm`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full -mr-6 -mt-6" style={{ background: `${couleur}15` }} />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${couleur}15` }}>
              <Clock size={18} style={{ color: couleur }} />
            </div>
            <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Aujourd'hui</p>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: couleur }}>{todayHours.toFixed(1)}h</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex -space-x-2">
                {equipe.filter(e => activeEmployeesToday.includes(e.id)).slice(0, 3).map((e, i) => {
                  const config = getRoleConfig(e.role);
                  return (
                    <div
                      key={e.id}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: config.color, borderColor: isDark ? '#1e293b' : '#fff', zIndex: 3 - i }}
                    >
                      {e.nom?.[0]}
                    </div>
                  );
                })}
              </div>
              <span className={`text-xs ${textMuted}`}>
                {activeEmployeesToday.length} actif{activeEmployeesToday.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Week Cost Card */}
        <motion.div
          className={`${cardBg} rounded-2xl border p-4 relative overflow-hidden shadow-sm`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-red-500/10 -mr-6 -mt-6" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
              <Euro size={18} className="text-red-500" />
            </div>
            <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Cout semaine</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-500">
              {modeDiscret ? '***' : weekCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
              <span className="text-base font-normal ml-1">€</span>
            </p>
            <p className={`text-xs ${textMuted} mt-2`}>Charges comprises</p>
          </div>
        </motion.div>
      </div>

      {/* Active Timer Banner */}
      <AnimatePresence>
        {chrono.running && (
          <motion.div
            className="rounded-2xl p-4 text-white relative overflow-hidden"
            style={{ background: chrono.paused ? '#64748b' : `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${chrono.paused ? 'bg-white/10' : 'bg-white/20'}`}>
                    <Timer size={24} />
                  </div>
                  {!chrono.paused && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl sm:text-4xl font-mono font-bold">{formatTime(elapsed)}</p>
                    {chrono.paused && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">PAUSE</span>
                    )}
                  </div>
                  <p className="text-sm opacity-80">
                    {equipe.find(e => e.id === chrono.employeId)?.nom} {equipe.find(e => e.id === chrono.employeId)?.prenom}
                    {chrono.chantierId && ` • ${chantiers.find(c => c.id === chrono.chantierId)?.nom}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={togglePause}
                  className={`p-3 rounded-xl ${chrono.paused ? 'bg-emerald-500' : 'bg-white/20 hover:bg-white/30'} transition-colors`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={chrono.paused ? 'Reprendre' : 'Pause'}
                >
                  {chrono.paused ? <Play size={20} fill="white" /> : <Pause size={20} />}
                </motion.button>
                <motion.button
                  onClick={handleStopChrono}
                  className="px-5 py-3 bg-red-500 rounded-xl font-medium flex items-center gap-2 shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Square size={18} fill="white" />
                  Arrêter
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Team Overview - Who's working where today */}
      <AnimatePresence>
        {activeEmployeesToday.length > 0 && (
          <motion.div
            className={`${cardBg} rounded-2xl border p-4 sm:p-5`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${textPrimary}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Équipe active maintenant
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {activeEmployeesToday.length} sur le terrain
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipe.filter(e => activeEmployeesToday.includes(e.id)).map((e, index) => {
                const currentCh = getEmployeeCurrentChantier(e.id);
                const todayH = getEmployeeTodayHours(e.id);
                const config = getRoleConfig(e.role);
                const RoleIcon = config.icon;
                return (
                  <motion.div
                    key={e.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gradient-to-r from-slate-50 to-white border-slate-200'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: config.color }}
                      >
                        {e.nom?.[0]}{e.prenom?.[0] || ''}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 flex items-center justify-center" style={{ borderColor: isDark ? '#1e293b' : '#fff' }}>
                        <Check size={10} className="text-white" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${textPrimary}`}>{e.nom} {e.prenom}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${textMuted} truncate`}>
                          <MapPin size={10} className="inline mr-1" />
                          {currentCh?.nom || 'Sans chantier'}
                        </span>
                        <span className="text-xs font-bold" style={{ color: couleur }}>{todayH.toFixed(1)}h</span>
                      </div>
                    </div>
                    {e.telephone && (
                      <button
                        onClick={() => callPhone(e.telephone)}
                        className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-emerald-900/50 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`}
                      >
                        <PhoneCall size={16} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <button onClick={() => setTab('validation')} className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm min-h-[44px] flex items-center gap-2">
            <Check size={16} /> Valider
          </button>
        </div>
      )}

      {/* Enhanced Tab Navigation */}
      <div className={`p-1.5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { key: 'overview', label: 'Équipe', icon: Users, count: equipe.length },
            { key: 'smart', label: 'GPS', icon: Navigation, badge: 'Nouveau' },
            { key: 'pointage', label: 'Pointage', icon: Timer },
            { key: 'validation', label: 'Validation', icon: CheckSquare, count: pointagesEnAttente.length, alert: pointagesEnAttente.length > 0 },
            { key: 'historique', label: 'Historique', icon: History }
          ].map(({ key, label, icon: Icon, count, alert, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap min-h-[44px] transition-all ${
                tab === key
                  ? 'text-white shadow-lg'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
              style={tab === key ? { background: couleur } : {}}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                  tab === key
                    ? 'bg-white/20 text-white'
                    : alert
                      ? 'bg-amber-500 text-white'
                      : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
              {badge && tab !== key && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-blue-600 text-blue-100' : 'bg-blue-100 text-blue-700'}`}>
                  {badge}
                </span>
              )}
              {alert && tab !== key && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview / Equipe Tab */}
      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search and Filter Bar */}
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un employé..."
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                />
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 min-h-[44px] transition-all ${
                  showFilters || filterRole
                    ? 'text-white'
                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'
                }`}
                style={showFilters || filterRole ? { background: couleur } : {}}
              >
                <Filter size={16} />
                Filtrer
                {filterRole && <span className="w-2 h-2 bg-white rounded-full" />}
              </button>

              {/* Sort controls */}
              <div className="flex gap-1">
                {[
                  { key: 'name', label: 'Nom', icon: User },
                  { key: 'active', label: 'Actif', icon: Zap },
                  { key: 'hours', label: 'Heures', icon: Clock }
                ].map(opt => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm min-h-[40px] transition-all ${
                        sortBy === opt.key
                          ? 'text-white shadow-md'
                          : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-white'
                      }`}
                      style={sortBy === opt.key ? { background: couleur } : {}}
                      title={`Trier par ${opt.label.toLowerCase()}`}
                    >
                      <OptIcon size={14} />
                      <span className="hidden lg:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Filter Pills */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-opacity-50" style={{ background: `${couleur}10` }}>
                    <button
                      onClick={() => setFilterRole('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        !filterRole
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'
                      }`}
                      style={!filterRole ? { background: couleur } : {}}
                    >
                      Tous
                    </button>
                    {uniqueRoles.map(role => {
                      const config = getRoleConfig(role);
                      return (
                        <button
                          key={role}
                          onClick={() => setFilterRole(role)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                            filterRole === role
                              ? 'text-white'
                              : isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'
                          }`}
                          style={filterRole === role ? { background: config.color } : {}}
                        >
                          <span>{config.emoji}</span>
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results count */}
            <div className="flex items-center justify-between px-1">
              <span className={`text-sm ${textMuted}`}>
                {getFilteredEquipe.length} employé{getFilteredEquipe.length > 1 ? 's' : ''}
                {searchQuery && ` pour "${searchQuery}"`}
                {filterRole && ` • ${filterRole}`}
              </span>
              {(searchQuery || filterRole) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterRole(''); }}
                  className={`text-sm flex items-center gap-1 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <X size={14} /> Effacer filtres
                </button>
              )}
            </div>

            {/* Employee Cards Grid */}
            {getFilteredEquipe.length === 0 ? (
              <motion.div
                className={`${cardBg} rounded-2xl border p-12 text-center`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Search size={48} className={`mx-auto mb-4 ${textMuted} opacity-50`} />
                <p className={`font-medium ${textPrimary}`}>Aucun employé trouvé</p>
                <p className={`text-sm ${textMuted} mt-1`}>Essayez avec d'autres criteres</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFilteredEquipe.map((e, index) => {
                  const config = getRoleConfig(e.role);
                  const RoleIcon = config.icon;
                  const isActiveToday = activeEmployeesToday.includes(e.id);
                  const currentCh = isActiveToday ? getEmployeeCurrentChantier(e.id) : null;
                  const monthHours = getHeuresMois(e.id);
                  const margin = (e.tauxHoraire || 45) - (e.coutHoraireCharge || 28);
                  const isCurrentlyTiming = chrono.running && chrono.employeId === e.id;

                  return (
                    <motion.div
                      key={e.id}
                      className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden group hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-500 transition-all ${isCurrentlyTiming ? 'ring-2' : ''}`}
                      style={isCurrentlyTiming ? { ringColor: couleur } : {}}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ y: -2 }}
                    >
                      {/* Card Header with gradient */}
                      <div
                        className="relative p-4 pb-12"
                        style={{ background: `linear-gradient(135deg, ${config.color}20, ${config.color}05)` }}
                      >
                        {/* Status badge */}
                        {isActiveToday && (
                          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${isDark ? 'bg-emerald-900/70 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Actif
                          </div>
                        )}

                        {/* Action buttons - ALWAYS VISIBLE on mobile */}
                        <div className="absolute top-3 right-3 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {/* Quick timer button */}
                          {!chrono.running && (
                            <button
                              onClick={() => quickStartTimer(e.id)}
                              className={`p-2 rounded-lg transition-colors shadow-sm ${isDark ? 'bg-emerald-900/70 hover:bg-emerald-800 text-emerald-300' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}
                              title="Demarrer le chrono"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          )}
                          {e.telephone && (
                            <button
                              onClick={() => callPhone(e.telephone)}
                              className={`p-2 rounded-lg transition-colors shadow-sm ${isDark ? 'bg-slate-700 hover:bg-emerald-900/50 text-emerald-400' : 'bg-white hover:bg-emerald-50 text-emerald-600'}`}
                              title="Appeler"
                            >
                              <Phone size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(e)}
                            className={`p-2 rounded-lg transition-colors shadow-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-500'}`}
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => deleteEmploye(e.id)}
                            className={`p-2 rounded-lg transition-colors shadow-sm ${isDark ? 'bg-slate-700 hover:bg-red-900/50 text-red-400' : 'bg-white hover:bg-red-50 text-red-500'}`}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Avatar and Name */}
                        <div className="flex items-center gap-3 mt-6 sm:mt-0">
                          <div className="relative">
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg"
                              style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}
                            >
                              {e.nom?.[0]}{e.prenom?.[0] || ''}
                            </div>
                            <div
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-md"
                              style={{ background: config.color }}
                            >
                              <RoleIcon size={12} />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-bold text-lg ${textPrimary}`}>{e.nom}</h3>
                            <p className={`text-sm ${textMuted}`}>{e.prenom || e.role || 'Employé'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 -mt-8">
                        {/* Role & Contract badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {e.role && (
                            <span
                              className="text-xs px-2.5 py-1 rounded-lg font-medium text-white"
                              style={{ background: config.color }}
                            >
                              {config.emoji} {e.role}
                            </span>
                          )}
                          {e.contrat && (
                            <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                              {e.contrat}
                            </span>
                          )}
                        </div>

                        {/* Current timer banner */}
                        {isCurrentlyTiming && (
                          <div
                            className="flex items-center gap-2 p-2.5 rounded-xl mb-4 text-white"
                            style={{ background: chrono.paused ? '#64748b' : couleur }}
                          >
                            <Timer size={14} />
                            <span className="text-sm font-medium">
                              {formatTime(elapsed)} {chrono.paused && '(pause)'}
                            </span>
                          </div>
                        )}

                        {/* Current location if active */}
                        {isActiveToday && currentCh && !isCurrentlyTiming && (
                          <div className={`flex items-center gap-2 p-2.5 rounded-xl mb-4 ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                            <MapPin size={14} className="text-emerald-600" />
                            <span className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{currentCh.nom}</span>
                            <span className="ml-auto text-sm font-bold" style={{ color: couleur }}>{getEmployeeTodayHours(e.id).toFixed(1)}h</span>
                          </div>
                        )}

                        {/* Employee Details: Date embauche + Compétences */}
                        {(e.dateEmbauche || e.competences || e.certifications) && (
                          <div className={`mb-3 p-3 rounded-xl space-y-2 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50/80'}`}>
                            {e.dateEmbauche && (
                              <div className="flex items-center gap-2">
                                <Calendar size={12} className={textMuted} />
                                <span className={`text-xs ${textMuted}`}>Embauché le {new Date(e.dateEmbauche).toLocaleDateString('fr-FR')}</span>
                                <span className={`text-xs font-medium ${textPrimary}`}>
                                  ({(() => {
                                    const diff = Math.floor((Date.now() - new Date(e.dateEmbauche).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                                    return diff < 1 ? '< 1 an' : `${diff} an${diff > 1 ? 's' : ''}`;
                                  })()})
                                </span>
                              </div>
                            )}
                            {e.competences && (
                              <div className="flex flex-wrap gap-1">
                                {e.competences.split(',').map((c, i) => c.trim()).filter(Boolean).map((c, i) => (
                                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {e.certifications && (
                              <div className="flex flex-wrap gap-1">
                                {e.certifications.split(',').map((c, i) => c.trim()).filter(Boolean).map((c, i) => (
                                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <p className={`text-xs font-medium ${textMuted} mb-1`}>Facturé</p>
                            <p className={`text-xl font-bold ${textPrimary}`}>
                              {modeDiscret ? '**' : e.tauxHoraire || 45}<span className="text-sm font-normal">€</span>
                            </p>
                          </div>
                          <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                            <p className={`text-xs font-medium ${textMuted} mb-1`}>Coût</p>
                            <p className="text-xl font-bold text-red-500">
                              {modeDiscret ? '**' : e.coutHoraireCharge || 28}<span className="text-sm font-normal">€</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-xl text-center" style={{ background: `${couleur}15` }}>
                            <p className={`text-xs font-medium ${textMuted} mb-1`}>Ce mois</p>
                            <p className="text-xl font-bold" style={{ color: couleur }}>
                              {monthHours.toFixed(0)}<span className="text-sm font-normal">h</span>
                            </p>
                          </div>
                        </div>

                        {/* Margin indicator */}
                        {!modeDiscret && (
                          <div className={`mt-3 flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50/50'}`}>
                            <span className={`text-xs ${textMuted}`}>Marge/heure:</span>
                            <span className={`text-sm font-bold ${margin > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {margin > 0 ? '+' : ''}{margin}€
                            </span>
                          </div>
                        )}

                        {/* Mobile quick pointage: one-tap start on active chantiers */}
                        {!chrono.running && chantiers.filter(c => c.statut === 'en_cours').length > 0 && (
                          <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${textMuted}`}>Pointage rapide</p>
                            <div className="flex flex-wrap gap-1.5">
                              {chantiers.filter(c => c.statut === 'en_cours').slice(0, 3).map(ch => (
                                <button
                                  key={ch.id}
                                  onClick={(ev) => { ev.stopPropagation(); quickStartTimer(e.id, ch.id); }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px] ${
                                    isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  <Play size={10} fill="currentColor" />
                                  {ch.nom?.length > 15 ? ch.nom.slice(0, 15) + '...' : ch.nom}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Clocking / GPS Tab */}
      <AnimatePresence mode="wait">
        {tab === 'smart' && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Smart Clocking Header */}
            <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
              <div
                className="p-4 text-white"
                style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Navigation size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Pointage Intelligent</h3>
                      <p className="text-sm opacity-80">GPS + Detection automatique</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {smartClocking.locationPermission === 'granted' && (
                      <span className="px-2 py-1 bg-white/20 rounded-lg text-xs flex items-center gap-1">
                        <Navigation size={12} /> GPS Actif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Employee Selection for Smart Clocking */}
                {!currentEmployeForSmartClock ? (
                  <div>
                    <p className={`text-sm font-medium mb-4 ${textPrimary}`}>
                      Qui utilise le pointage intelligent aujourd'hui ?
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {equipe.map(emp => {
                        const config = getRoleConfig(emp.role);
                        const isActive = activeEmployeesToday.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setCurrentEmployeForSmartClock(emp);
                              setSmartClockingMode(true);
                            }}
                            className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                              isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col items-center text-center">
                              <div className="relative">
                                <div
                                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold mb-2"
                                  style={{ background: config.color }}
                                >
                                  {emp.nom?.[0]}{emp.prenom?.[0] || ''}
                                </div>
                                {/* Status indicator */}
                                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                                  isActive
                                    ? 'bg-emerald-500'
                                    : isDark ? 'bg-slate-600' : 'bg-slate-300'
                                }`} style={{ borderColor: isDark ? '#1e293b' : '#fff' }} />
                              </div>
                              <p className={`text-sm font-medium ${textPrimary}`}>{emp.nom}</p>
                              <p className={`text-xs ${textMuted}`}>{emp.prenom}</p>
                              {isActive && (
                                <span className={`mt-1 text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                  Sur chantier
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current Employee Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                          style={{ background: getRoleConfig(currentEmployeForSmartClock.role).color }}
                        >
                          {currentEmployeForSmartClock.nom?.[0]}{currentEmployeForSmartClock.prenom?.[0] || ''}
                        </div>
                        <div>
                          <p className={`font-medium ${textPrimary}`}>
                            {currentEmployeForSmartClock.nom} {currentEmployeForSmartClock.prenom}
                          </p>
                          <p className={`text-sm ${textMuted}`}>{currentEmployeForSmartClock.role || 'Employé'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentEmployeForSmartClock(null);
                          setSmartClockingMode(false);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                      >
                        Changer
                      </button>
                    </div>

                    {/* Smart Clocking Widget */}
                    <SmartClockingWidget
                      employe={currentEmployeForSmartClock}
                      chantiers={chantiers}
                      onPointageCreated={(pointage) => {
                        setPointages(prev => [...prev, pointage]);
                        showToast(`${Math.round(pointage.heures * 10) / 10}h enregistrées`, 'success');
                      }}
                      couleur={couleur}
                      isDark={isDark}
                    />

                    {/* Location Status */}
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className={`text-sm font-medium ${textPrimary}`}>Statut GPS</p>
                        {smartClocking.locationPermission === 'granted' ? (
                          <span className="flex items-center gap-1 text-emerald-500 text-xs">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Actif
                          </span>
                        ) : (
                          <button
                            onClick={smartClocking.requestPermission}
                            className="px-3 py-1 rounded-lg text-xs text-white"
                            style={{ background: couleur }}
                          >
                            Activer GPS
                          </button>
                        )}
                      </div>

                      {smartClocking.nearbyChantiers.length > 0 && (
                        <div>
                          <p className={`text-xs ${textMuted} mb-2`}>Chantiers detectes a proximite:</p>
                          <div className="space-y-2">
                            {smartClocking.nearbyChantiers.map(ch => (
                              <div
                                key={ch.id}
                                className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-white'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} style={{ color: couleur }} />
                                  <span className={`text-sm ${textPrimary}`}>{ch.nom}</span>
                                </div>
                                <span className={`text-xs ${textMuted}`}>{ch.distance}m</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {smartClocking.nearbyChantiers.length === 0 && smartClocking.locationPermission === 'granted' && (
                        <p className={`text-sm ${textMuted}`}>
                          Aucun chantier detecte a proximite. Deplacez-vous vers un chantier pour activer le pointage automatique.
                        </p>
                      )}
                    </div>

                    {/* Offline Sync Status */}
                    {(smartClocking.pendingSync.items > 0 || smartClocking.pendingSync.pointages > 0) && (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'} border`}>
                        <div className="flex items-center gap-3">
                          <WifiOff size={20} className="text-amber-500" />
                          <div>
                            <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                              Donnees en attente de sync
                            </p>
                            <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              {smartClocking.pendingSync.pointages} pointage(s) seront synchronises une fois en ligne
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`${cardBg} rounded-xl border p-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
                    <Smartphone size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Mode Terrain</p>
                    <p className={`text-xs ${textMuted}`}>Grands boutons, gants OK</p>
                  </div>
                </div>
              </div>
              <div className={`${cardBg} rounded-xl border p-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
                    <WifiOff size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Hors ligne</p>
                    <p className={`text-xs ${textMuted}`}>Fonctionne sans reseau</p>
                  </div>
                </div>
              </div>
              <div className={`${cardBg} rounded-xl border p-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
                    <Navigation size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>GPS Intelligent</p>
                    <p className={`text-xs ${textMuted}`}>Detection automatique</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pointage Tab */}
      <AnimatePresence mode="wait">
        {tab === 'pointage' && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Visual Timer Card */}
            <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
              {/* Timer Header */}
              <div
                className="p-4 text-white"
                style={{ background: chrono.running ? (chrono.paused ? '#64748b' : `linear-gradient(135deg, ${couleur}, ${couleur}cc)`) : `linear-gradient(135deg, #64748b, #475569)` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${chrono.running ? 'bg-white/20' : 'bg-white/10'}`}>
                      <Timer size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Chronometre</h3>
                      <p className="text-sm opacity-80">
                        {chrono.running ? (chrono.paused ? 'En pause' : 'En cours...') : 'Pret a demarrer'}
                      </p>
                    </div>
                  </div>
                  {chrono.running && !chrono.paused && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-sm font-medium">REC</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timer Display */}
              <div className="p-6 sm:p-8">
                <div className="flex flex-col items-center">
                  {/* Circular Timer */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-6">
                    {/* Background circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        fill="none"
                        stroke={isDark ? '#334155' : '#e2e8f0'}
                        strokeWidth="8"
                      />
                      {/* Progress circle */}
                      {chrono.running && (
                        <motion.circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          fill="none"
                          stroke={chrono.paused ? '#64748b' : couleur}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 45}%`}
                          strokeDashoffset={`${2 * Math.PI * 45 * (1 - (elapsed % 3600) / 3600)}%`}
                          initial={{ strokeDashoffset: `${2 * Math.PI * 45}%` }}
                          animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - (elapsed % 3600) / 3600)}%` }}
                        />
                      )}
                    </svg>
                    {/* Time display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p
                        className="text-4xl sm:text-5xl font-mono font-bold tracking-tight"
                        style={{ color: chrono.running ? (chrono.paused ? '#64748b' : couleur) : (isDark ? '#94a3b8' : '#64748b') }}
                      >
                        {formatTime(elapsed)}
                      </p>
                      {chrono.running && chrono.employeId && (
                        <p className={`text-sm mt-2 ${textMuted}`}>
                          {equipe.find(e => e.id === chrono.employeId)?.nom}
                        </p>
                      )}
                      {chrono.paused && (
                        <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${textMuted}`}>
                          PAUSE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Employee Selection Grid */}
                  {!chrono.running && (
                    <div className="w-full mb-6">
                      <p className={`text-sm font-medium mb-3 ${textPrimary}`}>Sélectionner l'employé :</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {equipe.map(emp => {
                          const config = getRoleConfig(emp.role);
                          const isSelected = chrono.employeId === emp.id;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => setChrono(p => ({ ...p, employeId: emp.id }))}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'shadow-lg scale-[1.02]'
                                  : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                              }`}
                              style={isSelected ? { borderColor: couleur, background: `${couleur}10` } : {}}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                  style={{ background: isSelected ? couleur : config.color }}
                                >
                                  {emp.nom?.[0]}{emp.prenom?.[0] || ''}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${textPrimary}`}>{emp.nom}</p>
                                  <p className={`text-xs truncate ${textMuted}`}>{emp.role || 'Employé'}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chantier Selection */}
                  {!chrono.running && (
                    <div className="w-full mb-6">
                      <p className={`text-sm font-medium mb-3 ${textPrimary}`}>Chantier (optionnel):</p>
                      <select
                        className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                        value={chrono.chantierId}
                        onChange={e => setChrono(p => ({ ...p, chantierId: e.target.value }))}
                      >
                        <option value="">Aucun chantier</option>
                        {chantiers.filter(c => c.statut === 'en_cours').map(c => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Control Buttons */}
                  <div className="flex gap-3 flex-wrap justify-center">
                    {!chrono.running ? (
                      <motion.button
                        onClick={startChrono}
                        className="px-8 py-4 text-white rounded-2xl text-lg font-semibold flex items-center gap-3 shadow-lg disabled:opacity-50"
                        style={{ background: couleur }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!chrono.employeId}
                      >
                        <Play size={24} fill="white" />
                        Demarrer
                      </motion.button>
                    ) : (
                      <>
                        <motion.button
                          onClick={togglePause}
                          className={`px-6 py-4 rounded-2xl text-lg font-semibold flex items-center gap-3 shadow-lg ${
                            chrono.paused
                              ? 'bg-emerald-500 text-white'
                              : isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {chrono.paused ? (
                            <>
                              <Play size={20} fill="white" />
                              Reprendre
                            </>
                          ) : (
                            <>
                              <Coffee size={20} />
                              Pause
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          onClick={handleStopChrono}
                          className="px-8 py-4 bg-red-500 text-white rounded-2xl text-lg font-semibold flex items-center gap-3 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Square size={24} fill="white" />
                          Arrêter
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Entry Card */}
            <div className={`${cardBg} rounded-2xl border p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                  <Edit3 size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <h3 className={`font-semibold ${textPrimary}`}>Saisie manuelle</h3>
                  <p className={`text-sm ${textMuted}`}>Ajouter des heures manuellement</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <select
                  className={`col-span-2 sm:col-span-1 px-4 py-3 border rounded-xl ${inputBg}`}
                  value={pForm.employeId}
                  onChange={e => setPForm(p => ({ ...p, employeId: e.target.value }))}
                >
                  <option value="">Employé *</option>
                  {equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                </select>
                <select
                  className={`col-span-2 sm:col-span-1 px-4 py-3 border rounded-xl ${inputBg}`}
                  value={pForm.chantierId}
                  onChange={e => setPForm(p => ({ ...p, chantierId: e.target.value }))}
                >
                  <option value="">Chantier</option>
                  {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <input
                  type="date"
                  className={`px-4 py-3 border rounded-xl ${inputBg}`}
                  value={pForm.date}
                  onChange={e => setPForm(p => ({ ...p, date: e.target.value }))}
                />
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Heures"
                    className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                    value={pForm.heures}
                    onChange={e => setPForm(p => ({ ...p, heures: e.target.value }))}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${textMuted}`}>h</span>
                </div>
                <input
                  placeholder="Note..."
                  className={`col-span-2 sm:col-span-1 px-4 py-3 border rounded-xl ${inputBg}`}
                  value={pForm.note}
                  onChange={e => setPForm(p => ({ ...p, note: e.target.value }))}
                />
                <button
                  onClick={addPointageManuel}
                  disabled={!pForm.employeId || !pForm.heures}
                  className="col-span-2 sm:col-span-1 px-4 py-3 text-white rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ background: couleur }}
                >
                  <Plus size={18} />
                  Ajouter
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Tab */}
      <AnimatePresence mode="wait">
        {tab === 'validation' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Actions Bar */}
            <div className={`flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pointagesEnAttente.length > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                  {pointagesEnAttente.length > 0 ? (
                    <AlertCircle size={20} className="text-amber-500" />
                  ) : (
                    <Check size={20} className="text-emerald-500" />
                  )}
                </div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>
                    {pointagesEnAttente.length > 0 ? `${pointagesEnAttente.length} pointage${pointagesEnAttente.length > 1 ? 's' : ''} en attente` : 'Tout est valide'}
                  </p>
                  <p className={`text-sm ${textMuted}`}>
                    {pointagesEnAttente.length > 0 ? 'A valider avant export' : 'Vous pouvez verrouiller la semaine'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {pointagesEnAttente.length > 0 && (
                  <motion.button
                    onClick={approuverTout}
                    className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Check size={16} />
                    Tout valider
                  </motion.button>
                )}
                <motion.button
                  onClick={validerSemaine}
                  className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckSquare size={16} />
                  Verrouiller
                </motion.button>
              </div>
            </div>

            {/* Empty State */}
            {pointagesEnAttente.length === 0 ? (
              <motion.div
                className={`${cardBg} rounded-2xl border p-12 text-center`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckSquare size={40} className="text-emerald-500" />
                </div>
                <p className={`font-semibold text-lg ${textPrimary}`}>Tous les pointages sont valides</p>
                <p className={`text-sm ${textMuted} mt-2 max-w-sm mx-auto`}>
                  Excellent ! Vous pouvez maintenant verrouiller la semaine pour l'export comptable.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {pointagesEnAttente.map((p, index) => {
                  const emp = equipe.find(e => e.id === p.employeId);
                  const ch = chantiers.find(c => c.id === p.chantierId);
                  const config = getRoleConfig(emp?.role);

                  return (
                    <motion.div
                      key={p.id}
                      className={`${cardBg} rounded-xl border p-4 flex items-center gap-4`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {/* Employee Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ background: config.color }}
                        >
                          {emp?.nom?.[0]}{emp?.prenom?.[0] || ''}
                        </div>
                        <span
                          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 ${p.manuel ? 'bg-blue-500' : 'bg-orange-500'}`}
                          style={{ borderColor: isDark ? '#1e293b' : '#fff' }}
                          title={p.manuel ? 'Saisie manuelle' : 'Chronometre'}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${textPrimary}`}>{emp?.nom} {emp?.prenom}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm ${textMuted}`}>
                            {ch?.nom || 'Sans chantier'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textMuted}`}>
                            {new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {p.note && (
                          <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            "{p.note}"
                          </p>
                        )}
                      </div>

                      {/* Hours Input */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            value={p.heures}
                            onChange={e => updatePointage(p.id, 'heures', e.target.value)}
                            className={`w-20 px-3 py-2 border rounded-xl text-center text-lg font-bold ${inputBg}`}
                            style={{ color: couleur }}
                          />
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>h</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <motion.button
                          onClick={() => approuverPointage(p.id)}
                          className="p-3 bg-emerald-500 text-white rounded-xl shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Check size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => rejeterPointage(p.id)}
                          className={`p-3 rounded-xl ${isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <X size={20} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historique Tab */}
      <AnimatePresence mode="wait">
        {tab === 'historique' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header with export and week nav */}
            <div className={`flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                  <History size={20} style={{ color: couleur }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWeekOffset(o => o - 1)}
                      className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                    >
                      <ChevronLeft size={16} className={textMuted} />
                    </button>
                    <p className={`font-medium ${textPrimary}`}>
                      {weekOffset === 0 ? 'Cette semaine' : `Semaine du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                    </p>
                    <button
                      onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
                      disabled={weekOffset >= 0}
                      className={`p-1 rounded-lg disabled:opacity-30 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                    >
                      <ChevronRight size={16} className={textMuted} />
                    </button>
                  </div>
                  <p className={`text-sm ${textMuted}`}>{weekPointages.length} pointage{weekPointages.length > 1 ? 's' : ''} - {totalWeekHours.toFixed(1)}h total</p>
                </div>
              </div>
              <motion.button
                onClick={exportCSV}
                className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
                style={{ background: `${couleur}15`, color: couleur }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={16} />
                Exporter CSV
              </motion.button>
            </div>

            {/* Pointages List */}
            {weekPointages.length === 0 ? (
              <motion.div
                className={`${cardBg} rounded-2xl border p-12 text-center`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
                  <History size={40} className={textMuted} />
                </div>
                <p className={`font-semibold text-lg ${textPrimary}`}>Aucun pointage cette semaine</p>
                <p className={`text-sm ${textMuted} mt-2`}>
                  Les pointages apparaitront ici une fois saisis.
                </p>
              </motion.div>
            ) : (
              <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
                {weekPointages
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((p, index) => {
                    const emp = equipe.find(e => e.id === p.employeId);
                    const ch = chantiers.find(c => c.id === p.chantierId);
                    const config = getRoleConfig(emp?.role);

                    return (
                      <motion.div
                        key={p.id}
                        className={`flex items-center px-4 py-3 gap-3 ${isDark ? 'border-slate-700' : 'border-slate-100'} ${index !== weekPointages.length - 1 ? 'border-b' : ''}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        {/* Status Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          p.verrouille
                            ? 'bg-blue-500/20'
                            : p.approuve
                              ? 'bg-emerald-500/20'
                              : isDark ? 'bg-slate-700' : 'bg-slate-100'
                        }`}>
                          {p.verrouille ? (
                            <CheckSquare size={14} className="text-blue-500" />
                          ) : p.approuve ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Clock size={14} className={textMuted} />
                          )}
                        </div>

                        {/* Date */}
                        <div className={`w-16 sm:w-20 flex-shrink-0`}>
                          <p className={`text-sm font-medium ${textPrimary}`}>
                            {new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </p>
                          <p className={`text-xs ${textMuted}`}>
                            {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>

                        {/* Employee */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: config.color }}
                          >
                            {emp?.nom?.[0]}{emp?.prenom?.[0] || ''}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${textPrimary}`}>{emp?.nom} {emp?.prenom}</p>
                            <p className={`text-xs truncate ${textMuted}`}>{ch?.nom || 'Sans chantier'}</p>
                          </div>
                        </div>

                        {/* Source indicator */}
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${p.manuel ? 'bg-blue-500' : 'bg-orange-500'}`}
                          title={p.manuel ? 'Saisie manuelle' : 'Chronometre'}
                        />

                        {/* Hours */}
                        <div className="w-16 text-right flex-shrink-0">
                          <span className="text-lg font-bold" style={{ color: couleur }}>
                            {(p.heures || 0).toFixed(1)}
                          </span>
                          <span className={`text-sm ${textMuted}`}>h</span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}

            {/* Legend */}
            <div className={`flex flex-wrap items-center gap-4 p-3 rounded-xl text-sm ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <span className={`font-medium ${textMuted}`}>Legende:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className={textMuted}>Chrono</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className={textMuted}>Manuel</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                  <Check size={10} className="text-emerald-500" />
                </div>
                <span className={textMuted}>Valide</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
                  <CheckSquare size={10} className="text-blue-500" />
                </div>
                <span className={textMuted}>Verrouille</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Clocking Arrival Notification */}
      <PointageNotification
        isVisible={smartClocking.showArrivalNotification}
        onDismiss={smartClocking.dismissArrivalNotification}
        onCheckIn={(chantier) => {
          smartClocking.checkIn(chantier);
        }}
        chantier={smartClocking.arrivalChantier}
        distance={smartClocking.arrivalChantier?.distance}
        employe={currentEmployeForSmartClock}
        couleur={couleur}
        isDark={isDark}
      />

      {/* Geofence Toast for quick arrival notice */}
      <GeofenceArrivalToast
        isVisible={smartClocking.showArrivalNotification && !smartClocking.session}
        chantier={smartClocking.arrivalChantier}
        onTap={() => {
          if (smartClocking.arrivalChantier) {
            smartClocking.checkIn(smartClocking.arrivalChantier);
          }
        }}
        couleur={couleur}
      />
    </div>
  );
}
