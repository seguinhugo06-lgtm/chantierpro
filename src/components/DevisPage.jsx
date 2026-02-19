import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowLeft, Download, Trash2, Send, Mail, MessageCircle, Edit3, Check, X, FileText, Receipt, Clock, Search, ChevronRight, ChevronUp, ChevronDown, Star, Filter, Eye, Pen, CreditCard, Banknote, CheckCircle, AlertCircle, AlertTriangle, XCircle, Building2, Copy, TrendingUp, QrCode, Sparkles, PenTool, MoreVertical, Loader2, Link2, Mic, Zap } from 'lucide-react';
import supabase from '../supabaseClient';
import { DEVIS_STATUS_COLORS, DEVIS_STATUS_LABELS } from '../lib/constants';
import PaymentModal from './PaymentModal';
import TemplateSelector from './TemplateSelector';
import SignaturePad from './SignaturePad';
import SmartTemplateWizard from './SmartTemplateWizard';
import DevisWizard from './DevisWizard';
import CatalogBrowser from './CatalogBrowser';
import DevisExpressModal from './DevisExpressModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import { useDevisModals } from '../hooks/useDevisModals';
import { isFacturXCompliant } from '../lib/facturx';
import { getDocumentEmailStatus } from '../services/CommunicationsService';

// Valid status transitions — enforced on buttons and dropdown
const VALID_TRANSITIONS = {
  // Devis transitions
  brouillon: ['envoye', 'refuse'],
  envoye: ['vu', 'accepte', 'refuse'],
  vu: ['accepte', 'refuse'],
  accepte: ['acompte_facture', 'facture'],
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

export default function DevisPage({ clients, setClients, addClient, devis, setDevis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret, selectedDevis, setSelectedDevis, isDark, couleur, createMode, setCreateMode, addChantier, setPage, setSelectedChantier, addEchange, paiements = [], addPaiement, generateNextNumero }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

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
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState('recent'); // recent, status, amount
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
    showDevisWizard, setShowDevisWizard,
    showCatalogBrowser, setShowCatalogBrowser,
  } = useDevisModals();

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
  const [showDevisExpressModal, setShowDevisExpressModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [editingDevis, setEditingDevis] = useState(null); // devis being edited in wizard
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Mes modèles');
  const [showSignatureLinkModal, setShowSignatureLinkModal] = useState(false);
  const [signatureLinkUrl, setSignatureLinkUrl] = useState(null);

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
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

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

  const filtered = getSortedDevis(devis.filter(d => {
    // Filter out ghost devis: no numero AND orphan client (client doesn't exist) AND brouillon
    if (!d.numero && !clients.find(c => c.id === d.client_id) && (!d.statut || d.statut === 'brouillon')) return false;
    // Filter out devis where client was deleted and devis was never sent (brouillon only)
    if (d.client_id && !clients.find(c => c.id === d.client_id) && d.statut === 'brouillon' && !d.total_ttc) return false;
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (filter === 'a_traiter') {
      const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
      if (d.statut === 'brouillon' && days > 2) return true;
      if (['envoye', 'vu'].includes(d.statut) && days > 7) return true;
      return false;
    }
    if (filter === 'factures_impayees' && !(d.type === 'facture' && d.statut !== 'payee')) return false;
    if (filter === 'conversion' && !(d.type === 'devis' && ['envoye', 'vu', 'refuse'].includes(d.statut))) return false;
    // Search by numero, client name/entreprise, chantier name, and objet
    if (debouncedSearch) {
      const client = clients.find(c => c.id === d.client_id);
      const chantier = chantiers.find(ch => ch.id === d.chantier_id);
      const searchText = `${d.numero || ''} ${client?.nom || ''} ${client?.prenom || ''} ${client?.entreprise || ''} ${chantier?.nom || ''} ${d.objet || ''}`.toLowerCase();
      if (!searchText.includes(debouncedSearch.toLowerCase())) return false;
    }
    return true;
  }));

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

  // Génération numéro unique garanti (format: DEV-2026-00001 / FAC-2026-00001)
  // Version synchrone (fallback local)
  const generateNumeroLocal = (type) => {
    const prefix = type === 'facture' ? 'FAC' : type === 'avoir' ? 'AV' : 'DEV';
    const year = new Date().getFullYear();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    const maxSeq = devis
      .filter(d => type === 'avoir'
        ? d.facture_type === 'avoir'
        : (d.type || 'devis') === type && d.facture_type !== 'avoir')
      .map(d => { const m = (d.numero || '').match(pattern); return m ? parseInt(m[1], 10) : 0; })
      .reduce((max, n) => Math.max(max, n), 0);
    return `${prefix}-${year}-${String(maxSeq + 1).padStart(5, '0')}`;
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
      console.error('Error creating devis:', err);
      showToast('Erreur lors de la création', 'error');
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
        onUpdate(selected.id, { statut: 'payee' });
        setSelected(s => s ? { ...s, statut: 'payee' } : s);
        setSnackbar({ type: 'success', message: `Facture ${selected.numero} marquée comme payée` });
      }
    }
  };

  // Workflow facturation
  const getAcompteFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'acompte');
  const getSoldeFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'solde');
  const getFacturesLiees = (devisId) => devis.filter(d => d.type === 'facture' && d.devis_source_id === devisId);

  const createAcompte = async () => {
    if (!selected || selected.statut !== 'accepte') return showToast('Le devis doit être accepté', 'error');
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
    onUpdate(selected.id, { statut: 'acompte_facture', acompte_pct: acomptePct });
    setShowAcompteModal(false);
    setSelected({ ...selected, statut: 'acompte_facture', acompte_pct: acomptePct });
    setSnackbar({ type: 'success', message: `Facture d'acompte ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  const createSolde = async () => {
    if (!selected) return;
    const acompte = getAcompteFacture(selected.id);
    const montantAcompteHT = acompte ? acompte.total_ht : 0;
    const montantSoldeHT = selected.total_ht - montantAcompteHT;
    // Use stored multi-rate TVA, proportionally adjusted for solde
    const acompteTva = acompte?.tva || 0;
    const tva = (selected.tva || 0) - acompteTva;
    const ttc = montantSoldeHT + tva;
    // Copy lignes with their per-line TVA rates preserved
    const lignes = (selected.lignes || []).map(l => ({ ...l, tva: l.tva !== undefined ? l.tva : (selected.tvaRate || entreprise?.tvaDefaut || 20) }));
    if (acompte) lignes.push({ id: 'acompte', description: `Acompte déjà facturé (${acompte.numero})`, quantite: 1, unite: 'forfait', prixUnitaire: -montantAcompteHT, montant: -montantAcompteHT });
    // Build tvaParTaux for the solde
    const tvaParTaux = {};
    const srcTva = selected.tvaParTaux || selected.tvaDetails;
    const acompteSrcTva = acompte?.tvaParTaux || acompte?.tvaDetails;
    if (srcTva && typeof srcTva === 'object') {
      Object.entries(srcTva).forEach(([rate, info]) => {
        const acompteForRate = acompteSrcTva?.[rate]?.montant || 0;
        tvaParTaux[rate] = { base: (info.base || 0) - (acompteSrcTva?.[rate]?.base || 0), montant: (info.montant || 0) - acompteForRate };
      });
    }
    const facture = {
      id: crypto.randomUUID(), numero: await generateNumero('facture'), type: 'facture', facture_type: acompte ? 'solde' : 'totale',
      devis_source_id: selected.id, acompte_facture_id: acompte?.id, client_id: selected.client_id, chantier_id: selected.chantier_id,
      date: new Date().toISOString().split('T')[0], statut: 'envoye',
      date_echeance: new Date(Date.now() + (entreprise?.delaiPaiement || 30) * 86400000).toISOString().split('T')[0],
      tvaRate: selected.tvaRate || entreprise?.tvaDefaut || 20,
      tvaParTaux, tvaDetails: tvaParTaux,
      lignes, total_ht: montantSoldeHT, tva, total_ttc: ttc
    };
    await onSubmit(facture);
    await onUpdate(selected.id, { statut: 'facture' });
    setSelected({ ...selected, statut: 'facture' });
    setSnackbar({ type: 'success', message: `Facture ${acompte ? 'de solde' : ''} ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  // Créer un avoir (note de crédit) pour une facture
  const createAvoir = async (facture) => {
    const confirmed = await confirm({
      title: 'Créer un avoir ?',
      message: `Un avoir annulant la facture ${facture.numero} (${formatMoney(facture.total_ttc)}) sera créé. Les montants seront inversés (négatifs).`
    });
    if (!confirmed) return;

    const avoir = {
      id: crypto.randomUUID(),
      numero: await generateNumero('avoir'),
      type: 'facture',
      facture_type: 'avoir',
      devis_source_id: facture.devis_source_id,
      avoir_source_id: facture.id,
      client_id: facture.client_id,
      client_nom: facture.client_nom,
      chantier_id: facture.chantier_id,
      date: new Date().toISOString().split('T')[0],
      statut: 'envoye',
      tvaRate: facture.tvaRate,
      lignes: (facture.lignes || []).map(l => ({
        ...l,
        id: generateId(),
        prixUnitaire: -(Math.abs(l.prixUnitaire || 0)),
        montant: -(Math.abs(l.montant || 0)),
      })),
      sections: facture.sections ? facture.sections.map(s => ({
        ...s,
        id: generateId(),
        lignes: (s.lignes || []).map(l => ({
          ...l,
          id: generateId(),
          prixUnitaire: -(Math.abs(l.prixUnitaire || 0)),
          montant: -(Math.abs(l.montant || 0)),
        })),
      })) : undefined,
      tvaParTaux: facture.tvaParTaux
        ? Object.fromEntries(Object.entries(facture.tvaParTaux).map(([r, info]) => [r, { base: -(Math.abs(info.base || 0)), montant: -(Math.abs(info.montant || 0)) }]))
        : {},
      tvaDetails: facture.tvaParTaux
        ? Object.fromEntries(Object.entries(facture.tvaParTaux).map(([r, info]) => [r, { base: -(Math.abs(info.base || 0)), montant: -(Math.abs(info.montant || 0)) }]))
        : {},
      total_ht: -(Math.abs(facture.total_ht || 0)),
      tva: -(Math.abs(facture.tva || 0)),
      total_ttc: -(Math.abs(facture.total_ttc || 0)),
      notes: `Avoir sur facture ${facture.numero}`,
      conditionsPaiement: facture.conditionsPaiement,
    };

    await onSubmit(avoir);
    setSnackbar({
      type: 'success',
      message: `Avoir ${avoir.numero} créé`,
      action: { label: 'Voir', onClick: () => { setSelected(avoir); setSnackbar(null); } }
    });
  };

  // PDF Generation - CONFORME LÉGISLATION FRANÇAISE
  const downloadPDF = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const chantier = chantiers.find(c => c.id === doc.chantier_id);
    const isFacture = doc.type === 'facture';
    const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
    const dateValidite = new Date(doc.date);
    dateValidite.setDate(dateValidite.getDate() + (doc.validite || entreprise?.validiteDevis || 30));
    
    // Calculate TVA details from lignes if not present in doc
    const calculatedTvaDetails = doc.tvaDetails || (() => {
      const details = {};
      const defaultRate = doc.tvaRate || entreprise?.tvaDefaut || 10;
      (doc.lignes || []).forEach(l => {
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

    const lignesHTML = (doc.lignes || []).map(l => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite||'unité'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire||0).toFixed(2)} €</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${isMicro ? '-' : (l.tva !== undefined ? l.tva : (doc.tvaRate||10))+'%'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${getLineTotal(l)<0?'color:#dc2626;':''}">${getLineTotal(l).toFixed(2)} €</td>
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
    .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${couleur}; }
    .logo-section { max-width: 55%; }
    .logo { font-size: 16pt; font-weight: bold; color: ${couleur}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .entreprise-legal { font-size: 7pt; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 22pt; color: ${couleur}; margin-bottom: 8px; letter-spacing: 1px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .doc-info strong { color: #1e293b; }
    .client-section { display: flex; gap: 20px; margin-bottom: 20px; }
    .info-block { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${couleur}; }
    .info-block h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-block .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    thead { background: ${couleur}; color: white; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 15px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
    .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals .total { background: ${couleur}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
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
        ${entreprise?.rcs ? `<br>RCS: ${entreprise.rcs}` : ''}
        ${entreprise?.tvaIntra ? `<br>TVA Intra: ${entreprise.tvaIntra}` : ''}
        ${isMicro ? '<br><em>TVA non applicable, art. 293 B du CGI</em>' : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${doc.facture_type === 'avoir' ? 'AVOIR' : isFacture ? 'FACTURE' : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>N° ${doc.numero}</strong><br>
        Date: ${new Date(doc.date).toLocaleDateString('fr-FR')}<br>
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

  <!-- TABLEAU PRESTATIONS -->
  <table aria-label="Détail des prestations du devis">
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
    <div class="row sub"><span>Total HT</span><span>${(doc.total_ht||0).toFixed(2)} €</span></div>
    ${doc.remise ? `<div class="row sub" style="color:#dc2626"><span>Remise ${doc.remise}%</span><span>-${((doc.total_ht||0) * doc.remise / 100).toFixed(2)} €</span></div>` : ''}
    ${!isMicro ? (Object.keys(calculatedTvaDetails).length > 0
      ? Object.entries(calculatedTvaDetails).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) =>
        `<div class="row sub"><span>TVA ${taux}%${Object.keys(calculatedTvaDetails).length > 1 ? ` (base: ${data.base.toFixed(2)} €)` : ''}</span><span>${data.montant.toFixed(2)} €</span></div>`
      ).join('')
      : `<div class="row sub"><span>TVA ${doc.tvaRate||10}%</span><span>${(doc.tva||0).toFixed(2)} €</span></div>`
    ) : ''}
    <div class="row total"><span>Total TTC</span><span>${(doc.total_ttc||0).toFixed(2)} €</span></div>
    ${doc.acompte_pct ? `
    <div class="row sub" style="margin-top:8px;border-top:1px dashed #ccc;padding-top:8px"><span>Acompte ${doc.acompte_pct}%</span><span>${((doc.total_ttc||0) * doc.acompte_pct / 100).toFixed(2)} €</span></div>
    <div class="row sub"><span>Solde à régler</span><span>${((doc.total_ttc||0) * (100-doc.acompte_pct) / 100).toFixed(2)} €</span></div>
    ` : ''}
  </div>

  ${isMicro ? '<div class="micro-mention">TVA non applicable, article 293 B du Code Général des Impôts</div>' : ''}

  <!-- CONDITIONS -->
  <div class="conditions">
    <h4>CONDITIONS GÉNÉRALES</h4>
    <div class="conditions-grid">
      <div>
        <strong>Modalités de paiement</strong><br>
        · Virement bancaire<br>
        · Chèque à l'ordre de ${entreprise?.nom || '[Entreprise]'}<br>
        · Espèces (max 1 000 € pour particulier)<br>
        ${entreprise?.iban ? `<br><strong>IBAN:</strong> ${entreprise.iban}` : ''}
        ${entreprise?.bic ? ` · <strong>BIC:</strong> ${entreprise.bic}` : ''}
      </div>
      <div>
        <strong>Délai de paiement</strong><br>
        ${doc.conditionsPaiement && CONDITIONS_PAIEMENT[doc.conditionsPaiement] ? CONDITIONS_PAIEMENT[doc.conditionsPaiement] : `${entreprise?.delaiPaiement || 30} jours`} à compter de la date ${isFacture ? 'de facture' : 'de réception des travaux'}.<br><br>
        <strong>Pénalités de retard</strong><br>
        Taux annuel: ${entreprise?.tauxPenaliteRetard || 10}% (3 fois le taux directeur BCE).<br>
        Indemnité forfaitaire de recouvrement: 40 € (art. D441-5 C. com.)
      </div>
    </div>
  </div>

  ${!isFacture && (entreprise?.mentionGaranties !== false) ? `
  <!-- GARANTIES LÉGALES -->
  <div class="garanties">
    <h4> GARANTIES LÉGALES (Code civil & Code de la construction)</h4>
    <strong>1. Garantie de parfait achèvement</strong> - 1 an à compter de la réception des travaux<br>
    <strong>2. Garantie de bon fonctionnement</strong> - 2 ans (équipements dissociables)<br>
    <strong>3. Garantie décennale</strong> - 10 ans (solidité de l'ouvrage)
  </div>
  ` : ''}

  ${!isFacture && (entreprise?.mentionRetractation !== false) ? `
  <!-- DROIT DE RÉTRACTATION -->
  <div class="retractation">
    <strong>⚠️ DROIT DE RÉTRACTATION</strong> (Art. L221-18 du Code de la consommation)<br>
    Vous disposez d'un délai de <strong>14 jours</strong> pour exercer votre droit de rétractation sans justification ni pénalité.
    Le délai court à compter de la signature du présent devis.
    Pour l'exercer, envoyez une lettre recommandée AR à: ${entreprise?.adresse?.split('\\n')[0] || '[Adresse]'}
  </div>
  ` : ''}

  ${entreprise?.cgv ? `
  <!-- CGV PERSONNALISÉES -->
  <div class="conditions" style="margin-top:10px">
    <h4>CONDITIONS PARTICULIÈRES</h4>
    ${entreprise.cgv}
  </div>
  ` : ''}

  ${!isFacture ? `
  <!-- SIGNATURES -->
  <div class="signature-section">
    <div class="signature-box">
      <h4>L'Entreprise</h4>
      <p>Bon pour accord<br>Date et signature</p>
    </div>
    <div class="signature-box">
      <h4>Le Client</h4>
      <p>Signature précédée de la mention manuscrite:<br><strong>"Bon pour accord"</strong> + Date</p>
      ${doc.signature ? '<div style="margin-top:15px;color:#16a34a;font-weight:bold">[OK] Signé électroniquement'+(doc.signataire ? ' par '+doc.signataire : '')+' le '+new Date(doc.signatureDate).toLocaleDateString('fr-FR')+'</div>' : ''}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>${entreprise?.nom || ''}</strong>
    ${entreprise?.formeJuridique ? ` · ${entreprise.formeJuridique}` : ''}
    ${entreprise?.capital ? ` · Capital: ${entreprise.capital} €` : ''}<br>
    ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
    ${entreprise?.codeApe ? ` · APE: ${entreprise.codeApe}` : ''}
    ${getRCSComplet() ? ` · ${getRCSComplet()}` : ''}<br>
    ${entreprise?.tvaIntra ? `TVA Intracommunautaire: ${entreprise.tvaIntra}<br>` : ''}
    <div class="assurances">
      ${entreprise?.rcProAssureur ? `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}${entreprise.rcProValidite ? ` (Valide: ${new Date(entreprise.rcProValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
      ${entreprise?.rcProAssureur && entreprise?.decennaleAssureur ? '<br>' : ''}
      ${entreprise?.decennaleAssureur ? `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide: ${new Date(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
    </div>
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

  // Print/Download PDF
  const printPDF = (doc) => {
    const content = downloadPDF(doc);
    const filename = `${doc.facture_type === 'avoir' ? 'Avoir' : doc.type === 'facture' ? 'Facture' : 'Devis'}_${doc.numero}.html`;

    if (isMobile()) {
      // Mobile: Download as HTML file that opens in browser for PDF conversion
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Try native share first if available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'text/html' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: `${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`,
          }).catch(() => {
            // Fallback to download
            triggerDownload(url, filename);
          });
          return;
        }
      }

      // Fallback: trigger download
      triggerDownload(url, filename);
      showToast('Fichier téléchargé - Ouvrez-le et utilisez "Imprimer" > "Enregistrer en PDF"', 'info');
    } else {
      // Desktop: Open and print as before
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

  // Send helpers — update status FIRST, then open communication link in setTimeout
  // to prevent "Detached while handling command" crashes from simultaneous state updates + navigation
  const sendWhatsApp = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    if (!client?.telephone) { showToast('Aucun téléphone client renseigné', 'error'); return; }
    // 1. Update status
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye' });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye' } : s);
    }
    if (addEchange) addEchange({ type: 'whatsapp', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `Envoi ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
    // 2. Open link after state settles
    const phone = (client.telephone || '').replace(/\s/g, '').replace(/^0/, '33');
    setTimeout(() => {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, voici votre ${doc.type} ${doc.numero}: ${formatMoney(doc.total_ttc)}`)}`, '_blank');
    }, 100);
    showToast('WhatsApp ouvert', 'success');
  };

  const sendEmail = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    if (!client?.email) { showToast('Aucun email client renseigné', 'error'); return; }
    // 1. Update status
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye' });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye' } : s);
    }
    if (addEchange) addEchange({ type: 'email', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `Envoi ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
    // 2. Open mailto in new window AFTER state settles (window.open instead of location.href to prevent navigation crash)
    setTimeout(() => {
      const subject = encodeURIComponent(`${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`);
      const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint votre ${doc.type} ${doc.numero} d'un montant de ${formatMoney(doc.total_ttc)}.\n\nCordialement`);
      window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_self');
    }, 100);
    showToast(`Email ouvert pour ${client.email}`, 'success');
  };

  // SMS via native protocol (mobile only)
  const sendSMS = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) { showToast('Client introuvable. Veuillez associer un client au devis.', 'error'); return; }
    const phone = (client?.telephone || '').replace(/\s/g, '');
    if (!phone) { showToast('Aucun téléphone client renseigné', 'error'); return; }
    // Desktop fallback
    if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      showToast('SMS disponible uniquement sur mobile', 'info');
      return;
    }
    // 1. Update status
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye' });
      setSelected(s => s?.id === doc.id ? { ...s, statut: 'envoye' } : s);
    }
    if (addEchange) addEchange({ type: 'sms', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `SMS ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
    // 2. Open SMS after state settles
    const message = `Bonjour, voici votre ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}: ${formatMoney(doc.total_ttc)}`;
    setTimeout(() => {
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');
    }, 100);
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
    const canAcompte = isDevis && selected.statut === 'accepte' && !acompteFacture;
    const canFacturer = isDevis && ['accepte', 'acompte_facture'].includes(selected.statut) && !soldeFacture && resteAFacturer > 0;
    const hasChantier = !!selected.chantier_id;
    const linkedChantier = chantiers.find(c => c.id === selected.chantier_id);
    const canCreateChantier = isDevis && !hasChantier && addChantier;

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
      { id: 'envoye', label: 'Envoyé', statuses: ['envoye'] },
      { id: 'accepte', label: 'Signé', statuses: ['accepte'] },
      { id: 'facture', label: 'Facturé', statuses: ['acompte_facture', 'facture'] },
    ] : [
      { id: 'envoye', label: 'Envoyée', statuses: ['brouillon', 'envoye'] },
      { id: 'payee', label: 'Payée', statuses: ['payee'] },
    ];

    const getStepState = (step) => {
      const order = { brouillon: 0, envoye: 1, accepte: 2, acompte_facture: 3, facture: 4, payee: 5, refuse: -1 };
      const currentOrder = order[selected.statut] || 0;
      const stepMaxOrder = Math.max(...step.statuses.map(s => order[s] || 0));
      const isActive = step.statuses.includes(selected.statut);
      const isPast = currentOrder > stepMaxOrder;
      return { isActive, isPast };
    };

    // Next action hint based on status
    const getNextAction = () => {
      if (selected.statut === 'refuse') return { text: 'Dupliquer pour relancer', color: 'text-slate-500' };
      if (isDevis) {
        if (selected.statut === 'brouillon') return { text: '→ Envoyer au client', color: 'text-amber-600' };
        if (selected.statut === 'envoye') return { text: '→ Faire signer', color: 'text-blue-600' };
        if (selected.statut === 'accepte') return { text: '→ Créer facture', color: 'text-emerald-600' };
        if (selected.statut === 'acompte_facture') return { text: `→ Facturer solde (${formatMoney(resteAFacturer)})`, color: 'text-purple-600' };
        if (selected.statut === 'facture') return { text: '✓ Terminé', color: 'text-indigo-600' };
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
        if (selected.statut === 'brouillon') return { label: 'Envoyer', icon: Send, action: () => sendEmail(selected), color: 'bg-amber-500 hover:bg-amber-600' };
        if (selected.statut === 'envoye') return { label: 'Faire signer', icon: PenTool, action: () => setShowSignaturePad(true), color: `bg-[${couleur}]`, style: { background: couleur } };
        if (selected.statut === 'accepte') return { label: 'Facturer', icon: Receipt, action: () => canAcompte ? setShowAcompteModal(true) : createSolde(), color: 'bg-emerald-500 hover:bg-emerald-600' };
        if (selected.statut === 'acompte_facture') return { label: `Facturer solde`, icon: Receipt, action: createSolde, color: 'bg-emerald-500 hover:bg-emerald-600' };
      } else {
        if (selected.statut !== 'payee') return { label: 'Encaisser', icon: QrCode, action: () => setShowPaymentModal(true), color: 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600' };
      }
      return null;
    };
    const primaryCTA = getPrimaryCTA();

    return (
      <div className="space-y-4">
        {/* ============ ZONE 1: UNIFIED HEADER ============ */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardBg}`}>
          {/* Top row: back, title, client, actions */}
          <div className="flex items-start gap-3 mb-4">
            <button onClick={() => { setMode('list'); setSelected(null); }} className={`p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} aria-label="Retour à la liste">
              <ArrowLeft size={18} className={textMuted} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${selected.facture_type === 'avoir' ? (isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700') : selected.type === 'facture' ? (isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-700') : (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                  {selected.facture_type === 'avoir' ? 'Avoir' : selected.type === 'facture' ? 'Facture' : 'Devis'}
                </span>
                {needsFollowUp(selected) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 font-medium">⏰ Relancer</span>
                )}
              </div>
              <h2 className={`text-lg sm:text-xl font-bold truncate ${textPrimary}`}>{selected.numero}</h2>
              <p className={`text-sm ${textMuted}`}>{client ? `${client.prenom || ''} ${client.nom}`.trim() : (selected.client_nom || 'Client supprimé')} · {new Date(selected.date).toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Header actions - with labels for better accessibility */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => { setActionLoading('pdf'); try { printPDF(selected); } finally { setTimeout(() => setActionLoading(null), 500); } }}
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
              {/* Modifier button - only for editable statuses */}
              {['brouillon', 'envoye', 'vu'].includes(selected.statut) && (
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
                      <button onClick={async () => { setActionLoading('duplicate'); setShowActionsMenu(false); try { await duplicateDocument(selected); } finally { setActionLoading(null); } }} disabled={actionLoading === 'duplicate'} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                        {actionLoading === 'duplicate' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />} Dupliquer
                      </button>
                      {selected.type === 'devis' && ['accepte', 'envoye', 'facture'].includes(selected.statut) && (
                        <button onClick={() => { createAvenant(selected); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                          <Edit3 size={16} /> Créer un avenant
                        </button>
                      )}
                      {selected.type === 'facture' && selected.facture_type !== 'avoir' && (
                        <button onClick={() => { createAvoir(selected); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                          <Receipt size={16} /> Créer un avoir
                        </button>
                      )}
                      <button onClick={() => { setShowSaveTemplateModal(true); setShowActionsMenu(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Star size={16} /> Sauvegarder comme modèle
                      </button>
                      <button onClick={async () => { setShowActionsMenu(false); const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce document ?' }); if (confirmed) { onDelete(selected.id); setSelected(null); setMode('list'); } }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-600'}`}>
                        <Trash2 size={16} /> Supprimer
                      </button>
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

          {/* Action bar: Status + Primary CTA + Chantier + Communication */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status dropdown */}
            {(() => {
              const STATUS_LABELS = {
                brouillon: '📝 Brouillon',
                envoye: '📤 Envoyé',
                vu: '👁️ Vu',
                accepte: '✅ Accepté',
                refuse: '❌ Refusé',
                acompte_facture: '💰 Acompte facturé',
                facture: '🧾 Facturé',
                payee: '✅ Payée',
              };
              const transitions = isDevis ? VALID_TRANSITIONS : FACTURE_TRANSITIONS;
              const allowedNext = transitions[selected.statut] || [];
              return (
                <select
                  value={selected.statut}
                  onChange={e => { onUpdate(selected.id, { statut: e.target.value }); setSelected(s => ({...s, statut: e.target.value})); }}
                  className={`px-3 py-2 min-h-[40px] rounded-lg text-sm font-semibold cursor-pointer border-2 outline-none ${
                    selected.statut === 'accepte' ? (isDark ? 'bg-emerald-900/50 text-emerald-400 border-emerald-600' : 'bg-emerald-100 text-emerald-700 border-emerald-300')
                    : selected.statut === 'payee' ? (isDark ? 'bg-purple-900/50 text-purple-400 border-purple-600' : 'bg-purple-100 text-purple-700 border-purple-300')
                    : selected.statut === 'acompte_facture' ? (isDark ? 'bg-blue-900/50 text-blue-400 border-blue-600' : 'bg-blue-100 text-blue-700 border-blue-300')
                    : selected.statut === 'facture' ? (isDark ? 'bg-indigo-900/50 text-indigo-400 border-indigo-600' : 'bg-indigo-100 text-indigo-700 border-indigo-300')
                    : selected.statut === 'refuse' ? (isDark ? 'bg-red-900/50 text-red-400 border-red-600' : 'bg-red-100 text-red-700 border-red-300')
                    : (isDark ? 'bg-amber-900/50 text-amber-400 border-amber-600' : 'bg-amber-100 text-amber-700 border-amber-300')
                  }`}
                >
                  {/* Current status always shown */}
                  <option value={selected.statut}>{STATUS_LABELS[selected.statut] || selected.statut}</option>
                  {/* Only valid next transitions */}
                  {allowedNext.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
              );
            })()}

            {/* Quick Actions - Always available with improved accessibility */}
            {isDevis ? (
              <>
                {/* Envoyer - always available */}
                <button
                  onClick={() => sendEmail(selected)}
                  className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-all font-medium ${
                    selected.statut === 'brouillon'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Envoyer au client par email"
                  aria-label="Envoyer le devis au client"
                >
                  <Send size={16} /> <span>Envoyer</span>
                </button>

                {/* Signer - only enabled when devis is envoyé/vu */}
                {!['facture', 'accepte', 'acompte_facture'].includes(selected.statut) && (
                  <button
                    onClick={() => {
                      if (!['envoye', 'vu'].includes(selected.statut)) {
                        showToast('Envoyez d\'abord le devis au client', 'info');
                        return;
                      }
                      setShowSignaturePad(true);
                    }}
                    disabled={!['envoye', 'vu'].includes(selected.statut)}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-all font-medium ${
                      ['envoye', 'vu'].includes(selected.statut)
                        ? 'text-white hover:opacity-90 shadow-sm'
                        : 'opacity-50 cursor-not-allowed ' + (isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')
                    }`}
                    style={['envoye', 'vu'].includes(selected.statut) ? { backgroundColor: couleur } : {}}
                    title={['envoye', 'vu'].includes(selected.statut) ? 'Faire signer le devis par le client' : 'Envoyez d\'abord le devis'}
                    aria-label="Faire signer le devis"
                  >
                    <PenTool size={16} /> <span>Signer</span>
                  </button>
                )}

                {/* Lien de signature - generate & share signing link */}
                {'facture' !== selected.statut && (
                  <button
                    onClick={async () => {
                      try {
                        const token = await getOrGenerateSignatureToken(selected);
                        if (token) {
                          const url = buildSignatureUrl(token);
                          setSignatureLinkUrl(url);
                          setShowSignatureLinkModal(true);
                        } else {
                          showToast('Impossible de générer le lien de signature', 'error');
                        }
                      } catch (e) {
                        showToast('Erreur lors de la génération du lien', 'error');
                      }
                    }}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-all font-medium ${
                      selected.statut === 'envoye'
                        ? 'text-white hover:opacity-90 shadow-sm'
                        : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    style={selected.statut === 'envoye' ? { backgroundColor: couleur } : {}}
                    title="Générer un lien de signature client"
                  >
                    <Link2 size={16} /> <span className="hidden sm:inline">Lien signature</span>
                  </button>
                )}

                {/* Facturer - only enabled when devis is accepté/acompte_facturé, with confirmation */}
                {!['facture', 'refuse'].includes(selected.statut) && (
                  <button
                    onClick={async () => {
                      if (!['accepte', 'acompte_facture'].includes(selected.statut)) {
                        showToast('Le devis doit être signé avant de facturer', 'info');
                        return;
                      }
                      const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'le client';
                      const confirmed = await confirm({
                        title: canAcompte ? 'Créer une facture d\'acompte ?' : 'Créer la facture ?',
                        message: `Une facture de ${formatMoney(selected.total_ttc)} sera créée pour ${clientName}. Cette action est irréversible.`
                      });
                      if (!confirmed) return;
                      canAcompte ? setShowAcompteModal(true) : createSolde();
                    }}
                    disabled={!['accepte', 'acompte_facture'].includes(selected.statut)}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-all font-medium ${
                      ['accepte', 'acompte_facture'].includes(selected.statut)
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                        : 'opacity-50 cursor-not-allowed ' + (isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')
                    }`}
                    title={['accepte', 'acompte_facture'].includes(selected.statut)
                      ? (selected.statut === 'acompte_facture' ? 'Créer la facture de solde' : 'Créer une facture')
                      : 'Le devis doit être signé'}
                    aria-label={selected.statut === 'acompte_facture' ? 'Facturer le solde' : 'Facturer ce devis'}
                  >
                    <Receipt size={16} /> <span>{selected.statut === 'acompte_facture' ? 'Solde' : 'Facturer'}</span>
                  </button>
                )}

                {/* Terminal status badge */}
                {selected.statut === 'facture' && (
                  <span className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    <CheckCircle size={14} className="inline mr-1" /> Facturé
                  </span>
                )}
              </>
            ) : (
              <>
                {/* Facture: Encaisser always available */}
                {selected.statut !== 'payee' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2 min-h-[44px] text-white rounded-xl text-sm flex items-center gap-2 transition-all hover:shadow-lg font-medium bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                  >
                    <QrCode size={16} /> Encaisser
                  </button>
                )}
                {selected.statut === 'payee' && (
                  <span className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    <CheckCircle size={14} className="inline mr-1" /> Payée
                  </span>
                )}
              </>
            )}

            {/* Chantier link - always show for devis */}
            {isDevis && (hasChantier && linkedChantier ? (
              <button onClick={() => { setSelectedChantier?.(linkedChantier.id); setPage?.('chantiers'); }} className={`px-3 py-2 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                <Building2 size={14} /> <span className="truncate max-w-[100px]">{linkedChantier.nom}</span>
              </button>
            ) : canCreateChantier && (
              <button onClick={openChantierModal} className={`px-3 py-2 min-h-[40px] rounded-lg text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                <Building2 size={14} /> <span className="hidden sm:inline">+ Chantier</span>
              </button>
            ))}

            <div className="flex-1" />

            {/* Communication buttons - with labels on larger screens for better accessibility */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => sendWhatsApp(selected)}
                className="min-w-[44px] min-h-[44px] sm:px-3 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                title="Envoyer par WhatsApp"
                aria-label="Envoyer par WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="hidden sm:inline text-sm font-medium">WhatsApp</span>
              </button>
              <button
                onClick={() => sendSMS(selected)}
                className="min-w-[44px] min-h-[44px] sm:px-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                title="Envoyer par SMS"
                aria-label="Envoyer par SMS"
              >
                <MessageCircle size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline text-sm font-medium">SMS</span>
              </button>
              <button
                onClick={() => sendEmail(selected)}
                className="min-w-[44px] min-h-[44px] sm:px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                title="Envoyer par email"
                aria-label="Envoyer par email"
              >
                <Mail size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline text-sm font-medium">Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============ ZONE 2: SMART CONTEXT CARD ============ */}
        {/* Billing options - always visible for devis not yet invoiced */}

        {/* Show billing options for all devis statuses (except already invoiced) */}
        {isDevis && selected.statut !== 'facture' && selected.statut !== 'acompte_facture' && (
          <div className={`rounded-xl border p-4 ${
            selected.statut === 'accepte'
              ? (isDark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200')
              : (isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200')
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {selected.statut === 'accepte' ? (
                <>
                  <CheckCircle size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                  <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Devis signé - Choisir le mode de facturation
                  </p>
                </>
              ) : (
                <>
                  <Receipt size={18} className={textMuted} />
                  <p className={`text-sm font-medium ${textMuted}`}>
                    Options de facturation
                  </p>
                  {selected.statut === 'brouillon' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                      Envoyer d'abord recommandé
                    </span>
                  )}
                  {selected.statut === 'envoye' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                      Signature recommandée
                    </span>
                  )}
                </>
              )}
            </div>
            {(canAcompte || canFacturer) ? (
              <div className="grid grid-cols-2 gap-2">
                {canAcompte && (
                  <button onClick={() => setShowAcompteModal(true)} className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${isDark ? 'border-purple-700 bg-purple-900/30 hover:bg-purple-900/50' : 'border-purple-200 bg-white hover:bg-purple-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard size={16} className="text-purple-500" />
                      <span className={`font-medium text-sm ${textPrimary}`}>Acompte 30%</span>
                    </div>
                    <p className={`text-xs ${textMuted}`}>{formatMoney(selected.total_ttc * 0.3)}</p>
                  </button>
                )}
                {canFacturer && (
                  <button onClick={createSolde} className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${isDark ? 'border-emerald-700 bg-emerald-900/30 hover:bg-emerald-900/50' : 'border-emerald-200 bg-white hover:bg-emerald-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt size={16} className="text-emerald-500" />
                      <span className={`font-medium text-sm ${textPrimary}`}>Facturer 100%</span>
                    </div>
                    <p className={`text-xs ${textMuted}`}>{formatMoney(selected.total_ttc)}</p>
                  </button>
                )}
              </div>
            ) : (
              <p className={`text-xs ${textMuted} mt-1`}>
                {selected.statut === 'brouillon' ? 'Envoyez le devis au client pour pouvoir le facturer ensuite.'
                  : selected.statut === 'envoye' || selected.statut === 'vu' ? 'Le client doit d\'abord accepter le devis avant facturation.'
                  : 'Facturation non disponible pour ce statut.'}
              </p>
            )}
          </div>
        )}

        {/* Acompte facturé: Show progress */}
        {isDevis && selected.statut === 'acompte_facture' && (
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  Acompte {selected.acompte_pct}% facturé
                </span>
                {acompteFacture && (
                  <button onClick={() => setSelected(acompteFacture)} className="text-xs text-blue-500 hover:underline">
                    ({acompteFacture.numero})
                  </button>
                )}
              </div>
              <span className={`font-bold ${textPrimary}`}>{formatMoney(resteAFacturer)} restant</span>
            </div>
            <div className={`h-2 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-blue-200'}`}>
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${selected.acompte_pct}%` }} />
            </div>
            {canFacturer && (
              <button onClick={createSolde} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm">
                <Receipt size={16} /> Facturer le solde
              </button>
            )}
          </div>
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
              <p className={`text-[10px] mt-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                Art. L441-10 C. com. — Échéance : {pen.echeance.toLocaleDateString('fr-FR')}
              </p>
            </div>
          );
        })()}

        {/* ============ ZONE 3: TABBED DOCUMENT VIEW ============ */}
        <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${cardBg}`}>
          <Tabs defaultValue="document">
            <div className={`px-4 pt-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <TabsList variant="underline" className="w-full justify-start gap-4">
                <TabsTrigger value="document" variant="underline" className="pb-3">Document</TabsTrigger>
                {(isDevis && facturesLiees.length > 0) && (
                  <TabsTrigger value="historique" variant="underline" className="pb-3">
                    Historique {facturesLiees.length > 0 && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>{facturesLiees.length}</span>}
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

            <TabsContent value="document" className="mt-0 p-4 sm:p-6">
              {/* Document header */}
              <div className={`flex justify-between items-start mb-6 pb-6 border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  {entreprise?.logo ? (
                    <img src={entreprise.logo} className="h-12 rounded-lg object-cover" alt={entreprise?.nom || ''} />
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
                    <table className="w-full min-w-[400px] text-sm" aria-label={section.titre || 'Lignes du devis'}>
                      {si === 0 && (
                        <thead>
                          <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                            <th scope="col" className={`text-left py-2 font-medium ${textPrimary}`}>Description</th>
                            <th scope="col" className={`text-right py-2 w-16 font-medium ${textPrimary}`}>Qté</th>
                            <th scope="col" className={`text-right py-2 w-20 font-medium ${textPrimary}`}>PU HT</th>
                            <th scope="col" className={`text-right py-2 w-24 font-medium ${textPrimary}`}>Total</th>
                            {!modeDiscret && (selected.lignes || []).some(l => l.prixAchat > 0) && (
                              <th scope="col" className={`text-right py-2 w-16 font-medium ${textPrimary}`}>Marge</th>
                            )}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {(section.lignes || []).map((l, i) => (
                          <tr key={i} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td className={`py-2.5 ${textPrimary}`}>{l.description}</td>
                            <td className={`text-right ${textSecondary}`}>{l.quantite} {l.unite}</td>
                            <td className={`text-right ${textSecondary}`}>{parseFloat(l.prixUnitaire || l.prix_unitaire || 0).toFixed(2)}€</td>
                            <td className={`text-right font-medium ${getLineTotal(l) < 0 ? 'text-red-500' : textPrimary}`}>{getLineTotal(l).toFixed(2)}€</td>
                            {!modeDiscret && (selected.lignes || []).some(lg => lg.prixAchat > 0) && (() => {
                              const pu = parseFloat(l.prixUnitaire || l.prix_unitaire || 0);
                              const pa = parseFloat(l.prixAchat || 0);
                              const margePct = pu > 0 ? ((pu - pa) / pu * 100) : 0;
                              const color = pa > 0 ? (margePct >= 30 ? 'text-emerald-600' : margePct >= 10 ? 'text-amber-600' : 'text-red-600') : textMuted;
                              return <td className={`text-right text-xs ${color}`}>{pa > 0 ? `${margePct.toFixed(0)}%` : '—'}</td>;
                            })()}
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

            {isDevis && facturesLiees.length > 0 && (
              <TabsContent value="historique" className="mt-0 p-4 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div>
                      <p className={`text-sm ${textPrimary}`}>{new Date(selected.date).toLocaleDateString('fr-FR')} - Devis créé</p>
                    </div>
                  </div>
                  {selected.signatureDate && (
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <div>
                        <p className={`text-sm ${textPrimary}`}>{new Date(selected.signatureDate).toLocaleDateString('fr-FR')} - Accepté</p>
                      </div>
                    </div>
                  )}
                  {facturesLiees.map(f => (
                    <div key={f.id} className={`flex items-center gap-3 cursor-pointer rounded-lg p-2 -mx-2 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`} onClick={() => setSelected(f)}>
                      <span className={`w-3 h-3 rounded-full ${f.statut === 'payee' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="flex-1">
                        <p className={`text-sm ${textPrimary}`}>
                          {new Date(f.date).toLocaleDateString('fr-FR')} - {f.facture_type === 'acompte' ? 'Acompte' : f.facture_type === 'solde' ? 'Solde' : 'Facture'}
                        </p>
                        <p className={`text-xs ${textMuted}`}>{f.numero} · {formatMoney(f.total_ttc)}</p>
                      </div>
                      <ChevronRight size={16} className={textMuted} />
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {selected.type === 'facture' && selected.devis_source_id && (
              <TabsContent value="source" className="mt-0 p-4 sm:p-6">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-sm ${textMuted} mb-2`}>Cette facture a été créée à partir du devis :</p>
                  <button
                    onClick={() => { const src = devis.find(d => d.id === selected.devis_source_id); if (src) setSelected(src); }}
                    className="text-sm font-medium hover:underline flex items-center gap-2"
                    style={{ color: couleur }}
                  >
                    <FileText size={16} />
                    Voir le devis source
                  </button>
                </div>
              </TabsContent>
            )}

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

        {/* Modal Acompte */}
        {showAcompteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${cardBg} rounded-2xl p-6 w-full max-w-md`}>
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
                <button onClick={createAcompte} className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] transition-colors">
                  {acomptePct > 30 ? <AlertTriangle size={16} /> : <Check size={16} />}
                  Créer{acomptePct > 30 ? ' ⚠️' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Preview */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowPdfPreview(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
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
                  <button onClick={() => { printPDF(selected); }} className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-1.5 sm:gap-2 min-h-[44px] transition-colors text-sm">
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
        {showSignatureLinkModal && signatureLinkUrl && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSignatureLinkModal(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-md shadow-2xl p-5`} onClick={e => e.stopPropagation()}>
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
          onPaymentSaved={(payment) => {
            if (selected) {
              const updatedMontantPaye = (selected.montant_paye || 0) + (payment.montant || 0);
              onUpdate(selected.id, { montant_paye: updatedMontantPaye });
              setSelected(s => ({ ...s, montant_paye: updatedMontantPaye }));
            }
          }}
          isDark={isDark}
          couleur={couleur}
        />
      </div>
    );
  }

  // === CREATE VIEW ===
  if (mode === 'create') {
    const favoris = catalogue?.filter(c => c.favori) || [];
    const catalogueFiltered = catalogue?.filter(c => !debouncedCatalogueSearch || c.nom?.toLowerCase().includes(debouncedCatalogueSearch.toLowerCase())) || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 sm:gap-4"><button onClick={() => setMode('list')} className={`p-2.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors`}><ArrowLeft size={20} /></button><h2 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Nouveau {form.type}</h2></div>

        {/* Template Options */}
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Smart Template Wizard - Full guided flow */}
          <button
            onClick={() => setShowSmartWizard(true)}
            className={`p-4 rounded-xl border-2 border-dashed flex items-center gap-3 transition-all hover:shadow-lg group text-left ${isDark ? 'border-orange-500/50 hover:border-orange-400 bg-gradient-to-r from-orange-900/20 to-amber-900/20' : 'border-orange-300 hover:border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50'}`}
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
            className={`p-4 rounded-xl border-2 border-dashed flex items-center gap-3 transition-all hover:shadow-lg group text-left ${isDark ? 'border-blue-500/50 hover:border-blue-400 bg-gradient-to-r from-blue-900/20 to-indigo-900/20' : 'border-blue-300 hover:border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50'}`}
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
                  </div>
                ))}
              </div>

              {/* Add line button */}
              <button
                onClick={() => addLigne({ nom: '', prix: 0, unite: 'unité' }, section.id)}
                className={`w-full py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-md ${isDark ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
              >
                <Plus size={18} style={{ color: couleur }} />
                <span className="font-medium" style={{ color: couleur }}>Ajouter une ligne</span>
              </button>
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
            {totals.totalCoutAchat > 0 && (
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
              <button onClick={handleCreate} disabled={isSubmitting} className={`px-5 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-all font-medium disabled:opacity-50 ${isDark ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                <FileText size={16} />
                <span>Brouillon</span>
              </button>
              <button onClick={handleCreate} disabled={isSubmitting} className="px-6 py-2.5 text-white rounded-xl flex items-center gap-2 min-h-[44px] hover:shadow-lg transition-all font-semibold disabled:opacity-50" style={{background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`}}>
                <Check size={18} />
                <span>{isSubmitting ? 'Création...' : `Créer le ${form.type}`}</span>
              </button>
            </div>
          </div>
        </div>
        {showClientModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className={`${cardBg} rounded-2xl p-6 w-full max-w-md`}><h3 className="font-bold mb-4">Nouveau client</h3><div className="space-y-4"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom *" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Téléphone" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowClientModal(false)} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={() => { if (newClient.nom) { const c = { id: generateId(), ...newClient }; setClients(prev => [...prev, c]); setForm(p => ({...p, clientId: c.id})); setShowClientModal(false); setNewClient({ nom: '', telephone: '' }); }}} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div></div></div>}

        {/* Template Selector Modal - also needed in create mode */}
        <TemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleTemplateSelect}
          customTemplates={JSON.parse(localStorage.getItem('chantierPro_customTemplates') || '[]')}
          onDeleteTemplate={(id) => {
            const t = JSON.parse(localStorage.getItem('chantierPro_customTemplates') || '[]');
            localStorage.setItem('chantierPro_customTemplates', JSON.stringify(t.filter(x => x.id !== id)));
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
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Devis & Factures</h1>
        </div>

        {/* 3 Hero Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* Devis IA */}
          <button
            onClick={() => showToast('Devis IA bientôt disponible ici — utilisez le Dashboard', 'info')}
            className="relative overflow-hidden rounded-xl p-3 sm:p-4 text-left text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
          >
            <Mic size={20} className="mb-1 text-white/90" />
            <p className="font-bold text-xs sm:text-sm leading-tight">Devis IA</p>
            <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 hidden sm:block">Dictez vos travaux</p>
            <Sparkles size={32} className="absolute -top-1 -right-1 text-white/10" />
          </button>

          {/* Devis Express */}
          <button
            onClick={() => setShowDevisExpressModal(true)}
            className="relative overflow-hidden rounded-xl p-3 sm:p-4 text-left text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #FF8C00, #FF6B00)' }}
          >
            <Zap size={20} className="mb-1 text-white/90" />
            <p className="font-bold text-xs sm:text-sm leading-tight">Express</p>
            <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 hidden sm:block">3 clics, c'est chiffré</p>
            <FileText size={32} className="absolute -top-1 -right-1 text-white/10" />
          </button>

          {/* Nouveau */}
          <button
            onClick={() => { setEditingDevis(null); setShowDevisWizard(true); }}
            className={`relative overflow-hidden rounded-xl p-3 sm:p-4 text-left text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
            style={{ background: `linear-gradient(135deg, ${couleur}cc, ${couleur})` }}
          >
            <Plus size={20} className="mb-1 text-white/90" />
            <p className="font-bold text-xs sm:text-sm leading-tight">Nouveau</p>
            <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 hidden sm:block">Devis manuel</p>
            <Edit3 size={32} className="absolute -top-1 -right-1 text-white/10" />
          </button>
        </div>
      </div>
      {/* === SECTION: KPIs CLIQUABLES === */}
      {(() => {
        const cleanDevis = devis.filter(d => {
          if (!d.numero && !clients.find(c => c.id === d.client_id) && (!d.statut || d.statut === 'brouillon')) return false;
          if (d.client_id && !clients.find(c => c.id === d.client_id) && d.statut === 'brouillon' && !d.total_ttc) return false;
          return true;
        });
        const devisEnvoye = cleanDevis.filter(d => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut));
        const devisAccepte = cleanDevis.filter(d => d.type === 'devis' && ['accepte', 'acompte_facture', 'facture'].includes(d.statut));
        const devisRefuse = cleanDevis.filter(d => d.type === 'devis' && d.statut === 'refuse');
        const facturesEnAttente = cleanDevis.filter(d => d.type === 'facture' && d.statut !== 'payee');
        const facturesPayees = cleanDevis.filter(d => d.type === 'facture' && d.statut === 'payee');
        const facturesEnRetard = facturesEnAttente.filter(f => Math.floor((Date.now() - new Date(f.date)) / 86400000) > 30);
        const montantPayees = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);
        const montantEnCours = devisEnvoye.reduce((s, d) => s + (d.total_ttc || 0), 0);
        const montantAEncaisser = facturesEnAttente.reduce((s, f) => s + (f.total_ttc || 0), 0);
        const totalEnvoyes = devisEnvoye.length + devisAccepte.length + devisRefuse.length;
        const tauxConversion = totalEnvoyes > 0 ? Math.round((devisAccepte.length / totalEnvoyes) * 100) : null;
        // Count "à traiter" items
        const aTraiterCount = cleanDevis.filter(d => {
          const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
          return (d.statut === 'brouillon' && days > 2) || (['envoye', 'vu'].includes(d.statut) && days > 7);
        }).length;

        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* CA encaissé */}
              <button onClick={() => setFilter('factures')} className={`${cardBg} rounded-xl border p-3 text-left transition-all hover:shadow-md ${filter === 'factures' ? 'ring-2' : ''}`} style={filter === 'factures' ? { ringColor: couleur } : {}}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted} mb-1`}>CA encaissé</p>
                <p className="text-lg font-bold" style={{ color: couleur }}>{modeDiscret ? '·····' : formatMoney(montantPayees)}</p>
                <p className={`text-[11px] ${textMuted}`}>{facturesPayees.length} facture{facturesPayees.length !== 1 ? 's' : ''}</p>
              </button>

              {/* En cours */}
              <button onClick={() => setFilter('attente')} className={`${cardBg} rounded-xl border p-3 text-left transition-all hover:shadow-md ${filter === 'attente' ? 'ring-2' : ''}`} style={filter === 'attente' ? { ringColor: couleur } : {}}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted} mb-1`}>En cours</p>
                <p className="text-lg font-bold text-blue-600">{devisEnvoye.length}</p>
                <p className={`text-[11px] ${textMuted}`}>{modeDiscret ? '·····' : formatMoney(montantEnCours)}</p>
              </button>

              {/* Conversion */}
              <button onClick={() => setFilter('conversion')} className={`${cardBg} rounded-xl border p-3 text-left transition-all hover:shadow-md ${filter === 'conversion' ? 'ring-2' : ''}`} style={filter === 'conversion' ? { ringColor: couleur } : {}}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted} mb-1`}>Conversion</p>
                <p className={`text-lg font-bold ${tauxConversion != null ? (tauxConversion >= 50 ? 'text-emerald-600' : tauxConversion >= 25 ? 'text-amber-600' : 'text-red-500') : textMuted}`}>
                  {tauxConversion != null ? `${tauxConversion}%` : '—'}
                </p>
                <p className={`text-[11px] ${textMuted}`}>{devisAccepte.length}/{totalEnvoyes} signés</p>
              </button>

              {/* À encaisser */}
              <button onClick={() => setFilter('factures_impayees')} className={`${cardBg} rounded-xl border p-3 text-left transition-all hover:shadow-md ${facturesEnRetard.length > 0 ? (isDark ? 'border-red-800' : 'border-red-300') : ''} ${filter === 'factures_impayees' ? 'ring-2' : ''}`} style={filter === 'factures_impayees' ? { ringColor: couleur } : {}}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted} mb-1`}>À encaisser</p>
                <p className={`text-lg font-bold ${facturesEnRetard.length > 0 ? 'text-red-600' : 'text-violet-600'}`}>
                  {modeDiscret ? '·····' : formatMoney(montantAEncaisser)}
                </p>
                <p className={`text-[11px] ${facturesEnRetard.length > 0 ? 'text-red-500 font-medium' : textMuted}`}>
                  {facturesEnRetard.length > 0 ? `⚠️ ${facturesEnRetard.length} en retard` : `${facturesEnAttente.length} en attente`}
                </p>
              </button>
            </div>

            {/* À traiter badge */}
            {aTraiterCount > 0 && (
              <button
                onClick={() => setFilter('a_traiter')}
                className={`w-full rounded-xl p-3 flex items-center justify-between transition-all ${filter === 'a_traiter' ? 'text-white' : isDark ? 'bg-amber-900/20 hover:bg-amber-900/30' : 'bg-amber-50 hover:bg-amber-100'}`}
                style={filter === 'a_traiter' ? { background: couleur } : {}}
              >
                <span className={`text-sm font-semibold ${filter === 'a_traiter' ? 'text-white' : isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  🔔 {aTraiterCount} document{aTraiterCount > 1 ? 's' : ''} à traiter aujourd'hui
                </span>
                <ChevronRight size={16} className={filter === 'a_traiter' ? 'text-white' : 'text-amber-500'} />
              </button>
            )}
          </div>
        );
      })()}

      {/* === SECTION: LISTE DES DOCUMENTS === */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: couleur }} />
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${textMuted}`}>Tous les documents</h2>
          <span className={`text-xs ${textMuted}`}>— {filtered.length} document{filtered.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center overflow-x-auto pb-1">
        <input placeholder="🔍 Rechercher..." aria-label="Rechercher un document" value={search} onChange={e => setSearch(e.target.value)} className={`flex-1 max-w-[180px] sm:max-w-xs px-3 sm:px-4 py-2 border rounded-xl text-sm ${inputBg}`} />
        <div role="group" aria-label="Filtrer par type">
          {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['attente', 'En attente'], ['a_traiter', '🔔 À traiter']].map(([k, v]) => <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap min-h-[44px] ${filter === k ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={filter === k ? {background: couleur} : {}}>{v}</button>)}
        </div>
        <div className={`h-6 w-px mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
        <div role="group" aria-label="Trier par">
          {[['recent', '📅 Récent'], ['status', '📊 Statut'], ['amount', '💰 Montant']].map(([k, v]) => <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k} className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap min-h-[44px] ${sortBy === k ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={sortBy === k ? {background: couleur} : {}}>{v}</button>)}
        </div>
        {filtered.length > 0 && (
          <>
            <div className={`h-6 w-px mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <button
              onClick={() => batchExportPDF(filtered)}
              disabled={actionLoading === 'batch'}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              aria-label="Exporter les documents filtrés en PDF"
            >
              {actionLoading === 'batch' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="hidden sm:inline">Exporter ({filtered.length})</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </>
        )}
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
      ) : (
        <div className="space-y-2">{filtered.map(d => {
          const client = clients.find(c => c.id === d.client_id);
          const hasAcompte = d.type === 'devis' && getAcompteFacture(d.id);
          const chantier = chantiers.find(ch => ch.id === d.chantier_id);
          const daysSince = Math.floor((Date.now() - new Date(d.date)) / 86400000);
          const statusColor = DEVIS_STATUS_COLORS[d.statut] || DEVIS_STATUS_COLORS.brouillon;
          const statusLabel = d.statut === 'accepte' ? 'Signé' : (DEVIS_STATUS_LABELS[d.statut] || d.statut);

          // Contextual quick action
          const getQuickAction = () => {
            if (d.statut === 'brouillon') return { label: 'Envoyer', Icon: Send, cls: 'bg-amber-500 hover:bg-amber-600 text-white', fn: (e) => { e.stopPropagation(); sendEmail(d); } };
            if (['envoye', 'vu'].includes(d.statut) && daysSince > 7) return { label: 'Relancer', Icon: Mail, cls: isDark ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200 text-amber-700', fn: (e) => { e.stopPropagation(); sendEmail(d); } };
            if (d.statut === 'accepte' && d.type === 'devis') return { label: 'Facturer', Icon: Receipt, cls: 'bg-emerald-500 hover:bg-emerald-600 text-white', fn: (e) => { e.stopPropagation(); setSelected(d); setMode('preview'); } };
            return null;
          };
          const qa = getQuickAction();

          return (
            <div key={d.id} onClick={() => { setSelected(d); setMode('preview'); if (d.statut === 'envoye' && d.type === 'devis') markAsViewed(d); }} className={`${cardBg} rounded-xl border p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center gap-3">
                {/* Status dot */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor.dot}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className={`font-semibold text-sm ${textPrimary}`}>{d.numero}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? `${statusColor.darkBg} ${statusColor.darkText}` : `${statusColor.bg} ${statusColor.text}`}`}>{statusLabel}</span>
                    {hasAcompte && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>+ Acompte</span>}
                    {d.is_avenant && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>AV{d.avenant_numero}</span>}
                    {needsFollowUp(d) && !qa && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>⏰ Relancer</span>
                    )}
                    {isExpired(d) && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-200 text-red-700'}`}>Expiré</span>}
                  </div>
                  <p className={`text-xs ${textMuted} truncate`}>
                    {client ? `${client.prenom || ''} ${client.nom}`.trim() : (d.client_nom || 'Client')}
                    {chantier ? ` · ${chantier.nom}` : ''}
                    {` · ${new Date(d.date).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>

                {/* Quick action OR PDF */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {qa ? (
                    <button onClick={qa.fn} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px] transition-all ${qa.cls}`}>
                      <qa.Icon size={14} />
                      <span className="hidden sm:inline">{qa.label}</span>
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); previewPDF(d); }} className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Aperçu PDF">
                      <Eye size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                    </button>
                  )}
                  <p className={`text-sm sm:text-base font-bold min-w-[80px] sm:min-w-[100px] text-right tabular-nums ${getDevisTTC(d) === 0 ? textMuted : ''}`} style={getDevisTTC(d) > 0 ? {color: couleur} : {}}>
                    {formatMoney(getDevisTTC(d))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}</div>
      )}
      <Snackbar />

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
                  onClick={() => { printPDF(selected); }}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`${cardBg} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden`}>
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
                onClick={() => {
                  if (!templateName.trim()) return showToast('Donnez un nom au modèle', 'error');
                  const customTemplates = JSON.parse(localStorage.getItem('chantierPro_customTemplates') || '[]');
                  customTemplates.push({
                    id: generateId(),
                    nom: templateName.trim(),
                    category: templateCategory.trim() || 'Mes modèles',
                    description: `Créé depuis ${selected.numero}`,
                    date: new Date().toISOString(),
                    lignes: (selected.lignes || []).map(l => ({
                      description: l.description,
                      quantite: l.quantite,
                      unite: l.unite,
                      prixUnitaire: Math.abs(l.prixUnitaire || 0),
                      prixAchat: l.prixAchat || 0,
                      tva: l.tva,
                    })),
                    tvaRate: selected.tvaRate,
                    notes: selected.notes || '',
                  });
                  localStorage.setItem('chantierPro_customTemplates', JSON.stringify(customTemplates));
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

      {/* Template Selector Modal (legacy) */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
        customTemplates={JSON.parse(localStorage.getItem('chantierPro_customTemplates') || '[]')}
        onDeleteTemplate={(id) => {
          const t = JSON.parse(localStorage.getItem('chantierPro_customTemplates') || '[]');
          localStorage.setItem('chantierPro_customTemplates', JSON.stringify(t.filter(x => x.id !== id)));
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

      {/* Devis Wizard - Step-by-step devis creation */}
      <DevisWizard
        isOpen={showDevisWizard}
        onClose={() => { setShowDevisWizard(false); setEditingDevis(null); }}
        initialData={editingDevis}
        onSubmit={async (devisData) => {
          const numero = await generateNumero(devisData.type);
          const newDevis = await onSubmit({ ...devisData, numero });
          if (!newDevis?.id) {
            throw new Error('Le devis n\'a pas pu être créé. Vérifiez les données et réessayez.');
          }
          setSelected(newDevis);
          setMode('preview');
          showToast(`${devisData.type === 'facture' ? 'Facture' : 'Devis'} ${numero} créé avec succès`, 'success');
          return newDevis;
        }}
        onUpdate={async (id, devisData) => {
          await onUpdate(id, devisData);
          // Refresh the selected devis with updated data
          const updated = { ...selected, ...devisData };
          setSelected(updated);
          setDevis(prev => prev.map(d => d.id === id ? updated : d));
          setEditingDevis(null);
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
      />

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
          const numero = await generateNumero(devisData.type);
          const newDevis = await onSubmit({ ...devisData, numero });
          if (newDevis?.id) {
            setSelected(newDevis);
            setMode('preview');
            showToast(`Devis ${numero} créé avec succès`, 'success');
          }
        }}
        clients={clients}
        isDark={isDark}
        couleur={couleur}
        tvaDefaut={entreprise?.tvaDefaut || 10}
      />
    </div>
  );
}
