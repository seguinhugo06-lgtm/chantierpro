import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { ArrowUpDown, Plus, ArrowLeft, ArrowRight, Edit3, Trash2, Check, X, Camera, MapPin, Phone, Clock, Calendar, DollarSign, TrendingDown, AlertTriangle, Package, FileText, ChevronRight, ChevronDown, ChevronUp, StickyNote, CheckSquare, MoreVertical, Coins, Receipt, Target, BarChart3, Wallet, MessageSquare, AlertCircle, ArrowUpRight, ArrowDownRight, UserCog, Download, Building2, Sparkles, FolderOpen, Sun, Cloud, CloudRain, CheckCircle, Copy, Archive, Search, Paperclip, ClipboardList, CheckCircle2, Navigation, CalendarPlus, Shield } from 'lucide-react';
import { PastilleStatut } from './ui/Pastille';
import Pastille from './ui/Pastille';
import { Bouton, BoutonIcone } from './ui/Bouton';
import Carte from './ui/Carte';
import { statut as lireStatut } from '../lib/statuts';
import { ouvrirLienExterne } from '../lib/natif';
import { coutHoraire } from '../lib/tauxEquipe';
import LigneListe from './ui/LigneListe';
import { Segmente } from './ui/Onglets';
import { ChampRecherche, BoutonVolet, Volet, ListeChoix, PucesActives, SegmentDefilant } from './ui/Filtres';
import PageHeader from './ui/PageHeader';
import KPICard from './ui/KPICard';
import { useSubscriptionStore } from '../stores/subscriptionStore';

const ChantierMap = lazy(() => import('./chantiers/ChantierMap'));
const GanttView = lazy(() => import('./GanttView'));
const GarantiesDashboard = lazy(() => import('./chantiers/GarantiesDashboard'));
import { useOnlineStatus } from '../hooks/useNetworkStatus';
import { useConfirm, useToast } from '../context/AppContext';
import { useData } from '../context/DataContext';
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
import { FONCTIONS } from '../lib/fonctions';
import { jourLocal, dateLue } from '../lib/dates';

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

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, pointages, setPointages, equipe, devis, ajustements, addAjustement, deleteAjustement, getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier, catalogue, deductStock, isDark, createMode, setCreateMode, setPage, memos = [], addMemo, updateMemo, deleteMemo, toggleMemo, onPlanEvent, addDevis, generateNextNumero, nouveauDevisPour }) {
  const { confirm } = useConfirm();
  const { addDepense: ctxAddDepense, addPointage: ctxAddPointage, updatePointage: ctxUpdatePointage, deletePointage: ctxDeletePointage } = useData();
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
  const [moForm, setMoForm] = useState({ employeId: '', date: jourLocal(), heures: '', note: '' });
  const [newMessage, setNewMessage] = useState({ type: 'email', content: '' });
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ budget_estime: '' });
  const [sortBy, setSortBy] = useState('recent'); // recent, name, status, margin
  const [filterStatus, setFilterStatus] = useState('all'); // all, en_cours, prospect, termine
  const [filterClient, setFilterClient] = useState(''); // Filter by client_id
  const [searchQuery, setSearchQuery] = useState(''); // Text search
  // Recherche / Filtres / Trier : boîte à outils commune (ui/Filtres.jsx), comme Devis, Clients et Tâches.
  const [voletListe, setVoletListe] = useState(null); // null | 'filtres' | 'tri'
  const boutonFiltresRef = useRef(null);
  const boutonTriRef = useRef(null);
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
  // createMode peut porter un client (ouvert depuis sa fiche) : le formulaire part avec lui.
  const [clientPourChantier, setClientPourChantier] = useState(null);
  useEffect(() => { if (createMode) { setClientPourChantier(createMode?.clientId || null); setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  // Persist gantt tasks to localStorage
  useEffect(() => { try { localStorage.setItem('cp_gantt_tasks', JSON.stringify(ganttTasks)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }, [ganttTasks]);

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
    // Réception et garanties éteintes (src/lib/fonctions.js) : rien à charger
    if (!FONCTIONS.receptionChantier) return;
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
    return Math.abs(value - rounded) < 0.1 ? `${rounded} %` : `${value.toFixed(1).replace('.', ',')} %`;
  };
  const getMargeColor = (t) => t < 0 ? 'text-red-500' : t < 15 ? 'text-amber-500' : 'text-emerald-500';
  const getMargeLabel = (t) => t < 0 ? 'Négatif' : t < 15 ? 'Faible' : t < 30 ? 'Bon' : 'Excellent';
  const getMargeBg = (t) => t < 0 ? 'bg-red-50' : t < 15 ? 'bg-amber-50' : 'bg-emerald-50';

  // Handlers
  const handlePhotoAdd = (e, cat = 'pendant') => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limite photos par plan (gratuit = 50). Comptée sur tous les chantiers.
    const photoLimit = useSubscriptionStore.getState().getLimit('photos');
    if (photoLimit !== -1) {
      const totalPhotos = chantiers.reduce((s, c) => s + (c.photos?.length || 0), 0);
      if (totalPhotos >= photoLimit) {
        showToast(`Limite de ${photoLimit} photos atteinte — passez à un plan supérieur pour en ajouter plus`, 'warning');
        useSubscriptionStore.getState().openUpgradeModal('photos');
        if (e.target) e.target.value = '';
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = () => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: [...(ch.photos || []), { id: generateId(), src: reader.result, categorie: cat, date: new Date().toISOString() }] }); };
    reader.readAsDataURL(file);
  };
  const deletePhoto = async (id) => { const ok = await confirm({ title: 'Supprimer la photo', message: 'La photo sera retirée du chantier, avec sa date et son heure.' }); if (!ok) return; const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: ch.photos.filter(p => p.id !== id) }); };
  const addTache = (phaseDemandee) => { const phase = typeof phaseDemandee === 'string' ? phaseDemandee : 'second-oeuvre'; if (!newTache.trim()) return; const ch = chantiers.find(c => c.id === view); if (ch) { updateChantier(view, { taches: [...(ch.taches || []), { id: generateId(), text: newTache, done: false, critical: newTaskCritical, phase }] }); setNewTache(''); setNewTaskCritical(false); } };
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
  // Écritures par DataContext (base + écran). Avant (recette du 9 oct. 2026) : setDepenses / setPointages
  // seuls, la dépense et les heures disparaissaient au rechargement.
  const addDepenseToChantier = async () => {
    if (!newDepense.description || !newDepense.montant) return;
    const qty = parseInt(newDepense.quantite) || 1;
    const creee = await ctxAddDepense({
      chantierId: view,
      description: newDepense.description + (qty > 1 ? ` (x${qty})` : ''),
      montant: parseFloat(String(newDepense.montant).replace(',', '.')),
      categorie: newDepense.categorie,
      date: jourLocal()
    });
    if (!creee) return; // refus : la saisie reste, DataContext a dit pourquoi
    if (newDepense.catalogueId && deductStock) deductStock(newDepense.catalogueId, qty);
    setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' });
    setShowQuickMateriau(false);
  };
  const handleAddAjustement = () => { if (!adjForm.libelle || !adjForm.montant_ht) return; addAjustement({ chantierId: view, type: showAjustement, libelle: adjForm.libelle, montant_ht: parseFloat(adjForm.montant_ht) }); setAdjForm({ libelle: '', montant_ht: '' }); setShowAjustement(null); };
  const handleAddMO = async () => {
    if (!moForm.employeId || !moForm.heures) { showToast('Choisissez la personne et le nombre d’heures', 'error'); return; }
    const cree = await ctxAddPointage({ employeId: moForm.employeId, chantierId: view, date: moForm.date, heures: parseFloat(String(moForm.heures).replace(',', '.')), description: moForm.note, manuel: true, approuve: true });
    if (!cree) return;
    setMoForm({ employeId: '', date: jourLocal(), heures: '', note: '' });
    setShowAddMO(false);
  };
  const handleEditPointage = (id, field, value) => ctxUpdatePointage(id, { [field]: field === 'heures' ? parseFloat(String(value).replace(',', '.')) || 0 : value });
  const deletePointage = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce pointage ?' });
    if (confirmed) await ctxDeletePointage(id);
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
    // Facturé : les factures émises du chantier (avoirs déduits), pas le devis qu'elles facturent (compté deux fois)
    const totalFacture = devis?.filter(d => d.chantier_id === ch.id && d.type === 'facture' && d.statut !== 'brouillon').reduce((s, d) => s + (d.total_ht || 0), 0) || 0;
    const resteAFacturer = revenuTotal - totalFacture;

    return (
      <div className="space-y-4 sm:space-y-6 pb-24">
        {/* En-tête : retour, nom, statut modifiable, client ; les actions rares dans « ⋯ » au téléphone */}
        {(() => {
          const navList = chantiers.filter(c => c.statut !== 'archive');
          const currentIdx = navList.findIndex(c => c.id === ch.id);
          const prevChantier = currentIdx > 0 ? navList[currentIdx - 1] : null;
          const nextChantier = currentIdx < navList.length - 1 ? navList[currentIdx + 1] : null;
          const dupliquer = async () => {
            const clone = { nom: `${ch.nom} (copie)`, client_id: ch.client_id, clientId: ch.client_id, adresse: ch.adresse, ville: ch.ville, codePostal: ch.codePostal, dateDebut: jourLocal(), date_debut: jourLocal(), dateFin: '', date_fin: '', budgetPrevu: ch.budget_estime || ch.budgetPrevu || 0, budget_estime: ch.budget_estime || ch.budgetPrevu || 0, budget_materiaux: ch.budget_materiaux || 0, heures_estimees: ch.heures_estimees || 0, description: ch.description || '', notes: ch.notes || '', taches: (ch.taches || []).map(t => ({ ...t, id: generateId(), done: false })), photos: [], documents: [], messages: [], statut: 'prospect' };
            // Attendre le résultat : à la limite du plan, ou si la base refuse, rien n'est créé
            const newCh = await addChantier(clone);
            if (!newCh) return;
            if (newCh.id) setView(newCh.id);
          };
          const terminer = async () => {
            const confirmed = await confirm({ title: 'Terminer le chantier', message: `Marquer « ${ch.nom} » comme terminé ? La date de fin sera celle d'aujourd'hui.` });
            if (!confirmed) return;
            updateChantier(ch.id, { statut: 'termine', date_fin: jourLocal() });
            triggerPostChantierSequence(ch);
            showToast('Chantier marqué comme terminé', 'success');
          };
          const archiver = async () => {
            const confirmed = await confirm({ title: 'Archiver', message: `Archiver le chantier « ${ch.nom} » ? Il ne sera plus visible dans la liste active.` });
            if (!confirmed) return;
            updateChantier(ch.id, { statut: 'archive' });
            showToast('Chantier archivé', 'success');
            setView(null);
          };
          const tonStatut = {
            neutre: 'bg-neutre-fond text-neutre-texte', info: 'bg-info-fond text-info-texte', succes: 'bg-succes-fond text-succes-texte',
            alerte: 'bg-alerte-fond text-alerte-texte', danger: 'bg-danger-fond text-danger-texte',
          }[lireStatut('chantier', ch.statut).ton] || 'bg-neutre-fond text-neutre-texte';
          const actionsMenu = [
            { cle: 'modifier', icone: Edit3, libelle: 'Modifier', faire: () => setEditingChantier(ch) },
            { cle: 'dupliquer', icone: Copy, libelle: 'Dupliquer', faire: dupliquer },
            ...(FONCTIONS.receptionChantier && (ch.statut === 'en_cours' || ch.statut === 'termine') && !chantierReception ? [{ cle: 'reception', icone: Shield, libelle: 'Réceptionner', faire: () => setShowReceptionForm(true) }] : []),
            ...(ch.statut === 'en_cours' ? [{ cle: 'terminer', icone: CheckCircle, libelle: 'Terminer', faire: terminer }] : []),
            ...(ch.statut !== 'archive' ? [{ cle: 'archiver', icone: Archive, libelle: 'Archiver', faire: archiver }] : []),
          ];
          return (
            <div className="space-y-1">
              <div className="flex items-start gap-1">
                <BoutonIcone icone={ArrowLeft} libelle="Retour aux chantiers" onClick={() => { setView(null); setSelectedChantier?.(null); }} className="-ml-2" />
                <div className="flex-1 min-w-0 pt-1">
                  <h1 className="text-2xl font-bold text-encre leading-tight break-words">{ch.nom}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <label className="relative inline-flex">
                      <span className="sr-only">Statut du chantier</span>
                      <select
                        value={ch.statut}
                        onChange={e => {
                          const newStatus = e.target.value;
                          updateChantier(ch.id, { statut: newStatus });
                          if (newStatus === 'termine') triggerPostChantierSequence(ch);
                          showToast(`Statut : ${CHANTIER_STATUS_LABELS[newStatus]}`, 'success');
                        }}
                        className={`appearance-none h-11 pl-3.5 pr-9 rounded-full text-sm font-semibold cursor-pointer border-0 ${tonStatut}`}
                      >
                        <option value={ch.statut}>{CHANTIER_STATUS_LABELS[ch.statut]}</option>
                        {getAvailableChantierTransitions(ch.statut).map(status => (
                          <option key={status} value={status}>{CHANTIER_STATUS_LABELS[status]}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                    </label>
                    {client && <span className="text-sm text-encre-2">{formatClientName(client)}{ch.ville ? ` · ${ch.ville}` : ''}</span>}
                  </div>
                </div>
                {/* Bureau : icônes libellées ; téléphone : menu « ⋯ » */}
                <div className="hidden sm:flex items-center">
                  {actionsMenu.map(({ cle, icone, libelle, faire }) => <BoutonIcone key={cle} icone={icone} libelle={libelle} onClick={faire} />)}
                </div>
                <div className="relative sm:hidden">
                  <BoutonIcone icone={MoreVertical} libelle="Plus d'actions" aria-haspopup="true" aria-expanded={showMobileActions === ch.id}
                    onClick={() => setShowMobileActions(prev => prev === ch.id ? null : ch.id)} />
                  {showMobileActions === ch.id && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setShowMobileActions(null)} />
                      <div role="menu" onKeyDown={(e) => { if (e.key === 'Escape') setShowMobileActions(null); }} className="absolute right-0 top-full mt-1 z-20 py-1 rounded-xl shadow-e3 border border-bord bg-surface min-w-[200px]">
                        {actionsMenu.map(({ cle, icone: Icone, libelle, faire }) => (
                          <button key={cle} type="button" role="menuitem" onClick={() => { setShowMobileActions(null); faire(); }}
                            className="w-full min-h-[44px] flex items-center gap-3 px-4 text-sm font-medium text-encre hover:bg-surface-2">
                            <Icone size={18} aria-hidden="true" className="text-encre-3" /> {libelle}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {(prevChantier || nextChantier) && (
                <div className="hidden sm:flex items-center justify-between">
                  <Bouton variante="discret" taille="compacte" icone={ArrowLeft} disabled={!prevChantier} onClick={() => prevChantier && setView(prevChantier.id)}>
                    <span className="max-w-[200px] truncate">{prevChantier?.nom || 'Précédent'}</span>
                  </Bouton>
                  <Bouton variante="discret" taille="compacte" iconeFin={ArrowRight} disabled={!nextChantier} onClick={() => nextChantier && setView(nextChantier.id)}>
                    <span className="max-w-[200px] truncate">{nextChantier?.nom || 'Suivant'}</span>
                  </Bouton>
                </div>
              )}
            </div>
          );
        })()}

        {/* Auto-suggestion: mark as terminé when all tasks done */}
        {ch.statut !== 'termine' && tasksTotal > 0 && tasksDone === tasksTotal && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-succes-fond text-succes-texte">
            <CheckSquare size={20} aria-hidden="true" className="flex-shrink-0" />
            <p className="flex-1 min-w-0 text-sm font-semibold">Toutes les tâches sont faites. Terminer le chantier ?</p>
            <Bouton
              taille="compacte"
              onClick={() => {
                updateChantier(ch.id, { statut: 'termine' });
                triggerPostChantierSequence(ch);
                showToast('Chantier marqué comme terminé', 'success');
              }}
            >
              Terminer
            </Bouton>
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
          const colors = isOverdue ? 'bg-danger-fond text-danger-texte' : isUrgent ? 'bg-alerte-fond text-alerte-texte' : 'bg-info-fond text-info-texte';
          return (
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${colors}`}>
              <AlertTriangle size={20} aria-hidden="true" className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {isOverdue
                    ? `Échéance dépassée de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`
                    : daysLeft === 0
                      ? 'Échéance aujourd\'hui !'
                      : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} avant l'échéance`}
                </p>
                <p className="text-sm">
                  Fin prévue le {dateFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                  <span className={`text-xs px-1.5 py-0.5 rounded-full bg-surface-2 text-encre-2`}>{sitCount} situation{sitCount > 1 ? 's' : ''}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: globalAv >= 100 ? '#10b981' : couleur }}>
                  {modeDiscret ? '***' : `${globalAv.toFixed(0)}%`}
                </span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden bg-bord`}>
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

        {/* === SUR PLACE : y aller, appeler, prévenir le client, pointer === */}
        {(() => {
          const adresseComplete = [ch.adresse, [ch.codePostal, ch.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
          const tel = client?.telephone || client?.tel;
          const handleNotifyClient = async (type) => {
            const templates = {
              en_route: `Bonjour ${client?.prenom || 'Madame, Monsieur'}, votre artisan ${entreprise?.nom || ''} est en route. Arrivée estimée dans 30 minutes.`,
              arrive: `Bonjour, votre artisan est arrivé sur le chantier « ${ch.nom} ».`,
              termine: `Bonne nouvelle : les travaux de votre chantier « ${ch.nom} » sont terminés. N'hésitez pas à nous contacter.`,
            };
            const message = templates[type];
            // Trace de l'envoi (le message part par le téléphone de l'artisan : aucun coût SMS).
            if (!isDemo && supabase) {
              supabase.from('notifications_client').insert({
                entreprise_id: entreprise?.id, client_id: client?.id, chantier_id: ch.id, type,
                canal: tel ? 'sms' : 'email', message, sent_at: new Date().toISOString(), statut: 'clipboard',
              }).then(() => {}, () => {});
            }
            // N'annoncer « copié » que si la copie a réellement eu lieu.
            let copie = false;
            try { await navigator.clipboard.writeText(message); copie = true; } catch { copie = false; }
            showToast(copie ? `Message copié : collez-le dans vos SMS à ${client?.prenom || 'votre client'}` : `Copie impossible. Message : ${message}`, copie ? 'info' : 'warning');
          };
          return (
            <Carte>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { cle: 'gps', icone: MapPin, libelle: 'Itinéraire', ok: !!adresseComplete, faire: () => ouvrirLienExterne(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseComplete)}`), manque: 'Adresse non renseignée' },
                  { cle: 'appel', icone: Phone, libelle: 'Appeler', ok: !!tel, faire: () => { window.location.href = `tel:${String(tel).replace(/\s/g, '')}`; }, manque: 'Aucun numéro' },
                ].map(({ cle, icone: Icone, libelle, ok, faire, manque }) => (
                  <button key={cle} type="button" onClick={faire} disabled={!ok} title={ok ? libelle : manque}
                    className="h-14 flex items-center justify-center gap-2 rounded-xl border border-bord-fort bg-surface text-encre text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none">
                    <Icone size={20} aria-hidden="true" /> {libelle}
                  </button>
                ))}
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">Adresse du chantier</dt>
                  <dd className="text-base text-encre break-words">{adresseComplete || <span className="text-encre-3">Non renseignée</span>}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">Client</dt>
                  <dd className="text-base text-encre break-words">
                    {client ? formatClientName(client) : <span className="text-encre-3">Aucun client associé</span>}
                    {tel && <> · <a href={`tel:${String(tel).replace(/\s/g, '')}`} className="hover:underline tabular-nums">{tel}</a></>}
                  </dd>
                  {client?.email && <dd className="text-sm text-encre-2 truncate"><a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a></dd>}
                </div>
              </dl>
              <div className="mt-4 pt-4 border-t border-bord">
                <p className="text-sm font-semibold text-encre">Prévenir le client</p>
                <p className="text-sm text-encre-2">Le message est copié : collez-le dans vos SMS.</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { cle: 'en_route', icone: Navigation, libelle: 'En route' },
                    { cle: 'arrive', icone: MapPin, libelle: 'Arrivé' },
                    { cle: 'termine', icone: CheckCircle, libelle: 'Fini' },
                  ].map(({ cle, icone: Icone, libelle }) => (
                    <button key={cle} type="button" onClick={() => handleNotifyClient(cle)}
                      className="h-12 flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-encre text-sm font-semibold transition-colors hover:bg-bord">
                      <Icone size={18} aria-hidden="true" /> {libelle}
                    </button>
                  ))}
                </div>
                <Bouton variante="discret" icone={Clock} className="mt-2 -ml-2" onClick={() => setShowAddMO(true)}>Pointer des heures</Bouton>
              </div>
              {/* Weather widget */}
              {weather === null && ch.adresse && (
                <div className={`mt-3 rounded-xl border p-3 flex items-center gap-2 bg-surface-2 border-bord`}>
                  <Cloud size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                  <span className={`text-xs text-encre-3`}>Météo indisponible pour ce chantier</span>
                </div>
              )}
              {weather?.daily?.length > 0 && !weather.isDefault && (
                <div className={`mt-3 rounded-xl border p-3 bg-surface border-bord`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud size={14} style={{ color: couleur }} />
                    <span className={`text-xs font-medium text-encre-3`}>
                      Météo {weather.location || ch.ville || 'chantier'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {weather.daily.slice(0, 3).map((day, i) => {
                      const labels = ['Auj.', 'Dem.', 'J+2'];
                      const WeatherIcon = day.icon === 'sun' ? Sun : day.icon === 'rain' ? CloudRain : Cloud;
                      return (
                        <div key={i} className="text-center flex-1">
                          <p className={`text-xs text-encre-3`}>{labels[i]}</p>
                          <WeatherIcon size={16} className={`mx-auto my-1 ${day.icon === 'sun' ? 'text-yellow-500' : day.icon === 'rain' ? 'text-blue-400' : 'text-slate-400'}`} />
                          <p className={`text-xs font-medium text-encre-2`}>{day.temp}°C</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Carte>
          );
        })()}

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

          return (
            <Carte>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold text-encre flex items-baseline gap-2">
                  Tâches
                  {allTasks.length > 0 && <span className="text-sm font-medium text-encre-3 tabular-nums">{tasksDone}/{tasksTotal}</span>}
                </h2>
                {allTasks.length > 0 && (
                  <Bouton variante="discret" taille="compacte" icone={Sparkles} onClick={() => setShowTaskGenerator(true)} className="-mr-2">
                    {FONCTIONS.ia ? 'Compléter (IA)' : 'Tâches types'}
                  </Bouton>
                )}
              </div>

              {allTasks.length === 0 ? (
                /* === EMPTY STATE: Enriched + reduced grid === */
                <div>
                  <p className="text-sm text-encre-2 mb-3">Partez d'une liste type, puis cochez au fil du chantier.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {projectTypes.slice(0, 4).map(pt => (
                      <button
                        key={pt.key}
                        type="button"
                        onClick={() => handleInlineGenerate(pt.key)}
                        className="min-h-[48px] px-3 py-2 rounded-xl border border-bord-fort bg-surface text-left text-sm font-semibold text-encre transition-colors hover:bg-surface-2"
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                  <Bouton variante="discret" taille="compacte" iconeFin={ChevronRight} className="mt-2 -ml-2" onClick={() => setShowTaskGenerator(true)}>
                    Autres listes types
                  </Bouton>
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
                            aria-pressed={taskFilter === f.key}
                            className={`h-9 px-3 rounded-full text-sm font-semibold transition-colors ${
                              taskFilter === f.key ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-2 hover:bg-bord'
                            }`}
                          >
                            {f.label}
                            {f.key === 'critical' && criticalTasks.length > 0 && (
                              <span className="ml-1.5 tabular-nums">{criticalTasks.length}</span>
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
                            <div key={phase.id} className={`rounded-lg border border-bord`}>
                              <button onClick={() => togglePhase(phase.id)} className={`w-full flex items-center gap-2 p-2.5 text-left transition-all hover:bg-surface-2 ${isCollapsed ? 'rounded-lg' : 'rounded-t-lg'}`}>
                                <ChevronRight size={14} className={`transition-transform ${isCollapsed ? '' : 'rotate-90'} ${textMuted}`} />
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                                <span className="text-sm font-semibold flex-1 text-encre">{phase.label}</span>
                                <span className="text-sm text-encre-3 tabular-nums">{phaseProgress.done}/{phaseProgress.total}</span>
                                <div className={`w-10 h-1 rounded-full overflow-hidden bg-bord`}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${phaseProgress.percent}%`, background: phaseProgress.percent === 100 ? '#10b981' : phase.color }} />
                                </div>
                              </button>
                              {!isCollapsed && (
                                <div className="px-2.5 pb-2 space-y-0.5">
                                  {filteredPhaseTasks.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 min-h-[44px] px-1 rounded-lg group transition-colors hover:bg-surface-2/60">
                                      <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} aria-label={`${t.done ? 'Rouvrir' : 'Cocher'} : ${t.text}`} className={`w-6 h-6 rounded-md cursor-pointer flex-shrink-0 accent-[rgb(var(--accent))] ${animatedTaskId === t.id ? 'scale-125' : ''}`} style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                      <button type="button" onClick={() => setEditingTask(t)} className={`flex-1 min-w-0 py-2 text-sm text-left cursor-pointer ${t.done ? 'line-through text-encre-3' : 'text-encre'} ${t.critical ? 'font-semibold' : ''}`}>{t.text}</button>
                                      {t.critical && !t.done && <Pastille ton="danger">Prioritaire</Pastille>}
                                      <button onClick={() => setEditingTask(t)} aria-label="Modifier la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-bord`}><MoreVertical size={14} className={textMuted} /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Tasks without phase */}
                        {tasksNoPhase.length > 0 && (
                          <div className={`rounded-lg border border-bord`}>
                            <button onClick={() => togglePhase('no-phase')} className={`w-full flex items-center gap-2 p-2.5 text-left transition-all hover:bg-surface-2 ${collapsedPhases['no-phase'] ? 'rounded-lg' : 'rounded-t-lg'}`}>
                              <ChevronRight size={14} className={`transition-transform ${collapsedPhases['no-phase'] ? '' : 'rotate-90'} ${textMuted}`} />
                              <span className={`text-xs font-medium flex-1 ${textPrimary}`}>Autres tâches</span>
                              <span className={`text-xs ${textMuted}`}>{tasksNoPhase.filter(t => t.done).length}/{tasksNoPhase.length}</span>
                            </button>
                            {!collapsedPhases['no-phase'] && (
                              <div className="px-2.5 pb-2 space-y-0.5">
                                {getFilteredTasks(tasksNoPhase).map(t => (
                                  <div key={t.id} className="flex items-center gap-3 min-h-[44px] px-1 rounded-lg group transition-colors hover:bg-surface-2/60">
                                    <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} aria-label={`${t.done ? 'Rouvrir' : 'Cocher'} : ${t.text}`} className="w-6 h-6 rounded-md cursor-pointer flex-shrink-0 accent-[rgb(var(--accent))]" />
                                    <button type="button" onClick={() => setEditingTask(t)} className={`flex-1 min-w-0 py-2 text-sm text-left cursor-pointer ${t.done ? 'line-through text-encre-3' : 'text-encre'}`}>{t.text}</button>
                                    <button onClick={() => setEditingTask(t)} aria-label="Modifier la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-bord`}><MoreVertical size={14} className={textMuted} /></button>
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
                      <button onClick={() => setShowCompletedTasks(!showCompletedTasks)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all bg-surface-2 hover:bg-surface-2`}>
                        <ChevronRight size={14} className={`transition-transform ${showCompletedTasks ? 'rotate-90' : ''} ${textMuted}`} />
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span className={`text-xs font-medium ${textMuted}`}>Terminées ({completedTasks.length})</span>
                      </button>
                      {showCompletedTasks && (
                        <div className="mt-1 space-y-0.5 max-h-[150px] overflow-y-auto">
                          {completedTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-3 min-h-[44px] px-1 rounded-lg hover:bg-surface-2/60">
                              <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} aria-label={`Rouvrir : ${t.text}`} className="w-6 h-6 rounded-md cursor-pointer flex-shrink-0 accent-[rgb(var(--accent))]" />
                              <span className="flex-1 min-w-0 text-sm line-through text-encre-3">{t.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Always-visible "Ajouter une tâche" input at bottom */}
              <div className={`flex gap-2 pt-3 border-t border-bord`}>
                <input
                  placeholder="Ajouter une tâche..."
                  value={newTache}
                  onChange={e => setNewTache(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addTache()}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm min-h-[44px] ${inputBg}`}
                />
                <BoutonIcone icone={Plus} libelle="Ajouter la tâche" variante="secondaire" onClick={() => addTache()} disabled={!newTache.trim()} />
              </div>

              {/* Task edit modal */}
              {editingTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingTask(null)}>
                  <div className={`${cardBg} rounded-2xl w-full max-w-md p-4 shadow-xl`} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${textPrimary}`}>Modifier la tâche</h3>
                      <button onClick={() => setEditingTask(null)} aria-label="Fermer" className={`p-2 rounded-lg hover:bg-surface-2`}><X size={18} className={textMuted} /></button>
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
                        <button onClick={() => setEditingTask(null)} className={`px-4 py-2 rounded-xl text-sm font-medium bg-surface-2 hover:bg-bord`}>Annuler</button>
                        <button onClick={() => updateTask(editingTask.id, { text: editingTask.text, phase: editingTask.phase, critical: editingTask.critical })} className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: couleur }}>Sauvegarder</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Carte>
          );
        })()}

        {/* Quick actions remplacées par le FAB flottant (voir bas de page) */}
        <input id={`photo-quick-${ch.id}`} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoAdd(e, 'pendant')} />

        {/* P0.1: Unified smart alerts — multiple alerts stacked */}
        {chAlerts.length > 0 && (
          <div className="space-y-2">
            {chAlerts.map((alert, i) => {
              const colors = alert.severity === 'critical' ? 'bg-danger-fond text-danger-texte' : 'bg-alerte-fond text-alerte-texte';
              const iconColor = 'flex-shrink-0';
              return (
                <div key={`${alert.type}-${i}`} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${colors}`}>
                  {alert.type === 'budget' && <TrendingDown size={18} className={iconColor} />}
                  {alert.type === 'overdue' && <Clock size={18} className={iconColor} />}
                  {alert.type === 'dormant' && <AlertCircle size={18} className={iconColor} />}
                  {alert.type === 'tasks' && <AlertTriangle size={18} className={iconColor} />}
                  <span className="text-sm font-semibold">{alert.label}</span>
                </div>
              );
            })}
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
            <Carte>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold text-encre">Finances</h2>
                {bilan.hasDepenses && margeLabel && (
                  <Pastille ton={bilan.margeBrute < 0 ? 'danger' : bilan.tauxMarge < 15 ? 'alerte' : 'succes'}>{margeLabel}</Pastille>
                )}
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { cle: 'budget', libelle: 'Budget', valeur: formatMoney(revenuTotal) },
                  { cle: 'depense', libelle: 'Dépensé', valeur: formatMoney(bilan.totalDepenses) },
                  { cle: 'facture', libelle: 'Facturé', valeur: formatMoney(totalFacture) },
                  { cle: 'marge', libelle: 'Marge brute', valeur: bilan.hasDepenses ? formatPct(bilan.tauxMarge) : '—', ton: bilan.hasDepenses && bilan.margeBrute < 0 ? 'text-danger-texte' : '' },
                ].map(({ cle, libelle, valeur, ton }) => (
                  <div key={cle} className="min-w-0 rounded-xl bg-surface-2 px-3 py-2.5">
                    <dt className="text-sm text-encre-2">{libelle}</dt>
                    <dd className={`text-lg font-bold tabular-nums truncate ${ton || 'text-encre'}`}>{modeDiscret ? '•••••' : valeur}</dd>
                  </div>
                ))}
              </dl>

              {/* Avancement et budget consommé, sur la même échelle */}
              {revenuTotal > 0 && (
                <div className="space-y-2 mb-4">
                  {[
                    { cle: 'avancement', libelle: 'Avancement', pct: avancement, barre: 'bg-accent' },
                    { cle: 'budget', libelle: 'Budget consommé', pct: Math.round((bilan.totalDepenses / revenuTotal) * 100), barre: depPct > avancement && avancement > 0 ? 'bg-danger-point' : depPct > 75 ? 'bg-alerte-point' : 'bg-succes-point' },
                  ].map(({ cle, libelle, pct, barre }) => (
                    <div key={cle}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-encre-2">{libelle}</span>
                        <span className={`font-semibold tabular-nums ${pct > 100 ? 'text-danger-texte' : 'text-encre'}`}>{pct} %</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full overflow-hidden bg-surface-2">
                        <div className={`h-full rounded-full transition-all ${barre}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  ))}
                  {resteAFacturer > 0 && !modeDiscret && (
                    <p className="text-sm text-encre-2">Reste à facturer : <strong className="text-encre tabular-nums">{formatMoney(resteAFacturer)}</strong></p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3">
                <Bouton icone={Plus} onClick={() => setShowAjustement('REVENU')}>Revenu</Bouton>
                <Bouton icone={Plus} onClick={() => setShowQuickMateriau(true)}>Dépense</Bouton>
              </div>

              {/* Accordion sections */}
              <div className="space-y-1">
                {/* Revenus */}
                <button onClick={() => toggleFin('revenus')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all hover:bg-surface-2`}>
                  <ChevronRight size={14} className={`transition-transform ${finExpanded.revenus ? 'rotate-90' : ''} ${textMuted}`} />
                  <ArrowUpRight size={14} className="text-emerald-500" />
                  <span className="text-sm font-medium flex-1 text-encre">Revenus</span>
                  <span className="text-sm font-bold text-encre tabular-nums">{formatMoney(revenuTotal)}</span>
                </button>
                {finExpanded.revenus && (
                  <div className={`ml-6 p-3 rounded-lg space-y-2 bg-surface-2`}>
                    <div className="flex justify-between"><span className={`text-xs ${textMuted}`}>Montant devis</span><span className={`text-xs font-medium ${textPrimary}`}>{bilan.revenuPrevu > 0 ? formatMoney(bilan.revenuPrevu) : 'Non défini'}</span></div>
                    {(bilan.adjRevenus || 0) > 0 && <div className="flex justify-between"><span className={`text-xs ${textMuted}`}>Travaux suppl.</span><span className="text-xs font-medium text-emerald-600">+{formatMoney(bilan.adjRevenus)}</span></div>}
                    {bilan.revenuEncaisse > 0 && <div className="flex justify-between"><span className={`text-xs ${textMuted}`}>Encaissé</span><span className="text-xs font-medium text-emerald-600">{formatMoney(bilan.revenuEncaisse)}</span></div>}
                  </div>
                )}

                {/* Dépenses */}
                <button onClick={() => toggleFin('depenses')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all hover:bg-surface-2`}>
                  <ChevronRight size={14} className={`transition-transform ${finExpanded.depenses ? 'rotate-90' : ''} ${textMuted}`} />
                  <ArrowDownRight size={14} className="text-red-500" />
                  <span className="text-sm font-medium flex-1 text-encre">Dépenses</span>
                  <span className="text-sm font-bold text-encre tabular-nums">{formatMoney(bilan.totalDepenses)}</span>
                </button>
                {finExpanded.depenses && (
                  <div className={`ml-6 p-3 rounded-lg space-y-1 bg-surface-2`}>
                    <button type="button" className="flex justify-between items-center w-full text-left cursor-pointer p-1.5 rounded hover:opacity-80 focus-visible:ring-2 outline-none" onClick={() => setShowQuickMateriau(true)}>
                      <span className={`text-xs ${textMuted} flex items-center gap-1.5`}><Package size={14} /> Matériaux</span>
                      <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutMateriaux)}</span>
                    </button>
                    <button type="button" className="flex justify-between items-center w-full text-left cursor-pointer p-1.5 rounded hover:opacity-80 focus-visible:ring-2 outline-none" onClick={() => setShowMODetail(true)}>
                      <span className={`text-xs ${textMuted} flex items-center gap-1.5`}><UserCog size={14} /> Main d'oeuvre ({bilan.heuresTotal}h)</span>
                      <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutMO)}</span>
                    </button>
                    {(bilan.heuresSansCout || 0) > 0 && (
                      <p className="text-xs px-1.5 text-alerte-texte">
                        {bilan.heuresSansCout.toLocaleString('fr-FR')} h sans coût horaire : la marge est incomplète. Renseignez le coût dans Équipe.
                      </p>
                    )}
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
                    <button onClick={() => toggleFin('objectifs')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all hover:bg-surface-2`}>
                      <ChevronRight size={14} className={`transition-transform ${finExpanded.objectifs ? 'rotate-90' : ''} ${textMuted}`} />
                      <Target size={14} className="text-amber-500" />
                      <span className="text-sm font-medium flex-1 text-encre">Objectifs et réel</span>
                    </button>
                    {finExpanded.objectifs && (
                      <div className={`ml-6 p-3 rounded-lg space-y-3 bg-surface-2`}>
                        {ch.budget_materiaux > 0 && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs ${textMuted}`}>Matériaux</span>
                              <span className={`text-xs font-medium ${bilan.coutMateriaux > ch.budget_materiaux ? 'text-red-500' : 'text-emerald-500'}`}>{formatMoney(bilan.coutMateriaux)} / {formatMoney(ch.budget_materiaux)}</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden bg-surface`}>
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
                            <div className={`h-1.5 rounded-full overflow-hidden bg-surface`}>
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
                    <button onClick={() => toggleFin('projection')} className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all hover:bg-surface-2`}>
                      <ChevronRight size={14} className={`transition-transform ${finExpanded.projection ? 'rotate-90' : ''} ${textMuted}`} />
                      <BarChart3 size={14} style={{ color: couleur }} />
                      <span className="text-sm font-medium flex-1 text-encre">Projection fin de chantier</span>
                    </button>
                    {finExpanded.projection && (
                      <div className={`ml-6 p-3 rounded-lg bg-surface-2`}>
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
            </Carte>
          );
        })()}

        {/* === SECTION: DÉTAILS DU CHANTIER === */}
        <h2 className="pt-2 text-lg font-semibold text-encre">Détails du chantier</h2>
        {/* Onglets détail chantier */}
        <TabBar
          tabs={[
            { key: 'photos', label: 'Photos', icon: Camera, badge: (ch.photos || []).length > 0 ? (ch.photos || []).length : undefined },
            { key: 'finances', label: 'Finances', icon: Wallet },
            { key: 'situations', label: 'Situations', icon: Receipt },
            { key: 'messages', label: 'Messages', icon: MessageSquare, badge: (ch.messages || []).filter(m => !m.read).length > 0 ? (ch.messages || []).filter(m => !m.read).length : undefined },
            { key: 'documents', label: 'Documents', icon: Paperclip },
            { key: 'soustraitants', label: 'Sous-trait.', icon: UserCog },
            ...(FONCTIONS.receptionChantier && (chantierReception || ch.statut === 'termine') ? [{ key: 'garanties', label: 'Garanties', icon: Shield, badge: chantierGaranties.filter(g => g.statut === 'active').length > 0 ? chantierGaranties.filter(g => g.statut === 'active').length : undefined }] : []),
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
              <div className="space-y-2 mb-4">{chDepenses.map(d => (<div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl bg-surface-2`}><span className={`text-sm w-24 ${textMuted}`}>{dateLue(d.date).toLocaleDateString('fr-FR')}</span><span className={`flex-1 ${textPrimary}`}>{d.description}</span><span className={`text-xs px-2 py-1 rounded bg-bord text-encre-2`}>{d.categorie}</span><span className="font-bold text-red-500">{formatMoney(d.montant)}</span></div>))}{chDepenses.length === 0 && <p className={`text-center py-4 ${textMuted}`}>Aucune dépense</p>}</div>
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
                <h3 className="text-base font-semibold text-encre">Carnet photos</h3>
                <p className="text-sm text-encre-2 mt-0.5">Chaque photo garde sa date et son heure : utile en cas de désaccord.</p>
              </div>
              {(() => {
                const photoLimit = useSubscriptionStore.getState().getLimit('photos');
                if (photoLimit === -1) return null;
                const totalPhotos = chantiers.reduce((s, c) => s + (c.photos?.length || 0), 0);
                const atLimit = totalPhotos >= photoLimit;
                const near = totalPhotos >= photoLimit * 0.8;
                return (
                  <button
                    type="button"
                    onClick={atLimit ? () => useSubscriptionStore.getState().openUpgradeModal('photos') : undefined}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${atLimit ? 'bg-red-100 text-red-700' : near ? 'bg-amber-100 text-amber-700' : ('bg-surface-2 text-encre-2')}`}
                    title={atLimit ? 'Limite atteinte — passer à un plan supérieur' : `${totalPhotos} photos sur ${photoLimit}`}
                  >
                    {totalPhotos} / {photoLimit} photos{atLimit ? ' — Upgrade' : ''}
                  </button>
                );
              })()}
            </div>

            {/* Photo capture buttons - Big touch targets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {PHOTO_CATS.map(cat => (
                <label
                  key={cat}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl cursor-pointer font-semibold min-h-[64px] border transition-colors ${cat === 'litige' ? 'border-danger-point/40 text-danger-texte hover:bg-danger-fond' : 'border-bord-fort text-encre hover:bg-surface-2'}`}
                >
                  <Camera size={20} aria-hidden="true" />
                  <span className="text-sm first-letter:uppercase">{cat}</span>
                  <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoAdd(e, cat)} className="hidden" />
                </label>
              ))}
            </div>

            {/* Photos grid with timestamp badges */}
            {(!ch.photos || ch.photos.length === 0) ? (
              <div className="px-6 py-8 text-center rounded-xl bg-surface-2">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-surface text-encre-3">
                  <Camera size={24} aria-hidden="true" />
                </div>
                <p className="text-base font-semibold mb-1 text-encre">Aucune photo pour l'instant</p>
                <p className="text-sm mb-4 text-encre-2">Une photo avant de commencer garde l'état des lieux, avec sa date et son heure.</p>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoAdd(e, 'pendant')} />
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
                {[...PHOTO_CATS, 'autres'].map(cat => {
                  const catPhotos = (ch.photos || []).filter(p => cat === 'autres' ? !PHOTO_CATS.includes(p.categorie) : p.categorie === cat);
                  if (catPhotos.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className={`text-sm font-semibold mb-2 first-letter:uppercase ${cat === 'litige' ? 'text-danger-texte' : 'text-encre'}`}>
                        {cat} <span className="font-medium text-encre-3 tabular-nums">{catPhotos.length}</span>
                      </p>
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {catPhotos.map(p => (
                          <div key={p.id} className="relative group flex-shrink-0">
                          <button type="button" className="relative block cursor-pointer focus-visible:ring-2 outline-none rounded-xl" onClick={() => setPhotoPreview(p)} aria-label={`Voir la photo (${cat})`}>
                            <img src={p.src} className={`w-28 h-28 object-cover rounded-xl hover:opacity-90 transition-opacity border-2 ${cat === 'litige' ? 'border-danger-point' : 'border-bord'}`}
                                 alt={`Photo ${cat} du chantier - ${p.date ? dateLue(p.date).toLocaleDateString('fr-FR') : ''}`} />
                            {/* Timestamp badge - Proof for litigation */}
                            <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 rounded-b-lg text-xs text-white font-medium ${
                              cat === 'litige' ? 'bg-red-600/90' : 'bg-black/70'
                            }`}>
                              {p.date ? dateLue(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                              {p.date && <span className="ml-1 opacity-75">{new Date(p.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          </button>
                            {/* Supprimer : à côté de la photo, pas dedans (un bouton dans un bouton est invalide) */}
                            <button
                              type="button"
                              onClick={() => deletePhoto(p.id)}
                              aria-label="Supprimer la photo"
                              className="absolute -top-2 -right-2 w-11 h-11 bg-surface border border-bord-fort text-danger-texte rounded-full sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center shadow-e2 transition-opacity"
                            >
                              <X size={18} />
                            </button>
                          </div>
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
                    <div className={`p-8 text-center rounded-xl bg-surface-2`}>
                      <FolderOpen size={24} className={`mx-auto mb-2 ${textMuted}`} />
                      <p className={textMuted}>Aucun document</p>
                      <p className={`text-xs ${textMuted} mt-1`}>Ajoutez vos plans, permis et attestations</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {docs.map(doc => (
                        <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl bg-surface-2`}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                            <FileText size={18} style={{ color: couleur }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${textPrimary}`}>{doc.nom}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded bg-bord text-encre-2`}>{doc.categorie}</span>
                              <span className={`text-xs ${textMuted}`}>{dateLue(doc.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.data && (
                              <a href={doc.data} download={doc.nom} className={`p-2 rounded-lg hover:bg-bord`} title="Télécharger">
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
                  <div className={`p-4 rounded-xl border bg-surface-2 border-bord`}>
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
                  <div className={`p-8 text-center rounded-xl bg-surface-2`}>
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
                      <div key={st.id || idx} className={`p-4 rounded-xl border bg-surface-2 border-bord`}>
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
                          <div className={`mt-3 pt-3 border-t flex items-center gap-4 text-xs border-bord ${textMuted}`}>
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
                        <div key={m.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-2`}>
                          <button
                            onClick={() => toggleMemo?.(m.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-bord-fort`}
                            aria-label="Marquer comme fait"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${textPrimary}`}>{m.text}</p>
                            {m.due_date && (
                              <span className={`text-xs ${m.due_date < jourLocal() ? 'text-red-500' : textMuted}`}>
                                {dateLue(m.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
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
                    <div className={`p-8 text-center rounded-xl bg-surface-2`}>
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
                <div className={`p-8 text-center rounded-xl bg-surface-2`}>
                  <MessageSquare size={24} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={textMuted}>Aucun échange enregistré</p>
                </div>
              ) : (
                ch.messages.map(msg => (
                  <div key={msg.id} className={`p-4 rounded-xl bg-surface-2`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${msg.type === 'email' ? 'bg-blue-100 text-blue-700' : msg.type === 'sms' ? 'bg-green-100 text-green-700' : msg.type === 'appel' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>{msg.type === 'email' ? 'Email' : msg.type === 'sms' ? 'SMS' : msg.type === 'appel' ? 'Appel' : 'Note'}</span>
                      <span className={`text-xs ${textMuted}`}>{dateLue(msg.date).toLocaleDateString('fr-FR')} - {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => updateChantier(ch.id, { messages: ch.messages.filter(m => m.id !== msg.id) })} aria-label="Supprimer le message" className={`ml-auto p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center text-red-400 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 `}><X size={16} /></button>
                    </div>
                    <p className={`text-sm ${textPrimary}`}>{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add new message */}
            <div className={`p-4 rounded-xl border bg-surface-2 border-bord`}>
              <div className="flex gap-2 mb-3">
                {['email', 'sms', 'appel', 'note'].map(type => (
                  <button key={type} onClick={() => setNewMessage && setNewMessage(p => ({ ...p, type }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${(newMessage?.type || 'email') === type ? 'text-white' : 'bg-surface text-encre-2'}`} style={(newMessage?.type || 'email') === type ? { background: couleur } : {}}>
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
                    download={`${ch.nom?.replace(/\s+/g, '_')}_${photoPreview.categorie}_${photoPreview.date ? jourLocal(new Date(photoPreview.date)) : 'photo'}.jpg`}
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
                    {photoPreview.date ? dateLue(photoPreview.date).toLocaleDateString('fr-FR', {
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
                  <Clock size={14} /> Photo datée
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajustement */}
        {showAjustement && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>{showAjustement === 'REVENU' ? ' Ajustement Revenu' : ' Ajustement Dépense'}</h3>
              <p className="text-sm text-slate-500 mb-4">{showAjustement === 'REVENU' ? 'Ex: Travaux supplémentaires acceptés' : 'Ex: Achat imprévu, sous-traitance...'}</p>
              <div className="space-y-4">
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Travaux supplémentaires, Remise..." value={adjForm.libelle} onChange={e => setAdjForm(p => ({...p, libelle: e.target.value}))} />
                <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Montant € HT" value={adjForm.montant_ht} onChange={e => setAdjForm(p => ({...p, montant_ht: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowAjustement(null); setAdjForm({ libelle: '', montant_ht: '' }); }} className={`px-4 py-2 rounded-xl bg-surface-2`}>Annuler</button><button onClick={handleAddAjustement} className={`px-4 py-2 text-white rounded-xl ${showAjustement === 'REVENU' ? 'bg-emerald-500' : 'bg-red-500'}`}>Ajouter</button></div>
            </div>
          </div>
        )}

        {/* Modal Ajouter une dépense / Besoin de matériel */}
        {showQuickMateriau && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowQuickMateriau(false)}>
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>📦 Besoin de matériel</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Enregistrez un achat de matériel pour ce chantier</p>

              {/* Quick picks - Missing materials from devis */}
              {(() => {
                // Fournitures du devis seulement : les lignes venues du catalogue avec un prix d'achat. Avant (recette
                // du 9 oct. 2026), toutes les lignes, prestations comprises, et au PRIX DE VENTE : « Pose douche
                // italienne » enregistrée comme dépense de 2 500 €, la marge s'effondrait.
                const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
                const plannedItems = (devisLie?.lignes || []).filter(item => Number(item.prixAchat ?? item.prix_achat) > 0 && item.description);
                const chDepenses = depenses.filter(d => d.chantierId === ch.id);
                const missingItems = plannedItems.filter(item =>
                  !chDepenses.some(d => d.description.toLowerCase().includes(item.description.toLowerCase().split(' ')[0]))
                ).slice(0, 4);

                if (missingItems.length === 0) return null;

                return (
                  <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 text-alerte-texte`}>
                      Fournitures prévues au devis, pas encore achetées
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setNewDepense(p => ({ ...p, description: item.description, montant: (Number(item.prixAchat ?? item.prix_achat) * (Number(item.quantite) || 1)).toFixed(2) }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 min-h-[44px] ${
                            'bg-surface hover:bg-surface-2 text-encre-2 shadow-sm'
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
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold bg-surface-2 hover:bg-bord`}
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
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold bg-surface-2 hover:bg-bord`}
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
                  className={`flex-1 px-4 py-3 rounded-xl min-h-[52px] font-medium bg-surface-2 text-encre-2`}
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

              {/* (« Besoin urgent (notifier le patron) » retiré : il annonçait « Demande urgente envoyée » sans rien
                  envoyer — recette du 9 oct. 2026) */}
            </div>
          </div>
        )}

        {/* Modal MO */}
        {showMODetail && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-lg animate-slide-up sm:animate-fade-in max-h-[85vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">⏱ Détail Main d'oeuvre</h3><button onClick={() => setShowAddMO(true)} className="px-3 py-1.5 text-sm text-white rounded-lg" style={{background: couleur}}>+ Heures</button></div>
              <div className="space-y-2 mb-4">{chPointages.map(p => { const emp = equipe.find(e => e.id === p.employeId); const cout = coutHoraire(emp) || 0; return (
                <div key={p.id} className={`p-3 rounded-xl ${p.manuel ? 'bg-blue-50' : 'bg-slate-50'} ${p.verrouille ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span>{p.approuve ? '[OK]' : '⏳'}</span>{p.manuel && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Manuel</span>}{p.verrouille && <span className="text-xs bg-slate-400 text-white px-2 py-0.5 rounded"></span>}</div>{!p.verrouille && <button onClick={() => deletePointage(p.id)} aria-label="Supprimer le pointage" className="text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"></button>}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm"><div><p className="text-xs text-slate-500">Date</p><input type="date" value={p.date} onChange={e => handleEditPointage(p.id, 'date', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded text-xs" /></div><div><p className="text-xs text-slate-500">Employé</p><p className="font-medium">{emp?.nom}</p></div><div><p className="text-xs text-slate-500">Heures</p><input type="number" step="0.5" value={p.heures} onChange={e => handleEditPointage(p.id, 'heures', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded" /></div><div><p className="text-xs text-slate-500">Coût</p><p className="font-bold text-blue-600">{formatMoney(p.heures * cout)}</p></div></div>
                </div>
              ); })}{chPointages.length === 0 && <p className={`text-center py-4 text-encre-3`}>Aucun pointage</p>}</div>
              <div className="border-t pt-4 flex justify-between items-center"><span className="font-semibold">Total</span><span className="text-xl font-bold text-blue-600">{formatMoney(bilan.coutMO)}</span></div>
              <button onClick={() => setShowMODetail(false)} className={`w-full mt-4 py-2 rounded-xl bg-surface-2`}>Fermer</button>
            </div>
          </div>
        )}

        {/* Modal Ajout MO */}
        {showAddMO && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Pointer des heures</h3>
              {equipe.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-encre-2">Pour pointer des heures, ajoutez d'abord la personne (vous-même ou un salarié) dans Équipe.</p>
                  <div className="flex justify-end gap-2">
                    <Bouton variante="discret" onClick={() => setShowAddMO(false)}>Fermer</Bouton>
                    <Bouton onClick={() => { setShowAddMO(false); setPage?.('equipe'); }}>Ouvrir Équipe</Bouton>
                  </div>
                </div>
              ) : (<>
              <div className="space-y-4">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.employeId} onChange={e => setMoForm(p => ({...p, employeId: e.target.value}))} aria-label="Sélectionner un employé"><option value="">Employé *</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select>
                <div className="grid grid-cols-2 gap-4"><input type="date" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.date} onChange={e => setMoForm(p => ({...p, date: e.target.value}))} aria-label="Date du pointage" /><input type="number" step="0.5" placeholder="Nb heures *" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.heures} onChange={e => setMoForm(p => ({...p, heures: e.target.value}))} aria-label="Nombre d'heures" /></div>
                <input placeholder="Ex: Pose carrelage salle de bain..." className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.note} onChange={e => setMoForm(p => ({...p, note: e.target.value}))} aria-label="Note ou description du travail" />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowAddMO(false)} className={`px-4 py-2 rounded-xl bg-surface-2`}>Annuler</button><button onClick={handleAddMO} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button></div>
              </>)}
            </div>
          </div>
        )}

        {/* Modal Edit Budget */}
        {showEditBudget && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowEditBudget(false)}>
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Modifier le budget</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Définissez le budget prévisionnel HT pour ce chantier.</p>
              {devisLie && (
                <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm text-info-texte`}>
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
                <button onClick={() => setShowEditBudget(false)} className={`flex-1 px-4 py-2.5 rounded-xl bg-surface-2`}>Annuler</button>
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
            <div className={`bg-surface rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`p-5 border-b border-bord`}>
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
                  <button onClick={() => setShowTaskTemplates(false)} aria-label="Fermer" className={`p-2 rounded-xl hover:bg-surface-2`}>
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
                            : 'bg-surface-2 hover:bg-bord text-encre-2'
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
                        <div key={key} className={`p-4 rounded-xl border bg-surface-2 border-bord`}>
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
                              <span key={i} className={`text-xs px-2 py-1 rounded bg-surface text-encre-2`}>
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
              <div className={`p-4 border-t border-bord`}>
                <button
                  onClick={() => setShowTaskTemplates(false)}
                  className={`w-full py-3 rounded-xl font-medium bg-surface-2 hover:bg-bord text-encre-2`}
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
      {/* z-40 : sous les fenêtres (z-50), sinon le bouton masquait un champ du formulaire d'heures */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6 z-40 flex flex-col-reverse items-end gap-3">
        {/* Sub-buttons */}
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); setShowAddMO(true); }}
              className="flex items-center gap-2 min-h-[44px] pl-4 pr-5 rounded-full bg-surface text-encre border border-bord shadow-e3 transition-colors hover:bg-surface-2"
            >
              <Clock size={18} />
              <span className="font-semibold text-sm whitespace-nowrap">Pointer</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); setShowQuickMateriau(true); }}
              className="flex items-center gap-2 min-h-[44px] pl-4 pr-5 rounded-full bg-surface text-encre border border-bord shadow-e3 transition-colors hover:bg-surface-2"
            >
              <Coins size={18} />
              <span className="font-semibold text-sm whitespace-nowrap">Dépense</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); document.getElementById(`photo-quick-${ch.id}`)?.click(); }}
              className="flex items-center gap-2 min-h-[44px] pl-4 pr-5 rounded-full bg-surface text-encre border border-bord shadow-e3 transition-colors hover:bg-surface-2"
            >
              <Camera size={18} />
              <span className="font-semibold text-sm whitespace-nowrap">Photo</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); setActiveTab('notes'); }}
              className="flex items-center gap-2 min-h-[44px] pl-4 pr-5 rounded-full bg-surface text-encre border border-bord shadow-e3 transition-colors hover:bg-surface-2"
            >
              <StickyNote size={18} />
              <span className="font-semibold text-sm whitespace-nowrap">Mémo</span>
            </button>
            {onPlanEvent && (
              <button
                onClick={() => { setFabOpen(false); onPlanEvent({ type: 'rdv', title: `Intervention ${ch.nom}`, clientId: ch.client_id || ch.clientId || '', description: ch.adresse || '', date: jourLocal() }); }}
                className="flex items-center gap-2 min-h-[44px] pl-4 pr-5 rounded-full bg-surface text-encre border border-bord shadow-e3 transition-colors hover:bg-surface-2"
              >
                <CalendarPlus size={18} />
                <span className="font-semibold text-sm whitespace-nowrap">Planifier</span>
              </button>
            )}
          </>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-14 h-14 rounded-full shadow-e3 bg-accent text-sur-accent flex items-center justify-center transition-transform hover:brightness-95 ${fabOpen ? 'rotate-45' : ''}`}
          aria-label={fabOpen ? 'Fermer' : 'Actions rapides'}
        >
          {fabOpen ? (
            <X size={24} />
          ) : (
            <Plus size={24} />
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
    // Attendre le résultat (avant : « Chantier créé » et formulaire fermé même à la limite du plan gratuit,
    // saisie perdue — recette du 9 oct. 2026). Le message de succès vient de l'enveloppe d'App.jsx.
    const newChantier = await addChantier({
      ...formData,
      client_id: clientIdValue,
      clientId: clientIdValue,
      dateDebut: formData.dateDebut || formData.date_debut || jourLocal(),
      date_debut: formData.date_debut || formData.dateDebut || jourLocal(),
      dateFin: formData.dateFin || formData.date_fin || null,
      date_fin: formData.date_fin || formData.dateFin || null,
      budgetPrevu: budgetValue,
      budget_estime: budgetValue,
      budget_materiaux: formData.budget_materiaux || 0,
      heures_estimees: formData.heures_estimees || 0,
      statut: 'prospect'
    });
    if (!newChantier) return; // refus : le formulaire reste ouvert avec la saisie
    setShow(false);
    if (newChantier.id) setView(newChantier.id);
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
    return { monday, sunday, mondayStr: jourLocal(monday), sundayStr: jourLocal(sunday) };
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
  const budgetEnCours = nonDraftNonArchive
    .filter(c => c.statut === 'en_cours')
    .reduce((s, c) => s + (c.budget_estime || c.budgetPrevu || 0), 0);

  // Liste
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Building2}
        title="Chantiers"
        subtitle="Suivi de vos projets"
        isDark={isDark}
        color={couleur}
        action={canPerform('chantier', 'create') ? (
          <Bouton variante="principal" icone={Plus} onClick={() => setShow(true)}>Nouveau chantier</Bouton>
        ) : null}
      />

      {/* Vues : un segment lisible (avant : quatre icônes sans nom, l'active remplie d'accent) */}
      <Segmente
        ariaLabel="Vue des chantiers" pleineLargeur className="sm:w-auto sm:inline-flex"
        valeur={viewMode} onChange={setViewMode}
        options={[{ valeur: 'list', libelle: 'Liste' }, { valeur: 'gantt', libelle: 'Frise' }, { valeur: 'map', libelle: 'Carte' }, ...(FONCTIONS.receptionChantier ? [{ valeur: 'garanties', libelle: 'Garanties' }] : [])]}
      />

      {/* === BANDE KPI (design system énergique) === */}
      {nonDraftNonArchive.length > 0 && (
        <div className="bandeau-chiffres grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            icon={Building2} color={couleur} label="En cours"
            value={String(statusCounts.en_cours)}
            isDark={isDark}
            onClick={() => setFilterStatus(filterStatus === 'en_cours' ? 'all' : 'en_cours')}
          />
          <KPICard
            icon={Wallet} tone="money" label="Budget en cours"
            value={modeDiscret ? '···' : formatMoney(budgetEnCours)}
            isDark={isDark}
          />
          <KPICard
            icon={Target} tone="info" label="Prospects"
            value={String(statusCounts.prospect)}
            isDark={isDark}
            onClick={() => setFilterStatus(filterStatus === 'prospect' ? 'all' : 'prospect')}
          />
          <KPICard
            icon={CheckCircle} tone="money" label="Terminés"
            value={String(statusCounts.termine)}
            isDark={isDark}
            onClick={() => setFilterStatus(filterStatus === 'termine' ? 'all' : 'termine')}
          />
        </div>
      )}

      {/* === BANDEAU AUJOURD'HUI — compact sticky 60px === */}
      {(() => {
        const today = jourLocal();
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
          <div className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden">
            {/* En-tête : repli de la liste ; « Créer » à côté (plus de bouton dans un bouton) */}
            <div className="flex items-center gap-2 pr-3">
              <button
                type="button"
                onClick={() => chantiersToday.length > 0 && setTodayCollapsed(!todayCollapsed)}
                aria-expanded={chantiersToday.length > 0 ? !todayCollapsed : undefined}
                className="flex-1 min-w-0 min-h-[52px] px-4 flex items-center gap-2 text-left"
              >
                {chantiersToday.length > 0
                  ? <span className="w-2 h-2 rounded-full bg-succes-point flex-shrink-0" aria-hidden="true" />
                  : <Calendar size={16} className="flex-shrink-0 text-encre-3" aria-hidden="true" />}
                <span className="text-base font-semibold text-encre truncate">
                  {chantiersToday.length > 0 ? `Aujourd'hui · ${chantiersToday.length} chantier${chantiersToday.length > 1 ? 's' : ''}` : "Aucun chantier aujourd'hui"}
                </span>
                {tachesEnAttente > 0 && <Pastille ton="alerte">{tachesEnAttente} tâche{tachesEnAttente > 1 ? 's' : ''}</Pastille>}
                {chantiersToday.length > 0 && (todayCollapsed ? <ChevronDown size={18} className="ml-auto flex-shrink-0 text-encre-3" /> : <ChevronUp size={18} className="ml-auto flex-shrink-0 text-encre-3" />)}
              </button>
              {chantiersToday.length === 0 && <Bouton taille="compacte" icone={Plus} onClick={() => setShow(true)}>Créer</Bouton>}
            </div>
            {chantiersToday.length > 0 && !todayCollapsed && (
              <div className="border-t border-bord divide-y divide-bord">
                {chantiersToday.slice(0, 4).map(c => {
                  const cl = clients.find(x => x.id === c.client_id);
                  const lieu = c.adresse || c.ville;
                  return (
                    <div key={c.id} className="flex items-center">
                      <LigneListe
                        className="flex-1 min-w-0"
                        onClick={() => setView(c.id)}
                        chevron={!lieu}
                        titre={c.nom}
                        meta={[cl ? formatClientName(cl, '') : '', c.ville || c.adresse].filter(Boolean).join(' · ')}
                      />
                      {lieu && (
                        <BoutonIcone
                          icone={Navigation} variante="secondaire" className="mr-3" libelle={`Itinéraire vers ${c.nom}`}
                          onClick={() => {
                            const address = encodeURIComponent(`${c.adresse || ''} ${c.codePostal || ''} ${c.ville || ''}`);
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            const isAndroid = /Android/.test(navigator.userAgent);
                            if (isIOS) window.open(`maps://maps.apple.com/?q=${address}`, '_blank');
                            else if (isAndroid) window.open(`geo:0,0?q=${address}`, '_blank');
                            else window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                          }}
                        />
                      )}
                    </div>
                  );
                })}
                {chantiersToday.length > 4 && <p className="text-sm text-center py-2.5 text-encre-3">et {chantiersToday.length - 4} autre{chantiersToday.length - 4 > 1 ? 's' : ''}</p>}
              </div>
            )}
          </div>
        );
      })()}


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
              <div className={`flex items-start gap-3 p-3 rounded-xl bg-surface`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <DollarSign size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Suivi financier</p>
                  <p className={`text-xs ${textMuted}`}>Dépenses, revenus et marge</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl bg-surface`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <Camera size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Carnet photos</p>
                  <p className={`text-xs ${textMuted}`}>Avant, pendant, après</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl bg-surface`}>
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
          {/* Recherche, statut, filtres et tri — boîte à outils commune (ui/Filtres.jsx). Avant : puces
              remplies de 7 couleurs, deux listes déroulantes natives, recherche séparée plus haut. */}
          {(() => {
            const TRIS = [['recent', 'Plus récents'], ['name', 'Nom de A à Z'], ['status', 'Par statut'], ['margin', 'Par marge']];
            const clientChoisi = clients.find(c => c.id === filterClient);
            const statuts = [
              { key: 'all', label: 'Tous' },
              { key: 'cette_semaine', label: 'Cette semaine' },
              { key: 'en_cours', label: 'En cours' },
              { key: 'prospect', label: 'Prospects' },
              { key: 'termine', label: 'Terminés' },
              ...(brouillonsCount > 0 ? [{ key: 'brouillons', label: 'Brouillons' }] : []),
              ...(archivedCount > 0 ? [{ key: 'archive', label: 'Archivés' }] : []),
            ];
            return (
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <ChampRecherche valeur={searchQuery} onChange={setSearchQuery} placeholder="Rechercher…" ariaLabel="Rechercher un chantier, un client ou une adresse" isDark={isDark} className="flex-1" />
                  {clients.length > 1 && (
                    <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={filterClient ? 1 : 0} ouvert={voletListe === 'filtres'} onClick={() => setVoletListe(v => (v === 'filtres' ? null : 'filtres'))} isDark={isDark} libelleCacheTelephone />
                  )}
                  {chantiers.length > 1 && (
                    <BoutonVolet ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={TRIS.find(t => t[0] === sortBy)?.[1]} ouvert={voletListe === 'tri'} onClick={() => setVoletListe(v => (v === 'tri' ? null : 'tri'))} isDark={isDark} libelleCacheTelephone />
                  )}
                </div>
                <SegmentDefilant
                  ariaLabel="Statut des chantiers" isDark={isDark}
                  options={statuts.map(t => ({ valeur: t.key, libelle: t.label, compte: statusCounts[t.key] }))}
                  valeur={filterStatus} onChange={setFilterStatus}
                />
                <PucesActives
                  puces={filterClient ? [{ cle: 'client', libelle: clientChoisi ? formatClientName(clientChoisi) : 'Client', onRetirer: () => setFilterClient('') }] : []}
                  onToutEffacer={() => setFilterClient('')} isDark={isDark}
                />
                <Volet
                  ouvert={voletListe === 'filtres'} onFermer={() => setVoletListe(null)} titre="Filtres" ancreRef={boutonFiltresRef} largeur={340} isDark={isDark}
                  pied={(
                    <Bouton variante="principal" pleineLargeur onClick={() => setVoletListe(null)}>
                      Voir {getFilteredAndSortedChantiers().length} chantier{getFilteredAndSortedChantiers().length > 1 ? 's' : ''}
                    </Bouton>
                  )}
                >
                  <ListeChoix
                    titre="Client" placeholder="Rechercher un client" isDark={isDark}
                    options={[{ valeur: '', libelle: 'Tous les clients', toujours: true }, ...clients.map(c => ({ valeur: c.id, libelle: formatClientName(c) }))]}
                    valeur={filterClient} onChange={setFilterClient}
                  />
                </Volet>
                <Volet ouvert={voletListe === 'tri'} onFermer={() => setVoletListe(null)} titre="Trier les chantiers" ancreRef={boutonTriRef} largeur={300} isDark={isDark}>
                  <ListeChoix
                    titre="Trier par" rechercheAuDela={99} isDark={isDark}
                    options={TRIS.map(([valeur, libelle]) => ({ valeur, libelle }))}
                    valeur={sortBy} onChange={(v) => { setSortBy(v); setVoletListe(null); }}
                  />
                </Volet>
              </div>
            );
          })()}
          {/* Gantt View */}
          {viewMode === 'gantt' && (
            <Suspense fallback={<div className={`h-[400px] rounded-xl flex items-center justify-center bg-surface-2`}><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} /></div>}>
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
                <div className={`h-[500px] rounded-xl flex flex-col items-center justify-center gap-3 bg-surface-2 text-encre-2`}>
                  <AlertTriangle size={24} className="text-amber-500" />
                  <p className="font-medium">La carte n'a pas pu se charger</p>
                  <button onClick={() => setViewMode('list')} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: couleur }}>
                    Revenir à la liste
                  </button>
                </div>
              }
            >
              <Suspense fallback={<div className={`h-[500px] rounded-xl flex items-center justify-center bg-surface-2`}><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} /></div>}>
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
            <Suspense fallback={<div className={`h-[400px] rounded-xl flex items-center justify-center bg-surface-2`}><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} /></div>}>
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
                onClick={() => { setChantierDuplicateDismissed(true); try { localStorage.setItem('chantierDuplicateDismissed', 'true'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}
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
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              return { text: `J-${d}`, color: 'text-encre-3' };
            })();
            const statusLabel = ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : ch.statut === 'archive' ? 'Archivé' : 'Prospect';
            const statusHex = ch.statut === 'en_cours' ? couleur : ch.statut === 'termine' ? '#10b981' : ch.statut === 'archive' ? '#94a3b8' : '#3b82f6';

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
              const d = ch.date_debut ? dateLue(ch.date_debut).toLocaleDateString('fr-FR', opts) : null;
              const f = ch.date_fin ? dateLue(ch.date_fin).toLocaleDateString('fr-FR', opts) : null;
              if (d && f) return `${d} → ${f}`;
              if (d) return `Début : ${d}`;
              if (f) return `Fin : ${f}`;
              return null;
            };
            const dateRange = formatDateRange();

            // Carte de chantier (refonte du 9 oct. 2026 — revue exploitation, problème 11) : le statut dit
            // UNE fois (pastille), « client · ville », l'avancement, la fin et le montant ; l'alerte de marge
            // seulement si besoin. Avant : liseré + point + pastille, « #004 », « J-126 », boutons dans le
            // bouton de la carte (HTML invalide).
            const finTexte = (() => {
              if (!ch.date_fin || ['termine', 'archive'].includes(ch.statut)) return null;
              const df = new Date(ch.date_fin); df.setHours(0, 0, 0, 0);
              const auj = new Date(); auj.setHours(0, 0, 0, 0);
              const j = Math.round((df - auj) / 86400000);
              if (j < 0) return { texte: `Fin dépassée de ${-j} j`, ton: 'text-danger-texte font-semibold' };
              if (j === 0) return { texte: "Fin prévue aujourd'hui", ton: 'text-alerte-texte font-semibold' };
              if (j <= 7) return { texte: `Fin dans ${j} j`, ton: 'text-alerte-texte font-semibold' };
              return { texte: `Fin le ${df.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`, ton: 'text-encre-3' };
            })();
            const villeCh = ch.ville || (String(ch.adresse || '').match(/\b\d{5}\s+([^,\n]+)\s*$/) || [])[1] || '';
            const metaCh = [client ? formatClientName(client, 'Sans client') : 'Sans client', villeCh].filter(Boolean).join(' · ');
            const margeNegative = bilan.hasDepenses && bilan.tauxMarge < 0;
            return (
              <article key={ch.id} data-ui="Carte" className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden flex flex-col">
                <button type="button" onClick={() => setView(ch.id)} aria-label={`Ouvrir le chantier ${ch.nom}`} className="flex-1 w-full text-left p-4 transition-colors hover:bg-surface-2/60 active:bg-surface-2">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-semibold leading-snug text-encre line-clamp-2">{ch.nom}</span>
                    <span className="flex-shrink-0"><PastilleStatut genre="chantier" statut={ch.statut} /></span>
                  </span>
                  <span className="mt-1 block text-sm text-encre-2 truncate">{metaCh}</span>
                  {ch.statut === 'en_cours' && (
                    <span className="mt-3 flex items-center gap-3">
                      <span className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-info-point" style={{ width: `${Math.min(100, Math.max(0, avancement))}%` }} />
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-encre">{avancement} %</span>
                    </span>
                  )}
                  <span className="mt-3 flex items-baseline justify-between gap-3">
                    <span className={`text-sm truncate ${finTexte?.ton || 'text-encre-3'}`}>{finTexte?.texte || (allTasks.length ? `${tasksDone}/${allTasks.length} tâches` : '')}</span>
                    {budgetPrevu > 0 && <span className="text-base font-semibold tabular-nums text-encre whitespace-nowrap">{modeDiscret ? '···' : formatMoney(budgetPrevu)}</span>}
                  </span>
                  {(margeNegative || budgetDepleted) && (
                    <span className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${margeNegative ? 'text-danger-texte' : 'text-alerte-texte'}`}>
                      <AlertTriangle size={16} aria-hidden="true" className="flex-shrink-0" />
                      {margeNegative ? `Marge ${formatPct(bilan.tauxMarge)}` : 'Budget presque consommé'}
                    </span>
                  )}
                </button>
                {(duplicateMap.has(ch.id) || isDraftChantier(ch)) && (
                  <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-2">
                    {isDraftChantier(ch) && <Pastille ton="neutre">Brouillon</Pastille>}
                    {duplicateMap.has(ch.id) && (
                      <button type="button" onClick={() => setMergeDialog({ primaryId: ch.id, secondaryId: duplicateMap.get(ch.id)[0] })} className="h-9 px-3 rounded-full bg-alerte-fond text-alerte-texte text-xs font-semibold">
                        Doublon : fusionner
                      </button>
                    )}
                  </div>
                )}
                {ch.statut === 'prospect' && setPage && (
                  <div className="px-4 pb-4">
                    <Bouton pleineLargeur icone={FileText} onClick={() => (nouveauDevisPour ? nouveauDevisPour(ch.client_id, ch.id) : setPage('devis'))}>Créer le devis</Bouton>
                  </div>
                )}
                {ch.statut === 'archive' && (
                  <div className="px-4 pb-4">
                    <Bouton pleineLargeur icone={Archive} onClick={() => { updateChantier(ch.id, { statut: 'termine' }); showToast('Chantier restauré', 'success'); }}>Restaurer</Bouton>
                  </div>
                )}
              </article>
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
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between border-bord`}>
                <div>
                  <h3 className={`text-lg font-bold ${textPrimary}`}>Gestion des tâches</h3>
                  <p className={`text-sm ${textMuted}`}>{pendingTasks.length} en cours · {completedTasks.length} terminées</p>
                </div>
                <button onClick={() => setShowTaskModal(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-surface-2`}>
                  <X size={20} className={textMuted} />
                </button>
              </div>

              {/* Quick Add */}
              <div className={`p-4 border-b border-bord`}>
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
                      ? ('bg-danger-fond text-danger-texte')
                      : ('text-encre-3 hover:bg-surface-2')
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
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 text-danger-texte`}>
                      ⚠️ Points critiques ({criticalTasks.length})
                    </p>
                    <div className="space-y-1">
                      {criticalTasks.map(task => (
                        <div key={task.id} className={`flex items-center gap-2 p-3 rounded-xl group bg-danger-fond`}>
                          <button onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${isDark ? 'border-red-500' : 'border-red-400'}`}>
                            {task.done && <Check size={14} className="text-red-500" />}
                          </button>
                          <span className={`flex-1 text-sm ${task.done ? 'line-through opacity-50' : ''} text-danger-texte`}>{task.text}</span>
                          <button onClick={() => toggleCritical(task.id)} aria-label="Retirer de prioritaire" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-slate-900 hover:bg-red-900/50' : 'hover:bg-red-100'}`} title="Retirer critique">
                            <AlertCircle size={16} className="text-red-500" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} aria-label="Supprimer la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 hover:bg-surface-2 text-encre-3`}>
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
                        <div key={task.id} className={`flex items-center gap-2 p-3 rounded-xl group hover:bg-surface-2`}>
                          <button onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-md border-2 flex-shrink-0 border-bord-fort`} />
                          <span className={`flex-1 text-sm ${textPrimary}`}>{task.text}</span>
                          <button onClick={() => toggleCritical(task.id)} aria-label="Marquer comme prioritaire" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 hover:bg-surface-2 text-encre-3`} title="Marquer critique">
                            <AlertCircle size={16} />
                          </button>
                          <button onClick={() => deleteTask(task.id)} aria-label="Supprimer la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 hover:bg-surface-2 text-encre-3`}>
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
                      <p className={`text-xs font-bold uppercase tracking-wider text-succes-texte`}>
                        ✓ Terminées ({completedTasks.length})
                      </p>
                      <button onClick={clearCompleted} className={`text-xs ${isDark ? 'text-slate-300 hover:text-red-400' : 'text-slate-500 hover:text-red-500'}`}>
                        Supprimer
                      </button>
                    </div>
                    <div className="space-y-1">
                      {completedTasks.slice(0, 5).map(task => (
                        <div key={task.id} className={`flex items-center gap-2 p-2 rounded-lg group bg-surface-2`}>
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
                  <div className={`text-center py-8 px-4 rounded-xl bg-surface-2`}>
                    <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center bg-info-fond`}>
                      <CheckSquare size={24} className={'text-info-texte'} />
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
                <div className={`p-4 border-t flex items-center justify-between border-bord`}>
                  <button
                    onClick={() => setShowTaskTemplates(true)}
                    className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg text-encre-2 hover:bg-surface-2`}
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
        onClose={() => { setShow(false); setClientPourChantier(null); }}
        onSubmit={handleCreateChantier}
        clientInitial={clientPourChantier}
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
            <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-5 bg-surface border-bord`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Fusionner les doublons</h3>
              <p className={`text-xs mb-4 ${textMuted}`}>Les données du chantier secondaire seront ajoutées au principal, puis le secondaire sera archivé.</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[{ ch: primary, label: '✅ Principal', client: clientA, id: mergeDialog.primaryId }, { ch: secondary, label: '📦 Sera archivé', client: clientB, id: mergeDialog.secondaryId }].map(({ ch, label, client, id }) => (
                  <div key={id} className={`rounded-xl border p-3 text-center border-bord bg-surface-2`}>
                    <span className={`text-xs font-medium block mb-1 ${id === mergeDialog.primaryId ? ('text-succes-texte') : ('text-alerte-texte')}`}>{label}</span>
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
                className={`w-full text-xs py-1.5 rounded-lg mb-4 text-encre-3 hover:bg-surface-2`}
              >
                ↔ Inverser principal / secondaire
              </button>

              <div className="flex gap-2">
                <button onClick={() => setMergeDialog(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-2 text-encre-2 hover:bg-bord`}>
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
