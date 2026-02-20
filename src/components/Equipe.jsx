import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ArrowLeft, Edit3, Trash2, Check, X, User, Phone, Mail,
  Clock, Timer, Play, Square, ChevronRight, Euro, Users, CheckSquare,
  History, Download, MapPin, UserPlus, AlertCircle, TrendingUp, Zap,
  HardHat, Wrench, Plug, Paintbrush, Building2, UserCheck, PhoneCall,
  Pause, RotateCcw, ChevronDown, Sparkles, Target, Calendar, Search,
  ChevronLeft, Coffee, Wifi, WifiOff, Filter, Navigation, Smartphone,
  CalendarDays, Award, BarChart3, FileSpreadsheet, Shield, Star, ArrowUpRight, ArrowDownRight, Percent,
  PenTool, CalendarOff, Briefcase, CalendarPlus, Eye, ThumbsUp, ThumbsDown, Undo2,
  MessageSquare, Send, Paperclip, Image, Hash, AtSign, Pin, ChevronUp, Activity, FileText, Cake
} from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useFormValidation, employeeSchema, email as emailValidator, phone as phoneValidator } from '../lib/validation';

// Lazy-load optional heavy dependencies to prevent crashes
let NoteModal = null;
try { NoteModal = React.lazy(() => import('./NoteModal')); } catch(e) { console.warn('NoteModal not available'); }

// Stub for useSmartClocking to avoid crash from GeofencingService/PointageService
const useSmartClockingStub = () => ({
  session: null, elapsed: { workSeconds: 0, breakSeconds: 0 },
  isWorking: false, isPaused: false, isOnBreak: false,
  nearbyChantiers: [], locationPermission: 'unknown', isWatching: false,
  showArrivalNotification: false, arrivalChantier: null,
  pendingSync: { items: 0, pointages: 0 }, isOnline: navigator.onLine,
  checkIn: async () => {}, checkOut: async () => {}, pauseToggle: async () => {},
  breakToggle: async () => {}, dismissArrivalNotification: () => {},
  requestPermission: async () => false, updatePosition: async () => null,
  startWatching: () => {}, stopWatching: () => {}, syncPendingItems: async () => {}
});

// Storage key for timer persistence
const TIMER_STORAGE_KEY = 'chantierpro_equipe_timer';

// Local date helper — avoids toISOString() UTC timezone shift (J-1 bug)
const formatLocalDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Equipe({ equipe, setEquipe, addEmployee: addEmployeeProp, updateEmployee: updateEmployeeProp, deleteEmployee: deleteEmployeeProp, pointages, setPointages, addPointage: addPointageProp, chantiers, couleur, isDark, modeDiscret, setPage }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Form validation
  const employeeFullSchema = {
    ...employeeSchema,
    email: [emailValidator()],
    telephone: [phoneValidator()],
  };
  const { errors: formErrors, validateAll: validateEmployee, clearErrors: clearFormErrors } = useFormValidation(employeeFullSchema);

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  // Core state
  const [viewMode, setViewMode] = useState('employes'); // 'employes' | 'sous_traitants'
  const isSousTraitants = viewMode === 'sous_traitants';
  const [tab, setTab] = useState('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '', dateEmbauche: '', competences: '', certifications: '', notes: '', siret: '', decennale_assureur: '', decennale_numero: '', decennale_expiration: '', urssaf_date: '', tarif_type: 'horaire', tarif_forfait: '' });
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  // Pointage state
  const [pForm, setPForm] = useState({ employeId: '', chantierId: '', date: formatLocalDate(new Date()), heures: '', note: '' });
  const [chrono, setChrono] = useState({ running: false, start: null, employeId: '', chantierId: '', paused: false, pausedAt: null, totalPauseTime: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [bulkForm, setBulkForm] = useState({ chantierId: '', date: formatLocalDate(new Date()), heures: '8', selectedEmployees: [] });

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

  // Signature digitale state
  const [signatureModal, setSignatureModal] = useState({ open: false, pointageIds: [], employeId: null });
  const [signatures, setSignatures] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_signatures') || '{}'); } catch { return {}; }
  });
  const signatureCanvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  // Congés & absences state
  const [conges, setConges] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_conges') || '[]'); } catch { return []; }
  });
  const [showCongeForm, setShowCongeForm] = useState(false);
  const [congeForm, setCongeForm] = useState({ employeId: '', type: 'conge_paye', dateDebut: '', dateFin: '', motif: '' });
  const [congeFilter, setCongeFilter] = useState('all'); // all, pending, approved, rejected

  // Chat équipe state
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_chat') || '[]'); } catch { return []; }
  });
  const [chatChannel, setChatChannel] = useState('general');
  const [chatInput, setChatInput] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_chat_pins') || '[]'); } catch { return []; }
  });
  const chatEndRef = React.useRef(null);

  // Employee detail view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  // Vue Terrain mode
  const [showTerrainView, setShowTerrainView] = useState(false);
  // Per-chantier active timers tracking (for Vue Terrain)
  const [terrainTimers, setTerrainTimers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_terrain_timers') || '{}'); } catch { return {}; }
  });

  // Smart Clocking hook (stubbed - full version loads lazily)
  const smartClocking = useSmartClockingStub();

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

  // Escape key handler — close forms and modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (noteModalOpen) { setNoteModalOpen(false); setPendingStopChrono(false); return; }
        if (signatureModal.open) { setSignatureModal({ open: false, pointageIds: [], employeId: null }); return; }
        if (showCongeForm) { setShowCongeForm(false); return; }
        if (showBulkEntry) { setShowBulkEntry(false); return; }
        if (selectedEmployee) { setSelectedEmployee(null); return; }
        if (showAdd) { setShowAdd(false); setEditId(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [noteModalOpen, signatureModal.open, showCongeForm, showBulkEntry, selectedEmployee, showAdd]);

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

  // Persist signatures
  useEffect(() => {
    try { localStorage.setItem('chantierpro_signatures', JSON.stringify(signatures)); } catch {}
  }, [signatures]);

  // Persist congés
  useEffect(() => {
    try { localStorage.setItem('chantierpro_conges', JSON.stringify(conges)); } catch {}
  }, [conges]);

  // Persist chat
  useEffect(() => {
    try { localStorage.setItem('chantierpro_chat', JSON.stringify(messages)); } catch {}
  }, [messages]);
  useEffect(() => {
    try { localStorage.setItem('chantierpro_chat_pins', JSON.stringify(pinnedMessages)); } catch {}
  }, [pinnedMessages]);

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
  const today = formatLocalDate(new Date());
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
  const stopChronoWithNote = async (note) => {
    if (!pendingStopChrono) return;

    let finalElapsed = elapsed;
    if (chrono.paused && chrono.pausedAt) {
      // Don't count current pause in final time
      finalElapsed = Math.floor((chrono.pausedAt - chrono.start - (chrono.totalPauseTime || 0)) / 1000);
    }

    const heures = finalElapsed / 3600;
    if (heures > 0.1) {
      const pointageData = {
        employeId: chrono.employeId,
        chantierId: chrono.chantierId,
        date: formatLocalDate(new Date()),
        heures: Math.round(heures * 10) / 10,
        approuve: false,
        manuel: false,
        verrouille: false,
        description: note || ''
      };
      if (addPointageProp) {
        await addPointageProp(pointageData);
      } else {
        setPointages([...pointages, { id: generateId(), ...pointageData, note: note || '' }]);
      }
      showToast(`${Math.round(heures * 10) / 10}h enregistrées`, 'success');
    }

    setChrono({ running: false, start: null, employeId: '', chantierId: '', paused: false, pausedAt: null, totalPauseTime: 0 });
    setElapsed(0);
    setPendingStopChrono(false);
  };

  const addPointageManuel = async () => {
    if (!pForm.employeId || !pForm.heures) {
      showToast('Employé et heures requis', 'error');
      return;
    }
    const pointageData = { ...pForm, heures: parseFloat(pForm.heures), approuve: false, manuel: true, verrouille: false, description: pForm.note || '' };
    if (addPointageProp) {
      await addPointageProp(pointageData);
    } else {
      setPointages([...pointages, { id: generateId(), ...pointageData }]);
    }
    setPForm({ employeId: '', chantierId: '', date: formatLocalDate(new Date()), heures: '', note: '' });
    showToast('Pointage ajouté', 'success');
  };

  // Bulk time entry
  const addBulkPointages = async () => {
    if (!bulkForm.chantierId || bulkForm.selectedEmployees.length === 0 || !bulkForm.heures) return;
    if (addPointageProp) {
      for (const empId of bulkForm.selectedEmployees) {
        await addPointageProp({
          employeId: empId,
          chantierId: bulkForm.chantierId,
          date: bulkForm.date,
          heures: parseFloat(bulkForm.heures),
          approuve: false,
          manuel: true,
          verrouille: false,
          description: 'Saisie groupée'
        });
      }
    } else {
      const newPointages = bulkForm.selectedEmployees.map(empId => ({
        id: generateId(),
        employeId: empId,
        chantierId: bulkForm.chantierId,
        date: bulkForm.date,
        heures: parseFloat(bulkForm.heures),
        approuve: false,
        manuel: true,
        verrouille: false,
        note: 'Saisie groupée'
      }));
      setPointages([...pointages, ...newPointages]);
    }
    setShowBulkEntry(false);
    setBulkForm({ chantierId: '', date: formatLocalDate(new Date()), heures: '8', selectedEmployees: [] });
    showToast(`${bulkForm.selectedEmployees.length} pointages ajoutés`, 'success');
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

  const addEmploye = async () => {
    if (!validateEmployee(form)) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }
    const data = {
      ...form,
      type: isSousTraitants ? 'sous_traitant' : 'employe',
      tauxHoraire: parseFloat(form.tauxHoraire) || (isSousTraitants ? 0 : 45),
      coutHoraireCharge: parseFloat(form.coutHoraireCharge) || parseFloat(form.tauxHoraire) * 0.6 || 28,
      competences: form.competences || '',
      certifications: form.certifications || '',
      dateEmbauche: form.dateEmbauche || '',
      notes: form.notes || '',
      siret: form.siret || '',
      decennale_assureur: form.decennale_assureur || '',
      decennale_numero: form.decennale_numero || '',
      decennale_expiration: form.decennale_expiration || '',
      urssaf_date: form.urssaf_date || '',
      tarif_type: form.tarif_type || 'horaire',
      tarif_forfait: form.tarif_forfait ? parseFloat(form.tarif_forfait) : null,
    };
    if (editId) {
      if (updateEmployeeProp) {
        await updateEmployeeProp(editId, data);
      } else {
        setEquipe(equipe.map(e => e.id === editId ? { id: editId, ...data } : e));
      }
      showToast(isSousTraitants ? 'Sous-traitant modifié' : 'Employé modifié', 'success');
    } else {
      if (addEmployeeProp) {
        await addEmployeeProp(data);
      } else {
        setEquipe([...equipe, { id: generateId(), ...data }]);
      }
      showToast(isSousTraitants ? 'Sous-traitant ajouté' : 'Employé ajouté', 'success');
    }
    setShowAdd(false);
    setEditId(null);
    clearFormErrors();
    setForm({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '', dateEmbauche: '', competences: '', certifications: '', notes: '', siret: '', decennale_assureur: '', decennale_numero: '', decennale_expiration: '', urssaf_date: '', tarif_type: 'horaire', tarif_forfait: '' });
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
      siret: emp.siret || '',
      decennale_assureur: emp.decennale_assureur || '',
      decennale_numero: emp.decennale_numero || '',
      decennale_expiration: emp.decennale_expiration || '',
      urssaf_date: emp.urssaf_date || '',
      tarif_type: emp.tarif_type || 'horaire',
      tarif_forfait: emp.tarif_forfait?.toString() || '',
    });
    setEditId(emp.id);
    if (emp.type === 'sous_traitant') setViewMode('sous_traitants');
    setShowAdd(true);
  };

  const deleteEmploye = async (id) => {
    const emp = equipe.find(e => e.id === id);
    const isST = emp?.type === 'sous_traitant';
    const confirmed = await confirm({ title: 'Supprimer', message: `Supprimer ${isST ? 'ce sous-traitant' : 'cet employé'} ?` });
    if (confirmed) {
      if (deleteEmployeeProp) {
        await deleteEmployeeProp(id);
      } else {
        setEquipe(equipe.filter(e => e.id !== id));
      }
      showToast(isST ? 'Sous-traitant supprimé' : 'Employé supprimé', 'success');
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
    a.download = `heures_${formatLocalDate(weekStart)}.csv`;
    a.click();
    showToast('Export CSV téléchargé', 'success');
  };

  // ====== EXPORT PAIE CSV (payroll-ready) ======
  const exportPaieCSV = (period = 'week') => {
    const now = new Date();
    let periodPointages, periodLabel;

    if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodPointages = pointages.filter(p => {
        const d = new Date(p.date);
        return d >= monthStart && d <= monthEnd && p.approuve;
      });
      periodLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else {
      periodPointages = weekPointages.filter(p => p.approuve);
      periodLabel = `semaine_${formatLocalDate(weekStart)}`;
    }

    if (periodPointages.length === 0) {
      showToast('Aucun pointage validé pour cette période', 'error');
      return;
    }

    // Group by employee
    const byEmployee = {};
    periodPointages.forEach(p => {
      if (!byEmployee[p.employeId]) byEmployee[p.employeId] = [];
      byEmployee[p.employeId].push(p);
    });

    const HEURES_LEGALES_SEMAINE = 35;
    const rows = [
      ['Matricule', 'Nom', 'Prénom', 'Rôle', 'Taux horaire (€)', 'Coût chargé (€)',
       'Heures normales', 'Heures sup. (25%)', 'Heures sup. (50%)',
       'Total heures', 'Montant brut (€)', 'Coût total chargé (€)',
       'Nb jours travaillés', 'Chantiers', 'Période']
    ];

    Object.entries(byEmployee).forEach(([empId, empPointages]) => {
      const emp = equipe.find(e => e.id === empId);
      if (!emp) return;

      const totalHeures = empPointages.reduce((s, p) => s + (p.heures || 0), 0);
      const tauxHoraire = parseFloat(emp.tauxHoraire) || 45;
      const coutCharge = parseFloat(emp.coutHoraireCharge) || 28;

      // Overtime calculation (weekly basis)
      let heuresNormales, heuresSup25, heuresSup50;
      if (period === 'week') {
        heuresNormales = Math.min(totalHeures, HEURES_LEGALES_SEMAINE);
        const heuresSup = Math.max(0, totalHeures - HEURES_LEGALES_SEMAINE);
        heuresSup25 = Math.min(heuresSup, 8); // 35-43h → +25%
        heuresSup50 = Math.max(0, heuresSup - 8); // >43h → +50%
      } else {
        // Monthly: approximate 4.33 weeks
        const weeklyAvg = totalHeures / 4.33;
        const weeklyNormal = Math.min(weeklyAvg, HEURES_LEGALES_SEMAINE);
        const weeklySup = Math.max(0, weeklyAvg - HEURES_LEGALES_SEMAINE);
        heuresNormales = +(weeklyNormal * 4.33).toFixed(2);
        heuresSup25 = +(Math.min(weeklySup, 8) * 4.33).toFixed(2);
        heuresSup50 = +(Math.max(0, weeklySup - 8) * 4.33).toFixed(2);
      }

      const montantBrut = (heuresNormales * tauxHoraire) + (heuresSup25 * tauxHoraire * 1.25) + (heuresSup50 * tauxHoraire * 1.5);
      const coutTotal = (heuresNormales * coutCharge) + (heuresSup25 * coutCharge * 1.25) + (heuresSup50 * coutCharge * 1.5);
      const joursTravailles = new Set(empPointages.map(p => p.date)).size;
      const chantiersList = [...new Set(empPointages.map(p => {
        const ch = chantiers.find(c => c.id === p.chantierId);
        return ch?.nom || 'N/A';
      }))].join(' | ');

      rows.push([
        emp.id.slice(0, 8).toUpperCase(),
        emp.nom || '',
        emp.prenom || '',
        emp.role || '',
        tauxHoraire.toFixed(2),
        coutCharge.toFixed(2),
        heuresNormales.toFixed(2),
        heuresSup25.toFixed(2),
        heuresSup50.toFixed(2),
        totalHeures.toFixed(2),
        montantBrut.toFixed(2),
        coutTotal.toFixed(2),
        joursTravailles,
        chantiersList,
        periodLabel
      ]);
    });

    // Add summary row
    const totalH = periodPointages.reduce((s, p) => s + (p.heures || 0), 0);
    rows.push([]);
    rows.push(['', '', '', 'TOTAL', '', '', '', '', '', totalH.toFixed(2), '', '', '', '', '']);

    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `paie_${periodLabel.replace(/\s/g, '_')}.csv`;
    a.click();
    showToast(`Export paie téléchargé (${Object.keys(byEmployee).length} employés)`, 'success');
  };

  const getHeuresMois = (empId) => {
    const now = new Date();
    return pointages.filter(p => p.employeId === empId && new Date(p.date).getMonth() === now.getMonth() && p.approuve).reduce((s, p) => s + (p.heures || 0), 0);
  };

  const callPhone = (tel) => {
    if (!tel) return;
    window.location.href = `tel:${tel.replace(/\s/g, '')}`;
  };

  // ====== SIGNATURE FUNCTIONS ======
  const initSignatureCanvas = useCallback((canvas) => {
    if (!canvas) return;
    signatureCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isDark]);

  const startDrawing = useCallback((e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  }, []);

  const saveSignature = useCallback(() => {
    if (!signatureData || !signatureModal.employeId) return;
    const weekKey = formatLocalDate(weekStart);
    const sigKey = `${signatureModal.employeId}_${weekKey}`;
    setSignatures(prev => ({
      ...prev,
      [sigKey]: {
        data: signatureData,
        date: new Date().toISOString(),
        pointageIds: signatureModal.pointageIds,
        employeId: signatureModal.employeId
      }
    }));
    // Auto-approve pointages signed
    setPointages(prev => prev.map(p =>
      signatureModal.pointageIds.includes(p.id) ? { ...p, approuve: true, signedAt: new Date().toISOString() } : p
    ));
    setSignatureModal({ open: false, pointageIds: [], employeId: null });
    setSignatureData(null);
    showToast('Signature enregistrée — pointages validés', 'success');
  }, [signatureData, signatureModal, weekStart, setPointages, showToast]);

  const getEmployeeWeekSignature = useCallback((empId) => {
    const weekKey = formatLocalDate(weekStart);
    return signatures[`${empId}_${weekKey}`] || null;
  }, [signatures, weekStart]);

  // ====== CONGÉS FUNCTIONS ======
  const CONGE_TYPES = {
    conge_paye: { label: 'Congé payé', color: '#3b82f6', icon: Briefcase },
    rtt: { label: 'RTT', color: '#8b5cf6', icon: Calendar },
    maladie: { label: 'Arrêt maladie', color: '#ef4444', icon: AlertCircle },
    sans_solde: { label: 'Sans solde', color: '#64748b', icon: CalendarOff },
    formation: { label: 'Formation', color: '#f59e0b', icon: Award },
    autre: { label: 'Autre', color: '#6b7280', icon: CalendarOff }
  };

  const addConge = () => {
    if (!congeForm.employeId || !congeForm.dateDebut || !congeForm.dateFin) {
      showToast('Remplir tous les champs obligatoires', 'error');
      return;
    }
    if (new Date(congeForm.dateFin) < new Date(congeForm.dateDebut)) {
      showToast('La date de fin doit être après la date de début', 'error');
      return;
    }
    const newConge = {
      id: generateId(),
      ...congeForm,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setConges(prev => [...prev, newConge]);
    setCongeForm({ employeId: '', type: 'conge_paye', dateDebut: '', dateFin: '', motif: '' });
    setShowCongeForm(false);
    showToast('Demande de congé créée', 'success');
  };

  const approveConge = (id) => {
    setConges(prev => prev.map(c => c.id === id ? { ...c, status: 'approved', approvedAt: new Date().toISOString() } : c));
    showToast('Congé approuvé', 'success');
  };

  const rejectConge = (id) => {
    setConges(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected', rejectedAt: new Date().toISOString() } : c));
    showToast('Congé refusé', 'info');
  };

  const cancelConge = (id) => {
    setConges(prev => prev.filter(c => c.id !== id));
    showToast('Demande annulée', 'info');
  };

  const getWorkingDays = (start, end) => {
    let count = 0;
    const d = new Date(start);
    const endDate = new Date(end);
    while (d <= endDate) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const getCongeBalance = (empId) => {
    const approved = conges.filter(c => c.employeId === empId && c.status === 'approved');
    const totalUsed = approved.reduce((s, c) => s + getWorkingDays(c.dateDebut, c.dateFin), 0);
    // Convention: 25 jours congés payés + 10 RTT par an
    return { cpTotal: 25, cpUsed: approved.filter(c => c.type === 'conge_paye').reduce((s, c) => s + getWorkingDays(c.dateDebut, c.dateFin), 0), rttTotal: 10, rttUsed: approved.filter(c => c.type === 'rtt').reduce((s, c) => s + getWorkingDays(c.dateDebut, c.dateFin), 0), totalUsed };
  };

  // ====== CHAT FUNCTIONS ======
  const CHAT_CHANNELS = useMemo(() => {
    const channels = [{ id: 'general', label: 'Général', icon: Hash }];
    chantiers.filter(c => c.statut === 'en_cours').forEach(c => {
      channels.push({ id: `chantier_${c.id}`, label: c.nom, icon: Building2 });
    });
    return channels;
  }, [chantiers]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    const msg = {
      id: generateId(),
      channel: chatChannel,
      text: chatInput.trim(),
      sender: 'admin',
      senderName: 'Vous (Admin)',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    setMessages(prev => [...prev, msg]);
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chatInput, chatChannel]);

  const togglePin = useCallback((msgId) => {
    setPinnedMessages(prev =>
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  }, []);

  const channelMessages = useMemo(() =>
    messages.filter(m => m.channel === chatChannel).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [messages, chatChannel]
  );

  // ====== EMPLOYEE DETAIL HELPERS ======
  const getEmployeeStats = useCallback((empId) => {
    const now = new Date();
    const empPointages = pointages.filter(p => p.employeId === empId);
    const monthPointages = empPointages.filter(p => new Date(p.date).getMonth() === now.getMonth());
    const monthHours = monthPointages.reduce((s, p) => s + (p.heures || 0), 0);
    const totalHours = empPointages.reduce((s, p) => s + (p.heures || 0), 0);
    const avgDaily = empPointages.length > 0 ? totalHours / new Set(empPointages.map(p => p.date)).size : 0;
    const chantiersWorked = new Set(empPointages.map(p => p.chantierId).filter(Boolean)).size;
    const emp = equipe.find(e => e.id === empId);
    const daysSinceHire = emp?.dateEmbauche ? Math.floor((now - new Date(emp.dateEmbauche)) / (1000 * 60 * 60 * 24)) : null;
    const empConges = conges.filter(c => c.employeId === empId);
    const approvedConges = empConges.filter(c => c.status === 'approved');
    return { monthHours, totalHours, avgDaily: Math.round(avgDaily * 10) / 10, chantiersWorked, daysSinceHire, totalPointages: empPointages.length, approvedConges: approvedConges.length, pendingConges: empConges.filter(c => c.status === 'pending').length };
  }, [pointages, equipe, conges]);

  // Filter by view mode (employes vs sous-traitants)
  const employesList = useMemo(() => equipe.filter(e => e.type !== 'sous_traitant'), [equipe]);
  const sousTraitantsList = useMemo(() => equipe.filter(e => e.type === 'sous_traitant'), [equipe]);
  const currentList = isSousTraitants ? sousTraitantsList : employesList;

  // Filtered and sorted employees
  const getFilteredEquipe = useMemo(() => {
    let filtered = [...currentList];

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
  }, [currentList, searchQuery, filterRole, sortBy, activeEmployeesToday]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    return [...new Set(currentList.map(e => e.role).filter(Boolean))];
  }, [currentList]);

  // Employee add/edit form
  if (showAdd) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShowAdd(false); setEditId(null); setForm({ nom: '', prenom: '', telephone: '', email: '', role: '', contrat: '', tauxHoraire: '', coutHoraireCharge: '', dateEmbauche: '', competences: '', certifications: '', notes: '', siret: '', decennale_assureur: '', decennale_numero: '', decennale_expiration: '', urssaf_date: '', tarif_type: 'horaire', tarif_forfait: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : isSousTraitants ? 'Nouveau sous-traitant' : 'Nouvel employé'}</h2>
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
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prénom</label><input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} placeholder="Marie" /></div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Role / Poste</label>
            <select className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
              <option value="">Sélectionner...</option>
              <option value="Chef de chantier">Chef de chantier</option>
              <option value="Ouvrier qualifié">Ouvrier qualifié</option>
              <option value="Électricien">Électricien</option>
              <option value="Plombier">Plombier</option>
              <option value="Peintre">Peintre</option>
              <option value="Maçon">Maçon</option>
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
              <option value="Intérim">Intérim</option>
              <option value="Apprentissage">Apprentissage</option>
              <option value="Stage">Stage</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Téléphone</label>
            <input type="tel" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg} ${formErrors.telephone ? 'border-red-400' : ''}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} placeholder="06 12 34 56 78" />
            {formErrors.telephone && <p className="text-red-500 text-xs mt-1">{formErrors.telephone}</p>}
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label>
            <input type="email" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg} ${formErrors.email ? 'border-red-400' : ''}`} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="email@example.com" />
            {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>
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

        {/* Sous-traitant specific fields */}
        {isSousTraitants && (
          <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <h4 className={`font-medium mb-4 flex items-center gap-2 ${textPrimary}`}><Shield size={16} style={{ color: '#7c3aed' }} /> Informations légales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>SIRET</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.siret} onChange={e => setForm(p => ({...p, siret: e.target.value}))} placeholder="123 456 789 00012" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Assureur décennale</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.decennale_assureur} onChange={e => setForm(p => ({...p, decennale_assureur: e.target.value}))} placeholder="AXA, MAAF, Allianz..." />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>N° police décennale</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.decennale_numero} onChange={e => setForm(p => ({...p, decennale_numero: e.target.value}))} placeholder="POL-2024-XXXXX" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Expiration décennale</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.decennale_expiration} onChange={e => setForm(p => ({...p, decennale_expiration: e.target.value}))} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Dernière vérification URSSAF</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.urssaf_date} onChange={e => setForm(p => ({...p, urssaf_date: e.target.value}))} />
                <p className={`text-xs ${textMuted} mt-1`}>Date de vérification de vigilance</p>
              </div>
            </div>
          </div>
        )}

        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h4 className={`font-medium mb-4 flex items-center gap-2 ${textPrimary}`}><Euro size={16} style={{ color: couleur }} /> Tarification</h4>
          {isSousTraitants && (
            <div className="flex gap-2 mb-4">
              {['horaire', 'forfait'].map(t => (
                <button
                  key={t}
                  onClick={() => setForm(p => ({...p, tarif_type: t}))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    form.tarif_type === t ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                  style={form.tarif_type === t ? { background: '#7c3aed' } : {}}
                >
                  {t === 'horaire' ? 'Taux horaire' : 'Forfait'}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>{isSousTraitants ? 'Taux horaire (EUR/h)' : 'Taux facturation (EUR/h)'}</label>
              <input type="number" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.tauxHoraire} onChange={e => setForm(p => ({...p, tauxHoraire: e.target.value}))} placeholder="45" />
              <p className={`text-xs ${textMuted} mt-1`}>{isSousTraitants ? 'Tarif horaire du sous-traitant' : 'Prix facturé au client'}</p>
            </div>
            {isSousTraitants && form.tarif_type === 'forfait' ? (
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Montant forfait (EUR)</label>
                <input type="number" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.tarif_forfait} onChange={e => setForm(p => ({...p, tarif_forfait: e.target.value}))} placeholder="5000" />
                <p className={`text-xs ${textMuted} mt-1`}>Montant forfaitaire pour la mission</p>
              </div>
            ) : (
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Coût horaire chargé (EUR/h) *</label>
                <input type="number" className={`w-full px-4 py-2.5 border rounded-xl min-h-[44px] ${inputBg}`} value={form.coutHoraireCharge} onChange={e => setForm(p => ({...p, coutHoraireCharge: e.target.value}))} placeholder="28" />
                <p className={`text-xs ${textMuted} mt-1`}>{isSousTraitants ? 'Coût réel pour votre entreprise' : 'Salaire brut + charges (~45%)'}</p>
              </div>
            )}
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
        <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Saisie groupée</h2>
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
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>{isSousTraitants ? 'Sous-traitants' : 'Équipe & Heures'}</h1>
          {!isSousTraitants && <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium" style={{ background: `${couleur}20`, color: couleur }}>{employesList.length} membre{employesList.length > 1 ? 's' : ''}</span>}
        </div>

        {/* Toggle Équipe / Sous-traitants */}
        <div className={`flex p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <button
            onClick={() => { setViewMode('employes'); setTab('overview'); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${!isSousTraitants ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            style={!isSousTraitants ? { background: couleur } : {}}
          >
            <Users size={16} /> Équipe
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${!isSousTraitants ? 'bg-white/20 text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{employesList.length}</span>
          </button>
          <button
            onClick={() => { setViewMode('sous_traitants'); setTab('overview'); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${isSousTraitants ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            style={isSousTraitants ? { background: '#7c3aed' } : {}}
          >
            <UserCheck size={16} /> Sous-traitants
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${isSousTraitants ? 'bg-white/20 text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{sousTraitantsList.length}</span>
          </button>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
            <Users size={40} className="text-white" />
          </div>
          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>{isSousTraitants ? 'Gérez vos sous-traitants' : 'Gérez votre équipe'}</h2>
          <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
            {isSousTraitants ? 'Ajoutez vos sous-traitants, vérifiez leur conformité et suivez les coûts.' : 'Ajoutez vos employés, suivez leurs heures et calculez la rentabilité de vos chantiers.'}
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
      {/* Note Modal - inline fallback */}
      {noteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setNoteModalOpen(false); setPendingStopChrono(false); }}>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-md`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Fin du pointage</h3>
            <textarea
              autoFocus
              className={`w-full px-4 py-3 border rounded-xl text-sm mb-4 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              placeholder="Note pour ce pointage..."
              rows={3}
              id="chrono-note"
            />
            <div className="flex gap-3">
              <button onClick={() => { stopChronoWithNote(''); setNoteModalOpen(false); }} className={`flex-1 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>Sans note</button>
              <button onClick={() => { const note = document.getElementById('chrono-note')?.value || ''; stopChronoWithNote(note); setNoteModalOpen(false); }} className="flex-1 px-4 py-2.5 rounded-xl text-white" style={{background: couleur}}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>{isSousTraitants ? 'Sous-traitants' : 'Équipe & Heures'}</h1>
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
          {/* Équipe / Sous-traitants toggle */}
          <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <button
              onClick={() => { setViewMode('employes'); setTab('overview'); }}
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-all ${
                !isSousTraitants ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={!isSousTraitants ? { background: couleur } : {}}
            >
              <Users size={14} />
              <span className="hidden sm:inline">Équipe</span>
              {employesList.length > 0 && <span className={`text-xs px-1.5 rounded-full ${!isSousTraitants ? 'bg-white/20' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>{employesList.length}</span>}
            </button>
            <button
              onClick={() => { setViewMode('sous_traitants'); setTab('overview'); }}
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-all ${
                isSousTraitants ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={isSousTraitants ? { background: '#7c3aed' } : {}}
            >
              <UserCheck size={14} />
              <span className="hidden sm:inline">Sous-traitants</span>
              {sousTraitantsList.length > 0 && <span className={`text-xs px-1.5 rounded-full ${isSousTraitants ? 'bg-white/20' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>{sousTraitantsList.length}</span>}
            </button>
          </div>
          {!isSousTraitants && (
            <>
              <button onClick={() => setShowTerrainView(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl text-sm flex items-center justify-center sm:gap-2 text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                <HardHat size={16} /> <span className="hidden sm:inline">Pointer</span>
              </button>
              <button onClick={() => setShowBulkEntry(true)} className={`w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl text-sm flex items-center justify-center sm:gap-2 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                <Zap size={16} /> <span className="hidden sm:inline">Saisie groupée</span>
              </button>
            </>
          )}
          <button onClick={() => setShowAdd(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl text-sm flex items-center justify-center sm:gap-2" style={{background: isSousTraitants ? '#7c3aed' : couleur}}>
            <Plus size={16} /> <span className="hidden sm:inline">{isSousTraitants ? 'Sous-traitant' : 'Employé'}</span>
          </button>
        </div>
      </div>

      {/* Visual Stats Dashboard — only for employes mode */}
      {!isSousTraitants && (<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                aria-label="Semaine précédente"
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
            <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Coût semaine</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-500">
              {modeDiscret ? '***' : weekCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
              <span className="text-base font-normal ml-1">€</span>
            </p>
            <p className={`text-xs ${textMuted} mt-2`}>Charges comprises</p>
          </div>
        </motion.div>
      </div>
      )}

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
        {!isSousTraitants && activeEmployeesToday.length > 0 && (
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
      {!isSousTraitants && pointagesEnAttente.length > 0 && (
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
          {(isSousTraitants ? [
            { key: 'overview', label: 'Sous-traitants', icon: UserCheck, count: sousTraitantsList.length },
            { key: 'couts', label: 'Coûts', icon: Euro },
          ] : [
            { key: 'overview', label: 'Équipe', icon: Users, count: employesList.length },
            { key: 'planning', label: 'Planning', icon: CalendarDays },
            { key: 'pointage', label: 'Pointage', icon: Timer },
            { key: 'validation', label: 'Validation', icon: CheckSquare, count: pointagesEnAttente.length, alert: pointagesEnAttente.length > 0 },
            { key: 'conges', label: 'Congés', icon: CalendarOff, count: conges.filter(c => c.status === 'pending').length, alert: conges.filter(c => c.status === 'pending').length > 0 },
            { key: 'chat', label: 'WhatsApp', icon: Phone },
            { key: 'competences', label: 'Compétences', icon: Award },
            { key: 'productivite', label: 'Productivité', icon: BarChart3 },
            { key: 'historique', label: 'Export', icon: FileSpreadsheet }
          ]).map(({ key, label, icon: Icon, count, alert, badge }) => (
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
                  placeholder={isSousTraitants ? "Rechercher un sous-traitant..." : "Rechercher un employé..."}
                  aria-label={isSousTraitants ? "Rechercher un sous-traitant" : "Rechercher un employé"}
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
                {getFilteredEquipe.length} {isSousTraitants ? 'sous-traitant' : 'employé'}{getFilteredEquipe.length > 1 ? 's' : ''}
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
                <p className={`font-medium ${textPrimary}`}>{isSousTraitants ? 'Aucun sous-traitant trouvé' : 'Aucun employé trouvé'}</p>
                <p className={`text-sm ${textMuted} mt-1`}>{isSousTraitants ? 'Ajoutez votre premier sous-traitant' : 'Essayez avec d\'autres criteres'}</p>
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
                          {!isSousTraitants && !chrono.running && (
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

                        {/* Avatar and Name — Click to view profile */}
                        <button className="flex items-center gap-3 mt-6 sm:mt-0 text-left" onClick={() => setSelectedEmployee(e.id)}>
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
                            <h3 className={`font-bold text-lg ${textPrimary}`}>{e.prenom ? `${e.prenom} ${e.nom}` : e.nom}</h3>
                            <p className={`text-sm ${textMuted}`}>{e.role || (isSousTraitants ? 'Sous-traitant' : 'Employé')}</p>
                          </div>
                          <Eye size={14} className={`${textMuted} opacity-0 group-hover:opacity-100 transition-opacity ml-auto`} />
                        </button>
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
                        {isSousTraitants ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                                <p className={`text-xs font-medium ${textMuted} mb-1`}>Tarif</p>
                                <p className="text-xl font-bold text-purple-500">
                                  {modeDiscret ? '**' : e.tarif_type === 'forfait' && e.tarif_forfait ? `${parseFloat(e.tarif_forfait).toLocaleString('fr-FR')}€` : `${e.tauxHoraire || '?'}€/h`}
                                </p>
                              </div>
                              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                                <p className={`text-xs font-medium ${textMuted} mb-1`}>SIRET</p>
                                <p className={`text-sm font-medium ${e.siret ? textPrimary : textMuted}`}>
                                  {e.siret ? (e.siret.length > 10 ? '...' + e.siret.slice(-5) : e.siret) : 'Non renseigné'}
                                </p>
                              </div>
                            </div>
                            {/* Compliance badges */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {e.decennale_expiration ? (
                                new Date(e.decennale_expiration) < new Date()
                                  ? <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Décennale expirée</span>
                                  : new Date(e.decennale_expiration) < new Date(Date.now() + 30 * 24 * 3600 * 1000)
                                    ? <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Décennale expire bientôt</span>
                                    : <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Décennale OK</span>
                              ) : <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Décennale ?</span>}
                              {e.urssaf_date ? (
                                (Date.now() - new Date(e.urssaf_date).getTime()) > 180 * 24 * 3600 * 1000
                                  ? <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">URSSAF &gt;6 mois</span>
                                  : <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">URSSAF OK</span>
                              ) : <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>URSSAF ?</span>}
                            </div>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}

                        {/* Mobile quick pointage: one-tap start on active chantiers */}
                        {!isSousTraitants && chantiers.filter(c => c.statut === 'en_cours').length > 0 && (
                          <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${textMuted}`}>Pointage rapide</p>
                            <div className="flex flex-wrap gap-1.5">
                              {chantiers.filter(c => c.statut === 'en_cours').slice(0, 4).map(ch => {
                                const isRunningHere = chrono.running && chrono.chantierId === ch.id && chrono.employeId === e.id;
                                // Discriminant: if duplicate names, add start date
                                const dupes = chantiers.filter(c2 => c2.statut === 'en_cours' && c2.nom === ch.nom);
                                const label = ch.nom?.length > 40 ? ch.nom.slice(0, 37) + '...' : ch.nom;
                                const discriminant = dupes.length > 1 && ch.date_debut ? ` (${new Date(ch.date_debut + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })})` : '';
                                return (
                                  <button
                                    key={ch.id}
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      if (isRunningHere) {
                                        setPendingStopChrono(true);
                                        setNoteModalOpen(true);
                                      } else {
                                        quickStartTimer(e.id, ch.id);
                                      }
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[44px] max-w-[180px] ${
                                      isRunningHere
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {isRunningHere ? (
                                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                                    ) : (
                                      <Play size={12} fill="currentColor" className="flex-shrink-0" />
                                    )}
                                    <span className="text-left leading-tight line-clamp-2">{label}{discriminant}</span>
                                  </button>
                                );
                              })}
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

                    {/* Smart Clocking - Placeholder */}
                    <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <p className={`text-sm font-medium ${textPrimary}`}>Pointage intelligent</p>
                      <p className={`text-xs ${textMuted} mt-1`}>Sélectionnez un chantier pour pointer</p>
                    </div>

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
                      <h3 className="font-bold">Chronomètre</h3>
                      <p className="text-sm opacity-80">
                        {chrono.running ? (chrono.paused ? 'En pause' : 'En cours...') : 'Prêt à démarrer'}
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
                  <div className="flex flex-col items-center gap-2">
                    {!chrono.employeId && !chrono.running && (
                      <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'} flex items-center gap-1 animate-pulse`}>
                        <AlertCircle size={14} /> Sélectionnez un employé ci-dessus pour démarrer
                      </p>
                    )}
                    <div className="flex gap-3 flex-wrap justify-center">
                    {!chrono.running ? (
                      <motion.button
                        onClick={startChrono}
                        className="px-8 py-4 text-white rounded-2xl text-lg font-semibold flex items-center gap-3 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: chrono.employeId ? couleur : '#94a3b8' }}
                        whileHover={chrono.employeId ? { scale: 1.02 } : {}}
                        whileTap={chrono.employeId ? { scale: 0.98 } : {}}
                        disabled={!chrono.employeId}
                      >
                        <Play size={24} fill="white" />
                        Démarrer
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
                          title={p.manuel ? 'Saisie manuelle' : 'Chronomètre'}
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

            {/* ====== SIGNATURE DIGITALE SECTION ====== */}
            <div className={`${cardBg} rounded-2xl border p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                  <PenTool size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <h3 className={`font-semibold ${textPrimary}`}>Signatures employés</h3>
                  <p className={`text-sm ${textMuted}`}>Validation par signature digitale de la feuille d'heures</p>
                </div>
              </div>

              <div className="space-y-3">
                {equipe.map(emp => {
                  const empWeekPts = weekPointages.filter(p => p.employeId === emp.id);
                  if (empWeekPts.length === 0) return null;
                  const empHours = empWeekPts.reduce((s, p) => s + (p.heures || 0), 0);
                  const sig = getEmployeeWeekSignature(emp.id);
                  const config = getRoleConfig(emp.role);
                  const allApproved = empWeekPts.every(p => p.approuve || p.verrouille);

                  return (
                    <div key={emp.id} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: config.color }}>
                        {emp.prenom?.[0]}{emp.nom?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${textPrimary}`}>{emp.prenom} {emp.nom}</p>
                        <p className={`text-xs ${textMuted}`}>{empWeekPts.length} pointage{empWeekPts.length > 1 ? 's' : ''} — {empHours}h cette semaine</p>
                      </div>
                      {sig ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <img src={sig.data} alt="Signature" className="h-8 w-16 object-contain rounded border" style={{ borderColor: isDark ? '#475569' : '#e2e8f0' }} />
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1"><Check size={12} /> Signé</span>
                        </div>
                      ) : (
                        <motion.button
                          onClick={() => setSignatureModal({ open: true, pointageIds: empWeekPts.map(p => p.id), employeId: emp.id })}
                          className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0"
                          style={{ background: `${couleur}15`, color: couleur }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <PenTool size={14} />
                          Signer
                        </motion.button>
                      )}
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>

            {/* Signature Modal */}
            <AnimatePresence>
              {signatureModal.open && (
                <motion.div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-black/50" onClick={() => { setSignatureModal({ open: false, pointageIds: [], employeId: null }); setSignatureData(null); }} />
                  <motion.div
                    className={`relative w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className={`font-bold text-lg ${textPrimary}`}>Signature employé</h3>
                        <p className={`text-sm ${textMuted}`}>
                          {equipe.find(e => e.id === signatureModal.employeId)?.prenom} {equipe.find(e => e.id === signatureModal.employeId)?.nom} — {signatureModal.pointageIds.length} pointage(s)
                        </p>
                      </div>
                      <button onClick={() => { setSignatureModal({ open: false, pointageIds: [], employeId: null }); setSignatureData(null); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                        <X size={20} className={textMuted} />
                      </button>
                    </div>

                    {/* Recap of pointages */}
                    <div className={`mb-4 p-3 rounded-xl text-sm ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <p className={`font-medium mb-2 ${textPrimary}`}>Récapitulatif :</p>
                      {weekPointages.filter(p => signatureModal.pointageIds.includes(p.id)).map(p => {
                        const ch = chantiers.find(c => c.id === p.chantierId);
                        return (
                          <div key={p.id} className={`flex justify-between py-1 ${textMuted}`}>
                            <span>{new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} — {ch?.nom || '—'}</span>
                            <span className="font-semibold">{p.heures}h</span>
                          </div>
                        );
                      })}
                      <div className={`flex justify-between pt-2 mt-2 border-t font-bold ${isDark ? 'border-slate-600' : 'border-slate-200'} ${textPrimary}`}>
                        <span>Total</span>
                        <span>{weekPointages.filter(p => signatureModal.pointageIds.includes(p.id)).reduce((s, p) => s + (p.heures || 0), 0)}h</span>
                      </div>
                    </div>

                    {/* Canvas */}
                    <div className={`relative rounded-xl border-2 border-dashed mb-4 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-slate-50'}`}>
                      <canvas
                        ref={initSignatureCanvas}
                        width={440}
                        height={160}
                        className="w-full cursor-crosshair rounded-xl touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      {!signatureData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className={`text-sm ${textMuted}`}>Dessiner la signature ici</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={clearSignature}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Undo2 size={16} />
                        Effacer
                      </button>
                      <button
                        onClick={saveSignature}
                        disabled={!signatureData}
                        className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                        style={{ background: couleur }}
                      >
                        <Check size={16} />
                        Valider & Signer
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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
              <div className="flex items-center gap-2 flex-wrap">
                <motion.button
                  onClick={exportCSV}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
                  style={{ background: `${couleur}15`, color: couleur }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={14} />
                  Export heures
                </motion.button>
                <motion.button
                  onClick={() => exportPaieCSV('week')}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-white shadow-sm"
                  style={{ background: couleur }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Euro size={14} />
                  Export paie
                </motion.button>
                <motion.button
                  onClick={() => exportPaieCSV('month')}
                  className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Calendar size={14} />
                  Paie mois
                </motion.button>
              </div>
            </div>

            {/* Summary Statistics Cards */}
            {weekPointages.length > 0 && (() => {
              const approuves = weekPointages.filter(p => p.approuve);
              const enAttente = weekPointages.filter(p => !p.approuve && !p.verrouille);
              const verrouilles = weekPointages.filter(p => p.verrouille);
              const employesConcernes = new Set(weekPointages.map(p => p.employeId)).size;
              const chantiersConcernes = new Set(weekPointages.filter(p => p.chantierId).map(p => p.chantierId)).size;
              const heuresApprouvees = approuves.reduce((s, p) => s + (p.heures || 0), 0);
              const coutEstime = approuves.reduce((s, p) => {
                const emp = equipe.find(e => e.id === p.employeId);
                return s + (p.heures || 0) * (parseFloat(emp?.coutHoraireCharge) || 28);
              }, 0);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className={`text-xs font-medium ${textMuted}`}>Employés</p>
                    <p className="text-xl font-bold" style={{ color: couleur }}>{employesConcernes}</p>
                    <p className={`text-xs ${textMuted}`}>{chantiersConcernes} chantier{chantiersConcernes > 1 ? 's' : ''}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className={`text-xs font-medium ${textMuted}`}>Heures validées</p>
                    <p className="text-xl font-bold text-emerald-500">{heuresApprouvees.toFixed(1)}h</p>
                    <p className={`text-xs ${textMuted}`}>sur {totalWeekHours.toFixed(1)}h total</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className={`text-xs font-medium ${textMuted}`}>Statuts</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-emerald-500">✓ {approuves.length}</span>
                      <span className="text-xs font-medium text-amber-500">⏳ {enAttente.length}</span>
                      <span className="text-xs font-medium text-blue-500">🔒 {verrouilles.length}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className={`text-xs font-medium ${textMuted}`}>Coût estimé</p>
                    <p className="text-xl font-bold" style={{ color: couleur }}>{coutEstime.toFixed(0)}€</p>
                    <p className={`text-xs ${textMuted}`}>charges incluses</p>
                  </div>
                </div>
              );
            })()}

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
                          title={p.manuel ? 'Saisie manuelle' : 'Chronomètre'}
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

      {/* ============ CONGÉS & ABSENCES TAB ============ */}
      <AnimatePresence mode="wait">
        {tab === 'conges' && (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {(() => {
              const filteredConges = congeFilter === 'all' ? conges : conges.filter(c => c.status === congeFilter);
              const pendingCount = conges.filter(c => c.status === 'pending').length;
              const sortedConges = [...filteredConges].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

              // Calendar view: current month days
              const now = new Date();
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              const calDays = [];
              const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // Mon=0
              for (let i = 0; i < firstDayOfWeek; i++) calDays.push(null);
              for (let d = 1; d <= monthEnd.getDate(); d++) calDays.push(new Date(now.getFullYear(), now.getMonth(), d));

              const getDayConges = (date) => {
                if (!date) return [];
                const ds = formatLocalDate(date);
                return conges.filter(c => c.status === 'approved' && ds >= c.dateDebut && ds <= c.dateFin);
              };

              return (
                <>
                  {/* Header */}
                  <div className={`flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingCount > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                        {pendingCount > 0 ? <AlertCircle size={20} className="text-amber-500" /> : <Check size={20} className="text-emerald-500" />}
                      </div>
                      <div>
                        <p className={`font-medium ${textPrimary}`}>{pendingCount > 0 ? `${pendingCount} demande${pendingCount > 1 ? 's' : ''} en attente` : 'Aucune demande en attente'}</p>
                        <p className={`text-sm ${textMuted}`}>{conges.filter(c => c.status === 'approved').length} congé(s) approuvé(s) ce mois</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowCongeForm(true)}
                      className="px-4 py-2.5 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md"
                      style={{ background: couleur }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CalendarPlus size={16} />
                      Nouvelle demande
                    </motion.button>
                  </div>

                  {/* Balance Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {equipe.slice(0, 4).map(emp => {
                      const bal = getCongeBalance(emp.id);
                      const config = getRoleConfig(emp.role);
                      return (
                        <div key={emp.id} className={`${cardBg} rounded-xl border p-3`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: config.color }}>
                              {emp.prenom?.[0]}{emp.nom?.[0]}
                            </div>
                            <p className={`text-xs font-medium truncate ${textPrimary}`}>{emp.prenom}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>CP</span>
                              <span className={`font-semibold ${bal.cpUsed >= bal.cpTotal ? 'text-red-500' : textPrimary}`}>{bal.cpTotal - bal.cpUsed}j restants</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((bal.cpUsed / bal.cpTotal) * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>RTT</span>
                              <span className={`font-semibold ${bal.rttUsed >= bal.rttTotal ? 'text-red-500' : textPrimary}`}>{bal.rttTotal - bal.rttUsed}j restants</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min((bal.rttUsed / bal.rttTotal) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar View */}
                  <div className={`${cardBg} rounded-2xl border p-4`}>
                    <h4 className={`font-semibold mb-3 ${textPrimary}`}>
                      {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h4>
                    <div className="grid grid-cols-7 gap-1">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                        <div key={i} className={`text-center text-xs font-semibold py-1 ${textMuted}`}>{d}</div>
                      ))}
                      {calDays.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} />;
                        const dayConges = getDayConges(day);
                        const isToday = formatLocalDate(day) === formatLocalDate(new Date());
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={i}
                            className={`relative text-center py-1.5 rounded-lg text-xs ${
                              isToday ? 'ring-2 font-bold' : ''
                            } ${isWeekend ? (isDark ? 'bg-slate-700/30 text-slate-500' : 'bg-slate-50 text-slate-400') : textPrimary}`}
                            style={isToday ? { ringColor: couleur } : {}}
                          >
                            {day.getDate()}
                            {dayConges.length > 0 && (
                              <div className="flex justify-center gap-0.5 mt-0.5">
                                {dayConges.slice(0, 3).map((c, ci) => (
                                  <span key={ci} className="w-1.5 h-1.5 rounded-full" style={{ background: CONGE_TYPES[c.type]?.color || '#64748b' }} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                      {Object.entries(CONGE_TYPES).map(([key, { label, color }]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                          <span className={`text-xs ${textMuted}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-2 overflow-x-auto">
                    {[
                      { key: 'all', label: 'Tous', count: conges.length },
                      { key: 'pending', label: 'En attente', count: conges.filter(c => c.status === 'pending').length },
                      { key: 'approved', label: 'Approuvés', count: conges.filter(c => c.status === 'approved').length },
                      { key: 'rejected', label: 'Refusés', count: conges.filter(c => c.status === 'rejected').length }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setCongeFilter(f.key)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          congeFilter === f.key
                            ? 'text-white shadow-md'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                        }`}
                        style={congeFilter === f.key ? { background: couleur } : {}}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>

                  {/* Congé List */}
                  {sortedConges.length === 0 ? (
                    <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                        <CalendarOff size={32} className="text-blue-500" />
                      </div>
                      <p className={`font-medium ${textPrimary}`}>Aucune demande de congé</p>
                      <p className={`text-sm ${textMuted} mt-1`}>Créez une nouvelle demande avec le bouton ci-dessus</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedConges.map((c, index) => {
                        const emp = equipe.find(e => e.id === c.employeId);
                        const config = getRoleConfig(emp?.role);
                        const typeInfo = CONGE_TYPES[c.type] || CONGE_TYPES.autre;
                        const TypeIcon = typeInfo.icon;
                        const days = getWorkingDays(c.dateDebut, c.dateFin);

                        return (
                          <motion.div
                            key={c.id}
                            className={`${cardBg} rounded-xl border p-4`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: config.color }}>
                                {emp?.prenom?.[0]}{emp?.nom?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`font-semibold ${textPrimary}`}>{emp?.prenom} {emp?.nom}</p>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: typeInfo.color }}>
                                    {typeInfo.label}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                    c.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {c.status === 'approved' ? '✓ Approuvé' : c.status === 'rejected' ? '✗ Refusé' : '⏳ En attente'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className={`text-sm ${textMuted}`}>
                                    {new Date(c.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    {' → '}
                                    {new Date(c.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span className={`text-sm font-semibold ${textPrimary}`}>{days} jour{days > 1 ? 's' : ''}</span>
                                </div>
                                {c.motif && <p className={`text-sm mt-1 ${textMuted}`}>"{c.motif}"</p>}
                              </div>
                              {c.status === 'pending' && (
                                <div className="flex gap-2 flex-shrink-0">
                                  <motion.button onClick={() => approveConge(c.id)} className="p-2.5 bg-emerald-500 text-white rounded-xl" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <ThumbsUp size={16} />
                                  </motion.button>
                                  <motion.button onClick={() => rejectConge(c.id)} className={`p-2.5 rounded-xl ${isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <ThumbsDown size={16} />
                                  </motion.button>
                                  <motion.button onClick={() => cancelConge(c.id)} className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Trash2 size={16} />
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* New Congé Form Modal */}
                  <AnimatePresence>
                    {showCongeForm && (
                      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="absolute inset-0 bg-black/50" onClick={() => setShowCongeForm(false)} />
                        <motion.div
                          className={`relative w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 20 }}
                        >
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                                <CalendarPlus size={20} style={{ color: couleur }} />
                              </div>
                              <h3 className={`font-bold text-lg ${textPrimary}`}>Nouvelle demande</h3>
                            </div>
                            <button onClick={() => setShowCongeForm(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                              <X size={20} className={textMuted} />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className={`text-sm font-medium ${textPrimary} mb-1 block`}>Employé *</label>
                              <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={congeForm.employeId} onChange={e => setCongeForm(p => ({ ...p, employeId: e.target.value }))}>
                                <option value="">Sélectionner...</option>
                                {equipe.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={`text-sm font-medium ${textPrimary} mb-1 block`}>Type</label>
                              <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={congeForm.type} onChange={e => setCongeForm(p => ({ ...p, type: e.target.value }))}>
                                {Object.entries(CONGE_TYPES).map(([key, { label }]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={`text-sm font-medium ${textPrimary} mb-1 block`}>Du *</label>
                                <input type="date" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={congeForm.dateDebut} onChange={e => setCongeForm(p => ({ ...p, dateDebut: e.target.value }))} />
                              </div>
                              <div>
                                <label className={`text-sm font-medium ${textPrimary} mb-1 block`}>Au *</label>
                                <input type="date" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={congeForm.dateFin} onChange={e => setCongeForm(p => ({ ...p, dateFin: e.target.value }))} />
                              </div>
                            </div>
                            {congeForm.dateDebut && congeForm.dateFin && new Date(congeForm.dateFin) >= new Date(congeForm.dateDebut) && (
                              <div className={`p-3 rounded-xl text-sm ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                                <strong>{getWorkingDays(congeForm.dateDebut, congeForm.dateFin)}</strong> jour(s) ouvré(s)
                                {congeForm.employeId && (() => {
                                  const bal = getCongeBalance(congeForm.employeId);
                                  const remaining = congeForm.type === 'conge_paye' ? bal.cpTotal - bal.cpUsed : congeForm.type === 'rtt' ? bal.rttTotal - bal.rttUsed : null;
                                  if (remaining !== null) return <span> — Solde restant: <strong>{remaining}j</strong></span>;
                                  return null;
                                })()}
                              </div>
                            )}
                            <div>
                              <label className={`text-sm font-medium ${textPrimary} mb-1 block`}>Motif</label>
                              <input type="text" placeholder="Optionnel..." className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={congeForm.motif} onChange={e => setCongeForm(p => ({ ...p, motif: e.target.value }))} />
                            </div>
                            <button
                              onClick={addConge}
                              disabled={!congeForm.employeId || !congeForm.dateDebut || !congeForm.dateFin}
                              className="w-full px-4 py-3 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                              style={{ background: couleur }}
                            >
                              <CalendarPlus size={18} />
                              Créer la demande
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ WHATSAPP ÉQUIPE TAB ============ */}
      <AnimatePresence mode="wait">
        {tab === 'chat' && (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
              {/* Header */}
              <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">💬</div>
                  <div>
                    <h3 className="text-lg font-bold">Communication Équipe</h3>
                    <p className="text-sm text-white/70">Contactez votre équipe via WhatsApp</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Group WhatsApp button */}
                <button
                  onClick={() => {
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) {
                      window.open('whatsapp://send?text=', '_blank');
                    } else {
                      window.open('https://web.whatsapp.com', '_blank');
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#25D366] text-white hover:bg-[#20BD5C] transition-colors min-h-[56px]"
                >
                  <MessageSquare size={20} />
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm">Ouvrir WhatsApp</p>
                    <p className="text-xs text-white/70">Envoyer un message à l'équipe</p>
                  </div>
                  <ChevronRight size={18} />
                </button>

                {/* Individual contacts */}
                <p className={`text-xs font-semibold uppercase tracking-wide mt-4 ${textMuted}`}>Contacter un membre</p>
                <div className="space-y-2">
                  {equipe.filter(e => e.actif !== false && e.telephone).map(emp => {
                    const config = getRoleConfig(emp.role);
                    const phone = emp.telephone?.replace(/[\s.-]/g, '').replace(/^0/, '+33');
                    return (
                      <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: config.color }}>
                          {emp.prenom?.[0]}{emp.nom?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${textPrimary}`}>{emp.prenom} {emp.nom}</p>
                          <p className={`text-xs ${textMuted}`}>{emp.role || 'Employé'}</p>
                        </div>
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-11 h-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center hover:bg-[#20BD5C]"
                          title={`WhatsApp ${emp.prenom}`}
                        >
                          <MessageSquare size={16} />
                        </a>
                        <a
                          href={`tel:${emp.telephone}`}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                          title={`Appeler ${emp.prenom}`}
                        >
                          <Phone size={16} />
                        </a>
                      </div>
                    );
                  })}
                  {equipe.filter(e => e.actif !== false && e.telephone).length === 0 && (
                    <div className={`text-center py-8 ${textMuted}`}>
                      <Phone size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun membre avec numéro de téléphone</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ VUE TERRAIN MODAL ============ */}
      <AnimatePresence>
        {showTerrainView && (
          <motion.div className="fixed inset-0 z-50 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowTerrainView(false)} />
            <motion.div
              className={`relative flex-1 flex flex-col w-full max-w-lg mx-auto ${isDark ? 'bg-slate-900' : 'bg-white'} overflow-hidden`}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ maxHeight: '100vh' }}
            >
              {/* Terrain Header */}
              <div className="p-4 text-white flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><HardHat size={24} /></div>
                  <div>
                    <h2 className="text-lg font-bold">Vue Terrain</h2>
                    <p className="text-sm text-white/70">{isOnline ? '🟢 En ligne' : '🔴 Hors ligne — sync différée'}</p>
                  </div>
                </div>
                <button onClick={() => setShowTerrainView(false)} className="w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              {/* Active timer banner */}
              {chrono.running && (() => {
                const emp = equipe.find(e => e.id === chrono.employeId);
                const ch = chantiers.find(c => c.id === chrono.chantierId);
                const secs = Math.max(0, elapsed);
                const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); const s = secs % 60;
                return (
                  <div className="px-4 py-3 bg-emerald-600 text-white flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{emp ? `${emp.prenom} ${emp.nom}` : 'Employé'} — {ch?.nom || 'Chantier'}</p>
                      <p className="text-2xl font-mono font-bold">{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</p>
                    </div>
                    <button
                      onClick={() => { setPendingStopChrono(true); setNoteModalOpen(true); }}
                      className="w-14 h-14 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
                    >
                      <Square size={24} fill="white" className="text-white" />
                    </button>
                  </div>
                );
              })()}

              {/* Chantier list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${textMuted}`}>
                  Chantiers actifs ({chantiers.filter(c => c.statut === 'en_cours').length})
                </p>
                {chantiers.filter(c => c.statut === 'en_cours').length === 0 ? (
                  <div className={`text-center py-12 ${textMuted}`}>
                    <MapPin size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucun chantier actif</p>
                  </div>
                ) : (
                  chantiers.filter(c => c.statut === 'en_cours').map(ch => {
                    const isThisRunning = chrono.running && chrono.chantierId === ch.id;
                    return (
                      <div key={ch.id} className={`rounded-2xl border p-4 ${isThisRunning ? (isDark ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300') : cardBg}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isThisRunning ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            <Building2 size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm leading-tight ${textPrimary}`}>{ch.nom}</p>
                            {ch.adresse && <p className={`text-xs mt-0.5 ${textMuted}`}><MapPin size={10} className="inline mr-1" />{ch.adresse}</p>}
                            {ch.client_id && (() => {
                              // Try to find client name if available
                              return null; // Client display handled by name below
                            })()}
                            {isThisRunning && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-500">En cours</span>
                              </div>
                            )}
                          </div>
                          {/* Start/Stop button — large 56px touch target */}
                          {isThisRunning ? (
                            <button
                              onClick={() => { setPendingStopChrono(true); setNoteModalOpen(true); }}
                              className="w-14 h-14 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg flex-shrink-0"
                              aria-label="Arrêter le pointage"
                            >
                              <Square size={22} fill="white" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (chrono.running) {
                                  showToast('Arrêtez le pointage en cours d\'abord', 'error');
                                  return;
                                }
                                // Start for first available employee or show employee selector
                                const activeEmps = equipe.filter(e => e.actif !== false && e.contrat !== 'sous_traitant');
                                if (activeEmps.length === 1) {
                                  quickStartTimer(activeEmps[0].id, ch.id);
                                } else if (activeEmps.length > 0) {
                                  quickStartTimer(activeEmps[0].id, ch.id);
                                }
                                setShowTerrainView(false);
                              }}
                              className="w-14 h-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg flex-shrink-0"
                              aria-label="Démarrer le pointage"
                            >
                              <Play size={22} fill="white" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Offline indicator footer */}
              {!isOnline && (
                <div className="px-4 py-3 bg-amber-500/20 border-t border-amber-500/30 flex items-center gap-2">
                  <WifiOff size={16} className="text-amber-500" />
                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Mode hors ligne — les pointages seront synchronisés à la reconnexion
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ EMPLOYEE DETAIL MODAL ============ */}
      <AnimatePresence>
        {selectedEmployee && (() => {
          const emp = equipe.find(e => e.id === selectedEmployee);
          if (!emp) return null;
          const config = getRoleConfig(emp.role);
          const stats = getEmployeeStats(emp.id);
          const bal = getCongeBalance(emp.id);
          const sig = getEmployeeWeekSignature(emp.id);
          const recentPointages = pointages.filter(p => p.employeId === emp.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

          return (
            <motion.div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedEmployee(null)} />
              <motion.div
                className={`relative w-full max-w-lg rounded-2xl my-8 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
                initial={{ scale: 0.9, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 40 }}
              >
                {/* Header with gradient */}
                <div className="relative p-6 text-white" style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}>
                  <button onClick={() => setSelectedEmployee(null)} className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30">
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                      {emp.prenom?.[0]}{emp.nom?.[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{emp.prenom} {emp.nom}</h2>
                      <p className="text-white/80">{emp.role || 'Employé'}</p>
                      {emp.dateEmbauche && (
                        <p className="text-white/60 text-sm flex items-center gap-1 mt-0.5">
                          <Cake size={12} />
                          Embauché le {new Date(emp.dateEmbauche).toLocaleDateString('fr-FR')}
                          {stats.daysSinceHire !== null && <span> ({stats.daysSinceHire}j)</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Contact */}
                  <div className="flex gap-3">
                    {emp.telephone && (
                      <a href={`tel:${emp.telephone}`} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                        <Phone size={14} style={{ color: couleur }} />
                        {emp.telephone}
                      </a>
                    )}
                    {emp.email && (
                      <a href={`mailto:${emp.email}`} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm truncate ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                        <Mail size={14} style={{ color: couleur }} />
                        <span className="truncate">{emp.email}</span>
                      </a>
                    )}
                  </div>

                  {/* POINTAGE RAPIDE — Mobile-first, visible sans scroll */}
                  {chantiers.filter(c => c.statut === 'en_cours').length > 0 && (
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>⚡ Pointage rapide</p>
                      <div className="flex flex-wrap gap-2">
                        {chantiers.filter(c => c.statut === 'en_cours').slice(0, 4).map(ch => {
                          const isRunning = chrono.running && chrono.chantierId === ch.id && chrono.employeId === emp.id;
                          return (
                            <button
                              key={ch.id}
                              onClick={() => {
                                if (isRunning) { setPendingStopChrono(true); setNoteModalOpen(true); }
                                else { quickStartTimer(emp.id, ch.id); setSelectedEmployee(null); }
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium min-h-[44px] transition-all ${
                                isRunning
                                  ? 'bg-emerald-500 text-white shadow-md'
                                  : isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                              }`}
                            >
                              {isRunning ? <Square size={14} fill="white" /> : <Play size={14} fill="currentColor" />}
                              <span className="leading-tight text-left line-clamp-2 max-w-[120px]">{ch.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Heures/mois', value: `${Math.round(stats.monthHours)}h`, color: couleur },
                      { label: 'Moy./jour', value: `${stats.avgDaily}h`, color: '#22c55e' },
                      { label: 'Chantiers', value: stats.chantiersWorked, color: '#8b5cf6' },
                      { label: 'Pointages', value: stats.totalPointages, color: '#f59e0b' }
                    ].map((s, i) => (
                      <div key={i} className={`text-center p-2.5 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className={`text-[10px] ${textMuted}`}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contract info */}
                  <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div>
                      <p className={`text-xs ${textMuted}`}>Contrat</p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{emp.contrat || '—'}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textMuted}`}>Taux horaire</p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{modeDiscret ? '***' : `${emp.tauxHoraire || '—'} €/h`}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textMuted}`}>Coût chargé</p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{modeDiscret ? '***' : `${emp.coutHoraireCharge || '—'} €/h`}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textMuted}`}>Congés</p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{bal.cpTotal - bal.cpUsed}j CP + {bal.rttTotal - bal.rttUsed}j RTT</p>
                    </div>
                  </div>

                  {/* Compétences */}
                  {emp.competences && (
                    <div>
                      <p className={`text-xs font-semibold uppercase mb-2 ${textMuted}`}>Compétences</p>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.competences.split(',').map(s => s.trim()).filter(Boolean).map((skill, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {emp.certifications && (
                    <div>
                      <p className={`text-xs font-semibold uppercase mb-2 ${textMuted}`}>Certifications</p>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.certifications.split(',').map(s => s.trim()).filter(Boolean).map((cert, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                            <Shield size={10} className="inline mr-1" />{cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Signature status */}
                  {sig && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                      <img src={sig.data} alt="Signature" className="h-8 w-20 object-contain rounded" />
                      <div>
                        <p className={`text-xs font-semibold text-emerald-600`}>Feuille de la semaine signée</p>
                        <p className={`text-[10px] ${textMuted}`}>{new Date(sig.date).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  )}

                  {/* Recent pointages */}
                  <div>
                    <p className={`text-xs font-semibold uppercase mb-2 ${textMuted}`}>Derniers pointages</p>
                    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      {recentPointages.length === 0 ? (
                        <p className={`p-4 text-center text-sm ${textMuted}`}>Aucun pointage</p>
                      ) : (
                        recentPointages.map((p, i) => {
                          const ch = chantiers.find(c => c.id === p.chantierId);
                          return (
                            <div key={p.id} className={`flex items-center justify-between px-3 py-2 text-xs ${i > 0 ? (isDark ? 'border-t border-slate-700' : 'border-t border-slate-100') : ''}`}>
                              <span className={textMuted}>{new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                              <span className={`truncate mx-2 ${textPrimary}`}>{ch?.nom || '—'}</span>
                              <span className="font-bold" style={{ color: couleur }}>{p.heures}h</span>
                              <span className={`ml-2 w-2 h-2 rounded-full ${p.verrouille ? 'bg-blue-500' : p.approuve ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedEmployee(null); startEdit(emp); }}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                    >
                      <Edit3 size={16} />
                      Modifier
                    </button>
                    <button
                      onClick={() => callPhone(emp.telephone)}
                      disabled={!emp.telephone}
                      className="flex-1 py-3 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: couleur }}
                    >
                      <PhoneCall size={16} />
                      Appeler
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ============ COÛTS SOUS-TRAITANTS TAB ============ */}
      <AnimatePresence mode="wait">
        {tab === 'couts' && isSousTraitants && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`${cardBg} rounded-2xl border p-4`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Sous-traitants</p>
                <p className="text-2xl font-bold" style={{ color: '#7c3aed' }}>{sousTraitantsList.length}</p>
                <p className={`text-xs ${textMuted} mt-1`}>actifs</p>
              </div>
              <div className={`${cardBg} rounded-2xl border p-4`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Coût moyen/h</p>
                <p className="text-2xl font-bold text-amber-500">
                  {sousTraitantsList.length > 0
                    ? (sousTraitantsList.reduce((s, st) => s + (parseFloat(st.tauxHoraire) || 0), 0) / sousTraitantsList.length).toFixed(0)
                    : '0'
                  } €
                </p>
                <p className={`text-xs ${textMuted} mt-1`}>taux horaire</p>
              </div>
              <div className={`${cardBg} rounded-2xl border p-4`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Décennales</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {sousTraitantsList.filter(st => st.decennale_expiration && new Date(st.decennale_expiration) > new Date()).length}
                  <span className={`text-sm font-normal ${textMuted}`}> / {sousTraitantsList.length}</span>
                </p>
                <p className={`text-xs ${textMuted} mt-1`}>à jour</p>
              </div>
              <div className={`${cardBg} rounded-2xl border p-4`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-1`}>Vigilance URSSAF</p>
                <p className="text-2xl font-bold text-blue-500">
                  {sousTraitantsList.filter(st => {
                    if (!st.urssaf_date) return false;
                    const sixMonths = 180 * 24 * 3600 * 1000;
                    return (Date.now() - new Date(st.urssaf_date).getTime()) < sixMonths;
                  }).length}
                  <span className={`text-sm font-normal ${textMuted}`}> / {sousTraitantsList.length}</span>
                </p>
                <p className={`text-xs ${textMuted} mt-1`}>vérifiés &lt;6 mois</p>
              </div>
            </div>

            {/* Detailed table */}
            <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
              <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <h3 className={`font-semibold ${textPrimary}`}>Détail des coûts par sous-traitant</h3>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {sousTraitantsList.length === 0 ? (
                  <div className="p-8 text-center">
                    <UserCheck size={40} className={`mx-auto mb-3 ${textMuted} opacity-40`} />
                    <p className={`font-medium ${textPrimary}`}>Aucun sous-traitant</p>
                    <p className={`text-sm ${textMuted} mt-1`}>Ajoutez votre premier sous-traitant pour suivre les coûts</p>
                  </div>
                ) : sousTraitantsList.map(st => {
                  const expiring = st.decennale_expiration && new Date(st.decennale_expiration) < new Date(Date.now() + 30 * 24 * 3600 * 1000);
                  const expired = st.decennale_expiration && new Date(st.decennale_expiration) < new Date();
                  const urssafOld = st.urssaf_date && (Date.now() - new Date(st.urssaf_date).getTime()) > 180 * 24 * 3600 * 1000;
                  return (
                    <div key={st.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm">
                          {st.nom?.[0]}{st.prenom?.[0] || ''}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${textPrimary}`}>{st.prenom ? `${st.prenom} ${st.nom}` : st.nom}</p>
                          <p className={`text-xs ${textMuted} truncate`}>{st.role || 'Sous-traitant'} {st.siret ? `• SIRET: ${st.siret}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          {st.tarif_type === 'forfait' && st.tarif_forfait ? `${parseFloat(st.tarif_forfait).toLocaleString('fr-FR')} € forfait` : `${st.tauxHoraire || '?'} €/h`}
                        </span>
                        {expired ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Décennale expirée</span>
                        ) : expiring ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Décennale expire bientôt</span>
                        ) : st.decennale_expiration ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Décennale OK</span>
                        ) : null}
                        {urssafOld ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">URSSAF &gt;6 mois</span>
                        ) : st.urssaf_date ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">URSSAF OK</span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => startEdit(st)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ============ PLANNING TAB ============ */}
        {tab === 'planning' && (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {(() => {
              const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
              const weekDays = [];
              for (let i = 0; i < 6; i++) {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                weekDays.push(d);
              }
              const activeChantiers = chantiers.filter(c => c.statut === 'en_cours');
              const chantierColors = {};
              const palette = ['#f97316','#3b82f6','#22c55e','#8b5cf6','#ec4899','#eab308','#14b8a6','#ef4444'];
              activeChantiers.forEach((c, i) => { chantierColors[c.id] = palette[i % palette.length]; });

              // Get pointages for each employee/day
              const getCellPointage = (empId, day) => {
                const dayStr = formatLocalDate(day);
                return weekPointages.filter(p => p.employeId === empId && p.date === dayStr);
              };

              // Quick assign function
              const quickAssign = (empId, day, chantierId) => {
                const dayStr = formatLocalDate(day);
                // Check if already assigned
                const existing = pointages.find(p => p.employeId === empId && p.date === dayStr && p.chantierId === chantierId);
                if (existing) {
                  showToast('Déjà affecté à ce chantier ce jour', 'error');
                  return;
                }
                setPointages([...pointages, {
                  id: generateId(),
                  employeId: empId,
                  chantierId: chantierId,
                  date: dayStr,
                  heures: 8,
                  approuve: false,
                  manuel: true,
                  verrouille: false,
                  note: 'Affectation planning'
                }]);
                showToast('Affectation ajoutée (8h)', 'success');
              };

              const removeAssignment = (pointageId) => {
                setPointages(pointages.filter(p => p.id !== pointageId));
                showToast('Affectation retirée', 'success');
              };

              return (
                <>
                  {/* Week navigation */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setWeekOffset(o => o - 1)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                      <ChevronLeft size={20} />
                    </button>
                    <div className="text-center">
                      <h3 className={`text-lg font-bold ${textPrimary}`}>
                        Semaine du {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </h3>
                      <p className={`text-sm ${textMuted}`}>{equipe.length} employés · {activeChantiers.length} chantiers actifs</p>
                    </div>
                    <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} ${weekOffset >= 0 ? 'opacity-30' : ''}`}>
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* Chantier legend */}
                  <div className="flex flex-wrap gap-2">
                    {activeChantiers.map(c => (
                      <span key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: chantierColors[c.id] }}>
                        <Building2 size={12} /> {c.nom?.length > 20 ? c.nom.substring(0, 20) + '...' : c.nom}
                      </span>
                    ))}
                    {activeChantiers.length === 0 && <p className={`text-sm ${textMuted}`}>Aucun chantier en cours</p>}
                  </div>

                  {/* Planning grid */}
                  <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                            <th className={`text-left px-4 py-3 text-sm font-semibold ${textPrimary} w-48 sticky left-0 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} z-10`}>Employé</th>
                            {weekDays.map((day, i) => {
                              const isToday = formatLocalDate(day) === today;
                              return (
                                <th key={i} className={`text-center px-2 py-3 text-sm ${isToday ? 'font-bold' : 'font-medium'} ${isToday ? (isDark ? 'text-orange-400' : 'text-orange-600') : textMuted}`}>
                                  <div>{daysOfWeek[i]}</div>
                                  <div className={`text-lg ${isToday ? '' : ''}`}>{day.getDate()}</div>
                                </th>
                              );
                            })}
                            <th className={`text-center px-3 py-3 text-sm font-semibold ${textPrimary}`}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredEquipe.map(emp => {
                            const empWeekHours = weekPointages.filter(p => p.employeId === emp.id).reduce((s, p) => s + (p.heures || 0), 0);
                            const RoleIcon = getRoleIcon(emp.role);
                            return (
                              <tr key={emp.id} className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                                <td className={`px-4 py-3 sticky left-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: getRoleConfig(emp.role).color }}>
                                      {emp.prenom?.[0]}{emp.nom?.[0]}
                                    </div>
                                    <div>
                                      <p className={`text-sm font-medium ${textPrimary}`}>{emp.prenom} {emp.nom}</p>
                                      <p className={`text-xs ${textMuted}`}>{emp.role || 'Non défini'}</p>
                                    </div>
                                  </div>
                                </td>
                                {weekDays.map((day, di) => {
                                  const cellPointages = getCellPointage(emp.id, day);
                                  const cellHours = cellPointages.reduce((s, p) => s + (p.heures || 0), 0);
                                  const isToday = formatLocalDate(day) === today;
                                  return (
                                    <td key={di} className={`px-1 py-2 text-center align-top ${isToday ? (isDark ? 'bg-orange-900/10' : 'bg-orange-50/50') : ''}`}>
                                      {cellPointages.length > 0 ? (
                                        <div className="space-y-1">
                                          {cellPointages.map(p => {
                                            const ch = chantiers.find(c => c.id === p.chantierId);
                                            return (
                                              <div key={p.id} className="group relative">
                                                <div
                                                  className="px-2 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                                                  style={{ background: chantierColors[p.chantierId] || '#64748b' }}
                                                  title={`${ch?.nom || 'Sans chantier'} - ${p.heures}h${p.verrouille ? ' (verrouillé)' : ''}`}
                                                >
                                                  <div className="truncate max-w-[80px]">{ch?.nom?.split(' ')[0] || '—'}</div>
                                                  <div className="font-bold">{p.heures}h</div>
                                                </div>
                                                {!p.verrouille && (
                                                  <button
                                                    onClick={() => removeAssignment(p.id)}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >×</button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="relative group">
                                          <div className={`px-2 py-4 rounded-lg border-2 border-dashed ${isDark ? 'border-slate-700' : 'border-slate-200'} text-xs ${textMuted} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                            {activeChantiers.length > 0 && (
                                              <select
                                                className={`w-full bg-transparent text-xs text-center cursor-pointer ${textMuted}`}
                                                defaultValue=""
                                                onChange={(e) => { if (e.target.value) { quickAssign(emp.id, day, e.target.value); e.target.value = ''; } }}
                                              >
                                                <option value="">+ Affecter</option>
                                                {activeChantiers.map(c => (
                                                  <option key={c.id} value={c.id}>{c.nom}</option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className={`px-3 py-3 text-center`}>
                                  <span className={`text-sm font-bold ${empWeekHours > 35 ? 'text-red-500' : empWeekHours > 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : textMuted}`}>
                                    {empWeekHours > 0 ? `${empWeekHours}h` : '—'}
                                  </span>
                                  {empWeekHours > 35 && <div className="text-[10px] text-red-500 font-medium">+{Math.round((empWeekHours - 35) * 10) / 10}h sup</div>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Weekly totals row */}
                    <div className={`px-4 py-3 border-t flex items-center justify-between ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className={`text-sm font-semibold ${textPrimary}`}>Total semaine</span>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-bold ${textPrimary}`}>{totalWeekHours}h</span>
                        <span className={`text-sm ${textMuted}`}>Coût: {modeDiscret ? '***' : `${Math.round(weekCost).toLocaleString('fr-FR')} €`}</span>
                        {totalWeekHours > 35 * equipe.length && (
                          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                            <AlertCircle size={12} /> Heures sup détectées
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ============ COMPETENCES & CERTIFICATIONS TAB ============ */}
        {tab === 'competences' && (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {equipe.length === 0 ? (
              <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${couleur}15` }}>
                  <Users size={40} style={{ color: couleur }} />
                </div>
                <p className={`font-semibold text-lg ${textPrimary} mb-2`}>Ajoutez votre équipe d'abord</p>
                <p className={`text-sm ${textMuted} mb-4 max-w-sm mx-auto`}>
                  Pour gérer les compétences et certifications, commencez par ajouter des employés dans l'onglet Équipe.
                </p>
                <motion.button
                  onClick={() => { setTab('overview'); setShowAdd(true); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg"
                  style={{ background: couleur }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <UserPlus size={16} className="inline mr-2" />
                  Ajouter un employé
                </motion.button>
              </div>
            ) : (() => {
              // Parse all competences and certifications
              const allSkills = {};
              const certAlerts = [];
              equipe.forEach(emp => {
                (emp.competences || '').split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
                  if (!allSkills[skill]) allSkills[skill] = [];
                  allSkills[skill].push(emp);
                });
                // Parse certifications for expiry alerts
                (emp.certifications || '').split(',').map(s => s.trim()).filter(Boolean).forEach(cert => {
                  // Check if cert has a date pattern like "CACES (exp: 2026-06)"
                  const dateMatch = cert.match(/(?:exp|expire|fin|valide)[:\s]*(\d{4}[-/]\d{2}(?:[-/]\d{2})?)/i);
                  if (dateMatch) {
                    const expiryDate = new Date(dateMatch[1] + (dateMatch[1].length === 7 ? '-01' : ''));
                    const now = new Date();
                    const daysUntil = Math.floor((expiryDate - now) / 86400000);
                    certAlerts.push({
                      employee: emp,
                      certName: cert.replace(/\(.*\)/, '').trim(),
                      fullCert: cert,
                      expiryDate,
                      daysUntil,
                      status: daysUntil < 0 ? 'expired' : daysUntil < 30 ? 'expiring_soon' : daysUntil < 90 ? 'warning' : 'valid'
                    });
                  } else {
                    certAlerts.push({ employee: emp, certName: cert, fullCert: cert, expiryDate: null, daysUntil: null, status: 'unknown' });
                  }
                });
              });
              const sortedSkills = Object.entries(allSkills).sort((a, b) => b[1].length - a[1].length);
              const expired = certAlerts.filter(c => c.status === 'expired');
              const expiringSoon = certAlerts.filter(c => c.status === 'expiring_soon');
              const warning = certAlerts.filter(c => c.status === 'warning');
              const valid = certAlerts.filter(c => c.status === 'valid');
              const unknown = certAlerts.filter(c => c.status === 'unknown');

              // Skill matching for active chantiers
              const activeChantiers = chantiers.filter(c => c.statut === 'en_cours');
              const getMatchScore = (emp, chantier) => {
                const empSkills = (emp.competences || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
                const chantierWords = (chantier.nom + ' ' + (chantier.notes || '')).toLowerCase().split(/[\s,;]+/);
                const skillWords = ['électri', 'plomb', 'carrel', 'peintr', 'maçon', 'menuise', 'plaqu', 'isol', 'charpent', 'couver', 'cuisin', 'salle de bain'];
                const chantierSkills = skillWords.filter(sw => chantierWords.some(cw => cw.includes(sw)));
                if (chantierSkills.length === 0) return { score: 50, matching: [], missing: [] };
                const matching = chantierSkills.filter(cs => empSkills.some(es => es.includes(cs)));
                return {
                  score: Math.round((matching.length / chantierSkills.length) * 100),
                  matching,
                  missing: chantierSkills.filter(cs => !matching.includes(cs))
                };
              };

              return (
                <>
                  {/* Certification Alerts */}
                  {(expired.length > 0 || expiringSoon.length > 0) && (
                    <div className="space-y-2">
                      <h3 className={`text-sm font-semibold uppercase tracking-wide ${textMuted}`}>Alertes certifications</h3>
                      {expired.map((c, i) => (
                        <div key={`exp-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"><Shield size={16} className="text-white" /></div>
                          <div className="flex-1">
                            <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>{c.certName} — {c.employee.prenom} {c.employee.nom}</p>
                            <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>Expirée depuis {Math.abs(c.daysUntil)} jours</p>
                          </div>
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">EXPIRÉE</span>
                        </div>
                      ))}
                      {expiringSoon.map((c, i) => (
                        <div key={`soon-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center"><Clock size={16} className="text-white" /></div>
                          <div className="flex-1">
                            <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{c.certName} — {c.employee.prenom} {c.employee.nom}</p>
                            <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Expire dans {c.daysUntil} jours</p>
                          </div>
                          <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg">URGENT</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills Matrix */}
                  <div className={`rounded-2xl border ${cardBg} p-4`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-3 flex items-center gap-2`}><Award size={20} style={{color: couleur}} /> Matrice des compétences</h3>
                    {sortedSkills.length > 0 ? (
                      <div className="space-y-2">
                        {sortedSkills.map(([skill, emps]) => (
                          <div key={skill} className={`flex items-center gap-3 p-2 rounded-xl ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                            <span className={`text-sm font-medium w-36 truncate ${textPrimary}`}>{skill}</span>
                            <div className="flex-1 flex flex-wrap gap-1">
                              {emps.map(emp => (
                                <span key={emp.id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ background: getRoleConfig(emp.role).color }}>
                                  {emp.prenom} {emp.nom?.[0]}.
                                </span>
                              ))}
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {emps.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${couleur}15` }}>
                          <Award size={32} style={{ color: couleur }} />
                        </div>
                        <p className={`font-semibold ${textPrimary} mb-2`}>Aucune compétence renseignée</p>
                        <p className={`text-sm ${textMuted} mb-4 max-w-md mx-auto`}>
                          Ajoutez des compétences à vos employés pour visualiser la matrice des compétences et obtenir des suggestions d'affectation intelligentes.
                        </p>
                        <div className={`inline-flex flex-col gap-2 text-left text-sm ${textMuted} p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white border border-slate-200'}`}>
                          <p className="font-medium" style={{ color: couleur }}>💡 Comment faire :</p>
                          <p>1. Allez sur l'onglet <strong className={textPrimary}>Équipe</strong></p>
                          <p>2. Cliquez sur <Edit3 size={12} className="inline" /> pour modifier un employé</p>
                          <p>3. Remplissez le champ <strong className={textPrimary}>Compétences</strong> (séparées par des virgules)</p>
                          <p className={`text-xs mt-1 ${textMuted}`}>Ex: Plomberie, Carrelage, Soudure, Lecture de plans</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Matching suggestions for active chantiers */}
                  {activeChantiers.length > 0 && equipe.length > 0 && (
                    <div className={`rounded-2xl border ${cardBg} p-4`}>
                      <h3 className={`text-lg font-bold ${textPrimary} mb-3 flex items-center gap-2`}><Sparkles size={20} style={{color: couleur}} /> Suggestions d'affectation</h3>
                      <div className="space-y-5">
                        {activeChantiers.slice(0, 3).map(chantier => {
                          const matches = equipe.filter(emp => emp.actif !== false && emp.contrat !== 'sous_traitant').map(emp => ({ emp, ...getMatchScore(emp, chantier) })).sort((a, b) => b.score - a.score);
                          const bestMatches = matches.filter(m => m.score > 0);
                          const noQualified = bestMatches.length === 0 || bestMatches[0].score === 0;
                          return (
                            <div key={chantier.id} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                              <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>
                                <Building2 size={14} className="inline mr-1" />{chantier.nom}
                              </p>
                              {/* No qualified employees alert */}
                              {noQualified && (
                                <div className={`flex items-center gap-2 p-2.5 rounded-lg mb-2 ${isDark ? 'bg-amber-900/30 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}`}>
                                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                    Aucun membre qualifié — <button onClick={() => { setViewMode('sous_traitants'); setTab('overview'); }} className="underline font-medium">Sous-traitant ?</button>
                                  </p>
                                </div>
                              )}
                              <div className="space-y-2">
                                {matches.slice(0, 4).map(({ emp, score, matching, missing }) => (
                                  <div key={emp.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${isDark ? 'border-slate-600' : 'border-slate-200'} ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: getRoleConfig(emp.role).color }}>
                                      {emp.prenom?.[0]}{emp.nom?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className={`text-sm font-medium ${textPrimary}`}>{emp.prenom} {emp.nom?.[0]}.</p>
                                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ color: score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444', background: score >= 75 ? '#22c55e15' : score >= 50 ? '#f59e0b15' : '#ef444415' }}>
                                          {score}%
                                        </span>
                                      </div>
                                      {/* Reasoning: matching + missing skills */}
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {matching.map(s => (
                                          <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>✅ {s}</span>
                                        ))}
                                        {missing.map(s => (
                                          <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-500'}`}>❌ {s}</span>
                                        ))}
                                        {matching.length === 0 && missing.length === 0 && (
                                          <span className={`text-[10px] ${textMuted}`}>Pas de compétences requises détectées</span>
                                        )}
                                      </div>
                                    </div>
                                    {/* Affecter button */}
                                    <button
                                      onClick={() => {
                                        quickStartTimer(emp.id, chantier.id);
                                        showToast(`${emp.prenom} affecté à ${chantier.nom}`, 'success');
                                      }}
                                      className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white min-h-[36px]"
                                      style={{ backgroundColor: couleur }}
                                    >
                                      Affecter
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All certifications */}
                  <div className={`rounded-2xl border ${cardBg} p-4`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-3 flex items-center gap-2`}><Shield size={20} style={{color: couleur}} /> Toutes les certifications</h3>
                    {certAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {certAlerts.map((c, i) => (
                          <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === 'expired' ? 'bg-red-500' : c.status === 'expiring_soon' ? 'bg-amber-500' : c.status === 'valid' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${textPrimary}`}>{c.certName}</p>
                              <p className={`text-xs ${textMuted}`}>{c.employee.prenom} {c.employee.nom}</p>
                            </div>
                            {c.expiryDate && (
                              <span className={`text-xs flex-shrink-0 ${c.status === 'expired' ? 'text-red-500' : c.status === 'expiring_soon' ? 'text-amber-500' : textMuted}`}>
                                {c.expiryDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-6 text-center rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                        <Shield size={28} className={`mx-auto mb-2 ${textMuted}`} />
                        <p className={`font-medium ${textPrimary} mb-1`}>Aucune certification</p>
                        <p className={`text-sm ${textMuted} mb-3`}>
                          Ajoutez des certifications avec dates d'expiration pour un suivi automatique.
                        </p>
                        <div className={`inline-block text-left text-xs ${textMuted} p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white border border-slate-200'}`}>
                          <p className="font-medium mb-1" style={{ color: couleur }}>📋 Formats acceptés :</p>
                          <p>• CACES R489 (exp: 2026-06)</p>
                          <p>• Habilitation électrique (expire: 2025-12-31)</p>
                          <p>• SST (valide: 2027-03)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ============ PRODUCTIVITE TAB ============ */}
        {tab === 'productivite' && (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {(() => {
              const now = new Date();
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const monthPointages = pointages.filter(p => new Date(p.date) >= monthStart);
              const monthHours = monthPointages.reduce((s, p) => s + (p.heures || 0), 0);
              const monthCost = monthPointages.reduce((s, p) => {
                const emp = equipe.find(e => e.id === p.employeId);
                return s + (p.heures || 0) * (emp?.coutHoraireCharge || 28);
              }, 0);
              const monthRevenue = monthPointages.reduce((s, p) => {
                const emp = equipe.find(e => e.id === p.employeId);
                return s + (p.heures || 0) * (emp?.tauxHoraire || 45);
              }, 0);
              const workingDaysInMonth = 22;
              const expectedHours = equipe.length * 7 * workingDaysInMonth;
              const utilizationRate = expectedHours > 0 ? Math.round((monthHours / expectedHours) * 100) : 0;

              // Per-employee metrics
              const empMetrics = equipe.map(emp => {
                const empPointages = monthPointages.filter(p => p.employeId === emp.id);
                const hours = empPointages.reduce((s, p) => s + (p.heures || 0), 0);
                const cost = hours * (emp.coutHoraireCharge || 28);
                const revenue = hours * (emp.tauxHoraire || 45);
                const margin = revenue - cost;
                // Overtime detection
                const weeklyHours = {};
                empPointages.forEach(p => {
                  const d = new Date(p.date);
                  const weekNum = Math.floor((d.getDate() - 1) / 7);
                  weeklyHours[weekNum] = (weeklyHours[weekNum] || 0) + (p.heures || 0);
                });
                const overtimeHours = Object.values(weeklyHours).reduce((s, wh) => s + Math.max(0, wh - 35), 0);
                return { emp, hours, cost, revenue, margin, overtimeHours, utilization: Math.min(100, Math.round((hours / (7 * workingDaysInMonth)) * 100)) };
              }).sort((a, b) => b.hours - a.hours);

              const totalOvertime = empMetrics.reduce((s, e) => s + e.overtimeHours, 0);

              return (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`rounded-2xl border p-4 ${cardBg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} style={{ color: couleur }} />
                        <span className={`text-xs font-medium uppercase ${textMuted}`}>Heures mois</span>
                      </div>
                      <p className={`text-2xl font-bold ${textPrimary}`}>{Math.round(monthHours)}h</p>
                      <p className={`text-xs ${textMuted}`}>{now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${cardBg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Percent size={16} className="text-blue-500" />
                        <span className={`text-xs font-medium uppercase ${textMuted}`}>Utilisation</span>
                      </div>
                      <p className={`text-2xl font-bold ${utilizationRate >= 80 ? 'text-emerald-500' : utilizationRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{utilizationRate}%</p>
                      <div className={`w-full h-2 rounded-full mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, utilizationRate)}%`, background: utilizationRate >= 80 ? '#22c55e' : utilizationRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                    <div className={`rounded-2xl border p-4 ${cardBg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Euro size={16} className="text-emerald-500" />
                        <span className={`text-xs font-medium uppercase ${textMuted}`}>Marge</span>
                      </div>
                      <p className={`text-2xl font-bold ${monthRevenue - monthCost >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {modeDiscret ? '***' : `${Math.round(monthRevenue - monthCost).toLocaleString('fr-FR')} €`}
                      </p>
                      <p className={`text-xs ${textMuted}`}>
                        {modeDiscret ? '***' : `CA: ${Math.round(monthRevenue).toLocaleString('fr-FR')} € / Coûts: ${Math.round(monthCost).toLocaleString('fr-FR')} €`}
                      </p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${cardBg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className={totalOvertime > 0 ? 'text-red-500' : 'text-emerald-500'} />
                        <span className={`text-xs font-medium uppercase ${textMuted}`}>Heures sup</span>
                      </div>
                      <p className={`text-2xl font-bold ${totalOvertime > 0 ? 'text-red-500' : textPrimary}`}>{Math.round(totalOvertime * 10) / 10}h</p>
                      {totalOvertime > 0 && (
                        <p className="text-xs text-red-500">
                          Surcoût: {modeDiscret ? '***' : `~${Math.round(totalOvertime * 45 * 0.25).toLocaleString('fr-FR')} €`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Employee ranking table */}
                  <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                      <h3 className={`font-bold ${textPrimary} flex items-center gap-2`}><TrendingUp size={18} style={{color: couleur}} /> Classement productivité</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={isDark ? 'bg-slate-700/30' : 'bg-slate-50'}>
                            <th className={`text-left px-4 py-2 text-xs font-semibold uppercase ${textMuted}`}>#</th>
                            <th className={`text-left px-4 py-2 text-xs font-semibold uppercase ${textMuted}`}>Employé</th>
                            <th className={`text-center px-4 py-2 text-xs font-semibold uppercase ${textMuted}`}>Heures</th>
                            <th className={`text-center px-4 py-2 text-xs font-semibold uppercase ${textMuted}`}>Utilisation</th>
                            <th className={`text-center px-4 py-2 text-xs font-semibold uppercase ${textMuted}`}>H. Sup</th>
                            <th className={`text-right px-4 py-2 text-xs font-semibold uppercase ${textMuted}`}>Marge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empMetrics.map(({ emp, hours, utilization, overtimeHours, margin }, idx) => (
                            <tr key={emp.id} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                              <td className={`px-4 py-3`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-400 text-amber-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-amber-700 text-amber-100' : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: getRoleConfig(emp.role).color }}>
                                    {emp.prenom?.[0]}{emp.nom?.[0]}
                                  </div>
                                  <div>
                                    <p className={`text-sm font-medium ${textPrimary}`}>{emp.prenom} {emp.nom}</p>
                                    <p className={`text-xs ${textMuted}`}>{emp.role || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className={`text-center px-4 py-3 text-sm font-semibold ${textPrimary}`}>{Math.round(hours)}h</td>
                              <td className="text-center px-4 py-3">
                                <div className="inline-flex items-center gap-1.5">
                                  <div className={`w-12 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    <div className="h-full rounded-full" style={{ width: `${utilization}%`, background: utilization >= 80 ? '#22c55e' : utilization >= 50 ? '#f59e0b' : '#ef4444' }} />
                                  </div>
                                  <span className={`text-xs ${textMuted}`}>{utilization}%</span>
                                </div>
                              </td>
                              <td className={`text-center px-4 py-3 text-sm ${overtimeHours > 0 ? 'text-red-500 font-semibold' : textMuted}`}>
                                {overtimeHours > 0 ? `+${Math.round(overtimeHours * 10) / 10}h` : '—'}
                              </td>
                              <td className={`text-right px-4 py-3 text-sm font-semibold ${margin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {modeDiscret ? '***' : `${margin >= 0 ? '+' : ''}${Math.round(margin).toLocaleString('fr-FR')} €`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
