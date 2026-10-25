import React, { useState, useRef, useEffect, useMemo, Suspense, lazy } from 'react';
import { Plus, ArrowLeft, Download, Trash2, Send, Mail, MessageCircle, Edit3, Check, X, FileText, Receipt, Clock, Search, ChevronRight, ChevronUp, ChevronDown, Star, Eye, Pen, CreditCard, CheckCircle, AlertTriangle, XCircle, Building2, Copy, TrendingUp, Sparkles, PenTool, Loader2, Link2, Zap, ArrowUpDown, Bell, RotateCcw, BarChart3, BellRing, ClipboardList, LayoutGrid, List, Kanban, Droplets, Paintbrush, Flag, Smartphone }  from 'lucide-react';
import supabase, { isDemo } from '../supabaseClient';
import { useSubscriptionStore, PLANS } from '../stores/subscriptionStore';
const PipelineKanban = lazy(() => import('./pipeline/PipelineKanban'));
import { DEVIS_STATUS_LABELS } from '../lib/constants';
import { ChampRecherche, BoutonVolet, Volet, GroupeChoix, ListeChoix, PucesActives, SegmentDefilant } from './ui/Filtres';
/**
 * Éditeurs et modales chargés à la demande.
 *
 * Ces neuf composants totalisent ~6 300 lignes et n'apparaissent que sur une
 * action de l'artisan. Les importer statiquement les empilait dans le bundle de
 * la page la plus ouverte de l'app — celle qu'on ouvre sur un chantier, en 4G.
 *
 * Le Suspense est encapsulé ici pour que les treize points de rendu de la page
 * restent inchangés : un oubli de Suspense sur l'un d'eux ferait planter la page.
 */
const chargerALaDemande = (importer) => {
  const Composant = lazy(importer);
  function ModaleDifferee(props) {
    return (
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/20">
            <div className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        }
      >
        <Composant {...props} />
      </Suspense>
    );
  }
  return ModaleDifferee;
};

const PaymentModal = chargerALaDemande(() => import('./PaymentModal'));
const TemplateSelector = chargerALaDemande(() => import('./TemplateSelector'));
const SignaturePad = chargerALaDemande(() => import('./SignaturePad'));
const SmartTemplateWizard = chargerALaDemande(() => import('./SmartTemplateWizard'));
const DevisWizard = chargerALaDemande(() => import('./DevisWizard'));
const DevisComposer = chargerALaDemande(() => import('./DevisComposer'));
const CatalogBrowser = chargerALaDemande(() => import('./CatalogBrowser'));
const DevisExpressModal = chargerALaDemande(() => import('./DevisExpressModal'));
const AvoirCreationModal = chargerALaDemande(() => import('./modals/AvoirCreationModal'));
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { mapError } from '../lib/errorMapper';
import { formatMoney as fmtMoney, filterValidLignes, formatClientName } from '../lib/formatters';
import { normalizeNumero } from '../lib/devis-utils';
import { apresPaiement, statutFacture, resteAPayer, dejaPaye, echeance, dateEcheance, joursDeRetard, paiementsDe, montantPaiement, estCorrection, correctionPossible, motifCorrection, resteSigne } from '../lib/paiementsFacture';
import CorrectionEncaissementModal from './devis/CorrectionEncaissementModal';
import EnTeteDocument from './devis/EnTeteDocument';
import LigneListe, { GroupeListe, Avatar } from './ui/LigneListe';
import { Bouton, BoutonIcone } from './ui/Bouton';
import Pastille, { PastilleStatut } from './ui/Pastille';
import TuileChiffre from './ui/TuileChiffre';
import EtatVide from './ui/EtatVide';
import Champ from './ui/Champ';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import FeuilleRelance from './devis/FeuilleRelance';
import { texteDeHtml } from '../lib/texteDeHtml';
import { libelleModePaiement } from '../lib/modesPaiement';
import { avecMentionTtc } from '../lib/mentionMontant';
import { RELANCES_PAR_ENVOI } from '../lib/relanceEngine';
import { pourcent, blocConditionsPaiement, CONDITIONS_PAIEMENT, euros, quantite } from '../lib/formatDocument';
import { natureDuDocument, piedDePageHtml } from '../lib/piedDePageDocument';
import { echapperHtml as echap, couleurCss } from '../lib/echapperHtml';
import { totauxDocument, lignesTotauxHtml, lignesAcompteHtml, calculerTotaux } from '../lib/totauxDocument';
import { lignesFactureAcompte, lignesFactureSolde } from '../lib/facturation';
import { verifierNouvelleFacture, pourcentageAcompteValide, peutModifierDocument, peutSupprimerDocument, estEntierementFacture, dejaFactureTTC, montantCredite } from '../lib/gardeFacturation';
import { DEFAULT_PENALTY_RATE, estClientPro } from '../lib/relanceUtils';
import { blocRetractationHtml, estConcerneParRetractation, lienRetractationEnLigne, mentionsSignatureClientHtml, delaiSeptJours, raisonSeptJours, echeanceApresSeptJours } from '../lib/retractation';
import { soldeDe, texteCourt, telInternational } from '../lib/messageRelance';
import { useDebounce } from '../hooks/useDebounce';
import { useDevisModals } from '../hooks/useDevisModals';
import { usePermissions } from '../hooks/usePermissions';
import { ReadOnlyBanner } from './ui/PermissionGate';
import PageHeader from './ui/PageHeader';
import { printSituationFacture as printSitFacture, PAGE_CSS } from '../lib/devisHtmlBuilder';
import { marquerDocumentFictif } from '../lib/donneesFictives';
import { sendDocumentEmail, buildDocumentEmailBody, buildPaymentReceiptEmailBody } from '../lib/emailSender';
import RelanceTimelineWidget from './RelanceTimelineWidget';
import { useRelances } from '../hooks/useRelances';
import { printMiseEnDemeure } from '../lib/miseEnDemeureBuilder';
import { useOrg } from '../context/OrgContext';
import { useData } from '../context/DataContext';
import { MODELES_DEVIS } from '../lib/data/modeles-devis';
import AcompteEcheancierModal from './devis/AcompteEcheancierModal';
import AcompteSuiviCard from './devis/AcompteSuiviCard';
import {
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
import useKeepInViewport from '../hooks/useKeepInViewport';
import { mentionTvaReduiteHtml } from '../lib/mentionTvaReduite';
import { remettreFichier, estNatif, ouvrirLienExterne } from '../lib/natif';
import { captureException } from '../lib/sentry';
import { imprimerHtml } from '../lib/imprimerHtml';
import { nomImprime, formeImprimee } from '../lib/identiteEntreprise';
import { profilManquant } from '../lib/profilLegal';
import { estFranchiseTva, sansTva, franchiseAppliquee, tvaARegulariser, premierTaux, tauxTvaParDefaut, tauxTvaDocument } from '../lib/franchiseTva';
import { estOuverte, estEnRetard, aTraiter as docATraiter, devisARelancer } from '../lib/ventes';
import { urlPublique } from '../lib/urlPublique';
import { FONCTIONS } from '../lib/fonctions';
import { jourLocal, dateLue } from '../lib/dates';
import { signatureDuClient } from '../lib/signatureDocument';
import RetractationDevis from './devis/RetractationDevis';
import ExemplaireSigne from './devis/ExemplaireSigne';
import { messageExemplaire, nomFichierExemplaire } from '../../supabase/functions/notify-signature/exemplaire.ts';
import { finValidite, joursRestants, estExpire } from '../lib/validiteDevis';
import { createPortal } from 'react-dom';

// Email tracking : l'envoi passe par Resend (send-email) ; l'historique par document
// n'est pas persisté côté client → statut vide (l'onglet « Emails » reste masqué).
const getDocumentEmailStatus = () => ({ sent: 0, records: [] });

// Valid status transitions — enforced on buttons and dropdown
const VALID_TRANSITIONS = {
  // Devis transitions
  brouillon: ['envoye', 'refuse'],
  envoye: ['vu', 'accepte', 'refuse'],
  vu: ['accepte', 'refuse'],
  // « Acompte facturé » et « Facturé » viennent des factures créées, jamais d'un changement de statut
  // à la main (recette du 9 oct. 2026 : un devis « Facturé » sans facture, sans retour possible).
  accepte: [],
  signe: [],
  acompte_facture: [],
  facture: [],
  refuse: ['brouillon'],
};
// Facture-specific transitions (keyed by 'facture:status')
// « Payée » vient d'un encaissement enregistré (« Encaisser »), qui compte dans l'encaissé du mois.
const FACTURE_TRANSITIONS = {
  brouillon: ['envoye'],
  envoye: [],
  payee: [],
};

// Conditions de règlement : table commune (src/lib/formatDocument.js), aussi lue par les générateurs.

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

export default function DevisPage({ clients, setClients, addClient, devis, setDevis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret, selectedDevis, setSelectedDevis, isDark, couleur, createMode, setCreateMode, addChantier, setPage, setSelectedChantier, addEchange, paiements = [], addPaiement, generateNextNumero, aiPrefill, setAiPrefill, editDevisId, setEditDevisId, demande, setDemande }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // RBAC permissions
  const { canPerform, canViewPrices, getPermission } = usePermissions();
  const devisPermission = getPermission('devis');
  const isViewOnly = devisPermission === 'view' || devisPermission === 'view_no_prices';

  // Organization context
  const { orgId } = useOrg();

  // Template operations from DataContext
  const { customTemplates: ctxTemplates, addTemplate, deleteTemplate: deleteCtxTemplate, templateUsages, trackTemplateUsage, updateClient: ctxUpdateClient } = useData();

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
  const cardBg = "bg-surface border-bord";
  const inputBg = "bg-surface border-bord-fort text-encre placeholder:text-encre-3";
  const textPrimary = "text-encre";
  const textSecondary = "text-encre-2";
  const textMuted = "text-encre-2";

  // Helper for PDF - format RCS complet
  const getRCSComplet = () => {
    if (!entreprise?.rcsVille || !entreprise?.rcsNumero) return '';
    return `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;
  };

  const [mode, setMode] = useState(selectedDevis ? 'preview' : 'list');
  const [selected, setSelected] = useState(selectedDevis || null);
  // État (puces : à traiter, en attente, brouillons, payés ; tuiles : à encaisser, devis en attente) et nature
  // du document (volet « Filtres ») : deux filtres distincts depuis l'audit UX du 20 oct. 2026 (huit puces mêlaient les deux)
  const [filter, setFilter] = useState('all');
  const [nature, setNature] = useState('all');
  const [relanceDe, setRelanceDe] = useState(null); // document à relancer : feuille « Relancer » (canal, aperçu, envoi)
  const [choixFacturation, setChoixFacturation] = useState(false); // « Facturer » : acompte, échéancier, solde, situation
  const optionsFacturationRef = useRef([]); // options calculées par la fiche (devis ouvert), lues par l'effet ci-dessous
  // « Facturer » touché dans la liste ouvre la fiche avec le choix ; comme sur la fiche, une seule option part directement
  // (relecture de la Task 4, 24 oct. 2026)
  useEffect(() => {
    if (!choixFacturation || mode !== 'preview') return;
    const options = optionsFacturationRef.current || [];
    if (options.length <= 1) {
      setChoixFacturation(false);
      if (options.length === 1) options[0].action();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choixFacturation, mode, selected?.id]);
  const [periodFilter, setPeriodFilter] = useState('all'); // B7: all, month, quarter, year
  // Recherche / Filtres / Trier : boîte à outils commune (ui/Filtres.jsx). Période, client et chantier
  // dans le volet « Filtres » ; tri, vue et export dans « Trier et afficher » (recette du 9 oct.).
  const [volet, setVolet] = useState(null); // null | 'filtres' | 'tri'
  const boutonFiltresRef = useRef(null);
  const boutonTriRef = useRef(null);
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
  // DevisComposer — nouveau parcours de création single-canvas (banger)
  const [showDevisComposer, setShowDevisComposer] = useState(false);
  const [clientInitial, setClientInitial] = useState(null);
  const [chantierInitial, setChantierInitial] = useState(null);
  // Édition : composer pour devis/factures, wizard pour les avoirs (montants négatifs)
  /**
   * Ouvre l'éditeur pour un NOUVEAU devis.
   *
   * La limite se vérifie ici, avant d'ouvrir : le filet de sécurité posé dans
   * DataContext refuserait bien l'enregistrement, mais l'artisan aurait déjà
   * composé son devis. On préfère le prévenir avant qu'il travaille pour rien.
   */
  // clientId : ouvert depuis une fiche client, l'éditeur part avec ce client (sinon : un clic reçu).
  const ouvrirNouveauDevis = (clientId, chantierId = null) => {
    const { planId, usage, openUpgradeModal } = useSubscriptionStore.getState();
    const limite = (PLANS[planId] || PLANS.gratuit).limits?.devis ?? -1;
    if (limite !== -1 && (usage?.devis ?? 0) >= limite) {
      openUpgradeModal('devis_limit');
      return;
    }
    setClientInitial(typeof clientId === 'string' ? clientId : null);
    // Depuis la fiche d'un chantier : le devis est rattaché à ce chantier (avant : la liste des devis, recette du 9 oct.)
    setChantierInitial(typeof chantierId === 'string' ? chantierId : null);
    setEditingDevis(null);
    setShowDevisComposer(true);
  };

  const openEditor = (doc) => {
    // Une facture émise ne se modifie pas (avoir) ; un devis facturé non plus (avenant)
    if (doc?.id && !peutModifierDocument(doc, devis)) {
      showToast(doc.type === 'facture'
        ? 'Une facture émise ne se modifie pas : faites un avoir.'
        : 'Ce devis est déjà facturé : faites un avenant.', 'error');
      return;
    }
    setEditingDevis(doc);
    if (doc?.facture_type === 'avoir') setShowDevisWizard(true);
    else setShowDevisComposer(true);
  };

  // Échéancier d'acomptes
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [echeancierCache, setEcheancierCache] = useState({}); // { devisId: echeancierData }

  const [acomptePct, setAcomptePct] = useState((entreprise?.acompteDefaut ?? 30));
  // Le pourcentage proposé est celui que le devis signé annonce (avant : 30 % quel que soit le devis)
  const ouvrirAcompte = () => {
    setAcomptePct(Number(selected?.acompte_pct) || (entreprise?.acompteDefaut ?? 30));
    setShowAcompteModal(true);
  };
  // Montant TTC de la facture d'acompte telle qu'elle sera créée (lignes par taux, arrondies)
  const ttcAcompte = (pct) => calculerTotaux(lignesFactureAcompte(selected, pct, { tauxDefaut: tauxTvaParDefaut(entreprise) }), { tauxDefaut: tauxTvaParDefaut(entreprise), franchise: isMicro }).totalTTC;
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  const [snackbar, setSnackbar] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signataireName, setSignataireName] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // 'pdf' | 'duplicate' | null
  const [chantierForm, setChantierForm] = useState({ nom: '', adresse: '' });
  const [pdfContent, setPdfContent] = useState('');
  const [voletStatut, setVoletStatut] = useState(false); // fiche : « Changer le statut » (menu ⋯)
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
  const createMenuRef = useRef(null);
  useKeepInViewport(createMenuRef, showCreateMenu);
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
  const [signatureLinkUrl] = useState(null);
  const [showSendConfirmation, setShowSendConfirmation] = useState(null); // { clientName, montant, canal, doc }
  const [showCreationSuccess, setShowCreationSuccess] = useState(null); // { devis, numero }

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
    date: jourLocal(),
    validite: entreprise?.validiteDevis || 30,
    sections: [{ id: '1', titre: '', lignes: [] }],
    tvaDefaut: tauxTvaParDefaut(entreprise),
    remise: 0,
    retenueGarantie: false, // Retenue de garantie 5% (BTP)
    conditionsPaiement: entreprise?.conditionsPaiementDefaut || '30_jours',
    notes: ''
  });

  // Franchise en base (art. 293 B CGI) : aucune TVA sur les documents créés (src/lib/franchiseTva.js)
  const isMicro = estFranchiseTva(entreprise);
  // Totaux à enregistrer, arrondis par taux (calculerTotaux) : HT + TVA = TTC au centime, franchise respectée.
  // Relecture juridique du 9 oct. 2026 (tâche totaux-arrondis) : Devis Express, l'assistant par métier et le
  // formulaire intégré enregistraient des totaux non arrondis, calculés à part (règle EN 16931 BR-CO-15).
  const totauxEnregistres = (lignes, { remise = 0, tauxDefaut } = {}) => {
    const t = calculerTotaux(lignes, { remisePct: Number(remise) || 0, tauxDefaut: tauxDefaut ?? tauxTvaParDefaut(entreprise), franchise: isMicro });
    return { total_ht: t.totalHT, tva: t.totalTVA, total_tva: t.totalTVA, total_ttc: t.totalTTC, tvaParTaux: t.tvaParTaux, tvaDetails: t.tvaParTaux };
  };
  const formatMoney = (n) => fmtMoney(n, 2);

  // Calcul pénalités de retard (Article L441-10 Code de commerce)
  const calculatePenalites = (doc) => {
    if (!doc || doc.type !== 'facture' || doc.statut === 'payee' || doc.facture_type === 'avoir') return null;
    // Sur le reste dû (après acomptes) et au taux réglé dans les paramètres — avant : sur le TTC entier,
    // avec une clé de réglage qui n'existait pas (relecture juridique du 9 oct. 2026).
    const ech = echeance(doc, { delaiJours: entreprise?.delaiPaiement });
    if (!ech) return null;
    const joursRetard = Math.max(0, Math.floor((Date.now() - ech) / 86400000));
    if (joursRetard <= 0) return null;
    const reste = resteAPayer(doc, paiements);
    if (reste <= 0) return null;
    const taux = Number(entreprise?.tauxPenalites) || DEFAULT_PENALTY_RATE;
    const penalite = reste * (taux / 100) * (joursRetard / 365);
    return { joursRetard, echeance: ech, taux, penalite: Math.round(penalite * 100) / 100, indemnite: 40, total: Math.round((penalite + 40) * 100) / 100 };
  };

  useEffect(() => { if (snackbar) { const t = setTimeout(() => setSnackbar(null), 8000); return () => clearTimeout(t); } }, [snackbar]);
  useEffect(() => { if (createMode) { ouvrirNouveauDevis(createMode?.clientId, createMode?.chantierId); setCreateMode?.(false); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [createMode, setCreateMode]);

  // Demande venue d'ailleurs (App.jsx, ouvrirDevis) : l'Accueil et la recherche ouvrent la fiche ET la feuille
  // « Relancer », ou la liste filtrée sur un état ou une nature (audit UX du 20 oct. 2026 : « Relancer » et
  // « Finaliser » de l'Accueil n'ouvraient que la fiche, ou la liste non filtrée)
  useEffect(() => {
    if (!demande) return;
    if (demande.relancer) {
      const doc = devis.find(d => d.id === demande.relancer);
      if (!doc) return; // documents pas encore chargés : la demande attend
      setSelected(doc);
      setMode('preview');
      // La feuille « Relancer » envoie au client : seulement pour un rôle qui envoie ; sinon, la fiche seule
      if (canPerform('devis', 'send')) setRelanceDe(doc);
    } else {
      setSelected(null);
      setMode('list');
      if (demande.etat) setFilter(demande.etat);
      if (demande.nature) setNature(demande.nature);
    }
    setDemande?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demande, devis]);

  // Ouverture directe de l'éditeur sur un devis précis. Sert à la dictée : quand
  // l'artisan demande un devis sans donner de prix, on l'amène là où il peut le
  // chiffrer, plutôt que sur une fiche vide en lecture seule.
  useEffect(() => {
    if (!editDevisId) return;
    const doc = devis.find(d => d.id === editDevisId);
    if (doc) openEditor(doc);
    setEditDevisId?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDevisId, devis]);

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
      tvaDefaut: aiPrefill.tvaRate ?? prev.tvaDefaut,
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

  // « En attente » et « À traiter » d'après le reste dû (src/lib/ventes.js) : avant (recette du 9 oct.),
  // le statut brut y mettait des factures payées. Facture : reste dû ; devis : envoyé sans réponse.
  const enAttente = (d) => (d.type === 'facture' ? estOuverte(d, paiements) : ['envoye', 'vu'].includes(d.statut));
  // La même règle que la pastille du menu (App.jsx) : src/lib/ventes.js
  const aTraiter = (d) => docATraiter(d, paiements, new Date(), entreprise);

  const estDeNature = (d, n) => {
    if (n === 'devis') return d.type === 'devis';
    if (n === 'factures') return d.type === 'facture' && d.facture_type !== 'avoir' && d.facture_type !== 'situation';
    if (n === 'situations') return d.facture_type === 'situation';
    if (n === 'avoirs') return d.facture_type === 'avoir';
    if (n === 'acomptes') return d.facture_type === 'acompte' || d.facture_type === 'solde' || (d.type === 'devis' && (d.statut === 'acompte_facture' || !!d.echeancier_id));
    return true;
  };
  const estDansEtat = (d, e) => {
    if (e === 'attente') return enAttente(d);
    if (e === 'a_traiter') return aTraiter(d);
    if (e === 'brouillons') return d.statut === 'brouillon';
    if (e === 'payes') return d.type === 'facture' && d.facture_type !== 'avoir' && statutFacture(d, paiements) === 'payee';
    if (e === 'a_encaisser') return estOuverte(d, paiements);
    if (e === 'devis_attente') return d.type === 'devis' && ['envoye', 'vu'].includes(d.statut);
    if (e === 'en_relance') return !!relances.getDocumentPending(d.id);
    return true;
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
    // Nature (volet « Filtres »)
    if (!estDeNature(d, nature)) return false;
    // État (puces) ; « à encaisser » et « devis en attente » viennent des tuiles
    if (!estDansEtat(d, filter)) return false;
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
    // Puces d'état : comptées dans la nature choisie ; natures : dans l'état choisi
    const dansNature = base.filter(d => estDeNature(d, nature));
    const dansEtat = base.filter(d => estDansEtat(d, filter));
    return {
      all: dansNature.length,
      attente: dansNature.filter(enAttente).length,
      a_traiter: dansNature.filter(aTraiter).length,
      brouillons: dansNature.filter(d => estDansEtat(d, 'brouillons')).length,
      payes: dansNature.filter(d => estDansEtat(d, 'payes')).length,
      devis: dansEtat.filter(d => estDeNature(d, 'devis')).length,
      factures: dansEtat.filter(d => estDeNature(d, 'factures')).length,
      situations: dansEtat.filter(d => estDeNature(d, 'situations')).length,
      avoirs: dansEtat.filter(d => estDeNature(d, 'avoirs')).length,
      acomptes: dansEtat.filter(d => estDeNature(d, 'acomptes')).length,
      natures_tous: dansEtat.length,
      a_traiter_tous: base.filter(aTraiter).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis, clients, periodStart, paiements, nature, filter]);

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
    const tvaRate = tauxTvaDocument(d, entreprise);
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
        notes: form.notes,
        ...totauxEnregistres(form.sections.flatMap(s => s.lignes), { remise: form.remise, tauxDefaut: form.tvaDefaut }),
      });

      // Reset form
      setForm({
        type: 'devis',
        clientId: '',
        chantierId: '',
        date: jourLocal(),
        validite: entreprise?.validiteDevis || 30,
        sections: [{ id: '1', titre: '', lignes: [] }],
        tvaDefaut: tauxTvaParDefaut(entreprise),
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
      date: jourLocal(),
      validite: doc.validite || entreprise?.validiteDevis || 30,
      statut: 'brouillon',
      sections: newSections,
      lignes: newLignes,
      tvaParTaux: doc.tvaParTaux,
      tvaDetails: doc.tvaDetails,
      tvaRate: tauxTvaDocument(doc, entreprise),
      remise: doc.remise || 0,
      retenueGarantie: doc.retenueGarantie || false,
      total_ht: doc.total_ht,
      tva: doc.tva,
      total_ttc: doc.total_ttc,
      notes: doc.notes || ''
    };

    const created = await onSubmit(newDoc);
    if (!created) return; // refus (limite du plan, droits) : pas de fiche fantôme
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
      date: jourLocal(),
      validite: doc.validite || entreprise?.validiteDevis || 30,
      statut: 'brouillon',
      sections: newSections,
      lignes: newLignes,
      tvaParTaux: doc.tvaParTaux,
      tvaDetails: doc.tvaDetails,
      tvaRate: tauxTvaDocument(doc, entreprise),
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
    if (!created) return; // refus (limite du plan, droits) : pas de fiche fantôme
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
  const saveSignature = () => { if (!selected) return; onUpdate(selected.id, { signature: canvasRef.current?.toDataURL() || 'signed', signataire: signataireName || '', signatureDate: new Date().toISOString(), statut: 'accepte' }, { silencieux: true }); setMode('list'); setSelected(null); setSignataireName(''); setSnackbar({ type: 'success', message: 'Devis signé et accepté !' }); };

  // New signature pad handler (react-signature-canvas)
  const handleSignatureSave = async (signatureData) => {
    if (!selected) return;
    // Demande expresse recueillie avec la signature sur place (L221-25) : posée dans la même écriture que la
    // signature (après, la base la refuse, migration 086)
    const signe = {
      signature: signatureData.signature,
      signatureDate: signatureData.signatureDate,
      signataire: signatureData.signataire,
      statut: 'accepte',
      ...(signatureData.executionAnticipee ? { execution_anticipee_le: signatureData.signatureDate } : {}),
      // Accord du client pour recevoir son exemplaire par e-mail (L221-9), conservé avec la signature (090)
      ...(signatureData.exemplaireParEmail ? { exemplaire_email_accepte_le: signatureData.signatureDate } : {}),
    };
    const enregistre = await onUpdate(selected.id, signe);
    setSelected(s => ({ ...s, ...signe }));
    const particulier = estConcerneParRetractation({ doc: selected, client: clients.find(c => c.id === selected.client_id) });
    // Particulier sans e-mail : l'exemplaire papier est dû tout de suite (L221-9) ; la fiche le rappelle aussi
    setSnackbar(particulier && !signatureData.exemplaireParEmail
      ? { type: 'warning', message: 'Devis signé. Remettez maintenant au client son exemplaire daté, imprimé et signé par vous deux (article L221-9 du Code de la consommation).' }
      : { type: 'success', message: 'Devis signé et accepté ✓' });
    // Exemplaire signé par e-mail, avec l'accord du client (L221-9) : envoyé aussitôt (tâche confirmation-client)
    if (signatureData.exemplaireParEmail && enregistre !== false) await envoyerExemplaireSigne({ ...selected, ...signe }, { accordDonne: true });
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
      const rate = l.tva !== undefined ? l.tva : premierTaux(devisData.tvaDefaut, tauxTvaParDefaut(entreprise));
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
      tvaRate: premierTaux(devisData.tvaDefaut, tauxTvaParDefaut(entreprise)),
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
      template: devisData.template,
      ...totauxEnregistres(allLignes, { remise: devisData.remise, tauxDefaut: devisData.tvaDefaut }),
    };

    // Submit the devis
    const created = await onSubmit(newDevis);
    if (!created) return; // refus : l'assistant reste ouvert

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
  // Corriger un encaissement (tâche encaissement-corriger, migration 098) : écriture négative motivée ; la base
  // recalcule le montant encaissé et repasse la facture « envoyée » si elle n'est plus soldée, l'écran suit
  const [correctionDe, setCorrectionDe] = useState(null);
  const corrigerEncaissement = async (paiement, montant, motif) => {
    if (!addPaiement || !selected) return false;
    const enregistre = await addPaiement({
      amount: -montant,
      montant: -montant,
      date: jourLocal(),
      mode: 'correction',
      reference: paiement.id,
      notes: `Correction : ${motif}`,
      facture_id: selected.id,
      devisId: selected.id,
      documentNumero: selected.numero,
      document: selected.numero,
    });
    if (!enregistre) return false;
    const encaisse = Math.round((paiementsDe(selected, paiements).reduce((t, x) => t + montantPaiement(x), 0) - montant) * 100) / 100;
    const reste = (Number(selected.total_ttc) || 0) - (Number(selected.montant_credite) || 0) - encaisse;
    const maj = { montant_paye: encaisse, ...(selected.statut === 'payee' && reste > 0.01 ? { statut: 'envoye' } : {}) };
    onUpdate(selected.id, maj);
    setSelected(s => (s ? { ...s, ...maj } : s));
    return true;
  };

  const handlePaymentCreated = async (paymentData) => {
    // Seul un paiement REÇU s'enregistre : générer un lien ou un QR n'est pas un paiement (avant, le
    // lien enregistrait un paiement et pouvait marquer la facture payée).
    if (paymentData?.type !== 'offline' || !selected) return;
    const montantRecu = Math.round((Number(paymentData.amount) || 0) * 100) / 100;
    if (!(montantRecu > 0)) { showToast('Montant du paiement invalide.', 'error'); return; }
    if (selected.type === 'facture') {
      const reste = resteAPayer(selected, paiements);
      if (montantRecu > reste + 0.005) {
        const ok = await confirm({
          title: 'Paiement supérieur au reste dû',
          message: `Le paiement de ${formatMoney(montantRecu)} dépasse ce qui reste dû (${formatMoney(reste)}). L'enregistrer quand même ?`,
        });
        if (!ok) return;
      }
    }
    // Le paiement d'abord : s'il est refusé, rien d'autre ne change (DataContext a dit pourquoi)
    if (addPaiement) {
      const enregistre = await addPaiement({
        amount: montantRecu,
        montant: montantRecu,
        date: paymentData.date_paiement,
        mode: paymentData.mode_paiement,
        reference: paymentData.reference_paiement,
        facture_id: selected.id,
        devisId: selected.id,
        documentNumero: selected.numero,
        document: selected.numero,
      });
      if (!enregistre) return;
    }
    // Reçu de paiement au client (case cochée dans le modal d'encaissement)
    if (paymentData.sendReceipt && selected) {
      const receiptClient = clients.find(c => c.id === selected.client_id);
      if (receiptClient?.email) {
        if (isDemo || !supabase) {
          showToast(`Mode démo : reçu simulé à ${receiptClient.email} ✓`, 'success');
        } else {
          const bodyHtml = buildPaymentReceiptEmailBody({
            doc: selected,
            client: receiptClient,
            entreprise,
            couleur,
            montantFormatte: euros(montantRecu),
            modePaiement: paymentData.mode_paiement,
            datePaiement: paymentData.date_paiement,
          });
          sendDocumentEmail({
            to: receiptClient.email,
            subject: `Reçu de paiement — Facture ${selected.numero}${entreprise?.nom ? ` — ${entreprise.nom}` : ''}`,
            bodyHtml,
            fromName: entreprise?.nom,
            replyTo: entreprise?.email,
          })
            .then(() => showToast(`Reçu envoyé à ${receiptClient.email} ✓`, 'success'))
            .catch((e) => showToast(`Reçu non envoyé : ${e?.message || 'erreur'}`, 'error'));
        }
      }
    }
    // Montant reçu cumulé, et « payée » une fois soldée (src/lib/paiementsFacture.js). Avant (9 oct.) :
    // montant_paye n'était pas mis à jour (reste dû entier en Trésorerie et sur la page de paiement en
    // ligne) et le cumul lisait p.montant au lieu de amount — un 2e acompte ne soldait jamais.
    if (selected?.type === 'facture' && selected.statut !== 'payee') {
      const suite = apresPaiement(selected, paiements, montantRecu);
      if (!suite.soldee) {
        onUpdate(selected.id, { montant_paye: suite.montant_paye });
        setSelected(s => s ? { ...s, montant_paye: suite.montant_paye } : s);
      }
      if (suite.soldee) {
        // Build update payload — include offline payment metadata if available
        const updatePayload = { statut: 'payee', montant_paye: suite.montant_paye };
        if (paymentData.date_paiement) updatePayload.date_paiement = paymentData.date_paiement;
        if (paymentData.mode_paiement) updatePayload.mode_paiement = paymentData.mode_paiement;
        if (paymentData.reference_paiement) updatePayload.reference_paiement = paymentData.reference_paiement;

        // La base n'accepte « payée » que si les paiements la soldent (migration 099) : sa réponse d'abord. Un refus
        // est dit par DataContext et l'écran revient à l'état enregistré ; le paiement, lui, est déjà enregistré.
        if (await onUpdate(selected.id, updatePayload) === false) return;
        setSelected(s => s ? { ...s, ...updatePayload } : s);

        // Cancel any pending automatic relances for this document
        if (relances.isEnabled) {
          import('../lib/relanceEngine').then(({ cancelDocumentRelances }) => {
            cancelDocumentRelances(selected.id, relanceUserId, orgId).catch(() => {});
          });
        }

        const modeLabel = paymentData.mode_paiement ? ` (${libelleModePaiement(paymentData.mode_paiement)})` : '';
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

  // Ce qu'un devis permet de facturer : la fiche et l'action « Facturer » de la liste suivent la même règle (relecture de
  // la Task 4, 25 oct. 2026 : la liste proposait « Facturer » sur un devis déjà facturé ou facturé par situations)
  const facturationDe = (doc) => {
    const facturesLiees = getFacturesLiees(doc.id);
    // Facturé par situations de travaux : la suite passe par les situations (le décompte général définitif
    // solde le marché). Une facture « complète » ou un solde refacturerait le devis entier, situations comprises.
    const situationsFacturees = facturesLiees.filter(f => f.facture_type === 'situation');
    const chantierDesSituations = doc.chantier_id ? (chantiers || []).find(c => c.id === doc.chantier_id) : null;
    const situationsEnCours = chantierDesSituations?.situations_data?.devis_source_id === doc.id
      && (chantierDesSituations.situations_data.situations || []).length > 0;
    const facturationParSituations = situationsFacturees.length > 0 || situationsEnCours;
    const acompteFacture = getAcompteFacture(doc.id);
    // Une facture entièrement annulée par avoir ne compte plus : le devis redevient facturable (avant, recette du
    // 9 oct. 2026 : après un avoir total, le devis restait « Facturé » sans aucun moyen de le refacturer)
    const soldeBrut = getSoldeFacture(doc.id);
    const soldeFacture = soldeBrut && montantCredite(soldeBrut, devis) < Math.abs(Number(soldeBrut.total_ttc) || 0) - 0.01 ? soldeBrut : null;
    const resteAFacturer = Math.round(((Number(doc.total_ttc) || 0) - dejaFactureTTC(doc.id, devis)) * 100) / 100;
    const isDevis = doc.type === 'devis';
    const hasEcheancier = !!doc.echeancier_id || !!echeancierCache[doc.id];
    // Déjà facturé en entier (solde ou facture complète, même si le devis est resté « signé ») : plus de « Facturer »
    const entierementFacture = isDevis && estEntierementFacture(doc, devis);
    const canAcompte = isDevis && (doc.statut === 'accepte' || doc.statut === 'signe') && !acompteFacture && !hasEcheancier && !facturationParSituations && !entierementFacture;
    // « Facturé » mais toutes ses factures annulées par avoir ; jamais pour un devis « facturé » sans facture rattachée
    // (anciennes données) : il serait facturé deux fois
    const factureAnnulee = doc.statut === 'facture' && facturesLiees.some(f => f.facture_type !== 'avoir') && !entierementFacture;
    const canFacturer = isDevis && (['accepte', 'signe', 'acompte_facture'].includes(doc.statut) || factureAnnulee) && !soldeFacture && resteAFacturer > 0.005 && !facturationParSituations && !entierementFacture;
    return { facturesLiees, situationsFacturees, situationsEnCours, facturationParSituations, acompteFacture, soldeFacture, resteAFacturer, hasEcheancier, entierementFacture, canAcompte, canFacturer };
  };

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

  // Une facturation à la fois : un double appui, ou un second bouton touché pendant que la base répond,
  // créait une seconde facture (recette du 9 oct. 2026 : deux acomptes, deux soldes, complète + acompte).
  const facturationEnCoursRef = useRef(false);
  const [facturationEnCours, setFacturationEnCours] = useState(false);
  const facturerUneFois = async (fn) => {
    if (facturationEnCoursRef.current) { showToast('Facturation déjà en cours…', 'info'); return; }
    facturationEnCoursRef.current = true;
    setFacturationEnCours(true);
    try { return await fn(); } finally { facturationEnCoursRef.current = false; setFacturationEnCours(false); }
  };
  // Vérifiée sur TOUS les documents (et non sur l'écran au moment du clic) : déjà facturé, dépassement du
  // devis, montant nul ou négatif, devis sans client, mélange avec les situations (src/lib/gardeFacturation.js).
  // Pas de paiement dans les sept jours d'une signature sur place chez un particulier (C. conso. L221-10, tâche
  // sept-jours) : pour un devis, ou une facture tirée d'un tel devis. Rend { possibleLe, reporte }, ou null.
  const septJoursDe = (doc) => {
    if (!doc) return null;
    const source = doc.type === 'facture' ? devis.find(d => d.id === doc.devis_source_id) : (devis.find(d => d.id === doc.id) || doc);
    if (!source) return null;
    return delaiSeptJours({ devis: source, client: clients.find(c => c.id === source.client_id) });
  };

  const facturationAutorisee = (nature, montantTTC) => {
    const source = devis.find(d => d.id === selected?.id) || selected;
    // Acompte et étape d'échéancier : une demande de paiement, interdite pendant les sept jours
    const septJours = ['acompte', 'etape'].includes(nature) ? septJoursDe(source) : null;
    if (septJours) { showToast(raisonSeptJours(septJours), 'error'); return false; }
    const v = verifierNouvelleFacture(source, devis, { nature, montantTTC });
    if (!v.ok) showToast(v.raison, 'error');
    return v.ok;
  };

  // Facturer une étape d'échéancier — lignes par taux, remise visible ; les totaux enregistrés sont
  // ceux des lignes (src/lib/facturation.js), donc ceux que la facture imprime.
  const facturerEtape = (echeancier, etape) => facturerUneFois(async () => {
    if (!selected || !echeancier) return;
    const last = isLastEtape(etape, echeancier.etapes);
    const lignesEtape = buildFactureLignesForEtape(selected, etape, echeancier.etapes, tauxTvaParDefaut(entreprise));
    const lignes = isMicro ? sansTva(lignesEtape) : lignesEtape;
    const t = calculerTotaux(lignes, { tauxDefaut: tauxTvaParDefaut(entreprise), franchise: isMicro });
    const montants = { montant_ht: t.totalHT, tva: t.totalTVA, montant_ttc: t.totalTTC, tvaParTaux: t.tvaParTaux };
    const factureType = last ? 'solde' : 'acompte';
    if (!facturationAutorisee('etape', t.totalTTC)) return;

    const facture = {
      id: crypto.randomUUID(),
      numero: await generateNumero('facture'),
      type: 'facture',
      facture_type: factureType,
      devis_source_id: selected.id,
      client_id: selected.client_id,
      chantier_id: selected.chantier_id,
      date: jourLocal(),
      statut: 'envoye',
      date_echeance: dateEcheance(new Date(), { conditionsPaiement: selected.conditionsPaiement || selected.conditions, delaiJours: entreprise?.delaiPaiement }),
      conditions: selected.conditions, conditionsPaiement: selected.conditionsPaiement,
      tvaRate: tauxTvaDocument(selected, entreprise),
      tvaParTaux: montants.tvaParTaux,
      tvaDetails: montants.tvaParTaux,
      lignes,
      total_ht: montants.montant_ht,
      tva: montants.tva,
      total_ttc: montants.montant_ttc,
      acompte_pct: etape.pourcentage,
      objet: last
        ? `Facture de solde — ${selected.objet || selected.numero || ''}`
        : `Acompte ${pourcent(etape.pourcentage)} — ${etape.label || ''} — ${selected.objet || selected.numero || ''}`,
    };

    // Refus de la base : le devis reste tel quel (avant : « facturé » sans facture)
    const enregistreeEtape = await onSubmit(facture, { silencieux: true });
    if (!enregistreeEtape) return;
    // Numéro attribué par la base à l'enregistrement (migration 101) : celui de la ligne enregistrée fait foi
    if (enregistreeEtape.numero) facture.numero = enregistreeEtape.numero;

    // Update échéancier étape
    const updatedEtapes = updateEtape(echeancier.etapes, etape.numero, {
      statut: ETAPE_STATUT.FACTURE,
      facture_id: facture.id,
      date_facture: jourLocal(),
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
    onUpdate(selected.id, devisUpdate, { silencieux: true });
    setSelected({ ...selected, ...devisUpdate });

    setSnackbar({
      type: 'success',
      message: `Facture ${last ? 'de solde' : 'd\'acompte'} ${facture.numero} créée`,
      action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } },
    });
  });

  // Handle échéancier creation callback
  const handleEcheancierCreated = (echeancier) => {
    if (!selected) return;
    setEcheancierCache(prev => ({ ...prev, [selected.id]: echeancier }));
    const updates = { echeancier_id: echeancier.id, mode_facturation: 'echeancier' };
    onUpdate(selected.id, updates);
    setSelected({ ...selected, ...updates });
    setSnackbar({ type: 'success', message: 'Échéancier créé avec succès' });
  };

  const createAcompte = () => facturerUneFois(async () => {
    if (!selected || (selected.statut !== 'accepte' && selected.statut !== 'signe')) return showToast('Le devis doit être accepté ou signé', 'error');
    if (!pourcentageAcompteValide(acomptePct)) return showToast('Le pourcentage d\'acompte doit être compris entre 1 et 99 %.', 'error');
    if (getAcompteFacture(selected.id)) return showToast('Un acompte existe déjà', 'error');
    // Une ligne par taux de TVA du devis, sur les bases après remise (src/lib/facturation.js)
    const lignesParTaux = lignesFactureAcompte(selected, acomptePct, { tauxDefaut: tauxTvaParDefaut(entreprise) });
    const lignesAcompte = isMicro ? sansTva(lignesParTaux) : lignesParTaux;
    const tAcompte = calculerTotaux(lignesAcompte, { tauxDefaut: tauxTvaParDefaut(entreprise), franchise: isMicro });
    const montantHT = tAcompte.totalHT;
    const tva = tAcompte.totalTVA;
    const ttc = tAcompte.totalTTC;
    const tvaParTaux = tAcompte.tvaParTaux;
    if (!facturationAutorisee('acompte', ttc)) return;
    const facture = {
      id: crypto.randomUUID(), numero: await generateNumero('facture'), type: 'facture', facture_type: 'acompte',
      devis_source_id: selected.id, client_id: selected.client_id, chantier_id: selected.chantier_id,
      date: jourLocal(), statut: 'envoye',
      date_echeance: dateEcheance(new Date(), { conditionsPaiement: selected.conditionsPaiement || selected.conditions, delaiJours: entreprise?.delaiPaiement }),
      conditions: selected.conditions, conditionsPaiement: selected.conditionsPaiement,
      tvaRate: tauxTvaDocument(selected, entreprise),
      tvaParTaux, tvaDetails: tvaParTaux,
      lignes: lignesAcompte,
      total_ht: montantHT, tva, total_ttc: ttc, acompte_pct: acomptePct
    };
    // Refus de la base : le devis reste tel quel (avant : « facturé » sans facture)
    const enregistreeAcompte = await onSubmit(facture, { silencieux: true });
    if (!enregistreeAcompte) return;
    // Numéro attribué par la base à l'enregistrement (migration 101) : celui de la ligne enregistrée fait foi
    if (enregistreeAcompte.numero) facture.numero = enregistreeAcompte.numero;
    const acompteUpdate = {
      statut: 'acompte_facture',
      // Le devis signé garde le pourcentage qu'il annonce ; celui facturé est sur la facture d'acompte
      ...(selected.acompte_pct ? {} : { acompte_pct: acomptePct }),
      mode_facturation: 'acompte',
      acomptes_ids: [...(selected.acomptes_ids || []), facture.id],
      montant_facture: Math.round(ttc * 100) / 100,
    };
    onUpdate(selected.id, acompteUpdate, { silencieux: true });
    setShowAcompteModal(false);
    setSelected({ ...selected, ...acompteUpdate });
    setSnackbar({ type: 'success', message: `Facture d'acompte ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  });

  // La facture de solde (ou complète) telle qu'elle sera créée : lignes du devis, remise en lignes, chaque
  // acompte déduit par taux (src/lib/facturation.js), totaux arrondis par taux. Le montant annoncé à
  // l'artisan (confirmation, tuile) vient de ce même calcul : avant, il était recalculé en TTC
  // (total − acomptes) et pouvait différer d'un centime de la facture (relecture juridique du 9 oct. 2026).
  const factureDeSolde = (doc) => {
    const allAcomptes = getAllAcompteFactures(doc.id);
    const lignesSolde = lignesFactureSolde(
      doc,
      allAcomptes.map(a => ({ libelle: `Acompte déjà facturé (${a.numero})`, lignes: a.lignes, tvaParTaux: a.tvaParTaux || a.tvaDetails, montant_ht: a.total_ht })),
      { tauxDefaut: tauxTvaParDefaut(entreprise) },
    );
    const lignes = isMicro ? sansTva(lignesSolde) : lignesSolde;
    return { allAcomptes, lignes, totaux: calculerTotaux(lignes, { tauxDefaut: tauxTvaParDefaut(entreprise), franchise: isMicro }) };
  };

  const confirmAndCreateSolde = async () => {
    if (!selected) return;
    const chantierSit = selected.chantier_id ? (chantiers || []).find(c => c.id === selected.chantier_id) : null;
    const situationsSurChantier = chantierSit?.situations_data?.devis_source_id === selected.id && (chantierSit.situations_data.situations || []).length > 0;
    if (situationsSurChantier || getFacturesLiees(selected.id).some(f => f.facture_type === 'situation')) {
      showToast('Ce devis est facturé par situations de travaux : facturez la suivante depuis le chantier (onglet Situations).', 'error');
      return;
    }
    const { allAcomptes, totaux } = factureDeSolde(selected);
    if (!facturationAutorisee(allAcomptes.length > 0 ? 'solde' : 'totale', totaux.totalTTC)) return;
    const client = clients.find(c => c.id === selected.client_id);
    const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'le client';
    const montant = avecMentionTtc(formatMoney(totaux.totalTTC), isMicro);
    const label = allAcomptes.length > 0 ? `Facturer le solde de ${montant}` : `Créer la facture complète de ${montant}`;
    const ok = await confirm({
      title: allAcomptes.length > 0 ? 'Facturer le solde ?' : 'Créer la facture complète ?',
      // Pendant les sept jours (L221-10), la facture peut être émise mais ne doit réclamer aucun paiement (L242-7 :
      // « exiger ») : l'artisan le lit avant de créer (palliatif, relecture juriste-btp du 17 oct. 2026)
      message: `${label} pour ${clientName}. Cette action est irréversible.${septJoursDe(selected) ? `\n\n${raisonSeptJours(septJoursDe(selected))}` : ''}`
    });
    if (!ok) return;
    await createSolde();
  };

  const createSolde = () => facturerUneFois(async () => {
    if (!selected) return;
    // Lignes du devis + remise en lignes visibles + déduction de chaque acompte par taux ; totaux
    // enregistrés = totaux des lignes (src/lib/facturation.js — relecture juridique du 9 oct. 2026 :
    // la facture d'un devis remisé n'affichait aucune remise).
    const { allAcomptes, lignes, totaux: tSolde } = factureDeSolde(selected);
    const montantSoldeHT = tSolde.totalHT;
    const tva = tSolde.totalTVA;
    const ttc = tSolde.totalTTC;
    const tvaParTaux = tSolde.tvaParTaux;
    const hasAcomptes = allAcomptes.length > 0;
    if (!facturationAutorisee(hasAcomptes ? 'solde' : 'totale', ttc)) return;
    const facture = {
      id: crypto.randomUUID(), numero: await generateNumero('facture'), type: 'facture', facture_type: hasAcomptes ? 'solde' : 'totale',
      devis_source_id: selected.id, acompte_facture_id: allAcomptes[0]?.id || null, client_id: selected.client_id, chantier_id: selected.chantier_id,
      date: jourLocal(), statut: 'envoye',
      date_echeance: dateEcheance(new Date(), { conditionsPaiement: selected.conditionsPaiement || selected.conditions, delaiJours: entreprise?.delaiPaiement }),
      conditions: selected.conditions, conditionsPaiement: selected.conditionsPaiement,
      tvaRate: tauxTvaDocument(selected, entreprise),
      tvaParTaux, tvaDetails: tvaParTaux,
      lignes, total_ht: montantSoldeHT, tva, total_ttc: ttc
    };
    // Pendant les sept jours d'un devis signé sur place chez un particulier (L221-10) : aucun paiement réclamé
    // avant la fin du délai (échéance et phrase imprimée dans les trois générateurs)
    Object.assign(facture, echeanceApresSeptJours(septJoursDe(selected), facture.date_echeance, selected.conditionsPaiement || selected.conditions) || {});
    // Refus de la base : le devis reste tel quel (avant : « facturé » sans facture)
    const enregistreeSolde = await onSubmit(facture, { silencieux: true });
    if (!enregistreeSolde) return;
    // Numéro attribué par la base à l'enregistrement (migration 101) : celui de la ligne enregistrée fait foi
    if (enregistreeSolde.numero) facture.numero = enregistreeSolde.numero;
    const soldeUpdate = {
      statut: 'facture',
      facture_solde_id: facture.id,
      montant_facture: Math.round((selected.total_ttc || 0) * 100) / 100,
      ...(hasAcomptes ? { mode_facturation: selected.mode_facturation || 'acompte' } : { mode_facturation: 'direct' }),
    };
    await onUpdate(selected.id, soldeUpdate, { silencieux: true });
    setSelected({ ...selected, ...soldeUpdate });
    setSnackbar({ type: 'success', message: `Facture ${hasAcomptes ? 'de solde' : ''} ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  });

  // Créer un avoir (note de crédit) — via AvoirCreationModal
  const handleCreateAvoir = async (avoirData) => {
    const { sourceFacture, type: avoirType, motif, motifDetail, lignes, totalHT, totalTVA, totalTTC, tvaParTaux } = avoirData;
    // Un avoir rectifie une facture émise (CGI art. 272, 1) : sur un brouillon, il entrerait seul dans le chiffre
    // d'affaires et la TVA facturée (relecture juriste-btp du 18 oct. 2026 ; la base le refuse, migration 100)
    if (sourceFacture?.statut === 'brouillon') {
      showToast('Ce brouillon n\'est pas encore émis : corrigez-le directement, sans avoir.', 'error');
      return;
    }

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
      date: jourLocal(),
      statut: 'brouillon',
      tvaRate: sourceFacture.tvaRate,
      lignes: lignes.map(l => ({ ...l, id: generateId() })),
      total_ht: -(Math.abs(totalHT)),
      tva: -(Math.abs(totalTVA)),
      total_ttc: -(Math.abs(totalTTC)),
      // TVA ventilée par taux (src/lib/avoir.js) : celle qu'imprime l'avoir
      ...(tvaParTaux ? { tvaParTaux, tvaDetails: tvaParTaux } : {}),
      notes: `Avoir ${avoirType === 'total' ? 'total' : 'partiel'} sur facture ${sourceFacture.numero}. Motif : ${AVOIR_MOTIFS[motif] || motif}${motifDetail ? '. ' + motifDetail : ''}`,
      conditionsPaiement: sourceFacture.conditionsPaiement,
    };

    const enregistre = await onSubmit(avoir, { silencieux: true });
    if (!enregistre) return;
    // Numéro attribué par la base à l'enregistrement (migration 101) : celui de la ligne enregistrée fait foi
    if (enregistre.numero) avoir.numero = enregistre.numero;
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
            tva: l.tva !== undefined ? l.tva : tauxTvaDocument(doc, entreprise),
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
    // Franchise en base, sauf un document émis enregistré avec TVA : réimprimé tel qu'émis (src/lib/franchiseTva.js)
    const isMicro = franchiseAppliquee(doc, entreprise);
    const avoirColor = '#dc2626';
    const docColor = isAvoirDoc ? avoirColor : couleurCss(couleur);
    // Textes saisis échappés avant d'entrer dans le HTML (recette du 9 oct. 2026 : « Tableau <NF C 15-100> »
    // s'imprimait « Tableau », et un <img onerror> saisi s'exécutait dans l'aperçu).
    const echapperChamps = (o) => (o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? echap(v) : v])) : o);
    const E = echapperChamps(entreprise) || {};
    // Entrepreneur individuel : « EI » après le nom (C. com. L526-22), même règle que le document du client
    if (entreprise) { E.nom = echap(nomImprime(entreprise)); E.formeJuridique = echap(formeImprimee(entreprise)); }
    const C = echapperChamps(client);
    const CH = echapperChamps(chantier);
    const devisSource = isFacture && doc.devis_source_id ? devis.find(d => d.id === doc.devis_source_id) : null;
    const dateValidite = dateLue(finValidite(doc, entreprise) || doc.date);
    
    // Calculate TVA details from lignes if not present in doc
    const calculatedTvaDetails = doc.tvaDetails || (() => {
      const details = {};
      const defaultRate = tauxTvaDocument(doc, entreprise);
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

    const renderRow = (l) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;white-space:pre-line;overflow-wrap:anywhere">${echap(l.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${quantite(l.quantite)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${echap(l.unite || 'unité')}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatMoney(parseFloat(l.prixUnitaire||l.prix_unitaire||0))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${isMicro ? '-' : pourcent(l.tva !== undefined ? l.tva : tauxTvaDocument(doc, entreprise))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${getLineTotal(l)<0?'color:#dc2626;':''}">${formatMoney(getLineTotal(l))}</td>
      </tr>
    `;
    // Lots (sections titrées) : entête + sous-total par lot ; sinon rendu à plat (historique)
    const _docSections = Array.isArray(doc.sections) ? doc.sections : null;
    const _lotSections = _docSections
      ? _docSections.map(s => ({ titre: (s.titre || '').trim(), lignes: filterValidLignes(s.lignes || []) })).filter(s => s.lignes.length)
      : [];
    const _hasLots = _lotSections.length > 0 && _lotSections.some(s => s.titre);
    const lignesHTML = _hasLots
      ? _lotSections.map(s => {
          const sub = s.lignes.reduce((sum, l) => sum + getLineTotal(l), 0);
          const header = s.titre ? `<tr><td colspan="6" style="padding:14px 8px 6px;font-weight:700;font-size:10.5pt;color:${docColor};border-bottom:2px solid ${docColor}">${echap(s.titre)}</td></tr>` : '';
          const subtotal = s.titre ? `<tr><td colspan="5" style="padding:6px 8px;text-align:right;font-size:8.5pt;color:#64748b;font-style:italic">Sous-total ${echap(s.titre)}</td><td style="padding:6px 8px;text-align:right;font-weight:700;font-size:9pt">${formatMoney(sub)}</td></tr>` : '';
          return header + s.lignes.map(renderRow).join('') + subtotal;
        }).join('')
      : filterValidLignes(doc.lignes).map(renderRow).join('');

    const content = marquerDocumentFictif(entreprise, `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.facture_type === 'avoir' ? 'Avoir' : isFacture ? 'Facture' : 'Devis'} ${echap(doc.numero)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; background: #ffffff; padding: 25px; line-height: 1.4; }
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
    @media print { body { padding: 15px; } }${PAGE_CSS}
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">${E?.nom || 'Mon Entreprise'}</div>
      <div class="entreprise-info">
        ${E?.formeJuridique ? `<strong>${E.formeJuridique}</strong>${E?.capital ? ` - Capital: ${E.capital} €` : ''}<br>` : ''}
        ${E?.adresse?.replace(/\n/g, '<br>') || ''}<br>
        ${E?.tel ? `Tél: ${E.tel}` : ''} ${E?.email ? `· ${E.email}` : ''}
      </div>
      <div class="entreprise-legal">
        ${E?.siret ? `SIRET: ${E.siret}` : ''}
        ${E?.codeApe ? ` · APE: ${E.codeApe}` : ''}
        ${getRCSComplet() ? `<br>${echap(getRCSComplet())}` : ''}
        ${E?.tvaIntra ? `<br>TVA Intra: ${E.tvaIntra}` : ''}
        ${isMicro ? '<br><em>TVA non applicable, art. 293 B du CGI</em>' : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${doc.facture_type === 'avoir' ? 'AVOIR' : isFacture ? (doc.facture_type === 'acompte' ? "FACTURE D'ACOMPTE" : doc.facture_type === 'solde' ? 'FACTURE DE SOLDE' : 'FACTURE') : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>N° ${echap(doc.numero)}</strong><br>
        Date: ${dateLue(doc.date).toLocaleDateString('fr-FR')}<br>
        ${isFacture && doc.date_echeance ? `Échéance: ${dateLue(doc.date_echeance).toLocaleDateString('fr-FR')}<br>` : ''}
        ${devisSource?.numero && !isAvoirDoc ? `Réf. devis: ${echap(devisSource.numero)}<br>` : ''}
        ${isFacture && doc.acompte_pct && doc.facture_type === 'acompte' ? `Acompte: ${pourcent(doc.acompte_pct)}<br>` : ''}
        ${!isFacture ? `<strong>Valable jusqu'au: ${dateValidite.toLocaleDateString('fr-FR')}</strong>` : ''}
      </div>
    </div>
  </div>

  <!-- CLIENT & CHANTIER -->
  <div class="client-section">
    <div class="info-block">
      <h3>Client</h3>
      <div class="name">${C ? `${C.prenom || ''} ${C.nom || ''}` : echap(doc.client_nom || 'Client supprimé')}</div>
      ${C?.entreprise ? `<div style="font-size:9pt;color:#64748b">${C.entreprise}</div>` : ''}
      <div style="font-size:9pt">${C?.adresse || ''}</div>
      <div style="font-size:9pt">${C?.code_postal || ''} ${C?.ville || ''}</div>
      ${C?.telephone ? `<div style="font-size:8pt;color:#64748b;margin-top:4px">Tél: ${C.telephone}</div>` : ''}
      ${C?.email ? `<div style="font-size:8pt;color:#64748b">${C.email}</div>` : ''}
    </div>
    ${CH ? `
    <div class="info-block">
      <h3>Lieu d'exécution</h3>
      <div class="name">${CH.nom}</div>
      <div style="font-size:9pt">${CH.adresse || C?.adresse || ''}</div>
    </div>
    ` : ''}
  </div>

  ${isAvoirDoc ? `
  <!-- RÉFÉRENCE AVOIR -->
  <div class="avoir-ref">
    <strong>AVOIR${doc.avoir_type === 'partiel' ? ' PARTIEL' : ''} relatif à la facture n° ${echap(sourceFactureDoc?.numero || 'N/A')} du ${sourceFactureDoc ? dateLue(sourceFactureDoc.date).toLocaleDateString('fr-FR') : 'N/A'}</strong>
    ${doc.avoir_motif ? `<br>Motif : ${echap(AVOIR_MOTIFS[doc.avoir_motif] || doc.avoir_motif)}${doc.avoir_motif_detail ? ` — ${echap(doc.avoir_motif_detail)}` : ''}` : ''}
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
    ${lignesTotauxHtml(doc, { isMicro, tauxDefaut: tauxTvaDocument(doc, E) })}
    ${doc.acompte_pct ? `
    ${lignesAcompteHtml(doc, totauxDocument(doc, { isMicro }).totalTTC, doc.acompte_pct)}
    ` : ''}
  </div>

  ${isMicro ? '<div class="micro-mention">TVA non applicable, article 293 B du Code Général des Impôts</div>' : ''}

  ${mentionTvaReduiteHtml({ tvaDetails: calculatedTvaDetails, nomClient: formatClientName(client, ''), isMicro, isFacture, isAcompte: doc.facture_type === 'acompte', isAvoir: isAvoirDoc })}

  ${doc.notes && !isAvoirDoc ? `
  <!-- NOTES (« Notes (visibles sur le PDF) » de l'éditeur ; même bloc que src/lib/devisHtmlBuilder.js) -->
  <div class="conditions" style="margin-top:10px">
    <h4>NOTES</h4>
    <div style="white-space:pre-line">${echap(doc.notes)}</div>
  </div>
  ` : ''}

  <!-- CONDITIONS -->
  ${!isAvoirDoc ? `<div class="conditions">
    <h4>CONDITIONS GÉNÉRALES</h4>
    <div class="conditions-grid">
      <div>
        <strong>Modalités de paiement</strong><br>
        · Virement bancaire<br>
        · Chèque à l'ordre de ${E?.nom || ''}<br>
        · Espèces (max 1 000 € pour particulier)<br>
        ${E?.iban ? `<br><strong>IBAN:</strong> ${E.iban}` : ''}
        ${E?.bic ? ` · <strong>BIC:</strong> ${E.bic}` : ''}
      </div>
      <div>
        ${blocConditionsPaiement({ doc, entreprise, isFacture, dateEcheance: isFacture ? echeance(doc, { delaiJours: E?.delaiPaiement }) : null, client })}
      </div>
    </div>
  </div>` : ''}

  ${!isFacture && !isAvoirDoc && (E?.mentionGaranties !== false) ? `
  <!-- GARANTIES LÉGALES -->
  <div class="garanties">
    <h4> GARANTIES LÉGALES (Code civil & Code de la construction)</h4>
    <strong>1. Garantie de parfait achèvement</strong> - 1 an à compter de la réception des travaux<br>
    <strong>2. Garantie de bon fonctionnement</strong> - 2 ans (équipements dissociables)<br>
    <strong>3. Garantie décennale</strong> - 10 ans (solidité de l'ouvrage)
  </div>
  ` : ''}

  ${!isAvoirDoc && !estClientPro(client) && (E?.mediateur || E?.mediateurContact) ? `
  <!-- MÉDIATEUR DE LA CONSOMMATION : client particulier seulement (C. conso. L611-3, 1° : pas entre professionnels) -->
  <div class="retractation" style="margin-top:10px">
    <strong>MÉDIATEUR DE LA CONSOMMATION</strong> (Art. L612-1 du Code de la consommation)<br>
    En cas de litige, vous pouvez recourir gratuitement au service de médiation :
    ${E.mediateur ? `<strong>${E.mediateur}</strong>` : ''}
    ${E.mediateurContact ? ` — ${E.mediateurContact}` : ''}
  </div>
  ` : ''}

  ${!isAvoirDoc && E?.cgv ? `
  <!-- CGV PERSONNALISÉES -->
  <div class="conditions" style="margin-top:10px">
    <h4>CONDITIONS PARTICULIÈRES</h4>
    <div style="white-space:pre-line">${E.cgv}</div>
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
      <p>Signature du client et date</p>
      ${mentionsSignatureClientHtml(doc)}
      ${(() => {
        // Tracé, nom et date, que le client ait signé sur place ou par le lien (avant : texte seul, jamais le
        // tracé, et rien pour une signature à distance — recette du 9 oct. 2026)
        const sig = signatureDuClient(doc);
        if (!sig) return '';
        return (sig.image ? '<img src="' + echap(sig.image) + '" style="margin-top:10px;max-height:80px;max-width:200px;border:1px solid #e2e8f0;border-radius:4px;padding:4px;background:white" alt="Signature" />' : '')
          + '<div style="margin-top:6px;color:#16a34a;font-weight:bold">✓ Signé électroniquement' + (sig.nom ? ' par ' + echap(sig.nom) : '') + (sig.date ? ' le ' + dateLue(sig.date).toLocaleDateString('fr-FR') : '') + '</div>';
      })()}
    </div>
  </div>
  ` : ''}

  ${!isAvoirDoc && estConcerneParRetractation({ doc, client }) ? blocRetractationHtml({
    entreprise,
    doc,
    // Lien de signature déjà donné : la rétractation en ligne s'y trouve (L221-5, 7° ; D221-5), sauf signé sur place
    lienEnLigne: lienRetractationEnLigne(doc),
  }) : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>${E?.nom || ''}</strong>
    ${E?.formeJuridique ? ` · ${E.formeJuridique}` : ''}
    ${E?.capital ? ` · Capital: ${E.capital} €` : ''}
    ${E?.adresse ? ` — ${E.adresse.replace(/\n/g, ', ')}` : ''}<br>
    ${E?.siret ? `SIRET: ${E.siret}` : ''}
    ${E?.codeApe ? ` | APE: ${E.codeApe}` : ''}
    ${getRCSComplet() ? ` | ${echap(getRCSComplet())}` : ''}<br>
    ${E?.tvaIntra ? `TVA Intracommunautaire: ${E.tvaIntra}` : ''}<br>
    <div class="assurances">
      ${E?.decennaleAssureur && E?.decennaleNumero ? `Assurance décennale: ${E.decennaleAssureur}${E.decennaleAssureurAdresse ? ` (${E.decennaleAssureurAdresse})` : ''} N°${E.decennaleNumero}${E.decennaleValidite ? ` (Valide jusqu'au ${dateLue(E.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}${E.decennaleZone ? ` — Zone : ${E.decennaleZone}` : ''}${E.decennaleActivites ? ` — Activités : ${E.decennaleActivites}` : ''}` : ''}
      ${E?.decennaleAssureur && E?.decennaleNumero && E?.rcProAssureur ? '<br>' : ''}
      ${E?.rcProAssureur ? `RC Pro: ${E.rcProAssureur}${E.rcProNumero ? ` N°${E.rcProNumero}` : ''}${E.rcProValidite ? ` (Valide jusqu'au ${dateLue(E.rcProValidite).toLocaleDateString('fr-FR')})` : ''}${E.rcProMontantGarantie ? ` — Garantie: ${E.rcProMontantGarantie} €` : ''}${E.rcProZone ? ` — Zone: ${E.rcProZone}` : ''}` : ''}
      ${E?.mentionRGE !== false && Array.isArray(E?.labels) && E.labels.filter(l => l.actif).length > 0 ? '<br>' + E.labels.filter(l => l.actif).map(l => `${echap(l.nom)}${l.numero ? ` N°${echap(l.numero)}` : ''}${l.organisme ? ` (${echap(l.organisme)})` : ''}${l.dateExpiration ? ` — Valide jusqu'au ${dateLue(l.dateExpiration).toLocaleDateString('fr-FR')}` : ''}`).join('<br>') : ''}
    </div>
    ${piedDePageHtml({ nature: natureDuDocument(doc), client })}
  </div>
</body>
</html>`);

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

  // Bouton « PDF » / « Imprimer / PDF ». Une facture : un PDF, avec les données Factur-X jointes. Un devis :
  // un PDF au téléphone (avant : un fichier HTML affiché à 38 %), la fenêtre d'impression au bureau.
  // Recette du 9 oct. 2026 : le PDF de la facture sortait blanc (src/lib/pdfDepuisHtml.js).
  const printPDF = async (doc) => {
    const content = downloadPDF(doc);
    const genre = doc.facture_type === 'avoir' ? 'Avoir' : doc.type === 'facture' ? 'Facture' : 'Devis';
    if (doc.type !== 'facture' && !(isMobile() || estNatif())) { fallbackHtmlPrint(content, doc); return; }
    try {
      setActionLoading('pdf');
      let remise;
      if (doc.type === 'facture') {
        const { generateAndDownloadFacturX } = await import('../lib/facturx-pdf.js');
        const client = clients.find(c => c.id === doc.client_id);
        remise = await generateAndDownloadFacturX(doc, client || {}, entreprise || {}, content);
      } else {
        const { pdfDepuisHtml } = await import('../lib/pdfDepuisHtml.js');
        const octets = await pdfDepuisHtml(content);
        remise = await remettreFichier(new Blob([octets], { type: 'application/pdf' }), `${genre}_${doc.numero}.pdf`, 'application/pdf', { titre: `${genre} ${doc.numero}` });
      }
      if (remise === 'telecharge') showToast(`${genre} ${doc.numero} téléchargé en PDF`, 'success');
    } catch (err) {
      captureException(err, { context: 'PDF du document', type: doc.type });
      showToast('Le PDF n\'a pas pu être créé : le document s\'ouvre pour être imprimé.', 'warning');
      fallbackHtmlPrint(content, doc);
    } finally {
      setActionLoading(null);
    }
  };

  // Legacy HTML print/download (used for devis and as fallback)
  const fallbackHtmlPrint = (content, doc) => {
    const filename = `${doc.facture_type === 'avoir' ? 'Avoir' : doc.type === 'facture' ? 'Facture' : 'Devis'}_${doc.numero}.html`;

    if (isMobile() || estNatif()) {
      // Pas de fenêtre d'impression sur téléphone : on partage le document (feuille de partage du système).
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      remettreFichier(blob, filename, 'text/html', { titre: `${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}` })
        .then((r) => { if (r === 'telecharge') showToast('Fichier téléchargé — ouvrez-le puis « Imprimer » › « Enregistrer en PDF »', 'info'); })
        .catch(() => showToast('Impossible de préparer le document', 'error'));
    } else {
      // Cadre caché sans script (src/lib/imprimerHtml.js) : avant, une fenêtre à l'origine de l'app recevait
      // le document par document.write (relecture gardien-securite du 10 oct. 2026)
      imprimerHtml(content).catch((err) => {
        captureException(err, { context: 'impression du document' });
        showToast('L\'impression n\'a pas pu s\'ouvrir', 'error');
      });
    }
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
    const headers = ['Numéro', 'Type', 'Client', 'Date', 'Objet', 'Montant HT', 'TVA', isMicro ? 'Montant' : 'Montant TTC', 'Statut', 'Date envoi', 'Date signature', 'Date paiement'];
    const rows = docs.map(d => {
      const client = clients.find(c => c.id === d.client_id);
      const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : (d.client_nom || '');
      const fmtDate = (v) => v ? dateLue(v).toLocaleDateString('fr-FR') : '';
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
    remettreFichier(blob, `export-${jourLocal()}.csv`);
    showToast(`${docs.length} document${docs.length > 1 ? 's' : ''} exporté${docs.length > 1 ? 's' : ''} en CSV`, 'success');
  };

  // ============================================================================
  // Signature link generation
  // ============================================================================
  const FACTURE_PAR_MESSAGE = 'Un message WhatsApp ou SMS ne contient pas la facture : envoyez-la d\'abord par e-mail, ou imprimez-la et remettez-la au client.';
  const buildSignatureUrl = (token) => token ? urlPublique(`/devis/signer/${token}`) : null;

  /**
   * Devis expiré : ni envoi, ni relance, ni lien de signature — l'offre est caduque à l'expiration du délai
   * fixé (C. civ. art. 1117). Avant (recette du 9 oct. 2026), un devis expiré se relançait (« Ce devis reste
   * valable 30 jours ») et le client pouvait le signer en ligne.
   */
  const blocageExpiration = (doc) => {
    if (!doc || doc.type === 'facture' || !['brouillon', 'envoye', 'vu', 'en_attente'].includes(doc.statut) || !estExpire(doc, undefined, entreprise)) return null;
    return `Ce devis n'était valable que jusqu'au ${dateLue(finValidite(doc, entreprise)).toLocaleDateString('fr-FR')} : prolongez sa validité (Modifier) avant de l'envoyer.`;
  };

  /**
   * Lien de signature du devis : celui déjà donné au client tant qu'il est valable (relu en base), sinon un
   * nouveau qui expire avec le devis. Démo : pas de lien (null). Mode réel : une erreur si la base refuse —
   * avant (recette du 9 oct. 2026), l'e-mail partait sans lien et « Devis envoyé ! » s'affichait quand même.
   */
  const getOrGenerateSignatureToken = async (doc) => {
    const expire = blocageExpiration(doc);
    if (expire) throw new Error(expire);
    // Signé par le lien : le même lien, toujours (le client y renonce au contrat pendant tout le délai, D221-5)
    if (doc.signature_token && (doc.signature_data || (doc.signature_expires_at && new Date(doc.signature_expires_at) > new Date()))) {
      return doc.signature_token;
    }
    if (!supabase || supabase._isDemo) return null;
    // Le lien vit jusqu'au dernier jour de validité du devis (avant : 30 jours quelle que soit la validité)
    const restants = joursRestants(doc, undefined, entreprise);
    const jours = Math.max(1, (restants ?? 29) + 1);
    // NB : la page publique lit l'entreprise via get_devis_for_signature (table `entreprise` jointe côté SQL)
    const { data, error } = await supabase.rpc('generate_signature_token', { p_devis_id: doc.id, p_expiry_days: jours });
    if (error || !data) throw new Error(error?.message || 'lien de signature non créé');
    const expiresAt = new Date(Date.now() + jours * 86400000).toISOString();
    setDevis(prev => prev.map(d => d.id === doc.id ? { ...d, signature_token: data, signature_expires_at: expiresAt } : d));
    if (selected?.id === doc.id) {
      setSelectedDevis(prev => prev?.id === doc.id ? { ...prev, signature_token: data, signature_expires_at: expiresAt } : prev);
    }
    return data;
  };

  // ============ PRE-SEND VALIDATION ============
  const [sendValidationIssues, setSendValidationIssues] = useState(null); // null or { issues: [], doc }
  const [askEmail, setAskEmail] = useState(null); // { doc } — client sans email au moment d'envoyer
  const [askEmailValue, setAskEmailValue] = useState('');

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

    // 1 bis. Devis encore valable (sinon l'offre est caduque : on prolonge avant d'envoyer)
    if (doc.type !== 'facture' && estExpire(doc, undefined, entreprise)) {
      issues.push({ id: 'expire', label: `Devis expiré : il n'était valable que jusqu'au ${dateLue(finValidite(doc, entreprise)).toLocaleDateString('fr-FR')}`, actionLabel: 'Prolonger la validité', action: 'edit' });
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

    // 4. Lignes à 0 € (une ligne négative — remise, reprise, geste commercial — a bien un prix)
    const zeroLines = allLignes.filter(l => {
      const pu = parseFloat(l.prixUnitaire || l.prix_unitaire || 0);
      return !(Math.abs(pu) > 0.005);
    });
    if (zeroLines.length > 0) {
      const desc = zeroLines.length === 1
        ? `1 ligne sans prix : "${(zeroLines[0].description || 'Sans titre').substring(0, 40)}"`
        : `${zeroLines.length} lignes sans prix unitaire`;
      issues.push({ id: 'zero_price_lines', label: desc, actionLabel: 'Corriger les prix', action: 'edit' });
    }

    // 5. Profil de l'entreprise (SIRET, adresse, nom, forme juridique, nom de l'EI, décennale) — liste unique : lib/profilLegal
    profilManquant(entreprise).forEach((m) => {
      issues.push({ id: m.id, label: m.pourquoi ? `${m.manque} — ${m.pourquoi}` : m.manque, actionLabel: m.onglet === 'assurances' ? 'Compléter les assurances →' : 'Compléter le profil →', action: 'settings', settingsTab: m.onglet, settingsField: m.champ, isLegal: true });
    });

    return issues;
  };

  /**
   * getLegalIssues — returns only the legal profile issues (SIRET, adresse, etc.)
   */
  const getLegalIssues = () => profilManquant(entreprise).map((m) => (
    { id: m.id, label: m.manque, actionLabel: 'Compléter →', action: 'settings', settingsTab: m.onglet, settingsField: m.champ, isLegal: true }
  ));

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
  // depuisFeuille : appelé par la feuille « Relancer », qui a déjà montré destinataire et message : un seul retour, qui
  // nomme le client (audit UX du 20 oct. 2026), au lieu de la fenêtre de confirmation
  const sendWhatsApp = async (doc, { relanceDevis = false, depuisFeuille = false } = {}) => {
    const expire = blocageExpiration(doc);
    if (expire) { showToast(expire, 'error'); return; }
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    if (!client?.telephone) { showToast('Aucun téléphone client renseigné', 'error'); return; }
    // Facture en brouillon : un message ne la contient pas (C. com. L441-9, relecture juridique du 10 oct. 2026) ;
    // elle part par e-mail ou en main propre, le message ne sert qu'ensuite (rappel, lien de paiement)
    if (doc.type === 'facture' && doc.statut === 'brouillon') { showToast(FACTURE_PAR_MESSAGE, 'error'); return; }
    // Fenêtre ouverte tout de suite (au clic) : après l'attente du lien, un navigateur la bloquerait
    const fenetre = !estNatif() ? window.open('about:blank', '_blank') : null;
    if (fenetre) fenetre.opener = null;
    // Devis : lien pour le consulter et le signer en ligne (avant : le montant seul, recette du 9 oct. 2026)
    let lienSignature = '';
    if (doc.type !== 'facture') {
      try { lienSignature = buildSignatureUrl(await getOrGenerateSignatureToken(doc)); } catch (err) {
        captureException(err, { context: 'lien de signature (WhatsApp)' });
        if (fenetre) fenetre.close();
        showToast('Le lien de signature n\'a pas pu être créé : réessayez, ou envoyez le devis par e-mail.', 'error');
        return;
      }
    }
    const wasBrouillon = doc.statut === 'brouillon';
    if (wasBrouillon) {
      onUpdate(doc.id, { statut: 'envoye', ...(doc.date_envoi ? {} : { date_envoi: jourLocal() }) }, { silencieux: true });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye', date_envoi: s.date_envoi || jourLocal() } : s);
    }
    // Facture émise et due : une relance (reste dû, échéance, retard, lien de paiement), pas le total
    // Rappel seulement si la facture est échue ; sinon un envoi normal (date limite, reste à régler)
    const solde = soldeDe({ ...doc, statut: wasBrouillon ? 'envoye' : doc.statut }, paiements);
    const relance = solde?.enRetard ? solde : null;
    const lienPaiement = FONCTIONS.paiementEnLigne && doc.type === 'facture' && doc.payment_token ? urlPublique(`/pay/${doc.payment_token}`) : '';
    // « Message préparé » : c'est l'artisan qui l'envoie depuis WhatsApp (relecture juridique du 10 oct. 2026)
    if (addEchange) addEchange({ type: 'whatsapp', client_id: doc.client_id, devis_id: doc.id, document: doc.numero, montant: solde ? solde.reste : doc.total_ttc, objet: `Message préparé : ${relance || relanceDevis ? 'relance' : 'envoi'} ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` }, { silencieux: true });
    // Indicatif international, chiffres seuls (avant : « 06.12… » ou « +33 6… » donnaient un lien cassé)
    const phone = telInternational(client.telephone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(texteCourt(doc, { solde, lienPaiement, lienSignature, entrepriseNom: nomImprime(entreprise), relanceDevis }))}`;
    if (fenetre) fenetre.location.href = url;
    else ouvrirLienExterne(url);
    // Le message est PRÉPARÉ dans WhatsApp : c'est l'artisan qui l'envoie (avant : « Devis envoyé ! »)
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    if (depuisFeuille) { showToast(`${relance || relanceDevis ? 'Relance prête' : 'Message prêt'} dans WhatsApp pour ${clientName} : appuyez sur « Envoyer »`, 'success'); return; }
    setShowSendConfirmation({ clientName, montant: doc.total_ttc, canal: 'WhatsApp', doc, prepare: true });
  };

  // Exemplaire signé envoyé au client par l'artisan (signature sur place, ou envoi de la page en échec) : le PDF
  // du devis signé, à l'adresse de la fiche du client, avec le même e-mail que celui du serveur (exemplaire.ts ;
  // C. conso. L221-9, L221-13 ; tâche confirmation-client)
  const envoyerExemplaireSigne = async (doc, { accordDonne = false } = {}) => {
    const client = clients.find(c => c.id === doc.client_id);
    const surPlace = !!doc.signature && !doc.signature_data;
    const particulier = estConcerneParRetractation({ doc, client });
    // Hors établissement, l'e-mail suppose l'accord du client (L221-9) : s'il ne l'a pas donné à la signature
    if (surPlace && particulier && !accordDonne && !doc.exemplaire_email_accepte_le) {
      const ok = await confirm({
        title: 'Le client a-t-il accepté l\'e-mail ?',
        message: 'Le client a-t-il accepté de recevoir son exemplaire par e-mail ? Sinon, remettez-le-lui sur papier signé par vous deux (article L221-9 du Code de la consommation).',
      });
      if (!ok) return;
    }
    const message = messageExemplaire({
      devis: doc,
      pro: { nom: nomImprime(entreprise) || entreprise?.nom, adresse: entreprise?.adresse, telephone: entreprise?.tel || entreprise?.telephone, email: entreprise?.email },
      client: client || {},
      particulier,
      lienRetractation: lienRetractationEnLigne(doc) || '',
      surPlace,
      accordEmail: !!doc.exemplaire_email_accepte_le,
    });
    if (!message) { showToast('La fiche du client n\'a pas d\'adresse e-mail valide : ajoutez-la pour lui envoyer son exemplaire.', 'error'); return; }
    const maintenant = new Date().toISOString();
    if (isDemo || !supabase) {
      await onUpdate(doc.id, { exemplaire_client_le: maintenant }, { silencieux: true });
      setSelected(s => s?.id === doc.id ? { ...s, exemplaire_client_le: maintenant } : s);
      showToast(`Mode démo : envoi simulé à ${message.a} ✓`, 'success');
      return;
    }
    setActionLoading('exemplaire');
    try {
      // La page du client a pu l'envoyer entre-temps : relire en base avant d'en envoyer un second
      const { data: frais } = await supabase.from('devis').select('exemplaire_client_le').eq('id', doc.id).maybeSingle();
      if (frais?.exemplaire_client_le) {
        setSelected(s => s?.id === doc.id ? { ...s, exemplaire_client_le: frais.exemplaire_client_le } : s);
        showToast('L\'exemplaire signé a déjà été envoyé au client.', 'info');
        return;
      }
      await sendDocumentEmail({
        to: message.a,
        subject: message.sujet,
        bodyHtml: message.html,
        fromName: nomImprime(entreprise) || entreprise?.nom,
        replyTo: entreprise?.email,
        pdfHtml: downloadPDF(doc),
        pdfFilename: nomFichierExemplaire(doc.numero),
      });
      const enregistre = await onUpdate(doc.id, { exemplaire_client_le: maintenant }, { silencieux: true });
      setSelected(s => s?.id === doc.id ? { ...s, exemplaire_client_le: maintenant } : s);
      if (addEchange) addEchange({ type: 'email', client_id: doc.client_id, devis_id: doc.id, document: doc.numero, montant: doc.total_ttc, objet: `Exemplaire signé ${doc.numero}` }, { silencieux: true });
      showToast(enregistre
        ? `Exemplaire signé envoyé à ${message.a} ✓`
        : `L'exemplaire est parti à ${message.a}, mais la date d'envoi n'a pas été enregistrée : ne le renvoyez pas.`, enregistre ? 'success' : 'error');
    } catch (e) {
      captureException(e, { context: 'exemplaire signé envoyé par l\'artisan' });
      showToast(`Exemplaire non envoyé : ${e?.message || 'erreur inconnue'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const sendEmail = async (doc, emailOverride = null, { relanceDevis = false, depuisFeuille = false } = {}) => {
    const expire = blocageExpiration(doc);
    if (expire) { showToast(expire, 'error'); return; }
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    const toEmail = emailOverride || client?.email;
    // Pas d'email ? On le demande ici même (et on l'enregistre sur la fiche client) au lieu d'un cul-de-sac.
    if (!toEmail) { setAskEmailValue(''); setAskEmail({ doc, options: { relanceDevis, depuisFeuille } }); return; }
    const isFacture = doc.type === 'facture';
    const label = isFacture ? 'Facture' : 'Devis';
    // Mode démo : pas de serveur d'envoi — on simule pour que la boucle complète soit vivable.
    if (isDemo || !supabase) {
      if (doc.statut === 'brouillon') {
        onUpdate(doc.id, { statut: 'envoye', ...(doc.date_envoi ? {} : { date_envoi: jourLocal() }) }, { silencieux: true });
        setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye', date_envoi: s.date_envoi || jourLocal() } : s);
      }
      // Relance : un devis relancé, ou une facture échue ; sinon un envoi (comme en mode réel)
      const relanceDemo = (relanceDevis && !isFacture) || (isFacture && estEchue(doc));
      if (addEchange) addEchange({ type: 'email', client_id: doc.client_id, devis_id: doc.id, document: doc.numero, montant: doc.total_ttc, objet: `${relanceDemo ? 'Relance' : 'Envoi'} ${isFacture ? 'facture' : 'devis'} ${doc.numero}` }, { silencieux: true });
      const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
      if (depuisFeuille) { showToast(`Mode démo : ${relanceDemo ? 'relance simulée' : 'envoi simulé'} à ${toEmail} ✓`, 'success'); return; }
      // Un seul message : la fenêtre dit ce qui est parti et à qui (avant : fenêtre + notification + « Échange ajouté »)
      setShowSendConfirmation({ clientName, montant: doc.total_ttc, canal: 'Email (démo)', doc, destinataire: toEmail, relance: relanceDemo });
      return;
    }
    setActionLoading('email');
    if (!depuisFeuille) showToast(`Envoi du ${label.toLowerCase()} ${doc.numero}…`, 'info');
    try {
      // Devis : générer (ou réutiliser) le lien de signature pour l'inclure dans l'email —
      // sans lui, le client reçoit le PDF mais ne peut pas signer en ligne.
      let signatureUrl = null;
      if (!isFacture) {
        try {
          signatureUrl = buildSignatureUrl(await getOrGenerateSignatureToken(doc));
        } catch (err) {
          // Sans lien, le client ne pourrait pas signer en ligne : on n'envoie pas (avant : e-mail sans lien et
          // « Devis envoyé ! », recette du 9 oct. 2026)
          captureException(err, { context: 'lien de signature (e-mail)' });
          showToast('Le lien de signature n\'a pas pu être créé : l\'e-mail n\'est pas parti. Réessayez dans un instant.', 'error');
          return;
        }
      }
      // Réutilise le HTML du document (downloadPDF le construit et le retourne, sans effet de bord)
      const pdfHtml = downloadPDF(doc);
      // Facture émise et due : l'e-mail est une relance (reste dû, échéance, retard, lien de paiement)
      // Rappel seulement si la facture est échue (relecture juridique du 10 oct. 2026 : une facture née
      // « envoyée » partait en « Rappel… je vous la joins à nouveau » à son premier envoi)
      const solde = soldeDe({ ...doc, statut: doc.statut === 'brouillon' ? 'envoye' : doc.statut }, paiements);
      const relance = solde?.enRetard ? solde : null;
      const lienPaiement = FONCTIONS.paiementEnLigne && isFacture && doc.payment_token ? urlPublique(`/pay/${doc.payment_token}`) : '';
      const bodyHtml = buildDocumentEmailBody({
        doc, client, entreprise, couleur, signatureUrl, lienPaiement,
        montantFormatte: euros(doc.total_ttc),
        solde, relanceDevis: relanceDevis && !isFacture,
      });
      await sendDocumentEmail({
        to: toEmail,
        subject: `${relance || (relanceDevis && !isFacture) ? 'Rappel : ' : ''}${label} ${doc.numero}${relance ? ' — reste à régler' : ''}${entreprise?.nom ? ` — ${nomImprime(entreprise)}` : ''}`,
        bodyHtml,
        // « EI » vise aussi les correspondances (C. com. R526-27)
        fromName: nomImprime(entreprise) || entreprise?.nom,
        replyTo: entreprise?.email,
        pdfHtml,
        pdfFilename: `${label}-${doc.numero}.pdf`,
      });
      // Date d'envoi : la première ; l'attente et les relances se comptent depuis elle (avant : depuis la création)
      let statutEnregistre = true;
      if (doc.statut === 'brouillon' || !doc.date_envoi) {
        const avant = { statut: doc.statut, date_envoi: doc.date_envoi };
        setSelected(s => s?.id === doc.id ? { ...s, statut: s.statut === 'brouillon' ? 'envoye' : s.statut, date_envoi: s.date_envoi || jourLocal() } : s);
        // Attendu : si la base refuse, la fiche ne doit pas rester « Envoyé » (avant : « Devis envoyé ! » puis
        // « Brouillon » au rechargement, et l'artisan le renvoyait — recette du 9 oct. 2026)
        statutEnregistre = await onUpdate(doc.id, { ...(doc.statut === 'brouillon' ? { statut: 'envoye' } : {}), ...(doc.date_envoi ? {} : { date_envoi: jourLocal() }) }, { silencieux: true });
        if (!statutEnregistre) setSelected(s => s?.id === doc.id ? { ...s, ...avant } : s);
      }
      const relanceFaite = relance || (relanceDevis && !isFacture);
      if (addEchange) addEchange({ type: 'email', client_id: doc.client_id, devis_id: doc.id, document: doc.numero, montant: relance ? relance.reste : doc.total_ttc, objet: `${relanceFaite ? 'Relance' : 'Envoi'} ${isFacture ? 'facture' : 'devis'} ${doc.numero}` }, { silencieux: true });
      if (!statutEnregistre) {
        showToast(`L'e-mail est parti à ${toEmail}, mais le statut « Envoyé » n'a pas été enregistré : ne le renvoyez pas, réessayez de changer le statut plus tard.`, 'error');
        return;
      }
      const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
      if (!depuisFeuille) setShowSendConfirmation({ clientName, montant: relance ? relance.reste : doc.total_ttc, canal: 'Email', doc, relance: !!relanceFaite, destinataire: toEmail });
      else showToast(`${relanceFaite ? 'Relance' : label} ${doc.numero} ${relanceFaite || isFacture ? 'envoyée' : 'envoyé'} à ${toEmail} ✓`, 'success');
    } catch (e) {
      console.error('[sendEmail] Error:', e);
      showToast(`Échec de l'envoi : ${e?.message || 'erreur inconnue'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // SMS via native protocol (mobile only)
  const sendSMS = async (doc, { relanceDevis = false, depuisFeuille = false } = {}) => {
    const expire = blocageExpiration(doc);
    if (expire) { showToast(expire, 'error'); return; }
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    const phone = (client?.telephone || '').replace(/\s/g, '');
    if (!phone) { showToast('Aucun téléphone client renseigné', 'error'); return; }
    // Facture en brouillon : un message ne la contient pas (C. com. L441-9, relecture juridique du 10 oct. 2026) ;
    // elle part par e-mail ou en main propre, le message ne sert qu'ensuite (rappel, lien de paiement)
    if (doc.type === 'facture' && doc.statut === 'brouillon') { showToast(FACTURE_PAR_MESSAGE, 'error'); return; }
    if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      showToast('SMS disponible uniquement sur mobile', 'info');
      return;
    }
    let lienSignature = '';
    if (doc.type !== 'facture') {
      try { lienSignature = buildSignatureUrl(await getOrGenerateSignatureToken(doc)); } catch (err) {
        captureException(err, { context: 'lien de signature (SMS)' });
        showToast('Le lien de signature n\'a pas pu être créé : réessayez, ou envoyez le devis par e-mail.', 'error');
        return;
      }
    }
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye', ...(doc.date_envoi ? {} : { date_envoi: jourLocal() }) }, { silencieux: true });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye', date_envoi: s.date_envoi || jourLocal() } : s);
    }
    const solde = soldeDe({ ...doc, statut: doc.statut === 'brouillon' ? 'envoye' : doc.statut }, paiements);
    const relance = solde?.enRetard ? solde : null;
    const lienPaiement = FONCTIONS.paiementEnLigne && doc.type === 'facture' && doc.payment_token ? urlPublique(`/pay/${doc.payment_token}`) : '';
    if (addEchange) addEchange({ type: 'sms', client_id: doc.client_id, devis_id: doc.id, document: doc.numero, montant: solde ? solde.reste : doc.total_ttc, objet: `Message préparé : ${relance || relanceDevis ? 'relance' : 'envoi'} ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` }, { silencieux: true });
    const message = texteCourt(doc, { solde, lienPaiement, lienSignature, entrepriseNom: nomImprime(entreprise), relanceDevis });
    setTimeout(() => {
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');
    }, 100);
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    if (depuisFeuille) { showToast(`${relance || relanceDevis ? 'Relance prête' : 'Message prêt'} dans vos SMS pour ${clientName} : appuyez sur « Envoyer »`, 'success'); return; }
    setShowSendConfirmation({ clientName, montant: doc.total_ttc, canal: 'SMS', doc, prepare: true });
  };

  // (« Vu » n'est plus posé à l'ouverture : c'était l'ARTISAN qui ouvrait son propre devis, pas le
  // client — relecture du 9 oct. 2026. La page de signature ne note pas l'ouverture par le client.)

  // Calculate days since sent (for follow-up indicators)
  // Jours depuis l'envoi (date_envoi, enregistrée au premier envoi ; un ancien devis : sa date)
  const getDaysSinceSent = (doc) => {
    const depuis = doc.date_envoi || doc.date;
    if (!depuis) return 0;
    return Math.max(0, Math.floor((Date.now() - dateLue(String(depuis).slice(0, 10))) / 86400000));
  };

  // Devis envoyé sans réponse depuis 7 jours, encore valable (un devis expiré ne se relance pas : on le prolonge)
  // Facture échue (reste dû après l'échéance) : seule une facture échue se « relance » (C. com. L441-10, II ; même calcul
  // que texteCourt et buildDocumentEmailBody, src/lib/messageRelance.js)
  const estEchue = (doc) => doc?.type === 'facture' && doc.facture_type !== 'avoir'
    && !!soldeDe({ ...doc, statut: doc.statut === 'brouillon' ? 'envoye' : doc.statut }, paiements)?.enRetard;

  // La règle commune (src/lib/ventes.js) : 7 jours ou plus depuis l'envoi, jamais un devis expiré
  const needsFollowUp = (doc) => doc?.type === 'devis' && devisARelancer(doc, new Date(), entreprise);

  // Validité (src/lib/validiteDevis.js) : 0 = dernier jour, négatif = expiré. Seulement tant que le client
  // n'a pas répondu (avant : un devis signé à distance, « signe », pouvait s'afficher expiré).
  const getExpiryDaysLeft = (doc) => {
    if (doc.type !== 'devis' || !['brouillon', 'envoye', 'vu', 'en_attente'].includes(doc.statut)) return null;
    return joursRestants(doc, undefined, entreprise);
  };
  const isExpiringSoon = (doc) => { const d = getExpiryDaysLeft(doc); return d !== null && d >= 0 && d <= 7; };
  const isExpired = (doc) => { const d = getExpiryDaysLeft(doc); return d !== null && d < 0; };

  const Snackbar = () => snackbar && (
    <div className="fixed bottom-6 left-1/2 z-50 animate-snackbar">
      {/* Encre sur le fond inversé du thème, une icône pour le ton (avant : aplats vert / rouge et émojis) */}
      <div role={snackbar.type === 'error' ? 'alert' : 'status'} className="flex items-center gap-3 pl-4 pr-1 py-1.5 rounded-2xl shadow-e3 bg-encre text-surface min-w-[280px] max-w-[90vw]">
        {snackbar.type === 'success' ? <CheckCircle size={18} aria-hidden="true" className="flex-shrink-0" />
          : snackbar.type === 'error' ? <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0" />
          : <Bell size={18} aria-hidden="true" className="flex-shrink-0" />}
        <span className="flex-1 text-sm font-medium">{snackbar.message}</span>
        {snackbar.action && <button onClick={snackbar.action.onClick} className="h-11 px-3 rounded-full bg-surface/15 hover:bg-surface/25 text-sm font-semibold whitespace-nowrap transition-colors">{snackbar.action.label}</button>}
        <button onClick={() => setSnackbar(null)} className="hover:bg-surface/15 rounded-full w-11 h-11 flex items-center justify-center transition-colors" aria-label="Fermer">
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
          return false; // refus : l'éditeur reste ouvert, DataContext a dit pourquoi
        }
        setSelected(newDevis);
        setMode('preview');
        setShowCreationSuccess({ devis: newDevis, numero });
        return newDevis;
      }}
      onUpdate={async (id, devisData) => {
        // Refus de la base : l'éditeur reste ouvert avec la saisie (DataContext a dit pourquoi et rétabli l'écran)
        if (!(await onUpdate(id, devisData))) return false;
        setSelected(prev => prev ? { ...prev, ...devisData } : prev);
        setEditingDevis(null);
        setShowDevisWizard(false);
        return true;
      }}
      clients={clients}
      addClient={addClient}
      catalogue={catalogue}
      chantiers={chantiers}
      entreprise={entreprise}
      isDark={isDark}
      couleur={couleur}
      onSwitchToExpress={() => { setShowDevisExpressModal(true); }}
    />
  );

  // === DEVIS COMPOSER (nouveau parcours single-canvas) ===
  const devisComposerElement = (
    <DevisComposer
      isOpen={showDevisComposer}
      onClose={() => { setShowDevisComposer(false); setEditingDevis(null); setClientInitial(null); setChantierInitial(null); }}
      initialData={editingDevis}
      clientInitial={clientInitial}
      chantierInitial={chantierInitial}
      onSubmit={async (devisData) => {
        const numero = await generateNumero(devisData.type);
        const newDevis = await onSubmit({ ...devisData, numero });
        if (!newDevis?.id) {
          return false; // refus : l'éditeur reste ouvert, DataContext a dit pourquoi
        }
        setSelected(newDevis);
        setMode('preview');
        setShowCreationSuccess({ devis: newDevis, numero });
        return newDevis;
      }}
      onUpdate={async (id, devisData) => {
        // Facture modifiée (brouillon) : l'échéance suit la nouvelle date et les conditions de règlement
        // (avant, recette du 9 oct. 2026 : elle restait celle de la création, parfois avant la date de la facture)
        const donnees = devisData?.type === 'facture' && devisData.facture_type !== 'avoir' && devisData.date
          ? { ...devisData, date_echeance: dateEcheance(devisData.date, { conditionsPaiement: devisData.conditionsPaiement || devisData.conditions, delaiJours: entreprise?.delaiPaiement }) }
          : devisData;
        if (!(await onUpdate(id, donnees))) return false;
        setSelected(prev => prev ? { ...prev, ...donnees } : prev);
        setEditingDevis(null);
        setShowDevisComposer(false);
        return true;
      }}
      clients={clients}
      addClient={addClient}
      catalogue={catalogue}
      chantiers={chantiers}
      entreprise={entreprise}
      customTemplates={ctxTemplates}
      addTemplate={addTemplate}
      showToast={showToast}
      onCompleteProfile={setPage ? () => { setShowDevisComposer(false); setPage('settings'); } : undefined}
      isDark={isDark}
      couleur={couleur}
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
          <button onClick={saveSignature} className="px-6 py-3 rounded-xl flex items-center gap-1.5 min-h-[44px] hover:shadow-lg transition-all bg-accent text-sur-accent"><Check size={16} />Valider</button>
        </div>
      </div>
      <Snackbar />
    </div>
  );

  // Fenêtre « Sauvegarder comme modèle », montée par la liste ET par la fiche. Avant (recette du 9 oct. 2026), elle
  // n'existait que dans la liste : « Enregistrer comme modèle » du menu de la fiche ne faisait rien.
  const fenetreModele = (
    <Modal isOpen={!!(showSaveTemplateModal && selected)} onClose={() => setShowSaveTemplateModal(false)} size="sm">
      <ModalHeader>
        <ModalTitle>Sauvegarder comme modèle</ModalTitle>
        <ModalDescription>{(selected?.lignes || []).length} lignes · {selected?.numero}</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <Champ
          libelle="Nom du modèle"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder={selected?.objet || selected?.lignes?.[0]?.description || 'Mon modèle'}
          autoFocus
        />
        <Champ
          libelle="Catégorie" facultatif
          value={templateCategory}
          onChange={e => setTemplateCategory(e.target.value)}
          placeholder="ex: Plomberie, Électricité, Rénovation..."
        />
      </ModalBody>
      <ModalFooter>
        <Bouton variante="discret" onClick={() => setShowSaveTemplateModal(false)}>Annuler</Bouton>
        <Bouton
          variante="principal" icone={Star}
          onClick={async () => {
            if (!templateName.trim()) return showToast('Donnez un nom au modèle', 'error');
            const enregistre = await addTemplate({
              nom: templateName.trim(),
              categorie: templateCategory.trim() || 'Mes modèles',
              description: `Créé depuis ${selected.numero}`,
              lignes: (selected.lignes || []).map(l => ({
                description: l.description,
                quantite: l.quantite,
                unite: l.unite,
                prixUnitaire: Number(l.prixUnitaire) || 0, // une remise (ligne négative) reste négative
                prixAchat: l.prixAchat || 0,
                tva: l.tva,
              })),
              tva_defaut: selected.tvaRate ?? 10,
              notes: selected.notes || '',
            });
            if (!enregistre) return; // refus de la base : DataContext l'a dit, la fenêtre reste ouverte
            setShowSaveTemplateModal(false);
            setTemplateName('');
            setTemplateCategory('Mes modèles');
            showToast(`Modèle "${templateName}" sauvegardé`, 'success');
          }}
          disabled={!templateName.trim()}
        >
          Sauvegarder le modèle
        </Bouton>
      </ModalFooter>
    </Modal>
  );

  // « Assigner un client » : montée par la liste ET par la fiche (le bouton de la fiche n'ouvrait rien avant)
  const fenetreAssigner = (
    <Modal isOpen={!!assigningClientDevisId} onClose={() => setAssigningClientDevisId(null)} size="sm">
      <ModalHeader>
        <ModalTitle>Assigner un client</ModalTitle>
        <ModalDescription>Choisissez le client de ce document.</ModalDescription>
      </ModalHeader>
      <ModalBody className="px-3 py-2">
        <ul className="space-y-1">
          {clients.filter(c => c.nom).map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  const d = devis.find(dv => dv.id === assigningClientDevisId);
                  if (d) {
                    onUpdate(d.id, { client_id: c.id, client_nom: `${c.prenom || ''} ${c.nom}`.trim() });
                    if (selected?.id === d.id) setSelected(s => ({ ...s, client_id: c.id, client_nom: `${c.prenom || ''} ${c.nom}`.trim() }));
                    showToast(`Client "${`${c.prenom || ''} ${c.nom}`.trim()}" assigné`, 'success');
                  }
                  setAssigningClientDevisId(null);
                }}
                className="w-full min-h-[52px] text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors hover:bg-surface-2"
              >
                <Avatar nom={`${c.prenom || ''} ${c.nom}`} taille={36} />
                <span className="min-w-0">
                  <span className={`block text-sm font-medium truncate ${textPrimary}`}>{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</span>
                  {c.entreprise && <span className="block text-sm truncate text-encre-3">{c.entreprise}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {clients.filter(c => c.nom).length === 0 && (
          <p className="text-sm text-center py-4 text-encre-3">Aucun client disponible</p>
        )}
      </ModalBody>
      <ModalFooter>
        <Bouton variante="discret" onClick={() => setAssigningClientDevisId(null)}>Annuler</Bouton>
      </ModalFooter>
    </Modal>
  );

  // Aperçu du document (liste et fiche) : la page A4 reste blanche, c'est le papier ; le cadre suit le thème
  const fenetreApercu = showPdfPreview ? createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1050] p-0 sm:p-4 animate-fade-in" onClick={() => setShowPdfPreview(false)}>
      <div role="dialog" aria-modal="true" aria-label="Aperçu du document" className="bg-fond rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl h-[95vh] sm:h-[90vh] shadow-e3 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-3 sm:p-4 border-b border-bord bg-surface flex items-center justify-between gap-2 flex-shrink-0">
          <div className="min-w-0">
            <h2 className={`font-bold text-base sm:text-lg ${textPrimary} truncate`}>Aperçu du document</h2>
            <p className="text-sm text-encre-3 hidden sm:block">Format A4, prêt à imprimer</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Bouton variante="principal" icone={Download} onClick={() => tryDownload(selected, printPDF)}>
              <span className="hidden sm:inline">Imprimer / PDF</span>
              <span className="sm:hidden">PDF</span>
            </Bouton>
            <BoutonIcone icone={X} libelle="Fermer l'aperçu" onClick={() => setShowPdfPreview(false)} />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
          <div className="bg-white shadow-e3 rounded-sm w-full max-w-[210mm] min-h-[297mm]">
            <iframe srcDoc={pdfContent} sandbox="" className="w-full h-full min-h-[297mm] border-0" title="Aperçu du document" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // Feuille « Relancer » (liste, fiche devis, fiche facture) : canal, destinataire, aperçu, un seul bouton. Une facture
  // pas encore échue se « Renvoie » : ce qui part n'est pas une relance (relecture juriste-btp du 24 oct. 2026)
  const clientDeRelance = relanceDe ? clients.find(c => c.id === relanceDe.client_id) : null;
  const estRelance = !!relanceDe && (relanceDe.type !== 'facture' || estEchue(relanceDe));
  const apercuRelance = (canal) => {
    const doc = relanceDe;
    if (!doc) return null;
    const relanceDevis = doc.type !== 'facture';
    const solde = soldeDe({ ...doc, statut: doc.statut === 'brouillon' ? 'envoye' : doc.statut }, paiements);
    const lienSignature = relanceDevis ? '[lien de signature]' : '';
    if (canal !== 'email') {
      return { texte: texteCourt(doc, { solde, lienSignature, entrepriseNom: nomImprime(entreprise), relanceDevis }) };
    }
    const relance = solde?.enRetard ? solde : null;
    const label = doc.type === 'facture' ? 'Facture' : 'Devis';
    return {
      objet: `${relance || relanceDevis ? 'Rappel : ' : ''}${label} ${doc.numero}${relance ? ' — reste à régler' : ''}${entreprise?.nom ? ` — ${nomImprime(entreprise)}` : ''}`,
      texte: texteDeHtml(buildDocumentEmailBody({
        doc, client: clientDeRelance || {}, entreprise, couleur, signatureUrl: relanceDevis ? '[lien de signature]' : null,
        montantFormatte: euros(doc.total_ttc), solde, relanceDevis,
      })),
    };
  };
  const envoyerRelance = async (canal) => {
    const doc = relanceDe;
    if (!doc) return;
    const relanceDevis = doc.type !== 'facture';
    if (canal === 'email') await sendEmail(doc, null, { relanceDevis, depuisFeuille: true });
    else if (canal === 'sms') await sendSMS(doc, { relanceDevis, depuisFeuille: true });
    else await sendWhatsApp(doc, { relanceDevis, depuisFeuille: true });
    setRelanceDe(null);
  };
  const feuilleRelance = (
    <FeuilleRelance doc={relanceDe} client={clientDeRelance} relance={estRelance} apercu={apercuRelance} onEnvoyer={envoyerRelance} onFermer={() => setRelanceDe(null)} />
  );

  // Fenêtres de l'envoi (création réussie, e-mail manquant, ce qui bloque, envoi fait) : montées par la liste ET par la
  // fiche (avant, dans la fiche seulement : « Envoyer » depuis la liste ne montrait ni ce qui bloquait ni ce qui était parti)
  const fenetresEnvoi = (
    <>
    {/* Après la création : envoyer tout de suite ou plus tard */}
    <Modal isOpen={!!showCreationSuccess} onClose={() => setShowCreationSuccess(null)} size="sm">
      <ModalBody className="pt-6 text-center">
        <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center bg-succes-fond text-succes-texte" aria-hidden="true">
          <CheckCircle size={28} />
        </span>
        <ModalTitle className="text-xl">
          {showCreationSuccess?.devis?.type === 'facture' ? 'Facture créée' : 'Devis créé'}
        </ModalTitle>
        <p className="mt-1 text-sm text-encre-3">N° {showCreationSuccess?.numero}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-encre">{formatMoney(showCreationSuccess?.devis?.total_ttc)}</p>
      </ModalBody>
      <ModalFooter className="flex-col-reverse sm:flex-row">
        <Bouton variante="discret" pleineLargeur className="sm:w-auto" onClick={() => setShowCreationSuccess(null)}>Plus tard</Bouton>
        <Bouton variante="principal" icone={Send} pleineLargeur className="sm:w-auto"
          onClick={() => {
            const doc = showCreationSuccess?.devis;
            setShowCreationSuccess(null);
            if (doc) trySend(doc, sendEmail);
          }}>
          Envoyer maintenant
        </Bouton>
      </ModalFooter>
    </Modal>

    {/* Email client manquant — saisie inline + enregistrement sur la fiche */}
    <Modal isOpen={!!askEmail} onClose={() => setAskEmail(null)} size="sm">
      <ModalHeader>
        <ModalTitle>E-mail du client ?</ModalTitle>
        <ModalDescription>
          {(() => { const c = clients.find(x => x.id === askEmail?.doc?.client_id); return `${formatClientName(c) || 'Ce client'} n'a pas d'adresse e-mail enregistrée. Saisissez-la pour envoyer ${askEmail?.doc?.type === 'facture' ? 'la facture' : 'le devis'} : elle sera ajoutée à sa fiche.`; })()}
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Champ
          libelle="Adresse e-mail"
          type="email" autoFocus value={askEmailValue}
          onChange={e => setAskEmailValue(e.target.value)}
          placeholder="client@exemple.fr"
        />
      </ModalBody>
      <ModalFooter>
        <Bouton variante="discret" onClick={() => setAskEmail(null)}>Annuler</Bouton>
        <Bouton
          variante="principal" icone={Send}
          disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(askEmailValue.trim())}
          onClick={async () => {
            const email = askEmailValue.trim();
            const doc = askEmail.doc;
            const options = askEmail.options || {};
            setAskEmail(null);
            try { await ctxUpdateClient?.(doc.client_id, { email }); } catch { /* l'envoi reste possible */ }
            sendEmail(doc, email, options);
          }}
        >
          Enregistrer et envoyer
        </Bouton>
      </ModalFooter>
    </Modal>

    {/* Ce qui manque avant d'envoyer (ou de télécharger) */}
    <Modal isOpen={!!sendValidationIssues} onClose={() => setSendValidationIssues(null)} size="md">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${sendValidationIssues?.isDownload ? 'bg-alerte-fond text-alerte-texte' : 'bg-danger-fond text-danger-texte'}`} aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <div>
            <ModalTitle>{sendValidationIssues?.isDownload ? 'Profil incomplet' : 'Envoi impossible'}</ModalTitle>
            <ModalDescription>{sendValidationIssues?.isDownload ? 'Votre profil entreprise est incomplet' : 'Corrigez ces éléments avant d\'envoyer'}</ModalDescription>
          </div>
        </div>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Legal conformity warning */}
        {sendValidationIssues?.issues.some(i => i.isLegal) && (
          <div className="rounded-xl p-3 bg-alerte-fond text-alerte-texte text-sm">
            <strong>Mentions obligatoires :</strong> sans ces informations, ce document n'aura pas toutes les mentions exigées par la loi.{' '}
            <button
              type="button"
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
              className="underline font-semibold hover:opacity-80"
            >
              Compléter votre profil maintenant
            </button>
          </div>
        )}

        {/* Issues list */}
        <ul className="space-y-2">
          {(sendValidationIssues?.issues || []).map(issue => (
            <li key={issue.id} className="flex items-center gap-3 pl-3 pr-1 py-1.5 min-h-[52px] rounded-xl border bg-fond border-bord">
              <XCircle size={16} className="text-danger-texte shrink-0" aria-hidden="true" />
              <p className={`flex-1 min-w-0 text-sm ${textPrimary}`}>{issue.label}</p>
              {issue.action === 'settings' && (
                <Bouton
                  taille="compacte" variante="secondaire" className="shrink-0"
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
                >
                  {issue.actionLabel}
                </Bouton>
              )}
              {issue.action === 'edit' && (
                <Bouton
                  taille="compacte" variante="secondaire" className="shrink-0"
                  onClick={() => {
                    const doc = sendValidationIssues.doc;
                    setSendValidationIssues(null);
                    if (doc) openEditor(doc);
                  }}
                >
                  {issue.actionLabel}
                </Bouton>
              )}
            </li>
          ))}
        </ul>
      </ModalBody>
      <ModalFooter>
        <Bouton variante={sendValidationIssues?.sendFn && sendValidationIssues?.isDownload ? 'discret' : 'secondaire'} onClick={() => setSendValidationIssues(null)}>Compris</Bouton>
        {sendValidationIssues?.sendFn && sendValidationIssues.isDownload && sendValidationIssues.issues.every(i => i.isLegal) && (
          <Bouton variante="principal" onClick={() => { const fn = sendValidationIssues.sendFn; const doc = sendValidationIssues.doc; setSendValidationIssues(null); fn(doc); }}>
            Télécharger quand même
          </Bouton>
        )}
      </ModalFooter>
    </Modal>

    {/* Après un envoi : ce qui est parti, à qui, par où (un seul message : pas de notification en plus) */}
    <Modal isOpen={!!showSendConfirmation} onClose={() => setShowSendConfirmation(null)} size="sm">
      <ModalBody className="pt-6">
        <div className="text-center">
          <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center bg-succes-fond text-succes-texte" aria-hidden="true">
            <CheckCircle size={28} />
          </span>
          <ModalTitle>
            {showSendConfirmation?.prepare
              ? `Message prêt dans ${showSendConfirmation.canal}`
              : showSendConfirmation?.relance ? 'Relance envoyée' : `${showSendConfirmation?.doc?.type === 'facture' ? 'Facture envoyée' : 'Devis envoyé'}`}
          </ModalTitle>
          <p className="mt-1 text-sm text-encre-3">
            {showSendConfirmation?.prepare
              ? `Appuyez sur « Envoyer » dans ${showSendConfirmation.canal} pour que votre client le reçoive.`
              : `par ${showSendConfirmation?.canal}${showSendConfirmation?.destinataire ? ` à ${showSendConfirmation.destinataire}` : ''}`}
          </p>
        </div>
        <dl className="mt-5 rounded-xl p-4 space-y-2 bg-fond text-sm">
          <div className="flex justify-between gap-3"><dt className="text-encre-3">Client</dt><dd className="font-medium text-encre text-right">{showSendConfirmation?.clientName}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-encre-3">Montant</dt><dd className="font-bold text-encre tabular-nums">{formatMoney(showSendConfirmation?.montant)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-encre-3">Canal</dt><dd className="font-medium text-encre">{showSendConfirmation?.canal}</dd></div>
        </dl>
        <div className="mt-4 grid gap-2">
          {showSendConfirmation?.doc?.signature_token && (
            <Bouton variante="secondaire" icone={Link2} pleineLargeur
              onClick={() => {
                const url = buildSignatureUrl(showSendConfirmation.doc.signature_token);
                navigator.clipboard.writeText(url);
                showToast('Lien de signature copié', 'success');
              }}>
              Copier le lien de signature
            </Bouton>
          )}
          <div className="flex gap-2">
            {showSendConfirmation?.canal !== 'WhatsApp' && (
              <Bouton variante="secondaire" icone={MessageCircle} className="flex-1" onClick={() => { sendWhatsApp(showSendConfirmation.doc); }}>WhatsApp</Bouton>
            )}
            {!/^Email/.test(showSendConfirmation?.canal || '') && (
              <Bouton variante="secondaire" icone={Mail} className="flex-1" onClick={() => { sendEmail(showSendConfirmation.doc); }}>E-mail</Bouton>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Bouton variante="principal" pleineLargeur className="sm:w-auto" onClick={() => setShowSendConfirmation(null)}>OK</Bouton>
      </ModalFooter>
    </Modal>
    </>
  );

  // === PREVIEW VIEW ===
  if (mode === 'preview' && selected) {
    const client = clients.find(c => c.id === selected.client_id);
    const {
      facturesLiees, situationsFacturees, situationsEnCours, facturationParSituations, acompteFacture,
      resteAFacturer, canAcompte, canFacturer,
    } = facturationDe(selected);
    const isDevis = selected.type === 'devis';
    const isAvoir = selected.facture_type === 'avoir';
    const currentEcheancier = echeancierCache[selected.id] || null;
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

    // addChantier renvoie une promesse : sans l'attendre, « Erreur lors de la création » s'affichait alors que
    // le chantier était créé (et le devis n'y était jamais rattaché).
    const createChantierFromDevis = async () => {
      if (!addChantier || !chantierForm.nom) return;
      const newChantier = await addChantier({
        nom: chantierForm.nom,
        client_id: selected.client_id,
        adresse: chantierForm.adresse || client?.adresse || '',
        date_debut: jourLocal(),
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
      await onUpdate(selected.id, { chantier_id: newChantier.id });
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
      // Audit UX du 20 oct. 2026 (P1) : « Envoyée » couvrait aussi le brouillon, une facture jamais partie s'affichait
      // « Envoyée ». Le paiement partiel se lit dans la pastille et sous le montant.
      { id: 'brouillon', label: 'Brouillon', statuses: ['brouillon'] },
      { id: 'envoye', label: 'Envoyée', statuses: ['envoye', 'vu'] },
      { id: 'payee', label: 'Payée', statuses: ['payee'] },
    ];


    // Next action hint based on status

    // Statut d'une facture déduit de ses paiements (src/lib/paiementsFacture.js) : une facture soldée
    // n'affiche plus « à encaisser », ni relance, ni « Encaisser » (revue du 9 oct. 2026).
    const factureVue = selected.type === 'facture' && !isAvoir ? statutFacture(selected, paiements) : null;
    // Soldée : payée, ou annulée par un avoir — ni « Encaisser » ni « Relancer »
    const factureSoldee = factureVue === 'payee' || factureVue === 'annulee';
    const resteFacture = selected.type === 'facture' ? resteAPayer(selected, paiements) : 0;

    // Action principale d'un avoir (les devis et factures ont la leur dans l'en-tête ; les branches qui calculaient des
    // couleurs de bouton pour eux ne servaient plus depuis la refonte du 9 oct. 2026)
    const getPrimaryCTA = () => {
      if (!isAvoir) return null;
      if (selected.statut === 'brouillon') return { label: 'Émettre', icon: Send, action: async () => {
        const ok = await confirm({ title: 'Émettre l\'avoir ?', message: `L'avoir ${selected.numero} sera émis et ne pourra plus être supprimé.` });
        if (ok) { onUpdate(selected.id, { statut: 'envoye' }, { silencieux: true }); setSelected(s => ({ ...s, statut: 'envoye' })); setSnackbar({ type: 'success', message: `Avoir ${selected.numero} émis` }); }
      } };
      if (selected.statut === 'envoye') return { label: 'Appliquer', icon: Check, action: async () => {
        const ok = await confirm({ title: 'Appliquer l\'avoir ?', message: `L'avoir sera marqué comme appliqué. L'impact comptable sera enregistré.` });
        if (ok) { onUpdate(selected.id, { statut: 'payee' }, { silencieux: true }); setSelected(s => ({ ...s, statut: 'payee' })); setSnackbar({ type: 'success', message: `Avoir ${selected.numero} appliqué` }); }
      } };
      return null;
    };

    // « Facturer » (audit UX du 20 oct. 2026) : une seule porte. Le bouton de l'en-tête ouvre ce choix ; l'encadré vert
    // « Devis signé — Choisir le mode de facturation » qui le doublait sous l'en-tête a disparu.
    const soldeAvecAcomptes = isDevis && getAllAcompteFactures(selected.id).length > 0;
    const septJoursFiche = isDevis ? septJoursDe(selected) : null;
    const aucunPaiementAvant = septJoursFiche?.possibleLe ? `Aucun paiement avant le ${septJoursFiche.possibleLe.split('-').reverse().join('/')}` : '';
    const optionsFacturation = !isDevis ? [] : [
      // Relecture juriste-btp du 24 oct. 2026 : « avant les travaux » n'était pas toujours vrai ; pendant les sept jours d'un
      // contrat signé sur place par un particulier (C. conso. L221-10), la date dès laquelle un paiement est possible
      canAcompte && { cle: 'acompte', icone: CreditCard, libelle: 'Facture d’acompte', detail: aucunPaiementAvant || 'Un pourcentage du devis, à régler avant le solde', action: () => ouvrirAcompte() },
      canAcompte && { cle: 'echeancier', icone: ClipboardList, libelle: 'Échéancier', detail: aucunPaiementAvant || 'Plusieurs acomptes, étape par étape', action: () => setShowEcheancierModal(true) },
      // Le montant de la facture qui sera créée (celui que la confirmation annonce) ; « TTC » seulement hors franchise
      canFacturer && { cle: 'solde', icone: Receipt, libelle: soldeAvecAcomptes ? 'Facture de solde' : 'Facture complète',
        detail: modeDiscret ? '' : avecMentionTtc(formatMoney(factureDeSolde(selected).totaux.totalTTC), isMicro), action: () => confirmAndCreateSolde() },
      canFacturer && hasChantier && setSelectedChantier && { cle: 'situation', icone: BarChart3, libelle: 'Situation de travaux', detail: 'Par avancement, depuis le chantier', action: () => { setSelectedChantier(selected.chantier_id); setPage?.('chantiers'); } },
    ].filter(Boolean);
    optionsFacturationRef.current = optionsFacturation;

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

        {/* ============ ZONE 1 : EN-TÊTE (refonte du 9 oct. 2026 — src/components/devis/EnTeteDocument.jsx) ============
            Qui (le client), combien (TTC), où on en est (pastille, phrase, étapes), UNE action principale ;
            le reste dans « ⋯ ». Remplace le numéro en titre, le statut dit trois fois et « Facturer » triplé. */}
        {(() => {
          const nomClient = cleanClientName(client) || selected.client_nom || '';
          const genre = isAvoir ? 'Avoir'
            : selected.type === 'facture'
              ? ({ acompte: "Facture d'acompte", solde: 'Facture de solde', situation: 'Situation' }[selected.facture_type] || 'Facture')
              : 'Devis';
          const dateCourte = (d) => (d ? dateLue(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
          const ttc = selected.total_ttc || 0;
          const peutEnvoyer = canPerform('devis', 'send');
          const peutModifier = canPerform('devis', 'edit');
          const peutCreer = canPerform('devis', 'create');

          // Une phrase qui dit où on en est
          let contexte = '';
          let contexteAlerte = false;
          if (isAvoir) {
            contexte = sourceFacture ? `Avoir sur la facture ${cleanNumero(sourceFacture.numero)}` : '';
          } else if (isDevis) {
            const st = selected.statut;
            if (st === 'brouillon') contexte = `Brouillon du ${dateCourte(selected.date)}`;
            else if (st === 'envoye' || st === 'vu') {
              const fin = finValidite(selected, entreprise);
              if (isExpired(selected)) { contexte = `Expiré · n'était valable que jusqu'au ${dateCourte(fin)} : il ne peut plus être envoyé ni signé en ligne`; contexteAlerte = true; }
              else contexte = `Envoyé · valable jusqu'au ${dateCourte(fin)}`;
            } else if (st === 'accepte' || st === 'signe') {
              // Ce qui est déjà facturé se dit (audit UX du 20 oct. 2026 : « 14 245 € à facturer » taisait l'acompte de 6 105 €)
              const deja = Math.round(((Number(selected.total_ttc) || 0) - resteAFacturer) * 100) / 100;
              const dejaTexte = facturesLiees.some(f => f.facture_type === 'acompte') ? `Acompte ${formatMoney(deja)} facturé` : `Déjà facturé ${formatMoney(deja)}`;
              contexte = resteAFacturer > 0
                ? `${deja > 0.005 ? `${dejaTexte} · ` : ''}${formatMoney(resteAFacturer)} à facturer`
                : '';
            }
            else if (st === 'acompte_facture') contexte = `Acompte facturé · ${formatMoney(resteAFacturer)} restent à facturer`;
            else if (st === 'facture') contexte = canFacturer ? `Facture annulée par avoir · ${formatMoney(resteAFacturer)} à refacturer` : 'Entièrement facturé';
            else if (st === 'refuse') contexte = 'Refusé par le client';
          } else {
            const ech = echeance(selected);
            const recu = dejaPaye(selected, paiements);
            const masque = (v) => (modeDiscret ? '•••' : formatMoney(v));
            // Les chiffres se recoupent : total, avoirs (s'il y en a), reçu → reste (relecture juriste-btp du 24 oct. 2026) ;
            // « TTC » seulement hors franchise
            const credite = montantCredite(selected, devis);
            const decompte = `sur ${avecMentionTtc(masque(ttc), franchiseAppliquee(selected, entreprise))}${credite > 0.005 ? ` · avoirs −${masque(credite)}` : ''} · reçu ${masque(recu)}`;
            if (factureVue === 'payee') contexte = selected.date_paiement ? `Payée le ${dateCourte(selected.date_paiement)}` : 'Soldée';
            else if (factureVue === 'en_retard' && recu > 0.005) { contexte = `En retard de ${joursDeRetard(selected, paiements)} j · ${decompte}`; contexteAlerte = true; }
            else if (factureVue === 'en_retard') { contexte = `En retard de ${joursDeRetard(selected, paiements)} j · reste ${masque(resteFacture)}`; contexteAlerte = true; }
            // Payée en partie : le chiffre qui compte (le reste) devient le grand nombre, le total passe dessous
            else if (factureVue === 'partielle') contexte = `${decompte}${ech ? ` · échéance ${dateCourte(ech)}` : ''}`;
            else if (factureVue === 'brouillon') contexte = `Brouillon du ${dateCourte(selected.date)}`;
            else contexte = `${ech ? `Échéance ${dateCourte(ech)} · ` : ''}reste ${masque(resteFacture)}`;
          }
          const resteEnGrand = !isAvoir && selected.type === 'facture' && !factureSoldee && dejaPaye(selected, paiements) > 0.005 && resteFacture > 0.005;

          // Étapes : faites, en cours, à venir (une facture soldée par ses paiements est « payée »)
          const ordre = { brouillon: 0, envoye: 1, vu: 1, accepte: 2, signe: 2, acompte_facture: 3, facture: 4, payee: 5 };
          const statutEtapes = factureSoldee ? 'payee' : selected.statut;
          const etapes = selected.statut === 'refuse' ? [] : statusSteps.map((e) => {
            const max = Math.max(...e.statuses.map((x) => ordre[x] ?? 0));
            const etat = e.statuses.includes(statutEtapes) ? 'courant' : (ordre[statutEtapes] ?? 0) > max ? 'fait' : 'avenir';
            return { id: e.id, libelle: e.label, etat };
          });

          // L'action principale (une seule) et la secondaire, selon l'étape
          const telechargerPdf = () => tryDownload(selected, async (doc) => { setActionLoading('pdf'); try { await printPDF(doc); } catch { /* erreur déjà signalée par printPDF */ } finally { setActionLoading(null); } });
          const actPdf = { libelle: 'PDF', icone: Download, onClick: telechargerPdf, chargement: actionLoading === 'pdf' };
          const actApercu = { libelle: 'Aperçu', icone: Eye, onClick: () => previewPDF(selected) };
          // Avec un acompte déjà facturé, on facture le solde : la confirmation doit annoncer ce montant-là
          // (elle annonçait le total du devis). confirmAndCreateSolde calcule et annonce le bon.
          const facturer = async () => {
            if (optionsFacturation.length > 1) { setChoixFacturation(true); return; }
            if (optionsFacturation.length === 1) { await optionsFacturation[0].action(); return; }
            await confirmAndCreateSolde();
          };
          const actModifier = peutModifier && peutModifierDocument(selected, devis) ? { libelle: 'Modifier', icone: Pen, onClick: () => openEditor(selected) } : null;
          let principal = null;
          let secondaire = actApercu;
          if (isAvoir) {
            const p = getPrimaryCTA();
            if (p) principal = { libelle: p.label, icone: p.icon, onClick: p.action };
            secondaire = actPdf;
          } else if (isDevis) {
            const st = selected.statut;
            if (st === 'brouillon' && peutEnvoyer) {
              principal = ttc > 0
                ? { libelle: 'Envoyer', icone: Send, onClick: () => trySend(selected, sendEmail) }
                : { libelle: 'Compléter le devis', icone: Pen, onClick: () => openEditor(selected) };
              // L'aperçu est déjà sous les boutons : l'action utile d'un brouillon est « Modifier » (audit UX du 20 oct.)
              if (ttc > 0 && actModifier) secondaire = actModifier;
            } else if ((st === 'envoye' || st === 'vu') && isExpired(selected)) {
              principal = peutModifier && peutModifierDocument(selected, devis) ? { libelle: 'Prolonger la validité', icone: Pen, onClick: () => openEditor(selected) } : null;
              secondaire = actPdf;
            } else if (st === 'envoye' || st === 'vu') {
              principal = { libelle: 'Faire signer', icone: PenTool, onClick: () => setShowSignaturePad(true) };
              if (peutEnvoyer) secondaire = { libelle: 'Relancer', icone: Mail, onClick: () => setRelanceDe(selected) };
            } else if (facturationParSituations && ['accepte', 'signe', 'acompte_facture'].includes(st)) {
              principal = selected.chantier_id
                ? { libelle: 'Situation suivante', icone: BarChart3, onClick: () => { setSelectedChantier?.(selected.chantier_id); setPage?.('chantiers'); } }
                : null;
              secondaire = actPdf;
            } else if ((st === 'accepte' || st === 'signe') && (canAcompte || canFacturer)) {
              principal = { libelle: 'Facturer', icone: Receipt, onClick: facturer };
              secondaire = actPdf;
            } else if (st === 'facture' && canFacturer) {
              // Facture annulée par un avoir total : on refacture
              principal = { libelle: 'Refacturer', icone: Receipt, onClick: confirmAndCreateSolde };
              secondaire = actPdf;
            } else if (st === 'acompte_facture' && canFacturer) {
              principal = { libelle: `Facturer le solde`, icone: Receipt, onClick: confirmAndCreateSolde };
              secondaire = actPdf;
            } else if (st === 'refuse' && peutCreer) {
              secondaire = { libelle: 'Dupliquer', icone: Copy, onClick: () => duplicateDocument(selected) };
            } else {
              secondaire = actPdf;
            }
          } else if (selected.statut === 'brouillon' && !isAvoir) {
            // Un brouillon s'envoie d'abord : on n'encaisse pas une facture que le client n'a pas reçue
            if (peutEnvoyer) principal = { libelle: 'Envoyer', icone: Send, onClick: () => trySend(selected, sendEmail) };
            secondaire = actPdf;
          } else if (!factureSoldee && !isAvoir) {
            principal = { libelle: 'Encaisser', icone: CreditCard, onClick: () => setShowPaymentModal(true) };
            // Avant l'échéance, ce qui part est un envoi, pas une relance (relecture juriste-btp du 24 oct. 2026 ; C. com.
            // L441-10, II) : « Renvoyer » ; une facture échue se « Relance »
            if (peutEnvoyer) secondaire = selected.statut === 'brouillon'
              ? { libelle: 'Envoyer', icone: Send, onClick: () => trySend(selected, sendEmail) }
              : { libelle: estEchue(selected) ? 'Relancer' : 'Renvoyer', icone: Mail, onClick: () => setRelanceDe(selected) };
          } else {
            secondaire = actPdf;
          }

          // Tout le reste : le menu « ⋯ »
          const transitions = (isDevis ? VALID_TRANSITIONS : FACTURE_TRANSITIONS)[selected.statut] || [];
          const brouillon = selected.statut === 'brouillon';
          const envoyerPar = (fn) => () => (brouillon ? trySend(selected, fn) : fn(selected));
          const actions = [
            actModifier && secondaire !== actModifier && actModifier,
            secondaire !== actApercu && { libelle: 'Aperçu du document', icone: Eye, onClick: () => previewPDF(selected) },
            secondaire !== actPdf && { libelle: 'Télécharger le PDF', icone: Download, onClick: telechargerPdf },
            isDevis && !['facture', 'refuse'].includes(selected.statut) && { libelle: 'Voir comme le client', icone: Smartphone, onClick: async () => {
              try {
                const token = await getOrGenerateSignatureToken(selected);
                if (token) ouvrirLienExterne(buildSignatureUrl(token)); else showToast('Le lien de signature n\'existe pas en mode démo.', 'info');
              } catch (e) { showToast(blocageExpiration(selected) || mapError(e), 'error'); }
            } },
            peutModifier && transitions.length > 0 && { libelle: 'Changer le statut', icone: Flag, onClick: () => setVoletStatut(true) },
            peutEnvoyer && !isAvoir && { groupe: 'envoi', libelle: brouillon ? 'Envoyer par e-mail' : 'Renvoyer par e-mail', icone: Mail, onClick: envoyerPar(sendEmail) },
            peutEnvoyer && !isAvoir && !(selected.type === 'facture' && brouillon) && { groupe: 'envoi', libelle: 'Envoyer par WhatsApp', icone: MessageCircle, onClick: envoyerPar(sendWhatsApp) },
            peutEnvoyer && !isAvoir && !(selected.type === 'facture' && brouillon) && { groupe: 'envoi', libelle: 'Envoyer par SMS', icone: MessageCircle, onClick: envoyerPar(sendSMS) },
            isDevis && hasChantier && linkedChantier && { groupe: 'document', libelle: `Chantier : ${linkedChantier.nom}`, icone: Building2, onClick: () => { setSelectedChantier?.(linkedChantier.id); setPage?.('chantiers'); } },
            isDevis && !hasChantier && canCreateChantier && { groupe: 'document', libelle: 'Créer le chantier', icone: Building2, onClick: openChantierModal },
            peutCreer && selected.type === 'devis' && ['accepte', 'signe'].includes(selected.statut) && canAcompte && { groupe: 'document', libelle: 'Demander un acompte', icone: CreditCard, onClick: () => setShowEcheancierModal(true) },
            peutModifier && selected.type === 'devis' && ['accepte', 'signe', 'envoye', 'facture'].includes(selected.statut) && { groupe: 'document', libelle: 'Créer un avenant', icone: Edit3, onClick: () => createAvenant(selected) },
            // Un avoir rectifie une facture émise : un brouillon se corrige directement (CGI art. 272, 1 ; migration 100)
            peutCreer && selected.type === 'facture' && !isAvoir && selected.statut !== 'brouillon' && { groupe: 'document', libelle: 'Créer un avoir', icone: RotateCcw, onClick: () => setShowAvoirModal(true) },
            // Un avoir brouillon est déjà numéroté : il ne se supprime pas (trou dans la séquence), il s'annule
            peutModifier && isAvoir && selected.statut === 'brouillon' && { groupe: 'document', libelle: 'Annuler cet avoir', icone: X, onClick: async () => {
              const ok = await confirm({ title: 'Annuler cet avoir ?', message: `${selected.numero} restera dans la numérotation, marqué « annulé », et ne réduira pas la facture.` });
              if (ok && await onUpdate(selected.id, { statut: 'annule' })) setSelected(s => (s ? { ...s, statut: 'annule' } : s));
            } },
            peutCreer && { groupe: 'document', libelle: 'Dupliquer', icone: Copy, onClick: async () => { setActionLoading('duplicate'); try { await duplicateDocument(selected); } finally { setActionLoading(null); } } },
            peutModifier && { groupe: 'document', libelle: 'Enregistrer comme modèle', icone: Star, onClick: () => setShowSaveTemplateModal(true) },
            // Une facture émise ne se supprime pas (avoir) ; un devis facturé non plus
            canPerform('devis', 'delete') && peutSupprimerDocument(selected, devis) && { danger: true, libelle: 'Supprimer', icone: Trash2, onClick: async () => {
              const ok = await confirm({ title: 'Supprimer', message: isAvoir ? 'Supprimer cet avoir brouillon ?' : `Supprimer ${selected.numero || 'ce document'} ?` });
              if (ok && await onDelete(selected.id)) { setSelected(null); setMode('list'); }
            } },
          ].filter(Boolean);

          const legal = selected.statut === 'refuse' ? [] : getLegalIssues();
          const alertes = [
            legal.length > 0 && {
              libelle: `${legal.length} mention${legal.length > 1 ? 's' : ''} légale${legal.length > 1 ? 's' : ''} manquante${legal.length > 1 ? 's' : ''} : ${legal.map((i) => i.label.toLowerCase()).join(', ')}`,
              onClick: setPage ? () => setPage('settings', { tab: 'legal' }) : undefined,
            },
            isDevis && needsFollowUp(selected) && peutEnvoyer && { libelle: 'Sans réponse depuis 7 jours ou plus : pensez à relancer', onClick: () => setRelanceDe(selected) },
          ].filter(Boolean);

          return (
            <EnTeteDocument
              onRetour={() => { setMode('list'); setSelected(null); setChoixFacturation(false); }}
              surtitre={`${genre} · ${cleanNumero(selected.numero)}`}
              extra={isDevis && devisSnapshots.length > 0 ? (
                <VersionSelector snapshots={devisSnapshots} onSelectVersion={(snap) => setViewingSnapshot(snap)} onCompareVersions={(a, b) => setComparingSnapshots({ a, b })} isDark={isDark} couleur={couleur} />
              ) : null}
              titre={nomClient || (
                <button type="button" onClick={() => setAssigningClientDevisId(selected.id)} className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-alerte-fond text-alerte-texte text-base font-semibold">
                  <AlertTriangle size={18} aria-hidden="true" /> Assigner un client
                </button>
              )}
              objet={selected.objet || linkedChantier?.nom || ''}
              montant={canViewPrices ? (modeDiscret ? '···' : formatMoney(isAvoir ? -Math.abs(ttc) : resteEnGrand ? resteFacture : ttc)) : '—'}
              mention={canViewPrices && !modeDiscret && !franchiseAppliquee(selected, entreprise) ? 'TTC' : undefined}
              libelleMontant={resteEnGrand && canViewPrices ? 'Reste à payer' : undefined}
              pastille={<PastilleStatut genre={selected.type === 'facture' && !isAvoir ? 'facture' : 'devis'} statut={selected.type === 'facture' && !isAvoir ? factureVue : selected.statut} taille="grande" />}
              contexte={contexte}
              contexteAlerte={contexteAlerte}
              alertes={alertes}
              etapes={etapes}
              principal={principal}
              secondaire={secondaire}
              actions={actions}
            />
          );
        })()}

        {/* Changer le statut : volet (bas d'écran sur téléphone) au lieu d'une liste déroulante colorée */}
        <Volet ouvert={voletStatut} onFermer={() => setVoletStatut(false)} titre="Changer le statut" largeur={320}>
          <ListeChoix
            titre="Statut" rechercheAuDela={99}
            options={[selected.statut, ...((isDevis ? VALID_TRANSITIONS : FACTURE_TRANSITIONS)[selected.statut] || [])].map((st) => ({ valeur: st, libelle: st === 'accepte' ? 'Signé' : (DEVIS_STATUS_LABELS[st] || st) }))}
            valeur={selected.statut}
            onChange={(nouveau) => {
              setVoletStatut(false);
              if (nouveau === selected.statut) return;
              if (nouveau === 'envoye' && selected.statut === 'brouillon') {
                const issues = validateDevisForSend(selected);
                if (issues.length > 0) { setSendValidationIssues({ issues, doc: selected }); return; }
              }
              onUpdate(selected.id, { statut: nouveau });
              setSelected((x) => ({ ...x, statut: nouveau }));
            }}
          />
        </Volet>

        {/* Facturer : le choix (acompte, échéancier, solde, situation), en feuille du bas sur téléphone */}
        <Volet ouvert={choixFacturation && optionsFacturation.length > 1} onFermer={() => setChoixFacturation(false)} titre="Facturer ce devis" largeur={360}>
          <ul className="-mx-2 space-y-1">
            {optionsFacturation.map(({ cle, icone: Icone, libelle, detail, action }) => (
              <li key={cle}>
                <button
                  type="button"
                  onClick={() => { setChoixFacturation(false); action(); }}
                  className="w-full min-h-[60px] flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors hover:bg-surface-2"
                >
                  <span className="w-10 h-10 rounded-xl bg-surface-2 text-encre-2 flex items-center justify-center flex-shrink-0" aria-hidden="true"><Icone size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base sm:text-sm font-semibold text-encre">{libelle}</span>
                    {detail ? <span className="block text-sm text-encre-3 tabular-nums">{detail}</span> : null}
                  </span>
                  <ChevronRight size={18} className="text-encre-3 flex-shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Volet>

        {/* ============ AVOIR : facture d'origine (carte neutre ; le montant de l'avoir dit déjà le crédit) ============ */}
        {isAvoir && sourceFacture && (
          <div className="rounded-2xl border border-bord bg-surface shadow-e1 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-encre">
                <RotateCcw size={16} className="text-encre-3" aria-hidden="true" /> Facture d'origine
              </p>
              <Bouton taille="compacte" variante="secondaire" iconeFin={ChevronRight} onClick={() => { setSelected(sourceFacture); }}>
                {sourceFacture.numero}
              </Bouton>
            </div>
            {selected.avoir_motif && (
              <div className="mt-3 text-sm text-encre-2">
                <span className="font-medium text-encre">Motif :</span> {AVOIR_MOTIFS[selected.avoir_motif] || selected.avoir_motif}
                {selected.avoir_motif_detail && <p className="mt-1 text-sm text-encre-3">{selected.avoir_motif_detail}</p>}
              </div>
            )}
            {selected.avoir_type && (
              <div className="mt-3">
                <Pastille ton="neutre">{selected.avoir_type === 'total' ? 'Avoir total' : 'Avoir partiel'}</Pastille>
              </div>
            )}
          </div>
        )}

        {/* ============ FACTURE : avoirs liés ============ */}
        {!isAvoir && selected.type === 'facture' && avoirsLies.length > 0 && (
          <div className="rounded-2xl border border-bord bg-surface shadow-e1 p-4">
            <p className="flex items-center gap-2 mb-3 text-sm font-semibold text-encre">
              <RotateCcw size={16} className="text-encre-3" aria-hidden="true" /> Avoirs émis ({avoirsLies.length})
            </p>
            <ul className="divide-y divide-bord">
              {avoirsLies.map(avoir => (
                <li key={avoir.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <button type="button" onClick={() => setSelected(avoir)} className="min-h-[44px] text-sm font-semibold underline underline-offset-2 text-encre hover:text-accent-texte">
                      {avoir.numero}
                    </button>
                    <Pastille ton={avoir.statut === 'payee' ? 'succes' : avoir.statut === 'envoye' ? 'info' : 'neutre'}>
                      {avoir.statut === 'payee' ? 'Appliqué' : avoir.statut === 'envoye' ? 'Émis' : 'Brouillon'}
                    </Pastille>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-danger-texte">{formatMoney(avoir.total_ttc)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between gap-4 pt-3 mt-1 border-t border-bord">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-encre-3">Montant facturé</span>
                  <span className="font-medium tabular-nums text-encre">{formatMoney(selected.total_ttc)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-encre-3">Total avoirs</span>
                  <span className="font-medium tabular-nums text-danger-texte">-{formatMoney(totalAvoirs)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-encre-3">Restant dû</p>
                <p className={`text-lg font-bold tabular-nums ${restantDu > 0 ? 'text-encre' : 'text-succes-texte'}`}>{formatMoney(restantDu)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============ ZONE 2: SMART CONTEXT CARD ============ */}
        {/* Billing options - always visible for devis not yet invoiced */}

        {/* Facturation: AcompteSuiviCard handles all cases (échéancier, legacy acompte, options, guidance) */}
        {isDevis && selected.statut !== 'facture' && (
          <AcompteSuiviCard
            devis={selected}
            situationsFacturees={situationsFacturees}
            situationsEnCours={situationsEnCours}
            soldeAFacturer={getAllAcompteFactures(selected.id).length > 0 ? factureDeSolde(selected).totaux.totalTTC : null}
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
            onOpenAcompteSimple={() => ouvrirAcompte()}
            onOpenEcheancierModal={() => setShowEcheancierModal(true)}
            onSelectFacture={(f) => setSelected(f)}
            onFacturer100={confirmAndCreateSolde}
            onOpenSituation={selected.chantier_id ? () => { setSelectedChantier(selected.chantier_id); setPage('chantiers'); } : null}
          />
        )}

        {/* Devis sans réponse : l'alerte de l'en-tête (« pensez à relancer ») ouvre la feuille « Relancer » ; l'encadré
            orange qui la répétait ici, avec ses deux boutons pleins, a disparu (audit UX du 20 oct. 2026 : une alerte par fait) */}

        {/* Devis bientôt expiré (un devis expiré le dit dans l'en-tête, en rouge, avec « Prolonger la validité ») */}
        {isDevis && isExpiringSoon(selected) && !isExpired(selected) && (
          <div role="note" className="rounded-2xl p-4 bg-alerte-fond text-alerte-texte flex items-start gap-3">
            <Clock size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">
                {getExpiryDaysLeft(selected) === 0 ? 'Dernier jour de validité' : `Expire dans ${getExpiryDaysLeft(selected)} jour${getExpiryDaysLeft(selected) > 1 ? 's' : ''}`}
              </p>
              <p className="text-sm">
                Valable jusqu'au {dateLue(finValidite(selected, entreprise)).toLocaleDateString('fr-FR')} · Émis le {dateLue(selected.date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        )}

        {/* « Facture en attente · à encaisser » : remplacé par la phrase de l'en-tête et ses actions (refonte du 9 oct.). */}
        {/* Relance Timeline Widget */}
        {relances.isEnabled && !factureSoldee && (() => {
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
              onSendNow={async () => {
                if (!client) return;
                // Ce qui part chez le client se confirme d'abord (audit UX du 20 oct. 2026, § 2.6)
                const ok = await confirm({ title: 'Envoyer la relance maintenant ?', message: `À ${formatClientName(client, '') || 'votre client'}${client.email ? ` (${client.email})` : ''}, pour ${selected.numero}.` });
                if (!ok) return;
                relances.skipToNextStep(selected, client).then(r => {
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

        {/* Retard de paiement : pénalités et indemnité de 40 € pour un client professionnel (C. com. L441-10) ;
            pour un particulier, ni l'une ni l'autre, mais la mise en demeure reste possible et fait courir les
            intérêts au taux légal (C. civ. art. 1231-6). Avant (recette du 9 oct. 2026), le bouton « Mise en
            demeure » n'existait que pour un professionnel. */}
        {selected.type === 'facture' && !factureSoldee && (() => {
          const pen = calculatePenalites(selected);
          if (!pen) return null;
          const clientRetard = clients.find(c => c.id === selected.client_id);
          const pro = estClientPro(clientRetard);
          if (!pro && pen.joursRetard < 30) return null;
          return (
            <div className="rounded-2xl p-4 border bg-alerte-fond border-alerte-point/40">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-alerte-texte" aria-hidden="true" />
                <span className="font-medium text-sm text-alerte-texte">
                  {pro ? 'Pénalités de retard' : 'Retard de paiement'} · {pen.joursRetard} jour{pen.joursRetard > 1 ? 's' : ''}
                </span>
              </div>
              {pro ? (
                <div className="space-y-1.5 text-sm">
                  <div className={`flex justify-between ${textSecondary}`}>
                    <span>Intérêts ({pen.taux}% annuel)</span>
                    <span className="font-medium">{formatMoney(pen.penalite)}</span>
                  </div>
                  <div className={`flex justify-between ${textSecondary}`}>
                    <span>Indemnité forfaitaire de recouvrement</span>
                    <span className="font-medium">{formatMoney(pen.indemnite)}</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t font-bold border-alerte-point/40 text-alerte-texte`}>
                    <span>Total pénalités</span>
                    <span>{formatMoney(pen.total)}</span>
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${textSecondary}`}>
                  Un client particulier ne doit ni les pénalités de retard du Code de commerce ni l'indemnité de 40 €. Une mise en demeure lui réclame la somme due, qui produit alors des intérêts au taux légal.
                </p>
              )}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-alerte-point/40">
                <p className="text-sm text-alerte-texte">
                  {pro ? 'Art. L441-10 C. com.' : 'Art. 1231-6 C. civ.'} — Échéance : {pen.echeance.toLocaleDateString('fr-FR')}
                </p>
                {pen.joursRetard >= 30 && (
                  <Bouton
                    taille="compacte" variante="secondaire" className="flex-shrink-0"
                    onClick={() => {
                      printMiseEnDemeure({
                        doc: { ...selected, montant_paye: dejaPaye(selected, paiements), date_echeance: selected.date_echeance || dateEcheance(selected.date, { conditionsPaiement: selected.conditionsPaiement || selected.conditions, delaiJours: entreprise?.delaiPaiement }) },
                        penaltyRate: Number(entreprise?.tauxPenalites) || undefined,
                        client: clientRetard,
                        entreprise,
                        executions: relances.getDocumentTimeline(selected.id),
                        couleur,
                      });
                    }}
                  >
                    Mise en demeure
                  </Bouton>
                )}
              </div>
            </div>
          );
        })()}

        {/* ============ ZONE 3: TABBED DOCUMENT VIEW ============ */}
        <div className={`rounded-2xl border overflow-hidden shadow-e1 ${cardBg}`}>
          <Tabs defaultValue="document" isDark={isDark}>
            <div className={`px-4 pt-4 border-b border-bord`}>
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
                    Emails <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-surface-2">{getDocumentEmailStatus(selected.id).sent}</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="document" className="mt-0 p-2 sm:p-6 overflow-x-auto">
              {/* Document header */}
              <div className={`flex justify-between items-start mb-6 pb-6 border-b border-bord`}>
                <div className="flex items-center gap-3">
                  {entreprise?.logo ? (
                    <img src={entreprise.logo} className="h-12 rounded-lg object-cover" alt={entreprise?.nom || ''} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold bg-accent/10 text-accent-texte">
                      {(entreprise?.nom || 'E').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className={`font-bold ${textPrimary}`}>{entreprise?.nom}</p>
                    <p className={`text-xs ${textMuted} whitespace-pre-line`}>{entreprise?.adresse}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent-texte">{selected.facture_type === 'avoir' ? 'AVOIR' : selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p>
                  <p className={`text-sm ${textMuted}`}>{selected.numero}</p>
                </div>
              </div>

              {/* Client info */}
              <div className={`mb-6 p-3 rounded-lg bg-fond`}>
                <p className={`text-xs font-medium mb-1 ${textMuted}`}>Client</p>
                <p className={`font-semibold ${client ? textPrimary : 'text-danger-texte'}`}>
                  {client ? `${client.prenom || ''} ${client.nom}`.trim() : (selected.client_nom || 'Client supprimé')}
                </p>
                {client?.adresse && <p className={`text-sm ${textMuted} whitespace-pre-line`}>{client.adresse}</p>}
              </div>

              {/* Document émis avec TVA alors que l'entreprise est en franchise (293 B) : il reste tel qu'émis,
                  la TVA portée est due (CGI art. 283, 3) et se corrige par un avoir — relecture juridique du 10 oct. */}
              {tvaARegulariser(selected, entreprise) && (
                <div role="note" className="mb-4 p-3 rounded-lg border bg-alerte-fond border-bord text-sm text-alerte-texte">
                  {selected.type === 'facture'
                    ? 'Ce document a été émis avec de la TVA alors que vous êtes en franchise (art. 293 B du CGI) : il reste tel quel. Pour le corriger, faites un avoir total, puis une nouvelle facture sans TVA, et prévenez le client. S’il a déjà payé cette TVA, remboursez-la.'
                    : 'Ce devis signé comporte de la TVA alors que vous êtes en franchise (art. 293 B du CGI) : ses factures seront établies sans TVA. Prévenez le client par écrit ; pour garder le total signé, il faut un nouveau devis signé.'}
                </div>
              )}

              {/* Avenant banner */}
              {selected.is_avenant && (
                <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 bg-accent/10 border-accent/30`}>
                  <Edit3 size={16} className="text-accent-texte flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-accent-texte">
                      Avenant n°{selected.avenant_numero} du devis {selected.avenant_source_numero}
                    </p>
                  </div>
                  <button
                    onClick={() => { const src = devis.find(d => d.id === selected.avenant_source_id); if (src) setSelected(src); }}
                    className="text-xs font-medium px-2 py-1 rounded hover:underline text-accent-texte"
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
                      <h4 className={`font-semibold text-sm ${si > 0 ? 'mt-4 pt-3 border-t' : ''} pb-1 ${textPrimary} ${si > 0 ? 'border-bord' : ''}`}>
                        {section.titre}
                      </h4>
                    )}
                    <table className="w-full text-xs sm:text-sm" aria-label={section.titre || 'Lignes du devis'}>
                      {si === 0 && (
                        <thead>
                          <tr className={`border-b border-bord`}>
                            <th scope="col" className={`text-left py-2 font-medium ${textPrimary}`}>Description</th>
                            <th scope="col" className={`text-right py-2 w-16 font-medium ${textPrimary}`}>Qté</th>
                            <th scope="col" className={`text-right py-2 w-20 font-medium ${textPrimary}`}>PU HT</th>
                            <th scope="col" className={`text-right py-2 w-24 font-medium ${textPrimary}`}>Total</th>
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {filterValidLignes(section.lignes).map((l, i) => (
                          <tr key={i} className={`border-b border-bord`}>
                            <td className={`py-2.5 whitespace-pre-line ${textPrimary}`}>{l.description || ''}</td>
                            <td className={`text-right ${textSecondary}`}>{l.quantite || 0} {l.unite || ''}</td>
                            <td className={`text-right ${textSecondary}`}>{formatMoney(parseFloat(l.prixUnitaire || l.prix_unitaire || 0))}</td>
                            <td className={`text-right font-medium tabular-nums ${getLineTotal(l) < 0 ? 'text-danger-texte' : textPrimary}`}>{formatMoney(getLineTotal(l))}</td>
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
                  {/* Mêmes totaux que les documents imprimés (src/lib/totauxDocument.js) */}
                  {(() => {
                    const microDoc = franchiseAppliquee(selected, entreprise);
                    const t = totauxDocument(selected, { tauxDefaut: tauxTvaDocument(selected, entreprise), isMicro: microDoc });
                    const ligneTotal = (libelle, valeur, cls = textSecondary) => (
                      <div key={libelle} className={`flex justify-between gap-3 py-1 text-sm ${cls}`}><span>{libelle}</span><span className="tabular-nums">{valeur}</span></div>
                    );
                    return (
                      <>
                        {t.remisePct ? (
                          <>
                            {ligneTotal('Total HT avant remise', formatMoney(t.totalLignesHT), textPrimary)}
                            {ligneTotal(`Remise ${pourcent(t.remisePct)}`, `-${formatMoney(t.remiseMontant)}`)}
                            {ligneTotal('Total HT après remise', formatMoney(t.totalHT), textPrimary)}
                          </>
                        ) : ligneTotal('Total HT', formatMoney(t.totalHT), textPrimary)}
                        {!microDoc && (t.tva.length
                          ? t.tva.map((x) => ligneTotal(`TVA ${pourcent(x.taux)}`, formatMoney(x.montant)))
                          : ligneTotal(`TVA ${pourcent(tauxTvaDocument(selected, entreprise))}`, formatMoney(selected.tva || selected.total_tva || 0)))}
                        <div className={`flex justify-between py-2 border-t font-bold text-encre border-bord`}>
                          <span>{!microDoc ? 'Total TTC' : selected.facture_type === 'avoir' ? 'Total de l’avoir' : selected.type === 'facture' ? 'Net à payer' : 'Total'}</span>
                          <span className="tabular-nums">{formatMoney(t.totalTTC)}</span>
                        </div>
                      </>
                    );
                  })()}
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

                </div>
              </div>

              {/* Paiements reçus (audit UX du 20 oct. 2026) : pleine largeur, une ligne par paiement — date et mode à gauche,
                  montant à droite, « Corriger » à part (avant : dans la colonne des totaux, sur trois lignes, collé au montant) */}
              {(() => {
                if (selected.type !== 'facture') return null;
                const linkedPaiements = paiements.filter(p => p.facture_id === selected.id || p.document === selected.numero);
                if (linkedPaiements.length === 0) return null;
                const reste = resteAPayer(selected, paiements);
                const modeLu = (p) => libelleModePaiement(p.mode || p.methode || p.mode_paiement);
                return (
                  <section aria-label="Paiements reçus" className="mt-6 pt-4 border-t border-bord">
                    <h4 className="text-sm font-semibold text-encre mb-1">Paiements reçus</h4>
                    <ul className="divide-y divide-bord">
                      {linkedPaiements.map(p => {
                        // Correction (098) : écriture négative motivée, jamais un encaissement effacé
                        if (estCorrection(p)) {
                          const corrige = linkedPaiements.find(x => x.id === p.reference);
                          return (
                            <li key={p.id} className="flex items-start justify-between gap-3 text-sm py-2.5">
                              <span className="min-w-0 text-encre-2">{dateLue(p.date).toLocaleDateString('fr-FR')} · Correction{corrige ? ` de l'encaissement du ${dateLue(corrige.date).toLocaleDateString('fr-FR')}` : ''}{motifCorrection(p) ? ` : ${motifCorrection(p)}` : ''}</span>
                              <span className="font-semibold tabular-nums whitespace-nowrap text-danger-texte">{formatMoney(p.montant)}</span>
                            </li>
                          );
                        }
                        const corrigeable = correctionPossible(p, linkedPaiements, selected);
                        return (
                          <li key={p.id} className="flex items-center justify-between gap-3 text-sm min-h-[48px]">
                            {/* La date, le mode dessous : au téléphone « Corriger » ne coupe plus le mode */}
                            <span className="min-w-0 flex-1 py-1.5 sm:py-0">
                              <span className="block sm:inline text-encre-2">{dateLue(p.date).toLocaleDateString('fr-FR')}</span>
                              <span className="block sm:inline text-encre-3 sm:text-encre-2"><span className="hidden sm:inline"> · </span>{modeLu(p)}</span>
                            </span>
                            <span className="font-semibold text-encre tabular-nums whitespace-nowrap">{formatMoney(p.montant)}</span>
                            {corrigeable > 0 && addPaiement ? (
                              <Bouton taille="compacte" variante="discret" icone={RotateCcw} className="-mr-2 flex-shrink-0"
                                aria-label={`Corriger l'encaissement du ${dateLue(p.date).toLocaleDateString('fr-FR')}`}
                                onClick={() => setCorrectionDe({ paiement: p, max: corrigeable })}>
                                Corriger
                              </Bouton>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-bord text-base font-bold">
                      {reste <= 0.005 ? (
                        <span className="inline-flex items-center gap-2 text-succes-texte"><CheckCircle size={18} aria-hidden="true" /> Soldée</span>
                      ) : (
                        <>
                          <span className="text-encre">Reste à payer</span>
                          <span className="text-encre tabular-nums">{formatMoney(reste)}</span>
                        </>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* Signature : sur place ou à distance (avant : rien pour un devis signé par le lien) */}
              {(() => {
                const sig = signatureDuClient(selected);
                if (!sig) return null;
                return (
                  <div className={`mt-6 pt-4 border-t border-bord`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle size={16} className="text-succes-texte" aria-hidden="true" />
                      <span className="text-succes-texte font-medium text-sm">
                        Accepté{sig.nom ? ` par ${sig.nom}` : ' par le client'}
                      </span>
                      {sig.date && <span className="text-sm text-encre-3">· {dateLue(sig.date).toLocaleDateString('fr-FR')}</span>}
                    </div>
                    {sig.image && <img src={sig.image} alt={`Signature${sig.nom ? ` de ${sig.nom}` : ''}`} className="mt-2 max-h-20 max-w-[200px] rounded border border-bord bg-white p-1" />}
                  </div>
                );
              })()}
              {/* Rétractation du client particulier : reçue, demande expresse, ou date des travaux (migration 086) */}
              <RetractationDevis devis={selected} client={clients.find(c => c.id === selected.client_id)} />
              {/* Exemplaire signé du client : envoyé, ou à envoyer (migration 090) */}
              <ExemplaireSigne devis={selected} client={clients.find(c => c.id === selected.client_id)} onEnvoyer={() => envoyerExemplaireSigne(selected)} envoiEnCours={actionLoading === 'exemplaire'} />

              {/* Notes */}
              {selected.notes && (
                <div className={`mt-6 pt-4 border-t border-bord`}>
                  <p className={`text-xs font-medium mb-1 ${textMuted}`}>Notes</p>
                  <p className={`text-sm whitespace-pre-wrap ${textSecondary}`}>{selected.notes}</p>
                </div>
              )}

              {/* Conditions de paiement */}
              {selected.conditionsPaiement && CONDITIONS_PAIEMENT[selected.conditionsPaiement] && (
                <div className={`mt-4 pt-3 border-t border-bord`}>
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
                  <div className={`p-4 rounded-lg bg-fond`}>
                    <p className={`text-sm ${textMuted} mb-2`}>
                      {isAcompteFacture ? 'Facture d\'acompte créée à partir du devis :' : isSoldeFacture ? 'Facture de solde créée à partir du devis :' : 'Cette facture a été créée à partir du devis :'}
                    </p>
                    <button
                      onClick={() => { if (sourceDevis) setSelected(sourceDevis); }}
                      className="text-sm font-medium hover:underline flex items-center gap-2 text-accent-texte"
                    >
                      <FileText size={16} />
                      {sourceDevis ? `${sourceDevis.numero} · ${formatMoney(sourceDevis.total_ttc)}` : 'Voir le devis source'}
                    </button>
                  </div>

                  {/* Acompte context: show all acompte factures linked to same devis */}
                  {(isAcompteFacture || isSoldeFacture) && allAcomptesForSource.length > 0 && (
                    <div className={`rounded-lg border p-4 border-bord`}>
                      <p className={`text-sm font-medium mb-3 ${textPrimary}`}>
                        Factures d'acompte ({allAcomptesForSource.length})
                      </p>
                      <div className="space-y-2">
                        {allAcomptesForSource.map((ac) => {
                          const isCurrent = ac.id === selected.id;
                          return (
                            <div
                              key={ac.id}
                              onClick={() => !isCurrent && setSelected(ac)}
                              className={cn(
                                'flex items-center justify-between px-3 py-2 min-h-[44px] rounded-lg text-sm transition-colors',
                                isCurrent ? 'bg-surface-2 border border-bord-fort' : 'cursor-pointer hover:bg-surface-2',
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn('font-medium', textPrimary)}>
                                  {ac.numero}
                                </span>
                                {ac.acompte_pct && <span className="text-sm text-encre-3">{ac.acompte_pct} %</span>}
                                {isCurrent && <Pastille ton="neutre">affichée</Pastille>}
                              </div>
                              <span className={cn('font-semibold', textPrimary)}>{formatMoney(ac.total_ttc)}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Total acomptes vs devis */}
                      {sourceDevis && (
                        <div className={`mt-3 pt-3 border-t border-bord flex items-center justify-between`}>
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
                    <div className="rounded-lg border p-4 border-bord bg-fond">
                      <p className="text-sm font-medium mb-2 text-encre">
                        <ClipboardList size={14} className="inline mr-1 text-encre-3" aria-hidden="true" />
                        Échéancier de paiement
                      </p>
                      <div className="space-y-1">
                        {sourceEcheancier.etapes.map(etape => (
                          <div key={etape.numero} className={`flex items-center justify-between text-xs py-1 ${textMuted}`}>
                            <div className="flex items-center gap-1.5">
                              {(etape.statut === 'facture' || etape.statut === 'paye') ? (
                                <CheckCircle size={12} className={etape.statut === 'paye' ? 'text-succes-texte' : 'text-encre-2'} aria-hidden="true" />
                              ) : (
                                <span className={`w-3 h-3 rounded-full border border-bord-fort`} />
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
                    <div key={rec.id || idx} className={`flex items-center gap-3 p-3 rounded-lg bg-fond`}>
                      <Mail size={16} className="text-encre-3 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${textPrimary} truncate`}>{rec.to}</p>
                        <p className={`text-xs ${textMuted}`}>{rec.subject}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs ${textMuted}`}>{dateLue(rec.sentAt).toLocaleDateString('fr-FR')}</p>
                        <p className={`text-xs ${textMuted}`}>{new Date(rec.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <Pastille ton="succes">Envoyé</Pastille>
                    </div>
                  ))}
                </div>
              </TabsContent>
          </Tabs>
        </div>

        {/* (Bloc « Relances · + Programmer » retiré le 10 oct. 2026 : il annonçait « Relance programmée » sans rien
            programmer, et ses étapes J+7/J+15/J+30 s'affichaient même relances désactivées. Le vrai suivi est le
            RelanceTimelineWidget.) */}
        {/* Facture d'acompte : feuille du bas au téléphone, pied collé (ui/Modal) */}
        <Modal isOpen={!!showAcompteModal} onClose={() => setShowAcompteModal(false)} size="sm" closeOnBackdrop={!facturationEnCours} closeOnEscape={!facturationEnCours}>
          <ModalHeader>
            <ModalTitle>Facture d'acompte</ModalTitle>
            <ModalDescription>Un pourcentage du devis {selected.numero}, à facturer avant le solde.</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div role="radiogroup" aria-label="Pourcentage d'acompte" className="space-y-2">
              {[20, 30, 40, 50].map(pct => {
                const oui = acomptePct === pct;
                return (
                  <button key={pct} type="button" role="radio" aria-checked={oui} onClick={() => setAcomptePct(pct)}
                    className={`w-full min-h-[56px] flex items-center justify-between px-4 rounded-xl border-2 transition-colors ${oui ? 'border-accent bg-accent/10' : 'border-bord hover:border-bord-fort'}`}>
                    <span className="font-medium text-encre">Acompte {pct} %</span>
                    <span className={`text-lg font-bold tabular-nums ${oui ? 'text-encre' : 'text-encre-3'}`}>{formatMoney(ttcAcompte(pct))}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-3 px-3 py-2 bg-surface-2 rounded-xl text-encre">
              <span className="text-sm text-encre-2">Autre</span>
              {/* Saisie libre : effacer puis taper ne remet plus 30 ; bornes vérifiées à la création (1 à 99 %) */}
              <input type="text" inputMode="decimal" aria-label="Pourcentage d'acompte" value={acomptePct} onChange={e => { const v = e.target.value.replace(',', '.').replace(/[^\d.]/g, ''); setAcomptePct(v === '' ? '' : (v.endsWith('.') ? v : Number(v))); }}
                className="w-20 h-11 px-3 border border-bord-fort rounded-xl text-center text-base bg-surface text-encre" />
              <span className="text-encre-3">%</span>
              <span className="ml-auto font-bold tabular-nums">{pourcentageAcompteValide(acomptePct) ? formatMoney(ttcAcompte(acomptePct)) : '—'}</span>
            </label>
            {/* Relecture juridique du 10 oct. 2026 : il n'y a PAS de plafond légal d'acompte pour des travaux
                (l'ancien message « limité à 30 % par la loi, art. L. 214-1 » était faux). Le devis signé fait foi
                (C. civ. art. 1103) ; chez un particulier, contrat signé hors établissement : aucun paiement avant
                7 jours (C. conso. art. L221-10), sauf dépannage urgent demandé par le client. */}
            {septJoursDe(selected) ? (
              <div role="alert" data-ui="AcompteSeptJours" className="bg-alerte-fond rounded-xl p-3 text-sm text-alerte-texte flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{raisonSeptJours(septJoursDe(selected))}</span>
              </div>
            ) : Number(selected.acompte_pct) > 0 && Number(acomptePct) > Number(selected.acompte_pct) ? (
              <div className="bg-alerte-fond rounded-xl p-3 text-sm text-alerte-texte flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>Le devis signé prévoit un acompte de {pourcent(Number(selected.acompte_pct))} : en facturer davantage demande l'accord du client.</span>
              </div>
            ) : !estClientPro(clients.find(c => c.id === selected.client_id)) ? (
              <p className="text-sm text-encre-3">
                Pas de plafond légal d'acompte pour des travaux. Devis signé chez le client : aucun paiement avant 7 jours après la signature (art. L221-10 du Code de la consommation), sauf dépannage urgent qu'il a demandé.
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Bouton variante="discret" onClick={() => setShowAcompteModal(false)}>Annuler</Bouton>
            <Bouton variante="principal" icone={Check} onClick={createAcompte} chargement={facturationEnCours} disabled={!pourcentageAcompteValide(acomptePct) || !!septJoursDe(selected)}>
              {facturationEnCours ? 'Facturation…' : `Facturer ${pourcentageAcompteValide(acomptePct) ? formatMoney(ttcAcompte(acomptePct)) : ''}`}
            </Bouton>
          </ModalFooter>
        </Modal>

        {/* Modal Échéancier d'acomptes */}
        <AcompteEcheancierModal
          isOpen={showEcheancierModal}
          onClose={() => setShowEcheancierModal(false)}
          devis={selected}
          franchise={franchiseAppliquee(selected, entreprise)}
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

        {/* Créer le chantier du devis : feuille du bas au téléphone (ui/Modal) */}
        <Modal isOpen={!!showChantierModal} onClose={() => setShowChantierModal(false)} size="md">
          <ModalHeader>
            <ModalTitle>Créer un chantier</ModalTitle>
            <ModalDescription>À partir du devis {selected.numero}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Revenu prévu : une information, pas un statut (audit UX du 20 oct. 2026 : l'encadré vert « succès » décorait) */}
            {/* En franchise de TVA : une seule ligne, le montant seul (ni HT ni TTC, relecture juriste-btp du 24 oct. 2026) */}
            <div className="rounded-xl p-4 bg-surface-2">
              <p className="text-sm font-medium text-encre-2">Revenu prévu</p>
              {franchiseAppliquee(selected, entreprise) ? (
                <p className="text-2xl font-bold tabular-nums text-encre">{modeDiscret ? '·····' : formatMoney(selected.total_ttc || selected.total_ht || 0)}</p>
              ) : (
                <>
                  <p className="text-2xl font-bold tabular-nums text-encre">{modeDiscret ? '·····' : `${(selected.total_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`}</p>
                  <p className="text-sm text-encre-3 tabular-nums">{modeDiscret ? '·····' : `${(selected.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC`}</p>
                </>
              )}
            </div>
            <Champ
              libelle="Nom du chantier"
              value={chantierForm.nom}
              onChange={e => setChantierForm(p => ({ ...p, nom: e.target.value }))}
              placeholder="Ex: Rénovation cuisine"
            />
            <Champ
              libelle="Adresse du chantier" facultatif
              value={chantierForm.adresse}
              onChange={e => setChantierForm(p => ({ ...p, adresse: e.target.value }))}
              placeholder="Ex: 12 rue des Lilas, 75011 Paris"
            />
            <p className="text-sm text-encre-3">
              Le chantier sera lié à ce devis. Le revenu prévu ({modeDiscret ? '·····' : `${(selected.total_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}) sert à calculer la marge.
            </p>
          </ModalBody>
          <ModalFooter>
            <Bouton variante="discret" onClick={() => setShowChantierModal(false)}>Annuler</Bouton>
            <Bouton variante="principal" icone={Building2} onClick={createChantierFromDevis} disabled={!chantierForm.nom}>Créer le chantier</Bouton>
          </ModalFooter>
        </Modal>

      {fenetreAssigner}
      {fenetreApercu}
      {feuilleRelance}

        {fenetreModele}
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

        {fenetresEnvoi}

        {showSignatureLinkModal && signatureLinkUrl && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSignatureLinkModal(false)}>
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl p-5`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold text-encre`}>Lien de signature</h3>
                <button onClick={() => setShowSignatureLinkModal(false)} className={`p-1 rounded-lg hover:bg-surface-2`}>
                  <X size={20} className="text-encre-3" />
                </button>
              </div>
              <p className={`text-sm mb-4 text-encre-2`}>
                Partagez ce lien avec votre client pour qu'il puisse signer le devis <strong>{selected?.numero}</strong> en ligne.
              </p>
              {/* URL display + copy */}
              <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 bg-surface-2`}>
                <input
                  type="text"
                  readOnly
                  value={signatureLinkUrl}
                  className={`flex-1 text-sm bg-transparent outline-none text-encre-2`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(signatureLinkUrl);
                    showToast('Lien copié !', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-sur-accent"
                >
                  <Copy size={14} />
                </button>
              </div>
              {/* Share buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const client = clients.find(c => c.id === selected?.client_id);
                    const phone = telInternational(client?.telephone || '');
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

        <CorrectionEncaissementModal
          paiement={correctionDe?.paiement || null}
          max={correctionDe?.max || 0}
          reste={selected ? resteSigne(selected, paiements) : 0}
          onConfirmer={(montant, motif) => corrigerEncaissement(correctionDe.paiement, montant, motif)}
          onClose={() => setCorrectionDe(null)}
          isDark={isDark}
        />
        {/* Payment Modal — also needed in preview mode */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          document={selected}
          client={selected ? clients.find(c => c.id === selected.client_id) : null}
          entreprise={entreprise}
          resteDu={selected?.type === 'facture' ? resteAPayer(selected, paiements) : undefined}
          paiementBloque={raisonSeptJours(septJoursDe(selected))}
          // Avant : un rappel que le module n'appelait jamais — le paiement saisi n'était pas enregistré
          onPaymentCreated={handlePaymentCreated}
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
            // Seulement sur un document encore modifiable : une facture émise ou un devis signé se corrigent par un
            // avoir ou un avenant (la base refuse la réécriture, migrations 091 et 093)
            onRestore={!peutModifierDocument(selected, devis) ? undefined : async (snap) => {
              const confirmed = await confirm({ title: 'Restaurer cette version ?', message: 'Les données actuelles seront remplacées par cette version. Cette action est irréversible.' });
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
      {devisComposerElement}
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
                setForm({ type: 'devis', clientId: '', chantierId: '', date: jourLocal(), validite: entreprise?.validiteDevis || 30, sections: [{ id: '1', titre: '', lignes: [] }], tvaDefaut: (entreprise?.tvaDefaut ?? 10), remise: 0, retenueGarantie: false, conditionsPaiement: entreprise?.conditionsPaiementDefaut || '30_jours', notes: '' });
              }
            } else {
              setMode('list');
            }
          }} className={`p-2.5 hover:bg-surface-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors`}><ArrowLeft size={20} /></button>
          <h2 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Nouveau {form.type}</h2>
          <button
            onClick={() => {
              const hasData = form.clientId || (form.sections?.[0]?.lignes?.length > 0);
              if (hasData) {
                if (window.confirm('Abandonner ce devis ? Les données non sauvegardées seront perdues.')) {
                  setMode('list');
                  setForm({ type: 'devis', clientId: '', chantierId: '', date: jourLocal(), validite: entreprise?.validiteDevis || 30, sections: [{ id: '1', titre: '', lignes: [] }], tvaDefaut: (entreprise?.tvaDefaut ?? 10), remise: 0, retenueGarantie: false, conditionsPaiement: entreprise?.conditionsPaiementDefaut || '30_jours', notes: '' });
                }
              } else {
                setMode('list');
              }
            }}
            className={`text-sm px-3 py-1.5 rounded-lg min-h-[44px] text-encre-3 hover:text-encre-2 hover:bg-surface-2`}
          >
            Annuler
          </button>
        </div>

        {/* Chemin rapide : Devis Express (guidé, plein largeur) */}
        <button
          onClick={() => setShowSmartWizard(true)}
          className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all hover:shadow-lg group text-left ${isDark ? 'border-orange-500/50 hover:border-orange-400 bg-gradient-to-r from-orange-900/20 to-amber-900/20' : 'border-orange-300 hover:border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50'}`}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-500 group-hover:scale-110 transition-transform flex-shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${textPrimary} text-sm sm:text-base`}>Devis Express</p>
            <p className={`text-xs sm:text-sm ${textMuted}`}>Le plus rapide — devis guidé en 2 clics</p>
          </div>
          <ChevronRight size={18} className={`${textMuted} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
        </button>

        {/* Ou partir d'un modèle métier */}
        <div>
          <p className={`text-xs font-medium mb-2 ${textMuted}`}>Ou partir d'un modèle</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                      tva: form.tvaDefaut ?? 10,
                      subItems: [],
                    })),
                  }));
                  setForm(prev => ({ ...prev, sections }));
                  showToast?.(`Modèle "${tpl.label}" chargé`, 'success');
                }}
                className={`p-3 rounded-xl border text-center transition-all hover:shadow-md border-bord hover:border-bord-fort bg-surface`}
              >
                <tpl.icon size={20} className="mx-auto mb-1" style={{ color: couleur }} />
                <p className={`text-xs font-medium ${textPrimary}`}>{tpl.label}</p>
              </button>
            ))}
            {/* Accès au sélecteur de modèles complet (bibliothèque + enregistrés) */}
            <button
              onClick={() => setShowTemplateSelector(true)}
              className={`p-3 rounded-xl border border-dashed text-center transition-all hover:shadow-md ${isDark ? 'border-slate-600 hover:border-slate-500 bg-slate-800' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
            >
              <FileText size={20} className={`mx-auto mb-1 ${textMuted}`} />
              <p className={`text-xs font-medium ${textMuted}`}>Autres modèles</p>
            </button>
          </div>
        </div>

        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 space-y-4 sm:space-y-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Type</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Client *</label><div className="flex gap-2"><select className={`flex-1 min-w-0 px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Choisir...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select><button onClick={() => setShowClientModal(true)} aria-label="Nouveau client" title="Nouveau client" className="px-3 py-2 rounded-xl min-h-[44px] flex items-center justify-center flex-shrink-0 hover:shadow-md transition-all text-accent-texte" style={{background: `${couleur}20`}}><Plus size={18} /></button></div></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Chantier</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Date</label><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          </div>
          
          {/* TVA par défaut - Quick Buttons pour Jean-Marc fatigue */}
          <div className={`p-3 bg-fond rounded-xl`}>
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
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-accent-texte"
                style={{ backgroundColor: `${couleur}15`, border: `1px solid ${couleur}30` }}
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">Parcourir</span>
              </button>
            </div>
            {catalogueSearch && (
              <div className={`border rounded-xl max-h-40 overflow-y-auto border-bord bg-surface`}>
                {catalogueFiltered.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { addLigne(item, form.sections[0].id); setCatalogueSearch(''); }}
                    className={`w-full flex justify-between px-4 py-2 hover:bg-surface-2 border-b last:border-0 text-left`}
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
                    className={`border-2 rounded-xl p-4 transition-all hover:shadow-md border-bord bg-surface`}
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
                        <p className="text-lg font-bold tabular-nums transition-all text-accent-texte">
                          {getLineTotal(l).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </p>
                        <p className={`text-xs ${textMuted}`}>HT</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {idx > 0 && (
                          <button onClick={() => moveLigne(section.id, idx, -1)} className={`p-1 rounded transition-colors hover:bg-surface-2 text-encre-3`} aria-label="Monter la ligne">
                            <ChevronUp size={14} />
                          </button>
                        )}
                        {idx < section.lignes.length - 1 && (
                          <button onClick={() => moveLigne(section.id, idx, 1)} className={`p-1 rounded transition-colors hover:bg-surface-2 text-encre-3`} aria-label="Descendre la ligne">
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
                          <div key={sub.id} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg bg-fond`}>
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
                    <button
                      onClick={() => addSubItem(section.id, l.id)}
                      className={`mt-1 ml-8 text-xs px-2 py-1 rounded-lg transition-colors text-encre-3 hover:text-encre-2 hover:bg-surface-2`}
                    >
                      + Sous-ligne
                    </button>
                  </div>
                ))}
              </div>

              {/* Add line button */}
              <button
                onClick={() => addLigne({ nom: '', prix: 0, unite: 'unité' }, section.id)}
                className={`w-full py-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-md ${isDark ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
              >
                <Plus size={18} className="text-accent-texte" />
                <span className="font-medium text-accent-texte">Ajouter une ligne</span>
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
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Validité (jours)</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.validite} onChange={e => setForm(p => ({...p, validite: e.target.value.replace(/\D/g, '')}))} onBlur={() => setForm(p => ({ ...p, validite: parseInt(p.validite, 10) > 0 ? parseInt(p.validite, 10) : 30 }))} /></div>
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
            <div className={`w-full sm:w-72 p-4 rounded-xl bg-fond`}>
              <div className={`flex justify-between py-1 ${textPrimary}`}><span>Total HT</span><span>{formatMoney(totals.totalHT)}</span></div>
              {form.remise > 0 && <div className="flex justify-between py-1 text-red-500"><span>Remise {form.remise}%</span><span>-{formatMoney(totals.remiseAmount)}</span></div>}
              {!isMicro && Object.entries(totals.tvaParTaux).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) => (
                <div key={taux} className={`flex justify-between py-1 text-sm ${textSecondary}`}>
                  <span>TVA {pourcent(taux)}</span>
                  <span>{formatMoney(data.montant)}</span>
                </div>
              ))}
              {isMicro && <div className={`text-xs py-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>TVA non applicable (art. 293B CGI)</div>}
              <div className={`flex justify-between py-2 border-t font-bold mt-1 border-bord text-accent-texte`}><span>Total TTC</span><span>{formatMoney(totals.ttc)}</span></div>
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
        <div className={`sticky bottom-0 left-0 right-0 p-4 border-t shadow-lg bg-surface border-bord`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 max-w-full">
            <div className={`text-sm ${textMuted} hidden sm:block`}>
              {form.sections[0]?.lignes?.length || 0} ligne{(form.sections[0]?.lignes?.length || 0) > 1 ? 's' : ''} • Total: <span className="font-bold text-accent-texte">{formatMoney(totals.ttc)}</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
              <button onClick={() => setMode('list')} className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                <X size={16} />
                <span>Annuler</span>
              </button>
              <button onClick={() => { handleCreate(); }} disabled={isSubmitting} className={`px-5 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-all font-medium disabled:opacity-50 border border-bord-fort text-encre-2 hover:bg-surface-2`}>
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
        {showClientModal && <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"><div className={`${cardBg} rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md`}><h3 className="font-bold mb-4">Nouveau client</h3><div className="space-y-4"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom *" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Téléphone" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowClientModal(false)} className={`px-4 py-2 rounded-xl bg-surface-2`}>Annuler</button><button onClick={() => { if (newClient.nom) { const c = { id: generateId(), ...newClient }; setClients(prev => [...prev, c]); setForm(p => ({...p, clientId: c.id})); setShowClientModal(false); setNewClient({ nom: '', telephone: '' }); }}} className="px-4 py-2 rounded-xl bg-accent text-sur-accent">Créer</button></div></div></div>}

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
  // Motif de liste (audit UX du 20 oct. 2026, § 2.4) : en-tête avec un fait et un bouton plein, deux tuiles qui filtrent,
  // recherche · filtres · tri, puces d'état, puis la liste. Au premier usage : ni tuiles ni bandeau rouge, un état vide.
  const documentsVisibles = devis.filter(d => {
    if (!d.numero && !clients.find(c => c.id === d.client_id) && (!d.statut || d.statut === 'brouillon')) return false;
    if (d.client_id && !clients.find(c => c.id === d.client_id) && d.statut === 'brouillon' && !d.total_ttc) return false;
    return true;
  });
  const aucunDocument = documentsVisibles.length === 0;
  const sousTitreListe = aucunDocument ? undefined
    : `${documentsVisibles.length} document${documentsVisibles.length > 1 ? 's' : ''}${filterCounts.a_traiter_tous ? ` · ${filterCounts.a_traiter_tous} à traiter` : ''}`;
  const manquesProfil = profilManquant(entreprise).map((m) => m.libelle);
  return (
    <div className="space-y-3">
      {/* ========== EN-TÊTE ========== */}
      <PageHeader
        icon={FileText}
        isDark={isDark}
        color={couleur}
        subtitle={sousTitreListe}
        title={
          <span className="inline-flex items-center gap-2">
            Devis & Factures
            {complianceDismissed && manquesProfil.length > 0 && (
              <button
                type="button"
                onClick={() => setPage?.('settings')}
                aria-label={`Profil incomplet : ${manquesProfil.join(', ')}`}
                title={`Profil incomplet : ${manquesProfil.join(', ')}`}
                className="w-11 h-11 -my-2 inline-flex items-center justify-center rounded-full"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-alerte-point" aria-hidden="true" />
              </button>
            )}
          </span>
        }
        action={canPerform('devis', 'create') && !aucunDocument && (
        <div className="flex items-center gap-2">
        <div className="relative">
          <div className="flex items-stretch">
            <button
              onClick={ouvrirNouveauDevis}
              className="h-11 px-4 bg-accent text-sur-accent rounded-l-full text-sm font-semibold flex items-center gap-2 hover:brightness-95 transition-all"
            >
              <Plus size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Nouveau devis</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="h-11 pl-2 pr-3 bg-accent text-sur-accent rounded-r-full border-l border-sur-accent/20 hover:brightness-95 transition-all"
              aria-label="Options de création"
              aria-haspopup="true"
              aria-expanded={showCreateMenu}
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
          {/* Dropdown menu */}
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setShowCreateMenu(false)} />
              <div ref={createMenuRef} onKeyDown={(e) => { if (e.key === 'Escape') setShowCreateMenu(false); }} className="absolute right-0 mt-1 w-60 rounded-xl border shadow-e3 z-50 overflow-hidden bg-surface border-bord">
                <button
                  onClick={() => { setShowCreateMenu(false); setShowDevisExpressModal(true); }}
                  className="w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-surface-2"
                >
                  <Zap size={18} className="text-encre-3" aria-hidden="true" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Devis Express</p>
                    <p className="text-xs text-encre-3">3 clics, c'est chiffré</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); setEditingDevis(null); setShowDevisWizard(true); }}
                  className="w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left transition-colors border-t hover:bg-surface-2 border-bord"
                >
                  <Edit3 size={18} className="text-encre-3" aria-hidden="true" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Devis manuel</p>
                    <p className="text-xs text-encre-3">Création détaillée</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
        </div>
        )}
      />

      {/* RBAC: ReadOnly banner for view-only users */}
      {isViewOnly && <ReadOnlyBanner />}

      {/* Profil incomplet : une alerte calme et un bouton secondaire (audit UX du 20 oct. 2026 : bouton rouge plein,
          deuxième bouton plein de l'écran) ; masquable 7 jours, un point reste alors à côté du titre */}
      {!complianceDismissed && manquesProfil.length > 0 && (
        <div role="status" className="flex items-center gap-3 pl-4 pr-1 py-2 rounded-2xl bg-alerte-fond text-alerte-texte">
          <AlertTriangle size={18} className="flex-shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-0 text-sm">
            <span className="font-semibold">Profil incomplet</span>
            <span className="line-clamp-2 sm:inline sm:ml-1">{manquesProfil.join(', ')}</span>
          </p>
          {setPage && (
            <Bouton taille="compacte" variante="secondaire" onClick={() => setPage('settings')} className="flex-shrink-0">Compléter</Bouton>
          )}
          <BoutonIcone
            icone={X} libelle="Masquer pendant 7 jours" taille={18} className="text-alerte-texte hover:bg-transparent"
            onClick={() => { setComplianceDismissed(true); try { localStorage.setItem('cp_devis_banner_dismissed', new Date().toISOString()); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}
          />
        </div>
      )}

      {/* Deux tuiles qui filtrent la liste (audit UX du 20 oct. 2026) : mêmes définitions et même forme qu'à l'Accueil
          (valeur = montant, contexte = nombre). Aucune tuile tant qu'il n'y a aucun document. */}
      {!aucunDocument && (() => {
        const ouvertes = documentsVisibles.filter(d => estOuverte(d, paiements));
        const enRetard = ouvertes.filter(f => estEnRetard(f, paiements));
        const devisEnvoyes = documentsVisibles.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut));
        const cache = (v) => (!canViewPrices ? '—' : modeDiscret ? '···' : v);
        const basculer = (cle) => setFilter(f => (f === cle ? 'all' : cle));
        return (
          <div className="bandeau-chiffres grid grid-cols-2 gap-3 sm:gap-4">
            <TuileChiffre
              libelle="À encaisser"
              valeur={cache(fmtMoney(ouvertes.reduce((s, f) => s + resteAPayer(f, paiements), 0), 0))}
              alerte={enRetard.length > 0 ? `${ouvertes.length} facture${ouvertes.length > 1 ? 's' : ''}, dont ${enRetard.length} en retard` : undefined}
              contexte={`${ouvertes.length} facture${ouvertes.length > 1 ? 's' : ''}`}
              onClick={() => basculer('a_encaisser')} actif={filter === 'a_encaisser'}
            />
            <TuileChiffre
              libelle="Devis en attente"
              valeur={cache(fmtMoney(devisEnvoyes.reduce((s, d) => s + (d.total_ttc || 0), 0), 0))}
              contexte={`${devisEnvoyes.length} envoyé${devisEnvoyes.length > 1 ? 's' : ''}`}
              onClick={() => basculer('devis_attente')} actif={filter === 'devis_attente'}
            />
          </div>
        );
      })()}

      {/* === BANDEAU RELANCES DU JOUR : confirmées avant de partir (audit UX du 20 oct. 2026, § 2.6) === */}
      {relances.isEnabled && relances.counts.due > 0 && (
        <div className="rounded-2xl border border-bord bg-surface shadow-e1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-alerte-fond text-alerte-texte" aria-hidden="true">
              <BellRing size={18} />
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${textPrimary}`}>
                {relances.counts.due} relance{relances.counts.due > 1 ? 's' : ''} à envoyer aujourd'hui
              </p>
              <p className="text-sm text-encre-3">
                {canViewPrices
                  ? `${formatMoney(relances.totalAtRisk)} en attente de règlement ou de réponse`
                  : 'Documents en attente de suivi'}
              </p>
            </div>
          </div>
          <Bouton
            variante="secondaire" icone={Send} chargement={actionLoading === 'bulk-relance'} className="flex-shrink-0"
            onClick={async () => {
              if (actionLoading) return;
              // L'envoi groupé part par lots (relanceEngine, RELANCES_PAR_ENVOI) : annoncer ce qui partira vraiment
              const PAR_ENVOI = RELANCES_PAR_ENVOI;
              const partent = (relances.dueNow || []).slice(0, PAR_ENVOI);
              const nombre = Math.min(relances.counts.due, PAR_ENVOI);
              const noms = [...new Set(partent.map(p => formatClientName(p.client, '') || p.doc?.client_nom).filter(Boolean))];
              const ok = await confirm({
                title: `Envoyer ${nombre} relance${nombre > 1 ? 's' : ''} ?`,
                message: `Par e-mail${noms.length ? `, à : ${noms.join(', ')}` : ''}.${relances.counts.due > PAR_ENVOI ? ` Les relances partent par ${PAR_ENVOI} : il en restera ${relances.counts.due - PAR_ENVOI} à envoyer ensuite.` : ''}`,
              });
              if (!ok) return;
              setActionLoading('bulk-relance');
              try {
                const res = await relances.sendBulkRelances();
                if (res.sent > 0) {
                  showToast(
                    `${res.sent} relance${res.sent > 1 ? 's' : ''} envoyée${res.sent > 1 ? 's' : ''}${res.failed ? ` — ${res.failed} échec${res.failed > 1 ? 's' : ''}` : ''}`,
                    res.failed ? 'warning' : 'success'
                  );
                } else if (res.failed > 0) {
                  showToast(`Échec de ${res.failed} relance${res.failed > 1 ? 's' : ''}`, 'error');
                } else {
                  showToast('Aucune relance à envoyer', 'info');
                }
              } catch {
                showToast("Erreur lors de l'envoi des relances", 'error');
              } finally {
                setActionLoading(null);
              }
            }}
          >
            Tout envoyer
          </Bouton>
        </div>
      )}

      {/* === RECHERCHE, FILTRES, TRI — boîte à outils commune (ui/Filtres.jsx) ===
          Puces : l'état seulement ; la nature du document (devis, facture, avoir…) est dans « Filtres ». */}
      {!aucunDocument && (() => {
        const PERIODES = [['all', 'Tout'], ['month', 'Ce mois'], ['quarter', 'Ce trimestre'], ['year', 'Cette année']];
        const TRIS = [['recent', 'Plus récents'], ['status', 'Par statut'], ['amount', 'Par montant']];
        const VUES = [['cards', 'Liste', LayoutGrid], ['table', 'Tableau', List], ['pipeline', 'Colonnes', Kanban]];
        const NATURES = [['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['acomptes', 'Acomptes'], ['situations', 'Situations'], ['avoirs', 'Avoirs']];
        const nomClient = (c) => (c ? (c.prenom ? `${c.prenom} ${c.nom}` : c.nom) : '');
        const clientChoisi = clients.find(c => c.id === clientFilter);
        const chantierChoisi = chantiers.find(c => c.id === chantierFilter);
        const nbFiltres = (nature !== 'all') + (periodFilter !== 'all') + !!clientFilter + !!chantierFilter;
        const toutEffacer = () => { setNature('all'); setPeriodFilter('all'); setClientFilter(''); setChantierFilter(''); setSelectedIds(new Set()); };
        const puces = [
          nature !== 'all' && { cle: 'nature', libelle: NATURES.find(x => x[0] === nature)?.[1], onRetirer: () => setNature('all') },
          periodFilter !== 'all' && { cle: 'periode', libelle: PERIODES.find(x => x[0] === periodFilter)?.[1], onRetirer: () => setPeriodFilter('all') },
          clientFilter && { cle: 'client', libelle: nomClient(clientChoisi) || 'Client', onRetirer: () => { setClientFilter(''); setSelectedIds(new Set()); } },
          chantierFilter && { cle: 'chantier', libelle: chantierChoisi?.nom || 'Chantier', onRetirer: () => { setChantierFilter(''); setSelectedIds(new Set()); } },
        ].filter(Boolean);
        const ETATS = [
          ['all', 'Tous'], ['a_traiter', 'À traiter', Bell], ['attente', 'En attente'], ['brouillons', 'Brouillons'], ['payes', 'Payés'],
          ...(relances.isEnabled && relances.counts.total > 0 ? [['en_relance', 'En relance', BellRing]] : []),
        ];
        const etatsOptions = ETATS
          .map(([valeur, libelle, icone]) => ({ valeur, libelle, icone, compte: valeur === 'en_relance' ? relances.counts.total : (filterCounts[valeur] || 0) }));
        const naturesOptions = NATURES
          .map(([valeur, libelle]) => ({ valeur, libelle, compte: valeur === 'all' ? filterCounts.natures_tous : (filterCounts[valeur] || 0) }))
          .filter(o => o.valeur === 'all' || o.valeur === nature || o.compte > 0);
        const boutonSecondaire = `h-11 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 text-encre-2 hover:bg-surface-2`;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ChampRecherche valeur={search} onChange={setSearch} placeholder="Rechercher…" ariaLabel="Rechercher un document" isDark={isDark} couleur={couleur} className="flex-1" />
              <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={nbFiltres} ouvert={volet === 'filtres'} onClick={() => setVolet(v => (v === 'filtres' ? null : 'filtres'))} isDark={isDark} couleur={couleur} libelleCacheTelephone />
              <BoutonVolet ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={TRIS.find(x => x[0] === sortBy)?.[1]} ouvert={volet === 'tri'} onClick={() => setVolet(v => (v === 'tri' ? null : 'tri'))} isDark={isDark} couleur={couleur} libelleCacheTelephone />
            </div>
            <SegmentDefilant ariaLabel="État du document" options={etatsOptions} valeur={['a_encaisser', 'devis_attente'].includes(filter) ? null : filter} onChange={setFilter} isDark={isDark} couleur={couleur} />
            <PucesActives puces={puces} onToutEffacer={toutEffacer} isDark={isDark} couleur={couleur} />

            <Volet
              ouvert={volet === 'filtres'} onFermer={() => setVolet(null)} titre="Filtres" ancreRef={boutonFiltresRef} isDark={isDark}
              pied={(
                <>
                  <button type="button" onClick={toutEffacer} disabled={!nbFiltres} className={boutonSecondaire}>Tout effacer</button>
                  <button type="button" onClick={() => setVolet(null)} className="flex-1 h-11 rounded-full text-sm font-bold shadow-sm bg-accent text-sur-accent">
                    Voir {filtered.length} document{filtered.length > 1 ? 's' : ''}
                  </button>
                </>
              )}
            >
              <GroupeChoix titre="Type de document" options={naturesOptions} valeur={nature} onChange={setNature} isDark={isDark} couleur={couleur} />
              <GroupeChoix titre="Période" options={PERIODES.map(([valeur, libelle]) => ({ valeur, libelle }))} valeur={periodFilter} onChange={setPeriodFilter} isDark={isDark} couleur={couleur} />
              <ListeChoix
                titre="Client" placeholder="Rechercher un client" isDark={isDark} couleur={couleur}
                options={[{ valeur: '', libelle: 'Tous les clients', toujours: true }, ...clients.filter(c => c.nom).sort((a, b) => nomClient(a).localeCompare(nomClient(b), 'fr')).map(c => ({ valeur: c.id, libelle: nomClient(c), detail: c.entreprise || undefined }))]}
                valeur={clientFilter} onChange={(v) => { setClientFilter(v); setSelectedIds(new Set()); }}
              />
              <ListeChoix
                titre="Chantier" placeholder="Rechercher un chantier" isDark={isDark} couleur={couleur}
                options={[{ valeur: '', libelle: 'Tous les chantiers', toujours: true }, ...[...chantiers].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr')).map(c => ({ valeur: c.id, libelle: c.nom || 'Sans nom', detail: c.adresse || undefined }))]}
                valeur={chantierFilter} onChange={(v) => { setChantierFilter(v); setSelectedIds(new Set()); }}
              />
            </Volet>

            <Volet ouvert={volet === 'tri'} onFermer={() => setVolet(null)} titre="Trier et afficher" ancreRef={boutonTriRef} largeur={340} isDark={isDark}>
              <ListeChoix titre="Trier par" rechercheAuDela={99} options={TRIS.map(([valeur, libelle]) => ({ valeur, libelle }))} valeur={sortBy} onChange={(v) => { setSortBy(v); setVolet(null); }} isDark={isDark} couleur={couleur} />
              <GroupeChoix titre="Affichage" options={VUES.map(([valeur, libelle, icone]) => ({ valeur, libelle, icone }))} valeur={viewMode} onChange={(v) => { setViewMode(v); setVolet(null); }} isDark={isDark} couleur={couleur} />
              {filtered.length > 0 && (
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-encre-3">Exporter les {filtered.length} documents affichés</legend>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { exportCSV(filtered); setVolet(null); }} className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-full border text-sm font-medium border-bord text-encre-2 hover:bg-surface-2">
                      <Download size={15} aria-hidden="true" /> Tableur (CSV)
                    </button>
                    <button type="button" onClick={() => { batchExportPDF(filtered); setVolet(null); }} disabled={actionLoading === 'batch'} className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-full border text-sm font-medium disabled:opacity-50 border-bord text-encre-2 hover:bg-surface-2">
                      {actionLoading === 'batch' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />} PDF
                    </button>
                  </div>
                </fieldset>
              )}
            </Volet>
          </div>
        );
      })()}
      {filtered.length === 0 ? (
        // États vides (audit UX du 20 oct. 2026, § 2.7) : une icône neutre, un titre, une phrase, une action. Avant : un
        // grand encart orange, une liste d'arguments et deux boutons pleins.
        aucunDocument ? (
          <EtatVide
            icone={FileText}
            titre="Aucun devis pour l'instant"
            texte="Chiffrez votre premier devis : vous le transformerez en facture une fois signé."
            action={canPerform('devis', 'create') ? <Bouton variante="principal" icone={Plus} onClick={ouvrirNouveauDevis}>Créer mon premier devis</Bouton> : null}
          />
        ) : (
          <EtatVide
            icone={Search}
            titre="Aucun document"
            texte={search ? 'Rien ne correspond à cette recherche.' : 'Aucun document ne correspond à ces filtres.'}
            action={<Bouton variante="secondaire" onClick={() => { setSearch(''); setFilter('all'); setNature('all'); setPeriodFilter('all'); setClientFilter(''); setChantierFilter(''); }}>{search ? 'Effacer la recherche' : 'Effacer les filtres'}</Bouton>}
          />
        )
      ) : viewMode === 'pipeline' ? (
        /* ========== PIPELINE VIEW (Kanban) ========== */
        <div>
          {/* Barre de répartition : les tons des statuts (src/lib/statuts.js), 12 px au moins */}
          {(() => {
            const pipelineStatuses = [
              { id: 'brouillon', label: 'Brouillon', point: 'bg-neutre-point' },
              { id: 'envoye', label: 'Envoyé', point: 'bg-info-point' },
              { id: 'accepte', label: 'Signé', point: 'bg-succes-point' },
              { id: 'facture', label: 'Facturé', point: 'bg-encre-3' },
              { id: 'refuse', label: 'Refusé', point: 'bg-danger-point' },
            ];
            const devisOnly = devis.filter(d => d.type === 'devis');
            const total = devisOnly.length || 1;
            const pipeline = pipelineStatuses.map(s => ({
              ...s,
              count: devisOnly.filter(d => s.id === 'accepte' ? ['accepte', 'signe', 'acompte_facture'].includes(d.statut) : s.id === 'envoye' ? ['envoye', 'vu'].includes(d.statut) : s.id === 'facture' ? d.statut === 'facture' : d.statut === s.id).length,
            })).map(s => ({ ...s, pct: Math.max((s.count / total) * 100, s.count > 0 ? 2 : 0) }));
            return (
              <div className="mb-4">
                <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
                  {pipeline.map(col => col.pct > 0 && (
                    <div key={col.id} title={`${col.label}: ${col.count}`} style={{ width: `${col.pct}%` }} className={`transition-all duration-300 ${col.point}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-between mt-1.5">
                  {pipeline.filter(p => p.count > 0).map(p => (
                    <span key={p.id} className="text-xs text-encre-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full inline-block ${p.point}`} aria-hidden="true" />
                      {p.label} ({p.count})
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-bord border-t-accent rounded-full animate-spin" /></div>}>
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
            <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2 rounded-xl mb-2 bg-surface-2 border border-bord">
              <span className={`text-sm font-semibold ${textPrimary}`}>{selectedIds.size} élément{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
              <div className="flex-1" />
              <Bouton taille="compacte" variante="secondaire" icone={Download} onClick={() => batchExportPDF(filtered.filter(d => selectedIds.has(d.id)))}>Exporter PDF</Bouton>
              {!isViewOnly && canPerform('devis', 'delete') && (
                <Bouton taille="compacte" variante="discret" icone={Trash2} className="text-danger-texte hover:text-danger-texte" onClick={async () => {
                  const choisis = devis.filter(d => selectedIds.has(d.id));
                  const supprimables = choisis.filter(d => peutSupprimerDocument(d, devis));
                  const exclus = choisis.length - supprimables.length;
                  if (supprimables.length === 0) {
                    showToast('Factures émises et devis facturés ne se suppriment pas : faites un avoir.', 'error');
                    return;
                  }
                  const ok = await confirm(`Supprimer ${supprimables.length} document${supprimables.length > 1 ? 's' : ''} ?${exclus ? ` (${exclus} facture${exclus > 1 ? 's' : ''} émise${exclus > 1 ? 's' : ''} ou devis facturé${exclus > 1 ? 's' : ''} ne ${exclus > 1 ? 'seront' : 'sera'} pas supprimé${exclus > 1 ? 's' : ''})` : ''}`);
                  if (ok) {
                    let faits = 0;
                    for (const d of supprimables) { if (await onDelete(d.id)) faits++; }
                    setSelectedIds(new Set());
                    if (faits) showToast(`${faits} document${faits > 1 ? 's' : ''} supprimé${faits > 1 ? 's' : ''}`, 'success');
                  }
                }}>Supprimer</Bouton>
              )}
              <BoutonIcone icone={X} libelle="Annuler la sélection" taille={16} onClick={() => setSelectedIds(new Set())} />
            </div>
          )}
        <div className={`${cardBg} rounded-2xl border overflow-hidden shadow-e1`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-fond">
                  <th className="px-2 py-2.5 w-8">
                    <input type="checkbox" aria-label="Tout sélectionner" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={() => toggleSelectAll(filtered)} className="w-4 h-4 rounded border-bord-fort cursor-pointer" />
                  </th>
                  {[
                    { key: 'numero', label: 'N°' },
                    { key: 'client', label: 'Client' },
                    { key: 'date', label: 'Date' },
                    { key: 'montant', label: isMicro ? 'Montant' : 'Montant TTC' },
                    { key: 'statut', label: 'Statut' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleTableSort(col.key)}
                      aria-sort={tableSortBy === col.key ? (tableSortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`px-3 py-2.5 text-left text-xs font-semibold cursor-pointer select-none transition-colors text-encre-3 hover:text-encre-2 ${col.key === 'montant' ? 'text-right' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {tableSortBy === col.key ? (
                          tableSortDir === 'asc' ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" aria-hidden="true" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-encre-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bord">
                {getTableSorted(filtered).map((d) => {
                  const client = clients.find(c => c.id === d.client_id);
                  const clientName = cleanClientName(client) || d.client_nom || '—';
                  const statutVu = d.type === 'facture' && d.facture_type !== 'avoir' ? statutFacture(d, paiements) : d.statut;
                  const isAvoirItem = d.facture_type === 'avoir';
                  const TypeIcone = isAvoirItem ? RotateCcw : d.type === 'facture' ? Receipt : FileText;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => { setSelected(d); setMode('preview'); }}
                      className="cursor-pointer transition-colors bg-surface hover:bg-surface-2"
                    >
                      <td className="px-2 py-2.5 w-8">
                        <input type="checkbox" aria-label={`Sélectionner ${cleanNumero(d.numero)}`} checked={selectedIds.has(d.id)} onChange={(e) => { e.stopPropagation(); toggleSelectId(d.id); }} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-bord-fort cursor-pointer" />
                      </td>
                      <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${textPrimary}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <TypeIcone size={14} className="text-encre-3" aria-hidden="true" />
                          {cleanNumero(d.numero)}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 truncate max-w-[200px] ${textSecondary}`}>
                        {clientName}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-encre-3">
                        {dateLue(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`px-3 py-2.5 font-semibold text-right whitespace-nowrap tabular-nums ${isAvoirItem ? 'text-danger-texte' : 'text-encre'}`}>
                        {!canViewPrices ? '—' : modeDiscret ? '···' : isAvoirItem ? `-${formatMoney(Math.abs(getDevisTTC(d)))}` : formatMoney(getDevisTTC(d))}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <PastilleStatut genre={d.type === 'facture' && !isAvoirItem ? 'facture' : 'devis'} statut={statutVu} />
                          {d.statut === 'envoye' && (() => {
                            const daysSent = getDaysSinceSent(d);
                            if (daysSent < 7) return null;
                            return (
                              <span className="text-xs font-medium text-alerte-texte flex items-center gap-1 whitespace-nowrap">
                                <Clock size={12} aria-hidden="true" /> J+{daysSent}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-1 text-right">
                        <div className="flex items-center justify-end">
                          {!isViewOnly && canPerform('devis', 'edit') && peutModifierDocument(d, devis) && (
                            <BoutonIcone icone={Edit3} libelle={`Modifier ${cleanNumero(d.numero)}`} taille={16} onClick={(e) => { e.stopPropagation(); openEditor(d); }} />
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
        // Une liste groupée (audit UX du 20 oct. 2026, § 2.4) : au bureau, l'action rapide passe sur la ligne du montant,
        // environ dix documents par écran au lieu de six cartes séparées ; même largeur que les tuiles au-dessus.
        <GroupeListe>{filtered.map(d => {
          const client = clients.find(c => c.id === d.client_id);
          const chantier = chantiers.find(ch => ch.id === d.chantier_id);
          const statutVu = d.type === 'facture' && d.facture_type !== 'avoir' ? statutFacture(d, paiements) : d.statut;

          // Attente d'un devis envoyé : à partir de 7 jours, dite sous la ligne
          const getFollowUpInfo = () => {
            if (!['envoye', 'vu'].includes(d.statut) || d.type !== 'devis') return null;
            // Depuis l'envoi, comme l'alerte de la fiche (avant : depuis la dernière modification, remise à zéro par un rien)
            const daysSent = getDaysSinceSent(d);
            if (daysSent >= 14) return { texte: `${daysSent} j sans réponse`, ton: 'text-danger-texte' };
            if (daysSent >= 7) return { texte: `${daysSent} j en attente`, ton: 'text-alerte-texte' };
            return null;
          };
          const followUp = getFollowUpInfo();

          const isAvoirItem = d.facture_type === 'avoir';
          const isSituationItem = d.facture_type === 'situation';

          // Action rapide selon l'état (droits compris) : un libellé fait ce qu'il dit (audit UX du 20 oct. 2026)
          const getQuickAction = () => {
            if (isViewOnly) return null; // No actions for view-only roles
            // Un avoir ne s'encaisse pas et ne se « complète » pas (montant négatif) : sa fiche suffit (recette du 9 oct.)
            if (isAvoirItem) return null;
            if (d.statut === 'brouillon' && getDevisTTC(d) > 0 && canPerform('devis', 'send')) return { label: 'Envoyer', Icon: Send, fn: (e) => { e.stopPropagation(); trySend(d, sendEmail); } };
            if (d.statut === 'brouillon' && getDevisTTC(d) <= 0 && canPerform('devis', 'edit')) return { label: 'Compléter', Icon: Edit3, fn: (e) => { e.stopPropagation(); openEditor(d); } };
            if (d.type === 'devis' && ['envoye', 'vu'].includes(d.statut) && isExpired(d) && canPerform('devis', 'edit') && peutModifierDocument(d, devis)) return { label: 'Prolonger', Icon: Edit3, fn: (e) => { e.stopPropagation(); openEditor(d); } };
            if (d.type === 'devis' && ['envoye', 'vu'].includes(d.statut) && !isExpired(d) && canPerform('devis', 'send')) return { label: 'Relancer', Icon: Mail, fn: (e) => { e.stopPropagation(); setRelanceDe(d); } };
            if ((d.statut === 'accepte' || d.statut === 'signe') && d.type === 'devis') {
              // Même règle que la fiche (facturationDe) : rien à proposer pour un devis déjà facturé ou facturé par situations
              const f = facturationDe(d);
              if ((f.canAcompte || f.canFacturer) && !f.facturationParSituations) return { label: 'Facturer', Icon: Receipt, fn: (e) => { e.stopPropagation(); setSelected(d); setMode('preview'); setChoixFacturation(true); } };
            }
            if (d.type === 'facture' && !['payee', 'annulee', 'brouillon'].includes(statutVu)) return { label: 'Encaisser', Icon: CreditCard, fn: (e) => { e.stopPropagation(); setSelected(d); setMode('preview'); setShowPaymentModal(true); } };
            if (d.statut === 'refuse' && canPerform('devis', 'create')) return { label: 'Dupliquer', Icon: Copy, fn: (e) => { e.stopPropagation(); duplicateDocument(d); } };
            return null;
          };
          const qa = getQuickAction();

          // Client display
          const clientName = cleanClientName(client) || d.client_nom || '';
          const isOrphan = !d.client_id || (d.client_id && !client);
          const isNameless = client && !clientName;

          // Ligne de liste : client et montant, puis « type · n° · date · objet » (le plus distinctif d'abord : au
          // téléphone, la troncature coupe l'objet, plus la nature du document) et UNE pastille ; dessous, seulement si une
          // action est due, l'urgence et un bouton libellé.
          const typeDoc = isAvoirItem ? 'Avoir'
            : d.facture_type === 'acompte' ? `Acompte${d.acompte_pct ? ` ${d.acompte_pct} %` : ''}`
            : d.facture_type === 'solde' ? 'Solde'
            : isSituationItem ? `Situation${d.situation_numero ? ` n° ${d.situation_numero}` : ''}`
            : d.is_avenant ? `Avenant ${d.avenant_numero || ''}`.trim()
            : d.type === 'facture' ? 'Facture' : 'Devis';
          const meta = [typeDoc, cleanNumero(d.numero), dateLue(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), d.objet || chantier?.nom].filter(Boolean).join(' · ');
          const genrePastille = d.type === 'facture' && !isAvoirItem ? 'facture' : 'devis';
          const statutPastille = d.type === 'devis' && isExpired(d) && ['envoye', 'vu'].includes(d.statut) ? 'expire' : statutVu;
          const relanceAuto = relances.getDocumentPending(d.id);
          const urgence = statutVu === 'en_retard'
            ? { texte: 'Échéance dépassée', ton: 'text-danger-texte' }
            : followUp
              ? followUp
              : relanceAuto
                ? { texte: relanceAuto.nextStep?.isDue ? 'Relance à envoyer' : `Relance auto ${relanceAuto.nextStep?.step?.name || ''}`.trim(), ton: relanceAuto.nextStep?.isDue ? 'text-alerte-texte' : 'text-encre-3' }
                : (isOrphan || isNameless) && d.statut === 'brouillon' ? { texte: 'Client à renseigner', ton: 'text-alerte-texte' } : null;
          const montantCarte = !canViewPrices ? null : modeDiscret ? '···'
            : isAvoirItem ? `-${formatMoney(Math.abs(getDevisTTC(d)))}`
            : getDevisTTC(d) <= 0 ? '0 €' : formatMoney(getDevisTTC(d));
          const ouvrir = () => { setSelected(d); setMode('preview'); };
          return (
            <LigneListe
              key={d.id}
              onClick={ouvrir}
              piedEnLigne
              aria-label={`Ouvrir ${d.numero || (d.type === 'facture' ? 'la facture' : 'le devis')}`}
              titre={(isOrphan || isNameless) ? <span className="text-alerte-texte">{isOrphan ? 'Aucun client' : 'Client sans nom'}</span> : clientName}
              montant={montantCarte}
              meta={meta}
              pastille={<PastilleStatut genre={genrePastille} statut={statutPastille} />}
              pied={qa || urgence ? (
                <>
                  <span className={`text-sm font-medium truncate ${urgence?.ton || ''}`}>{urgence?.texte || ''}</span>
                  {qa ? (
                    <Bouton taille="compacte" variante="secondaire" icone={qa.Icon} onClick={qa.fn} className="flex-shrink-0">{qa.label}</Bouton>
                  ) : (isOrphan || isNameless) ? (
                    <Bouton taille="compacte" variante="secondaire" onClick={() => setAssigningClientDevisId(d.id)} className="flex-shrink-0">Assigner</Bouton>
                  ) : null}
                </>
              ) : null}
            />
          );
        })}</GroupeListe>
      )}
      <Snackbar />

      {fenetreAssigner}
      {fenetreApercu}
      {feuilleRelance}
      {fenetresEnvoi}

      <CorrectionEncaissementModal
        paiement={correctionDe?.paiement || null}
        max={correctionDe?.max || 0}
        reste={selected ? resteSigne(selected, paiements) : 0}
        onConfirmer={(montant, motif) => corrigerEncaissement(correctionDe.paiement, montant, motif)}
        onClose={() => setCorrectionDe(null)}
        isDark={isDark}
      />
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        document={selected}
        client={selected ? clients.find(c => c.id === selected.client_id) : null}
        entreprise={entreprise}
        resteDu={selected?.type === 'facture' ? resteAPayer(selected, paiements) : undefined}
        paiementBloque={raisonSeptJours(septJoursDe(selected))}
        onPaymentCreated={handlePaymentCreated}
        isDark={isDark}
        couleur={couleur}
      />

      {fenetreModele}

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
      {/* Devis Composer - nouveau parcours single-canvas (shared with preview mode) */}
      {devisComposerElement}

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
        tvaDefaut={tauxTvaParDefaut(entreprise)}
        franchise={isMicro}
        onClose={() => setShowDevisExpressModal(false)}
        onCreateDevis={async (devisData) => {
          const numero = await generateNumero(devisData.type || 'devis');
          const client = clients.find(c => c.id === devisData.client_id);
          const newDevis = await onSubmit({
            ...devisData,
            numero,
            client_nom: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
            ...totauxEnregistres(devisData.lignes, { remise: devisData.remise, tauxDefaut: devisData.tvaRate }),
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
        customTemplates={ctxTemplates}
        recentTemplates={enrichedRecentTemplates}
        onTrackUsage={trackTemplateUsage}
      />
    </div>
  );
}

// ── Devis Historique tab (extracted sub-component) ──
function DevisHistoriqueTab({ selected, facturesLiees, isDark, couleur, modeDiscret }) {
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
