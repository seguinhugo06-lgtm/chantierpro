import React, { useState, useRef, useEffect, useMemo, Suspense, lazy } from 'react';
import { Plus, ArrowLeft, Download, Trash2, Send, Mail, MessageCircle, Edit3, Check, X, FileText, Receipt, Clock, Search, ChevronRight, ChevronUp, ChevronDown, Star, Filter, Eye, Pen, CreditCard, Banknote, CheckCircle, AlertCircle, AlertTriangle, XCircle, Building2, Copy, TrendingUp, QrCode, Sparkles, PenTool, MoreVertical, Loader2, Link2, Mic, Zap, ArrowUpDown, Bell, RotateCcw, BarChart3, BellRing, ClipboardList, Circle, LayoutGrid, List, Kanban, Droplets, Paintbrush, Camera } from 'lucide-react';
import supabase, { isDemo } from '../supabaseClient';
const PipelineKanban = lazy(() => import('./pipeline/PipelineKanban'));
import { DEVIS_STATUS_COLORS, DEVIS_STATUS_LABELS } from '../lib/constants';
import PaymentModal from './PaymentModal';
import TemplateSelector from './TemplateSelector';
import SignaturePad from './SignaturePad';
import SmartTemplateWizard from './SmartTemplateWizard';
import DevisWizard from './DevisWizard';
import CatalogBrowser from './CatalogBrowser';
import DevisExpressModal from './DevisExpressModal';
import AvoirCreationModal from './modals/AvoirCreationModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { mapError } from '../lib/errorMapper';
import { formatMoney as fmtMoney, filterValidLignes, formatClientName } from '../lib/formatters';
import { normalizeNumero } from '../lib/devis-utils';
import { calcConversion, formatConversion } from '../lib/statsUtils';
import { useDebounce } from '../hooks/useDebounce';
import { useDevisModals } from '../hooks/useDevisModals';
import { isFacturXCompliant } from '../lib/facturx';
import { getDocumentEmailStatus } from '../services/CommunicationsService';
import { usePermissions } from '../hooks/usePermissions';
import { ReadOnlyBanner } from './ui/PermissionGate';
import { printSituationFacture as printSitFacture } from '../lib/devisHtmlBuilder';
import RelanceTimelineWidget from './RelanceTimelineWidget';
import { useRelances } from '../hooks/useRelances';
import { printMiseEnDemeure } from '../lib/miseEnDemeureBuilder';
import { useOrg } from '../context/OrgContext';
import { useData } from '../context/DataContext';
import { MODELES_DEVIS } from '../lib/data/modeles-devis';
import AcompteEcheancierModal from './devis/AcompteEcheancierModal';
import AcompteSuiviCard from './devis/AcompteSuiviCard';
import {
  getNextEtapeAFacturer,
  computeEtapeMontants,
  computeSoldeMontants,
  buildFactureLignesForEtape,
  isLastEtape,
  isEcheancierTermine,
  updateEtape,
  ETAPE_STATUT,
} from '../lib/acompteUtils';
import { cn } from '../lib/utils';
import AuditTimeline from './audit/AuditTimeline';
import VersionSelector from './audit/VersionSelector';
import SnapshotViewer from './audit/SnapshotViewer';
import DiffViewer from './audit/DiffViewer';
import LockBanner from './audit/LockBanner';
import { getEntityHistory } from '../lib/auditService';
import { getSnapshots } from '../lib/snapshotService';
import { isProviderSyncReady, createSignatureRequest as createYousignSignature } from '../services/syncService';

// Valid status transitions — enforced on buttons and dropdown
const VALID_TRANSITIONS = {
  // Devis transitions
  brouillon: ['envoye', 'refuse'],
  envoye: ['vu', 'accepte', 'refuse'],
  vu: ['accepte', 'refuse'],
  accepte: ['acompte_facture', 'facture'],
  signe: ['acompte_facture', 'facture'], // signe = alias for accepte (signed)
  acompte_facture: ['facture'],
  facture: [],
  refuse: ['brouillon'],
};
// Facture-specific transitions (keyed by 'facture:status')
const FACTURE_TRANSITIONS = {
  brouillon: ['envoye'],
  envoye: ['payee'],
  payee: [],
};

const CONDITIONS_PAIEMENT = {
  'reception': 'À réception de facture',
  '30_jours': '30 jours',
  '30_jours_fdm': '30 jours fin de mois',
  '45_jours_fdm': '45 jours fin de mois',
  '60_jours': '60 jours',
  'acompte_solde': '30% acompte, solde à réception',
};

// Avoir motifs — conformité française
export const AVOIR_MOTIFS = {
  erreur_facturation: 'Erreur de facturation',
  retour_marchandise: 'Retour de marchandise',
  remise_commerciale: 'Remise commerciale',
  annulation_prestation: 'Annulation de prestation',
  malfacon: 'Malfaçon',
  litige: 'Litige',
  geste_commercial: 'Geste commercial',
  autre: 'Autre',
};

export default function DevisPage({ clients, setClients, addClient, devis, setDevis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret, selectedDevis, setSelectedDevis, isDark, couleur, createMode, setCreateMode, addChantier, setPage, setSelectedChantier, addEchange, paiements = [], addPaiement, generateNextNumero, aiPrefill, setAiPrefill }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // RBAC permissions
  const { canPerform, canViewPrices, canEditData, getPermission } = usePermissions();
  const devisPermission = getPermission('devis');
  const isViewOnly = devisPermission === 'view' || devisPermission === 'view_no_prices';

  // Organization context
  const { orgId } = useOrg();

  // Template operations from DataContext
  const { customTemplates: ctxTemplates, addTemplate, deleteTemplate: deleteCtxTemplate, templateUsages, trackTemplateUsage } = useData();

  // Enrich template usages with actual template data for "recently used" display
  const enrichedRecentTemplates = useMemo(() => {
    return templateUsages.slice(0, 10).map(usage => {
      // Check custom templates first
      if (usage.template_id) {
        const tmpl = ctxTemplates.find(t => t.id === usage.template_id);
        if (tmpl) return { ...tmpl, used_at: usage.used_at };
      }
      // Check builtin templates
      if (usage.template_builtin_id) {
        for (const [metierId, metier] of Object.entries(MODELES_DEVIS)) {
          const modele = metier.modeles?.find(m => m.id === usage.template_builtin_id);
          if (modele) {
            return {
              ...modele,
              metierId,
              metierNom: metier.nom,
              categorie: metier.nom,
              used_at: usage.used_at,
            };
          }
        }
      }
      return null;
    }).filter(Boolean);
  }, [templateUsages, ctxTemplates]);

  // Get userId for relances
  const [relanceUserId, setRelanceUserId] = useState(null);
  useEffect(() => {
    if (!supabase || isDemo) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setRelanceUserId(data.user.id);
    });
  }, []);

  // Relances hook
  const relances = useRelances({
    devis, clients, entreprise,
    userId: relanceUserId,
    orgId,
  });

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  // Helper for PDF - format RCS complet
  const getRCSComplet = () => {
    if (!entreprise?.rcsVille || !entreprise?.rcsNumero) return '';
    return `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;
  };

  const [mode, setMode] = useState(selectedDevis ? 'preview' : 'list');
  const [selected, setSelected] = useState(selectedDevis || null);
  const [filter, setFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all'); // B7: all, month, quarter, year
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState('recent'); // recent, status, amount
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [tableSortBy, setTableSortBy] = useState('date'); // date, numero, client, montant, statut
  const [tableSortDir, setTableSortDir] = useState('desc'); // 'asc' | 'desc'
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const debouncedCatalogueSearch = useDebounce(catalogueSearch, 300);
  // Centralized modal management - reduces cognitive load
  const {
    showClientModal, setShowClientModal,
    showAcompteModal, setShowAcompteModal,
    showPreview, setShowPreview,
    showChantierModal, setShowChantierModal,
    showPdfPreview, setShowPdfPreview,
    showPaymentModal, setShowPaymentModal,
    showTemplateSelector, setShowTemplateSelector,
    showSmartWizard, setShowSmartWizard,
    showSignaturePad, setShowSignaturePad,
    showCatalogBrowser, setShowCatalogBrowser,
  } = useDevisModals();

  // DevisWizard uses direct useState (NOT useDevisModals) to avoid centralized modal conflicts
  const [showDevisWizard, setShowDevisWizard] = useState(false);

  // Échéancier d'acomptes
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [echeancierCache, setEcheancierCache] = useState({}); // { devisId: echeancierData }

  const [acomptePct, setAcomptePct] = useState(entreprise?.acompteDefaut || 30);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  const [snackbar, setSnackbar] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signataireName, setSignataireName] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // 'pdf' | 'duplicate' | null
  const [chantierForm, setChantierForm] = useState({ nom: '', adresse: '' });
  const [pdfContent, setPdfContent] = useState('');
  const [tooltip, setTooltip] = useState(null); // { text, x, y }
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAvoirModal, setShowAvoirModal] = useState(false);
  const [assigningClientDevisId, setAssigningClientDevisId] = useState(null); // B1: assign client to orphan devis
  const [showDevisExpressModal, setShowDevisExpressModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [editingDevis, setEditingDevis] = useState(null); // devis being edited in wizard

  // Multi-select state (table view)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelectId = (id) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSelectAll = (items) => setSelectedIds(prev => prev.size === items.length ? new Set() : new Set(items.map(d => d.id)));

  // Client & chantier filters
  const [clientFilter, setClientFilter] = useState('');
  const [chantierFilter, setChantierFilter] = useState('');

  // Status color bar map for cards
  const STATUS_BAR_COLORS = { brouillon: '#94a3b8', envoye: '#3b82f6', vu: '#3b82f6', signe: '#10b981', accepte: '#10b981', facture: '#8b5cf6', refuse: '#ef4444', expire: '#f59e0b', payee: '#10b981', acompte_facture: '#8b5cf6' };

  // Versioning state
  const [devisSnapshots, setDevisSnapshots] = useState([]);
  const [viewingSnapshot, setViewingSnapshot] = useState(null);
  const [comparingSnapshots, setComparingSnapshots] = useState(null); // { a, b }

  // Load snapshots when viewing a devis
  useEffect(() => {
    if (mode !== 'preview' || !selected?.id || selected.type === 'facture') {
      setDevisSnapshots([]);
      return;
    }
    let cancelled = false;
    getSnapshots(isDemo ? null : supabase, 'devis', selected.id)
      .then(snaps => { if (!cancelled) setDevisSnapshots(snaps); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected?.id, mode]);
  const [showCreateMenu, setShowCreateMenu] = useState(false); // split-button dropdown
  const [complianceDismissed, setComplianceDismissed] = useState(() => {
    try {
      const dismissed = localStorage.getItem('cp_devis_banner_dismissed');
      if (!dismissed) return false;
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    } catch { return false; }
  });
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Mes modèles');
  const [showSignatureLinkModal, setShowSignatureLinkModal] = useState(false);
  const [signatureLinkUrl, setSignatureLinkUrl] = useState(null);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [yousignReady, setYousignReady] = useState(false);
  const [yousignSending, setYousignSending] = useState(false);

  // Check if Yousign is connected
  useEffect(() => {
    isProviderSyncReady('yousign').then(ready => setYousignReady(ready)).catch(() => {});
  }, []);
  const [showSendConfirmation, setShowSendConfirmation] = useState(null); // { clientName, montant, canal, doc }
  const [showCreationSuccess, setShowCreationSuccess] = useState(null); // { devis, numero }

  // Tooltip component
  const Tooltip = ({ text, children, position = 'top' }) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        {show && (
          <div className={`absolute z-50 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg whitespace-nowrap ${
            position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' :
            position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' :
            position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' :
            'left-full top-1/2 -translate-y-1/2 ml-2'
          }`}>
            {text}
            <div className={`absolute w-2 h-2 bg-slate-900 rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`} />
          </div>
        )}
      </div>
    );
  };
  
  // Si selectedDevis change depuis l'extérieur (ex: depuis Clients), mettre à jour
  useEffect(() => {
    if (selectedDevis) {
      setSelected(selectedDevis);
      setMode('preview');
      // Scroll to top when opening devis detail
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Nettoyer après utilisation
      if (setSelectedDevis) setSelectedDevis(null);
    }
  }, [selectedDevis, setSelectedDevis]);

  // Sync selected with fresh devis data (prevents stale selected after DB updates)
  useEffect(() => {
    if (selected?.id && mode === 'preview') {
      const fresh = devis.find(d => d.id === selected.id);
      if (fresh && fresh !== selected) {
        setSelected(fresh);
      }
    }
  }, [devis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch échéancier when selected devis changes (if it has one)
  useEffect(() => {
    if (selected?.echeancier_id && !echeancierCache[selected.id]) {
      fetchEcheancier(selected.id);
    }
    // Also fetch échéancier for source devis when viewing acompte/solde facture
    if (selected?.devis_source_id && (selected.facture_type === 'acompte' || selected.facture_type === 'solde')) {
      const sourceDevis = devis.find(d => d.id === selected.devis_source_id);
      if (sourceDevis?.echeancier_id && !echeancierCache[sourceDevis.id]) {
        fetchEcheancier(sourceDevis.id);
      }
    }
  }, [selected?.id, selected?.echeancier_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState({
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: new Date().toISOString().split('T')[0],
    validite: entreprise?.validiteDevis || 30,
    sections: [{ id: '1', titre: '', lignes: [] }],
    tvaDefaut: entreprise?.tvaDefaut || 10,
    remise: 0,
    retenueGarantie: false, // Retenue de garantie 5% (BTP)
    conditionsPaiement: entreprise?.conditionsPaiementDefaut || '30_jours',
    notes: ''
  });

  const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
  const formatMoney = (n) => fmtMoney(n, 2);

  // Calcul pénalités de retard (Article L441-10 Code de commerce)
  const calculatePenalites = (doc) => {
    if (!doc || doc.type !== 'facture' || doc.statut === 'payee' || doc.facture_type === 'avoir') return null;
    const delai = entreprise?.delaiPaiement || 30;
    const echeance = doc.date_echeance
      ? new Date(doc.date_echeance)
      : new Date(new Date(doc.date).getTime() + delai * 86400000);
    const joursRetard = Math.max(0, Math.floor((Date.now() - echeance) / 86400000));
    if (joursRetard <= 0) return null;
    const taux = entreprise?.tauxPenaliteRetard || 10; // 3x taux BCE (~3.5%)
    const penalite = (doc.total_ttc || 0) * (taux / 100) * (joursRetard / 365);
    return { joursRetard, echeance, taux, penalite: Math.round(penalite * 100) / 100, indemnite: 40, total: Math.round((penalite + 40) * 100) / 100 };
  };

  useEffect(() => { if (snackbar) { const t = setTimeout(() => setSnackbar(null), 8000); return () => clearTimeout(t); } }, [snackbar]);
  useEffect(() => { if (createMode) { setMode('create'); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  // AI Prefill: populate form with IA-generated data (devis stays local until user confirms)
  useEffect(() => {
    if (!aiPrefill) return;
    const lignes = (aiPrefill.lignes || []).map((l, i) => ({
      id: `ia_${i}_${Date.now()}`,
      description: l.designation || l.description || '',
      quantite: l.quantite || 1,
      unite: l.unite || 'u',
      prixUnitaire: l.prixUnitaire || 0,
    }));
    setForm(prev => ({
      ...prev,
      type: 'devis',
      clientId: aiPrefill.client_id || '',
      tvaDefaut: aiPrefill.tvaRate || prev.tvaDefaut,
      validite: aiPrefill.validite || prev.validite,
      notes: [aiPrefill.objet || aiPrefill.description || '', aiPrefill.notes || ''].filter(Boolean).join('\n'),
      sections: [{ id: '1', titre: aiPrefill.objet || aiPrefill.description || '', lignes }],
    }));
    setMode('create');
    setAiPrefill?.(null); // Consume the prefill data
  }, [aiPrefill, setAiPrefill]);

  const statusOrder = { brouillon: 0, envoye: 1, accepte: 2, acompte_facture: 3, facture: 4, payee: 5, refuse: 6 };

  const getSortedDevis = (items) => {
    switch (sortBy) {
      case 'status':
        return [...items].sort((a, b) => (statusOrder[a.statut] ?? 99) - (statusOrder[b.statut] ?? 99));
      case 'amount':
        return [...items].sort((a, b) => (b.total_ttc || 0) - (a.total_ttc || 0));
      case 'recent':
      default:
        return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  };

  // Table sort helper — applied when viewMode === 'table'
  const getTableSorted = (items) => {
    const dir = tableSortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      switch (tableSortBy) {
        case 'numero':
          return dir * (a.numero || '').localeCompare(b.numero || '', 'fr');
        case 'client': {
          const ca = cleanClientName(clients.find(c => c.id === a.client_id)) || a.client_nom || '';
          const cb = cleanClientName(clients.find(c => c.id === b.client_id)) || b.client_nom || '';
          return dir * ca.localeCompare(cb, 'fr');
        }
        case 'montant':
          return dir * ((getDevisTTC(a) || 0) - (getDevisTTC(b) || 0));
        case 'statut':
          return dir * ((statusOrder[a.statut] ?? 99) - (statusOrder[b.statut] ?? 99));
        case 'date':
        default:
          return dir * (new Date(a.date) - new Date(b.date));
      }
    });
  };

  const handleTableSort = (col) => {
    if (tableSortBy === col) {
      setTableSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortBy(col);
      setTableSortDir(col === 'date' || col === 'montant' ? 'desc' : 'asc');
    }
  };

  // B7: Period date boundaries
  const periodStart = useMemo(() => {
    const now = new Date();
    if (periodFilter === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (periodFilter === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (periodFilter === 'year') return new Date(now.getFullYear(), 0, 1);
    return null; // 'all'
  }, [periodFilter]);

  const filtered = getSortedDevis(devis.filter(d => {
    // Filter out ghost devis: no numero AND orphan client (client doesn't exist) AND brouillon
    if (!d.numero && !clients.find(c => c.id === d.client_id) && (!d.statut || d.statut === 'brouillon')) return false;
    // Filter out devis where client was deleted and devis was never sent (brouillon only)
    if (d.client_id && !clients.find(c => c.id === d.client_id) && d.statut === 'brouillon' && !d.total_ttc) return false;
    // Filter out test/dev data artefacts (DUP suffixes, malformed numeros)
    if (d.numero && (/DUP\d*$/.test(d.numero) || /^DEV----/.test(d.numero))) return false;
    // B7: Period filter
    if (periodStart && new Date(d.date) < periodStart) return false;
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && (d.type !== 'facture' || d.facture_type === 'avoir' || d.facture_type === 'situation')) return false;
    if (filter === 'situations' && d.facture_type !== 'situation') return false;
    if (filter === 'avoirs' && d.facture_type !== 'avoir') return false;
    if (filter === 'acomptes' && !(d.facture_type === 'acompte' || d.facture_type === 'solde' || (d.type === 'devis' && (d.statut === 'acompte_facture' || d.echeancier_id)))) return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (filter === 'a_traiter') {
      const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
      if (d.statut === 'brouillon' && days > 2) return true;
      if (['envoye', 'vu'].includes(d.statut) && days > 7) return true;
      return false;
    }
    if (filter === 'factures_impayees' && !(d.type === 'facture' && d.statut !== 'payee')) return false;
    if (filter === 'en_relance' && !relances.getDocumentPending(d.id)) return false;
    if (filter === 'conversion' && !(d.type === 'devis' && ['envoye', 'vu', 'refuse'].includes(d.statut))) return false;
    // Client filter
    if (clientFilter && d.client_id !== clientFilter) return false;
    // Chantier filter
    if (chantierFilter && d.chantier_id !== chantierFilter) return false;
    // Search by numero, client name/entreprise, chantier name, and objet
    if (debouncedSearch) {
      const client = clients.find(c => c.id === d.client_id);
      const chantier = chantiers.find(ch => ch.id === d.chantier_id);
      const searchText = `${d.numero || ''} ${client?.nom || ''} ${client?.prenom || ''} ${client?.entreprise || ''} ${chantier?.nom || ''} ${d.objet || ''}`.toLowerCase();
      if (!searchText.includes(debouncedSearch.toLowerCase())) return false;
    }
    return true;
  }));

  // B7: Counts for filter pills (computed from period-filtered list only)
  const filterCounts = useMemo(() => {
    const base = devis.filter(d => {
      if (!d.numero && !clients.find(c => c.id === d.client_id) && (!d.statut || d.statut === 'brouillon')) return false;
      if (d.client_id && !clients.find(c => c.id === d.client_id) && d.statut === 'brouillon' && !d.total_ttc) return false;
      if (d.numero && (/DUP\d*$/.test(d.numero) || /^DEV----/.test(d.numero))) return false;
      if (periodStart && new Date(d.date) < periodStart) return false;
      return true;
    });
    return {
      all: base.length,
      devis: base.filter(d => d.type === 'devis').length,
      factures: base.filter(d => d.type === 'facture' && d.facture_type !== 'avoir' && d.facture_type !== 'situation').length,
      situations: base.filter(d => d.facture_type === 'situation').length,
      avoirs: base.filter(d => d.facture_type === 'avoir').length,
      acomptes: base.filter(d => d.facture_type === 'acompte' || d.facture_type === 'solde' || (d.type === 'devis' && (d.statut === 'acompte_facture' || d.echeancier_id))).length,
      attente: base.filter(d => ['envoye', 'vu'].includes(d.statut)).length,
      a_traiter: base.filter(d => {
        const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
        return (d.statut === 'brouillon' && days > 2) || (['envoye', 'vu'].includes(d.statut) && days > 7);
      }).length,
    };
  }, [devis, clients, periodStart]);

  // Nettoyage affichage numéros — normalise les timestamps et padding court
  const cleanNumero = (numero) => {
    if (!numero) return '—';
    return normalizeNumero(numero);
  };
  const cleanClientName = (client) => {
    if (!client) return '';
    if (/^(ClientPersist|Test_|test_)/i.test(client.nom || '')) return client.prenom || '';
    if (/^(ClientPersist|Test_|test_)/i.test(client.entreprise || '')) {
      return formatClientName(client, '') || '';
    }
    return formatClientName(client, '') || '';
  };

  // Helper: compute line total robustly (handles montant, camelCase, snake_case)
  const getLineTotal = (l) => {
    if (l.montant != null && l.montant !== 0) return parseFloat(l.montant);
    const qty = parseFloat(l.quantite || 0);
    const pu = parseFloat(l.prixUnitaire || l.prix_unitaire || 0);
    return qty * pu;
  };

  // Helper: get TTC for a devis, recalculating from lignes if total_ttc is 0/missing
  const getDevisTTC = (d) => {
    if (d.total_ttc && d.total_ttc > 0) return d.total_ttc;
    // Recalculate from lignes
    const allLignes = d.sections?.length > 0
      ? d.sections.flatMap(s => s.lignes || [])
      : (d.lignes || []);
    if (allLignes.length === 0) return 0;
    const ht = allLignes.reduce((s, l) => s + getLineTotal(l), 0);
    const tvaRate = d.tvaRate || 20;
    return ht * (1 + tvaRate / 100);
  };

  // Calcul des totaux avec multi-taux TVA et marge
  const calculateTotals = () => {
    let totalHT = 0;
    let totalCoutAchat = 0;
    const tvaParTaux = {}; // { 10: { base: 0, montant: 0 }, 20: {...} }

    form.sections.forEach(s => s.lignes.forEach(l => {
      const montant = getLineTotal(l);
      const taux = l.tva !== undefined ? l.tva : form.tvaDefaut;
      const coutAchat = (l.prixAchat || 0) * (l.quantite || 0);
      totalHT += montant;
      totalCoutAchat += coutAchat;

      if (!tvaParTaux[taux]) tvaParTaux[taux] = { base: 0, montant: 0 };
      tvaParTaux[taux].base += montant;
      tvaParTaux[taux].montant += montant * (taux / 100);
    }));

    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;

    // Recalculer TVA après remise (proportionnel)
    const ratioRemise = totalHT > 0 ? htApresRemise / totalHT : 1;
    Object.keys(tvaParTaux).forEach(taux => {
      tvaParTaux[taux].base *= ratioRemise;
      tvaParTaux[taux].montant *= ratioRemise;
    });

    const totalTVA = Object.values(tvaParTaux).reduce((s, t) => s + t.montant, 0);

    // Calcul marge
    const marge = htApresRemise - totalCoutAchat;
    const tauxMarge = htApresRemise > 0 ? (marge / htApresRemise) * 100 : 0;

    // Retenue de garantie (5% du TTC, applicable aux travaux BTP)
    const ttcBrut = htApresRemise + (isMicro ? 0 : totalTVA);
    const retenueGarantie = form.retenueGarantie ? ttcBrut * 0.05 : 0;
    const ttcNet = ttcBrut - retenueGarantie;

    return {
      totalHT,
      totalCoutAchat,
      remiseAmount,
      htApresRemise,
      tvaParTaux,
      totalTVA: isMicro ? 0 : totalTVA,
      ttc: ttcBrut,
      retenueGarantie,
      ttcNet,
      marge,
      tauxMarge
    };
  };
  const totals = calculateTotals();

  // Ajouter ligne avec TVA par défaut
  const addLigne = (item, sectionId) => {
    const ligne = { 
      id: generateId(), 
      description: item.nom || '', 
      quantite: 1, 
      unite: item.unite || 'unité', 
      prixUnitaire: item.prix || 0, 
      prixAchat: item.prixAchat || 0, 
      montant: item.prix || 0,
      tva: form.tvaDefaut // TVA par ligne
    };
    setForm(p => ({ ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, lignes: [...s.lignes, ligne] } : s) }));
  };

  const updateLigne = (sectionId, ligneId, field, value) => {
    setForm(p => ({ ...p, sections: p.sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, lignes: s.lignes.map(l => {
        if (l.id !== ligneId) return l;
        const updated = { ...l, [field]: value };
        if (field === 'quantite' || field === 'prixUnitaire') updated.montant = (parseFloat(updated.quantite) || 0) * (parseFloat(updated.prixUnitaire) || 0);
        return updated;
      })};
    })}));
  };

  const removeLigne = (sectionId, ligneId) => setForm(p => ({ ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, lignes: s.lignes.filter(l => l.id !== ligneId) } : s) }));

  const moveLigne = (sectionId, ligneIdx, direction) => {
    setForm(p => ({
      ...p,
      sections: p.sections.map(s => {
        if (s.id !== sectionId) return s;
        const arr = [...s.lignes];
        const target = ligneIdx + direction;
        if (target < 0 || target >= arr.length) return s;
        [arr[ligneIdx], arr[target]] = [arr[target], arr[ligneIdx]];
        return { ...s, lignes: arr };
      })
    }));
  };

  // === Sub-items (sous-lignes informatives) ===
  const addSubItem = (sectionId, ligneId) => {
    setForm(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== sectionId) return s;
        return { ...s, lignes: s.lignes.map(l => {
          if (l.id !== ligneId) return l;
          return { ...l, subItems: [...(l.subItems || []), { id: `sub_${Date.now()}`, description: '', quantite: 1, prixUnitaire: 0 }] };
        })};
      })
    }));
  };

  const updateSubItem = (sectionId, ligneId, subIdx, field, value) => {
    setForm(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== sectionId) return s;
        return { ...s, lignes: s.lignes.map(l => {
          if (l.id !== ligneId) return l;
          const subItems = [...(l.subItems || [])];
          subItems[subIdx] = { ...subItems[subIdx], [field]: value };
          return { ...l, subItems };
        })};
      })
    }));
  };

  const removeSubItem = (sectionId, ligneId, subIdx) => {
    setForm(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== sectionId) return s;
        return { ...s, lignes: s.lignes.map(l => {
          if (l.id !== ligneId) return l;
          return { ...l, subItems: (l.subItems || []).filter((_, i) => i !== subIdx) };
        })};
      })
    }));
  };

  // Génération numéro unique garanti (format: DEV-2026-00001 / FAC-2026-00001)
  // Version synchrone (fallback local)
  // In-memory cursor for local fallback to prevent race conditions
  const numeroCursorRef = useRef({});
  const generateNumeroLocal = (type) => {
    const prefix = type === 'facture' ? 'FAC' : type === 'avoir' ? 'AV' : 'DEV';
    const year = new Date().getFullYear();
    const cursorKey = `${prefix}-${year}`;
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    const maxSeq = devis
      .filter(d => type === 'avoir'
        ? d.facture_type === 'avoir'
        : (d.type || 'devis') === type && d.facture_type !== 'avoir')
      .map(d => { const m = (d.numero || '').match(pattern); return m ? parseInt(m[1], 10) : 0; })
      .reduce((max, n) => Math.max(max, n), 0);
    const cursorMax = numeroCursorRef.current[cursorKey] || 0;
    const nextSeq = Math.max(maxSeq, cursorMax) + 1;
    numeroCursorRef.current[cursorKey] = nextSeq;
    return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;
  };
  // Version async qui vérifie aussi Supabase
  const generateNumero = async (type) => {
    if (generateNextNumero) {
      try { return await generateNextNumero(type); } catch (e) { /* fallback */ }
    }
    return generateNumeroLocal(type);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return; // Guard against double-submit
    if (!form.clientId) return showToast('Sélectionnez un client', 'error');
    if (form.sections.every(s => s.lignes.length === 0)) return showToast('Ajoutez des lignes', 'error');

    setIsSubmitting(true);
    try {
      const client = clients.find(c => c.id === form.clientId);
      const numero = await generateNumero(form.type);
      const docType = form.type;

      const newDevis = await onSubmit({
        numero,
        type: form.type,
        client_id: form.clientId,
        client_nom: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
        chantier_id: form.chantierId,
        date: form.date,
        validite: form.validite,
        statut: 'brouillon',
        sections: form.sections,
        lignes: form.sections.flatMap(s => s.lignes),
        tvaParTaux: totals.tvaParTaux,
        tvaDetails: totals.tvaParTaux,
        tvaRate: form.tvaDefaut,
        remise: form.remise,
        total_ht: totals.htApresRemise,
        tva: totals.totalTVA,
        total_ttc: totals.ttc,
        retenueGarantie: form.retenueGarantie,
        retenue_montant: totals.retenueGarantie,
        ttc_net: totals.ttcNet,
        marge: totals.marge,
        tauxMarge: totals.tauxMarge,
        conditionsPaiement: form.conditionsPaiement,
        notes: form.notes
      });

      // Reset form
      setForm({
        type: 'devis',
        clientId: '',
        chantierId: '',
        date: new Date().toISOString().split('T')[0],
        validite: entreprise?.validiteDevis || 30,
        sections: [{ id: '1', titre: '', lignes: [] }],
        tvaDefaut: entreprise?.tvaDefaut || 10,
        remise: 0,
        retenueGarantie: false,
        notes: ''
      });

      // Redirect to detail view of the created devis
      if (newDevis?.id) {
        setSelected(newDevis);
        setMode('preview');
        setSnackbar({
          type: 'success',
          message: `${docType === 'facture' ? 'Facture' : 'Devis'} ${numero} créé avec succès`
        });
      } else {
        // Fallback to list if no devis returned
        setMode('list');
        setSnackbar({ type: 'success', message: `${docType === 'facture' ? 'Facture' : 'Devis'} ${numero} créé` });
      }
    } catch (err) {
      // Error creating devis logged silently
      showToast(mapError(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dupliquer un devis/facture
  const duplicateDocument = async (doc) => {
    const newLignes = (doc.lignes || []).map(l => ({
      ...l,
      id: generateId()
    }));
    const newSections = doc.sections ? doc.sections.map(s => ({
      ...s,
      id: generateId(),
      lignes: s.lignes.map(l => ({
        ...l,
        id: generateId()
      }))
    })) : [{ id: '1', titre: '', lignes: newLignes }];

    const newDoc = {
      id: generateId(),
      numero: await generateNumero('devis'),
      type: 'devis',
      client_id: doc.client_id,
      client_nom: doc.client_nom,
      chantier_id: '',
      date: new Date().toISOString().split('T')[0],
      validite: doc.validite || entreprise?.validiteDevis || 30,
      statut: 'brouillon',
      sections: newSections,
      lignes: newLignes,
      tvaParTaux: doc.tvaParTaux,
      tvaDetails: doc.tvaDetails,
      tvaRate: doc.tvaRate || entreprise?.tvaDefaut || 10,
      remise: doc.remise || 0,
      retenueGarantie: doc.retenueGarantie || false,
      total_ht: doc.total_ht,
      tva: doc.tva,
      total_ttc: doc.total_ttc,
      notes: doc.notes || ''
    };

    const created = await onSubmit(newDoc);
    setSelected(created || newDoc);
    setMode('preview');
    setSnackbar({
      type: 'success',
      message: `Devis ${newDoc.numero} créé (copie)`,
      action: {
        label: 'Voir',
        onClick: () => setSnackbar(null)
      }
    });
  };

  // Créer un avenant à partir d'un devis existant
  const createAvenant = async (doc) => {
    // Count existing avenants for this source devis
    const sourceId = doc.avenant_source_id || doc.id;
    const existingAvenants = devis.filter(d => d.avenant_source_id === sourceId);
    const avenantNum = existingAvenants.length + 1;

    const newLignes = (doc.lignes || []).map(l => ({
      ...l,
      id: generateId()
    }));
    const newSections = doc.sections ? doc.sections.map(s => ({
      ...s,
      id: generateId(),
      lignes: s.lignes.map(l => ({
        ...l,
        id: generateId()
      }))
    })) : [{ id: '1', titre: '', lignes: newLignes }];

    const sourceNumero = doc.avenant_source_numero || doc.numero;
    const newDoc = {
      id: generateId(),
      numero: `${sourceNumero}-AV${avenantNum}`,
      type: 'devis',
      client_id: doc.client_id,
      client_nom: doc.client_nom,
      chantier_id: doc.chantier_id || '',
      date: new Date().toISOString().split('T')[0],
      validite: doc.validite || entreprise?.validiteDevis || 30,
      statut: 'brouillon',
      sections: newSections,
      lignes: newLignes,
      tvaParTaux: doc.tvaParTaux,
      tvaDetails: doc.tvaDetails,
      tvaRate: doc.tvaRate || entreprise?.tvaDefaut || 10,
      remise: doc.remise || 0,
      total_ht: doc.total_ht,
      tva: doc.tva,
      total_ttc: doc.total_ttc,
      notes: doc.notes || '',
      // Avenant metadata
      is_avenant: true,
      avenant_numero: avenantNum,
      avenant_source_id: sourceId,
      avenant_source_numero: sourceNumero,
    };

    const created = await onSubmit(newDoc);
    setSelected(created || newDoc);
    setMode('edit');
    setSnackbar({
      type: 'success',
      message: `Avenant n°${avenantNum} créé pour ${sourceNumero}`,
      action: { label: 'Voir', onClick: () => setSnackbar(null) }
    });
  };

  // Canvas signature
  useEffect(() => { if (mode === 'sign' && canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; } }, [mode]);
  const startDraw = (e) => { setIsDrawing(true); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); };
  const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); ctx.stroke(); };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => canvasRef.current?.getContext('2d').clearRect(0, 0, 350, 180);
  const saveSignature = () => { if (!selected) return; onUpdate(selected.id, { signature: canvasRef.current?.toDataURL() || 'signed', signataire: signataireName || '', signatureDate: new Date().toISOString(), statut: 'accepte' }); setMode('list'); setSelected(null); setSignataireName(''); setSnackbar({ type: 'success', message: 'Devis signé et accepté !' }); };

  // New signature pad handler (react-signature-canvas)
  const handleSignatureSave = (signatureData) => {
    if (!selected) return;
    onUpdate(selected.id, {
      signature: signatureData.signature,
      signatureDate: signatureData.signatureDate,
      signataire: signatureData.signataire,
      statut: 'accepte'
    });
    setSelected(s => ({ ...s, signature: signatureData.signature, signatureDate: signatureData.signatureDate, statut: 'accepte' }));
    setSnackbar({ type: 'success', message: 'Devis signé et accepté ✓' });
  };

  // Template selection handler
  const handleTemplateSelect = (templateData) => {
    setForm(prev => ({
      ...prev,
      sections: [{
        id: '1',
        titre: templateData.template.nom,
        lignes: templateData.lignes
      }]
    }));
    // Track template usage
    if (templateData.template?.id) {
      trackTemplateUsage(templateData.template.id);
    }
    setSnackbar({ type: 'success', message: `Modèle "${templateData.template.nom}" appliqué` });
  };

  // Smart Template Wizard handler - creates complete devis from wizard
  const handleSmartDevisCreate = async (devisData) => {
    // Validate required data
    if (!devisData || !devisData.clientId || !devisData.sections?.length) {
      setSnackbar({ type: 'error', message: 'Données du devis incomplètes' });
      return;
    }

    // Generate numero
    const numero = await generateNumero('devis');

    // Flatten all lines for total calculation and lignes array
    const allLignes = [];
    devisData.sections.forEach(section => {
      if (section?.lignes) {
        section.lignes.forEach(ligne => {
          allLignes.push({
            ...ligne,
            section: section.titre
          });
        });
      }
    });

    // Build tvaParTaux from lignes for multi-rate TVA support
    const tvaParTaux = {};
    allLignes.forEach(l => {
      const rate = l.tva !== undefined ? l.tva : (devisData.tvaDefaut || 20);
      const montant = (parseFloat(l.quantite) || 1) * (parseFloat(l.prixUnitaire || l.prix_unitaire) || 0);
      if (!tvaParTaux[rate]) tvaParTaux[rate] = { base: 0, montant: 0 };
      tvaParTaux[rate].base += montant;
      tvaParTaux[rate].montant += montant * (rate / 100);
    });

    // Create the devis object
    const newDevis = {
      id: generateId(),
      numero,
      type: 'devis',
      statut: 'brouillon',
      client_id: devisData.clientId,
      chantier_id: null,
      date: devisData.date,
      validite: devisData.validite,
      sections: devisData.sections,
      lignes: allLignes,
      tvaRate: devisData.tvaDefaut || 20,
      tvaParTaux,
      tvaDetails: tvaParTaux,
      remise: devisData.remise || 0,
      notes: devisData.notes,
      total_ht: devisData.total_ht,
      tva: devisData.total_tva,
      total_tva: devisData.total_tva,
      total_ttc: devisData.total_ttc,
      cout_revient: devisData.cout_revient,
      marge: devisData.marge,
      marge_pourcent: devisData.marge_pourcent,
      template: devisData.template
    };

    // Submit the devis
    const created = await onSubmit(newDevis);

    // Close wizard and navigate directly to the new devis
    setShowSmartWizard(false);
    setSelected(created || newDevis);
    setMode('preview');

    // Show success notification with action to view
    setSnackbar({
      type: 'success',
      message: `Devis ${numero} cree`,
      action: {
        label: 'Voir',
        onClick: () => {
          // Already in preview mode, just dismiss snackbar
          setSnackbar(null);
        }
      }
    });
  };

  // Payment creation handler
  const handlePaymentCreated = (paymentData) => {
    if (addPaiement) {
      addPaiement({
        ...paymentData,
        facture_id: selected?.id,
        documentId: selected?.id,
        documentNumero: selected?.numero,
        document: selected?.numero,
      });
    }
    // Auto-update facture status to 'payee' if fully paid
    if (selected?.type === 'facture' && selected.statut !== 'payee') {
      const existingPaiements = paiements.filter(p => p.facture_id === selected.id || p.document === selected.numero);
      const totalPaye = existingPaiements.reduce((s, p) => s + (p.montant || 0), 0) + (paymentData.amount || 0);
      if (totalPaye >= (selected.total_ttc || 0)) {
        // Build update payload — include offline payment metadata if available
        const updatePayload = { statut: 'payee' };
        if (paymentData.date_paiement) updatePayload.date_paiement = paymentData.date_paiement;
        if (paymentData.mode_paiement) updatePayload.mode_paiement = paymentData.mode_paiement;
        if (paymentData.reference_paiement) updatePayload.reference_paiement = paymentData.reference_paiement;

        onUpdate(selected.id, updatePayload);
        setSelected(s => s ? { ...s, ...updatePayload } : s);

        // Cancel any pending automatic relances for this document
        if (relances.isEnabled) {
          import('../lib/relanceEngine').then(({ cancelDocumentRelances }) => {
            cancelDocumentRelances(selected.id, relanceUserId, orgId).catch(() => {});
          });
        }

        const modeLabel = paymentData.mode_paiement ? ` (${paymentData.mode_paiement})` : '';
        setSnackbar({ type: 'success', message: `Facture ${selected.numero} marquée comme payée${modeLabel}` });

        // Update échéancier étape to 'paye' if this is an acompte facture
        if (selected.facture_type === 'acompte' && selected.devis_source_id) {
          const sourceDevis = devis.find(d => d.id === selected.devis_source_id);
          const echeancier = sourceDevis?.echeancier_id ? echeancierCache[sourceDevis.id] : null;
          if (echeancier) {
            const etape = echeancier.etapes?.find(e => e.facture_id === selected.id);
            if (etape) {
              const updatedEtapes = updateEtape(echeancier.etapes, etape.numero, { statut: ETAPE_STATUT.PAYE });
              const updatedEcheancier = { ...echeancier, etapes: updatedEtapes, updated_at: new Date().toISOString() };
              try {
                if (isDemo || !supabase) {
                  const stored = JSON.parse(localStorage.getItem('cp_echeanciers') || '{}');
                  stored[sourceDevis.id] = updatedEcheancier;
                  localStorage.setItem('cp_echeanciers', JSON.stringify(stored));
                } else {
                  supabase.from('acompte_echeanciers').update({ etapes: updatedEtapes, updated_at: updatedEcheancier.updated_at }).eq('id', echeancier.id).then(() => {});
                }
                setEcheancierCache(prev => ({ ...prev, [sourceDevis.id]: updatedEcheancier }));
              } catch (err) {
                // echeancier update error handled silently
              }
            }
          }
        }
      }
    }
  };

  // Workflow facturation
  const getAcompteFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'acompte');
  const getAllAcompteFactures = (devisId) => devis.filter(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'acompte');
  const getSoldeFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'solde');
  const getFacturesLiees = (devisId) => devis.filter(d => d.type === 'facture' && d.devis_source_id === devisId);

  // Fetch échéancier for a given devis (with cache)
  const fetchEcheancier = async (devisId) => {
    if (echeancierCache[devisId]) return echeancierCache[devisId];
    if (isDemo || !supabase) {
      const stored = JSON.parse(localStorage.getItem('cp_echeanciers') || '{}');
      const data = stored[devisId] || null;
      if (data) setEcheancierCache(prev => ({ ...prev, [devisId]: data }));
      return data;
    }
    try {
      const { data } = await supabase.from('acompte_echeanciers').select('*').eq('devis_id', devisId).single();
      if (data) setEcheancierCache(prev => ({ ...prev, [devisId]: data }));
      return data;
    } catch { return null; }
  };

  // Facturer une étape d'échéancier
  const facturerEtape = async (echeancier, etape) => {
    if (!selected || !echeancier) return;
    const last = isLastEtape(etape, echeancier.etapes);

    let montants, lignes, factureType;
    if (last) {
      // Solde: deduct all previous acomptes
      montants = computeSoldeMontants(selected, echeancier.etapes);
      lignes = buildFactureLignesForEtape(selected, etape, echeancier.etapes, entreprise?.tvaDefaut || 20);
      factureType = 'solde';
    } else {
      montants = computeEtapeMontants(selected, etape.pourcentage, entreprise?.tvaDefaut || 20);
      lignes = buildFactureLignesForEtape(selected, etape, echeancier.etapes, entreprise?.tvaDefaut || 20);
      factureType = 'acompte';
    }

    const facture = {
      id: crypto.randomUUID(),
      numero: await generateNumero('facture'),
      type: 'facture',
      facture_type: factureType,
      devis_source_id: selected.id,
      client_id: selected.client_id,
      chantier_id: selected.chantier_id,
      date: new Date().toISOString().split('T')[0],
      statut: 'envoye',
      date_echeance: new Date(Date.now() + (entreprise?.delaiPaiement || 30) * 86400000).toISOString().split('T')[0],
      tvaRate: selected.tvaRate || entreprise?.tvaDefaut || 20,
      tvaParTaux: montants.tvaParTaux,
      tvaDetails: montants.tvaParTaux,
      lignes,
      total_ht: montants.montant_ht,
      tva: montants.tva,
      total_ttc: montants.montant_ttc,
      acompte_pct: etape.pourcentage,
      objet: last
        ? `Facture de solde — ${selected.objet || selected.numero || ''}`
        : `Acompte ${etape.pourcentage}% — ${etape.label || ''} — ${selected.objet || selected.numero || ''}`,
    };

    await onSubmit(facture);

    // Update échéancier étape
    const updatedEtapes = updateEtape(echeancier.etapes, etape.numero, {
      statut: ETAPE_STATUT.FACTURE,
      facture_id: facture.id,
      date_facture: new Date().toISOString().split('T')[0],
    });

    const echeancierTermine = isEcheancierTermine(updatedEtapes);
    const updatedEcheancier = {
      ...echeancier,
      etapes: updatedEtapes,
      statut: echeancierTermine ? 'termine' : 'actif',
      updated_at: new Date().toISOString(),
    };

    // Persist échéancier update
    if (isDemo || !supabase) {
      const stored = JSON.parse(localStorage.getItem('cp_echeanciers') || '{}');
      stored[selected.id] = updatedEcheancier;
      localStorage.setItem('cp_echeanciers', JSON.stringify(stored));
    } else {
      await supabase.from('acompte_echeanciers')
        .update({ etapes: updatedEtapes, statut: updatedEcheancier.statut, updated_at: updatedEcheancier.updated_at })
        .eq('id', echeancier.id);
    }

    // Update cache
    setEcheancierCache(prev => ({ ...prev, [selected.id]: updatedEcheancier }));

    // Update devis status and acompte tracking fields
    const newDevisStatut = echeancierTermine ? 'facture' : 'acompte_facture';
    const totalPctFacture = updatedEtapes
      .filter(e => e.statut === ETAPE_STATUT.FACTURE || e.statut === ETAPE_STATUT.PAYE)
      .reduce((s, e) => s + (e.pourcentage || 0), 0);
    const montantFacture = updatedEtapes
      .filter(e => e.statut === ETAPE_STATUT.FACTURE || e.statut === ETAPE_STATUT.PAYE)
      .reduce((s, e) => s + (e.montant_ttc || 0), 0);
    const existingAcomptes = selected.acomptes_ids || [];
    const updatedAcomptesIds = factureType === 'acompte'
      ? [...existingAcomptes, facture.id]
      : existingAcomptes;
    const devisUpdate = {
      statut: newDevisStatut,
      acompte_pct: totalPctFacture,
      mode_facturation: 'echeancier',
      acomptes_ids: updatedAcomptesIds,
      montant_facture: Math.round(montantFacture * 100) / 100,
      ...(factureType === 'solde' ? { facture_solde_id: facture.id } : {}),
    };
    onUpdate(selected.id, devisUpdate);
    setSelected({ ...selected, ...devisUpdate });

    setSnackbar({
      type: 'success',
      message: `Facture ${last ? 'de solde' : 'd\'acompte'} ${facture.numero} créée`,
      action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } },
    });
  };

  // Handle échéancier creation callback
  const handleEcheancierCreated = (echeancier) => {
    if (!selected) return;
    setEcheancierCache(prev => ({ ...prev, [selected.id]: echeancier }));
    const updates = { echeancier_id: echeancier.id, mode_facturation: 'echeancier' };
    onUpdate(selected.id, updates);
    setSelected({ ...selected, ...updates });
    setSnackbar({ type: 'success', message: 'Échéancier créé avec succès' });
  };

  const createAcompte = async () => {
    if (!selected || (selected.statut !== 'accepte' && selected.statut !== 'signe')) return showToast('Le devis doit être accepté ou signé', 'error');
    if (getAcompteFacture(selected.id)) return showToast('Un acompte existe déjà', 'error');
    const ratio = acomptePct / 100;
    const montantHT = selected.total_ht * ratio;
    // Use stored multi-rate TVA proportionally, fallback to single rate
    const tva = selected.tva ? selected.tva * ratio : montantHT * ((selected.tvaRate || entreprise?.tvaDefaut || 20) / 100);
    const ttc = montantHT + tva;
    // Build proportional tvaParTaux for the acompte
    const tvaParTaux = {};
    const srcTva = selected.tvaParTaux || selected.tvaDetails;
    if (srcTva && typeof srcTva === 'object') {
      Object.entries(srcTva).forEach(([rate, info]) => {
        tvaParTaux[rate] = { base: (info.base || 0) * ratio, montant: (info.montant || 0) * ratio };
      });
    }
    const facture = {
      id: crypto.randomUUID(), numero: await generateNumero('facture'), type: 'facture', facture_type: 'acompte',
      devis_source_id: selected.id, client_id: selected.client_id, chantier_id: selected.chantier_id,
      date: new Date().toISOString().split('T')[0], statut: 'envoye',
      date_echeance: new Date(Date.now() + (entreprise?.delaiPaiement || 30) * 86400000).toISOString().split('T')[0],
      tvaRate: selected.tvaRate || entreprise?.tvaDefaut || 20,
      tvaParTaux, tvaDetails: tvaParTaux,
      lignes: [{ id: '1', description: `Acompte ${acomptePct}% sur devis ${selected.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montantHT, montant: montantHT, tva: selected.tvaRate || entreprise?.tvaDefaut || 20 }],
      total_ht: montantHT, tva, total_ttc: ttc, acompte_pct: acomptePct
    };
    await onSubmit(facture);
    const acompteUpdate = {
      statut: 'acompte_facture',
      acompte_pct: acomptePct,
      mode_facturation: 'acompte',
      acomptes_ids: [...(selected.acomptes_ids || []), facture.id],
      montant_facture: Math.round(ttc * 100) / 100,
    };
    onUpdate(selected.id, acompteUpdate);
    setShowAcompteModal(false);
    setSelected({ ...selected, ...acompteUpdate });
    setSnackbar({ type: 'success', message: `Facture d'acompte ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  const confirmAndCreateSolde = async () => {
    if (!selected) return;
    const allAcomptes = getAllAcompteFactures(selected.id);
    const totalAcomptesTTC = allAcomptes.reduce((s, a) => s + (a.total_ttc || 0), 0);
    const reste = allAcomptes.length > 0 ? selected.total_ttc - totalAcomptesTTC : selected.total_ttc;
    const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'le client';
    const label = allAcomptes.length > 0 ? `Facturer le solde de ${formatMoney(reste)}` : `Créer la facture complète de ${formatMoney(selected.total_ttc)}`;
    const ok = await confirm({
      title: allAcomptes.length > 0 ? 'Facturer le solde ?' : 'Créer la facture complète ?',
      message: `${label} pour ${clientName}. Cette action est irréversible.`
    });
    if (!ok) return;
    await createSolde();
  };

  const createSolde = async () => {
    if (!selected) return;
    // Support multiple acomptes
    const allAcomptes = getAllAcompteFactures(selected.id);
    const totalAcompteHT = allAcomptes.reduce((s, a) => s + (a.total_ht || 0), 0);
    const totalAcompteTVA = allAcomptes.reduce((s, a) => s + (a.tva || 0), 0);
    const montantSoldeHT = selected.total_ht - totalAcompteHT;
    const tva = (selected.tva || 0) - totalAcompteTVA;
    const ttc = montantSoldeHT + tva;
    // Copy lignes with their per-line TVA rates preserved
    const lignes = (selected.lignes || []).map(l => ({ ...l, tva: l.tva !== undefined ? l.tva : (selected.tvaRate || entreprise?.tvaDefaut || 20) }));
    // Add negative line for each acompte already invoiced
    allAcomptes.forEach(acompte => {
      lignes.push({ id: `acompte_${acompte.id}`, description: `Acompte déjà facturé (${acompte.numero})`, quantite: 1, unite: 'forfait', prixUnitaire: -(acompte.total_ht || 0), montant: -(acompte.total_ht || 0) });
    });
    // Build tvaParTaux for the solde
    const tvaParTaux = {};
    const srcTva = selected.tvaParTaux || selected.tvaDetails;
    if (srcTva && typeof srcTva === 'object') {
      Object.entries(srcTva).forEach(([rate, info]) => {
        const acompteBase = allAcomptes.reduce((s, a) => s + ((a.tvaParTaux || a.tvaDetails)?.[rate]?.base || 0), 0);
        const acompteMontant = allAcomptes.reduce((s, a) => s + ((a.tvaParTaux || a.tvaDetails)?.[rate]?.montant || 0), 0);
        tvaParTaux[rate] = { base: (info.base || 0) - acompteBase, montant: (info.montant || 0) - acompteMontant };
      });
    }
    const hasAcomptes = allAcomptes.length > 0;
    const facture = {
      id: crypto.randomUUID(), numero: await generateNumero('facture'), type: 'facture', facture_type: hasAcomptes ? 'solde' : 'totale',
      devis_source_id: selected.id, acompte_facture_id: allAcomptes[0]?.id || null, client_id: selected.client_id, chantier_id: selected.chantier_id,
      date: new Date().toISOString().split('T')[0], statut: 'envoye',
      date_echeance: new Date(Date.now() + (entreprise?.delaiPaiement || 30) * 86400000).toISOString().split('T')[0],
      tvaRate: selected.tvaRate || entreprise?.tvaDefaut || 20,
      tvaParTaux, tvaDetails: tvaParTaux,
      lignes, total_ht: montantSoldeHT, tva, total_ttc: ttc
    };
    await onSubmit(facture);
    const soldeUpdate = {
      statut: 'facture',
      facture_solde_id: facture.id,
      montant_facture: Math.round((selected.total_ttc || 0) * 100) / 100,
      ...(hasAcomptes ? { mode_facturation: selected.mode_facturation || 'acompte' } : { mode_facturation: 'direct' }),
    };
    await onUpdate(selected.id, soldeUpdate);
    setSelected({ ...selected, ...soldeUpdate });
    setSnackbar({ type: 'success', message: `Facture ${hasAcomptes ? 'de solde' : ''} ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  // Créer un avoir (note de crédit) — via AvoirCreationModal
  const handleCreateAvoir = async (avoirData) => {
    const { sourceFacture, type: avoirType, motif, motifDetail, lignes, totalHT, totalTVA, totalTTC } = avoirData;

    const avoir = {
      id: crypto.randomUUID(),
      numero: await generateNumero('avoir'),
      type: 'facture',
      facture_type: 'avoir',
      avoir_source_id: sourceFacture.id,
      avoir_type: avoirType,
      avoir_motif: motif,
      avoir_motif_detail: motifDetail || null,
      devis_source_id: sourceFacture.devis_source_id,
      client_id: sourceFacture.client_id,
      client_nom: sourceFacture.client_nom,
      chantier_id: sourceFacture.chantier_id,
      date: new Date().toISOString().split('T')[0],
      statut: 'brouillon',
      tvaRate: sourceFacture.tvaRate,
      lignes: lignes.map(l => ({ ...l, id: generateId() })),
      total_ht: -(Math.abs(totalHT)),
      tva: -(Math.abs(totalTVA)),
      total_ttc: -(Math.abs(totalTTC)),
      notes: `Avoir ${avoirType === 'total' ? 'total' : 'partiel'} sur facture ${sourceFacture.numero}. Motif : ${AVOIR_MOTIFS[motif] || motif}${motifDetail ? '. ' + motifDetail : ''}`,
      conditionsPaiement: sourceFacture.conditionsPaiement,
    };

    await onSubmit(avoir);
    setShowAvoirModal(false);
    setSnackbar({
      type: 'success',
      message: `Avoir ${avoir.numero} créé en brouillon`,
      action: { label: 'Voir', onClick: () => { setSelected(avoir); setMode('preview'); setSnackbar(null); } }
    });
  };

  // PDF Generation - CONFORME LÉGISLATION FRANÇAISE
  const downloadPDF = (doc) => {
    // Situation facture: use dedicated builder from devisHtmlBuilder
    if (doc.facture_type === 'situation') {
      const client = clients.find(c => c.id === doc.client_id);
      const chantier = chantiers.find(c => c.id === doc.chantier_id);
      const parentDevis = doc.devis_source_id ? devis.find(d => d.id === doc.devis_source_id) : null;
      // Reconstruct situation data from chantier.situations_data
      const sitData = chantier?.situations_data;
      const sit = sitData?.situations?.find(s => s.numero === doc.situation_numero) || null;
      printSitFacture({
        situation: {
          ...(sit || {}),
          numero: doc.situation_numero || sit?.numero || 1,
          date: doc.date,
          lignes: sit?.lignes || doc.lignes?.map(l => ({
            description: l.description,
            quantite: 1,
            prixUnitaire: getLineTotal(l),
            unite: l.unite || 'ens',
            tva: l.tva !== undefined ? l.tva : (doc.tvaRate || 10),
            cumulActuel: 100,
            cumulPrecedent: 0,
          })) || [],
          retenueGarantiePct: sit?.isDGD ? 0 : (sitData?.retenue_garantie_pct || 5),
        },
        parentDevis: parentDevis || {},
        client: client || {},
        chantier: chantier || {},
        entreprise: entreprise || {},
        couleur,
      });
      return;
    }
    const client = clients.find(c => c.id === doc.client_id);
    const chantier = chantiers.find(c => c.id === doc.chantier_id);
    const isFacture = doc.type === 'facture';
    const isAvoirDoc = doc.facture_type === 'avoir';
    const sourceFactureDoc = isAvoirDoc && doc.avoir_source_id ? devis.find(d => d.id === doc.avoir_source_id) : null;
    const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
    const avoirColor = '#dc2626';
    const docColor = isAvoirDoc ? avoirColor : couleur;
    const dateValidite = new Date(doc.date);
    dateValidite.setDate(dateValidite.getDate() + (doc.validite || entreprise?.validiteDevis || 30));
    
    // Calculate TVA details from lignes if not present in doc
    const calculatedTvaDetails = doc.tvaDetails || (() => {
      const details = {};
      const defaultRate = doc.tvaRate || entreprise?.tvaDefaut || 10;
      filterValidLignes(doc.lignes).forEach(l => {
        const rate = l.tva !== undefined ? l.tva : defaultRate;
        if (!details[rate]) {
          details[rate] = { base: 0, montant: 0 };
        }
        const lineMontant = getLineTotal(l);
        details[rate].base += lineMontant;
        details[rate].montant += lineMontant * (rate / 100);
      });
      return details;
    })();

    const lignesHTML = filterValidLignes(doc.lignes).map(l => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description || ''}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || 0}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite||'unité'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatMoney(parseFloat(l.prixUnitaire||l.prix_unitaire||0))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${isMicro ? '-' : (l.tva !== undefined ? l.tva : (doc.tvaRate||10))+'%'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${getLineTotal(l)<0?'color:#dc2626;':''}">${formatMoney(getLineTotal(l))}</td>
      </tr>
    `).join('');

    const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${doc.facture_type === 'avoir' ? 'Avoir' : isFacture ? 'Facture' : 'Devis'} ${doc.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 25px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${docColor}; }
    .logo-section { max-width: 55%; }
    .logo { font-size: 16pt; font-weight: bold; color: ${docColor}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .entreprise-legal { font-size: 7pt; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .missing-legal { color: #94a3b8; font-style: italic; font-size: 7pt; }
    @media print { .missing-legal { display: none; } }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 22pt; color: ${docColor}; margin-bottom: 8px; letter-spacing: 1px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .doc-info strong { color: #1e293b; }
    .client-section { display: flex; gap: 20px; margin-bottom: 20px; }
    .info-block { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${docColor}; }
    .info-block h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-block .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    thead { background: ${docColor}; color: white; }
    .avoir-ref { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 9pt; color: #991b1b; }
    .avoir-ref strong { color: #7f1d1d; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 15px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
    .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals .total { background: ${docColor}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
    .conditions { background: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 7.5pt; line-height: 1.6; }
    .conditions h4 { font-size: 8pt; margin-bottom: 8px; color: #475569; }
    .conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .garanties { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px; border-radius: 6px; margin-top: 15px; font-size: 7.5pt; }
    .garanties h4 { color: #065f46; margin-bottom: 6px; }
    .retractation { background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 7.5pt; color: #92400e; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 25px; gap: 20px; }
    .signature-box { width: 48%; border: 1px solid #cbd5e1; padding: 12px; min-height: 90px; border-radius: 6px; }
    .signature-box h4 { font-size: 9pt; margin-bottom: 4px; }
    .signature-box p { font-size: 7pt; color: #64748b; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #64748b; text-align: center; line-height: 1.6; }
    .assurances { font-size: 7pt; color: #64748b; margin-top: 8px; }
    .micro-mention { background: #dbeafe; padding: 8px; border-radius: 4px; font-size: 8pt; color: #1e40af; margin-top: 10px; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">${entreprise?.nom || 'Mon Entreprise'}</div>
      <div class="entreprise-info">
        ${entreprise?.formeJuridique ? `<strong>${entreprise.formeJuridique}</strong>${entreprise?.capital ? ` - Capital: ${entreprise.capital} €` : ''}<br>` : ''}
        ${entreprise?.adresse?.replace(/\n/g, '<br>') || ''}<br>
        ${entreprise?.tel ? `Tél: ${entreprise.tel}` : ''} ${entreprise?.email ? `· ${entreprise.email}` : ''}
      </div>
      <div class="entreprise-legal">
        ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
        ${entreprise?.codeApe ? ` · APE: ${entreprise.codeApe}` : ''}
        ${getRCSComplet() ? `<br>${getRCSComplet()}` : ''}
        ${entreprise?.tvaIntra ? `<br>TVA Intra: ${entreprise.tvaIntra}` : ''}
        ${isMicro ? '<br><em>TVA non applicable, art. 293 B du CGI</em>' : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${doc.facture_type === 'avoir' ? 'AVOIR' : isFacture ? 'FACTURE' : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>N° ${doc.numero}</strong><br>
        Date: ${new Date(doc.date).toLocaleDateString('fr-FR')}<br>
        ${isFacture && doc.date_echeance ? `Échéance: ${new Date(doc.date_echeance).toLocaleDateString('fr-FR')}<br>` : ''}
        ${!isFacture ? `<strong>Valable jusqu'au: ${dateValidite.toLocaleDateString('fr-FR')}</strong>` : ''}
      </div>
    </div>
  </div>

  <!-- CLIENT & CHANTIER -->
  <div class="client-section">
    <div class="info-block">
      <h3>Client</h3>
      <div class="name">${client ? `${client.prenom || ''} ${client.nom || ''}` : (doc.client_nom || 'Client supprimé')}</div>
      ${client?.entreprise ? `<div style="font-size:9pt;color:#64748b">${client.entreprise}</div>` : ''}
      <div style="font-size:9pt">${client?.adresse || ''}</div>
      <div style="font-size:9pt">${client?.code_postal || ''} ${client?.ville || ''}</div>
      ${client?.telephone ? `<div style="font-size:8pt;color:#64748b;margin-top:4px">Tél: ${client.telephone}</div>` : ''}
      ${client?.email ? `<div style="font-size:8pt;color:#64748b">${client.email}</div>` : ''}
    </div>
    ${chantier ? `
    <div class="info-block">
      <h3>Lieu d'exécution</h3>
      <div class="name">${chantier.nom}</div>
      <div style="font-size:9pt">${chantier.adresse || client?.adresse || ''}</div>
    </div>
    ` : ''}
  </div>

  ${isAvoirDoc ? `
  <!-- RÉFÉRENCE AVOIR -->
  <div class="avoir-ref">
    <strong>AVOIR${doc.avoir_type === 'partiel' ? ' PARTIEL' : ''} relatif à la facture n° ${sourceFactureDoc?.numero || 'N/A'} du ${sourceFactureDoc ? new Date(sourceFactureDoc.date).toLocaleDateString('fr-FR') : 'N/A'}</strong>
    ${doc.avoir_motif ? `<br>Motif : ${AVOIR_MOTIFS[doc.avoir_motif] || doc.avoir_motif}${doc.avoir_motif_detail ? ` — ${doc.avoir_motif_detail}` : ''}` : ''}
  </div>
  ` : ''}

  <!-- TABLEAU PRESTATIONS -->
  <table aria-label="Détail des prestations du ${isAvoirDoc ? 'avoir' : 'devis'}">
    <thead>
      <tr>
        <th scope="col" style="width:40%">Description</th>
        <th scope="col" style="width:10%">Qté</th>
        <th scope="col" style="width:10%">Unité</th>
        <th scope="col" style="width:15%">PU HT</th>
        <th scope="col" style="width:10%">TVA</th>
        <th scope="col" style="width:15%">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>

  <!-- TOTAUX -->
  <div class="totals">
    <div class="row sub"><span>Total HT</span><span>${formatMoney(doc.total_ht||0)}</span></div>
    ${doc.remise ? `<div class="row sub" style="color:#dc2626"><span>Remise ${doc.remise}%</span><span>-${formatMoney((doc.total_ht||0) * doc.remise / 100)}</span></div>` : ''}
    ${!isMicro ? (Object.keys(calculatedTvaDetails).length > 0
      ? Object.entries(calculatedTvaDetails).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) =>
        `<div class="row sub"><span>TVA ${taux}%${Object.keys(calculatedTvaDetails).length > 1 ? ` (base: ${formatMoney(data.base)})` : ''}</span><span>${formatMoney(data.montant)}</span></div>`
      ).join('')
      : `<div class="row sub"><span>TVA ${doc.tvaRate||10}%</span><span>${formatMoney(doc.tva||0)}</span></div>`
    ) : ''}
    <div class="row total"><span>Total TTC</span><span>${formatMoney(doc.total_ttc||0)}</span></div>
    ${doc.acompte_pct ? `
    <div class="row sub" style="margin-top:8px;border-top:1px dashed #ccc;padding-top:8px"><span>Acompte ${doc.acompte_pct}%</span><span>${formatMoney((doc.total_ttc||0) * doc.acompte_pct / 100)}</span></div>
    <div class="row sub"><span>Solde à régler</span><span>${formatMoney((doc.total_ttc||0) * (100-doc.acompte_pct) / 100)}</span></div>
    ` : ''}
  </div>

  ${isMicro ? '<div class="micro-mention">TVA non applicable, article 293 B du Code Général des Impôts</div>' : ''}

  <!-- CONDITIONS -->
  ${!isAvoirDoc ? `<div class="conditions">
    <h4>CONDITIONS GÉNÉRALES</h4>
    <div class="conditions-grid">
      <div>
        <strong>Modalités de paiement</strong><br>
        · Virement bancaire<br>
        · Chèque à l'ordre de ${entreprise?.nom || ''}<br>
        · Espèces (max 1 000 € pour particulier)<br>
        ${entreprise?.iban ? `<br><strong>IBAN:</strong> ${entreprise.iban}` : ''}
        ${entreprise?.bic ? ` · <strong>BIC:</strong> ${entreprise.bic}` : ''}
      </div>
      <div>
        <strong>Délai de paiement</strong><br>
        ${doc.conditionsPaiement && CONDITIONS_PAIEMENT[doc.conditionsPaiement] ? CONDITIONS_PAIEMENT[doc.conditionsPaiement] : `${entreprise?.delaiPaiement || 30} jours`} à compter de la date ${isFacture ? 'de facture' : 'de réception des travaux'}.<br><br>
        <strong>Pénalités de retard</strong><br>
        Taux annuel: ${entreprise?.tauxPenalites || entreprise?.tauxPenaliteRetard || 10}% (3 fois le taux directeur BCE).<br>
        Indemnité forfaitaire de recouvrement: 40 € (art. D441-5 C. com.)
      </div>
    </div>
  </div>` : ''}

  ${!isFacture && !isAvoirDoc && (entreprise?.mentionGaranties !== false) ? `
  <!-- GARANTIES LÉGALES -->
  <div class="garanties">
    <h4> GARANTIES LÉGALES (Code civil & Code de la construction)</h4>
    <strong>1. Garantie de parfait achèvement</strong> - 1 an à compter de la réception des travaux<br>
    <strong>2. Garantie de bon fonctionnement</strong> - 2 ans (équipements dissociables)<br>
    <strong>3. Garantie décennale</strong> - 10 ans (solidité de l'ouvrage)
  </div>
  ` : ''}

  ${!isFacture && !isAvoirDoc && (entreprise?.mentionRetractation !== false) ? `
  <!-- DROIT DE RÉTRACTATION -->
  <div class="retractation">
    <strong>⚠️ DROIT DE RÉTRACTATION</strong> (Art. L221-18 du Code de la consommation)<br>
    Vous disposez d'un délai de <strong>14 jours</strong> pour exercer votre droit de rétractation sans justification ni pénalité.
    Le délai court à compter de la signature du présent devis.
    Pour l'exercer, envoyez une lettre recommandée AR à : ${entreprise?.adresse ? entreprise.adresse.replace(/\n/g, ', ') : entreprise?.nom || ''}
  </div>
  ` : ''}

  ${!isAvoirDoc && (entreprise?.mediateur || entreprise?.mediateurContact) ? `
  <!-- MÉDIATEUR DE LA CONSOMMATION -->
  <div class="retractation" style="margin-top:10px">
    <strong>MÉDIATEUR DE LA CONSOMMATION</strong> (Art. L612-1 du Code de la consommation)<br>
    En cas de litige, vous pouvez recourir gratuitement au service de médiation :
    ${entreprise.mediateur ? `<strong>${entreprise.mediateur}</strong>` : ''}
    ${entreprise.mediateurContact ? ` — ${entreprise.mediateurContact}` : ''}
  </div>
  ` : ''}

  ${!isAvoirDoc && entreprise?.cgv ? `
  <!-- CGV PERSONNALISÉES -->
  <div class="conditions" style="margin-top:10px">
    <h4>CONDITIONS PARTICULIÈRES</h4>
    ${entreprise.cgv}
  </div>
  ` : ''}

  ${!isFacture && !isAvoirDoc ? `
  <!-- SIGNATURES -->
  <div class="signature-section">
    <div class="signature-box">
      <h4>L'Entreprise</h4>
      <p>Bon pour accord<br>Date et signature</p>
    </div>
    <div class="signature-box">
      <h4>Le Client</h4>
      <p>Signature précédée de la mention manuscrite:<br><strong>"Bon pour accord"</strong> + Date</p>
      ${doc.signature ? '<div style="margin-top:15px;color:#16a34a;font-weight:bold">✓ Signé électroniquement'+(doc.signataire ? ' par '+doc.signataire : '')+' le '+new Date(doc.signatureDate).toLocaleDateString('fr-FR')+'</div>' : ''}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>${entreprise?.nom || ''}</strong>
    ${entreprise?.formeJuridique ? ` · ${entreprise.formeJuridique}` : ''}
    ${entreprise?.capital ? ` · Capital: ${entreprise.capital} €` : ''}
    ${entreprise?.adresse ? ` — ${entreprise.adresse.replace(/\n/g, ', ')}` : ''}<br>
    ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
    ${entreprise?.codeApe ? ` | APE: ${entreprise.codeApe}` : ''}
    ${getRCSComplet() ? ` | ${getRCSComplet()}` : ''}<br>
    ${entreprise?.tvaIntra ? `TVA Intracommunautaire: ${entreprise.tvaIntra}` : ''}<br>
    <div class="assurances">
      ${entreprise?.decennaleAssureur ? `Assurance décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide jusqu'au ${new Date(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}${entreprise.decennaleActivites ? ` — Activités: ${entreprise.decennaleActivites}` : ''}` : ''}
      ${entreprise?.decennaleAssureur && entreprise?.rcProAssureur ? '<br>' : ''}
      ${entreprise?.rcProAssureur ? `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}${entreprise.rcProValidite ? ` (Valide jusqu'au ${new Date(entreprise.rcProValidite).toLocaleDateString('fr-FR')})` : ''}${entreprise.rcProMontantGarantie ? ` — Garantie: ${entreprise.rcProMontantGarantie} €` : ''}${entreprise.rcProZone ? ` — Zone: ${entreprise.rcProZone}` : ''}` : ''}
      ${entreprise?.mentionRGE !== false && Array.isArray(entreprise?.labels) && entreprise.labels.filter(l => l.actif).length > 0 ? '<br>' + entreprise.labels.filter(l => l.actif).map(l => `${l.nom}${l.numero ? ` N°${l.numero}` : ''}${l.organisme ? ` (${l.organisme})` : ''}${l.dateExpiration ? ` — Valide jusqu'au ${new Date(l.dateExpiration).toLocaleDateString('fr-FR')}` : ''}`).join('<br>') : ''}
    </div>
    ${isAvoirDoc ? `<div style="margin-top:6px;font-size:6.5pt;color:#666">Avoir émis conformément à l'article 441-3 du Code de Commerce. Ce document annule et remplace partiellement ou totalement la facture de référence.</div>` : !isFacture ? `<div style="margin-top:6px;font-size:6.5pt;color:#666">Devis reçu avant l'exécution des travaux. Conditions de paiement et pénalités de retard conformes aux articles L441-10 et L441-6 du Code de commerce.</div>` : ''}
  </div>
</body>
</html>`;

    return content;
  };

  // Preview PDF in modal
  const previewPDF = (doc) => {
    const content = downloadPDF(doc);
    setPdfContent(content);
    setShowPdfPreview(true);
  };

  // Detect mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  };

  // Print/Download PDF — routes factures through Factur-X PDF/A-3 pipeline
  const printPDF = async (doc) => {
    const content = downloadPDF(doc);

    // Factures: generate real Factur-X PDF/A-3 with embedded XML
    if (doc.type === 'facture') {
      try {
        setActionLoading('pdf');
        const { generateAndDownloadFacturX } = await import('../lib/facturx-pdf.js');
        const client = clients.find(c => c.id === doc.client_id);
        await generateAndDownloadFacturX(doc, client || {}, entreprise || {}, content);
        showToast('Facture Factur-X téléchargée ✓', 'success');
        // Auto-upload to Google Drive if connected
        triggerDriveUpload(doc);
      } catch (err) {
        // Factur-X generation failed, fallback to HTML
        showToast('Erreur Factur-X, export HTML de secours', 'warning');
        fallbackHtmlPrint(content, doc);
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // Devis & autres: comportement HTML existant
    fallbackHtmlPrint(content, doc);
    // Also try Drive upload for devis
    triggerDriveUpload(doc);
  };

  // Google Drive auto-upload (fire-and-forget)
  const triggerDriveUpload = async (doc) => {
    try {
      const driveReady = await isProviderSyncReady('google_drive');
      if (!driveReady) return;
      const { triggerAutoSync } = await import('../services/syncService');
      await triggerAutoSync('google_drive', 'document', 'push');
      showToast('📁 Document sauvegardé sur Google Drive', 'success');
    } catch {
      // Silently fail — Drive upload is non-critical
    }
  };

  // Legacy HTML print/download (used for devis and as fallback)
  const fallbackHtmlPrint = (content, doc) => {
    const filename = `${doc.facture_type === 'avoir' ? 'Avoir' : doc.type === 'facture' ? 'Facture' : 'Devis'}_${doc.numero}.html`;

    if (isMobile()) {
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'text/html' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: `${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`,
          }).catch(() => {
            triggerDownload(url, filename);
          });
          return;
        }
      }

      triggerDownload(url, filename);
      showToast('Fichier téléchargé - Ouvrez-le et utilisez "Imprimer" > "Enregistrer en PDF"', 'info');
    } else {
      const w = window.open('', '_blank');
      if (!w) {
        showToast('Veuillez autoriser les popups pour générer le PDF', 'error');
        return;
      }
      w.document.write(content);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  // Helper for download
  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // Batch export all filtered documents as PDFs
  const batchExportPDF = (docs) => {
    if (docs.length === 0) return;
    if (docs.length > 20) {
      showToast(`Trop de documents (${docs.length}). Filtrez pour réduire à 20 max.`, 'error');
      return;
    }
    setActionLoading('batch');
    docs.forEach((doc, i) => {
      setTimeout(() => {
        printPDF(doc);
        if (i === docs.length - 1) {
          setActionLoading(null);
          showToast(`${docs.length} document${docs.length > 1 ? 's' : ''} exporté${docs.length > 1 ? 's' : ''}`, 'success');
        }
      }, i * 500);
    });
  };

  // B8: Export CSV/Excel
  const exportCSV = (docs) => {
    if (docs.length === 0) return;
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const headers = ['Numéro', 'Type', 'Client', 'Date', 'Objet', 'Montant HT', 'TVA', 'Montant TTC', 'Statut', 'Date envoi', 'Date signature', 'Date paiement'];
    const rows = docs.map(d => {
      const client = clients.find(c => c.id === d.client_id);
      const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : (d.client_nom || '');
      const fmtDate = (v) => v ? new Date(v).toLocaleDateString('fr-FR') : '';
      return [
        d.numero || '',
        d.type === 'facture' ? 'Facture' : 'Devis',
        clientName,
        fmtDate(d.date),
        (d.objet || '').replace(/;/g, ','),
        (d.total_ht || 0).toFixed(2),
        (d.tva || 0).toFixed(2),
        (d.total_ttc || d.montant_ttc || 0).toFixed(2),
        d.statut || '',
        fmtDate(d.date_envoi),
        fmtDate(d.date_signature),
        fmtDate(d.date_paiement),
      ];
    });
    const csv = BOM + [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${docs.length} document${docs.length > 1 ? 's' : ''} exporté${docs.length > 1 ? 's' : ''} en CSV`, 'success');
  };

  // ============================================================================
  // Signature link generation
  // ============================================================================
  const buildSignatureUrl = (token) => token ? `${window.location.origin}/devis/signer/${token}` : null;

  const getOrGenerateSignatureToken = async (doc) => {
    // Return existing valid token
    if (doc.signature_token && doc.signature_expires_at && new Date(doc.signature_expires_at) > new Date()) {
      return doc.signature_token;
    }
    // Generate new token via RPC
    if (supabase && !supabase._isDemo) {
      try {
        // Ensure entreprise config is up to date for the public signature page
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && entreprise) {
            await supabase.from('entreprise_config').upsert({
              user_id: user.id,
              nom: entreprise.nom || null,
              logo: entreprise.logo || null,
              adresse: entreprise.adresse || null,
              telephone: entreprise.tel || null,
              email: entreprise.email || null,
              siret: entreprise.siret || null,
              conditions_paiement: entreprise.conditionsPaiement || entreprise.conditions_paiement || null,
              mentions_legales: entreprise.mentionsLegales || entreprise.mentions_legales || null,
              couleur_principale: entreprise.couleur || couleur || '#f97316',
            }, { onConflict: 'user_id' });
          }
        } catch (e) { /* non-critical */ }

        const { data, error } = await supabase.rpc('generate_signature_token', { p_devis_id: doc.id });
        if (!error && data) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
          setDevis(prev => prev.map(d => d.id === doc.id ? { ...d, signature_token: data, signature_expires_at: expiresAt } : d));
          if (selected?.id === doc.id) {
            setSelectedDevis(prev => prev?.id === doc.id ? { ...prev, signature_token: data, signature_expires_at: expiresAt } : prev);
          }
          return data;
        }
      } catch (e) { /* fallback to null */ }
    }
    return null;
  };

  // ============ PRE-SEND VALIDATION ============
  const [sendValidationIssues, setSendValidationIssues] = useState(null); // null or { issues: [], doc }

  /**
   * validateDevisForSend — checks all prerequisites before allowing send
   * Returns array of { id, label, action?, actionLabel? } issues, or empty array if valid.
   */
  const validateDevisForSend = (doc) => {
    const issues = [];
    const client = clients.find(c => c.id === doc.client_id);

    // 1. Client must exist
    if (!doc.client_id || !client) {
      issues.push({ id: 'no_client', label: 'Aucun client associé au devis', actionLabel: 'Modifier le devis', action: 'edit' });
    }

    // 2. Must have at least one line
    const allLignes = doc.sections?.length > 0
      ? doc.sections.flatMap(s => s.lignes || [])
      : (doc.lignes || []);
    if (allLignes.length === 0) {
      issues.push({ id: 'no_lignes', label: 'Aucune ligne de prestation', actionLabel: 'Ajouter des lignes', action: 'edit' });
    }

    // 3. Total HT must be > 0
    const totalHT = allLignes.reduce((s, l) => s + getLineTotal(l), 0);
    if (totalHT <= 0 && allLignes.length > 0) {
      issues.push({ id: 'zero_total', label: 'Montant total HT = 0 € — vérifiez les prix unitaires', actionLabel: 'Modifier les lignes', action: 'edit' });
    }

    // 4. Lines with zero price
    const zeroLines = allLignes.filter(l => {
      const pu = parseFloat(l.prixUnitaire || l.prix_unitaire || 0);
      return pu <= 0;
    });
    if (zeroLines.length > 0) {
      const desc = zeroLines.length === 1
        ? `1 ligne sans prix : "${(zeroLines[0].description || 'Sans titre').substring(0, 40)}"`
        : `${zeroLines.length} lignes sans prix unitaire`;
      issues.push({ id: 'zero_price_lines', label: desc, actionLabel: 'Corriger les prix', action: 'edit' });
    }

    // 5. Entreprise info — SIRET required for legal compliance (art. R123-237 Code de commerce)
    if (!entreprise?.siret) {
      issues.push({ id: 'no_siret', label: 'SIRET non renseigné — mention obligatoire sur les devis et factures (loi française)', actionLabel: 'Compléter le profil →', action: 'settings', settingsTab: 'legal', settingsField: 'siret', isLegal: true });
    }

    // 6. Entreprise address — required for legal compliance
    if (!entreprise?.adresse) {
      issues.push({ id: 'no_adresse', label: 'Adresse entreprise manquante — mention obligatoire', actionLabel: 'Compléter le profil →', action: 'settings', settingsTab: 'identite', settingsField: 'adresse', isLegal: true });
    }

    // 7. Entreprise name
    if (!entreprise?.nom) {
      issues.push({ id: 'no_nom', label: 'Nom de l\'entreprise manquant', actionLabel: 'Compléter le profil →', action: 'settings', settingsTab: 'identite', settingsField: 'nom', isLegal: true });
    }

    // 8. Forme juridique — required for legal compliance
    if (!entreprise?.formeJuridique) {
      issues.push({ id: 'no_forme_juridique', label: 'Forme juridique non renseignée — mention obligatoire', actionLabel: 'Compléter le profil →', action: 'settings', settingsTab: 'legal', settingsField: 'formeJuridique', isLegal: true });
    }

    // 9. Assurance décennale — obligatoire pour les artisans BTP
    if (!entreprise?.decennaleAssureur || !entreprise?.decennaleNumero) {
      issues.push({ id: 'no_decennale', label: 'Assurance décennale manquante — obligatoire pour les artisans BTP', actionLabel: 'Compléter les assurances →', action: 'settings', settingsTab: 'assurances', settingsField: 'decennaleAssureur', isLegal: true });
    }

    return issues;
  };

  /**
   * getLegalIssues — returns only the legal profile issues (SIRET, adresse, etc.)
   */
  const getLegalIssues = () => {
    const issues = [];
    if (!entreprise?.siret) issues.push({ id: 'no_siret', label: 'SIRET non renseigné', actionLabel: 'Compléter →', action: 'settings', settingsTab: 'legal', settingsField: 'siret', isLegal: true });
    if (!entreprise?.adresse) issues.push({ id: 'no_adresse', label: 'Adresse entreprise manquante', actionLabel: 'Compléter →', action: 'settings', settingsTab: 'identite', settingsField: 'adresse', isLegal: true });
    if (!entreprise?.formeJuridique) issues.push({ id: 'no_forme_juridique', label: 'Forme juridique non renseignée', actionLabel: 'Compléter →', action: 'settings', settingsTab: 'legal', settingsField: 'formeJuridique', isLegal: true });
    if (!entreprise?.decennaleAssureur || !entreprise?.decennaleNumero) issues.push({ id: 'no_decennale', label: 'Assurance décennale manquante', actionLabel: 'Compléter →', action: 'settings', settingsTab: 'assurances', settingsField: 'decennaleAssureur', isLegal: true });
    return issues;
  };

  /**
   * tryDownload — checks legal compliance before PDF download
   * Shows warning modal if profile incomplete, but allows "download anyway"
   */
  const tryDownload = (doc, downloadFn) => {
    const legalIssues = getLegalIssues();
    if (legalIssues.length > 0) {
      setSendValidationIssues({ issues: legalIssues, doc, sendFn: downloadFn, isDownload: true });
      return;
    }
    downloadFn(doc);
  };

  /**
   * trySend — validates, shows issues if any, or proceeds with send function
   */
  const trySend = (doc, sendFn) => {
    const issues = validateDevisForSend(doc);
    if (issues.length > 0) {
      setSendValidationIssues({ issues, doc, sendFn });
      return;
    }
    sendFn(doc);
  };

  // Send helpers — update status FIRST, then open communication link in setTimeout
  // to prevent "Detached while handling command" crashes from simultaneous state updates + navigation
  const sendWhatsApp = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    if (!client?.telephone) { showToast('Aucun telephone client renseigne', 'error'); return; }
    const wasBrouillon = doc.statut === 'brouillon';
    if (wasBrouillon) {
      onUpdate(doc.id, { statut: 'envoye' });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye' } : s);
    }
    if (addEchange) addEchange({ type: 'whatsapp', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `Envoi ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
    const phone = (client.telephone || '').replace(/\s/g, '').replace(/^0/, '33');
    setTimeout(() => {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, voici votre ${doc.type} ${doc.numero}: ${formatMoney(doc.total_ttc)}`)}`, '_blank');
    }, 100);
    // Show post-send confirmation modal
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    setShowSendConfirmation({ clientName, montant: doc.total_ttc, canal: 'WhatsApp', doc });
  };

  const sendEmail = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    if (!client?.email) { showToast('Aucun email client renseigne', 'error'); return; }
    const wasBrouillon = doc.statut === 'brouillon';
    if (wasBrouillon) {
      onUpdate(doc.id, { statut: 'envoye' });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye' } : s);
    }
    if (addEchange) addEchange({ type: 'email', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `Envoi ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
    setTimeout(() => {
      const subject = encodeURIComponent(`${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`);
      const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint votre ${doc.type} ${doc.numero} d'un montant de ${formatMoney(doc.total_ttc)}.\n\nCordialement`);
      window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_self');
    }, 100);
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    setShowSendConfirmation({ clientName, montant: doc.total_ttc, canal: 'Email', doc });
  };

  // SMS via native protocol (mobile only)
  const sendSMS = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    const phone = (client?.telephone || '').replace(/\s/g, '');
    if (!phone) { showToast('Aucun telephone client renseigne', 'error'); return; }
    if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      showToast('SMS disponible uniquement sur mobile', 'info');
      return;
    }
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye' });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye' } : s);
    }
    if (addEchange) addEchange({ type: 'sms', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `SMS ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
    const message = `Bonjour, voici votre ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}: ${formatMoney(doc.total_ttc)}`;
    setTimeout(() => {
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');
    }, 100);
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    setShowSendConfirmation({ clientName, montant: doc.total_ttc, canal: 'SMS', doc });
  };

  // Mark document as viewed (for tracking)
  const markAsViewed = (doc) => {
    if (doc.statut === 'envoye' && !doc.viewed_at) {
      onUpdate(doc.id, {
        statut: 'vu',
        viewed_at: new Date().toISOString()
      });
    }
  };

  // Calculate days since sent (for follow-up indicators)
  const getDaysSinceSent = (doc) => {
    if (!doc.date) return 0;
    return Math.floor((Date.now() - new Date(doc.date)) / 86400000);
  };

  // Check if devis needs follow-up (sent > 7 days, not accepted/refused)
  const needsFollowUp = (doc) => {
    if (doc.type !== 'devis') return false;
    if (!['envoye', 'vu'].includes(doc.statut)) return false;
    return getDaysSinceSent(doc) >= 7;
  };

  // Devis expiry detection
  const getExpiryDaysLeft = (doc) => {
    if (doc.type !== 'devis' || ['accepte', 'refuse', 'facture', 'acompte_facture'].includes(doc.statut)) return null;
    const expiryDate = new Date(doc.date);
    expiryDate.setDate(expiryDate.getDate() + (doc.validite || 30));
    return Math.ceil((expiryDate - Date.now()) / 86400000);
  };
  const isExpiringSoon = (doc) => { const d = getExpiryDaysLeft(doc); return d !== null && d <= 7 && d > 0; };
  const isExpired = (doc) => { const d = getExpiryDaysLeft(doc); return d !== null && d <= 0; };

  const Snackbar = () => snackbar && (
    <div className="fixed bottom-6 left-1/2 z-50 animate-snackbar">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm ${snackbar.type === 'success' ? 'bg-emerald-600/95' : snackbar.type === 'error' ? 'bg-red-600/95' : 'bg-slate-800/95'} text-white min-w-[280px] max-w-[90vw]`}>
        <span className="text-lg">{snackbar.type === 'success' ? '✅' : snackbar.type === 'error' ? '❌' : 'ℹ️'}</span>
        <span className="flex-1 text-sm font-medium">{snackbar.message}</span>
        {snackbar.action && <button onClick={snackbar.action.onClick} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">{snackbar.action.label}</button>}
        <button onClick={() => setSnackbar(null)} className="hover:bg-white/20 rounded-full p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors" aria-label="Fermer">
          <X size={18} />
        </button>
      </div>
    </div>
  );

  // === DEVIS WIZARD (extracted so it's available in ALL mode returns) ===
  const devisWizardElement = (
    <DevisWizard
      isOpen={showDevisWizard}
      onClose={() => { setShowDevisWizard(false); setEditingDevis(null); }}
      initialData={editingDevis}
      onSubmit={async (devisData) => {
        const numero = await generateNumero(devisData.type);
        const newDevis = await onSubmit({ ...devisData, numero });
        if (!newDevis?.id) {
          throw new Error('Le devis n\'a pas pu etre cree. Verifiez les donnees et reessayez.');
        }
        setSelected(newDevis);
        setMode('preview');
        setShowCreationSuccess({ devis: newDevis, numero });
        return newDevis;
      }}
      onUpdate={async (id, devisData) => {
        await onUpdate(id, devisData);
        setSelected(prev => prev ? { ...prev, ...devisData } : prev);
        setDevis(prev => prev.map(d => d.id === id ? { ...d, ...devisData, updatedAt: new Date().toISOString() } : d));
        setEditingDevis(null);
        setShowDevisWizard(false);
        showToast('Document modifié avec succès', 'success');
      }}
      clients={clients}
      addClient={(data) => {
        const c = { id: generateId(), ...data };
        setClients(prev => [...prev, c]);
        return c;
      }}
      catalogue={catalogue}
      chantiers={chantiers}
      entreprise={entreprise}
      isDark={isDark}
      couleur={couleur}
      onSwitchToAI={() => { setPage('ia-devis'); }}
      onSwitchToExpress={() => { setShowDevisExpressModal(true); }}
    />
  );

  // === SIGNATURE VIEW ===
  if (mode === 'sign' && selected) return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 sm:gap-4"><button onClick={() => setMode('preview')} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h2 className="text-2xl font-bold">Signature Client</h2></div>
      <div className="bg-white rounded-2xl border p-6 text-center">
        <p className="mb-4">Signature pour <strong>{selected.numero}</strong></p>
        <p className="text-3xl font-bold mb-6" style={{color: couleur}}>{formatMoney(selected.total_ttc)}</p>
        <input
          type="text"
          value={signataireName}
          onChange={e => setSignataireName(e.target.value)}
          placeholder="Nom du signataire"
          className="w-64 mx-auto px-4 py-2 border rounded-lg text-center mb-4 block"
        />
        <canvas ref={canvasRef} width={350} height={180} className="border-2 border-dashed rounded-xl mx-auto touch-none" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        <p className="text-sm text-slate-500 mt-2">Dessinez votre signature ci-dessus</p>
        <div className="flex justify-center gap-4 mt-4">
          <button onClick={clearCanvas} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors"><X size={16} />Effacer</button>
          <button onClick={saveSignature} className="px-6 py-3 text-white rounded-xl flex items-center gap-1.5 min-h-[44px] hover:shadow-lg transition-all" style={{background: couleur}}><Check size={16} />Valider</button>
        </div>
      </div>
      <Snackbar />
    </div>
  );

  // === PREVIEW VIEW ===
  if (mode === 'preview' && selected) {
    const client = clients.find(c => c.id === selected.client_id);
    const facturesLiees = getFacturesLiees(selected.id);
    const acompteFacture = getAcompteFacture(selected.id);
    const soldeFacture = getSoldeFacture(selected.id);
    const resteAFacturer = selected.total_ttc - facturesLiees.reduce((s, f) => s + (f.total_ttc || 0), 0);
    const isDevis = selected.type === 'devis';
    const isAvoir = selected.facture_type === 'avoir';
    const currentEcheancier = echeancierCache[selected.id] || null;
    const hasEcheancier = !!selected.echeancier_id || !!currentEcheancier;
    const canAcompte = isDevis && (selected.statut === 'accepte' || selected.statut === 'signe') && !acompteFacture && !hasEcheancier;
    const canFacturer = isDevis && ['accepte', 'signe', 'acompte_facture'].includes(selected.statut) && !soldeFacture && resteAFacturer > 0;
    const hasChantier = !!selected.chantier_id;
    const linkedChantier = chantiers.find(c => c.id === selected.chantier_id);
    const canCreateChantier = isDevis && !hasChantier && addChantier;

    // Avoirs liés (pour factures) et facture source (pour avoirs)
    const avoirsLies = !isAvoir && selected.type === 'facture' ? devis.filter(d => d.facture_type === 'avoir' && d.avoir_source_id === selected.id) : [];
    const totalAvoirs = avoirsLies.reduce((s, a) => s + Math.abs(a.total_ttc || 0), 0);
    const restantDu = (selected.total_ttc || 0) - totalAvoirs;
    const sourceFacture = isAvoir && selected.avoir_source_id ? devis.find(d => d.id === selected.avoir_source_id) : null;

    const openChantierModal = () => {
      if (!addChantier) return;
      const description = selected.lignes?.[0]?.description || selected.sections?.[0]?.lignes?.[0]?.description || 'Nouveau chantier';
      setChantierForm({
        nom: `${client?.nom || 'Client'} - ${description}`.substring(0, 60),
        adresse: client?.adresse || ''
      });
      setShowChantierModal(true);
    };

    const createChantierFromDevis = () => {
      if (!addChantier || !chantierForm.nom) return;
      const newChantier = addChantier({
        nom: chantierForm.nom,
        client_id: selected.client_id,
        adresse: chantierForm.adresse || client?.adresse || '',
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '',
        statut: 'en_cours',
        avancement: 0,
        notes: `Créé depuis devis ${selected.numero}`,
        budget_estime: selected.total_ht
      });
      // Check if chantier was created successfully
      if (!newChantier?.id) {
        setSnackbar({ type: 'error', message: 'Erreur lors de la création du chantier' });
        return;
      }
      // Link devis to new chantier
      onUpdate(selected.id, { chantier_id: newChantier.id });
      setSelected({ ...selected, chantier_id: newChantier.id });
      setShowChantierModal(false);
      setSnackbar({
        type: 'success',
        message: `Chantier "${newChantier.nom}" créé`,
        action: setPage ? { label: 'Voir le chantier', onClick: () => { setSelectedChantier?.(newChantier.id); setPage('chantiers'); } } : null
      });
    };

    // Status step calculation for progress display
    const statusSteps = isDevis ? [
      { id: 'brouillon', label: 'Brouillon', statuses: ['brouillon'] },
      { id: 'envoye', label: 'Envoyé', statuses: ['envoye', 'vu'] },
      { id: 'accepte', label: 'Signé', statuses: ['accepte', 'signe'] },
      { id: 'facture', label: 'Facturé', statuses: ['acompte_facture', 'facture'] },
    ] : isAvoir ? [
      { id: 'brouillon', label: 'Brouillon', statuses: ['brouillon'] },
      { id: 'emis', label: 'Émis', statuses: ['envoye'] },
      { id: 'applique', label: 'Appliqué', statuses: ['payee'] },
    ] : [
      { id: 'envoye', label: 'Envoyée', statuses: ['brouillon', 'envoye'] },
      { id: 'payee', label: 'Payée', statuses: ['payee'] },
    ];

    const getStepState = (step) => {
      const order = { brouillon: 0, envoye: 1, vu: 1, accepte: 2, signe: 2, acompte_facture: 3, facture: 4, payee: 5, refuse: -1 };
      const currentOrder = order[selected.statut] ?? 0;
      const stepMaxOrder = Math.max(...step.statuses.map(s => order[s] ?? 0));
      const isActive = step.statuses.includes(selected.statut);
      const isPast = currentOrder > stepMaxOrder;
      return { isActive, isPast };
    };

    // Next action hint based on status
    const getNextAction = () => {
      if (selected.statut === 'refuse') return { text: 'Dupliquer pour relancer', color: 'text-slate-500' };
      if (isDevis) {
        if (selected.statut === 'brouillon') return { text: '→ Envoyer au client', color: 'text-amber-600' };
        if (selected.statut === 'envoye' || selected.statut === 'vu') return { text: '→ Faire signer', color: 'text-blue-600' };
        if (selected.statut === 'accepte' || selected.statut === 'signe') return { text: '→ Créer facture', color: 'text-emerald-600' };
        if (selected.statut === 'acompte_facture') return { text: `→ Facturer solde (${formatMoney(resteAFacturer)})`, color: 'text-purple-600' };
        if (selected.statut === 'facture') return { text: '✓ Terminé', color: 'text-indigo-600' };
      } else if (isAvoir) {
        if (selected.statut === 'brouillon') return { text: '→ Émettre l\'avoir', color: 'text-amber-600' };
        if (selected.statut === 'envoye') return { text: '→ Appliquer', color: 'text-emerald-600' };
        if (selected.statut === 'payee') return { text: '✓ Appliqué', color: 'text-emerald-600' };
      } else {
        if (selected.statut === 'brouillon') return { text: '→ Envoyer', color: 'text-amber-600' };
        if (selected.statut === 'envoye') return { text: '→ Encaisser', color: 'text-purple-600' };
        if (selected.statut === 'payee') return { text: '✓ Payée', color: 'text-emerald-600' };
      }
      return null;
    };

    const nextAction = getNextAction();

    // Calculate days since for relance alert
    const daysSinceCreation = Math.floor((new Date() - new Date(selected.date)) / 86400000);
    const isOverdue = daysSinceCreation > 30;
    const showRelanceAlert = selected.type === 'facture' && selected.statut !== 'payee' && daysSinceCreation >= 7;

    // Get primary CTA based on status
    const getPrimaryCTA = () => {
      if (isDevis) {
        if (selected.statut === 'brouillon') {
          const ttc = selected.total_ttc || 0;
          if (ttc <= 0) return { label: 'Envoyer', icon: Send, action: () => {}, color: 'bg-amber-500', disabled: true, tooltip: 'Ajoutez un montant avant d\'envoyer' };
          return { label: 'Envoyer', icon: Send, action: () => trySend(selected, sendEmail), color: 'bg-amber-500 hover:bg-amber-600' };
        }
        if (selected.statut === 'envoye' || selected.statut === 'vu') return { label: 'Faire signer', icon: PenTool, action: () => setShowSignaturePad(true), color: `bg-[${couleur}]`, style: { background: couleur } };
        if (selected.statut === 'accepte' || selected.statut === 'signe') return { label: 'Facturer', icon: Receipt, action: () => {
          if (canAcompte) { setShowAcompteModal(true); return; }
          confirmAndCreateSolde();
        }, color: 'bg-emerald-500 hover:bg-emerald-600' };
        if (selected.statut === 'acompte_facture') return { label: `Facturer solde`, icon: Receipt, action: confirmAndCreateSolde, color: 'bg-emerald-500 hover:bg-emerald-600' };
      } else if (isAvoir) {
        if (selected.statut === 'brouillon') return { label: 'Émettre', icon: Send, action: async () => {
          const ok = await confirm({ title: 'Émettre l\'avoir ?', message: `L'avoir ${selected.numero} sera émis et ne pourra plus être supprimé.` });
          if (ok) { onUpdate(selected.id, { statut: 'envoye' }); setSelected(s => ({ ...s, statut: 'envoye' })); setSnackbar({ type: 'success', message: `Avoir ${selected.numero} émis` }); }
        }, color: 'bg-amber-500 hover:bg-amber-600' };
        if (selected.statut === 'envoye') return { label: 'Appliquer', icon: Check, action: async () => {
          const ok = await confirm({ title: 'Appliquer l\'avoir ?', message: `L'avoir sera marqué comme appliqué. L'impact comptable sera enregistré.` });
          if (ok) { onUpdate(selected.id, { statut: 'payee' }); setSelected(s => ({ ...s, statut: 'payee' })); setSnackbar({ type: 'success', message: `Avoir ${selected.numero} appliqué` }); }
        }, color: 'bg-emerald-500 hover:bg-emerald-600' };
      } else {
        if (selected.statut !== 'payee') return { label: 'Encaisser', icon: CreditCard, action: () => setShowPaymentModal(true), color: '', style: { background: couleur } };
      }
      return null;
    };
    const primaryCTA = getPrimaryCTA();

    return (
    <>
      <div className="space-y-4">
        {/* Lock Banner */}
        {isDevis && relanceUserId && (
          <LockBanner
            entityType="devis"
            entityId={selected.id}
            userId={relanceUserId}
            userName={entreprise?.nom || ''}
            orgId={orgId}
            isDark={isDark}
            couleur={couleur}
          />
        )}

        {/* ============ ZONE 1: UNIFIED HEADER ============ */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardBg}`}>
          {/* Top row: back, title, client, actions */}
          <div className="flex items-start gap-3 mb-4">
            <button onClick={() => { setMode('list'); setSelected(null); }} className={`p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Retour à la liste" aria-label="Retour à la liste">
              <ArrowLeft size={18} className={textMuted} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${selected.facture_type === 'avoir' ? (isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700') : selected.type === 'facture' ? (isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-700') : (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                  {selected.facture_type === 'avoir' ? 'Avoir' : selected.type === 'facture' ? 'Facture' : 'Devis'}
                </span>
                {isDevis && devisSnapshots.length > 0 && (
                  <VersionSelector
                    snapshots={devisSnapshots}
                    onSelectVersion={(snap) => setViewingSnapshot(snap)}
                    onCompareVersions={(a, b) => setComparingSnapshots({ a, b })}
                    isDark={isDark}
                    couleur={couleur}
                  />
                )}
                {needsFollowUp(selected) && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>⏰ Relancer</span>
                )}
                {(() => {
                  const legal = getLegalIssues();
                  if (legal.length === 0) return null;
                  return (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-help ${isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'}`}
                      title={`Champs manquants : ${legal.map(i => i.label).join(', ')}`}
                    >
                      ⚠ {legal.length} champ{legal.length > 1 ? 's' : ''} léga{legal.length > 1 ? 'ux' : 'l'} manquant{legal.length > 1 ? 's' : ''}
                    </span>
                  );
                })()}
              </div>
              <h2 className={`text-lg sm:text-xl font-bold truncate ${textPrimary}`}>{cleanNumero(selected.numero)}</h2>
              <p className={`text-sm ${textMuted}`}>
                {cleanClientName(client) || selected.client_nom || ''}
                {!cleanClientName(client) && !selected.client_nom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAssigningClientDevisId(selected.id); }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'} transition-colors`}
                  >
                    <AlertTriangle size={11} /> Aucun client — Assigner →
                  </button>
                )}
                {(cleanClientName(client) || selected.client_nom) && ` · `}{new Date(selected.date).toLocaleDateString('fr-FR')}
                {selected.type === 'facture' && selected.date_echeance && (
                  <span className={`ml-1 ${textMuted}`}> · Échéance: {new Date(selected.date_echeance).toLocaleDateString('fr-FR')}</span>
                )}
              </p>
            </div>

            {/* Header actions - with labels for better accessibility */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => tryDownload(selected, async (doc) => { setActionLoading('pdf'); try { await printPDF(doc); } catch(e) { /* PDF error handled silently */ } finally { setActionLoading(null); } })}
                disabled={actionLoading === 'pdf'}
                className="min-w-[44px] min-h-[44px] sm:px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                title="Télécharger le PDF"
                aria-label="Télécharger le PDF"
              >
                {actionLoading === 'pdf' ? <Loader2 size={18} className="animate-spin flex-shrink-0" /> : <Download size={18} className="flex-shrink-0" />}
                <span className="hidden sm:inline text-sm font-medium">PDF</span>
              </button>
              <button
                onClick={() => previewPDF(selected)}
                className={`min-w-[44px] min-h-[44px] sm:px-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                title="Aperçu du document"
                aria-label="Voir l'aperçu du document"
              >
                <Eye size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline text-sm font-medium">Aperçu</span>
              </button>
              {/* Modifier button - only for editable statuses + edit permission */}
              {canPerform('devis', 'edit') && ['brouillon', 'envoye', 'vu'].includes(selected.statut) && (
                <button
                  onClick={() => {
                    setEditingDevis(selected);
                    setShowDevisWizard(true);
                  }}
                  className="min-w-[44px] min-h-[44px] sm:px-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-white hover:shadow-lg"
                  style={{ backgroundColor: couleur }}
                  title="Modifier ce document"
                  aria-label="Modifier ce document"
                >
                  <Pen size={18} className="flex-shrink-0" />
                  <span className="hidden sm:inline text-sm font-medium">Modifier</span>
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className={`p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  aria-label="Plus d'actions"
                >
                  <MoreVertical size={18} />
                </button>
                {showActionsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                    <div className={`absolute right-0 top-11 z-50 rounded-xl shadow-xl border overflow-hidden min-w-[160px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {canPerform('devis', 'create') && (
                      <button onClick={async () => { setActionLoading('duplicate'); setShowActionsMenu(false); try { await duplicateDocument(selected); } finally { setActionLoading(null); } }} disabled={actionLoading === 'duplicate'} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                        {actionLoading === 'duplicate' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />} Dupliquer
                      </button>
                      )}
                      {canPerform('devis', 'edit') && selected.type === 'devis' && ['accepte', 'envoye', 'facture'].includes(selected.statut) && (
                        <button onClick={() => { createAvenant(selected); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                          <Edit3 size={16} /> Créer un avenant
                        </button>
                      )}
                      {canPerform('devis', 'create') && selected.type === 'devis' && ['accepte', 'signe'].includes(selected.statut) && canAcompte && (
                        <button onClick={() => { setShowEcheancierModal(true); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                          <CreditCard size={16} /> Demander un acompte
                        </button>
                      )}
                      {canPerform('devis', 'create') && selected.type === 'facture' && selected.facture_type !== 'avoir' && (
                        <button onClick={() => { setShowAvoirModal(true); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                          <RotateCcw size={16} /> Créer un avoir
                        </button>
                      )}
                      {canPerform('devis', 'edit') && (
                      <button onClick={() => { setShowSaveTemplateModal(true); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Star size={16} /> Sauvegarder comme modèle
                      </button>
                      )}
                      {canPerform('devis', 'delete') && !(isAvoir && selected.statut !== 'brouillon') && (
                      <button onClick={async () => { setShowActionsMenu(false); const confirmed = await confirm({ title: 'Supprimer', message: isAvoir ? 'Supprimer cet avoir brouillon ?' : 'Supprimer ce document ?' }); if (confirmed) { onDelete(selected.id); setSelected(null); setMode('list'); } }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-600'}`}>
                        <Trash2 size={16} /> Supprimer
                      </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Workflow progress - enhanced stepper */}
          <div className="mb-4">
            <div className="flex items-start gap-0">
              {statusSteps.map((step, idx) => {
                const { isActive, isPast } = getStepState(step);
                const isRefused = selected.statut === 'refuse';
                const isLast = idx === statusSteps.length - 1;

                // Calculate time elapsed for active step
                const getTimeElapsed = () => {
                  if (!isActive || !selected.date) return null;
                  const days = Math.floor((Date.now() - new Date(selected.updated_at || selected.date).getTime()) / 86400000);
                  if (days === 0) return "aujourd'hui";
                  if (days === 1) return 'hier';
                  return `il y a ${days}j`;
                };
                const timeElapsed = getTimeElapsed();

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                          isRefused ? (isDark ? 'bg-red-900/70 text-red-400' : 'bg-red-100 text-red-600') :
                          isActive ? 'text-white shadow-md' :
                          isPast ? (isDark ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-500 text-white') :
                          (isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400')
                        }`}
                        style={isActive ? { backgroundColor: couleur, boxShadow: `0 2px 8px ${couleur}40` } : {}}
                      >
                        {isPast ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[11px] font-medium text-center leading-tight ${isActive ? textPrimary : isPast ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : textMuted}`}>
                        {step.label}
                      </span>
                      {timeElapsed && (
                        <span className="text-[10px] font-medium" style={{ color: couleur }}>
                          {timeElapsed}
                        </span>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mt-4 min-w-3 ${isPast ? (isDark ? 'bg-emerald-600' : 'bg-emerald-400') : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {/* Next action guide banner */}
            {nextAction && !nextAction.text.startsWith('✓') && (
              <div className={`mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: couleur }} />
                <span className={textMuted}>Prochaine étape :</span>
                <span className={nextAction.color}>{nextAction.text.replace('→ ', '')}</span>
              </div>
            )}
          </div>

          {/* Action bar: Primary CTA + secondary actions */}
          <div className="flex flex-col gap-3">
            {/* Row 1: Primary CTA + Status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status dropdown - compact */}
              {(() => {
                const statusColors = DEVIS_STATUS_COLORS[selected.statut] || {};
                const transitions = isDevis ? VALID_TRANSITIONS : FACTURE_TRANSITIONS;
                const allowedNext = transitions[selected.statut] || [];
                return (
                  <select
                    value={selected.statut}
                    onChange={e => {
                      const newStatus = e.target.value;
                      // Validate before allowing transition to 'envoye'
                      if (newStatus === 'envoye' && selected.statut === 'brouillon') {
                        const issues = validateDevisForSend(selected);
                        if (issues.length > 0) {
                          setSendValidationIssues({ issues, doc: selected });
                          e.target.value = selected.statut; // Reset dropdown
                          return;
                        }
                      }
                      onUpdate(selected.id, { statut: newStatus }); setSelected(s => ({...s, statut: newStatus}));
                    }}
                    aria-label="Changer le statut du document"
                    className={`px-3 py-2 min-h-[40px] rounded-lg text-sm font-semibold cursor-pointer border outline-none ${isDark ? `${statusColors.darkBg || 'bg-slate-700'} ${statusColors.darkText || 'text-slate-300'} border-slate-600` : `${statusColors.bg || 'bg-slate-100'} ${statusColors.text || 'text-slate-600'} border-slate-200`}`}
                  >
                    <option value={selected.statut}>{DEVIS_STATUS_LABELS[selected.statut] || selected.statut}</option>
                    {allowedNext.map(s => (
                      <option key={s} value={s}>{DEVIS_STATUS_LABELS[s] || s}</option>
                    ))}
                  </select>
                );
              })()}

              {/* Primary CTA - single orange/green action — gated by send permission */}
              {isDevis ? (
                <>
                  {canPerform('devis', 'send') && selected.statut === 'brouillon' && (
                    <div className="relative flex items-center">
                      <button
                        onClick={() => trySend(selected, sendEmail)}
                        className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all shadow-md hover:opacity-90"
                        style={{ backgroundColor: couleur }}
                      >
                        <Send size={16} /> Envoyer
                      </button>
                      {/* Channel dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                          className="ml-1 px-2 py-2.5 min-h-[44px] rounded-xl text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: couleur }}
                        >
                          <ChevronDown size={16} />
                        </button>
                        {showChannelDropdown && (
                          <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowChannelDropdown(false)} />
                          <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <button onClick={() => { trySend(selected, sendWhatsApp); setShowChannelDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                              <span className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center"><MessageCircle size={14} /></span>
                              WhatsApp
                            </button>
                            <button onClick={() => { trySend(selected, sendSMS); setShowChannelDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                              <span className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center"><MessageCircle size={14} /></span>
                              SMS
                            </button>
                            <button onClick={() => { trySend(selected, sendEmail); setShowChannelDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                              <span className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center"><Mail size={14} /></span>
                              Email
                            </button>
                            {['envoye', 'vu'].includes(selected.statut) && (
                              <>
                                <div className={`my-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />
                                <button onClick={() => {
                                  const d = new Date(); d.setDate(d.getDate() + 3);
                                  const relanceDate = d.toISOString().split('T')[0];
                                  onUpdate(selected.id, { relance_planifiee: relanceDate });
                                  setSelected(s => ({...s, relance_planifiee: relanceDate }));
                                  showToast(`Relance planifiée le ${d.toLocaleDateString('fr-FR')} (J+3)`, 'success');
                                  setShowChannelDropdown(false);
                                }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center"><Clock size={14} /></span>
                                  Relance J+3
                                </button>
                                <button onClick={() => {
                                  const d = new Date(); d.setDate(d.getDate() + 7);
                                  const relanceDate = d.toISOString().split('T')[0];
                                  onUpdate(selected.id, { relance_planifiee: relanceDate });
                                  setSelected(s => ({...s, relance_planifiee: relanceDate }));
                                  showToast(`Relance planifiée le ${d.toLocaleDateString('fr-FR')} (J+7)`, 'success');
                                  setShowChannelDropdown(false);
                                }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                                  <span className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center"><Clock size={14} /></span>
                                  Relance J+7
                                </button>
                              </>
                            )}
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {['envoye', 'vu'].includes(selected.statut) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSignaturePad(true)}
                        className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90 shadow-md"
                        style={{ backgroundColor: couleur }}
                      >
                        <PenTool size={16} /> Faire signer
                      </button>
                      {yousignReady && (
                        <button
                          onClick={async () => {
                            if (!selected) return;
                            const client = clients.find(c => c.id === selected.client_id);
                            if (!client?.email) {
                              setSnackbar({ type: 'warning', message: 'Email du client requis pour la e-signature' });
                              return;
                            }
                            setYousignSending(true);
                            try {
                              const result = await createYousignSignature({
                                documentName: `${selected.type === 'facture' ? 'Facture' : 'Devis'} ${selected.numero}`,
                                documentBase64: '', // Would be generated from PDF builder
                                signataires: [{
                                  name: `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client',
                                  email: client.email,
                                  phone: client.telephone,
                                }],
                                externalId: selected.id,
                                message: `Merci de signer ce ${selected.type === 'facture' ? 'la facture' : 'le devis'} ${selected.numero}.`,
                              });
                              if (result.success) {
                                setSnackbar({ type: 'success', message: `📝 Demande de e-signature envoyée via Yousign` });
                              } else {
                                throw new Error(result.error || 'Erreur Yousign');
                              }
                            } catch (err) {
                              setSnackbar({ type: 'error', message: `Erreur e-signature: ${err.message}` });
                            } finally {
                              setYousignSending(false);
                            }
                          }}
                          disabled={yousignSending}
                          className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md ${
                            isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                          }`}
                        >
                          {yousignSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          E-signature
                        </button>
                      )}
                    </div>
                  )}

                  {(selected.statut === 'accepte' || selected.statut === 'signe') && (
                    <button
                      onClick={async () => {
                        if (canAcompte) {
                          // Go straight to acompte modal — it has its own confirm/cancel
                          setShowAcompteModal(true);
                        } else {
                          // Full invoice — confirm with correct amount
                          const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'le client';
                          const confirmed = await confirm({
                            title: 'Créer la facture complète ?',
                            message: `Une facture de ${formatMoney(selected.total_ttc)} sera créée pour ${clientName}. Cette action est irréversible.`
                          });
                          if (!confirmed) return;
                          createSolde();
                        }
                      }}
                      className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all bg-emerald-500 hover:bg-emerald-600 shadow-md"
                    >
                      <Receipt size={16} /> Facturer
                    </button>
                  )}

                  {selected.statut === 'acompte_facture' && (
                    <button
                      onClick={confirmAndCreateSolde}
                      className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all bg-emerald-500 hover:bg-emerald-600 shadow-md"
                    >
                      <Receipt size={16} /> Facturer solde ({formatMoney(resteAFacturer)})
                    </button>
                  )}

                  {selected.statut === 'facture' && (
                    <span className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                      <CheckCircle size={14} className="inline mr-1" /> Facturé
                    </span>
                  )}

                  {selected.statut === 'refuse' && (
                    <button
                      onClick={() => duplicateDocument(selected)}
                      className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                      <Copy size={16} /> Dupliquer
                    </button>
                  )}
                </>
              ) : (
                <>
                  {selected.statut !== 'payee' ? (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-5 py-2.5 min-h-[44px] text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:opacity-90 shadow-md"
                      style={{ background: couleur }}
                    >
                      <CreditCard size={16} /> Encaisser
                    </button>
                  ) : (
                    <span className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      <CheckCircle size={14} className="inline mr-1" /> Payée
                    </span>
                  )}
                </>
              )}

              <div className="flex-1" />

              {/* Secondary actions */}
              <div className="flex items-center gap-1.5">
                {/* Vue client - preview signature page */}
                {isDevis && !['facture', 'refuse'].includes(selected.statut) && (
                  <button
                    onClick={async () => {
                      try {
                        const token = await getOrGenerateSignatureToken(selected);
                        if (token) {
                          window.open(buildSignatureUrl(token), '_blank');
                        } else {
                          showToast('Impossible de générer le lien', 'error');
                        }
                      } catch (e) {
                        showToast(mapError(e), 'error');
                      }
                    }}
                    className={`min-w-[40px] min-h-[40px] px-3 rounded-xl text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    title="Voir comme le client"
                  >
                    <Eye size={16} /> <span className="hidden sm:inline">Vue client</span>
                  </button>
                )}

                {/* Chantier link */}
                {isDevis && (hasChantier && linkedChantier ? (
                  <button onClick={() => { setSelectedChantier?.(linkedChantier.id); setPage?.('chantiers'); }} className={`min-w-[40px] min-h-[40px] px-3 rounded-xl text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                    <Building2 size={14} /> <span className="hidden sm:inline truncate max-w-[80px]">{linkedChantier.nom}</span>
                  </button>
                ) : canCreateChantier && (
                  <button onClick={openChantierModal} className={`min-w-[40px] min-h-[40px] px-3 rounded-xl text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                    <Building2 size={14} /> <span className="hidden sm:inline">+ Chantier</span>
                  </button>
                ))}

                {/* Communication - compact icons for non-brouillon (brouillon uses dropdown) */}
                {selected.statut !== 'brouillon' && (
                  <>
                    <button
                      onClick={() => sendWhatsApp(selected)}
                      className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-green-400' : 'bg-slate-100 hover:bg-slate-200 text-green-600'}`}
                      title="WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button
                      onClick={() => sendEmail(selected)}
                      className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}
                      title="Email"
                    >
                      <Mail size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============ AVOIR: Facture d'origine ============ */}
        {isAvoir && sourceFacture && (
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-red-900/10 border-red-800/50' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RotateCcw size={16} className={isDark ? 'text-red-400' : 'text-red-600'} />
                <span className={`text-sm font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>Facture d'origine</span>
              </div>
              <button
                onClick={() => { setSelected(sourceFacture); }}
                className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
              >
                {sourceFacture.numero} →
              </button>
            </div>
            {selected.avoir_motif && (
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="font-medium">Motif :</span> {AVOIR_MOTIFS[selected.avoir_motif] || selected.avoir_motif}
                {selected.avoir_motif_detail && <p className={`mt-1 text-xs ${textMuted}`}>{selected.avoir_motif_detail}</p>}
              </div>
            )}
            {selected.avoir_type && (
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  selected.avoir_type === 'total'
                    ? (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700')
                    : (isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700')
                }`}>
                  {selected.avoir_type === 'total' ? 'Avoir total' : 'Avoir partiel'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ============ FACTURE: Avoirs liés ============ */}
        {!isAvoir && selected.type === 'facture' && avoirsLies.length > 0 && (
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-red-900/10 border-red-800/50' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={16} className={isDark ? 'text-red-400' : 'text-red-600'} />
              <span className={`text-sm font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                Avoirs émis ({avoirsLies.length})
              </span>
            </div>
            <div className="space-y-2">
              {avoirsLies.map(avoir => (
                <div key={avoir.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(avoir)} className="text-sm font-medium hover:underline" style={{ color: couleur }}>
                      {avoir.numero}
                    </button>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      avoir.statut === 'payee' ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                      avoir.statut === 'envoye' ? (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700') :
                      (isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {avoir.statut === 'payee' ? 'Appliqué' : avoir.statut === 'envoye' ? 'Émis' : 'Brouillon'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatMoney(avoir.total_ttc)}</span>
                </div>
              ))}
            </div>
            <div className={`flex items-center justify-between pt-3 mt-3 border-t ${isDark ? 'border-slate-600' : 'border-red-200'}`}>
              <div className="space-y-1">
                <div className="flex justify-between gap-6 text-xs">
                  <span className={textMuted}>Montant facturé</span>
                  <span className={`font-medium ${textPrimary}`}>{formatMoney(selected.total_ttc)}</span>
                </div>
                <div className="flex justify-between gap-6 text-xs">
                  <span className={textMuted}>Total avoirs</span>
                  <span className="font-medium text-red-600">-{formatMoney(totalAvoirs)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs ${textMuted}`}>Restant dû</p>
                <p className={`text-lg font-bold ${restantDu > 0 ? textPrimary : 'text-emerald-600'}`}>{formatMoney(restantDu)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============ LEGAL COMPLIANCE BANNER ============ */}
        {(() => {
          const legal = getLegalIssues();
          if (legal.length === 0 || selected.statut === 'refuse') return null;
          return (
            <div className={`rounded-xl border p-3 flex items-start gap-3 ${isDark ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                  Profil entreprise incomplet — {legal.length} mention{legal.length > 1 ? 's' : ''} légale{legal.length > 1 ? 's' : ''} manquante{legal.length > 1 ? 's' : ''}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                  {legal.map(i => i.label).join(' · ')}
                </p>
              </div>
              {setPage && (
                <button
                  onClick={() => setPage('settings', { tab: 'legal' })}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${isDark ? 'bg-amber-800/40 text-amber-300 hover:bg-amber-800/60' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}
                >
                  Compléter →
                </button>
              )}
            </div>
          );
        })()}

        {/* ============ ZONE 2: SMART CONTEXT CARD ============ */}
        {/* Billing options - always visible for devis not yet invoiced */}

        {/* Facturation: AcompteSuiviCard handles all cases (échéancier, legacy acompte, options, guidance) */}
        {isDevis && selected.statut !== 'facture' && (
          <AcompteSuiviCard
            devis={selected}
            echeancier={currentEcheancier}
            facturesLiees={facturesLiees}
            allDevis={devis}
            isDark={isDark}
            couleur={couleur}
            textPrimary={textPrimary}
            textMuted={textMuted}
            modeDiscret={modeDiscret}
            formatMoney={formatMoney}
            canAcompte={canAcompte}
            canFacturer={canFacturer}
            hasChantier={!!selected.chantier_id}
            acompteFacture={acompteFacture}
            resteAFacturer={resteAFacturer}
            onFacturerEtape={facturerEtape}
            onFacturerSolde={confirmAndCreateSolde}
            onOpenAcompteSimple={() => setShowAcompteModal(true)}
            onOpenEcheancierModal={() => setShowEcheancierModal(true)}
            onSelectFacture={(f) => setSelected(f)}
            onFacturer100={confirmAndCreateSolde}
            onOpenSituation={selected.chantier_id ? () => { setSelectedChantier(selected.chantier_id); setPage('chantiers'); } : null}
          />
        )}

        {/* Devis follow-up alert */}
        {isDevis && needsFollowUp(selected) && (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏰</span>
                <div>
                  <p className={`font-medium text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    Devis en attente · {getDaysSinceSent(selected)} jours
                  </p>
                  <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    Envoyé le {new Date(selected.date).toLocaleDateString('fr-FR')} · {formatMoney(selected.total_ttc)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const message = `Bonjour, avez-vous pu consulter le devis ${selected.numero} d'un montant de ${formatMoney(selected.total_ttc)} ? N'hésitez pas si vous avez des questions. Cordialement`;
                    setTimeout(() => {
                      window.open(`https://wa.me/${client?.telephone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
                    }, 100);
                    if (addEchange) addEchange({ type: 'whatsapp', client_id: selected.client_id, document: selected.numero, montant: selected.total_ttc, objet: `Relance devis ${selected.numero}` });
                  }}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    const subject = `Relance devis ${selected.numero}`;
                    const body = `Bonjour,\n\nAvez-vous pu consulter le devis ${selected.numero} d'un montant de ${formatMoney(selected.total_ttc)} envoyé le ${new Date(selected.date).toLocaleDateString('fr-FR')} ?\n\nN'hésitez pas si vous avez des questions.\n\nCordialement`;
                    setTimeout(() => {
                      window.open(`mailto:${client?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                    }, 100);
                    if (addEchange) addEchange({ type: 'email', client_id: selected.client_id, document: selected.numero, montant: selected.total_ttc, objet: `Relance devis ${selected.numero}` });
                  }}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Mail size={14} /> Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Devis expiry alert */}
        {isDevis && (isExpiringSoon(selected) || isExpired(selected)) && (
          <div className={`rounded-xl p-4 border ${isExpired(selected) ? (isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200') : (isDark ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200')}`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{isExpired(selected) ? '❌' : '⏳'}</span>
              <div>
                <p className={`font-medium text-sm ${isExpired(selected) ? (isDark ? 'text-red-300' : 'text-red-800') : (isDark ? 'text-orange-300' : 'text-orange-800')}`}>
                  {isExpired(selected) ? 'Devis expiré' : `Expire dans ${getExpiryDaysLeft(selected)} jour${getExpiryDaysLeft(selected) > 1 ? 's' : ''}`}
                </p>
                <p className={`text-xs ${isExpired(selected) ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-orange-400' : 'text-orange-600')}`}>
                  Validité: {selected.validite || 30} jours · Émis le {new Date(selected.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unpaid invoice alert */}
        {showRelanceAlert && (
          <div className={`rounded-xl p-4 border ${isOverdue ? (isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200') : (isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200')}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{isOverdue ? '🚨' : '⏰'}</span>
                <div>
                  <p className={`font-medium text-sm ${isOverdue ? (isDark ? 'text-red-300' : 'text-red-800') : (isDark ? 'text-amber-300' : 'text-amber-800')}`}>
                    {isOverdue ? 'Facture en retard' : 'Facture en attente'} · {daysSinceCreation} jours
                  </p>
                  <p className={`text-xs ${isOverdue ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
                    {formatMoney(selected.total_ttc)} à encaisser
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const message = `Bonjour,\n\nRelance pour la facture ${selected.numero} d'un montant de ${formatMoney(selected.total_ttc)} émise le ${new Date(selected.date).toLocaleDateString('fr-FR')}.\n\nMerci de procéder au règlement.\n\nCordialement`;
                    setTimeout(() => {
                      window.open(`https://wa.me/${client?.telephone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
                    }, 100);
                    if (addEchange) addEchange({ type: 'whatsapp', client_id: selected.client_id, document: selected.numero, montant: selected.total_ttc, objet: `Relance facture ${selected.numero}` });
                  }}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    const subject = `Relance facture ${selected.numero}`;
                    const body = `Bonjour,\n\nRelance pour la facture ${selected.numero} d'un montant de ${formatMoney(selected.total_ttc)} émise le ${new Date(selected.date).toLocaleDateString('fr-FR')}.\n\nMerci de procéder au règlement.\n\nCordialement`;
                    setTimeout(() => {
                      window.open(`mailto:${client?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                    }, 100);
                    if (addEchange) addEchange({ type: 'email', client_id: selected.client_id, document: selected.numero, montant: selected.total_ttc, objet: `Relance facture ${selected.numero}` });
                  }}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Mail size={14} /> Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Relance Timeline Widget */}
        {relances.isEnabled && (() => {
          const docType = selected.type === 'facture' ? 'facture' : 'devis';
          const steps = docType === 'facture' ? relances.relanceConfig.factureSteps : relances.relanceConfig.devisSteps;
          const docExecs = relances.getDocumentTimeline(selected.id);
          const docExcluded = relances.isDocumentExcluded(selected.id) || relances.isClientExcluded(selected.client_id);
          if (!steps?.length && docExecs.length === 0) return null;
          const client = clients.find(c => c.id === selected.client_id);
          return (
            <RelanceTimelineWidget
              executions={docExecs}
              steps={steps || []}
              doc={selected}
              onSendNow={() => {
                if (client) relances.skipToNextStep(selected, client).then(r => {
                  if (r?.success) showToast('Relance envoyée !', 'success');
                  else showToast(r?.error || 'Erreur envoi relance', 'error');
                });
              }}
              onSkipToNext={() => {
                if (client) relances.skipToNextStep(selected, client);
              }}
              onExclude={(scope, reason) => {
                relances.addExclusion(scope, {
                  documentId: scope === 'document' ? selected.id : undefined,
                  clientId: scope === 'client' ? selected.client_id : undefined,
                  reason,
                }).then(() => showToast('Document exclu des relances', 'success'));
              }}
              isExcluded={docExcluded}
              isEnabled={relances.isEnabled}
              isDark={isDark}
              couleur={couleur}
              modeDiscret={modeDiscret}
              formatMoney={formatMoney}
            />
          );
        })()}

        {/* Pénalités de retard */}
        {selected.type === 'facture' && selected.statut !== 'payee' && (() => {
          const pen = calculatePenalites(selected);
          if (!pen) return null;
          return (
            <div className={`rounded-xl p-4 border ${isDark ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-orange-500" />
                <span className={`font-medium text-sm ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                  Pénalités de retard · {pen.joursRetard} jour{pen.joursRetard > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className={`flex justify-between ${textSecondary}`}>
                  <span>Intérêts ({pen.taux}% annuel)</span>
                  <span className="font-medium">{formatMoney(pen.penalite)}</span>
                </div>
                <div className={`flex justify-between ${textSecondary}`}>
                  <span>Indemnité forfaitaire de recouvrement</span>
                  <span className="font-medium">{formatMoney(pen.indemnite)}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t font-bold ${isDark ? 'border-orange-700 text-orange-300' : 'border-orange-200 text-orange-800'}`}>
                  <span>Total pénalités</span>
                  <span>{formatMoney(pen.total)}</span>
                </div>
              </div>
              <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isDark ? 'border-orange-700' : 'border-orange-200'}`}>
                <p className={`text-[10px] ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  Art. L441-10 C. com. — Échéance : {pen.echeance.toLocaleDateString('fr-FR')}
                </p>
                {pen.joursRetard >= 30 && (
                  <button
                    onClick={() => {
                      const client = clients.find(c => c.id === selected.client_id);
                      printMiseEnDemeure({
                        doc: selected,
                        client,
                        entreprise,
                        executions: relances.getDocumentTimeline(selected.id),
                        couleur,
                      });
                    }}
                    className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${isDark ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  >
                    📄 Mise en demeure
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ============ ZONE 3: TABBED DOCUMENT VIEW ============ */}
        <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${cardBg}`}>
          <Tabs defaultValue="document">
            <div className={`px-4 pt-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <TabsList variant="underline" className="w-full justify-start gap-4">
                <TabsTrigger value="document" variant="underline" className="pb-3">Document</TabsTrigger>
                {isDevis && (
                  <TabsTrigger value="historique" variant="underline" className="pb-3">
                    Historique
                  </TabsTrigger>
                )}
                {selected.type === 'facture' && selected.devis_source_id && (
                  <TabsTrigger value="source" variant="underline" className="pb-3">Devis source</TabsTrigger>
                )}
                {getDocumentEmailStatus(selected.id).sent > 0 && (
                  <TabsTrigger value="emails" variant="underline" className="pb-3">
                    Emails <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>{getDocumentEmailStatus(selected.id).sent}</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="document" className="mt-0 p-2 sm:p-6 overflow-x-auto">
              {/* Document header */}
              <div className={`flex justify-between items-start mb-6 pb-6 border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  {entreprise?.logo ? (
                    <img src={entreprise.logo} className="h-12 rounded-lg object-cover" alt={entreprise?.nom || ''} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold" style={{background: `${couleur}20`, color: couleur}}>
                      {(entreprise?.nom || 'E').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className={`font-bold ${textPrimary}`}>{entreprise?.nom}</p>
                    <p className={`text-xs ${textMuted} whitespace-pre-line`}>{entreprise?.adresse}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p>
                  <p className={`text-sm ${textMuted}`}>{selected.numero}</p>
                </div>
              </div>

              {/* Client info */}
              <div className={`mb-6 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium mb-1 ${textMuted}`}>Client</p>
                <p className={`font-semibold ${client ? textPrimary : 'text-red-500'}`}>
                  {client ? `${client.prenom || ''} ${client.nom}`.trim() : (selected.client_nom || 'Client supprimé')}
                </p>
                {client?.adresse && <p className={`text-sm ${textMuted} whitespace-pre-line`}>{client.adresse}</p>}
              </div>

              {/* Avenant banner */}
              {selected.is_avenant && (
                <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 ${isDark ? 'bg-orange-900/20 border-orange-700/50' : 'bg-orange-50 border-orange-200'}`}>
                  <Edit3 size={16} className="text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                      Avenant n°{selected.avenant_numero} du devis {selected.avenant_source_numero}
                    </p>
                  </div>
                  <button
                    onClick={() => { const src = devis.find(d => d.id === selected.avenant_source_id); if (src) setSelected(src); }}
                    className="text-xs font-medium px-2 py-1 rounded hover:underline"
                    style={{ color: couleur }}
                  >
                    Voir l'original
                  </button>
                </div>
              )}

              {/* Line items - scrollable on mobile, with section headers */}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
                {(selected.sections && selected.sections.length > 0
                  ? selected.sections
                  : [{ titre: '', lignes: selected.lignes || [] }]
                ).map((section, si) => (
                  <div key={si}>
                    {section.titre && (
                      <h4 className={`font-semibold text-sm ${si > 0 ? 'mt-4 pt-3 border-t' : ''} pb-1 ${textPrimary} ${si > 0 ? (isDark ? 'border-slate-600' : 'border-slate-200') : ''}`}>
                        {section.titre}
                      </h4>
                    )}
                    <table className="w-full text-xs sm:text-sm" aria-label={section.titre || 'Lignes du devis'}>
                      {si === 0 && (
                        <thead>
                          <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                            <th scope="col" className={`text-left py-2 font-medium ${textPrimary}`}>Description</th>
                            <th scope="col" className={`text-right py-2 w-16 font-medium ${textPrimary}`}>Qté</th>
                            <th scope="col" className={`text-right py-2 w-20 font-medium ${textPrimary}`}>PU HT</th>
                            <th scope="col" className={`text-right py-2 w-24 font-medium ${textPrimary}`}>Total</th>
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {filterValidLignes(section.lignes).map((l, i) => (
                          <tr key={i} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td className={`py-2.5 ${textPrimary}`}>{l.description || ''}</td>
                            <td className={`text-right ${textSecondary}`}>{l.quantite || 0} {l.unite || ''}</td>
                            <td className={`text-right ${textSecondary}`}>{formatMoney(parseFloat(l.prixUnitaire || l.prix_unitaire || 0))}</td>
                            <td className={`text-right font-medium ${getLineTotal(l) < 0 ? 'text-red-500' : textPrimary}`}>{formatMoney(getLineTotal(l))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56">
                  <div className={`flex justify-between py-1 text-sm ${textPrimary}`}>
                    <span>HT</span>
                    <span>{formatMoney(selected.total_ht)}</span>
                  </div>
                  {/* TVA breakdown by rate — no more hardcoded 10% */}
                  {(() => {
                    const tvaMap = selected.tvaParTaux || selected.tvaDetails;
                    if (tvaMap && typeof tvaMap === 'object' && Object.keys(tvaMap).length > 0) {
                      return Object.entries(tvaMap).map(([rate, info]) => (
                        <div key={rate} className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                          <span>TVA {rate}%</span>
                          <span>{formatMoney(typeof info === 'object' ? info.montant : info)}</span>
                        </div>
                      ));
                    }
                    // Fallback: recalculate from lignes if tvaParTaux not stored
                    const rates = {};
                    (selected.lignes || []).forEach(l => {
                      const rate = l.tva !== undefined ? l.tva : (selected.tvaRate || entreprise?.tvaDefaut || 10);
                      const montant = (parseFloat(l.quantite) || 1) * (parseFloat(l.prixUnitaire || l.prix_unitaire) || 0);
                      if (!rates[rate]) rates[rate] = 0;
                      rates[rate] += montant * (rate / 100);
                    });
                    if (Object.keys(rates).length > 0) {
                      return Object.entries(rates).map(([rate, montant]) => (
                        <div key={rate} className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                          <span>TVA {rate}%</span>
                          <span>{formatMoney(montant)}</span>
                        </div>
                      ));
                    }
                    // Last resort: show total TVA with stored rate
                    return (
                      <div className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                        <span>TVA {selected.tvaRate || entreprise?.tvaDefaut || 20}%</span>
                        <span>{formatMoney(selected.tva || selected.total_tva || 0)}</span>
                      </div>
                    );
                  })()}
                  {selected.remise > 0 && (
                    <div className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                      <span>Remise {selected.remise}%</span>
                      <span>-{formatMoney(selected.total_ht * selected.remise / (100 - selected.remise))}</span>
                    </div>
                  )}
                  <div className={`flex justify-between py-2 border-t font-bold ${isDark ? 'border-slate-600' : 'border-slate-200'}`} style={{color: couleur}}>
                    <span>TTC</span>
                    <span>{formatMoney(selected.total_ttc)}</span>
                  </div>
                  {selected.retenueGarantie && (
                    <>
                      <div className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                        <span>Retenue garantie 5%</span>
                        <span>-{formatMoney((selected.total_ht || 0) * 0.05)}</span>
                      </div>
                      <div className={`flex justify-between py-1 text-sm font-semibold ${textPrimary}`}>
                        <span>Net à payer</span>
                        <span>{formatMoney((selected.total_ttc || 0) - (selected.total_ht || 0) * 0.05)}</span>
                      </div>
                    </>
                  )}

                  {/* Paiements partiels reçus */}
                  {(() => {
                    if (selected.type !== 'facture') return null;
                    const linkedPaiements = paiements.filter(p => p.facture_id === selected.id || p.document === selected.numero);
                    if (linkedPaiements.length === 0) return null;
                    const totalPaye = linkedPaiements.reduce((s, p) => s + (p.montant || 0), 0);
                    const resteAPayer = (selected.total_ttc || 0) - totalPaye;
                    return (
                      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                        <p className={`text-xs font-medium mb-2 ${textMuted}`}>Paiements reçus</p>
                        {linkedPaiements.map(p => (
                          <div key={p.id} className={`flex justify-between text-sm py-1 ${textSecondary}`}>
                            <span>{new Date(p.date).toLocaleDateString('fr-FR')} · {p.mode || 'Virement'}</span>
                            <span className="font-medium text-emerald-600">{formatMoney(p.montant)}</span>
                          </div>
                        ))}
                        <div className={`flex justify-between font-bold pt-2 mt-1 border-t text-sm ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                          <span className={resteAPayer <= 0 ? 'text-emerald-600' : ''}>
                            {resteAPayer <= 0 ? '✅ Soldé' : 'Reste à payer'}
                          </span>
                          <span className={resteAPayer <= 0 ? 'text-emerald-600' : ''} style={resteAPayer > 0 ? {color: couleur} : {}}>
                            {formatMoney(Math.max(0, resteAPayer))}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Signature */}
              {selected.signature && (
                <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span className="text-emerald-600 font-medium text-sm">
                      Accepté{selected.signataire ? ` par ${selected.signataire}` : ' par le client'}
                    </span>
                    <span className={`text-xs ${textMuted}`}>· {new Date(selected.signatureDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  <p className={`text-xs font-medium mb-1 ${textMuted}`}>Notes</p>
                  <p className={`text-sm whitespace-pre-wrap ${textSecondary}`}>{selected.notes}</p>
                </div>
              )}

              {/* Conditions de paiement */}
              {selected.conditionsPaiement && CONDITIONS_PAIEMENT[selected.conditionsPaiement] && (
                <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  <p className={`text-xs font-medium mb-1 ${textMuted}`}>Conditions de paiement</p>
                  <p className={`text-sm ${textSecondary}`}>{CONDITIONS_PAIEMENT[selected.conditionsPaiement]}</p>
                </div>
              )}
            </TabsContent>

            {isDevis && (
              <TabsContent value="historique" className="mt-0 p-4 sm:p-6">
                <DevisHistoriqueTab
                  selected={selected}
                  facturesLiees={facturesLiees}
                  setSelected={setSelected}
                  isDark={isDark}
                  couleur={couleur}
                  modeDiscret={modeDiscret}
                  formatMoney={formatMoney}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                />
              </TabsContent>
            )}

            {selected.type === 'facture' && selected.devis_source_id && (() => {
              const sourceDevis = devis.find(d => d.id === selected.devis_source_id);
              const isAcompteFacture = selected.facture_type === 'acompte';
              const isSoldeFacture = selected.facture_type === 'solde';
              const allAcomptesForSource = devis.filter(d => d.type === 'facture' && d.devis_source_id === selected.devis_source_id && d.facture_type === 'acompte');
              const sourceEcheancier = sourceDevis?.echeancier_id ? echeancierCache[sourceDevis.id] : null;

              return (
                <TabsContent value="source" className="mt-0 p-4 sm:p-6 space-y-4">
                  {/* Devis source link */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-sm ${textMuted} mb-2`}>
                      {isAcompteFacture ? 'Facture d\'acompte créée à partir du devis :' : isSoldeFacture ? 'Facture de solde créée à partir du devis :' : 'Cette facture a été créée à partir du devis :'}
                    </p>
                    <button
                      onClick={() => { if (sourceDevis) setSelected(sourceDevis); }}
                      className="text-sm font-medium hover:underline flex items-center gap-2"
                      style={{ color: couleur }}
                    >
                      <FileText size={16} />
                      {sourceDevis ? `${sourceDevis.numero} · ${formatMoney(sourceDevis.total_ttc)}` : 'Voir le devis source'}
                    </button>
                  </div>

                  {/* Acompte context: show all acompte factures linked to same devis */}
                  {(isAcompteFacture || isSoldeFacture) && allAcomptesForSource.length > 0 && (
                    <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <p className={`text-sm font-medium mb-3 ${textPrimary}`}>
                        Factures d'acompte ({allAcomptesForSource.length})
                      </p>
                      <div className="space-y-2">
                        {allAcomptesForSource.map((ac, idx) => {
                          const isCurrent = ac.id === selected.id;
                          return (
                            <div
                              key={ac.id}
                              onClick={() => !isCurrent && setSelected(ac)}
                              className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                                isCurrent ? (isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200') : 'cursor-pointer',
                                !isCurrent && (isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'),
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn('font-medium', isCurrent ? (isDark ? 'text-blue-300' : 'text-blue-700') : textPrimary)}>
                                  {ac.numero}
                                </span>
                                {ac.acompte_pct && <span className={`text-xs ${textMuted}`}>{ac.acompte_pct}%</span>}
                                {isCurrent && <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>actuel</span>}
                              </div>
                              <span className={cn('font-semibold', textPrimary)}>{formatMoney(ac.total_ttc)}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Total acomptes vs devis */}
                      {sourceDevis && (
                        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                          <span className={`text-xs ${textMuted}`}>Total acomptes / Devis</span>
                          <span className={`text-sm font-bold ${textPrimary}`}>
                            {formatMoney(allAcomptesForSource.reduce((s, a) => s + (a.total_ttc || 0), 0))} / {formatMoney(sourceDevis.total_ttc)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Échéancier progress if available */}
                  {sourceEcheancier && sourceEcheancier.etapes?.length > 0 && (
                    <div className={`rounded-lg border p-4 ${isDark ? 'border-blue-800 bg-blue-900/10' : 'border-blue-200 bg-blue-50/50'}`}>
                      <p className={`text-sm font-medium mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        <ClipboardList size={14} className="inline mr-1" />
                        Échéancier de paiement
                      </p>
                      <div className="space-y-1">
                        {sourceEcheancier.etapes.map(etape => (
                          <div key={etape.numero} className={`flex items-center justify-between text-xs py-1 ${textMuted}`}>
                            <div className="flex items-center gap-1.5">
                              {(etape.statut === 'facture' || etape.statut === 'paye') ? (
                                <CheckCircle size={12} className={etape.statut === 'paye' ? 'text-emerald-500' : 'text-blue-500'} />
                              ) : (
                                <span className={`w-3 h-3 rounded-full border ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
                              )}
                              <span className={textPrimary}>{etape.label}</span>
                              <span>{etape.pourcentage}%</span>
                            </div>
                            <span className={`font-medium ${textPrimary}`}>{formatMoney(etape.montant_ttc)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              );
            })()}

              {/* Email tracking tab */}
              <TabsContent value="emails" className="mt-0 p-4 sm:p-6">
                <div className="space-y-3">
                  <p className={`text-sm font-medium ${textPrimary}`}>Historique d'envoi</p>
                  {getDocumentEmailStatus(selected.id).records.map((rec, idx) => (
                    <div key={rec.id || idx} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <Mail size={16} className="text-sky-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${textPrimary} truncate`}>{rec.to}</p>
                        <p className={`text-xs ${textMuted}`}>{rec.subject}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs ${textMuted}`}>{new Date(rec.sentAt).toLocaleDateString('fr-FR')}</p>
                        <p className={`text-xs ${textMuted}`}>{new Date(rec.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        Envoyé
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
          </Tabs>
        </div>

        {/* Section Relances — visible pour les devis envoyés */}
        {['envoye', 'vu'].includes(selected.statut) && (
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Relances
              </h3>
              <button
                onClick={() => showToast?.('Relance programmée', 'success')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: `${couleur}15`, color: couleur }}
              >
                + Programmer
              </button>
            </div>
            <div className={`text-xs space-y-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <p className="flex items-center gap-1.5"><Mail size={12} /> J+7 : Rappel amical (automatique)</p>
              <p className="flex items-center gap-1.5"><Mail size={12} /> J+15 : Deuxième relance</p>
              <p className="flex items-center gap-1.5"><Mail size={12} /> J+30 : Relance ferme</p>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Les relances automatiques sont configurables dans Paramètres &rarr; Documents &rarr; Relances
            </p>
          </div>
        )}

        {/* Modal Acompte */}
        {showAcompteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${cardBg} rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md`}>
              <h3 className="font-bold text-lg mb-2"> Facture d'acompte</h3>
              <p className={`mb-4 text-sm ${textMuted}`}>Sécurisez votre engagement avant les travaux</p>
              <div className="space-y-3 mb-4">
                {[20, 30, 40, 50].map(pct => (
                  <button key={pct} onClick={() => setAcomptePct(pct)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${acomptePct === pct ? (isDark ? 'border-purple-500 bg-purple-900/30' : 'border-purple-500 bg-purple-50') : (isDark ? 'border-slate-600' : 'border-slate-200')}`}>
                    <span className="font-medium">Acompte {pct}%</span>
                    <span className="text-lg font-bold" style={{ color: acomptePct === pct ? couleur : '#64748b' }}>{formatMoney(selected.total_ttc * pct / 100)}</span>
                  </button>
                ))}
                <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'} rounded-xl`}>
                  <input type="number" min="1" max="99" value={acomptePct} onChange={e => setAcomptePct(parseInt(e.target.value) || 30)} className="w-20 px-3 py-2 border rounded-xl text-center" />
                  <span className="text-slate-500">%</span>
                  <span className="ml-auto font-bold">{formatMoney(selected.total_ttc * acomptePct / 100)}</span>
                </div>
              </div>
              {acomptePct > 50 ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>Attention : un acompte de plus de 50% est très inhabituel et peut poser des problèmes juridiques.</span>
                </div>
              ) : acomptePct > 30 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>Pour travaux &gt; 1 500 € chez un particulier, l'acompte est limité à 30% par la loi (art. L. 214-1 code conso).</span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-600">
                  Acompte de {acomptePct}% · {formatMoney(selected.total_ttc * acomptePct / 100)}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowAcompteModal(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"><X size={16} />Annuler</button>
                <button onClick={createAcompte} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] transition-colors font-semibold">
                  {acomptePct > 30 ? <AlertTriangle size={16} /> : <Check size={16} />}
                  Facturer {formatMoney(selected.total_ttc * acomptePct / 100)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Échéancier d'acomptes */}
        <AcompteEcheancierModal
          isOpen={showEcheancierModal}
          onClose={() => setShowEcheancierModal(false)}
          devis={selected}
          isDark={isDark}
          couleur={couleur}
          modeDiscret={modeDiscret}
          onEcheancierCreated={handleEcheancierCreated}
        />

        {/* Modal Preview */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold">Aperçu {selected.type === 'facture' ? 'Facture' : 'Devis'}</h3>
                <div className="flex gap-2">
                  <button onClick={() => downloadPDF(selected)} className="px-4 py-2 bg-blue-500 text-white rounded-xl"> Télécharger</button>
                  <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-100 rounded-xl">x</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-100">
                <div className="bg-white shadow-lg rounded-lg p-8 max-w-2xl mx-auto">
                  <div className="text-center mb-6"><p className="text-2xl font-bold" style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p><p className="text-slate-500">{selected.numero}</p></div>
                  <p className="text-sm text-slate-500">Ceci est un aperçu. Cliquez sur "Télécharger" pour obtenir le PDF complet.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal création chantier */}
        {showChantierModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowChantierModal(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}15` }}>
                  <Building2 size={20} style={{ color: couleur }} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${textPrimary}`}>Créer un chantier</h3>
                  <p className={`text-sm ${textMuted}`}>A partir du devis {selected.numero}</p>
                </div>
              </div>

              {/* Récapitulatif financier */}
              <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Revenu prévu</p>
                <p className="text-2xl font-bold" style={{ color: couleur }}>{modeDiscret ? '·····' : `${(selected.total_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`}</p>
                <p className={`text-sm ${textMuted}`}>{(selected.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC</p>
              </div>

              {/* Formulaire */}
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom du chantier *</label>
                  <input
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    value={chantierForm.nom}
                    onChange={e => setChantierForm(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex: Rénovation cuisine"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Adresse du chantier</label>
                  <input
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    value={chantierForm.adresse}
                    onChange={e => setChantierForm(p => ({ ...p, adresse: e.target.value }))}
                    placeholder="Ex: 12 rue des Lilas, 75011 Paris"
                  />
                </div>
              </div>

              {/* Info */}
              <p className={`text-xs ${textMuted} mt-4`}>
                Le chantier sera automatiquement lié à ce devis. Le revenu prévu ({modeDiscret ? '·····' : `${(selected.total_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}) sera utilisé pour calculer la marge.
              </p>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowChantierModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  Annuler
                </button>
                <button
                  onClick={createChantierFromDevis}
                  disabled={!chantierForm.nom}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: couleur }}
                >
                  <Building2 size={16} /> Créer le chantier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {showPdfPreview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in" onClick={() => setShowPdfPreview(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl h-[95vh] sm:h-[90vh] shadow-2xl flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
              <div className={`p-3 sm:p-4 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} flex items-center justify-between gap-2 flex-shrink-0`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <FileText size={18} className="sm:w-5 sm:h-5" style={{ color: couleur }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className={`font-bold text-base sm:text-lg ${textPrimary} truncate`}>Aperçu du document</h2>
                    <p className={`text-xs sm:text-sm ${textMuted} hidden sm:block`}>Format A4 - Pret pour impression</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button onClick={() => tryDownload(selected, printPDF)} className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-1.5 sm:gap-2 min-h-[44px] transition-colors text-sm">
                    <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Imprimer / PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button onClick={() => setShowPdfPreview(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                    <X size={20} className={textPrimary} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
                <div className="bg-white shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm]" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
                  <iframe srcDoc={pdfContent} className="w-full h-full min-h-[297mm] border-0" title="PDF Preview" />
                </div>
              </div>
            </div>
          </div>
        )}

        <Snackbar />

        {/* Signature Pad Modal — must be inside preview return for it to render */}
        <SignaturePad
          isOpen={showSignaturePad}
          onClose={() => setShowSignaturePad(false)}
          onSave={handleSignatureSave}
          document={selected}
          client={selected ? clients.find(c => c.id === selected.client_id) : null}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />

        {/* Signature Link Modal */}
        {/* Creation success modal */}
        {showCreationSuccess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowCreationSuccess(null)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl p-6`} onClick={e => e.stopPropagation()}>
              {/* Success animation */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
                  <CheckCircle size={32} style={{ color: couleur }} />
                </div>
              </div>
              <h3 className={`text-xl font-bold text-center mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {showCreationSuccess.devis?.type === 'facture' ? 'Facture' : 'Devis'} cree !
              </h3>
              <p className={`text-sm text-center mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                N&deg; {showCreationSuccess.numero}
              </p>
              <p className={`text-2xl font-bold text-center mb-5`} style={{ color: couleur }}>
                {formatMoney(showCreationSuccess.devis?.total_ttc)}
              </p>

              <button
                onClick={() => {
                  setShowCreationSuccess(null);
                  if (showCreationSuccess.devis) sendEmail(showCreationSuccess.devis);
                }}
                className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-md mb-3"
                style={{ backgroundColor: couleur }}
              >
                <Send size={16} /> Envoyer maintenant
              </button>
              <button
                onClick={() => setShowCreationSuccess(null)}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Plus tard
              </button>
            </div>
          </div>
        )}

        {/* Pre-send validation issues modal */}
        {sendValidationIssues && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setSendValidationIssues(null)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${sendValidationIssues.isDownload ? (isDark ? 'bg-amber-900/40' : 'bg-amber-50') : (isDark ? 'bg-red-900/40' : 'bg-red-50')}`}>
                    <AlertTriangle size={24} className={sendValidationIssues.isDownload ? 'text-amber-500' : 'text-red-500'} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${textPrimary}`}>{sendValidationIssues.isDownload ? 'Profil incomplet' : 'Envoi impossible'}</h3>
                    <p className={`text-sm ${textMuted}`}>{sendValidationIssues.isDownload ? 'Votre profil entreprise est incomplet' : 'Corrigez ces éléments avant d\'envoyer'}</p>
                  </div>
                </div>

                {/* Legal conformity warning */}
                {sendValidationIssues.issues.some(i => i.isLegal) && (
                  <div className={`rounded-xl p-3 mb-4 ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                      <strong>⚖️ Conformité légale :</strong> Votre devis ne sera pas conforme à la réglementation française sans ces informations.
                      <button
                        onClick={() => {
                          const firstLegal = sendValidationIssues.issues.find(i => i.isLegal);
                          setSendValidationIssues(null);
                          setSelected(null);
                          setPage('settings');
                          if (firstLegal?.settingsTab) {
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('navigate-settings-tab', {
                                detail: { tab: firstLegal.settingsTab, fieldId: firstLegal.settingsField }
                              }));
                            }, 200);
                          }
                        }}
                        className="ml-1 underline font-semibold hover:opacity-80"
                        style={{ color: isDark ? '#fbbf24' : '#d97706' }}
                      >
                        Compléter votre profil maintenant →
                      </button>
                    </p>
                  </div>
                )}

                {/* Issues list */}
                <div className="space-y-2 mb-6">
                  {sendValidationIssues.issues.map(issue => (
                    <div key={issue.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${textPrimary}`}>{issue.label}</p>
                      </div>
                      {issue.action === 'settings' && (
                        <button
                          onClick={() => {
                            setSendValidationIssues(null);
                            setSelected(null);
                            setPage('settings');
                            // Deep link to specific settings tab/field
                            if (issue.settingsTab) {
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('navigate-settings-tab', {
                                  detail: { tab: issue.settingsTab, fieldId: issue.settingsField }
                                }));
                              }, 200);
                            }
                          }}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                          style={{ color: couleur, backgroundColor: `${couleur}15` }}
                        >
                          {issue.actionLabel}
                        </button>
                      )}
                      {issue.action === 'edit' && (
                        <button
                          onClick={() => {
                            const doc = sendValidationIssues.doc;
                            setSendValidationIssues(null);
                            if (doc) {
                              setEditingDevis(doc);
                              setShowDevisWizard(true);
                            }
                          }}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                          style={{ color: couleur, backgroundColor: `${couleur}15` }}
                        >
                          {issue.actionLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setSendValidationIssues(null)}
                    className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Compris
                  </button>
                  {sendValidationIssues.sendFn && sendValidationIssues.isDownload && sendValidationIssues.issues.every(i => ['no_siret', 'no_adresse', 'no_nom', 'no_forme_juridique', 'no_decennale'].includes(i.id)) && (
                    <button
                      onClick={() => { const fn = sendValidationIssues.sendFn; const doc = sendValidationIssues.doc; setSendValidationIssues(null); fn(doc); }}
                      className="flex-1 py-2.5 rounded-xl font-medium text-sm text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: couleur }}
                    >
                      Télécharger quand même
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Post-send confirmation modal */}
        {showSendConfirmation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSendConfirmation(null)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl p-6`} onClick={e => e.stopPropagation()}>
              {/* Success icon */}
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
                  <CheckCircle size={28} style={{ color: couleur }} />
                </div>
              </div>
              <h3 className={`text-lg font-bold text-center mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {showSendConfirmation.doc?.type === 'facture' ? 'Facture' : 'Devis'} envoy{showSendConfirmation.doc?.type === 'facture' ? 'e' : 'e'} !
              </h3>
              <p className={`text-sm text-center mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                via {showSendConfirmation.canal}
              </p>

              {/* Summary */}
              <div className={`rounded-xl p-4 mb-4 space-y-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Client</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{showSendConfirmation.clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Montant</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMoney(showSendConfirmation.montant)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Canal</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{showSendConfirmation.canal}</span>
                </div>
              </div>

              {/* Copy signature link */}
              {showSendConfirmation.doc?.signature_token && (
                <button
                  onClick={() => {
                    const url = buildSignatureUrl(showSendConfirmation.doc.signature_token);
                    navigator.clipboard.writeText(url);
                    showToast('Lien de signature copie !', 'success');
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-3 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  <Link2 size={16} /> Copier le lien de signature
                </button>
              )}

              {/* Send via other channel */}
              <div className="flex gap-2 mb-3">
                {showSendConfirmation.canal !== 'WhatsApp' && (
                  <button
                    onClick={() => { sendWhatsApp(showSendConfirmation.doc); }}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                )}
                {showSendConfirmation.canal !== 'Email' && (
                  <button
                    onClick={() => { sendEmail(showSendConfirmation.doc); }}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mail size={14} /> Email
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowSendConfirmation(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ backgroundColor: couleur }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {showSignatureLinkModal && signatureLinkUrl && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSignatureLinkModal(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl p-5`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Lien de signature</h3>
                <button onClick={() => setShowSignatureLinkModal(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                  <X size={20} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Partagez ce lien avec votre client pour qu'il puisse signer le devis <strong>{selected?.numero}</strong> en ligne.
              </p>
              {/* URL display + copy */}
              <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <input
                  type="text"
                  readOnly
                  value={signatureLinkUrl}
                  className={`flex-1 text-sm bg-transparent outline-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(signatureLinkUrl);
                    showToast('Lien copié !', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: couleur }}
                >
                  <Copy size={14} />
                </button>
              </div>
              {/* Share buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const client = clients.find(c => c.id === selected?.client_id);
                    const phone = (client?.telephone || '').replace(/\s/g, '');
                    const text = `Bonjour, veuillez signer votre devis ${selected?.numero} en ligne :\n${signatureLinkUrl}`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                    setShowSignatureLinkModal(false);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    const client = clients.find(c => c.id === selected?.client_id);
                    const phone = (client?.telephone || '').replace(/\s/g, '');
                    const text = `Signez votre devis ${selected?.numero}: ${signatureLinkUrl}`;
                    window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
                    setShowSignatureLinkModal(false);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  SMS
                </button>
                <button
                  onClick={() => {
                    const client = clients.find(c => c.id === selected?.client_id);
                    const subject = `Signature devis ${selected?.numero}`;
                    const body = `Bonjour,%0A%0AVeuillez signer votre devis en ligne :%0A${encodeURIComponent(signatureLinkUrl)}%0A%0ACordialement`;
                    window.location.href = `mailto:${client?.email || ''}?subject=${subject}&body=${body}`;
                    setShowSignatureLinkModal(false);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal — also needed in preview mode */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          document={selected}
          client={selected ? clients.find(c => c.id === selected.client_id) : null}
          onPaymentSaved={async (payment) => {
            if (selected) {
              const updatedMontantPaye = (selected.montant_paye || 0) + (payment.montant || 0);
              const isPaid = updatedMontantPaye >= (selected.total_ttc || 0);
              onUpdate(selected.id, {
                montant_paye: updatedMontantPaye,
                ...(isPaid ? { statut: 'payee' } : {}),
              });
              setSelected(s => ({ ...s, montant_paye: updatedMontantPaye, ...(isPaid ? { statut: 'payee' } : {}) }));

              // If this is an acompte facture and it's paid, update échéancier étape to 'paye'
              if (isPaid && selected.facture_type === 'acompte' && selected.devis_source_id) {
                const sourceDevis = devis.find(d => d.id === selected.devis_source_id);
                const echeancier = sourceDevis?.echeancier_id ? echeancierCache[sourceDevis.id] : null;
                if (echeancier) {
                  const etape = echeancier.etapes?.find(e => e.facture_id === selected.id);
                  if (etape) {
                    const updatedEtapes = updateEtape(echeancier.etapes, etape.numero, { statut: ETAPE_STATUT.PAYE });
                    const updatedEcheancier = { ...echeancier, etapes: updatedEtapes, updated_at: new Date().toISOString() };
                    try {
                      if (isDemo || !supabase) {
                        const stored = JSON.parse(localStorage.getItem('cp_echeanciers') || '{}');
                        stored[sourceDevis.id] = updatedEcheancier;
                        localStorage.setItem('cp_echeanciers', JSON.stringify(stored));
                      } else {
                        await supabase.from('acompte_echeanciers').update({ etapes: updatedEtapes, updated_at: updatedEcheancier.updated_at }).eq('id', echeancier.id);
                      }
                      setEcheancierCache(prev => ({ ...prev, [sourceDevis.id]: updatedEcheancier }));
                    } catch (err) {
                      // echeancier update error handled silently
                    }
                  }
                }
              }
            }
          }}
          isDark={isDark}
          couleur={couleur}
        />

        {/* Avoir Creation Modal */}
        <AvoirCreationModal
          isOpen={showAvoirModal}
          onClose={() => setShowAvoirModal(false)}
          facture={selected}
          devis={devis}
          onCreateAvoir={handleCreateAvoir}
          isDark={isDark}
          couleur={couleur}
          modeDiscret={modeDiscret}
          formatMoney={formatMoney}
        />

        {/* Snapshot Viewer */}
        {viewingSnapshot && (
          <SnapshotViewer
            snapshot={viewingSnapshot}
            entityType="devis"
            isDark={isDark}
            couleur={couleur}
            modeDiscret={modeDiscret}
            onClose={() => setViewingSnapshot(null)}
            onRestore={async (snap) => {
              const confirmed = await showConfirm('Restaurer cette version ?', 'Les données actuelles seront remplacées par cette version. Cette action est irréversible.');
              if (!confirmed) return;
              const restoreData = { ...snap.data };
              delete restoreData.id;
              delete restoreData.created_at;
              delete restoreData.updated_at;
              delete restoreData.user_id;
              delete restoreData.organization_id;
              await onUpdate(selected.id, restoreData);
              setSelected(s => ({ ...s, ...restoreData }));
              setViewingSnapshot(null);
              showToast('Version restaurée avec succès', 'success');
            }}
            onCompare={(snap) => {
              setComparingSnapshots({ a: snap, b: { ...devisSnapshots[0], data: selected } });
              setViewingSnapshot(null);
            }}
          />
        )}

        {/* Diff Viewer */}
        {comparingSnapshots && (
          <DiffViewer
            snapshotA={comparingSnapshots.a}
            snapshotB={comparingSnapshots.b}
            entityType="devis"
            isDark={isDark}
            couleur={couleur}
            modeDiscret={modeDiscret}
            onClose={() => setComparingSnapshots(null)}
          />
        )}
      </div>
      {devisWizardElement}
    </>
    );
  }

  // === CREATE VIEW ===
  if (mode === 'create') {
    const favoris = catalogue?.filter(c => c.favori) || [];
    const catalogueFiltered = catalogue?.filter(c => !debouncedCatalogueSearch || c.nom?.toLowerCase().includes(debouncedCatalogueSearch.toLowerCase())) || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => {
            const hasData = form.clientId || (form.sections?.[0]?.lignes?.length > 0);
            if (hasData) {
              if (window.confirm('Abandonner ce devis ? Les données non sauvegardées seront perdues.')) {
                setMode('list');
                setForm({ type: 'devis', clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], validite: entreprise?.validiteDevis || 30, sections: [{ id: '1', titre: '', lignes: [] }], tvaDefaut: entreprise?.tvaDefaut || 10, remise: 0, retenueGarantie: false, conditionsPaiement: entreprise?.conditionsPaiementDefaut || '30_jours', notes: '' });
              }
            } else {
              setMode('list');
            }
          }} className={`p-2.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors`}><ArrowLeft size={20} /></button>
          <h2 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Nouveau {form.type}</h2>
          <button
            onClick={() => {
              const hasData = form.clientId || (form.sections?.[0]?.lignes?.length > 0);
              if (hasData) {
                if (window.confirm('Abandonner ce devis ? Les données non sauvegardées seront perdues.')) {
                  setMode('list');
                  setForm({ type: 'devis', clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], validite: entreprise?.validiteDevis || 30, sections: [{ id: '1', titre: '', lignes: [] }], tvaDefaut: entreprise?.tvaDefaut || 10, remise: 0, retenueGarantie: false, conditionsPaiement: entreprise?.conditionsPaiementDefaut || '30_jours', notes: '' });
                }
              } else {
                setMode('list');
              }
            }}
            className={`text-sm px-3 py-1.5 rounded-lg min-h-[44px] ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            Annuler
          </button>
        </div>

        {/* Template Options */}
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Smart Template Wizard - Full guided flow */}
          <button
            onClick={() => setShowSmartWizard(true)}
            className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all hover:shadow-lg group text-left ${isDark ? 'border-orange-500/50 hover:border-orange-400 bg-gradient-to-r from-orange-900/20 to-amber-900/20' : 'border-orange-300 hover:border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50'}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-500 group-hover:scale-110 transition-transform flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${textPrimary} text-sm sm:text-base`}>Devis Express</p>
              <p className={`text-xs sm:text-sm ${textMuted}`}>Devis complet en 2 clics</p>
            </div>
            <ChevronRight size={18} className={`${textMuted} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
          </button>

          {/* Load Template - Add lines to current form */}
          <button
            onClick={() => setShowTemplateSelector(true)}
            className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all hover:shadow-lg group text-left ${isDark ? 'border-blue-500/50 hover:border-blue-400 bg-gradient-to-r from-blue-900/20 to-indigo-900/20' : 'border-blue-300 hover:border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50'}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${textPrimary} text-sm sm:text-base`}>Charger un modèle</p>
              <p className={`text-xs sm:text-sm ${textMuted}`}>Ajouter des lignes métier</p>
            </div>
            <ChevronRight size={18} className={`${textMuted} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
          </button>
        </div>

        {/* Modèles métier prédéfinis */}
        <div>
          <p className={`text-xs font-medium mb-2 ${textMuted}`}>Modèles métier</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Rénovation SDB', icon: Droplets, sections: [{ titre: 'Démolition', items: [{ description: 'Dépose sanitaires existants' }, { description: 'Démolition carrelage mural et sol' }] }, { titre: 'Plomberie', items: [{ description: 'Alimentation eau chaude/froide' }, { description: 'Évacuation' }] }, { titre: 'Carrelage', items: [{ description: 'Pose carrelage sol' }, { description: 'Pose faïence murale' }] }, { titre: 'Sanitaires', items: [{ description: 'Pose douche italienne' }, { description: 'Pose meuble vasque' }, { description: 'Pose WC suspendu' }] }] },
              { label: 'Peinture', icon: Paintbrush, sections: [{ titre: 'Préparation', items: [{ description: 'Protection sols et meubles' }, { description: 'Lessivage murs' }, { description: 'Rebouchage fissures' }] }, { titre: 'Peinture', items: [{ description: 'Peinture murs 2 couches' }, { description: 'Peinture plafond' }, { description: 'Peinture boiseries' }] }] },
              { label: 'Électricité', icon: Zap, sections: [{ titre: 'Installation', items: [{ description: 'Pose tableau électrique' }, { description: 'Tirage de câbles' }, { description: 'Pose prises et interrupteurs' }, { description: 'Pose éclairages' }] }] },
              { label: 'Devis vierge', icon: FileText, sections: [{ titre: 'Prestations', items: [] }] },
            ].map(tpl => (
              <button
                key={tpl.label}
                onClick={() => {
                  const sections = tpl.sections.map(s => ({
                    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                    titre: s.titre,
                    lignes: s.items.map(item => ({
                      id: `item_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                      description: item.description || '',
                      quantite: 1,
                      unite: 'u',
                      prixUnitaire: 0,
                      tva: form.tvaDefaut || 10,
                      subItems: [],
                    })),
                  }));
                  setForm(prev => ({ ...prev, sections }));
                  showToast?.(`Modèle "${tpl.label}" chargé`, 'success');
                }}
                className={`p-3 rounded-xl border text-center transition-all hover:shadow-md ${isDark ? 'border-slate-600 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <tpl.icon size={20} className="mx-auto mb-1" style={{ color: couleur }} />
                <p className={`text-xs font-medium ${textPrimary}`}>{tpl.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 space-y-4 sm:space-y-6`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Type</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Client *</label><div className="flex gap-2"><select className={`flex-1 px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Choisir...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select><button onClick={() => setShowClientModal(true)} className="px-3 py-2 rounded-xl min-h-[44px] flex items-center justify-center hover:shadow-md transition-all" style={{background: `${couleur}20`, color: couleur}}><Plus size={18} /></button></div></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Chantier</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Date</label><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          </div>
          
          {/* TVA par défaut - Quick Buttons pour Jean-Marc fatigue */}
          <div className={`p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'} rounded-xl`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-sm ${textMuted}`}>TVA:</span>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 20, label: '20%', sub: 'normal' },
                  { value: 10, label: '10%', sub: 'renovation' },
                  { value: 5.5, label: '5,5%', sub: 'eco-reno' },
                  { value: 0, label: '0%', sub: 'exonere' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({...p, tvaDefaut: opt.value}))}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      form.tvaDefaut === opt.value
                        ? 'text-white shadow-lg scale-[1.02]'
                        : isDark
                          ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    style={form.tvaDefaut === opt.value ? { backgroundColor: couleur } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {isMicro && <span className={`text-xs px-2 py-1 rounded ${isDark ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-100'}`}>TVA non applicable (micro)</span>}
            </div>
          </div>
          
          {favoris.length >= 3 && <div className={`rounded-xl p-4 border ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-100'}`}><p className={`text-sm font-medium mb-2 ${textPrimary}`}>⭐ Favoris</p><div className="flex gap-2 flex-wrap overflow-x-auto pb-1">{favoris.map(item => <button key={item.id} onClick={() => addLigne(item, form.sections[0].id)} className={`px-3 py-2 border rounded-lg text-sm transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600 hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95' : 'bg-white hover:bg-amber-50 border-slate-200 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95'}`}><span className={textPrimary}>{item.nom}</span> <span className="text-amber-600 font-semibold">{item.prix}€</span></button>)}</div></div>}
          {/* Catalogue section with visual browser button */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  placeholder="Rechercher dans le catalogue..."
                  aria-label="Rechercher dans le catalogue"
                  value={catalogueSearch}
                  onChange={e => setCatalogueSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
                />
              </div>
              <button
                onClick={() => setShowCatalogBrowser(true)}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: `${couleur}15`, color: couleur, border: `1px solid ${couleur}30` }}
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">Parcourir</span>
              </button>
            </div>
            {catalogueSearch && (
              <div className={`border rounded-xl max-h-40 overflow-y-auto ${isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                {catalogueFiltered.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { addLigne(item, form.sections[0].id); setCatalogueSearch(''); }}
                    className={`w-full flex justify-between px-4 py-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} border-b last:border-0 text-left`}
                  >
                    <span>{item.nom}</span>
                    <span className="text-slate-500">{item.prix}€/{item.unite}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Lignes du devis - Cards pour mobile, compact pour desktop */}
          {form.sections.map(section => (
            <div key={section.id} className="space-y-3">
              {/* Header with count */}
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${textMuted}`}>
                  {section.lignes.length} ligne{section.lignes.length > 1 ? 's' : ''} • Total: {(section.lignes.reduce((s, l) => s + getLineTotal(l), 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </p>
              </div>

              {/* Line items as cards */}
              <div className="space-y-3">
                {section.lignes.map((l, idx) => (
                  <div
                    key={l.id}
                    className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}
                  >
                    {/* Top row: Description + Total + Delete */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <input
                          value={l.description}
                          onChange={e => updateLigne(section.id, l.id, 'description', e.target.value)}
                          placeholder="Description de l'article..."
                          className={`w-full px-3 py-2 border rounded-lg font-medium ${inputBg}`}
                        />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold tabular-nums transition-all" style={{ color: couleur }}>
                          {getLineTotal(l).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </p>
                        <p className={`text-xs ${textMuted}`}>HT</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {idx > 0 && (
                          <button onClick={() => moveLigne(section.id, idx, -1)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`} aria-label="Monter la ligne">
                            <ChevronUp size={14} />
                          </button>
                        )}
                        {idx < section.lignes.length - 1 && (
                          <button onClick={() => moveLigne(section.id, idx, 1)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`} aria-label="Descendre la ligne">
                            <ChevronDown size={14} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => removeLigne(section.id, l.id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
                        aria-label="Supprimer la ligne"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Bottom row: Qty stepper + Unit + Price + TVA buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Quantity with stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateLigne(section.id, l.id, 'quantite', Math.max(0, (l.quantite || 0) - 1))}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                          aria-label="Diminuer la quantité"
                        >
                          <span className="text-lg font-bold">−</span>
                        </button>
                        <input
                          type="number"
                          value={l.quantite || ''}
                          onChange={e => updateLigne(section.id, l.id, 'quantite', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          className={`w-14 h-8 px-2 border rounded-lg text-center font-medium ${inputBg}`}
                        />
                        <button
                          onClick={() => updateLigne(section.id, l.id, 'quantite', (l.quantite || 0) + 1)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                          aria-label="Augmenter la quantité"
                        >
                          <span className="text-lg font-bold">+</span>
                        </button>
                      </div>

                      {/* Unit */}
                      <input
                        value={l.unite}
                        onChange={e => updateLigne(section.id, l.id, 'unite', e.target.value)}
                        className={`w-16 h-8 px-2 border rounded-lg text-center text-sm ${inputBg}`}
                        placeholder="unité"
                      />

                      <span className={`${textMuted}`}>×</span>

                      {/* Price */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={l.prixUnitaire || ''}
                          onChange={e => updateLigne(section.id, l.id, 'prixUnitaire', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          className={`w-20 sm:w-24 h-8 px-2 border rounded-lg text-right font-medium text-sm sm:text-base ${inputBg}`}
                          placeholder="Prix"
                          inputMode="decimal"
                        />
                        <span className={`text-sm ${textMuted}`}>€</span>
                      </div>

                      {/* TVA quick buttons */}
                      <div className="flex items-center gap-1 ml-auto">
                        <span className={`text-xs ${textMuted} mr-1`}>TVA:</span>
                        {[20, 10, 5.5, 0].map(tvaOpt => {
                          const currentTva = l.tva !== undefined ? l.tva : form.tvaDefaut;
                          const isSelected = currentTva === tvaOpt;
                          return (
                            <button
                              key={tvaOpt}
                              onClick={() => updateLigne(section.id, l.id, 'tva', tvaOpt)}
                              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                isSelected
                                  ? 'text-white shadow-sm'
                                  : isDark
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              style={isSelected ? { backgroundColor: couleur } : {}}
                            >
                              {tvaOpt === 5.5 ? '5,5' : tvaOpt}%
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sous-lignes (informatives, non comptées dans le total) */}
                    {(l.subItems || []).length > 0 && (
                      <div className="pl-8 mt-2 space-y-1.5">
                        {l.subItems.map((sub, subIdx) => (
                          <div key={sub.id} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <span className={`text-xs ${textMuted}`}>↳</span>
                            <input
                              value={sub.description}
                              onChange={e => updateSubItem(section.id, l.id, subIdx, 'description', e.target.value)}
                              placeholder="Détail..."
                              className={`flex-1 px-2 py-1 border rounded text-xs ${inputBg}`}
                            />
                            <input
                              type="number"
                              value={sub.quantite || ''}
                              onChange={e => updateSubItem(section.id, l.id, subIdx, 'quantite', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                              className={`w-14 px-2 py-1 border rounded text-xs text-center ${inputBg}`}
                              placeholder="Qté"
                            />
                            <input
                              type="number"
                              value={sub.prixUnitaire || ''}
                              onChange={e => updateSubItem(section.id, l.id, subIdx, 'prixUnitaire', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                              className={`w-20 px-2 py-1 border rounded text-xs text-right ${inputBg}`}
                              placeholder="Prix"
                            />
                            <span className={`text-xs ${textMuted}`}>€</span>
                            <button
                              onClick={() => removeSubItem(section.id, l.id, subIdx)}
                              className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
                              aria-label="Supprimer la sous-ligne"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Action buttons: sub-line + photo */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => addSubItem(section.id, l.id)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors min-h-[36px] ${isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                      >
                        <Plus size={12} /> Sous-ligne
                      </button>
                      <label
                        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors min-h-[36px] cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                      >
                        <Camera size={12} /> Photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const photos = l.photos || [];
                              updateLigne(section.id, l.id, 'photos', [...photos, { id: Date.now(), url: ev.target.result, name: file.name }]);
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {/* Photos attached to this line */}
                    {l.photos?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {l.photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img src={photo.url} alt={photo.name || 'Photo'} className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                            <button
                              onClick={() => updateLigne(section.id, l.id, 'photos', l.photos.filter(p => p.id !== photo.id))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Supprimer la photo"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add line button */}
              <button
                onClick={() => addLigne({ nom: '', prix: 0, unite: 'unité' }, section.id)}
                className={`w-full py-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-md ${isDark ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
              >
                <Plus size={18} style={{ color: couleur }} />
                <span className="font-medium" style={{ color: couleur }}>Ajouter une ligne</span>
              </button>
              {/* B2: Inline error when no lines */}
              {section.lignes.length === 0 && (
                <p className={`text-xs font-medium flex items-center gap-1.5 mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  <AlertTriangle size={12} /> Ajoutez au moins une prestation pour calculer le montant total
                </p>
              )}
            </div>
          ))}
          
          {/* Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Remise globale %</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.remise} onChange={e => setForm(p => ({...p, remise: parseFloat(e.target.value) || 0}))} /></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Validité (jours)</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.validite} onChange={e => setForm(p => ({...p, validite: parseInt(e.target.value) || 30}))} /></div>
            <div>
              <label className={`block text-sm mb-1 ${textPrimary}`}>Conditions de paiement</label>
              <select value={form.conditionsPaiement} onChange={e => setForm(p => ({...p, conditionsPaiement: e.target.value}))} className={`w-full px-3 py-2.5 border rounded-xl ${inputBg}`}>
                {Object.entries(CONDITIONS_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-sm mb-1 ${textPrimary}`}>Retenue de garantie</label>
              <label className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl cursor-pointer ${form.retenueGarantie ? (isDark ? 'border-amber-500 bg-amber-900/20' : 'border-amber-400 bg-amber-50') : inputBg}`}>
                <input type="checkbox" checked={form.retenueGarantie} onChange={e => setForm(p => ({...p, retenueGarantie: e.target.checked}))} className="w-4 h-4 rounded" />
                <span className={`text-sm ${textPrimary}`}>5% (BTP)</span>
              </label>
            </div>
          </div>
          
          {/* Totaux avec multi-TVA et marge */}
          <div className="flex flex-col sm:flex-row justify-end gap-4">
            {/* Aperçu marge (visible seulement pour l'artisan, pas sur le PDF) */}
            {!modeDiscret && totals.totalCoutAchat > 0 && (
              <div className={`w-full sm:w-64 p-4 rounded-xl border ${totals.marge >= 0 ? (isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200') : (isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className={totals.marge >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                  <span className={`text-sm font-medium ${textPrimary}`}>Votre marge</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>privé</span>
                </div>
                <div className="space-y-1">
                  <div className={`flex justify-between text-sm ${textSecondary}`}>
                    <span>Coût d'achat</span>
                    <span>{modeDiscret ? '·····' : formatMoney(totals.totalCoutAchat)}</span>
                  </div>
                  <div className={`flex justify-between font-medium ${totals.marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span>Marge brute</span>
                    <span>{modeDiscret ? '·····' : formatMoney(totals.marge)}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${totals.marge >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    <span>Taux de marge</span>
                    <span>{modeDiscret ? '··' : totals.tauxMarge.toFixed(1)}%</span>
                  </div>
                </div>
                {totals.tauxMarge < 20 && totals.tauxMarge >= 0 && (
                  <p className={`text-xs mt-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Marge faible - verifiez vos prix</p>
                )}
                {totals.marge < 0 && (
                  <p className={`text-xs mt-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Attention: marge negative!</p>
                )}
              </div>
            )}
            <div className={`w-full sm:w-72 p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <div className={`flex justify-between py-1 ${textPrimary}`}><span>Total HT</span><span>{formatMoney(totals.totalHT)}</span></div>
              {form.remise > 0 && <div className="flex justify-between py-1 text-red-500"><span>Remise {form.remise}%</span><span>-{formatMoney(totals.remiseAmount)}</span></div>}
              {!isMicro && Object.entries(totals.tvaParTaux).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) => (
                <div key={taux} className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                  <span>TVA {taux}%</span>
                  <span>{formatMoney(data.montant)}</span>
                </div>
              ))}
              {isMicro && <div className={`text-xs py-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>TVA non applicable (art. 293B CGI)</div>}
              <div className={`flex justify-between py-2 border-t font-bold mt-1 ${isDark ? 'border-slate-600' : 'border-slate-200'}`} style={{color: couleur}}><span>Total TTC</span><span>{formatMoney(totals.ttc)}</span></div>
              {form.retenueGarantie && (
                <>
                  <div className={`flex justify-between py-1 text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    <span>Retenue garantie 5%</span>
                    <span>-{formatMoney(totals.retenueGarantie)}</span>
                  </div>
                  <div className={`flex justify-between py-1 font-medium ${textPrimary}`}>
                    <span>Net à payer</span>
                    <span>{formatMoney(totals.ttcNet)}</span>
                  </div>
                  <p className={`text-xs mt-1 ${textMuted}`}>Retenue libérée après 1 an</p>
                </>
              )}
            </div>
          </div>
          
          {/* Sticky Footer with Save Actions */}
        </div>
        <div className={`sticky bottom-0 left-0 right-0 p-4 border-t shadow-lg ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 max-w-full">
            <div className={`text-sm ${textMuted} hidden sm:block`}>
              {form.sections[0]?.lignes?.length || 0} ligne{(form.sections[0]?.lignes?.length || 0) > 1 ? 's' : ''} • Total: <span className="font-bold" style={{color: couleur}}>{formatMoney(totals.ttc)}</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
              <button onClick={() => setMode('list')} className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                <X size={16} />
                <span>Annuler</span>
              </button>
              <button onClick={() => { handleCreate(); }} disabled={isSubmitting} className={`px-5 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-all font-medium disabled:opacity-50 border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                <FileText size={16} />
                <span>Enregistrer brouillon</span>
              </button>
              <button onClick={() => { handleCreate(); }} disabled={isSubmitting} className="px-6 py-2.5 text-white rounded-xl flex items-center gap-2 min-h-[44px] hover:shadow-lg transition-all font-semibold disabled:opacity-50" style={{background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`}}>
                <Check size={18} />
                <span>{isSubmitting ? 'Création...' : `Créer le ${form.type}`}</span>
              </button>
            </div>
          </div>
        </div>
        {showClientModal && <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"><div className={`${cardBg} rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md`}><h3 className="font-bold mb-4">Nouveau client</h3><div className="space-y-4"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom *" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Téléphone" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowClientModal(false)} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={() => { if (newClient.nom) { const c = { id: generateId(), ...newClient }; setClients(prev => [...prev, c]); setForm(p => ({...p, clientId: c.id})); setShowClientModal(false); setNewClient({ nom: '', telephone: '' }); }}} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div></div></div>}

        {/* Template Selector Modal - also needed in create mode */}
        <TemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleTemplateSelect}
          customTemplates={ctxTemplates}
          onDeleteTemplate={(id) => {
            deleteCtxTemplate(id);
            showToast('Modèle supprimé', 'success');
          }}
          isDark={isDark}
          couleur={couleur}
        />

        {/* Smart Template Wizard - also needed in create mode */}
        <SmartTemplateWizard
          isOpen={showSmartWizard}
          onClose={() => setShowSmartWizard(false)}
          onCreateDevis={handleSmartDevisCreate}
          clients={clients}
          addClient={addClient}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />

        <Snackbar />
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div className="space-y-3">
      {/* ========== HEADER COMPACT ========== */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              title="Retour au tableau de bord"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary} inline-flex items-center gap-2`}>
              Devis & Factures
              {complianceDismissed && (() => {
                const missing = [];
                if (!entreprise?.siret) missing.push('SIRET');
                if (!entreprise?.adresse) missing.push('Adresse');
                if (!entreprise?.formeJuridique) missing.push('Forme juridique');
                if (!entreprise?.decennaleAssureur) missing.push('Assurance décennale');
                if (missing.length === 0) return null;
                return (
                  <span
                    className="relative inline-block cursor-pointer"
                    title={`Profil incomplet : ${missing.join(', ')}`}
                    onClick={() => setPage?.('settings')}
                  >
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: couleur }} />
                    <span className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-50" style={{ background: couleur }} />
                  </span>
                );
              })()}
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Gérez vos documents commerciaux</p>
          </div>
        </div>

        {/* Split-button: + Nouveau devis — hidden for view-only roles */}
        {canPerform('devis', 'create') && (
        <div className="relative">
          <div className="flex items-stretch">
            <button
              onClick={() => { setEditingDevis(null); setShowDevisWizard(true); }}
              className="px-4 py-2.5 text-white rounded-l-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
              style={{ background: couleur }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nouveau devis</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="px-2 text-white rounded-r-xl border-l border-white/20 hover:opacity-80 transition-all"
              style={{ background: couleur }}
              aria-label="Options de création"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {/* Dropdown menu */}
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className={`absolute right-0 mt-1 w-56 rounded-xl border shadow-xl z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button
                  onClick={() => { setShowCreateMenu(false); setPage('ia-devis'); }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                >
                  <Sparkles size={16} className="text-violet-500" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Devis IA</p>
                    <p className={`text-[11px] ${textMuted}`}>Photo → Devis automatique</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); setShowDevisExpressModal(true); }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-t ${isDark ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-100'}`}
                >
                  <Zap size={16} className="text-amber-500" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Devis Express</p>
                    <p className={`text-[11px] ${textMuted}`}>3 clics, c'est chiffré</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); setEditingDevis(null); setShowDevisWizard(true); }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-t ${isDark ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-100'}`}
                >
                  <Edit3 size={16} style={{ color: couleur }} />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Devis manuel</p>
                    <p className={`text-[11px] ${textMuted}`}>Création détaillée</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* RBAC: ReadOnly banner for view-only users */}
      {isViewOnly && <ReadOnlyBanner />}

      {/* === COMPLIANCE BANNER — compact + dismissable === */}
      {!complianceDismissed && (() => {
        const missingLegal = [];
        if (!entreprise?.siret) missingLegal.push('SIRET');
        if (!entreprise?.adresse) missingLegal.push('Adresse');
        if (!entreprise?.formeJuridique) missingLegal.push('Forme juridique');
        if (!entreprise?.decennaleAssureur) missingLegal.push('Assurance décennale');
        if (missingLegal.length === 0) return null;
        return (
          <div className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">Profil incomplet</span>
              <span className="hidden sm:inline mx-1">— {missingLegal.join(', ')}</span>
              <span className={`sm:hidden block text-[10px] mt-0.5 truncate ${isDark ? 'text-red-400/70' : 'text-red-600/70'}`}>{missingLegal.join(', ')}</span>
            </div>
            {setPage && (
              <button onClick={() => setPage('settings')} className={`shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors ${isDark ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>Compléter</button>
            )}
            <button
              onClick={() => { setComplianceDismissed(true); try { localStorage.setItem('cp_devis_banner_dismissed', new Date().toISOString()); } catch {} }}
              className={`shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-red-800/50 text-red-400' : 'hover:bg-red-200 text-red-500'}`}
              title="Masquer pendant 7 jours"
            >
              <X size={14} />
            </button>
          </div>
        );
      })()}
      {/* === KPIs COMPACTS — ligne dense === */}
      {(() => {
        const cleanDevis = devis.filter(d => {
          if (!d.numero && !clients.find(c => c.id === d.client_id) && (!d.statut || d.statut === 'brouillon')) return false;
          if (d.client_id && !clients.find(c => c.id === d.client_id) && d.statut === 'brouillon' && !d.total_ttc) return false;
          return true;
        });
        const devisEnvoye = cleanDevis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut));
        const facturesEnAttente = cleanDevis.filter(d => d.type === 'facture' && d.statut !== 'payee');
        const facturesPayees = cleanDevis.filter(d => d.type === 'facture' && d.statut === 'payee');
        const facturesEnRetard = facturesEnAttente.filter(f => Math.floor((Date.now() - new Date(f.date)) / 86400000) > 30);
        const montantPayees = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);
        const montantEnCours = devisEnvoye.reduce((s, d) => s + (d.total_ttc || 0), 0);
        const montantAEncaisser = facturesEnAttente.reduce((s, f) => s + (f.total_ttc || 0), 0);
        const avoirsEmis = cleanDevis.filter(d => d.facture_type === 'avoir');
        const montantAvoirs = avoirsEmis.reduce((s, a) => s + Math.abs(a.total_ttc || 0), 0);
        const conversionResult = calcConversion(cleanDevis);
        const totalEnvoyes = conversionResult.envoyes;
        const tauxConversion = totalEnvoyes > 0 ? conversionResult.taux : null;

        // Trend computation: compare current month vs previous month
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonthDevis = cleanDevis.filter(d => new Date(d.date) >= thisMonthStart);
        const prevMonthDevis = cleanDevis.filter(d => { const dt = new Date(d.date); return dt >= prevMonthStart && dt < thisMonthStart; });
        const calcTrend = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
        const trendCA = calcTrend(
          thisMonthDevis.filter(d => d.type === 'facture' && d.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0),
          prevMonthDevis.filter(d => d.type === 'facture' && d.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0)
        );
        const trendEnCours = calcTrend(
          thisMonthDevis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length,
          prevMonthDevis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length
        );
        const trendAEncaisser = calcTrend(
          thisMonthDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0),
          prevMonthDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0)
        );
        const TrendBadge = ({ value }) => {
          if (value === 0) return null;
          const isUp = value > 0;
          return (
            <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-md inline-flex items-center gap-0.5 ${isUp ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-50 text-red-600')}`}>
              {isUp ? '↗' : '↘'} {isUp ? '+' : ''}{value}%
            </span>
          );
        };

        return (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
            {/* CA encaissé */}
            <button onClick={() => setFilter('factures')} className={`${cardBg} rounded-xl border px-2 sm:px-3 py-2 text-left transition-all hover:shadow-md ${filter === 'factures' ? 'ring-2' : ''}`} style={filter === 'factures' ? { '--tw-ring-color': couleur } : {}}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${textMuted} leading-none`}>CA encaissé</p>
                <TrendBadge value={trendCA} />
              </div>
              <p className="text-xs sm:text-base font-bold leading-tight mt-0.5 truncate" style={{ color: couleur }}>{!canViewPrices ? '—' : modeDiscret ? '···' : formatMoney(montantPayees)}</p>
              <p className={`text-[10px] ${textMuted} leading-none mt-0.5`}>{facturesPayees.length} fact.</p>
            </button>

            {/* En cours */}
            <button onClick={() => setFilter('attente')} className={`${cardBg} rounded-xl border px-2 sm:px-3 py-2 text-left transition-all hover:shadow-md ${filter === 'attente' ? 'ring-2' : ''}`} style={filter === 'attente' ? { '--tw-ring-color': couleur } : {}}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${textMuted} leading-none`}>En cours</p>
                <TrendBadge value={trendEnCours} />
              </div>
              <p className="text-xs sm:text-base font-bold text-blue-600 leading-tight mt-0.5">{devisEnvoye.length}</p>
              <p className={`text-[10px] ${textMuted} leading-none mt-0.5 truncate`}>{!canViewPrices ? '—' : modeDiscret ? '···' : formatMoney(montantEnCours)}</p>
            </button>

            {/* Conversion */}
            <button onClick={() => setFilter('conversion')} className={`${cardBg} rounded-xl border px-2 sm:px-3 py-2 text-left transition-all hover:shadow-md ${filter === 'conversion' ? 'ring-2' : ''}`} style={filter === 'conversion' ? { '--tw-ring-color': couleur } : {}}>
              <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${textMuted} leading-none`}>Conversion</p>
              <p className={`text-xs sm:text-base font-bold leading-tight mt-0.5 ${tauxConversion != null ? (tauxConversion >= 50 ? 'text-emerald-600' : tauxConversion >= 25 ? 'text-amber-600' : 'text-red-500') : textMuted}`}>
                {formatConversion(tauxConversion)}
              </p>
              <p className={`text-[10px] ${textMuted} leading-none mt-0.5`}>{conversionResult.signes}/{totalEnvoyes}</p>
            </button>

            {/* À encaisser */}
            <button onClick={() => setFilter('factures_impayees')} className={`${cardBg} rounded-xl border px-2 sm:px-3 py-2 text-left transition-all hover:shadow-md ${facturesEnRetard.length > 0 ? (isDark ? 'border-red-800' : 'border-red-300') : ''} ${filter === 'factures_impayees' ? 'ring-2' : ''}`} style={filter === 'factures_impayees' ? { '--tw-ring-color': couleur } : {}}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${textMuted} leading-none`}>À encaisser</p>
                <TrendBadge value={trendAEncaisser} />
              </div>
              <p className={`text-xs sm:text-base font-bold leading-tight mt-0.5 truncate ${facturesEnRetard.length > 0 ? 'text-red-600' : 'text-violet-600'}`}>
                {!canViewPrices ? '—' : modeDiscret ? '···' : formatMoney(montantAEncaisser)}
              </p>
              <p className={`text-[10px] leading-none mt-0.5 ${facturesEnRetard.length > 0 ? 'text-red-500 font-medium' : textMuted}`}>
                {facturesEnRetard.length > 0 ? `${facturesEnRetard.length} retard` : `${facturesEnAttente.length} att.`}
              </p>
            </button>

            {/* Avoirs */}
            {avoirsEmis.length > 0 && (
            <button onClick={() => setFilter('avoirs')} className={`${cardBg} rounded-xl border px-2 sm:px-3 py-2 text-left transition-all hover:shadow-md ${filter === 'avoirs' ? 'ring-2' : ''}`} style={filter === 'avoirs' ? { '--tw-ring-color': couleur } : {}}>
              <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${textMuted} leading-none`}>Avoirs</p>
              <p className="text-xs sm:text-base font-bold text-red-500 leading-tight mt-0.5 truncate">
                {!canViewPrices ? '—' : modeDiscret ? '···' : `-${formatMoney(montantAvoirs)}`}
              </p>
              <p className={`text-[10px] ${textMuted} leading-none mt-0.5`}>{avoirsEmis.length} avoir{avoirsEmis.length > 1 ? 's' : ''}</p>
            </button>
            )}
          </div>
        );
      })()}

      {/* === SEARCH + FILTERS === */}
      <div className="space-y-2">
        {/* Row 1: Search + Period filters + Sort + Export */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-[200px]">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input placeholder="Rechercher..." aria-label="Rechercher un document" value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-sm ${inputBg}`} />
          </div>
          <div role="group" aria-label="Filtrer par période" className="flex gap-1">
            {[['all', 'Tout'], ['month', 'Ce mois'], ['quarter', 'Trim.'], ['year', 'Année']].map(([k, v]) => (
              <button key={k} onClick={() => setPeriodFilter(k)} aria-pressed={periodFilter === k} className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${periodFilter === k ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={periodFilter === k ? {background: couleur} : {}}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          {/* View mode toggle */}
          <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 transition-colors ${viewMode === 'cards' ? (isDark ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-800') : (isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-300' : 'bg-white text-slate-400 hover:text-slate-600')}`}
              title="Vue cartes"
              aria-label="Vue cartes"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors border-l ${viewMode === 'table' ? (isDark ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-200 text-slate-800 border-slate-300') : (isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-300 border-slate-600' : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200')}`}
              title="Vue tableau"
              aria-label="Vue tableau"
              aria-pressed={viewMode === 'table'}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-1.5 transition-colors border-l ${viewMode === 'pipeline' ? (isDark ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-200 text-slate-800 border-slate-300') : (isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-300 border-slate-600' : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200')}`}
              title="Vue pipeline"
              aria-label="Vue pipeline"
              aria-pressed={viewMode === 'pipeline'}
            >
              <Kanban size={14} />
            </button>
          </div>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-2 py-1 rounded-lg text-xs border min-w-[75px] ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            <option value="recent">Récent</option>
            <option value="status">Statut</option>
            <option value="amount">Montant</option>
          </select>
          {/* Export dropdown */}
          {filtered.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const menu = e.currentTarget.nextElementSibling;
                  menu.classList.toggle('hidden');
                }}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                aria-label="Exporter"
                title="Exporter"
              >
                <Download size={14} />
              </button>
              <div className={`hidden absolute right-0 mt-1 w-36 rounded-xl border shadow-lg z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button onClick={() => exportCSV(filtered)} className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <Download size={12} /> CSV
                </button>
                <button onClick={() => batchExportPDF(filtered)} disabled={actionLoading === 'batch'} className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 border-t ${isDark ? 'hover:bg-slate-700 text-slate-300 border-slate-700' : 'hover:bg-slate-50 text-slate-600 border-slate-100'}`}>
                  {actionLoading === 'batch' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF ({filtered.length})
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Row 1.5: Client & Chantier filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setSelectedIds(new Set()); }} className={`px-2 py-1 rounded-lg text-xs border max-w-[160px] ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
            <option value="">Tous les clients</option>
            {clients.filter(c => c.nom).sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr')).map(c => (
              <option key={c.id} value={c.id}>{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</option>
            ))}
          </select>
          <select value={chantierFilter} onChange={e => { setChantierFilter(e.target.value); setSelectedIds(new Set()); }} className={`px-2 py-1 rounded-lg text-xs border max-w-[160px] ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
            <option value="">Tous les chantiers</option>
            {chantiers.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr')).map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          {(clientFilter || chantierFilter) && (
            <div className="flex gap-1 items-center flex-wrap">
              {clientFilter && (() => {
                const cl = clients.find(c => c.id === clientFilter);
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    <Building2 size={10} />
                    {cl ? (cl.prenom ? `${cl.prenom} ${cl.nom}` : cl.nom) : 'Client'}
                    <button onClick={() => setClientFilter('')} className={`ml-0.5 rounded-full p-0.5 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}><X size={10} /></button>
                  </span>
                );
              })()}
              {chantierFilter && (() => {
                const ch = chantiers.find(c => c.id === chantierFilter);
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    <ClipboardList size={10} />
                    {ch?.nom || 'Chantier'}
                    <button onClick={() => setChantierFilter('')} className={`ml-0.5 rounded-full p-0.5 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}><X size={10} /></button>
                  </span>
                );
              })()}
            </div>
          )}
        </div>
        {/* Row 2: Type filter pills */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['acomptes', 'Acomptes'], ['situations', 'Situations'], ['avoirs', 'Avoirs'], ['attente', 'En attente'], ['a_traiter', 'À traiter'], ...(relances.isEnabled && relances.counts.total > 0 ? [['en_relance', 'En relance']] : [])].map(([k, v]) => {
            const count = k === 'en_relance' ? relances.counts.total : (filterCounts[k] || 0);
            if (k === 'acomptes' && count === 0) return null;
            return (
              <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 ${filter === k ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={filter === k ? {background: couleur} : {}}>
                {k === 'acomptes' && <CreditCard size={11} />}
                {k === 'situations' && <BarChart3 size={11} />}
                {k === 'avoirs' && <RotateCcw size={11} />}
                {k === 'a_traiter' && <Bell size={11} />}
                {k === 'en_relance' && <BellRing size={11} />}
                {v}
                {count > 0 && <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full leading-none ${filter === k ? 'bg-white/20' : isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>{count}</span>}
              </button>
            );
          })}
          <span className={`text-[10px] ${textMuted} self-center ml-1 whitespace-nowrap shrink-0`}>{filtered.length} doc.</span>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {/* Header with gradient */}
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.3\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z\'/%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="relative">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                {filter === 'factures' ? <Receipt size={40} className="text-white" /> : <FileText size={40} className="text-white" />}
              </div>

              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>
                {search ? 'Aucun résultat' : filter === 'factures' ? 'Créez votre première facture' : filter === 'devis' ? 'Créez votre premier devis' : 'Commencez à facturer'}
              </h2>
              <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
                {search
                  ? 'Modifiez votre recherche ou créez un nouveau document.'
                  : 'Créez des devis professionnels, transformez-les en factures et suivez vos paiements.'}
              </p>
            </div>
          </div>

          {/* Features grid */}
          {!search && filter === 'all' && (
            <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Fonctionnalités</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Send size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Envoi rapide</p>
                    <p className={`text-xs ${textMuted}`}>Email, WhatsApp, PDF</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <CreditCard size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Acomptes</p>
                    <p className={`text-xs ${textMuted}`}>Factures d'acompte et solde</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <CheckCircle size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Suivi des paiements</p>
                    <p className={`text-xs ${textMuted}`}>Statuts et relances</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => { setEditingDevis(null); setShowDevisWizard(true); }} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                  <FileText size={18} />
                  Créer mon premier devis
                </button>
                <button onClick={() => { setMode('create'); setForm(p => ({...p, type: 'facture'})); }} className={`px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium border-2 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <Receipt size={18} />
                  Ou créer une facture
                </button>
              </div>
            </div>
          )}

          {/* Simple CTA for filtered empty state */}
          {(search || filter !== 'all') && (
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
              <button onClick={() => { setEditingDevis(null); setShowDevisWizard(true); }} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Plus size={18} />
                Créer un nouveau document
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'pipeline' ? (
        /* ========== PIPELINE VIEW (Kanban) ========== */
        <div>
          {/* Pipeline funnel bar */}
          {(() => {
            const pipelineStatuses = [
              { id: 'brouillon', label: 'Brouillon', color: '#94a3b8' },
              { id: 'envoye', label: 'Envoyé', color: '#3b82f6' },
              { id: 'accepte', label: 'Signé', color: '#10b981' },
              { id: 'facture', label: 'Facturé', color: '#8b5cf6' },
              { id: 'refuse', label: 'Refusé', color: '#ef4444' },
            ];
            const devisOnly = devis.filter(d => d.type === 'devis');
            const total = devisOnly.length || 1;
            const pipeline = pipelineStatuses.map(s => ({
              ...s,
              count: devisOnly.filter(d => s.id === 'accepte' ? ['accepte', 'signe', 'acompte_facture'].includes(d.statut) : s.id === 'envoye' ? ['envoye', 'vu'].includes(d.statut) : s.id === 'facture' ? d.statut === 'facture' : d.statut === s.id).length,
            })).map(s => ({ ...s, pct: Math.max((s.count / total) * 100, s.count > 0 ? 2 : 0) }));
            return (
              <div className="mb-4">
                <div className="flex rounded-full overflow-hidden h-2">
                  {pipeline.map(col => col.pct > 0 && (
                    <div key={col.id} title={`${col.label}: ${col.count}`} style={{ width: `${col.pct}%`, backgroundColor: col.color }} className="transition-all duration-300" />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {pipeline.filter(p => p.count > 0).map(p => (
                    <span key={p.id} className={`text-[10px] ${textMuted} flex items-center gap-1`}>
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                      {p.label} ({p.count})
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} /></div>}>
          <PipelineKanban
            devis={devis}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            setSelectedDevis={(d) => { setSelected(d); setMode('preview'); }}
            onUpdateDevis={onUpdate}
          />
        </Suspense>
        </div>
      ) : viewMode === 'table' ? (
        /* ========== TABLE VIEW ========== */
        <div className="relative">
          {/* Multi-select action bar */}
          {selectedIds.size > 0 && (
            <div className={`sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2 ${isDark ? 'bg-slate-700 border border-slate-600' : 'bg-slate-100 border border-slate-200'}`}>
              <span className={`text-sm font-semibold ${textPrimary}`}>{selectedIds.size} élément{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
              <div className="flex-1" />
              <button onClick={() => batchExportPDF(filtered.filter(d => selectedIds.has(d.id)))} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5" style={{ background: couleur }}>
                <Download size={13} /> Exporter PDF
              </button>
              {!isViewOnly && canPerform('devis', 'delete') && (
                <button onClick={async () => {
                  const ok = await confirm(`Supprimer ${selectedIds.size} document${selectedIds.size > 1 ? 's' : ''} ?`);
                  if (ok) {
                    for (const id of selectedIds) { onDelete(id); }
                    setSelectedIds(new Set());
                    showToast(`${selectedIds.size} document(s) supprimé(s)`, 'success');
                  }
                }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'bg-red-900/50 text-red-300 hover:bg-red-800/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button onClick={() => setSelectedIds(new Set())} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
                <X size={14} className={textMuted} />
              </button>
            </div>
          )}
        <div className={`${cardBg} rounded-xl border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className="px-2 py-2.5 w-8">
                    <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={() => toggleSelectAll(filtered)} className="rounded border-slate-300 cursor-pointer" />
                  </th>
                  {[
                    { key: 'numero', label: 'N°' },
                    { key: 'client', label: 'Client' },
                    { key: 'date', label: 'Date' },
                    { key: 'montant', label: 'Montant TTC' },
                    { key: 'statut', label: 'Statut' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleTableSort(col.key)}
                      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} ${col.key === 'montant' ? 'text-right' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {tableSortBy === col.key ? (
                          tableSortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : (
                          <ArrowUpDown size={10} className="opacity-30" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className={`px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {getTableSorted(filtered).map((d, idx) => {
                  const client = clients.find(c => c.id === d.client_id);
                  const clientName = cleanClientName(client) || d.client_nom || '—';
                  const statusColor = DEVIS_STATUS_COLORS[d.statut] || DEVIS_STATUS_COLORS.brouillon;
                  const statusLabel = d.statut === 'accepte' ? 'Signé' : (DEVIS_STATUS_LABELS[d.statut] || d.statut);
                  const isAvoirItem = d.facture_type === 'avoir';
                  const isAcompteRow = d.facture_type === 'acompte' || d.facture_type === 'solde';
                  const rowBorderColor = isAvoirItem ? '#f87171' : isAcompteRow ? '#8b5cf6' : d.type === 'facture' ? '#10b981' : couleur;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => { setSelected(d); setMode('preview'); if (d.statut === 'envoye' && d.type === 'devis') markAsViewed(d); }}
                      className={`cursor-pointer transition-colors ${isDark ? (idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50') : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      style={{ borderLeft: `4px solid ${rowBorderColor}` }}
                    >
                      <td className="px-2 py-2.5 w-8">
                        <input type="checkbox" checked={selectedIds.has(d.id)} onChange={(e) => { e.stopPropagation(); toggleSelectId(d.id); }} onClick={(e) => e.stopPropagation()} className="rounded border-slate-300 cursor-pointer" />
                      </td>
                      <td className={`px-3 py-2.5 font-medium text-xs whitespace-nowrap ${textPrimary}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {isAvoirItem ? <RotateCcw size={12} className="text-red-500" /> : d.type === 'facture' ? <Receipt size={12} className="text-violet-500" /> : <FileText size={12} style={{ color: couleur }} />}
                          {cleanNumero(d.numero)}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-xs truncate max-w-[180px] ${textSecondary}`}>
                        {clientName}
                      </td>
                      <td className={`px-3 py-2.5 text-xs whitespace-nowrap ${textMuted}`}>
                        {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap tabular-nums`} style={{ color: isAvoirItem ? '#dc2626' : couleur }}>
                        {!canViewPrices ? '—' : modeDiscret ? '···' : isAvoirItem ? `-${formatMoney(Math.abs(getDevisTTC(d)))}` : formatMoney(getDevisTTC(d))}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${isDark ? `${statusColor.darkBg} ${statusColor.darkText}` : `${statusColor.bg} ${statusColor.text}`}`}>
                            {statusLabel}
                          </span>
                          {d.statut === 'envoye' && (() => {
                            const sentDate = d.updated_at || d.date;
                            const daysSent = Math.floor((Date.now() - new Date(sentDate)) / 86400000);
                            if (daysSent <= 7) return null;
                            return (
                              <span className="text-[10px] text-amber-500 flex items-center gap-0.5 whitespace-nowrap">
                                <Clock size={10} /> J+{daysSent}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setSelected(d); setMode('preview'); }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Voir">
                            <Eye size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                          </button>
                          {!isViewOnly && canPerform('devis', 'edit') && (
                            <button onClick={(e) => { e.stopPropagation(); setEditingDevis(d); setShowDevisWizard(true); }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Modifier">
                              <Edit3 size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{filtered.map(d => {
          const client = clients.find(c => c.id === d.client_id);
          const hasAcompte = d.type === 'devis' && getAcompteFacture(d.id);
          const chantier = chantiers.find(ch => ch.id === d.chantier_id);
          const daysSince = Math.floor((Date.now() - new Date(d.date)) / 86400000);
          const statusColor = DEVIS_STATUS_COLORS[d.statut] || DEVIS_STATUS_COLORS.brouillon;
          const statusLabel = d.statut === 'accepte' ? 'Signé' : (DEVIS_STATUS_LABELS[d.statut] || d.statut);

          // Follow-up time indicator for sent devis
          const getFollowUpInfo = () => {
            if (!['envoye', 'vu'].includes(d.statut) || d.type !== 'devis') return null;
            const sentDate = d.updated_at || d.date;
            const daysSent = Math.floor((Date.now() - new Date(sentDate)) / 86400000);
            if (daysSent >= 30) return { text: `+${daysSent}j sans réponse`, cls: 'text-red-500 font-medium' };
            if (daysSent >= 14) return { text: `${daysSent}j sans réponse`, cls: 'text-red-500' };
            if (daysSent >= 7) return { text: `${daysSent}j en attente`, cls: isDark ? 'text-amber-400' : 'text-amber-600' };
            if (daysSent >= 3) return { text: `Envoyé il y a ${daysSent}j`, cls: textMuted };
            return { text: 'Envoyé récemment', cls: isDark ? 'text-emerald-400' : 'text-emerald-600' };
          };
          const followUp = getFollowUpInfo();

          // Left border color by document type
          const isAvoirItem = d.facture_type === 'avoir';
          const isSituationItem = d.facture_type === 'situation';
          const isAcompteItem = d.facture_type === 'acompte' || d.facture_type === 'solde';
          const borderLeftColor = isAvoirItem ? '#f87171'
            : isAcompteItem ? '#8b5cf6'
            : d.type === 'facture' ? '#10b981'
            : couleur;

          // Contextual CTAs by status — gated by RBAC permissions
          const getQuickAction = () => {
            if (isViewOnly) return null; // No actions for view-only roles
            if (d.statut === 'brouillon' && getDevisTTC(d) > 0 && canPerform('devis', 'send')) return { label: 'Envoyer', Icon: Send, cls: 'text-white', style: { background: couleur }, fn: (e) => { e.stopPropagation(); sendEmail(d); } };
            if (d.statut === 'brouillon' && getDevisTTC(d) <= 0 && canPerform('devis', 'edit')) return { label: 'Compléter', Icon: Edit3, cls: 'text-white', style: { background: couleur }, fn: (e) => { e.stopPropagation(); setSelected(d); setMode('preview'); } };
            if (['envoye', 'vu'].includes(d.statut) && canPerform('devis', 'send')) return { label: 'Relancer', Icon: Mail, cls: isDark ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white', fn: (e) => { e.stopPropagation(); sendEmail(d); } };
            if ((d.statut === 'accepte' || d.statut === 'signe') && d.type === 'devis') return { label: 'Facturer', Icon: Receipt, cls: 'bg-emerald-500 hover:bg-emerald-600 text-white', fn: (e) => { e.stopPropagation(); setSelected(d); setMode('preview'); } };
            if (d.type === 'facture' && d.statut !== 'payee') return { label: 'Encaisser', Icon: CreditCard, cls: 'text-white', style: { background: couleur }, fn: (e) => { e.stopPropagation(); setSelected(d); setMode('preview'); } };
            if (d.statut === 'refuse' && canPerform('devis', 'create')) return { label: 'Dupliquer', Icon: Copy, cls: isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600', fn: (e) => { e.stopPropagation(); duplicateDocument(d); } };
            if (d.statut === 'payee') return null;
            return null;
          };
          const qa = getQuickAction();

          // Client display
          const clientName = cleanClientName(client) || d.client_nom || '';
          const isOrphan = !d.client_id || (d.client_id && !client);
          const isNameless = client && !clientName;

          return (
            <div key={d.id} onClick={() => { setSelected(d); setMode('preview'); if (d.statut === 'envoye' && d.type === 'devis') markAsViewed(d); }} className={`${cardBg} rounded-xl border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden`}>
              {/* Status color bar at top */}
              <div className="h-[3px] w-full" style={{ backgroundColor: STATUS_BAR_COLORS[isExpired(d) ? 'expire' : d.statut] || '#94a3b8' }} />
              <div className="px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 0: Client name (prominent) + Amount TTC */}
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex-1 min-w-0">
                      {(isOrphan || isNameless) ? (
                        <span className="inline-flex items-center gap-1">
                          <span className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            {isOrphan ? 'Aucun client' : 'Client sans nom'}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setAssigningClientDevisId(d.id); }} className={`text-xs font-medium underline ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            Assigner
                          </button>
                        </span>
                      ) : (
                        <p className={`text-base font-semibold truncate ${textPrimary}`}>{clientName}</p>
                      )}
                    </div>
                    {/* Amount TTC aligned right — large */}
                    {!canViewPrices ? null : getDevisTTC(d) <= 0 ? (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-lg shrink-0 ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>0 €</span>
                    ) : (
                      <p className="text-lg font-bold text-right tabular-nums whitespace-nowrap shrink-0" style={{color: isAvoirItem ? '#dc2626' : couleur}}>
                        {isAvoirItem ? `-${formatMoney(Math.abs(getDevisTTC(d)))}` : formatMoney(getDevisTTC(d))}
                      </p>
                    )}
                  </div>
                  {/* Row 1: Numero (small, muted) + badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isAvoirItem ? <RotateCcw size={13} className="text-red-500 shrink-0" /> : isSituationItem ? <BarChart3 size={13} className="text-orange-500 shrink-0" /> : <span className={`text-xs shrink-0 ${d.type === 'facture' ? 'text-violet-500' : textMuted}`}>{d.type === 'facture' ? '📄' : '📋'}</span>}
                      <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{cleanNumero(d.numero)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? `${statusColor.darkBg} ${statusColor.darkText}` : `${statusColor.bg} ${statusColor.text}`}`}>{statusLabel}</span>
                      {isAvoirItem && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}>Avoir</span>}
                      {d.facture_type === 'situation' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>Situation{d.situation_numero ? ` n°${d.situation_numero}` : ''}</span>}
                      {hasAcompte && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>Acompte{d.acompte_pct ? ` ${d.acompte_pct}%` : ''}</span>}
                      {d.facture_type === 'acompte' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Acompte{d.acompte_pct ? ` ${d.acompte_pct}%` : ''}</span>}
                      {d.facture_type === 'solde' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>Solde</span>}
                      {d.is_avenant && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>AV{d.avenant_numero}</span>}
                      {isExpired(d) && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-200 text-red-700'}`}>Expiré</span>}
                      {d.statut === 'brouillon' && (isOrphan || isNameless) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>Incomplet</span>
                      )}
                      {(() => {
                        const docPending = relances.getDocumentPending(d.id);
                        if (!docPending) return null;
                        const stepLabel = docPending.nextStep?.step?.name || `J+${docPending.nextStep?.step?.delay || '?'}`;
                        return (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 ${
                            docPending.nextStep?.isDue
                              ? (isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700')
                              : (isDark ? 'bg-sky-900/50 text-sky-300' : 'bg-sky-100 text-sky-700')
                          }`}>
                            <BellRing size={9} />
                            {docPending.nextStep?.isDue ? stepLabel : `Auto ${stepLabel}`}
                          </span>
                        );
                      })()}
                      {d.statut === 'envoye' && (() => {
                        const sentDate = d.updated_at || d.date;
                        const daysSent = Math.floor((Date.now() - new Date(sentDate)) / 86400000);
                        if (daysSent <= 7) return null;
                        return (
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                            <Clock size={10} /> Relance J+{daysSent}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Row 2: Chantier · Date · Follow-up */}
                  <div className={`text-xs ${textMuted} truncate mt-0.5 flex items-center gap-1 flex-wrap`}>
                    {chantier && (
                      <>
                        <span className={`italic truncate max-w-[120px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{chantier.nom}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    {followUp && (
                      <>
                        <span>·</span>
                        <span className={`text-[10px] ${followUp.cls}`}>{followUp.text}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                  {d.signature_token && (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/devis/signer/${d.signature_token}`;
                      navigator.clipboard?.writeText(url).then(() => showToast('Lien copié !', 'success')).catch(() => showToast('Copie échouée', 'error'));
                    }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Copier le lien de signature">
                      <Link2 size={13} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                    </button>
                  )}
                  {qa ? (
                    <button onClick={qa.fn} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 min-h-[32px] transition-all ${qa.cls}`} style={qa.style}>
                      <qa.Icon size={13} />
                      <span className="hidden sm:inline">{qa.label}</span>
                    </button>
                  ) : d.statut === 'payee' ? (
                    <CheckCircle size={16} className="text-emerald-500" />
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); previewPDF(d); }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Aperçu PDF">
                      <Eye size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                    </button>
                  )}
                </div>
              </div>
              </div>
            </div>
          );
        })}</div>
      )}
      <Snackbar />

      {/* B1: Assign client dropdown modal */}
      {assigningClientDevisId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setAssigningClientDevisId(null)}>
          <div className={`${cardBg} border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`font-bold ${textPrimary}`}>Assigner un client</h3>
              <p className={`text-xs ${textMuted} mt-1`}>Sélectionnez le client pour ce devis</p>
            </div>
            <div className="p-3 max-h-64 overflow-y-auto space-y-1">
              {clients.filter(c => c.nom).map(c => (
                <button key={c.id} onClick={() => {
                  const d = devis.find(dv => dv.id === assigningClientDevisId);
                  if (d) {
                    onUpdate(d.id, { client_id: c.id, client_nom: `${c.prenom || ''} ${c.nom}`.trim() });
                    showToast(`Client "${`${c.prenom || ''} ${c.nom}`.trim()}" assigné`, 'success');
                  }
                  setAssigningClientDevisId(null);
                }} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: couleur }}>
                    {(c.prenom?.[0] || c.nom?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${textPrimary}`}>{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</p>
                    {c.entreprise && <p className={`text-xs truncate ${textMuted}`}>{c.entreprise}</p>}
                  </div>
                </button>
              ))}
              {clients.filter(c => c.nom).length === 0 && (
                <p className={`text-sm text-center py-4 ${textMuted}`}>Aucun client disponible</p>
              )}
            </div>
            <div className={`p-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <button onClick={() => setAssigningClientDevisId(null)} className={`w-full py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowPdfPreview(false)}>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-3 sm:p-4 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} flex items-center justify-between gap-2 flex-shrink-0`}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <FileText size={18} className="sm:w-5 sm:h-5" style={{ color: couleur }} />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-bold text-base sm:text-lg ${textPrimary} truncate`}>Aperçu du document</h2>
                  <p className={`text-xs sm:text-sm ${textMuted} hidden sm:block`}>Format A4 - Pret pour impression</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => tryDownload(selected, printPDF)}
                  className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-1.5 sm:gap-2 min-h-[44px] transition-colors text-sm"
                >
                  <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">Imprimer / PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                >
                  <X size={20} className={textPrimary} />
                </button>
              </div>
            </div>

            {/* PDF Content - Paper style */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
              <div
                className="bg-white shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm]"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                }}
              >
                <iframe
                  srcDoc={pdfContent}
                  className="w-full h-full min-h-[297mm] border-0"
                  title="Aperçu PDF"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        document={selected}
        client={selected ? clients.find(c => c.id === selected.client_id) : null}
        entreprise={entreprise}
        onPaymentCreated={handlePaymentCreated}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Save as Template Modal */}
      {showSaveTemplateModal && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className={`${cardBg} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                  <Star size={20} style={{ color: couleur }} />
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${textPrimary}`}>Sauvegarder comme modèle</h2>
                  <p className={`text-sm ${textMuted}`}>{(selected.lignes || []).length} lignes · {selected.numero}</p>
                </div>
              </div>
              <button onClick={() => setShowSaveTemplateModal(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <X size={20} className={textSecondary} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Nom du modèle</label>
                <input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder={selected.objet || selected.lignes?.[0]?.description || 'Mon modèle'}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  autoFocus
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Catégorie</label>
                <input
                  value={templateCategory}
                  onChange={e => setTemplateCategory(e.target.value)}
                  placeholder="ex: Plomberie, Électricité, Rénovation..."
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                />
              </div>
              <button
                onClick={async () => {
                  if (!templateName.trim()) return showToast('Donnez un nom au modèle', 'error');
                  await addTemplate({
                    nom: templateName.trim(),
                    categorie: templateCategory.trim() || 'Mes modèles',
                    description: `Créé depuis ${selected.numero}`,
                    lignes: (selected.lignes || []).map(l => ({
                      description: l.description,
                      quantite: l.quantite,
                      unite: l.unite,
                      prixUnitaire: Math.abs(l.prixUnitaire || 0),
                      prixAchat: l.prixAchat || 0,
                      tva: l.tva,
                    })),
                    tva_defaut: selected.tvaRate || 10,
                    notes: selected.notes || '',
                  });
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                  setTemplateCategory('Mes modèles');
                  showToast(`Modèle "${templateName}" sauvegardé`, 'success');
                }}
                disabled={!templateName.trim()}
                className="w-full py-3.5 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:shadow-lg"
                style={{ background: couleur }}
              >
                <Star size={16} /> Sauvegarder le modèle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
        customTemplates={ctxTemplates}
        onDeleteTemplate={(id) => {
          deleteCtxTemplate(id);
          showToast('Modèle supprimé', 'success');
        }}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Smart Template Wizard - 2-click devis creation */}
      <SmartTemplateWizard
        isOpen={showSmartWizard}
        onClose={() => setShowSmartWizard(false)}
        onCreateDevis={handleSmartDevisCreate}
        clients={clients}
        addClient={addClient}
        entreprise={entreprise}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Devis Wizard - uses extracted variable (shared with preview mode) */}
      {devisWizardElement}

      {/* Signature Pad Modal */}
      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSave}
        document={selected}
        client={selected ? clients.find(c => c.id === selected.client_id) : null}
        entreprise={entreprise}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Catalog Browser Modal */}
      <CatalogBrowser
        isOpen={showCatalogBrowser}
        onClose={() => setShowCatalogBrowser(false)}
        catalogue={catalogue}
        onSelectItem={(item) => {
          if (mode === 'create' && form.sections?.[0]?.id) {
            addLigne(item, form.sections[0].id);
          }
        }}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Devis Express Modal - New improved version with BTP templates */}
      <DevisExpressModal
        isOpen={showDevisExpressModal}
        onClose={() => setShowDevisExpressModal(false)}
        onCreateDevis={async (devisData) => {
          const numero = await generateNumero(devisData.type || 'devis');
          const client = clients.find(c => c.id === devisData.client_id);
          const newDevis = await onSubmit({
            ...devisData,
            numero,
            client_nom: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
          });
          if (newDevis?.id) {
            setSelected(newDevis);
            setMode('preview');
            showToast(`Devis ${numero} créé avec succès`, 'success');
          }
        }}
        clients={clients}
        addClient={addClient}
        isDark={isDark}
        couleur={couleur}
        tvaDefaut={entreprise?.tvaDefaut || 10}
        customTemplates={ctxTemplates}
        recentTemplates={enrichedRecentTemplates}
        onTrackUsage={trackTemplateUsage}
      />
    </div>
  );
}

// ── Devis Historique tab (extracted sub-component) ──
function DevisHistoriqueTab({ selected, facturesLiees, setSelected, isDark, couleur, modeDiscret, formatMoney, textPrimary, textMuted }) {
  const [auditEntries, setAuditEntries] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load audit history for this devis
  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getEntityHistory(isDemo ? null : supabase, 'devis', selected?.id, { limit: 50 })
      .then(entries => {
        if (!cancelled) setAuditEntries(entries);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [selected?.id]);

  // Build legacy events from devis data (creation, send, signature, factures)
  const legacyEntries = React.useMemo(() => {
    if (!selected) return [];
    const entries = [];

    entries.push({
      id: `legacy-created-${selected.id}`,
      entity_type: 'devis',
      entity_id: selected.id,
      action: 'created',
      changes: {},
      metadata: {},
      user_name: '',
      created_at: selected.created_at || selected.date,
    });

    if (selected.statut !== 'brouillon' && (selected.sent_at || selected.date !== (selected.created_at || selected.date))) {
      entries.push({
        id: `legacy-sent-${selected.id}`,
        entity_type: 'devis',
        entity_id: selected.id,
        action: 'sent',
        changes: {},
        metadata: {},
        user_name: '',
        created_at: selected.sent_at || selected.date,
      });
    }

    if (selected.signatureDate) {
      entries.push({
        id: `legacy-signed-${selected.id}`,
        entity_type: 'devis',
        entity_id: selected.id,
        action: 'signed',
        changes: {},
        metadata: { signataire: selected.signataire },
        user_name: selected.signataire || '',
        created_at: selected.signatureDate,
      });
    }

    facturesLiees.forEach(f => {
      entries.push({
        id: `legacy-facture-${f.id}`,
        entity_type: 'facture',
        entity_id: f.id,
        action: 'created',
        changes: {},
        metadata: { numero: f.numero, total_ttc: f.total_ttc, facture_type: f.facture_type, statut: f.statut },
        user_name: '',
        created_at: f.date || f.created_at,
      });
    });

    return entries;
  }, [selected, facturesLiees]);

  // Merge audit entries with legacy entries, deduplicate by timestamp proximity
  const mergedEntries = React.useMemo(() => {
    // If we have real audit entries, use them; append legacy facture entries
    if (auditEntries.length > 0) {
      const factureLegacy = legacyEntries.filter(e => e.entity_type === 'facture');
      const all = [...auditEntries, ...factureLegacy];
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return all;
    }

    // No audit entries yet — show legacy timeline
    legacyEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return legacyEntries;
  }, [auditEntries, legacyEntries]);

  return (
    <AuditTimeline
      entries={mergedEntries}
      isDark={isDark}
      couleur={couleur}
      modeDiscret={modeDiscret}
      isLoading={isLoading}
      emptyMessage="Aucun historique pour ce devis"
      showEntityBadge={true}
    />
  );
}
