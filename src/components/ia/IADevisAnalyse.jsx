import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Sparkles, Mic, Camera, Clock, CheckCircle, AlertCircle,
  FileText, Trash2, Euro, RotateCcw,
} from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { analyseTranscript } from '../../lib/integrations/ai-devis';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';

// Sub-components
import IAWelcomeScreen from './IAWelcomeScreen';
import IAInputStep from './IAInputStep';
import IAAnalysisStep from './IAAnalysisStep';
import IAResultsStep from './IAResultsStep';
import IAFinalizeStep from './IAFinalizeStep';
import IASuccessStep from './IASuccessStep';
import IAHistoryList from './IAHistoryList';
import IAUsageCounter from './IAUsageCounter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cp_ia_analyses';

const fmtCurrency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function loadAnalyses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAnalyses(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

/**
 * Check IA availability based on plan and usage
 * Free plan: 5 TOTAL (lifetime)
 * Pro plan: 5 per month
 */
function checkIAAvailability(analyses, planId) {
  const plan = PLANS[planId] || PLANS.gratuit;
  const limit = plan.limits.ia_analyses;
  if (limit === -1) return { allowed: true, used: 0, limit: -1, remaining: Infinity };

  let used;
  if (planId === 'gratuit') {
    // Lifetime count for free plan
    used = analyses.length;
  } else {
    // Monthly count for paid plans
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    used = analyses.filter(a => new Date(a.created_at) >= monthStart).length;
  }

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

// ---------------------------------------------------------------------------
// Detail sub-view helpers
// ---------------------------------------------------------------------------

const STATUTS = {
  en_cours: { label: 'En cours', color: 'blue', icon: Clock },
  terminee: { label: 'Terminée', color: 'green', icon: CheckCircle },
  erreur: { label: 'Erreur', color: 'red', icon: AlertCircle },
  appliquee: { label: 'Appliquée', color: 'purple', icon: FileText },
};

function StatusBadge({ statut, isDark }) {
  const cfg = STATUTS[statut] || STATUTS.en_cours;
  const colors = {
    blue: isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700',
    green: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    red: isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700',
    purple: isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-700',
  };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[cfg.color]}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IADevisAnalyse({
  catalogue = [],
  clients = [],
  chantiers = [],
  entreprise = {},
  isDark = false,
  couleur = '#f97316',
  onSubmit,
  addClient,
  generateNextNumero,
  setSelectedDevis,
  setPage,
}) {
  // ---- Subscription ----
  const planId = useSubscriptionStore((s) => s.planId);
  const isLifetime = planId === 'gratuit';

  // ---- State ----
  const [analyses, setAnalyses] = useState(() => loadAnalyses());
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('recent');

  // New analysis
  const [activeTab, setActiveTab] = useState('voice');
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [analyseResult, setAnalyseResult] = useState(null);
  const [editableLines, setEditableLines] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Voice state
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [manualText, setManualText] = useState('');

  // Photo state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoDescription, setPhotoDescription] = useState('');

  // Undo
  const [undoLine, setUndoLine] = useState(null);

  // Step 5 - Success state
  const [createdDevis, setCreatedDevis] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice input hook
  const { isListening, isSupported, error: voiceError, toggleListening, stopListening } = useVoiceInput({
    onResult: useCallback((text) => {
      setTranscript(prev => (prev ? prev + ' ' + text : text));
      setInterimText('');
    }, []),
    onInterim: useCallback((text) => setInterimText(text), []),
    lang: 'fr-FR',
    continuous: true,
  });

  // ---- Persistence ----
  useEffect(() => { saveAnalyses(analyses); }, [analyses]);

  // ---- Availability ----
  const availability = checkIAAvailability(analyses, planId);

  // ---- Theme ----
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // ---- Derived ----
  const selectedAnalyse = analyses.find(a => a.id === selectedId) || null;

  const filteredAnalyses = (() => {
    let result = [...analyses];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        (a.description || '').toLowerCase().includes(term) ||
        (a.analyse_resultat?.categorie || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter) result = result.filter(a => a.statut === statusFilter);
    if (sortOrder === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortOrder === 'montant_desc') result.sort((a, b) => (b.analyse_resultat?.totalHT || 0) - (a.analyse_resultat?.totalHT || 0));
    else if (sortOrder === 'montant_asc') result.sort((a, b) => (a.analyse_resultat?.totalHT || 0) - (b.analyse_resultat?.totalHT || 0));
    else result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return result;
  })();

  // ---- Handlers ----

  const resetNewFlow = useCallback(() => {
    setStep(1);
    setError(null);
    setIsAnalysing(false);
    setProgressLabel('');
    setAnalyseResult(null);
    setEditableLines([]);
    setTranscript('');
    setInterimText('');
    setManualText('');
    setFile(null);
    setPreview(null);
    setPhotoDescription('');
    setSelectedTemplate(null);
    setCreatedDevis(null);
    setIsSubmitting(false);
  }, []);

  const handleOpenNew = () => { resetNewFlow(); setView('new'); };

  const handleTemplateSelect = (text, templateId) => {
    setManualText(text);
    setSelectedTemplate(templateId);
    setView('new');
    setActiveTab('text');
  };

  const handleBackToList = () => {
    // Step 5 (success) — no confirmation needed
    if (step === 5) {
      resetNewFlow();
      setView('list');
      setSelectedId(null);
      return;
    }
    const hasWork = (manualText || transcript || '').trim().length > 0 || analyseResult || editableLines.length > 0;
    if (hasWork && !window.confirm('Quitter sans sauvegarder ? Les données seront perdues.')) return;
    if (isListening) stopListening();
    resetNewFlow();
    setView('list');
    setSelectedId(null);
  };

  const handleSelectAnalyse = (id) => { setSelectedId(id); setView('detail'); };

  const handleDeleteAnalyse = (id) => {
    setAnalyses(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) { setSelectedId(null); setView('list'); }
  };

  // ---- Analysis ----

  const handleStartAnalysis = async () => {
    const text = activeTab === 'voice'
      ? (transcript.trim() || manualText.trim())
      : activeTab === 'text'
        ? manualText.trim()
        : photoDescription.trim();

    if (!text || text.length < 10) {
      setError('Décrivez les travaux en au moins 10 caractères.');
      return;
    }

    if (isListening) stopListening();
    setStep(2);
    setIsAnalysing(true);
    setError(null);

    // Progressive labels
    const labels = ['Envoi au serveur...', 'Analyse IA en cours...', 'Génération du devis...', 'Finalisation...'];
    let labelIdx = 0;
    setProgressLabel(labels[0]);
    const labelTimer = setInterval(() => {
      labelIdx = Math.min(labelIdx + 1, labels.length - 1);
      setProgressLabel(labels[labelIdx]);
    }, 1500);

    try {
      const result = await analyseTranscript(text, catalogue);
      clearInterval(labelTimer);

      const lignes = result.lignes || result.travaux || [];
      setAnalyseResult(result);
      setEditableLines(lignes.map((l, i) => ({
        id: l.id || `ia_${i}_${Date.now()}`,
        designation: l.designation || '',
        quantite: l.quantite || 1,
        unite: l.unite || 'u',
        prixUnitaire: l.prixUnitaire || 0,
        totalHT: Math.round((l.quantite || 1) * (l.prixUnitaire || 0) * 100) / 100,
      })));

      // Save to history
      const entry = {
        id: crypto.randomUUID(),
        description: result.description || text.substring(0, 100),
        source: activeTab,
        statut: 'terminee',
        confiance: result.confiance || 75,
        analyse_resultat: { ...result, lignes },
        created_at: new Date().toISOString(),
      };
      setAnalyses(prev => [entry, ...prev]);
      setSelectedId(entry.id);
      setStep(3);
    } catch (err) {
      clearInterval(labelTimer);
      setError(err.message || 'Erreur lors de l\'analyse. Réessayez.');
      setStep(1);
    } finally {
      setIsAnalysing(false);
    }
  };

  // Editable lines management
  const updateLine = (idx, field, value) => {
    setEditableLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      updated.totalHT = Math.round((updated.quantite || 0) * (updated.prixUnitaire || 0) * 100) / 100;
      return updated;
    }));
  };

  const addLine = () => {
    setEditableLines(prev => [...prev, {
      id: `new_${Date.now()}`,
      designation: '',
      quantite: 1,
      unite: 'u',
      prixUnitaire: 0,
      totalHT: 0,
    }]);
  };

  const removeLine = (idx) => {
    const removed = editableLines[idx];
    setEditableLines(prev => prev.filter((_, i) => i !== idx));
    if (undoLine?.timer) clearTimeout(undoLine.timer);
    const timer = setTimeout(() => setUndoLine(null), 5000);
    setUndoLine({ line: removed, idx, timer });
  };

  const handleUndo = () => {
    if (!undoLine) return;
    clearTimeout(undoLine.timer);
    setEditableLines(prev => {
      const copy = [...prev];
      copy.splice(undoLine.idx, 0, undoLine.line);
      return copy;
    });
    setUndoLine(null);
  };

  // Step 3 → Step 4 transition
  const handleContinueToFinalize = () => {
    if (!editableLines.length) return;
    setStep(4);
  };

  // Create devis from history (goes straight to step 4)
  const handleCreateFromHistory = (analyse) => {
    if (!analyse?.analyse_resultat) return;
    const lignes = analyse.analyse_resultat.lignes || analyse.analyse_resultat.travaux || [];
    setEditableLines(lignes.map((l, i) => ({
      id: l.id || `ia_${i}_${Date.now()}`,
      designation: l.designation || '',
      quantite: l.quantite || 1,
      unite: l.unite || 'u',
      prixUnitaire: l.prixUnitaire || 0,
      totalHT: Math.round((l.quantite || 1) * (l.prixUnitaire || 0) * 100) / 100,
    })));
    setAnalyseResult(analyse.analyse_resultat);
    setSelectedId(analyse.id);
    setView('new');
    setStep(4);
  };

  // Step 4 → Create devis directly (no DevisPage)
  const handleFinalCreate = async (formData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const client = clients.find(c => c.id === formData.clientId);
      let numero = '';
      try {
        numero = await generateNextNumero?.('devis') || `DEV-${Date.now()}`;
      } catch {
        numero = `DEV-${Date.now()}`;
      }

      // Build sections with lines
      const sections = [{
        id: '1',
        titre: analyseResult?.description || 'Travaux',
        lignes: editableLines.map((l, i) => ({
          id: `ia_${i}_${Date.now()}`,
          description: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          prixUnitaire: l.prixUnitaire,
          montant: Math.round(l.quantite * l.prixUnitaire * 100) / 100,
          tva: formData.tvaDefaut,
        }))
      }];

      const totals = formData.totals;

      const newDevis = await onSubmit({
        numero,
        type: 'devis',
        client_id: formData.clientId,
        client_nom: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
        chantier_id: formData.chantierId || undefined,
        date: formData.date,
        validite: formData.validite,
        statut: 'brouillon',
        sections,
        lignes: sections.flatMap(s => s.lignes),
        tvaParTaux: totals.tvaParTaux,
        tvaDetails: totals.tvaParTaux,
        tvaRate: formData.tvaDefaut,
        remise: formData.remise || 0,
        total_ht: totals.htApresRemise,
        tva: totals.totalTVA,
        total_ttc: totals.ttc,
        retenueGarantie: formData.retenueGarantie,
        retenue_montant: totals.retenueGarantie,
        ttc_net: totals.ttcNet,
        notes: formData.notes || analyseResult?.notes || '',
        conditionsPaiement: formData.conditionsPaiement || undefined,
        source: 'ia_analyse',
        ia_analyseId: selectedId,
      });

      // Mark analysis as applied
      if (selectedId) {
        setAnalyses(prev => prev.map(a => a.id === selectedId ? { ...a, statut: 'appliquee' } : a));
      }

      // Move to success step
      setCreatedDevis({
        ...newDevis,
        numero,
        clientName: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
        lineCount: editableLines.length,
        totalTTC: formData.retenueGarantie ? totals.ttcNet : totals.ttc,
      });
      setStep(5);
    } catch (err) {
      console.error('Error creating devis:', err);
      setError('Erreur lors de la création du devis. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5 → View devis
  const handleViewDevis = () => {
    if (createdDevis) {
      // Pass the full devis object — DevisPage expects an object, not just an ID
      setSelectedDevis?.(createdDevis);
    }
    setPage?.('devis');
  };

  // Step 5 → New analysis
  const handleNewAnalysis = () => {
    resetNewFlow();
    setView('new');
  };

  const handleRefresh = () => {
    if (!window.confirm('Refaire l\'analyse ? Les modifications actuelles seront perdues.')) return;
    setStep(1);
    setAnalyseResult(null);
    setEditableLines([]);
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // ---- DETAIL VIEW ----

  // Editable lines state for detail view
  const [detailEditableLines, setDetailEditableLines] = useState([]);
  const [detailEditing, setDetailEditing] = useState(false);

  const initDetailEditing = (lignes) => {
    setDetailEditableLines(lignes.map((l, i) => ({
      id: l.id || `detail_${i}_${Date.now()}`,
      designation: l.designation || '',
      quantite: l.quantite || 1,
      unite: l.unite || 'u',
      prixUnitaire: l.prixUnitaire || 0,
    })));
    setDetailEditing(true);
  };

  const updateDetailLine = (idx, field, value) => {
    setDetailEditableLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      return { ...l, [field]: value };
    }));
  };

  const saveDetailEdits = () => {
    if (!selectedAnalyse) return;
    const updatedLignes = detailEditableLines.map(l => ({
      ...l,
      totalHT: Math.round((l.quantite || 0) * (l.prixUnitaire || 0) * 100) / 100,
    }));
    const totalHT = updatedLignes.reduce((s, l) => s + l.totalHT, 0);
    setAnalyses(prev => prev.map(a => {
      if (a.id !== selectedAnalyse.id) return a;
      return {
        ...a,
        analyse_resultat: {
          ...a.analyse_resultat,
          lignes: updatedLignes,
          totalHT,
        },
      };
    }));
    setDetailEditing(false);
  };

  const handleRefaireAnalyse = (analyse) => {
    const sourceText = analyse.analyse_resultat?.sourceText || analyse.description || '';
    resetNewFlow();
    setManualText(sourceText);
    setActiveTab('text');
    setView('new');
  };

  const renderDetailView = () => {
    if (!selectedAnalyse) return null;
    const res = selectedAnalyse.analyse_resultat;
    const lignes = res?.lignes || res?.travaux || [];
    const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBackToList} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronLeft size={20} className={textPrimary} />
          </button>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${textPrimary}`}>Détail analyse</h2>
            <p className={`text-xs ${textMuted}`}>{fmtDate(selectedAnalyse.created_at)}</p>
          </div>
          <StatusBadge statut={selectedAnalyse.statut} isDark={isDark} />
        </div>

        {/* Confidence badge */}
        {selectedAnalyse.confiance && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
            selectedAnalyse.confiance >= 80 ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
            : selectedAnalyse.confiance >= 50 ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700')
            : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-700')
          }`}>
            Confiance : {selectedAnalyse.confiance}%
          </div>
        )}

        <div className={`rounded-xl border p-4 mb-4 ${cardBg}`}>
          <p className={`text-sm mb-2 ${textPrimary}`}>{selectedAnalyse.description}</p>
          <div className="flex items-center gap-3 text-xs">
            {selectedAnalyse.source === 'voice' ? <Mic size={14} className={textMuted} /> : <Camera size={14} className={textMuted} />}
            <span className={textMuted}>{selectedAnalyse.source === 'voice' ? 'Vocal' : selectedAnalyse.source === 'photo' ? 'Photo' : 'Texte'}</span>
            <span className={textMuted}>•</span>
            <span className={textMuted}>{lignes.length} postes</span>
            <span className={textMuted}>•</span>
            <span className="font-medium" style={{ color: couleur }}>{fmtCurrency.format(res?.totalHT || 0)}</span>
          </div>
        </div>

        {/* Lines table with PU HT column and inline editing */}
        {lignes.length > 0 && (
          <div className={`rounded-xl border overflow-hidden mb-4 ${cardBg}`}>
            {!detailEditing && (
              <div className="flex justify-end px-3 pt-2">
                <button
                  onClick={() => initDetailEditing(lignes)}
                  className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Modifier
                </button>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className={`text-left px-3 py-2 text-xs ${textMuted}`}>Désignation</th>
                  <th className={`text-right px-2 py-2 text-xs ${textMuted}`}>Qté</th>
                  <th className={`text-center px-2 py-2 text-xs ${textMuted}`}>Unité</th>
                  <th className={`text-right px-2 py-2 text-xs ${textMuted}`}>PU HT</th>
                  <th className={`text-right px-3 py-2 text-xs ${textMuted}`}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {detailEditing ? (
                  detailEditableLines.map((l, i) => (
                    <tr key={l.id || i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={l.designation}
                          onChange={e => updateDetailLine(i, 'designation', e.target.value)}
                          className={`w-full px-2 py-1 rounded-lg border text-sm ${inputBg}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={l.quantite}
                          onChange={e => updateDetailLine(i, 'quantite', parseFloat(e.target.value) || 0)}
                          className={`w-16 px-2 py-1 rounded-lg border text-sm text-right ${inputBg}`}
                          min="0"
                          step="0.1"
                        />
                      </td>
                      <td className={`px-2 py-1.5 text-center ${textMuted}`}>{l.unite}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={l.prixUnitaire}
                          onChange={e => updateDetailLine(i, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-2 py-1 rounded-lg border text-sm text-right ${inputBg}`}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className={`px-3 py-1.5 text-right font-medium ${textPrimary}`}>
                        {fmtCurrency.format((l.quantite || 0) * (l.prixUnitaire || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  lignes.map((l, i) => (
                    <tr key={l.id || i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <td className={`px-3 py-2 ${textPrimary}`}>{l.designation}</td>
                      <td className={`px-2 py-2 text-right ${textMuted}`}>{l.quantite}</td>
                      <td className={`px-2 py-2 text-center ${textMuted}`}>{l.unite}</td>
                      <td className={`px-2 py-2 text-right ${textMuted}`}>
                        {l.prixUnitaire?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${textPrimary}`}>{fmtCurrency.format(l.quantite * l.prixUnitaire)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {detailEditing && (
              <div className="flex justify-end gap-2 px-3 py-2">
                <button
                  onClick={() => setDetailEditing(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={saveDetailEdits}
                  className="px-3 py-1.5 rounded-lg text-xs text-white font-medium"
                  style={{ backgroundColor: couleur }}
                >
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleDeleteAnalyse(selectedAnalyse.id)}
            className={`px-4 py-2.5 rounded-xl text-sm text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
          >
            <Trash2 size={14} className="inline mr-1" />
            Supprimer
          </button>
          <button
            onClick={() => handleRefaireAnalyse(selectedAnalyse)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
          >
            <RotateCcw size={14} /> Refaire l'analyse
          </button>
          {selectedAnalyse.statut !== 'appliquee' && (
            <button
              onClick={() => handleCreateFromHistory(selectedAnalyse)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
              style={{ backgroundColor: couleur }}
            >
              <FileText size={18} />
              Créer le devis
            </button>
          )}
        </div>
      </div>
    );
  };

  // ---- Step label for header ----
  const getStepLabel = () => {
    switch (step) {
      case 1: return 'Décrivez les travaux';
      case 2: return 'Analyse en cours...';
      case 3: return 'Résultats';
      case 4: return 'Finalisation';
      case 5: return 'Devis créé';
      default: return '';
    }
  };

  // ---- Stepper steps ----
  const STEPS = [
    { n: 1, label: activeTab === 'voice' ? 'Dictée' : activeTab === 'text' ? 'Texte' : 'Photo' },
    { n: 2, label: 'Analyse' },
    { n: 3, label: 'Résultats' },
    { n: 4, label: 'Finalisation' },
    { n: 5, label: 'Terminé' },
  ];

  // ---- NEW VIEW ----
  const renderNewView = () => (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {step < 5 && (
          <button onClick={handleBackToList} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronLeft size={20} className={textPrimary} />
          </button>
        )}
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${textPrimary}`}>
            {step === 5 ? '' : 'Nouveau devis IA'}
          </h2>
          {step < 5 && (
            <p className={`text-xs ${textMuted}`}>{getStepLabel()}</p>
          )}
        </div>
        {step < 5 && (
          <IAUsageCounter
            used={availability.used}
            limit={availability.limit}
            isLifetime={isLifetime}
            isDark={isDark}
            couleur={couleur}
          />
        )}
      </div>

      {/* Step indicator — always show all 5 steps with labels */}
      {step < 5 && (
        <div className="flex items-center gap-0 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && (
                <div
                  className={`flex-1 h-0.5 transition-all duration-300 ${step >= s.n ? '' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                  style={step >= s.n ? { backgroundColor: couleur } : {}}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => { if (s.n < step && step !== 2 && step !== 5) setStep(s.n); }}
                  disabled={s.n >= step || step === 2 || step === 5}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold transition-all ${
                    step >= s.n ? 'text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                  } ${s.n < step && step !== 2 && step !== 5 ? 'cursor-pointer hover:scale-110' : ''}`}
                  style={step >= s.n ? { backgroundColor: couleur } : {}}
                  title={s.label}
                >
                  {step > s.n ? '✓' : s.n}
                </button>
                <span className={`text-[8px] sm:text-[9px] font-medium whitespace-nowrap ${
                  step >= s.n ? '' : isDark ? 'text-slate-500' : 'text-slate-400'
                }`} style={step >= s.n ? { color: couleur } : {}}>
                  {s.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Steps */}
      {step === 1 && (
        <IAInputStep
          transcript={transcript}
          setTranscript={setTranscript}
          interimText={interimText}
          setInterimText={setInterimText}
          isListening={isListening}
          isSupported={isSupported}
          voiceError={voiceError}
          toggleListening={toggleListening}
          manualText={manualText}
          setManualText={setManualText}
          file={file}
          setFile={setFile}
          preview={preview}
          setPreview={setPreview}
          photoDescription={photoDescription}
          setPhotoDescription={setPhotoDescription}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedTemplate={selectedTemplate}
          onTemplateSelect={(text, id) => {
            setManualText(text);
            setSelectedTemplate(id);
          }}
          onAnalyse={handleStartAnalysis}
          onBack={handleBackToList}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {step === 2 && (
        <IAAnalysisStep
          progressLabel={progressLabel}
          onCancel={() => { setIsAnalysing(false); setStep(1); setError('Analyse annulée.'); }}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {step === 3 && analyseResult && (
        <IAResultsStep
          analyseResult={analyseResult}
          editableLines={editableLines}
          updateLine={updateLine}
          addLine={addLine}
          removeLine={removeLine}
          undoLine={undoLine}
          onUndo={handleUndo}
          onRefresh={handleRefresh}
          onContinue={handleContinueToFinalize}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {step === 4 && (
        <IAFinalizeStep
          editableLines={editableLines}
          analyseDescription={analyseResult?.description || ''}
          confidence={analyseResult?.confiance || 75}
          clients={clients}
          chantiers={chantiers}
          entreprise={entreprise}
          onBack={() => setStep(3)}
          onCreateDevis={handleFinalCreate}
          onAddClient={addClient}
          isSubmitting={isSubmitting}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {step === 5 && createdDevis && (
        <IASuccessStep
          devisNumero={createdDevis.numero || ''}
          clientName={createdDevis.clientName || ''}
          lineCount={createdDevis.lineCount || 0}
          totalTTC={createdDevis.totalTTC || 0}
          onViewDevis={handleViewDevis}
          onNewAnalysis={handleNewAnalysis}
          isDark={isDark}
          couleur={couleur}
        />
      )}
    </div>
  );

  return (
    <div className={`min-h-screen pb-24 ${pageBg}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* LIST VIEW */}
        {view === 'list' && (
          analyses.length === 0 ? (
            <IAWelcomeScreen
              onNewAnalysis={handleOpenNew}
              onTemplateSelect={handleTemplateSelect}
              availability={availability}
              isLifetime={isLifetime}
              isDark={isDark}
              couleur={couleur}
            />
          ) : (
            <IAHistoryList
              analyses={analyses}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              filteredAnalyses={filteredAnalyses}
              onSelectAnalyse={handleSelectAnalyse}
              onNewAnalysis={handleOpenNew}
              availability={availability}
              isLifetime={isLifetime}
              isDark={isDark}
              couleur={couleur}
            />
          )
        )}

        {/* NEW VIEW */}
        {view === 'new' && renderNewView()}

        {/* DETAIL VIEW */}
        {view === 'detail' && renderDetailView()}
      </div>
    </div>
  );
}
