import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Plus, ArrowLeft, ArrowRight, Edit3, Trash2, Check, X, Camera, MapPin, Phone, Clock, Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Package, Users, FileText, ChevronRight, ChevronDown, ChevronUp, Save, Image, StickyNote, CheckSquare, Square, MoreVertical, MoreHorizontal, Percent, Coins, Receipt, Banknote, PiggyBank, Target, BarChart3, CircleDollarSign, Wallet, MessageSquare, AlertCircle, ArrowUpRight, ArrowDownRight, UserCog, Download, Share2, ArrowUpDown, SortAsc, SortDesc, Building2, Zap, Sparkles, ShoppingCart, FolderOpen, Wifi, WifiOff, Sun, Cloud, CloudRain, Wind, Thermometer, GripVertical, CheckCircle, Copy, Archive, Search, Paperclip, Upload, Map, List, ClipboardList, CheckCircle2, Navigation, Mic, CalendarPlus, Moon, Shield } from 'lucide-react';

const ChantierMap = lazy(() => import('./chantiers/ChantierMap'));
const GanttView = lazy(() => import('./GanttView'));
const GarantiesDashboard = lazy(() => import('./chantiers/GarantiesDashboard'));
import { useOnlineStatus } from '../hooks/useNetworkStatus';
import { useConfirm, useToast } from '../context/AppContext';
import supabase, { isDemo } from '../supabaseClient';
import { generateId, findDuplicateChantiers } from '../lib/utils';
import QuickChantierModal from './QuickChantierModal';
import { getTaskTemplatesForMetier, QUICK_TASKS, suggestTasksFromDevis, PHASES, getAllTasksByPhase, calculateProgressByPhase, generateSmartTasks, getAvailableProjectTypes } from '../lib/templates/task-templates-v2';
import TaskGeneratorModal from './TaskGeneratorModal';
import SituationsTravaux from './chantiers/SituationsTravaux';
import RapportChantier from './chantiers/RapportChantier';
import { CHANTIER_STATUS_LABELS, getAvailableChantierTransitions } from '../lib/constants';
import { formatClientName } from '../lib/formatters';
import { calculateGlobalAvancement, getCumulativeInvoiced } from '../lib/situationUtils';
import ChantierJournal from './audit/ChantierJournal';
import { getUserWeather, getChantierWeather } from '../services/WeatherService';
import { usePermissions } from '../hooks/usePermissions';
import { ReadOnlyBanner } from './ui/PermissionGate';
import ErrorBoundary from './ui/ErrorBoundary';
import ChantierGarantiesTab from './chantiers/ChantierGarantiesTab';
import TabBar from './ui/TabBar';
import ReceptionForm from './chantiers/ReceptionForm';
import InterventionForm from './chantiers/InterventionForm';
import { getReception, createReception, updateReserve as updateReserveService, leverToutesReserves } from '../services/receptionService';
import { getByChantier as getGarantiesByChantier, GARANTIE_TYPES } from '../services/garantieService';
import { getByChantier as getInterventionsByChantier, create as createIntervention } from '../services/interventionService';

const PHOTO_CATS = ['avant', 'pendant', 'après', 'litige'];

/**
 * Calculate smart progression from multiple signals
 * Weighted average of: tasks (40%), hours (30%), costs (30%)
 */
const calculateSmartProgression = (chantier, bilan, tasksDone, tasksTotal) => {
  const signals = [];

  // Signal 1: Task completion (weight: 40%)
  if (tasksTotal > 0) {
    signals.push({ value: (tasksDone / tasksTotal) * 100, weight: 0.4 });
  }

  // Signal 2: Hours worked vs estimated (weight: 30%)
  if (chantier.heures_estimees > 0 && bilan?.heuresTotal > 0) {
    const hoursProgress = Math.min(100, (bilan.heuresTotal / chantier.heures_estimees) * 100);
    signals.push({ value: hoursProgress, weight: 0.3 });
  }

  // Signal 3: Costs spent vs budget (weight: 30%)
  if (chantier.budget_materiaux > 0 && bilan?.coutMateriaux > 0) {
    const costProgress = Math.min(100, (bilan.coutMateriaux / chantier.budget_materiaux) * 100);
    signals.push({ value: costProgress, weight: 0.3 });
  }

  // If no signals available, fallback with micro-progressions
  if (signals.length === 0) {
    if (tasksTotal > 0) return Math.round((tasksDone / tasksTotal) * 100) || 2; // Has tasks listed = some planning done
    // Fallback to manual avancement or status-based minimum
    if (chantier.statut === 'termine') return 100;
    if (chantier.statut === 'en_cours') return Math.max(chantier.avancement || 0, 5);
    return chantier.avancement || 0;
  }

  // Normalize weights if not all signals are present
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const normalizedProgress = signals.reduce((sum, s) => sum + (s.value * s.weight / totalWeight), 0);

  return Math.round(normalizedProgress);
};

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, pointages, setPointages, equipe, devis, ajustements, addAjustement, deleteAjustement, getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier, catalogue, deductStock, isDark, createMode, setCreateMode, setPage, memos = [], addMemo, updateMemo, deleteMemo, toggleMemo, onPlanEvent, addDevis, generateNextNumero }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();

  // RBAC permissions
  const { canPerform, canViewPrices, canEditData, getPermission } = usePermissions();
  const chantierPerm = getPermission('chantiers');
  const isViewOnly = chantierPerm === 'view' || chantierPerm === 'assigned';

  // ── Post-chantier sequence trigger ──────────────────────────────────────────
  const triggerPostChantierSequence = useCallback((chantier) => {
    try {
      const sequence = JSON.parse(localStorage.getItem('cp_post_chantier_sequence') || '[]');
      const activeSteps = sequence.filter(s => s.active);
      if (activeSteps.length > 0) {
        const executions = activeSteps.map(step => ({
          id: `exec_${Date.now()}_${step.id}`,
          stepId: step.id,
          chantierId: chantier.id,
          clientId: chantier.clientId || chantier.client_id,
          scheduledDate: new Date(Date.now() + step.delay * 86400000).toISOString(),
          status: 'scheduled',
          template: step.template,
          channel: step.channel,
          label: step.label,
        }));
        const existing = JSON.parse(localStorage.getItem('cp_post_chantier_executions') || '[]');
        localStorage.setItem('cp_post_chantier_executions', JSON.stringify([...existing, ...executions]));
        showToast(`Séquence post-chantier activée : ${activeSteps.length} étapes planifiées`, 'success');
      }
    } catch (e) {
      // Silently fail — post-chantier is non-critical
    }
  }, [showToast]);

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-300" : "text-slate-600";

  // C1: Duplicate chantier detection
  const duplicateMap = React.useMemo(() => findDuplicateChantiers(chantiers || []), [chantiers]);

  // C1b: Merge duplicates state
  const [mergeDialog, setMergeDialog] = useState(null); // { primaryId, secondaryId }

  const handleMergeDuplicates = useCallback((primaryId, secondaryId) => {
    const primary = chantiers.find(c => c.id === primaryId);
    const secondary = chantiers.find(c => c.id === secondaryId);
    if (!primary || !secondary) return;

    // Merge arrays (tasks, photos, documents, messages)
    const mergedTaches = [...(primary.taches || [])];
    (secondary.taches || []).forEach(t => {
      if (!mergedTaches.some(mt => mt.text === t.text)) mergedTaches.push(t);
    });
    const mergedPhotos = [...(primary.photos || []), ...(secondary.photos || [])];
    const mergedDocs = [...(primary.documents || [])];
    (secondary.documents || []).forEach(d => {
      if (!mergedDocs.some(md => md.nom === d.nom)) mergedDocs.push(d);
    });
    const mergedMessages = [...(primary.messages || []), ...(secondary.messages || [])];

    // Merge scalar fields (keep primary, fill blanks from secondary)
    const merged = {
      taches: mergedTaches,
      photos: mergedPhotos,
      documents: mergedDocs,
      messages: mergedMessages,
      description: primary.description || secondary.description || '',
      adresse: primary.adresse || secondary.adresse || '',
      ville: primary.ville || secondary.ville || '',
      code_postal: primary.code_postal || secondary.code_postal || '',
      budget_estime: primary.budget_estime || primary.budgetPrevu || secondary.budget_estime || secondary.budgetPrevu || 0,
      budgetPrevu: primary.budgetPrevu || primary.budget_estime || secondary.budgetPrevu || secondary.budget_estime || 0,
      budget_materiaux: primary.budget_materiaux || secondary.budget_materiaux || 0,
      heures_estimees: primary.heures_estimees || secondary.heures_estimees || 0,
      notes: [primary.notes, secondary.notes].filter(Boolean).join('\n---\n') || '',
    };

    updateChantier(primaryId, merged);
    updateChantier(secondaryId, { statut: 'archive', notes: `[Fusionné dans "${primary.nom}" le ${new Date().toLocaleDateString('fr-FR')}]\n${secondary.notes || ''}` });
    setMergeDialog(null);
    showToast(`Chantiers fusionnés — "${secondary.nom}" archivé`, 'success');
  }, [chantiers, updateChantier, showToast]);

  // P0.1: Compute chantier health alerts (reusable across detail + list)
  const getChantierAlerts = React.useCallback((ch, bilan) => {
    const alerts = [];
    if (!ch || ch.statut === 'termine' || ch.statut === 'archive') return alerts;
    const revTotal = (bilan?.revenuPrevu || 0) + (bilan?.adjRevenus || 0);

    // Budget thresholds: 100%+ red, 90%+ orange, 75%+ yellow
    if (revTotal > 0 && bilan?.totalDepenses > 0) {
      const pct = (bilan.totalDepenses / revTotal) * 100;
      if (pct >= 100) alerts.push({ type: 'budget', severity: 'critical', label: `Budget dépassé (${Math.round(pct)}%)`, icon: 'TrendingDown' });
      else if (pct >= 90) alerts.push({ type: 'budget', severity: 'warning', label: `Budget à ${Math.round(pct)}%`, icon: 'AlertTriangle' });
      else if (pct >= 75) alerts.push({ type: 'budget', severity: 'caution', label: `Budget à ${Math.round(pct)}%`, icon: 'AlertCircle' });
    }

    // Overdue: date_fin passed
    if (ch.date_fin) {
      const df = new Date(ch.date_fin); df.setHours(0,0,0,0);
      const now = new Date(); now.setHours(0,0,0,0);
      const days = Math.ceil((df - now) / 86400000);
      if (days < 0) alerts.push({ type: 'overdue', severity: 'critical', label: `En retard de ${Math.abs(days)}j`, icon: 'Clock' });
    }

    // Dormant: no activity in 7+ days
    const lastActivity = Math.max(
      ch.updated_at ? new Date(ch.updated_at).getTime() : 0,
      ch.last_photo_at ? new Date(ch.last_photo_at).getTime() : 0
    );
    if (lastActivity > 0 && ch.statut === 'en_cours') {
      const daysSince = Math.floor((Date.now() - lastActivity) / 86400000);
      if (daysSince >= 7) alerts.push({ type: 'dormant', severity: 'warning', label: `Inactif ${daysSince}j`, icon: 'Moon' });
    }

    // Priority tasks overdue
    const tasks = ch.taches || [];
    const critPending = tasks.filter(t => t.critical && !t.done).length;
    if (critPending > 0) alerts.push({ type: 'tasks', severity: 'warning', label: `${critPending} prioritaire${critPending > 1 ? 's' : ''}`, icon: 'Zap' });

    return alerts;
  }, []);

  // P0.1: Worst severity determines health color (hex for inline styles)
  const getHealthColor = (alerts) => {
    if (!alerts.length) return '#10b981'; // emerald-500
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasWarning = alerts.some(a => a.severity === 'warning');
    if (hasCritical) return '#ef4444'; // red-500
    if (hasWarning) return '#f59e0b'; // amber-500
    return '#eab308'; // yellow-500 (caution)
  };

  const [view, setView] = useState(selectedChantier || null);
  const [show, setShow] = useState(false);
  const [editingChantier, setEditingChantier] = useState(null); // Chantier being edited
  const [activeTab, setActiveTab] = useState('photos');

  // Reset activeTab when switching between chantiers
  const prevView = useRef(view);
  useEffect(() => {
    if (view !== prevView.current) {
      setActiveTab('photos');
      prevView.current = view;
    }
  }, [view]);
    const [newTache, setNewTache] = useState('');
  const [newDepense, setNewDepense] = useState({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' });
  const [showAjustement, setShowAjustement] = useState(null);
  const [showMODetail, setShowMODetail] = useState(false);
  const [showAddMO, setShowAddMO] = useState(false);
  const [showQuickMateriau, setShowQuickMateriau] = useState(false); // Modal ajout rapide matériau
  const [photoPreview, setPhotoPreview] = useState(null); // Photo preview modal
  const [adjForm, setAdjForm] = useState({ libelle: '', montant_ht: '' });
  const [moForm, setMoForm] = useState({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [newMessage, setNewMessage] = useState({ type: 'email', content: '' });
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ budget_estime: '' });
  const [sortBy, setSortBy] = useState('recent'); // recent, name, status, margin
  const [filterStatus, setFilterStatus] = useState('all'); // all, en_cours, prospect, termine
  const [filterClient, setFilterClient] = useState(''); // Filter by client_id
  const [searchQuery, setSearchQuery] = useState(''); // Text search
  const [viewMode, setViewMode] = useState('list'); // list, map, or gantt
  const [ganttTasks, setGanttTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_gantt_tasks') || '[]'); } catch { return []; }
  });
  const [showTaskTemplates, setShowTaskTemplates] = useState(false);
  const [newTaskCritical, setNewTaskCritical] = useState(false); // For marking new tasks as critical
  const [showTaskGenerator, setShowTaskGenerator] = useState(false); // Task generator modal
  const [weather, setWeather] = useState(null); // Weather data for active chantier
  const [showMobileActions, setShowMobileActions] = useState(null); // Mobile actions dropdown (chantier id)
  const [showTaskModal, setShowTaskModal] = useState(false); // Efficient task management modal
  const [collapsedPhases, setCollapsedPhases] = useState({}); // Track collapsed phases
  const [showCompletedTasks, setShowCompletedTasks] = useState(false); // Show/hide completed tasks
  const [editingTask, setEditingTask] = useState(null); // Task being edited
  const [taskFilter, setTaskFilter] = useState('all'); // all, pending, critical
  const [fabOpen, setFabOpen] = useState(false); // FAB chantier flottant
  // showMoreTabs removed — handled by TabBar overflow menu
  const [showReceptionForm, setShowReceptionForm] = useState(false);
  const [showInterventionForm, setShowInterventionForm] = useState(null); // garantie object
  const [chantierReception, setChantierReception] = useState(null);
  const [chantierGaranties, setChantierGaranties] = useState([]);
  const [chantierInterventions, setChantierInterventions] = useState([]);
  const [finExpanded, setFinExpanded] = useState({}); // Finance accordion sections
  const [animatedTaskId, setAnimatedTaskId] = useState(null);
  const [counterPulse, setCounterPulse] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false); // Étape 1: collapsible today banner
  const [chantierDuplicateDismissed, setChantierDuplicateDismissed] = useState(() => { try { return localStorage.getItem('chantierDuplicateDismissed') === 'true'; } catch { return false; } });

  useEffect(() => { if (selectedChantier) setView(selectedChantier); }, [selectedChantier]);
  // Sync view → selectedChantier so App.jsx can hide global FABMenu
  useEffect(() => { setSelectedChantier?.(view || null); }, [view, setSelectedChantier]);
  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  // Persist gantt tasks to localStorage
  useEffect(() => { try { localStorage.setItem('cp_gantt_tasks', JSON.stringify(ganttTasks)); } catch {} }, [ganttTasks]);

  // Fetch weather for active chantier
  useEffect(() => {
    const activeChantier = chantiers.find(c => c.statut === 'en_cours');
    if (activeChantier) {
      if (activeChantier.latitude && activeChantier.longitude) {
        getChantierWeather(activeChantier).then(setWeather).catch(() => setWeather(null));
      } else {
        // Fallback to user location weather
        getUserWeather().then(setWeather).catch(() => setWeather(null));
      }
    }
  }, [chantiers]);

  // Scroll to top when opening chantier detail
  useEffect(() => {
    if (view) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  // Load reception/garanties data when viewing a chantier detail
  useEffect(() => {
    if (!view) {
      setChantierReception(null);
      setChantierGaranties([]);
      setChantierInterventions([]);
      return;
    }
    const loadGarantieData = async () => {
      try {
        const [reception, garanties, interventions] = await Promise.all([
          getReception(view),
          getGarantiesByChantier(view),
          getInterventionsByChantier(view),
        ]);
        setChantierReception(reception);
        setChantierGaranties(garanties || []);
        setChantierInterventions(interventions || []);
      } catch (e) {
        // Silent fail — data loads when tab is opened
      }
    };
    loadGarantieData();
  }, [view]);

  const formatMoney = (n) => modeDiscret ? '·····' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => {
    if (modeDiscret) return '··%';
    const value = n || 0;
    const rounded = Math.round(value);
    // Afficher sans décimale si proche d'un entier
    return Math.abs(value - rounded) < 0.1 ? `${rounded}%` : `${value.toFixed(1)}%`;
  };
  const getMargeColor = (t) => t < 0 ? 'text-red-500' : t < 15 ? 'text-amber-500' : 'text-emerald-500';
  const getMargeLabel = (t) => t < 0 ? 'Négatif' : t < 15 ? 'Faible' : t < 30 ? 'Bon' : 'Excellent';
  const getMargeBg = (t) => t < 0 ? 'bg-red-50' : t < 15 ? 'bg-amber-50' : 'bg-emerald-50';

  // Handlers
  const handlePhotoAdd = (e, cat = 'pendant') => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: [...(ch.photos || []), { id: generateId(), src: reader.result, categorie: cat, date: new Date().toISOString() }] }); }; reader.readAsDataURL(file); };
  const deletePhoto = (id) => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: ch.photos.filter(p => p.id !== id) }); };
  const addTache = (phase = 'second-oeuvre') => { if (!newTache.trim()) return; const ch = chantiers.find(c => c.id === view); if (ch) { updateChantier(view, { taches: [...(ch.taches || []), { id: generateId(), text: newTache, done: false, critical: newTaskCritical, phase }] }); setNewTache(''); setNewTaskCritical(false); } };
  const toggleTache = (id) => {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) return;
    const updatedTaches = ch.taches.map(t => t.id === id ? { ...t, done: !t.done } : t);
    updateChantier(view, { taches: updatedTaches });
    // Trigger checkbox animation
    setAnimatedTaskId(id);
    setTimeout(() => setAnimatedTaskId(null), 400);
    // Trigger counter pulse
    setCounterPulse(true);
    setTimeout(() => setCounterPulse(false), 400);
    // Milestone toast: all tasks done
    const allDone = updatedTaches.length > 0 && updatedTaches.every(t => t.done);
    if (allDone) {
      setTimeout(() => showToast('Toutes les tâches terminées !', 'success'), 300);
    }
  };
  const addDepenseToChantier = () => {
    if (!newDepense.description || !newDepense.montant) return;
    const qty = parseInt(newDepense.quantite) || 1;
    setDepenses([...depenses, {
      id: generateId(),
      chantierId: view,
      description: newDepense.description + (qty > 1 ? ` (x${qty})` : ''),
      montant: parseFloat(newDepense.montant),
      categorie: newDepense.categorie,
      date: new Date().toISOString().split('T')[0]
    }]);
    if (newDepense.catalogueId && deductStock) deductStock(newDepense.catalogueId, qty);
    setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' });
    setShowQuickMateriau(false);
  };
  const handleAddAjustement = () => { if (!adjForm.libelle || !adjForm.montant_ht) return; addAjustement({ chantierId: view, type: showAjustement, libelle: adjForm.libelle, montant_ht: parseFloat(adjForm.montant_ht) }); setAdjForm({ libelle: '', montant_ht: '' }); setShowAjustement(null); };
  const handleAddMO = () => { if (!moForm.employeId || !moForm.heures) return; setPointages([...pointages, { id: generateId(), employeId: moForm.employeId, chantierId: view, date: moForm.date, heures: parseFloat(moForm.heures), note: moForm.note, manuel: true, approuve: true }]); setMoForm({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' }); setShowAddMO(false); };
  const handleEditPointage = (id, field, value) => setPointages(pointages.map(p => p.id === id ? { ...p, [field]: field === 'heures' ? parseFloat(value) || 0 : value } : p));
  const deletePointage = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce pointage ?' });
    if (confirmed) setPointages(pointages.filter(p => p.id !== id));
  };
  const handleDeleteAjustement = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cet ajustement ?' });
    if (confirmed) deleteAjustement(id);
  };

  // Handle chantier edit from modal (defined here so both detail and list views can use it)
  const handleEditChantier = (formData) => {
    if (!formData.id) return;

    const clientIdValue = formData.clientId || formData.client_id || '';
    updateChantier(formData.id, {
      nom: formData.nom,
      client_id: clientIdValue,
      clientId: clientIdValue,
      adresse: formData.adresse,
      ville: formData.ville,
      codePostal: formData.codePostal,
      code_postal: formData.codePostal,
      dateDebut: formData.dateDebut || formData.date_debut || null,
      date_debut: formData.date_debut || formData.dateDebut || null,
      dateFin: formData.dateFin || formData.date_fin || null,
      date_fin: formData.date_fin || formData.dateFin || null,
      budgetPrevu: formData.budgetPrevu || formData.budget_estime || 0,
      budget_estime: formData.budget_estime || formData.budgetPrevu || 0,
      budget_materiaux: formData.budget_materiaux || 0,
      heures_estimees: formData.heures_estimees || 0,
      notes: formData.notes,
      description: formData.description
    });

    setEditingChantier(null);
    showToast('Chantier modifié avec succès', 'success');
  };

  // Vue détail chantier
  if (view) {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) { setView(null); return null; }
    const client = clients.find(c => c.id === ch.client_id);
    const bilanRaw = getChantierBilan(ch.id);
    const bilan = bilanRaw || { totalDepenses: 0, revenuPrevu: 0, margeBrute: 0, tauxMarge: 0, adjRevenus: 0, adjDepenses: 0, mainOeuvre: 0 };
    const chDepenses = depenses.filter(d => d.chantierId === ch.id);
    const chPointages = pointages.filter(p => p.chantierId === ch.id);
    const chAjustements = (ajustements || []).filter(a => a.chantierId === ch.id);
    const adjRevenus = chAjustements.filter(a => a.type === 'REVENU');
    const adjDepenses = chAjustements.filter(a => a.type === 'DEPENSE');
    const tasksDone = ch.taches?.filter(t => t.done).length || 0;
    const tasksTotal = ch.taches?.length || 0;

    // Devis lié
    const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
    const devisHT = devisLie?.total_ht || 0;

    // Projections - use smart progression from real data signals
    // Force 100% for completed projects to maintain coherence
    const avancement = ch.statut === 'termine' ? 100 : calculateSmartProgression(ch, bilan, tasksDone, tasksTotal);
    const depensesFinalesEstimees = avancement > 0 ? bilan.totalDepenses / (avancement / 100) : bilan.totalDepenses * 2;
    const beneficeProjecte = bilan.revenuPrevu - depensesFinalesEstimees;
    const tauxMargeProjecte = bilan.revenuPrevu > 0 && bilan.hasDepenses ? (beneficeProjecte / bilan.revenuPrevu) * 100 : null;

    // Alertes - basées sur des seuils clairs
    const revenuTotal = bilan.revenuPrevu + (bilan.adjRevenus || 0);
    const budgetDepasse = revenuTotal > 0 && bilan.totalDepenses > revenuTotal * 0.9;
    const margeNegative = bilan.margeBrute < 0;
    const margeFaible = !margeNegative && bilan.hasDepenses && bilan.tauxMarge < 15;

    // P0.1: Unified alert system
    const chAlerts = getChantierAlerts(ch, bilan);
    const healthColor = getHealthColor(chAlerts);

    // P0.2: Financial KPI data
    const depPct = revenuTotal > 0 ? Math.min(100, (bilan.totalDepenses / revenuTotal) * 100) : 0;
    const totalFacture = devis?.filter(d => d.chantier_id === ch.id && (d.type === 'facture' || d.statut === 'facture' || d.statut === 'payee')).reduce((s, d) => s + (d.total_ht || 0), 0) || 0;
    const resteAFacturer = revenuTotal - totalFacture;

    return (
      <div className="space-y-4 sm:space-y-6 pb-24">
        {/* Header sticky avec navigation ← → */}
        {(() => {
          // Navigation entre chantiers
          const navList = chantiers.filter(c => c.statut !== 'archive');
          const currentIdx = navList.findIndex(c => c.id === ch.id);
          const prevChantier = currentIdx > 0 ? navList[currentIdx - 1] : null;
          const nextChantier = currentIdx < navList.length - 1 ? navList[currentIdx + 1] : null;

          return (
            <div className={`sticky top-0 z-20 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 ${isDark ? 'bg-slate-900/95' : 'bg-slate-50/95'} backdrop-blur-md border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              {/* Row 1: Back + Status + Title (wraps on mobile) */}
              <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                <button onClick={() => { setView(null); setSelectedChantier?.(null); }} className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0`} aria-label="Retour à la liste">
                  <ArrowLeft size={20} className={textPrimary} />
                </button>
                {/* Sync status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} title={isOnline ? 'En ligne' : 'Hors ligne'} />
                <h2 className={`order-last sm:order-none w-full sm:w-auto sm:flex-1 min-w-0 text-sm sm:text-xl font-bold leading-tight line-clamp-2 sm:line-clamp-none pl-1 sm:pl-0 ${textPrimary}`}>{ch.nom}</h2>
                <select
                  value={ch.statut}
                  onChange={e => {
                    const newStatus = e.target.value;
                    updateChantier(ch.id, { statut: newStatus });
                    if (newStatus === 'termine') triggerPostChantierSequence(ch);
                    showToast(`Statut changé: ${CHANTIER_STATUS_LABELS[newStatus]}`, 'success');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border-0 outline-none appearance-none pr-6 bg-no-repeat bg-right min-h-[44px] shrink-0 ${
                    ch.statut === 'en_cours' ? (isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700')
                    : ch.statut === 'termine' ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                    : ch.statut === 'abandonne' ? (isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700')
                    : (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700')
                  }`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '14px', backgroundPosition: 'right 6px center' }}
                >
                  <option value={ch.statut}>{CHANTIER_STATUS_LABELS[ch.statut]}</option>
                  {getAvailableChantierTransitions(ch.statut).map(status => (
                    <option key={status} value={status}>{CHANTIER_STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: Nav ← → + action buttons compact */}
              <div className="flex items-center justify-between gap-2">
                {/* Nav ← → */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => prevChantier && setView(prevChantier.id)}
                    disabled={!prevChantier}
                    aria-label={prevChantier ? `Chantier précédent : ${prevChantier.nom}` : 'Chantier précédent'}
                    className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all min-h-[44px] min-w-[44px] ${
                      prevChantier
                        ? isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                        : 'opacity-30 cursor-not-allowed'
                    } ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                    title={prevChantier ? `← ${prevChantier.nom}` : ''}
                  >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline max-w-[120px] truncate">{prevChantier?.nom || ''}</span>
                  </button>
                  <button
                    onClick={() => nextChantier && setView(nextChantier.id)}
                    disabled={!nextChantier}
                    aria-label={nextChantier ? `Chantier suivant : ${nextChantier.nom}` : 'Chantier suivant'}
                    className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all min-h-[44px] min-w-[44px] ${
                      nextChantier
                        ? isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                        : 'opacity-30 cursor-not-allowed'
                    } ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                    title={nextChantier ? `${nextChantier.nom} →` : ''}
                  >
                    <span className="hidden sm:inline max-w-[120px] truncate">{nextChantier?.nom || ''}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Action buttons: icons on desktop, ⋮ menu on mobile */}
                <div className="flex items-center gap-1">
                  {/* Desktop: icon buttons visible */}
                  <div className="hidden sm:flex items-center gap-1">
                    <button onClick={() => setEditingChantier(ch)} className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center`} title="Modifier">
                      <Edit3 size={16} className={textMuted} />
                    </button>
                    <button
                      onClick={() => {
                        const clone = { nom: `${ch.nom} (copie)`, client_id: ch.client_id, clientId: ch.client_id, adresse: ch.adresse, ville: ch.ville, codePostal: ch.codePostal, dateDebut: new Date().toISOString().split('T')[0], date_debut: new Date().toISOString().split('T')[0], dateFin: '', date_fin: '', budgetPrevu: ch.budget_estime || ch.budgetPrevu || 0, budget_estime: ch.budget_estime || ch.budgetPrevu || 0, budget_materiaux: ch.budget_materiaux || 0, heures_estimees: ch.heures_estimees || 0, description: ch.description || '', notes: ch.notes || '', taches: (ch.taches || []).map(t => ({ ...t, id: generateId(), done: false })), photos: [], documents: [], messages: [], statut: 'prospect' };
                        const newCh = addChantier(clone);
                        showToast(`Chantier dupliqué : "${clone.nom}"`, 'success');
                        if (newCh?.id) setView(newCh.id);
                      }}
                      className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center`} title="Dupliquer"
                    >
                      <Copy size={16} className={textMuted} />
                    </button>
                    {(ch.statut === 'en_cours' || ch.statut === 'termine') && !chantierReception && (
                      <button onClick={() => setShowReceptionForm(true)} className={`p-2 ${isDark ? 'hover:bg-blue-900/50' : 'hover:bg-blue-50'} rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center`} title="Réceptionner le chantier">
                        <Shield size={16} className="text-blue-500" />
                      </button>
                    )}
                    {ch.statut === 'en_cours' && (
                      <button onClick={async () => { const confirmed = await confirm({ title: 'Terminer le chantier', message: `Marquer "${ch.nom}" comme terminé ? La date de fin sera mise à aujourd'hui.` }); if (confirmed) { updateChantier(ch.id, { statut: 'termine', date_fin: new Date().toISOString().split('T')[0] }); triggerPostChantierSequence(ch); showToast('Chantier marqué comme terminé', 'success'); } }} className={`p-2 ${isDark ? 'hover:bg-emerald-900/50' : 'hover:bg-emerald-50'} rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center`} title="Marquer comme terminé">
                        <CheckCircle size={16} className="text-emerald-500" />
                      </button>
                    )}
                    {ch.statut !== 'archive' && (
                      <button onClick={async () => { const confirmed = await confirm({ title: 'Archiver', message: `Archiver le chantier "${ch.nom}" ? Il ne sera plus visible dans la liste active.` }); if (confirmed) { updateChantier(ch.id, { statut: 'archive' }); showToast('Chantier archivé', 'success'); setView(null); } }} className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center`} title="Archiver">
                        <Archive size={16} className={textMuted} />
                      </button>
                    )}
                  </div>
                  {/* Mobile: ⋮ dropdown menu with labels */}
                  <div className="relative sm:hidden">
                    <button onClick={() => setShowMobileActions(prev => prev === ch.id ? null : ch.id)} aria-label="Plus d'actions" className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center`}>
                      <MoreVertical size={18} className={textMuted} />
                    </button>
                    {showMobileActions === ch.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMobileActions(null)} />
                        <div className={`absolute right-0 top-full mt-1 z-20 py-1 rounded-xl shadow-lg border min-w-[180px] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                          <button onClick={() => { setEditingChantier(ch); setShowMobileActions(null); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                            <Edit3 size={16} className={textMuted} /> Modifier
                          </button>
                          <button onClick={() => { const clone = { nom: `${ch.nom} (copie)`, client_id: ch.client_id, clientId: ch.client_id, adresse: ch.adresse, ville: ch.ville, codePostal: ch.codePostal, dateDebut: new Date().toISOString().split('T')[0], date_debut: new Date().toISOString().split('T')[0], dateFin: '', date_fin: '', budgetPrevu: ch.budget_estime || ch.budgetPrevu || 0, budget_estime: ch.budget_estime || ch.budgetPrevu || 0, budget_materiaux: ch.budget_materiaux || 0, heures_estimees: ch.heures_estimees || 0, description: ch.description || '', notes: ch.notes || '', taches: (ch.taches || []).map(t => ({ ...t, id: generateId(), done: false })), photos: [], documents: [], messages: [], statut: 'prospect' }; const newCh = addChantier(clone); showToast(`Chantier dupliqué`, 'success'); if (newCh?.id) setView(newCh.id); setShowMobileActions(null); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                            <Copy size={16} className={textMuted} /> Dupliquer
                          </button>
                          {ch.statut === 'en_cours' && (
                            <button onClick={async () => { setShowMobileActions(null); const confirmed = await confirm({ title: 'Terminer', message: `Marquer "${ch.nom}" comme terminé ?` }); if (confirmed) { updateChantier(ch.id, { statut: 'termine', date_fin: new Date().toISOString().split('T')[0] }); triggerPostChantierSequence(ch); showToast('Chantier terminé', 'success'); } }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-emerald-400 hover:bg-slate-700' : 'text-emerald-600 hover:bg-slate-50'}`}>
                              <CheckCircle size={16} /> Terminer
                            </button>
                          )}
                          {ch.statut !== 'archive' && (
                            <button onClick={async () => { setShowMobileActions(null); const confirmed = await confirm({ title: 'Archiver', message: `Archiver "${ch.nom}" ?` }); if (confirmed) { updateChantier(ch.id, { statut: 'archive' }); showToast('Archivé', 'success'); setView(null); } }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                              <Archive size={16} /> Archiver
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setShowTaskGenerator(true)}
                    className="px-3 py-1.5 rounded-lg min-h-[44px] flex items-center gap-1.5 text-white text-xs font-medium transition-all hover:opacity-90"
                    style={{ background: couleur }}
                  >
                    <Sparkles size={14} />
                    <span className="hidden sm:inline">IA Tâches</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Auto-suggestion: mark as terminé when all tasks done */}
        {ch.statut !== 'termine' && tasksTotal > 0 && tasksDone === tasksTotal && (
          <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border-2 ${isDark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-3">
              <CheckSquare size={20} className="text-emerald-500" />
              <div>
                <p className={`font-medium text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Toutes les tâches sont terminées !</p>
                <p className={`text-xs ${textMuted}`}>Marquer ce chantier comme terminé ?</p>
              </div>
            </div>
            <button
              onClick={() => {
                updateChantier(ch.id, { statut: 'termine' });
                triggerPostChantierSequence(ch);
                showToast('Chantier marqué comme terminé', 'success');
              }}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl whitespace-nowrap min-h-[44px] hover:shadow-lg transition-all bg-emerald-500 hover:bg-emerald-600"
            >
              Terminer
            </button>
          </div>
        )}

        {/* Deadline alert */}
        {ch.statut !== 'termine' && ch.statut !== 'abandonne' && ch.date_fin && (() => {
          const dateFin = new Date(ch.date_fin);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dateFin.setHours(0, 0, 0, 0);
          const daysLeft = Math.ceil((dateFin - today) / (1000 * 60 * 60 * 24));
          if (daysLeft > 14) return null;
          const isOverdue = daysLeft < 0;
          const isUrgent = daysLeft <= 3 && daysLeft >= 0;
          const isWarning = daysLeft > 3 && daysLeft <= 14;
          const colors = isOverdue
            ? (isDark ? 'bg-red-900/20 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
            : isUrgent
              ? (isDark ? 'bg-amber-900/20 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')
              : (isDark ? 'bg-blue-900/20 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700');
          return (
            <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${colors}`}>
              <AlertTriangle size={20} className={isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-blue-500'} />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {isOverdue
                    ? `Échéance dépassée de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`
                    : daysLeft === 0
                      ? 'Échéance aujourd\'hui !'
                      : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} avant l'échéance`}
                </p>
                <p className={`text-xs ${textMuted}`}>
                  Date de fin prévue : {dateFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })()}

        {/* === SECTION: SITUATION AVANCEMENT BAR === */}
        {ch.situations_data?.mode === 'situation' && (() => {
          const globalAv = calculateGlobalAvancement(ch.situations_data);
          const sitCount = ch.situations_data?.situations?.length || 0;
          const invoiced = getCumulativeInvoiced(ch.situations_data?.situations || []);
          return (
            <div className={`${cardBg} rounded-xl border p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} style={{ color: couleur }} />
                  <span className={`text-sm font-semibold ${textPrimary}`}>Avancement travaux</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{sitCount} situation{sitCount > 1 ? 's' : ''}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: globalAv >= 100 ? '#10b981' : couleur }}>
                  {modeDiscret ? '***' : `${globalAv.toFixed(0)}%`}
                </span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(globalAv, 100)}%`, backgroundColor: globalAv >= 100 ? '#10b981' : couleur }}
                />
              </div>
              {!modeDiscret && invoiced.totalFactureHT > 0 && (
                <p className={`text-xs ${textMuted} mt-1.5`}>
                  Facturé : {formatMoney(invoiced.totalFactureHT)} HT
                  {invoiced.retenueRetenue > 0 && <> · Retenue : {formatMoney(invoiced.retenueRetenue)}</>}
                </p>
              )}
            </div>
          );
        })()}

        {/* === SECTION: CLIENT & ADRESSE === */}
        {/* === ZONE CLIENT / ADRESSE + GPS (above the fold) === */}
        <div className={`${cardBg} rounded-xl border p-4`}>
          {/* Mobile: GPS en premier (above-the-fold) */}
          {(ch.adresse || ch.ville) && (
            <div className="sm:hidden mb-4">
              <button
                onClick={() => {
                  const address = encodeURIComponent(`${ch.adresse || ''} ${ch.codePostal || ''} ${ch.ville || ''}`);
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const isAndroid = /Android/.test(navigator.userAgent);
                  if (isIOS) window.open(`maps://maps.apple.com/?q=${address}`, '_blank');
                  else if (isAndroid) window.open(`geo:0,0?q=${address}`, '_blank');
                  else window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: couleur }}
                aria-label="Ouvrir dans Google Maps"
              >
                <MapPin size={16} />
                Ouvrir GPS
              </button>
              <p className={`text-xs ${textMuted} mt-2`}>
                {ch.adresse}{ch.codePostal ? `, ${ch.codePostal}` : ''}{ch.ville ? ` ${ch.ville}` : ''}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Infos Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Client</span>
              </div>
              {client ? (
                <div className="space-y-1.5">
                  <p className={`font-semibold ${textPrimary}`}>{formatClientName(client)}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {client.telephone && (
                      <a href={`tel:${client.telephone}`} className={`flex items-center gap-1.5 text-sm ${textSecondary} hover:opacity-80 min-h-[44px] px-3 py-1 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <Phone size={14} className="text-purple-500" />
                        {client.telephone}
                      </a>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`} className={`flex items-center gap-1.5 text-sm ${textSecondary} hover:opacity-80 truncate max-w-[200px]`}>
                        <span className="text-blue-500">@</span>
                        {client.email}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${textMuted}`}>Aucun client associé</p>
              )}
            </div>

            {/* Adresse + gros bouton GPS (desktop) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Adresse du chantier</span>
              </div>
              {(ch.adresse || ch.ville) ? (
                <div className="space-y-2">
                  <p className={`text-sm ${textPrimary}`}>
                    {ch.adresse}
                    {ch.codePostal && `, ${ch.codePostal}`}
                    {ch.ville && ` ${ch.ville}`}
                  </p>
                  {/* GPS button - desktop only (mobile has it above) */}
                  <button
                    onClick={() => {
                      const address = encodeURIComponent(`${ch.adresse || ''} ${ch.codePostal || ''} ${ch.ville || ''}`);
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      const isAndroid = /Android/.test(navigator.userAgent);
                      if (isIOS) window.open(`maps://maps.apple.com/?q=${address}`, '_blank');
                      else if (isAndroid) window.open(`geo:0,0?q=${address}`, '_blank');
                      else window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                    }}
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: couleur }}
                    aria-label="Ouvrir dans Google Maps"
                  >
                    <MapPin size={16} />
                    Ouvrir GPS
                  </button>
                </div>
              ) : (
                <p className={`text-sm ${textMuted}`}>Adresse non renseignée</p>
              )}
            </div>

            {/* === Actions terrain : Prévenir le client === */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Actions terrain</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(() => {
                  const handleNotifyClient = async (type) => {
                    const client = clients?.find(c => c.id === (ch.clientId || ch.client_id));
                    const templates = {
                      en_route: `Bonjour ${client?.prenom || 'M./Mme'}, votre artisan ${entreprise?.nom || ''} est en route. Arrivée estimée dans 30 minutes.`,
                      arrive: `Bonjour, votre artisan est arrivé sur le chantier "${ch.nom}".`,
                      termine: `Bonne nouvelle ! Les travaux sur votre chantier "${ch.nom}" sont terminés. N'hésitez pas à nous contacter.`,
                    };
                    const message = templates[type];
                    const clientTel = client?.telephone || client?.tel;

                    // Try to send SMS via Edge Function
                    if (!isDemo && supabase && clientTel) {
                      try {
                        const { data, error } = await supabase.functions.invoke('send-sms', {
                          body: { action: 'send_jarrive', to: clientTel, message, entreprise_nom: entreprise?.nom }
                        });
                        if (!error && data?.success) {
                          showToast(`SMS "${type === 'en_route' ? 'En route' : type === 'arrive' ? 'Arrivé' : 'Terminé'}" envoyé à ${client?.prenom || 'votre client'}`, 'success');
                          // Log the notification
                          supabase.from('notifications_client').insert({
                            entreprise_id: entreprise?.id,
                            client_id: client?.id,
                            chantier_id: ch.id,
                            type: type,
                            canal: 'sms',
                            message,
                            sent_at: new Date().toISOString(),
                            statut: 'sent',
                          }).then(() => {}).catch(() => {});
                          return;
                        }
                      } catch (e) {
                        // Twilio not configured — fallback to clipboard
                      }
                    }

                    // Log the notification attempt even on clipboard fallback
                    if (!isDemo && supabase) {
                      supabase.from('notifications_client').insert({
                        entreprise_id: entreprise?.id,
                        client_id: client?.id,
                        chantier_id: ch.id,
                        type: type,
                        canal: clientTel ? 'sms' : 'email',
                        message,
                        sent_at: new Date().toISOString(),
                        statut: 'clipboard',
                      }).then(() => {}).catch(() => {});
                    }

                    // Fallback: copy to clipboard
                    await navigator.clipboard?.writeText(message);
                    showToast(`Message copié — envoyez-le par SMS à ${client?.prenom || 'votre client'}`, 'info');
                  };

                  return (
                    <>
                      <button
                        onClick={() => handleNotifyClient('en_route')}
                        className={`flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-orange-400' : 'bg-orange-50 text-orange-700'}`}
                      >
                        <Navigation size={16} /> En route
                      </button>
                      <button
                        onClick={() => handleNotifyClient('arrive')}
                        className={`flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}
                      >
                        <MapPin size={16} /> Arrivé
                      </button>
                      <button
                        onClick={() => handleNotifyClient('termine')}
                        className={`flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-700'}`}
                      >
                        <CheckCircle size={16} /> Terminé
                      </button>
                      <button
                        onClick={() => {
                          const heures = prompt('Heures travaillées sur ce chantier :');
                          if (heures && !isNaN(parseFloat(heures))) {
                            showToast?.(`${heures}h pointées sur ${ch.nom}`, 'success');
                            const logs = JSON.parse(localStorage.getItem('cp_pointage_heures') || '[]');
                            logs.push({ chantierId: ch.id, heures: parseFloat(heures), date: new Date().toISOString(), nom: ch.nom });
                            localStorage.setItem('cp_pointage_heures', JSON.stringify(logs.slice(-100)));
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                      >
                        <Clock size={16} /> Pointer
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Weather widget */}
              {weather === null && ch.adresse && (
                <div className={`mt-3 rounded-xl border p-3 flex items-center gap-2 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <Cloud size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Météo indisponible pour ce chantier</span>
                </div>
              )}
              {weather?.daily?.length > 0 && !weather.isDefault && (
                <div className={`mt-3 rounded-xl border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud size={14} style={{ color: couleur }} />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Météo {weather.location || ch.ville || 'chantier'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {weather.daily.slice(0, 3).map((day, i) => {
                      const labels = ['Auj.', 'Dem.', 'J+2'];
                      const WeatherIcon = day.icon === 'sun' ? Sun : day.icon === 'rain' ? CloudRain : Cloud;
                      return (
                        <div key={i} className="text-center flex-1">
                          <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{labels[i]}</p>
                          <WeatherIcon size={16} className={`mx-auto my-1 ${day.icon === 'sun' ? 'text-yellow-500' : day.icon === 'rain' ? 'text-blue-400' : 'text-slate-400'}`} />
                          <p className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{day.temp}°C</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === SECTION: AVANCEMENT & TÂCHES (redesigned) === */}
        {(() => {
          const allTasks = ch.taches || [];
          const pendingTasks = allTasks.filter(t => !t.done);
          const completedTasks = allTasks.filter(t => t.done);
          const criticalTasks = pendingTasks.filter(t => t.critical);
          const progress = calculateProgressByPhase(allTasks);

          const tasksByPhase = {};
          PHASES.forEach(phase => { tasksByPhase[phase.id] = allTasks.filter(t => t.phase === phase.id); });
          const tasksNoPhase = allTasks.filter(t => !t.phase);

          const getFilteredTasks = (tasks) => {
            if (taskFilter === 'pending') return tasks.filter(t => !t.done);
            if (taskFilter === 'critical') return tasks.filter(t => t.critical && !t.done);
            return tasks;
          };
          const togglePhase = (phaseId) => setCollapsedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
          const deleteTask = (taskId) => { updateChantier(ch.id, { taches: allTasks.filter(t => t.id !== taskId) }); setEditingTask(null); };
          const updateTask = (taskId, updates) => { updateChantier(ch.id, { taches: allTasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }); setEditingTask(null); };
          const getPhaseProgress = (phaseId) => { const p = tasksByPhase[phaseId] || []; if (!p.length) return { done: 0, total: 0, percent: 0 }; const d = p.filter(t => t.done).length; return { done: d, total: p.length, percent: Math.round((d / p.length) * 100) }; };

          // Inline IA generator: generate tasks for a project type
          const handleInlineGenerate = (projectTypeKey) => {
            const metier = ch.metier || entreprise?.metier || 'general';
            const newTasks = generateSmartTasks(metier, projectTypeKey);
            if (newTasks.length > 0) {
              const tasksWithIds = newTasks.map(t => ({ ...t, id: generateId(), done: false }));
              updateChantier(ch.id, { taches: [...allTasks, ...tasksWithIds] });
              showToast(`${tasksWithIds.length} tâches générées`, 'success');
            }
          };

          // Project types for inline selector
          const projectTypes = getAvailableProjectTypes();
          const typeIcons = {
            'renovation-complete': '🏠', 'salle-de-bain': '🚿', 'cuisine': '🍳', 'extension': '🏗️',
            'peinture-interieure': '🎨', 'toiture': '🏚️', 'facade': '🧱', 'terrasse': '🪵',
            'piscine': '🏊', 'cloture': '🏡', 'electricite': '⚡', 'plomberie': '🔧',
            'isolation': '🧤', 'chauffage': '🔥', 'amenagement-combles': '📐', 'garage': '🚗'
          };

          return (
            <div className={`${cardBg} rounded-xl border p-4`}>
              {/* Header: titre + mini IA button */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Tâches</span>
                </div>
                <div className="flex-1" />
                {allTasks.length > 0 && (
                  <button
                    onClick={() => setShowTaskGenerator(true)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    title="Compléter avec l'IA"
                  >
                    <Sparkles size={13} style={{ color: couleur }} />
                    IA
                  </button>
                )}
              </div>

              {allTasks.length === 0 ? (
                /* === EMPTY STATE: Enriched + reduced grid === */
                <div className="text-center">
                  <div className={`py-6 rounded-xl mb-4 ${isDark ? 'bg-slate-700/30' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
                    <Sparkles size={24} className="mx-auto mb-2" style={{ color: couleur }} />
                    <p className={`font-semibold text-base ${textPrimary} mb-1`}>Planifiez vos étapes de travail</p>
                    <p className={`text-xs ${textMuted} max-w-xs mx-auto`}>Découpez votre chantier en tâches pour suivre l'avancement et coordonner votre équipe</p>
                  </div>
                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {projectTypes.slice(0, 4).map(pt => (
                      <button
                        key={pt.key}
                        onClick={() => handleInlineGenerate(pt.key)}
                        className={`p-3 rounded-xl text-left transition-all border ${isDark ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700' : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50'}`}
                      >
                        <span className="text-lg">{typeIcons[pt.key] || '📋'}</span>
                        <p className={`text-xs font-medium mt-1 ${textPrimary}`}>{pt.label}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowTaskGenerator(true)} className={`text-xs font-medium mb-3 ${textMuted} hover:underline`}>
                    Voir plus de types →
                  </button>
                  <button
                    onClick={() => setShowTaskGenerator(true)}
                    className={`text-xs font-medium ${textMuted} hover:underline`}
                  >
                    Ou configurer manuellement →
                  </button>
                </div>
              ) : (
                /* === TASKS EXIST: Donut + List layout === */
                <>
                  {/* Desktop: Donut left + summary right | Mobile: inline */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    {/* Donut */}
                    <div className="flex sm:flex-col items-center gap-3 sm:gap-1">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="26" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="8" fill="none" />
                          <circle cx="32" cy="32" r="26" stroke={progress.total === 100 ? '#10b981' : couleur} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 26 * progress.total / 100} ${2 * Math.PI * 26}`} className="transition-all duration-500" />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center font-bold text-xl ${progress.total === 100 ? 'text-emerald-500' : textPrimary}`}>
                          {progress.total}%
                        </span>
                      </div>
                      <div className="sm:text-center">
                        <p className={`font-semibold ${textPrimary}`}>{tasksDone}/{tasksTotal}</p>
                        <p className={`text-xs ${textMuted}`}>
                          {tasksDone === tasksTotal ? 'Terminé !' : `${tasksTotal - tasksDone} restante${tasksTotal - tasksDone > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>

                    {/* Filtres + liste */}
                    <div className="flex-1 min-w-0">
                      {/* Filtres rapides */}
                      <div className="flex gap-1.5 mb-3 flex-wrap">
                        {[
                          { key: 'all', label: 'Toutes' },
                          { key: 'pending', label: 'À faire' },
                          { key: 'critical', label: 'Prioritaires' }
                        ].map(f => (
                          <button
                            key={f.key}
                            onClick={() => setTaskFilter(f.key)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                              taskFilter === f.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            style={taskFilter === f.key ? { background: couleur } : {}}
                          >
                            {f.label}
                            {f.key === 'critical' && criticalTasks.length > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">{criticalTasks.length}</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Task list by phase */}
                      <div className="max-h-[350px] overflow-y-auto space-y-1.5 pr-1">
                        {PHASES.map(phase => {
                          const phaseTasks = tasksByPhase[phase.id] || [];
                          const filteredPhaseTasks = getFilteredTasks(phaseTasks);
                          const phaseProgress = getPhaseProgress(phase.id);
                          const isCollapsed = collapsedPhases[phase.id];
                          if (filteredPhaseTasks.length === 0 && taskFilter !== 'all') return null;
                          if (phaseTasks.length === 0) return null;

                          return (
                            <div key={phase.id} className={`rounded-lg border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                              <button onClick={() => togglePhase(phase.id)} className={`w-full flex items-center gap-2 p-2.5 text-left transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} ${isCollapsed ? 'rounded-lg' : 'rounded-t-lg'}`}>
                                <ChevronRight size={14} className={`transition-transform ${isCollapsed ? '' : 'rotate-90'} ${textMuted}`} />
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                                <span className={`text-xs font-medium flex-1 ${textPrimary}`}>{phase.label}</span>
                                <span className={`text-xs ${textMuted}`}>{phaseProgress.done}/{phaseProgress.total}</span>
                                <div className={`w-10 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${phaseProgress.percent}%`, background: phaseProgress.percent === 100 ? '#10b981' : phase.color }} />
                                </div>
                              </button>
                              {!isCollapsed && (
                                <div className="px-2.5 pb-2 space-y-0.5">
                                  {filteredPhaseTasks.map(t => (
                                    <div key={t.id} className={`flex items-center gap-2 p-1.5 rounded-lg group transition-all ${t.critical ? (isDark ? 'bg-red-900/20' : 'bg-red-50') : (isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50')}`}>
                                      <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} className={`w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0 ${t.critical ? 'border-red-500 text-red-500' : ''} ${animatedTaskId === t.id ? 'scale-125' : ''}`} style={{ ...((!t.critical) ? { borderColor: phase.color, accentColor: phase.color } : {}), transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                      <button type="button" onClick={() => setEditingTask(t)} className={`flex-1 text-xs text-left cursor-pointer hover:underline ${t.done ? 'line-through opacity-50' : ''} ${t.critical ? 'font-medium' : ''} ${textPrimary}`}>{t.text}</button>
                                      {t.critical && !t.done && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-medium">!</span>}
                                      <button onClick={() => setEditingTask(t)} aria-label="Modifier la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}><MoreVertical size={14} className={textMuted} /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Tasks without phase */}
                        {tasksNoPhase.length > 0 && (
                          <div className={`rounded-lg border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <button onClick={() => togglePhase('no-phase')} className={`w-full flex items-center gap-2 p-2.5 text-left transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} ${collapsedPhases['no-phase'] ? 'rounded-lg' : 'rounded-t-lg'}`}>
                              <ChevronRight size={14} className={`transition-transform ${collapsedPhases['no-phase'] ? '' : 'rotate-90'} ${textMuted}`} />
                              <span className={`text-xs font-medium flex-1 ${textPrimary}`}>Autres tâches</span>
                              <span className={`text-xs ${textMuted}`}>{tasksNoPhase.filter(t => t.done).length}/{tasksNoPhase.length}</span>
                            </button>
                            {!collapsedPhases['no-phase'] && (
                              <div className="px-2.5 pb-2 space-y-0.5">
                                {getFilteredTasks(tasksNoPhase).map(t => (
                                  <div key={t.id} className={`flex items-center gap-2 p-1.5 rounded-lg group transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} className="w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0" style={{ borderColor: couleur, accentColor: couleur }} />
                                    <button type="button" onClick={() => setEditingTask(t)} className={`flex-1 text-xs text-left cursor-pointer hover:underline ${t.done ? 'line-through opacity-50' : ''} ${textPrimary}`}>{t.text}</button>
                                    <button onClick={() => setEditingTask(t)} aria-label="Modifier la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}><MoreVertical size={14} className={textMuted} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Completed tasks collapsible */}
                  {completedTasks.length > 0 && taskFilter === 'all' && (
                    <div className="mb-3">
                      <button onClick={() => setShowCompletedTasks(!showCompletedTasks)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${isDark ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        <ChevronRight size={14} className={`transition-transform ${showCompletedTasks ? 'rotate-90' : ''} ${textMuted}`} />
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span className={`text-xs font-medium ${textMuted}`}>Terminées ({completedTasks.length})</span>
                      </button>
                      {showCompletedTasks && (
                        <div className="mt-1 space-y-0.5 max-h-[150px] overflow-y-auto">
                          {completedTasks.map(t => (
                            <div key={t.id} className={`flex items-center gap-2 p-1.5 rounded-lg opacity-50 ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} className="w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0 text-emerald-500" />
                              <span className={`flex-1 text-xs line-through ${textMuted}`}>{t.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Always-visible "Ajouter une tâche" input at bottom */}
              <div className={`flex gap-2 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <input
                  placeholder="Ajouter une tâche..."
                  value={newTache}
                  onChange={e => setNewTache(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addTache()}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm min-h-[44px] ${inputBg}`}
                />
                <button
                  onClick={addTache}
                  disabled={!newTache.trim()}
                  className="px-3 py-2 text-white rounded-lg min-h-[44px] disabled:opacity-50 transition-all active:scale-[0.98]"
                  style={{ background: couleur }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Task edit modal */}
              {editingTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingTask(null)}>
                  <div className={`${cardBg} rounded-2xl w-full max-w-md p-4 shadow-xl`} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${textPrimary}`}>Modifier la tâche</h3>
                      <button onClick={() => setEditingTask(null)} aria-label="Fermer" className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={18} className={textMuted} /></button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`text-sm font-medium ${textMuted} block mb-1`}>Nom de la tâche</label>
                        <input type="text" value={editingTask.text} onChange={e => setEditingTask({ ...editingTask, text: e.target.value })} className={`w-full px-3 py-2 border rounded-xl ${inputBg}`} />
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${textMuted} block mb-1`}>Phase</label>
                        <select value={editingTask.phase || ''} onChange={e => setEditingTask({ ...editingTask, phase: e.target.value })} className={`w-full px-3 py-2 border rounded-xl ${inputBg}`}>
                          <option value="">Sans phase</option>
                          {PHASES.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="task-critical" checked={editingTask.critical || false} onChange={e => setEditingTask({ ...editingTask, critical: e.target.checked })} className="w-5 h-5 rounded border-2 border-red-500 text-red-500" />
                        <label htmlFor="task-critical" className={`text-sm ${textPrimary}`}>Tâche prioritaire</label>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => deleteTask(editingTask.id)} className={`px-4 py-2 rounded-xl text-red-500 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} text-sm font-medium`}><Trash2 size={16} className="inline mr-1" /> Supprimer</button>
                        <div className="flex-1" />
                        <button onClick={() => setEditingTask(null)} className={`px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Annuler</button>
                        <button onClick={() => updateTask(editingTask.id, { text: editingTask.text, phase: editingTask.phase, critical: editingTask.critical })} className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: couleur }}>Sauvegarder</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Quick actions remplacées par le FAB flottant (voir bas de page) */}
        <input id={`photo-quick-${ch.id}`} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoAdd(e, 'pendant')} />

        {/* P0.1: Unified smart alerts — multiple alerts stacked */}
        {chAlerts.length > 0 && (
          <div className="space-y-2">
            {chAlerts.map((alert, i) => {
              const colors = alert.severity === 'critical'
                ? (isDark ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                : alert.severity === 'warning'
                ? (isDark ? 'bg-amber-900/30 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')
                : (isDark ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700');
              const iconColor = alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'warning' ? 'text-amber-500' : 'text-yellow-500';
              return (
                <div key={`${alert.type}-${i}`} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors}`}>
                  {alert.type === 'budget' && <TrendingDown size={18} className={iconColor} />}
                  {alert.type === 'overdue' && <Clock size={18} className={iconColor} />}
                  {alert.type === 'dormant' && <AlertCircle size={18} className={iconColor} />}
                  {alert.type === 'tasks' && <AlertTriangle size={18} className={iconColor} />}
                  <span className="text-sm font-medium">{alert.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* P0.2: Unified financial KPI dashboard — always visible */}
        {(revenuTotal > 0 || bilan.totalDepenses > 0) && (
          <div className={`${cardBg} rounded-xl border p-4`}>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Budget</p>
                <p className={`text-lg font-bold tabular-nums ${textPrimary}`}>{modeDiscret ? '•••••' : formatMoney(revenuTotal)}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Dépensé</p>
                <p className="text-lg font-bold tabular-nums text-red-500">{modeDiscret ? '•••••' : formatMoney(bilan.totalDepenses)}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Facturé</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: couleur }}>{modeDiscret ? '•••••' : formatMoney(totalFacture)}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Marge brute</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: getHealthColor(chAlerts) }}>
                  {modeDiscret ? '•••••' : bilan.hasDepenses ? `${formatPct(bilan.tauxMarge)}` : '—'}
                </p>
              </div>
            </div>
            {/* Double progress bar: avancement vs budget consumption */}
            {revenuTotal > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium w-16 ${textMuted}`}>Avancement</span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full transition-all ${avancement > 0 ? 'min-w-[4px]' : ''}`} style={{ width: `${Math.min(100, avancement)}%`, background: couleur }} />
                  </div>
                  <span className={`text-xs font-bold tabular-nums w-8 text-right`} style={{ color: couleur }}>{avancement}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium w-16 ${textMuted}`}>Budget</span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full transition-all ${depPct > avancement && avancement > 0 ? 'bg-red-500' : depPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, depPct)}%` }} />
                  </div>
                  <span className={`text-xs font-bold tabular-nums w-8 text-right ${depPct > avancement && avancement > 0 ? 'text-red-500' : depPct > 75 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.round(depPct)}%</span>
                </div>
                {resteAFacturer > 0 && !modeDiscret && (
                  <p className={`text-xs ${textMuted} text-right`}>Reste à facturer : <strong className={textPrimary}>{formatMoney(resteAFacturer)}</strong></p>
                )}
              </div>
            )}
          </div>
        )}

        {/* === SECTION: FINANCES (condensé + accordion) === */}
        {(() => {
          const healthColor = !bilan.hasDepenses ? 'text-slate-400' : bilan.margeBrute < 0 ? 'text-red-500' : bilan.tauxMarge < 15 ? 'text-amber-500' : 'text-emerald-500';
          const healthBg = !bilan.hasDepenses ? 'bg-slate-400' : bilan.margeBrute < 0 ? 'bg-red-500' : bilan.tauxMarge < 15 ? 'bg-amber-500' : 'bg-emerald-500';
          const margeLabel = !bilan.hasDepenses ? '' : getMargeLabel(bilan.tauxMarge);
          const depPct = revenuTotal > 0 ? Math.min(100, (bilan.totalDepenses / revenuTotal) * 100) : 0;
          const toggleFin = (k) => setFinExpanded(p => ({ ...p, [k]: !p[k] }));

          return (
            <div className={`${cardBg} rounded-xl border p-4`}>
              {/* Summary line */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Finances</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className={textMuted}>Budget <strong className={textPrimary}>{formatMoney(revenuTotal)}</strong></span>
                  <span className={textMuted}>Dépensé <strong className="text-red-500">{formatMoney(bilan.totalDepenses)}</strong></span>
                  <span className="flex items-center gap-1.5">
                    <span className={`font-bold ${healthColor}`}>{bilan.hasDepenses ? formatPct(bilan.tauxMarge) : '—'}</span>
                    {margeLabel && <span className={`text-xs font-medium ${healthColor}`}>{margeLabel}</span>}
                    <div className={`w-2.5 h-2.5 rounded-full ${healthBg}`} />
                  </span>
                </div>
              </div>

              {/* Horizontal bar: vert (revenus) vs rouge (dépenses) */}
              {revenuTotal > 0 && (
                <div className="mb-4">
                  <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-emerald-100'}`}>
                    <div className="h-full rounded-full transition-all bg-red-400" style={{ width: `${depPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${textMuted}`}>0 €</span>
                    <span className={`text-xs font-medium ${depPct > 90 ? 'text-red-500' : textMuted}`}>{Math.round(depPct)}% consommé</span>
                    <span className={`text-xs ${textMuted}`}>{formatMoney(revenuTotal)}</span>
                  </div>
                </div>
              )}

              {/* +Revenu / +Dépense buttons always visible */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setShowAjustement('REVENU')} className={`flex-1 min-h-[44px] py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-emerald-800/50 text-emerald-300 hover:bg-emerald-800' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'} active:scale-[0.98] transition-all`}>
                  <Plus size={16} /> Revenu
                </button>
                <button onClick={() => setShowQuickMateriau(true)} className={`flex-1 min-h-[44px] py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-red-800/50 text-red-300 hover:bg-red-800' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'} active:scale-[0.98] transition-all`}>
                  <Plus size={16} /> Dépense
                </button>
              </div>

              {/* Accordion sections */}
              <div className="space-y-1">
                {/* Revenus */}
                <button onClick={() => toggleFin('revenus')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                  <ChevronRight size={14} className={`transition-transform ${finExpanded.revenus ? 'rotate-90' : ''} ${textMuted}`} />
                  <ArrowUpRight size={14} className="text-emerald-500" />
                  <span className={`text-xs font-medium flex-1 ${textPrimary}`}>Revenus</span>
                  <span className="text-xs font-bold" style={{ color: couleur }}>{formatMoney(revenuTotal)}</span>
                </button>
                {finExpanded.revenus && (
                  <div className={`ml-6 p-3 rounded-lg space-y-2 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                    <div className="flex justify-between"><span className={`text-xs ${textMuted}`}>Montant devis</span><span className={`text-xs font-medium ${textPrimary}`}>{bilan.revenuPrevu > 0 ? formatMoney(bilan.revenuPrevu) : 'Non défini'}</span></div>
                    {(bilan.adjRevenus || 0) > 0 && <div className="flex justify-between"><span className={`text-xs ${textMuted}`}>Travaux suppl.</span><span className="text-xs font-medium text-emerald-600">+{formatMoney(bilan.adjRevenus)}</span></div>}
                    {bilan.revenuEncaisse > 0 && <div className="flex justify-between"><span className={`text-xs ${textMuted}`}>Encaissé</span><span className="text-xs font-medium text-emerald-600">{formatMoney(bilan.revenuEncaisse)}</span></div>}
                  </div>
                )}

                {/* Dépenses */}
                <button onClick={() => toggleFin('depenses')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                  <ChevronRight size={14} className={`transition-transform ${finExpanded.depenses ? 'rotate-90' : ''} ${textMuted}`} />
                  <ArrowDownRight size={14} className="text-red-500" />
                  <span className={`text-xs font-medium flex-1 ${textPrimary}`}>Dépenses</span>
                  <span className="text-xs font-bold text-red-500">{formatMoney(bilan.totalDepenses)}</span>
                </button>
                {finExpanded.depenses && (
                  <div className={`ml-6 p-3 rounded-lg space-y-1 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                    <button type="button" className="flex justify-between items-center w-full text-left cursor-pointer p-1.5 rounded hover:opacity-80 focus-visible:ring-2 outline-none" onClick={() => setShowQuickMateriau(true)}>
                      <span className={`text-xs ${textMuted} flex items-center gap-1.5`}><Package size={14} /> Matériaux</span>
                      <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutMateriaux)}</span>
                    </button>
                    <button type="button" className="flex justify-between items-center w-full text-left cursor-pointer p-1.5 rounded hover:opacity-80 focus-visible:ring-2 outline-none" onClick={() => setShowMODetail(true)}>
                      <span className={`text-xs ${textMuted} flex items-center gap-1.5`}><UserCog size={14} /> Main d'oeuvre ({bilan.heuresTotal}h)</span>
                      <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutMO)}</span>
                    </button>
                    {(bilan.coutAutres || 0) > 0 && (
                      <button type="button" className="flex justify-between items-center w-full text-left cursor-pointer p-1.5 rounded hover:opacity-80 focus-visible:ring-2 outline-none" onClick={() => setShowAjustement('DEPENSE')}>
                        <span className={`text-xs ${textMuted}`}>Autres frais</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutAutres)}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Objectifs */}
                {(ch.budget_materiaux > 0 || ch.heures_estimees > 0) && (
                  <>
                    <button onClick={() => toggleFin('objectifs')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                      <ChevronRight size={14} className={`transition-transform ${finExpanded.objectifs ? 'rotate-90' : ''} ${textMuted}`} />
                      <Target size={14} className="text-amber-500" />
                      <span className={`text-xs font-medium flex-1 ${textPrimary}`}>Objectifs vs Réel</span>
                    </button>
                    {finExpanded.objectifs && (
                      <div className={`ml-6 p-3 rounded-lg space-y-3 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                        {ch.budget_materiaux > 0 && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs ${textMuted}`}>Matériaux</span>
                              <span className={`text-xs font-medium ${bilan.coutMateriaux > ch.budget_materiaux ? 'text-red-500' : 'text-emerald-500'}`}>{formatMoney(bilan.coutMateriaux)} / {formatMoney(ch.budget_materiaux)}</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-white'}`}>
                              <div className={`h-full rounded-full ${bilan.coutMateriaux > ch.budget_materiaux ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (bilan.coutMateriaux / ch.budget_materiaux) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                        {ch.heures_estimees > 0 && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs ${textMuted}`}>Heures</span>
                              <span className={`text-xs font-medium ${bilan.heuresTotal > ch.heures_estimees ? 'text-red-500' : 'text-emerald-500'}`}>{bilan.heuresTotal}h / {ch.heures_estimees}h</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-white'}`}>
                              <div className={`h-full rounded-full ${bilan.heuresTotal > ch.heures_estimees ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (bilan.heuresTotal / ch.heures_estimees) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Projection */}
                {avancement > 0 && avancement < 100 && revenuTotal > 0 && (
                  <>
                    <button onClick={() => toggleFin('projection')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                      <ChevronRight size={14} className={`transition-transform ${finExpanded.projection ? 'rotate-90' : ''} ${textMuted}`} />
                      <BarChart3 size={14} style={{ color: couleur }} />
                      <span className={`text-xs font-medium flex-1 ${textPrimary}`}>Projection fin de chantier</span>
                    </button>
                    {finExpanded.projection && (
                      <div className={`ml-6 p-3 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <p className={`text-xs ${textMuted}`}>Dépenses est.</p>
                            <p className="font-bold text-sm text-red-500">{formatMoney(depensesFinalesEstimees)}</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xs ${textMuted}`}>Bénéfice</p>
                            <p className={`font-bold text-sm ${tauxMargeProjecte != null ? getMargeColor(tauxMargeProjecte) : textMuted}`}>{bilan.hasDepenses ? formatMoney(beneficeProjecte) : '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xs ${textMuted}`}>Marge</p>
                            <p className={`font-bold text-sm ${tauxMargeProjecte != null ? getMargeColor(tauxMargeProjecte) : textMuted}`}>{tauxMargeProjecte != null ? formatPct(tauxMargeProjecte) : '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* === SECTION: DÉTAILS DU CHANTIER === */}
        <div className="flex items-center gap-2 mt-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Détails du chantier</span>
        </div>
        {/* Onglets détail chantier */}
        <TabBar
          tabs={[
            { key: 'photos', label: 'Photos', icon: Camera, badge: (ch.photos || []).length > 0 ? (ch.photos || []).length : undefined },
            { key: 'finances', label: 'Finances', icon: Wallet },
            { key: 'situations', label: 'Situations', icon: Receipt },
            { key: 'messages', label: 'Messages', icon: MessageSquare, badge: (ch.messages || []).filter(m => !m.read).length > 0 ? (ch.messages || []).filter(m => !m.read).length : undefined },
            { key: 'documents', label: 'Documents', icon: Paperclip },
            { key: 'soustraitants', label: 'Sous-trait.', icon: UserCog },
            ...(chantierReception || ch.statut === 'termine' ? [{ key: 'garanties', label: 'Garanties', icon: Shield, badge: chantierGaranties.filter(g => g.statut === 'active').length > 0 ? chantierGaranties.filter(g => g.statut === 'active').length : undefined }] : []),
            { key: 'notes', label: 'Notes', icon: StickyNote },
            { key: 'rapports', label: 'Rapports', icon: FileText },
            { key: 'memos', label: 'Mémos', icon: ClipboardList },
            { key: 'journal', label: 'Journal', icon: Clock },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          maxVisible={6}
          isDark={isDark}
          couleur={couleur}
        />

        {activeTab === 'finances' && (
          <div role="tabpanel" id="panel-finances" aria-labelledby="tab-finances" className="space-y-4">
            {adjRevenus.length === 0 && adjDepenses.length === 0 && chDepenses.length === 0 && (
              <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
                <Wallet size={24} className={`mx-auto mb-3 ${textMuted}`} />
                <p className={`font-medium ${textPrimary}`}>Aucune donnée financière</p>
                <p className={`text-sm ${textMuted} mt-1`}>Ajoutez des revenus ou des dépenses pour suivre la rentabilité de ce chantier.</p>
              </div>
            )}
            {adjRevenus.length > 0 && (
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <h3 className="font-semibold mb-3 text-emerald-600"> Ajustements Revenus</h3>
                {adjRevenus.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-emerald-600">+{formatMoney(a.montant_ht)}</span><button onClick={() => handleDeleteAjustement(a.id)} aria-label="Supprimer l'ajustement" className="text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center">x</button></div></div>))}
              </div>
            )}
            {adjDepenses.length > 0 && (
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <h3 className="font-semibold mb-3 text-red-600"> Ajustements Dépenses</h3>
                {adjDepenses.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-red-600">-{formatMoney(a.montant_ht)}</span><button onClick={() => handleDeleteAjustement(a.id)} aria-label="Supprimer l'ajustement" className="text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center">x</button></div></div>))}
              </div>
            )}
            <div className={`${cardBg} rounded-2xl border p-5`}>
              <h3 className={`font-semibold mb-4 ${textPrimary}`}>Dépenses Matériaux</h3>
              <div className="space-y-2 mb-4">{chDepenses.map(d => (<div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><span className={`text-sm w-24 ${textMuted}`}>{new Date(d.date).toLocaleDateString('fr-FR')}</span><span className={`flex-1 ${textPrimary}`}>{d.description}</span><span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{d.categorie}</span><span className="font-bold text-red-500">{formatMoney(d.montant)}</span></div>))}{chDepenses.length === 0 && <p className={`text-center py-4 ${textMuted}`}>Aucune dépense</p>}</div>
              <div className="flex gap-2 flex-wrap">
                <select value={newDepense.catalogueId} onChange={e => { const item = catalogue?.find(c => c.id === e.target.value); if (item) setNewDepense(p => ({...p, catalogueId: e.target.value, description: item.nom, montant: item.prixAchat?.toString() || '' })); }} className={`px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} aria-label="Sélectionner un article du catalogue"><option value="">Catalogue...</option>{catalogue?.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prixAchat}€)</option>)}</select>
                <input placeholder="Ex: Carrelage, Peinture murale..." value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} className={`flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl ${inputBg}`} aria-label="Description de la dépense" />
                <input type="number" placeholder="€ HT" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} className={`w-28 px-4 py-2.5 border rounded-xl ${inputBg}`} aria-label="Montant HT en euros" />
                <button onClick={addDepenseToChantier} className="px-4 py-2.5 text-white rounded-xl min-h-[44px]" style={{background: couleur}}>+</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'situations' && (
          <SituationsTravaux
            chantier={ch}
            devis={devis.filter(d => d.chantier_id === ch.id)}
            updateChantier={updateChantier}
            addDevis={addDevis}
            generateNextNumero={generateNextNumero}
            clients={clients}
            entreprise={entreprise}
            modeDiscret={modeDiscret}
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            onClose={() => setActiveTab('finances')}
          />
        )}

        {activeTab === 'rapports' && (
          <RapportChantier
            chantier={ch}
            equipe={equipe}
            isDark={isDark}
            couleur={couleur}
            onClose={() => setActiveTab('finances')}
          />
        )}

        {activeTab === 'photos' && (
          <div role="tabpanel" id="panel-photos" aria-labelledby="tab-photos" className={`${cardBg} rounded-2xl border p-3 sm:p-5`}>
            {/* Header with bigger touch targets for photo buttons */}
            <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
              <div>
                <h3 className={`font-semibold ${textPrimary}`}>📸 Carnet Photos</h3>
                <p className={`text-xs ${textMuted} mt-1`}>Photos horodatées = preuves en cas de litige</p>
              </div>
            </div>

            {/* Photo capture buttons - Big touch targets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {PHOTO_CATS.map(cat => (
                <label
                  key={cat}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl cursor-pointer text-white font-medium min-h-[64px] transition-all active:scale-95"
                  style={{ background: cat === 'litige' ? '#ef4444' : cat === 'avant' ? '#3b82f6' : cat === 'après' ? '#22c55e' : couleur }}
                >
                  <Camera size={20} />
                  <span className="text-xs capitalize">+ {cat}</span>
                  <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoAdd(e, cat)} className="hidden" />
                </label>
              ))}
            </div>

            {/* Photos grid with timestamp badges */}
            {(!ch.photos || ch.photos.length === 0) ? (
              <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50 border border-solid border-slate-300'}`}>
                <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                  <Camera size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <p className={`font-semibold mb-1 ${textPrimary}`}>Documentez votre chantier</p>
                <p className={`text-sm mb-4 ${textMuted}`}>Les photos horodatées sont essentielles en cas de litige</p>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoAdd(e, 'travaux')} />
                  <span
                    className="inline-flex items-center gap-2 px-5 min-h-[48px] rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: couleur }}
                  >
                    <Camera size={18} /> Prendre une photo
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-5">
                {PHOTO_CATS.map(cat => {
                  const catPhotos = (ch.photos || []).filter(p => p.categorie === cat);
                  if (catPhotos.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2`}
                         style={{ color: cat === 'litige' ? '#ef4444' : cat === 'avant' ? '#3b82f6' : cat === 'après' ? '#22c55e' : couleur }}>
                        {cat === 'litige' && '⚠️'} {cat} ({catPhotos.length})
                      </p>
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {catPhotos.map(p => (
                          <button type="button" key={p.id} className="relative group cursor-pointer flex-shrink-0 focus-visible:ring-2 outline-none rounded-xl" onClick={() => setPhotoPreview(p)} aria-label={`Voir photo ${cat}`}>
                            <img src={p.src} className="w-28 h-28 object-cover rounded-xl hover:opacity-90 transition-opacity border-2"
                                 style={{ borderColor: cat === 'litige' ? '#ef4444' : cat === 'avant' ? '#3b82f6' : cat === 'après' ? '#22c55e' : `${couleur}40` }}
                                 alt={`Photo ${cat} du chantier - ${p.date ? new Date(p.date).toLocaleDateString('fr-FR') : ''}`} />
                            {/* Timestamp badge - Proof for litigation */}
                            <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 rounded-b-lg text-xs text-white font-medium ${
                              cat === 'litige' ? 'bg-red-600/90' : 'bg-black/70'
                            }`}>
                              {p.date ? new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                              {p.date && <span className="ml-1 opacity-75">{new Date(p.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            {/* Delete button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePhoto(p.id); }}
                              aria-label="Supprimer la photo"
                              className="absolute -top-2 -right-2 w-11 h-11 bg-red-500 text-white rounded-full text-xs sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center shadow-lg transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div role="tabpanel" id="panel-documents" aria-labelledby="tab-documents" className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><Paperclip size={18} style={{ color: couleur }} /> Documents</h3>
            <p className={`text-sm ${textMuted} mb-4`}>Plans, permis, attestations, contrats... Stockez tous vos documents liés au chantier.</p>

            {/* Document categories */}
            {(() => {
              const docs = ch.documents || [];
              const categories = ['Plan', 'Permis', 'Attestation', 'Contrat', 'Autre'];
              return (
                <>
                  {docs.length === 0 ? (
                    <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <FolderOpen size={24} className={`mx-auto mb-2 ${textMuted}`} />
                      <p className={textMuted}>Aucun document</p>
                      <p className={`text-xs ${textMuted} mt-1`}>Ajoutez vos plans, permis et attestations</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {docs.map(doc => (
                        <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                            <FileText size={18} style={{ color: couleur }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${textPrimary}`}>{doc.nom}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{doc.categorie}</span>
                              <span className={`text-xs ${textMuted}`}>{new Date(doc.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.data && (
                              <a href={doc.data} download={doc.nom} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Télécharger">
                                <Download size={16} className={textMuted} />
                              </a>
                            )}
                            <button onClick={() => updateChantier(ch.id, { documents: docs.filter(d => d.id !== doc.id) })} className={`p-2 rounded-lg text-red-400 hover:text-red-600 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`} title="Supprimer">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add document form */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[150px]">
                        <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Nom du document</label>
                        <input
                          id="doc-name-input"
                          type="text"
                          placeholder="Ex: Plan RDC, Permis de construire..."
                          className={`w-full px-3 py-2 border rounded-xl text-sm ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Catégorie</label>
                        <select id="doc-cat-select" className={`px-3 py-2 border rounded-xl text-sm ${inputBg}`}>
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Fichier</label>
                        <input
                          id="doc-file-input"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                          className={`text-sm ${textMuted} file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:cursor-pointer`}
                          style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const nameInput = document.getElementById('doc-name-input');
                          const catSelect = document.getElementById('doc-cat-select');
                          const fileInput = document.getElementById('doc-file-input');
                          const nom = nameInput?.value?.trim();
                          if (!nom) { showToast('Nom du document requis', 'error'); return; }
                          const file = fileInput?.files?.[0];
                          const addDoc = (data) => {
                            updateChantier(ch.id, {
                              documents: [...(ch.documents || []), {
                                id: generateId(),
                                nom,
                                categorie: catSelect?.value || 'Autre',
                                date: new Date().toISOString(),
                                data: data || null,
                                fileName: file?.name || null,
                                fileSize: file?.size || null
                              }]
                            });
                            nameInput.value = '';
                            if (fileInput) fileInput.value = '';
                            showToast('Document ajouté', 'success');
                          };
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) { showToast('Fichier trop volumineux (5 Mo max)', 'error'); return; }
                            const reader = new FileReader();
                            reader.onload = () => addDoc(reader.result);
                            reader.readAsDataURL(file);
                          } else {
                            addDoc(null);
                          }
                        }}
                        className="px-4 py-2 text-white rounded-xl text-sm flex items-center gap-2 min-h-[44px]"
                        style={{ background: couleur }}
                      >
                        <Plus size={14} /> Ajouter
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'notes' && (
          <div role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><StickyNote size={18} /> Notes</h3>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={6} value={ch.notes || ''} onChange={e => updateChantier(ch.id, { notes: e.target.value })} placeholder="Contraintes d'accès, contacts sur site, détails importants..." />
          </div>
        )}

        {activeTab === 'soustraitants' && (
          <div role="tabpanel" id="panel-soustraitants" aria-labelledby="tab-soustraitants" className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><UserCog size={18} style={{ color: couleur }} /> Sous-traitants du chantier</h3>
            <p className={`text-sm ${textMuted} mb-4`}>Gérez les sous-traitants affectés à ce chantier, suivez leurs interventions et montants.</p>

            {/* Sous-traitants affectés */}
            {(() => {
              // Check equipe for sous-traitants assigned to this chantier
              const stEquipe = (equipe || []).filter(m => m.type === 'sous_traitant');
              // Also check ch.soustraitants if it exists
              const stDirect = ch.soustraitants || [];
              const allSt = stEquipe.length > 0 ? stEquipe : stDirect;

              if (allSt.length === 0) {
                return (
                  <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <UserCog size={24} className={`mx-auto mb-2 ${textMuted}`} />
                    <p className={`${textMuted} mb-1`}>Aucun sous-traitant affecté</p>
                    <p className={`text-xs ${textMuted}`}>Affectez des sous-traitants depuis le module Sous-traitants.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {allSt.map((st, idx) => {
                    const stName = st.entreprise || st.nom || st.name || 'Sous-traitant';
                    const stRole = st.role_sur_chantier || st.specialite || st.metier || '';
                    const stStatut = st.statut || 'actif';
                    const noteQualite = st.noteQualite || st.note_moyenne || 0;
                    return (
                      <div key={st.id || idx} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: couleur }}>
                              {stName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium text-sm ${textPrimary}`}>{stName}</p>
                              {stRole && <p className={`text-xs ${textMuted}`}>{stRole}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {noteQualite > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500 text-xs">★</span>
                                <span className={`text-xs font-medium ${textMuted}`}>{Number(noteQualite).toFixed(1)}</span>
                              </div>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              stStatut === 'actif' ? 'bg-green-100 text-green-700' :
                              stStatut === 'favori' ? 'bg-yellow-100 text-yellow-700' :
                              stStatut === 'bloque' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {stStatut === 'actif' ? 'Actif' : stStatut === 'favori' ? 'Favori' : stStatut === 'bloque' ? 'Bloqué' : stStatut}
                            </span>
                          </div>
                        </div>
                        {(st.montant_prevu || st.telephone || st.phone) && (
                          <div className={`mt-3 pt-3 border-t flex items-center gap-4 text-xs ${isDark ? 'border-slate-600' : 'border-slate-200'} ${textMuted}`}>
                            {(st.telephone || st.phone) && (
                              <span className="flex items-center gap-1"><Phone size={14} /> {st.telephone || st.phone}</span>
                            )}
                            {st.montant_prevu && (
                              <span className="flex items-center gap-1"><DollarSign size={14} /> {Number(st.montant_prevu).toLocaleString('fr-FR')} €</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'garanties' && (
          <div role="tabpanel" id="panel-garanties" aria-labelledby="tab-garanties">
            <ChantierGarantiesTab
              chantier={ch}
              reception={chantierReception}
              garanties={chantierGaranties}
              interventions={chantierInterventions}
              onReceptionner={() => setShowReceptionForm(true)}
              onSignalerDesordre={(garantie) => setShowInterventionForm(garantie)}
              onUpdateReserve={async (reserveId, data) => {
                try {
                  await updateReserveService(reserveId, data);
                  const updated = await getReception(view);
                  setChantierReception(updated);
                  showToast('Réserve mise à jour', 'success');
                } catch (e) { showToast('Erreur mise à jour réserve', 'error'); }
              }}
              onLeverToutesReserves={async () => {
                if (!chantierReception?.id) return;
                try {
                  await leverToutesReserves(chantierReception.id);
                  const updated = await getReception(view);
                  setChantierReception(updated);
                  showToast('Toutes les réserves ont été levées ✅', 'success');
                } catch (e) { showToast('Erreur levée des réserves', 'error'); }
              }}
              isDark={isDark}
              couleur={couleur}
              modeDiscret={modeDiscret}
            />
          </div>
        )}

        {/* Réception Modal */}
        {showReceptionForm && (
          <ReceptionForm
            chantier={ch}
            onSubmit={async (data) => {
              try {
                await createReception(null, { ...data, chantierId: ch.id, userId: null, orgId: null });
                if (ch.statut === 'en_cours') {
                  updateChantier(ch.id, { statut: 'termine', date_fin: data.dateReception });
                  triggerPostChantierSequence(ch);
                }
                const [reception, garanties, interventions] = await Promise.all([
                  getReception(ch.id),
                  getGarantiesByChantier(ch.id),
                  getInterventionsByChantier(ch.id),
                ]);
                setChantierReception(reception);
                setChantierGaranties(garanties || []);
                setChantierInterventions(interventions || []);
                setShowReceptionForm(false);
                setActiveTab('garanties');
                showToast('Réception validée — 3 garanties créées ✅', 'success');
              } catch (e) {
                showToast('Erreur lors de la réception', 'error');
              }
            }}
            onClose={() => setShowReceptionForm(false)}
            isDark={isDark}
            couleur={couleur}
          />
        )}

        {/* Intervention Modal */}
        {showInterventionForm && (
          <InterventionForm
            garantie={showInterventionForm}
            chantier={ch}
            onSubmit={async (data) => {
              try {
                await createIntervention(null, { ...data, chantierId: ch.id, userId: null, orgId: null });
                const interventions = await getInterventionsByChantier(ch.id);
                setChantierInterventions(interventions || []);
                setShowInterventionForm(null);
                showToast('Désordre signalé ✅', 'success');
              } catch (e) {
                showToast('Erreur lors du signalement', 'error');
              }
            }}
            onClose={() => setShowInterventionForm(null)}
            isDark={isDark}
            couleur={couleur}
          />
        )}

        {activeTab === 'memos' && (
          <div role="tabpanel" id="panel-memos" aria-labelledby="tab-memos" className={`${cardBg} rounded-2xl border p-3 sm:p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><ClipboardList size={18} style={{ color: couleur }} /> Mémos</h3>
            {(() => {
              const chantierMemos = memos.filter(m => m.chantier_id === ch.id);
              const activeMemos = chantierMemos.filter(m => !m.is_done);
              const doneMemos = chantierMemos.filter(m => m.is_done);
              return (
                <div className="space-y-3">
                  {/* Quick add */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id={`memo-chantier-${ch.id}`}
                      placeholder="Nouveau mémo pour ce chantier..."
                      className={`flex-1 px-3 py-2 border rounded-xl text-sm ${inputBg}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          addMemo?.({ text: e.target.value.trim(), chantier_id: ch.id, client_id: ch.client_id || null });
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`memo-chantier-${ch.id}`);
                        if (input?.value.trim()) {
                          addMemo?.({ text: input.value.trim(), chantier_id: ch.id, client_id: ch.client_id || null });
                          input.value = '';
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-white text-sm font-medium"
                      style={{ backgroundColor: couleur }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Active memos */}
                  {activeMemos.length > 0 && (
                    <div className="space-y-1">
                      {activeMemos.map(m => (
                        <div key={m.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <button
                            onClick={() => toggleMemo?.(m.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 ${isDark ? 'border-slate-500' : 'border-slate-300'}`}
                            aria-label="Marquer comme fait"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${textPrimary}`}>{m.text}</p>
                            {m.due_date && (
                              <span className={`text-xs ${m.due_date < new Date().toISOString().split('T')[0] ? 'text-red-500' : textMuted}`}>
                                {new Date(m.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Done memos */}
                  {doneMemos.length > 0 && (
                    <details className={`text-sm ${textMuted}`}>
                      <summary className="cursor-pointer py-1 font-medium">Terminés ({doneMemos.length})</summary>
                      <div className="space-y-1 mt-1">
                        {doneMemos.map(m => (
                          <div key={m.id} className="flex items-center gap-2.5 px-3 py-1.5 opacity-60">
                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                            <span className="line-through text-sm">{m.text}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {chantierMemos.length === 0 && (
                    <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <ClipboardList size={24} className={`mx-auto mb-2 ${textMuted}`} />
                      <p className={textMuted}>Aucun mémo pour ce chantier</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'journal' && (
          <div role="tabpanel" id="panel-journal" aria-labelledby="tab-journal" className={`${cardBg} rounded-2xl border`}>
            <ChantierJournal
              chantierId={ch.id}
              isDark={isDark}
              couleur={couleur}
              modeDiscret={modeDiscret}
            />
          </div>
        )}

        {activeTab === 'messages' && (
          <div role="tabpanel" id="panel-messages" aria-labelledby="tab-messages" className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><MessageSquare size={18} style={{ color: couleur }} /> Historique des échanges</h3>
            <p className={`text-sm ${textMuted} mb-4`}>Centralisez ici tous vos échanges avec le client (emails, SMS, appels...).</p>

            {/* Existing messages */}
            <div className="space-y-3 mb-4">
              {(!ch.messages || ch.messages.length === 0) ? (
                <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <MessageSquare size={24} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={textMuted}>Aucun échange enregistré</p>
                </div>
              ) : (
                ch.messages.map(msg => (
                  <div key={msg.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${msg.type === 'email' ? 'bg-blue-100 text-blue-700' : msg.type === 'sms' ? 'bg-green-100 text-green-700' : msg.type === 'appel' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>{msg.type === 'email' ? 'Email' : msg.type === 'sms' ? 'SMS' : msg.type === 'appel' ? 'Appel' : 'Note'}</span>
                      <span className={`text-xs ${textMuted}`}>{new Date(msg.date).toLocaleDateString('fr-FR')} - {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => updateChantier(ch.id, { messages: ch.messages.filter(m => m.id !== msg.id) })} aria-label="Supprimer le message" className={`ml-auto p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center text-red-400 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-slate-900' : ''}`}><X size={16} /></button>
                    </div>
                    <p className={`text-sm ${textPrimary}`}>{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add new message */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex gap-2 mb-3">
                {['email', 'sms', 'appel', 'note'].map(type => (
                  <button key={type} onClick={() => setNewMessage && setNewMessage(p => ({ ...p, type }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${(newMessage?.type || 'email') === type ? 'text-white' : isDark ? 'bg-slate-600 text-slate-300' : 'bg-white text-slate-600'}`} style={(newMessage?.type || 'email') === type ? { background: couleur } : {}}>
                    {type === 'email' ? 'Email' : type === 'sms' ? 'SMS' : type === 'appel' ? 'Appel' : 'Note'}
                  </button>
                ))}
              </div>
              <textarea className={`w-full px-3 py-2 border rounded-xl text-sm ${inputBg}`} rows={2} placeholder="Résumer l'échange avec le client..." value={newMessage?.content || ''} onChange={e => setNewMessage && setNewMessage(p => ({ ...p, content: e.target.value }))} />
              <button onClick={() => {
                if (!newMessage?.content) return;
                const msg = { id: generateId(), type: newMessage.type || 'email', content: newMessage.content, date: new Date().toISOString() };
                updateChantier(ch.id, { messages: [...(ch.messages || []), msg] });
                setNewMessage && setNewMessage({ type: 'email', content: '' });
              }} className="mt-2 px-4 py-2 text-white rounded-xl text-sm flex items-center gap-2" style={{ background: couleur }}>
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Photo Preview Modal - Enhanced for litigation proof */}
        {photoPreview && (
          <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4" onClick={() => setPhotoPreview(null)}>
            {/* Top bar with chantier info */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
              <div className="flex items-start justify-between max-w-4xl mx-auto">
                <div className="text-white">
                  <p className="font-bold text-lg">{ch.nom}</p>
                  <p className="text-sm opacity-75">{ch.adresse || 'Adresse non renseignée'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={photoPreview.src}
                    download={`${ch.nom?.replace(/\s+/g, '_')}_${photoPreview.categorie}_${photoPreview.date ? new Date(photoPreview.date).toISOString().split('T')[0] : 'photo'}.jpg`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-white p-3 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 min-h-[48px]"
                    title="Télécharger"
                  >
                    <Download size={22} />
                  </a>
                  <button onClick={() => setPhotoPreview(null)} className="text-white p-3 hover:bg-white/20 rounded-xl transition-colors min-h-[48px]">
                    <X size={22} />
                  </button>
                </div>
              </div>
            </div>

            {/* Photo */}
            <img src={photoPreview.src} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" alt={`Photo du chantier en plein écran`} onClick={(e) => e.stopPropagation()} />

            {/* Bottom bar - Timestamp proof for litigation */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-10">
              <div className="max-w-4xl mx-auto">
                {/* Category badge */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className={`px-4 py-2 rounded-lg font-bold text-sm uppercase ${
                    photoPreview.categorie === 'litige'
                      ? 'bg-red-500 text-white'
                      : photoPreview.categorie === 'avant'
                      ? 'bg-blue-500 text-white'
                      : photoPreview.categorie === 'après'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    {photoPreview.categorie === 'litige' && '⚠️ '}{photoPreview.categorie}
                  </span>
                </div>

                {/* Timestamp - Large and clear for proof */}
                <div className="text-center text-white">
                  <p className="text-2xl font-bold tracking-wide">
                    {photoPreview.date ? new Date(photoPreview.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Date non disponible'}
                  </p>
                  <p className="text-lg opacity-90 mt-1">
                    {photoPreview.date ? new Date(photoPreview.date).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : ''}
                  </p>
                </div>

                {/* Proof notice */}
                <p className="text-center text-white/60 text-xs mt-3 flex items-center justify-center gap-1">
                  <Clock size={14} /> Photo horodatée - Valeur de preuve en cas de litige
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajustement */}
        {showAjustement && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>{showAjustement === 'REVENU' ? ' Ajustement Revenu' : ' Ajustement Dépense'}</h3>
              <p className="text-sm text-slate-500 mb-4">{showAjustement === 'REVENU' ? 'Ex: Travaux supplémentaires acceptés' : 'Ex: Achat imprévu, sous-traitance...'}</p>
              <div className="space-y-4">
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Travaux supplémentaires, Remise..." value={adjForm.libelle} onChange={e => setAdjForm(p => ({...p, libelle: e.target.value}))} />
                <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Montant € HT" value={adjForm.montant_ht} onChange={e => setAdjForm(p => ({...p, montant_ht: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowAjustement(null); setAdjForm({ libelle: '', montant_ht: '' }); }} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={handleAddAjustement} className={`px-4 py-2 text-white rounded-xl ${showAjustement === 'REVENU' ? 'bg-emerald-500' : 'bg-red-500'}`}>Ajouter</button></div>
            </div>
          </div>
        )}

        {/* Modal Ajouter une dépense / Besoin de matériel */}
        {showQuickMateriau && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowQuickMateriau(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>📦 Besoin de matériel</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Enregistrez un achat ou signalez un besoin urgent</p>

              {/* Quick picks - Missing materials from devis */}
              {(() => {
                const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
                const plannedItems = devisLie?.lignes || [];
                const chDepenses = depenses.filter(d => d.chantierId === ch.id);
                const missingItems = plannedItems.filter(item =>
                  !chDepenses.some(d => d.description.toLowerCase().includes(item.description.toLowerCase().split(' ')[0]))
                ).slice(0, 4);

                if (missingItems.length === 0) return null;

                return (
                  <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      ⚠️ Matériaux prévus non achetés
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setNewDepense(p => ({ ...p, description: item.description, montant: item.prixUnitaire ? (item.prixUnitaire * (item.quantite || 1)).toString() : '' }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 min-h-[44px] ${
                            isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                          }`}
                        >
                          {item.description}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Sélection depuis catalogue */}
              {catalogue && catalogue.length > 0 && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Depuis le catalogue</label>
                  <select
                    className={`w-full px-4 py-3 border rounded-xl min-h-[48px] ${inputBg}`}
                    value={newDepense.catalogueId}
                    onChange={e => {
                      const item = catalogue.find(c => c.id === e.target.value);
                      if (item) {
                        const prix = item.prixAchat || item.prix || 0;
                        setNewDepense(p => ({
                          ...p,
                          catalogueId: e.target.value,
                          description: item.nom,
                          prixUnitaire: prix.toString(),
                          montant: (prix * (p.quantite || 1)).toString()
                        }));
                      }
                    }}
                  >
                    <option value="">Choisir un article...</option>
                    {catalogue.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prixAchat || c.prix}€/{c.unite || 'unité'})</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Description *</label>
                  <input className={`w-full px-4 py-3 border rounded-xl min-h-[48px] text-base ${inputBg}`} placeholder="Ex: Sac de ciment 35kg" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} />
                </div>

                {/* Quantité et prix unitaire */}
                {newDepense.catalogueId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Quantité</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const qty = Math.max(1, (parseInt(newDepense.quantite) || 1) - 1);
                            const prix = parseFloat(newDepense.prixUnitaire) || 0;
                            setNewDepense(p => ({...p, quantite: qty, montant: (prix * qty).toString()}));
                          }}
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >-</button>
                        <input
                          type="number"
                          min="1"
                          className={`flex-1 px-3 py-3 border rounded-xl text-center text-lg font-semibold ${inputBg}`}
                          value={newDepense.quantite}
                          onChange={e => {
                            const qty = parseInt(e.target.value) || 1;
                            const prix = parseFloat(newDepense.prixUnitaire) || 0;
                            setNewDepense(p => ({...p, quantite: qty, montant: (prix * qty).toString()}));
                          }}
                        />
                        <button
                          onClick={() => {
                            const qty = (parseInt(newDepense.quantite) || 1) + 1;
                            const prix = parseFloat(newDepense.prixUnitaire) || 0;
                            setNewDepense(p => ({...p, quantite: qty, montant: (prix * qty).toString()}));
                          }}
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >+</button>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Prix unitaire</label>
                      <div className="relative">
                        <input
                          type="number"
                          className={`w-full px-4 py-3 border rounded-xl min-h-[48px] ${inputBg}`}
                          value={newDepense.prixUnitaire}
                          onChange={e => {
                            const prix = parseFloat(e.target.value) || 0;
                            const qty = parseInt(newDepense.quantite) || 1;
                            setNewDepense(p => ({...p, prixUnitaire: e.target.value, montant: (prix * qty).toString()}));
                          }}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}>€</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Montant total TTC *</label>
                  <div className="relative">
                    <input type="number" className={`w-full px-4 py-3 border rounded-xl min-h-[48px] text-lg font-semibold ${inputBg}`} placeholder="Ex: 150" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}>€</span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Catégorie</label>
                  <select className={`w-full px-4 py-3 border rounded-xl min-h-[48px] ${inputBg}`} value={newDepense.categorie} onChange={e => setNewDepense(p => ({...p, categorie: e.target.value}))}>
                    <option value="Matériaux">Matériaux</option>
                    <option value="Outillage">Outillage</option>
                    <option value="Location">Location</option>
                    <option value="Sous-traitance">Sous-traitance</option>
                    <option value="Transport">Transport</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Action buttons - Big touch targets */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowQuickMateriau(false); setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' }); }}
                  className={`flex-1 px-4 py-3 rounded-xl min-h-[52px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={addDepenseToChantier}
                  disabled={!newDepense.description || !newDepense.montant}
                  className="flex-1 px-4 py-3 text-white rounded-xl disabled:opacity-50 min-h-[52px] font-semibold"
                  style={{background: couleur}}
                >
                  ✓ Acheté
                </button>
              </div>

              {/* Urgent request button */}
              <button
                onClick={() => {
                  if (!newDepense.description) {
                    showToast?.('Entrez une description', 'error');
                    return;
                  }
                  // Simulate urgent notification (in real app would send push/SMS)
                  showToast?.(`🚨 Demande urgente envoyée: ${newDepense.description}`, 'success');
                  setShowQuickMateriau(false);
                  setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' });
                }}
                disabled={!newDepense.description}
                className={`w-full mt-3 px-4 py-3 rounded-xl min-h-[52px] font-semibold border-2 transition-all disabled:opacity-50 ${
                  isDark
                    ? 'bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50'
                    : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                }`}
              >
                🚨 Besoin urgent (notifier le patron)
              </button>
            </div>
          </div>
        )}

        {/* Modal MO */}
        {showMODetail && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-lg animate-slide-up sm:animate-fade-in max-h-[85vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">⏱ Détail Main d'oeuvre</h3><button onClick={() => setShowAddMO(true)} className="px-3 py-1.5 text-sm text-white rounded-lg" style={{background: couleur}}>+ Heures</button></div>
              <div className="space-y-2 mb-4">{chPointages.map(p => { const emp = equipe.find(e => e.id === p.employeId); const cout = emp?.coutHoraireCharge || 28; return (
                <div key={p.id} className={`p-3 rounded-xl ${p.manuel ? 'bg-blue-50' : 'bg-slate-50'} ${p.verrouille ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span>{p.approuve ? '[OK]' : '⏳'}</span>{p.manuel && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Manuel</span>}{p.verrouille && <span className="text-xs bg-slate-400 text-white px-2 py-0.5 rounded"></span>}</div>{!p.verrouille && <button onClick={() => deletePointage(p.id)} aria-label="Supprimer le pointage" className="text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"></button>}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm"><div><p className="text-xs text-slate-500">Date</p><input type="date" value={p.date} onChange={e => handleEditPointage(p.id, 'date', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded text-xs" /></div><div><p className="text-xs text-slate-500">Employé</p><p className="font-medium">{emp?.nom}</p></div><div><p className="text-xs text-slate-500">Heures</p><input type="number" step="0.5" value={p.heures} onChange={e => handleEditPointage(p.id, 'heures', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded" /></div><div><p className="text-xs text-slate-500">Coût</p><p className="font-bold text-blue-600">{formatMoney(p.heures * cout)}</p></div></div>
                </div>
              ); })}{chPointages.length === 0 && <p className={`text-center py-4 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Aucun pointage</p>}</div>
              <div className="border-t pt-4 flex justify-between items-center"><span className="font-semibold">Total</span><span className="text-xl font-bold text-blue-600">{formatMoney(bilan.coutMO)}</span></div>
              <button onClick={() => setShowMODetail(false)} className={`w-full mt-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Fermer</button>
            </div>
          </div>
        )}

        {/* Modal Ajout MO */}
        {showAddMO && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>+ Ajouter des heures</h3>
              <div className="space-y-4">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.employeId} onChange={e => setMoForm(p => ({...p, employeId: e.target.value}))} aria-label="Sélectionner un employé"><option value="">Employé *</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select>
                <div className="grid grid-cols-2 gap-4"><input type="date" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.date} onChange={e => setMoForm(p => ({...p, date: e.target.value}))} aria-label="Date du pointage" /><input type="number" step="0.5" placeholder="Nb heures *" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.heures} onChange={e => setMoForm(p => ({...p, heures: e.target.value}))} aria-label="Nombre d'heures" /></div>
                <input placeholder="Ex: Pose carrelage salle de bain..." className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.note} onChange={e => setMoForm(p => ({...p, note: e.target.value}))} aria-label="Note ou description du travail" />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowAddMO(false)} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={handleAddMO} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button></div>
            </div>
          </div>
        )}

        {/* Modal Edit Budget */}
        {showEditBudget && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowEditBudget(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Modifier le budget</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Définissez le budget prévisionnel HT pour ce chantier.</p>
              {devisLie && (
                <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    Ce chantier est lié au devis <strong>{devisLie.numero}</strong> ({formatMoney(devisHT)}).
                    Le budget du devis sera utilisé par défaut.
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Budget estimé HT</label>
                  <div className="relative">
                    <DollarSign size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                      type="number"
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-xl ${inputBg}`}
                      placeholder="Ex: 15000"
                      value={budgetForm.budget_estime}
                      onChange={e => setBudgetForm({ budget_estime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditBudget(false)} className={`flex-1 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                <button
                  onClick={() => {
                    updateChantier(ch.id, { budget_estime: budgetForm.budget_estime ? parseFloat(budgetForm.budget_estime) : undefined });
                    setShowEditBudget(false);
                  }}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl"
                  style={{ background: couleur }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Templates Modal */}
        {showTaskTemplates && (() => {
          const metierTemplates = getTaskTemplatesForMetier(entreprise?.metier);
          const existingTexts = (ch.taches || []).map(t => t.text.toLowerCase());

          const addTasksFromTemplate = (tasks) => {
            const newTasks = tasks
              .filter(t => !existingTexts.includes(t.text.toLowerCase()))
              .map(t => ({ id: generateId(), text: t.text, done: false, phase: t.phase, source: 'template' }));
            if (newTasks.length > 0) {
              updateChantier(ch.id, { taches: [...(ch.taches || []), ...newTasks] });
              showToast({ type: 'success', message: `${newTasks.length} taches ajoutees` });
            }
            setShowTaskTemplates(false);
          };

          return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowTaskTemplates(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                      <Sparkles size={20} style={{ color: couleur }} />
                    </div>
                    <div>
                      <h3 className={`font-bold ${textPrimary}`}>Modèles de tâches</h3>
                      <p className={`text-sm ${textMuted}`}>{metierTemplates.label}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowTaskTemplates(false)} aria-label="Fermer" className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                    <X size={20} className={textMuted} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[60vh]">
                {/* Quick Tasks */}
                <div className="mb-6">
                  <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${textMuted}`}>Tâches rapides</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TASKS.map(qt => (
                      <button
                        key={qt.text}
                        onClick={() => {
                          if (!existingTexts.includes(qt.text.toLowerCase())) {
                            updateChantier(ch.id, { taches: [...(ch.taches || []), { id: generateId(), text: qt.text, done: false }] });
                          }
                        }}
                        disabled={existingTexts.includes(qt.text.toLowerCase())}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          existingTexts.includes(qt.text.toLowerCase())
                            ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-400'
                            : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        + {qt.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Templates */}
                {Object.keys(metierTemplates.projects).length > 0 && (
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${textMuted}`}>Par type de projet</p>
                    <div className="space-y-3">
                      {Object.entries(metierTemplates.projects).map(([key, tasks]) => (
                        <div key={key} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium capitalize ${textPrimary}`}>{key.replace(/-/g, ' ')}</span>
                            <button
                              onClick={() => addTasksFromTemplate(tasks)}
                              className="px-3 py-1.5 text-white rounded-lg text-sm"
                              style={{ background: couleur }}
                            >
                              Ajouter tout ({tasks.length})
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tasks.slice(0, 5).map((t, i) => (
                              <span key={i} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-white text-slate-600'}`}>
                                {t.text.length > 20 ? t.text.substring(0, 20) + '...' : t.text}
                              </span>
                            ))}
                            {tasks.length > 5 && (
                              <span className={`text-xs px-2 py-1 ${textMuted}`}>+{tasks.length - 5} autres</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phases */}
                {metierTemplates.phases?.length > 0 && (
                  <div className="mt-6">
                    <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${textMuted}`}>Phases typiques</p>
                    <div className="flex flex-wrap gap-2">
                      {metierTemplates.phases.map((phase, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (!existingTexts.includes(phase.toLowerCase())) {
                              updateChantier(ch.id, { taches: [...(ch.taches || []), { id: generateId(), text: `Phase: ${phase}`, done: false }] });
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-sm border-2 border-solid ${isDark ? 'border-slate-600 hover:border-slate-500 text-slate-300' : 'border-slate-300 hover:border-slate-400 text-slate-600'}`}
                        >
                          {i + 1}. {phase}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <button
                  onClick={() => setShowTaskTemplates(false)}
                  className={`w-full py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
          );
        })()}

      {/* Task Generator Modal - dans la vue détaillée */}
      <TaskGeneratorModal
        isOpen={showTaskGenerator}
        onClose={() => setShowTaskGenerator(false)}
        onGenerateTasks={(newTasks) => {
          if (ch) {
            const existingTasks = ch.taches || [];
            updateChantier(view, {
              taches: [...existingTasks, ...newTasks]
            });
            showToast?.(`${newTasks.length} tâche${newTasks.length > 1 ? 's' : ''} ajoutée${newTasks.length > 1 ? 's' : ''}`, 'success');
          }
        }}
        existingTasks={ch.taches || []}
        entrepriseMetier={entreprise?.metier}
        devisLignes={devis.find(d => d.chantier_id === view)?.lignes}
        isDark={isDark}
        couleur={couleur}
      />

      {/* === FAB FLOTTANT CONTEXTUEL CHANTIER === */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
          onClick={() => setFabOpen(false)}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Sub-buttons */}
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); setShowAddMO(true); }}
              className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full text-white shadow-lg transition-all hover:shadow-xl"
              style={{ background: couleur, animationDelay: '0ms' }}
            >
              <Clock size={18} />
              <span className="font-medium text-sm whitespace-nowrap">Pointer</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); setShowQuickMateriau(true); }}
              className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full text-white shadow-lg transition-all hover:shadow-xl bg-red-500"
              style={{ animationDelay: '50ms' }}
            >
              <Coins size={18} />
              <span className="font-medium text-sm whitespace-nowrap">Dépense</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); document.getElementById(`photo-quick-${ch.id}`)?.click(); }}
              className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full text-white shadow-lg transition-all hover:shadow-xl bg-blue-500"
              style={{ animationDelay: '100ms' }}
            >
              <Camera size={18} />
              <span className="font-medium text-sm whitespace-nowrap">Photo</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); setActiveTab('notes'); }}
              className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full text-white shadow-lg transition-all hover:shadow-xl bg-purple-500"
              style={{ animationDelay: '150ms' }}
            >
              <StickyNote size={18} />
              <span className="font-medium text-sm whitespace-nowrap">Mémo</span>
            </button>
            {onPlanEvent && (
              <button
                onClick={() => { setFabOpen(false); onPlanEvent({ type: 'rdv', title: `Intervention ${ch.nom}`, clientId: ch.client_id || ch.clientId || '', description: ch.adresse || '', date: new Date().toISOString().split('T')[0] }); }}
                className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full text-white shadow-lg transition-all hover:shadow-xl bg-green-500"
                style={{ animationDelay: '200ms' }}
              >
                <CalendarPlus size={18} />
                <span className="font-medium text-sm whitespace-nowrap">Planifier</span>
              </button>
            )}
          </>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:shadow-xl hover:brightness-110 ${fabOpen ? 'rotate-45' : ''}`}
          style={{ background: couleur }}
          aria-label={fabOpen ? 'Fermer' : 'Actions rapides'}
        >
          {fabOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </button>
      </div>

      {/* Edit Chantier Modal — must be inside detail view for immediate update */}
      <QuickChantierModal
        isOpen={!!editingChantier}
        onClose={() => setEditingChantier(null)}
        onSubmit={handleEditChantier}
        clients={clients}
        devis={devis}
        isDark={isDark}
        couleur={couleur}
        editChantier={editingChantier}
      />
      </div>
    );
  }

  // Handle chantier creation from modal
  const handleCreateChantier = async (formData) => {
    // C2: Validate chantier name
    const RESERVED_WORDS = ['test', 'essai', 'demo', 'tmp', 'aaa', 'xxx', 'azerty', 'qwerty'];
    const trimmedName = (formData.nom || '').trim();
    if (trimmedName.length < 5) {
      showToast('Le nom du chantier doit contenir au moins 5 caractères', 'error');
      return;
    }
    if (RESERVED_WORDS.some(w => trimmedName.toLowerCase() === w)) {
      showToast('Nom de chantier non valide pour la production (mot réservé)', 'error');
      return;
    }

    // Duplicate detection
    const duplicate = chantiers.some(c =>
      c.nom?.toLowerCase().trim() === trimmedName.toLowerCase() &&
      (c.client_id || '') === (formData.client_id || formData.clientId || '') &&
      (c.adresse || '').toLowerCase().trim() === (formData.adresse || '').toLowerCase().trim()
    );
    if (duplicate && !await confirm({
      title: 'Chantier similaire',
      message: 'Un chantier similaire existe déjà (même nom, client et adresse). Créer quand même ?',
      confirmText: 'Créer quand même',
      cancelText: 'Annuler',
    })) {
      return;
    }

    const clientIdValue = formData.clientId || formData.client_id || '';
    const budgetValue = formData.budget_estime || formData.budgetPrevu || 0;
    const newChantier = addChantier({
      ...formData,
      client_id: clientIdValue,
      clientId: clientIdValue,
      dateDebut: formData.dateDebut || formData.date_debut || new Date().toISOString().split('T')[0],
      date_debut: formData.date_debut || formData.dateDebut || new Date().toISOString().split('T')[0],
      dateFin: formData.dateFin || formData.date_fin || null,
      date_fin: formData.date_fin || formData.dateFin || null,
      budgetPrevu: budgetValue,
      budget_estime: budgetValue,
      budget_materiaux: formData.budget_materiaux || 0,
      heures_estimees: formData.heures_estimees || 0,
      statut: 'prospect'
    });
    setShow(false);
    showToast(`Chantier "${formData.nom}" créé`, 'success');
    if (newChantier?.id) setView(newChantier.id);
  };

  // Helper: get Monday-Sunday of current week
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday, mondayStr: monday.toISOString().split('T')[0], sundayStr: sunday.toISOString().split('T')[0] };
  };

  // Helper: does a chantier overlap the current week?
  const chantierOverlapsWeek = (c) => {
    const { mondayStr, sundayStr } = getCurrentWeekRange();
    const debut = c.date_debut ? c.date_debut.split('T')[0] : null;
    const fin = c.date_fin ? c.date_fin.split('T')[0] : null;
    // No dates = include if en_cours
    if (!debut && !fin) return c.statut === 'en_cours';
    // Has debut but no fin: overlaps if debut <= sunday
    if (debut && !fin) return debut <= sundayStr;
    // Has fin but no debut: overlaps if fin >= monday
    if (!debut && fin) return fin >= mondayStr;
    // Both: classic overlap check
    return debut <= sundayStr && fin >= mondayStr;
  };

  // Helper: detect draft/test chantiers (incomplete data or test names)
  const isDraftChantier = (ch) => {
    const testNames = ['test', 'test1', 'test2', 'test3', 'essai', 'brouillon', 'zzz'];
    const nom = (ch.nom || '').toLowerCase().trim();
    if (testNames.includes(nom)) return true;
    // Chantier with no substantial data
    const hasNoData = !ch.adresse && !ch.budget_estime && !ch.budgetPrevu && (!ch.taches || ch.taches.length === 0) && !ch.client_id;
    if (hasNoData && nom.length <= 5) return true;
    return false;
  };

  // Filtering and sorting logic
  const getFilteredAndSortedChantiers = () => {
    // First filter by status — exclude archived unless viewing archives
    let filtered = [...chantiers];
    if (filterStatus === 'brouillons') {
      filtered = filtered.filter(c => c.statut !== 'archive' && isDraftChantier(c));
    } else if (filterStatus === 'archive') {
      filtered = filtered.filter(c => c.statut === 'archive');
    } else if (filterStatus === 'cette_semaine') {
      filtered = filtered.filter(c => c.statut !== 'archive' && !isDraftChantier(c) && chantierOverlapsWeek(c));
    } else {
      filtered = filtered.filter(c => c.statut !== 'archive' && !isDraftChantier(c));
      if (filterStatus !== 'all') {
        filtered = filtered.filter(c => c.statut === filterStatus);
      }
    }
    // Filter by client
    if (filterClient) {
      filtered = filtered.filter(c => c.client_id === filterClient);
    }
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const client = clients.find(cl => cl.id === c.client_id);
        return (c.nom || '').toLowerCase().includes(q)
          || (c.adresse || '').toLowerCase().includes(q)
          || (c.ville || '').toLowerCase().includes(q)
          || (client?.nom || '').toLowerCase().includes(q);
      });
    }

    // Then sort
    switch (sortBy) {
      case 'name':
        return filtered.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      case 'status':
        const statusOrder = { en_cours: 0, prospect: 1, termine: 2 };
        return filtered.sort((a, b) => (statusOrder[a.statut] || 2) - (statusOrder[b.statut] || 2));
      case 'margin':
        return filtered.sort((a, b) => (getChantierBilan(b.id)?.tauxMarge || 0) - (getChantierBilan(a.id)?.tauxMarge || 0));
      case 'recent':
      default:
        return filtered.sort((a, b) => new Date(b.createdAt || b.date_debut || 0) - new Date(a.createdAt || a.date_debut || 0));
    }
  };

  // Stats for filter tabs
  const archivedCount = chantiers.filter(c => c.statut === 'archive').length;
  const brouillonsCount = chantiers.filter(c => c.statut !== 'archive' && isDraftChantier(c)).length;
  const nonDraftNonArchive = chantiers.filter(c => c.statut !== 'archive' && !isDraftChantier(c));
  const cetteSemaineCount = nonDraftNonArchive.filter(c => chantierOverlapsWeek(c)).length;
  const statusCounts = {
    all: nonDraftNonArchive.length,
    cette_semaine: cetteSemaineCount,
    en_cours: nonDraftNonArchive.filter(c => c.statut === 'en_cours').length,
    prospect: nonDraftNonArchive.filter(c => c.statut === 'prospect').length,
    termine: nonDraftNonArchive.filter(c => c.statut === 'termine').length,
    brouillons: brouillonsCount,
    archive: archivedCount,
  };

  // Liste
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Chantiers</h1>
            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Suivi de vos projets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* List/Map toggle */}
          <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${viewMode === 'list' ? 'text-white' : isDark ? 'text-slate-300 hover:text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
              style={viewMode === 'list' ? { background: couleur } : {}}
              aria-label="Vue liste"
              title="Vue liste"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${viewMode === 'gantt' ? 'text-white' : isDark ? 'text-slate-300 hover:text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
              style={viewMode === 'gantt' ? { background: couleur } : {}}
              aria-label="Vue Gantt"
              title="Vue Gantt"
            >
              <BarChart3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${viewMode === 'map' ? 'text-white' : isDark ? 'text-slate-300 hover:text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
              style={viewMode === 'map' ? { background: couleur } : {}}
              aria-label="Vue carte"
              title="Vue carte"
            >
              <Map size={18} />
            </button>
            <button
              onClick={() => setViewMode('garanties')}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${viewMode === 'garanties' ? 'text-white' : isDark ? 'text-slate-300 hover:text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
              style={viewMode === 'garanties' ? { background: couleur } : {}}
              aria-label="Vue garanties"
              title="Vue garanties"
            >
              <Shield size={18} />
            </button>
          </div>
          {canPerform('chantier', 'create') && (
          <button onClick={() => setShow(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl text-sm flex items-center justify-center sm:gap-2 hover:shadow-lg transition-all" style={{background: couleur}}>
            <Plus size={16} /><span className="hidden sm:inline">Nouveau</span>
          </button>
          )}
        </div>
      </div>

      {/* === BANDEAU AUJOURD'HUI — compact sticky 60px === */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const chantiersToday = chantiers.filter(c => {
          if (c.statut !== 'en_cours' || isDraftChantier(c)) return false;
          const debut = c.date_debut ? c.date_debut.split('T')[0] : null;
          const fin = c.date_fin ? c.date_fin.split('T')[0] : null;
          if (!debut) return true;
          return debut <= today && (!fin || fin >= today);
        });
        const tachesEnAttente = chantiersToday.reduce((sum, c) => sum + (c.taches || []).filter(t => !t.done).length, 0);

        if (chantiers.length === 0) return null;

        return (
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Compact header — always visible */}
            <button
              onClick={() => chantiersToday.length > 0 && setTodayCollapsed(!todayCollapsed)}
              className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 transition-colors ${chantiersToday.length > 0 ? 'cursor-pointer' : 'cursor-default'} ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {chantiersToday.length > 0 ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                ) : (
                  <Calendar size={14} className={`shrink-0 ${textMuted}`} />
                )}
                <span className={`text-sm font-medium ${textPrimary}`}>
                  {chantiersToday.length > 0
                    ? `Aujourd'hui · ${chantiersToday.length} chantier${chantiersToday.length > 1 ? 's' : ''}`
                    : 'Aucun chantier aujourd\'hui'
                  }
                </span>
                {tachesEnAttente > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    {tachesEnAttente} tâche{tachesEnAttente > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {chantiersToday.length === 0 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setShow(true); }} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white min-h-[44px] flex items-center" style={{ backgroundColor: couleur }}>
                    <Plus size={14} className="inline mr-0.5" />Créer
                  </button>
                )}
                {chantiersToday.length > 0 && (
                  todayCollapsed ? <ChevronDown size={14} className={textMuted} /> : <ChevronUp size={14} className={textMuted} />
                )}
              </div>
            </button>
            {/* Expandable chantier list */}
            {chantiersToday.length > 0 && !todayCollapsed && (
              <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                {chantiersToday.slice(0, 4).map(c => {
                  const cl = clients.find(cl => cl.id === c.client_id);
                  return (
                    <button type="button" key={c.id} className={`px-4 py-2 flex items-center gap-3 w-full text-left ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors cursor-pointer focus-visible:ring-2 outline-none ${isDark ? 'focus-visible:ring-slate-400' : 'focus-visible:ring-orange-400'}`} onClick={() => setView(c.id)}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium line-clamp-2 ${textPrimary}`}>{c.nom}</p>
                        <p className={`text-xs ${textMuted} truncate`}>
                          {[cl ? formatClientName(cl, '') : '', c.ville || c.adresse].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {(c.adresse || c.ville) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const address = encodeURIComponent(`${c.adresse || ''} ${c.codePostal || ''} ${c.ville || ''}`);
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            const isAndroid = /Android/.test(navigator.userAgent);
                            if (isIOS) window.open(`maps://maps.apple.com/?q=${address}`, '_blank');
                            else if (isAndroid) window.open(`geo:0,0?q=${address}`, '_blank');
                            else window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                          }}
                          className="w-11 h-11 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: couleur }}
                          aria-label="Ouvrir dans GPS"
                          title="GPS"
                        >
                          <Navigation size={14} />
                        </button>
                      )}
                    </button>
                  );
                })}
                {chantiersToday.length > 4 && (
                  <p className={`text-xs text-center py-1.5 ${textMuted}`}>+{chantiersToday.length - 4} autres</p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Search bar */}
      {chantiers.length > 3 && (
        <div className="relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un chantier, client, adresse..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:ring-2 focus:ring-offset-0`}
            style={{ '--tw-ring-color': `${couleur}40` }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label="Effacer la recherche" className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
              <X size={14} className={textMuted} />
            </button>
          )}
        </div>
      )}

      {chantiers.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {/* Header with gradient */}
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="relative">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                <Building2 size={40} className="text-white" />
              </div>

              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>Commencez à suivre vos chantiers</h2>
              <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
                Gérez vos projets, suivez vos dépenses et contrôlez votre rentabilité en temps réel.
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Ce que vous pouvez faire</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <DollarSign size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Suivi financier</p>
                  <p className={`text-xs ${textMuted}`}>Dépenses, revenus et marge</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <Camera size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Carnet photos</p>
                  <p className={`text-xs ${textMuted}`}>Avant, pendant, après</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <CheckSquare size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Liste de tâches</p>
                  <p className={`text-xs ${textMuted}`}>Suivez l'avancement</p>
                </div>
              </div>
            </div>

            <button onClick={() => setShow(true)} className="w-full sm:w-auto px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
              <Plus size={18} />
              Créer mon premier chantier
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* === SECTION: LISTE DES CHANTIERS === */}
          {/* Status Filter Tabs + Sorting */}
          <div className="flex flex-col gap-3 mb-4">
            {/* Filtres de statut */}
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
              {[
                { key: 'all', label: 'Tous', color: couleur },
                { key: 'cette_semaine', label: 'Cette sem.', color: '#8b5cf6' },
                { key: 'en_cours', label: 'En cours', color: '#f97316' },
                { key: 'prospect', label: 'Prospects', color: '#3b82f6' },
                { key: 'termine', label: 'Terminés', color: '#22c55e' },
                ...(brouillonsCount > 0 ? [{ key: 'brouillons', label: 'Brouillons', color: '#a855f7' }] : []),
                ...(archivedCount > 0 ? [{ key: 'archive', label: 'Archivés', color: '#6b7280' }] : []),
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
                    filterStatus === tab.key
                      ? 'text-white shadow-md'
                      : isDark
                        ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                  }`}
                  style={filterStatus === tab.key ? { backgroundColor: tab.color } : {}}
                >
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStatus === tab.key ? 'bg-white/25' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    {statusCounts[tab.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Client filter + Titre section + Tri */}
            <div className="flex items-center justify-between gap-2 flex-wrap overflow-x-auto">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>{filterStatus === 'all' ? 'Tous les chantiers' : filterStatus === 'cette_semaine' ? 'Cette semaine' : filterStatus === 'en_cours' ? 'Chantiers en cours' : filterStatus === 'prospect' ? 'Prospects' : filterStatus === 'archive' ? 'Archivés' : filterStatus === 'brouillons' ? 'Brouillons / Tests' : 'Chantiers terminés'}</span>
                <span className={`text-xs ${textMuted}`}>— {getFilteredAndSortedChantiers().length} projet{getFilteredAndSortedChantiers().length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Client filter */}
                {clients.length > 1 && (
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border min-h-[44px] sm:min-h-[36px] ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <option value="">Tous les clients</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{formatClientName(c)}</option>
                    ))}
                  </select>
                )}
                {/* Sorting dropdown */}
                {chantiers.length > 1 && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border min-h-[44px] sm:min-h-[36px] ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <option value="recent">Plus récent</option>
                    <option value="name">Nom A-Z</option>
                    <option value="status">Par statut</option>
                    <option value="margin">Par marge</option>
                  </select>
                )}
              </div>
            </div>
          </div>
          {/* Gantt View */}
          {viewMode === 'gantt' && (
            <Suspense fallback={<div className={`h-[400px] rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} /></div>}>
              <GanttView
                chantiers={chantiers.filter(c => c.statut === 'en_cours' || c.statut === 'prospect')}
                equipe={equipe}
                taches={ganttTasks}
                setTaches={setGanttTasks}
                onUpdateChantier={updateChantier}
                isDark={isDark}
                couleur={couleur}
              />
            </Suspense>
          )}

          {/* Map View */}
          {viewMode === 'map' && (
            <ErrorBoundary
              isDark={isDark}
              fallback={
                <div className={`h-[500px] rounded-xl flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <AlertTriangle size={24} className="text-amber-500" />
                  <p className="font-medium">La carte n'a pas pu se charger</p>
                  <button onClick={() => setViewMode('list')} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: couleur }}>
                    Revenir à la liste
                  </button>
                </div>
              }
            >
              <Suspense fallback={<div className={`h-[500px] rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} /></div>}>
                <ChantierMap
                  chantiers={getFilteredAndSortedChantiers()}
                  clients={clients}
                  onSelectChantier={(id) => setView(id)}
                  isDark={isDark}
                  couleur={couleur}
                  formatMoney={formatMoney}
                  modeDiscret={modeDiscret}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Garanties Dashboard View */}
          {viewMode === 'garanties' && (
            <Suspense fallback={<div className={`h-[400px] rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} /></div>}>
              <GarantiesDashboard
                isDark={isDark}
                couleur={couleur}
                showToast={showToast}
                chantiers={chantiers}
              />
            </Suspense>
          )}

          {/* Duplicate chantiers banner — compact + dismissable */}
          {!chantierDuplicateDismissed && duplicateMap.size > 0 && !view && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs mb-3 ${isDark ? 'bg-amber-900/10 border-amber-800/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span className="flex-1">{Math.ceil(duplicateMap.size / 2)} doublon{Math.ceil(duplicateMap.size / 2) > 1 ? 's' : ''} détecté{Math.ceil(duplicateMap.size / 2) > 1 ? 's' : ''} · Les badges ⚠ Doublon vous permettent de fusionner</span>
              <button
                onClick={() => { setChantierDuplicateDismissed(true); try { localStorage.setItem('chantierDuplicateDismissed', 'true'); } catch {} }}
                aria-label="Fermer l'alerte doublons"
                className={`shrink-0 p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-amber-100'}`}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && <>
          {getFilteredAndSortedChantiers().length === 0 && (
            <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
              <Search size={24} className={`mx-auto mb-3 ${textMuted}`} />
              <p className={`font-medium ${textPrimary}`}>{searchQuery ? 'Aucun résultat' : filterStatus === 'termine' ? 'Aucun chantier terminé' : filterStatus === 'archive' ? 'Aucun chantier archivé' : 'Aucun chantier trouvé'}</p>
              <p className={`text-sm ${textMuted} mt-1`}>{searchQuery ? `Aucun chantier ne correspond à "${searchQuery}"` : 'Les chantiers de cette catégorie apparaîtront ici'}</p>
              {(searchQuery || filterClient) && (
                <button onClick={() => { setSearchQuery(''); setFilterClient(''); }} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: couleur }}>
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:gap-4">
          {getFilteredAndSortedChantiers().map(ch => {
            const client = clients.find(c => c.id === ch.client_id);
            const bilanRaw3 = getChantierBilan(ch.id);
            const bilan = bilanRaw3 || { totalDepenses: 0, revenuPrevu: 0, margeBrute: 0, tauxMarge: 0 };
            const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
            const budgetPrevu = devisLie?.total_ht || ch.budget_estime || 0;
            const revenuTotalList = bilan.revenuPrevu + (bilan.adjRevenus || 0);
            const budgetDepleted = revenuTotalList > 0 && bilan.totalDepenses > revenuTotalList * 0.9;
            const hasAlert = bilan.tauxMarge < 0 || budgetDepleted;
            // P0.1: Unified alerts for list cards
            const listAlerts = getChantierAlerts(ch, bilan);
            const listHealthColor = getHealthColor(listAlerts);
            // P3.9: Left border color by status
            const borderLeftColor = ch.statut === 'termine' ? '#10b981' : ch.statut === 'en_cours' ? (listAlerts.some(a => a.severity === 'critical') ? '#ef4444' : listAlerts.some(a => a.severity === 'warning') ? '#f59e0b' : '#f97316') : ch.statut === 'prospect' ? '#3b82f6' : ch.statut === 'archive' ? '#94a3b8' : '#cbd5e1';
            // P3.9: Days countdown
            const daysInfo = (() => {
              if (!ch.date_fin || ch.statut === 'termine' || ch.statut === 'archive') return null;
              const df = new Date(ch.date_fin); df.setHours(0,0,0,0);
              const now = new Date(); now.setHours(0,0,0,0);
              const d = Math.ceil((df - now) / 86400000);
              if (d < 0) return { text: `Retard +${Math.abs(d)}j`, color: 'text-red-500' };
              if (d === 0) return { text: "Échéance aujourd'hui", color: 'text-amber-500' };
              if (d <= 7) return { text: `J-${d}`, color: 'text-amber-500' };
              return { text: `J-${d}`, color: isDark ? 'text-slate-300' : 'text-slate-500' };
            })();
            const statusLabel = ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : ch.statut === 'archive' ? 'Archivé' : 'Prospect';
            const statusColor = ch.statut === 'en_cours'
              ? (isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700')
              : ch.statut === 'termine'
              ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
              : ch.statut === 'archive'
              ? (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600')
              : (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700');

            // Task counts
            const allTasks = ch.taches || [];
            const pendingTasks = allTasks.filter(t => !t.done);
            const tasksDone = allTasks.filter(t => t.done).length;
            // Force 100% for completed projects
            const avancement = ch.statut === 'termine' ? 100 : calculateSmartProgression(ch, bilan, tasksDone, allTasks.length);

            // Format date range — clean display without "?"
            const formatDateRange = () => {
              if (!ch.date_debut && !ch.date_fin) return null;
              const opts = { day: 'numeric', month: 'short' };
              const d = ch.date_debut ? new Date(ch.date_debut).toLocaleDateString('fr-FR', opts) : null;
              const f = ch.date_fin ? new Date(ch.date_fin).toLocaleDateString('fr-FR', opts) : null;
              if (d && f) return `${d} → ${f}`;
              if (d) return `Début : ${d}`;
              if (f) return `Fin : ${f}`;
              return null;
            };
            const dateRange = formatDateRange();

            return (
              <button type="button" key={ch.id} onClick={() => setView(ch.id)} className={`${cardBg} rounded-xl border px-4 py-3 text-left w-full focus-visible:ring-2 outline-none cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${isDark ? 'hover:border-slate-500 focus-visible:ring-slate-400' : 'hover:border-orange-200 focus-visible:ring-orange-400'}`} style={{ borderLeftWidth: '3px', borderLeftColor: borderLeftColor }}>
                {/* Row 1: Nom + Health dot */}
                <div className="flex items-start gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* P0.1: Health indicator dot */}
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: listHealthColor }} title={listAlerts.length ? listAlerts.map(a => a.label).join(', ') : 'OK'} />
                    <h3 className={`font-semibold text-sm leading-tight line-clamp-2 ${textPrimary}`}>{ch.nom}</h3>
                  </div>
                  <span className={`text-xs font-mono shrink-0 mt-0.5 ${textMuted}`}>#{String(chantiers.indexOf(ch) + 1).padStart(3, '0')}</span>
                </div>
                {/* Row 1b: Badges */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
                    {statusLabel}
                  </span>
                  {/* P3.9: Days countdown badge */}
                  {daysInfo && <span className={`text-xs font-bold ${daysInfo.color}`}>{daysInfo.text}</span>}
                  {ch.situations_data?.mode === 'situation' && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-0.5 ${isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                      <BarChart3 size={14} /> Situation
                    </span>
                  )}
                  {isDraftChantier(ch) && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                      Brouillon
                    </span>
                  )}
                  {duplicateMap.has(ch.id) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMergeDialog({ primaryId: ch.id, secondaryId: duplicateMap.get(ch.id)[0] }); }}
                      className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}
                      title="Cliquez pour fusionner les doublons"
                    >
                      ⚠ Doublon
                    </button>
                  )}
                </div>

                {/* Row 2: Client · Dates · Address */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs ${textMuted}`}>{client ? formatClientName(client, 'Sans client') : 'Sans client'}</span>
                  {dateRange && (
                    <>
                      <span className={`text-xs ${textMuted}`}>·</span>
                      <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                        <Calendar size={14} />
                        {dateRange}
                      </span>
                    </>
                  )}
                  {(ch.adresse || ch.ville) ? (
                    <>
                      <span className={`text-xs ${textMuted}`}>·</span>
                      <span className={`text-xs ${textMuted} flex items-center gap-1 truncate max-w-[50%]`} title={[ch.adresse, ch.ville].filter(Boolean).join(', ')}>
                        <MapPin size={14} className="shrink-0" />
                        {ch.ville || ch.adresse}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`text-xs ${textMuted}`}>·</span>
                      <span className={`text-xs italic ${isDark ? 'text-slate-300' : 'text-slate-500'} flex items-center gap-1`}>
                        <MapPin size={14} className="shrink-0" />
                        Sans adresse
                      </span>
                    </>
                  )}
                </div>

                {/* Row 3: Progress bar + Budget/Marge compacts */}
                <div className="flex items-center gap-3">
                  {/* Progress bar - inline */}
                  {/* P3.9: Compact empty state for chantiers without tasks */}
                  {ch.statut === 'en_cours' && avancement === 0 && allTasks.length === 0 && (
                    <div className="flex-1">
                      <span className={`text-[11px] ${textMuted}`}>0 tâche • <span className="underline">Configurer →</span></span>
                    </div>
                  )}
                  {ch.statut === 'en_cours' && (avancement > 0 || allTasks.length > 0) && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`flex-1 h-2 sm:h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className={`h-full rounded-full transition-all ${avancement > 0 ? 'min-w-[4px]' : ''}`} style={{ width: `${Math.min(100, Math.max(3, avancement))}%`, background: couleur }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: couleur }}>{avancement}%</span>
                    </div>
                  )}
                  {ch.statut !== 'en_cours' && <div className="flex-1" />}

                  {/* Budget + Marge + Tasks compact */}
                  <div className="flex items-center gap-3 shrink-0">
                    {allTasks.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckSquare size={14} className={pendingTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                        <span className={`text-[11px] font-medium tabular-nums ${pendingTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {tasksDone}/{allTasks.length}
                        </span>
                      </div>
                    )}
                    {budgetPrevu > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold tabular-nums ${textPrimary}`}>{formatMoney(budgetPrevu)}</span>
                        {bilan.hasDepenses && (
                          <span className={`text-[11px] font-bold tabular-nums ${getMargeColor(bilan.tauxMarge)}`} title="Taux de marge">{formatPct(bilan.tauxMarge)} marge</span>
                        )}
                        {hasAlert && <AlertTriangle size={14} className={`${bilan.tauxMarge < 0 ? 'text-red-500' : 'text-amber-500'}`} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA for Prospect: create devis, start chantier, view detail */}
                {ch.statut === 'prospect' && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    {setPage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPage('devis', { chantier_id: ch.id, client_id: ch.client_id, objet: ch.nom }); }}
                      className="flex-1 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all hover:shadow-sm active:scale-[0.98] min-h-[44px] sm:min-h-0"
                      style={{ borderColor: couleur, color: couleur }}
                    >
                      <FileText size={14} /> Créer un devis
                    </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); updateChantier(ch.id, { statut: 'en_cours', dateDebut: new Date().toISOString().split('T')[0] }); showToast('Chantier démarré !', 'success'); }}
                      className="flex-1 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.98] min-h-[44px] sm:min-h-0"
                      style={{ background: couleur }}
                    >
                      <Zap size={14} /> Démarrer
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setView(ch.id); }}
                      className={`py-2.5 sm:py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* Unarchive button for archived chantiers */}
                {ch.statut === 'archive' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateChantier(ch.id, { statut: 'termine' }); showToast('Chantier restauré', 'success'); }}
                    className={`w-full mt-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Archive size={14} /> Restaurer
                  </button>
                )}
              </button>
            );
          })}
          </div>
          </>}
        </>
      )}

      {/* Efficient Task Management Modal */}
      {showTaskModal && view && (() => {
        const ch = chantiers.find(c => c.id === view);
        if (!ch) return null;
        const tasks = ch.taches || [];
        const pendingTasks = tasks.filter(t => !t.done);
        const completedTasks = tasks.filter(t => t.done);
        const criticalTasks = pendingTasks.filter(t => t.critical);

        const addTask = (text, critical = false) => {
          if (!text.trim()) return;
          updateChantier(ch.id, {
            taches: [...tasks, { id: generateId(), text: text.trim(), done: false, critical }]
          });
        };

        const toggleTask = (id) => {
          updateChantier(ch.id, {
            taches: tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
          });
        };

        const toggleCritical = (id) => {
          updateChantier(ch.id, {
            taches: tasks.map(t => t.id === id ? { ...t, critical: !t.critical } : t)
          });
        };

        const deleteTask = (id) => {
          updateChantier(ch.id, {
            taches: tasks.filter(t => t.id !== id)
          });
        };

        const clearCompleted = () => {
          updateChantier(ch.id, {
            taches: tasks.filter(t => !t.done)
          });
          showToast?.(`${completedTasks.length} tâche(s) supprimée(s)`, 'success');
        };

        const markAllDone = () => {
          updateChantier(ch.id, {
            taches: tasks.map(t => ({ ...t, done: true }))
          });
          showToast?.('Toutes les tâches marquées comme terminées', 'success');
        };

        return (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowTaskModal(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <h3 className={`text-lg font-bold ${textPrimary}`}>Gestion des tâches</h3>
                  <p className={`text-sm ${textMuted}`}>{pendingTasks.length} en cours · {completedTasks.length} terminées</p>
                </div>
                <button onClick={() => setShowTaskModal(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                  <X size={20} className={textMuted} />
                </button>
              </div>

              {/* Quick Add */}
              <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.taskInput;
                  addTask(input.value, newTaskCritical);
                  input.value = '';
                  setNewTaskCritical(false);
                }} className="flex gap-2">
                  <input
                    name="taskInput"
                    placeholder="Ajouter une tâche..."
                    className={`flex-1 px-4 py-3 border rounded-xl min-h-[48px] ${inputBg}`}
                    autoFocus
                  />
                  <button type="submit" className="px-4 py-3 text-white rounded-xl min-h-[48px] font-medium" style={{ background: couleur }}>
                    <Plus size={20} />
                  </button>
                </form>
                <button
                  onClick={() => setNewTaskCritical(!newTaskCritical)}
                  className={`mt-2 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    newTaskCritical
                      ? (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600')
                      : (isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')
                  }`}
                >
                  <AlertCircle size={14} />
                  {newTaskCritical ? 'Critique (activé)' : 'Marquer comme critique'}
                </button>
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Critical Tasks */}
                {criticalTasks.length > 0 && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      ⚠️ Points critiques ({criticalTasks.length})
                    </p>
                    <div className="space-y-1">
                      {criticalTasks.map(task => (
                        <div key={task.id} className={`flex items-center gap-2 p-3 rounded-xl group ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                          <button onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${isDark ? 'border-red-500' : 'border-red-400'}`}>
                            {task.done && <Check size={14} className="text-red-500" />}
                          </button>
                          <span className={`flex-1 text-sm ${task.done ? 'line-through opacity-50' : ''} ${isDark ? 'text-red-400' : 'text-red-700'}`}>{task.text}</span>
                          <button onClick={() => toggleCritical(task.id)} aria-label="Retirer de prioritaire" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-slate-900 hover:bg-red-900/50' : 'hover:bg-red-100'}`} title="Retirer critique">
                            <AlertCircle size={16} className="text-red-500" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} aria-label="Supprimer la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-slate-900 hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Tasks */}
                {pendingTasks.filter(t => !t.critical).length > 0 && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                      À faire ({pendingTasks.filter(t => !t.critical).length})
                    </p>
                    <div className="space-y-1">
                      {pendingTasks.filter(t => !t.critical).map(task => (
                        <div key={task.id} className={`flex items-center gap-2 p-3 rounded-xl group ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <button onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-md border-2 flex-shrink-0 ${isDark ? 'border-slate-500' : 'border-slate-300'}`} />
                          <span className={`flex-1 text-sm ${textPrimary}`}>{task.text}</span>
                          <button onClick={() => toggleCritical(task.id)} aria-label="Marquer comme prioritaire" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-slate-900 hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-100 text-slate-500'}`} title="Marquer critique">
                            <AlertCircle size={16} />
                          </button>
                          <button onClick={() => deleteTask(task.id)} aria-label="Supprimer la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-slate-900 hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        ✓ Terminées ({completedTasks.length})
                      </p>
                      <button onClick={clearCompleted} className={`text-xs ${isDark ? 'text-slate-300 hover:text-red-400' : 'text-slate-500 hover:text-red-500'}`}>
                        Supprimer
                      </button>
                    </div>
                    <div className="space-y-1">
                      {completedTasks.slice(0, 5).map(task => (
                        <div key={task.id} className={`flex items-center gap-2 p-2 rounded-lg group ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                          <button onClick={() => toggleTask(task.id)}
                            className="w-5 h-5 rounded-md bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </button>
                          <span className={`flex-1 text-sm line-through ${textMuted}`}>{task.text}</span>
                        </div>
                      ))}
                      {completedTasks.length > 5 && (
                        <p className={`text-xs ${textMuted} text-center py-1`}>+{completedTasks.length - 5} autres</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty state with CTA */}
                {tasks.length === 0 && (
                  <div className={`text-center py-8 px-4 rounded-xl ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                    <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                      <CheckSquare size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <p className={`font-semibold mb-1 ${textPrimary}`}>Aucune tâche définie</p>
                    <p className={`text-sm mb-4 ${textMuted}`}>Les tâches vous aident à suivre l'avancement du chantier</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        onClick={() => setShowTaskTemplates(true)}
                        className="px-4 min-h-[44px] rounded-xl text-sm font-medium flex items-center gap-2 text-white transition-all hover:opacity-90"
                        style={{ background: couleur }}
                      >
                        <Sparkles size={16} /> Utiliser un modèle
                      </button>
                      <button
                        onClick={() => document.querySelector('input[placeholder="Ajouter une tâche..."]')?.focus()}
                        className={`px-4 min-h-[44px] rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                      >
                        <Plus size={16} /> Créer manuellement
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {tasks.length > 0 && (
                <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button
                    onClick={() => setShowTaskTemplates(true)}
                    className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Sparkles size={14} /> Modèles
                  </button>
                  {pendingTasks.length > 0 && (
                    <button
                      onClick={markAllDone}
                      className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg ${isDark ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      <Check size={14} /> Tout terminer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Quick Chantier Modal - Create */}
      <QuickChantierModal
        isOpen={show}
        onClose={() => setShow(false)}
        onSubmit={handleCreateChantier}
        clients={clients}
        devis={devis}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Quick Chantier Modal - Edit */}
      <QuickChantierModal
        isOpen={!!editingChantier}
        onClose={() => setEditingChantier(null)}
        onSubmit={handleEditChantier}
        clients={clients}
        devis={devis}
        isDark={isDark}
        couleur={couleur}
        editChantier={editingChantier}
      />

      {/* Merge Duplicates Dialog */}
      {mergeDialog && (() => {
        const primary = chantiers.find(c => c.id === mergeDialog.primaryId);
        const secondary = chantiers.find(c => c.id === mergeDialog.secondaryId);
        if (!primary || !secondary) return null;
        const clientA = clients.find(c => c.id === primary.client_id);
        const clientB = clients.find(c => c.id === secondary.client_id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setMergeDialog(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Fusionner les doublons</h3>
              <p className={`text-xs mb-4 ${textMuted}`}>Les données du chantier secondaire seront ajoutées au principal, puis le secondaire sera archivé.</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[{ ch: primary, label: '✅ Principal', client: clientA, id: mergeDialog.primaryId }, { ch: secondary, label: '📦 Sera archivé', client: clientB, id: mergeDialog.secondaryId }].map(({ ch, label, client, id }) => (
                  <div key={id} className={`rounded-xl border p-3 text-center ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-200 bg-slate-50'}`}>
                    <span className={`text-xs font-medium block mb-1 ${id === mergeDialog.primaryId ? (isDark ? 'text-green-400' : 'text-green-700') : (isDark ? 'text-amber-400' : 'text-amber-700')}`}>{label}</span>
                    <p className={`text-sm font-semibold truncate ${textPrimary}`}>{ch.nom}</p>
                    <p className={`text-xs truncate ${textMuted}`}>{client ? formatClientName(client) : '—'}</p>
                    <div className={`text-xs mt-2 space-y-0.5 ${textMuted}`}>
                      <p>{(ch.taches || []).length} tâches · {(ch.photos || []).length} photos</p>
                      <p>{(ch.documents || []).length} docs · {ch.statut}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Swap button */}
              <button
                onClick={() => setMergeDialog({ primaryId: mergeDialog.secondaryId, secondaryId: mergeDialog.primaryId })}
                className={`w-full text-xs py-1.5 rounded-lg mb-4 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                ↔ Inverser principal / secondaire
              </button>

              <div className="flex gap-2">
                <button onClick={() => setMergeDialog(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  Annuler
                </button>
                <button
                  onClick={() => handleMergeDuplicates(mergeDialog.primaryId, mergeDialog.secondaryId)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ backgroundColor: couleur }}
                >
                  Fusionner
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
