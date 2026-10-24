/**
 * DevisComposer — Éditeur de devis single-canvas, fluide et vivant.
 *
 * Un seul écran : client + lignes éditables inline avec autocomplétion
 * catalogue instantanée + barre de total live animée. Pensé rapide,
 * agréable, mobile-first. Produit des devis 100% compatibles (même
 * format de données que DevisWizard).
 *
 * @module DevisComposer
 */

import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Plus, Search, Trash2, ChevronUp, ChevronDown, User,
  UserPlus, FileText, Receipt, Check, Loader2, Percent, StickyNote,
  Package, Zap, CornerDownLeft, Droplets, Paintbrush, Hammer, Star, Sparkles, Ruler, X,
  Eye, AlertTriangle, Library, Layers, GripVertical, Building2,
} from 'lucide-react';
import QuickClientModal from './QuickClientModal';
import { generateId } from '../lib/utils';
import { formatClientName } from '../lib/formatters';
import { buildDevisHtml } from '../lib/devisHtmlBuilder';
import { calculerTotaux, messageLigneSansDesignation } from '../lib/totauxDocument';
import { estFranchiseTva, premierTaux } from '../lib/franchiseTva';
import { TRADE_LIBRARY } from '../lib/templates/trade-library';
import { jourLocal } from '../lib/dates';
import { profilManquant, enPhrase } from '../lib/profilLegal';
import { couleurPleine } from '../lib/theme';
import { calculerMetre } from '../lib/metre';

const DRAFT_KEY = 'mallettico_devis_composer_draft';
const MRU_KEY = 'mallettico_recent_clients';
const RECENT_ARTICLES_KEY = 'mallettico_recent_articles';
const UNITES = ['u', 'm²', 'ml', 'm³', 'h', 'j', 'forfait', 'ens.', 'pièce', 'kg', 'L', 'lot'];
// Libellés de champ en casse normale, 14 px (audit UX du 20 oct. 2026 : capitales de 11 px, sous le minimum de 12 px)
const LIBELLE = 'block mb-1.5 text-sm font-medium text-encre-2';
// Une seule hauteur de champ, 48 px, texte de 16 px au téléphone (pas de zoom de Safari) ; le tableau des lignes au bureau
// garde ses cellules de 36 px
const CHAMP = 'w-full px-3 h-12 rounded-xl border text-base sm:text-sm';

/** Modèles métier : squelettes de devis prêts à chiffrer (mêmes trames que le formulaire classique). */
const METIER_TEMPLATES = [
  { label: 'Rénovation SDB', Icon: Droplets, lignes: ['Dépose sanitaires existants', 'Démolition carrelage mural et sol', 'Alimentation eau chaude/froide', 'Évacuation', 'Pose carrelage sol', 'Pose faïence murale', 'Pose douche italienne', 'Pose meuble vasque', 'Pose WC suspendu'] },
  { label: 'Peinture', Icon: Paintbrush, lignes: ['Protection sols et meubles', 'Lessivage des murs', 'Rebouchage fissures', 'Peinture murs 2 couches', 'Peinture plafond', 'Peinture boiseries'] },
  { label: 'Électricité', Icon: Zap, lignes: ['Pose tableau électrique', 'Tirage de câbles', 'Pose prises et interrupteurs', 'Pose points d\'éclairage'] },
  { label: 'Démolition', Icon: Hammer, lignes: ['Dépose des revêtements existants', 'Évacuation des gravats', 'Nettoyage du chantier'] },
];

/** Accent des factures dans l'éditeur (indigo) — distinct de la couleur devis
 *  (celle de l'entreprise), pour qu'on ne confonde jamais les deux à l'écran. */
const FACTURE_ACCENT = '#6366f1';

const eur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

/** Parse un nombre saisi à la française : accepte « 1,5 » comme « 1.5 ». */
const num = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};


/** Normalise pour recherche : minuscules + sans accents (« faience » trouve « faïence »). */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Nombre animé (tween) — l'effet « chiffres qui montent » qui rend la barre de total vivante. */
function useAnimatedNumber(value, duration = 450) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      setDisplay(value); return;
    }
    cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    startRef.current = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  useEffect(() => { fromRef.current = display; }); // keep ref fresh between renders
  return display;
}

export default function DevisComposer({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  initialData = null,
  clientInitial = null,
  chantierInitial = null,
  clients = [],
  addClient,
  catalogue = [],
  chantiers = [],
  entreprise = {},
  customTemplates = [],
  addTemplate,
  showToast,
  onCompleteProfile,
  isDark = false,
  couleur,
  onPreview,
}) {
  const isEditMode = !!initialData;
  // Franchise en base (art. 293 B CGI) : aucune TVA, ni à l'écran ni dans ce qui est enregistré
  const franchise = estFranchiseTva(entreprise);
  const tvaEntreprise = franchise ? 0 : premierTaux(entreprise?.tvaDefaut, entreprise?.tva_defaut, 10);

  const blankForm = () => ({
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: jourLocal(),
    validite: entreprise?.validiteDevis || entreprise?.validite_devis || 30,
    tvaDefaut: tvaEntreprise,
    lignes: [],
    remise: 0,
    acompte: 0,
    conditions: '',
    notes: '',
    travauxUrgents: false,
  });

  const [form, setForm] = useState(blankForm);
  const [focusLotId, setFocusLotId] = useState(null);
  const [metreLineId, setMetreLineId] = useState(null);
  const [margeLineId, setMargeLineId] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  // Boucle clavier : après ajout d'une ligne, focus Qté (article chiffré) ou PU (ligne libre)
  const [focusField, setFocusField] = useState(null); // { lineId, field }
  const [focusSearchTick, setFocusSearchTick] = useState(0); // incrément → refocus la recherche
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  // Lots repliés (ids des marqueurs de section) — un gros devis tient à l'écran
  // quand on referme les lots déjà chiffrés.
  const [collapsedLots, setCollapsedLots] = useState(() => new Set());
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [error, setError] = useState('');

  // ── Theme ──
  const cardBg = 'bg-surface border-bord';
  const inputBg = 'bg-surface border-bord text-encre placeholder:text-encre-3';
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const rowHover = 'hover:bg-surface-2';

  // ── Load initialData / restore draft ──
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      const tvaDef = franchise ? 0 : premierTaux(initialData.tvaRate, initialData.tva_rate, tvaEntreprise);
      const mapLigne = (l, i) => ({
        id: l.id || `line-${i}-${Date.now()}`,
        description: l.description || '',
        quantite: l.quantite ?? 1,
        unite: l.unite || 'u',
        prixUnitaire: l.prixUnitaire ?? 0,
        prixAchat: l.prixAchat ?? 0,
        tva: premierTaux(l.tva, tvaDef),
      });
      // Restaurer les lots : si le devis a des sections titrées, reconstruire la
      // liste plate avec les marqueurs _isSection (sinon l'édition perdrait les lots).
      const secs = Array.isArray(initialData.sections) ? initialData.sections.filter(s => (s?.lignes || []).length) : [];
      const hasTitledLots = secs.some(s => (s.titre || '').trim());
      const lignes = hasTitledLots
        ? secs.flatMap((s, si) => [
            ...((s.titre || '').trim() ? [{ id: s.id || `sec-${si}`, _isSection: true, description: (s.titre || '').trim() }] : []),
            ...s.lignes.map(mapLigne),
          ])
        : (initialData.lignes || []).map(mapLigne);
      setForm({
        type: initialData.type || 'devis',
        clientId: initialData.client_id || '',
        chantierId: initialData.chantier_id || '',
        date: initialData.date || jourLocal(),
        validite: initialData.validite || entreprise?.validiteDevis || 30,
        tvaDefaut: tvaDef,
        lignes,
        remise: initialData.remise || 0,
        acompte: initialData.acompte_pct || initialData.acompte || 0,
        conditions: initialData.conditions || '',
        notes: initialData.notes || '',
        travauxUrgents: initialData.travaux_urgents === true,
      });
      return;
    }
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      const draft = saved ? JSON.parse(saved) : null;
      // Ouvert depuis une fiche client : on part de ce client, sauf si un brouillon chiffré attend
      // (le perdre coûterait plus que de rechoisir le client).
      if (clientInitial && !(draft?.lignes?.length > 0)) {
        setForm({ ...blankForm(), clientId: clientInitial, chantierId: chantierInitial || '' });
      } else if (draft && (draft.clientId || draft.lignes?.length > 0)) {
        setForm({ ...blankForm(), ...draft, date: jourLocal() });
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 5000);
      } else {
        // Pas de brouillon : repartir d'un formulaire vierge (le composant reste monté entre deux ouvertures)
        setForm(blankForm());
      }
    } catch {
      setForm(blankForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, clientInitial, chantierInitial]);

  // ── Autosave draft (create mode only) ──
  useEffect(() => {
    if (!isOpen || isEditMode) return;
    if (!form.clientId && form.lignes.length === 0) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* quota */ }
    }, 500);
    return () => clearTimeout(t);
  }, [form, isOpen, isEditMode]);

  const clearDraft = useCallback(() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }, []);

  // ── Totals ──
  // Totaux arrondis par taux après remise (src/lib/totauxDocument.js) : ce qui est enregistré est ce
  // que le document imprime, et HT + TVA = TTC au centime (relecture juridique du 9 oct. 2026).
  const totals = useMemo(() => {
    let totalCost = 0;
    form.lignes.forEach(l => { if (!l._isSection) totalCost += num(l.quantite) * num(l.prixAchat); });
    const t = calculerTotaux(
      form.lignes.map(l => (l._isSection ? l : { ...l, montant: undefined, quantite: num(l.quantite), prixUnitaire: num(l.prixUnitaire), tva: l.tva !== undefined ? l.tva : form.tvaDefaut })),
      { remisePct: form.remise, tauxDefaut: form.tvaDefaut, toutesLesLignes: true, franchise },
    );
    const totalHT = t.totalLignesHT;
    const tvaTotal = form.remise ? t.totalTVA / (1 - form.remise / 100 || 1) : t.totalTVA;
    const remiseAmount = t.remiseMontant;
    const htApresRemise = t.totalHT;
    const tvaApresRemise = t.totalTVA;
    const totalTTC = t.totalTTC;
    const costAfterRemise = totalCost * (1 - form.remise / 100);
    const margePercent = htApresRemise > 0 ? ((htApresRemise - costAfterRemise) / htApresRemise) * 100 : 0;
    return { totalHT, tvaTotal, remiseAmount, htApresRemise, tvaApresRemise, totalTTC, margePercent, tvaParTaux: t.tvaParTaux };
  }, [form.lignes, form.tvaDefaut, form.remise, franchise]);

  const animatedTTC = useAnimatedNumber(totals.totalTTC);

  // ── Clients ──
  const selectedClient = clients.find(c => c.id === form.clientId);
  const recentClients = useMemo(() => {
    try {
      const ids = JSON.parse(localStorage.getItem(MRU_KEY) || '[]');
      return ids.map(id => clients.find(c => c.id === id)).filter(Boolean);
    } catch { return []; }
  }, [clients]);
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => (c.nom || '').toLowerCase().includes(q) || (c.prenom || '').toLowerCase().includes(q) || (c.entreprise || '').toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const selectClient = (id) => {
    setForm(p => ({ ...p, clientId: id }));
    try {
      const recent = JSON.parse(localStorage.getItem(MRU_KEY) || '[]').filter(x => x !== id);
      recent.unshift(id);
      localStorage.setItem(MRU_KEY, JSON.stringify(recent.slice(0, 5)));
    } catch { /* ignore */ }
    setShowClientPicker(false);
    setClientSearch('');
  };

  // ── Articles fréquents (favoris + récemment utilisés) ──
  const rememberArticle = useCallback((item) => {
    if (!item || !item.id) return;
    try {
      const prev = JSON.parse(localStorage.getItem(RECENT_ARTICLES_KEY) || '[]').filter(x => x && x.id !== item.id);
      prev.unshift({ id: item.id, nom: item.nom || item.designation || '', prix: item.prix ?? item.prixUnitaire ?? 0, unite: item.unite || 'u', prixAchat: item.prixAchat ?? 0, categorie: item.categorie || '', tva: item.tva ?? item.tva_rate });
      localStorage.setItem(RECENT_ARTICLES_KEY, JSON.stringify(prev.slice(0, 8)));
    } catch { /* ignore */ }
  }, []);

  const quickArticles = useMemo(() => {
    let recents = [];
    try { recents = JSON.parse(localStorage.getItem(RECENT_ARTICLES_KEY) || '[]'); } catch { /* ignore */ }
    const favs = (catalogue || []).filter(c => c.favori);
    // Un récent est repris tel qu'il est AUJOURD'HUI dans le catalogue (prix, TVA) ; la copie mémorisée
    // ne sert que pour un article absent du catalogue. Avant : la copie, sans TVA → 10 % (recette du 9 oct.).
    const parId = new Map((catalogue || []).map(c => [c.id, c]));
    const seen = new Set();
    const merged = [];
    [...recents.map(r => (r && parId.get(r.id)) || r), ...favs].forEach(a => { if (a && a.id && !seen.has(a.id)) { seen.add(a.id); merged.push(a); } });
    return merged.slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, isOpen]);

  // ── Lignes ──
  const addLigne = (item = {}) => {
    if (item.id) rememberArticle(item);
    const newId = generateId();
    const prix = item.prixUnitaire ?? item.prix ?? 0;
    setForm(p => ({
      ...p,
      lignes: [...p.lignes, {
        id: newId,
        description: item.designation || item.nom || item.description || '',
        quantite: item.quantite || 1,
        unite: item.unite || 'u',
        prixUnitaire: prix,
        prixAchat: item.prixAchat ?? 0,
        // La bibliothèque porte le taux adapté à la nature des travaux
        // (5,5 % rénovation énergétique, 20 % neuf/extérieur) : le respecter
        // plutôt que d'imposer le taux par défaut du devis (`tva_rate` : articles de démo).
        tva: premierTaux(item.tva, item.tva_rate, p.tvaDefaut),
      }],
    }));
    // Article chiffré → la prochaine saisie est la quantité ; ligne libre → le prix
    setFocusField({ lineId: newId, field: prix > 0 ? 'quantite' : 'prixUnitaire' });
  };

  // Trame de métier : structure de lignes SANS prix (l'artisan chiffre).
  // Ajoute à la suite plutôt que d'écraser le travail déjà saisi.
  const applyTemplate = (tpl) => {
    setForm(p => ({
      ...p,
      lignes: [...p.lignes, ...tpl.lignes.map(desc => ({
        id: generateId(), description: desc, quantite: 1, unite: 'u', prixUnitaire: 0, prixAchat: 0, tva: p.tvaDefaut,
      }))],
    }));
  };

  // Charger un modèle perso (lignes chiffrées enregistrées par l'artisan)
  const applyPersoTemplate = (tpl) => {
    const lignes = (tpl.lignes || []).map(l => ({
      id: generateId(),
      description: l.description || '',
      quantite: l.quantite ?? 1,
      unite: l.unite || 'u',
      prixUnitaire: l.prixUnitaire ?? l.prix ?? 0,
      prixAchat: l.prixAchat ?? 0,
      tva: premierTaux(l.tva, tpl.tva_defaut, form.tvaDefaut),
    }));
    setForm(p => ({ ...p, lignes, tvaDefaut: franchise ? 0 : premierTaux(tpl.tva_defaut, tpl.tvaDefaut, p.tvaDefaut), notes: tpl.notes || p.notes }));
  };

  const saveAsTemplate = async (nom, categorie) => {
    const priced = form.lignes.filter(l => !l._isSection && (l.description || '').trim());
    if (!priced.length) { showToast?.('Ajoutez des lignes avant d\'enregistrer un modèle', 'error'); return; }
    try {
      await addTemplate?.({
        nom: (nom || '').trim(),
        categorie: (categorie || '').trim() || 'Mes modèles',
        description: 'Créé depuis le composer',
        lignes: priced.map(l => ({ description: l.description, quantite: num(l.quantite) || 1, unite: l.unite || 'u', prixUnitaire: Math.abs(num(l.prixUnitaire)), prixAchat: num(l.prixAchat), tva: l.tva })),
        tva_defaut: form.tvaDefaut,
        notes: form.notes || '',
      });
      setShowSaveTemplate(false);
      showToast?.(`Modèle « ${(nom || '').trim()} » enregistré`, 'success');
    } catch {
      showToast?.('Erreur lors de l\'enregistrement du modèle', 'error');
    }
  };
  const updateLigne = (id, field, value) => setForm(p => ({ ...p, lignes: p.lignes.map(l => l.id === id ? { ...l, [field]: value } : l) }));
  const removeLigne = (id) => setForm(p => ({ ...p, lignes: p.lignes.filter(l => l.id !== id) }));
  const moveLigne = (index, dir) => setForm(p => {
    const n = [...p.lignes]; const j = index + dir;
    if (j < 0 || j >= n.length) return p;
    [n[index], n[j]] = [n[j], n[index]];
    return { ...p, lignes: n };
  });
  const duplicateLigne = (id) => setForm(p => {
    const i = p.lignes.findIndex(l => l.id === id);
    if (i < 0) return p;
    const copy = { ...p.lignes[i], id: generateId() };
    const n = [...p.lignes]; n.splice(i + 1, 0, copy);
    return { ...p, lignes: n };
  });
  // ── Lots (titres de section) ──
  const insertLotAbove = (index) => {
    const id = generateId();
    setForm(p => {
      const n = [...p.lignes];
      n.splice(index, 0, { id, _isSection: true, description: '' });
      return { ...p, lignes: n };
    });
    setFocusLotId(id);
  };
  const addLot = () => {
    const id = generateId();
    setForm(p => ({ ...p, lignes: [...p.lignes, { id, _isSection: true, description: '' }] }));
    setFocusLotId(id);
  };

  /**
   * Ajoute un bloc de lignes à la suite, éventuellement précédé d'un titre de lot.
   * AJOUTE — n'écrase jamais : un devis réel s'assemble par blocs successifs
   * (la SDB, puis l'électricité, puis la peinture).
   */
  const appendBloc = (lignes, lotTitre) => {
    if (!lignes?.length) return;
    setForm(p => {
      const bloc = [];
      if (lotTitre) bloc.push({ id: generateId(), _isSection: true, description: lotTitre });
      lignes.forEach(l => bloc.push({
        id: generateId(),
        description: l.designation || l.nom || l.description || '',
        quantite: l.quantite ?? 1,
        unite: l.unite || 'u',
        prixUnitaire: l.prixUnitaire ?? l.prix ?? 0,
        prixAchat: l.prixAchat ?? 0,
        tva: l.tva !== undefined ? l.tva : p.tvaDefaut,
      }));
      return { ...p, lignes: [...p.lignes, ...bloc] };
    });
    showToast?.(
      lotTitre ? `Lot « ${lotTitre} » ajouté — ${lignes.length} ligne${lignes.length > 1 ? 's' : ''}`
               : `${lignes.length} ligne${lignes.length > 1 ? 's' : ''} ajoutée${lignes.length > 1 ? 's' : ''}`,
      'success'
    );
  };

  // Sous-total par lot : index du marqueur → somme des lignes qui le suivent jusqu'au prochain lot
  const sectionSubtotals = useMemo(() => {
    const res = {};
    form.lignes.forEach((l, i) => {
      if (!l._isSection) return;
      let sum = 0;
      for (let j = i + 1; j < form.lignes.length; j++) {
        if (form.lignes[j]._isSection) break;
        sum += num(form.lignes[j].quantite) * num(form.lignes[j].prixUnitaire);
      }
      res[i] = sum;
    });
    return res;
  }, [form.lignes]);
  const hasLots = form.lignes.some(l => l._isSection);

  /** Nombre de lignes rattachées à chaque lot (index du marqueur → compte). */
  const sectionCounts = useMemo(() => {
    const res = {};
    form.lignes.forEach((l, i) => {
      if (!l._isSection) return;
      let n = 0;
      for (let j = i + 1; j < form.lignes.length; j++) {
        if (form.lignes[j]._isSection) break;
        n++;
      }
      res[i] = n;
    });
    return res;
  }, [form.lignes]);

  /** id du lot auquel appartient chaque ligne (null hors lot) — sert au repli. */
  const lotOfLine = useMemo(() => {
    const res = {};
    let current = null;
    form.lignes.forEach(l => {
      if (l._isSection) { current = l.id; return; }
      res[l.id] = current;
    });
    return res;
  }, [form.lignes]);

  const toggleLot = (id) => setCollapsedLots(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  /**
   * Transforme une ligne existante en titre de lot : on structure un devis
   * déjà saisi sans le retaper (« Salle de bain » devient l'en-tête, les lignes
   * qui suivent lui appartiennent). Les montants de la ligne sont abandonnés,
   * un lot ne porte que son sous-total.
   */
  const convertToLot = (id) => {
    setForm(p => ({
      ...p,
      lignes: p.lignes.map(l => l.id === id
        ? { id: l.id, _isSection: true, description: (l.description || '').trim() }
        : l),
    }));
    setFocusLotId(id);
    showToast?.('Ligne transformée en lot', 'success');
  };

  // ── Glisser-déposer ──────────────────────────────────────────────
  // La liste est plate : l'appartenance d'une ligne à un lot découle de sa
  // POSITION (elle suit le dernier marqueur rencontré). Déplacer une ligne
  // suffit donc à la reclasser ; déplacer un lot doit emporter ses lignes.
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  /** Taille du bloc à déplacer : 1 pour une ligne, le lot + ses lignes sinon. */
  const blockSizeAt = (list, i) => {
    if (!list[i]?._isSection) return 1;
    let n = 1;
    for (let j = i + 1; j < list.length; j++) {
      if (list[j]._isSection) break;
      n++;
    }
    return n;
  };

  const moveBlock = (from, to) => {
    if (from == null || to == null) return;
    setForm(p => {
      const list = [...p.lignes];
      const size = blockSizeAt(list, from);
      // Interdit de déposer un lot à l'intérieur de lui-même
      if (to >= from && to < from + size) return p;
      const block = list.splice(from, size);
      const insertAt = to > from ? to - size : to;
      list.splice(Math.max(0, Math.min(insertAt, list.length)), 0, ...block);
      return { ...p, lignes: list };
    });
  };

  // Événements pointeur plutôt que l'API drag-and-drop HTML5 : celle-ci ne
  // fonctionne pas au doigt, or l'artisan compose souvent son devis au téléphone
  // sur le chantier. Ça la rend aussi vérifiable en test automatisé.
  const overIdxRef = useRef(null);
  const startRowDrag = (index) => setDragIdx(index);

  useEffect(() => {
    if (dragIdx == null) return;
    const point = (e) => (e.touches && e.touches[0]) ? e.touches[0] : e;
    const onMove = (e) => {
      const p = point(e);
      const row = document.elementFromPoint(p.clientX, p.clientY)?.closest('[data-row-index]');
      if (!row) return;
      const i = Number(row.dataset.rowIndex);
      if (!Number.isNaN(i)) { overIdxRef.current = i; setOverIdx(i); }
      if (e.cancelable) e.preventDefault(); // empêche le scroll pendant le glissement tactile
    };
    const onUp = () => {
      moveBlock(dragIdx, overIdxRef.current);
      overIdxRef.current = null;
      setDragIdx(null);
      setOverIdx(null);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIdx]);

  const dragProps = (index) => ({
    rowIndex: index,
    onGrab: () => startRowDrag(index),
    isDragged: dragIdx === index,
    isDropTarget: overIdx === index && dragIdx !== null && dragIdx !== index,
  });

  // ── Construction du devisData (partagée entre Créer et Aperçu) ──
  const buildDevisData = () => {
    const roundEuro = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    // Une ligne négative (geste commercial, reprise) s'enregistre telle quelle : quantité × prix = total.
    // Avant, quantité et prix étaient bornés à 0 mais pas le total : « 1 u · 0,00 € · −50,00 € » imprimé.
    const fmt = (l) => ({
      ...l,
      quantite: num(l.quantite),
      prixUnitaire: num(l.prixUnitaire),
      prixAchat: num(l.prixAchat),
      montant: roundEuro(num(l.quantite) * num(l.prixUnitaire)),
      ...(franchise ? { tva: 0 } : {}),
    });
    // Découpe la liste plate en lots (sections) au niveau des marqueurs _isSection
    const sections = [];
    let cur = { id: generateId(), titre: '', lignes: [] };
    form.lignes.forEach(l => {
      if (l._isSection) {
        if (cur.lignes.length) sections.push(cur);
        cur = { id: l.id, titre: (l.description || '').trim(), lignes: [] };
      } else if ((l.description || '').trim()) {
        cur.lignes.push(fmt(l));
      }
    });
    if (cur.lignes.length) sections.push(cur);
    const lignesFormatted = sections.flatMap(s => s.lignes);
    return {
      type: form.type,
      client_id: form.clientId,
      chantier_id: form.chantierId || undefined,
      date: form.date,
      // Le champ garde ce qui est tapé (vide compris : effacer puis taper 45 donnait 3045) ; 30 j si vide
      validite: parseInt(form.validite, 10) > 0 ? parseInt(form.validite, 10) : 30,
      statut: isEditMode ? initialData.statut : 'brouillon',
      tvaRate: franchise ? 0 : form.tvaDefaut,
      lignes: lignesFormatted,
      sections: sections.length ? sections : [{ id: '1', titre: '', lignes: lignesFormatted }],
      remise: form.remise,
      acompte_pct: form.acompte || undefined,
      conditions: form.conditions || undefined,
      notes: form.notes,
      // Réparation urgente demandée par le client (C. conso. L221-28, 8°) : mention sur le devis (src/lib/retractation.js)
      travaux_urgents: !isFacture && form.travauxUrgents === true,
      total_ht: roundEuro(totals.htApresRemise),
      tva: roundEuro(totals.tvaApresRemise),
      total_ttc: roundEuro(totals.totalTTC),
      // TVA par taux, imprimée par les deux générateurs (avant : jamais enregistrée par l'éditeur)
      tvaParTaux: totals.tvaParTaux,
    };
  };

  // ── Submit ──
  const handleSubmit = async (thenPreview = false) => {
    if (!form.clientId) { setError('Choisissez un client.'); setShowClientPicker(true); return; }
    const priced = form.lignes.filter(l => !l._isSection && (l.description || '').trim());
    if (priced.length === 0) { setError('Ajoutez au moins une ligne.'); return; }
    // Une ligne chiffrée sans désignation compte dans les totaux mais n'est pas enregistrée ni imprimée : le total
    // ne correspondrait plus aux lignes du document (CGI ann. II art. 242 nonies A) — relecture juriste-btp du 16 oct. 2026
    const sansDesignation = messageLigneSansDesignation(form.lignes);
    if (sansDesignation) { setError(sansDesignation); return; }
    setError('');
    const devisData = buildDevisData();
    setIsSubmitting(true);
    try {
      let result;
      if (isEditMode) result = await onUpdate?.(initialData.id, devisData);
      else result = await onSubmit?.(devisData);
      if (result === false) { setError('Échec de l\'enregistrement. Réessayez.'); setIsSubmitting(false); return; }
      if (!isEditMode) clearDraft();
      if (thenPreview && onPreview) onPreview(result || { ...devisData, id: isEditMode ? initialData.id : result?.id });
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mentions légales manquantes — prévenir PENDANT la composition, pas au moment d'envoyer.
  // Même liste que le contrôle d'envoi de DevisPage (lib/profilLegal) : le bandeau annonce exactement ce qui bloquera.
  const legalMissing = useMemo(() => profilManquant(entreprise), [entreprise]);

  if (!isOpen || typeof document === 'undefined') return null;
  const isFacture = form.type === 'facture';
  // Couleur d'accent de l'ÉDITEUR uniquement : une facture engage le paiement,
  // un devis non — les confondre coûte cher. Le PDF, lui, garde la couleur de
  // l'entreprise (identité visuelle) : ne pas propager `accent` à buildDevisHtml.
  const accent = isFacture ? FACTURE_ACCENT : couleur;
  // Aplats (boutons, pastille) : la même teinte assombrie qui porte du blanc (charte du 19 oct. 2026)
  const accentPlein = couleurPleine(accent, isDark);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${isEditMode ? 'Modifier' : (isFacture ? 'Nouvelle' : 'Nouveau')} ${isFacture ? 'facture' : 'devis'}`}
      className="fixed inset-0 z-[1000] flex flex-col bg-fond">
      {/* ── Top bar ──
          Audit UX du 20 oct. 2026 : le titre au téléphone aussi ; plus de bouton « Créer » en haut (deux boutons pleins :
          celui du bas, collé aux totaux, suffit) ; le choix devis / facture passe sous l'en-tête au téléphone. */}
      <header className="flex items-center gap-2 sm:gap-3 px-2 sm:px-5 h-14 border-b border-bord bg-surface flex-shrink-0">
        <button onClick={onClose} aria-label="Fermer" className={`w-11 h-11 flex items-center justify-center rounded-xl ${rowHover} ${textMuted} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
          <ArrowLeft size={20} />
        </button>
        <h1 className={`flex-1 min-w-0 text-base font-bold truncate ${textPrimary}`}>{isEditMode ? 'Modifier' : (isFacture ? 'Nouvelle' : 'Nouveau')} {isFacture ? 'facture' : 'devis'}</h1>
        {/* Type toggle (au téléphone : sous l'en-tête) */}
        {!isEditMode && (
          <div className="hidden sm:flex items-center rounded-xl p-0.5 bg-surface-2">
            {[{ v: 'devis', label: 'Devis', Icon: FileText }, { v: 'facture', label: 'Facture', Icon: Receipt }].map(({ v, label, Icon }) => (
              <button key={v} onClick={() => setForm(p => ({ ...p, type: v }))} aria-label={label} aria-pressed={form.type === v}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-colors ${form.type === v ? 'bg-surface text-encre shadow-e1' : 'text-encre-2 hover:text-encre'}`}>
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowLibrary(true)} aria-label="Ouvrir la bibliothèque de modèles"
          className="flex items-center gap-1.5 px-3 h-11 rounded-full text-sm font-semibold border transition-colors border-bord text-encre-2 hover:bg-surface-2">
          <Library size={16} aria-hidden="true" /> <span>Bibliothèque</span>
        </button>
      </header>

      {draftRestored && (
        <div className="px-3 sm:px-5 py-2 text-sm flex items-center justify-between gap-3 bg-alerte-fond text-alerte-texte">
          <span>Brouillon restauré : reprenez où vous en étiez.</span>
          <button onClick={() => { clearDraft(); setForm(blankForm()); setDraftRestored(false); }} className="h-11 -my-2 font-semibold hover:underline">Recommencer</button>
        </div>
      )}

      {legalMissing.length > 0 && (
        <div role="status" className="px-3 sm:px-5 py-2 text-sm flex items-center gap-2 bg-alerte-fond text-alerte-texte">
          <AlertTriangle size={16} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 sm:truncate">
            L'envoi sera bloqué — profil incomplet : {enPhrase(legalMissing)}.
          </span>
          {onCompleteProfile && (
            <button onClick={onCompleteProfile} className="h-11 -my-2 font-semibold whitespace-nowrap hover:underline">
              Compléter →
            </button>
          )}
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 pb-40">

          {/* Devis ou facture, au téléphone (au bureau : dans l'en-tête) */}
          {!isEditMode && (
            <div className="sm:hidden grid grid-cols-2 rounded-xl p-0.5 bg-surface-2" role="group" aria-label="Type de document">
              {[{ v: 'devis', label: 'Devis', Icon: FileText }, { v: 'facture', label: 'Facture', Icon: Receipt }].map(({ v, label, Icon }) => (
                <button key={v} onClick={() => setForm(p => ({ ...p, type: v }))} aria-pressed={form.type === v}
                  className={`flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-semibold transition-colors ${form.type === v ? 'bg-surface text-encre shadow-e1' : 'text-encre-2'}`}>
                  <Icon size={16} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          )}

          {/* Client, date, chantier : le client et le chantier se choisissent de la même façon, à la même hauteur
              (audit UX du 20 oct. 2026 : sélecteur fait maison pour l'un, liste native pour l'autre) */}
          <div className={`rounded-2xl border p-3 sm:p-4 ${cardBg}`}>
            <div className="grid sm:grid-cols-2 gap-3">
              <ClientField
                selectedClient={selectedClient} couleur={couleur} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}
                open={showClientPicker} setOpen={setShowClientPicker}
                clientSearch={clientSearch} setClientSearch={setClientSearch} inputBg={inputBg}
                recentClients={recentClients} filteredClients={filteredClients}
                onSelect={selectClient} onQuickAdd={() => { setShowClientPicker(false); setShowQuickClient(true); }}
              />
              <div>
                <label htmlFor="composeur-date" className={LIBELLE}>Date</label>
                <input id="composeur-date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className={`w-full px-3 h-12 rounded-xl border text-base ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
              </div>
            </div>
            {chantiers.length > 0 && (
              <div className="mt-3">
                <ChantierField
                  chantiers={chantiers} clientId={form.clientId} valeur={form.chantierId}
                  onChange={(id) => setForm(p => ({ ...p, chantierId: id }))}
                />
              </div>
            )}
          </div>

          {/* Lignes */}
          <div className={`rounded-2xl border ${cardBg}`}>
            {/* header row (desktop) */}
            {form.lignes.length > 0 && (
              <div className={`hidden sm:grid grid-cols-[14px_1fr_52px_60px_74px_54px_92px_30px] gap-2 px-4 py-2 rounded-t-2xl text-xs font-semibold ${textMuted} bg-fond border-b border-bord`}>
                <span /><span>Désignation</span><span className="text-center">Qté</span><span className="text-center">Unité</span><span className="text-center">PU HT</span><span className="text-center">TVA</span><span className="text-right">Total HT</span><span />
              </div>
            )}
            <div>
              {form.lignes.map((ligne, index) => (
                ligne._isSection ? (
                  <SectionRow key={ligne.id} ligne={ligne} index={index} total={form.lignes.length} subtotal={sectionSubtotals[index] || 0}
                    count={sectionCounts[index] || 0} collapsed={collapsedLots.has(ligne.id)} onToggle={() => toggleLot(ligne.id)}
                    shouldFocus={ligne.id === focusLotId} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}
                    onUpdate={(v) => updateLigne(ligne.id, 'description', v)} onRemove={() => removeLigne(ligne.id)}
                    onMoveUp={() => moveLigne(index, -1)} onMoveDown={() => moveLigne(index, 1)} {...dragProps(index)} />
                ) : collapsedLots.has(lotOfLine[ligne.id]) ? null : (
                  <LigneRow key={ligne.id} ligne={ligne} index={index} total={form.lignes.length} franchise={franchise}
                    isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted} rowHover={rowHover}
                    onUpdate={(f, v) => updateLigne(ligne.id, f, v)} onRemove={() => removeLigne(ligne.id)}
                    onMoveUp={() => moveLigne(index, -1)} onMoveDown={() => moveLigne(index, 1)} onDuplicate={() => duplicateLigne(ligne.id)}
                    onMetre={() => setMetreLineId(ligne.id)}
                    onInsertLot={() => insertLotAbove(index)}
                    onMarge={() => setMargeLineId(ligne.id)}
                    focusField={focusField && focusField.lineId === ligne.id ? focusField.field : null}
                    onFocusHandled={() => setFocusField(null)}
                    onToLot={() => convertToLot(ligne.id)}
                    onLineEnter={() => setFocusSearchTick(t => t + 1)} {...dragProps(index)} />
                )
              ))}
            </div>

            {/* Add line with catalogue autocomplete */}
            <AddLineRow catalogue={catalogue} isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted} onAdd={addLigne} empty={form.lignes.length === 0} focusSignal={focusSearchTick} />

            {/* Ajouter un lot / enregistrer comme modèle */}
            {form.lignes.length > 0 && (
              <div className={`px-3 sm:px-4 pb-3 flex flex-wrap items-center gap-2 ${hasLots ? '' : 'pt-0'}`}>
                <button type="button" onClick={addLot}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all border-bord text-encre-2 hover:bg-surface-2`}>
                  <Plus size={13} /> Ajouter un lot
                </button>
                {addTemplate && (
                  <button type="button" onClick={() => setShowSaveTemplate(true)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all border-bord text-encre-2 hover:bg-surface-2`}>
                    <Star size={13} /> Enregistrer comme modèle
                  </button>
                )}
                {!hasLots && <span className={`text-xs ${textMuted}`}>Regroupez par pièce ou corps d'état (Salle de bain, Cuisine…)</span>}
              </div>
            )}

            {/* Démarrage éclair (uniquement quand le devis est vide) */}
            {form.lignes.length === 0 && (
              <div className={`border-t border-bord p-3 sm:p-4`}>
                <QuickStart templates={METIER_TEMPLATES} articles={quickArticles} persoTemplates={customTemplates}
                  onApplyTemplate={applyTemplate} onApplyPerso={applyPersoTemplate} onAddArticle={addLigne}
                  onOpenLibrary={() => setShowLibrary(true)}
                  isDark={isDark} couleur={couleur} textPrimary={textPrimary} textMuted={textMuted} />
              </div>
            )}
          </div>

          {/* Options (remise / notes) */}
          <div className={`rounded-2xl border ${cardBg}`}>
            <button onClick={() => setShowOptions(o => !o)} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${textPrimary}`}>
              <span className="flex items-center gap-2"><Percent size={15} className="text-accent-texte" /> Remise, notes & options</span>
              <ChevronDown size={16} className={`${textMuted} transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </button>
            {showOptions && (
              <div className={`px-4 pb-4 space-y-3 border-t border-bord pt-3`}>
                {franchise ? (
                  <p className="text-xs text-encre-2">TVA non applicable, art. 293 B du CGI (micro-entreprise) : aucune TVA n'est ajoutée.</p>
                ) : (
                <div>
                  <label className={LIBELLE}>TVA — appliquer à tout le devis</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ v: 20, sub: 'neuf' }, { v: 10, sub: 'réno' }, { v: 5.5, sub: 'éco-réno' }, { v: 0, sub: 'exonéré' }].map(({ v, sub }) => (
                      <button key={v} type="button"
                        onClick={() => setForm(p => ({ ...p, tvaDefaut: v, lignes: p.lignes.map(l => l._isSection ? l : { ...l, tva: v }) }))}
                        aria-pressed={form.tvaDefaut === v && form.lignes.every(l => l._isSection || l.tva === v)}
                        className={`px-3 h-11 rounded-full text-sm font-semibold border transition-colors ${form.tvaDefaut === v && form.lignes.every(l => l._isSection || l.tva === v) ? 'bg-encre text-surface border-encre' : 'border-bord text-encre-2 hover:bg-surface-2'}`}>
                        {String(v).replace('.', ',')} % <span className="font-normal opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LIBELLE}>Remise %</label>
                    <input type="number" min="0" max="100" value={form.remise || ''} onChange={e => setForm(p => ({ ...p, remise: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                      placeholder="0" className={`${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
                  </div>
                  {!isFacture && (
                    <div>
                      <label className={LIBELLE}>Validité (jours)</label>
                      <input type="number" min="1" value={form.validite} onChange={e => setForm(p => ({ ...p, validite: e.target.value.replace(/\D/g, '') }))}
                        className={`${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!isFacture && (
                    <div>
                      <label className={LIBELLE}>Acompte demandé %</label>
                      <input type="number" min="0" max="100" value={form.acompte || ''} onChange={e => setForm(p => ({ ...p, acompte: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                        placeholder="0" className={`${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
                    </div>
                  )}
                  <div>
                    <label className={LIBELLE}>Conditions de règlement</label>
                    <select value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))}
                      className={`${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
                      <option value="">Standard — délai de vos paramètres</option>
                      <option value="Paiement à réception de facture">À réception de facture</option>
                      <option value="Paiement à 30 jours">Paiement à 30 jours</option>
                      <option value="Acompte à la commande, solde à la livraison">Acompte + solde à la livraison</option>
                      <option value="Paiement échelonné selon l'avancement des travaux">Échelonné selon l'avancement</option>
                    </select>
                  </div>
                </div>
                {!isFacture && (
                  <label className="flex items-start gap-3 cursor-pointer" data-ui="TravauxUrgents">
                    <input type="checkbox" checked={form.travauxUrgents === true} onChange={e => setForm(p => ({ ...p, travauxUrgents: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 rounded flex-shrink-0" />
                    <span>
                      <span className={`block text-sm font-medium ${textPrimary}`}>Dépannage urgent demandé par le client</span>
                      <span className={`block text-xs ${textMuted}`}>Réparation urgente à son domicile, à sa demande : pas de rétractation pour le strict nécessaire (art. L221-28, 8° du Code de la consommation). Mettez les autres travaux sur un devis séparé.</span>
                    </span>
                  </label>
                )}
                <div>
                  <label className={LIBELLE}><StickyNote size={12} className="inline mr-1" />Notes (visibles sur le PDF)</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                    placeholder="Conditions particulières, délais…" className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-xl px-4 py-3 text-sm bg-danger-fond text-danger-texte font-medium">{error}</div>
          )}
        </div>
      </div>

      {/* ── Sticky total bar ── */}
      <footer className={`flex-shrink-0 border-t border-bord bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.06)]`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-5">
          <div className="flex-1 min-w-0 flex items-baseline gap-3 sm:gap-5 flex-wrap">
            <div className="hidden sm:flex items-baseline gap-1.5">
              <span className={`text-xs ${textMuted}`}>HT</span>
              <span className={`text-sm font-semibold ${textPrimary}`}>{eur(totals.htApresRemise)}</span>
            </div>
            {form.remise > 0 && (
              <div className="hidden sm:flex items-baseline gap-1.5">
                <span className="text-xs text-danger-texte">−{form.remise}%</span>
              </div>
            )}
            {franchise ? (
              <div className="hidden sm:flex items-baseline gap-1.5">
                <span className={`text-xs ${textMuted}`}>TVA non applicable</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-baseline gap-1.5">
                <span className={`text-xs ${textMuted}`}>TVA</span>
                <span className={`text-sm font-semibold ${textPrimary}`}>{eur(totals.tvaApresRemise)}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className={`text-xs font-semibold leading-none ${textMuted}`}>{franchise ? 'Total' : 'Total TTC'}</span>
              <span className="text-lg sm:text-3xl font-extrabold tabular-nums whitespace-nowrap leading-tight" style={{ color: isFacture ? accent : 'rgb(var(--accent-texte))' }}>{eur(animatedTTC)}</span>
            </div>
            {totals.margePercent > 0 && form.lignes.some(l => l.prixAchat > 0) && (
              <div className={`hidden md:flex items-center gap-1 px-2.5 h-6 rounded-full text-xs font-semibold ${totals.margePercent >= 25 ? 'bg-succes-fond text-succes-texte' : totals.margePercent >= 10 ? 'bg-alerte-fond text-alerte-texte' : 'bg-danger-fond text-danger-texte'}`}>
                <Zap size={11} /> {Math.round(totals.margePercent)}% marge
              </div>
            )}
          </div>
          {form.lignes.some(l => !l._isSection && (l.description || '').trim()) && (
            <button onClick={() => setShowPdfPreview(true)} disabled={isSubmitting}
              aria-label="Aperçu du document"
              className={`flex-shrink-0 flex items-center justify-center gap-2 w-11 sm:w-auto px-0 sm:px-4 h-11 rounded-xl text-sm font-semibold border transition-all border-bord text-encre-2 hover:bg-surface-2`}>
              <Eye size={16} /> <span className="hidden sm:inline">Aperçu</span>
            </button>
          )}
          <button onClick={() => handleSubmit(false)} disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 sm:px-5 h-11 rounded-full text-sm font-bold shadow-e1 disabled:opacity-60 transition-[filter] hover:brightness-95 whitespace-nowrap flex-shrink-0 ${isFacture ? 'text-white' : 'bg-accent text-sur-accent'}`}
            style={isFacture ? { background: accentPlein } : undefined}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {isEditMode ? 'Enregistrer' : (isFacture ? 'Créer la facture' : 'Créer le devis')}
          </button>
        </div>
      </footer>

      <LibraryPanel
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        persoTemplates={customTemplates}
        articles={quickArticles}
        onAppendBloc={appendBloc}
        onAddArticle={addLigne}
        isDark={isDark} couleur={couleur}
        textPrimary={textPrimary} textMuted={textMuted} inputBg={inputBg}
      />

      {showQuickClient && (
        <QuickClientModal
          isOpen={showQuickClient}
          onClose={() => setShowQuickClient(false)}
          onSubmit={async (data) => {
            // addClient est async (écriture Supabase) : sans await, `c` est une
            // Promise, `c.id` vaut undefined et le client créé n'est jamais
            // rattaché au devis.
            setShowQuickClient(false);
            try {
              const c = await addClient?.(data);
              if (c?.id) selectClient(c.id);
              else showToast?.('Client créé mais non sélectionné — choisissez-le dans la liste', 'error');
            } catch (e) {
              showToast?.(`Client non enregistré : ${e?.message || 'erreur'}`, 'error');
            }
          }}
          isDark={isDark} couleur={couleur}
        />
      )}

      {metreLineId && (
        <MetreModal
          isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted}
          onClose={() => setMetreLineId(null)}
          onApply={(qty, unite) => {
            updateLigne(metreLineId, 'quantite', qty);
            if (unite) updateLigne(metreLineId, 'unite', unite);
            setMetreLineId(null);
          }}
        />
      )}

      {margeLineId && (() => {
        const l = form.lignes.find(x => x.id === margeLineId);
        return l ? (
          <MargeModal
            isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted}
            ligne={l}
            onClose={() => setMargeLineId(null)}
            onApply={(pa) => { updateLigne(margeLineId, 'prixAchat', pa); setMargeLineId(null); }}
          />
        ) : null;
      })()}

      {showSaveTemplate && (
        <SaveTemplateModal
          isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted}
          defaultName={form.lignes.find(l => !l._isSection && (l.description || '').trim())?.description || ''}
          onClose={() => setShowSaveTemplate(false)}
          onSave={saveAsTemplate}
        />
      )}

      {showPdfPreview && (
        <PdfPreviewModal
          isDark={isDark} couleur={couleur} textPrimary={textPrimary} textMuted={textMuted}
          html={buildDevisHtml({
            doc: { ...buildDevisData(), numero: isEditMode ? initialData?.numero : 'Aperçu' },
            client: selectedClient || {},
            chantier: chantiers.find(c => c.id === form.chantierId) || null,
            entreprise, couleur,
          })}
          onClose={() => setShowPdfPreview(false)}
        />
      )}
    </div>,
    document.body
  );
}

/* ── Client field (inline picker) ── */
function ClientField({ selectedClient, couleur, isDark, textPrimary, textMuted, open, setOpen, clientSearch, setClientSearch, inputBg, recentClients, filteredClients, onSelect, onQuickAdd }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, setOpen]);
  const list = clientSearch.trim() ? filteredClients : (recentClients.length ? recentClients : filteredClients);
  return (
    <div className="relative" ref={ref}>
      <span className={LIBELLE}>Client</span>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 h-12 rounded-xl border text-base sm:text-sm text-left transition-colors bg-surface hover:border-bord-fort focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedClient ? 'border-bord-fort' : 'border-bord'}`}
        aria-haspopup="true" aria-expanded={open}>
        {selectedClient ? (
          <>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-accent text-sur-accent">
              {(selectedClient.nom || '?')[0]?.toUpperCase()}
            </span>
            <span className={`flex-1 truncate font-medium ${textPrimary}`}>{formatClientName(selectedClient)}</span>
          </>
        ) : (
          <><User size={16} className={textMuted} /><span className={`flex-1 ${textMuted}`}>Choisir un client…</span></>
        )}
        <ChevronDown size={16} className={textMuted} />
      </button>
      {open && (
        <div className={`absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border shadow-xl overflow-hidden bg-surface border-bord`}>
          <div className={`p-2 border-b border-bord`}>
            <div className="relative">
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input autoFocus value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Rechercher un client…"
                className={`w-full pl-9 pr-3 h-12 rounded-lg border text-base sm:text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {!clientSearch.trim() && recentClients.length > 0 && (
              <p className={`px-3 pt-1 pb-1 text-xs font-semibold ${textMuted}`}>Récents</p>
            )}
            {list.map(c => (
              <button key={c.id} onClick={() => onSelect(c.id)} className={`w-full min-h-[48px] flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2`}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-accent text-sur-accent">{(c.nom || '?')[0]?.toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate font-medium ${textPrimary}`}>{formatClientName(c)}</span>
                  {c.entreprise && <span className={`block truncate text-xs ${textMuted}`}>{c.entreprise}</span>}
                </span>
              </button>
            ))}
            {list.length === 0 && <p className={`px-3 py-4 text-center text-sm ${textMuted}`}>Aucun client</p>}
          </div>
          <button onClick={onQuickAdd} className={`w-full min-h-[48px] flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-t border-bord hover:bg-surface-2 text-accent-texte`}>
            <UserPlus size={16} /> Nouveau client
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Chantier (adresse des travaux) : le même sélecteur que le client, à la même hauteur ──
 * Audit UX du 20 oct. 2026 : le client se choisissait dans ce sélecteur, le chantier dans une liste native de 44 px.
 * Les chantiers du client choisi viennent en premier ; une recherche apparaît au-delà de six chantiers. */
function ChantierField({ chantiers = [], clientId, valeur, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const echap = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', echap);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', echap); };
  }, [open]);
  const choisi = chantiers.find(c => c.id === valeur);
  const tries = [...chantiers].sort((a, b) => ((b.client_id === clientId) - (a.client_id === clientId)) || (a.nom || '').localeCompare(b.nom || '', 'fr'));
  const liste = q.trim() ? tries.filter(c => norm(`${c.nom || ''} ${c.adresse || ''}`).includes(norm(q.trim()))) : tries;
  const choisir = (id) => { onChange(id); setOpen(false); setQ(''); };
  return (
    <div className="relative" ref={ref}>
      <span className={LIBELLE}>Chantier — adresse des travaux</span>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        className={`w-full flex items-center gap-2.5 px-3 h-12 rounded-xl border text-base sm:text-sm text-left transition-colors bg-surface hover:border-bord-fort focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${choisi ? 'border-bord-fort' : 'border-bord'}`}>
        <Building2 size={16} className="text-encre-3 flex-shrink-0" aria-hidden="true" />
        <span className={`flex-1 min-w-0 truncate ${choisi ? 'font-medium text-encre' : 'text-encre-3'}`}>{choisi ? (choisi.nom || 'Chantier sans nom') : 'Aucun — adresse du client'}</span>
        <ChevronDown size={16} className="text-encre-3 flex-shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border shadow-e3 overflow-hidden bg-surface border-bord">
          {chantiers.length > 6 && (
            <div className="p-2 border-b border-bord">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" aria-hidden="true" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un chantier…" aria-label="Rechercher un chantier"
                  className="w-full pl-9 pr-3 h-12 rounded-lg border text-base sm:text-sm bg-surface border-bord text-encre placeholder:text-encre-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
              </div>
            </div>
          )}
          <div role="listbox" aria-label="Chantier" className="max-h-60 overflow-y-auto py-1">
            <button type="button" role="option" aria-selected={!valeur} onClick={() => choisir('')}
              className="w-full min-h-[48px] flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2">
              <span className="flex-1 text-encre-2">Aucun — utiliser l'adresse du client</span>
              {!valeur && <Check size={16} className="text-encre flex-shrink-0" aria-hidden="true" />}
            </button>
            {liste.map(c => (
              <button key={c.id} type="button" role="option" aria-selected={c.id === valeur} onClick={() => choisir(c.id)}
                className="w-full min-h-[48px] flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2">
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium text-encre">{c.nom || 'Chantier sans nom'}</span>
                  {c.adresse && <span className="block truncate text-xs text-encre-3">{c.adresse}</span>}
                </span>
                {c.id === valeur && <Check size={16} className="text-encre flex-shrink-0" aria-hidden="true" />}
              </button>
            ))}
            {liste.length === 0 && <p className="px-3 py-4 text-center text-sm text-encre-3">Aucun chantier</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Titre de lot (section) ── */
function SectionRow({ ligne, index, total, subtotal, count = 0, collapsed = false, onToggle, shouldFocus, isDark, textPrimary, textMuted, onUpdate, onRemove, onMoveUp, onMoveDown,
  rowIndex, onGrab, isDragged, isDropTarget }) {
  const inputRef = useRef(null);
  useEffect(() => { if (shouldFocus) inputRef.current?.focus(); }, [shouldFocus]);
  useLayoutEffect(() => { ajusterHauteur(inputRef.current); }, [ligne.description]);
  const titre = (ligne.description || '').trim();
  return (
    // Bandeau plein + liseré coloré : un lot structure le prix, il ne doit pas
    // se lire comme une ligne de plus.
    <div data-row-index={rowIndex}
      className={`group border-y border-bord bg-accent/10 border-l-[3px] border-l-accent ${isDropTarget ? 'ring-2 ring-inset ring-accent' : ''} ${isDragged ? 'opacity-40' : ''}`}>
      {/* Au téléphone, le titre prend toute la première ligne (sinon il était coupé à deux mots) ; le compte, le
          sous-total et les boutons passent dessous, à droite. */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 px-2 sm:px-3 py-2.5">
        {/* Poignée : le glissement ne part que d'ici, sinon on ne pourrait plus
            sélectionner le texte du titre. Le lot emporte ses lignes. */}
        <button type="button" aria-label={`Déplacer le lot ${titre || 'sans titre'}`}
          onPointerDown={onGrab} style={{ touchAction: 'none' }}
          className={`p-0.5 rounded cursor-grab active:cursor-grabbing flex-shrink-0 ${textMuted} hover:bg-surface/70`}>
          <GripVertical size={14} />
        </button>
        <button onClick={onToggle} aria-expanded={!collapsed}
          aria-label={collapsed ? `Déplier le lot ${titre || 'sans titre'}` : `Replier le lot ${titre || 'sans titre'}`}
          className={`p-1 rounded flex-shrink-0 ${textMuted} hover:bg-surface/70`}>
          <ChevronDown size={15} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <Layers size={14} className="flex-shrink-0 hidden sm:block text-accent-texte" aria-hidden="true" />
        {/* Zone de texte d'une ligne qui grandit : un titre long passe à la ligne au lieu d'être coupé (un titre
            reste sur une ligne : Entrée et retours collés ignorés) */}
        <textarea ref={inputRef} rows={1} value={ligne.description} placeholder="Titre du lot (ex : Salle de bain)"
          onChange={e => onUpdate(e.target.value.replace(/\s*\n\s*/g, ' '))} onInput={e => ajusterHauteur(e.target)}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
          className={`grow min-w-0 basis-[calc(100%-4.5rem)] sm:basis-0 min-h-8 py-1.5 leading-5 resize-none overflow-hidden px-2 rounded-lg border-0 bg-transparent text-sm font-bold uppercase tracking-wide ${textPrimary} placeholder:font-normal placeholder:normal-case focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
        <span className={`ml-auto sm:ml-0 text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded-full flex-shrink-0 bg-surface/80 text-encre-2`}>
          {count} ligne{count > 1 ? 's' : ''}
        </span>
        <span className={`text-sm font-extrabold tabular-nums whitespace-nowrap ${textPrimary}`}>{eur(subtotal)}</span>
        <div className="flex items-center flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} aria-label="Monter le lot" className={`p-1 rounded ${textMuted} disabled:opacity-30 hover:bg-surface/70`}><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} aria-label="Descendre le lot" className={`p-1 rounded ${textMuted} disabled:opacity-30 hover:bg-surface/70`}><ChevronDown size={14} /></button>
          <button onClick={onRemove} aria-label="Supprimer le lot" className="p-1 rounded text-danger-texte hover:bg-danger-fond"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// Hauteur d'une désignation ajustée à son texte (un champ masqué — l'autre format d'écran — n'a pas de hauteur : ignoré)
function ajusterHauteur(el) {
  if (!el || el.offsetParent === null) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

/* ── Editable line row ── */
function LigneRow({ ligne, index, total, franchise = false, isDark, couleur, inputBg, textPrimary, textMuted, rowHover, onUpdate, onRemove, onMoveUp, onMoveDown, onDuplicate, onMetre, onInsertLot, onMarge, onToLot, focusField, onFocusHandled, onLineEnter,
  rowIndex, onGrab, isDragged, isDropTarget }) {
  const lineTotal = num(ligne.quantite) * num(ligne.prixUnitaire);
  const numCls = `w-full h-9 rounded-lg border text-sm text-center ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`;
  // Boucle clavier : focus + sélection du champ demandé (desktop OU mobile selon visibilité)
  const qtyDesktopRef = useRef(null), qtyMobileRef = useRef(null), puDesktopRef = useRef(null), puMobileRef = useRef(null);
  // Désignation à la bonne hauteur aussi quand le texte vient d'un modèle, d'un lot de la bibliothèque ou d'un devis
  // rouvert (avant : seulement à la frappe — un texte de deux lignes restait coupé à une)
  const desiDesktopRef = useRef(null), desiMobileRef = useRef(null);
  useLayoutEffect(() => { ajusterHauteur(desiDesktopRef.current); ajusterHauteur(desiMobileRef.current); }, [ligne.description]);
  useEffect(() => {
    if (!focusField) return;
    const pair = focusField === 'quantite' ? [qtyDesktopRef, qtyMobileRef] : [puDesktopRef, puMobileRef];
    const el = pair.map(r => r.current).find(x => x && x.offsetParent !== null);
    if (el) { el.focus(); el.select?.(); }
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusField]);
  const numKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); onLineEnter?.(); } };
  return (
    <div data-row-index={rowIndex}
      className={`group border-b last:border-b-0 border-bord ${rowHover} transition-colors ${isDragged ? 'opacity-40' : ''}`}
      style={isDropTarget ? { boxShadow: 'inset 0 2px 0 0 rgb(var(--accent))' } : undefined}>
      {/* Desktop grid — la poignée n'apparaît qu'au survol pour ne pas charger la ligne */}
      <div className="hidden sm:grid grid-cols-[14px_1fr_52px_60px_74px_54px_92px_30px] gap-2 items-center px-4 py-2">
        <button type="button" aria-label="Déplacer la ligne"
          onPointerDown={onGrab} style={{ touchAction: 'none' }}
          className={`opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${textMuted}`}>
          <GripVertical size={14} />
        </button>
        <textarea ref={desiDesktopRef} value={ligne.description} onChange={e => onUpdate('description', e.target.value)} placeholder="Désignation…" rows={1}
          onInput={e => ajusterHauteur(e.target)}
          className={`w-full min-h-[36px] px-2 py-1.5 rounded-lg border text-sm resize-none overflow-hidden leading-snug ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
        <input ref={qtyDesktopRef} type="text" inputMode="decimal" value={ligne.quantite} onChange={e => onUpdate('quantite', e.target.value)} onKeyDown={numKeyDown} aria-label="Quantité" className={numCls} />
        <select value={UNITES.includes(ligne.unite) ? ligne.unite : (ligne.unite ? '__autre' : 'u')} onChange={e => onUpdate('unite', e.target.value === '__autre' ? (ligne.unite || '') : e.target.value)} aria-label="Unité"
          className={`w-full h-9 px-1 rounded-lg border text-xs text-center ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
          {ligne.unite && !UNITES.includes(ligne.unite) && <option value="__autre">{ligne.unite}</option>}
        </select>
        <input ref={puDesktopRef} type="text" inputMode="decimal" value={ligne.prixUnitaire} onChange={e => onUpdate('prixUnitaire', e.target.value)} onKeyDown={numKeyDown} aria-label="Prix unitaire HT" className={numCls} />
        {franchise ? (
          <span className="text-xs text-center text-encre-3" title="TVA non applicable, art. 293 B du CGI">—</span>
        ) : (
          <select value={ligne.tva} onChange={e => onUpdate('tva', parseFloat(e.target.value))} aria-label="Taux de TVA" className={`w-full h-9 rounded-lg border text-xs text-center ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
            {[0, 5.5, 10, 20].map(t => <option key={t} value={t}>{String(t).replace('.', ',')} %</option>)}
          </select>
        )}
        <span className={`text-sm font-semibold text-right tabular-nums ${textPrimary}`}>{eur(lineTotal)}</span>
        <LineMenu isDark={isDark} textMuted={textMuted} index={index} total={total} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDuplicate={onDuplicate} onRemove={onRemove} onMetre={onMetre} onInsertLot={onInsertLot} onMarge={onMarge} onToLot={onToLot} />
      </div>
      {/* Téléphone : désignation pleine largeur, puis Qté · unité · prix · TVA sur une rangée (44 px, 16 px),
          le total dessous. Métré, marge, déplacer et supprimer sont dans « ⋯ » (toujours visible au doigt). */}
      <div className="sm:hidden px-3 py-3 space-y-2">
        <div className="flex items-start gap-1">
          {/* Réordonner au doigt : possible parce qu'on utilise les événements
              pointeur et non l'API drag-and-drop HTML5, inopérante sur tactile. */}
          <button type="button" aria-label="Déplacer la ligne"
            onPointerDown={onGrab} style={{ touchAction: 'none' }}
            className="w-7 h-11 -ml-1 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing text-encre-3">
            <GripVertical size={16} />
          </button>
          <textarea ref={desiMobileRef} value={ligne.description} onChange={e => onUpdate('description', e.target.value)} placeholder="Désignation…" rows={1} aria-label="Désignation"
            onInput={e => ajusterHauteur(e.target)}
            className={`flex-1 min-w-0 min-h-[44px] px-3 py-2.5 rounded-xl border text-base resize-none overflow-hidden leading-snug ${inputBg}`} />
          <LineMenu toujoursVisible isDark={isDark} textMuted={textMuted} index={index} total={total} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDuplicate={onDuplicate} onRemove={onRemove} onMetre={onMetre} onInsertLot={onInsertLot} onMarge={onMarge} onToLot={onToLot} />
        </div>
        {/* Un libellé au-dessus de chaque champ (audit UX du 20 oct. 2026, P1 : « 1 », « u », « 0 € », « 10 % » sans nom,
            l'artisan ne savait pas si le prix se saisit HT ou TTC). Listes sans flèche native : elle mordait « forfait ». */}
        <div className="grid grid-cols-[3rem_5.25rem_1fr_4.75rem] gap-1.5 items-end">
          <label className="block min-w-0">
            <span className="block mb-1 text-xs font-medium text-encre-3">Qté</span>
            <input ref={qtyMobileRef} type="text" inputMode="decimal" value={ligne.quantite} onChange={e => onUpdate('quantite', e.target.value)} onKeyDown={numKeyDown} aria-label="Quantité"
              className={`w-full h-12 px-1 rounded-xl border text-base text-center tabular-nums ${inputBg}`} />
          </label>
          <label className="block min-w-0">
            <span className="block mb-1 text-xs font-medium text-encre-3">Unité</span>
            <span className="relative block">
              <select value={UNITES.includes(ligne.unite) ? ligne.unite : (ligne.unite ? '__autre' : 'u')} onChange={e => onUpdate('unite', e.target.value === '__autre' ? (ligne.unite || '') : e.target.value)} aria-label="Unité"
                className={`w-full h-12 pl-2.5 pr-6 rounded-xl border text-base appearance-none ${inputBg}`}>
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                {ligne.unite && !UNITES.includes(ligne.unite) && <option value="__autre">{ligne.unite}</option>}
              </select>
              <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-encre-3" />
            </span>
          </label>
          <label className="block min-w-0">
            <span className="block mb-1 text-xs font-medium text-encre-3">PU HT</span>
            <span className="relative block">
              <input ref={puMobileRef} type="text" inputMode="decimal" value={ligne.prixUnitaire} onChange={e => onUpdate('prixUnitaire', e.target.value)} onKeyDown={numKeyDown}
                placeholder="PU HT"
                className={`w-full h-12 pl-2 pr-6 rounded-xl border text-base text-right tabular-nums ${inputBg}`} />
              <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-base text-encre-3">€</span>
            </span>
          </label>
          {franchise ? (
            <span className="block min-w-0">
              <span className="block mb-1 text-xs font-medium text-encre-3">TVA</span>
              <span className="h-12 flex items-center justify-center text-xs text-encre-3">Sans TVA</span>
            </span>
          ) : (
            <label className="block min-w-0">
              <span className="block mb-1 text-xs font-medium text-encre-3">TVA</span>
              <span className="relative block">
                <select value={ligne.tva} onChange={e => onUpdate('tva', parseFloat(e.target.value))} aria-label="Taux de TVA"
                  className={`w-full h-12 pl-2.5 pr-6 rounded-xl border text-base appearance-none ${inputBg}`}>
                  {[0, 5.5, 10, 20].map(t => <option key={t} value={t}>{String(t).replace('.', ',')} %</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-encre-3" />
              </span>
            </label>
          )}
        </div>
        <p className="flex items-baseline justify-end gap-2 text-sm">
          <span className="text-encre-2">Total HT</span>
          <span className="font-bold text-encre tabular-nums">{eur(lineTotal)}</span>
        </p>
      </div>
    </div>
  );
}

function LineMenu({ isDark, textMuted, index, total, onMoveUp, onMoveDown, onDuplicate, onRemove, onMetre, onInsertLot, onMarge, onToLot, toujoursVisible = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!open) return; const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  return (
    <div className="relative flex justify-center" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Actions de ligne" aria-haspopup="true" aria-expanded={open}
        className={`rounded-lg transition-opacity ${toujoursVisible ? 'w-11 h-11 flex items-center justify-center' : 'p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100'} ${textMuted} hover:bg-surface-2`}>
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open && (
        <div onKeyDown={e => e.key === 'Escape' && setOpen(false)} role="menu" className={`absolute right-0 top-full mt-1 z-30 w-56 rounded-xl border shadow-e3 py-1 text-sm [&>button]:min-h-[44px] bg-surface border-bord text-encre-2`}>
          {onMetre && <button role="menuitem" onClick={() => { onMetre(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2`}><Ruler size={14} /> Métré L × l</button>}
          {onMarge && <button role="menuitem" onClick={() => { onMarge(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2`}><Zap size={14} /> Prix d'achat / marge</button>}
          {onInsertLot && <button role="menuitem" onClick={() => { onInsertLot(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2`}><Plus size={14} /> Lot au-dessus</button>}
          {onToLot && <button role="menuitem" onClick={() => { onToLot(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2`}><Layers size={14} /> Transformer en lot</button>}
          <button role="menuitem" disabled={index === 0} onClick={() => { onMoveUp(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-40 hover:bg-surface-2`}><ChevronUp size={14} /> Monter</button>
          <button role="menuitem" disabled={index === total - 1} onClick={() => { onMoveDown(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-40 hover:bg-surface-2`}><ChevronDown size={14} /> Descendre</button>
          <button role="menuitem" onClick={() => { onDuplicate(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2`}><Plus size={14} /> Dupliquer</button>
          <button role="menuitem" onClick={() => { onRemove(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-danger-texte hover:bg-danger-fond"><Trash2 size={14} /> Supprimer</button>
        </div>
      )}
    </div>
  );
}

/* ── Métré express : quantité depuis les dimensions (L × l × h) ── */
function MetreModal({ isDark, couleur, inputBg, textPrimary, textMuted, onClose, onApply }) {
  const [L, setL] = useState('');
  const [larg, setLarg] = useState('');
  const [haut, setHaut] = useState('');
  const [nb, setNb] = useState('1');
  const [chutes, setChutes] = useState('');
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Calcul partagé avec le site public (src/lib/metre.js) : mêmes règles, même arrondi
  const { quantite: qty, unite } = calculerMetre({ longueur: L, largeur: larg, hauteur: haut, nombre: nb, chutes });
  const card = 'bg-surface border-bord';
  const fieldCls = `${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`;
  const labelCls = LIBELLE;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Métré express">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b border-bord`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}><Ruler size={18} className="text-accent-texte" /> Métré express</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${textMuted} hover:bg-surface-2`}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Longueur (m)</label><input ref={firstRef} type="number" min="0" step="any" inputMode="decimal" value={L} onChange={e => setL(e.target.value)} placeholder="0" className={fieldCls} /></div>
            <div><label className={labelCls}>Largeur (m)</label><input type="number" min="0" step="any" inputMode="decimal" value={larg} onChange={e => setLarg(e.target.value)} placeholder="0" className={fieldCls} /></div>
            <div><label className={labelCls}>Hauteur (m) — option</label><input type="number" min="0" step="any" inputMode="decimal" value={haut} onChange={e => setHaut(e.target.value)} placeholder="—" className={fieldCls} /></div>
            <div><label className={labelCls}>Nombre</label><input type="number" min="0" step="any" inputMode="decimal" value={nb} onChange={e => setNb(e.target.value)} placeholder="1" className={fieldCls} /></div>
          </div>
          <div><label className={labelCls}>Chutes / pertes %</label><input type="number" min="0" step="any" inputMode="decimal" value={chutes} onChange={e => setChutes(e.target.value)} placeholder="0" className={fieldCls} /></div>
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between bg-fond`}>
            <span className={`text-sm ${textMuted}`}>Quantité calculée</span>
            <span className="text-2xl font-extrabold tabular-nums text-accent-texte">{qty.toLocaleString('fr-FR')} <span className="text-sm font-semibold">{unite}</span></span>
          </div>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t border-bord`}>
          <button onClick={onClose} className={`flex-1 h-11 rounded-xl border text-sm font-semibold border-bord text-encre-2 hover:bg-surface-2`}>Annuler</button>
          <button onClick={() => onApply(qty, unite)} disabled={qty <= 0}
            className="flex-1 h-11 rounded-xl text-sm font-bold disabled:opacity-50 transition-all bg-accent text-sur-accent">
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bibliothèque : modèles perso, métiers chiffrés et articles fréquents ──
 *
 * Accessible à TOUT MOMENT (pas seulement sur un devis vide) : un devis réel
 * s'assemble par blocs successifs. Chaque modèle métier est dépliable pour voir
 * ses missions et leurs prix AVANT de l'appliquer — on ne choisit pas « 9 lignes »
 * à l'aveugle. Tout s'ajoute à la suite, rien n'est jamais écrasé.
 */
function LibraryPanel({ open, onClose, persoTemplates = [], articles = [], onAppendBloc, onAddArticle, isDark, couleur, textPrimary, textMuted, inputBg }) {
  const [q, setQ] = useState('');
  const [openTrade, setOpenTrade] = useState(null);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const trades = Object.entries(TRADE_LIBRARY).filter(([, t]) => {
    if (!q.trim()) return true;
    const n = norm(q);
    return norm(t.nom).includes(n)
      || t.lots.some(l => norm(l.nom).includes(n) || l.lignes.some(li => norm(li.designation).includes(n)))
      || t.prestations.some(p => norm(p.designation).includes(n));
  });
  const persoFiltered = persoTemplates.filter(t => !q.trim() || norm(t.nom).includes(norm(q)));
  const articlesFiltered = articles.filter(a => !q.trim() || norm(a.nom || '').includes(norm(q)));

  const sectionTitle = (Icon, label) => (
    <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 text-encre-2`}>
      <Icon size={14} className="text-accent-texte" aria-hidden="true" /> {label}
    </p>
  );

  return (
    <div className="fixed inset-0 z-[1150] flex justify-end" role="dialog" aria-modal="true" aria-label="Bibliothèque de modèles">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className={`relative w-full sm:w-[440px] h-full flex flex-col shadow-2xl border-l bg-surface border-bord`}>
        <div className={`flex items-center gap-2 px-4 h-14 border-b flex-shrink-0 border-bord`}>
          <Library size={18} className="text-accent-texte" />
          <h2 className={`flex-1 text-sm font-bold ${textPrimary}`}>Bibliothèque</h2>
          <button onClick={onClose} aria-label="Fermer la bibliothèque" className={`p-2 rounded-lg ${textMuted} hover:bg-surface-2`}><X size={18} /></button>
        </div>

        <div className={`px-4 py-3 border-b flex-shrink-0 border-bord`}>
          <div className="relative">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un métier, une prestation…"
              className={`w-full pl-9 pr-3 h-12 rounded-xl border text-base sm:text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {persoFiltered.length > 0 && (
            <div>
              {sectionTitle(FileText, 'Vos modèles')}
              <div className="space-y-2">
                {persoFiltered.map(tpl => {
                  const lignes = tpl.lignes || [];
                  const total = lignes.reduce((s, l) => s + num(l.quantite ?? 1) * num(l.prixUnitaire ?? l.prix ?? 0), 0);
                  return (
                    <div key={tpl.id} className={`rounded-xl border bg-surface border-bord`}>
                      <div className="flex items-center gap-2 p-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${textPrimary}`}>{tpl.nom}</p>
                          <p className={`text-xs ${textMuted}`}>{lignes.length} ligne{lignes.length > 1 ? 's' : ''}{total > 0 ? ` · ${eur(total)} HT` : ''}</p>
                        </div>
                        <button type="button" onClick={() => onAppendBloc(lignes, tpl.nom)}
                          className="px-3 h-8 rounded-lg text-xs font-semibold flex-shrink-0 bg-accent text-sur-accent">
                          Ajouter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            {sectionTitle(Sparkles, `Modèles métier (${trades.length})`)}
            <div className="space-y-2">
              {trades.map(([key, t]) => {
                const isOpen = openTrade === key;
                return (
                  <div key={key} className={`rounded-xl border overflow-hidden bg-surface border-bord`}>
                    <button type="button" onClick={() => setOpenTrade(isOpen ? null : key)} aria-expanded={isOpen}
                      className={`w-full flex items-center gap-2.5 p-3 text-left transition-colors hover:bg-surface-2`}>
                      <span aria-hidden="true" className="text-lg flex-shrink-0">{t.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-semibold truncate ${textPrimary}`}>{t.nom}</span>
                        <span className={`block text-xs ${textMuted}`}>{t.lots.length} lots types · {t.prestations.length} prestations</span>
                      </span>
                      <ChevronDown size={15} className={`flex-shrink-0 transition-transform ${textMuted} ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className={`border-t border-bord`}>
                        {/* Lots types : un chantier complet, déjà proportionné */}
                        <p className={`px-3 pt-2.5 pb-1 text-xs font-semibold ${textMuted}`}>Lots types</p>
                        {t.lots.map(lot => {
                          const total = lot.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
                          return (
                            <button key={lot.id} type="button"
                              onClick={() => onAppendBloc(lot.lignes, lot.nom)}
                              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2`}>
                              <Layers size={13} className="flex-shrink-0 mt-1 text-accent-texte" />
                              <span className="flex-1 min-w-0">
                                <span className={`block text-sm font-medium ${textPrimary}`}>{lot.nom}</span>
                                <span className={`block text-xs ${textMuted}`}>{lot.resume}</span>
                                <span className={`block text-xs mt-0.5 ${textMuted}`}>
                                  {lot.lignes.length} lignes · base {lot.base.quantite} {lot.base.unite}
                                </span>
                              </span>
                              <span className="text-xs font-bold whitespace-nowrap tabular-nums text-encre">
                                {Math.round(total).toLocaleString('fr-FR')} €
                              </span>
                            </button>
                          );
                        })}

                        {/* Prestations unitaires : une ligne à la fois */}
                        <p className={`px-3 pt-3 pb-1 text-xs font-semibold border-t ${textMuted} border-bord`}>Prestations</p>
                        {t.prestations.map((p, i) => (
                          <button key={`${t.id}-p${i}`} type="button"
                            onClick={() => onAddArticle(p)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2`}>
                            <Plus size={13} className="flex-shrink-0 text-accent-texte" />
                            <span className={`flex-1 min-w-0 ${textPrimary}`}>{p.designation}</span>
                            {/* Prix AU M² (ou à l'unité du métier) : c'est ce qui rend
                                la ligne ajustable une fois dans le devis. */}
                            <span className="text-xs font-semibold whitespace-nowrap tabular-nums text-encre">
                              {p.prixUnitaire.toLocaleString('fr-FR')} €/{p.unite}
                            </span>
                          </button>
                        ))}
                        <p className={`px-3 py-2 text-xs ${textMuted}`}>
                          Prix indicatifs moyens du marché — ajustez-les à vos tarifs, puis « Enregistrer comme modèle ».
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {trades.length === 0 && <p className={`text-xs ${textMuted}`}>Aucun métier ne correspond.</p>}
            </div>
          </div>

          {articlesFiltered.length > 0 && (
            <div>
              {sectionTitle(Star, 'Vos articles fréquents')}
              <div className="rounded-xl border divide-y bg-surface border-bord divide-bord">
                {articlesFiltered.slice(0, 12).map(a => (
                  <button key={a.id || a.nom} type="button" onClick={() => onAddArticle(a)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-2`}>
                    <Plus size={13} className="flex-shrink-0 text-accent-texte" />
                    <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>{a.nom}</span>
                    {(a.prix ?? a.prixUnitaire) > 0 && (
                      <span className="text-xs font-semibold whitespace-nowrap tabular-nums text-encre">
                        {eur(a.prix ?? a.prixUnitaire)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ── Aperçu PDF live (ce que le client recevra), sans créer le devis ── */
function PdfPreviewModal({ isDark, couleur, textPrimary, textMuted, html, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1100] flex flex-col" role="dialog" aria-modal="true" aria-label="Aperçu du document">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative m-2 sm:m-6 flex-1 flex flex-col rounded-2xl overflow-hidden border shadow-2xl bg-surface border-bord`}>
        <div className={`flex items-center justify-between px-4 sm:px-5 py-3 border-b flex-shrink-0 border-bord`}>
          <div className="min-w-0">
            <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${textPrimary}`}><Eye size={17} className="text-accent-texte" /> Ce que votre client recevra</h3>
            <p className={`text-xs ${textMuted} hidden sm:block`}>Aperçu en direct — rien n'est encore créé</p>
          </div>
          <button onClick={onClose} aria-label="Fermer l'aperçu" className={`p-2 rounded-lg flex-shrink-0 ${textMuted} hover:bg-surface-2`}><X size={18} /></button>
        </div>
        {/* fond neutre : le document dessine lui-même sa feuille A4 sur fond gris */}
        <iframe srcDoc={html} sandbox="" title="Aperçu du devis" className="flex-1 w-full border-0 bg-surface-2" />
      </div>
    </div>
  );
}

/* ── Prix d'achat / marge d'une ligne ── */
function MargeModal({ isDark, couleur, inputBg, textPrimary, textMuted, ligne, onClose, onApply }) {
  const [pa, setPa] = useState(ligne.prixAchat ? String(ligne.prixAchat) : '');
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus(); ref.current?.select();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const pu = num(ligne.prixUnitaire);
  const npa = num(pa);
  const margePct = pu > 0 ? Math.round(((pu - npa) / pu) * 100) : 0;
  const margeEur = (pu - npa) * num(ligne.quantite);
  const card = 'bg-surface border-bord';
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Prix d'achat et marge">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b border-bord`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}><Zap size={18} className="text-accent-texte" /> Prix d'achat / marge</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${textMuted} hover:bg-surface-2`}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className={`text-sm truncate ${textMuted}`}>{ligne.description || 'Ligne sans désignation'} — vendu {eur(pu)}/{ligne.unite || 'u'}</p>
          <div>
            <label className={LIBELLE}>Votre coût d'achat (HT, par {ligne.unite || 'u'})</label>
            <input ref={ref} type="text" inputMode="decimal" value={pa} onChange={e => setPa(e.target.value)} placeholder="0"
              className={`${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`} />
          </div>
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between bg-fond`}>
            <span className={`text-sm ${textMuted}`}>Marge sur la ligne</span>
            <span className={`text-xl font-extrabold tabular-nums ${margePct >= 25 ? 'text-succes-texte' : margePct >= 10 ? 'text-alerte-texte' : 'text-danger-texte'}`}>
              {margePct} % <span className="text-sm font-semibold">({eur(margeEur)})</span>
            </span>
          </div>
          <p className={`text-xs ${textMuted}`}>Jamais visible par le client — sert uniquement au badge de marge du devis.</p>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t border-bord`}>
          <button onClick={onClose} className={`flex-1 h-11 rounded-xl border text-sm font-semibold border-bord text-encre-2 hover:bg-surface-2`}>Annuler</button>
          <button onClick={() => onApply(npa)} className="flex-1 h-11 rounded-xl text-sm font-bold transition-all bg-accent text-sur-accent">Appliquer</button>
        </div>
      </div>
    </div>
  );
}

/* ── Enregistrer le devis courant comme modèle perso ── */
function SaveTemplateModal({ isDark, couleur, inputBg, textPrimary, textMuted, defaultName, onClose, onSave }) {
  const [nom, setNom] = useState(defaultName || '');
  const [categorie, setCategorie] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus(); ref.current?.select();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const card = 'bg-surface border-bord';
  const fieldCls = `${CHAMP} ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`;
  const labelCls = LIBELLE;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Enregistrer comme modèle">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b border-bord`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}><Star size={18} className="text-accent-texte" /> Enregistrer comme modèle</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${textMuted} hover:bg-surface-2`}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className={labelCls}>Nom du modèle</label><input ref={ref} value={nom} onChange={e => setNom(e.target.value)} placeholder="ex : Rénovation salle de bain type" className={fieldCls} /></div>
          <div><label className={labelCls}>Catégorie — option</label><input value={categorie} onChange={e => setCategorie(e.target.value)} placeholder="Mes modèles" className={fieldCls} /></div>
          <p className={`text-xs ${textMuted}`}>Les lignes chiffrées du devis seront enregistrées. Vous les retrouverez dans « Vos modèles » au prochain devis.</p>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t border-bord`}>
          <button onClick={onClose} className={`flex-1 h-11 rounded-xl border text-sm font-semibold border-bord text-encre-2 hover:bg-surface-2`}>Annuler</button>
          <button onClick={() => onSave(nom, categorie)} disabled={!nom.trim()}
            className="flex-1 h-11 rounded-xl text-sm font-bold disabled:opacity-50 transition-all bg-accent text-sur-accent">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/* ── Démarrage éclair : modèles métier + articles fréquents ── */
function QuickStart({ templates, articles, persoTemplates = [], onApplyTemplate, onApplyPerso, onAddArticle, onOpenLibrary, isDark, couleur, textPrimary, textMuted }) {
  const trades = Object.entries(TRADE_LIBRARY);
  const cardCls = `group flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 bg-surface border-bord hover:border-bord-fort`;
  return (
    <div className="space-y-4">
      {persoTemplates.length > 0 && (
        <div>
          <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 text-encre-2`}>
            <FileText size={12} className="text-accent-texte" /> Vos modèles
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {persoTemplates.map(tpl => (
              <button key={tpl.id} type="button" onClick={() => onApplyPerso(tpl)}
                className={`group flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 bg-surface border-bord hover:border-bord-fort`}>
                <span className={`text-sm font-semibold truncate w-full ${textPrimary}`}>{tpl.nom}</span>
                <span className={`text-xs ${textMuted}`}>{(tpl.lignes || []).length} lignes{tpl.categorie ? ` · ${tpl.categorie}` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 text-encre-2`}>
          <Sparkles size={12} className="text-accent-texte" /> Démarrer avec un modèle métier
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {templates.map(tpl => (
            <button key={tpl.label} type="button" onClick={() => onApplyTemplate(tpl)} className={cardCls}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 text-accent-texte bg-accent/10">
                <tpl.Icon size={18} />
              </span>
              <span className={`text-xs font-medium text-center leading-tight ${textPrimary}`}>{tpl.label}</span>
              {/* « à chiffrer » : ces trames n'ont pas de prix — le dire évite
                  la déception d'un devis à 0 € après le clic. */}
              <span className={`text-xs ${textMuted}`}>{tpl.lignes.length} lignes · à chiffrer</span>
            </button>
          ))}
        </div>

        {/* Accès aux 17 métiers CHIFFRÉS : c'est la vraie valeur, on l'annonce
            explicitement plutôt que de la cacher derrière « Tous les métiers ». */}
        <button type="button" onClick={onOpenLibrary}
          className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all border-bord text-encre-2 hover:bg-surface-2`}>
          <Library size={13} /> Parcourir les {trades.length} métiers chiffrés
        </button>
      </div>

      {articles.length > 0 && (
        <div>
          <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 text-encre-2`}>
            <Star size={12} className="text-accent-texte" /> Vos articles fréquents
          </p>
          <div className="flex flex-wrap gap-2">
            {articles.map(a => (
              <button key={a.id} type="button" onClick={() => onAddArticle(a)}
                className={`group flex items-center gap-2 pl-3.5 pr-2 py-1.5 min-h-[44px] max-w-full sm:max-w-[280px] rounded-2xl border text-sm text-left transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95 bg-surface border-bord hover:border-bord-fort`}>
                <span className="min-w-0">
                  <span className={`block font-medium leading-snug line-clamp-2 ${textPrimary}`}>{a.nom}</span>
                  <span className="block text-xs font-semibold tabular-nums text-encre-2">{eur(a.prix ?? a.prixUnitaire ?? 0)}</span>
                </span>
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 text-accent-texte bg-accent/10" aria-hidden="true"><Plus size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Add-line row with catalogue autocomplete ── */
function AddLineRow({ catalogue, isDark, couleur, inputBg, textPrimary, textMuted, onAdd, empty, focusSignal }) {
  const [q, setQ] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  // Auto-focus la recherche à l'ouverture (desktop uniquement, pour ne pas ouvrir le clavier mobile d'office)
  useEffect(() => {
    if (empty && typeof window !== 'undefined' && window.innerWidth >= 640) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Boucle clavier : Entrée dans Qté/PU d'une ligne → retour à la recherche
  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);
  const suggestions = useMemo(() => {
    const query = norm(q.trim());
    if (!query) return [];
    return catalogue
      .filter(a => norm(a.nom || a.designation).includes(query) || norm(a.reference).includes(query))
      .slice(0, 6);
  }, [q, catalogue]);
  const showFree = q.trim().length > 0;

  const pick = (item) => { onAdd(item); setQ(''); setHighlight(0); inputRef.current?.focus(); };
  const pickFree = () => { onAdd({ nom: q.trim() }); setQ(''); setHighlight(0); inputRef.current?.focus(); };

  const onKeyDown = (e) => {
    const max = suggestions.length + (showFree ? 1 : 0);
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(max - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length && highlight < suggestions.length) pick(suggestions[highlight]);
      else if (q.trim()) pickFree();
    } else if (e.key === 'Escape') { setQ(''); }
  };

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 ${empty ? '' : `border-t border-bord`}`}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-accent-texte bg-accent/10" aria-hidden="true">
          <Plus size={16} />
        </span>
        <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setHighlight(0); }} onKeyDown={onKeyDown}
          placeholder={catalogue.length ? 'Ajouter une prestation… (tapez pour chercher dans le catalogue)' : 'Ajouter une ligne… (désignation libre)'}
          className={`flex-1 h-9 px-2 rounded-lg border-0 bg-transparent text-sm ${textPrimary} placeholder:${textMuted} focus:outline-none`} />
        {q.trim() && <button onClick={pickFree} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-accent-texte"><CornerDownLeft size={13} /> Ajouter</button>}
      </div>

      {(suggestions.length > 0 || showFree) && (
        <div className={`absolute left-2 right-2 sm:left-4 sm:right-4 top-full z-30 rounded-xl border shadow-xl overflow-hidden bg-surface border-bord`}>
          {suggestions.map((a, i) => (
            <button key={a.id || i} onMouseEnter={() => setHighlight(i)} onClick={() => pick(a)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${highlight === i ? 'bg-fond' : ''}`}>
              <Package size={16} className="flex-shrink-0 text-accent-texte" />
              <span className="flex-1 min-w-0">
                <span className={`block truncate text-sm font-medium ${textPrimary}`}>{a.nom || a.designation}</span>
                {a.categorie && <span className={`block truncate text-xs ${textMuted}`}>{a.categorie}</span>}
              </span>
              <span className={`text-sm font-semibold whitespace-nowrap ${textPrimary}`}>{eur(a.prix ?? a.prixUnitaire ?? 0)}<span className={`text-xs font-normal ${textMuted}`}>/{a.unite || 'u'}</span></span>
            </button>
          ))}
          {showFree && (
            <button onMouseEnter={() => setHighlight(suggestions.length)} onClick={pickFree}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-t border-bord ${highlight === suggestions.length ? 'bg-fond' : ''}`}>
              <Plus size={16} className="flex-shrink-0 text-accent-texte" />
              <span className={`text-sm ${textPrimary}`}>Créer <span className="font-semibold">« {q.trim()} »</span> <span className={textMuted}>(ligne libre)</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
