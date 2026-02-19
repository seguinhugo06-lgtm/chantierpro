import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Plus, User, FileText, Receipt, Search, Star, Trash2, ChevronDown, ChevronUp, Sparkles, Clock, RotateCcw, AlertCircle, Mic, Zap, Edit3 } from 'lucide-react';
import FormError from './ui/FormError';
import QuickClientModal from './QuickClientModal';
import CatalogBrowser from './CatalogBrowser';
import { generateId } from '../lib/utils';
import useConfirm from '../hooks/useConfirm';

// Draft localStorage key
const DRAFT_KEY = 'chantierpro_devis_draft';

/**
 * DevisWizard - 3-step wizard for devis/facture creation
 * Step 1: Client selection
 * Step 2: Add items (visual catalog)
 * Step 3: Review & Create
 */
export default function DevisWizard({
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
  isDark = false,
  couleur = '#f97316',
  onSwitchToAI,
  onSwitchToExpress
}) {
  const isEditMode = !!initialData;
  const { confirm, ConfirmDialog } = useConfirm();
  const [step, setStep] = useState(isEditMode ? 1 : 0);
  const [form, setForm] = useState({
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: new Date().toISOString().split('T')[0],
    validite: entreprise?.validiteDevis || 30,
    tvaDefaut: entreprise?.tvaDefaut || 10,
    lignes: [],
    remise: 0,
    notes: ''
  });
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [errors, setErrors] = useState({});

  // Load draft or initialData when opening
  useEffect(() => {
    if (isOpen) {
      // Edit mode: pre-fill form from initialData
      if (initialData) {
        setForm({
          type: initialData.type || 'devis',
          clientId: initialData.client_id || '',
          chantierId: initialData.chantier_id || '',
          date: initialData.date || new Date().toISOString().split('T')[0],
          validite: initialData.validite || entreprise?.validiteDevis || 30,
          tvaDefaut: initialData.tvaRate || entreprise?.tvaDefaut || 10,
          lignes: (initialData.lignes || []).map((l, i) => ({
            id: l.id || `line-${i}`,
            description: l.description || '',
            quantite: l.quantite || 1,
            unite: l.unite || 'u',
            prixUnitaire: l.prixUnitaire || 0,
            prixAchat: l.prixAchat || 0,
            tva: l.tva !== undefined ? l.tva : (initialData.tvaRate || 10),
          })),
          remise: initialData.remise || 0,
          notes: initialData.notes || ''
        });
        setStep(2); // Start at items step in edit mode
        return;
      }
      // Create mode: restore draft
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.clientId || draft.lignes?.length > 0) {
            setForm(prev => ({
              ...prev,
              ...draft,
              date: new Date().toISOString().split('T')[0]
            }));
            setStep(draft.clientId ? 2 : 1);
            setDraftRestored(true);
            setTimeout(() => setDraftRestored(false), 5000);
          }
        }
      } catch { /* ignore */ }
    }
  }, [isOpen, initialData]);

  // Save draft to localStorage when form changes (debounced)
  useEffect(() => {
    if (!isOpen) return;
    // Only save if there's meaningful data
    if (form.clientId || form.lignes.length > 0) {
      const timeout = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        } catch { /* ignore */ }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [form, isOpen]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, []);

  // Reset form when closing (but keep draft in storage)
  useEffect(() => {
    if (!isOpen) {
      setStep(isEditMode ? 1 : 0);
      setForm({
        type: 'devis',
        clientId: '',
        chantierId: '',
        date: new Date().toISOString().split('T')[0],
        validite: entreprise?.validiteDevis || 30,
        tvaDefaut: entreprise?.tvaDefaut || 10,
        lignes: [],
        remise: 0,
        notes: ''
      });
      setDraftRestored(false);
      setErrors({});
      setClientSearch('');
    }
  }, [isOpen, entreprise?.validiteDevis, entreprise?.tvaDefaut]);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.nom?.toLowerCase().includes(q) ||
      c.prenom?.toLowerCase().includes(q) ||
      c.entreprise?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // Calculate totals and margin
  const totals = useMemo(() => {
    let totalHT = 0;
    let tvaTotal = 0;
    let totalCost = 0;

    form.lignes.forEach(l => {
      const montant = (l.quantite || 1) * (l.prixUnitaire || 0);
      const cost = (l.quantite || 1) * (l.prixAchat || 0);
      const taux = l.tva !== undefined ? l.tva : form.tvaDefaut;
      totalHT += montant;
      totalCost += cost;
      tvaTotal += montant * (taux / 100);
    });

    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    const tvaApresRemise = tvaTotal * (1 - form.remise / 100);
    const totalTTC = htApresRemise + tvaApresRemise;

    // Calculate margin (after discount)
    const costAfterRemise = totalCost * (1 - form.remise / 100);
    const marge = htApresRemise - costAfterRemise;
    const margePercent = htApresRemise > 0 ? (marge / htApresRemise) * 100 : 0;

    return { totalHT, tvaTotal, remiseAmount, htApresRemise, tvaApresRemise, totalTTC, totalCost, marge, margePercent };
  }, [form.lignes, form.tvaDefaut, form.remise]);

  // MRU (Most Recently Used) clients
  const MRU_KEY = 'chantierpro_recent_clients';
  const MAX_RECENT = 5;

  const addToRecentClients = (clientId) => {
    try {
      const recent = JSON.parse(localStorage.getItem(MRU_KEY) || '[]').filter(id => id !== clientId);
      recent.unshift(clientId);
      localStorage.setItem(MRU_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
    } catch { /* ignore */ }
  };

  const getRecentClients = () => {
    try {
      const ids = JSON.parse(localStorage.getItem(MRU_KEY) || '[]');
      return ids.map(id => clients.find(c => c.id === id)).filter(Boolean);
    } catch { return []; }
  };

  const recentClients = getRecentClients();

  // Handlers
  const selectClient = (clientId) => {
    setForm(p => ({ ...p, clientId }));
    addToRecentClients(clientId);
    setStep(2);
  };

  const handleAddClient = (clientData) => {
    const newClient = addClient?.(clientData);
    if (newClient?.id) {
      setForm(p => ({ ...p, clientId: newClient.id }));
      setStep(2);
    }
    setShowQuickClient(false);
  };

  const addLigne = (item) => {
    const newLigne = {
      id: generateId(),
      description: item.nom || '',
      quantite: 1,
      unite: item.unite || 'unite',
      prixUnitaire: item.prix || 0,
      prixAchat: item.prixAchat || 0,
      tva: form.tvaDefaut
    };
    setForm(p => ({ ...p, lignes: [...p.lignes, newLigne] }));
  };

  const updateLigne = (id, field, value) => {
    setForm(p => ({
      ...p,
      lignes: p.lignes.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        return updated;
      })
    }));
  };

  const removeLigne = async (id) => {
    if (!await confirm('Supprimer cette ligne ?')) return;
    setForm(p => ({ ...p, lignes: p.lignes.filter(l => l.id !== id) }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate
    const newErrors = {};
    if (!form.clientId) {
      newErrors.client = 'Veuillez sélectionner un client';
    }
    if (form.lignes.length === 0) {
      newErrors.lignes = 'Ajoutez au moins un article';
    } else {
      // Validate each line item — build specific error messages
      const lineErrors = [];
      form.lignes.forEach((l, i) => {
        const missing = [];
        if (!l.description?.trim()) missing.push('la description');
        if (!(parseFloat(l.quantite) > 0)) missing.push('la quantité');
        if (!(parseFloat(l.prixUnitaire) > 0)) missing.push('le prix');
        if (missing.length > 0) {
          lineErrors.push(`Ligne ${i + 1} : ${missing.join(', ')} manquant${missing.length > 1 ? 's' : ''}`);
        }
      });
      if (lineErrors.length > 0) {
        newErrors.lignes = lineErrors.join(' · ');
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Go back to the step with the error
      if (newErrors.client) setStep(1);
      else if (newErrors.lignes) setStep(2);
      return;
    }

    // Transform lignes to expected format — ensure positive values
    const lignesFormatted = form.lignes.map(l => ({
      ...l,
      quantite: Math.max(1, Math.abs(l.quantite || 1)),
      prixUnitaire: Math.abs(l.prixUnitaire || 0),
      montant: Math.abs(l.quantite || 1) * Math.abs(l.prixUnitaire || 0)
    }));

    // Round all monetary values to 2 decimals to prevent floating-point issues
    const roundEuro = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

    const devisData = {
      type: form.type,
      client_id: form.clientId,
      chantier_id: form.chantierId || undefined,
      date: form.date,
      validite: form.validite,
      // In edit mode, preserve original status; new devis starts as brouillon
      statut: isEditMode ? initialData.statut : 'brouillon',
      tvaRate: form.tvaDefaut,
      lignes: lignesFormatted,
      remise: form.remise,
      notes: form.notes,
      total_ht: roundEuro(totals.htApresRemise),
      tva: roundEuro(totals.tvaApresRemise),
      total_ttc: roundEuro(totals.totalTTC)
    };

    // Attempt save — do NOT close modal if save fails
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await onUpdate?.(initialData.id, devisData);
      } else {
        const result = await onSubmit?.(devisData);
      }
      // Only clear draft and close if save succeeded
      if (!isEditMode) clearDraft();
      onClose?.();
    } catch (error) {
      console.error(`❌ Erreur ${isEditMode ? 'modification' : 'création'} devis:`, error);
      setErrors({ submit: `Erreur de sauvegarde : ${error.message || 'Erreur inconnue'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === form.clientId);
  const canProceed = step === 1 ? !!form.clientId : step === 2 ? form.lignes.length > 0 : true;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up overflow-hidden`}>

        {/* Header with gradient and progress */}
        <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {form.type === 'facture' ? <Receipt size={20} className="text-white" /> : <FileText size={20} className="text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {step === 0 ? 'Comment creer ?' : step === 1 ? 'Choisir le client' : step === 2 ? 'Ajouter les articles' : 'Finaliser'}
                </h2>
                <p className="text-white/80 text-sm">
                  {isEditMode
                    ? `Modifier ${form.type === 'facture' ? 'la facture' : 'le devis'}`
                    : form.type === 'facture' ? 'Nouvelle facture' : 'Nouveau devis'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {(isEditMode ? [1, 2, 3] : [0, 1, 2, 3]).map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div className="mx-5 mt-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <RotateCcw size={16} />
              <span className="text-sm font-medium">Brouillon restauré</span>
            </div>
            <button
              onClick={() => {
                clearDraft();
                setForm({
                  type: 'devis',
                  clientId: '',
                  chantierId: '',
                  date: new Date().toISOString().split('T')[0],
                  validite: entreprise?.validiteDevis || 30,
                  tvaDefaut: entreprise?.tvaDefaut || 10,
                  lignes: [],
                  remise: 0,
                  notes: ''
                });
                setStep(1);
                setDraftRestored(false);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Recommencer
            </button>
          </div>
        )}

        {/* Error banner */}
        {(errors.client || errors.lignes) && (
          <div className="mx-5 mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-600 animate-shake">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{errors.client || errors.lignes}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* STEP 0: Mode Choice (creation only) */}
          {step === 0 && !isEditMode && (
            <div className="space-y-4">
              <p className={`text-sm text-center ${textMuted}`}>
                Choisissez votre methode de creation
              </p>
              <div className="grid gap-3">
                {/* Dicter IA */}
                <button
                  onClick={() => {
                    if (onSwitchToAI) {
                      onClose?.();
                      onSwitchToAI();
                    }
                  }}
                  className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${isDark ? 'border-slate-700 hover:border-purple-500 bg-slate-800/50' : 'border-slate-200 hover:border-purple-400 bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                      <Mic size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-base ${textPrimary}`}>Dicter avec l'IA</h3>
                      <p className={`text-sm mt-0.5 ${textMuted}`}>Decrivez votre devis, l'IA le cree pour vous</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">Beta</span>
                  </div>
                </button>

                {/* Template Express */}
                <button
                  onClick={() => {
                    if (onSwitchToExpress) {
                      onClose?.();
                      onSwitchToExpress();
                    }
                  }}
                  className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${isDark ? 'border-slate-700 hover:border-amber-500 bg-slate-800/50' : 'border-slate-200 hover:border-amber-400 bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0">
                      <Zap size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-base ${textPrimary}`}>Template Express</h3>
                      <p className={`text-sm mt-0.5 ${textMuted}`}>Partez d'un modele et personnalisez en 1 min</p>
                    </div>
                  </div>
                </button>

                {/* Manuel */}
                <button
                  onClick={() => setStep(1)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${isDark ? 'border-slate-700 hover:border-slate-500 bg-slate-800/50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}bb)` }}>
                      <Edit3 size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-base ${textPrimary}`}>Manuel</h3>
                      <p className={`text-sm mt-0.5 ${textMuted}`}>Creez ligne par ligne avec le catalogue</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Client Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2 mb-4">
                {[
                  { value: 'devis', label: 'Devis', icon: FileText },
                  { value: 'facture', label: 'Facture', icon: Receipt }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(p => ({ ...p, type: opt.value }))}
                    className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                      form.type === opt.value
                        ? 'border-current shadow-lg'
                        : isDark ? 'border-slate-700' : 'border-slate-200'
                    }`}
                    style={form.type === opt.value ? { borderColor: couleur, backgroundColor: `${couleur}10` } : {}}
                  >
                    <opt.icon size={18} style={form.type === opt.value ? { color: couleur } : {}} className={form.type !== opt.value ? textMuted : ''} />
                    <span className={`font-medium ${form.type === opt.value ? textPrimary : textMuted}`}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client..."
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl ${inputBg}`}
                />
              </div>

              {/* Quick add button */}
              <button
                onClick={() => setShowQuickClient(true)}
                className={`w-full p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all hover:shadow-lg ${isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'}`}
              >
                <Plus size={18} style={{ color: couleur }} />
                <span className={textSecondary}>Nouveau client</span>
              </button>

              {/* Recent clients section */}
              {!clientSearch && recentClients.length > 0 && (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${textMuted}`}>
                    <Clock size={12} />
                    <span>Récents</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recentClients.map(client => (
                      <button
                        key={`recent-${client.id}`}
                        onClick={() => selectClient(client.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                          form.clientId === client.id
                            ? 'border-current shadow-lg'
                            : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={form.clientId === client.id ? { borderColor: couleur, backgroundColor: `${couleur}10` } : { borderColor: `${couleur}30` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: couleur }}
                          >
                            {client.nom?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${textPrimary}`}>{client.nom} {client.prenom}</p>
                            {client.entreprise && <p className={`text-xs truncate ${textMuted}`}>{client.entreprise}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clients grid */}
              {(!clientSearch && recentClients.length > 0) && (
                <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${textMuted}`}>
                  <User size={12} />
                  <span>Tous les clients</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 animate-stagger">
                {filteredClients.filter(c => clientSearch || !recentClients.some(r => r.id === c.id)).map(client => (
                  <button
                    key={client.id}
                    onClick={() => selectClient(client.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                      form.clientId === client.id
                        ? 'border-current shadow-lg'
                        : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={form.clientId === client.id ? { borderColor: couleur, backgroundColor: `${couleur}10` } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: couleur }}
                      >
                        {client.nom?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${textPrimary}`}>{client.nom} {client.prenom}</p>
                        {client.entreprise && <p className={`text-xs truncate ${textMuted}`}>{client.entreprise}</p>}
                      </div>
                    </div>
                    {client.telephone && <p className={`text-xs ${textMuted}`}>{client.telephone}</p>}
                  </button>
                ))}
              </div>

              {filteredClients.length === 0 && (
                <div className={`text-center py-8 ${textMuted}`}>
                  <User size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Aucun client trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Add Items */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Selected client summary */}
              {selectedClient && (
                <div className={`p-3 rounded-xl flex items-center gap-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: couleur }}>
                    {selectedClient.nom?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${textPrimary}`}>{selectedClient.nom} {selectedClient.prenom}</p>
                    <p className={`text-xs ${textMuted}`}>{selectedClient.telephone}</p>
                  </div>
                  <button onClick={() => setStep(1)} className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                    Changer
                  </button>
                </div>
              )}

              {/* Add from catalog button */}
              <button
                onClick={() => setShowCatalog(true)}
                className="w-full p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all hover:shadow-lg group"
                style={{ borderColor: `${couleur}50` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${couleur}20` }}>
                  <Sparkles size={20} style={{ color: couleur }} />
                </div>
                <div className="text-left">
                  <p className={`font-medium ${textPrimary}`}>Ajouter depuis le catalogue</p>
                  <p className={`text-xs ${catalogue.length === 0 ? 'text-amber-500 font-medium' : textMuted}`}>
                    {catalogue.length === 0
                      ? '⚠ Ajoutez des articles dans le Catalogue d\'abord'
                      : `${catalogue.length} articles disponibles`}
                  </p>
                </div>
              </button>

              {/* Line items as cards */}
              <div className="space-y-3">
                {form.lignes.map((ligne, index) => (
                  <LigneCard
                    key={ligne.id}
                    ligne={ligne}
                    index={index}
                    onUpdate={(field, value) => updateLigne(ligne.id, field, value)}
                    onRemove={() => removeLigne(ligne.id)}
                    isDark={isDark}
                    couleur={couleur}
                    tvaDefaut={form.tvaDefaut}
                  />
                ))}
              </div>

              {/* Empty state */}
              {form.lignes.length === 0 && (
                <div className={`text-center py-8 ${textMuted}`}>
                  <FileText size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Aucun article ajouté</p>
                  <p className="text-sm">Cliquez sur le bouton ci-dessus</p>
                </div>
              )}

              {/* Running total */}
              {form.lignes.length > 0 && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className={textSecondary}>Total HT</span>
                    <span className={`text-xl font-bold ${textPrimary}`}>{totals.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</span>
                  </div>
                </div>
              )}

              {/* Manual add button */}
              <button
                onClick={() => addLigne({ nom: 'Nouvelle prestation', prix: 0, unite: 'forfait' })}
                className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Plus size={16} style={{ color: couleur }} />
                <span className={textSecondary}>Ajouter manuellement</span>
              </button>
            </div>
          )}

          {/* STEP 3: Review & Create */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Client summary */}
              {selectedClient && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <p className={`text-sm ${textMuted} mb-1`}>Client</p>
                  <p className={`font-medium ${textPrimary}`}>{selectedClient.nom} {selectedClient.prenom}</p>
                  {selectedClient.adresse && <p className={`text-sm ${textSecondary} whitespace-pre-line`}>{selectedClient.adresse}</p>}
                </div>
              )}

              {/* Items summary */}
              <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className={`text-sm ${textMuted} mb-2`}>{form.lignes.length} article(s)</p>
                <div className="space-y-2">
                  {form.lignes.slice(0, 3).map(ligne => (
                    <div key={ligne.id} className="flex justify-between">
                      <span className={`text-sm truncate ${textSecondary}`}>{ligne.description}</span>
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {((ligne.quantite || 1) * (ligne.prixUnitaire || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                      </span>
                    </div>
                  ))}
                  {form.lignes.length > 3 && (
                    <p className={`text-xs ${textMuted}`}>+ {form.lignes.length - 3} autres</p>
                  )}
                </div>
              </div>

              {/* TVA quick buttons */}
              <div>
                <p className={`text-sm ${textMuted} mb-2`}>TVA par défaut</p>
                <div className="flex gap-2">
                  {[20, 10, 5.5, 0].map(taux => (
                    <button
                      key={taux}
                      onClick={() => setForm(p => ({ ...p, tvaDefaut: taux }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.tvaDefaut === taux
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                      style={form.tvaDefaut === taux ? { backgroundColor: couleur } : {}}
                    >
                      {taux}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Remise */}
              <div>
                <p className={`text-sm ${textMuted} mb-2`}>Remise globale</p>
                <div className="flex gap-2">
                  {[0, 5, 10, 15].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setForm(p => ({ ...p, remise: pct }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.remise === pct
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                      style={form.remise === pct ? { backgroundColor: couleur } : {}}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced options toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
              >
                <span className={textSecondary}>Options avancées</span>
                {showDetails ? <ChevronUp size={18} className={textMuted} /> : <ChevronDown size={18} className={textMuted} />}
              </button>

              {showDetails && (
                <div className="space-y-3 animate-slide-up">
                  <div>
                    <label htmlFor="devis-date" className={`block text-sm mb-1 ${textMuted}`}>Date</label>
                    <input
                      id="devis-date"
                      type="date"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      aria-invalid={!!errors.date}
                      aria-describedby={errors.date ? 'devis-date-error' : undefined}
                      className={`w-full px-4 py-2 border rounded-xl ${inputBg}`}
                    />
                    <FormError id="devis-date-error" message={errors.date} />
                  </div>
                  <div>
                    <label htmlFor="devis-validite" className={`block text-sm mb-1 ${textMuted}`}>Validité (jours)</label>
                    <input
                      id="devis-validite"
                      type="number"
                      value={form.validite}
                      onChange={e => setForm(p => ({ ...p, validite: parseInt(e.target.value) || 30 }))}
                      aria-invalid={!!errors.validite}
                      aria-describedby={errors.validite ? 'devis-validite-error' : undefined}
                      className={`w-full px-4 py-2 border rounded-xl ${inputBg}`}
                    />
                    <FormError id="devis-validite-error" message={errors.validite} />
                  </div>
                  <div>
                    <label htmlFor="devis-notes" className={`block text-sm mb-1 ${textMuted}`}>Notes</label>
                    <textarea
                      id="devis-notes"
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      placeholder="Conditions particulières..."
                      aria-invalid={!!errors.notes}
                      aria-describedby={errors.notes ? 'devis-notes-error' : undefined}
                      className={`w-full px-4 py-2 border rounded-xl resize-none ${inputBg}`}
                    />
                    <FormError id="devis-notes-error" message={errors.notes} />
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={textSecondary}>Total HT</span>
                    <span className={textPrimary}>{totals.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</span>
                  </div>
                  {form.remise > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Remise {form.remise}%</span>
                      <span>-{totals.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={textSecondary}>TVA {form.tvaDefaut}%</span>
                    <span className={textPrimary}>{totals.tvaApresRemise.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-emerald-700' : 'border-emerald-200'}`}>
                    <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                    <span className="text-xl font-bold" style={{ color: couleur }}>
                      {totals.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                    </span>
                  </div>
                  {/* Margin display - only show if cost data exists */}
                  {totals.totalCost > 0 && (
                    <div className={`flex justify-between pt-2 mt-2 border-t ${isDark ? 'border-emerald-700' : 'border-emerald-200'}`}>
                      <span className={textSecondary}>Marge estimée</span>
                      <span className={`font-semibold ${
                        totals.margePercent >= 25 ? 'text-emerald-600' :
                        totals.margePercent >= 15 ? 'text-amber-600' :
                        'text-red-500'
                      }`}>
                        {totals.marge.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                        <span className="ml-1 text-sm">
                          ({totals.margePercent.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation (hidden on step 0) */}
        {step > 0 && (
          <div className={`px-5 py-4 border-t flex gap-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {((isEditMode && step > 1) || (!isEditMode && step > 1)) && (
              <button
                onClick={() => setStep(step - 1)}
                className={`px-4 py-3 rounded-xl flex items-center gap-2 min-h-[48px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
              >
                <ArrowLeft size={18} />
                Retour
              </button>
            )}

            {/* Error message */}
            {errors.submit && (
              <p className="text-red-500 text-sm flex-1">{errors.submit}</p>
            )}

            <button
              onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
              disabled={!canProceed || isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 hover:shadow-lg active:scale-[0.98] transition-all"
              style={{ backgroundColor: couleur }}
            >
              {step === 3 ? (
                <>
                  {isSubmitting ? (
                    <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <Check size={18} />
                  )}
                  {isSubmitting
                    ? (isEditMode ? 'Enregistrement...' : 'Creation...')
                    : (isEditMode ? 'Enregistrer les modifications' : `Creer le ${form.type}`)}
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={showQuickClient}
        onClose={() => setShowQuickClient(false)}
        onSubmit={handleAddClient}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Catalog Browser */}
      <CatalogBrowser
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        catalogue={catalogue}
        onSelectItem={addLigne}
        isDark={isDark}
        couleur={couleur}
      />

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>

      {/* Confirm dialog (replaces window.confirm) */}
      <ConfirmDialog />
    </div>
  );
}

// Ligne card component
function LigneCard({ ligne, index, onUpdate, onRemove, isDark, couleur, tvaDefaut }) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-slate-200';

  const montant = (ligne.quantite || 1) * (ligne.prixUnitaire || 0);

  return (
    <div className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
      {/* Description */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <label htmlFor={`devis-ligne-desc-${index}`} className="sr-only">Description ligne {index + 1}</label>
        <input
          id={`devis-ligne-desc-${index}`}
          type="text"
          value={ligne.description}
          onChange={e => onUpdate('description', e.target.value)}
          placeholder="Ex: Pose carrelage, Peinture murale..."
          className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium ${inputBg}`}
        />
        <button
          onClick={onRemove}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Qty, Price, Total */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate('quantite', Math.max(1, (ligne.quantite || 1) - 1))}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-slate-100'}`}
          >
            -
          </button>
          <label htmlFor={`devis-ligne-qty-${index}`} className="sr-only">Quantité ligne {index + 1}</label>
          <input
            id={`devis-ligne-qty-${index}`}
            type="number"
            min="1"
            step="1"
            value={ligne.quantite || 1}
            onChange={e => onUpdate('quantite', Math.max(1, parseInt(e.target.value) || 1))}
            onBlur={e => { if (parseFloat(e.target.value) < 1) onUpdate('quantite', 1); }}
            className={`w-14 px-2 py-1 border rounded-lg text-center text-sm ${inputBg}`}
          />
          <button
            onClick={() => onUpdate('quantite', (ligne.quantite || 1) + 1)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-slate-100'}`}
          >
            +
          </button>
        </div>

        <span className={`text-sm ${textMuted}`}>x</span>

        <div className="relative flex-1">
          <label htmlFor={`devis-ligne-price-${index}`} className="sr-only">Prix unitaire ligne {index + 1}</label>
          <input
            id={`devis-ligne-price-${index}`}
            type="number"
            min="0"
            step="0.01"
            value={ligne.prixUnitaire || ''}
            onChange={e => onUpdate('prixUnitaire', Math.max(0, parseFloat(e.target.value) || 0))}
            onBlur={e => { if (parseFloat(e.target.value) < 0) onUpdate('prixUnitaire', 0); }}
            placeholder="Prix HT"
            className={`w-full pl-3 pr-10 py-1 border rounded-lg text-sm text-right ${inputBg}`}
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${textMuted}`}>EUR</span>
        </div>

        <span className="text-lg font-bold min-w-[80px] text-right" style={{ color: couleur }}>
          {montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
        </span>
      </div>

      {/* TVA quick select */}
      <div className="flex gap-1 mt-2">
        {[20, 10, 5.5, 0].map(taux => (
          <button
            key={taux}
            onClick={() => onUpdate('tva', taux)}
            className={`px-2 py-1 rounded text-xs transition-all ${
              (ligne.tva !== undefined ? ligne.tva : tvaDefaut) === taux
                ? 'text-white'
                : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-500'
            }`}
            style={(ligne.tva !== undefined ? ligne.tva : tvaDefaut) === taux ? { backgroundColor: couleur } : {}}
          >
            {taux}%
          </button>
        ))}
      </div>
    </div>
  );
}
