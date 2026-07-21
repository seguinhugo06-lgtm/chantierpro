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

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Plus, Search, Trash2, ChevronUp, ChevronDown, User,
  UserPlus, FileText, Receipt, Check, Loader2, Percent, StickyNote,
  Package, Zap, CornerDownLeft, Droplets, Paintbrush, Hammer, Star, Sparkles, Ruler, X,
  Eye, AlertTriangle,
} from 'lucide-react';
import QuickClientModal from './QuickClientModal';
import { generateId } from '../lib/utils';
import { formatClientName } from '../lib/formatters';
import { buildDevisHtml } from '../lib/devisHtmlBuilder';
import { SMART_TEMPLATES } from '../lib/templates/smart-templates';

const DRAFT_KEY = 'batigesti_devis_composer_draft';
const MRU_KEY = 'batigesti_recent_clients';
const RECENT_ARTICLES_KEY = 'batigesti_recent_articles';
const UNITES = ['u', 'm²', 'ml', 'm³', 'h', 'j', 'forfait', 'ens.', 'pièce', 'kg', 'L', 'lot'];

/** Modèles métier : squelettes de devis prêts à chiffrer (mêmes trames que le formulaire classique). */
const METIER_TEMPLATES = [
  { label: 'Rénovation SDB', Icon: Droplets, lignes: ['Dépose sanitaires existants', 'Démolition carrelage mural et sol', 'Alimentation eau chaude/froide', 'Évacuation', 'Pose carrelage sol', 'Pose faïence murale', 'Pose douche italienne', 'Pose meuble vasque', 'Pose WC suspendu'] },
  { label: 'Peinture', Icon: Paintbrush, lignes: ['Protection sols et meubles', 'Lessivage des murs', 'Rebouchage fissures', 'Peinture murs 2 couches', 'Peinture plafond', 'Peinture boiseries'] },
  { label: 'Électricité', Icon: Zap, lignes: ['Pose tableau électrique', 'Tirage de câbles', 'Pose prises et interrupteurs', 'Pose points d\'éclairage'] },
  { label: 'Démolition', Icon: Hammer, lignes: ['Dépose des revêtements existants', 'Évacuation des gravats', 'Nettoyage du chantier'] },
];

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
  couleur = '#f97316',
  onPreview,
}) {
  const isEditMode = !!initialData;

  const blankForm = () => ({
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: new Date().toISOString().split('T')[0],
    validite: entreprise?.validiteDevis || entreprise?.validite_devis || 30,
    tvaDefaut: entreprise?.tvaDefaut || entreprise?.tva_defaut || 10,
    lignes: [],
    remise: 0,
    acompte: 0,
    conditions: '',
    notes: '',
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
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [error, setError] = useState('');

  // ── Theme ──
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-900/60 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50';

  // ── Load initialData / restore draft ──
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      const tvaDef = initialData.tvaRate || initialData.tva_rate || entreprise?.tvaDefaut || 10;
      const mapLigne = (l, i) => ({
        id: l.id || `line-${i}-${Date.now()}`,
        description: l.description || '',
        quantite: l.quantite ?? 1,
        unite: l.unite || 'u',
        prixUnitaire: l.prixUnitaire ?? 0,
        prixAchat: l.prixAchat ?? 0,
        tva: l.tva !== undefined ? l.tva : tvaDef,
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
        date: initialData.date || new Date().toISOString().split('T')[0],
        validite: initialData.validite || entreprise?.validiteDevis || 30,
        tvaDefaut: tvaDef,
        lignes,
        remise: initialData.remise || 0,
        acompte: initialData.acompte_pct || initialData.acompte || 0,
        conditions: initialData.conditions || '',
        notes: initialData.notes || '',
      });
      return;
    }
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      const draft = saved ? JSON.parse(saved) : null;
      if (draft && (draft.clientId || draft.lignes?.length > 0)) {
        setForm({ ...blankForm(), ...draft, date: new Date().toISOString().split('T')[0] });
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
  }, [isOpen, initialData]);

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
  const totals = useMemo(() => {
    let totalHT = 0, tvaTotal = 0, totalCost = 0;
    form.lignes.forEach(l => {
      if (l._isSection) return; // les titres de lot ne comptent pas
      const montant = num(l.quantite) * num(l.prixUnitaire);
      const taux = l.tva !== undefined ? l.tva : form.tvaDefaut;
      totalHT += montant;
      totalCost += num(l.quantite) * num(l.prixAchat);
      tvaTotal += montant * (taux / 100);
    });
    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    const tvaApresRemise = tvaTotal * (1 - form.remise / 100);
    const totalTTC = htApresRemise + tvaApresRemise;
    const costAfterRemise = totalCost * (1 - form.remise / 100);
    const margePercent = htApresRemise > 0 ? ((htApresRemise - costAfterRemise) / htApresRemise) * 100 : 0;
    return { totalHT, tvaTotal, remiseAmount, htApresRemise, tvaApresRemise, totalTTC, margePercent };
  }, [form.lignes, form.tvaDefaut, form.remise]);

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
      prev.unshift({ id: item.id, nom: item.nom || item.designation || '', prix: item.prix ?? item.prixUnitaire ?? 0, unite: item.unite || 'u', prixAchat: item.prixAchat ?? 0, categorie: item.categorie || '' });
      localStorage.setItem(RECENT_ARTICLES_KEY, JSON.stringify(prev.slice(0, 8)));
    } catch { /* ignore */ }
  }, []);

  const quickArticles = useMemo(() => {
    let recents = [];
    try { recents = JSON.parse(localStorage.getItem(RECENT_ARTICLES_KEY) || '[]'); } catch { /* ignore */ }
    const favs = (catalogue || []).filter(c => c.favori);
    const seen = new Set();
    const merged = [];
    [...recents, ...favs].forEach(a => { if (a && a.id && !seen.has(a.id)) { seen.add(a.id); merged.push(a); } });
    return merged.slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, isOpen]);

  // ── Lignes ──
  const addLigne = (item = {}) => {
    if (item.id) rememberArticle(item);
    const newId = generateId();
    const prix = item.prix ?? item.prixUnitaire ?? 0;
    setForm(p => ({
      ...p,
      lignes: [...p.lignes, {
        id: newId,
        description: item.nom || item.description || '',
        quantite: item.quantite || 1,
        unite: item.unite || 'u',
        prixUnitaire: prix,
        prixAchat: item.prixAchat ?? 0,
        tva: p.tvaDefaut,
      }],
    }));
    // Article chiffré → la prochaine saisie est la quantité ; ligne libre → le prix
    setFocusField({ lineId: newId, field: prix > 0 ? 'quantite' : 'prixUnitaire' });
  };

  const applyTemplate = (tpl) => {
    setForm(p => ({
      ...p,
      lignes: tpl.lignes.map(desc => ({
        id: generateId(), description: desc, quantite: 1, unite: 'u', prixUnitaire: 0, prixAchat: 0, tva: p.tvaDefaut,
      })),
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
      tva: l.tva !== undefined ? l.tva : (tpl.tva_defaut || form.tvaDefaut),
    }));
    setForm(p => ({ ...p, lignes, tvaDefaut: tpl.tva_defaut || tpl.tvaDefaut || p.tvaDefaut, notes: tpl.notes || p.notes }));
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

  // ── Construction du devisData (partagée entre Créer et Aperçu) ──
  const buildDevisData = () => {
    const roundEuro = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    const fmt = (l) => ({
      ...l,
      quantite: Math.max(0, num(l.quantite)),
      prixUnitaire: Math.max(0, num(l.prixUnitaire)),
      prixAchat: num(l.prixAchat),
      montant: num(l.quantite) * num(l.prixUnitaire),
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
      validite: form.validite,
      statut: isEditMode ? initialData.statut : 'brouillon',
      tvaRate: form.tvaDefaut,
      lignes: lignesFormatted,
      sections: sections.length ? sections : [{ id: '1', titre: '', lignes: lignesFormatted }],
      remise: form.remise,
      acompte_pct: form.acompte || undefined,
      conditions: form.conditions || undefined,
      notes: form.notes,
      total_ht: roundEuro(totals.htApresRemise),
      tva: roundEuro(totals.tvaApresRemise),
      total_ttc: roundEuro(totals.totalTTC),
    };
  };

  // ── Submit ──
  const handleSubmit = async (thenPreview = false) => {
    if (!form.clientId) { setError('Choisissez un client.'); setShowClientPicker(true); return; }
    const priced = form.lignes.filter(l => !l._isSection && (l.description || '').trim());
    if (priced.length === 0) { setError('Ajoutez au moins une ligne.'); return; }
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

  // Mentions légales manquantes — prévenir PENDANT la composition, pas au moment d'envoyer
  const legalMissing = useMemo(() => {
    const missing = [];
    if (!entreprise?.siret) missing.push('SIRET');
    if (!entreprise?.adresse) missing.push('adresse');
    if (!(entreprise?.formeJuridique || entreprise?.forme_juridique)) missing.push('forme juridique');
    if (!(entreprise?.decennaleAssureur || entreprise?.decennale_assureur) || !(entreprise?.decennaleNumero || entreprise?.decennale_numero)) missing.push('assurance décennale');
    return missing;
  }, [entreprise]);

  if (!isOpen || typeof document === 'undefined') return null;
  const isFacture = form.type === 'facture';

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex flex-col" style={{ background: isDark ? '#0b1220' : '#f8fafc' }}>
      {/* ── Top bar ── */}
      <header className={`flex items-center gap-3 px-3 sm:px-5 h-14 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} flex-shrink-0`}>
        <button onClick={onClose} aria-label="Fermer" className={`p-2 rounded-lg ${rowHover} ${textMuted} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className={`text-base font-bold truncate ${textPrimary}`}>{isEditMode ? 'Modifier' : 'Nouveau'} {isFacture ? 'facture' : 'devis'}</h1>
        </div>
        {/* Type toggle (visible aussi en mobile) */}
        {!isEditMode && (
          <div className={`flex items-center rounded-xl p-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {[{ v: 'devis', label: 'Devis', Icon: FileText }, { v: 'facture', label: 'Facture', Icon: Receipt }].map(({ v, label, Icon }) => (
              <button key={v} onClick={() => setForm(p => ({ ...p, type: v }))} aria-label={label} aria-pressed={form.type === v}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.type === v ? 'text-white shadow' : textMuted}`}
                style={form.type === v ? { background: couleur } : undefined}>
                <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => handleSubmit(false)} disabled={isSubmitting}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-white text-sm font-semibold shadow-lg disabled:opacity-60 transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ background: couleur }}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          <span className="hidden sm:inline">{isEditMode ? 'Enregistrer' : 'Créer'}</span>
        </button>
      </header>

      {draftRestored && (
        <div className="px-3 sm:px-5 py-2 text-xs flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20">
          <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>Brouillon restauré — reprenez où vous en étiez.</span>
          <button onClick={() => { clearDraft(); setForm(blankForm()); setDraftRestored(false); }} className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'} hover:underline`}>Recommencer</button>
        </div>
      )}

      {legalMissing.length > 0 && (
        <div className="px-3 sm:px-5 py-2 text-xs flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
          <span className={`flex-1 min-w-0 truncate ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            L'envoi sera bloqué — profil incomplet : {legalMissing.join(', ')}.
          </span>
          {onCompleteProfile && (
            <button onClick={onCompleteProfile} className={`font-semibold whitespace-nowrap ${isDark ? 'text-amber-300' : 'text-amber-700'} hover:underline`}>
              Compléter →
            </button>
          )}
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 pb-40">

          {/* Client + date */}
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
                <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className={`w-full px-3 h-11 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
              </div>
            </div>
            {chantiers.length > 0 && (
              <div className="mt-3">
                <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Chantier — adresse des travaux</label>
                <select value={form.chantierId} onChange={e => setForm(p => ({ ...p, chantierId: e.target.value }))}
                  className={`w-full px-3 h-11 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
                  <option value="">Aucun — utiliser l'adresse du client</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Lignes */}
          <div className={`rounded-2xl border ${cardBg}`}>
            {/* header row (desktop) */}
            {form.lignes.length > 0 && (
              <div className={`hidden sm:grid grid-cols-[1fr_52px_60px_74px_54px_92px_30px] gap-2 px-4 py-2 rounded-t-2xl text-[11px] font-semibold uppercase tracking-wide ${textMuted} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <span>Désignation</span><span className="text-center">Qté</span><span className="text-center">Unité</span><span className="text-center">PU HT</span><span className="text-center">TVA</span><span className="text-right">Total HT</span><span />
              </div>
            )}
            <div>
              {form.lignes.map((ligne, index) => (
                ligne._isSection ? (
                  <SectionRow key={ligne.id} ligne={ligne} index={index} total={form.lignes.length} subtotal={sectionSubtotals[index] || 0}
                    shouldFocus={ligne.id === focusLotId} isDark={isDark} couleur={couleur} textPrimary={textPrimary} textMuted={textMuted}
                    onUpdate={(v) => updateLigne(ligne.id, 'description', v)} onRemove={() => removeLigne(ligne.id)}
                    onMoveUp={() => moveLigne(index, -1)} onMoveDown={() => moveLigne(index, 1)} />
                ) : (
                  <LigneRow key={ligne.id} ligne={ligne} index={index} total={form.lignes.length}
                    isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted} rowHover={rowHover}
                    onUpdate={(f, v) => updateLigne(ligne.id, f, v)} onRemove={() => removeLigne(ligne.id)}
                    onMoveUp={() => moveLigne(index, -1)} onMoveDown={() => moveLigne(index, 1)} onDuplicate={() => duplicateLigne(ligne.id)}
                    onMetre={() => setMetreLineId(ligne.id)}
                    onInsertLot={() => insertLotAbove(index)}
                    onMarge={() => setMargeLineId(ligne.id)}
                    focusField={focusField && focusField.lineId === ligne.id ? focusField.field : null}
                    onFocusHandled={() => setFocusField(null)}
                    onLineEnter={() => setFocusSearchTick(t => t + 1)} />
                )
              ))}
            </div>

            {/* Add line with catalogue autocomplete */}
            <AddLineRow catalogue={catalogue} isDark={isDark} couleur={couleur} inputBg={inputBg} textPrimary={textPrimary} textMuted={textMuted} onAdd={addLigne} empty={form.lignes.length === 0} focusSignal={focusSearchTick} />

            {/* Ajouter un lot / enregistrer comme modèle */}
            {form.lignes.length > 0 && (
              <div className={`px-3 sm:px-4 pb-3 flex flex-wrap items-center gap-2 ${hasLots ? '' : 'pt-0'}`}>
                <button type="button" onClick={addLot}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <Plus size={13} /> Ajouter un lot
                </button>
                {addTemplate && (
                  <button type="button" onClick={() => setShowSaveTemplate(true)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Star size={13} /> Enregistrer comme modèle
                  </button>
                )}
                {!hasLots && <span className={`text-[11px] ${textMuted}`}>Regroupez par pièce ou corps d'état (Salle de bain, Cuisine…)</span>}
              </div>
            )}

            {/* Démarrage éclair (uniquement quand le devis est vide) */}
            {form.lignes.length === 0 && (
              <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} p-3 sm:p-4`}>
                <QuickStart templates={METIER_TEMPLATES} articles={quickArticles} persoTemplates={customTemplates}
                  onApplyTemplate={applyTemplate} onApplyPerso={applyPersoTemplate} onAddArticle={addLigne}
                  isDark={isDark} couleur={couleur} textPrimary={textPrimary} textMuted={textMuted} />
              </div>
            )}
          </div>

          {/* Options (remise / notes) */}
          <div className={`rounded-2xl border ${cardBg}`}>
            <button onClick={() => setShowOptions(o => !o)} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${textPrimary}`}>
              <span className="flex items-center gap-2"><Percent size={15} style={{ color: couleur }} /> Remise, notes & options</span>
              <ChevronDown size={16} className={`${textMuted} transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </button>
            {showOptions && (
              <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} pt-3`}>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>TVA — appliquer à tout le devis</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ v: 20, sub: 'neuf' }, { v: 10, sub: 'réno' }, { v: 5.5, sub: 'éco-réno' }, { v: 0, sub: 'exonéré' }].map(({ v, sub }) => (
                      <button key={v} type="button"
                        onClick={() => setForm(p => ({ ...p, tvaDefaut: v, lignes: p.lignes.map(l => l._isSection ? l : { ...l, tva: v }) }))}
                        className={`px-3 h-9 rounded-lg text-xs font-semibold border transition-all ${form.tvaDefaut === v && form.lignes.every(l => l._isSection || l.tva === v) ? 'text-white' : isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        style={form.tvaDefaut === v && form.lignes.every(l => l._isSection || l.tva === v) ? { background: couleur, borderColor: couleur } : undefined}>
                        {String(v).replace('.', ',')} % <span className="font-normal opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Remise %</label>
                    <input type="number" min="0" max="100" value={form.remise || ''} onChange={e => setForm(p => ({ ...p, remise: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                      placeholder="0" className={`w-full px-3 h-10 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
                  </div>
                  {!isFacture && (
                    <div>
                      <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Validité (jours)</label>
                      <input type="number" min="1" value={form.validite} onChange={e => setForm(p => ({ ...p, validite: parseInt(e.target.value) || 30 }))}
                        className={`w-full px-3 h-10 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!isFacture && (
                    <div>
                      <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Acompte demandé %</label>
                      <input type="number" min="0" max="100" value={form.acompte || ''} onChange={e => setForm(p => ({ ...p, acompte: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                        placeholder="0" className={`w-full px-3 h-10 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
                    </div>
                  )}
                  <div>
                    <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Conditions de règlement</label>
                    <select value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))}
                      className={`w-full px-3 h-10 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
                      <option value="">Standard — à réception</option>
                      <option value="Paiement à réception de facture">À réception de facture</option>
                      <option value="Paiement à 30 jours">Paiement à 30 jours</option>
                      <option value="Acompte à la commande, solde à la livraison">Acompte + solde à la livraison</option>
                      <option value="Paiement échelonné selon l'avancement des travaux">Échelonné selon l'avancement</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}><StickyNote size={12} className="inline mr-1" />Notes (visibles sur le PDF)</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                    placeholder="Conditions particulières, délais…" className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-500 font-medium">{error}</div>
          )}
        </div>
      </div>

      {/* ── Sticky total bar ── */}
      <footer className={`flex-shrink-0 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} shadow-[0_-4px_20px_rgba(0,0,0,0.06)]`}>
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3 flex items-center gap-3 sm:gap-5">
          <div className="flex-1 min-w-0 flex items-baseline gap-3 sm:gap-5 flex-wrap">
            <div className="hidden sm:flex items-baseline gap-1.5">
              <span className={`text-xs ${textMuted}`}>HT</span>
              <span className={`text-sm font-semibold ${textPrimary}`}>{eur(totals.htApresRemise)}</span>
            </div>
            {form.remise > 0 && (
              <div className="hidden sm:flex items-baseline gap-1.5">
                <span className="text-xs text-red-500">−{form.remise}%</span>
              </div>
            )}
            <div className="hidden sm:flex items-baseline gap-1.5">
              <span className={`text-xs ${textMuted}`}>TVA</span>
              <span className={`text-sm font-semibold ${textPrimary}`}>{eur(totals.tvaApresRemise)}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xs font-semibold uppercase ${textMuted}`}>TTC</span>
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums" style={{ color: couleur }}>{eur(animatedTTC)}</span>
            </div>
            {totals.margePercent > 0 && form.lignes.some(l => l.prixAchat > 0) && (
              <div className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${totals.margePercent >= 25 ? 'bg-emerald-500/15 text-emerald-500' : totals.margePercent >= 10 ? 'bg-amber-500/15 text-amber-500' : 'bg-red-500/15 text-red-500'}`}>
                <Zap size={11} /> {Math.round(totals.margePercent)}% marge
              </div>
            )}
          </div>
          {form.lignes.some(l => !l._isSection && (l.description || '').trim()) && (
            <button onClick={() => setShowPdfPreview(true)} disabled={isSubmitting}
              aria-label="Aperçu du document"
              className={`flex items-center gap-2 px-3 sm:px-4 h-11 rounded-xl text-sm font-semibold border transition-all ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Eye size={16} /> <span className="hidden sm:inline">Aperçu</span>
            </button>
          )}
          <button onClick={() => handleSubmit(false)} disabled={isSubmitting}
            className="flex items-center gap-2 px-5 h-11 rounded-xl text-white text-sm font-bold shadow-lg disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: couleur }}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {isEditMode ? 'Enregistrer' : (isFacture ? 'Créer la facture' : 'Créer le devis')}
          </button>
        </div>
      </footer>

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
      <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Client</label>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 h-11 rounded-xl border text-sm text-left transition-all ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'} hover:border-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
        style={selectedClient ? { borderColor: `${couleur}55` } : undefined} aria-haspopup="true" aria-expanded={open}>
        {selectedClient ? (
          <>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: couleur }}>
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
        <div className={`absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`p-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="relative">
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input autoFocus value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Rechercher un client…"
                className={`w-full pl-9 pr-3 h-10 rounded-lg border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {!clientSearch.trim() && recentClients.length > 0 && (
              <p className={`px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide ${textMuted}`}>Récents</p>
            )}
            {list.map(c => (
              <button key={c.id} onClick={() => onSelect(c.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: couleur }}>{(c.nom || '?')[0]?.toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate font-medium ${textPrimary}`}>{formatClientName(c)}</span>
                  {c.entreprise && <span className={`block truncate text-xs ${textMuted}`}>{c.entreprise}</span>}
                </span>
              </button>
            ))}
            {list.length === 0 && <p className={`px-3 py-4 text-center text-sm ${textMuted}`}>Aucun client</p>}
          </div>
          <button onClick={onQuickAdd} className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-t ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`} style={{ color: couleur }}>
            <UserPlus size={16} /> Nouveau client
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Titre de lot (section) ── */
function SectionRow({ ligne, index, total, subtotal, shouldFocus, isDark, couleur, textPrimary, textMuted, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const inputRef = useRef(null);
  useEffect(() => { if (shouldFocus) inputRef.current?.focus(); }, [shouldFocus]);
  return (
    <div className={`group border-b ${isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50/80'}`}>
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2">
        <span className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: couleur }} />
        <input ref={inputRef} value={ligne.description} onChange={e => onUpdate(e.target.value)} placeholder="Titre du lot (ex : Salle de bain)"
          className={`flex-1 min-w-0 h-8 px-2 rounded-lg border-0 bg-transparent text-sm font-bold ${textPrimary} placeholder:font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
        <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>{eur(subtotal)}</span>
        <div className="flex items-center flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} aria-label="Monter le lot" className={`p-1 rounded ${textMuted} disabled:opacity-30 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} aria-label="Descendre le lot" className={`p-1 rounded ${textMuted} disabled:opacity-30 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><ChevronDown size={14} /></button>
          <button onClick={onRemove} aria-label="Supprimer le lot" className="p-1 rounded text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

/* ── Editable line row ── */
function LigneRow({ ligne, index, total, isDark, couleur, inputBg, textPrimary, textMuted, rowHover, onUpdate, onRemove, onMoveUp, onMoveDown, onDuplicate, onMetre, onInsertLot, onMarge, focusField, onFocusHandled, onLineEnter }) {
  const lineTotal = num(ligne.quantite) * num(ligne.prixUnitaire);
  const numCls = `w-full h-9 rounded-lg border text-sm text-center ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`;
  // Boucle clavier : focus + sélection du champ demandé (desktop OU mobile selon visibilité)
  const qtyDesktopRef = useRef(null), qtyMobileRef = useRef(null), puDesktopRef = useRef(null), puMobileRef = useRef(null);
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
    <div className={`group border-b last:border-b-0 ${isDark ? 'border-slate-800' : 'border-slate-100'} ${rowHover} transition-colors`}>
      {/* Desktop grid */}
      <div className="hidden sm:grid grid-cols-[1fr_52px_60px_74px_54px_92px_30px] gap-2 items-center px-4 py-2">
        <textarea value={ligne.description} onChange={e => onUpdate('description', e.target.value)} placeholder="Désignation…" rows={1}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          className={`w-full min-h-[36px] px-2 py-1.5 rounded-lg border text-sm resize-none overflow-hidden leading-snug ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
        <input ref={qtyDesktopRef} type="text" inputMode="decimal" value={ligne.quantite} onChange={e => onUpdate('quantite', e.target.value)} onKeyDown={numKeyDown} aria-label="Quantité" className={numCls} />
        <select value={UNITES.includes(ligne.unite) ? ligne.unite : (ligne.unite ? '__autre' : 'u')} onChange={e => onUpdate('unite', e.target.value === '__autre' ? (ligne.unite || '') : e.target.value)} aria-label="Unité"
          className={`w-full h-9 px-1 rounded-lg border text-xs text-center ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
          {ligne.unite && !UNITES.includes(ligne.unite) && <option value="__autre">{ligne.unite}</option>}
        </select>
        <input ref={puDesktopRef} type="text" inputMode="decimal" value={ligne.prixUnitaire} onChange={e => onUpdate('prixUnitaire', e.target.value)} onKeyDown={numKeyDown} aria-label="Prix unitaire HT" className={numCls} />
        <select value={ligne.tva} onChange={e => onUpdate('tva', parseFloat(e.target.value))} className={`w-full h-9 rounded-lg border text-xs text-center ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
          {[0, 5.5, 10, 20].map(t => <option key={t} value={t}>{t}%</option>)}
        </select>
        <span className={`text-sm font-semibold text-right tabular-nums ${textPrimary}`}>{eur(lineTotal)}</span>
        <LineMenu isDark={isDark} textMuted={textMuted} index={index} total={total} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDuplicate={onDuplicate} onRemove={onRemove} onMetre={onMetre} onInsertLot={onInsertLot} onMarge={onMarge} />
      </div>
      {/* Mobile card */}
      <div className="sm:hidden p-3 space-y-2">
        <div className="flex items-start gap-2">
          <textarea value={ligne.description} onChange={e => onUpdate('description', e.target.value)} placeholder="Désignation…" rows={1}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            className={`flex-1 min-h-[40px] px-3 py-2 rounded-lg border text-sm resize-none overflow-hidden leading-snug ${inputBg}`} />
          <button onClick={onMetre} aria-label="Métré" className={`p-2 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}><Ruler size={16} /></button>
          <button onClick={onRemove} aria-label="Supprimer" className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className={`block text-[10px] mb-0.5 ${textMuted}`}>Qté</span><input ref={qtyMobileRef} type="text" inputMode="decimal" value={ligne.quantite} onChange={e => onUpdate('quantite', e.target.value)} onKeyDown={numKeyDown} className={`w-full h-9 px-2 rounded-lg border text-sm ${inputBg}`} /></div>
          <div><span className={`block text-[10px] mb-0.5 ${textMuted}`}>Unité</span><select value={UNITES.includes(ligne.unite) ? ligne.unite : (ligne.unite ? '__autre' : 'u')} onChange={e => onUpdate('unite', e.target.value === '__autre' ? (ligne.unite || '') : e.target.value)} className={`w-full h-9 px-1 rounded-lg border text-sm ${inputBg}`}>{UNITES.map(u => <option key={u} value={u}>{u}</option>)}{ligne.unite && !UNITES.includes(ligne.unite) && <option value="__autre">{ligne.unite}</option>}</select></div>
          <div><span className={`block text-[10px] mb-0.5 ${textMuted}`}>PU HT</span><input ref={puMobileRef} type="text" inputMode="decimal" value={ligne.prixUnitaire} onChange={e => onUpdate('prixUnitaire', e.target.value)} onKeyDown={numKeyDown} className={`w-full h-9 px-2 rounded-lg border text-sm ${inputBg}`} /></div>
          <div><span className={`block text-[10px] mb-0.5 ${textMuted}`}>TVA</span><select value={ligne.tva} onChange={e => onUpdate('tva', parseFloat(e.target.value))} className={`w-full h-9 rounded-lg border text-sm ${inputBg}`}>{[0, 5.5, 10, 20].map(t => <option key={t} value={t}>{t}%</option>)}</select></div>
        </div>
        <div className="flex justify-end"><span className={`text-sm font-bold ${textPrimary}`}>{eur(lineTotal)}</span></div>
      </div>
    </div>
  );
}

function LineMenu({ isDark, textMuted, index, total, onMoveUp, onMoveDown, onDuplicate, onRemove, onMetre, onInsertLot, onMarge }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!open) return; const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  return (
    <div className="relative flex justify-center" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Actions de ligne" aria-haspopup="true" aria-expanded={open}
        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open && (
        <div onKeyDown={e => e.key === 'Escape' && setOpen(false)} role="menu" className={`absolute right-0 top-full mt-1 z-30 w-40 rounded-lg border shadow-lg py-1 text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
          {onMetre && <button role="menuitem" onClick={() => { onMetre(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><Ruler size={14} /> Métré L × l</button>}
          {onMarge && <button role="menuitem" onClick={() => { onMarge(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><Zap size={14} /> Prix d'achat / marge</button>}
          {onInsertLot && <button role="menuitem" onClick={() => { onInsertLot(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><Plus size={14} /> Lot au-dessus</button>}
          <button role="menuitem" disabled={index === 0} onClick={() => { onMoveUp(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-40 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><ChevronUp size={14} /> Monter</button>
          <button role="menuitem" disabled={index === total - 1} onClick={() => { onMoveDown(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-40 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><ChevronDown size={14} /> Descendre</button>
          <button role="menuitem" onClick={() => { onDuplicate(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><Plus size={14} /> Dupliquer</button>
          <button role="menuitem" onClick={() => { onRemove(); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left text-red-500 ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}><Trash2 size={14} /> Supprimer</button>
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
  const nL = parseFloat(L) || 0, nl = parseFloat(larg) || 0, nh = parseFloat(haut) || 0, nN = parseFloat(nb) || 1, nC = parseFloat(chutes) || 0;
  const has3d = nh > 0;
  const qty = Math.round(nL * nl * (has3d ? nh : 1) * nN * (1 + nC / 100) * 100) / 100;
  const unite = has3d ? 'm³' : 'm²';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const fieldCls = `w-full px-3 h-11 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`;
  const labelCls = `block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Métré express">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}><Ruler size={18} style={{ color: couleur }} /> Métré express</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Longueur (m)</label><input ref={firstRef} type="number" min="0" step="any" inputMode="decimal" value={L} onChange={e => setL(e.target.value)} placeholder="0" className={fieldCls} /></div>
            <div><label className={labelCls}>Largeur (m)</label><input type="number" min="0" step="any" inputMode="decimal" value={larg} onChange={e => setLarg(e.target.value)} placeholder="0" className={fieldCls} /></div>
            <div><label className={labelCls}>Hauteur (m) — option</label><input type="number" min="0" step="any" inputMode="decimal" value={haut} onChange={e => setHaut(e.target.value)} placeholder="—" className={fieldCls} /></div>
            <div><label className={labelCls}>Nombre</label><input type="number" min="0" step="any" inputMode="decimal" value={nb} onChange={e => setNb(e.target.value)} placeholder="1" className={fieldCls} /></div>
          </div>
          <div><label className={labelCls}>Chutes / pertes %</label><input type="number" min="0" step="any" inputMode="decimal" value={chutes} onChange={e => setChutes(e.target.value)} placeholder="0" className={fieldCls} /></div>
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${isDark ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
            <span className={`text-sm ${textMuted}`}>Quantité calculée</span>
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: couleur }}>{qty.toLocaleString('fr-FR')} <span className="text-sm font-semibold">{unite}</span></span>
          </div>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button onClick={onClose} className={`flex-1 h-11 rounded-xl border text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Annuler</button>
          <button onClick={() => onApply(qty, unite)} disabled={qty <= 0}
            className="flex-1 h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all" style={{ background: couleur }}>
            Appliquer
          </button>
        </div>
      </div>
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
      <div className={`relative m-2 sm:m-6 flex-1 flex flex-col rounded-2xl overflow-hidden border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center justify-between px-4 sm:px-5 py-3 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="min-w-0">
            <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${textPrimary}`}><Eye size={17} style={{ color: couleur }} /> Ce que votre client recevra</h3>
            <p className={`text-[11px] ${textMuted} hidden sm:block`}>Aperçu en direct — rien n'est encore créé</p>
          </div>
          <button onClick={onClose} aria-label="Fermer l'aperçu" className={`p-2 rounded-lg flex-shrink-0 ${textMuted} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={18} /></button>
        </div>
        {/* fond neutre : le document dessine lui-même sa feuille A4 sur fond gris */}
        <iframe srcDoc={html} title="Aperçu du devis" className="flex-1 w-full border-0 bg-slate-200" />
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
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Prix d'achat et marge">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}><Zap size={18} style={{ color: couleur }} /> Prix d'achat / marge</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className={`text-sm truncate ${textMuted}`}>{ligne.description || 'Ligne sans désignation'} — vendu {eur(pu)}/{ligne.unite || 'u'}</p>
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>Votre coût d'achat (HT, par {ligne.unite || 'u'})</label>
            <input ref={ref} type="text" inputMode="decimal" value={pa} onChange={e => setPa(e.target.value)} placeholder="0"
              className={`w-full px-3 h-11 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`} />
          </div>
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${isDark ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
            <span className={`text-sm ${textMuted}`}>Marge sur la ligne</span>
            <span className={`text-xl font-extrabold tabular-nums ${margePct >= 25 ? 'text-emerald-500' : margePct >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
              {margePct} % <span className="text-sm font-semibold">({eur(margeEur)})</span>
            </span>
          </div>
          <p className={`text-[11px] ${textMuted}`}>Jamais visible par le client — sert uniquement au badge de marge du devis.</p>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button onClick={onClose} className={`flex-1 h-11 rounded-xl border text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Annuler</button>
          <button onClick={() => onApply(npa)} className="flex-1 h-11 rounded-xl text-white text-sm font-bold transition-all" style={{ background: couleur }}>Appliquer</button>
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
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const fieldCls = `w-full px-3 h-11 rounded-xl border text-sm ${inputBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`;
  const labelCls = `block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Enregistrer comme modèle">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}><Star size={18} style={{ color: couleur }} /> Enregistrer comme modèle</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className={labelCls}>Nom du modèle</label><input ref={ref} value={nom} onChange={e => setNom(e.target.value)} placeholder="ex : Rénovation salle de bain type" className={fieldCls} /></div>
          <div><label className={labelCls}>Catégorie — option</label><input value={categorie} onChange={e => setCategorie(e.target.value)} placeholder="Mes modèles" className={fieldCls} /></div>
          <p className={`text-xs ${textMuted}`}>Les lignes chiffrées du devis seront enregistrées. Vous les retrouverez dans « Vos modèles » au prochain devis.</p>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button onClick={onClose} className={`flex-1 h-11 rounded-xl border text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Annuler</button>
          <button onClick={() => onSave(nom, categorie)} disabled={!nom.trim()}
            className="flex-1 h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all" style={{ background: couleur }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/* ── Démarrage éclair : modèles métier + articles fréquents ── */
function QuickStart({ templates, articles, persoTemplates = [], onApplyTemplate, onApplyPerso, onAddArticle, isDark, couleur, textPrimary, textMuted }) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const [trade, setTrade] = useState(null); // clé SMART_TEMPLATES sélectionnée
  const trades = Object.entries(SMART_TEMPLATES);
  const cardCls = `group flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`;
  return (
    <div className="space-y-4">
      {persoTemplates.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${textMuted}`}>
            <FileText size={12} style={{ color: couleur }} /> Vos modèles
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {persoTemplates.map(tpl => (
              <button key={tpl.id} type="button" onClick={() => onApplyPerso(tpl)}
                className={`group flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <span className={`text-sm font-semibold truncate w-full ${textPrimary}`}>{tpl.nom}</span>
                <span className={`text-[10px] ${textMuted}`}>{(tpl.lignes || []).length} lignes{tpl.categorie ? ` · ${tpl.categorie}` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${textMuted}`}>
          <Sparkles size={12} style={{ color: couleur }} /> Démarrer avec un modèle métier
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {templates.map(tpl => (
            <button key={tpl.label} type="button" onClick={() => onApplyTemplate(tpl)} className={cardCls}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${couleur}18`, color: couleur }}>
                <tpl.Icon size={18} />
              </span>
              <span className={`text-xs font-medium text-center leading-tight ${textPrimary}`}>{tpl.label}</span>
              <span className={`text-[10px] ${textMuted}`}>{tpl.lignes.length} lignes</span>
            </button>
          ))}
        </div>

        {/* Tous les métiers (bibliothèque SMART_TEMPLATES : 17 métiers, missions chiffrées) */}
        <button type="button" onClick={() => { setTradeOpen(o => !o); if (tradeOpen) setTrade(null); }}
          className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <ChevronDown size={13} className={`transition-transform ${tradeOpen ? 'rotate-180' : ''}`} />
          {tradeOpen ? 'Masquer les métiers' : `Tous les métiers (${trades.length})`}
        </button>

        {tradeOpen && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {trades.map(([key, t]) => (
                <button key={key} type="button" onClick={() => setTrade(trade === key ? null : key)}
                  className={`flex items-center gap-1.5 px-2.5 h-8 rounded-full border text-xs font-medium transition-all ${trade === key ? 'text-white' : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={trade === key ? { background: couleur, borderColor: couleur } : undefined}>
                  <span aria-hidden="true">{t.icon}</span> {t.nom}
                </button>
              ))}
            </div>
            {trade && SMART_TEMPLATES[trade] && (
              <div className={`rounded-xl border divide-y ${isDark ? 'bg-slate-800/60 border-slate-700 divide-slate-700' : 'bg-white border-slate-200 divide-slate-100'}`}>
                {SMART_TEMPLATES[trade].missions.map(m => {
                  const prix = Math.round((m.prixMin + m.prixMax) / 2);
                  return (
                    <button key={m.id} type="button" onClick={() => onAddArticle({ nom: m.nom, prix, unite: m.unite || 'forfait' })}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${isDark ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50'}`}>
                      <Plus size={14} style={{ color: couleur }} className="flex-shrink-0" />
                      <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>{m.nom}</span>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: couleur }}>~{prix.toLocaleString('fr-FR')} €</span>
                    </button>
                  );
                })}
                <p className={`px-3 py-2 text-[10px] ${textMuted}`}>Prix indicatifs moyens — ajustez le PU après ajout.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {articles.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${textMuted}`}>
            <Star size={12} style={{ color: couleur }} /> Vos articles fréquents
          </p>
          <div className="flex flex-wrap gap-2">
            {articles.map(a => (
              <button key={a.id} type="button" onClick={() => onAddArticle(a)}
                className={`group flex items-center gap-2 pl-3 pr-2 h-9 rounded-full border text-sm transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <span className={`font-medium truncate max-w-[180px] ${textPrimary}`}>{a.nom}</span>
                <span className="font-bold text-xs" style={{ color: couleur }}>{eur(a.prix ?? a.prixUnitaire ?? 0)}</span>
                <span className="w-5 h-5 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${couleur}18`, color: couleur }}><Plus size={12} /></span>
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
      <div className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 ${empty ? '' : `border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}`}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}18`, color: couleur }}>
          <Plus size={16} />
        </span>
        <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setHighlight(0); }} onKeyDown={onKeyDown}
          placeholder={catalogue.length ? 'Ajouter une prestation… (tapez pour chercher dans le catalogue)' : 'Ajouter une ligne… (désignation libre)'}
          className={`flex-1 h-9 px-2 rounded-lg border-0 bg-transparent text-sm ${textPrimary} placeholder:${textMuted} focus:outline-none`} />
        {q.trim() && <button onClick={pickFree} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: couleur }}><CornerDownLeft size={13} /> Ajouter</button>}
      </div>

      {(suggestions.length > 0 || showFree) && (
        <div className={`absolute left-2 right-2 sm:left-4 sm:right-4 top-full z-30 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {suggestions.map((a, i) => (
            <button key={a.id || i} onMouseEnter={() => setHighlight(i)} onClick={() => pick(a)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${highlight === i ? (isDark ? 'bg-slate-700' : 'bg-slate-50') : ''}`}>
              <Package size={16} style={{ color: couleur }} className="flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className={`block truncate text-sm font-medium ${textPrimary}`}>{a.nom || a.designation}</span>
                {a.categorie && <span className={`block truncate text-xs ${textMuted}`}>{a.categorie}</span>}
              </span>
              <span className={`text-sm font-semibold whitespace-nowrap ${textPrimary}`}>{eur(a.prix ?? a.prixUnitaire ?? 0)}<span className={`text-xs font-normal ${textMuted}`}>/{a.unite || 'u'}</span></span>
            </button>
          ))}
          {showFree && (
            <button onMouseEnter={() => setHighlight(suggestions.length)} onClick={pickFree}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} ${highlight === suggestions.length ? (isDark ? 'bg-slate-700' : 'bg-slate-50') : ''}`}>
              <Plus size={16} style={{ color: couleur }} className="flex-shrink-0" />
              <span className={`text-sm ${textPrimary}`}>Créer <span className="font-semibold">« {q.trim()} »</span> <span className={textMuted}>(ligne libre)</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
