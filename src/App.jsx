import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import supabase, { auth, isDemo, lienEmail } from './supabaseClient';
import { traduireErreurAuth, motDePasseValide } from './lib/authErreurs';
import { captureException } from './lib/sentry';
import { demanderBienvenue } from './lib/bienvenue';
import { invitationEnAttente } from './lib/organisationActive';

// Eager load critical components
import Dashboard from './components/Dashboard';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import MenuPlus from './components/layout/MenuPlus';
import MenuCompte from './components/layout/MenuCompte';
import PastilleCompte from './components/layout/PastilleCompte';
import LandingPage from './components/landing/LandingPage';
import { logger } from './lib/logger';

// Stale bundle handler — auto-reload once when a chunk fails to load
const lazyWithRetry = (importFn, name) => lazy(() =>
  importFn().catch(err => {
    const msg = err?.message || '';
    const isStale = msg.includes('Failed to fetch') || msg.includes('ChunkLoadError') || msg.includes('Importing a module script failed');
    if (isStale) {
      const key = 'mallettico_chunk_reload';
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
    return { default: () => (
      <div role="alert" className="p-8 text-center text-danger-texte">
        Erreur de chargement : {name}
        <br />
        <button type="button" onClick={() => window.location.reload()} className="mt-4 h-11 px-5 rounded-full bg-accent text-sur-accent font-semibold">Recharger</button>
      </div>
    ) };
  })
);

// Lazy load heavy page components for code splitting
const Chantiers = lazyWithRetry(() => import('./components/Chantiers'), 'Chantiers');
const TasksAndPlanning = lazyWithRetry(() => import('./components/tasks/TasksAndPlanning'), 'Tâches');
const Clients = lazyWithRetry(() => import('./components/Clients'), 'Clients');
const NouveauMotDePasse = lazyWithRetry(() => import('./components/auth/NouveauMotDePasse'), 'Mot de passe');
const RetourModal = lazyWithRetry(() => import('./components/retours/RetourModal'), 'Retours');
const DevisPage = lazyWithRetry(() => import('./components/DevisPage'), 'DevisPage');
const Equipe = lazyWithRetry(() => import('./components/Equipe'), 'Équipe');
const Catalogue = lazyWithRetry(() => import('./components/Catalogue'), 'Catalogue');
const Settings = lazyWithRetry(() => import('./components/Settings'), 'Paramètres');
const AdminHelp = lazyWithRetry(() => import('./components/admin-help/AdminHelp'), 'AdminHelp');
const QuickClientModal = lazyWithRetry(() => import('./components/QuickClientModal'), 'QuickClient');
const QuickChantierModal = lazyWithRetry(() => import('./components/QuickChantierModal'), 'QuickChantier');
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette'), 'CommandPalette');
const ExportComptable = lazyWithRetry(() => import('./components/export/ExportComptable'), 'ExportComptable');
const CheckoutSuccess = lazyWithRetry(() => import('./components/subscription/CheckoutSuccess'), 'Checkout');
const AnalyticsPremium = lazyWithRetry(() => import('./components/AnalyticsPremium'), 'AnalyticsPremium');
const ImportModal = lazyWithRetry(() => import('./components/ImportModal'), 'Import');
const LegalPages = lazyWithRetry(() => import('./components/LegalPages'), 'Legal');
const Changelog = lazyWithRetry(() => import('./components/Changelog'), 'Changelog');
const FinancesPage = lazyWithRetry(() => import('./components/FinancesPage'), 'Finances');
// MemosPage replaced by TasksAndPlanning
const ShortcutsHelp = lazyWithRetry(() => import('./components/ShortcutsHelp'), 'Raccourcis');
// ClientPortal uses PortalLoader (manual dynamic import) instead of React.lazy
// to handle circular-dependency TDZ errors during module evaluation
import PortalLoader from './components/portal/PortalLoader';
const GarantiesDashboard = lazyWithRetry(() => import('./components/chantiers/GarantiesDashboard'), 'Garanties');
const PlanPage = lazyWithRetry(() => import('./components/profil/PlanPage'), 'Plan');
const DicteeModal = lazyWithRetry(() => import('./components/voice/DicteeModal'), 'Dictée');
import CGUAcceptanceModal from './components/CGUAcceptanceModal';
import { CGU_VERSION, CGU_VERSION_DATE } from './lib/cgu';
import { useConfirm, useToast } from './context/AppContext';
import { useData } from './context/DataContext';
import { useEntreprise } from './context/EntrepriseContext';
import { useOrg } from './context/OrgContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LogoMallettico from './components/ui/LogoMallettico';
import { ConfirmModal } from './components/ui/Modal';
import ToastContainer from './components/ui/ToastContainer';
import ModalContainer from './components/ui/ModalContainer';
import UpgradeModal from './components/subscription/UpgradeModal';
import TrialBanner from './components/subscription/TrialBanner';
import FeatureGuard from './components/subscription/FeatureGuard';
import { useSubscriptionStore } from './stores/subscriptionStore';
import { usePermissions } from './hooks/usePermissions';
import { fetchSubscription, computeLiveUsage } from './services/subscriptionsApi';
import { Home, FileText, Building2, Users, Package, HardHat, Settings as SettingsIcon, Eye, EyeOff, Menu, Bell, Plus, ChevronRight, HelpCircle, Search, X, CheckCircle, AlertCircle, Info, Wifi, WifiOff, Wallet, ClipboardList, Smartphone, CreditCard, MessageCircle, CalendarCheck, Mic, PenLine, Clock, TrendingUp, Lightbulb, Mail, BookOpen, Hand, Rocket, Palette } from 'lucide-react';
import { usePWA } from './hooks/usePWA';
import { registerNetworkListeners, getPendingCount, syncQueue, clearAllMutations, clearMutationsDe, checkConnectivity } from './lib/offline/sync';
import OfflineIndicator from './components/ui/OfflineIndicator';
import EntrepriseSwitcher from './components/ui/EntrepriseSwitcher';
import BandeauDonneesFictives from './components/ui/BandeauDonneesFictives';
import { estDonneesFictives } from './lib/donneesFictives';
import { FONCTIONS } from './lib/fonctions';
import { estNatif } from './lib/natif';
import { appliquerTheme, COULEUR_DOCUMENTS_DEFAUT } from './lib/theme';
import { dateEcheance, joursDeRetard, resteAPayer } from './lib/paiementsFacture';
import { estEnRetard, aTraiter, estUrgent, devisARelancer, joursDepuisEnvoi } from './lib/ventes';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './components/ui/Modal';
import EtatVide from './components/ui/EtatVide';
import { Bouton } from './components/ui/Bouton';
import { messageEcritureRefusee } from './lib/erreursEcriture';
import { jourLocal, dateLue } from './lib/dates';
import { joursAvantFin, chantierEnRetard } from './lib/echeanceChantier';
import { budgetChantier } from './lib/budgetChantier';
import { mentionsFacture } from './lib/mentionsFacture';
import PortailIndisponible from './components/portal/PortailIndisponible';

// Safe string renderer — prevents "Objects are not valid as React child" (#310)
const safeStr = (v, fallback = '') => {
  if (v == null) return fallback;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  if (typeof v === 'object') { return JSON.stringify(v); }
  return String(v);
};

// Notifications : un ton et une icône par nature (avant : des émojis ✅ ⚠️ ℹ️ 🔔 et un « Voir → » orange).
// Le rouge veut dire « en retard » (relecture du 25 oct. 2026) : seule une notification de retard (facture, chantier) le
// prend, dans la liste comme sur la cloche ; les autres alertes (perte, assurance expirée…) et « à relancer » : ambre.
const TONS_NOTIFICATION = {
  success: { icone: CheckCircle, classe: 'bg-succes-fond text-succes-texte' },
  warning: { icone: Clock, classe: 'bg-alerte-fond text-alerte-texte' },
  info: { icone: Info, classe: 'bg-info-fond text-info-texte' },
  message: { icone: MessageCircle, classe: 'bg-neutre-fond text-neutre-texte' },
  alert: { icone: AlertCircle, classe: 'bg-danger-fond text-danger-texte' },
};
const estNotifRetard = (n) => /^(facture-impayee|chantier-retard)-/.test(n?.id || '');
// Une alerte qui n'est pas un retard garde son icône, en ambre
const ALERTE_SANS_RETARD = { icone: AlertCircle, classe: 'bg-alerte-fond text-alerte-texte' };
const tonNotification = (n) => {
  if (estNotifRetard(n)) return TONS_NOTIFICATION.alert;
  if (n?.type === 'alert') return ALERTE_SANS_RETARD;
  return TONS_NOTIFICATION[n?.type] || TONS_NOTIFICATION.warning;
};
const TONS_TOAST = {
  success: { icone: CheckCircle, classe: 'bg-succes-fond text-succes-texte' },
  error: { icone: AlertCircle, classe: 'bg-danger-fond text-danger-texte' },
  warning: { icone: AlertCircle, classe: 'bg-alerte-fond text-alerte-texte' },
  info: { icone: Info, classe: 'bg-info-fond text-info-texte' },
};

// Noms des tables tels que l'artisan les connaît (bandeau d'échec de chargement).
const LIBELLES_TABLES = {
  clients: 'clients', chantiers: 'chantiers', devis: 'devis et factures', depenses: 'dépenses',
  equipe: 'équipe', pointages: 'pointages', catalogue: 'catalogue', planningEvents: 'planning',
  paiements: 'paiements', memos: 'tâches',
};

export default function App() {
  // Global context hooks
  const { confirm, confirmModal, closeConfirm } = useConfirm();
  const { showToast, toast, hideToast } = useToast();

  // RBAC: organization role + permissions
  const { canAccess, canAccessBilling, canViewPrices, canPerform, role: userRole, loading: orgLoading, orgId } = usePermissions();

  // PWA install hook
  const { canInstall, install, isInstalled } = usePWA();

  // Data from DataContext (replaces local state)
  const {
    clients, setClients, addClient: dataAddClient, updateClient: dataUpdateClient, deleteClient: dataDeleteClient,
    devis, setDevis, addDevis: dataAddDevis, updateDevis: dataUpdateDevis, deleteDevis: dataDeleteDevis,
    chantiers, setChantiers, addChantier: dataAddChantier, updateChantier: dataUpdateChantier, deleteChantier: dataDeleteChantier,
    depenses, addDepense: dataAddDepense, updateDepense: dataUpdateDepense, deleteDepense: dataDeleteDepense,
    pointages, setPointages, addPointage: dataAddPointage, updatePointage: dataUpdatePointage, deletePointage: dataDeletePointage,
    equipe, setEquipe, addEmployee: dataAddEmployee, updateEmployee: dataUpdateEmployee, deleteEmployee: dataDeleteEmployee,
    ajustements, addAjustement: dataAddAjustement, deleteAjustement: dataDeleteAjustement,
    catalogue, setCatalogue, addCatalogueItem: dataAddCatalogueItem, updateCatalogueItem: dataUpdateCatalogueItem, deleteCatalogueItem: dataDeleteCatalogueItem, deductStock,
    paiements, addPaiement: dataAddPaiement,
    echanges, addEchange: dataAddEchange,
    planningEvents, setPlanningEvents, addPlanningEvent: dataAddPlanningEvent, updatePlanningEvent: dataUpdatePlanningEvent, deletePlanningEvent: dataDeletePlanningEvent,
    memos, addMemo, updateMemo, deleteMemo, toggleMemo,
    getChantierBilan,
    generateNextNumero,
    loadError, retryLoad, rechargerDonnees,
    rejouerEcriture, userId: compteId,
    exigerCgu: exigerCguData, enregistrerGardeCgu,
  } = useData();

  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // /inscription et /connexion (liens de la vitrine) ouvrent directement le formulaire
  const [showSignUp, setShowSignUp] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/inscription');
  const [authForm, setAuthForm] = useState({ email: '', password: '', nom: '' });
  // Case des conditions à l'inscription (C. civ. 1119 ; relecture juriste du 25 oct. 2026, R-G1) : jamais cochée d'avance
  const [accepteConditions, setAccepteConditions] = useState(false);
  // Un lien e-mail expiré arrive avec #error=… : on l'explique sur l'écran de connexion.
  const [authError, setAuthError] = useState(() => (lienEmail.erreur ? traduireErreurAuth(lienEmail.erreur) : ''));
  const [authInfo, setAuthInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  // Une invitation à rejoindre une équipe, gardée pendant l'inscription ou la connexion
  // (page /invitation/:jeton) : l'écran de connexion l'annonce, et une fois connecté on y revient.
  const [invitation] = useState(() => (isDemo ? null : invitationEnAttente()));
  const versInvitation = !!(user && invitation);
  useEffect(() => {
    if (versInvitation) window.location.replace(`/invitation/${invitation.token}`);
  }, [versInvitation, invitation]);
  // Une fois connecté depuis /connexion ou /inscription, l'adresse redevient « / »
  useEffect(() => {
    if (user && !versInvitation && ['/connexion', '/inscription'].includes(window.location.pathname)) window.history.replaceState({}, '', '/');
  }, [user, versInvitation]);
  // Arrivée par le lien « réinitialiser le mot de passe » : on demande le nouveau avant tout.
  const [recoveryMode, setRecoveryMode] = useState(lienEmail.recuperation);

  // UI state - persist page in localStorage to survive refresh
  const [page, setPageRaw] = useState(() => {
    try {
      const savedPage = localStorage.getItem('cp_current_page');
      // Page éteinte depuis (portail client, src/lib/fonctions.js) : retour à l'accueil, pas un écran vide
      if (savedPage === 'client-portal' && !FONCTIONS.portailClient) return 'dashboard';
      return savedPage || 'dashboard';
    } catch { return 'dashboard'; }
  });
  const isPopstateNav = useRef(false);
  // Le droit de créer un chantier, relu à chaque rendu pour le raccourci clavier (son effet ne se rejoue pas)
  const peutCreerChantierRef = useRef(false);
  peutCreerChantierRef.current = canPerform('chantier', 'create');
  const setPage = useCallback((newPage) => {
    setPageRaw(prev => {
      if (prev === newPage) return prev;
      // If this navigation comes from back/forward button, don't push state
      if (!isPopstateNav.current) {
        try { window.history.pushState({ page: newPage }, '', ''); } catch { /* historique indisponible : la navigation reste fonctionnelle */ }
      }
      isPopstateNav.current = false;
      return newPage;
    });
  }, []);

  // La page courante est persistée par NAVIGATEUR (cp_current_page) : si un autre
  // utilisateur se connecte sur le même poste, il hériterait de la dernière page du
  // compte précédent (ex : atterrir sur « Mon Plan »). On repart sur l'Accueil.
  useEffect(() => {
    if (!user?.id) return;
    try {
      const owner = localStorage.getItem('cp_page_owner');
      if (owner !== user.id) {
        localStorage.setItem('cp_page_owner', user.id);
        if (owner) setPage('dashboard');
      }
    } catch { /* noop */ }
  }, [user?.id, setPage]);

  const [menuPlus, setMenuPlus] = useState(false); // « Plus » de la barre du bas (téléphone) : feuille des autres rubriques
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [createMode, setCreateMode] = useState({ devis: false, chantier: false, client: false });
  const [showDictee, setShowDictee] = useState(false);
  const [editDevisId, setEditDevisId] = useState(null); // devis à ouvrir directement dans l'éditeur (dictée)
  // Multi-entreprise context
  const {
    activeEntreprise,
    entrepriseId,
    hasMultiple: hasMultipleEntreprises,
    switchEntreprise,
    refreshEntreprises,
    updateEntreprise: ctxUpdateEntreprise,
    addEntreprise: ctxAddEntreprise,
    loading: entrepriseLoading,
  } = useEntreprise();
  // Adhésion illisible : rôle le plus faible (OrgContext), et on le dit
  const { droitsNonCharges } = useOrg();

  // Entreprise defaults — fallback when context hasn't loaded yet.
  // nom stays EMPTY: never inject a placeholder company name (it would leak
  // onto a new user's devis/PDF as "Mallettico"). The "Profil incomplet" nudge
  // prompts them to fill it.
  const ENTREPRISE_DEFAULTS = {
    nom: '', logo: '', couleur: COULEUR_DOCUMENTS_DEFAUT,
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

  // setEntreprise: backward-compat wrapper that updates via context.
  // On a brand-new account there is no entreprise row yet (nothing provisions
  // one at signup) — so the FIRST save creates it. Without this, every settings
  // save silently no-op'd (statut juridique, etc.) and data was lost on reload.
  // Recette du 8 oct. 2026 : une saisie faite PENDANT cette création était ignorée (adresse perdue
  // au premier remplissage du profil). Elle est maintenant gardée et appliquée dès que la fiche
  // existe ; les saisies successives s'additionnent (brouillon) au lieu de repartir des valeurs
  // par défaut. Les erreurs remontent à l'appelant (Paramètres les affiche).
  const creationEntRef = useRef(null);
  const brouillonEntRef = useRef(null);
  const enAttenteEntRef = useRef(null);
  useEffect(() => { if (entrepriseId) brouillonEntRef.current = null; }, [entrepriseId]);
  const setEntreprise = useCallback((updater) => {
    const base = !entrepriseId && brouillonEntRef.current ? brouillonEntRef.current : entreprise;
    const newVal = typeof updater === 'function' ? updater(base) : updater;
    // Rappels de ramonage et relances envoyés par e-mail au nom de l'artisan : leur activation demande les conditions
    // d'utilisation, par la garde unique de DataContext (relecture juriste du 25 oct. 2026, G3)
    // (relances : leur activation, et l'envoi « 100 % automatique », seul à faire partir les e-mails sans un clic)
    const activeEnvois = (!base?.ramonageEnvoiAuto && newVal?.ramonageEnvoiAuto)
      || (!base?.relanceConfig?.enabled && newVal?.relanceConfig?.enabled)
      || (!base?.relanceConfig?.autoSend && newVal?.relanceConfig?.autoSend);
    if (activeEnvois && !newVal?.__cguVerifiees) {
      return exigerCguData('envois').then((ok) => {
        if (ok) return setEntreprise({ ...newVal, __cguVerifiees: true });
        showToast('Envois automatiques non activés : les conditions d’utilisation n’ont pas été acceptées.', 'info');
        return false;
      });
    }
    if (newVal && newVal.__cguVerifiees) delete newVal.__cguVerifiees;
    if (entrepriseId) return ctxUpdateEntreprise(entrepriseId, newVal);
    brouillonEntRef.current = newVal;
    if (creationEntRef.current) {
      enAttenteEntRef.current = newVal;
      return creationEntRef.current;
    }
    creationEntRef.current = (async () => {
      const creee = await ctxAddEntreprise?.({ ...newVal, nom: newVal?.nom || '' });
      const enAttente = enAttenteEntRef.current;
      enAttenteEntRef.current = null;
      if (enAttente && creee?.id) await ctxUpdateEntreprise(creee.id, enAttente);
    })().finally(() => { creationEntRef.current = null; });
    return creationEntRef.current;
  }, [entreprise, entrepriseId, ctxUpdateEntreprise, ctxAddEntreprise, exigerCguData, showToast]);
  // Track which notification IDs have been read (persisted in localStorage)
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_read_notifs') || '[]'); } catch { return []; }
  });
  const [planningPrefill, setPlanningPrefill] = useState(null);
  // Déclaré avant les notifications, qui masquent leurs montants en mode discret
  const [modeDiscret, setModeDiscret] = useState(false);

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

    // Montants : masqués en mode discret ; devis, factures et marges : seulement pour un rôle qui voit les finances
    // (avant, recette du 9 oct. 2026 : la cloche d'un ouvrier listait les factures impayées et leurs montants)
    const voitFinances = canAccess('finances');
    // Budget, marge et montants d'un chantier : le droit de voir les prix (usePermissions), le même partout
    const voitPrix = canViewPrices;
    const montant = (n) => (modeDiscret ? '•••' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0));

    // 1. Devis à relancer : la règle de la pastille et de l'Accueil (src/lib/ventes.js) — compté depuis l'envoi, jamais
    //    expiré. Les factures ont leur propre alerte, ci-dessous (avant, une facture payée apparaissait ici « à relancer »).
    (devis || []).forEach(d => {
      if (voitFinances && devisARelancer(d, now, entreprise)) {
        const age = joursDepuisEnvoi(d, now);
        const cn = clientName(d.client_id);
        items.push({
          id: `devis-stale-${d.id}`,
          message: `Devis ${d.numero || ''} envoyé à ${cn || 'un client'} depuis ${age} jours — à relancer`,
          date: relDate(d.date_envoi || d.date),
          type: 'warning',
          link: 'devis',
          itemId: d.id,
          itemType: 'devis',
          sortDate: new Date(d.date_envoi || d.date),
          priority: 2,
        });
      }
    });

    // 2. Factures en retard : échéance passée et reste dû, comme l'Accueil (src/lib/ventes.js). Avant (recette
    //    du 9 oct.) : statut brut et date d'émission — des factures payées « impayées depuis 34 jours », au total TTC.
    (devis || []).forEach(d => {
      if (voitFinances && estEnRetard(d, paiements, now)) {
        const jours = joursDeRetard(d, paiements, now);
        const cn = clientName(d.client_id);
        items.push({
          id: `facture-impayee-${d.id}`,
          message: `Facture ${d.numero || ''} en retard de ${jours} jour${jours > 1 ? 's' : ''}${cn ? ` (${cn})` : ''} — reste ${montant(resteAPayer(d, paiements))}`,
          date: relDate(d.date),
          type: 'alert',
          link: 'devis',
          itemId: d.id,
          itemType: 'facture',
          sortDate: new Date(d.date),
          priority: 1,
        });
      }
    });

    // 3. Devis récemment acceptés (last 7 days)
    (devis || []).forEach(d => {
      if (voitFinances && d.type !== 'facture' && (d.statut === 'accepte' || d.statut === 'signe') && d.date) {
        const age = Math.floor((now - new Date(d.date)) / 86400000);
        if (age <= 7) {
          const cn = clientName(d.client_id);
          items.push({
            id: `devis-accepte-${d.id}`,
            message: `Devis ${d.numero || ''} accepté${cn ? ` par ${cn}` : ''}`,
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

    // 4. Chantiers en retard : LA règle de la liste et de la fiche (src/lib/echeanceChantier.js). Seul un chantier en cours
    //    dont la fin prévue est passée est en retard (rouge) ; le jour même, c'est « à surveiller » (ambre), jamais un retard.
    (chantiers || []).forEach(ch => {
      if (ch.statut !== 'en_cours') return;
      const jours = joursAvantFin(ch, now);
      if (jours === null || jours > 0) return;
      const finPrevue = ch.date_fin || ch.dateFin;
      const retard = chantierEnRetard(ch, now);
      items.push({
        id: retard ? `chantier-retard-${ch.id}` : `chantier-echeance-${ch.id}`,
        message: retard
          ? `Chantier "${ch.nom || 'Sans nom'}" en retard de ${-jours} jour${-jours > 1 ? 's' : ''}`
          : `Chantier "${ch.nom || 'Sans nom'}" : fin prévue aujourd'hui`,
        date: relDate(finPrevue),
        type: retard ? 'alert' : 'warning',
        link: 'chantiers',
        itemId: ch.id,
        itemType: 'chantier',
        sortDate: dateLue(String(finPrevue).slice(0, 10)),
        priority: retard ? 1 : 2,
      });
    });

    // 5. Chantiers avec marge négative
    (chantiers || []).forEach(ch => {
      if (voitPrix && ch.statut === 'en_cours' && getChantierBilan) {
        const bilan = getChantierBilan(ch.id);
        if (bilan && bilan.margeBrute < 0) {
          items.push({
            id: `chantier-perte-${ch.id}`,
            message: `Chantier "${ch.nom || 'Sans nom'}" en perte (marge : ${montant(bilan.margeBrute)})`,
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

    // 8. Budget presque consommé : 90 % du budget du chantier (src/lib/budgetChantier.js) déjà dépensés, comme la carte de la liste.
    //    Ambre (« à surveiller »), jamais rouge ; au-delà du budget la marge est négative et l'alerte « en perte » (5) le dit déjà.
    //    Avant : la règle lisait `ch.budget`, un champ qui n'existe pas — elle ne s'est jamais déclenchée.
    (chantiers || []).forEach(ch => {
      if (!voitPrix || ch.statut !== 'en_cours' || !getChantierBilan) return;
      const bilan = getChantierBilan(ch.id);
      const budget = budgetChantier(ch, bilan);
      if (!bilan || budget <= 0 || bilan.margeBrute < 0) return;
      if (!(bilan.totalDepenses > budget * 0.9)) return; // la règle de la carte de la liste : plus de 90 % dépensés
      const pct = Math.round((bilan.totalDepenses / budget) * 100);
      items.push({
        id: `budget-alerte-${ch.id}`,
        message: `Budget presque consommé sur "${ch.nom || 'Sans nom'}" (${pct} % dépensé)`,
        date: 'Budget à surveiller',
        type: 'warning',
        link: 'chantiers',
        itemId: ch.id,
        itemType: 'chantier',
        sortDate: now,
        priority: 2,
      });
    });

    // Sort by priority (1=urgent) then date (newest first), limit to 20
    items.sort((a, b) => (a.priority - b.priority) || (b.sortDate - a.sortDate));
    return items.slice(0, 20).map(n => ({
      ...n,
      read: readNotifIds.includes(n.id),
    }));
  }, [devis, paiements, chantiers, clients, entreprise, getChantierBilan, readNotifIds, canAccess, canViewPrices, modeDiscret]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [menuCompte, setMenuCompte] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showRetour, setShowRetour] = useState(false);
  // Demande faite à la page Devis & factures depuis ailleurs (Accueil, recherche) : { relancer: id } ouvre la fiche et
  // la feuille « Relancer » ; { etat } ou { nature } ouvre la liste filtrée (audit UX du 20 oct. 2026 : « Relancer » et
  // « Finaliser » de l'Accueil n'ouvraient que la fiche, ou la liste non filtrée)
  const [demandeDevis, setDemandeDevis] = useState(null);
  const [showFABQuickClient, setShowFABQuickClient] = useState(false);
  const [showFABQuickChantier, setShowFABQuickChantier] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true); // Optimistic: assume online, verify via ping
  const [pendingSync, setPendingSync] = useState(0);
  const [syncErrorDetails, setSyncErrorDetails] = useState(null); // { message, failedCount, permanentCount }
  const syncRetryTimerRef = useRef(null);
  const synchroRef = useRef(null);
  const syncRetryAttemptRef = useRef(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !isDemo && !localStorage.getItem('mallettico_onboarding_complete'));
  const [showLanding, setShowLanding] = useState(() => typeof window === 'undefined' || !['/connexion', '/inscription'].includes(window.location.pathname));
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('clients');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Settings state (entreprise declared earlier, before notifications useMemo)
  const [theme, setTheme] = useState('light');

  // CGU (LEGAL-001). Décision du 25 oct. 2026 (relecture juriste, C. civ. 1119) : acceptées à l'INSCRIPTION, par une case,
  // et enregistrées pour chaque utilisateur dans les métadonnées de son compte (cgu_version, cgu_accepted_at). La garde
  // unique est dans DataContext (exigerCgu) : tout document et toute attestation y passent ; App y enregistre la fonction
  // ci-dessous, qui ouvre la fenêtre d'acceptation pour les cas restants :
  // - un compte créé avant la case (rien dans ses métadonnées, rien sur la fiche de l'entreprise) ;
  // - une nouvelle version des CGU.
  // Un membre invité accepte pour lui-même (ses métadonnées) : il n'a plus besoin d'écrire la fiche de l'entreprise.
  // Jamais en démo. Avant (retour d'Hugo sur « Au Bon Volt »), la fenêtre surgissait au premier réglage enregistré.
  const [demandeCgu, setDemandeCgu] = useState(null); // { resolve, motif, geste }
  const cguRef = useRef({ aJour: true, motif: 'premier', chargement: false });
  cguRef.current = {
    aJour: isDemo || !user
      || user?.user_metadata?.cgu_version === CGU_VERSION
      || (!!entreprise.cguAcceptedAt && entreprise.cguVersion === CGU_VERSION),
    motif: user?.user_metadata?.cgu_version || entreprise.cguAcceptedAt ? 'version' : 'premier',
    // Fiche de l'entreprise pas encore lue : on attend de savoir (avant, « en chargement » valait « accepté »)
    chargement: entrepriseLoading,
  };
  const verifierCgu = useCallback(async (geste = 'document') => {
    for (let i = 0; i < 50 && cguRef.current.chargement && !cguRef.current.aJour; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const { aJour, motif } = cguRef.current;
    if (aJour) return true;
    return new Promise((resolve) => setDemandeCgu({ resolve, motif, geste }));
  }, []);
  useEffect(() => {
    enregistrerGardeCgu?.(verifierCgu);
    return () => enregistrerGardeCgu?.(null);
  }, [enregistrerGardeCgu, verifierCgu]);
  // Rend true, ou le message qui dit pourquoi l'acceptation n'a pas été enregistrée (la fenêtre reste ouverte)
  const accepterCgu = async (version) => {
    const acceptation = { cgu_version: version, cgu_accepted_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.auth.updateUser({ data: acceptation });
      if (error) throw error;
      if (data?.user) setUser(data.user);
    } catch (err) {
      captureException(err, { context: 'acceptation des CGU' });
      const reseau = !navigator.onLine || /fetch|network|réseau/i.test(String(err?.message || err?.name || ''));
      return reseau
        ? 'Acceptation non enregistrée. Vérifiez votre connexion, puis réessayez.'
        : `Acceptation non enregistrée : ${traduireErreurAuth(err)}`;
    }
    demandeCgu?.resolve(true);
    setDemandeCgu(null);
    return true;
  };
  const annulerCgu = () => { demandeCgu?.resolve(false); setDemandeCgu(null); };

  // CRUD wrappers with toasts (delegate to DataContext)
  // Chaque enveloppe n'annonce un succès que si la base a confirmé (ou mis en attente de réseau, ce que
  // DataContext dit lui-même) ; en cas de refus, DataContext a déjà affiché pourquoi. Elles rendent le résultat.
  const addClient = async (data) => { const c = await dataAddClient(data); if (c) showToast(`Client "${data.nom}" ajouté`, 'success'); return c; };
  const updateClient = async (id, data) => { const ok = await dataUpdateClient(id, data); if (ok) showToast(`Client "${data.nom || 'mis à jour'}" modifié`, 'success'); return ok; };
  const deleteClient = async (id) => { const ok = await dataDeleteClient(id); if (ok) showToast('Client supprimé', 'success'); return ok; };
  // Une facture sans échéance en reçoit une à sa création, selon ses conditions de règlement ou le délai
  // de l'entreprise (art. L441-9 I C. com. : la date de règlement figure sur la facture).
  // silencieux : la page qui crée le document (acompte, solde, avoir) dit déjà ce qui s'est passé (audit § 2.6). Les
  // conditions d'utilisation sont vérifiées par DataContext (garde unique).
  const addDevis = async (data, { silencieux = false } = {}) => {
    const avecEcheance = data?.type === 'facture' && !data.date_echeance && data.facture_type !== 'avoir'
      ? { ...data, date_echeance: dateEcheance(data.date || new Date(), { conditionsPaiement: data.conditionsPaiement || data.conditions, delaiJours: entreprise?.delaiPaiement }) }
      : data;
    const d = await dataAddDevis(avecEcheance);
    if (d && !silencieux) showToast(`${data.facture_type === 'avoir' ? 'Avoir créé' : data.type === 'facture' ? 'Facture créée' : 'Devis créé'}`, 'success');
    return d;
  };
  // silencieux : un envoi (e-mail, SMS, WhatsApp) enregistre aussi le statut et la date d'envoi ; « Document mis à
  // jour », arrivé après, remplaçait « Devis envoyé à … » (rapport de la Task 4 « ancien code », 24 oct. 2026)
  const updateDevis = async (id, data, { silencieux = false } = {}) => { const ok = await dataUpdateDevis(id, data); if (ok && !silencieux) showToast('Document mis à jour', 'success'); return ok; };
  const deleteDevis = async (id) => { const ok = await dataDeleteDevis(id); if (ok) showToast('Document supprimé', 'info'); return ok; };
  const addChantier = async (data) => { const c = await dataAddChantier(data); if (c) showToast(`Chantier "${data.nom}" créé`, 'success'); return c; };
  // { silencieux: true } : le geste dit déjà ce qu'il a fait (« Chantier archivé », « Photo ajoutée ») ; un seul message
  const updateChantier = async (id, data, { silencieux = false } = {}) => { const ok = await dataUpdateChantier(id, data); if (ok && !silencieux) showToast('Chantier mis à jour', 'success'); return ok; };
  const addAjustement = async (data) => { const a = await dataAddAjustement(data); if (a) showToast('Ajustement enregistré', 'success'); return a; };
  const deleteAjustement = async (id) => { const ok = await dataDeleteAjustement(id); if (ok) showToast('Ajustement supprimé', 'info'); return ok; };
  // silencieux : l'action principale (envoi, relance) a déjà dit ce qui s'est passé ; « Échange ajouté », arrivé après,
  // remplaçait son message (audit UX du 20 oct. 2026, § 2.6)
  const addEchange = async (data, { silencieux = false } = {}) => { const e = await dataAddEchange(data); if (e && !silencieux) showToast('Échange ajouté', 'success'); return e; };
  const addPaiement = async (data) => {
    const p = await dataAddPaiement(data);
    const montant = Number(data.amount ?? data.montant) || 0;
    // Une correction d'encaissement (098) est un montant négatif : la dire comme telle
    const euros = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p) showToast(montant < 0 ? `Correction de ${euros(-montant)} € enregistrée` : `Paiement de ${euros(montant)} € enregistré`, 'success');
    return p;
  };
  const addEmployee = async (data) => { const e = await dataAddEmployee(data); if (e) showToast(`Employé "${data.prenom || ''} ${data.nom || ''}" ajouté`, 'success'); return e; };
  const updateEmployee = async (id, data) => dataUpdateEmployee(id, data);
  const deleteEmployee = async (id) => { const ok = await dataDeleteEmployee(id); if (ok) showToast('Employé supprimé', 'success'); return ok; };
  const addPointage = async (data) => dataAddPointage(data);
  const addCatalogueItem = async (data) => { const c = await dataAddCatalogueItem(data); if (c) showToast('Article ajouté au catalogue', 'success'); return c; };
  const updateCatalogueItem = async (id, data) => dataUpdateCatalogueItem(id, data);
  const deleteCatalogueItem = async (id) => { const ok = await dataDeleteCatalogueItem(id); if (ok) showToast('Article supprimé du catalogue', 'success'); return ok; };
  const addEvent = async (data) => { const e = await dataAddPlanningEvent(data); if (e) showToast('Événement ajouté', 'success'); return e; };
  const updateEvent = async (id, data) => dataUpdatePlanningEvent(id, data);
  const deleteEvent = async (id) => { const ok = await dataDeletePlanningEvent(id); if (ok) showToast('Événement supprimé', 'info'); return ok; };

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
    logger.debug(`[Sync] Auto-retry #${attempt + 1} scheduled in ${delay / 1000}s`);
    syncRetryTimerRef.current = setTimeout(() => {
      syncRetryTimerRef.current = null;
      syncRetryAttemptRef.current = attempt + 1;
      synchroRef.current?.().catch(err => console.warn('Auto-retry sync failed:', err));
    }, delay);
  }, []);

  // Manual sync handler for offline queue
  // Appelée aussi par une minuterie et par l'écoute du réseau, posées une seule fois : elles passent par
  // `synchroRef` pour toujours appeler la version courante (compte connecté, données chargées).
  const handleManualSync = async () => {
    try {
      // In demo mode, just clear the queue — no Supabase to sync to
      if (isDemo) {
        await clearAllMutations();
        setPendingSync(0);
        setSyncErrorDetails(null);
        return;
      }

      if (!compteId) return; // pas de compte connecté : rien à rejouer
      const results = await syncQueue(rejouerEcriture, { proprietaire: compteId });

      // Always refresh counter after sync
      const count = await getPendingCount(compteId);
      setPendingSync(count);

      if (results.success > 0) {
        showToast(`${results.success} modification${results.success > 1 ? 's' : ''} synchronisée${results.success > 1 ? 's' : ''}`, 'success');
      }

      // Show specific info about cleared/rejected mutations
      const permanentErrors = results.errors?.filter(e => e.permanent) || [];
      if (permanentErrors.length > 0) {
        // Le motif du premier refus (avant : « rejetée et supprimée » sans dire pourquoi ; relecture juriste-btp du
        // 18 oct. 2026 — une facture « payée » hors ligne, refusée au retour du réseau, doit se voir)
        const n = permanentErrors.length;
        showToast(`${n} modification${n > 1 ? 's' : ''} gardée${n > 1 ? 's' : ''} sur cet appareil, refusée${n > 1 ? 's' : ''} par la base : ${messageEcritureRefusee(permanentErrors[0].cause || { message: permanentErrors[0].error })}`, 'error');
        // L'écran affichait ce qui vient d'être refusé : on relit la base, seulement si plus rien n'attend dans la file
        // (sinon les écritures encore en attente disparaîtraient de l'écran jusqu'à leur envoi — relecture
        // gardien-securite du 18 oct. 2026)
        if (count === 0) rechargerDonnees?.();
      } else if (results.success > 0 && count === 0) {
        // Écritures rejouées : la base a pu les compléter (numéro de facture attribué à l'enregistrement, migration 101 ;
        // montant encaissé, 098) — on relit une fois la file vide
        rechargerDonnees?.();
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
        const count = await getPendingCount(compteId);
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
      try {
        localStorage.setItem('cp_entreprise', JSON.stringify(entreprise));
        // Copie venue de la base : la migration des fiches d'avant la synchronisation (detectMigrationNeeded)
        // ne doit jamais la recréer ailleurs. Sinon, en arrivant dans une organisation sans fiche (bascule
        // d'organisation, autre compte sur le même téléphone), elle y recopiait celle-ci, IBAN compris
        // (constaté en parcours le 11 oct. 2026).
        localStorage.setItem('mallettico_entreprise_migrated', 'true');
      } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
    }
  }, [entreprise, activeEntreprise]);
  // Visiteur anonyme de la vitrine : rien n'est écrit sur son appareil (ni préférences, ni page, ni base hors ligne)
  // tant qu'il n'est pas connecté (relecture du 25 oct. 2026). Les écritures reprennent à la connexion.
  const visiteurAnonyme = !user && !isDemo;
  useEffect(() => { if (visiteurAnonyme) return; try { localStorage.setItem('cp_theme', theme); } catch (e) { console.warn('Failed to save theme:', e.message); } }, [theme, visiteurAnonyme]);
  // Racine du thème : data-theme + accent lisible sur <html>, lus par les primitives de ui/ (src/lib/theme.js).
  useEffect(() => { appliquerTheme(document.documentElement, { sombre: theme === 'dark', couleur: entreprise?.couleur }); }, [theme, entreprise?.couleur]);
  useEffect(() => { if (visiteurAnonyme) return; try { localStorage.setItem('cp_mode_discret', JSON.stringify(modeDiscret)); } catch (e) { console.warn('Failed to save modeDiscret:', e.message); } }, [modeDiscret, visiteurAnonyme]);
  useEffect(() => {
    logger.debug('[NAV] page changed to:', page);
    if (visiteurAnonyme) return;
    try { localStorage.setItem('cp_current_page', page); } catch (e) { console.warn('Failed to save page:', e.message); }
  }, [page, visiteurAnonyme]);

  // Browser history: support back/forward buttons in this SPA
  useEffect(() => {
    // Set initial history state so back button has something to go to
    try { window.history.replaceState({ page }, '', ''); } catch { /* historique indisponible : la navigation reste fonctionnelle */ }

    const handlePopstate = (event) => {
      const target = event.state?.page;
      if (target) {
        isPopstateNav.current = true;
        setPage(target);
        setMenuPlus(false);
      }
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // RBAC: redirect to dashboard if user accesses a restricted page
  useEffect(() => {
    if (orgLoading) return; // Wait for org resolution
    const publicPages = ['dashboard', 'profil', 'plan', 'pricing', 'checkout-success', 'cgv', 'cgu', 'confidentialite', 'mentions-legales', 'accessibilite', 'supprimer-mon-compte', 'changelog'];
    // Billing is restricted to owner only
    if ((page === 'billing') && !canAccessBilling) {
      logger.debug('[RBAC] Billing restricted to owner, redirecting → dashboard');
      setPage('dashboard');
      return;
    }
    if (!publicPages.includes(page) && !canAccess(page)) {
      logger.debug('[RBAC] Redirecting from restricted page:', page, '→ dashboard');
      setPage('dashboard');
    }
  }, [page, canAccess, canAccessBilling, orgLoading]);


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
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        if (session?.user) setUser(session.user);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        // Un invité ne reçoit pas « configurez votre entreprise » : il rejoint celle qui l'invite
        if (!invitationEnAttente()) demanderBienvenue(supabase, session.user);
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
        const { data: subData, error: subError } = await fetchSubscription(orgId);
        if (!cancelled && subData) setSubscriptionData(subData);
        // Réseau coupé : on garde l'état courant et on relit au retour de la connexion,
        // sinon un abonné payant resterait affiché en « Gratuit » jusqu'au rechargement.
        if (!cancelled && !subData && subError) window.addEventListener('online', initSubscription, { once: true });
        // L'usage n'est PAS relu ici : il est recalculé en direct depuis les
        // données (voir plus bas). L'ancien fetchUsage renvoyait des zéros en
        // dur qui écrasaient ce calcul, et aucune limite ne s'appliquait.
      } catch (err) {
        console.warn('Subscription init error:', err?.message || err);
      }
    };
    if (user) initSubscription();
    return () => { cancelled = true; };
  }, [user, orgId, setSubscriptionData]);

  // Retour de Stripe Checkout. La fonction subscription-billing renvoie vers ?upgraded=true
  // (et ?upgrade_cancelled=true) ; seul ?billing=success était traité, si bien qu'après avoir payé
  // l'artisan revenait sans confirmation, et souvent encore affiché en « Gratuit ».
  const [attenteActivation, setAttenteActivation] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const succes = params.get('upgraded') === 'true' || params.get('billing') === 'success';
    const annule = params.get('upgrade_cancelled') === 'true';
    if (!succes && !annule) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (annule) { showToast('Paiement annulé : aucun montant n’a été prélevé.', 'info'); return; }
    setPage('checkout-success');
    setAttenteActivation(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- lecture unique de l'URL au chargement

  // Le webhook Stripe peut arriver quelques secondes après le retour : on relit l'abonnement
  // jusqu'à voir le plan payant (20 s au plus), au lieu d'afficher l'ancien plan.
  useEffect(() => {
    if (!attenteActivation || !user) return;
    let essais = 0;
    const minuteur = setInterval(async () => {
      essais += 1;
      const { data } = await fetchSubscription(orgId);
      if (data && data.plan && data.plan !== 'gratuit') {
        setSubscriptionData(data);
        setAttenteActivation(false);
      } else if (essais >= 10) {
        setAttenteActivation(false);
        showToast('Paiement reçu. L’activation de votre plan peut prendre une minute : rechargez la page si besoin.', 'info');
      }
    }, 2000);
    return () => clearInterval(minuteur);
  }, [attenteActivation, user, orgId, setSubscriptionData, showToast]);

  // Listen for storage-based page navigation (used by UpgradeModal "Voir tous les plans")
  useEffect(() => {
    const handleStorage = () => {
      try {
        const p = localStorage.getItem('cp_current_page');
        if (p && p !== page) setPage(p);
      } catch { /* localStorage inaccessible : la navigation inter-onglets est un confort */ }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [page]);

  // Bouton retour d'Android (app native) : revenir à l'accueil avant de quitter l'app,
  // au lieu de la fermer d'un coup depuis n'importe quelle page.
  useEffect(() => {
    if (!estNatif()) return undefined;
    let actif = true;
    let poignee = null;
    import('@capacitor/app').then(({ App: AppNatif }) => AppNatif.addListener('backButton', () => {
      if (page !== 'dashboard') setPage('dashboard');
      else AppNatif.exitApp();
    })).then((h) => { if (actif) poignee = h; else h.remove(); });
    return () => { actif = false; poignee?.remove(); };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps -- setPage est stable

  // Redirect legacy page IDs to new consolidated pages
  // Must depend on [page] so redirects fire whenever page changes (not just on mount)
  useEffect(() => {
    const REDIRECTS = {
      ouvrages: 'catalogue', bibliotheque: 'catalogue',
      profil: 'settings',
      tresorerie: 'finances', entretien: 'dashboard',
      signatures: 'devis', export: 'finances', analytique: 'finances',
      admin: 'settings', rentabilite: 'settings',
      // Abonnement : « Mon plan » (l'écran Facturation n'est plus atteint ; avant, billing menait à profil puis aux Paramètres)
      pricing: 'plan', billing: 'plan',
    };
    if (REDIRECTS[page]) setPage(REDIRECTS[page]);
  }, [page]);

  // Keep usage in sync with live data counts
  useEffect(() => {
    const liveUsage = computeLiveUsage({ clients, devis, chantiers, equipe });
    setUsageData(liveUsage);
  }, [clients.length, devis.length, chantiers.length, equipe.length, setUsageData]);

  // Auth handlers
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthInfo('');
    setIsSubmitting(true);
    try {
      const { error } = await auth.signIn(authForm.email, authForm.password);
      if (error) setAuthError(traduireErreurAuth(error));
    } catch (e) {
      captureException(e, { context: 'connexion' });
      setAuthError(traduireErreurAuth(e, 'Erreur de connexion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthInfo('');
    const email = authForm.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAuthError('Saisissez l’adresse e-mail de votre compte.'); return; }
    setIsSubmitting(true);
    try {
      const { error } = await auth.resetPassword(email);
      if (error) setAuthError(traduireErreurAuth(error));
      // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
      else setAuthInfo(`Si un compte existe pour ${email}, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe (valable 1 heure). Pensez aux indésirables.`);
    } catch (err) {
      captureException(err, { context: 'mot de passe oublié' });
      setAuthError(traduireErreurAuth(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthInfo('');
    if (!accepteConditions) {
      setAuthError('Cochez la case pour accepter les conditions d\'utilisation et créer votre compte.');
      return;
    }
    if (!motDePasseValide(authForm.password)) {
      setAuthError('Mot de passe : au moins 8 caractères, avec des lettres et des chiffres.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Un invité revient sur son invitation en ouvrant le lien de confirmation
      // L'acceptation des CGU est enregistrée dans les métadonnées du compte : la date et la version cochées
      const { data, error } = await auth.signUp(authForm.email, authForm.password, { nom: authForm.nom, cgu_version: CGU_VERSION, cgu_accepted_at: new Date().toISOString() }, invitation ? `/invitation/${invitation.token}` : '/');
      if (error) setAuthError(traduireErreurAuth(error));
      else {
        // Sans session, Supabase attend la confirmation de l'adresse : le dire, sinon l'artisan
        // essaie de se connecter et reçoit « adresse non confirmée » sans comprendre.
        if (data?.session) showToast('Compte créé ✓', 'success');
        else if (invitation) setAuthInfo(`Compte créé. Ouvrez le lien envoyé à ${authForm.email} (pensez aux indésirables) : il vous ramène à l'invitation pour rejoindre ${invitation.organisation || "l'équipe"}.`);
        else setAuthInfo(`Compte créé. Confirmez votre adresse en ouvrant le lien envoyé à ${authForm.email}, puis connectez-vous.`);
        setShowSignUp(false);
        // L'e-mail de bienvenue part à la première connexion (demanderBienvenue, SIGNED_IN) :
        // ici il n'y a souvent pas encore de session.
      }
    } catch (e) {
      captureException(e, { context: 'inscription' });
      setAuthError(traduireErreurAuth(e, 'Erreur lors de la création du compte.'));
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
      try { localStorage.setItem('cp_read_notifs', JSON.stringify(next)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
      return next;
    });
  };
  const markAllNotifsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(prev => {
      const next = [...new Set([...prev, ...allIds])];
      try { localStorage.setItem('cp_read_notifs', JSON.stringify(next)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
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

      // Cmd/Ctrl + D : nouveau devis, dans l'éditeur (l'entrée principale ; avant : l'ancien assistant)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isInput) {
        e.preventDefault();
        setCreateMode(p => ({ ...p, devis: true }));
        setPage('devis');
        return;
      }

      // Cmd/Ctrl + H for new chantier
      if ((e.metaKey || e.ctrlKey) && e.key === 'h' && !isInput) {
        e.preventDefault();
        // Un rôle sans le droit de créer un chantier (comptable, ouvrier, lecture seule) n'ouvre pas la fenêtre
        if (peutCreerChantierRef.current) setShowFABQuickChantier(true);
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
        setMenuCompte(false);
        setShowNotifs(false);
        setShowFABQuickClient(false);
        setShowFABQuickChantier(false);
        setShowShortcuts(false);
        setMenuPlus(false);
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
      commandes: 'Commandes',
      entretien: "Carnet d'entretien",
      signatures: 'Signatures',
      export: 'Export comptable',
      ouvrages: "Bibliothèque d'ouvrages",
      admin: 'Administration',
      cgv: 'CGV',
      cgu: 'CGU',
      confidentialite: 'Confidentialité',
      'mentions-legales': 'Mentions légales',
      'checkout-success': 'Paiement confirmé',
      garanties: 'Garanties',
      'bibliotheque': 'Bibliothèque',
    };
    const title = PAGE_TITLES[page] || page.charAt(0).toUpperCase() + page.slice(1);
    document.title = `${title} — Mallettico`;
  }, [page]);

  synchroRef.current = handleManualSync;

  // Network status listener for offline mode — pas pour un visiteur anonyme (la base hors ligne n'est pas créée)
  useEffect(() => {
    if (visiteurAnonyme) return undefined;
    const updatePendingCount = async () => {
      // In demo mode, clear any stale mutations and set count to 0
      if (isDemo) {
        await clearAllMutations();
        setPendingSync(0);
        return;
      }
      const count = await getPendingCount(compteId);
      setPendingSync(count);
    };

    const unsubscribe = registerNetworkListeners(
      () => {
        setIsOnline(true);
        updatePendingCount();
        showToast('Connexion rétablie', 'success');
        // Auto-sync pending mutations when back online
        synchroRef.current?.().catch(err => console.warn('Auto-sync failed:', err));
      },
      () => {
        setIsOnline(false);
        showToast('Mode hors ligne activé', 'info');
      }
    );

    updatePendingCount();
    return unsubscribe;
  }, [compteId, visiteurAnonyme]);

  // Notifications are now computed via useMemo (see above) — no useEffect needed

  // Client Portal — detect portal token from URL: /portal/{token} or ?portal={token}
  // Must be BEFORE any conditional return to respect React hooks rules
  const portalToken = useMemo(() => {
    try {
      const path = window.location.pathname;
      const portalMatch = path.match(/^\/portal\/([a-zA-Z0-9_-]+)/);
      if (portalMatch) return portalMatch[1];
      const params = new URLSearchParams(window.location.search);
      return params.get('portal') || null;
    } catch { return null; }
  }, []);

  // Loading screen
  if (loading) return (
    <div className="min-h-screen bg-fond flex items-center justify-center">
      <LogoMallettico taille={56} className="animate-bounce" />
    </div>
  );

  const isDark = theme === 'dark';
  // Couleur de l'entreprise telle que la reçoivent les pages : leurs documents (devis, factures) l'impriment ; sans
  // couleur choisie, celle des documents par défaut (src/lib/theme.js). L'écran, lui, lit l'accent du thème.
  const couleur = entreprise.couleur || COULEUR_DOCUMENTS_DEFAUT;

  // Client Portal — public page accessible via token (no auth required)

  // Portail éteint (src/lib/fonctions.js) : un client qui ouvre un lien reçoit un message neutre, jamais de données
  // de démonstration présentées comme celles de l'entreprise
  if (portalToken && !FONCTIONS.portailClient) return <PortailIndisponible />;

  if ((page === 'client-portal' && FONCTIONS.portailClient) || portalToken) {
    const portalClientId = (() => {
      try { return localStorage.getItem('cp_portal_client_id') || null; } catch { return null; }
    })();
    const portalClient = portalClientId ? clients.find(c => c.id === portalClientId) : null;
    const portalDevis = portalClientId ? devis.filter(d => d.clientId === portalClientId) : [];
    const portalChantiers = portalClientId ? chantiers.filter(c => c.clientId === portalClientId) : [];

    // PortalLoader handles its own loading/error states via manual dynamic import.
    // This bypasses React.lazy to catch TDZ errors during module evaluation.
    return (
      <PortalLoader
        token={portalToken || 'demo'}
        entreprise={entreprise || {}}
        couleur={couleur}
        client={portalClient}
        devis={portalDevis || []}
        chantiers={portalChantiers || []}
        clients={clients || []}
        showToast={showToast}
        setPage={setPage}
      />
    );
  }

  // Legal / public pages (accessible without auth)
  const publicPages = ['cgv', 'cgu', 'confidentialite', 'mentions-legales', 'accessibilite', 'supprimer-mon-compte', 'changelog'];
  if (!user && !isDemo && publicPages.includes(page)) return (
    <Suspense fallback={<div className="min-h-screen bg-fond flex items-center justify-center"><LogoMallettico taille={56} className="animate-bounce" /></div>}>
      <div data-theme="clair" className="min-h-screen bg-fond p-4 sm:p-6">
        {page === 'changelog'
          ? <Changelog isDark={false} couleur={couleur} setPage={(p) => { setPage(p); if (!publicPages.includes(p)) setShowLanding(true); }} />
          : <LegalPages page={page} isDark={false} couleur={couleur} setPage={(p) => { setPage(p); if (!publicPages.includes(p)) setShowLanding(true); }} />
        }
      </div>
    </Suspense>
  );

  // Connecté avec une invitation en attente : on part la rejoindre (effet plus haut)
  if (versInvitation) return (
    <div className="min-h-screen bg-fond flex items-center justify-center" role="status" aria-label="Ouverture de l'invitation">
      <LogoMallettico taille={56} className="animate-pulse" />
    </div>
  );

  // Landing Page (for unauthenticated visitors before they click login)
  if (!user && !isDemo && showLanding) return (
    <>
      <LandingPage
        couleur={couleur}
        onLogin={() => setShowLanding(false)}
        onSignup={() => { setShowLanding(false); setShowSignUp(true); }}
        onNavigate={(p) => { setPage(p); setShowLanding(false); }}
      />
    </>
  );

  // Login Page — charte « Glacier vif » (20 oct. 2026) : bande bleu nuit du site, formulaire clair, action en pilule
  // bleu nuit à texte blanc, orange du logo en décor seulement. Les points cités sont ceux que le site vérifie dans le
  // code (devis par prestations chiffrées, signature en ligne, facture sans ressaisie, relances préparées).
  if (!user) {
    const champ = 'w-full rounded-xl border border-marque-acier bg-surface px-4 py-3 text-marque-encre-sombre placeholder:text-encre-3 transition-colors focus:border-marque-nuit-2 focus:outline-none focus:ring-2 focus:ring-marque-nuit-2/20';
    const boutonPlein = 'flex w-full items-center justify-center gap-2 rounded-full bg-marque-nuit-2 py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(18,51,111,0.6)] transition-all hover:-translate-y-px hover:bg-marque-nuit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70';
    const lien = 'font-semibold text-marque-nuit-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 rounded';
    return (
    <div data-theme="clair" className="min-h-screen bg-marque-glacier-1 flex">
      {/* Gauche : la bande bleu nuit du site, avec le quadrillage d'architecte et la lueur du logo */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-marque-nuit">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'linear-gradient(rgba(188,211,226,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(188,211,226,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div aria-hidden="true" className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-marque-glacier-3/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-marque-orange/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="max-w-lg">
            <LogoMallettico taille={64} fond="blanc" className="mb-10 shadow-lg" />
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-marque-acier">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-marque-orange shadow-[0_0_10px_rgba(238,123,32,0.8)]" />
              Pour les artisans du bâtiment
            </p>
            <h1 className="mb-10 text-5xl font-extrabold leading-[1.05] tracking-tight text-white">
              L’administratif du chantier, rangé dans une mallette.
            </h1>
            <ul className="space-y-4">
              {[
                { icon: FileText, text: 'Des devis à partir de prestations déjà chiffrées' },
                { icon: PenLine, text: 'La signature en ligne, depuis le téléphone du client' },
                { icon: Wallet, text: 'La facture sans rien ressaisir, les paiements suivis' },
                { icon: Bell, text: 'Les relances préparées, au rythme que vous choisissez' },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-4 text-marque-glacier-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <f.icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-lg">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Droite : le formulaire, sur fond clair */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMallettico taille={44} fond="blanc" className="shadow-sm" />
            <span className="text-2xl font-bold text-marque-nuit">Mallettico</span>
          </div>

          <div className="rounded-3xl border border-marque-acier/60 bg-surface p-6 shadow-[0_24px_48px_-24px_rgba(13,46,108,0.35)] sm:p-8">
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-marque-nuit">{showForgot ? 'Mot de passe oublié' : showSignUp ? 'Créer un compte' : 'Connexion'}</h2>
          <p className="mb-8 text-encre-2">{showForgot ? 'Recevez par e-mail un lien pour en choisir un nouveau.' : invitation ? `Pour rejoindre ${invitation.organisation || "l'équipe qui vous invite"}` : showSignUp ? 'Commencez gratuitement' : 'Accédez à votre espace'}</p>

          {invitation && !showForgot && (
            <div role="note" className="mb-4 flex items-start gap-2 rounded-xl border border-marque-acier bg-marque-glacier-1 p-3 text-sm text-marque-encre-sombre">
              <Users size={18} className="mt-0.5 flex-shrink-0 text-marque-nuit-2" aria-hidden="true" />
              <span>
                Invitation{invitation.organisation ? <> de <strong className="text-marque-nuit">{invitation.organisation}</strong></> : null}.{' '}
                {showSignUp ? 'Créez votre compte' : 'Connectez-vous'} : vous reviendrez à l'invitation pour rejoindre l'équipe.
              </span>
            </div>
          )}

          {authInfo && (
            <div role="status" className="mb-4 rounded-xl border border-succes-texte/20 bg-succes-fond p-3 text-sm text-succes-texte">
              {authInfo}
            </div>
          )}

          {showForgot ? (
            <form onSubmit={handleForgot} className="space-y-4" noValidate>
              <input
                type="email"
                className={champ}
                placeholder="Email du compte"
                value={authForm.email}
                onChange={e => setAuthForm(p => ({...p, email: e.target.value}))}
                required
                autoFocus
                aria-label="Adresse email du compte"
                autoComplete="email"
              />
              {authError && (
                <div role="alert" className="rounded-xl border border-danger-texte/20 bg-danger-fond p-3 text-sm text-danger-texte">{safeStr(authError)}</div>
              )}
              <button type="submit" disabled={isSubmitting} className={boutonPlein}>
                {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setAuthError(''); setAuthInfo(''); }}
                className="w-full py-2 text-sm text-encre-2 transition-colors hover:text-marque-nuit"
              >
                Retour à la connexion
              </button>
            </form>
          ) : (<>
          <form onSubmit={showSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {showSignUp && (
              // Un invité donne son nom (il apparaît dans l'équipe), pas celui d'une entreprise
              <input
                className={champ}
                placeholder={invitation ? 'Votre prénom et nom' : 'Nom entreprise'}
                value={authForm.nom}
                onChange={e => setAuthForm(p => ({...p, nom: e.target.value}))}
                aria-label={invitation ? 'Votre prénom et nom' : "Nom de l'entreprise"}
                autoComplete={invitation ? 'name' : 'organization'}
              />
            )}
            <input
              type="email"
              className={champ}
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
                className={champ}
                placeholder="Mot de passe"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({...p, password: e.target.value}))}
                required
                aria-label="Mot de passe"
                autoComplete={showSignUp ? "new-password" : "current-password"}
              />
              {showSignUp && (
                <p className="mt-2 text-xs text-encre-2">Au moins 8 caractères, avec des lettres et des chiffres.</p>
              )}
              {!showSignUp && (
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setAuthError(''); setAuthInfo(''); }}
                  className="mt-2 self-end py-1 text-sm text-encre-2 transition-colors hover:text-marque-nuit-2"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            {showSignUp && (
              // Case obligatoire, non cochée par défaut ; les liens ouvrent les textes dans un nouvel onglet (la saisie reste)
              <label htmlFor="inscription-conditions" className="flex items-start gap-3 text-sm text-marque-encre-sombre">
                <input
                  id="inscription-conditions"
                  type="checkbox"
                  checked={accepteConditions}
                  onChange={e => setAccepteConditions(e.target.checked)}
                  aria-describedby="inscription-information"
                  className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-marque-acier accent-marque-nuit-2"
                />
                <span>
                  J'ai lu et j'accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className={`${lien} underline`}>Conditions générales d'utilisation</a> de Mallettico (version du {CGU_VERSION_DATE}) et les <a href="/cgv" target="_blank" rel="noopener noreferrer" className={`${lien} underline`}>Conditions générales de vente</a>.
                </span>
              </label>
            )}
            {authError && (
              <div role="alert" className="rounded-xl border border-danger-texte/20 bg-danger-fond p-3 text-sm text-danger-texte">
                {safeStr(authError)}
              </div>
            )}
            <button type="submit" disabled={isSubmitting} className={boutonPlein}>
              {isSubmitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{showSignUp ? 'Création...' : 'Connexion...'}</span>
                </>
              ) : (
                showSignUp ? 'Créer mon compte' : 'Se connecter'
              )}
            </button>
            {showSignUp && (
              // Information au moment de la collecte (RGPD art. 13), texte de la relecture juriste du 25 oct. 2026 (R-G1)
              <p id="inscription-information" className="text-xs leading-relaxed text-encre-2">
                Mallettico (Hugo Seguin EI) utilise votre e-mail et votre nom pour créer et sécuriser votre compte. Vos droits et la durée de conservation de vos données sont détaillés dans la <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className={`${lien} underline`}>politique de confidentialité</a>.
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-encre-2">
            {showSignUp ? 'Déjà inscrit ?' : 'Pas de compte ?'}{' '}
            <button onClick={() => { setShowSignUp(!showSignUp); setAuthError(''); setAuthInfo(''); }} className={`${lien} py-2`}>
              {showSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
          </>)}
          </div>
        </div>
      </main>
    </div>
    );
  }

  // Arrivée par le lien de réinitialisation : choisir le nouveau mot de passe avant d'entrer.
  if (recoveryMode) return (
    <Suspense fallback={<div className="min-h-screen bg-fond" />}>
      <NouveauMotDePasse
        email={user?.email}
        onTermine={() => { setRecoveryMode(false); showToast('Mot de passe modifié ✓', 'success'); }}
        onAnnuler={() => { setRecoveryMode(false); handleSignOut(); }}
      />
    </Suspense>
  );

  // Pastilles du menu (audit UX du 20 oct. 2026, § 2.1) : seulement ce qui demande d'agir ; rouge (danger) pour un
  // retard (facture, tâche), ambre (alerte) pour ce qui est à surveiller (devis à relancer, brouillon), neutre pour le
  // reste (relecture du 25 oct. 2026). Devis & factures : les documents « à traiter », la même règle que
  // la puce de la liste (src/lib/ventes.js). Avant : devis en attente + factures non soldées, en rouge dès qu'une facture
  // était due, même dans ses délais (« 2 » rouge quand l'Accueil disait « Aucun retard ») ; et un « 5 » vert sur
  // Chantiers qui ne demandait rien.
  const maintenant = new Date();
  const docsATraiter = devis.filter(d => aTraiter(d, paiements, maintenant, entreprise));
  const docsUrgents = docsATraiter.filter(d => estUrgent(d, paiements, maintenant));
  const aujourdHui = jourLocal(); // date du jour en heure locale (toISOString donnait la veille entre minuit et 2 h)
  const todayEvents = planningEvents.filter(e => e.date === aujourdHui).length;
  const memosOverdueCount = memos.filter(m => !m.is_done && m.due_date && m.due_date < aujourdHui).length;
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  // Rubriques, dans l'ordre du menu latéral (audit § 2.1) ; filtrées par les droits du rôle (RBAC)
  const allNav = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    {
      id: 'devis', icon: FileText, label: 'Devis & Factures',
      badge: docsATraiter.length,
      // Rouge : une facture en retard ; ambre : un devis à relancer ou un brouillon à finaliser (relecture du 25 oct.)
      badgeTon: docsUrgents.length > 0 ? 'danger' : 'alerte',
      badgeTitle: docsATraiter.length > 0
        ? `${pluriel(docsATraiter.length, 'document')} à traiter${docsUrgents.length > 0 ? `, dont ${pluriel(docsUrgents.length, 'facture')} en retard` : ''}`
        : '',
    },
    { id: 'chantiers', icon: Building2, label: 'Chantiers' },
    { id: 'clients', icon: Users, label: 'Clients' },
    {
      id: 'tasks', icon: CalendarCheck, label: 'Tâches & Planning',
      badge: memosOverdueCount + todayEvents,
      // Rouge : une tâche en retard (comme l'Accueil) ; neutre : les événements du jour
      badgeTon: memosOverdueCount > 0 ? 'danger' : 'neutre',
      badgeTitle: [
        memosOverdueCount > 0 ? `${pluriel(memosOverdueCount, 'tâche')} en retard` : '',
        todayEvents > 0 ? `${pluriel(todayEvents, 'événement')} aujourd'hui` : '',
      ].filter(Boolean).join(' · '),
    },
    { id: 'catalogue', icon: Package, label: 'Catalogue' },
    { id: 'equipe', icon: HardHat, label: 'Équipe' },
    { id: 'finances', icon: Wallet, label: 'Finances' },
    (() => {
      // Badge : la note de la jauge « Profil complété » et de l'onglet Facture 2026 (lib/mentionsFacture, D-25).
      // Avant, il calculait sa propre « Conformité Facture 2026 » (RCS et TVA intracom exigés de tous, RC Pro,
      // IBAN, un critère toujours validé) : « 86 % » quand la jauge et l'onglet disaient 100 %.
      const { note, total, remplies } = mentionsFacture(entreprise);
      const manquantes = total - remplies;
      return {
        id: 'settings', icon: SettingsIcon, label: 'Paramètres',
        badge: manquantes,
        badgeTon: 'neutre',
        badgeTitle: manquantes > 0
          ? `Profil complété : ${note} % — ${manquantes} mention${manquantes > 1 ? 's' : ''} obligatoire${manquantes > 1 ? 's' : ''} à compléter`
          : '',
      };
    })(),
    { id: 'plan', icon: CreditCard, label: 'Mon plan' },
  ];
  const nav = allNav.filter(item => canAccess(item.id));
  // Barre du bas (téléphone) : quatre onglets ; « Plus » ne montre que les autres rubriques (jamais ces quatre-là)
  const ONGLETS_BAS = ['dashboard', 'devis', 'chantiers', 'clients'];
  // Menu latéral (bureau) : aucun groupe d'un seul élément (avant : « Organisation » pour Tâches seul, Paramètres
  // sous « Gestion », Mon plan sous « Profil »)
  const GROUPES_NAV = [
    { titre: null, ids: ['dashboard', 'devis', 'chantiers', 'clients', 'tasks'] },
    { titre: 'Gestion', ids: ['catalogue', 'equipe', 'finances'] },
    { titre: 'Compte', ids: ['settings', 'plan'] },
  ];
  const unreadNotifs = notifications.filter(n => !n.read);
  // Cloche : rouge pour un retard (facture, chantier), ambre pour une autre alerte, neutre sinon
  const tonCloche = unreadNotifs.some(estNotifRetard) ? 'danger'
    : unreadNotifs.some(n => n.type === 'alert' || n.type === 'warning') ? 'alerte' : 'neutre';
  const allerA = (id) => { setPage(id); setMenuPlus(false); setSelectedChantier(null); };
  const rubriquesPlus = nav.filter(n => !ONGLETS_BAS.includes(n.id));
  // Ouvre la page Devis & factures sur une demande : { relancer: id } (fiche + feuille « Relancer »), { ouvrir: id } (la fiche),
  // { facturer: id } (la fiche et le choix « Facturer ce devis ») ou { etat } / { nature } (la liste filtrée)
  const ouvrirDevis = (demande) => { setDemandeDevis(demande); setSelectedDevis(null); setPage('devis'); };
  const basculerTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  // Mode confidentiel : une seule commande, l'œil de l'en-tête (avant : en-tête, Accueil, menu latéral, Finances)
  const basculerDiscret = () => {
    const next = !modeDiscret;
    setModeDiscret(next);
    showToast(next ? 'Mode confidentiel activé — Montants masqués' : 'Mode confidentiel désactivé — Montants visibles', 'info');
  };
  const installer = () => {
    if (canInstall) install();
    else showToast('Sur iPhone : Partager, puis « Sur l’écran d’accueil »', 'info');
  };

  return (
    <div className="min-h-screen bg-fond">
      {/* CGU : compte d'avant la case de l'inscription, ou nouvelle version (garde de DataContext) */}
      {demandeCgu && (
        <CGUAcceptanceModal motif={demandeCgu.motif} geste={demandeCgu.geste} onAccept={accepterCgu} onAnnuler={annulerCgu} />
      )}
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[1030] focus:px-4 focus:py-2 focus:bg-surface focus:text-encre focus:rounded-lg focus:shadow-e2 focus:outline-none"
      >
        Aller au contenu principal
      </a>

      {/* Menu latéral : à partir de 768 px (icônes seules jusqu'à 1 280 px). Au téléphone : la barre du bas et « Plus ». */}
      <aside className="hidden md:flex fixed top-0 left-0 z-50 h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-surface border-r border-bord flex-col md:w-[72px] xl:w-64">
        <div className="flex items-center gap-3 px-3 py-3 border-b border-bord flex-shrink-0 justify-center xl:justify-start">
          <div className="hidden xl:block flex-1 min-w-0">
            <EntrepriseSwitcher
              isDark={isDark}
              user={user}
              onNavigateSettings={() => allerA('settings')}
            />
          </div>
          <div className="flex xl:hidden items-center justify-center w-10 h-10">
            <LogoMallettico taille={38} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {GROUPES_NAV.map((groupe, i) => {
            const items = nav.filter(n => groupe.ids.includes(n.id)).sort((a, b) => groupe.ids.indexOf(a.id) - groupe.ids.indexOf(b.id));
            if (items.length === 0) return null;
            return (
              <nav key={groupe.titre || 'principal'} aria-label={groupe.titre || 'Navigation principale'} className={`space-y-0.5 ${i > 0 ? 'mt-2 pt-2 border-t border-bord' : ''}`}>
                {groupe.titre && (
                  <p className="hidden xl:block px-3 pt-1.5 pb-1 text-xs font-semibold uppercase tracking-wider text-encre-3">{groupe.titre}</p>
                )}
                {items.map(n => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => allerA(n.id)}
                    className={`w-full flex items-center gap-3 justify-center xl:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${page === n.id ? 'bg-accent/15 text-accent-texte font-semibold' : 'text-encre-2 hover:bg-surface-2 hover:text-encre'}`}
                    aria-current={page === n.id ? 'page' : undefined}
                    title={n.badgeTitle ? `${n.label} — ${n.badgeTitle}` : n.label}
                  >
                    <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                    <span className="hidden xl:inline flex-1 text-left truncate">{n.label}</span>
                    {n.badge > 0 && (
                      <PastilleCompte n={n.badge} ton={n.badgeTon} titre={n.badgeTitle} className="hidden xl:inline-flex" />
                    )}
                  </button>
                ))}
              </nav>
            );
          })}
        </div>

        {/* Le retour à Hugo reste à portée ; thème, confidentiel et déconnexion sont dans l'en-tête (œil, avatar) */}
        <div className="flex-shrink-0 p-2 border-t border-bord">
          <button
            type="button"
            onClick={() => setShowRetour(true)}
            className="w-full flex items-center justify-center xl:justify-start gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-encre-2 hover:bg-surface-2 hover:text-encre"
            title="Signaler un problème ou proposer une idée"
          >
            <MessageCircle size={18} className="flex-shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline">Un bug ? Une idée ?</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-[72px] xl:pl-64 min-h-screen overflow-x-hidden pb-14 lg:pb-0 bg-fond">
        {/* En-tête : recherche, confidentiel, notifications, « + Nouveau », avatar (audit § 2.1 : il en portait 7) */}
        <header className="sticky top-0 z-30 border-b border-bord px-2 sm:px-4 pb-2 pt-[calc(0.5rem_+_env(safe-area-inset-top))] flex items-center justify-between">
          {/* Le flou est porté par un calque et non par <header> : un backdrop-filter sur un ancêtre
              enfermerait les fonds et panneaux position:fixed des menus dans la hauteur de l'en-tête. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 backdrop-blur-xl bg-surface/90" />
          {/* Compte de démonstration (D-26) : le bandeau suit l'en-tête collant, sur tous les écrans */}
          {estDonneesFictives(entreprise) && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1">
              <BandeauDonneesFictives />
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Logo et entreprise : jusqu'à 1 279 px (au-delà, le menu latéral déplié les porte ; entre 768 et 1 279 px il
                n'affiche que des icônes, et le sélecteur d'entreprise doit rester accessible) */}
            <div className="xl:hidden min-w-0">
              <EntrepriseSwitcher
                isDark={isDark}
                compact
                onNavigateSettings={() => setPage('settings')}
              />
            </div>

            {/* État de la connexion */}
            <div className="hidden sm:flex items-center gap-1.5">
              {!isOnline && (
                <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-alerte-fond text-alerte-texte">
                  <WifiOff size={12} aria-hidden="true" />
                  <span className="hidden md:inline">Hors ligne</span>
                </span>
              )}
              {isOnline && pendingSync > 0 && (
                <button
                  type="button"
                  className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-info-fond text-info-texte hover:brightness-95"
                  onClick={() => {
                    // Synchroniser seulement. Avant : purge automatique après une tentative, sans
                    // confirmation, des écritures de TOUS les comptes de l'appareil.
                    syncRetryAttemptRef.current = 0;
                    cancelSyncRetry();
                    handleManualSync();
                  }}
                  title="Envoyer maintenant les modifications en attente"
                >
                  <Wifi size={12} className="animate-pulse" aria-hidden="true" />
                  <span className="hidden md:inline">{pendingSync} en attente</span>
                </button>
              )}
            </div>
          </div>

          {/* CENTER: Search (desktop only — à 768 px la barre déborderait) */}
          <div className="hidden lg:flex flex-1 min-w-0 justify-center px-4">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors w-full max-w-[320px] border-bord hover:border-bord-fort bg-fond text-encre-3"
            >
              <Search size={16} aria-hidden="true" />
              <span className="text-sm truncate">Rechercher...</span>
              <kbd className="indication-clavier ml-auto text-xs px-1.5 py-0.5 rounded hidden lg:block bg-surface-2 text-encre-3">⌘K</kbd>
            </button>
          </div>

          {/* RIGHT GROUP: Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {FONCTIONS.ia && (<>
            {/* Dictée vocale — l'atout malin, accessible depuis n'importe quelle page */}
            <button
              onClick={() => setShowDictee(true)}
              className="h-11 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 font-medium text-sm transition-transform active:scale-95 bg-accent text-sur-accent"
              title="Dictée vocale — créez un client, un chantier ou un devis à la voix"
              aria-label="Dictée vocale"
            >
              <Mic size={18} />
              <span className="hidden lg:inline">Dicter</span>
            </button>
            </>)}

            {/* Search button - mobile only (icon) */}
            <button
              onClick={() => setShowSearch(true)}
              className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center hover:bg-surface-2 text-encre-2"
              title="Rechercher"
              aria-label="Rechercher"
            >
              <Search size={18} />
            </button>

            {/* Mode confidentiel : la seule commande des montants masqués, au téléphone comme au bureau (audit § 2.1) */}
            <button
              onClick={basculerDiscret}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${modeDiscret ? 'bg-alerte-fond text-alerte-texte' : 'hover:bg-surface-2 text-encre-2'}`}
              title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
              aria-label={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
              aria-pressed={modeDiscret}
            >
              {modeDiscret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${showNotifs ? 'bg-surface-2 text-encre' : 'text-encre-2 hover:bg-surface-2 hover:text-encre'}`}
              title={unreadNotifs.length > 0 ? `${unreadNotifs.length} notification${unreadNotifs.length > 1 ? 's' : ''} non lue${unreadNotifs.length > 1 ? 's' : ''}` : 'Notifications'}
              aria-label={`Notifications${unreadNotifs.length > 0 ? ` (${unreadNotifs.length} non lues)` : ''}`}
              aria-expanded={showNotifs}
            >
              <Bell size={20} />
              {unreadNotifs.length > 0 && (
                <span className={`absolute top-0.5 right-0.5 min-w-[20px] h-5 px-1 text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-surface ${{ danger: 'bg-danger-fond text-danger-texte', alerte: 'bg-alerte-fond text-alerte-texte', neutre: 'bg-neutre-fond text-neutre-texte' }[tonCloche]}`}>
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Quick add */}
            <div className="relative">
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="w-11 h-11 lg:w-auto lg:px-4 rounded-xl border border-bord-fort bg-surface text-encre flex items-center justify-center lg:gap-2 transition-colors hover:bg-surface-2"
                aria-label="Créer nouveau"
                aria-haspopup="true"
                aria-expanded={showQuickAdd}
              >
                <Plus size={18} />
                <span className="hidden lg:inline text-sm font-semibold">Nouveau</span>
              </button>

              {showQuickAdd && (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setShowQuickAdd(false)} />
                  <div role="menu" aria-label="Créer" onKeyDown={(e) => { if (e.key === 'Escape') setShowQuickAdd(false); }} className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1rem)] rounded-2xl shadow-e3 z-50 py-1.5 overflow-hidden bg-surface border border-bord">
                    {[
                      { label: 'Nouveau devis', icon: FileText, p: 'devis', create: 'devis' },
                      { label: 'Nouveau client', icon: Users, p: 'clients', create: 'client' },
                      { label: 'Nouveau chantier', icon: Building2, p: 'chantiers', create: 'chantier' },
                      { label: 'Nouvelle tâche', icon: ClipboardList, p: 'memos' }
                    ].map(item => (
                      <button
                        key={item.label}
                        role="menuitem"
                        onClick={() => { if (item.create) setCreateMode(p => ({...p, [item.create]: true})); setPage(item.p); setShowQuickAdd(false); }}
                        className="w-full min-h-[48px] flex items-center gap-3 px-4 text-left text-base sm:text-sm font-medium text-encre transition-colors hover:bg-surface-2"
                      >
                        <item.icon size={18} className="flex-shrink-0 text-encre-3" />
                        <span className="whitespace-nowrap">{item.label}</span>
                        <ChevronRight size={16} className="ml-auto text-encre-3" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Avatar : le compte et l'appareil (réglages, plan, thème, installation, aide, retours, déconnexion) */}
            <div className="relative">
              <button
                onClick={() => setMenuCompte(v => !v)}
                className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm bg-surface-2 text-encre-2 transition-colors hover:bg-bord"
                title={user?.email || 'Mon compte'}
                aria-label="Mon compte"
                aria-haspopup="menu"
                aria-expanded={menuCompte}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>
              <MenuCompte
                ouvert={menuCompte}
                onFermer={() => setMenuCompte(false)}
                email={user?.email}
                nomEntreprise={entreprise?.nom}
                acces={{ settings: canAccess('settings'), plan: canAccess('plan') }}
                onAller={allerA}
                sombre={isDark}
                onTheme={basculerTheme}
                installable={!isInstalled && !estNatif()}
                onInstaller={installer}
                onAide={() => setShowHelp(true)}
                onRetour={() => setShowRetour(true)}
                onDeconnexion={handleSignOut}
              />
            </div>
          </div>
        </header>
        {/* Place du bandeau « Données fictives » (accroché à l'en-tête) : il ne recouvre pas le haut de l'écran */}
        {estDonneesFictives(entreprise) && <div aria-hidden="true" className="h-7" />}

        {/* Échec de chargement : sans ce bandeau, une coupure réseau ressemblait à des données perdues. */}
        {loadError && (
          <div role="alert" className="mx-4 lg:mx-6 mt-3 p-3 sm:p-4 rounded-xl border border-danger-texte/20 bg-danger-fond text-danger-texte flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0 text-sm">
              <WifiOff size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                <strong>Certaines données n’ont pas pu être chargées</strong>
                {' '}({loadError.tables.map((t) => LIBELLES_TABLES[t] || t).join(', ')}).
                {' '}Elles ne sont pas perdues : vérifiez votre connexion puis réessayez.
              </p>
            </div>
            <Bouton variante="secondaire" className="self-start sm:self-auto flex-shrink-0" onClick={retryLoad}>
              Réessayer
            </Bouton>
          </div>
        )}

        {droitsNonCharges && (
          <div role="alert" className="mx-4 lg:mx-6 mt-3 px-4 py-3 rounded-xl border bg-alerte-fond border-alerte-point/40 text-sm text-alerte-texte">
            Vos droits dans l’entreprise n’ont pas pu être lus : les montants et certaines actions sont masqués. Rechargez la page.
          </div>
        )}

        {/* Trial / Downgrade Banner */}
        <ErrorBoundary fallback={null}>
          <TrialBanner page={page} />
        </ErrorBoundary>

        {/* Page content */}
        <main id="main-content" key={page} className={`${page === 'dashboard' || page === 'profil' || page === 'plan' ? '' : 'p-4 lg:p-6'} text-encre max-w-[1800px] mx-auto pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0 overflow-x-hidden animate-fade-in`}>
          <ErrorBoundary isDark={isDark} showDetails={true}>
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" /></div>}>
              {page === 'dashboard' && <Dashboard clients={clients} devis={devis} chantiers={chantiers} events={planningEvents} depenses={depenses} pointages={pointages} equipe={equipe} ajustements={ajustements} catalogue={catalogue} entreprise={entreprise} getChantierBilan={getChantierBilan} addDevis={addDevis} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} setCreateMode={setCreateMode} modeDiscret={modeDiscret} couleur={couleur} isDark={isDark} user={user} memos={memos} addMemo={addMemo} toggleMemo={toggleMemo} ouvrirDevis={ouvrirDevis} />}
              {page === 'devis' && <DevisPage clients={clients} addClient={addClient} devis={devis} setDevis={setDevis} chantiers={chantiers} catalogue={catalogue} entreprise={entreprise} onSubmit={addDevis} onUpdate={updateDevis} onDelete={deleteDevis} modeDiscret={modeDiscret} selectedDevis={selectedDevis} setSelectedDevis={setSelectedDevis} isDark={isDark} couleur={couleur} createMode={createMode.devis} setCreateMode={(v) => setCreateMode(p => ({...p, devis: v}))} addChantier={addChantier} setPage={setPage} setSelectedChantier={setSelectedChantier} addEchange={addEchange} paiements={paiements} addPaiement={addPaiement} generateNextNumero={generateNextNumero} editDevisId={editDevisId} setEditDevisId={setEditDevisId} demande={demandeDevis} setDemande={setDemandeDevis} />}
              {page === 'chantiers' && <Chantiers nouveauDevisPour={(clientId, chantierId) => { setCreateMode(p => ({ ...p, devis: { clientId, chantierId } })); setPage('devis'); }} chantiers={chantiers} addChantier={addChantier} updateChantier={updateChantier} clients={clients} depenses={depenses} pointages={pointages} equipe={equipe} devis={devis} paiements={paiements} ajustements={ajustements} addAjustement={addAjustement} deleteAjustement={deleteAjustement} getChantierBilan={getChantierBilan} couleur={couleur} modeDiscret={modeDiscret} entreprise={entreprise} selectedChantier={selectedChantier} setSelectedChantier={setSelectedChantier} catalogue={catalogue} deductStock={deductStock} isDark={isDark} createMode={createMode.chantier} setCreateMode={(v) => setCreateMode(p => ({...p, chantier: v}))} setPage={setPage} memos={memos} addMemo={addMemo} toggleMemo={toggleMemo} onPlanEvent={(data) => { setPlanningPrefill(data); setPage('planning'); }} addDevis={addDevis} generateNextNumero={generateNextNumero} ouvrirDevis={ouvrirDevis} />}
              {(page === 'tasks' || page === 'planning' || page === 'memos') && (
                <TasksAndPlanning
                  memos={memos} addMemo={addMemo} updateMemo={updateMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo}
                  events={planningEvents} setEvents={setPlanningEvents} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent}
                  chantiers={chantiers} clients={clients} equipe={equipe} devis={devis} paiements={paiements} modeDiscret={modeDiscret}
                  setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier} ouvrirDevis={ouvrirDevis}
                  isDark={isDark} couleur={couleur} showToast={showToast}
                  prefill={planningPrefill} clearPrefill={() => setPlanningPrefill(null)}
                  initialView={page === 'planning' ? 'calendar' : page === 'memos' ? 'list' : undefined}
                />
              )}
              {page === 'clients' && <Clients clients={clients} setClients={setClients} updateClient={updateClient} deleteClient={deleteClient} devis={devis} chantiers={chantiers} echanges={echanges} onSubmit={addClient} couleur={couleur} setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis} isDark={isDark} modeDiscret={modeDiscret} createMode={createMode.client} setCreateMode={(v) => setCreateMode(p => ({...p, client: v}))} nouveauDevisPour={(clientId) => { setCreateMode(p => ({ ...p, devis: { clientId } })); setPage('devis'); }} nouveauChantierPour={(clientId) => { setCreateMode(p => ({ ...p, chantier: { clientId } })); setPage('chantiers'); }} ouvrirDevis={ouvrirDevis} memos={memos} addMemo={addMemo} updateMemo={updateMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo} onImportClients={() => { setImportType('clients'); setShowImport(true); }} entreprise={entreprise} />}
              {page === 'catalogue' && <Catalogue entreprise={entreprise} catalogue={catalogue} setCatalogue={setCatalogue} addCatalogueItem={addCatalogueItem} updateCatalogueItem={updateCatalogueItem} deleteCatalogueItem={deleteCatalogueItem} chantiers={chantiers} equipe={equipe} devis={devis} updateDevis={updateDevis} clients={clients} couleur={couleur} isDark={isDark} modeDiscret={modeDiscret} setPage={setPage} />}
              {page === 'export' && <FeatureGuard feature="export_comptable"><ExportComptable devis={devis} depenses={depenses} chantiers={chantiers} clients={clients} entreprise={entreprise} isDark={isDark} couleur={couleur} /></FeatureGuard>}
              {page === 'plan' && <PlanPage isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'analytique' && <AnalyticsPremium modeDiscret={modeDiscret} devis={devis} clients={clients} chantiers={chantiers} depenses={depenses} equipe={equipe} paiements={paiements} pointages={pointages} isDark={isDark} couleur={couleur} showToast={showToast} setPage={setPage} />}
              {page === 'finances' && <FinancesPage devis={devis} depenses={depenses} clients={clients} chantiers={chantiers} entreprise={entreprise} equipe={equipe} paiements={paiements} pointages={pointages} isDark={isDark} couleur={couleur} setPage={setPage} modeDiscret={modeDiscret} ouvrirDocument={(id) => { const d = devis.find(x => x.id === id); if (d) { setSelectedDevis(d); setPage('devis'); } }} />}
              {page === 'equipe' && <Equipe equipe={equipe} setEquipe={setEquipe} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} pointages={pointages} setPointages={setPointages} addPointage={addPointage} chantiers={chantiers} planningEvents={planningEvents} couleur={couleur} isDark={isDark} modeDiscret={modeDiscret} setPage={setPage} />}
              {page === 'garanties' &&<GarantiesDashboard isDark={isDark} couleur={couleur} showToast={showToast} user={user} chantiers={chantiers} />}
              {page === 'admin' &&<AdminHelp chantiers={chantiers} clients={clients} devis={devis} depenses={depenses} entreprise={entreprise} isDark={isDark} couleur={couleur} />}
              {page === 'checkout-success' && <CheckoutSuccess isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'settings' && <Settings entreprise={entreprise} setEntreprise={setEntreprise} user={user} devis={devis} depenses={depenses} clients={clients} chantiers={chantiers} isDark={isDark} modeDiscret={modeDiscret} couleur={couleur} setPage={setPage} />}
              {page === 'cgv' && <LegalPages page="cgv" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'cgu' && <LegalPages page="cgu" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'confidentialite' && <LegalPages page="confidentialite" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'mentions-legales' && <LegalPages page="mentions-legales" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'accessibilite' && <LegalPages page="accessibilite" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'supprimer-mon-compte' && <LegalPages page="supprimer-mon-compte" isDark={isDark} couleur={couleur} setPage={setPage} />}
              {page === 'changelog' && <Changelog isDark={isDark} couleur={couleur} setPage={setPage} />}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation Bar — replaces sidebar on small screens */}
        <nav className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t backdrop-blur-lg bg-surface/95 border-bord pb-[env(safe-area-inset-bottom)]`}>
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
                    setMenuPlus(false);
                    setSelectedChantier(null);
                    setSelectedDevis(null);
                  }}
                  className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full transition-colors relative ${
                    isActive ? 'text-accent-texte' : 'text-encre-3 active:text-encre-2'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent" />
                  )}
                  <div
                    className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-accent/15' : ''}`}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className={`text-xs mt-0.5 truncate max-w-full px-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                </button>
              );
            })}
            {/* 5e onglet : « Plus » ouvre la feuille des autres rubriques (Planning, Catalogue, Équipe, Finances…) */}
            {(() => {
              const isPlusActive = !ONGLETS_BAS.includes(page);
              const plusUrgent = rubriquesPlus.some(n => n.badge > 0 && ['danger', 'alerte'].includes(n.badgeTon));
              const plusRouge = rubriquesPlus.some(n => n.badge > 0 && n.badgeTon === 'danger');
              return (
                <button
                  onClick={() => setMenuPlus(true)}
                  className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full transition-colors relative ${
                    isPlusActive ? 'text-accent-texte' : 'text-encre-3 active:text-encre-2'
                  }`}
                  aria-label={plusUrgent ? 'Plus : autres rubriques (une demande d’agir)' : 'Plus : autres rubriques'}
                  aria-haspopup="dialog"
                  aria-expanded={menuPlus}
                >
                  {isPlusActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent" />
                  )}
                  <div
                    className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isPlusActive ? 'bg-accent/15' : ''}`}
                  >
                    <Menu size={20} strokeWidth={isPlusActive ? 2.5 : 1.5} />
                    {plusUrgent && <span aria-hidden="true" className={`absolute top-1.5 right-[calc(50%-1.1rem)] w-2 h-2 rounded-full ring-2 ring-surface ${plusRouge ? 'bg-danger-point' : 'bg-alerte-point'}`} />}
                  </div>
                  <span className={`text-xs mt-0.5 truncate max-w-full px-0.5 ${isPlusActive ? 'font-semibold' : 'font-medium'}`}>Plus</span>
                </button>
              );
            })()}
          </div>
        </nav>
        <MenuPlus
          ouvert={menuPlus}
          onFermer={() => setMenuPlus(false)}
          rubriques={rubriquesPlus}
          page={page}
          onAller={allerA}
          sombre={isDark}
          onTheme={basculerTheme}
          onRetour={() => { setMenuPlus(false); setShowRetour(true); }}
          onDeconnexion={handleSignOut}
        />
      </div>

      {/* FAB Quick Client Modal */}
      {showFABQuickClient && (
        <Suspense fallback={null}>
          <QuickClientModal
            isOpen={showFABQuickClient}
            onClose={() => setShowFABQuickClient(false)}
            onSubmit={async (data) => {
              // Avant : setClients seul, rien en base (recette du 9 oct. 2026).
              const cree = await addClient(data);
              if (cree) setShowFABQuickClient(false);
              return cree;
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
            onSubmit={async (data) => {
              // Avant : setChantiers seul, rien en base (recette du 9 oct. 2026).
              const cree = await addChantier({ statut: 'prospect', ...data });
              if (cree) setShowFABQuickChantier(false);
            }}
            clients={clients}
            devis={devis}
            voitPrix={canViewPrices}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      )}

      {/* Global Help Modal */}
      {showHelp && <HelpModal setShowHelp={setShowHelp} isDark={isDark} />}
      {showRetour && (
        <Suspense fallback={null}>
          <RetourModal isOpen={showRetour} onClose={() => setShowRetour(false)} isDark={isDark} couleur={couleur} showToast={showToast} page={page} user={user} orgId={orgId} />
        </Suspense>
      )}

      {/* Onboarding Modal for first-time users */}
      {showOnboarding && <OnboardingModal setShowOnboarding={setShowOnboarding} isDark={isDark} couleur={couleur} />}

      {/* Dictée vocale — client + chantier + devis en une seule prise de parole */}
      {FONCTIONS.ia && showDictee && (
        <Suspense fallback={null}>
          <DicteeModal
            isOpen={showDictee}
            onClose={() => setShowDictee(false)}
            isDark={isDark}
            couleur={couleur}
            clients={clients}
            chantiers={chantiers}
            catalogue={catalogue}
            entreprise={entreprise}
            /* Fonctions brutes du DataContext : les wrappers d'App.jsx affichent
               chacun leur toast, ce qui en empilerait trois. La dictée n'en
               montre qu'un seul, récapitulatif et annulable. */
            addClient={dataAddClient}
            addChantier={dataAddChantier}
            addDevis={dataAddDevis}
            deleteClient={dataDeleteClient}
            deleteChantier={dataDeleteChantier}
            deleteDevis={dataDeleteDevis}
            setPage={setPage}
            setSelectedDevis={setSelectedDevis}
            setSelectedChantier={setSelectedChantier}
            setEditDevisId={setEditDevisId}
          />
        </Suspense>
      )}

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
          onNewDevis={() => {
            setCreateMode(p => ({ ...p, devis: true }));
            setPage('devis');
          }}
          ouvrirDevis={ouvrirDevis}
          onNewClient={() => setShowFABQuickClient(true)}
          onNewChantier={canPerform('chantier', 'create') ? () => setShowFABQuickChantier(true) : undefined}
          isDark={isDark}
          couleur={couleur}
          modeDiscret={modeDiscret}
        />
      </Suspense>

      {/* Notifications : feuille du bas au téléphone (ui/Modal), icônes et tons au lieu des émojis (audit § Task 5, P3) */}
      <Modal isOpen={showNotifs} onClose={() => setShowNotifs(false)} size="md">
        <ModalHeader>
          <ModalTitle>Notifications</ModalTitle>
          <ModalDescription>
            {unreadNotifs.length > 0 ? `${unreadNotifs.length} non lue${unreadNotifs.length > 1 ? 's' : ''}` : 'Tout est à jour'}
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="!px-0 !py-0">
          {notifications.length === 0 ? (
            <EtatVide icone={Bell} titre="Tout est à jour" texte="Aucune notification pour le moment." />
          ) : (
            <ul className="divide-y divide-bord">
              {notifications.map(n => {
                const ton = tonNotification(n);
                const Icone = ton.icone;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
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
                            if (found) setSelectedChantier(found.id);
                          }
                          setShowNotifs(false);
                        }
                      }}
                      className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors hover:bg-surface-2 ${!n.read ? 'bg-accent/5' : ''}`}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ton.classe}`}>
                        <Icone size={20} aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm leading-relaxed text-encre ${!n.read ? 'font-semibold' : ''}`}>{safeStr(n.message)}</span>
                        {n.date ? <span className="block mt-1 text-sm text-encre-3">{safeStr(n.date)}</span> : null}
                      </span>
                      {!n.read && <span className="sr-only">Non lue</span>}
                      {!n.read && <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 bg-accent" />}
                      {n.link && <ChevronRight size={18} className="flex-shrink-0 mt-2.5 text-encre-3" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ModalBody>
        {notifications.length > 0 && unreadNotifs.length > 0 && (
          <ModalFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Bouton variante="secondaire" pleineLargeur onClick={() => { markAllNotifsRead(); setShowNotifs(false); }}>
              Tout marquer comme lu
            </Bouton>
          </ModalFooter>
        )}
      </Modal>

      {/* Notification d'une action : en haut au téléphone, sous la barre d'état — en bas, elle recouvrait le bouton
          des fenêtres qui montent du bas, et restait cachée sous l'éditeur de devis (z-1000). Carte calme, ton sur l'icône. */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed z-[1100] left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] flex justify-center lg:left-auto lg:right-4 lg:top-auto lg:bottom-4 lg:block">
          <div className="flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl shadow-e3 animate-slide-up max-w-full lg:max-w-md bg-surface border border-bord text-encre">
            {(() => {
              const t = TONS_TOAST[toast.type] || TONS_TOAST.info;
              return <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.classe}`}><t.icone size={18} aria-hidden="true" /></span>;
            })()}
            <span className="text-sm font-medium">{safeStr(toast.message)}</span>
            <button onClick={hideToast} className="ml-1 w-9 h-9 flex items-center justify-center rounded-full text-encre-3 hover:bg-surface-2 hover:text-encre flex-shrink-0" aria-label="Fermer la notification">
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
            onImport={async (data) => {
              // Un par un, par DataContext : chaque client est enregistré en base et compte dans la limite
              // du plan. Au premier refus (limite, droits), on s'arrête (DataContext a dit pourquoi) et on rend combien
              // sont passés : la fenêtre l'écrit elle-même, sans second message. Avant : setClients seul, « 3 client(s)
              // importé(s) » et rien en base ; puis un message, et la fenêtre qui se fermait sur lui.
              let importes = 0;
              if (importType === 'clients') {
                for (const item of data) {
                  const c = await dataAddClient(item);
                  if (!c) break;
                  importes++;
                }
              }
              return { importes, total: data.length };
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
          const ok = await confirm({
            title: 'Rejeter les modifications en attente ?',
            message: `${pendingSync} modification${pendingSync > 1 ? 's' : ''} faite${pendingSync > 1 ? 's' : ''} sur cet appareil ${pendingSync > 1 ? 'ne sont' : "n'est"} pas encore enregistrée${pendingSync > 1 ? 's' : ''}. Les rejeter les perd définitivement.`,
            variant: 'danger',
          });
          if (!ok) return false;
          await clearMutationsDe(compteId); // seulement ce compte : les autres comptes de l'appareil gardent les leurs
          setPendingSync(0);
          setSyncErrorDetails(null);
          syncRetryAttemptRef.current = 0;
          cancelSyncRetry();
        }}
        errorDetails={syncErrorDetails}
        isDark={isDark}
      />

      {/* Pas de bandeau de cookies : aucun traceur soumis à consentement n'est chargé (décision du 25 oct. 2026,
          relecture juriste, option A). Il revient AVANT d'activer un traceur facultatif (Sentry Replay, mesure
          d'audience) : docs/feuille-de-route.md, tâche « bandeau-traceurs ». */}
    </div>
  );
}

// Guide d'utilisation (menu de l'avatar › Aide). Charte « Glacier vif » : jetons, icônes lucide au lieu des émojis,
// encarts neutres (les tons ne décorent pas, audit UX du 20 oct. 2026, § 2.8) ; ui/Modal (feuille du bas au téléphone).
function HelpModal({ setShowHelp, isDark: _isDark }) {
  const [helpSection, setHelpSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const encart = 'p-4 rounded-xl bg-surface-2';
  const etape = 'p-3 rounded-xl bg-surface-2';

  const helpSections = {
    overview: {
      title: "Bienvenue",
      titleFull: "Bienvenue dans Mallettico",
      icon: Home,
      content: (
        <div className="space-y-4">
          <p className="text-encre-2">Mallettico est votre assistant de gestion quotidien. Suivez vos chantiers, vos devis et votre rentabilité au même endroit.</p>
          <div className={encart}>
            <h4 className="font-semibold mb-2 text-encre">Par où commencer ?</h4>
            <ol className="text-sm space-y-2 text-encre-2">
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
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p className="text-encre-2">Créez vos devis, puis facturez-les sans ressaisir les lignes.</p>
          <div className="space-y-3">
            <div className={etape}>
              <h5 className="font-medium mb-1 text-encre">1. Créer un devis</h5>
              <p className="text-sm text-encre-2">Cliquez sur "Nouveau" puis ajoutez vos lignes depuis le catalogue ou manuellement.</p>
            </div>
            <div className={etape}>
              <h5 className="font-medium mb-1 text-encre">2. Envoyer au client</h5>
              <p className="text-sm text-encre-2">Générez le PDF et envoyez-le par WhatsApp ou email directement.</p>
            </div>
            <div className={etape}>
              <h5 className="font-medium mb-1 text-encre">3. Convertir en facture</h5>
              <p className="text-sm text-encre-2">Devis accepté ? Demandez un acompte ou facturez directement.</p>
            </div>
          </div>
        </div>
      )
    },
    chantiers: {
      title: "Chantiers",
      titleFull: "Suivre vos chantiers",
      icon: Building2,
      content: (
        <div className="space-y-4">
          <p className="text-encre-2">Suivez chaque chantier : dépenses, heures, avancement et rentabilité.</p>
          <div className="space-y-3">
            <div className={etape}>
              <h5 className="font-medium mb-1 text-encre">Suivi financier</h5>
              <p className="text-sm text-encre-2">Ajoutez vos dépenses (matériaux, sous-traitance) et pointez les heures. La marge se calcule automatiquement.</p>
            </div>
            <div className={etape}>
              <h5 className="font-medium mb-1 text-encre">Photos de chantier</h5>
              <p className="text-sm text-encre-2">Prenez des photos avant/pendant/après pour documenter votre travail.</p>
            </div>
            <div className={etape}>
              <h5 className="font-medium mb-1 text-encre">To-do list</h5>
              <p className="text-sm text-encre-2">Créez des tâches pour ne rien oublier sur chaque chantier.</p>
            </div>
          </div>
        </div>
      )
    },
    rentabilite: {
      title: "Rentabilité",
      titleFull: "Comprendre votre marge",
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <p className="text-encre-2">La marge sur chantier est calculée automatiquement, avant cotisations, impôts et frais généraux :</p>
          <div className="p-4 rounded-xl font-mono text-sm bg-surface-2">
            <p className="text-encre">Marge = CA - Dépenses - Main d'œuvre</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-encre">Repères indicatifs :</p>
            {[
              { fond: 'bg-succes-fond text-succes-texte', point: 'bg-succes-point', seuil: 'Plus de 40 %', texte: 'Vous êtes très rentable' },
              { fond: 'bg-alerte-fond text-alerte-texte', point: 'bg-alerte-point', seuil: 'Entre 20 et 40 %', texte: 'Surveillez vos coûts' },
              { fond: 'bg-danger-fond text-danger-texte', point: 'bg-danger-point', seuil: 'Moins de 20 %', texte: 'Revoyez vos prix ou coûts' },
            ].map((r) => (
              <div key={r.seuil} className={`flex items-center gap-3 p-3 rounded-xl ${r.fond}`}>
                <span aria-hidden="true" className={`w-3 h-3 rounded-full flex-shrink-0 ${r.point}`} />
                <div>
                  <p className="font-medium">{r.seuil}</p>
                  <p className="text-sm">{r.texte}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    astuces: {
      title: "Astuces",
      titleFull: "Astuces",
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <div className={encart}>
            <h4 className="font-semibold mb-2 text-encre flex items-center gap-2"><Smartphone size={18} className="text-encre-3" aria-hidden="true" />Utilisez-le sur mobile</h4>
            <p className="text-sm text-encre-2">Mallettico fonctionne sur téléphone. Ajoutez-le à votre écran d'accueil pour un accès rapide.</p>
          </div>
          <div className={encart}>
            <h4 className="font-semibold mb-2 text-encre flex items-center gap-2"><Palette size={18} className="text-encre-3" aria-hidden="true" />Personnalisez</h4>
            <p className="text-sm text-encre-2">Dans Paramètres, ajoutez votre logo et choisissez votre couleur. Vos devis auront un aspect professionnel unique.</p>
          </div>
          <div className={encart}>
            <h4 className="font-semibold mb-2 text-encre flex items-center gap-2"><EyeOff size={18} className="text-encre-3" aria-hidden="true" />Mode confidentiel</h4>
            <p className="text-sm text-encre-2">Touchez l'œil, en haut de l'écran, pour masquer les montants. Pratique quand un client regarde votre écran !</p>
          </div>
        </div>
      )
    },
    faq: {
      title: "FAQ",
      titleFull: "Questions fréquentes",
      icon: HelpCircle,
      content: (() => {
        const faqItems = [
          { q: 'Comment créer mon premier devis ?', a: 'Allez dans Devis & Factures, cliquez "Nouveau devis", sélectionnez un client et ajoutez vos lignes depuis le catalogue ou manuellement.' },
          { q: 'Comment transformer un devis en facture ?', a: 'Ouvrez le devis signé et touchez « Facturer » : facture d\'acompte, échéancier ou facture complète (ou de solde). Les lignes sont reprises automatiquement. Depuis un chantier, vous suivez aussi l\'avancement par situations de travaux ; leur facture n\'est pas encore disponible.' },
          { q: 'Comment ajouter mon logo ?', a: 'Dans Paramètres > Identité, uploadez votre logo. Il apparaîtra sur tous vos devis et factures PDF.' },
          { q: 'Comment suivre mes dépenses ?', a: 'Dans la fiche d\'un chantier, onglet Dépenses, ajoutez chaque achat de matériel ou paiement de sous-traitant.' },
          { q: 'Comment envoyer un devis par email ?', a: 'Générez le PDF du devis puis utilisez le bouton "Envoyer" pour l\'envoyer par email directement depuis l\'application.' },
          // Texte de la relecture juriste du 25 oct. 2026 (R-H), gardé après constat : parcours « hors ligne » (scripts/parcours/coque.cjs)
          { q: 'Puis-je utiliser Mallettico hors ligne ?', a: 'En partie. Sans réseau, ce que vous saisissez est mis en attente sur votre appareil et envoyé au retour de la connexion (voir « N en attente »). L\'envoi d\'un document demande une connexion.' },
          { q: 'Comment fonctionne le planning ?', a: 'Le planning affiche vos chantiers et événements. Cliquez sur un jour pour ajouter un événement ou glissez-déposez pour réorganiser.' },
          { q: 'Comment gérer mes clients ?', a: 'Dans la section Clients, ajoutez les coordonnées de vos clients. Vous verrez leur historique de devis et chantiers.' },
          { q: 'Comment fonctionne le catalogue ?', a: 'Le catalogue stocke vos articles et prestations avec prix unitaires. Réutilisez-les dans vos devis en un clic.' },
          { q: 'Comment changer mon plan ?', a: 'Dans Mon plan, vous voyez votre plan actuel et pouvez évoluer vers Artisan ou Équipe pour débloquer plus de fonctionnalités.' },
          { q: 'Comment exporter mes données comptables ?', a: 'Dans Finances > Export Comptable, exportez vos écritures au format FEC, CSV ou Excel, à remettre à votre comptable.' },
          { q: 'Comment fonctionne la trésorerie ?', a: 'Dans Finances > Trésorerie, visualisez vos flux de trésorerie en temps réel avec un prévisionnel automatique.' },
          ...(FONCTIONS.ia ? [{ q: 'Comment utiliser l\'IA Devis ?', a: 'Prenez une photo du chantier ou décrivez les travaux. L\'IA génère automatiquement un devis détaillé. (Inclus dans tous les plans)' }] : []),
          { q: 'Comment relancer un client ?', a: 'Mallettico détecte les devis en attente et vous propose des relances automatiques par email.' },
          { q: 'Comment ajouter un acompte ?', a: 'Lors de la création de la facture d\'acompte, indiquez le pourcentage souhaité. Le solde sera calculé automatiquement.' },
          { q: 'Les données sont-elles sécurisées ?', a: 'Elles sont chiffrées, et la base de données est hébergée à Paris. Vous pouvez les exporter et supprimer votre compte à tout moment, depuis les Réglages.' },
          { q: 'Comment supprimer mon compte ?', a: 'Dans Paramètres > Données, section RGPD, vous pouvez exporter ou supprimer toutes vos données.' },
          { q: 'Comment contacter le support ?', a: 'Envoyez un email à contact@mallettico.fr. Nous répondons sous 48h ouvrées.' },
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
              aria-label="Rechercher une question"
              className="w-full px-4 py-2.5 rounded-xl border text-sm bg-surface border-bord-fort text-encre placeholder:text-encre-3"
            />
            {filtered.length === 0 && (
              <p className="text-sm text-center py-4 text-encre-2">Aucun résultat. Contactez-nous à contact@mallettico.fr</p>
            )}
            {filtered.map((item, i) => (
              <details key={i} className="rounded-xl border border-bord overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-encre hover:bg-surface-2">
                  {item.q}
                </summary>
                <div className="px-4 pb-3 text-sm text-encre-2">{item.a}</div>
              </details>
            ))}
          </div>
        );
      })()
    },
    contact: {
      title: "Contact",
      titleFull: "Contacter le support",
      icon: Mail,
      content: (
        <div className="space-y-4">
          <p className="text-encre-2">Notre équipe répond sous 48h ouvrées.</p>
          <div className="p-5 rounded-xl bg-surface-2 space-y-3">
            {[
              { Icone: Mail, titre: 'Email', texte: 'contact@mallettico.fr' },
              { Icone: Clock, titre: 'Délai de réponse', texte: 'Sous 48h ouvrées' },
              { Icone: BookOpen, titre: 'Documentation', texte: 'Consultez la FAQ ci-dessus pour une réponse immédiate' },
            ].map(({ Icone, titre, texte }) => (
              <div key={titre} className="flex items-center gap-3">
                <Icone size={22} className="flex-shrink-0 text-encre-3" aria-hidden="true" />
                <div>
                  <p className="font-medium text-encre">{titre}</p>
                  <p className="text-sm text-encre-2">{texte}</p>
                </div>
              </div>
            ))}
          </div>
          <a
            href="mailto:contact@mallettico.fr?subject=Support Mallettico"
            className="flex w-full h-11 items-center justify-center rounded-full text-center font-semibold text-sm transition-[filter] hover:brightness-95 bg-accent text-sur-accent"
          >
            Envoyer un email au support
          </a>
        </div>
      )
    }
  };

  const currentSection = helpSections[helpSection];
  const ongletClasse = (actif) => `flex items-center gap-2 rounded-xl text-sm transition-colors ${actif ? 'bg-accent/15 text-accent-texte font-semibold' : 'text-encre-2 hover:bg-surface-2 hover:text-encre'}`;

  return (
    <Modal isOpen onClose={() => setShowHelp(false)} size="xl">
      <ModalHeader>
        <ModalTitle>Guide d'utilisation</ModalTitle>
        <ModalDescription>Tout savoir sur Mallettico</ModalDescription>
      </ModalHeader>

      {/* Onglets — téléphone */}
      <div className="md:hidden border-b border-bord">
        <div className="flex overflow-x-auto p-2 gap-1 scrollbar-hide">
          {Object.entries(helpSections).map(([key, section]) => (
            <button
              key={key}
              type="button"
              onClick={() => setHelpSection(key)}
              aria-pressed={helpSection === key}
              className={`${ongletClasse(helpSection === key)} px-3 min-h-[44px] whitespace-nowrap flex-shrink-0`}
            >
              <section.icon size={16} aria-hidden="true" />
              <span>{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Rubriques — bureau */}
        <nav aria-label="Rubriques du guide" className="hidden md:block w-48 border-r border-bord bg-fond p-3 overflow-y-auto">
          <div className="space-y-1">
            {Object.entries(helpSections).map(([key, section]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHelpSection(key)}
                aria-current={helpSection === key ? 'true' : undefined}
                className={`${ongletClasse(helpSection === key)} w-full px-3 py-2.5 text-left`}
              >
                <section.icon size={16} aria-hidden="true" />
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 p-5 sm:p-6 overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
              <currentSection.icon size={20} aria-hidden="true" />
            </span>
            <h3 className="text-xl font-bold text-encre">{currentSection.titleFull || currentSection.title}</h3>
          </div>
          {currentSection.content}
        </div>
      </div>
    </Modal>
  );
}

// Bienvenue d'un nouveau compte (première connexion, jamais en démo) : quatre écrans, sur ui/Modal et les jetons.
function OnboardingModal({ setShowOnboarding, isDark: _isDark, couleur: _couleur }) {
  const [step, setStep] = useState(0);

  const tuile = 'p-4 rounded-xl text-center bg-surface-2';

  const steps = [
    {
      icon: Hand,
      title: "Bienvenue sur Mallettico",
      subtitle: "Votre assistant de gestion pour artisan",
      content: (
        <div className="space-y-4">
          <p className="text-center text-encre-2">
            Vos devis à partir de vos prestations, la facture sans ressaisie, vos chantiers et vos encaissements au même endroit.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { Icone: FileText, texte: 'Devis depuis vos prestations' },
              { Icone: TrendingUp, texte: 'Marge calculée pour vous' },
              { Icone: Smartphone, texte: 'Sur téléphone' },
            ].map(({ Icone, texte }) => (
              <div key={texte} className={tuile}>
                <Icone size={26} className="mx-auto mb-2 text-encre-2" aria-hidden="true" />
                <p className="text-sm font-medium text-encre">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      icon: FileText,
      title: "Vos devis, puis vos factures",
      subtitle: "Du devis à la facture, sans ressaisie",
      content: (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-surface-2 border border-bord">
            <p className="mb-3 inline-flex px-2.5 h-6 items-center rounded-full bg-neutre-fond text-neutre-texte text-xs font-semibold">Exemple</p>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent/15">
                  <FileText size={18} className="text-accent-texte" />
                </div>
                <div>
                  <p className="font-medium text-encre">DEV-2025-001</p>
                  <p className="text-sm text-encre-2">Client: Dupont Marie</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-succes-fond text-succes-texte">Accepté</span>
            </div>
            <div className="p-3 rounded-xl bg-surface space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-encre-2">Rénovation cuisine complète</span>
                <span className="text-encre tabular-nums">5 000 €</span>
              </div>
              <div className="pt-2 border-t border-bord flex justify-between">
                <span className="font-medium text-encre">Total TTC</span>
                <span className="font-bold text-lg text-encre tabular-nums">5 500 €</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-succes-fond text-succes-texte inline-flex items-center gap-1"><CheckCircle size={14} aria-hidden="true" /> Accepté</span>
            <ChevronRight size={16} className="text-encre-3" aria-hidden="true" />
            <span className="px-3 py-1.5 rounded-lg bg-surface-2 text-encre inline-flex items-center gap-1"><Wallet size={14} aria-hidden="true" /> Facturer</span>
          </div>
        </div>
      )
    },
    {
      icon: Building2,
      title: "Suivez vos chantiers",
      subtitle: "Dépenses, heures et rentabilité",
      content: (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-surface-2 border border-bord">
            <p className="mb-3 inline-flex px-2.5 h-6 items-center rounded-full bg-neutre-fond text-neutre-texte text-xs font-semibold">Exemple</p>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-encre">Rénovation Dupont</p>
                <p className="text-sm text-encre-2">En cours</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-encre tabular-nums">60 %</p>
                <p className="text-xs text-encre-2">Marge sur chantier</p>
              </div>
            </div>
            {/* En hors taxes (la TVA n'est pas un revenu) et juste : 5 000 − 1 200 − 800 = 3 000 ; 3 000 / 5 000 = 60 %
                (relecture juriste du 25 oct. 2026, R-B ; avant : 5 500 € TTC, 3 685 € de marge, « marge nette 67 % ») */}
            <div className="grid grid-cols-2 gap-2">
              {[['5 000 €', 'Chiffre d\'affaires HT'], ['1 200 €', 'Dépenses'], ['800 €', 'Main-d\'œuvre'], ['3 000 €', 'Marge']].map(([valeur, libelle]) => (
                <div key={libelle} className="p-3 rounded-xl text-center bg-surface">
                  <p className="font-bold text-encre tabular-nums">{valeur}</p>
                  <p className="text-xs text-encre-2">{libelle}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-encre-2">
            Ajoutez vos dépenses et heures pour calculer automatiquement votre rentabilité
          </p>
        </div>
      )
    },
    {
      icon: Rocket,
      title: "Prêt à commencer ?",
      subtitle: "Votre première étape",
      content: (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-surface-2 border border-bord">
            <ol className="space-y-4">
              {[
                ['Configurez votre entreprise', 'Allez dans Paramètres pour ajouter votre logo et vos infos'],
                ['Créez votre premier client', 'Ajoutez les coordonnées de vos clients pour les retrouver facilement'],
                ['Créez votre premier devis', 'À partir de vos prestations ; la facture suivra sans ressaisie'],
              ].map(([titre, texte], i) => (
                <li key={titre} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-surface text-encre border border-bord-fort">{i + 1}</div>
                  <div>
                    <p className="font-medium text-encre">{titre}</p>
                    <p className="text-sm text-encre-2">{texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className="text-center text-sm text-encre-2">
            Besoin d'aide ? Touchez votre initiale, en haut à droite, puis <strong>Aide</strong>.
          </p>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  const terminer = () => {
    try { localStorage.setItem('mallettico_onboarding_complete', 'true'); } catch { /* préférence non enregistrée : la bienvenue reviendra */ }
    setShowOnboarding(false);
  };

  return (
    <Modal isOpen onClose={terminer} size="md" closeOnBackdrop={false}>
      {/* Avancement */}
      <div className="h-1 bg-surface-2 rounded-t-3xl sm:rounded-t-2xl overflow-hidden" aria-hidden="true">
        <div className="h-full transition-all duration-300 bg-accent" style={{ width: `${((step + 1) / steps.length) * 100}%` }}></div>
      </div>
      <ModalHeader>
        <ModalTitle className="sr-only">{currentStep.title}</ModalTitle>
        <ModalDescription className="sr-only">Étape {step + 1} sur {steps.length}</ModalDescription>
      </ModalHeader>

      <ModalBody className="!pt-0">
        <div className="text-center mb-6">
          <span className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-accent/10 text-accent-texte">
            <currentStep.icon size={28} aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-bold mb-2 text-encre">{currentStep.title}</h2>
          <p className="text-encre-2">{currentStep.subtitle}</p>
        </div>
        {currentStep.content}
      </ModalBody>

      <ModalFooter className="justify-between pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-accent' : 'bg-bord-fort'}`} />
            ))}
          </div>
          <Bouton variante="discret" taille="compacte" onClick={terminer}>Passer</Bouton>
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Bouton variante="secondaire" onClick={() => setStep(step - 1)}>Retour</Bouton>
          )}
          <Bouton variante="principal" onClick={() => (step < steps.length - 1 ? setStep(step + 1) : terminer())}>
            {step < steps.length - 1 ? 'Suivant' : 'Terminer'}
          </Bouton>
        </div>
      </ModalFooter>
    </Modal>
  );
}
