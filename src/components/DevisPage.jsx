import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowLeft, Download, Trash2, Send, Mail, MessageCircle, Edit3, Check, X, FileText, Receipt, Clock, Search, ChevronRight, Star, Filter, Eye, Pen, CreditCard, Banknote, CheckCircle, AlertCircle, AlertTriangle, XCircle, Building2, Copy, TrendingUp, QrCode, Sparkles, PenTool, MoreVertical } from 'lucide-react';
import PaymentModal from './PaymentModal';
import TemplateSelector from './TemplateSelector';
import SignaturePad from './SignaturePad';
import SmartTemplateWizard from './SmartTemplateWizard';
import DevisWizard from './DevisWizard';
import CatalogBrowser from './CatalogBrowser';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import { useDevisModals } from '../hooks/useDevisModals';
import { isFacturXCompliant } from '../lib/facturx';

export default function DevisPage({ clients, setClients, devis, setDevis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret, selectedDevis, setSelectedDevis, isDark, couleur, createMode, setCreateMode, addChantier, setPage, setSelectedChantier, addEchange, paiements = [], addPaiement }) {
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
  const [chantierForm, setChantierForm] = useState({ nom: '', adresse: '' });
  const [pdfContent, setPdfContent] = useState('');
  const [tooltip, setTooltip] = useState(null); // { text, x, y }
  const [showActionsMenu, setShowActionsMenu] = useState(false);

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
    notes: ''
  });

  const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

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
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    // Search by numero AND client name/entreprise
    if (debouncedSearch) {
      const client = clients.find(c => c.id === d.client_id);
      const searchText = `${d.numero || ''} ${client?.nom || ''} ${client?.prenom || ''} ${client?.entreprise || ''}`.toLowerCase();
      if (!searchText.includes(debouncedSearch.toLowerCase())) return false;
    }
    return true;
  }));

  // Calcul des totaux avec multi-taux TVA et marge
  const calculateTotals = () => {
    let totalHT = 0;
    let totalCoutAchat = 0;
    const tvaParTaux = {}; // { 10: { base: 0, montant: 0 }, 20: {...} }

    form.sections.forEach(s => s.lignes.forEach(l => {
      const montant = l.montant || 0;
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

  // Génération numéro unique garanti
  const generateNumero = (type) => {
    const prefix = type === 'facture' ? 'FAC' : 'DEV';
    const year = new Date().getFullYear();
    // Trouver le dernier numéro pour ce type et cette année
    const existingNumbers = devis
      .filter(d => d.type === type && d.numero?.startsWith(`${prefix}-${year}-`))
      .map(d => parseInt(d.numero.split('-')[2]) || 0);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `${prefix}-${year}-${String(maxNumber + 1).padStart(5, '0')}`;
  };

  const handleCreate = () => {
    if (!form.clientId) return showToast('Sélectionnez un client', 'error');
    if (form.sections.every(s => s.lignes.length === 0)) return showToast('Ajoutez des lignes', 'error');

    const client = clients.find(c => c.id === form.clientId);
    const numero = generateNumero(form.type);

    const newDevis = onSubmit({
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
      tvaDetails: totals.tvaParTaux, // Pour affichage PDF
      tvaRate: form.tvaDefaut, // Taux TVA par défaut pour acompte/facture
      remise: form.remise,
      total_ht: totals.htApresRemise,
      tva: totals.totalTVA,
      total_ttc: totals.ttc,
      retenueGarantie: form.retenueGarantie,
      retenue_montant: totals.retenueGarantie,
      ttc_net: totals.ttcNet,
      marge: totals.marge,
      tauxMarge: totals.tauxMarge,
      notes: form.notes
    });

    setMode('list');
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

    // Show snackbar with action to view the created devis
    setSnackbar({
      type: 'success',
      message: `${form.type === 'facture' ? 'Facture' : 'Devis'} ${numero} cree`,
      action: newDevis ? {
        label: 'Voir',
        onClick: () => {
          setSelected(newDevis);
          setMode('preview');
          setSnackbar(null);
        }
      } : null
    });
  };

  // Dupliquer un devis/facture
  const duplicateDocument = (doc) => {
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
      numero: generateNumero('devis'),
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
      total_ht: doc.total_ht,
      tva: doc.tva,
      total_ttc: doc.total_ttc,
      notes: doc.notes || ''
    };

    onSubmit(newDoc);
    setSelected(newDoc);
    setMode('preview');
    setSnackbar({
      type: 'success',
      message: `Devis ${newDoc.numero} cree (copie)`,
      action: {
        label: 'Voir',
        onClick: () => setSnackbar(null)
      }
    });
  };

  // Canvas signature
  useEffect(() => { if (mode === 'sign' && canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; } }, [mode]);
  const startDraw = (e) => { setIsDrawing(true); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); };
  const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); ctx.stroke(); };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => canvasRef.current?.getContext('2d').clearRect(0, 0, 350, 180);
  const saveSignature = () => { if (!selected) return; onUpdate(selected.id, { signature: canvasRef.current?.toDataURL() || 'signed', signatureDate: new Date().toISOString(), statut: 'accepte' }); setMode('list'); setSelected(null); setSnackbar({ type: 'success', message: 'Devis signe et accepte !' }); };

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
  const handleSmartDevisCreate = (devisData) => {
    // Validate required data
    if (!devisData || !devisData.clientId || !devisData.sections?.length) {
      setSnackbar({ type: 'error', message: 'Données du devis incomplètes' });
      return;
    }

    // Generate numero
    const numero = generateNumero('devis');

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
      tvaRate: devisData.tvaDefaut || 10,
      remise: devisData.remise || 0,
      notes: devisData.notes,
      total_ht: devisData.total_ht,
      total_tva: devisData.total_tva,
      total_ttc: devisData.total_ttc,
      cout_revient: devisData.cout_revient,
      marge: devisData.marge,
      marge_pourcent: devisData.marge_pourcent,
      template: devisData.template
    };

    // Submit the devis
    onSubmit(newDevis);

    // Close wizard and navigate directly to the new devis
    setShowSmartWizard(false);
    setSelected(newDevis);
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
        documentId: selected?.id,
        documentNumero: selected?.numero
      });
    }
  };

  // Workflow facturation
  const getAcompteFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'acompte');
  const getSoldeFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'solde');
  const getFacturesLiees = (devisId) => devis.filter(d => d.type === 'facture' && d.devis_source_id === devisId);

  const createAcompte = () => {
    if (!selected || selected.statut !== 'accepte') return showToast('Le devis doit être accepté', 'error');
    if (getAcompteFacture(selected.id)) return showToast('Un acompte existe déjà', 'error');
    const montantHT = selected.total_ht * (acomptePct / 100);
    const tvaRate = selected.tvaRate || entreprise?.tvaDefaut || 10;
    const tva = montantHT * (tvaRate / 100);
    const ttc = montantHT + tva;
    const facture = { id: generateId(), numero: generateNumero('facture'), type: 'facture', facture_type: 'acompte', devis_source_id: selected.id, client_id: selected.client_id, chantier_id: selected.chantier_id, date: new Date().toISOString().split('T')[0], statut: 'envoye', tvaRate, lignes: [{ id: '1', description: `Acompte ${acomptePct}% sur devis ${selected.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montantHT, montant: montantHT }], total_ht: montantHT, tva, total_ttc: ttc, acompte_pct: acomptePct };
    onSubmit(facture);
    onUpdate(selected.id, { statut: 'acompte_facture', acompte_pct: acomptePct });
    setShowAcompteModal(false);
    setSelected({ ...selected, statut: 'acompte_facture', acompte_pct: acomptePct });
    setSnackbar({ type: 'success', message: `Facture d'acompte ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  const createSolde = () => {
    if (!selected) return;
    const acompte = getAcompteFacture(selected.id);
    const montantAcompteHT = acompte ? acompte.total_ht : 0;
    const montantSoldeHT = selected.total_ht - montantAcompteHT;
    const tvaRate = selected.tvaRate || entreprise?.tvaDefaut || 10;
    const tva = montantSoldeHT * (tvaRate / 100);
    const ttc = montantSoldeHT + tva;
    const lignes = [...(selected.lignes || [])];
    if (acompte) lignes.push({ id: 'acompte', description: `Acompte déjà facturé (${acompte.numero})`, quantite: 1, unite: 'forfait', prixUnitaire: -montantAcompteHT, montant: -montantAcompteHT });
    const facture = { id: generateId(), numero: generateNumero('facture'), type: 'facture', facture_type: acompte ? 'solde' : 'totale', devis_source_id: selected.id, acompte_facture_id: acompte?.id, client_id: selected.client_id, chantier_id: selected.chantier_id, date: new Date().toISOString().split('T')[0], statut: 'envoye', tvaRate, lignes, total_ht: montantSoldeHT, tva, total_ttc: ttc };
    onSubmit(facture);
    onUpdate(selected.id, { statut: 'facture' });
    setSelected({ ...selected, statut: 'facture' });
    setSnackbar({ type: 'success', message: `Facture ${acompte ? 'de solde' : ''} ${facture.numero} créée`, action: { label: 'Voir', onClick: () => { setSelected(facture); setSnackbar(null); } } });
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
        details[rate].base += (l.montant || 0);
        details[rate].montant += (l.montant || 0) * (rate / 100);
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
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${l.montant<0?'color:#dc2626;':''}">${(l.montant||0).toFixed(2)} €</td>
      </tr>
    `).join('');

    const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${isFacture?'Facture':'Devis'} ${doc.numero}</title>
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
      <h1>${isFacture ? 'FACTURE' : 'DEVIS'}</h1>
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
      <div class="name">${client?.prenom || ''} ${client?.nom || ''}</div>
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
  <table>
    <thead>
      <tr>
        <th style="width:40%">Description</th>
        <th style="width:10%">Qté</th>
        <th style="width:10%">Unité</th>
        <th style="width:15%">PU HT</th>
        <th style="width:10%">TVA</th>
        <th style="width:15%">Total HT</th>
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
        ${entreprise?.delaiPaiement || 30} jours à compter de la date ${isFacture ? 'de facture' : 'de réception des travaux'}.<br><br>
        <strong>Pénalités de retard</strong><br>
        Taux BCE + 10 points (soit ~13% annuel).<br>
        Indemnité forfaitaire de recouvrement: 40 €
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
      ${doc.signature ? '<div style="margin-top:15px;color:#16a34a;font-weight:bold">[OK] Signé électroniquement le '+new Date(doc.signatureDate).toLocaleDateString('fr-FR')+'</div>' : ''}
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
    const filename = `${doc.type === 'facture' ? 'Facture' : 'Devis'}_${doc.numero}.html`;

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

  const sendWhatsApp = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const phone = (client?.telephone || '').replace(/\s/g, '').replace(/^0/, '33');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, voici votre ${doc.type} ${doc.numero}: ${formatMoney(doc.total_ttc)}`)}`, '_blank');
    if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' });
    if (addEchange) addEchange({ type: 'whatsapp', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `Envoi ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
  };
  const sendEmail = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    window.location.href = `mailto:${client?.email || ''}?subject=${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}&body=Bonjour,%0A%0AVeuillez trouver ci-joint votre ${doc.type} ${doc.numero} d'un montant de ${formatMoney(doc.total_ttc)}.%0A%0ACordialement`;
    if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' });
    if (addEchange) addEchange({ type: 'email', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `Envoi ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
  };

  // SMS via native protocol (opens default SMS app)
  const sendSMS = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const phone = (client?.telephone || '').replace(/\s/g, '');
    const message = `Bonjour, voici votre ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}: ${formatMoney(doc.total_ttc)}`;
    // Use sms: protocol - works on mobile and desktop with SMS apps
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' });
    if (addEchange) addEchange({ type: 'sms', client_id: doc.client_id, document: doc.numero, montant: doc.total_ttc, objet: `SMS ${doc.type === 'facture' ? 'facture' : 'devis'} ${doc.numero}` });
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
      <div className="flex items-center gap-2 sm:gap-4"><button onClick={() => setMode('preview')} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Signature Client</h1></div>
      <div className="bg-white rounded-2xl border p-6 text-center">
        <p className="mb-4">Signature pour <strong>{selected.numero}</strong></p>
        <p className="text-3xl font-bold mb-6" style={{color: couleur}}>{formatMoney(selected.total_ttc)}</p>
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

    return (
      <div className="space-y-4">
        {/* Header with integrated status flow */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardBg}`}>
          {/* Breadcrumb navigation */}
          <div className={`flex items-center gap-1.5 text-sm mb-3 ${textMuted}`}>
            <button onClick={() => { setMode('list'); setSelected(null); }} className="hover:underline flex items-center gap-1">
              <FileText size={14} />
              <span>Devis / Factures</span>
            </button>
            <ChevronRight size={14} />
            <span className={textPrimary}>{selected.numero}</span>
          </div>

          {/* Top row: back, title, preview */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <button onClick={() => { setMode('list'); setSelected(null); }} className={`p-3 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <ArrowLeft size={18} className={textMuted} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={`text-base sm:text-lg font-bold truncate ${textPrimary}`}>{selected.numero}</h1>
              <p className={`text-xs ${textMuted}`}>{selected.type === 'facture' ? 'Facture' : 'Devis'} · {new Date(selected.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <button onClick={() => previewPDF(selected)} className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" title="Aperçu">
              <Eye size={16} />
            </button>
          </div>

          {/* Workflow progress - explicit steps with labels */}
          <div className="mb-4">
            <div className="flex items-center">
              {statusSteps.map((step, idx) => {
                const { isActive, isPast } = getStepState(step);
                const isRefused = selected.statut === 'refuse';
                const isLast = idx === statusSteps.length - 1;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center flex-1">
                      {/* Step circle with number */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isRefused ? (isDark ? 'bg-red-900/70 text-red-400' : 'bg-red-100 text-red-600') :
                          isActive ? 'text-white ring-2 ring-offset-2' :
                          isPast ? (isDark ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-500 text-white') :
                          (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')
                        }`}
                        style={isActive ? { backgroundColor: couleur, ringColor: couleur } : {}}
                      >
                        {isPast ? '✓' : idx + 1}
                      </div>
                      {/* Step label */}
                      <span className={`text-[10px] sm:text-xs mt-1.5 font-medium text-center leading-tight ${
                        isActive ? (isDark ? 'text-white' : 'text-slate-900') :
                        isPast ? (isDark ? 'text-emerald-400' : 'text-emerald-600') :
                        textMuted
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div className={`flex-1 h-0.5 -mt-5 mx-1 ${
                        isPast ? (isDark ? 'bg-emerald-600' : 'bg-emerald-400') :
                        (isDark ? 'bg-slate-700' : 'bg-slate-200')
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Status row: dropdown + next action hint */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selected.statut}
              onChange={e => { onUpdate(selected.id, { statut: e.target.value }); setSelected(s => ({...s, statut: e.target.value})); }}
              className={`px-4 min-h-[44px] rounded-xl text-sm font-semibold cursor-pointer border-2 outline-none ${
                selected.statut === 'accepte' ? (isDark ? 'bg-emerald-900/50 text-emerald-400 border-emerald-600' : 'bg-emerald-100 text-emerald-700 border-emerald-300')
                : selected.statut === 'payee' ? (isDark ? 'bg-purple-900/50 text-purple-400 border-purple-600' : 'bg-purple-100 text-purple-700 border-purple-300')
                : selected.statut === 'acompte_facture' ? (isDark ? 'bg-blue-900/50 text-blue-400 border-blue-600' : 'bg-blue-100 text-blue-700 border-blue-300')
                : selected.statut === 'facture' ? (isDark ? 'bg-indigo-900/50 text-indigo-400 border-indigo-600' : 'bg-indigo-100 text-indigo-700 border-indigo-300')
                : selected.statut === 'refuse' ? (isDark ? 'bg-red-900/50 text-red-400 border-red-600' : 'bg-red-100 text-red-700 border-red-300')
                : (isDark ? 'bg-amber-900/50 text-amber-400 border-amber-600' : 'bg-amber-100 text-amber-700 border-amber-300')
              }`}
            >
              <option value="brouillon">📝 Brouillon</option>
              <option value="envoye">📤 Envoyé</option>
              {isDevis && <option value="accepte">✅ Accepté</option>}
              {isDevis && <option value="refuse">❌ Refusé</option>}
              {isDevis && selected.statut === 'acompte_facture' && <option value="acompte_facture">💰 Acompte facturé</option>}
              {isDevis && selected.statut === 'facture' && <option value="facture">🧾 Facturé</option>}
              {selected.type === 'facture' && <option value="payee">✅ Payée</option>}
            </select>

            {nextAction && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <span className={`text-sm font-medium ${nextAction.color}`}>{nextAction.text}</span>
              </div>
            )}

            {needsFollowUp(selected) && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 font-medium">⏰ Relancer?</span>
            )}
          </div>
        </div>

        {/* Action cards - What can I do now? */}
        {isDevis && selected.statut === 'accepte' && (
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-sm font-medium mb-3 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ✓ Devis signé - Prochaine étape: créer la facture
            </p>
            <div className="grid grid-cols-2 gap-2">
              {canAcompte && (
                <button
                  onClick={() => setShowAcompteModal(true)}
                  className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${isDark ? 'border-purple-700 bg-purple-900/30 hover:bg-purple-900/50' : 'border-purple-200 bg-white hover:bg-purple-50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard size={16} className="text-purple-500" />
                    <span className={`font-medium ${textPrimary}`}>Demander acompte</span>
                  </div>
                  <p className={`text-xs ${textMuted}`}>30% recommandé avant travaux</p>
                </button>
              )}
              {canFacturer && (
                <button
                  onClick={createSolde}
                  className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${isDark ? 'border-emerald-700 bg-emerald-900/30 hover:bg-emerald-900/50' : 'border-emerald-200 bg-white hover:bg-emerald-50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt size={16} className="text-emerald-500" />
                    <span className={`font-medium ${textPrimary}`}>Facturer 100%</span>
                  </div>
                  <p className={`text-xs ${textMuted}`}>Créer facture complète</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Acompte progress card */}
        {isDevis && selected.statut === 'acompte_facture' && (
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                💳 Acompte {selected.acompte_pct}% facturé
              </p>
              <span className={`font-bold ${textPrimary}`}>{formatMoney(resteAFacturer)} restant</span>
            </div>
            <div className={`h-2 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-blue-200'}`}>
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${selected.acompte_pct}%` }} />
            </div>
            {canFacturer && (
              <button
                onClick={createSolde}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Receipt size={16} />
                Facturer le solde ({formatMoney(resteAFacturer)})
              </button>
            )}
          </div>
        )}

        {/* Actions row - Primary CTAs + Communication */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary action buttons based on status */}
          {isDevis && selected.statut === 'envoye' && (
            <button onClick={() => setShowSignaturePad(true)} className="px-4 py-2.5 text-white rounded-xl text-sm flex items-center gap-2 transition-all hover:shadow-lg font-medium" style={{background: couleur}}>
              <PenTool size={16} /> Faire signer
            </button>
          )}
          {selected.type === 'facture' && selected.statut !== 'payee' && (
            <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl text-sm flex items-center gap-2 transition-all hover:shadow-lg font-medium">
              <QrCode size={16} /> Encaisser
            </button>
          )}
          {isDevis && selected.statut === 'facture' && (
            <span className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
              <CheckCircle size={14} className="inline mr-1" /> Facturé
            </span>
          )}

          {/* Chantier link */}
          {hasChantier && linkedChantier ? (
            <button onClick={() => { setSelectedChantier?.(linkedChantier.id); setPage?.('chantiers'); }} className={`px-3 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
              <Building2 size={16} /> {linkedChantier.nom.length > 15 ? linkedChantier.nom.slice(0, 15) + '...' : linkedChantier.nom}
            </button>
          ) : canCreateChantier && selected.statut === 'accepte' ? (
            <button onClick={openChantierModal} className={`px-3 min-h-[44px] rounded-xl text-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
              <Building2 size={16} /> + Chantier
            </button>
          ) : null}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Communication icons - 44px touch targets for field workers */}
          <button onClick={() => sendWhatsApp(selected)} className="w-11 h-11 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95" title="WhatsApp">
            <MessageCircle size={18} />
          </button>
          <button onClick={() => sendSMS(selected)} className="w-11 h-11 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95" title="SMS">
            <Send size={18} />
          </button>
          <button onClick={() => sendEmail(selected)} className="w-11 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95" title="Email">
            <Mail size={18} />
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors active:scale-95 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              <MoreVertical size={18} />
            </button>
            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className={`absolute right-0 top-11 z-50 rounded-xl shadow-xl border overflow-hidden min-w-[160px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button
                    onClick={() => { duplicateDocument(selected); setShowActionsMenu(false); }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <Copy size={16} /> Dupliquer
                  </button>
                  <button
                    onClick={async () => {
                      setShowActionsMenu(false);
                      const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce document ?' });
                      if (confirmed) { onDelete(selected.id); setSelected(null); setMode('list'); }
                    }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                  >
                    <Trash2 size={16} /> Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info workflow */}
        {isDevis && selected.statut === 'accepte' && !acompteFacture && (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl"></span>
              <div>
                <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Prochaine étape : Facturation</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {canCreateChantier && <><strong>Créer un chantier</strong> pour suivre les dépenses et le temps, puis </>}
                  <strong>demander un acompte</strong> (recommandé pour les gros montants) ou <strong>facturer intégralement</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acompte existant */}
        {acompteFacture && isDevis && (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl"></span>
                <div><p className="font-medium">Acompte facture</p><button onClick={() => setSelected(acompteFacture)} className="text-sm text-blue-600 hover:underline">{acompteFacture.numero} - {formatMoney(acompteFacture.total_ttc)}</button></div>
              </div>
              <div className="text-right"><p className="text-sm text-slate-500">Reste à facturer</p><p className="font-bold text-lg">{formatMoney(resteAFacturer)}</p></div>
            </div>
            <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${selected.acompte_pct}%` }} /></div>
          </div>
        )}

        {/* Relancer alert for unpaid invoices */}
        {selected.type === 'facture' && selected.statut !== 'payee' && (() => {
          const daysSince = Math.floor((new Date() - new Date(selected.date)) / 86400000);
          if (daysSince < 7) return null;
          const isOverdue = daysSince > 30;
          return (
            <div className={`rounded-xl p-4 border ${isOverdue
              ? (isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200')
              : (isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200')}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isOverdue ? '🚨' : '⏰'}</span>
                  <div>
                    <p className={`font-medium ${isOverdue
                      ? (isDark ? 'text-red-300' : 'text-red-800')
                      : (isDark ? 'text-amber-300' : 'text-amber-800')}`}>
                      {isOverdue ? 'Facture en retard' : 'Facture en attente'} · {daysSince} jours
                    </p>
                    <p className={`text-sm ${isOverdue
                      ? (isDark ? 'text-red-400' : 'text-red-600')
                      : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
                      {formatMoney(selected.total_ttc)} à encaisser
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      const message = `Bonjour,\n\nRelance pour la facture ${selected.numero} d'un montant de ${formatMoney(selected.total_ttc)} émise le ${new Date(selected.date).toLocaleDateString('fr-FR')}.\n\nMerci de procéder au règlement.\n\nCordialement`;
                      window.open(`https://wa.me/${client?.telephone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
                      if (addEchange) addEchange({ type: 'whatsapp', client_id: selected.client_id, document: selected.numero, montant: selected.total_ttc, objet: `Relance facture ${selected.numero}` });
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle size={16} />
                    Relancer WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      const subject = `Relance facture ${selected.numero}`;
                      const body = `Bonjour,\n\nRelance pour la facture ${selected.numero} d'un montant de ${formatMoney(selected.total_ttc)} émise le ${new Date(selected.date).toLocaleDateString('fr-FR')}.\n\nMerci de procéder au règlement.\n\nCordialement`;
                      window.open(`mailto:${client?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      if (addEchange) addEchange({ type: 'email', client_id: selected.client_id, document: selected.numero, montant: selected.total_ttc, objet: `Relance facture ${selected.numero}` });
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mail size={16} />
                    Relancer Email
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Document */}
        <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${cardBg}`}>
          <div className={`flex justify-between items-start mb-6 pb-6 border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 sm:gap-4">
              {entreprise?.logo ? <img src={entreprise.logo} className="h-14" alt="" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl" style={{background: `${couleur}20`}}></div>}
              <div><p className={`font-bold ${textPrimary}`}>{entreprise?.nom}</p><p className={`text-sm ${textMuted}`}>{entreprise?.adresse}</p></div>
            </div>
            <div className="text-right"><p className="text-xl font-bold" style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p><p className={textMuted}>{selected.numero}</p><p className={`text-sm ${textMuted}`}>{new Date(selected.date).toLocaleDateString('fr-FR')}</p></div>
          </div>
          <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><p className={`text-sm ${textMuted}`}>Client</p><p className={`font-semibold ${textPrimary}`}>{client?.nom} {client?.prenom}</p>{client?.adresse && <p className={`text-sm ${textMuted}`}>{client.adresse}</p>}</div>
          <table className="w-full mb-6 text-sm"><thead><tr className={`border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}><th className={`text-left py-2 ${textPrimary}`}>Description</th><th className={`text-right py-2 w-16 ${textPrimary}`}>Qté</th><th className={`text-right py-2 w-20 ${textPrimary}`}>PU HT</th><th className={`text-right py-2 w-24 ${textPrimary}`}>Total</th></tr></thead><tbody>{(selected.lignes || []).map((l, i) => <tr key={i} className={`border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}><td className={`py-2 ${textPrimary}`}>{l.description}</td><td className={`text-right ${textSecondary}`}>{l.quantite} {l.unite}</td><td className={`text-right ${textSecondary}`}>{(l.prixUnitaire || 0).toFixed(2)}€</td><td className={`text-right font-medium ${l.montant < 0 ? 'text-red-500' : textPrimary}`}>{(l.montant || 0).toFixed(2)}€</td></tr>)}</tbody></table>
          <div className="flex justify-end"><div className="w-56"><div className={`flex justify-between py-1 ${textPrimary}`}><span>HT</span><span>{formatMoney(selected.total_ht)}</span></div><div className={`flex justify-between py-1 ${textSecondary}`}><span>TVA {selected.tvaRate}%</span><span>{formatMoney(selected.tva)}</span></div><div className={`flex justify-between py-2 border-t font-bold ${isDark ? 'border-slate-600' : 'border-slate-200'}`} style={{color: couleur}}><span>TTC</span><span>{formatMoney(selected.total_ttc)}</span></div></div></div>
          {selected.signature && <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}><p className={`text-sm ${textMuted}`}>Signé le {new Date(selected.signatureDate).toLocaleDateString('fr-FR')}</p><span className="text-emerald-600 font-medium">[OK] Accepté par le client</span></div>}
        </div>

        {/* Timeline */}
        {isDevis && facturesLiees.length > 0 && (
          <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Historique Facturation</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500" /><div><p className="text-sm">{new Date(selected.date).toLocaleDateString('fr-FR')} - Devis créé</p></div></div>
              {selected.signatureDate && <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500" /><div><p className="text-sm">{new Date(selected.signatureDate).toLocaleDateString('fr-FR')} - Accepte</p></div></div>}
              {facturesLiees.map(f => (
                <div key={f.id} className={`flex items-center gap-3 cursor-pointer ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} rounded-lg p-2 -m-2`} onClick={() => setSelected(f)}>
                  <span className={`w-3 h-3 rounded-full ${f.statut === 'payee' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div className="flex-1"><p className="text-sm">{new Date(f.date).toLocaleDateString('fr-FR')} - {f.facture_type === 'acompte' ? 'Acompte' : f.facture_type === 'solde' ? 'Solde' : 'Facture'}</p><p className="text-xs text-slate-500">{f.numero} · {formatMoney(f.total_ttc)}</p></div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lien vers devis source */}
        {selected.type === 'facture' && selected.devis_source_id && (
          <div className={`${isDark ? 'bg-slate-700' : 'bg-slate-50'} rounded-xl p-4`}>
            <p className={`text-sm ${textMuted} mb-1`}>Devis source</p>
            <button onClick={() => { const src = devis.find(d => d.id === selected.devis_source_id); if (src) setSelected(src); }} className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: couleur }}><FileText size={14} /> Voir le devis</button>
          </div>
        )}

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
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800"> Pour travaux supérieurs à 1500€ chez particulier, acompte max 30%</div>
              <div className="flex gap-3">
                <button onClick={() => setShowAcompteModal(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"><X size={16} />Annuler</button>
                <button onClick={createAcompte} className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"><Check size={16} />Créer</button>
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
                <p className="text-2xl font-bold" style={{ color: couleur }}>{modeDiscret ? '·····' : `${(selected.total_ht || 0).toLocaleString('fr-FR')} € HT`}</p>
                <p className={`text-sm ${textMuted}`}>{(selected.total_ttc || 0).toLocaleString('fr-FR')} € TTC</p>
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
                Le chantier sera automatiquement lié à ce devis. Le revenu prévu ({modeDiscret ? '·····' : `${(selected.total_ht || 0).toLocaleString('fr-FR')} €`}) sera utilisé pour calculer la marge.
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
                    <h2 className={`font-bold text-base sm:text-lg ${textPrimary} truncate`}>Apercu du document</h2>
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
      </div>
    );
  }

  // === CREATE VIEW ===
  if (mode === 'create') {
    const favoris = catalogue?.filter(c => c.favori) || [];
    const catalogueFiltered = catalogue?.filter(c => !debouncedCatalogueSearch || c.nom?.toLowerCase().includes(debouncedCatalogueSearch.toLowerCase())) || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 sm:gap-4"><button onClick={() => setMode('list')} className={`p-2.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors`}><ArrowLeft size={20} /></button><h1 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Nouveau {form.type}</h1></div>

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
              <p className={`font-semibold ${textPrimary} text-sm sm:text-base`}>Charger un modele</p>
              <p className={`text-xs sm:text-sm ${textMuted}`}>Ajouter des lignes metier</p>
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
          
          {favoris.length >= 3 && <div className={`rounded-xl p-4 border ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-100'}`}><p className={`text-sm font-medium mb-2 ${textPrimary}`}>⭐ Favoris</p><div className="flex gap-2 flex-wrap overflow-x-auto pb-1">{favoris.map(item => <button key={item.id} onClick={() => addLigne(item, form.sections[0].id)} className={`px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-white hover:bg-amber-100 border-amber-200'}`}>{item.nom} <span className={textMuted}>{item.prix}€</span></button>)}</div></div>}
          {/* Catalogue section with visual browser button */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  placeholder="Rechercher dans le catalogue..."
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
                  {section.lignes.length} ligne{section.lignes.length > 1 ? 's' : ''} • Total: {(section.lignes.reduce((s, l) => s + (l.montant || 0), 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
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
                          {(l.montant || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </p>
                        <p className={`text-xs ${textMuted}`}>HT</p>
                      </div>
                      <button
                        onClick={() => removeLigne(section.id, l.id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Remise globale %</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.remise} onChange={e => setForm(p => ({...p, remise: parseFloat(e.target.value) || 0}))} /></div>
            <div><label className={`block text-sm mb-1 ${textPrimary}`}>Validite (jours)</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.validite} onChange={e => setForm(p => ({...p, validite: parseInt(e.target.value) || 30}))} /></div>
            <div className="col-span-2 sm:col-span-1">
              <label className={`block text-sm mb-1 ${textPrimary}`}>Retenue de garantie</label>
              <label className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl cursor-pointer ${form.retenueGarantie ? (isDark ? 'border-amber-500 bg-amber-900/20' : 'border-amber-400 bg-amber-50') : inputBg}`}>
                <input type="checkbox" checked={form.retenueGarantie} onChange={e => setForm(p => ({...p, retenueGarantie: e.target.checked}))} className="w-4 h-4 rounded" />
                <span className={`text-sm ${textPrimary}`}>5% (BTP)</span>
              </label>
            </div>
          </div>
          
          {/* Totaux avec multi-TVA et marge */}
          <div className="flex flex-col sm:flex-row justify-end gap-4">
            {/* Apercu marge (visible seulement pour l'artisan, pas sur le PDF) */}
            {totals.totalCoutAchat > 0 && (
              <div className={`w-full sm:w-64 p-4 rounded-xl border ${totals.marge >= 0 ? (isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200') : (isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className={totals.marge >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                  <span className={`text-sm font-medium ${textPrimary}`}>Votre marge</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>prive</span>
                </div>
                <div className="space-y-1">
                  <div className={`flex justify-between text-sm ${textSecondary}`}>
                    <span>Cout d'achat</span>
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
          
          <div className={`flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><button onClick={() => setMode('list')} className={`px-4 py-2 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}><X size={16} />Annuler</button><button onClick={handleCreate} className="px-6 py-2 text-white rounded-xl flex items-center gap-1.5 min-h-[44px] hover:shadow-lg transition-all" style={{background: couleur}}><Check size={16} />Créer</button></div>
        </div>
        {showClientModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className={`${cardBg} rounded-2xl p-6 w-full max-w-md`}><h3 className="font-bold mb-4">Nouveau client</h3><div className="space-y-4"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom *" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Téléphone" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowClientModal(false)} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={() => { if (newClient.nom) { const c = { id: generateId(), ...newClient }; setClients(prev => [...prev, c]); setForm(p => ({...p, clientId: c.id})); setShowClientModal(false); setNewClient({ nom: '', telephone: '' }); }}} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div></div></div>}
        <Snackbar />
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Devis & Factures</h1>
        <div className="flex items-center gap-2">
          {/* Quick access to Smart Template Wizard */}
          <button
            onClick={() => setShowSmartWizard(true)}
            className="px-3 sm:px-4 py-2 rounded-xl text-sm min-h-[44px] flex items-center gap-1.5 hover:shadow-lg transition-all bg-gradient-to-r from-orange-500 to-red-500 text-white"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Devis express</span>
          </button>
          <button onClick={() => setShowDevisWizard(true)} className="px-3 sm:px-4 py-2 text-white rounded-xl text-sm min-h-[44px] flex items-center gap-1.5 hover:shadow-lg transition-all" style={{background: couleur}}>
            <Plus size={16} />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>
      {/* === SECTION: VUE D'ENSEMBLE === */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: couleur }} />
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${textMuted}`}>Vue d'ensemble</h2>
          <span className={`text-xs ${textMuted}`}>— Suivez l'avancement de vos documents</span>
        </div>

      {/* Pipeline View */}
      {(() => {
        // Calculate pipeline stats
        const devisBrouillon = devis.filter(d => d.type === 'devis' && d.statut === 'brouillon');
        const devisEnvoye = devis.filter(d => d.type === 'devis' && d.statut === 'envoye');
        const devisAccepte = devis.filter(d => d.type === 'devis' && ['accepte', 'acompte_facture', 'facture'].includes(d.statut));
        const devisRefuse = devis.filter(d => d.type === 'devis' && d.statut === 'refuse');

        const facturesEnAttente = devis.filter(d => d.type === 'facture' && d.statut !== 'payee');
        const facturesPayees = devis.filter(d => d.type === 'facture' && d.statut === 'payee');
        const facturesEnRetard = facturesEnAttente.filter(f => {
          const days = Math.floor((new Date() - new Date(f.date)) / 86400000);
          return days > 30;
        });
        const montantEnRetard = facturesEnRetard.reduce((s, f) => s + (f.total_ttc || 0), 0);
        const montantAEncaisser = facturesEnAttente.reduce((s, f) => s + (f.total_ttc || 0), 0);

        // Group documents by client for "Accès rapide"
        const clientsWithDocs = {};
        devis.forEach(d => {
          if (!d.client_id) return;
          if (!clientsWithDocs[d.client_id]) {
            const client = clients.find(c => c.id === d.client_id);
            clientsWithDocs[d.client_id] = { client, devis: [], factures: [] };
          }
          if (d.type === 'devis') clientsWithDocs[d.client_id].devis.push(d);
          else clientsWithDocs[d.client_id].factures.push(d);
        });
        const activeClients = Object.values(clientsWithDocs)
          .filter(c => c.devis.some(d => d.statut !== 'refuse') || c.factures.some(f => f.statut !== 'payee'))
          .slice(0, 5);

        // Calculate amounts per stage
        const montantBrouillon = devisBrouillon.reduce((s, d) => s + (d.total_ttc || 0), 0);
        const montantEnvoye = devisEnvoye.reduce((s, d) => s + (d.total_ttc || 0), 0);
        const montantAccepte = devisAccepte.reduce((s, d) => s + (d.total_ttc || 0), 0);
        const montantPayees = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);

        // Conversion rate
        const totalEnvoyes = devisEnvoye.length + devisAccepte.length + devisRefuse.length;
        const tauxConversion = totalEnvoyes > 0 ? ((devisAccepte.length / totalEnvoyes) * 100).toFixed(0) : null;

        return (
          <div className="space-y-3">
            {/* Simplified Pipeline - Devis + Factures side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* DEVIS */}
              <div className={`${cardBg} rounded-xl border p-3`}>
                <p className={`text-xs font-medium ${textMuted} mb-2`}>Devis</p>
                <div className="flex gap-2">
                  <button onClick={() => setFilter('attente')} className={`flex-1 p-2 rounded-lg text-center ${devisEnvoye.length > 0 ? (isDark ? 'bg-amber-900/30' : 'bg-amber-50') : (isDark ? 'bg-slate-700' : 'bg-slate-50')}`}>
                    <p className={`text-lg font-bold ${devisEnvoye.length > 0 ? 'text-amber-500' : textMuted}`}>{devisEnvoye.length}</p>
                    <p className={`text-[10px] ${textMuted}`}>Attente</p>
                  </button>
                  <button onClick={() => setFilter('devis')} className={`flex-1 p-2 rounded-lg text-center ${devisAccepte.length > 0 ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : (isDark ? 'bg-slate-700' : 'bg-slate-50')}`}>
                    <p className={`text-lg font-bold ${devisAccepte.length > 0 ? 'text-emerald-500' : textMuted}`}>{devisAccepte.length}</p>
                    <p className={`text-[10px] ${textMuted}`}>Signés</p>
                  </button>
                </div>
              </div>

              {/* FACTURES */}
              <div className={`${cardBg} rounded-xl border p-3`}>
                <p className={`text-xs font-medium ${textMuted} mb-2`}>Factures</p>
                <div className="flex gap-2">
                  <button onClick={() => setFilter('factures')} className={`flex-1 p-2 rounded-lg text-center ${facturesEnAttente.length > 0 ? (isDark ? 'bg-indigo-900/30' : 'bg-indigo-50') : (isDark ? 'bg-slate-700' : 'bg-slate-50')}`}>
                    <p className={`text-lg font-bold ${facturesEnAttente.length > 0 ? 'text-indigo-500' : textMuted}`}>{facturesEnAttente.length}</p>
                    <p className={`text-[10px] ${textMuted}`}>Attente</p>
                  </button>
                  <button onClick={() => setFilter('factures')} className={`flex-1 p-2 rounded-lg text-center ${facturesPayees.length > 0 ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : (isDark ? 'bg-slate-700' : 'bg-slate-50')}`}>
                    <p className={`text-lg font-bold ${facturesPayees.length > 0 ? 'text-emerald-500' : textMuted}`}>{facturesPayees.length}</p>
                    <p className={`text-[10px] ${textMuted}`}>Payées</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Overdue alert - compact */}
            {facturesEnRetard.length > 0 && (
              <button onClick={() => setFilter('factures')} className={`w-full rounded-lg p-3 flex items-center justify-between ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <span className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  {facturesEnRetard.length} en retard • {formatMoney(montantEnRetard)}
                </span>
                <ChevronRight size={16} className="text-red-500" />
              </button>
            )}

            {/* Quick status badges */}
            <div className="flex gap-2 flex-wrap">
              {devisBrouillon.length > 0 && (
                <button
                  onClick={() => { setFilter('devis'); setSortBy('status'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <FileText size={14} />
                  {devisBrouillon.length} brouillon{devisBrouillon.length > 1 ? 's' : ''}
                </button>
              )}
              {devisEnvoye.length > 0 && (
                <button
                  onClick={() => { setFilter('attente'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${isDark ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                >
                  <Send size={14} />
                  {devisEnvoye.length} en attente de réponse
                </button>
              )}
            </div>

            {/* Section supprimée pour simplifier l'interface */}
          </div>
        );
      })()}
      </div>

      {/* === SECTION: LISTE DES DOCUMENTS === */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: couleur }} />
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${textMuted}`}>Tous les documents</h2>
          <span className={`text-xs ${textMuted}`}>— {filtered.length} document{filtered.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center overflow-x-auto pb-1">
        <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className={`flex-1 max-w-[180px] sm:max-w-xs px-3 sm:px-4 py-2 border rounded-xl text-sm ${inputBg}`} />
        {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['attente', 'En attente']].map(([k, v]) => <button key={k} onClick={() => setFilter(k)} className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap min-h-[36px] ${filter === k ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={filter === k ? {background: couleur} : {}}>{v}</button>)}
        <div className={`h-6 w-px mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
        {[['recent', '📅 Récent'], ['status', '📊 Statut'], ['amount', '💰 Montant']].map(([k, v]) => <button key={k} onClick={() => setSortBy(k)} className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap min-h-[36px] ${sortBy === k ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={sortBy === k ? {background: couleur} : {}}>{v}</button>)}
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
                <button onClick={() => setShowDevisWizard(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
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
              <button onClick={() => setShowDevisWizard(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Plus size={18} />
                Créer un nouveau document
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">{filtered.map(d => {
          const client = clients.find(c => c.id === d.client_id);
          const icon = { brouillon: '⚪', envoye: '', accepte: '[OK]', acompte_facture: '', facture: '', payee: '', refuse: 'âŒ' }[d.statut] || '';
          const hasAcompte = d.type === 'devis' && getAcompteFacture(d.id);
          return (
            <div key={d.id} onClick={() => { setSelected(d); setMode('preview'); }} className={`${cardBg} rounded-lg sm:rounded-xl border p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-h-[70px]`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${d.type === 'facture' ? (isDark ? 'bg-purple-900/30' : 'bg-purple-100') : (isDark ? 'bg-blue-900/30' : 'bg-blue-100')}`}>
                  {d.type === 'facture' ? <Receipt size={20} className="text-purple-600" /> : <FileText size={20} className="text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <p className={`font-semibold ${textPrimary}`}>{d.numero}</p>
                      {d.statut === 'brouillon' && <Clock size={14} className="text-slate-400 flex-shrink-0" />}
                      {d.statut === 'envoye' && <Send size={14} className="text-blue-500 flex-shrink-0" />}
                      {d.statut === 'accepte' && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
                      {d.statut === 'acompte_facture' && <CreditCard size={14} className="text-purple-500 flex-shrink-0" />}
                      {d.statut === 'facture' && <Receipt size={14} className="text-indigo-500 flex-shrink-0" />}
                      {d.statut === 'payee' && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
                      {d.statut === 'refuse' && <XCircle size={14} className="text-red-500 flex-shrink-0" />}
                    </span>
                    {hasAcompte && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>Acompte</span>}
                    {d.facture_type === 'acompte' && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Acompte</span>}
                    {d.facture_type === 'solde' && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>Solde</span>}
                    {d.facture_type === 'totale' && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>Complète</span>}
                    {d.type === 'facture' && isFacturXCompliant(d, client, entreprise) && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-700'}`}>2026 ✓</span>
                    )}
                    {needsFollowUp(d) && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium animate-pulse ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>Relancer</span>
                    )}
                  </div>
                  <p className={`text-sm ${textMuted}`}>{client?.nom} · {new Date(d.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); duplicateDocument(d); }} className={`p-2.5 rounded-xl flex-shrink-0 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Dupliquer"><Copy size={18} className={textMuted} /></button>
                <button onClick={(e) => { e.stopPropagation(); previewPDF(d); }} className={`p-2.5 rounded-xl flex-shrink-0 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Aperçu PDF"><Eye size={18} className={textMuted} /></button>
                <p className={`text-base sm:text-lg font-bold min-w-[90px] text-right flex-shrink-0 tabular-nums ${(d.total_ttc || 0) === 0 ? 'text-slate-400' : ''}`} style={(d.total_ttc || 0) > 0 ? {color: couleur} : {}}>{formatMoney(d.total_ttc)}</p>
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
                  <h2 className={`font-bold text-base sm:text-lg ${textPrimary} truncate`}>Apercu du document</h2>
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

      {/* Template Selector Modal (legacy) */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Smart Template Wizard - 2-click devis creation */}
      <SmartTemplateWizard
        isOpen={showSmartWizard}
        onClose={() => setShowSmartWizard(false)}
        onCreateDevis={handleSmartDevisCreate}
        clients={clients}
        entreprise={entreprise}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Devis Wizard - Step-by-step devis creation */}
      <DevisWizard
        isOpen={showDevisWizard}
        onClose={() => setShowDevisWizard(false)}
        onSubmit={(devisData) => {
          const numero = generateNumero(devisData.type);
          const newDevis = onSubmit({ ...devisData, numero });
          if (newDevis?.id) {
            setSelected(newDevis);
            setMode('preview');
          }
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
    </div>
  );
}
