import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, ArrowLeft, Phone, MessageCircle, MapPin, Mail, Building2, Edit3, Trash2, ChevronRight, ChevronDown, Search, X, Check, FileText, Camera, Home, Users, Euro, ExternalLink, Smartphone, ArrowUpDown, MessageSquare, Zap, History, Receipt, ClipboardList, CheckCircle2, Upload, LayoutGrid, List, AlertTriangle, Info, Clock, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import KPICard from './ui/KPICard';
import { ChampRecherche, BoutonVolet, Volet, GroupeChoix, ListeChoix, PucesActives, SegmentDefilant } from './ui/Filtres';
import LigneListe, { Avatar, GroupeListe } from './ui/LigneListe';
import Pastille, { PastilleStatut } from './ui/Pastille';
import { Bouton, BoutonIcone } from './ui/Bouton';
import Carte from './ui/Carte';
import { Onglets } from './ui/Onglets';
import EtatVide from './ui/EtatVide';
import { statutFacture, resteAPayer, dejaPaye, dateLocale } from '../lib/paiementsFacture';
import { ouvrirLienExterne } from '../lib/natif';
import { colorForString } from '../lib/uiTheme';

import QuickClientModal from './QuickClientModal';
import { useConfirm, useToast } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useDebounce } from '../hooks/useDebounce';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { pickContacts, isContactPickerSupported } from '../lib/contactPicker';
import { useFormValidation, clientSchema } from '../lib/validation';
import FormError from './ui/FormError';
import AuditTimeline from './audit/AuditTimeline';
import { getEntityHistory, getEntitiesHistory } from '../lib/auditService';
import supabase, { isDemo } from '../supabaseClient';
import { generatePortalToken, sendPortalInvite } from '../services/portalService';
import { CLIENT_TYPE_COLORS, CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, CLIENT_TYPES, DEVIS_EN_ATTENTE } from '../lib/constants';
import { formatClientName, formatMoney as fmtMoney } from '../lib/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { ReadOnlyBanner } from './ui/PermissionGate';
import { urlPublique } from '../lib/urlPublique';

// Skeleton loader for client cards
function ClientSkeleton({ isDark, count = 6 }) {
  const bg = 'bg-bord';
  const cardBg = 'bg-surface border-bord';
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden animate-pulse`}>
          <div className="p-4">
            <div className="flex gap-3">
              <div className={`w-12 h-12 rounded-full ${bg}`} />
              <div className="flex-1 space-y-2 pt-1">
                <div className={`h-4 ${bg} rounded w-3/4`} />
                <div className={`h-3 ${bg} rounded w-1/2`} />
                <div className="flex gap-1.5">
                  <div className={`h-5 ${bg} rounded-full w-14`} />
                  <div className={`h-5 ${bg} rounded-full w-16`} />
                </div>
              </div>
            </div>
          </div>
          <div className={`px-4 py-2.5 border-t border-bord`}>
            <div className={`h-4 ${bg} rounded w-2/3`} />
          </div>
          <div className={`px-4 py-2.5 border-t border-bord`}>
            <div className="flex justify-between">
              <div className="flex gap-3">
                <div className={`h-4 ${bg} rounded w-8`} />
                <div className={`h-4 ${bg} rounded w-8`} />
              </div>
              <div className={`h-4 ${bg} rounded w-16`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// P2.2: Highlight matching search terms
function HighlightText({ text, query, className = '' }) {
  if (!text || !query || query.length < 2) return <span className={className}>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-400/80 text-white rounded px-0.5">{part}</mark>
          : part
      )}
    </span>
  );
}

export default function Clients({ clients, setClients, updateClient, deleteClient: deleteClientProp, devis, chantiers, echanges = [], onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark, createMode, setCreateMode, modeDiscret, memos = [], addMemo, updateMemo, deleteMemo, toggleMemo, onImportClients, entreprise, nouveauDevisPour, nouveauChantierPour }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { addClient: ctxAddClient, paiements = [] } = useData();

  // Ce que chaque client doit (reste des factures ouvertes) et son dernier devis — pour la ligne de liste.
  const dueParClient = useMemo(() => {
    const m = new Map();
    (devis || []).forEach(d => {
      if (d.type !== 'facture' || d.facture_type === 'avoir' || !d.client_id) return;
      if (['payee', 'brouillon', 'annulee'].includes(statutFacture(d, paiements))) return;
      m.set(d.client_id, (m.get(d.client_id) || 0) + resteAPayer(d, paiements));
    });
    return m;
  }, [devis, paiements]);
  const dernierDevisParClient = useMemo(() => {
    const m = new Map();
    (devis || []).forEach(d => {
      if (d.type !== 'devis' || !d.client_id || !d.date) return;
      if (!m.has(d.client_id) || d.date > m.get(d.client_id)) m.set(d.client_id, d.date);
    });
    return m;
  }, [devis]);
  // « 12 rue des Lilas, 75011 Paris » → « Paris »
  const villeDe = (adresse) => (String(adresse || '').match(/\b\d{5}\s+([^,\n]+)\s*$/) || [])[1]?.trim() || '';
  const { errors, validate, validateAll, clearErrors, clearFieldError } = useFormValidation(clientSchema);
  const [showDupeConfirm, setShowDupeConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const contactPickerOk = isContactPickerSupported();

  // Import en masse depuis le répertoire téléphone (dédup + un seul toast récap)
  const handleImportFromContacts = async () => {
    setImportingContacts(true);
    try {
      const picked = await pickContacts({ multiple: true });
      if (!picked.length) return;
      const digits = (p) => (p || '').replace(/\D/g, '');
      const phones = new Set((clients || []).map(c => digits(c.telephone)).filter(Boolean));
      const emails = new Set((clients || []).map(c => (c.email || '').toLowerCase()).filter(Boolean));
      let added = 0, skipped = 0;
      for (const c of picked) {
        const ph = digits(c.telephone), em = (c.email || '').toLowerCase();
        if ((ph && phones.has(ph)) || (em && emails.has(em))) { skipped++; continue; }
        await ctxAddClient({ ...c, categorie: 'Particulier' });
        if (ph) phones.add(ph);
        if (em) emails.add(em);
        added++;
      }
      if (added > 0) {
        showToast(`${added} contact${added > 1 ? 's' : ''} importé${added > 1 ? 's' : ''}${skipped ? ` · ${skipped} déjà présent${skipped > 1 ? 's' : ''}` : ''}`, 'success');
      } else {
        showToast('Ces contacts sont déjà dans vos clients', 'info');
      }
    } catch {
      // Annulation utilisateur → silencieux
    } finally {
      setImportingContacts(false);
    }
  };

  // RBAC permissions
  const { canPerform, canEditData } = usePermissions();
  const isViewOnly = !canEditData;

  // Format money with modeDiscret support
  // Montants au format français : centimes seulement s'il y en a (« 2 337,50 € », plus « 2 337,5 € ») ;
  // arrondis à l'euro dans les tuiles de chiffres (d = 0).
  const formatMoney = (n, d) => modeDiscret ? '·····' : fmtMoney(n || 0, d);

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  // Channel config for échanges multi-canal
  const CHANNEL_CONFIG = useMemo(() => ({
    email: { label: 'Email', icon: Mail, color: '#3b82f6', bg: 'bg-info-fond text-info-texte', btnBg: isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    sms: { label: 'SMS', icon: MessageCircle, color: '#22c55e', bg: 'bg-succes-fond text-succes-texte', btnBg: isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-600 hover:bg-green-100' },
    whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#25d366', bg: 'bg-succes-fond text-succes-texte', btnBg: isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    appel: { label: 'Appel', icon: Phone, color: '#8b5cf6', bg: isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600', btnBg: isDark ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' : 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    visite: { label: 'Visite', icon: MapPin, color: '#f97316', bg: isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600', btnBg: isDark ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50' : 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  }), [isDark]);

  // Type icons for categories
  const TYPE_ICONS = { 'Particulier': '👤', 'Professionnel': '🏢', 'Architecte': '🏗️', 'Promoteur': '🏘️', 'Syndic': '🏛️' };

  const [show, setShow] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [activeTab, setActiveTab] = useState('documents');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '', siret: '', tva_intra: '' });
  const [sortBy, setSortBy] = useState('recent'); // recent, name, ca, activite
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '' | 'actif' | 'en_devis' | 'prospect' | 'inactif'
  const [kpiFilter, setKpiFilter] = useState(null); // null | 'actifs' | 'ca' | 'devis_attente'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedEchange, setSelectedEchange] = useState(null); // P1.1: échange detail drawer
  // Recherche / Filtres / Trier : boîte à outils commune (ui/Filtres.jsx, recette du 9 oct.).
  const [volet, setVolet] = useState(null); // null | 'filtres' | 'tri'
  const boutonFiltresRef = useRef(null);
  const boutonTriRef = useRef(null);
  const [showFormTypePicker, setShowFormTypePicker] = useState(false); // P1.2: custom type picker (form)
  const [duplicateDismissed, setDuplicateDismissed] = useState(() => localStorage.getItem('clientDuplicateDismissed') === 'true');

  // Duplicate detection for form fields (telephone, email, nom)
  const { phoneDuplicates, emailDuplicates, strongDuplicates, checkField: checkDupeField, clearAll: clearDupes } = useDuplicateCheck(clients, editId, 300);

  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  // Escape key to close modals/views
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (selectedEchange) { setSelectedEchange(null); }
        else if (showFormTypePicker) { setShowFormTypePicker(false); }
        else if (show) { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' }); clearErrors(); clearDupes(); }
        else if (viewId) { setViewId(null); }
        else if (showQuickModal) { setShowQuickModal(false); }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, viewId, showQuickModal, selectedEchange, showFormTypePicker]);

  // Client stats map — MUST be defined before filtered/getClientStatus/getClientStats
  const clientStatsMap = useMemo(() => {
    const map = new Map();
    const empty = { devis: 0, factures: 0, ca: 0, caEnCours: 0, chantiers: 0, chantiersEnCours: 0, chantiersActifs: 0, devisActifs: 0 };
    (devis || []).forEach(d => {
      const cid = d.client_id;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, { ...empty });
      const s = map.get(cid);
      if (d.type === 'devis') s.devis++;
      if (d.type === 'facture') s.factures++;
      // D2 fix: CA encaissé = only paid factures
      if (d.type === 'facture' && d.statut === 'payee') {
        s.ca += d.total_ttc || d.montant_ttc || (d.total_ht ? d.total_ht * 1.2 : 0);
      }
      // CA en cours = factures envoyées + devis acceptés (pipeline)
      if ((d.type === 'facture' && d.statut !== 'payee') || (d.type === 'devis' && d.statut === 'accepte')) {
        s.caEnCours += d.total_ttc || d.montant_ttc || 0;
      }
      if (d.type === 'devis' && ['envoye', 'accepte', 'acompte_facture'].includes(d.statut)) s.devisActifs++;
    });
    (chantiers || []).forEach(ch => {
      const cid = ch.client_id || ch.clientId;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, { ...empty });
      const s = map.get(cid);
      s.chantiers++;
      if (ch.statut === 'en_cours') s.chantiersEnCours++;
      if (ch.statut !== 'archive' && ch.statut !== 'abandonne' && ch.statut !== 'termine') s.chantiersActifs++;
    });
    return map;
  }, [devis, chantiers]);

  const getClientStats = (id) => {
    return clientStatsMap.get(id) || { devis: 0, factures: 0, ca: 0, chantiers: 0, chantiersEnCours: 0, chantiersActifs: 0, devisActifs: 0 };
  };

  const getClientStatus = (clientId) => {
    const s = getClientStats(clientId);
    if (s.chantiersEnCours > 0) return 'actif';
    if (s.devisActifs > 0) return 'en_devis';
    const client = clients.find(c => c.id === clientId);
    if (client?.created_at) {
      const daysSinceCreation = (Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 90 && s.chantiers === 0 && s.devis === 0) return 'prospect';
    }
    if (s.chantiersActifs > 0 || s.devisActifs > 0) return 'actif';
    return 'inactif';
  };

  // Client scoring & classification
  const SCORE_CLASSES = {
    vip: { label: 'VIP', color: '#f59e0b', bg: 'bg-amber-100 text-amber-800', darkBg: 'bg-amber-900/30 text-amber-300', icon: '⭐' },
    regulier: { label: 'Régulier', color: '#3b82f6', bg: 'bg-blue-100 text-blue-800', darkBg: 'bg-blue-900/30 text-blue-300', icon: '🔄' },
    occasionnel: { label: 'Occasionnel', color: '#8b5cf6', bg: 'bg-violet-100 text-violet-700', darkBg: 'bg-violet-900/30 text-violet-300', icon: '👤' },
    nouveau: { label: 'Nouveau', color: '#22c55e', bg: 'bg-emerald-100 text-emerald-700', darkBg: 'bg-emerald-900/30 text-emerald-300', icon: '🆕' },
    dormant: { label: 'Dormant', color: '#94a3b8', bg: 'bg-slate-100 text-slate-600', darkBg: 'bg-slate-700/50 text-slate-400', icon: '💤' },
  };

  const getClientScore = (clientId) => {
    const s = getClientStats(clientId);
    const client = clients.find(c => c.id === clientId);
    const clientDevis = devis?.filter(d => d.client_id === clientId) || [];

    // Score computation (0-100)
    let score = 0;
    score += Math.min(s.chantiers * 15, 30); // max 30pts for chantiers
    score += Math.min(s.factures * 10, 20);   // max 20pts for factures
    score += Math.min(s.devis * 5, 15);       // max 15pts for devis
    score += s.ca >= 50000 ? 20 : s.ca >= 10000 ? 15 : s.ca >= 2000 ? 10 : s.ca > 0 ? 5 : 0; // CA pts
    score += s.chantiersActifs > 0 ? 10 : 0;  // active chantier bonus
    score += s.devisActifs > 0 ? 5 : 0;       // active devis bonus

    // Anciennete
    const anciennete = client?.created_at ? (Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0;

    // Last activity
    const lastDevisDate = clientDevis.length > 0 ? Math.max(...clientDevis.map(d => new Date(d.updated_at || d.created_at).getTime())) : 0;
    const joursSansActivite = lastDevisDate > 0 ? (Date.now() - lastDevisDate) / (1000 * 60 * 60 * 24) : 999;

    // Classification based on SCORE first
    let classification;
    if (score >= 70) classification = 'vip';
    else if (score >= 45) classification = 'regulier';
    else if (score >= 20) classification = 'occasionnel';
    else if (anciennete < 30 && clientDevis.length === 0) classification = 'nouveau';
    else if (joursSansActivite > 90 && score < 10) classification = 'dormant';
    else classification = 'nouveau';

    return { score: Math.min(score, 100), classification, ...SCORE_CLASSES[classification] };
  };

  // Duplicate detection: same telephone OR same email
  const duplicateMap = useMemo(() => {
    const map = new Map(); // clientId → [duplicate client ids]
    const byPhone = new Map(); // normalized phone → [client ids]
    const byEmail = new Map(); // normalized email → [client ids]

    clients.forEach(c => {
      const phone = c.telephone?.replace(/[\s.\-()]/g, '');
      if (phone && phone.length >= 6) {
        if (!byPhone.has(phone)) byPhone.set(phone, []);
        byPhone.get(phone).push(c.id);
      }
      const email = c.email?.toLowerCase().trim();
      if (email && email.includes('@')) {
        if (!byEmail.has(email)) byEmail.set(email, []);
        byEmail.get(email).push(c.id);
      }
    });

    // Build duplicate sets
    const processed = new Set();
    const addDuplicates = (ids) => {
      if (ids.length < 2) return;
      ids.forEach(id => {
        if (!map.has(id)) map.set(id, new Set());
        ids.forEach(otherId => {
          if (otherId !== id) map.get(id).add(otherId);
        });
      });
    };

    byPhone.forEach((ids) => addDuplicates(ids));
    byEmail.forEach((ids) => addDuplicates(ids));

    // Convert sets to arrays
    const result = new Map();
    map.forEach((dupes, id) => {
      if (dupes.size > 0) result.set(id, [...dupes]);
    });
    return result;
  }, [clients]);

  const getDuplicateOf = (clientId) => {
    const dupeIds = duplicateMap.get(clientId);
    if (!dupeIds || dupeIds.length === 0) return null;
    return dupeIds.map(id => clients.find(c => c.id === id)).filter(Boolean);
  };

  // Merge duplicate: keep target, transfer data from source, delete source
  const mergeClients = async (targetId, sourceId) => {
    const target = clients.find(c => c.id === targetId);
    const source = clients.find(c => c.id === sourceId);
    if (!target || !source) return;

    const confirmed = await confirm({
      title: 'Fusionner les clients',
      message: `Fusionner "${source.nom} ${source.prenom || ''}" dans "${target.nom} ${target.prenom || ''}" ?\n\nLes informations manquantes seront complétées et les documents transférés. Le doublon sera supprimé.`
    });
    if (!confirmed) return;

    // Merge: fill in blanks from source
    const merged = {};
    ['prenom', 'entreprise', 'email', 'telephone', 'adresse', 'notes', 'categorie', 'siret', 'tva_intra'].forEach(field => {
      if (!target[field] && source[field]) {
        merged[field] = source[field];
      }
    });
    // Combine notes if both have them
    if (target.notes && source.notes && target.notes !== source.notes) {
      merged.notes = `${target.notes}\n---\n${source.notes}`;
    }

    // Update target with merged data
    if (Object.keys(merged).length > 0) {
      if (updateClient) await updateClient(targetId, merged);
    }

    // Transfer devis/chantiers from source to target
    if (!isDemo && supabase) {
      await supabase.from('devis').update({ client_id: targetId }).eq('client_id', sourceId);
      await supabase.from('chantiers').update({ client_id: targetId }).eq('client_id', sourceId);
    } else {
      // Demo mode: update local state references
      const sourceDevis = devis?.filter(d => d.client_id === sourceId) || [];
      const sourceChantiers = chantiers?.filter(ch => ch.client_id === sourceId) || [];
      sourceDevis.forEach(d => { d.client_id = targetId; });
      sourceChantiers.forEach(ch => { ch.client_id = targetId; });
    }

    // Delete the source client
    if (deleteClientProp) {
      await deleteClientProp(sourceId);
    } else {
      setClients(clients.filter(c => c.id !== sourceId));
    }

    showToast(`Client fusionné avec succès`, 'success');
    setViewId(targetId);
  };

  // Avatar initials — handles professionals with entreprise
  const getInitials = (c) => {
    if (c.prenom) return `${c.nom?.[0] || ''}${c.prenom[0]}`.toUpperCase();
    if (c.entreprise && c.categorie === 'Professionnel') {
      // For professionals: first 2 letters of entreprise
      return c.entreprise.replace(/[^a-zA-ZÀ-ÿ]/g, '').slice(0, 2).toUpperCase() || c.nom?.[0]?.toUpperCase() || '?';
    }
    // Fallback: split nom by spaces
    return c.nom?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  // Status tooltip explanation
  const STATUS_TOOLTIPS = {
    actif: 'A des chantiers ou devis en cours',
    en_devis: 'A des devis actifs, pas de chantier en cours',
    prospect: 'Créé il y a moins de 90 jours, sans documents',
    inactif: 'Aucun chantier ni devis en cours'
  };

  // P3.1: Test data detection — hide in prod, badge in dev
  const isTestClient = (c) => {
    if (c.isTestData) return true;
    const nom = (c.nom || '').toLowerCase();
    const entreprise = (c.entreprise || '').toLowerCase();
    return /^(clientpersist|test_|testclient)/i.test(c.nom || '') ||
           /^(clientpersist|test_|testclient)/i.test(c.entreprise || '') ||
           nom.includes('test') || entreprise.includes('test');
  };

  // In production, filter out test clients from the main list
  const isProduction = typeof __DEV__ !== 'undefined' ? !__DEV__ : (import.meta.env?.PROD ?? true);
  const displayClients = useMemo(() => {
    if (isProduction) return clients.filter(c => !isTestClient(c));
    return clients;
  }, [clients, isProduction]);

  // P1.3: show TYPE column only if >= 20% of clients have a category
  const showTypeColumn = useMemo(() => {
    if (displayClients.length === 0) return false;
    const withType = displayClients.filter(c => c.categorie && c.categorie.trim()).length;
    return (withType / displayClients.length) >= 0.2;
  }, [displayClients]);

  const filtered = displayClients.filter(c => {
    const q = debouncedSearch?.toLowerCase() || '';
    const matchSearch = !q ||
      c.nom?.toLowerCase().includes(q) ||
      c.prenom?.toLowerCase().includes(q) ||
      c.entreprise?.toLowerCase().includes(q) ||
      c.telephone?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      c.email?.toLowerCase().includes(q) ||
      c.adresse?.toLowerCase().includes(q);
    const matchCat = !filterCategorie || c.categorie === filterCategorie;
    const matchStatus = !filterStatus || getClientStatus(c.id) === filterStatus;
    // KPI filter
    let matchKpi = true;
    if (kpiFilter === 'actifs') {
      matchKpi = getClientStatus(c.id) === 'actif';
    } else if (kpiFilter === 'ca') {
      matchKpi = getClientStats(c.id).ca > 0;
    } else if (kpiFilter === 'devis_attente') {
      matchKpi = getClientStats(c.id).devisActifs > 0;
    }
    return matchSearch && matchCat && matchStatus && matchKpi;
  });

  // Get last activity date for a client (for sorting and display)
  const getLastActivity = (clientId) => {
    let latest = 0;
    const checkDate = (dateStr) => {
      if (!dateStr) return;
      const t = new Date(dateStr).getTime();
      if (t > latest && !isNaN(t)) latest = t;
    };
    (devis || []).forEach(d => {
      if (d.client_id === clientId) {
        checkDate(d.created_at);
        checkDate(d.updated_at);
        checkDate(d.date);
      }
    });
    (chantiers || []).forEach(ch => {
      if ((ch.client_id || ch.clientId) === clientId) {
        checkDate(ch.created_at);
        checkDate(ch.updated_at);
        checkDate(ch.date_debut);
      }
    });
    // Also check client's own updated_at
    const client = clients.find(c => c.id === clientId);
    if (client) {
      checkDate(client.updated_at);
    }
    return latest;
  };

  const handleSortChange = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      // Default directions: name → asc, others → desc
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortedClients = () => {
    const sorted = [...filtered];
    const mult = sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => mult * (a.nom || '').localeCompare(b.nom || ''));
      case 'ca':
        return sorted.sort((a, b) => mult * (getClientStats(a.id).ca - getClientStats(b.id).ca));
      case 'activite':
        return sorted.sort((a, b) => mult * (getLastActivity(a.id) - getLastActivity(b.id)));
      case 'recent':
      default:
        return sorted.sort((a, b) => mult * (parseInt(a.id) - parseInt(b.id)));
    }
  };

  const doSubmit = async (trimmedForm) => {
    const wasEditing = editId;
    try {
      if (editId) {
        if (updateClient) {
          await updateClient(editId, trimmedForm);
        } else {
          setClients(clients.map(c => c.id === editId ? { ...c, ...trimmedForm } : c));
        }
      } else {
        // Await so a failed Supabase save surfaces here (error toast) instead of
        // showing a false "créé avec succès" while the client silently vanishes.
        await onSubmit(trimmedForm);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showToast(error?.message || 'Erreur lors de la sauvegarde du client', 'error');
      return;
    }
    setShow(false);
    setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' });
    clearErrors();
    clearDupes();
    showToast(wasEditing ? 'Client modifié avec succès' : 'Client créé avec succès', 'success');
    if (wasEditing) {
      setViewId(wasEditing);
    }
    setEditId(null);
  };

  const submit = async () => {
    // Trim all string fields before validation and save
    const trimmedForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    setForm(trimmedForm);

    if (!validateAll(trimmedForm)) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    // Check for strong duplicates (phone/email) — only on creation, not edit
    if (!editId && strongDuplicates.length > 0) {
      setPendingSubmit(trimmedForm);
      setShowDupeConfirm(true);
      return;
    }

    await doSubmit(trimmedForm);
  };

  const startEdit = (client) => {
    setForm({ nom: client.nom || '', prenom: client.prenom || '', entreprise: client.entreprise || '', email: client.email || '', telephone: client.telephone || '', adresse: client.adresse || '', notes: client.notes || '', categorie: client.categorie || '' });
    clearErrors();
    setEditId(client.id);
    setViewId(null); // Close detail view to show edit form
    setShow(true);
  };
  const openGPS = (adresse) => { if (!adresse) return; ouvrirLienExterne(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`); };
  const callPhone = (tel) => { if (!tel) return; window.location.href = `tel:${tel.replace(/\s/g, '')}`; };
  const sendWhatsApp = (tel, nom) => { if (!tel) return; const phone = tel.replace(/\s/g, '').replace(/^0/, '33'); ouvrirLienExterne(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour ${nom || ''},`)}`); };
  const handleDeleteClient = async (id) => {
    const client = clients.find(c => c.id === id);
    const stats = getClientStats(id);
    const hasData = stats.chantiers > 0 || stats.devis > 0 || stats.factures > 0;
    const message = hasData
      ? `Supprimer ${client?.nom || 'ce client'} ? Ce client a ${stats.chantiers} chantier(s) et ${stats.devis + stats.factures} document(s) associés. Cette action est irréversible.`
      : `Supprimer ${client?.nom || 'ce client'} ? Cette action est irréversible.`;
    const confirmed = await confirm({ title: 'Supprimer le client', message });
    if (confirmed) {
      if (deleteClientProp) {
        await deleteClientProp(id);
      } else {
        setClients(clients.filter(c => c.id !== id));
      }
      setViewId(null);
      showToast('Client supprimé', 'success');
    }
  };

  // D6: Quick client creation handler
  const handleQuickSubmit = async (data) => {
    const newClient = await onSubmit(data);
    setShowQuickModal(false);
    const clientName = `${data.prenom || ''} ${data.nom}`.trim();
    showToast(`✅ ${clientName} ajouté`, 'success');
    // Auto-open client fiche after creation
    if (newClient?.id) {
      setViewId(newClient.id);
    }
  };

  // Ouvrir un document (devis/facture)
  const openDocument = (doc) => {
    if (setSelectedDevis && setPage) {
      setSelectedDevis(doc);
      setPage('devis');
    }
  };

  // Vue détail
  if (viewId) {
    const client = clients.find(c => c.id === viewId);
    if (!client) { setViewId(null); return null; }
    const stats = getClientStats(client.id);
    const clientDevis = devis?.filter(d => d.client_id === client.id) || [];
    const clientChantiers = chantiers?.filter(c => c.client_id === client.id) || [];

    const clientStatus = getClientStatus(client.id);
    // Lien du portail client : généré, copié, et proposé par e-mail.
    const ouvrirPortail = async () => {
              if (!setPage) return;

              // Mode demo : navigation directe
              if (isDemo || !supabase) {
                localStorage.setItem('cp_portal_client_id', client.id);
                setPage('client-portal');
                return;
              }

              // Générer un token portail
              const tokenData = await generatePortalToken(supabase, {
                clientId: client.id,
                entrepriseId: entreprise?.id,
              });

              if (!tokenData) {
                // Fallback navigation interne si la génération échoue
                localStorage.setItem('cp_portal_client_id', client.id);
                setPage('client-portal');
                return;
              }

              const portalUrl = urlPublique(`/?portal=${tokenData.token}`);

              // Copier dans le presse-papier
              try {
                await navigator.clipboard?.writeText(portalUrl);
                showToast(`Lien portail copié ! Envoyez-le à ${client.prenom || client.nom}`, 'success');
              } catch {
                showToast('Lien portail généré', 'success');
              }

              // Si le client a un email, proposer l'envoi
              if (client.email) {
                const send = window.confirm(`Envoyer le lien par email à ${client.email} ?`);
                if (send) {
                  const sent = await sendPortalInvite(supabase, {
                    clientEmail: client.email,
                    clientName: client.prenom || client.nom,
                    portalUrl,
                    entrepriseName: entreprise?.nom || 'Mallettico',
                  });
                  if (sent) {
                    showToast('Invitation envoyée par email', 'success');
                  } else {
                    showToast('Erreur lors de l\'envoi de l\'invitation', 'error');
                  }
                }
              }
    };

    return (
      <div className="space-y-5 max-w-3xl">
        {/* En-tête : retour, nom, statut ; modifier et supprimer en icônes */}
        <div className="flex items-start gap-1">
          <BoutonIcone icone={ArrowLeft} libelle="Retour aux clients" onClick={() => setViewId(null)} className="-ml-2" />
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-bold text-encre leading-tight break-words">{formatClientName(client)}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <PastilleStatut genre="client" statut={clientStatus} />
              {[client.categorie, client.entreprise, villeDe(client.adresse)].filter(Boolean).length > 0 && (
                <span className="text-sm text-encre-2">{[client.categorie, client.entreprise, villeDe(client.adresse)].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          </div>
          <BoutonIcone icone={Edit3} libelle="Modifier le client" onClick={() => startEdit(client)} />
          <BoutonIcone icone={Trash2} libelle="Supprimer le client" onClick={() => handleDeleteClient(client.id)} />
        </div>

        {/* Une action principale, puis les gestes de contact */}
        <div className="space-y-2">
          <Bouton variante="principal" taille="grande" pleineLargeur icone={FileText} onClick={() => nouveauDevisPour?.(client.id)}>
            Nouveau devis
          </Bouton>
          <div className="grid grid-cols-3 gap-2">
            {[
              { cle: 'appel', icone: Phone, libelle: 'Appeler', ok: !!client.telephone, faire: () => callPhone(client.telephone), manque: 'Aucun numéro' },
              { cle: 'whatsapp', icone: MessageCircle, libelle: 'WhatsApp', ok: !!client.telephone, faire: () => sendWhatsApp(client.telephone, client.prenom), manque: 'Aucun numéro' },
              { cle: 'gps', icone: MapPin, libelle: 'Itinéraire', ok: !!client.adresse, faire: () => openGPS(client.adresse), manque: 'Aucune adresse' },
            ].map(({ cle, icone: Icone, libelle, ok, faire, manque }) => (
              <button key={cle} type="button" onClick={faire} disabled={!ok} title={ok ? libelle : manque}
                className="h-16 flex flex-col items-center justify-center gap-1 rounded-xl border border-bord-fort bg-surface text-encre text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none">
                <Icone size={20} aria-hidden="true" />
                {libelle}
              </button>
            ))}
          </div>
        </div>

        {/* Coordonnées */}
        <Carte marge="aucun" className="divide-y divide-bord overflow-hidden">
          {[
            { cle: 'tel', icone: Phone, valeur: client.telephone, lien: client.telephone ? `tel:${client.telephone.replace(/\s/g, '')}` : null, ajouter: 'Ajouter un téléphone' },
            { cle: 'mail', icone: Mail, valeur: client.email, lien: client.email ? `mailto:${client.email}` : null, ajouter: 'Ajouter un e-mail' },
            { cle: 'adresse', icone: MapPin, valeur: client.adresse, lien: null, ajouter: 'Ajouter une adresse' },
          ].map(({ cle, icone: Icone, valeur, lien, ajouter }) => (
            <div key={cle} className="min-h-[52px] flex items-center gap-3 px-4 py-2.5">
              <Icone size={18} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
              {valeur ? (
                lien
                  ? <a href={lien} className="flex-1 min-w-0 text-base text-encre break-words hover:underline">{valeur}</a>
                  : <p className="flex-1 min-w-0 text-base text-encre break-words">{valeur}</p>
              ) : (
                <button type="button" onClick={() => startEdit(client)} className="h-11 -my-2 text-sm font-semibold text-accent-texte hover:underline">{ajouter}</button>
              )}
            </div>
          ))}
        </Carte>
        <div className="-mt-3 flex justify-end">
          <Bouton variante="discret" taille="compacte" icone={ExternalLink} onClick={ouvrirPortail}>Lien du portail client</Bouton>
        </div>

        {/* Ce qui attend, en une phrase */}
        {(() => {
          const pendingDevis = clientDevis.filter(d => d.type === 'devis' && (d.statut === 'envoye' || d.statut === 'vu'));
          const oldestPending = [...pendingDevis].sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at))[0];
          const daysSinceSent = oldestPending ? Math.floor((Date.now() - new Date(oldestPending.date || oldestPending.created_at).getTime()) / 86400000) : 0;
          // Signé et pas encore facturé : aucune facture rattachée au devis, hormis un acompte (le solde reste à faire).
          const acceptedNotInvoiced = clientDevis.filter(d => d.type === 'devis' && d.statut === 'accepte'
            && !clientDevis.some(f => f.type === 'facture' && f.devis_source_id === d.id && f.facture_type !== 'acompte'));
          const terminatedNoInvoice = clientChantiers.filter(ch => ch.statut === 'termine' && !clientDevis.some(d => d.type === 'facture' && d.chantier_id === ch.id));
          const activityDates = [
            ...clientDevis.map(d => new Date(d.created_at || 0).getTime()).filter(t => t > 0),
            ...clientChantiers.map(ch => new Date(ch.created_at || 0).getTime()).filter(t => t > 0),
          ];
          const lastActivityDate = activityDates.length > 0 ? Math.max(...activityDates) : 0;
          const monthsSinceActivity = lastActivityDate > 0 ? Math.floor((Date.now() - lastActivityDate) / (86400000 * 30)) : -1;

          let alert = null;
          if (oldestPending && daysSinceSent > 7) {
            alert = { icon: Clock, ton: 'alerte', message: `Devis ${oldestPending.numero || ''} sans réponse depuis ${daysSinceSent} jours`.replace('  ', ' '), action: 'Relancer', onAction: () => { setSelectedDevis?.(oldestPending); setPage?.('devis'); } };
          } else if (acceptedNotInvoiced.length > 0) {
            alert = { icon: Zap, ton: 'succes', message: acceptedNotInvoiced.length > 1 ? `${acceptedNotInvoiced.length} devis signés à facturer` : 'Un devis signé à facturer', action: 'Facturer', onAction: () => { setSelectedDevis?.(acceptedNotInvoiced[0]); setPage?.('devis'); } };
          } else if (terminatedNoInvoice.length > 0) {
            alert = { icon: AlertTriangle, ton: 'alerte', message: 'Chantier terminé, pas encore facturé', action: 'Voir', onAction: () => { setSelectedChantier?.(terminatedNoInvoice[0].id); setPage?.('chantiers'); } };
          } else if (monthsSinceActivity > 6 && stats.chantiers > 0) {
            alert = { icon: Info, ton: 'neutre', message: `Aucune activité depuis ${monthsSinceActivity} mois` };
          }
          if (!alert) return null;
          const AlertIcon = alert.icon;
          const tons = { alerte: 'bg-alerte-fond text-alerte-texte', succes: 'bg-succes-fond text-succes-texte', neutre: 'bg-surface-2 text-encre-2' };
          return (
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${tons[alert.ton]}`}>
              <AlertIcon size={20} aria-hidden="true" className="flex-shrink-0" />
              <p className="flex-1 min-w-0 text-sm font-semibold">{alert.message}</p>
              {alert.action && <Bouton taille="compacte" onClick={alert.onAction}>{alert.action}</Bouton>}
            </div>
          );
        })()}

        {/* Doublon probable */}
        {(() => {
          const dupes = getDuplicateOf(client.id);
          if (!dupes || dupes.length === 0) return null;
          return (
            <div className="rounded-2xl px-4 py-3 bg-alerte-fond text-alerte-texte">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0" /> Client probablement en double
              </p>
              <div className="mt-2 space-y-2">
                {dupes.map(dupe => {
                  const matchPhone = client.telephone && dupe.telephone && client.telephone.replace(/[\s.\-()]/g, '') === dupe.telephone.replace(/[\s.\-()]/g, '');
                  const matchEmail = client.email && dupe.email && client.email.toLowerCase().trim() === dupe.email.toLowerCase().trim();
                  return (
                    <div key={dupe.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-2">
                      <div className="flex-1 min-w-[10rem]">
                        <p className="text-sm font-semibold text-encre">{formatClientName(dupe)}</p>
                        <p className="text-sm text-encre-2">{[matchPhone && 'même téléphone', matchEmail && 'même e-mail'].filter(Boolean).join(' · ')}</p>
                      </div>
                      <Bouton taille="compacte" variante="discret" onClick={() => setViewId(dupe.id)}>Voir</Bouton>
                      <Bouton taille="compacte" onClick={() => mergeClients(client.id, dupe.id)}>Fusionner</Bouton>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Les chiffres du client */}
        {(() => {
          const du = dueParClient.get(client.id) || 0;
          // Encaissé : ce qui est réellement reçu, acomptes et paiements partiels compris
          // (l'ancien total ne comptait que les factures soldées).
          const encaisse = clientDevis
            .filter(d => d.type === 'facture' && d.facture_type !== 'avoir' && d.statut !== 'brouillon')
            .reduce((somme, f) => somme + (statutFacture(f, paiements) === 'payee' ? (f.total_ttc || 0) : Math.min(dejaPaye(f, paiements), f.total_ttc || 0)), 0);
          const enAttente = clientDevis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length;
          return (
            <Carte>
              <dl className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">Encaissé</dt>
                  <dd className={`text-lg font-bold tabular-nums truncate ${encaisse > 0 ? 'text-encre' : 'text-encre-3'}`}>{formatMoney(encaisse)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">Reste dû</dt>
                  <dd className={`text-lg font-bold tabular-nums truncate ${du > 0 ? 'text-encre' : 'text-encre-3'}`}>{formatMoney(du)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">À signer</dt>
                  <dd className={`text-lg font-bold tabular-nums truncate ${enAttente > 0 ? 'text-encre' : 'text-encre-3'}`}>{enAttente} devis</dd>
                </div>
              </dl>
            </Carte>
          );
        })()}

        {/* Onglets : libellés toujours écrits */}
        {(() => {
          const photoCount = clientChantiers.reduce((sum, ch) => sum + (ch.photos?.length || 0), 0);
          const echangeCount = (echanges || []).filter(e => e.client_id === client.id).length;
          const memoCount = (memos || []).filter(m => m.client_id === client.id).length;
          return (
            <Onglets
              ariaLabel="Sections de la fiche client"
              actif={activeTab}
              onChange={setActiveTab}
              onglets={[
                { id: 'documents', libelle: 'Documents', compte: stats.devis + stats.factures },
                { id: 'chantiers', libelle: 'Chantiers', compte: stats.chantiers },
                { id: 'activite', libelle: 'Activité' },
                { id: 'photos', libelle: 'Photos', compte: photoCount },
                { id: 'memos', libelle: 'Tâches', compte: memoCount },
                { id: 'echanges', libelle: 'Échanges', compte: echangeCount },
              ]}
            />
          );
        })()}

        {activeTab === 'historique' && (() => {
          const timeline = [];
          // Devis
          clientDevis.filter(d => d.type === 'devis').forEach(d => timeline.push({
            id: `d-${d.id}`, date: d.date, type: 'devis', icon: FileText,
            label: `Devis ${d.numero || '#'}`, statut: d.statut,
            montant: d.total_ttc || d.total_ht || 0,
            color: '#f97316', onClick: () => { setSelectedDevis?.(d); setPage?.('devis'); }
          }));
          // Factures
          clientDevis.filter(d => d.type === 'facture').forEach(f => timeline.push({
            id: `f-${f.id}`, date: f.date, type: 'facture', icon: Receipt,
            label: `Facture ${f.numero || '#'}`, statut: f.statut,
            montant: f.total_ttc || f.total_ht || 0,
            color: '#8b5cf6', onClick: () => { setSelectedDevis?.(f); setPage?.('devis'); }
          }));
          // Chantiers
          clientChantiers.forEach(c => timeline.push({
            id: `c-${c.id}`, date: c.date_debut || c.created_at, type: 'chantier', icon: Building2,
            label: c.nom, statut: c.statut,
            color: '#22c55e', onClick: () => { setSelectedChantier?.(c.id); setPage?.('chantiers'); }
          }));
          timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

          const statusLabel = (s) => ({
            brouillon: 'Brouillon', envoye: 'Envoyé', vu: 'Vu', accepte: 'Signé',
            refuse: 'Refusé', payee: 'Payée', facturee: 'Facturé',
            acompte_facture: 'Acompte facturé', en_cours: 'En cours',
            termine: 'Terminé', archive: 'Archivé', prospect: 'Prospect',
            abandonne: 'Abandonné'
          }[s] || s || '');
          const statusColor = (s) => ({
            accepte: 'text-emerald-500', payee: 'text-emerald-500', termine: 'text-emerald-500',
            facturee: 'text-purple-500', acompte_facture: 'text-purple-400',
            refuse: 'text-red-500', abandonne: 'text-red-400',
            envoye: 'text-blue-500', vu: 'text-blue-400',
            en_cours: 'text-amber-500', brouillon: textMuted,
            archive: textMuted
          }[s] || textMuted);

          return (
            <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
              {timeline.length === 0 ? (
                <div className="text-center py-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-surface-2`}>
                    <History size={28} className={'text-encre-3'} />
                  </div>
                  <p className={`font-medium ${textPrimary}`}>Aucun historique</p>
                  <p className={`text-sm ${textMuted}`}>Les devis, factures et chantiers apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeline.map(item => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-surface-2`}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                        <item.icon size={16} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textPrimary}`}>{item.label}</p>
                        <p className={`text-xs ${textMuted}`}>
                          {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                          {item.montant ? ` • ${formatMoney(item.montant)}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-medium ${statusColor(item.statut)}`}>{statusLabel(item.statut)}</span>
                      <ChevronRight size={14} className={textMuted} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'chantiers' && (
          clientChantiers.length === 0 ? (
            <Carte marge="aucun">
              <EtatVide icone={Home} titre="Aucun chantier" texte="Les chantiers de ce client apparaîtront ici."
                action={<Bouton icone={Plus} onClick={() => nouveauChantierPour?.(client.id)}>Nouveau chantier</Bouton>} />
            </Carte>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Bouton variante="discret" icone={Plus} onClick={() => nouveauChantierPour?.(client.id)}>Nouveau chantier</Bouton>
              </div>
              <GroupeListe>
                {clientChantiers.map(ch => (
                  <LigneListe
                    key={ch.id}
                    onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }}
                    titre={ch.nom || 'Chantier sans nom'}
                    meta={villeDe(ch.adresse) || ch.adresse || '—'}
                    pastille={<PastilleStatut genre="chantier" statut={ch.statut} />}
                  />
                ))}
              </GroupeListe>
            </div>
          )
        )}

        {activeTab === 'documents' && (
          clientDevis.length === 0 ? (
            <Carte marge="aucun">
              <EtatVide icone={FileText} titre="Aucun document" texte="Les devis et factures de ce client apparaîtront ici." />
            </Carte>
          ) : (
            <GroupeListe>
              {[...clientDevis].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(d => {
                const estAvoir = d.type === 'facture' && d.facture_type === 'avoir';
                const estFacture = d.type === 'facture' && !estAvoir;
                const nature = estAvoir ? 'Avoir' : estFacture ? 'Facture' : 'Devis';
                const date = d.date ? dateLocale(d.date) : null;
                return (
                  <LigneListe
                    key={d.id}
                    onClick={() => openDocument(d)}
                    titre={`${nature} ${d.numero || ''}`.trim()}
                    meta={[date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null, d.objet || d.titre].filter(Boolean).join(' · ') || '—'}
                    montant={estAvoir ? `-${formatMoney(Math.abs(d.total_ttc || 0))}` : formatMoney(d.total_ttc)}
                    pastille={<PastilleStatut genre={d.type === 'facture' ? 'facture' : 'devis'} statut={estFacture ? statutFacture(d, paiements) : d.statut} />}
                  />
                );
              })}
            </GroupeListe>
          )
        )}

        {activeTab === 'echanges' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const clientEchanges = echanges.filter(e => e.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));

              // Quick action buttons for contacting
              const contactButtons = (
                <div className="flex gap-2 flex-wrap">
                  {client.telephone && (
                    <>
                      <a href={`tel:${client.telephone.replace(/\s/g, '')}`} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${CHANNEL_CONFIG.appel.btnBg}`}>
                        <Phone size={14} /> Appeler
                      </a>
                      <a href={`sms:${client.telephone.replace(/\s/g, '')}`} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${CHANNEL_CONFIG.sms.btnBg}`}>
                        <MessageCircle size={14} /> SMS
                      </a>
                      <a href={`https://wa.me/${client.telephone.replace(/\s/g, '').replace(/^0/, '33')}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${CHANNEL_CONFIG.whatsapp.btnBg}`}>
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    </>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${CHANNEL_CONFIG.email.btnBg}`}>
                      <Mail size={14} /> Email
                    </a>
                  )}
                </div>
              );

              if (clientEchanges.length === 0) return (
                <div className="text-center py-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-surface-2`}>
                    <MessageSquare size={28} className={'text-encre-3'} />
                  </div>
                  <p className={`font-medium ${textPrimary} mb-1`}>Aucun échange</p>
                  <p className={`text-sm ${textMuted} mb-5`}>Commencez une conversation avec ce client</p>
                  <div className="flex justify-center">{contactButtons}</div>
                  {!client.email && !client.telephone && (
                    <p className={`text-sm ${textMuted} mt-3`}>Ajoutez un email ou téléphone pour contacter ce client</p>
                  )}
                </div>
              );
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className={`text-sm font-medium ${textPrimary}`}>{clientEchanges.length} échange{clientEchanges.length > 1 ? 's' : ''}</p>
                    {contactButtons}
                  </div>
                  {clientEchanges.map(e => {
                    const channel = CHANNEL_CONFIG[e.type] || CHANNEL_CONFIG.email;
                    const ChannelIcon = channel.icon;
                    const dirIn = e.direction === 'in' || e.direction === 'entrant';
                    const dirOut = e.direction === 'out' || e.direction === 'sortant';
                    const hasContent = e.contenu || e.body || e.message;
                    const preview = hasContent ? (hasContent.length > 60 ? hasContent.slice(0, 60) + '…' : hasContent) : null;
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEchange(e)}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600/80 active:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${channel.bg}`}>
                          <ChannelIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`font-medium text-sm ${textPrimary}`}>{channel.label}</p>
                              {(dirIn || dirOut) && (
                                <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${dirOut ? ('bg-info-fond text-info-texte') : ('bg-alerte-fond text-alerte-texte')}`}>
                                  {dirOut ? <><ArrowUpRight size={9} /> Envoyé</> : <><ArrowDownLeft size={9} /> Reçu</>}
                                </span>
                              )}
                              {e.document && <span className={`text-xs ${textMuted} truncate`}>· {e.document}</span>}
                            </div>
                            <span className={`text-xs ${textMuted} whitespace-nowrap flex-shrink-0`}>
                              {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {/* Subject or (Sans objet) */}
                          <p className={`text-sm mt-1 ${e.objet ? textSecondary : `${textMuted} italic`}`}>
                            {e.objet || '(Sans objet)'}
                          </p>
                          {/* Content preview truncated to 60 chars */}
                          {preview && (
                            <p className={`text-xs ${textMuted} mt-0.5 truncate`}>{preview}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {e.duree && <span className={`text-xs ${textMuted} flex items-center gap-1`}><Clock size={10} /> {e.duree} min</span>}
                            {e.montant && <span className="text-xs font-medium" style={{color: couleur}}>{formatMoney(e.montant)}</span>}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`${textMuted} flex-shrink-0 mt-3`} />
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* P1.1 — Échange detail drawer/modal */}
        {selectedEchange && (() => {
          const e = selectedEchange;
          const channel = CHANNEL_CONFIG[e.type] || CHANNEL_CONFIG.email;
          const ChannelIcon = channel.icon;
          const dirIn = e.direction === 'in' || e.direction === 'entrant';
          const dirOut = e.direction === 'out' || e.direction === 'sortant';
          const fullContent = e.contenu || e.body || e.message;
          return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedEchange(null)}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className={`relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl animate-in slide-in-from-bottom`}
                onClick={ev => ev.stopPropagation()}
              >
                {/* Drawer handle on mobile */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                  <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                </div>
                {/* Header */}
                <div className={`flex items-center gap-3 p-4 border-b border-bord`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${channel.bg}`}>
                    <ChannelIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${textPrimary}`}>{channel.label}</p>
                      {(dirIn || dirOut) && (
                        <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${dirOut ? ('bg-info-fond text-info-texte') : ('bg-alerte-fond text-alerte-texte')}`}>
                          {dirOut ? <><ArrowUpRight size={9} /> Envoyé</> : <><ArrowDownLeft size={9} /> Reçu</>}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${textMuted}`}>
                      {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => setSelectedEchange(null)} className={`p-2 rounded-xl hover:bg-surface-2`}>
                    <X size={18} className={textMuted} />
                  </button>
                </div>
                {/* Body */}
                <div className="p-4 space-y-4">
                  {/* Subject */}
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>Objet</p>
                    <p className={`text-sm ${e.objet ? textPrimary : `${textMuted} italic`}`}>
                      {e.objet || '(Sans objet)'}
                    </p>
                  </div>
                  {/* Document linked */}
                  {e.document && (
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>Document lié</p>
                      <p className={`text-sm ${textPrimary}`}>{e.document}</p>
                    </div>
                  )}
                  {/* Duration */}
                  {e.duree && (
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>Durée</p>
                      <p className={`text-sm ${textPrimary} flex items-center gap-1.5`}><Clock size={14} /> {e.duree} minutes</p>
                    </div>
                  )}
                  {/* Amount */}
                  {e.montant && (
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>Montant</p>
                      <p className="text-sm font-semibold" style={{color: couleur}}>{formatMoney(e.montant)}</p>
                    </div>
                  )}
                  {/* Content */}
                  {fullContent ? (
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>Contenu</p>
                      <div className={`text-sm ${textSecondary} whitespace-pre-line p-3 rounded-xl bg-surface-2`}>
                        {fullContent}
                      </div>
                    </div>
                  ) : (
                    <div className={`text-center py-6 bg-surface-2 rounded-xl`}>
                      <p className={`text-sm ${textMuted} italic`}>Aucun contenu enregistré pour cet échange</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'memos' && (
          <div className="space-y-4">
            {/* Notes internes */}
            <div className={`${cardBg} rounded-xl border p-3 sm:p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${textPrimary}`}>Notes internes</p>
              </div>
              {client.notes ? (
                <p className={`text-sm p-3 rounded-lg ${isDark ? 'bg-amber-900/20 text-amber-200' : 'bg-amber-50 text-amber-800'} whitespace-pre-line`}>{client.notes}</p>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${textMuted} hover:underline`}>
                  + Ajouter des notes
                </button>
              )}
              {/* Quick tags */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['À rappeler', 'VIP', 'Problème paiement', 'Recommandé'].map(tag => {
                  const hasTag = client.notes?.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (hasTag) return;
                        const newNotes = client.notes ? `${client.notes}\n[${tag}]` : `[${tag}]`;
                        updateClient?.(client.id, { notes: newNotes });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs min-h-[36px] font-medium transition-all ${hasTag ? 'text-white' : 'bg-surface-2 text-encre-3 hover:bg-bord'}`}
                      style={hasTag ? { background: couleur } : {}}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Memos list */}
            <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const clientMemos = memos.filter(m => m.client_id === client.id);
              const activeMemos = clientMemos.filter(m => !m.is_done);
              const doneMemos = clientMemos.filter(m => m.is_done);
              return (
                <div className="space-y-3">
                  {/* Quick add */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id={`memo-client-${client.id}`}
                      placeholder="Nouvelle tâche pour ce client..."
                      className={`flex-1 px-3 py-2 border rounded-xl text-sm ${inputBg}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          addMemo?.({ text: e.target.value.trim(), client_id: client.id });
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`memo-client-${client.id}`);
                        if (input?.value.trim()) {
                          addMemo?.({ text: input.value.trim(), client_id: client.id });
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

                  {clientMemos.length === 0 && (
                    <div className="text-center py-8">
                      <ClipboardList size={28} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                      <p className={textMuted}>Aucune tâche pour ce client</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          </div>
        )}

        {activeTab === 'activite' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border`}>
            <ClientActivityTab
              clientId={client.id}
              clientDevis={clientDevis}
              clientChantiers={clientChantiers}
              isDark={isDark}
              couleur={couleur}
              modeDiscret={modeDiscret}
            />
          </div>
        )}

        {activeTab === 'photos' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const allPhotos = clientChantiers.flatMap(ch => (ch.photos || []).map(p => ({ ...p, chantierNom: ch.nom, chantierId: ch.id })));
              if (allPhotos.length === 0) return (
                <div className="text-center py-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-surface-2`}>
                    <Camera size={28} className={'text-encre-3'} />
                  </div>
                  <p className={`font-medium ${textPrimary} mb-1`}>Aucune photo</p>
                  {clientChantiers.length > 0 ? (
                    <>
                      <p className={`text-sm ${textMuted} mb-5`}>Documentez vos chantiers avec des photos</p>
                      <button
                        onClick={() => {
                          if (setSelectedChantier) setSelectedChantier(clientChantiers[0].id);
                          if (setPage) setPage('chantiers');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: couleur, color: 'white' }}
                      >
                        <Plus size={18} /> Ajouter une photo
                      </button>
                    </>
                  ) : (
                    <p className={`text-sm ${textMuted}`}>Créez d'abord un chantier pour ajouter des photos</p>
                  )}
                </div>
              );
              return (
                <div className="space-y-3">
                  {clientChantiers.length > 0 && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => {
                          if (setSelectedChantier) setSelectedChantier(clientChantiers[0].id);
                          if (setPage) setPage('chantiers');
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                        style={{ background: `${couleur}15`, color: couleur }}
                      >
                        <Camera size={14} /> Ajouter une photo
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {allPhotos.map(p => (
                      <div key={p.id} className="relative group cursor-pointer" onClick={() => { if (setSelectedChantier && p.chantierId) { setSelectedChantier(p.chantierId); setPage?.('chantiers'); } }}>
                        <img src={p.src} className="w-full h-24 object-cover rounded-xl" alt={`Photo du chantier ${p.chantierNom}`} onError={(e) => { e.target.style.display = 'none'; }} />
                        <p className={`text-xs ${textMuted} mt-1 truncate`}>{p.chantierNom}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors hover:bg-surface-2`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouveau'} client</h2>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div><label htmlFor="client-nom" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input id="client-nom" aria-required="true" aria-invalid={!!errors.nom} aria-describedby={errors.nom ? 'client-nom-error' : undefined} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} ${errors.nom ? 'border-red-500' : ''}`} value={form.nom} onChange={e => { setForm(p => ({...p, nom: e.target.value})); if (errors.nom) clearFieldError('nom'); }} onBlur={() => validate('nom', form.nom, form)} /><FormError id="client-nom-error" message={errors.nom} /></div>
          <div><label htmlFor="client-prenom" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prénom</label><input id="client-prenom" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label htmlFor="client-entreprise" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Entreprise</label><input id="client-entreprise" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div>
            <label htmlFor="client-telephone" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Téléphone</label>
            <input id="client-telephone" type="tel" aria-invalid={!!errors.telephone} aria-describedby={errors.telephone ? 'client-telephone-error' : undefined} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} ${errors.telephone ? 'border-red-500' : ''} ${phoneDuplicates.length > 0 ? (isDark ? 'border-amber-600' : 'border-amber-400') : ''}`} value={form.telephone} onChange={e => { setForm(p => ({...p, telephone: e.target.value})); if (errors.telephone) clearFieldError('telephone'); checkDupeField('telephone', e.target.value); }} onBlur={() => validate('telephone', form.telephone, form)} placeholder="06 12 34 56 78" />
            <FormError id="client-telephone-error" message={errors.telephone} />
            {phoneDuplicates.length > 0 && (
              <div className={`mt-1.5 flex items-start gap-1.5 text-xs text-alerte-texte`}>
                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Un client avec ce téléphone existe déjà : <strong>{phoneDuplicates[0].nom} {phoneDuplicates[0].prenom || ''}</strong>
                  <button type="button" onClick={() => { setShow(false); setEditId(null); setViewId(phoneDuplicates[0].id); }} className="ml-1 underline font-medium" style={{ color: couleur }}>Voir la fiche →</button>
                </span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="client-email" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label>
            <input id="client-email" type="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'client-email-error' : undefined} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} ${errors.email ? 'border-red-500' : ''} ${emailDuplicates.length > 0 ? (isDark ? 'border-amber-600' : 'border-amber-400') : ''}`} value={form.email} onChange={e => { setForm(p => ({...p, email: e.target.value})); if (errors.email) clearFieldError('email'); checkDupeField('email', e.target.value); }} onBlur={() => validate('email', form.email, form)} placeholder="client@email.com" />
            <FormError id="client-email-error" message={errors.email} />
            {emailDuplicates.length > 0 && (
              <div className={`mt-1.5 flex items-start gap-1.5 text-xs text-alerte-texte`}>
                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Un client avec cet email existe déjà : <strong>{emailDuplicates[0].nom} {emailDuplicates[0].prenom || ''}</strong>
                  <button type="button" onClick={() => { setShow(false); setEditId(null); setViewId(emailDuplicates[0].id); }} className="ml-1 underline font-medium" style={{ color: couleur }}>Voir la fiche →</button>
                </span>
              </div>
            )}
          </div>
          <div className="relative">
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Catégorie</label>
            <button
              type="button"
              onClick={() => setShowFormTypePicker(!showFormTypePicker)}
              className={`w-full px-4 py-2.5 border rounded-xl text-left flex items-center justify-between ${inputBg}`}
            >
              {form.categorie ? (
                <span className="flex items-center gap-2"><span>{TYPE_ICONS[form.categorie] || '📋'}</span> {form.categorie}</span>
              ) : (
                <span className={textMuted}>— Sélectionner —</span>
              )}
              <ChevronDown size={16} className={`${textMuted} transition-transform ${showFormTypePicker ? 'rotate-180' : ''}`} />
            </button>
            {showFormTypePicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowFormTypePicker(false)} />
                <div className={`absolute top-full left-0 right-0 mt-1 z-40 rounded-xl border shadow-xl overflow-hidden bg-surface border-bord`}>
                  <button
                    type="button"
                    onClick={() => { setForm(p => ({...p, categorie: ''})); setShowFormTypePicker(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${!form.categorie ? ('bg-surface-2 text-encre') : 'text-encre-2 hover:bg-surface-2'}`}
                  >
                    <span className="w-5 text-center">—</span> Non défini
                    {!form.categorie && <Check size={14} className="ml-auto" style={{color: couleur}} />}
                  </button>
                  {CLIENT_TYPES.map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => { setForm(p => ({...p, categorie: t})); setShowFormTypePicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${form.categorie === t ? ('bg-surface-2 text-encre') : 'text-encre-2 hover:bg-surface-2'}`}
                    >
                      <span className="w-5 text-center">{TYPE_ICONS[t] || '📋'}</span> {t}
                      {form.categorie === t && <Check size={14} className="ml-auto" style={{color: couleur}} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="sm:col-span-2"><label htmlFor="client-adresse" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Adresse</label><textarea id="client-adresse" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          {/* Facturation électronique : à partir de septembre 2026, une facture
              adressée à un professionnel doit porter son SIRET. Sans lui, elle
              sera rejetée par les plateformes agréées. */}
          <div><label htmlFor="client-siret" className={`block text-sm font-medium mb-1 ${textPrimary}`}>SIRET <span className={textMuted}>(si professionnel)</span></label><input id="client-siret" inputMode="numeric" maxLength={17} placeholder="123 456 789 00012" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.siret} onChange={e => setForm(p => ({...p, siret: e.target.value}))} /></div>
          <div><label htmlFor="client-tva" className={`block text-sm font-medium mb-1 ${textPrimary}`}>N&deg; TVA intracommunautaire</label><input id="client-tva" placeholder="FR12345678900" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.tva_intra} onChange={e => setForm(p => ({...p, tva_intra: e.target.value}))} /></div>
          <div className="sm:col-span-2">
            <label htmlFor="client-notes" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes internes</label>
            <div className="relative">
              <textarea id="client-notes" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={3} maxLength={500} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Ex: Code portail A1234, sonnette 2ème gauche, préfère être contacté le matin..." />
              <span className={`absolute bottom-2 right-3 text-xs font-medium ${(form.notes?.length || 0) >= 400 ? 'text-amber-500' : textMuted}`}>
                {form.notes?.length || 0} / 500
              </span>
            </div>
          </div>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t `}>
          <button onClick={() => { setShow(false); setEditId(null); }} className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors bg-surface-2 hover:bg-bord`}>
            <X size={16} />Annuler
          </button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl flex items-center gap-1.5 min-h-[44px] hover:shadow-lg transition-all" style={{background: couleur}}>
            <Check size={16} />{editId ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-3">
      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        onSubmit={handleQuickSubmit}
        isDark={isDark}
        couleur={couleur}
        existingClients={clients}
        onViewClient={(id) => { setShowQuickModal(false); setViewId(id); }}
      />

      {/* Duplicate confirmation modal */}
      {showDupeConfirm && pendingSubmit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDupeConfirm(false); setPendingSubmit(null); }} />
          <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border max-h-[90vh] overflow-y-auto bg-surface border-bord`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-alerte-fond`}>
                  <AlertTriangle size={20} className="text-amber-500" />
                </div>
                <h3 className={`text-lg font-bold ${textPrimary}`}>Doublon potentiel détecté</h3>
              </div>
              <p className={`text-sm mb-4 ${textSecondary}`}>
                Ce client semble être un doublon de :
              </p>
              <div className="space-y-2 mb-6">
                {strongDuplicates.map(dup => (
                  <div key={dup.id} className={`flex items-center justify-between p-3 rounded-xl border bg-surface-2 border-bord`}>
                    <div>
                      <p className={`font-semibold text-sm ${textPrimary}`}>{dup.nom} {dup.prenom || ''}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {dup.matchReason}
                        {dup.matchField === 'telephone' && dup.telephone && ` · ${dup.telephone}`}
                        {dup.matchField === 'email' && dup.email && ` · ${dup.email}`}
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowDupeConfirm(false); setPendingSubmit(null); setShow(false); setEditId(null); clearDupes(); setViewId(dup.id); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: couleur, backgroundColor: `${couleur}15` }}
                    >
                      Voir la fiche
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDupeConfirm(false); setPendingSubmit(null); }}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors bg-surface-2 text-encre-2 hover:bg-bord`}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => { setShowDupeConfirm(false); await doSubmit(pendingSubmit); setPendingSubmit(null); }}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: couleur }}
                >
                  Créer quand même
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== HEADER (design system) ========== */}
      <PageHeader
        icon={Users}
        title="Clients"
        subtitle={`${displayClients.length} contact${displayClients.length !== 1 ? 's' : ''}`}
        isDark={isDark}
        color={couleur}
        action={
          <>
            {contactPickerOk && canPerform('client', 'create') && (
              <button
                onClick={handleImportFromContacts}
                disabled={importingContacts}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border disabled:opacity-60 border-bord-fort text-encre-2 hover:bg-surface-2`}
                title="Importer depuis mes contacts"
                aria-label="Importer des clients depuis le répertoire du téléphone"
              >
                <Smartphone size={16} style={{ color: couleur }} />
              </button>
            )}
            {onImportClients && (
              <button
                onClick={onImportClients}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border border-bord-fort text-encre-2 hover:bg-surface-2`}
                title="Importer (CSV)"
                aria-label="Importer des clients (CSV)"
              >
                <Upload size={16} />
              </button>
            )}
            {canPerform('client', 'create') && (
              <button
                onClick={() => setShowQuickModal(true)}
                className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl text-sm font-semibold flex items-center justify-center sm:gap-2 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}d9)` }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nouveau client</span>
              </button>
            )}
          </>
        }
      />

      {/* KPI Cards — compact, clickable */}
      {displayClients.length > 0 && (() => {
        const caFacture = Array.from(clientStatsMap.values()).reduce((s, v) => s + v.ca, 0);
        const caEnAttente = Array.from(clientStatsMap.values()).reduce((s, v) => s + v.caEnCours, 0);
        const clientsActifs = displayClients.filter(c => getClientStatus(c.id) === 'actif').length;
        const devisEnAttente = (devis || []).filter(d => d.type === 'devis' && (d.statut === 'envoye' || d.statut === 'vu')).length;
        let topClient = null;
        let topCA = 0;
        clientStatsMap.forEach((v, cid) => {
          const totalClientCA = v.ca + v.caEnCours;
          if (totalClientCA > topCA) { topCA = totalClientCA; topClient = clients.find(c => c.id === cid); }
        });

        return (
          <div className="bandeau-chiffres grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              icon={Users}
              tone="info"
              label="Clients actifs"
              value={`${clientsActifs}`}
              sublabel={`sur ${displayClients.length}`}
              isDark={isDark}
              onClick={() => setKpiFilter(kpiFilter === 'actifs' ? null : 'actifs')}
            />
            <KPICard
              icon={Wallet}
              tone="money"
              label="Encaissé"
              value={formatMoney(caFacture, 0)}
              isDark={isDark}
              onClick={() => setKpiFilter(kpiFilter === 'ca' ? null : 'ca')}
            />
            <KPICard
              icon={TrendingUp}
              tone="neutral"
              label="En cours"
              value={formatMoney(caEnAttente, 0)}
              sublabel="factures à payer et devis signés"
              isDark={isDark}
            />
            <KPICard
              icon={FileText}
              tone="warning"
              label="Devis en attente"
              value={`${devisEnAttente}`}
              sublabel={devisEnAttente > 0 ? 'à relancer' : null}
              isDark={isDark}
              onClick={() => { if (setPage) setPage('devis'); }}
            />
          </div>
        );
      })()}

      {/* === DUPLICATE BANNER — compact + dismissable === */}
      {!duplicateDismissed && duplicateMap.size > 0 && !kpiFilter && (() => {
        const dupeCount = Math.ceil(duplicateMap.size / 2);
        // Build list of duplicate pairs for guided resolution
        const dupePairs = [];
        const visited = new Set();
        duplicateMap.forEach((dupes, clientId) => {
          if (visited.has(clientId)) return;
          const client = clients.find(c => c.id === clientId);
          if (!client) return;
          dupes.forEach(dupeId => {
            if (visited.has(dupeId)) return;
            const dupe = clients.find(c => c.id === dupeId);
            if (!dupe) return;
            dupePairs.push({ a: client, b: dupe });
            visited.add(clientId);
            visited.add(dupeId);
          });
        });
        return (
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 px-3 py-2 text-xs">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span className={`flex-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                {dupeCount} doublon{dupeCount > 1 ? 's' : ''} détecté{dupeCount > 1 ? 's' : ''} — Résolvez-les pour garder votre base propre
              </span>
              <button
                onClick={() => { setDuplicateDismissed(true); localStorage.setItem('clientDuplicateDismissed', 'true'); }}
                className={`shrink-0 p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-amber-100'}`}
              >
                <X size={14} />
              </button>
            </div>
            {/* Guided resolution list */}
            <div className={`border-t px-3 py-2 space-y-2 max-h-48 overflow-y-auto ${isDark ? 'border-amber-800/30' : 'border-amber-200'}`}>
              {dupePairs.slice(0, 5).map((pair, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded-lg bg-surface`}>
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold ${textPrimary}`}>{pair.a.nom} {pair.a.prenom || ''}</span>
                    <span className={`mx-1.5 ${textMuted}`}>↔</span>
                    <span className={`font-semibold ${textPrimary}`}>{pair.b.nom} {pair.b.prenom || ''}</span>
                    {pair.a.telephone && pair.b.telephone && pair.a.telephone.replace(/\s/g, '') === pair.b.telephone.replace(/\s/g, '') && (
                      <span className={`ml-1.5 text-xs text-alerte-texte`}>📱 même tél</span>
                    )}
                    {pair.a.email && pair.b.email && pair.a.email.toLowerCase() === pair.b.email.toLowerCase() && (
                      <span className={`ml-1.5 text-xs text-alerte-texte`}>✉ même email</span>
                    )}
                  </div>
                  <button
                    onClick={() => mergeClients(pair.a.id, pair.b.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex-shrink-0 hover:opacity-90"
                    style={{ background: couleur }}
                  >
                    Fusionner
                  </button>
                  <button
                    onClick={() => setViewId(pair.a.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 text-encre-3 hover:bg-surface-2`}
                  >
                    Comparer
                  </button>
                </div>
              ))}
              {dupePairs.length > 5 && (
                <p className={`text-xs text-center ${textMuted}`}>+{dupePairs.length - 5} autre{dupePairs.length - 5 > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* === RECHERCHE, FILTRES, TRI — boîte à outils commune (ui/Filtres.jsx) === */}
      {(() => {
        const TRIS = [['recent-desc', 'Plus récents'], ['name-asc', 'Nom de A à Z'], ['name-desc', 'Nom de Z à A'], ['ca-desc', "Chiffre d'affaires"], ['activite-desc', 'Activité récente']];
        const triCourant = `${sortBy}-${sortDir}`;
        const KPI_LIBELLES = { actifs: 'Clients actifs', ca: "Avec chiffre d'affaires", devis_attente: 'Devis en attente' };
        const nbFiltres = !!filterCategorie + !!kpiFilter;
        const toutEffacer = () => { setKpiFilter(null); setFilterCategorie(''); setFilterStatus(''); };
        const puces = [
          filterCategorie && { cle: 'type', libelle: `${TYPE_ICONS[filterCategorie] || ''} ${filterCategorie}`.trim(), onRetirer: () => setFilterCategorie('') },
          kpiFilter && { cle: 'kpi', libelle: KPI_LIBELLES[kpiFilter] || 'Filtre', onRetirer: () => setKpiFilter(null) },
        ].filter(Boolean);
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ChampRecherche valeur={search} onChange={setSearch} placeholder="Rechercher…" ariaLabel="Rechercher un client" isDark={isDark} couleur={couleur} className="flex-1" />
              <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={nbFiltres} ouvert={volet === 'filtres'} onClick={() => setVolet(v => (v === 'filtres' ? null : 'filtres'))} isDark={isDark} couleur={couleur} libelleCacheTelephone />
              <BoutonVolet ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={TRIS.find(x => x[0] === triCourant)?.[1]} ouvert={volet === 'tri'} onClick={() => setVolet(v => (v === 'tri' ? null : 'tri'))} isDark={isDark} couleur={couleur} libelleCacheTelephone />
            </div>
            {displayClients.length > 1 && (
              <SegmentDefilant
                ariaLabel="Statut des clients" isDark={isDark} couleur={couleur}
                options={[{ valeur: '', libelle: 'Tous' }, { valeur: 'actif', libelle: 'Actifs' }, { valeur: 'prospect', libelle: 'Prospects' }, { valeur: 'inactif', libelle: 'Inactifs' }]}
                valeur={filterStatus} onChange={setFilterStatus}
              />
            )}
            <PucesActives puces={puces} onToutEffacer={toutEffacer} isDark={isDark} couleur={couleur} />

            <Volet
              ouvert={volet === 'filtres'} onFermer={() => setVolet(null)} titre="Filtres" ancreRef={boutonFiltresRef} largeur={340} isDark={isDark}
              pied={(
                <>
                  <button type="button" onClick={toutEffacer} disabled={!nbFiltres} className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 text-encre-2 hover:bg-surface-2`}>Tout effacer</button>
                  <button type="button" onClick={() => setVolet(null)} className="flex-1 h-11 rounded-xl text-white text-sm font-bold shadow-sm" style={{ background: couleur }}>
                    Voir {filtered.length} client{filtered.length > 1 ? 's' : ''}
                  </button>
                </>
              )}
            >
              <ListeChoix
                titre="Type de client" rechercheAuDela={99} isDark={isDark} couleur={couleur}
                options={[{ valeur: '', libelle: 'Tous les types' }, ...CLIENT_TYPES.map(t => ({ valeur: t, libelle: `${TYPE_ICONS[t] || '📋'}  ${t}` }))]}
                valeur={filterCategorie} onChange={setFilterCategorie}
              />
              {kpiFilter && (
                <GroupeChoix titre="Sélection des chiffres" options={[{ valeur: kpiFilter, libelle: KPI_LIBELLES[kpiFilter] || 'Filtre' }]} valeur={kpiFilter} onChange={() => setKpiFilter(null)} isDark={isDark} couleur={couleur} />
              )}
            </Volet>

            <Volet ouvert={volet === 'tri'} onFermer={() => setVolet(null)} titre="Trier et afficher" ancreRef={boutonTriRef} largeur={320} isDark={isDark}>
              <ListeChoix
                titre="Trier par" rechercheAuDela={99} isDark={isDark} couleur={couleur}
                options={TRIS.map(([valeur, libelle]) => ({ valeur, libelle }))}
                valeur={triCourant} onChange={(v) => { const [tri, sens] = v.split('-'); setSortBy(tri); setSortDir(sens); setVolet(null); }}
              />
              <GroupeChoix
                titre="Affichage" isDark={isDark} couleur={couleur}
                options={[{ valeur: 'grid', libelle: 'Cartes', icone: LayoutGrid }, { valeur: 'list', libelle: 'Liste', icone: List }]}
                valeur={viewMode} onChange={(v) => { setViewMode(v); setVolet(null); }}
              />
            </Volet>
          </div>
        );
      })()}


      {/* Skeleton loader while data is loading */}
      {!clients && <ClientSkeleton isDark={isDark} />}

      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {(() => {
            // P2.4: Contextual empty states
            const hasSearch = !!debouncedSearch;
            const hasKpiFilter = !!kpiFilter;
            const hasTypeFilter = !!filterCategorie;
            const hasAnyFilter = hasKpiFilter || hasTypeFilter;
            const noClientsAtAll = displayClients.length === 0;

            // Case 1: No clients at all
            if (noClientsAtAll && !hasSearch) return (
              <>
                <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                      <Users size={40} className="text-white" />
                    </div>
                    <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>Votre premier client ?</h2>
                    <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>Gérez vos contacts clients, leur historique et facilitez vos échanges.</p>
                  </div>
                </div>
                <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { icon: Phone, label: 'Contact rapide', sub: 'Appel, SMS, WhatsApp' },
                      { icon: FileText, label: 'Historique complet', sub: 'Devis, factures, chantiers' },
                      { icon: MapPin, label: 'Itinéraire GPS', sub: 'Navigation directe' },
                    ].map(f => (
                      <div key={f.label} className={`flex items-start gap-3 p-3 rounded-xl bg-surface`}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                          <f.icon size={18} style={{ color: couleur }} />
                        </div>
                        <div><p className={`font-medium text-sm ${textPrimary}`}>{f.label}</p><p className={`text-xs ${textMuted}`}>{f.sub}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => setShow(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                      <Plus size={18} /> Ajouter un client
                    </button>
                    {contactPickerOk && (
                      <button onClick={handleImportFromContacts} disabled={importingContacts} className={`px-6 py-3 rounded-xl flex items-center justify-center gap-2 border-2 border-dashed font-medium transition-all disabled:opacity-60 border-bord-fort text-encre-2 hover:bg-surface`}>
                        <Smartphone size={18} style={{ color: couleur }} /> {importingContacts ? 'Ouverture…' : 'Depuis mes contacts'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            );

            // Case 2: Search with no results
            if (hasSearch) return (
              <div className="p-8 sm:p-10 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-surface-2`}>
                  <Search size={28} className={'text-encre-3'} />
                </div>
                <h2 className={`text-lg font-bold mb-1 ${textPrimary}`}>
                  Aucun résultat pour « {debouncedSearch} »
                </h2>
                <p className={`text-sm ${textMuted} mb-6`}>Vérifiez l'orthographe ou créez un nouveau client.</p>
                <button
                  onClick={() => { setForm(p => ({...p, nom: debouncedSearch})); setShow(true); setSearch(''); }}
                  className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium"
                  style={{ background: couleur }}
                >
                  <Plus size={18} /> Créer « {debouncedSearch} » comme client
                </button>
              </div>
            );

            // Case 3: Filter with no results
            if (hasAnyFilter) return (
              <div className="p-8 sm:p-10 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-surface-2`}>
                  <Users size={28} className={'text-encre-3'} />
                </div>
                <h2 className={`text-lg font-bold mb-1 ${textPrimary}`}>Aucun client ne correspond à ce filtre</h2>
                <p className={`text-sm ${textMuted} mb-6`}>
                  {hasKpiFilter && `Filtre : ${kpiFilter === 'actifs' ? 'Clients actifs' : kpiFilter === 'ca' ? 'CA > 0' : 'Devis en attente'}`}
                  {hasKpiFilter && hasTypeFilter && ' · '}
                  {hasTypeFilter && `Type : ${filterCategorie}`}
                </p>
                <button
                  onClick={() => { setKpiFilter(null); setFilterCategorie(''); }}
                  className={`px-6 py-3 rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium bg-surface-2 text-encre-2 hover:bg-bord`}
                >
                  <X size={18} /> Effacer les filtres
                </button>
              </div>
            );

            // Fallback
            return (
              <div className="p-8 text-center">
                <p className={`font-medium ${textPrimary}`}>Aucun client trouvé</p>
              </div>
            );
          })()}
        </div>
      ) : viewMode === 'grid' ? (
        // Une ligne par client (refonte du 9 oct. 2026 — revue visuelle, problème 13) : qui, où, ce
        // qu'il doit ou son dernier devis, et appeler d'un geste. Avant : avatars en dégradés aléatoires,
        // 3 pastilles, micro-compteurs, ni ville ni montant dû au téléphone.
        <GroupeListe className="max-w-4xl">
          {getSortedClients().map(c => {
            const status = getClientStatus(c.id);
            const du = dueParClient.get(c.id) || 0;
            const dernierDevis = dernierDevisParClient.get(c.id);
            const meta = [c.entreprise, villeDe(c.adresse)].filter(Boolean).join(' · ') || c.telephone || c.email || 'Coordonnées à compléter';
            const hasDuplicates = duplicateMap.has(c.id);
            return (
              <div key={c.id} className="flex items-center">
                <LigneListe
                  className="flex-1 min-w-0"
                  onClick={() => setViewId(c.id)}
                  chevron={!c.telephone}
                  aria-label={`Ouvrir la fiche de ${formatClientName(c)}`}
                  debut={<Avatar nom={formatClientName(c) || c.nom} />}
                  titre={<HighlightText text={formatClientName(c)} query={debouncedSearch} />}
                  meta={meta}
                  montant={du > 0 ? (
                    <span className="flex flex-col items-end leading-tight">
                      <span>{formatMoney(du, 0)}</span>
                      <span className="text-xs font-medium text-encre-3">à encaisser</span>
                    </span>
                  ) : dernierDevis ? (
                    <span className="text-xs font-medium text-encre-3">Devis du {new Date(dernierDevis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  ) : undefined}
                  pastille={hasDuplicates ? <Pastille ton="alerte">Doublon</Pastille> : <PastilleStatut genre="client" statut={status} />}
                />
                {c.telephone ? (
                  <BoutonIcone icone={Phone} libelle={`Appeler ${formatClientName(c)}`} variante="secondaire" onClick={() => callPhone(c.telephone)} className="mr-3" />
                ) : null}
              </div>
            );
          })}
        </GroupeListe>
      ) : (
        /* Vue Liste compacte */
        <div className={`${cardBg} rounded-xl border overflow-hidden`}>
          {/* Header row - desktop only */}
          <div className={`hidden sm:grid grid-cols-[40px_1fr_100px_100px_140px_80px_80px_70px] gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wider bg-surface-2 text-encre-3`}>
            <span></span>
            <span>Client</span>
            <span>{showTypeColumn ? 'Type' : 'Activité'}</span>
            <span>Téléphone</span>
            <span>Email</span>
            <span className="text-right">CA</span>
            <span className="text-center">Stats</span>
            <span></span>
          </div>
          {getSortedClients().map((c, idx) => {
            const s = getClientStats(c.id);
            const status = getClientStatus(c.id);
            const statusColor = CLIENT_STATUS_COLORS[status];
            const typeColor = CLIENT_TYPE_COLORS[c.categorie];
            const avatarBg = colorForString(formatClientName(c) || c.nom || String(c.id));
            const initials = getInitials(c);
            const hasDuplicates = duplicateMap.has(c.id);
            const cScore = getClientScore(c.id);

            return (
              <div
                key={c.id}
                className={`group cursor-pointer transition-colors hover:bg-surface-2 ${idx > 0 ? `border-t border-bord` : ''}`}
                onClick={() => setViewId(c.id)}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[40px_1fr_100px_100px_140px_80px_80px_70px] gap-3 px-4 py-2.5 items-center">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: avatarBg }}>
                    {initials}
                  </div>
                  {/* Name + company + status */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <HighlightText text={formatClientName(c)} query={debouncedSearch} className={`font-medium text-sm ${textPrimary} truncate`} />
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${isDark ? statusColor.darkBg + ' ' + statusColor.darkText : statusColor.bg + ' ' + statusColor.text}`} title={STATUS_TOOLTIPS[status] || ''}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                        {CLIENT_STATUS_LABELS[status]}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${isDark ? cScore.darkBg : cScore.bg}`} title={`Score : ${cScore.score}/100`}>
                        <span className="text-xs">{cScore.icon}</span> {cScore.label}
                      </span>
                      {hasDuplicates && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-alerte-fond text-alerte-texte`}>
                          <AlertTriangle size={9} /> Doublon
                        </span>
                      )}
                      {!isProduction && isTestClient(c) && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                          🧪 Test
                        </span>
                      )}
                    </div>
                    {c.entreprise && <p className={`text-xs ${textMuted} truncate`}>{c.entreprise}</p>}
                  </div>
                  {/* Type or Last Activity */}
                  <div>
                    {showTypeColumn ? (
                      c.categorie && typeColor ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? typeColor.darkBg + ' ' + typeColor.darkText : typeColor.bg + ' ' + typeColor.text}`}>
                          <span>{TYPE_ICONS[c.categorie] || ''}</span> {c.categorie}
                        </span>
                      ) : (
                        <span className={`text-xs ${textMuted}`}>—</span>
                      )
                    ) : (
                      (() => {
                        const lastAct = getLastActivity(c.id);
                        if (!lastAct) return <span className={`text-xs ${textMuted}`}>—</span>;
                        const days = Math.max(0, Math.floor((Date.now() - lastAct) / (1000 * 60 * 60 * 24)));
                        const label = days === 0 ? "Aujourd'hui" : days === 1 ? 'Hier' : days < 30 ? `il y a ${days}j` : days < 365 ? `il y a ${Math.floor(days / 30)}m` : `il y a ${Math.floor(days / 365)}a`;
                        const colorCls = days < 30 ? 'text-emerald-500' : days < 90 ? textSecondary : days < 180 ? 'text-amber-500' : 'text-red-400';
                        return <span className={`text-xs font-medium ${colorCls}`} title={new Date(lastAct).toLocaleDateString('fr-FR')}>{label}</span>;
                      })()
                    )}
                  </div>
                  {/* Phone */}
                  {c.telephone ? <HighlightText text={c.telephone} query={debouncedSearch} className={`text-xs ${textSecondary} truncate`} /> : <span className={`text-xs ${textMuted}`}>—</span>}
                  {/* Email */}
                  {c.email ? <HighlightText text={c.email} query={debouncedSearch} className={`text-xs ${textMuted} truncate`} /> : <span className={`text-xs ${textMuted}`}>—</span>}
                  {/* CA */}
                  <span className={`text-xs font-bold text-right ${s.ca > 0 ? '' : textMuted}`} style={s.ca > 0 ? { color: couleur } : {}}>{formatMoney(s.ca)}</span>
                  {/* Stats */}
                  <div className="flex items-center justify-center gap-2">
                    <span className={`flex items-center gap-0.5 text-xs ${s.chantiers > 0 ? textSecondary : textMuted}`} title="Chantiers">
                      <Home size={10} className={s.chantiers > 0 ? 'text-emerald-500' : ''} /> {s.chantiers}
                    </span>
                    <span className={`flex items-center gap-0.5 text-xs ${s.devis > 0 ? textSecondary : textMuted}`} title="Devis">
                      <FileText size={10} className={s.devis > 0 ? 'text-blue-500' : ''} /> {s.devis}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                    {c.telephone && (
                      <>
                        <button onClick={() => callPhone(c.telephone)} className={`w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-blue-900/40' : 'hover:bg-blue-50'}`} title="Appeler">
                          <Phone size={13} className="text-blue-500" />
                        </button>
                        <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} className={`w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-green-900/40' : 'hover:bg-green-50'}`} title="WhatsApp">
                          <MessageCircle size={13} className="text-green-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: avatarBg }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <HighlightText text={formatClientName(c)} query={debouncedSearch} className={`font-medium text-sm ${textPrimary} truncate`} />
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor.dot}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.entreprise && <span className={`text-xs ${textMuted} truncate`}>{c.entreprise}</span>}
                      <span className={`text-xs font-medium ${s.ca > 0 ? '' : textMuted}`} style={s.ca > 0 ? { color: couleur } : {}}>{formatMoney(s.ca)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {c.telephone && (
                      <button onClick={() => callPhone(c.telephone)} className={`w-11 h-11 rounded-lg flex items-center justify-center ${isDark ? 'hover:bg-blue-900/40' : 'hover:bg-blue-50'}`}>
                        <Phone size={18} className="text-blue-500" />
                      </button>
                    )}
                  </div>
                  <ChevronRight size={16} className={textMuted} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Client Activity Tab (sub-component) ──
function ClientActivityTab({ clientId, clientDevis, clientChantiers, isDark, couleur, modeDiscret }) {
  const [entries, setEntries] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setIsLoading(true);

    const sb = isDemo ? null : supabase;

    const load = async () => {
      const results = [];

      // Get client audit entries
      const clientEntries = await getEntityHistory(sb, 'client', clientId, { limit: 50 });
      results.push(...clientEntries);

      // Get linked devis/factures audit entries
      const devisIds = (clientDevis || []).map(d => d.id);
      if (devisIds.length > 0) {
        const devisEntries = await getEntitiesHistory(sb, 'devis', devisIds, { limit: 50 });
        results.push(...devisEntries);
      }

      // Get linked chantiers audit entries
      const chantierIds = (clientChantiers || []).map(c => c.id);
      if (chantierIds.length > 0) {
        const chantierEntries = await getEntitiesHistory(sb, 'chantier', chantierIds, { limit: 50 });
        results.push(...chantierEntries);
      }

      // Sort by date DESC
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (!cancelled) {
        setEntries(results.slice(0, 100));
        setIsLoading(false);
      }
    };

    load().catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, clientDevis, clientChantiers]);

  return (
    <div className="p-4">
      <AuditTimeline
        entries={entries}
        isDark={isDark}
        couleur={couleur}
        modeDiscret={modeDiscret}
        isLoading={isLoading}
        emptyMessage="Aucune activité enregistrée pour ce client"
        showEntityBadge={true}
      />
    </div>
  );
}
