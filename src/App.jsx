import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import supabase, { auth, isDemo } from './supabaseClient';

// Eager load critical components
import Dashboard from './components/Dashboard';
import FABMenu from './components/FABMenu';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import LandingPage from './components/landing/LandingPage';

// Stale bundle handler — auto-reload once when a chunk fails to load
const lazyWithRetry = (importFn, name) => lazy(() =>
  importFn().catch(err => {
    const msg = err?.message || '';
    const isStale = msg.includes('Failed to fetch') || msg.includes('ChunkLoadError') || msg.includes('Importing a module script failed');
    if (isStale) {
      const key = 'batigesti_chunk_reload';
      const last = sessionStorage.getItem(key);
      if (!last || Date.now() - parseInt(last, 10) > 30000) {
        console.warn(`[LAZY] Stale bundle for ${name}, reloading...`, msg);
        sessionStorage.setItem(key, Date.now().toString());
        // Clear SW caches to ensure fresh assets on reload
        if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
        window.location.reload();
      }
    }
    console.error(`[LAZY] Failed to load ${name}:`, err);
    return { default: () => <div style={{padding:'2rem',textAlign:'center',color:'#ef4444'}}>Erreur chargement {name}<br/><button onClick={() => window.location.reload()} style={{marginTop:'1rem',padding:'0.5rem 1rem',background:'#f97316',color:'white',borderRadius:'0.5rem',border:'none',cursor:'pointer'}}>Recharger</button></div> };
  })
);

// Lazy load heavy page components for code splitting
const Chantiers = lazyWithRetry(() => import('./components/Chantiers'), 'Chantiers');
const TasksAndPlanning = lazyWithRetry(() => import('./components/tasks/TasksAndPlanning'), 'Tâches');
const Clients = lazyWithRetry(() => import('./components/Clients'), 'Clients');
const DevisPage = lazyWithRetry(() => import('./components/DevisPage'), 'DevisPage');
const Equipe = lazyWithRetry(() => import('./components/Equipe'), 'Équipe');
const Catalogue = lazyWithRetry(() => import('./components/Catalogue'), 'Catalogue');
const Settings = lazyWithRetry(() => import('./components/Settings'), 'Paramètres');
const AdminHelp = lazyWithRetry(() => import('./components/admin-help/AdminHelp'), 'AdminHelp');
const DevisWizard = lazyWithRetry(() => import('./components/DevisWizard'), 'DevisWizard');
const QuickClientModal = lazyWithRetry(() => import('./components/QuickClientModal'), 'QuickClient');
const QuickChantierModal = lazyWithRetry(() => import('./components/QuickChantierModal'), 'QuickChantier');
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette'), 'CommandPalette');
const DesignSystemDemo = lazyWithRetry(() => import('./components/DesignSystemDemo'), 'DesignSystem');
const TresorerieModule = lazyWithRetry(() => import('./components/tresorerie/TresorerieModule'), 'Trésorerie');
const BibliothequeOuvrages = lazyWithRetry(() => import('./components/catalogue/BibliothequeOuvrages'), 'Bibliothèque');
const BibliothequePrix = lazyWithRetry(() => import('./components/bibliotheque/Bibliotheque'), 'BibliothèquePrix');
const SousTraitantsModule = lazyWithRetry(() => import('./components/soustraitants/SousTraitantsModule'), 'SousTraitants');
const CommandesFournisseurs = lazyWithRetry(() => import('./components/commandes/CommandesFournisseurs'), 'Commandes');
const IADevisAnalyse = lazyWithRetry(() => import('./components/ia/IADevisAnalyse'), 'IADevis');
const CarnetEntretien = lazyWithRetry(() => import('./components/entretien/CarnetEntretien'), 'CarnetEntretien');
const SignatureModule = lazyWithRetry(() => import('./components/signatures/SignatureModule'), 'Signatures');
const ExportComptable = lazyWithRetry(() => import('./components/export/ExportComptable'), 'ExportComptable');
const BillingDashboard = lazyWithRetry(() => import('./components/subscription/BillingDashboard'), 'Billing');
const PricingPage = lazyWithRetry(() => import('./components/subscription/PricingPage'), 'Pricing');
const CheckoutSuccess = lazyWithRetry(() => import('./components/subscription/CheckoutSuccess'), 'Checkout');
const AnalyticsPage = lazyWithRetry(() => import('./components/AnalyticsPage'), 'Analytique');
const ImportModal = lazyWithRetry(() => import('./components/ImportModal'), 'Import');
const LegalPages = lazyWithRetry(() => import('./components/LegalPages'), 'Legal');
const Changelog = lazyWithRetry(() => import('./components/Changelog'), 'Changelog');
const FinancesPage = lazyWithRetry(() => import('./components/FinancesPage'), 'Finances');
// MemosPage replaced by TasksAndPlanning
const ShortcutsHelp = lazyWithRetry(() => import('./components/ShortcutsHelp'), 'Raccourcis');
const PipelineKanban = lazyWithRetry(() => import('./components/pipeline/PipelineKanban'), 'Pipeline');
const AvisGoogle = lazyWithRetry(() => import('./components/avis/AvisGoogle'), 'AvisGoogle');
const ClientPortal = lazyWithRetry(() => import('./components/portal/ClientPortal'), 'ClientPortal');
const ChatPage = lazyWithRetry(() => import('./components/chat/ChatPage'), 'Messagerie');
const FormulairesPage = lazyWithRetry(() => import('./components/forms/FormulairesPage'), 'Formulaires');
const GarantiesDashboard = lazyWithRetry(() => import('./components/chantiers/GarantiesDashboard'), 'Garanties');
const ProfilePage = lazyWithRetry(() => import('./components/profil/ProfilePage'), 'Profil');
const PlanPage = lazyWithRetry(() => import('./components/profil/PlanPage'), 'Plan');
const AIChatBot = lazyWithRetry(() => import('./components/assistant/AIChatBot'), 'AIChatBot');
const SiteVitrine = lazyWithRetry(() => import('./components/site/SiteVitrine'), 'SiteVitrine');
import CookieConsent from './components/CookieConsent';
import CGUAcceptanceModal, { CGU_VERSION } from './components/CGUAcceptanceModal';
import { useConfirm, useToast } from './context/AppContext';
import { useData } from './context/DataContext';
import { useEntreprise } from './context/EntrepriseContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ConfirmModal } from './components/ui/Modal';
import ToastContainer from './components/ui/ToastContainer';
import ModalContainer from './components/ui/ModalContainer';
import UpgradeModal from './components/subscription/UpgradeModal';
import TrialBanner from './components/subscription/TrialBanner';
import FeatureGuard, { UpgradeBadge } from './components/subscription/FeatureGuard';
import { useSubscriptionStore, PAGE_FEATURE_MAP } from './stores/subscriptionStore';
import { usePermissions } from './hooks/usePermissions';
import { PermissionGate } from './components/ui/PermissionGate';
import { fetchSubscription, fetchUsage, computeLiveUsage } from './services/subscriptionsApi';
import { isDraftChantier } from './lib/utils';
import { Home, FileText, Building2, Calendar, Users, Package, HardHat, Settings as SettingsIcon, Eye, EyeOff, Sun, Moon, LogOut, Menu, Bell, Plus, ChevronRight, ChevronDown, BarChart3, HelpCircle, Search, X, CheckCircle, AlertCircle, Info, Clock, Receipt, Wifi, WifiOff, Palette, Wallet, Library, UserCheck, ShoppingCart, Camera, ClipboardList, ClipboardCheck, PenTool, Download, Share, Smartphone, CreditCard, Tag, Sparkles, Kanban, Star, User, MessageCircle, Shield, CalendarCheck, Megaphone, Globe } from 'lucide-react';
import { usePWA } from './hooks/usePWA';
import { registerNetworkListeners, getPendingCount, syncQueue, clearAllMutations, checkConnectivity } from './lib/offline/sync';
import OfflineIndicator from './components/ui/OfflineIndicator';
import EntrepriseSwitcher from './components/ui/EntrepriseSwitcher';

// Safe string renderer — prevents "Objects are not valid as React child" (#310)
const safeStr = (v, fallback = '') => {
  if (v == null) return fallback;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  if (typeof v === 'object') { return JSON.stringify(v); }
  return String(v);
};

// Theme classes helper — Linear-inspired palette
const getThemeClasses = (isDark) => ({
  card: isDark ? "bg-slate-800 border-slate-700/50" : "bg-white border-gray-200/70",
  cardHover: isDark ? "hover:bg-slate-700" : "hover:bg-[#f5f5f5]",
  input: isDark ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#ebebeb] text-[#1a1a1a] placeholder-[#999]",
  text: isDark ? "text-slate-100" : "text-[#1a1a1a]",
  textSecondary: isDark ? "text-slate-400" : "text-[#666]",
  textMuted: isDark ? "text-slate-500" : "text-[#999]",
  bg: isDark ? "bg-slate-900" : "bg-[#fafafa]",
  border: isDark ? "border-slate-700" : "border-[#ebebeb]",
});

export default function App() {
  // Global context hooks
  const { confirmModal, closeConfirm } = useConfirm();
  const { showToast, toast, hideToast } = useToast();

  // RBAC: organization role + permissions
  const { canAccess, canAccessBilling, role: userRole, loading: orgLoading, orgId } = usePermissions();

  // PWA install hook
  const { canInstall, install, isInstalled } = usePWA();

  // Data from DataContext (replaces local state)
  const {
    clients, setClients, addClient: dataAddClient, updateClient: dataUpdateClient, deleteClient: dataDeleteClient,
    devis, setDevis, addDevis: dataAddDevis, updateDevis: dataUpdateDevis, deleteDevis: dataDeleteDevis,
    chantiers, setChantiers, addChantier: dataAddChantier, updateChantier: dataUpdateChantier, deleteChantier: dataDeleteChantier,
    depenses, setDepenses, addDepense: dataAddDepense, updateDepense: dataUpdateDepense, deleteDepense: dataDeleteDepense,
    pointages, setPointages, addPointage: dataAddPointage, updatePointage: dataUpdatePointage, deletePointage: dataDeletePointage,
    equipe, setEquipe, addEmployee: dataAddEmployee, updateEmployee: dataUpdateEmployee, deleteEmployee: dataDeleteEmployee,
    ajustements, addAjustement: dataAddAjustement, deleteAjustement: dataDeleteAjustement,
    catalogue, setCatalogue, addCatalogueItem: dataAddCatalogueItem, updateCatalogueItem: dataUpdateCatalogueItem, deleteCatalogueItem: dataDeleteCatalogueItem, deductStock,
    paiements, addPaiement: dataAddPaiement,
    echanges, addEchange: dataAddEchange,
    ouvrages, setOuvrages, addOuvrage: dataAddOuvrage, updateOuvrage: dataUpdateOuvrage, deleteOuvrage: dataDeleteOuvrage,
    planningEvents, setPlanningEvents, addPlanningEvent: dataAddPlanningEvent, updatePlanningEvent: dataUpdatePlanningEvent, deletePlanningEvent: dataDeletePlanningEvent,
    memos, addMemo, updateMemo, deleteMemo, toggleMemo,
    getChantierBilan,
    generateNextNumero,
  } = useData();

  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignUp, setShowSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '' });
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state - persist page in localStorage to survive refresh
  const [page, setPageRaw] = useState(() => {
    try {
      const savedPage = localStorage.getItem('cp_current_page');
      return savedPage || 'dashboard';
    } catch { return 'dashboard'; }
  });
  const isPopstateNav = useRef(false);
  const setPage = useCallback((newPage) => {
    setPageRaw(prev => {
      if (prev === newPage) return prev;
      // If this navigation comes from back/forward button, don't push state
      if (!isPopstateNav.current) {
        try { window.history.pushState({ page: newPage }, '', ''); } catch {}
      }
      isPopstateNav.current = false;
      return newPage;
    });
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [createMode, setCreateMode] = useState({ devis: false, chantier: false, client: false });
  const [aiPrefill, setAiPrefill] = useState(null); // IA devis pre-fill data (stays local until user confirms)
  // Multi-entreprise context
  const {
    activeEntreprise,
    entrepriseId,
    hasMultiple: hasMultipleEntreprises,
    switchEntreprise,
    refreshEntreprises,
    updateEntreprise: ctxUpdateEntreprise,
    loading: entrepriseLoading,
  } = useEntreprise();

  // Entreprise defaults — fallback when context hasn't loaded yet
  const ENTREPRISE_DEFAULTS = {
    nom: 'BatiGesti', logo: '', couleur: '#f97316',
    formeJuridique: '', capital: '', adresse: '', codePostal: '', ville: '',
    tel: '', email: '', siteWeb: '', siret: '', codeApe: '', rcs: '',
    tvaIntra: '', validiteDevis: 30, tvaDefaut: 10, delaiPaiement: 30,
    acompteDefaut: 30, tauxFraisStructure: 15, iban: '', bic: '',
    cgv: '', mentionDevis: '', mentionFacture: '',
  };

  // entreprise: active entreprise from context, merged with defaults for safety
  const entreprise = useMemo(() => {
    if (!activeEntreprise) return ENTREPRISE_DEFAULTS;
    return { ...ENTREPRISE_DEFAULTS, ...activeEntreprise };
  }, [activeEntreprise]);

  // setEntreprise: backward-compat wrapper that updates via context
  const setEntreprise = useCallback((updater) => {
    const newVal = typeof updater === 'function' ? updater(entreprise) : updater;
    if (entrepriseId) {
      ctxUpdateEntreprise(entrepriseId, newVal);
    }
  }, [entreprise, entrepriseId, ctxUpdateEntreprise]);
  // Track which notification IDs have been read (persisted in localStorage)
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_read_notifs') || '[]'); } catch { return []; }
  });
  const [planningPrefill, setPlanningPrefill] = useState(null);

  // Dynamic notifications computed from real data
  const notifications = useMemo(() => {
    const now = new Date();
    const items = [];

    // Helper: relative date label
    const relDate = (d) => {
      const diff = Math.floor((now - new Date(d)) / 86400000);
      if (diff <= 0) return "Aujourd'hui";
      if (diff === 1) return 'Hier';
      return `Il y a ${diff} jours`;
    };

    // Helper: find client name
    const clientName = (clientId) => {
      const c = clients.find(cl => cl.id === clientId);
      return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : '';
    };

    // 1. Devis envoyés depuis >7 jours sans réponse
    (devis || []).forEach(d => {
      if ((d.statut === 'envoye' || d.statut === 'vu') && d.date) {
        const age = Math.floor((now - new Date(d.date)) / 86400000);
        if (age >= 7) {
          const cn = clientName(d.client_id);
          items.push({
            id: `devis-stale-${d.id}`,
            message: `${(d.numero || '').startsWith('FAC') ? 'Facture' : 'Devis'} ${d.numero || ''} envoyé${(d.numero || '').startsWith('FAC') ? 'e' : ''} à ${cn || 'un client'} depuis ${age} jours — à relancer`,
            date: relDate(d.date),
            type: 'warning',
            link: 'devis',
            itemId: d.id,
            itemType: 'devis',
            sortDate: new Date(d.date),
            priority: 2,
          });
        }
      }
    });

    // 2. Factures impayées >30 jours
    (devis || []).forEach(d => {
      if (d.type === 'facture' && d.statut !== 'payee' && d.statut !== 'paye' && d.statut !== 'refuse' && d.date) {
        const age = Math.floor((now - new Date(d.date)) / 86400000);
        if (age >= 30) {
          const cn = clientName(d.client_id);
          items.push({
            id: `facture-impayee-${d.id}`,
            message: `Facture ${d.numero || ''} impayée depuis ${age} jours${cn ? ` (${cn})` : ''} — ${new Intl.NumberFormat('fr-FR', {style:'currency',currency:'EUR'}).format(d.total_ttc || 0)}`,
            date: relDate(d.date),
            type: 'alert',
            link: 'devis',
            itemId: d.id,
            itemType: 'facture',
            sortDate: new Date(d.date),
            priority: 1,
          });
        }
      }
    });

    // 3. Devis récemment acceptés (last 7 days)
    (devis || []).forEach(d => {
      if ((d.statut === 'accepte' || d.statut === 'signe') && d.date) {
        const age = Math.floor((now - new Date(d.date)) / 86400000);
        if (age <= 7) {
          const cn = clientName(d.client_id);
          items.push({
            id: `devis-accepte-${d.id}`,
            message: `${(d.numero || '').startsWith('FAC') ? 'Facture' : 'Devis'} ${d.numero || ''} accepté${(d.numero || '').startsWith('FAC') ? 'e' : ''}${cn ? ` par ${cn}` : ''}`,
            date: relDate(d.date),
            type: 'success',
            link: 'devis',
            itemId: d.id,
            itemType: 'devis',
            sortDate: new Date(d.date),
            priority: 3,
          });
        }
      }
    });

    // 4. Chantiers en retard (date fin dépassée, pas terminé)
    (chantiers || []).forEach(ch => {
      if (ch.dateFin && ch.statut === 'en_cours') {
        const fin = new Date(ch.dateFin);
        if (fin < now) {
          const jours = Math.floor((now - fin) / 86400000);
          items.push({
            id: `chantier-retard-${ch.id}`,
            message: `Chantier "${ch.nom || 'Sans nom'}" en retard de ${jours} jour${jours > 1 ? 's' : ''}`,
            date: relDate(ch.dateFin),
            type: 'alert',
            link: 'chantiers',
            itemId: ch.id,
            itemType: 'chantier',
            sortDate: fin,
            priority: 1,
          });
        }
      }
    });

    // 5. Chantiers avec marge négative
    (chantiers || []).forEach(ch => {
      if (ch.statut === 'en_cours' && getChantierBilan) {
        const bilan = getChantierBilan(ch.id);
        if (bilan && bilan.margeBrute < 0) {
          items.push({
            id: `chantier-perte-${ch.id}`,
            message: `Chantier "${ch.nom || 'Sans nom'}" en perte (marge: ${new Intl.NumberFormat('fr-FR', {style:'currency',currency:'EUR'}).format(bilan.margeBrute)})`,
            date: 'Marge négative',
            type: 'alert',
            link: 'chantiers',
            itemId: ch.id,
            itemType: 'chantier',
            sortDate: now,
            priority: 1,
          });
        }
      }
    });

    // 6. Assurance expirée (RC Pro / Décennale)
    if (entreprise) {
      const checkInsurance = (field, label) => {
        const val = entreprise[field];
        if (val) {
          const exp = new Date(val);
          const daysLeft = Math.floor((exp - now) / 86400000);
          if (daysLeft < 0) {
            items.push({
              id: `insurance-expired-${field}`,
              message: `Assurance ${label} expirée depuis ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''} — à renouveler d'urgence`,
              date: relDate(val),
              type: 'alert',
              link: 'settings',
              sortDate: exp,
              priority: 1,
            });
          } else if (daysLeft <= 30) {
            items.push({
              id: `insurance-expiring-${field}`,
              message: `Assurance ${label} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
              date: `Dans ${daysLeft}j`,
              type: 'warning',
              link: 'settings',
              sortDate: exp,
              priority: 2,
            });
          }
        }
      };
      checkInsurance('rcProExpiration', 'RC Pro');
      checkInsurance('decennaleExpiration', 'Décennale');
    }

    // 7. Profil entreprise incomplet
    if (entreprise) {
      const required = ['nom', 'siret', 'adresse', 'tel', 'email'];
      const missing = required.filter(f => !entreprise[f] || entreprise[f].trim?.() === '');
      if (missing.length > 0) {
        items.push({
          id: 'profile-incomplete',
          message: `Profil entreprise incomplet (${missing.length} champ${missing.length > 1 ? 's' : ''} manquant${missing.length > 1 ? 's' : ''}: ${missing.join(', ')})`,
          date: '',
          type: 'info',
          link: 'settings',
          sortDate: new Date(0),
          priority: 4,
        });
      }
    }

    // 8. Chantier avec budget dépassé >90%
    (chantiers || []).forEach(ch => {
      if (ch.statut === 'en_cours' && ch.budget && ch.budget > 0 && getChantierBilan) {
        const bilan = getChantierBilan(ch.id);
        if (bilan) {
          const pct = (bilan.totalDepenses / ch.budget) * 100;
          if (pct >= 100) {
            items.push({
              id: `budget-depasse-${ch.id}`,
              message: `Budget dépassé sur "${ch.nom || 'Sans nom'}" (${Math.round(pct)}% consommé)`,
              date: 'Budget dépassé',
              type: 'alert',
              link: 'chantiers',
              itemId: ch.id,
              itemType: 'chantier',
              sortDate: now,
              priority: 1,
            });
          } else if (pct >= 90) {
            items.push({
              id: `budget-alerte-${ch.id}`,
              message: `Budget critique sur "${ch.nom || 'Sans nom'}" (${Math.round(pct)}% consommé)`,
              date: 'Alerte budget',
              type: 'warning',
              link: 'chantiers',
              itemId: ch.id,
              itemType: 'chantier',
              sortDate: now,
              priority: 2,
            });
          }
        }
      }
    });

    // Sort by priority (1=urgent) then date (newest first), limit to 20
    items.sort((a, b) => (a.priority - b.priority) || (b.sortDate - a.sortDate));
    return items.slice(0, 20).map(n => ({
      ...n,
      read: readNotifIds.includes(n.id),
    }));
  }, [devis, chantiers, clients, entreprise, getChantierBilan, readNotifIds]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFABDevisWizard, setShowFABDevisWizard] = useState(false);
  const [showFABQuickClient, setShowFABQuickClient] = useState(false);
  const [showFABQuickChantier, setShowFABQuickChantier] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true); // Optimistic: assume online, verify via ping
  const [pendingSync, setPendingSync] = useState(0);
  const [syncErrorDetails, setSyncErrorDetails] = useState(null); // { message, failedCount, permanentCount }
  const syncRetryTimerRef = useRef(null);
  const syncRetryAttemptRef = useRef(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !isDemo && !localStorage.getItem('batigesti_onboarding_complete'));
  const [showLanding, setShowLanding] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('clients');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Settings state (entreprise declared earlier, before notifications useMemo)
  const [theme, setTheme] = useState('light');
  const [modeDiscret, setModeDiscret] = useState(false);

  // CRUD wrappers with toasts (delegate to DataContext)
  const addClient = async (data) => { const c = await dataAddClient(data); showToast(`Client "${data.nom}" ajouté`, 'success'); return c; };
  const updateClient = async (id, data) => { await dataUpdateClient(id, data); showToast(`Client "${data.nom || 'mis à jour'}" modifié`, 'success'); };
  const deleteClient = async (id) => { await dataDeleteClient(id); showToast('Client supprimé', 'success'); };
  const addDevis = async (data) => { const d = await dataAddDevis(data); showToast(`${data.type === 'facture' ? 'Facture' : 'Devis'} créé`, 'success'); return d; };
  const updateDevis = async (id, data) => { await dataUpdateDevis(id, data); showToast('Document mis à jour', 'success'); };
  const deleteDevis = (id) => { dataDeleteDevis(id); showToast('Document supprimé', 'info'); };
  const addChantier = async (data) => { const c = await dataAddChantier(data); showToast(`Chantier "${data.nom}" créé`, 'success'); return c; };
  const updateChantier = (id, data) => { dataUpdateChantier(id, data); showToast('Chantier mis à jour', 'success'); };
  const addAjustement = (data) => { const a = dataAddAjustement(data); showToast('Ajustement enregistré', 'success'); return a; };
  const deleteAjustement = (id) => { dataDeleteAjustement(id); showToast('Ajustement supprimé', 'info'); };
  const addEchange = (data) => { const e = dataAddEchange(data); showToast('Échange ajouté', 'success'); return e; };
  const addPaiement = (data) => { const p = dataAddPaiement(data); showToast(`Paiement de ${(data.amount || 0).toLocaleString('fr-FR')} EUR enregistré`, 'success'); return p; };
  const addEmployee = async (data) => { const e = await dataAddEmployee(data); showToast(`Employé "${data.prenom || ''} ${data.nom || ''}" ajouté`, 'success'); return e; };
  const updateEmployee = async (id, data) => { await dataUpdateEmployee(id, data); };
  const deleteEmployee = async (id) => { await dataDeleteEmployee(id); showToast('Employé supprimé', 'success'); };
  const addPointage = async (data) => { const p = await dataAddPointage(data); return p; };
  const addCatalogueItem = async (data) => { const c = await dataAddCatalogueItem(data); showToast('Article ajouté au catalogue', 'success'); return c; };
  const updateCatalogueItem = async (id, data) => { await dataUpdateCatalogueItem(id, data); };
  const deleteCatalogueItem = async (id) => { await dataDeleteCatalogueItem(id); showToast('Article supprimé du catalogue', 'success'); };
  const addEvent = async (data) => { const e = await dataAddPlanningEvent(data); showToast('Événement ajouté', 'success'); return e; };
  const updateEvent = async (id, data) => { await dataUpdatePlanningEvent(id, data); };
  const deleteEvent = async (id) => { await dataDeletePlanningEvent(id); showToast('Événement supprimé', 'info'); };

  // Cancel any pending retry timer
  const cancelSyncRetry = useCallback(() => {
    if (syncRetryTimerRef.current) {
      clearTimeout(syncRetryTimerRef.current);
      syncRetryTimerRef.current = null;
    }
  }, []);

  // Schedule an auto-retry with exponential backoff
  const scheduleSyncRetry = useCallback(() => {
    cancelSyncRetry();
    const attempt = syncRetryAttemptRef.current;
    if (attempt >= 3) return; // Stop after 3 auto-retries

    const delay = Math.min(5000 * Math.pow(2, attempt), 60000); // 5s, 10s, 20s (max 60s)
    console.log(`[Sync] Auto-retry #${attempt + 1} scheduled in ${delay / 1000}s`);
    syncRetryTimerRef.current = setTimeout(() => {
      syncRetryTimerRef.current = null;
      syncRetryAttemptRef.current = attempt + 1;
      handleManualSync().catch(err => console.warn('Auto-retry sync failed:', err));
    }, delay);
  }, []);

  // Manual sync handler for offline queue
  const handleManualSync = async () => {
    try {
      // In demo mode, just clear the queue — no Supabase to sync to
      if (isDemo) {
        await clearAllMutations();
        setPendingSync(0);
        setSyncErrorDetails(null);
        return;
      }

      const results = await syncQueue({
        clients: { create: dataAddClient, update: dataUpdateClient, delete: dataDeleteClient },
        devis: { create: dataAddDevis, update: dataUpdateDevis, delete: dataDeleteDevis },
        chantiers: { create: dataAddChantier, update: dataUpdateChantier, delete: dataDeleteChantier },
        depenses: { create: dataAddDepense, update: dataUpdateDepense, delete: dataDeleteDepense },
        pointages: { create: dataAddPointage, update: dataUpdatePointage, delete: dataDeletePointage },
        equipe: { create: dataAddEmployee, update: dataUpdateEmployee, delete: dataDeleteEmployee },
        catalogue: { create: dataAddCatalogueItem, update: dataUpdateCatalogueItem, delete: dataDeleteCatalogueItem },
      });

      // Always refresh counter after sync
      const count = await getPendingCount();
      setPendingSync(count);

      if (results.success > 0) {
        showToast(`${results.success} modification${results.success > 1 ? 's' : ''} synchronisée${results.success > 1 ? 's' : ''}`, 'success');
      }

      // Show specific info about cleared/rejected mutations
      const permanentErrors = results.errors?.filter(e => e.permanent) || [];
      if (permanentErrors.length > 0) {
        showToast(`${permanentErrors.length} modification${permanentErrors.length > 1 ? 's' : ''} rejetée${permanentErrors.length > 1 ? 's' : ''} et supprimée${permanentErrors.length > 1 ? 's' : ''}`, 'info');
      } else if (results.cleared > 0 && results.success === 0 && results.failed === 0) {
        showToast('File d\'attente nettoyée', 'info');
      }

      if (results.failed > 0) {
        // Build error detail message from the failed mutations
        const transientErrors = results.errors?.filter(e => !e.permanent) || [];
        const errorEntities = [...new Set(transientErrors.map(e => e.mutation?.entity).filter(Boolean))];
        const entityLabel = errorEntities.length > 0 ? ` (${errorEntities.join(', ')})` : '';
        const lastError = transientErrors[0]?.error || '';

        setSyncErrorDetails({
          message: lastError
            ? `Impossible de sauvegarder${entityLabel}. ${lastError.length > 80 ? lastError.slice(0, 80) + '…' : lastError}`
            : `Impossible de sauvegarder vos modifications${entityLabel}. Vérifiez votre connexion.`,
          failedCount: results.failed,
          permanentCount: permanentErrors.length,
        });

        showToast(`${results.failed} modification${results.failed > 1 ? 's' : ''} en échec — nouvelle tentative automatique`, 'error');

        // Schedule auto-retry with backoff
        scheduleSyncRetry();
      } else {
        // All succeeded or cleared — reset retry state
        setSyncErrorDetails(null);
        syncRetryAttemptRef.current = 0;
        cancelSyncRetry();
      }

      // If everything was processed (success + cleared) and nothing is left, ensure counter is 0
      if (count === 0 && (results.success > 0 || results.cleared > 0)) {
        setPendingSync(0);
        setSyncErrorDetails(null);
        syncRetryAttemptRef.current = 0;
        cancelSyncRetry();
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncErrorDetails({
        message: `Erreur de synchronisation : ${error.message || 'Vérifiez votre connexion.'}`,
        failedCount: 0,
        permanentCount: 0,
      });
      showToast('Erreur de synchronisation', 'error');
      // Schedule auto-retry
      scheduleSyncRetry();
      // Still try to refresh the counter even on error
      try {
        const count = await getPendingCount();
        setPendingSync(count);
      } catch { /* ignore */ }
    }
  };

  // Load UI settings from localStorage (entreprise is now managed by EntrepriseContext)
  useEffect(() => {
    try {
      const t = localStorage.getItem('cp_theme'); if (t) setTheme(t);
      const m = localStorage.getItem('cp_mode_discret'); if (m) setModeDiscret(JSON.parse(m));
    } catch (err) { console.warn('Failed to load settings from localStorage:', err.message); }
  }, []);

  // Keep localStorage cache of entreprise in sync (for offline/legacy compat)
  useEffect(() => {
    if (activeEntreprise) {
      try { localStorage.setItem('cp_entreprise', JSON.stringify(entreprise)); } catch {}
    }
  }, [entreprise, activeEntreprise]);
  useEffect(() => { try { localStorage.setItem('cp_theme', theme); } catch (e) { console.warn('Failed to save theme:', e.message); } }, [theme]);
  useEffect(() => { try { localStorage.setItem('cp_mode_discret', JSON.stringify(modeDiscret)); } catch (e) { console.warn('Failed to save modeDiscret:', e.message); } }, [modeDiscret]);
  useEffect(() => {
    console.log('[NAV] page changed to:', page);
    try { localStorage.setItem('cp_current_page', page); } catch (e) { console.warn('Failed to save page:', e.message); }
  }, [page]);

  // Browser history: support back/forward buttons in this SPA
  useEffect(() => {
    // Set initial history state so back button has something to go to
    try { window.history.replaceState({ page }, '', ''); } catch {}

    const handlePopstate = (event) => {
      const target = event.state?.page;
      if (target) {
        isPopstateNav.current = true;
        setPage(target);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // RBAC: redirect to dashboard if user accesses a restricted page
  useEffect(() => {
    if (orgLoading) return; // Wait for org resolution
    const publicPages = ['dashboard', 'profil', 'plan', 'pricing', 'checkout-success', 'cgv', 'cgu', 'confidentialite', 'mentions-legales', 'changelog', 'design-system'];
    // Billing is restricted to owner only
    if ((page === 'billing') && !canAccessBilling) {
      console.log('[RBAC] Billing restricted to owner, redirecting → dashboard');
      setPage('dashboard');
      return;
    }
    if (!publicPages.includes(page) && !canAccess(page)) {
      console.log('[RBAC] Redirecting from restricted page:', page, '→ dashboard');
      setPage('dashboard');
    }
  }, [page, canAccess, canAccessBilling, orgLoading]);

  // Bank callback handler - detect /bank/callback?ref=xxx and process
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (path === '/bank/callback' && ref) {
      window.history.replaceState({}, '', '/');
      setPage('finances');
      showToast('Vérification de la connexion bancaire...', 'info');
      import('./lib/integrations/saltedge').then(async ({ checkConnection, syncTransactions }) => {
        try {
          const result = await checkConnection(ref);
          if (result.status === 'linked') {
            console.log('[BANK] Connection successful:', result.details);
            showToast('Compte bancaire connecté ! Synchronisation en cours...', 'success');
            // Auto-sync transactions after successful connection
            try {
              await syncTransactions();
              showToast('Transactions synchronisées avec succès', 'success');
            } catch (syncErr) {
              console.warn('[BANK] Auto-sync failed (can retry manually):', syncErr);
            }
          } else {
            showToast('Connexion bancaire en attente — veuillez réessayer', 'warning');
          }
        } catch (e) {
          console.error('[BANK] Callback error:', e);
          showToast('Erreur lors de la connexion bancaire', 'error');
        }
      });
    }
  }, []);

  // Auth state listener - persists session across page refreshes
  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const u = await auth.getCurrentUser();
        setUser(u);
      } catch (e) { console.warn('Auth check failed:', e.message); }
      finally { setLoading(false); }
    };
    checkAuth();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Initialize subscription store — fetch plan + usage on mount
  const setSubscriptionData = useSubscriptionStore((s) => s.setSubscription);
  const setUsageData = useSubscriptionStore((s) => s.setUsage);
  const subStoreLoading = useSubscriptionStore((s) => s.loading);

  useEffect(() => {
    let cancelled = false;
    const initSubscription = async () => {
      try {
        const { data: subData } = await fetchSubscription(orgId);
        if (!cancelled && subData) setSubscriptionData(subData);
        const { data: usageData } = await fetchUsage();
        if (!cancelled && usageData) setUsageData(usageData);
      } catch (err) {
        console.warn('Subscription init error:', err?.message || err);
      }
    };
    if (user) initSubscription();
    return () => { cancelled = true; };
  }, [user, orgId, setSubscriptionData, setUsageData]);

  // Handle ?billing=success redirect from Stripe Checkout
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('billing') === 'success') {
        setPage('checkout-success');
        // Clean URL without reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) { console.warn('URL param check failed:', e.message); }
  }, []);

  // Listen for storage-based page navigation (used by UpgradeModal "Voir tous les plans")
  useEffect(() => {
    const handleStorage = () => {
      try {
        const p = localStorage.getItem('cp_current_page');
        if (p && p !== page) setPage(p);
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [page]);

  // Redirect legacy page IDs to new consolidated pages
  // Must depend on [page] so redirects fire whenever page changes (not just on mount)
  useEffect(() => {
    const REDIRECTS = {
      ouvrages: 'bibliotheque', commandes: 'chantiers',
      tresorerie: 'finances', entretien: 'dashboard',
      signatures: 'devis', export: 'finances', analytique: 'finances',
      admin: 'settings', rentabilite: 'settings',
      pricing: 'profil', billing: 'profil',
    };
    if (REDIRECTS[page]) setPage(REDIRECTS[page]);
  }, [page]);

  // Keep usage in sync with live data counts
  useEffect(() => {
    const liveUsage = computeLiveUsage({ clients, devis, chantiers, equipe });
    setUsageData(liveUsage);
  }, [clients.length, devis.length, chantiers.length, equipe.length, setUsageData]);

  const stats = {
    devisAttente: devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length,
    chantiersEnCours: chantiers.filter(c => c.statut === 'en_cours' && !isDraftChantier(c)).length
  };

  // Auth handlers
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      const { error } = await auth.signIn(authForm.email, authForm.password);
      if (error) setAuthError(error.message);
    } catch (e) {
      setAuthError('Erreur de connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      const { error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom });
      if (error) setAuthError(error.message);
      else { showToast('Compte créé ✓', 'success'); setShowSignUp(false); }
    } catch (e) {
      setAuthError('Erreur lors de la création du compte');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSignOut = async () => {
    try { await auth.signOut(); } catch (e) { console.warn('Sign out error:', e.message); }
    setUser(null);
  };
  
  const markNotifRead = (id) => {
    setReadNotifIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try { localStorage.setItem('cp_read_notifs', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const markAllNotifsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(prev => {
      const next = [...new Set([...prev, ...allIds])];
      try { localStorage.setItem('cp_read_notifs', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Global search results
  const searchResults = searchQuery.length > 1 ? {
    clients: clients.filter(c =>
      `${c.nom} ${c.prenom} ${c.email} ${c.telephone}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3),
    chantiers: chantiers.filter(c =>
      `${c.nom} ${c.adresse}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3),
    devis: devis.filter(d =>
      `${d.numero} ${clients.find(c => c.id === d.client_id)?.nom || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3)
  } : { clients: [], chantiers: [], devis: [] };

  const hasSearchResults = searchResults.clients.length > 0 || searchResults.chantiers.length > 0 || searchResults.devis.length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      const target = e.target;
      const tagName = target.tagName.toLowerCase();
      const isInput = ['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable;

      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      // Cmd/Ctrl + D for new devis
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isInput) {
        e.preventDefault();
        setShowFABDevisWizard(true);
        return;
      }

      // Cmd/Ctrl + H for new chantier
      if ((e.metaKey || e.ctrlKey) && e.key === 'h' && !isInput) {
        e.preventDefault();
        setShowFABQuickChantier(true);
        return;
      }

      // Cmd/Ctrl + N for new client
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !isInput) {
        e.preventDefault();
        setShowFABQuickClient(true);
        return;
      }

      // Cmd/Ctrl + M for memos
      if ((e.metaKey || e.ctrlKey) && e.key === 'm' && !isInput) {
        e.preventDefault();
        setPage('tasks');
        return;
      }

      // ? key (without Cmd) or ⌘/ to show shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !isInput) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && !isInput) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Escape to close modals/overlays
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowQuickAdd(false);
        setShowNotifs(false);
        setShowFABDevisWizard(false);
        setShowFABQuickClient(false);
        setShowFABQuickChantier(false);
        setShowShortcuts(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic page title for accessibility
  useEffect(() => {
    const PAGE_TITLES = {
      dashboard: 'Accueil',
      profil: 'Mon Profil',
      plan: 'Mon Plan',
      devis: 'Devis & Factures',
      chantiers: 'Chantiers',
      clients: 'Clients',
      tasks: 'Tâches & Planning',
      planning: 'Tâches & Planning',
      memos: 'Tâches & Planning',
      equipe: 'Équipe',
      catalogue: 'Catalogue',
      finances: 'Finances',
      analytique: 'Analytique',
      settings: 'Paramètres',
      pricing: 'Tarifs',
      billing: 'Abonnement',
      changelog: 'Changelog',
      soustraitants: 'Sous-traitants',
      commandes: 'Commandes',
      tresorerie: 'Trésorerie',
      'ia-devis': 'IA Devis',
      entretien: "Carnet d'entretien",
      signatures: 'Signatures',
      export: 'Export comptable',
      ouvrages: "Bibliothèque d'ouvrages",
      admin: 'Administration',
      'design-system': 'Design System',
      'bibliotheque': 'Bibliothèque',
      'pipeline': 'Pipeline',
      'site-web': 'Site web',
      'formulaires': 'Formulaires',
      'contrats': 'Contrats',
      cgv: 'CGV',
      cgu: 'CGU',
      confidentialite: 'Confidentialité',
      'mentions-legales': 'Mentions légales',
      'checkout-success': 'Paiement confirmé',
      messagerie: 'Messagerie',
      garanties: 'Garanties',
      'avis-google': 'Marketing',
    };
    const title = PAGE_TITLES[page] || page.charAt(0).toUpperCase() + page.slice(1);
    document.title = `${title} — BatiGesti`;
  }, [page]);

  // Network status listener for offline mode
  useEffect(() => {
    const updatePendingCount = async () => {
      // In demo mode, clear any stale mutations and set count to 0
      if (isDemo) {
        await clearAllMutations();
        setPendingSync(0);
        return;
      }
      const count = await getPendingCount();
      setPendingSync(count);
    };

    const unsubscribe = registerNetworkListeners(
      () => {
        setIsOnline(true);
        updatePendingCount();
        showToast('Connexion rétablie', 'success');
        // Auto-sync pending mutations when back online
        handleManualSync().catch(err => console.warn('Auto-sync failed:', err));
      },
      () => {
        setIsOnline(false);
        showToast('Mode hors ligne activé', 'info');
      }
    );

    updatePendingCount();
    return unsubscribe;
  }, []);

  // Notifications are now computed via useMemo (see above) — no useEffect needed

  // Loading screen
  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <Building2 size={48} className="text-orange-500 animate-bounce" />
    </div>
  );

  const isDark = theme === 'dark';
  const tc = getThemeClasses(isDark);

  // Client Portal — public page accessible via token (no auth required)
  // Detect portal token from URL: /portal/{token} or ?portal={token}
  const portalToken = useMemo(() => {
    try {
      const path = window.location.pathname;
      const portalMatch = path.match(/^\/portal\/([a-zA-Z0-9_-]+)/);
      if (portalMatch) return portalMatch[1];
      const params = new URLSearchParams(window.location.search);
      return params.get('portal') || null;
    } catch { return null; }
  }, []);

  if (page === 'client-portal' || portalToken) return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center"><Building2 size={48} className="text-orange-500 animate-bounce" /></div>}>
      <ClientPortal token={portalToken || 'demo'} />
    </Suspense>
  );

  // Legal / public pages (accessible without auth)
  const publicPages = ['cgv', 'cgu', 'confidentialite', 'mentions-legales', 'changelog'];
  if (!user && !isDemo && publicPages.includes(page)) return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center"><Building2 size={48} className="text-orange-500 animate-bounce" /></div>}>
      <div className="min-h-screen bg-[#f5f5f5] p-4 sm:p-6">
        {page === 'changelog'
          ? <Changelog isDark={false} couleur={entreprise.couleur || '#f97316'} setPage={(p) => { setPage(p); if (!publicPages.includes(p)) setShowLanding(true); }} />
          : <LegalPages page={page} isDark={false} couleur={entreprise.couleur || '#f97316'} setPage={(p) => { setPage(p); if (!publicPages.includes(p)) setShowLanding(true); }} />
        }
      </div>
      <CookieConsent isDark={false} couleur={entreprise.couleur || '#f97316'} />
    </Suspense>
  );

  // Landing Page (for unauthenticated visitors before they click login)
  if (!user && !isDemo && showLanding) return (
    <>
      <LandingPage
        couleur={entreprise.couleur || '#f97316'}
        onLogin={() => setShowLanding(false)}
        onSignup={() => { setShowLanding(false); setShowSignUp(true); }}
        onNavigate={(p) => { setPage(p); setShowLanding(false); }}
      />
      <CookieConsent isDark={false} couleur={entreprise.couleur || '#f97316'} />
    </>
  );

  // Login Page
  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left - Hero */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-amber-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="max-w-lg">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">BatiGesti</h1>
            <p className="text-2xl text-white/90 mb-8">Pilotez votre rentabilité</p>
            <div className="space-y-6">
              {[
                { icon: BarChart3, text: 'Marge temps réel' },
                { icon: Users, text: 'Gestion équipe' },
                { icon: FileText, text: 'Devis & Factures' },
                { icon: Calendar, text: 'Planning' }
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-4 text-white/90">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <f.icon size={20} />
                  </div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">BatiGesti</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">{showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="text-slate-500 mb-8">{showSignUp ? 'Commencez gratuitement' : 'Accédez à votre espace'}</p>
          
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && (
              <input
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Nom entreprise"
                value={authForm.nom}
                onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))}
                aria-label="Nom de l'entreprise"
                autoComplete="organization"
              />
            )}
            <input
              type="email"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              placeholder="Email"
              value={authForm.email}
              onChange={e => setAuthForm(p => ({...p, email: e.target.value}))}
              required
              aria-label="Adresse email"
              autoComplete="email"
            />
            <div>
              <input
                type="password"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Mot de passe"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({...p, password: e.target.value}))}
                required
                aria-label="Mot de passe"
                autoComplete={showSignUp ? "new-password" : "current-password"}
              />
              {!showSignUp && (
                <button
                  type="button"
                  onClick={() => showToast('Contactez support@batigesti.fr', 'info')}
                  className="text-sm text-slate-500 hover:text-orange-400 mt-2 transition-colors self-end"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            {authError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                {safeStr(authError)}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{showSignUp ? 'Création...' : 'Connexion...'}</span>
                </>
              ) : (
                showSignUp ? 'Créer mon compte' : 'Se connecter'
              )}
            </button>
          </form>
          
          <p className="text-center text-slate-500 mt-6">
            {showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}{' '}
            <button onClick={() => setShowSignUp(!showSignUp)} className="text-orange-500 hover:text-orange-400 font-medium">
              {showSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // Calculate stats for badges
  const facturesImpayees = devis.filter(d => d.type === 'facture' && !['payee', 'brouillon'].includes(d.statut)).length;
  const devisEnAttenteCount = devis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length;
  const todayEvents = planningEvents.filter(e => e.date === new Date().toISOString().split('T')[0]).length;
  const memosOverdueCount = memos.filter(m => !m.is_done && m.due_date && m.due_date < new Date().toISOString().split('T')[0]).length;

  // Navigation items - full sidebar with all sections
  // Badges now include explicit context for clarity
  // Simplified sidebar: 7 core modules + settings (was 18 items)
  // Filtered by role-based permissions (RBAC Phase 3)
  const allNav = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    {
      id: 'devis',
      icon: FileText,
      label: 'Devis & Factures',
      badge: stats.devisAttente + facturesImpayees,
      badgeColor: facturesImpayees > 0 ? '#ef4444' : '#f97316',
      badgeTitle: facturesImpayees > 0
        ? `${facturesImpayees} facture${facturesImpayees > 1 ? 's' : ''} impayée${facturesImpayees > 1 ? 's' : ''}, ${devisEnAttenteCount} devis en attente`
        : `${devisEnAttenteCount} devis en attente de réponse`
    },
    {
      id: 'chantiers',
      icon: Building2,
      label: 'Chantiers',
      badge: stats.chantiersEnCours,
      badgeColor: '#22c55e',
      badgeTitle: `${stats.chantiersEnCours} chantier${stats.chantiersEnCours > 1 ? 's' : ''} en cours`
    },
    { id: 'clients', icon: Users, label: 'Clients' },
    {
      id: 'tasks',
      icon: CalendarCheck,
      label: 'Tâches & Planning',
      badge: (memosOverdueCount || 0) + (todayEvents || 0),
      badgeColor: memosOverdueCount > 0 ? '#ef4444' : '#3b82f6',
      badgeTitle: [
        memosOverdueCount > 0 ? `${memosOverdueCount} tâche${memosOverdueCount > 1 ? 's' : ''} en retard` : '',
        todayEvents > 0 ? `${todayEvents} événement${todayEvents > 1 ? 's' : ''} aujourd'hui` : '',
      ].filter(Boolean).join(' · ')
    },
    { id: 'messagerie', icon: MessageCircle, label: 'Messagerie' },
    { id: 'formulaires', icon: ClipboardCheck, label: 'Formulaires' },
    { id: 'equipe', icon: HardHat, label: 'Équipe' },
    { id: 'bibliotheque', icon: Library, label: 'Bibliothèque' },
    { id: 'catalogue', icon: Package, label: 'Catalogue' },
    { id: 'avis-google', icon: Megaphone, label: 'Marketing', feature: 'avis_google' },
    { id: 'site-web', icon: Globe, label: 'Site web' },
    { id: 'finances', icon: Wallet, label: 'Finances' },
    { id: 'plan', icon: CreditCard, label: 'Mon plan' },
    (() => {
      // Compute Facture 2026 compliance score for badge
      const f26checks = [
        entreprise.siret, entreprise.tvaIntra,
        entreprise.rcsVille && entreprise.rcsNumero,
        entreprise.banque || entreprise.iban,
        entreprise.adresse, entreprise.rcProAssureur, true, // Factur-X always true
      ];
      const f26score = Math.round((f26checks.filter(Boolean).length / f26checks.length) * 100);
      // Also check profile completeness
      const profileFields = ['nom', 'adresse', 'siret', 'tel', 'email'];
      const profileFilled = profileFields.filter(k => entreprise[k] && String(entreprise[k]).trim()).length;
      const profileScore = Math.round((profileFilled / profileFields.length) * 100);
      const showBadge = f26score < 100 || profileScore < 100;
      const missingFieldsCount = f26checks.filter(c => !c).length + profileFields.filter(k => !entreprise[k] || !String(entreprise[k]).trim()).length;
      return {
        id: 'settings', icon: SettingsIcon, label: 'Param\u00e8tres',
        badge: showBadge ? (missingFieldsCount || 1) : 0,
        badgeColor: f26score < 50 ? '#ef4444' : f26score < 100 ? '#f59e0b' : undefined,
        badgeTitle: f26score < 100
          ? `Conformit\u00e9 Facture 2026 : ${f26score}% — ${missingFieldsCount} champ${missingFieldsCount > 1 ? 's' : ''} manquant${missingFieldsCount > 1 ? 's' : ''}`
          : `Profil : ${profileScore}%`
      };
    })(),
  ];
  // Filter nav by role-based permissions (RBAC)
  const nav = allNav.filter(item => canAccess(item.id));
  const couleur = entreprise.couleur || '#f97316';
  const unreadNotifs = notifications.filter(n => !n.read);

  // LEGAL-001: CGU acceptance check — block app until accepted or when version changes
  // Wait for entreprise context to finish loading before showing modal
  const needsCguAcceptance = !isDemo && user && entrepriseId && !entrepriseLoading && (
    !entreprise.cguAcceptedAt || entreprise.cguVersion !== CGU_VERSION
  );

  const handleCguAccept = async (version) => {
    const now = new Date().toISOString();
    const cguData = { cguAcceptedAt: now, cguVersion: version };
    // Persist ONLY CGU fields to entreprises table (avoid sending entire object with unmapped columns)
    if (entrepriseId) {
      try {
        await ctxUpdateEntreprise(entrepriseId, cguData);
      } catch (err) {
        // Silently continue — local state update below ensures UI unblocks
      }
    }
    // Also update local state so the modal closes immediately
    setEntreprise(prev => ({ ...prev, ...cguData }));
  };

  return (
    <div className={`min-h-screen ${tc.bg}`}>
      {/* LEGAL-001: CGU acceptance modal — blocks app until accepted */}
      {needsCguAcceptance && (
        <CGUAcceptanceModal onAccept={handleCguAccept} couleur={couleur} />
      )}
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-[#1a1a1a] focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Aller au contenu principal
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar - Optimized mobile layout with collapsed icons-only mode on md-xl */}
      <aside className={`fixed top-0 left-0 z-50 h-full ${isDark ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-[#ebebeb]'} transform transition-all duration-200 flex flex-col
        ${sidebarOpen ? 'w-64 translate-x-0 shadow-2xl' : '-translate-x-full'}
        md:translate-x-0 md:w-[72px] xl:w-64 md:shadow-none`}>
        {/* Header with close button on mobile */}
        <div className={`flex items-center gap-3 px-3 py-3 border-b ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'} flex-shrink-0 md:justify-center xl:justify-start`}>
          <div className="hidden xl:block flex-1 min-w-0">
            <EntrepriseSwitcher
              isDark={isDark}
              user={user}
              onNavigateSettings={() => { setPage('settings'); setSidebarOpen(false); }}
            />
          </div>
          {/* Collapsed logo icon for md-xl */}
          <div className="hidden md:flex xl:hidden items-center justify-center w-10 h-10 rounded-xl text-white font-bold text-lg" style={{ background: couleur }}>
            B
          </div>
          {/* Mobile open: show full switcher */}
          <div className="md:hidden flex-1 min-w-0">
            <EntrepriseSwitcher
              isDark={isDark}
              user={user}
              onNavigateSettings={() => { setPage('settings'); setSidebarOpen(false); }}
            />
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className={`md:hidden p-2 rounded-xl transition-colors ${isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-100' : 'text-[#999] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable navigation area */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {/* Main navigation */}
          <nav className="space-y-0.5" aria-label="Navigation principale">
            {nav.slice(0, 2).map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }}
                className={`w-full flex items-center gap-3 justify-start md:justify-center xl:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${page === n.id ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
                style={page === n.id ? {background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`} : {}}
                aria-current={page === n.id ? 'page' : undefined}
                title={n.label}
              >
                <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left truncate md:hidden xl:inline">{n.label}</span>
                {n.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-white text-[10px] rounded-full min-w-[20px] text-center font-semibold md:hidden xl:inline-block"
                    style={{ background: page === n.id ? 'rgba(255,255,255,0.25)' : (n.badgeColor || '#ef4444') }}
                    title={n.badgeTitle}
                  >
                    {n.badge > 99 ? '99+' : n.badge}
                  </span>
                )}
              </button>
            ))}
            {/* Devis IA — sub-item right under Devis & Factures */}
            <button
              onClick={() => { setPage('ia-devis'); setSidebarOpen(false); try { localStorage.setItem('cp_ia_devis_visited', '1'); } catch(e) {} }}
              className={`w-full flex items-center gap-3 justify-start md:justify-center xl:justify-start pl-7 pr-3 md:px-3 xl:pl-7 xl:pr-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${page === 'ia-devis' ? 'text-white shadow-md' : isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-400' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
              style={page === 'ia-devis' ? {background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`} : {}}
              title="Devis IA"
            >
              <Sparkles size={14} className="flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left md:hidden xl:inline">Devis IA</span>
              {!localStorage.getItem('cp_ia_devis_visited') && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold md:hidden xl:inline-block ${page === 'ia-devis' ? 'bg-white/20 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'}`}>NEW</span>
              )}
            </button>
            {nav.slice(2, 4).map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }}
                className={`w-full flex items-center gap-3 justify-start md:justify-center xl:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${page === n.id ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
                style={page === n.id ? {background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`} : {}}
                aria-current={page === n.id ? 'page' : undefined}
                title={n.label}
              >
                <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left truncate md:hidden xl:inline">{n.label}</span>
                {n.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-white text-[10px] rounded-full min-w-[20px] text-center font-semibold md:hidden xl:inline-block"
                    style={{ background: page === n.id ? 'rgba(255,255,255,0.25)' : (n.badgeColor || '#ef4444') }}
                    title={n.badgeTitle}
                  >
                    {n.badge > 99 ? '99+' : n.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Separator */}
          <div className={`my-2 mx-3 border-t ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`} />

          {/* Planning & Tâches group */}
          <nav className="space-y-0.5 mb-1" aria-label="Organisation">
            <p className={`px-3 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wider md:hidden xl:block ${isDark ? 'text-slate-500' : 'text-[#999]'}`}>Organisation</p>
            {nav.filter(n => n.id === 'tasks').map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }}
                className={`w-full flex items-center gap-3 justify-start md:justify-center xl:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${page === n.id ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
                style={page === n.id ? {background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`} : {}}
                aria-current={page === n.id ? 'page' : undefined}
                title={n.label}
              >
                <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left truncate md:hidden xl:inline">{n.label}</span>
                {n.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-white text-[10px] rounded-full min-w-[20px] text-center font-semibold md:hidden xl:inline-block"
                    style={{ background: page === n.id ? 'rgba(255,255,255,0.25)' : (n.badgeColor || '#ef4444') }}
                    title={n.badgeTitle}
                  >
                    {n.badge > 99 ? '99+' : n.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Secondary navigation */}
          <nav className="space-y-0.5" aria-label="Gestion">
            <p className={`px-3 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wider md:hidden xl:block ${isDark ? 'text-slate-500' : 'text-[#999]'}`}>Gestion</p>
            {nav.filter(n => !['dashboard','devis','chantiers','clients','tasks','planning','memos','profil','plan'].includes(n.id)).map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); setSelectedChantier(null); }}
                className={`w-full flex items-center gap-3 justify-start md:justify-center xl:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${page === n.id ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
                style={page === n.id ? {background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`} : {}}
                aria-current={page === n.id ? 'page' : undefined}
                title={n.label}
              >
                <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left truncate md:hidden xl:inline">{n.label}</span>
                {n.badge > 0 && n.id === 'settings' ? (
                  <span
                    className="w-2 h-2 rounded-full md:hidden xl:inline-block flex-shrink-0"
                    style={{ background: page === n.id ? 'rgba(255,255,255,0.5)' : (n.badgeColor || '#f97316') }}
                    title={n.badgeTitle}
                  />
                ) : n.badge > 0 ? (
                  <span
                    className="px-1.5 py-0.5 text-white text-[10px] rounded-full min-w-[20px] text-center font-semibold md:hidden xl:inline-block"
                    style={{ background: page === n.id ? 'rgba(255,255,255,0.25)' : (n.badgeColor || '#ef4444') }}
                    title={n.badgeTitle}
                  >
                    {n.badge > 99 ? '99+' : n.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Separator */}
          <div className={`my-2 mx-3 border-t ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`} />

          {/* Profil section */}
          <nav className="space-y-0.5" aria-label="Profil">
            <p className={`px-3 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wider md:hidden xl:block ${isDark ? 'text-slate-500' : 'text-[#999]'}`}>Profil</p>
            {nav.filter(n => n.id === 'profil' || n.id === 'plan').map(n => (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 justify-start md:justify-center xl:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${page === n.id ? 'text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
                style={page === n.id ? {background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`} : {}}
                aria-current={page === n.id ? 'page' : undefined}
                title={n.label}
              >
                <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left truncate md:hidden xl:inline">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom actions - fixed at bottom */}
        <div className={`flex-shrink-0 p-2 border-t ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'} space-y-1`}>
          <div className="flex gap-1 md:flex-col xl:flex-row">
            <button
              onClick={() => { const next = !modeDiscret; setModeDiscret(next); showToast(next ? 'Mode confidentiel activé — Montants masqués' : 'Mode confidentiel désactivé — Montants visibles', 'info'); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${modeDiscret ? 'bg-amber-600 text-white shadow-md' : isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-400' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
              title={modeDiscret ? 'Désactiver mode confidentiel — Afficher les montants' : 'Activer mode confidentiel — Masquer tous les montants (€) à l\'écran'}
            >
              {modeDiscret ? <EyeOff size={15} /> : <Eye size={15} />}
              <span className="md:hidden xl:inline text-xs">Confidentiel</span>
            </button>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all active:scale-95 ${isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-400' : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}`}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
              <span className="md:hidden xl:inline text-xs">{isDark ? 'Clair' : 'Sombre'}</span>
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs transition-all active:scale-95 ${isDark ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400' : 'text-[#666] hover:bg-red-50 hover:text-red-500'}`}
          >
            <LogOut size={13} />
            <span className="md:hidden xl:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`md:pl-[72px] xl:pl-64 min-h-screen overflow-x-hidden pb-14 lg:pb-0 ${isDark ? 'bg-slate-900' : 'bg-[#fafafa]'}`}>
        {/* Header - Optimized for mobile with proper left/right distribution */}
        <header className={`sticky top-0 z-30 backdrop-blur-xl border-b px-2 sm:px-4 py-2 flex items-center justify-between ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/80 border-[#ebebeb]'}`}>

          {/* LEFT GROUP: Menu + Logo + Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Menu button - mobile only (sidebar visible from md: up) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'text-slate-100 hover:bg-slate-800' : 'hover:bg-[#f5f5f5]'}`}
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo / Company switcher - compact on mobile */}
            <EntrepriseSwitcher
              isDark={isDark}
              compact
              onNavigateSettings={() => setPage('settings')}
            />

            {/* Status badges - compact on mobile */}
            <div className="hidden sm:flex items-center gap-1.5">
              {!isOnline && (
                <span className="px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 bg-amber-500 text-white">
                  <WifiOff size={12} />
                  <span className="hidden md:inline">Hors ligne</span>
                </span>
              )}
              {isOnline && pendingSync > 0 && (
                <span
                  className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 cursor-pointer ${isDark ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  onClick={async () => {
                    // Try sync first, then force-clear if still stuck
                    await handleManualSync();
                    const remaining = await getPendingCount();
                    if (remaining > 0) {
                      await clearAllMutations();
                      setPendingSync(0);
                      showToast('File de synchronisation purgée', 'info');
                    }
                  }}
                  title="Cliquez pour synchroniser ou purger"
                >
                  <Wifi size={12} className="animate-pulse" />
                  <span className="hidden md:inline">{pendingSync} sync</span>
                </span>
              )}
            </div>
          </div>

          {/* CENTER: Search (desktop only) */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <button
              onClick={() => setShowSearch(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all w-full max-w-[320px] ${isDark ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50 text-slate-500' : 'border-[#ebebeb] hover:border-[#ddd] bg-[#fafafa] text-[#999]'}`}
            >
              <Search size={16} />
              <span className="text-sm truncate">Rechercher...</span>
              <kbd className={`ml-auto text-xs px-1.5 py-0.5 rounded hidden lg:block ${isDark ? 'bg-slate-700 text-slate-500' : 'bg-[#f0f0f0] text-[#999]'}`}>⌘K</kbd>
            </button>
          </div>

          {/* RIGHT GROUP: Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Search button - mobile only (icon) */}
            <button
              onClick={() => setShowSearch(true)}
              className={`md:hidden w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-[#f5f5f5] text-[#666]'}`}
              title="Rechercher"
              aria-label="Rechercher"
            >
              <Search size={18} />
            </button>

            {/* Theme toggle - hidden on mobile, shown in sidebar instead */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`hidden sm:flex w-11 h-11 rounded-xl items-center justify-center transition-all ${isDark ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-[#f5f5f5] text-[#666]'}`}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
              aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Help button - tablet and desktop only */}
            <button
              onClick={() => setShowHelp(true)}
              className={`hidden md:flex w-11 h-11 rounded-xl items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-[#f5f5f5] text-[#666]'}`}
              title="Aide"
              aria-label="Ouvrir l'aide"
            >
              <HelpCircle size={18} />
            </button>

            {/* Mode confidentiel toggle — hidden on small mobile, visible sm+ */}
            <button
              onClick={() => { const next = !modeDiscret; setModeDiscret(next); showToast(next ? 'Mode confidentiel activé — Montants masqués' : 'Mode confidentiel désactivé — Montants visibles', 'info'); }}
              className={`hidden sm:flex w-11 h-11 rounded-xl items-center justify-center transition-colors ${modeDiscret ? 'text-white' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-[#f5f5f5] text-[#666]'}`}
              style={modeDiscret ? {background: couleur} : {}}
              title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
              aria-label={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
              aria-pressed={modeDiscret}
            >
              {modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Install PWA button */}
            {!isInstalled && (
              <button
                onClick={() => {
                  if (canInstall) {
                    install();
                  } else {
                    showToast('Sur iOS: Partager → "Sur l\'écran d\'accueil"', 'info');
                  }
                }}
                className={`hidden sm:flex w-11 h-11 lg:w-auto lg:h-11 lg:px-3 rounded-xl items-center justify-center gap-2 text-sm font-medium transition-all flex-shrink-0 border-2 ${
                  isDark
                    ? 'border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50'
                    : 'border-[#ebebeb] text-[#666] hover:border-[#ddd] hover:bg-[#f5f5f5]'
                }`}
                title="Installer l'application"
                aria-label="Installer l'application sur votre appareil"
              >
                <Smartphone size={18} className="flex-shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap">Installer</span>
              </button>
            )}

            {/* Notifications */}
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${showNotifs ? 'text-white shadow-lg' : isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-[#f5f5f5] text-[#666] hover:text-[#1a1a1a]'}`}
              style={showNotifs ? {background: couleur} : {}}
              title={unreadNotifs.length > 0 ? `${unreadNotifs.length} notification${unreadNotifs.length > 1 ? 's' : ''} non lue${unreadNotifs.length > 1 ? 's' : ''}` : 'Notifications'}
              aria-label={`Notifications${unreadNotifs.length > 0 ? ` (${unreadNotifs.length} non lues)` : ''}`}
              aria-expanded={showNotifs}
            >
              <Bell size={20} className={showNotifs ? 'animate-pulse' : ''} />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md" style={{background: couleur}}>
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Quick add */}
            <div className="relative">
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl flex items-center justify-center sm:gap-2 transition-all hover:shadow-lg"
                style={{background: couleur}}
                aria-label="Créer nouveau"
              >
                <Plus size={18} />
                <span className="hidden sm:inline text-sm font-medium">Nouveau</span>
              </button>

              {showQuickAdd && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)} />
                  <div className={`absolute right-0 top-full mt-2 w-48 sm:w-56 max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-[#ebebeb]'}`}>
                    {[
                      { label: 'Nouveau devis', icon: FileText, p: 'devis', create: 'devis' },
                      { label: 'Nouveau client', icon: Users, p: 'clients', create: 'client' },
                      { label: 'Nouveau chantier', icon: Building2, p: 'chantiers', create: 'chantier' },
                      { label: 'Nouvelle tâche', icon: ClipboardList, p: 'memos' }
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => { if (item.create) setCreateMode(p => ({...p, [item.create]: true})); setPage(item.p); setShowQuickAdd(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-[#fafafa] text-[#1a1a1a]'}`}
                      >
                        <item.icon size={18} style={{color: couleur}} />
                        <span>{item.label}</span>
                        <ChevronRight size={16} className={`ml-auto ${tc.textMuted}`} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* User avatar */}
            <button
              onClick={() => setPage('profil')}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg"
              style={{background: couleur}}
              title={user?.email || 'Mon profil'}
              aria-label="Mon profil"
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </button>
          </div>
        </header>

        {/* Trial / Downgrade Banner */}
        <ErrorBoundary fallback={null}>
          <TrialBanner />
        </ErrorBoundary>

        {/* Page content */}
        <main id="main-content" key={page} className={`${page === 'dashboard' || page === 'profil' || page === 'plan' ? '' : 'p-3 sm:p-4 lg:p-6'} ${tc.text} max-w-[1800px] mx-auto pb-20 md:pb-0 overflow-x-hidden animate-fade-in`}>
          <ErrorBoundary isDark={isDark} showDetails={true}>
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} /></div>}>
              {page === 'dashboard' && <Dashboard clients={clients} devis={devis} chantiers={chantiers} events={planningEvents} depenses={depenses} pointages={pointages} equipe={equipe} ajustements={ajustements} catalogue={catalogue} entreprise={entreprise} getChantierBilan={getChantierBilan} addDevis={addDevis} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} setCreateMode={setCreateMode} setAiPrefill={setAiPrefill} modeDiscret={modeDiscret} setModeDiscret={setModeDiscret} couleur={couleur} isDark={isDark} showHelp={showHelp} setShowHelp={setShowHelp} user={user} onOpenSearch={() => setShowSearch(true)} memos={memos} addMemo={addMemo} toggleMemo={toggleMemo} />}
              {page === 'devis' && <DevisPage clients={clients} setClients={setClients} addClient={addClient} devis={devis} setDevis={setDevis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={addDevis} onUpdate={updateDevis} onDelete={deleteDevis} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} isDark={isDark} couleur={couleur} createMode={createMode.devis} setCreateMode={(v) => setCreateMode(p => ({...p, devis: v}))} addChantier={addChantier} setPage={setPage} setSelectedChantier={setSelectedChantier} addEchange={addEchange} paiements={paiements} addPaiement={addPaiement} generateNextNumero={generateNextNumero} aiPrefill={aiPrefill} setAiPrefill={setAiPrefill} />}
              {page === 'chantiers' && <Chantiers chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} setDepenses={setDepenses} pointages={pointages} setPointages={setPointages} equipe={equipe} devis={devis} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} isDark={isDark} createMode={createMode.chantier} setCreateMode={(v) => setCreateMode(p => ({...p, chantier: v}))} setPage={setPage} memos={memos} addMemo={addMemo} updateMemo={updateMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo} onPlanEvent={(data) => { setPlanningPrefill(data); setPage('planning'); }} addDevis={addDevis} generateNextNumero={generateNextNumero} />}
              {(page === 'tasks' || page === 'planning' || page === 'memos') && (
                <TasksAndPlanning
                  memos={memos} addMemo={addMemo} updateMemo={updateMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo}
                  events={planningEvents} setEvents={setPlanningEvents} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent}
                  chantiers={chantiers} clients={clients} equipe={equipe} devis={devis}
                  setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier}
                  isDark={isDark} couleur={couleur} showToast={showToast}
                  prefill={planningPrefill} clearPrefill={() => setPlanningPrefill(null)}
                  initialView={page === 'planning' ? 'calendar' : page === 'memos' ? 'list' : undefined}
                />
              )}
              {page === 'clients' && <Clients clients={clients} setClients={setClients} updateClient={updateClient} deleteClient={deleteClient} devis={devis} chantiers={chantiers} echanges={echanges} onSubmit={addClient} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} isDark={isDark} modeDiscret={modeDiscret} createMode={createMode.client} setCreateMode={(v) => setCreateMode(p => ({...p, client: v}))} memos={memos} addMemo={addMemo} updateMemo={updateMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo} onImportClients={() => { setImportType('clients'); setShowImport(true); }} />}
              {page === 'bibliotheque' && <BibliothequePrix isDark={isDark} couleur={couleur} setPage={setPage} devis={devis} addDevis={addDevis} />}
              {page === 'catalogue' && <Catalogue catalogue={catalogue} setCatalogue={setCatalogue} addCatalogueItem={addCatalogueItem} updateCatalogueItem={updateCatalogueItem} deleteCatalogueItem={deleteCatalogueItem} chantiers={chantiers} equipe={equipe} devis={devis} updateDevis={updateDevis} clients={clients} couleur={couleur} isDark={isDark} modeDiscret={modeDiscret} setPage={setPage} />}
              {page === 'ouvrages' && <BibliothequeOuvrages catalogue={catalogue} ouvragesProp={ouvrages} setOuvragesProp={setOuvrages} addOuvrage={dataAddOuvrage} updateOuvrage={dataUpdateOuvrage} deleteOuvrage={dataDeleteOuvrage} isDark={isDark} couleur={couleur} />}
              {page === 'soustraitants' && <FeatureGuard feature="sous_traitants"><SousTraitantsModule chantiers={chantiers} isDark={isDark} couleur={couleur} setPage={setPage} /></FeatureGuard>}
              {page === 'commandes' && <FeatureGuard feature="commandes"><CommandesFournisseurs chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} isDark={isDark} couleur={couleur} setPage={setPage} /></FeatureGuard>}
              {page === 'tresorerie' && <FeatureGuard feature="tresorerie"><TresorerieModule devis={devis} depenses={depenses} chantiers={chantiers} clients={clients} paiements={paiements} entreprise={entreprise} isDark={isDark} couleur={couleur} setPage={setPage} modeDiscret={modeDiscret} /></FeatureGuard>}
              {page === 'ia-devis' && <FeatureGuard feature="ia_devis"><IADevisAnalyse catalogue={catalogue} clients={clients} chantiers={chantiers} entreprise={entreprise} isDark={isDark} couleur={couleur} onSubmit={addDevis} addClient={addClient} generateNextNumero={generateNextNumero} setSelectedDevis={setSelectedDevis} setPage={setPage} /></FeatureGuard>}
              {page === 'entretien' && <FeatureGuard feature="entretien"><CarnetEntretien chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur} setPage={setPage} /></FeatureGuard>}
              {page === 'signatures' && <FeatureGuard feature="signatures"><SignatureModule devis={devis} chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur} /></FeatureGuard>}
              {page === 'export' && <FeatureGuard feature="export_comptable"><ExportComptable devis={devis} depenses={depenses} chantiers={chantiers} clients={clients} entreprise={entreprise} isDark={isDark} couleur={couleur} /></FeatureGuard>}
              {page === 'pipeline' && <FeatureGuard feature="pipeline"><PipelineKanban devis={devis} clients={clients} isDark={isDark} couleur={couleur} setPage={setPage} setSelectedDevis={setSelectedDevis} onUpdateDevis={updateDevis} /></FeatureGuard>}
              {page === 'avis-google' && <FeatureGuard feature="avis_google"><AvisGoogle chantiers={chantiers} clients={clients} entreprise={entreprise} isDark={isDark} couleur={couleur} /></FeatureGuard>}
              {page === 'site-web' && <SiteVitrine entreprise={entreprise} chantiers={chantiers} catalogue={catalogue} isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'profil' && <ProfilePage user={user} entreprise={entreprise} devis={devis} clients={clients} chantiers={chantiers} catalogue={catalogue} depenses={depenses} paiements={paiements} equipe={equipe} isDark={isDark} couleur={couleur} setPage={setPage} modeDiscret={modeDiscret} />}
              {page === 'plan' && <PlanPage isDark={isDark} couleur={couleur} />}
              {page === 'analytique' && <AnalyticsPage devis={devis} clients={clients} chantiers={chantiers} depenses={depenses} equipe={equipe} paiements={paiements} entreprise={entreprise} isDark={isDark} couleur={couleur} setPage={setPage} modeDiscret={modeDiscret} />}
              {page === 'finances' && <FinancesPage devis={devis} depenses={depenses} clients={clients} chantiers={chantiers} entreprise={entreprise} equipe={equipe} paiements={paiements} pointages={pointages} isDark={isDark} couleur={couleur} setPage={setPage} modeDiscret={modeDiscret} />}
              {page === 'equipe' && <Equipe equipe={equipe} setEquipe={setEquipe} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} pointages={pointages} setPointages={setPointages} addPointage={addPointage} chantiers={chantiers} planningEvents={planningEvents} couleur={couleur} isDark={isDark} modeDiscret={modeDiscret} setPage={setPage} />}
              {page === 'messagerie' && <ChatPage isDark={isDark} couleur={couleur} showToast={showToast} user={user} equipe={equipe} />}
              {page === 'formulaires' && <FormulairesPage isDark={isDark} couleur={couleur} showToast={showToast} user={user} chantiers={chantiers} clients={clients} />}
              {page === 'garanties' && <GarantiesDashboard isDark={isDark} couleur={couleur} showToast={showToast} user={user} chantiers={chantiers} />}
              {page === 'admin' && <AdminHelp chantiers={chantiers} clients={clients} devis={devis} factures={devis.filter(d => d.type === 'facture')} depenses={depenses} entreprise={entreprise} isDark={isDark} couleur={couleur} />}
              {page === 'pricing' && <PricingPage isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'billing' && <BillingDashboard isDark={isDark} couleur={couleur} />}
              {page === 'checkout-success' && <CheckoutSuccess isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} depenses={depenses} clients={clients} chantiers={chantiers} isDark={isDark} modeDiscret={modeDiscret} couleur={couleur} setPage={setPage} />}
              {page === 'design-system' && <DesignSystemDemo />}
              {page === 'cgv' && <LegalPages page="cgv" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'cgu' && <LegalPages page="cgu" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'confidentialite' && <LegalPages page="confidentialite" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'mentions-legales' && <LegalPages page="mentions-legales" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'changelog' && <Changelog isDark={isDark} couleur={couleur} setPage={setPage} />}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Floating Action Button (FAB) for quick actions - hidden on form pages */}
        {/* FAB Menu - hidden on mobile when bottom nav is visible */}
        <FABMenu
          onNewDevis={() => setShowFABDevisWizard(true)}
          onNewClient={() => setShowFABQuickClient(true)}
          onNewChantier={() => setShowFABQuickChantier(true)}
          isDark={isDark}
          couleur={couleur}
          hidden={
            createMode.devis || createMode.chantier || createMode.client ||
            selectedChantier !== null ||
            showFABDevisWizard || showFABQuickClient || showFABQuickChantier ||
            showSearch ||
            // Hide FAB on pages that have their own creation button
            ['devis', 'chantiers', 'clients', 'equipe', 'catalogue', 'settings', 'ia-devis', 'memos', 'commandes'].includes(page)
          }
        />

        {/* Mobile Bottom Navigation Bar — replaces sidebar on small screens */}
        <nav className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t backdrop-blur-lg ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-[#ebebeb]'} pb-[env(safe-area-inset-bottom)]`}>
          <div className="flex items-stretch justify-around h-14">
            {[
              { id: 'dashboard', icon: Home, label: 'Accueil' },
              { id: 'devis', icon: FileText, label: 'Devis' },
              { id: 'chantiers', icon: Building2, label: 'Chantiers' },
              { id: 'clients', icon: Users, label: 'Clients' },
            ].filter(item => canAccess(item.id)).map(item => {
              const isActive = item.id === page;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setSidebarOpen(false);
                    setSelectedChantier(null);
                    setSelectedDevis(null);
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                    isActive
                      ? ''
                      : isDark ? 'text-slate-500 active:text-slate-400' : 'text-[#999] active:text-[#666]'
                  }`}
                  style={isActive ? { color: couleur } : {}}
                >
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: couleur }} />
                  )}
                  <div
                    className={`flex items-center justify-center w-12 h-7 rounded-full transition-all ${isActive ? '' : ''}`}
                    style={isActive ? { backgroundColor: `${couleur}15` } : {}}
                  >
                    <item.icon size={21} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className={`text-[10px] mt-0.5 whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </button>
              );
            })}
            {/* 5th item: Plus / Menu — opens sidebar for all pages */}
            {(() => {
              const mainTabs = ['dashboard', 'devis', 'chantiers', 'clients'];
              const isPlusActive = !mainTabs.includes(page);
              return (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                    isPlusActive
                      ? ''
                      : isDark ? 'text-slate-500 active:text-slate-400' : 'text-[#999] active:text-[#666]'
                  }`}
                  style={isPlusActive ? { color: couleur } : {}}
                >
                  {isPlusActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: couleur }} />
                  )}
                  <div
                    className="flex items-center justify-center w-12 h-7 rounded-full"
                    style={isPlusActive ? { backgroundColor: `${couleur}15` } : {}}
                  >
                    <Menu size={21} strokeWidth={isPlusActive ? 2.5 : 1.5} />
                  </div>
                  <span className={`text-[10px] mt-0.5 whitespace-nowrap ${isPlusActive ? 'font-bold' : 'font-medium'}`}>Plus</span>
                </button>
              );
            })()}
          </div>
        </nav>
      </div>

      {/* FAB Devis Wizard */}
      {showFABDevisWizard && (
        <Suspense fallback={null}>
          <DevisWizard
            isOpen={showFABDevisWizard}
            onClose={() => setShowFABDevisWizard(false)}
            onSubmit={async (data) => {
              const newDevis = await addDevis({
                ...data,
                date: new Date().toISOString().split('T')[0],
                statut: 'brouillon'
              });
              setShowFABDevisWizard(false);
              if (newDevis?.id) {
                setSelectedDevis(newDevis);
                setPage('devis');
              }
            }}
            clients={clients}
            catalogue={catalogue}
            chantiers={chantiers}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* FAB Quick Client Modal */}
      {showFABQuickClient && (
        <Suspense fallback={null}>
          <QuickClientModal
            isOpen={showFABQuickClient}
            onClose={() => setShowFABQuickClient(false)}
            onSubmit={(data) => {
              const newClient = { id: `c${Date.now()}`, ...data };
              setClients(prev => [...prev, newClient]);
              setShowFABQuickClient(false);
              showToast('Client ajouté !', 'success');
            }}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* FAB Quick Chantier Modal */}
      {showFABQuickChantier && (
        <Suspense fallback={null}>
          <QuickChantierModal
            isOpen={showFABQuickChantier}
            onClose={() => setShowFABQuickChantier(false)}
            onSubmit={(data) => {
              const newChantier = {
                id: `ch${Date.now()}`,
                ...data,
                statut: 'prospect',
                avancement: 0,
                photos: [],
                taches: []
              };
              setChantiers(prev => [...prev, newChantier]);
              setShowFABQuickChantier(false);
              showToast('Chantier créé !', 'success');
            }}
            clients={clients}
            devis={devis}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* Global Help Modal */}
      {showHelp && <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} isDark={isDark} couleur={couleur} tc={tc} />}

      {/* Onboarding Modal for first-time users */}
      {showOnboarding && <OnboardingModal setShowOnboarding={setShowOnboarding} isDark={isDark} couleur={couleur} />}

      {/* Command Palette (⌘K) */}
      <Suspense fallback={null}>
        <CommandPalette
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          setPage={setPage}
          setSelectedChantier={setSelectedChantier}
          setSelectedDevis={setSelectedDevis}
          clients={clients}
          chantiers={chantiers}
          devis={devis}
          memos={memos}
          onNewDevis={(type) => {
            setCreateMode(p => ({ ...p, devis: true }));
            setPage('devis');
          }}
          onNewClient={() => setShowFABQuickClient(true)}
          onNewChantier={() => setShowFABQuickChantier(true)}
          isDark={isDark}
          couleur={couleur}
        />
      </Suspense>

      {/* Notifications Modal - Rendered at root level for proper z-index */}
      {showNotifs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Dark Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNotifs(false)}
          />
          {/* Modal */}
          <div
            className={`relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-title"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 sm:px-5 py-3 sm:py-4 border-b" style={{background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)`, borderColor: isDark ? '#334155' : '#e2e8f0'}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: `${couleur}20`}}>
                    <Bell size={20} style={{color: couleur}} />
                  </div>
                  <div>
                    <h3 id="notif-title" className={`font-semibold text-base sm:text-lg ${tc.text}`}>Notifications</h3>
                    <p className={`text-xs ${tc.textMuted}`}>
                      {unreadNotifs.length > 0 ? `${unreadNotifs.length} non lue${unreadNotifs.length > 1 ? 's' : ''}` : 'Tout est à jour'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifs(false)}
                  className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-[#f5f5f5] text-[#999]'}`}
                  aria-label="Fermer"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Content — UX-011: "Tout marquer comme lu" uniquement en bas */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{background: `${couleur}15`}}>
                    <Bell size={28} style={{color: couleur}} />
                  </div>
                  <p className={`text-lg font-medium ${tc.text}`}>Tout est à jour</p>
                  <p className={`text-sm mt-2 ${tc.textMuted}`}>Aucune notification pour le moment</p>
                </div>
              ) : (
                <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-[#ebebeb]'}`}>
                  {notifications.map(n => {
                    const typeConfig = {
                      success: { icon: '✅', bg: isDark ? 'bg-emerald-900/40' : 'bg-emerald-100' },
                      warning: { icon: '⚠️', bg: isDark ? 'bg-amber-900/40' : 'bg-amber-100' },
                      info: { icon: 'ℹ️', bg: isDark ? 'bg-blue-900/40' : 'bg-blue-100' },
                      message: { icon: '💬', bg: isDark ? 'bg-purple-900/40' : 'bg-purple-100' },
                      alert: { icon: '🔔', bg: isDark ? 'bg-orange-900/40' : 'bg-orange-100' }
                    };
                    const config = typeConfig[n.type] || typeConfig.alert;

                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          markNotifRead(n.id);
                          if (n.link) {
                            setPage(n.link);
                            // Navigation directe avec l'itemId
                            if (n.itemType === 'devis' || n.itemType === 'facture') {
                              const found = devis.find(d => d.id === n.itemId);
                              if (found) setSelectedDevis(found);
                            } else if (n.itemType === 'chantier') {
                              const found = chantiers.find(c => c.id === n.itemId);
                              if (found) setSelectedChantier(found);
                            }
                            setShowNotifs(false);
                          }
                        }}
                        className={`w-full text-left px-5 py-4 transition-all ${!n.read ? (isDark ? 'bg-slate-700/40' : 'bg-orange-50/70') : ''} ${isDark ? 'hover:bg-slate-700/60' : 'hover:bg-[#fafafa]'}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                            <span className="text-lg">{config.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${!n.read ? 'font-medium' : ''} ${tc.text}`}>{safeStr(n.message)}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className={`text-xs ${tc.textMuted}`}>{safeStr(n.date)}</p>
                              {n.link && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{background: `${couleur}15`, color: couleur}}>
                                  Voir →
                                </span>
                              )}
                            </div>
                          </div>
                          {!n.read && (
                            <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{background: couleur}} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className={`flex-shrink-0 px-5 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-[#ebebeb] bg-[#fafafa]'}`}>
                <button
                  onClick={() => {
                    markAllNotifsRead();
                    setShowNotifs(false);
                  }}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-[#f0f0f0] text-[#666] hover:bg-[#ebebeb]'}`}
                >
                  Tout marquer comme lu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-16 lg:bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up ${
              toast.type === 'success' ? (isDark ? 'bg-emerald-900/90 text-emerald-100' : 'bg-emerald-600 text-white') :
              toast.type === 'error' ? (isDark ? 'bg-red-900/90 text-red-100' : 'bg-red-600 text-white') :
              toast.type === 'warning' ? (isDark ? 'bg-amber-900/90 text-amber-100' : 'bg-amber-600 text-white') :
              (isDark ? 'bg-slate-800 text-slate-100' : 'bg-[#161616] text-white')
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'warning' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            <span className="text-sm font-medium">{safeStr(toast.message)}</span>
            <button onClick={hideToast} className="ml-2 opacity-70 hover:opacity-100" aria-label="Fermer la notification">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal (Legacy) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onCancel || closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
        isDark={isDark}
      />

      {/* New Zustand-based Modal System */}
      <ModalContainer isDark={isDark} />

      {/* Upgrade Modal (Subscription) */}
      <ErrorBoundary fallback={null}>
        <UpgradeModal />
      </ErrorBoundary>

      {/* Import Modal (CSV/Excel) */}
      {showImport && (
        <Suspense fallback={null}>
          <ImportModal
            isOpen={showImport}
            onClose={() => setShowImport(false)}
            type={importType}
            isDark={isDark}
            couleur={couleur}
            onImport={(data) => {
              if (importType === 'clients') {
                data.forEach(item => {
                  const c = { id: `imp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, ...item };
                  setClients(prev => [...prev, c]);
                });
                showToast(`${data.length} client(s) importé(s)`, 'success');
              }
              setShowImport(false);
            }}
          />
        </Suspense>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcuts && (
        <Suspense fallback={null}>
          <ShortcutsHelp
            isOpen={showShortcuts}
            onClose={() => setShowShortcuts(false)}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* New Zustand-based Toast System */}
      <ToastContainer position="bottom-right" />

      {/* PWA Install/Update Prompt - visible sur mobile */}
      <PWAUpdatePrompt isDark={isDark} couleur={entreprise.couleur} />

      {/* Offline indicator banner */}
      <OfflineIndicator
        pendingCount={pendingSync}
        onSync={() => { syncRetryAttemptRef.current = 0; cancelSyncRetry(); return handleManualSync(); }}
        onForceClear={async () => {
          await clearAllMutations();
          setPendingSync(0);
          setSyncErrorDetails(null);
          syncRetryAttemptRef.current = 0;
          cancelSyncRetry();
        }}
        errorDetails={syncErrorDetails}
        isDark={isDark}
      />

      {/* AI Chatbot Assistant */}
      <Suspense fallback={null}>
        <AIChatBot
          isDark={isDark}
          couleur={couleur}
          devis={devis}
          chantiers={chantiers}
          clients={clients}
          entreprise={entreprise}
        />
      </Suspense>

      {/* Cookie Consent Banner (RGPD) */}
      <CookieConsent isDark={isDark} couleur={couleur} setPage={setPage} />
    </div>
  );
}

// Help Modal Component
function HelpModal({ showHelp, setShowHelp, isDark, couleur, tc }) {
  const [helpSection, setHelpSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const textPrimary = isDark ? 'text-slate-100' : 'text-[#1a1a1a]';
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#666]';

  const helpSections = {
    overview: {
      title: "Bienvenue",
      titleFull: "Bienvenue dans BatiGesti",
      icon: "🏠",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>BatiGesti est votre assistant de gestion quotidien. Suivez vos chantiers, vos devis et votre rentabilité en quelques clics.</p>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>💡 Exemple concret</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Jean, plombier, utilise BatiGesti pour : créer ses devis en 5 min, suivre la marge de chaque chantier, et ne jamais oublier une relance client.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
            <h4 className={`font-semibold mb-2 ${textPrimary}`}>📍 Par où commencer ?</h4>
            <ol className={`text-sm space-y-2 ${textSecondary}`}>
              <li>1. Configurez votre entreprise dans <strong>Paramètres</strong></li>
              <li>2. Ajoutez vos prestations dans le <strong>Catalogue</strong></li>
              <li>3. Créez votre premier <strong>Client</strong> et <strong>Devis</strong></li>
            </ol>
          </div>
        </div>
      )
    },
    devis: {
      title: "Devis & Factures",
      titleFull: "Créer et gérer vos devis",
      icon: "📋",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Créez des devis professionnels et transformez-les en factures en un clic.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>1. Créer un devis</h5>
              <p className={`text-sm ${textSecondary}`}>Cliquez sur "Nouveau" puis ajoutez vos lignes depuis le catalogue ou manuellement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>2. Envoyer au client</h5>
              <p className={`text-sm ${textSecondary}`}>Générez le PDF et envoyez-le par WhatsApp ou email directement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>3. Convertir en facture</h5>
              <p className={`text-sm ${textSecondary}`}>Devis accepté ? Demandez un acompte ou facturez directement.</p>
            </div>
          </div>
        </div>
      )
    },
    chantiers: {
      title: "Chantiers",
      titleFull: "Suivre vos chantiers",
      icon: "🏗️",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Suivez chaque chantier : dépenses, heures, avancement et rentabilité.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>📊 Suivi financier</h5>
              <p className={`text-sm ${textSecondary}`}>Ajoutez vos dépenses (matériaux, sous-traitance) et pointez les heures. La marge se calcule automatiquement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>📸 Photos de chantier</h5>
              <p className={`text-sm ${textSecondary}`}>Prenez des photos avant/pendant/après pour documenter votre travail.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>✅ To-do list</h5>
              <p className={`text-sm ${textSecondary}`}>Créez des tâches pour ne rien oublier sur chaque chantier.</p>
            </div>
          </div>
        </div>
      )
    },
    rentabilite: {
      title: "Rentabilité",
      titleFull: "Comprendre votre marge",
      icon: "💰",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>La marge nette est calculée automatiquement :</p>
          <div className={`p-4 rounded-xl font-mono text-sm ${isDark ? 'bg-slate-800' : 'bg-[#f5f5f5]'}`}>
            <p className={textPrimary}>Marge = CA - Dépenses - Main d'œuvre</p>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <span className="text-2xl">🟢</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{">"} 40% = Excellent</p>
                <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Vous êtes très rentable</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <span className="text-2xl">🟡</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>20-40% = Correct</p>
                <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Marge standard du BTP</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <span className="text-2xl">🔴</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>{"<"} 20% = Attention</p>
                <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>Revoyez vos prix ou coûts</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    astuces: {
      title: "Astuces",
      titleFull: "Astuces pour gagner du temps",
      icon: "⚡",
      content: (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>📱 Utilisez le sur mobile</h4>
            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>BatiGesti fonctionne parfaitement sur téléphone. Ajoutez-le à votre écran d'accueil pour un accès rapide.</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>🎨 Personnalisez</h4>
            <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>Dans Paramètres, ajoutez votre logo et choisissez votre couleur. Vos devis auront un aspect professionnel unique.</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>📊 Mode confidentiel</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>Cliquez sur l'œil pour masquer les montants. Pratique quand un client regarde votre écran !</p>
          </div>
        </div>
      )
    },
    faq: {
      title: "FAQ",
      titleFull: "Questions fréquentes",
      icon: "❓",
      content: (() => {
        const faqItems = [
          { q: 'Comment créer mon premier devis ?', a: 'Allez dans Devis & Factures, cliquez "Nouveau devis", sélectionnez un client et ajoutez vos lignes depuis le catalogue ou manuellement.' },
          { q: 'Comment transformer un devis en facture ?', a: 'Ouvrez le devis accepté et cliquez "Convertir en facture". Toutes les lignes sont reprises automatiquement.' },
          { q: 'Comment ajouter mon logo ?', a: 'Dans Paramètres > Identité, uploadez votre logo. Il apparaîtra sur tous vos devis et factures PDF.' },
          { q: 'Comment suivre mes dépenses ?', a: 'Dans la fiche d\'un chantier, onglet Dépenses, ajoutez chaque achat de matériel ou paiement de sous-traitant.' },
          { q: 'Comment envoyer un devis par email ?', a: 'Générez le PDF du devis puis utilisez le bouton "Envoyer" pour l\'envoyer par email directement depuis l\'application.' },
          { q: 'Puis-je utiliser BatiGesti hors ligne ?', a: 'Oui ! BatiGesti est une PWA. Installez-la sur votre téléphone et vos données se synchronisent automatiquement.' },
          { q: 'Comment fonctionne le planning ?', a: 'Le planning affiche vos chantiers et événements. Cliquez sur un jour pour ajouter un événement ou glissez-déposez pour réorganiser.' },
          { q: 'Comment gérer mes clients ?', a: 'Dans la section Clients, ajoutez les coordonnées de vos clients. Vous verrez leur historique de devis et chantiers.' },
          { q: 'Comment fonctionne le catalogue ?', a: 'Le catalogue stocke vos articles et prestations avec prix unitaires. Réutilisez-les dans vos devis en un clic.' },
          { q: 'Comment changer mon plan ?', a: 'Dans Paramètres, vous pouvez voir votre plan actuel et évoluer vers Artisan ou Équipe pour débloquer plus de fonctionnalités.' },
          { q: 'Comment exporter mes données comptables ?', a: 'Dans Finances > Export Comptable, exportez vos données au format FEC, CSV ou compatible Pennylane/Indy.' },
          { q: 'Comment fonctionne la trésorerie ?', a: 'Dans Finances > Trésorerie, visualisez vos flux de trésorerie en temps réel avec un prévisionnel automatique.' },
          { q: 'Comment utiliser l\'IA Devis ?', a: 'Prenez une photo du chantier ou décrivez les travaux. L\'IA génère automatiquement un devis détaillé. (Inclus dans tous les plans)' },
          { q: 'Comment relancer un client ?', a: 'BatiGesti détecte les devis en attente et vous propose des relances automatiques par email.' },
          { q: 'Comment ajouter un acompte ?', a: 'Lors de la création de la facture d\'acompte, indiquez le pourcentage souhaité. Le solde sera calculé automatiquement.' },
          { q: 'Les données sont-elles sécurisées ?', a: 'Oui, vos données sont chiffrées et hébergées en Europe. Nous sommes conformes RGPD.' },
          { q: 'Comment supprimer mon compte ?', a: 'Dans Paramètres > Données, section RGPD, vous pouvez exporter ou supprimer toutes vos données.' },
          { q: 'Comment contacter le support ?', a: 'Envoyez un email à support@batigesti.fr. Nous répondons sous 48h ouvrées.' },
        ];
        const filtered = searchQuery.trim()
          ? faqItems.filter(f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
          : faqItems;
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une question..."
              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-[#fafafa] border-[#ebebeb] text-[#1a1a1a] placeholder-[#999]'}`}
            />
            {filtered.length === 0 && (
              <p className={`text-sm text-center py-4 ${textSecondary}`}>Aucun résultat. Contactez-nous à support@batigesti.fr</p>
            )}
            {filtered.map((item, i) => (
              <details key={i} className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`}>
                <summary className={`px-4 py-3 cursor-pointer text-sm font-medium ${isDark ? 'hover:bg-slate-700' : 'hover:bg-[#fafafa]'} ${textPrimary}`}>
                  {item.q}
                </summary>
                <div className={`px-4 pb-3 text-sm ${textSecondary}`}>{item.a}</div>
              </details>
            ))}
          </div>
        );
      })()
    },
    contact: {
      title: "Contact",
      titleFull: "Contacter le support",
      icon: "📧",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Notre équipe répond sous 48h ouvrées.</p>
          <div className={`p-5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'} space-y-3`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className={`font-medium ${textPrimary}`}>Email</p>
                <p className={`text-sm ${textSecondary}`}>support@batigesti.fr</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <p className={`font-medium ${textPrimary}`}>Délai de réponse</p>
                <p className={`text-sm ${textSecondary}`}>Sous 48h ouvrées (prioritaire pour les abonnés Pro)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📖</span>
              <div>
                <p className={`font-medium ${textPrimary}`}>Documentation</p>
                <p className={`text-sm ${textSecondary}`}>Consultez la FAQ ci-dessus pour une réponse immédiate</p>
              </div>
            </div>
          </div>
          <a
            href="mailto:support@batigesti.fr?subject=Support BatiGesti"
            className="block w-full py-3 rounded-xl text-center text-white font-semibold text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: couleur }}
          >
            Envoyer un email au support
          </a>
        </div>
      )
    }
  };

  const currentSection = helpSections[helpSection];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHelp(false)}>
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                <span className="text-xl">❓</span>
              </div>
              <div>
                <h2 className={`font-bold text-lg ${textPrimary}`}>Guide d'utilisation</h2>
                <p className={`text-sm ${textSecondary}`}>Tout savoir sur BatiGesti</p>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-[#f5f5f5]'}`}>
              <span className={textPrimary}>✕</span>
            </button>
          </div>
        </div>

        {/* Tabs - Mobile only */}
        <div className={`md:hidden border-b ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`}>
          <div className="flex overflow-x-auto p-2 gap-1 scrollbar-hide">
            {Object.entries(helpSections).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setHelpSection(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap min-h-[40px] transition-colors flex-shrink-0 ${
                  helpSection === key
                    ? 'text-white'
                    : isDark
                      ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      : 'bg-[#f5f5f5] text-[#666] hover:bg-[#f0f0f0]'
                }`}
                style={helpSection === key ? { background: couleur } : {}}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content with sidebar for desktop */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Desktop only */}
          <div className={`hidden md:block w-48 border-r ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-[#ebebeb] bg-[#fafafa]'} p-3`}>
            <div className="space-y-1">
              {Object.entries(helpSections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setHelpSection(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                    helpSection === key
                      ? 'text-white'
                      : isDark
                        ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-400'
                        : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'
                  }`}
                  style={helpSection === key ? { background: couleur } : {}}
                >
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{currentSection.icon}</span>
              <h3 className={`text-xl font-bold ${textPrimary}`}>{currentSection.titleFull || currentSection.title}</h3>
            </div>
            {currentSection.content}
          </div>
        </div>
      </div>
    </div>
  );
}

// Onboarding Modal for first-time users
function OnboardingModal({ setShowOnboarding, isDark, couleur }) {
  const [step, setStep] = useState(0);

  const textPrimary = isDark ? 'text-slate-100' : 'text-[#1a1a1a]';
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#666]';

  const steps = [
    {
      icon: "👋",
      title: "Bienvenue sur BatiGesti",
      subtitle: "Votre assistant de gestion pour artisan",
      content: (
        <div className="space-y-4">
          <p className={`text-center ${textSecondary}`}>
            Gérez vos devis, factures et chantiers en toute simplicité. Tout est pensé pour vous faire gagner du temps.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <span className="text-3xl mb-2 block">📋</span>
              <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Devis en 5 min</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <span className="text-3xl mb-2 block">💰</span>
              <p className={`text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Marge automatique</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <span className="text-3xl mb-2 block">📱</span>
              <p className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Mobile friendly</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: "📋",
      title: "Créez vos devis rapidement",
      subtitle: "Du devis à la facture en 2 clics",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'} border ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: couleur + '30' }}>
                  <FileText size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>DEV-2025-001</p>
                  <p className={`text-sm ${textSecondary}`}>Client: Dupont Marie</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Accepté</span>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-white'} space-y-2`}>
              <div className="flex justify-between text-sm">
                <span className={textSecondary}>Rénovation cuisine complète</span>
                <span className={textPrimary}>5 000 €</span>
              </div>
              <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'} flex justify-between`}>
                <span className={`font-medium ${textPrimary}`}>Total TTC</span>
                <span className="font-bold text-lg" style={{ color: couleur }}>5 500 €</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>✓ Accepté</span>
            <span className={textSecondary}>→</span>
            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>💰 Facturer</span>
          </div>
        </div>
      )
    },
    {
      icon: "🏗️",
      title: "Suivez vos chantiers",
      subtitle: "Dépenses, heures et rentabilité",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-[#fafafa]'} border ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-bold ${textPrimary}`}>Rénovation Dupont</p>
                <p className={`text-sm ${textSecondary}`}>En cours</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">67%</p>
                <p className={`text-xs ${textSecondary}`}>Marge nette</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-blue-500">5 500€</p>
                <p className={`text-xs ${textSecondary}`}>CA</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-red-500">1 200€</p>
                <p className={`text-xs ${textSecondary}`}>Dépenses</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-emerald-500">3 685€</p>
                <p className={`text-xs ${textSecondary}`}>Marge</p>
              </div>
            </div>
          </div>
          <p className={`text-center text-sm ${textSecondary}`}>
            Ajoutez vos dépenses et heures pour calculer automatiquement votre rentabilité
          </p>
        </div>
      )
    },
    {
      icon: "🚀",
      title: "Prêt à commencer ?",
      subtitle: "Votre première étape",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-800/80' : 'bg-gradient-to-br from-[#fafafa] to-white'} border ${isDark ? 'border-slate-700' : 'border-[#ebebeb]'}`}>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>1</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Configurez votre entreprise</p>
                  <p className={`text-sm ${textSecondary}`}>Allez dans Paramètres pour ajouter votre logo et vos infos</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>2</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Créez votre premier client</p>
                  <p className={`text-sm ${textSecondary}`}>Ajoutez les coordonnées de vos clients pour les retrouver facilement</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>3</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Créez votre premier devis</p>
                  <p className={`text-sm ${textSecondary}`}>Générez un devis professionnel en quelques minutes</p>
                </div>
              </li>
            </ol>
          </div>
          <p className={`text-center text-sm ${textSecondary}`}>
            Besoin d'aide ? Cliquez sur <strong>?</strong> en haut à droite à tout moment
          </p>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  const completeOnboarding = () => {
    localStorage.setItem('batigesti_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('batigesti_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative`}>
        {/* Close button */}
        <button
          onClick={skipOnboarding}
          className={`absolute top-4 right-4 p-2 rounded-xl z-10 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-400' : 'hover:bg-[#f5f5f5] text-[#666] hover:text-[#666]'}`}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        {/* Progress bar */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-[#ebebeb]'}`}>
          <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: couleur }}></div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className="text-5xl mb-4 block">{currentStep.icon}</span>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>{currentStep.title}</h2>
            <p className={textSecondary}>{currentStep.subtitle}</p>
          </div>

          {currentStep.content}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-[#ebebeb] bg-[#fafafa]'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setStep(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${i === step ? '' : isDark ? 'bg-[#333]' : 'bg-[#ddd]'}`}
                    style={i === step ? { background: couleur } : {}}
                  />
                ))}
              </div>
              <button
                onClick={skipOnboarding}
                className={`text-xs ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-[#666] hover:text-[#666]'}`}
              >
                Passer
              </button>
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className={`px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-[#f5f5f5] text-[#666] hover:bg-[#f0f0f0]'}`}
                >
                  Retour
                </button>
              )}
              <button
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : completeOnboarding()}
                className="px-4 py-2 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                style={{ background: couleur }}
              >
                {step < steps.length - 1 ? 'Suivant' : 'Terminer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
