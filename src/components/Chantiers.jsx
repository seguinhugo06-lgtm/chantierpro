import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Plus, ArrowLeft, ArrowRight, Edit3, Trash2, Check, X, Camera, MapPin, Phone, Clock, Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Package, Users, FileText, ChevronRight, ChevronDown, ChevronUp, Save, Image, StickyNote, CheckSquare, Square, MoreVertical, MoreHorizontal, Percent, Coins, Receipt, Banknote, PiggyBank, Target, BarChart3, CircleDollarSign, Wallet, MessageSquare, AlertCircle, ArrowUpRight, ArrowDownRight, UserCog, Download, Share2, ArrowUpDown, SortAsc, SortDesc, Building2, Zap, Sparkles, ShoppingCart, FolderOpen, Wifi, WifiOff, Sun, Cloud, CloudRain, Wind, Thermometer, GripVertical, CheckCircle, Copy, Archive, Search, Paperclip, Upload, Map, List, ClipboardList, CheckCircle2, Navigation, Mic, CalendarPlus } from 'lucide-react';

const ChantierMap = lazy(() => import('./chantiers/ChantierMap'));
import { useOnlineStatus } from '../hooks/useNetworkStatus';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import QuickChantierModal from './QuickChantierModal';
import { getTaskTemplatesForMetier, QUICK_TASKS, suggestTasksFromDevis, PHASES, getAllTasksByPhase, calculateProgressByPhase, generateSmartTasks, getAvailableProjectTypes } from '../lib/templates/task-templates-v2';
import TaskGeneratorModal from './TaskGeneratorModal';
import SituationsTravaux from './chantiers/SituationsTravaux';
import RapportChantier from './chantiers/RapportChantier';
import { CHANTIER_STATUS_LABELS, getAvailableChantierTransitions } from '../lib/constants';
import { getUserWeather, getChantierWeather } from '../services/WeatherService';

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

  // If no signals available, fallback to task completion only
  if (signals.length === 0) {
    return tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  }

  // Normalize weights if not all signals are present
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const normalizedProgress = signals.reduce((sum, s) => sum + (s.value * s.weight / totalWeight), 0);

  return Math.round(normalizedProgress);
};

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, pointages, setPointages, equipe, devis, ajustements, addAjustement, deleteAjustement, getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier, catalogue, deductStock, isDark, createMode, setCreateMode, setPage, memos = [], addMemo, updateMemo, deleteMemo, toggleMemo, onPlanEvent }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

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
  const [viewMode, setViewMode] = useState('list'); // list or map
  const [showTaskTemplates, setShowTaskTemplates] = useState(false);
  const [newTaskCritical, setNewTaskCritical] = useState(false); // For marking new tasks as critical
  const [showTaskGenerator, setShowTaskGenerator] = useState(false); // Task generator modal
  const [weather, setWeather] = useState(null); // Weather data for active chantier
  const [showTaskModal, setShowTaskModal] = useState(false); // Efficient task management modal
  const [collapsedPhases, setCollapsedPhases] = useState({}); // Track collapsed phases
  const [showCompletedTasks, setShowCompletedTasks] = useState(false); // Show/hide completed tasks
  const [editingTask, setEditingTask] = useState(null); // Task being edited
  const [taskFilter, setTaskFilter] = useState('all'); // all, pending, critical
  const [fabOpen, setFabOpen] = useState(false); // FAB chantier flottant
  const [showMoreTabs, setShowMoreTabs] = useState(false); // Dropdown "Plus" onglets
  const [finExpanded, setFinExpanded] = useState({}); // Finance accordion sections
  const [animatedTaskId, setAnimatedTaskId] = useState(null);
  const [counterPulse, setCounterPulse] = useState(false);

  useEffect(() => { if (selectedChantier) setView(selectedChantier); }, [selectedChantier]);
  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

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

  const formatMoney = (n) => modeDiscret ? '·····' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => {
    if (modeDiscret) return '··%';
    const value = n || 0;
    const rounded = Math.round(value);
    // Afficher sans décimale si proche d'un entier
    return Math.abs(value - rounded) < 0.1 ? `${rounded}%` : `${value.toFixed(1)}%`;
  };
  const getMargeColor = (t) => t < 0 ? 'text-red-500' : t < 15 ? 'text-amber-500' : 'text-emerald-500';
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
    const tauxMargeProjecte = bilan.revenuPrevu > 0 ? (beneficeProjecte / bilan.revenuPrevu) * 100 : 0;

    // Alertes - basées sur des seuils clairs
    const revenuTotal = bilan.revenuPrevu + (bilan.adjRevenus || 0);
    const budgetDepasse = revenuTotal > 0 && bilan.totalDepenses > revenuTotal * 0.9; // >90% du budget consommé
    const margeNegative = bilan.margeBrute < 0;
    const margeFaible = !margeNegative && bilan.tauxMarge < 15;

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
              {/* Row 1: Back + Title + Status */}
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setView(null); setSelectedChantier?.(null); }} className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0`}>
                  <ArrowLeft size={20} className={textPrimary} />
                </button>
                {/* Sync status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} title={isOnline ? 'En ligne' : 'Hors ligne'} />
                <h2 className={`flex-1 min-w-0 text-base sm:text-xl font-bold leading-tight ${textPrimary}`}>{ch.nom}</h2>
                <select
                  value={ch.statut}
                  onChange={e => {
                    const newStatus = e.target.value;
                    updateChantier(ch.id, { statut: newStatus });
                    showToast(`Statut changé: ${CHANTIER_STATUS_LABELS[newStatus]}`, 'success');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border-0 outline-none appearance-none pr-6 bg-no-repeat bg-right min-h-[36px] shrink-0 ${
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
                    className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all min-h-[32px] ${
                      prevChantier
                        ? isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                        : 'opacity-30 cursor-not-allowed'
                    } ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    title={prevChantier ? `← ${prevChantier.nom}` : ''}
                  >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline max-w-[100px] truncate">{prevChantier?.nom || ''}</span>
                  </button>
                  <button
                    onClick={() => nextChantier && setView(nextChantier.id)}
                    disabled={!nextChantier}
                    className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all min-h-[32px] ${
                      nextChantier
                        ? isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                        : 'opacity-30 cursor-not-allowed'
                    } ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    title={nextChantier ? `${nextChantier.nom} →` : ''}
                  >
                    <span className="hidden sm:inline max-w-[100px] truncate">{nextChantier?.nom || ''}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Action buttons compact */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingChantier(ch)}
                    className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center`}
                    title="Modifier"
                  >
                    <Edit3 size={16} className={textMuted} />
                  </button>
                  <button
                    onClick={() => {
                      const clone = {
                        nom: `${ch.nom} (copie)`,
                        client_id: ch.client_id,
                        clientId: ch.client_id,
                        adresse: ch.adresse,
                        ville: ch.ville,
                        codePostal: ch.codePostal,
                        dateDebut: new Date().toISOString().split('T')[0],
                        date_debut: new Date().toISOString().split('T')[0],
                        dateFin: '',
                        date_fin: '',
                        budgetPrevu: ch.budget_estime || ch.budgetPrevu || 0,
                        budget_estime: ch.budget_estime || ch.budgetPrevu || 0,
                        budget_materiaux: ch.budget_materiaux || 0,
                        heures_estimees: ch.heures_estimees || 0,
                        description: ch.description || '',
                        notes: ch.notes || '',
                        taches: (ch.taches || []).map(t => ({ ...t, id: generateId(), done: false })),
                        photos: [],
                        documents: [],
                        messages: [],
                        statut: 'prospect'
                      };
                      const newCh = addChantier(clone);
                      showToast(`Chantier dupliqué : "${clone.nom}"`, 'success');
                      if (newCh?.id) setView(newCh.id);
                    }}
                    className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center`}
                    title="Dupliquer"
                  >
                    <Copy size={16} className={textMuted} />
                  </button>
                  {ch.statut === 'en_cours' && (
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({ title: 'Terminer le chantier', message: `Marquer "${ch.nom}" comme terminé ? La date de fin sera mise à aujourd'hui.` });
                        if (confirmed) {
                          updateChantier(ch.id, { statut: 'termine', date_fin: new Date().toISOString().split('T')[0] });
                          showToast('Chantier marqué comme terminé ✅', 'success');
                        }
                      }}
                      className={`p-2 ${isDark ? 'hover:bg-emerald-900/50' : 'hover:bg-emerald-50'} rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center`}
                      title="Marquer comme terminé"
                    >
                      <CheckCircle size={16} className="text-emerald-500" />
                    </button>
                  )}
                  {ch.statut !== 'archive' && (
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({ title: 'Archiver', message: `Archiver le chantier "${ch.nom}" ? Il ne sera plus visible dans la liste active.` });
                        if (confirmed) {
                          updateChantier(ch.id, { statut: 'archive' });
                          showToast('Chantier archivé', 'success');
                          setView(null);
                        }
                      }}
                      className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center`}
                      title="Archiver"
                    >
                      <Archive size={16} className={textMuted} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowTaskGenerator(true)}
                    className="px-3 py-1.5 rounded-lg min-h-[36px] flex items-center gap-1.5 text-white text-xs font-medium transition-all hover:opacity-90"
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
                showToast('Chantier marqué comme terminé', 'success');
              }}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl whitespace-nowrap min-h-[40px] hover:shadow-lg transition-all bg-emerald-500 hover:bg-emerald-600"
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
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-white font-semibold text-base min-h-[56px] transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                style={{ background: `linear-gradient(135deg, #f97316, #ea580c)` }}
              >
                <MapPin size={22} />
                Ouvrir GPS
              </button>
              <p className={`text-xs ${textMuted} text-center mt-2`}>
                {ch.adresse}{ch.codePostal ? `, ${ch.codePostal}` : ''}{ch.ville ? ` ${ch.ville}` : ''}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Infos Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Client</span>
              </div>
              {client ? (
                <div className="space-y-1.5">
                  <p className={`font-semibold ${textPrimary}`}>{client.nom} {client.prenom || ''}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {client.telephone && (
                      <a href={`tel:${client.telephone}`} className={`flex items-center gap-1.5 text-sm ${textSecondary} hover:opacity-80 min-h-[36px] px-3 py-1 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
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
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Adresse du chantier</span>
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
                    className="hidden sm:flex w-full items-center justify-center gap-3 py-4 rounded-xl text-white font-semibold min-h-[52px] transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
                    style={{ background: `linear-gradient(135deg, #f97316, #ea580c)` }}
                  >
                    <MapPin size={20} />
                    Ouvrir GPS
                  </button>
                </div>
              ) : (
                <p className={`text-sm ${textMuted}`}>Adresse non renseignée</p>
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
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Tâches</span>
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
                /* === EMPTY STATE: Big CTA + inline project type selector === */
                <div className="text-center">
                  <div className={`py-6 rounded-xl mb-4 ${isDark ? 'bg-slate-700/30' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
                    <Sparkles size={36} className="mx-auto mb-3" style={{ color: couleur }} />
                    <p className={`font-semibold text-base ${textPrimary} mb-1`}>Générer mes tâches avec l'IA</p>
                    <p className={`text-xs ${textMuted}`}>Sélectionnez un type de projet pour démarrer</p>
                  </div>
                  {/* Project type grid inline */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {projectTypes.slice(0, 12).map(pt => (
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
                              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{criticalTasks.length}</span>
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
                                <span className={`text-[10px] ${textMuted}`}>{phaseProgress.done}/{phaseProgress.total}</span>
                                <div className={`w-10 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${phaseProgress.percent}%`, background: phaseProgress.percent === 100 ? '#10b981' : phase.color }} />
                                </div>
                              </button>
                              {!isCollapsed && (
                                <div className="px-2.5 pb-2 space-y-0.5">
                                  {filteredPhaseTasks.map(t => (
                                    <div key={t.id} className={`flex items-center gap-2 p-1.5 rounded-lg group transition-all ${t.critical ? (isDark ? 'bg-red-900/20' : 'bg-red-50') : (isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50')}`}>
                                      <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} className={`w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0 ${t.critical ? 'border-red-500 text-red-500' : ''} ${animatedTaskId === t.id ? 'scale-125' : ''}`} style={{ ...((!t.critical) ? { borderColor: phase.color, accentColor: phase.color } : {}), transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                      <span onClick={() => setEditingTask(t)} className={`flex-1 text-xs cursor-pointer hover:underline ${t.done ? 'line-through opacity-50' : ''} ${t.critical ? 'font-medium' : ''} ${textPrimary}`}>{t.text}</span>
                                      {t.critical && !t.done && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-medium">!</span>}
                                      <button onClick={() => setEditingTask(t)} className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}><MoreVertical size={12} className={textMuted} /></button>
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
                              <span className={`text-[10px] ${textMuted}`}>{tasksNoPhase.filter(t => t.done).length}/{tasksNoPhase.length}</span>
                            </button>
                            {!collapsedPhases['no-phase'] && (
                              <div className="px-2.5 pb-2 space-y-0.5">
                                {getFilteredTasks(tasksNoPhase).map(t => (
                                  <div key={t.id} className={`flex items-center gap-2 p-1.5 rounded-lg group transition-all ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} className="w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0" style={{ borderColor: couleur, accentColor: couleur }} />
                                    <span onClick={() => setEditingTask(t)} className={`flex-1 text-xs cursor-pointer hover:underline ${t.done ? 'line-through opacity-50' : ''} ${textPrimary}`}>{t.text}</span>
                                    <button onClick={() => setEditingTask(t)} className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}><MoreVertical size={12} className={textMuted} /></button>
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
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm min-h-[40px] ${inputBg}`}
                />
                <button
                  onClick={addTache}
                  disabled={!newTache.trim()}
                  className="px-3 py-2 text-white rounded-lg min-h-[40px] disabled:opacity-50 transition-all active:scale-[0.98]"
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
                      <button onClick={() => setEditingTask(null)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={18} className={textMuted} /></button>
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
                        <button onClick={() => deleteTask(editingTask.id)} className="px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium"><Trash2 size={16} className="inline mr-1" /> Supprimer</button>
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

        {/* Alertes */}
        {(margeNegative || budgetDepasse || margeFaible) && (
          <div className={`rounded-2xl p-4 ${margeNegative ? (isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200') : budgetDepasse ? (isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200') : (isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200')}`}>
            <div className="flex items-center gap-3">
              {margeNegative ? <TrendingDown size={24} className="text-red-500" /> : budgetDepasse ? <AlertTriangle size={24} className="text-amber-500" /> : <AlertCircle size={24} className="text-blue-500" />}
              <div>
                <p className={`font-semibold ${margeNegative ? (isDark ? 'text-red-400' : 'text-red-700') : budgetDepasse ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-blue-400' : 'text-blue-700')}`}>
                  {margeNegative ? 'Chantier en perte' : budgetDepasse ? 'Budget presque épuisé' : 'Marge faible'}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {margeNegative
                    ? `Les dépenses (${formatMoney(bilan.totalDepenses)}) dépassent le revenu prévu (${formatMoney(revenuTotal)}).`
                    : budgetDepasse
                    ? `Vous avez consommé ${((bilan.totalDepenses / revenuTotal) * 100).toFixed(0)}% du budget. Surveillez les coûts.`
                    : `Marge prévisionnelle de ${formatPct(bilan.tauxMarge)} - en dessous de 15%.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* === SECTION: FINANCES (condensé + accordion) === */}
        {(() => {
          const healthColor = bilan.margeBrute < 0 ? '#ef4444' : bilan.tauxMarge < 15 ? '#f59e0b' : '#10b981';
          const depPct = revenuTotal > 0 ? Math.min(100, (bilan.totalDepenses / revenuTotal) * 100) : 0;
          const toggleFin = (k) => setFinExpanded(p => ({ ...p, [k]: !p[k] }));

          return (
            <div className={`${cardBg} rounded-xl border p-4`}>
              {/* Summary line */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Finances</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className={textMuted}>Budget <strong className={textPrimary}>{formatMoney(revenuTotal)}</strong></span>
                  <span className={textMuted}>Dépensé <strong className="text-red-500">{formatMoney(bilan.totalDepenses)}</strong></span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold" style={{ color: healthColor }}>{formatPct(bilan.tauxMarge)}</span>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: healthColor }} />
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
                    <span className={`text-[10px] ${textMuted}`}>0 €</span>
                    <span className={`text-[10px] font-medium ${depPct > 90 ? 'text-red-500' : textMuted}`}>{Math.round(depPct)}% consommé</span>
                    <span className={`text-[10px] ${textMuted}`}>{formatMoney(revenuTotal)}</span>
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
                    <div className="flex justify-between items-center cursor-pointer p-1.5 rounded hover:opacity-80" onClick={() => setShowQuickMateriau(true)}>
                      <span className={`text-xs ${textMuted} flex items-center gap-1.5`}><Package size={12} /> Matériaux</span>
                      <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutMateriaux)}</span>
                    </div>
                    <div className="flex justify-between items-center cursor-pointer p-1.5 rounded hover:opacity-80" onClick={() => setShowMODetail(true)}>
                      <span className={`text-xs ${textMuted} flex items-center gap-1.5`}><UserCog size={12} /> Main d'oeuvre ({bilan.heuresTotal}h)</span>
                      <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutMO)}</span>
                    </div>
                    {(bilan.coutAutres || 0) > 0 && (
                      <div className="flex justify-between items-center cursor-pointer p-1.5 rounded hover:opacity-80" onClick={() => setShowAjustement('DEPENSE')}>
                        <span className={`text-xs ${textMuted}`}>Autres frais</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{formatMoney(bilan.coutAutres)}</span>
                      </div>
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
                              <span className={`text-[10px] font-medium ${bilan.coutMateriaux > ch.budget_materiaux ? 'text-red-500' : 'text-emerald-500'}`}>{formatMoney(bilan.coutMateriaux)} / {formatMoney(ch.budget_materiaux)}</span>
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
                              <span className={`text-[10px] font-medium ${bilan.heuresTotal > ch.heures_estimees ? 'text-red-500' : 'text-emerald-500'}`}>{bilan.heuresTotal}h / {ch.heures_estimees}h</span>
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
                            <p className={`text-[10px] ${textMuted}`}>Dépenses est.</p>
                            <p className="font-bold text-sm text-red-500">{formatMoney(depensesFinalesEstimees)}</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-[10px] ${textMuted}`}>Bénéfice</p>
                            <p className={`font-bold text-sm ${getMargeColor(tauxMargeProjecte)}`}>{formatMoney(beneficeProjecte)}</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-[10px] ${textMuted}`}>Marge</p>
                            <p className={`font-bold text-sm ${getMargeColor(tauxMargeProjecte)}`}>{formatPct(tauxMargeProjecte)}</p>
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
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Détails du chantier</span>
        </div>
        {/* Onglets — 5 max + Plus dropdown */}
        {(() => {
          const photoCount = (ch.photos || []).length;
          const msgCount = (ch.messages || []).filter(m => !m.read).length;
          const mainTabs = [
            { key: 'photos', label: 'Photos', icon: Camera, badge: photoCount > 0 ? photoCount : null },
            { key: 'finances', label: 'Finances', icon: Wallet },
            { key: 'situations', label: 'Situations', icon: Receipt },
            { key: 'messages', label: 'Messages', icon: MessageSquare, badge: msgCount > 0 ? msgCount : null },
          ];
          const moreTabs = [
            { key: 'notes', label: 'Notes', icon: StickyNote },
            { key: 'documents', label: 'Documents', icon: Paperclip },
            { key: 'rapports', label: 'Rapports', icon: FileText },
            { key: 'memos', label: 'Mémos', icon: ClipboardList },
          ];
          const isMoreTabActive = moreTabs.some(t => t.key === activeTab);

          return (
            <div className="relative">
              <div className={`flex gap-1 border-b overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                {mainTabs.map(({ key, label, icon: Icon, badge }) => (
                  <button key={key} onClick={() => { setActiveTab(key); setShowMoreTabs(false); }} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium min-h-[40px] transition-colors relative ${activeTab === key ? 'text-white' : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} style={activeTab === key ? { background: couleur } : {}}>
                    <Icon size={15} />
                    <span className="hidden sm:inline">{label}</span>
                    {badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center ${activeTab === key ? 'bg-white/25' : 'text-white'}`} style={activeTab !== key ? { background: couleur } : {}}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
                {/* Plus button */}
                <button
                  onClick={() => setShowMoreTabs(!showMoreTabs)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-sm font-medium min-h-[40px] transition-colors ${isMoreTabActive ? 'text-white' : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                  style={isMoreTabActive ? { background: couleur } : {}}
                >
                  <MoreHorizontal size={15} />
                  <span className="hidden sm:inline">Plus</span>
                </button>
              </div>
              {/* Dropdown */}
              {showMoreTabs && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreTabs(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-20 py-1 rounded-xl shadow-lg border min-w-[180px] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    {moreTabs.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => { setActiveTab(key); setShowMoreTabs(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === key ? (isDark ? 'bg-slate-700' : 'bg-slate-100') : ''} ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Icon size={15} className={textMuted} />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {activeTab === 'finances' && (
          <div className="space-y-4">
            {adjRevenus.length === 0 && adjDepenses.length === 0 && chDepenses.length === 0 && (
              <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
                <Wallet size={32} className={`mx-auto mb-3 ${textMuted}`} />
                <p className={`font-medium ${textPrimary}`}>Aucune donnée financière</p>
                <p className={`text-sm ${textMuted} mt-1`}>Ajoutez des revenus ou des dépenses pour suivre la rentabilité de ce chantier.</p>
              </div>
            )}
            {adjRevenus.length > 0 && (
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <h3 className="font-semibold mb-3 text-emerald-600"> Ajustements Revenus</h3>
                {adjRevenus.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-emerald-600">+{formatMoney(a.montant_ht)}</span><button onClick={() => handleDeleteAjustement(a.id)} className="text-red-400 hover:text-red-600">x</button></div></div>))}
              </div>
            )}
            {adjDepenses.length > 0 && (
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <h3 className="font-semibold mb-3 text-red-600"> Ajustements Dépenses</h3>
                {adjDepenses.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-red-600">-{formatMoney(a.montant_ht)}</span><button onClick={() => handleDeleteAjustement(a.id)} className="text-red-400 hover:text-red-600">x</button></div></div>))}
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
            isDark={isDark}
            couleur={couleur}
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
          <div className={`${cardBg} rounded-2xl border p-5`}>
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
                          <div key={p.id} className="relative group cursor-pointer flex-shrink-0" onClick={() => setPhotoPreview(p)}>
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
                              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full text-xs sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center shadow-lg transition-opacity"
                            >
                              <X size={16} />
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
          <div className={`${cardBg} rounded-2xl border p-5`}>
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
                      <FolderOpen size={32} className={`mx-auto mb-2 ${textMuted}`} />
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
                        className="px-4 py-2 text-white rounded-xl text-sm flex items-center gap-2 min-h-[40px]"
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
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><StickyNote size={18} /> Notes</h3>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={6} value={ch.notes || ''} onChange={e => updateChantier(ch.id, { notes: e.target.value })} placeholder="Contraintes d'accès, contacts sur site, détails importants..." />
          </div>
        )}

        {activeTab === 'memos' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
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
                      <ClipboardList size={28} className={`mx-auto mb-2 ${textMuted}`} />
                      <p className={textMuted}>Aucun mémo pour ce chantier</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><MessageSquare size={18} style={{ color: couleur }} /> Historique des échanges</h3>
            <p className={`text-sm ${textMuted} mb-4`}>Centralisez ici tous vos échanges avec le client (emails, SMS, appels...).</p>

            {/* Existing messages */}
            <div className="space-y-3 mb-4">
              {(!ch.messages || ch.messages.length === 0) ? (
                <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <MessageSquare size={32} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={textMuted}>Aucun échange enregistré</p>
                </div>
              ) : (
                ch.messages.map(msg => (
                  <div key={msg.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${msg.type === 'email' ? 'bg-blue-100 text-blue-700' : msg.type === 'sms' ? 'bg-green-100 text-green-700' : msg.type === 'appel' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>{msg.type === 'email' ? 'Email' : msg.type === 'sms' ? 'SMS' : msg.type === 'appel' ? 'Appel' : 'Note'}</span>
                      <span className={`text-xs ${textMuted}`}>{new Date(msg.date).toLocaleDateString('fr-FR')} - {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => updateChantier(ch.id, { messages: ch.messages.filter(m => m.id !== msg.id) })} aria-label="Supprimer le message" className="ml-auto p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center text-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"><X size={16} /></button>
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
                  <Clock size={12} /> Photo horodatée - Valeur de preuve en cas de litige
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
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowAjustement(null); setAdjForm({ libelle: '', montant_ht: '' }); }} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={handleAddAjustement} className="px-4 py-2 text-white rounded-xl" style={{background: showAjustement === 'REVENU' ? '#22c55e' : '#ef4444'}}>Ajouter</button></div>
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
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span>{p.approuve ? '[OK]' : '⏳'}</span>{p.manuel && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Manuel</span>}{p.verrouille && <span className="text-xs bg-slate-400 text-white px-2 py-0.5 rounded"></span>}</div>{!p.verrouille && <button onClick={() => deletePointage(p.id)} className="text-red-400"></button>}</div>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-sm"><div><p className="text-xs text-slate-500">Date</p><input type="date" value={p.date} onChange={e => handleEditPointage(p.id, 'date', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded text-xs" /></div><div><p className="text-xs text-slate-500">Employé</p><p className="font-medium">{emp?.nom}</p></div><div><p className="text-xs text-slate-500">Heures</p><input type="number" step="0.5" value={p.heures} onChange={e => handleEditPointage(p.id, 'heures', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded" /></div><div><p className="text-xs text-slate-500">Coût</p><p className="font-bold text-blue-600">{formatMoney(p.heures * cout)}</p></div></div>
                </div>
              ); })}{chPointages.length === 0 && <p className={`text-center py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aucun pointage</p>}</div>
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
            <Plus size={28} className="text-white" />
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
  const handleCreateChantier = (formData) => {
    // Duplicate detection
    const duplicate = chantiers.some(c =>
      c.nom?.toLowerCase().trim() === (formData.nom || '').toLowerCase().trim() &&
      (c.client_id || '') === (formData.client_id || formData.clientId || '') &&
      (c.adresse || '').toLowerCase().trim() === (formData.adresse || '').toLowerCase().trim()
    );
    if (duplicate && !window.confirm('Un chantier similaire existe déjà (même nom, client et adresse). Créer quand même ?')) {
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
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Chantiers</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* List/Map toggle */}
          <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${viewMode === 'list' ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
              style={viewMode === 'list' ? { background: couleur } : {}}
              title="Vue liste"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${viewMode === 'map' ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
              style={viewMode === 'map' ? { background: couleur } : {}}
              title="Vue carte"
            >
              <Map size={16} />
            </button>
          </div>
          <button onClick={() => setShow(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl text-sm flex items-center justify-center sm:gap-2 hover:shadow-lg transition-all" style={{background: couleur}}>
            <Plus size={16} /><span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      {/* === BANDE JOURNEE D'AUJOURD'HUI === */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const chantiersToday = chantiers.filter(c => {
          if (c.statut !== 'en_cours') return false;
          const debut = c.date_debut ? c.date_debut.split('T')[0] : null;
          const fin = c.date_fin ? c.date_fin.split('T')[0] : null;
          if (!debut) return true; // en_cours sans date = toujours affiche
          return debut <= today && (!fin || fin >= today);
        });
        const tachesEnAttente = chantiersToday.reduce((sum, c) => sum + (c.taches || []).filter(t => !t.done).length, 0);

        if (chantiersToday.length === 0 && chantiers.length > 0) {
          return (
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Calendar size={20} className={textMuted} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${textPrimary}`}>Aucun chantier planifie aujourd'hui</p>
                  <p className={`text-xs ${textMuted}`}>Voulez-vous en creer un ?</p>
                </div>
                <button onClick={() => setShow(true)} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: couleur }}>
                  <Plus size={14} className="inline mr-1" />Creer
                </button>
              </div>
            </div>
          );
        }

        if (chantiersToday.length > 0) {
          return (
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${couleur}10, ${couleur}05)` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`text-sm font-semibold ${textPrimary}`}>
                    Aujourd'hui : {chantiersToday.length} chantier{chantiersToday.length > 1 ? 's' : ''}
                  </span>
                  {tachesEnAttente > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                      {tachesEnAttente} tache{tachesEnAttente > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {/* Chantiers du jour */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {chantiersToday.slice(0, 4).map(c => {
                  const cl = clients.find(cl => cl.id === c.client_id);
                  return (
                    <div key={c.id} className={`px-4 py-3 flex items-center gap-3 ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors cursor-pointer`} onClick={() => setView(c.id)}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textPrimary}`}>{c.nom}</p>
                        <p className={`text-xs ${textMuted} truncate`}>
                          {cl ? `${cl.nom} ${cl.prenom || ''}`.trim() : ''}
                        </p>
                        {(c.adresse || c.ville) && (
                          <p className={`text-xs ${textMuted} truncate flex items-center gap-1 mt-0.5`}>
                            <MapPin size={10} className="flex-shrink-0" />
                            {[c.adresse, c.ville].filter(Boolean).join(', ')}
                          </p>
                        )}
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
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: couleur }}
                          title="Ouvrir GPS"
                        >
                          <Navigation size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
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
            <button onClick={() => setSearchQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
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
          {/* En Cours Card - Simplified: Progression, Équipe, Tasks only */}
          {(() => {
            // Only show hero card when viewing all or en_cours filter
            if (filterStatus !== 'all' && filterStatus !== 'en_cours') return null;
            const activeChantiers = chantiers.filter(c => c.statut === 'en_cours');
            if (activeChantiers.length === 0) return null;

            const current = activeChantiers.sort((a, b) => (a.avancement || 0) - (b.avancement || 0))[0];
            const client = clients.find(c => c.id === current.client_id);
            const bilanRaw2 = getChantierBilan(current.id);
            const bilan = bilanRaw2 || { totalDepenses: 0, revenuPrevu: 0, margeBrute: 0, tauxMarge: 0 };
            const allTasks = current.taches || [];
            const pendingTasks = allTasks.filter(t => !t.done);
            const tasksDone = allTasks.filter(t => t.done).length;
            const tasksTotal = allTasks.length;

            // Team from pointages
            const chPointages = pointages.filter(p => p.chantierId === current.id);
            const teamIds = [...new Set(chPointages.map(p => p.employeId))];
            const teamMembers = teamIds.map(id => equipe.find(e => e.id === id)).filter(Boolean);

            // Smart progression
            const avancement = calculateSmartProgression(current, bilan, tasksDone, tasksTotal);

            // Complete task handler
            const completeTask = (taskId) => {
              const ch = chantiers.find(c => c.id === current.id);
              if (ch) {
                updateChantier(current.id, {
                  taches: ch.taches.map(t => t.id === taskId ? { ...t, done: true } : t)
                });
                showToast?.('Tâche complétée', 'success');
              }
            };

            // Date calculation
            const dateFin = current.date_fin ? new Date(current.date_fin) : null;
            const dateFinFormatted = dateFin ? dateFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;

            return (
              <div
                onClick={() => setView(current.id)}
                className={`mb-4 ${cardBg} rounded-xl border-2 p-4 cursor-pointer transition-all shadow-md hover:shadow-lg`}
                style={{ borderColor: `${couleur}50`, boxShadow: `0 4px 12px ${couleur}15` }}
              >
                {/* Header with status badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: couleur }}>
                      EN COURS
                    </span>
                    {dateFinFormatted && (
                      <span className={`text-xs ${textMuted}`}>Fin: {dateFinFormatted}</span>
                    )}
                  </div>
                  <ChevronRight size={18} className={textMuted} />
                </div>

                {/* Name + Client */}
                <h3 className={`font-bold text-lg ${textPrimary}`} title={current.nom}>{current.nom}</h3>
                <p className={`text-sm ${textMuted} mb-3`}>{client ? `${client.nom}${client.prenom ? ' ' + client.prenom : ''}` : 'Sans client'}</p>

                {/* Progress Bar */}
                <div className={`mb-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(5, avancement))}%`, background: couleur }} />
                </div>
                <p className={`text-sm font-semibold mb-4`} style={{ color: couleur }}>{avancement}%</p>

                {/* Équipe - Full names */}
                <div className="mb-4">
                  <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-2`}>Équipe ({teamMembers.length})</p>
                  {teamMembers.length > 0 ? (
                    <div className="space-y-1.5">
                      {teamMembers.slice(0, 3).map(member => (
                        <div key={member.id} className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: couleur }}>
                            {member.prenom?.[0]}{member.nom?.[0]}
                          </div>
                          <span className={`text-sm ${textPrimary}`}>{member.prenom} {member.nom}</span>
                          {member.role && <span className={`text-xs ${textMuted}`}>({member.role})</span>}
                        </div>
                      ))}
                      {teamMembers.length > 3 && (
                        <p className={`text-xs ${textMuted} pl-9`}>+{teamMembers.length - 3} autres</p>
                      )}
                    </div>
                  ) : (
                    <p className={`text-sm ${textMuted}`}>Aucune équipe assignée</p>
                  )}
                </div>

                {/* Tasks with quick complete */}
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${textMuted} mb-2`}>Tâches ({tasksDone}/{tasksTotal})</p>
                  {pendingTasks.length > 0 ? (
                    <div className="space-y-1">
                      {pendingTasks.slice(0, 4).map(task => (
                        <button
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
                          className={`w-full min-h-[44px] py-2 px-3 rounded-lg flex items-center gap-3 text-left transition-all active:scale-[0.98] ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >
                          <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: couleur }}>
                            <Check size={12} className="opacity-0 group-hover:opacity-100" style={{ color: couleur }} />
                          </div>
                          <span className={`text-sm flex-1 ${textPrimary}`}>{task.text}</span>
                          <Check size={18} style={{ color: couleur }} />
                        </button>
                      ))}
                      {pendingTasks.length > 4 && (
                        <p className={`text-xs ${textMuted} text-center py-1`}>+{pendingTasks.length - 4} autres</p>
                      )}
                    </div>
                  ) : tasksTotal === 0 ? (
                    <div
                      onClick={(e) => { e.stopPropagation(); setView(current.id); }}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${isDark ? 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600' : 'bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200'}`}
                    >
                      <p className={`text-sm font-medium mb-1 ${textPrimary}`}>📋 Aucune tâche planifiée</p>
                      <p className={`text-xs ${textMuted} mb-3`}>Ajoutez les étapes du chantier pour suivre l'avancement et coordonner votre équipe</p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: couleur }}>
                        <Plus size={14} /> Première tâche
                      </span>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Toutes les tâches terminées</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* === SECTION: LISTE DES CHANTIERS === */}
          {/* Status Filter Tabs + Sorting */}
          <div className="flex flex-col gap-3 mb-4">
            {/* Filtres de statut */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {[
                { key: 'all', label: 'Tous', color: couleur },
                { key: 'cette_semaine', label: 'Cette semaine', color: '#8b5cf6' },
                { key: 'en_cours', label: 'En cours', color: '#f97316' },
                { key: 'prospect', label: 'Prospects', color: '#3b82f6' },
                { key: 'termine', label: 'Terminés', color: '#22c55e' },
                ...(brouillonsCount > 0 ? [{ key: 'brouillons', label: 'Brouillons', color: '#a855f7' }] : []),
                ...(archivedCount > 0 ? [{ key: 'archive', label: 'Archivés', color: '#6b7280' }] : []),
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[40px] flex items-center gap-2 ${
                    filterStatus === tab.key
                      ? 'text-white shadow-md'
                      : isDark
                        ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: couleur }} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>{filterStatus === 'all' ? 'Tous les chantiers' : filterStatus === 'cette_semaine' ? 'Cette semaine' : filterStatus === 'en_cours' ? 'Chantiers en cours' : filterStatus === 'prospect' ? 'Prospects' : filterStatus === 'archive' ? 'Archivés' : filterStatus === 'brouillons' ? 'Brouillons / Tests' : 'Chantiers terminés'}</span>
                <span className={`text-[10px] ${textMuted}`}>— {getFilteredAndSortedChantiers().length} projet{getFilteredAndSortedChantiers().length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Client filter */}
                {clients.length > 1 && (
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <option value="">Tous les clients</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>
                    ))}
                  </select>
                )}
                {/* Sorting dropdown */}
                {chantiers.length > 1 && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
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
          {/* Map View */}
          {viewMode === 'map' && (
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
          )}

          {/* List View */}
          {viewMode === 'list' && <>
          {getFilteredAndSortedChantiers().length === 0 && (
            <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
              <Search size={32} className={`mx-auto mb-3 ${textMuted}`} />
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
            const statusLabel = ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : ch.statut === 'archive' ? 'Archivé' : 'Prospect';
            const statusColor = ch.statut === 'en_cours'
              ? (isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700')
              : ch.statut === 'termine'
              ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
              : ch.statut === 'archive'
              ? (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600')
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
              <div key={ch.id} onClick={() => setView(ch.id)} className={`${cardBg} rounded-xl border px-4 py-3 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${hasAlert ? (bilan.tauxMarge < 0 ? (isDark ? 'border-red-700 hover:border-red-600' : 'border-red-300 hover:border-red-400') : (isDark ? 'border-amber-700 hover:border-amber-600' : 'border-amber-300 hover:border-amber-400')) : (isDark ? 'hover:border-slate-500' : 'hover:border-orange-200')}`}>
                {/* Row 1: Nom + Ref + Badge statut */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className={`font-semibold text-sm leading-tight truncate ${textPrimary}`}>{ch.nom}</h3>
                    <span className={`text-[10px] font-mono shrink-0 ${textMuted}`}>#{String(chantiers.indexOf(ch) + 1).padStart(3, '0')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDraftChantier(ch) && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                        Brouillon
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Row 2: Client · Dates */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs ${textMuted}`}>{client ? `${client.nom}${client.prenom ? ' ' + client.prenom : ''}` : 'Sans client'}</span>
                  {dateRange && (
                    <>
                      <span className={`text-xs ${textMuted}`}>·</span>
                      <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                        <Calendar size={11} />
                        {dateRange}
                      </span>
                    </>
                  )}
                </div>

                {/* Row 3: Progress bar + Budget/Marge compacts */}
                <div className="flex items-center gap-3">
                  {/* Progress bar - inline */}
                  {ch.statut === 'en_cours' && avancement === 0 && allTasks.length === 0 && (
                    <div className="flex-1">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Non démarré</span>
                    </div>
                  )}
                  {ch.statut === 'en_cours' && (avancement > 0 || allTasks.length > 0) && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(3, avancement))}%`, background: couleur }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: couleur }}>{avancement}%</span>
                    </div>
                  )}
                  {ch.statut !== 'en_cours' && <div className="flex-1" />}

                  {/* Budget + Marge + Tasks compact */}
                  <div className="flex items-center gap-3 shrink-0">
                    {allTasks.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckSquare size={12} className={pendingTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                        <span className={`text-[11px] font-medium tabular-nums ${pendingTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {tasksDone}/{allTasks.length}
                        </span>
                      </div>
                    )}
                    {budgetPrevu > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold tabular-nums ${textPrimary}`}>{formatMoney(budgetPrevu)}</span>
                        <span className={`text-[11px] font-bold tabular-nums ${getMargeColor(bilan.tauxMarge)}`} title="Taux de marge">{formatPct(bilan.tauxMarge)} marge</span>
                        {hasAlert && <AlertTriangle size={12} className={`${bilan.tauxMarge < 0 ? 'text-red-500' : 'text-amber-500'}`} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA for Prospect: create devis */}
                {ch.statut === 'prospect' && setPage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPage('devis', { chantier_id: ch.id, client_id: ch.client_id, objet: ch.nom }); }}
                    className="w-full mt-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 text-white transition-all hover:shadow-md active:scale-[0.98]"
                    style={{ background: couleur }}
                  >
                    <FileText size={14} /> + Créer un devis
                  </button>
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
              </div>
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
                <button onClick={() => setShowTaskModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
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
                      : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')
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
                          <button onClick={() => toggleCritical(task.id)} aria-label="Retirer de prioritaire" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-red-900/50' : 'hover:bg-red-100'}`} title="Retirer critique">
                            <AlertCircle size={16} className="text-red-500" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} aria-label="Supprimer la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
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
                          <button onClick={() => toggleCritical(task.id)} aria-label="Marquer comme prioritaire" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Marquer critique">
                            <AlertCircle size={16} />
                          </button>
                          <button onClick={() => deleteTask(task.id)} aria-label="Supprimer la tâche" className={`p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center opacity-50 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
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
                      <button onClick={clearCompleted} className={`text-xs ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-500'}`}>
                        Supprimer
                      </button>
                    </div>
                    <div className="space-y-1">
                      {completedTasks.slice(0, 5).map(task => (
                        <div key={task.id} className={`flex items-center gap-2 p-2 rounded-lg group ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                          <button onClick={() => toggleTask(task.id)}
                            className="w-5 h-5 rounded-md bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                            <Check size={12} className="text-white" />
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
    </div>
  );
}
